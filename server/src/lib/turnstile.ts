/**
 * Cloudflare Turnstile server-side verification utility
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Verify a Cloudflare Turnstile token
 * @param token - The Turnstile token from the client
 * @param remoteIp - Optional IP address of the client
 * @returns Promise<boolean> - True if verification succeeds, false otherwise
 */
export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.warn("TURNSTILE_SECRET_KEY is not configured - skipping verification");
    return true; // Allow signup when Turnstile is not configured
  }

  if (!token) {
    console.error("Turnstile token is missing");
    return false;
  }

  try {
    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });

    const data: TurnstileResponse = await response.json();

    if (!data.success) {
      console.error("Turnstile verification failed:", data["error-codes"]);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error verifying Turnstile token:", error);
    return false;
  }
}
