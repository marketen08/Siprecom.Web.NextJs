import { NextResponse } from "next/server"

// Para borrar una cookie hay que matchear el path con el que se seteó ("/" en el
// login). Si se borra sin path, el Set-Cookie toma el default-path del request
// (/api/auth) y NO elimina la cookie real (path "/"): queda viva y al volver a "/"
// te redirige a /dashboard como si siguieras logueado.
const EXPIRE_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0,
}

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set("accessToken", "", EXPIRE_COOKIE)
  response.cookies.set("refreshToken", "", EXPIRE_COOKIE)
  return response
}
