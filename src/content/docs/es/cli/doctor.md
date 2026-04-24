---
summary: "Referencia de CLI para `openclaw doctor` (comprobaciones de estado + reparaciones guiadas)"
read_when:
  - You have connectivity/auth issues and want guided fixes
  - You updated and want a sanity check
title: "doctor"
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

## Opciones

- `--no-workspace-suggestions`: deshabilitar sugerencias de memoria/búsqueda del espacio de trabajo
- `--yes`: aceptar los valores predeterminados sin preguntar
- `--repair`: aplicar las reparaciones recomendadas sin preguntar
- `--fix`: alias para `--repair`
- `--force`: aplicar reparaciones agresivas, incluyendo sobrescribir la configuración personalizada del servicio cuando sea necesario
- `--non-interactive`: ejecutar sin avisos; solo migraciones seguras
- `--generate-gateway-token`: generar y configurar un token de puerta de enlace
- `--deep`: escanear los servicios del sistema en busca de instalaciones adicionales de la puerta de enlace

Notas:

- Las indicaciones interactivas (como las correcciones de llavero/OAuth) solo se ejecutan cuando stdin es un TTY y `--non-interactive` **no** está establecido. Las ejecuciones sin cabeza (cron, Telegram, sin terminal) omitirán las indicaciones.
- Rendimiento: las ejecuciones no interactivas de `doctor` omiten la carga anticipada de complementos para que los controles de salud sin interfaz gráfica sigan siendo rápidos. Las sesiones interactivas cargan completamente los complementos cuando una verificación necesita su contribución.
- `--fix` (alias para `--repair`) escribe una copia de seguridad en `~/.openclaw/openclaw.json.bak` y elimina las claves de configuración desconocidas, enumerando cada eliminación.
- Las comprobaciones de integridad del estado ahora detectan archivos de transcripción huérfanos en el directorio de sesiones y pueden archivarlos como `.deleted.<timestamp>` para recuperar espacio de forma segura.
- Doctor también escanea `~/.openclaw/cron/jobs.json` (o `cron.store`) en busca de formas de trabajos cron heredadas y puede reescribirlas en su lugar antes de que el planificador tenga que normalizarlas automáticamente en tiempo de ejecución.
- Doctor repara las dependencias de tiempo de ejecución de los complementos empaquetados faltantes sin requerir acceso de escritura al paquete OpenClaw instalado. Para instalaciones de npm propiedad de root o unidades systemd endurecidas, configure `OPENCLAW_PLUGIN_STAGE_DIR` en un directorio escribible como `/var/lib/openclaw/plugin-runtime-deps`.
- Doctor migra automáticamente la configuración heredada plana de Talk (`talk.voiceId`, `talk.modelId`, y amigos) a `talk.provider` + `talk.providers.<provider>`.
- Las ejecuciones repetidas de `doctor --fix` ya no reportan ni aplican la normalización de Talk cuando la única diferencia es el orden de las claves del objeto.
- Doctor incluye una comprobación de preparación de búsqueda de memoria y puede recomendar `openclaw configure --section model` cuando faltan las credenciales incrustadas.
- Si el modo sandbox está habilitado pero Docker no está disponible, doctor informa una advertencia de alta señal con una solución (`install Docker` o `openclaw config set agents.defaults.sandbox.mode off`).
- Si `gateway.auth.token`/`gateway.auth.password` están administrados por SecretRef y no están disponibles en la ruta de comando actual, doctor informa una advertencia de solo lectura y no escribe credenciales de reserva en texto plano.
- Si la inspección de SecretRef del canal falla en una ruta de corrección, doctor continúa e informa una advertencia en lugar de salir anticipadamente.
- La auto-resolución del nombre de usuario de Telegram `allowFrom` (`doctor --fix`) requiere un token de Telegram resolvable en la ruta de comandos actual. Si la inspección del token no está disponible, el doctor informa una advertencia y omite la auto-resolución para ese paso.

## macOS: `launchctl` sobrescrituras de entorno

Si anteriormente ejecutaste `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (o `...PASSWORD`), ese valor sobrescribe tu archivo de configuración y puede causar errores persistentes de “no autorizado”.

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```
