---
summary: "Utiliser les modèles Amazon Bedrock (Converse API) avec OpenClaw"
read_when:
  - You want to use Amazon Bedrock models with OpenClaw
  - You need AWS credential/region setup for model calls
title: "Amazon Bedrock"
---

# Amazon Bedrock

OpenClaw peut utiliser des modèles **Amazon Bedrock** via le fournisseur de streaming **Bedrock Converse** de pi-ai. L'authentification Bedrock utilise la **chaîne de credentials par défaut du AWS SDK**, et non une clé API.

| Propriété   | Valeur                                                          |
| ----------- | --------------------------------------------------------------- |
| Fournisseur | `amazon-bedrock`                                                |
| API         | `bedrock-converse-stream`                                       |
| Auth        | AWS credentials (env vars, shared config, or instance role)     |
| Région      | `AWS_REGION` ou `AWS_DEFAULT_REGION` (par défaut : `us-east-1`) |

## Getting started

Choisissez votre méthode d'authentification préférée et suivez les étapes de configuration.

<Tabs>
  <Tab title="Clés d'accès / env vars">
    **Idéal pour :** machines de développeur, CI, ou hôtes où vous gérez directement les identifiants AWS.

    <Steps>
      <Step title="Définir les identifiants AWS sur l'hôte de la passerelle">
        ```bash
        export AWS_ACCESS_KEY_ID="AKIA..."
        export AWS_SECRET_ACCESS_KEY="..."
        export AWS_REGION="us-east-1"
        # Optional:
        export AWS_SESSION_TOKEN="..."
        export AWS_PROFILE="your-profile"
        # Optional (Bedrock API key/bearer token):
        export AWS_BEARER_TOKEN_BEDROCK="..."
        ```
      </Step>
      <Step title="Ajouter un fournisseur Bedrock et un modèle à votre configuration">
        Aucun `apiKey` n'est requis. Configurez le fournisseur avec `auth: "aws-sdk"` :

        ```json5
        {
          models: {
            providers: {
              "amazon-bedrock": {
                baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
                api: "bedrock-converse-stream",
                auth: "aws-sdk",
                models: [
                  {
                    id: "us.anthropic.claude-opus-4-6-v1:0",
                    name: "Claude Opus 4.6 (Bedrock)",
                    reasoning: true,
                    input: ["text", "image"],
                    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                    contextWindow: 200000,
                    maxTokens: 8192,
                  },
                ],
              },
            },
          },
          agents: {
            defaults: {
              model: { primary: "amazon-bedrock/us.anthropic.claude-opus-4-6-v1:0" },
            },
          },
        }
        ```
      </Step>
      <Step title="Vérifier que les modèles sont disponibles">
        ```bash
        openclaw models list
        ```
      </Step>
    </Steps>

    <Tip>
    Avec l'authentification par marqueur d'environnement (`AWS_ACCESS_KEY_ID`, `AWS_PROFILE`, ou `AWS_BEARER_TOKEN_BEDROCK`), OpenClaw active automatiquement le fournisseur Bedrock implicite pour la découverte de modèles sans configuration supplémentaire.
    </Tip>

  </Tab>

  <Tab title="Rôles d'instance EC2 (IMDS)">
    **Idéal pour :** Instances EC2 avec un rôle IAM attaché, utilisant le service de métadonnées d'instance pour l'authentification.

    <Steps>
      <Step title="Activer explicitement la découverte">
        Lors de l'utilisation d'IMDS, OpenClaw ne peut pas détecter l'authentification AWS à partir des marqueurs d'environnement seuls, vous devez donc l'activer explicitement :

        ```bash
        openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
        openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1
        ```
      </Step>
      <Step title="Ajouter facultativement un marqueur d'environnement pour le mode automatique">
        Si vous souhaitez également que le chemin de détection automatique par marqueur d'environnement fonctionne (par exemple, pour les surfaces `openclaw status`) :

        ```bash
        export AWS_PROFILE=default
        export AWS_REGION=us-east-1
        ```

        Vous n'avez **pas** besoin d'une fausse clé API.
      </Step>
      <Step title="Vérifier que les modèles sont découverts">
        ```bash
        openclaw models list
        ```
      </Step>
    </Steps>

    <Warning>
    Le rôle IAM attaché à votre instance EC2 doit disposer des autorisations suivantes :

    - `bedrock:InvokeModel`
    - `bedrock:InvokeModelWithResponseStream`
    - `bedrock:ListFoundationModels` (pour la découverte automatique)
    - `bedrock:ListInferenceProfiles` (pour la découverte de profils d'inférence)

    Ou attachez la stratégie gérée `AmazonBedrockFullAccess`.
    </Warning>

    <Note>
    Vous n'avez besoin de `AWS_PROFILE=default` que si vous souhaitez spécifiquement un marqueur d'environnement pour le mode automatique ou les surfaces d'état. Le chemin d'authentification réel du runtime Bedrock utilise la chaîne par défaut du SDK AWS, donc l'authentification par rôle d'instance IMDS fonctionne même sans marqueurs d'environnement.
    </Note>

  </Tab>
</Tabs>

## Découverte automatique de modèle

OpenClaw peut découvrir automatiquement les modèles Bedrock qui prennent en charge le **streaming**
et la **sortie de texte**. La découverte utilise `bedrock:ListFoundationModels` et
`bedrock:ListInferenceProfiles`, et les résultats sont mis en cache (par défaut : 1 heure).

Comment le fournisseur implicite est activé :

- Si `plugins.entries.amazon-bedrock.config.discovery.enabled` est `true`,
  OpenClaw tentera la découverte même si aucun marqueur d'environnement AWS n'est présent.
- Si `plugins.entries.amazon-bedrock.config.discovery.enabled` n'est pas défini,
  OpenClaw n'ajoute automatiquement le
  fournisseur Bedrock implicite que lorsqu'il détecte l'un de ces marqueurs d'authentification AWS :
  `AWS_BEARER_TOKEN_BEDROCK`, `AWS_ACCESS_KEY_ID` +
  `AWS_SECRET_ACCESS_KEY`, ou `AWS_PROFILE`.
- Le chemin d'authentification réel du runtime Bedrock utilise toujours la chaîne par défaut du SDK AWS, de sorte que
  la configuration partagée, le SSO et l'authentification par rôle d'instance IMDS peuvent fonctionner même lorsque la découverte
  nécessitait `enabled: true` pour être activée.

<Note>
  Pour les entrées `models.providers["amazon-bedrock"]` explicites, OpenClaw peut toujours résoudre l'authentification par marqueur d'environnement Bedrock tôt à partir des marqueurs d'environnement AWS tels que `AWS_BEARER_TOKEN_BEDROCK` sans forcer le chargement complet de l'authentification du runtime. Le chemin d'authentification réel de l'appel au modèle utilise toujours la chaîne par défaut
  du SDK AWS.
</Note>

<AccordionGroup>
  <Accordion title="Options de configuration de la découverte">
    Les options de configuration se trouvent sous `plugins.entries.amazon-bedrock.config.discovery` :

    ```json5
    {
      plugins: {
        entries: {
          "amazon-bedrock": {
            config: {
              discovery: {
                enabled: true,
                region: "us-east-1",
                providerFilter: ["anthropic", "amazon"],
                refreshInterval: 3600,
                defaultContextWindow: 32000,
                defaultMaxTokens: 4096,
              },
            },
          },
        },
      },
    }
    ```

    | Option | Par défaut | Description |
    | ------ | ------- | ----------- |
    | `enabled` | auto | En mode auto, OpenClaw active uniquement le fournisseur Bedrock implicite lorsqu'il détecte un marqueur d'environnement AWS pris en charge. Définissez `true` pour forcer la découverte. |
    | `region` | `AWS_REGION` / `AWS_DEFAULT_REGION` / `us-east-1` | Région AWS utilisée pour les appels API de découverte. |
    | `providerFilter` | (tous) | Correspond aux noms des fournisseurs Bedrock (par exemple `anthropic`, `amazon`). |
    | `refreshInterval` | `3600` | Durée du cache en secondes. Définissez sur `0` pour désactiver le cache. |
    | `defaultContextWindow` | `32000` | Fenêtre de contexte utilisée pour les modèles découverts (à remplacer si vous connaissez les limites de votre modèle). |
    | `defaultMaxTokens` | `4096` | Nombre maximal de jetons de sortie utilisés pour les modèles découverts (à remplacer si vous connaissez les limites de votre modèle). |

  </Accordion>
</AccordionGroup>

## Configuration rapide (chemin AWS)

Ce guide pas à pas crée un rôle IAM, attache les autorisations Bedrock, associe
le profil d'instance et active la découverte OpenClaw sur l'hôte EC2.

```bash
# 1. Create IAM role and instance profile
aws iam create-role --role-name EC2-Bedrock-Access \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy --role-name EC2-Bedrock-Access \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess

aws iam create-instance-profile --instance-profile-name EC2-Bedrock-Access
aws iam add-role-to-instance-profile \
  --instance-profile-name EC2-Bedrock-Access \
  --role-name EC2-Bedrock-Access

# 2. Attach to your EC2 instance
aws ec2 associate-iam-instance-profile \
  --instance-id i-xxxxx \
  --iam-instance-profile Name=EC2-Bedrock-Access

# 3. On the EC2 instance, enable discovery explicitly
openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1

# 4. Optional: add an env marker if you want auto mode without explicit enable
echo 'export AWS_PROFILE=default' >> ~/.bashrc
echo 'export AWS_REGION=us-east-1' >> ~/.bashrc
source ~/.bashrc

# 5. Verify models are discovered
openclaw models list
```

## Configuration avancée

<AccordionGroup>
  <Accordion title="Profils d'inférence">
    OpenClaw détecte les **profils d'inférence régionaux et globaux** ainsi
    que les modèles fondamentaux. Lorsqu'un profil correspond à un modèle
    fondamental connu, le profil hérite des capacités de ce modèle (fenêtre de
    contexte, jetons max, raisonnement, vision) et la région de requête
    Bedrock correcte est injectée automatiquement. Cela signifie que les profils
    Claude inter-régionaux fonctionnent sans avoir à remplacer manuellement le
    fournisseur.

    Les ID de profils d'inférence ressemblent à `us.anthropic.claude-opus-4-6-v1:0` (régional)
    ou `anthropic.claude-opus-4-6-v1:0` (global). Si le modèle sous-jacent est déjà
    présent dans les résultats de la détection, le profil hérite de son ensemble
    complet de capacités ; sinon, des valeurs par défaut sécurisées sont appliquées.

    Aucune configuration supplémentaire n'est nécessaire. Tant que la détection
    est activée et que le principal IAM dispose de `bedrock:ListInferenceProfiles`, les
    profils apparaissent aux côtés des modèles fondamentaux dans
    `openclaw models list`.

  </Accordion>

  <Accordion title="Guardrails">
    Vous pouvez appliquer [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)
    à tous les appels de modèles Bedrock en ajoutant un objet `guardrail` à la
    configuration du plugin `amazon-bedrock`. Les Guardrails vous permettent d'appliquer un filtrage de contenu,
    un refus de sujets, des filtres de mots, des filtres d'informations sensibles et des vérifications
    d'ancrage contextuel.

    ```json5
    {
      plugins: {
        entries: {
          "amazon-bedrock": {
            config: {
              guardrail: {
                guardrailIdentifier: "abc123", // guardrail ID or full ARN
                guardrailVersion: "1", // version number or "DRAFT"
                streamProcessingMode: "sync", // optional: "sync" or "async"
                trace: "enabled", // optional: "enabled", "disabled", or "enabled_full"
              },
            },
          },
        },
      },
    }
    ```

    | Option | Requis | Description |
    | ------ | -------- | ----------- |
    | `guardrailIdentifier` | Oui | ID de la garde-corps (ex : `abc123`) ou ARN complet (ex : `arn:aws:bedrock:us-east-1:123456789012:guardrail/abc123`). |
    | `guardrailVersion` | Oui | Numéro de version publiée, ou `"DRAFT"` pour la brouillon de travail. |
    | `streamProcessingMode` | Non | `"sync"` ou `"async"` pour l'évaluation de la garde-corps lors du streaming. Si omis, Bedrock utilise sa valeur par défaut. |
    | `trace` | Non | `"enabled"` ou `"enabled_full"` pour le débogage ; omettez ou définissez `"disabled"` pour la production. |

    <Warning>
    Le principal IAM utilisé par la passerelle doit avoir la permission `bedrock:ApplyGuardrail` en plus des autorisations d'appel standard.
    </Warning>

  </Accordion>

  <Accordion title="Intégrations pour la recherche de mémoire">
    Bedrock peut également servir de fournisseur d'intégrations pour
    [memory search](/fr/concepts/memory-search). Cela est configuré séparément du
    fournisseur d'inférence -- définissez `agents.defaults.memorySearch.provider` sur `"bedrock"` :

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "bedrock",
            model: "amazon.titan-embed-text-v2:0", // default
          },
        },
      },
    }
    ```

    Les intégrations Bedrock utilisent la même chaîne de credentials AWS SDK que l'inférence (rôles d'instance,
    SSO, clés d'accès, configuration partagée et identité Web). Aucune clé API n'est
    nécessaire. Lorsque `provider` est `"auto"`, Bedrock est détecté automatiquement si cette
    chaîne de credentials est résolue avec succès.

    Les modèles d'intégration pris en charge incluent Amazon Titan Embed (v1, v2), Amazon Nova
    Embed, Cohere Embed (v3, v4) et TwelveLabs Marengo. Voir
    [Référence de configuration de la mémoire -- Bedrock](/fr/reference/memory-config#bedrock-embedding-config)
    pour la liste complète des modèles et des options de dimension.

  </Accordion>

  <Accordion title="Remarques et mises en garde">
    - Bedrock nécessite l'**accès au modèle** activé dans votre compte/region AWS.
    - La découverte automatique nécessite les permissions `bedrock:ListFoundationModels` et
      `bedrock:ListInferenceProfiles`.
    - Si vous comptez sur le mode automatique, définissez l'un des marqueurs d'environnement d'auth AWS pris en charge sur l'hôte de la passerelle.
      Si vous préférez l'auth IMDS/shared-config sans marqueurs d'environnement, définissez
      `plugins.entries.amazon-bedrock.config.discovery.enabled: true`.
    - OpenClaw expose la source du credential dans cet ordre : `AWS_BEARER_TOKEN_BEDROCK`,
      puis `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`, puis `AWS_PROFILE`, puis la
      chaîne AWS SDK par défaut.
    - La prise en charge du raisonnement dépend du modèle ; consultez la fiche technique du modèle Bedrock pour
      connaître les capacités actuelles.
    - Si vous préférez un flux de clé géré, vous pouvez également placer un proxy compatible OpenAI
      devant Bedrock et le configurer en tant que fournisseur OpenAI à la place.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, références de modèle et comportement de basculement.
  </Card>
  <Card title="Recherche de mémoire" href="/fr/concepts/memory-search" icon="magnifying-glass">
    Embeddings Bedrock pour la configuration de la recherche de mémoire.
  </Card>
  <Card title="Référence de configuration de la mémoire" href="/fr/reference/memory-config#bedrock-embedding-config" icon="database">
    Liste complète des modèles d'embedding Bedrock et options de dimension.
  </Card>
  <Card title="Dépannage" href="/fr/help/troubleshooting" icon="wrench">
    Dépannage général et FAQ.
  </Card>
</CardGroup>
