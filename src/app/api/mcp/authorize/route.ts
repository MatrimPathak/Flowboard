import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const { searchParams } = url;

  const responseType = searchParams.get("response_type");
  const redirectUri = searchParams.get("redirect_uri");
  const codeChallenge = searchParams.get("code_challenge");
  const codeChallengeMethod = searchParams.get("code_challenge_method") ?? "S256";

  if (responseType !== "code" || !redirectUri || !codeChallenge) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (codeChallengeMethod !== "S256") {
    return NextResponse.json({ error: "invalid_request", error_description: "Only S256 code_challenge_method is supported" }, { status: 400 });
  }

  const loginUrl = new URL("/mcp-login", url.origin);
  searchParams.forEach((v, k) => loginUrl.searchParams.set(k, v));
  loginUrl.searchParams.set("code_challenge_method", codeChallengeMethod);

  return NextResponse.redirect(loginUrl);
}
