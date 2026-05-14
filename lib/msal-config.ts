import type { Configuration, RedirectRequest } from "@azure/msal-browser"

const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID ?? ""
const tenantId = process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID ?? "common"

const redirectBase = typeof window !== "undefined" ? window.location.origin : ""

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: `${redirectBase}/auth-callback`,
    postLogoutRedirectUri: `${redirectBase}/login`,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
}

export const loginRequest: RedirectRequest = {
  scopes: ["openid", "profile", "email", "User.Read"],
}
