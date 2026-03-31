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
    // Use loopback for same-host proxy setups; use lan/custom for remote proxy hosts
    bind: "loopback",

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

Si `gateway.bind` es `loopback`, incluya una dirección de proxy de bucle de retorno en
`gateway.trustedProxies` (`127.0.0.1`, `::1`, o un CIDR de bucle de retorno equivalente).

### Referencia de configuración

| Campo                                       | Obligatorio | Descripción                                                                                                |
| ------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| `gateway.trustedProxies`                    | Sí          | Matriz de direcciones IP de proxy de confianza. Las solicitudes de otras IP son rechazadas.                |
| `gateway.auth.mode`                         | Sí          | Debe ser `"trusted-proxy"`                                                                                 |
| `gateway.auth.trustedProxy.userHeader`      | Sí          | Nombre del encabezado que contiene la identidad del usuario autenticado                                    |
| `gateway.auth.trustedProxy.requiredHeaders` | No          | Encabezados adicionales que deben estar presentes para que se confíe en la solicitud                       |
| `gateway.auth.trustedProxy.allowUsers`      | No          | Lista de permitidos de identidades de usuario. Vacío significa permitir a todos los usuarios autenticados. |

## Terminación TLS y HSTS

Utilice un punto de terminación TLS y aplique HSTS allí.

### Patrón recomendado: terminación TLS del proxy

Cuando su proxy inverso maneja HTTPS para `https://control.example.com`, establezca
`Strict-Transport-Security` en el proxy para ese dominio.

- Adecuado para despliegues orientados a Internet.
- Mantiene el certificado + la política de endurecimiento HTTP en un solo lugar.
- OpenClaw puede permanecer en HTTP de bucle de retorno detrás del proxy.

Valor de encabezado de ejemplo:

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Terminación TLS de la puerta de enlace

Si OpenClaw sirve HTTPS directamente (sin proxy de terminación TLS), configure:

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

`strictTransportSecurity` acepta un valor de encabezado de cadena, o `false` para deshabilitar explícitamente.

### Guía de implementación

- Comience con una antigüedad máxima corta primero (por ejemplo `max-age=300`) mientras valida el tráfico.
- Aumente a valores de larga duración (por ejemplo `max-age=31536000`) solo después de tener una alta confianza.
- Añada `includeSubDomains` solo si cada subdominio está listo para HTTPS.
- Use precarga solo si cumple intencionalmente con los requisitos de precarga para su conjunto completo de dominios.
- El desarrollo local de solo bucle de retorno no se beneficia de HSTS.

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
    trustedProxies: ["127.0.0.1"], // Caddy's IP (if on same host)
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

fragmento de configuración de nginx:

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

## Lista de verificación de seguridad

Antes de habilitar la autenticación de proxy de confianza, verifique:

- [ ] **El proxy es la única ruta**: El puerto del Gateway está protegido por un firewall de todo excepto de su proxy
- [ ] **trustedProxies es mínimo**: Solo sus IPs de proxy reales, no subredes completas
- [ ] **El proxy elimina los encabezados**: Su proxy sobrescribe (no añade) los encabezados `x-forwarded-*` de los clientes
- [ ] **Terminación TLS**: Su proxy maneja TLS; los usuarios se conectan a través de HTTPS
- [ ] **allowUsers está configurado** (recomendado): Restrinja a usuarios conocidos en lugar de permitir a cualquier usuario autenticado

## Auditoría de seguridad

`openclaw security audit` marcará la autenticación de proxy de confianza con un hallazgo de gravedad **crítica**. Esto es intencional: es un recordatorio de que está delegando la seguridad a su configuración de proxy.

La auditoría comprueba:

- Configuración faltante de `trustedProxies`
- Configuración faltante de `userHeader`
- `allowUsers` vacío (permite cualquier usuario autenticado)

## Solución de problemas

### "trusted_proxy_untrusted_source"

La solicitud no provino de una IP en `gateway.trustedProxies`. Compruebe:

- ¿Es correcta la IP del proxy? (Las IP de los contenedores de Docker pueden cambiar)
- ¿Hay un equilibrador de carga delante de su proxy?
- Use `docker inspect` o `kubectl get pods -o wide` para encontrar las IP reales

### "trusted_proxy_user_missing"

El encabezado de usuario estaba vacío o faltaba. Compruebe:

- ¿Está su proxy configurado para pasar los encabezados de identidad?
- ¿Es correcto el nombre del encabezado? (distingue mayúsculas y minúsculas, pero la ortografía importa)
- ¿Está el usuario realmente autenticado en el proxy?

### "trusted*proxy_missing_header*\*"

Faltaba un encabezado requerido. Compruebe:

- La configuración de su proxy para esos encabezados específicos
- Si los encabezados se están eliminando en algún lugar de la cadena

### "trusted_proxy_user_not_allowed"

El usuario está autenticado pero no está en `allowUsers`. Agréguelo o elimine la lista de permitidos.

### WebSocket sigue fallando

Asegúrese de que su proxy:

- Admite actualizaciones de WebSocket (`Upgrade: websocket`, `Connection: upgrade`)
- Pasa los encabezados de identidad en las solicitudes de actualización de WebSocket (no solo HTTP)
- No tiene una ruta de autenticación separada para las conexiones WebSocket

## Migración desde Token Auth

Si estás pasando de la autenticación por token a trusted-proxy:

1. Configura tu proxy para autenticar usuarios y pasar encabezados
2. Prueba la configuración del proxy de forma independiente (curl con encabezados)
3. Actualiza la configuración de OpenClaw con autenticación trusted-proxy
4. Reinicia el Gateway
5. Prueba las conexiones WebSocket desde la interfaz de usuario de Control
6. Ejecuta `openclaw security audit` y revisa los hallazgos

## Relacionado

- [Seguridad](/en/gateway/security) — guía de seguridad completa
- [Configuración](/en/gateway/configuration) — referencia de configuración
- [Acceso remoto](/en/gateway/remote) — otros patrones de acceso remoto
- [Tailscale](/en/gateway/tailscale) — alternativa más sencilla para acceso exclusivo a tailnet
