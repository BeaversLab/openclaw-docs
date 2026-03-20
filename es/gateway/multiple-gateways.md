---
summary: "Ejecuta múltiples OpenClaw Gateways en un mismo host (aislamiento, puertos y perfiles)"
read_when:
  - Ejecutar más de un Gateway en la misma máquina
  - Necesitas configuración/estado/puertos aislados por Gateway
title: "Múltiples Gateways"
---

# Múltiples Gateways (mismo host)

La mayoría de las configuraciones deberían usar un solo Gateway porque un único Gateway puede manejar múltiples conexiones de mensajería y agentes. Si necesitas un aislamiento más fuerte o redundancia (por ejemplo, un bot de rescate), ejecuta Gateways separados con perfiles/puertos aislados.

## Lista de verificación de aislamiento (requerido)

- `OPENCLAW_CONFIG_PATH` — archivo de configuración por instancia
- `OPENCLAW_STATE_DIR` — sesiones por instancia, creds, cachés
- `agents.defaults.workspace` — raíz del espacio de trabajo por instancia
- `gateway.port` (o `--port`) — único por instancia
- Los puertos derivados (navegador/lienzo) no deben superponerse

Si se comparten, encontrarás carreras de configuración y conflictos de puertos.

## Recomendado: perfiles (`--profile`)

Los perfiles auto-alcance `OPENCLAW_STATE_DIR` + `OPENCLAW_CONFIG_PATH` y sufijan los nombres de servicio.

```bash
# main
openclaw --profile main setup
openclaw --profile main gateway --port 18789

# rescue
openclaw --profile rescue setup
openclaw --profile rescue gateway --port 19001
```

Servicios por perfil:

```bash
openclaw --profile main gateway install
openclaw --profile rescue gateway install
```

## Guía del bot de rescate

Ejecuta un segundo Gateway en el mismo host con su propio:

- perfil/configuración
- directorio de estado
- espacio de trabajo
- puerto base (más puertos derivados)

Esto mantiene el bot de rescate aislado del bot principal para que pueda depurar o aplicar cambios de configuración si el bot principal está caído.

Espaciado de puertos: deja al menos 20 puertos entre los puertos base para que los puertos derivados de navegador/lienzo/CDP nunca colisionen.

### Cómo instalar (bot de rescate)

```bash
# Main bot (existing or fresh, without --profile param)
# Runs on port 18789 + Chrome CDC/Canvas/... Ports
openclaw onboard
openclaw gateway install

# Rescue bot (isolated profile + ports)
openclaw --profile rescue onboard
# Notes:
# - workspace name will be postfixed with -rescue per default
# - Port should be at least 18789 + 20 Ports,
#   better choose completely different base port, like 19789,
# - rest of the onboarding is the same as normal

# To install the service (if not happened automatically during setup)
openclaw --profile rescue gateway install
```

## Mapeo de puertos (derivado)

Puerto base = `gateway.port` (o `OPENCLAW_GATEWAY_PORT` / `--port`).

- puerto del servicio de control del navegador = base + 2 (solo loopback)
- el host del canvas se sirve en el servidor HTTP del Gateway (mismo puerto que `gateway.port`)
- Los puertos CDP del perfil del navegador se asignan automáticamente desde `browser.controlPort + 9 .. + 108`

Si anulas alguno de estos en la configuración o en el entorno, debes mantenerlos únicos por instancia.

## Notas del navegador/CDP (error común)

- **No** fijes `browser.cdpUrl` a los mismos valores en múltiples instancias.
- Cada instancia necesita su propio puerto de control del navegador y rango CDP (derivado de su puerto de gateway).
- Si necesita puertos CDP explícitos, configure `browser.profiles.<name>.cdpPort` por instancia.
- Chrome remoto: use `browser.profiles.<name>.cdpUrl` (por perfil, por instancia).

## Ejemplo de entorno manual

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/main.json \
OPENCLAW_STATE_DIR=~/.openclaw-main \
openclaw gateway --port 18789

OPENCLAW_CONFIG_PATH=~/.openclaw/rescue.json \
OPENCLAW_STATE_DIR=~/.openclaw-rescue \
openclaw gateway --port 19001
```

## Verificaciones rápidas

```bash
openclaw --profile main status
openclaw --profile rescue status
openclaw --profile rescue browser status
```

import es from "/components/footer/es.mdx";

<es />
