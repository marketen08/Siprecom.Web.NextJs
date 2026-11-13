"use client"

import { useMemo, useState } from "react"
import { Plus, X } from "lucide-react"

import type { PlanillaCampoDetalle } from "@/features/planillas/types"
import { Button } from "@/components/ui/button"
import { TABLA_MAX_FILAS, TABLA_MIN_FILAS } from "@/features/campos/lib/tabla-limites"

// Se reexportan para no obligar a cambiar el import en todo lo que ya los traía de acá.
// La definición vive en features/campos porque es un límite de la planilla, no de la carga.
export { TABLA_MAX_FILAS, TABLA_MIN_FILAS }

/**
 * Parsea el texto que deja una planilla de cálculo en el portapapeles.
 *
 * Excel, Sheets y LibreOffice copian TSV: celdas separadas por tab, filas por salto de
 * línea. La celda que contenga un tab, un salto o una comilla va entre comillas dobles, y
 * las comillas de adentro se duplican. Hay que respetarlo: una observación de dos
 * renglones —que en estos registros es de lo más común— rompería la grilla a partir de
 * ahí, corriendo todas las columnas siguientes una fila para arriba.
 *
 * Devuelve siempre al menos una fila con al menos una celda.
 */
export function parseCeldasPegadas(texto: string): string[][] {
  const filas: string[][] = []
  let fila: string[] = []
  let celda = ""
  let enComillas = false

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]

    if (enComillas) {
      if (c === '"') {
        // Comilla duplicada = una comilla literal; si no, cierra el entrecomillado.
        if (texto[i + 1] === '"') {
          celda += '"'
          i += 1
        } else {
          enComillas = false
        }
      } else {
        celda += c
      }
      continue
    }

    // Sólo abre entrecomillado si la comilla arranca la celda: una comilla en el medio
    // (p. ej. un diámetro 6") es texto, no sintaxis.
    if (c === '"' && celda === "") {
      enComillas = true
    } else if (c === "\t") {
      fila.push(celda)
      celda = ""
    } else if (c === "\n") {
      fila.push(celda)
      filas.push(fila)
      fila = []
      celda = ""
    } else if (c !== "\r") {
      celda += c
    }
  }
  fila.push(celda)
  filas.push(fila)

  // Excel cierra con un salto de línea: la última fila queda vacía y no es un dato.
  while (filas.length > 1 && filas[filas.length - 1].every((c) => c === "")) filas.pop()

  return filas
}

/** Parsea el ValorJson { "filas": [ ["c1","c2"], ... ] } a matriz de strings, o null si es inválido. */
export function parseTablaFilas(value: string | null | undefined): string[][] | null {
  if (!value) return null
  try {
    const obj = JSON.parse(value)
    if (!obj || !Array.isArray(obj.filas)) return null
    return obj.filas.map((f: unknown) =>
      Array.isArray(f) ? f.map((c) => (c == null ? "" : String(c))) : []
    )
  } catch {
    return null
  }
}

/** True si la matriz tiene al menos una celda con contenido. */
export function tablaTieneDatos(value: string | null | undefined): boolean {
  const filas = parseTablaFilas(value)
  if (!filas) return false
  return filas.some((row) => row.some((c) => (c ?? "").trim() !== ""))
}

/**
 * True si queda al menos una celda que el operador pueda llenar.
 *
 * Una tabla matriz cuyas celdas están TODAS precargadas no tiene nada para completar: el
 * texto fijo es parte de la planilla, no un valor que se cargue. Si además estuviera marcada
 * como obligatoria, el registro quedaría trabado para siempre pidiendo un valor que el
 * formulario no tiene dónde escribir — la misma trampa que ya pasó con los campos Label.
 *
 * Una tabla dinámica siempre tiene algo para completar: no hay filas definidas donde colgar
 * textos fijos.
 */
export function tablaTieneAlgoPorCompletar(campo: PlanillaCampoDetalle): boolean {
  const filas = campo.filas ?? []
  if (filas.length === 0) return true

  // Los textos fijos se indexan por POSICIÓN de columna (contando la de etiquetas), no por
  // columna editable. Ver CampoTablaFila.CeldasPrecargadasJson en el backend.
  const columnas = [...(campo.columnas ?? [])].sort((a, b) => a.orden - b.orden)
  const editables = columnas.filter((c) => !c.esColumnaEtiqueta)
  if (editables.length === 0) return false

  return filas.some((f) => {
    const pre = f.celdasPrecargadas ?? []
    return columnas.some(
      (c, pos) => !c.esColumnaEtiqueta && (pre[pos] ?? "").trim() === ""
    )
  })
}

/**
 * Input de un campo Tabla (tipoDato === 9) en el formulario de carga digital.
 * - Matriz (con filas predefinidas): filas fijas; la 1ª columna muestra la etiqueta read-only.
 * - Dinámica (sin filas): el operador agrega/quita filas (2 a 10).
 * Solo celdas de texto. Emite el ValorJson serializado vía onChange cuando el usuario edita.
 */
export function CampoTablaInput({
  campo,
  value,
  onChange,
  readOnly,
}: {
  campo: PlanillaCampoDetalle
  value: string
  onChange: (v: string) => void
  readOnly: boolean
}) {
  const columnas = useMemo(
    () => [...(campo.columnas ?? [])].sort((a, b) => a.orden - b.orden),
    [campo.columnas]
  )
  const filasDef = useMemo(
    () => [...(campo.filas ?? [])].sort((a, b) => a.orden - b.orden),
    [campo.filas]
  )
  const editableCount = useMemo(
    () => columnas.filter((c) => !c.esColumnaEtiqueta).length,
    [columnas]
  )
  const esMatriz = filasDef.length > 0

  // Dos índices distintos sobre las mismas columnas: la POSICIÓN en la grilla (cuenta la
  // columna de rótulos y las de texto fijo) y el índice EDITABLE (sólo lo que se guarda en
  // el ValorJson). El pegado necesita los dos, porque viene alineado con lo que se ve.
  const { posDeEditable, editableDePos } = useMemo(() => {
    const pde: number[] = []
    const edp: Array<number | null> = []
    let e = -1
    for (const c of columnas) {
      if (c.esColumnaEtiqueta) {
        edp.push(null)
        continue
      }
      e += 1
      edp.push(e)
      pde.push(edp.length - 1)
    }
    return { posDeEditable: pde, editableDePos: edp }
  }, [columnas])

  // Resultado del último pegado. Sin toasts en la app (los errores se muestran donde pasan),
  // así que el aviso va debajo de la tabla y se borra en cuanto el operador sigue tipeando.
  const [aviso, setAviso] = useState<{ texto: string; problema: boolean } | null>(null)

  // Filas actuales (solo celdas editables), derivadas del value o de la definición.
  const rows: string[][] = useMemo(() => {
    const parsed = parseTablaFilas(value)
    const norm = (r: string[]) => {
      const out = r.slice(0, editableCount)
      while (out.length < editableCount) out.push("")
      return out
    }
    if (esMatriz) {
      return filasDef.map((_, i) => norm(parsed?.[i] ?? []))
    }
    if (parsed && parsed.length > 0) return parsed.map(norm)
    const init = Math.min(TABLA_MAX_FILAS, Math.max(TABLA_MIN_FILAS, campo.numeroFilas ?? TABLA_MIN_FILAS))
    return Array.from({ length: init }, () => Array<string>(editableCount).fill(""))
  }, [value, editableCount, esMatriz, filasDef, campo.numeroFilas])

  const emit = (next: string[][]) => onChange(JSON.stringify({ filas: next }))

  const setCell = (ri: number, ci: number, v: string) => {
    setAviso(null)
    const next = rows.map((r) => [...r])
    next[ri][ci] = v
    emit(next)
  }

  /**
   * Pega un bloque de celdas copiado de Excel, tomando como esquina superior izquierda la
   * celda donde el operador pegó.
   *
   * Es la razón por la que subir el tope de filas sirve de algo: nadie tipea a mano una
   * trazabilidad de 41 renglones por 40 columnas en un navegador, pero ya la tiene en un
   * Excel. Sin esto, el tope más alto es teórico.
   *
   * **El bloque se alinea con lo que se VE, no con lo que se guarda.** Si al avanzar hacia
   * la derecha cae sobre la columna de rótulos o sobre una celda con texto fijo de la
   * planilla, esa celda del portapapeles se descarta y se sigue con la siguiente columna.
   * Es lo que hace una planilla de cálculo con celdas protegidas, y es lo que mantiene el
   * bloque derecho cuando el operador copia el rango entero del formulario original.
   *
   * Un pegado de una sola celda no entra acá: se deja al navegador, así sigue funcionando
   * reemplazar la parte seleccionada del texto adentro del input.
   */
  const pegarBloque = (ev: React.ClipboardEvent<HTMLInputElement>, ri: number, ci: number) => {
    if (readOnly) return
    const texto = ev.clipboardData.getData("text/plain")
    if (!texto) return

    const bloque = parseCeldasPegadas(texto)
    if (bloque.length === 1 && bloque[0].length === 1) return

    ev.preventDefault()

    const next = rows.map((r) => [...r])
    const posInicial = posDeEditable[ci]
    let filasAfuera = 0
    let celdasAfuera = 0

    for (let bf = 0; bf < bloque.length; bf++) {
      const destino = ri + bf

      if (destino >= next.length) {
        // En una matriz las filas son las de la planilla; en una dinámica se agregan
        // mientras haya lugar. Lo que no entra se cuenta para avisarlo, no se pierde callado.
        if (esMatriz || next.length >= TABLA_MAX_FILAS) {
          filasAfuera += 1
          continue
        }
        next.push(Array<string>(editableCount).fill(""))
      }

      for (let bc = 0; bc < bloque[bf].length; bc++) {
        const pos = posInicial + bc
        if (pos >= columnas.length) {
          if (bloque[bf][bc] !== "") celdasAfuera += 1
          continue
        }
        const editable = editableDePos[pos]
        if (editable === null) continue
        const fijo = (filasDef[destino]?.celdasPrecargadas?.[pos] ?? "").trim()
        if (fijo) continue
        next[destino][editable] = bloque[bf][bc]
      }
    }

    emit(next)

    const pegadas = bloque.length - filasAfuera
    const sobra: string[] = []
    if (filasAfuera > 0) {
      sobra.push(
        esMatriz
          ? `${filasAfuera} fila(s) no entraron: esta tabla tiene ${next.length} filas fijas`
          : `${filasAfuera} fila(s) no entraron: el máximo es ${TABLA_MAX_FILAS}`
      )
    }
    if (celdasAfuera > 0) {
      sobra.push(`${celdasAfuera} celda(s) quedaron fuera de las ${columnas.length} columnas`)
    }

    setAviso({
      texto: sobra.length
        ? `Se pegaron ${pegadas} fila(s). ${sobra.join(" y ")}.`
        : `Se pegaron ${pegadas} fila(s).`,
      problema: sobra.length > 0,
    })
  }

  const addRow = () => {
    if (rows.length >= TABLA_MAX_FILAS) return
    setAviso(null)
    emit([...rows.map((r) => [...r]), Array<string>(editableCount).fill("")])
  }

  const removeRow = (ri: number) => {
    if (rows.length <= TABLA_MIN_FILAS) return
    setAviso(null)
    emit(rows.filter((_, i) => i !== ri))
  }

  // Segmenta las columnas en tramos contiguos con el mismo `grupo` para el
  // header agrupador. Columnas sin grupo (o vacío) salen como celdas vacías
  // individuales para mantener alineada la grilla. La col extra "eliminar"
  // (solo tablas dinámicas) también aparece como una celda vacía sin agrupar.
  const grupoTramos = useMemo(() => {
    const tramos: Array<{ grupo: string | null; span: number }> = []
    for (const c of columnas) {
      const g = (c.grupo ?? "").trim() || null
      const last = tramos[tramos.length - 1]
      if (last && last.grupo === g && g !== null) {
        last.span += 1
      } else {
        tramos.push({ grupo: g, span: 1 })
      }
    }
    return tramos
  }, [columnas])

  const hayGrupos = grupoTramos.some((t) => t.grupo !== null)

  // Anchos: mismo peso relativo que usa el PDF (CampoTablaColumna.Ancho), así la
  // pantalla y el papel muestran la misma tabla. Sin esto el <table> usa auto-layout
  // y acomoda las columnas según el contenido, que es lo que hacía diferir a los dos.
  //
  // La columna extra de "eliminar fila" (solo tablas dinámicas editables) se lleva un
  // porcentaje fijo y las de datos se reparten el resto — así el colgroup suma
  // exactamente 100% y no desborda con table-layout: fixed.
  const hayColumnaEliminar = !esMatriz && !readOnly
  const PCT_COL_ELIMINAR = 4
  const totalAncho = columnas.reduce((sum, c) => sum + (c.ancho || 0), 0)
  const pctDisponible = 100 - (hayColumnaEliminar ? PCT_COL_ELIMINAR : 0)
  const anchoPct = (ancho: number) =>
    totalAncho > 0
      ? `${((ancho || 0) / totalAncho) * pctDisponible}%`
      : `${pctDisponible / Math.max(1, columnas.length)}%`

  // Ancho mínimo proporcional a la cantidad de columnas, no un valor fijo. Los
  // porcentajes de arriba reparten el ancho disponible: dentro de la card del
  // formulario, una tabla de 8 columnas dejaba cada encabezado en ~4rem y
  // "Presión de prueba (bar)" se partía en cuatro renglones, que es lo que se veía
  // como encabezados apilados uno sobre otro. Con un piso de ~9rem por columna la
  // tabla scrollea en horizontal en vez de aplastarse.
  const MIN_REM_POR_COLUMNA = 9
  const minWidthRem = Math.max(
    32,
    columnas.length * MIN_REM_POR_COLUMNA + (hayColumnaEliminar ? 2 : 0)
  )

  // Va DESPUÉS de todos los hooks: cuando estaba arriba del useMemo de grupoTramos,
  // una tabla que pasaba de 0 columnas a N cambiaba la cantidad de hooks entre
  // renders y React tiraba "Rendered more hooks than during the previous render".
  if (columnas.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Tabla sin columnas definidas.</p>
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border rounded-md">
        {/* minWidth: la tabla mantiene un piso y scrollea, en vez de comprimir las
            columnas hasta que los encabezados dejan de leerse. Va inline porque
            depende de la cantidad de columnas (Tailwind no genera clases dinámicas). */}
        <table
          className="w-full table-fixed text-sm border-collapse"
          style={{ minWidth: `${minWidthRem}rem` }}
        >
          <colgroup>
            {columnas.map((c) => (
              <col key={c.id} style={{ width: anchoPct(c.ancho) }} />
            ))}
            {hayColumnaEliminar && <col style={{ width: `${PCT_COL_ELIMINAR}%` }} />}
          </colgroup>
          <thead>
            {hayGrupos && (
              <tr className="bg-gray-100">
                {grupoTramos.map((t, i) => (
                  <th
                    key={i}
                    colSpan={t.span}
                    className="border-b border-r last:border-r-0 px-2 py-1 text-center font-semibold text-gray-700 align-bottom leading-tight wrap-break-word"
                    title={t.grupo ?? undefined}
                  >
                    {t.grupo ?? ""}
                  </th>
                ))}
                {!esMatriz && !readOnly && <th className="border-b w-8" />}
              </tr>
            )}
            <tr className="bg-gray-50">
              {columnas.map((c) => (
                <th
                  key={c.id}
                  className="border-b border-r last:border-r-0 px-2 py-1.5 text-left font-medium text-gray-700 align-bottom leading-tight wrap-break-word"
                  title={c.encabezado}
                >
                  {c.encabezado}
                </th>
              ))}
              {!esMatriz && !readOnly && <th className="border-b px-2 py-1.5 w-8" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              // `e` indexa los valores cargados (sólo columnas editables) y `pos` los textos
              // fijos (todas las columnas). Son índices distintos a propósito: ver
              // CampoTablaFila.CeldasPrecargadasJson en el backend.
              let e = -1
              return (
                <tr key={ri}>
                  {columnas.map((c, pos) => {
                    if (c.esColumnaEtiqueta) {
                      return (
                        <td
                          key={c.id}
                          className="border-b border-r last:border-r-0 px-2 py-1 font-medium text-gray-700 bg-gray-50/50 truncate"
                          title={filasDef[ri]?.etiquetaFila ?? undefined}
                        >
                          {filasDef[ri]?.etiquetaFila ?? ""}
                        </td>
                      )
                    }
                    e += 1
                    const ci = e
                    // Texto fijo de la celda (sólo matriz): es definición de la planilla, así
                    // que se muestra igual que el rótulo de la fila —no editable— y gana sobre
                    // lo que hubiera en el valor guardado, igual que en el PDF.
                    const precargado = (filasDef[ri]?.celdasPrecargadas?.[pos] ?? "").trim()
                    if (precargado) {
                      return (
                        <td
                          key={c.id}
                          className="border-b border-r last:border-r-0 px-2 py-1 text-center text-gray-700 bg-gray-50/50 truncate"
                        >
                          {precargado}
                        </td>
                      )
                    }
                    // Unidad de la columna (presentación): va en gris a la derecha de la
                    // celda, igual que en el PDF. No forma parte del valor guardado.
                    const unidad = (c.unidad ?? "").trim()
                    return (
                      <td key={c.id} className="border-b border-r last:border-r-0 p-0">
                        <div className="flex items-center focus-within:bg-blue-50">
                          <input
                            type="text"
                            value={row[ci] ?? ""}
                            onChange={(ev) => setCell(ri, ci, ev.target.value)}
                            onPaste={(ev) => pegarBloque(ev, ri, ci)}
                            disabled={readOnly}
                            className="w-full min-w-0 px-2 py-1 bg-transparent outline-none disabled:opacity-60"
                          />
                          {unidad && (
                            <span className="shrink-0 pr-2 text-xs text-muted-foreground">{unidad}</span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                  {!esMatriz && !readOnly && (
                    <td className="border-b px-1 py-1 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => removeRow(ri)}
                        disabled={rows.length <= TABLA_MIN_FILAS}
                        title="Quitar fila"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {!esMatriz && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-7"
                onClick={addRow}
                disabled={rows.length >= TABLA_MAX_FILAS}
              >
                <Plus className="h-3.5 w-3.5" /> Agregar fila
              </Button>
              <span className="text-[10px] text-muted-foreground">
                Entre {TABLA_MIN_FILAS} y {TABLA_MAX_FILAS} filas.
              </span>
            </>
          )}
          <span className="text-[10px] text-muted-foreground">
            Podés copiar un bloque de celdas desde Excel y pegarlo acá: se vuelca a partir
            de la celda donde pegues.
          </span>
        </div>
      )}

      {aviso && (
        <p
          className={`text-[11px] ${aviso.problema ? "text-destructive" : "text-muted-foreground"}`}
        >
          {aviso.texto}
        </p>
      )}
    </div>
  )
}
