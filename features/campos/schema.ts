import { z } from "zod"

export const campoSchema = z.object({
  codigo: z.string().min(1, "El código es requerido"),
  etiqueta: z.string().min(1, "La etiqueta es requerida"),
  /** Etiqueta alternativa opcional (traducción/comentario). Se muestra debajo del label en el PDF. */
  etiquetaAlt: z.string().max(200, "Máximo 200 caracteres").optional(),
  // 6 (Firma) y 7 (Adjunto) excluidos: ya no son tipos de campo. Resto: 1..5, 8, 9 (Tabla),
  // 10 (Label), 11 (Checklist — tipo propio), 12 (TextoArea — texto multilínea),
  // 13 (Espacio — bloque vacío display-only), 14 (Croquis — dibujo del operador),
  // 15 (Nota — texto fijo multilínea del diseño), 16 (Leyenda — fila de códigos que
  // reusa las opciones de Lista/Checklist).
  tipoDato: z.number().int().min(1).max(16).refine((v) => v !== 6 && v !== 7, { message: "Tipo no válido" }),
  unidad: z.string().optional(),
  descripcion: z.string().optional(),
  imagenUrl: z.string().optional(),
  /** Solo Tabla dinámica (tipoDato === 9). Default 3. */
  numeroFilas: z.number().int().min(1).max(100).optional(),
  /** Solo TextoArea (tipoDato === 12). Default 3, rango 1-20. */
  numeroLineas: z.number().int().min(1).max(20).optional(),
  /** Espacio (13) y Croquis (14): alto del bloque en mm. Default 20, rango 5-200. */
  altoMm: z.number().int().min(5, "Mínimo 5 mm").max(200, "Máximo 200 mm").optional(),
  /** Solo Nota (tipoDato === 15): texto fijo multilínea que se imprime en el PDF. */
  textoLargo: z.string().max(5000, "Máximo 5000 caracteres").optional().nullable(),
  /** Solo Boolean (tipoDato === 4): se presenta como casilla de marca (X) en vez de Sí/No. */
  mostrarComoMarca: z.boolean().optional(),
  /** Default de obligatoriedad: precarga el checkbox al agregar el campo a una planilla. */
  esObligatorioDefault: z.boolean().optional(),
})

export type CampoFormValues = z.infer<typeof campoSchema>
