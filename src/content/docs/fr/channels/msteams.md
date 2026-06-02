---
summary: "Microsoft TeamsÉtat du support, capacités et configuration du bot Microsoft Teams"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft TeamsMicrosoft Teams"
---

Statut : le texte + les pièces jointes en DM sont pris en charge ; l'envoi de fichiers dans les channels/groupes nécessite `sharePointSiteId` + les autorisations Graph (voir [Envoi de fichiers dans les discussions de groupe](#sending-files-in-group-chats)). Les sondages sont envoyés via Adaptive Cards. Les actions de message exposent un `upload-file` explicite pour les envois prioritaires aux fichiers.

## Plugin inclus

Microsoft Teams est fourni en tant que plugin inclus dans les versions actuelles d'OpenClaw, donc aucune installation séparée n'est requise dans la version empaquetée normale.

Si vous utilisez une ancienne version ou une installation personnalisée qui exclut Teams intégré,
installez directement le package npm :

```bash
openclaw plugins install @openclaw/msteams
```

Utilisez le package nu pour suivre l'étiquette de publication officielle actuelle. Épinglez une version
exacte uniquement lorsque vous avez besoin d'une installation reproductible.

Extraction locale (lors de l'exécution depuis un dépôt git) :

```bash
openclaw plugins install ./path/to/local/msteams-plugin
```

Détails : [Plugins](/fr/tools/plugin)

## Installation rapide

La commande [`@microsoft/teams.cli`](https://www.npmjs.com/package/@microsoft/teams.cli) gère l'inscription du bot, la création du manifeste et la génération des identifiants en une seule commande.

**1. Installer et se connecter**

```bash
npm install -g @microsoft/teams.cli@preview
teams login
teams status   # verify you're logged in and see your tenant info
```

<Note>La Teams CLI est actuellement en préversion. Les commandes et les indicateurs peuvent changer d'une version à l'autre.</Note>

**2. Démarrer un tunnel** (Teams ne peut pas atteindre localhost)

Installez et authentifiez la CLI devtunnel si ce n'est pas déjà fait ([guide de démarrage](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started)).

```bash
# One-time setup (persistent URL across sessions):
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# Each dev session:
devtunnel host my-openclaw-bot
# Your endpoint: https://<tunnel-id>.devtunnels.ms/api/messages
```

<Note>`--allow-anonymous` est requis car Teams ne peut pas s'authentifier avec devtunnels. Chaque demande de bot entrante est toujours validée automatiquement par le Teams SDK.</Note>

Alternatives : `ngrok http 3978` ou `tailscale funnel 3978` (mais ceux-ci peuvent changer les URL à chaque session).

**3. Créer l'application**

```bash
teams app create \
  --name "OpenClaw" \
  --endpoint "https://<your-tunnel-url>/api/messages"
```

Cette commande unique :

- Crée une application Entra ID (Azure AD)
- Génère une clé secrète client
- Crée et télécharge un manifeste d'application Teams (avec des icônes)
- Inscrit le bot (géré par Teams par défaut - aucun abonnement Azure requis)

La sortie affichera `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID` et un **ID d'application Teams** - notez-les pour les étapes suivantes. Il propose également d'installer l'application directement dans Teams.

**4. Configurez OpenClaw** à l'aide des informations d'identification de la sortie :

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<CLIENT_ID>",
      appPassword: "<CLIENT_SECRET>",
      tenantId: "<TENANT_ID>",
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

Ou utilisez directement les variables d'environnement : `MSTEAMS_APP_ID`, `MSTEAMS_APP_PASSWORD`, `MSTEAMS_TENANT_ID`.

**5. Installez l'application dans Teams**

`teams app create` vous invitera à installer l'application - sélectionnez « Installer dans Teams ». Si vous l'avez ignoré, vous pouvez obtenir le lien plus tard :

```bash
teams app get <teamsAppId> --install-link
```

**6. Vérifiez que tout fonctionne**

```bash
teams app doctor <teamsAppId>
```

Cela exécute des diagnostics sur l'enregistrement du bot, la configuration de l'application AAD, la validité du manifeste et la configuration SSO.

Pour les déploiements de production, envisagez d'utiliser l'authentification fédérée (/en/channels/msteams#federated-authentication-certificate-plus-managed-identity) (certificat ou identité managée) au lieu des secrets clients.

<Note>Les conversations de groupe sont bloquées par défaut (`channels.msteams.groupPolicy: "allowlist"`). Pour autoriser les réponses de groupe, définissez `channels.msteams.groupAllowFrom`, ou utilisez `groupPolicy: "open"` pour autoriser n'importe quel membre (limité par mention).</Note>

## Objectifs

- Parler à OpenClaw via Teams DM, conversations de groupe ou channels.
- Garder le routage déterministe : les réponses vont toujours au channel d'où elles proviennent.
- Par défaut, comportement de channel sécurisé (mentions requises sauf configuration contraire).

## Écritures de configuration

Par défaut, Microsoft Teams est autorisé à écrire des mises à jour de configuration déclenchées par Microsoft Teams`/config set|unset` (nécessite `commands.config: true`).

Désactiver avec :

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## Contrôle d'accès (DMs + groupes)

**Accès DM**

- Par défaut : `channels.msteams.dmPolicy = "pairing"`. Les expéditeurs inconnus sont ignorés jusqu'à ce qu'ils soient approuvés.
- `channels.msteams.allowFrom` doit utiliser des ID d'objet AAD stables ou des groupes d'accès d'expéditeurs statiques tels que `accessGroup:core-team`.
- Ne vous fiez pas à la correspondance des UPN/noms d'affichage pour les listes d'autorisation - ils peuvent changer. OpenClaw désactive la correspondance directe des noms par défaut ; activez-la explicitement avec OpenClaw`channels.msteams.dangerouslyAllowNameMatching: true`.
- L'assistant peut résoudre les noms en ID via Microsoft Graph lorsque les informations d'identification le permettent.

**Accès de groupe**

- Par défaut : `channels.msteams.groupPolicy = "allowlist"` (bloqué sauf si vous ajoutez `groupAllowFrom`). Utilisez `channels.defaults.groupPolicy` pour remplacer la valeur par défaut lorsqu'elle n'est pas définie.
- `channels.msteams.groupAllowFrom` contrôle quels expéditeurs ou groupes d'accès d'expéditeurs statiques peuvent déclencher dans les conversations de groupe/canaux (revient à `channels.msteams.allowFrom`).
- Définissez `groupPolicy: "open"` pour autoriser n'importe quel membre (toujours restreint aux mentions par défaut).
- Pour interdire **tous les canaux**, définissez `channels.msteams.groupPolicy: "disabled"`.

Exemple :

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["00000000-0000-0000-0000-000000000000", "accessGroup:core-team"],
    },
  },
}
```

**Teams + liste d'autorisation de channels**

- Délimitez les réponses de groupe/canal en répertoriant les équipes et les canaux sous `channels.msteams.teams`.
- Les clés doivent utiliser les ID de conversation Teams stables provenant des liens Teams, et non les noms d'affichage modifiables.
- Lorsque `groupPolicy="allowlist"` et une liste d'autorisation d'équipes sont présents, seules les équipes/canaux répertoriés sont acceptés (restreints aux mentions).
- L'assistant de configuration accepte les entrées `Team/Channel` et les stocke pour vous.
- Au démarrage, OpenClaw résout les noms des listes d'autorisation d'équipe/canal et d'utilisateur en ID (lorsque les autorisations Graph le permettent)
  et consigne le mappage ; les noms d'équipe/canal non résolus sont conservés tels quels mais ignorés pour le routage par défaut, sauf si OpenClaw`channels.msteams.dangerouslyAllowNameMatching: true` est activé.

Exemple :

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      teams: {
        "My Team": {
          channels: {
            General: { requireMention: true },
          },
        },
      },
    },
  },
}
```

<details>
<summary><strong>Configuration manuelle (sans le Teams CLI)</strong></summary>

Si vous ne pouvez pas utiliser le Teams CLI, vous pouvez configurer le bot manuellement via le portail Azure.

### Fonctionnement

1. Assurez-vous que le plugin Microsoft Teams est disponible (inclus dans les versions actuelles).
2. Créez un **Azure Bot** (ID d'application + secret + ID de locataire).
3. Créez un **package d'application Teams** qui référence le bot et inclut les autorisations RSC ci-dessous.
4. Téléchargez/installez l'application Teams dans une équipe (ou l'étendue personnelle pour les DMs).
5. Configurez `msteams` dans `~/.openclaw/openclaw.json` (ou env vars) et démarrez la passerelle.
6. La passerelle écoute le trafic webhook du Bot Framework sur `/api/messages` par défaut.

### Étape 1 : Créer un Azure Bot

1. Accéder à [Créer un bot Azure](https://portal.azure.com/#create/Microsoft.AzureBot)
2. Remplissez l'onglet **Basics** :

   | Champ                    | Valeur                                                                  |
   | ------------------------ | ----------------------------------------------------------------------- |
   | **Nom du bot**           | Le nom de votre bot, par exemple, `openclaw-msteams` (doit être unique) |
   | **Abonnement**           | Sélectionnez votre abonnement Azure                                     |
   | **Groupe de ressources** | Créer un nouveau ou utiliser un existant                                |
   | **Niveau tarifaire**     | **Gratuit** pour le développement/les tests                             |
   | **Type d'application**   | **Monolocataire** (recommandé - voir la note ci-dessous)                |
   | **Type de création**     | **Créer un nouvel ID d'application Microsoft**                          |

<Warning>La création de nouveaux bots multilocataires a été abandonnée après le 2025-07-31. Utilisez **Monolocataire** pour les nouveaux bots.</Warning>

3. Cliquez sur **Vérifier + créer** → **Créer** (attendre ~1-2 minutes)

### Étape 2 : Obtenir les informations d'identification

1. Accédez à votre ressource Azure Bot → **Configuration**
2. Copiez **Microsoft App ID** → c'est votre `appId`
3. Cliquez sur **Gérer le mot de passe** → accédez à l'inscription de l'application
4. Sous **Certificates & secrets** → **New client secret** → copiez la **Value** → c'est votre `appPassword`
5. Allez dans **Overview** → copiez **Directory (tenant) ID** → c'est votre `tenantId`

### Étape 3 : Configurer le point de terminaison de messagerie

1. Dans Azure Bot → **Configuration**
2. Définissez le **Point de terminaison de messagerie** sur votre URL de webhook :
   - Production : `https://your-domain.com/api/messages`
   - Dév local : Utilisez un tunnel (voir [Développement local](#local-development-tunneling) ci-dessous)

### Étape 4 : Activer le canal Teams

1. Dans Azure Bot → **Canaux**
2. Cliquez sur **Microsoft Teams** → Configurer → Enregistrer
3. Acceptez les conditions d’utilisation

### Étape 5 : Créer le manifeste de l’application Teams

- Incluez une entrée `bot` avec `botId = <App ID>`.
- Portées : `personal`, `team`, `groupChat`.
- `supportsFiles: true` (requis pour la gestion des fichiers dans la portée personnelle).
- Ajoutez les autorisations RSC (voir [Autorisations RSC](#current-teams-rsc-permissions-manifest)).
- Créez les icônes : `outline.png` (32x32) et `color.png` (192x192).
- Compressez les trois fichiers ensemble : `manifest.json`, `outline.png`, `color.png`.

### Étape 6 : Configurer OpenClaw

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      appPassword: "<APP_PASSWORD>",
      tenantId: "<TENANT_ID>",
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

Variables d'environnement : `MSTEAMS_APP_ID`, `MSTEAMS_APP_PASSWORD`, `MSTEAMS_TENANT_ID`.

### Étape 7 : Exécuter le Gateway

Le channel Teams démarre automatiquement lorsque le plugin est disponible et qu'une configuration `msteams` existe avec des identifiants.

</details>

## Authentification fédérée (certificat et identité gérée)

> Ajouté dans la version 2026.4.11

Pour les déploiements en production, OpenClaw prend en charge l'**authentification fédérée** comme alternative plus sécurisée aux secrets clients. Deux méthodes sont disponibles :

### Option A : Authentification basée sur un certificat

Utilisez un certificat PEM enregistré avec votre inscription d'application Entra ID.

**Configuration :**

1. Générez ou obtenez un certificat (format PEM avec clé privée).
2. Dans Entra ID → Inscription d'application → **Certificats et secrets** → **Certificats** → Télécharger le certificat public.

**Config :**

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      tenantId: "<TENANT_ID>",
      authType: "federated",
      certificatePath: "/path/to/cert.pem",
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

**Variables d'environnement :**

- `MSTEAMS_AUTH_TYPE=federated`
- `MSTEAMS_CERTIFICATE_PATH=/path/to/cert.pem`

### Option B : Identité gérée Azure

Utilisez l'identité gérée Azure pour une authentification sans mot de passe. C'est idéal pour les déploiements sur l'infrastructure Azure (AKS, App Service, machines virtuelles Azure) où une identité gérée est disponible.

**Fonctionnement :**

1. Le pod/VM du bot possède une identité gérée (attribuée par le système ou par l'utilisateur).
2. Une **information d'identification d'identité fédérée** lie l'identité gérée à l'inscription d'application Entra ID.
3. À l'exécution, OpenClaw utilise `@azure/identity` pour acquérir des jetons depuis le point de terminaison Azure IMDS (`169.254.169.254`).
4. Le jeton est transmis au SDK Teams pour l'authentification du bot.

**Prérequis :**

- Infrastructure Azure avec l'identité gérée activée (identité de charge de travail AKS, App Service, machine virtuelle)
- Informations d'identification d'identité fédérée créées sur l'inscription de l'application Entra ID
- Accès réseau à IMDS (`169.254.169.254:80`) depuis le pod/VM

**Configuration (identité gérée attribuée par le système) :**

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      tenantId: "<TENANT_ID>",
      authType: "federated",
      useManagedIdentity: true,
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

**Configuration (identité gérée attribuée par l'utilisateur) :**

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      tenantId: "<TENANT_ID>",
      authType: "federated",
      useManagedIdentity: true,
      managedIdentityClientId: "<MI_CLIENT_ID>",
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

**Variables d'environnement :**

- `MSTEAMS_AUTH_TYPE=federated`
- `MSTEAMS_USE_MANAGED_IDENTITY=true`
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID=<client-id>` (uniquement pour les identités affectées par l'utilisateur)

### Configuration de l'identité de charge de travail AKS

Pour les déploiements AKS utilisant l'identité de charge de travail :

1. **Activez l'identité de charge de travail** sur votre cluster AKS.
2. **Créez des informations d'identification d'identité fédérée** sur l'inscription de l'application Entra ID :

   ```bash
   az ad app federated-credential create --id <APP_OBJECT_ID> --parameters '{
     "name": "my-bot-workload-identity",
     "issuer": "<AKS_OIDC_ISSUER_URL>",
     "subject": "system:serviceaccount:<NAMESPACE>:<SERVICE_ACCOUNT>",
     "audiences": ["api://AzureADTokenExchange"]
   }'
   ```

3. **Annotez le compte de service Kubernetes** avec l'ID client de l'application :

   ```yaml
   apiVersion: v1
   kind: ServiceAccount
   metadata:
     name: my-bot-sa
     annotations:
       azure.workload.identity/client-id: "<APP_CLIENT_ID>"
   ```

4. **Étiquetez le pod** pour l'injection de l'identité de charge de travail :

   ```yaml
   metadata:
     labels:
       azure.workload.identity/use: "true"
   ```

5. **Assurez l'accès réseau** à IMDS (`169.254.169.254`) - si vous utilisez NetworkPolicy, ajoutez une règle de sortie autorisant le trafic vers `169.254.169.254/32` sur le port 80.

### Comparaison des types d'authentification

| Méthode            | Configuration                                  | Avantages                               | Inconvénients                              |
| ------------------ | ---------------------------------------------- | --------------------------------------- | ------------------------------------------ |
| **Secret client**  | `appPassword`                                  | Configuration simple                    | Rotation du secret requise, moins sécurisé |
| **Certificat**     | `authType: "federated"` + `certificatePath`    | Aucun secret partagé sur le réseau      | Surcharge de gestion des certificats       |
| **Identité gérée** | `authType: "federated"` + `useManagedIdentity` | Sans mot de passe, aucun secret à gérer | Infrastructure Azure requise               |

**Comportement par défaut :** Lorsque `authType` n'est pas défini, OpenClaw utilise par défaut l'authentification par secret client. Les configurations existantes continuent de fonctionner sans modification.

## Développement local (tunneling)

Teams ne peut pas atteindre `localhost`. Utilisez un tunnel de développement persistant pour que votre URL reste identique d'une session à l'autre :

```bash
# One-time setup:
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# Each dev session:
devtunnel host my-openclaw-bot
```

Alternatives : `ngrok http 3978` ou `tailscale funnel 3978` (les URL peuvent changer à chaque session).

Si l'URL de votre tunnel change, mettez à jour le point de terminaison :

```bash
teams app update <teamsAppId> --endpoint "https://<new-url>/api/messages"
```

## Tester le Bot

**Exécuter les diagnostics :**

```bash
teams app doctor <teamsAppId>
```

Vérifie l'inscription du bot, l'application AAD, le manifeste et la configuration SSO en une seule passe.

**Envoyer un message de test :**

1. Installez l'application Teams (utilisez le lien d'installation provenant de `teams app get <id> --install-link`)
2. Trouver le bot dans Teams et envoyer un DM
3. Vérifier les journaux de la passerelle pour l'activité entrante

## Variables d'environnement

Toutes les clés de configuration peuvent être définies via des variables d'environnement à la place :

- `MSTEAMS_APP_ID`
- `MSTEAMS_APP_PASSWORD`
- `MSTEAMS_TENANT_ID`
- `MSTEAMS_AUTH_TYPE` (facultatif : `"secret"` ou `"federated"`)
- `MSTEAMS_CERTIFICATE_PATH` (fédéré + certificat)
- `MSTEAMS_CERTIFICATE_THUMBPRINT` (facultatif, non requis pour l'authentification)
- `MSTEAMS_USE_MANAGED_IDENTITY` (fédéré + identité managée)
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID` (identité managée attribuée par l'utilisateur uniquement)

## Action Info membre

OpenClaw expose une action OpenClaw`member-info`Microsoft Teams basée sur Graph pour Microsoft Teams, permettant aux agents et aux automatisations de résoudre les détails des membres du channel (nom d'affichage, e-mail, rôle) directement à partir de Microsoft Graph.

Conditions requises :

- Permission RSC `Member.Read.Group` (déjà présente dans le manifeste recommandé)
- Pour les recherches inter-équipes : permission d'Application Graph `User.Read.All` avec consentement de l'administrateur

L'action est verrouillée par `channels.msteams.actions.memberInfo` (par défaut : activée lorsque les identifiants Graph sont disponibles).

## Contexte de l'historique

- `channels.msteams.historyLimit` contrôle le nombre de messages récents du channel/groupe inclus dans le prompt.
- Revient à `messages.groupChat.historyLimit`. Définissez `0` pour désactiver (par défaut 50).
- L'historique des fils de discussion récupéré est filtré par les listes d'autorisation d'expéditeurs (`allowFrom` / `groupAllowFrom`), ainsi l'amorçage du contexte du fil n'inclut que les messages des expéditeurs autorisés.
- Le contexte de la pièce jointe citée (`ReplyTo*` dérivé du HTML de réponse Teams) est actuellement transmis tel quel.
- En d'autres termes, les listes d'autorisation contrôlent qui peut déclencher l'agent ; seuls certains chemins de contexte supplémentaires sont filtrés aujourd'hui.
- L'historique des DM peut être limité avec `channels.msteams.dmHistoryLimit` (tours utilisateur). Remplacements par utilisateur : `channels.msteams.dms["<user_id>"].historyLimit`.

## Autorisations RSC Teams actuelles (manifeste)

Ce sont les **autorisations resourceSpecific existantes** dans le manifeste de notre application Teams. Elles ne s'appliquent qu'à l'intérieur de l'équipe/discussion où l'application est installée.

**Pour les canaux (étendue équipe) :**

- `ChannelMessage.Read.Group` (Application) - recevoir tous les messages du channel sans @mention
- `ChannelMessage.Send.Group` (Application)
- `Member.Read.Group` (Application)
- `Owner.Read.Group` (Application)
- `ChannelSettings.Read.Group` (Application)
- `TeamMember.Read.Group` (Application)
- `TeamSettings.Read.Group` (Application)

**Pour les discussions de groupe :**

- `ChatMessage.Read.Chat` (Application) - recevoir tous les messages de conversation de groupe sans @mention

Pour ajouter des autorisations RSC via le Teams CLI :

```bash
teams app rsc add <teamsAppId> ChannelMessage.Read.Group --type Application
```

## Exemple de manifeste Teams (expurgé)

Exemple minimal et valide avec les champs obligatoires. Remplacez les ID et les URL.

```json5
{
  $schema: "https://developer.microsoft.com/en-us/json-schemas/teams/v1.23/MicrosoftTeams.schema.json",
  manifestVersion: "1.23",
  version: "1.0.0",
  id: "00000000-0000-0000-0000-000000000000",
  name: { short: "OpenClaw" },
  developer: {
    name: "Your Org",
    websiteUrl: "https://example.com",
    privacyUrl: "https://example.com/privacy",
    termsOfUseUrl: "https://example.com/terms",
  },
  description: { short: "OpenClaw in Teams", full: "OpenClaw in Teams" },
  icons: { outline: "outline.png", color: "color.png" },
  accentColor: "#5B6DEF",
  bots: [
    {
      botId: "11111111-1111-1111-1111-111111111111",
      scopes: ["personal", "team", "groupChat"],
      isNotificationOnly: false,
      supportsCalling: false,
      supportsVideo: false,
      supportsFiles: true,
    },
  ],
  webApplicationInfo: {
    id: "11111111-1111-1111-1111-111111111111",
  },
  authorization: {
    permissions: {
      resourceSpecific: [
        { name: "ChannelMessage.Read.Group", type: "Application" },
        { name: "ChannelMessage.Send.Group", type: "Application" },
        { name: "Member.Read.Group", type: "Application" },
        { name: "Owner.Read.Group", type: "Application" },
        { name: "ChannelSettings.Read.Group", type: "Application" },
        { name: "TeamMember.Read.Group", type: "Application" },
        { name: "TeamSettings.Read.Group", type: "Application" },
        { name: "ChatMessage.Read.Chat", type: "Application" },
      ],
    },
  },
}
```

### Mises en garde du manifeste (champs obligatoires)

- `bots[].botId` **doit** correspondre à l'ID d'application Azure Bot.
- `webApplicationInfo.id` **doit** correspondre à l'ID d'application Azure Bot.
- `bots[].scopes` doit inclure les surfaces que vous prévoyez d'utiliser (`personal`, `team`, `groupChat`).
- `bots[].supportsFiles: true` est requis pour la gestion des fichiers dans l'étendue personnelle.
- `authorization.permissions.resourceSpecific` doit inclure la lecture/l'envoi de channel si vous souhaitez le trafic de channel.

### Mise à jour d'une application existante

Pour mettre à jour une application Teams déjà installée (par exemple, pour ajouter des autorisations RSC) :

```bash
# Download, edit, and re-upload the manifest
teams app manifest download <teamsAppId> manifest.json
# Edit manifest.json locally...
teams app manifest upload manifest.json <teamsAppId>
# Version is auto-bumped if content changed
```

Après la mise à jour, réinstallez l'application dans chaque équipe pour que les nouvelles autorisations prennent effet, et **quittez et relancez complètement Teams** (et ne fermez pas simplement la fenêtre) pour effacer les métadonnées de l'application en cache.

<details>
<summary>Mise à jour manuelle du manifeste (sans CLI)</summary>

1. Mettez à jour votre `manifest.json` avec les nouveaux paramètres
2. **Incrémentez le champ `version`** (par exemple, `1.0.0` → `1.1.0`)
3. **Re-zippez** le manifeste avec les icônes (`manifest.json`, `outline.png`, `color.png`)
4. Téléchargez le nouveau fichier zip :
   - **Centre d'administration Teams :** Applications Teams → Gérer les applications → trouver votre application → Télécharger une nouvelle version
   - **Chargement latéral :** Dans Teams → Applications → Gérer vos applications → Charger une application personnalisée

</details>

## Capacités : RSC uniquement vs Graph

### Avec **uniquement Teams RSC** (application installée, aucune permission d'API API)

Fonctionne :

- Lire le **texte** des messages de channel.
- Envoyer le **texte** des messages de channel.
- Recevoir des pièces jointes **personnelles (DM)**.

NE fonctionne PAS :

- Contenu des **images ou fichiers** de channel/groupe (la charge utile ne comprend qu'une partie HTML).
- Télécharger les pièces jointes stockées dans SharePoint/OneDrive.
- Lire l'historique des messages (au-delà de l'événement webhook en direct).

### Avec **Teams RSC + Microsoft Graph (permissions d'Application)**

Ajoute :

- Télécharger le contenu hébergé (images collées dans les messages).
- Télécharger les pièces jointes de fichiers stockées dans SharePoint/OneDrive.
- Lire l'historique des messages de channel/chat via Graph.

### RSC vs API API

| Capacité                           | Permissions RSC                      | API API                                                       |
| ---------------------------------- | ------------------------------------ | ------------------------------------------------------------- |
| **Messages en temps réel**         | Oui (via webhook)                    | Non (sondage uniquement)                                      |
| **Messages historiques**           | Non                                  | Oui (peut interroger l'historique)                            |
| **Complexité de la configuration** | Manifeste d'application uniquement   | Nécessite le consentement de l'administrateur + flux de jeton |
| **Fonctionne hors ligne**          | Non (doit être en cours d'exécution) | Oui (interrogation à tout moment)                             |

**En résumé :** RSC sert pour l'écoute en temps réel ; l'API Graph API sert pour l'accès historique. Pour rattraper les messages manqués hors ligne, vous avez besoin de l'API Graph API avec `ChannelMessage.Read.All` (requiert le consentement de l'administrateur).

## Média et historique activés par Graph (requis pour les channels)

Si vous avez besoin d'images/fichiers dans les **channels** ou souhaitez récupérer l'**historique des messages**, vous devez activer les autorisations Microsoft Graph et accorder le consentement de l'administrateur.

1. Dans Entra ID (Azure AD) **Inscription d'application**, ajoutez les **autorisations d'application** Microsoft Graph :
   - `ChannelMessage.Read.All` (pièces jointes de channel + historique)
   - `Chat.Read.All` ou `ChatMessage.Read.All` (conversations de groupe)
2. **Accorder le consentement administrateur** pour le client.
3. Augmentez la **version du manifeste** de l’application Teams, téléchargez-la à nouveau et **réinstallez l’application dans Teams**.
4. **Quittez entièrement et relancez Teams** pour effacer les métadonnées de l’application en cache.

**Autorisation supplémentaire pour les mentions d'utilisateur :** Les mentions @ des utilisateurs fonctionnent immédiatement pour les utilisateurs de la conversation. Cependant, si vous souhaitez rechercher dynamiquement et mentionner des utilisateurs qui **ne sont pas dans la conversation actuelle**, ajoutez l'autorisation `User.Read.All` (Application) et accordez le consentement de l'administrateur.

## Limitations connues

### Délais d’expiration des webhooks

Teams livre les messages via un webhook HTTP. Si le traitement prend trop de temps (par exemple, des réponses LLM lentes), vous pouvez voir :

- Délais d’expiration de la Gateway
- Teams qui réessaie d’envoyer le message (provoquant des doublons)
- Réponses ignorées

OpenClaw gère cela en répondant rapidement et en envoyant des réponses de manière proactive, mais des réponses très lentes peuvent toujours causer des problèmes.

### Prise en charge du cloud Teams et de l'URL de service

Ce chemin Teams pris en charge par le SDK est validé en direct pour le cloud public Microsoft Teams.

Les réponses entrantes utilisent le contexte de tour du SDK Teams entrant. Les opérations proactives hors contexte - envois, modifications, suppressions, cartes, sondages, messages de consentement de fichier et réponses longues en file d'attente - utilisent la référence de conversation stockée `serviceUrl`. Le cloud public utilise par défaut lvironnement cloud public du SDK Teams et autorise les références stockées sur l'hôte public du connecteur Teams : `https://smba.trafficmanager.net/`.

Le cloud public est la valeur par défaut. Vous n'avez pas besoin de définir `channels.msteams.cloud` ou `channels.msteams.serviceUrl` pour les bots cloud public normaux.

Pour les clouds Teams non publics, définissez `cloud` et la limite proactive correspondante lorsque Microsoft en publiera une :

- `channels.msteams.cloud` sélectionne le préréglage cloud du SDK Teams pour l'authentification, la validation JWT, les services de jetons et l'étendue Graph.
- `channels.msteams.serviceUrl` sélectionne la limite du point de terminaison du connecteur de bot utilisée pour valider les références de conversation stockées avant les envois, modifications, suppressions, cartes, sondages, messages de consentement de fichier et réponses longues en file d'attente proactifs. Elle est requise pour les clouds SDK USGov et DoD. Pour la Chine/21Vianet, OpenClaw utilise le préréglage `China` du SDK et n'accepte les URL de service stockées/configurées que sur les hôtes de channel du Bot Framework Azure Chine.

Microsoft publie les points de terminaison globaux proactifs du Bot Connector dans la section [Créer la conversation](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages?tabs=dotnet#create-the-conversation) de la documentation de messagerie proactive Teams. Utilisez le `serviceUrl` de l'activité entrante lorsque disponible ; si vous avez besoin d'un point de terminaison proactif global, utilisez le tableau de Microsoft.

| Environnement Teams | Configuration OpenClaw                                                    | Proactif `serviceUrl`                              |
| ------------------- | ------------------------------------------------------------------------- | -------------------------------------------------- |
| Public              | pas de configuration cloud/serviceUrl nécessaire                          | `https://smba.trafficmanager.net/teams`            |
| GCC                 | définir `serviceUrl` ; aucun préréglage cloud SDK Teams distinct n'existe | `https://smba.infra.gcc.teams.microsoft.com/teams` |
| GCC High            | `cloud: "USGov"` + `serviceUrl`                                           | `https://smba.infra.gov.teams.microsoft.us/teams`  |
| DoD                 | `cloud: "USGovDoD"` + `serviceUrl`                                        | `https://smba.infra.dod.teams.microsoft.us/teams`  |
| Chine/21Vianet      | `cloud: "China"`                                                          | utilisez le `serviceUrl` de l'activité entrante    |

Exemple pour GCC, où Microsoft documente une URL de service proactive distincte mais le SDK Teams n'expose pas de préréglage cloud GCC distinct :

```json
{
  "channels": {
    "msteams": {
      "serviceUrl": "https://smba.infra.gcc.teams.microsoft.com/teams"
    }
  }
}
```

Exemple pour GCC High :

```json
{
  "channels": {
    "msteams": {
      "cloud": "USGov",
      "serviceUrl": "https://smba.infra.gov.teams.microsoft.us/teams"
    }
  }
}
```

`channels.msteams.serviceUrl` est restreint aux hôtes du connecteur de bot Microsoft Teams pris en charge. Lorsqu'une URL de service est configurée, OpenClaw vérifie que le `serviceUrl` de conversation stocké utilise le même hôte avant que les envois proactifs, les modifications, les suppressions, les cartes, les sondages ou les réponses longues en file d'attente ne s'exécutent. Avec la configuration cloud publique par défaut, OpenClaw échoue de manière fermée si une conversation stockée pointe vers l'extérieur de l'hôte du connecteur Teams public. Recevez un nouveau message de la conversation après avoir modifié les paramètres d'URL cloud/service afin que la référence de conversation stockée soit à jour.

Chine/21Vianet n'a pas d'URL proactive globale `smba` distincte dans le tableau des points de terminaison proactifs Teams de Microsoft. Configurez `cloud: "China"` afin que le SDK Teams utilise les points de terminaison d'authentification, de jeton et JWT Azure Chine. Les envois proactifs nécessitent alors une référence de conversation stockée provenant d'une activité Teams Chine entrante, ou une URL de service explicitement configurée, sur la limite du channel Bot Framework Azure Chine (`*.botframework.azure.cn`). Les assistants Teams basés sur Graph sont actuellement désactivés pour `cloud: "China"` jusqu'à ce que OpenClaw achemine les demandes Graph via le point de terminaison Graph Azure Chine.

### Mise en forme

Le markdown Teams est plus limité que Slack ou Discord :

- La mise en forme de base fonctionne : **gras**, _italique_, `code`, liens
- Le markdown complexe (tableaux, listes imbriquées) peut ne pas s'afficher correctement
- Les cartes adaptatives sont prises en charge pour les sondages et les envois de présentation sémantique (voir ci-dessous)

## Configuration

Paramètres clés (voir `/gateway/configuration` pour les modèles de channel partagés) :

- `channels.msteams.enabled` : activer/désactiver le channel.
- `channels.msteams.appId`, `channels.msteams.appPassword`, `channels.msteams.tenantId` : identifiants du bot.
- `channels.msteams.cloud` : environnement cloud du SDK Teams (`Public`, `USGov`, `USGovDoD` ou `China` ; défaut `Public`). Définissez ceci avec `serviceUrl` pour les clouds SDK USGov/DoD ; la Chine utilise le préréglage SDK et les références de conversation stockées du Azure China Bot Framework, avec les assistants basés sur Graph désactivés jusqu'à ce que le routage Graph Azure China soit implémenté.
- `channels.msteams.serviceUrl` : limite de l'URL du service Bot Connector pour les opérations proactives du SDK. Le cloud public utilise la valeur par défaut du SDK ; définissez ceci pour GCC (`https://smba.infra.gcc.teams.microsoft.com/teams`), GCC High ou DoD. La Chine accepte les hôtes de canal du Azure China Bot Framework lorsque la référence de conversation stockée provient de Teams exploité par 21Vianet.
- `channels.msteams.webhook.port` (défaut `3978`)
- `channels.msteams.webhook.path` (défaut `/api/messages`)
- `channels.msteams.dmPolicy` : `pairing | allowlist | open | disabled` (défaut : jumelage)
- `channels.msteams.allowFrom` : liste d'autorisation DM (ID d'objets AAD recommandés). L'assistant résout les noms en ID lors de la configuration lorsque l'accès Graph est disponible.
- `channels.msteams.dangerouslyAllowNameMatching` : interrupteur break-glass pour réactiver la correspondance mutable UPN/nom d'affichage et le routage direct par nom d'équipe/channel.
- `channels.msteams.textChunkLimit` : taille du bloc de texte sortant.
- `channels.msteams.chunkMode` : `length` (défaut) ou `newline` pour diviser sur les lignes vides (limites de paragraphe) avant le découpage par longueur.
- `channels.msteams.mediaAllowHosts` : liste d'autorisation pour les hôtes de pièces jointes entrantes (par défaut domaines Microsoft/Teams).
- `channels.msteams.mediaAuthAllowHosts` : liste d'autorisation pour attacher les en-têtes Authorization lors des nouvelles tentatives de média (par défaut hôtes Graph + Bot Framework).
- `channels.msteams.requireMention` : exiger @mention dans les channels/groupes (vrai par défaut).
- `channels.msteams.replyStyle` : `thread | top-level` (voir [Style de réponse](#reply-style-threads-vs-posts)).
- `channels.msteams.teams.<teamId>.replyStyle` : remplacement par équipe.
- `channels.msteams.teams.<teamId>.requireMention` : remplacement par équipe.
- `channels.msteams.teams.<teamId>.tools` : remplacements de la stratégie d'outil par équipe par défaut (`allow`/`deny`/`alsoAllow`) utilisés lorsqu'un remplacement de canal est manquant.
- `channels.msteams.teams.<teamId>.toolsBySender` : remplacements de la stratégie d'outil par équipe par expéditeur par défaut (caractère générique `"*"` pris en charge).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle` : remplacement par canal.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention` : remplacement par canal.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools` : remplacements de la stratégie d'outil par canal (`allow`/`deny`/`alsoAllow`).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender` : remplacements de la stratégie d'outil par canal par expéditeur (caractère générique `"*"` pris en charge).
- Les clés `toolsBySender` doivent utiliser des préfixes explicites :
  `channel:`, `id:`, `e164:`, `username:`, `name:` (les clés sans préfixe héritées mappent toujours uniquement vers `id:`).
- `channels.msteams.actions.memberInfo` : activer ou désactiver l'action d'informations sur les membres basée sur Graph (par défaut : activé lorsque les informations d'identification Graph sont disponibles).
- `channels.msteams.authType` : type d'authentification - `"secret"` (par défaut) ou `"federated"`.
- `channels.msteams.certificatePath` : chemin vers le fichier de certificat PEM (authentification fédérée + certificat).
- `channels.msteams.certificateThumbprint` : empreinte du certificat (facultatif, non requis pour l'authentification).
- `channels.msteams.useManagedIdentity` : activer l'authentification par identité gérée (mode fédéré).
- `channels.msteams.managedIdentityClientId` : ID client pour l'identité gérée attribuée par l'utilisateur.
- `channels.msteams.sharePointSiteId` : ID de site SharePoint pour les téléchargements de fichiers dans les discussions de groupe/channels (voir [Envoi de fichiers dans les discussions de groupe](#sending-files-in-group-chats)).

## Routage et sessions

- Les clés de session suivent le format standard de l'agent (voir [/concepts/session](/fr/concepts/session)) :
  - Les messages directs partagent la session principale (`agent:<agentId>:<mainKey>`).
  - Les messages de canal/groupe utilisent l'ID de conversation :
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## Style de réponse : fils de discussion ou messages

Teams a récemment introduit deux styles d'interface utilisateur de canal basés sur le même modèle de données sous-jacent :

| Style                                | Description                                                                                      | `replyStyle` recommandé |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ | ----------------------- |
| **Messages** (classique)             | Les messages apparaissent sous forme de cartes avec des réponses en fil de discussion en dessous | `thread` (par défaut)   |
| **Fils de discussion** (style Slack) | Les messages s'affichent de manière linéaire, plus comme Slack                                   | `top-level`             |

**Le problème :** L'API Teams n'indique pas quel style d'interface utilisateur un canal utilise. Si vous utilisez le mauvais `replyStyle` :

- `thread` dans un canal style Fils de discussion → les réponses apparaissent de manière maladroite et imbriquées
- `top-level` dans un canal style Messages → les réponses apparaissent comme des messages de premier niveau séparés au lieu d'être dans le fil

**Solution :** Configurez `replyStyle` par canal en fonction de la configuration du canal :

```json5
{
  channels: {
    msteams: {
      replyStyle: "thread",
      teams: {
        "19:abc...@thread.tacv2": {
          channels: {
            "19:xyz...@thread.tacv2": {
              replyStyle: "top-level",
            },
          },
        },
      },
    },
  },
}
```

### Priorité de résolution

Lorsque le bot envoie une réponse dans un canal, `replyStyle` est résolu à partir de la redéfinition la plus spécifique jusqu'à la valeur par défaut. La première valeur non `undefined` l'emporte :

1. **Par canal** — `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`
2. **Par équipe** — `channels.msteams.teams.<teamId>.replyStyle`
3. **Global** — `channels.msteams.replyStyle`
4. **Par défaut implicite** — dérivé de `requireMention` :
   - `requireMention: true` → `thread`
   - `requireMention: false` → `top-level`

Si vous définissez `requireMention: false` globalement sans `replyStyle` explicite, les mentions dans les canaux de style Messages apparaîtront comme des messages de premier niveau même lorsque le message entrant était une réponse dans un fil. Épinglez `replyStyle: "thread"` au niveau global, de l'équipe ou du canal pour éviter les surprises.

### Préservation du contexte du fil de discussion

Lorsque `replyStyle: "thread"` est en vigueur et que le bot a été @mentionné depuis un fil de discussion de canal, OpenClaw rattache la racine du fil d'origine à la référence de conversation sortante (`19:…@thread.tacv2;messageid=<root>`) afin que la réponse soit placée dans le même fil. Cela s'applique aux envois en direct (en cours de tour) et aux envois proactifs effectués après l'expiration du contexte de tour du Bot Framework (par exemple, agents de longue durée, réponses d'appels d'outil en file d'attente via `mcp__openclaw__message`).

La racine du fil est extraite de `threadId` stocké sur la référence de conversation. Les références stockées plus anciennes qui datent d'avant `threadId` reviennent à `activityId` (quelle que soit l'activité entrante qui a initié la conversation pour la dernière fois), afin que les déploiements existants continuent de fonctionner sans réinitialisation.

Lorsque `replyStyle: "top-level"` est en vigueur, les messages entrants de fils de discussion de canal sont volontairement répondus sous forme de nouveaux messages de premier niveau — aucun suffixe de fil n'est attaché. Il s'agit du comportement correct pour les canaux de style Threads ; si vous voyez des messages de premier niveau là où vous attendiez des réponses en fil, votre `replyStyle` est mal configuré pour ce canal.

## Pièces jointes et images

**Limitations actuelles :**

- **DMs :** Les images et les pièces jointes fonctionnent via les API de fichier de bot Teams.
- **Canaux/groupes :** Les pièces jointes résident dans le stockage M365 (SharePoint/OneDrive). La charge utile du webhook n'inclut qu'un fragment HTML, et non les octets réels du fichier. **Les autorisations de l'API Graph sont requises** pour télécharger les pièces jointes de canal.
- Pour les envois explicites en mode fichier prioritaire, utilisez `action=upload-file` avec `media` / `filePath` / `path` ; le `message` facultatif devient le texte/commentaire d'accompagnement, et `filename` remplace le nom téléchargé.

Sans les autorisations Graph, les messages de canal contenant des images seront reçus sous forme de texte uniquement (le contenu de l'image n'est pas accessible au bot).
Par défaut, OpenClaw ne télécharge les médias que des noms d'hôte Microsoft/Teams. Remplacez cela par `channels.msteams.mediaAllowHosts` (utilisez `["*"]` pour autoriser n'importe quel hôte).
Les en-têtes d'autorisation sont uniquement attachés aux hôtes dans `channels.msteams.mediaAuthAllowHosts` (par défaut, les hôtes Graph + Bot Framework). Gardez cette liste stricte (évitez les suffixes multi-locataires).

## Envoi de fichiers dans les conversations de groupe

Les bots peuvent envoyer des fichiers dans les DMs en utilisant le flux FileConsentCard (intégré). Cependant, **l'envoi de fichiers dans les conversations de groupe/canaux** nécessite une configuration supplémentaire :

| Contexte                 | Comment les fichiers sont envoyés                           | Configuration nécessaire                           |
| ------------------------ | ----------------------------------------------------------- | -------------------------------------------------- |
| **DMs**                  | FileConsentCard → l'utilisateur accepte → le bot télécharge | Fonctionne directement                             |
| **Group chats/channels** | Télécharger vers SharePoint → partager le lien              | Nécessite `sharePointSiteId` + autorisations Graph |
| **Images (any context)** | Codées en Base64 en ligne                                   | Fonctionne directement                             |

### Pourquoi les conversations de groupe ont besoin de SharePoint

Les bots n'ont pas de lecteur OneDrive personnel (le point de terminaison `/me/drive` du Graph API ne fonctionne pas pour les identités d'application). Pour envoyer des fichiers dans les conversations de groupe/canaux, le bot télécharge sur un **site SharePoint** et crée un lien de partage.

### Configuration

1. **Ajoutez les autorisations Graph API** dans Entra ID (Azure AD) → Inscription de l'application :
   - `Sites.ReadWrite.All` (Application) - télécharger des fichiers vers SharePoint
   - `Chat.Read.All` (Application) - facultatif, active les liens de partage par utilisateur

2. **Accorder le consentement administrateur** pour le locataire.

3. **Obtenez l'ID de votre site SharePoint :**

   ```bash
   # Via Graph Explorer or curl with a valid token:
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/{hostname}:/{site-path}"

   # Example: for a site at "contoso.sharepoint.com/sites/BotFiles"
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/BotFiles"

   # Response includes: "id": "contoso.sharepoint.com,guid1,guid2"
   ```

4. **Configurez OpenClaw :**

   ```json5
   {
     channels: {
       msteams: {
         // ... other config ...
         sharePointSiteId: "contoso.sharepoint.com,guid1,guid2",
       },
     },
   }
   ```

### Comportement de partage

| Autorisation                            | Comportement de partage                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Sites.ReadWrite.All` uniquement        | Lien de partage à l'échelle de l'organisation (toute personne de l'organisation peut y accéder) |
| `Sites.ReadWrite.All` + `Chat.Read.All` | Lien de partage par utilisateur (seuls les membres de la conversation peuvent y accéder)        |

Le partage par utilisateur est plus sécurisé car seuls les participants à la conversation peuvent accéder au fichier. Si l'autorisation `Chat.Read.All` est manquante, le bot revient au partage à l'échelle de l'organisation.

### Comportement de repli

| Scénario                                                        | Résultat                                                                         |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Conversation de groupe + fichier + `sharePointSiteId` configuré | Téléverser sur SharePoint, envoyer le lien de partage                            |
| Conversation de groupe + fichier + pas de `sharePointSiteId`    | Tenter le téléversement sur OneDrive (peut échouer), envoyer uniquement le texte |
| Conversation personnelle + fichier                              | Flux FileConsentCard (fonctionne sans SharePoint)                                |
| N'importe quel contexte + image                                 | Intégré en Base64 (fonctionne sans SharePoint)                                   |

### Emplacement de stockage des fichiers

Les fichiers téléversés sont stockés dans un dossier `/OpenClawShared/` de la bibliothèque de documents par défaut du site SharePoint configuré.

## Sondages (Cartes adaptatives)

OpenClaw envoie les sondages Teams sous forme de Cartes adaptatives (il n'y a pas d'API native de sondage Teams).

- CLI : `openclaw message poll --channel msteams --target conversation:<id> ...`
- Les votes sont enregistrés par la passerelle dans le SQLite de l'état du plugin OpenClaw sous `state/openclaw.sqlite`.
- Les fichiers `msteams-polls.json` existants sont importés une seule fois au démarrage du plugin MSTeams.
- La passerelle doit rester en ligne pour enregistrer les votes.
- Les sondages ne publient pas encore automatiquement de résumés des résultats, et il n'y a pas encore de CLI pour les résultats de sondage pris en charge.

## Cartes de présentation

Envoyez des charges utiles de présentation sémantique aux utilisateurs ou conversations Teams à l'aide de l'outil `message`, de la CLI ou de la livraison de réponse normale. OpenClaw les restitue sous forme de cartes adaptatives Teams à partir du contrat de présentation générique.

Le paramètre `presentation` accepte les blocs sémantiques. Lorsque `presentation` est fourni, le texte du message est facultatif. Les boutons s'affichent sous forme d'actions d'envoi ou d'URL de carte adaptative. Les menus de sélection ne sont pas natifs dans le moteur de rendu Teams pour le moment, donc OpenClaw les rétrograde en texte lisible avant la livraison.

**Agent tool :**

```json5
{
  action: "send",
  channel: "msteams",
  target: "user:<id>",
  presentation: {
    title: "Hello",
    blocks: [{ type: "text", text: "Hello!" }],
  },
}
```

**CLI :**

```bash
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --presentation '{"title":"Hello","blocks":[{"type":"text","text":"Hello!"}]}'
```

Pour plus de détails sur les formats cibles, consultez la section [Formats cibles](#target-formats) ci-dessous.

## Formats cibles

Les cibles MSTeams utilisent des préfixes pour distinguer les utilisateurs et les conversations :

| Type de cible         | Format                           | Exemple                                               |
| --------------------- | -------------------------------- | ----------------------------------------------------- |
| Utilisateur (par ID)  | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`           |
| Utilisateur (par nom) | `user:<display-name>`            | `user:John Smith` (nécessite l'API Graph)             |
| Groupe/canal          | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`              |
| Groupe/canal (brut)   | `<conversation-id>`              | `19:abc123...@thread.tacv2` (s'il contient `@thread`) |

**Exemples CLI :**

```bash
# Send to a user by ID
openclaw message send --channel msteams --target "user:40a1a0ed-..." --message "Hello"

# Send to a user by display name (triggers Graph API lookup)
openclaw message send --channel msteams --target "user:John Smith" --message "Hello"

# Send to a group chat or channel
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" --message "Hello"

# Send a presentation card to a conversation
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" \
  --presentation '{"title":"Hello","blocks":[{"type":"text","text":"Hello"}]}'
```

**Exemples d'outil d'agent :**

```json5
{
  action: "send",
  channel: "msteams",
  target: "user:John Smith",
  message: "Hello!",
}
```

```json5
{
  action: "send",
  channel: "msteams",
  target: "conversation:19:abc...@thread.tacv2",
  presentation: {
    title: "Hello",
    blocks: [{ type: "text", text: "Hello" }],
  },
}
```

<Note>Sans le préfixe `user:`, les noms sont résolus par défaut vers un groupe ou une équipe. Utilisez toujours `user:` lorsque vous ciblez des personnes par leur nom d'affichage.</Note>

## Messagerie proactive

- Les messages proactifs ne sont possibles qu'**après** qu'un utilisateur a interagi, car nous stockons les références de conversation à ce moment-là.
- Consultez `/gateway/configuration` pour `dmPolicy` et le filtrage par liste blanche.

## ID d'équipe et de canal (piège courant)

Le paramètre de requête `groupId` dans les URL Teams n'est **PAS** l'ID d'équipe utilisé pour la configuration. Extrayez plutôt les ID du chemin de l'URL :

**URL d'équipe :**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team conversation ID (URL-decode this)
```

**URL de canal :**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID (URL-decode this)
```

**Pour la configuration :**

- Clé d'équipe = segment de chemin après `/team/` (décodé URL, p. ex. `19:Bk4j...@thread.tacv2` ; les anciens locataires peuvent afficher `@thread.skype`, ce qui est également valide)
- Clé de channel = segment de chemin après `/channel/` (décodé URL)
- **Ignorer** le paramètre de requête `groupId` pour le routage OpenClaw. C'est l'ID de groupe Microsoft Entra, et non l'ID de conversation du Bot Framework utilisé dans les activités Teams entrantes.

## Channels privés

Les bots ont une prise en charge limitée dans les channels privés :

| Fonctionnalité                   | Channels standards | Channels privés                |
| -------------------------------- | ------------------ | ------------------------------ |
| Installation du bot              | Oui                | Limité                         |
| Messages en temps réel (webhook) | Oui                | Peut ne pas fonctionner        |
| Autorisations RSC                | Oui                | Peut se comporter différemment |
| @mentions                        | Oui                | Si le bot est accessible       |
| Historique du Graph API          | Oui                | Oui (avec autorisations)       |

**Solutions de contournement si les channels privés ne fonctionnent pas :**

1. Utiliser les channels standards pour les interactions avec le bot
2. Utiliser les DMs - les utilisateurs peuvent toujours envoyer un message directement au bot
3. Utiliser le Graph API pour l'accès historique (nécessite `ChannelMessage.Read.All`)

## Dépannage

### Problèmes courants

- **Images ne s'affichant pas dans les channels :** Autorisations Graph ou consentement administrateur manquant. Réinstallez l'application Teams et quittez/rouvrez complètement Teams.
- **Aucune réponse dans le channel :** les mentions sont requises par défaut ; définissez `channels.msteams.requireMention=false` ou configurez par équipe/channel.
- **Incompatibilité de version (Teams affiche toujours l'ancien manifeste) :** supprimez et rajoutez l'application et quittez entièrement Teams pour rafraîchir.
- **401 Unauthorized depuis le webhook :** Attendu lors de tests manuels sans JWT Azure - cela signifie que le point de terminaison est accessible mais que l'authentification a échoué. Utilisez Azure Web Chat pour tester correctement.

### Erreurs de téléchargement de manifeste

- **"Le fichier d'icône ne peut pas être vide" :** Le manifeste référence des fichiers d'icône de 0 octet. Créez des icônes PNG valides (32x32 pour `outline.png`, 192x192 pour `color.png`).
- **"webApplicationInfo.Id déjà utilisé" :** L'application est toujours installée dans une autre équipe/discussion. Trouvez-la et désinstallez-la d'abord, ou attendez 5 à 10 minutes pour la propagation.
- **"Une erreur s'est produite" lors du téléchargement :** Téléchargez via [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) à la place, ouvrez les outils de développement du navigateur (F12) → onglet Réseau, et vérifiez le corps de la réponse pour l'erreur réelle.
- **Échec du chargement latéral :** Essayez « Télécharger une application dans le catalogue d'applications de votre organisation » au lieu de « Télécharger une application personnalisée » — cela contourne souvent les restrictions de chargement latéral.

### Les autorisations RSC ne fonctionnent pas

1. Vérifiez que `webApplicationInfo.id` correspond exactement à l'ID d'application de votre bot
2. Téléchargez à nouveau l'application et réinstallez-la dans l'équipe/la conversation
3. Vérifiez si votre administrateur d'organisation a bloqué les autorisations RSC
4. Confirmez que vous utilisez la bonne portée : `ChannelMessage.Read.Group` pour les équipes, `ChatMessage.Read.Chat` pour les conversations de groupe

## Références

- [Créer un bot Azure](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) — Guide de configuration du bot Azure
- [Portail des développeurs Teams](https://dev.teams.microsoft.com/apps) — Créer/gérer les applications Teams
- [Schéma du manifeste d'application Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Recevoir les messages de canal avec RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [Référence des autorisations RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Gestion des fichiers par le bot Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (le canal/groupe nécessite Graph)
- [Messagerie proactive](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
- [@microsoft/teams.cli](https://www.npmjs.com/package/@microsoft/teams.cli) — Teams CLI pour la gestion des bots

## Connexes

- [Aperçu des canaux](/fr/channels) — Tous les canaux pris en charge
- [Appairage](/fr/channels/pairing) — Authentification DM et flux d'appairage
- [Groupes](/fr/channels/groups) — Comportement de conversation de groupe et filtrage des mentions
- [Routage de canal](/fr/channels/channel-routing) — Routage de session pour les messages
- [Sécurité](/fr/gateway/security) — Modèle d'accès et durcissement
