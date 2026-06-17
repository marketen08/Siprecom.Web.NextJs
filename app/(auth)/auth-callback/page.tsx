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
  // True cuando el backend rechazó por allowlist (usuario no dado de alta).
  // Cambia el título/encuadre del mensaje, no es un error técnico.
  const [sinAcceso, setSinAcceso] = useState(false)
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
          // Allowlist: el usuario no está dado de alta. No es un error técnico —
          // mostramos la pantalla de "solicitar acceso".
          if (res.status === 403 && err.code === "ACCESS_NOT_PROVISIONED") {
            setSinAcceso(true)
            setError(err.message ?? "Tu cuenta no está habilitada en la plataforma.")
            return
          }
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
          <CardTitle>{sinAcceso ? "Acceso no habilitado" : "No se pudo iniciar sesión"}</CardTitle>
          <CardDescription className="whitespace-pre-wrap wrap-break-word">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={async () => {
              try {
                // Cerramos la sesión local de MSAL: sin esto el SSO de Microsoft
                // re-loguearía solo y volvería a rebotar acá.
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
