"use client"

import { use, useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Save, CheckCircle2, Loader2, Download, PenLine, Clock, Check, Lock,
  ChevronDown, FileText, Paperclip,
} from "lucide-react"

import { useBreadcrumb } from "@/components/breadcrumb-context"

import { apiClient } from "@/lib/api-client"
import { useGetRegistroDetalle } from "@/features/registros/api/use-get-registro-detalle"
import { useCompletarDigital } from "@/features/registros/api/use-completar-digital"
import { useCompletarFisico } from "@/features/registros/api/use-completar-fisico"
import { useGetPlanillaEstructura } from "@/features/planillas/api/use-get-planilla-estructura"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import { useGetElemento } from "@/features/elementos/api/use-get-elemento"
import { useGetFirmasStatus } from "@/features/registros/api/use-get-firmas-status"
import { useFirmarRegistro } from "@/features/registros/api/use-firmar-registro"
import { useGetMiFirma, useUploadMiFirma } from "@/features/usuarios/api/use-mi-firma"
import { SignaturePad, type SignaturePadHandle } from "@/components/ui/signature-pad"
import { RegistroAdjuntos } from "@/features/registros/components/registro-adjuntos"
import { RegistroPdfMovil } from "@/features/registros/components/registro-pdf-movil"
import {
  CampoTablaInput,
  tablaTieneAlgoPorCompletar,
  tablaTieneDatos,
} from "@/features/registros/components/campo-tabla-input"
import { CampoCroquisInput } from "@/features/registros/components/campo-croquis-input"
import { ProximoCicloDialog } from "@/features/preservacion/components/proximo-ciclo-dialog"
import {
  CargaFisicaUploader,
  type CargaFisicaSubmitParams,
} from "@/features/registros/components/carga-fisica-uploader"
import { useGetFirmasConfigEfectiva } from "@/features/registros/api/use-get-firmas-config-efectiva"
import { useGetRegistroArchivos } from "@/features/registros/api/use-registro-archivos"
import { useGetMisProyectos } from "@/features/auth/api/use-get-mis-proyectos"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCanWrite } from "@/lib/use-roles"

import type { RegistroValorInput, RegistroDetalle, RegistroFirmaSlot } from "@/features/registros/types"
import type { ElementoTarea } from "@/features/elementos-tareas/types"
import type { PlanillaCampoDetalle, TamanoTexto } from "@/features/planillas/types"
import { TAMANO_TEXTO_CLASS } from "@/features/planillas/types"

// Hook local: la lista por elemento ya existe pero no hay uno por ID; lo inlineamos acá.
function useGetElementoTarea(id: string | null) {
  return useQuery({
    queryKey: ["elementos-tareas", id],
    queryFn: () => apiClient.get<{ data: ElementoTarea }>(`/api/elementos-tareas/${id}`),
    enabled: !!id,
  })
}
import { packCampos } from "@/features/planillas/lib/pack-campos"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PageProps {
  params: Promise<{ registroId: string }>
}

// Las clases de Tailwind deben ser literales para que el JIT las detecte; usamos un map estático.
const COL_SPAN_SM: Record<number, string> = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  5: "sm:col-span-5",
  6: "sm:col-span-6",
  7: "sm:col-span-7",
  8: "sm:col-span-8",
  9: "sm:col-span-9",
  10: "sm:col-span-10",
  11: "sm:col-span-11",
  12: "sm:col-span-12",
}

function clampTamano(t: number | null | undefined): number {
  const n = typeof t === "number" && Number.isFinite(t) ? Math.floor(t) : 4
  return Math.max(1, Math.min(12, n))
}

export default function RegistroFormPage({ params }: PageProps) {
  const { registroId } = use(params)
  const router = useRouter()

  const { data: detalleRaw, isLoading: loadingDetalle } = useGetRegistroDetalle(registroId)
  const registro = detalleRaw?.data

  const planillaId = registro?.planillaId ?? null
  const proyectoId = registro?.proyectoId ?? null

  const { data: estructuraRaw, isLoading: loadingEstructura } = useGetPlanillaEstructura(planillaId)
  type EstructuraData = {
    planilla: { permiteAdjuntos?: boolean } & Record<string, any>
    secciones: Array<{ id: string; nombre: string; orden: number } & Record<string, any>>
    campos: PlanillaCampoDetalle[]
  }
  const estructura = ((estructuraRaw as any)?.data ?? estructuraRaw) as EstructuraData | undefined

  const { data: proyectoRaw } = useGetProyecto(proyectoId)
  const proyecto = proyectoRaw?.data

  // Datos del contexto: tarea (para el título y nombre del elemento) y elemento (TAG, tipo,
  // especialidad). Las dos queries son secuenciales: tarea trae el elementoId.
  const elementoTareaId = registro?.elementoTareaId ?? null
  const { data: tareaRaw } = useGetElementoTarea(elementoTareaId)
  const elementoTarea = tareaRaw?.data
  const elementoId = elementoTarea?.elementoId ?? null
  const { data: elementoRaw } = useGetElemento(elementoId)
  const elemento = elementoRaw?.data

  // Defaults defensivos mientras carga: digital permitido, físico no.
  // Coincide con el comportamiento previo cuando solo existía permitirRegistroFisico.
  const permitirFisico = proyecto?.permitirRegistroFisico ?? false
  const permitirDigital = proyecto?.permitirRegistroDigital ?? true
  // Adjuntos: siempre permitidos. Los flags PermiteAdjuntos del proyecto y de la
  // planilla se dejaron de gatear en el backend — cualquier registro acepta adjuntos.
  const permiteAdjuntos = true

  const completarDigital = useCompletarDigital(registroId)
  const completarFisico = useCompletarFisico(registroId)
  // Consultor/Auditor: solo lectura del registro (form navegable, adjuntos y firmas
  // visibles, pero sin poder guardar/completar/firmar/subir).
  const canWrite = useCanWrite()

  // Form state: { [planillaCampoId]: value }
  const [valores, setValores] = useState<Record<string, string>>({})
  const [observaciones, setObservaciones] = useState("")
  const [observacionesCampo, setObservacionesCampo] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  /** Error del último guardado (incluye el conflicto por edición concurrente). */
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)
  /** Momento del último "Guardar borrador" de esta sesión, para el acuse en pantalla. */
  const [borradorGuardadoEn, setBorradorGuardadoEn] = useState<Date | null>(null)
  /**
   * `updatedAt` con el que este formulario está trabajando: la versión del registro
   * sobre la que se armó lo que hay en pantalla. Se fija una sola vez en la carga
   * (junto al prefill) y después sólo lo reemplaza la respuesta de un guardado propio.
   *
   * Es un ref y NO un valor derivado de `registro.updatedAt` a propósito: react-query
   * refetchea en segundo plano (por ejemplo al volver a la pestaña), y si el valor
   * siguiera a la query, el guardado de otro usuario quedaría adoptado en silencio
   * como "lo que yo vi" — justo el conflicto que este control existe para detectar.
   */
  const updatedAtVistoRef = useRef<string | null>(null)

  // Pre-rellenar con valores existentes cuando cargan. Si el registro todavía no
  // tiene valores guardados, el backend devuelve `valoresPrecargados` (datos del
  // elemento+planilla) que se usan como default editable.
  const prefilledRef = useRef(false)
  if (registro && estructura && !prefilledRef.current) {
    prefilledRef.current = true
    const init: Record<string, string> = {}
    const fuente = registro.valores.length > 0
      ? registro.valores
      : (registro.valoresPrecargados ?? [])
    for (const v of fuente) {
      if (v.valorTexto != null)        init[v.planillaCampoId] = v.valorTexto
      else if (v.valorNumero != null)  init[v.planillaCampoId] = String(v.valorNumero)
      else if (v.valorFecha != null)   init[v.planillaCampoId] = v.valorFecha.substring(0, 10)
      else if (v.valorBit != null)     init[v.planillaCampoId] = v.valorBit ? "true" : "false"
      else if (v.valorJson != null)    init[v.planillaCampoId] = v.valorJson
    }
    setValores(init)
    setObservaciones(registro.observaciones ?? "")
    updatedAtVistoRef.current = registro.updatedAt ?? null
  }

  // Modo: lo que el usuario elija (con override) sobre el default de la config.
  // El default se calcula reactivamente porque `proyecto` carga async.
  const defaultModo: "digital" | "fisico" = permitirDigital ? "digital" : "fisico"
  const [userModo, setUserModo] = useState<"digital" | "fisico" | null>(null)
  const modo = userModo ?? defaultModo
  const showToggle = permitirDigital && permitirFisico

  // Vista del registro: PDF o formulario. Null = sin elección del usuario, se usa
  // el default de abajo.
  const [vistaUsuario, setVistaUsuario] = useState<"pdf" | "formulario" | null>(null)
  /**
   * Qué vistas existen para este registro. Antes era una sola condición que negaba
   * `esFisico`, y son dos preguntas distintas: el registro físico TAMBIÉN tiene PDF
   * —el escaneo, con la hoja de certificado atrás o las firmas superpuestas— y lo que
   * no tiene es formulario, porque sus valores nunca entraron a la base. El backend ya
   * servía ese PDF en `/pdf/preview` (GenerarPdfRegistroUnificadoAsync detecta
   * EsFisico y devuelve el compuesto); acá estaba gateado y nada más.
   *
   * En BORRADOR no hay PDF que valga la pena mostrar: la planilla sale vacía. Y en
   * físico el estado nunca es BORRADOR, porque `EsFisico` se pone en true recién al
   * subir el escaneo — así que `hayPdf` implica que el archivo está.
   */
  const hayPdf = !!registro && registro.estado !== "BORRADOR"
  const hayFormulario = !!registro && !registro.esFisico
  // El toggle sólo existe con las dos vistas disponibles. En físico no se dibuja: un
  // selector de un solo botón no es un selector.
  const hayToggle = hayPdf && hayFormulario
  const esCerrado = !!registro
    && (registro.estado === "COMPLETADO" || registro.estado === "FIRMADO" || registro.estado === "APROBADO")
  /**
   * Default PDF cuando el registro ya está cerrado: ese es el momento de firmarlo y
   * de leerlo, y el PDF es el documento real: el formulario read-only mostraba los
   * mismos datos con otra cara. Mientras se carga, el formulario es el que manda.
   */
  const vistaEfectiva: "pdf" | "formulario" = !hayFormulario
    ? "pdf"
    : !hayPdf
      ? "formulario"
      : (vistaUsuario ?? (esCerrado ? "pdf" : "formulario"))

  const { data: firmasConfigRaw } = useGetFirmasConfigEfectiva(registroId)
  const hayFirmasFisicas = firmasConfigRaw?.data?.hayFirmasFisicas ?? false
  const cantidadFirmasFisicas = firmasConfigRaw?.data?.cantidadSlotsFisica ?? 0
  const rechazarBajaResolucion = firmasConfigRaw?.data?.rechazarBajaResolucion ?? false
  const anchoMinimoImagen = firmasConfigRaw?.data?.anchoMinimoImagen ?? 1500
  const cortarAdjuntosEscaneo = firmasConfigRaw?.data?.cortarAdjuntosEscaneo ?? false

  // Info del próximo ciclo de preservación generado por completar/firmar. Cuando
  // viene con generado=true mostramos el dialog y postergamos el router.back()
  // hasta que el usuario lo cierre (así ve la fecha antes de perder la pantalla).
  const [proximoCicloFecha, setProximoCicloFecha] = useState<string | null>(null)

  /**
   * Firmar en el momento de completar. Los slots de firma los crea el backend DENTRO
   * del mismo completar, así que recién cuando vuelve la respuesta se puede saber si
   * a esta persona le toca firmar algo. Si le toca, en vez de volver a la lista se le
   * ofrece firmar ahí: el registro quedó en COMPLETADO, que es justo el estado que
   * acepta la firma.
   *
   * `ofrecerFirma` es el slot que abre el diálogo; `abrirSlotFirma` es el que la
   * tarjeta de firmas abre y centra sola cuando el usuario dice que sí.
   */
  const [ofrecerFirma, setOfrecerFirma] = useState<RegistroFirmaSlot | null>(null)
  const [abrirSlotFirma, setAbrirSlotFirma] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Funcionalidades efectivas del proyecto activo, igual que las lee el sidebar. Acá
  // se usa una sola: REGISTRO_PDF_CON_ADJUNTOS, que decide si "Descargar PDF" trae el
  // registro con los adjuntos pegados atrás o el registro solo.
  const { data: misProyectos } = useGetMisProyectos()
  const pdfConAdjuntos =
    misProyectos?.find((p) => p.esActivo)?.funcionalidades?.REGISTRO_PDF_CON_ADJUNTOS === true

  // Cuántos adjuntos tiene el registro, para no ofrecer un ZIP vacío (el backend
  // responde error si no hay ninguno). Es la misma query key que usa el riel, así que
  // no agrega una request. El escaneo físico (posición 0) y el certificado de firmas
  // (999) no son adjuntos del usuario y el ZIP tampoco los incluye.
  const { data: archivosRaw } = useGetRegistroArchivos(registroId)
  const cantidadAdjuntos = (archivosRaw?.data ?? []).filter(
    (a) => a.posicion !== 0 && a.posicion !== 999
  ).length

  const isLoading = loadingDetalle || loadingEstructura
  // Consultor/Auditor fuerzan modo readonly aunque el registro esté editable.
  // Excepción: encabezado de TestGroup es siempre re-editable (no firma, no cierra).
  const esEncabezadoTg = !!registro?.esEncabezadoTg
  const isReadOnly = !canWrite
    || (!esEncabezadoTg && (
      registro?.estado === "COMPLETADO"
      || registro?.estado === "FIRMADO"
      || registro?.estado === "APROBADO"
    ))

  // Breadcrumb dinámico: Ejecución → Registros → {Elemento (link)} → {Tarea}
  // El nombre del elemento es link a la pantalla de elementos con el sheet
  // abierto (?elementoId=...), para volver con el contexto intacto.
  // Si todavía no tenemos elemento/tarea, caemos al nombre de la planilla.
  const elementoNombre = registro?.elementoNombre ?? null
  const elementoIdReg = registro?.elementoId ?? null
  const tareaNombre = registro?.tareaNombre ?? null
  const planillaNombre = (estructura as any)?.planilla?.nombre ?? null
  useBreadcrumb(
    elementoNombre || tareaNombre || planillaNombre
      ? [
          { label: "Ejecución" },
          { label: "Registros" },
          ...(elementoNombre
            ? [{
                label: elementoNombre,
                href: elementoIdReg ? `/ejecucion/elementos?elementoId=${elementoIdReg}` : undefined,
              }]
            : []),
          { label: tareaNombre ?? planillaNombre ?? "—" },
        ]
      : null
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando formulario...
      </div>
    )
  }

  if (!registro || !estructura) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No se pudo cargar el registro.
      </div>
    )
  }

  const { planilla, secciones, campos } = estructura

  /**
   * Las dos vistas del registro. La condición estaba escrita inline y repetida en las
   * dos ramas del JSX; extraerla evita que se desincronicen, ahora que además deciden
   * dónde van adjuntos y firmas.
   *
   * El formulario pide las dos cosas: que el registro tenga formulario (o sea que sea
   * digital) y que el usuario esté en ese camino. El PDF no mira el modo —es el
   * documento, haya o no algo que editar—, así que en el físico RECHAZADO quedan el
   * uploader arriba y abajo el escaneo que se está reemplazando, que es la evidencia
   * de lo que se rechazó.
   */
  const enCaminoDigital = isReadOnly || (modo === "digital" && permitirDigital)
  // La pantalla de carga del PDF físico. Se pregunta dos veces: para mostrarla, y para
  // no duplicar las observaciones, que ahí se editan adentro del uploader.
  const mostrandoCargaFisica = modo === "fisico" && !isReadOnly && permitirFisico
  const mostrandoFormulario = hayFormulario && enCaminoDigital && vistaEfectiva === "formulario"
  const mostrandoPdf = hayPdf && vistaEfectiva === "pdf" && (!hayFormulario || enCaminoDigital)

  /**
   * Adjuntos: disponibles para digital y físico, incluso después de completar/firmar.
   * Sólo se bloquean con el registro RECHAZADO; APROBADO ("PDF firmado en papel")
   * sigue aceptando adjuntos para sumar evidencia o fotos posteriores.
   */
  const adjuntos = (
    <RegistroAdjuntos
      registroId={registroId}
      permiteSubir={permiteAdjuntos && canWrite}
      readOnly={registro.estado === "RECHAZADO" || !canWrite}
    />
  )
  /**
   * Firmas: en todo registro cerrado, APROBADO incluido. Faltaba justamente ese estado,
   * que es donde termina el registro físico cuando todas sus firmas eran en papel (lo
   * decide el cierre de CompletarFisicoAsync, según queden o no slots Digital
   * pendientes): el registro más completo era el único que las escondía.
   *
   * `permiteFirmar` separa ver de firmar. En APROBADO ya no se firma —FirmarAsync sólo
   * acepta COMPLETADO y FIRMADO—, así que sin esto un slot no obligatorio sin firma
   * ofrecería un botón que el backend rechaza.
   */
  const firmas = esCerrado ? (
    <FirmasSection
      registroId={registroId}
      canWrite={canWrite}
      permiteFirmar={registro.estado === "COMPLETADO" || registro.estado === "FIRMADO"}
      esRegistroFisico={registro.esFisico}
      abrirSlotId={abrirSlotFirma}
    />
  ) : null

  /**
   * El riel que acompaña al documento en las dos vistas. Se arma una sola vez: cuando
   * cada vista decidía por su cuenta dónde iban los adjuntos, la del formulario los
   * tenía colapsados arriba y las firmas al final, y eran dos pantallas distintas para
   * el mismo trabajo.
   */
  const riel = (
    <>
      {adjuntos}
      {firmas}
    </>
  )

  // Agrupar campos por sección (null = sin sección)
  const camposPorSeccion = campos.reduce<Record<string, PlanillaCampoDetalle[]>>((acc, c) => {
    const key = c.planillaSeccionId ?? "__sin_seccion__"
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  const ordenSecciones = [
    ...secciones.sort((a, b) => a.orden - b.orden).map((s) => s.id),
    "__sin_seccion__",
  ].filter((id) => camposPorSeccion[id]?.length > 0)

  function setValue(planillaCampoId: string, val: string) {
    setValores((prev) => ({ ...prev, [planillaCampoId]: val }))
    if (errors[planillaCampoId]) setErrors((prev) => ({ ...prev, [planillaCampoId]: false }))
  }

  function setObsCampo(planillaCampoId: string, val: string) {
    setObservacionesCampo((prev) => ({ ...prev, [planillaCampoId]: val }))
  }

  function buildValores(): RegistroValorInput[] {
    // Excluimos tipos que NO son inputs digitales: Imagen (8), Label (10),
    // Espacio (13), Nota (15) y Leyenda (16) — son layout, no dato.
    return campos
      .filter((c) => c.visible && !c.soloLectura
                      && c.campoTipoDato !== 8 && c.campoTipoDato !== 10
                      && c.campoTipoDato !== 13 && c.campoTipoDato !== 15
                      && c.campoTipoDato !== 16)
      .map((c) => {
        const raw = valores[c.id] ?? c.valorDefault ?? ""
        const input: RegistroValorInput = {
          planillaCampoId: c.id,
          observaciones: observacionesCampo[c.id] || null,
        }
        switch (c.campoTipoDato) {
          case 2: input.valorNumero = raw !== "" ? Number(raw) : null; break
          case 3: input.valorFecha  = raw || null; break
          case 4: input.valorBit    = raw === "true" ? true : raw === "false" ? false : null; break
          // 9 = Tabla (matriz de celdas), 14 = Croquis (data URL PNG del dibujo).
          // Los dos van a ValorJson porque es la única columna sin tope de largo
          // (ValorTexto está capado en 1000 chars).
          case 9:
          case 14: input.valorJson = raw || null; break
          default: input.valorTexto = raw || null
        }
        return input
      })
  }

  function validate(): boolean {
    const camposObligatorios = campos.filter(
      (c) => c.visible && !c.soloLectura && c.esObligatorio
             && c.campoTipoDato !== 8 && c.campoTipoDato !== 10
             && c.campoTipoDato !== 13 && c.campoTipoDato !== 15 && c.campoTipoDato !== 16
    )
    const newErrors: Record<string, boolean> = {}
    for (const c of camposObligatorios) {
      const val = valores[c.id] ?? c.valorDefault ?? ""
      // Una tabla sin ninguna celda libre no se puede completar: todo su contenido es texto
      // fijo de la planilla. Exigirla dejaría el registro trabado sin nada que el operador
      // pueda hacer, así que se la da por cumplida.
      const vacio = c.campoTipoDato === 9
        ? !tablaTieneDatos(val) && tablaTieneAlgoPorCompletar(c)
        : (val === "" || val == null)
      if (vacio) newErrors[c.id] = true
    }
    setErrors(newErrors)
    const firstErrorId = Object.keys(newErrors)[0]
    if (firstErrorId) {
      document.getElementById(`campo-${firstErrorId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
    return Object.keys(newErrors).length === 0
  }

  // Extrae la fecha del próximo ciclo del response de completar/firmar, si el
  // backend disparó el generador de preservación. Retorna null cuando no
  // corresponde (registro no era de preservación, flag off, elemento retirado).
  function extraerFechaProximoCiclo(res: unknown): string | null {
    const data = (res as { data?: RegistroDetalle } | undefined)?.data
    const info = data?.preservacionCicloGenerado
    return info?.generado && info.fechaPlanificadaProximo ? info.fechaPlanificadaProximo : null
  }

  /**
   * Guarda el formulario digital. Con `parcial` deja el registro abierto y se queda
   * en la pantalla; sin `parcial` exige los obligatorios, cierra y vuelve atrás.
   *
   * El error del backend se muestra en pantalla: antes `mutateAsync` tiraba y la
   * excepción se perdía — el usuario apretaba Guardar y no pasaba nada visible.
   */
  async function handleSubmitDigital(parcial = false) {
    setErrorGuardado(null)
    if (!parcial && !validate()) return
    try {
      const res = await completarDigital.mutateAsync({
        observaciones: observaciones || null,
        valores: buildValores(),
        parcial,
        updatedAtVisto: updatedAtVistoRef.current,
      })
      // El control optimista del próximo guardado tiene que mirar el UpdatedAt que
      // acaba de escribir el backend, no el de la carga inicial: si esperáramos el
      // refetch, dos guardados seguidos se pisarían con un conflicto inventado.
      const detalle = (res as { data?: RegistroDetalle } | undefined)?.data
      if (detalle?.updatedAt) updatedAtVistoRef.current = detalle.updatedAt

      if (parcial) {
        setBorradorGuardadoEn(new Date())
        return
      }
      const fecha = extraerFechaProximoCiclo(res)
      if (fecha) {
        setProximoCicloFecha(fecha)
        return
      }
      // ¿Le toca firmar? Entonces se queda y se le ofrece. Si no, vuelve a la lista
      // como siempre. El de preservación va primero porque ya retiene la pantalla:
      // dos diálogos encimados no se leen.
      const slot = await buscarSlotPropioPendiente()
      if (slot) {
        setOfrecerFirma(slot)
        return
      }
      router.back()
    } catch (err) {
      setErrorGuardado((err as Error).message || "No se pudo guardar el registro.")
    }
  }

  /**
   * El primer slot de firma pendiente que esta persona puede firmar, o null.
   *
   * "Poder firmar" lo resuelve el backend (`puedeFirearUsuarioActual`): necesita un
   * rol de firma asignado en el proyecto, que no es lo mismo que el rol del sistema
   * —ser Admin no alcanza—.
   *
   * Usa la misma query key que la tarjeta de firmas, así la respuesta queda en caché
   * y la tarjeta la encuentra servida. Si la consulta falla devolvemos null: el
   * registro ya se guardó y la firma se puede hacer después desde el mismo registro o
   * desde Mis firmas — no vale la pena ensuciar el cierre por esto.
   */
  async function buscarSlotPropioPendiente(): Promise<RegistroFirmaSlot | null> {
    try {
      const raw = await queryClient.fetchQuery({
        queryKey: ["registros", registroId, "firmas"],
        queryFn: () =>
          apiClient.get<{
            data?: { slots?: RegistroFirmaSlot[] }
            slots?: RegistroFirmaSlot[]
          }>(`/api/registros/${registroId}/firmas`),
      })
      const slots = raw?.data?.slots ?? raw?.slots ?? []
      return slots.find((s) => !s.firmaId && s.puedeFirearUsuarioActual) ?? null
    } catch {
      return null
    }
  }

  // Callback que le pasamos al <CargaFisicaUploader>. Los gates (QR mismatch,
  // firma no detectada) y la rotación pre-subida los maneja el componente; acá
  // solo armamos el FormData, mandamos y manejamos el response.
  async function handleSubmitFisico(params: CargaFisicaSubmitParams) {
    const fd = new FormData()
    fd.append("Archivo", params.archivoFinal)
    if (observaciones) fd.append("Observaciones", observaciones)
    if (params.qrOverrideDetalle) fd.append("QrOverrideDetalle", params.qrOverrideDetalle)
    if (params.firmaOverrideDetalle) fd.append("FirmaOverrideDetalle", params.firmaOverrideDetalle)
    // El operador destildó el corte: el PDF sube entero aunque el proyecto lo separe.
    if (params.noCortarAdjuntos) fd.append("NoCortarAdjuntos", "true")
    const res = await completarFisico.mutateAsync(fd)
    const fecha = extraerFechaProximoCiclo(res)
    if (fecha) setProximoCicloFecha(fecha)
    else router.back()
  }

  const isSaving = completarDigital.isPending || completarFisico.isPending

  // Detalles del elemento (tipo / especialidad / % completado) que van en una línea muted
  // bajo el TAG + nombre. Filtramos los nulos así no quedan separadores huérfanos.
  const detallesElemento = [
    elemento?.elementoTipoNombre,
    elemento?.elementoTipoEspecialidadNombre,
  ].filter(Boolean) as string[]

  /**
   * El ancho depende de si hay riel. Las dos vistas del registro lo tienen, y un riel de
   * 26rem adentro de `max-w-3xl` (48rem) deja al documento en ~336px desde `xl`: más
   * angosto que no tener riel. Con `max-w-7xl` la columna del documento da un A4 real
   * en la vista PDF y al formulario le sobra lugar.
   *
   * `max-w-3xl` queda para lo que no tiene riel —el uploader del PDF físico—, que es
   * una sola columna y se lee mejor angosto.
   */
  const anchoContenedor = mostrandoPdf || mostrandoFormulario ? "max-w-7xl" : "max-w-3xl"

  return (
    /* `overflow-x-clip` hasta xl: red de contención para que nada de lo que hay
       adentro pueda estirar la pantalla a lo ancho en un celular. Lo que no entra
       —una tabla con muchas columnas— ya scrollea adentro de su propia caja. Va
       hasta xl y no siempre porque de ahí para arriba el riel es `sticky`, y un
       ancestro que clipea es justo lo que suele romper el sticky. */
    <div className={`${anchoContenedor} mx-auto w-full space-y-6 max-xl:overflow-x-clip`}>
      {/* Banner de solo lectura para Consultor/Auditor: el registro se ve completo
          (formulario navegable, adjuntos, firmas) pero sin poder guardar ni firmar. */}
      {!canWrite && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 flex items-start gap-2 text-sm text-blue-900">
          <Lock className="h-4 w-4 mt-0.5 shrink-0 text-blue-700" />
          <div>
            <p className="font-medium">Modo solo lectura</p>
            <p className="text-xs">
              Podés ver el registro y descargar el PDF, pero no cargar valores, firmar ni subir archivos.
            </p>
          </div>
        </div>
      )}

      {/* Header de contexto. En celular se apila: el bloque de la derecha —descarga y
          estado— se lleva más de la mitad del ancho y dejaba el título en dos palabras. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          {/* Título: nombre de la tarea. El recorte a un renglón arranca en sm: en
              celular el nombre entra en dos y cortarlo deja la mitad de una palabra. */}
          <h1 className="text-base font-bold text-gray-900 sm:truncate sm:text-lg">
            {elementoTarea?.tareaNombre ?? "Registro"}
          </h1>
          {/* Elemento: TAG (mono azul) + nombre */}
          {elemento && (
            <p className="text-sm text-gray-700 sm:truncate">
              <span className="font-mono font-semibold text-blue-700 mr-2">{elemento.tag}</span>
              {elemento.nombre}
            </p>
          )}
          {/* Detalles del elemento */}
          {detallesElemento.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {detallesElemento.join(" · ")}
            </p>
          )}
        </div>
        {isReadOnly && (
          <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
            {/* Descarga. El botón principal baja el paquete completo: el registro y,
                si el proyecto tiene REGISTRO_PDF_CON_ADJUNTOS, los adjuntos pegados
                atrás detrás de una hoja índice. El desplegable da las dos piezas por
                separado.

                El registro, para digitales, es la planilla renderizada con valores;
                para físicos, el escaneo (envuelto en PDF si era imagen) + la página
                de certificado si hubo firma electrónica. */}
            <div className="flex items-center">
              <a
                href={`/api/registros/${registroId}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-1.5 h-8 rounded-r-none border-r-0">
                  <Download className="h-3.5 w-3.5" />
                  {/* El rótulo también en celular: ahora el header se apila y hay lugar,
                      y un botón partido con dos íconos no dice qué es lo que baja. */}
                  <span>Descargar PDF</span>
                </Button>
              </a>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-l-none px-1.5"
                      aria-label="Más opciones de descarga"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-64">
                  {/* Con la funcionalidad apagada este ítem bajaría exactamente el
                      mismo archivo que el botón principal, así que no se ofrece. */}
                  {pdfConAdjuntos && (
                    <DropdownMenuItem asChild>
                      <a
                        href={`/api/registros/${registroId}/pdf?conAdjuntos=false`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Descargar registro PDF
                      </a>
                    </DropdownMenuItem>
                  )}
                  {/* Los adjuntos van en ZIP y con su formato original: el PDF sólo
                      puede incorporar lo que se convierte en páginas, así que un Excel
                      o un Word se bajan de acá. Siempre disponible, con la
                      funcionalidad prendida o apagada. */}
                  {cantidadAdjuntos === 0 ? (
                    <DropdownMenuItem disabled>
                      <Paperclip className="h-3.5 w-3.5" />
                      Sin adjuntos
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <a
                        href={`/api/registros/${registroId}/adjuntos/zip`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        Descargar adjuntos
                        <span className="ml-auto text-xs text-muted-foreground">
                          {cantidadAdjuntos} · ZIP
                        </span>
                      </a>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {registro.estado === "COMPLETADO" && (
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700">
                <Clock className="h-3.5 w-3.5" /> Pendiente de firma
              </span>
            )}
            {registro.estado === "FIRMADO" && (
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Firmado
              </span>
            )}
            {registro.estado === "APROBADO" && (
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-teal-100 text-teal-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Firmado físico
              </span>
            )}
          </div>
        )}
      </div>

      {!isReadOnly && showToggle && (
        /* En celular ocupa el ancho y reparte mitades: así los dos rótulos entran sin
           romperse y cada mitad es un blanco de toque decente. */
        <div className="flex w-full gap-2 p-1 bg-gray-100 rounded-lg sm:w-fit">
          <button
            onClick={() => setUserModo("digital")}
            className={`flex-1 min-w-0 px-3 py-1.5 rounded-md text-sm font-medium leading-tight transition-colors sm:flex-none sm:px-4 ${
              modo === "digital" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Completar formulario
          </button>
          <button
            onClick={() => setUserModo("fisico")}
            className={`flex-1 min-w-0 px-3 py-1.5 rounded-md text-sm font-medium leading-tight transition-colors sm:flex-none sm:px-4 ${
              modo === "fisico" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Cargar PDF físico
          </button>
        </div>
      )}

      {/* ── Modo PDF físico ──
          Todo el flow (drop zone, chequeos QR, detección firma, dialogs, rotación)
          vive en <CargaFisicaUploader>. Este componente le entrega el archivo listo
          y los detalles de override para auditoría a través del callback onSubmit. */}
      {mostrandoCargaFisica && (
        <CargaFisicaUploader
          esperadoPlanillaId={(registro.planillaId ?? "").toLowerCase()}
          esperadoElementoTareaId={(registro.elementoTareaId ?? "").toLowerCase()}
          hayFirmasFisicas={hayFirmasFisicas}
          cantidadFirmasFisicas={cantidadFirmasFisicas}
          rechazarBajaResolucion={rechazarBajaResolucion}
          anchoMinimoImagen={anchoMinimoImagen}
          cortarAdjuntosEscaneo={cortarAdjuntosEscaneo}
          onSubmit={handleSubmitFisico}
          isSubmitting={isSaving}
          submitLabel="Subir y completar"
          submittingLabel="Subiendo..."
          titulo="Cargar planilla física escaneada"
          descripcion="Adjuntá el archivo PDF o imagen (JPG/PNG) de la planilla completada a mano."
        >
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Observaciones (opcional)</label>
            <Textarea
              placeholder="Notas sobre el registro físico..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
            />
          </div>
        </CargaFisicaUploader>
      )}

      {/* ── Observaciones del registro (read-only) ──
          Sólo si tienen texto. Pasó a ser la única vista que les queda en el registro
          digital, donde el formulario ya no las edita, y sigue siendo la del físico ya
          cargado. Sin esto, lo que se escribió antes de este cambio quedaría sin ningún
          lugar donde verse.

          No se muestran mientras el uploader físico está en pantalla: ahí el texto está
          en su propio textarea, editable, y se vería dos veces. */}
      {registro.observaciones && !mostrandoCargaFisica && (
        <div className="rounded-xl border bg-white p-4 space-y-1.5 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Observaciones
          </p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{registro.observaciones}</p>
        </div>
      )}

      {/* ── Registro digital: las dos vistas ──
          Se muestran cuando el registro es de solo lectura digital (para visualizar), o
          cuando es editable y el proyecto permite completar digitalmente. `vistaEfectiva`
          elige entre el PDF y el formulario, y con la vista cambia también dónde quedan
          los adjuntos y las firmas. */}
      {mostrandoPdf && (
        <VistaConRiel className="space-y-2" riel={riel}>
          {hayToggle && <VistaToggle vista={vistaEfectiva} onChange={setVistaUsuario} />}
          {/* El PDF del registro, embebido. Es literalmente el documento que se firma
              y el que se entrega, así que a la hora de firmar es la vista que importa;
              el formulario read-only mostraba los mismos datos con otra cara.
              Va en un <iframe> y no en un canvas con pdfjs a propósito: el visor del
              navegador ya trae zoom, búsqueda, impresión y descarga.

              OJO: esto depende de que la ruta del preview salga con
              `frame-ancestors 'self'` — ver RUTAS_EMBEBIDAS en next.config.ts. El
              valor global del sitio es `'none'`, que bloquea el framing incluso
              desde el mismo origen y deja este visor en blanco. */}
          <iframe
            src={`/api/registros/${registroId}/pdf/preview`}
            title="Registro en PDF"
            className="hidden md:block w-full h-[calc(100vh-18rem)] min-h-[32rem] rounded-xl border bg-white"
          />
          <p className="hidden md:block text-xs text-muted-foreground">
            Si el visor no carga,{" "}
            <a
              href={`/api/registros/${registroId}/pdf/preview`}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-gray-700"
            >
              abrí el PDF en una pestaña nueva
            </a>
            .
          </p>
          {/* El visor embebido es de tablet para arriba: en celular el iframe no sirve
              (ver el comentario de arriba) y el PDF se dibuja con pdfjs, página por
              página en un canvas. Es el mismo documento y la misma pantalla, que es lo
              que importa cuando lo que sigue es firmarlo.

              El componente no hace nada mientras su contenedor mida 0, así que acá
              arriba de md —donde este div es `display:none`— no baja el PDF por
              segunda vez al lado del que ya trae el iframe. */}
          <div className="md:hidden">
            <RegistroPdfMovil registroId={registroId} />
          </div>
        </VistaConRiel>
      )}

      {mostrandoFormulario && (
        <VistaConRiel className="space-y-6" riel={riel}>
          {hayToggle && <VistaToggle vista={vistaEfectiva} onChange={setVistaUsuario} />}
          {/* Registro dejado a medio completar: quién lo tocó último y cuánto falta.
              Sin esto, el que lo retoma —que puede ser otra persona— no sabe si lo que
              ve es todo lo que había ni si alguien lo está llenando en paralelo. */}
          {!isReadOnly && registro.estado === "EN_PROCESO" && registro.valores.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span className="font-medium">Registro a medio completar.</span>{" "}
              {registro.camposPendientes > 0
                ? `Quedan ${registro.camposPendientes} campo(s) obligatorio(s).`
                : "No falta ningún campo obligatorio: podés cerrarlo."}
              {registro.updatedByNombre && (
                <> Último guardado por <span className="font-medium">{registro.updatedByNombre}</span>
                  {registro.updatedAt && ` el ${new Date(registro.updatedAt).toLocaleString("es-AR", {
                    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}`}.
                </>
              )}
            </div>
          )}
          {ordenSecciones.map((seccionId) => {
            const seccion = secciones.find((s) => s.id === seccionId)
            const camposSeccion = camposPorSeccion[seccionId]
              // Fuera el Espacio (13): es alto reservado para escribir a mano en el PDF
              // impreso, así que en el formulario digital no hay nada que completar ahí.
              // Se filtra acá y no dentro de CampoInput porque lo que sobra es la celda
              // de la grilla: devolviendo null adentro, packCampos ya le reservó el lugar
              // y queda el hueco igual.
              .filter((c) => c.visible && c.campoTipoDato !== 13)
              .sort((a, b) => a.orden - b.orden)
              // Las tablas (tipo 9) ocupan el ancho completo: forzamos tamano 12 para que
              // packCampos las ubique en su propia fila y no se compriman junto a otros campos.
              .map((c) => (c.campoTipoDato === 9 ? { ...c, tamano: 12 } : c))

            // Sección que quedó sin campos visibles —todos ocultos, o todos Espacio—:
            // sin esto se dibuja la tarjeta vacía con el título solo.
            if (camposSeccion.length === 0) return null

            return (
              <div key={seccionId} className="rounded-xl border bg-white overflow-hidden">
                {seccion && (
                  <div className="px-4 py-3 bg-gray-50 border-b sm:px-5">
                    <h2 className="font-semibold text-gray-800">{seccion.nombre}</h2>
                  </div>
                )}
                {/* Padding y aire más chicos en celular: con 20px de cada lado los
                    campos quedan en ~290px y las tablas pierden una columna entera. */}
                <div className="p-4 space-y-4 sm:p-5 sm:space-y-5">
                  {packCampos<PlanillaCampoDetalle>(camposSeccion).map((fila, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 sm:gap-4">
                      {fila.map((campo) => (
                        <div key={campo.id} className={`col-span-12 min-w-0 ${COL_SPAN_SM[clampTamano(campo.tamano)]}`}>
                          <CampoInput
                            campo={campo}
                            value={valores[campo.id] ?? campo.valorDefault ?? ""}
                            observacion={observacionesCampo[campo.id] ?? ""}
                            onChange={(v) => setValue(campo.id, v)}
                            onObservacionChange={(v) => setObsCampo(campo.id, v)}
                            readOnly={isReadOnly || campo.soloLectura}
                            hasError={!!errors[campo.id]}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Acá iba un campo "Observaciones generales" del registro. Se saca porque es
              del camino físico, no de éste: cada planilla define su propio campo de
              observaciones cuando hace falta, y ése sí sale en el PDF del registro —este
              no salía en ninguno—. Tenerlo en los dos lados invitaba a escribir lo mismo
              dos veces con un solo lado llegando al documento.

              El estado `observaciones` se queda: lo usa el textarea del uploader físico,
              que es el mismo campo del registro. */}
          {!isReadOnly && (
            <div className="flex flex-col items-stretch gap-2 pb-4 sm:items-end">
              {Object.values(errors).some(Boolean) && (
                <p className="text-sm text-red-600">
                  Completá los campos obligatorios marcados en rojo antes de completar el
                  registro. Si querés dejarlo a medio llenar, usá «Guardar borrador».
                </p>
              )}
              {errorGuardado && (
                <p className="text-sm text-red-600 max-w-xl sm:text-right">{errorGuardado}</p>
              )}
              {borradorGuardadoEn && !errorGuardado && (
                <p className="text-xs text-green-700">
                  Borrador guardado a las{" "}
                  {borradorGuardadoEn.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  {registro.camposPendientes > 0
                    ? ` — quedan ${registro.camposPendientes} campo(s) obligatorio(s).`
                    : " — está completo, cerralo con «Guardar y completar»."}
                </p>
              )}
              {/* En celular los dos botones al ancho completo y apilados, con el que
                  cierra el registro arriba: en fila se pisaban los rótulos. El reverse
                  es para no cambiar el orden en el que se leen de izquierda a derecha
                  de sm para arriba. */}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                {/* Guardar borrador: persiste lo cargado sin exigir los obligatorios ni
                    cerrar el registro. Lo puede seguir otra persona desde la misma
                    pantalla — el registro no tiene dueño. */}
                <Button
                  variant="outline"
                  onClick={() => handleSubmitDigital(true)}
                  disabled={isSaving}
                  className="gap-2 w-full sm:w-auto"
                >
                  {completarDigital.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Save className="h-4 w-4" />
                  }
                  Guardar borrador
                </Button>
                <Button
                  onClick={() => handleSubmitDigital(false)}
                  disabled={isSaving}
                  className="gap-2 px-6 w-full sm:w-auto"
                >
                  {isSaving
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Save className="h-4 w-4" />
                  }
                  Guardar y completar
                </Button>
              </div>
            </div>
          )}
        </VistaConRiel>
      )}

      {/* ── Adjuntos y firmas sin riel ── sólo cuando no se está mostrando ninguna de
          las dos vistas del registro: el único caso es el uploader del PDF físico, que
          ocupa la pantalla sola. En las dos vistas van en el riel. */}
      {!mostrandoPdf && !mostrandoFormulario && (
        <>
          {adjuntos}
          {firmas}
        </>
      )}

      {/* Dialog de "próximo ciclo de preservación" — se abre cuando el backend
          confirma que generó el próximo ElementoTarea al completar/firmar. En
          los flujos de completar hacemos router.back() al cerrarlo. */}
      <ProximoCicloDialog
        open={!!proximoCicloFecha}
        fecha={proximoCicloFecha}
        onClose={() => {
          setProximoCicloFecha(null)
          router.back()
        }}
      />

      {/* Firmá ahora: el registro acaba de quedar cerrado y a esta persona le toca una
          de las firmas que quedaron pendientes.

          "Firmar ahora" la deja en la pantalla y abre la firma en el riel; "Después"
          vuelve a la lista, que es lo que pasaba siempre. Cerrarlo sin elegir también
          la deja acá: no se pierde nada y las firmas quedan a la vista. */}
      <AlertDialog open={!!ofrecerFirma} onOpenChange={(abierto) => !abierto && setOfrecerFirma(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Registro completado
            </AlertDialogTitle>
            <AlertDialogDescription>
              Te toca firmarlo como{" "}
              <span className="font-medium text-gray-800">{ofrecerFirma?.rolNombre}</span>. Podés
              hacerlo ahora o más tarde, desde este registro o desde Mis firmas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setOfrecerFirma(null)
                router.back()
              }}
            >
              Después
            </AlertDialogCancel>
            <AlertDialogAction
              className="gap-1.5"
              onClick={() => {
                setAbrirSlotFirma(ofrecerFirma?.id ?? null)
                setOfrecerFirma(null)
              }}
            >
              <PenLine className="h-4 w-4" />
              Firmar ahora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Sección de firmas ────────────────────────────────────────────────────────

function FirmasSection({
  registroId,
  canWrite,
  permiteFirmar,
  esRegistroFisico,
  abrirSlotId,
}: {
  registroId: string
  canWrite: boolean
  /** Si el estado del registro todavía admite firmas. Ver es siempre posible; firmar
   * sólo en COMPLETADO y FIRMADO — lo mismo que valida FirmarAsync en el backend. */
  permiteFirmar: boolean
  /** Si el registro se completó como físico (escaneo). Slots Fisica solo se
   * auto-firman con el escaneo en registros físicos — si el registro es digital,
   * los slots Fisica se firman electrónicamente como cualquier otro. */
  esRegistroFisico: boolean
  /** Slot que la tarjeta abre y centra sola, sin que el usuario lo busque. Lo manda
   * la pantalla cuando acaba de completar el registro y eligió firmarlo en el
   * momento: el botón "Firmar" vive en el riel y puede quedar fuera de la vista. */
  abrirSlotId?: string | null
}) {
  const { data: raw, isLoading } = useGetFirmasStatus(registroId)
  const firmar = useFirmarRegistro(registroId)
  const status = (raw as any)?.data ?? raw

  // Flag global — decide si se pide/muestra garabato al firmar. Cuando OFF, no
  // consultamos la firma guardada del perfil ni ofrecemos el pad para dibujar.
  const renderizarGarabato: boolean = status?.renderizarGarabatoFirma ?? false
  const firmaVisualFallo: boolean = status?.firmaVisualFallo ?? false
  const miFirmaQuery = useGetMiFirma(renderizarGarabato)
  const uploadMiFirma = useUploadMiFirma()

  const [slotFirmando, setSlotFirmando] = useState<string | null>(null)
  /**
   * La apertura automática deja de valer en cuanto el usuario cierra o firma ese slot.
   * Sin esto, limpiar `slotFirmando` haría que el panel se vuelva a abrir solo, porque
   * `abrirSlotId` sigue apuntando al mismo lugar.
   */
  const [autoAperturaDescartada, setAutoAperturaDescartada] = useState(false)
  const [observacionFirma, setObservacionFirma] = useState("")
  const [padIsEmpty, setPadIsEmpty] = useState(true)
  const padRef = useRef<SignaturePadHandle | null>(null)
  const tarjetaRef = useRef<HTMLDivElement | null>(null)

  // El slot con el panel de firma abierto. Es derivado y no estado propio: lo que la
  // pantalla pide (`abrirSlotId`) vale hasta que el usuario toque algo.
  const slotAbierto = slotFirmando ?? (autoAperturaDescartada ? null : abrirSlotId ?? null)

  function cerrarPanelFirma() {
    setSlotFirmando(null)
    setAutoAperturaDescartada(true)
  }

  // Traer a la vista la tarjeta cuando la pantalla pide abrir un slot: el botón de
  // firmar vive en el riel y puede quedar abajo de todo. Espera a que cargue el estado
  // de firmas porque antes de eso la tarjeta no está en el DOM.
  useEffect(() => {
    if (!abrirSlotId || isLoading) return
    tarjetaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [abrirSlotId, isLoading])

  // Preservación: la última firma electrónica puede haber gatillado el próximo
  // ciclo. Cuando el response lo indica, mostramos el dialog con la fecha; el
  // usuario ya está en la pantalla del registro y no hace falta navegar.
  const [proximoCicloFecha, setProximoCicloFecha] = useState<string | null>(null)

  const firmaGuardadaUrl = renderizarGarabato ? (miFirmaQuery.data?.data?.url ?? null) : null
  // 3 modos: sin-garabato (flag OFF), guardada (flag ON + perfil), dibujar (flag ON + sin perfil).
  const modoEfectivo: "sin-garabato" | "guardada" | "dibujar" =
    !renderizarGarabato ? "sin-garabato" : firmaGuardadaUrl ? "guardada" : "dibujar"

  async function handleFirmar(rolNombre: string) {
    // Resolver firma según el modo:
    //  - "sin-garabato" → sin dato visual (flag global OFF).
    //  - "guardada"     → backend usa la firma del perfil (evita CORS browser→Azure).
    //  - "dibujar"      → mandamos el dataURL del pad y lo guardamos en perfil.
    let datosFirma: string | null = null
    let usarFirmaGuardada = false
    if (modoEfectivo === "guardada" && firmaGuardadaUrl) {
      usarFirmaGuardada = true
    } else if (modoEfectivo === "dibujar") {
      datosFirma = padRef.current?.getDataUrl() ?? null
      if (!datosFirma) return
      // Auto-guardado en perfil: la primera firma dibujada queda en el perfil
      // y las próximas caen automáticamente en modo "guardada".
      try { await uploadMiFirma.mutateAsync(datosFirma) } catch { /* ignore */ }
    }

    const res = await firmar.mutateAsync({
      rolFirmante: rolNombre,
      observaciones: observacionFirma || null,
      datosFirma,
      usarFirmaGuardada,
    })
    cerrarPanelFirma()
    setObservacionFirma("")

    const info = (res as { data?: RegistroDetalle } | undefined)?.data?.preservacionCicloGenerado
    if (info?.generado && info.fechaPlanificadaProximo) {
      setProximoCicloFecha(info.fechaPlanificadaProximo)
    }
  }

  if (isLoading) return null

  const slots: any[] = status?.slots ?? []
  const sinSlots = slots.length === 0
  // Firmar necesita las dos cosas: permiso de escritura y un estado que las acepte.
  const puedeFirmarAhora = canWrite && permiteFirmar

  const proximoCicloDialog = (
    <ProximoCicloDialog
      open={!!proximoCicloFecha}
      fecha={proximoCicloFecha}
      onClose={() => setProximoCicloFecha(null)}
    />
  )

  /**
   * Sin slots configurados no mostramos nada. Acá iba una tarjeta de "firma libre" que
   * afirmaba «Registro firmado» en base a `todasLasFirmasCompletadas`, que el backend
   * calcula como "todos los slots obligatorios están firmados" — verdadero por vacuidad
   * cuando no hay ninguno. O sea que un registro de una planilla que no requiere firma
   * decía estar firmado sin que nadie hubiera firmado, y el botón de firmar de esa misma
   * tarjeta era inalcanzable por exactamente la misma razón.
   *
   * Si alguna vez hace falta la firma libre, lo primero a arreglar es el DTO: tiene que
   * informar las firmas realmente cargadas en vez de un booleano vacuo.
   */
  if (sinSlots) return null

  return (
    <>
    <div ref={tarjetaRef} className="rounded-xl border bg-white overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between sm:px-5">
        <h2 className="font-semibold text-gray-800">Firmas</h2>
        <span className="text-xs text-muted-foreground">
          {status.firmasCompletadas} / {status.totalFirmas} completadas
        </span>
      </div>
      <div className="divide-y">
        {slots.map((slot: any) => {
          const firmado = !!slot.firmaId
          const esActivo = slotAbierto === slot.id

          return (
            <div key={slot.id} className="p-4 space-y-3">
              {/* Envuelve: el nombre del rol más el nombre y la fecha del firmante no
                  entran en un renglón de celular. */}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  {firmado ? (
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-green-100">
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    </span>
                  ) : (
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-100">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 flex flex-wrap items-center gap-1.5">
                      {slot.rolNombre}
                      {/* Badge "En papel" solo cuando el registro es físico —
                          en registros digitales el slot Fisica se firma electrónicamente. */}
                      {slot.tipoFirma === 2 && esRegistroFisico && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px] font-medium">
                          En papel
                        </span>
                      )}
                    </p>
                    {slot.descripcion && (
                      <p className="text-xs text-muted-foreground">{slot.descripcion}</p>
                    )}
                  </div>
                </div>

                {firmado ? (
                  <div className="text-xs text-muted-foreground sm:text-right">
                    <p className="font-medium text-gray-700">{slot.nombreFirmante}</p>
                    <p>{new Date(slot.fechaFirma).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                ) : slot.tipoFirma === 2 && esRegistroFisico && !firmaVisualFallo ? (
                  // Slot configurado como Fisica + registro físico → se auto-firma al subir
                  // el PDF escaneado. Excepción: cuando FirmaVisualFallo=true (detección
                  // visual falló + flag FIRMA_DIGITAL_SI_VISUAL_FALLA ON), el slot debe
                  // firmarse digitalmente — cae al botón "Firmar" de abajo.
                  // Si el registro es digital, no bloqueamos: el user firma electrónicamente
                  // como cualquier slot Digital (el backend ya lo permite).
                  <span className="inline-flex items-center gap-1 text-xs text-amber-700 shrink-0">
                    <Clock className="h-3 w-3" />
                    Se marca al subir el PDF físico
                  </span>
                ) : puedeFirmarAhora && slot.puedeFirearUsuarioActual ? (
                  !esActivo && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-8 shrink-0"
                      onClick={() => { setSlotFirmando(slot.id); setObservacionFirma("") }}
                    >
                      <PenLine className="h-3.5 w-3.5" />
                      Firmar
                    </Button>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400 shrink-0">
                    <Lock className="h-3 w-3" />
                    Sin permiso
                  </span>
                )}
              </div>

              {esActivo && (
                <div className="space-y-3 sm:pl-8">
                  <FirmaCapturaInline
                    firmaGuardadaUrl={firmaGuardadaUrl}
                    modoEfectivo={modoEfectivo}
                    padRef={padRef}
                    setPadIsEmpty={setPadIsEmpty}
                  />
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Observaciones (opcional)
                    </label>
                    <Textarea
                      placeholder="Notas sobre esta firma..."
                      value={observacionFirma}
                      onChange={(e) => setObservacionFirma(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleFirmar(slot.rolNombre)}
                      disabled={
                        firmar.isPending
                        || uploadMiFirma.isPending
                        || (modoEfectivo === "dibujar" && padIsEmpty)
                      }
                    >
                      {firmar.isPending || uploadMiFirma.isPending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <PenLine className="h-3.5 w-3.5" />
                      }
                      Confirmar firma
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cerrarPanelFirma}
                      disabled={firmar.isPending}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
    {proximoCicloDialog}
    </>
  )
}

// ─── Captura de firma compartida (libre + slot) ─────────────────────────────

/**
 * El esqueleto que comparten las dos vistas del registro: el documento —el PDF o el
 * formulario— a la izquierda y un riel a la derecha con los adjuntos y las firmas.
 *
 * Existe para que las dos sean la misma pantalla. El sentido es leer el registro
 * mientras se actúa sobre él, y lo que se hace sobre él estaba un scroll entero más
 * abajo: en la vista PDF porque el iframe mide una pantalla completa, y en la del
 * formulario porque el formulario puede medir varias.
 *
 * El riel va en 26rem y no menos porque adentro entra el pad de firma, que se dibuja
 * inline; con eso la columna izquierda queda en ~840px a 1280, que para el PDF es un
 * A4 al 100%. Por debajo de xl se apila: en un ancho así el documento ya se come el
 * viewport y el riel no tiene dónde ir.
 *
 * El tope de alto es por el formulario. Un riel sticky más alto que el viewport nunca
 * deja ver su parte de abajo —y el riel crece con los archivos y los slots de firma—,
 * así que con `max-h` + `overflow-y-auto` se scrollea solo cuando le hace falta.
 */
function VistaConRiel({
  riel,
  className = "",
  children,
}: {
  riel: React.ReactNode
  /** Espaciado de la columna del documento: el PDF y el formulario no respiran igual. */
  className?: string
  children: React.ReactNode
}) {
  return (
    /* `grid-cols-1` no es decorativo. Sin él, la única columna del celular se mide
       `auto`: queda del ancho del contenido más terco que tenga adentro —una tabla
       ancha, un canvas, un texto que no corta— y se estira más allá de la pantalla.
       Todo lo que adentro mide `w-full` se estira con ella y termina afuera, que es
       lo que pasaba con el switch de vista. `grid-cols-1` es `minmax(0,1fr)`: la
       columna no pasa del ancho disponible y lo que no entra desborda adentro de su
       propia caja, que es donde se puede manejar. */
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start">
      <div className={`min-w-0 ${className}`}>{children}</div>
      <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
        {riel}
      </aside>
    </div>
  )
}

/**
 * Switch entre el PDF del registro y el formulario. Mismo diseño que el toggle
 * digital/físico de arriba para que se lean como el mismo tipo de control.
 */
function VistaToggle({
  vista,
  onChange,
}: {
  vista: "pdf" | "formulario"
  onChange: (v: "pdf" | "formulario") => void
}) {
  return (
    <div className="flex w-full gap-2 p-1 bg-gray-100 rounded-lg sm:w-fit">
      {/* Dos rótulos por opción: en celular el corto. "Ver como PDF | Ver formulario"
          son 250px de texto que no corta, y en un teléfono angosto eso no entra. */}
      {([
        ["pdf", "PDF", "Ver como PDF"],
        ["formulario", "Formulario", "Ver formulario"],
      ] as const).map(([valor, corto, largo]) => (
        <button
          key={valor}
          onClick={() => onChange(valor)}
          className={`flex-1 min-w-0 px-3 py-1.5 rounded-md text-sm font-medium leading-tight transition-colors sm:flex-none sm:px-4 ${
            vista === valor ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="sm:hidden">{corto}</span>
          <span className="hidden sm:inline">{largo}</span>
        </button>
      ))}
    </div>
  )
}

function FirmaCapturaInline({
  firmaGuardadaUrl,
  modoEfectivo,
  padRef,
  setPadIsEmpty,
}: {
  firmaGuardadaUrl: string | null
  modoEfectivo: "sin-garabato" | "guardada" | "dibujar"
  padRef: React.RefObject<SignaturePadHandle | null>
  setPadIsEmpty: (v: boolean) => void
}) {
  // "sin-garabato" → flag global OFF; no mostramos ninguna UI de captura.
  if (modoEfectivo === "sin-garabato") return null

  return (
    <div className="space-y-2">
      {modoEfectivo === "guardada" && firmaGuardadaUrl && (
        <div className="rounded-md border bg-white p-2 max-w-sm">
          <img src={firmaGuardadaUrl} alt="Tu firma" className="max-h-28 max-w-full object-contain mx-auto" />
          <p className="mt-1 text-[11px] text-center text-muted-foreground">
            Se usará tu firma guardada en el perfil.
          </p>
        </div>
      )}

      {modoEfectivo === "dibujar" && (
        <div className="space-y-1.5">
          <SignaturePad ref={padRef} height={140} onChange={(empty) => setPadIsEmpty(empty)} />
          <p className="text-[11px] text-muted-foreground">
            Esta firma se guardará en tu perfil para próximas veces.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Campo dinámico ──────────────────────────────────────────────────────────

function CampoInput({
  campo, value, observacion, onChange, onObservacionChange, readOnly, hasError,
}: {
  campo: PlanillaCampoDetalle
  value: string
  observacion: string
  onChange: (v: string) => void
  onObservacionChange: (v: string) => void
  readOnly: boolean
  hasError?: boolean
}) {
  const label = (
    <div className="flex flex-col gap-0.5">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
        {campo.campoEtiqueta}
        {campo.esObligatorio && <span className="text-red-500">*</span>}
        {campo.campoUnidad && (
          <span className="text-xs text-muted-foreground font-normal">({campo.campoUnidad})</span>
        )}
      </label>
      {campo.campoEtiquetaAlt && (
        <span className="text-xs italic text-muted-foreground">{campo.campoEtiquetaAlt}</span>
      )}
    </div>
  )

  let input: React.ReactNode

  switch (campo.campoTipoDato) {
    case 2: // Número
      input = (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          placeholder="0"
        />
      )
      break
    case 3: // Fecha
      input = (
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
        />
      )
      break
    case 4: // Boolean
      // Variante "casilla de marca": un único checkbox que se tilda o no, en vez del
      // Sí/No. El valor persistido es el mismo booleano ("true"/"" ), así que prender
      // o apagar el flag en el Campo no invalida registros ya cargados.
      //
      // Devolvemos temprano porque el label va A LA DERECHA del checkbox, no arriba
      // como en el resto de los tipos.
      if (campo.campoMostrarComoMarca) {
        const marcado = value === "true"
        return (
          <div id={`campo-${campo.id}`} className="space-y-1">
            <label
              className={`flex items-start gap-2 rounded-md border px-3 py-2 transition-colors ${
                readOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-gray-50"
              } ${marcado ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"} ${
                hasError ? "border-red-500" : ""
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-blue-600"
                checked={marcado}
                disabled={readOnly}
                onChange={(e) => !readOnly && onChange(e.target.checked ? "true" : "")}
              />
              <span className="flex flex-col gap-0.5">
                <span
                  className={`text-sm ${marcado ? "font-medium text-blue-900" : "text-gray-700"}`}
                >
                  {campo.campoEtiqueta}
                  {campo.esObligatorio && <span className="text-red-500"> *</span>}
                </span>
                {campo.campoEtiquetaAlt && (
                  <span className="text-xs italic text-muted-foreground">
                    {campo.campoEtiquetaAlt}
                  </span>
                )}
              </span>
            </label>
            {hasError && (
              <p className="text-xs text-red-500">Este campo es obligatorio.</p>
            )}
          </div>
        )
      }
      input = (
        <Select value={value} onValueChange={(v) => onChange(v ?? "")} disabled={readOnly}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccioná...">
              {value === "true" ? "Sí" : value === "false" ? "No" : "Seleccioná..."}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Sí</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      )
      break
    case 5: { // Lista
      const opcionesOrdenadas = [...campo.opciones].sort((a, b) => a.orden - b.orden)
      // renderMode: 0=Auto, 1=Inline, 2=Dropdown, 3=Checklist.
      // En web Checklist se renderiza como Inline (la "tabla agrupada" es solo del PDF).
      // Auto: pocas opciones (≤4) → inline; muchas → dropdown.
      const useInline =
        campo.renderMode === 1 ||
        campo.renderMode === 3 ||
        (campo.renderMode !== 2 && opcionesOrdenadas.length > 0 && opcionesOrdenadas.length <= 4)

      if (useInline) {
        input = (
          <div className="flex flex-wrap gap-2">
            {opcionesOrdenadas.map((op) => {
              const selected = value === op.valor
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => !readOnly && onChange(op.valor)}
                  disabled={readOnly}
                  className={`px-3 py-1.5 rounded-md border text-sm font-medium cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    selected
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {op.etiqueta}
                </button>
              )
            })}
          </div>
        )
      } else {
        const selectedLabel = opcionesOrdenadas.find((op) => op.valor === value)?.etiqueta
        input = (
          <Select value={value} onValueChange={(v) => onChange(v ?? "")} disabled={readOnly}>
            <SelectTrigger className="cursor-pointer disabled:cursor-not-allowed">
              <SelectValue placeholder="Seleccioná una opción...">
                {selectedLabel ?? "Seleccioná una opción..."}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {opcionesOrdenadas.map((op) => (
                <SelectItem key={op.id} value={op.valor}>
                  {op.etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }
      break
    }
    case 11: { // Checklist — opciones como checkboxes seleccionables (una única
      //         respuesta a la vez). El valor persistido es el `valor` de la opción
      //         tildada, o cadena vacía si ninguna. Click sobre la ya tildada la
      //         limpia — así el user puede corregirse sin necesitar un botón extra.
      const opcionesOrdenadas = [...campo.opciones].sort((a, b) => a.orden - b.orden)
      input = (
        <div className="flex flex-col gap-1.5">
          {opcionesOrdenadas.map((op) => {
            const checked = value === op.valor
            return (
              <label
                key={op.id}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  readOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-gray-50"
                } ${checked ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"}`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 rounded border-gray-300 accent-blue-600"
                  checked={checked}
                  disabled={readOnly}
                  onChange={() => !readOnly && onChange(checked ? "" : op.valor)}
                />
                <span className={checked ? "font-medium text-blue-900" : "text-gray-700"}>
                  {op.etiqueta}
                </span>
              </label>
            )
          })}
        </div>
      )
      break
    }
    case 14: // Croquis — el operador dibuja; se guarda el PNG en base64.
      input = (
        <CampoCroquisInput
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          altoMm={campo.campoAltoMm ?? 20}
        />
      )
      break
    case 9: // Tabla — celdas de texto (matriz fija o dinámica)
      input = (
        <CampoTablaInput
          campo={campo}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
      )
      break
    case 10: // Label — texto fijo display-only (no input, no label de campo)
      return (
        <div
          id={`campo-${campo.id}`}
          className={`${TAMANO_TEXTO_CLASS[(campo.campoTamanoTexto ?? 0) as TamanoTexto]} ${campo.campoSinPadding ? "" : "px-2 py-1.5"} ${campo.campoSinMargen ? "-my-2.5" : ""} ${campo.campoFondoGris ? "bg-gray-100" : ""} ${campo.campoConBorde ? "border border-gray-300 rounded" : ""} ${campo.campoNegrita ? "font-bold" : ""}`}
          style={{ textAlign: campo.campoAlineacion === 1 ? "center" : campo.campoAlineacion === 2 ? "right" : "left" }}
        >
          {campo.campoEtiqueta}
        </div>
      )
    case 16: { // Leyenda — fila de códigos que explica las respuestas válidas de los
      //         campos de arriba. Display-only: mismas opciones que usa el PDF.
      const opcionesLeyenda = [...campo.opciones].sort((a, b) => a.orden - b.orden)
      return (
        <div id={`campo-${campo.id}`} className="py-1">
          {opcionesLeyenda.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">Leyenda sin códigos definidos.</p>
          ) : (
            <div className="flex flex-wrap overflow-hidden rounded-md border border-gray-300">
              {opcionesLeyenda.map((op) => (
                <div key={op.id} className="flex min-w-0 flex-1 items-stretch border-r last:border-r-0">
                  <span className="shrink-0 border-r bg-gray-100 px-2 py-1 text-xs font-bold text-gray-800">
                    {op.valor}
                  </span>
                  <span className="min-w-0 flex-1 px-2 py-1 text-xs text-gray-700">
                    {op.etiqueta}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    case 15: // Nota — texto fijo del diseño. Se muestra igual que en el PDF, con los
      //        saltos de línea respetados (whitespace-pre-line).
      return (
        <div
          id={`campo-${campo.id}`}
          className={`${TAMANO_TEXTO_CLASS[(campo.campoTamanoTexto ?? 0) as TamanoTexto]} whitespace-pre-line ${campo.campoSinPadding ? "" : "px-3 py-2"} ${
            campo.campoSinMargen ? "-my-2.5" : ""
          } ${campo.campoFondoGris ? "bg-gray-100" : ""} ${
            campo.campoConBorde ? "border border-gray-300 rounded" : ""
          } ${campo.campoNegrita ? "font-bold" : ""}`}
          style={{
            textAlign:
              campo.campoAlineacion === 1 ? "center" : campo.campoAlineacion === 2 ? "right" : "left",
          }}
        >
          {campo.campoTextoLargo ?? ""}
        </div>
      )
    // Espacio — bloque vacío del PDF: alto reservado para escribir a mano en el papel.
    // Acá tenía un cartel que explicaba el hueco, y el cartel era el hueco: en el
    // formulario digital no se completa nada de eso. La lista de campos ya lo filtra
    // antes de llegar; esto está para que no caiga en el `default` y salga un input de
    // texto si algún día lo renderiza otro llamador.
    case 13:
      return null
    case 8: // Imagen — parte de la planilla (global del Campo), sin input
      return (
        <div id={`campo-${campo.id}`} className="space-y-1">
          {campo.campoImagenUrl ? (
            <img
              src={campo.campoImagenUrl}
              alt={campo.campoEtiqueta ?? "Imagen"}
              className="max-w-full h-auto rounded border bg-white"
            />
          ) : (
            <div className="rounded-lg border border-dashed bg-gray-50 px-4 py-3 text-sm text-muted-foreground">
              Imagen no disponible.
            </div>
          )}
        </div>
      )
    case 12: { // TextoArea — multilínea, respeta saltos de línea
      const rows = Math.max(1, Math.min(20, campo.campoNumeroLineas ?? 3))
      input = (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          placeholder={campo.valorDefault ?? ""}
          rows={rows}
        />
      )
      break
    }
    default: // 1 = Texto
      input = (
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          placeholder={campo.valorDefault ?? ""}
        />
      )
  }

  return (
    <div id={`campo-${campo.id}`} className="space-y-1.5">
      {label}
      <div className={hasError ? "ring-2 ring-red-400 rounded-md" : undefined}>
        {input}
      </div>
      {hasError && (
        <p className="text-xs text-red-500">Este campo es obligatorio.</p>
      )}
    </div>
  )
}
