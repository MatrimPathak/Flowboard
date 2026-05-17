import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();

  return NextResponse.json({
    client_id: crypto.randomUUID(),
    client_name: body.client_name ?? "OpenCode",
    redirect_uris: body.redirect_uris ?? [],
    grant_types: [
      "authorization_code",
      "refresh_token"
    ],
    response_types: ["code"],
    token_endpoint_auth_method: "none"
  });
}