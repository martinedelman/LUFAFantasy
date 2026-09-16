import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";
import { getInstitutionalApiUrl } from "@/lib/institutional-auth";

const API = getInstitutionalApiUrl();
const appBaseUrl = process.env.LUFA_INSTITUTIONAL_APP_URL ?? "http://localhost:3003";

function createAuth0Client() {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;
  const secret = process.env.AUTH0_SECRET;

  if (!domain || !clientId || !clientSecret || !secret) return undefined;

  return new Auth0Client({
    domain,
    clientId,
    clientSecret,
    secret,
    appBaseUrl,
    authorizationParameters: { scope: "openid profile email" },
    async onCallback(error, context, session) {
      const target = new URL(context.returnTo || "/", appBaseUrl);
      if (error) {
        target.pathname = "/";
        target.searchParams.set("auth_error", "1");
        return NextResponse.redirect(target);
      }

      const response = NextResponse.redirect(target);
      const idToken = session?.tokenSet.idToken;
      if (idToken) {
        try {
          const upstream = await fetch(`${API}/api/auth/auth0/session`, {
            method: "POST",
            cache: "no-store",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ idToken }),
          });
          const cookie = upstream.headers.get("set-cookie");
          if (upstream.ok && cookie) response.headers.append("set-cookie", cookie);
          else {
            target.searchParams.set("auth_error", "session");
            return NextResponse.redirect(target);
          }
        } catch {
          target.searchParams.set("auth_error", "session");
          return NextResponse.redirect(target);
        }
      }
      return response;
    },
  });
}

let client: Auth0Client | undefined;

export const auth0 = {
  middleware: async (request: Request) => {
    client ??= createAuth0Client();
    return client ? client.middleware(request) : NextResponse.next();
  },
};
