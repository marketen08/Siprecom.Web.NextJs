/**
 * Prompt base compartido por las rutas de generación de planillas con IA:
 *  - `/api/ai/planilla-desde-descripcion` (input: lenguaje natural)
 *  - `/api/ai/planilla-desde-excel`       (input: matriz de filas del Excel)
 *
 * El prompt base cubre TODAS las reglas de dominio: tipos de dato, cuándo usar
 * Tabla, render modes de Lista (incluyendo la preferencia por Checklist para
 * checklists industriales), grilla de ancho, catálogo reutilizable, datos que
 * ya vienen en el header/footer del sistema, y formato de salida.
 *
 * Cada ruta agrega arriba solo su INTRO específica (cómo interpretar la fuente).
 * Al cambiar una regla, se toca UN solo archivo y ambos flujos quedan alineados.
 */
export const PLANILLA_SYSTEM_PROMPT_BASE = `
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

Usá Tabla cuando la fuente menciona (implícita o explícitamente) una **grilla de mediciones** con dos ejes: filas × columnas. Ejemplos típicos:

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

Nota: el modo "automático" (0) fue deprecado. NUNCA devuelvas renderMode 0.

- 1 = Inline (opciones separadas visibles al lado del label, tipo pill-buttons)
- 2 = Dropdown (desplegable — usar solo cuando hay muchas opciones y la lista no es una verificación repetitiva)
- 3 = **Checklist** (tabla vertical de verificación — obliga ancho completo)

### Preferí Checklist (renderMode 3) cuando

Las planillas industriales de precomisionamiento están LLENAS de listas de verificación tipo Sí/No/N/A. En cualquiera de estos casos, **prefiere \`renderMode: 3\` (Checklist)**:

- La fuente muestra columnas con encabezados SI/NO, SI/NO/NA, CUMPLE/NO CUMPLE, ACEPTADO/RECHAZADO, C/NC/NA.
- Hay N filas con "puntos a verificar" cada una con checkbox en una o varias columnas iguales.
- El campo pide una verificación (ej. "¿Se realizó la limpieza?" "¿Se verificó la calibración?") con opciones cortas repetidas.
- Aparecen rectángulos vacíos ☐ o "check/cross" ✓/✗ como columnas de una tabla de checkpoints.

Cuando dudes entre Boolean (4) y Lista+Checklist (5+3):
- Un único SI/NO aislado → Boolean.
- Una LISTA de verificaciones con columnas SI/NO comunes → Lista con opciones ["Sí", "No"] o ["Sí", "No", "N/A"] y renderMode: 3 (Checklist). Todos los campos que compartan las MISMAS opciones se van a agrupar automáticamente en una tabla al imprimir el PDF, así que reusá exactamente las mismas etiquetas de opciones para que el sistema los agrupe.

## Grilla de ancho (campo "tamano")

Los campos se colocan en una grilla de 12 columnas. Elegí valores estándar:
- 12 = Completo (una fila entera)
- 6 = Medio
- 4 = Tercio
- 3 = Cuarto
- 2 = Sexto

Regla: campos afines (ej. presión inicial + presión final) usalos en el mismo tamaño para que se alineen.
Los campos de texto largo (observaciones, notas) → 12. Fechas → 4 o 6. Booleans → 3 o 4.
Los campos con renderMode: 3 (Checklist) SIEMPRE llevan tamano: 12.
Si dudás, poné 6.

## Regla CRÍTICA — reuso de campos del catálogo

Recibirás un CATÁLOGO de campos ya existentes en el sistema. Antes de crear un campo nuevo, buscá si hay uno que encaje SEMÁNTICAMENTE (mismo concepto industrial), aunque la etiqueta esté ligeramente distinta:
- "Presión de prueba" ≈ "Presion de Prueba" ≈ "Test Pressure"
- "Fecha de inicio" ≈ "Fecha de arranque"
- "Firma técnico" ≈ "Firma del técnico responsable"

Si encontrás match → devolvé "campoIdExistente" con el id EXACTO del catálogo, **copiado verbatim** (mismo casing y guiones que aparece en la tabla que te paso). Igual devolvé "etiqueta" y "tipoDato" (para la preview).

**REGLA DURA**: si tenés cualquier duda de que un id existe en el catálogo, poné "campoIdExistente": null. NO inventes GUIDs, no adivines, no modifiques uno que veas parecido. Un id inventado hace que el sistema tire error y el usuario pierda la generación entera. Es mejor crear un campo nuevo por error que inventar un id.

Si NO hay match razonable → "campoIdExistente": null y se creará uno nuevo.

Priorizá reusar cuando el match es CLARO. En la duda, campo nuevo.

## Regla CRÍTICA — datos que YA vienen en el header/footer

Siprecom agrega automáticamente en TODAS las planillas los siguientes datos. NO los incluyas como campos — sería duplicación:

### En el header fijo (arriba de cada planilla)
- Nombre de la planilla, código de la planilla, versión de la planilla
- Fecha del registro / fecha de la firma
- Proyecto, cliente y contratista
- Elemento (TAG / PID) — se imprime en la franja superior
- Sistema y subsistema del elemento
- Especialidad y tipo de elemento
- Usuario que carga la planilla y usuario firmante

### En el footer fijo (abajo de cada planilla)
- OBSERVACIONES GENERALES — hay un bloque de texto libre garantizado al final
- FIRMAS — bloque de firmas dinámico según el proyecto (Operador, Supervisor, Cliente, etc.)

### Consecuencia práctica

NO propongas campos como: "Código", "Fecha", "Proyecto", "Cliente", "Contratista", "Sistema", "Subsistema", "TAG", "PID", "Elemento", "Nombre del operador", "Observaciones", "Firma del técnico", "Firma del supervisor", ni ninguna variante equivalente. Ya están.

Concentrate SOLO en los campos específicos de la disciplina de la planilla (parámetros técnicos, mediciones, resultados de la prueba, condiciones, verificaciones puntuales del procedimiento).

## Otras reglas

- Nombre de sección: en MAYÚSCULAS, corto (ej: "PARÁMETROS DE PRUEBA", "RESULTADOS", "CONDICIONES INICIALES"). NO uses "DATOS GENERALES" ni "OBSERVACIONES" — todo eso ya está cubierto.
- Marcá "esObligatorio: true" sólo para campos claramente críticos (mediciones, resultado). Los descriptivos son opcionales.
- Para campos numéricos, si el nombre no aclara la unidad, agregala a la etiqueta entre paréntesis (ej: "Presión de prueba (kg/cm²)").
- IGNORAR secciones de Firmas, Firma, Signatures, Autorización por firma (ya cubierto en footer).

## Formato de salida

**REGLA ABSOLUTA DE SALIDA**: tu respuesta debe empezar con \`{\` y terminar con \`}\`. Cero texto antes, cero texto después, cero bloques de código \`\`\`, cero comentarios, cero explicaciones. Si tenés dudas sobre algún campo, ponelo con un valor sensato pero seguí devolviendo SOLO el JSON. La respuesta se parsea automáticamente — cualquier caracter fuera del objeto rompe el sistema.

Devolvé ÚNICAMENTE un JSON válido con esta estructura exacta:

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
Lista con renderMode: 3 (Checklist) también SIEMPRE \`tamano: 12\`.
`

/**
 * Arma el system prompt completo prependiendo el INTRO específico del flujo
 * (descripción vs Excel) al bloque base compartido.
 */
export function buildPlanillaSystemPrompt(intro: string): string {
  return `${intro.trim()}\n\n${PLANILLA_SYSTEM_PROMPT_BASE.trim()}\n`
}
