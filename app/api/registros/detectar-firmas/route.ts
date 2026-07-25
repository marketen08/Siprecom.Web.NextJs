import { NextRequest } from "next/server"

const BACKEND_URL = process.env.API_URL

// POST /api/registros/detectar-firmas  (multipart)
// Proxy al backend que rasteriza PDFs (Docnet) y detecta firmas sobre imágenes.
// Camino único para todos los clientes: mandan el archivo tal cual, sin
// pre-procesamiento client-side.
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value
  if (!accessToken) return Response.json({ message: "No autenticado" }, { status: 401 })

  const formData = await request.formData()
  const res = await fetch(`${BACKEND_URL}/registros/detectar-firmas`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
