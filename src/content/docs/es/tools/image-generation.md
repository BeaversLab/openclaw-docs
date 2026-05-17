---
summary: "Genera y edita imágenes a través de image_generate en OpenAI, Google, fal, MiniMax, ComfyUI, DeepInfra, OpenRouter, LiteLLM, xAI, Vydra"
read_when:
  - Generating or editing images via the agent
  - Configuring image-generation providers and models
  - Understanding the image_generate tool parameters
title: "Generación de imágenes"
sidebarTitle: "Generación de imágenes"
---

La herramienta `image_generate` permite al agente crear y editar imágenes utilizando tus
proveedores configurados. Las imágenes generadas se entregan automáticamente como archivos adjuntos de medios
en la respuesta del agente.

<Note>La herramienta solo aparece cuando al menos un proveedor de generación de imágenes está disponible. Si no ves `image_generate` en las herramientas de tu agente, configura `agents.defaults.imageGenerationModel`, configura una clave de API del proveedor, o inicia sesión con OpenAI Codex OAuth.</Note>

## Inicio rápido

<Steps>
  <Step title="Configurar autenticación">
    Establece una clave de API para al menos un proveedor (por ejemplo `OPENAI_API_KEY`,
    `GEMINI_API_KEY`, `OPENROUTER_API_KEY`) o inicia sesión con OpenAI Codex OAuth.
  </Step>
  <Step title="Elige un modelo predeterminado (opcional)">
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
    configura un perfil OAuth `openai-codex`, OpenClaw enruta las solicitudes de
    imágenes a través de ese perfil OAuth en lugar de intentar primero con
    `OPENAI_API_KEY`. La configuración explícita de `models.providers.openai` (clave de API,
    URL base personalizada/Azure) vuelve a la ruta directa de la API de OpenAI Images.

  </Step>
  <Step title="Pídele al agente">
    _"Genera una imagen de una mascota robot amigable."_

    El agente llama a `image_generate` automáticamente. No es necesario permitir la herramienta
    explícitamente: está habilitada por defecto cuando hay un proveedor disponible.

  </Step>
</Steps>

<Warning>Para endpoints de LAN compatibles con OpenAI como LocalAI, mantén el `models.providers.openai.baseUrl` personalizado y opta explícitamente con `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`. Los endpoints de imágenes privados y internos siguen bloqueados de forma predeterminada.</Warning>

## Rutas comunes

| Objetivo                                                                  | Referencia del modelo                              | Autenticación                         |
| ------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------- |
| Generación de imágenes de OpenAI con facturación de API                   | `openai/gpt-image-2`                               | `OPENAI_API_KEY`                      |
| Generación de imágenes de OpenAI con autenticación de suscripción a Codex | `openai/gpt-image-2`                               | OpenAI Codex OAuth                    |
| OpenAI PNG/WebP con fondo transparente                                    | `openai/gpt-image-1.5`                             | `OPENAI_API_KEY` u OpenAI Codex OAuth |
| Generación de imágenes DeepInfra                                          | `deepinfra/black-forest-labs/FLUX-1-schnell`       | `DEEPINFRA_API_KEY`                   |
| Generación de imágenes OpenRouter                                         | `openrouter/google/gemini-3.1-flash-image-preview` | `OPENROUTER_API_KEY`                  |
| Generación de imágenes LiteLLM                                            | `litellm/gpt-image-2`                              | `LITELLM_API_KEY`                     |
| Generación de imágenes Google Gemini                                      | `google/gemini-3.1-flash-image-preview`            | `GEMINI_API_KEY` o `GOOGLE_API_KEY`   |

La misma herramienta `image_generate` se encarga de la edición de texto a imagen y de referencia de imagen.
Usa `image` para una referencia o `images` para múltiples referencias.
Las sugerencias de salida compatibles con el proveedor, como `quality`, `outputFormat` y
`background`, se reenvían cuando están disponibles y se reportan como ignoradas cuando un
proveedor no las admite. La compatibilidad con fondos transparentes integrada es
específica de OpenAI; otros proveedores aún pueden preservar el alfa PNG si su
infraestructura lo emite.

## Proveedores compatibles

| Proveedor  | Modelo predeterminado                   | Soporte de edición                              | Autenticación                                        |
| ---------- | --------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| ComfyUI    | `workflow`                              | Sí (1 imagen, configurado por flujo de trabajo) | `COMFY_API_KEY` o `COMFY_CLOUD_API_KEY` para la nube |
| DeepInfra  | `black-forest-labs/FLUX-1-schnell`      | Sí (1 imagen)                                   | `DEEPINFRA_API_KEY`                                  |
| fal        | `fal-ai/flux/dev`                       | Sí (límites específicos del modelo)             | `FAL_KEY`                                            |
| Google     | `gemini-3.1-flash-image-preview`        | Sí                                              | `GEMINI_API_KEY` o `GOOGLE_API_KEY`                  |
| LiteLLM    | `gpt-image-2`                           | Sí (hasta 5 imágenes de entrada)                | `LITELLM_API_KEY`                                    |
| MiniMax    | `image-01`                              | Sí (referencia del sujeto)                      | `MINIMAX_API_KEY` o MiniMax OAuth (`minimax-portal`) |
| OpenAI     | `gpt-image-2`                           | Sí (hasta 4 imágenes)                           | `OPENAI_API_KEY` u OpenAI Codex OAuth                |
| OpenRouter | `google/gemini-3.1-flash-image-preview` | Sí (hasta 5 imágenes de entrada)                | `OPENROUTER_API_KEY`                                 |
| Vydra      | `grok-imagine`                          | No                                              | `VYDRA_API_KEY`                                      |
| xAI        | `grok-imagine-image`                    | Sí (hasta 5 imágenes)                           | `XAI_API_KEY`                                        |

Use `action: "list"` para inspeccionar los proveedores y modelos disponibles en tiempo de ejecución:

```text
/tool image_generate action=list
```

## Capacidades del proveedor

| Capacidad                 | ComfyUI                       | DeepInfra | fal                       | Google           | MiniMax                         | OpenAI           | Vydra | xAI              |
| ------------------------- | ----------------------------- | --------- | ------------------------- | ---------------- | ------------------------------- | ---------------- | ----- | ---------------- |
| Generar (cantidad máxima) | Definido por flujo de trabajo | 4         | 4                         | 4                | 9                               | 4                | 1     | 4                |
| Editar / referencia       | 1 imagen (flujo de trabajo)   | 1 imagen  | Flux: 1; GPT: 10; NB2: 14 | Hasta 5 imágenes | 1 imagen (referencia de sujeto) | Hasta 5 imágenes | -     | Hasta 5 imágenes |
| Control de tamaño         | -                             | ✓         | ✓                         | ✓                | -                               | Hasta 4K         | -     | -                |
| Relación de aspecto       | -                             | -         | ✓                         | ✓                | ✓                               | -                | -     | ✓                |
| Resolución (1K/2K/4K)     | -                             | -         | ✓                         | ✓                | -                               | -                | -     | 1K, 2K           |

## Parámetros de la herramienta

<ParamField path="prompt" type="string" required>
  Prompt de generación de imágenes. Requerido para `action: "generate"`.
</ParamField>
<ParamField path="action" type='"generate" | "list"' default="generate">
  Use `"list"` para inspeccionar los proveedores y modelos disponibles en tiempo de ejecución.
</ParamField>
<ParamField path="model" type="string">
  Sobrescritura de proveedor/modelo (p. ej., `openai/gpt-image-2`). Use `openai/gpt-image-1.5` para fondos transparentes de OpenAI.
</ParamField>
<ParamField path="image" type="string">
  Ruta de imagen de referencia única o URL para el modo de edición.
</ParamField>
<ParamField path="images" type="string[]">
  Múltiples imágenes de referencia para el modo de edición (hasta 5 en proveedores compatibles).
</ParamField>
<ParamField path="size" type="string">
  Sugerencia de tamaño: `1024x1024`, `1536x1024`, `1024x1536`, `2048x2048`, `3840x2160`.
</ParamField>
<ParamField path="aspectRatio" type="string">
  Relación de aspecto: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`.
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
  Tiempo de espera opcional de la solicitud del proveedor en milisegundos. Cuando Codex llama a `image_generate` a través de herramientas dinámicas, este valor por llamada aún anula el valor predeterminado configurado y está limitado a 600000 ms.
</ParamField>
<ParamField path="filename" type="string">
  Sugerencia de nombre de archivo de salida.
</ParamField>
<ParamField path="openai" type="object">
  Sugerencias exclusivas de OpenAI: `background`, `moderation`, `outputCompression` y `user`.
</ParamField>

<Note>
  No todos los proveedores admiten todos los parámetros. Cuando un proveedor de respaldo admite una opción de geometría cercana en lugar de la solicitada exactamente, OpenClaw reasigna a la dimensión, relación de aspecto o resolución compatible más cercana antes del envío. Las sugerencias de salida no admitidas se omiten para los proveedores que no declaran soporte y se informan en el resultado de
  la herramienta. Los resultados de la herramienta informan de la configuración aplicada; `details.normalization` captura cualquier traducción de solicitado a aplicado.
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

OpenClaw intenta los proveedores en este orden:

1. **Parámetro `model`** de la llamada a la herramienta (si el agente especifica uno).
2. **`imageGenerationModel.primary`** de la configuración.
3. **`imageGenerationModel.fallbacks`** en orden.
4. **Detección automática**: solo valores predeterminados de proveedores con autenticación:
   - primero el proveedor predeterminado actual;
   - proveedores de generación de imágenes registrados restantes en orden de ID de proveedor.

Si un proveedor falla (error de autenticación, límite de velocidad, etc.), el siguiente candidato
configurado se intenta automáticamente. Si todos fallan, el error incluye detalles
de cada intento.

<AccordionGroup>
  <Accordion title="Las anulaciones de modelo por llamada son exactas">Una anulación de `model` por llamada intenta solo ese proveedor/modelo y no continúa con los proveedores configurados principales/de respaldo o detectados automáticamente.</Accordion>
  <Accordion title="La detección automática es consciente de la autenticación">Un valor predeterminado de proveedor solo entra en la lista de candidatos cuando OpenClaw puede autenticar realmente ese proveedor. Establezca `agents.defaults.mediaGenerationAutoProviderFallback: false` para usar solo entradas explícitas de `model`, `primary` y `fallbacks`.</Accordion>
  <Accordion title="Tiempos de espera">
    Establezca `agents.defaults.imageGenerationModel.timeoutMs` para backends de imágenes lentos. Un parámetro de herramienta `timeoutMs` por llamada anula el valor predeterminado configurado. Las llamadas a herramientas dinámicas de Codex respetan el mismo presupuesto de tiempo de espera, limitado por el máximo de 600000 ms del puente de herramientas dinámicas de OpenClaw.
  </Accordion>
  <Accordion title="Inspect at runtime">Use `action: "list"` para inspeccionar los proveedores registrados actualmente, sus modelos predeterminados y sugerencias de variables de entorno de autenticación.</Accordion>
</AccordionGroup>

### Edición de imágenes

OpenAI, OpenRouter, Google, DeepInfra, fal, MiniMax, ComfyUI y xAI admiten la edición
de imágenes de referencia. Pase una ruta o URL de imagen de referencia:

```text
"Generate a watercolor version of this photo" + image: "/path/to/photo.jpg"
```

OpenAI, OpenRouter, Google y xAI admiten hasta 5 imágenes de referencia a través del parámetro `images`. fal admite 1 imagen de referencia para Flux de imagen a imagen, hasta 10 para ediciones de GPT Image 2 y hasta 14 para ediciones de Nano Banana 2. MiniMax y ComfyUI admiten 1.

## Análisis detallados de proveedores

<AccordionGroup>
  <Accordion title="OpenAI gpt-image-2 (y gpt-image-1.5)">
    La generación de imágenes de OpenAI usa por defecto `openai/gpt-image-2`. Si
    se ha configurado un perfil OAuth de `openai-codex`, OpenClaw reutiliza el mismo
    perfil OAuth que usan los modelos de chat de suscripción Codex y envía la
    solicitud de imagen a través del backend de Codex Responses. Las URL base
    heredadas de Codex, como `https://chatgpt.com/backend-api`, se canonicalizan a
    `https://chatgpt.com/backend-api/codex` para las solicitudes de imagen. OpenClaw
    **no** realiza una reserva silenciosa (fallback) a `OPENAI_API_KEY` para esa solicitud -
    para forzar el enrutamiento directo a la API de OpenAI Images, configure
    `models.providers.openai` explícitamente con una clave de API, URL base personalizada,
    o endpoint de Azure.

    Los modelos `openai/gpt-image-1.5`, `openai/gpt-image-1` y
    `openai/gpt-image-1-mini` todavía se pueden seleccionar explícitamente. Use
    `gpt-image-1.5` para obtener una salida PNG/WebP con fondo transparente; la API
    `gpt-image-2` actual rechaza `background: "transparent"`.

    `gpt-image-2` admite tanto la generación de texto a imagen como la
    edición de imágenes de referencia a través de la misma herramienta `image_generate`.
    OpenClaw reenvía `prompt`, `count`, `size`, `quality`, `outputFormat`
    e imágenes de referencia a OpenAI. OpenAI **no** recibe
    `aspectRatio` o `resolution` directamente; cuando es posible, OpenClaw las
    asigna a un `size` admitido; de lo contrario, la herramienta las informa como
    anulaciones ignoradas.

    Las opciones específicas de OpenAI se encuentran en el objeto `openai`:

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
    modelo de imagen de OpenAI con capacidad de transparencia. OpenClaw enruta las
    solicitudes predeterminadas con fondo transparente de `gpt-image-2` a `gpt-image-1.5`.
    `openai.outputCompression` se aplica a las salidas JPEG/WebP.

    La sugerencia `background` de nivel superior es neutral para el proveedor y actualmente se asigna
    al mismo campo de solicitud `background` de OpenAI cuando se selecciona el proveedor
    OpenAI. Los proveedores que no declaran compatibilidad con el fondo lo devuelven
    en `ignoredOverrides` en lugar de recibir el parámetro no admitido.

    Para enrutar la generación de imágenes de OpenAI a través de un despliegue
    de Azure OpenAI en lugar de `api.openai.com`, consulte
    [Azure OpenAI endpoints](/es/providers/openai#azure-openai-endpoints).

  </Accordion>
  <Accordion title="OpenRouter image models">
    La generación de imágenes de OpenRouter utiliza el mismo `OPENROUTER_API_KEY` y
    se enruta a través de la API de imágenes de completado de chat de OpenRouter. Seleccione
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
    Los atajos de modelos de imagen de OpenRouter integrados actuales incluyen
    `google/gemini-3.1-flash-image-preview`,
    `google/gemini-3-pro-image-preview` y `openai/gpt-5.4-image-2`. Use
    `action: "list"` para ver qué expone su complemento configurado.

  </Accordion>
  <Accordion title="MiniMax dual-auth">
    La generación de imágenes de MiniMax está disponible a través de ambas rutas de
    autenticación de MiniMax incluidas:

    - `minimax/image-01` para configuraciones con clave de API
    - `minimax-portal/image-01` para configuraciones de OAuth

  </Accordion>
  <Accordion title="xAI grok-imagine-image">
    El proveedor xAI incluido utiliza `/v1/images/generations` para solicitudes
    solo con instrucciones y `/v1/images/edits` cuando `image` o `images` están presentes.

    - Modelos: `xai/grok-imagine-image`, `xai/grok-imagine-image-pro`
    - Cantidad: hasta 4
    - Referencias: una `image` o hasta cinco `images`
    - Relación de aspecto: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2:3`, `3:2`
    - Resoluciones: `1K`, `2K`
    - Salidas: se devuelven como archivos adjuntos de imagen gestionados por OpenClaw

    OpenClaw intencionalmente no expone los controles nativos de xAI `quality`, `mask`,
    `user`, ni relaciones de aspecto adicionales exclusivas hasta que esos controles existan
    en el contrato compartido entre proveedores `image_generate`.

  </Accordion>
</AccordionGroup>

## Ejemplos

<Tabs>
  <Tab title="Generar (panorámica 4K)">
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
</Tabs>

Las mismas opciones `--output-format` y `--background` están disponibles en
`openclaw infer image edit`; `--openai-background` sigue siendo un
alias específico de OpenAI. Los proveedores integrados que no sean OpenAI no declaran
control explícito del fondo hoy en día, por lo que se informa que `background: "transparent"` se
ignora para ellos.

## Relacionado

- [Resumen de herramientas](/es/tools) - todas las herramientas del agente disponibles
- [ComfyUI](/es/providers/comfy) - configuración del flujo de trabajo local de ComfyUI y Comfy Cloud
- [fal](/es/providers/fal) - configuración del proveedor de imágenes y videos de fal
- [Google (Gemini)](/es/providers/google) - configuración del proveedor de imágenes Gemini
- [MiniMax](/es/providers/minimax) - configuración del proveedor de imágenes MiniMax
- [OpenAI](/es/providers/openai) - configuración del proveedor de imágenes OpenAI
- [Vydra](/es/providers/vydra) - configuración de Vydra para imágenes, videos y voz
- [xAI](/es/providers/xai) - configuración de Grok para imágenes, videos, búsqueda, ejecución de código y TTS
- [Referencia de configuración](/es/gateway/config-agents#agent-defaults) - configuración de `imageGenerationModel`
- [Modelos](/es/concepts/models) - configuración y conmutación por error de modelos
