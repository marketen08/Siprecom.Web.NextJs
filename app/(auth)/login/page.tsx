"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { useMsal } from "@azure/msal-react"
import { useAuthStore } from "@/store/auth-store"
import type { LoginRequest, LoginApiResponse } from "@/types/auth"
import { loginRequest as msalLoginRequest } from "@/lib/msal-config"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Bienvenido
        </CardTitle>
        <CardDescription className="text-center">
          Ingresá con tu email y contraseña
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="ejemplo@dominio.com"
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
              <p className="text-sm text-destructive">
                {form.formState.errors.root.serverError.message}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isAnyPending}
            >
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
          <MicrosoftIcon className="h-4 w-4" />
          {redirectingToMicrosoft ? "Redirigiendo a Microsoft..." : "Iniciar sesión con Microsoft"}
        </Button>
      </CardContent>
    </Card>
  )
}
