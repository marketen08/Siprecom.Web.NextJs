"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { useAuthStore } from "@/store/auth-store"
import { useMounted } from "@/lib/use-mounted"
import { useMsalEstado } from "@/components/msal-provider"
import { useMetodosLogin } from "@/features/auth/api/use-metodos-login"
import { BotonLoginMicrosoft } from "@/components/boton-login-microsoft"
import type { LoginRequest, LoginApiResponse } from "@/types/auth"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const formSchema = z.object({
  email: z
    .string()
    .min(1, "El email es requerido")
    .email("No es un email válido"),
  password: z
    .string()
    .min(1, "La contraseña es requerida")
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
})

type FormValues = z.infer<typeof formSchema>

async function loginRequest(data: LoginRequest): Promise<LoginApiResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message ?? "Credenciales inválidas")
  }
  return res.json()
}

/**
 * El BFF vuelve al login con ?error=<code> cuando el ingreso federado falla. Los
 * codes los emite la API (/auth/ypf) o el propio callback; traducirlos acá evita
 * mostrar jerga del protocolo al usuario.
 *
 * Cualquier code que no esté en el mapa cae en el mensaje genérico: es preferible
 * a filtrar detalle interno en la pantalla de login.
 */
const ERRORES_FEDERADOS: Record<string, string> = {
  ACCESS_NOT_PROVISIONED:
    "Tu cuenta no está habilitada en la plataforma. Solicitá el acceso a un administrador.",
  NOT_IN_ALLOWED_GROUP:
    "Tu usuario no tiene asignado el grupo de acceso a SIPRECOM. Solicitalo a tu administrador de YPF.",
  WRONG_LOGIN_METHOD:
    "Tu cuenta ingresa con mail y contraseña, no con el login de YPF.",
  MISSING_EMAIL_CLAIM:
    "El proveedor de identidad no envió tu email. Contactá a un administrador.",
  INVALID_STATE: "La sesión de login expiró. Volvé a intentar.",
  INVALID_NONCE: "La sesión de login no es válida. Volvé a intentar.",
  INVALID_ID_TOKEN: "La sesión de login no es válida. Volvé a intentar.",
  INVALID_ACCESS_TOKEN: "La sesión de login no es válida. Volvé a intentar.",
  IDP_ERROR: "No se pudo completar el ingreso con YPF.",
  IDP_UNREACHABLE:
    "No se pudo contactar al proveedor de identidad. Reintentá en unos minutos.",
  API_UNREACHABLE: "No se pudo contactar al servidor. Reintentá en unos minutos.",
  TOKEN_EXCHANGE_FAILED: "No se pudo completar el ingreso con YPF.",
  FEDERATION_NOT_CONFIGURED:
    "El ingreso federado no está configurado en este sitio.",
}

export default function LoginPage() {
  const setUser = useAuthStore((s) => s.setUser)
  const clearUser = useAuthStore((s) => s.clearUser)
  const [showPassword, setShowPassword] = useState(false)
  const { disponible: msalDisponible } = useMsalEstado()

  // Qué métodos de ingreso ofrece este ambiente. El backend combina el toggle del
  // SuperAdmin (Licenciamiento → Funcionalidades) con si el IDP está configurado,
  // así que acá solo hay que dibujar lo que venga.
  //
  // Mientras carga no mostramos nada: pintar los botones y sacarlos medio segundo
  // después es peor que esperar. El proxy degrada a solo-password si la API no
  // responde, así que la pantalla nunca queda sin ninguna vía de entrada.
  const { data: metodos } = useMetodosLogin()

  // Cuenta solo los botones que REALMENTE se van a dibujar: Microsoft puede estar
  // encendido en el toggle pero sin MSAL montado. De esto depende si mostramos el
  // separador "o", que no tiene sentido con un solo lado.
  const mostrarMicrosoft = Boolean(metodos?.microsoft && msalDisponible)
  const hayFederado = mostrarMicrosoft || Boolean(metodos?.ypf)

  // Aviso por sesión reemplazada (login en otro dispositivo). Se calcula en
  // render (no setState-in-effect) y solo tras montar (hydration-safe), leyendo
  // window.location en vez de useSearchParams (evita Suspense).
  const mounted = useMounted()
  const aviso =
    mounted && new URLSearchParams(window.location.search).get("reason") === "session_superseded"
      ? "Tu sesión se cerró porque iniciaste sesión en otro dispositivo."
      : null

  // Mismo criterio que "aviso": se calcula en render y solo tras montar, leyendo
  // window.location en vez de useSearchParams (evita envolver la página en Suspense).
  const codigoError = mounted
    ? new URLSearchParams(window.location.search).get("error")
    : null
  const errorFederado = codigoError
    ? (ERRORES_FEDERADOS[codigoError] ?? "No se pudo iniciar sesión.")
    : null

  const form = useForm<FormValues>({
    mode: "onSubmit",
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  })

  const mutation = useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      setUser(data.user)
      window.location.href = "/dashboard"
    },
    onError: (error: Error) => {
      form.setError("root.serverError", {
        type: "server",
        message: error.message,
      })
    },
  })

  const [redirectingToMicrosoft, setRedirectingToMicrosoft] = useState(false)
  const [redirectingToYpf, setRedirectingToYpf] = useState(false)

  /**
   * Navegación real (no fetch): el flujo entero vive server-side y arranca con un
   * redirect al IDP. Con fetch, el 302 al dominio de YPF no navegaría el browser.
   */
  const handleYpfLogin = () => {
    setRedirectingToYpf(true)
    window.location.href = "/api/auth/ypf/login"
  }

  // Si llegamos por sesión reemplazada, limpiamos el user persistido (logout
  // total). clearUser es una acción de zustand (no setState de React), así que
  // no dispara la regla set-state-in-effect.
  useEffect(() => {
    if (aviso) clearUser()
  }, [aviso, clearUser])

  const onSubmit = (values: FormValues) => {
    form.clearErrors("root.serverError")
    mutation.mutate(values)
  }

  const isAnyPending = mutation.isPending || redirectingToMicrosoft || redirectingToYpf

  return (
    <Card className="grid w-full max-w-4xl gap-0 overflow-hidden border-0 p-0 shadow-2xl lg:grid-cols-5">
      {/* Panel de branding — solo visible en desktop. Reusa los azules
          corporativos del resto de la app (blue-900/800/700). */}
      <aside className="relative hidden flex-col justify-between bg-linear-to-br from-blue-900 via-blue-800 to-blue-700 p-10 text-white lg:col-span-2 lg:flex">
        {/* Pattern decorativo sutil de fondo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)",
            backgroundSize: "32px 32px, 48px 48px",
          }}
        />

        <div className="relative flex items-center gap-3">
          <div className="rounded-lg bg-white/95 p-2.5 shadow-md">
            <Image
              src="/logosiprecom.png"
              alt="Siprecom"
              width={120}
              height={36}
              priority
              className="h-8 w-auto"
            />
          </div>
        </div>

        <div className="relative space-y-3">
          <h2 className="text-2xl font-semibold leading-tight">
            Plataforma de commissioning
          </h2>
          <p className="text-sm leading-relaxed text-blue-100">
            Gestión integral de proyectos de precomisionado, comisionado y puesta
            en marcha — para industrias del petróleo, gas y petroquímica.
          </p>
        </div>

        <p className="relative text-xs text-blue-200/80">
          © Siprecom · Todos los derechos reservados
        </p>
      </aside>

      {/* Panel del formulario */}
      <div className="bg-card p-6 sm:p-8 lg:col-span-3 lg:p-10">
        {/* Logo arriba — solo en mobile (en desktop ya está en el panel azul). */}
        <div className="mb-6 flex justify-center lg:hidden">
          <Image
            src="/logosiprecom.png"
            alt="Siprecom"
            width={140}
            height={42}
            priority
            className="h-10 w-auto"
          />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Iniciar sesión
          </h1>
          <p className="text-sm text-muted-foreground">
            Ingresá con tu cuenta para continuar
          </p>
        </div>

        {/* Fuera del form: si el ingreso con contraseña está apagado, el form no se
            renderiza y estos avisos igual tienen que verse — el error federado
            justamente llega cuando el único método es el federado. */}
        {aviso && (
          <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {aviso}
          </div>
        )}

        {errorFederado && (
          <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {errorFederado}
          </div>
        )}

        {metodos?.password && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="mt-6 space-y-4"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="nombre@empresa.com"
                      autoComplete="email"
                      disabled={isAnyPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        disabled={isAnyPending}
                        className="pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end -mt-1">
              <Link href="/recuperar-contrasena" className="text-xs text-blue-700 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {form.formState.errors.root?.serverError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {form.formState.errors.root.serverError.message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-900 hover:bg-blue-800"
              disabled={isAnyPending}
            >
              {mutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {mutation.isPending ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
          </form>
        </Form>
        )}

        {/* El separador solo tiene sentido si hay algo a ambos lados. */}
        {metodos?.password && hayFederado && (
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">o</span>
            </div>
          </div>
        )}

        {/* msalDisponible además del toggle: si el sitio no tiene Microsoft
            configurado no hay contexto de MSAL montado, y el useMsal() de adentro
            del botón tiraría. */}
        {mostrarMicrosoft && (
          <BotonLoginMicrosoft
            className={metodos?.password && hayFederado ? "" : "mt-6"}
            disabled={isAnyPending}
            redirigiendo={redirectingToMicrosoft}
            onRedirigiendoChange={setRedirectingToMicrosoft}
            onError={(mensaje) =>
              form.setError("root.serverError", { type: "server", message: mensaje })
            }
          />
        )}

        {metodos?.ypf && (
          <Button
            type="button"
            variant="outline"
            className={`w-full gap-2 ${mostrarMicrosoft ? "mt-3" : metodos?.password && hayFederado ? "" : "mt-6"}`}
            disabled={isAnyPending}
            onClick={handleYpfLogin}
          >
            {redirectingToYpf && <Loader2 className="h-4 w-4 animate-spin" />}
            {redirectingToYpf ? "Redirigiendo a YPF..." : "Continuar con YPF"}
          </Button>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
          © Siprecom
        </p>
      </div>
    </Card>
  )
}
