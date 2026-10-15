"use client"

import { useState } from "react"
import Link from "next/link"
import { ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useCanWrite } from "@/lib/use-roles"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"

import { useNoConformidadesDePendiente } from "../api/use-no-conformidades"
import { NC_ESTADO_COLOR, NC_ESTADO_LABEL } from "../types"
import { NewNoConformidadSheet } from "./new-nc-sheet"

interface Props {
  pendienteId: string
  /** Se heredan al informe para no recargarlos a mano. */
  descripcion?: string | null
  subSistemaId?: string | null
  elementoId?: string | null
  especialidadId?: string | null
}

/**
 * Puente entre Pendientes y Calidad: muestra los informes ya generados a partir
 * de este pendiente y permite escalarlo a uno nuevo.
 *
 * Un pendiente se cierra arreglando la cosa; una No Conformidad se cierra
 * probando que el problema no se repite. Escalar es para cuando el hallazgo
 * excede al ítem puntual — por ejemplo, cuando se repite.
 *
 * Todo el panel se oculta si el proyecto no tiene habilitado el módulo de
 * Calidad: sin el flag, los endpoints devuelven 400 y ofrecer el botón seria
 * prometer algo que no funciona.
 */
export function PendienteCalidadPanel({
  pendienteId,
  descripcion,
  subSistemaId,
  elementoId,
  especialidadId,
}: Props) {
  const canWrite = useCanWrite()
  const { data: perfil } = useGetPerfil()
  const { data: proyectoRaw } = useGetProyecto(perfil?.proyectoId ?? null)
  const moduloHabilitado =
    proyectoRaw?.data?.funcionalidadesEfectivas?.CALIDAD_NO_CONFORMIDADES === true

  const { data } = useNoConformidadesDePendiente(moduloHabilitado ? pendienteId : null)
  const [abierto, setAbierto] = useState(false)

  if (!moduloHabilitado) return null

  const informes = data?.data ?? []

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <ShieldAlert className="h-4 w-4" />
          Calidad
        </h3>
        {canWrite && (
          <Button size="sm" variant="outline" onClick={() => setAbierto(true)}>
            Escalar a No Conformidad
          </Button>
        )}
      </div>

      {informes.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Sin informes de calidad asociados.
        </p>
      ) : (
        <ul className="space-y-1">
          {informes.map((nc) => (
            <li
              key={nc.id}
              className="flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
            >
              <Link
                href={`/calidad/no-conformidades/${nc.id}`}
                className="font-mono text-xs font-semibold text-blue-700 hover:underline"
              >
                {nc.codigoFormateado}
              </Link>
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                  NC_ESTADO_COLOR[nc.estadoNombre] ?? ""
                }`}
              >
                {NC_ESTADO_LABEL[nc.estadoNombre] ?? nc.estadoNombre}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {nc.titulo}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Se monta solo cuando se abre: sino el sheet dispara los fetch de sus
          catálogos en cada pendiente que se abra, aunque nadie vaya a escalar. */}
      {abierto && (
        <NewNoConformidadSheet
          open={abierto}
          onOpenChange={setAbierto}
          pendienteOrigenId={pendienteId}
          defaults={{
            subSistemaId: subSistemaId ?? undefined,
            elementoId: elementoId ?? undefined,
            especialidadId: especialidadId ?? undefined,
            descripcion: descripcion ?? undefined,
          }}
          onCreada={() => setAbierto(false)}
        />
      )}
    </section>
  )
}
