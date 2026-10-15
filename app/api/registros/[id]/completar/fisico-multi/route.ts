import { NextRequest } from "next/server"

const BACKEND_URL = process.env.API_URL

// POST /api/registros/[id]/completar/fisico-multi  (multipart, N archivos)
// Los PDFs se mergean en uno solo del lado backend; las imágenes van como
// adjuntos independientes. Usado por la carga rápida cuando un grupo tiene
// múltiples archivos con el mismo QR (o adjuntos sin QR).
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/registros/[id]/completar/fisico-multi">,
) {
  const { id } = await context.params
  const accessToken = request.cookies.get("accessToken")?.value
  if (!accessToken) return Response.json({ message: "No autenticado" }, { status: 401 })

  const formData = await request.formData()
  const res = await fetch(`${BACKEND_URL}/registros/${id}/completar/fisico-multi`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
