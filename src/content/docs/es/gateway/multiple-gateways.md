---
summary: "Ejecuta varios OpenClaw Gateways en un solo host (aislamiento, puertos y perfiles)"
read_when:
  - Running more than one Gateway on the same machine
  - You need isolated config/state/ports per Gateway
title: "Múltiples gateways"
---

La mayoría de las configuraciones deberían utilizar un solo Gateway, ya que un único Gateway puede manejar múltiples conexiones de mensajería y agentes. Si necesita un aislamiento o redundancia más fuertes (por ejemplo, un bot de rescate), ejecute Gateways separados con perfiles/puertos aislados.

## Mejor configuración recomendada

Para la mayoría de los usuarios, la configuración más sencilla para un bot de rescate es:

- mantener el bot principal en el perfil predeterminado
- ejecutar el bot de rescate en `--profile rescue`
- usar un bot de Telegram completamente separado para la cuenta de rescate
- mantener el bot de rescate en un puerto base diferente, como `19789`

Esto mantiene el bot de rescate aislado del bot principal para que pueda depurar o aplicar
cambios de configuración si el bot principal está caído. Deje al menos 20 puertos entre
los puertos base para que los puertos derivados del navegador/canvas/CDP nunca colisionen.

## Inicio rápido de Rescue-Bot

Utilice esto como la ruta predeterminada a menos que tenga una razón sólida para hacer algo
otro:

```bash
# Rescue bot (separate Telegram bot, separate profile, port 19789)
openclaw --profile rescue onboard
openclaw --profile rescue gateway install --port 19789
```

Si su bot principal ya se está ejecutando, eso suele ser todo lo que necesita.

Durante `openclaw --profile rescue onboard`:

- use el token del bot de Telegram separado
- mantenga el perfil `rescue`
- use un puerto base al menos 20 unidades mayor que el del bot principal
- acepte el espacio de trabajo de rescate predeterminado a menos que ya gestione uno usted mismo

Si la incorporación ya instaló el servicio de rescate para usted, el `gateway install` final
no es necesario.

## Por qué funciona esto

El bot de rescate permanece independiente porque tiene su propio:

- perfil/configuración
- directorio de estado
- espacio de trabajo
- puerto base (más puertos derivados)
- token del bot de Telegram

Para la mayoría de las configuraciones, use un bot de Telegram completamente separado para el perfil de rescate:

- fácil de mantener solo para operadores
- token de bot e identidad separados
- independiente de la instalación del canal/aplicación del bot principal
- ruta de recuperación simple basada en MD cuando el bot principal está roto

## Qué cambia `--profile rescue onboard`

`openclaw --profile rescue onboard` usa el flujo de incorporación normal, pero escribe
todo en un perfil separado.

En la práctica, eso significa que el bot de rescate obtiene su propio:

- archivo de configuración
- directorio de estado
- espacio de trabajo (por defecto `~/.openclaw/workspace-rescue`)
- nombre del servicio gestionado

Las solicitudes son, por lo demás, las mismas que la incorporación normal.

## Configuración general de múltiples gateways

La disposición de rescue-bot anterior es la opción predeterminada más sencilla, pero el mismo patrón de aislamiento funciona para cualquier par o grupo de Gateways en un solo host.

Para una configuración más general, asigne a cada Gateway adicional su propio perfil con nombre y su propio puerto base:

```bash
# main (default profile)
openclaw setup
openclaw gateway --port 18789

# extra gateway
openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

Si desea que ambos Gateways usen perfiles con nombre, eso también funciona:

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

Use el inicio rápido de rescue-bot cuando desee un carril de operador de respaldo. Use el patrón de perfil general cuando desee múltiples Gateways de larga duración para diferentes canales, inquilinos, espacios de trabajo u roles operacionales.

## Lista de verificación de aislamiento

Mantenga estos elementos únicos por instancia de Gateway:

- `OPENCLAW_CONFIG_PATH` — archivo de configuración por instancia
- `OPENCLAW_STATE_DIR` — sesiones, credenciales y cachés por instancia
- `agents.defaults.workspace` — raíz del espacio de trabajo por instancia
- `gateway.port` (o `--port`) — único por instancia
- puertos derivados de navegador/canvas/CDP

Si se comparten, encontrará carreras de configuración y conflictos de puertos.

## Asignación de puertos (derivada)

Puerto base = `gateway.port` (o `OPENCLAW_GATEWAY_PORT` / `--port`).

- puerto del servicio de control del navegador = base + 2 (solo loopback)
- el host de canvas se sirve en el servidor HTTP del Gateway (mismo puerto que `gateway.port`)
- Los puertos CDP del perfil del navegador se asignan automáticamente desde `browser.controlPort + 9 .. + 108`

Si anula alguno de estos en la configuración o en el entorno, debe mantenerlos únicos por instancia.

## Notas sobre navegador/CDP (problema común)

- **No** fije `browser.cdpUrl` a los mismos valores en múltiples instancias.
- Cada instancia necesita su propio puerto de control del navegador y su propio rango CDP (derivado de su puerto de gateway).
- Si necesita puertos CDP explícitos, establezca `browser.profiles.<name>.cdpPort` por instancia.
- Chrome remoto: use `browser.profiles.<name>.cdpUrl` (por perfil, por instancia).

## Ejemplo de env manual

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

- `gateway status --deep` ayuda a detectar servicios obsoletos de launchd/systemd/schtasks de instalaciones antiguas.
- El texto de advertencia `gateway probe` tal como `multiple reachable gateways detected` es esperado solo cuando ejecuta intencionalmente más de un gateway aislado.

## Relacionado

- [Manual de procedimientos de Gateway](/es/gateway)
- [Bloqueo de puerta de enlace](/es/gateway/gateway-lock)
- [Configuración](/es/gateway/configuration)
