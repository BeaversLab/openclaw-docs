---
summary: "Generación de video Wan de Alibaba Model Studio en OpenClaw"
title: "Alibaba Model Studio"
read_when:
  - You want to use Alibaba Wan video generation in OpenClaw
  - You need Model Studio or DashScope API key setup for video generation
---

OpenClaw incluye un complemento `alibaba` que registra un proveedor de generación de video para modelos Wan en Alibaba Model Studio (el nombre internacional de DashScope). El complemento está habilitado de forma predeterminada; solo necesitas establecer una clave de API.

| Propiedad                             | Valor                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| ID de proveedor                       | `alibaba`                                                                                   |
| Complemento                           | incluido, `enabledByDefault: true`                                                          |
| Variables de entorno de autenticación | `MODELSTUDIO_API_KEY` → `DASHSCOPE_API_KEY` → `QWEN_API_KEY` (gana la primera coincidencia) |
| Indicador de incorporación            | `--auth-choice alibaba-model-studio-api-key`                                                |
| Indicador directo de CLI              | `--alibaba-model-studio-api-key <key>`                                                      |
| Modelo predeterminado                 | `alibaba/wan2.6-t2v`                                                                        |
| URL base predeterminada               | `https://dashscope-intl.aliyuncs.com`                                                       |

## Para comenzar

<Steps>
  <Step title="Establecer una clave de API">
    Utiliza la incorporación para almacenar la clave con el proveedor `alibaba`:

    ```bash
    openclaw onboard --auth-choice alibaba-model-studio-api-key
    ```

    O pasa la clave directamente durante la instalación/incorporación:

    ```bash
    openclaw onboard --alibaba-model-studio-api-key <your-key>
    ```

    O exporta cualquiera de las variables de entorno aceptadas antes de iniciar la Gateway:

    ```bash
    export MODELSTUDIO_API_KEY=sk-...
    # or DASHSCOPE_API_KEY=...
    # or QWEN_API_KEY=...
    ```

  </Step>
  <Step title="Establecer un modelo de video predeterminado">
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
  <Step title="Verificar que el proveedor esté configurado">
    ```bash
    openclaw models list --provider alibaba
    ```

    La lista debe incluir los cinco modelos Wan incluidos. Si `MODELSTUDIO_API_KEY` no está resuelto, `openclaw models status --json` informa la credencial faltante en `auth.unusableProfiles`.

  </Step>
</Steps>

<Note>El complemento de Alibaba y el [complemento de Qwen](/es/providers/qwen) ambos se autentican contra DashScope y aceptan variables de entorno superpuestas. Usa los ids de modelo `alibaba/...` para utilizar la superficie de video Wan dedicada; usa los ids `qwen/...` cuando desees la superficie de chat, incrustación (embedding) o comprensión de medios de Qwen.</Note>

## Modelos Wan integrados

| Referencia del modelo      | Modo                           |
| -------------------------- | ------------------------------ |
| `alibaba/wan2.6-t2v`       | Texto a video (predeterminado) |
| `alibaba/wan2.6-i2v`       | Imagen a vídeo                 |
| `alibaba/wan2.6-r2v`       | Referencia a vídeo             |
| `alibaba/wan2.6-r2v-flash` | Referencia a vídeo (rápido)    |
| `alibaba/wan2.7-r2v`       | Referencia a vídeo             |

## Capacidades y límites

El proveedor integrado refleja los límites de la API de vídeo de Wan de DashScope. Los tres modos comparten el mismo límite de recuento y duración de vídeo por solicitud; solo difiere la forma de entrada.

| Modo               | Máximo de vídeos de salida | Máximo de imágenes de entrada | Máximo de vídeos de entrada | Duración máxima | Controles compatibles                                     |
| ------------------ | -------------------------- | ----------------------------- | --------------------------- | --------------- | --------------------------------------------------------- |
| Texto a vídeo      | 1                          | n/a                           | n/a                         | 10 s            | `size`, `aspectRatio`, `resolution`, `audio`, `watermark` |
| Imagen a vídeo     | 1                          | 1                             | n/a                         | 10 s            | `size`, `aspectRatio`, `resolution`, `audio`, `watermark` |
| Referencia a vídeo | 1                          | n/a                           | 4                           | 10 s            | `size`, `aspectRatio`, `resolution`, `audio`, `watermark` |

Cuando una solicitud omite `durationSeconds`, el proveedor envía el valor predeterminado aceptado por DashScope de **5 segundos**. Establezca `durationSeconds` explícitamente en la [herramienta de generación de vídeo](/es/tools/video-generation) para ampliar hasta 10 s.

<Warning>Las entradas de imagen y vídeo de referencia deben ser URL `http(s)` remotas. Las rutas de archivos locales no son aceptadas por los modos de referencia de DashScope; primero cargue en el almacenamiento de objetos o use el flujo de la [herramienta de medios](/es/tools/media-overview) que ya produce una URL pública.</Warning>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Invalidar la URL base de DashScope">
    El proveedor usa por defecto el punto de conexión internacional de DashScope. Para apuntar al punto de conexión de la región de China, establezca:

    ```json5
    {
      models: {
        providers: {
          alibaba: {
            baseUrl: "https://dashscope.aliyuncs.com",
          },
        },
      },
    }
    ```

    El proveedor elimina las barras diagonales finales antes de construir las URLs de tareas AIGC.

  </Accordion>

  <Accordion title="Prioridad de las variables de entorno de autenticación">
    OpenClaw resuelve la clave de API de Alibaba desde las variables de entorno en este orden, tomando el primer valor no vacío:

    1. `MODELSTUDIO_API_KEY`
    2. `DASHSCOPE_API_KEY`
    3. `QWEN_API_KEY`

    Las entradas `auth.profiles` configuradas (establecidas mediante `openclaw models auth login`) anulan la resolución de variables de entorno. Consulte [Perfiles de autenticación en las preguntas frecuentes de modelos](/es/help/faq-models#what-is-an-auth-profile) para conocer la mecánica de rotación, enfriamiento y anulación de perfiles.

  </Accordion>

  <Accordion title="Relación con el complemento Qwen">
    Ambos complementos integrados se comunican con DashScope y aceptan claves de API superpuestas. Utilice:

    - ids `alibaba/wan*.*` para utilizar el proveedor de video Wan dedicado documentado en esta página.
    - ids `qwen/*` para el chat, incrustación y comprensión de medios de Qwen (consulte [Qwen](/es/providers/qwen)).

    Configurar `MODELSTUDIO_API_KEY` una vez autentica ambos complementos porque la lista de variables de entorno de autenticación se superpone intencionalmente; no necesita integrar cada complemento por separado.

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Generación de video" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de video y selección del proveedor.
  </Card>
  <Card title="Qwen" href="/es/providers/qwen" icon="microchip">
    Configuración de chat, incrustación y comprensión de medios de Qwen con la misma autenticación de DashScope.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/config-agents#agent-defaults" icon="gear">
    Valores predeterminados del agente y configuración del modelo.
  </Card>
  <Card title="Preguntas frecuentes sobre modelos" href="/es/help/faq-models" icon="circle-question">
    Perfiles de autenticación, cambio de modelos y resolución de errores "no profile".
  </Card>
</CardGroup>
