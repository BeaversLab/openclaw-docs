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
por modelo ascendente siga siendo correcto.

| Propiedad                        | Valor                              |
| -------------------------------- | ---------------------------------- |
| Proveedor de tiempo de ejecución | `opencode-go`                      |
| Autenticación                    | `OPENCODE_API_KEY`                 |
| Configuración principal          | [OpenCode](/es/providers/opencode) |

## Modelos compatibles

| Ref. del modelo            | Nombre       |
| -------------------------- | ------------ |
| `opencode-go/kimi-k2.5`    | Kimi K2.5    |
| `opencode-go/glm-5`        | GLM 5        |
| `opencode-go/minimax-m2.5` | MiniMax M2.5 |

## Primeros pasos

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
  agents: { defaults: { model: { primary: "opencode-go/kimi-k2.5" } } },
}
```

## Notas avanzadas

<AccordionGroup>
  <Accordion title="Comportamiento del enrutamiento">
    OpenClaw maneja el enrutamiento por modelo automáticamente cuando la referencia del modelo usa
    `opencode-go/...`. No se requiere ninguna configuración adicional del proveedor.
  </Accordion>

<Accordion title="Convención de referencia de tiempo de ejecución">Las referencias de tiempo de ejecución se mantienen explícitas: `opencode/...` para Zen, `opencode-go/...` para Go. Esto mantiene el enrutamiento por modelo ascendente correcto en ambos catálogos.</Accordion>

  <Accordion title="Credenciales compartidas">
    Se utiliza el mismo `OPENCODE_API_KEY` tanto para los catálogos Zen como Go. Ingresar
    la clave durante la configuración almacena las credenciales para ambos proveedores de tiempo de ejecución.
  </Accordion>
</AccordionGroup>

<Tip>Consulte [OpenCode](/es/providers/opencode) para ver el resumen de incorporación compartida y la referencia completa del catálogo Zen + Go.</Tip>

## Relacionado

<CardGroup cols={2}>
  <Card title="OpenCode (principal)" href="/es/providers/opencode" icon="server">
    Incorporación compartida, resumen del catálogo y notas avanzadas.
  </Card>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelo y comportamiento de conmutación por error.
  </Card>
</CardGroup>
