import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const base = new URL(req.url).origin;
  return NextResponse.json({
    issuer: `${base}/api/mcp`,
    authorization_endpoint: `${base}/api/mcp/authorize`,
    token_endpoint: `${base}/api/mcp/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
}
