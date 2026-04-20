---
summary: "Genera videos a partir de texto, imágenes o videos existentes utilizando 14 proveedores de backend"
read_when:
  - Generating videos via the agent
  - Configuring video generation providers and models
  - Understanding the video_generate tool parameters
title: "Generación de videos"
---

# Generación de videos

Los agentes de OpenClaw pueden generar videos a partir de mensajes de texto, imágenes de referencia o videos existentes. Se admiten catorce proveedores de backend, cada uno con diferentes opciones de modelo, modos de entrada y conjuntos de características. El agente selecciona automáticamente el proveedor correcto según su configuración y las claves de API disponibles.

<Note>La herramienta `video_generate` solo aparece cuando hay al menos un proveedor de generación de videos disponible. Si no la ve en sus herramientas de agente, configure una clave de API de proveedor o configure `agents.defaults.videoGenerationModel`.</Note>

OpenClaw trata la generación de video como tres modos de tiempo de ejecución:

- `generate` para solicitudes de texto a video sin medios de referencia
- `imageToVideo` cuando la solicitud incluye una o más imágenes de referencia
- `videoToVideo` cuando la solicitud incluye uno o más videos de referencia

Los proveedores pueden admitir cualquier subconjunto de esos modos. La herramienta valida el modo activo antes del envío e informa los modos admitidos en `action=list`.

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

El agente llama a `video_generate` automáticamente. No es necesario incluir la herramienta en una lista blanca.

## Qué sucede cuando generas un video

La generación de videos es asíncrona. Cuando el agente llama a `video_generate` en una sesión:

1. OpenClaw envía la solicitud al proveedor y devuelve inmediatamente un ID de tarea.
2. El proveedor procesa el trabajo en segundo plano (generalmente de 30 segundos a 5 minutos, dependiendo del proveedor y la resolución).
3. Cuando el video está listo, OpenClaw reanuda la misma sesión con un evento interno de finalización.
4. El agente publica el video terminado nuevamente en la conversación original.

Mientras un trabajo está en curso, las llamadas duplicadas a `video_generate` en la misma sesión devuelven el estado de la tarea actual en lugar de iniciar otra generación. Use `openclaw tasks list` o `openclaw tasks show <taskId>` para verificar el progreso desde la CLI.

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

| Proveedor             | Modelo predeterminado           | Texto | Ref. de imagen                                                 | Ref. de video   | Clave de API                            |
| --------------------- | ------------------------------- | ----- | -------------------------------------------------------------- | --------------- | --------------------------------------- |
| Alibaba               | `wan2.6-t2v`                    | Sí    | Sí (URL remota)                                                | Sí (URL remota) | `MODELSTUDIO_API_KEY`                   |
| BytePlus (1.0)        | `seedance-1-0-pro-250528`       | Sí    | Hasta 2 imágenes (solo modelos I2V; primer + último cuadro)    | No              | `BYTEPLUS_API_KEY`                      |
| BytePlus Seedance 1.5 | `seedance-1-5-pro-251215`       | Sí    | Hasta 2 imágenes (primera + último fotograma a través del rol) | No              | `BYTEPLUS_API_KEY`                      |
| BytePlus Seedance 2.0 | `dreamina-seedance-2-0-260128`  | Sí    | Hasta 9 imágenes de referencia                                 | Hasta 3 videos  | `BYTEPLUS_API_KEY`                      |
| ComfyUI               | `workflow`                      | Sí    | 1 imagen                                                       | No              | `COMFY_API_KEY` o `COMFY_CLOUD_API_KEY` |
| fal                   | `fal-ai/minimax/video-01-live`  | Sí    | 1 imagen                                                       | No              | `FAL_KEY`                               |
| Google                | `veo-3.1-fast-generate-preview` | Sí    | 1 imagen                                                       | 1 video         | `GEMINI_API_KEY`                        |
| MiniMax               | `MiniMax-Hailuo-2.3`            | Sí    | 1 imagen                                                       | No              | `MINIMAX_API_KEY`                       |
| OpenAI                | `sora-2`                        | Sí    | 1 imagen                                                       | 1 video         | `OPENAI_API_KEY`                        |
| Qwen                  | `wan2.6-t2v`                    | Sí    | Sí (URL remota)                                                | Sí (URL remota) | `QWEN_API_KEY`                          |
| Runway                | `gen4.5`                        | Sí    | 1 imagen                                                       | 1 video         | `RUNWAYML_API_SECRET`                   |
| Together              | `Wan-AI/Wan2.2-T2V-A14B`        | Sí    | 1 imagen                                                       | No              | `TOGETHER_API_KEY`                      |
| Vydra                 | `veo3`                          | Sí    | 1 imagen (`kling`)                                             | No              | `VYDRA_API_KEY`                         |
| xAI                   | `grok-imagine-video`            | Sí    | 1 imagen                                                       | 1 video         | `XAI_API_KEY`                           |

Algunos proveedores aceptan variables de entorno de clave de API adicionales o alternativas. Consulte las [páginas del proveedor](#related) individuales para obtener más detalles.

Ejecute `video_generate action=list` para inspeccionar los proveedores disponibles, modelos y
modos de tiempo de ejecución.

### Matriz de capacidades declaradas

Este es el contrato de modo explícito utilizado por `video_generate`, pruebas de contrato,
y el barrido compartido en vivo.

| Proveedor | `generate` | `imageToVideo` | `videoToVideo` | Carriles compartidos en vivo hoy                                                                                                                                       |
| --------- | ---------- | -------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alibaba   | Sí         | Sí             | Sí             | `generate`, `imageToVideo`; `videoToVideo` omitido porque este proveedor necesita `http(s)` URL de video remotas                                                       |
| BytePlus  | Sí         | Sí             | No             | `generate`, `imageToVideo`                                                                                                                                             |
| ComfyUI   | Sí         | Sí             | No             | No está en el barrido compartido; la cobertura específica del flujo de trabajo reside con las pruebas de Comfy                                                         |
| fal       | Sí         | Sí             | No             | `generate`, `imageToVideo`                                                                                                                                             |
| Google    | Sí         | Sí             | Sí             | `generate`, `imageToVideo`; `videoToVideo` compartida omitida porque el barrido actual de Gemini/Veo respaldado por búfer no acepta esa entrada                        |
| MiniMax   | Sí         | Sí             | No             | `generate`, `imageToVideo`                                                                                                                                             |
| OpenAI    | Sí         | Sí             | Sí             | `generate`, `imageToVideo`; `videoToVideo` compartida omitida porque esta ruta de org/entrada actualmente necesita acceso de repintado/remezcla del lado del proveedor |
| Qwen      | Sí         | Sí             | Sí             | `generate`, `imageToVideo`; `videoToVideo` omitida porque este proveedor necesita URL de video `http(s)` remotas                                                       |
| Runway    | Sí         | Sí             | Sí             | `generate`, `imageToVideo`; `videoToVideo` se ejecuta solo cuando el modelo seleccionado es `runway/gen4_aleph`                                                        |
| Together  | Sí         | Sí             | No             | `generate`, `imageToVideo`                                                                                                                                             |
| Vydra     | Sí         | Sí             | No             | `generate`; `imageToVideo` compartida omitida porque `veo3` incluido es solo de texto y `kling` incluido requiere una URL de imagen remota                             |
| xAI       | Sí         | Sí             | Sí             | `generate`, `imageToVideo`; `videoToVideo` omitida porque este proveedor actualmente necesita una URL MP4 remota                                                       |

## Parámetros de herramienta

### Obligatorio

| Parámetro | Tipo   | Descripción                                                                      |
| --------- | ------ | -------------------------------------------------------------------------------- |
| `prompt`  | string | Descripción de texto del video a generar (obligatorio para `action: "generate"`) |

### Entradas de contenido

| Parámetro    | Tipo     | Descripción                                                                                                                                              |
| ------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `image`      | string   | Imagen de referencia única (ruta o URL)                                                                                                                  |
| `images`     | string[] | Múltiples imágenes de referencia (hasta 9)                                                                                                               |
| `imageRoles` | string[] | Sugerencias de rol por posición opcionales paralelas a la lista de imágenes combinada. Valores canónicos: `first_frame`, `last_frame`, `reference_image` |
| `video`      | string   | Video de referencia único (ruta o URL)                                                                                                                   |
| `videos`     | string[] | Múltiples videos de referencia (hasta 4)                                                                                                                 |
| `videoRoles` | string[] | Sugerencias de rol opcionales por posición paralelas a la lista de videos combinados. Valor canónico: `reference_video`                                  |
| `audioRef`   | string   | Audio de referencia único (ruta o URL). Se utiliza, por ejemplo, como música de fondo o referencia de voz cuando el proveedor admite entradas de audio   |
| `audioRefs`  | string[] | Múltiples audios de referencia (hasta 3)                                                                                                                 |
| `audioRoles` | string[] | Sugerencias de rol opcionales por posición paralelas a la lista de audio combinada. Valor canónico: `reference_audio`                                    |

Las sugerencias de rol se reenvían al proveedor tal cual. Los valores canónicos provienen de
la unión `VideoGenerationAssetRole` pero los proveedores pueden aceptar cadenas
de rol adicionales. Las matrices `*Roles` no deben tener más entradas que la
lista de referencia correspondiente; los errores de uno por uno fallan con un error claro.
Use una cadena vacía para dejar un espacio sin asignar.

### Controles de estilo

| Parámetro         | Tipo    | Descripción                                                                                 |
| ----------------- | ------- | ------------------------------------------------------------------------------------------- |
| `aspectRatio`     | string  | `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`, o `adaptive`       |
| `resolution`      | string  | `480P`, `720P`, `768P`, o `1080P`                                                           |
| `durationSeconds` | number  | Duración objetivo en segundos (redondeada al valor admitido más cercano del proveedor)      |
| `size`            | string  | Sugerencia de tamaño cuando el proveedor lo admite                                          |
| `audio`           | boolean | Activar el audio generado en la salida cuando se admita. Distinto de `audioRef*` (entradas) |
| `watermark`       | boolean | Alternar la marca de agua del proveedor cuando se admita                                    |

`adaptive` es un indicador específico del proveedor: se reenvía tal cual a
los proveedores que declaran `adaptive` en sus capacidades (por ejemplo, BytePlus
Seedance lo usa para detectar automáticamente la proporción a partir de las dimensiones de
la imagen de entrada). Los proveedores que no lo declaran exponen el valor a través de
`details.ignoredOverrides` en el resultado de la herramienta para que la omisión sea visible.

### Avanzado

| Parámetro         | Tipo   | Descripción                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action`          | string | `"generate"` (predeterminado), `"status"` o `"list"`                                                                                                                                                                                                                                                                                                                                                                               |
| `model`           | string | Invalidación de proveedor/modelo (p. ej., `runway/gen4.5`)                                                                                                                                                                                                                                                                                                                                                                         |
| `filename`        | string | Sugerencia de nombre de archivo de salida                                                                                                                                                                                                                                                                                                                                                                                          |
| `providerOptions` | object | Opciones específicas del proveedor como un objeto JSON (p. ej., `{"seed": 42, "draft": true}`). Los proveedores que declaran un esquema con tipo validan las claves y los tipos; las claves desconocidas o las discordancias omiten el candidato durante la conmutación por error. Los proveedores sin un esquema declarado reciben las opciones tal cual. Ejecute `video_generate action=list` para ver qué acepta cada proveedor |

No todos los proveedores admiten todos los parámetros. OpenClaw ya normaliza la duración al valor más cercano admitido por el proveedor y también reasigna las sugerencias de geometría traducidas, como de tamaño a relación de aspecto, cuando un proveedor de conmutación por error expone una superficie de control diferente. Las invalidaciones realmente no admitidas se ignoran en la medida de lo posible y se informan como advertencias en el resultado de la herramienta. Los límites estrictos de capacidad (como demasiadas entradas de referencia) fallan antes del envío.

Los resultados de la herramienta informan de la configuración aplicada. Cuando OpenClaw reasigna la duración o la geometría durante la conmutación por error del proveedor, los valores devueltos `durationSeconds`, `size`, `aspectRatio` y `resolution` reflejan lo que se envió, y `details.normalization` captura la traducción de solicitado a aplicado.

Las entradas de referencia también seleccionan el modo de ejecución:

- Sin medios de referencia: `generate`
- Cualquier referencia de imagen: `imageToVideo`
- Cualquier referencia de video: `videoToVideo`
- Las entradas de audio de referencia no cambian el modo resuelto; se aplican sobre cualquier modo que seleccionen las referencias de imagen/video y solo funcionan con proveedores que declaran `maxInputAudios`

Las referencias mixtas de imagen y video no son una superficie de capacidad compartida estable.
Prefiera un tipo de referencia por solicitud.

#### Opciones de reserva y con tipos

Algunas verificaciones de capacidad se aplican en la capa de reserva en lugar de en el
límite de la herramienta para que una solicitud que exceda los límites del proveedor principal
aún pueda ejecutarse en una reserva capaz:

- Si el candidato activo no declara `maxInputAudios` (o lo declara como
  `0`), se omite cuando la solicitud contiene referencias de audio y se
  prueba el siguiente candidato.
- Si el `maxDurationSeconds` del candidato activo está por debajo del `durationSeconds` solicitado
  y el candidato no declara una lista `supportedDurationSeconds`, se omite.
- Si la solicitud contiene `providerOptions` y el candidato activo declara explícitamente un esquema `providerOptions` con tipo, se omite el candidato cuando las claves suministradas no están en el esquema o los tipos de valor no coinciden. Los proveedores que aún no han declarado un esquema reciben las opciones tal cual (pasaje compatible con versiones anteriores). Un proveedor puede optar explícitamente por no participar en todas las opciones de proveedor declarando un esquema vacío (`capabilities.providerOptions: {}`), lo que causa la misma omisión que una discrepancia de tipo.

El primer motivo de omisión en una solicitud se registra en `warn` para que los operadores vean
cuando se pasó por alto su proveedor principal; las omisiones posteriores se registran en
`debug` para mantener las cadenas de reserva largas en silencio. Si se omite todos los candidatos,
el error agregado incluye el motivo de omisión de cada uno.

## Acciones

- **generate** (predeterminado) -- crea un video a partir del prompt dado y entradas de referencia opcionales.
- **status** -- verifica el estado de la tarea de video en curso para la sesión actual sin iniciar otra generación.
- **list** -- muestra los proveedores disponibles, modelos y sus capacidades.

## Selección de modelo

Al generar un video, OpenClaw resuelve el modelo en este orden:

1. **parámetro de herramienta `model`** -- si el agente especifica uno en la llamada.
2. **`videoGenerationModel.primary`** -- desde la configuración.
3. **`videoGenerationModel.fallbacks`** -- probados en orden.
4. **Detección automática** -- utiliza proveedores que tengan autenticación válida, comenzando con el proveedor predeterminado actual y luego los demás proveedores en orden alfabético.

Si un proveedor falla, el siguiente candidato se prueba automáticamente. Si todos los candidatos fallan, el error incluye detalles de cada intento.

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

## Notas del proveedor

| Proveedor             | Notas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alibaba               | Utiliza el endpoint asíncrono de DashScope/Model Studio. Las imágenes y videos de referencia deben ser URLs `http(s)` remotas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| BytePlus (1.0)        | ID de proveedor `byteplus`. Modelos: `seedance-1-0-pro-250528` (predeterminado), `seedance-1-0-pro-t2v-250528`, `seedance-1-0-pro-fast-251015`, `seedance-1-0-lite-t2v-250428`, `seedance-1-0-lite-i2v-250428`. Los modelos T2V (`*-t2v-*`) no aceptan entradas de imagen; los modelos I2V y los modelos `*-pro-*` generales admiten una sola imagen de referencia (primer cuadro). Pase la imagen posicionalmente o establezca `role: "first_frame"`. Los IDs de modelos T2V se cambian automáticamente a la variante I2V correspondiente cuando se proporciona una imagen. Claves `providerOptions` compatibles: `seed` (número), `draft` (booleano, fuerza 480p), `camera_fixed` (booleano).                                                                |
| BytePlus Seedance 1.5 | Requiere el plugin [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark). ID del proveedor `byteplus-seedance15`. Modelo: `seedance-1-5-pro-251215`. Utiliza la API unificada `content[]`. Admite un máximo de 2 imágenes de entrada (first_frame + last_frame). Todas las entradas deben ser URLs `https://` remotas. Establezca `role: "first_frame"` / `"last_frame"` en cada imagen, o pase las imágenes por posición. `aspectRatio: "adaptive"` detecta automáticamente la proporción de la imagen de entrada. `audio: true` se asigna a `generate_audio`. `providerOptions.seed` (número) se reenvía.                                                                                                               |
| BytePlus Seedance 2.0 | Requiere el plugin [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark). ID del proveedor `byteplus-seedance2`. Modelos: `dreamina-seedance-2-0-260128`, `dreamina-seedance-2-0-fast-260128`. Utiliza la API unificada `content[]`. Admite hasta 9 imágenes de referencia, 3 videos de referencia y 3 audios de referencia. Todas las entradas deben ser URLs `https://` remotas. Establezca `role` en cada activo — valores admitidos: `"first_frame"`, `"last_frame"`, `"reference_image"`, `"reference_video"`, `"reference_audio"`. `aspectRatio: "adaptive"` detecta automáticamente la proporción de la imagen de entrada. `audio: true` se asigna a `generate_audio`. `providerOptions.seed` (número) se reenvía. |
| ComfyUI               | Ejecución local o en la nube impulsada por flujos de trabajo. Admite texto a video e imagen a video a través del gráfico configurado.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| fal                   | Utiliza un flujo con cola para trabajos de larga duración. Solo referencia de imagen única.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Google                | Utiliza Gemini/Veo. Admite una imagen o un video de referencia.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| MiniMax               | Solo referencia de imagen única.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| OpenAI                | Solo se reenvía la anulación `size`. Otras anulaciones de estilo (`aspectRatio`, `resolution`, `audio`, `watermark`) se ignoran con una advertencia.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Qwen                  | El mismo backend DashScope que Alibaba. Las entradas de referencia deben ser URL `http(s)` remotas; los archivos locales se rechazan por adelantado.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Runway                | Admite archivos locales a través de URI de datos. Video a video requiere `runway/gen4_aleph`. Las ejecuciones de solo texto exponen relaciones de aspecto `16:9` y `9:16`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Together              | Solo referencia de imagen única.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Vydra                 | Usa `https://www.vydra.ai/api/v1` directamente para evitar redirecciones que eliminen la autenticación. `veo3` se incluye como solo texto a video; `kling` requiere una URL de imagen remota.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| xAI                   | Admite flujos de texto a video, imagen a video, y edición/extensión de video remota.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

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

Cobertura en vivo opcional para los proveedores compartidos incluidos:

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts
```

Envoltorio del repositorio:

```bash
pnpm test:live:media video
```

Este archivo en vivo carga las variables de entorno del proveedor faltantes desde `~/.profile`, prefiere las claves API de live/env por encima de los perfiles de autenticación almacenados por defecto, y ejecuta una prueba de humo segura para lanzamientos por defecto:

- `generate` para cada proveedor que no sea FAL en el barrido
- prompt de langosta de un segundo
- límite de operaciones por proveedor desde `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS`
  (`180000` por defecto)

FAL es opcional porque la latencia de la cola del lado del proveedor puede dominar el tiempo de lanzamiento:

```bash
pnpm test:live:media video --video-providers fal
```

Establezca `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` para también ejecutar modos de transformación declarados que el barrido compartido pueda ejercer de manera segura con medios locales:

- `imageToVideo` cuando `capabilities.imageToVideo.enabled`
- `videoToVideo` cuando `capabilities.videoToVideo.enabled` y el proveedor/modelo
  acepta entrada de video local respaldada por búfer en el barrido compartido

Hoy el carril vivo `videoToVideo` compartido cubre:

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
