---
summary: "État du support, capacités et configuration du bot Microsoft Teams"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft Teams"
---

État : le texte + les pièces jointes en DM sont pris en charge ; l'envoi de fichiers vers les channels/groupes nécessite `sharePointSiteId` + des autorisations Graph (voir [Sending files in group chats](#sending-files-in-group-chats)). Les sondages sont envoyés via Adaptive Cards. Les actions de message exposent un `upload-file` explicite pour les envois priorisant le fichier.

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

Le [`@microsoft/teams.cli`](https://www.npmjs.com/package/@microsoft/teams.cli) gère l'inscription du bot, la création du manifeste et la génération des identifiants en une seule commande.

**1. Installer et se connecter**

```bash
npm install -g @microsoft/teams.cli@preview
teams login
teams status   # verify you're logged in and see your tenant info
```

<Note>La Teams CLI est actuellement en préversion. Les commandes et les indicateurs peuvent changer d'une version à l'autre.</Note>

**2. Démarrer un tunnel** (Teams ne peut pas atteindre localhost)

Installez et authentifiez le CLI devtunnel si ce n'est pas déjà fait ([getting started guide](CLIhttps://learn.microsoft.com/en-us/azure/developer/dev-tunnels/get-started)).

```bash
# One-time setup (persistent URL across sessions):
devtunnel create my-openclaw-bot --allow-anonymous
devtunnel port create my-openclaw-bot -p 3978 --protocol auto

# Each dev session:
devtunnel host my-openclaw-bot
# Your endpoint: https://<tunnel-id>.devtunnels.ms/api/messages
```

<Note>`--allow-anonymous` est requis car Teams ne peut pas s'authentifier avec devtunnels. Chaque demande de bot entrante est toujours validée automatiquement par le SDK Teams.</Note>

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

`teams app create` vous invitera à installer l'application - sélectionnez « Installer dans Teams ». Si vous avez ignoré cette étape, vous pouvez obtenir le lien plus tard :

```bash
teams app get <teamsAppId> --install-link
```

**6. Vérifiez que tout fonctionne**

```bash
teams app doctor <teamsAppId>
```

Cela exécute des diagnostics sur l'enregistrement du bot, la configuration de l'application AAD, la validité du manifeste et la configuration SSO.

Pour les déploiements en production, envisagez d'utiliser la [federated authentication](/fr/channels/msteams#federated-authentication-certificate-plus-managed-identity) (certificat ou identité gérée) au lieu des secrets client.

<Note>Les conversations de groupe sont bloquées par défaut (`channels.msteams.groupPolicy: "allowlist"`). Pour autoriser les réponses de groupe, définissez `channels.msteams.groupAllowFrom`, ou utilisez `groupPolicy: "open"` pour autoriser n'importe quel membre (limité par mention).</Note>

## Objectifs

- Parler à OpenClaw via Teams DM, conversations de groupe ou channels.
- Garder le routage déterministe : les réponses vont toujours au channel d'où elles proviennent.
- Par défaut, comportement de channel sécurisé (mentions requises sauf configuration contraire).

## Écritures de configuration

Par défaut, Microsoft Teams est autorisé à écrire des mises à jour de configuration déclenchées par `/config set|unset` (nécessite `commands.config: true`).

Désactiver avec :

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## Contrôle d'accès (DMs + groupes)

**Accès DM**

- Par défaut : `channels.msteams.dmPolicy = "pairing"`. Les expéditeurs inconnus sont ignorés jusqu'à approbation.
- `channels.msteams.allowFrom` doit utiliser des ID d'objet AAD stables ou des groupes d'accès d'expéditeur statiques tels que `accessGroup:core-team`.
- Ne vous fiez pas à la correspondance UPN/nom d'affichage pour les listes blanches - ils peuvent changer. OpenClaw désactive la correspondance directe des noms par défaut ; activez-la explicitement avec `channels.msteams.dangerouslyAllowNameMatching: true`.
- L'assistant peut résoudre les noms en ID via Microsoft Graph lorsque les informations d'identification le permettent.

**Accès de groupe**

- Par défaut : `channels.msteams.groupPolicy = "allowlist"` (bloqué sauf si vous ajoutez `groupAllowFrom`). Utilisez `channels.defaults.groupPolicy` pour remplacer la valeur par défaut lorsqu'elle n'est pas définie.
- `channels.msteams.groupAllowFrom` contrôle quels expéditeurs ou groupes d'accès d'expéditeur statiques peuvent déclencher dans les conversations de groupe/canaux (revient à `channels.msteams.allowFrom`).
- Définissez `groupPolicy: "open"` pour autoriser n'importe quel membre (toujours restreint aux mentions par défaut).
- Pour n'autoriser **aucun channel**, définissez `channels.msteams.groupPolicy: "disabled"`.

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

- Délimitez les réponses de groupe/channel en listant les équipes et les channels sous `channels.msteams.teams`.
- Les clés doivent utiliser les ID de conversation Teams stables provenant des liens Teams, et non les noms d'affichage modifiables.
- Lorsque `groupPolicy="allowlist"` et une liste d'autorisation d'équipes sont présents, seules les équipes/channels listés sont acceptés (restreint aux mentions).
- L'assistant de configuration accepte les entrées `Team/Channel` et les stocke pour vous.
- Au démarrage, OpenClaw résout les noms des listes d'autorisation d'équipe/channel et d'utilisateur en ID (lorsque les autorisations Graph le permettent)
  et enregistre le mappage ; les noms d'équipe/channel non résolus sont conservés tels quels mais ignorés pour le routage par défaut, sauf si `channels.msteams.dangerouslyAllowNameMatching: true` est activé.

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
5. Configurez `msteams` dans `~/.openclaw/openclaw.json` (ou les env vars) et démarrez la passerelle.
6. Par défaut, la passerelle écoute le trafic du webhook Bot Framework sur `/api/messages`.

### Étape 1 : Créer un Azure Bot

1. Accédez à [Create Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. Remplissez l'onglet **Basics** :

   | Champ                    | Valeur                                                            |
   | ------------------------ | ----------------------------------------------------------------- |
   | **Nom du bot**           | Le nom de votre bot, p. ex. `openclaw-msteams` (doit être unique) |
   | **Abonnement**           | Sélectionnez votre abonnement Azure                               |
   | **Groupe de ressources** | Créer un nouveau ou utiliser un existant                          |
   | **Niveau tarifaire**     | **Gratuit** pour le développement/les tests                       |
   | **Type d'application**   | **Monolocataire** (recommandé - voir la note ci-dessous)          |
   | **Type de création**     | **Créer un nouvel ID d'application Microsoft**                    |

<Warning>La création de nouveaux bots multilocataires a été abandonnée après le 2025-07-31. Utilisez **Monolocataire** pour les nouveaux bots.</Warning>

3. Cliquez sur **Vérifier + créer** → **Créer** (attendre ~1-2 minutes)

### Étape 2 : Obtenir les informations d'identification

1. Accédez à votre ressource Azure Bot → **Configuration**
2. Copiez l'**ID d'application Microsoft** → il s'agit de votre `appId`
3. Cliquez sur **Gérer le mot de passe** → accédez à l'inscription de l'application
4. Sous **Certificats et secrets** → **Nouveau secret client** → copiez la **Valeur** → il s'agit de votre `appPassword`
5. Allez dans **Vue d’ensemble** → copiez **ID de répertoire (locataire)** → c’est votre `tenantId`

### Étape 3 : Configurer le point de terminaison de messagerie

1. Dans Azure Bot → **Configuration**
2. Définissez le **Point de terminaison de messagerie** sur votre URL de webhook :
   - Production : `https://your-domain.com/api/messages`
   - Dev local : Utilisez un tunnel (voir [Local Development](#local-development-tunneling) ci-dessous)

### Étape 4 : Activer le canal Teams

1. Dans Azure Bot → **Canaux**
2. Cliquez sur **Microsoft Teams** → Configurer → Enregistrer
3. Acceptez les conditions d’utilisation

### Étape 5 : Créer le manifeste de l’application Teams

- Incluez une entrée `bot` avec `botId = <App ID>`.
- Étendues (scopes) : `personal`, `team`, `groupChat`.
- `supportsFiles: true` (requis pour la gestion des fichiers dans l’étendue personnelle).
- Ajoutez les autorisations RSC (voir [RSC Permissions](#current-teams-rsc-permissions-manifest)).
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

Le channel Teams démarre automatiquement lorsque le plugin est disponible et que la configuration `msteams` existe avec les identifiants.

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
3. Lors de l'exécution, OpenClaw utilise OpenClaw`@azure/identity` pour acquérir des jetons à partir du point de terminaison IMDS Azure (`169.254.169.254`).
4. Le jeton est transmis au SDK Teams pour l'authentification du bot.

**Prérequis :**

- Infrastructure Azure avec l'identité gérée activée (identité de charge de travail AKS, App Service, machine virtuelle)
- Informations d'identification d'identité fédérée créées sur l'inscription de l'application Entra ID
- Accès réseau à IMDS (`169.254.169.254:80`) depuis le pod/la machine virtuelle

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
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID=<client-id>` (uniquement pour l'identité attribuée par l'utilisateur)

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

Teams ne peut pas atteindre `localhost`. Utilisez un tunnel de développement persistant afin que votre URL reste la même d'une session à l'autre :

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

1. Installer l'application Teams (utilisez le lien d'installation provenant de `teams app get <id> --install-link`)
2. Trouver le bot dans Teams et envoyer un DM
3. Vérifier les journaux de la passerelle pour l'activité entrante

## Variables d'environnement

Toutes les clés de configuration peuvent être définies via des variables d'environnement à la place :

- `MSTEAMS_APP_ID`
- `MSTEAMS_APP_PASSWORD`
- `MSTEAMS_TENANT_ID`
- `MSTEAMS_AUTH_TYPE` (optionnel : `"secret"` ou `"federated"`)
- `MSTEAMS_CERTIFICATE_PATH` (fédéré + certificat)
- `MSTEAMS_CERTIFICATE_THUMBPRINT` (optionnel, non requis pour l'auth)
- `MSTEAMS_USE_MANAGED_IDENTITY` (fédéré + identité gérée)
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID` (identité gérée affectée par l'utilisateur uniquement)

## Action Info membre

OpenClaw expose une action `member-info` basée sur Graph pour Microsoft Teams afin que les agents et automatisations puissent récupérer les détails des membres du channel (nom d'affichage, e-mail, rôle) directement à partir de Microsoft Graph.

Conditions requises :

- Autorisation RSC `Member.Read.Group` (déjà présente dans le manifeste recommandé)
- Pour les recherches inter-équipes : `User.Read.All` Graph Application permission avec consentement administrateur

L'action est contrôlée par `channels.msteams.actions.memberInfo` (par défaut : activé lorsque les identifiants Graph sont disponibles).

## Contexte de l'historique

- `channels.msteams.historyLimit` contrôle le nombre de messages récents de canal/groupe inclus dans l'invite.
- Revient à `messages.groupChat.historyLimit`. Définissez `0` pour désactiver (par défaut 50).
- L'historique des fils de discussion récupéré est filtré par les listes autorisées d'expéditeurs (`allowFrom` / `groupAllowFrom`), de sorte que l'amorçage du contexte du fil inclut uniquement les messages des expéditeurs autorisés.
- Le contexte des pièces jointes citées (`ReplyTo*` dérivé du HTML de réponse Teams) est actuellement transmis tel quel.
- En d'autres termes, les listes d'autorisation contrôlent qui peut déclencher l'agent ; seuls certains chemins de contexte supplémentaires sont filtrés aujourd'hui.
- L'historique des DM peut être limité avec `channels.msteams.dmHistoryLimit` (tours utilisateur). Remplacements par utilisateur : `channels.msteams.dms["<user_id>"].historyLimit`.

## Autorisations RSC Teams actuelles (manifeste)

Ce sont les **autorisations resourceSpecific existantes** dans le manifeste de notre application Teams. Elles ne s'appliquent qu'à l'intérieur de l'équipe/discussion où l'application est installée.

**Pour les canaux (étendue équipe) :**

- `ChannelMessage.Read.Group` (Application) - recevoir tous les messages de canal sans @mention
- `ChannelMessage.Send.Group` (Application)
- `Member.Read.Group` (Application)
- `Owner.Read.Group` (Application)
- `ChannelSettings.Read.Group` (Application)
- `TeamMember.Read.Group` (Application)
- `TeamSettings.Read.Group` (Application)

**Pour les discussions de groupe :**

- `ChatMessage.Read.Chat` (Application) - recevoir tous les messages de chat de groupe sans @mention

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

- `bots[].botId` **doit** correspondre à l'ID de l'application Azure Bot.
- `webApplicationInfo.id` **doit** correspondre à l'ID de l'application Azure Bot.
- `bots[].scopes` doit inclure les surfaces que vous prévoyez d'utiliser (`personal`, `team`, `groupChat`).
- `bots[].supportsFiles: true` est requis pour la gestion des fichiers dans l'étendue personnelle.
- `authorization.permissions.resourceSpecific` doit inclure la lecture/l'envoi dans le channel si vous voulez le trafic de channel.

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
3. **Recompressez** le manifeste avec les icônes (`manifest.json`, `outline.png`, `color.png`)
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

**En résumé :** RSC est pour l'écoute en temps réel ; Graph API est pour l'accès historique. Pour rattraper les messages manqués hors ligne, vous avez besoin de Graph API avec `ChannelMessage.Read.All` (nécessite le consentement de l'administrateur).

## Média et historique activés par Graph (requis pour les channels)

Si vous avez besoin d'images/fichiers dans les **channels** ou souhaitez récupérer l'**historique des messages**, vous devez activer les autorisations Microsoft Graph et accorder le consentement de l'administrateur.

1. Dans Entra ID (Azure AD) **Inscription d'application**, ajoutez les **autorisations d'application** Microsoft Graph :
   - `ChannelMessage.Read.All` (pièces jointes de channel + historique)
   - `Chat.Read.All` ou `ChatMessage.Read.All` (discussions de groupe)
2. **Accorder le consentement administrateur** pour le client.
3. Augmentez la **version du manifeste** de l’application Teams, téléchargez-la à nouveau et **réinstallez l’application dans Teams**.
4. **Quittez entièrement et relancez Teams** pour effacer les métadonnées de l’application en cache.

**Autorisation supplémentaire pour les mentions d’utilisateur :** Les @mentions d’utilisateur fonctionnent immédiatement pour les utilisateurs de la conversation. Cependant, si vous souhaitez rechercher dynamiquement et mentionner des utilisateurs qui **ne sont pas dans la conversation actuelle**, ajoutez l’autorisation `User.Read.All` (Application) et accordez le consentement administrateur.

## Limitations connues

### Délais d’expiration des webhooks

Teams livre les messages via un webhook HTTP. Si le traitement prend trop de temps (par exemple, des réponses LLM lentes), vous pouvez voir :

- Délais d’expiration de la Gateway
- Teams qui réessaie d’envoyer le message (provoquant des doublons)
- Réponses ignorées

OpenClaw gère cela en répondant rapidement et en envoyant des réponses de manière proactive, mais des réponses très lentes peuvent toujours causer des problèmes.

### Formatage

Le markdown Teams est plus limité que Slack ou Discord :

- Le formatage de base fonctionne : **gras**, _italique_, `code`, liens
- Le markdown complexe (tableaux, listes imbriquées) peut ne pas s'afficher correctement
- Les cartes adaptatives (Adaptive Cards) sont prises en charge pour les sondages et les envois de présentation sémantique (voir ci-dessous)

## Configuration

Paramètres clés (voir `/gateway/configuration` pour les modèles de canal partagés) :

- `channels.msteams.enabled` : activer/désactiver le channel.
- `channels.msteams.appId`, `channels.msteams.appPassword`, `channels.msteams.tenantId` : identifiants du bot.
- `channels.msteams.webhook.port` (par défaut `3978`)
- `channels.msteams.webhook.path` (par défaut `/api/messages`)
- `channels.msteams.dmPolicy` : `pairing | allowlist | open | disabled` (par défaut : appairage)
- `channels.msteams.allowFrom` : liste d'autorisation de DM (IDs d'objets AAD recommandés). L'assistant résout les noms en IDs lors de la configuration lorsque l'accès Graph est disponible.
- `channels.msteams.dangerouslyAllowNameMatching` : interrupteur de secours pour réactiver la correspondance mutable UPN/nom d'affichage et le routage direct par nom d'équipe/channel.
- `channels.msteams.textChunkLimit` : taille du bloc de texte sortant.
- `channels.msteams.chunkMode` : `length` (par défaut) ou `newline` pour diviser sur les lignes vides (limites de paragraphe) avant le découpage par longueur.
- `channels.msteams.mediaAllowHosts` : liste d'autorisation pour les hôtes de pièces jointes entrantes (par défaut les domaines Microsoft/Teams).
- `channels.msteams.mediaAuthAllowHosts` : liste d'autorisation pour joindre les en-têtes d'autorisation lors des nouvelles tentatives de média (par défaut : hôtes Graph + Bot Framework).
- `channels.msteams.requireMention` : exiger une @mention dans les canaux/groupes (vrai par défaut).
- `channels.msteams.replyStyle` : `thread | top-level` (voir [Reply Style](#reply-style-threads-vs-posts)).
- `channels.msteams.teams.<teamId>.replyStyle` : substitution par équipe.
- `channels.msteams.teams.<teamId>.requireMention` : substitution par équipe.
- `channels.msteams.teams.<teamId>.tools` : substitutions de stratégie de tool par équipe par défaut (`allow`/`deny`/`alsoAllow`) utilisées lorsqu'une substitution de canal est manquante.
- `channels.msteams.teams.<teamId>.toolsBySender` : substitutions de stratégie de tool par équipe par expéditeur par défaut (caractère générique `"*"` pris en charge).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle` : remplacement par channel.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention` : remplacement par channel.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools` : remplacements de la stratégie de tool par channel (`allow`/`deny`/`alsoAllow`).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender` : remplacements de la stratégie de tool par channel et par expéditeur (le caractère générique `"*"` est pris en charge).
- Les clés `toolsBySender` doivent utiliser des préfixes explicites :
  `channel:`, `id:`, `e164:`, `username:`, `name:` (les clés héritées sans préfixe mappent toujours uniquement vers `id:`).
- `channels.msteams.actions.memberInfo` : activer ou désactiver l'action d'informations sur les membres basée sur Graph (par défaut : activé lorsque les identifiants Graph sont disponibles).
- `channels.msteams.authType` : type d'authentification - `"secret"` (par défaut) ou `"federated"`.
- `channels.msteams.certificatePath` : chemin vers le fichier de certificat PEM (authentification fédérée + certificat).
- `channels.msteams.certificateThumbprint` : empreinte du certificat (facultatif, non requis pour l'authentification).
- `channels.msteams.useManagedIdentity` : activer l'authentification par identité gérée (mode fédéré).
- `channels.msteams.managedIdentityClientId` : ID client pour l'identité gérée affectée par l'utilisateur.
- `channels.msteams.sharePointSiteId` : ID du site SharePoint pour l'envoi de fichiers dans les conversations de groupe/canaux (voir [Envoi de fichiers dans les conversations de groupe](#sending-files-in-group-chats)).

## Routage et sessions

- Les clés de session suivent le format standard de l'agent (voir [/concepts/session](/fr/concepts/session)) :
  - Les messages directs partagent la session principale (`agent:<agentId>:<mainKey>`).
  - Channel/group messages use conversation id:
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## Reply style: threads vs posts

Teams recently introduced two channel UI styles over the same underlying data model:

| Style                    | Description                                               | Recommandé `replyStyle` |
| ------------------------ | --------------------------------------------------------- | ----------------------- |
| **Posts** (classic)      | Messages appear as cards with threaded replies underneath | `thread` (par défaut)   |
| **Threads** (Slack-like) | Messages flow linearly, more like Slack                   | `top-level`             |

**Le problème :** L'API Teams n'expose pas le style d'interface utilisateur utilisé par un channel. Si vous utilisez le mauvais `replyStyle` :

- `thread` dans un channel de style Threads → les réponses apparaissent de manière maladroite et imbriquées
- `top-level` dans un channel de style Posts → les réponses apparaissent comme des publications de niveau supérieur distinctes au lieu d'être dans le fil de discussion

**Solution :** Configurez `replyStyle` par channel en fonction de la configuration du channel :

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

Lorsque le bot envoie une réponse dans un channel, `replyStyle` est résolu à partir de la substitution la plus spécifique jusqu'à la valeur par défaut. La première valeur non `undefined` l'emporte :

1. **Par channel** — `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`
2. **Par équipe** — `channels.msteams.teams.<teamId>.replyStyle`
3. **Global** — `channels.msteams.replyStyle`
4. **Par défaut implicite** — dérivé de `requireMention` :
   - `requireMention: true` → `thread`
   - `requireMention: false` → `top-level`

Si vous définissez `requireMention: false` globalement sans `replyStyle` explicite, les mentions dans les channels de style Posts apparaîtront comme des publications de niveau supérieur même lorsque le message entrant était une réponse dans un fil. Épinglez `replyStyle: "thread"` au niveau global, de l'équipe ou du channel pour éviter les surprises.

### Préservation du contexte du fil

Lorsque `replyStyle: "thread"`OpenClaw est en vigueur et que le bot a été mentionné depuis un fil de discussion de channel, OpenClaw rattache la racine du fil d'origine à la référence de conversation sortante (`19:…@thread.tacv2;messageid=<root>`) afin que la réponse soit publiée dans le même fil. Cela s'applique aux envois en direct (dans le tour) et aux envois proactifs effectués après l'expiration du contexte de tour du Bot Framework (par exemple, agents de longue durée, réponses d'appels d'outil mises en file d'attente via `mcp__openclaw__message`).

La racine du fil est tirée du `threadId` stocké sur la référence de conversation. Les références stockées plus anciennes qui datent d'avant `threadId` reviennent à `activityId` (toute activité entrante ayant dernier amorcé la conversation), de sorte que les déploiements existants continuent de fonctionner sans réamorçage.

Lorsque `replyStyle: "top-level"` est en vigueur, les entrées de fil de channel sont intentionnellement répondues par de nouveaux messages de premier niveau — aucun suffixe de fil n'est attaché. Il s'agit du comportement correct pour les channels de style Threads ; si vous voyez des messages de premier niveau là où vous attendiez des réponses en fil, votre `replyStyle` est défini incorrectement pour ce channel.

## Pièces jointes et images

**Limitations actuelles :**

- **DMs :** Les images et les pièces jointes fonctionnent via les API de fichiers de bot Teams.
- **Canaux/groupes :** Les pièces jointes résident dans le stockage M365 (SharePoint/OneDrive). La charge utile du webhook n'inclut qu'un texte HTML, et non les octets réels du fichier. **Les autorisations de l'API Graph sont requises** pour télécharger les pièces jointes des canaux.
- Pour les envois explicites de type fichier en premier, utilisez `action=upload-file` avec `media` / `filePath` / `path` ; le `message` facultatif devient le texte/commentaire d'accompagnement, et `filename` remplace le nom téléchargé.

Sans les autorisations Graph, les messages de channel contenant des images seront reçus sous forme de texte uniquement (le contenu de l'image n'est pas accessible au bot).
Par défaut, OpenClaw ne télécharge les médias qu'à partir des noms d'hôte Microsoft/Teams. Remplacez par OpenClaw`channels.msteams.mediaAllowHosts` (utilisez `["*"]` pour autoriser n'importe quel hôte).
Les en-têtes d'autorisation ne sont attachés que pour les hôtes de `channels.msteams.mediaAuthAllowHosts` (par défaut hôtes Graph + Bot Framework). Gardez cette liste stricte (évitez les suffixes multi-locataires).

## Envoyer des fichiers dans les conversations de groupe

Les bots peuvent envoyer des fichiers dans les DMs en utilisant le flux FileConsentCard (intégré). Cependant, **l'envoi de fichiers dans les conversations de groupe/canaux** nécessite une configuration supplémentaire :

| Contexte                           | Comment les fichiers sont envoyés                           | Configuration nécessaire                           |
| ---------------------------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| **DMs**                            | FileConsentCard → l'utilisateur accepte → le bot télécharge | Fonctionne hors de la boîte                        |
| **Conversations de groupe/canaux** | Télécharger vers SharePoint → partager le lien              | Nécessite `sharePointSiteId` + autorisations Graph |
| **Images (tout contexte)**         | Codé en base64 en ligne                                     | Fonctionne immédiatement                           |

### Pourquoi les discussions de groupe ont besoin de SharePoint

Les bots n'ont pas de lecteur OneDrive personnel (le point de terminaison de l'API `/me/drive`API Graph ne fonctionne pas pour les identités d'application). Pour envoyer des fichiers dans des conversations de groupe/canaux, le bot télécharge sur un **site SharePoint** et crée un lien de partage.

### Configuration

1. **Ajoutez des autorisations API Graph** dans Entra ID (Azure AD) → Inscription de l'application :
   - `Sites.ReadWrite.All` (Application) - télécharger les fichiers sur SharePoint
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

| Scénario                                                        | Résultat                                                                           |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Conversation de groupe + fichier + `sharePointSiteId` configuré | Télécharger vers SharePoint, envoyer le lien de partage                            |
| Conversation de groupe + fichier + aucun `sharePointSiteId`     | Tenter le téléchargement vers OneDrive (peut échouer), envoyer uniquement le texte |
| Conversation personnelle + fichier                              | Flux FileConsentCard (fonctionne sans SharePoint)                                  |
| N'importe quel contexte + image                                 | Codé en base64 en ligne (fonctionne sans SharePoint)                               |

### Emplacement de stockage des fichiers

Les fichiers téléchargés sont stockés dans un dossier `/OpenClawShared/` de la bibliothèque de documents par défaut du site SharePoint configuré.

## Sondages (Cartes adaptatives)

OpenClaw envoie les sondages Teams sous forme de Cartes adaptatives (il n'y a pas d'API de sondage Teams native).

- CLI : CLI`openclaw message poll --channel msteams --target conversation:<id> ...`
- Les votes sont enregistrés par la passerelle dans `~/.openclaw/msteams-polls.json`.
- La passerelle doit rester en ligne pour enregistrer les votes.
- Les sondages ne publient pas encore automatiquement de résumés des résultats (inspectez le fichier de stockage si nécessaire).

## Cartes de présentation

Envoyez des charges utiles de présentation sémantique aux utilisateurs ou conversations Teams à l'aide de l'outil `message`CLIOpenClaw ou de la CLI. OpenClaw les restitue sous forme de cartes adaptatives Teams à partir du contrat de présentation générique.

Le paramètre `presentation` accepte des blocs sémantiques. Lorsque `presentation` est fourni, le texte du message est facultatif.

**Outil de l'agent :**

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

Pour plus de détails sur les formats cibles, voir [Formats cibles](#target-formats) ci-dessous.

## Formats cibles

Les cibles MSTeams utilisent des préfixes pour distinguer les utilisateurs et les conversations :

| Type de cible         | Format                           | Exemple                                             |
| --------------------- | -------------------------------- | --------------------------------------------------- |
| Utilisateur (par ID)  | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`         |
| Utilisateur (par nom) | `user:<display-name>`            | `user:John Smith`API (nécessite l'API Graph)        |
| Groupe/channel        | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`            |
| Groupe/channel (brut) | `<conversation-id>`              | `19:abc123...@thread.tacv2` (si contient `@thread`) |

**Exemples de CLI :**

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

<Note>Sans le préfixe `user:`, les noms correspondent par défaut à une résolution de groupe ou d'équipe. Utilisez toujours `user:` lorsque vous ciblez des personnes par nom d'affichage.</Note>

## Messagerie proactive

- Les messages proactifs ne sont possibles qu'**après** qu'un utilisateur a interagi, car nous stockons les références de conversation à ce moment-là.
- Voir `/gateway/configuration` pour `dmPolicy` et le filtrage par liste blanche.

## ID d'équipe et de canal (Piège courant)

Le paramètre de requête `groupId` dans les URL Teams n'**EST PAS** l'ID de l'équipe utilisé pour la configuration. Extrayez plutôt les ID du chemin de l'URL :

**URL de l'équipe :**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team conversation ID (URL-decode this)
```

**URL du canal :**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID (URL-decode this)
```

**Pour la configuration :**

- Clé d'équipe = segment de chemin après `/team/` (URL décodé, par ex., `19:Bk4j...@thread.tacv2` ; les anciens locataires peuvent afficher `@thread.skype`, qui est également valide)
- Clé de channel = segment de chemin après `/channel/` (URL décodé)
- **Ignorer** le paramètre de requête `groupId` pour le routage OpenClaw. Il s'agit de l'ID de groupe Microsoft Entra, et non de l'ID de conversation du Bot Framework utilisé dans les activités Teams entrantes.

## Canaux privés

Les bots ont une prise en charge limitée dans les canaux privés :

| Fonctionnalité                   | Canaux standard | Canaux privés                  |
| -------------------------------- | --------------- | ------------------------------ |
| Installation du bot              | Oui             | Limitée                        |
| Messages en temps réel (webhook) | Oui             | Peut ne pas fonctionner        |
| Autorisations RSC                | Oui             | Peut se comporter différemment |
| @mentions                        | Oui             | Si le bot est accessible       |
| Historique du Graph API          | Oui             | Oui (avec autorisations)       |

**Solutions de contournement si les canaux privés ne fonctionnent pas :**

1. Utilisez les canaux standard pour les interactions avec le bot
2. Utilisez les DMs - les utilisateurs peuvent toujours envoyer un message directement au bot
3. Utiliser le Graph API pour l'accès historique (nécessite `ChannelMessage.Read.All`)

## Résolution des problèmes

### Problèmes courants

- **Images ne s'affichant pas dans les canaux :** Permissions Graph ou consentement administratif manquant. Réinstallez l'application Teams et quittez/rouvrez entièrement Teams.
- **Pas de réponse dans le channel :** les mentions sont requises par défaut ; définissez `channels.msteams.requireMention=false` ou configurez par équipe/channel.
- **Inadéquation de version (Teams affiche toujours l'ancien manifeste) :** supprimez et rajoutez l'application et quittez entièrement Teams pour actualiser.
- **401 Non autorisé depuis le webhook :** Attendu lors de tests manuels sans JWT Azure - signifie que le point de terminaison est accessible mais que l'authentification a échoué. Utilisez Azure Web Chat pour tester correctement.

### Erreurs de téléchargement de manifeste

- **"Icon file cannot be empty" :** Le manifeste fait référence à des fichiers d'icônes de 0 octet. Créez des icônes PNG valides (32x32 pour `outline.png`, 192x192 pour `color.png`).
- **« webApplicationInfo.Id déjà utilisé »** : L'application est toujours installée dans une autre équipe/conversation. Trouvez-la et désinstallez-la d'abord, ou attendez 5 à 10 minutes pour la propagation.
- **"Something went wrong" lors du téléchargement :** Téléchargez plutôt via [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com), ouvrez les outils de développement du navigateur (F12) → onglet Réseau, et vérifiez le corps de la réponse pour l'erreur réelle.
- **Échec du chargement latéral** : Essayez « Charger une application dans le catalogue d'applications de votre organisation » au lieu de « Charger une application personnalisée » ; cela contourne souvent les restrictions de chargement latéral.

### Autorisations RSC non fonctionnelles

1. Vérifiez que `webApplicationInfo.id` correspond exactement à l'ID d'application de votre bot
2. Téléchargez à nouveau l'application et réinstallez-la dans l'équipe/la conversation
3. Vérifiez si l'administrateur de votre organisation a bloqué les autorisations RSC
4. Confirmez que vous utilisez la bonne portée : `ChannelMessage.Read.Group` pour les équipes, `ChatMessage.Read.Chat` pour les conversations de groupe

## Références

- [Create Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Guide de configuration du bot Azure
- [Teams Developer Portal](https://dev.teams.microsoft.com/apps) - créer/gérer les applications Teams
- [Teams app manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Receive channel messages with RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC permissions reference](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams bot file handling](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (channel/groupe nécessite Graph)
- [Proactive messaging](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
- [@microsoft/teams.cli](https://www.npmjs.com/package/@microsoft/teams.cli) - Teams CLI pour la gestion des bots

## Connexes

- [Vue d'ensemble des canaux](/fr/channels) - tous les canaux pris en charge
- [Appairage](/fr/channels/pairing) - authentification DM et flux d'appairage
- [Groupes](/fr/channels/groups) - comportement de la conversation de groupe et filtrage des mentions
- [Routage de canal](/fr/channels/channel-routing) - routage de session pour les messages
- [Sécurité](/fr/gateway/security) - modèle d'accès et durcissement
