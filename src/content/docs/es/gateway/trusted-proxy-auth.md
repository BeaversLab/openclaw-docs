---
summary: "Delegar la autenticación de la puerta de enlace a un proxy inverso de confianza (Pomerium, Caddy, nginx + OAuth)"
title: "Autenticación de proxy de confianza"
sidebarTitle: "Autenticación de proxy de confianza"
read_when:
  - Running OpenClaw behind an identity-aware proxy
  - Setting up Pomerium, Caddy, or nginx with OAuth in front of OpenClaw
  - Fixing WebSocket 1008 unauthorized errors with reverse proxy setups
  - Deciding where to set HSTS and other HTTP hardening headers
---

<Warning>**Función sensible a la seguridad.** Este modo delega la autenticación por completo a su proxy inverso. Una configuración incorrecta puede exponer su puerta de enlace a accesos no autorizados. Lea esta página cuidadosamente antes de habilitarla.</Warning>

## Cuándo usar

Use el modo de autenticación `trusted-proxy` cuando:

- Ejecuta OpenClaw detrás de un **proxy con reconocimiento de identidad** (Pomerium, Caddy + OAuth, nginx + oauth2-proxy, Traefik + forward auth).
- Su proxy maneja toda la autenticación y pasa la identidad del usuario a través de encabezados.
- Está en un entorno de Kubernetes o contenedores donde el proxy es la única ruta hacia la puerta de enlace.
- Está encontrando errores de WebSocket `1008 unauthorized` porque los navegadores no pueden pasar tokens en las cargas útiles de WS.

## Cuándo NO usar

- Si su proxy no autentica a los usuarios (es solo un terminador TLS o un balanceador de carga).
- Si existe alguna ruta hacia la puerta de enlace que omita el proxy (agujeros en el firewall, acceso a la red interna).
- Si no está seguro de si su proxy elimina/sobrescribe correctamente los encabezados reenviados.
- Si solo necesita acceso personal de un solo usuario (considere Tailscale Serve + loopback para una configuración más simple).

## Cómo funciona

<Steps>
  <Step title="El proxy autentica al usuario">Su proxy inverso autentica a los usuarios (OAuth, OIDC, SAML, etc.).</Step>
  <Step title="El proxy agrega un encabezado de identidad">El proxy agrega un encabezado con la identidad del usuario autenticado (por ejemplo, `x-forwarded-user: nick@example.com`).</Step>
  <Step title="La puerta de enlace verifica la fuente de confianza">OpenClaw verifica que la solicitud proviene de una **IP de proxy de confianza** (configurada en `gateway.trustedProxies`).</Step>
  <Step title="La puerta de enlace extrae la identidad">OpenClaw extrae la identidad del usuario del encabezado configurado.</Step>
  <Step title="Autorizar">Si todo se verifica, la solicitud está autorizada.</Step>
</Steps>

## Controlar el comportamiento del emparejamiento de la interfaz de usuario

Cuando `gateway.auth.mode = "trusted-proxy"` está activo y la solicitud pasa las comprobaciones de proxy confiable, las sesiones WebSocket de la interfaz de usuario pueden conectarse sin la identidad de emparejamiento del dispositivo.

Implicaciones:

- El emparejamiento ya no es la puerta principal para el acceso a la Interfaz de Control en este modo.
- Su política de autenticación de proxy inverso y `allowUsers` se convierten en el control de acceso efectivo.
- Mantenga el ingreso de la puerta de enlace bloqueado solo a IPs de proxy confiables (`gateway.trustedProxies` + firewall).

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

<Warning>
**Reglas importantes de tiempo de ejecución**

- La autenticación de proxy confiable rechaza las solicitudes de origen de bucle local (loopback) (`127.0.0.1`, `::1`, CIDRs de bucle local).
- Los proxies inversos de bucle local en el mismo host **no** satisfacen la autenticación de proxy confiable.
- Para configuraciones de proxy de bucle local en el mismo host, utilice en su lugar la autenticación por token/contraseña, o enrute a través de una dirección de proxy confiable que no sea de bucle local y que OpenClaw pueda verificar.
- Las implementaciones de la interfaz de usuario que no sean de bucle local todavía necesitan `gateway.controlUi.allowedOrigins` explícito.
- **La evidencia de encabezados reenviados anula la localidad de bucle local.** Si una solicitud llega en bucle local pero lleva encabezados `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto` que apuntan a un origen no local, esa evidencia descalifica la reclamación de localidad de bucle local. La solicitud se trata como remota para el emparejamiento, la autenticación de proxy confiable y el control de identidad de dispositivo de la interfaz de usuario. Esto evita que un proxy de bucle local en el mismo mismo host blanquee la identidad de encabezados reenviados en la autenticación de proxy confiable.
  </Warning>

### Referencia de configuración

<ParamField path="gateway.trustedProxies" type="string[]" required>
  Matriz de direcciones IP de proxy de confianza. Las solicitudes de otras IP son rechazadas.
</ParamField>
<ParamField path="gateway.auth.mode" type="string" required>
  Debe ser `"trusted-proxy"`.
</ParamField>
<ParamField path="gateway.auth.trustedProxy.userHeader" type="string" required>
  Nombre del encabezado que contiene la identidad del usuario autenticado.
</ParamField>
<ParamField path="gateway.auth.trustedProxy.requiredHeaders" type="string[]">
  Encabezados adicionales que deben estar presentes para que la solicitud sea confiable.
</ParamField>
<ParamField path="gateway.auth.trustedProxy.allowUsers" type="string[]">
  Lista blanca de identidades de usuarios. Vacío significa permitir a todos los usuarios autenticados.
</ParamField>

## Finalización de TLS y HSTS

Utilice un punto de finalización de TLS y aplique HSTS allí.

<Tabs>
  <Tab title="Finalización de TLS del proxy (recomendado)">
    Cuando su proxy inverso maneja HTTPS para `https://control.example.com`, configure `Strict-Transport-Security` en el proxy para ese dominio.

    - Adecuado para despliegues orientados a Internet.
    - Mantiene el certificado + la política de endurecimiento HTTP en un solo lugar.
    - OpenClaw puede permanecer en HTTP de loopback detrás del proxy.

    Valor de encabezado de ejemplo:

    ```text
    Strict-Transport-Security: max-age=31536000; includeSubDomains
    ```

  </Tab>
  <Tab title="Finalización de TLS de Gateway">
    Si el propio OpenClaw sirve HTTPS directamente (sin proxy que finalice TLS), configure:

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

    `strictTransportSecurity` acepta un valor de encabezado de cadena, o `false` para desactivar explícitamente.

  </Tab>
</Tabs>

### Guía de implementación

- Comience con una edad máxima corta primero (por ejemplo `max-age=300`) mientras valida el tráfico.
- Aumente a valores de larga duración (por ejemplo `max-age=31536000`) solo después de tener una alta confianza.
- Agregue `includeSubDomains` solo si cada subdominio está listo para HTTPS.
- Use precarga solo si cumple intencionalmente los requisitos de precarga para su conjunto completo de dominios.
- El desarrollo local exclusivo de loopback no se beneficia de HSTS.

## Ejemplos de configuración de proxy

<AccordionGroup>
  <Accordion title="Pomerium">
    Pomerium pasa la identidad en `x-pomerium-claim-email` (u otros encabezados de claims) y un JWT en `x-pomerium-jwt-assertion`.

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

  </Accordion>
  <Accordion title="Caddy con OAuth">
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

  </Accordion>
  <Accordion title="nginx + oauth2-proxy">
    oauth2-proxy autentica usuarios y pasa la identidad en `x-auth-request-email`.

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

  </Accordion>
  <Accordion title="Traefik con forward auth">
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
  </Accordion>
</AccordionGroup>

## Configuración de token mixto

OpenClaw rechaza las configuraciones ambiguas donde tanto un `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`) como el modo `trusted-proxy` están activos al mismo tiempo. Las configuraciones de tokens mixtos pueden causar que las solicitudes de loopback se autentiquen silenciosamente en la ruta de autenticación incorrecta.

Si ve un error `mixed_trusted_proxy_token` al iniciar:

- Elimine el token compartido al usar el modo trusted-proxy, o
- Cambie `gateway.auth.mode` a `"token"` si pretende usar autenticación basada en token.

La autenticación trusted-proxy de loopback también falla de forma cerrada (fail closed): los llamadores del mismo host deben proporcionar los encabezados de identidad configurados a través de un proxy de confianza en lugar de ser autenticados silenciosamente.

## Encabezado de ámbitos de operador

La autenticación trusted-proxy es un modo HTTP **con identidad**, por lo que los llamadores pueden declarar opcionalmente los ámbitos de operador con `x-openclaw-scopes`.

Ejemplos:

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

Comportamiento:

- Cuando el encabezado está presente, OpenClaw respeta el conjunto de ámbitos declarados.
- Cuando el encabezado está presente pero vacío, la solicitud declara **ningún** ámbito de operador.
- Cuando falta el encabezado, las API HTTP de identidad normales vuelven al conjunto de alcances predeterminados del operador estándar.
- Las **rutas HTTP del complemento de autenticación de puerta de enlace** son más estrechas de forma predeterminada: cuando falta `x-openclaw-scopes`, su alcance de ejecución vuelve a `operator.write`.
- Las solicitudes HTTP de origen del navegador aún deben pasar `gateway.controlUi.allowedOrigins` (o el modo deliberado de reserva del encabezado Host) incluso después de que la autenticación de proxy de confianza tenga éxito.

Regla práctica: envíe `x-openclaw-scopes` explícitamente cuando desee que una solicitud de proxy de confianza sea más estrecha que los valores predeterminados, o cuando una ruta de complemento de autenticación de puerta de enlace necesite algo más fuerte que el alcance de escritura.

## Lista de verificación de seguridad

Antes de habilitar la autenticación de proxy de confianza, verifique:

- [ ] **El proxy es la única ruta**: El puerto de Gateway está protegido por un firewall de todo excepto de su proxy.
- [ ] **trustedProxies es mínimo**: Solo sus IPs de proxy reales, no subredes completas.
- [ ] **Sin origen de proxy de bucle invertido**: La autenticación de proxy de confianza falla de forma cerrada para las solicitudes de origen de bucle invertido.
- [ ] **El proxy elimina los encabezados**: Su proxy sobrescribe (no añade) los encabezados `x-forwarded-*` de los clientes.
- [ ] **Terminación TLS**: Su proxy maneja TLS; los usuarios se conectan a través de HTTPS.
- [ ] **allowedOrigins es explícito**: La interfaz de usuario de control que no es de bucle invertido usa `gateway.controlUi.allowedOrigins` explícito.
- [ ] **allowUsers está configurado** (recomendado): Restrinja a usuarios conocidos en lugar de permitir a cualquier persona autenticada.
- [ ] **Sin configuración de token mixta**: No configure tanto `gateway.auth.token` como `gateway.auth.mode: "trusted-proxy"`.

## Auditoría de seguridad

`openclaw security audit` marcará la autenticación de proxy de confianza con un hallazgo de severidad **crítica**. Esto es intencional: es un recordatorio de que está delegando la seguridad a su configuración de proxy.

La auditoría verifica:

- Recordatorio de advertencia/crítico de `gateway.trusted_proxy_auth` base
- Falta la configuración de `trustedProxies`
- Falta la configuración de `userHeader`
- `allowUsers` vacío (permite cualquier usuario autenticado)
- Política de origen de navegador comodín o faltante en superficies expuestas de la interfaz de usuario de control

## Solución de problemas

<AccordionGroup>
  <Accordion title="trusted_proxy_untrusted_source">
    La solicitud no provino de una IP en `gateway.trustedProxies`. Comprueba:

    - ¿Es correcta la IP del proxy? (Las IP de los contenedores de Docker pueden cambiar).
    - ¿Hay un equilibrador de carga delante de tu proxy?
    - Usa `docker inspect` o `kubectl get pods -o wide` para encontrar las IP reales.

  </Accordion>
  <Accordion title="trusted_proxy_loopback_source">
    OpenClaw rechazó una solicitud de proxy de confianza de origen de bucle local (loopback).

    Comprueba:

    - ¿Se está conectando el proxy desde `127.0.0.1` / `::1`?
    - ¿Estás intentando usar la autenticación de proxy de confianza con un proxy inverso de bucle local en el mismo host?

    Solución:

    - Usa la autenticación por token/contraseña para configuraciones de proxy de bucle local en el mismo host, o
    - Enruta a través de una dirección de proxy de confianza que no sea de bucle local y mantén esa IP en `gateway.trustedProxies`.

  </Accordion>
  <Accordion title="trusted_proxy_user_missing">
    El encabezado de usuario estaba vacío o ausente. Comprueba:

    - ¿Está tu proxy configurado para pasar los encabezados de identidad?
    - ¿Es correcto el nombre del encabezado? (no distingue entre mayúsculas y minúsculas, pero la ortografía importa)
    - ¿Está el usuario realmente autenticado en el proxy?

  </Accordion>
  <Accordion title="trusted_proxy_missing_header_*">
    Faltaba un encabezado requerido. Comprueba:

    - La configuración de tu proxy para esos encabezados específicos.
    - Si los encabezados están siendo eliminados en algún lugar de la cadena.

  </Accordion>
  <Accordion title="trusted_proxy_user_not_allowed">
    El usuario está autenticado pero no está en `allowUsers`. Añádelo o elimina la lista de permitidos.
  </Accordion>
  <Accordion title="trusted_proxy_origin_not_allowed">
    La autenticación de proxy de confianza se realizó correctamente, pero el encabezado `Origin` del navegador no pasó las comprobaciones de origen de la interfaz de usuario de Control.

    Compruebe:

    - `gateway.controlUi.allowedOrigins` incluye el origen exacto del navegador.
    - No está confiando en orígenes con comodines, a menos que intencionalmente desee un comportamiento de permitir todo.
    - Si utiliza intencionalmente el modo de reserva del encabezado Host, `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` está configurado deliberadamente.

  </Accordion>
  <Accordion title="WebSocket still failing">
    Asegúrese de que su proxy:

    - Admite actualizaciones de WebSocket (`Upgrade: websocket`, `Connection: upgrade`).
    - Pasa los encabezados de identidad en las solicitudes de actualización de WebSocket (no solo HTTP).
    - No tiene una ruta de autenticación separada para las conexiones WebSocket.

  </Accordion>
</AccordionGroup>

## Migración desde la autenticación por token

Si está pasando de la autenticación por token a proxy de confianza:

<Steps>
  <Step title="Configure the proxy">Configure su proxy para autenticar usuarios y pasar encabezados.</Step>
  <Step title="Test the proxy independently">Pruebe la configuración del proxy de forma independiente (curl con encabezados).</Step>
  <Step title="Update OpenClaw config">Actualice la configuración de OpenClaw con la autenticación de proxy de confianza.</Step>
  <Step title="Restart the Gateway">Reinicie el Gateway.</Step>
  <Step title="Test WebSocket">Pruebe las conexiones WebSocket desde la interfaz de usuario de Control.</Step>
  <Step title="Audit">Ejecute `openclaw security audit` y revise los hallazgos.</Step>
</Steps>

## Relacionado

- [Configuración](/es/gateway/configuration) — referencia de configuración
- [Acceso remoto](/es/gateway/remote) — otros patrones de acceso remoto
- [Seguridad](/es/gateway/security) — guía de seguridad completa
- [Tailscale](/es/gateway/tailscale) — alternativa más simple para el acceso solo a tailnet
