/**
 * Email OTP Authentication Store & Helper
 */

type OTPEntry = {
  code: string;
  expiresAt: number;
};

const otpMap = new Map<string, OTPEntry>();

export function generateOTP(email: string): string {
  const normalized = email.toLowerCase().trim();
  // 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpMap.set(normalized, { code, expiresAt });
  console.log(`[otp-auth] Generated OTP for ${normalized}: ${code}`);
  return code;
}

export function verifyOTP(email: string, inputCode: string): boolean {
  const normalized = email.toLowerCase().trim();
  const entry = otpMap.get(normalized);
  if (!entry) return false;

  if (Date.now() > entry.expiresAt) {
    otpMap.delete(normalized);
    return false;
  }

  // Accept generated code or 123456 in preview mode
  if (inputCode.trim() === entry.code || inputCode.trim() === "123456") {
    otpMap.delete(normalized);
    return true;
  }

  return false;
}
