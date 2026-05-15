---
summary: "Centro de solución de problemas priorizando síntomas para OpenClaw"
read_when:
  - OpenClaw is not working and you need the fastest path to a fix
  - You want a triage flow before diving into deep runbooks
title: "Solución general de problemas"
---

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
- `openclaw gateway probe` → el destino de la puerta de enlace esperado es alcanzable (`Reachable: yes`). `Capability: ...` indica qué nivel de autenticación pudo probar la sonda, y `Read probe: limited - missing scope: operator.read` son diagnósticos degradados, no un error de conexión.
- `openclaw gateway status` → `Runtime: running`, `Connectivity probe: ok`, y una línea `Capability: ...` plausible. Use `--require-rpc` si también necesita una prueba de RPC con alcance de lectura.
- `openclaw doctor` → sin errores de configuración/servicio que bloqueen.
- `openclaw channels status --probe` → una puerta de enlace alcanzable devuelve el estado de transporte en vivo por cuenta
  más resultados de sonda/auditoría como `works` o `audit ok`; si la
  puerta de enlace no es alcanzable, el comando se recurre a resúmenes solo de configuración.
- `openclaw logs --follow` → actividad constante, sin errores fatales repetitivos.

## Contexto largo de Anthropic 429

Si ve:
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`,
vaya a [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/es/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

## El backend compatible con OpenAI local funciona directamente pero falla en OpenClaw

Si su servidor `/v1` local o autoalojado responde a pequeñas sondas directas
`/v1/chat/completions` pero falla en `openclaw infer model run` o en turnos de
agente normal:

1. Si el error menciona que `messages[].content` espera una cadena, configure
   `models.providers.<provider>.models[].compat.requiresStringContent: true`.
2. Si el servidor sigue fallando solo en los turnos del agente de OpenClaw, configure
   `models.providers.<provider>.models[].compat.supportsTools: false` y vuelva a intentarlo.
3. Si las llamadas directas pequeñas aún funcionan pero las indicaciones grandes de OpenClaw bloquean el
   servidor, trate el problema restante como una limitación del modelo/servidor ascendente y
   continúe en el manual detallado:
   [/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail](/es/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail)

## La instalación del complemento falla con extensiones de openclaw faltantes

Si la instalación falla con `package.json missing openclaw.extensions`, el paquete del complemento
está usando un formato antiguo que OpenClaw ya no acepta.

Solución en el paquete del complemento:

1. Agregue `openclaw.extensions` a `package.json`.
2. Apunte las entradas a los archivos de tiempo de ejecución compilados (generalmente `./dist/index.js`).
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

## Complemento presente pero bloqueado por propiedad sospechosa

Si `openclaw doctor`, la configuración o las advertencias de inicio muestran:

```text
blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)
plugin present but blocked
```

los archivos del complemento son propiedad de un usuario Unix diferente al proceso que los
carga. No elimine la configuración del complemento. Corrija la propiedad de los archivos o ejecute OpenClaw como
el mismo usuario que posee el directorio de estado.

Las instalaciones de Docker normalmente se ejecutan como `node` (uid `1000`). Para la configuración predeterminada de
Docker, repare los montajes de enlace del host:

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
openclaw doctor --fix
```

Si ejecuta intencionalmente OpenClaw como root, repare la raíz del complemento administrado a
propiedad de root en su lugar:

```bash
sudo chown -R root:root /path/to/openclaw-config/npm
openclaw doctor --fix
```

Documentación más profunda:

- [Propiedad de la ruta del complemento](/es/tools/plugin#blocked-plugin-path-ownership)
- [Permisos de Docker](/es/install/docker#permissions-and-eacces)

## Árbol de decisión

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

    El buen resultado se ve así:

    - `Runtime: running`
    - `Connectivity probe: ok`
    - `Capability: read-only`, `write-capable` o `admin-capable`
    - Su canal muestra transporte conectado y, donde es compatible, `works` o `audit ok` en `channels status --probe`
    - El remitente aparece aprobado (o la política de MD está abierta/en lista de permitidos)

    Firmas de registro comunes:

    - `drop guild message (mention required` → el filtrado de menciones bloqueó el mensaje en Discord.
    - `pairing request` → el remitente no está aprobado y está esperando la aprobación de emparejamiento por DM.
    - `blocked` / `allowlist` en los registros del canal → el remitente, la sala o el grupo está filtrado.

    Páginas profundas:

    - [/gateway/troubleshooting#no-replies](/es/gateway/troubleshooting#no-replies)
    - [/channels/troubleshooting](/es/channels/troubleshooting)
    - [/channels/pairing](/es/channels/pairing)

  </Accordion>

  <Accordion title="El panel o la interfaz de control no se conecta">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    El resultado correcto se ve así:

    - `Dashboard: http://...` se muestra en `openclaw gateway status`
    - `Connectivity probe: ok`
    - `Capability: read-only`, `write-capable` o `admin-capable`
    - Sin bucle de autenticación en los registros

    Firmas comunes de registro:

    - `device identity required` → el contexto HTTP/no seguro no puede completar la autenticación del dispositivo.
    - `origin not allowed` → el navegador `Origin` no está permitido para el destino de
      la puerta de enlace de la interfaz de control.
    - `AUTH_TOKEN_MISMATCH` con sugerencias de reintento (`canRetryWithDeviceToken=true`) → puede ocurrir automáticamente un reintento de token de dispositivo de confianza.
    - Ese reintento de token en caché reutiliza el conjunto de ámbitos almacenados en caché con el
      token del dispositivo emparejado. Los llamadores explícitos `deviceToken` / explícitos `scopes` mantienen
      su conjunto de ámbitos solicitado en su lugar.
    - En la ruta asíncrona de la interfaz de control de Tailscale Serve, los intentos fallidos para el mismo
      `{scope, ip}` se serializan antes de que el limitador registre el fallo, por lo que un
      segundo reintento incorrecto concurrente ya puede mostrar `retry later`.
    - `too many failed authentication attempts (retry later)` desde un origen de
      navegador localhost → los fallos repetidos de ese mismo `Origin` se bloquean temporalmente;
      otro origen localhost utiliza un depósito separado.
    - `unauthorized` repetidos después de ese reintento → token/contraseña incorrectos, discrepancia del modo de autenticación o token de dispositivo emparejado obsoleto.
    - `gateway connect failed:` → la interfaz de usuario está apuntando a la URL/puerto incorrectos o a una puerta de enlace inalcanzable.

    Páginas profundas:

    - [/gateway/troubleshooting#dashboard-control-ui-connectivity](/es/gateway/troubleshooting#dashboard-control-ui-connectivity)
    - [/web/control-ui](/es/web/control-ui)
    - [/gateway/authentication](/es/gateway/authentication)

  </Accordion>

  <Accordion title="La puerta de enlace no se inicia o el servicio está instalado pero no se está ejecutando">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    La salida correcta se ve así:

    - `Service: ... (loaded)`
    - `Runtime: running`
    - `Connectivity probe: ok`
    - `Capability: read-only`, `write-capable`, o `admin-capable`

    Firmas de registro comunes:

    - `Gateway start blocked: set gateway.mode=local` o `existing config is missing gateway.mode` → el modo de puerta de enlace es remoto, o al archivo de configuración le falta la marca de modo local y debe repararse.
    - `refusing to bind gateway ... without auth` → enlace que no es de bucle local sin una ruta de autenticación de puerta de enlace válida (token/contraseña, o proxy de confianza donde esté configurado).
    - `another gateway instance is already listening` o `EADDRINUSE` → puerto ya en uso.

    Páginas profundas:

    - [/gateway/troubleshooting#gateway-service-not-running](/es/gateway/troubleshooting#gateway-service-not-running)
    - [/gateway/background-process](/es/gateway/background-process)
    - [/gateway/configuration](/es/gateway/configuration)

  </Accordion>

  <Accordion title="El canal se conecta pero los mensajes no fluyen">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    La salida correcta se ve así:

    - El transporte del canal está conectado.
    - Las verificaciones de emparejamiento/lista blanca pasan.
    - Las menciones se detectan donde se requieren.

    Firmas de registro comunes:

    - `mention required` → el bloqueo de puerta de mención de grupo bloqueó el procesamiento.
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

    La salida correcta se ve así:

    - `cron.status` muestra que está habilitado con un próximo despertar.
    - `cron runs` muestra entradas `ok` recientes.
    - El latido está habilitado y no está fuera de las horas activas.

    Firmas de registro comunes:

    - `cron: scheduler disabled; jobs will not run automatically` → cron está deshabilitado.
    - `heartbeat skipped` con `reason=quiet-hours` → fuera de las horas activas configuradas.
    - `heartbeat skipped` con `reason=empty-heartbeat-file` → `HEARTBEAT.md` existe pero solo contiene andamiaje en blanco/solo encabezados.
    - `heartbeat skipped` con `reason=no-tasks-due` → el modo de tarea `HEARTBEAT.md` está activo pero aún no vence ningún intervalo de tarea.
    - `heartbeat skipped` con `reason=alerts-disabled` → toda la visibilidad del latido está deshabilitada (`showOk`, `showAlerts` y `useIndicator` están todos apagados).
    - `requests-in-flight` → carril principal ocupado; el despertar del latido se diferió.
    - `unknown accountId` → la cuenta de destino de entrega del latido no existe.

    Páginas profundas:

    - [/gateway/troubleshooting#cron-and-heartbeat-delivery](/es/gateway/troubleshooting#cron-and-heartbeat-delivery)
    - [/automation/cron-jobs#troubleshooting](/es/automation/cron-jobs#troubleshooting)
    - [/gateway/heartbeat](/es/gateway/heartbeat)

  </Accordion>

  <Accordion title="Nodo está emparejado pero la herramienta falla en cámara, lienzo, pantalla, ejecución">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw nodes status
    openclaw nodes describe --node <idOrNameOrIp>
    openclaw logs --follow
    ```

    La salida correcta tiene este aspecto:

    - El nodo aparece como conectado y emparejado para el rol `node`.
    - Existe la capacidad para el comando que está invocando.
    - El estado de permiso está concedido para la herramienta.

    Firmas de registro comunes:

    - `NODE_BACKGROUND_UNAVAILABLE` → traer la aplicación del nodo al primer plano.
    - `*_PERMISSION_REQUIRED` → el permiso del sistema operativo fue denegado o falta.
    - `SYSTEM_RUN_DENIED: approval required` → la aprobación de ejecución está pendiente.
    - `SYSTEM_RUN_DENIED: allowlist miss` → comando no está en la lista de permitidos para ejecución.

    Páginas en profundidad:

    - [/gateway/troubleshooting#node-paired-tool-fails](/es/gateway/troubleshooting#node-paired-tool-fails)
    - [/nodes/troubleshooting](/es/nodes/troubleshooting)
    - [/tools/exec-approvals](/es/tools/exec-approvals)

  </Accordion>

  <Accordion title="Exec de repente solicita aprobación">
    ```bash
    openclaw config get tools.exec.host
    openclaw config get tools.exec.security
    openclaw config get tools.exec.ask
    openclaw gateway restart
    ```

    Qué cambió:

    - Si `tools.exec.host` no está establecido, el valor predeterminado es `auto`.
    - `host=auto` se resuelve a `sandbox` cuando un tiempo de ejecución de espacio aislado está activo, `gateway` en caso contrario.
    - `host=auto` es solo enrutamiento; el comportamiento "YOLO" sin solicitud proviene de `security=full` más `ask=off` en el puerta de enlace/nodo.
    - En `gateway` y `node`, no establecer `tools.exec.security` tiene como valor predeterminado `full`.
    - No establecer `tools.exec.ask` tiene como valor predeterminado `off`.
    - Resultado: si está viendo aprobaciones, alguna política local de host o por sesión ha restringido el exec alejándose de los valores predeterminados actuales.

    Restaurar el comportamiento predeterminado actual sin aprobación:

    ```bash
    openclaw config set tools.exec.host gateway
    openclaw config set tools.exec.security full
    openclaw config set tools.exec.ask off
    openclaw gateway restart
    ```

    Alternativas más seguras:

    - Establezca solo `tools.exec.host=gateway` si solo desea un enrutamiento de host estable.
    - Use `security=allowlist` con `ask=on-miss` si desea exec de host pero aún desea revisiones por errores en la lista de permitidos.
    - Habilite el modo de espacio aislado si desea que `host=auto` se resuelva de nuevo a `sandbox`.

    Firmas de registro comunes:

    - `Approval required.` → el comando está esperando en `/approve ...`.
    - `SYSTEM_RUN_DENIED: approval required` → la aprobación de exec del host del nodo está pendiente.
    - `exec host=sandbox requires a sandbox runtime for this session` → selección implícita/explícita de espacio aislado pero el modo de espacio aislado está desactivado.

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

    El resultado correcto se ve así:

    - El estado del navegador muestra `running: true` y un navegador/perfil elegido.
    - `openclaw` se inicia, o `user` puede ver las pestañas locales de Chrome.

    Firmas comunes de registros:

    - `unknown command "browser"` o `unknown command 'browser'` → `plugins.allow` está establecido y no incluye `browser`.
    - `Failed to start Chrome CDP on port` → error en el inicio del navegador local.
    - `browser.executablePath not found` → la ruta del binario configurado es incorrecta.
    - `browser.cdpUrl must be http(s) or ws(s)` → la URL de CDP configurada utiliza un esquema no compatible.
    - `browser.cdpUrl has invalid port` → la URL de CDP configurada tiene un puerto incorrecto o fuera de rango.
    - `No Chrome tabs found for profile="user"` → el perfil de conexión MCP de Chrome no tiene pestañas locales de Chrome abiertas.
    - `Remote CDP for profile "<name>" is not reachable` → el punto de conexión CDP remoto configurado no es accesible desde este host.
    - `Browser attachOnly is enabled ... not reachable` o `Browser attachOnly is enabled and CDP websocket ... is not reachable` → el perfil de solo conexión no tiene un objetivo CDP activo.
    - configuraciones obsoletas de ventana gráfica / modo oscuro / configuración regional / sin conexión en perfiles CDP remotos o de solo conexión → ejecute `openclaw browser stop --browser-profile <name>` para cerrar la sesión de control activa y liberar el estado de emulación sin reiniciar la puerta de enlace.

    Páginas profundas:

    - [/gateway/troubleshooting#browser-tool-fails](/es/gateway/troubleshooting#browser-tool-fails)
    - [/tools/browser#missing-browser-command-or-tool](/es/tools/browser#missing-browser-command-or-tool)
    - [/tools/browser-linux-troubleshooting](/es/tools/browser-linux-troubleshooting)
    - [/tools/browser-wsl2-windows-remote-cdp-troubleshooting](/es/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

  </Accordion>

</AccordionGroup>

## Relacionado

- [Preguntas frecuentes](/es/help/faq) — preguntas frecuentes
- [Solución de problemas de la puerta de enlace](/es/gateway/troubleshooting) — problemas específicos de la puerta de enlace
- [Doctor](/es/gateway/doctor) — comprobaciones y reparaciones automatizadas del estado de salud
- [Solución de problemas de canales](/es/channels/troubleshooting) — problemas de conectividad de canales
- [Solución de problemas de automatización](/es/automation/cron-jobs#troubleshooting) — problemas de cron y latidos
