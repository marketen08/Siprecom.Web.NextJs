"use client"

import { descargarPlantillaJuntas, useImportJuntasApply, useImportJuntasPreview } from "@/features/soldadura/api/use-juntas"
import { ImportadorExcel } from "@/features/soldadura/components/importador-excel"

/**
 * Carga del listado de soldaduras: líneas, piezas, lotes de aporte y juntas. Las
 * juntas aplican las mismas reglas que la pantalla: el WPS sale de la matriz y cada
 * soldador se valida contra sus calificaciones a la fecha de soldadura.
 */
export default function ImportarJuntasPage() {
  const preview = useImportJuntasPreview()
  const apply = useImportJuntasApply()
  return (
    <ImportadorExcel
      titulo="Importar juntas desde Excel"
      descripcion={
        <>
          El listado de soldaduras del isométrico: líneas, piezas con su colada, lotes de aporte y
          juntas con los cuños de raíz y relleno, como en el registro de trazabilidad. El WPS lo
          asigna la matriz y cada soldador se valida a la fecha de soldadura: si no está
          habilitado la fila da error, salvo <code className="text-xs">Forzar = Si</code> con motivo.
          En una carga histórica, la continuidad cuenta también las juntas del mismo archivo.
        </>
      }
      ayudaPlantilla="Trae las líneas, piezas, lotes y juntas ya cargados, en SKIP. La junta se identifica por Línea + Hoja + Número: es la clave para UPDATE y DELETE. La hoja Instrucciones explica cada columna."
      hojas={{ Lineas: "Líneas", Piezas: "Piezas", Consumibles: "Lotes de aporte", Juntas: "Juntas" }}
      descargar={descargarPlantillaJuntas}
      preview={preview}
      apply={apply}
    />
  )
}
