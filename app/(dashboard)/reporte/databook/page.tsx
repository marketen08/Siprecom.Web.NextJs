"use client"

import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, BookText, Loader2, Sparkles } from "lucide-react"

import { useSolicitarDatabook } from "@/features/databook/api/use-databook"

import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetNivelesUsadosSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetEspecialidadesUsadas } from "@/features/especialidades/api/use-especialidades"

import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const ALL = "__all__"

function DatabookFormContent() {
  const router = useRouter()
  const sp = useSearchParams()

  // Pre-cargar desde URL (atajo desde /alcance/subsistemas).
  const sistemaIdInicial      = sp.get("sistemaId")      ?? ""
  const subSistemaIdInicial   = sp.get("subSistemaId")   ?? ""

  const [sistemaId, setSistemaId]           = useState<string>(sistemaIdInicial)
  const [subSistemaId, setSubSistemaId]     = useState<string>(subSistemaIdInicial)
  const [nivelId, setNivelId]               = useState<string>("")
  const [especialidadId, setEspecialidadId] = useState<string>("")
  const [notificarEmail, setNotificarEmail] = useState(false)
  const [formError, setFormError]           = useState<string | null>(null)

  // Catálogos.
  const sistemas         = useGetSistemasSelect().data?.data ?? []
  const todosSubsistemas = useGetSubSistemasSelect().data?.data ?? []
  const niveles =
    (useGetNivelesUsadosSelect().data as
      | { data?: Array<{ id: string; nombre: string; posicion?: number }> }
      | Array<{ id: string; nombre: string; posicion?: number }>
      | undefined)
  const especialidadesData = useGetEspecialidadesUsadas().data?.data ?? []

  const nivelesOrdenados = useMemo(() => {
    const arr = Array.isArray(niveles)
      ? niveles
      : niveles?.data ?? []
    return [...arr].sort((a, b) => (a.posicion ?? 0) - (b.posicion ?? 0))
  }, [niveles])

  // Subsistemas del sistema elegido. Si no hay sistema, mostramos todos.
  const subsistemasVisibles = useMemo(() => {
    if (!sistemaId) return todosSubsistemas
    return todosSubsistemas.filter((s) => s.sistemaId === sistemaId)
  }, [todosSubsistemas, sistemaId])

  const solicitar = useSolicitarDatabook()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!subSistemaId) {
      setFormError("Tenés que elegir un SubSistema.")
      return
    }

    try {
      await solicitar.mutateAsync({
        subSistemaId,
        nivelId:          nivelId        || null,
        especialidadId:   especialidadId || null,
        notificarPorEmail: notificarEmail,
      })
      // Una vez encolado, llevamos al historial — desde ahí ve el progreso.
      router.push("/reporte/databook/historial")
    } catch (err) {
      setFormError((err as Error).message)
    }
  }

  const subSel = todosSubsistemas.find((s) => s.id === subSistemaId)

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generar Databook</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Genera un PDF compuesto por la carátula, el listado índice y los registros
            completados del SubSistema seleccionado. Como puede tardar varios minutos,
            la generación se hace en segundo plano — te avisamos cuando esté listo.
          </p>
        </div>
        <Link
          href="/reporte/databook/historial"
          className="text-sm text-blue-700 hover:underline whitespace-nowrap flex items-center gap-1.5"
        >
          Mis databooks <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">

        {/* Sistema */}
        <div className="space-y-1.5">
          <Label>Sistema</Label>
          <Select
            value={sistemaId || ALL}
            onValueChange={(v) => {
              const id = !v || v === ALL ? "" : v
              setSistemaId(id)
              // Si el subsistema actual no pertenece al nuevo sistema, lo limpiamos.
              if (id && subSistemaId) {
                const ss = todosSubsistemas.find((s) => s.id === subSistemaId)
                if (ss?.sistemaId !== id) setSubSistemaId("")
              }
            }}
          >
            <SelectTrigger>
              <SelectValue>
                {sistemaId
                  ? sistemas.find((s) => s.id === sistemaId)?.nombre ?? "—"
                  : "Todos los sistemas"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los sistemas</SelectItem>
              {sistemas.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.codigo} — {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Solo se usa para filtrar la lista de subsistemas abajo.
          </p>
        </div>

        {/* SubSistema (requerido) */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            SubSistema <span className="text-red-600">*</span>
          </Label>
          <Select
            value={subSistemaId || ""}
            onValueChange={(v) => setSubSistemaId(v ?? "")}
            disabled={subsistemasVisibles.length === 0}
          >
            <SelectTrigger>
              <SelectValue>
                {subSel
                  ? `${subSel.codigo} — ${subSel.nombre}`
                  : "Seleccioná un subsistema"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {subsistemasVisibles.map((ss) => (
                <SelectItem key={ss.id} value={ss.id}>
                  {ss.codigo} — {ss.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Nivel (opcional) */}
        <div className="space-y-1.5">
          <Label>Nivel</Label>
          <Select
            value={nivelId || ALL}
            onValueChange={(v) => setNivelId(!v || v === ALL ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue>
                {nivelId
                  ? nivelesOrdenados.find((n) => n.id === nivelId)?.nombre ?? "—"
                  : "Todos los niveles"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los niveles</SelectItem>
              {nivelesOrdenados.map((n) => (
                <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Opcional. Si elegís uno, el databook incluye solo los registros de ese nivel.
          </p>
        </div>

        {/* Especialidad (opcional) */}
        <div className="space-y-1.5">
          <Label>Especialidad</Label>
          <Select
            value={especialidadId || ALL}
            onValueChange={(v) => setEspecialidadId(!v || v === ALL ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue>
                {especialidadId
                  ? especialidadesData.find((e) => e.id === especialidadId)?.nombre ?? "—"
                  : "Todas las especialidades"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las especialidades</SelectItem>
              {especialidadesData.map((esp) => (
                <SelectItem key={esp.id} value={esp.id}>
                  {esp.codigo ? `${esp.codigo} — ${esp.nombre}` : esp.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Opcional. Acota a una sola disciplina dentro del subsistema.
          </p>
        </div>

        {/* Notificación por email */}
        <div className="flex items-start gap-3 pt-2">
          <input
            id="notif"
            type="checkbox"
            checked={notificarEmail}
            onChange={(e) => setNotificarEmail(e.target.checked)}
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-700 focus:ring-blue-700"
          />
          <div className="grid gap-1">
            <Label htmlFor="notif" className="font-normal cursor-pointer">
              Avisarme por email cuando esté listo
            </Label>
            <p className="text-xs text-muted-foreground">
              Recibirás un correo con el link de descarga al terminar la generación.
            </p>
          </div>
        </div>

        {formError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <Button
            type="submit"
            disabled={solicitar.isPending || !subSistemaId}
            className="bg-blue-900 hover:bg-blue-800 gap-2"
          >
            {solicitar.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Sparkles className="h-4 w-4" />}
            {solicitar.isPending ? "Encolando..." : "Generar Databook"}
          </Button>
          <Link
            href="/reporte/databook/historial"
            className="text-sm text-muted-foreground hover:text-gray-900 flex items-center gap-1.5"
          >
            <BookText className="h-4 w-4" /> Ver mis databooks
          </Link>
        </div>
      </form>

      <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4 text-sm text-blue-900 space-y-1.5">
        <div className="font-semibold">¿Qué incluye el databook?</div>
        <ul className="list-disc list-inside text-blue-800 space-y-0.5 text-[13px]">
          <li>Carátula con el subsistema, filtros y KPIs de avance.</li>
          <li>Listado índice de todas las tareas (Nivel → Sistema → SubSistema → Especialidad → Elemento).</li>
          <li>El PDF oficial firmado de cada registro completado.</li>
          <li>Adjuntos de cada registro (PDFs e imágenes en JPG/PNG/TIFF/BMP).</li>
        </ul>
      </div>
    </div>
  )
}

export default function DatabookPage() {
  return (
    <Suspense>
      <DatabookFormContent />
    </Suspense>
  )
}
