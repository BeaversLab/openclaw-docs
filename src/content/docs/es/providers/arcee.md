---
title: "Arcee AI"
summary: "Configuración de Arcee AI (autenticación + selección de modelo)"
read_when:
  - You want to use Arcee AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Arcee AI

[Arcee AI](https://arcee.ai) proporciona acceso a la familia de modelos de mezcla de expertos Trinity a través de una API compatible con OpenAI. Todos los modelos Trinity tienen licencia Apache 2.0.

Se puede acceder a los modelos de Arcee AI directamente a través de la plataforma de Arcee o mediante [OpenRouter](/es/providers/openrouter).

| Propiedad     | Valor                                                                                 |
| ------------- | ------------------------------------------------------------------------------------- |
| Proveedor     | `arcee`                                                                               |
| Autenticación | `ARCEEAI_API_KEY` (directo) o `OPENROUTER_API_KEY` (vía OpenRouter)                   |
| API           | Compatible con OpenAI                                                                 |
| URL base      | `https://api.arcee.ai/api/v1` (directo) o `https://openrouter.ai/api/v1` (OpenRouter) |

## Comenzando

<Tabs>
  <Tab title="Directo (plataforma Arcee)">
    <Steps>
      <Step title="Obtener una clave de API">
        Cree una clave de API en [Arcee AI](https://chat.arcee.ai/).
      </Step>
      <Step title="Ejecutar incorporación">
        ```bash
        openclaw onboard --auth-choice arceeai-api-key
        ```
      </Step>
      <Step title="Establecer un modelo predeterminado">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "arcee/trinity-large-thinking" },
            },
          },
        }
        ```
      </Step>
    </Steps>
  </Tab>

  <Tab title="Vía OpenRouter">
    <Steps>
      <Step title="Obtener una clave de API">
        Cree una clave de API en [OpenRouter](https://openrouter.ai/keys).
      </Step>
      <Step title="Ejecutar incorporación">
        ```bash
        openclaw onboard --auth-choice arceeai-openrouter
        ```
      </Step>
      <Step title="Establecer un modelo predeterminado">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "arcee/trinity-large-thinking" },
            },
          },
        }
        ```

        Las mismas referencias de modelo funcionan para configuraciones directas y de OpenRouter (por ejemplo, `arcee/trinity-large-thinking`).
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Configuración no interactiva

<Tabs>
  <Tab title="Direct (Arcee platform)">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice arceeai-api-key \
      --arceeai-api-key "$ARCEEAI_API_KEY"
    ```
  </Tab>

  <Tab title="Vía OpenRouter">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice arceeai-openrouter \
      --openrouter-api-key "$OPENROUTER_API_KEY"
    ```
  </Tab>
</Tabs>

## Catálogo integrado

OpenClaw actualmente incluye este catálogo de Arcee:

| Referencia del modelo          | Nombre                 | Entrada | Contexto | Costo (entrada/salida por 1M) | Notas                                          |
| ------------------------------ | ---------------------- | ------- | -------- | ----------------------------- | ---------------------------------------------- |
| `arcee/trinity-large-thinking` | Trinity Large Thinking | texto   | 256K     | $0.25 / $0.90                 | Modelo predeterminado; razonamiento habilitado |
| `arcee/trinity-large-preview`  | Trinity Large Preview  | texto   | 128K     | $0.25 / $1.00                 | Uso general; 400B parámetros, 13B activos      |
| `arcee/trinity-mini`           | Trinity Mini 26B       | texto   | 128K     | $0.045 / $0.15                | Rápido y rentable; llamada a funciones         |

<Tip>La configuración de inicio establece `arcee/trinity-large-thinking` como el modelo predeterminado.</Tip>

## Funciones admitidas

| Función                                        | Admitido                    |
| ---------------------------------------------- | --------------------------- |
| Transmisión (Streaming)                        | Sí                          |
| Uso de herramientas / llamada a funciones      | Sí                          |
| Salida estructurada (modo JSON y esquema JSON) | Sí                          |
| Pensamiento extendido                          | Sí (Trinity Large Thinking) |

<AccordionGroup>
  <Accordion title="Nota sobre el entorno">
    Si Gateway se ejecuta como demonio (launchd/systemd), asegúrese de que `ARCEEAI_API_KEY`
    (o `OPENROUTER_API_KEY`) esté disponible para ese proceso (por ejemplo, en
    `~/.openclaw/.env` o mediante `env.shellEnv`).
  </Accordion>

  <Accordion title="Enrutamiento de OpenRouter">
    Cuando se usan modelos de Arcee a través de OpenRouter, se aplican las mismas referencias de modelo `arcee/*`.
    OpenClaw maneja el enrutamiento de forma transparente según su elección de autenticación. Consulte la
    [documentación del proveedor OpenRouter](/es/providers/openrouter) para obtener detalles de configuración
    específicos de OpenRouter.
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="OpenRouter" href="/es/providers/openrouter" icon="shuffle">
    Acceda a modelos de Arcee y muchos más a través de una sola clave de API.
  </Card>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elegir proveedores, referencias de modelo y comportamiento de conmutación por error.
  </Card>
</CardGroup>
