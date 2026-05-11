---
summary: "Referencia de CLI para `openclaw doctor` (comprobaciones de estado + reparaciones guiadas)"
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
- Doctor repara las dependencias de tiempo de ejecución del plugin empaquetado que faltan sin escribir en las instalaciones globales empaquetadas. Para instalaciones de npm propiedad de root o unidades de systemd endurecidas, establezca `OPENCLAW_PLUGIN_STAGE_DIR` en un directorio con permisos de escritura como `/var/lib/openclaw/plugin-runtime-deps`; también puede ser una lista de rutas como `/opt/openclaw/plugin-runtime-deps:/var/lib/openclaw/plugin-runtime-deps`, donde las raíces anteriores son capas de búsqueda de solo lectura y la raíz final es el objetivo de reparación.
- Doctor repara la configuración obsoleta del plugin eliminando los IDs de plugins que faltan de `plugins.allow`/`plugins.entries`, además de la configuración colgante del canal coincidente, objetivos de latido y anulaciones del modelo del canal cuando el descubrimiento de plugins es saludable.
- Doctor pone en cuarentena la configuración inválida del plugin deshabilitando la entrada `plugins.entries.<id>` afectada y eliminando su carga útil `config` inválida. El inicio de la puerta de enlace ya omite solo ese plugin defectuoso para que otros plugins y canales puedan seguir ejecutándose.
- Establezca `OPENCLAW_SERVICE_REPAIR_POLICY=external` cuando otro supervisor sea el propietario del ciclo de vida de la puerta de enlace. Doctor todavía informa sobre el estado de la puerta de enlace/servicio y aplica reparaciones que no son del servicio, pero omite la instalación/inicio/reinicio/arranque del servicio y la limpieza del servicio heredado.
- Doctor migra automáticamente la configuración plana heredada de Talk (`talk.voiceId`, `talk.modelId` y amigos) a `talk.provider` + `talk.providers.<provider>`.
- Las ejecuciones repetidas de `doctor --fix` ya no informan ni aplican la normalización de Talk cuando la única diferencia es el orden de las claves del objeto.
- Doctor incluye una verificación de preparación de búsqueda en memoria y puede recomendar `openclaw configure --section model` cuando faltan las credenciales incrustadas.
- Si el modo sandbox está habilitado pero Docker no está disponible, doctor informa una advertencia de alta señal con una solución (`install Docker` o `openclaw config set agents.defaults.sandbox.mode off`).
- Si `gateway.auth.token`/`gateway.auth.password` están gestionados por SecretRef y no están disponibles en la ruta de comandos actual, doctor informa una advertencia de solo lectura y no escribe credenciales de respaldo en texto sin formato.
- Si la inspección del SecretRef del canal falla en una ruta de corrección, doctor continúa e informa una advertencia en lugar de salir anticipadamente.
- La auto-resolución del nombre de usuario de Telegram `allowFrom` (`doctor --fix`) requiere un token de Telegram resoluble en la ruta de comandos actual. Si la inspección del token no está disponible, doctor informa una advertencia y omite la auto-resolución en ese paso.

## macOS: `launchctl` anulaciones de env

Si anteriormente ejecutó `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (o `...PASSWORD`), ese valor anula su archivo de configuración y puede causar errores persistentes de "no autorizado".

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Gateway doctor](/es/gateway/doctor)
