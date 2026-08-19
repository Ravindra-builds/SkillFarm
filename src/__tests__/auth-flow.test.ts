import {
  hashPassword,
  verifyPassword,
  saveUserCredential,
  getUserCredential,
  createPasswordResetToken,
  consumePasswordResetToken,
  updateUserPassword,
} from "@/lib/password-auth";
import { AUTH_MESSAGES, getSafeAuthErrorMessage } from "@/lib/auth-errors";

describe("SkillFarm Authentication & Security Engine", () => {
  const testEmail = "test.engineer@skillfarm.in";
  const testPassword = "SuperSecretPassword123!";

  test("1. Password hashing generates a salt:hash string and verifies correctly", async () => {
    const hash = await hashPassword(testPassword);
    expect(hash).toContain(":");
    expect(hash.split(":")[0].length).toBe(32); // 16 bytes in hex

    const isValid = await verifyPassword(testPassword, hash);
    expect(isValid).toBe(true);

    const isWrong = await verifyPassword("WrongPassword!", hash);
    expect(isWrong).toBe(false);
  });

  test("2. User credentials persist and can be verified", async () => {
    const hash = await hashPassword(testPassword);
    await saveUserCredential(testEmail, "Alex Engineer", hash);

    const cred = await getUserCredential(testEmail);
    expect(cred).not.toBeNull();
    expect(cred?.email).toBe(testEmail);
    expect(cred?.name).toBe("Alex Engineer");

    const valid = await verifyPassword(testPassword, cred!.passwordHash);
    expect(valid).toBe(true);
  });

  test("3. Password reset token is single-use and auto-invalidates", async () => {
    const token = await createPasswordResetToken(testEmail);
    expect(typeof token).toBe("string");
    expect(token.length).toBe(64); // 32 bytes in hex

    // First consumption should succeed
    const consumedEmail = await consumePasswordResetToken(token);
    expect(consumedEmail).toBe(testEmail);

    // Second consumption must fail (single-use protection)
    const secondTry = await consumePasswordResetToken(token);
    expect(secondTry).toBeNull();
  });

  test("4. Updating user password updates credential store", async () => {
    const newPassword = "NewStrongPassword456!";
    await updateUserPassword(testEmail, newPassword);

    const cred = await getUserCredential(testEmail);
    expect(cred).not.toBeNull();

    const oldValid = await verifyPassword(testPassword, cred!.passwordHash);
    expect(oldValid).toBe(false);

    const newValid = await verifyPassword(newPassword, cred!.passwordHash);
    expect(newValid).toBe(true);
  });

  test("5. Error mapper returns safe anti-enumeration messages", () => {
    expect(getSafeAuthErrorMessage(new Error("user not found"))).toBe(
      AUTH_MESSAGES.INVALID_CREDENTIALS
    );
    expect(getSafeAuthErrorMessage(new Error("invalid password"))).toBe(
      AUTH_MESSAGES.INVALID_CREDENTIALS
    );
    expect(getSafeAuthErrorMessage(new Error("fetch failed"))).toBe(
      AUTH_MESSAGES.NETWORK_ERROR
    );
    expect(getSafeAuthErrorMessage(new Error("rate limit exceeded"))).toBe(
      AUTH_MESSAGES.RATE_LIMITED
    );
    expect(getSafeAuthErrorMessage(new Error("token expired"))).toBe(
      AUTH_MESSAGES.RESET_LINK_INVALID
    );
    expect(getSafeAuthErrorMessage(new Error("internal postgres db connection error"))).toBe(
      AUTH_MESSAGES.GENERIC_ERROR
    );
  });

  test("6. Email verification token generation, consumption, and status marking", async () => {
    const {
      createEmailVerificationToken,
      consumeEmailVerificationToken,
    } = await import("@/lib/password-auth");

    const token = await createEmailVerificationToken(testEmail);
    expect(typeof token).toBe("string");
    expect(token.length).toBe(64);

    const verified = await consumeEmailVerificationToken(token);
    expect(verified).toBe(testEmail);

    const cred = await getUserCredential(testEmail);
    expect(cred?.emailVerified).toBe(true);

    // Second consumption must fail (single-use)
    const secondTry = await consumeEmailVerificationToken(token);
    expect(secondTry).toBeNull();
  });
});
