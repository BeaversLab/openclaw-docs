---
summary: "État du support, capacités et configuration du bot Microsoft Teams"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft Teams"
---

# Microsoft Teams (plugin)

> "Abandon all hope, ye who enter here."

Updated: 2026-01-21

Statut : le texte + les pièces jointes DM sont pris en charge ; l'envoi de fichiers vers les channels/groupes nécessite `sharePointSiteId` + des autorisations Graph (voir [Sending files in group chats](#sending-files-in-group-chats)). Les sondages sont envoyés via Adaptive Cards. Les actions de message exposent `upload-file` explicite pour les envois priorisant les fichiers.

## Plugin required

Microsoft Teams est fourni en tant que plugin et n'est pas inclus dans l'installation principale.

**Breaking change (2026.1.15) :** Microsoft Teams ne fait plus partie du cœur. Si vous l'utilisez, vous devez installer le plugin.

Explication : allège les installations du cœur et permet aux dépendances de Microsoft Teams d'être mises à jour indépendamment.

Install via CLI (npm registry) :

```bash
openclaw plugins install @openclaw/msteams
```

Local checkout (when running from a git repo) :

```bash
openclaw plugins install ./path/to/local/msteams-plugin
```

Si vous choisissez Teams lors de la configuration et qu'une extraction git est détectée,
OpenClaw proposera automatiquement le chemin d'installation local.

Détails : [Plugins](/en/tools/plugin)

## Quick setup (beginner)

1. Install the Microsoft Teams plugin.
2. Create an **Azure Bot** (App ID + client secret + tenant ID).
3. Configure OpenClaw with those credentials.
4. Exposez `/api/messages` (port 3978 par défaut) via une URL publique ou un tunnel.
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

Remarque : les discussions de groupe sont bloquées par défaut (`channels.msteams.groupPolicy: "allowlist"`). Pour autoriser les réponses de groupe, définissez `channels.msteams.groupAllowFrom` (ou utilisez `groupPolicy: "open"` pour autoriser n'importe quel membre, restreint par mention).

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
- `channels.msteams.allowFrom` doit utiliser des ID d'objet AAD stables.
- Les noms d'affichage/UPN sont modifiables ; la correspondance directe est désactivée par défaut et n'est activée qu'avec `channels.msteams.dangerouslyAllowNameMatching: true`.
- L'assistant peut résoudre les noms en ID via Microsoft Graph lorsque les informations d'identification le permettent.

**Accès aux groupes**

- Par défaut : `channels.msteams.groupPolicy = "allowlist"` (bloqué sauf si vous ajoutez `groupAllowFrom`). Utilisez `channels.defaults.groupPolicy` pour remplacer la valeur par défaut lorsqu'elle n'est pas définie.
- `channels.msteams.groupAllowFrom` contrôle quels expéditeurs peuvent déclencher dans les discussions de groupe/canaux (revient à `channels.msteams.allowFrom`).
- Définissez `groupPolicy: "open"` pour autoriser n'importe quel membre (toujours filtré par mention par défaut).
- Pour n'autoriser **aucun canal**, définissez `channels.msteams.groupPolicy: "disabled"`.

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

- Délimitez les réponses de groupe/canal en listant les équipes et les canaux sous `channels.msteams.teams`.
- Les clés doivent utiliser des ID d'équipe stables et des ID de conversation de channel.
- Lorsque `groupPolicy="allowlist"` et une liste d'autorisation d'équipes sont présentes, seules les équipes/canaux répertoriés sont acceptés (mention‑gated).
- L'assistant de configuration accepte les entrées `Team/Channel` et les stocke pour vous.
- Au démarrage, OpenClaw résout les noms des listes d'autorisation d'équipe/canal et d'utilisateur en identifiants (lorsque les autorisations Graph le permettent)
  et consigne le mappage ; les noms d'équipe/canal non résolus sont conservés tels quels, mais ignorés pour le routage par défaut, sauf si `channels.msteams.dangerouslyAllowNameMatching: true` est activé.

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
6. Par défaut, la passerelle écoute le trafic du webhook Bot Framework sur `/api/messages`.

## Configuration du bot Azure (Prérequis)

Avant de configurer OpenClaw, vous devez créer une ressource Bot Azure.

### Étape 1 : Créer un bot Azure

1. Accéder à [Create Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
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
2. Copiez **ID d'application Microsoft** → il s'agit de votre `appId`
3. Cliquez sur **Gérer le mot de passe** → accédez à l'inscription de l'application
4. Sous **Certificats et secrets** → **Nouveau secret client** → copiez la **Valeur** → c'est votre `appPassword`
5. Allez dans **Vue d'ensemble** → copiez l'**ID de l'annuaire (locataire)** → c'est votre `tenantId`

### Étape 3 : Configurer le point de terminaison de messagerie

1. Dans Bot Azure → **Configuration**
2. Définissez le **Point de terminaison de messagerie** sur votre URL de webhook :
   - Production : `https://your-domain.com/api/messages`
   - Dév local : Utilisez un tunnel (voir [Local Development](#local-development-tunneling) ci-dessous)

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

Au lieu de créer manuellement un fichier ZIP de manifeste, vous pouvez utiliser le [Teams Developer Portal](https://dev.teams.microsoft.com/apps) :

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
   - Depuis un checkout local : `openclaw plugins install ./path/to/local/msteams-plugin`

2. **Enregistrement du bot**
   - Créez un Bot Azure (voir ci-dessus) et notez :
     - ID de l'application (App ID)
     - Secret client (Mot de passe de l'application)
     - ID de locataire (Tenant ID) (locataire unique)

3. **Manifeste de l'application Teams**
   - Incluez une entrée `bot` avec `botId = <App ID>`.
   - Portées : `personal`, `team`, `groupChat`.
   - `supportsFiles: true` (requis pour la gestion des fichiers de portée personnelle).
   - Ajoutez les autorisations RSC (ci-dessous).
   - Créez les icônes : `outline.png` (32x32) et `color.png` (192x192).
   - Compressez les trois fichiers ensemble : `manifest.json`, `outline.png`, `color.png`.

4. **Configurer OpenClaw**

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

   Vous pouvez également utiliser des variables d'environnement au lieu des clés de configuration :
   - `MSTEAMS_APP_ID`
   - `MSTEAMS_APP_PASSWORD`
   - `MSTEAMS_TENANT_ID`

5. **Point de terminaison du bot**
   - Définissez le point de terminaison de messagerie du bot Azure sur :
     - `https://<host>:3978/api/messages` (ou le chemin/port de votre choix).

6. **Exécuter la passerelle**
   - Le canal Teams démarre automatiquement lorsque le plugin est installé et qu'une configuration `msteams` existe avec des identifiants.

## Action Member info

OpenClaw expose une action `member-info` basée sur Graph pour Microsoft Teams afin que les agents et automatisations puissent résoudre les détails des membres du channel (nom d'affichage, e-mail, rôle) directement depuis Microsoft Graph.

Conditions requises :

- Autorisation RSC `Member.Read.Group` (déjà présente dans le manifeste recommandé)
- Pour les recherches inter-équipes : autorisation d'application Graph `User.Read.All` avec consentement administrateur

L'action est verrouillée par `channels.msteams.actions.memberInfo` (par défaut : activé lorsque les identifiants Graph sont disponibles).

## Contexte historique

- `channels.msteams.historyLimit` contrôle le nombre de messages récents de channel/groupe inclus dans le prompt.
- Revient à `messages.groupChat.historyLimit`. Définissez `0` pour désactiver (par défaut 50).
- L'historique des fils récupéré est filtré par les listes d'autorisation des expéditeurs (`allowFrom` / `groupAllowFrom`), de sorte que l'amorçage du contexte du fil inclut uniquement les messages des expéditeurs autorisés.
- L'historique DM peut être limité avec `channels.msteams.dmHistoryLimit` (tours utilisateur). Remplacements par utilisateur : `channels.msteams.dms["<user_id>"].historyLimit`.

## Autorisations RSC Teams actuelles (Manifeste)

Il s'agit des **autorisations resourceSpecific existantes** dans le manifeste de notre application Teams. Elles ne s'appliquent qu'à l'intérieur de l'équipe/discussion où l'application est installée.

**Pour les channels (portée d'équipe) :**

- `ChannelMessage.Read.Group` (Application) - recevoir tous les messages du channel sans @mention
- `ChannelMessage.Send.Group` (Application)
- `Member.Read.Group` (Application)
- `Owner.Read.Group` (Application)
- `ChannelSettings.Read.Group` (Application)
- `TeamMember.Read.Group` (Application)
- `TeamSettings.Read.Group` (Application)

**Pour les conversations de groupe :**

- `ChatMessage.Read.Chat` (Application) - recevoir tous les messages de conversation de groupe sans @mention

## Exemple de manifeste Teams (caviardé)

Exemple minimal et valide avec les champs requis. Remplacez les ID et les URL.

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
- `authorization.permissions.resourceSpecific` doit inclure la lecture/l'envoi de channel si vous voulez le trafic de channel.

### Mise à jour d'une application existante

Pour mettre à jour une application Teams déjà installée (par exemple, pour ajouter des autorisations RSC) :

1. Mettez à jour votre `manifest.json` avec les nouveaux paramètres
2. **Incrémentez le champ `version`** (par exemple, `1.0.0` → `1.1.0`)
3. **Recompressez** le manifeste avec les icônes (`manifest.json`, `outline.png`, `color.png`)
4. Téléchargez le nouveau fichier zip :
   - **Option A (Centre d'administration Teams) :** Centre d'administration Teams → Applications Teams → Gérer les applications → trouver votre application → Télécharger une nouvelle version
   - **Option B (Chargement latéral) :** Dans Teams → Applications → Gérer vos applications → Charger une application personnalisée
5. **Pour les canaux d'équipe :** Réinstallez l'application dans chaque équipe pour que les nouvelles autorisations prennent effet
6. **Quittez et relancez complètement Teams** (pas seulement fermer la fenêtre) pour effacer les métadonnées de l'application en cache

## Capacités : RSC uniquement vs Graph

### Avec **RSC Teams uniquement** (application installée, aucune autorisation API Graph)

Fonctionne :

- Lire le contenu **textuel** des messages de channel.
- Envoyer du contenu **textuel** de message de channel.
- Recevoir des pièces jointes de fichiers **personnels (DM)**.

Ne fonctionne PAS :

- **Contenu d'image ou de fichier** de channel/groupe (la charge utile n'inclut qu'un fragment HTML).
- Télécharger des pièces jointes stockées dans SharePoint/OneDrive.
- Lire l'historique des messages (au-delà de l'événement webhook en direct).

### Avec **Teams RSC + Microsoft Graph Application permissions**

Ajoute :

- Le téléchargement de contenus hébergés (images collées dans les messages).
- Le téléchargement de pièces jointes de fichiers stockées dans SharePoint/OneDrive.
- La lecture de l'historique des messages de canal/discussion via Graph.

### RSC vs Graph API

| Capacité                           | Autorisations RSC                     | Graph API                                                      |
| ---------------------------------- | ------------------------------------- | -------------------------------------------------------------- |
| **Messages en temps réel**         | Oui (via webhook)                     | Non (sondage uniquement)                                       |
| **Messages historiques**           | Non                                   | Oui (peut interroger l'historique)                             |
| **Complexité de la configuration** | Manifeste de l'application uniquement | Nécessite le consentement de l'administrateur + flux de jetons |
| **Fonctionne hors ligne**          | Non (doit être en cours d'exécution)  | Oui (interrogation à tout moment)                              |

**En résumé :** RSC est pour l'écoute en temps réel ; Graph API est pour l'accès historique. Pour rattraper les messages manqués pendant que vous étiez hors ligne, vous avez besoin de Graph API avec `ChannelMessage.Read.All` (nécessite le consentement de l'administrateur).

## Média + historique activés par Graph (requis pour les canaux)

Si vous avez besoin d'images/fichiers dans les **canaux** ou si vous souhaitez récupérer l'**historique des messages**, vous devez activer les autorisations Microsoft Graph et accorder le consentement de l'administrateur.

1. Dans Entra ID (Azure AD) **App Registration**, ajoutez les **autorisations d'application** Microsoft Graph :
   - `ChannelMessage.Read.All` (pièces jointes de canal + historique)
   - `Chat.Read.All` ou `ChatMessage.Read.All` (discussions de groupe)
2. **Accorder le consentement de l'administrateur** pour le locataire.
3. Augmentez la **version du manifeste** de l'application Teams, téléchargez-la à nouveau et **réinstallez l'application dans Teams**.
4. **Quittez entièrement et relancez Teams** pour effacer les métadonnées de l'application en cache.

**Autorisation supplémentaire pour les mentions d'utilisateur :** Les mentions @ des utilisateurs fonctionnent immédiatement pour les utilisateurs de la conversation. Cependant, si vous souhaitez rechercher dynamiquement et mentionner des utilisateurs qui ne sont **pas dans la conversation actuelle**, ajoutez l'autorisation `User.Read.All` (Application) et accordez le consentement de l'administrateur.

## Limitations connues

### Timeouts de webhook

Teams envoie les messages via un webhook HTTP. Si le traitement prend trop de temps (par exemple, des réponses LLM lentes), vous pouvez voir :

- Timeouts Gateway
- Teams réessayer d'envoyer le message (causant des doublons)
- Réponses abandonnées

OpenClaw gère cela en renvoyant rapidement et en envoyant des réponses de manière proactive, mais les réponses très lentes peuvent toujours poser problème.

### Formatage

Le markdown Teams est plus limité que Slack ou Discord :

- Le formatage de base fonctionne : **gras**, _italique_, `code`, liens
- Le markdown complexe (tableaux, listes imbriquées) peut ne pas s'afficher correctement
- Les cartes adaptatives sont prises en charge pour les sondages et les envois de cartes arbitraires (voir ci-dessous)

## Configuration

Paramètres clés (voir `/gateway/configuration` pour les modèles de canal partagé) :

- `channels.msteams.enabled` : activer/désactiver le canal.
- `channels.msteams.appId`, `channels.msteams.appPassword`, `channels.msteams.tenantId` : identifiants du bot.
- `channels.msteams.webhook.port` (par défaut `3978`)
- `channels.msteams.webhook.path` (par défaut `/api/messages`)
- `channels.msteams.dmPolicy` : `pairing | allowlist | open | disabled` (par défaut : appairage)
- `channels.msteams.allowFrom` : liste blanche de DM (ID d'objet AAD recommandés). L'assistant résout les noms en ID lors de la configuration lorsque l'accès Graph est disponible.
- `channels.msteams.dangerouslyAllowNameMatching` : interrupteur de secours pour réactiver la correspondance mutable UPN/nom d'affichage et le routage direct par nom d'équipe/canal.
- `channels.msteams.textChunkLimit` : taille du bloc de texte sortant.
- `channels.msteams.chunkMode` : `length` (par défaut) ou `newline` pour diviser sur les lignes vides (limites de paragraphe) avant le découpage par longueur.
- `channels.msteams.mediaAllowHosts` : liste blanche pour les hôtes de pièces jointes entrantes (par défaut, domaines Microsoft/Teams).
- `channels.msteams.mediaAuthAllowHosts` : liste blanche pour joindre les en-têtes Authorization lors des nouvelles tentatives de média (par défaut, hôtes Graph + Bot Framework).
- `channels.msteams.requireMention` : exiger @mention dans les canaux/groupes (vrai par défaut).
- `channels.msteams.replyStyle` : `thread | top-level` (voir [Style de réponse](#reply-style-threads-vs-posts)).
- `channels.msteams.teams.<teamId>.replyStyle` : remplacement par équipe.
- `channels.msteams.teams.<teamId>.requireMention` : remplacement par équipe.
- `channels.msteams.teams.<teamId>.tools` : remplacements de stratégie d'outil par équipe par défaut (`allow`/`deny`/`alsoAllow`) utilisés lorsqu'un remplacement de canal est manquant.
- `channels.msteams.teams.<teamId>.toolsBySender` : remplacements de stratégie d'outil par équipe et par expéditeur par défaut (caractère générique `"*"` pris en charge).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle` : remplacement par canal.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention` : substitution par channel.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools` : substitutions de stratégie de tool par channel (`allow`/`deny`/`alsoAllow`).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender` : substitutions de stratégie de tool par channel et par expéditeur (caractère générique `"*"` pris en charge).
- Les clés `toolsBySender` doivent utiliser des préfixes explicites :
  `id:`, `e164:`, `username:`, `name:` (les clés héritées sans préfixe mappent toujours uniquement vers `id:`).
- `channels.msteams.actions.memberInfo` : activer ou désactiver l'action d'informations sur les membres basée sur Graph (par défaut : activé lorsque les informations d'identification Graph sont disponibles).
- `channels.msteams.sharePointSiteId` : ID de site SharePoint pour les téléchargements de fichiers dans les conversations de groupe/canaux (voir [Sending files in group chats](#sending-files-in-group-chats)).

## Routage et Sessions

- Les clés de session suivent le format standard de l'agent (voir [/concepts/session](/en/concepts/session)) :
  - Les messages directs partagent la session principale (`agent:<agentId>:<mainKey>`).
  - Les messages de channel/groupe utilisent l'ID de conversation :
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## Style de réponse : Fils vs Messages

Teams a récemment introduit deux styles d'interface utilisateur de channel sur le même model de données sous-jacent :

| Style                        | Description                                                                        | `replyStyle` recommandé |
| ---------------------------- | ---------------------------------------------------------------------------------- | ----------------------- |
| **Messages** (classique)     | Les messages apparaissent sous forme de cartes avec des réponses en fil en dessous | `thread` (par défaut)   |
| **Fils** (semblable à Slack) | Les messages s'écoulent de manière linéaire, plus comme Slack                      | `top-level`             |

**Le problème :** L'API Teams n'expose pas le style d'interface utilisateur utilisé par un channel. Si vous utilisez le mauvais `replyStyle` :

- `thread` dans un channel de style Fils → les réponses apparaissent de manière maladroite et imbriquées
- `top-level` dans un channel de style Messages → les réponses apparaissent comme des messages de niveau supérieur séparés au lieu d'être dans le fil

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

## Pièces jointes et images

**Limitations actuelles :**

- **DMs :** Les images et les pièces jointes fonctionnent via les API de fichiers de bot Teams.
- **Canaux/groupes :** Les pièces jointes résident dans le stockage M365 (SharePoint/OneDrive). La charge utile du webhook n'inclut qu'un fragment HTML, et non les octets réels du fichier. **Les autorisations de l'API Graph sont requises** pour télécharger les pièces jointes des canaux.
- Pour les envois explicites priorisant le fichier, utilisez `action=upload-file` avec `media` / `filePath` / `path` ; l'option `message` devient le texte/commentaire accompagnant, et `filename` remplace le nom téléchargé.

Sans les autorisations Graph, les messages de canal contenant des images seront reçus en mode texte uniquement (le contenu de l'image n'est pas accessible pour le bot).
Par défaut, OpenClaw ne télécharge les médias qu'à partir des noms d'hôte Microsoft/Teams. Remplacez cela avec `channels.msteams.mediaAllowHosts` (utilisez `["*"]` pour autoriser n'importe quel hôte).
Les en-têtes d'autorisation ne sont attachés que pour les hôtes dans `channels.msteams.mediaAuthAllowHosts` (par défaut : hôtes Graph + Bot Framework). Gardez cette liste stricte (évitez les suffixes multi-locataires).

## Envoi de fichiers dans les conversations de groupe

Les bots peuvent envoyer des fichiers dans les DMs en utilisant le flux FileConsentCard (intégré). Cependant, **l'envoi de fichiers dans les conversations de groupe/canaux** nécessite une configuration supplémentaire :

| Contexte                           | Mode d'envoi des fichiers                              | Configuration requise                              |
| ---------------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| **DMs**                            | FileConsentCard → utilisateur accepte → bot télécharge | Fonctionne hors de la boîte                        |
| **Conversations de groupe/canaux** | Télécharger vers SharePoint → partager le lien         | Nécessite `sharePointSiteId` + autorisations Graph |
| **Images (tout contexte)**         | Codées en Base64 en ligne                              | Fonctionne hors de la boîte                        |

### Pourquoi les conversations de groupe ont besoin de SharePoint

Les bots n'ont pas de lecteur OneDrive personnel (le point de terminaison `/me/drive` de l'API Graph ne fonctionne pas pour les identités d'application). Pour envoyer des fichiers dans les conversations de groupe/canaux, le bot télécharge vers un **site SharePoint** et crée un lien de partage.

### Configuration

1. **Ajouter les autorisations de l'API Graph** dans Entra ID (Azure AD) → Inscription de l'application :
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

| Autorisation                            | Comportement de partage                                                                       |
| --------------------------------------- | --------------------------------------------------------------------------------------------- |
| `Sites.ReadWrite.All` uniquement        | Lien de partage à l'échelle de l'organisation (toute personne de l'organisation peut accéder) |
| `Sites.ReadWrite.All` + `Chat.Read.All` | Lien de partage par utilisateur (seuls les membres du chat peuvent accéder)                   |

Le partage par utilisateur est plus sécurisé car seuls les participants au chat peuvent accéder au fichier. Si l'autorisation `Chat.Read.All` est manquante, le bot revient au partage à l'échelle de l'organisation.

### Comportement de repli

| Scénario                                                | Résultat                                                                           |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Chat de groupe + fichier + `sharePointSiteId` configuré | Télécharger vers SharePoint, envoyer le lien de partage                            |
| Chat de groupe + fichier + aucun `sharePointSiteId`     | Tenter le téléchargement vers OneDrive (peut échouer), envoyer uniquement le texte |
| Chat personnel + fichier                                | Flux FileConsentCard (fonctionne sans SharePoint)                                  |
| N'importe quel contexte + image                         | Codé en Base64 en ligne (fonctionne sans SharePoint)                               |

### Emplacement de stockage des fichiers

Les fichiers téléchargés sont stockés dans un dossier `/OpenClawShared/` de la bibliothèque de documents par défaut du site SharePoint configuré.

## Sondages (Adaptive Cards)

OpenClaw envoie des sondages Teams sous forme de cartes adaptatives (il n'y a pas d'API de sondage Teams native).

- CLI : `openclaw message poll --channel msteams --target conversation:<id> ...`
- Les votes sont enregistrés par la passerelle dans `~/.openclaw/msteams-polls.json`.
- La passerelle doit rester en ligne pour enregistrer les votes.
- Les sondages ne publient pas encore automatiquement de résumés de résultats (inspectez le fichier de stockage si nécessaire).

## Cartes adaptatives (arbitraires)

Envoyez n'importe quel JSON de carte adaptative aux utilisateurs ou conversations Teams à l'aide de l'outil `message` ou de la CLI.

Le paramètre `card` accepte un objet JSON de carte adaptative. Lorsque `card` est fourni, le texte du message est facultatif.

**Outil d'agent :**

```json5
{
  action: "send",
  channel: "msteams",
  target: "user:<id>",
  card: {
    type: "AdaptiveCard",
    version: "1.5",
    body: [{ type: "TextBlock", text: "Hello!" }],
  },
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
| Utilisateur (par nom) | `user:<display-name>`            | `user:John Smith` (nécessite l'API Graph API)         |
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

# Send an Adaptive Card to a conversation
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello"}]}'
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
  card: {
    type: "AdaptiveCard",
    version: "1.5",
    body: [{ type: "TextBlock", text: "Hello" }],
  },
}
```

Remarque : Sans le préfixe `user:`, les noms sont résolus par défaut vers le groupe/l'équipe. Utilisez toujours `user:` lorsque vous ciblez des personnes par leur nom d'affichage.

## Messagerie proactive

- Les messages proactifs ne sont possibles qu'**après** qu'un utilisateur a interagi, car nous stockons les références de conversation à ce moment-là.
- Voir `/gateway/configuration` pour `dmPolicy` et le contrôle de la liste d'autorisation.

## ID d'équipe et de canal (piège courant)

Le paramètre de requête `groupId` dans les URL Teams n'**EST PAS** l'ID d'équipe utilisé pour la configuration. Extrayez plutôt les ID du chemin d'URL :

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

- ID d'équipe = segment de chemin après `/team/` (URL décodé, par exemple `19:Bk4j...@thread.tacv2`)
- ID de canal = segment de chemin après `/channel/` (URL décodé)
- **Ignorer** le paramètre de requête `groupId`

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

1. Utilisez des canaux standard pour les interactions avec le bot
2. Utilisez les DMs - les utilisateurs peuvent toujours envoyer un message directement au bot
3. Utilisez le Graph API pour l'accès historique (nécessite `ChannelMessage.Read.All`)

## Dépannage

### Problèmes courants

- **Images ne s'affichant pas dans les canaux :** autorisations Graph ou consentement administrateur manquant. Réinstallez l'application Teams et quittez/rouvrez entièrement Teams.
- **Aucune réponse dans le canal :** les mentions sont requises par défaut ; définissez `channels.msteams.requireMention=false` ou configurez par équipe/canal.
- **Incompatibilité de version (Teams affiche toujours l'ancien manifeste) :** supprimez et rajoutez l'application et quittez entièrement Teams pour actualiser.
- **401 Unauthorized depuis le webhook :** Attendu lors de tests manuels sans JWT Azure - cela signifie que le point de terminaison est accessible mais que l'authentification a échoué. Utilisez Azure Web Chat pour tester correctement.

### Erreurs de téléchargement du manifeste

- **"Icon file cannot be empty"** : Le fichier manifeste référence des fichiers d'icônes de 0 octets. Créez des icônes PNG valides (32x32 pour `outline.png`, 192x192 pour `color.png`).
- **"webApplicationInfo.Id already in use"** : L'application est toujours installée dans une autre équipe/conversation. Trouvez-la et désinstallez-la d'abord, ou attendez 5 à 10 minutes pour la propagation.
- **"Something went wrong" lors du téléchargement** : Téléchargez via [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) à la place, ouvrez les outils de développement du navigateur (F12) → onglet Réseau, et vérifiez le corps de la réponse pour l'erreur réelle.
- **Échec du chargement latéral** : Essayez "Télécharger une application dans le catalogue d'applications de votre organisation" au lieu de "Télécharger une application personnalisée" - cela contourne souvent les restrictions de chargement latéral.

### Autorisations RSC non fonctionnelles

1. Vérifiez que `webApplicationInfo.id` correspond exactement à l'ID de l'application de votre bot
2. Téléchargez à nouveau l'application et réinstallez-la dans l'équipe/la conversation
3. Vérifiez si votre administrateur d'organisation a bloqué les autorisations RSC
4. Confirmez que vous utilisez la bonne portée : `ChannelMessage.Read.Group` pour les équipes, `ChatMessage.Read.Chat` pour les discussions de groupe

## Références

- [Créer un bot Azure](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Guide de configuration du bot Azure
- [Portail des développeurs Teams](https://dev.teams.microsoft.com/apps) - créer/gérer les applications Teams
- [Schéma du manifeste d'application Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Recevoir les messages de canal avec RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [Référence des autorisations RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Gestion des fichiers par le bot Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (canal/groupe nécessite Graph)
- [Messagerie proactive](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)

## Connexes

- [Vue d'ensemble des canaux](/en/channels) — tous les canaux pris en charge
- [Appariement](/en/channels/pairing) — authentification DM et flux d'appariement
- [Groupes](/en/channels/groups) — comportement de la discussion de groupe et filtrage des mentions
- [Routage de canal](/en/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/en/gateway/security) — modèle d'accès et durcissement
