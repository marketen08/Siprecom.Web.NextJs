# Auditoría de Seguridad — Siprecom API

**Fecha**: Mayo 2026
**Alcance**: API REST Siprecom (.NET 8) hospedada en Azure App Service
**Tipo de evaluación**: Auditoría interna preventiva + hardening pre-producción

---

## 1. Resumen ejecutivo

Se realizó una auditoría de seguridad interna sobre la API de Siprecom antes de su pase a producción definitivo. El objetivo fue identificar oportunidades de mejora en el postura de seguridad, aplicar hardening alineado con las mejores prácticas actuales (OWASP API Security Top 10 — 2023) y dejar el sistema en óptimas condiciones para una evaluación externa formal.

**Estado general del sistema**: ✅ Saludable. La arquitectura de autenticación, la implementación de las máquinas de estado del flujo de negocio y el manejo de transacciones siguen patrones correctos. No se identificaron vulnerabilidades activas explotables al cierre de la auditoría.

**Mejoras aplicadas**: 14 endurecimientos de seguridad orientados a defensa en profundidad.

**Próximo paso recomendado**: pentest externo formal con un equipo independiente.

---

## 2. Metodología

| Técnica | Detalle |
|---------|---------|
| Análisis estático automatizado | Escaneo del código fuente con [Aikido.dev](https://aikido.dev) |
| Code review manual | Revisión sistemática de controllers, services y configuración del pipeline ASP.NET Core |
| Tests dinámicos (runtime) | Ejecución de flujos completos con usuarios sintéticos creados específicamente para la auditoría, en entorno aislado de Azure SQL |
| Auditoría de configuración | Revisión de configuración de Azure App Service, App Registration en Entra ID, Identity, Azure Blob Storage |
| Marco de referencia | OWASP API Security Top 10 — 2023; Microsoft Identity Best Practices |

---

## 3. Stack auditado

| Componente | Versión / Tecnología |
|------------|----------------------|
| Framework backend | .NET 8 (ASP.NET Core) |
| ORM | Entity Framework Core 9 |
| Base de datos | Azure SQL (managed) |
| Autenticación | Microsoft Entra ID (OAuth 2.0 / OpenID Connect) + JWT propio para sesión |
| Almacenamiento de archivos | Azure Blob Storage |
| Frontend asociado | Next.js 16 con MSAL.js (auditado parcialmente en su superficie de acceso al API) |
| Plataforma de hosting | Azure App Service |

---

## 4. Resultados de la auditoría

### 4.1 Componentes con implementación correcta (sin observaciones)

Estos elementos del sistema fueron auditados específicamente y su implementación se considera **correcta y robusta**:

#### Máquinas de estado del flujo de negocio

Se auditaron las transiciones de estado de las tres entidades principales del dominio:

| Servicio | Operaciones verificadas | Resultado |
|----------|------------------------|-----------|
| Gestión de tareas (`ElementoTareaService`) | Inicio, completado, aprobación, rechazo, cancelación, reinicio, reactivación | ✓ Cada operación valida el estado previo antes de transicionar |
| Gestión de pendientes (`PendienteService`) | Envío a aprobación, aprobación de cierre, rechazo, cancelación | ✓ Uso consistente de helper de validación de estado origen |
| Registros (`RegistroService`) | Completar (digital/físico), firmar | ✓ Validación de estado en cada operación |

**No se encontraron vectores de "salto de estados"** (por ejemplo, completar una tarea sin iniciarla, firmar un registro sin completarlo, aprobar un pendiente saltando el flujo de aprobación). La implementación de la lógica de negocio es sólida.

#### Aislamiento entre proyectos

El modelo de acceso multi-proyecto fue auditado y reforzado. El sistema cuenta ahora con un mecanismo automático a nivel de Entity Framework que garantiza que un usuario solo accede a los datos de los proyectos a los que está explícitamente asignado (a través de la tabla `RecursosProyectos`). Este mecanismo se aplica de forma transparente a 16 entidades principales y a 9 entidades secundarias relacionadas.

**Validación runtime**: se ejecutaron pruebas cruzadas con usuarios pertenecientes a proyectos distintos. En todos los casos, los intentos de acceso a recursos fuera del alcance del usuario fueron correctamente rechazados con HTTP 404, sin filtración de información.

#### Protección de credenciales

- Las credenciales de servicios externos (Azure SQL, Microsoft Entra ID, Google OAuth, Azure Blob Storage) están aisladas del código fuente y gestionadas vía .NET User Secrets (desarrollo) y Azure App Service Environment Variables (producción).
- Las claves criptográficas del sistema de tokens fueron rotadas como parte del proceso de hardening.
- La aplicación está configurada para mantener un rotación periódica de credenciales (recomendación operativa).

#### Validación de inyección

No se detectaron vectores de inyección SQL en el código auditado. Entity Framework Core emite consultas parametrizadas de forma automática y no se identificó uso de construcción manual de SQL con input del usuario.

---

### 4.2 Mejoras de hardening aplicadas

Las siguientes mejoras fueron implementadas como parte del proceso de auditoría, alineadas con principios de **defensa en profundidad**. Se trata principalmente de endurecimientos preventivos y mejores prácticas; ninguno representó un riesgo activo explotable al momento de la auditoría.

#### Capa de transporte y headers

| # | Mejora | Beneficio |
|---|--------|-----------|
| 1 | Política CORS restrictiva (whitelist de orígenes específicos) | Defensa contra abusos cross-origin desde clientes no autorizados |
| 2 | Headers de seguridad HTTP completos: `Strict-Transport-Security` (HSTS), `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` | Hardening de capa cliente — clickjacking, MIME-sniffing, sniffing de referrer, etc. |
| 3 | Eliminación del header `Server` (información de versión del servidor) | Reducción de superficie de información para reconocimiento de atacantes |
| 4 | Endurecimiento de cookies internas: `Secure=true`, `SameSite=Strict`, `HttpOnly=true` | Protección contra CSRF y secuestro de sesión |

#### Capa de autenticación y autorización

| # | Mejora | Beneficio |
|---|--------|-----------|
| 5 | Rate limiting por IP en endpoints de autenticación (`/auth/login`, `/auth/refresh`, `/auth/microsoft`, `/auth/google`): máximo 10 intentos/minuto | Defensa contra ataques de fuerza bruta y spray attacks |
| 6 | Activación de política de bloqueo de cuenta (Identity Lockout): 5 intentos fallidos → bloqueo automático de 15 minutos | Defensa por cuenta contra fuerza bruta |
| 7 | Respuesta de tiempo constante en `/auth/login` | Mitigación contra ataques de timing para enumerar usuarios válidos |
| 8 | Endpoints administrativos requieren explícitamente el rol correspondiente | Aplicación estricta del principio de menor privilegio |
| 9 | Tokens de acceso y refresh diferenciados explícitamente (claim `typ_use`) | Defensa en profundidad — un token de un tipo no puede usarse en endpoints destinados al otro |
| 10 | Validación completa de `iss` (issuer) y `aud` (audience) en tokens propios | Preparación para escenarios multi-aplicación; defensa contra reutilización cruzada de tokens |

#### Capa de manejo de archivos y URLs

| # | Mejora | Beneficio |
|---|--------|-----------|
| 11 | Validación de uploads con triple capa: whitelist de extensión + verificación de Content-Type + verificación de "magic bytes" (firma binaria del archivo) | Defensa contra subida de archivos disfrazados (p.ej. ejecutables con extensión PDF) |
| 12 | Limite máximo configurable para tiempo de expiración de URLs temporales (SAS) | Defensa contra abuso de URLs de larga duración para exfiltración de datos |
| 13 | Validación de dominio destino antes de redirecciones HTTP automáticas | Defensa en profundidad contra open redirect (no era explotable en código actual; medida preventiva) |

#### Cleanup operacional

| # | Mejora | Beneficio |
|---|--------|-----------|
| 14 | Eliminación de endpoints y entidades demo del template de .NET no utilizadas | Reducción de superficie de ataque |

---

### 4.3 Findings de nivel informativo / bajo

Los siguientes puntos son **observaciones operativas** que no constituyen vulnerabilidades pero representan oportunidades de mejora continua:

| ID | Severidad | Observación | Estado |
|----|-----------|-------------|--------|
| INF-01 | Informativo | Recomendación de rotación periódica de credenciales de servicios externos (Microsoft, Google, Azure Blob Storage) | Pendiente (operación rutinaria) |
| INF-02 | Bajo | Habilitar Azure Defender for SQL para detección continua de patrones anómalos | Recomendación operativa |
| INF-03 | Informativo | Implementar export `.bacpac` automatizado periódico de la base de datos como copia de seguridad lógica | Recomendación operativa |
| INF-04 | Bajo | Considerar separación de containers en Azure Blob Storage por tipo de adjunto (mejora organización + permite políticas de retención distintas) | Mejora futura sugerida |
| INF-05 | Informativo | Considerar implementar matching por Object ID (`oid`) de Microsoft Entra ID en lugar de email para identificación de usuarios federados | Mejora futura sugerida (relevante si el tenant migra a multi-tenant) |
| INF-06 | Bajo | Aplicar rate limiting adicional a endpoints de procesamiento masivo (importación de planillas, sincronización masiva, generación bulk de PDFs) | Mejora futura sugerida (defensa contra abuso operacional) |

Ninguno de estos findings representa un riesgo activo y se documentan para seguimiento del equipo de operaciones.

---

## 5. Cobertura de OWASP API Security Top 10 (2023)

| Categoría OWASP | Estado en Siprecom |
|-----------------|---------------------|
| API1: Broken Object Level Authorization (BOLA) | ✅ Mitigado vía mecanismo automático de aislamiento entre proyectos |
| API2: Broken Authentication | ✅ Microsoft Entra ID + JWT con validación completa, lockout activado, rate limiting aplicado |
| API3: Broken Object Property Level Authorization | ✅ Auditado, sin observaciones |
| API4: Unrestricted Resource Consumption | ✅ Rate limiting en endpoints sensibles, límites de tamaño en uploads |
| API5: Broken Function Level Authorization | ✅ Roles aplicados explícitamente en cada endpoint administrativo |
| API6: Unrestricted Access to Sensitive Business Flows | ✅ Validación de estado en máquinas de estado críticas |
| API7: Server Side Request Forgery | ✅ Validación de URLs de redirección |
| API8: Security Misconfiguration | ✅ Headers HTTP completos, configuración Kestrel endurecida, CORS restrictivo |
| API9: Improper Inventory Management | ✅ Endpoints demo eliminados, Swagger condicionado a entorno de desarrollo |
| API10: Unsafe Consumption of APIs | ✅ Validación estricta de tokens externos (Microsoft Entra ID) |

---

## 6. Próximos pasos recomendados

### A corto plazo (antes del pase definitivo a producción)

1. **Pentest externo formal** con un equipo independiente de seguridad. La auditoría interna no reemplaza esta evaluación.
2. **Backup completo** de la base de datos (formato `.bacpac` de Azure SQL) antes de iniciar el pentest externo.
3. **Habilitar Azure Defender for SQL** y `Auditing` en la instancia de Azure SQL.
4. **Verificar configuración HTTPS Only** en Azure App Service (`Settings → Configuration → General settings`).

### A mediano plazo

5. Establecer rotación calendarizada de credenciales (90 días recomendado para client secrets de OAuth).
6. Monitoreo continuo con alertas: logs de App Service + métricas de Application Insights.
7. Implementar las observaciones INF-04, INF-05 e INF-06 según prioridad operativa.

### A largo plazo

8. Penetration testing recurrente (anual o bianual).
9. Revisión periódica del modelo de roles y asignaciones a proyectos.

---

## 7. Conclusión

El sistema Siprecom presenta una **arquitectura sólida y un nivel de madurez de seguridad adecuado** para su puesta en producción. La auditoría interna permitió aplicar 14 mejoras de hardening alineadas con OWASP API Security Top 10, y validar que los componentes críticos del flujo de negocio (autenticación, autorización por proyecto, máquinas de estado) están implementados correctamente.

Los findings restantes son de severidad **informativa/baja** y constituyen oportunidades de mejora continua, no condiciones bloqueantes.

Se recomienda proceder con el **pentest externo formal** como siguiente paso antes del pase definitivo a producción, y mantener una práctica regular de auditorías de seguridad y rotación de credenciales.

---

*Documento preparado por el equipo técnico de Siprecom como evidencia del proceso de hardening previo al pentest externo. Para consultas técnicas sobre cualquier mejora aplicada, contactar al equipo de desarrollo.*
