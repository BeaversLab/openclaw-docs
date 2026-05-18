---
summary: "CLI con prioridad de inferencia para flujos de trabajo de modelo, imagen, audio, TTS, video, web e incrustaciones respaldados por proveedores"
read_when:
  - Adding or modifying `openclaw infer` commands
  - Designing stable headless capability automation
title: "CLI de inferencia"
---

`openclaw infer` es la superficie principal sin interfaz para los flujos de trabajo de inferencia respaldados por proveedores.

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
- prefiera `openclaw infer ...` en ejemplos y sugerencias
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

Para las comprobaciones de extremo a extremo del proveedor, prefiera `openclaw infer ...` una vez que las pruebas de menor nivel del proveedor sean exitosas. Ejecuta la CLI enviada, la carga de configuración,
la resolución del agente predeterminado, la activación del complemento incluido y el tiempo de ejecución de capacidad compartida
antes de que se realice la solicitud del proveedor.

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

| Tarea                                   | Comando                                                                                       | Notas                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Ejecutar un prompt de texto/modelo      | `openclaw infer model run --prompt "..." --json`                                              | Usa la ruta local normal de forma predeterminada                 |
| Ejecutar un aviso de modelo en imágenes | `openclaw infer model run --prompt "Describe this" --file ./image.png --model provider/model` | Repita `--file` para múltiples entradas de imagen                |
| Generar una imagen                      | `openclaw infer image generate --prompt "..." --json`                                         | Use `image edit` cuando comience desde un archivo existente      |
| Describir un archivo de imagen o URL    | `openclaw infer image describe --file ./image.png --prompt "..." --json`                      | `--model` debe ser un `<provider/model>` con capacidad de imagen |
| Transcribir audio                       | `openclaw infer audio transcribe --file ./memo.m4a --json`                                    | `--model` debe ser `<provider/model>`                            |
| Sintetizar voz                          | `openclaw infer tts convert --text "..." --output ./speech.mp3 --json`                        | `tts status` está orientado a la puerta de enlace                |
| Generar un video                        | `openclaw infer video generate --prompt "..." --json`                                         | Admite sugerencias de proveedor como `--resolution`              |
| Describir un archivo de video           | `openclaw infer video describe --file ./clip.mp4 --json`                                      | `--model` debe ser `<provider/model>`                            |
| Buscar en la web                        | `openclaw infer web search --query "..." --json`                                              |                                                                  |
| Recuperar una página web                | `openclaw infer web fetch --url https://example.com --json`                                   |                                                                  |
| Crear incrustaciones                    | `openclaw infer embedding create --text "..." --json`                                         |                                                                  |

## Comportamiento

- `openclaw infer ...` es la superficie principal de la CLI para estos flujos de trabajo.
- Use `--json` cuando la salida vaya a ser consumida por otro comando o script.
- Use `--provider` o `--model provider/model` cuando se requiera un backend específico.
- Use `model run --thinking <level>` para pasar un nivel de razonamiento/pensamiento de un solo disparo (`off`, `minimal`, `low`, `medium`, `high`, `adaptive`, `xhigh` o `max`) mientras mantiene la ejecución sin procesar.
- Para `image describe`, `audio transcribe` y `video describe`, `--model` debe usar el formulario `<provider/model>`.
- Para `image describe`, `--file` acepta rutas locales y URL de imagen HTTP(S). Las URL remotas utilizan la política SSRF de obtención de medios normal.
- Para `image describe`, un `--model` explícito ejecuta ese proveedor/modelo directamente. El modelo debe ser capaz de procesar imágenes en el catálogo de modelos o en la configuración del proveedor. `codex/<model>` ejecuta un turno de comprensión de imágenes del servidor de aplicaciones Codex delimitado; `openai-codex/<model>` utiliza la ruta del proveedor OAuth de OpenAI Codex.
- Los comandos de ejecución sin estado predeterminan a local.
- Los comandos de estado administrados por Gateway predeterminan a gateway.
- La ruta local normal no requiere que el gateway esté en ejecución.
- El `model run` local es una finalización de proveedor de un solo tiro ligera. Resuelve el modelo de agente configurado y la autenticación, pero no inicia un turno de agente de chat, carga herramientas ni abre servidores MCP empaquetados.
- `model run --file` acepta archivos de imagen, detecta su tipo MIME y los envía con el mensaje proporcionado al modelo seleccionado. Repita `--file` para varias imágenes.
- `model run --file` rechaza las entradas que no son imágenes. Use `infer audio transcribe` para archivos de audio y `infer video describe` para archivos de video.
- `model run --gateway` ejerce el enrutamiento de Gateway, la autenticación guardada, la selección de proveedor y el tiempo de ejecución integrado, pero aún se ejecuta como una sonda de modelo sin formato: envía el mensaje proporcionado y cualquier archivo adjunto de imagen sin transcripción de sesión previa, contexto de arranque/AGENTS, ensamblaje del motor de contexto, herramientas o servidores MCP empaquetados.
- `model run --gateway --model <provider/model>` requiere una credencial de gateway de operador de confianza porque la solicitud le pide al Gateway que ejecute una anulación única de proveedor/modelo.
- El `model run --thinking` local utiliza la ruta de finalización de proveedor ligera; los niveles específicos del proveedor, como `adaptive` y `max`, se asignan al nivel portátil de finalización simple más cercano.

## Modelo

Use `model` para la inferencia de texto respaldada por el proveedor y la inspección de modelo/proveedor.

```bash
openclaw infer model run --prompt "Reply with exactly: smoke-ok" --json
openclaw infer model run --prompt "Summarize this changelog entry" --model openai/gpt-5.4 --json
openclaw infer model run --prompt "Describe this image in one sentence" --file ./photo.jpg --model google/gemini-2.5-flash --json
openclaw infer model run --prompt "Use more reasoning here" --thinking high --json
openclaw infer model providers --json
openclaw infer model inspect --name gpt-5.5 --json
```

Use full `<provider/model>` refs to smoke-test a specific provider without
starting the Gateway or loading the full agent tool surface:

```bash
openclaw infer model run --local --model anthropic/claude-sonnet-4-6 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model cerebras/zai-glm-4.7 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model google/gemini-2.5-flash --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model groq/llama-3.1-8b-instant --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model mistral/mistral-medium-3-5 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model mistral/mistral-small-latest --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model openai/gpt-4.1 --prompt "Reply with exactly: pong" --json
openclaw infer model run --local --model ollama/qwen2.5vl:7b --prompt "Describe this image." --file ./photo.jpg --json
```

Notas:

- Local `model run` es la prueba de humo CLI más estrecha para la salud del proveedor/modelo/autenticación porque, para los proveedores que no son Codex, envía solo el mensaje suministrado al modelo seleccionado.
- Local `model run --model <provider/model>` puede usar filas exactas del catálogo estático incluido de `models list --all` antes de que ese proveedor se escriba en la configuración. La autenticación del proveedor aún es necesaria; las credenciales faltantes fallan como errores de autenticación, no como `Unknown model`.
- Para las sondas de razonamiento Mistral Medium 3.5, deje la temperatura sin establecer/predeterminada. Mistral rechaza `reasoning_effort="high"` más `temperature: 0`; use `mistral/mistral-medium-3-5` con la temperatura predeterminada o un valor distinto de cero del modo de razonamiento, como `0.7`.
- Las sondas locales `openai-codex/*` son la excepción estrecha: OpenClaw añade una instrucción mínima del sistema para que el transporte Codex Responses pueda completar su campo requerido `instructions`, sin añadir el contexto completo del agente, herramientas, memoria o transcripción de la sesión.
- Local `model run --file` mantiene esa ruta ajustada y adjunta el contenido de la imagen directamente al mensaje único del usuario. Los archivos de imagen comunes como PNG, JPEG y WebP funcionan cuando su tipo MIME se detecta como `image/*`; los archivos no compatibles o no reconocidos fallan antes de llamar al proveedor.
- `model run --file` es mejor cuando desea probar directamente el modelo de texto multimodal seleccionado. Use `infer image describe` cuando desee la selección de proveedor de comprensión de imágenes y el enrutamiento de modelo de imagen predeterminado de OpenClaw.
- El modelo seleccionado debe admitir la entrada de imagen; los modelos de solo texto pueden rechazar la solicitud en la capa del proveedor.
- `model run --prompt` debe contener texto que no sea solo espacios en blanco; los mensajes vacíos se rechazan antes de llamar a los proveedores locales o al Gateway.
- Local `model run` sale con un valor distinto de cero cuando el proveedor no devuelve ninguna salida de texto, por lo que los proveedores locales inalcanzables y las finalizaciones vacías no parecen sondas exitosas.
- Use `model run --gateway` cuando necesites probar el enrutamiento de Gateway, la configuración del agente-runtime o el estado del proveedor administrado por Gateway, manteniendo la entrada del modelo en bruto. Use `openclaw agent` o superficies de chat cuando desee el contexto completo del agente, herramientas, memoria y la transcripción de la sesión.
- `model auth login`, `model auth logout` y `model auth status` gestionan el estado de autenticación guardado del proveedor.

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
openclaw infer image describe --file https://example.com/photo.png --json
openclaw infer image describe --file ./receipt.jpg --prompt "Extract the merchant, date, and total" --json
openclaw infer image describe-many --file ./before.png --file ./after.png --prompt "Compare the screenshots and list visible UI changes" --json
openclaw infer image describe --file ./ui-screenshot.png --model openai/gpt-4.1-mini --json
openclaw infer image describe --file ./photo.jpg --model ollama/qwen2.5vl:7b --prompt "Describe the image in one sentence" --timeout-ms 300000 --json
```

Notas:

- Use `image edit` cuando comience desde archivos de entrada existentes.
- Use `--size`, `--aspect-ratio` o `--resolution` con `image edit` para
  proveedores/modelos que admiten sugerencias geométricas en ediciones de imágenes de referencia.
- Use `--output-format png --background transparent` con
  `--model openai/gpt-image-1.5` para obtener salida PNG de OpenAI con fondo transparente;
  `--openai-background` sigue disponible como un alias específico de OpenAI. Los proveedores
  que no declaran compatibilidad con fondos reportan la sugerencia como una invalidación ignorada.
- Use `image providers --json` para verificar qué proveedores de imágenes incluidos son
  descubribles, configurados, seleccionados y qué capacidades de generación/edición
  expone cada proveedor.
- Use `image generate --model <provider/model> --json` como la prueba de humo (smoke) más estrecha
  de la CLI en vivo para cambios en la generación de imágenes. Ejemplo:

  ```bash
  openclaw infer image providers --json
  openclaw infer image generate \
    --model google/gemini-3.1-flash-image-preview \
    --prompt "Minimal flat test image: one blue square on a white background, no text." \
    --output ./openclaw-infer-image-smoke.png \
    --json
  ```

  La respuesta JSON reporta `ok`, `provider`, `model`, `attempts` y las rutas de salida escritas.
  Cuando se establece `--output`, la extensión final puede seguir el tipo MIME
  devuelto por el proveedor.

- Para `image describe` y `image describe-many`, use `--prompt` para dar al modelo de visión una instrucción específica de la tarea, como OCR, comparación, inspección de UI o subtítulos concisos.
- Use `--timeout-ms` con modelos de visión locales lentos o inicios en frío de Ollama.
- Para `image describe`, `--model` debe ser un `<provider/model>` con capacidad de imagen.
- Para los modelos de visión locales de Ollama, primero extraiga el modelo y establezca `OLLAMA_API_KEY` en cualquier valor de marcador de posición, por ejemplo `ollama-local`. Consulte [Ollama](/es/providers/ollama#vision-and-image-description).

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

- `tts status` tiene como valor predeterminado gateway porque refleja el estado de TTS gestionado por el gateway.
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

## Embedding

Use `embedding` para la creación de vectores y la inspección de proveedores de incrustaciones (embedding).

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
`path`, `mimeType`, `size`, y cualquier dimensión específica del medio en esa matriz
para la automatización en lugar de analizar el stdout legible por humanos.

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

- `openclaw capability ...` es un alias para `openclaw infer ...`.

## Relacionado

- [Referencia de la CLI](/es/cli)
- [Modelos](/es/concepts/models)
