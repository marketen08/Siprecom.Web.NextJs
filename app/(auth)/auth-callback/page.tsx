"use client"

import { useEffect, useRef, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { InteractionStatus } from "@azure/msal-browser"
import { useAuthStore } from "@/store/auth-store"
import { loginRequest } from "@/lib/msal-config"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthCallbackPage() {
  const { instance, inProgress } = useMsal()
  const setUser = useAuthStore((s) => s.setUser)
  const [status, setStatus] = useState<string>("Iniciando sesión...")
  const [error, setError] = useState<string | null>(null)
  const triggered = useRef(false)

  useEffect(() => {
    if (inProgress !== InteractionStatus.None) return
    if (triggered.current) return
    triggered.current = true

    const account = instance.getAllAccounts()[0]
    if (!account) {
      setError("No se obtuvo cuenta de Microsoft. Volvé a intentar.")
      return
    }

    instance.setActiveAccount(account)
    setStatus("Validando con el backend...")

    instance
      .acquireTokenSilent({ ...loginRequest, account })
      .then(async (result) => {
        if (!result.idToken) throw new Error("Microsoft no devolvió id_token")

        const res = await fetch("/api/auth/microsoft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: result.idToken }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message ?? `Backend respondió ${res.status}`)
        }

        const data = await res.json()
        setUser(data.user)
        window.location.href = "/dashboard"
      })
      .catch((err: unknown) => {
        const e = err as { message?: string; errorCode?: string }
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
        <CardContent>
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
