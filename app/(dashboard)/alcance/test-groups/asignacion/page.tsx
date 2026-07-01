"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Search } from "lucide-react"

import { useGetTestGroups } from "@/features/testgroups/api/use-get-testgroups"
import { useGetElementosAsignados, type ElementoAsignable } from "@/features/testgroups/api/use-get-elementos-asignados"
import { useGetElementosDisponibles } from "@/features/testgroups/api/use-get-elementos-disponibles"
import { useAsignarElementos } from "@/features/testgroups/api/use-asignar-elementos"
import { useDesasignarElemento } from "@/features/testgroups/api/use-desasignar-elemento"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { TIPO_TEST_GROUP, type TipoTestGroup } from "@/features/testgroups/types"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const TIPO_ALL = "__all__"
const SUB_ALL = "__all__"

interface ListaProps {
  titulo: string
  vacio: string
  items: ElementoAsignable[]
  selected: Set<string>
  onToggle: (id: string) => void
  isLoading: boolean
  right?: React.ReactNode
}

function ListaElementos({ titulo, vacio, items, selected, onToggle, isLoading, right }: ListaProps) {
  return (
    <div className="flex flex-col rounded-lg border bg-card min-h-[500px]">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
        <h3 className="font-semibold text-sm">{titulo}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{items.length}</span>
          {right}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 max-h-[500px]">
        {isLoading ? (
          <p className="text-sm text-muted-foreground p-3">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground p-3">{vacio}</p>
        ) : (
          items.map((el) => (
            <label
              key={el.id}
              className={`flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer hover:bg-muted text-sm ${
                selected.has(el.id) ? "bg-blue-50 dark:bg-blue-950/20" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(el.id)}
                onChange={() => onToggle(el.id)}
                className="h-4 w-4 accent-blue-900"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{el.tag}</span>
                  {el.elementoTipoNombre && (
                    <Badge variant="outline" className="text-[10px]">{el.elementoTipoNombre}</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {el.nombre}
                  {el.subSistemaCodigo && ` · ${el.subSistemaCodigo}`}
                </div>
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  )
}

export default function AsignacionPage() {
  const [tipoFilter, setTipoFilter] = useState<string>(TIPO_ALL)
  const [testGroupId, setTestGroupId] = useState<string | null>(null)
  const [subFilter, setSubFilter] = useState<string>(SUB_ALL)
  const [search, setSearch] = useState("")

  const [selectedDisp, setSelectedDisp] = useState<Set<string>>(new Set())
  const [selectedAsig, setSelectedAsig] = useState<Set<string>>(new Set())

  const tipoParam: TipoTestGroup | undefined =
    tipoFilter === TIPO_ALL ? undefined : (parseInt(tipoFilter, 10) as TipoTestGroup)

  const { data: tgData } = useGetTestGroups({ tipo: tipoParam })
  const testGroups = tgData?.data ?? []

  const { data: subsData } = useGetSubSistemasSelect()
  const subs = subsData?.data ?? []

  const { data: asignadosData, isLoading: loadingAsignados } = useGetElementosAsignados(testGroupId)
  const { data: dispData, isLoading: loadingDisp } = useGetElementosDisponibles({
    testGroupId,
    subSistemaId: subFilter === SUB_ALL ? undefined : subFilter,
    search: search || undefined,
  })

  const asignados = asignadosData?.data ?? []
  const disponibles = dispData?.data ?? []

  const asignarMutation = useAsignarElementos()
  const desasignarMutation = useDesasignarElemento()

  const tgActual = useMemo(() => testGroups.find((t) => t.id === testGroupId), [testGroups, testGroupId])

  const toggleDisp = (id: string) => {
    setSelectedDisp((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleAsig = (id: string) => {
    setSelectedAsig((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleAsignar = async () => {
    if (!testGroupId || selectedDisp.size === 0) return
    await asignarMutation.mutateAsync({
      testGroupId,
      elementoIds: Array.from(selectedDisp),
    })
    setSelectedDisp(new Set())
  }

  const handleDesasignar = async () => {
    if (!testGroupId || selectedAsig.size === 0) return
    for (const elementoId of Array.from(selectedAsig)) {
      await desasignarMutation.mutateAsync({ testGroupId, elementoId })
    }
    setSelectedAsig(new Set())
  }

  return (
    <div className="space-y-4">
      {/* Header con selectores de TestGroup */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v ?? TIPO_ALL); setTestGroupId(null) }}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TIPO_ALL}>Todos los tipos</SelectItem>
              <SelectItem value={String(TIPO_TEST_GROUP.PRESSURE)}>Pressure Test Pack</SelectItem>
              <SelectItem value={String(TIPO_TEST_GROUP.BASIC_FUNCTION)}>Basic Function</SelectItem>
            </SelectContent>
          </Select>

          <Select value={testGroupId ?? ""} onValueChange={(v) => { setTestGroupId(v || null); setSelectedDisp(new Set()); setSelectedAsig(new Set()) }}>
            <SelectTrigger className="w-96">
              <SelectValue placeholder="Elegí un paquete de prueba" />
            </SelectTrigger>
            <SelectContent>
              {testGroups.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">Sin paquetes para este filtro.</div>
              )}
              {testGroups.map((tg) => (
                <SelectItem key={tg.id} value={tg.id}>
                  {tg.codigo} — {tg.nombre || "(sin nombre)"} [{tg.tipoTexto}]
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {tgActual && (
            <Badge variant="outline" className="ml-auto">
              {tgActual.subSistemaCodigo ?? "—"} · {tgActual.estadoTexto}
            </Badge>
          )}
        </div>
      </div>

      {!testGroupId ? (
        <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
          Elegí un paquete de prueba para empezar a asignar elementos.
        </div>
      ) : (
        <>
          {/* Filtros de la lista de disponibles */}
          <div className="rounded-lg border bg-card p-3 flex items-center gap-3 flex-wrap">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar TAG, nombre, PID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={subFilter} onValueChange={(v) => setSubFilter(v ?? SUB_ALL)}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Todos los subsistemas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SUB_ALL}>Todos los subsistemas</SelectItem>
                {subs.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dos columnas + botones */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4">
            <ListaElementos
              titulo="Disponibles (agrupables)"
              vacio="Sin elementos que cumplan los filtros."
              items={disponibles}
              selected={selectedDisp}
              onToggle={toggleDisp}
              isLoading={loadingDisp}
            />

            <div className="flex md:flex-col items-center justify-center gap-3">
              <Button
                onClick={handleAsignar}
                disabled={selectedDisp.size === 0 || asignarMutation.isPending}
                className="gap-2 bg-blue-900 hover:bg-blue-800"
                size="sm"
              >
                <ArrowRight className="h-4 w-4" />
                Asignar {selectedDisp.size > 0 ? `(${selectedDisp.size})` : ""}
              </Button>
              <Button
                variant="outline"
                onClick={handleDesasignar}
                disabled={selectedAsig.size === 0 || desasignarMutation.isPending}
                className="gap-2"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Quitar {selectedAsig.size > 0 ? `(${selectedAsig.size})` : ""}
              </Button>
            </div>

            <ListaElementos
              titulo="Asignados al paquete"
              vacio="Todavía no hay elementos asignados."
              items={asignados}
              selected={selectedAsig}
              onToggle={toggleAsig}
              isLoading={loadingAsignados}
            />
          </div>
        </>
      )}
    </div>
  )
}
