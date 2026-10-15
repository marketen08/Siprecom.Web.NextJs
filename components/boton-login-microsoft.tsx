"use client"

import { useMsal } from "@azure/msal-react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { loginRequest as msalLoginRequest } from "@/lib/msal-config"

/**
 * Botón "Continuar con Microsoft".
 *
 * Vive en su propio componente porque `useMsal()` es un hook y no se puede llamar
 * condicionalmente: en los sitios sin Microsoft configurado no hay contexto de
 * MSAL montado y esa llamada tiraría. Al estar acá, el hook solo se ejecuta si el
 * componente se renderiza — y quien lo renderiza ya verificó `disponible`.
 */
function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 23 23" className={className} xmlns="http://www.w3.org/2000/svg">
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#7fba00" d="M12 1h10v10H12z" />
      <path fill="#00a4ef" d="M1 12h10v10H1z" />
      <path fill="#ffb900" d="M12 12h10v10H12z" />
    </svg>
  )
}

export function BotonLoginMicrosoft({
  className,
  disabled,
  redirigiendo,
  onRedirigiendoChange,
  onError,
}: {
  className?: string
  disabled?: boolean
  redirigiendo: boolean
  onRedirigiendoChange: (v: boolean) => void
  onError: (mensaje: string) => void
}) {
  const { instance } = useMsal()

  const handleClick = async () => {
    onRedirigiendoChange(true)
    try {
      // Redirect flow: la página se va a Microsoft. El callback lo procesa
      // /auth-callback.
      await instance.loginRedirect(msalLoginRequest)
    } catch (err: unknown) {
      onRedirigiendoChange(false)
      const e = err as { errorCode?: string; message?: string }
      // El usuario cerró el popup o canceló: no es un error que valga mostrar.
      if (e?.errorCode === "user_cancelled") return
      onError(e?.message ?? "No se pudo iniciar sesión con Microsoft")
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={`w-full gap-2 ${className ?? ""}`}
      disabled={disabled}
      onClick={handleClick}
    >
      {redirigiendo ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MicrosoftIcon className="h-4 w-4" />
      )}
      {redirigiendo ? "Redirigiendo a Microsoft..." : "Continuar con Microsoft"}
    </Button>
  )
}
