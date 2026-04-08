---
title: "Runway"
summary: "Configuración de generación de video Runway en OpenClaw"
read_when:
  - You want to use Runway video generation in OpenClaw
  - You need the Runway API key/env setup
  - You want to make Runway the default video provider
---

# Runway

OpenClaw incluye un proveedor `runway` integrado para la generación de videos alojados.

- ID del proveedor: `runway`
- Autenticación: `RUNWAYML_API_SECRET` (canónico) o `RUNWAY_API_KEY`
- API: Generación de videos basada en tareas de Runway (`GET /v1/tasks/{id}` sondeo)

## Inicio rápido

1. Establezca la clave de API:

```bash
openclaw onboard --auth-choice runway-api-key
```

2. Establezca Runway como proveedor de video predeterminado:

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "runway/gen4.5"
```

3. Pida al agente que genere un video. Se utilizará Runway automáticamente.

## Modos compatibles

| Modo           | Modelo                    | Entrada de referencia   |
| -------------- | ------------------------- | ----------------------- |
| Texto a video  | `gen4.5` (predeterminado) | Ninguno                 |
| Imagen a video | `gen4.5`                  | 1 imagen local o remota |
| Video a video  | `gen4_aleph`              | 1 video local o remoto  |

- Las referencias locales de imágenes y videos son compatibles a través de URI de datos.
- Actualmente, video a video requiere específicamente `runway/gen4_aleph`.
- Actualmente, las ejecuciones solo de texto exponen las relaciones de aspecto `16:9` y `9:16`.

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

## Relacionado

- [Generación de video](/en/tools/video-generation) -- parámetros de herramientas compartidas, selección de proveedor y comportamiento asíncrono
- [Referencia de configuración](/en/gateway/configuration-reference#agent-defaults)
