---
summary: "Manual de procedimientos de solución de problemas profundos para gateway, canales, automatización, nodos y navegador"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "Solución de problemas"
sidebarTitle: "Solución de problemas"
---

Esta página es el manual de procedimientos detallado. Comience en [/help/troubleshooting](/es/help/troubleshooting) si desea primero el flujo de triaje rápido.

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
- `openclaw doctor` informa que no hay problemas de configuración/servicio que bloqueen.
- `openclaw channels status --probe` muestra el estado del transporte en vivo por cuenta y, donde sea compatible, resultados de sondeo/auditoría como `works` o `audit ok`.

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

- `Update restart` en `openclaw status` / `openclaw status --all`. Las entregas pendientes o
  fallidas incluyen el siguiente comando a ejecutar.
- `plugin load failed: dependency tree corrupted; run openclaw doctor --fix`
  en Canales. Eso significa que la configuración del canal todavía existe, pero el registro
  del complemento falló antes de que el canal pudiera cargarse.
- errores 401 del proveedor después de volver a autenticarse. `openclaw doctor --fix` verifica si existen sombras de autenticación OAuth obsoletas
  por agente y elimina las copias antiguas para que todos los agentes resuelvan
  el perfil compartido actual.

## Instalaciones con cerebro dividido y protección de configuración más reciente

Use esto cuando un servicio de gateway se detiene inesperadamente después de una actualización, o los registros muestran que un binario `openclaw` es más antiguo que la versión que escribió por última vez `openclaw.json`.

OpenClaw estampa las escrituras de configuración con `meta.lastTouchedVersion`. Los comandos de solo lectura aún pueden inspeccionar una configuración escrita por un OpenClaw más reciente, pero las mutaciones de procesos y servicios se niegan a continuar desde un binario más antiguo. Las acciones bloqueadas incluyen el inicio, detención, reinicio, desinstalación, reinstalación forzada del servicio, inicio del gateway en modo servicio y la limpieza de puertos `gateway --force`.

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
  <Step title="Reinstalar el servicio de puerta de enlace">
    Reinstale el servicio de puerta de enlace deseado desde la instalación más reciente:

    ```bash
    openclaw gateway install --force
    openclaw gateway restart
    ```

  </Step>
  <Step title="Eliminar contenedores obsoletos">
    Elimine paquetes del sistema obsoletos o entradas de contenedor antiguas que aún apunten a un binario `openclaw` antiguo.
  </Step>
</Steps>

<Warning>Solo para una degradación intencional o recuperación de emergencia, establezca `OPENCLAW_ALLOW_OLDER_BINARY_DESTRUCTIVE_ACTIONS=1` para el comando único. Déjelo sin establecer para el funcionamiento normal.</Warning>

## Incompatibilidad de protocolo después de la reversión

Use esto cuando los registros sigan imprimiendo `protocol mismatch` después de degradar o revertir OpenClaw. Esto significa que se está ejecutando una versión anterior de Gateway, pero un proceso de cliente local más reciente todavía está intentando reconectarse con un rango de protocolo que la versión anterior de Gateway no puede hablar.

```bash
openclaw --version
which -a openclaw
openclaw gateway status --deep
openclaw doctor --deep
openclaw logs --follow
```

Busque:

- `protocol mismatch ... client=... v<version> min=<n> max=<n> expected=<n>` en los registros de Gateway.
- `Established clients:` en `openclaw gateway status --deep` o `Gateway clients` en `openclaw doctor --deep`. Esto enumera los clientes TCP activos conectados al puerto de Gateway, incluidos los PID y las líneas de comandos cuando el sistema operativo lo permite.
- Un proceso de cliente cuya línea de comandos apunte a la instalación o contenedor de OpenClaw más reciente desde el que se revirtió.

Solución:

1. Detenga o reinicie el proceso obsoleto del cliente OpenClaw que muestra `gateway status --deep`.
2. Reinicie las aplicaciones o contenedores que incrustan OpenClaw, como paneles locales, editores, asistentes de servidores de aplicaciones o shells `openclaw logs --follow` de larga duración.
3. Vuelva a ejecutar `openclaw gateway status --deep` o `openclaw doctor --deep` y confirme que el PID del cliente obsoleto ha desaparecido.

No haga que una versión anterior de Gateway acepte un protocolo más reciente incompatible. Los incrementos de protocolo protegen el contrato del cable; la recuperación por reversión es un problema de limpieza de proceso/versión.

## Enlace simbólico de habilidad omitido como escape de ruta

Use esto cuando los registros incluyan:

```text
Skipping escaped skill path outside its configured root: ... reason=symlink-escape
```

OpenClaw trata cada raíz de habilidad como un límite de contención. Un enlace simbólico bajo `~/.agents/skills`, `<workspace>/.agents/skills`, `<workspace>/skills` o `~/.openclaw/skills` se omite cuando su destino real se resuelve fuera de esa raíz a menos que el destino sea explícitamente confiable.

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

No use objetivos amplios como `~`, `/` o una carpeta completa de proyecto sincronizado. Mantenga `allowSymlinkTargets` limitado a la raíz de habilidad real que contiene directorios `SKILL.md` de confianza.

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

- El modelo Anthropic Opus/Sonnet seleccionado tiene `params.context1m: true`.
- La credencial actual de Anthropic no es elegible para el uso de contexto largo.
- Las solicitudes fallan solo en sesiones largas/ejecuciones de modelo que necesitan la ruta beta de 1M.

Opciones de solución:

<Steps>
  <Step title="Deshabilitar context1m">Deshabilite `context1m` para ese modelo para volver a la ventana de contexto normal.</Step>
  <Step title="Usar una credencial elegible">Use una credencial de Anthropic que sea elegible para solicitudes de contexto largo, o cambie a una clave de API de Anthropic.</Step>
  <Step title="Configurar modelos alternativos">Configure modelos alternativos para que las ejecuciones continúen cuando las solicitudes de contexto largo de Anthropic sean rechazadas.</Step>
</Steps>

Relacionado:

- [Anthropic](/es/providers/anthropic)
- [Uso de tokens y costos](/es/reference/token-use)
- [¿Por qué veo HTTP 429 de Anthropic?](/es/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## El backend local compatible con OpenAI pasa las sondas directas pero las ejecuciones de agentes fallan

Use esto cuando:

- `curl ... /v1/models` funciona
- las llamadas `/v1/chat/completions` directas diminutas funcionan
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

- las llamadas directas diminutas tienen éxito, pero las ejecuciones de OpenClaw fallan solo con indicaciones más grandes
- errores `model_not_found` o 404 aunque el `/v1/chat/completions` directo
  funciona con el mismo ID de modelo básico
- errores del backend sobre `messages[].content` esperando una cadena
- advertencias `incomplete turn detected ... stopReason=stop payloads=0` intermitentes con un backend local compatible con OpenAI
- fallos del backend que aparecen solo con conteos de tokens de indicación más grandes o indicaciones completas del tiempo de ejecución del agente

<AccordionGroup>
  <Accordion title="Firmas comunes">
    - `model_not_found` con un servidor local estilo MLX/vLLM → verifique que `baseUrl` incluya `/v1`, que `api` sea `"openai-completions"` para los backends `/v1/chat/completions` y que `models.providers.<provider>.models[].id` sea el id local desnudo del proveedor. Selecciónelo con el prefijo del proveedor una vez, por ejemplo `mlx/mlx-community/Qwen3-30B-A3B-6bit`; mantenga la entrada del catálogo como `mlx-community/Qwen3-30B-A3B-6bit`.
    - `messages[...].content: invalid type: sequence, expected a string` → el backend rechaza las partes de contenido estructurado de Chat Completions. Solución: configure `models.providers.<provider>.models[].compat.requiresStringContent: true`.
    - `validation.keys` o claves de mensaje permitidas como `["role","content"]` → el backend rechaza los metadatos de reproducción estilo OpenAI en los mensajes de Chat Completions. Solución: configure `models.providers.<provider>.models[].compat.strictMessageKeys: true`.
    - `incomplete turn detected ... stopReason=stop payloads=0` → el backend completó la solicitud de Chat Completions pero no devolvió texto de asistente visible para el usuario en ese turno. OpenClaw reintenta una vez los turnos vacíos compatibles con OpenAI seguros para reproducción; los fallos persistentes generalmente significan que el backend está emitiendo contenido vacío/no textual o suprimiendo el texto de respuesta final.
    - las solicitudes directas diminutas tienen éxito, pero las ejecuciones del agente OpenClaw fallan con bloqueos del backend/modelo (por ejemplo, Gemma en algunas compilaciones `inferrs`) → el transporte de OpenClaw probablemente ya sea correcto; el backend está fallando en la forma del prompt más grande del tiempo de ejecución del agente.
    - los fallos se reducen después de deshabilitar las herramientas, pero no desaparecen → los esquemas de herramientas eran parte de la presión, pero el problema restante sigue siendo la capacidad del modelo/servidor ascendente o un error del backend.

  </Accordion>
  <Accordion title="Opciones de solución">
    1. Establezca `compat.requiresStringContent: true` para backends de Chat Completions que sean solo de cadena.
    2. Establezca `compat.strictMessageKeys: true` para backends de Chat Completions estrictos que solo acepten `role` y `content` en cada mensaje.
    3. Establezca `compat.supportsTools: false` para modelos/backends que no puedan manejar la superficie del esquema de herramientas de OpenClaw de manera fiable.
    4. Reduzca la presión del aviso cuando sea posible: arranque de espacio de trabajo más pequeño, historial de sesión más corto, modelo local más ligero o un backend con mayor compatibilidad con contexto largo.
    5. Si las solicitudes directas diminutas siguen pasando mientras los turnos del agente OpenClaw siguen fallando dentro del backend, trátelo como una limitación del servidor/modelo aguas arriba y presente un informe allí con la forma de carga útil aceptada.
  </Accordion>
</AccordionGroup>

Relacionado:

- [Configuración](/es/gateway/configuration)
- [Modelos locales](/es/gateway/local-models)
- [Endpoints compatibles con OpenAI](/es/gateway/configuration-reference#openai-compatible-endpoints)

## Sin respuestas

Si los canales están activos pero nada responde, verifique el enrutamiento y la política antes de volver a conectar nada.

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
- Discrepancias en la lista de permitidos de canales/grupos.

Firmas comunes:

- `drop guild message (mention required` → mensaje de grupo ignorado hasta la mención.
- `pairing request` → el remitente necesita aprobación.
- `blocked` / `allowlist` → remitente/canal fue filtrado por política.

Relacionado:

- [Solución de problemas de canales](/es/channels/troubleshooting)
- [Grupos](/es/channels/groups)
- [Emparejamiento](/es/channels/pairing)

## Conectividad de la interfaz de usuario de control del panel

Cuando el panel/interfaz de usuario de control no se conecta, valide la URL, el modo de autenticación y las suposiciones de contexto seguro.

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

Busque:

- URL de sonda y URL del panel correctas.
- Discrepancia en el modo de autenticación/token entre el cliente y la puerta de enlace.
- Uso de HTTP donde se requiere identidad del dispositivo.

<AccordionGroup>
  <Accordion title="Conexión / firmas de autenticación">
    - `device identity required` → contexto no seguro o autenticación de dispositivo faltante.
    - `origin not allowed` → el navegador `Origin` no está en `gateway.controlUi.allowedOrigins` (o se está conectando desde un origen de navegador que no es de bucle local sin una lista de permitidos explícita).
    - `device nonce required` / `device nonce mismatch` → el cliente no está completando el flujo de autenticación de dispositivo basado en desafío (`connect.challenge` + `device.nonce`).
    - `device signature invalid` / `device signature expired` → el cliente firmó la carga útil incorrecta (o una marca de tiempo obsoleta) para el handshake actual.
    - `AUTH_TOKEN_MISMATCH` con `canRetryWithDeviceToken=true` → el cliente puede hacer un reintento de confianza con el token de dispositivo en caché.
    - Ese reintento de token en caché reutiliza el conjunto de ámbitos almacenados con el token de dispositivo emparejado. Los llamadores `deviceToken` explícitos / `scopes` explícitos mantienen su conjunto de ámbitos solicitado en su lugar.
    - `AUTH_SCOPE_MISMATCH` → se reconoció el token de dispositivo, pero sus ámbitos aprobados no cubren esta solicitud de conexión; vuelva a emparejar o apruebe el contrato de ámbito solicitado en lugar de rotar un token de puerta de enlace compartido.
    - Fuera de esa ruta de reintento, la precedencia de autenticación de conexión es primero token/contraseña compartido explícito, luego `deviceToken` explícito, luego token de dispositivo almacenado y luego token de inicialización.
    - En la ruta asíncrona de la UI de Control Tailscale Serve, los intentos fallidos para el mismo `{scope, ip}` se serializan antes de que el limitador registre el fallo. Por lo tanto, dos reintentos concurrentes incorrectos del mismo cliente pueden mostrar `retry later` en el segundo intento en lugar de dos desajustes simples.
    - `too many failed authentication attempts (retry later)` de un cliente de bucle local de origen del navegador → los fallos repetidos de ese mismo `Origin` normalizado se bloquean temporalmente; otro origen de localhost usa un depósito separado.
    - `unauthorized` repetidos después de ese reintento → desviación del token compartido/token de dispositivo; actualice la configuración del token y vuelva a aprobar/rotar el token de dispositivo si es necesario.
    - `gateway connect failed:` → objetivo de host/puerto/url incorrecto.

  </Accordion>
</AccordionGroup>

### Mapa rápido de códigos de detalle de autenticación

Use `error.details.code` de la respuesta fallida `connect` para elegir la siguiente acción:

| Código de detalle            | Significado                                                                                                                                                                                                               | Acción recomendada                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | El cliente no envió un token compartido requerido.                                                                                                                                                                        | Pegue/establezca el token en el cliente y vuelva a intentarlo. Para rutas del dashboard: `openclaw config get gateway.auth.token` luego pegue en la configuración del Control UI.                                                                                                                                                                                                             |
| `AUTH_TOKEN_MISMATCH`        | El token compartido no coincide con el token de autenticación de la puerta de enlace.                                                                                                                                     | Si `canRetryWithDeviceToken=true`, permita un reintento de confianza. Los reintentos de token en caché reutilizan los alcances aprobados almacenados; los llamadores explícitos `deviceToken` / `scopes` mantienen los alcances solicitados. Si continúa fallando, ejecute la [lista de verificación de recuperación de desviación de token](/es/cli/devices#token-drift-recovery-checklist). |
| `AUTH_DEVICE_TOKEN_MISMATCH` | El token almacenado en caché por dispositivo está obsoleto o revocado.                                                                                                                                                    | Rote/vuelva a aprobar el token del dispositivo usando la [CLI de dispositivos](/es/cli/devices), luego vuelva a conectar.                                                                                                                                                                                                                                                                     |
| `AUTH_SCOPE_MISMATCH`        | El token del dispositivo es válido, pero su rol/alcances aprobados no cubren esta solicitud de conexión.                                                                                                                  | Vuelva a emparejar el dispositivo o apruebe el contrato de alcance solicitado; no trate esto como una desviación de token compartido.                                                                                                                                                                                                                                                         |
| `PAIRING_REQUIRED`           | La identidad del dispositivo necesita aprobación. Verifique `error.details.reason` para `not-paired`, `scope-upgrade`, `role-upgrade` o `metadata-upgrade`, y use `requestId` / `remediationHint` cuando estén presentes. | Aprobar solicitud pendiente: `openclaw devices list` luego `openclaw devices approve <requestId>`. Las actualizaciones de alcance/rol usan el mismo flujo después de que revise el acceso solicitado.                                                                                                                                                                                         |

<Note>
  Las RPC de backend de bucle directo autenticadas con el token/contraseña compartido de la puerta de enlace no deben depender de la línea base de alcance de dispositivo emparejado de la CLI. Si los subagentes u otras llamadas internas aún fallan con `scope-upgrade`, verifique que quien llama esté usando `client.id: "gateway-client"` y `client.mode: "backend"` y no esté forzando un
  `deviceIdentity` explícito o un token de dispositivo.
</Note>

Verificación de migración de autenticación de dispositivo v2:

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

Si los registros muestran errores de nonce/firma, actualice el cliente de conexión y verifíquelo:

<Steps>
  <Step title="Esperar connect.challenge">El cliente espera el `connect.challenge` emitido por el gateway.</Step>
  <Step title="Firmar el payload">El cliente firma el payload vinculado al desafío.</Step>
  <Step title="Enviar el nonce del dispositivo">El cliente envía `connect.params.device.nonce` con el mismo nonce de desafío.</Step>
</Steps>

Si `openclaw devices rotate` / `revoke` / `remove` se deniega inesperadamente:

- las sesiones de token de dispositivo emparejado solo pueden gestionar **su propio** dispositivo a menos que la persona que llama también tenga `operator.admin`
- `openclaw devices rotate --scope ...` solo puede solicitar ámbitos de operador que la sesión de la persona que llamada ya posee

Relacionado:

- [Configuración](/es/gateway/configuration) (modos de autenticación del gateway)
- [Interfaz de usuario de control](/es/web/control-ui)
- [Dispositivos](/es/cli/devices)
- [Acceso remoto](/es/gateway/remote)
- [Autenticación de proxy de confianza](/es/gateway/trusted-proxy-auth)

## Servicio de gateway no ejecutándose

Use esto cuando el servicio está instalado pero el proceso no se mantiene en ejecución.

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # also scan system-level services
```

Busque:

- `Runtime: stopped` con sugerencias de salida.
- Discrepancia en la configuración del servicio (`Config (cli)` vs `Config (service)`).
- Conflictos de puerto/escucha.
- Instalaciones adicionales de launchd/systemd/schtasks cuando se usa `--deep`.
- Sugerencias de limpieza de `Other gateway-like services detected (best effort)`.

<AccordionGroup>
  <Accordion title="Firmas comunes">
    - `Gateway start blocked: set gateway.mode=local` o `existing config is missing gateway.mode` → el modo de puerta de enlace local no está habilitado, o el archivo de configuración fue sobrescrito y perdió `gateway.mode`. Solución: establezca `gateway.mode="local"` en su configuración, o vuelva a ejecutar `openclaw onboard --mode local` / `openclaw setup` para restablecer la configuración esperada en modo local. Si está ejecutando OpenClaw a través de Podman, la ruta de configuración predeterminada es `~/.openclaw/openclaw.json`.
    - `refusing to bind gateway ... without auth` → enlace que no es de bucle local sin una ruta de autenticación de puerta de enlace válida (token/contraseña, o proxy de confianza donde esté configurado).
    - `another gateway instance is already listening` / `EADDRINUSE` → conflicto de puerto.
    - `Other gateway-like services detected (best effort)` → existen unidades launchd/systemd/schtasks obsoletas o en paralelo. La mayoría de las configuraciones deben mantener una sola puerta de enlace por máquina; si realmente necesita más de una, aislar los puertos + configuración/estado/espacio de trabajo. Consulte [/gateway#multiple-gateways-same-host](/es/gateway#multiple-gateways-same-host).
    - `System-level OpenClaw gateway service detected` del doctor → existe una unidad del sistema systemd mientras falta el servicio a nivel de usuario. Elimine o deshabilite el duplicado antes de permitir que el doctor instale un servicio de usuario, o establezca `OPENCLAW_SERVICE_REPAIR_POLICY=external` si la unidad del sistema es el supervisor previsto.
    - `Gateway service port does not match current gateway config` → el supervisor instalado aún fija el `--port` antiguo. Ejecute `openclaw doctor --fix` o `openclaw gateway install --force`, luego reinicie el servicio de puerta de enlace.

  </Accordion>
</AccordionGroup>

Relacionado:

- [Herramienta de ejecución en segundo plano y de procesos](/es/gateway/background-process)
- [Configuración](/es/gateway/configuration)
- [Doctor](/es/gateway/doctor)

## La puerta de enlace se cierra durante un uso elevado de memoria

Use esto cuando la puerta de enlace desaparece bajo carga, el supervisor informa un reinicio de estilo OOM, o los registros mencionan `critical memory pressure bundle written`.

```bash
openclaw gateway status --deep
openclaw logs --follow
openclaw gateway stability --bundle latest
openclaw gateway diagnostics export
```

Busque:

- `Reason: diagnostic.memory.pressure.critical` en el paquete de estabilidad más reciente.
- `Memory pressure:` con `critical/rss_threshold`, `critical/heap_threshold`, o `critical/rss_growth`.
- Valores de `V8 heap:` cerca del límite del montículo.
- entradas `Largest session files:` como `agents/<agent>/sessions/<session>.jsonl` o `sessions/<session>.jsonl`.
- Contadores de memoria de cgroup de Linux cuando la puerta de enlace se ejecuta dentro de un contenedor o un servicio con límite de memoria.

Firmas comunes:

- `critical memory pressure bundle written` aparece poco antes del reinicio → OpenClaw capturó un paquete de estabilidad previo al OOM. Inspecciónelo con `openclaw gateway stability --bundle latest`.
- `memory pressure: level=critical ... memoryPressureSnapshot=disabled` aparece en los registros de la puerta de enlace → OpenClaw detectó presión de memoria crítica, pero la instantánea de estabilidad previa al OOM está desactivada.
- `Largest session files:` apunta a una ruta de transcripción redactada muy grande → reduzca el historial de sesiones retenido, inspeccione el crecimiento de la sesión o mueva las transcripciones antiguas fuera del almacén activo antes de reiniciar.
- Los bytes `V8 heap:` utilizados están cerca del límite del montón → reduzca la presión del mensaje/sesión, reduzca el trabajo simultáneo o aumente el límite del montón de Node solo después de confirmar que la carga de trabajo es la esperada.
- `Memory pressure: critical/rss_growth` → la memoria creció rápidamente dentro de una ventana de muestreo. Verifique los registros más recientes para ver una importación grande, una salida de herramienta descontrolada, reintentos repetidos o un lote de trabajo de agente en cola.
- Aparece una presión de memoria crítica en los registros, pero no existe ningún paquete → este es el comportamiento predeterminado. Establezca `diagnostics.memoryPressureSnapshot: true` para capturar el paquete de estabilidad previo al OOM en futuros eventos de presión de memoria crítica.

El paquete de estabilidad no tiene carga útil. Incluye evidencia de memoria operativa y rutas de archivo relativas redactadas, no texto de mensaje, cuerpos de webhook, credenciales, tokens, cookies ni identificadores de sesión sin procesar. Adjunte la exportación de diagnósticos a los informes de errores en lugar de copiar los registros sin procesar.

Relacionado:

- [Estado de la puerta de enlace](/es/gateway/health)
- [Exportación de diagnósticos](/es/gateway/diagnostics)
- [Sesiones](/es/cli/sessions)

## La puerta de enlace rechazó una configuración no válida

Use esto cuando el inicio de la puerta de enlace falla con `Invalid config` o los registros de recarga en caliente dicen que omitió una edición no válida.

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
- OpenClaw mantiene los 32 archivos `.clobbered.*` más recientes para cada ruta de configuración y rota los más antiguos

<AccordionGroup>
  <Accordion title="Lo que ocurrió">
    - La configuración no se validó durante el inicio, la recarga en caliente o una escritura propiedad de OpenClaw.
    - El inicio de Gateway falla de forma cerrada en lugar de reescribir `openclaw.json`.
    - La recarga en caliente omite las ediciones externas no válidas y mantiene activa la configuración de tiempo de ejecución actual.
    - Las escrituras propiedad de OpenClaw rechazan las cargas no válidas o destructivas antes de la confirmación y guardan `.rejected.*`.
    - `openclaw doctor --fix` es el propietario de la reparación. Puede eliminar prefijos que no sean JSON o restaurar la copia conocida como buena más reciente mientras preserva la carga rechazada como `.clobbered.*`.
    - Cuando se producen muchas reparaciones para una ruta de configuración, OpenClaw rota los archivos `.clobbered.*` más antiguos para que la carga reparada más reciente siga disponible.

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
    - `.clobbered.*` existe → el doctor conservó una edición externa rota mientras reparaba la configuración activa.
    - `.rejected.*` existe → una escritura de configuración propiedad de OpenClaw falló las verificaciones de esquema o sobrescritura antes de la confirmación.
    - `Config write rejected:` → la escritura intentó eliminar una forma requerida, reducir el archivo drásticamente o persistir una configuración no válida.
    - `config reload skipped (invalid config):` → una edición directa falló la validación y fue ignorada por el Gateway en ejecución.
    - `Invalid config at ...` → el inicio falló antes de que se iniciaran los servicios de Gateway.
    - `missing-meta-vs-last-good`, `gateway-mode-missing-vs-last-good` o `size-drop-vs-last-good:*` → se rechazó una escritura propiedad de OpenClaw porque perdió campos o tamaño en comparación con la copia de seguridad conocida como buena más reciente.
    - `Config last-known-good promotion skipped` → el candidato contenía marcadores de posición de secretos redactados como `***`.

  </Accordion>
  <Accordion title="Opciones de solución">
    1. Ejecute `openclaw doctor --fix` para permitir que doctor repare la configuración con prefijo/sobrescrita o restaure la última configuración buena conocida.
    2. Copie solo las claves deseadas de `.clobbered.*` o `.rejected.*`, luego aplíquelas con `openclaw config set` o `config.patch`.
    3. Ejecute `openclaw config validate` antes de reiniciar.
    4. Si edita manualmente, mantenga la configuración completa de JSON5, no solo el objeto parcial que quería cambiar.
  </Accordion>
</AccordionGroup>

Relacionado:

- [Configuración](/es/cli/config)
- [Configuración: recarga en caliente](/es/gateway/configuration#config-hot-reload)
- [Configuración: validación estricta](/es/gateway/configuration#strict-validation)
- [Doctor](/es/gateway/doctor)

## Advertencias de sondeo de Gateway

Use esto cuando `openclaw gateway probe` alcanza algo, pero todavía imprime un bloque de advertencia.

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

Busque:

- `warnings[].code` y `primaryTargetId` en la salida JSON.
- Si la advertencia trata sobre retorno a SSH, múltiples gateways, alcances faltantes o referencias de autorización sin resolver.

Firmas comunes:

- `SSH tunnel failed to start; falling back to direct probes.` → La configuración de SSH falló, pero el comando todavía intentó los objetivos configurados directos/bucle local.
- `multiple reachable gateways detected` → más de un objetivo respondió. Por lo general, esto significa una configuración intencional de múltiples gateways o oyentes obsoletos/duplicados.
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → la conexión funcionó, pero el RPC detallado está limitado por alcance; empareje la identidad del dispositivo o use credenciales con `operator.read`.
- `Gateway accepted the WebSocket connection, but follow-up read diagnostics failed` → la conexión funcionó, pero el conjunto completo de RPC de diagnóstico se agotó o falló. Trate esto como un Gateway accesible con diagnóstico degradado; compare `connect.ok` y `connect.rpcOk` en la salida de `--json`.
- `Capability: pairing-pending` o `gateway closed (1008): pairing required` → el gateway respondió, pero este cliente todavía necesita emparejamiento/aprobación antes del acceso normal del operador.
- texto de advertencia de SecretRef `gateway.auth.*` / `gateway.remote.*` sin resolver → el material de autenticación no estaba disponible en esta ruta de comando para el objetivo fallido.

Relacionado:

- [Gateway](/es/cli/gateway)
- [Múltiples gateways en el mismo host](/es/gateway#multiple-gateways-same-host)
- [Acceso remoto](/es/gateway/remote)

## Canal conectado, los mensajes no fluyen

Si el estado del canal es conectado pero el flujo de mensajes está muerto, centre su atención en la política, los permisos y las reglas de entrega específicas del canal.

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

Busque:

- Política de MD (`pairing`, `allowlist`, `open`, `disabled`).
- Lista blanca de grupos y requisitos de mención.
- Permisos/alcances faltantes de la API del canal.

Firmas comunes:

- `mention required` → mensaje ignorado por la política de mención de grupo.
- `pairing` / trazas de aprobación pendiente → el remitente no está aprobado.
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → problema de autenticación/permisos del canal.

Relacionado:

- [Solución de problemas del canal](/es/channels/troubleshooting)
- [Discord](/es/channels/discord)
- [Telegram](/es/channels/telegram)
- [WhatsApp](/es/channels/whatsapp)

## Entrega de Cron y heartbeat

Si cron o heartbeat no se ejecutaron o no entregaron, verifique primero el estado del programador y luego el destino de entrega.

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

Busque:

- Cron habilitado y presente el siguiente despertar.
- Estado del historial de ejecuciones del trabajo (`ok`, `skipped`, `error`).
- Motivos de omisión de heartbeat (`quiet-hours`, `requests-in-flight`, `cron-in-progress`, `lanes-busy`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`).

<AccordionGroup>
  <Accordion title="Firmas comunes">
    - `cron: scheduler disabled; jobs will not run automatically` → cron desactivado.
    - `cron: timer tick failed` → error del tick del programador; comprueba los errores de archivo/log/runtime.
    - `heartbeat skipped` con `reason=quiet-hours` → fuera de la ventana de horas activas.
    - `heartbeat skipped` con `reason=empty-heartbeat-file` → `HEARTBEAT.md` existe pero solo contiene líneas en blanco / encabezados markdown, por lo que OpenClaw omite la llamada al modelo.
    - `heartbeat skipped` con `reason=no-tasks-due` → `HEARTBEAT.md` contiene un bloque `tasks:`, pero ninguna de las tareas está programada para este tick.
    - `heartbeat: unknown accountId` → id de cuenta no válido para el destino de entrega del heartbeat.
    - `heartbeat skipped` con `reason=dm-blocked` → el destino del heartbeat se resolvió en un destino estilo DM mientras que `agents.defaults.heartbeat.directPolicy` (o la anulación por agente) está configurado en `block`.

  </Accordion>
</AccordionGroup>

Relacionado:

- [Heartbeat](/es/gateway/heartbeat)
- [Tareas programadas](/es/automation/cron-jobs)
- [Tareas programadas: solución de problemas](/es/automation/cron-jobs#troubleshooting)

## Nodo emparejado, herramienta falla

Si un nodo está emparejado pero las herramientas fallan, aísla el estado en primer plano, los permisos y la aprobación.

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

Busca:

- Nodo en línea con las capacidades esperadas.
- Concesiones de permisos del sistema operativo para cámara/micrófono/ubicación/pantalla.
- Aprobaciones de ejecución y estado de la lista blanca.

Firmas comunes:

- `NODE_BACKGROUND_UNAVAILABLE` → la aplicación del nodo debe estar en primer plano.
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → falta el permiso del sistema operativo.
- `SYSTEM_RUN_DENIED: approval required` → aprobación de ejecución pendiente.
- `SYSTEM_RUN_DENIED: allowlist miss` → comando bloqueado por la lista blanca.

Relacionado:

- [Aprobaciones de ejecución](/es/tools/exec-approvals)
- [Solución de problemas de nodos](/es/nodes/troubleshooting)
- [Nodos](/es/nodes/index)

## Fallo de la herramienta del navegador

Usa esto cuando las acciones de la herramienta del navegador fallan aunque la puerta de enlace en sí esté sana.

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

Busca:

- Si `plugins.allow` está configurado e incluye `browser`.
- Ruta ejecutable válida del navegador.
- Accesibilidad del perfil CDP.
- Disponibilidad local de Chrome para los perfiles `existing-session` / `user`.

<AccordionGroup>
  <Accordion title="Complemento / firmas de ejecutables">
    - `unknown command "browser"` o `unknown command 'browser'` → el complemento del navegador incluido está excluido por `plugins.allow`.
    - herramienta del navegador faltante / no disponible mientras `browser.enabled=true` → `plugins.allow` excluye `browser`, por lo que el complemento nunca se cargó.
    - `Failed to start Chrome CDP on port` → falló el inicio del proceso del navegador.
    - `browser.executablePath not found` → la ruta configurada no es válida.
    - `browser.cdpUrl must be http(s) or ws(s)` → la URL de CDP configurada utiliza un esquema no admitido, como `file:` o `ftp:`.
    - `browser.cdpUrl has invalid port` → la URL de CDP configurada tiene un puerto incorrecto o fuera de rango.
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → la instalación actual de la gateway carece de la dependencia principal del tiempo de ejecución del navegador; reinstale o actualice OpenClaw y luego reinicie la gateway. Las instantáneas ARIA y las capturas de pantalla básicas de la página aún pueden funcionar, pero la navegación, las instantáneas de IA, las capturas de pantalla de elementos con selectores CSS y la exportación de PDF seguirán no disponibles.

  </Accordion>
  <Accordion title="Chrome MCP / firmas de sesión existente">
    - `Could not find DevToolsActivePort for chrome` → la sesión existente de Chrome MCP aún no pudo adjuntarse al directorio de datos del navegador seleccionado. Abra la página de inspección del navegador, habilite la depuración remota, mantenga el navegador abierto, apruebe el primer mensaje de adjuntar y luego reintente. Si no se requiere el estado de inicio de sesión, prefiera el perfil administrado `openclaw`.
    - `No Chrome tabs found for profile="user"` → el perfil de adjuntar de Chrome MCP no tiene pestañas locales de Chrome abiertas.
    - `Remote CDP for profile "<name>" is not reachable` → el punto final CDP remoto configurado no es accesible desde el host de la gateway.
    - `Browser attachOnly is enabled ... not reachable` o `Browser attachOnly is enabled and CDP websocket ... is not reachable` → el perfil de solo adjuntar no tiene un destino accesible, o el punto final HTTP respondió pero aún no se pudo abrir el WebSocket de CDP.

  </Accordion>
  <Accordion title="Element / screenshot / upload signatures">
    - `fullPage is not supported for element screenshots` → solicitud de captura de pantalla mezcló `--full-page` con `--ref` o `--element`.
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → las llamadas de captura de pantalla de Chrome MCP / `existing-session` deben usar captura de página o una `--ref` instantánea, no `--element` CSS.
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → los ganchos de subida de Chrome MCP necesitan referencias de instantánea, no selectores CSS.
    - `existing-session file uploads currently support one file at a time.` → enviar una subida por llamada en los perfiles de Chrome MCP.
    - `existing-session dialog handling does not support timeoutMs.` → los ganchos de diálogo en los perfiles de Chrome MCP no soportan anulaciones de tiempo de espera.
    - `existing-session type does not support timeoutMs overrides.` → omitir `timeoutMs` para `act:type` en los perfiles de sesión existente de `profile="user"` / Chrome MCP, o usar un perfil de navegador administrado/CDP cuando se requiera un tiempo de espera personalizado.
    - `existing-session evaluate does not support timeoutMs overrides.` → omitir `timeoutMs` para `act:evaluate` en los perfiles de sesión existente de `profile="user"` / Chrome MCP, o usar un perfil de navegador administrado/CDP cuando se requiera un tiempo de espera personalizado.
    - `response body is not supported for existing-session profiles yet.` → `responsebody` todavía requiere un navegador administrado o un perfil CDP sin procesar.
    - anulaciones obsoletas de viewport / modo oscuro / configuración regional / sin conexión en perfiles CDP de solo conexión o remotos → ejecutar `openclaw browser stop --browser-profile <name>` para cerrar la sesión de control activa y liberar el estado de emulación Playwright/CDP sin reiniciar toda la puerta de enlace.

  </Accordion>
</AccordionGroup>

Relacionado:

- [Navegador (administrado por OpenClaw)](/es/tools/browser)
- [Solución de problemas del navegador](/es/tools/browser-linux-troubleshooting)

## Si actualizó y algo dejó de funcionar repentinamente

La mayoría de las roturas posteriores a la actualización se deben a una desviación de la configuración o a valores predeterminados más estrictos que ahora se están aplicando.

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
    - Las llamadas explícitas de `--url` no vuelven a las credenciales almacenadas.

    Firmas comunes:

    - `gateway connect failed:` → destino de URL incorrecto.
    - `unauthorized` → endpoint accesible pero autenticación incorrecta.

  </Accordion>
  <Accordion title="2. Las protecciones de enlace y autenticación son más estrictas">
    ```bash
    openclaw config get gateway.bind
    openclaw config get gateway.auth.mode
    openclaw config get gateway.auth.token
    openclaw gateway status
    openclaw logs --follow
    ```

    Qué comprobar:

    - Los enlaces que no son de bucle local (`lan`, `tailnet`, `custom`) necesitan una ruta de autenticación de puerta de enlace válida: autenticación de token/contraseña compartida, o un despliegue de `trusted-proxy` que no sea de bucle local correctamente configurado.
    - Las claves antiguas como `gateway.token` no reemplazan a `gateway.auth.token`.

    Firmas comunes:

    - `refusing to bind gateway ... without auth` → enlace que no es de bucle local sin una ruta de autenticación de puerta de enlace válida.
    - `Connectivity probe: failed` mientras el runtime está ejecutándose → puerta de enlace activa pero inaccesible con la auth/url actual.

  </Accordion>
  <Accordion title="3. El emparejamiento y el estado de identidad del dispositivo han cambiado">
    ```bash
    openclaw devices list
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    openclaw doctor
    ```

    Qué comprobar:

    - Aprobaciones de dispositivos pendientes para el panel/nodos.
    - Aprobaciones de emparejamiento DM pendientes después de cambios de política o identidad.

    Firmas comunes:

    - `device identity required` → autenticación de dispositivo no satisfecha.
    - `pairing required` → el remitente/dispositivo debe ser aprobado.

  </Accordion>
</AccordionGroup>

Si la configuración del servicio y el runtime todavía están en desacuerdo después de las comprobaciones, reinstale los metadatos del servicio desde el mismo directorio de perfil/estado:

```bash
openclaw gateway install --force
openclaw gateway restart
```

Relacionado:

- [Autenticación](/es/gateway/authentication)
- [Herramienta de ejecución en segundo plano y de procesos](/es/gateway/background-process)
- [Emparejamiento propiedad de la puerta de enlace](/es/gateway/pairing)

## Relacionado

- [Doctor](/es/gateway/doctor)
- [Preguntas frecuentes](/es/help/faq)
- [Manual de procedimientos de la puerta de enlace](/es/gateway)
