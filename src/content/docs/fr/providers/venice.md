---
summary: "Utiliser les modèles Venice axés sur la confidentialité dans OpenClaw"
read_when:
  - You want privacy-focused inference in OpenClaw
  - You want Venice AI setup guidance
title: "Venice AI"
---

# Venice AI

Venice AI fournit une **inférence IA axée sur la confidentialité** avec prise en charge des modèles non censurés et l'accès aux modèles propriétaires majeurs via leur proxy anonymisé. Toute inférence est privée par défaut — aucune formation sur vos données, aucune journalisation.

## Pourquoi Venice dans OpenClaw

- **Inférence privée** pour les modèles open source (pas de journalisation).
- **Modèles non censurés** lorsque vous en avez besoin.
- **Accès anonymisé** aux modèles propriétaires (Opus/GPT/Gemini) lorsque la qualité compte.
- Points de terminaison `/v1` compatibles avec OpenAI.

## Modes de confidentialité

Venice propose deux niveaux de confidentialité — comprendre cela est essentiel pour choisir votre modèle :

| Mode          | Description                                                                                                                                               | Modèles                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Privé**     | Entièrement privé. Les invites/réponses ne sont **jamais stockées ni journalisées**. Éphémère.                                                            | Llama, Qwen, DeepSeek, Kimi, MiniMax, Venice Uncensored, etc. |
| **Anonymisé** | Acheminé via un proxy Venice avec suppression des métadonnées. Le fournisseur sous-jacent (OpenAI, Anthropic, Google, xAI) voit des demandes anonymisées. | Claude, GPT, Gemini, Grok                                     |

<Warning>Les modèles anonymisés ne sont **pas** entièrement privés. Venice supprime les métadonnées avant le transfert, mais le fournisseur sous-jacent (OpenAI, Anthropic, Google, xAI) traite toujours la demande. Choisissez les modèles **Privés** lorsque la confidentialité totale est requise.</Warning>

## Fonctionnalités

- **Axé sur la confidentialité** : Choisissez entre les modes « privé » (entièrement privé) et « anonymisé » (via proxy)
- **Modèles non censurés** : Accès à des modèles sans restriction de contenu
- **Accès aux modèles majeurs** : Utilisez Claude, GPT, Gemini et Grok via le proxy anonymisé de Venice
- **OpenAI compatible API** : Points de terminaison `/v1` standard pour une intégration facile
- **Streaming** : Pris en charge sur tous les modèles
- **Appel de fonctions** : Pris en charge sur certains modèles (vérifiez les capacités du modèle)
- **Vision** : Pris en charge sur les modèles avec capacité de vision
- **Aucune limite de taux stricte** : Une limitation par utilisation équitable peut s'appliquer en cas d'utilisation extrême

## Getting started

<Steps>
  <Step title="Obtenir votre clé API">
    1. Inscrivez-vous sur [venice.ai](https://venice.ai)
    2. Allez dans **Settings > API Keys > Create new key**
    3. Copiez votre clé API (format : `vapi_xxxxxxxxxxxx`)
  </Step>
  <Step title="Configurer OpenClaw">
    Choisissez votre méthode de configuration préférée :

    <Tabs>
      <Tab title="Interactive (recommended)">
        ```bash
        openclaw onboard --auth-choice venice-api-key
        ```

        Cela permet de :
        1. Demander votre clé API (ou utiliser la clé `VENICE_API_KEY` existante)
        2. Afficher tous les modèles Venice disponibles
        3. Vous permettre de choisir votre modèle par défaut
        4. Configurer le fournisseur automatiquement
      </Tab>
      <Tab title="Environment variable">
        ```bash
        export VENICE_API_KEY="vapi_xxxxxxxxxxxx"
        ```
      </Tab>
      <Tab title="Non-interactive">
        ```bash
        openclaw onboard --non-interactive \
          --auth-choice venice-api-key \
          --venice-api-key "vapi_xxxxxxxxxxxx"
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step title="Vérifier la configuration">
    ```bash
    openclaw agent --model venice/kimi-k2-5 --message "Hello, are you working?"
    ```
  </Step>
</Steps>

## Sélection du modèle

Après la configuration, OpenClaw affiche tous les modèles Venice disponibles. Choisissez en fonction de vos besoins :

- **Modèle par défaut** : `venice/kimi-k2-5` pour un raisonnement privé puissant et la vision.
- **Option haute capacité** : `venice/claude-opus-4-6` pour le chemin Venice anonymisé le plus puissant.
- **Confidentialité** : Choisissez les modèles « private » pour une inférence entièrement privée.
- **Capacité** : Choisissez les modèles « anonymized » pour accéder à Claude, GPT, Gemini via le proxy de Venice.

Changez votre modèle par défaut à tout moment :

```bash
openclaw models set venice/kimi-k2-5
openclaw models set venice/claude-opus-4-6
```

Lister tous les modèles disponibles :

```bash
openclaw models list | grep venice
```

Vous pouvez également exécuter `openclaw configure`, sélectionner **Model/auth**, et choisir **Venice AI**.

<Tip>
Utilisez le tableau ci-dessous pour choisir le bon modèle pour votre cas d'utilisation.

| Cas d'utilisation                    | Modèle recommandé                | Pourquoi                                           |
| ------------------------------------ | -------------------------------- | -------------------------------------------------- |
| **Discussion générale (par défaut)** | `kimi-k2-5`                      | Raisonnement privé fort plus vision                |
| **Meilleure qualité globale**        | `claude-opus-4-6`                | Option Venice anonymisée la plus forte             |
| **Confidentialité + codage**         | `qwen3-coder-480b-a35b-instruct` | Modèle de codage privé avec un grand contexte      |
| **Vision privée**                    | `kimi-k2-5`                      | Support de la vision sans quitter le mode privé    |
| **Rapide + économique**              | `qwen3-4b`                       | Modèle de raisonnement léger                       |
| **Tâches privées complexes**         | `deepseek-v3.2`                  | Raisonnement fort, mais pas de support Venice tool |
| **Sans censure**                     | `venice-uncensored`              | Aucune restriction de contenu                      |

</Tip>

## Modèles disponibles (41 au total)

<AccordionGroup>
  <Accordion title="Modèles privés (26) — entièrement privés, aucune journalisation">
    | ID du modèle                             | Nom                                 | Contexte | Fonctionnalités              |
    | -------------------------------------- | ----------------------------------- | ------- | -------------------------- |
    | `kimi-k2-5`                            | Kimi K2.5                           | 256k    | Par défaut, raisonnement, vision |
    | `kimi-k2-thinking`                     | Kimi K2 Thinking                    | 256k    | Raisonnement                  |
    | `llama-3.3-70b`                        | Llama 3.3 70B                       | 128k    | Général                    |
    | `llama-3.2-3b`                         | Llama 3.2 3B                        | 128k    | Général                    |
    | `hermes-3-llama-3.1-405b`              | Hermes 3 Llama 3.1 405B            | 128k    | Général, outils désactivés    |
    | `qwen3-235b-a22b-thinking-2507`        | Qwen3 235B Thinking                | 128k    | Raisonnement                  |
    | `qwen3-235b-a22b-instruct-2507`        | Qwen3 235B Instruct                | 128k    | Général                    |
    | `qwen3-coder-480b-a35b-instruct`       | Qwen3 Coder 480B                   | 256k    | Codage                     |
    | `qwen3-coder-480b-a35b-instruct-turbo` | Qwen3 Coder 480B Turbo             | 256k    | Codage                     |
    | `qwen3-5-35b-a3b`                      | Qwen3.5 35B A3B                    | 256k    | Raisonnement, vision          |
    | `qwen3-next-80b`                       | Qwen3 Next 80B                     | 256k    | Général                    |
    | `qwen3-vl-235b-a22b`                   | Qwen3 VL 235B (Vision)             | 256k    | Vision                     |
    | `qwen3-4b`                             | Venice Small (Qwen3 4B)            | 32k     | Rapide, raisonnement            |
    | `deepseek-v3.2`                        | DeepSeek V3.2                      | 160k    | Raisonnement, outils désactivés  |
    | `venice-uncensored`                    | Venice Uncensored (Dolphin-Mistral) | 32k     | Non censuré, outils désactivés |
    | `mistral-31-24b`                       | Venice Medium (Mistral)            | 128k    | Vision                     |
    | `google-gemma-3-27b-it`                | Google Gemma 3 27B Instruct        | 198k    | Vision                     |
    | `openai-gpt-oss-120b`                  | OpenAI GPT OSS 120B               | 128k    | Général                    |
    | `nvidia-nemotron-3-nano-30b-a3b`       | NVIDIA Nemotron 3 Nano 30B         | 128k    | Général                    |
    | `olafangensan-glm-4.7-flash-heretic`   | GLM 4.7 Flash Heretic              | 128k    | Raisonnement                  |
    | `zai-org-glm-4.6`                      | GLM 4.6                            | 198k    | Général                    |
    | `zai-org-glm-4.7`                      | GLM 4.7                            | 198k    | Raisonnement                  |
    | `zai-org-glm-4.7-flash`                | GLM 4.7 Flash                      | 128k    | Raisonnement                  |
    | `zai-org-glm-5`                        | GLM 5                              | 198k    | Raisonnement                  |
    | `minimax-m21`                          | MiniMax M2.1                       | 198k    | Raisonnement                  |
    | `minimax-m25`                          | MiniMax M2.5                       | 198k    | Raisonnement                  |
  </Accordion>

  <Accordion title="Modèles anonymisés (15) — via proxy Venice">
    | ID de modèle                        | Nom                           | Contexte | Fonctionnalités                  |
    | ------------------------------- | ------------------------------ | ------- | ------------------------- |
    | `claude-opus-4-6`               | Claude Opus 4.6 (via Venice)   | 1M      | Raisonnement, vision         |
    | `claude-opus-4-5`               | Claude Opus 4.5 (via Venice)   | 198k    | Raisonnement, vision         |
    | `claude-sonnet-4-6`             | Claude Sonnet 4.6 (via Venice) | 1M      | Raisonnement, vision         |
    | `claude-sonnet-4-5`             | Claude Sonnet 4.5 (via Venice) | 198k    | Raisonnement, vision         |
    | `openai-gpt-54`                 | GPT-5.4 (via Venice)           | 1M      | Raisonnement, vision         |
    | `openai-gpt-53-codex`           | GPT-5.3 Codex (via Venice)     | 400k    | Raisonnement, vision, codage |
    | `openai-gpt-52`                 | GPT-5.2 (via Venice)           | 256k    | Raisonnement                 |
    | `openai-gpt-52-codex`           | GPT-5.2 Codex (via Venice)     | 256k    | Raisonnement, vision, codage |
    | `openai-gpt-4o-2024-11-20`      | GPT-4o (via Venice)            | 128k    | Vision                    |
    | `openai-gpt-4o-mini-2024-07-18` | GPT-4o Mini (via Venice)       | 128k    | Vision                    |
    | `gemini-3-1-pro-preview`        | Gemini 3.1 Pro (via Venice)    | 1M      | Raisonnement, vision         |
    | `gemini-3-pro-preview`          | Gemini 3 Pro (via Venice)      | 198k    | Raisonnement, vision         |
    | `gemini-3-flash-preview`        | Gemini 3 Flash (via Venice)    | 256k    | Raisonnement, vision         |
    | `grok-41-fast`                  | Grok 4.1 Fast (via Venice)     | 1M      | Raisonnement, vision         |
    | `grok-code-fast-1`              | Grok Code Fast 1 (via Venice)  | 256k    | Raisonnement, codage         |
  </Accordion>
</AccordionGroup>

## Découverte de modèles

OpenClaw découvre automatiquement les modèles à partir de Venice API lorsque `VENICE_API_KEY` est défini. Si API est inaccessible, il revient à un catalogue statique.

Le point de terminaison `/models` est public (aucune authentification requise pour la liste), mais l'inférence nécessite une clé API valide.

## Streaming et support des outils

| Fonctionnalité        | Support                                                              |
| --------------------- | -------------------------------------------------------------------- |
| **Streaming**         | Tous les modèles                                                     |
| **Appel de fonction** | La plupart des modèles (vérifiez `supportsFunctionCalling` dans API) |
| **Vision/Images**     | Modèles marqués avec la fonctionnalité "Vision"                      |
| **Mode JSON**         | Pris en charge via `response_format`                                 |

## Tarification

Venice utilise un système basé sur des crédits. Consultez [venice.ai/pricing](https://venice.ai/pricing) pour les tarifs actuels :

- **Modèles privés** : Coût généralement plus faible
- **Modèles anonymisés** : Similaire aux tarifs de l'API directe + petits frais Venice

### Venice (anonymisé) vs API directe

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

<AccordionGroup>
  <Accordion title="Clé API non reconnue">
    ```bash
    echo $VENICE_API_KEY
    openclaw models list | grep venice
    ```

    Assurez-vous que la clé commence par `vapi_`.

  </Accordion>

<Accordion title="Modèle non disponible">Le catalogue de modèles Venice est mis à jour dynamiquement. Exécutez `openclaw models list` pour voir les modèles actuellement disponibles. Certains modèles peuvent être temporairement hors ligne.</Accordion>

  <Accordion title="Problèmes de connexion">
    L'API Venice est située à `https://api.venice.ai/api/v1`. Assurez-vous que votre réseau autorise les connexions HTTPS.
  </Accordion>
</AccordionGroup>

<Note>Plus d'aide : [Dépannage](/fr/help/troubleshooting) et [FAQ](/fr/help/faq).</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Config file example">
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
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèle et le comportement de basculement.
  </Card>
  <Card title="Venice AI" href="https://venice.ai" icon="globe">
    Page d'accueil de Venice AI et inscription du compte.
  </Card>
  <Card title="Documentation de l'API" href="https://docs.venice.ai" icon="book">
    Référence de l'API Venice et documentation pour les développeurs.
  </Card>
  <Card title="Tarifs" href="https://venice.ai/pricing" icon="credit-card">
    Tarifs et plans de crédit Venice actuels.
  </Card>
</CardGroup>
