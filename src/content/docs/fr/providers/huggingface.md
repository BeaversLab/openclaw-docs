---
summary: "Configuration de l'inférence Hugging Face (auth + sélection de modèle)"
read_when:
  - You want to use Hugging Face Inference with OpenClaw
  - You need the HF token env var or CLI auth choice
title: "Hugging Face (Inférence)"
---

# Hugging Face (Inférence)

Les [fournisseurs d'inférence Hugging Face](https://huggingface.co/docs/inference-providers) offrent des compléments de chat compatibles avec OpenAI via une API de routeur unique. Vous accédez à de nombreux modèles (DeepSeek, Llama, etc.) avec un seul jeton. OpenClaw utilise le **point de terminaison compatible avec OpenAI** (compléments de chat uniquement) ; pour la synthèse d'image, les embeddings ou la synthèse vocale, utilisez directement les [clients d'inférence HF](https://huggingface.co/docs/api-inference/quicktour).

- Fournisseur : `huggingface`
- Auth : `HUGGINGFACE_HUB_TOKEN` ou `HF_TOKEN` (jeton granulaire avec **Make calls to Inference Providers**)
- API : Compatible avec OpenAI (`https://router.huggingface.co/v1`)
- Facturation : Jeton HF unique ; la [tarification](https://huggingface.co/docs/inference-providers/pricing) suit les taux des fournisseurs avec un niveau gratuit.

## Getting started

<Steps>
  <Step title="Créer un jeton granulaire">
    Allez dans [Paramètres des jetons Hugging Face](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) et créez un nouveau jeton granulaire.

    <Warning>
    Le jeton doit avoir l'autorisation **Make calls to Inference Providers** activée, sinon les requêtes API seront rejetées.
    </Warning>

  </Step>
  <Step title="Exécuter l'onboarding">
    Choisissez **Hugging Face** dans la liste déroulante des fournisseurs, puis entrez votre clé API lorsqu'on vous le demande :

    ```bash
    openclaw onboard --auth-choice huggingface-api-key
    ```

  </Step>
  <Step title="Sélectionner un modèle par défaut">
    Dans la liste déroulante **Modèle Hugging Face par défaut**, choisissez le modèle souhaité. La liste est chargée depuis l'API d'inférence lorsque vous disposez d'un jeton valide ; sinon, une liste intégrée est affichée. Votre choix est enregistré en tant que modèle par défaut.

    Vous pouvez également définir ou modifier le modèle par défaut ultérieurement dans la configuration :

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "huggingface/deepseek-ai/DeepSeek-R1" },
        },
      },
    }
    ```

  </Step>
  <Step title="Vérifier que le modèle est disponible">
    ```bash
    openclaw models list --provider huggingface
    ```
  </Step>
</Steps>

### Configuration non interactive

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice huggingface-api-key \
  --huggingface-api-key "$HF_TOKEN"
```

Cela définira `huggingface/deepseek-ai/DeepSeek-R1` comme modèle par défaut.

## ID de modèle

Les références de modèle utilisent le format `huggingface/<org>/<model>` (ID de style Hub). La liste ci-dessous provient de **GET** `https://router.huggingface.co/v1/models` ; votre catalogue peut en inclure davantage.

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

<Tip>Vous pouvez ajouter `:fastest` ou `:cheapest` à n'importe quel ID de modèle. Définissez votre ordre par défaut dans les [Paramètres du fournisseur d'inférence](https://hf.co/settings/inference-providers) ; voir [Fournisseurs d'inférence](https://huggingface.co/docs/inference-providers) et **GET** `https://router.huggingface.co/v1/models` pour la liste complète.</Tip>

## Détails avancés

<AccordionGroup>
  <Accordion title="Model discovery and onboarding dropdown">
    OpenClaw découvre les modèles en appelant directement le **point de terminaison d'inférence** :

    ```bash
    GET https://router.huggingface.co/v1/models
    ```

    (Optionnel : envoyez `Authorization: Bearer $HUGGINGFACE_HUB_TOKEN` ou `$HF_TOKEN` pour la liste complète ; certains points de terminaison renvoient un sous-ensemble sans authentification.) La réponse est au style OpenAI `{ "object": "list", "data": [ { "id": "Qwen/Qwen3-8B", "owned_by": "Qwen", ... }, ... ] }`.

    Lorsque vous configurez une clé API Hugging Face (via l'intégration, `HUGGINGFACE_HUB_TOKEN`, ou `HF_TOKEN`), OpenClaw utilise ce GET pour découvrir les modèles de complétion de chat disponibles. Pendant la **configuration interactive**, après avoir saisi votre jeton, vous voyez une liste déroulante **Modèle Hugging Face par défaut** remplie à partir de cette liste (ou le catalogue intégré si la requête échoue). Au moment de l'exécution (par exemple, au démarrage du Gateway), lorsqu'une clé est présente, OpenClaw appelle à nouveau **GET** `https://router.huggingface.co/v1/models` pour actualiser le catalogue. La liste est fusionnée avec un catalogue intégré (pour les métadonnées telles que la fenêtre contextuelle et le coût). Si la requête échoue ou si aucune clé n'est définie, seul le catalogue intégré est utilisé.

  </Accordion>

  <Accordion title="Noms de modèles, alias et suffixes de stratégie">
    - **Nom provenant de API :** Le nom d'affichage du modèle est **récupéré depuis GET /v1/models** lorsque l'API renvoie `name`, `title` ou `display_name` ; sinon, il est dérivé de l'identifiant du modèle (par exemple, `deepseek-ai/DeepSeek-R1` devient « DeepSeek R1 »).
    - **Remplacer le nom d'affichage :** Vous pouvez définir une étiquette personnalisée pour chaque modèle dans la configuration afin qu'elle apparaisse comme vous le souhaitez dans la CLI et l'interface utilisateur :

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

    - **Suffixes de stratégie :** La documentation et les helpers Hugging Face intégrés d'OpenClaw traitent actuellement ces deux suffixes comme des variantes de stratégie intégrées :
      - **`:fastest`** — débit le plus élevé.
      - **`:cheapest`** — coût le plus bas par jeton de sortie.

      Vous pouvez les ajouter en tant qu'entrées distinctes dans `models.providers.huggingface.models` ou définir `model.primary` avec le suffixe. Vous pouvez également définir l'ordre par défaut de vos fournisseurs dans [Paramètres du fournisseur d'inférence](https://hf.co/settings/inference-providers) (pas de suffixe = utiliser cet ordre).

    - **Fusion de la configuration :** Les entrées existantes dans `models.providers.huggingface.models` (par exemple, dans `models.json`) sont conservées lors de la fusion de la configuration. Ainsi, tout `name`, `alias` ou option de modèle personnalisé que vous y définissez est préservé.

  </Accordion>

  <Accordion title="Configuration de l'environnement et du démon">
    Si la Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `HUGGINGFACE_HUB_TOKEN` ou `HF_TOKEN` est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via `env.shellEnv`).

    <Note>
    OpenClaw accepte à la fois `HUGGINGFACE_HUB_TOKEN` et `HF_TOKEN` comme alias de variables d'environnement. L'un ou l'autre fonctionne ; si les deux sont définis, `HUGGINGFACE_HUB_TOKEN` prend la priorité.
    </Note>

  </Accordion>

  <Accordion title="Config : DeepSeek R1 avec repli vers Qwen">
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
  </Accordion>

  <Accordion title="Config : Qwen avec les variantes les moins chères et les plus rapides">
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
  </Accordion>

  <Accordion title="Config : DeepSeek + Llama + GPT-OSS avec des alias">
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
  </Accordion>

  <Accordion title="Config : Plusieurs Qwen et DeepSeek avec des suffixes de stratégie">
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
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Fournisseurs de modèles" href="/en/concepts/model-providers" icon="layers">
    Aperçu de tous les fournisseurs, des références de modèles et du comportement de basculement.
  </Card>
  <Card title="Sélection de modèle" href="/en/concepts/models" icon="brain">
    Comment choisir et configurer les modèles.
  </Card>
  <Card title="Documentation des fournisseurs d'inférence" href="https://huggingface.co/docs/inference-providers" icon="book">
    Documentation officielle des fournisseurs d'inférence Hugging Face.
  </Card>
  <Card title="Configuration" href="/en/gateway/configuration" icon="gear">
    Référence complète de la configuration.
  </Card>
</CardGroup>
