---
summary: "Genera videos a través de video_generate desde referencias de texto, imagen o video en 14 proveedores backend"
read_when:
  - Generating videos via the agent
  - Configuring video-generation providers and models
  - Understanding the video_generate tool parameters
title: "Generación de videos"
sidebarTitle: "Generación de videos"
---

Los agentes de OpenClaw pueden generar videos a partir de mensajes de texto, imágenes de referencia o videos existentes. Se admiten catorce proveedores de backend, cada uno con diferentes opciones de modelo, modos de entrada y conjuntos de funciones. El agente selecciona automáticamente el proveedor adecuado según su configuración y las claves de API disponibles.

<Note>La herramienta `video_generate` solo aparece cuando hay al menos un proveedor de generación de videos disponible. Si no la ve en sus herramientas de agente, configure una clave de API de proveedor o configure `agents.defaults.videoGenerationModel`.</Note>

OpenClaw trata la generación de video como tres modos de tiempo de ejecución:

- `generate` — solicitudes de texto a video sin medios de referencia.
- `imageToVideo` — la solicitud incluye una o más imágenes de referencia.
- `videoToVideo` — la solicitud incluye uno o más videos de referencia.

Los proveedores pueden admitir cualquier subconjunto de esos modos. La herramienta valida el modo activo antes del envío e informa los modos admitidos en `action=list`.

## Inicio rápido

<Steps>
  <Step title="Configurar autenticación">
    Establezca una clave de API para cualquier proveedor admitido:

    ```bash
    export GEMINI_API_KEY="your-key"
    ```

  </Step>
  <Step title="Elegir un modelo predeterminado (opcional)">
    ```bash
    openclaw config set agents.defaults.videoGenerationModel.primary "google/veo-3.1-fast-generate-preview"
    ```
  </Step>
  <Step title="Preguntar al agente">
    > Genera un video cinematográfico de 5 segundos de una langosta amistosa surfeando al atardecer.

    El agente llama a `video_generate` automáticamente. No es necesario permitir explícitamente la herramienta.

  </Step>
</Steps>

## Cómo funciona la generación asíncrona

La generación de videos es asíncrona. Cuando el agente llama a `video_generate` en una sesión:

1. OpenClaw envía la solicitud al proveedor y devuelve inmediatamente un id de tarea.
2. El proveedor procesa el trabajo en segundo plano (típicamente de 30 segundos a 5 minutos dependiendo del proveedor y la resolución).
3. Cuando el video está listo, OpenClaw reactiva la misma sesión con un evento interno de finalización.
4. El agente publica el video terminado de nuevo en la conversación original.

Mientras un trabajo está en curso, las llamadas duplicadas `video_generate` en la misma sesión devuelven el estado actual de la tarea en lugar de iniciar otra generación. Use `openclaw tasks list` o `openclaw tasks show <taskId>` para verificar el progreso desde la CLI.

Fuera de las ejecuciones del agente respaldadas por sesión (por ejemplo, invocaciones directas de herramientas), la herramienta recurre a la generación en línea y devuelve la ruta de medios final en el mismo turno.

Los archivos de video generados se guardan bajo el almacenamiento de medios administrado por OpenClaw cuando el proveedor devuelve bytes. El límite de guardado de video generado predeterminado sigue el límite de medios de video, y `agents.defaults.mediaMaxMb` lo aumenta para renderizaciones más grandes. Cuando un proveedor también devuelve una URL de salida alojada, OpenClaw puede entregar esa URL en lugar de fallar la tarea si la persistencia local rechaza un archivo demasiado grande.

### Ciclo de vida de la tarea

| Estado      | Significado                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| `queued`    | Tarea creada, esperando a que el proveedor la acepte.                                                            |
| `running`   | El proveedor está procesando (típicamente de 30 segundos a 5 minutos dependiendo del proveedor y la resolución). |
| `succeeded` | Video listo; el agente se despierta y lo publica en la conversación.                                             |
| `failed`    | Error o tiempo de espera del proveedor; el agente se despierta con detalles del error.                           |

Verificar el estado desde la CLI:

```bash
openclaw tasks list
openclaw tasks show <taskId>
openclaw tasks cancel <taskId>
```

Si una tarea de video ya está `queued` o `running` para la sesión actual, `video_generate` devuelve el estado de la tarea existente en lugar de iniciar una nueva. Use `action: "status"` para verificar explícitamente sin activar una nueva generación.

## Proveedores compatibles

| Proveedor             | Modelo predeterminado           | Texto | Ref. de imagen                                                 | Ref. de video                                     | Autenticación                           |
| --------------------- | ------------------------------- | :---: | -------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------- |
| Alibaba               | `wan2.6-t2v`                    |   ✓   | Sí (URL remota)                                                | Sí (URL remota)                                   | `MODELSTUDIO_API_KEY`                   |
| BytePlus (1.0)        | `seedance-1-0-pro-250528`       |   ✓   | Hasta 2 imágenes (solo modelos I2V; primer + último fotograma) | —                                                 | `BYTEPLUS_API_KEY`                      |
| BytePlus Seedance 1.5 | `seedance-1-5-pro-251215`       |   ✓   | Hasta 2 imágenes (primer + último fotograma a través del rol)  | —                                                 | `BYTEPLUS_API_KEY`                      |
| BytePlus Seedance 2.0 | `dreamina-seedance-2-0-260128`  |   ✓   | Hasta 9 imágenes de referencia                                 | Hasta 3 videos                                    | `BYTEPLUS_API_KEY`                      |
| ComfyUI               | `workflow`                      |   ✓   | 1 imagen                                                       | —                                                 | `COMFY_API_KEY` o `COMFY_CLOUD_API_KEY` |
| fal                   | `fal-ai/minimax/video-01-live`  |   ✓   | 1 imagen; hasta 9 con referencia a video de Seedance           | Hasta 3 videos con referencia a video de Seedance | `FAL_KEY`                               |
| Google                | `veo-3.1-fast-generate-preview` |   ✓   | 1 imagen                                                       | 1 video                                           | `GEMINI_API_KEY`                        |
| MiniMax               | `MiniMax-Hailuo-2.3`            |   ✓   | 1 imagen                                                       | —                                                 | `MINIMAX_API_KEY` o MiniMax OAuth       |
| OpenAI                | `sora-2`                        |   ✓   | 1 imagen                                                       | 1 video                                           | `OPENAI_API_KEY`                        |
| Qwen                  | `wan2.6-t2v`                    |   ✓   | Sí (URL remota)                                                | Sí (URL remota)                                   | `QWEN_API_KEY`                          |
| Runway                | `gen4.5`                        |   ✓   | 1 imagen                                                       | 1 video                                           | `RUNWAYML_API_SECRET`                   |
| Together              | `Wan-AI/Wan2.2-T2V-A14B`        |   ✓   | 1 imagen                                                       | —                                                 | `TOGETHER_API_KEY`                      |
| Vydra                 | `veo3`                          |   ✓   | 1 imagen (`kling`)                                             | —                                                 | `VYDRA_API_KEY`                         |
| xAI                   | `grok-imagine-video`            |   ✓   | 1 imagen del primer fotograma o hasta a 7 `reference_image`s   | 1 video                                           | `XAI_API_KEY`                           |

Algunos proveedores aceptan variables de entorno de clave de API adicionales o alternativas. Consulte las [páginas de proveedores individuales](#related) para obtener más detalles.

Ejecute `video_generate action=list` para inspeccionar los proveedores, modelos y modos de ejecución disponibles en tiempo de ejecución.

### Matriz de capacidades

El contrato de modo explícito utilizado por `video_generate`, las pruebas de contrato y el barrido compartido en vivo:

| Proveedor | `generate` | `imageToVideo` | `videoToVideo` | Carriles compartidos en vivo hoy                                                                                                                                  |
| --------- | :--------: | :------------: | :------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alibaba   |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` omitido porque este proveedor necesita URLs de video `http(s)` remotas                                                 |
| BytePlus  |     ✓      |       ✓        |       —        | `generate`, `imageToVideo`                                                                                                                                        |
| ComfyUI   |     ✓      |       ✓        |       —        | No está en el barrido compartido; la cobertura específica del flujo de trabajo reside con las pruebas de Comfy                                                    |
| fal       |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` solo al usar referencia a video de Seedance                                                                            |
| Google    |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` compartido omitido porque el barrido Gemini/Veo actual respaldado por búfer no acepta esa entrada                      |
| MiniMax   |     ✓      |       ✓        |       —        | `generate`, `imageToVideo`                                                                                                                                        |
| OpenAI    |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` compartido omitido porque esta ruta de organización/entrada actualmente necesita acceso de inpaint/remix del proveedor |
| Qwen      |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` omitido porque este proveedor necesita URLs de video `http(s)` remotas                                                 |
| Runway    |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` se ejecuta solo cuando el modelo seleccionado es `runway/gen4_aleph`                                                   |
| Together  |     ✓      |       ✓        |       —        | `generate`, `imageToVideo`                                                                                                                                        |
| Vydra     |     ✓      |       ✓        |       —        | `generate`; `imageToVideo` compartido omitido porque `veo3` agrupado es solo de texto y `kling` agrupado requiere una URL de imagen remota                        |
| xAI       |     ✓      |       ✓        |       ✓        | `generate`, `imageToVideo`; `videoToVideo` omitido porque este proveedor actualmente necesita una URL MP4 remota                                                  |

## Parámetros de la herramienta

### Obligatorio

<ParamField path="prompt" type="string" required>
  Descripción de texto del video a generar. Obligatorio para `action: "generate"`.
</ParamField>

### Entradas de contenido

<ParamField path="image" type="string">
  Imagen de referencia única (ruta o URL).
</ParamField>
<ParamField path="images" type="string[]">
  Múltiples imágenes de referencia (hasta 9).
</ParamField>
<ParamField path="imageRoles" type="string[]">
  Sugerencias de rol opcionales por posición, paralelas a la lista de imágenes combinada. Valores canónicos: `first_frame`, `last_frame`, `reference_image`.
</ParamField>
<ParamField path="video" type="string">
  Video de referencia único (ruta o URL).
</ParamField>
<ParamField path="videos" type="string[]">
  Múltiples videos de referencia (hasta 4).
</ParamField>
<ParamField path="videoRoles" type="string[]">
  Sugerencias de rol opcionales por posición, paralelas a la lista de videos combinada. Valor canónico: `reference_video`.
</ParamField>
<ParamField path="audioRef" type="string">
  Audio de referencia único (ruta o URL). Se utiliza para música de fondo o referencia de voz cuando el proveedor admite entradas de audio.
</ParamField>
<ParamField path="audioRefs" type="string[]">
  Múltiples audios de referencia (hasta 3).
</ParamField>
<ParamField path="audioRoles" type="string[]">
  Sugerencias de rol opcionales por posición, paralelas a la lista de audios combinada. Valor canónico: `reference_audio`.
</ParamField>

<Note>
  Las sugerencias de rol se reenvían al proveedor tal cual. Los valores canónicos provienen de la unión `VideoGenerationAssetRole`, pero los proveedores pueden aceptar cadenas de rol adicionales. Los arrays `*Roles` no deben tener más entradas que la lista de referencia correspondiente; los errores de uno por fallan con un mensaje claro. Use una cadena vacía para dejar un espacio sin asignar. Para
  xAI, establezca cada rol de imagen en `reference_image` para usar su modo de generación `reference_images`; omita el rol o use `first_frame` para video a partir de una sola imagen.
</Note>

### Controles de estilo

<ParamField path="aspectRatio" type="string">
  `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`, o `adaptive`.
</ParamField>
<ParamField path="resolution" type="string">
  `480P`, `720P`, `768P`, o `1080P`.
</ParamField>
<ParamField path="durationSeconds" type="number">
  Duración objetivo en segundos (redondeada al valor más cercano admitido por el proveedor).
</ParamField>
<ParamField path="size" type="string">
  Sugerencia de tamaño cuando el proveedor lo admite.
</ParamField>
<ParamField path="audio" type="boolean">
  Habilitar audio generado en la salida cuando sea compatible. Distinto de `audioRef*` (entradas).
</ParamField>
<ParamField path="watermark" type="boolean">
  Alternar la marca de agua del proveedor cuando sea compatible.
</ParamField>

`adaptive` es un valor centinela específico del proveedor: se reenvía tal cual a
los proveedores que declaran `adaptive` en sus capacidades (por ejemplo, BytePlus
Seedance lo usa para detectar automáticamente la relación de aspecto desde las dimensiones de la imagen de entrada).
Los proveedores que no lo declaran muestran el valor a través de
`details.ignoredOverrides` en el resultado de la herramienta para que la omisión sea visible.

### Avanzado

<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  `"status"` devuelve la tarea de la sesión actual; `"list"` inspecciona los proveedores.
</ParamField>
<ParamField path="model" type="string">Anulación de proveedor/modelo (p. ej. `runway/gen4.5`).</ParamField>
<ParamField path="filename" type="string">Sugerencia de nombre de archivo de salida.</ParamField>
<ParamField path="timeoutMs" type="number">Tiempo de espera opcional de la solicitud del proveedor en milisegundos.</ParamField>
<ParamField path="providerOptions" type="object">
  Opciones específicas del proveedor como un objeto JSON (p. ej. `{"seed": 42, "draft": true}`).
  Los proveedores que declaran un esquema con tipo validan las claves y tipos; las claves
  desconocidas o discordantes omiten el candidato durante la recuperación. Los proveedores sin un
  esquema declarado reciben las opciones tal como son. Ejecute `video_generate action=list`
  para ver qué acepta cada proveedor.
</ParamField>

<Note>
  No todos los proveedores admiten todos los parámetros. OpenClaw normaliza la duración al valor más cercano admitido por el proveedor y reasigna sugerencias de geometría traducidas tales como tamaño a relación de aspecto cuando un proveedor de reserva expone una superficie de control diferente. Las anulaciones realmente no admitidas se ignoran sobre una base de mejor esfuerzo y se informan como
  advertencias en el resultado de la herramienta. Los límites duros de capacidad (como demasiadas entradas de referencia) fallan antes del envío. Los resultados de la herramienta informan de la configuración aplicada; `details.normalization` captura cualquier traducción de solicitado a aplicado.
</Note>

Las entradas de referencia seleccionan el modo de tiempo de ejecución:

- Sin medios de referencia → `generate`
- Cualquier referencia de imagen → `imageToVideo`
- Cualquier referencia de video → `videoToVideo`
- Las entradas de audio de referencia **no** cambian el modo resuelto; se aplican
  sobre cualquier modo que seleccionen las referencias de imagen/video y solo funcionan
  con proveedores que declaran `maxInputAudios`.

Las referencias mixtas de imagen y video no son una superficie de capacidad compartida estable.
Prefiera un tipo de referencia por solicitud.

#### Opciones de recuperación y con tipo

Algunas verificaciones de capacidades se aplican en la capa de reserva (fallback) en lugar de en el límite de la herramienta, por lo que una solicitud que exceda los límites del proveedor principal aún puede ejecutarse en una reserva capaz:

- El candidato activo que no declara `maxInputAudios` (o `0`) se omite cuando la solicitud contiene referencias de audio; se intenta con el siguiente candidato.
- El `maxDurationSeconds` del candidato activo está por debajo del `durationSeconds` solicitado sin una lista `supportedDurationSeconds` declarada → se omite.
- La solicitud contiene `providerOptions` y el candidato activo declara explícitamente un esquema `providerOptions` tipado → se omite si las claves proporcionadas no están en el esquema o si los tipos de valor no coinciden. Los proveedores sin un esquema declarado reciben las opciones tal cual (transferencia compatible con versiones anteriores). Un proveedor puede optar por no recibir ninguna opción de proveedor declarando un esquema vacío (`capabilities.providerOptions: {}`), lo que provoca la misma omisión que una discordancia de tipos.

El primer motivo de omisión en una solicitud se registra en `warn` para que los operadores vean cuándo se pasó por alto su proveedor principal; las omisiones posteriores se registran en `debug` para mantener silenciosas las cadenas de reserva largas. Si se omite todos los candidatos, el error agregado incluye el motivo de omisión de cada uno.

## Acciones

| Acción     | Lo que hace                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------- |
| `generate` | Predeterminado. Crea un video a partir del prompt dado y entradas de referencia opcionales.         |
| `status`   | Verifica el estado de la tarea de video en curso para la sesión actual sin iniciar otra generación. |
| `list`     | Muestra los proveedores disponibles, los modelos y sus capacidades.                                 |

## Selección del modelo

OpenClaw resuelve el modelo en este orden:

1. **Parámetro de la herramienta `model`** — si el agente especifica uno en la llamada.
2. **`videoGenerationModel.primary`** de la configuración.
3. **`videoGenerationModel.fallbacks`** en orden.
4. **Detección automática** — proveedores que tienen autenticación válida, comenzando por el proveedor predeterminado actual, y luego los proveedores restantes en orden alfabético.

Si un proveedor falla, se intenta automáticamente con el siguiente candidato. Si todos los candidatos fallan, el error incluye detalles de cada intento.

Establezca `agents.defaults.mediaGenerationAutoProviderFallback: false` para usar
solo las entradas explícitas `model`, `primary` y `fallbacks`.

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

<AccordionGroup>
  <Accordion title="Alibaba">
    Utiliza el punto final asíncrono de DashScope / Model Studio. Las imágenes y
    videos de referencia deben ser URL `http(s)` remotas.
  </Accordion>
  <Accordion title="BytePlus (1.0)">
    ID del proveedor: `byteplus`.

    Modelos: `seedance-1-0-pro-250528` (predeterminado),
    `seedance-1-0-pro-t2v-250528`, `seedance-1-0-pro-fast-251015`,
    `seedance-1-0-lite-t2v-250428`, `seedance-1-0-lite-i2v-250428`.

    Los modelos T2V (`*-t2v-*`) no aceptan entradas de imagen; los modelos I2V y
    los modelos generales `*-pro-*` admiten una única imagen de referencia (primer
    cuadro). Pase la imagen posicionalmente o establezca `role: "first_frame"`.
    Los IDs de modelos T2V se cambian automáticamente a la variante I2V
    correspondiente cuando se proporciona una imagen.

    Claves `providerOptions` compatibles: `seed` (número), `draft` (booleano: —
    fuerza 480p), `camera_fixed` (booleano).

  </Accordion>
  <Accordion title="BytePlus Seedance 1.5">
    Requiere el complemento [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark)
    ID del proveedor: `byteplus-seedance15`. Modelo:
    `seedance-1-5-pro-251215`.

    Utiliza la API unificada `content[]`. Admite un máximo de 2 imágenes de entrada
    (`first_frame` + `last_frame`). Todas las entradas deben ser URL `https://`
    remotas. Establezca `role: "first_frame"` / `"last_frame"` en cada imagen, o
    pase las imágenes posicionalmente.

    `aspectRatio: "adaptive"` detecta automáticamente la proporción de la imagen de entrada.
    `audio: true` se asigna a `generate_audio`. `providerOptions.seed`
    (número) se reenvía.

  </Accordion>
  <Accordion title="BytePlus Seedance 2.0">
    Requiere el plugin [`@openclaw/byteplus-modelark`](https://www.npmjs.com/package/@openclaw/byteplus-modelark).
    Id. del proveedor: `byteplus-seedance2`. Modelos:
    `dreamina-seedance-2-0-260128`,
    `dreamina-seedance-2-0-fast-260128`.

    Utiliza la API unificada `content[]`. Admite hasta 9 imágenes de referencia,
    3 videos de referencia y 3 audios de referencia. Todas las entradas deben ser
    URL `https://` remotas. Establezca `role` en cada activo; valores admitidos:
    `"first_frame"`, `"last_frame"`, `"reference_image"`,
    `"reference_video"`, `"reference_audio"`.

    `aspectRatio: "adaptive"` detecta automáticamente la relación de aspecto desde la imagen de entrada.
    `audio: true` se asigna a `generate_audio`. `providerOptions.seed`
    (número) se reenvía.

  </Accordion>
  <Accordion title="ComfyUI">
    Ejecución local o en la nube basada en flujos de trabajo. Admite texto a video e
    imagen a video a través del gráfico configurado.
  </Accordion>
  <Accordion title="fal">
    Utiliza un flujo con cola para trabajos de larga duración. La mayoría de los modelos de video de fal
    aceptan una sola imagen de referencia. Los modelos de referencia a video
    de Seedance 2.0 aceptan hasta 9 imágenes, 3 videos y 3 referencias de audio, con
    un máximo de 12 archivos de referencia en total.
  </Accordion>
  <Accordion title="Google (Gemini / Veo)">
    Admite una imagen o un video de referencia.
  </Accordion>
  <Accordion title="MiniMax">
    Solo una imagen de referencia.
  </Accordion>
  <Accordion title="OpenAI">
    Solo se reenvía la anulación `size`. Otras anulaciones de estilo
    (`aspectRatio`, `resolution`, `audio`, `watermark`) se ignoran con
    una advertencia.
  </Accordion>
  <Accordion title="Qwen">
    Mismo backend DashScope que Alibaba. Las entradas de referencia deben ser
    URLs `http(s)` remotas; los archivos locales se rechazan de inmediato.
  </Accordion>
  <Accordion title="Runway">
    Admite archivos locales a través de URI de datos. Video a video requiere
    `runway/gen4_aleph`. Las ejecuciones solo de texto exponen las relaciones de aspecto
    `16:9` y `9:16`.
  </Accordion>
  <Accordion title="Together">
    Solo referencia de imagen única.
  </Accordion>
  <Accordion title="Vydra">
    Usa `https://www.vydra.ai/api/v1` directamente para evitar redirecciones que
    eliminen la autenticación. `veo3` se incluye solo como texto a video; `kling` requiere
    una URL de imagen remota.
  </Accordion>
  <Accordion title="xAI">
    Admite texto a video, imagen a video de primer cuadro único, hasta 7
    entradas `reference_image` a través de xAI `reference_images`, y flujos
    de edición/extensión de video remotos.
  </Accordion>
</AccordionGroup>

## Modos de capacidad del proveedor

El contrato compartido de generación de video admite capacidades específicas del modo
en lugar de solo límites agregados planos. Las nuevas implementaciones de proveedores
deben preferir bloques de modo explícitos:

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
    maxInputImagesByModel: { "provider/reference-to-video": 9 },
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

Los campos agregados planos como `maxInputImages` y `maxInputVideos` **no** son
suficientes para anunciar el soporte del modo de transformación. Los proveedores deben
declarar `generate`, `imageToVideo` y `videoToVideo` explícitamente para que las pruebas
en vivo, las pruebas de contrato y la herramienta compartida `video_generate` puedan validar
el soporte del modo de manera determinista.

Cuando un modelo en un proveedor tiene un soporte de entrada de referencia más amplio que el
resto, use `maxInputImagesByModel`, `maxInputVideosByModel` o
`maxInputAudiosByModel` en lugar de aumentar el límite en todo el modo.

## Pruebas en vivo

Cobertura en vivo opcional para los proveedores compartidos incluidos:

```bash
OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts
```

Envoltorio del repositorio:

```bash
pnpm test:live:media video
```

Este archivo en vivo carga las variables de entorno del proveedor faltantes desde `~/.profile`, prefiere
las claves de API live/env antes que los perfiles de autenticación almacenados de forma predeterminada y ejecuta una
prueba de humo segura para lanzamientos de forma predeterminada:

- `generate` para cada proveedor que no sea FAL en el barrido.
- Prompt de langosta de un segundo.
- Límite de operaciones por proveedor desde
  `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` (`180000` de forma predeterminada).

FAL es opcional porque la latencia de la cola del lado del proveedor puede dominar el tiempo
de lanzamiento:

```bash
pnpm test:live:media video --video-providers fal
```

Configure `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` para también ejecutar los modos de transformación declarados que el barrido compartido puede ejercer de manera segura con medios locales:

- `imageToVideo` cuando `capabilities.imageToVideo.enabled`.
- `videoToVideo` cuando `capabilities.videoToVideo.enabled` y el
  proveedor/modelo acepta entrada de video local respaldada por búfer en el barrido
  compartido.

Hoy el carril vivo compartido `videoToVideo` cubre `runway` solo cuando
selecciona `runway/gen4_aleph`.

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

- [Alibaba Model Studio](/es/providers/alibaba)
- [Tareas en segundo plano](/es/automation/tasks) — seguimiento de tareas para la generación de video asíncrona
- [BytePlus](/es/concepts/model-providers#byteplus-international)
- [ComfyUI](/es/providers/comfy)
- [Referencia de configuración](/es/gateway/config-agents#agent-defaults)
- [fal](/es/providers/fal)
- [Google (Gemini)](/es/providers/google)
- [MiniMax](/es/providers/minimax)
- [Modelos](/es/concepts/models)
- [OpenAI](/es/providers/openai)
- [Qwen](/es/providers/qwen)
- [Runway](/es/providers/runway)
- [Together AI](/es/providers/together)
- [Resumen de herramientas](/es/tools)
- [Vydra](/es/providers/vydra)
- [xAI](/es/providers/xai)
