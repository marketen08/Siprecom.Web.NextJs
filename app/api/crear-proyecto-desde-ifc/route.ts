import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/crear-proyecto-desde-ifc  (multipart/form-data)
//
// Crea un Proyecto nuevo a partir de un archivo IFC. Campos del form:
//   - nombre        (string, requerido)
//   - clienteId     (string, requerido)
//   - nombreArchivo (string, opcional)
//   - disciplina    (string, opcional)
//   - archivo       (File, requerido)
//
// El path NO va bajo /api/proyectos/... a propósito: chocaría con el ruteo
// dinámico /api/proyectos/[id]/route.ts y devolvería 405.
//
// Reusamos `backendFetch` pasándole el FormData parseado — Node re-serializa
// el multipart con su propio boundary (igual que el upload de IFC normal en
// /api/proyectos/[id]/ifc, que sí funciona).
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  // Backend route: /ifc/crear-proyecto. NO /proyectos/... — chocaba con
  // ProyectosController.{id} y devolvía 405 a nivel ASP.NET.
  const res = await backendFetch(request, `/ifc/crear-proyecto`, {
    method: "POST",
    body: formData,
  })
  const data = await res.json().catch(() => ({ message: "Error creando proyecto desde IFC" }))
  return Response.json(data, { status: res.status })
}
