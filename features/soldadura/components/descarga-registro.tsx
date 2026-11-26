"use client"

import { FileSpreadsheet, FileText } from "lucide-react"

import { descargar } from "@/features/soldadura/api/use-inspeccion"
import { Button } from "@/components/ui/button"

/**
 * Un registro generado, en sus dos formatos: Excel para trabajar y PDF, que es el que se
 * adjunta a la tarea del PIE y entra al databook. `ruta` es relativa a /api/soldadura.
 */
export function DescargaRegistro({ ruta, titulo }: { ruta: string; titulo: string }) {
  return (
    <span className="inline-flex">
      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-700" title={`${titulo} (Excel)`} onClick={() => descargar(ruta)}>
        <FileSpreadsheet className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-700" title={`${titulo} (PDF)`} onClick={() => descargar(`${ruta}?formato=pdf`)}>
        <FileText className="h-4 w-4" />
      </Button>
    </span>
  )
}

/** La misma descarga como enlaces de texto, para las barras de resumen. */
export function EnlacesRegistro({ ruta, titulo }: { ruta: string; titulo: string }) {
  return (
    <span className="inline-flex gap-1.5 items-baseline">
      <span>{titulo}:</span>
      <button className="text-blue-700 underline" onClick={() => descargar(ruta)}>Excel</button>
      <button className="text-blue-700 underline" onClick={() => descargar(`${ruta}?formato=pdf`)}>PDF</button>
    </span>
  )
}
