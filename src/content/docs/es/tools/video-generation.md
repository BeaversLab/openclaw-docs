---
summary: "Generar videos a partir de texto, imágenes o videos existentes utilizando 12 proveedores de backend"
read_when:
  - Generating videos via the agent
  - Configuring video generation providers and models
  - Understanding the video_generate tool parameters
title: "Generación de video"
---

# Generación de videos

Los agentes de OpenClaw pueden generar videos a partir de mensajes de texto, imágenes de referencia o videos existentes. Se admiten doce proveedores de backend, cada uno con diferentes opciones de modelo, modos de entrada y conjuntos de características. El agente elige automáticamente el proveedor correcto basándose en su configuración y las claves de API disponibles.

<Note>The `video_generate` tool only appears when at least one video-generation provider is available. If you do not see it in your agent tools, set a provider API key or configure `agents.defaults.videoGenerationModel`.</Note>

OpenClaw trata la generación de video como tres modos de tiempo de ejecución:

- `generate` para solicitudes de texto a video sin medio de referencia
- `imageToVideo` cuando la solicitud incluye una o más imágenes de referencia
- `videoToVideo` cuando la solicitud incluye uno o más videos de referencia

Los proveedores pueden soportar cualquier subconjunto de esos modos. La herramienta valida el modo activo
antes del envío e informa los modos compatibles en `action=list`.

## Inicio rápido

1. Configure una clave API para cualquier proveedor compatible:

```bash
export GEMINI_API_KEY="your-key"
```

2. Opcionalmente, fije un modelo predeterminado:

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "google/veo-3.1-fast-generate-preview"
```

3. Pregúntele al agente:

> Genera un video cinematográfico de 5 segundos de una langosta amigable surfeando al atardecer.

El agente llama a `video_generate` automáticamente. No es necesario permitir explícitamente la herramienta (allowlisting).

## Qué sucede cuando generas un video

La generación de video es asincrónica. Cuando el agente llama a `video_generate` en una sesión:

1. OpenClaw envía la solicitud al proveedor y devuelve inmediatamente un ID de tarea.
2. El proveedor procesa el trabajo en segundo plano (generalmente de 30 segundos a 5 minutos, dependiendo del proveedor y la resolución).
3. Cuando el video está listo, OpenClaw reanuda la misma sesión con un evento interno de finalización.
4. El agente publica el video terminado nuevamente en la conversación original.

Mientras un trabajo está en curso, las llamadas duplicadas a `video_generate` en la misma sesión devuelven el estado actual de la tarea en lugar de iniciar otra generación. Use `openclaw tasks list` o `openclaw tasks show <taskId>` para verificar el progreso desde la CLI.

Fuera de las ejecuciones de agentes con sesión (por ejemplo, invocaciones directas de herramientas), la herramienta recurre a la generación en línea y devuelve la ruta de los medios finales en el mismo turno.

### Ciclo de vida de la tarea

Cada solicitud `video_generate` pasa por cuatro estados:

1. **en cola** -- tarea creada, esperando a que el proveedor la acepte.
2. **en ejecución** -- el proveedor está procesando (generalmente de 30 segundos a 5 minutos dependiendo del proveedor y la resolución).
3. **finalizada con éxito** -- video listo; el agente se despierta y lo publica en la conversación.
4. **fallida** -- error o tiempo de espera del proveedor; el agente se despierta con los detalles del error.

Verificar el estado desde la CLI:

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

Prevención de duplicados: si una tarea de video ya está `queued` o `running` para la sesión actual, `video_generate` devuelve el estado de la tarea existente en lugar de iniciar una nueva. Use `action: "status"` para verificar explícitamente sin activar una nueva generación.

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

Algunos proveedores aceptan variables de entorno de clave de API adicionales o alternas. Consulte las [páginas del proveedor](#related) individuales para obtener más detalles.

Ejecute `video_generate action=list` para inspeccionar los proveedores, modelos y
modos de tiempo de ejecución disponibles en tiempo de ejecución.

### Matriz de capacidades declaradas

Este es el contrato de modo explícito utilizado por `video_generate`, pruebas de contrato,
y el barrido compartido en vivo.

| Proveedor | `generate` | `imageToVideo` | `videoToVideo` | Carriles compartidos en vivo hoy                                                                                                                                           |
| --------- | ---------- | -------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alibaba   | Sí         | Sí             | Sí             | `generate`, `imageToVideo`; `videoToVideo` se omite porque este proveedor necesita URL de video `http(s)` remotas                                                          |
| BytePlus  | Sí         | Sí             | No             | `generate`, `imageToVideo`                                                                                                                                                 |
| ComfyUI   | Sí         | Sí             | No             | No está en el barrido compartido; la cobertura específica del flujo de trabajo reside con las pruebas de Comfy                                                             |
| fal       | Sí         | Sí             | No             | `generate`, `imageToVideo`                                                                                                                                                 |
| Google    | Sí         | Sí             | Sí             | `generate`, `imageToVideo`; `videoToVideo` compartido se omite porque el barrido Gemini/Veo respaldado por búfer actual no acepta esa entrada                              |
| MiniMax   | Sí         | Sí             | No             | `generate`, `imageToVideo`                                                                                                                                                 |
| OpenAI    | Sí         | Sí             | Sí             | `generate`, `imageToVideo`; `videoToVideo` compartido se omite porque esta ruta de org/entrada actualmente necesita acceso de restauración/remezcla del lado del proveedor |
| Qwen      | Sí         | Sí             | Sí             | `generate`, `imageToVideo`; `videoToVideo` se omite porque este proveedor necesita URL de video `http(s)` remotas                                                          |
| Runway    | Sí         | Sí             | Sí             | `generate`, `imageToVideo`; `videoToVideo` solo se ejecuta cuando el modelo seleccionado es `runway/gen4_aleph`                                                            |
| Together  | Sí         | Sí             | No             | `generate`, `imageToVideo`                                                                                                                                                 |
| Vydra     | Sí         | Sí             | No             | `generate`; `imageToVideo` compartidos omitidos porque el `veo3` incluido es solo de texto y el `kling` incluido requiere una URL de imagen remota                         |
| xAI       | Sí         | Sí             | Sí             | `generate`, `imageToVideo`; `videoToVideo` omitido porque este proveedor actualmente necesita una URL MP4 remota                                                           |

## Parámetros de la herramienta

### Obligatorio

| Parámetro | Tipo   | Descripción                                                                    |
| --------- | ------ | ------------------------------------------------------------------------------ |
| `prompt`  | string | Descripción de texto del video a generar (requerido para `action: "generate"`) |

### Entradas de contenido

| Parámetro | Tipo     | Descripción                                |
| --------- | -------- | ------------------------------------------ |
| `image`   | string   | Imagen de referencia única (ruta o URL)    |
| `images`  | string[] | Múltiples imágenes de referencia (hasta 5) |
| `video`   | string   | Video de referencia único (ruta o URL)     |
| `videos`  | string[] | Múltiples videos de referencia (hasta 4)   |

### Controles de estilo

| Parámetro         | Tipo    | Descripción                                                                            |
| ----------------- | ------- | -------------------------------------------------------------------------------------- |
| `aspectRatio`     | string  | `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`                |
| `resolution`      | string  | `480P`, `720P`, `768P` o `1080P`                                                       |
| `durationSeconds` | number  | Duración objetivo en segundos (redondeada al valor admitido más cercano del proveedor) |
| `size`            | string  | Sugerencia de tamaño cuando el proveedor lo admite                                     |
| `audio`           | boolean | Activar el audio generado cuando sea compatible                                        |
| `watermark`       | boolean | Alternar la marca de agua del proveedor cuando sea compatible                          |

### Avanzado

| Parámetro  | Tipo   | Descripción                                               |
| ---------- | ------ | --------------------------------------------------------- |
| `action`   | string | `"generate"` (predeterminado), `"status"` o `"list"`      |
| `model`    | string | Invalidación de proveedor/modelo (p. ej. `runway/gen4.5`) |
| `filename` | string | Sugerencia de nombre de archivo de salida                 |

No todos los proveedores admiten todos los parámetros. OpenClaw ya normaliza la duración al valor más cercano admitido por el proveedor, y también reasigna las sugerencias de geometría traducidas, como de tamaño a relación de aspecto, cuando un proveedor de reserva expone una superficie de control diferente. Las anulaciones realmente no admitidas se ignoran sobre una base de máximo esfuerzo y se informan como advertencias en el resultado de la herramienta. Los límites estrictos de capacidad (como demasiadas entradas de referencia) fallan antes del envío.

Los resultados de la herramienta informan sobre la configuración aplicada. Cuando OpenClaw reasigna la duración o la geometría durante la reserva del proveedor, los valores devueltos `durationSeconds`, `size`, `aspectRatio` y `resolution` reflejan lo que se envió, y `details.normalization` captura la traducción de solicitado a aplicado.

Las entradas de referencia también seleccionan el modo de tiempo de ejecución:

- Sin medio de referencia: `generate`
- Cualquier referencia de imagen: `imageToVideo`
- Cualquier referencia de video: `videoToVideo`

Las referencias mixtas de imagen y video no constituyen una superficie de capacidad compartida estable.
Prefiera un tipo de referencia por solicitud.

## Acciones

- **generate** (predeterminado) -- crea un video a partir del mensaje dado y entradas de referencia opcionales.
- **status** -- verifica el estado de la tarea de video en curso para la sesión actual sin iniciar otra generación.
- **list** -- muestra los proveedores disponibles, los modelos y sus capacidades.

## Selección de modelo

Al generar un video, OpenClaw resuelve el modelo en este orden:

1. **Parámetro de la herramienta `model`** -- si el agente especifica uno en la llamada.
2. **`videoGenerationModel.primary`** -- desde la configuración.
3. **`videoGenerationModel.fallbacks`** -- probados en orden.
4. **Detección automática** -- utiliza proveedores que tienen una autenticación válida, comenzando con el proveedor predeterminado actual y luego los proveedores restantes en orden alfabético.

Si un proveedor falla, se intenta automáticamente el siguiente candidato. Si fallan todos los candidatos, el error incluye los detalles de cada intento.

Establezca `agents.defaults.mediaGenerationAutoProviderFallback: false` si desea
que la generación de video use solo las entradas explícitas `model`, `primary` y `fallbacks`.

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

Se puede fijar el video-agente de HeyGen en fal con:

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "fal/fal-ai/heygen/v2/video-agent",
      },
    },
  },
}
```

Se puede fijar Seedance 2.0 en fal con:

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "fal/bytedance/seedance-2.0/fast/text-to-video",
      },
    },
  },
}
```

## Notas del proveedor

| Proveedor | Notas                                                                                                                                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alibaba   | Usa el endpoint asíncrono de DashScope/Model Studio. Las imágenes y videos de referencia deben ser URLs `http(s)` remotas.                                                                                       |
| BytePlus  | Solo referencia de imagen única.                                                                                                                                                                                 |
| ComfyUI   | Ejecución local o en la nube impulsada por flujos de trabajo. Admite texto a video e imagen a video a través del gráfico configurado.                                                                            |
| fal       | Usa un flujo respaldado por cola para trabajos de larga duración. Solo referencia de imagen única. Incluye el video-agente HeyGen y las referencias de modelo de texto a video e imagen a video de Seedance 2.0. |
| Google    | Usa Gemini/Veo. Admite una imagen o un video de referencia.                                                                                                                                                      |
| MiniMax   | Solo referencia de imagen única.                                                                                                                                                                                 |
| OpenAI    | Solo se reenvía la anulación `size`. Otras anulaciones de estilo (`aspectRatio`, `resolution`, `audio`, `watermark`) se ignoran con una advertencia.                                                             |
| Qwen      | Mismo backend DashScope que Alibaba. Las entradas de referencia deben ser URLs `http(s)` remotas; los archivos locales se rechazan de inmediato.                                                                 |
| Runway    | Admite archivos locales a través de URI de datos. Video a video requiere `runway/gen4_aleph`. Las ejecuciones de solo texto exponen las relaciones de aspecto `16:9` y `9:16`.                                   |
| Together  | Solo referencia de imagen única.                                                                                                                                                                                 |
| Vydra     | Usa `https://www.vydra.ai/api/v1` directamente para evitar redireccionamientos que pierdan la autenticación. `veo3` se empaqueta solo como texto a video; `kling` requiere una URL de imagen remota.             |
| xAI       | Admite flujos de texto a video, imagen a video y edición/extensión de video remoto.                                                                                                                              |

## Modos de capacidad del proveedor

El contrato compartido de generación de video ahora permite a los proveedores declarar capacidades específicas del modo en lugar de solo límites agregados planos. Las nuevas implementaciones de proveedores deben preferir bloques de modo explícitos:

```typescript
capabilities: {
  generate: {
    maxVideos: 1,
    maxDurationSeconds: 10,
    supportsResolution: true,
  },
  imageToVideo: {
    enabled: true,
    maxVideos: 1,
    maxInputImages: 1,
    maxDurationSeconds: 5,
  },
  videoToVideo: {
    enabled: true,
    maxVideos: 1,
    maxInputVideos: 1,
    maxDurationSeconds: 5,
  },
}
```

Los campos agregados planos como `maxInputImages` y `maxInputVideos` no son suficientes para anunciar el soporte del modo de transformación. Los proveedores deben declarar `generate`, `imageToVideo` y `videoToVideo` explícitamente para que las pruebas en vivo, las pruebas de contrato y la herramienta compartida `video_generate` puedan validar el soporte del modo de manera determinista.

## Pruebas en vivo

Cobertura en vivo opcional para los proveedores agrupados compartidos:

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts
```

Envoltorio del repositorio:

```bash
pnpm test:live:media video
```

Este archivo en vivo carga las variables de entorno del proveedor faltantes desde `~/.profile`, prefiere las claves API de live/env por encima de los perfiles de autenticación almacenados de forma predeterminada y ejecuta los modos declarados que puede ejercer de manera segura con medios locales:

- `generate` para cada proveedor en el barrido
- `imageToVideo` cuando `capabilities.imageToVideo.enabled`
- `videoToVideo` cuando `capabilities.videoToVideo.enabled` y el proveedor/modelo
  acepta entrada de video local respaldada por búfer en el barrido compartido

Hoy, el carril en vivo compartido `videoToVideo` cubre:

- `runway` solo cuando seleccionas `runway/gen4_aleph`

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
- [BytePlus](/en/concepts/model-providers#byteplus-international)
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
