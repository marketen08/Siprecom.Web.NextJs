"use client"

import { useEffect, useState } from "react"

import { useAuthStore } from "@/store/auth-store"
import { canWrite as canWriteFn, isReadOnly as isReadOnlyFn, meetsRole, type AppRole } from "@/lib/roles"

/**
 * Roles del usuario actual desde el store, protegidos contra hidration
 * mismatch: durante SSR y el primer render del cliente devolvemos [] para
 * que el render inicial matchee ambos lados.
 */
export function useRoles(): string[] {
  const roles = useAuthStore((s) => s.user?.roles)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted ? (roles ?? []) : []
}

/**
 * True si el usuario actual puede escribir (User o superior en la jerarquía).
 * Consultor y Auditor son solo lectura — para ellos devuelve false.
 * Ejemplo: <Button disabled={!canWrite}> o {canWrite && <BotonNuevo />}
 */
export function useCanWrite(): boolean {
  const roles = useRoles()
  return canWriteFn(roles)
}

/** Inverso semántico. */
export function useIsReadOnly(): boolean {
  const roles = useRoles()
  return isReadOnlyFn(roles)
}

/** True si el usuario alcanza el rol mínimo. Espejo del `meetsRole` sin hook. */
export function useMeetsRole(min: AppRole): boolean {
  const roles = useRoles()
  return meetsRole(roles, min)
}
