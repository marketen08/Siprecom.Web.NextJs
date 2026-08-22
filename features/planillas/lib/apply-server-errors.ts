import type { PlanillaFormValues } from "../schema"

export {
  applyServerErrorsToForm,
  type ServerValidationError,
} from "@/lib/apply-server-errors"

/**
 * Map field name backend (PascalCase) → field del form (lowerCamel) para Planilla.
 *
 * El caso que motivó esto: al crear con un Código+Versión ya existente el backend
 * devuelve un error de validación en "Codigo", pero el sheet no lo mostraba en
 * ningún lado y la creación fallaba en silencio.
 *
 * Los fields que no estén acá caen a "root" y se muestran como banner del form,
 * así que un error nuevo del backend nunca queda invisible.
 */
export const PLANILLA_FIELD_MAP: Record<string, keyof PlanillaFormValues> = {
  Codigo: "codigo",
  Nombre: "nombre",
  Version: "version",
  Descripcion: "descripcion",
  Observaciones: "observaciones",
  EspecialidadId: "especialidadId",
  OrientacionPdf: "orientacionPdf",
  MargenPagina: "margenPagina",
  EsEncabezadoTG: "esEncabezadoTG",
}
