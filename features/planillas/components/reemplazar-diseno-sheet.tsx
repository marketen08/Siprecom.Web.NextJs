"use client"

import { useState } from "react"
import { AlertTriangle, FileJson, Upload } from "lucide-react"

import {
  parseFileJson,
  useReemplazarDiseno,
  useReemplazarDisenoPreview,
  type PlanillaImportPreview,
} from "@/features/planillas/api/use-import-export"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface Props {
  open: boolean
  onClose: () => void
  planillaId: string
  /** Para que el texto diga sobre qué planilla se está trabajando. */
  codigo?: string
  nombre: string
}

/**
 * Reemplaza el DISEÑO de esta planilla con el de un JSON exportado, conservando su
 * identidad.
 *
 * El caso que resuelve: el catálogo tiene la misma planilla dos veces con códigos
 * distintos, y la que las tareas usan es la del diseño viejo. Se exporta la buena y
 * se importa acá: el código, el nombre y el id no cambian, así que las tareas que ya
 * la tienen asignada toman el diseño nuevo.
 *
 * No se confunde con el import de Licenciamiento: ese CREA planillas (o las pisa
 * borrándolas, lo que le cambia el id y por eso está bloqueado cuando hay tareas).
 */
export function ReemplazarDisenoSheet({ open, onClose, planillaId, codigo, nombre }: Props) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [archivo, setArchivo] = useState<unknown>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const previewMut = useReemplazarDisenoPreview(planillaId)
  const applyMut = useReemplazarDiseno(planillaId)

  const preview: PlanillaImportPreview | undefined = previewMut.data?.data
  const resultado = applyMut.data?.data

  const limpiar = () => {
    setFileName(null)
    setArchivo(null)
    setParseError(null)
    previewMut.reset()
    applyMut.reset()
  }

  const cerrar = () => {
    limpiar()
    onClose()
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    limpiar()
    setFileName(file.name)
    try {
      const json = await parseFileJson<unknown>(file)
      setArchivo(json)
      await previewMut.mutateAsync(json)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "No se pudo leer el archivo.")
    }
  }

  const aplicar = async () => {
    if (!archivo) return
    await applyMut.mutateAsync(archivo)
  }

  const errorDelPreview = previewMut.error instanceof Error ? previewMut.error.message : null
  const errorDelApply = applyMut.error instanceof Error ? applyMut.error.message : null

  return (
    <Sheet open={open} onOpenChange={(o) => !o && cerrar()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Importar JSON — reemplazar el diseño</SheetTitle>
          <SheetDescription className="text-xs">
            El diseño de <strong>{codigo ? `${codigo} — ${nombre}` : nombre}</strong> pasa a ser
            el del archivo. El código, el nombre y la versión <strong>no cambian</strong>, así
            que las tareas que ya tienen esta planilla asignada toman el diseño nuevo.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4 px-4 pb-6">
          {/* Archivo */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Archivo JSON</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm hover:bg-gray-50">
              <FileJson className="h-4 w-4 shrink-0 text-blue-600" />
              <span className={fileName ? "truncate" : "truncate text-muted-foreground"}>
                {fileName ?? "Elegir un .json exportado de una planilla"}
              </span>
              <input type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
            </label>
            <p className="text-[11px] text-muted-foreground">
              Se saca con “Descargar JSON” desde el diseñador de la planilla que tiene el
              diseño que querés.
            </p>
          </div>

          {parseError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{parseError}</p>
          )}
          {errorDelPreview && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorDelPreview}</p>
          )}

          {previewMut.isPending && (
            <p className="text-sm text-muted-foreground">Leyendo el archivo…</p>
          )}

          {/* Qué va a pasar */}
          {preview && !resultado && (
            <div className="space-y-3 rounded-lg border bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Qué va a quedar
              </p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Secciones</dt>
                <dd className="tabular-nums">{preview.seccionesACrear}</dd>
                <dt className="text-muted-foreground">Campos en la planilla</dt>
                <dd className="tabular-nums">{preview.planillaCamposACrear}</dd>
                <dt className="text-muted-foreground">Campos nuevos en el catálogo</dt>
                <dd className="tabular-nums">{preview.camposNuevos}</dd>
                <dt className="text-muted-foreground">Campos que se reusan</dt>
                <dd className="tabular-nums">{preview.camposReusados}</dd>
              </dl>

              {/* El archivo trae su propio código: conviene que se vea que NO se aplica,
                  porque es la diferencia con el import de Licenciamiento. */}
              {preview.codigoOriginal && preview.codigoOriginal !== preview.codigoAplicar && (
                <p className="rounded-md bg-blue-50 px-2.5 py-2 text-xs text-blue-800">
                  El archivo viene de <strong>{preview.codigoOriginal}</strong>. Esta planilla
                  sigue siendo <strong>{preview.codigoAplicar}</strong>: sólo se toma el diseño.
                </p>
              )}

              {preview.conflictos.length > 0 && (
                <div className="space-y-1.5">
                  {preview.conflictos.map((c, i) => (
                    <p
                      key={i}
                      className={
                        "flex items-start gap-1.5 rounded-md px-2.5 py-2 text-xs " +
                        (c.severidad === "error"
                          ? "bg-red-50 text-red-800"
                          : "bg-amber-50 text-amber-800")
                      }
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{c.mensaje}</span>
                    </p>
                  ))}
                </div>
              )}

              {preview.esAplicable && (
                <p className="rounded-md bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                  El diseño actual se reemplaza por completo. No se puede deshacer desde la
                  pantalla: si querés poder volver, descargá primero el JSON de esta planilla.
                </p>
              )}
            </div>
          )}

          {errorDelApply && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorDelApply}</p>
          )}

          {resultado && (
            <p
              className={
                "rounded-md px-3 py-2 text-sm " +
                (resultado.aplicado ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700")
              }
            >
              {resultado.mensaje}
            </p>
          )}

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={cerrar} disabled={applyMut.isPending}>
              {resultado?.aplicado ? "Cerrar" : "Cancelar"}
            </Button>
            {!resultado?.aplicado && (
              <Button
                onClick={aplicar}
                disabled={!preview?.esAplicable || applyMut.isPending}
                className="gap-1.5"
              >
                <Upload className="h-4 w-4" />
                {applyMut.isPending ? "Reemplazando…" : "Reemplazar diseño"}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
