import type { NextConfig } from "next";

/**
 * Encabezados de seguridad. Cierran los hallazgos #3 y #4 del pentest de
 * Personal Tech (jul-2026) y el conjunto complementario que el evaluador relevó.
 *
 * Se aplican a todas las rutas. Los que NO están, y por qué, al final del archivo.
 */
const HEADERS_SEGURIDAD = [
  {
    // Hallazgo #4. Sin includeSubDomains todavía: el plan de remediación pide
    // validar antes el impacto sobre los subdominios (test-ypf, ypf, test...),
    // porque el flag los alcanza a todos y no se puede revertir por subdominio.
    // Tampoco preload: esa lista es de salida lenta y conviene entrar último.
    // Rollback si hiciera falta: max-age=0, los browsers lo respetan.
    key: "Strict-Transport-Security",
    value: "max-age=31536000",
  },
  {
    // Hallazgo #3. X-Frame-Options es el mecanismo viejo; lo dejamos por los
    // browsers que no miran frame-ancestors. El que manda es la CSP de abajo.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Hallazgo #3, mecanismo actual. CSP mínima a propósito: SOLO frame-ancestors.
    // Una CSP completa (script-src y compañía) rompería el visor de Autodesk, que
    // se carga dinámico desde developer.api.autodesk.com, y merece su propia
    // pasada con pruebas. Esto cierra el hallazgo sin arrastrar ese riesgo.
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'",
  },
  {
    // Evita que el browser adivine el tipo de una respuesta. Sin esto, un archivo
    // subido por un usuario puede terminar interpretado como HTML o JS.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // No filtrar la URL completa (que lleva ids de proyecto, elemento, registro)
    // hacia destinos externos. Mismo origen conserva la URL entera.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // La app no usa ninguna de estas APIs — verificado por búsqueda en el código.
    // Declararlo explícitamente evita que una dependencia futura las use sin que
    // nadie lo decida.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    // same-origin-allow-popups, no same-origin: la exportación de codificaciones
    // abre una ventana con window.open("", "_blank") y le escribe el contenido,
    // así que necesita conservar la relación con el opener.
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    // Que otros sitios no puedan cargar nuestras respuestas como subrecurso.
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
];

// Deliberadamente NO incluidos:
//
// Cross-Origin-Embedder-Policy: require-corp
//   Rompería el visor 3D. El SDK y el CSS vienen de developer.api.autodesk.com,
//   que no emite CORP, así que quedarían bloqueados sin error visible.
//
// CSP completa (default-src / script-src / style-src)
//   Mismo motivo, más el riesgo de romper estilos inline. Va en una tarea propia,
//   arrancando en Report-Only para medir antes de bloquear.

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: HEADERS_SEGURIDAD }];
  },
};

export default nextConfig;
