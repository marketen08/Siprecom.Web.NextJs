import {
  NavigationClient,
  type Configuration,
  type NavigationOptions,
  type RedirectRequest,
} from "@azure/msal-browser"

const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID ?? ""
const tenantId = process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID ?? "common"
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

// MSAL navega internamente despues de procesar el redirect. En la pagina
// de callback queremos manejar la navegacion nosotros (al dashboard despues
// de validar con el backend), no que MSAL nos lleve de vuelta a /login.
// Este NavigationClient cancela navegaciones "internas" cuando estamos en
// /auth-callback. Las navegaciones externas (a Microsoft, el loginRedirect)
// pasan normalmente.
class NoBouncebackNavigationClient extends NavigationClient {
  async navigateInternal(url: string, options: NavigationOptions): Promise<boolean> {
    if (typeof window !== "undefined" && window.location.pathname === "/auth-callback") {
      console.log("[NavClient] cancelando navegacion interna desde /auth-callback hacia", url)
      return false
    }
    return super.navigateInternal(url, options)
  }
}

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: `${appUrl}/auth-callback`,
    postLogoutRedirectUri: `${appUrl}/login`,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
  system: {
    navigationClient: new NoBouncebackNavigationClient(),
  },
}

export const loginRequest: RedirectRequest = {
  scopes: ["openid", "profile", "email", "User.Read"],
}
