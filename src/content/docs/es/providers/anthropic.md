---
summary: "Usar Anthropic Claude mediante claves API o Claude CLI en OpenClaw"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic desarrolla la familia de modelos **Claude** y proporciona acceso a través de una API y
Claude CLI. En OpenClaw, tanto las claves API de Anthropic como el reúso de Claude CLI están
soportados. Los perfiles de tokens heredados existentes de Anthropic todavía se respetan en
tiempo de ejecución si ya están configurados.

<Warning>
El personal de Anthropic nos comunicó que el uso de Claude CLI estilo OpenClaw está permitido nuevamente, por lo que
OpenClaw trata el reúso de Claude CLI y el uso de `claude -p` como sancionados para esta
integración a menos que Anthropic publique una nueva política.

Para hosts de puerta de enlace de larga duración, las claves API de Anthropic siguen siendo la ruta de producción más clara y
predecible. Si ya usa Claude CLI en el host,
OpenClaw puede reutilizar ese inicio de sesión directamente.

La documentación pública actual de Anthropic:

- [Referencia de la CLI de Claude Code](https://code.claude.com/docs/en/cli-reference)
- [Descripción general del SDK de Claude Agent](https://platform.claude.com/docs/en/agent-sdk/overview)

- [Uso de Claude Code con su plan Pro o Max](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [Uso de Claude Code con su plan Team o Enterprise](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

Si desea la ruta de facturación más clara, utilice una clave API de Anthropic en su lugar.
OpenClaw también admite otras opciones de estilo de suscripción, incluyendo [OpenAI
Codex](/en/providers/openai), [Plan de codificación en la nube de Qwen](/en/providers/qwen),
[Plan de codificación de MiniMax](/en/providers/minimax) y [Plan de codificación
Z.AI / GLM](/en/providers/glm).

</Warning>

## Opción A: Clave API de Anthropic

**Lo mejor para:** acceso estándar a la API y facturación basada en el uso.
Cree su clave API en la Consola de Anthropic.

### Configuración de CLI

```bash
openclaw onboard
# choose: Anthropic API key

# or non-interactive
openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
```

### Fragmento de configuración de Anthropic

```json5
{
  env: { ANTHROPIC_API_KEY: "sk-ant-..." },
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Valores predeterminados de pensamiento (Claude 4.6)

- Los modelos Anthropic Claude 4.6 tienen por defecto el pensamiento `adaptive` en OpenClaw cuando no se establece un nivel de pensamiento explícito.
- Puede anular por mensaje (`/think:<level>`) o en los parámetros del modelo:
  `agents.defaults.models["anthropic/<model>"].params.thinking`.
- Documentación relacionada de Anthropic:
  - [Pensamiento adaptativo](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
  - [Pensamiento extendido](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

## Modo rápido (API de Anthropic)

El interruptor compartido `/fast` de OpenClaw también admite el tráfico público directo de Anthropic, incluyendo solicitudes autenticadas con clave API y OAuth enviadas a `api.anthropic.com`.

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

- OpenClaw solo inyecta los niveles de servicio de Anthropic para las solicitudes directas de `api.anthropic.com`. Si enrutas `anthropic/*` a través de un proxy o una puerta de enlace, `/fast` deja `service_tier` sin tocar.
- Los parámetros de modelo explícitos de Anthropic `serviceTier` o `service_tier` anulan el valor predeterminado de `/fast` cuando ambos están establecidos.
- Anthropic informa del nivel efectivo en la respuesta en `usage.service_tier`. En las cuentas sin capacidad de nivel prioritario, `service_tier: "auto"` aún puede resolver a `standard`.

## Caché de instrucciones (API de Anthropic)

OpenClaw admite la función de caché de instrucciones de Anthropic. Esto es **solo para API**; la autenticación heredada por token de Anthropic no respeta la configuración de caché.

### Configuración

Use el parámetro `cacheRetention` en la configuración de su modelo:

| Valor   | Duración de la caché | Descripción                                           |
| ------- | -------------------- | ----------------------------------------------------- |
| `none`  | Sin caché            | Desactivar el caché de instrucciones                  |
| `short` | 5 minutos            | Predeterminado para la autenticación con clave de API |
| `long`  | 1 hora               | Caché extendida                                       |

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

Utilice los parámetros a nivel de modelo como su línea base y luego anule agentes específicos a través de `agents.list[].params`.

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
2. `agents.list[].params` (coincide con `id`, anulaciones por clave)

Esto permite que un agente mantenga un caché de larga duración mientras que otro agente en el mismo modelo desactiva el almacenamiento en caché para evitar costos de escritura en tráfico de ráfagas/baja reutilización.

### Notas sobre Bedrock Claude

- Los modelos Claude de Anthropic en Bedrock (`amazon-bedrock/*anthropic.claude*`) aceptan el paso a través de `cacheRetention` cuando están configurados.
- Los modelos de Bedrock que no son de Anthropic se fuerzan a `cacheRetention: "none"` en tiempo de ejecución.
- Los valores predeterminados inteligentes de la clave de API de Anthropic también siembran `cacheRetention: "short"` para las referencias de modelos Claude-on-Bedrock cuando no se establece ningún valor explícito.

## Ventana de contexto de 1M (beta de Anthropic)

La ventana de contexto de 1M de Anthropic está restringida a la beta. En OpenClaw, actívela por modelo
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

OpenClaw asigna esto a `anthropic-beta: context-1m-2025-08-07` en las solicitudes
de Anthropic.

Esto solo se activa cuando `params.context1m` se establece explícitamente en `true` para
ese modelo.

Requisito: Anthropic debe permitir el uso de contexto largo en esa credencial.

Nota: Anthropic actualmente rechaza las solicitudes beta de `context-1m-*` cuando se utiliza
la autenticación de token heredada de Anthropic (`sk-ant-oat-*`). Si configura
`context1m: true` con ese modo de autenticación heredado, OpenClaw registra una advertencia y
vuelve a la ventana de contexto estándar omitiendo el encabezado beta context1m
mientras mantiene los betas de OAuth requeridos.

## Backend de Claude CLI

El backend de Anthropic `claude-cli` incluido es compatible con OpenClaw.

- El personal de Anthropic nos informó que este uso está permitido nuevamente.
- Por lo tanto, OpenClaw trata el reuso de Claude CLI y el uso de `claude -p` como
  autorizados para esta integración, a menos que Anthropic publique una nueva política.
- Las claves de API de Anthropic siguen siendo la ruta de producción más clara para hosts de puerta de enlace
  siempre activos y control de facturación explícito del lado del servidor.
- Los detalles de configuración y tiempo de ejecución están en [/gateway/cli-backends](/en/gateway/cli-backends).

## Notas

- La documentación pública de Claude Code de Anthropic aún documenta el uso directo de la CLI, como
  `claude -p`, y el personal de Anthropic nos informó que el uso de la CLI de Claude estilo OpenClaw está
  permitido nuevamente. Tratamos esa orientación como definitiva a menos que Anthropic
  publique un cambio de nueva política.
- El token de configuración de Anthropic sigue estando disponible en OpenClaw como una ruta de autenticación de token compatible, pero OpenClaw ahora prefiere el reuso de Claude CLI y `claude -p` cuando está disponible.
- Los detalles de autenticación + las reglas de reuso están en [/concepts/oauth](/en/concepts/oauth).

## Solución de problemas

**Errores 401 / token inválido de repente**

- La autenticación de token de Anthropic puede caducar o ser revocada.
- Para una nueva configuración, migre a una clave de API de Anthropic.

**No se encontró ninguna clave de API para el proveedor "anthropic"**

- La autenticación es **por agente**. Los nuevos agentes no heredan las claves del agente principal.
- Vuelva a ejecutar la incorporación para ese agente, o configure una clave de API en el host de la puerta de enlace
  y luego verifique con `openclaw models status`.

**No se encontraron credenciales para el perfil `anthropic:default`**

- Ejecute `openclaw models status` para ver qué perfil de autenticación está activo.
- Vuelva a ejecutar la incorporación o configure una clave de API para esa ruta de perfil.

**No hay ningún perfil de autenticación disponible (todos en período de enfriamiento/no disponibles)**

- Verifique `openclaw models status --json` para `auth.unusableProfiles`.
- Los períodos de enfriamiento por límite de velocidad de Anthropic pueden estar específicos del modelo, por lo que un modelo hermano de Anthropic todavía puede ser utilizable incluso cuando el actual se está enfriando.
- Agregue otro perfil de Anthropic o espere el período de enfriamiento.

Más: [/gateway/troubleshooting](/en/gateway/troubleshooting) y [/help/faq](/en/help/faq).
