---
summary: "Usar los modelos Grok de xAI en OpenClaw"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

# xAI

OpenClaw incluye un complemento de proveedor `xai` para los modelos Grok.

## Introducción

<Steps>
  <Step title="Crear una clave de API">
    Cree una clave de API en la [consola de xAI](https://console.x.ai/).
  </Step>
  <Step title="Configurar su clave de API">
    Configure `XAI_API_KEY`, o ejecute:

    ```bash
    openclaw onboard --auth-choice xai-api-key
    ```

  </Step>
  <Step title="Elegir un modelo">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4" } } },
    }
    ```
  </Step>
</Steps>

<Note>
  OpenClaw utiliza la API de Respuestas de xAI como el transporte xAI incluido. El mismo `XAI_API_KEY` también puede alimentar `web_search` con respaldo de Grok, `x_search` de primera clase, y `code_execution` remotos. Si almacena una clave de xAI en `plugins.entries.xai.config.webSearch.apiKey`, el proveedor de modelo xAI incluido también reutiliza esa clave como alternativa. El ajuste de
  `code_execution` se encuentra en `plugins.entries.xai.config.codeExecution`.
</Note>

## Catálogo de modelos incluidos

OpenClaw incluye estas familias de modelos xAI de fábrica:

| Familia        | IDs de modelo                                                            |
| -------------- | ------------------------------------------------------------------------ |
| Grok 3         | `grok-3`, `grok-3-fast`, `grok-3-mini`, `grok-3-mini-fast`               |
| Grok 4         | `grok-4`, `grok-4-0709`                                                  |
| Grok 4 Fast    | `grok-4-fast`, `grok-4-fast-non-reasoning`                               |
| Grok 4.1 Fast  | `grok-4-1-fast`, `grok-4-1-fast-non-reasoning`                           |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |
| Grok Code      | `grok-code-fast-1`                                                       |

El complemento también resuelve directamente los IDs más nuevos de `grok-4*` y `grok-code-fast*` cuando
siguen la misma forma de API.

<Tip>`grok-4-fast`, `grok-4-1-fast` y las variantes `grok-4.20-beta-*` son las referencias de Grok con capacidad de imagen actuales en el catálogo incluido.</Tip>

### Asignaciones de modo rápido

`/fast on` o `agents.defaults.models["xai/<model>"].params.fastMode: true`
reescribe las solicitudes nativas de xAI de la siguiente manera:

| Modelo de origen | Destino en modo rápido |
| ---------------- | ---------------------- |
| `grok-3`         | `grok-3-fast`          |
| `grok-3-mini`    | `grok-3-mini-fast`     |
| `grok-4`         | `grok-4-fast`          |
| `grok-4-0709`    | `grok-4-fast`          |

### Alias de compatibilidad heredados

Los alias heredados aún se normalizan a los ids agrupados canónicos:

| Alias heredado            | Id canónico                           |
| ------------------------- | ------------------------------------- |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## Características

<AccordionGroup>
  <Accordion title="Búsqueda web">
    El proveedor de búsqueda web `grok` agrupado también utiliza `XAI_API_KEY`:

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="Generación de video">
    El complemento `xai` agrupado registra la generación de video a través de la herramienta
    compartida `video_generate`.

    - Modelo de video predeterminado: `xai/grok-imagine-video`
    - Modos: texto a video, imagen a video, y flujos de edición/extensión de video remotos
    - Soporta `aspectRatio` y `resolution`

    <Warning>
    No se aceptan búfers de video locales. Use URLs `http(s)` remotas para
    entradas de referencia y edición de video.
    </Warning>

    Para usar xAI como el proveedor de video predeterminado:

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "xai/grok-imagine-video",
          },
        },
      },
    }
    ```

    <Note>
    Consulte [Video Generation](/es/tools/video-generation) para obtener parámetros de herramientas compartidas,
    selección de proveedor y comportamiento de conmutación por error.
    </Note>

  </Accordion>

  <Accordion title="configuración de x_search">
    El complemento xAI incluido expone `x_search` como una herramienta de OpenClaw para buscar
    contenido de X (anteriormente Twitter) mediante Grok.

    Ruta de configuración: `plugins.entries.xai.config.xSearch`

    | Key                | Type    | Default            | Description                          |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | —                  | Habilitar o deshabilitar x_search           |
    | `model`            | string  | `grok-4-1-fast`    | Modelo utilizado para solicitudes x_search     |
    | `inlineCitations`  | boolean | —                  | Incluir citas en línea en los resultados  |
    | `maxTurns`         | number  | —                  | Turnos máximos de conversación           |
    | `timeoutSeconds`   | number  | —                  | Tiempo de espera de solicitud en segundos           |
    | `cacheTtlMinutes`  | number  | —                  | Tiempo de vida de caché en minutos        |

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              xSearch: {
                enabled: true,
                model: "grok-4-1-fast",
                inlineCitations: true,
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Configuración de ejecución de código">
    El complemento xAI incluido expone `code_execution` como una herramienta de OpenClaw para
    la ejecución remota de código en el entorno sandbox de xAI.

    Ruta de configuración: `plugins.entries.xai.config.codeExecution`

    | Clave               | Tipo    | Predeterminado            | Descripción                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (si la clave está disponible) | Habilitar o deshabilitar la ejecución de código  |
    | `model`           | string  | `grok-4-1-fast`    | Modelo utilizado para solicitudes de ejecución de código   |
    | `maxTurns`        | number  | —                  | Turnos máximos de conversación               |
    | `timeoutSeconds`  | number  | —                  | Tiempo de espera de la solicitud en segundos               |

    <Note>
    Esto es ejecución remota en sandbox de xAI, no [`exec`](/es/tools/exec) local.
    </Note>

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              codeExecution: {
                enabled: true,
                model: "grok-4-1-fast",
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

<Accordion title="Límites conocidos">- La autenticación hoy es solo mediante clave de API. Todavía no hay flujo OAuth o código de dispositivo de xAI en OpenClaw. - `grok-4.20-multi-agent-experimental-beta-0304` no es compatible con la ruta de proveedor xAI normal porque requiere una superficie de API aguas arriba diferente que el transporte xAI estándar de OpenClaw.</Accordion>

  <Accordion title="Notas avanzadas">
    - OpenClaw aplica correcciones de compatibilidad específicas de xAI para el esquema de herramientas y llamadas a herramientas
      automáticamente en la ruta de ejecución compartida.
    - Las solicitudes nativas de xAI usan `tool_stream: true` de forma predeterminada. Establezca
      `agents.defaults.models["xai/<model>"].params.tool_stream` en `false` para
      desactivarlo.
    - El contenedor xAI incluido elimina las marcas no compatibles de esquema estricto de herramientas
      y las claves de carga útil de razonamiento antes de enviar solicitudes nativas de xAI.
    - `web_search`, `x_search` y `code_execution` se exponen como herramientas de
      OpenClaw. OpenClaw habilita la herramienta integrada específica de xAI que necesita dentro de cada solicitud de
      herramienta en lugar de adjuntar todas las herramientas nativas a cada turno de chat.
    - `x_search` y `code_execution` son propiedad del complemento xAI incluido en lugar
      de estar codificadas en el tiempo de ejecución del modelo principal.
    - `code_execution` es la ejecución remota del entorno sandbox de xAI, no local
      [`exec`](/es/tools/exec).
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elegir proveedores, referencias de modelo y comportamiento de conmutación por error.
  </Card>
  <Card title="Generación de video" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de video y selección de proveedor.
  </Card>
  <Card title="Todos los proveedores" href="/es/providers/index" icon="grid-2">
    La descripción general más amplia de proveedores.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="wrench">
    Problemas comunes y soluciones.
  </Card>
</CardGroup>
