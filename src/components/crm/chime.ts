// The new-lead notification sound: a short two-note chime made with the Web
// Audio API, so there's no sound file to host.
//
// Browsers only allow audio after the person has clicked or typed on the
// page, so `armChime` is called from the first interaction to unlock it.

let context: AudioContext | null = null;

export function armChime() {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
  } catch {
    // No audio support; the on-screen notice still shows.
  }
}

export function playChime() {
  if (!context || context.state !== "running") return;
  const start = context.currentTime;
  for (const [index, frequency] of [880, 1318.5].entries()) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const at = start + index * 0.16;
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.55);
  }
}

// The Sound on/off choice, remembered on this computer. Shaped for React's
// useSyncExternalStore so the header button and the poller agree.
const SOUND_KEY = "crm-sound";
const listeners = new Set<() => void>();

export const soundSetting = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  isOn: () => window.localStorage.getItem(SOUND_KEY) !== "off",
  isOnServer: () => true,
  set(on: boolean) {
    window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
    listeners.forEach((listener) => listener());
  },
};
