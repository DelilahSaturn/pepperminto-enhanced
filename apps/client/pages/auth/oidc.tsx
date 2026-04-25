import { setCookie } from "cookies-next";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Login() {
  const router = useRouter();

  async function check() {
    // Wait until Next.js has fully hydrated router.query from the URL.
    // Without this, query params are empty on the first render and the
    // callback fires with no code/state, producing a 400 from the API.
    if (!router.isReady) return;
    if (!router.query.code) return;

    try {
      const params = new URLSearchParams();
      params.set("code", String(router.query.code));
      params.set("state", String(router.query.state ?? ""));
      // session_state and iss are optional — only forward if actually present
      if (router.query.session_state) params.set("session_state", String(router.query.session_state));
      if (router.query.iss) params.set("iss", String(router.query.iss));

      const res = await fetch(`/api/v1/auth/oidc/callback?${params.toString()}`);
      const sso = await res.json();

      if (!sso.success) {
        const errorParam = res.status >= 500 ? "oidc_error" : "account_not_found";
        router.push(`/auth/login?error=${errorParam}`);
      } else {
        setandRedirect(sso.token, sso.onboarding);
      }
    } catch {
      router.push("/auth/login?error=oidc_error");
    }
  }

  function setandRedirect(token: string, onboarding: boolean) {
    setCookie("session", token, { maxAge: 60 * 6 * 24, path: "/" });
    router.push(onboarding ? "/onboarding" : "/");
  }

  useEffect(() => {
    check();
  }, [router.isReady, router.query]);

  return <div></div>;
}