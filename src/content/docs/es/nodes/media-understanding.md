---
summary: "Comprensión de imagen/audio/video entrante (opcional) con proveedor + alternativas de CLI"
read_when:
  - Designing or refactoring media understanding
  - Tuning inbound audio/video/image preprocessing
title: "Comprensión de medios"
---

# Media Understanding - Inbound (2026-01-17)

OpenClaw puede **resumir los medios entrantes** (imagen/audio/video) antes de que se ejecute la canalización de respuesta. Detecta automáticamente cuándo hay herramientas locales o claves de proveedor disponibles, y se puede desactivar o personalizar. Si la comprensión está desactivada, los modelos siguen recibiendo los archivos/URL originales como de costumbre.

El comportamiento específico del proveedor para medios es registrado por los complementos del proveedor, mientras que el núcleo de OpenClaw posee la configuración `tools.media` compartida, el orden de reserva y la integración con la canalización de respuesta.

## Objetivos

- Opcional: pre-procesar los medios entrantes en texto breve para un enrutamiento más rápido y un mejor análisis de comandos.
- Conservar la entrega de medios original al modelo (siempre).
- Soportar **APIs de proveedores** y **reservas de CLI**.
- Permitir múltiples modelos con reserva ordenada (error/tamaño/tiempo de espera).

## Comportamiento de alto nivel

1. Recopilar archivos adjuntos entrantes (`MediaPaths`, `MediaUrls`, `MediaTypes`).
2. Para cada capacidad habilitada (imagen/audio/video), seleccione los archivos adjuntos según la política (predeterminado: **primero**).
3. Elija la primera entrada de modelo elegible (tamaño + capacidad + autenticación).
4. Si un modelo falla o el medio es demasiado grande, **recurra a la siguiente entrada**.
5. En caso de éxito:
   - `Body` se convierte en bloque `[Image]`, `[Audio]` o `[Video]`.
   - El audio establece `{{Transcript}}`; el análisis de comandos utiliza el texto del subtítulo cuando está presente, de lo contrario la transcripción.
   - Los subtítulos se conservan como `User text:` dentro del bloque.

Si falla o se deshabilita la comprensión, **el flujo de respuesta continúa** con el cuerpo y los archivos adjuntos originales.

## Descripción general de la configuración

`tools.media` admite **modelos compartidos** además de anulaciones por capacidad:

- `tools.media.models`: lista de modelos compartidos (use `capabilities` para habilitar).
- `tools.media.image` / `tools.media.audio` / `tools.media.video`:
  - valores predeterminados (`prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`)
  - anulaciones de proveedor (`baseUrl`, `headers`, `providerOptions`)
  - Opciones de audio de Deepgram a través de `tools.media.audio.providerOptions.deepgram`
  - controles de eco de transcripción de audio (`echoTranscript`, predeterminado `false`; `echoFormat`)
  - **lista `models` por capacidad** opcional (preferida antes que los modelos compartidos)
  - política de `attachments` (`mode`, `maxAttachments`, `prefer`)
  - `scope` (habilitación opcional por clave de canal/chatType/sesión)
- `tools.media.concurrency`: máximo de ejecuciones simultáneas de capacidades (predeterminado **2**).

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

Cada entrada `models[]` puede ser **proveedor** o **CLI**:

```json5
{
  type: "provider", // default if omitted
  provider: "openai",
  model: "gpt-5.4-mini",
  prompt: "Describe the image in <= 500 chars.",
  maxChars: 500,
  maxBytes: 10485760,
  timeoutSeconds: 60,
  capabilities: ["image"], // optional, used for multi‑modal entries
  profile: "vision-profile",
  preferredProfile: "vision-fallback",
}
```

```json5
{
  type: "cli",
  command: "gemini",
  args: ["-m", "gemini-3-flash", "--allowed-tools", "read_file", "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."],
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

## Valores predeterminados y límites

Valores predeterminados recomendados:

- `maxChars`: **500** para imagen/video (breve, amigable para comandos)
- `maxChars`: **unset** para audio (transcripción completa a menos que establezcas un límite)
- `maxBytes`:
  - imagen: **10MB**
  - audio: **20MB**
  - vídeo: **50MB**

Reglas:

- Si el medio supera `maxBytes`, ese modelo se omite y se **prueba el siguiente modelo**.
- Los archivos de audio menores de **1024 bytes** se tratan como vacíos/corruptos y se omiten antes de la transcripción del proveedor/CLI.
- Si el modelo devuelve más de `maxChars`, la salida se recorta.
- `prompt` por defecto es un simple "Describe el {media}." más la guía `maxChars` (solo imagen/video).
- Si el modelo de imagen principal activo ya es compatible nativamente con la visión, OpenClaw
  omite el bloque de resumen `[Image]` y pasa la imagen original al
  modelo en su lugar.
- Si `<capability>.enabled: true` pero no hay modelos configurados, OpenClaw intenta el
  **modelo de respuesta activo** cuando su proveedor admite la capacidad.

### Detección automática de comprensión de medios (predeterminado)

Si `tools.media.<capability>.enabled` **no** está establecido en `false` y no has
configurado modelos, OpenClaw detecta automáticamente en este orden y **se detiene en la primera
opción que funcione**:

1. **Modelo de respuesta activo** cuando su proveedor admite la capacidad.
2. Referencias principales/de reserva **`agents.defaults.imageModel`** (solo imagen).
3. **CLI locales** (solo audio; si están instalados)
   - `sherpa-onnx-offline` (requiere `SHERPA_ONNX_MODEL_DIR` con codificador/decodificador/unidor/tokens)
   - `whisper-cli` (`whisper-cpp`; usa `WHISPER_CPP_MODEL` o el modelo tiny incluido)
   - `whisper` (CLI de Python; descarga modelos automáticamente)
4. **CLI de Gemini** (`gemini`) usando `read_many_files`
5. **Autenticación del proveedor**
   - Las entradas `models.providers.*` configuradas que admiten la capacidad se
     prueban antes del orden de reserva incluido.
   - Los proveedores de configuración solo de imagen con un modelo con capacidad de imagen se registran automáticamente para
     la comprensión de medios incluso cuando no son un complemento de proveedor incluido.
   - Orden de reserva incluido:
     - Audio: OpenAI → Groq → Deepgram → Google → Mistral
     - Imagen: OpenAI → Anthropic → Google → MiniMax → MiniMax Portal → Z.AI
     - Video: Google → Qwen → Moonshot

Para desactivar la detección automática, establece:

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

Nota: La detección binaria es de mejor esfuerzo en macOS/Linux/Windows; asegúrese de que la CLI esté en `PATH` (nosotros expandimos `~`), o establezca un modelo de CLI explícito con una ruta de comando completa.

### Soporte de entorno de proxy (modelos de proveedor)

Cuando la comprensión de medios de **audio** y **video** basada en proveedores está habilitada, OpenClaw respeta las variables de entorno de proxy de salida estándar para las llamadas HTTP del proveedor:

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

Si no se establecen variables de entorno de proxy, la comprensión de medios usa una salida directa. Si el valor del proxy está malformado, OpenClaw registra una advertencia y recurre a una obtención directa.

## Capacidades (opcional)

Si establece `capabilities`, la entrada solo se ejecuta para esos tipos de medios. Para listas compartidas, OpenClaw puede inferir los valores predeterminados:

- `openai`, `anthropic`, `minimax`: **imagen**
- `minimax-portal`: **imagen**
- `moonshot`: **imagen + video**
- `openrouter`: **imagen**
- `google` (API de Gemini): **imagen + audio + video**
- `qwen`: **imagen + video**
- `mistral`: **audio**
- `zai`: **imagen**
- `groq`: **audio**
- `deepgram`: **audio**
- Cualquier catálogo `models.providers.<id>.models[]` con un modelo con capacidad de imagen:
  **imagen**

Para las entradas de CLI, **establezca `capabilities` explícitamente** para evitar coincidencias sorprendentes. Si omite `capabilities`, la entrada es elegible para la lista en la que aparece.

## Matriz de soporte de proveedores (integraciones de OpenClaw)

| Capacidad | Integración de proveedor                                                                           | Notas                                                                                                                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Imagen    | OpenAI, OpenRouter, Anthropic, Google, MiniMax, Moonshot, Qwen, Z.AI, proveedores de configuración | Los complementos de proveedores registran soporte de imagen; MiniMax y MiniMax OAuth ambos usan `MiniMax-VL-01`; los proveedores de configuración con capacidad de imagen se registran automáticamente. |
| Audio     | OpenAI, Groq, Deepgram, Google, Mistral                                                            | Transcripción del proveedor (Whisper/Deepgram/Gemini/Voxtral).                                                                                                                                          |
| Video     | Google, Qwen, Moonshot                                                                             | Comprensión de vídeo del proveedor a través de complementos del proveedor; la comprensión de vídeo Qwen utiliza los endpoints estándar de DashScope.                                                    |

Nota de MiniMax:

- La comprensión de imágenes de `minimax` y `minimax-portal` proviene del
  proveedor de medios `MiniMax-VL-01` propiedad del complemento.
- El catálogo de texto de MiniMax incluido todavía comienza solo con texto; las entradas
  `models.providers.minimax` explícitas materializan referencias de chat M2.7 con capacidad de imagen.

## Guía de selección de modelo

- Prefiera el modelo más reciente y más potente disponible para cada capacidad de medios cuando la calidad y la seguridad son importantes.
- Para agentes con herramientas habilitadas que manejen entradas que no son de confianza, evite modelos de medios más antiguos o más débiles.
- Mantenga al menos una alternativa por capacidad para disponibilidad (modelo de calidad + modelo más rápido/económico).
- Las alternativas de CLI (`whisper-cli`, `whisper`, `gemini`) son útiles cuando las API del proveedor no están disponibles.
- Nota de `parakeet-mlx`: con `--output-dir`, OpenClaw lee `<output-dir>/<media-basename>.txt` cuando el formato de salida es `txt` (o no especificado); los formatos que no son `txt` se remiten a stdout.

## Política de archivos adjuntos

El `attachments` por capacidad controla qué archivos adjuntos se procesan:

- `mode`: `first` (predeterminado) o `all`
- `maxAttachments`: limitar el número procesado (predeterminado **1**)
- `prefer`: `first`, `last`, `path`, `url`

Cuando `mode: "all"`, las salidas se etiquetan como `[Image 1/2]`, `[Audio 2/2]`, etc.

Comportamiento de extracción de archivos adjuntos:

- El texto de archivo extraído se envuelve como **contenido externo que no es de confianza** antes de que se
  anexe al aviso de medios.
- El bloque inyectado utiliza marcadores de límite explícitos como
  `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` /
  `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>` e incluye una
  línea de metadatos `Source: External`.
- Esta ruta de extracción de archivos adjuntos omite intencionalmente el `SECURITY NOTICE:` largo para evitar inflar el mensaje de medios; los marcadores de límite y los metadatos aún permanecen.
- Si un archivo no tiene texto extraíble, OpenClaw inyecta `[No extractable text]`.
- Si un PDF vuelve a las imágenes renderizadas de la página en esta ruta, el mensaje de medios mantiene el marcador de posición `[PDF content rendered to images; images not forwarded to model]` porque este paso de extracción de archivos adjuntos reenvía bloques de texto, no las imágenes renderizadas del PDF.

## Ejemplos de configuración

### 1) Lista de modelos compartidos + anulaciones

```json5
{
  tools: {
    media: {
      models: [
        { provider: "openai", model: "gpt-5.4-mini", capabilities: ["image"] },
        {
          provider: "google",
          model: "gemini-3-flash-preview",
          capabilities: ["image", "audio", "video"],
        },
        {
          type: "cli",
          command: "gemini",
          args: ["-m", "gemini-3-flash", "--allowed-tools", "read_file", "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."],
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

### 2) Solo Audio + Video (imagen desactivada)

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
            args: ["-m", "gemini-3-flash", "--allowed-tools", "read_file", "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."],
          },
        ],
      },
    },
  },
}
```

### 3) Comprensión de imagen opcional

```json5
{
  tools: {
    media: {
      image: {
        enabled: true,
        maxBytes: 10485760,
        maxChars: 500,
        models: [
          { provider: "openai", model: "gpt-5.4-mini" },
          { provider: "anthropic", model: "claude-opus-4-6" },
          {
            type: "cli",
            command: "gemini",
            args: ["-m", "gemini-3-flash", "--allowed-tools", "read_file", "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters."],
          },
        ],
      },
    },
  },
}
```

### 4) Entrada única multimodal (capacidades explícitas)

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

## Salida de estado

Cuando se ejecuta la comprensión de medios, `/status` incluye una línea de resumen breve:

```
📎 Media: image ok (openai/gpt-5.4-mini) · audio skipped (maxBytes)
```

Esto muestra los resultados por capacidad y el proveedor/modelo elegido cuando sea aplicable.

## Notas

- La comprensión es de **mejor esfuerzo posible**. Los errores no bloquean las respuestas.
- Los archivos adjuntos aún se pasan a los modelos incluso cuando la comprensión está deshabilitada.
- Use `scope` para limitar dónde se ejecuta la comprensión (por ejemplo, solo MDs).

## Documentos relacionados

- [Configuración](/en/gateway/configuration)
- [Soporte de imágenes y medios](/en/nodes/images)
