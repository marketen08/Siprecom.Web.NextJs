import Anthropic from "@anthropic-ai/sdk"
import { NextRequest } from "next/server"
import type { ExcelParsePayload, PlanillaImportada } from "@/features/planillas/import-types"
import { consumirIA } from "../_shared"
import { buildPlanillaSystemPrompt } from "../_shared/planilla-prompt"

// Instanciación lazy: el cliente se crea en la request, no al cargar el módulo.
// Así el build nunca depende de ANTHROPIC_API_KEY. En producción la key es un
// Application setting de runtime de la Static Web App (NO una var de build: el env
// del build de SWA no llega al runtime SSR). En local sale de .env.local.
function getAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY no está configurada. En Azure agregala como Application setting de la Static Web App.",
    )
  }
  return new Anthropic({ apiKey })
}

// Intro específica del flujo Excel + reglas comunes del `_shared/planilla-prompt.ts`.
// Diferencias vs "planilla-desde-descripcion":
//   - La fuente es una matriz de filas del Excel (no texto natural).
//   - Detección específica: encabezados en MAYÚSCULAS = secciones; filas con
//     "SI/NO" o rectángulos vacíos → Checklist.
//   - Todo el resto de reglas (tipos, tabla, catálogo reutilizable, header/footer,
//     preferencia por Checklist, formato de salida) viene del bloque compartido.
const SYSTEM_PROMPT = buildPlanillaSystemPrompt(`
Eres un experto en análisis de planillas industriales de precomisionamiento, comisionamiento y arranque de plantas (oil & gas, energía, química).

Recibirás el contenido de un archivo Excel como MATRIZ de filas × columnas y debés convertirlo en la estructura de una planilla digital lista para configurar.

## Cómo interpretar el Excel

- Las **secciones** son bloques de texto en MAYÚSCULAS que actúan como encabezados (ej: "PROCEDIMIENTO", "PARÁMETROS DE PRUEBA", "RESULTADOS"). Ignorá "DATOS GENERALES" y "OBSERVACIONES" — están cubiertos por el header/footer del sistema.
- El **nombre de la planilla** suele estar en las primeras filas como título principal.
- **Ignorá completamente**: secciones de Firmas / Signatures / Autorización, filas vacías o solo con separadores, encabezados de columna repetidos entre páginas.

## Reglas de tipeo específicas para Excel

Traducí las convenciones típicas del Excel a los tipos de dato:

- **Columnas con encabezados "SI" y "NO" (o "SI"/"NO"/"NA", "CUMPLE"/"NO CUMPLE") sobre una lista de puntos a verificar** → \`tipoDato: 11\` (Checklist) con opciones ["Sí", "No"] o ["Sí", "No", "N/A"]. NO uses Boolean para esto — los Boolean sueltos NO se agrupan en una tabla en el PDF y quedan uno por línea. Los Checklists SÍ se agrupan cuando comparten las mismas opciones.
- **Rectángulos vacíos ☐, ✓/✗, check/checkbox** en columnas repetidas → mismo criterio que arriba: Checklist.
- **Un SÍ/NO aislado** (una sola pregunta en una fila) → tipoDato: 4 (Boolean).
- **Texto libre corto** (descripciones, notas, nombres) → tipoDato: 1.
- **Numéricos** (presión, temperatura, caudal, viscosidad, dimensiones, etc.) → tipoDato: 2.
- **Fecha** → tipoDato: 3.
- **Solicitud de archivo** (adjuntar plano, P&ID, foto) → tipoDato: 7.
- **Opciones predefinidas múltiples que NO sean SI/NO** (ej. A/B/C, Bueno/Regular/Malo) → Lista con \`renderMode: 1\` (Inline) — es corto y visible al lado del label.

## Detección de Tablas (tipoDato 9)

Si el Excel muestra una **grilla con encabezados de columna + filas de datos** (ej. "Punto | Valor esperado | Valor medido | Cumple" con lista de puntos abajo), es una Tabla — NO N campos sueltos. Ver las reglas de "Cuándo usar tipo Tabla" abajo para elegir entre matriz (filas fijas) y dinámica (numeroFilas vacías).
`)

export async function POST(request: NextRequest) {
  try {
    const body: ExcelParsePayload = await request.json()

    if (!body.filas || body.filas.length === 0) {
      return Response.json({ error: "No se recibieron datos del archivo" }, { status: 400 })
    }

    // Rate limit: consumimos ANTES de gastar tokens en Anthropic.
    const rl = await consumirIA(request)
    if (!rl.ok) {
      return Response.json({ error: rl.message }, { status: rl.status })
    }

    // Convertir la matriz a texto tabular para Claude.
    const tablaTexto = body.filas
      .map((fila) => fila.join("\t"))
      .join("\n")

    // Serializamos el catálogo como TSV compacto para minimizar tokens.
    // Mismo formato que el flujo desde-descripcion.
    const catalogoTxt = (body.catalogo ?? [])
      .slice(0, 400)
      .map((c) => `${c.id}\t${c.codigo}\t${c.etiqueta}\t${c.tipoDato}`)
      .join("\n")

    const userMessage = `# Catálogo de campos existentes (id\\tcodigo\\tetiqueta\\ttipoDato)

${catalogoTxt || "(catálogo vacío — creá todos los campos como nuevos)"}

# Contenido del archivo Excel "${body.nombreArchivo}" (matriz filas × columnas, celdas separadas por tab)

${tablaTexto}

Convertí el Excel en la estructura JSON de la planilla siguiendo las reglas del sistema. Reusá del catálogo cuando corresponda; preferí Checklist (tipoDato 11) para verificaciones tipo SI/NO repetidas.`

    const client = getAnthropic()
    const message = await client.messages.create({
      // Sonnet 4.6 y 8192 tokens: mismo tier que el flujo desde-descripcion,
      // donde Opus 4.6 con 4096 truncaba planillas con muchos campos.
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    })

    const content = message.content[0]
    if (content.type !== "text") {
      return Response.json({ error: "Respuesta inesperada del modelo" }, { status: 500 })
    }

    // Extraer JSON de la respuesta. Mismo strip robusto que la route de
    // descripcion — algunas veces la IA prefixea texto pese al prompt.
    const rawText = content.text
    const stopReason = message.stop_reason
    let jsonText = rawText.trim()
    const fencedMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fencedMatch) {
      jsonText = fencedMatch[1].trim()
    } else {
      const firstBrace = jsonText.indexOf("{")
      const lastBrace = jsonText.lastIndexOf("}")
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        jsonText = jsonText.slice(firstBrace, lastBrace + 1)
      }
    }

    let planilla: PlanillaImportada
    try {
      planilla = JSON.parse(jsonText)
    } catch {
      const detalle = stopReason === "max_tokens"
        ? "La respuesta se cortó por el límite de tokens. Probá con un Excel más chico o dividí la planilla."
        : `La respuesta no era un JSON parseable. Primeros 400 chars: ${rawText.slice(0, 400)}`
      return Response.json(
        { error: "El modelo no devolvió un JSON válido", details: detalle, raw: rawText.slice(0, 2000) },
        { status: 500 }
      )
    }

    return Response.json(planilla)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    return Response.json({ error: message }, { status: 500 })
  }
}
