---
summary: "Ejecutar varios Gateways OpenClaw en un solo host (aislamiento, puertos y perfiles)"
read_when:
  - Running more than one Gateway on the same machine
  - You need isolated config/state/ports per Gateway
title: "Múltiples Gateways"
---

# Múltiples Gateways (mismo host)

La mayoría de las configuraciones deberían usar un solo Gateway porque un único Gateway puede manejar múltiples conexiones de mensajería y agentes. Si necesita un aislamiento más fuerte o redundancia (por ejemplo, un robot de rescate), ejecute Gateways separados con perfiles/puertos aislados.

## Lista de verificación de aislamiento (obligatorio)

- `OPENCLAW_CONFIG_PATH` — archivo de configuración por instancia
- `OPENCLAW_STATE_DIR` — sesiones, credenciales y cachés por instancia
- `agents.defaults.workspace` — raíz del espacio de trabajo por instancia
- `gateway.port` (o `--port`) — único por instancia
- Los puertos derivados (navegador/canvas) no deben superponerse

Si estos se comparten, encontrará carreras de configuración y conflictos de puertos.

## Recomendado: perfiles (`--profile`)

Los perfiles tienen ámbito automático `OPENCLAW_STATE_DIR` + `OPENCLAW_CONFIG_PATH` y sufijos de nombres de servicio.

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

## Guía del robot de rescate

Ejecute un segundo Gateway en el mismo host con su propio:

- perfil/configuración
- directorio de estado
- espacio de trabajo
- puerto base (más puertos derivados)

Esto mantiene el robot de rescate aislado del robot principal para que pueda depurar o aplicar cambios de configuración si el robot principal está caído.

Espaciado de puertos: deje al menos 20 puertos entre los puertos base para que los puertos derivados de navegador/canvas/CDP nunca colisionen.

### Cómo instalar (robot de rescate)

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

## Asignación de puertos (derivados)

Puerto base = `gateway.port` (o `OPENCLAW_GATEWAY_PORT` / `--port`).

- puerto del servicio de control del navegador = base + 2 (solo loopback)
- el host de canvas se sirve en el servidor HTTP del Gateway (mismo puerto que `gateway.port`)
- Los puertos CDP del perfil del navegador se asignan automáticamente desde `browser.controlPort + 9 .. + 108`

Si anula alguno de estos en la configuración o en las variables de entorno, debe mantenerlos únicos por instancia.

## Notas sobre navegador/CDP (error común)

- **No** fije `browser.cdpUrl` a los mismos valores en varias instancias.
- Cada instancia necesita su propio puerto de control del navegador y rango CDP (derivado de su puerto de gateway).
- Si necesita puertos CDP explícitos, configure `browser.profiles.<name>.cdpPort` por instancia.
- Chrome remoto: usa `browser.profiles.<name>.cdpUrl` (por perfil, por instancia).

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
