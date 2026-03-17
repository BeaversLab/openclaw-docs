---
summary: "État du support, capacités et configuration du bot Microsoft Teams"
read_when:
  - Working on MS Teams channel features
title: "Microsoft Teams"
---

# Microsoft Teams (plugin)

> "Abandon all hope, ye who enter here."

Updated: 2026-01-21

État : le texte et les pièces jointes DM sont pris en charge ; l'envoi de fichiers dans les canaux/groupes nécessite `sharePointSiteId` + les autorisations Graph (voir [Sending files in group chats](#sending-files-in-group-chats)). Les sondages sont envoyés via des cartes adaptatives.

## Plugin required

Microsoft Teams est fourni en tant que plugin et n'est pas inclus dans l'installation principale.

**Breaking change (2026.1.15) :** MS Teams a été retiré du cœur. Si vous l'utilisez, vous devez installer le plugin.

Explication : allège les installations principales et permet aux dépendances MS Teams de se mettre à jour indépendamment.

Install via CLI (npm registry) :

```bash
openclaw plugins install @openclaw/msteams
```

Local checkout (when running from a git repo) :

```bash
openclaw plugins install ./extensions/msteams
```

Si vous choisissez Teams lors de la configuration et qu'une extraction git est détectée,
OpenClaw proposera automatiquement le chemin d'installation local.

Details: [Plugins](/fr/tools/plugin)

## Quick setup (beginner)

1. Install the Microsoft Teams plugin.
2. Create an **Azure Bot** (App ID + client secret + tenant ID).
3. Configure OpenClaw with those credentials.
4. Expose `/api/messages` (port 3978 par défaut) via une URL publique ou un tunnel.
5. Install the Teams app package and start the gateway.

Minimal config :

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

Note : les discussions de groupe sont bloquées par défaut (`channels.msteams.groupPolicy: "allowlist"`). Pour autoriser les réponses de groupe, définissez `channels.msteams.groupAllowFrom` (ou utilisez `groupPolicy: "open"` pour autoriser n'importe quel membre, filtré par mention).

## Goals

- Talk to OpenClaw via Teams DMs, group chats, or channels.
- Keep routing deterministic: replies always go back to the channel they arrived on.
- Default to safe channel behavior (mentions required unless configured otherwise).

## Config writes

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
- `channels.msteams.allowFrom` devrait utiliser des ID d'objet AAD stables.
- Les UPN/noms d'affichage sont modifiables ; la correspondance directe est désactivée par défaut et n'est activée qu'avec `channels.msteams.dangerouslyAllowNameMatching: true`.
- L'assistant peut résoudre les noms en ID via Microsoft Graph lorsque les informations d'identification le permettent.

**Accès aux groupes**

- Par défaut : `channels.msteams.groupPolicy = "allowlist"` (bloqué sauf si vous ajoutez `groupAllowFrom`). Utilisez `channels.defaults.groupPolicy` pour remplacer la valeur par défaut lorsqu'elle n'est pas définie.
- `channels.msteams.groupAllowFrom` contrôle les expéditeurs pouvant déclencher dans les conversations de groupe/canaux (revient à `channels.msteams.allowFrom`).
- Définissez `groupPolicy: "open"` pour autoriser n'importe quel membre (toujours limité par mention par défaut).
- Pour n'autoriser **aucun channel**, définissez `channels.msteams.groupPolicy: "disabled"`.

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

**Teams + allowlist de channels**

- Définissez la portée des réponses de groupe/channel en listant les équipes et les canaux sous `channels.msteams.teams`.
- Les clés doivent utiliser des ID d'équipe stables et des ID de conversation de channel.
- Lorsque `groupPolicy="allowlist"` et qu'une allowlist d'équipes est présente, seules les équipes/canaux listés sont acceptés (limités par mention).
- L'assistant de configuration accepte les entrées `Team/Channel` et les stocke pour vous.
- Au démarrage, OpenClaw résout les noms des allowlists d'équipe/channel et d'utilisateur en ID (lorsque les autorisations Graph le permettent)
  et consigne le mappage ; les noms d'équipe/channel non résolus sont conservés tels quels mais ignorés pour le routage par défaut sauf si `channels.msteams.dangerouslyAllowNameMatching: true` est activé.

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

## Fonctionnement

1. Installez le plugin Microsoft Teams.
2. Créez un **Azure Bot** (ID d'application + secret + ID de locataire).
3. Créez un **package d'application Teams** qui référence le bot et inclut les autorisations RSC ci-dessous.
4. Téléchargez/installez l'application Teams dans une équipe (ou une étendue personnelle pour les DMs).
5. Configurez `msteams` dans `~/.openclaw/openclaw.json` (ou env vars) et démarrez la passerelle.
6. La passerelle écoute le trafic du webhook Bot Framework sur `/api/messages` par défaut.

## Configuration du bot Azure (Prérequis)

Avant de configurer OpenClaw, vous devez créer une ressource Bot Azure.

### Étape 1 : Créer un bot Azure

1. Accédez à [Créer un bot Azure](https://portal.azure.com/#create/Microsoft.AzureBot)
2. Remplissez l'onglet **Basics** :

   | Champ                    | Valeur                                                             |
   | ------------------------ | ------------------------------------------------------------------ |
   | **Bot handle**           | Le nom de votre bot, par ex. `openclaw-msteams` (doit être unique) |
   | **Abonnement**           | Sélectionnez votre abonnement Azure                                |
   | **Groupe de ressources** | Créer un nouveau ou utiliser un existant                           |
   | **Niveau tarifaire**     | **Gratuit** pour le développement/test                             |
   | **Type d'application**   | **Monolocataire** (recommandé - voir la note ci-dessous)           |
   | **Type de création**     | **Créer un nouvel ID d'application Microsoft**                     |

> **Avis d'obsolescence :** La création de nouveaux bots multilocataires a été abandonnée après le 31/07/2025. Utilisez **Monolocataire** pour les nouveaux bots.

3. Cliquez sur **Vérifier + créer** → **Créer** (attendre ~1 à 2 minutes)

### Étape 2 : Obtenir les identifiants

1. Accédez à votre ressource Bot Azure → **Configuration**
2. Copiez **Microsoft App ID** → il s'agit de votre `appId`
3. Cliquez sur **Gérer le mot de passe** → accédez à l'inscription de l'application
4. Sous **Certificats et secrets** → **Nouveau secret client** → copiez la **Valeur** → il s'agit de votre `appPassword`
5. Accédez à **Vue d'ensemble** → copiez **ID de répertoire (locataire)** → il s'agit de votre `tenantId`

### Étape 3 : Configurer le point de terminaison de messagerie

1. Dans Bot Azure → **Configuration**
2. Définissez le **Point de terminaison de messagerie** sur votre URL de webhook :
   - Production : `https://your-domain.com/api/messages`
   - Dév local : Utilisez un tunnel (voir [Développement local](#local-development-tunneling) ci-dessous)

### Étape 4 : Activer le canal Teams

1. Dans Bot Azure → **Canaux**
2. Cliquez sur **Microsoft Teams** → Configurer → Enregistrer
3. Acceptez les conditions d'utilisation

## Développement local (Tunnels)

Teams ne peut pas atteindre `localhost`. Utilisez un tunnel pour le développement local :

**Option A : ngrok**

```bash
ngrok http 3978
# Copy the https URL, e.g., https://abc123.ngrok.io
# Set messaging endpoint to: https://abc123.ngrok.io/api/messages
```

**Option B : Funnel Tailscale**

```bash
tailscale funnel 3978
# Use your Tailscale funnel URL as the messaging endpoint
```

## Portail des développeurs Teams (Alternative)

Au lieu de créer manuellement un fichier ZIP manifeste, vous pouvez utiliser le [Portail des développeurs Teams](https://dev.teams.microsoft.com/apps) :

1. Cliquez sur **+ Nouvelle application**
2. Remplissez les informations de base (nom, description, informations sur le développeur)
3. Accédez à **Fonctionnalités de l'application** → **Bot**
4. Sélectionnez **Entrer un ID de bot manuellement** et collez votre ID d'application de bot Azure
5. Cochez les étendues (scopes) : **Personnel**, **Équipe**, **Conversation de groupe**
6. Cliquez sur **Distribuer** → **Télécharger le package d'application**
7. Dans Teams : **Applications** → **Gérer vos applications** → **Télécharger une application personnalisée** → sélectionnez le fichier ZIP

C'est souvent plus facile que de modifier manuellement les fichiers manifeste JSON.

## Test du Bot

**Option A : Azure Web Chat (vérifier d'abord le webhook)**

1. Dans le portail Azure → votre ressource Bot Azure → **Test dans Web Chat**
2. Envoyez un message - vous devriez voir une réponse
3. Cela confirme que votre point de terminaison webhook fonctionne avant la configuration de Teams

**Option B : Teams (après l'installation de l'application)**

1. Installez l'application Teams (chargement latéral ou catalogue de l'organisation)
2. Trouvez le bot dans Teams et envoyez-lui un message privé (DM)
3. Vérifiez les journaux de la passerelle pour l'activité entrante

## Configuration (texte minimal uniquement)

1. **Installer le plugin Microsoft Teams**
   - Depuis npm : `openclaw plugins install @openclaw/msteams`
   - Depuis un extraction locale : `openclaw plugins install ./extensions/msteams`

2. **Enregistrement du bot**
   - Créez un Bot Azure (voir ci-dessus) et notez :
     - ID de l'application (App ID)
     - Secret client (Mot de passe de l'application)
     - ID de locataire (Tenant ID) (locataire unique)

3. **Manifeste de l'application Teams**
   - Incluez une entrée `bot` avec `botId = <App ID>`.
   - Étendues (scopes) : `personal`, `team`, `groupChat`.
   - `supportsFiles: true` (requis pour la gestion des fichiers de l'étendue personnelle).
   - Ajoutez les autorisations RSC (ci-dessous).
   - Créez des icônes : `outline.png` (32x32) et `color.png` (192x192).
   - Compressez les trois fichiers ensemble : `manifest.json`, `outline.png`, `color.png`.

4. **Configurer OpenClaw**

   ```json
   {
     "msteams": {
       "enabled": true,
       "appId": "<APP_ID>",
       "appPassword": "<APP_PASSWORD>",
       "tenantId": "<TENANT_ID>",
       "webhook": { "port": 3978, "path": "/api/messages" }
     }
   }
   ```

   Vous pouvez également utiliser des variables d'environnement au lieu des clés de configuration :
   - `MSTEAMS_APP_ID`
   - `MSTEAMS_APP_PASSWORD`
   - `MSTEAMS_TENANT_ID`

5. **Point de terminaison du bot**
   - Définissez le point de terminaison de messagerie du bot Azure sur :
     - `https://<host>:3978/api/messages` (ou le chemin/le port de votre choix).

6. **Exécuter la passerelle**
   - Le canal Teams démarre automatiquement lorsque le plugin est installé et que la configuration `msteams` existe avec les identifiants.

## Contexte de l'historique

- `channels.msteams.historyLimit` contrôle le nombre de messages récents du canal/groupe inclus dans le prompt.
- Revient à `messages.groupChat.historyLimit`. Définissez `0` pour désactiver (par défaut 50).
- L'historique des DM peut être limité avec `channels.msteams.dmHistoryLimit` (tours utilisateur). Remplacements par utilisateur : `channels.msteams.dms["<user_id>"].historyLimit`.

## Autorisations RSC Teams actuelles (Manifeste)

Ce sont les **autorisations resourceSpecific existantes** dans le manifeste de notre application Teams. Elles ne s'appliquent qu'à l'intérieur de l'équipe/de la conversation où l'application est installée.

**Pour les canaux (portée d'équipe) :**

- `ChannelMessage.Read.Group` (Application) - recevoir tous les messages du canal sans @mention
- `ChannelMessage.Send.Group` (Application)
- `Member.Read.Group` (Application)
- `Owner.Read.Group` (Application)
- `ChannelSettings.Read.Group` (Application)
- `TeamMember.Read.Group` (Application)
- `TeamSettings.Read.Group` (Application)

**Pour les conversations de groupe :**

- `ChatMessage.Read.Chat` (Application) - recevoir tous les messages de conversation de groupe sans @mention

## Exemple de manifeste Teams (expurgé)

Exemple minimal et valide avec les champs requis. Remplacez les ID et les URL.

```json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.23/MicrosoftTeams.schema.json",
  "manifestVersion": "1.23",
  "version": "1.0.0",
  "id": "00000000-0000-0000-0000-000000000000",
  "name": { "short": "OpenClaw" },
  "developer": {
    "name": "Your Org",
    "websiteUrl": "https://example.com",
    "privacyUrl": "https://example.com/privacy",
    "termsOfUseUrl": "https://example.com/terms"
  },
  "description": { "short": "OpenClaw in Teams", "full": "OpenClaw in Teams" },
  "icons": { "outline": "outline.png", "color": "color.png" },
  "accentColor": "#5B6DEF",
  "bots": [
    {
      "botId": "11111111-1111-1111-1111-111111111111",
      "scopes": ["personal", "team", "groupChat"],
      "isNotificationOnly": false,
      "supportsCalling": false,
      "supportsVideo": false,
      "supportsFiles": true
    }
  ],
  "webApplicationInfo": {
    "id": "11111111-1111-1111-1111-111111111111"
  },
  "authorization": {
    "permissions": {
      "resourceSpecific": [
        { "name": "ChannelMessage.Read.Group", "type": "Application" },
        { "name": "ChannelMessage.Send.Group", "type": "Application" },
        { "name": "Member.Read.Group", "type": "Application" },
        { "name": "Owner.Read.Group", "type": "Application" },
        { "name": "ChannelSettings.Read.Group", "type": "Application" },
        { "name": "TeamMember.Read.Group", "type": "Application" },
        { "name": "TeamSettings.Read.Group", "type": "Application" },
        { "name": "ChatMessage.Read.Chat", "type": "Application" }
      ]
    }
  }
}
```

### Mises en garde du manifeste (champs obligatoires)

- `bots[].botId` **doit** correspondre à l'ID de l'application Azure Bot.
- `webApplicationInfo.id` **doit** correspondre à l'ID de l'application Azure Bot.
- `bots[].scopes` doit inclure les surfaces que vous prévoyez d'utiliser (`personal`, `team`, `groupChat`).
- `bots[].supportsFiles: true` est requis pour la gestion des fichiers dans la portée personnelle.
- `authorization.permissions.resourceSpecific` doit inclure la lecture/l'envoi de canal si vous voulez le trafic de canal.

### Mise à jour d'une application existante

Pour mettre à jour une application Teams déjà installée (par exemple, pour ajouter des autorisations RSC) :

1. Mettez à jour votre `manifest.json` avec les nouveaux paramètres
2. **Incrémentez le champ `version`** (par exemple, `1.0.0` → `1.1.0`)
3. **Recompressez** le manifeste avec les icônes (`manifest.json`, `outline.png`, `color.png`)
4. Téléchargez le nouveau fichier zip :
   - **Option A (Centre d'administration Teams) :** Centre d'administration Teams → Applications Teams → Gérer les applications → trouver votre application → Télécharger une nouvelle version
   - **Option B (Chargement latéral) :** Dans Teams → Applications → Gérer vos applications → Télécharger une application personnalisée
5. **Pour les canaux d'équipe :** Réinstallez l'application dans chaque équipe pour que les nouvelles autorisations prennent effet
6. **Quittez complètement et relancez Teams** (et ne fermez pas seulement la fenêtre) pour effacer les métadonnées de l'application en cache

## Fonctionnalités : RSC uniquement vs Graph

### Avec **Teams RSC uniquement** (application installée, aucune autorisation Microsoft Graph API)

Fonctionne :

- Lire le contenu **textuel** des messages du canal.
- Envoyer le contenu **textuel** des messages du canal.
- Recevoir des pièces jointes de fichiers **personnels (DM)**.

Ne fonctionne PAS :

- **Contenu d'images ou de fichiers** de canal/groupe (la charge utile ne comprend que le code HTML).
- Téléchargement de pièces jointes stockées dans SharePoint/OneDrive.
- Lecture de l'historique des messages (au-delà de l'événement webhook en direct).

### Avec **Teams RSC + Autorisations d'application Microsoft Graph**

Ajoute :

- Téléchargement de contenus hébergés (images collées dans les messages).
- Téléchargement de pièces jointes de fichiers stockées dans SharePoint/OneDrive.
- Lecture de l'historique des messages de canal/discussion via Graph.

### RSC vs Graph API

| Fonctionnalité                     | Autorisations RSC                     | Graph API                                                     |
| ---------------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| **Messages en temps réel**         | Oui (via webhook)                     | Non (sondage uniquement)                                      |
| **Messages historiques**           | Non                                   | Oui (peut interroger l'historique)                            |
| **Complexité de la configuration** | Manifeste de l'application uniquement | Nécessite le consentement de l'administrateur + flux de jeton |
| **Fonctionne hors ligne**          | Non (doit être en cours d'exécution)  | Oui (interrogation à tout moment)                             |

**En résumé :** RSC est pour l'écoute en temps réel ; l'API Graph est pour l'accès historique. Pour rattraper les messages manqués hors ligne, vous avez besoin de l'API Graph avec `ChannelMessage.Read.All` (nécessite le consentement de l'administrateur).

## Média + historique activés par Graph (requis pour les channels)

Si vous avez besoin d'images/fichiers dans les **channels** ou souhaitez récupérer l'**historique des messages**, vous devez activer les autorisations Microsoft Graph et accorder le consentement de l'administrateur.

1. Dans Entra ID (Azure AD) **App Registration**, ajoutez les **autorisations d'application** Microsoft Graph :
   - `ChannelMessage.Read.All` (pièces jointes du channel + historique)
   - `Chat.Read.All` ou `ChatMessage.Read.All` (discussions de groupe)
2. **Accorder le consentement de l'administrateur** pour le client.
3. Augmentez la **version du manifeste** de l'application Teams, rechargez-la, et **réinstallez l'application dans Teams**.
4. **Quittez entièrement et relancez Teams** pour effacer les métadonnées de l'application en cache.

**Autorisation supplémentaire pour les mentions d'utilisateur :** Les mentions @ utilisateur fonctionnent immédiatement pour les utilisateurs de la conversation. Cependant, si vous souhaitez rechercher et mentionner dynamiquement des utilisateurs qui ne sont **pas dans la conversation actuelle**, ajoutez l'autorisation `User.Read.All` (Application) et accordez le consentement de l'administrateur.

## Limitations connues

### Délais d'expiration des Webhooks

Teams envoie les messages via un webhook HTTP. Si le traitement prend trop de temps (par exemple, réponses LLM lentes), vous pouvez voir :

- Délais d'attente de la Gateway
- Teams qui réessaie d'envoyer le message (causant des doublons)
- Réponses perdues

OpenClaw gère cela en répondant rapidement et en envoyant des réponses de manière proactive, mais les réponses très lentes peuvent encore causer des problèmes.

### Formatage

Le markdown Teams est plus limité que celui de Slack ou Discord :

- Le formatage de base fonctionne : **gras**, _italique_, `code`, liens
- Le markdown complexe (tableaux, listes imbriquées) peut ne pas s'afficher correctement
- Les Adaptive Cards sont prises en charge pour les sondages et les envois de cartes arbitraires (voir ci-dessous)

## Configuration

Paramètres clés (voir `/gateway/configuration` pour les modèles de channels partagés) :

- `channels.msteams.enabled` : activer/désactiver le channel.
- `channels.msteams.appId`, `channels.msteams.appPassword`, `channels.msteams.tenantId` : identifiants du bot.
- `channels.msteams.webhook.port` (par défaut `3978`)
- `channels.msteams.webhook.path` (par défaut `/api/messages`)
- `channels.msteams.dmPolicy` : `pairing | allowlist | open | disabled` (par défaut : appairage)
- `channels.msteams.allowFrom` : liste d'autorisation DM (AAD object IDs recommandés). L'assistant résout les noms en ID lors de la configuration lorsque l'accès Graph est disponible.
- `channels.msteams.dangerouslyAllowNameMatching` : interrupteur de secours pour réactiver la correspondance mutable UPN/nom d'affichage et le routage direct par nom d'équipe/canal.
- `channels.msteams.textChunkLimit` : taille des blocs de texte sortants.
- `channels.msteams.chunkMode` : `length` (par défaut) ou `newline` pour diviser sur les lignes vides (limites de paragraphe) avant le découpage par longueur.
- `channels.msteams.mediaAllowHosts` : liste d'autorisation pour les hôtes de pièces jointes entrantes (par défaut, domaines Microsoft/Teams).
- `channels.msteams.mediaAuthAllowHosts` : liste d'autorisation pour l'ajout d'en-têtes Authorization lors des nouvelles tentatives de média (par défaut, hôtes Graph + Bot Framework).
- `channels.msteams.requireMention` : exiger @mention dans les canaux/groupes (vrai par défaut).
- `channels.msteams.replyStyle` : `thread | top-level` (voir [Style de réponse](#reply-style-threads-vs-posts)).
- `channels.msteams.teams.<teamId>.replyStyle` : remplacement par équipe.
- `channels.msteams.teams.<teamId>.requireMention` : remplacement par équipe.
- `channels.msteams.teams.<teamId>.tools` : remplacements par défaut de la stratégie d'outil par équipe (`allow`/`deny`/`alsoAllow`) utilisés lorsqu'un remplacement de canal est manquant.
- `channels.msteams.teams.<teamId>.toolsBySender` : remplacements par défaut de la stratégie d'outil par équipe et par expéditeur (caractère générique `"*"` pris en charge).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle` : remplacement par canal.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention` : remplacement par canal.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools` : remplacements de la stratégie d'outils par channel (`allow`/`deny`/`alsoAllow`).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender` : remplacements de la stratégie d'outils par channel et par expéditeur (le caractère générique `"*"` est pris en charge).
- Les clés `toolsBySender` doivent utiliser des préfixes explicites :
  `id:`, `e164:`, `username:`, `name:` (les clés sans préfixe héritées mappent toujours uniquement vers `id:`).
- `channels.msteams.sharePointSiteId` : ID du site SharePoint pour le téléchargement de fichiers dans les conversations de groupe/canaux (voir [Sending files in group chats](#sending-files-in-group-chats)).

## Routage et sessions

- Les clés de session suivent le format standard de l'agent (voir [/concepts/session](/fr/concepts/session)) :
  - Les messages directs partagent la session principale (`agent:<agentId>:<mainKey>`).
  - Les messages de canal/groupe utilisent l'ID de conversation :
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## Style de réponse : Fils de discussion vs Publications

Teams a récemment introduit deux styles d'interface utilisateur de canal sur le même modèle de données sous-jacent :

| Style                                      | Description                                                                                      | `replyStyle` recommandé |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ | ----------------------- |
| **Publications** (classique)               | Les messages apparaissent sous forme de cartes avec des réponses en fil de discussion en dessous | `thread` (par défaut)   |
| **Fils de discussion** (similaire à Slack) | Les messages s'écoulent linéairement, plus comme Slack                                           | `top-level`             |

**Le problème :** L'API Teams n'expose pas le style d'interface utilisateur utilisé par un canal. Si vous utilisez le mauvais `replyStyle` :

- `thread` dans un canal de style Fils de discussion → les réponses apparaissent de manière maladroite et imbriquées
- `top-level` dans un canal de style Publications → les réponses apparaissent comme des publications de niveau supérieur distinctes au lieu d'être dans le fil

**Solution :** Configurez `replyStyle` par canal en fonction de la configuration du canal :

```json
{
  "msteams": {
    "replyStyle": "thread",
    "teams": {
      "19:abc...@thread.tacv2": {
        "channels": {
          "19:xyz...@thread.tacv2": {
            "replyStyle": "top-level"
          }
        }
      }
    }
  }
}
```

## Pièces jointes et images

**Limitations actuelles :**

- **DMs :** Les images et les pièces jointes fonctionnent via les API de fichiers de bot Teams.
- **Canaux/groupes :** Les pièces jointes sont stockées dans le stockage M365 (SharePoint/OneDrive). La charge utile du webhook ne comprend qu'un fragment HTML, et non les octets réels du fichier. **Les autorisations de l'API Graph sont requises** pour télécharger les pièces jointes des canaux.

Sans autorisations Graph, les messages de canal contenant des images seront reçus sous forme de texte uniquement (le contenu de l'image n'est pas accessible pour le bot).
Par défaut, OpenClaw ne télécharge les médias qu'à partir des noms d'hôte Microsoft/Teams. Remplacez cela avec `channels.msteams.mediaAllowHosts` (utilisez `["*"]` pour autoriser n'importe quel hôte).
Les en-têtes d'autorisation ne sont attachés que pour les hôtes dans `channels.msteams.mediaAuthAllowHosts` (par défaut, hôtes Graph + Bot Framework). Gardez cette liste stricte (évitez les suffixes multi-locataires).

## Envoi de fichiers dans les discussions de groupe

Les bots peuvent envoyer des fichiers dans les DMs en utilisant le flux FileConsentCard (intégré). Cependant, **l'envoi de fichiers dans les discussions de groupe/canaux** nécessite une configuration supplémentaire :

| Contexte                         | Comment les fichiers sont envoyés                      | Configuration nécessaire                           |
| -------------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| **DMs**                          | FileConsentCard → utilisateur accepte → bot télécharge | Fonctionne hors de la boîte                        |
| **Discussions de groupe/canaux** | Télécharger vers SharePoint → partager le lien         | Nécessite `sharePointSiteId` + autorisations Graph |
| **Images (tout contexte)**       | Codées en Base64 en ligne                              | Fonctionne hors de la boîte                        |

### Pourquoi les discussions de groupe ont besoin de SharePoint

Les bots n'ont pas de lecteur OneDrive personnel (le point de terminaison `/me/drive` de l'API Graph ne fonctionne pas pour les identités d'application). Pour envoyer des fichiers dans les discussions de groupe/canaux, le bot télécharge vers un **site SharePoint** et crée un lien de partage.

### Configuration

1. **Ajouter des autorisations Graph API** dans Entra ID (Azure AD) → Inscription d'application :
   - `Sites.ReadWrite.All` (Application) - télécharger des fichiers vers SharePoint
   - `Chat.Read.All` (Application) - facultatif, active les liens de partage par utilisateur

2. **Accorder le consentement administrateur** pour le client.

3. **Obtenez votre ID de site SharePoint :**

   ```bash
   # Via Graph Explorer or curl with a valid token:
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/{hostname}:/{site-path}"

   # Example: for a site at "contoso.sharepoint.com/sites/BotFiles"
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/BotFiles"

   # Response includes: "id": "contoso.sharepoint.com,guid1,guid2"
   ```

4. **Configurer OpenClaw :**

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

| Scénario                                                        | Résultat                                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Conversation de groupe + fichier + `sharePointSiteId` configuré | Télécharger vers SharePoint, envoyer le lien de partage                               |
| Conversation de groupe + fichier + pas de `sharePointSiteId`    | Tentative de téléchargement vers OneDrive (peut échouer), envoyer le texte uniquement |
| Conversation personnelle + fichier                              | Flux FileConsentCard (fonctionne sans SharePoint)                                     |
| N'importe quel contexte + image                                 | Encodé en Base64 en ligne (fonctionne sans SharePoint)                                |

### Emplacement de stockage des fichiers

Les fichiers téléchargés sont stockés dans un dossier `/OpenClawShared/` de la bibliothèque de documents par défaut du site SharePoint configuré.

## Sondages (Cartes adaptatives)

OpenClaw envoie les sondages Teams sous forme de cartes adaptatives (il n'y a pas d'API de sondage Teams natif).

- CLI : `openclaw message poll --channel msteams --target conversation:<id> ...`
- Les votes sont enregistrés par la passerelle dans `~/.openclaw/msteams-polls.json`.
- La passerelle doit rester en ligne pour enregistrer les votes.
- Les sondages ne publient pas encore automatiquement de résumés des résultats (inspectez le fichier de stockage si nécessaire).

## Cartes adaptatives (arbitraires)

Envoyez n'importe quel JSON de carte adaptative aux utilisateurs ou conversations Teams à l'aide de l'outil `message` ou de la CLI.

Le paramètre `card` accepte un objet JSON de carte adaptative. Lorsque `card` est fourni, le texte du message est facultatif.

**Outil d'agent :**

```json
{
  "action": "send",
  "channel": "msteams",
  "target": "user:<id>",
  "card": {
    "type": "AdaptiveCard",
    "version": "1.5",
    "body": [{ "type": "TextBlock", "text": "Hello!" }]
  }
}
```

**CLI :**

```bash
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello!"}]}'
```

Consultez la [documentation Adaptive Cards](https://adaptivecards.io/) pour le schéma et les exemples de cartes. Pour plus de détails sur les formats cibles, consultez [Formats cibles](#target-formats) ci-dessous.

## Formats cibles

Les cibles MSTeams utilisent des préfixes pour distinguer les utilisateurs et les conversations :

| Type de cible         | Format                           | Exemple                                               |
| --------------------- | -------------------------------- | ----------------------------------------------------- |
| Utilisateur (par ID)  | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`           |
| Utilisateur (par nom) | `user:<display-name>`            | `user:John Smith` (nécessite Graph API)               |
| Groupe/channel        | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`              |
| Groupe/channel (brut) | `<conversation-id>`              | `19:abc123...@thread.tacv2` (s'il contient `@thread`) |

**Exemples CLI :**

```bash
# Send to a user by ID
openclaw message send --channel msteams --target "user:40a1a0ed-..." --message "Hello"

# Send to a user by display name (triggers Graph API lookup)
openclaw message send --channel msteams --target "user:John Smith" --message "Hello"

# Send to a group chat or channel
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" --message "Hello"

# Send an Adaptive Card to a conversation
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello"}]}'
```

**Exemples d'outil d'agent :**

```json
{
  "action": "send",
  "channel": "msteams",
  "target": "user:John Smith",
  "message": "Hello!"
}
```

```json
{
  "action": "send",
  "channel": "msteams",
  "target": "conversation:19:abc...@thread.tacv2",
  "card": {
    "type": "AdaptiveCard",
    "version": "1.5",
    "body": [{ "type": "TextBlock", "text": "Hello" }]
  }
}
```

Remarque : Sans le préfixe `user:`, les noms sont par défaut résolus vers le groupe/l'équipe. Utilisez toujours `user:` lorsque vous ciblez des personnes par nom d'affichage.

## Messagerie proactive

- Les messages proactifs ne sont possibles qu'**après** qu'un utilisateur a interagi, car nous stockons les références de conversation à ce moment-là.
- Voir `/gateway/configuration` pour `dmPolicy` et le filtrage par liste blanche.

## ID d'équipe et de canal ( piège courant )

Le paramètre de requête `groupId` dans les URL Teams n'est **PAS** l'ID d'équipe utilisé pour la configuration. Extrayez plutôt les ID du chemin de l'URL :

**URL d'équipe :**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    Team ID (URL-decode this)
```

**URL de canal :**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      Channel ID (URL-decode this)
```

**Pour la configuration :**

- ID d'équipe = segment de chemin après `/team/` (décodé URL, p. ex., `19:Bk4j...@thread.tacv2`)
- ID de canal = segment de chemin après `/channel/` (décodé URL)
- **Ignorer** le paramètre de requête `groupId`

## Canaux privés

Les bots ont une prise en charge limitée dans les canaux privés :

| Fonctionnalité                   | Canaux standard | Canaux privés                  |
| -------------------------------- | --------------- | ------------------------------ |
| Installation du bot              | Oui             | Limitée                        |
| Messages en temps réel (webhook) | Oui             | Peut ne pas fonctionner        |
| Autorisations RSC                | Oui             | Peut se comporter différemment |
| @mentions                        | Oui             | Si le bot est accessible       |
| Historique Graph API             | Oui             | Oui (avec autorisations)       |

**Solutions de contournement si les canaux privés ne fonctionnent pas :**

1. Utilisez des canaux standard pour les interactions avec le bot
2. Utilisez les DMs - les utilisateurs peuvent toujours envoyer un message directement au bot
3. Utilisez Graph API pour l'accès historique (nécessite `ChannelMessage.Read.All`)

## Dépannage

### Problèmes courants

- **Images ne s'affichant pas dans les canaux :** Autorisations Graph ou consentement administratif manquant. Réinstallez l'application Teams et fermez/rouvrez entièrement Teams.
- **Aucune réponse dans le canal :** les mentions sont requises par défaut ; définissez `channels.msteams.requireMention=false` ou configurez par équipe/canal.
- **Inadéquation de version (Teams affiche toujours l'ancien manifeste) :** supprimez et ajoutez à nouveau l'application et quittez entièrement Teams pour rafraîchir.
- **401 Unauthorized depuis le webhook :** Attendu lors de tests manuels sans JWT Azure - cela signifie que le point de terminaison est accessible mais que l'authentification a échoué. Utilisez Azure Web Chat pour tester correctement.

### Erreurs de téléchargement de manifeste

- **« Le fichier d'icône ne peut pas être vide » :** Le manifeste fait référence à des fichiers d'icônes de 0 octet. Créez des icônes PNG valides (32x32 pour `outline.png`, 192x192 pour `color.png`).
- **« webApplicationInfo.Id déjà utilisé » :** L'application est toujours installée dans une autre équipe/conversation. Trouvez-la et désinstallez-la d'abord, ou attendez 5 à 10 minutes pour la propagation.
- **« Une erreur s'est produite » lors du téléchargement :** Téléchargez plutôt via [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com), ouvrez les outils de développement du navigateur (F12) → onglet Réseau, et vérifiez le corps de la réponse pour l'erreur réelle.
- **Échec du chargement latéral :** Essayez « Télécharger une application dans le catalogue d'applications de votre organisation » au lieu de « Télécharger une application personnalisée » - cela contourne souvent les restrictions de chargement latéral.

### Autorisations RSC non fonctionnelles

1. Vérifiez que `webApplicationInfo.id` correspond exactement à l'ID d'application de votre bot
2. Téléchargez à nouveau l'application et réinstallez-la dans l'équipe/la conversation
3. Vérifiez si l'administrateur de votre organisation a bloqué les autorisations RSC
4. Confirmez que vous utilisez la bonne portée : `ChannelMessage.Read.Group` pour les équipes, `ChatMessage.Read.Chat` pour les conversations de groupe

## Références

- [Créer un Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Guide de configuration d'Azure Bot
- [Portail des développeurs Teams](https://dev.teams.microsoft.com/apps) - créer/gérer les applications Teams
- [Schéma du manifeste d'application Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Recevoir les messages de canal avec RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [Référence des autorisations RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Gestion des fichiers de bot Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (canal/groupe nécessite Graph)
- [Messagerie proactive](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)

import fr from "/components/footer/fr.mdx";

<fr />
