---
summary: "Utiliser les modèles Amazon Bedrock Mantle (compatibles OpenAI) avec OpenClaw"
read_when:
  - You want to use Bedrock Mantle hosted OSS models with OpenClaw
  - You need the Mantle OpenAI-compatible endpoint for GPT-OSS, Qwen, Kimi, or GLM
title: "Amazon Bedrock Mantle"
---

# Amazon Bedrock Mantle

OpenClaw inclut un fournisseur **Amazon Bedrock Mantle** intégré qui se connecte
au point de terminaison compatible OpenAI de Mantle. Mantle héberge des modèles
open source et tiers (GPT-OSS, Qwen, Kimi, GLM, et similaires) via une surface
`/v1/chat/completions` standard prise en charge par l'infrastructure Bedrock.

## Ce qu'OpenClaw prend en charge

- Fournisseur : `amazon-bedrock-mantle`
- API : `openai-completions` (compatible OpenAI)
- Auth : `AWS_BEARER_TOKEN_BEDROCK` explicite ou génération de jeton bearer via la chaîne de informations d'identification IAM
- Région : `AWS_REGION` ou `AWS_DEFAULT_REGION` (par défaut : `us-east-1`)

## Découverte automatique de modèle

Lorsque `AWS_BEARER_TOKEN_BEDROCK` est défini, OpenClaw l'utilise directement. Sinon,
OpenClaw tente de générer un jeton bearer Mantle à partir de la chaîne d'informations
d'identification AWS par défaut, y compris les profils d'informations d'identification/de
configuration partagés, SSO, l'identité Web, et les rôles d'instance ou de tâche.
Il découvre ensuite les modèles Mantle disponibles en interrogeant le point de
terminaison `/v1/models` de la région. Les résultats de la découverte
sont mis en cache pendant 1 heure, et les jetons bearer dérivés de l'IAM sont
actualisés toutes les heures.

Régions prises en charge : `us-east-1`, `us-east-2`, `us-west-2`, `ap-northeast-1`,
`ap-south-1`, `ap-southeast-3`, `eu-central-1`, `eu-west-1`, `eu-west-2`,
`eu-south-1`, `eu-north-1`, `sa-east-1`.

## Intégration

1. Choisissez un chemin d'authentification sur l'**hôte de passerelle** :

Jeton bearer explicite :

```bash
export AWS_BEARER_TOKEN_BEDROCK="..."
# Optional (defaults to us-east-1):
export AWS_REGION="us-west-2"
```

Informations d'identification IAM :

```bash
# Any AWS SDK-compatible auth source works here, for example:
export AWS_PROFILE="default"
export AWS_REGION="us-west-2"
```

2. Vérifier que les modèles sont découverts :

```bash
openclaw models list
```

Les modèles découverts apparaissent sous le fournisseur `amazon-bedrock-mantle`. Aucune
configuration supplémentaire n'est requise sauf si vous souhaitez remplacer les valeurs par défaut.

## Configuration manuelle

Si vous préférez une configuration explicite à la découverte automatique :

```json5
{
  models: {
    providers: {
      "amazon-bedrock-mantle": {
        baseUrl: "https://bedrock-mantle.us-east-1.api.aws/v1",
        api: "openai-completions",
        auth: "api-key",
        apiKey: "env:AWS_BEARER_TOKEN_BEDROCK",
        models: [
          {
            id: "gpt-oss-120b",
            name: "GPT-OSS 120B",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 32000,
            maxTokens: 4096,
          },
        ],
      },
    },
  },
}
```

## Remarques

- OpenClaw peut générer pour vous le jeton de porteur Mantle à partir des
  informations d'identification IAM compatibles avec le kit SDK AWS lorsque
  `AWS_BEARER_TOKEN_BEDROCK` n'est pas défini.
- Le jeton de porteur est le même `AWS_BEARER_TOKEN_BEDROCK` que celui
  utilisé par le fournisseur standard [Amazon Bedrock](/en/providers/bedrock).
- La prise en charge du raisonnement est déduite des identifiants de modèle
  contenant des modèles comme `thinking`,
  `reasoner`, ou `gpt-oss-120b`.
- Si le point de terminaison Mantle est indisponible ou ne renvoie aucun modèle,
  le fournisseur est ignoré silencieusement.
