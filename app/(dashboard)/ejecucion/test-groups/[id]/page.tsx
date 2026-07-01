// Ruta espejo del detalle de TestGroup — reusa el mismo componente que hay
// en /alcance/test-groups/[id]. Así el user entra por Ejecución al mismo
// detalle (tabs Info / Elementos / Tareas / Progreso) sin duplicar código.
export { default } from "@/app/(dashboard)/alcance/test-groups/[id]/page"
