---
summary: "Usar modelos MiniMax en OpenClaw"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

El proveedor MiniMax de OpenClaw utiliza por defecto **MiniMax M2.7**.

MiniMax también proporciona:

- síntesis de voz integrada a través de T2A v2
- comprensión de imágenes integrada a través de `MiniMax-VL-01`
- generación de música integrada a través de `music-2.5+`
- `web_search` integrado a través de la API de búsqueda de MiniMax Coding Plan

División del proveedor:

- `minimax`: proveedor de texto con clave de API, más generación de imágenes integrada, comprensión de imágenes, voz y búsqueda web
- `minimax-portal`: proveedor de texto OAuth, más generación de imágenes integrada y comprensión de imágenes

## Línea de modelos

- `MiniMax-M2.7`: modelo de razonamiento alojado por defecto.
- `MiniMax-M2.7-highspeed`: nivel de razonamiento M2.7 más rápido.
- `image-01`: modelo de generación de imágenes (generación y edición de imagen a imagen).

## Generación de imágenes

El complemento MiniMax registra el modelo `image-01` para la herramienta `image_generate`. Admite:

- **Generación de texto a imagen** con control de relación de aspecto.
- **Edición de imagen a imagen** (referencia de sujeto) con control de relación de aspecto.
- Hasta **9 imágenes de salida** por solicitud.
- Hasta **1 imagen de referencia** por solicitud de edición.
- Relaciones de aspecto compatibles: `1:1`, `16:9`, `4:3`, `3:2`, `2:3`, `3:4`, `9:16`, `21:9`.

Para usar MiniMax para la generación de imágenes, establézcalo como proveedor de generación de imágenes:

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "minimax/image-01" },
    },
  },
}
```

El complemento utiliza la misma autenticación `MINIMAX_API_KEY` u OAuth que los modelos de texto. No se necesita configuración adicional si MiniMax ya está configurado.

Tanto `minimax` como `minimax-portal` registran `image_generate` con el mismo
modelo `image-01`. Las configuraciones con clave de API usan `MINIMAX_API_KEY`; las configuraciones OAuth pueden usar
la ruta de autenticación `minimax-portal` integrada en su lugar.

Cuando el proceso de incorporación o la configuración de clave de API escribe entradas `models.providers.minimax`
explícitas, OpenClaw materializa `MiniMax-M2.7` y
`MiniMax-M2.7-highspeed` con `input: ["text", "image"]`.

El catálogo de texto de MiniMax incluido integrado permanece como metadatos solo de texto hasta que exista esa configuración de proveedor explícita. La comprensión de imágenes se expone por separado a través del proveedor de medios `MiniMax-VL-01` propiedad del complemento.

Consulte [Generación de imágenes](/en/tools/image-generation) para conocer los parámetros de la herramienta compartida, la selección del proveedor y el comportamiento de conmutación por error.

## Generación de música

El complemento `minimax` incluido también registra la generación de música a través de la herramienta `music_generate` compartida.

- Modelo de música predeterminado: `minimax/music-2.5+`
- También admite `minimax/music-2.5` y `minimax/music-2.0`
- Controles de solicitud: `lyrics`, `instrumental`, `durationSeconds`
- Formato de salida: `mp3`
- Las ejecuciones respaldadas por sesión se desacoplan a través del flujo de tareas/estado compartido, incluyendo `action: "status"`

Para usar MiniMax como proveedor de música predeterminado:

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "minimax/music-2.5+",
      },
    },
  },
}
```

Consulte [Generación de música](/en/tools/music-generation) para conocer los parámetros de la herramienta compartida, la selección del proveedor y el comportamiento de conmutación por error.

## Generación de video

El complemento `minimax` incluido también registra la generación de video a través de la herramienta `video_generate` compartida.

- Modelo de video predeterminado: `minimax/MiniMax-Hailuo-2.3`
- Modos: flujos de texto a video y de referencia de imagen única
- Admite `aspectRatio` y `resolution`

Para usar MiniMax como proveedor de video predeterminado:

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "minimax/MiniMax-Hailuo-2.3",
      },
    },
  },
}
```

Consulte [Generación de video](/en/tools/video-generation) para conocer los parámetros de la herramienta compartida, la selección del proveedor y el comportamiento de conmutación por error.

## Comprensión de imágenes

El complemento MiniMax registra la comprensión de imágenes por separado del catálogo
de texto:

- `minimax`: modelo de imagen predeterminado `MiniMax-VL-01`
- `minimax-portal`: modelo de imagen predeterminado `MiniMax-VL-01`

Es por eso que el enrutamiento automático de medios puede usar el reconocimiento de imágenes de MiniMax incluso
cuando el catálogo del proveedor de texto incluido todavía muestra referencias de chat M2.7 solo de texto.

## Búsqueda web

El complemento MiniMax también registra `web_search` a través de la API de búsqueda
de MiniMax Coding Plan.

- ID del proveedor: `minimax`
- Resultados estructurados: títulos, URL, fragmentos, consultas relacionadas
- Variable de entorno preferida: `MINIMAX_CODE_PLAN_KEY`
- Alias de entorno aceptado: `MINIMAX_CODING_API_KEY`
- Alternativa de compatibilidad: `MINIMAX_API_KEY` cuando ya apunta a un token de plan de código
- Reutilización de región: `plugins.entries.minimax.config.webSearch.region`, luego `MINIMAX_API_HOST`, luego las URL base del proveedor MiniMax
- La búsqueda se mantiene en el ID de proveedor `minimax`; la configuración de OAuth CN/global aún puede dirigir la región indirectamente a través de `models.providers.minimax-portal.baseUrl`

La configuración se encuentra en `plugins.entries.minimax.config.webSearch.*`.
Consulte [MiniMax Search](/en/tools/minimax-search).

## Elija una configuración

### MiniMax OAuth (Coding Plan) - recomendado

**Lo mejor para:** configuración rápida con MiniMax Coding Plan a través de OAuth, no se requiere clave de API.

Autentíquese con la elección explícita de OAuth regional:

```bash
openclaw onboard --auth-choice minimax-global-oauth
# or
openclaw onboard --auth-choice minimax-cn-oauth
```

Asignación de opciones:

- `minimax-global-oauth`: Usuarios internacionales (`api.minimax.io`)
- `minimax-cn-oauth`: Usuarios en China (`api.minimaxi.com`)

Consulte el archivo README del paquete del complemento MiniMax en el repositorio de OpenClaw para obtener más detalles.

### MiniMax M2.7 (clave de API)

**Lo mejor para:** MiniMax alojado con API compatible con Anthropic.

Configurar a través de CLI:

- Incorporación interactiva:

```bash
openclaw onboard --auth-choice minimax-global-api
# or
openclaw onboard --auth-choice minimax-cn-api
```

- `minimax-global-api`: Usuarios internacionales (`api.minimax.io`)
- `minimax-cn-api`: Usuarios en China (`api.minimaxi.com`)

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "minimax/MiniMax-M2.7" } } },
  models: {
    mode: "merge",
    providers: {
      minimax: {
        baseUrl: "https://api.minimax.io/anthropic",
        apiKey: "${MINIMAX_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "MiniMax-M2.7",
            name: "MiniMax M2.7",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
            contextWindow: 204800,
            maxTokens: 131072,
          },
          {
            id: "MiniMax-M2.7-highspeed",
            name: "MiniMax M2.7 Highspeed",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0.6, output: 2.4, cacheRead: 0.06, cacheWrite: 0.375 },
            contextWindow: 204800,
            maxTokens: 131072,
          },
        ],
      },
    },
  },
}
```

En la ruta de transmisión compatible con Anthropic, OpenClaw ahora deshabilita el pensamiento de MiniMax
de forma predeterminada a menos que usted configure explícitamente `thinking` usted mismo. El punto final de transmisión de MiniMax emite `reasoning_content` en fragmentos delta de estilo OpenAI
en lugar de bloques de pensamiento nativos de Anthropic, lo que puede filtrar el razonamiento interno
en la salida visible si se deja habilitado implícitamente.

### MiniMax M2.7 como alternativa (ejemplo)

**Mejor para:** mantener tu modelo más potente de última generación como principal, cambiar a MiniMax M2.7 como alternativa.
El siguiente ejemplo usa Opus como principal concreto; cámbialo por tu modelo principal de última generación preferido.

```json5
{
  env: { MINIMAX_API_KEY: "sk-..." },
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "primary" },
        "minimax/MiniMax-M2.7": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.7"],
      },
    },
  },
}
```

## Configurar mediante `openclaw configure`

Usa el asistente de configuración interactivo para configurar MiniMax sin editar JSON:

1. Ejecuta `openclaw configure`.
2. Selecciona **Modelo/autenticación**.
3. Elige una opción de autenticación de **MiniMax**.
4. Elige tu modelo predeterminado cuando se te solicite.

Opciones actuales de autenticación de MiniMax en el asistente/CLI:

- `minimax-global-oauth`
- `minimax-cn-oauth`
- `minimax-global-api`
- `minimax-cn-api`

## Opciones de configuración

- `models.providers.minimax.baseUrl`: preferir `https://api.minimax.io/anthropic` (compatible con Anthropic); `https://api.minimax.io/v1` es opcional para cargas útiles compatibles con OpenAI.
- `models.providers.minimax.api`: preferir `anthropic-messages`; `openai-completions` es opcional para cargas útiles compatibles con OpenAI.
- `models.providers.minimax.apiKey`: clave API de MiniMax (`MINIMAX_API_KEY`).
- `models.providers.minimax.models`: definir `id`, `name`, `reasoning`, `contextWindow`, `maxTokens`, `cost`.
- `agents.defaults.models`: asignar alias a los modelos que desees en la lista de permitidos.
- `models.mode`: mantener `merge` si deseas añadir MiniMax junto con los integrados.

## Notas

- Las referencias de modelos siguen la ruta de autenticación:
  - Configuración con clave API: `minimax/<model>`
  - Configuración con OAuth: `minimax-portal/<model>`
- Modelo de chat predeterminado: `MiniMax-M2.7`
- Modelo de chat alternativo: `MiniMax-M2.7-highspeed`
- En `api: "anthropic-messages"`, OpenClaw inyecta
  `thinking: { type: "disabled" }` a menos que el pensamiento ya esté establecido explícitamente en
  los parámetros/configuración.
- `/fast on` o `params.fastMode: true` reescribe `MiniMax-M2.7` a
  `MiniMax-M2.7-highspeed` en la ruta de transmisión compatible con Anthropic.
- La incorporación y la configuración directa de clave de API escriben definiciones de modelo explícitas con
  `input: ["text", "image"]` para ambas variantes de M2.7
- El catálogo de proveedores agrupado actualmente expone las referencias de chat como metadatos
  solo de texto hasta que exista una configuración explícita del proveedor MiniMax
- API de uso del Coding Plan: `https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (requiere una clave de coding plan).
- OpenClaw normaliza el uso del coding plan de MiniMax a la misma pantalla `% left`
  utilizada por otros proveedores. Los campos `usage_percent` / `usagePercent`
  originales de MiniMax son cuota restante, no cuota consumida, por lo que OpenClaw los invierte.
  Los campos basados en conteo tienen prioridad cuando están presentes. Cuando la API devuelve `model_remains`,
  OpenClaw prefiere la entrada del modelo de chat, deriva la etiqueta de la ventana de
  `start_time` / `end_time` cuando es necesario, e incluye el nombre del modelo seleccionado
  en la etiqueta del plan para que las ventanas del coding plan sean más fáciles de distinguir.
- Las instantáneas de uso tratan `minimax`, `minimax-cn` y `minimax-portal` como la
  misma superficie de cuota de MiniMax, y prefieren el OAuth de MiniMax almacenado antes de recurrir
  a las variables de entorno de clave del Coding Plan.
- Actualice los valores de precios en `models.json` si necesita un seguimiento de costos exacto.
- Enlace de referencia para el Coding Plan de MiniMax (10% de descuento): [https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
- Consulte [/concepts/model-providers](/en/concepts/model-providers) para obtener las reglas del proveedor.
- Use `openclaw models list` para confirmar el ID del proveedor actual, luego cambie con
  `openclaw models set minimax/MiniMax-M2.7` o
  `openclaw models set minimax-portal/MiniMax-M2.7`.

## Solución de problemas

### "Modelo desconocido: minimax/MiniMax-M2.7"

Esto generalmente significa que **el proveedor MiniMax no está configurado** (no se encontró
ninguna entrada de proveedor coincidente ni ninguna clave de perfil/env de autenticación de MiniMax). Una corrección para esta
detección está en **2026.1.12**. Solución mediante:

- Actualizando a **2026.1.12** (o ejecutando desde la fuente `main`), luego reiniciando la puerta de enlace.
- Ejecutando `openclaw configure` y seleccionando una opción de autenticación **MiniMax**, o
- Agregando el bloque `models.providers.minimax` o
  `models.providers.minimax-portal` coincidente manualmente, o
- Configurando `MINIMAX_API_KEY`, `MINIMAX_OAUTH_TOKEN` o un perfil de autenticación de MiniMax
  para que se pueda inyectar el proveedor coincidente.

Asegúrese de que el id del modelo sea **sensible a mayúsculas y minúsculas**:

- Ruta de clave de API: `minimax/MiniMax-M2.7` o `minimax/MiniMax-M2.7-highspeed`
- Ruta OAuth: `minimax-portal/MiniMax-M2.7` o
  `minimax-portal/MiniMax-M2.7-highspeed`

Luego verifique de nuevo con:

```bash
openclaw models list
```
