---
summary: "Centro de solución de problemas con prioridad de síntomas para OpenClaw"
read_when:
  - OpenClaw is not working and you need the fastest path to a fix
  - You want a triage flow before diving into deep runbooks
title: "Solución general de problemas"
---

# Solución de problemas

Si solo tiene 2 minutos, use esta página como puerta de entrada de triaje.

## Primeros 60 segundos

Ejecute esta siguiente escalera exacta en orden:

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

- `openclaw status` → muestra los canales configurados y no hay errores de autenticación obvios.
- `openclaw status --all` → el informe completo está presente y se puede compartir.
- `openclaw gateway probe` → el objetivo de puerta de enlace esperado es alcanzable (`Reachable: yes`). `RPC: limited - missing scope: operator.read` son diagnósticos degradados, no un fallo de conexión.
- `openclaw gateway status` → `Runtime: running` y `RPC probe: ok`.
- `openclaw doctor` → sin errores de configuración/servicio que bloqueen.
- `openclaw channels status --probe` → reachable gateway returns live per-account
  transport state plus probe/audit results such as `works` or `audit ok`; if the
  gateway is unreachable, the command falls back to config-only summaries.
- `openclaw logs --follow` → actividad constante, sin errores fatales repetitivos.

## Contexto largo de Anthropic 429

Si ve:
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`,
vaya a [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/es/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

## El backend compatible con OpenAI local funciona directamente pero falla en OpenClaw

Si su backend `/v1` local o autohospedado responde a pequeñas
sondas directas `/v1/chat/completions` pero falla en `openclaw infer model run` o en turnos
de agente normales:

1. Si el error menciona que `messages[].content` espera una cadena, establezca
   `models.providers.<provider>.models[].compat.requiresStringContent: true`.
2. Si el backend todavía falla solo en los turnos del agente de OpenClaw, establezca
   `models.providers.<provider>.models[].compat.supportsTools: false` y reinténtelo.
3. Si las llamadas directas diminutas todavía funcionan pero las solicitudes más grandes de OpenClaw bloquean el
   backend, trate el problema restante como una limitación del modelo/servidor ascendente y
   continúe en el manual detallado:
   [/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail](/es/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail)

## La instalación del complemento falla por extensiones openclaw faltantes

Si la instalación falla con `package.json missing openclaw.extensions`, el paquete del complemento
está usando una forma antigua que OpenClaw ya no acepta.

Solución en el paquete del complemento:

1. Añada `openclaw.extensions` a `package.json`.
2. Apunte las entradas a los archivos de tiempo de ejecución construidos (generalmente `./dist/index.js`).
3. Republicar el complemento y ejecutar `openclaw plugins install <package>` de nuevo.

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

Referencia: [Arquitectura del complemento](/es/plugins/architecture)

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
  <Accordion title="No replies">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw channels status --probe
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    ```

    El resultado correcto debería verse así:

    - `Runtime: running`
    - `RPC probe: ok`
    - Tu canal muestra el transporte conectado y, cuando sea compatible, `works` o `audit ok` en `channels status --probe`
    - El remitente aparece aprobado (o la política de DM está abierta/en lista blanca)

    Firmas comunes de registros:

    - `drop guild message (mention required` → el bloqueo de menciones bloqueó el mensaje en Discord.
    - `pairing request` → el remitente no está aprobado y espera la aprobación de emparejamiento por DM.
    - `blocked` / `allowlist` en los registros del canal → el remitente, la sala o el grupo están filtrados.

    Páginas profundas:

    - [/gateway/troubleshooting#no-replies](/es/gateway/troubleshooting#no-replies)
    - [/channels/troubleshooting](/es/channels/troubleshooting)
    - [/channels/pairing](/es/channels/pairing)

  </Accordion>

  <Accordion title="Dashboard or Control UI will not connect">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    La salida correcta se ve así:

    - `Dashboard: http://...` se muestra en `openclaw gateway status`
    - `RPC probe: ok`
    - No hay bucle de autenticación en los registros

    Firmas de registro comunes:

    - `device identity required` → el contexto HTTP/no seguro no puede completar la autenticación del dispositivo.
    - `origin not allowed` → el navegador `Origin` no está permitido para el objetivo de
      la puerta de enlace de la UI de Control.
    - `AUTH_TOKEN_MISMATCH` con sugerencias de reintento (`canRetryWithDeviceToken=true`) → puede ocurrir automáticamente un reintento de token de dispositivo de confianza.
    - Ese reintento de token en caché reutiliza el conjunto de ámbitos en caché almacenados con el
      token del dispositivo emparejado. Los autores de llamadas explícitos `deviceToken` / explícitos `scopes` mantienen
      su conjunto de ámbitos solicitado en su lugar.
    - En la ruta asíncrona de la UI de Control de Tailscale Serve, los intentos fallidos para el mismo
      `{scope, ip}` se serializan antes de que el limitador registre el fallo, por lo que un
      segundo reintento concurrente incorrecto ya puede mostrar `retry later`.
    - `too many failed authentication attempts (retry later)` desde un origen
      de navegador localhost → los fallos repetidos de ese mismo `Origin` se bloquean temporalmente;
      otro origen localhost usa un depósito separado.
    - `unauthorized` repetidos después de ese reintento → token/contraseña incorrectos, discrepancia del modo de autenticación o token de dispositivo emparejado obsoleto.
    - `gateway connect failed:` → la UI está apuntando a la URL/puerto incorrectos o a una puerta de enlace inalcanzable.

    Páginas en profundidad:

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

    El resultado correcto se parece a:

    - `Service: ... (loaded)`
    - `Runtime: running`
    - `RPC probe: ok`

    Firmas de registro comunes:

    - `Gateway start blocked: set gateway.mode=local` o `existing config is missing gateway.mode` → el modo de puerta de enlace es remoto o al archivo de configuración le falta la marca de modo local y debe repararse.
    - `refusing to bind gateway ... without auth` → enlace sin bucle local sin una ruta de autenticación de puerta de enlace válida (token/contraseña o proxy de confianza donde esté configurado).
    - `another gateway instance is already listening` o `EADDRINUSE` → puerto ya en uso.

    Páginas profundas:

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

    El resultado correcto se parece a:

    - El transporte del canal está conectado.
    - Las comprobaciones de emparejamiento/lista de permitidos pasan.
    - Las menciones se detectan donde se requiere.

    Firmas de registro comunes:

    - `mention required` → el bloqueo de la mención de grupo impidió el procesamiento.
    - `pairing` / `pending` → el remitente del MD aún no está aprobado.
    - `not_in_channel`, `missing_scope`, `Forbidden`, `401/403` → problema con el token de permiso del canal.

    Páginas profundas:

    - [/gateway/troubleshooting#channel-connected-messages-not-flowing](/es/gateway/troubleshooting#channel-connected-messages-not-flowing)
    - [/channels/troubleshooting](/es/channels/troubleshooting)

  </Accordion>

  <Accordion title="Cron o latido no se ejecutó o no se entregó">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw cron status
    openclaw cron list
    openclaw cron runs --id <jobId> --limit 20
    openclaw logs --follow
    ```

    El resultado correcto se ve así:

    - `cron.status` muestra que está habilitado con un próximo despertar.
    - `cron runs` muestra entradas `ok` recientes.
    - El latido está habilitado y no está fuera del horario activo.

    Firmas de registro comunes:

    - `cron: scheduler disabled; jobs will not run automatically` → cron está deshabilitado.
    - `heartbeat skipped` con `reason=quiet-hours` → fuera del horario activo configurado.
    - `heartbeat skipped` con `reason=empty-heartbeat-file` → `HEARTBEAT.md` existe pero solo contiene scaffolding en blanco o solo encabezados.
    - `heartbeat skipped` con `reason=no-tasks-due` → el modo de tarea `HEARTBEAT.md` está activo pero aún no vence ningún intervalo de tarea.
    - `heartbeat skipped` con `reason=alerts-disabled` → toda la visibilidad de latido está deshabilitada (`showOk`, `showAlerts` y `useIndicator` están apagados).
    - `requests-in-flight` → carril principal ocupado; el despertar del latido se pospuso.
    - `unknown accountId` → la cuenta de destino de entrega del latido no existe.

    Páginas profundas:

    - [/gateway/troubleshooting#cron-and-heartbeat-delivery](/es/gateway/troubleshooting#cron-and-heartbeat-delivery)
    - [/automation/cron-jobs#troubleshooting](/es/automation/cron-jobs#troubleshooting)
    - [/gateway/heartbeat](/es/gateway/heartbeat)

    </Accordion>

    <Accordion title="El nodo está emparejado pero la herramienta falla: cámara, lienzo, pantalla, exec">
      ```bash
      openclaw status
      openclaw gateway status
      openclaw nodes status
      openclaw nodes describe --node <idOrNameOrIp>
      openclaw logs --follow
      ```

      El resultado correcto se ve así:

      - El nodo aparece como conectado y emparejado para el rol `node`.
      - Existe la capacidad para el comando que estás invocando.
      - El estado del permiso está concedido para la herramienta.

      Firmas de registro comunes:

      - `NODE_BACKGROUND_UNAVAILABLE` → traer la aplicación del nodo al primer plano.
      - `*_PERMISSION_REQUIRED` → el permiso del sistema operativo fue denegado o falta.
      - `SYSTEM_RUN_DENIED: approval required` → la aprobación de exec está pendiente.
      - `SYSTEM_RUN_DENIED: allowlist miss` → comando no está en la lista de permitidos de exec.

      Páginas en profundidad:

      - [/gateway/troubleshooting#node-paired-tool-fails](/es/gateway/troubleshooting#node-paired-tool-fails)
      - [/nodes/troubleshooting](/es/nodes/troubleshooting)
      - [/tools/exec-approvals](/es/tools/exec-approvals)

    </Accordion>

    <Accordion title="Exec de repente pide aprobación">
      ```bash
      openclaw config get tools.exec.host
      openclaw config get tools.exec.security
      openclaw config get tools.exec.ask
      openclaw gateway restart
      ```

      Lo que cambió:

      - Si `tools.exec.host` no está configurado, el valor predeterminado es `auto`.
      - `host=auto` se resuelve a `sandbox` cuando un tiempo de ejecución de sandbox está activo, `gateway` en caso contrario.
      - `host=auto` es solo enrutamiento; el comportamiento "YOLO" sin solicitud proviene de `security=full` más `ask=off` en el gateway/nodo.
      - En `gateway` y `node`, si `tools.exec.security` no está configurado, el valor predeterminado es `full`.
      - Si `tools.exec.ask` no está configurado, el valor predeterminado es `off`.
      - Resultado: si está viendo aprobaciones, alguna política local del host o por sesión ha restringido exec alejándolo de los valores predeterminados actuales.

      Restaurar el comportamiento predeterminado actual sin aprobación:

      ```bash
      openclaw config set tools.exec.host gateway
      openclaw config set tools.exec.security full
      openclaw config set tools.exec.ask off
      openclaw gateway restart
      ```

      Alternativas más seguras:

      - Configure solo `tools.exec.host=gateway` si solo desea un enrutamiento de host estable.
      - Use `security=allowlist` con `ask=on-miss` si desea exec del host pero aún desea revisión cuando se falte en la lista de permitidos.
      - Habilite el modo sandbox si desea que `host=auto` se resuelva nuevamente a `sandbox`.

      Firmas de registro comunes:

      - `Approval required.` → el comando está esperando en `/approve ...`.
      - `SYSTEM_RUN_DENIED: approval required` → la aprobación de exec del node-host está pendiente.
      - `exec host=sandbox requires a sandbox runtime for this session` → selección de sandbox implícita/explícita pero el modo sandbox está desactivado.

      Páginas profundas:

      - [/tools/exec](/es/tools/exec)
      - [/tools/exec-approvals](/es/tools/exec-approvals)
      - [/gateway/security#what-the-audit-checks-high-level](/es/gateway/security#what-the-audit-checks-high-level)

    </Accordion>

    <Accordion title="Browser tool fails">
      ```bash
      openclaw status
      openclaw gateway status
      openclaw browser status
      openclaw logs --follow
      openclaw doctor
      ```

      El buen resultado se ve así:

      - El estado del navegador muestra `running: true` y un navegador/perfil elegido.
      - `openclaw` se inicia, o `user` puede ver las pestañas locales de Chrome.

      Firmas de registro comunes:

      - `unknown command "browser"` o `unknown command 'browser'` → `plugins.allow` está establecido y no incluye `browser`.
      - `Failed to start Chrome CDP on port` → falló el inicio del navegador local.
      - `browser.executablePath not found` → la ruta del binario configurado es incorrecta.
      - `browser.cdpUrl must be http(s) or ws(s)` → la URL CDP configurada utiliza un esquema no compatible.
      - `browser.cdpUrl has invalid port` → la URL CDP configurada tiene un puerto incorrecto o fuera de rango.
      - `No Chrome tabs found for profile="user"` → el perfil de conexión de Chrome MCP no tiene pestañas locales de Chrome abiertas.
      - `Remote CDP for profile "<name>" is not reachable` → el punto final CDP remoto configurado no es accesible desde este host.
      - `Browser attachOnly is enabled ... not reachable` o `Browser attachOnly is enabled and CDP websocket ... is not reachable` → el perfil de solo conexión no tiene un destino CDP activo.
      - anulaciones obsoletas de ventanilla/modo oscuro/configuración regional/sin conexión en perfiles de solo conexión o CDP remoto → ejecute `openclaw browser stop --browser-profile <name>` para cerrar la sesión de control activa y liberar el estado de emulación sin reiniciar la puerta de enlace.

      Páginas profundas:

      - [/gateway/troubleshooting#browser-tool-fails](/es/gateway/troubleshooting#browser-tool-fails)
      - [/tools/browser#missing-browser-command-or-tool](/es/tools/browser#missing-browser-command-or-tool)
      - [/tools/browser-linux-troubleshooting](/es/tools/browser-linux-troubleshooting)
      - [/tools/browser-wsl2-windows-remote-cdp-troubleshooting](/es/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

    </Accordion>

  </AccordionGroup>

## Relacionado

- [FAQ](/es/help/faq) — preguntas frecuentes
- [Solución de problemas de la puerta de enlace](/es/gateway/troubleshooting) — problemas específicos de la puerta de enlace
- [Doctor](/es/gateway/doctor) — comprobaciones automáticas de estado y reparaciones
- [Solución de problemas de canal](/es/channels/troubleshooting) — problemas de conectividad del canal
- [Solución de problemas de automatización](/es/automation/cron-jobs#troubleshooting) — problemas de cron y latido
