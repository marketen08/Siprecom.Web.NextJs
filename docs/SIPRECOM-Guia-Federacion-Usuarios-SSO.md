# Guía técnica de implementación — Federación de usuarios (SSO)

**Producto:** SIPRECOM
**Stack:** Next.js (frontend) + .NET 8 (backend API) sobre Azure App Service
**IdP base:** Microsoft Entra ID
**Alcance:** Habilitación de Single Sign-On (SSO) y federación de identidades de clientes
**Estándares de referencia:** OWASP ASVS L2, OWASP Top 10, OAuth 2.1 / OpenID Connect

---

## 1. Objetivo y alcance

Esta guía describe cómo habilitar el inicio de sesión federado (SSO) en SIPRECOM, de modo que los usuarios de organizaciones cliente —por ejemplo YPF— accedan con las credenciales de su propio proveedor de identidad corporativo, sin que SIPRECOM gestione credenciales locales.

Cubre tres aspectos:

1. La integración de SIPRECOM (frontend Next.js + API .NET 8) con Microsoft Entra ID como proveedor de identidad de la aplicación.
2. La configuración de la federación entre Entra ID y el IdP del cliente.
3. El endurecimiento de seguridad, el manejo de múltiples entornos y la validación.

**Principio rector:** el backend .NET 8 confía siempre en Entra ID y valida el token emitido por Entra. El mecanismo por el cual el usuario se autenticó aguas arriba (su IdP corporativo) es transparente para la aplicación. Esto evita acoplar la API a cada cliente.

---

## 2. Modelos de federación — árbol de decisión

La elección depende de qué IdP usa el cliente y de si SIPRECOM se ofrece como integración puntual B2B o como SaaS multi-cliente.

| Situación del cliente | Modelo recomendado | Tenant a usar |
|---|---|---|
| El cliente ya está en Microsoft Entra ID | Colaboración B2B (invitación de guests) | Tenant workforce de NUWARE |
| El cliente usa AD FS, Okta, Ping u otro IdP SAML/WS-Fed | Federación directa SAML/WS-Fed (basada en dominio) | Tenant workforce de NUWARE |
| SIPRECOM como SaaS de cara a múltiples clientes/consumidores | Microsoft Entra External ID (CIAM) | Tenant *external* dedicado |

### 2.1 Modelo A — Colaboración B2B (cliente en Entra ID)

Es la opción más simple y la de menor mantenimiento. Se invita a los usuarios (o se habilita el *self-service sign-up*) y se gobierna el acceso mediante *cross-tenant access settings*. No requiere intercambiar metadata SAML ni certificados. El usuario inicia sesión con su cuenta organizacional y aparece como *guest* en el tenant de NUWARE.

### 2.2 Modelo B — Federación directa SAML/WS-Fed (cliente con IdP propio)

Aplica cuando el cliente mantiene un IdP que soporta SAML 2.0 o WS-Fed (típicamente AD FS, o suites como Okta/Ping). La federación se configura **a nivel de dominio** (por ejemplo, `@ypf.com`): cualquier usuario invitado de ese dominio se autentica contra el IdP del cliente.

**Nota de soporte:** la federación tenant-a-tenant por OIDC entre dos tenants de Entra **no está soportada** como mecanismo directo. Si ambos lados son Entra, conviene el Modelo A; si el cliente expone un IdP SAML/WS-Fed, se usa este modelo.

### 2.3 Modelo C — Entra External ID (CIAM)

Para SIPRECOM como SaaS que da de alta a múltiples organizaciones y/o consumidores con experiencias de registro personalizadas. Se usa un *external tenant* separado del tenant corporativo de NUWARE. Soporta federación con IdPs externos vía OIDC, SAML 2.0 y WS-Fed.

> **Importante (estado de producto):** Azure AD B2C dejó de estar disponible para nuevos clientes el 1 de mayo de 2025; sigue soportado para clientes existentes hasta aproximadamente 2030. Para toda implementación nueva, el sucesor es Microsoft Entra External ID. No iniciar proyectos nuevos sobre B2C.

---

## 3. Prerrequisitos

- Permisos en el tenant de Entra: rol **Application Administrator** (registro de apps) y **External Identity Provider Administrator** (federación).
- Dominios de los entornos publicados en Azure App Service (dev / test / prod) con HTTPS.
- Acceso a Azure Key Vault para el almacenamiento de secretos.
- Del lado del cliente (solo Modelo B): metadata de federación del IdP (URL del servicio de tokens, certificado de firma, identificador de emisor) y voluntad de configurar los claims requeridos en su IdP.
- Decisión tomada sobre el modelo de federación (sección 2).

---

## 4. Integración de SIPRECOM con Entra ID

### 4.1 Registro de aplicaciones

Conviene registrar **dos aplicaciones** separadas en Entra: una para el frontend (cliente público que inicia sesión) y otra que represente a la API .NET 8 (recurso protegido). Esto permite definir scopes y permisos con granularidad.

**App 1 — API SIPRECOM (recurso protegido)**
- Tipo: aplicación web / API.
- En *Expose an API*: definir el *Application ID URI* (ej. `api://<api-client-id>`) y al menos un scope, p. ej. `access_as_user`.
- En *App roles*: definir roles de aplicación (ej. `Siprecom.User`, `Siprecom.Admin`) para autorización por roles.

**App 2 — Frontend SIPRECOM (Next.js)**
- Tipo: SPA / aplicación web.
- *Redirect URIs*: una por entorno (ver sección 7).
- En *API permissions*: agregar el scope expuesto por la App 1 (`api://<api-client-id>/access_as_user`).
- Habilitar PKCE (por defecto en flujos de código de autorización para SPA).

### 4.2 Frontend Next.js — cliente OIDC

El frontend ejecuta el flujo interactivo de OpenID Connect (Authorization Code + PKCE), obtiene el token de acceso y lo envía a la API .NET como *Bearer*. Se puede implementar con MSAL.js o con una librería de sesión (ej. NextAuth) configurada contra el endpoint de Entra:

- Authority: `https://login.microsoftonline.com/<tenant-id>/v2.0`
- Client ID: el de la App 2.
- Scopes: `openid profile <api://.../access_as_user>`.
- Nunca almacenar tokens en `localStorage` accesible a scripts de terceros; preferir cookies `HttpOnly`/`Secure` o el patrón BFF (Backend-for-Frontend) si la postura de seguridad lo requiere.

### 4.3 Backend .NET 8 — API protegida

Paquete NuGet:

```bash
dotnet add package Microsoft.Identity.Web
```

`appsettings.json` (sección `AzureAd` para una API protegida):

```json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "<tenant-id>",
    "ClientId": "<api-client-id>",
    "Audience": "api://<api-client-id>"
  }
}
```

`Program.cs`:

```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Identity.Web;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireSiprecomUser", policy =>
        policy.RequireRole("Siprecom.User", "Siprecom.Admin"));
});

builder.Services.AddControllers();

var app = builder.Build();

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

Protección de endpoints:

```csharp
[Authorize(Policy = "RequireSiprecomUser")]
[ApiController]
[Route("api/[controller]")]
public class RecursosController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        // Para acceso por scope delegado:
        // HttpContext.VerifyUserHasAnyAcceptedScope("access_as_user");
        var userId = User.GetObjectId(); // oid del usuario en Entra
        return Ok(new { userId });
    }
}
```

La librería valida automáticamente la firma, el *issuer* y la *audience* del token contra los metadatos de Entra. No se debe deshabilitar esta validación.

---

## 5. Configuración de la federación con el IdP del cliente

### 5.1 Modelo A — Invitación B2B (cliente en Entra)

1. En **Entra ID → External Identities → Cross-tenant access settings**, configurar los ajustes *inbound* para el tenant del cliente: protocolos de confianza (MFA, cumplimiento de dispositivo) y claims compartidos.
2. Invitar a los usuarios (manual, en bloque, o habilitar *self-service sign-up* para el dominio del cliente).
3. El usuario redime la invitación con su cuenta organizacional y queda registrado como *guest*.

Ventaja: cualquier control adicional que NUWARE imponga sobre los guests (por ejemplo, MFA reforzada) aplica también a estos usuarios, y al darse de baja en su organización pierden el acceso.

### 5.2 Modelo B — Federación SAML/WS-Fed

1. En **Entra ID → External Identities → All identity providers → pestaña Custom**, agregar un nuevo IdP SAML/WS-Fed.
2. Cargar la metadata del IdP del cliente: URL del servicio de tokens (*passive auth endpoint*), identificador del emisor (*issuer URI*) y certificado de firma. Se puede vincular el XML del *security token service* o ingresar los valores manualmente.
3. La federación se asocia al **espacio de nombres del dominio** del cliente (ej. `ypf.com`). Verificar que ese dominio **no** esté ya verificado en el propio tenant.
4. El cliente debe configurar en su IdP la *relying party trust* y los claims requeridos por Entra (identificador del usuario y atributos de correo/UPN coherentes con el dominio federado). Para AD FS, Microsoft documenta el ejemplo de configuración como SAML 2.0 o WS-Fed.
5. Ajustar el **orden de redención** (*redemption order*) en *cross-tenant access settings* para que el IdP SAML/WS-Fed quede priorizado sobre Microsoft Entra ID y por encima del *one-time passcode* de respaldo.
6. Validar invitando a un usuario guest de prueba del dominio federado.

**Consideraciones operativas del Modelo B:**
- La federación es **a nivel de dominio**: aplica a todos los usuarios que inician sesión con ese dominio. Es una decisión de alcance, no por usuario.
- Configurar la federación **no** cambia el método de autenticación de guests que ya redimieron la invitación. Para migrarlos hay que resetear su estado de redención.
- Si se elimina la federación, los usuarios que dependían de ese IdP dejan de poder iniciar sesión.
- Los certificados SAML del cliente vencen: ver sección 8 (monitoreo de vencimiento).

### 5.3 Modelo C — External ID (CIAM)

1. Crear un *external tenant* dedicado (separado del tenant corporativo).
2. Registrar las aplicaciones de SIPRECOM en ese tenant.
3. Configurar *user flows* (registro/inicio de sesión) y, según el cliente, agregar IdPs externos por OIDC o SAML/WS-Fed.
4. La lógica avanzada de *custom policies* de B2C no está soportada en External ID; las necesidades equivalentes se cubren con *user flows*, *API connectors* y extensibilidad.

---

## 6. Mapeo de claims y autorización

- **Identidad estable:** usar el claim `oid` (object id) como identificador inmutable del usuario en SIPRECOM. No usar el correo como clave primaria (puede cambiar).
- **Roles:** preferir *App roles* de Entra sobre grupos cuando sea posible (más portable y no depende del tamaño del grupo ni de claims sobredimensionados). Los roles llegan en el claim `roles`.
- **Multi-organización:** el claim `tid` (tenant id) identifica de qué organización proviene el usuario; útil para particionar datos por cliente.
- En el backend, autorizar por política (`[Authorize(Policy = ...)]`) y nunca por confianza ciega en claims auto-reportados por el frontend.
- Verificar tanto el *scope* delegado (`scp`) como los roles según el tipo de endpoint.

---

## 7. Manejo de múltiples entornos (dev / test / prod)

- **Un registro de aplicación por entorno** (o, como mínimo, *redirect URIs* y secretos separados). No compartir la misma app entre prod y entornos inferiores.
- *Redirect URIs* por entorno, todas sobre HTTPS:
  - `https://siprecom-dev.azurewebsites.net/...`
  - `https://siprecom-test.azurewebsites.net/...`
  - `https://app.siprecom.<dominio>/...`
- Configuración por entorno mediante *App Settings* de Azure App Service y/o *slots* de deployment, leyendo `TenantId` / `ClientId` / `Audience` desde la configuración, no hardcodeados.
- Secretos y certificados en **Azure Key Vault**, referenciados desde App Service mediante *managed identity*. Evitar *client secrets* en el repositorio o en `appsettings`.
- Para la federación SAML (Modelo B), idealmente probar primero contra un IdP de prueba del cliente o un dominio de staging antes de federar el dominio productivo.

---

## 8. Endurecimiento de seguridad (alineado a ASVS L2)

- **Validación de token estricta:** issuer, audience y firma validados por la librería; no relajar `TokenValidationParameters`.
- **PKCE obligatorio** en el flujo de autorización del frontend; nunca usar el flujo implícito.
- **`state` y `nonce`** verificados para mitigar CSRF y *replay* (los maneja la librería de OIDC, no desactivar).
- **Sin secretos en código:** *managed identity* + Key Vault. Rotación periódica de secretos/certificados.
- **MFA y Conditional Access:** aplicar políticas de acceso condicional a los guests federados (MFA, ubicación, cumplimiento de dispositivo).
- **HTTPS extremo a extremo** y *HSTS*; rechazar tokens recibidos por canales no seguros.
- **Manejo de tokens en el cliente:** preferir cookies `HttpOnly`/`Secure` o patrón BFF; evitar exponer *access tokens* a JavaScript.
- **Monitoreo de vencimiento de certificados SAML (Modelo B):** en *All identity providers* se ven las fechas de expiración de certificados de cada IdP federado. Definir un proceso de renovación previo al vencimiento para evitar caídas de login del cliente.
- **Principio de menor privilegio** en los permisos de API y *App roles*.
- **Logging y trazabilidad:** registrar eventos de autenticación/autorización sin volcar tokens ni datos sensibles en logs.

---

## 9. Pruebas y validación

1. **Flujo end-to-end:** un usuario del cliente inicia sesión en el frontend, es redirigido a su IdP, vuelve autenticado y el frontend llama a la API con el *Bearer* válido.
2. **Validación de token en la API:** confirmar que se rechazan tokens con audience/issuer incorrectos o firma inválida (HTTP 401).
3. **Autorización por rol:** verificar que un usuario sin el rol requerido recibe 403.
4. **Federación (Modelo B):** invitar un guest de prueba del dominio federado y validar la redención y el *issuer* "external federation" en su perfil.
5. **Logout:** verificar el cierre de sesión federado (front-channel/single logout según el IdP).
6. **Expiración y refresh:** validar el comportamiento ante expiración de access token y la renovación silenciosa.
7. **Pruebas negativas alineadas a OWASP:** manipulación de claims, token de otro tenant, reutilización de código de autorización, *open redirect* en `redirect_uri`.

---

## 10. Checklist de puesta en producción

- [ ] Modelo de federación decidido y documentado por cliente.
- [ ] Apps registradas por entorno con *redirect URIs* productivos.
- [ ] Scopes y *App roles* definidos.
- [ ] Secretos/certificados en Key Vault con *managed identity*.
- [ ] Validación de token verificada (issuer/audience/firma).
- [ ] PKCE habilitado; flujo implícito descartado.
- [ ] Conditional Access / MFA aplicado a guests federados.
- [ ] (Modelo B) Metadata e claims del IdP del cliente confirmados; orden de redención ajustado.
- [ ] (Modelo B) Proceso de monitoreo y renovación de certificados SAML definido.
- [ ] Pruebas end-to-end, de autorización y negativas superadas.
- [ ] Logout federado verificado.
- [ ] Logs sin datos sensibles; trazabilidad de eventos de auth.

---

## 11. Troubleshooting común

| Síntoma | Causa probable | Acción |
|---|---|---|
| 401 en la API con token aparentemente válido | `Audience` mal configurada (no coincide con `api://<client-id>`) | Alinear `Audience`/`ClientId` en `appsettings` con el App ID URI |
| El usuario federado no es redirigido a su IdP | Orden de redención no prioriza el IdP SAML/WS-Fed | Mover el IdP federado por encima de Entra ID en *cross-tenant access settings* |
| Falla la redención de invitación | Claims requeridos no enviados por el IdP del cliente | Coordinar con el cliente la configuración de claims y *relying party trust* |
| Login del cliente cae súbitamente | Certificado SAML del IdP vencido | Renovar/actualizar el certificado en *All identity providers* |
| Cambio de método de auth no aplica a un guest existente | La federación no afecta a guests ya redimidos | Resetear el estado de redención del usuario |
| Intento de federación OIDC tenant-a-tenant falla | No está soportado entre tenants de Entra | Usar B2B (Modelo A) o SAML/WS-Fed (Modelo B) |

---

*Documento de trabajo interno — NUWARE / SIPRECOM. Revisar la documentación oficial de Microsoft Entra antes de cada implementación productiva, ya que la nomenclatura y las capacidades del producto evolucionan.*
