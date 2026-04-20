---
title: "Trusted Proxy Auth"
summary: "Delegar la autenticación de la puerta de enlace a un proxy inverso de confianza (Pomerium, Caddy, nginx + OAuth)"
read_when:
  - Running OpenClaw behind an identity-aware proxy
  - Setting up Pomerium, Caddy, or nginx with OAuth in front of OpenClaw
  - Fixing WebSocket 1008 unauthorized errors with reverse proxy setups
  - Deciding where to set HSTS and other HTTP hardening headers
---

# Trusted Proxy Auth

> ⚠️ **Función sensible a la seguridad.** Este modo delega la autenticación por completo a su proxy inverso. Una configuración incorrecta puede exponer su Gateway a accesos no autorizados. Lea esta página cuidadosamente antes de habilitarla.

## Cuándo usar

Use el modo de autenticación `trusted-proxy` cuando:

- Ejecute OpenClaw detrás de un **proxy con reconocimiento de identidad** (Pomerium, Caddy + OAuth, nginx + oauth2-proxy, Traefik + forward auth)
- Su proxy maneja toda la autenticación y pasa la identidad del usuario a través de encabezados
- Está en un entorno de Kubernetes o contenedores donde el proxy es la única ruta hacia el Gateway
- Está encontrando errores de WebSocket `1008 unauthorized` porque los navegadores no pueden pasar tokens en las cargas útiles de WS

## Cuándo NO usar

- Si su proxy no autentica a los usuarios (es solo un terminador TLS o balanceador de carga)
- Si existe alguna ruta hacia el Gateway que omita el proxy (agujeros en el firewall, acceso a la red interna)
- Si no está seguro de si su proxy elimina/sobrescribe correctamente los encabezados reenviados
- Si solo necesita acceso personal de un solo usuario (considere Tailscale Serve + loopback para una configuración más sencilla)

## Cómo funciona

1. Su proxy inverso autentica a los usuarios (OAuth, OIDC, SAML, etc.)
2. El proxy añade un encabezado con la identidad del usuario autenticado (p. ej., `x-forwarded-user: nick@example.com`)
3. OpenClaw verifica que la solicitud provenga de una **IP de proxy de confianza** (configurada en `gateway.trustedProxies`)
4. OpenClaw extrae la identidad del usuario del encabezado configurado
5. Si todo se verifica, la solicitud está autorizada

## Comportamiento de emparejamiento de la interfaz de control

Cuando `gateway.auth.mode = "trusted-proxy"` está activo y la solicitud pasa
las comprobaciones de proxy de confianza, las sesiones de WebSocket de la Interfaz de Control pueden conectarse sin identidad
de emparejamiento de dispositivo.

Implicaciones:

- El emparejamiento ya no es la puerta principal para el acceso a la Interfaz de Control en este modo.
- Su política de autenticación de proxy inverso y `allowUsers` se convierten en el control de acceso efectivo.
- Mantenga el ingreso de la puerta de enlace bloqueado solo a IPs de proxy de confianza (`gateway.trustedProxies` + firewall).

## Configuración

```json5
{
  gateway: {
    // Trusted-proxy auth expects requests from a non-loopback trusted proxy source
    bind: "lan",

    // CRITICAL: Only add your proxy's IP(s) here
    trustedProxies: ["10.0.0.1", "172.17.0.1"],

    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        // Header containing authenticated user identity (required)
        userHeader: "x-forwarded-user",

        // Optional: headers that MUST be present (proxy verification)
        requiredHeaders: ["x-forwarded-proto", "x-forwarded-host"],

        // Optional: restrict to specific users (empty = allow all)
        allowUsers: ["nick@example.com", "admin@company.org"],
      },
    },
  },
}
```

Regla importante de tiempo de ejecución:

- La autenticación de proxy de confianza rechaza las solicitudes de origen de bucle invertido (`127.0.0.1`, `::1`, CIDRs de bucle invertido).
- Los proxies inversos de bucle invertido del mismo host **no** satisfacen la autenticación de proxy de confianza.
- Para configuraciones de proxy de bucle invertido del mismo host, utilice en su lugar la autenticación por token/contraseña, o enrute a través de una dirección de proxy de confianza que no sea de bucle invertido que OpenClaw pueda verificar.
- Las implementaciones de la Interfaz de usuario de control (Control UI) que no son de bucle invertido aún necesitan `gateway.controlUi.allowedOrigins` explícito.

### Referencia de configuración

| Campo                                       | Obligatorio | Descripción                                                                                                |
| ------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| `gateway.trustedProxies`                    | Sí          | Matriz de direcciones IP de proxy para confiar. Las solicitudes de otras IP se rechazan.                   |
| `gateway.auth.mode`                         | Sí          | Debe ser `"trusted-proxy"`                                                                                 |
| `gateway.auth.trustedProxy.userHeader`      | Sí          | Nombre del encabezado que contiene la identidad del usuario autenticado                                    |
| `gateway.auth.trustedProxy.requiredHeaders` | No          | Encabezados adicionales que deben estar presentes para que se confíe en la solicitud                       |
| `gateway.auth.trustedProxy.allowUsers`      | No          | Lista de permitidos de identidades de usuario. Vacío significa permitir a todos los usuarios autenticados. |

## Terminación TLS y HSTS

Utilice un punto de terminación TLS y aplique HSTS allí.

### Patrón recomendado: terminación TLS del proxy

Cuando su proxy inverso maneja HTTPS para `https://control.example.com`, configure
`Strict-Transport-Security` en el proxy para ese dominio.

- Adecuado para implementaciones orientadas a Internet.
- Mantiene el certificado + la política de endurecimiento HTTP en un solo lugar.
- OpenClaw puede mantenerse en HTTP de bucle invertido detrás del proxy.

Valor de encabezado de ejemplo:

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Terminación TLS de la puerta de enlace

Si el propio OpenClaw sirve HTTPS directamente (sin proxy de terminación TLS), configure:

```json5
{
  gateway: {
    tls: { enabled: true },
    http: {
      securityHeaders: {
        strictTransportSecurity: "max-age=31536000; includeSubDomains",
      },
    },
  },
}
```

`strictTransportSecurity` acepta un valor de encabezado de cadena o `false` para deshabilitar explícitamente.

### Guía de implementación

- Comience con una antigüedad máxima corta primero (por ejemplo, `max-age=300`) mientras valida el tráfico.
- Aumente a valores de larga duración (por ejemplo, `max-age=31536000`) solo después de tener una alta confianza.
- Agregue `includeSubDomains` solo si cada subdominio está listo para HTTPS.
- Use precarga solo si cumple intencionalmente los requisitos de precarga para su conjunto completo de dominios.
- El desarrollo local exclusivamente de bucle invertido no se beneficia de HSTS.

## Ejemplos de configuración de proxy

### Pomerium

Pomerium pasa la identidad en `x-pomerium-claim-email` (u otros encabezados de reclamos) y un JWT en `x-pomerium-jwt-assertion`.

```json5
{
  gateway: {
    bind: "lan",
    trustedProxies: ["10.0.0.1"], // Pomerium's IP
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "x-pomerium-claim-email",
        requiredHeaders: ["x-pomerium-jwt-assertion"],
      },
    },
  },
}
```

Fragmento de configuración de Pomerium:

```yaml
routes:
  - from: https://openclaw.example.com
    to: http://openclaw-gateway:18789
    policy:
      - allow:
          or:
            - email:
                is: nick@example.com
    pass_identity_headers: true
```

### Caddy con OAuth

Caddy con el plugin `caddy-security` puede autenticar usuarios y pasar encabezados de identidad.

```json5
{
  gateway: {
    bind: "lan",
    trustedProxies: ["10.0.0.1"], // Caddy/sidecar proxy IP
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "x-forwarded-user",
      },
    },
  },
}
```

Fragmento de Caddyfile:

```
openclaw.example.com {
    authenticate with oauth2_provider
    authorize with policy1

    reverse_proxy openclaw:18789 {
        header_up X-Forwarded-User {http.auth.user.email}
    }
}
```

### nginx + oauth2-proxy

oauth2-proxy autentica a los usuarios y pasa la identidad en `x-auth-request-email`.

```json5
{
  gateway: {
    bind: "lan",
    trustedProxies: ["10.0.0.1"], // nginx/oauth2-proxy IP
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "x-auth-request-email",
      },
    },
  },
}
```

Fragmento de configuración de nginx:

```nginx
location / {
    auth_request /oauth2/auth;
    auth_request_set $user $upstream_http_x_auth_request_email;

    proxy_pass http://openclaw:18789;
    proxy_set_header X-Auth-Request-Email $user;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### Traefik con Forward Auth

```json5
{
  gateway: {
    bind: "lan",
    trustedProxies: ["172.17.0.1"], // Traefik container IP
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "x-forwarded-user",
      },
    },
  },
}
```

## Configuración de token mixto

OpenClaw rechaza configuraciones ambiguas donde tanto un `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`) como el modo `trusted-proxy` están activos al mismo tiempo. Las configuraciones de tokens mixtos pueden causar que las solicitudes de loopback se autentiquen silenciosamente en la ruta de autenticación incorrecta.

Si ve un error `mixed_trusted_proxy_token` al iniciar:

- Elimine el token compartido cuando use el modo trusted-proxy, o
- Cambie `gateway.auth.mode` a `"token"` si pretende usar autenticación basada en tokens.

La autenticación trusted-proxy de loopback también falla de forma cerrada: los llamadores del mismo host deben suministrar los encabezados de identidad configurados a través de un proxy de confianza en lugar de autenticarse silenciosamente.

## Encabezado de ámbitos de operador

La autenticación trusted-proxy es un modo HTTP **con identidad**, por lo que los llamadores pueden
opcionalmente declarar ámbitos de operador con `x-openclaw-scopes`.

Ejemplos:

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

Comportamiento:

- Cuando el encabezado está presente, OpenClaw respeta el conjunto de ámbitos declarados.
- Cuando el encabezado está presente pero vacío, la solicitud declara **ningún** ámbito de operador.
- Cuando el encabezado está ausente, las APIs HTTP normales con identidad vuelven al conjunto estándar de ámbitos predeterminados del operador.
- Las **rutas HTTP del complemento** de gateway-auth son más estrechas de forma predeterminada: cuando `x-openclaw-scopes` está ausente, su ámbito de tiempo de ejecución vuelve a `operator.write`.
- Las solicitudes HTTP originadas en el navegador aún tienen que pasar `gateway.controlUi.allowedOrigins` (o el modo deliberado de reserva de encabezado Host) incluso después de que la autenticación trusted-proxy tenga éxito.

Regla práctica:

- Envíe `x-openclaw-scopes` explícitamente cuando desee que una solicitud de proxy confiable sea
  más estricta que la configuración predeterminada, o cuando una ruta de complemento gateway-auth necesite
  algo más fuerte que el ámbito de escritura.

## Lista de verificación de seguridad

Antes de habilitar la autenticación de proxy confiable, verifique:

- [ ] **El proxy es la única ruta**: El puerto del Gateway está protegido por un firewall contra todo excepto su proxy
- [ ] **trustedProxies es mínimo**: Solo sus IPs de proxy reales, no subredes completas
- [ ] **Sin fuente de proxy de bucle invertido**: la autenticación de proxy confiable falla de forma segura para las solicitudes de origen de bucle invertido
- [ ] **El proxy elimina los encabezados**: Su proxy sobrescribe (no añade) los encabezados `x-forwarded-*` de los clientes
- [ ] **Terminación TLS**: Su proxy maneja TLS; los usuarios se conectan a través de HTTPS
- [ ] **allowedOrigins es explícito**: La interfaz de usuario de Control que no sea de bucle invertido usa `gateway.controlUi.allowedOrigins` explícito
- [ ] **allowUsers está configurado** (recomendado): Restrinja a usuarios conocidos en lugar de permitir a cualquier persona autenticada
- [ ] **Sin configuración de token mixta**: No configure tanto `gateway.auth.token` como `gateway.auth.mode: "trusted-proxy"`

## Auditoría de seguridad

`openclaw security audit` marcará la autenticación de proxy confiable con un hallazgo de severidad **crítica**. Esto es intencional: es un recordatorio de que está delegando la seguridad a su configuración de proxy.

La auditoría verifica:

- Recordatorio de advertencia/crítico de `gateway.trusted_proxy_auth` base
- Falta la configuración `trustedProxies`
- Falta la configuración `userHeader`
- `allowUsers` vacío (permite cualquier usuario autenticado)
- Política de origen de navegador con comodín o faltante en superficies de interfaz de usuario de Control expuestas

## Solución de problemas

### "trusted_proxy_untrusted_source"

La solicitud no provino de una IP en `gateway.trustedProxies`. Verifique:

- ¿Es correcta la IP del proxy? (Las IP de los contenedores Docker pueden cambiar)
- ¿Hay un equilibrador de carga delante de su proxy?
- Use `docker inspect` o `kubectl get pods -o wide` para encontrar las IP reales

### "trusted_proxy_loopback_source"

OpenClaw rechazó una solicitud de proxy confiable de origen de bucle invertido.

Verifique:

- ¿El proxy se está conectando desde `127.0.0.1` / `::1`?
- ¿Está intentando usar la autenticación de proxy confiable con un proxy inverso de bucle invertido en el mismo host?

Solución:

- Use la autenticación por token/contraseña para configuraciones de proxy de bucle de retorno en el mismo host, o
- Enrutamiento a través de una dirección de proxy de confianza que no sea de bucle de retorno y mantenga esa IP en `gateway.trustedProxies`.

### "trusted_proxy_user_missing"

El encabezado de usuario estaba vacío o faltaba. Verifique:

- ¿Está su proxy configurado para pasar encabezados de identidad?
- ¿Es correcto el nombre del encabezado? (no distingue entre mayúsculas y minúsculas, pero la ortografía importa)
- ¿Está el usuario realmente autenticado en el proxy?

### "trusted*proxy_missing_header*\*"

Faltaba un encabezado requerido. Verifique:

- La configuración de su proxy para esos encabezados específicos
- Si los encabezados se están eliminando en algún lugar de la cadena

### "trusted_proxy_user_not_allowed"

El usuario está autenticado pero no en `allowUsers`. Agréguelo o elimine la lista de permitidos.

### "trusted_proxy_origin_not_allowed"

La autenticación de proxy de confianza tuvo éxito, pero el encabezado `Origin` del navegador no pasó las verificaciones de origen de la interfaz de usuario de Control.

Verifique:

- `gateway.controlUi.allowedOrigins` incluye el origen exacto del navegador
- No está dependiendo de orígenes comodín a menos que intencionalmente desee un comportamiento de permitir todo
- Si usa intencionalmente el modo de reserva del encabezado Host, `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` se establece deliberadamente

### WebSocket sigue fallando

Asegúrese de que su proxy:

- Admite actualizaciones de WebSocket (`Upgrade: websocket`, `Connection: upgrade`)
- Pasa los encabezados de identidad en las solicitudes de actualización de WebSocket (no solo HTTP)
- No tiene una ruta de autenticación separada para las conexiones WebSocket

## Migración desde la autenticación por token

Si está pasando de la autenticación por token a la de proxy de confianza:

1. Configure su proxy para autenticar usuarios y pasar encabezados
2. Pruebe la configuración del proxy de forma independiente (curl con encabezados)
3. Actualice la configuración de OpenClaw con autenticación de proxy de confianza
4. Reinicie el Gateway
5. Pruebe las conexiones WebSocket desde la interfaz de usuario de Control
6. Ejecute `openclaw security audit` y revise los hallazgos

## Relacionado

- [Seguridad](/es/gateway/security) — guía de seguridad completa
- [Configuración](/es/gateway/configuration) — referencia de configuración
- [Acceso remoto](/es/gateway/remote) — otros patrones de acceso remoto
- [Tailscale](/es/gateway/tailscale) — alternativa más simple para acceso solo a tailnet
