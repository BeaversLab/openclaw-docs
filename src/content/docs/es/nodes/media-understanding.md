---
summary: "Comprensión de imagen/audio/video entrante (opcional) con proveedor + alternativas de CLI"
read_when:
  - Designing or refactoring media understanding
  - Tuning inbound audio/video/image preprocessing
title: "Comprensión de medios"
sidebarTitle: "Comprensión de medios"
---

OpenClaw puede **resumir los medios entrantes** (imagen/audio/vídeo) antes de que se ejecute la canalización de respuesta. Detecta automáticamente cuando hay herramientas locales o claves de proveedor disponibles, y se puede desactivar o personalizar. Si la comprensión está desactivada, los modelos siguen recibiendo los archivos/URL originales como de costumbre.

El comportamiento específico del proveedor para los medios se registra mediante complementos del proveedor, mientras que el núcleo de OpenClaw posee la configuración `tools.media` compartida, el orden de reserva y la integración con la canalización de respuesta.

## Objetivos

- Opcional: preprocesar los medios entrantes en texto breve para un enrutamiento más rápido + una mejor análise de comandos.
- Conservar la entrega de medios original al modelo (siempre).
- Soportar **APIs de proveedores** y **reservas de CLI**.
- Permitir múltiples modelos con reserva ordenada (error/tamaño/tiempo de espera).

## Comportamiento de alto nivel

<Steps>
  <Step title="Recopilar adjuntos">
    Recopilar adjuntos entrantes (`MediaPaths`, `MediaUrls`, `MediaTypes`).
  </Step>
  <Step title="Seleccionar por capacidad">
    Para cada capacidad habilitada (imagen/audio/vídeo), seleccionar adjuntos según la política (predeterminado: **primero**).
  </Step>
  <Step title="Elegir modelo">
    Elegir la primera entrada de modelo elegible (tamaño + capacidad + autenticación).
  </Step>
  <Step title="Reserva en caso de fallo">
    Si un modelo falla o el medio es demasiado grande, **recurra a la siguiente entrada**.
  </Step>
  <Step title="Aplicar bloque de éxito">
    En caso de éxito:

    - `Body` se convierte en un bloque `[Image]`, `[Audio]` o `[Video]`.
    - El audio establece `{{Transcript}}`; el análisis de comandos usa el texto de los subtítulos si está presente, de lo contrario la transcripción.
    - Los subtítulos se conservan como `User text:` dentro del bloque.

  </Step>
</Steps>

Si la comprensión falla o está desactivada, **el flujo de respuesta continúa** con el cuerpo original + los adjuntos.

## Resumen de la configuración

`tools.media` admite **modelos compartidos** más anulaciones por capacidad:

<AccordionGroup>
  <Accordion title="Claves de nivel superior">
    - `tools.media.models`: lista de modelos compartida (use `capabilities` para limitar).
    - `tools.media.image` / `tools.media.audio` / `tools.media.video`:
      - valores predeterminados (`prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`)
      - anulaciones de proveedor (`baseUrl`, `headers`, `providerOptions`)
      - opciones de audio de Deepgram a través de `tools.media.audio.providerOptions.deepgram`
      - controles de eco de transcripción de audio (`echoTranscript`, predeterminado `false`; `echoFormat`)
      - **lista `models` por capacidad** opcional (preferida antes que los modelos compartidos)
      - política `attachments` (`mode`, `maxAttachments`, `prefer`)
      - `scope` (limitación opcional por canal/chatType/session key)
    - `tools.media.concurrency`: máximo de ejecuciones simultáneas de capacidades (predeterminado **2**).

  </Accordion>
</AccordionGroup>

```json5
{
  tools: {
    media: {
      models: [
        /* shared list */
      ],
      image: {
        /* optional overrides */
      },
      audio: {
        /* optional overrides */
        echoTranscript: true,
        echoFormat: '📝 "{transcript}"',
      },
      video: {
        /* optional overrides */
      },
    },
  },
}
```

### Entradas de modelo

Cada entrada `models[]` puede ser de **proveedor** o **CLI**:

<Tabs>
  <Tab title="Entrada de proveedor">
    ```json5
    {
      type: "provider", // default if omitted
      provider: "openai",
      model: "gpt-5.5",
      prompt: "Describe the image in <= 500 chars.",
      maxChars: 500,
      maxBytes: 10485760,
      timeoutSeconds: 60,
      capabilities: ["image"], // optional, used for multi-modal entries
      profile: "vision-profile",
      preferredProfile: "vision-fallback",
    }
    ```
  </Tab>
  <Tab title="Entrada de CLI">
    ```json5
    {
      type: "cli",
      command: "gemini",
      args: [
        "-m",
        "gemini-3-flash",
        "--allowed-tools",
        "read_file",
        "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
      ],
      maxChars: 500,
      maxBytes: 52428800,
      timeoutSeconds: 120,
      capabilities: ["video", "image"],
    }
    ```

    Las plantillas de CLI también pueden usar:

    - `{{MediaDir}}` (directorio que contiene el archivo multimedia)
    - `{{OutputDir}}` (directorio temporal creado para esta ejecución)
    - `{{OutputBase}}` (ruta base del archivo temporal, sin extensión)

  </Tab>
</Tabs>

## Valores predeterminados y límites

Valores predeterminados recomendados:

- `maxChars`: **500** para imagen/vídeo (corto, amigable para comandos)
- `maxChars`: **sin establecer** para audio (transcripción completa a menos que establezca un límite)
- `maxBytes`:
  - imagen: **10MB**
  - audio: **20MB**
  - vídeo: **50MB**

<AccordionGroup>
  <Accordion title="Reglas">
    - Si el medio excede `maxBytes`, se omite ese modelo y se **prueba el siguiente modelo**.
    - Los archivos de audio menores de **1024 bytes** se tratan como vacíos/corruptos y se omiten antes de la transcripción del proveedor/CLI; el contexto de respuesta entrante recibe una transcripción de marcador de posición determinista para que el agente sepa que la nota era demasiado pequeña.
    - Si el modelo devuelve más de `maxChars`, la salida se recorta.
    - `prompt` tiene como valor predeterminado "Describir el {media}." más la guía de `maxChars` (solo imagen/vídeo).
    - Si el modelo de imagen principal activo ya admite la visión de forma nativa, OpenClaw omite el bloque de resumen `[Image]` y pasa la imagen original al modelo en su lugar.
    - Si un modelo principal de Gateway/WebChat es solo de texto, los archivos adjuntos de imagen se conservan como referencias `media://inbound/*` descargadas para que las herramientas de imagen/PDF o el modelo de imagen configurado todavía puedan inspeccionarlos en lugar de perder el archivo adjunto.
    - Las solicitudes explícitas de `openclaw infer image describe --model <provider/model>` son diferentes: ejecutan ese proveedor/modelo con capacidad de imagen directamente, incluyendo referencias de Ollama como `ollama/qwen2.5vl:7b`.
    - Si `<capability>.enabled: true` pero no hay modelos configurados, OpenClaw prueba el **modelo de respuesta activo** cuando su proveedor admite la capacidad.

  </Accordion>
</AccordionGroup>

### Detección automática de comprensión de medios (predeterminado)

Si `tools.media.<capability>.enabled` **no** está establecido en `false` y no has configurado modelos, OpenClaw detecta automáticamente en este orden y **se detiene en la primera opción que funcione**:

<Steps>
  <Step title="Modelo de respuesta activo">
    Modelo de respuesta activo cuando su proveedor admite la capacidad.
  </Step>
  <Step title="agents.defaults.imageModel">
    `agents.defaults.imageModel` referencias primarias/de respaldo (solo imágenes).
    Prefiera referencias `provider/model`. Las referencias simples se califican solo desde las entradas de modelos de proveedor con capacidad de imagen configuradas cuando la coincidencia es única.
  </Step>
  <Step title="CLIs locales (solo audio)">
    CLIs locales (si están instalados):

    - `sherpa-onnx-offline` (requiere `SHERPA_ONNX_MODEL_DIR` con codificador/decodificador/unificador/tokens)
    - `whisper-cli` (`whisper-cpp`; usa `WHISPER_CPP_MODEL` o el modelo tiny incluido)
    - `whisper` (CLI de Python; descarga los modelos automáticamente)

  </Step>
  <Step title="Gemini CLI">
    `gemini` usando `read_many_files`.
  </Step>
  <Step title="Autenticación del proveedor">
    - Se intentan las entradas `models.providers.*` configuradas que admitan la capacidad antes que el orden de reserva integrado.
    - Los proveedores de configuración solo de imagen con un modelo con capacidad de imagen se registran automáticamente para la comprensión de medios, incluso si no son un complemento de proveedor integrado.
    - La comprensión de imágenes de Ollama está disponible cuando se selecciona explícitamente, por ejemplo a través de `agents.defaults.imageModel` o `openclaw infer image describe --model ollama/<vision-model>`.

    Orden de reserva integrado:

    - Audio: OpenAI → Groq → xAI → Deepgram → OpenRouter → Google → SenseAudio → ElevenLabs → Mistral
    - Imagen: OpenAI → Anthropic → Google → MiniMax → MiniMax Portal → Z.AI
    - Video: Google → Qwen → Moonshot

  </Step>
</Steps>

Para desactivar la detección automática, establezca:

```json5
{
  tools: {
    media: {
      audio: {
        enabled: false,
      },
    },
  },
}
```

<Note>La detección de binarios se realiza con el mejor esfuerzo posible en macOS/Linux/Windows; asegúrese de que la CLI esté en `PATH` (nosotros expandimos `~`), o configure un modelo de CLI explícito con una ruta de comando completa.</Note>

### Soporte de entorno proxy (modelos de proveedor)

Cuando la comprensión de medios de **audio** y **video** basada en proveedores está habilitada, OpenClaw respeta las variables de entorno de proxy de salida estándar para las llamadas HTTP del proveedor:

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `ALL_PROXY`
- `https_proxy`
- `http_proxy`
- `all_proxy`

Si no se establecen variables de entorno de proxy, la comprensión de medios usa salida directa. Si el valor del proxy está malformado, OpenClaw registra una advertencia y recurre a la obtención directa.

## Capacidades (opcional)

Si configura `capabilities`, la entrada solo se ejecuta para esos tipos de medios. Para listas compartidas, OpenClaw puede inferir los valores predeterminados:

- `openai`, `anthropic`, `minimax`: **imagen**
- `minimax-portal`: **imagen**
- `moonshot`: **imagen + video**
- `openrouter`: **imagen + audio**
- `google` (API de Gemini): **imagen + audio + video**
- `qwen`: **imagen + video**
- `mistral`: **audio**
- `zai`: **imagen**
- `groq`: **audio**
- `xai`: **audio**
- `deepgram`: **audio**
- Cualquier catálogo `models.providers.<id>.models[]` con un modelo con capacidad de imagen: **imagen**

Para las entradas de CLI, **establezca `capabilities` explícitamente** para evitar coincidencias sorprendentes. Si omite `capabilities`, la entrada es elegible para la lista en la que aparece.

## Matriz de soporte de proveedores (integraciones de OpenClaw)

| Capacidad | Integración de proveedor                                                                                                                 | Notas                                                                                                                                                                                                                                                                                                                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Imagen    | OpenAI, OpenAI Codex OAuth, Codex app-server, OpenRouter, Anthropic, Google, MiniMax, Moonshot, Qwen, Z.AI, proveedores de configuración | Los complementos del proveedor registran el soporte de imágenes; `openai-codex/*` utiliza la infraestructura del proveedor OAuth; `codex/*` utiliza un turno limitado del servidor de aplicaciones Codex; MiniMax y MiniMax OAuth ambos utilizan `MiniMax-VL-01`; los proveedores de configuración con capacidad de imagen se registran automáticamente. |
| Audio     | OpenAI, Groq, xAI, Deepgram, OpenRouter, Google, SenseAudio, ElevenLabs, Mistral                                                         | Transcripción del proveedor (Whisper/Groq/xAI/Deepgram/OpenRouter STT/Gemini/SenseAudio/Scribe/Voxtral).                                                                                                                                                                                                                                                 |
| Vídeo     | Google, Qwen, Moonshot                                                                                                                   | Comprensión de video del proveedor a través de complementos del proveedor; la comprensión de video de Qwen utiliza los puntos finales estándar de DashScope.                                                                                                                                                                                             |

<Note>
**Nota de MiniMax**

- La comprensión de imágenes de `minimax`, `minimax-cn`, `minimax-portal` y `minimax-portal-cn` proviene del proveedor de medios `MiniMax-VL-01` propiedad del complemento.
- El enrutamiento automático de imágenes sigue usando `MiniMax-VL-01` incluso si los metadatos de chat heredados de MiniMax M2.x indican entrada de imagen.

</Note>

## Guía de selección de modelos

- Prefiere el modelo de última generación más fuerte disponible para cada capacidad multimedia cuando la calidad y la seguridad son importantes.
- Para agentes con herramientas habilitadas que manejen entradas que no son de confianza, evita modelos multimedia más antiguos o más débiles.
- Mantén al menos un respaldo por capacidad para disponibilidad (modelo de calidad + modelo más rápido/económico).
- Las alternativas de CLI (`whisper-cli`, `whisper`, `gemini`) son útiles cuando las API de los proveedores no están disponibles.
- Nota de `parakeet-mlx`: con `--output-dir`, OpenClaw lee `<output-dir>/<media-basename>.txt` cuando el formato de salida es `txt` (o sin especificar); los formatos que no son `txt` vuelven a stdout.

## Política de archivos adjuntos

Los controles `attachments` por capacidad determinan qué archivos adjuntos se procesan:

<ParamField path="mode" type='"first" | "all"' default="first">
  Si se debe procesar el primer archivo adjunto seleccionado o todos ellos.
</ParamField>
<ParamField path="maxAttachments" type="number" default="1">
  Limita el número procesado.
</ParamField>
<ParamField path="prefer" type='"first" | "last" | "path" | "url"'>
  Preferencia de selección entre los archivos adjuntos candidatos.
</ParamField>

Cuando `mode: "all"`, las salidas se etiquetan como `[Image 1/2]`, `[Audio 2/2]`, etc.

<AccordionGroup>
  <Accordion title="Comportamiento de extracción de archivos adjuntos">
    - El texto extraído del archivo se envuelve como **contenido externo que no es de confianza** antes de añadirse al mensaje de medios.
    - El bloque inyectado usa marcadores de límite explícitos como `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` / `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>` e incluye una línea de metadatos `Source: External`.
    - Esta ruta de extracción de archivos adjuntos omite intencionalmente el largo banner `SECURITY NOTICE:` para evitar inflar el mensaje de medios; los marcadores de límite y los metadatos aún se mantienen.
    - Si un archivo no tiene texto extraíble, OpenClaw inyecta `[No extractable text]`.
    - Si un PDF recurre a imágenes de página renderizadas en esta ruta, el mensaje de medios mantiene el marcador de posición `[PDF content rendered to images; images not forwarded to model]` porque este paso de extracción de archivos adjuntos reenvía bloques de texto, no las imágenes renderizadas del PDF.

  </Accordion>
</AccordionGroup>

## Ejemplos de configuración

<Tabs>
  <Tab title="Modelos compartidos + anulaciones">
    ```json5
    {
      tools: {
        media: {
          models: [
            { provider: "openai", model: "gpt-5.5", capabilities: ["image"] },
            {
              provider: "google",
              model: "gemini-3-flash-preview",
              capabilities: ["image", "audio", "video"],
            },
            {
              type: "cli",
              command: "gemini",
              args: [
                "-m",
                "gemini-3-flash",
                "--allowed-tools",
                "read_file",
                "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
              ],
              capabilities: ["image", "video"],
            },
          ],
          audio: {
            attachments: { mode: "all", maxAttachments: 2 },
          },
          video: {
            maxChars: 500,
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="Solo audio + video">
    ```json5
    {
      tools: {
        media: {
          audio: {
            enabled: true,
            models: [
              { provider: "openai", model: "gpt-4o-mini-transcribe" },
              {
                type: "cli",
                command: "whisper",
                args: ["--model", "base", "{{MediaPath}}"],
              },
            ],
          },
          video: {
            enabled: true,
            maxChars: 500,
            models: [
              { provider: "google", model: "gemini-3-flash-preview" },
              {
                type: "cli",
                command: "gemini",
                args: [
                  "-m",
                  "gemini-3-flash",
                  "--allowed-tools",
                  "read_file",
                  "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
                ],
              },
            ],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="Solo imagen">
    ```json5
    {
      tools: {
        media: {
          image: {
            enabled: true,
            maxBytes: 10485760,
            maxChars: 500,
            models: [
              { provider: "openai", model: "gpt-5.5" },
              { provider: "anthropic", model: "claude-opus-4-6" },
              {
                type: "cli",
                command: "gemini",
                args: [
                  "-m",
                  "gemini-3-flash",
                  "--allowed-tools",
                  "read_file",
                  "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
                ],
              },
            ],
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="Entrada única multimodal">
    ```json5
    {
      tools: {
        media: {
          image: {
            models: [
              {
                provider: "google",
                model: "gemini-3.1-pro-preview",
                capabilities: ["image", "video", "audio"],
              },
            ],
          },
          audio: {
            models: [
              {
                provider: "google",
                model: "gemini-3.1-pro-preview",
                capabilities: ["image", "video", "audio"],
              },
            ],
          },
          video: {
            models: [
              {
                provider: "google",
                model: "gemini-3.1-pro-preview",
                capabilities: ["image", "video", "audio"],
              },
            ],
          },
        },
      },
    }
    ```
  </Tab>
</Tabs>

## Salida de estado

Cuando se ejecuta la comprensión de medios, `/status` incluye una breve línea de resumen:

```
📎 Media: image ok (openai/gpt-5.4) · audio skipped (maxBytes)
```

Esto muestra los resultados por capacidad y el proveedor/modelo elegido cuando sea aplicable.

## Notas

- La comprensión es **mejor esfuerzo posible**. Los errores no bloquean las respuestas.
- Los archivos adjuntos aún se pasan a los modelos incluso cuando la comprensión está deshabilitada.
- Use `scope` para limitar dónde se ejecuta la comprensión (por ejemplo, solo en mensajes directos).

## Relacionado

- [Configuración](/es/gateway/configuration)
- [Compatibilidad con imágenes y medios](/es/nodes/images)
