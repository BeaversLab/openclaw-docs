---
summary: "Usa OpenAI mediante claves de API o suscripción Codex en OpenClaw"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAI"
---

# OpenAI

OpenAI proporciona API para desarrolladores de modelos GPT. OpenClaw admite dos rutas de autenticación:

- **API key** — acceso directo a la plataforma OpenAI con facturación basada en el uso (modelos `openai/*`)
- **Suscripción Codex** — inicio de sesión en ChatGPT/Codex con acceso por suscripción (modelos `openai-codex/*`)

OpenAI admite explícitamente el uso de OAuth por suscripción en herramientas y flujos de trabajo externos como OpenClaw.

## Cobertura de funciones de OpenClaw

| Capacidad de OpenAI                      | Superficie de OpenClaw                        | Estado                                                                      |
| ---------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| Chat / Respuestas                        | proveedor de modelos `openai/<model>`         | Sí                                                                          |
| Modelos de suscripción Codex             | proveedor de modelos `openai-codex/<model>`   | Sí                                                                          |
| Búsqueda web en el servidor              | Herramienta nativa de OpenAI Responses        | Sí, cuando la búsqueda web está habilitada y no hay ningún proveedor fijado |
| Imágenes                                 | `image_generate`                              | Sí                                                                          |
| Videos                                   | `video_generate`                              | Sí                                                                          |
| Texto a voz                              | `messages.tts.provider: "openai"` / `tts`     | Sí                                                                          |
| Conversión de voz a texto por lotes      | `tools.media.audio` / comprensión de medios   | Sí                                                                          |
| Conversión de voz a texto en tiempo real | Llamada de voz `streaming.provider: "openai"` | Sí                                                                          |
| Voz en tiempo real                       | Llamada de voz `realtime.provider: "openai"`  | Sí                                                                          |
| Incrustaciones (Embeddings)              | proveedor de incrustaciones de memoria        | Sí                                                                          |

## Para empezar

Elige tu método de autenticación preferido y sigue los pasos de configuración.

<Tabs>
  <Tab title="Clave de API (Plataforma de OpenAI)">
    **Lo mejor para:** acceso directo a la API y facturación basada en el uso.

    <Steps>
      <Step title="Obtén tu clave de API">
        Crea o copia una clave de API desde el [panel de la Plataforma de OpenAI](https://platform.openai.com/api-keys).
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

    ### Resumen de la ruta

    | Ref. del modelo | Ruta | Autenticación |
    |-----------|-------|------|
    | `openai/gpt-5.4` | API directa de la Plataforma de OpenAI | `OPENAI_API_KEY` |
    | `openai/gpt-5.4-pro` | API directa de la Plataforma de OpenAI | `OPENAI_API_KEY` |

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
    OpenClaw **no** expone `openai/gpt-5.3-codex-spark` en la ruta de API directa. Las solicitudes en vivo a la API de OpenAI rechazan ese modelo. Spark es exclusivo de Codex.
    </Warning>

  </Tab>

  <Tab title="Suscripción Codex">
    **Lo mejor para:** usar tu suscripción a ChatGPT/Codex en lugar de una clave de API separada. La nube de Codex requiere iniciar sesión en ChatGPT.

    <Steps>
      <Step title="Ejecutar Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        O ejecuta OAuth directamente:

        ```bash
        openclaw models auth login --provider openai-codex
        ```

        Para configuraciones sin cabeza o hostiles a las devoluciones de llamada, añade `--device-code` para iniciar sesión con un flujo de código de dispositivo de ChatGPT en lugar de la devolución de llamada del navegador localhost:

        ```bash
        openclaw models auth login --provider openai-codex --device-code
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

    | Referencia del modelo | Ruta | Autenticación |
    |-----------|-------|------|
    | `openai-codex/gpt-5.4` | ChatGPT/Codex OAuth | Inicio de sesión de Codex |
    | `openai-codex/gpt-5.3-codex-spark` | ChatGPT/Codex OAuth | Inicio de sesión de Codex (dependiente de derechos) |

    <Note>
    Esta ruta está intencionalmente separada de `openai/gpt-5.4`. Usa `openai/*` con una clave de API para el acceso directo a la Plataforma, y `openai-codex/*` para el acceso mediante suscripción a Codex.
    </Note>

    ### Ejemplo de configuración

    ```json5
    {
      agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
    }
    ```

    <Note>
    La incorporación ya no importa material OAuth de `~/.codex`. Inicia sesión con OAuth del navegador (predeterminado) o el flujo de código de dispositivo anterior — OpenClaw gestiona las credenciales resultantes en su propio almacén de autenticación de agentes.
    </Note>

    ### Límite de la ventana de contexto

    OpenClaw trata los metadatos del modelo y el límite del contexto de ejecución como valores separados.

    Para `openai-codex/gpt-5.4`:

    - `contextWindow` nativo: `1050000`
    - Límite predeterminado de `contextTokens` de ejecución: `272000`

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
    Usa `contextWindow` para declarar los metadatos nativos del modelo. Usa `contextTokens` para limitar el presupuesto del contexto de ejecución.
    </Note>

  </Tab>
</Tabs>

## Generación de imágenes

El complemento incluido `openai` registra la generación de imágenes a través de la herramienta `image_generate`.

| Capacidad                        | Valor                                       |
| -------------------------------- | ------------------------------------------- |
| Modelo predeterminado            | `openai/gpt-image-2`                        |
| Imágenes máximas por solicitud   | 4                                           |
| Modo de edición                  | Habilitado (hasta 5 imágenes de referencia) |
| Anulaciones de tamaño            | Compatible, incluidos los tamaños 2K/4K     |
| Relación de aspecto / resolución | No se reenvía a la API de OpenAI Images     |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>Consulte [Generación de imágenes](/es/tools/image-generation) para conocer los parámetros de herramienta compartidos, la selección de proveedores y el comportamiento de conmutación por error.</Note>

`gpt-image-2` es el valor predeterminado tanto para la generación de imágenes de texto a imagen de OpenAI como para la edición de imágenes. `gpt-image-1` sigue siendo utilizable como una anulación de modelo explícita, pero los nuevos flujos de trabajo de imágenes de OpenAI deben usar `openai/gpt-image-2`.

Generar:

```
/tool image_generate model=openai/gpt-image-2 prompt="A polished launch poster for OpenClaw on macOS" size=3840x2160 count=1
```

Editar:

```
/tool image_generate model=openai/gpt-image-2 prompt="Preserve the object shape, change the material to translucent glass" image=/path/to/reference.png size=1024x1536
```

## Generación de video

El complemento incluido `openai` registra la generación de video a través de la herramienta `video_generate`.

| Capacidad              | Valor                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| Modelo predeterminado  | `openai/sora-2`                                                                                    |
| Modos                  | Texto a video, imagen a video, edición de video único                                              |
| Entradas de referencia | 1 imagen o 1 video                                                                                 |
| Anulaciones de tamaño  | Compatible                                                                                         |
| Otras anulaciones      | `aspectRatio`, `resolution`, `audio`, `watermark` se ignoran con una advertencia de la herramienta |

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>Consulte [Generación de video](/es/tools/video-generation) para conocer los parámetros de herramienta compartidos, la selección de proveedores y el comportamiento de conmutación por error.</Note>

## Contribución del prompt de GPT-5

OpenClaw añade una contribución de prompt de GPT-5 compartida para las ejecuciones de la familia GPT-5 en todos los proveedores. Se aplica por identificador de modelo, por lo que `openai/gpt-5.4`, `openai-codex/gpt-5.4`, `openrouter/openai/gpt-5.4`, `opencode/gpt-5.4` y otras referencias compatibles de GPT-5 reciben la misma superposición. Los modelos anteriores GPT-4.x no.

El proveedor de arnés nativo de Codex incluido (`codex/*`) utiliza el mismo comportamiento de GPT-5 y la superposición de latidos a través de las instrucciones para desarrolladores del servidor de aplicaciones de Codex, por lo que las sesiones `codex/gpt-5.x` mantienen el mismo seguimiento y orientación proactiva de latidos, aunque Codex posee el resto del prompt del arnés.

La contribución de GPT-5 añade un contrato de comportamiento etiquetado para la persistencia de la persona, seguridad de ejecución, disciplina de herramientas, forma de salida, verificaciones de finalización y verificación. El comportamiento de respuesta y de mensajes silenciosos específico del canal permanece en el mensaje del sistema compartido de OpenClaw y en la política de entrega saliente. La guía de GPT-5 siempre está habilitada para los modelos coincidentes. La capa de estilo de interacción amigable es independiente y configurable.

| Valor                         | Efecto                                              |
| ----------------------------- | --------------------------------------------------- |
| `"friendly"` (predeterminado) | Habilitar la capa de estilo de interacción amigable |
| `"on"`                        | Alias para `"friendly"`                             |
| `"off"`                       | Deshabilitar solo la capa de estilo amigable        |

<Tabs>
  <Tab title="Config">
    ```json5
    {
      agents: {
        defaults: {
          promptOverlays: {
            gpt5: { personality: "friendly" },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="CLI">
    ```bash
    openclaw config set agents.defaults.promptOverlays.gpt5.personality off
    ```
  </Tab>
</Tabs>

<Tip>Los valores no distinguen entre mayúsculas y minúsculas en tiempo de ejecución, por lo que `"Off"` y `"off"` deshabilitan la capa de estilo amigable.</Tip>

<Note>El `plugins.entries.openai.config.personality` heredado todavía se lee como alternativa de compatibilidad cuando la configuración compartida `agents.defaults.promptOverlays.gpt5.personality` no está establecida.</Note>

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

  <Accordion title="Conversión de voz a texto">
    El complemento incluido `openai` registra la conversión de voz a texto por lotes a través de
    la superficie de transcripción de comprensión de medios de OpenClaw.

    - Modelo predeterminado: `gpt-4o-transcribe`
    - Punto de conexión: OpenAI REST `/v1/audio/transcriptions`
    - Ruta de entrada: carga de archivo de audio multiparte
    - Compatible con OpenClaw dondequiera que la transcripción de audio entrante use
      `tools.media.audio`, incluyendo segmentos de canales de voz de Discord y
      archivos de audio de canal

    Para forzar el uso de OpenAI para la transcripción de audio entrante:

    ```json5
    {
      tools: {
        media: {
          audio: {
            models: [
              {
                type: "provider",
                provider: "openai",
                model: "gpt-4o-transcribe",
              },
            ],
          },
        },
      },
    }
    ```

    Las sugerencias de idioma y aviso se reenvían a OpenAI cuando son suministradas por la
    configuración de medios de audio compartida o la solicitud de transcripción por llamada.

  </Accordion>

  <Accordion title="Transcripción en tiempo real">
    El complemento incluido `openai` registra la transcripción en tiempo real para el complemento de llamada de voz.

    | Configuración | Ruta de configuración | Predeterminado |
    |---------|------------|---------|
    | Modelo | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | Idioma | `...openai.language` | (sin establecer) |
    | Aviso | `...openai.prompt` | (sin establecer) |
    | Duración del silencio | `...openai.silenceDurationMs` | `800` |
    | Umbral VAD | `...openai.vadThreshold` | `0.5` |
    | Clave de API | `...openai.apiKey` | Se remite a `OPENAI_API_KEY` |

    <Note>
    Utiliza una conexión WebSocket a `wss://api.openai.com/v1/realtime` con audio G.711 u-law (`g711_ulaw` / `audio/pcmu`). Este proveedor de streaming es para la ruta de transcripción en tiempo real de Voice Call; la voz de Discord actualmente graba segmentos cortos y usa la ruta de transcripción por lotes `tools.media.audio` en su lugar.
    </Note>

  </Accordion>

  <Accordion title="Voz en tiempo real">
    El complemento `openai` incluido registra la voz en tiempo real para el complemento Voice Call.

    | Configuración | Ruta de configuración | Predeterminado |
    |---------|------------|---------|
    | Modelo | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime` |
    | Voz | `...openai.voice` | `alloy` |
    | Temperatura | `...openai.temperature` | `0.8` |
    | Umbral de VAD | `...openai.vadThreshold` | `0.5` |
    | Duración del silencio | `...openai.silenceDurationMs` | `500` |
    | Clave de API | `...openai.apiKey` | Recurre a `OPENAI_API_KEY` |

    <Note>
    Admite Azure OpenAI mediante las claves de configuración `azureEndpoint` y `azureDeployment`. Admite la llamada a herramientas bidireccional. Utiliza el formato de audio G.711 u-law.
    </Note>

  </Accordion>
</AccordionGroup>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Transporte (WebSocket frente a SSE)">
    OpenClaw utiliza WebSocket con prioridad y respaldo a SSE (`"auto"`) tanto para `openai/*` como para `openai-codex/*`.

    En el modo `"auto"`, OpenClaw:
    - Reintenta un fallo temprano de WebSocket antes de recurrir a SSE
    - Después de un fallo, marca WebSocket como degradado durante ~60 segundos y utiliza SSE durante el enfriamiento
    - Adjunta encabezados de identidad de sesión y turno estables para reintentos y reconexiones
    - Normaliza los contadores de uso (`input_tokens` / `prompt_tokens`) en todas las variantes de transporte

    | Valor | Comportamiento |
    |-------|----------|
    | `"auto"` (predeterminado) | WebSocket primero, respaldo a SSE |
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

    Documentación relacionada de OpenAI:
    - [Realtime API con WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
    - [Respuestas de API de streaming (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="Calentamiento de WebSocket">
    OpenClaw habilita el calentamiento de WebSocket de forma predeterminada para `openai/*` para reducir la latencia del primer turno.

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

<a id="openai-fast-mode"></a>

  <Accordion title="Modo rápido">
    OpenClaw expone un interruptor de modo rápido compartido tanto para `openai/*` como para `openai-codex/*`:

    - **Chat/UI:** `/fast status|on|off`
    - **Config:** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    Cuando está habilitado, OpenClaw asigna el modo rápido al procesamiento prioritario de OpenAI (`service_tier = "priority"`). Se conservan los valores existentes de `service_tier`, y el modo rápido no reescribe `reasoning` ni `text.verbosity`.

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
    Las anulaciones de sesión tienen prioridad sobre la configuración. Al borrar la anulación de sesión en la interfaz de usuario de Sesiones, la sesión vuelve al valor predeterminado configurado.
    </Note>

  </Accordion>

  <Accordion title="Procesamiento prioritario (service_tier)">
    La API de OpenAI expone el procesamiento prioritario a través de `service_tier`. Establézcalo por modelo en OpenClaw:

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
    `serviceTier` solo se reenvía a los puntos de conexión nativos de OpenAI (`api.openai.com`) y a los puntos de conexión nativos de Codex (`chatgpt.com/backend-api`). Si enruta cualquiera de los proveedores a través de un proxy, OpenClaw deja `service_tier` sin modificar.
    </Warning>

  </Accordion>

  <Accordion title="Compactación en el lado del servidor (Responses API)">
    Para modelos directos de OpenAI Responses (`openai/*` en `api.openai.com`), OpenClaw habilita automáticamente la compactación en el lado del servidor:

    - Fuerza `store: true` (a menos que la compatibilidad del modelo establezca `supportsStore: false`)
    - Inyecta `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - `compact_threshold` predeterminado: 70% de `contextWindow` (o `80000` cuando no esté disponible)

    <Tabs>
      <Tab title="Habilitar explícitamente">
        Útil para puntos de conexión compatibles como Azure OpenAI Responses:

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
    `responsesServerCompaction` solo controla la inyección de `context_management`. Los modelos directos de OpenAI Responses aún fuerzan `store: true` a menos que la compatibilidad establezca `supportsStore: false`.
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
    - Reintenta el turno con una dirección de acción inmediata
    - Habilita automáticamente `update_plan` para trabajos sustanciales
    - Muestra un estado de bloqueo explícito si el modelo sigue planificando sin actuar

    <Note>
    Limitado solo a ejecuciones de la familia GPT-5 de OpenAI y Codex. Otros proveedores y familias de modelos antiguas mantienen el comportamiento predeterminado.
    </Note>

  </Accordion>

  <Accordion title="Rutas nativas frente a rutas compatibles con OpenAI">
    OpenClaw trata los puntos finales directos de OpenAI, Codex y Azure OpenAI de manera diferente a los proxies genéricos compatibles con OpenAI `/v1`:

    **Rutas nativas** (`openai/*`, `openai-codex/*`, Azure OpenAI):
    - Mantiene `reasoning: { effort: "none" }` solo para modelos que soportan el esfuerzo `none` de OpenAI
    - Omite el razonamiento deshabilitado para modelos o proxies que rechazan `reasoning.effort: "none"`
    - Establece por defecto los esquemas de herramientas en modo estricto
    - Adjunta cabeceras de atribución ocultas solo en hosts nativos verificados
    - Mantiene el modelado de solicitudes exclusivo de OpenAI (`service_tier`, `store`, compatibilidad de razonamiento, sugerencias de caché de prompt)

    **Rutas de proxy/compatibles:**
    - Utilizan un comportamiento de compatibilidad más laxo
    - No fuerzan esquemas de herramientas estrictos ni cabeceras exclusivas de nativos

    Azure OpenAI utiliza transporte nativo y comportamiento de compatibilidad, pero no recibe las cabeceras de atribución ocultas.

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelo y comportamiento de conmutación por error.
  </Card>
  <Card title="Generación de imágenes" href="/es/tools/image-generation" icon="image">
    Parámetros de la herramienta de imagen compartida y selección del proveedor.
  </Card>
  <Card title="Generación de videos" href="/es/tools/video-generation" icon="video">
    Parámetros de la herramienta de video compartida y selección del proveedor.
  </Card>
  <Card title="OAuth y autenticación" href="/es/gateway/authentication" icon="key">
    Detalles de autenticación y reglas de reutilización de credenciales.
  </Card>
</CardGroup>
