"use client"

import { useState } from "react"
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileUp,
  Loader2,
  QrCode,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import { readQrFromFile, type QrLeidoResult } from "@/features/registros/lib/read-qr"
import { rotateFile } from "@/features/registros/lib/rotate-file"
import {
  useResolverRegistroPorEt,
  type RegistroResolverResult,
} from "@/features/registros/api/use-resolver-registro-por-et"
import { useBreadcrumb } from "@/components/breadcrumb-context"
import type { ApiError } from "@/lib/api-client"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Estados de una fila del batch. Espeja los `EstadoSincronizacion` de la app
// WinForms (Siprecom.Win.Local/Forms/CargaMasiva) pero simplificado — no
// distinguimos "otro proyecto / sin acceso" acá: el backend rechaza la
// resolución con un 403/404 y lo pintamos como `error`.
type FilaEstado =
  | "leyendo-qr"
  | "sin-qr"
  | "qr-invalido"
  | "resolviendo"
  | "listo"
  | "ya-cargado"
  | "estado-incompatible"
  | "subiendo"
  | "sincronizado"
  | "error"

interface Fila {
  id: string
  archivo: File
  estado: FilaEstado
  qr: QrLeidoResult | null
  resuelto: RegistroResolverResult | null
  mensaje: string | null
}

const nuevoId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export default function CargaRapidaQrPage() {
  useBreadcrumb([{ label: "Ejecución" }, { label: "Carga rápida por QR" }])

  const [filas, setFilas] = useState<Fila[]>([])
  const [dragActive, setDragActive] = useState(false)
  const resolver = useResolverRegistroPorEt()

  // Estado agregado para el header.
  const total = filas.length
  const listos = filas.filter((f) => f.estado === "listo" || f.estado === "ya-cargado").length
  const sincronizados = filas.filter((f) => f.estado === "sincronizado").length
  const conError = filas.filter(
    (f) =>
      f.estado === "sin-qr" || f.estado === "qr-invalido" || f.estado === "error",
  ).length
  const puedeSubirTodo =
    listos > 0 && filas.every((f) => f.estado !== "subiendo" && f.estado !== "resolviendo")

  async function procesarArchivos(archivos: File[]) {
    // Agregamos filas en estado "leyendo-qr" y arrancamos el pipeline por cada una.
    // La resolución (llamada al backend) también corre por fila para poder mostrar
    // progreso individual — el volumen esperado es de decenas, no miles.
    const nuevas: Fila[] = archivos.map((archivo) => ({
      id: nuevoId(),
      archivo,
      estado: "leyendo-qr" as FilaEstado,
      qr: null,
      resuelto: null,
      mensaje: null,
    }))
    setFilas((prev) => [...prev, ...nuevas])
    for (const fila of nuevas) {
      void procesarFila(fila.id, fila.archivo)
    }
  }

  async function procesarFila(id: string, archivo: File) {
    const qr = await readQrFromFile(archivo)
    if (!qr.qrEncontrado) {
      actualizar(id, { estado: "sin-qr", qr, mensaje: qr.error ?? "No se detectó QR." })
      return
    }
    if (!qr.esChecklist) {
      actualizar(id, {
        estado: "qr-invalido",
        qr,
        mensaje: qr.error ?? "El QR no es de carga de planilla.",
      })
      return
    }
    // Tenemos elementoTareaId → resolvemos el registro.
    actualizar(id, { estado: "resolviendo", qr })
    try {
      const res = await resolver.mutateAsync(qr.elementoTareaId!)
      actualizar(id, {
        estado: res.data.registroYaExistia ? "ya-cargado" : "listo",
        resuelto: res.data,
        mensaje: res.data.registroYaExistia
          ? "Ya había un borrador — al subir se sobrescribe."
          : null,
      })
    } catch (err) {
      // 409 = conflicto de estado: la tarea no está en un estado que permita la
      // carga (COMPLETADO/APROBADO/FIRMADO/etc.). No es un error técnico —
      // marcamos con un badge menos alarmista que el rojo de "error".
      const apiErr = err as ApiError | undefined
      const isConflict = apiErr?.status === 409
      actualizar(id, {
        estado: isConflict ? "estado-incompatible" : "error",
        mensaje: err instanceof Error ? err.message : "No se pudo resolver el registro.",
      })
    }
  }

  function actualizar(id: string, patch: Partial<Fila>) {
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  function eliminarFila(id: string) {
    setFilas((prev) => prev.filter((f) => f.id !== id))
  }

  function limpiarSincronizados() {
    setFilas((prev) => prev.filter((f) => f.estado !== "sincronizado"))
  }

  async function subirTodas() {
    // Secuencial: mejor UX (feedback claro por fila) y evita saturar el backend
    // en Azure App Service serverless. Con volumen chico no vale la pena
    // paralelizar.
    for (const fila of filas) {
      if (fila.estado !== "listo" && fila.estado !== "ya-cargado") continue
      if (!fila.resuelto) continue
      actualizar(fila.id, { estado: "subiendo" })
      try {
        // Capa 2: si el QR se leyó rotado, corregimos la orientación del
        // archivo antes de subir así el registro queda derecho en el visor.
        const rotacion = fila.qr?.rotacionDetectada ?? 0
        const archivoFinal = await rotateFile(fila.archivo, rotacion)
        const fd = new FormData()
        fd.append("Archivo", archivoFinal)
        // fetch directo con FormData: no usamos apiClient.post porque fuerza
        // Content-Type=application/json y hace JSON.stringify, lo que rompe el
        // multipart. Con `body: FormData` el browser setea el Content-Type con
        // boundary correctamente.
        const res = await fetch(
          `/api/registros/${fila.resuelto.registroId}/completar/fisico`,
          { method: "POST", body: fd },
        )
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: res.statusText }))
          throw new Error(err.message ?? `Error ${res.status} al subir el archivo`)
        }
        actualizar(fila.id, { estado: "sincronizado", mensaje: null })
      } catch (err) {
        actualizar(fila.id, {
          estado: "error",
          mensaje: err instanceof Error ? err.message : "Error al subir.",
        })
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <QrCode className="h-5 w-5 text-blue-700" />
          Carga rápida por QR
        </h1>
        <p className="text-sm text-muted-foreground">
          Soltá los PDFs firmados en papel — el sistema lee el QR de cada uno y los
          asocia al registro correcto. Sólo se aceptan tareas en estado{" "}
          <em>Pendiente</em> o <em>En proceso</em>.
        </p>
      </div>

      {/* KPIs simples */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="En la lista" value={total} />
        <Kpi label="Listos para subir" value={listos} highlight="blue" />
        <Kpi label="Sincronizados" value={sincronizados} highlight="green" />
        <Kpi label="Con problemas" value={conError} highlight="red" />
      </div>

      {/* Dropzone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          const archivos = Array.from(e.dataTransfer.files).filter((f) =>
            /\.(pdf|jpg|jpeg|png)$/i.test(f.name),
          )
          if (archivos.length > 0) void procesarArchivos(archivos)
        }}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50"
        }`}
      >
        <FileUp className="h-8 w-8 text-gray-400 mb-2" />
        <span className="text-sm font-medium text-gray-700">
          Soltá varios archivos acá o hacé clic para seleccionar
        </span>
        <span className="text-xs text-muted-foreground mt-1">
          PDF, JPG o PNG · con QR de planilla en blanco
        </span>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          className="sr-only"
          onChange={(e) => {
            const archivos = Array.from(e.target.files ?? [])
            if (archivos.length > 0) void procesarArchivos(archivos)
            // Reset del input así se puede volver a elegir el mismo archivo.
            e.target.value = ""
          }}
        />
      </label>

      {/* Acciones */}
      {filas.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">
            {total} archivo(s) · {listos} listo(s) para subir
          </span>
          <div className="ml-auto flex items-center gap-2">
            {sincronizados > 0 && (
              <Button variant="outline" size="sm" onClick={limpiarSincronizados} className="gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                Quitar sincronizados
              </Button>
            )}
            <Button
              onClick={subirTodas}
              disabled={!puedeSubirTodo}
              className="gap-1.5 bg-blue-900 hover:bg-blue-800"
            >
              <Upload className="h-4 w-4" />
              Subir todos ({listos})
            </Button>
          </div>
        </div>
      )}

      {/* Tabla */}
      {filas.length > 0 && (
        <div className="rounded-xl border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Archivo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Elemento</TableHead>
                <TableHead>Tarea</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-64" title={f.archivo.name}>
                        {f.archivo.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {(f.archivo.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <EstadoBadge estado={f.estado} mensaje={f.mensaje} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {f.resuelto ? (
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-blue-700 font-semibold">
                          {f.resuelto.elementoTag}
                        </span>
                        <span className="text-gray-700">{f.resuelto.elementoNombre}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {f.resuelto ? (
                      <div className="flex flex-col">
                        <span>{f.resuelto.tareaNombre}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {f.resuelto.planillaNombre ?? "sin planilla"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      onClick={() => eliminarFila(f.id)}
                      disabled={f.estado === "subiendo" || f.estado === "resolviendo"}
                      className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-400 hover:text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Quitar de la lista"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function Kpi({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: "blue" | "red" | "green"
}) {
  const cls =
    highlight === "red"
      ? "text-red-700"
      : highlight === "green"
        ? "text-emerald-700"
        : highlight === "blue"
          ? "text-blue-700"
          : "text-gray-900"
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${cls}`}>{value}</p>
    </div>
  )
}

function EstadoBadge({
  estado,
  mensaje,
}: {
  estado: FilaEstado
  mensaje: string | null
}) {
  const map: Record<FilaEstado, { label: string; cls: string; icon: React.ReactNode }> = {
    "leyendo-qr": {
      label: "Leyendo QR...",
      cls: "bg-gray-100 text-gray-700",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    "sin-qr": {
      label: "Sin QR",
      cls: "bg-gray-100 text-gray-700",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    "qr-invalido": {
      label: "QR inválido",
      cls: "bg-amber-100 text-amber-800",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    resolviendo: {
      label: "Resolviendo...",
      cls: "bg-blue-100 text-blue-800",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    listo: {
      label: "Listo",
      cls: "bg-emerald-100 text-emerald-800",
      icon: <Check className="h-3 w-3" />,
    },
    "ya-cargado": {
      label: "Sobreescribe borrador",
      cls: "bg-violet-100 text-violet-800",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    "estado-incompatible": {
      label: "Ya resuelto",
      cls: "bg-amber-100 text-amber-800",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    subiendo: {
      label: "Subiendo...",
      cls: "bg-blue-100 text-blue-800",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    sincronizado: {
      label: "Sincronizado",
      cls: "bg-emerald-100 text-emerald-800",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    error: {
      label: "Error",
      cls: "bg-red-100 text-red-800",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
  }
  const it = map[estado]
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium w-fit ${it.cls}`}>
        {it.icon}
        {it.label}
      </span>
      {mensaje && (
        <span className="text-[11px] text-muted-foreground max-w-72 line-clamp-2" title={mensaje}>
          {mensaje}
        </span>
      )}
    </div>
  )
}
