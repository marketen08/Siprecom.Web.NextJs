"use client"

import { useState } from "react"
import Link from "next/link"
import {
  PenLine, Loader2, CheckCircle2, ChevronLeft, ChevronRight,
  Tag, Layers, FileImage, Eye,
} from "lucide-react"

import { useGetMisFirmas, type MisFirmasModo } from "@/features/registros/api/use-get-mis-firmas"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { Button, buttonVariants } from "@/components/ui/button"

const PAGE_SIZE = 20

export default function MisFirmasPage() {
  const [page, setPage] = useState(1)
  const [modo, setModo] = useState<MisFirmasModo>("pendientes")
  const { data: perfil } = useGetPerfil()
  const proyectoId = perfil?.proyectoId

  const { data, isLoading, isFetching } = useGetMisFirmas({
    proyectoId,
    page,
    pageSize: PAGE_SIZE,
    modo,
  })

  function handleModo(nuevoModo: MisFirmasModo) {
    if (modo === nuevoModo) return
    setModo(nuevoModo)
    setPage(1)
  }

  const items = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis firmas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {modo === "pendientes"
            ? "Registros pendientes de firma según tus roles asignados"
            : "Registros que ya firmaste en este proyecto"}
        </p>
      </div>

      {/* Toggle Pendientes / Firmados por mí */}
      <div className="inline-flex gap-1 p-1 rounded-lg bg-gray-100">
        <button
          onClick={() => handleModo("pendientes")}
          className={`text-sm px-4 py-1.5 rounded-md font-medium transition-colors ${
            modo === "pendientes"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Pendientes
        </button>
        <button
          onClick={() => handleModo("firmados")}
          className={`text-sm px-4 py-1.5 rounded-md font-medium transition-colors ${
            modo === "firmados"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Firmados por mí
        </button>
      </div>

      {/* Contenido */}
      {!proyectoId ? (
        <div className="rounded-lg border border-dashed bg-gray-50 p-10 text-center text-sm text-muted-foreground">
          No tenés un proyecto activo asignado.
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-10">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
        </div>
      ) : items.length === 0 ? (
        modo === "pendientes" ? (
          <div className="rounded-lg border bg-white p-10 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
            <p className="font-medium text-gray-700">Todo al día</p>
            <p className="text-sm text-muted-foreground">No tenés registros pendientes de firma.</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-white p-10 text-center space-y-2">
            <PenLine className="h-10 w-10 text-gray-400 mx-auto" />
            <p className="font-medium text-gray-700">Sin firmas aún</p>
            <p className="text-sm text-muted-foreground">Todavía no firmaste ningún registro en este proyecto.</p>
          </div>
        )
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} registro{total !== 1 ? "s" : ""}
            {modo === "pendientes" ? " pendiente" : " firmado"}{total !== 1 ? "s" : ""}
            {isFetching && !isLoading && <span className="ml-2 text-xs">(actualizando...)</span>}
          </p>

          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.registroId}
                className="rounded-lg border bg-white px-4 py-4 space-y-3 hover:shadow-sm transition-shadow"
              >
                {/* Fila superior: info + estado físico */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900">
                        {item.elementoNombre}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Tag className="h-3 w-3" />{item.elementoTag}
                      </span>
                      {item.esFisico && (
                        <span className="inline-flex items-center gap-1 text-xs bg-orange-50 text-orange-600 border border-orange-200 rounded px-1.5 py-0.5 font-medium">
                          <FileImage className="h-3 w-3" />
                          Físico
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.tareaNombre}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Layers className="h-3 w-3 shrink-0" />
                      <span>{item.subsistemaNombre}</span>
                      {modo === "pendientes" && item.fechaTerminado && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span>Completado {new Date(item.fechaTerminado).toLocaleDateString("es-AR")}</span>
                        </>
                      )}
                      {modo === "firmados" && item.fechaFirma && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span>Firmado {new Date(item.fechaFirma).toLocaleDateString("es-AR")}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fila inferior: roles + botón */}
                <div className="flex items-end justify-between gap-3">
                  <div className="flex flex-wrap gap-1 flex-1">
                    {item.slotsParaFirmar.map(rol => (
                      <span
                        key={rol}
                        className={`inline-flex items-center gap-1 text-xs border rounded px-1.5 py-0.5 ${
                          modo === "pendientes"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-green-50 text-green-700 border-green-200"
                        }`}
                      >
                        {modo === "pendientes" ? <PenLine className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                        {rol}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/ejecucion/registros/${item.registroId}`}
                    className={buttonVariants({ size: "sm", variant: modo === "pendientes" ? "default" : "outline" }) + " shrink-0 whitespace-nowrap gap-1.5"}
                  >
                    {modo === "pendientes" ? (
                      <>
                        <PenLine className="h-4 w-4" />
                        Ir a firmar
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        Ver registro
                      </>
                    )}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
