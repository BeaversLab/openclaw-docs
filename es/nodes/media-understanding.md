---
summary: "Comprensión de imagen/audio/video entrante (opcional) con proveedor + alternativas de CLI"
read_when:
  - Designing or refactoring media understanding
  - Tuning inbound audio/video/image preprocessing
title: "Comprensión de medios"
---

# Media Understanding - Inbound (2026-01-17)

OpenClaw puede **resumir los medios entrantes** (imagen/audio/video) antes de que se ejecute la canalización de respuesta. Detecta automáticamente cuándo hay herramientas locales o claves de proveedor disponibles, y se puede desactivar o personalizar. Si la comprensión está desactivada, los modelos siguen recibiendo los archivos/URL originales como de costumbre.

El comportamiento multimedia específico del proveedor se registra mediante complementos del proveedor, mientras que el núcleo de OpenClaw posee la configuración `tools.media` compartida, el orden de reserva y la integración con la canalización de respuesta.

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
   - El audio establece `{{Transcript}}`; el análisis de comandos usa el texto del subtítulo cuando está presente,
     de lo contrario la transcripción.
   - Los subtítulos se conservan como `User text:` dentro del bloque.

Si falla o se deshabilita la comprensión, **el flujo de respuesta continúa** con el cuerpo y los archivos adjuntos originales.

## Descripción general de la configuración

`tools.media` admite **modelos compartidos** más anulaciones por capacidad:

- `tools.media.models`: lista de modelos compartidos (use `capabilities` para bloquear).
- `tools.media.image` / `tools.media.audio` / `tools.media.video`:
  - valores predeterminados (`prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`)
  - anulaciones del proveedor (`baseUrl`, `headers`, `providerOptions`)
  - opciones de audio de Deepgram a través de `tools.media.audio.providerOptions.deepgram`
  - controles de eco de transcripción de audio (`echoTranscript`, predeterminado `false`; `echoFormat`)
  - opcional **lista `models` por capacidad** (preferida antes que los modelos compartidos)
  - política `attachments` (`mode`, `maxAttachments`, `prefer`)
  - `scope` (filtrado opcional por canal/chatType/clave de sesión)
- `tools.media.concurrency`: máximo de ejecuciones simultáneas de capacidades (por defecto **2**).

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

Cada entrada `models[]` puede ser **provider** o **CLI**:

```json5
{
  type: "provider", // default if omitted
  provider: "openai",
  model: "gpt-5.2",
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

## Valores predeterminados y límites

Valores predeterminados recomendados:

- `maxChars`: **500** para imagen/vídeo (breve, apto para comandos)
- `maxChars`: **sin establecer** para audio (transcripción completa a menos que se establezca un límite)
- `maxBytes`:
  - imagen: **10MB**
  - audio: **20MB**
  - vídeo: **50MB**

Reglas:

- Si el medio excede `maxBytes`, ese modelo se omite y se **intenta con el siguiente modelo**.
- Los archivos de audio menores de **1024 bytes** se tratan como vacíos/corruptos y se omiten antes de la transcripción del proveedor/CLI.
- Si el modelo devuelve más de `maxChars`, el resultado se recorta.
- `prompt` usa por defecto un simple "Describe the {media}." más la guía `maxChars` (solo imagen/vídeo).
- Si `<capability>.enabled: true` pero no hay modelos configurados, OpenClaw intenta el
  **modelo de respuesta activo** cuando su proveedor admite la capacidad.

### Detección automática de comprensión de medios (predeterminado)

Si `tools.media.<capability>.enabled` **no** está establecido en `false` y no ha
configurado modelos, OpenClaw detecta automáticamente en este orden y **se detiene en la primera
opción que funcione**:

1. **CLIs locales** (solo audio; si están instalados)
   - `sherpa-onnx-offline` (requiere `SHERPA_ONNX_MODEL_DIR` con codificador/decodificador/unidor/tokens)
   - `whisper-cli` (`whisper-cpp`; usa `WHISPER_CPP_MODEL` o el modelo tiny incluido)
   - `whisper` (CLI de Python; descarga modelos automáticamente)
2. **CLI de Gemini** (`gemini`) usando `read_many_files`
3. **Claves de proveedor**
   - Audio: OpenAI → Groq → Deepgram → Google
   - Imagen: OpenAI → Anthropic → Google → MiniMax
   - Vídeo: Google

Para desactivar la detección automática, configure:

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

Nota: La detección binaria se realiza con el mejor esfuerzo posible en macOS/Linux/Windows; asegúrese de que la CLI esté en `PATH` (nosotros expandimos `~`), o configure un modelo CLI explícito con una ruta de comando completa.

### Soporte de entorno de proxy (modelos de proveedor)

Cuando la comprensión de medios de **audio** y **vídeo** basada en proveedores está activada, OpenClaw
respeta las variables de entorno de proxy de salida estándar para las llamadas HTTP de proveedores:

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

Si no se establecen variables de entorno de proxy, la comprensión de medios utiliza una salida directa.
Si el valor del proxy está mal formado, OpenClaw registra una advertencia y recurre a una
obtención directa.

## Capacidades (opcional)

Si establece `capabilities`, la entrada solo se ejecuta para esos tipos de medios. Para listas
compartidas, OpenClaw puede inferir los valores predeterminados:

- `openai`, `anthropic`, `minimax`: **imagen**
- `moonshot`: **imagen + vídeo**
- `google` (API de Gemini): **imagen + audio + vídeo**
- `mistral`: **audio**
- `zai`: **imagen**
- `groq`: **audio**
- `deepgram`: **audio**

Para las entradas de CLI, **establezca `capabilities` explícitamente** para evitar coincidencias sorprendentes.
Si omite `capabilities`, la entrada es elegible para la lista en la que aparece.

## Matriz de soporte de proveedores (integraciones de OpenClaw)

| Capacidad | Integración de proveedor                           | Notas                                                                                                   |
| --------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Imagen    | OpenAI, Anthropic, Google, MiniMax, Moonshot, Z.AI | Los complementos de proveedores registran el soporte de imagen contra la comprensión de medios central. |
| Audio     | OpenAI, Groq, Deepgram, Google, Mistral            | Transcripción del proveedor (Whisper/Deepgram/Gemini/Voxtral).                                          |
| Vídeo     | Google, Moonshot                                   | Comprensión de vídeo del proveedor a través de complementos de proveedor.                               |

## Guía de selección de modelo

- Prefiera el modelo más potente de la última generación disponible para cada capacidad multimedia cuando importen la calidad y la seguridad.
- Para agentes con herramientas habilitadas que manejen entradas que no son de confianza, evite modelos multimedia más antiguos/débiles.
- Mantenga al menos un respaldo por capacidad para garantizar disponibilidad (modelo de calidad + modelo más rápido/económico).
- Los respaldos de CLI (`whisper-cli`, `whisper`, `gemini`) son útiles cuando las API del proveedor no están disponibles.
- Nota `parakeet-mlx`: con `--output-dir`, OpenClaw lee `<output-dir>/<media-basename>.txt` cuando el formato de salida es `txt` (o no está especificado); los formatos que no son `txt` vuelven a stdout.

## Política de archivos adjuntos

El `attachments` por capacidad controla qué archivos adjuntos se procesan:

- `mode`: `first` (predeterminado) o `all`
- `maxAttachments`: limita la cantidad procesada (predeterminado **1**)
- `prefer`: `first`, `last`, `path`, `url`

Cuando `mode: "all"`, las salidas se etiquetan como `[Image 1/2]`, `[Audio 2/2]`, etc.

## Ejemplos de configuración

### 1) Lista de modelos compartidos + anulaciones

```json5
{
  tools: {
    media: {
      models: [
        { provider: "openai", model: "gpt-5.2", capabilities: ["image"] },
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

### 2) Solo audio + vídeo (imagen desactivada)

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

### 3) Comprensión de imágenes opcional

```json5
{
  tools: {
    media: {
      image: {
        enabled: true,
        maxBytes: 10485760,
        maxChars: 500,
        models: [
          { provider: "openai", model: "gpt-5.2" },
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

Cuando se ejecuta la comprensión multimedia, `/status` incluye una línea de resumen breve:

```
📎 Media: image ok (openai/gpt-5.2) · audio skipped (maxBytes)
```

Esto muestra los resultados por capacidad y el proveedor/modelo elegido, cuando corresponda.

## Notas

- La comprensión es con **mejor esfuerzo**. Los errores no bloquean las respuestas.
- Los archivos adjuntos aún se pasan a los modelos incluso cuando la comprensión está deshabilitada.
- Use `scope` para limitar dónde se ejecuta la comprensión (ej. solo MDs).

## Documentos relacionados

- [Configuración](/es/gateway/configuration)
- [Soporte de imágenes y multimedia](/es/nodes/images)

import es from "/components/footer/es.mdx";

<es />
