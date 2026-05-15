---
summary: "Configuración de generación de video de Runway en OpenClaw"
title: "Runway"
read_when:
  - You want to use Runway video generation in OpenClaw
  - You need the Runway API key/env setup
  - You want to make Runway the default video provider
---

OpenClaw incluye un proveedor `runway` integrado para la generación de video alojada. El complemento está habilitado de forma predeterminada y registra el proveedor `runway` frente al contrato `videoGenerationProviders`.

| Propiedad                             | Valor                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| ID del proveedor                      | `runway`                                                                     |
| Complemento                           | integrado, `enabledByDefault: true`                                          |
| Variables de entorno de autenticación | `RUNWAYML_API_SECRET` (canónico) o `RUNWAY_API_KEY`                          |
| Indicador de incorporación            | `--auth-choice runway-api-key`                                               |
| Indicador directo de CLI              | `--runway-api-key <key>`                                                     |
| API                                   | Generación de video basada en tareas de Runway (sondeo `GET /v1/tasks/{id}`) |
| Modelo predeterminado                 | `runway/gen4.5`                                                              |

## Para empezar

<Steps>
  <Step title="Establezca la clave de API">```bash openclaw onboard --auth-choice runway-api-key ```</Step>
  <Step title="Establezca Runway como el proveedor de video predeterminado">```bash openclaw config set agents.defaults.videoGenerationModel.primary "runway/gen4.5" ```</Step>
  <Step title="Genere un video">Pida al agente que genere un video. Se usará Runway automáticamente.</Step>
</Steps>

## Modos y modelos compatibles

El proveedor expone siete modelos de Runway divididos en tres modos. El mismo id. de modelo puede servir para más de un modo (por ejemplo, `gen4.5` funciona tanto para texto a video como para imagen a video).

| Modo           | Modelos                                                                | Entrada de referencia   |
| -------------- | ---------------------------------------------------------------------- | ----------------------- |
| Texto a video  | `gen4.5` (predeterminado), `veo3.1`, `veo3.1_fast`, `veo3`             | Ninguno                 |
| Imagen a video | `gen4.5`, `gen4_turbo`, `gen3a_turbo`, `veo3.1`, `veo3.1_fast`, `veo3` | 1 imagen local o remota |
| Video a video  | `gen4_aleph`                                                           | 1 video local o remoto  |

Las referencias de imágenes y videos locales se admiten a través de URI de datos.

| Relaciones de aspecto          | Valores permitidos                          |
| ------------------------------ | ------------------------------------------- |
| Texto a video                  | `16:9`, `9:16`                              |
| Ediciones de imágenes y videos | `1:1`, `16:9`, `9:16`, `3:4`, `4:3`, `21:9` |

<Warning>Actualmente, video-to-video requiere `runway/gen4_aleph`. Otros ids de modelos de Runway rechazan las entradas de referencia de video.</Warning>

<Note>Elegir un id de modelo de Runway de la columna incorrecta produce un error explícito antes de que la solicitud de API salga de OpenClaw. El proveedor valida `model` contra la lista de permitidos del modo (`TEXT_ONLY_MODELS`, `IMAGE_MODELS`, `VIDEO_MODELS`) en `extensions/runway/video-generation-provider.ts`.</Note>

## Configuración

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "runway/gen4.5",
      },
    },
  },
}
```

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Alias de variables de entorno">
    OpenClaw reconoce tanto `RUNWAYML_API_SECRET` (canónico) como `RUNWAY_API_KEY`.
    Cualquier variable autenticará el proveedor de Runway.
  </Accordion>

  <Accordion title="Sondeo de tareas">
    Runway utiliza una API basada en tareas. Después de enviar una solicitud de generación, OpenClaw
    sondea `GET /v1/tasks/{id}` hasta que el video esté listo. No se necesita
    configuración adicional para el comportamiento de sondeo.
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
