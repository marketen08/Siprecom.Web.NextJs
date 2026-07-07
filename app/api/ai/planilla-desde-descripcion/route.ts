import Anthropic from "@anthropic-ai/sdk"
import { NextRequest } from "next/server"
import type { DescripcionParsePayload, PlanillaImportada } from "@/features/planillas/import-types"
import { consumirIA } from "../_shared"
import { buildPlanillaSystemPrompt } from "../_shared/planilla-prompt"

// Instanciación lazy: el cliente se crea en la request (misma razón que la route
// de importación Excel — evitamos que el build dependa de ANTHROPIC_API_KEY).
function getAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY no está configurada. En Azure agregala como Application setting de la Static Web App.",
    )
  }
  return new Anthropic({ apiKey })
}

// Intro específico + reglas comunes del `_shared/planilla-prompt.ts`. Al cambiar
// reglas de dominio se toca UN solo archivo y ambas rutas (descripción/excel)
// quedan alineadas.
const SYSTEM_PROMPT = buildPlanillaSystemPrompt(`
Eres un experto en diseño de planillas industriales para precomisionamiento, comisionamiento y arranque de plantas (oil & gas, energía, química).

A partir de una DESCRIPCIÓN en lenguaje natural, generás la estructura de una planilla digital lista para configurar.
`)

export async function POST(request: NextRequest) {
  try {
    const body: DescripcionParsePayload = await request.json()

    if (!body.descripcion || body.descripcion.trim().length < 10) {
      return Response.json(
        { error: "La descripción es demasiado corta (mínimo 10 caracteres)." },
        { status: 400 },
      )
    }

    // Rate limit: consumimos ANTES de gastar tokens en Anthropic. Si excedió el
    // tope diario, el backend devuelve 429 y salimos sin gastar plata en Claude.
    const rl = await consumirIA(request)
    if (!rl.ok) {
      return Response.json({ error: rl.message }, { status: rl.status })
    }

    // Cap de seguridad — evita input gigante que dispare tokens.
    const descripcion = body.descripcion.slice(0, 8000)

    // Serializamos el catálogo como TSV compacto para minimizar tokens.
    // Formato: `id\tcodigo\tetiqueta\ttipoDato` por línea.
    const catalogoTxt = (body.catalogo ?? [])
      .slice(0, 400) // cap defensivo por si mandan miles
      .map((c) => `${c.id}\t${c.codigo}\t${c.etiqueta}\t${c.tipoDato}`)
      .join("\n")

    const userMessage = `# Catálogo de campos existentes (id\\tcodigo\\tetiqueta\\ttipoDato)

${catalogoTxt || "(catálogo vacío — creá todos los campos como nuevos)"}

# Descripción de la planilla a generar

${descripcion}

Generá la estructura JSON de la planilla siguiendo las reglas del sistema. Reusá del catálogo cuando corresponda.`

    const client = getAnthropic()
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      // 8192 (max de Sonnet) — con 4096 planillas medianas con muchos campos
      // truncaban el JSON a la mitad y JSON.parse fallaba.
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    })

    const content = message.content[0]
    if (content.type !== "text") {
      return Response.json({ error: "Respuesta inesperada del modelo" }, { status: 500 })
    }

    const rawText = content.text
    const stopReason = message.stop_reason

    // Extraer JSON de la respuesta. La IA puede:
    //  1. Devolver JSON puro (path feliz).
    //  2. Envolverlo en ```json ... ```.
    //  3. Anteceder texto ("Acá va la planilla:") + JSON.
    //  4. Combinar 2 y 3.
    // Estrategia: prioridad al bloque cercado, sino al primer "{" hasta el
    // último "}" — que cubre 3 y 4.
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
      // Ayudamos al usuario a entender qué falló. Si stop_reason fue
      // "max_tokens", casi seguro es truncado — sugerimos acortar la descripción.
      const detalle = stopReason === "max_tokens"
        ? "La respuesta se cortó por el límite de tokens. Probá con una descripción más breve o dividí la planilla en varias."
        : `La respuesta no era un JSON parseable. Primeros 400 chars: ${rawText.slice(0, 400)}`
      return Response.json(
        { error: "El modelo no devolvió un JSON válido", details: detalle, raw: rawText.slice(0, 2000) },
        { status: 500 },
      )
    }

    // Validación estructural mínima antes de responder — evita que la preview
    // reciba basura y explote. No es un schema completo (eso lo hace la UI al
    // permitir editar), pero sí las invariantes duras.
    if (
      typeof planilla?.nombre !== "string" ||
      !Array.isArray(planilla?.secciones)
    ) {
      return Response.json(
        { error: "El modelo devolvió una estructura inválida.", raw: jsonText },
        { status: 500 },
      )
    }

    return Response.json(planilla)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    return Response.json({ error: message }, { status: 500 })
  }
}
