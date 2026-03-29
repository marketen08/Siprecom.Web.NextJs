"use client"

import { useState } from "react"
import { X, Plus, FolderOpen, Check } from "lucide-react"

import { useGetUsuarioProyectos } from "../api/use-get-usuario-proyectos"
import { useAddProyectoUsuario } from "../api/use-add-proyecto-usuario"
import { useRemoveProyectoUsuario } from "../api/use-remove-proyecto-usuario"
import { useGetProyectosSelect } from "@/features/proyectos/api/use-get-proyectos-select"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Props {
  usuarioId: string
}

export function UsuarioProyectosPanel({ usuarioId }: Props) {
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState("")

  const { data: proyectosAsignados, isLoading } = useGetUsuarioProyectos(usuarioId)
  const { data: todosProyectosData } = useGetProyectosSelect()
  const addMutation = useAddProyectoUsuario(usuarioId)
  const removeMutation = useRemoveProyectoUsuario(usuarioId)

  const asignados = Array.isArray(proyectosAsignados) ? proyectosAsignados : []
  const todosProyectos = (todosProyectosData as any)?.data ?? []

  const asignadosIds = new Set(asignados.map((p) => p.proyectoId))
  const disponibles = todosProyectos.filter((p: any) => !asignadosIds.has(p.id))

  const handleAgregar = () => {
    if (!proyectoSeleccionado) return
    addMutation.mutate(proyectoSeleccionado, {
      onSuccess: () => setProyectoSeleccionado(""),
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Acceso a proyectos
      </p>

      {/* Lista de proyectos asignados */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : asignados.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Sin proyectos asignados.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {asignados.map((p) => (
            <li
              key={p.proyectoId}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="h-4 w-4 text-blue-900 shrink-0" />
                <span className="truncate">{p.proyectoNombre}</span>
                {p.esActivo && (
                  <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                    <Check className="h-3 w-3" />
                    Activo
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate(p.proyectoId)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Agregar proyecto */}
      {disponibles.length > 0 && (
        <div className="flex gap-2">
          <Select
            value={proyectoSeleccionado}
            onValueChange={setProyectoSeleccionado}
            disabled={addMutation.isPending}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Agregar proyecto...">
                {todosProyectos.find((p: any) => p.id === proyectoSeleccionado)?.nombre ?? "Agregar proyecto..."}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {disponibles.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="icon"
            className="bg-blue-900 hover:bg-blue-800 shrink-0"
            disabled={!proyectoSeleccionado || addMutation.isPending}
            onClick={handleAgregar}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
