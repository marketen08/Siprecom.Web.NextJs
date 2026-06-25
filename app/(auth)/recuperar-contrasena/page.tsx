"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, MailCheck } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z.object({
  email: z.string().min(1, "El email es requerido").email("Email inválido"),
})
type FormValues = z.infer<typeof schema>

export default function RecuperarContrasenaPage() {
  const [enviado, setEnviado] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      // El backend siempre responde 200 (no revela qué emails existen).
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      })
      setEnviado(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (enviado) {
    return (
      <Card className="w-full max-w-md p-8 shadow-2xl space-y-4 text-center">
        <MailCheck className="mx-auto h-10 w-10 text-blue-700" />
        <h1 className="text-lg font-semibold text-gray-900">Revisá tu correo</h1>
        <p className="text-sm text-muted-foreground">
          Si el email corresponde a una cuenta de mail y contraseña, te enviamos un
          enlace para restablecerla. Revisá también la carpeta de spam.
        </p>
        <Link href="/login" className="text-sm text-blue-700 hover:underline">← Volver al inicio de sesión</Link>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md p-8 shadow-2xl">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">¿Olvidaste tu contraseña?</h1>
        <p className="text-sm text-muted-foreground">
          Ingresá tu email y te enviamos un enlace para restablecerla.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="nombre@empresa.com"
            autoComplete="email"
            disabled={submitting}
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800" disabled={submitting}>
          {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          {submitting ? "Enviando…" : "Enviar enlace"}
        </Button>

        <p className="text-center">
          <Link href="/login" className="text-sm text-blue-700 hover:underline">← Volver al inicio de sesión</Link>
        </p>
      </form>
    </Card>
  )
}
