---
summary: "Utilisez le catalogue OpenCode Go avec la configuration OpenCode partagée"
read_when:
  - Vous souhaitez le catalogue OpenCode Go
  - Vous avez besoin des références de modèle d'exécution pour les modèles hébergés par Go
title: "OpenCode Go"
---

# OpenCode Go

OpenCode Go est le catalogue Go dans [OpenCode](/fr/providers/opencode).
Il utilise le même `OPENCODE_API_KEY` que le catalogue Zen, mais conserve l'identifiant du fournisseur d'exécution `opencode-go` afin que le routage en amont par modèle reste correct.

## Modèles pris en charge

- `opencode-go/kimi-k2.5`
- `opencode-go/glm-5`
- `opencode-go/minimax-m2.5`

## Configuration CLI

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

OpenClaw gère le routage par modèle automatiquement lorsque la référence du modèle utilise `opencode-go/...`.

## Notes

- Utilisez [OpenCode](/fr/providers/opencode) pour l'intégration partagée et la vue d'ensemble du catalogue.
- Les références d'exécution restent explicites : `opencode/...` pour Zen, `opencode-go/...` pour Go.

import en from "/components/footer/en.mdx";

<en />
