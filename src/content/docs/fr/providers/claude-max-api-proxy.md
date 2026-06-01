---
summary: "Proxy communautaire pour exposer les identifiants d'abonnement Claude en tant que point de terminaison compatible OpenAI"
read_when:
  - You want to use Claude Max subscription with OpenAI-compatible tools
  - You want a local API server that wraps Claude Code CLI
  - You want to evaluate subscription-based vs API-key-based Anthropic access
title: "Claude Max API proxy"
---

**claude-max-api-proxy** est un outil communautaire qui expose votre abonnement Claude Max/Pro en tant que point de terminaison OpenAI-compatible API. Cela vous permet d'utiliser votre abonnement avec n'importe quel outil prenant en charge le format OpenAI API.

<Warning>
This path is technical compatibility only. Anthropic has blocked some subscription
usage outside Claude Code in the past. You must decide for yourself whether to use
it and verify Anthropic's current billing rules before relying on it.

Anthropic's current support docs say `claude -p` is Agent SDK/programmatic usage.
Starting June 15, 2026, subscription-plan `claude -p` usage draws from a separate
monthly Agent SDK credit first, then from usage credits at standard API rates if
usage credits are enabled.

</Warning>

## Pourquoi utiliser ceci ?

| Approche                  | Coût                                               | Idéal pour                                                  |
| ------------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| Anthropic API             | Paiement par jeton via Claude Console ou cloud     | Applications de production, automatisation partagée, volume |
| Proxy d'abonnement Claude | Claude Code / plan `claude -p` et règles de crédit | Expériences personnelles avec des outils compatibles        |

Si vous disposez d'un abonnement Claude Max ou Pro et que vous souhaitez l'utiliser avec des outils compatibles OpenAI, ce proxy peut convenir à certains workflows personnels. Il ne s'agit pas d'une solution à forfait illimité. Les clés API restent la voie la plus claire en matière de politique et de facturation pour une utilisation en production.

## Comment ça marche

```
Your App → claude-max-api-proxy → Claude Code CLI / claude -p → Anthropic
     (OpenAI format)              (converts format)          (uses your login)
```

Le proxy :

1. Accepte les requêtes au format OpenAI à `http://localhost:3456/v1/chat/completions`
2. Les convertit en commandes CLI de Claude Code
3. Renvoie les réponses au format OpenAI (streaming pris en charge)

## Getting started

<Steps>
  <Step title="Installer le proxy">
    Nécessite Node.js 20+ et le CLI Claude Code.

    ```bash
    npm install -g claude-max-api-proxy

    # Verify Claude CLI is authenticated
    claude --version
    ```

  </Step>
  <Step title="Démarrer le serveur">
    ```bash
    claude-max-api
    # Server runs at http://localhost:3456
    ```
  </Step>
  <Step title="Tester le proxy">
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

  </Step>
  <Step title="Configurer OpenClaw">
    Pointez OpenClaw vers le proxy en tant que point de terminaison personnalisé compatible OpenAI :

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

  </Step>
</Steps>

## Catalogue intégré

| ID de modèle      | Correspond à    |
| ----------------- | --------------- |
| `claude-opus-4`   | Claude Opus 4   |
| `claude-sonnet-4` | Claude Sonnet 4 |
| `claude-haiku-4`  | Claude Haiku 4  |

## Configuration avancée

<AccordionGroup>
  <Accordion title="Notes de compatibilité de type proxy OpenAI">
    Ce chemin utilise la même route de compatibilité de type proxy OpenAI que les autres backends personnalisés `/v1` :

    - Le façonnement de requêtes natif uniquement OpenAI ne s'applique pas
    - Pas de `service_tier`, pas de `store` Responses, pas d'indices de cache de prompt, et pas de façonnement de payload de compatibilité de raisonnement OpenAI
    - Les en-têtes d'attribution OpenClaw masqués (`originator`, `version`, `User-Agent`) ne sont pas injectés sur l'URL du proxy

  </Accordion>

  <Accordion title="Démarrage automatique sur macOS avec LaunchAgent">
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

  </Accordion>
</AccordionGroup>

## Notes

- This is a **community tool**, not officially supported by Anthropic or OpenClaw
- Requires an active Claude Max/Pro subscription with Claude Code CLI authenticated
- Hérite de la facturation `claude -p`, du crédit d'utilisation et du comportement de limitation de taux de Claude Code
- Le proxy s'exécute localement et n'envoie pas de données à des serveurs tiers
- Les réponses en streaming sont entièrement prises en charge

<Note>Pour l'intégration native Anthropic avec Claude CLI ou les clés API, consultez [Fournisseur Anthropic](/fr/providers/anthropic). Pour les abonnements OpenAI/Codex, consultez [Fournisseur OpenAI](/fr/providers/openai).</Note>

## Connexes

<CardGroup cols={2}>
  <Card title="Fournisseur Anthropic" href="/fr/providers/anthropic" icon="bolt">
    Intégration native OpenClaw avec Claude CLI ou les clés API.
  </Card>
  <Card title="Fournisseur OpenAI" href="/fr/providers/openai" icon="robot">
    Pour les abonnements OpenAI/Codex.
  </Card>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Vue d'ensemble de tous les fournisseurs, références de modèles et comportements de basculement.
  </Card>
  <Card title="Configuration" href="/fr/gateway/configuration" icon="gear">
    Référence complète de la configuration.
  </Card>
</CardGroup>
