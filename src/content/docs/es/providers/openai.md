---
summary: "Usar OpenAI mediante claves de API o suscripción a Codex en OpenClaw"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
title: "OpenAI"
---

# OpenAI

OpenAI proporciona API para desarrolladores de modelos GPT. Codex admite el **inicio de sesión de ChatGPT** para el acceso por suscripción o el inicio de sesión con **clave de API** para el acceso basado en el uso. Codex cloud requiere el inicio de sesión de ChatGPT.
OpenAI admite explícitamente el uso de OAuth de suscripción en herramientas y flujos de trabajo externos como OpenClaw.

## Estilo de interacción predeterminado

OpenClaw puede añadir una pequeña superposición de instrucciones específica de OpenAI para ejecuciones tanto de `openai/*` como de
`openai-codex/*`. De forma predeterminada, la superposición mantiene al asistente cálido,
colaborativo, conciso, directo y un poco más expresivo emocionalmente
sin reemplazar la instrucción del sistema base de OpenClaw. La superposición amigable también
permite el uso ocasional de emojis cuando encaja naturalmente, manteniendo la salida general
concisa.

Clave de configuración:

`plugins.entries.openai.config.personality`

Valores permitidos:

- `"friendly"`: predeterminado; activa la superposición específica de OpenAI.
- `"off"`: desactiva la superposición y usa solo la instrucción base de OpenClaw.

Ámbito:

- Se aplica a modelos `openai/*`.
- Se aplica a modelos `openai-codex/*`.
- No afecta a otros proveedores.

Este comportamiento está activado de forma predeterminada. Mantenga `"friendly"` explícitamente si desea que
sobreviva a futuros cambios en la configuración local:

```json5
{
  plugins: {
    entries: {
      openai: {
        config: {
          personality: "friendly",
        },
      },
    },
  },
}
```

### Desactivar la superposición de instrucciones de OpenAI

Si desea la instrucción base de OpenClaw sin modificar, establezca la superposición en `"off"`:

```json5
{
  plugins: {
    entries: {
      openai: {
        config: {
          personality: "off",
        },
      },
    },
  },
}
```

También puede establecerla directamente con la CLI de configuración:

```bash
openclaw config set plugins.entries.openai.config.personality off
```

## Opción A: Clave de API de OpenAI (Plataforma OpenAI)

**Lo mejor para:** acceso directo a la API y facturación basada en el uso.
Obtenga su clave de API desde el panel de control de OpenAI.

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
de la API de OpenAI. OpenClaw reenvía ambos a través de la ruta de `openai/*` Responses.
OpenClaw suprime intencionadamente la fila obsoleta `openai/gpt-5.3-codex-spark`,
ya que las llamadas directas a la API de OpenAI la rechazan en el tráfico en vivo.

OpenClaw **no** expone `openai/gpt-5.3-codex-spark` en la ruta directa de la API de
OpenAI. `pi-ai` todavía incluye una fila incorporada para ese modelo, pero las solicitudes en vivo a la API de OpenAI
actualmente la rechazan. Spark se trata como exclusivo de Codex en OpenClaw.

## Generación de imágenes

El complemento incluido `openai` también registra la generación de imágenes a través de la herramienta compartida `image_generate`.

- Modelo de imagen predeterminado: `openai/gpt-image-1`
- Generar: hasta 4 imágenes por solicitud
- Modo de edición: habilitado, hasta 5 imágenes de referencia
- Admite `size`
- Salvedad actual específica de OpenAI: OpenClaw no reenvía las anulaciones `aspectRatio` o `resolution` a la API de imágenes de OpenAI hoy en día

Para usar OpenAI como proveedor de imágenes predeterminado:

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-1",
      },
    },
  },
}
```

Consulte [Generación de imágenes](/en/tools/image-generation) para conocer los parámetros de la herramienta compartida, la selección del proveedor y el comportamiento de conmutación por error.

## Generación de video

El complemento incluido `openai` también registra la generación de video a través de la herramienta compartida `video_generate`.

- Modelo de video predeterminado: `openai/sora-2`
- Modos: texto a video, imagen a video y flujos de referencia/edición de video único
- Límites actuales: 1 imagen o 1 entrada de referencia de video
- Salvedad actual específica de OpenAI: OpenClaw actualmente solo reenvía las anulaciones `size` para la generación de video nativa de OpenAI. Las anulaciones opcionales no admitidas, como `aspectRatio`, `resolution`, `audio` y `watermark`, se ignoran y se informan como una advertencia de la herramienta.

Para usar OpenAI como proveedor de video predeterminado:

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "openai/sora-2",
      },
    },
  },
}
```

Consulte [Generación de video](/en/tools/video-generation) para conocer los parámetros de la herramienta compartida, la selección del proveedor y el comportamiento de conmutación por error.

## Opción B: Suscripción a OpenAI Code (Codex)

**Lo mejor para:** usar el acceso de suscripción a ChatGPT/Codex en lugar de una clave de API. Codex cloud requiere iniciar sesión en ChatGPT, mientras que la CLI de Codex admite el inicio de sesión con ChatGPT o clave de API.

### Configuración de CLI (Codex OAuth)

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

La documentación actual de Codex de OpenAI lista `gpt-5.4` como el modelo Codex actual. OpenClaw lo asigna a `openai-codex/gpt-5.4` para el uso de OAuth de ChatGPT/Codex.

Si el onboarding reutiliza un inicio de sesión existente de la CLI de Codex, esas credenciales siguen siendo administradas por la CLI de Codex. Al expirar, OpenClaw vuelve a leer la fuente externa de Codex primero y, cuando el proveedor puede actualizarla, escribe la credencial actualizada de nuevo en el almacenamiento de Codex en lugar de tomar posesión en una copia separada exclusiva de OpenClaw.

Si su cuenta de Codex tiene derecho a Codex Spark, OpenClaw también admite:

- `openai-codex/gpt-5.3-codex-spark`

OpenClaw trata a Codex Spark como exclusivo de Codex. No expone una ruta directa de clave de API `openai/gpt-5.3-codex-spark`.

OpenClaw también conserva `openai-codex/gpt-5.3-codex-spark` cuando `pi-ai` la descubre. Trátela como dependiente de los derechos y experimental: Codex Spark es independiente de GPT-5.4 `/fast`, y su disponibilidad depende de la cuenta de Codex / ChatGPT iniciada.

### Límite de la ventana de contexto de Codex

OpenClaw trata los metadatos del modelo Codex y el límite de contexto de tiempo de ejecución como valores separados.

Para `openai-codex/gpt-5.4`:

- `contextWindow` nativo: `1050000`
- límite de `contextTokens` de tiempo de ejecución predeterminado: `272000`

Esto mantiene los metadatos del modelo veraces mientras se conserva la ventana de tiempo de ejecución predeterminada más pequeña que tiene mejores características de latencia y calidad en la práctica.

Si desea un límite efectivo diferente, establezca `models.providers.<provider>.models[].contextTokens`:

```json5
{
  models: {
    providers: {
      "openai-codex": {
        models: [
          {
            id: "gpt-5.4",
            contextTokens: 160000,
          },
        ],
      },
    },
  },
}
```

Use `contextWindow` solo cuando esté declarando o anulando los metadatos nativos del modelo. Use `contextTokens` cuando desee limitar el presupuesto de contexto de tiempo de ejecución.

### Transporte predeterminado

OpenClaw usa `pi-ai` para la transmisión del modelo. Tanto para `openai/*` como para `openai-codex/*`, el transporte predeterminado es `"auto"` (WebSocket primero, luego alternativa SSE).

En el modo `"auto"`, OpenClaw también reintenta un fallo temprano y reintentable de WebSocket antes de pasar a SSE. El modo `"websocket"` forzado aún muestra los errores de transporte directamente en lugar de ocultarlos detrás de la alternativa.

Después de un error de conexión o de turno temprano de WebSocket en el modo `"auto"`, OpenClaw marca
la ruta de WebSocket de esa sesión como degradada durante unos 60 segundos y envía
los turnos subsiguientes a través de SSE durante el enfriamiento en lugar de alternar
violentamente entre transportes.

Para los endpoints nativos de la familia OpenAI (`openai/*`, `openai-codex/*` y Azure
OpenAI Responses), OpenClaw también adjunta el estado de identidad de sesión y turno estable
a las solicitudes para que los reintentos, reconexiones y la reserva a SSE se mantengan alineados con la misma
identidad de conversación. En las rutas nativas de la familia OpenAI, esto incluye encabezados de identidad de solicitud de sesión/turno estables más metadatos de transporte coincidentes.

OpenClaw también normaliza los contadores de uso de OpenAI en las variantes de transporte antes de
que alcancen las superficies de sesión/estado. El tráfico de Responses nativo de OpenAI/Codex puede
reportar el uso como `input_tokens` / `output_tokens` o
`prompt_tokens` / `completion_tokens`; OpenClaw trata esos como los mismos contadores
de entrada y salida para `/status`, `/usage` y los registros de sesión. Cuando el tráfico
nativo de WebSocket omite `total_tokens` (o reporta `0`), OpenClaw recurre al
total normalizado de entrada + salida para que las visualizaciones de sesión/estado se mantengan pobladas.

Puede establecer `agents.defaults.models.<provider/model>.params.transport`:

- `"sse"`: forzar SSE
- `"websocket"`: forzar WebSocket
- `"auto"`: intentar WebSocket, luego volver a SSE

Para `openai/*` (Responses API), OpenClaw también habilita el calentamiento de WebSocket por
defecto (`openaiWsWarmup: true`) cuando se utiliza el transporte WebSocket.

Documentación relacionada de OpenAI:

- [Realtime API con WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
- [Respuestas de API de streaming (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

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

La documentación de OpenAI describe el calentamiento como opcional. OpenClaw lo habilita de forma predeterminada para
`openai/*` para reducir la latencia del primer turno al utilizar el transporte WebSocket.

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

### Procesamiento prioritario de OpenAI y Codex

La API de OpenAI expone el procesamiento prioritario a través de `service_tier=priority`. En
OpenClaw, establezca `agents.defaults.models["<provider>/<model>"].params.serviceTier`
para pasar ese campo a través de los puntos finales de respuestas nativos de OpenAI/Codex.

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
        "openai-codex/gpt-5.4": {
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

OpenClaw reenvía `params.serviceTier` tanto a las solicitudes de respuestas `openai/*`
directas como a las solicitudes de respuestas de Codex `openai-codex/*` cuando esos modelos apuntan
a los puntos finales nativos de OpenAI/Codex.

Comportamiento importante:

- `openai/*` directo debe apuntar a `api.openai.com`
- `openai-codex/*` debe apuntar a `chatgpt.com/backend-api`
- si enruta cualquiera de los proveedores a través de otra URL base o proxy, OpenClaw deja `service_tier` intacto

### Modo rápido de OpenAI

OpenClaw expone un interruptor de modo rápido compartido tanto para `openai/*` como para
las sesiones `openai-codex/*`:

- Chat/UI: `/fast status|on|off`
- Configuración: `agents.defaults.models["<provider>/<model>"].params.fastMode`

Cuando el modo rápido está habilitado, OpenClaw lo asigna al procesamiento prioritario de OpenAI:

- las llamadas de respuestas `openai/*` directas a `api.openai.com` envían `service_tier = "priority"`
- las llamadas de respuestas de `openai-codex/*` a `chatgpt.com/backend-api` también envían `service_tier = "priority"`
- los valores `service_tier` del payload existente se conservan
- el modo rápido no reescribe `reasoning` ni `text.verbosity`

Específicamente para GPT 5.4, la configuración más común es:

- envíe `/fast on` en una sesión usando `openai/gpt-5.4` o `openai-codex/gpt-5.4`
- o establezca `agents.defaults.models["openai/gpt-5.4"].params.fastMode = true`
- si también usa Codex OAuth, establezca `agents.defaults.models["openai-codex/gpt-5.4"].params.fastMode = true` también

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

Las anulaciones de sesión tienen prioridad sobre la configuración. Borrar la anulación de la sesión en la interfaz de usuario de Sesiones
devuelve la sesión al valor predeterminado configurado.

### OpenAI nativo versus rutas compatibles con OpenAI

OpenClaw trata los puntos de conexión directos de OpenAI, Codex y Azure OpenAI de manera diferente a los proxies compatibles con OpenAI genéricos `/v1`:

- las rutas nativas de `openai/*`, `openai-codex/*` y Azure OpenAI mantienen
  `reasoning: { effort: "none" }` intacto cuando deshabilitas explícitamente el razonamiento
- las rutas nativas de la familia OpenAI configuran por defecto los esquemas de herramientas en modo estricto
- los encabezados ocultos de atribución de OpenClaw (`originator`, `version` y
  `User-Agent`) solo se adjuntan en los hosts nativos verificados de OpenAI
  (`api.openai.com`) y hosts nativos de Codex (`chatgpt.com/backend-api`)
- las rutas nativas de OpenAI/Codex mantienen la conformación de solicitudes exclusiva de OpenAI, como
  `service_tier`, Responses `store`, cargas útiles compatibles con el razonamiento de OpenAI y
  sugerencias de caché de prompt
- las rutas compatibles con OpenAI de estilo proxy mantienen el comportamiento de compatibilidad más flexible y no
  fuerzan esquemas de herramientas estrictos, conformación de solicitudes solo nativa, ni encabezados ocultos
  de atribución de OpenAI/Codex

Azure OpenAI se mantiene en el grupo de enrutamiento nativo para el transporte y el comportamiento
de compatibilidad, pero no recibe los encabezados ocultos de atribución de OpenAI/Codex.

Esto preserva el comportamiento actual de las Responses nativas de OpenAI sin forzar adaptadores
compatibles con OpenAI más antiguos en backends de terceros `/v1`.

### Compactación del lado del servidor de OpenAI Responses

Para modelos directos de OpenAI Responses (`openai/*` usando `api: "openai-responses"` con
`baseUrl` en `api.openai.com`), OpenClaw ahora activa automáticamente las sugerencias
de carga útil de compactación del lado del servidor de OpenAI:

- Fuerza `store: true` (a menos que la compatibilidad del modelo establezca `supportsStore: false`)
- Inyecta `context_management: [{ type: "compaction", compact_threshold: ... }]`

De forma predeterminada, `compact_threshold` es `70%` del modelo `contextWindow` (o `80000`
cuando no está disponible).

### Habilitar explícitamente la compactación del lado del servidor

Úsalo cuando quieras forzar la inyección de `context_management` en modelos
Responses compatibles (por ejemplo, Azure OpenAI Responses):

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

### Habilitar con un umbral personalizado

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

### Deshabilitar la compactación del lado del servidor

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

`responsesServerCompaction` solo controla la inyección de `context_management`.
Los modelos de Respuestas Directas de OpenAI todavía fuerzan `store: true` a menos que compat establezca
`supportsStore: false`.

## Notas

- Las referencias de modelo siempre usan `provider/model` (consulte [/concepts/models](/en/concepts/models)).
- Los detalles de autenticación y las reglas de reutilización están en [/concepts/oauth](/en/concepts/oauth).
