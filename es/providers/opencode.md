---
summary: "Usar los catálogos Zen y Go de OpenCode con OpenClaw"
read_when:
  - You want OpenCode-hosted model access
  - You want to pick between the Zen and Go catalogs
title: "OpenCode"
---

# OpenCode

OpenCode expone dos catálogos alojados en OpenClaw:

- `opencode/...` para el catálogo **Zen**
- `opencode-go/...` para el catálogo **Go**

Ambos catálogos utilizan la misma clave de API de OpenCode. OpenClaw mantiene los IDs de los proveedores de tiempo de ejecución separados para que el enrutamiento ascendente por modelo siga siendo correcto, pero la incorporación y la documentación los tratan como una única configuración de OpenCode.

## Configuración de CLI

### Catálogo Zen

```bash
openclaw onboard --auth-choice opencode-zen
openclaw onboard --opencode-zen-api-key "$OPENCODE_API_KEY"
```

### Catálogo Go

```bash
openclaw onboard --auth-choice opencode-go
openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
```

## Fragmento de configuración

```json5
{
  env: { OPENCODE_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

## Catálogos

### Zen

- Proveedor de tiempo de ejecución: `opencode`
- Modelos de ejemplo: `opencode/claude-opus-4-6`, `opencode/gpt-5.2`, `opencode/gemini-3-pro`
- Ideal cuando deseas el proxy multi-modelo curado de OpenCode

### Go

- Proveedor de tiempo de ejecución: `opencode-go`
- Modelos de ejemplo: `opencode-go/kimi-k2.5`, `opencode-go/glm-5`, `opencode-go/minimax-m2.5`
- Ideal cuando deseas la alineación Kimi/GLM/MiniMax alojada en OpenCode

## Notas

- `OPENCODE_ZEN_API_KEY` también es compatible.
- Ingresar una clave de OpenCode durante la configuración guarda las credenciales para ambos proveedores de tiempo de ejecución.
- Inicia sesión en OpenCode, añade los detalles de facturación y copia tu clave de API.
- La facturación y la disponibilidad de los catálogos se gestionan desde el panel de OpenCode.

import es from "/components/footer/es.mdx";

<es />
