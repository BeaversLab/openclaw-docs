---
summary: "CLI de inferencia en primer lugar para flujos de trabajo de modelo, imagen, audio, TTS, video, web y embedding respaldados por proveedores"
read_when:
  - Adding or modifying `openclaw infer` commands
  - Designing stable headless capability automation
title: "CLI de inferencia"
---

# CLI de inferencia

`openclaw infer` es la superficie canónica sin cabeza para flujos de trabajo de inferencia respaldados por proveedores.

Intencionalmente expone familias de capacidades, no nombres de RPC de puerta de enlace sin procesar ni ids de herramientas de agentes sin procesar.

## Convertir infer en una habilidad

Copie y pegue esto en un agente:

```text
Read https://docs.openclaw.ai/cli/infer, then create a skill that routes my common workflows to `openclaw infer`.
Focus on model runs, image generation, video generation, audio transcription, TTS, web search, and embeddings.
```

Una buena habilidad basada en infer debería:

- mapear las intenciones comunes del usuario con el subcomando infer correcto
- incluir algunos ejemplos canónicos de infer para los flujos de trabajo que cubre
- preferir `openclaw infer ...` en ejemplos y sugerencias
- evitar volver a documentar toda la superficie de infer dentro del cuerpo de la habilidad

Cobertura típica de la habilidad centrada en infer:

- `openclaw infer model run`
- `openclaw infer image generate`
- `openclaw infer audio transcribe`
- `openclaw infer tts convert`
- `openclaw infer web search`
- `openclaw infer embedding create`

## Por qué usar infer

`openclaw infer` proporciona una CLI consistente para tareas de inferencia respaldadas por proveedores dentro de OpenClaw.

Beneficios:

- Use los proveedores y modelos ya configurados en OpenClaw en lugar de conectar envoltorios únicos para cada backend.
- Mantenga los flujos de trabajo de modelo, imagen, transcripción de audio, TTS, video, web y embedding bajo un solo árbol de comandos.
- Use una forma de salida `--json` estable para scripts, automatización y flujos de trabajo impulsados por agentes.
- Prefiera una superficie de primera parte de OpenClaw cuando la tarea sea fundamentalmente "ejecutar inferencia".
- Use la ruta local normal sin requerir la puerta de enlace para la mayoría de los comandos infer.

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

| Tarea                              | Comando                                                                | Notas                                                         |
| ---------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| Ejecutar un prompt de texto/modelo | `openclaw infer model run --prompt "..." --json`                       | Usa la ruta local normal de forma predeterminada              |
| Generar una imagen                 | `openclaw infer image generate --prompt "..." --json`                  | Use `image edit` cuando comenzando desde un archivo existente |
| Describir un archivo de imagen     | `openclaw infer image describe --file ./image.png --json`              | `--model` debe ser `<provider/model>`                         |
| Transcribir audio                  | `openclaw infer audio transcribe --file ./memo.m4a --json`             | `--model` debe ser `<provider/model>`                         |
| Sintetizar voz                     | `openclaw infer tts convert --text "..." --output ./speech.mp3 --json` | `tts status` está orientado a la puerta de enlace             |
| Generar un video                   | `openclaw infer video generate --prompt "..." --json`                  |                                                               |
| Describir un archivo de video      | `openclaw infer video describe --file ./clip.mp4 --json`               | `--model` debe ser `<provider/model>`                         |
| Buscar en la web                   | `openclaw infer web search --query "..." --json`                       |                                                               |
| Obtener una página web             | `openclaw infer web fetch --url https://example.com --json`            |                                                               |
| Crear incrustaciones               | `openclaw infer embedding create --text "..." --json`                  |                                                               |

## Comportamiento

- `openclaw infer ...` es la interfaz de CLI principal para estos flujos de trabajo.
- Use `--json` cuando la salida sea consumida por otro comando o script.
- Use `--provider` o `--model provider/model` cuando se requiera un backend específico.
- Para `image describe`, `audio transcribe` y `video describe`, `--model` debe usar la forma `<provider/model>`.
- Los comandos de ejecución sin estado predeterminan a local.
- Los comandos de estado administrados por la puerta de enlace predeterminan a la puerta de enlace.
- La ruta local normal no requiere que la puerta de enlace se esté ejecutando.

## Modelo

Use `model` para inferencia de texto respaldada por el proveedor e inspección de modelo/proveedor.

```bash
openclaw infer model run --prompt "Reply with exactly: smoke-ok" --json
openclaw infer model run --prompt "Summarize this changelog entry" --provider openai --json
openclaw infer model providers --json
openclaw infer model inspect --name gpt-5.4 --json
```

Notas:

- `model run` reutiliza el tiempo de ejecución del agente, por lo que las anulaciones de proveedor/modelo se comportan como la ejecución normal del agente.
- `model auth login`, `model auth logout` y `model auth status` administran el estado de autenticación del proveedor guardado.

## Imagen

Use `image` para generación, edición y descripción.

```bash
openclaw infer image generate --prompt "friendly lobster illustration" --json
openclaw infer image generate --prompt "cinematic product photo of headphones" --json
openclaw infer image describe --file ./photo.jpg --json
openclaw infer image describe --file ./ui-screenshot.png --model openai/gpt-4.1-mini --json
```

Notas:

- Use `image edit` cuando comience desde archivos de entrada existentes.
- Para `image describe`, `--model` debe ser `<provider/model>`.

## Audio

Use `audio` para la transcripción de archivos.

```bash
openclaw infer audio transcribe --file ./memo.m4a --json
openclaw infer audio transcribe --file ./team-sync.m4a --language en --prompt "Focus on names and action items" --json
openclaw infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

Notas:

- `audio transcribe` es para la transcripción de archivos, no para la administración de sesiones en tiempo real.
- `--model` debe ser `<provider/model>`.

## TTS

Use `tts` para la síntesis de voz y el estado del proveedor TTS.

```bash
openclaw infer tts convert --text "hello from openclaw" --output ./hello.mp3 --json
openclaw infer tts convert --text "Your build is complete" --output ./build-complete.mp3 --json
openclaw infer tts providers --json
openclaw infer tts status --json
```

Notas:

- `tts status` tiene como valor predeterminado gateway porque refleja el estado de TTS gestionado por el gateway.
- Use `tts providers`, `tts voices` y `tts set-provider` para inspeccionar y configurar el comportamiento de TTS.

## Vídeo

Use `video` para la generación y la descripción.

```bash
openclaw infer video generate --prompt "cinematic sunset over the ocean" --json
openclaw infer video generate --prompt "slow drone shot over a forest lake" --json
openclaw infer video describe --file ./clip.mp4 --json
openclaw infer video describe --file ./clip.mp4 --model openai/gpt-4.1-mini --json
```

Notas:

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
  "model": "gpt-image-1",
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
