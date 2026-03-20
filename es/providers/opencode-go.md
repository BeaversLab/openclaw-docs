---
summary: "Use el catálogo OpenCode Go con la configuración compartida de OpenCode"
read_when:
  - Quiere el catálogo OpenCode Go
  - Necesita las referencias del modelo en tiempo de ejecución para los modelos alojados en Go
title: "OpenCode Go"
---

# OpenCode Go

OpenCode Go es el catálogo Go dentro de [OpenCode](/es/providers/opencode).
Utiliza el mismo `OPENCODE_API_KEY` que el catálogo Zen, pero mantiene el id
del proveedor de tiempo de ejecución `opencode-go` para que el enrutamiento
por modelo ascendente siga siendo correcto.

## Modelos compatibles

- `opencode-go/kimi-k2.5`
- `opencode-go/glm-5`
- `opencode-go/minimax-m2.5`

## Configuración de CLI

```bash
openclaw onboard --auth-choice opencode-go
# or non-interactive
openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
```

## Fragmento de configuración

```json5
{
  env: { OPENCODE_API_KEY: "YOUR_API_KEY_HERE" }, // pragma: allowlist secret
  agents: { defaults: { model: { primary: "opencode-go/kimi-k2.5" } } },
}
```

## Comportamiento del enrutamiento

OpenClaw maneja el enrutamiento por modelo automáticamente cuando la referencia del modelo usa `opencode-go/...`.

## Notas

- Use [OpenCode](/es/providers/opencode) para la incorporación compartida y la descripción general del catálogo.
- Las referencias de tiempo de ejecución permanecen explícitas: `opencode/...` para Zen, `opencode-go/...` para Go.

import es from "/components/footer/es.mdx";

<es />
