---
summary: "Referencia de la CLI para `openclaw doctor` (comprobaciones de estado + reparaciones guiadas)"
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

## Ejemplos

```bash
openclaw doctor
openclaw doctor --repair
openclaw doctor --deep
openclaw doctor --repair --non-interactive
openclaw doctor --generate-gateway-token
```

Para permisos específicos del canal, utilice los sondas del canal en lugar de `doctor`:

```bash
openclaw channels capabilities --channel discord --target channel:<channel-id>
openclaw channels status --probe
```

El sonda de capacidades específicas de Discord informa los permisos efectivos del canal del bot; el sonda de estado audita los canales de Discord configurados y los objetivos de unión automática de voz.

## Opciones

- `--no-workspace-suggestions`: desactivar las sugerencias de memoria/búsqueda del espacio de trabajo
- `--yes`: aceptar los valores predeterminados sin preguntar
- `--repair`: aplicar las reparaciones recomendadas que no sean del servicio sin preguntar; las instalaciones y reescrituras del servicio de puerta de enlace todavía requieren confirmación interactiva o comandos explícitos de la puerta de enlace
- `--fix`: alias para `--repair`
- `--force`: aplicar reparaciones agresivas, incluyendo sobrescribir la configuración personalizada del servicio cuando sea necesario
- `--non-interactive`: ejecutar sin avisos; solo migraciones seguras y reparaciones que no sean del servicio
- `--generate-gateway-token`: generar y configurar un token de la puerta de enlace
- `--deep`: escanear los servicios del sistema para buscar instalaciones adicionales de la puerta de enlace e informar las transferencias de reinicio recientes del supervisor de la puerta de enlace

Notas:

- En el modo Nix (`OPENCLAW_NIX_MODE=1`), las comprobaciones de solo lectura del doctor siguen funcionando, pero `doctor --fix`, `doctor --repair`, `doctor --yes` y `doctor --generate-gateway-token` están desactivadas porque `openclaw.json` es inmutable. Edite la fuente de Nix para esta instalación en su lugar; para nix-openclaw, utilice el [Inicio rápido](https://github.com/openclaw/nix-openclaw#quick-start) con prioridad de agente.
- Las indicaciones interactivas (como las correcciones de llavero/OAuth) solo se ejecutan cuando stdin es una TTY y `--non-interactive` **no** está establecido. Las ejecuciones sin interfaz gráfica (cron, Telegram, sin terminal) omitirán las indicaciones.
- Rendimiento: las ejecuciones no interactivas de `doctor` omiten la carga diligente de complementos para que las comprobaciones de salud sin interfaz gráfica sigan siendo rápidas. Las sesiones interactivas aún cargan completamente los complementos cuando una comprobación necesita su contribución.
- `--fix` (alias para `--repair`) escribe una copia de seguridad en `~/.openclaw/openclaw.json.bak` y elimina las claves de configuración desconocidas, enumerando cada eliminación.
- `doctor --fix --non-interactive` informa sobre las definiciones de servicio de puerta de enlace faltantes o obsoletas, pero no las instala ni las reescribe fuera del modo de reparación de actualización. Ejecute `openclaw gateway install` para un servicio faltante, o `openclaw gateway install --force` cuando intencionalmente desee reemplazar el iniciador.
- Las comprobaciones de integridad del estado ahora detectan archivos de transcripción huérfanos en el directorio de sesiones. Archivarlos como `.deleted.<timestamp>` requiere una confirmación interactiva; las ejecuciones de `--fix`, `--yes` y sin interfaz gráfica los dejan en su lugar.
- Doctor también escanea `~/.openclaw/cron/jobs.json` (o `cron.store`) en busca de formas de trabajos cron heredadas y puede reescribirlas en su lugar antes de que el planificador tenga que normalizarlas automáticamente en tiempo de ejecución.
- En Linux, doctor avisa cuando el crontab del usuario todavía ejecuta el `~/.openclaw/bin/ensure-whatsapp.sh` heredado; ese script ya no se mantiene y puede registrar falsas interrupciones de la puerta de enlace de WhatsApp cuando cron carece del entorno del bus de usuario de systemd.
- Cuando WhatsApp está habilitado, doctor comprueba si hay un bucle de eventos de la puerta de enlace degradado con clientes locales `openclaw-tui` aún en ejecución. `doctor --fix` detiene solo los clientes TUI locales verificados para que las respuestas de WhatsApp no se pongan en cola detrás de bucles de actualización de TUI obsoletos.
- Doctor reescribe las referencias de modelo `openai-codex/*` heredadas a referencias `openai/*` canónicas en todos los modelos principales, alternativas, anulaciones de latido/subagente/compresión, ganchos, anulaciones de modelo de canal y pines de ruta de sesión obsoletos. `--fix` preserva la política explícita de proveedor/modelo `agentRuntime`, elimina los pines de tiempo de ejecución obsoletos de agente/sesión completos y deja referencias de agente OpenAI canónicas en el arnés Codex predeterminado cuando se utiliza el proveedor oficial de OpenAI.
- Doctor limpia el estado de preparación de dependencias de complementos heredados creado por versiones anteriores de OpenClaw. También repara los complementos descargables faltantes que están referenciados por la configuración, como `plugins.entries`, canales configurados, configuraciones de proveedor/búsqueda o tiempos de ejecución del agente configurados. Durante las actualizaciones de paquetes, doctor omite la reparación de complementos del gestor de paquetes hasta que se complete el intercambio de paquetes; vuelva a ejecutar `openclaw doctor --fix` después si un complemento configurado todavía necesita recuperación. Si la descarga falla, doctor informa el error de instalación y preserva la entrada del complemento configurado para el próximo intento de reparación.
- Doctor repara la configuración obsoleta del complemento eliminando los IDs de complementos faltantes de `plugins.allow`/`plugins.entries`, además de hacer coincidir la configuración colgante del canal, los objetivos de latido y las anulaciones del modelo del canal cuando el descubrimiento de complementos es saludable.
- Doctor pone en cuarentena la configuración inválida del complemento deshabilitando la entrada `plugins.entries.<id>` afectada y eliminando su carga útil `config` inválida. El inicio de la puerta de enlace ya omite solo ese complemento defectuoso para que otros complementos y canales puedan seguir ejecutándose.
- Establezca `OPENCLAW_SERVICE_REPAIR_POLICY=external` cuando otro supervisor sea el propietario del ciclo de vida de la puerta de enlace. Doctor aún informa el estado de la puerta de enlace/servicio y aplica reparaciones que no son del servicio, pero omite la instalación/inicio/reinicio/inicialización del servicio y la limpieza del servicio heredado.
- En Linux, doctor ignora las unidades systemd extra similares a la puerta de enlace inactivas y no reescribe los metadatos de comando/punto de entrada para un servicio systemd de puerta de enlace en ejecución durante la reparación. Detenga el servicio primero o use `openclaw gateway install --force` cuando intencionalmente desee reemplazar el lanzador activo.
- Doctor migra automáticamente la configuración heredada plana de Talk (`talk.voiceId`, `talk.modelId`, y amigos) a `talk.provider` + `talk.providers.<provider>`.
- Las ejecuciones repetidas de `doctor --fix` ya no informan/aplican la normalización de Talk cuando la única diferencia es el orden de las claves del objeto.
- Doctor incluye una verificación de preparación de búsqueda de memoria y puede recomendar `openclaw configure --section model` cuando faltan las credenciales de incrustación.
- Doctor advierte cuando no hay ningún propietario de comandos configurado. El propietario del comando es la cuenta del operador humano autorizado para ejecutar comandos solo para el propietario y aprobar acciones peligrosas. El emparejamiento por MD solo permite que alguien hable con el bot; si aprobaste un remitente antes de que existiera el arranque del primer propietario, establece `commands.ownerAllowFrom` explícitamente.
- Doctor advierte cuando los agentes en modo Codex están configurados y existen activos personales de la CLI de Codex en el directorio de inicio de Codex del operador. Los lanzamientos locales del servidor de aplicaciones Codex utilizan directorios de inicio aislados por agente, por lo que usa `openclaw migrate codex --dry-run` para inventariar los activos que deben promocionarse deliberadamente.
- Doctor elimina `plugins.entries.codex.config.codexDynamicToolsProfile` retirados; el servidor de aplicaciones Codex siempre mantiene las herramientas de espacio de trabajo nativas de Codex como nativas.
- Doctor advierte cuando las habilidades permitidas para el agente predeterminado no están disponibles en el entorno de ejecución actual porque faltan binarios, variables de entorno, configuración o requisitos del sistema operativo. `doctor --fix` puede desactivar esas habilidades no disponibles con `skills.entries.<skill>.enabled=false`; instala o configura el requisito faltante en su lugar cuando quieras mantener la habilidad activa.
- Si el modo sandbox está habilitado pero Docker no está disponible, doctor informa una advertencia de alta señal con remedio (`install Docker` o `openclaw config set agents.defaults.sandbox.mode off`).
- Si existen archivos de registro de sandbox heredados (`~/.openclaw/sandbox/containers.json` o `~/.openclaw/sandbox/browsers.json`), doctor los informa; `openclaw doctor --fix` migra las entradas válidas a directorios de registro fragmentados y pone en cuarentena los archivos heredados no válidos.
- Si `gateway.auth.token`/`gateway.auth.password` están gestionados por SecretRef y no están disponibles en la ruta de comando actual, doctor informa una advertencia de solo lectura y no escribe credenciales de respaldo en texto plano.
- Si la inspección de SecretRef del canal falla en una ruta de reparación, doctor continúa e informa una advertencia en lugar de salir antes de tiempo.
- Después de las migraciones del directorio de estado, doctor advierte cuando las cuentas predeterminadas de Telegram o Discord habilitadas dependen del respaldo del entorno y `TELEGRAM_BOT_TOKEN` o `DISCORD_BOT_TOKEN` no están disponibles para el proceso doctor.
- La autorresolución del nombre de usuario de Telegram `allowFrom` (`doctor --fix`) requiere un token de Telegram resoluble en la ruta de comandos actual. Si la inspección del token no está disponible, doctor emite una advertencia y omite la autorresolución para ese paso.

## macOS: `launchctl` invalidaciones de entorno

Si anteriormente ejecutó `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (o `...PASSWORD`), ese valor anula su archivo de configuración y puede causar errores persistentes de "no autorizado".

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## Relacionado

- [Referencia de CLI](/es/cli)
- [Gateway doctor](/es/gateway/doctor)
