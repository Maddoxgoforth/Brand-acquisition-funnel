// The number the CRM dials leads from (Twilio caller ID). Shown on the
// confirmation page and in the "save to contacts" card so leads recognise it.
export function callerNumber(): { display: string; tel: string } | null {
  const raw = process.env.TWILIO_PHONE_NUMBER?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  const us = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits.length === 10 ? digits : null;
  return {
    display: us ? `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}` : raw,
    tel: raw.startsWith("+") ? raw : `+${digits}`,
  };
}
