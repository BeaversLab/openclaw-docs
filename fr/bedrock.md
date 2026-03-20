---
summary: "Utiliser les modèles Amazon Bedrock (API Converse) avec OpenClaw"
read_when:
  - Vous souhaitez utiliser des modèles Amazon Bedrock avec OpenClaw
  - Vous avez besoin de la configuration des informations d'identification/région AWS pour les appels au modèle
title: "Amazon Bedrock"
---

# Amazon Bedrock

OpenClaw peut utiliser les modèles **Amazon Bedrock** via le fournisseur de streaming **Bedrock Converse** de pi‑ai. L'authentification Bedrock utilise la **chaîne de credentials par défaut du AWS SDK**, et non une clé API.

## Ce que pi‑ai prend en charge

- Fournisseur : `amazon-bedrock`
- API : `bedrock-converse-stream`
- Authentification : informations d'identification AWS (env vars, configuration partagée ou rôle d'instance)
- Région : `AWS_REGION` ou `AWS_DEFAULT_REGION` (par défaut : `us-east-1`)

## Découverte automatique de modèle

Si des informations d'identification AWS sont détectées, OpenClaw peut découvrir automatiquement les modèles Bedrock qui prennent en charge le **streaming** et la **sortie texte**. La découverte utilise `bedrock:ListFoundationModels` et est mise en cache (par défaut : 1 heure).

Les options de configuration se trouvent sous `models.bedrockDiscovery` :

```json5
{
  models: {
    bedrockDiscovery: {
      enabled: true,
      region: "us-east-1",
      providerFilter: ["anthropic", "amazon"],
      refreshInterval: 3600,
      defaultContextWindow: 32000,
      defaultMaxTokens: 4096,
    },
  },
}
```

Remarques :

- `enabled` est défini par défaut sur `true` lorsque des informations d'identification AWS sont présentes.
- `region` est défini par défaut sur `AWS_REGION` ou `AWS_DEFAULT_REGION`, puis `us-east-1`.
- `providerFilter` correspond aux noms des fournisseurs Bedrock (par exemple `anthropic`).
- `refreshInterval` est en secondes ; définissez sur `0` pour désactiver la mise en cache.
- `defaultContextWindow` (par défaut : `32000`) et `defaultMaxTokens` (par défaut : `4096`)
  sont utilisés pour les modèles découverts (remplacez-les si vous connaissez les limites de votre modèle).

## Configuration (manuelle)

1. Assurez-vous que les informations d'identification AWS sont disponibles sur l'**hôte de passerelle** :

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

2. Ajoutez un fournisseur et un modèle Bedrock à votre configuration (pas besoin de `apiKey`) :

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
            id: "anthropic.claude-opus-4-5-20251101-v1:0",
            name: "Claude Opus 4.5 (Bedrock)",
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
      model: { primary: "amazon-bedrock/anthropic.claude-opus-4-5-20251101-v1:0" },
    },
  },
}
```

## Rôles d'instance EC2

Lorsque vous exécutez OpenClaw sur une instance EC2 avec un rôle IAM attaché, le AWS SDK utilisera automatiquement le service de métadonnées d'instance (IMDS) pour l'authentification.
Cependant, la détection des informations d'identification d'OpenClaw vérifie actuellement uniquement les variables d'environnement,
et non les informations d'identification IMDS.

**Contournement :** Définissez `AWS_PROFILE=default` pour signaler que les identifiants AWS sont disponibles. L'authentification réelle utilise toujours le rôle d'instance via IMDS.

```bash
# Add to ~/.bashrc or your shell profile
export AWS_PROFILE=default
export AWS_REGION=us-east-1
```

**Autorisations IAM requises** pour le rôle d'instance EC2 :

- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`
- `bedrock:ListFoundationModels` (pour la découverte automatique)

Ou attachez la stratégie gérée `AmazonBedrockFullAccess`.

**Configuration rapide :**

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

# 3. On the EC2 instance, enable discovery
openclaw config set models.bedrockDiscovery.enabled true
openclaw config set models.bedrockDiscovery.region us-east-1

# 4. Set the workaround env vars
echo 'export AWS_PROFILE=default' >> ~/.bashrc
echo 'export AWS_REGION=us-east-1' >> ~/.bashrc
source ~/.bashrc

# 5. Verify models are discovered
openclaw models list
```

## Remarques

- Bedrock exige que l'**accès au model** soit activé dans votre compte/région AWS.
- La découverte automatique nécessite l'autorisation `bedrock:ListFoundationModels`.
- Si vous utilisez des profils, définissez `AWS_PROFILE` sur l'hôte de la passerelle.
- OpenClaw expose la source des identifiants dans cet ordre : `AWS_BEARER_TOKEN_BEDROCK`, puis `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`, puis `AWS_PROFILE`, puis la chaîne AWS SDK par défaut.
- La prise en charge du raisonnement dépend du model ; consultez la fiche technique du model Bedrock pour connaître les capacités actuelles.
- Si vous préférez un flux de clé géré, vous pouvez également placer un proxy compatible OpenAI devant Bedrock et le configurer en tant que provider OpenAI à la place.

import fr from "/components/footer/fr.mdx";

<fr />
