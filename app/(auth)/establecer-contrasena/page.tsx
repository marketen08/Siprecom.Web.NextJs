"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, CheckCircle2, Eye, EyeOff, AlertTriangle } from "lucide-react"

import { useMounted } from "@/lib/use-mounted"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z.object({
  password: z.string()
    .min(12, "Mínimo 12 caracteres")
    .regex(/[a-z]/, "Debe contener una minúscula")
    .regex(/[A-Z]/, "Debe contener una mayúscula")
    .regex(/[0-9]/, "Debe contener un dígito")
    .regex(/[^A-Za-z0-9]/, "Debe contener un carácter especial"),
  confirm: z.string().min(1, "Requerido"),
}).refine((d) => d.password === d.confirm, {
  message: "Las contraseñas no coinciden",
  path: ["confirm"],
})

type FormValues = z.infer<typeof schema>

export default function EstablecerContrasenaPage() {
  const mounted = useMounted()
  const params = mounted ? new URLSearchParams(window.location.search) : null
  const email = params?.get("email") ?? ""
  const token = params?.get("token") ?? ""
  const esReset = params?.get("reset") === "1"

  const [showPwd, setShowPwd] = useState(false)
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  })

  const titulo = esReset ? "Restablecer contraseña" : "Definí tu contraseña"

  async function onSubmit(values: FormValues) {
    setServerError("")
    setSubmitting(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password: values.password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (Array.isArray(data?.errors) && data.errors.length) {
          form.setError("password", { message: data.errors.flatMap((e: any) => e.errors ?? []).join(", ") })
        } else {
          setServerError(data?.message ?? "No se pudo guardar la contraseña.")
        }
        return
      }
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) {
    return (
      <Card className="w-full max-w-md p-8 shadow-2xl">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </div>
      </Card>
    )
  }

  if (!email || !token) {
    return (
      <Card className="w-full max-w-md p-8 shadow-2xl space-y-4">
        <div className="flex items-center gap-2 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Enlace inválido</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          El enlace no es válido o está incompleto. Pedí uno nuevo desde
          “¿Olvidaste tu contraseña?” en el inicio de sesión.
        </p>
        <Link href="/login" className="text-sm text-blue-700 hover:underline">← Volver al inicio de sesión</Link>
      </Card>
    )
  }

  if (done) {
    return (
      <Card className="w-full max-w-md p-8 shadow-2xl space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
        <h1 className="text-lg font-semibold text-gray-900">¡Listo!</h1>
        <p className="text-sm text-muted-foreground">Tu contraseña quedó configurada. Ya podés iniciar sesión.</p>
        <Button asChild className="w-full bg-blue-900 hover:bg-blue-800">
          <Link href="/login">Ir al inicio de sesión</Link>
        </Button>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md p-8 shadow-2xl">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{titulo}</h1>
        <p className="text-sm text-muted-foreground">Para la cuenta <strong>{email}</strong></p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">Nueva contraseña</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPwd ? "text" : "password"}
              placeholder="Mínimo 12 caracteres"
              className="pr-10"
              disabled={submitting}
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
              tabIndex={-1}
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirmar contraseña</Label>
          <Input
            id="confirm"
            type={showPwd ? "text" : "password"}
            placeholder="Repetí la contraseña"
            disabled={submitting}
            {...form.register("confirm")}
          />
          {form.formState.errors.confirm && (
            <p className="text-xs text-destructive">{form.formState.errors.confirm.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800" disabled={submitting}>
          {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          {submitting ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </Card>
  )
}
