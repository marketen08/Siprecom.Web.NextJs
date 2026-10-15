import { NextRequest } from "next/server"

const BACKEND_URL = process.env.API_URL

// POST /api/licenciamiento/detector-firmas/preview  (multipart)
// Corre el detector con params override + archivo. Devuelve resultado extendido
// (densidad por slot, umbral usado, brillo fiducial, dimensiones del bitmap).
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value
  if (!accessToken) return Response.json({ message: "No autenticado" }, { status: 401 })

  const formData = await request.formData()
  const res = await fetch(`${BACKEND_URL}/licenciamiento/detector-firmas/preview`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
