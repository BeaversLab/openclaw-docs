---
summary: "Proxy communautaire pour exposer les identifiants d'abonnement Claude en tant que point de terminaison compatible OpenAI"
read_when:
  - You want to use Claude Max subscription with OpenAI-compatible tools
  - You want a local API server that wraps Claude Code CLI
  - You want to evaluate subscription-based vs API-key-based Anthropic access
title: "Claude Max API proxy"
---

**claude-max-api-proxy** est un outil communautaire qui expose votre abonnement Claude Max/Pro en tant que point de terminaison OpenAI-compatible API. Cela vous permet d'utiliser votre abonnement avec n'importe quel outil prenant en charge le format OpenAI API.

<Warning>Cette approche concerne uniquement la compatibilité technique. Anthropic a bloqué par le passé certaines utilisations d'abonnements en dehors de Claude Code. C'est à vous de décider de l'utiliser et de vérifier les conditions actuelles de Anthropic avant de vous y fier.</Warning>

## Pourquoi utiliser ceci ?

| Approche              | Coût                                                            | Idéal pour                                            |
| --------------------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| Anthropic API         | Paiement par jeton (~$15/M d'entrée, $75/M de sortie pour Opus) | Applications de production, volume élevé              |
| Abonnement Claude Max | 200 $/mois forfaitaire                                          | Usage personnel, développement, utilisation illimitée |

Si vous disposez d'un abonnement Claude Max et souhaitez l'utiliser avec des outils compatibles OpenAI, ce proxy peut réduire les coûts pour certains flux de travail. Les clés API restent la voie stratégique la plus claire pour une utilisation en production.

## Comment ça marche

```
Your App → claude-max-api-proxy → Claude Code CLI → Anthropic (via subscription)
     (OpenAI format)              (converts format)      (uses your login)
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
  <Accordion title="Notes de compatibilité de style proxy OpenAI">
    Ce chemin utilise la même route de style proxy compatible OpenAI que les autres
    backends personnalisés `/v1` :

    - Le façonnage des demandes natif OpenAI uniquement ne s'applique pas
    - Pas de `service_tier`, pas de Réponses `store`, pas d'indications de cache de prompt, et pas
    de façonnage de payload de compatibilité de raisonnement OpenAI
    - Les en-têtes d'attribution OpenClaw masqués (`originator`, `version`, `User-Agent`)
    ne sont pas injectés sur l'URL du proxy

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
- The proxy runs locally and does not send data to any third-party servers
- Streaming responses are fully supported

<Note>For native Anthropic integration with Claude CLI or API keys, see [Anthropic provider](/fr/providers/anthropic). For OpenAI/Codex subscriptions, see [OpenAI provider](/fr/providers/openai).</Note>

## Related

<CardGroup cols={2}>
  <Card title="Anthropic provider" href="/fr/providers/anthropic" icon="bolt">
    Native OpenClaw integration with Claude CLI or API keys.
  </Card>
  <Card title="OpenAI provider" href="/fr/providers/openai" icon="robot">
    For OpenAI/Codex subscriptions.
  </Card>
  <Card title="Model selection" href="/fr/concepts/model-providers" icon="layers">
    Overview of all providers, model refs, and failover behavior.
  </Card>
  <Card title="Configuration" href="/fr/gateway/configuration" icon="gear">
    Full config reference.
  </Card>
</CardGroup>
