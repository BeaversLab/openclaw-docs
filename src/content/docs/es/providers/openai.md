---
summary: "Usar OpenAI mediante claves de API o suscripción Codex en OpenClaw"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAI"
---

# OpenAI

OpenAI proporciona API para desarrolladores de modelos GPT. OpenClaw admite dos rutas de autenticación:

- **Clave de API** — acceso directo a la plataforma de OpenAI con facturación basada en el uso (modelos `openai/*`)
- **Suscripción Codex** — inicio de sesión en ChatGPT/Codex con acceso por suscripción (modelos `openai-codex/*`)

OpenAI admite explícitamente el uso de OAuth por suscripción en herramientas y flujos de trabajo externos como OpenClaw.

## Introducción

Elige tu método de autenticación preferido y sigue los pasos de configuración.

<Tabs>
  <Tab title="Clave de API (Plataforma OpenAI)">
    **Lo mejor para:** acceso directo a la API y facturación basada en el uso.

    <Steps>
      <Step title="Obtén tu clave de API">
        Crea o copia una clave de API desde el [panel de la plataforma de OpenAI](https://platform.openai.com/api-keys).
      </Step>
      <Step title="Ejecuta la incorporación">
        ```bash
        openclaw onboard --auth-choice openai-api-key
        ```

        O pasa la clave directamente:

        ```bash
        openclaw onboard --openai-api-key "$OPENAI_API_KEY"
        ```
      </Step>
      <Step title="Verifica que el modelo esté disponible">
        ```bash
        openclaw models list --provider openai
        ```
      </Step>
    </Steps>

    ### Resumen de rutas

    | Ref. de modelo | Ruta | Autenticación |
    |-----------|-------|------|
    | `openai/gpt-5.4` | API directa de la plataforma OpenAI | `OPENAI_API_KEY` |
    | `openai/gpt-5.4-pro` | API directa de la plataforma OpenAI | `OPENAI_API_KEY` |

    <Note>
    El inicio de sesión de ChatGPT/Codex se enruta a través de `openai-codex/*`, no de `openai/*`.
    </Note>

    ### Ejemplo de configuración

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
    }
    ```

    <Warning>
    OpenClaw **no** expone `openai/gpt-5.3-codex-spark` en la ruta de API directa. Las solicitudes en vivo a la API de OpenAI rechazan ese modelo. Spark es solo para Codex.
    </Warning>

  </Tab>

  <Tab title="Suscripción a Codex">
    **Lo mejor para:** usar tu suscripción a ChatGPT/Codex en lugar de una clave API separada. La nube de Codex requiere iniciar sesión en ChatGPT.

    <Steps>
      <Step title="Ejecutar Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        O ejecuta OAuth directamente:

        ```bash
        openclaw models auth login --provider openai-codex
        ```
      </Step>
      <Step title="Establecer el modelo predeterminado">
        ```bash
        openclaw config set agents.defaults.model.primary openai-codex/gpt-5.4
        ```
      </Step>
      <Step title="Verificar que el modelo esté disponible">
        ```bash
        openclaw models list --provider openai-codex
        ```
      </Step>
    </Steps>

    ### Resumen de la ruta

    | Ref. de modelo | Ruta | Autenticación |
    |-----------|-------|------|
    | `openai-codex/gpt-5.4` | ChatGPT/Codex OAuth | Inicio de sesión en Codex |
    | `openai-codex/gpt-5.3-codex-spark` | ChatGPT/Codex OAuth | Inicio de sesión en Codex (depende de los derechos) |

    <Note>
    Esta ruta está intencionalmente separada de `openai/gpt-5.4`. Usa `openai/*` con una clave API para el acceso directo a la plataforma, y `openai-codex/*` para el acceso mediante suscripción a Codex.
    </Note>

    ### Ejemplo de configuración

    ```json5
    {
      agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
    }
    ```

    <Tip>
    Si la incorporación reutiliza un inicio de sesión existente de la CLI de Codex, esas credenciales seguirán siendo gestionadas por la CLI de Codex. Al expirar, OpenClaw vuelve a leer la fuente externa de Codex primero y escribe las credenciales actualizadas de nuevo en el almacenamiento de Codex.
    </Tip>

    ### Límite de la ventana de contexto

    OpenClaw trata los metadatos del modelo y el límite de contexto de ejecución como valores separados.

    Para `openai-codex/gpt-5.4`:

    - `contextWindow` nativo: `1050000`
    - Límite de `contextTokens` de ejecución predeterminado: `272000`

    El límite predeterminado más pequeño tiene mejores características de latencia y calidad en la práctica. Anúlalo con `contextTokens`:

    ```json5
    {
      models: {
        providers: {
          "openai-codex": {
            models: [{ id: "gpt-5.4", contextTokens: 160000 }],
          },
        },
      },
    }
    ```

    <Note>
    Usa `contextWindow` para declarar los metadatos del modelo nativo. Usa `contextTokens` para limitar el presupuesto de contexto de ejecución.
    </Note>

  </Tab>
</Tabs>

## Generación de imágenes

El complemento `openai` incluido registra la generación de imágenes a través de la herramienta `image_generate`.

| Capacidad                        | Valor                                       |
| -------------------------------- | ------------------------------------------- |
| Modelo predeterminado            | `openai/gpt-image-1`                        |
| Máximo de imágenes por solicitud | 4                                           |
| Modo de edición                  | Habilitado (hasta 5 imágenes de referencia) |
| Anulaciones de tamaño            | Compatible                                  |
| Relación de aspecto / resolución | No se reenvía a la API de OpenAI Images     |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-1" },
    },
  },
}
```

<Note>Vea [Image Generation](/es/tools/image-generation) para los parámetros de herramienta compartidos, selección de proveedor y comportamiento de conmutación por error.</Note>

## Generación de video

El complemento incluido `openai` registra la generación de video a través de la herramienta `video_generate`.

| Capacidad              | Valor                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Modelo predeterminado  | `openai/sora-2`                                                                                 |
| Modos                  | Texto a video, imagen a video, edición de video único                                           |
| Entradas de referencia | 1 imagen o 1 video                                                                              |
| Anulaciones de tamaño  | Compatible                                                                                      |
| Otras anulaciones      | `aspectRatio`, `resolution`, `audio`, `watermark` se ignoran con una advertencia de herramienta |

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>Vea [Video Generation](/es/tools/video-generation) para los parámetros de herramienta compartidos, selección de proveedor y comportamiento de conmutación por error.</Note>

## Superposición de personalidad

OpenClaw añade una pequeña superposición de prompt específica de OpenAI para ejecuciones de `openai/*` y `openai-codex/*`. La superposición mantiene al asistente cálido, colaborativo, conciso y un poco más expresivo emocionalmente sin reemplazar el prompt del sistema base.

| Valor                         | Efecto                                          |
| ----------------------------- | ----------------------------------------------- |
| `"friendly"` (predeterminado) | Habilitar la superposición específica de OpenAI |
| `"on"`                        | Alias de `"friendly"`                           |
| `"off"`                       | Usar solo el mensaje base de OpenClaw           |

<Tabs>
  <Tab title="Configuración">
    ```json5
    {
      plugins: {
        entries: {
          openai: { config: { personality: "friendly" } },
        },
      },
    }
    ```
  </Tab>
  <Tab title="Línea de comandos">
    ```bash
    openclaw config set plugins.entries.openai.config.personality off
    ```
  </Tab>
</Tabs>

<Tip>Los valores no distinguen entre mayúsculas y minúsculas en tiempo de ejecución, por lo que tanto `"Off"` como `"off"` desactivan la superposición de personalidad.</Tip>

## Voz y habla

<AccordionGroup>
  <Accordion title="Síntesis de voz (TTS)">
    El complemento incluido `openai` registra la síntesis de voz para la superficie `messages.tts`.

    | Configuración | Ruta de configuración | Predeterminado |
    |---------|------------|---------|
    | Modelo | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | Voz | `messages.tts.providers.openai.voice` | `coral` |
    | Velocidad | `messages.tts.providers.openai.speed` | (sin establecer) |
    | Instrucciones | `messages.tts.providers.openai.instructions` | (sin establecer, solo `gpt-4o-mini-tts`) |
    | Formato | `messages.tts.providers.openai.responseFormat` | `opus` para notas de voz, `mp3` para archivos |
    | Clave de API | `messages.tts.providers.openai.apiKey` | Recurre a `OPENAI_API_KEY` |
    | URL base | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |

    Modelos disponibles: `gpt-4o-mini-tts`, `tts-1`, `tts-1-hd`. Voces disponibles: `alloy`, `ash`, `ballad`, `cedar`, `coral`, `echo`, `fable`, `juniper`, `marin`, `onyx`, `nova`, `sage`, `shimmer`, `verse`.

    ```json5
    {
      messages: {
        tts: {
          providers: {
            openai: { model: "gpt-4o-mini-tts", voice: "coral" },
          },
        },
      },
    }
    ```

    <Note>
    Establezca `OPENAI_TTS_BASE_URL` para anular la URL base de TTS sin afectar el punto final de la API de chat.
    </Note>

  </Accordion>

  <Accordion title="Transcripción en tiempo real">
    El complemento incluido `openai` registra la transcripción en tiempo real para el complemento Voice Call.

    | Configuración | Ruta de configuración | Predeterminado |
    |---------|------------|---------|
    | Modelo | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | Duración del silencio | `...openai.silenceDurationMs` | `800` |
    | Umbral de VAD | `...openai.vadThreshold` | `0.5` |
    | Clave de API | `...openai.apiKey` | Se recurre a `OPENAI_API_KEY` |

    <Note>
    Utiliza una conexión WebSocket a `wss://api.openai.com/v1/realtime` con audio G.711 u-law.
    </Note>

  </Accordion>

  <Accordion title="Voz en tiempo real">
    El complemento incluido `openai` registra la voz en tiempo real para el complemento Voice Call.

    | Configuración | Ruta de configuración | Predeterminado |
    |---------|------------|---------|
    | Modelo | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime` |
    | Voz | `...openai.voice` | `alloy` |
    | Temperatura | `...openai.temperature` | `0.8` |
    | Umbral de VAD | `...openai.vadThreshold` | `0.5` |
    | Duración del silencio | `...openai.silenceDurationMs` | `500` |
    | Clave de API | `...openai.apiKey` | Se recurre a `OPENAI_API_KEY` |

    <Note>
    Admite Azure OpenAI mediante las claves de configuración `azureEndpoint` y `azureDeployment`. Admite la llamada a herramientas bidireccional. Utiliza el formato de audio G.711 u-law.
    </Note>

  </Accordion>
</AccordionGroup>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Transporte (WebSocket vs SSE)">
    OpenClaw usa WebSocket primero con SSE como alternativa (`"auto"`) tanto para `openai/*` como para `openai-codex/*`.

    En el modo `"auto"`, OpenClaw:
    - Reintenta un fallo temprano de WebSocket antes de cambiar a SSE
    - Después de un fallo, marca WebSocket como degradado durante ~60 segundos y usa SSE durante el enfriamiento
    - Adjunta encabezados de identidad de sesión y turno estables para reintentos y reconexiones
    - Normaliza los contadores de uso (`input_tokens` / `prompt_tokens`) entre variantes de transporte

    | Valor | Comportamiento |
    |-------|----------|
    | `"auto"` (predeterminado) | WebSocket primero, alternativa SSE |
    | `"sse"` | Forzar solo SSE |
    | `"websocket"` | Forzar solo WebSocket |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai-codex/gpt-5.4": {
              params: { transport: "auto" },
            },
          },
        },
      },
    }
    ```

    Documentos relacionados de OpenAI:
    - [API en tiempo real con WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
    - [Respuestas de API de transmisión (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="Calentamiento de WebSocket">
    OpenClaw habilita el calentamiento de WebSocket por defecto para `openai/*` para reducir la latencia del primer turno.

    ```json5
    // Disable warm-up
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": {
              params: { openaiWsWarmup: false },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Modo rápido">
    OpenClaw expone un interruptor de modo rápido compartido tanto para `openai/*` como para `openai-codex/*`:

    - **Chat/Interfaz:** `/fast status|on|off`
    - **Configuración:** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    Cuando está habilitado, OpenClaw asigna el modo rápido al procesamiento prioritario de OpenAI (`service_tier = "priority"`). Los valores `service_tier` existentes se conservan, y el modo rápido no reescribe `reasoning` ni `text.verbosity`.

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": { params: { fastMode: true } },
            "openai-codex/gpt-5.4": { params: { fastMode: true } },
          },
        },
      },
    }
    ```

    <Note>
    Las anulaciones de sesión tienen prioridad sobre la configuración. Al borrar la anulación de sesión en la interfaz de Sesiones, la sesión vuelve al valor predeterminado configurado.
    </Note>

  </Accordion>

  <Accordion title="Procesamiento prioritario (service_tier)">
    La API de OpenAI expone el procesamiento prioritario a través de `service_tier`. Configúrelo por modelo en OpenClaw:

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": { params: { serviceTier: "priority" } },
            "openai-codex/gpt-5.4": { params: { serviceTier: "priority" } },
          },
        },
      },
    }
    ```

    Valores admitidos: `auto`, `default`, `flex`, `priority`.

    <Warning>
    `serviceTier` solo se reenvía a los endpoints nativos de OpenAI (`api.openai.com`) y a los endpoints nativos de Codex (`chatgpt.com/backend-api`). Si enruta cualquiera de los proveedores a través de un proxy, OpenClaw deja `service_tier` sin modificar.
    </Warning>

  </Accordion>

  <Accordion title="Compactación del lado del servidor (Responses API)">
    Para los modelos directos de OpenAI Responses (`openai/*` en `api.openai.com`), OpenClaw habilita automáticamente la compactación del lado del servidor:

    - Fuerza `store: true` (a menos que la compatibilidad del modelo establezca `supportsStore: false`)
    - Inyecta `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - `compact_threshold` predeterminado: 70% de `contextWindow` (o `80000` cuando no esté disponible)

    <Tabs>
      <Tab title="Habilitar explícitamente">
        Útil para endpoints compatibles como Azure OpenAI Responses:

        ```json5
        {
          agents: {
            defaults: {
              models: {
                "azure-openai-responses/gpt-5.4": {
                  params: { responsesServerCompaction: true },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="Umbral personalizado">
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
      </Tab>
      <Tab title="Deshabilitar">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.4": {
                  params: { responsesServerCompaction: false },
                },
              },
            },
          },
        }
        ```
      </Tab>
    </Tabs>

    <Note>
    `responsesServerCompaction` solo controla la inyección de `context_management`. Los modelos directos de OpenAI Responses siguen forzando `store: true` a menos que la compatibilidad establezca `supportsStore: false`.
    </Note>

  </Accordion>

  <Accordion title="Modo GPT agente estricto">
    Para ejecuciones de la familia GPT-5 en `openai/*` y `openai-codex/*`, OpenClaw puede utilizar un contrato de ejecución integrado más estricto:

    ```json5
    {
      agents: {
        defaults: {
          embeddedPi: { executionContract: "strict-agentic" },
        },
      },
    }
    ```

    Con `strict-agentic`, OpenClaw:
    - Ya no trata un turno de solo planificación como un progreso exitoso cuando hay una acción de herramienta disponible
    - Reintenta el turno con una guía de acción inmediata
    - Habilita automáticamente `update_plan` para trabajos sustanciales
    - Muestra un estado de bloqueo explícito si el modelo sigue planificando sin actuar

    <Note>
    Limitado únicamente a ejecuciones de la familia GPT-5 de OpenAI y Codex. Otros proveedores y familias de modelos antiguas mantienen el comportamiento predeterminado.
    </Note>

  </Accordion>

  <Accordion title="Rutas nativas frente a compatibles con OpenAI">
    OpenClaw trata los puntos finales directos de OpenAI, Codex y Azure OpenAI de manera diferente a los proxies genéricos compatibles con OpenAI `/v1`:

    **Rutas nativas** (`openai/*`, `openai-codex/*`, Azure OpenAI):
    - Mantiene `reasoning: { effort: "none" }` intacto cuando el razonamiento está explícitamente deshabilitado
    - De forma predeterminada, establece los esquemas de herramientas en modo estricto
    - Adjunta encabezados de atribución ocultos solo en hosts nativos verificados
    - Mantiene la conformación de solicitudes exclusiva de OpenAI (`service_tier`, `store`, compatibilidad de razonamiento, sugerencias de caché de prompt)

    **Rutas de proxy/compatibles:**
    - Utilizan un comportamiento de compatibilidad más laxo
    - No fuerzan esquemas de herramientas estrictos ni encabezados exclusivos de nativos

    Azure OpenAI utiliza transporte nativo y comportamiento de compatibilidad, pero no recibe los encabezados de atribución ocultos.

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelo y comportamiento de conmutación por error.
  </Card>
  <Card title="Generación de imágenes" href="/es/tools/image-generation" icon="image">
    Parámetros compartidos de la herramienta de imagen y selección del proveedor.
  </Card>
  <Card title="Generación de video" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de video y selección del proveedor.
  </Card>
  <Card title="OAuth y autenticación" href="/es/gateway/authentication" icon="key">
    Detalles de autenticación y reglas de reutilización de credenciales.
  </Card>
</CardGroup>
