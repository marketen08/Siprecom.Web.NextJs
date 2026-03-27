import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Server-safe: usa Buffer en lugar de window.atob
export function decodeJWT(token: string): Record<string, unknown> {
  const base64Url = token.split('.')[1]
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const json = Buffer.from(base64, 'base64').toString('utf-8')
  return JSON.parse(json)
}
