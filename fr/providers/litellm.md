---
summary: "Exécuter OpenClaw via le proxy LiteLLM pour un accès unifié aux modèles et le suivi des coûts"
read_when:
  - You want to route OpenClaw through a LiteLLM proxy
  - You need cost tracking, logging, or model routing through LiteLLM
---

# LiteLLM

[LiteLLM](https://litellm.ai) est une passerelle LLM open source qui fournit une API unifiée pour plus de 100 fournisseurs de modèles. Acheminez OpenClaw via LiteLLM pour bénéficier d'un suivi centralisé des coûts, de journaux et de la flexibilité de changer de backend sans modifier votre configuration OpenClaw.

## Pourquoi utiliser LiteLLM avec OpenClaw ?

- **Suivi des coûts** — Voyez exactement ce que OpenClaw dépense pour tous les modèles
- **Acheminement des modèles** — Basculez entre Claude, GPT-4, Gemini, Bedrock sans modifier la configuration
- **Clés virtuelles** — Créez des clés avec des limites de dépenses pour OpenClaw
- **Journalisation** — Journaux complets des requêtes/réponses pour le débogage
- **Secours** — Bascule automatique si votre fournisseur principal est en panne

## Quick start

### Via onboarding

```bash
openclaw onboard --auth-choice litellm-api-key
```

### Configuration manuelle

1. Démarrez le proxy LiteLLM :

```bash
pip install 'litellm[proxy]'
litellm --model claude-opus-4-6
```

2. Pointez OpenClaw vers LiteLLM :

```bash
export LITELLM_API_KEY="your-litellm-key"

openclaw
```

C'est tout. OpenClaw est maintenant acheminé via LiteLLM.

## Configuration

### Variables d'environnement

```bash
export LITELLM_API_KEY="sk-litellm-key"
```

### Fichier de configuration

```json5
{
  models: {
    providers: {
      litellm: {
        baseUrl: "http://localhost:4000",
        apiKey: "${LITELLM_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "claude-opus-4-6",
            name: "Claude Opus 4.6",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 200000,
            maxTokens: 64000,
          },
          {
            id: "gpt-4o",
            name: "GPT-4o",
            reasoning: false,
            input: ["text", "image"],
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "litellm/claude-opus-4-6" },
    },
  },
}
```

## Clés virtuelles

Créez une clé dédiée pour OpenClaw avec des limites de dépenses :

```bash
curl -X POST "http://localhost:4000/key/generate" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key_alias": "openclaw",
    "max_budget": 50.00,
    "budget_duration": "monthly"
  }'
```

Utilisez la clé générée comme `LITELLM_API_KEY`.

## Acheminement des modèles

LiteLLM peut acheminer les demandes de modèles vers différents backends. Configurez cela dans votre `config.yaml` LiteLLM :

```yaml
model_list:
  - model_name: claude-opus-4-6
    litellm_params:
      model: claude-opus-4-6
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: gpt-4o
    litellm_params:
      model: gpt-4o
      api_key: os.environ/OPENAI_API_KEY
```

OpenClaw continue à demander `claude-opus-4-6` — LiteLLM gère l'acheminement.

## Affichage de l'utilisation

Consultez le tableau de bord LiteLLM ou l'API :

```bash
# Key info
curl "http://localhost:4000/key/info" \
  -H "Authorization: Bearer sk-litellm-key"

# Spend logs
curl "http://localhost:4000/spend/logs" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY"
```

## Notes

- LiteLLM s'exécute sur `http://localhost:4000` par défaut
- OpenClaw se connecte via le point de terminaison `/v1/chat/completions` compatible OpenAI
- Toutes les fonctionnalités OpenClaw fonctionnent via LiteLLM — aucune limitation

## Voir aussi

- [Documentation LiteLLM](https://docs.litellm.ai)
- [Fournisseurs de modèles](/fr/concepts/model-providers)

import fr from '/components/footer/fr.mdx';

<fr />
