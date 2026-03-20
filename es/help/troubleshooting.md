---
summary: "Centro de solución de problemas basado en síntomas para OpenClaw"
read_when:
  - OpenClaw no funciona y necesitas la ruta más rápida hacia una solución
  - Quieres un flujo de triaje antes de sumergirte en los manuales detallados
title: "Solución General de Problemas"
---

# Solución de problemas

Si solo tienes 2 minutos, usa esta página como una puerta de entrada de triaje.

## Primeros 60 segundos

Ejecuta esta escalera exacta en orden:

```bash
openclaw status
openclaw status --all
openclaw gateway probe
openclaw gateway status
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

Buena salida en una línea:

- `openclaw status` → muestra los canales configurados y sin errores de autenticación obvios.
- `openclaw status --all` → el informe completo está presente y se puede compartir.
- `openclaw gateway probe` → el destino de la puerta de enlace esperado es alcanzable (`Reachable: yes`). `RPC: limited - missing scope: operator.read` son diagnósticos degradados, no un fallo de conexión.
- `openclaw gateway status` → `Runtime: running` y `RPC probe: ok`.
- `openclaw doctor` → sin errores de configuración/servicio que bloqueen.
- `openclaw channels status --probe` → los canales reportan `connected` o `ready`.
- `openclaw logs --follow` → actividad constante, sin errores fatales repetitivos.

## Anthropic contexto largo 429

Si ves:
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`,
ve a [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/es/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

## La instalación del complemento falla con extensiones openclaw faltantes

Si la instalación falla con `package.json missing openclaw.extensions`, el paquete del complemento
está usando una forma antigua que OpenClaw ya no acepta.

Solución en el paquete del complemento:

1. Añade `openclaw.extensions` a `package.json`.
2. Apunta las entradas a los archivos de tiempo de ejecución construidos (generalmente `./dist/index.js`).
3. Republica el complemento y ejecuta `openclaw plugins install <npm-spec>` de nuevo.

Ejemplo:

```json
{
  "name": "@openclaw/my-plugin",
  "version": "1.2.3",
  "openclaw": {
    "extensions": ["./dist/index.js"]
  }
}
```

Referencia: [/tools/plugin#distribution-npm](/es/tools/plugin#distribution-npm)

## Árbol de decisiones

```mermaid
flowchart TD
  A[OpenClaw is not working] --> B{What breaks first}
  B --> C[No replies]
  B --> D[Dashboard or Control UI will not connect]
  B --> E[Gateway will not start or service not running]
  B --> F[Channel connects but messages do not flow]
  B --> G[Cron or heartbeat did not fire or did not deliver]
  B --> H[Node is paired but camera canvas screen exec fails]
  B --> I[Browser tool fails]

  C --> C1[/No replies section/]
  D --> D1[/Control UI section/]
  E --> E1[/Gateway section/]
  F --> F1[/Channel flow section/]
  G --> G1[/Automation section/]
  H --> H1[/Node tools section/]
  I --> I1[/Browser section/]
```

<AccordionGroup>
  <Accordion title="Sin respuestas">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw channels status --probe
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    ```

    El resultado correcto se ve así:

    - `Runtime: running`
    - `RPC probe: ok`
    - Su canal muestra conectado/listo en `channels status --probe`
    - El remitente aparece aprobado (o la política de DM está abierta/en lista de permitidos)

    Firmas de registro comunes:

    - `drop guild message (mention required` → el filtrado de menciones bloqueó el mensaje en Discord.
    - `pairing request` → el remitente no está aprobado y está esperando la aprobación de emparejamiento de DM.
    - `blocked` / `allowlist` en los registros del canal → el remitente, la sala o el grupo está filtrado.

    Páginas profundas:

    - [/gateway/troubleshooting#no-replies](/es/gateway/troubleshooting#no-replies)
    - [/channels/troubleshooting](/es/channels/troubleshooting)
    - [/channels/pairing](/es/channels/pairing)

  </Accordion>

  <Accordion title="El Panel de control o la interfaz de Control no se conectan">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    El resultado correcto se ve así:

    - `Dashboard: http://...` se muestra en `openclaw gateway status`
    - `RPC probe: ok`
    - No hay bucle de autenticación en los registros

    Firmas de registro comunes:

    - `device identity required` → el contexto HTTP/no seguro no puede completar la autenticación del dispositivo.
    - `AUTH_TOKEN_MISMATCH` con sugerencias de reintento (`canRetryWithDeviceToken=true`) → puede producirse automáticamente un reintento del token de dispositivo de confianza.
    - `unauthorized` repetido después de ese reintento → token/contraseña incorrectos, discrepancia del modo de autenticación o token de dispositivo emparejado obsoleto.
    - `gateway connect failed:` → la interfaz de usuario está apuntando a la URL/puerto incorrectos o a una puerta de enlace inalcanzable.

    Páginas profundas:

    - [/gateway/troubleshooting#dashboard-control-ui-connectivity](/es/gateway/troubleshooting#dashboard-control-ui-connectivity)
    - [/web/control-ui](/es/web/control-ui)
    - [/gateway/authentication](/es/gateway/authentication)

  </Accordion>

  <Accordion title="Gateway will not start or service installed but not running">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    El resultado correcto se ve así:

    - `Service: ... (loaded)`
    - `Runtime: running`
    - `RPC probe: ok`

    Firmas de registro comunes:

    - `Gateway start blocked: set gateway.mode=local` → el modo de puerta de enlace no está configurado/es remoto.
    - `refusing to bind gateway ... without auth` → enlace que no es de bucle invertido sin token/contraseña.
    - `another gateway instance is already listening` o `EADDRINUSE` → puerto ya en uso.

    Páginas en profundidad:

    - [/gateway/troubleshooting#gateway-service-not-running](/es/gateway/troubleshooting#gateway-service-not-running)
    - [/gateway/background-process](/es/gateway/background-process)
    - [/gateway/configuration](/es/gateway/configuration)

  </Accordion>

  <Accordion title="Channel connects but messages do not flow">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    El resultado correcto se ve así:

    - El transporte del canal está conectado.
    - Las verificaciones de emparejamiento/lista blanca pasan.
    - Las menciones se detectan donde se requieren.

    Firmas de registro comunes:

    - `mention required` → el filtrado de mención de grupo bloqueó el procesamiento.
    - `pairing` / `pending` → el remitente del MD aún no está aprobado.
    - `not_in_channel`, `missing_scope`, `Forbidden`, `401/403` → problema con el token de permiso del canal.

    Páginas en profundidad:

    - [/gateway/troubleshooting#channel-connected-messages-not-flowing](/es/gateway/troubleshooting#channel-connected-messages-not-flowing)
    - [/channels/troubleshooting](/es/channels/troubleshooting)

  </Accordion>

  <Accordion title="El cron o el latido no se activó o no se entregó">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw cron status
    openclaw cron list
    openclaw cron runs --id <jobId> --limit 20
    openclaw logs --follow
    ```

    La salida correcta se ve así:

    - `cron.status` muestra que está habilitado con un próximo despertar.
    - `cron runs` muestra entradas `ok` recientes.
    - El latido está habilitado y no está fuera del horario activo.

    Firmas de registro comunes:

    - `cron: scheduler disabled; jobs will not run automatically` → el cron está deshabilitado.
    - `heartbeat skipped` con `reason=quiet-hours` → fuera del horario activo configurado.
    - `requests-in-flight` → carril principal ocupado; el despertar del latido se pospuso.
    - `unknown accountId` → la cuenta de destino de entrega del latido no existe.

    Páginas profundas:

    - [/gateway/troubleshooting#cron-and-heartbeat-delivery](/es/gateway/troubleshooting#cron-and-heartbeat-delivery)
    - [/automation/troubleshooting](/es/automation/troubleshooting)
    - [/gateway/heartbeat](/es/gateway/heartbeat)

  </Accordion>

  <Accordion title="El nodo está emparejado pero la herramienta falla cámara canvas pantalla exec">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw nodes status
    openclaw nodes describe --node <idOrNameOrIp>
    openclaw logs --follow
    ```

    La salida correcta se ve así:

    - El nodo aparece como conectado y emparejado para el rol `node`.
    - Existe la capacidad para el comando que estás invocando.
    - El estado de permiso está concedido para la herramienta.

    Firmas de registro comunes:

    - `NODE_BACKGROUND_UNAVAILABLE` → traer la aplicación del nodo al primer plano.
    - `*_PERMISSION_REQUIRED` → el permiso del sistema operativo fue denegado o falta.
    - `SYSTEM_RUN_DENIED: approval required` → la aprobación de exec está pendiente.
    - `SYSTEM_RUN_DENIED: allowlist miss` → comando no en la lista de permitidos de exec.

    Páginas profundas:

    - [/gateway/troubleshooting#node-paired-tool-fails](/es/gateway/troubleshooting#node-paired-tool-fails)
    - [/nodes/troubleshooting](/es/nodes/troubleshooting)
    - [/tools/exec-approvals](/es/tools/exec-approvals)

  </Accordion>

  <Accordion title="Browser tool fails">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw browser status
    openclaw logs --follow
    openclaw doctor
    ```

    El resultado correcto se ve así:

    - El estado del navegador muestra `running: true` y un navegador/perfil elegido.
    - `openclaw` se inicia, o `user` puede ver las pestañas locales de Chrome.

    Firmas de registro comunes:

    - `Failed to start Chrome CDP on port` → falló el inicio del navegador local.
    - `browser.executablePath not found` → la ruta binaria configurada es incorrecta.
    - `No Chrome tabs found for profile="user"` → el perfil de conexión de Chrome MCP no tiene pestañas locales de Chrome abiertas.
    - `Browser attachOnly is enabled ... not reachable` → el perfil de solo conexión no tiene un objetivo CDP activo.

    Páginas detalladas:

    - [/gateway/troubleshooting#browser-tool-fails](/es/gateway/troubleshooting#browser-tool-fails)
    - [/tools/browser-linux-troubleshooting](/es/tools/browser-linux-troubleshooting)
    - [/tools/browser-wsl2-windows-remote-cdp-troubleshooting](/es/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

  </Accordion>
</AccordionGroup>

import es from "/components/footer/es.mdx";

<es />
