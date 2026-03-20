---
summary: "Use Anthropic Claude vía API keys o setup-token en OpenClaw"
read_when:
  - Quieres usar modelos Anthropic en OpenClaw
  - Quieres setup-token en lugar de API keys
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic construye la familia de modelos **Claude** y proporciona acceso a través de una API.
En OpenClaw puedes autenticarte con una API key o un **setup-token**.

## Opción A: Clave de API de Anthropic

**Lo mejor para:** acceso estándar a la API y facturación basada en uso.
Crea tu clave de API en la consola de Anthropic.

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

- Los modelos Anthropic Claude 4.6 tienen por defecto el pensamiento `adaptive` en OpenClaw cuando no se establece ningún nivel de pensamiento explícito.
- Puedes anular por mensaje (`/think:<level>`) o en los parámetros del modelo:
  `agents.defaults.models["anthropic/<model>"].params.thinking`.
- Documentación relacionada de Anthropic:
  - [Pensamiento adaptativo](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
  - [Pensamiento extendido](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

## Modo rápido (API de Anthropic)

El interruptor compartido `/fast` de OpenClaw también admite el tráfico directo de claves de API de Anthropic.

- `/fast on` se asigna a `service_tier: "auto"`
- `/fast off` se asigna a `service_tier: "standard_only"`
- Valor predeterminado de configuración:

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-sonnet-4-5": {
          params: { fastMode: true },
        },
      },
    },
  },
}
```

Límites importantes:

- Esto es **solo para claves de API**. La autenticación por setup-token / OAuth de Anthropic no respeta la inyección de niveles de modo rápido de OpenClaw.
- OpenClaw solo inyecta niveles de servicio de Anthropic para solicitudes directas de `api.anthropic.com`. Si enrutas `anthropic/*` a través de un proxy o una puerta de enlace, `/fast` deja `service_tier` sin tocar.
- Anthropic informa del nivel efectivo en la respuesta bajo `usage.service_tier`. En cuentas sin capacidad de nivel de prioridad, `service_tier: "auto"` todavía puede resolverse a `standard`.

## Almacenamiento en caché de solicitudes (API de Anthropic)

OpenClaw admite la función de almacenamiento en caché de solicitudes de Anthropic. Esto es **solo para API**; la autenticación de suscripción no respeta la configuración de caché.

### Configuración

Usa el parámetro `cacheRetention` en la configuración de tu modelo:

| Valor   | Duración de la caché        | Descripción                                            |
| ------- | --------------------------- | ------------------------------------------------------ |
| `none`  | Sin almacenamiento en caché | Deshabilitar el almacenamiento en caché de solicitudes |
| `short` | 5 minutos                   | Predeterminado para la autenticación con API Key       |
| `long`  | 1 hora                      | Caché extendido (requiere marca beta)                  |

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

Cuando se utiliza la autenticación con API Key de Anthropic, OpenClaw aplica automáticamente `cacheRetention: "short"` (caché de 5 minutos) para todos los modelos Anthropic. Puede anular esto estableciendo explícitamente `cacheRetention` en su configuración.

### Anulaciones de cacheRetention por agente

Use los parámetros a nivel de modelo como base, luego anule agentes específicos a través de `agents.list[].params`.

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

Esto permite que un agente mantenga un caché de larga duración mientras que otro agente en el mismo modelo desactiva el almacenamiento en caché para evitar costos de escritura en el tráfico de ráfaga/baja reutilización.

### Notas sobre Bedrock Claude

- Los modelos Anthropic Claude en Bedrock (`amazon-bedrock/*anthropic.claude*`) aceptan el paso a través de `cacheRetention` cuando están configurados.
- Los modelos Bedrock que no son de Anthropic se fuerzan a `cacheRetention: "none"` en tiempo de ejecución.
- Los valores predeterminados inteligentes de la API-key de Anthropic también inicializan `cacheRetention: "short"` para las referencias de modelo Claude-on-Bedrock cuando no se establece ningún valor explícito.

### Parámetro heredado

El parámetro anterior `cacheControlTtl` todavía es compatible por motivos de compatibilidad con versiones anteriores:

- `"5m"` se asigna a `short`
- `"1h"` se asigna a `long`

Recomendamos migrar al nuevo parámetro `cacheRetention`.

OpenClaw incluye la marca beta `extended-cache-ttl-2025-04-11` para las solicitudes de la API de Anthropic; manténgala si anula los encabezados del proveedor (consulte [/gateway/configuration](/es/gateway/configuration)).

## Ventana de contexto de 1M (beta de Anthropic)

La ventana de contexto de 1M de Anthropic está limitada a la versión beta. En OpenClaw, habilítela por modelo con `params.context1m: true` para los modelos Opus/Sonnet compatibles.

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

OpenClaw asigna esto a `anthropic-beta: context-1m-2025-08-07` en las solicitudes de Anthropic.

Esto solo se activa cuando `params.context1m` se establece explícitamente en `true` para ese modelo.

Requisito: Anthropic debe permitir el uso de contexto largo en esa credencial
(típicamente facturación de clave API, o una cuenta de suscripción con Uso Adicional
habilitado). De lo contrario, Anthropic devuelve:
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

Nota: Anthropic actualmente rechaza las solicitudes beta de `context-1m-*` cuando se utilizan
tokens OAuth/suscripción (`sk-ant-oat-*`). OpenClaw omite automáticamente el
encabezado beta context1m para la autenticación OAuth y mantiene los betas OAuth requeridos.

## Opción B: Claude setup-token

**Lo mejor para:** usar tu suscripción a Claude.

### Dónde obtener un setup-token

Los setup-tokens son creados por la **CLI de Claude Code**, no por la Consola de Anthropic. Puedes ejecutar esto en **cualquier máquina**:

```bash
claude setup-token
```

Pega el token en OpenClaw (asistente: **Anthropic token (pegar setup-token)**), o ejecútalo en el host de la puerta de enlace:

```bash
openclaw models auth setup-token --provider anthropic
```

Si generaste el token en una máquina diferente, pégalo:

```bash
openclaw models auth paste-token --provider anthropic
```

### Configuración CLI (setup-token)

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
- Si ves "OAuth token refresh failed …" en una suscripción de Claude, vuelve a autenticarte con un setup-token. Consulta [/gateway/troubleshooting#oauth-token-refresh-failed-anthropic-claude-subscription](/es/gateway/troubleshooting#oauth-token-refresh-failed-anthropic-claude-subscription).
- Los detalles de autenticación + las reglas de reutilización están en [/concepts/oauth](/es/concepts/oauth).

## Solución de problemas

**Errores 401 / token suddenly invalid**

- La autenticación de la suscripción Claude puede caducar o ser revocada. Vuelve a ejecutar `claude setup-token`
  y pégalo en el **gateway host**.
- Si el inicio de sesión de la CLI de Claude está en una máquina diferente, usa
  `openclaw models auth paste-token --provider anthropic` en el host de la puerta de enlace.

**No API key found for provider "anthropic"**

- La autenticación es **por agente**. Los nuevos agentes no heredan las claves del agente principal.
- Vuelve a ejecutar la incorporación para ese agente, o pega un setup-token / clave API en el
  host de la puerta de enlace, luego verifica con `openclaw models status`.

**No credentials found for profile `anthropic:default`**

- Ejecuta `openclaw models status` para ver qué perfil de autenticación está activo.
- Vuelve a ejecutar la incorporación, o pega un setup-token / clave API para ese perfil.

**No available auth profile (all in cooldown/unavailable)**

- Comprueba `openclaw models status --json` para `auth.unusableProfiles`.
- Añade otro perfil de Anthropic o espera el tiempo de enfriamiento.

Más: [/gateway/troubleshooting](/es/gateway/troubleshooting) y [/help/faq](/es/help/faq).

import es from "/components/footer/es.mdx";

<es />
