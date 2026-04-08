---
summary: "Usar Anthropic Claude mediante claves API en OpenClaw"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic desarrolla la familia de modelos **Claude** y proporciona acceso a través de una API.
En OpenClaw, la nueva configuración de Anthropic debe usar una clave API. Los perfiles
de token heredados de Anthropic existentes todavía se respetan en tiempo de ejecución si
ya están configurados.

<Warning>
Para Anthropic en OpenClaw, la división de facturación es:

- **Clave API de Anthropic**: facturación normal de la API de Anthropic.
- **Autenticación de suscripción Claude dentro de OpenClaw**: Anthropic informó a los usuarios de OpenClaw el
  **4 de abril de 2026 a las 12:00 PM PT / 8:00 PM BST** que esto cuenta como
  uso de harness de terceros y requiere **Uso Extra** (pago por uso,
  facturado por separado de la suscripción).

Nuestras reproducciones locales coinciden con esa división:

- el `claude -p` directo todavía puede funcionar
- `claude -p --append-system-prompt ...` puede activar el guardia de Uso Extra cuando
  el prompt identifica OpenClaw
- el mismo prompt del sistema similar a OpenClaw **no** reproduce el bloque en la
  ruta Anthropic SDK + `ANTHROPIC_API_KEY`

Por lo tanto, la regla práctica es: **clave API de Anthropic, o suscripción Claude con
Uso Extra**. Si desea la ruta de producción más clara, use una clave API de
Anthropic.

Documentación pública actual de Anthropic:

- [Referencia de la CLI de Claude Code](https://code.claude.com/docs/en/cli-reference)
- [Descripción general del SDK de Claude Agent](https://platform.claude.com/docs/en/agent-sdk/overview)

- [Uso de Claude Code con su plan Pro o Max](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [Uso de Claude Code con su plan Team o Enterprise](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

Si desea la ruta de facturación más clara, use una clave API de Anthropic.
OpenClaw también admite otras opciones estilo suscripción, incluyendo [OpenAI
Codex](/en/providers/openai), [Plan de Codificación en la Nube Qwen](/en/providers/qwen),
[Plan de Codificación MiniMax](/en/providers/minimax), y [Plan de Codificación
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

- Los modelos Anthropic Claude 4.6 tienen como valor predeterminado el pensamiento `adaptive` en OpenClaw cuando no se establece ningún nivel de pensamiento explícito.
- Puede anular por mensaje (`/think:<level>`) o en los parámetros del modelo:
  `agents.defaults.models["anthropic/<model>"].params.thinking`.
- Documentación relacionada de Anthropic:
  - [Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
  - [Extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

## Modo rápido (API de Anthropic)

El interruptor compartido `/fast` de OpenClaw también admite el tráfico público directo de Anthropic, incluidas las solicitudes autenticadas con clave de API y OAuth enviadas a `api.anthropic.com`.

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

- OpenClaw solo inyecta niveles de servicio de Anthropic para solicitudes directas a `api.anthropic.com`. Si enruta `anthropic/*` a través de un proxy o una puerta de enlace, `/fast` deja `service_tier` sin tocar.
- Los parámetros del modelo explícitos de Anthropic `serviceTier` o `service_tier` anulan el valor predeterminado de `/fast` cuando ambos están configurados.
- Anthropic informa del nivel efectivo en la respuesta en `usage.service_tier`. En las cuentas sin capacidad de Priority Tier, `service_tier: "auto"` todavía puede resolverse a `standard`.

## Caché de instrucciones (API de Anthropic)

OpenClaw admite la función de caché de instrucciones de Anthropic. Esto es **solo para API**; la autenticación heredada por token de Anthropic no respeta la configuración de caché.

### Configuración

Use el parámetro `cacheRetention` en su configuración de modelo:

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

Cuando se usa la autenticación con clave de API de Anthropic, OpenClaw aplica automáticamente `cacheRetention: "short"` (caché de 5 minutos) para todos los modelos de Anthropic. Puede anular esto estableciendo explícitamente `cacheRetention` en su configuración.

### Anulaciones de cacheRetention por agente

Use los parámetros a nivel de modelo como su base y luego anule agentes específicos a través de `agents.list[].params`.

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

Esto permite que un agente mantenga un caché de larga duración mientras que otro agente en el mismo modelo desactiva el almacenamiento en caché para evitar costos de escritura en tráfico de ráfagas/baja reutilización.

### Notas sobre Bedrock Claude

- Los modelos Anthropic Claude en Bedrock (`amazon-bedrock/*anthropic.claude*`) aceptan el paso a través (pass-through) de `cacheRetention` cuando están configurados.
- Los modelos Bedrock que no son de Anthropic se ven forzados a `cacheRetention: "none"` en tiempo de ejecución.
- Los valores predeterminados inteligentes de la clave de API de Anthropic también inicializan `cacheRetention: "short"` para las referencias de modelos Claude-on-Bedrock cuando no se establece ningún valor explícito.

## Ventana de contexto de 1M (beta de Anthropic)

La ventana de contexto de 1M de Anthropic está limitada a la versión beta. En OpenClaw, actívela por modelo
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
a Anthropic.

Esto solo se activa cuando `params.context1m` se establece explícitamente en `true` para
ese modelo.

Requisito: Anthropic debe permitir el uso de contexto largo en esa credencial
(generalmente facturación de clave de API, o la ruta de inicio de sesión de Claude de OpenClaw / autenticación de token heredada
con Uso adicional habilitado). De lo contrario, Anthropic devuelve:
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

Nota: Actualmente, Anthropic rechaza las solicitudes beta `context-1m-*` cuando se utiliza
la autenticación de token heredada de Anthropic (`sk-ant-oat-*`). Si configura
`context1m: true` con ese modo de autenticación heredado, OpenClaw registra una advertencia y
vuelve a la ventana de contexto estándar omitiendo el encabezado beta context1m
mientras mantiene las betas de OAuth requeridas.

## Eliminado: backend de Claude CLI

Se eliminó el backend `claude-cli` de Anthropic incluido.

- El aviso del 4 de abril de 2026 de Anthropic indica que el tráfico de inicio de sesión de Claude impulsado por OpenClaw es
  uso de arnés de terceros y requiere **Uso adicional**.
- Nuestras reproducciones locales también muestran que el
  `claude -p --append-system-prompt ...` directo puede alcanzar la misma protección cuando el
  prompt agregado identifica a OpenClaw.
- El mismo prompt del sistema tipo OpenClaw no activa esa protección en la
  ruta del SDK de Anthropic + `ANTHROPIC_API_KEY`.
- Utilice claves de API de Anthropic para el tráfico de Anthropic en OpenClaw.

## Notas

- La documentación pública de Claude Code de Anthropic todavía documenta el uso directo de la CLI, como `claude -p`, pero el aviso por separado de Anthropic a los usuarios de OpenClaw indica que la ruta de inicio de sesión de Claude de **OpenClaw** es un uso de arnés de terceros y requiere **Uso Adicional** (pago por uso facturado por separado de la suscripción). Nuestras reproducciones locales también muestran que el `claude -p --append-system-prompt ...` directo puede alcanzar la misma protección cuando el aviso anexado identifica a OpenClaw, mientras que la misma forma del aviso no se reproduce en la ruta del SDK de Anthropic + `ANTHROPIC_API_KEY`. Para producción, recomendamos claves de API de Anthropic en su lugar.
- El token de configuración de Anthropic está disponible nuevamente en OpenClaw como una ruta heredada/manual. El aviso de facturación específico de Anthropic para OpenClaw todavía se aplica, así que úselo con la expectativa de que Anthropic requiere **Uso Adicional** para esta ruta.
- Los detalles de autenticación y las reglas de reutilización se encuentran en [/concepts/oauth](/en/concepts/oauth).

## Solución de problemas

**Errores 401 / token inválido de repente**

- La autenticación por token heredada de Anthropic puede caducar o ser revocada.
- Para una nueva configuración, migre a una clave de API de Anthropic.

**No se encontró ninguna clave de API para el proveedor "anthropic"**

- La autenticación es **por agente**. Los nuevos agentes no heredan las claves del agente principal.
- Vuelva a ejecutar la incorporación para ese agente o configure una clave de API en el host de puerta de enlace, luego verifique con `openclaw models status`.

**No se encontraron credenciales para el perfil `anthropic:default`**

- Ejecute `openclaw models status` para ver qué perfil de autenticación está activo.
- Vuelva a ejecutar la incorporación o configure una clave de API para esa ruta de perfil.

**No hay ningún perfil de autenticación disponible (todos en período de enfriamiento/no disponibles)**

- Verifique `openclaw models status --json` para `auth.unusableProfiles`.
- Los períodos de enfriamiento por límite de velocidad de Anthropic pueden estar específicos del modelo, por lo que un modelo hermano de Anthropic todavía puede ser utilizable incluso cuando el actual se está enfriando.
- Agregue otro perfil de Anthropic o espere el período de enfriamiento.

Más información: [/gateway/troubleshooting](/en/gateway/troubleshooting) y [/help/faq](/en/help/faq).
