---
summary: "Ejecuta varios OpenClaw Gateways en un solo host (aislamiento, puertos y perfiles)"
read_when:
  - Running more than one Gateway on the same machine
  - You need isolated config/state/ports per Gateway
title: "Múltiples Gateways"
---

# Múltiples Gateways (mismo host)

La mayoría de las configuraciones deberían usar un solo Gateway porque un único Gateway puede manejar múltiples conexiones de mensajería y agentes. Si necesita un aislamiento más fuerte o redundancia (por ejemplo, un robot de rescate), ejecute Gateways separados con perfiles/puertos aislados.

## Configuración recomendada

Para la mayoría de los usuarios, la configuración más simple de un bot de rescate es:

- mantener el bot principal en el perfil predeterminado
- ejecutar el bot de rescate en `--profile rescue`
- usar un bot de Telegram completamente separado para la cuenta de rescate
- mantener el bot de rescate en un puerto base diferente, como `19789`

Esto mantiene el bot de rescate aislado del bot principal para que pueda depurar o aplicar
cambios de configuración si el bot principal está caído. Deja al menos 20 puertos entre
los puertos base para que los puertos derivados del navegador/canvas/CDP nunca colisionen.

## Inicio rápido del bot de rescate

Usa esto como la ruta predeterminada a menos que tengas una razón fuerte para hacer otra
cosa:

```bash
# Rescue bot (separate Telegram bot, separate profile, port 19789)
openclaw --profile rescue onboard
openclaw --profile rescue gateway install --port 19789
```

Si tu bot principal ya se está ejecutando, eso suele ser todo lo que necesitas.

Durante `openclaw --profile rescue onboard`:

- usa el token de bot de Telegram separado
- mantén el perfil `rescue`
- usa un puerto base al menos 20 más alto que el del bot principal
- acepta el espacio de trabajo de rescate predeterminado a menos que ya gestione uno por tu cuenta

Si la incorporación ya instaló el servicio de rescate para ti, el `gateway install` final
no es necesario.

## Por qué funciona esto

El bot de rescate se mantiene independiente porque tiene su propio:

- perfil/configuración
- directorio de estado
- espacio de trabajo
- puerto base (más los puertos derivados)
- token del bot de Telegram

Para la mayoría de las configuraciones, usa un bot de Telegram completamente separado para el perfil de rescate:

- fácil de mantener solo para operadores
- token de bot y identidad separados
- independiente de la instalación del canal/aplicación del bot principal
- ruta de recuperación simple basada en mensajes directos cuando el bot principal está dañado

## Lo que cambia `--profile rescue onboard`

`openclaw --profile rescue onboard` usa el flujo de incorporación normal, pero escribe
todo en un perfil separado.

En la práctica, eso significa que el bot de rescate obtiene su propio:

- archivo de configuración
- directorio de estado
- espacio de trabajo (por defecto `~/.openclaw/workspace-rescue`)
- nombre del servicio gestionado

Las solicitudes son, por lo demás, las mismas que la incorporación normal.

## Configuración general de múltiples Gateways

La distribución del bot de rescate anterior es el valor predeterminado más fácil, pero el mismo patrón
de aislamiento funciona para cualquier par o grupo de Gateways en un solo host.

Para una configuración más general, asigne a cada Gateway adicional su propio perfil con nombre y su propio puerto base:

```bash
# main (default profile)
openclaw setup
openclaw gateway --port 18789

# extra gateway
openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

Si desea que ambos Gateway usen perfiles con nombre, eso también funciona:

```bash
openclaw --profile main setup
openclaw --profile main gateway --port 18789

openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

Los servicios siguen el mismo patrón:

```bash
openclaw gateway install
openclaw --profile ops gateway install --port 19789
```

Use el inicio rápido de rescue-bot cuando desee un carril de operador de respaldo. Use el patrón de perfil general cuando desee múltiples Gateway de larga duración para diferentes canales, inquilinos, espacios de trabajo u roles operativos.

## Lista de verificación de aislamiento

Mantenga estos elementos únicos por cada instancia de Gateway:

- `OPENCLAW_CONFIG_PATH` — archivo de configuración por instancia
- `OPENCLAW_STATE_DIR` — sesiones por instancia, credenciales, cachés
- `agents.defaults.workspace` — raíz del espacio de trabajo por instancia
- `gateway.port` (o `--port`) — único por instancia
- puertos de navegador/canvas/CDP derivados

Si estos se comparten, encontrará carreras de configuración y conflictos de puertos.

## Asignación de puertos (derivada)

Puerto base = `gateway.port` (o `OPENCLAW_GATEWAY_PORT` / `--port`).

- puerto del servicio de control del navegador = base + 2 (solo loopback)
- el host de canvas se sirve en el servidor HTTP del Gateway (mismo puerto que `gateway.port`)
- Los puertos CDP del perfil del navegador se asignan automáticamente desde `browser.controlPort + 9 .. + 108`

Si anula cualquiera de estos en la configuración o en las variables de entorno, debe mantenerlos únicos por instancia.

## Notas sobre navegador/CDP (problema común)

- **No** fije `browser.cdpUrl` a los mismos valores en varias instancias.
- Cada instancia necesita su propio puerto de control del navegador y su propio rango CDP (derivado de su puerto de gateway).
- Si necesita puertos CDP explícitos, configure `browser.profiles.<name>.cdpPort` por instancia.
- Chrome remoto: use `browser.profiles.<name>.cdpUrl` (por perfil, por instancia).

## Ejemplo de entorno manual

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/main.json \
OPENCLAW_STATE_DIR=~/.openclaw \
openclaw gateway --port 18789

OPENCLAW_CONFIG_PATH=~/.openclaw/rescue.json \
OPENCLAW_STATE_DIR=~/.openclaw-rescue \
openclaw gateway --port 19789
```

## Verificaciones rápidas

```bash
openclaw gateway status --deep
openclaw --profile rescue gateway status --deep
openclaw --profile rescue gateway probe
openclaw status
openclaw --profile rescue status
openclaw --profile rescue browser status
```

Interpretación:

- `gateway status --deep` ayuda a detectar servicios obsoletos de launchd/systemd/schtasks de instalaciones anteriores.
- El texto de advertencia `gateway probe` tal como `multiple reachable gateways detected` solo se espera cuando ejecuta intencionalmente más de un gateway aislado.
