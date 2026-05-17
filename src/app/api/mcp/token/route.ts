import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import crypto from "crypto";

const INVALID_GRANT = "invalid_grant";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function verifyPKCE(
  verifier: string,
  challenge: string
): boolean {
  const hash = crypto
    .createHash("sha256")
    .update(verifier)
    .digest();

  return hash.toString("base64url") === challenge;
}

async function parseBody(
  req: NextRequest
): Promise<Record<string, string>> {
  const contentType =
    req.headers.get("content-type") ?? "";

  if (
    contentType.includes(
      "application/x-www-form-urlencoded"
    )
  ) {
    const text = await req.text();

    return Object.fromEntries(
      new URLSearchParams(text)
    );
  }

  return req.json();
}

function tokenResponse(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: CORS_HEADERS,
  });
}

export async function POST(
  req: NextRequest
) {
  const body = await parseBody(req);
  const grantType = body.grant_type;

  if (
    grantType ===
    "authorization_code"
  ) {
    const {
      code,
      code_verifier:
        codeVerifier,
      redirect_uri:
        redirectUri,
    } = body;

    if (
      !code ||
      !codeVerifier ||
      !redirectUri
    ) {
      return tokenResponse(
        {
          error:
            "invalid_request",
        },
        400
      );
    }

    const codeDoc =
      await adminDb
        .collection(
          "mcp_auth_codes"
        )
        .doc(code)
        .get();

    if (!codeDoc.exists) {
      return tokenResponse(
        {
          error:
            INVALID_GRANT,
        },
        400
      );
    }

    const data =
      codeDoc.data()!;

    if (
      new Date(
        data.expiresAt
      ) < new Date()
    ) {
      await codeDoc.ref.delete();

      return tokenResponse(
        {
          error:
            INVALID_GRANT,
        },
        400
      );
    }

    try {
      const incoming =
        new URL(
          redirectUri
        );

      const stored =
        new URL(
          data.redirectUri
        );

      const same =
        incoming.hostname ===
          stored.hostname &&
        incoming.port ===
          stored.port &&
        incoming.pathname ===
          stored.pathname;

      if (!same) {
        return tokenResponse(
          {
            error:
              INVALID_GRANT,
          },
          400
        );
      }
    } catch {
      return tokenResponse(
        {
          error:
            INVALID_GRANT,
        },
        400
      );
    }

    if (
      !verifyPKCE(
        codeVerifier,
        data.codeChallenge
      )
    ) {
      return tokenResponse(
        {
          error:
            INVALID_GRANT,
        },
        400
      );
    }

    const response =
      tokenResponse({
        access_token:
          data.idToken,

        token_type:
          "Bearer",

        expires_in:
          3600,

        scope: "",

        ...(data.refreshToken
          ? {
              refresh_token:
                data.refreshToken,
            }
          : {}),
      });

    await codeDoc.ref.delete();

    return response;
  }

  if (
    grantType ===
    "refresh_token"
  ) {
    const refreshToken =
      body.refresh_token;

    if (
      !refreshToken
    ) {
      return tokenResponse(
        {
          error:
            "invalid_request",
        },
        400
      );
    }

    const res =
      await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              grant_type:
                "refresh_token",
              refresh_token:
                refreshToken,
            }),
        }
      );

    if (!res.ok) {
      return tokenResponse(
        {
          error:
            INVALID_GRANT,
        },
        400
      );
    }

    const refreshed =
      await res.json();

    return tokenResponse({
      access_token:
        refreshed.id_token,

      token_type:
        "Bearer",

      expires_in:
        parseInt(
          refreshed.expires_in,
          10
        ),

      refresh_token:
        refreshed.refresh_token,

      scope: "",
    });
  }

  return tokenResponse(
    {
      error:
        "unsupported_grant_type",
    },
    400
  );
}
