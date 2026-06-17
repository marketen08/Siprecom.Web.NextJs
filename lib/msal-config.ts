import {
  NavigationClient,
  type Configuration,
  type NavigationOptions,
  type RedirectRequest,
} from "@azure/msal-browser"

// MSAL navega internamente despues de procesar el redirect. En la pagina
// de callback queremos manejar la navegacion nosotros (al dashboard despues
// de validar con el backend), no que MSAL nos lleve de vuelta a /login.
// Este NavigationClient cancela navegaciones "internas" cuando estamos en
// /auth-callback. Las navegaciones externas (a Microsoft, el loginRedirect)
// pasan normalmente.
// Bloquea las navegaciones internas que MSAL hace al volver del redirect,
// para que el callback page pueda procesar el response sin que MSAL nos lleve
// de vuelta a /login (URL desde donde se inicio loginRedirect).
class NoBouncebackNavigationClient extends NavigationClient {
  async navigateInternal(url: string, options: NavigationOptions): Promise<boolean> {
    if (typeof window !== "undefined" && window.location.pathname === "/auth-callback") {
      return false
    }
    return super.navigateInternal(url, options)
  }
}

/**
 * Arma la Configuration de MSAL con el clientId/tenantId resueltos en RUNTIME
 * (vienen del endpoint /api/config/auth, que los lee de las App Settings del SWA
 * por sitio — sin NEXT_PUBLIC, sin re-buildear).
 *
 * El redirectUri se deriva de window.location.origin: un único build sirve N
 * dominios y cada uno usa el suyo. Solo se llama en el browser (desde el
 * MsalProvider), por eso asumimos window disponible con fallback a localhost.
 * IMPORTANTE: cada dominio nuevo debe registrarse como redirect URI (plataforma
 * SPA) en la App Registration de Azure AD, sino Microsoft rechaza el login
 * (AADSTS50011).
 */
export function buildMsalConfig(clientId: string, tenantId: string): Configuration {
  const appUrl =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"

  return {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId || "common"}`,
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
}

export const loginRequest: RedirectRequest = {
  scopes: ["openid", "profile", "email", "User.Read"],
}
