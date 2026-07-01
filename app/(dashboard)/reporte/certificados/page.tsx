"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, Award, Download, Loader2 } from "lucide-react"

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
      <TableCell><Celda cat={fila.rfc} tipo={TIPO_CERTIFICADO.RFC} subSistemaId={fila.subSistemaId} /></TableCell>
      <TableCell><Celda cat={fila.rfsu} tipo={TIPO_CERTIFICADO.RFSU} subSistemaId={fila.subSistemaId} /></TableCell>
      <TableCell><Celda cat={fila.aoc} tipo={TIPO_CERTIFICADO.AOC} subSistemaId={fila.subSistemaId} /></TableCell>
    </TableRow>
  )
}

function Celda({
  cat, tipo, subSistemaId,
}: {
  cat: CategoriaEstado; tipo: TipoCertificado; subSistemaId: string
}) {
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

  // Pendiente
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
    </div>
  )
}
