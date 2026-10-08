"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Call, Device } from "@twilio/voice-sdk";

import type { Lead } from "@/lib/crm/constants";
import { crmFetch } from "./api";

type TokenResponse =
  | { configured: true; token: string }
  | { configured: false; missing: string[] };

export type DialerState = {
  phase: "idle" | "connecting" | "ringing" | "in-call";
  lead: Lead | null;
  muted: boolean;
  startedAt: number | null;
  error: string | null;
};

const IDLE: DialerState = {
  phase: "idle",
  lead: null,
  muted: false,
  startedAt: null,
  error: null,
};

// Twilio's SDK errors carry a numeric code; turn the ones a setup mistake
// causes into something the person at the keyboard can act on.
function describeError(error: unknown, fallback: string) {
  const { code, message } = (error ?? {}) as { code?: number; message?: string };
  if (code === 20101 || code === 20103 || code === 20104) {
    return "Twilio rejected the CRM's credentials. Check TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET.";
  }
  if (code === 31401 || code === 31402) {
    return "The browser couldn't use your microphone. Allow microphone access for this site and try again.";
  }
  return message || fallback;
}

// Browser dialer backed by Twilio's Voice SDK. `onCallEnded` fires once per
// call so the UI can ask how it went.
export function useDialer(onCallEnded: (lead: Lead) => void) {
  const [state, setState] = useState<DialerState>(IDLE);
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const onCallEndedRef = useRef(onCallEnded);

  useEffect(() => {
    onCallEndedRef.current = onCallEnded;
  }, [onCallEnded]);

  useEffect(() => {
    return () => {
      callRef.current?.disconnect();
      deviceRef.current?.destroy();
    };
  }, []);

  const fail = useCallback((message: string) => {
    callRef.current = null;
    // One failure can surface twice (device error, then the rejected
    // connect); keep the first, more specific message.
    setState((s) =>
      s.phase === "idle" && s.error ? s : { ...IDLE, error: message }
    );
  }, []);

  const getDevice = useCallback(async () => {
    const response = await crmFetch<TokenResponse>("/api/crm/twilio/token", {
      method: "POST",
    });
    if (!response.configured) {
      throw new Error(
        `Calling isn't set up yet. Missing: ${response.missing.join(", ")}`
      );
    }
    if (deviceRef.current) {
      deviceRef.current.updateToken(response.token);
      return deviceRef.current;
    }

    const { Device } = await import("@twilio/voice-sdk");
    const device = new Device(response.token, { closeProtection: true });
    device.on("error", (error: unknown) => {
      // Start from a clean device next time (e.g. after fixing credentials).
      if (deviceRef.current === device) deviceRef.current = null;
      device.destroy();
      fail(describeError(error, "The dialer hit an error."));
    });
    device.on("tokenWillExpire", async () => {
      try {
        const fresh = await crmFetch<TokenResponse>("/api/crm/twilio/token", {
          method: "POST",
        });
        if (fresh.configured) device.updateToken(fresh.token);
      } catch {
        // The next call attempt fetches a new token anyway.
      }
    });
    deviceRef.current = device;
    return device;
  }, [fail]);

  const call = useCallback(
    async (lead: Lead) => {
      if (callRef.current) return;
      if (lead.status === "do_not_call") {
        return fail("This lead is marked do not call.");
      }
      if (!lead.phoneE164) {
        return fail("This lead doesn't have a phone number that can be dialed.");
      }

      setState({ ...IDLE, phase: "connecting", lead });
      try {
        const device = await getDevice();
        const active = await device.connect({ params: { LeadId: lead.id } });
        callRef.current = active;

        const finish = () => {
          if (callRef.current !== active) return;
          callRef.current = null;
          setState(IDLE);
          onCallEndedRef.current(lead);
        };

        active.on("ringing", () =>
          setState((s) => (s.phase === "connecting" ? { ...s, phase: "ringing" } : s))
        );
        active.on("accept", () =>
          setState((s) => ({ ...s, phase: "in-call", startedAt: Date.now() }))
        );
        active.on("disconnect", finish);
        active.on("cancel", finish);
        active.on("reject", finish);
        active.on("error", (error: unknown) => {
          if (callRef.current !== active) return;
          fail(describeError(error, "The call failed."));
        });
      } catch (error) {
        fail(describeError(error, "Could not start the call."));
      }
    },
    [fail, getDevice]
  );

  const hangUp = useCallback(() => {
    callRef.current?.disconnect();
  }, []);

  const toggleMute = useCallback(() => {
    const active = callRef.current;
    if (!active) return;
    const muted = !active.isMuted();
    active.mute(muted);
    setState((s) => ({ ...s, muted }));
  }, []);

  const clearError = useCallback(
    () => setState((s) => ({ ...s, error: null })),
    []
  );

  return { state, call, hangUp, toggleMute, clearError };
}
