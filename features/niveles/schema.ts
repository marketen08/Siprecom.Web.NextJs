import { z } from "zod"

export const nivelSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(50, "El nombre no puede superar los 50 caracteres"),
  posicion: z
    .number({ message: "La posición es requerida" })
    .int("La posición debe ser un número entero")
    .min(0, "La posición debe ser entre 0 y 999")
    .max(999, "La posición debe ser entre 0 y 999"),
})

export type NivelFormValues = z.infer<typeof nivelSchema>
