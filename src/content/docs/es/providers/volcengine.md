---
title: "Volcengine (Doubao)"
summary: "Configuración de Volcano Engine (modelos Doubao, puntos de conexión generales y de codificación)"
read_when:
  - You want to use Volcano Engine or Doubao models with OpenClaw
  - You need the Volcengine API key setup
---

# Volcengine (Doubao)

El proveedor Volcengine da acceso a los modelos Doubao y a modelos de terceros
hospedados en Volcano Engine, con endpoints separados para cargas de trabajo
generales y de codificación.

| Detalle       | Valor                                                     |
| ------------- | --------------------------------------------------------- |
| Proveedores   | `volcengine` (general) + `volcengine-plan` (codificación) |
| Autenticación | `VOLCANO_ENGINE_API_KEY`                                  |
| API           | Compatible con OpenAI                                     |

## Para empezar

<Steps>
  <Step title="Establecer la clave de API">
    Ejecute la incorporación interactiva:

    ```bash
    openclaw onboard --auth-choice volcengine-api-key
    ```

    Esto registra tanto el proveedor general (`volcengine`) como el de codificación (`volcengine-plan`) desde una sola clave de API.

  </Step>
  <Step title="Establecer un modelo predeterminado">
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
  <Step title="Verificar que el modelo esté disponible">
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

## Proveedores y puntos de conexión

| Proveedor         | Punto de conexión                         | Caso de uso             |
| ----------------- | ----------------------------------------- | ----------------------- |
| `volcengine`      | `ark.cn-beijing.volces.com/api/v3`        | Modelos generales       |
| `volcengine-plan` | `ark.cn-beijing.volces.com/api/coding/v3` | Modelos de codificación |

<Note>Ambos proveedores se configuran con una sola clave de API. La configuración registra ambos automáticamente.</Note>

## Modelos disponibles

<Tabs>
  <Tab title="General (volcengine)">
    | Referencia del modelo | Nombre | Entrada | Contexto | | -------------------------------------------- | ------------------------------- | ----------- | ------- | | `volcengine/doubao-seed-1-8-251228` | Doubao Seed 1.8 | texto, imagen | 256,000 | | `volcengine/doubao-seed-code-preview-251028` | doubao-seed-code-preview-251028 | texto, imagen | 256,000 | | `volcengine/kimi-k2-5-260127` | Kimi
    K2.5 | texto, imagen | 256,000 | | `volcengine/glm-4-7-251222` | GLM 4.7 | texto, imagen | 200,000 | | `volcengine/deepseek-v3-2-251201` | DeepSeek V3.2 | texto, imagen | 128,000 |
  </Tab>
  <Tab title="Programación (volcengine-plan)">
    | Ref. de modelo | Nombre | Entrada | Contexto | | ------------------------------------------------- | ------------------------ | ------- | -------- | | `volcengine-plan/ark-code-latest` | Ark Coding Plan | texto | 256,000 | | `volcengine-plan/doubao-seed-code` | Doubao Seed Code | texto | 256,000 | | `volcengine-plan/glm-4.7` | GLM 4.7 Coding | texto | 200,000 | |
    `volcengine-plan/kimi-k2-thinking` | Kimi K2 Thinking | texto | 256,000 | | `volcengine-plan/kimi-k2.5` | Kimi K2.5 Coding | texto | 256,000 | | `volcengine-plan/doubao-seed-code-preview-251028` | Doubao Seed Code Preview | texto | 256,000 |
  </Tab>
</Tabs>

## Notas avanzadas

<AccordionGroup>
  <Accordion title="Modelo predeterminado tras el registro">
    `openclaw onboard --auth-choice volcengine-api-key` actualmente establece
    `volcengine-plan/ark-code-latest` como el modelo predeterminado y, al mismo tiempo, registra
    el catálogo general `volcengine`.
  </Accordion>

<Accordion title="Comportamiento de reserva del selector de modelos">Durante el registro/configuración de la selección de modelos, la elección de autenticación de Volcengine prefiere tanto las filas `volcengine/*` como `volcengine-plan/*`. Si esos modelos aún no están cargados, OpenClaw recurre al catálogo sin filtrar en lugar de mostrar un selector con ámbito de proveedor vacío.</Accordion>

  <Accordion title="Variables de entorno para procesos demonio">
    Si el Gateway se ejecuta como demonio (launchd/systemd), asegúrese de que
    `VOLCANO_ENGINE_API_KEY` esté disponible para ese proceso (por ejemplo, en
    `~/.openclaw/.env` o mediante `env.shellEnv`).
  </Accordion>
</AccordionGroup>

<Warning>Al ejecutar OpenClaw como servicio en segundo plano, las variables de entorno establecidas en su shell interactivo no se heredan automáticamente. Consulte la nota sobre demonios anterior.</Warning>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/en/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Configuration" href="/en/configuration" icon="gear">
    Referencia completa de configuración para agentes, modelos y proveedores.
  </Card>
  <Card title="Troubleshooting" href="/en/help/troubleshooting" icon="wrench">
    Problemas comunes y pasos de depuración.
  </Card>
  <Card title="FAQ" href="/en/help/faq" icon="circle-question">
    Preguntas frecuentes sobre la configuración de OpenClaw.
  </Card>
</CardGroup>
