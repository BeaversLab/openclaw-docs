---
summary: "Utiliser les modèles Amazon Bedrock Mantle (compatibles OpenAI) avec OpenClaw"
read_when:
  - You want to use Bedrock Mantle hosted OSS models with OpenClaw
  - You need the Mantle OpenAI-compatible endpoint for GPT-OSS, Qwen, Kimi, or GLM
title: "Amazon Bedrock Mantle"
---

# Amazon Bedrock Mantle

OpenClaw inclut un provider **Amazon Bedrock Mantle** intégré qui se connecte
au endpoint compatible OpenAI de Mantle. Mantle héberge des modèles open source et
de tiers (GPT-OSS, Qwen, Kimi, GLM, et similaires) via une surface
`/v1/chat/completions` standard soutenue par l'infrastructure Bedrock.

| Propriété         | Valeur                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| ID du fournisseur | `amazon-bedrock-mantle`                                                                                        |
| API               | `openai-completions` (compatible OpenAI)                                                                       |
| Auth              | Jeton bearer `AWS_BEARER_TOKEN_BEDROCK` explicite ou génération de jetons bearer via chaîne de crédentiels IAM |
| Région par défaut | `us-east-1` (remplacer par `AWS_REGION` ou `AWS_DEFAULT_REGION`)                                               |

## Getting started

Choisissez votre méthode d'authentification préférée et suivez les étapes de configuration.

<Tabs>
  <Tab title="Explicit bearer token">
    **Idéal pour :** les environnements où vous possédez déjà un jeton bearer Mantle.

    <Steps>
      <Step title="Set the bearer token on the gateway host">
        ```bash
        export AWS_BEARER_TOKEN_BEDROCK="..."
        ```

        Définissez éventuellement une région (par défaut `us-east-1`) :

        ```bash
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="Verify models are discovered">
        ```bash
        openclaw models list
        ```

        Les modèles découverts apparaissent sous le fournisseur `amazon-bedrock-mantle`. Aucune
        configuration supplémentaire n'est requise sauf si vous souhaitez remplacer les valeurs par défaut.
      </Step>
    </Steps>

  </Tab>

  <Tab title="Identifiants IAM">
    **Idéal pour :** utiliser des informations d'identification compatibles avec le kit SDK AWS (configuration partagée, SSO, identité Web, rôles d'instance ou de tâche).

    <Steps>
      <Step title="Configurer les informations d'identification AWS sur l'hôte de la passerelle">
        Toute source d'authentification compatible avec le kit SDK AWS fonctionne :

        ```bash
        export AWS_PROFILE="default"
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="Vérifier que les modèles sont découverts">
        ```bash
        openclaw models list
        ```

        OpenClaw génère automatiquement un jeton de porteur Mantle à partir de la chaîne d'informations d'identification.
      </Step>
    </Steps>

    <Tip>
    Lorsque `AWS_BEARER_TOKEN_BEDROCK` n'est pas défini, OpenClaw génère le jeton de porteur pour vous à partir de la chaîne d'informations d'identification AWS par défaut, y compris les profils d'informations d'identification/config partagés, SSO, l'identité Web, ainsi que les rôles d'instance ou de tâche.
    </Tip>

  </Tab>
</Tabs>

## Découverte automatique des modèles

Lorsque `AWS_BEARER_TOKEN_BEDROCK` est défini, OpenClaw l'utilise directement. Sinon,
OpenClaw tente de générer un jeton de porteur Mantle à partir de la chaîne d'informations d'identification AWS par défaut. Il découvre ensuite les modèles Mantle disponibles en interrogeant le point de terminaison `/v1/models` de la région.

| Comportement               | Détail                                 |
| -------------------------- | -------------------------------------- |
| Cache de découverte        | Résultats mis en cache pendant 1 heure |
| Actualisation du jeton IAM | Toutes les heures                      |

<Note>Le jeton de porteur est le même `AWS_BEARER_TOKEN_BEDROCK` que celui utilisé par le fournisseur standard [Amazon Bedrock](/fr/providers/bedrock).</Note>

### Régions prises en charge

`us-east-1`, `us-east-2`, `us-west-2`, `ap-northeast-1`,
`ap-south-1`, `ap-southeast-3`, `eu-central-1`, `eu-west-1`, `eu-west-2`,
`eu-south-1`, `eu-north-1`, `sa-east-1`.

## Configuration manuelle

Si vous préférez une configuration explicite plutôt que la découverte automatique :

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

## Notes avancées

<AccordionGroup>
  <Accordion title="Support du raisonnement">
    Le support du raisonnement est déduit des identifiants de modèle contenant des modèles comme
    `thinking`, `reasoner` ou `gpt-oss-120b`. OpenClaw définit `reasoning: true`
    automatiquement pour les modèles correspondants lors de la découverte.
  </Accordion>

<Accordion title="Indisponibilité du point de terminaison">Si le point de terminaison Mantle est indisponible ou ne renvoie aucun modèle, le fournisseur est ignoré silencieusement. OpenClaw ne génère pas d'erreur ; les autres fournisseurs configurés continuent de fonctionner normalement.</Accordion>

  <Accordion title="Relation avec le fournisseur Amazon Bedrock">
    Bedrock Mantle est un fournisseur distinct du fournisseur standard
    [Amazon Bedrock](/fr/providers/bedrock). Mantle utilise une surface
    `/v1` compatible avec OpenAI, tandis que le fournisseur Bedrock standard utilise
    l'API API native.

    Les deux fournisseurs partagent les mêmes informations d'identification `AWS_BEARER_TOKEN_BEDROCK` lorsqu'elles
    sont présentes.

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Amazon Bedrock" href="/fr/providers/bedrock" icon="cloud">
    Fournisseur Bedrock natif pour les modèles Anthropic Claude, Titan et autres.
  </Card>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, références de modèle et comportement de basculement.
  </Card>
  <Card title="OAuth et auth" href="/fr/gateway/authentication" icon="key">
    Détails d'authentification et règles de réutilisation des informations d'identification.
  </Card>
  <Card title="Dépannage" href="/fr/help/troubleshooting" icon="wrench">
    Problèmes courants et comment les résoudre.
  </Card>
</CardGroup>
