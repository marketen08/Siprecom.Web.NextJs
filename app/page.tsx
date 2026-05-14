import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default async function Home() {
  const token = (await cookies()).get("accessToken")?.value
  redirect(token ? "/dashboard" : "/login")
}
