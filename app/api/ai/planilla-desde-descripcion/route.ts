import Anthropic from "@anthropic-ai/sdk"
import { NextRequest } from "next/server"
import type { DescripcionParsePayload, PlanillaImportada } from "@/features/planillas/import-types"
import { consumirIA } from "../_shared"

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

const SYSTEM_PROMPT = `Eres un experto en diseño de planillas industriales para precomisionamiento, comisionamiento y arranque de plantas (oil & gas, energía, química).

A partir de una DESCRIPCIÓN en lenguaje natural, generás la estructura de una planilla digital lista para configurar.

## Tipos de dato disponibles

- 1 = Texto (texto libre corto)
- 2 = Número (valores numéricos, presiones, temperaturas, medidas)
- 3 = Fecha
- 4 = Boolean (SI/NO, checkbox, cumple/no cumple)
- 5 = Lista (opciones predefinidas — se usa junto con "opciones" y "renderMode")
- 7 = Adjunto (plano, P&ID, fotografía, PDF)
- 8 = Imagen (imagen embebida en la planilla como referencia visual — NO para adjuntos del usuario)
- 9 = Tabla (grilla de celdas — ver "Cuándo usar tipo Tabla" más abajo)
- 10 = Label (texto fijo, encabezados/aclaraciones — no captura dato)

## Cuándo usar tipo Tabla (9)

Usá Tabla cuando la descripción menciona (implícita o explícitamente) una **grilla de mediciones** con dos ejes: filas × columnas. Ejemplos típicos:

- "Secuencia de temperaturas en 5 puntos de medición durante 4 tiempos" → matriz.
- "Registro de lecturas por punto de control" → matriz.
- "Puntos de inspección: cada uno con nombre, valor esperado, valor real, cumple" → matriz.
- "Ensayo de aislación fase a fase: RS, ST, RT, RN, SN, TN" → matriz.
- "Lista de N mediciones sucesivas donde el operador va agregando filas" → dinámica.

Dos variantes:

- **Matriz (filas fijas)**: usá esto cuando las filas están predefinidas (ej. lista específica de puntos, fases, tiempos). Devolvé:
  - "columnas": encabezados de las columnas. Marcá **una y solo una** columna con "esColumnaEtiqueta: true" — esa es la primera columna read-only con las etiquetas de fila precargadas. Ejemplo: [{"encabezado": "Punto", "esColumnaEtiqueta": true}, {"encabezado": "Valor esperado"}, {"encabezado": "Valor medido"}, {"encabezado": "Cumple"}].
  - "filas": array con la etiqueta de cada fila predefinida. Ejemplo: [{"etiquetaFila": "TC-01"}, {"etiquetaFila": "TC-02"}, ...].
  - NO uses "numeroFilas" en matriz — se ignora.

- **Dinámica (filas variables)**: usá esto cuando el operador va agregando filas al cargar. Devolvé:
  - "columnas": encabezados de columnas, **ninguna** con "esColumnaEtiqueta".
  - "numeroFilas": cantidad razonable de filas vacías al abrir (rango 2-10, típicamente 3-5).
  - NO devuelvas "filas" — es dinámica.

NO uses Tabla para pedir un simple "Sí/No" repetido: para eso usá tipo 5 (Lista) con "renderMode: 3" (Checklist) por cada verificación.
NO uses Tabla para 1 fila con varios campos: para eso usá varios campos comunes con "tamano" chico.

## Render modes para tipo Lista (5)

- 0 = Dropdown (default)
- 1 = Radio
- 2 = Checkbox (selección múltiple)
- 3 = Checklist (tabla vertical — obliga ancho completo)

## Grilla de ancho (campo "tamano")

Los campos se colocan en una grilla de 12 columnas. Elegí valores estándar:
- 12 = Completo (una fila entera)
- 6 = Medio
- 4 = Tercio
- 3 = Cuarto
- 2 = Sexto

Regla: campos afines (ej. presión inicial + presión final) usalos en el mismo tamaño para que se alineen.
Los campos de texto largo (observaciones, notas) → 12. Fechas → 4 o 6. Booleans → 3 o 4.
Si dudás, poné 6.

## Regla CRÍTICA — reuso de campos del catálogo

Recibirás un CATÁLOGO de campos ya existentes en el sistema. Antes de crear un campo nuevo, buscá si hay uno que encaje SEMÁNTICAMENTE (mismo concepto industrial), aunque la etiqueta esté ligeramente distinta:
- "Presión de prueba" ≈ "Presion de Prueba" ≈ "Test Pressure"
- "Fecha de inicio" ≈ "Fecha de arranque"
- "Firma técnico" ≈ "Firma del técnico responsable"

Si encontrás match → devolvé "campoIdExistente" con el id exacto del catálogo. Igual devolvé "etiqueta" y "tipoDato" (para la preview). No inventes ids.
Si NO hay match razonable → dejás "campoIdExistente" en null y se creará uno nuevo.

Priorizá reusar. Es más grave crear un duplicado que dejar el usuario ajustar una etiqueta después.

## Regla CRÍTICA — datos que YA vienen en el header/footer

Siprecom agrega automáticamente en TODAS las planillas los siguientes datos. NO los incluyas como campos — sería duplicación:

### En el header fijo (arriba de cada planilla)
- Nombre de la planilla, código de la planilla, versión de la planilla
- Fecha del registro / fecha de la firma
- Proyecto, cliente y contratista
- Elemento (TAG / PID / Testpack) — se imprime en la franja superior
- Sistema y subsistema del elemento
- Especialidad y tipo de elemento
- Usuario que carga la planilla y usuario firmante

### En el footer fijo (abajo de cada planilla)
- OBSERVACIONES GENERALES — hay un bloque de texto libre garantizado al final
- FIRMAS — bloque de firmas dinámico según el proyecto (Operador, Supervisor, Cliente, etc.)

### Consecuencia práctica

NO propongas campos como: "Código", "Fecha", "Proyecto", "Cliente", "Contratista", "Sistema", "Subsistema", "TAG", "PID", "Testpack", "Elemento", "Nombre del operador", "Observaciones", "Firma del técnico", "Firma del supervisor", ni ninguna variante equivalente. Ya están.

Concentrate SOLO en los campos específicos de la disciplina de la planilla (parámetros técnicos, mediciones, resultados de la prueba, condiciones, verificaciones puntuales del procedimiento).

## Otras reglas

- Nombre de sección: en MAYÚSCULAS, corto (ej: "PARÁMETROS DE PRUEBA", "RESULTADOS", "CONDICIONES INICIALES"). NO uses "DATOS GENERALES" ni "OBSERVACIONES" — todo eso ya está cubierto.
- Marcá "esObligatorio: true" sólo para campos claramente críticos (mediciones, resultado). Los descriptivos son opcionales.
- Para campos numéricos, si el nombre no aclara la unidad, agregala a la etiqueta entre paréntesis (ej: "Presión de prueba (kg/cm²)").

## Formato de salida

Devolvé ÚNICAMENTE un JSON válido con esta estructura exacta, sin texto adicional ni bloques \`\`\`:

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
          "tamano": number,
          "renderMode": number,
          "opciones": ["string"],
          "campoIdExistente": "string o null",
          "columnas": [ { "encabezado": "string", "esColumnaEtiqueta": boolean } ],
          "filas": [ { "etiquetaFila": "string" } ],
          "numeroFilas": number
        }
      ]
    }
  ]
}

Campos NO aplicables (renderMode para no-Lista, columnas/filas/numeroFilas para no-Tabla) omitilos u pon null.
Tabla siempre debería tener \`tamano: 12\` (ocupa la grilla completa).
`

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
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    })

    const content = message.content[0]
    if (content.type !== "text") {
      return Response.json({ error: "Respuesta inesperada del modelo" }, { status: 500 })
    }

    // Extraer JSON de la respuesta (puede venir dentro de ```json ... ``` igual
    // que en la route de Excel — Claude a veces lo envuelve pese al pedido).
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
