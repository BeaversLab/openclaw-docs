---
summary: "Configuración de generación de video de PixVerse en OpenClaw"
title: "PixVerse"
read_when:
  - You want to use PixVerse video generation in OpenClaw
  - You need the PixVerse API key/env setup
  - You want to make PixVerse the default video provider
---

OpenClaw proporciona `pixverse` como un complemento externo oficial para la generación de video alojada de PixVerse. El complemento registra el proveedor `pixverse` contra el contrato `videoGenerationProviders`.

| Propiedad                            | Valor                                                                |
| ------------------------------------ | -------------------------------------------------------------------- |
| ID del proveedor                     | `pixverse`                                                           |
| Paquete del complemento              | `@openclaw/pixverse-provider`                                        |
| Variable de entorno de autenticación | `PIXVERSE_API_KEY`                                                   |
| Indicador de incorporación           | `--auth-choice pixverse-api-key`                                     |
| Indicador directo de CLI             | `--pixverse-api-key <key>`                                           |
| API                                  | PixVerse Platform API v2 (envío `video_id` más sondeo de resultados) |
| Modelo predeterminado                | `pixverse/v6`                                                        |
| Región de API predeterminada         | Internacional                                                        |

## Introducción

<Steps>
  <Step title="Instalar el complemento">
    ```bash
    openclaw plugins install clawhub:@openclaw/pixverse-provider
    openclaw gateway restart
    ```
  </Step>
  <Step title="Establecer la clave de API">
    ```bash
    openclaw onboard --auth-choice pixverse-api-key
    ```

    El asistente pregunta si se debe utilizar el punto de conexión Internacional
    (`https://app-api.pixverse.ai/openapi/v2`) o el punto de conexión CN
    (`https://app-api.pixverseai.cn/openapi/v2`) antes de escribir `region` y
    `baseUrl` en la configuración del proveedor.

  </Step>
  <Step title="Establecer PixVerse como el proveedor de video predeterminado">
    ```bash
    openclaw config set agents.defaults.videoGenerationModel.primary "pixverse/v6"
    ```
  </Step>
  <Step title="Generar un video">
    Pídele al agente que genere un video. PixVerse se utilizará automáticamente.
  </Step>
</Steps>

## Modos y modelos compatibles

El proveedor expone los modelos de generación de PixVerse a través de la herramienta de video compartida de OpenClaw.

| Modo           | Modelos                     | Entrada de referencia   |
| -------------- | --------------------------- | ----------------------- |
| Texto a video  | `v6` (predeterminado), `c1` | Ninguna                 |
| Imagen a video | `v6` (predeterminado), `c1` | 1 imagen local o remota |

Las referencias de imágenes locales se cargan en PixVerse antes de la solicitud de imagen a video. Las URL de imágenes remotas se pasan a través del punto final de carga de imágenes de PixVerse como `image_url`.

| Opción              | Valores admitidos                                                            |
| ------------------- | ---------------------------------------------------------------------------- |
| Duración            | 1-15 segundos                                                                |
| Resolución          | `360P`, `540P`, `720P`, `1080P`                                              |
| Relación de aspecto | `16:9`, `4:3`, `1:1`, `3:4`, `9:16`, `2:3`, `3:2`, `21:9` para texto a video |
| Audio generado      | `audio: true`                                                                |

<Note>La generación de plantillas de imágenes de PixVerse aún no está expuesta a través de `image_generate`. Esa API se basa en el ID de plantilla, mientras que el contrato compartido de generación de imágenes de OpenClaw actualmente no tiene un conjunto de opciones tipado específico para PixVerse.</Note>

## Opciones del proveedor

El proveedor de video acepta estas claves opcionales específicas del proveedor:

| Opción                               | Tipo   | Efecto                                        |
| ------------------------------------ | ------ | --------------------------------------------- |
| `seed`                               | número | Semilla determinista cuando se admite         |
| `negativePrompt` / `negative_prompt` | cadena | Prompt negativo                               |
| `quality`                            | cadena | Calidad de PixVerse como `720p`               |
| `motionMode` / `motion_mode`         | cadena | Modo de movimiento de imagen a video          |
| `cameraMovement` / `camera_movement` | cadena | Preajuste de movimiento de cámara de PixVerse |
| `templateId` / `template_id`         | número | ID de plantilla de PixVerse activada          |

## Configuración

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "pixverse/v6",
      },
    },
  },
}
```

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Región de API">
    OpenClaw utiliza por defecto la API internacional de PixVerse. Establezca `models.providers.pixverse.region`
    manualmente cuando su clave pertenezca a una región específica de la plataforma PixVerse, o utilice
    `openclaw onboard --auth-choice pixverse-api-key` para elegir una en el asistente de configuración:

    | Valor de región    | URL base de la API de PixVerse                         |
    | --------------- | --------------------------------------------- |
    | `international` | `https://app-api.pixverse.ai/openapi/v2`      |
    | `cn`            | `https://app-api.pixverseai.cn/openapi/v2`    |

    ```json5
    {
      models: {
        providers: {
          pixverse: {
            region: "cn", // "international" or "cn"
            baseUrl: "https://app-api.pixverseai.cn/openapi/v2",
            models: [],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="URL base personalizada">
    Establezca `models.providers.pixverse.baseUrl` solo cuando se enrute a través de un proxy compatible de confianza.
    `baseUrl` tiene prioridad sobre `region`.

    ```json5
    {
      models: {
        providers: {
          pixverse: {
            baseUrl: "https://app-api.pixverse.ai/openapi/v2",
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Sondeo de tareas">
    PixVerse devuelve un `video_id` desde la solicitud de generación. OpenClaw sondea
    `/openapi/v2/video/result/{video_id}` hasta que la tarea tiene éxito, falla
    o expira.
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Generación de video" href="/es/tools/video-generation" icon="video">
    Parámetros de herramienta compartidos, selección de proveedor y comportamiento asíncrono.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/config-agents#agent-defaults" icon="gear">
    Configuración predeterminada del agente, incluido el modelo de generación de video.
  </Card>
</CardGroup>
