import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const API_URL = process.env.API_URL

/**
 * GET /api/auth/metodos — qué métodos de ingreso ofrece este ambiente.
 *
 * Proxy anónimo (la pantalla de login lo consulta antes de que haya sesión). El
 * backend combina el toggle del SuperAdmin con si el IDP está configurado, así
 * que un método puede estar encendido en Licenciamiento y aun así no aparecer.
 *
 * Ante cualquier falla devolvemos solo `password` en true: es el único método que
 * no depende de un proveedor externo, así que degradar hacia él deja una vía de
 * entrada en vez de una pantalla sin botones.
 */
const FALLBACK = { password: true, microsoft: false, ypf: false, google: false }

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/auth/metodos`, { cache: "no-store" })
    if (!res.ok) {
      console.error("[auth/metodos] backend respondió", res.status)
      return NextResponse.json(FALLBACK)
    }
    return NextResponse.json(await res.json())
  } catch (e) {
    console.error("[auth/metodos] no se pudo contactar a la API:", e)
    return NextResponse.json(FALLBACK)
  }
}
