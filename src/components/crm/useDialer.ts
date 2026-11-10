"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Call, Device } from "@twilio/voice-sdk";

import type { Lead } from "@/lib/crm/constants";
import { crmFetch } from "./api";

type TokenResponse =
  | { configured: true; token: string }
  | { configured: false; missing: string[] };

export type DialerState = {
  // "incoming" = a lead is calling the Twilio number back and this tab rings.
  phase: "idle" | "connecting" | "ringing" | "in-call" | "incoming";
  lead: Lead | null;
  // Who's on the line, for the call bar (also set before the lead loads).
  party: { name: string; phone: string } | null;
  inbound: boolean;
  muted: boolean;
  startedAt: number | null;
  error: string | null;
};

const IDLE: DialerState = {
  phase: "idle",
  lead: null,
  party: null,
  inbound: false,
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
// call so the UI can ask how it went. The tab also registers for incoming
// calls (leads calling the number back); `onAnswered` fires with the lead
// once one is picked up, so the UI can open it.
export function useDialer(onCallEnded: (lead: Lead) => void, onAnswered?: (lead: Lead) => void) {
  const [state, setState] = useState<DialerState>(IDLE);
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  // An incoming call that's ringing here and not answered yet.
  const ringingRef = useRef<Call | null>(null);
  const onCallEndedRef = useRef(onCallEnded);
  const onAnsweredRef = useRef(onAnswered);

  useEffect(() => {
    onCallEndedRef.current = onCallEnded;
    onAnsweredRef.current = onAnswered;
  }, [onCallEnded, onAnswered]);

  useEffect(() => {
    return () => {
      callRef.current?.disconnect();
      ringingRef.current?.ignore();
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
    device.on("incoming", (incoming: Call) => {
      // Busy on another call, or something already ringing: let it ring
      // for the others instead.
      if (callRef.current || ringingRef.current) {
        incoming.ignore();
        return;
      }
      const p = incoming.customParameters;
      ringingRef.current = incoming;
      setState({
        ...IDLE,
        phase: "incoming",
        inbound: true,
        party: {
          name: p.get("leadName") || "Unknown caller",
          phone: p.get("phone") || incoming.parameters.From || "",
        },
      });
      const stop = () => {
        if (ringingRef.current !== incoming) return;
        ringingRef.current = null;
        setState((s) => (s.phase === "incoming" ? IDLE : s));
      };
      // The caller hung up, or a teammate answered first.
      incoming.on("cancel", stop);
      incoming.on("reject", stop);
      incoming.on("disconnect", stop);
    });
    deviceRef.current = device;
    return device;
  }, [fail]);

  // Register this tab for incoming calls as soon as the CRM opens. Quietly
  // does nothing until calling is set up.
  useEffect(() => {
    let stopped = false;
    getDevice()
      .then((device) => {
        if (!stopped && device.state !== "registered" && device.state !== "registering") {
          return device.register();
        }
      })
      .catch(() => {
        // Not set up, or no network: outgoing calls still show the reason.
      });
    return () => {
      stopped = true;
    };
  }, [getDevice]);

  const answer = useCallback(async () => {
    const incoming = ringingRef.current;
    if (!incoming) return;
    ringingRef.current = null;
    callRef.current = incoming;
    const leadId = incoming.customParameters.get("leadId") || "";
    const inboundSid = incoming.customParameters.get("inboundSid") || "";
    let lead: Lead | null = null;

    const finish = () => {
      if (callRef.current !== incoming) return;
      callRef.current = null;
      setState(IDLE);
      if (lead) onCallEndedRef.current(lead);
    };
    incoming.on("disconnect", finish);
    incoming.on("cancel", finish);
    incoming.on("error", (error: unknown) => {
      if (callRef.current !== incoming) return;
      fail(describeError(error, "The call failed."));
    });

    incoming.accept();
    setState((s) => ({ ...s, phase: "in-call", startedAt: Date.now() }));
    if (!leadId) return;
    try {
      const data = await crmFetch<{ lead: Lead }>("/api/crm/twilio/answered", {
        method: "POST",
        body: { leadId, inboundSid },
      });
      lead = data.lead;
      setState((s) => (callRef.current === incoming ? { ...s, lead } : s));
      onAnsweredRef.current?.(data.lead);
    } catch {
      // The call still works; it just isn't logged on the lead.
    }
  }, [fail]);

  // Stop ringing in this tab only; it keeps ringing for teammates and then
  // goes to voicemail.
  const decline = useCallback(() => {
    const incoming = ringingRef.current;
    ringingRef.current = null;
    incoming?.ignore();
    setState((s) => (s.phase === "incoming" ? IDLE : s));
  }, []);

  const call = useCallback(
    async (lead: Lead) => {
      if (callRef.current) return;
      if (lead.status === "do_not_call") {
        return fail("This lead is marked do not call.");
      }
      if (!lead.phoneE164) {
        return fail("This lead doesn't have a phone number that can be dialed.");
      }

      setState({ ...IDLE, phase: "connecting", lead, party: { name: lead.name || "No name", phone: lead.phone } });
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

  return { state, call, answer, decline, hangUp, toggleMute, clearError };
}
