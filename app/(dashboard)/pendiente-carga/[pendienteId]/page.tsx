"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"

import { useGetPendiente } from "@/features/pendientes/api/use-get-pendiente"
import { PendienteCargaFisicaUploader } from "@/features/pendientes/components/pendiente-carga-fisica-uploader"
import { PENDIENTE_ESTADO_IDS } from "@/features/pendientes/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

/**
 * Entry-point que se abre al escanear el QR del PDF del pendiente. Sirve como
 * "atajo" al uploader de carga física — sin necesidad de abrir el sheet del
 * detalle. Comparte el mismo componente que el botón del detalle.
 */
export default function PendienteCargaPage({
  params,
}: {
  params: Promise<{ pendienteId: string }>
}) {
  const { pendienteId } = use(params)
  const { data, isLoading } = useGetPendiente(pendienteId)
  const p = data?.data

  const yaTerminal = p?.estadoId === PENDIENTE_ESTADO_IDS.CERRADO
    || p?.estadoId === PENDIENTE_ESTADO_IDS.CANCELADO

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href="/ejecucion/pendientes">
            <ArrowLeft className="h-4 w-4" /> Volver a Pendientes
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando pendiente…
        </Card>
      ) : !p ? (
        <Card className="p-8 text-center text-destructive">
          Pendiente no encontrado o pertenece a otro proyecto.
        </Card>
      ) : (
        <>
          <Card className="p-4 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-blue-700 font-bold text-lg">{p.codigoFormateado}</span>
              <span className="text-sm text-gray-700">· {p.categoriaNombre} · {p.tipoNombre}</span>
            </div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{p.descripcion}</p>
          </Card>

          {yaTerminal ? (
            <Card className="p-6 text-center bg-amber-50 border-amber-200 text-amber-900">
              Este pendiente ya está en estado terminal (<strong>{p.estadoNombre}</strong>).
              No se puede cargar PDF físico.
            </Card>
          ) : (
            <Card className="p-4">
              <PendienteCargaFisicaUploader
                pendienteId={p.id}
                codigoFormateado={p.codigoFormateado}
              />
            </Card>
          )}
        </>
      )}
    </div>
  )
}
