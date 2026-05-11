---
summary: "CLI con prioridad en inferencia para flujos de trabajo de modelos, imágenes, audio, TTS, video, web y incrustaciones respaldados por proveedores"
read_when:
  - Adding or modifying `openclaw infer` commands
  - Designing stable headless capability automation
title: "CLI de inferencia"
---

`openclaw infer` es la superficie principal sin interfaz gráfica para los flujos de trabajo de inferencia respaldados por proveedores.

Intencionalmente expone familias de capacidades, no nombres de RPC de puerta de enlace sin procesar ni identificadores de herramientas de agente sin procesar.

## Convierta infer en una habilidad

Copie y pegue esto en un agente:

```text
Read https://docs.openclaw.ai/cli/infer, then create a skill that routes my common workflows to `openclaw infer`.
Focus on model runs, image generation, video generation, audio transcription, TTS, web search, and embeddings.
```

Una buena habilidad basada en infer debería:

- asignar las intenciones comunes del usuario al subcomando de infer correcto
- incluir algunos ejemplos canónicos de infer para los flujos de trabajo que cubre
- preferir `openclaw infer ...` en ejemplos y sugerencias
- evitar volver a documentar toda la superficie de infer dentro del cuerpo de la habilidad

Cobertura típica de habilidad centrada en infer:

- `openclaw infer model run`
- `openclaw infer image generate`
- `openclaw infer audio transcribe`
- `openclaw infer tts convert`
- `openclaw infer web search`
- `openclaw infer embedding create`

## Por qué usar infer

`openclaw infer` proporciona una CLI consistente para las tareas de inferencia respaldadas por proveedores dentro de OpenClaw.

Beneficios:

- Utilice los proveedores y modelos ya configurados en OpenClaw en lugar de crear envoltorios únicos para cada backend.
- Mantenga los flujos de trabajo de modelo, imagen, transcripción de audio, TTS, video, web e incrustaciones bajo un mismo árbol de comandos.
- Utilice una forma de salida `--json` estable para scripts, automatización y flujos de trabajo impulsados por agentes.
- Prefiera una superficie de primera parte de OpenClaw cuando la tarea sea fundamentalmente "ejecutar inferencia".
- Utilice la ruta local normal sin requerir la puerta de enlace para la mayoría de los comandos de infer.

Para las comprobaciones de extremo a extremo de proveedores, prefiera `openclaw infer ...` una vez que las pruebas de
proveedor de nivel inferior estén en verde. Ejercita la CLI enviada, la carga de la configuración,
la resolución del agente predeterminado, la activación de complementos integrados, la reparación de dependencias de tiempo de ejecución
y el tiempo de ejecución de capacidad compartido antes de que se realice la solicitud del proveedor.

## Árbol de comandos

```text
 openclaw infer
  list
  inspect

  model
    run
    list
    inspect
    providers
    auth login
    auth logout
    auth status

  image
    generate
    edit
    describe
    describe-many
    providers

  audio
    transcribe
    providers

  tts
    convert
    voices
    providers
    status
    enable
    disable
    set-provider

  video
    generate
    describe
    providers

  web
    search
    fetch
    providers

  embedding
    create
    providers
```

## Tareas comunes

Esta tabla asigna tareas de inferencia comunes al comando infer correspondiente.

| Tarea                              | Comando                                                                | Notas                                                            |
| ---------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Ejecutar un prompt de texto/modelo | `openclaw infer model run --prompt "..." --json`                       | Usa la ruta local normal de forma predeterminada                 |
| Generar una imagen                 | `openclaw infer image generate --prompt "..." --json`                  | Use `image edit` cuando comience desde un archivo existente      |
| Describir un archivo de imagen     | `openclaw infer image describe --file ./image.png --json`              | `--model` debe ser un `<provider/model>` con capacidad de imagen |
| Transcribir audio                  | `openclaw infer audio transcribe --file ./memo.m4a --json`             | `--model` debe ser `<provider/model>`                            |
| Sintetizar voz                     | `openclaw infer tts convert --text "..." --output ./speech.mp3 --json` | `tts status` está orientado a la puerta de enlace                |
| Generar un video                   | `openclaw infer video generate --prompt "..." --json`                  | Admite sugerencias de proveedor como `--resolution`              |
| Describir un archivo de video      | `openclaw infer video describe --file ./clip.mp4 --json`               | `--model` debe ser `<provider/model>`                            |
| Buscar en la web                   | `openclaw infer web search --query "..." --json`                       |                                                                  |
| Obtener una página web             | `openclaw infer web fetch --url https://example.com --json`            |                                                                  |
| Crear incrustaciones               | `openclaw infer embedding create --text "..." --json`                  |                                                                  |

## Comportamiento

- `openclaw infer ...` es la superficie principal de la CLI para estos flujos de trabajo.
- Use `--json` cuando la salida vaya a ser consumida por otro comando o script.
- Use `--provider` o `--model provider/model` cuando se requiera un backend específico.
- Para `image describe`, `audio transcribe` y `video describe`, `--model` debe usar el formulario `<provider/model>`.
- Para `image describe`, un `--model` explícito ejecuta ese proveedor/modelo directamente. El modelo debe ser capaz de procesar imágenes en el catálogo de modelos o en la configuración del proveedor. `codex/<model>` ejecuta un turno de comprensión de imágenes del servidor de aplicaciones Codex delimitado; `openai-codex/<model>` usa la ruta del proveedor OAuth de OpenAI Codex.
- Los comandos de ejecución sin estado predeterminan a local.
- Los comandos de estado administrados por puerta de enlace predeterminan a gateway.
- La ruta local normal no requiere que la puerta de enlace esté ejecutándose.
- `model run` es de un solo disparo. Los servidores MCP abiertos a través del tiempo de ejecución del agente para ese comando se retiran después de la respuesta tanto para la ejecución local como `--gateway`, por lo que las invocaciones de script repetidas no mantienen los procesos secundarios MCP stdio vivos.

## Modelo

Use `model` para inferencia de texto respaldada por el proveedor e inspección de modelo/proveedor.

```bash
openclaw infer model run --prompt "Reply with exactly: smoke-ok" --json
openclaw infer model run --prompt "Summarize this changelog entry" --provider openai --json
openclaw infer model providers --json
openclaw infer model inspect --name gpt-5.5 --json
```

Notas:

- `model run` reutiliza el tiempo de ejecución del agente, por lo que las anulaciones de modelo/proveedor se comportan como la ejecución normal del agente.
- Debido a que `model run` está diseñado para la automatización sin cabeza, no retiene los tiempos de ejecución de MCP empaquetados por sesión después de que finaliza el comando.
- `model auth login`, `model auth logout` y `model auth status` administran el estado de autenticación del proveedor guardado.

## Imagen

Use `image` para generación, edición y descripción.

```bash
openclaw infer image generate --prompt "friendly lobster illustration" --json
openclaw infer image generate --prompt "cinematic product photo of headphones" --json
openclaw infer image generate --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "simple red circle sticker on a transparent background" --json
openclaw infer image generate --prompt "slow image backend" --timeout-ms 180000 --json
openclaw infer image edit --file ./logo.png --model openai/gpt-image-1.5 --output-format png --background transparent --prompt "keep the logo, remove the background" --json
openclaw infer image edit --file ./poster.png --prompt "make this a vertical story ad" --size 2160x3840 --aspect-ratio 9:16 --resolution 4K --json
openclaw infer image describe --file ./photo.jpg --json
openclaw infer image describe --file ./ui-screenshot.png --model openai/gpt-4.1-mini --json
openclaw infer image describe --file ./photo.jpg --model ollama/qwen2.5vl:7b --json
```

Notas:

- Use `image edit` al partir de archivos de entrada existentes.
- Use `--size`, `--aspect-ratio` o `--resolution` con `image edit` para
  proveedores/modelos que admiten sugerencias geométricas en ediciones de imágenes de referencia.
- Use `--output-format png --background transparent` con
  `--model openai/gpt-image-1.5` para la salida PNG de OpenAI con fondo transparente;
  `--openai-background` sigue disponible como un alias específico de OpenAI. Los proveedores
  que no declaran soporte de fondo reportan la sugerencia como una invalidación ignorada.
- Use `image providers --json` para verificar qué proveedores de imágenes incluidos son
  detectables, configurados, seleccionados y qué capacidades de generación/edición
  expone cada proveedor.
- Use `image generate --model <provider/model> --json` como la prueba de humeo (smoke) en vivo más estrecha
  de la CLI para cambios en la generación de imágenes. Ejemplo:

  ```bash
  openclaw infer image providers --json
  openclaw infer image generate \
    --model google/gemini-3.1-flash-image-preview \
    --prompt "Minimal flat test image: one blue square on a white background, no text." \
    --output ./openclaw-infer-image-smoke.png \
    --json
  ```

  La respuesta JSON reporta `ok`, `provider`, `model`, `attempts` y las rutas
  de salida escritas. Cuando se establece `--output`, la extensión final puede seguir el
  tipo MIME devuelto por el proveedor.

- Para `image describe`, `--model` debe ser un `<provider/model>` con capacidad de imagen.
- Para modelos de visión locales de Ollama, extraiga el modelo primero y establezca `OLLAMA_API_KEY` en cualquier valor de marcador de posición, por ejemplo `ollama-local`. Consulte [Ollama](/es/providers/ollama#vision-and-image-description).

## Audio

Use `audio` para la transcripción de archivos.

```bash
openclaw infer audio transcribe --file ./memo.m4a --json
openclaw infer audio transcribe --file ./team-sync.m4a --language en --prompt "Focus on names and action items" --json
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

Notas:

- `audio transcribe` es para la transcripción de archivos, no para la gestión de sesiones en tiempo real.
- `--model` debe ser `<provider/model>`.

## TTS

Use `tts` para la síntesis de voz y el estado del proveedor de TTS.

```bash
openclaw infer tts convert --text "hello from openclaw" --output ./hello.mp3 --json
openclaw infer tts convert --text "Your build is complete" --output ./build-complete.mp3 --json
openclaw infer tts providers --json
openclaw infer tts status --json
```

Notas:

- `tts status` usa 'gateway' de forma predeterminada porque refleja el estado de TTS administrado por el gateway.
- Use `tts providers`, `tts voices` y `tts set-provider` para inspeccionar y configurar el comportamiento de TTS.

## Video

Use `video` para la generación y la descripción.

```bash
openclaw infer video generate --prompt "cinematic sunset over the ocean" --json
openclaw infer video generate --prompt "slow drone shot over a forest lake" --resolution 768P --duration 6 --json
openclaw infer video describe --file ./clip.mp4 --json
openclaw infer video describe --file ./clip.mp4 --model openai/gpt-4.1-mini --json
```

Notas:

- `video generate` acepta `--size`, `--aspect-ratio`, `--resolution`, `--duration`, `--audio`, `--watermark` y `--timeout-ms` y los reenvía al tiempo de ejecución de generación de video.
- `--model` debe ser `<provider/model>` para `video describe`.

## Web

Use `web` para flujos de trabajo de búsqueda y recuperación.

```bash
openclaw infer web search --query "OpenClaw docs" --json
openclaw infer web search --query "OpenClaw infer web providers" --json
openclaw infer web fetch --url https://docs.openclaw.ai/cli/infer --json
openclaw infer web providers --json
```

Notas:

- Use `web providers` para inspeccionar los proveedores disponibles, configurados y seleccionados.

## Incrustación (Embedding)

Use `embedding` para la creación de vectores y la inspección de proveedores de incrustación.

```bash
openclaw infer embedding create --text "friendly lobster" --json
openclaw infer embedding create --text "customer support ticket: delayed shipment" --model openai/text-embedding-3-large --json
openclaw infer embedding providers --json
```

## Salida JSON

Los comandos de inferencia normalizan la salida JSON bajo un sobre compartido:

```json
{
  "ok": true,
  "capability": "image.generate",
  "transport": "local",
  "provider": "openai",
  "model": "gpt-image-2",
  "attempts": [],
  "outputs": []
}
```

Los campos de nivel superior son estables:

- `ok`
- `capability`
- `transport`
- `provider`
- `model`
- `attempts`
- `outputs`
- `error`

Para los comandos de medios generados, `outputs` contiene los archivos escritos por OpenClaw. Use
`path`, `mimeType`, `size` y cualquier dimensión específica del medio en esa matriz
para la automatización en lugar de analizar la salida legible por humanos.

## Errores comunes

```bash
# Bad
openclaw infer media image generate --prompt "friendly lobster"

# Good
openclaw infer image generate --prompt "friendly lobster"
```

```bash
# Bad
openclaw infer audio transcribe --file ./memo.m4a --model whisper-1 --json

# Good
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

## Notas

- `openclaw capability ...` es un alias de `openclaw infer ...`.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Modelos](/es/concepts/models)
