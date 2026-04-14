import Anthropic from "@anthropic-ai/sdk"
import { NextRequest } from "next/server"
import type { ExcelParsePayload, PlanillaImportada } from "@/features/planillas/import-types"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `Eres un experto en análisis de planillas industriales de precomisionamiento.
Recibirás el contenido de un archivo Excel (como matriz de filas/columnas) y debes convertirlo en una estructura de planilla digital.

Tipos de datos disponibles:
- 1 = Texto (campos de texto libre)
- 2 = Número (valores numéricos, presiones, temperaturas, medidas)
- 3 = Fecha (fechas)
- 4 = Boolean (SI/NO, Sí/No, checkbox, check, ✓/✗, APROBADO/RECHAZADO)
- 5 = Lista (cuando hay opciones predefinidas múltiples que no sean solo SI/NO)
- 7 = Adjunto (cuando se solicita un archivo, plano, P&ID, imagen)

Reglas de interpretación:
- Las secciones son bloques de texto en MAYÚSCULAS que actúan como encabezados (ej: PROCEDIMIENTO, REPORTES, OBSERVACIONES)
- Los campos con columna SI/NO o check/checkbox → tipoDato: 4 (Boolean)
- Los campos de texto libre (descripciones, notas, nombres) → tipoDato: 1
- Los campos numéricos (presión, temperatura, caudal, etc.) → tipoDato: 2
- Los campos de fecha → tipoDato: 3
- Los campos que mencionan adjunto, plano, P&ID, imagen → tipoDato: 7
- IGNORAR completamente cualquier sección de Firmas, Firma, Signatures, Autorización por firma
- IGNORAR filas vacías o solo con separadores
- El nombre de la planilla debe ser el título principal del documento (generalmente en las primeras filas)
- Si un campo tiene opciones como (A/B/C), (Bueno/Regular/Malo), etc → tipoDato: 5 y listar las opciones

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta, sin texto adicional:
{
  "nombre": "string",
  "secciones": [
    {
      "nombre": "string",
      "campos": [
        {
          "nombre": "string",
          "etiqueta": "string",
          "tipoDato": number,
          "esObligatorio": boolean,
          "opciones": ["string"] // solo si tipoDato = 5
        }
      ]
    }
  ]
}`

export async function POST(request: NextRequest) {
  try {
    const body: ExcelParsePayload = await request.json()

    if (!body.filas || body.filas.length === 0) {
      return Response.json({ error: "No se recibieron datos del archivo" }, { status: 400 })
    }

    // Convertir la matriz a texto tabular para Claude
    const tablaTexto = body.filas
      .map((fila) => fila.join("\t"))
      .join("\n")

    const userMessage = `Analiza el siguiente contenido del archivo Excel "${body.nombreArchivo}" y conviértelo en una planilla digital estructurada.

Contenido:
${tablaTexto}`

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    })

    const content = message.content[0]
    if (content.type !== "text") {
      return Response.json({ error: "Respuesta inesperada del modelo" }, { status: 500 })
    }

    // Extraer JSON de la respuesta (puede venir dentro de ```json ... ```)
    let jsonText = content.text.trim()
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim()
    }

    let planilla: PlanillaImportada
    try {
      planilla = JSON.parse(jsonText)
    } catch {
      return Response.json(
        { error: "El modelo no devolvió un JSON válido", raw: jsonText },
        { status: 500 }
      )
    }

    return Response.json(planilla)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    return Response.json({ error: message }, { status: 500 })
  }
}
