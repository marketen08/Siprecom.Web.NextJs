/**
 * Cuántas filas acepta un campo Tabla.
 *
 * Vive acá, en `campos`, y no en `registros`, porque el límite es de la DEFINICIÓN: el
 * diseñador no debería dejar configurar una planilla con más filas por defecto de las que
 * después se van a poder cargar. Antes el diseñador aceptaba hasta 100 y la carga cortaba
 * en 10, así que una planilla configurada con 40 renglones mostraba 10 y nadie se enteraba
 * hasta que el inspector se quedaba sin dónde escribir.
 *
 * **Estos números están duplicados en el backend** (`MinFilasDinamica` / `MaxFilasDinamica`
 * en `Core/Helpers/TablaValorHelper.cs`). Tienen que decir lo mismo: si acá dice más, el
 * operador carga filas que la API le rechaza al guardar, con el registro ya tipeado.
 *
 * El tope aplica SÓLO a las tablas dinámicas, donde el operador agrega filas. Una tabla
 * matriz define sus filas en la planilla y no tiene límite: la de condiciones ambientales
 * son 93 (31 días × 3 horarios) y se carga sin problema.
 */

/** Mínimo de filas de una tabla dinámica. Menos de dos no es una tabla. */
export const TABLA_MIN_FILAS = 2

/**
 * Máximo de filas de una tabla dinámica.
 *
 * Estuvo en 10 hasta que cargamos los registros de calidad de OPS: las trazabilidades de
 * soldadura, el control de torque de bridas y la solicitud de END traen formularios de 17
 * a 41 renglones, y con 10 no entraba ninguno entero.
 *
 * 50 es el techo de lo que entra cómodo en el ValorJson de un solo RegistroValor —una
 * tabla de 50×40 son 2000 celdas en un único string— y es más que cualquier formulario en
 * papel del parque. Si alguna vez hace falta más, el problema deja de ser esta constante
 * y pasa a ser guardar la tabla como filas propias en vez de como un JSON.
 */
export const TABLA_MAX_FILAS = 50
