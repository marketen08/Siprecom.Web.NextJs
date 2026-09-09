"use client"

import { createContext, useContext, useEffect, useState } from "react"
import {
  PublicClientApplication,
  EventType,
  type AccountInfo,
  type AuthenticationResult,
} from "@azure/msal-browser"
import { MsalProvider as MsalProviderLib } from "@azure/msal-react"
import { buildMsalConfig } from "@/lib/msal-config"

// Singleton: una sola PCA por carga de la app, fuera del componente.
// StrictMode hace que useEffect corra dos veces en dev; sin singleton se crearian
// dos instancias de PCA y la segunda llamada a handleRedirectPromise devolveria
// null (el response del redirect solo se puede consumir una vez).
let msalInstance: PublicClientApplication | null = null
let initPromise: Promise<void> | null = null

/**
 * Trae /api/config/auth reintentando con backoff. Esa ruta corre en el host del
 * frontend (funciones del SWA), que tiene cold start propio: tras inactividad el
 * primer request puede devolver 5xx o no responder mientras levanta. Reintentamos
 * para darle tiempo en vez de tirar el error de una. Un 4xx (config mal seteada)
 * NO se reintenta porque no se arregla esperando. ~6 intentos × 2.5s ≈ 15s.
 */
async function fetchAuthConfigConReintentos(
  intentos = 6,
  esperaMs = 2500,
): Promise<Response> {
  let ultimoStatus = 503
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch("/api/config/auth", { cache: "no-store" })
      if (res.ok || res.status < 500) return res
      ultimoStatus = res.status
    } catch {
      // Error de red: el host todavía no responde. Reintentamos.
    }
    if (i < intentos - 1) await new Promise((r) => setTimeout(r, esperaMs))
  }
  return new Response(null, { status: ultimoStatus })
}

function getInitPromise(): Promise<void> {
  if (initPromise) return initPromise

  initPromise = (async () => {
    // Config (clientId/tenantId) resuelta en RUNTIME desde el server, no horneada
    // en el build. Así un único build sirve a N sitios (cada SWA define sus App
    // Settings) sin tocar GitHub ni re-buildear.
    const res = await fetchAuthConfigConReintentos()
    if (!res.ok)
      throw new Error(`No se pudo cargar la config de auth (HTTP ${res.status}).`)
    const { clientId, tenantId } = (await res.json()) as {
      clientId?: string
      tenantId?: string
    }
    // Sin clientId, el sitio simplemente no ofrece ingreso con Microsoft. Es un
    // modo válido, no un error: los sitios federados con el IDP del cliente (o los
    // que solo usan mail y contraseña) no tienen por qué configurar una App
    // Registration que no usan. Dejamos msalInstance en null y salimos.
    if (!clientId) return

    msalInstance = new PublicClientApplication(buildMsalConfig(clientId, tenantId ?? "common"))
    await msalInstance.initialize()

    const response = await msalInstance.handleRedirectPromise()
    if (response?.account) {
      msalInstance.setActiveAccount(response.account)
    } else if (msalInstance.getAllAccounts().length > 0) {
      msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0])
    }

    msalInstance.addEventCallback((event) => {
      if (
        event.eventType === EventType.LOGIN_SUCCESS &&
        event.payload &&
        (event.payload as AuthenticationResult).account
      ) {
        msalInstance?.setActiveAccount(
          (event.payload as AuthenticationResult).account as AccountInfo,
        )
      }
    })
  })()

  return initPromise
}

/**
 * Estado de MSAL para los consumidores.
 *
 * `disponible` false significa que NO hay contexto de MSAL montado, así que en ese
 * caso nadie puede llamar `useMsal()` — tiraría. Los componentes que lo usan
 * (el botón de Microsoft, la página de auth-callback) tienen que renderizarse solo
 * cuando esto es true; como los hooks no se pueden llamar condicionalmente, la
 * llamada vive en un componente hijo que se monta o no.
 */
export interface MsalEstado {
  /** Hay una PCA inicializada y el provider de MSAL está montado. */
  disponible: boolean
  /**
   * Mensaje cuando la inicialización falló de verdad (config rota, red). Null si
   * el sitio simplemente no tiene Microsoft configurado — ese caso no es un error.
   */
  error: string | null
}

const MsalEstadoContext = createContext<MsalEstado>({ disponible: false, error: null })

export function useMsalEstado(): MsalEstado {
  return useContext(MsalEstadoContext)
}

export function MsalProviderClient({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<{ listo: boolean } & MsalEstado>({
    listo: false,
    disponible: false,
    error: null,
  })

  useEffect(() => {
    getInitPromise()
      .then(() => setEstado({ listo: true, disponible: Boolean(msalInstance), error: null }))
      .catch((err) => {
        // Antes esto pintaba una pantalla de error a página completa y bloqueaba
        // TODO el route group (auth): login, auth-callback, recuperar-contraseña y
        // establecer-contraseña. O sea que un problema con Microsoft dejaba al sitio
        // sin ninguna vía de entrada, incluida la de recuperación.
        //
        // Ahora degradamos: Microsoft queda no disponible y el resto de los métodos
        // sigue funcionando. El detalle va a la consola y al contexto, para que la
        // pantalla de login pueda avisarlo sin bloquear.
        console.error("[msal-provider] init falló:", err)
        setEstado({ listo: true, disponible: false, error: String(err?.message ?? err) })
      })
  }, [])

  if (!estado.listo) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Iniciando...
      </div>
    )
  }

  const valor: MsalEstado = { disponible: estado.disponible, error: estado.error }

  // Sin PCA no montamos el provider de MSAL: montarlo con instance null rompe a
  // cualquier useMsal() que se ejecute abajo.
  if (!estado.disponible || !msalInstance) {
    return <MsalEstadoContext.Provider value={valor}>{children}</MsalEstadoContext.Provider>
  }

  return (
    <MsalEstadoContext.Provider value={valor}>
      <MsalProviderLib instance={msalInstance}>{children}</MsalProviderLib>
    </MsalEstadoContext.Provider>
  )
}
