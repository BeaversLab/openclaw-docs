---
summary: "Utilisez les modèles Venice AI axés sur la confidentialité dans OpenClaw"
read_when:
  - You want privacy-focused inference in OpenClaw
  - You want Venice AI setup guidance
title: "Venice AI"
---

# Venice AI (mise en avant Venice)

**Venice** est notre configuration Venice à la une pour l'inférence axée sur la confidentialité avec un accès anonymisé facultatif aux modèles propriétaires.

Venice AI fournit une inférence IA axée sur la confidentialité avec prise en charge des modèles non censurés et accès aux modèles propriétaires majeurs via leur proxy anonymisé. Toute inférence est privée par défaut — aucun entraînement sur vos données, aucune journalisation.

## Pourquoi Venice dans OpenClaw

- **Inférence privée** pour les modèles open source (pas de journalisation).
- **Modèles non censurés** quand vous en avez besoin.
- **Accès anonymisé** aux modèles propriétaires (Opus/GPT/Gemini) lorsque la qualité compte.
- Points de terminaison `/v1` compatibles OpenAI.

## Modes de confidentialité

Venice propose deux niveaux de confidentialité — comprendre cela est essentiel pour choisir votre modèle :

| Mode          | Description                                                                                                                                              | Modèles                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Privé**     | Entièrement privé. Les invites/réponses ne sont **jamais stockées ni journalisées**. Éphémère.                                                           | Llama, Qwen, DeepSeek, Kimi, MiniMax, Venice Uncensored, etc. |
| **Anonymisé** | Acheminé via un proxy Venice avec les métadonnées supprimées. Le fournisseur sous-jacent (OpenAI, Anthropic, Google, xAI) voit des demandes anonymisées. | Claude, GPT, Gemini, Grok                                     |

## Fonctionnalités

- **Axé sur la confidentialité** : Choisissez entre les modes « privé » (entièrement privé) et « anonymisé » (via proxy)
- **Modèles non censurés** : Accès aux modèles sans restrictions de contenu
- **Accès aux modèles majeurs** : Utilisez Claude, GPT, Gemini et Grok via le proxy anonymisé de Venice
- **OpenAI compatible** : Points de terminaison `/v1` standard pour une intégration facile
- **Streaming** : ✅ Pris en charge sur tous les modèles
- **Appel de fonctions** : ✅ Pris en charge sur certains modèles (vérifiez les capacités du modèle)
- **Vision** : ✅ Pris en charge sur les modèles avec capacité de vision
- **Pas de limites de taux strictes** : Une limitation d'utilisation équitable peut s'appliquer pour une utilisation extrême

## Configuration

### 1. Obtenir la clé API

1. Inscrivez-vous sur [venice.ai](https://venice.ai)
2. Go to **Settings → API Keys → Create new key**
3. Copy your API key (format: `vapi_xxxxxxxxxxxx`)

### 2. Configure OpenClaw

**Option A: Variable d'environnement**

```bash
export VENICE_API_KEY="vapi_xxxxxxxxxxxx"
```

**Option B: Configuration interactive (Recommandée)**

```bash
openclaw onboard --auth-choice venice-api-key
```

This will:

1. Prompt for your API key (or use existing `VENICE_API_KEY`)
2. Show all available Venice models
3. Let you pick your default model
4. Configure the provider automatically

**Option C: Non-interactive**

```bash
openclaw onboard --non-interactive \
  --auth-choice venice-api-key \
  --venice-api-key "vapi_xxxxxxxxxxxx"
```

### 3. Verify Setup

```bash
openclaw agent --model venice/kimi-k2-5 --message "Hello, are you working?"
```

## Model Selection

After setup, OpenClaw shows all available Venice models. Pick based on your needs:

- **Default model**: `venice/kimi-k2-5` for strong private reasoning plus vision.
- **High-capability option**: `venice/claude-opus-4-6` for the strongest anonymized Venice path.
- **Privacy**: Choose "private" models for fully private inference.
- **Capability**: Choose "anonymized" models to access Claude, GPT, Gemini via Venice's proxy.

Change your default model anytime:

```bash
openclaw models set venice/kimi-k2-5
openclaw models set venice/claude-opus-4-6
```

List all available models:

```bash
openclaw models list | grep venice
```

## Configure via `openclaw configure`

1. Run `openclaw configure`
2. Select **Model/auth**
3. Choose **Venice AI**

## Which Model Should I Use?

| Use Case                   | Recommended Model                | Why                                          |
| -------------------------- | -------------------------------- | -------------------------------------------- |
| **General chat (default)** | `kimi-k2-5`                      | Strong private reasoning plus vision         |
| **Best overall quality**   | `claude-opus-4-6`                | Strongest anonymized Venice option           |
| **Privacy + coding**       | `qwen3-coder-480b-a35b-instruct` | Private coding model with large context      |
| **Private vision**         | `kimi-k2-5`                      | Vision support without leaving private mode  |
| **Fast + cheap**           | `qwen3-4b`                       | Lightweight reasoning model                  |
| **Complex private tasks**  | `deepseek-v3.2`                  | Strong reasoning, but no Venice tool support |
| **Uncensored**             | `venice-uncensored`              | No content restrictions                      |

## Available Models (41 Total)

### Private Models (26) — Fully Private, No Logging

| Model ID                               | Name                                | Context | Features                   |
| -------------------------------------- | ----------------------------------- | ------- | -------------------------- |
| `kimi-k2-5`                            | Kimi K2.5                           | 256k    | Default, reasoning, vision |
| `kimi-k2-thinking`                     | Kimi K2 Thinking                    | 256k    | Reasoning                  |
| `llama-3.3-70b`                        | Llama 3.3 70B                       | 128k    | General                    |
| `llama-3.2-3b`                         | Llama 3.2 3B                        | 128k    | General                    |
| `hermes-3-llama-3.1-405b`              | Hermes 3 Llama 3.1 405B             | 128k    | General, tools disabled    |
| `qwen3-235b-a22b-thinking-2507`        | Qwen3 235B Thinking                 | 128k    | Reasoning                  |
| `qwen3-235b-a22b-instruct-2507`        | Qwen3 235B Instruct                 | 128k    | General                    |
| `qwen3-coder-480b-a35b-instruct`       | Qwen3 Coder 480B                    | 256k    | Coding                     |
| `qwen3-coder-480b-a35b-instruct-turbo` | Qwen3 Coder 480B Turbo              | 256k    | Coding                     |
| `qwen3-5-35b-a3b`                      | Qwen3.5 35B A3B                     | 256k    | Reasoning, vision          |
| `qwen3-next-80b`                       | Qwen3 Next 80B                      | 256k    | General                    |
| `qwen3-vl-235b-a22b`                   | Qwen3 VL 235B (Vision)              | 256k    | Vision                     |
| `qwen3-4b`                             | Venice Small (Qwen3 4B)             | 32k     | Fast, reasoning            |
| `deepseek-v3.2`                        | DeepSeek V3.2                       | 160k    | Reasoning, tools disabled  |
| `venice-uncensored`                    | Venice Uncensored (Dolphin-Mistral) | 32k     | Uncensored, tools disabled |
| `mistral-31-24b`                       | Venice Medium (Mistral)             | 128k    | Vision                     |
| `google-gemma-3-27b-it`                | Google Gemma 3 27B Instruct         | 198k    | Vision                     |
| `openai-gpt-oss-120b`                  | OpenAI GPT OSS 120B                 | 128k    | General                    |
| `nvidia-nemotron-3-nano-30b-a3b`       | NVIDIA Nemotron 3 Nano 30B          | 128k    | General                    |
| `olafangensan-glm-4.7-flash-heretic`   | GLM 4.7 Flash Heretic               | 128k    | Reasoning                  |
| `zai-org-glm-4.6`                      | GLM 4.6                             | 198k    | General                    |
| `zai-org-glm-4.7`                      | GLM 4.7                             | 198k    | Reasoning                  |
| `zai-org-glm-4.7-flash`                | GLM 4.7 Flash                       | 128k    | Reasoning                  |
| `zai-org-glm-5`                        | GLM 5                               | 198k    | Reasoning                  |
| `minimax-m21`                          | MiniMax M2.1                        | 198k    | Reasoning                  |
| `minimax-m25`                          | MiniMax M2.5                        | 198k    | Reasoning                  |

### Anonymized Models (15) — Via Venice Proxy

| Model ID                        | Name                           | Context | Features                     |
| ------------------------------- | ------------------------------ | ------- | ---------------------------- |
| `claude-opus-4-6`               | Claude Opus 4.6 (via Venice)   | 1M      | Reasoning, vision            |
| `claude-opus-4-5`               | Claude Opus 4.5 (via Venice)   | 198k    | Reasoning, vision            |
| `claude-sonnet-4-6`             | Claude Sonnet 4.6 (via Venice) | 1M      | Reasoning, vision            |
| `claude-sonnet-4-5`             | Claude Sonnet 4.5 (via Venice) | 198k    | Raisonnement, vision         |
| `openai-gpt-54`                 | GPT-5.4 (via Venice)           | 1M      | Raisonnement, vision         |
| `openai-gpt-53-codex`           | GPT-5.3 Codex (via Venice)     | 400k    | Raisonnement, vision, codage |
| `openai-gpt-52`                 | GPT-5.2 (via Venice)           | 256k    | Raisonnement                 |
| `openai-gpt-52-codex`           | GPT-5.2 Codex (via Venice)     | 256k    | Raisonnement, vision, codage |
| `openai-gpt-4o-2024-11-20`      | GPT-4o (via Venice)            | 128k    | Vision                       |
| `openai-gpt-4o-mini-2024-07-18` | GPT-4o Mini (via Venice)       | 128k    | Vision                       |
| `gemini-3-1-pro-preview`        | Gemini 3.1 Pro (via Venice)    | 1M      | Raisonnement, vision         |
| `gemini-3-pro-preview`          | Gemini 3 Pro (via Venice)      | 198k    | Raisonnement, vision         |
| `gemini-3-flash-preview`        | Gemini 3 Flash (via Venice)    | 256k    | Raisonnement, vision         |
| `grok-41-fast`                  | Grok 4.1 Fast (via Venice)     | 1M      | Raisonnement, vision         |
| `grok-code-fast-1`              | Grok Code Fast 1 (via Venice)  | 256k    | Raisonnement, codage         |

## Model Discovery

OpenClaw découvre automatiquement les modèles depuis l'Venice API lorsque `VENICE_API_KEY` est défini. Si l'API est inaccessible, il revient à un catalogue statique.

Le point de terminaison `/models` est public (aucune authentification requise pour la liste), mais l'inférence nécessite une clé API valide.

## Streaming et support des outils

| Fonctionnalité        | Support                                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| **Streaming**         | ✅ Tous les modèles                                                       |
| **Appel de fonction** | ✅ La plupart des modèles (vérifiez `supportsFunctionCalling` dans l'API) |
| **Vision/Images**     | ✅ Modèles marqués avec la fonctionnalité "Vision"                        |
| **Mode JSON**         | ✅ Pris en charge via `response_format`                                   |

## Tarification

Venice utilise un système à crédits. Consultez [venice.ai/pricing](https://venice.ai/pricing) pour les tarifs actuels :

- **Modèles privés** : Coût généralement inférieur
- **Modèles anonymisés** : Similaire à la tarification directe de l'API + petits frais Venice

## Comparaison : Venice vs API directe

| Aspect              | Venice (Anonymisé)                              | API directe                |
| ------------------- | ----------------------------------------------- | -------------------------- |
| **Confidentialité** | Métadonnées supprimées, anonymisées             | Votre compte lié           |
| **Latence**         | +10-50ms (proxy)                                | Direct                     |
| **Fonctionnalités** | La plupart des fonctionnalités prises en charge | Fonctionnalités complètes  |
| **Facturation**     | Crédits Venice                                  | Facturation du fournisseur |

## Exemples d'utilisation

```bash
# Use the default private model
openclaw agent --model venice/kimi-k2-5 --message "Quick health check"

# Use Claude Opus via Venice (anonymized)
openclaw agent --model venice/claude-opus-4-6 --message "Summarize this task"

# Use uncensored model
openclaw agent --model venice/venice-uncensored --message "Draft options"

# Use vision model with image
openclaw agent --model venice/qwen3-vl-235b-a22b --message "Review attached image"

# Use coding model
openclaw agent --model venice/qwen3-coder-480b-a35b-instruct --message "Refactor this function"
```

## Dépannage

### Clé API non reconnue

```bash
echo $VENICE_API_KEY
openclaw models list | grep venice
```

Assurez-vous que la clé commence par `vapi_`.

### Modèle non disponible

Le catalogue de modèles Venice est mis à jour dynamiquement. Exécutez `openclaw models list` pour voir les modèles actuellement disponibles. Certains modèles peuvent être temporairement hors ligne.

### Problèmes de connexion

L'Venice API se trouve à `https://api.venice.ai/api/v1`. Assurez-vous que votre réseau autorise les connexions HTTPS.

## Exemple de fichier de configuration

```json5
{
  env: { VENICE_API_KEY: "vapi_..." },
  agents: { defaults: { model: { primary: "venice/kimi-k2-5" } } },
  models: {
    mode: "merge",
    providers: {
      venice: {
        baseUrl: "https://api.venice.ai/api/v1",
        apiKey: "${VENICE_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "kimi-k2-5",
            name: "Kimi K2.5",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

## Liens

- [Venice AI](https://venice.ai)
- [Documentation API](https://docs.venice.ai)
- [Tarifs](https://venice.ai/pricing)
- [Statut](https://status.venice.ai)

import fr from '/components/footer/fr.mdx';

<fr />
