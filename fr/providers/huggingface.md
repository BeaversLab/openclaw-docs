---
summary: "Configuration de Hugging Face Inference (auth + sélection du modèle)"
read_when:
  - You want to use Hugging Face Inference with OpenClaw
  - You need the HF token env var or CLI auth choice
title: "Hugging Face (Inférence)"
---

# Hugging Face (Inférence)

[Les fournisseurs d'inférence Hugging Face](https://huggingface.co/docs/inference-providers) proposent des complérations de chat compatibles avec OpenAI via une API de routeur unique. Vous avez accès à de nombreux modèles (DeepSeek, Llama, etc.) avec un seul jeton. OpenClaw utilise le **point de terminaison compatible API** (complétions de chat uniquement) ; pour la synthèse texte-image, les embeddings ou la parole, utilisez directement les [clients d'inférence HF](https://huggingface.co/docs/api-inference/quicktour).

- Fournisseur : `huggingface`
- Auth : `HUGGINGFACE_HUB_TOKEN` ou `HF_TOKEN` (jeton à granularité fine avec **Effectuer des appels aux fournisseurs d'inférence**)
- API : compatible OpenAI (`https://router.huggingface.co/v1`)
- Facturation : Jeton HF unique ; la [tarification](https://huggingface.co/docs/inference-providers/pricing) suit les tarifs des fournisseurs avec un palier gratuit.

## Démarrage rapide

1. Créez un jeton à granularité fine dans [Hugging Face → Paramètres → Jetons](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) avec l'autorisation **Effectuer des appels aux fournisseurs d'inférence**.
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

Si la Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `HUGGINGFACE_HUB_TOKEN` ou `HF_TOKEN`
est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via
`env.shellEnv`).

## Liste déroulante de découverte de modèles et d'intégration

OpenClaw découvre les modèles en appelant le **point de terminaison d'inférence directement** :

```bash
GET https://router.huggingface.co/v1/models
```

(Optionnel : envoyez `Authorization: Bearer $HUGGINGFACE_HUB_TOKEN` ou `$HF_TOKEN` pour la liste complète ; certains points de terminaison renvoient un sous-ensemble sans authentification.) La réponse est au style OpenAI `{ "object": "list", "data": [ { "id": "Qwen/Qwen3-8B", "owned_by": "Qwen", ... }, ... ] }`.

Lorsque vous configurez une clé API Hugging Face (via l'intégration, `HUGGINGFACE_HUB_TOKEN`, ou `HF_TOKEN`), OpenClaw utilise cette requête GET pour découvrir les modèles de chat-complétion disponibles. Pendant **l'intégration interactive**, après avoir saisi votre jeton, vous voyez une liste déroulante **Modèle Hugging Face par défaut** remplie à partir de cette liste (ou du catalogue intégré si la requête échoue). Au moment de l'exécution (par exemple au démarrage du Gateway), lorsqu'une clé est présente, OpenClaw appelle à nouveau **GET** `https://router.huggingface.co/v1/models` pour actualiser le catalogue. La liste est fusionnée avec un catalogue intégré (pour les métadonnées telles que la fenêtre contextuelle et le coût). Si la requête échoue ou si aucune clé n'est définie, seul le catalogue intégré est utilisé.

## Noms des modèles et options modifiables

- **Nom provenant de API :** Le nom d'affichage du modèle est **récupéré depuis GET /v1/models** lorsque API renvoie `name`, `title` ou `display_name` ; sinon il est dérivé de l'identifiant du modèle (par exemple `deepseek-ai/DeepSeek-R1` → « DeepSeek R1 »).
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

- **Sélection du fournisseur / de la stratégie :** Ajoutez un suffixe à **l'identifiant du modèle** pour choisir la manière dont le routeur sélectionne le backend :
  - **`:fastest`** — débit le plus élevé (choisi par le routeur ; le choix du fournisseur est **verrouillé** — pas de sélecteur backend interactif).
  - **`:cheapest`** — coût le plus faible par jeton de sortie (choisi par le routeur ; le choix du fournisseur est **verrouillé**).
  - **`:provider`** — forcer un backend spécifique (par exemple `:sambanova`, `:together`).

  Lorsque vous sélectionnez **:cheapest** ou **:fastest** (par exemple dans la liste déroulante des models d'onboarding), le fournisseur est verrouillé : le routeur décide en fonction du coût ou de la vitesse et aucune étape optionnelle « préférer un backend spécifique » n'est affichée. Vous pouvez ajouter ces éléments comme entrées distinctes dans `models.providers.huggingface.models` ou définir `model.primary` avec le suffixe. Vous pouvez également définir votre ordre par défaut dans les [Paramètres du fournisseur d'inférence](https://hf.co/settings/inference-providers) (pas de suffixe = utiliser cet ordre).

- **Fusion de la configuration :** Les entrées existantes dans `models.providers.huggingface.models` (par exemple dans `models.json`) sont conservées lors de la fusion de la configuration. Ainsi, toutes les options personnalisées `name`, `alias`, ou de model que vous y avez définies sont préservées.

## Identifiants de model et exemples de configuration

Les références de model utilisent le format `huggingface/<org>/<model>` (identifiants de style Hub). La liste ci-dessous provient de **GET** `https://router.huggingface.co/v1/models` ; votre catalogue peut en inclure davantage.

**Exemples d'identifiants (à partir du point de terminaison d'inférence) :**

| Model                  | Réf (préfixe avec `huggingface/`)   |
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

Vous pouvez ajouter `:fastest`, `:cheapest` ou `:provider` (par exemple `:together`, `:sambanova`) à l'identifiant du model. Définissez votre ordre par défaut dans les [Paramètres du fournisseur d'inférence](https://hf.co/settings/inference-providers) ; consultez [Fournisseurs d'inférence](https://huggingface.co/docs/inference-providers) et **GET** `https://router.huggingface.co/v1/models` pour la liste complète.

### Exemples de configuration complets

**DeepSeek R1 principal avec repli vers Qwen :**

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

**Qwen comme défaut, avec les variantes :cheapest et :fastest :**

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

**DeepSeek + Llama + GPT-OSS avec des alias :**

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "huggingface/deepseek-ai/DeepSeek-V3.2",
        fallbacks: [
          "huggingface/meta-llama/Llama-3.3-70B-Instruct",
          "huggingface/openai/gpt-oss-120b",
        ],
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

**Forcer un backend spécifique avec :provider :**

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/deepseek-ai/DeepSeek-R1:together" },
      models: {
        "huggingface/deepseek-ai/DeepSeek-R1:together": { alias: "DeepSeek R1 (Together)" },
      },
    },
  },
}
```

**Plusieurs modèles Qwen et DeepSeek avec des suffixes de stratégie :**

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

import fr from "/components/footer/fr.mdx";

<fr />
