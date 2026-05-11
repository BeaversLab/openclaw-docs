---
summary: "Usar OpenAI mediante claves de API o suscripción de Codex en OpenClaw"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAI"
---

OpenAI proporciona API de desarrollador para modelos GPT, y Codex también está disponible como agente de codificación con plan ChatGPT a través de los clientes de Codex de OpenAI. OpenClaw mantiene esas superficies separadas para que la configuración sea predecible.

OpenClaw admite tres rutas de la familia OpenAI. El prefijo del modelo selecciona la ruta del proveedor/autenticación; una configuración de tiempo de ejecución separada selecciona quién ejecuta el bucle de agente incrustado:

- **Clave de API** — acceso directo a la plataforma OpenAI con facturación basada en el uso (modelos `openai/*`)
- **Suscripción de Codex a través de PI** — inicio de sesión en ChatGPT/Codex con acceso de suscripción (modelos `openai-codex/*`)
- **Arnés del servidor de aplicaciones de Codex** — ejecución nativa del servidor de aplicaciones de Codex (modelos `openai/*` más `agents.defaults.agentRuntime.id: "codex"`)

OpenAI admite explícitamente el uso de OAuth de suscripción en herramientas y flujos de trabajo externos como OpenClaw.

El proveedor, el modelo, el tiempo de ejecución y el canal son capas separadas. Si esas etiquetas se están mezclando, lea [Runtimes de agente](/es/concepts/agent-runtimes) antes de cambiar la configuración.

## Elección rápida

| Objetivo                                                                | Uso                                             | Notas                                                                                                 |
| ----------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Facturación directa por clave de API                                    | `openai/gpt-5.5`                                | Establezca `OPENAI_API_KEY` o ejecute la incorporación de la clave de API de OpenAI.                  |
| GPT-5.5 con autenticación de suscripción ChatGPT/Codex                  | `openai-codex/gpt-5.5`                          | Ruta PI predeterminada para Codex OAuth. La mejor primera opción para configuraciones de suscripción. |
| GPT-5.5 con comportamiento nativo del servidor de aplicaciones de Codex | `openai/gpt-5.5` más `agentRuntime.id: "codex"` | Fuerza el arnés del servidor de aplicaciones de Codex para esa referencia de modelo.                  |
| Generación o edición de imágenes                                        | `openai/gpt-image-2`                            | Funciona con `OPENAI_API_KEY` u OpenAI Codex OAuth.                                                   |
| Imágenes con fondo transparente                                         | `openai/gpt-image-1.5`                          | Use `outputFormat=png` o `webp` y `openai.background=transparent`.                                    |

## Mapa de nombres

Los nombres son similares pero no intercambiables:

| Nombre que ve                      | Capa                           | Significado                                                                                                                                     |
| ---------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `openai`                           | Prefijo del proveedor          | Ruta directa de la API de la plataforma OpenAI.                                                                                                 |
| `openai-codex`                     | Prefijo del proveedor          | Ruta de suscripción/OAuth de Codex de OpenAI a través del ejecutor PI normal de OpenClaw.                                                       |
| complemento `codex`                | Complemento                    | Complemento incluido en OpenClaw que proporciona el tiempo de ejecución nativo del servidor de aplicaciones Codex y controles de chat `/codex`. |
| `agentRuntime.id: codex`           | Tiempo de ejecución del agente | Forzar el arnés nativo del servidor de aplicaciones Codex para turnos integrados.                                                               |
| `/codex ...`                       | Conjunto de comandos de chat   | Vincular/Controlar hilos del servidor de aplicaciones Codex desde una conversación.                                                             |
| `runtime: "acp", agentId: "codex"` | Ruta de sesión ACP             | Ruta de reserva explícita que ejecuta Codex a través de ACP/acpx.                                                                               |

Esto significa que una configuración puede contener intencionalmente tanto `openai-codex/*` como el
complemento `codex`. Esto es válido cuando desea Codex OAuth a través de PI y también desea
controles de chat nativos `/codex` disponibles. `openclaw doctor` advierte sobre esa
combinación para que pueda confirmar que es intencional; no la reescribe.

<Note>GPT-5.5 está disponible tanto a través del acceso directo con clave API de la plataforma OpenAI como a través de rutas de suscripción/OAuth. Use `openai/gpt-5.5` para el tráfico `OPENAI_API_KEY` directo, `openai-codex/gpt-5.5` para Codex OAuth a través de PI, o `openai/gpt-5.5` con `agentRuntime.id: "codex"` para el arnés nativo del servidor de aplicaciones Codex.</Note>

<Note>
  Habilitar el complemento OpenAI, o seleccionar un modelo `openai-codex/*`, no habilita el complemento del servidor de aplicaciones Codex incluido. OpenClaw habilita ese complemento solo cuando selecciona explícitamente el arnés nativo de Codex con `agentRuntime.id: "codex"` o usa una referencia de modelo `codex/*` heredada. Si el complemento incluido `codex` está habilitado pero `openai-codex/*`
  aún se resuelve a través de PI, `openclaw doctor` advierte y deja la ruta sin cambios.
</Note>

## Cobertura de características de OpenClaw

| Capacidad de OpenAI                      | Superficie de OpenClaw                                         | Estado                                                                      |
| ---------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Chat / Respuestas                        | proveedor de modelos `openai/<model>`                          | Sí                                                                          |
| Modelos de suscripción Codex             | `openai-codex/<model>` con OAuth `openai-codex`                | Sí                                                                          |
| Arnés del servidor de aplicaciones Codex | `openai/<model>` con `agentRuntime.id: codex`                  | Sí                                                                          |
| Búsqueda web en el servidor              | Herramienta nativa de respuestas de OpenAI                     | Sí, cuando la búsqueda web está habilitada y no hay ningún proveedor fijado |
| Imágenes                                 | `image_generate`                                               | Sí                                                                          |
| Videos                                   | `video_generate`                                               | Sí                                                                          |
| Texto a voz                              | `messages.tts.provider: "openai"` / `tts`                      | Sí                                                                          |
| Conversión por lotes de voz a texto      | `tools.media.audio` / comprensión de medios                    | Sí                                                                          |
| Conversión de voz a texto en tiempo real | Llamada de voz `streaming.provider: "openai"`                  | Sí                                                                          |
| Voz en tiempo real                       | Llamada de voz `realtime.provider: "openai"` / Control UI Talk | Sí                                                                          |
| Incrustaciones                           | proveedor de incrustaciones de memoria                         | Sí                                                                          |

## Incrustaciones de memoria

OpenClaw puede usar OpenAI, o un punto final de incrustación compatible con OpenAI, para
indexación `memory_search` y consultas de incrustación:

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
        model: "text-embedding-3-small",
      },
    },
  },
}
```

Para puntos finales compatibles con OpenAI que requieren etiquetas de incrustación asimétricas, configure
`queryInputType` y `documentInputType` bajo `memorySearch`. OpenClaw reenvía
esos como campos de solicitud `input_type` específicos del proveedor: las consultas de incrustación usan
`queryInputType`; los fragmentos de memoria indexados y la indexación por lotes usan
`documentInputType`. Consulte la [referencia de configuración de memoria](/es/reference/memory-config#provider-specific-config) para ver el ejemplo completo.

## Cómo empezar

Elija su método de autenticación preferido y siga los pasos de configuración.

<Tabs>
  <Tab title="Clave de API (plataforma de OpenAI)">
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

    ### Resumen de la ruta

    | Ref. de modelo         | Config. de ejecución      | Ruta                        | Autenticación   |
    | ---------------------- | -------------------------- | --------------------------- | ---------------- |
    | `openai/gpt-5.5`       | omitido / `agentRuntime.id: "pi"`    | API directa de la plataforma de OpenAI  | `OPENAI_API_KEY` |
    | `openai/gpt-5.4-mini`  | omitido / `agentRuntime.id: "pi"`    | API directa de la plataforma de OpenAI  | `OPENAI_API_KEY` |
    | `openai/gpt-5.5`       | `agentRuntime.id: "codex"`           | Harness del servidor de aplicaciones Codex    | Servidor de aplicaciones Codex |

    <Note>
    `openai/*` es la ruta directa de clave de API de OpenAI a menos que fuerces explícitamente
    el harness del servidor de aplicaciones Codex. Usa `openai-codex/*` para OAuth de Codex a través
    del ejecutor PI predeterminado, o usa `openai/gpt-5.5` con
    `agentRuntime.id: "codex"` para la ejecución nativa del servidor de aplicaciones Codex.
    </Note>

    ### Ejemplo de configuración

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    }
    ```

    <Warning>
    OpenClaw **no** expone `openai/gpt-5.3-codex-spark`. Las solicitudes en vivo a la API de OpenAI rechazan ese modelo, y el catálogo actual de Codex tampoco lo expone.
    </Warning>

  </Tab>

  <Tab title="Suscripción Codex">
    **Lo mejor para:** usar tu suscripción a ChatGPT/Codex en lugar de una clave de API por separado. La nube Codex requiere el inicio de sesión en ChatGPT.

    <Steps>
      <Step title="Ejecutar Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        O ejecuta OAuth directamente:

        ```bash
        openclaw models auth login --provider openai-codex
        ```

        Para configuraciones sin cabeza (headless) o hostiles a las devoluciones de llamada, añade `--device-code` para iniciar sesión con un flujo de código de dispositivo de ChatGPT en lugar de la devolución de llamada del navegador local:

        ```bash
        openclaw models auth login --provider openai-codex --device-code
        ```
      </Step>
      <Step title="Establecer el modelo predeterminado">
        ```bash
        openclaw config set agents.defaults.model.primary openai-codex/gpt-5.5
        ```
      </Step>
      <Step title="Verificar que el modelo esté disponible">
        ```bash
        openclaw models list --provider openai-codex
        ```
      </Step>
    </Steps>

    ### Resumen de la ruta

    | Referencia del modelo | Configuración de tiempo de ejecución | Ruta | Autenticación |
    |-----------|----------------|-------|------|
    | `openai-codex/gpt-5.5` | omitido / `runtime: "pi"` | ChatGPT/Codex OAuth a través de PI | Inicio de sesión Codex |
    | `openai-codex/gpt-5.5` | `runtime: "auto"` | Sigue siendo PI a menos que un complemento reivindique explícitamente `openai-codex` | Inicio de sesión Codex |
    | `openai/gpt-5.5` | `agentRuntime.id: "codex"` | Arnés del servidor de aplicaciones Codex | Autenticación del servidor de aplicaciones Codex |

    <Note>
    Sigue usando el id de proveedor `openai-codex` para los comandos de autenticación/perfil. El
    prefijo de modelo `openai-codex/*` también es la ruta PI explícita para Codex OAuth.
    No selecciona ni habilita automáticamente el arnés del servidor de aplicaciones Codex incluido.
    </Note>

    ### Ejemplo de configuración

    ```json5
    {
      agents: { defaults: { model: { primary: "openai-codex/gpt-5.5" } } },
    }
    ```

    <Note>
    La integración ya no importa material OAuth de `~/.codex`. Inicia sesión con OAuth del navegador (predeterminado) o el flujo de código de dispositivo anterior — OpenClaw administra las credenciales resultantes en su propio almacén de autenticación de agente.
    </Note>

    ### Indicador de estado

    El chat `/status` muestra qué tiempo de ejecución del modelo está activo para la sesión actual.
    El arnés PI predeterminado aparece como `Runtime: OpenClaw Pi Default`. Cuando se
    selecciona el arnés del servidor de aplicaciones Codex incluido, `/status` muestra
    `Runtime: OpenAI Codex`. Las sesiones existentes mantienen su id de arnés registrado, así que usa
    `/new` o `/reset` después de cambiar `agentRuntime` si quieres que `/status`
    refleje una nueva elección PI/Codex.

    ### Advertencia del doctor

    Si el complemento `codex` incluido está habilitado mientras se
    selecciona la ruta `openai-codex/*` de esta pestaña, `openclaw doctor` advierte que el modelo
    aún se resuelve a través de PI. Mantén la configuración sin cambios cuando esa es la
    ruta de autenticación por suscripción prevista. Cambia a `openai/<model>` más
    `agentRuntime.id: "codex"` solo cuando quieras la ejecución nativa del
    servidor de aplicaciones Codex.

    ### Límite de la ventana de contexto

    OpenClaw trata los metadatos del modelo y el límite de contexto de tiempo de ejecución como valores separados.

    Para `openai-codex/gpt-5.5` a través de Codex OAuth:

    - `contextWindow` nativo: `1000000`
    - Límite de `contextTokens` de tiempo de ejecución predeterminado: `272000`

    El límite predeterminado más pequeño tiene mejores características de latencia y calidad en la práctica. Anúlalo con `contextTokens`:

    ```json5
    {
      models: {
        providers: {
          "openai-codex": {
            models: [{ id: "gpt-5.5", contextTokens: 160000 }],
          },
        },
      },
    }
    ```

    <Note>
    Usa `contextWindow` para declarar metadatos de modelo nativos. Usa `contextTokens` para limitar el presupuesto de contexto de tiempo de ejecución.
    </Note>

    ### Recuperación del catálogo

    OpenClaw utiliza los metadatos del catálogo Codex aguas arriba para `gpt-5.5` cuando están
    presentes. Si el descubrimiento en vivo de Codex omite la fila `openai-codex/gpt-5.5` mientras
    la cuenta está autenticada, OpenClaw sintetiza esa fila de modelo OAuth para que
    cron, subagente y las ejecuciones del modelo predeterminado configurado no fallen con
    `Unknown model`.

  </Tab>
</Tabs>

## Generación de imágenes

El complemento incluido `openai` registra la generación de imágenes a través de la herramienta `image_generate`.
Admite tanto la generación de imágenes con clave de API de OpenAI como la generación de imágenes con OAuth de Codex a través de la misma referencia de modelo `openai/gpt-image-2`.

| Capacidad                        | Clave de API de OpenAI                       | OAuth de Codex                                    |
| -------------------------------- | -------------------------------------------- | ------------------------------------------------- |
| Referencia de modelo             | `openai/gpt-image-2`                         | `openai/gpt-image-2`                              |
| Autenticación                    | `OPENAI_API_KEY`                             | Inicio de sesión OAuth de OpenAI Codex            |
| Transporte                       | API de Imágenes de OpenAI                    | Backend de Respuestas de Codex                    |
| Máximo de imágenes por solicitud | 4                                            | 4                                                 |
| Modo de edición                  | Habilitado (hasta 5 imágenes de referencia)  | Habilitado (hasta 5 imágenes de referencia)       |
| Anulaciones de tamaño            | Compatible, incluidos los tamaños 2K/4K      | Compatible, incluidos los tamaños 2K/4K           |
| Relación de aspecto / resolución | No se reenvía a la API de Imágenes de OpenAI | Asignado a un tamaño compatible cuando sea seguro |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>Consulte [Generación de imágenes](/es/tools/image-generation) para obtener parámetros de herramientas compartidos, selección de proveedor y comportamiento de conmutación por error.</Note>

`gpt-image-2` es el valor predeterminado tanto para la generación de texto a imagen de OpenAI como para la edición de imágenes. `gpt-image-1.5`, `gpt-image-1` y `gpt-image-1-mini` siguen siendo utilizables como anulaciones explícitas del modelo. Use `openai/gpt-image-1.5` para salida PNG/WebP con fondo transparente; la API actual de `gpt-image-2` rechaza `background: "transparent"`.

Para una solicitud con fondo transparente, los agentes deben llamar a `image_generate` con `model: "openai/gpt-image-1.5"`, `outputFormat: "png"` o `"webp"`, y `background: "transparent"`; la opción de proveedor más antigua `openai.background` todavía se acepta. OpenClaw también protege las rutas públicas de OpenAI y OAuth de OpenAI Codex reescribiendo las solicitudes transparentes predeterminadas de `openai/gpt-image-2` a `gpt-image-1.5`; Azure y los puntos de conexión personalizados compatibles con OpenAI mantienen sus nombres de implementación/modelo configurados.

La misma configuración está expuesta para ejecuciones de CLI sin interfaz gráfica:

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

Use the same `--output-format` and `--background` flags with
`openclaw infer image edit` when starting from an input file.
`--openai-background` remains available as an OpenAI-specific alias.

For Codex OAuth installs, keep the same `openai/gpt-image-2` ref. When an
`openai-codex` OAuth profile is configured, OpenClaw resolves that stored OAuth
access token and sends image requests through the Codex Responses backend. It
does not first try `OPENAI_API_KEY` or silently fall back to an API key for that
request. Configure `models.providers.openai` explicitly with an API key,
custom base URL, or Azure endpoint when you want the direct OpenAI Images API
route instead.
If that custom image endpoint is on a trusted LAN/private address, also set
`browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`; OpenClaw keeps
private/internal OpenAI-compatible image endpoints blocked unless this opt-in is
present.

Generar:

```
/tool image_generate model=openai/gpt-image-2 prompt="A polished launch poster for OpenClaw on macOS" size=3840x2160 count=1
```

Generar un PNG transparente:

```
/tool image_generate model=openai/gpt-image-1.5 prompt="A simple red circle sticker on a transparent background" outputFormat=png background=transparent
```

Editar:

```
/tool image_generate model=openai/gpt-image-2 prompt="Preserve the object shape, change the material to translucent glass" image=/path/to/reference.png size=1024x1536
```

## Generación de video

El complemento `openai` incluido registra la generación de video a través de la herramienta `video_generate`.

| Capacidad              | Valor                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Modelo predeterminado  | `openai/sora-2`                                                                                 |
| Modos                  | Texto a video, imagen a video, edición de video único                                           |
| Entradas de referencia | 1 imagen o 1 video                                                                              |
| Anulaciones de tamaño  | Admitido                                                                                        |
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

<Note>Consulte [Video Generation](/es/tools/video-generation) para ver los parámetros de la herramienta compartida, la selección del proveedor y el comportamiento de conmutación por error.</Note>

## Contribución del mensaje GPT-5

OpenClaw añade una contribución de mensaje GPT-5 compartida para las ejecuciones de la familia GPT-5 entre proveedores. Se aplica por id. de modelo, por lo que `openai-codex/gpt-5.5`, `openai/gpt-5.5`, `openrouter/openai/gpt-5.5`, `opencode/gpt-5.5` y otras referencias compatibles con GPT-5 reciben la misma superposición. Los modelos más antiguos de GPT-4.x no lo hacen.

El arnés nativo de Codex incluido utiliza el mismo comportamiento de GPT-5 y la superposición de latidos a través de las instrucciones para desarrolladores del servidor de aplicaciones de Codex, por lo que las sesiones de `openai/gpt-5.x` forzadas a través de `agentRuntime.id: "codex"` mantienen el mismo seguimiento y orientación proactiva de latidos, aunque Codex sea propietario del resto del mensaje del arnés.

La contribución de GPT-5 añade un contrato de comportamiento etiquetado para la persistencia de la personalidad, la seguridad de ejecución, la disciplina de herramientas, la forma de salida, las comprobaciones de finalización y la verificación. El comportamiento de respuesta específico del canal y de mensajes silenciosos permanece en el mensaje del sistema compartido de OpenClaw y en la política de entrega saliente. La orientación de GPT-5 siempre está habilitada para los modelos coincidentes. La capa de estilo de interacción amigable es independiente y configurable.

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

<Note>El `plugins.entries.openai.config.personality` heredado todavía se lee como una alternativa de compatibilidad cuando no se establece la configuración compartida `agents.defaults.promptOverlays.gpt5.personality`.</Note>

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
    | Clave de API | `messages.tts.providers.openai.apiKey` | Se remite a `OPENAI_API_KEY` |
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
    Establezca `OPENAI_TTS_BASE_URL` para anular la URL base de TTS sin afectar el endpoint de la API de chat.
    </Note>

  </Accordion>

  <Accordion title="Conversión de voz a texto">
    El complemento incluido `openai` registra la conversión de voz a texto por lotes a través de
    la superficie de transcripción de comprensión de medios de OpenClaw.

    - Modelo predeterminado: `gpt-4o-transcribe`
    - Punto de conexión: OpenAI REST `/v1/audio/transcriptions`
    - Ruta de entrada: carga de archivo de audio multiparte
    - Compatible con OpenClaw siempre que la transcripción de audio entrante utilice
      `tools.media.audio`, incluidos los segmentos del canal de voz de Discord y los archivos de
      audio del canal

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

    Las sugerencias de idioma y de mensaje se reenvían a OpenAI cuando las suministra
    la configuración compartida de medios de audio o la solicitud de transcripción por llamada.

  </Accordion>

  <Accordion title="Transcripción en tiempo real">
    El complemento incluido `openai` registra la transcripción en tiempo real para el complemento Voice Call.

    | Configuración | Ruta de configuración | Predeterminado |
    |---------|------------|---------|
    | Modelo | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | Idioma | `...openai.language` | (sin establecer) |
    | Mensaje | `...openai.prompt` | (sin establecer) |
    | Duración del silencio | `...openai.silenceDurationMs` | `800` |
    | Umbral de VAD | `...openai.vadThreshold` | `0.5` |
    | Clave de API | `...openai.apiKey` | Recurre a `OPENAI_API_KEY` |

    <Note>
    Utiliza una conexión WebSocket a `wss://api.openai.com/v1/realtime` con audio G.711 u-law (`g711_ulaw` / `audio/pcmu`). Este proveedor de transmisión es para la ruta de transcripción en tiempo real de Voice Call; la voz de Discord actualmente graba segmentos cortos y utiliza la ruta de transcripción por lotes `tools.media.audio` en su lugar.
    </Note>

  </Accordion>

  <Accordion title="Voz en tiempo real">
    El complemento incluido `openai` registra la voz en tiempo real para el complemento Voice Call.

    | Configuración | Ruta de configuración | Predeterminado |
    |---------|------------|---------|
    | Modelo | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime-1.5` |
    | Voz | `...openai.voice` | `alloy` |
    | Temperatura | `...openai.temperature` | `0.8` |
    | Umbral VAD | `...openai.vadThreshold` | `0.5` |
    | Duración del silencio | `...openai.silenceDurationMs` | `500` |
    | Clave de API | `...openai.apiKey` | Recurre a `OPENAI_API_KEY` |

    <Note>
    Admite Azure OpenAI mediante las claves de configuración `azureEndpoint` y `azureDeployment` para puentes en tiempo real del backend. Admite la llamada a herramientas bidireccional. Utiliza el formato de audio G.711 u-law.
    </Note>

    <Note>
    Control UI Talk utiliza sesiones en tiempo real del navegador de OpenAI con un
    secreto de cliente efímero creado por Gateway y un intercambio SDP WebRTC
    directo del navegador contra la API en tiempo real de OpenAI. La verificación
    en vivo del mantenedor está disponible con `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`;
    la parte de OpenAI crea un secreto de cliente en Node, genera una oferta SDP
    del navegador con medios de micrófono falsos, la envía a OpenAI y aplica la
    respuesta SDP sin registrar secretos.
    </Note>

  </Accordion>
</AccordionGroup>

## Puntos de conexión de Azure OpenAI

El proveedor incluido `openai` puede apuntar a un recurso de Azure
OpenAI para la generación de imágenes anulando la URL base. En la ruta de
generación de imágenes, OpenClaw detecta los nombres de host de Azure en
`models.providers.openai.baseUrl` y cambia automáticamente al formato de solicitud de Azure.

<Note>La voz en tiempo real utiliza una ruta de configuración separada (`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`) y no se ve afectada por `models.providers.openai.baseUrl`. Consulte el acordeón **Voz en tiempo real** en [Voz y habla](#voice-and-speech) para ver su configuración de Azure.</Note>

Use Azure OpenAI cuando:

- Ya tiene una suscripción, cuota o contrato empresarial de Azure OpenAI
- Necesita la residencia regional de datos o los controles de cumplimiento que proporciona Azure
- Deseas mantener el tráfico dentro de un inquilino de Azure existente

### Configuración

Para la generación de imágenes de Azure a través del proveedor incluido `openai`, apunta
`models.providers.openai.baseUrl` a tu recurso de Azure y establece `apiKey` en
la clave de Azure OpenAI (no una clave de la plataforma OpenAI):

```json5
{
  models: {
    providers: {
      openai: {
        baseUrl: "https://<your-resource>.openai.azure.com",
        apiKey: "<azure-openai-api-key>",
      },
    },
  },
}
```

OpenClaw reconoce estos sufijos de host de Azure para la ruta de generación de
imágenes de Azure:

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

Para las solicitudes de generación de imágenes en un host de Azure reconocido, OpenClaw:

- Envía el encabezado `api-key` en lugar de `Authorization: Bearer`
- Usa rutas con ámbito de implementación (`/openai/deployments/{deployment}/...`)
- Añade `?api-version=...` a cada solicitud
- Utiliza un tiempo de espera de solicitud predeterminado de 600 s para las llamadas de generación de imágenes de Azure.
  Los valores `timeoutMs` por llamada siguen anulando este valor predeterminado.

Otras URL base (OpenAI público, proxies compatibles con OpenAI) mantienen la forma estándar
de solicitud de imagen de OpenAI.

<Note>El enrutamiento de Azure para la ruta de generación de imágenes del proveedor `openai` requiere OpenClaw 2026.4.22 o posterior. Las versiones anteriores tratan cualquier `openai.baseUrl` personalizado como el punto de conexión público de OpenAI y fallarán frente a las implementaciones de imágenes de Azure.</Note>

### Versión de la API

Establece `AZURE_OPENAI_API_VERSION` para fijar una versión preliminar o GA específica de Azure
para la ruta de generación de imágenes de Azure:

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

El valor predeterminado es `2024-12-01-preview` cuando la variable no está establecida.

### Los nombres de modelo son nombres de implementación

Azure OpenAI vincula los modelos a las implementaciones. Para las solicitudes de generación de imágenes de Azure
enrutadas a través del proveedor incluido `openai`, el campo `model` en OpenClaw
debe ser el **nombre de la implementación de Azure** que configuraste en el portal de Azure, no
el id. del modelo público de OpenAI.

Si creas una implementación llamada `gpt-image-2-prod` que sirve `gpt-image-2`:

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

La misma regla de nombre de implementación se aplica a las llamadas de generación de imágenes enrutadas a través
del proveedor incluido `openai`.

### Disponibilidad regional

La generación de imágenes de Azure está disponible actualmente solo en un subconjunto de regiones
(por ejemplo `eastus2`, `swedencentral`, `polandcentral`, `westus3`,
`uaenorth`). Consulte la lista actual de regiones de Microsoft antes de crear una
d implementación y confirme que el modelo específico se ofrece en su región.

### Diferencias de parámetros

Azure OpenAI y el OpenAI público no siempre aceptan los mismos parámetros de imagen.
Azure puede rechazar opciones que OpenAI público permite (por ejemplo, ciertos
valores de `background` en `gpt-image-2`) o exponerlas solo en versiones específicas del
modelo. Estas diferencias provienen de Azure y del modelo subyacente no de
OpenClaw. Si una solicitud de Azure falla con un error de validación, verifique el
conjunto de parámetros admitido por su implementación y versión de API específicas en el
portal de Azure.

<Note>
Azure OpenAI utiliza transporte y comportamiento de compatibilidad nativos, pero no recibe
los encabezados de atribución ocultos de OpenClaw; consulte el acordeón **Rutas nativas vs. compatibles con OpenAI**
en [Configuración avanzada](#advanced-configuration).

Para el tráfico de chat o Responses en Azure (más allá de la generación de imágenes), utilice el
flujo de incorporación o una configuración de proveedor dedicada de Azure; `openai.baseUrl` por sí solo
no adopta la forma de API/auth de Azure. Existe un proveedor separado
`azure-openai-responses/*`; consulte el acordeón de compactación del lado del servidor a continuación.

</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Transporte (WebSocket vs SSE)">
    OpenClaw utiliza primero WebSocket con SSE como respaldo (`"auto"`) tanto para `openai/*` como para `openai-codex/*`.

    En el modo `"auto"`, OpenClaw:
    - Reintenta un fallo temprano de WebSocket antes de recurrir a SSE
    - Después de un fallo, marca WebSocket como degradado durante ~60 segundos y usa SSE durante el enfriamiento
    - Adjunta encabezados de identidad de sesión y turno estables para reintentos y reconexiones
    - Normaliza los contadores de uso (`input_tokens` / `prompt_tokens`) en todas las variantes de transporte

    | Valor | Comportamiento |
    |-------|----------|
    | `"auto"` (predeterminado) | WebSocket primero, SSE como respaldo |
    | `"sse"` | Forzar solo SSE |
    | `"websocket"` | Forzar solo WebSocket |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: { transport: "auto" },
            },
            "openai-codex/gpt-5.5": {
              params: { transport: "auto" },
            },
          },
        },
      },
    }
    ```

    Documentación relacionada de OpenAI:
    - [API en tiempo real con WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
    - [Respuestas de API de transmisión (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="Calentamiento de WebSocket">
    OpenClaw habilita el calentamiento de WebSocket de forma predeterminada para `openai/*` y `openai-codex/*` para reducir la latencia del primer turno.

    ```json5
    // Disable warm-up
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: { openaiWsWarmup: false },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Modo rápido">
    OpenClaw expone un interruptor de modo rápido compartido para `openai/*` y `openai-codex/*`:

    - **Chat/UI:** `/fast status|on|off`
    - **Configuración:** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    Cuando está habilitado, OpenClaw asigna el modo rápido al procesamiento prioritario de OpenAI (`service_tier = "priority"`). Se conservan los valores existentes de `service_tier`, y el modo rápido no reescribe `reasoning` ni `text.verbosity`.

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": { params: { fastMode: true } },
          },
        },
      },
    }
    ```

    <Note>
    Las anulaciones de sesión tienen prioridad sobre la configuración. Borrar la anulación de sesión en la interfaz de usuario de Sesiones devuelve la sesión al valor predeterminado configurado.
    </Note>

  </Accordion>

  <Accordion title="Procesamiento con prioridad (service_tier)">
    La API de OpenAI expone el procesamiento con prioridad a través de `service_tier`. Configúrelo por modelo en OpenClaw:

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": { params: { serviceTier: "priority" } },
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
    Para modelos directos de OpenAI Responses (`openai/*` en `api.openai.com`), el contenedor de flujo Pi-harness del complemento OpenAI habilita automáticamente la compactación del lado del servidor:

    - Fuerza `store: true` (a menos que la compatibilidad del modelo establezca `supportsStore: false`)
    - Inyecta `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - `compact_threshold` predeterminado: 70%% de `contextWindow` (o `80000` cuando no esté disponible)

    Esto se aplica a la ruta integrada de Pi harness y a los enlaces del proveedor OpenAI utilizados por ejecuciones integradas. El arnés nativo del servidor de aplicaciones Codex gestiona su propio contexto a través de Codex y se configura por separado con `agents.defaults.agentRuntime.id`.

    <Tabs>
      <Tab title="Habilitar explícitamente">
        Útil para endpoints compatibles como Azure OpenAI Responses:

        ```json5
        {
          agents: {
            defaults: {
              models: {
                "azure-openai-responses/gpt-5.5": {
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
                "openai/gpt-5.5": {
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
                "openai/gpt-5.5": {
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

  <Accordion title="Modo GPT de agente estricto">
    Para las ejecuciones de la familia GPT-5 en `openai/*`, OpenClaw puede utilizar un contrato de ejecución integrado más estricto:

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
    - Reintenta el turno con una dirección de actuación inmediata
    - Habilita automáticamente `update_plan` para trabajos sustanciales
    - Muestra un estado de bloqueo explícito si el modelo sigue planificando sin actuar

    <Note>
    Limitado únicamente a ejecuciones de la familia GPT-5 de OpenAI y Codex. Otros proveedores y familias de modelos más antiguos mantienen el comportamiento predeterminado.
    </Note>

  </Accordion>

  <Accordion title="Rutas nativas vs. compatibles con OpenAI">
    OpenClaw trata los puntos finales de OpenAI directos, Codex y Azure OpenAI de manera diferente a los proxies genéricos compatibles con OpenAI `/v1`:

    **Rutas nativas** (`openai/*`, Azure OpenAI):
    - Mantiene `reasoning: { effort: "none" }` solo para modelos que admiten el esfuerzo de `none` de OpenAI
    - Omite el razonamiento desactivado para modelos o proxies que rechazan `reasoning.effort: "none"`
    - Establece los esquemas de herramientas en modo estricto de forma predeterminada
    - Adjunta encabezados de atribución ocultos solo en hosts nativos verificados
    - Mantiene el modelado de solicitudes exclusivo de OpenAI (`service_tier`, `store`, razonamiento-compat, sugerencias de caché de prompt)

    **Rutas de proxy/compatibles:**
    - Utilizan un comportamiento de compatibilidad más laxo
    - Eliminan `store` de Completions de cargas útiles `openai-completions` no nativas
    - Aceptan JSON de paso avanzado `params.extra_body`/`params.extraBody` para proxies de Completions compatibles con OpenAI
    - Aceptan `params.chat_template_kwargs` para proxies de Completions compatibles con OpenAI como vLLM
    - No fuerzan esquemas de herramientas estrictos ni encabezados exclusivos de nativos

    Azure OpenAI utiliza transporte nativo y comportamiento de compatibilidad, pero no recibe los encabezados de atribución ocultos.

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Generación de imágenes" href="/es/tools/image-generation" icon="image">
    Parámetros compartidos de la herramienta de imagen y selección del proveedor.
  </Card>
  <Card title="Generación de videos" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de video y selección del proveedor.
  </Card>
  <Card title="OAuth y autenticación" href="/es/gateway/authentication" icon="key">
    Detalles de autenticación y reglas de reutilización de credenciales.
  </Card>
</CardGroup>
