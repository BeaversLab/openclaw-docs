---
summary: "Utilisez le catalogue OpenCode Go avec la configuration OpenCode partagée"
read_when:
  - You want the OpenCode Go catalog
  - You need the runtime model refs for Go-hosted models
title: "OpenCode Go"
---

# OpenCode Go

OpenCode Go est le catalogue Go au sein de [OpenCode](/fr/providers/opencode).
Il utilise le même `OPENCODE_API_KEY` que le catalogue Zen, mais conserve l'identifiant
provider d'exécution `opencode-go` afin que le routage en amont par model reste correct.

## Modèles pris en charge

- `opencode-go/kimi-k2.5`
- `opencode-go/glm-5`
- `opencode-go/minimax-m2.5`

## CLI setup

```bash
openclaw onboard --auth-choice opencode-go
# or non-interactive
openclaw onboard --opencode-go-api-key "$OPENCODE_API_KEY"
```

## Extrait de configuration

```json5
{
  env: { OPENCODE_API_KEY: "YOUR_API_KEY_HERE" }, // pragma: allowlist secret
  agents: { defaults: { model: { primary: "opencode-go/kimi-k2.5" } } },
}
```

## Comportement du routage

OpenClaw gère le routage par model automatiquement lorsque la référence du model utilise `opencode-go/...`.

## Notes

- Utilisez [OpenCode](/fr/providers/opencode) pour l'onboarding partagé et la vue d'ensemble du catalogue.
- Les références d'exécution restent explicites : `opencode/...` pour Zen, `opencode-go/...` pour Go.

import fr from "/components/footer/fr.mdx";

<fr />
