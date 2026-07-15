"use client"

import { useState } from "react"
import { Download, Loader2, MonitorDown, Zap, WifiOff, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBreadcrumb } from "@/components/breadcrumb-context"

export default function AppEscritorioPage() {
  useBreadcrumb([{ label: "Ejecución" }, { label: "App de escritorio" }])

  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function descargar() {
    setError(null)
    setDescargando(true)
    try {
      const res = await fetch("/api/downloads/win-local/installer")
      if (!res.ok) {
        if (res.status === 404) {
          setError("Todavía no se publicó una versión del instalador. Contactate con el administrador.")
        } else {
          setError(`Error al descargar: ${res.status}`)
        }
        return
      }
      const blob = await res.blob()
      const disposition = res.headers.get("content-disposition") ?? ""
      // Parseamos filename="..." del content-disposition; fallback a nombre genérico.
      const match = disposition.match(/filename\*?=(?:UTF-8'')?["]?([^";]+)["]?/i)
      const filename = match?.[1] ?? "Siprecom-Setup.exe"

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.")
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-50 p-3">
          <MonitorDown className="h-8 w-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">App de escritorio</h1>
          <p className="text-sm text-muted-foreground">
            Aplicación para Windows para carga masiva de planillas escaneadas.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <FeatureCard
          icon={<Zap className="h-5 w-5" />}
          title="Batch de carpetas enteras"
          desc="Arrastrás una carpeta con cientos de escaneos y la app los procesa uno a uno."
        />
        <FeatureCard
          icon={<WifiOff className="h-5 w-5" />}
          title="Trabajo offline"
          desc="Escaneás sin conexión y sincroniza cuando vuelve internet."
        />
        <FeatureCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Detección local de firma"
          desc="Verifica que la planilla esté firmada antes de subirla al servidor."
        />
      </div>

      <div className="rounded-xl border bg-white p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-800">Descargar instalador</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Se instala una sola vez. Las actualizaciones son automáticas al arrancar la app.
          </p>
        </div>

        <Button
          size="lg"
          className="gap-2"
          onClick={() => void descargar()}
          disabled={descargando}
        >
          {descargando ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparando descarga...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Descargar Setup.exe (Windows)
            </>
          )}
        </Button>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <ol className="text-sm text-gray-700 space-y-1 list-decimal pl-5">
          <li>Descargá el <span className="font-mono text-xs">.exe</span>.</li>
          <li>Ejecutalo — se instala en tu perfil de usuario (no requiere admin).</li>
          <li>Iniciá sesión con el mismo email/contraseña que usás acá.</li>
          <li>A partir de ahí, la app se actualiza sola en cada arranque.</li>
        </ol>

        <div className="border-t pt-4 text-xs text-muted-foreground">
          Requisitos: Windows 10 o 11 · .NET 8 Runtime (se instala automáticamente si falta).
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="rounded-xl border bg-white p-4 space-y-1.5">
      <div className="text-blue-600">{icon}</div>
      <p className="text-sm font-medium text-gray-800">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  )
}
