---
summary: "Utiliser les modèles Amazon Bedrock (API Converse) avec API"
read_when:
  - You want to use Amazon Bedrock models with OpenClaw
  - You need AWS credential/region setup for model calls
title: "Amazon Bedrock"
---

# Amazon Bedrock

OpenClaw peut utiliser des modèles **Amazon Bedrock** via le fournisseur de streaming **Bedrock Converse** de pi‑ai. L'authentification Bedrock utilise la **chaîne de credentials par défaut du AWS SDK**, et non une clé API.

## Ce que pi-ai prend en charge

- Fournisseur : `amazon-bedrock`
- API : `bedrock-converse-stream`
- Auth : informations d'identification AWS (env vars, configuration partagée ou rôle d'instance)
- Région : `AWS_REGION` ou `AWS_DEFAULT_REGION` (par défaut : `us-east-1`)

## Découverte automatique de modèles

OpenClaw peut découvrir automatiquement les modèles Bedrock qui prennent en charge le **streaming**
et la **sortie texte**. La découverte utilise `bedrock:ListFoundationModels` et
`bedrock:ListInferenceProfiles`, et les résultats sont mis en cache (par défaut : 1 heure).

Comment le fournisseur implicite est activé :

- Si `plugins.entries.amazon-bedrock.config.discovery.enabled` est `true`,
  OpenClaw essaiera la découverte même en l'absence de marqueur d'environnement AWS.
- Si `plugins.entries.amazon-bedrock.config.discovery.enabled` n'est pas défini,
  OpenClaw n'ajoute automatiquement le
  fournisseur Bedrock implicite que s'il détecte l'un de ces marqueurs d'authentification AWS :
  `AWS_BEARER_TOKEN_BEDROCK`, `AWS_ACCESS_KEY_ID` +
  `AWS_SECRET_ACCESS_KEY`, ou `AWS_PROFILE`.
- Le chemin d'authentification réel du runtime Bedrock utilise toujours la chaîne par défaut du SDK AWS, donc
  la configuration partagée, le SSO et l'authentification par rôle d'instance IMDS peuvent fonctionner même lorsque la découverte
  nécessitait `enabled: true` pour s'activer.

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

Notes :

- `enabled` est par défaut en mode automatique. En mode automatique, OpenClaw n'active le
  fournisseur Bedrock implicite que lorsqu'il détecte un marqueur d'environnement AWS pris en charge.
- `region` est par défaut `AWS_REGION` ou `AWS_DEFAULT_REGION`, puis `us-east-1`.
- `providerFilter` correspond aux noms des fournisseurs Bedrock (par exemple `anthropic`).
- `refreshInterval` est en secondes ; définissez sur `0` pour désactiver la mise en cache.
- `defaultContextWindow` (par défaut : `32000`) et `defaultMaxTokens` (par défaut : `4096`)
  sont utilisés pour les modèles découverts (à modifier si vous connaissez les limites de votre modèle).
- Pour les entrées explicites `models.providers["amazon-bedrock"]`, OpenClaw peut toujours
  résoudre l'authentification par marqueur d'environnement Bedrock tôt à partir des marqueurs d'environnement AWS tels que
  `AWS_BEARER_TOKEN_BEDROCK` sans forcer le chargement complet de l'authentification à l'exécution. Le
  chemin d'authentification réel des appels de modèle utilise toujours la chaîne par défaut du SDK AWS.

## Onboarding

1. Assurez-vous que les identifiants AWS sont disponibles sur l'**hôte de passerelle** :

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

2. Ajoutez un fournisseur Bedrock et un modèle à votre configuration (aucun `apiKey` requis) :

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

## Rôles d'instance EC2

Lors de l'exécution de OpenClaw sur une instance EC2 avec un rôle IAM attaché, le SDK AWS
peut utiliser le service de métadonnées d'instance (IMDS) pour l'authentification. Pour la découverte
de modèles Bedrock, OpenClaw n'active automatiquement le fournisseur implicite qu'à partir des marqueurs d'environnement AWS
sauf si vous définissez explicitement
`plugins.entries.amazon-bedrock.config.discovery.enabled: true`.

Configuration recommandée pour les hôtes utilisant l'IMDS :

- Définissez `plugins.entries.amazon-bedrock.config.discovery.enabled` sur `true`.
- Définissez `plugins.entries.amazon-bedrock.config.discovery.region` (ou exportez `AWS_REGION`).
- Vous n'avez **pas** besoin d'une fausse clé API.
- Vous n'avez besoin de `AWS_PROFILE=default` que si vous souhaitez spécifiquement un marqueur d'environnement
  pour le mode automatique ou les surfaces de statut.

```bash
# Recommended: explicit discovery enable + region
openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1

# Optional: add an env marker if you want auto mode without explicit enable
export AWS_PROFILE=default
export AWS_REGION=us-east-1
```

**Autorisations IAM requises** pour le rôle d'instance EC2 :

- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`
- `bedrock:ListFoundationModels` (pour la découverte automatique)
- `bedrock:ListInferenceProfiles` (pour la découverte des profils d'inférence)

Ou attachez la stratégie gérée `AmazonBedrockFullAccess`.

## Configuration rapide (chemin AWS)

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

## Profils d'inférence

OpenClaw découvre les **profils d'inférence régionaux et globaux** aux côtés
des modèles fondamentaux. Lorsqu'un profil correspond à un modèle fondamental connu, le
profil hérite des capacités de ce modèle (fenêtre de contexte, jetons maximum,
raisonnement, vision) et la région de demande Bedrock correcte est injectée
automatiquement. Cela signifie que les profils Claude inter-régionaux fonctionnent sans
substitutions manuelles de fournisseur.

Les ID de profils d'inférence ressemblent à `us.anthropic.claude-opus-4-6-v1:0` (régional)
ou `anthropic.claude-opus-4-6-v1:0` (global). Si le modèle sous-jacent est déjà
dans les résultats de découverte, le profil hérite de son ensemble complet de capacités ;
sinon, des valeurs par défaut sécurisées s'appliquent.

Aucune configuration supplémentaire n'est nécessaire. Tant que la découverte est activée et que le principal IAM dispose de `bedrock:ListInferenceProfiles`, les profils apparaissent aux côtés des modèles fondamentaux dans `openclaw models list`.

## Notes

- Bedrock nécessite que l'**accès au modèle** soit activé dans votre compte/region AWS.
- La découverte automatique nécessite les autorisations `bedrock:ListFoundationModels` et `bedrock:ListInferenceProfiles`.
- Si vous vous fiez au mode automatique, définissez l'un des marqueurs d'environnement d'authentification AWS pris en charge sur l'hôte de la passerelle. Si vous préférez l'authentification IMDS/shared-config sans marqueurs d'environnement, définissez `plugins.entries.amazon-bedrock.config.discovery.enabled: true`.
- OpenClaw expose la source des identifiants dans cet ordre : `AWS_BEARER_TOKEN_BEDROCK`,
  puis `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`, puis `AWS_PROFILE`, puis la
  chaîne par défaut du kit AWS SDK.
- La prise en charge du raisonnement dépend du modèle ; consultez la fiche technique du modèle Bedrock pour connaître les capacités actuelles.
- Si vous préférez un flux de clé géré, vous pouvez également placer un proxy compatible OpenAI devant Bedrock et le configurer en tant que fournisseur OpenAI à la place.

## Guardrails

Vous pouvez appliquer [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) à tous les appels de modèle Bedrock en ajoutant un objet `guardrail` à la configuration du plugin `amazon-bedrock`. Les Guardrails vous permettent d'appliquer un filtrage de contenu, un refus de sujet, des filtres de mots, des filtres d'informations sensibles et des vérifications de mise à la terre contextuelle.

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

- `guardrailIdentifier` (obligatoire) accepte un ID de garde-corps (par exemple `abc123`) ou un ARN complet (par exemple `arn:aws:bedrock:us-east-1:123456789012:guardrail/abc123`).
- `guardrailVersion` (obligatoire) spécifie quelle version publiée utiliser, ou `"DRAFT"` pour le brouillon de travail.
- `streamProcessingMode` (facultatif) contrôle si l'évaluation du garde-corps s'exécute de manière synchrone (`"sync"`) ou asynchrone (`"async"`) pendant le streaming. Si omis, Bedrock utilise son comportement par défaut.
- `trace` (facultatif) active la sortie de trace du garde-corps dans la réponse API. Définissez sur `"enabled"` ou `"enabled_full"` pour le débogage ; omettez ou définissez `"disabled"` pour la production.

Le principal IAM utilisé par la passerie doit disposer de l'autorisation `bedrock:ApplyGuardrail`
en plus des autorisations d'appel standard.

## Intégrations pour la recherche de mémoire

Bedrock peut également servir de fournisseur d'intégrations pour
la [recherche de mémoire](/en/concepts/memory-search). Cela est configuré séparément du
fournisseur d'inférence — définissez `agents.defaults.memorySearch.provider` sur `"bedrock"` :

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

Les intégrations Bedrock utilisent la même chaîne de informations d'identification du AWS SDK que l'inférence (rôles d'instance,
SSO, clés d'accès, configuration partagée et identité Web). Aucune clé API n'est
nécessaire. Lorsque `provider` est `"auto"`, Bedrock est détecté automatiquement si cette
chaîne de informations d'identification est résolue avec succès.

Les modèles d'intégration pris en charge incluent Amazon Titan Embed (v1, v2), Amazon Nova
Embed, Cohere Embed (v3, v4) et TwelveLabs Marengo. Voir
[Référence de configuration de la mémoire — Bedrock](/en/reference/memory-config#bedrock-embedding-config)
pour la liste complète des modèles et des options de dimension.
