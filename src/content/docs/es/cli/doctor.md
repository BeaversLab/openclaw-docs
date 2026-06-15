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
openclaw doctor --post-upgrade
openclaw doctor --post-upgrade --json
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
- `--post-upgrade`: ejecuta sondas de compatibilidad de complementos posteriores a la actualización; emite los hallazgos a stdout; sale con el código 1 si hay algún hallazgo de nivel de error
- `--json`: con `--lint`, emite hallazgos JSON en lugar de salida humana; con `--post-upgrade`, emite un sobre JSON legible por máquina (`{ probesRun, findings }`)
- `--severity-min <level>`: con `--lint`, descarta hallazgos por debajo de `info`, `warning` o `error`
- `--skip <id>`: con `--lint`, omite un id de verificación; repite para omitir más de uno
- `--only <id>`: con `--lint`, ejecuta solo un id de verificación; repite para ejecutar un pequeño conjunto seleccionado

## Modo Lint

`openclaw doctor --lint` es la postura de automatización de solo lectura para las verificaciones del doctor.
Utiliza la ruta estructurada de verificación de estado, no solicita y no repara
ni reescribe la configuración/estado. Úselo en CI, scripts de prevuelo y flujos de trabajo de revisión
cuando desee hallazgos legibles por máquina en lugar de indicadores de reparación guiada.
Las opciones de salida de Lint como `--json`, `--severity-min`, `--only` y `--skip`
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

- `0`: sin hallazgos en o por encima del umbral de severidad seleccionado
- `1`: al menos un hallazgo cumple con el umbral seleccionado
- `2`: fallo de comando/tiempo de ejecución antes de que se puedan producir los hallazgos de lint

`--severity-min` controla tanto los hallazgos visibles como el umbral de salida. Por
ejemplo, `openclaw doctor --lint --severity-min error` puede no imprimir ningún hallazgo y
salir `0` incluso cuando existen hallazgos de menor severidad `info` o `warning`.

## Verificaciones de estado estructuradas

Las comprobaciones modernas de doctor usan un pequeño contrato estructurado:

```ts
detect(ctx, scope?) -> HealthFinding[]
repair?(ctx, findings) -> HealthRepairResult
```

`detect()` potencia `doctor --lint`. `repair()` es opcional y solo se considera
por `doctor --fix` / `doctor --repair`. Las comprobaciones que no han migrado a esta
forma continúan usando el flujo de contribución heredado de doctor.

La división es intencional: `detect()` posee el diagnóstico, mientras que `repair()` se encarga de
informar lo que cambió o cambiaría. Los contextos de reparación pueden transportar
solicitudes `dryRun`/`diff`, y los resultados de reparación pueden devolver `diffs` estructurados para
ediciones de configuración/archivo además de `effects` para servicios, procesos, paquetes, estados u otros
efectos secundarios. Eso permite que las comprobaciones convertidas evolucionen hacia `doctor --fix --dry-run`
y el informe de diferencias sin mover la planificación de mutaciones a `detect()`.

`repair()` informa si intentó la reparación solicitada con `status:
"repaired" | "skipped" | "failed"`. Omitted status means `repaired`, por lo que las
comprobaciones de reparación simples solo necesitan devolver cambios. Cuando la reparación devuelve `skipped` o
`failed`, doctor informa el motivo y no ejecuta la validación para esa comprobación.

Después de una reparación estructurada exitosa, doctor vuelve a ejecutar `detect()` con los
hallazgos reparados como ámbito. Las comprobaciones pueden usar hallazgos seleccionados, rutas o valores `ocPath`
para una validación enfocada. Si el hallazgo aún está presente, doctor informa una
advertencia de reparación en lugar de tratar el cambio como completado silenciosamente.

Un hallazgo incluye:

| Campo             | Propósito                                                              |
| ----------------- | ---------------------------------------------------------------------- |
| `checkId`         | Id estable para filtros de omisión/solo y listas permitidas de CI.     |
| `severity`        | `info`, `warning` o `error`.                                           |
| `message`         | Declaración del problema legible por humanos.                          |
| `path`            | Ruta de configuración, archivo o lógica cuando está disponible.        |
| `line` / `column` | Ubicación de origen cuando está disponible.                            |
| `ocPath`          | Dirección `oc://` precisa cuando una comprobación puede señalar a una. |
| `fixHint`         | Acción sugerida para el operador o resumen de la reparación.           |

Esta versión registra las comprobaciones principales del doctor modernizadas en la ruta de salud estructurada. La subruta `openclaw/plugin-sdk/health` expone el mismo contrato para los consumidores de seguimiento incluidos, pero las comprobaciones respaldadas por complementos solo se ejecutan después de que su paquete propietario las registre en la ruta de comandos activa.

## Selección de comprobaciones

Use `--only` y `--skip` cuando un flujo de trabajo desee una puerta enfocada:

```bash
openclaw doctor --lint --only core/doctor/gateway-config --json
openclaw doctor --lint --skip core/doctor/skills-readiness
```

`--only` y `--skip` aceptan IDs de comprobación completos y pueden repetirse. Si un ID de `--only` no está registrado, no se ejecuta ninguna comprobación para ese ID; use los campos `checksRun` y `checksSkipped` del comando para verificar que una puerta enfocada esté seleccionando las comprobaciones que espera.

## Modo posterior a la actualización

`openclaw doctor --post-upgrade` ejecuta sondas de compatibilidad de complementos destinadas a encadenarse después de una compilación o actualización. Los hallazgos se emiten a stdout; el comando sale con el código 1 si algún hallazgo tiene `level: "error"`. Agregue `--json` para recibir un sobre legible por máquina (`{ probesRun, findings }`) adecuado para CI, la habilidad `fork-upgrade` de la comunidad y otras herramientas de humo posteriores a la actualización. Si falta el índice de complementos instalados o está mal formado, el modo JSON todavía emite ese sobre con un hallazgo de error `plugin.index_unavailable`.

Notas:

- En modo Nix (`OPENCLAW_NIX_MODE=1`), las comprobaciones del doctor de solo lectura todavía funcionan, pero `doctor --fix`, `doctor --repair`, `doctor --yes` y `doctor --generate-gateway-token` están deshabilitadas porque `openclaw.json` es inmutable. En su lugar, edite la fuente de Nix para esta instalación; para nix-openclaw, use el [Inicio rápido] con prioridad de agente(https://github.com/openclaw/nix-openclaw#quick-start).
- Las indicaciones interactivas (como las correcciones de llavero/OAuth) solo se ejecutan cuando stdin es un TTY y `--non-interactive` **no** está configurado. Las ejecuciones sin cabeza (cron, Telegram, sin terminal) omitirán las indicaciones.
- Rendimiento: las ejecuciones no interactivas de `doctor` omiten la carga ansiosa de complementos para que las comprobaciones de salud sin cabeza sigan siendo rápidas. Las sesiones interactivas del doctor todavía cargan las superficies de los complementos necesarias para el flujo de salud y reparación heredado.
- `--lint` es más estricto que `--non-interactive`: es siempre de solo lectura, nunca solicita entrada y nunca aplica migraciones seguras. Ejecute `doctor --fix` o `doctor --repair` cuando desee que doctor realice cambios.
- De forma predeterminada, doctor no ejecuta SecretRefs de `exec` mientras comprueba los secretos. Use `openclaw doctor --allow-exec` o `openclaw doctor --lint --allow-exec` solo cuando desee intencionalmente que doctor ejecute esos resolvedores de secretos configurados.
- `--fix` (alias para `--repair`) escribe una copia de seguridad en `~/.openclaw/openclaw.json.bak` y descarta las claves de configuración desconocidas, listando cada eliminación.
- Las comprobaciones de salud modernizadas pueden exponer una ruta `repair()` para `doctor --fix`; las comprobaciones que no exponen una continúan a través del flujo de reparación del doctor existente.
- `doctor --fix --non-interactive` informa las definiciones de servicio de puerta de enlace faltantes o obsoletas, pero no las instala ni las reescribe fuera del modo de reparación de actualización. Ejecute `openclaw gateway install` para un servicio faltante, o `openclaw gateway install --force` cuando desee intencionalmente reemplazar el lanzador.
- Las comprobaciones de integridad del estado ahora detectan archivos de transcripción huérfanos en el directorio de sesiones. Archivarlos como `.deleted.<timestamp>` requiere una confirmación interactiva; las ejecuciones de `--fix`, `--yes` y sin cabeza los dejan en su lugar.
- Doctor también escanea `~/.openclaw/cron/jobs.json` (o `cron.store`) en busca de formas de trabajos cron heredadas y las reescribe antes de importar filas canónicas a SQLite.
- Doctor informa los trabajos cron con anulaciones explícitas de `payload.model`, incluidos los recuentos de espacios de nombres del proveedor y las discordancias con `agents.defaults.model`, de modo que los trabajos programados que no heredan el modelo predeterminado sean visibles durante las investigaciones de autenticación o facturación.
- En Linux, doctor advierte cuando el crontab del usuario todavía ejecuta `~/.openclaw/bin/ensure-whatsapp.sh` heredado; ese script ya no se mantiene y puede registrar falsas interrupciones de la puerta de enlace de WhatsApp cuando cron carece del entorno de bus de usuario de systemd.
- Cuando WhatsApp está habilitado, doctor verifica un bucle de eventos de la puerta de enlace degradado con clientes `openclaw-tui` locales aún en ejecución. `doctor --fix` detiene solo los clientes TUI locales verificados para que las respuestas de WhatsApp no se pongan en cola detrás de bucles de actualización de TUI obsoletos.
- Doctor reescribe las referencias de modelo `openai-codex/*` heredadas a referencias canónicas `openai/*` en todos los modelos principales, alternativas, modelos de generación de imagen/video, anulaciones de heartbeat/subagente/compacción, hooks, anulaciones de modelo de canal y pines de ruta de sesión obsoletos. `--fix` también migra los perfiles de autenticación `openai-codex:*` heredados y las entradas `auth.order.openai-codex` a `openai:*`, mueve la intención de Codex a entradas `agentRuntime.id: "codex"` con alcance de proveedor/modelo, elimina los pines de tiempo de ejecución de todo el agente/sesión obsoletos y mantiene las referencias de agente OpenAI reparadas en el enrutamiento de autenticación de Codex en lugar de la autenticación directa con clave de API de OpenAI.
- Doctor limpia el estado de preparación de dependencias de complementos heredado creado por versiones anteriores de OpenClaw y vuelve a vincular el paquete host `openclaw` para complementos npm administrados que lo declaran como una dependencia entre pares. También repara los complementos descargables faltantes que son referenciados por la configuración, como `plugins.entries`, canales configurados, configuraciones de proveedor/búsqueda configuradas o tiempos de ejecución de agente configurados. Durante las actualizaciones de paquetes, doctor omite la reparación de complementos del administrador de paquetes hasta que se complete el intercambio de paquetes; vuelva a ejecutar `openclaw doctor --fix` después si un complemento configurado aún necesita recuperación. Si la descarga falla, doctor informa el error de instalación y preserva la entrada del complemento configurado para el siguiente intento de reparación.
- Doctor repara la configuración obsoleta de complementos eliminando los ids de complementos faltantes de `plugins.allow`/`plugins.deny`/`plugins.entries`, además de la configuración del canal colgante coincidente, objetivos de heartbeat y anulaciones de modelo de canal cuando el descubrimiento de complementos es correcto.
- Doctor pone en cuarentena la configuración no válida del complemento deshabilitando la entrada `plugins.entries.<id>` afectada y eliminando su carga útil `config` no válida. El inicio de la puerta de enlace ya omite solo ese complemento defectuoso para que otros complementos y canales puedan seguir ejecutándose.
- Establezca `OPENCLAW_SERVICE_REPAIR_POLICY=external` cuando otro supervisor sea el propietario del ciclo de vida de la puerta de enlace. Doctor todavía informa sobre el estado de la puerta de enlace/servicio y aplica reparaciones que no son del servicio, pero omite la instalación/inicio/reinicio/inicialización del servicio y la limpieza del servicio heredado.
- En Linux, doctor ignora las unidades systemd adicionales similares a la puerta de enlace inactivas y no reescribe los metadatos de comando/punto de entrada para un servicio de puerta de enlace systemd en ejecución durante la reparación. Detenga el servicio primero o use `openclaw gateway install --force` cuando intencionalmente desee reemplazar el iniciador activo.
- Doctor migra automáticamente la configuración plana heredada de Talk (`talk.voiceId`, `talk.modelId`, y amigos) a `talk.provider` + `talk.providers.<provider>`.
- Las ejecuciones repetidas de `doctor --fix` ya no informan/aplican la normalización de Talk cuando la única diferencia es el orden de las claves del objeto.
- Doctor incluye una verificación de preparación de búsqueda de memoria y puede recomendar `openclaw configure --section model` cuando faltan las credenciales de incrustación.
- Doctor advierte cuando no se configura ningún propietario del comando. El propietario del comando es la cuenta del operador humano autorizada para ejecutar comandos solo para propietarios y aprobar acciones peligrosas. El emparejamiento por DM solo permite que alguien hable con el bot; si aprobó un remitente antes de que existiera la inicialización del primer propietario, configure `commands.ownerAllowFrom` explícitamente.
- Doctor informa una nota de información cuando los agentes en modo Codex están configurados y existen activos personales de CLI de Codex en el directorio de inicio de Codex del operador. Los lanzamientos locales del servidor de aplicaciones de Codex utilizan directorios de inicio aislados por agente, por lo que instale primero el complemento Codex si es necesario, y luego use `openclaw migrate plan codex` para inventariar los activos que deben promoverse deliberadamente.
- Doctor elimina `plugins.entries.codex.config.codexDynamicToolsProfile` retirados; el servidor de aplicaciones de Codex siempre mantiene las herramientas nativas del espacio de trabajo nativas de Codex.
- Doctor advierte cuando las habilidades permitidas para el agente predeterminado no están disponibles en el entorno de ejecución actual porque faltan bins, vars de entorno, config o requisitos del SO. `doctor --fix` puede deshabilitar esas habilidades no disponibles con `skills.entries.<skill>.enabled=false`; instale/configure el requisito faltante en su lugar cuando desee mantener la habilidad activa.
- Si el modo sandbox está habilitado pero Docker no está disponible, doctor informa una advertencia de alta señal con reparación (`install Docker` o `openclaw config set agents.defaults.sandbox.mode off`).
- Si están presentes los archivos de registro heredados de sandbox (`~/.openclaw/sandbox/containers.json` o `~/.openclaw/sandbox/browsers.json`), doctor los informa; `openclaw doctor --fix` migra las entradas válidas a directorios de registro fragmentados y pone en cuarentena los archivos heredados no válidos.
- Si `gateway.auth.token`/`gateway.auth.password` son gestionados por SecretRef y no están disponibles en la ruta de comando actual, doctor informa una advertencia de solo lectura y no escribe credenciales de respaldo en texto plano. Para SecretRefs respaldados por exec, doctor omite la ejecución a menos que `--allow-exec` esté presente.
- Si la inspección de SecretRef del canal falla en una ruta de reparación, doctor continúa e informa una advertencia en lugar de salir antes de tiempo.
- Después de las migraciones del directorio de estado, doctor advierte cuando las cuentas predeterminadas de Telegram o Discord habilitadas dependen del respaldo de env y `TELEGRAM_BOT_TOKEN` o `DISCORD_BOT_TOKEN` no están disponibles para el proceso doctor.
- La autoresolución del nombre de usuario `allowFrom` de Telegram (`doctor --fix`) requiere un token de Telegram resoluble en la ruta de comando actual. Si la inspección del token no está disponible, doctor informa una advertencia y omite la autoresolución para ese paso.

## macOS: `launchctl` anulaciones de env

Si anteriormente ejecutó `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (o `...PASSWORD`), ese valor anula su archivo de configuración y puede causar errores persistentes de "no autorizado".

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## Relacionado

- [Referencia de CLI](/es/cli)
- [Doctor de puerta de enlace](/es/gateway/doctor)
