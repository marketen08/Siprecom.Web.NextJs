"use client"

import { use, useState } from "react"
import {
  ShieldCheck,
  Loader2,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  XCircle,
  Hash,
} from "lucide-react"

import { useGetVerificacion } from "@/features/registros/api/use-get-verificacion"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useBreadcrumb } from "@/components/breadcrumb-context"

interface PageProps {
  params: Promise<{ registroId: string }>
}

export default function VerificarRegistroPage({ params }: PageProps) {
  const { registroId } = use(params)
  const { data, isLoading, isError } = useGetVerificacion(registroId)
  const [copiado, setCopiado] = useState(false)

  const verificacion = data?.data

  useBreadcrumb([
    { label: "Verificación" },
    { label: registroId.slice(0, 8) + "…" },
  ])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando verificación...
      </div>
    )
  }

  if (isError || !verificacion) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">No se pudo cargar la verificación</p>
            <p className="text-xs text-red-700 mt-1">
              El registro no existe o no es accesible. Verificá que el código QR esté completo.
            </p>
          </div>
        </div>
      </div>
    )
  }

  async function handleCopyHash() {
    if (!verificacion?.pdfHashSha256) return
    await navigator.clipboard.writeText(verificacion.pdfHashSha256)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3 pb-1">
        <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Verificación de registro</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Compará el hash SHA256 del PDF que recibiste con el oficial vigente abajo.
          </p>
        </div>
      </div>

      {/* Estado */}
      <EstadoBanner estado={verificacion.estado} />

      {/* Datos del registro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del registro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Planilla" value={
            verificacion.planillaCodigo
              ? `${verificacion.planillaCodigo} — ${verificacion.planillaNombre ?? ""}`
              : verificacion.planillaNombre
          } />
          {verificacion.planillaVersion && (
            <Row label="Versión planilla" value={verificacion.planillaVersion} />
          )}
          <Row label="Proyecto" value={verificacion.proyectoNombre} />
          <Row label="Elemento" value={verificacion.elementoNombre} />
          <Row label="Tarea" value={verificacion.tareaNombre} />
          <Row label="Fecha terminado" value={formatDate(verificacion.fechaTerminado)} />
          {verificacion.fechaFirma && (
            <Row label="Última firma" value={formatDateTime(verificacion.fechaFirma)} />
          )}
          <Row label="Registro ID" value={<code className="text-xs font-mono">{verificacion.registroId}</code>} />
        </CardContent>
      </Card>

      {/* Firmas */}
      {verificacion.firmas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Firmantes</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left font-medium py-2">Rol</th>
                  <th className="text-left font-medium py-2">Nombre</th>
                  <th className="text-left font-medium py-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {verificacion.firmas.map((f, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 font-medium">{f.rol}</td>
                    <td className="py-2">{f.nombreFirmante}</td>
                    <td className="py-2 text-muted-foreground">{formatDateTime(f.fechaFirma)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Hash + descarga */}
      <Card className="border-blue-200 bg-blue-50/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="h-4 w-4 text-blue-700" />
            Hash de integridad SHA256
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {verificacion.pdfHashSha256 ? (
            <>
              <div className="rounded-md bg-white border p-3">
                <code className="text-xs font-mono break-all text-gray-800">
                  {verificacion.pdfHashSha256}
                </code>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopyHash}>
                  {copiado ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiado ? "Copiado" : "Copiar hash"}
                </Button>

                {verificacion.pdfDisponible && (
                  <a
                    href={`/api/registros/${verificacion.registroId}/pdf-oficial`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" className="gap-1.5">
                      <Download className="h-3.5 w-3.5" />
                      Descargar PDF oficial
                    </Button>
                  </a>
                )}
              </div>

              {verificacion.pdfGeneradoEn && (
                <p className="text-xs text-muted-foreground">
                  PDF oficial generado el {formatDateTime(verificacion.pdfGeneradoEn)}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              El PDF oficial todavía no fue generado para este registro.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cómo verificar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <p>
            Para confirmar que el PDF que tenés es el oficial vigente, calculá su hash SHA256 y
            compará con el de arriba.
          </p>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-600">En Linux / macOS:</p>
            <code className="block text-xs bg-gray-100 rounded p-2 font-mono">
              sha256sum nombre-del-archivo.pdf
            </code>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-600">En Windows (PowerShell):</p>
            <code className="block text-xs bg-gray-100 rounded p-2 font-mono">
              Get-FileHash -Algorithm SHA256 nombre-del-archivo.pdf
            </code>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <strong>Si los hashes no coinciden:</strong> el PDF que tenés podría ser una versión
            anterior (cada nueva firma regenera el PDF) o haber sido modificado. Descargá el PDF
            oficial vigente desde el botón de arriba para tener la versión actual.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode | null | undefined }) {
  if (value == null || value === "") return null
  return (
    <div className="flex gap-3 py-0.5">
      <span className="text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  )
}

function EstadoBanner({ estado }: { estado: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    COMPLETADO: { label: "Completado · pendiente de firmas", cls: "bg-amber-50 border-amber-200 text-amber-900", icon: <Clock className="h-4 w-4" /> },
    FIRMADO:    { label: "Firmado",                          cls: "bg-blue-50 border-blue-200 text-blue-900",     icon: <CheckCircle2 className="h-4 w-4" /> },
    APROBADO:   { label: "Aprobado",                         cls: "bg-green-50 border-green-200 text-green-900",  icon: <CheckCircle2 className="h-4 w-4" /> },
    RECHAZADO:  { label: "Rechazado",                        cls: "bg-red-50 border-red-200 text-red-900",        icon: <XCircle className="h-4 w-4" /> },
  }
  const m = map[estado] ?? { label: estado, cls: "bg-gray-50 border-gray-200 text-gray-800", icon: <Clock className="h-4 w-4" /> }

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${m.cls}`}>
      {m.icon}
      <span className="text-sm font-medium">{m.label}</span>
    </div>
  )
}

function formatDate(iso?: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatDateTime(iso?: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}
