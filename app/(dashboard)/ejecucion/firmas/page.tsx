"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  PenLine, Loader2, CheckCircle2, ChevronLeft, ChevronRight,
  Tag, Layers, FileImage, Eye, Layers3,
} from "lucide-react"

import { useGetMisFirmas, type MisFirmasModo } from "@/features/registros/api/use-get-mis-firmas"
import { useGetFirmaMasivaContexto } from "@/features/firma-masiva/api/use-firma-masiva"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetEspecialidadesUsadas } from "@/features/especialidades/api/use-especialidades"
import { Button, buttonVariants } from "@/components/ui/button"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"

const PAGE_SIZE = 20
const ALL = "__all__"

interface EspecialidadLike { id: string; codigo?: string | null; nombre: string }

/**
 * Firma de registros. Tres tabs, los tres del usuario que mira:
 *
 *  • **Para firmar** — todo lo que puede firmar por sus roles de firma en el
 *    proyecto, incluido trabajo de otros. Para un supervisor es casi toda la obra.
 *  • **De mis tareas** — lo mismo, acotado a tareas asignadas a él. Es el tab que
 *    cuenta el badge del sidebar: un número que dice "te falta cerrar algo tuyo".
 *  • **Firmados por mí** — historial.
 *
 * El segundo es un SUBCONJUNTO del primero y no otra cosa: todo lo que lista se
 * puede firmar ahí mismo. Existe porque las dos preguntas se habían mezclado en una
 * sola cola: quién firma sale del rol, de quién es el trabajo sale de los asignados
 * de la tarea, y con el rol puesto lo propio quedaba enterrado entre lo de todos.
 */

// El default export envuelve en <Suspense> — obligatorio en Next 16 cuando el
// componente usa useSearchParams (client-side bailout en el pre-render estático).
export default function FirmasPage() {
  return (
    <Suspense>
      <FirmasPageContent />
    </Suspense>
  )
}

const MODOS: { valor: MisFirmasModo; texto: string }[] = [
  { valor: "pendientes", texto: "Para firmar" },
  { valor: "mis-tareas", texto: "De mis tareas" },
  { valor: "firmados",   texto: "Firmados por mí" },
]

// Ninguno de los tres se llama "Pendientes" a propósito: Pendientes es otro módulo
// —el punch list— y el ítem del menú está justo arriba.

function FirmasPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [page, setPage] = useState(1)

  // El tab también vive en la URL (`?modo=`). Hace falta para poder linkear a uno
  // —el badge del sidebar cuenta "De mis tareas"— y para que volver desde un
  // registro no devuelva al usuario al tab que no estaba mirando.
  const [modo, setModo] = useState<MisFirmasModo>(() => {
    const m = searchParams.get("modo")
    return MODOS.some((x) => x.valor === m) ? (m as MisFirmasModo) : "pendientes"
  })

  // Filtro por especialidad. Persiste en la URL (`?especialidad=<id>`) porque el
  // supervisor de una disciplina mira siempre la misma: si fuera estado del
  // componente lo tendría que volver a elegir en cada visita.
  const [especialidadId, setEspecialidadId] = useState<string>(
    () => searchParams.get("especialidad") ?? "",
  )

  // Un solo efecto para los dos parámetros: con uno por cada uno, cambiar los dos
  // en el mismo render deja al segundo pisando el replace del primero.
  const urlSyncedRef = useRef(false)
  useEffect(() => {
    if (!urlSyncedRef.current) { urlSyncedRef.current = true; return }
    const params = new URLSearchParams(searchParams.toString())
    const igualEsp = (params.get("especialidad") ?? "") === especialidadId
    const igualModo = (params.get("modo") ?? "pendientes") === modo
    if (igualEsp && igualModo) return
    if (especialidadId) params.set("especialidad", especialidadId)
    else params.delete("especialidad")
    // El default no se escribe: deja la URL limpia al volver al primer tab.
    if (modo !== "pendientes") params.set("modo", modo)
    else params.delete("modo")
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }, [especialidadId, modo, pathname, router, searchParams])

  const { data: perfil } = useGetPerfil()
  const proyectoId = perfil?.proyectoId

  // La firma en lote es una funcionalidad por proyecto y además por rol de firma.
  // Acá sólo se usa para decidir si mostrar la entrada; la autorización real la
  // revalida el backend en cada llamada.
  const { data: loteCtx } = useGetFirmaMasivaContexto(proyectoId)
  const loteDisponible = loteCtx?.data?.habilitada ?? false

  // Sólo las especialidades que el proyecto activo realmente usa: ofrecer una sin
  // elementos dejaría la cola en cero al elegirla.
  const { data: espData } = useGetEspecialidadesUsadas()
  const especialidadOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [{ value: ALL, label: "Todas las especialidades" }]
    for (const e of (espData?.data ?? []) as EspecialidadLike[]) {
      opts.push({ value: e.id, label: e.codigo ? `${e.codigo} — ${e.nombre}` : e.nombre })
    }
    return opts
  }, [espData])

  const { data, isLoading, isFetching } = useGetMisFirmas({
    proyectoId,
    page,
    pageSize: PAGE_SIZE,
    modo,
    especialidadId: especialidadId || undefined,
  })

  function handleModo(nuevoModo: MisFirmasModo) {
    if (modo === nuevoModo) return
    setModo(nuevoModo)
    setPage(1)
  }

  // Cambiar de especialidad reinicia la paginación: sin esto se puede quedar en la
  // página 4 de un filtro que tiene una sola, y la lista sale vacía.
  function handleEspecialidad(valor: string) {
    const nuevo = valor === ALL ? "" : valor
    if (nuevo === especialidadId) return
    setEspecialidadId(nuevo)
    setPage(1)
  }

  // Los dos primeros tabs listan lo mismo —registros esperando MI firma— y se
  // renderizan igual; lo único distinto es el alcance. El historial sí cambia la
  // fila: colores, fecha y botón.
  const esPendiente = modo !== "firmados"

  const items = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Firma de registros</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {modo === "pendientes"
            ? "Todo lo que podés firmar según tus roles asignados en el proyecto"
            : modo === "mis-tareas"
              ? "Registros de tareas asignadas a vos que esperan tu firma"
              : "Registros que ya firmaste en este proyecto"}
        </p>
      </div>

      {/* Tabs + filtro por especialidad */}
      <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex gap-1 p-1 rounded-lg bg-gray-100">
        {MODOS.map(({ valor, texto }) => (
          <button
            key={valor}
            onClick={() => handleModo(valor)}
            className={`text-sm px-4 py-1.5 rounded-md font-medium transition-colors ${
              modo === valor
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

        <div className="w-64">
          <Combobox
            options={especialidadOptions}
            value={especialidadId || ALL}
            onChange={handleEspecialidad}
            placeholder="Todas las especialidades"
            searchPlaceholder="Buscar especialidad..."
          />
        </div>

        {/* Firma en lote. El botón sólo existe si la función está activa en el
            proyecto y el usuario tiene un rol de firma habilitado para lote —
            apagada, esta pantalla queda igual que siempre. Va sólo en el tab de la
            cola completa: en "De mis tareas" y en el historial no tiene sentido. */}
        {loteDisponible && modo === "pendientes" && (
          <Link
            href="/ejecucion/firmas/lote"
            className={buttonVariants({ size: "sm", variant: "outline" }) + " gap-1.5 sm:ml-auto"}
          >
            <Layers3 className="h-4 w-4" />
            Firmar en lote
          </Link>
        )}
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
        especialidadId ? (
          // Con filtro puesto, "Todo al día" mentiría: puede haber pendientes en otra
          // especialidad. Se dice qué está filtrando y se ofrece salir del filtro.
          <div className="rounded-lg border bg-white p-10 text-center space-y-2">
            <Layers className="h-10 w-10 text-gray-400 mx-auto" />
            <p className="font-medium text-gray-700">
              Nada en {especialidadOptions.find((o) => o.value === especialidadId)?.label ?? "esta especialidad"}
            </p>
            <p className="text-sm text-muted-foreground">
              Puede haber registros en otras especialidades.
            </p>
            <Button variant="outline" size="sm" onClick={() => handleEspecialidad(ALL)}>
              Ver todas las especialidades
            </Button>
          </div>
        ) : modo === "pendientes" ? (
          <div className="rounded-lg border bg-white p-10 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
            <p className="font-medium text-gray-700">Todo al día</p>
            <p className="text-sm text-muted-foreground">No tenés registros pendientes de firma.</p>
          </div>
        ) : modo === "mis-tareas" ? (
          // "Todo al día" sin más mentiría por omisión: este tab mira sólo lo propio,
          // y puede haber trabajo de otros esperando la firma de este usuario. Se
          // ofrece el salto en vez de dejarlo creer que no debe nada.
          <div className="rounded-lg border bg-white p-10 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
            <p className="font-medium text-gray-700">Nada tuyo esperando firma</p>
            <p className="text-sm text-muted-foreground">
              Las tareas que tenés asignadas no tienen registros pendientes de tu firma.
            </p>
            <Button variant="outline" size="sm" onClick={() => handleModo("pendientes")}>
              Ver todo lo que podés firmar
            </Button>
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
            {esPendiente ? " pendiente" : " firmado"}{total !== 1 ? "s" : ""}
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
                      {(item.especialidadCodigo || item.especialidadNombre) && (
                        // El color sale de la especialidad para que coincida con los
                        // charts; va inline porque es un hex del catálogo, no una clase.
                        <span
                          className="inline-flex items-center text-xs border rounded px-1.5 py-0.5 font-medium"
                          style={{
                            color: item.especialidadColor ?? undefined,
                            borderColor: item.especialidadColor ?? undefined,
                          }}
                          title={item.especialidadNombre ?? undefined}
                        >
                          {item.especialidadCodigo ?? item.especialidadNombre}
                        </span>
                      )}
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
                      {esPendiente && item.fechaTerminado && (
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
                          esPendiente
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-green-50 text-green-700 border-green-200"
                        }`}
                      >
                        {esPendiente ? <PenLine className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                        {rol}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/ejecucion/registros/${item.registroId}`}
                    className={buttonVariants({ size: "sm", variant: esPendiente ? "default" : "outline" }) + " shrink-0 whitespace-nowrap gap-1.5"}
                  >
                    {esPendiente ? (
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
