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
```

Notas:

- Las indicaciones interactivas (como las correcciones de llavero/OAuth) solo se ejecutan cuando stdin es un TTY y `--non-interactive` **no** está establecido. Las ejecuciones sin interfaz (cron, Telegram, sin terminal) omitirán las indicaciones.
- `--fix` (alias para `--repair`) escribe una copia de seguridad en `~/.openclaw/openclaw.json.bak` y elimina las claves de configuración desconocidas, listando cada eliminación.
- Las comprobaciones de integridad del estado ahora detectan archivos de transcripciones huérfanas en el directorio de sesiones y pueden archivarlas como `.deleted.<timestamp>` para recuperar espacio de forma segura.
- Doctor también escanea `~/.openclaw/cron/jobs.json` (o `cron.store`) en busca de formas de trabajos cron heredadas y puede reescribirlas in situ antes de que el planificador tenga que normalizarlas automáticamente en tiempo de ejecución.
- Doctor incluye una comprobación de preparación para la búsqueda de memoria y puede recomendar `openclaw configure --section model` cuando faltan las credenciales incrustadas.
- Si el modo sandbox está habilitado pero Docker no está disponible, doctor informa una advertencia de alta señal con una solución (`install Docker` o `openclaw config set agents.defaults.sandbox.mode off`).
- Si `gateway.auth.token`/`gateway.auth.password` están gestionados por SecretRef y no están disponibles en la ruta de comandos actual, doctor informa una advertencia de solo lectura y no escribe credenciales de respaldo en texto plano.

## macOS: `launchctl` anulaciones de entorno

Si anteriormente ejecutó `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (o `...PASSWORD`), ese valor anula su archivo de configuración y puede causar errores persistentes de “no autorizado”.

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

import es from "/components/footer/es.mdx";

<es />
