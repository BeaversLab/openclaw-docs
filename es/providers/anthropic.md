---
summary: "Usa Anthropic Claude mediante claves de API o setup-token en OpenClaw"
read_when:
  - You want to use Anthropic models in OpenClaw
  - You want setup-token instead of API keys
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

### Fragmento de configuración

```json5
{
  env: { ANTHROPIC_API_KEY: "sk-ant-..." },
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Valores predeterminados de pensamiento (Claude 4.6)

- Los modelos Anthropic Claude 4.6 tienen como valor predeterminado `adaptive` thinking en OpenClaw cuando no se establece ningún nivel de pensamiento explícito.
- Puedes anularlo por mensaje (`/think:<level>`) o en los parámetros del modelo:
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
- OpenClaw solo inyecta niveles de servicio de Anthropic para solicitudes directas `api.anthropic.com`. Si enrutas `anthropic/*` a través de un proxy o una puerta de enlace, `/fast` deja `service_tier` sin modificar.
- Anthropic informa del nivel efectivo en la respuesta bajo `usage.service_tier`. En cuentas sin capacidad de Priority Tier, `service_tier: "auto"` aún puede resolverse a `standard`.

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

Cuando se utiliza la autenticación con clave de API de Anthropic, OpenClaw aplica automáticamente `cacheRetention: "short"` (caché de 5 minutos) para todos los modelos de Anthropic. Puede anular esto estableciendo explícitamente `cacheRetention` en su configuración.

### Anulaciones de cacheRetention por agente

Use los parámetros a nivel de modelo como línea base y luego anule agentes específicos a través de `agents.list[].params`.

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
2. `agents.list[].params` (coincidiendo con `id`, anulaciones por clave)

Esto permite que un agente mantenga un caché de larga duración mientras que otro agente en el mismo modelo desactiva el almacenamiento en caché para evitar costos de escritura en el tráfico con picos/baja reutilización.

### Notas de Claude en Bedrock

- Los modelos Anthropic Claude en Bedrock (`amazon-bedrock/*anthropic.claude*`) aceptan el pase directo `cacheRetention` cuando están configurados.
- Los modelos de Bedrock que no son de Anthropic se fuerzan a `cacheRetention: "none"` en tiempo de ejecución.
- Los valores predeterminados inteligentes de la clave de API de Anthropic también inicializan `cacheRetention: "short"` para las referencias de modelos Claude-on-Bedrock cuando no se establece ningún valor explícito.

### Parámetro heredado

El parámetro antiguo `cacheControlTtl` aún es compatible por motivos de compatibilidad con versiones anteriores:

- `"5m"` se asigna a `short`
- `"1h"` se asigna a `long`

Recomendamos migrar al nuevo parámetro `cacheRetention`.

OpenClaw incluye la marca beta `extended-cache-ttl-2025-04-11` para las solicitudes a la API de Anthropic;
manténgala si anula los encabezados del proveedor (consulte [/gateway/configuration](/es/gateway/configuration)).

## Ventana de contexto de 1M (beta de Anthropic)

La ventana de contexto de 1M de Anthropic está restringida a beta. En OpenClaw, actívela por modelo
con `params.context1m: true` para los modelos Opus/Sonnet compatibles.

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

Esto solo se activa cuando `params.context1m` se establece explícitamente en `true` para
ese modelo.

Requisito: Anthropic debe permitir el uso de contexto largo en esa credencial
(típicamente facturación de clave API, o una cuenta de suscripción con Uso Adicional
habilitado). De lo contrario, Anthropic devuelve:
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

Nota: Anthropic actualmente rechaza las solicitudes beta `context-1m-*` al usar
tokens de OAuth/suscripción (`sk-ant-oat-*`). OpenClaw omite automáticamente el
encabezado de beta context1m para la autenticación OAuth y mantiene las betas OAuth requeridas.

## Opción B: setup-token de Claude

**Lo mejor para:** usar tu suscripción a Claude.

### Dónde obtener un setup-token

Los setup-tokens son creados por la **CLI de Claude Code**, no por la consola de Anthropic. Puedes ejecutar esto en **cualquier máquina**:

```bash
claude setup-token
```

Pega el token en OpenClaw (asistente: **Token de Anthropic (pegar setup-token)**), o ejecútalo en el host de la puerta de enlace:

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

- Genera el setup-token con `claude setup-token` y pégalo, o ejecuta `openclaw models auth setup-token` en el host de la puerta de enlace.
- Si ves “OAuth token refresh failed …” en una suscripción de Claude, vuelve a autenticarte con un setup-token. Consulta [/gateway/troubleshooting](/es/gateway/troubleshooting).
- Los detalles de autenticación + las reglas de reutilización están en [/concepts/oauth](/es/concepts/oauth).

## Solución de problemas

**Errores 401 / token inválido de repente**

- La autenticación de la suscripción a Claude puede caducar o ser revocada. Vuelve a ejecutar `claude setup-token`
  y pégalo en el **host de la puerta de enlace**.
- Si el inicio de sesión de la CLI de Claude está en una máquina diferente, usa
  `openclaw models auth paste-token --provider anthropic` en el host de la puerta de enlace.

**No se encontró ninguna clave API para el proveedor "anthropic"**

- La autenticación es **por agente**. Los nuevos agentes no heredan las claves del agente principal.
- Vuelve a ejecutar la incorporación para ese agente, o pega un setup-token / clave API en el
  host de la puerta de enlace, luego verifica con `openclaw models status`.

**No se encontraron credenciales para el perfil `anthropic:default`**

- Ejecuta `openclaw models status` para ver qué perfil de autenticación está activo.
- Vuelve a ejecutar la incorporación, o pega un setup-token / clave API para ese perfil.

**No hay ningún perfil de autenticación disponible (todos en período de espera/no disponibles)**

- Consulte `openclaw models status --json` para `auth.unusableProfiles`.
- Añada otro perfil de Anthropic o espere el tiempo de enfriamiento.

Más información: [/gateway/troubleshooting](/es/gateway/troubleshooting) y [/help/faq](/es/help/faq).

import es from "/components/footer/es.mdx";

<es />
