import { z } from "zod";
import { generateOTP, verifyOTP } from "@/lib/otp-store";
import { createCustomSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  action: z.enum(["send", "verify"]),
  email: z.string().email(),
  code: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid email or request payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { action, email, code } = parsed.data;

    if (action === "send") {
      const generated = generateOTP(email);
      return new Response(
        JSON.stringify({
          success: true,
          message: `OTP sent to ${email}`,
          previewCode: generated, // Return code in preview for easy testing
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      if (!code) {
        return new Response(JSON.stringify({ error: "OTP code is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const valid = verifyOTP(email, code);
      if (!valid) {
        return new Response(JSON.stringify({ error: "Invalid or expired OTP code" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Establish session cookie
      await createCustomSession(email);

      return new Response(
        JSON.stringify({
          success: true,
          user: { email, name: email.split("@")[0] },
          redirectUrl: "/dashboard",
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
  } catch (err) {
    console.error("[api/auth/otp] error:", err);
    return new Response(JSON.stringify({ error: "Authentication failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
