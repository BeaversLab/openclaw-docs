---
summary: "Delegar la autenticación de la puerta de enlace a un proxy inverso de confianza (Pomerium, Caddy, nginx + OAuth)"
read_when:
  - Running OpenClaw behind an identity-aware proxy
  - Setting up Pomerium, Caddy, or nginx with OAuth in front of OpenClaw
  - Fixing WebSocket 1008 unauthorized errors with reverse proxy setups
  - Deciding where to set HSTS and other HTTP hardening headers
---

# Autenticación de Proxy de Confianza

> ⚠️ **Función sensible a la seguridad.** Este modo delega la autenticación por completo a su proxy inverso. Una configuración incorrecta puede exponer su Gateway a acceso no autorizado. Lea esta página cuidadosamente antes de habilitarla.

## Cuándo Usar

Use el modo de autenticación `trusted-proxy` cuando:

- Ejecuta OpenClaw detrás de un **proxy con reconocimiento de identidad** (Pomerium, Caddy + OAuth, nginx + oauth2-proxy, Traefik + forward auth)
- Su proxy maneja toda la autenticación y pasa la identidad del usuario a través de encabezados
- Está en un entorno de Kubernetes o contenedores donde el proxy es la única ruta hacia el Gateway
- Está encontrando errores de WebSocket `1008 unauthorized` porque los navegadores no pueden pasar tokens en las cargas útiles de WS

## Cuándo NO Usar

- Si su proxy no autentica a los usuarios (solo es un terminador TLS o balanceador de carga)
- Si existe alguna ruta al Gateway que omita el proxy (agujeros en el firewall, acceso a la red interna)
- Si no está seguro de si su proxy elimina/sobrescribe correctamente los encabezados reenviados
- Si solo necesita acceso personal de un solo usuario (considere Tailscale Serve + loopback para una configuración más sencilla)

## Cómo Funciona

1. Su proxy inverso autentica a los usuarios (OAuth, OIDC, SAML, etc.)
2. El proxy agrega un encabezado con la identidad del usuario autenticado (por ejemplo, `x-forwarded-user: nick@example.com`)
3. OpenClaw verifica que la solicitud provenga de una **IP de proxy de confianza** (configurada en `gateway.trustedProxies`)
4. OpenClaw extrae la identidad del usuario del encabezado configurado
5. Si todo se verifica, la solicitud está autorizada

## Comportamiento de Emparejamiento de la Interfaz de Control

Cuando `gateway.auth.mode = "trusted-proxy"` está activo y la solicitud pasa
las verificaciones de proxy de confianza, las sesiones WebSocket de la Interfaz de Control pueden conectarse sin identidad
de emparejamiento de dispositivo.

Implicaciones:

- El emparejamiento ya no es la puerta de enlace principal para el acceso a la Interfaz de Control en este modo.
- Su política de autenticación del proxy inverso y `allowUsers` se convierten en el control de acceso efectivo.
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
| `gateway.trustedProxies`                    | Sí          | Matriz de direcciones IP de proxy para confiar. Las solicitudes de otras IP se rechazan.                   |
| `gateway.auth.mode`                         | Sí          | Debe ser `"trusted-proxy"`                                                                                 |
| `gateway.auth.trustedProxy.userHeader`      | Sí          | Nombre del encabezado que contiene la identidad del usuario autenticado                                    |
| `gateway.auth.trustedProxy.requiredHeaders` | No          | Encabezados adicionales que deben estar presentes para que se confíe en la solicitud                       |
| `gateway.auth.trustedProxy.allowUsers`      | No          | Lista de permitidos de identidades de usuario. Vacío significa permitir a todos los usuarios autenticados. |

## Finalización TLS y HSTS

Use un punto de terminación TLS y aplique HSTS allí.

### Patrón recomendado: finalización TLS del proxy

Cuando su proxy inverso maneja HTTPS para `https://control.example.com`, configure
`Strict-Transport-Security` en el proxy para ese dominio.

- Adecuado para implementaciones orientadas a Internet.
- Mantiene el certificado + la política de endurecimiento HTTP en un solo lugar.
- OpenClaw puede permanecer en HTTP de bucle de retorno detrás del proxy.

Valor de encabezado de ejemplo:

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Finalización TLS de la puerta de enlace

Si OpenClaw mismo sirve HTTPS directamente (sin proxy de terminación TLS), configure:

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

`strictTransportSecurity` acepta un valor de encabezado de cadena o `false` para desactivar explícitamente.

### Guía de implementación

- Comience con una antigüedad máxima corta primero (por ejemplo `max-age=300`) mientras valida el tráfico.
- Aumente a valores de larga duración (por ejemplo `max-age=31536000`) solo después de tener una alta confianza.
- Agregue `includeSubDomains` solo si cada subdominio está listo para HTTPS.
- Use precarga solo si cumple intencionalmente los requisitos de precarga para su conjunto completo de dominios.
- El desarrollo local solo de bucle de retorno no se beneficia de HSTS.

## Ejemplos de configuración de proxy

### Pomerium

Pomerium pasa la identidad en `x-pomerium-claim-email` (u otros encabezados de reclamaciones) y un JWT en `x-pomerium-jwt-assertion`.

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

Caddy con el complemento `caddy-security` puede autenticar usuarios y pasar encabezados de identidad.

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

Antes de habilitar la autenticación de proxy confiable, verifique:

- [ ] **El proxy es la única ruta**: El puerto del Gateway está protegido por un firewall de todo excepto su proxy
- [ ] **trustedProxies es mínimo**: Solo sus IPs de proxy reales, no subredes completas
- [ ] **El proxy elimina encabezados**: Su proxy sobrescribe (no agrega) los encabezados `x-forwarded-*` de los clientes
- [ ] **Terminación TLS**: Su proxy maneja TLS; los usuarios se conectan a través de HTTPS
- [ ] **allowUsers está configurado** (recomendado): Restringir a usuarios conocidos en lugar de permitir a cualquier persona autenticada

## Auditoría de seguridad

`openclaw security audit` marcará la autenticación de proxy confiable con un hallazgo de severidad **crítica**. Esto es intencional: es un recordatorio de que está delegando la seguridad a su configuración de proxy.

La auditoría verifica:

- Falta la configuración `trustedProxies`
- Falta la configuración `userHeader`
- `allowUsers` vacío (permite cualquier usuario autenticado)

## Solución de problemas

### "trusted_proxy_untrusted_source"

La solicitud no provino de una IP en `gateway.trustedProxies`. Verifique:

- ¿Es correcta la IP del proxy? (Las IPs de los contenedores Docker pueden cambiar)
- ¿Hay un equilibrador de carga delante de su proxy?
- Use `docker inspect` o `kubectl get pods -o wide` para encontrar las IP reales

### "trusted_proxy_user_missing"

El encabezado de usuario estaba vacío o faltaba. Verifique:

- ¿Su proxy está configurado para pasar los encabezados de identidad?
- ¿Es correcto el nombre del encabezado? (no distingue mayúsculas de minúsculas, pero la ortografía importa)
- ¿Está el usuario realmente autenticado en el proxy?

### "trusted*proxy_missing_header*\*"

Faltaba un encabezado requerido. Verifique:

- La configuración de su proxy para esos encabezados específicos
- Si los encabezados se están eliminando en algún lugar de la cadena

### "trusted_proxy_user_not_allowed"

El usuario está autenticado pero no está en `allowUsers`. Agréguelo o elimine la lista de permitidos.

### WebSocket sigue fallando

Asegúrese de que su proxy:

- Admita actualizaciones de WebSocket (`Upgrade: websocket`, `Connection: upgrade`)
- Pase los encabezados de identidad en las solicitudes de actualización de WebSocket (no solo HTTP)
- No tiene una ruta de autenticación separada para las conexiones WebSocket

## Migración desde la autenticación por token

Si está pasando de la autenticación por token a proxy de confianza:

1. Configure su proxy para autenticar usuarios y pasar encabezados
2. Pruebe la configuración del proxy de forma independiente (curl con encabezados)
3. Actualice la configuración de OpenClaw con la autenticación de proxy de confianza
4. Reinicie el Gateway
5. Pruebe las conexiones WebSocket desde la interfaz de usuario de Control
6. Ejecute `openclaw security audit` y revise los hallazgos

## Relacionado

- [Seguridad](/es/gateway/security) — guía de seguridad completa
- [Configuración](/es/gateway/configuration) — referencia de configuración
- [Acceso remoto](/es/gateway/remote) — otros patrones de acceso remoto
- [Tailscale](/es/gateway/tailscale) — alternativa más sencilla para el acceso exclusivo a tailnet

import es from "/components/footer/es.mdx";

<es />
