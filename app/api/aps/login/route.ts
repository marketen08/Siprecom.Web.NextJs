import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.API_URL

/**
 * GET /api/aps/login?returnTo=...
 * Reenvía al backend, que responde 302 a Autodesk. Propagamos el redirect al
 * browser para que siga al login de Autodesk.
 *
 * Importante: este endpoint SE NAVEGA con `window.location.href = ...`, no se
 * fetchea — porque el browser tiene que poder seguir el 302 cross-origin.
 */
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value
  if (!accessToken) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const search = request.nextUrl.search
  const res = await fetch(`${BACKEND_URL}/aps/login${search}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: "manual",
  })

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location")
    if (location) return NextResponse.redirect(location)
  }
  return NextResponse.json(
    { message: `Backend respondió ${res.status} sin redirect.` },
    { status: 502 },
  )
}
