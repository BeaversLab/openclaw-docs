---
title: "Runway"
summary: "Configuración de generación de video Runway en OpenClaw"
read_when:
  - You want to use Runway video generation in OpenClaw
  - You need the Runway API key/env setup
  - You want to make Runway the default video provider
---

# Runway

OpenClaw incluye un proveedor `runway` para la generación de videos alojados.

| Propiedad        | Valor                                                                         |
| ---------------- | ----------------------------------------------------------------------------- |
| ID del proveedor | `runway`                                                                      |
| Autenticación    | `RUNWAYML_API_SECRET` (canónico) o `RUNWAY_API_KEY`                           |
| API              | Generación de videos basada en tareas de Runway (sondeo `GET /v1/tasks/{id}`) |

## Para comenzar

<Steps>
  <Step title="Set the API key">```bash openclaw onboard --auth-choice runway-api-key ```</Step>
  <Step title="Set Runway as the default video provider">```bash openclaw config set agents.defaults.videoGenerationModel.primary "runway/gen4.5" ```</Step>
  <Step title="Generar un video">Pide al agente que genere un video. Runway se utilizará automáticamente.</Step>
</Steps>

## Modos compatibles

| Modo           | Modelo                    | Entrada de referencia   |
| -------------- | ------------------------- | ----------------------- |
| Texto a video  | `gen4.5` (predeterminado) | Ninguno                 |
| Imagen a video | `gen4.5`                  | 1 imagen local o remota |
| Video a video  | `gen4_aleph`              | 1 video local o remoto  |

<Note>Las referencias de imágenes y videos locales son compatibles a través de URI de datos. Las ejecuciones de solo texto actualmente exponen las relaciones de aspecto `16:9` y `9:16`.</Note>

<Warning>Video a video actualmente requiere específicamente `runway/gen4_aleph`.</Warning>

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

## Notas avanzadas

<AccordionGroup>
  <Accordion title="Alias de variables de entorno">
    OpenClaw reconoce tanto `RUNWAYML_API_SECRET` (canónico) como `RUNWAY_API_KEY`.
    Cualquiera de las dos variables autenticará el proveedor de Runway.
  </Accordion>

  <Accordion title="Sondeo de tareas">
    Runway utiliza una API basada en tareas. Después de enviar una solicitud de generación, OpenClaw
    sondea `GET /v1/tasks/{id}` hasta que el video está listo. No se necesita
    ninguna configuración adicional para el comportamiento del sondeo.
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Generación de video" href="/en/tools/video-generation" icon="video">
    Parámetros de herramienta compartidos, selección de proveedor y comportamiento asíncrono.
  </Card>
  <Card title="Referencia de configuración" href="/en/gateway/configuration-reference#agent-defaults" icon="gear">
    Configuración predeterminada del agente, incluido el modelo de generación de video.
  </Card>
</CardGroup>
