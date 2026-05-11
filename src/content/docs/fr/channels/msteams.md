---
summary: "État du support, capacités et configuration du bot Microsoft Teams"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft Teams"
---

Statut : le texte + les pièces jointes DM sont pris en charge ; l'envoi de fichiers dans les canaux/groupes nécessite `sharePointSiteId` + les autorisations Graph (voir [Envoi de fichiers dans les conversations de groupe](#sending-files-in-group-chats)). Les sondages sont envoyés via Adaptive Cards. Les actions de message exposent explicitement `upload-file` pour les envois priorisant les fichiers.

## Plugin inclus

Microsoft Teams est fourni en tant que plugin inclus dans les versions actuelles d'OpenClaw, donc aucune installation séparée n'est requise dans la version empaquetée normale.

Si vous utilisez une version ancienne ou une installation personnalisée qui exclut le plugin Teams inclus,
installez-le manuellement :

```bash
openclaw plugins install @openclaw/msteams
```

Extraction locale (lors de l'exécution depuis un dépôt git) :

```bash
openclaw plugins install ./path/to/local/msteams-plugin
```

Détails : [Plugins](/fr/tools/plugin)

## Configuration rapide

La [`@microsoft/teams.cli`](https://www.npmjs.com/package/@microsoft/teams.cli) gère l'inscription du bot, la création du manifeste et la génération des informations d'identification en une seule commande.

**1. Installer et se connecter**

```bash
npm install -g @microsoft/teams.cli@preview
teams login
teams status   # verify you're logged in and see your tenant info
```

<Note>La CLI Teams est actuellement en préversion. Les commandes et les indicateurs peuvent changer entre les versions.</Note>

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
- Construit et télécharge un manifeste d'application Teams (avec des icônes)
- Inscrit le bot (géré par Teams par défaut — aucun abonnement Azure nécessaire)

La sortie affichera `CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`, et un **ID d'application Teams** — notez-les pour les étapes suivantes. Elle propose également d'installer l'application directement dans Teams.

**4. Configurez OpenClaw** en utilisant les informations d'identification issues de la sortie :

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

**5. Installer l'application dans Teams**

`teams app create` vous invitera à installer l'application — sélectionnez « Installer dans Teams ». Si vous avez ignoré cette étape, vous pouvez obtenir le lien plus tard :

```bash
teams app get <teamsAppId> --install-link
```

**6. Vérifier que tout fonctionne**

```bash
teams app doctor <teamsAppId>
```

Cela exécute des diagnostics sur l'enregistrement du bot, la configuration de l'application AAD, la validité du manifeste et la configuration SSO.

Pour les déploiements en production, envisagez d'utiliser l'[authentification fédérée](/fr/channels/msteams#federated-authentication-certificate-plus-managed-identity) (certificat ou identité managée) au lieu des secrets client.

<Note>Les conversations de groupe sont bloquées par défaut (`channels.msteams.groupPolicy: "allowlist"`). Pour autoriser les réponses de groupe, définissez `channels.msteams.groupAllowFrom`, ou utilisez `groupPolicy: "open"` pour autoriser n'importe quel membre (limité par les mentions).</Note>

## Objectifs

- Parler à OpenClaw via les DMs Teams, les conversations de groupe ou les canaux.
- Garder le routage déterministe : les réponses retournent toujours au canal d'où elles proviennent.
- Par défaut, comportement de canal sûr (mentions requises sauf configuration contraire).

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
- `channels.msteams.allowFrom` doit utiliser des ID d'objets AAD stables.
- Ne vous fiez pas à la correspondance des noms UPN/display-name pour les listes d'autorisation — ils peuvent changer. OpenClaw désactive la correspondance directe des noms par défaut ; activez-la explicitement avec `channels.msteams.dangerouslyAllowNameMatching: true`.
- L'assistant peut résoudre les noms en ID via Microsoft Graph lorsque les informations d'identification le permettent.

**Accès groupe**

- Par défaut : `channels.msteams.groupPolicy = "allowlist"` (bloqué sauf si vous ajoutez `groupAllowFrom`). Utilisez `channels.defaults.groupPolicy` pour remplacer la valeur par défaut lorsqu'elle n'est pas définie.
- `channels.msteams.groupAllowFrom` contrôle les expéditeurs qui peuvent déclencher dans les conversations de groupe/canaux (revient à `channels.msteams.allowFrom`).
- Définissez `groupPolicy: "open"` pour autoriser n'importe quel membre (toujours limité par les mentions par défaut).
- Pour interdire **tous les canaux**, définissez `channels.msteams.groupPolicy: "disabled"`.

Exemple :

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["user@org.com"],
    },
  },
}
```

**Teams + liste d'autorisation de canal**

- Délimitez les réponses de groupe/canal en listant les équipes et les canaux sous `channels.msteams.teams`.
- Les clés doivent utiliser des ID d'équipe stables et des ID de conversation de canal.
- Lorsque `groupPolicy="allowlist"` et une liste d'autorisation d'équipes sont présents, seules les équipes/canaux listés sont acceptés (filtrés par mention).
- L'assistant de configuration accepte les entrées `Team/Channel` et les stocke pour vous.
- Au démarrage, OpenClaw résout les noms des listes d'autorisation d'équipe/canal et d'utilisateur en ID (lorsque les autorisations Graph le permettent)
  et enregistre le mappage ; les noms d'équipe/canal non résolus sont conservés tels quels mais ignorés pour le routage par défaut, sauf si `channels.msteams.dangerouslyAllowNameMatching: true` est activé.

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
4. Téléchargez ou installez l'application Teams dans une équipe (ou l'étendue personnelle pour les MDs).
5. Configurez `msteams` dans `~/.openclaw/openclaw.json` (ou les variables d'environnement) et démarrez la passerelle.
6. Par défaut, la passerelle écoute le trafic webhook du Bot Framework sur `/api/messages`.

### Étape 1 : Créer un Azure Bot

1. Accédez à [Créer un Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. Remplissez l'onglet **Basics** :

   | Champ                    | Valeur                                                              |
   | ------------------------ | ------------------------------------------------------------------- |
   | **Bot handle**           | Le nom de votre bot, par ex., `openclaw-msteams` (doit être unique) |
   | **Abonnement**           | Sélectionnez votre abonnement Azure                                 |
   | **Groupe de ressources** | Créer un nouveau ou utiliser un existant                            |
   | **Niveau tarifaire**     | **Gratuit** pour le développement/les tests                         |
   | **Type d'application**   | **Single Tenant** (recommandé - voir la note ci-dessous)            |
   | **Type de création**     | **Créer un nouvel ID d'application Microsoft**                      |

<Warning>La création de nouveaux bots multi-locataires a été dépréciée après le 31/07/2025. Utilisez **Single Tenant** pour les nouveaux bots.</Warning>

3. Cliquez sur **Vérifier + créer** → **Créer** (attendre environ 1 à 2 minutes)

### Étape 2 : Obtenir les identifiants

1. Accédez à votre ressource Azure Bot → **Configuration**
2. Copiez l'**ID d'application Microsoft** → c'est votre `appId`
3. Cliquez sur **Gérer le mot de passe** → accédez à l'inscription de l'application
4. Sous **Certificats et secrets** → **Nouveau secret client** → copiez la **Valeur** → il s'agit de votre `appPassword`
5. Allez dans **Vue d'ensemble** → copiez l'**ID de répertoire (locataire)** → il s'agit de votre `tenantId`

### Étape 3 : Configurer le point de terminaison de messagerie

1. Dans le Bot Azure → **Configuration**
2. Définissez le **Point de terminaison de messagerie** sur l'URL de votre webhook :
   - Production : `https://your-domain.com/api/messages`
   - Dév local : Utilisez un tunnel (voir [Développement local](#local-development-tunneling) ci-dessous)

### Étape 4 : Activer le canal Teams

1. Dans le Bot Azure → **Canaux**
2. Cliquez sur **Microsoft Teams** → Configurer → Enregistrer
3. Acceptez les conditions d'utilisation

### Étape 5 : Créer le manifeste de l'application Teams

- Incluez une entrée `bot` avec `botId = <App ID>`.
- Étendues : `personal`, `team`, `groupChat`.
- `supportsFiles: true` (requis pour la gestion des fichiers dans l'étendue personnelle).
- Ajoutez les autorisations RSC (voir [Autorisations RSC](#current-teams-rsc-permissions-manifest)).
- Créez des icônes : `outline.png` (32x32) et `color.png` (192x192).
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

### Étape 7 : Exécuter Gateway

Le canal Teams démarre automatiquement lorsque le plugin est disponible et qu'une configuration `msteams` existe avec des identifiants.

</details>

## Authentification fédérée (certificat plus identité gérée)

> Ajouté dans la version 2026.3.24

Pour les déploiements en production, OpenClaw prend en charge l'**authentification fédérée** comme alternative plus sécurisée aux secrets clients. Deux méthodes sont disponibles :

### Option A : Authentification basée sur un certificat

Utilisez un certificat PEM enregistré avec votre inscription d'application Entra ID.

**Configuration :**

1. Générez ou obtenez un certificat (format PEM avec clé privée).
2. Dans Entra ID → Inscription d'application → **Certificats et secrets** → **Certificats** → Téléchargez le certificat public.

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

**Variables d'env :**

- `MSTEAMS_AUTH_TYPE=federated`
- `MSTEAMS_CERTIFICATE_PATH=/path/to/cert.pem`

### Option B : Identité gérée Azure

Utilisez Azure Managed Identity pour une authentification sans mot de passe. C'est idéal pour les déploiements sur l'infrastructure Azure (AKS, App Service, machines virtuelles Azure) où une identité gérée est disponible.

**Fonctionnement :**

1. Le pod/VM du bot possède une identité gérée (attribuée par le système ou par l'utilisateur).
2. Une **information d'identification d'identité fédérée** relie l'identité gérée à l'inscription de l'application Entra ID.
3. Au moment de l'exécution, OpenClaw utilise `@azure/identity` pour acquérir des jetons à partir du point de terminaison IMDS Azure (`169.254.169.254`).
4. Le jeton est transmis au SDK Teams pour l'authentification du bot.

**Prérequis :**

- Infrastructure Azure avec identité gérée activée (identité de charge de travail AKS, App Service, machine virtuelle)
- Informations d'identification d'identité fédérée créées sur l'inscription de l'application Entra ID
- Accès réseau à l'IMDS (`169.254.169.254:80`) à partir du pod/VM

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
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID=<client-id>` (uniquement pour les identités attribuées par l'utilisateur)

### Configuration de l'identité de charge de travail AKS

Pour les déploiements AKS utilisant l'identité de charge de travail :

1. **Activez l'identité de charge de travail** sur votre cluster AKS.
2. **Créez une information d'identification d'identité fédérée** sur l'inscription de l'application Entra ID :

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

5. **Assurez l'accès réseau** à l'IMDS (`169.254.169.254`) — si vous utilisez NetworkPolicy, ajoutez une règle de sortie autorisant le trafic vers `169.254.169.254/32` sur le port 80.

### Comparaison des types d'authentification

| Méthode            | Configuration                                  | Avantages                               | Inconvénients                              |
| ------------------ | ---------------------------------------------- | --------------------------------------- | ------------------------------------------ |
| **Secret client**  | `appPassword`                                  | Configuration simple                    | Rotation du secret requise, moins sécurisé |
| **Certificat**     | `authType: "federated"` + `certificatePath`    | Aucun secret partagé sur le réseau      | Surcharge de gestion des certificats       |
| **Identité gérée** | `authType: "federated"` + `useManagedIdentity` | Sans mot de passe, aucun secret à gérer | Infrastructure Azure requise               |

**Comportement par défaut :** Lorsque `authType` n'est pas défini, OpenClaw utilise par défaut l'authentification par secret client. Les configurations existantes continuent de fonctionner sans modification.

## Développement local (tunneling)

Teams ne peut pas atteindre `localhost`. Utilisez un tunnel de développement persistant pour que votre URL reste la même d'une session à l'autre :

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

Vérifiez l'enregistrement du bot, l'application AAD, le manifeste et la configuration SSO en une seule passe.

**Envoyer un message de test :**

1. Installez l'application Teams (utilisez le lien d'installation provenant de `teams app get <id> --install-link`)
2. Trouvez le bot dans Teams et envoyez-lui un DM
3. Vérifiez les journaux de la passerelle pour l'activité entrante

## Variables d'environnement

Toutes les clés de configuration peuvent être définies via des variables d'environnement à la place :

- `MSTEAMS_APP_ID`
- `MSTEAMS_APP_PASSWORD`
- `MSTEAMS_TENANT_ID`
- `MSTEAMS_AUTH_TYPE` (facultatif : `"secret"` ou `"federated"`)
- `MSTEAMS_CERTIFICATE_PATH` (fédéré + certificat)
- `MSTEAMS_CERTIFICATE_THUMBPRINT` (facultatif, non requis pour l'authentification)
- `MSTEAMS_USE_MANAGED_IDENTITY` (fédéré + identité gérée)
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID` (identité gérée attribuée par l'utilisateur uniquement)

## Action de membre

OpenClaw expose une action `member-info` basée sur Graph pour Microsoft Teams afin que les agents et automatisations puissent résoudre les détails des membres du channel (nom d'affichage, e-mail, rôle) directement à partir de Microsoft Graph.

Conditions requises :

- Autorisation RSC `Member.Read.Group` (déjà présente dans le manifeste recommandé)
- Pour les recherches inter-équipes : autorisation d'application Graph `User.Read.All` avec consentement de l'administrateur

L'action est conditionnée par `channels.msteams.actions.memberInfo` (par défaut : activée lorsque les informations d'identification Graph sont disponibles).

## Contexte de l'historique

- `channels.msteams.historyLimit` contrôle le nombre de messages récents du channel/groupe inclus dans l'invite.
- Revient à `messages.groupChat.historyLimit`. Définissez `0` pour désactiver (par défaut 50).
- L'historique des fils récupéré est filtré par les listes autorisées d'expéditeurs (`allowFrom` / `groupAllowFrom`), de sorte que l'amorçage du contexte du fil inclut uniquement les messages des expéditeurs autorisés.
- Le contexte des pièces jointes citées (`ReplyTo*` dérivé du HTML de réponse Teams) est actuellement transmis tel quel.
- En d'autres termes, les listes autorisées contrôlent qui peut déclencher l'agent ; seuls certains chemins de contexte supplémentaires sont filtrés aujourd'hui.
- L'historique des DM peut être limité avec `channels.msteams.dmHistoryLimit` (tours de l'utilisateur). Remplacements par utilisateur : `channels.msteams.dms["<user_id>"].historyLimit`.

## Autorisations RSC Teams actuelles (manifeste)

Ce sont les **autorisations resourceSpecific existantes** dans le manifeste de notre application Teams. Elles ne s'appliquent qu'à l'intérieur de l'équipe/conversation où l'application est installée.

**Pour les canaux (portée d'équipe) :**

- `ChannelMessage.Read.Group` (Application) - recevoir tous les messages de canal sans @mention
- `ChannelMessage.Send.Group` (Application)
- `Member.Read.Group` (Application)
- `Owner.Read.Group` (Application)
- `ChannelSettings.Read.Group` (Application)
- `TeamMember.Read.Group` (Application)
- `TeamSettings.Read.Group` (Application)

**Pour les conversations de groupe :**

- `ChatMessage.Read.Chat` (Application) - recevoir tous les messages de conversation de groupe sans @mention

Pour ajouter des autorisations RSC via la Teams CLI :

```bash
teams app rsc add <teamsAppId> ChannelMessage.Read.Group --type Application
```

## Exemple de manifeste Teams (caviardé)

Exemple minimal et valide avec les champs requis. Remplacez les ID et URL.

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

- `bots[].botId` **doit** correspondre à l'ID d'application du bot Azure.
- `webApplicationInfo.id` **doit** correspondre à l'ID d'application du bot Azure.
- `bots[].scopes` doit inclure les surfaces que vous prévoyez d'utiliser (`personal`, `team`, `groupChat`).
- `bots[].supportsFiles: true` est requis pour la gestion des fichiers dans la portée personnelle.
- `authorization.permissions.resourceSpecific` doit inclure la lecture/l'envoi de canal si vous voulez le trafic de canal.

### Mise à jour d'une application existante

Pour mettre à jour une application Teams déjà installée (par exemple, pour ajouter des autorisations RSC) :

```bash
# Download, edit, and re-upload the manifest
teams app manifest download <teamsAppId> manifest.json
# Edit manifest.json locally...
teams app manifest upload manifest.json <teamsAppId>
# Version is auto-bumped if content changed
```

Après la mise à jour, réinstallez l'application dans chaque équipe pour que les nouvelles autorisations prennent effet, et **quittez entièrement et relancez Teams** (ne fermez pas simplement la fenêtre) pour effacer les métadonnées d'application en cache.

<details>
<summary>Mise à jour manuelle du manifeste (sans CLI)</summary>

1. Mettez à jour votre `manifest.json` avec les nouveaux paramètres
2. **Incrémentez le champ `version`** (par ex., `1.0.0` → `1.1.0`)
3. **Recompressez** le manifeste avec les icônes (`manifest.json`, `outline.png`, `color.png`)
4. Téléchargez le nouveau fichier zip :
   - **Centre d'administration Teams :** Applications Teams → Gérer les applications → trouver votre application → Télécharger une nouvelle version
   - **Chargement latéral :** Dans Teams → Applications → Gérer vos applications → Télécharger une application personnalisée

</details>

## Capacités : RSC uniquement vs Graph

### Avec **Teams RSC uniquement** (application installée, aucune autorisation de l'API Graph)

Fonctionne :

- Lire le contenu **textuel** des messages de channel.
- Envoyer le contenu **textuel** des messages de channel.
- Recevoir des pièces jointes de fichiers **personnels (DM)**.

Ne fonctionne PAS :

- Contenu **d'image ou de fichier** de channel/groupe (la charge utile n'inclut qu'un fragment HTML).
- Téléchargement des pièces jointes stockées dans SharePoint/OneDrive.
- Lecture de l'historique des messages (au-delà de l'événement webhook en direct).

### Avec **Teams RSC + Autorisations d'application Microsoft Graph**

Ajoute :

- Téléchargement du contenu hébergé (images collées dans les messages).
- Téléchargement des pièces jointes de fichiers stockées dans SharePoint/OneDrive.
- Lecture de l'historique des messages de channel/discussion via Graph.

### RSC vs API Graph

| Capacité                        | Autorisations RSC                    | API Graph                                                     |
| ------------------------------- | ------------------------------------ | ------------------------------------------------------------- |
| **Messages en temps réel**      | Oui (via webhook)                    | Non (sondage uniquement)                                      |
| **Messages historiques**        | Non                                  | Oui (peut interroger l'historique)                            |
| **Complexité de configuration** | Manifeste d'application uniquement   | Nécessite le consentement de l'administrateur + flux de jeton |
| **Fonctionne hors ligne**       | Non (doit être en cours d'exécution) | Oui (interrogation à tout moment)                             |

**En résumé :** RSC est destiné à l'écoute en temps réel ; l'API Graph est destiné à l'accès historique. Pour récupérer les messages manqués pendant que vous étiez hors ligne, vous avez besoin de l'API Graph avec `ChannelMessage.Read.All` (nécessite le consentement de l'administrateur).

## Média + historique activés par Graph (requis pour les channels)

Si vous avez besoin d'images/fichiers dans les **channels** ou si vous souhaitez récupérer l'**historique des messages**, vous devez activer les autorisations Microsoft Graph et accorder le consentement de l'administrateur.

1. Dans Entra ID (Azure AD) **Inscription d'application**, ajoutez des **autorisations d'application** Microsoft Graph :
   - `ChannelMessage.Read.All` (pièces jointes de channel + historique)
   - `Chat.Read.All` ou `ChatMessage.Read.All` (discussions de groupe)
2. **Accorder le consentement de l'administrateur** pour le locataire.
3. Augmentez la **version du manifeste** de l'application Teams, rechargez-la et **réinstallez l'application dans Teams**.
4. **Quittez et relancez entièrement Teams** pour effacer les métadonnées mises en cache de l'application.

**Autorisation supplémentaire pour les mentions d'utilisateurs :** Les mentions @ des utilisateurs fonctionnent immédiatement pour les utilisateurs de la conversation. Cependant, si vous souhaitez rechercher et mentionner dynamiquement des utilisateurs qui **ne sont pas dans la conversation actuelle**, ajoutez l'autorisation `User.Read.All` (Application) et accordez le consentement de l'administrateur.

## Limitations connues

### Délais d'expiration des webhooks

Teams envoie les messages via un webhook HTTP. Si le traitement prend trop de temps (par exemple, des réponses LLM lentes), vous pourriez voir :

- Délais d'expiration de la Gateway
- Teams réessayer d'envoyer le message (causant des doublons)
- Réponses ignorées

OpenClaw gère cela en répondant rapidement et en envoyant les réponses de manière proactive, mais les réponses très lentes peuvent encore causer des problèmes.

### Formatage

Le markdown Teams est plus limité que celui de Slack ou Discord :

- Le formatage de base fonctionne : **gras**, _italique_, `code`, liens
- Le markdown complexe (tableaux, listes imbriquées) peut ne pas s'afficher correctement
- Les cartes adaptatives (Adaptive Cards) sont prises en charge pour les sondages et les envois de présentation sémantique (voir ci-dessous)

## Configuration

Paramètres clés (voir `/gateway/configuration` pour les modèles de channel partagés) :

- `channels.msteams.enabled` : activer/désactiver le channel.
- `channels.msteams.appId`, `channels.msteams.appPassword`, `channels.msteams.tenantId` : identifiants du bot.
- `channels.msteams.webhook.port` (par défaut `3978`)
- `channels.msteams.webhook.path` (par défaut `/api/messages`)
- `channels.msteams.dmPolicy` : `pairing | allowlist | open | disabled` (par défaut : appariement)
- `channels.msteams.allowFrom` : liste d'autorisation de DM (IDs d'objets AAD recommandés). L'assistant résout les noms en IDs lors de la configuration lorsque l'accès Graph est disponible.
- `channels.msteams.dangerouslyAllowNameMatching` : commutateur de secours pour réactiver la correspondance mutable UPN/nom d'affichage et le routage direct par nom d'équipe/channel.
- `channels.msteams.textChunkLimit` : taille du bloc de texte sortant.
- `channels.msteams.chunkMode` : `length` (par défaut) ou `newline` pour diviser sur les lignes vides (limites de paragraphe) avant le découpage par longueur.
- `channels.msteams.mediaAllowHosts` : liste d'autorisation pour les hôtes de pièces jointes entrantes (par défaut les domaines Microsoft/Teams).
- `channels.msteams.mediaAuthAllowHosts` : liste d'autorisation pour l'ajout d'en-têtes d'autorisation lors des nouvelles tentatives de média (par défaut, les hôtes Graph + Bot Framework).
- `channels.msteams.requireMention` : exiger @mention dans les canaux/groupes (vrai par défaut).
- `channels.msteams.replyStyle` : `thread | top-level` (voir [Style de réponse](#reply-style-threads-vs-posts)).
- `channels.msteams.teams.<teamId>.replyStyle` : remplacement par équipe.
- `channels.msteams.teams.<teamId>.requireMention` : remplacement par équipe.
- `channels.msteams.teams.<teamId>.tools` : remplacements de la stratégie d'outil par équipe par défaut (`allow`/`deny`/`alsoAllow`) utilisés lorsqu'un remplacement de canal est manquant.
- `channels.msteams.teams.<teamId>.toolsBySender` : remplacements de la stratégie d'outil par équipe par expéditeur par défaut (le caractère générique `"*"` est pris en charge).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle` : remplacement par canal.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention` : remplacement par canal.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools` : remplacements de la stratégie d'outil par canal (`allow`/`deny`/`alsoAllow`).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender` : remplacements de la stratégie d'outil par canal par expéditeur (le caractère générique `"*"` est pris en charge).
- Les clés `toolsBySender` doivent utiliser des préfixes explicites :
  `id:`, `e164:`, `username:`, `name:` (les clés sans préfixe héritées mappent toujours uniquement vers `id:`).
- `channels.msteams.actions.memberInfo` : activer ou désactiver l'action d'informations sur les membres basée sur Graph (par défaut : activé lorsque les informations d'identification Graph sont disponibles).
- `channels.msteams.authType` : type d'authentification — `"secret"` (par défaut) ou `"federated"`.
- `channels.msteams.certificatePath` : chemin d'accès au fichier de certificat PEM (fédéré + authentification par certificat).
- `channels.msteams.certificateThumbprint` : empreinte numérique du certificat (facultatif, non requis pour l'authentification).
- `channels.msteams.useManagedIdentity` : activer l'authentification par identité gérée (mode fédéré).
- `channels.msteams.managedIdentityClientId` : ID client pour l'identité gérée attribuée par l'utilisateur.
- `channels.msteams.sharePointSiteId` : ID de site SharePoint pour les téléchargements de fichiers dans les conversations de groupe/canaux (voir [Envoi de fichiers dans les conversations de groupe](#sending-files-in-group-chats)).

## Routage et Sessions

- Les clés de session suivent le format standard de l'agent (voir [/concepts/session](/fr/concepts/session)) :
  - Les messages directs partagent la session principale (`agent:<agentId>:<mainKey>`).
  - Les messages de canal/groupe utilisent l'ID de conversation :
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## Style de réponse : fils vs messages

Teams a récemment introduit deux styles d'interface utilisateur de canal sur le même modèle de données sous-jacent :

| Style                    | Description                                                                        | `replyStyle` recommandé |
| ------------------------ | ---------------------------------------------------------------------------------- | ----------------------- |
| **Messages** (classique) | Les messages apparaissent sous forme de cartes avec des réponses en fil en dessous | `thread` (par défaut)   |
| **Fils** (style Slack)   | Les messages s'écoulent de manière linéaire, plus comme Slack                      | `top-level`             |

**Le problème :** L'API Teams n'expose pas le style d'interface utilisateur utilisé par un canal. Si vous utilisez le mauvais `replyStyle` :

- `thread` dans un canal de style Fils → les réponses apparaissent de manière maladroite et imbriquée
- `top-level` dans un canal de style Messages → les réponses apparaissent comme des messages de niveau supérieur distincts au lieu d'être dans le fil

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

## Pièces jointes et Images

**Limitations actuelles :**

- **DMs :** Les images et les pièces jointes fonctionnent via les API de fichiers de bot Teams.
- **Canaux/groupes :** Les pièces jointes résident dans le stockage M365 (SharePoint/OneDrive). La charge utile du webhook n'inclut qu'un fragment HTML, et non les octets réels du fichier. **Les autorisations de l'API Graph sont requises** pour télécharger les pièces jointes du canal.
- Pour les envois explicites de type fichier en premier, utilisez `action=upload-file` avec `media` / `filePath` / `path` ; l'option `message` devient le texte/commentaire accompagnant, et `filename` remplace le nom téléchargé.

Sans les autorisations Graph, les messages de canal contenant des images seront reçus sous forme de texte uniquement (le contenu de l'image n'est pas accessible pour le bot).
Par défaut, OpenClaw ne télécharge les médias que depuis les noms d'hôte Microsoft/Teams. Remplacez avec `channels.msteams.mediaAllowHosts` (utilisez `["*"]` pour autoriser n'importe quel hôte).
Les en-têtes d'autorisation sont uniquement attachés pour les hôtes dans `channels.msteams.mediaAuthAllowHosts` (par défaut : hôtes Graph + Bot Framework). Gardez cette liste stricte (évitez les suffixes multi-locataires).

## Envoi de fichiers dans les conversations de groupe

Les bots peuvent envoyer des fichiers dans les DMs en utilisant le flux FileConsentCard (intégré). Cependant, **l'envoi de fichiers dans les conversations de groupe/canaux** nécessite une configuration supplémentaire :

| Contexte                           | Mode d'envoi des fichiers                                   | Configuration requise                              |
| ---------------------------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| **DMs**                            | FileConsentCard → l'utilisateur accepte → le bot télécharge | Fonctionne immédiatement                           |
| **Conversations de groupe/canaux** | Télécharger vers SharePoint → partager le lien              | Nécessite `sharePointSiteId` + autorisations Graph |
| **Images (tout contexte)**         | Codées en Base64 en ligne                                   | Fonctionne immédiatement                           |

### Pourquoi les conversations de groupe nécessitent SharePoint

Les bots n'ont pas de lecteur OneDrive personnel (le point de terminaison `/me/drive` de l'API API Graph ne fonctionne pas pour les identités d'application). Pour envoyer des fichiers dans les conversations de groupe/canaux, le bot télécharge vers un **site SharePoint** et crée un lien de partage.

### Configuration

1. **Ajoutez les autorisations de l'API API Graph** dans Entra ID (Azure AD) → Inscription de l'application :
   - `Sites.ReadWrite.All` (Application) - télécharger des fichiers vers SharePoint
   - `Chat.Read.All` (Application) - facultatif, active les liens de partage par utilisateur

2. **Accordez le consentement administrateur** pour le locataire.

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

| Scénario                                                        | Résultat                                                                     |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Conversation de groupe + fichier + `sharePointSiteId` configuré | Télécharger vers SharePoint, envoyer le lien de partage                      |
| Conversation de groupe + fichier + pas de `sharePointSiteId`    | Tentative de chargement OneDrive (peut échouer), envoyer uniquement le texte |
| Chat personnel + fichier                                        | Flux FileConsentCard (fonctionne sans SharePoint)                            |
| Tout contexte + image                                           | Intégré en Base64 (fonctionne sans SharePoint)                               |

### Emplacement de stockage des fichiers

Les fichiers téléchargés sont stockés dans un dossier `/OpenClawShared/` de la bibliothèque de documents par défaut du site SharePoint configuré.

## Sondages (Adaptive Cards)

OpenClaw envoie les sondages Teams sous forme de cartes adaptatives (il n'y a pas d'API native pour les sondages Teams).

- CLI : `openclaw message poll --channel msteams --target conversation:<id> ...`
- Les votes sont enregistrés par la passerelle dans `~/.openclaw/msteams-polls.json`.
- La passerelle doit rester en ligne pour enregistrer les votes.
- Les sondages ne publient pas encore automatiquement de résumés des résultats (inspectez le fichier de stockage si nécessaire).

## Cartes de présentation

Envoyez des charges utiles de présentation sémantiques aux utilisateurs ou conversations Teams à l'aide de l'outil `message` ou de la CLI. OpenClaw les restitue sous forme de cartes adaptatives Teams à partir du contrat de présentation générique.

Le paramètre `presentation` accepte des blocs sémantiques. Lorsque `presentation` est fourni, le texte du message est facultatif.

**Outil d'agent :**

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

**Exemples d'outils d'agent :**

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
- Voir `/gateway/configuration` pour `dmPolicy` et le filtrage par liste verte.

## ID d'équipe et de canal (Piège courant)

Le paramètre de requête `groupId` dans les URL Teams n'**EST PAS** l'ID de team utilisé pour la configuration. Extrayez plutôt les ID du chemin de l'URL :

**URL de Team :**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team ID (URL-decode this)
```

**URL de channel :**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID (URL-decode this)
```

**Pour la configuration :**

- ID de Team = segment de chemin après `/team/` (URL décodé, par ex., `19:Bk4j...@thread.tacv2`)
- ID de Channel = segment de chemin après `/channel/` (URL décodé)
- **Ignorer** le paramètre de requête `groupId`

## Channels privés

Les bots ont une prise en charge limitée dans les channels privés :

| Fonctionnalité                   | Channels standards | Channels privés                |
| -------------------------------- | ------------------ | ------------------------------ |
| Installation du bot              | Oui                | Limitée                        |
| Messages en temps réel (webhook) | Oui                | Peut ne pas fonctionner        |
| Autorisations RSC                | Oui                | Peut se comporter différemment |
| @mentions                        | Oui                | Si le bot est accessible       |
| Historique de l'API Graph        | Oui                | Oui (avec autorisations)       |

**Solutions de contournement si les channels privés ne fonctionnent pas :**

1. Utilisez les channels standards pour les interactions avec le bot
2. Utilisez les DMs - les utilisateurs peuvent toujours envoyer un message directement au bot
3. Utilisez l'API Graph pour l'accès historique (nécessite `ChannelMessage.Read.All`)

## Dépannage

### Problèmes courants

- **Images non affichées dans les channels :** Autorisations Graph ou consentement administratif manquant. Réinstallez l'application Teams et quittez/rouvrez complètement Teams.
- **Aucune réponse dans le channel :** les mentions sont requises par défaut ; définissez `channels.msteams.requireMention=false` ou configurez par team/channel.
- **Incompatibilité de version (Teams affiche toujours l'ancien manifeste) :** supprimez et rajoutez l'application et quittez complètement Teams pour actualiser.
- **401 Unauthorized du webhook :** Attendu lors de tests manuels sans JWT Azure - cela signifie que le point de terminaison est accessible mais que l'authentification a échoué. Utilisez Azure Web Chat pour tester correctement.

### Erreurs de téléchargement de manifeste

- **« Le fichier d'icône ne peut pas être vide »** : Le manifeste fait référence à des fichiers d'icônes qui font 0 octets. Créez des icônes PNG valides (32x32 pour `outline.png`, 192x192 pour `color.png`).
- **« webApplicationInfo.Id déjà utilisé »** : L'application est toujours installée dans une autre team/chat. Trouvez-la et désinstallez-la d'abord, ou attendez 5 à 10 minutes pour la propagation.
- **« Une erreur s'est produite » lors du téléchargement :** Téléchargez plutôt via [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com), ouvrez les outils de développement du navigateur (F12) → onglet Réseau, et vérifiez le corps de la réponse pour l'erreur réelle.
- **Échec du chargement latéral :** Essayez « Télécharger une application dans le catalogue d'applications de votre organisation » au lieu de « Télécharger une application personnalisée » - cela permet souvent de contourner les restrictions de chargement latéral.

### Les autorisations RSC ne fonctionnent pas

1. Vérifiez que `webApplicationInfo.id` correspond exactement à l'ID d'application de votre bot
2. Téléchargez à nouveau l'application et réinstallez-la dans l'équipe/la conversation
3. Vérifiez si votre administrateur d'organisation a bloqué les autorisations RSC
4. Confirmez que vous utilisez la bonne portée : `ChannelMessage.Read.Group` pour les équipes, `ChatMessage.Read.Chat` pour les conversations de groupe

## Références

- [Create Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Guide de configuration du bot Azure
- [Teams Developer Portal](https://dev.teams.microsoft.com/apps) - créer/gérer les applications Teams
- [Teams app manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Receive channel messages with RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC permissions reference](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams bot file handling](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (channel/group nécessite Graph)
- [Proactive messaging](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
- [@microsoft/teams.cli](https://www.npmjs.com/package/@microsoft/teams.cli) - Teams CLI pour la gestion des bots

## Connexes

- [Channels Overview](/fr/channels) — tous les channels pris en charge
- [Pairing](/fr/channels/pairing) — authentification DM et flux de couplage
- [Groups](/fr/channels/groups) — comportement des conversations de groupe et filtrage des mentions
- [Channel Routing](/fr/channels/channel-routing) — routage de session pour les messages
- [Security](/fr/gateway/security) — model d'accès et durcissement
