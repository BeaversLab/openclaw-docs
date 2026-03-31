---
summary: "Usa Anthropic Claude mediante claves de API, tokens de configuración o Claude CLI en OpenClaw"
read_when:
  - You want to use Anthropic models in OpenClaw
  - You want setup-token instead of API keys
  - You want to reuse Claude CLI subscription auth on the gateway host
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic construye la familia de modelos **Claude** y proporciona acceso a través de una API.
En OpenClaw puedes autenticarte con una clave de API o un **setup-token**.

## Opción A: Clave de API de Anthropic

**Ideal para:** acceso estándar a la API y facturación basada en el uso.
Crea tu clave de API en la Consola de Anthropic.

### Configuración de CLI

```bash
openclaw onboard
# choose: Anthropic API key

# or non-interactive
openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
```

### Fragmento de configuración de Claude CLI

```json5
{
  env: { ANTHROPIC_API_KEY: "sk-ant-..." },
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Valores predeterminados de pensamiento (Claude 4.6)

- Los modelos Anthropic Claude 4.6 se establecen por defecto en `adaptive` en OpenClaw cuando no se configura un nivel de pensamiento explícito.
- Puedes anular esto por mensaje (`/think:<level>`) o en los parámetros del modelo:
  `agents.defaults.models["anthropic/<model>"].params.thinking`.
- Documentación relacionada de Anthropic:
  - [Pensamiento adaptativo](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
  - [Pensamiento extendido](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

## Modo rápido (API de Anthropic)

El interruptor compartido `/fast` de OpenClaw también admite el tráfico directo con clave de API de Anthropic.

- `/fast on` se asigna a `service_tier: "auto"`
- `/fast off` se asigna a `service_tier: "standard_only"`
- Predeterminado de configuración:

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-sonnet-4-6": {
          params: { fastMode: true },
        },
      },
    },
  },
}
```

Límites importantes:

- Esto es **solo para claves de API**. La autenticación Anthropic setup-token / OAuth no respeta la inyección de niveles de modo rápido de OpenClaw.
- OpenClaw solo inyecta niveles de servicio de Anthropic para solicitudes `api.anthropic.com` directas. Si enrutas `anthropic/*` a través de un proxy o puerta de enlace, `/fast` deja `service_tier` sin modificar.
- Anthropic informa del nivel efectivo en la respuesta bajo `usage.service_tier`. En cuentas sin capacidad de nivel prioritario, `service_tier: "auto"` aún puede resolverse a `standard`.

## Almacenamiento en caché de indicaciones (API de Anthropic)

OpenClaw admite la función de almacenamiento en caché de indicaciones de Anthropic. Esto es **solo para API**; la autenticación por suscripción no respeta la configuración de caché.

### Configuración

Usa el parámetro `cacheRetention` en la configuración de tu modelo:

| Valor   | Duración de la caché        | Descripción                                                 |
| ------- | --------------------------- | ----------------------------------------------------------- |
| `none`  | Sin almacenamiento en caché | Deshabilitar el almacenamiento en caché de indicaciones     |
| `short` | 5 minutos                   | Valor predeterminado para la autenticación con clave de API |
| `long`  | 1 hora                      | Caché extendido (requiere marca beta)                       |

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { cacheRetention: "long" },
        },
      },
    },
  },
}
```

### Valores predeterminados

Cuando se utiliza la autenticación con clave de API de Anthropic, OpenClaw aplica automáticamente `cacheRetention: "short"` (caché de 5 minutos) para todos los modelos de Anthropic. Puede anular esto configurando explícitamente `cacheRetention` en su configuración.

### Anulaciones de cacheRetention por agente

Use los parámetros a nivel de modelo como línea base, luego anule agentes específicos a través de `agents.list[].params`.

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-opus-4-6" },
      models: {
        "anthropic/claude-opus-4-6": {
          params: { cacheRetention: "long" }, // baseline for most agents
        },
      },
    },
    list: [
      { id: "research", default: true },
      { id: "alerts", params: { cacheRetention: "none" } }, // override for this agent only
    ],
  },
}
```

Orden de fusión de configuración para parámetros relacionados con el caché:

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params` (coincidiendo con `id`, anula por clave)

Esto permite que un agente mantenga un caché de larga duración mientras que otro agente en el mismo modelo desactiva el almacenamiento en caché para evitar costos de escritura en el tráfico con picos/baja reutilización.

### Notas de Claude en Bedrock

- Los modelos Anthropic Claude en Bedrock (`amazon-bedrock/*anthropic.claude*`) aceptan el paso a través de `cacheRetention` cuando están configurados.
- Los modelos de Bedrock que no son de Anthropic se fuerzan a `cacheRetention: "none"` en tiempo de ejecución.
- Los valores predeterminados inteligentes de la clave de API de Anthropic también sembran `cacheRetention: "short"` para las referencias de modelos Claude-on-Bedrock cuando no se establece ningún valor explícito.

### Parámetro heredado

El parámetro anterior `cacheControlTtl` todavía es compatible por motivos de compatibilidad con versiones anteriores:

- `"5m"` se asigna a `short`
- `"1h"` se asigna a `long`

Recomendamos migrar al nuevo parámetro `cacheRetention`.

OpenClaw incluye el `extended-cache-ttl-2025-04-11` indicador beta para las solicitudes a la API de Anthropic; manténgalo si anula los encabezados del proveedor (consulte [/gateway/configuration](/en/gateway/configuration)).

## Ventana de contexto de 1M (beta de Anthropic)

La ventana de contexto de 1M de Anthropic está restringida a la beta. En OpenClaw, actívela por modelo con `params.context1m: true` para los modelos Opus/Sonnet compatibles.

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { context1m: true },
        },
      },
    },
  },
}
```

OpenClaw asigna esto a `anthropic-beta: context-1m-2025-08-07` en las solicitudes a Anthropic.

Esto solo se activa cuando `params.context1m` se establece explícitamente en `true` para ese modelo.

Requisito: Anthropic debe permitir el uso de contexto largo en esa credencial (generalmente facturación de clave API, o una cuenta de suscripción con Uso Extra habilitado). De lo contrario, Anthropic devuelve: `HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

Nota: Actualmente, Anthropic rechaza las solicitudes beta `context-1m-*` cuando se usan tokens de OAuth/suscripción (`sk-ant-oat-*`). OpenClaw omite automáticamente el encabezado beta context1m para la autenticación OAuth y mantiene los betas OAuth necesarios.

## Opción B: Claude CLI como proveedor de mensajes

**Lo mejor para:** un host de puerta de enlace de un solo usuario que ya tiene Claude CLI instalado y ha iniciado sesión con una suscripción a Claude.

Esta ruta utiliza el binario local `claude` para la inferencia del modelo en lugar de llamar a la API de Anthropic directamente. OpenClaw lo trata como un **proveedor de backend CLI** con referencias de modelo como:

- `claude-cli/claude-sonnet-4-6`
- `claude-cli/claude-opus-4-6`

Cómo funciona:

1. OpenClaw inicia `claude -p --output-format json ...` en el **host de
   puerta de enlace**.
2. El primer turno envía `--session-id <uuid>`.
3. Los turnos de seguimiento reutilizan la sesión de Claude almacenada a través de `--resume <sessionId>`.
4. Sus mensajes de chat aún pasan por la tubería de mensajes normal de OpenClaw, pero
   la respuesta real del modelo es producida por Claude CLI.

### Requisitos

- Claude CLI instalado en el host de la puerta de enlace y disponible en PATH, o configurado
  con una ruta de comando absoluta.
- Claude CLI ya autenticado en ese mismo host:

```bash
claude auth status
```

- OpenClaw carga automáticamente el complemento Anthropic incluido al iniciar la puerta de enlace cuando su
  configuración hace referencia explícita a `claude-cli/...` o a la configuración del backend `claude-cli`.

### Fragmento de configuración

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "claude-cli/claude-sonnet-4-6",
      },
      models: {
        "claude-cli/claude-sonnet-4-6": {},
      },
      sandbox: { mode: "off" },
    },
  },
}
```

Si el binario `claude` no está en el PATH del host de la puerta de enlace:

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
      },
    },
  },
}
```

### Lo que obtiene

- Autenticación de suscripción de Claude reutilizada desde la CLI local
- Enrutamiento de mensajes/sesiones normal de OpenClaw
- Continuidad de la sesión de Claude CLI a través de los turnos

### Migrar desde la autenticación de Anthropic a Claude CLI

Si actualmente usa `anthropic/...` con un token de configuración o una clave API y desea
cambiar el mismo host de puerta de enlace a Claude CLI:

```bash
openclaw models auth login --provider anthropic --method cli --set-default
```

O en la incorporación:

```bash
openclaw onboard --auth-choice anthropic-cli
```

Lo que hace esto:

- verifica que Claude CLI ya haya iniciado sesión en el host de la puerta de enlace
- cambia el modelo predeterminado a `claude-cli/...`
- reescribe los modelos de reserva predeterminados de Anthropic como `anthropic/claude-opus-4-6`
  a `claude-cli/claude-opus-4-6`
- agrega entradas `claude-cli/...` coincidentes a `agents.defaults.models`

Lo que **no** hace:

- eliminar sus perfiles de autenticación de Anthropic existentes
- eliminar cada referencia de configuración antigua `anthropic/...` fuera de la ruta predeterminada
  principal del modelo/lista de permitidos

Eso hace que la reversión sea sencilla: cambie el modelo predeterminado de nuevo a `anthropic/...` si
lo necesita.

### Límites importantes

- Esto **no** es el proveedor de la API de Anthropic. Es el tiempo de ejecución de la CLI local.
- Las herramientas están deshabilitadas en el lado de OpenClaw para las ejecuciones de backend de CLI.
- Texto de entrada, texto de salida. Sin traspaso de transmisión de OpenClaw.
- Más adecuado para un host de puerta de enlace personal, no para configuraciones de facturación multiusuario compartidas.

Más detalles: [/gateway/cli-backends](/en/gateway/cli-backends)

## Opción C: token de configuración de Claude

**Lo mejor para:** usar tu suscripción a Claude.

### Dónde obtener un token de configuración

Los tokens de configuración son creados por la **CLI de Claude Code**, no por la consola de Anthropic. Puedes ejecutar esto en **cualquier máquina**:

```bash
claude setup-token
```

Pega el token en OpenClaw (asistente: **Anthropic token (paste setup-token)**), o ejecútalo en el host de puerta de enlace:

```bash
openclaw models auth setup-token --provider anthropic
```

Si generaste el token en una máquina diferente, pégalo:

```bash
openclaw models auth paste-token --provider anthropic
```

### Configuración de CLI (setup-token)

```bash
# Paste a setup-token during setup
openclaw onboard --auth-choice setup-token
```

### Fragmento de configuración (setup-token)

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Notas

- Genera el token de configuración con `claude setup-token` y pégalo, o ejecuta `openclaw models auth setup-token` en el host de puerta de enlace.
- Si ves "OAuth token refresh failed …" en una suscripción a Claude, vuelve a autenticarte con un token de configuración. Consulta [/gateway/troubleshooting](/en/gateway/troubleshooting).
- Los detalles de autenticación y las reglas de reutilización están en [/concepts/oauth](/en/concepts/oauth).

## Solución de problemas

**Errores 401 / token repentinamente inválido**

- La autenticación de la suscripción a Claude puede caducar o ser revocada. Vuelve a ejecutar `claude setup-token`
  y pégalo en el **host de puerta de enlace**.
- Si el inicio de sesión de la CLI de Claude está en una máquina diferente, usa
  `openclaw models auth paste-token --provider anthropic` en el host de puerta de enlace.

**No se encontró ninguna clave API para el proveedor "anthropic"**

- La autenticación es **por agente**. Los nuevos agentes no heredan las claves del agente principal.
- Vuelva a ejecutar la incorporación para ese agente, o pegue un token de configuración / clave de API en el
  host de la puerta de enlace, y luego verifique con `openclaw models status`.

**No se encontraron credenciales para el perfil `anthropic:default`**

- Ejecute `openclaw models status` para ver qué perfil de autenticación está activo.
- Vuelva a ejecutar la incorporación, o pegue un token de configuración / clave de API para ese perfil.

**No hay ningún perfil de autenticación disponible (todos están en período de espera/no disponibles)**

- Compruebe `openclaw models status --json` para `auth.unusableProfiles`.
- Añada otro perfil de Anthropic o espere el final del período de espera.

Más: [/gateway/troubleshooting](/en/gateway/troubleshooting) y [/help/faq](/en/help/faq).
