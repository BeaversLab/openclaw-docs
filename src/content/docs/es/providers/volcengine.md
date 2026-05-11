---
summary: "Configuración de Volcano Engine (modelos Doubao, endpoints de codificación y TTS de Seed Speech)"
title: "Volcengine (Doubao)"
read_when:
  - You want to use Volcano Engine or Doubao models with OpenClaw
  - You need the Volcengine API key setup
  - You want to use Volcengine Speech text-to-speech
---

El proveedor Volcengine da acceso a los modelos Doubao y a modelos de terceros
alojados en Volcano Engine, con endpoints separados para cargas de trabajo
generales y de codificación. El mismo complemento empaquetado también puede
registrar Volcengine Speech como un proveedor de TTS.

| Detalle                  | Valor                                                           |
| ------------------------ | --------------------------------------------------------------- |
| Proveedores              | `volcengine` (general + TTS) + `volcengine-plan` (codificación) |
| Autenticación del modelo | `VOLCANO_ENGINE_API_KEY`                                        |
| Autenticación TTS        | `VOLCENGINE_TTS_API_KEY` o `BYTEPLUS_SEED_SPEECH_API_KEY`       |
| API                      | Modelos compatibles con OpenAI, BytePlus Seed Speech TTS        |

## Comenzando

<Steps>
  <Step title="Establezca la clave de API">
    Ejecute la integración interactiva:

    ```bash
    openclaw onboard --auth-choice volcengine-api-key
    ```

    Esto registra tanto los proveedores generales (`volcengine`) como los de codificación (`volcengine-plan`) desde una sola clave de API.

  </Step>
  <Step title="Establezca un modelo predeterminado">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "volcengine-plan/ark-code-latest" },
        },
      },
    }
    ```
  </Step>
  <Step title="Verifique que el modelo esté disponible">
    ```bash
    openclaw models list --provider volcengine
    openclaw models list --provider volcengine-plan
    ```
  </Step>
</Steps>

<Tip>
Para una configuración no interactiva (CI, secuencias de comandos), pase la clave directamente:

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice volcengine-api-key \
  --volcengine-api-key "$VOLCANO_ENGINE_API_KEY"
```

</Tip>

## Proveedores y endpoints

| Proveedor         | Endpoint                                  | Caso de uso             |
| ----------------- | ----------------------------------------- | ----------------------- |
| `volcengine`      | `ark.cn-beijing.volces.com/api/v3`        | Modelos generales       |
| `volcengine-plan` | `ark.cn-beijing.volces.com/api/coding/v3` | Modelos de codificación |

<Note>Ambos proveedores se configuran con una sola clave de API. La configuración registra ambos automáticamente.</Note>

## Catálogo integrado

<Tabs>
  <Tab title="General (volcengine)">
    | Model ref | Name | Input | Context | | -------------------------------------------- | ------------------------------- | ----------- | ------- | | `volcengine/doubao-seed-1-8-251228` | Doubao Seed 1.8 | texto, imagen | 256.000 | | `volcengine/doubao-seed-code-preview-251028` | doubao-seed-code-preview-251028 | texto, imagen | 256.000 | | `volcengine/kimi-k2-5-260127` | Kimi K2.5 | texto,
    imagen | 256.000 | | `volcengine/glm-4-7-251222` | GLM 4.7 | texto, imagen | 200.000 | | `volcengine/deepseek-v3-2-251201` | DeepSeek V3.2 | texto, imagen | 128.000 |
  </Tab>
  <Tab title="Coding (volcengine-plan)">
    | Model ref | Name | Input | Context | | ------------------------------------------------- | ------------------------ | ----- | ------- | | `volcengine-plan/ark-code-latest` | Ark Coding Plan | texto | 256.000 | | `volcengine-plan/doubao-seed-code` | Doubao Seed Code | texto | 256.000 | | `volcengine-plan/glm-4.7` | GLM 4.7 Coding | texto | 200.000 | | `volcengine-plan/kimi-k2-thinking` | Kimi
    K2 Thinking | texto | 256.000 | | `volcengine-plan/kimi-k2.5` | Kimi K2.5 Coding | texto | 256.000 | | `volcengine-plan/doubao-seed-code-preview-251028` | Doubao Seed Code Preview | texto | 256.000 |
  </Tab>
</Tabs>

## Texto a voz

El TTS de Volcengine utiliza la API HTTP de BytePlus Seed Speech y se configura
por separado de la clave API del modelo Doubao compatible con OpenAI. En la consola de
BytePlus, abra Seed Speech > Configuración > Claves API y copie la clave API, luego configure:

```bash
export VOLCENGINE_TTS_API_KEY="byteplus_seed_speech_api_key"
export VOLCENGINE_TTS_RESOURCE_ID="seed-tts-1.0"
```

Luego habilítelo en `openclaw.json`:

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "volcengine",
      providers: {
        volcengine: {
          apiKey: "byteplus_seed_speech_api_key",
          voice: "en_female_anna_mars_bigtts",
          speedRatio: 1.0,
        },
      },
    },
  },
}
```

Para objetivos de notas de voz, OpenClaw solicita a Volcengine `ogg_opus` nativo del
proveedor. Para archivos de audio adjuntos normales, solicita `mp3`. Los alias de proveedor
`bytedance` y `doubao` también se resuelven al mismo proveedor de voz.

El id de recurso predeterminado es `seed-tts-1.0` porque ese es el que BytePlus otorga
a las claves API de Seed Speech recién creadas en el proyecto predeterminado. Si su proyecto
tiene derechos de TTS 2.0, configure `VOLCENGINE_TTS_RESOURCE_ID=seed-tts-2.0`.

<Warning>`VOLCANO_ENGINE_API_KEY` es para los puntos finales de los modelos ModelArk/Doubao y no es una cclave de API de Seed Speech. TTS necesita una clave de API de Seed Speech de la Consola de BytePlus Speech, o un par de AppID/token de la Consola de Speech heredada.</Warning>

La autenticación AppID/token heredada sigue siendo compatible con las aplicaciones antiguas de la Consola de Speech:

```bash
export VOLCENGINE_TTS_APPID="speech_app_id"
export VOLCENGINE_TTS_TOKEN="speech_access_token"
export VOLCENGINE_TTS_CLUSTER="volcano_tts"
```

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Modelo predeterminado después de la incorporación">
    `openclaw onboard --auth-choice volcengine-api-key` actualmente establece
    `volcengine-plan/ark-code-latest` como el modelo predeterminado y también registra
    el catálogo general `volcengine`.
  </Accordion>

<Accordion title="Comportamiento de reserva del selector de modelos">Durante la incorporación/configuración de la selección de modelos, la elección de autenticación de Volcengine prefiere tanto las filas `volcengine/*` como `volcengine-plan/*`. Si esos modelos aún no están cargados, OpenClaw recurre al catálogo sin filtrar en lugar de mostrar un selector con alcance de proveedor vacío.</Accordion>

  <Accordion title="Variables de entorno para procesos demonio">
    Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que las variables de entorno del modelo y TTS
    como `VOLCANO_ENGINE_API_KEY`, `VOLCENGINE_TTS_API_KEY`,
    `BYTEPLUS_SEED_SPEECH_API_KEY`, `VOLCENGINE_TTS_APPID` y
    `VOLCENGINE_TTS_TOKEN` estén disponibles para ese proceso (por ejemplo, en
    `~/.openclaw/.env` o a través de `env.shellEnv`).
  </Accordion>
</AccordionGroup>

<Warning>Al ejecutar OpenClaw como un servicio en segundo plano, las variables de entorno establecidas en su shell interactivo no se heredan automáticamente. Consulte la nota sobre el demonio anterior.</Warning>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Configuración" href="/es/gateway/configuration" icon="gear">
    Referencia completa de configuración para agentes, modelos y proveedores.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="wrench">
    Problemas comunes y pasos de depuración.
  </Card>
  <Card title="Preguntas frecuentes" href="/es/help/faq" icon="circle-question">
    Preguntas frecuentes sobre la configuración de OpenClaw.
  </Card>
</CardGroup>
