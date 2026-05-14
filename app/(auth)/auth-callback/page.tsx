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
  const [error, setError] = useState<string | null>(null)
  const triggered = useRef(false)

  useEffect(() => {
    // Esperar a que MSAL termine de procesar el response del redirect.
    if (inProgress !== InteractionStatus.None) return
    if (triggered.current) return
    triggered.current = true

    const account = instance.getAllAccounts()[0]
    if (!account) {
      // Llegó alguien sin sesión MSAL activa (acceso directo a la URL). Volvemos al login.
      window.location.href = "/login"
      return
    }

    instance.setActiveAccount(account)
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
          throw new Error(err.message ?? "No se pudo iniciar sesión con Microsoft")
        }

        const data = await res.json()
        setUser(data.user)
        window.location.href = "/dashboard"
      })
      .catch(async (err: unknown) => {
        const e = err as { message?: string }
        setError(e?.message ?? "Error desconocido durante el login con Microsoft")
        // Limpiar caché de MSAL para no quedar en loop si el usuario reintenta.
        try {
          await instance.clearCache()
        } catch {
          // ignorar
        }
      })
  }, [instance, inProgress, setUser])

  if (error) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>No se pudo iniciar sesión</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={() => {
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
        <CardDescription>Validando tu cuenta de Microsoft.</CardDescription>
      </CardHeader>
    </Card>
  )
}
