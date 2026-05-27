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
- Estás encontrando errores de WebSocket `1008 unauthorized` porque los navegadores no pueden pasar tokens en las cargas útiles de WS.

## Cuándo NO usar

- Si su proxy no autentica a los usuarios (es solo un terminador TLS o un balanceador de carga).
- Si existe alguna ruta hacia la puerta de enlace que omita el proxy (agujeros en el firewall, acceso a la red interna).
- Si no está seguro de si su proxy elimina/sobrescribe correctamente los encabezados reenviados.
- Si solo necesita acceso personal de un solo usuario (considere Tailscale Serve + loopback para una configuración más simple).

## Cómo funciona

<Steps>
  <Step title="El proxy autentica al usuario">Su proxy inverso autentica a los usuarios (OAuth, OIDC, SAML, etc.).</Step>
  <Step title="El proxy añade un encabezado de identidad">El proxy añade un encabezado con la identidad del usuario autenticado (p. ej., `x-forwarded-user: nick@example.com`).</Step>
  <Step title="El Gateway verifica la fuente de confianza">OpenClaw verifica que la solicitud proviene de una **IP de proxy de confianza** (configurada en `gateway.trustedProxies`).</Step>
  <Step title="La puerta de enlace extrae la identidad">OpenClaw extrae la identidad del usuario del encabezado configurado.</Step>
  <Step title="Autorizar">Si todo se verifica, la solicitud está autorizada.</Step>
</Steps>

## Controlar el comportamiento del emparejamiento de la interfaz de usuario

Cuando `gateway.auth.mode = "trusted-proxy"` está activo y la solicitud pasa las verificaciones de proxy de confianza, las sesiones de WebSocket de la Interfaz de Control (Control UI) pueden conectarse sin la identidad de emparejamiento de dispositivos.

Implicaciones:

- El emparejamiento ya no es la puerta principal para el acceso a la Interfaz de Control en este modo.
- Su política de autenticación de proxy inverso y `allowUsers` se convierten en el control de acceso efectivo.
- Mantenga el ingreso de la puerta de enlace bloqueado solo a IPs de proxy de confianza (`gateway.trustedProxies` + firewall).

**Limpieza de ámbitos sin identidad de dispositivo:** Dado que el navegador sobre HTTP
simple no puede crear la identidad de dispositivo que OpenClaw utiliza para vincular los
ámbitos del operador, las conexiones de WebSocket de proxy de confianza que carecen
de identidad de dispositivo tienen sus ámbitos autodeclarados borrados a un conjunto
vacío. Se permite la conexión, pero los métodos limitados por ámbito (`operator.read`, `operator.write`, etc.) fallan con
`missing scope`.

Para preservar los ámbitos del operador en las conexiones de WebSocket de proxy de
confianza sin identidad de dispositivo, establezca `gateway.controlUi.dangerouslyDisableDeviceAuth: true`.
Este es un indicador de emergencia (`openclaw security audit` lo informa como crítico).
Úselo solo cuando el proxy inverso es la única ruta hacia la Gateway y la identidad
del dispositivo no se puede establecer.

## Configuración

```json5
{
  gateway: {
    // Trusted-proxy auth expects requests from a non-loopback trusted proxy source by default
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

        // Optional: allow a same-host loopback proxy after explicit opt-in
        allowLoopback: false,
      },
    },
  },
}
```

<Warning>
**Reglas importantes de tiempo de ejecución**

- La autenticación de proxy confiable rechaza las solicitudes de origen de bucle local (`127.0.0.1`, `::1`, CIDRs de bucle local) de forma predeterminada.
- Los proxies inversos de bucle local del mismo host **no** satisfacen la autenticación de proxy confiable a menos que configure explícitamente `gateway.auth.trustedProxy.allowLoopback = true` e incluya la dirección de bucle local en `gateway.trustedProxies`.
- `allowLoopback` confía en los procesos locales en el host de Gateway en el mismo grado que en el proxy inverso. Actívelo solo cuando Gateway aún esté protegido por firewall contra el acceso remoto directo y el proxy local elimine o sobrescriba los encabezados de identidad suministrados por el cliente.
- Los clientes internos de Gateway que no pasan a través del proxy inverso deben usar `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`, no los encabezados de identidad de proxy confiable.
- Las implementaciones de UI de Control que no son de bucle local todavía necesitan `gateway.controlUi.allowedOrigins` explícito.
- **La evidencia de encabezado reenviado anula la localidad de bucle local para la alternativa directa local.** Si una solicitud llega en bucle local pero lleva `Forwarded`, cualquier `X-Forwarded-*`, o evidencia de encabezado `X-Real-IP`, esa evidencia descalifica la alternativa directa de contraseña local y el filtrado de identidad del dispositivo. Con `allowLoopback: true`, la autenticación de proxy confiable aún puede aceptar la solicitud como una solicitud de proxy del mismo host, mientras que `requiredHeaders` y `allowUsers` continúan aplicándose.

</Warning>

### Referencia de configuración

<ParamField path="gateway.trustedProxies" type="string[]" required>
  Matriz de direcciones IP de proxy para confiar. Las solicitudes de otras IP son rechazadas.
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
  Lista blanca de identidades de usuario. Vacío significa permitir todos los usuarios autenticados.
</ParamField>
<ParamField path="gateway.auth.trustedProxy.allowLoopback" type="boolean">
  Soporte opcional para proxies inversos de bucle local del mismo host. El valor predeterminado es `false`.
</ParamField>

<Warning>
  Habilite `allowLoopback` solo cuando el proxy inverso local sea el límite de confianza previsto. Cualquier proceso local que pueda conectarse al Gateway puede intentar enviar encabezados de identidad de proxy, por lo que debe mantener el acceso directo al Gateway privado para el host y requerir encabezados propiedad del proxy, como `x-forwarded-proto` o un encabezado de aserción firmado donde su
  proxy lo admita.
</Warning>

## Finalización de TLS y HSTS

Use un punto de finalización de TLS y aplique HSTS allí.

<Tabs>
  <Tab title="Finalización de TLS del proxy (recomendado)">
    Cuando su proxy inverso maneja HTTPS para `https://control.example.com`, configure `Strict-Transport-Security` en el proxy para ese dominio.

    - Adecuado para despliegues orientados a Internet.
    - Mantiene el certificado + la política de endurecimiento HTTP en un solo lugar.
    - OpenClaw puede permanecer en HTTP de bucle local detrás del proxy.

    Valor de encabezado de ejemplo:

    ```text
    Strict-Transport-Security: max-age=31536000; includeSubDomains
    ```

  </Tab>
  <Tab title="Finalización de TLS del Gateway">
    Si OpenClaw mismo sirve HTTPS directamente (sin proxy que finalice TLS), configure:

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

  </Tab>
</Tabs>

### Guía de implementación

- Comience con una edad máxima corta primero (por ejemplo `max-age=300`) mientras valida el tráfico.
- Aumente a valores de larga duración (por ejemplo `max-age=31536000`) solo después de tener una alta confianza.
- Agregue `includeSubDomains` solo si cada subdominio está listo para HTTPS.
- Use la precarga solo si cumple intencionalmente con los requisitos de precarga para su conjunto completo de dominios.
- El desarrollo local solo de bucle de retorno (loopback) no se beneficia de HSTS.

## Ejemplos de configuración de proxy

<AccordionGroup>
  <Accordion title="Pomerium">
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

  </Accordion>
  <Accordion title="Caddy con OAuth">
    Caddy con el complemento `caddy-security` puede autenticar usuarios y pasar encabezados de identidad.

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

OpenClaw rechaza las configuraciones ambiguas donde tanto un `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`) como el modo `trusted-proxy` están activos al mismo tiempo. Las configuraciones de token mixto pueden causar que las solicitudes de bucle de retorno se autentiquen silenciosamente en la ruta de autenticación incorrecta.

Si ve un error `mixed_trusted_proxy_token` al iniciar:

- Elimine el token compartido cuando use el modo de proxy confiable (trusted-proxy), o
- Cambie `gateway.auth.mode` a `"token"` si pretende utilizar la autenticación basada en tokens.

Los encabezados de identidad de proxy confiable (trusted-proxy) de loopback aún fallan de forma cerrada: los llamadores del mismo host no se autentican silenciosamente como usuarios de proxy. Los llamadores internos de OpenClaw que omiten el proxy pueden autenticarse con `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` en su lugar. La alternativa (fallback) de token permanece intencionalmente no compatible en el modo trusted-proxy.

## Encabezado de alcances del operador

La autenticación trusted-proxy es un modo HTTP **con identidad (identity-bearing)**, por lo que los llamadores pueden declarar opcionalmente alcances de operador con `x-openclaw-scopes`.

Nota: `x-openclaw-scopes` se aplica solo a endpoints HTTP. Los alcances de WebSocket se
determinan mediante el protocolo de enlace (handshake) del Gateway y el enlace de identidad del dispositivo. Para
el comportamiento de alcance de WebSocket con trusted-proxy, consulte
[Control UI pairing behavior](#control-ui-pairing-behavior).

Ejemplos:

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

Comportamiento:

- Cuando el encabezado está presente, OpenClaw respeta el conjunto de alcances declarado.
- Cuando el encabezado está presente pero vacío, la solicitud declara **ningún** ámbito de operador.
- Cuando el encabezado está ausente, las API HTTP normales con identidad vuelven al conjunto de alcances predeterminados del operador estándar.
- Las **rutas HTTP de complemento** de autenticación de gateway son más estrechas de forma predeterminada: cuando `x-openclaw-scopes` está ausente, su alcance en tiempo de ejecución vuelve a `operator.write`.
- Las solicitudes HTTP originadas en el navegador aún deben pasar `gateway.controlUi.allowedOrigins` (o el modo de alternativa deliberado del encabezado Host) incluso después de que la autenticación trusted-proxy tenga éxito.

Regla práctica: envíe `x-openclaw-scopes` explícitamente cuando desee que una solicitud trusted-proxy sea más estrecha que los valores predeterminados, o cuando una ruta de complemento de autenticación de gateway necesite algo más fuerte que el alcance de escritura (write scope).

## Lista de verificación de seguridad

Antes de habilitar la autenticación trusted-proxy, verifique:

- [ ] **El proxy es la única ruta**: El puerto del Gateway está protegido por un cortafuegos de todo excepto su proxy.
- [ ] **trustedProxies es mínimo**: Solo sus IPs de proxy reales, no subredes completas.
- [ ] **El origen del proxy de loopback es deliberado**: La autenticación trusted-proxy falla de forma cerrada para las solicitudes de origen de loopback a menos que `gateway.auth.trustedProxy.allowLoopback` esté explícitamente habilitado para un proxy del mismo host.
- [ ] **Proxy strips headers**: Su proxy sobrescribe (no añade) las cabeceras `x-forwarded-*` de los clientes.
- [ ] **TLS termination**: Su proxy maneja TLS; los usuarios se conectan a través de HTTPS.
- [ ] **allowedOrigins is explicit**: La Interfaz de Control (Control UI) que no es de bucle local utiliza `gateway.controlUi.allowedOrigins` explícito.
- [ ] **allowUsers is set** (recomendado): Restrinja a usuarios conocidos en lugar de permitir a cualquier usuario autenticado.
- [ ] **No mixed token config**: No configure tanto `gateway.auth.token` como `gateway.auth.mode: "trusted-proxy"`.
- [ ] **Local password fallback is private**: Si configura `gateway.auth.password` para llamantes directos internos, mantenga el puerto del Gateway protegido por un firewall para que los clientes remotos que no sean el proxy no puedan alcanzarlo directamente.

## Auditoría de seguridad

`openclaw security audit` marcará la autenticación de proxy confiable con un hallazgo de severidad **crítica**. Esto es intencional: es un recordatorio de que está delegando la seguridad a su configuración de proxy.

La auditoría comprueba:

- Recordatorio de advertencia/crítico de `gateway.trusted_proxy_auth` base
- Configuración `trustedProxies` faltante
- Configuración `userHeader` faltante
- `allowUsers` vacío (permite cualquier usuario autenticado)
- `allowLoopback` habilitado para fuentes de proxy del mismo host
- Política de origen del navegador comodín o faltante en superficies de Interfaz de Control expuestas

## Solución de problemas

<AccordionGroup>
  <Accordion title="trusted_proxy_untrusted_source">
    La solicitud no provino de una IP en `gateway.trustedProxies`. Compruebe:

    - ¿Es correcta la IP del proxy? (Las IPs de los contenedores Docker pueden cambiar.)
    - ¿Hay un equilibrador de carga delante de su proxy?
    - Use `docker inspect` o `kubectl get pods -o wide` para encontrar las IPs reales.

  </Accordion>
  <Accordion title="trusted_proxy_loopback_source">
    OpenClaw rechazó una solicitud de proxy confiable de origen de bucle invertido.

    Comprueba:

    - ¿Se está conectando el proxy desde `127.0.0.1` / `::1`?
    - ¿Estás intentando usar autenticación de proxy confiable con un proxy inverso de bucle invertido del mismo host?

    Solución:

    - Prefiere la autenticación por token/contraseña para clientes internos del mismo host que no pasen por el proxy, o
    - Enruta a través de una dirección de proxy confiable que no sea de bucle invertido y mantén esa IP en `gateway.trustedProxies`, o
    - Para un proxy inverso deliberado del mismo host, establece `gateway.auth.trustedProxy.allowLoopback = true`, mantén la dirección de bucle invertido en `gateway.trustedProxies` y asegúrate de que el proxy elimine o sobrescriba los encabezados de identidad.

  </Accordion>
  <Accordion title="trusted_proxy_user_missing">
    El encabezado de usuario estaba vacío o faltaba. Comprueba:

    - ¿Está tu proxy configurado para pasar encabezados de identidad?
    - ¿Es correcto el nombre del encabezado? (no distingue entre mayúsculas y minúsculas, pero la ortografía importa)
    - ¿Está el usuario realmente autenticado en el proxy?

  </Accordion>
  <Accordion title="trusted_proxy_missing_header_*">
    Faltaba un encabezado requerido. Comprueba:

    - La configuración de tu proxy para esos encabezados específicos.
    - Si los encabezados se están eliminando en algún lugar de la cadena.

  </Accordion>
  <Accordion title="trusted_proxy_user_not_allowed">
    El usuario está autenticado pero no está en `allowUsers`. Agrégalo o elimina la lista de permitidos.
  </Accordion>
  <Accordion title="trusted_proxy_origin_not_allowed">
    La autenticación de proxy confiable tuvo éxito, pero el encabezado `Origin` del navegador no pasó las comprobaciones de origen de la interfaz de usuario de control.

    Comprueba:

    - `gateway.controlUi.allowedOrigins` incluye el origen exacto del navegador.
    - No estás confiando en orígenes comodín a menos que intencionalmente desees un comportamiento de permitir todo.
    - Si usas intencionalmente el modo de reserva del encabezado Host, `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` se establece deliberadamente.

  </Accordion>
  <Accordion title="La conexión tiene éxito pero los métodos reportan un ámbito faltante">
    El WebSocket se conecta, pero `chat.history` o `sessions.list` falla con
    `missing scope: operator.read`.

    Esto es esperado para conexiones WebSocket de proxy confiable sin identidad
    del dispositivo. Las conexiones que carecen de identidad del dispositivo tienen sus ámbitos borrados. El
    navegador no puede generar identidad del dispositivo a través de HTTP plano.

    Solución:

    - Establezca `gateway.controlUi.dangerouslyDisableDeviceAuth: true` para preservar los ámbitos del operador en conexiones WebSocket de proxy confiable, o
    - Use el emparejamiento de identidad del dispositivo para que los ámbitos se vinculen al token del dispositivo.

  </Accordion>
  <Accordion title="WebSocket sigue fallando">
    Asegúrese de que su proxy:

    - Admite actualizaciones de WebSocket (`Upgrade: websocket`, `Connection: upgrade`).
    - Pasa los encabezados de identidad en las solicitudes de actualización de WebSocket (no solo HTTP).
    - No tiene una ruta de autenticación separada para las conexiones WebSocket.

  </Accordion>
</AccordionGroup>

## Migración desde la autenticación por token

Si se está moviendo desde la autenticación por token al proxy confiable:

<Steps>
  <Step title="Configure el proxy">Configure su proxy para autenticar usuarios y pasar encabezados.</Step>
  <Step title="Probar el proxy de forma independiente">Pruebe la configuración del proxy de forma independiente (curl con encabezados).</Step>
  <Step title="Actualizar la configuración de OpenClaw">Actualice la configuración de OpenClaw con la autenticación de proxy confiable.</Step>
  <Step title="Reiniciar el Gateway">Reinicie el Gateway.</Step>
  <Step title="Probar WebSocket">Pruebe las conexiones WebSocket desde la interfaz de usuario de Control.</Step>
  <Step title="Auditoría">Ejecute `openclaw security audit` y revise los hallazgos.</Step>
</Steps>

## Relacionado

- [Configuración](/es/gateway/configuration) — referencia de configuración
- [Acceso remoto](/es/gateway/remote) — otros patrones de acceso remoto
- [Seguridad](/es/gateway/security) — guía de seguridad completa
- [Tailscale](/es/gateway/tailscale) — alternativa más sencilla para el acceso exclusivo a la tailnet
