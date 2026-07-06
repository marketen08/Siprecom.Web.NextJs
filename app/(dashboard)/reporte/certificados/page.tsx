"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, Award, CheckCircle2, Download, Info, Loader2 } from "lucide-react"

import {
  useEmitirCertificado, useGetCertificadosEstado, useRevocarCertificado,
} from "@/features/certificados/api/use-certificados"
import {
  TIPO_CERTIFICADO, TIPO_CERTIFICADO_LABEL,
  type CategoriaEstado, type SubsistemaCertificadoEstado, type TipoCertificado,
} from "@/features/certificados/types"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const ALL = "__all__"

export default function CertificadosPage() {
  const [sistemaId, setSistemaId] = useState<string>(ALL)
  const [subSistemaId, setSubSistemaId] = useState<string>(ALL)

  const { data, isLoading } = useGetCertificadosEstado({
    sistemaId: sistemaId === ALL ? undefined : sistemaId,
    subSistemaId: subSistemaId === ALL ? undefined : subSistemaId,
  })

  const { data: sistemasData } = useGetSistemasSelect()
  const sistemas = sistemasData?.data ?? []
  const { data: subsData } = useGetSubSistemasSelect()
  // Si hay sistema seleccionado, mostramos solo sus subsistemas.
  const subs = (subsData?.data ?? []).filter((s) => sistemaId === ALL || s.sistemaId === sistemaId)

  const filas = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Award className="h-5 w-5 text-blue-700" />
        <h1 className="text-lg font-semibold">Certificados por subsistema</h1>
      </div>

      <p className="text-sm text-muted-foreground max-w-4xl">
        Cada subsistema puede emitir 3 certificados que consumen los paquetes de prueba de su
        alcance: <strong>RFC</strong> (Pressure Test Packs), <strong>RFSU</strong> (Basic Function FTS)
        y <strong>AOC</strong> (Basic Function OTS). Un certificado solo se puede emitir cuando el
        100% de los packs de esa categoría están terminales, y "cierra" los packs — para modificarlos
        hay que revocarlo primero.
      </p>

      {/* Banner OPERCOM — cuando alguno de los gates opcionales está activo, avisamos
          qué se está validando extra. Toma los flags del primer resultado (son iguales
          para todo el proyecto). */}
      {filas.length > 0 && (
        filas[0].validarNivelActivo
        || filas[0].validarPendientesAActivo
        || filas[0].validarPendientesBActivo
      ) && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 flex items-start gap-2 text-sm text-blue-900">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-700" />
          <div className="flex-1 space-y-0.5">
            <div className="font-medium">Validaciones habilitadas para este proyecto</div>
            <ul className="text-xs list-disc pl-4 space-y-0.5">
              {filas[0].validarNivelActivo && (
                <li>Emisión bloqueada si quedan tareas del nivel del certificado sin completar en el subsistema.</li>
              )}
              {filas[0].validarPendientesAActivo && (
                <li>Emisión bloqueada si el subsistema tiene pendientes <strong>categoría A</strong> sin cerrar.</li>
              )}
              {filas[0].validarPendientesBActivo && (
                <li>Emisión bloqueada si el subsistema tiene pendientes <strong>categoría B</strong> sin cerrar.</li>
              )}
              <li className="text-blue-800/80">Los pendientes categoría C nunca bloquean.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={sistemaId} onValueChange={(v) => { setSistemaId(v ?? ALL); setSubSistemaId(ALL) }}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Todos los sistemas">
              {(() => {
                if (sistemaId === ALL) return "Todos los sistemas"
                const s = sistemas.find((x) => x.id === sistemaId)
                return s ? `${s.codigo} — ${s.nombre}` : "Todos los sistemas"
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los sistemas</SelectItem>
            {sistemas.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={subSistemaId} onValueChange={(v) => setSubSistemaId(v ?? ALL)}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Todos los subsistemas">
              {(() => {
                if (subSistemaId === ALL) return "Todos los subsistemas"
                const s = subs.find((x) => x.id === subSistemaId)
                return s ? `${s.codigo} — ${s.nombre}` : "Todos los subsistemas"
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los subsistemas</SelectItem>
            {subs.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grilla */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Sistema</TableHead>
              <TableHead className="w-48">Subsistema</TableHead>
              <TableHead>RFC · Pressure</TableHead>
              <TableHead>RFSU · BF FTS</TableHead>
              <TableHead>AOC · BF OTS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin mr-1" /> Cargando…
                </TableCell>
              </TableRow>
            ) : filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Sin subsistemas que cumplan el filtro.
                </TableCell>
              </TableRow>
            ) : (
              filas.map((fila) => <Fila key={fila.subSistemaId} fila={fila} />)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function Fila({ fila }: { fila: SubsistemaCertificadoEstado }) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {fila.sistemaCodigo ?? "—"}
      </TableCell>
      <TableCell>
        <div className="font-mono text-sm font-medium">{fila.subSistemaCodigo}</div>
        <div className="text-xs text-muted-foreground line-clamp-1">{fila.subSistemaNombre}</div>
      </TableCell>
      <TableCell><Celda cat={fila.rfc} tipo={TIPO_CERTIFICADO.RFC} fila={fila} /></TableCell>
      <TableCell><Celda cat={fila.rfsu} tipo={TIPO_CERTIFICADO.RFSU} fila={fila} /></TableCell>
      <TableCell><Celda cat={fila.aoc} tipo={TIPO_CERTIFICADO.AOC} fila={fila} /></TableCell>
    </TableRow>
  )
}

function Celda({
  cat, tipo, fila,
}: {
  cat: CategoriaEstado; tipo: TipoCertificado; fila: SubsistemaCertificadoEstado
}) {
  const subSistemaId = fila.subSistemaId
  const emitir = useEmitirCertificado()
  const revocar = useRevocarCertificado()

  if (cat.noAplica) {
    return <span className="text-xs text-muted-foreground italic">n/a</span>
  }

  if (cat.emitido) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 text-[10px] gap-1">
            <Award className="h-3 w-3" /> Emitido
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            {new Date(cat.emitido.emitidoEn).toLocaleDateString("es-AR")}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          por {cat.emitido.emitidoPorNombre ?? "—"}
        </div>
        <div className="flex items-center gap-2">
          {cat.emitido.pdfUrl && (
            <Button asChild variant="outline" size="sm" className="h-7 gap-1 text-xs">
              <a href={cat.emitido.pdfUrl} download={`certificado-${TIPO_CERTIFICADO_LABEL[tipo]}.pdf`}>
                <Download className="h-3 w-3" /> PDF
              </a>
            </Button>
          )}
          <ConfirmActionDialog
            trigger={<span className="text-xs text-red-700">Revocar</span>}
            triggerClassName="inline-flex items-center h-7 px-2 rounded-md hover:bg-red-50 transition-colors"
            title={`¿Revocar el ${TIPO_CERTIFICADO_LABEL[tipo]}?`}
            description={
              <>
                Los paquetes de prueba de esta categoría vuelven a permitir cambios.
                El PDF emitido queda como historial pero deja de aparecer como activo.
                Es obligatorio dejar un motivo (por defecto: "Revocado desde grilla").
              </>
            }
            confirmText="Revocar"
            pendingText="Revocando..."
            variant="destructive"
            onConfirm={() =>
              revocar.mutateAsync({ id: cat.emitido!.id, motivo: "Revocado desde grilla" })
            }
          />
        </div>
      </div>
    )
  }

  if (cat.listoParaEmitir) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 text-[10px]">
            Listo
          </Badge>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {cat.cantidadPacksTerminales}/{cat.cantidadPacks} · 100%
          </span>
        </div>
        <ConfirmActionDialog
          trigger={
            <span className="inline-flex items-center gap-1 text-xs font-medium">
              <Award className="h-3 w-3" /> Emitir {TIPO_CERTIFICADO_LABEL[tipo]}
            </span>
          }
          triggerClassName="inline-flex items-center h-7 px-2 rounded-md bg-blue-900 text-white hover:bg-blue-800 transition-colors"
          title={`¿Emitir certificado ${TIPO_CERTIFICADO_LABEL[tipo]}?`}
          description={
            <>
              Al emitir, los {cat.cantidadPacks} paquete(s) incluidos quedan cerrados
              a cambios. Para modificarlos hay que revocar el certificado primero.
              Se genera un PDF con la firma electrónica del usuario emisor.
            </>
          }
          confirmText="Emitir"
          pendingText="Emitiendo..."
          onConfirm={() =>
            emitir.mutateAsync({
              subSistemaId,
              tipo,
              comentarios: undefined,
            })
          }
        />
      </div>
    )
  }

  // Pendiente / bloqueado por gates OPERCOM
  const packsOk = cat.cantidadPacks > 0 && cat.cantidadPacksTerminales === cat.cantidadPacks
  const nivelBlock = fila.validarNivelActivo && cat.nivelInferible && cat.tareasNivelTotal > 0 && !cat.tareasNivelListas
  const pendBlockA = fila.validarPendientesAActivo && fila.pendientesAbiertosA > 0
  const pendBlockB = fila.validarPendientesBActivo && fila.pendientesAbiertosB > 0
  const pendBlock = pendBlockA || pendBlockB
  // Casos "gate activo pero no aplica" — la UI los expone para no engañar al usuario.
  const nivelNoInferible = fila.validarNivelActivo && cat.cantidadPacks > 0 && !cat.nivelInferible
  const nivelSinTareas = fila.validarNivelActivo && cat.nivelInferible && cat.tareasNivelTotal === 0
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="border-gray-300 text-gray-700 bg-gray-50 text-[10px]">
          {cat.cantidadPacks === 0 ? "Sin packs" : "En progreso"}
        </Badge>
        {cat.cantidadPacks > 0 && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {cat.cantidadPacksTerminales}/{cat.cantidadPacks} · {cat.porcentajeAvance}%
          </span>
        )}
      </div>
      {cat.cantidadPacks > 0 && (
        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full bg-blue-600"
            style={{ width: `${Math.min(100, cat.porcentajeAvance)}%` }}
          />
        </div>
      )}
      {cat.cantidadPacks === 0 && (
        <div className="text-[11px] text-muted-foreground italic">
          No hay packs de esta categoría en el subsistema.
        </div>
      )}
      {/* Cuando los packs están al 100% pero un gate OPERCOM bloquea, mostramos
          la razón concreta con badge ámbar. */}
      {packsOk && (nivelBlock || pendBlock) && (
        <div className="text-[11px] space-y-0.5 pt-0.5">
          {nivelBlock && (
            <div className="flex items-center gap-1 text-amber-800">
              <AlertTriangle className="h-3 w-3" />
              <span className="tabular-nums">
                Tareas nivel: {cat.tareasNivelCompletas}/{cat.tareasNivelTotal}
              </span>
            </div>
          )}
          {pendBlockA && (
            <div className="flex items-center gap-1 text-amber-800">
              <AlertTriangle className="h-3 w-3" />
              <span>{fila.pendientesAbiertosA} pendiente(s) A sin cerrar</span>
            </div>
          )}
          {pendBlockB && (
            <div className="flex items-center gap-1 text-amber-800">
              <AlertTriangle className="h-3 w-3" />
              <span>{fila.pendientesAbiertosB} pendiente(s) B sin cerrar</span>
            </div>
          )}
        </div>
      )}
      {/* Info neutra: nivel OK con datos que aporten contexto. */}
      {packsOk && !nivelBlock && !pendBlock && cat.tareasNivelTotal > 0 && cat.tareasNivelListas && (
        <div className="flex items-center gap-1 text-[11px] text-emerald-700 pt-0.5">
          <CheckCircle2 className="h-3 w-3" />
          <span className="tabular-nums">Tareas nivel: {cat.tareasNivelCompletas}/{cat.tareasNivelTotal}</span>
        </div>
      )}
      {/* Transparencia: flag activo pero el gate por nivel no aplica. */}
      {packsOk && !nivelBlock && !pendBlock && nivelNoInferible && (
        <div
          className="flex items-start gap-1 text-[11px] text-amber-700 pt-0.5"
          title="Las tareas del catálogo asociadas a los packs no tienen Nivel asignado. La validación por nivel no se aplica — configurá los NivelIds del catálogo para activarla."
        >
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>Nivel no configurado en el catálogo — no se valida por nivel.</span>
        </div>
      )}
      {packsOk && !nivelBlock && !pendBlock && nivelSinTareas && (
        <div
          className="flex items-start gap-1 text-[11px] text-slate-600 pt-0.5"
          title="El subsistema no tiene ElementoTareas individuales del nivel de estos packs. La validación se resuelve solo con los packs."
        >
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>Sin tareas individuales del nivel — solo se valida por packs.</span>
        </div>
      )}
    </div>
  )
}
