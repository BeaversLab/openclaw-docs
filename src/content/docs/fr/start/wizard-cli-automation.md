---
summary: "Onboarding scripté et configuration de l'agent pour la CLI OpenClawCLI"
read_when:
  - You are automating onboarding in scripts or CI
  - You need non-interactive examples for specific providers
title: "Automatisation CLI"
sidebarTitle: "Automatisation CLI"
---

# CLI Automation

Utilisez `--non-interactive` pour automatiser `openclaw onboard`.

<Note>`--json` n'implique pas le mode non interactif. Utilisez `--non-interactive` (et `--workspace`) pour les scripts.</Note>

## Exemple de base non interactif

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice apiKey \
  --anthropic-api-key "$ANTHROPIC_API_KEY" \
  --secret-input-mode plaintext \
  --gateway-port 18789 \
  --gateway-bind loopback \
  --install-daemon \
  --daemon-runtime node \
  --skip-skills
```

Ajoutez `--json` pour obtenir un résumé lisible par machine.

Utilisez `--secret-input-mode ref` pour stocker les références soutenues par des variables d'environnement dans les profils d'authentification au lieu des valeurs en clair.
La sélection interactive entre les références d'environnement et les références de provider configurées (`file` ou `exec`) est disponible dans le flux d'onboarding.

En mode non interactif `ref`, les variables d'environnement du provider doivent être définies dans l'environnement du processus.
Le passage de drapeaux de clé en ligne sans la variable d'environnement correspondante échoue désormais rapidement.

Exemple :

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

## Exemples spécifiques au provider

<AccordionGroup>
  <Accordion title="Anthropic API key example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice apiKey \
      --anthropic-api-key "$ANTHROPIC_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Gemini example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice gemini-api-key \
      --gemini-api-key "$GEMINI_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Z.AI example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice zai-api-key \
      --zai-api-key "$ZAI_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Vercel AI Gateway example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice ai-gateway-api-key \
      --ai-gateway-api-key "$AI_GATEWAY_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Cloudflare AI Gateway example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice cloudflare-ai-gateway-api-key \
      --cloudflare-ai-gateway-account-id "your-account-id" \
      --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
      --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Moonshot example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice moonshot-api-key \
      --moonshot-api-key "$MOONSHOT_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Mistral example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice mistral-api-key \
      --mistral-api-key "$MISTRAL_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Synthetic example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice synthetic-api-key \
      --synthetic-api-key "$SYNTHETIC_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Exemple de code ouvert">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice opencode-zen \
      --opencode-zen-api-key "$OPENCODE_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
    Basculez vers `--auth-choice opencode-go --opencode-go-api-key "$OPENCODE_API_KEY"` pour le catalogue Go.
  </Accordion>
  <Accordion title="Exemple Ollama">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice ollama \
      --custom-model-id "qwen3.5:27b" \
      --accept-risk \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Exemple de provider personnalisé">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice custom-api-key \
      --custom-base-url "https://llm.example.com/v1" \
      --custom-model-id "foo-large" \
      --custom-api-key "$CUSTOM_API_KEY" \
      --custom-provider-id "my-custom" \
      --custom-compatibility anthropic \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```

    `--custom-api-key` est facultatif. S'il est omis, l'onboarding vérifie `CUSTOM_API_KEY`.

    Variante en mode référence :

    ```bash
    export CUSTOM_API_KEY="your-key"
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice custom-api-key \
      --custom-base-url "https://llm.example.com/v1" \
      --custom-model-id "foo-large" \
      --secret-input-mode ref \
      --custom-provider-id "my-custom" \
      --custom-compatibility anthropic \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```

    Dans ce mode, l'onboarding stocke `apiKey` sous forme de `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`.

  </Accordion>
</AccordionGroup>

Le setup-token Anthropic reste disponible en tant que chemin de token d'onboarding pris en charge, mais OpenClaw préfère désormais la réutilisation du Claude CLI lorsque disponible.
Pour la production, préférez une clé API Anthropic.

## Ajouter un autre agent

Utilisez `openclaw agents add <name>` pour créer un agent séparé avec son propre espace de travail,
sessions et profils d'authentification. L'exécution sans `--workspace` lance l'assistant.

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.4 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

Ce qu'il définit :

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

Notes :

- Les espaces de travail par défaut suivent `~/.openclaw/workspace-<agentId>`.
- Ajoutez `bindings` pour acheminer les messages entrants (l'assistant peut le faire).
- Options non interactives : `--model`, `--agent-dir`, `--bind`, `--non-interactive`.

## Documentation connexe

- Hub d'intégration : [Onboarding (CLI)](/en/start/wizard)
- Référence complète : [CLI Setup Reference](/en/start/wizard-cli-reference)
- Référence de la commande : [`openclaw onboard`](/en/cli/onboard)
