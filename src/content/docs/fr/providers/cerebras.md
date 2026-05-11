---
summary: "Configuration Cerebras (auth + sélection du modèle)"
title: "Cerebras"
read_when:
  - You want to use Cerebras with OpenClaw
  - You need the Cerebras API key env var or CLI auth choice
---

[Cerebras](https://www.cerebras.ai) fournit une inférence haute vitesse compatible OpenAI.

| Propriété   | Valeur                       |
| ----------- | ---------------------------- |
| Fournisseur | `cerebras`                   |
| Auth        | `CEREBRAS_API_KEY`           |
| API         | compatible OpenAI            |
| URL de base | `https://api.cerebras.ai/v1` |

## Getting Started

<Steps>
  <Step title="Obtenir une clé API">Créez une clé API dans la [Cerebras Cloud Console](https://cloud.cerebras.ai).</Step>
  <Step title="Exécuter l'onboarding">```bash openclaw onboard --auth-choice cerebras-api-key ```</Step>
  <Step title="Vérifier que les modèles sont disponibles">```bash openclaw models list --provider cerebras ```</Step>
</Steps>

### Configuration non interactive

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cerebras-api-key \
  --cerebras-api-key "$CEREBRAS_API_KEY"
```

## Catalogue intégré

OpenClaw fournit un catalogue statique Cerebras pour le point de terminaison public compatible OpenAI :

| Réf modèle                                | Nom                  | Notes                                                |
| ----------------------------------------- | -------------------- | ---------------------------------------------------- |
| `cerebras/zai-glm-4.7`                    | Z.ai GLM 4.7         | Modèle par défaut ; modèle de raisonnement en aperçu |
| `cerebras/gpt-oss-120b`                   | GPT OSS 120B         | Modèle de raisonnement de production                 |
| `cerebras/qwen-3-235b-a22b-instruct-2507` | Qwen 3 235B Instruct | Modèle non raisonneur en aperçu                      |
| `cerebras/llama3.1-8b`                    | Llama 3.1 8B         | Modèle de production axé sur la vitesse              |

<Warning>Cerebras marque `zai-glm-4.7` et `qwen-3-235b-a22b-instruct-2507` comme des modèles en aperçu, et `llama3.1-8b` / `qwen-3-235b-a22b-instruct-2507` sont documentés pour être dépréciés le 27 mai 2026. Vérifiez la page des modèles pris en charge de Cerebras avant de vous y fier pour la production.</Warning>

## Configuration manuelle

Le plugin groupé signifie généralement que vous n'avez besoin que de la clé API. Utilisez une configuration explicite
`models.providers.cerebras` lorsque vous souhaitez remplacer les métadonnées du modèle :

```json5
{
  env: { CEREBRAS_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "cerebras/zai-glm-4.7" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      cerebras: {
        baseUrl: "https://api.cerebras.ai/v1",
        apiKey: "${CEREBRAS_API_KEY}",
        api: "openai-completions",
        models: [
          { id: "zai-glm-4.7", name: "Z.ai GLM 4.7" },
          { id: "gpt-oss-120b", name: "GPT OSS 120B" },
        ],
      },
    },
  },
}
```

<Note>Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `CEREBRAS_API_KEY` est disponible pour ce processus, par exemple dans `~/.openclaw/.env` ou via `env.shellEnv`.</Note>
