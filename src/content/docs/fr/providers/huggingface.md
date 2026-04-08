---
summary: "Configuration de l'inférence Hugging Face (auth + sélection de modèle)"
read_when:
  - You want to use Hugging Face Inference with OpenClaw
  - You need the HF token env var or CLI auth choice
title: "Hugging Face (Inference)"
---

# Hugging Face (Inférence)

[Les fournisseurs d'inférence Hugging Face](https://huggingface.co/docs/inference-providers) offrent des compléments de chat compatibles OpenAI via une seule API de routage. Vous avez accès à de nombreux modèles (DeepSeek, Llama, etc.) avec un seul jeton. OpenClaw utilise le **point de terminaison compatible OpenAI** (compléments de chat uniquement) ; pour la synthèse d'image, les embeddings ou la synthèse vocale, utilisez directement les [clients d'inférence HF](https://huggingface.co/docs/api-inference/quicktour).

- Provider : `huggingface`
- Auth : `HUGGINGFACE_HUB_TOKEN` ou `HF_TOKEN` (jeton à granularité fine avec **Make calls to Inference Providers**)
- API : Compatible OpenAI (`https://router.huggingface.co/v1`)
- Facturation : Jeton HF unique ; la [tarification](https://huggingface.co/docs/inference-providers/pricing) suit les taux des fournisseurs avec un palier gratuit.

## Démarrage rapide

1. Créez un jeton à granularité fine sur [Hugging Face → Paramètres → Jetons](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) avec la permission **Make calls to Inference Providers**.
2. Lancez l'intégration (onboarding) et choisissez **Hugging Face** dans la liste déroulante des fournisseurs, puis entrez votre clé API lorsqu'on vous le demande :

```bash
openclaw onboard --auth-choice huggingface-api-key
```

3. Dans la liste déroulante **Modèle Hugging Face par défaut**, sélectionnez le modèle de votre choix (la liste est chargée à partir de l'API d'inférence API lorsque vous disposez d'un jeton valide ; sinon, une liste intégrée est affichée). Votre choix est enregistré en tant que modèle par défaut.
4. Vous pouvez également définir ou modifier le modèle par défaut ultérieurement dans la configuration :

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/deepseek-ai/DeepSeek-R1" },
    },
  },
}
```

## Exemple non interactif

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice huggingface-api-key \
  --huggingface-api-key "$HF_TOKEN"
```

Cela définira `huggingface/deepseek-ai/DeepSeek-R1` comme modèle par défaut.

## Note sur l'environnement

Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `HUGGINGFACE_HUB_TOKEN` ou `HF_TOKEN`
est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via
`env.shellEnv`).

## Liste déroulante de découverte de modèles et d'intégration

OpenClaw découvre les modèles en appelant le **point de terminaison d'inférence directement** :

```bash
GET https://router.huggingface.co/v1/models
```

(Optionnel : envoyez `Authorization: Bearer $HUGGINGFACE_HUB_TOKEN` ou `$HF_TOKEN` pour la liste complète ; certains points de terminaison renvoient un sous-ensemble sans auth.) La réponse est au style OpenAI `{ "object": "list", "data": [ { "id": "Qwen/Qwen3-8B", "owned_by": "Qwen", ... }, ... ] }`.

Lorsque vous configurez une clé API Hugging Face (via l'onboarding, `HUGGINGFACE_HUB_TOKEN`, ou `HF_TOKEN`), API utilise cette requête GET pour découvrir les modèles de complétion de chat disponibles. Pendant la **configuration interactive**, après avoir saisi votre jeton, vous voyez une liste déroulante **Modèle Hugging Face par défaut** remplie à partir de cette liste (ou du catalogue intégré si la requête échoue). Au moment de l'exécution (par exemple, démarrage du OpenClaw), lorsqu'une clé est présente, Gateway appelle à nouveau **GET** `https://router.huggingface.co/v1/models` pour actualiser le catalogue. La liste est fusionnée avec un catalogue intégré (pour les métadonnées telles que la fenêtre de contexte et le coût). Si la requête échoue ou si aucune clé n'est définie, seul le catalogue intégré est utilisé.

## Noms des modèles et options modifiables

- **Nom provenant de l'API :** Le nom d'affichage du modèle est **récupéré depuis GET /v1/models** lorsque l'API renvoie `name`, `title` ou `display_name` ; sinon, il est dérivé de l'ID du modèle (par exemple `deepseek-ai/DeepSeek-R1` → « DeepSeek R1 »).
- **Remplacer le nom d'affichage :** Vous pouvez définir une étiquette personnalisée par modèle dans la configuration pour qu'elle apparaisse comme vous le souhaitez dans CLI et l'interface utilisateur :

```json5
{
  agents: {
    defaults: {
      models: {
        "huggingface/deepseek-ai/DeepSeek-R1": { alias: "DeepSeek R1 (fast)" },
        "huggingface/deepseek-ai/DeepSeek-R1:cheapest": { alias: "DeepSeek R1 (cheap)" },
      },
    },
  },
}
```

- **Suffixes de stratégie :** La documentation et les assistants Hugging Face fournis avec OpenClaw traitent actuellement ces deux suffixes comme des variantes de stratégie intégrées :
  - **`:fastest`** — débit le plus élevé.
  - **`:cheapest`** — coût le plus bas par jeton de sortie.

  Vous pouvez les ajouter en tant qu'entrées séparées dans `models.providers.huggingface.models` ou définir `model.primary` avec le suffixe. Vous pouvez également définir l'ordre de votre provider par défaut dans [Paramètres du provider d'inférence](https://hf.co/settings/inference-providers) (pas de suffixe = utiliser cet ordre).

- **Fusion de la configuration :** Les entrées existantes dans `models.providers.huggingface.models` (par exemple dans `models.json`) sont conservées lors de la fusion de la configuration. Ainsi, tout `name` personnalisé, `alias` ou options de modèle que vous y définissez sont conservés.

## ID de modèle et exemples de configuration

Les références de modèle utilisent le format `huggingface/<org>/<model>` (ID de style Hub). La liste ci-dessous provient de **GET** `https://router.huggingface.co/v1/models` ; votre catalogue peut en inclure davantage.

**Exemples d'ID (à partir du endpoint d'inférence) :**

| Modèle                 | Réf (préfixe avec `huggingface/`)   |
| ---------------------- | ----------------------------------- |
| DeepSeek R1            | `deepseek-ai/DeepSeek-R1`           |
| DeepSeek V3.2          | `deepseek-ai/DeepSeek-V3.2`         |
| Qwen3 8B               | `Qwen/Qwen3-8B`                     |
| Qwen2.5 7B Instruct    | `Qwen/Qwen2.5-7B-Instruct`          |
| Qwen3 32B              | `Qwen/Qwen3-32B`                    |
| Llama 3.3 70B Instruct | `meta-llama/Llama-3.3-70B-Instruct` |
| Llama 3.1 8B Instruct  | `meta-llama/Llama-3.1-8B-Instruct`  |
| GPT-OSS 120B           | `openai/gpt-oss-120b`               |
| GLM 4.7                | `zai-org/GLM-4.7`                   |
| Kimi K2.5              | `moonshotai/Kimi-K2.5`              |

Vous pouvez ajouter `:fastest` ou `:cheapest` à l'identifiant du modèle. Définissez votre ordre par défaut dans les [Paramètres du fournisseur d'inférence](https://hf.co/settings/inference-providers) ; voir [Fournisseurs d'inférence](https://huggingface.co/docs/inference-providers) et **GET** `https://router.huggingface.co/v1/models` pour la liste complète.

### Exemples de configuration complets

**DeepSeek R1 principal avec secours Qwen :**

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "huggingface/deepseek-ai/DeepSeek-R1",
        fallbacks: ["huggingface/Qwen/Qwen3-8B"],
      },
      models: {
        "huggingface/deepseek-ai/DeepSeek-R1": { alias: "DeepSeek R1" },
        "huggingface/Qwen/Qwen3-8B": { alias: "Qwen3 8B" },
      },
    },
  },
}
```

**Qwen par défaut, avec les variantes :cheapest et :fastest :**

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/Qwen/Qwen3-8B" },
      models: {
        "huggingface/Qwen/Qwen3-8B": { alias: "Qwen3 8B" },
        "huggingface/Qwen/Qwen3-8B:cheapest": { alias: "Qwen3 8B (cheapest)" },
        "huggingface/Qwen/Qwen3-8B:fastest": { alias: "Qwen3 8B (fastest)" },
      },
    },
  },
}
```

**DeepSeek + Llama + GPT-OSS avec alias :**

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "huggingface/deepseek-ai/DeepSeek-V3.2",
        fallbacks: ["huggingface/meta-llama/Llama-3.3-70B-Instruct", "huggingface/openai/gpt-oss-120b"],
      },
      models: {
        "huggingface/deepseek-ai/DeepSeek-V3.2": { alias: "DeepSeek V3.2" },
        "huggingface/meta-llama/Llama-3.3-70B-Instruct": { alias: "Llama 3.3 70B" },
        "huggingface/openai/gpt-oss-120b": { alias: "GPT-OSS 120B" },
      },
    },
  },
}
```

**Plusieurs modèles Qwen et DeepSeek avec suffixes de stratégie :**

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/Qwen/Qwen2.5-7B-Instruct:cheapest" },
      models: {
        "huggingface/Qwen/Qwen2.5-7B-Instruct": { alias: "Qwen2.5 7B" },
        "huggingface/Qwen/Qwen2.5-7B-Instruct:cheapest": { alias: "Qwen2.5 7B (cheap)" },
        "huggingface/deepseek-ai/DeepSeek-R1:fastest": { alias: "DeepSeek R1 (fast)" },
        "huggingface/meta-llama/Llama-3.1-8B-Instruct": { alias: "Llama 3.1 8B" },
      },
    },
  },
}
```
