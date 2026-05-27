---
summary: "Manual de solución de problemas profundo para gateway, canales, automatización, nodos y navegador"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "Solución de problemas"
sidebarTitle: "Solución de problemas"
---

Esta página es el manual de ejecución profundo. Comience en [/help/troubleshooting](/es/help/troubleshooting) si primero desea el flujo de triaje rápido.

## Escalera de comandos

Ejecute estos primero, en este orden:

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Señales saludables esperadas:

- `openclaw gateway status` muestra `Runtime: running`, `Connectivity probe: ok` y una línea `Capability: ...`.
- `openclaw doctor` no informa problemas de configuración/servicio que bloquean.
- `openclaw channels status --probe` muestra el estado de transporte en vivo por cuenta y, cuando es compatible, resultados de sondas/auditorías como `works` o `audit ok`.

## Después de una actualización

Use esto cuando finalice una actualización pero el Gateway está inactivo, los canales están vacíos, o
las llamadas al modelo comienzan a fallar con errores 401.

```bash
openclaw status --all
openclaw update status --json
openclaw gateway status --deep
openclaw doctor --fix
openclaw gateway restart
```

Busque:

- `Update restart` en `openclaw status` / `openclaw status --all`. Las entregas pendientes o fallidas incluyen el siguiente comando a ejecutar.
- `plugin load failed: dependency tree corrupted; run openclaw doctor --fix`
  en Canales. Eso significa que la configuración del canal aún existe, pero el registro del complemento falló antes de que el canal pudiera cargarse.
- proveedor 401s después de volver a autenticarse. `openclaw doctor --fix` comprueba si hay sombras de autenticación OAuth obsoletas por agente y elimina las copias antiguas para que todos los agentes resuelvan el perfil compartido actual.

## Instalaciones con cerebro dividido y protección de configuración más reciente

Use esto cuando un servicio de gateway se detenga inesperadamente después de una actualización, o los registros muestran que un binario `openclaw` es más antiguo que la versión que escribió por última vez `openclaw.json`.

OpenClaw estampa las escrituras de configuración con `meta.lastTouchedVersion`. Los comandos de solo lectura todavía pueden inspeccionar una configuración escrita por un OpenClaw más reciente, pero las mutaciones de proceso y servicio se niegan a continuar desde un binario antiguo. Las acciones bloqueadas incluyen el inicio, detención, reinicio, desinstalación, reinstalación forzada del servicio, inicio del gateway en modo servicio y la limpieza del puerto `gateway --force`.

```bash
which openclaw
openclaw --version
openclaw gateway status --deep
openclaw config get meta.lastTouchedVersion
```

<Steps>
  <Step title="Corregir PATH">
    Corrija `PATH` para que `openclaw` se resuelva en la instalación más reciente y luego vuelva a ejecutar la acción.
  </Step>
  <Step title="Reinstall the gateway service">
    Vuelva a instalar el servicio de puerta de enlace deseado desde la instalación más reciente:

    ```bash
    openclaw gateway install --force
    openclaw gateway restart
    ```

  </Step>
  <Step title="Remove stale wrappers">
    Elimine paquetes del sistema obsoletos o entradas de contenedor antiguas que aún apunten a un binario `openclaw` antiguo.
  </Step>
</Steps>

<Warning>Solo para una degradación intencional o una recuperación de emergencia, configure `OPENCLAW_ALLOW_OLDER_BINARY_DESTRUCTIVE_ACTIONS=1` para el comando único. Déjelo sin configurar para el funcionamiento normal.</Warning>

## Incompatibilidad de protocolo después de la reversión

Use esto cuando los registros sigan imprimiendo `protocol mismatch` después de degradar o revertir OpenClaw. Esto significa que se está ejecutando una versión antigua de Gateway, pero un proceso de cliente local más reciente sigue intentando reconectarse con un rango de protocolo que la versión antigua de Gateway no puede hablar.

```bash
openclaw --version
which -a openclaw
openclaw gateway status --deep
openclaw doctor --deep
openclaw logs --follow
```

Busque:

- `protocol mismatch ... client=... v<version> min=<n> max=<n> expected=<n>` en los registros de Gateway.
- `Established clients:` en `openclaw gateway status --deep` o `Gateway clients` en `openclaw doctor --deep`. Esto enumera los clientes TCP activos conectados al puerto de Gateway, incluyendo los PIDs y las líneas de comandos cuando el sistema operativo lo permite.
- Un proceso de cliente cuya línea de comandos apunte a la instalación o contenedor de OpenClaw más reciente desde el que se revirtió.

Solución:

1. Detenga o reinicie el proceso del cliente OpenClaw obsoleto que se muestra en `gateway status --deep`.
2. Reinicie las aplicaciones o contenedores que incrustan OpenClaw, como paneles locales, editores, asistentes de servidores de aplicaciones o shells `openclaw logs --follow` de larga ejecución.
3. Vuelva a ejecutar `openclaw gateway status --deep` o `openclaw doctor --deep` y confirme que el PID del cliente obsoleto ha desaparecido.

No haga que una versión anterior de Gateway acepte un protocolo más reciente incompatible. Los incrementos de protocolo protegen el contrato del cable; la recuperación por reversión es un problema de limpieza de proceso/versión.

## Enlace simbólico de habilidad omitido como escape de ruta

Use esto cuando los registros incluyan:

```text
Skipping escaped skill path outside its configured root: ... reason=symlink-escape
```

OpenClaw trata cada raíz de habilidad como un límite de contención. Se omite un enlace simbólico bajo
`~/.agents/skills`, `<workspace>/.agents/skills`, `<workspace>/skills` o
`~/.openclaw/skills` cuando su destino real se resuelve fuera de esa raíz
a menos que el destino sea explícitamente confiable.

Inspeccione el enlace:

```bash
ls -l ~/.agents/skills/<name>
realpath ~/.agents/skills/<name>
openclaw config get skills.load
```

Si el destino es intencional, configure tanto la raíz directa de la habilidad como el destino de enlace simbólico permitido:

```json5
{
  skills: {
    load: {
      extraDirs: ["~/Projects/manager/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
  },
}
```

Luego inicie una nueva sesión o espere a que el observador de habilidades se actualice. Reinicie la puerta de enlace si el proceso en ejecución es anterior al cambio de configuración.

No use objetivos amplios como `~`, `/`, o una carpeta completa de proyecto sincronizado.
Mantenga `allowSymlinkTargets` limitado a la raíz de habilidad real que contiene directorios `SKILL.md` de confianza.

Relacionado:

- [Configuración de habilidades](/es/tools/skills-config#symlinked-sibling-repos)
- [Ejemplos de configuración](/es/gateway/configuration-examples#symlinked-sibling-skill-repo)

## Anthropic 429 uso adicional requerido para contexto largo

Use esto cuando los registros/errores incluyan: `HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

Busque:

- El modelo de Anthropic seleccionado es un modelo Claude 4.x capaz de GA de 1M, o el modelo tiene `params.context1m: true` heredado.
- La credencial actual de Anthropic no es elegible para el uso de contexto largo.
- Las solicitudes fallan solo en sesiones/ejecuciones de modelo largas que necesitan la ruta de contexto de 1M.

Opciones de solución:

<Steps>
  <Step title="Usar una ventana de contexto estándar">Cambie a un modelo de ventana estándar o elimine el `context1m` heredado de la configuración del modelo antiguo que no es capaz de GA para contexto de 1M.</Step>
  <Step title="Usar una credencial elegible">Use una credencial de Anthropic que sea elegible para solicitudes de contexto largo, o cambie a una clave de API de Anthropic.</Step>
  <Step title="Configurar modelos alternativos">Configure modelos alternativos para que las ejecuciones continúen cuando se rechacen las solicitudes de contexto largo de Anthropic.</Step>
</Steps>

Relacionado:

- [Anthropic](/es/providers/anthropic)
- [Uso de tokens y costos](/es/reference/token-use)
- [¿Por qué veo HTTP 429 de Anthropic?](/es/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## Respuestas bloqueadas 403 del servidor ascendente

Use esto cuando un proveedor de LLM ascendente devuelve un `403` genérico, como
`Your request was blocked`.

No asuma que esto es siempre un problema de configuración de OpenClaw. La respuesta puede
provenir de una capa de seguridad ascendente como un CDN, WAF, regla de gestión de bots o
proxy inverso frente a un punto final compatible con OpenAI.

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
```

Busque:

- múltiples modelos bajo el mismo proveedor fallando de la misma manera
- texto HTML o de seguridad genérico en lugar de un error de API de proveedor normal
- eventos de seguridad del lado del proveedor para la misma hora de solicitud
- que un sondeo `curl` directo y minúsculo tenga éxito mientras fallan las solicitudes normales con forma de SDK

Solucione primero el filtrado del lado del proveedor cuando la evidencia apunte a un bloqueo
WAF/CDN. Prefiera una regla de permiso o omisión de alcance estrecho para la ruta de API que usa
OpenClaw y evite deshabilitar la protección para todo el sitio.

<Warning>Un `curl` mínimo exitoso no garantiza que las solicitudes reales de estilo SDK pasen a través de la misma capa de seguridad ascendente.</Warning>

Relacionado:

- [Puntos finales compatibles con OpenAI](/es/gateway/configuration-reference#openai-compatible-endpoints)
- [Configuración del proveedor](/es/providers)
- [Registros](/es/logging)

## El backend compatible con OpenAI local pasa las sondas directas pero fallan las ejecuciones del agente

Use esto cuando:

- `curl ... /v1/models` funciona
- las llamadas directas `/v1/chat/completions` diminutas funcionan
- las ejecuciones del modelo OpenClaw fallan solo en los turnos normales del agente

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

Busque:

- las llamadas directas diminutas tienen éxito, pero las ejecuciones de OpenClaw fallan solo en indicaciones más grandes
- errores `model_not_found` o 404 aunque el `/v1/chat/completions`
  directo funciona con el mismo id de modelo básico
- errores del backend sobre `messages[].content` esperando una cadena
- advertencias `incomplete turn detected ... stopReason=stop payloads=0` intermitentes con un backend local compatible con OpenAI
- fallos del backend que aparecen solo con recuentos de tokens de indicación grandes o indicaciones completas del tiempo de ejecución del agente

<AccordionGroup>
  <Accordion title="Firmas comunes">
    - `model_not_found` con un servidor local estilo MLX/vLLM → verifique que `baseUrl` incluya `/v1`, que `api` sea `"openai-completions"` para los backends `/v1/chat/completions`, y que `models.providers.<provider>.models[].id` sea el ID local simple del proveedor. Selecciónelo una vez con el prefijo del proveedor, por ejemplo `mlx/mlx-community/Qwen3-30B-A3B-6bit`; mantenga la entrada del catálogo como `mlx-community/Qwen3-30B-A3B-6bit`.
    - `messages[...].content: invalid type: sequence, expected a string` → el backend rechaza las partes de contenido estructurado de Chat Completions. Solución: establezca `models.providers.<provider>.models[].compat.requiresStringContent: true`.
    - `validation.keys` o claves de mensaje permitidas como `["role","content"]` → el backend rechaza los metadatos de repetición estilo OpenAI en los mensajes de Chat Completions. Solución: establezca `models.providers.<provider>.models[].compat.strictMessageKeys: true`.
    - `incomplete turn detected ... stopReason=stop payloads=0` → el backend completó la solicitud de Chat Completions pero no devolvió texto de asistente visible para el usuario para ese turno. OpenClaw reintenta una vez los turnos vacíos compatibles con OpenAI y seguros para repetición; los fallos persistentes generalmente significan que el backend está emitiendo contenido vacío/no textual o suprimiendo el texto de respuesta final.
    - las solicitudes directas diminutas tienen éxito, pero las ejecuciones del agente OpenClaw fallan con bloqueos del backend/modelo (por ejemplo, Gemma en algunas compilaciones `inferrs`) → es probable que el transporte de OpenClaw ya sea correcto; el backend está fallando debido a la forma del indicador más grande del tiempo de ejecución del agente.
    - los fallos disminuyen después de deshabilitar las herramientas pero no desaparecen → los esquemas de herramientas eran parte de la presión, pero el problema restante sigue siendo la capacidad del modelo/servidor ascendente o un error del backend.

  </Accordion>
  <Accordion title="Opciones de corrección">
    1. Establezca `compat.requiresStringContent: true` para backends de Chat Completions que solo sean cadenas.
    2. Establezca `compat.strictMessageKeys: true` para backends de Chat Completions estrictos que solo acepten `role` y `content` en cada mensaje.
    3. Establezca `compat.supportsTools: false` para modelos/backends que no puedan manejar la superficie del esquema de herramientas de OpenClaw de manera confiable.
    4. Reduzca la presión del prompt donde sea posible: un bootstrap de espacio de trabajo más pequeño, un historial de sesión más corto, un modelo local más ligero o un backend con mayor compatibilidad con contexto largo.
    5. Si las solicitudes directas diminutas siguen pasando mientras los turnos del agente de OpenClaw siguen fallando dentro del backend, trátelo como una limitación del servidor/modelo ascendente y presente un informe de error allí con la forma del payload aceptado.
  </Accordion>
</AccordionGroup>

Relacionado:

- [Configuración](/es/gateway/configuration)
- [Modelos locales](/es/gateway/local-models)
- [Endpoints compatibles con OpenAI](/es/gateway/configuration-reference#openai-compatible-endpoints)

## Sin respuestas

Si los canales están activos pero nada responde, verifique el enrutamiento y la política antes de volver a conectar cualquier cosa.

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

Busque:

- Emparejamiento pendiente para remitentes de MD.
- Filtrado de menciones de grupo (`requireMention`, `mentionPatterns`).
- Incoincidencias en la lista de permitidos de canales/grupos.

Firmas comunes:

- `drop guild message (mention required` → mensaje de grupo ignorado hasta la mención.
- `pairing request` → el remitente necesita aprobación.
- `blocked` / `allowlist` → remitente/canal fue filtrado por política.

Relacionado:

- [Solución de problemas de canales](/es/channels/troubleshooting)
- [Grupos](/es/channels/groups)
- [Emparejamiento](/es/channels/pairing)

## Conectividad de la interfaz de usuario de control del panel

Cuando el panel/interfaz de usuario de control no se conecte, valide la URL, el modo de autenticación y las suposiciones del contexto seguro.

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

Busque:

- URL de sondeo y URL del panel correctas.
- Incoincidencia de modo/token de autenticación entre el cliente y la puerta de enlace.
- Uso de HTTP donde se requiere la identidad del dispositivo.

Si un navegador local no puede conectarse a `127.0.0.1:18789` después de una actualización, primero
recupere el servicio Gateway local y confirme que está sirviendo el panel:

```bash
openclaw gateway restart
lsof -i :18789
curl http://127.0.0.1:18789
```

Si `curl` devuelve HTML de OpenClaw, el Gateway está funcionando y el problema restante probablemente sea el caché del navegador, un enlace profundo antiguo o un estado de pestaña obsoleto. Abra `http://127.0.0.1:18789` directamente y navegue desde el panel. Si el reinicio no deja el servicio en ejecución, ejecute `openclaw gateway start` y verifique nuevamente `openclaw gateway status`.

<AccordionGroup>
  <Accordion title="Conexión / firmas de autenticación">
    - `device identity required` → contexto no seguro o falta de autenticación del dispositivo.
    - `origin not allowed` → el `Origin` del navegador no está en `gateway.controlUi.allowedOrigins` (o se está conectando desde un origen de navegador que no es de bucle local sin una lista de permitidos explícita).
    - `device nonce required` / `device nonce mismatch` → el cliente no está completando el flujo de autenticación del dispositivo basado en desafío (`connect.challenge` + `device.nonce`).
    - `device signature invalid` / `device signature expired` → el cliente firmó la carga útil incorrecta (o una marca de tiempo obsoleta) para el protocolo de enlace actual.
    - `AUTH_TOKEN_MISMATCH` con `canRetryWithDeviceToken=true` → el cliente puede hacer un reintento de confianza con el token de dispositivo en caché.
    - Ese reintento de token en caché reutiliza el conjunto de ámbitos en caché almacenados con el token del dispositivo emparejado. Los llamadores `deviceToken` explícitos / `scopes` explícitos mantienen su conjunto de ámbitos solicitado en su lugar.
    - `AUTH_SCOPE_MISMATCH` → se reconoció el token del dispositivo, pero sus ámbitos aprobados no cubren esta solicitud de conexión; vuelva a emparejar o apruebe el contrato de ámbito solicitado en lugar de rotar un token de puerta de enlace compartido.
    - Fuera de esa ruta de reintento, la precedencia de autenticación de conexión es token/contraseña compartido explícito primero, luego `deviceToken` explícito, luego token de dispositivo almacenado, luego token de arranque.
    - En la ruta de la interfaz de usuario de control de Tailscale Serve asíncrona, los intentos fallidos para el mismo `{scope, ip}` se serializan antes de que el limitador registre el fallo. Por lo tanto, dos reintentos concurrentes incorrectos del mismo cliente pueden mostrar `retry later` en el segundo intento en lugar de dos discordancias simples.
    - `too many failed authentication attempts (retry later)` de un cliente de bucle local de origen del navegador → los fallos repetidos de ese mismo `Origin` normalizado se bloquean temporalmente; otro origen de localhost utiliza un depósito separado.
    - `unauthorized` repetidos después de ese reintento → deriva del token compartido/token del dispositivo; actualice la configuración del token y vuelva a aprobar/rotar el token del dispositivo si es necesario.
    - `gateway connect failed:` → objetivo de host/puerto/url incorrecto.

  </Accordion>
</AccordionGroup>

### Mapa rápido de códigos de detalle de autenticación

Use `error.details.code` de la respuesta fallida `connect` para elegir la siguiente acción:

| Código de detalle            | Significado                                                                                                                                                                                                                | Acción recomendada                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AUTH_TOKEN_MISSING`         | El cliente no envió un token compartido requerido.                                                                                                                                                                         | Pegue/establezca el token en el cliente y reintente. Para rutas del panel: `openclaw config get gateway.auth.token` y luego pegue en la configuración de Control UI.                                                                                                                                                                                                                       |
| `AUTH_TOKEN_MISMATCH`        | El token compartido no coincidía con el token de autenticación de la puerta de enlace.                                                                                                                                     | Si `canRetryWithDeviceToken=true`, permita un reintento de confianza. Los reintentos de token en caché reutilizan los alcances aprobados almacenados; los llamadores explícitos `deviceToken` / `scopes` mantienen los alcances solicitados. Si sigue fallando, ejecute la [lista de verificación de recuperación de desviación de token](/es/cli/devices#token-drift-recovery-checklist). |
| `AUTH_DEVICE_TOKEN_MISMATCH` | El token en caché por dispositivo está obsoleto o revocado.                                                                                                                                                                | Rote/vuelva a aprobar el token del dispositivo usando [devices CLI](/es/cli/devices), luego vuelva a conectar.                                                                                                                                                                                                                                                                             |
| `AUTH_SCOPE_MISMATCH`        | El token del dispositivo es válido, pero su rol/alcances aprobados no cubren esta solicitud de conexión.                                                                                                                   | Vuelva a emparejar el dispositivo o apruebe el contrato de alcance solicitado; no trate esto como una desviación del token compartido.                                                                                                                                                                                                                                                     |
| `PAIRING_REQUIRED`           | La identidad del dispositivo necesita aprobación. Verifique `error.details.reason` para `not-paired`, `scope-upgrade`, `role-upgrade`, o `metadata-upgrade`, y use `requestId` / `remediationHint` cuando estén presentes. | Aprobar solicitud pendiente: `openclaw devices list` y luego `openclaw devices approve <requestId>`. Las actualizaciones de alcance/rol usan el mismo flujo después de revisar el acceso solicitado.                                                                                                                                                                                       |

<Note>
  Las RPC de backend de retorno directo autenticadas con el token/contraseña compartido de la puerta de enlace no deben depender de la línea base de alcance del dispositivo emparejado de la CLI. Si los subagentes u otras llamadas internas siguen fallando con `scope-upgrade`, verifique que el llamador esté usando `client.id: "gateway-client"` y `client.mode: "backend"` y no esté forzando un
  `deviceIdentity` explícito o un token de dispositivo.
</Note>

Verificación de migración de autenticación de dispositivo v2:

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

Si los registros muestran errores de nonce/firma, actualice el cliente que se está conectando y verifíquelo:

<Steps>
  <Step title="Esperar connect.challenge">El cliente espera el `connect.challenge` emitido por la puerta de enlace.</Step>
  <Step title="Firmar la carga útil">El cliente firma la carga útil vinculada al desafío.</Step>
  <Step title="Enviar el nonce del dispositivo">El cliente envía `connect.params.device.nonce` con el mismo nonce de desafío.</Step>
</Steps>

Si `openclaw devices rotate` / `revoke` / `remove` se deniega inesperadamente:

- las sesiones de token de dispositivo emparejado solo pueden gestionar **su propio** dispositivo a menos que la persona que llama también tenga `operator.admin`
- `openclaw devices rotate --scope ...` solo puede solicitar ámbitos de operador que la sesión de la persona que llama ya posee

Relacionado:

- [Configuración](/es/gateway/configuration) (modos de autenticación de la puerta de enlace)
- [Interfaz de control](/es/web/control-ui)
- [Dispositivos](/es/cli/devices)
- [Acceso remoto](/es/gateway/remote)
- [Autenticación de proxy de confianza](/es/gateway/trusted-proxy-auth)

## El servicio de puerta de enlace no se está ejecutando

Use esto cuando el servicio está instalado pero el proceso no permanece activo.

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # also scan system-level services
```

Busque:

- `Runtime: stopped` con sugerencias de salida.
- Desajuste de configuración del servicio (`Config (cli)` vs `Config (service)`).
- Conflictos de puerto/escucha.
- Instalaciones adicionales de launchd/systemd/schtasks cuando se usa `--deep`.
- Sugerencias de limpieza de `Other gateway-like services detected (best effort)`.

<AccordionGroup>
  <Accordion title="Firmas comunes">
    - `Gateway start blocked: set gateway.mode=local` o `existing config is missing gateway.mode` → el modo de puerta de enlace local no está habilitado, o el archivo de configuración fue sobrescrito y perdió `gateway.mode`. Solución: establezca `gateway.mode="local"` en su configuración, o vuelva a ejecutar `openclaw onboard --mode local` / `openclaw setup` para restablecer la configuración de modo local esperada. Si está ejecutando OpenClaw mediante Podman, la ruta de configuración predeterminada es `~/.openclaw/openclaw.json`.
    - `refusing to bind gateway ... without auth` → enlace sin bucle invertido (non-loopback) sin una ruta de autenticación de puerta de enlace válida (token/contraseña, o proxy de confianza donde esté configurado).
    - `another gateway instance is already listening` / `EADDRINUSE` → conflicto de puerto.
    - `Other gateway-like services detected (best effort)` → existen unidades launchd/systemd/schtasks obsoletas o paralelas. La mayoría de las configuraciones deben mantener una sola puerta de enlace por máquina; si necesita más de una, aísle los puertos + configuración/estado/espacio de trabajo. Consulte [/gateway#multiple-gateways-same-host](/es/gateway#multiple-gateways-same-host).
    - `System-level OpenClaw gateway service detected` desde el doctor → existe una unidad de sistema systemd mientras falta el servicio de nivel de usuario. Elimine o deshabilite el duplicado antes de permitir que el doctor instale un servicio de usuario, o establezca `OPENCLAW_SERVICE_REPAIR_POLICY=external` si la unidad de sistema es el supervisor previsto.
    - `Gateway service port does not match current gateway config` → el supervisor instalado aún fija la `--port` antigua. Ejecute `openclaw doctor --fix` o `openclaw gateway install --force`, luego reinicie el servicio de puerta de enlace.

  </Accordion>
</AccordionGroup>

Relacionado:

- [Herramienta de ejecución en segundo plano y de procesos](/es/gateway/background-process)
- [Configuración](/es/gateway/configuration)
- [Doctor](/es/gateway/doctor)

## Gateway sale durante un uso elevado de memoria

Use esto cuando el Gateway desaparece bajo carga, el supervisor informa un reinicio de estilo OOM, o los registros mencionan `critical memory pressure bundle written`.

```bash
openclaw gateway status --deep
openclaw logs --follow
openclaw gateway stability --bundle latest
openclaw gateway diagnostics export
```

Busque:

- `Reason: diagnostic.memory.pressure.critical` en el paquete de estabilidad más reciente.
- `Memory pressure:` con `critical/rss_threshold`, `critical/heap_threshold`, o `critical/rss_growth`.
- Valores de `V8 heap:` cerca del límite del montículo (heap).
- entradas `Largest session files:` como `agents/<agent>/sessions/<session>.jsonl` o `sessions/<session>.jsonl`.
- Contadores de memoria de cgroup de Linux cuando el gateway se ejecuta dentro de un contenedor o servicio con límite de memoria.

Firmas comunes:

- `critical memory pressure bundle written` aparece poco antes del reinicio → OpenClaw capturó un paquete de estabilidad pre-OOM. Inspecciónelo con `openclaw gateway stability --bundle latest`.
- `memory pressure: level=critical ... memoryPressureSnapshot=disabled` aparece en los registros del gateway → OpenClaw detectó presión crítica de memoria, pero la instantánea de estabilidad pre-OOM está desactivada.
- `Largest session files:` apunta a una ruta de transcripción redactada muy grande → reduzca el historial de sesión retenido, inspeccione el crecimiento de la sesión o mueva las transcripciones antiguas fuera del almacén activo antes de reiniciar.
- Los bytes utilizados `V8 heap:` están cerca del límite del montículo → reduzca la presión del prompt/sesión, reduzca el trabajo concurrente o aumente el límite del montículo de Node solo después de confirmar que la carga de trabajo es la esperada.
- `Memory pressure: critical/rss_growth` → la memoria creció rápidamente dentro de una ventana de muestreo. Verifique los registros más recientes para ver si hay una importación grande, salida de herramienta descontrolada, reintentos repetidos o un lote de trabajo de agente en cola.
- Aparece una presión de memoria crítica en los registros pero no existe ningún paquete → este es el comportamiento predeterminado. Configure `diagnostics.memoryPressureSnapshot: true` para capturar el paquete de estabilidad pre-OOM en futuros eventos de presión crítica de memoria.

El paquete de estabilidad no tiene carga útil. Incluye evidencia de memoria operativa y rutas de archivo relativas redactadas, no texto de mensajes, cuerpos de webhook, credenciales, tokens, cookies o identificadores de sesión sin procesar. Adjunte la exportación de diagnósticos a los informes de errores en lugar de copiar los registros sin procesar.

Relacionado:

- [Estado del gateway](/es/gateway/health)
- [Exportación de diagnósticos](/es/gateway/diagnostics)
- [Sesiones](/es/cli/sessions)

## El gateway rechazó una configuración no válida

Use esto cuando el inicio del gateway falla con `Invalid config` o los registros de recarga en caliente dicen
que omitió una edición no válida.

```bash
openclaw logs --follow
openclaw config file
openclaw config validate
openclaw doctor
```

Busque:

- `Invalid config at ...`
- `config reload skipped (invalid config): ...`
- `Config write rejected: ...`
- Un archivo `openclaw.json.rejected.*` con marca de tiempo junto a la configuración activa
- Un archivo `openclaw.json.clobbered.*` con marca de tiempo si `doctor --fix` reparó una edición directa rota
- OpenClaw mantiene los últimos 32 archivos `.clobbered.*` para cada ruta de configuración y rota los más antiguos

<AccordionGroup>
  <Accordion title="Qué ocurrió">
    - La configuración no se validó durante el inicio, la recarga en caliente (hot reload) o una escritura propiedad de OpenClaw.
    - El inicio de Gateway falla de forma cerrada en lugar de reescribir `openclaw.json`.
    - La recarga en caliente omite las ediciones externas no válidas y mantiene la configuración de tiempo de ejecución actual activa.
    - Las escrituras propiedad de OpenClaw rechazan cargas no válidas o destructivas antes de la confirmación y guardan `.rejected.*`.
    - `openclaw doctor --fix` se encarga de la reparación. Puede eliminar prefijos que no sean JSON o restaurar la última copia conocida como buena, preservando la carga rechazada como `.clobbered.*`.
    - Cuando ocurren muchas reparaciones para una ruta de configuración, OpenClaw rota los archivos `.clobbered.*` más antiguos para que la carga reparada más reciente siga disponible.

  </Accordion>
  <Accordion title="Inspeccionar y reparar">
    ```bash
    CONFIG="$(openclaw config file)"
    ls -lt "$CONFIG".clobbered.* "$CONFIG".rejected.* 2>/dev/null | head
    diff -u "$CONFIG" "$(ls -t "$CONFIG".clobbered.* 2>/dev/null | head -n 1)"
    openclaw config validate
    openclaw doctor
    ```
  </Accordion>
  <Accordion title="Firmas comunes">
    - `.clobbered.*` existe → doctor preservó una edición externa rota mientras reparaba la configuración activa.
    - `.rejected.*` existe → una escritura de configuración propiedad de OpenClaw falló las verificaciones de esquema o sobrescritura antes de la confirmación.
    - `Config write rejected:` → la escritura intentó eliminar la forma requerida, reducir drásticamente el archivo o persistir una configuración no válida.
    - `config reload skipped (invalid config):` → una edición directa falló la validación y fue ignorada por el Gateway en ejecución.
    - `Invalid config at ...` → el inicio falló antes de que se iniciaran los servicios de Gateway.
    - `missing-meta-vs-last-good`, `gateway-mode-missing-vs-last-good` o `size-drop-vs-last-good:*` → se rechazó una escritura propiedad de OpenClaw porque perdió campos o tamaño en comparación con la copia de seguridad última conocida como buena.
    - `Config last-known-good promotion skipped` → el candidato contenía marcadores de posición de secretos redactados, como `***`.

  </Accordion>
  <Accordion title="Opciones de corrección">
    1. Ejecute `openclaw doctor --fix` para permitir que doctor repare la configuración prefijada/dañada o restaure la última configuración buena conocida.
    2. Copie solo las claves deseadas de `.clobbered.*` o `.rejected.*`, luego aplíquelas con `openclaw config set` o `config.patch`.
    3. Ejecute `openclaw config validate` antes de reiniciar.
    4. Si edita a mano, mantenga la configuración completa de JSON5, no solo el objeto parcial que deseaba cambiar.
  </Accordion>
</AccordionGroup>

Relacionado:

- [Config](/es/cli/config)
- [Configuration: hot reload](/es/gateway/configuration#config-hot-reload)
- [Configuration: strict validation](/es/gateway/configuration#strict-validation)
- [Doctor](/es/gateway/doctor)

## Advertencias de sondeo de Gateway

Use esto cuando `openclaw gateway probe` llega a algo, pero aún imprime un bloque de advertencia.

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

Busque:

- `warnings[].code` y `primaryTargetId` en la salida JSON.
- Si la advertencia es sobre el respaldo SSH, múltiples gateways, alcances faltantes o referencias de autenticación sin resolver.

Firmas comunes:

- `SSH tunnel failed to start; falling back to direct probes.` → La configuración de SSH falló, pero el comando aún intentó objetivos directos configurados/bucle local.
- `multiple reachable gateways detected` → más de un objetivo respondió. Por lo general, esto significa una configuración intencional de múltiples gateways o escuchas obsoletas/duplicadas.
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → la conexión funcionó, pero el RPC de detalle está limitado por alcance; vincule la identidad del dispositivo o use credenciales con `operator.read`.
- `Gateway accepted the WebSocket connection, but follow-up read diagnostics failed` → la conexión funcionó, pero el conjunto completo de RPC de diagnóstico expiró o falló. Trátelo como un Gateway accesible con diagnósticos degradados; compare `connect.ok` y `connect.rpcOk` en la salida de `--json`.
- `Capability: pairing-pending` o `gateway closed (1008): pairing required` → el gateway respondió, pero este cliente aún necesita vinculación/aprobación antes del acceso normal del operador.
- texto de advertencia de SecretRef `gateway.auth.*` / `gateway.remote.*` sin resolver → el material de autenticación no estaba disponible en esta ruta de comando para el objetivo fallido.

Relacionado:

- [Pasarela](/es/cli/gateway)
- [Múltiples pasarelas en el mismo host](/es/gateway#multiple-gateways-same-host)
- [Acceso remoto](/es/gateway/remote)

## Canal conectado, mensajes no fluyen

Si el estado del canal es conectado pero el flujo de mensajes está muerto, concéntrate en la política, los permisos y las reglas de entrega específicas del canal.

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

Busca:

- Política de MD (`pairing`, `allowlist`, `open`, `disabled`).
- Lista de permitidos de grupos y requisitos de mención.
- Permisos/alcances de la API del canal faltantes.

Firmas comunes:

- `mention required` → mensaje ignorado por la política de mención de grupo.
- `pairing` / rastros de aprobación pendiente → el remitente no está aprobado.
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → problema de autenticación/permisos del canal.

Relacionado:

- [Solución de problemas del canal](/es/channels/troubleshooting)
- [Discord](/es/channels/discord)
- [Telegram](/es/channels/telegram)
- [WhatsApp](/es/channels/whatsapp)

## Entrega de Cron y latido

Si el cron o el latido no se ejecutó o no entregó, verifica primero el estado del programador, luego el objetivo de entrega.

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

Busca:

- Cron habilitado y próximo despertar presente.
- Estado del historial de ejecución del trabajo (`ok`, `skipped`, `error`).
- Razones de omisión de latido (`quiet-hours`, `requests-in-flight`, `cron-in-progress`, `lanes-busy`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`).

<AccordionGroup>
  <Accordion title="Firmas comunes">
    - `cron: scheduler disabled; jobs will not run automatically` → cron desactivado.
    - `cron: timer tick failed` → error del tick del programador; verifique errores de archivo/log/runtime.
    - `heartbeat skipped` con `reason=quiet-hours` → fuera de la ventana de horas activas.
    - `heartbeat skipped` con `reason=empty-heartbeat-file` → `HEARTBEAT.md` existe pero solo contiene líneas en blanco / encabezados markdown, por lo que OpenClaw omite la llamada al modelo.
    - `heartbeat skipped` con `reason=no-tasks-due` → `HEARTBEAT.md` contiene un bloque `tasks:`, pero ninguna de las tareas está programada para este tick.
    - `heartbeat: unknown accountId` → id de cuenta no válido para el destino de entrega de latido.
    - `heartbeat skipped` con `reason=dm-blocked` → el destino de latido se resolvió a un destino tipo DM mientras que `agents.defaults.heartbeat.directPolicy` (o anulación por agente) está configurado en `block`.

  </Accordion>
</AccordionGroup>

Relacionado:

- [Latido](/es/gateway/heartbeat)
- [Tareas programadas](/es/automation/cron-jobs)
- [Tareas programadas: solución de problemas](/es/automation/cron-jobs#troubleshooting)

## Nodo emparejado, error de herramienta

Si un nodo está emparejado pero las herramientas fallan, aisle el estado de primer plano, permisos y aprobación.

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

Busque:

- Nodo en línea con las capacidades esperadas.
- Concesiones de permisos del sistema operativo para cámara/micrófono/ubicación/pantalla.
- Estado de aprobaciones de ejecución y lista blanca.

Firmas comunes:

- `NODE_BACKGROUND_UNAVAILABLE` → la aplicación del nodo debe estar en primer plano.
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → falta permiso del sistema operativo.
- `SYSTEM_RUN_DENIED: approval required` → aprobación de ejecución pendiente.
- `SYSTEM_RUN_DENIED: allowlist miss` → comando bloqueado por la lista blanca.

Relacionado:

- [Aprobaciones de ejecución](/es/tools/exec-approvals)
- [Solución de problemas del nodo](/es/nodes/troubleshooting)
- [Nodos](/es/nodes/index)

## Fallo de la herramienta del navegador

Use esto cuando las acciones de la herramienta del navegador fallan aunque la puerta de enlace en sí esté sana.

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

Busque:

- Si `plugins.allow` está configurado e incluye `browser`.
- Ruta ejecutable válida del navegador.
- Alcanzabilidad del perfil CDP.
- Disponibilidad local de Chrome para los perfiles `existing-session` / `user`.

<AccordionGroup>
  <Accordion title="Plugin / executable signatures">
    - `unknown command "browser"` o `unknown command 'browser'` → el plugin del navegador incluido está excluido por `plugins.allow`.
    - herramienta de navegador faltante / no disponible mientras `browser.enabled=true` → `plugins.allow` excluye `browser`, por lo que el plugin nunca se cargó.
    - `Failed to start Chrome CDP on port` → falló el inicio del proceso del navegador.
    - `browser.executablePath not found` → la ruta configurada no es válida.
    - `browser.cdpUrl must be http(s) or ws(s)` → la URL de CDP configurada utiliza un esquema no admitido, como `file:` o `ftp:`.
    - `browser.cdpUrl has invalid port` → la URL de CDP configurada tiene un puerto incorrecto o fuera de rango.
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → la instalación actual de la puerta de enlace carece de la dependencia principal del tiempo de ejecución del navegador; reinstale o actualice OpenClaw y luego reinicie la puerta de enlace. Las instantáneas ARIA y las capturas de pantalla básicas de la página aún pueden funcionar, pero la navegación, las instantáneas de IA, las capturas de pantalla de elementos con selectores CSS y la exportación de PDF permanecerán no disponibles.

  </Accordion>
  <Accordion title="Chrome MCP / existing-session signatures">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP existing-session aún no ha podido adjuntarse al directorio de datos del navegador seleccionado. Abra la página de inspección del navegador, habilite la depuración remota, mantenga el navegador abierto, apruebe la primera solicitud de adjuntar y luego vuelva a intentarlo. Si no se requiere el estado de inicio de sesión, prefiera el perfil administrado `openclaw`.
    - `No Chrome tabs found for profile="user"` → el perfil de adjuntar de Chrome MCP no tiene pestañas locales de Chrome abiertas.
    - `Remote CDP for profile "<name>" is not reachable` → el punto final CDP remoto configurado no es accesible desde el host de la puerta de enlace.
    - `Browser attachOnly is enabled ... not reachable` o `Browser attachOnly is enabled and CDP websocket ... is not reachable` → el perfil de solo adjuntar no tiene un destino accesible, o el punto final HTTP respondió pero aún no se pudo abrir el WebSocket de CDP.

  </Accordion>
  <Accordion title="Element / screenshot / upload signatures">
    - `fullPage is not supported for element screenshots` → solicitud de captura de pantalla mixta `--full-page` con `--ref` o `--element`.
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → las llamadas de captura de pantalla de Chrome MCP / `existing-session` deben usar captura de página o una instantánea `--ref`, no CSS `--element`.
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → los enlaces de subida de Chrome MCP necesitan referencias de instantánea, no selectores CSS.
    - `existing-session file uploads currently support one file at a time.` → envía una subida por llamada en los perfiles de Chrome MCP.
    - `existing-session dialog handling does not support timeoutMs.` → los enlaces de diálogo en los perfiles de Chrome MCP no admiten anulaciones de tiempo de espera.
    - `existing-session type does not support timeoutMs overrides.` → omite `timeoutMs` para `act:type` en perfiles de sesión existente de `profile="user"` / Chrome MCP, o usa un perfil de navegador administrado/CDP cuando se requiera un tiempo de espera personalizado.
    - `existing-session evaluate does not support timeoutMs overrides.` → omite `timeoutMs` para `act:evaluate` en perfiles de sesión existente de `profile="user"` / Chrome MCP, o usa un perfil de navegador administrado/CDP cuando se requiera un tiempo de espera personalizado.
    - `response body is not supported for existing-session profiles yet.` → `responsebody` todavía requiere un navegador administrado o un perfil CDP sin procesar.
    - anulaciones obsoletas de viewport / modo oscuro / configuración regional / sin conexión en perfiles CDP remotos o solo de conexión → ejecuta `openclaw browser stop --browser-profile <name>` para cerrar la sesión de control activa y liberar el estado de emulación de Playwright/CDP sin reiniciar toda la puerta de enlace.

  </Accordion>
</AccordionGroup>

Relacionado:

- [Navegador (administrado por OpenClaw)](/es/tools/browser)
- [Solución de problemas del navegador](/es/tools/browser-linux-troubleshooting)

## Si actualizaste y algo dejó de funcionar repentinamente

La mayoría de las roturas posteriores a la actualización se deben a una deriva de la configuración o a valores predeterminados más estrictos que ahora se aplican.

<AccordionGroup>
  <Accordion title="1. El comportamiento de la anulación de autenticación y URL ha cambiado">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    Qué comprobar:

    - Si `gateway.mode=remote`, las llamadas de la CLI podrían estar apuntando al remoto mientras su servicio local está bien.
    - Las llamadas explícitas de `--url` no recurren a las credenciales almacenadas.

    Firmas comunes:

    - `gateway connect failed:` → destino de URL incorrecto.
    - `unauthorized` → endpoint accesible pero con autenticación incorrecta.

  </Accordion>
  <Accordion title="2. Las salvaguardas de enlace y autenticación son más estrictas">
    ```bash
    openclaw config get gateway.bind
    openclaw config get gateway.auth.mode
    openclaw config get gateway.auth.token
    openclaw gateway status
    openclaw logs --follow
    ```

    Qué comprobar:

    - Los enlaces que no son de bucle local (`lan`, `tailnet`, `custom`) necesitan una ruta de autenticación de gateway válida: autenticación de token compartido/contraseña, o un despliegue `trusted-proxy` que no sea de bucle local configurado correctamente.
    - Las claves antiguas como `gateway.token` no reemplazan a `gateway.auth.token`.

    Firmas comunes:

    - `refusing to bind gateway ... without auth` → enlace no bucle local sin una ruta de autenticación de gateway válida.
    - `Connectivity probe: failed` mientras el runtime está en ejecución → gateway activo pero inaccesible con la autenticación/url actual.

  </Accordion>
  <Accordion title="3. El estado del emparejamiento y la identidad del dispositivo ha cambiado">
    ```bash
    openclaw devices list
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    openclaw doctor
    ```

    Qué comprobar:

    - Aprobaciones de dispositivos pendientes para dashboard/nodos.
    - Aprobaciones de emparejamiento DM pendientes después de cambios de política o identidad.

    Firmas comunes:

    - `device identity required` → autenticación de dispositivo no satisfecha.
    - `pairing required` → remitente/dispositivo debe ser aprobado.

  </Accordion>
</AccordionGroup>

Si la configuración del servicio y el runtime aún no coinciden después de las comprobaciones, reinstale los metadatos del servicio desde el mismo perfil/directorio de estado:

```bash
openclaw gateway install --force
openclaw gateway restart
```

Relacionado:

- [Autenticación](/es/gateway/authentication)
- [Herramienta de ejecución en segundo plano y de proceso](/es/gateway/background-process)
- [Emparejamiento propiedad del Gateway](/es/gateway/pairing)

## Relacionado

- [Doctor](/es/gateway/doctor)
- [Preguntas frecuentes](/es/help/faq)
- [Manual de procedimientos del Gateway](/es/gateway)
