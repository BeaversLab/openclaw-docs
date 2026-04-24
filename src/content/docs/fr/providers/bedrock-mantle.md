---
summary: "Utiliser les modèles Amazon Bedrock Mantle (compatibles OpenAI) avec OpenClaw"
read_when:
  - You want to use Bedrock Mantle hosted OSS models with OpenClaw
  - You need the Mantle OpenAI-compatible endpoint for GPT-OSS, Qwen, Kimi, or GLM
title: "Amazon Bedrock Mantle"
---

# Amazon Bedrock Mantle

OpenClaw inclut un fournisseur intégré **Amazon Bedrock Mantle** qui se connecte au
point de terminaison compatible OpenAI de Mantle. Mantle héberge des modèles open-source et
de tiers (GPT-OSS, Qwen, Kimi, GLM, etc.) via une interface
`/v1/chat/completions` standard soutenue par l'infrastructure Bedrock.

| Propriété         | Valeur                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| ID du fournisseur | `amazon-bedrock-mantle`                                                                                              |
| API               | `openai-completions` (compatible OpenAI) ou `anthropic-messages` (itinéraire Messages Anthropic)                     |
| Auth              | `AWS_BEARER_TOKEN_BEDROCK` explicite ou génération de jetons porteurs par chaîne d'informations d'identification IAM |
| Région par défaut | `us-east-1` (remplacer par `AWS_REGION` ou `AWS_DEFAULT_REGION`)                                                     |

## Getting started

Choisissez votre méthode d'authentification préférée et suivez les étapes de configuration.

<Tabs>
  <Tab title="Jeton porteur explicite">
    **Idéal pour :** les environnements où vous possédez déjà un jeton porteur Mantle.

    <Steps>
      <Step title="Définir le jeton porteur sur l'hôte de la passerelle">
        ```bash
        export AWS_BEARER_TOKEN_BEDROCK="..."
        ```

        Définissez facultativement une région (par défaut `us-east-1`) :

        ```bash
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="Vérifier que les modèles sont découverts">
        ```bash
        openclaw models list
        ```

        Les modèles découverts apparaissent sous le fournisseur `amazon-bedrock-mantle`. Aucune
        configuration supplémentaire n'est requise sauf si vous souhaitez remplacer les valeurs par défaut.
      </Step>
    </Steps>

  </Tab>

  <Tab title="Identifiants IAM">
    **Idéal pour :** l'utilisation d'informations d'identification compatibles avec le kit SDK AWS (configuration partagée, SSO, identité Web, rôles d'instance ou de tâche).

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

        OpenClaw génère automatiquement un jeton porteur Mantle à partir de la chaîne d'informations d'identification.
      </Step>
    </Steps>

    <Tip>
    Lorsque `AWS_BEARER_TOKEN_BEDROCK` n'est pas défini, OpenClaw génère pour vous le jeton porteur à partir de la chaîne d'informations d'identification par défaut d'AWS, y compris les profils d'informations d'identification/configuration partagés, SSO, l'identité Web, ainsi que les rôles d'instance ou de tâche.
    </Tip>

  </Tab>
</Tabs>

## Découverte automatique des modèles

Lorsque `AWS_BEARER_TOKEN_BEDROCK` est défini, OpenClaw l'utilise directement. Sinon,
OpenClaw tente de générer un jeton porteur Mantle à partir de la chaîne d'informations d'identification par défaut d'AWS. Il découvre ensuite les modèles Mantle disponibles en interrogeant le point de terminaison `/v1/models` de la région.

| Comportement               | Détail                                 |
| -------------------------- | -------------------------------------- |
| Cache de découverte        | Résultats mis en cache pendant 1 heure |
| Actualisation du jeton IAM | Toutes les heures                      |

<Note>Le jeton porteur est le même `AWS_BEARER_TOKEN_BEDROCK` que celui utilisé par le fournisseur standard [Amazon Bedrock](/fr/providers/bedrock).</Note>

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
  <Accordion title="Prise en charge du raisonnement">
    La prise en charge du raisonnement est déduite des ID de modèle contenant des modèles comme
    `thinking`, `reasoner` ou `gpt-oss-120b`. OpenClaw définit `reasoning: true`
    automatiquement pour les modèles correspondants lors de la découverte.
  </Accordion>

<Accordion title="Indisponibilité du point de terminaison">Si le point de terminaison Mantle est indisponible ou ne renvoie aucun modèle, le fournisseur est silencieusement ignoré. OpenClaw ne génère pas d'erreur ; les autres fournisseurs configurés continuent de fonctionner normalement.</Accordion>

  <Accordion title="Claude Opus 4.7 via la route Messages Anthropic">
    Mantle expose également une route Messages Anthropic qui transporte les modèles Claude via le même chemin de streaming authentifié par porteur. Claude Opus 4.7 (`amazon-bedrock-mantle/claude-opus-4.7`) est appelable via cette route avec un streaming appartenant au fournisseur, les jetons porteurs AWS ne sont donc pas traités comme des clés Anthropic API.

    Lorsque vous épinglez un modèle Messages Anthropic sur le fournisseur Mantle, OpenClaw utilise la surface API `anthropic-messages` au lieu de `openai-completions` pour ce modèle. L'authentification provient toujours de `AWS_BEARER_TOKEN_BEDROCK` (ou du jeton porteur IAM frappé).

    ```json5
    {
      models: {
        providers: {
          "amazon-bedrock-mantle": {
            models: [
              {
                id: "claude-opus-4.7",
                name: "Claude Opus 4.7",
                api: "anthropic-messages",
                reasoning: true,
                input: ["text", "image"],
                contextWindow: 1000000,
                maxTokens: 32000,
              },
            ],
          },
        },
      },
    }
    ```

    Les métadonnées de la fenêtre de contexte pour les modèles Mantle découverts utilisent les limites publiées connues lorsque disponibles et reviennent de manière conservative pour les modèles non répertoriés, afin que la compactage et la gestion des dépassements se comportent correctement pour les nouvelles entrées sans surestimer les modèles inconnus.

  </Accordion>

  <Accordion title="Relation avec le fournisseur Amazon Bedrock">
    Bedrock Mantle est un fournisseur distinct du fournisseur
    [Amazon Bedrock](/fr/providers/bedrock) standard. Mantle utilise une surface
    `/v1` compatible OpenAI, tandis que le fournisseur Bedrock standard utilise
    l'API Bedrock native.

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
    Choix des fournisseurs, des références de modèle et du comportement de basculement.
  </Card>
  <Card title="OAuth et auth" href="/fr/gateway/authentication" icon="key">
    Détails d'authentification et règles de réutilisation des identifiants.
  </Card>
  <Card title="Dépannage" href="/fr/help/troubleshooting" icon="wrench">
    Problèmes courants et comment les résoudre.
  </Card>
</CardGroup>
