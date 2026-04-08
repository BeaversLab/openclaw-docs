---
summary: "État du support, capacités et configuration du bot Microsoft Teams"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft Teams"
---

# Microsoft Teams

> "Abandon all hope, ye who enter here."

Updated: 2026-01-21

Statut : le texte + les pièces jointes DM sont pris en charge ; l'envoi de fichiers dans les canaux/groupes nécessite `sharePointSiteId` + des autorisations Graph (voir [Sending files in group chats](#sending-files-in-group-chats)). Les sondages sont envoyés via Adaptive Cards. Les actions de message exposent un `upload-file` explicite pour les envois avec priorité aux fichiers.

## Plugin groupé

Microsoft Teams est fourni en tant que plugin groupé dans les versions actuelles de OpenClaw, donc aucune
installation séparée n'est requise dans la version empaquetée normale.

Si vous êtes sur une ancienne version ou une installation personnalisée qui exclut Teams groupé,
installez-le manuellement :

```bash
openclaw plugins install @openclaw/msteams
```

Extraction locale (lors de l'exécution depuis un dépôt git) :

```bash
openclaw plugins install ./path/to/local/msteams-plugin
```

Détails : [Plugins](/en/tools/plugin)

## Configuration rapide (débutant)

1. Assurez-vous que le plugin Microsoft Teams est disponible.
   - Les versions empaquetées actuelles de OpenClaw l'incluent déjà.
   - Les installations anciennes/personnalisées peuvent l'ajouter manuellement avec les commandes ci-dessus.
2. Créez un **Azure Bot** (ID d'application + secret client + ID de locataire).
3. Configurez OpenClaw avec ces informations d'identification.
4. Exposez `/api/messages` (port 3978 par défaut) via une URL publique ou un tunnel.
5. Installez le package d'application Teams et démarrez la passerelle.

Configuration minimale :

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

Remarque : les discussions de groupe sont bloquées par défaut (`channels.msteams.groupPolicy: "allowlist"`). Pour autoriser les réponses de groupe, définissez `channels.msteams.groupAllowFrom` (ou utilisez `groupPolicy: "open"` pour autoriser n'importe quel membre, limité aux mentions).

## Objectifs

- Parlez à OpenClaw via les DMs Teams, les discussions de groupe ou les canaux.
- Gardez le routage déterministe : les réponses reviennent toujours au canal d'où elles proviennent.
- Comportement de canal sécurisé par défaut (mentions requises sauf configuration contraire).

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
- `channels.msteams.allowFrom` doit utiliser des ID d'objet AAD stables.
- Les UPNs/noms d'affichage sont modifiables ; la correspondance directe est désactivée par défaut et activée uniquement avec `channels.msteams.dangerouslyAllowNameMatching: true`.
- L'assistant peut résoudre les noms en ID via Microsoft Graph lorsque les informations d'identification le permettent.

**Accès groupe**

- Par défaut : `channels.msteams.groupPolicy = "allowlist"` (bloqué sauf si vous ajoutez `groupAllowFrom`). Utilisez `channels.defaults.groupPolicy` pour remplacer la valeur par défaut lorsqu'elle n'est pas définie.
- `channels.msteams.groupAllowFrom` contrôle quels expéditeurs peuvent déclencher dans les conversations de groupe/canaux (revient à `channels.msteams.allowFrom`).
- Définissez `groupPolicy: "open"` pour autoriser n'importe quel membre (toujours limité aux mentions par défaut).
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

**Teams + liste d'autorisation de canaux**

- Délimitez les réponses de groupe/canal en listant les équipes et les canaux sous `channels.msteams.teams`.
- Les clés doivent utiliser les IDs d'équipe stables et les IDs de conversation des canaux.
- Lorsque `groupPolicy="allowlist"` et une liste d'autorisation d'équipes sont présentes, seules les équipes/canaux listés sont acceptés (limité aux mentions).
- L'assistant de configuration accepte les entrées `Team/Channel` et les stocke pour vous.
- Au démarrage, OpenClaw résout les noms des listes d'autorisation d'équipe/canal et d'utilisateur en IDs (lorsque les autorisations Graph le permettent)
  et consigne le mappage ; les noms d'équipe/canal non résolus sont conservés tels quels mais ignorés pour le routage par défaut, sauf si `channels.msteams.dangerouslyAllowNameMatching: true` est activé.

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

1. Assurez-vous que le plugin Microsoft Teams est disponible.
   - Les versions OpenClaw empaquetées actuelles l'incluent déjà.
   - Les installations plus anciennes/personnalisées peuvent l'ajouter manuellement avec les commandes ci-dessus.
2. Créez un **Azure Bot** (ID d'application + secret + ID de locataire).
3. Créez un **package d'application Teams** qui fait référence au bot et inclut les autorisations RSC ci-dessous.
4. Téléchargez/installez l'application Teams dans une équipe (ou l'étendue personnelle pour les DMs).
5. Configurez `msteams` dans `~/.openclaw/openclaw.json` (ou env vars) et démarrez la passerelle.
6. Par défaut, la passerelle écoute le trafic webhook Bot Framework sur `/api/messages`.

## Configuration de l'Azure Bot (Prérequis)

Avant de configurer OpenClaw, vous devez créer une ressource Azure Bot.

### Étape 1 : Créer un Azure Bot

1. Accédez à [Create Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. Remplissez l'onglet **Basics** :

   | Champ                    | Valeur                                                               |
   | ------------------------ | -------------------------------------------------------------------- |
   | **Bot handle**           | Votre nom de bot, par exemple, `openclaw-msteams` (doit être unique) |
   | **Abonnement**           | Sélectionnez votre abonnement Azure                                  |
   | **Groupe de ressources** | Créer un nouveau ou utiliser un existant                             |
   | **Niveau tarifaire**     | **Gratuit** pour le développement/tests                              |
   | **Type d'application**   | **Single Tenant** (recommandé - voir la note ci-dessous)             |
   | **Type de création**     | **Créer un nouvel ID d'application Microsoft**                       |

> **Avis de dépréciation :** La création de nouveaux bots multi-locataires a été dépréciée après le 2025-07-31. Utilisez **Single Tenant** pour les nouveaux bots.

3. Cliquez sur **Review + create** → **Create** (attendre ~1-2 minutes)

### Étape 2 : Obtenir les informations d'identification

1. Accédez à votre ressource Azure Bot → **Configuration**
2. Copiez **Microsoft App ID** → c'est votre `appId`
3. Cliquez sur **Manage Password** → accédez à l'inscription de l'application
4. Sous **Certificates & secrets** → **New client secret** → copiez la **Value** → c'est votre `appPassword`
5. Accédez à **Overview** → copiez **Directory (tenant) ID** → c'est votre `tenantId`

### Étape 3 : Configurer le point de terminaison de messagerie

1. Dans Azure Bot → **Configuration**
2. Définissez **Messaging endpoint** sur l'URL de votre webhook :
   - Production : `https://your-domain.com/api/messages`
   - Dév local : Utilisez un tunnel (voir [Local Development](#local-development-tunneling) ci-dessous)

### Étape 4 : Activer le canal Teams

1. Dans Azure Bot → **Channels**
2. Cliquez sur **Microsoft Teams** → Configure → Save
3. Acceptez les conditions d'utilisation

## Développement local (Tunneling)

Teams ne peut pas atteindre `localhost`. Utilisez un tunnel pour le développement local :

**Option A : ngrok**

```bash
ngrok http 3978
# Copy the https URL, e.g., https://abc123.ngrok.io
# Set messaging endpoint to: https://abc123.ngrok.io/api/messages
```

**Option B : Tailscale Funnel**

```bash
tailscale funnel 3978
# Use your Tailscale funnel URL as the messaging endpoint
```

## Portail des développeurs Teams (Alternative)

Au lieu de créer manuellement un fichier ZIP de manifeste, vous pouvez utiliser le [Teams Developer Portal](https://dev.teams.microsoft.com/apps) :

1. Cliquez sur **+ New app**
2. Remplissez les informations de base (nom, description, informations sur le développeur)
3. Accédez à **App features** → **Bot**
4. Sélectionnez **Enter a bot ID manually** et collez votre ID d'application Azure Bot
5. Cochez les étendues : **Personal**, **Team**, **Group Chat**
6. Cliquez sur **Distribute** → **Download app package**
7. Dans Teams : **Apps** → **Manage your apps** → **Upload a custom app** → sélectionnez le fichier ZIP

C'est souvent plus facile que de modifier manuellement les manifestes JSON.

## Tester le bot

**Option A : Azure Web Chat (vérifiez d'abord le webhook)**

1. Dans le portail Azure → votre ressource Azure Bot → **Test in Web Chat**
2. Envoyez un message - vous devriez voir une réponse
3. Cela confirme que votre point de terminaison webhook fonctionne avant la configuration de Teams

**Option B : Teams (après l'installation de l'application)**

1. Installez l'application Teams (chargement latéral ou catalogue de l'organisation)
2. Trouvez le bot dans Teams et envoyez-lui un DM
3. Vérifiez les journaux de la passerelle pour les activités entrantes

## Configuration (texte minimal uniquement)

1. **Assurez-vous que le plug-in Microsoft Teams est disponible**
   - Les versions packagées actuelles de OpenClaw l'incluent déjà.
   - Les installations plus anciennes ou personnalisées peuvent l'ajouter manuellement :
     - Depuis npm : `openclaw plugins install @openclaw/msteams`
     - Depuis une extraction locale : `openclaw plugins install ./path/to/local/msteams-plugin`

2. **Inscription du bot**
   - Créez un Azure Bot (voir ci-dessus) et notez :
     - ID d'application
     - Secret client (mot de passe de l'application)
     - ID de locataire (single-tenant)

3. **Manifeste de l'application Teams**
   - Incluez une entrée `bot` avec `botId = <App ID>`.
   - Étendues (Scopes) : `personal`, `team`, `groupChat`.
   - `supportsFiles: true` (requis pour la gestion des fichiers de l'étendue personnelle).
   - Ajoutez les autorisations RSC (ci-dessous).
   - Créez des icônes : `outline.png` (32x32) et `color.png` (192x192).
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
   - Définissez le point de terminaison de messagerie du Bot Azure sur :
     - `https://<host>:3978/api/messages` (ou votre chemin/port choisi).

6. **Exécuter la passerelle**
   - Le canal Teams démarre automatiquement lorsque le plug-in fourni ou installé manuellement est disponible et que la configuration `msteams` existe avec les identifiants.

## Action d'informations sur les membres

OpenClaw expose une action `member-info` basée sur Graph pour Microsoft Teams afin que les agents et automatisations puissent résoudre les détails des membres du canal (nom d'affichage, e-mail, rôle) directement depuis Microsoft Graph.

Conditions requises :

- Autorisation RSC `Member.Read.Group` (déjà présente dans le manifeste recommandé)
- Pour les recherches inter-équipes : autorisation d'application Graph `User.Read.All` avec le consentement de l'administrateur

L'action est contrôlée par `channels.msteams.actions.memberInfo` (par défaut : activée lorsque les identifiants Graph sont disponibles).

## Contexte de l'historique

- `channels.msteams.historyLimit` contrôle le nombre de messages récents du canal/groupe inclus dans l'invite.
- Reviens à `messages.groupChat.historyLimit`. Définissez `0` pour désactiver (par défaut 50).
- L'historique des fils de discussion récupéré est filtré par les listes d'autorisation des expéditeurs (`allowFrom` / `groupAllowFrom`), de sorte que l'amorçage du contexte du fil de discussion n'inclut que les messages des expéditeurs autorisés.
- Le contexte de la pièce jointe citée (`ReplyTo*` dérivé du HTML de réponse Teams) est actuellement transmis tel quel.
- En d'autres termes, les listes d'autorisation contrôlent qui peut déclencher l'agent ; seuls certains chemins de contexte supplémentaires sont filtrés aujourd'hui.
- L'historique des DM peut être limité avec `channels.msteams.dmHistoryLimit` (tours utilisateur). Remplacements par utilisateur : `channels.msteams.dms["<user_id>"].historyLimit`.

## Autorisations RSC Teams actuelles (Manifeste)

Ce sont les **autorisations resourceSpecific existantes** dans le manifeste de notre application Teams. Elles ne s'appliquent qu'à l'intérieur de l'équipe/de la conversation où l'application est installée.

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

## Exemple de manifeste Teams (expurgé)

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
- `bots[].supportsFiles: true` est requis pour la gestion des fichiers dans la portée personnelle.
- `authorization.permissions.resourceSpecific` doit inclure la lecture/l'envoi sur le canal si vous voulez le trafic du canal.

### Mise à jour d'une application existante

Pour mettre à jour une application Teams déjà installée (par exemple, pour ajouter des autorisations RSC) :

1. Mettez à jour votre `manifest.json` avec les nouveaux paramètres
2. **Incrémentez le champ `version`** (par exemple, `1.0.0` → `1.1.0`)
3. **Re-zip** le manifeste avec les icônes (`manifest.json`, `outline.png`, `color.png`)
4. Téléchargez le nouveau fichier zip :
   - **Option A (Centre d'administration Teams) :** Centre d'administration Teams → Applications Teams → Gérer les applications → trouver votre application → Télécharger une nouvelle version
   - **Option B (Chargement latéral) :** Dans Teams → Applications → Gérer vos applications → Télécharger une application personnalisée
5. **Pour les canaux d'équipe :** Réinstallez l'application dans chaque équipe pour que les nouvelles autorisations prennent effet
6. **Quittez entièrement et relancez Teams** (et ne fermez pas simplement la fenêtre) pour effacer les métadonnées de l'application en cache

## Capacités : RSC uniquement vs Graph

### Avec **RSC Teams uniquement** (application installée, aucune autorisation API Graph)

Fonctionne :

- Lire le **texte** du message du canal.
- Envoyer le **texte** du message du canal.
- Recevoir des pièces jointes de fichiers **personnels (DM)**.

Ne fonctionne PAS :

- **Image ou contenu de fichier** de canal/groupe (la charge utile ne comprend qu'un talon HTML).
- Téléchargement des pièces jointes stockées dans SharePoint/OneDrive.
- Lecture de l'historique des messages (au-delà de l'événement webhook en direct).

### Avec **RSC Teams + Autorisations d'application Microsoft Graph**

Ajoute :

- Téléchargement des contenus hébergés (images collées dans les messages).
- Téléchargement des pièces jointes de fichiers stockées dans SharePoint/OneDrive.
- Lecture de l'historique des messages de canal/discussion via Graph.

### RSC vs API Graph

| Capacité                           | Autorisations RSC                     | API Graph                                                     |
| ---------------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| **Messages en temps réel**         | Oui (via webhook)                     | Non (sondage uniquement)                                      |
| **Messages historiques**           | Non                                   | Oui (peut interroger l'historique)                            |
| **Complexité de la configuration** | Manifeste de l'application uniquement | Nécessite le consentement de l'administrateur + flux de jeton |
| **Fonctionne hors ligne**          | Non (doit être en cours d'exécution)  | Oui (interrogation à tout moment)                             |

**En résumé :** Le RSC sert à l'écoute en temps réel ; le API Graph est pour l'accès historique. Pour récupérer les messages manqués pendant que vous étiez hors ligne, vous avez besoin du API Graph avec `ChannelMessage.Read.All` (nécessite le consentement de l'administrateur).

## Média + historique activés par Graph (requis pour les canaux)

Si vous avez besoin d'images/fichiers dans les **canaux** ou si vous souhaitez récupérer l'**historique des messages**, vous devez activer les autorisations Microsoft Graph et accorder le consentement de l'administrateur.

1. Dans l'**Inscription d'application** Entra ID (Azure AD), ajoutez des **autorisations d'application** Microsoft Graph :
   - `ChannelMessage.Read.All` (pièces jointes de canal + historique)
   - `Chat.Read.All` ou `ChatMessage.Read.All` (discussions de groupe)
2. **Accorder le consentement de l'administrateur** pour le client.
3. Augmentez la **version du manifeste** de l'application Teams, téléchargez-la à nouveau et **réinstallez l'application dans Teams**.
4. **Quittez et relancez entièrement Teams** pour effacer les métadonnées de l'application en cache.

**Autorisation supplémentaire pour les mentions d'utilisateurs :** Les mentions @ d'utilisateurs fonctionnent immédiatement pour les utilisateurs de la conversation. Cependant, si vous souhaitez rechercher et mentionner dynamiquement des utilisateurs qui ne sont **pas dans la conversation actuelle**, ajoutez l'autorisation `User.Read.All` (Application) et accordez le consentement de l'administrateur.

## Limitations connues

### Délais d'expiration des webhooks

Teams envoie des messages via un webhook HTTP. Si le traitement prend trop de temps (par exemple, réponses lentes du LLM), vous risquez de voir :

- Délais d'expiration du Gateway
- Teams réessayant d'envoyer le message (provoquant des doublons)
- Réponses manquantes

OpenClaw gère cela en renvoyant rapidement et en envoyant des réponses de manière proactive, mais les réponses très lentes peuvent toujours poser problème.

### Mise en forme

Le markdown Teams est plus limité que celui de Slack ou Discord :

- La mise en forme de base fonctionne : **gras**, _italique_, `code`, liens
- Le markdown complexe (tableaux, listes imbriquées) peut ne pas s'afficher correctement
- Les cartes adaptatives (Adaptive Cards) sont prises en charge pour les sondages et l'envoi de cartes arbitraires (voir ci-dessous)

## Configuration

Paramètres clés (voir `/gateway/configuration` pour les modèles de canaux partagés) :

- `channels.msteams.enabled` : activer/désactiver le canal.
- `channels.msteams.appId`, `channels.msteams.appPassword`, `channels.msteams.tenantId` : identifiants du bot.
- `channels.msteams.webhook.port` (par défaut `3978`)
- `channels.msteams.webhook.path` (par défaut `/api/messages`)
- `channels.msteams.dmPolicy` : `pairing | allowlist | open | disabled` (par défaut : appariement)
- `channels.msteams.allowFrom` : liste autorisée DM (ID d'objet AAD recommandés). L'assistant résout les noms en ID lors de la configuration lorsque l'accès Graph est disponible.
- `channels.msteams.dangerouslyAllowNameMatching` : interrupteur de secours pour réactiver la correspondance UPN/nom d'affichage modifiable et le routage direct par nom d'équipe/canal.
- `channels.msteams.textChunkLimit` : taille des blocs de texte sortants.
- `channels.msteams.chunkMode` : `length` (par défaut) ou `newline` pour diviser sur les lignes vides (limites de paragraphe) avant le découpage par longueur.
- `channels.msteams.mediaAllowHosts` : liste verte pour les hôtes de pièces jointes entrantes (par défaut, domaines Microsoft/Teams).
- `channels.msteams.mediaAuthAllowHosts` : liste verte pour l'ajout d'en-têtes d'autorisation lors des nouvelles tentatives de média (par défaut, hôtes Graph + Bot Framework).
- `channels.msteams.requireMention` : exiger une @mention dans les canaux/groupes (vrai par défaut).
- `channels.msteams.replyStyle` : `thread | top-level` (voir [Reply Style](#reply-style-threads-vs-posts)).
- `channels.msteams.teams.<teamId>.replyStyle` : remplacement par équipe.
- `channels.msteams.teams.<teamId>.requireMention` : remplacement par équipe.
- `channels.msteams.teams.<teamId>.tools` : remplacements par défaut de la stratégie d'outil par équipe (`allow`/`deny`/`alsoAllow`) utilisés lorsqu'il manque un remplacement de canal.
- `channels.msteams.teams.<teamId>.toolsBySender` : remplacements par défaut de la stratégie d'outil par équipe et par expéditeur (le caractère générique `"*"` est pris en charge).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle` : remplacement par canal.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention` : remplacement par canal.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools` : remplacements de la stratégie d'outil par canal (`allow`/`deny`/`alsoAllow`).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender` : remplacements de la stratégie d'outil par canal et par expéditeur (le caractère générique `"*"` est pris en charge).
- Les clés `toolsBySender` doivent utiliser des préfixes explicites :
  `id:`, `e164:`, `username:`, `name:` (les clés héritées sans préfixe mappent toujours uniquement vers `id:`).
- `channels.msteams.actions.memberInfo` : activer ou désactiver l'action de membre info soutenue par Graph (par défaut : activé lorsque les informations d'identification Graph sont disponibles).
- `channels.msteams.sharePointSiteId` : ID du site SharePoint pour les téléchargements de fichiers dans les conversations de groupe/canaux (voir [Sending files in group chats](#sending-files-in-group-chats)).

## Routage et sessions

- Les clés de session suivent le format standard de l'agent (voir [/concepts/session](/en/concepts/session)) :
  - Les messages directs partagent la session principale (`agent:<agentId>:<mainKey>`).
  - Les messages de canal/groupe utilisent l'id de conversation :
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## Style de réponse : fils de discussion vs publications

Teams a récemment introduit deux styles d'interface utilisateur de canal sur le même modèle de données sous-jacent :

| Style                                | Description                                                                                      | `replyStyle` recommandé |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ | ----------------------- |
| **Publications** (classique)         | Les messages apparaissent sous forme de cartes avec des réponses en fil de discussion en dessous | `thread` (par défaut)   |
| **Fils de discussion** (style Slack) | Les messages s'affichent de manière linéaire, plus comme Slack                                   | `top-level`             |

**Le problème :** L'API de Teams n'expose pas le style d'interface utilisateur utilisé par un canal. Si vous utilisez le mauvais `replyStyle` :

- `thread` dans un canal style Fils de discussion → les réponses apparaissent imbriquées de manière maladroite
- `top-level` dans un canal style Publications → les réponses apparaissent comme des publications de niveau supérieur distinctes au lieu d'être dans le fil

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

## Pièces jointes et images

**Limitations actuelles :**

- **DMs :** Les images et les pièces jointes fonctionnent via les API de fichiers de bot Teams.
- **Canaux/groupes :** Les pièces jointes sont stockées dans le stockage M365 (SharePoint/OneDrive). La charge utile du webhook inclut uniquement un fragment HTML, et non les octets réels du fichier. **Les autorisations de l'API Graph sont requises** pour télécharger les pièces jointes du canal.
- Pour les envois explicites fichier en premier, utilisez `action=upload-file` avec `media` / `filePath` / `path` ; le `message` facultatif devient le texte/commentaire accompagnant, et `filename` remplace le nom téléchargé.

Sans les autorisations Graph, les messages de canal contenant des images seront reçus en texte uniquement (le contenu de l'image n'est pas accessible pour le bot).
Par défaut, OpenClaw ne télécharge les médias que depuis les noms d'hôte Microsoft/Teams. Remplacez avec `channels.msteams.mediaAllowHosts` (utilisez `["*"]` pour autoriser n'importe quel hôte).
Les en-têtes d'autorisation ne sont attachés que pour les hôtes dans `channels.msteams.mediaAuthAllowHosts` (par défaut hôtes Graph + Bot Framework). Gardez cette liste stricte (évitez les suffixes multi-locataires).

## Envoi de fichiers dans les conversations de groupe

Les bots peuvent envoyer des fichiers dans les DMs en utilisant le flux FileConsentCard (intégré). Cependant, **l'envoi de fichiers dans les conversations de groupe/canaux** nécessite une configuration supplémentaire :

| Contexte                           | Comment les fichiers sont envoyés                           | Configuration nécessaire                           |
| ---------------------------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| **DMs**                            | FileConsentCard → l'utilisateur accepte → le bot télécharge | Fonctionne hors de la boîte                        |
| **Conversations de groupe/canaux** | Télécharger vers SharePoint → partager le lien              | Nécessite `sharePointSiteId` + autorisations Graph |
| **Images (tout contexte)**         | Codé en Base64 en ligne                                     | Fonctionne hors de la boîte                        |

### Pourquoi les conversations de groupe ont besoin de SharePoint

Les bots n'ont pas de lecteur OneDrive personnel (le point de terminaison `/me/drive` de l'API Graph ne fonctionne pas pour les identités d'application). Pour envoyer des fichiers dans les conversations de groupe/canaux, le bot télécharge sur un **site SharePoint** et crée un lien de partage.

### Configuration

1. **Ajoutez les autorisations de l'API Graph** dans Entra ID (Azure AD) → Inscription de l'application :
   - `Sites.ReadWrite.All` (Application) - télécharger des fichiers vers SharePoint
   - `Chat.Read.All` (Application) - optionnel, active les liens de partage par utilisateur

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

| Autorisation                            | Comportement de partage                                                                       |
| --------------------------------------- | --------------------------------------------------------------------------------------------- |
| `Sites.ReadWrite.All` uniquement        | Lien de partage à l'échelle de l'organisation (toute personne de l'organisation peut accéder) |
| `Sites.ReadWrite.All` + `Chat.Read.All` | Lien de partage par utilisateur (seuls les membres de la conversation peuvent accéder)        |

Le partage par utilisateur est plus sécurisé car seuls les participants à la conversation peuvent accéder au fichier. Si l'autorisation `Chat.Read.All` est manquante, le bot revient au partage à l'échelle de l'organisation.

### Comportement de repli

| Scénario                                                        | Résultat                                                                           |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Conversation de groupe + fichier + `sharePointSiteId` configuré | Télécharger vers SharePoint, envoyer le lien de partage                            |
| Conversation de groupe + fichier + aucun `sharePointSiteId`     | Tenter le téléchargement vers OneDrive (peut échouer), envoyer uniquement du texte |
| Conversation personnelle + fichier                              | Flux FileConsentCard (fonctionne sans SharePoint)                                  |
| Tout contexte + image                                           | Codé en Base64 en ligne (fonctionne sans SharePoint)                               |

### Emplacement de stockage des fichiers

Les fichiers téléchargés sont stockés dans un dossier `/OpenClawShared/` de la bibliothèque de documents par défaut du site SharePoint configuré.

## Sondages (Cartes adaptatives)

OpenClaw envoie les sondages Teams sous forme de Cartes adaptatives (il n'y a pas d'API de sondage Teams native).

- CLI : `openclaw message poll --channel msteams --target conversation:<id> ...`
- Les votes sont enregistrés par la passerelle dans `~/.openclaw/msteams-polls.json`.
- La passerelle doit rester en ligne pour enregistrer les votes.
- Les sondages ne publient pas encore automatiquement de résumés des résultats (inspectez le fichier de stockage si nécessaire).

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

Consultez la [documentation sur les cartes adaptatives](https://adaptivecards.io/) pour le schéma et les exemples de cartes. Pour plus de détails sur les formats cibles, consultez [Formats cibles](#target-formats) ci-dessous.

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

Remarque : Sans le préfixe `user:`, les noms résolvent par défaut vers des groupes/équipes. Utilisez toujours `user:` lorsque vous ciblez des personnes par leur nom d'affichage.

## Messagerie proactive

- Les messages proactifs ne sont possibles qu'**après** qu'un utilisateur a interagi, car nous stockons les références de conversation à ce moment-là.
- Consultez `/gateway/configuration` pour `dmPolicy` et le filtrage par liste d'autorisation.

## ID d'équipe et de canal (piège courant)

Le paramètre de requête `groupId` dans les URL Teams n'**EST PAS** l'ID d'équipe utilisé pour la configuration. Extrayez plutôt les ID du chemin de l'URL :

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
- **Ignorez** le paramètre de requête `groupId`

## Canaux privés

Les bots ont une prise en charge limitée dans les canaux privés :

| Fonctionnalité                   | Canaux standard | Canaux privés                  |
| -------------------------------- | --------------- | ------------------------------ |
| Installation du bot              | Oui             | Limité                         |
| Messages en temps réel (webhook) | Oui             | Peut ne pas fonctionner        |
| Autorisations RSC                | Oui             | Peut se comporter différemment |
| @mentions                        | Oui             | Si le bot est accessible       |
| Historique de l'API Graph        | Oui             | Oui (avec autorisations)       |

**Solutions de contournement si les canaux privés ne fonctionnent pas :**

1. Utilisez des canaux standard pour les interactions avec le bot
2. Utilisez les MDs - les utilisateurs peuvent toujours envoyer un message directement au bot
3. Utilisez l'API Graph pour l'accès historique (nécessite `ChannelMessage.Read.All`)

## Dépannage

### Problèmes courants

- **Images ne s'affichant pas dans les canaux :** Autorisations Graph ou consentement administratif manquant. Réinstallez l'application Teams et quittez/rouvrez entièrement Teams.
- **Pas de réponse dans le canal :** les mentions sont requises par défaut ; définissez `channels.msteams.requireMention=false` ou configurez par équipe/canal.
- **Inadéquation de version (Teams affiche toujours l'ancien manifeste) :** supprimez et ajoutez à nouveau l'application et quittez entièrement Teams pour actualiser.
- **401 Unauthorized depuis le webhook :** Attendu lors des tests manuels sans JWT Azure - cela signifie que le point de terminaison est accessible mais que l'authentification a échoué. Utilisez Azure Web Chat pour tester correctement.

### Erreurs de téléchargement de manifeste

- **"Le fichier d'icône ne peut pas être vide" :** Le manifeste fait référence à des fichiers d'icônes de 0 octet. Créez des icônes PNG valides (32x32 pour `outline.png`, 192x192 pour `color.png`).
- **"webApplicationInfo.Id déjà utilisé" :** L'application est toujours installée dans une autre équipe/conversation. Trouvez-la et désinstallez-la d'abord, ou attendez 5 à 10 minutes pour la propagation.
- **"Une erreur s'est produite" lors du téléchargement :** Téléchargez via [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) à la place, ouvrez les outils de développement du navigateur (F12) → onglet Réseau, et vérifiez le corps de la réponse pour l'erreur réelle.
- **Échec du chargement latéral :** Essayez "Télécharger une application dans le catalogue d'applications de votre organisation" au lieu de "Télécharger une application personnalisée" - cela contourne souvent les restrictions de chargement latéral.

### Autorisations RSC non fonctionnelles

1. Vérifiez que `webApplicationInfo.id` correspond exactement à l'ID d'application de votre bot
2. Re-téléchargez l'application et réinstallez-la dans l'équipe/la conversation
3. Vérifiez si votre administrateur d'organisation a bloqué les autorisations RSC
4. Confirmez que vous utilisez la bonne portée : `ChannelMessage.Read.Group` pour les équipes, `ChatMessage.Read.Chat` pour les conversations de groupe

## Références

- [Créer un bot Azure](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Guide de configuration du bot Azure
- [Teams Developer Portal](https://dev.teams.microsoft.com/apps) - créer/gérer les applications Teams
- [Schéma du manifeste d'application Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Recevoir des messages de canal avec RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [Référence des autorisations RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Gestion des fichiers de bot Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (channel/group nécessite Graph)
- [Messagerie proactive](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)

## Connexes

- [Vue d'ensemble des canaux](/en/channels) — tous les canaux pris en charge
- [Appairage](/en/channels/pairing) — authentification DM et flux d'appairage
- [Groupes](/en/channels/groups) — comportement de chat de groupe et contrôle des mentions
- [Routage de canal](/en/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/en/gateway/security) — modèle d'accès et durcissement
