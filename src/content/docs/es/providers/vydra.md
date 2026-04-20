---
summary: "Usar Vydra para imagen, video y voz en OpenClaw"
read_when:
  - You want Vydra media generation in OpenClaw
  - You need Vydra API key setup guidance
title: "Vydra"
---

# Vydra

El complemento Vydra incluido añade:

- Generación de imágenes mediante `vydra/grok-imagine`
- Generación de videos mediante `vydra/veo3` y `vydra/kling`
- Síntesis de voz a través de la ruta TTS de Vydra respaldada por ElevenLabs

OpenClaw utiliza el mismo `VYDRA_API_KEY` para las tres capacidades.

<Warning>
Use `https://www.vydra.ai/api/v1` como la URL base.

El host apex de Vydra (`https://vydra.ai/api/v1`) actualmente redirige a `www`. Algunos clientes HTTP eliminan `Authorization` en esa redirección entre hosts, lo que convierte una clave API válida en un error de autenticación engañoso. El complemento incluido utiliza la URL base `www` directamente para evitar eso.

</Warning>

## Configuración

<Steps>
  <Step title="Ejecute la incorporación interactiva">
    ```bash
    openclaw onboard --auth-choice vydra-api-key
    ```

    O establezca la variable de entorno directamente:

    ```bash
    export VYDRA_API_KEY="vydra_live_..."
    ```

  </Step>
  <Step title="Elija una capacidad predeterminada">
    Elija una o más de las capacidades a continuación (imagen, video o voz) y aplique la configuración correspondiente.
  </Step>
</Steps>

## Capacidades

<AccordionGroup>
  <Accordion title="Generación de imágenes">
    Modelo de imagen predeterminado:

    - `vydra/grok-imagine`

    Establézcalo como el proveedor de imágenes predeterminado:

    ```json5
    {
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "vydra/grok-imagine",
          },
        },
      },
    }
    ```

    El soporte incluido actual es solo de texto a imagen. Las rutas de edición alojadas de Vydra esperan URLs de imágenes remotas, y OpenClaw aún no añade un puente de carga específico para Vydra en el complemento incluido.

    <Note>
    Consulte [Image Generation](/en/tools/image-generation) para ver los parámetros de herramientas compartidas, la selección de proveedores y el comportamiento de conmutación por error.
    </Note>

  </Accordion>

  <Accordion title="Generación de video">
    Modelos de video registrados:

    - `vydra/veo3` para texto a video
    - `vydra/kling` para imagen a video

    Establezca Vydra como proveedor de video predeterminado:

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "vydra/veo3",
          },
        },
      },
    }
    ```

    Notas:

    - `vydra/veo3` se incluye solo como texto a video.
    - `vydra/kling` actualmente requiere una referencia de URL de imagen remota. Las cargas de archivos locales se rechazan de antemano.
    - La ruta HTTP `kling` actual de Vydra ha sido inconsistente respecto a si requiere `image_url` o `video_url`; el proveedor incluido asigna la misma URL de imagen remota a ambos campos.
    - El complemento incluido se mantiene conservador y no reenvía controles de estilo no documentados, como relación de aspecto, resolución, marca de agua o audio generado.

    <Note>
    Consulte [Generación de video](/en/tools/video-generation) para conocer los parámetros de herramientas compartidas, la selección del proveedor y el comportamiento de conmutación por error.
    </Note>

  </Accordion>

  <Accordion title="Pruebas en vivo de video">
    Cobertura en vivo específica del proveedor:

    ```bash
    OPENCLAW_LIVE_TEST=1 \
    OPENCLAW_LIVE_VYDRA_VIDEO=1 \
    pnpm test:live -- extensions/vydra/vydra.live.test.ts
    ```

    El archivo en vivo de Vydra incluido ahora cubre:

    - `vydra/veo3` texto a video
    - `vydra/kling` imagen a video usando una URL de imagen remota

    Anule el dispositivo de imagen remota cuando sea necesario:

    ```bash
    export OPENCLAW_LIVE_VYDRA_KLING_IMAGE_URL="https://example.com/reference.png"
    ```

  </Accordion>

  <Accordion title="Síntesis de voz">
    Establezca Vydra como proveedor de voz:

    ```json5
    {
      messages: {
        tts: {
          provider: "vydra",
          providers: {
            vydra: {
              apiKey: "${VYDRA_API_KEY}",
              voiceId: "21m00Tcm4TlvDq8ikWAM",
            },
          },
        },
      },
    }
    ```

    Valores predeterminados:

    - Modelo: `elevenlabs/tts`
    - Id. de voz: `21m00Tcm4TlvDq8ikWAM`

    El complemento incluido actualmente expone una voz predeterminada confiable y devuelve archivos de audio MP3.

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Directorio de proveedores" href="/en/providers/index" icon="list">
    Explore todos los proveedores disponibles.
  </Card>
  <Card title="Generación de imágenes" href="/en/tools/image-generation" icon="image">
    Parámetros compartidos de la herramienta de imagen y selección del proveedor.
  </Card>
  <Card title="Generación de videos" href="/en/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de video y selección del proveedor.
  </Card>
  <Card title="Referencia de configuración" href="/en/gateway/configuration-reference#agent-defaults" icon="gear">
    Valores predeterminados del agente y configuración del modelo.
  </Card>
</CardGroup>
