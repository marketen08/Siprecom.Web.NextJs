"use client"

import { useEffect, useState } from "react"
import {
  PublicClientApplication,
  EventType,
  type AccountInfo,
  type AuthenticationResult,
} from "@azure/msal-browser"
import { MsalProvider as MsalProviderLib } from "@azure/msal-react"
import { msalConfig } from "@/lib/msal-config"

// Singleton: una sola PCA por carga de la app, fuera del componente. Esto es el
// patron oficial de los samples MSAL React + Next.js. Evita problemas con
// StrictMode (double effects) y garantiza una sola llamada a
// handleRedirectPromise (el response del redirect solo se puede consumir una vez).
let msalInstance: PublicClientApplication | null = null
let initPromise: Promise<void> | null = null

function getInitPromise(): Promise<void> {
  if (initPromise) return initPromise

  initPromise = (async () => {
    msalInstance = new PublicClientApplication(msalConfig)
    console.log("[msal-provider] PCA creado")

    await msalInstance.initialize()
    console.log("[msal-provider] initialize() OK")

    const response = await msalInstance.handleRedirectPromise()
    console.log(
      "[msal-provider] handleRedirectPromise OK; response =",
      response ? "HAS_RESPONSE" : "null",
    )

    if (response?.account) {
      console.log("[msal-provider] setActiveAccount desde response:", response.account.username)
      msalInstance.setActiveAccount(response.account)
    } else if (msalInstance.getAllAccounts().length > 0) {
      const first = msalInstance.getAllAccounts()[0]
      console.log("[msal-provider] setActiveAccount desde cache:", first.username)
      msalInstance.setActiveAccount(first)
    } else {
      console.log("[msal-provider] sin accounts")
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
        setReady(true) // Igual marcamos ready para que la UI no quede colgada
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
        Inicializando MSAL...
      </div>
    )
  }

  return <MsalProviderLib instance={msalInstance}>{children}</MsalProviderLib>
}
