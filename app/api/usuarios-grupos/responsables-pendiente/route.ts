import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// Grupos que se ofrecen al elegir el responsable de un pendiente. Ruta estática y no
// bajo [id]: si no, Next la resolvería como el detalle de un grupo con id
// "responsables-pendiente".
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/usuarios-grupos/responsables-pendiente")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
