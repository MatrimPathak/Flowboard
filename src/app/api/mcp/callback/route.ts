import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { idToken, refreshToken, redirectUri, state, codeChallenge, codeChallengeMethod } = body;

  if (!idToken || !redirectUri || !codeChallenge) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  let userId: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    userId = decoded.uid;
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const code = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await adminDb.collection("mcp_auth_codes").doc(code).set({
    userId,
    idToken,
    refreshToken: refreshToken ?? null,
    redirectUri,
    codeChallenge,
    codeChallengeMethod: codeChallengeMethod ?? "S256",
    expiresAt,
    createdAt: new Date().toISOString(),
  });

  const callbackUrl = new URL(redirectUri);
  callbackUrl.searchParams.set("code", code);
  if (state) callbackUrl.searchParams.set("state", state);

  return NextResponse.json({ redirectTo: callbackUrl.toString() });
}
