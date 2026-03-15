---
summary: "Proxy communautaire pour exposer les identifiants d'abonnement Claude en tant que point de terminaison compatible OpenAI"
read_when:
  - You want to use Claude Max subscription with OpenAI-compatible tools
  - You want a local API server that wraps Claude Code CLI
  - You want to evaluate subscription-based vs API-key-based Anthropic access
title: "Proxy API de Claude Max"
---

# Proxy API de Claude Max

**claude-max-api-proxy** est un outil communautaire qui expose votre abonnement Claude Max/Pro en tant que point de terminaison OpenAI compatible API. Cela vous permet d'utiliser votre abonnement avec n'importe quel outil prenant en charge le format OpenAI API.

<Warning>
  Cette approche concerne uniquement la compatibilité technique. Anthropic a bloqué par le passé
  certaines utilisations d'abonnement en dehors de Claude Code. Vous devez décider par vous-même de
  l'utiliser et vérifier les conditions actuelles de Anthropic avant de vous y fier.
</Warning>

## Pourquoi l'utiliser ?

| Approche              | Coût                                                           | Idéal pour                                            |
| --------------------- | -------------------------------------------------------------- | ----------------------------------------------------- |
| Anthropic API         | Payez par jeton (~15 $/M d'entrée, 75 $/M de sortie pour Opus) | Applications de production, volume élevé              |
| Abonnement Claude Max | Forfait mensuel de 200 $                                       | Usage personnel, développement, utilisation illimitée |

Si vous disposez d'un abonnement Claude Max et souhaitez l'utiliser avec des outils compatibles OpenAI, ce proxy peut réduire les coûts pour certains workflows. Les clés API restent la voie la plus claire en termes de politique pour une utilisation en production.

## Fonctionnement

```
Your App → claude-max-api-proxy → Claude Code CLI → Anthropic (via subscription)
     (OpenAI format)              (converts format)      (uses your login)
```

Le proxy :

1. Accepte les requêtes au format OpenAI à `http://localhost:3456/v1/chat/completions`
2. Les convertit en commandes CLI de Claude Code
3. Renvoie les réponses au format OpenAI (streaming pris en charge)

## Installation

```bash
# Requires Node.js 20+ and Claude Code CLI
npm install -g claude-max-api-proxy

# Verify Claude CLI is authenticated
claude --version
```

## Utilisation

### Démarrer le serveur

```bash
claude-max-api
# Server runs at http://localhost:3456
```

### Le tester

```bash
# Health check
curl http://localhost:3456/health

# List models
curl http://localhost:3456/v1/models

# Chat completion
curl http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-opus-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Avec OpenClaw

Vous pouvez pointer OpenClaw vers le proxy en tant que point de terminaison personnalisé compatible OpenAI :

```json5
{
  env: {
    OPENAI_API_KEY: "not-needed",
    OPENAI_BASE_URL: "http://localhost:3456/v1",
  },
  agents: {
    defaults: {
      model: { primary: "openai/claude-opus-4" },
    },
  },
}
```

## Modèles disponibles

| ID du modèle      | Correspond à    |
| ----------------- | --------------- |
| `claude-opus-4`   | Claude Opus 4   |
| `claude-sonnet-4` | Claude Sonnet 4 |
| `claude-haiku-4`  | Claude Haiku 4  |

## Démarrage automatique sur macOS

Créez un LaunchAgent pour exécuter le proxy automatiquement :

```bash
cat > ~/Library/LaunchAgents/com.claude-max-api.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.claude-max-api</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/usr/local/lib/node_modules/claude-max-api-proxy/dist/server/standalone.js</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:~/.local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF

launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.claude-max-api.plist
```

## Liens

- **npm :** [https://www.npmjs.com/package/claude-max-api-proxy](https://www.npmjs.com/package/claude-max-api-proxy)
- **GitHub :** [https://github.com/atalovesyou/claude-max-api-proxy](https://github.com/atalovesyou/claude-max-api-proxy)
- **Problèmes :** [https://github.com/atalovesyou/claude-max-api-proxy/issues](https://github.com/atalovesyou/claude-max-api-proxy/issues)

## Notes

- C'est un **outil communautaire**, non officiellement pris en charge par Anthropic ou OpenClaw
- Nécessite un abonnement Claude Max/Pro actif avec Claude Code CLI authentifié
- Le proxy s'exécute localement et n'envoie aucune donnée à des serveurs tiers
- Les réponses en streaming sont entièrement prises en charge

## Voir aussi

- [Fournisseur Anthropic](/fr/providers/anthropic) - Intégration native OpenClaw avec le jeton de configuration Claude ou les clés API
- [Fournisseur OpenAI](/fr/providers/openai) - Pour les abonnements OpenAI/Codex

import fr from '/components/footer/fr.mdx';

<fr />
