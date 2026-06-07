"use client"

import Image from "next/image"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { useMsal } from "@azure/msal-react"
import { useAuthStore } from "@/store/auth-store"
import type { LoginRequest, LoginApiResponse } from "@/types/auth"
import { loginRequest as msalLoginRequest } from "@/lib/msal-config"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

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

export default function LoginPage() {
  const setUser = useAuthStore((s) => s.setUser)
  const [showPassword, setShowPassword] = useState(false)
  const { instance: msalInstance } = useMsal()

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

  const handleMicrosoftLogin = async () => {
    form.clearErrors("root.serverError")
    setRedirectingToMicrosoft(true)
    try {
      // Redirect flow: la página se va a Microsoft. El callback procesa el response.
      await msalInstance.loginRedirect(msalLoginRequest)
    } catch (err: unknown) {
      setRedirectingToMicrosoft(false)
      const e = err as { errorCode?: string; message?: string }
      if (e?.errorCode === "user_cancelled") return
      form.setError("root.serverError", {
        type: "server",
        message: e?.message ?? "No se pudo iniciar sesión con Microsoft",
      })
    }
  }

  const onSubmit = (values: FormValues) => {
    form.clearErrors("root.serverError")
    mutation.mutate(values)
  }

  const isAnyPending = mutation.isPending || redirectingToMicrosoft

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

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">o</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          disabled={isAnyPending}
          onClick={handleMicrosoftLogin}
        >
          {redirectingToMicrosoft
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <MicrosoftIcon className="h-4 w-4" />}
          {redirectingToMicrosoft ? "Redirigiendo a Microsoft..." : "Continuar con Microsoft"}
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
          © Siprecom
        </p>
      </div>
    </Card>
  )
}
