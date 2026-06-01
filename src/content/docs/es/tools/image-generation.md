---
summary: "Genera y edita imágenes mediante image_generate en OpenAI, Google, fal, MiniMax, ComfyUI, DeepInfra, OpenRouter, LiteLLM, xAI, Vydra"
read_when:
  - Generating or editing images via the agent
  - Configuring image-generation providers and models
  - Understanding the image_generate tool parameters
title: "Generación de imágenes"
sidebarTitle: "Generación de imágenes"
---

La herramienta `image_generate` permite al agente crear y editar imágenes utilizando sus
proveedores configurados. En las sesiones de chat, la generación de imágenes se ejecuta de forma asíncrona:
OpenClaw registra una tarea en segundo plano, devuelve el id de la tarea inmediatamente y despierta
al agente cuando el proveedor finaliza. El agente de finalización debe enviar las imágenes
generadas a través de la herramienta `message`. Si la sesión solicitante está inactiva o
su activación falla, y faltan algunas imágenes generadas de
la entrega de la herramienta de mensaje, OpenClaw envía un respaldo directo idempotente con solo
las imágenes que faltan.

<Note>La herramienta solo aparece cuando al menos un proveedor de generación de imágenes está disponible. Si no ve `image_generate` en las herramientas de su agente, configure `agents.defaults.imageGenerationModel`, configure una clave de API de proveedor, o inicie sesión con OpenAI Codex OAuth.</Note>

## Inicio rápido

<Steps>
  <Step title="Configurar autenticación">
    Establezca una clave de API para al menos un proveedor (por ejemplo `OPENAI_API_KEY`,
    `GEMINI_API_KEY`, `OPENROUTER_API_KEY`) o inicie sesión con OpenAI Codex OAuth.
  </Step>
  <Step title="Elija un modelo predeterminado (opcional)">
    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "openai/gpt-image-2",
            timeoutMs: 180_000,
          },
        },
      },
    }
    ```

    Codex OAuth utiliza la misma referencia de modelo `openai/gpt-image-2`. Cuando se
    configura un perfil `openai-codex` OAuth, OpenClaw enruta las solicitudes de
    imágenes a través de ese perfil OAuth en lugar de intentar primero
    `OPENAI_API_KEY`. La configuración `models.providers.openai` explícita (clave de API,
    URL base personalizada/Azure) vuelve a optar por la ruta directa de la API de imágenes de OpenAI.

  </Step>
  <Step title="Pídele al agente">
    _"Genera una imagen de una mascota de robot amigable."_

    El agente llama a `image_generate` automáticamente. No es necesario
    incluir la herramienta en la lista de permitidos; está habilitada de forma predeterminada
    cuando hay un proveedor disponible. La herramienta devuelve un identificador de tarea
    en segundo plano y, cuando está lista, el agente de finalización envía el archivo adjunto
    generado a través de la herramienta `message`.

  </Step>
</Steps>

<Warning>Para los endpoints de LAN compatibles con OpenAI, como LocalAI, mantenga el `models.providers.openai.baseUrl` personalizado y acepte explícitamente con `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`. Los endpoints de imagen privados e internos siguen bloqueados de forma predeterminada.</Warning>

## Rutas comunes

| Objetivo                                                                  | Referencia del modelo                              | Autenticación                            |
| ------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------- |
| Generación de imágenes de OpenAI con facturación de API                   | `openai/gpt-image-2`                               | `OPENAI_API_KEY`                         |
| Generación de imágenes de OpenAI con autenticación de suscripción a Codex | `openai/gpt-image-2`                               | OpenAI Codex OAuth                       |
| OpenAI PNG/WebP con fondo transparente                                    | `openai/gpt-image-1.5`                             | `OPENAI_API_KEY` u OAuth de OpenAI Codex |
| Generación de imágenes DeepInfra                                          | `deepinfra/black-forest-labs/FLUX-1-schnell`       | `DEEPINFRA_API_KEY`                      |
| fal Krea 2 generación expresiva/dirigida por estilo                       | `fal/krea/v2/medium/text-to-image`                 | `FAL_KEY`                                |
| Generación de imágenes de OpenRouter                                      | `openrouter/google/gemini-3.1-flash-image-preview` | `OPENROUTER_API_KEY`                     |
| Generación de imágenes de LiteLLM                                         | `litellm/gpt-image-2`                              | `LITELLM_API_KEY`                        |
| Generación de imágenes de Google Gemini                                   | `google/gemini-3.1-flash-image-preview`            | `GEMINI_API_KEY` o `GOOGLE_API_KEY`      |

La misma herramienta `image_generate` maneja la conversión de texto a imagen
y la edición de imágenes de referencia. Use `image` para una referencia o
`images` para varias referencias.
Para los modelos Krea 2 en fal, esas referencias se envían como referencias de estilo
en lugar de entradas de edición.
Las sugerencias de salida admitidas por el proveedor, como `quality`, `outputFormat` y
`background`, se reenvían cuando están disponibles y se reportan como ignoradas cuando un
proveedor no las admite. La compatibilidad con fondo transparente incluido es
específica de OpenAI; otros proveedores aún pueden conservar el alfa de PNG si su
backend lo emite.

## Proveedores compatibles

| Proveedor  | Modelo predeterminado                   | Soporte de edición                              | Autenticación                                        |
| ---------- | --------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| ComfyUI    | `workflow`                              | Sí (1 imagen, configurado por flujo de trabajo) | `COMFY_API_KEY` o `COMFY_CLOUD_API_KEY` para la nube |
| DeepInfra  | `black-forest-labs/FLUX-1-schnell`      | Sí (1 imagen)                                   | `DEEPINFRA_API_KEY`                                  |
| fal        | `fal-ai/flux/dev`                       | Sí (límites específicos del modelo)             | `FAL_KEY`                                            |
| Google     | `gemini-3.1-flash-image-preview`        | Sí                                              | `GEMINI_API_KEY` o `GOOGLE_API_KEY`                  |
| LiteLLM    | `gpt-image-2`                           | Sí (hasta 5 imágenes de entrada)                | `LITELLM_API_KEY`                                    |
| MiniMax    | `image-01`                              | Sí (referencia de sujeto)                       | `MINIMAX_API_KEY` o MiniMax OAuth (`minimax-portal`) |
| OpenAI     | `gpt-image-2`                           | Sí (hasta 4 imágenes)                           | `OPENAI_API_KEY` u OpenAI Codex OAuth                |
| OpenRouter | `google/gemini-3.1-flash-image-preview` | Sí (hasta 5 imágenes de entrada)                | `OPENROUTER_API_KEY`                                 |
| Vydra      | `grok-imagine`                          | No                                              | `VYDRA_API_KEY`                                      |
| xAI        | `grok-imagine-image`                    | Sí (hasta 5 imágenes)                           | `XAI_API_KEY`                                        |

Use `action: "list"` para inspeccionar los proveedores y modelos disponibles en tiempo de ejecución:

```text
/tool image_generate action=list
```

Use `action: "status"` para inspeccionar la tarea de generación de imágenes activa para la
sesión actual:

```text
/tool image_generate action=status
```

## Capacidades del proveedor

| Capacidad                 | ComfyUI                       | DeepInfra | fal                                                | Google           | MiniMax                  | OpenAI           | Vydra | xAI              |
| ------------------------- | ----------------------------- | --------- | -------------------------------------------------- | ---------------- | ------------------------ | ---------------- | ----- | ---------------- |
| Generar (recuento máximo) | Definido por flujo de trabajo | 4         | 4                                                  | 4                | 9                        | 4                | 1     | 4                |
| Editar / referencia       | 1 imagen (flujo de trabajo)   | 1 imagen  | Flux: 1; GPT: 10; refs de estilo Krea: 10; NB2: 14 | Hasta 5 imágenes | 1 imagen (ref de sujeto) | Hasta 5 imágenes | -     | Hasta 5 imágenes |
| Control de tamaño         | -                             | ✓         | ✓                                                  | ✓                | -                        | Hasta 4K         | -     | -                |
| Relación de aspecto       | -                             | -         | ✓                                                  | ✓                | ✓                        | -                | -     | ✓                |
| Resolución (1K/2K/4K)     | -                             | -         | ✓                                                  | ✓                | -                        | -                | -     | 1K, 2K           |

## Parámetros de la herramienta

<ParamField path="prompt" type="string" required>
  Prompt de generación de imágenes. Obligatorio para `action: "generate"`.
</ParamField>
<ParamField path="action" type='"generate" | "status" | "list"' default="generate">
  Use `"status"` para inspeccionar la tarea de la sesión activa o `"list"` para inspeccionar los proveedores y modelos disponibles en tiempo de ejecución.
</ParamField>
<ParamField path="model" type="string">
  Sobrescritura de proveedor/modelo (por ejemplo, `openai/gpt-image-2`). Use `openai/gpt-image-1.5` para fondos transparentes de OpenAI.
</ParamField>
<ParamField path="image" type="string">
  Ruta de imagen de referencia única o URL para el modo de edición.
</ParamField>
<ParamField path="images" type="string[]">
  Múltiples imágenes de referencia para el modo de edición o modelos de referencia de estilo (hasta 10 a través de la herramienta compartida; los límites específicos del proveedor aún se aplican).
</ParamField>
<ParamField path="size" type="string">
  Sugerencia de tamaño: `1024x1024`, `1536x1024`, `1024x1536`, `2048x2048`, `3840x2160`.
</ParamField>
<ParamField path="aspectRatio" type="string">
  Relación de aspecto: `1:1`, `2:3`, `3:2`, `2.35:1`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`, `4:1`, `1:4`, `8:1`, `1:8`. Los proveedores validan su subconjunto específico del modelo.
</ParamField>
<ParamField path="resolution" type='"1K" | "2K" | "4K"'>
  Sugerencia de resolución.
</ParamField>
<ParamField path="quality" type='"low" | "medium" | "high" | "auto"'>
  Sugerencia de calidad cuando el proveedor lo admite.
</ParamField>
<ParamField path="outputFormat" type='"png" | "jpeg" | "webp"'>
  Sugerencia de formato de salida cuando el proveedor lo admite.
</ParamField>
<ParamField path="background" type='"transparent" | "opaque" | "auto"'>
  Sugerencia de fondo cuando el proveedor lo admite. Use `transparent` con `outputFormat: "png"` o `"webp"` para proveedores con capacidad de transparencia.
</ParamField>
<ParamField path="count" type="number">
  Número de imágenes a generar (1-4).
</ParamField>
<ParamField path="timeoutMs" type="number">
  Tiempo de espera de solicitud del proveedor opcional en milisegundos. Cuando Codex llama a `image_generate` a través de herramientas dinámicas, este valor por llamada aún anula el valor predeterminado configurado y se limita a 600000 ms.
</ParamField>
<ParamField path="filename" type="string">
  Sugerencia de nombre de archivo de salida.
</ParamField>
<ParamField path="openai" type="object">
  Sugerencias exclusivas de OpenAI: `background`, `moderation`, `outputCompression` y `user`.
</ParamField>
<ParamField path="fal.creativity" type='"raw" | "low" | "medium" | "high"'>
  Control de creatividad fal Krea 2. El valor predeterminado es `medium`.
</ParamField>

<Note>
  No todos los proveedores admiten todos los parámetros. Cuando un proveedor de respaldo admite una c opción geométrica cercana en lugar de la solicitada exactamente, OpenClaw remapea a el tamaño, relación de aspecto o resolución admitido más cercano antes del envío. Las sugerencias de salida no admitidas se descartan para los proveedores que no declaran soporte y se informan en el resultado de la
  herramienta. Los resultados de la herramienta informan de la configuración aplicada; `details.normalization` captura cualquier traducción de solicitado a aplicado.
</Note>

## Configuración

### Selección del modelo

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
        timeoutMs: 180_000,
        fallbacks: ["openrouter/google/gemini-3.1-flash-image-preview", "google/gemini-3.1-flash-image-preview", "fal/fal-ai/flux/dev"],
      },
    },
  },
}
```

### Orden de selección del proveedor

OpenClaw prueba los proveedores en este orden:

1. **Parámetro `model`** de la llamada a la herramienta (si el agente especifica uno).
2. **`imageGenerationModel.primary`** desde la configuración.
3. **`imageGenerationModel.fallbacks`** en orden.
4. **Detección automática** - solo valores predeterminados del proveedor con autenticación:
   - primero el proveedor predeterminado actual;
   - proveedores de generación de imágenes registrados restantes en orden de ID de proveedor.

Si un proveedor falla (error de autenticación, límite de velocidad, etc.), el siguiente candidato
configurado se prueba automáticamente. Si todos fallan, el error incluye detalles
de cada intento.

<AccordionGroup>
  <Accordion title="Las anulaciones de modelo por llamada son exactas">Una anulación de `model` por llamada intenta solo ese proveedor/modelo y no continúa con los proveedores configurados principales/de respaldo o detectados automáticamente.</Accordion>
  <Accordion title="La detección automática es consciente de la autenticación">Un valor predeterminado del proveedor solo ingresa a la lista de candidatos cuando OpenClaw puede autenticar realmente ese proveedor. Establezca `agents.defaults.mediaGenerationAutoProviderFallback: false` para usar solo entradas explícitas de `model`, `primary` y `fallbacks`.</Accordion>
  <Accordion title="Tiempos de espera">
    Establezca `agents.defaults.imageGenerationModel.timeoutMs` para backends de imágenes lentos. Un parámetro de herramienta `timeoutMs` por llamada anula el predeterminado configurado, y los predeterminados configurados anulan los predeterminados del proveedor creados por el complemento. Los proveedores de imágenes alojados de Google y OpenRouter usan predeterminados de 180 segundos; la
    generación de imágenes de xAI y Azure OpenAI usa 600 segundos. Las llamadas de herramientas dinámicas de Codex usan un puente predeterminado de `image_generate` de 120 segundos y respetan el mismo presupuesto de tiempo de espera cuando se configura, limitado por el máximo de 600000 ms del puente de herramientas dinámicas de OpenClaw.
  </Accordion>
  <Accordion title="Inspeccionar en tiempo de ejecución">Use `action: "list"` para inspeccionar los proveedores registrados actualmente, sus modelos predeterminados y sugerencias de variables de entorno de autenticación.</Accordion>
</AccordionGroup>

### Edición de imágenes

OpenAI, OpenRouter, Google, DeepInfra, fal, MiniMax, ComfyUI y xAI admiten la edición
de imágenes de referencia. Los modelos Krea 2 en fal usan los mismos campos `image` / `images`
como referencias de estilo en lugar de entradas de edición. Pase una ruta o URL de imagen de referencia:

```text
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

OpenAI, OpenRouter, Google y xAI admiten hasta 5 imágenes de referencia a través del
parámetro `images`. fal admite 1 imagen de referencia para Flux de imagen a imagen, hasta
10 para ediciones de GPT Image 2, hasta 10 referencias de estilo para Krea 2 y hasta
14 para ediciones de Nano Banana 2. MiniMax y ComfyUI admiten 1.

## Análisis profundo de proveedores

<AccordionGroup>
  <Accordion title="OpenAI gpt-image-2 (y gpt-image-1.5)">
    La generación de imágenes de OpenAI usa por defecto `openai/gpt-image-2`. Si se
    ha configurado un perfil OAuth de `openai-codex`, OpenClaw reutiliza el mismo
    perfil OAuth que usan los modelos de chat de suscripción Codex y envía la
    solicitud de imagen a través del backend de Codex Responses. Las URLs base
    heredadas de Codex, como `https://chatgpt.com/backend-api`, se canonifican a
    `https://chatgpt.com/backend-api/codex` para las solicitudes de imagen. OpenClaw
    **no** vuelve silenciosamente a `OPENAI_API_KEY` para esa solicitud; 
    para forzar el enrutamiento directo a la API de OpenAI Images, configure
    `models.providers.openai` explícitamente con una clave API, URL base personalizada
    o punto de conexión de Azure.

    Los modelos `openai/gpt-image-1.5`, `openai/gpt-image-1` y
    `openai/gpt-image-1-mini` todavía se pueden seleccionar explícitamente. Use
    `gpt-image-1.5` para obtener salida PNG/WebP con fondo transparente; la API
    actual de `gpt-image-2` rechaza `background: "transparent"`.

    `gpt-image-2` admite tanto la generación de texto a imagen como
    la edición de imágenes de referencia a través de la misma herramienta
    `image_generate`. OpenClaw reenvía `prompt`, `count`, `size`, `quality`, `outputFormat`
    e imágenes de referencia a OpenAI. OpenAI **no** recibe
    `aspectRatio` o `resolution` directamente; cuando es posible, OpenClaw las
    asigna a un `size` admitido; de lo contrario, la herramienta las reporta
    como anulaciones ignoradas.

    Las opciones específicas de OpenAI se encuentran en el objeto
    `openai`:

    ```json
    {
      "quality": "low",
      "outputFormat": "jpeg",
      "openai": {
        "background": "opaque",
        "moderation": "low",
        "outputCompression": 60,
        "user": "end-user-42"
      }
    }
    ```

    `openai.background` acepta `transparent`, `opaque` o `auto`;
    las salidas transparentes requieren `outputFormat` `png` o `webp` y un
    modelo de imagen de OpenAI con capacidad de transparencia. OpenClaw enruta
    las solicitudes de fondo transparente de `gpt-image-2` por defecto a
    `gpt-image-1.5`.
    `openai.outputCompression` se aplica a las salidas JPEG/WebP y se ignora
    para las salidas PNG.

    La sugerencia `background` de nivel superior es neutral al proveedor y actualmente se
    asigna al mismo campo de solicitud `background` de OpenAI cuando se selecciona el
    proveedor de OpenAI. Los proveedores que no declaran soporte para fondos lo
    devuelven en `ignoredOverrides` en lugar de recibir el parámetro no admitido.

    Para enrutar la generación de imágenes de OpenAI a través de un
    despliegue de Azure OpenAI en lugar de `api.openai.com`, consulte
    [Puntos de conexión de Azure OpenAI](/es/providers/openai#azure-openai-endpoints).

  </Accordion>
  <Accordion title="Modelos de imagen de OpenRouter">
    La generación de imágenes de OpenRouter utiliza el mismo `OPENROUTER_API_KEY` y
    se enruta a través de la API de imágenes de completaciones de chat de OpenRouter. Seleccione
    modelos de imagen de OpenRouter con el prefijo `openrouter/`:

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "openrouter/google/gemini-3.1-flash-image-preview",
          },
        },
      },
    }
    ```

    OpenClaw reenvía `prompt`, `count`, imágenes de referencia y
    sugerencias `aspectRatio` / `resolution` compatibles con Gemini a OpenRouter.
    Los atajos de modelos de imagen de OpenRouter integrados actualmente incluyen
    `google/gemini-3.1-flash-image-preview`,
    `google/gemini-3-pro-image-preview` y `openai/gpt-5.4-image-2`. Use
    `action: "list"` para ver qué expone su complemento configurado.

  </Accordion>
  <Accordion title="fal Krea 2">
    Los modelos Krea 2 en fal usan el esquema nativo de Krea de fal en lugar del esquema
    `image_size` genérico utilizado por Flux. OpenClaw envía:

    - `aspect_ratio` para sugerencias de relación de aspecto
    - `creativity`, con el valor predeterminado `medium`
    - `image_style_references` cuando se proporcionan `image` o `images`

    Seleccione Krea 2 Medium para ilustraciones expresivas más rápidas y Krea 2 Large
    para aspectos fotorrealistas y texturizados más lentos y detallados:

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "fal/krea/v2/medium/text-to-image",
          },
        },
      },
    }
    ```

    Krea 2 actualmente devuelve una imagen por solicitud. Prefiera `aspectRatio` para
    Krea; OpenClaw asigna `size` a la relación de aspecto Krea compatible más cercana y
    rechaza `resolution` para Krea en lugar de omitirla. Use `fal.creativity`
    cuando desee un nivel de creatividad nativo de Krea:

    ```json
    {
      "model": "fal/krea/v2/medium/text-to-image",
      "prompt": "A cyber zine portrait with risograph texture",
      "aspectRatio": "9:16",
      "fal": {
        "creativity": "high"
      }
    }
    ```

  </Accordion>
  <Accordion title="doble autenticación MiniMax">
    La generación de imágenes de MiniMax está disponible a través de ambas rutas de autenticación
    MiniMax incluidas:

    - `minimax/image-01` para configuraciones de clave de API
    - `minimax-portal/image-01` para configuraciones de OAuth

  </Accordion>
  <Accordion title="xAI grok-imagine-image">
    El proveedor xAI incluido usa `/v1/images/generations` para solicitudes
    solo con indicaciones y `/v1/images/edits` cuando `image` o `images` están presentes.

    - Modelos: `xai/grok-imagine-image`, `xai/grok-imagine-image-quality`
    - Cantidad: hasta 4
    - Referencias: una `image` o hasta cinco `images`
    - Relaciones de aspecto: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2:3`, `3:2`
    - Resoluciones: `1K`, `2K`
    - Salidas: devueltas como archivos adjuntos de imagen gestionados por OpenClaw

    OpenClaw intencionalmente no expone `quality`, `mask`,
    `user` nativos de xAI, ni relaciones de aspecto adicionales exclusivas nativas hasta que esos controles existan
    en el contrato compartido `image_generate` entre proveedores.

  </Accordion>
</AccordionGroup>

## Ejemplos

<Tabs>
  <Tab title="Generar (paisaje 4K)">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="A clean editorial poster for OpenClaw image generation" size=3840x2160 count=1
```
  </Tab>
  <Tab title="Generar (PNG transparente)">
```text
/tool image_generate action=generate model=openai/gpt-image-1.5 prompt="A simple red circle sticker on a transparent background" outputFormat=png background=transparent
```

CLI equivalente:

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

  </Tab>
  <Tab title="Generar (dos cuadradas)">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Two visual directions for a calm productivity app icon" size=1024x1024 count=2
```
  </Tab>
  <Tab title="Editar (una referencia)">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Keep the subject, replace the background with a bright studio setup" image=/path/to/reference.png size=1024x1536
```
  </Tab>
  <Tab title="Editar (múltiples referencias)">
```text
/tool image_generate action=generate model=openai/gpt-image-2 prompt="Combine the character identity from the first image with the color palette from the second" images='["/path/to/character.png","/path/to/palette.jpg"]' size=1536x1024
```
  </Tab>
  <Tab title="Referencias de estilo Krea">
```text
/tool image_generate action=generate model=fal/krea/v2/medium/text-to-image prompt="An expressive editorial portrait using this color palette and print texture" images='["/path/to/palette.png","/path/to/texture.jpg"]' aspectRatio=9:16 fal='{"creativity":"high"}'
```
  </Tab>
</Tabs>

Las mismas marcas `--output-format` y `--background` están disponibles en `openclaw infer image edit`; `--openai-background` permanece como un alias específico de OpenAI. Los proveedores integrados que no sean OpenAI no declaran hoy un control explícito en segundo plano, por lo que `background: "transparent"` se reporta como ignorado para ellos.

## Relacionado

- [Resumen de herramientas](/es/tools) - todas las herramientas de agente disponibles
- [ComfyUI](/es/providers/comfy) - configuración del flujo de trabajo local de ComfyUI y Comfy Cloud
- [fal](/es/providers/fal) - configuración del proveedor de imágenes y video de fal
- [Google (Gemini)](/es/providers/google) - configuración del proveedor de imágenes Gemini
- [MiniMax](/es/providers/minimax) - configuración del proveedor de imágenes MiniMax
- [OpenAI](/es/providers/openai) - configuración del proveedor OpenAI Images
- [Vydra](/es/providers/vydra) - configuración de Vydra para imágenes, video y voz
- [xAI](/es/providers/xai) - configuración de Grok para imágenes, video, búsqueda, ejecución de código y TTS
- [Referencia de configuración](/es/gateway/config-agents#agent-defaults) - configuración de `imageGenerationModel`
- [Modelos](/es/concepts/models) - configuración y conmutación por error de modelos
