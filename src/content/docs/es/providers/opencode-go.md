---
summary: "Usar el catálogo OpenCode Go con la configuración compartida de OpenCode"
read_when:
  - You want the OpenCode Go catalog
  - You need the runtime model refs for Go-hosted models
title: "OpenCode Go"
---

# OpenCode Go

OpenCode Go es el catálogo de Go dentro de [OpenCode](/es/providers/opencode).
Utiliza el mismo `OPENCODE_API_KEY` que el catálogo Zen, pero mantiene el id
del proveedor de tiempo de ejecución `opencode-go` para que el enrutamiento
por modelo aguas arriba siga siendo correcto.

| Propiedad                        | Valor                              |
| -------------------------------- | ---------------------------------- |
| Proveedor de tiempo de ejecución | `opencode-go`                      |
| Autenticación                    | `OPENCODE_API_KEY`                 |
| Configuración principal          | [OpenCode](/es/providers/opencode) |

## Modelos compatibles

OpenClaw obtiene el catálogo de Go del registro de modelos pi incluido. Ejecute
`openclaw models list --provider opencode-go` para ver la lista de modelos actual.

A partir del catálogo pi incluido, el proveedor incluye:

| Ref. de modelo             | Nombre                 |
| -------------------------- | ---------------------- |
| `opencode-go/glm-5`        | GLM-5                  |
| `opencode-go/glm-5.1`      | GLM-5.1                |
| `opencode-go/kimi-k2.5`    | Kimi K2.5              |
| `opencode-go/kimi-k2.6`    | Kimi K2.6 (límites 3x) |
| `opencode-go/mimo-v2-omni` | MiMo V2 Omni           |
| `opencode-go/mimo-v2-pro`  | MiMo V2 Pro            |
| `opencode-go/minimax-m2.5` | MiniMax M2.5           |
| `opencode-go/minimax-m2.7` | MiniMax M2.7           |
| `opencode-go/qwen3.5-plus` | Qwen3.5 Plus           |
| `opencode-go/qwen3.6-plus` | Qwen3.6 Plus           |

## Para empezar

<Tabs>
  <Tab title="Interactiva">
    <Steps>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice opencode-go
        ```
      </Step>
      <Step title="Set a Go model as default">
        ```bash
        openclaw config set agents.defaults.model.primary "opencode-go/kimi-k2.5"
        ```
      </Step>
      <Step title="Verify models are available">
        ```bash
        openclaw models list --provider opencode-go
        ```
      </Step>
    </Steps>
  </Tab>

  <Tab title="No interactiva">
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
  agents: { defaults: { model: { primary: "opencode-go/kimi-k2.5" } } },
}
```

## Notas avanzadas

<AccordionGroup>
  <Accordion title="Comportamiento de enrutamiento">
    OpenClaw maneja el enrutamiento por modelo automáticamente cuando la referencia
    del modelo utiliza `opencode-go/...`. No se requiere configuración
    adicional del proveedor.
  </Accordion>

<Accordion title="Convención de referencia de tiempo de ejecución">Las referencias de tiempo de ejecución permanecen explícitas: `opencode/...` para Zen, `opencode-go/...` para Go. Esto mantiene el enrutamiento por modelo aguas arriba correcto en ambos catálogos.</Accordion>

  <Accordion title="Credenciales compartidas">
    Se utiliza el mismo `OPENCODE_API_KEY` para los catálogos Zen y Go. Ingresar
    la clave durante la configuración almacena las credenciales para ambos proveedores
    de tiempo de ejecución.
  </Accordion>
</AccordionGroup>

<Tip>Consulte [OpenCode](/es/providers/opencode) para ver la descripción general del proceso de incorporación compartido y la referencia completa del catálogo Zen + Go.</Tip>

## Relacionado

<CardGroup cols={2}>
  <Card title="OpenCode (parent)" href="/es/providers/opencode" icon="server">
    Incorporación compartida, resumen del catálogo y notas avanzadas.
  </Card>
  <Card title="Model selection" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
</CardGroup>
