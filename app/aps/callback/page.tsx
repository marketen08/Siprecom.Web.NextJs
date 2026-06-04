"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"

/**
 * Callback de Autodesk OAuth. Autodesk redirige a esta página con ?code=&state=
 * en la query. La página llama al backend para intercambiar el code por tokens
 * y después redirige al usuario al `returnTo` original (lo que devuelve el backend).
 *
 * Vive afuera del dashboard layout porque el redirect viene "limpio" de
 * Autodesk — no queremos ni navbar ni sidebar mientras se completa el flow.
 */
function ApsCallbackContent() {
  const params = useSearchParams()
  const code = params.get("code")
  const state = params.get("state")
  const error = params.get("error")
  const errorDescription = params.get("error_description")

  const [phase, setPhase] = useState<"working" | "success" | "error">("working")
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (error) {
      setPhase("error")
      setMessage(errorDescription || error)
      return
    }
    if (!code || !state) {
      setPhase("error")
      setMessage("Faltan parámetros en el callback de Autodesk.")
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiClient.post<{ data?: string; message?: string }>(
          "/api/aps/exchange",
          { code, state },
        )
        if (cancelled) return
        const returnTo = res?.data
        if (!returnTo) {
          setPhase("error")
          setMessage(res?.message || "Respuesta inválida del servidor.")
          return
        }
        setPhase("success")
        // Pequeño delay para que el usuario vea el "Conectado!" antes del redirect.
        setTimeout(() => { window.location.href = returnTo }, 600)
      } catch (e) {
        if (cancelled) return
        setPhase("error")
        setMessage((e as Error).message)
      }
    })()
    return () => { cancelled = true }
  }, [code, state, error, errorDescription])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full rounded-lg border border-gray-200 bg-white shadow-sm p-6 text-center space-y-3">
        {phase === "working" && (
          <>
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto" />
            <h1 className="text-lg font-semibold text-gray-800">Conectando con Autodesk…</h1>
            <p className="text-sm text-muted-foreground">Validando tu autorización.</p>
          </>
        )}
        {phase === "success" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
            <h1 className="text-lg font-semibold text-gray-800">Conectado!</h1>
            <p className="text-sm text-muted-foreground">Te llevamos de vuelta…</p>
          </>
        )}
        {phase === "error" && (
          <>
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
            <h1 className="text-lg font-semibold text-gray-800">No se pudo conectar</h1>
            <p className="text-sm text-red-700 whitespace-pre-wrap">{message}</p>
            <a
              href="/alcance/proyectos"
              className="inline-block text-sm text-blue-700 hover:underline"
            >
              Volver
            </a>
          </>
        )}
      </div>
    </div>
  )
}

export default function ApsCallbackPage() {
  return (
    <Suspense>
      <ApsCallbackContent />
    </Suspense>
  )
}
