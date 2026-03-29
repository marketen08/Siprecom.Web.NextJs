import { z } from "zod"

export const usuarioSchema = z.object({
  nombre: z.string().optional(),
  apellido: z.string().optional(),
  proyectoId: z.string().optional(),
})

export type UsuarioFormValues = z.infer<typeof usuarioSchema>
