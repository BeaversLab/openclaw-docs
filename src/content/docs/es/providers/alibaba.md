---
title: "Alibaba Model Studio"
summary: "Generación de video Wan de Alibaba Model Studio en OpenClaw"
read_when:
  - You want to use Alibaba Wan video generation in OpenClaw
  - You need Model Studio or DashScope API key setup for video generation
---

# Alibaba Model Studio

OpenClaw incluye un proveedor de `alibaba` generación de video para modelos Wan en
Alibaba Model Studio / DashScope.

- Proveedor: `alibaba`
- Autenticación preferida: `MODELSTUDIO_API_KEY`
- También aceptado: `DASHSCOPE_API_KEY`, `QWEN_API_KEY`
- API: Generación de video asíncrona de DashScope / Model Studio

## Primeros pasos

<Steps>
  <Step title="Set an API key">
    ```bash
    openclaw onboard --auth-choice qwen-standard-api-key
    ```
  </Step>
  <Step title="Set a default video model">
    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "alibaba/wan2.6-t2v",
          },
        },
      },
    }
    ```
  </Step>
  <Step title="Verify the provider is available">
    ```bash
    openclaw models list --provider alibaba
    ```
  </Step>
</Steps>

<Note>Cualquiera de las claves de autenticación aceptadas (`MODELSTUDIO_API_KEY`, `DASHSCOPE_API_KEY`, `QWEN_API_KEY`) funcionará. La opción de incorporación `qwen-standard-api-key` configura la credencial compartida de DashScope.</Note>

## Modelos Wan integrados

El proveedor `alibaba` incluido registra actualmente:

| Referencia del modelo      | Modo                        |
| -------------------------- | --------------------------- |
| `alibaba/wan2.6-t2v`       | Texto a video               |
| `alibaba/wan2.6-i2v`       | Imagen a video              |
| `alibaba/wan2.6-r2v`       | Referencia a video          |
| `alibaba/wan2.6-r2v-flash` | Referencia a video (rápido) |
| `alibaba/wan2.7-r2v`       | Referencia a video          |

## Límites actuales

| Parámetro                  | Límite                                                    |
| -------------------------- | --------------------------------------------------------- |
| Videos de salida           | Hasta **1** por solicitud                                 |
| Imágenes de entrada        | Hasta **1**                                               |
| Videos de entrada          | Hasta **4**                                               |
| Duración                   | Hasta **10 segundos**                                     |
| Controles compatibles      | `size`, `aspectRatio`, `resolution`, `audio`, `watermark` |
| Imagen/video de referencia | Solo URLs `http(s)` remotas                               |

<Warning>El modo de imagen/video de referencia actualmente requiere **URLs http(s) remotas**. No se admiten rutas de archivos locales para entradas de referencia.</Warning>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Relationship to Qwen">
    El proveedor incluido `qwen` también utiliza los puntos de conexión de DashScope alojados por Alibaba para
    la generación de video Wan. Use:

    - `qwen/...` cuando desee la superficie del proveedor Qwen canónico
    - `alibaba/...` cuando desee la superficie de video Wan propiedad directa del proveedor

    Consulte la [documentación del proveedor Qwen](/es/providers/qwen) para obtener más detalles.

  </Accordion>

  <Accordion title="Auth key priority">
    OpenClaw verifica las claves de autenticación en el siguiente orden:

    1. `MODELSTUDIO_API_KEY` (preferido)
    2. `DASHSCOPE_API_KEY`
    3. `QWEN_API_KEY`

    Cualquiera de estos autenticará el proveedor `alibaba`.

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Video generation" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de video y selección de proveedor.
  </Card>
  <Card title="Qwen" href="/es/providers/qwen" icon="microchip">
    Configuración del proveedor Qwen e integración con DashScope.
  </Card>
  <Card title="Configuration reference" href="/es/gateway/configuration-reference#agent-defaults" icon="gear">
    Valores predeterminados del agente y configuración del modelo.
  </Card>
</CardGroup>
