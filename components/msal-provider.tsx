"use client"

import { useEffect, useState } from "react"
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

function getInitPromise(): Promise<void> {
  if (initPromise) return initPromise

  initPromise = (async () => {
    // Config (clientId/tenantId) resuelta en RUNTIME desde el server, no horneada
    // en el build. Así un único build sirve a N sitios (cada SWA define sus App
    // Settings) sin tocar GitHub ni re-buildear.
    const res = await fetch("/api/config/auth", { cache: "no-store" })
    if (!res.ok)
      throw new Error(`No se pudo cargar la config de auth (HTTP ${res.status}).`)
    const { clientId, tenantId } = (await res.json()) as {
      clientId?: string
      tenantId?: string
    }
    if (!clientId)
      throw new Error(
        "MICROSOFT_CLIENT_ID no está configurado en el servidor (App Settings del SWA).",
      )

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

export function MsalProviderClient({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    getInitPromise()
      .then(() => setReady(true))
      .catch((err) => {
        console.error("[msal-provider] init falló:", err)
        setInitError(String(err?.message ?? err))
        setReady(true)
      })
  }, [])

  if (initError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md rounded border border-destructive bg-destructive/10 p-4 text-sm">
          <p className="font-semibold mb-2">MSAL init falló:</p>
          <pre className="whitespace-pre-wrap">{initError}</pre>
        </div>
      </div>
    )
  }

  if (!ready || !msalInstance) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Iniciando...
      </div>
    )
  }

  return <MsalProviderLib instance={msalInstance}>{children}</MsalProviderLib>
}
