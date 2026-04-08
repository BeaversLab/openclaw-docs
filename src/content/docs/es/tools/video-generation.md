---
summary: "Genera videos a partir de texto, imágenes o videos existentes utilizando 12 proveedores de backend"
read_when:
  - Generating videos via the agent
  - Configuring video generation providers and models
  - Understanding the video_generate tool parameters
title: "Generación de videos"
---

# Generación de videos

Los agentes de OpenClaw pueden generar videos a partir de mensajes de texto, imágenes de referencia o videos existentes. Se admiten doce proveedores de backend, cada uno con diferentes opciones de modelo, modos de entrada y conjuntos de características. El agente elige automáticamente el proveedor correcto basándose en su configuración y las claves de API disponibles.

<Note>La herramienta `video_generate` solo aparece cuando hay al menos un proveedor de generación de video disponible. Si no la ve en sus herramientas de agente, configure una clave de API de proveedor o configure `agents.defaults.videoGenerationModel`.</Note>

## Inicio rápido

1. Configure una clave de API para cualquier proveedor compatible:

```bash
export GEMINI_API_KEY="your-key"
```

2. Opcionalmente, fije un modelo predeterminado:

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "google/veo-3.1-fast-generate-preview"
```

3. Pídale al agente:

> Genera un video cinematográfico de 5 segundos de una langosta amistosa surfeando al atardecer.

El agente llama a `video_generate` automáticamente. No es necesario permitir la herramienta explícitamente.

## Qué sucede cuando generas un video

La generación de videos es asíncrona. Cuando el agente llama a `video_generate` en una sesión:

1. OpenClaw envía la solicitud al proveedor y devuelve inmediatamente un ID de tarea.
2. El proveedor procesa el trabajo en segundo plano (generalmente de 30 segundos a 5 minutos, dependiendo del proveedor y la resolución).
3. Cuando el video está listo, OpenClaw reanuda la misma sesión con un evento interno de finalización.
4. El agente publica el video terminado nuevamente en la conversación original.

Mientras un trabajo está en curso, las llamadas duplicadas a `video_generate` en la misma sesión devuelven el estado actual de la tarea en lugar de iniciar otra generación. Use `openclaw tasks list` o `openclaw tasks show <taskId>` para verificar el progreso desde la CLI.

Fuera de las ejecuciones de agente respaldadas por sesión (por ejemplo, invocaciones directas de herramientas), la herramienta recurre a la generación en línea y devuelve la ruta final del medio en el mismo turno.

## Proveedores compatibles

| Proveedor | Modelo predeterminado           | Texto | Ref. de imagen     | Ref. de video   | Clave de API                            |
| --------- | ------------------------------- | ----- | ------------------ | --------------- | --------------------------------------- |
| Alibaba   | `wan2.6-t2v`                    | Sí    | Sí (URL remota)    | Sí (URL remota) | `MODELSTUDIO_API_KEY`                   |
| BytePlus  | `seedance-1-0-lite-t2v-250428`  | Sí    | 1 imagen           | No              | `BYTEPLUS_API_KEY`                      |
| ComfyUI   | `workflow`                      | Sí    | 1 imagen           | No              | `COMFY_API_KEY` o `COMFY_CLOUD_API_KEY` |
| fal       | `fal-ai/minimax/video-01-live`  | Sí    | 1 imagen           | No              | `FAL_KEY`                               |
| Google    | `veo-3.1-fast-generate-preview` | Sí    | 1 imagen           | 1 video         | `GEMINI_API_KEY`                        |
| MiniMax   | `MiniMax-Hailuo-2.3`            | Sí    | 1 imagen           | No              | `MINIMAX_API_KEY`                       |
| OpenAI    | `sora-2`                        | Sí    | 1 imagen           | 1 video         | `OPENAI_API_KEY`                        |
| Qwen      | `wan2.6-t2v`                    | Sí    | Sí (URL remota)    | Sí (URL remota) | `QWEN_API_KEY`                          |
| Runway    | `gen4.5`                        | Sí    | 1 imagen           | 1 video         | `RUNWAYML_API_SECRET`                   |
| Together  | `Wan-AI/Wan2.2-T2V-A14B`        | Sí    | 1 imagen           | No              | `TOGETHER_API_KEY`                      |
| Vydra     | `veo3`                          | Sí    | 1 imagen (`kling`) | No              | `VYDRA_API_KEY`                         |
| xAI       | `grok-imagine-video`            | Sí    | 1 imagen           | 1 video         | `XAI_API_KEY`                           |

Algunos proveedores aceptan variables de entorno de claves de API adicionales o alternativas. Consulte las [páginas de proveedores](#related) individuales para obtener más detalles.

Ejecute `video_generate action=list` para inspeccionar los proveedores y modelos disponibles en tiempo de ejecución.

## Parámetros de la herramienta

### Obligatorio

| Parámetro | Tipo   | Descripción                                                                      |
| --------- | ------ | -------------------------------------------------------------------------------- |
| `prompt`  | cadena | Descripción de texto del video a generar (obligatorio para `action: "generate"`) |

### Entradas de contenido

| Parámetro | Tipo     | Descripción                                |
| --------- | -------- | ------------------------------------------ |
| `image`   | cadena   | Imagen de referencia única (ruta o URL)    |
| `images`  | cadena[] | Múltiples imágenes de referencia (hasta 5) |
| `video`   | cadena   | Video de referencia único (ruta o URL)     |
| `videos`  | cadena[] | Múltiples videos de referencia (hasta 4)   |

### Controles de estilo

| Parámetro         | Tipo     | Descripción                                                                            |
| ----------------- | -------- | -------------------------------------------------------------------------------------- |
| `aspectRatio`     | cadena   | `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`                |
| `resolution`      | cadena   | `480P`, `720P` o `1080P`                                                               |
| `durationSeconds` | número   | Duración objetivo en segundos (redondeada al valor admitido más cercano del proveedor) |
| `size`            | cadena   | Sugerencia de tamaño cuando el proveedor lo admite                                     |
| `audio`           | booleano | Activar audio generado cuando sea compatible                                           |
| `watermark`       | booleano | Activar la marca de agua del proveedor cuando sea compatible                           |

### Avanzado

| Parámetro  | Tipo   | Descripción                                             |
| ---------- | ------ | ------------------------------------------------------- |
| `action`   | cadena | `"generate"` (predeterminado), `"status"` o `"list"`    |
| `model`    | cadena | Anulación de proveedor/modelo (p. ej., `runway/gen4.5`) |
| `filename` | cadena | Sugerencia de nombre de archivo de salida               |

No todos los proveedores admiten todos los parámetros. Las anulaciones no admitidas se ignoran sobre una base de mejor esfuerzo y se reportan como advertencias en el resultado de la herramienta. Los límites estrictos de capacidad (como demasiadas entradas de referencia) fallan antes del envío.

## Acciones

- **generate** (predeterminado) -- crea un video a partir del prompt dado y entradas de referencia opcionales.
- **status** -- verifica el estado de la tarea de video en curso para la sesión actual sin iniciar otra generación.
- **list** -- muestra los proveedores disponibles, modelos y sus capacidades.

## Selección de modelo

Al generar un video, OpenClaw resuelve el modelo en este orden:

1. **Parámetro de herramienta `model`** -- si el agente especifica uno en la llamada.
2. **`videoGenerationModel.primary`** -- desde la configuración.
3. **`videoGenerationModel.fallbacks`** -- probados en orden.
4. **Detección automática** -- utiliza proveedores que tengan autenticación válida, comenzando con el proveedor predeterminado actual y luego los proveedores restantes en orden alfabético.

Si un proveedor falla, se prueba automáticamente el siguiente candidato. Si todos los candidatos fallan, el error incluye detalles de cada intento.

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "google/veo-3.1-fast-generate-preview",
        fallbacks: ["runway/gen4.5", "qwen/wan2.6-t2v"],
      },
    },
  },
}
```

## Notas del proveedor

| Proveedor | Notas                                                                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alibaba   | Utiliza el endpoint asíncrono de DashScope/Model Studio. Las imágenes y videos de referencia deben ser URLs `http(s)` remotas.                                                                    |
| BytePlus  | Solo referencia de imagen única.                                                                                                                                                                  |
| ComfyUI   | Ejecución local o en la nube impulsada por flujos de trabajo. Admite texto a video e imagen a video a través del gráfico configurado.                                                             |
| fal       | Utiliza un flujo con respaldo en cola para trabajos de larga duración. Solo referencia de imagen única.                                                                                           |
| Google    | Utiliza Gemini/Veo. Admite una imagen o un video de referencia.                                                                                                                                   |
| MiniMax   | Solo referencia de imagen única.                                                                                                                                                                  |
| OpenAI    | Solo se reenvía la anulación `size`. Otras anulaciones de estilo (`aspectRatio`, `resolution`, `audio`, `watermark`) se ignoran con una advertencia.                                              |
| Qwen      | El mismo backend DashScope que Alibaba. Las entradas de referencia deben ser URLs `http(s)` remotas; los archivos locales se rechazan de inmediato.                                               |
| Runway    | Admite archivos locales a través de URI de datos. Video a video requiere `runway/gen4_aleph`. Las ejecuciones de solo texto exponen relaciones de aspecto `16:9` y `9:16`.                        |
| Together  | Solo referencia de imagen única.                                                                                                                                                                  |
| Vydra     | Utiliza `https://www.vydra.ai/api/v1` directamente para evitar redirecciones que eliminen la autenticación. `veo3` se incluye solo como texto a video; `kling` requiere una URL de imagen remota. |
| xAI       | Admite flujos de texto a video, imagen a video, y edición/extensión de video remota.                                                                                                              |

## Configuración

Establezca el modelo de generación de video predeterminado en su configuración de OpenClaw:

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "qwen/wan2.6-t2v",
        fallbacks: ["qwen/wan2.6-r2v-flash"],
      },
    },
  },
}
```

O a través de la CLI:

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "qwen/wan2.6-t2v"
```

## Relacionado

- [Resumen de herramientas](/en/tools)
- [Tareas en segundo plano](/en/automation/tasks) -- seguimiento de tareas para la generación de video asíncrona
- [Alibaba Model Studio](/en/providers/alibaba)
- [BytePlus](/en/providers/byteplus)
- [ComfyUI](/en/providers/comfy)
- [fal](/en/providers/fal)
- [Google (Gemini)](/en/providers/google)
- [MiniMax](/en/providers/minimax)
- [OpenAI](/en/providers/openai)
- [Qwen](/en/providers/qwen)
- [Runway](/en/providers/runway)
- [Together AI](/en/providers/together)
- [Vydra](/en/providers/vydra)
- [xAI](/en/providers/xai)
- [Referencia de configuración](/en/gateway/configuration-reference#agent-defaults)
- [Modelos](/en/concepts/models)
