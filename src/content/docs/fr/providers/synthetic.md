---
summary: "Utilisez l'API Anthropic compatible de Synthetic dans API"
read_when:
  - You want to use Synthetic as a model provider
  - You need a Synthetic API key or base URL setup
title: "Synthetic"
---

# Synthetic

[Synthetic](https://synthetic.new) expose des points de terminaison compatibles Anthropic.
OpenClaw l'enregistre en tant que fournisseur `synthetic` et utilise l'Anthropic de messages API.

| Propriété   | Valeur                                |
| ----------- | ------------------------------------- |
| Fournisseur | `synthetic`                           |
| Auth        | `SYNTHETIC_API_KEY`                   |
| API         | Messages Anthropic                    |
| URL de base | `https://api.synthetic.new/anthropic` |

## Getting started

<Steps>
  <Step title="Obtenir une clé API">Obtenez un `SYNTHETIC_API_KEY` à partir de votre compte Synthetic, ou laissez l'assistant de configuration vous en demander un.</Step>
  <Step title="Exécuter l'intégration">```bash openclaw onboard --auth-choice synthetic-api-key ```</Step>
  <Step title="Vérifier le modèle par défaut">Après l'intégration, le modèle par défaut est défini sur : ``` synthetic/hf:MiniMaxAI/MiniMax-M2.5 ```</Step>
</Steps>

<Warning>Le client OpenClaw de Anthropic ajoute `/v1` à l'URL de base automatiquement, utilisez donc `https://api.synthetic.new/anthropic` (et non `/anthropic/v1`). Si Synthetic modifie son URL de base, remplacez `models.providers.synthetic.baseUrl`.</Warning>

## Exemple de configuration

```json5
{
  env: { SYNTHETIC_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" },
      models: { "synthetic/hf:MiniMaxAI/MiniMax-M2.5": { alias: "MiniMax M2.5" } },
    },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [
          {
            id: "hf:MiniMaxAI/MiniMax-M2.5",
            name: "MiniMax M2.5",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 192000,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}
```

## Catalogue de modèles

Tous les modèles Synthetic utilisent le coût `0` (entrée/sortie/cache).

| ID du modèle                                           | Fenêtre de contexte | Max tokens | Raisonnement | Entrée        |
| ------------------------------------------------------ | ------------------- | ---------- | ------------ | ------------- |
| `hf:MiniMaxAI/MiniMax-M2.5`                            | 192,000             | 65,536     | non          | texte         |
| `hf:moonshotai/Kimi-K2-Thinking`                       | 256,000             | 8,192      | oui          | texte         |
| `hf:zai-org/GLM-4.7`                                   | 198,000             | 128,000    | non          | texte         |
| `hf:deepseek-ai/DeepSeek-R1-0528`                      | 128,000             | 8,192      | non          | texte         |
| `hf:deepseek-ai/DeepSeek-V3-0324`                      | 128,000             | 8,192      | non          | texte         |
| `hf:deepseek-ai/DeepSeek-V3.1`                         | 128,000             | 8,192      | non          | texte         |
| `hf:deepseek-ai/DeepSeek-V3.1-Terminus`                | 128,000             | 8,192      | non          | texte         |
| `hf:deepseek-ai/DeepSeek-V3.2`                         | 159,000             | 8,192      | non          | texte         |
| `hf:meta-llama/Llama-3.3-70B-Instruct`                 | 128,000             | 8,192      | non          | texte         |
| `hf:meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | 524,000             | 8,192      | non          | texte         |
| `hf:moonshotai/Kimi-K2-Instruct-0905`                  | 256,000             | 8,192      | non          | texte         |
| `hf:moonshotai/Kimi-K2.5`                              | 256,000             | 8,192      | oui          | texte + image |
| `hf:openai/gpt-oss-120b`                               | 128,000             | 8,192      | non          | texte         |
| `hf:Qwen/Qwen3-235B-A22B-Instruct-2507`                | 256,000             | 8,192      | non          | texte         |
| `hf:Qwen/Qwen3-Coder-480B-A35B-Instruct`               | 256,000             | 8,192      | non          | texte         |
| `hf:Qwen/Qwen3-VL-235B-A22B-Instruct`                  | 250,000             | 8,192      | non          | texte + image |
| `hf:zai-org/GLM-4.5`                                   | 128,000             | 128,000    | non          | texte         |
| `hf:zai-org/GLM-4.6`                                   | 198,000             | 128,000    | non          | texte         |
| `hf:zai-org/GLM-5`                                     | 256,000             | 128,000    | oui          | texte + image |
| `hf:deepseek-ai/DeepSeek-V3`                           | 128,000             | 8,192      | non          | texte         |
| `hf:Qwen/Qwen3-235B-A22B-Thinking-2507`                | 256,000             | 8,192      | oui          | texte         |

<Tip>
Les références de modèle utilisent le format `synthetic/<modelId>`. Utilisez
`openclaw models list --provider synthetic` pour voir tous les modèles disponibles sur votre
compte.
</Tip>

<AccordionGroup>
  <Accordion title="Liste d'autorisation de modèles">
    Si vous activez une liste d'autorisation de modèles (`agents.defaults.models`), ajoutez chaque
    modèle Synthetic que vous prévoyez d'utiliser. Les modèles qui ne figurent pas dans la liste d'autorisation seront masqués
    pour l'agent.
  </Accordion>

  <Accordion title="Remplacement de l'URL de base">
    Si Synthetic modifie son point de terminaison API, remplacez l'URL de base dans votre configuration :

    ```json5
    {
      models: {
        providers: {
          synthetic: {
            baseUrl: "https://new-api.synthetic.new/anthropic",
          },
        },
      },
    }
    ```

    N'oubliez pas que OpenClaw ajoute `/v1` automatiquement.

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Fournisseurs de modèles" href="/fr/concepts/model-providers" icon="layers">
    Règles de fournisseur, références de modèle et comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Schéma de configuration complet incluant les paramètres du fournisseur.
  </Card>
  <Card title="Synthetic" href="https://synthetic.new" icon="arrow-up-right-from-square">
    Tableau de bord Synthetic et documentation API.
  </Card>
</CardGroup>
