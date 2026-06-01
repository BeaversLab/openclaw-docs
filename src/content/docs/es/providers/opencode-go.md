---
summary: "Usar el catálogo OpenCode Go con la configuración compartida de OpenCode"
read_when:
  - You want the OpenCode Go catalog
  - You need the runtime model refs for Go-hosted models
title: "OpenCode Go"
---

OpenCode Go es el catálogo de Go dentro de [OpenCode](/es/providers/opencode).
Utiliza el mismo `OPENCODE_API_KEY` que el catálogo Zen, pero mantiene el id
del proveedor de tiempo de ejecución `opencode-go` para que el enrutamiento
por modelo ascendente se mantenga correcto.

| Propiedad                        | Valor                              |
| -------------------------------- | ---------------------------------- |
| Proveedor de tiempo de ejecución | `opencode-go`                      |
| Autenticación                    | `OPENCODE_API_KEY`                 |
| Configuración principal          | [OpenCode](/es/providers/opencode) |

## Catálogo integrado

OpenClaw obtiene la mayoría de las filas del catálogo de Go del registro de modelos de OpenClaw incluido y
completa las filas ascendentes actuales mientras el registro se pone al día. Ejecute
`openclaw models list --provider opencode-go` para obtener la lista de modelos actual.

El proveedor incluye:

| Referencia del modelo           | Nombre                 |
| ------------------------------- | ---------------------- |
| `opencode-go/glm-5`             | GLM-5                  |
| `opencode-go/glm-5.1`           | GLM-5.1                |
| `opencode-go/kimi-k2.5`         | Kimi K2.5              |
| `opencode-go/kimi-k2.6`         | Kimi K2.6 (límites 3x) |
| `opencode-go/deepseek-v4-pro`   | DeepSeek V4 Pro        |
| `opencode-go/deepseek-v4-flash` | DeepSeek V4 Flash      |
| `opencode-go/mimo-v2-omni`      | MiMo V2 Omni           |
| `opencode-go/mimo-v2-pro`       | MiMo V2 Pro            |
| `opencode-go/minimax-m2.5`      | MiniMax M2.5           |
| `opencode-go/minimax-m2.7`      | MiniMax M2.7           |
| `opencode-go/qwen3.5-plus`      | Qwen3.5 Plus           |
| `opencode-go/qwen3.6-plus`      | Qwen3.6 Plus           |

## Introducción

<Tabs>
  <Tab title="Interactivo">
    <Steps>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice opencode-go
        ```
      </Step>
      <Step title="Set a Go model as default">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k2.6"
        ```
      </Step>
      <Step title="Verify models are available">
        ```bash
        openclaw models list --provider opencode-go
        ```
      </Step>
    </Steps>
  </Tab>

  <Tab title="No interactivo">
    <Steps>
      <Step title="Pass the key directly">
        ```bash
        openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
        ```
      </Step>
      <Step title="Verify models are available">
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
  env: { OPENCODE_API_KEY: "YOUR_API_KEY_HERE" }, // pragma: allowlist secret
  agents: { defaults: { model: { primary: "opencode-go/kimi-k2.6" } } },
}
```

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Comportamiento de enrutamiento">
    OpenClaw maneja el enrutamiento por modelo automáticamente cuando la referencia del modelo usa
    `opencode-go/...`. No se requiere ninguna configuración adicional del proveedor.
  </Accordion>

<Accordion title="Convención de referencia de tiempo de ejecución">Las referencias de tiempo de ejecución permanecen explícitas: `opencode/...` para Zen, `opencode-go/...` para Go. Esto mantiene el enrutamiento por modelo ascendente correcto en ambos catálogos.</Accordion>

  <Accordion title="Credenciales compartidas">
    Se usa el mismo `OPENCODE_API_KEY` tanto en el catálogo Zen como en el de Go. Al ingresar
    la clave durante la configuración, se almacenan las credenciales para ambos proveedores de tiempo de ejecución.
  </Accordion>
</AccordionGroup>

<Tip>Consulte [OpenCode](/es/providers/opencode) para obtener una descripción general del incorporamiento compartido y la referencia completa del catálogo Zen + Go.</Tip>

## Relacionado

<CardGroup cols={2}>
  <Card title="OpenCode (principal)" href="/es/providers/opencode" icon="server">
    Incorporamiento compartido, descripción general del catálogo y notas avanzadas.
  </Card>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelo y comportamiento de conmutación por error.
  </Card>
</CardGroup>
