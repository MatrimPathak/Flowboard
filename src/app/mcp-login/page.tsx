"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider, githubProvider } from "@/lib/firebase";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";

function McpLoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectUri = searchParams.get("redirect_uri") ?? "";
  const state = searchParams.get("state") ?? "";
  const codeChallenge = searchParams.get("code_challenge") ?? "";
  const codeChallengeMethod = searchParams.get("code_challenge_method") ?? "S256";

  async function completeAuth(idToken: string, refreshToken: string) {
    const res = await fetch("/api/mcp/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, refreshToken, redirectUri, state, codeChallenge, codeChallengeMethod }),
    });
    if (!res.ok) throw new Error("Failed to complete authorization");
    const { redirectTo } = await res.json();
    window.location.href = redirectTo;
  }

  const handleEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await completeAuth(await cred.user.getIdToken(), cred.user.refreshToken);
    } catch (err: any) {
      setError(err.message ?? "Sign-in failed");
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: any, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, provider);
      await completeAuth(await result.user.getIdToken(), result.user.refreshToken);
    } catch (err: any) {
      setError(err.message ?? `${name} sign-in failed`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to Flowboard</h1>
          <p className="text-sm text-neutral-500">Authorize MCP client access</p>
        </div>

        <form onSubmit={handleEmailPassword} className="space-y-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="flex items-center gap-3 text-neutral-400 text-xs">
          <div className="flex-1 border-t border-neutral-200 dark:border-neutral-700" />
          or continue with
          <div className="flex-1 border-t border-neutral-200 dark:border-neutral-700" />
        </div>

        <div className="space-y-2">
          <button
            onClick={() => handleOAuth(googleProvider, "Google")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors"
          >
            <FcGoogle className="size-4" />
            Google
          </button>
          <button
            onClick={() => handleOAuth(githubProvider, "GitHub")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors"
          >
            <FaGithub className="size-4" />
            GitHub
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}

export default function McpLoginPage() {
  return (
    <Suspense>
      <McpLoginForm />
    </Suspense>
  );
}
