"use client"

import { useEffect, useRef, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { InteractionStatus } from "@azure/msal-browser"
import { useAuthStore } from "@/store/auth-store"
import { loginRequest } from "@/lib/msal-config"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthCallbackPage() {
  console.log("[auth-callback] >>> RENDERING")
  const { instance, inProgress } = useMsal()
  const setUser = useAuthStore((s) => s.setUser)
  const [status, setStatus] = useState<string>("Esperando MSAL...")
  const [error, setError] = useState<string | null>(null)
  const triggered = useRef(false)
  console.log("[auth-callback] state: inProgress =", inProgress, " accounts =", instance.getAllAccounts().length)

  useEffect(() => {
    console.log("[auth-callback] useEffect: inProgress =", inProgress)
    if (inProgress !== InteractionStatus.None) {
      setStatus(`Esperando MSAL (${inProgress})...`)
      return
    }
    if (triggered.current) return
    triggered.current = true

    const accounts = instance.getAllAccounts()
    console.log("[auth-callback] accounts =", accounts.length, accounts)

    const account = accounts[0]
    if (!account) {
      setError(
        "MSAL no tiene cuenta activa después del redirect. Esto suele indicar que handleRedirectPromise no procesó el response. Revisá la consola para más detalle."
      )
      return
    }

    setStatus("Obteniendo id_token de Microsoft...")
    instance.setActiveAccount(account)

    instance
      .acquireTokenSilent({ ...loginRequest, account })
      .then(async (result) => {
        console.log("[auth-callback] acquireTokenSilent OK; idToken length =", result.idToken?.length)
        if (!result.idToken) throw new Error("Microsoft no devolvió id_token")

        setStatus("Validando con el backend...")
        const res = await fetch("/api/auth/microsoft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: result.idToken }),
        })
        console.log("[auth-callback] POST /api/auth/microsoft status =", res.status)

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          console.error("[auth-callback] backend error:", err)
          throw new Error(err.message ?? `Backend respondió ${res.status}`)
        }

        const data = await res.json()
        console.log("[auth-callback] backend OK; user =", data.user)
        setUser(data.user)
        setStatus("Redirigiendo a dashboard...")
        window.location.href = "/dashboard"
      })
      .catch((err: unknown) => {
        const e = err as { message?: string; errorCode?: string }
        console.error("[auth-callback] error:", e)
        setError(`${e?.errorCode ? `[${e.errorCode}] ` : ""}${e?.message ?? "Error desconocido"}`)
      })
  }, [instance, inProgress, setUser])

  if (error) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>No se pudo iniciar sesión</CardTitle>
          <CardDescription className="whitespace-pre-wrap wrap-break-word">{error}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Abrí la consola del browser (F12) → tildá "Preserve log" → reintentá. Los logs van con prefijo [auth-callback].
          </p>
          <Button
            className="w-full"
            onClick={async () => {
              try {
                await instance.clearCache()
              } catch {}
              window.location.href = "/login"
            }}
          >
            Volver al login
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Iniciando sesión...</CardTitle>
        <CardDescription>{status}</CardDescription>
      </CardHeader>
    </Card>
  )
}
