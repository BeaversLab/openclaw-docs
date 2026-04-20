---
summary: "Use los catálogos Zen y Go de OpenCode con OpenClaw"
read_when:
  - You want OpenCode-hosted model access
  - You want to pick between the Zen and Go catalogs
title: "OpenCode"
---

# OpenCode

OpenCode expone dos catálogos alojados en OpenClaw:

| Catálogo | Prefijo           | Proveedor de tiempo de ejecución |
| -------- | ----------------- | -------------------------------- |
| **Zen**  | `opencode/...`    | `opencode`                       |
| **Go**   | `opencode-go/...` | `opencode-go`                    |

Ambos catálogos utilizan la misma clave de API de OpenCode. OpenClaw mantiene los identificadores de proveedores de tiempo de ejecución separados para que el enrutamiento ascendente por modelo siga siendo correcto, pero el proceso de incorporación y la documentación los tratan como una única configuración de OpenCode.

## Introducción

<Tabs>
  <Tab title="Catálogo Zen">
    **Lo mejor para:** el proxy multimodelo curado de OpenCode (Claude, GPT, Gemini).

    <Steps>
      <Step title="Ejecutar incorporación">
        ```bash
        openclaw onboard --auth-choice opencode-zen
        ```

        O pase la clave directamente:

        ```bash
        openclaw onboard --opencode-zen-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="Establecer un modelo Zen como predeterminado">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode/claude-opus-4-6"
        ```
      </Step>
      <Step title="Verificar que los modelos estén disponibles">
        ```bash
        openclaw models list --provider opencode
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Catálogo Go">
    **Lo mejor para:** la línea de modelos Kimi, GLM y MiniMax alojados en OpenCode.

    <Steps>
      <Step title="Ejecutar incorporación">
        ```bash
        openclaw onboard --auth-choice opencode-go
        ```

        O pase la clave directamente:

        ```bash
        openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="Establecer un modelo Go como predeterminado">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k2.5"
        ```
      </Step>
      <Step title="Verificar que los modelos estén disponibles">
        ```bash
        openclaw models list --provider opencode-go
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Ejemplo de configuración

```json5
{
  env: { OPENCODE_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

## Catálogos

### Zen

| Propiedad                        | Valor                                                                   |
| -------------------------------- | ----------------------------------------------------------------------- |
| Proveedor de tiempo de ejecución | `opencode`                                                              |
| Modelos de ejemplo               | `opencode/claude-opus-4-6`, `opencode/gpt-5.4`, `opencode/gemini-3-pro` |

### Go

| Propiedad                        | Valor                                                                    |
| -------------------------------- | ------------------------------------------------------------------------ |
| Proveedor de tiempo de ejecución | `opencode-go`                                                            |
| Modelos de ejemplo               | `opencode-go/kimi-k2.5`, `opencode-go/glm-5`, `opencode-go/minimax-m2.5` |

## Notas avanzadas

<AccordionGroup>
  <Accordion title="Alias de clave de API">
    `OPENCODE_ZEN_API_KEY` también es compatible como alias para `OPENCODE_API_KEY`.
  </Accordion>

<Accordion title="Credenciales compartidas">Ingresar una clave de OpenCode durante la configuración guarda las credenciales para ambos proveedores de tiempo de ejecución. No es necesario incorporar cada catálogo por separado.</Accordion>

<Accordion title="Facturación y panel de control">Inicia sesión en OpenCode, agrega los detalles de facturación y copia tu clave de API. La facturación y la disponibilidad del catálogo se gestionan desde el panel de control de OpenCode.</Accordion>

<Accordion title="Comportamiento de repetición de Gemini">Las referencias de OpenCode con respaldo de Gemini se mantienen en la ruta proxy-Gemini, por lo que OpenClaw mantiene la limpieza de firmas de pensamiento de Gemini allí sin habilitar la validación de repetición nativa de Gemini ni las reescrituras de arranque.</Accordion>

  <Accordion title="Comportamiento de repetición no Gemini">
    Las referencias de OpenCode que no son de Gemini mantienen la política de repetición mínima compatible con OpenAI.
  </Accordion>
</AccordionGroup>

<Tip>Ingresar una clave de OpenCode durante la configuración guarda las credenciales para ambos proveedores de tiempo de ejecución, Zen y Go, por lo que solo necesitas incorporarte una vez.</Tip>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/en/concepts/model-providers" icon="layers">
    Elegir proveedores, referencias de modelo y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/en/gateway/configuration-reference" icon="gear">
    Referencia completa de configuración para agentes, modelos y proveedores.
  </Card>
</CardGroup>
