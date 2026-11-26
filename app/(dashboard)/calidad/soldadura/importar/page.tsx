"use client"

import { descargarPlantilla, useImportApply, useImportPreview } from "@/features/soldadura/api/use-soldadura"
import { ImportadorExcel } from "@/features/soldadura/components/importador-excel"

/** Carga masiva de los catálogos del módulo: normas, clases, procedimientos, matriz y personas calificadas. */
export default function ImportarSoldaduraPage() {
  const preview = useImportPreview()
  const apply = useImportApply()
  return (
    <ImportadorExcel
      titulo="Importar catálogos desde Excel"
      descripcion={
        <>
          Normas, clases, PQR, WPS con sus pasadas, matriz, soldadores con sus calificaciones y
          personal de END en un solo archivo. Cada fila lleva una columna <code className="text-xs">Accion</code>:
          CREATE, UPDATE, DELETE o SKIP. La hoja <strong>Instrucciones</strong> de la plantilla explica cada columna.
        </>
      }
      ayudaPlantilla="Trae lo que ya está cargado en el proyecto, con todas las filas en SKIP. Cambiá la acción de las filas que quieras tocar y agregá las nuevas con CREATE. En UPDATE, una celda vacía deja el dato como estaba."
      hojas={{
        Normas: "Normas", Clases: "Clases de cañería", PQR: "PQR", WPS: "WPS", Pasadas: "Pasadas de WPS",
        Matriz: "Matriz de soldadura", Soldadores: "Soldadores", Calificaciones: "Calificaciones", PersonalEND: "Personal de END",
      }}
      descargar={descargarPlantilla}
      preview={preview}
      apply={apply}
    />
  )
}
