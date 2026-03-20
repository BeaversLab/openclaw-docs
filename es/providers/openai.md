---
summary: "Usar OpenAI mediante claves de API o suscripción a Codex en OpenClaw"
read_when:
  - Deseas utilizar modelos de OpenAI en OpenClaw
  - Deseas la autenticación por suscripción a Codex en lugar de claves de API
title: "OpenAI"
---

# OpenAI

OpenAI proporciona API para desarrolladores de modelos GPT. Codex admite el **inicio de sesión de ChatGPT** para el acceso por suscripción o el inicio de sesión con **clave de API** para el acceso basado en el uso. La nube de Codex requiere el inicio de sesión de ChatGPT.
OpenAI admite explícitamente el uso de OAuth de suscripción en herramientas/flujos de trabajo externos como OpenClaw.

## Opción A: clave de API de OpenAI (Plataforma OpenAI)

**Lo mejor para:** acceso directo a la API y facturación basada en el uso.
Obtén tu clave de API desde el panel de control de OpenAI.

### Configuración de CLI

```bash
openclaw onboard --auth-choice openai-api-key
# or non-interactive
openclaw onboard --openai-api-key "$OPENAI_API_KEY"
```

### Fragmento de configuración

```json5
{
  env: { OPENAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

La documentación actual del modelo de API de OpenAI enumera `gpt-5.4` y `gpt-5.4-pro` para el uso directo
de la API de OpenAI. OpenClaw reenvía ambos a través de la ruta de Respuestas `openai/*`.
OpenClaw suprime intencionalmente la fila obsoleta `openai/gpt-5.3-codex-spark`,
porque las llamadas directas a la API de OpenAI la rechazan en el tráfico en vivo.

OpenClaw **no** expone `openai/gpt-5.3-codex-spark` en la ruta directa de la API
de OpenAI. `pi-ai` todavía incluye una fila integrada para ese modelo, pero las solicitudes en vivo a la API de OpenAI
actualmente la rechazan. Spark se trata como exclusivo de Codex en OpenClaw.

## Opción B: suscripción a OpenAI Code (Codex)

**Lo mejor para:** usar el acceso por suscripción a ChatGPT/Codex en lugar de una clave de API.
La nube de Codex requiere el inicio de sesión de ChatGPT, mientras que la CLI de Codex admite el inicio de sesión con ChatGPT o clave de API.

### Configuración de CLI (OAuth de Codex)

```bash
# Run Codex OAuth in the wizard
openclaw onboard --auth-choice openai-codex

# Or run OAuth directly
openclaw models auth login --provider openai-codex
```

### Fragmento de configuración (suscripción a Codex)

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

La documentación actual de Codex de OpenAI enumera `gpt-5.4` como el modelo de Codex actual. OpenClaw
lo asigna a `openai-codex/gpt-5.4` para el uso de OAuth de ChatGPT/Codex.

Si tu cuenta de Codex tiene derecho a Codex Spark, OpenClaw también admite:

- `openai-codex/gpt-5.3-codex-spark`

OpenClaw trata a Codex Spark como exclusivo de Codex. No expone una ruta directa
de clave de API `openai/gpt-5.3-codex-spark`.

OpenClaw también conserva `openai-codex/gpt-5.3-codex-spark` cuando `pi-ai`
lo descubre. Trátalo como dependiente de derechos y experimental: Codex Spark es
separado de GPT-5.4 `/fast`, y su disponibilidad depende de la cuenta de Codex /
ChatGPT iniciada.

### Predeterminado de transporte

OpenClaw usa `pi-ai` para la transmisión de modelos. Tanto para `openai/*` como para `openai-codex/*`, el transporte predeterminado es `"auto"` (primero WebSocket, luego retorno SSE).

Puede establecer `agents.defaults.models.<provider/model>.params.transport`:

- `"sse"`: forzar SSE
- `"websocket"`: forzar WebSocket
- `"auto"`: intentar WebSocket, luego volver a SSE

Para `openai/*` (API de Responses), OpenClaw también habilita el calentamiento de WebSocket de forma predeterminada (`openaiWsWarmup: true`) cuando se utiliza el transporte WebSocket.

Documentación relacionada de OpenAI:

- [API en tiempo real con WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
- [Respuestas de API de transmisión (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

```json5
{
  agents: {
    defaults: {
      model: { primary: "openai-codex/gpt-5.4" },
      models: {
        "openai-codex/gpt-5.4": {
          params: {
            transport: "auto",
          },
        },
      },
    },
  },
}
```

### Calentamiento de WebSocket de OpenAI

La documentación de OpenAI describe el calentamiento como opcional. OpenClaw lo habilita de forma predeterminada para `openai/*` para reducir la latencia del primer turno al utilizar el transporte WebSocket.

### Deshabilitar calentamiento

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            openaiWsWarmup: false,
          },
        },
      },
    },
  },
}
```

### Habilitar calentamiento explícitamente

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            openaiWsWarmup: true,
          },
        },
      },
    },
  },
}
```

### Procesamiento prioritario de OpenAI

La API de OpenAI expone el procesamiento prioritario a través de `service_tier=priority`. En OpenClaw, establezca `agents.defaults.models["openai/<model>"].params.serviceTier` para pasar ese campo en las solicitudes directas de Responses de `openai/*`.

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            serviceTier: "priority",
          },
        },
      },
    },
  },
}
```

Los valores admitidos son `auto`, `default`, `flex` y `priority`.

### Modo rápido de OpenAI

OpenClaw expone un interruptor de modo rápido compartido para las sesiones de `openai/*` y `openai-codex/*`:

- Chat/Interfaz de usuario: `/fast status|on|off`
- Configuración: `agents.defaults.models["<provider>/<model>"].params.fastMode`

Cuando el modo rápido está habilitado, OpenClaw aplica un perfil de baja latencia de OpenAI:

- `reasoning.effort = "low"` cuando la carga útil no especifica ya el razonamiento
- `text.verbosity = "low"` cuando la carga útil no especifica ya la verbosidad
- `service_tier = "priority"` para llamadas directas de Responses de `openai/*` a `api.openai.com`

Ejemplo:

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            fastMode: true,
          },
        },
        "openai-codex/gpt-5.4": {
          params: {
            fastMode: true,
          },
        },
      },
    },
  },
}
```

Las anulaciones de sesión tienen prioridad sobre la configuración. Al borrar la anulación de la sesión en la interfaz de usuario de Sesiones, la sesión vuelve al valor predeterminado configurado.

### Compactación del lado del servidor de OpenAI Responses

Para modelos de OpenAI Responses directos (`openai/*` usando `api: "openai-responses"` con `baseUrl` en `api.openai.com`), OpenClaw ahora activa automáticamente las sugerencias de carga de compactación del lado del servidor de OpenAI:

- Fuerza `store: true` (a menos que la compatibilidad del modelo establezca `supportsStore: false`)
- Inyecta `context_management: [{ type: "compaction", compact_threshold: ... }]`

De forma predeterminada, `compact_threshold` es `70%` del modelo `contextWindow` (o `80000` cuando no está disponible).

### Activar la compactación del lado del servidor explícitamente

Úselo cuando desee forzar la inyección de `context_management` en modelos Responses compatibles (por ejemplo, Azure OpenAI Responses):

```json5
{
  agents: {
    defaults: {
      models: {
        "azure-openai-responses/gpt-5.4": {
          params: {
            responsesServerCompaction: true,
          },
        },
      },
    },
  },
}
```

### Activar con un umbral personalizado

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            responsesServerCompaction: true,
            responsesCompactThreshold: 120000,
          },
        },
      },
    },
  },
}
```

### Desactivar la compactación del lado del servidor

```json5
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            responsesServerCompaction: false,
          },
        },
      },
    },
  },
}
```

`responsesServerCompaction` solo controla la inyección de `context_management`. Los modelos directos de OpenAI Responses aún fuerzan `store: true` a menos que la compatibilidad establezca `supportsStore: false`.

## Notas

- Las referencias de modelos siempre usan `provider/model` (consulte [/concepts/models](/es/concepts/models)).
- Los detalles de autenticación y las reglas de reutilización se encuentran en [/concepts/oauth](/es/concepts/oauth).

import en from "/components/footer/en.mdx";

<en />
