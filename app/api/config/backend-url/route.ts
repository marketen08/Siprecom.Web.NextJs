import { NextResponse } from "next/server"

/**
 * Endpoint público que devuelve la URL del backend Siprecom que este frontend
 * usa. Sirve al descubrimiento de config de la app WinForms: el operador conoce
 * solo la URL de la web (donde loguea normalmente), no la del backend. La app
 * de escritorio hace GET a este endpoint contra la URL que el usuario ingresa
 * y obtiene el backend URL para usar directo.
 *
 * No expone secretos — la URL del backend aparece igual en la Network tab del
 * browser cuando la web proxea llamadas. Este endpoint solo la formaliza para
 * clientes headless.
 */
export async function GET() {
  const backendUrl = process.env.API_URL
  if (!backendUrl) {
    return NextResponse.json(
      { message: "API_URL no configurada en el entorno." },
      { status: 500 }
    )
  }
  // Sin trailing slash — el WinForms concatena `/api/...` cuando lo usa.
  const normalized = backendUrl.replace(/\/+$/, "")
  return NextResponse.json({ backendUrl: normalized })
}
