---
summary: "Referencia de CLI para `openclaw doctor` (comprobaciones de salud + reparaciones guiadas)"
read_when:
  - You have connectivity/auth issues and want guided fixes
  - You updated and want a sanity check
title: "Doctor"
---

# `openclaw doctor`

Comprobaciones de estado + soluciones rápidas para la puerta de enlace y los canales.

Relacionado:

- Solución de problemas: [Solución de problemas](/es/gateway/troubleshooting)
- Auditoría de seguridad: [Seguridad](/es/gateway/security)

## Por qué usarlo

`openclaw doctor` es la superficie de salud de OpenClaw. Úselo cuando la puerta de enlace,
canales, complementos, habilidades, enrutamiento de modelos, estado local o migraciones de configuración
no se comporten como se espera y desee un solo comando que pueda explicar qué está
mal.

Doctor tiene tres modos:

| Modo         | Comando                  | Comportamiento                                                                                        |
| ------------ | ------------------------ | ----------------------------------------------------------------------------------------------------- |
| Inspeccionar | `openclaw doctor`        | Verificaciones orientadas a humanos y avisos guiados.                                                 |
| Reparar      | `openclaw doctor --fix`  | Aplica reparaciones admitidas, utilizando avisos a menos que la reparación no interactiva sea segura. |
| Lint         | `openclaw doctor --lint` | Hallazgos estructurados de solo lectura para CI, preflight y puertas de revisión.                     |

Prefiera `--lint` cuando la automatización necesite un resultado estable. Prefiera `--fix` cuando un
operador humano intencionalmente quiere que doctor edite la configuración o el estado.

## Ejemplos

```bash
openclaw doctor
openclaw doctor --lint
openclaw doctor --lint --json
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --allow-exec
openclaw doctor --deep
openclaw doctor --fix
openclaw doctor --fix --non-interactive
openclaw doctor --generate-gateway-token
```

Para permisos específicos del canal, use las sondas del canal en lugar de `doctor`:

```bash
openclaw channels capabilities --channel discord --target channel:<channel-id>
openclaw channels status --probe
```

La sonda de capacidades de Discord dirigida informa los permisos efectivos del canal del bot; la sonda de estado audita los canales de Discord configurados y los objetivos de unión automática de voz.

## Opciones

- `--no-workspace-suggestions`: desactivar las sugerencias de memoria/búsqueda del espacio de trabajo
- `--yes`: aceptar los valores predeterminados sin preguntar
- `--repair`: aplicar reparaciones recomendadas que no sean de servicio sin preguntar; las instalaciones y reescrituras del servicio de puerta de enlace aún requieren confirmación interactiva o comandos explícitos de la puerta de enlace
- `--fix`: alias para `--repair`
- `--force`: aplicar reparaciones agresivas, incluyendo sobrescribir la configuración personalizada del servicio cuando sea necesario
- `--non-interactive`: ejecutar sin avisos; solo migraciones seguras y reparaciones que no sean de servicio
- `--generate-gateway-token`: generar y configurar un token de puerta de enlace
- `--allow-exec`: permitir que doctor ejecute los SecretRefs exec configurados mientras verifica los secretos
- `--deep`: escanear los servicios del sistema en busca de instalaciones adicionales de gateway e informar sobre los traspasos de reinicio recientes del supervisor de Gateway
- `--lint`: ejecutar comprobaciones de salud modernizadas en modo de solo lectura y emitir hallazgos de diagnóstico
- `--json`: con `--lint`, emitir hallazgos JSON en lugar de salida humana
- `--severity-min <level>`: con `--lint`, descartar hallazgos por debajo de `info`, `warning` o `error`
- `--skip <id>`: con `--lint`, omitir un id de comprobación; repetir para omitir más de uno
- `--only <id>`: con `--lint`, ejecutar solo un id de comprobación; repetir para ejecutar un pequeño conjunto seleccionado

## Modo Lint

`openclaw doctor --lint` es la postura de automatización de solo lectura para las comprobaciones de doctor.
Utiliza la ruta estructurada de comprobaciones de salud, no solicita entrada y no repara
ni reescribe la configuración/estado. Úselo en CI, scripts de preflight y flujos de trabajo de revisión
cuando desee hallazgos legibles por máquina en lugar de indicaciones de reparación guiada.
Las opciones de salida de Lint, como `--json`, `--severity-min`, `--only` y `--skip`
solo se aceptan con `--lint`.

```bash
openclaw doctor --lint
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --json
openclaw doctor --lint --allow-exec
openclaw doctor --lint --only core/doctor/gateway-config --json
```

La salida humana es compacta:

```text
doctor --lint: ran 6 check(s), 1 finding(s)
  [warning] core/doctor/gateway-config gateway.mode - gateway.mode is unset; gateway start will be blocked.
    fix: Run `openclaw configure` and set Gateway mode (local/remote), or `openclaw config set gateway.mode local`.
```

La salida JSON es la superficie de scripting para las ejecuciones de lint:

```json
{
  "ok": false,
  "checksRun": 5,
  "checksSkipped": 0,
  "findings": [
    {
      "checkId": "core/doctor/gateway-config",
      "severity": "warning",
      "message": "gateway.mode is unset; gateway start will be blocked.",
      "path": "gateway.mode",
      "fixHint": "Run `openclaw configure` and set Gateway mode (local/remote), or `openclaw config set gateway.mode local`."
    }
  ]
}
```

Comportamiento de salida:

- `0`: sin hallazgos en o por encima del umbral de gravedad seleccionado
- `1`: al menos un hallazgo cumple con el umbral seleccionado
- `2`: fallo de comando/tiempo de ejecución antes de que se puedan producir los hallazgos de lint

`--severity-min` controla tanto los hallazgos visibles como el umbral de salida. Por ejemplo, `openclaw doctor --lint --severity-min error` puede no imprimir ningún hallazgo y salir con `0` incluso cuando existen hallazgos de menor gravedad `info` o `warning`.

## Verificaciones de salud estructuradas

Las verificaciones de doctor modernas utilizan un pequeño contrato estructurado:

```ts
detect(ctx, scope?) -> HealthFinding[]
repair?(ctx, findings) -> HealthRepairResult
```

`detect()` impulsa `doctor --lint`. `repair()` es opcional y solo lo consideran `doctor --fix` / `doctor --repair`. Las verificaciones que no han migrado a esta forma continúan utilizando el flujo de contribución heredado de doctor.

La división es intencional: `detect()` se encarga del diagnóstico, mientras que `repair()` se encarga de informar lo que cambió o cambiaría. Los contextos de reparación pueden llevar solicitudes `dryRun`/`diff`, y los resultados de la reparación pueden devolver `diffs` estructurados para ediciones de configuración/archivo más `effects` para servicios, procesos, paquetes, estado u otros efectos secundarios. Eso permite que las verificaciones convertidas crezcan hacia `doctor --fix --dry-run` y los informes de diferencias sin mover la planificación de mutaciones a `detect()`.

`repair()` informa si intentó la reparación solicitada con `status:
"repaired" | "skipped" | "failed"`. Omitted status means `repaired`, por lo que las verificaciones de reparación simples solo necesitan devolver cambios. Cuando la reparación devuelve `skipped` o `failed`, doctor informa el motivo y no ejecuta la validación para esa verificación.

Después de una reparación estructurada exitosa, doctor vuelve a ejecutar `detect()` con los hallazgos reparados como alcance. Las verificaciones pueden usar hallazgos seleccionados, rutas o valores `ocPath` para una validación enfocada. Si el hallazgo todavía está presente, doctor informa una advertencia de reparación en lugar de tratar el cambio como completado silenciosamente.

Un hallazgo incluye:

| Campo             | Propósito                                                               |
| ----------------- | ----------------------------------------------------------------------- |
| `checkId`         | Id estable para filtros de omisión/solo y listas de permitidos de CI.   |
| `severity`        | `info`, `warning` o `error`.                                            |
| `message`         | Descripción del problema legible por humanos.                           |
| `path`            | Ruta de configuración, archivo o lógica cuando está disponible.         |
| `line` / `column` | Ubicación de origen cuando está disponible.                             |
| `ocPath`          | Dirección precisa de `oc://` cuando una verificación puede señalar una. |
| `fixHint`         | Acción sugerida para el operador o resumen de reparación.               |

Esta versión registra las verificaciones principales del doctor modernizadas en la ruta de salud estructurada. La subruta `openclaw/plugin-sdk/health` expone el mismo contrato para los consumidores de seguimiento incluidos, pero las verificaciones respaldadas por complementos solo se ejecutan después de que su paquete propietario las registra en la ruta de comandos activa.

## Selección de verificación

Use `--only` y `--skip` cuando un flujo de trabajo desee una puerta enfocada:

```bash
openclaw doctor --lint --only core/doctor/gateway-config --json
openclaw doctor --lint --skip core/doctor/skills-readiness
```

`--only` y `--skip` aceptan IDs de verificación completos y pueden repetirse. Si un ID de `--only` no está registrado, no se ejecuta ninguna verificación para ese ID; use los campos `checksRun` y `checksSkipped` del comando para verificar que una puerta enfocada esté seleccionando las verificaciones que espera.

Notas:

- En modo Nix (`OPENCLAW_NIX_MODE=1`), las comprobaciones del doctor de solo lectura aún funcionan, pero `doctor --fix`, `doctor --repair`, `doctor --yes` y `doctor --generate-gateway-token` están deshabilitadas porque `openclaw.json` es inmutable. En su lugar, edite la fuente de Nix para esta instalación; para nix-openclaw, use la [Inicio rápido](https://github.com/openclaw/nix-openclaw#quick-start) centrada en el agente.
- Las indicaciones interactivas (como correcciones de llavero/OAuth) solo se ejecutan cuando stdin es un TTY y `--non-interactive` **no** está configurado. Las ejecuciones sin cabeza (cron, Telegram, sin terminal) omitirán las indicaciones.
- Rendimiento: las ejecuciones de `doctor` no interactivas omiten la carga ansiosa de complementos para que las verificaciones de salud sin cabeza se mantengan rápidas. Las sesiones interactivas del doctor aún cargan las superficies de complemento necesarias para el flujo de salud y reparación heredado.
- `--lint` es más estricto que `--non-interactive`: siempre es de solo lectura, nunca pregunta y nunca aplica migraciones seguras. Ejecute `doctor --fix` o `doctor --repair` cuando desee que doctor realice cambios.
- De manera predeterminada, doctor no ejecuta `exec` SecretRefs mientras verifica los secretos. Use `openclaw doctor --allow-exec` o `openclaw doctor --lint --allow-exec` solo cuando intencionalmente desee que doctor ejecute esos resolutores de secretos configurados.
- `--fix` (alias para `--repair`) escribe una copia de seguridad en `~/.openclaw/openclaw.json.bak` y elimina las claves de configuración desconocidas, listando cada eliminación.
- Las verificaciones de salud modernizadas pueden exponer una ruta `repair()` para `doctor --fix`; las verificaciones que no exponen una continúan a través del flujo de reparación de doctor existente.
- `doctor --fix --non-interactive` informa definiciones de servicio de puerta de enlace faltantes o obsoletas, pero no las instala ni las reescribe fuera del modo de reparación de actualización. Ejecute `openclaw gateway install` para un servicio faltante, o `openclaw gateway install --force` cuando intencionalmente desee reemplazar el iniciador.
- Las verificaciones de integridad del estado ahora detectan archivos de transcripción huérfanos en el directorio de sesiones. Archivarlos como `.deleted.<timestamp>` requiere una confirmación interactiva; `--fix`, `--yes` y las ejecuciones sin cabeza los dejan en su lugar.
- Doctor también escanea `~/.openclaw/cron/jobs.json` (o `cron.store`) en busca de formas de trabajos cron heredadas y puede reescribirlas en su lugar antes de que el planificador tenga que normalizarlas automáticamente en tiempo de ejecución.
- Doctor informa trabajos cron con anulaciones `payload.model` explícitas, incluidos los recuentos de espacios de nombres del proveedor y las discordancias con `agents.defaults.model`, para que los trabajos programados que no heredan el modelo predeterminado sean visibles durante las investigaciones de autenticación o facturación.
- En Linux, doctor advierte cuando el crontab del usuario aún ejecuta `~/.openclaw/bin/ensure-whatsapp.sh` heredado; ese script ya no se mantiene y puede registrar falsas interrupciones de la puerta de enlace de WhatsApp cuando cron carece del entorno de bus de usuario de systemd.
- Cuando WhatsApp está habilitado, doctor comprueba si hay un bucle de eventos de Gateway degradado con clientes locales `openclaw-tui` aún en ejecución. `doctor --fix` detiene solo los clientes locales de TUI verificados para que las respuestas de WhatsApp no se pongan en cola detrás de bucles de actualización de TUI obsoletos.
- El Doctor reescribe las referencias de modelo `openai-codex/*` heredadas a referencias `openai/*` canónicas en los modelos principales, alternativas, modelos de generación de imágenes/vídeo, anulaciones de latido/subagente/compactación, ganchos, anulaciones de modelo de canal y pines de ruta de sesión obsoletos. `--fix` también migra los perfiles de autenticación `openai-codex:*` heredados y las entradas `auth.order.openai-codex` a `openai:*`, mueve la intención de Codex a entradas `agentRuntime.id: "codex"` con ámbito de proveedor/modelo, elimina los pines de tiempo de ejecución obsoletos de todo el agente/sesión y mantiene las referencias de agente OpenAI reparadas en el enrutamiento de autenticación de Codex en lugar de la autenticación directa con la clave API de OpenAI.
- El Doctor limpia el estado de preparación de dependencias de complementos heredado creado por versiones anteriores de OpenClaw y vuelve a vincular el paquete anfitrión `openclaw` para los complementos npm administrados que lo declaran como dependencia entre pares. También repara los complementos descargables faltantes a los que se hace referencia en la configuración, como `plugins.entries`, canales configurados, configuraciones de proveedor/búsqueda configuradas o tiempos de ejecución de agente configurados. Durante las actualizaciones de paquetes, el doctor omite la reparación de complementos del administrador de paquetes hasta que se complete el intercambio de paquetes; vuelva a ejecutar `openclaw doctor --fix` después si un complemento configurado aún necesita recuperación. Si la descarga falla, el doctor informa del error de instalación y preserva la entrada del complemento configurado para el próximo intento de reparación.
- Doctor repara la configuración obsoleta del complemento eliminando los identificadores de complementos faltantes de `plugins.allow`/`plugins.deny`/`plugins.entries`, además de la configuración colgante del canal coincidente, objetivos de latido y anulaciones del modelo de canal cuando el descubrimiento de complementos es saludable.
- Doctor pone en cuarentena la configuración no válida del complemento deshabilitando la entrada `plugins.entries.<id>` afectada y eliminando su carga útil `config` no válida. El inicio de la Gateway ya omite solo ese complemento defectuoso para que otros complementos y canales puedan seguir ejecutándose.
- Establezca `OPENCLAW_SERVICE_REPAIR_POLICY=external` cuando otro supervisor sea el propietario del ciclo de vida de la gateway. Doctor aún informa sobre el estado de la gateway/servicio y aplica reparaciones que no son del servicio, pero omite la instalación/inicio/reinicio/arranque del servicio y la limpieza del servicio heredado.
- En Linux, doctor ignora las unidades systemd adicionales tipo gateway inactivas y no reescribe los metadatos de comando/punto de entrada para un servicio systemd de gateway en ejecución durante la reparación. Detenga el servicio primero o use `openclaw gateway install --force` cuando intencionalmente desee reemplazar el lanzador activo.
- Doctor migra automáticamente la configuración plana heredada de Talk (`talk.voiceId`, `talk.modelId`, y amigos) a `talk.provider` + `talk.providers.<provider>`.
- Las ejecuciones repetidas de `doctor --fix` ya no reportan/aplican la normalización de Talk cuando la única diferencia es el orden de las claves del objeto.
- Doctor incluye una verificación de preparación de búsqueda en memoria y puede recomendar `openclaw configure --section model` cuando faltan las credenciales de incrustación.
- Doctor advierte cuando no se configura ningún propietario del comando. El propietario del comando es la cuenta del operador humano autorizada para ejecutar comandos solo para el propietario y aprobar acciones peligrosas. El emparejamiento de DM solo permite a alguien hablar con el bot; si aprobó un remitente antes de que existiera el arranque del primer propietario, establezca `commands.ownerAllowFrom` explícitamente.
- Doctor informa una nota de información cuando los agentes en modo Codex están configurados y existen activos personales de CLI de Codex en el hogar de Codex del operador. Los lanzamientos locales del servidor de aplicaciones de Codex utilizan hogares aislados por agente, por lo que instale el complemento Codex primero si es necesario, luego use `openclaw migrate plan codex` para inventariar los activos que deben promoverse deliberadamente.
- Doctor elimina `plugins.entries.codex.config.codexDynamicToolsProfile` retirados; el servidor de aplicaciones Codex siempre mantiene las herramientas nativas del espacio de trabajo de Codex como nativas.
- Doctor advierte cuando las habilidades permitidas para el agente predeterminado no están disponibles en el entorno de ejecución actual porque faltan bins, variables de entorno, config o requisitos del sistema operativo. `doctor --fix` puede deshabilitar esas habilidades no disponibles con `skills.entries.<skill>.enabled=false`; en su lugar, instale/configure el requisito faltante cuando desee mantener la habilidad activa.
- Si el modo sandbox está habilitado pero Docker no está disponible, doctor informa una advertencia de alta señal con remedición (`install Docker` o `openclaw config set agents.defaults.sandbox.mode off`).
- Si están presentes archivos de registro heredados de sandbox (`~/.openclaw/sandbox/containers.json` o `~/.openclaw/sandbox/browsers.json`), doctor los informa; `openclaw doctor --fix` migra las entradas válidas a directorios de registro fragmentados y pone en cuarentena los archivos heredados no válidos.
- Si `gateway.auth.token`/`gateway.auth.password` están administrados por SecretRef y no están disponibles en la ruta de comando actual, doctor informa una advertencia de solo lectura y no escribe credenciales de reserva en texto plano. Para SecretResp respaldados por exec, doctor omite la ejecución a menos que `--allow-exec` esté presente.
- Si la inspección del SecretRef del canal falla en una ruta de corrección, doctor continúa e informa una advertencia en lugar de salir anticipadamente.
- Después de las migraciones del directorio de estado, doctor advierte cuando las cuentas predeterminadas de Telegram o Discord habilitadas dependen de la reserva de env y `TELEGRAM_BOT_TOKEN` o `DISCORD_BOT_TOKEN` no está disponible para el proceso doctor.
- La autorresolución del nombre de usuario `allowFrom` de Telegram (`doctor --fix`) requiere un token de Telegram resoluble en la ruta de comando actual. Si la inspección del token no está disponible, doctor informa una advertencia y omite la autorresolución para ese paso.

## macOS: anulaciones de env `launchctl`

Si ejecutó previamente `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (o `...PASSWORD`), ese valor anula su archivo de configuración y puede causar errores persistentes de "no autorizado".

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## Relacionado

- [Referencia de CLI](/es/cli)
- [Doctor de puerta de enlace](/es/gateway/doctor)
