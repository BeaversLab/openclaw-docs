---
title: "ComfyUI"
summary: "Configuración de generación de imágenes, videos y música con flujos de trabajo de ComfyUI en OpenClaw"
read_when:
  - You want to use local ComfyUI workflows with OpenClaw
  - You want to use Comfy Cloud with image, video, or music workflows
  - You need the bundled comfy plugin config keys
---

# ComfyUI

OpenClaw incluye un complemento `comfy` para ejecuciones de ComfyUI basadas en flujos de trabajo. El complemento es totalmente basado en flujos de trabajo, por lo que OpenClaw no intenta mapear controles genéricos de `size`, `aspectRatio`, `resolution`, `durationSeconds` o estilo TTS en tu gráfico.

| Propiedad               | Detalle                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------ |
| Proveedor               | `comfy`                                                                              |
| Modelos                 | `comfy/workflow`                                                                     |
| Superficies compartidas | `image_generate`, `video_generate`, `music_generate`                                 |
| Autenticación           | Ninguna para ComfyUI local; `COMFY_API_KEY` o `COMFY_CLOUD_API_KEY` para Comfy Cloud |
| API                     | ComfyUI `/prompt` / `/history` / `/view` y Comfy Cloud `/api/*`                      |

## Lo que admite

- Generación de imágenes a partir de un JSON de flujo de trabajo
- Edición de imágenes con 1 imagen de referencia cargada
- Generación de video a partir de un JSON de flujo de trabajo
- Generación de video con 1 imagen de referencia cargada
- Generación de música o audio a través de la herramienta compartida `music_generate`
- Descarga de salida desde un nodo configurado o todos los nodos de salida coincidentes

## Para empezar

Elija entre ejecutar ComfyUI en su propia máquina o usar Comfy Cloud.

<Tabs>
  <Tab title="Local">
    **Lo mejor para:** ejecutar tu propia instancia de ComfyUI en tu máquina o LAN.

    <Steps>
      <Step title="Start ComfyUI locally">
        Asegúrate de que tu instancia local de ComfyUI se esté ejecutando (por defecto en `http://127.0.0.1:8188`).
      </Step>
      <Step title="Prepare your workflow JSON">
        Exporta o crea un archivo JSON de flujo de trabajo de ComfyUI. Anota los IDs de los nodos para el nodo de entrada del prompt y el nodo de salida del que quieres que OpenClaw lea.
      </Step>
      <Step title="Configure the provider">
        Establece `mode: "local"` y apunta a tu archivo de flujo de trabajo. Aquí tienes un ejemplo mínimo de imagen:

        ```json5
        {
          models: {
            providers: {
              comfy: {
                mode: "local",
                baseUrl: "http://127.0.0.1:8188",
                image: {
                  workflowPath: "./workflows/flux-api.json",
                  promptNodeId: "6",
                  outputNodeId: "9",
                },
              },
            },
          },
        }
        ```
      </Step>
      <Step title="Set the default model">
        Apunta OpenClaw al modelo `comfy/workflow` para la capacidad que configuraste:

        ```json5
        {
          agents: {
            defaults: {
              imageGenerationModel: {
                primary: "comfy/workflow",
              },
            },
          },
        }
        ```
      </Step>
      <Step title="Verify">
        ```bash
        openclaw models list --provider comfy
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Comfy Cloud">
    **Lo mejor para:** ejecutar flujos de trabajo en Comfy Cloud sin tener que gestionar recursos de GPU locales.

    <Steps>
      <Step title="Obtener una clave de API">
        Regístrate en [comfy.org](https://comfy.org) y genera una clave de API desde el panel de tu cuenta.
      </Step>
      <Step title="Establecer la clave de API">
        Proporciona tu clave a través de uno de estos métodos:

        ```bash
        # Environment variable (preferred)
        export COMFY_API_KEY="your-key"

        # Alternative environment variable
        export COMFY_CLOUD_API_KEY="your-key"

        # Or inline in config
        openclaw config set models.providers.comfy.apiKey "your-key"
        ```
      </Step>
      <Step title="Preparar tu JSON de flujo de trabajo">
        Exporta o crea un archivo JSON de flujo de trabajo de ComfyUI. Anota los ID de los nodos para el nodo de entrada del prompt y el nodo de salida.
      </Step>
      <Step title="Configurar el proveedor">
        Establece `mode: "cloud"` y apunta a tu archivo de flujo de trabajo:

        ```json5
        {
          models: {
            providers: {
              comfy: {
                mode: "cloud",
                image: {
                  workflowPath: "./workflows/flux-api.json",
                  promptNodeId: "6",
                  outputNodeId: "9",
                },
              },
            },
          },
        }
        ```

        <Tip>
        El modo en la nube establece `baseUrl` por defecto en `https://cloud.comfy.org`. Solo necesitas establecer `baseUrl` si usas un endpoint personalizado en la nube.
        </Tip>
      </Step>
      <Step title="Establecer el modelo predeterminado">
        ```json5
        {
          agents: {
            defaults: {
              imageGenerationModel: {
                primary: "comfy/workflow",
              },
            },
          },
        }
        ```
      </Step>
      <Step title="Verificar">
        ```bash
        openclaw models list --provider comfy
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Configuración

Comfy admite configuraciones de conexión compartidas de nivel superior además de secciones de flujo de trabajo por capacidad (`image`, `video`, `music`):

```json5
{
  models: {
    providers: {
      comfy: {
        mode: "local",
        baseUrl: "http://127.0.0.1:8188",
        image: {
          workflowPath: "./workflows/flux-api.json",
          promptNodeId: "6",
          outputNodeId: "9",
        },
        video: {
          workflowPath: "./workflows/video-api.json",
          promptNodeId: "12",
          outputNodeId: "21",
        },
        music: {
          workflowPath: "./workflows/music-api.json",
          promptNodeId: "3",
          outputNodeId: "18",
        },
      },
    },
  },
}
```

### Claves compartidas

| Clave                 | Tipo                  | Descripción                                                                                              |
| --------------------- | --------------------- | -------------------------------------------------------------------------------------------------------- |
| `mode`                | `"local"` o `"cloud"` | Modo de conexión.                                                                                        |
| `baseUrl`             | cadena (string)       | Por defecto es `http://127.0.0.1:8188` para local o `https://cloud.comfy.org` para la nube.              |
| `apiKey`              | cadena (string)       | Clave en línea opcional, alternativa a las variables de entorno `COMFY_API_KEY` / `COMFY_CLOUD_API_KEY`. |
| `allowPrivateNetwork` | booleano              | Permitir un `baseUrl` privado/LAN en modo en la nube.                                                    |

### Claves por capacidad

Estas claves se aplican dentro de las secciones `image`, `video` o `music`:

| Clave                       | Obligatorio | Predeterminado | Descripción                                                                                      |
| --------------------------- | ----------- | -------------- | ------------------------------------------------------------------------------------------------ |
| `workflow` o `workflowPath` | Sí          | --             | Ruta al archivo JSON del flujo de trabajo de ComfyUI.                                            |
| `promptNodeId`              | Sí          | --             | ID del nodo que recibe el prompt de texto.                                                       |
| `promptInputName`           | No          | `"text"`       | Nombre de entrada en el nodo de prompt.                                                          |
| `outputNodeId`              | No          | --             | ID del nodo del que leer la salida. Si se omite, se usan todos los nodos de salida coincidentes. |
| `pollIntervalMs`            | No          | --             | Intervalo de sondeo en milisegundos para la finalización del trabajo.                            |
| `timeoutMs`                 | No          | --             | Tiempo de espera en milisegundos para la ejecución del flujo de trabajo.                         |

Las secciones `image` y `video` también admiten:

| Clave                 | Obligatorio                            | Predeterminado | Descripción                                             |
| --------------------- | -------------------------------------- | -------------- | ------------------------------------------------------- |
| `inputImageNodeId`    | Sí (al pasar una imagen de referencia) | --             | ID del nodo que recibe la imagen de referencia cargada. |
| `inputImageInputName` | No                                     | `"image"`      | Nombre de entrada en el nodo de imagen.                 |

## Detalles del flujo de trabajo

<AccordionGroup>
  <Accordion title="Flujos de trabajo de imagen">
    Establezca el modelo de imagen predeterminado en `comfy/workflow`:

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "comfy/workflow",
          },
        },
      },
    }
    ```

    **Ejemplo de edición con imagen de referencia:**

    Para habilitar la edición de imágenes con una imagen de referencia cargada, agregue `inputImageNodeId` a su configuración de imagen:

    ```json5
    {
      models: {
        providers: {
          comfy: {
            image: {
              workflowPath: "./workflows/edit-api.json",
              promptNodeId: "6",
              inputImageNodeId: "7",
              inputImageInputName: "image",
              outputNodeId: "9",
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Flujos de trabajo de video">
    Establezca el modelo de video predeterminado en `comfy/workflow`:

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "comfy/workflow",
          },
        },
      },
    }
    ```

    Los flujos de trabajo de video de Comfy admiten texto a video e imagen a video a través del gráfico configurado.

    <Note>
    OpenClaw no pasa videos de entrada a los flujos de trabajo de Comfy. Solo se admiten prompts de texto e imágenes de referencia individuales como entradas.
    </Note>

  </Accordion>

  <Accordion title="Flujos de trabajo de música">
    El complemento incluido registra un proveedor de generación de música para salidas de audio o música definidas en el flujo de trabajo, expuestas a través de la herramienta compartida `music_generate`:

    ```text
    /tool music_generate prompt="Warm ambient synth loop with soft tape texture"
    ```

    Use la sección de configuración `music` para señalar a su JSON de flujo de trabajo de audio y al nodo de salida.

  </Accordion>

  <Accordion title="Compatibilidad con versiones anteriores">
    La configuración de imagen de nivel superior existente (sin la sección anidada `image`) todavía funciona:

    ```json5
    {
      models: {
        providers: {
          comfy: {
            workflowPath: "./workflows/flux-api.json",
            promptNodeId: "6",
            outputNodeId: "9",
          },
        },
      },
    }
    ```

    OpenClaw trata esa forma heredada como la configuración del flujo de trabajo de imagen. No necesita migrar inmediatamente, pero se recomiendan las secciones anidadas `image` / `video` / `music` para las nuevas configuraciones.

    <Tip>
    Si solo usa generación de imágenes, la configuración plana heredada y la nueva sección anidada `image` son funcionalmente equivalentes.
    </Tip>

  </Accordion>

  <Accordion title="Pruebas en vivo">
    Existe una cobertura en vivo opcional para el complemento incluido:

    ```bash
    OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts
    ```

    La prueba en vivo omite los casos individuales de imagen, video o música a menos que la sección del flujo de trabajo de Comfy correspondiente esté configurada.

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Generación de imágenes" href="/es/tools/image-generation" icon="image">
    Configuración y uso de la herramienta de generación de imágenes.
  </Card>
  <Card title="Generación de video" href="/es/tools/video-generation" icon="video">
    Configuración y uso de la herramienta de generación de video.
  </Card>
  <Card title="Generación de música" href="/es/tools/music-generation" icon="music">
    Configuración de la herramienta de generación de música y audio.
  </Card>
  <Card title="Directorio de proveedores" href="/es/providers/index" icon="layers">
    Resumen de todos los proveedores y referencias de modelos.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference#agent-defaults" icon="gear">
    Referencia completa de la configuración, incluidos los valores predeterminados del agente.
  </Card>
</CardGroup>
