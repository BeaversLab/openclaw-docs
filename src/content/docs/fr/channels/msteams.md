---
summary: "Microsoft Teams statut du support, fonctionnalités et configuration du bot"
read_when:
  - Working on Microsoft Teams channel features
title: "Microsoft Teams"
---

# Microsoft Teams

> "Abandon all hope, ye who enter here."

Mis à jour : 2026-03-25

Statut : les pièces jointes de texte + DM sont prises en charge ; l'envoi de fichiers channel/groupe nécessite `sharePointSiteId` + les autorisations Graph (voir [Sending files in group chats](#sending-files-in-group-chats)). Les sondages sont envoyés via Adaptive Cards. Les actions de message exposent explicitement `upload-file` pour les envois basés sur les fichiers.

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

Détails : [Plugins](/fr/tools/plugin)

## Configuration rapide (débutant)

1. Assurez-vous que le plugin Microsoft Teams est disponible.
   - Les versions empaquetées actuelles de OpenClaw l'incluent déjà.
   - Les installations anciennes/personnalisées peuvent l'ajouter manuellement avec les commandes ci-dessus.
2. Créez un **Azure Bot** (ID d'application + secret client + ID de locataire).
3. Configurez OpenClaw avec ces informations d'identification.
4. Exposez `/api/messages` (port 3978 par défaut) via une URL publique ou un tunnel.
5. Installez le package d'application Teams et démarrez la passerelle.

Configuration minimale (secret client) :

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

Pour les déploiements de production, envisagez d'utiliser l'[authentification fédérée](#federated-authentication-certificate--managed-identity) (certificat ou identité managée) au lieu des secrets client.

Remarque : les discussions de groupe sont bloquées par défaut (`channels.msteams.groupPolicy: "allowlist"`). Pour autoriser les réponses de groupe, définissez `channels.msteams.groupAllowFrom` (ou utilisez `groupPolicy: "open"` pour autoriser n'importe quel membre, conditionné par une mention).

## Objectifs

- Parlez à OpenClaw via DM Teams, discussions de groupe ou channels.
- Gardez le routage déterministe : les réponses reviennent toujours sur le channel d'où elles proviennent.
- Comportement sécurisé par défaut pour les channels (mentions requises sauf si configuré autrement).

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
- Les UPN/noms d'affichage sont modifiables ; la correspondance directe est désactivée par défaut et activée uniquement avec `channels.msteams.dangerouslyAllowNameMatching: true`.
- L'assistant peut résoudre les noms en ID via Microsoft Graph lorsque les identifiants le permettent.

**Accès de groupe**

- Par défaut : `channels.msteams.groupPolicy = "allowlist"` (bloqué sauf si vous ajoutez `groupAllowFrom`). Utilisez `channels.defaults.groupPolicy` pour remplacer la valeur par défaut lorsqu'elle n'est pas définie.
- `channels.msteams.groupAllowFrom` contrôle quels expéditeurs peuvent déclencher dans les conversations de groupe/canaux (revient à `channels.msteams.allowFrom`).
- Définissez `groupPolicy: "open"` pour autoriser n'importe quel membre (toujours limité par mention par défaut).
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

**Teams + liste d'autorisation de canaux**

- Délimitez les réponses de groupe/canal en listant les équipes et les canaux sous `channels.msteams.teams`.
- Les clés doivent utiliser des ID d'équipe stables et des ID de conversation de canal.
- Lorsque `groupPolicy="allowlist"` et une liste d'autorisation d'équipes sont présents, seules les équipes/canaux listés sont acceptés (limité par mention).
- L'assistant de configuration accepte les entrées `Team/Channel` et les stocke pour vous.
- Au démarrage, OpenClaw résout les noms de liste d'autorisation d'équipe/canal et d'utilisateur en ID (lorsque les autorisations Graph le permettent)
  et journalise le mappage ; les noms d'équipe/canal non résolus sont conservés tels quels mais ignorés pour le routage par défaut, sauf si `channels.msteams.dangerouslyAllowNameMatching: true` est activé.

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
   - Les versions OpenClaw conditionnées actuelles l'incluent déjà.
   - Les installations plus anciennes ou personnalisées peuvent l'ajouter manuellement avec les commandes ci-dessus.
2. Créez un **Azure Bot** (ID d'application + secret + ID de locataire).
3. Créez un **package d'application Teams** qui référence le bot et inclut les autorisations RSC ci-dessous.
4. Téléchargez/installez l'application Teams dans une équipe (ou l'étendue personnelle pour les MDs).
5. Configurez `msteams` dans `~/.openclaw/openclaw.json` (ou env vars) et démarrez la passerelle.
6. Par défaut, la passerelle écoute le trafic webhook Bot Framework sur `/api/messages`.

## Configuration d'Azure Bot (Prérequis)

Avant de configurer OpenClaw, vous devez créer une ressource Azure Bot.

### Étape 1 : Créer un Azure Bot

1. Accédez à [Create Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. Remplissez l'onglet **Basics** :

   | Champ                      | Valeur                                                          |
   | -------------------------- | --------------------------------------------------------------- |
   | **Bot handle**             | Votre nom de bot, par ex. `openclaw-msteams` (doit être unique) |
   | **Abonnement**             | Sélectionnez votre abonnement Azure                             |
   | **Groupe de ressources**   | Créer un nouveau ou utiliser un existant                        |
   | **Niveau de tarification** | **Gratuit** pour le développement/les tests                     |
   | **Type d'application**     | **Locataire unique** (recommandé - voir la note ci-dessous)     |
   | **Type de création**       | **Créer un nouvel ID d'application Microsoft**                  |

> **Avis d'obsolescence :** La création de nouveaux bots multilocataires a été obsolétée après le 2025-07-31. Utilisez **Single Tenant** pour les nouveaux bots.

3. Cliquez sur **Review + create** → **Create** (attendre ~1-2 minutes)

### Étape 2 : Obtenir les identifiants

1. Accédez à votre ressource Azure Bot → **Configuration**
2. Copiez **Microsoft App ID** → il s'agit de votre `appId`
3. Cliquez sur **Manage Password** → accédez à l'inscription de l'application (App Registration)
4. Sous **Certificates & secrets** → **New client secret** → copiez la **Value** → il s'agit de votre `appPassword`
5. Accédez à **Overview** → copiez **Directory (tenant) ID** → il s'agit de votre `tenantId`

### Étape 3 : Configurer le point de terminaison de messagerie

1. Dans Azure Bot → **Configuration**
2. Définissez le **Messaging endpoint** sur l'URL de votre webhook :
   - Production : `https://your-domain.com/api/messages`
   - Dév local : Utilisez un tunnel (voir [Local Development](#local-development-tunneling) ci-dessous)

### Étape 4 : Activer le canal Teams

1. Dans Azure Bot → **Channels**
2. Cliquez sur **Microsoft Teams** → Configure → Save
3. Acceptez les conditions d'utilisation (Terms of Service)

## Authentification fédérée (Certificat + Identité gérée)

> Ajouté le 2026.3.24

Pour les déploiements en production, OpenClaw prend en charge l'**authentification fédérée** comme alternative plus sécurisée aux secrets client. Deux méthodes sont disponibles :

### Option A : Authentification basée sur un certificat

Utilisez un certificat PEM enregistré avec votre inscription d'application Entra ID.

**Configuration :**

1. Générez ou obtenez un certificat (format PEM avec clé privée).
2. Dans Entra ID → App Registration → **Certificates & secrets** → **Certificates** → Téléchargez le certificat public.

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

Utilisez Azure Managed Identity pour une authentification sans mot de passe. C'est idéal pour les déploiements sur l'infrastructure Azure (AKS, App Service, Azure VMs) où une identité gérée est disponible.

**Fonctionnement :**

1. Le pod/VM du bot possède une identité gérée (attribuée par le système ou par l'utilisateur).
2. Une **information d'identification d'identité fédérée** lie l'identité gérée à l'inscription de l'application Entra ID.
3. Au moment de l'exécution, OpenClaw utilise `@azure/identity` pour acquérir des jetons à partir du point de terminaison Azure IMDS (`169.254.169.254`).
4. Le jeton est transmis au Teams SDK pour l'authentification du bot.

**Prérequis :**

- Infrastructure Azure avec identité gérée activée (identité de charge de travail AKS, App Service, machine virtuelle)
- Information d'identification d'identité fédérée créée sur l'inscription de l'application Entra ID
- Accès réseau à IMDS (`169.254.169.254:80`) à partir du pod/de la machine virtuelle

**Config (identité gérée affectée par le système) :**

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

**Config (identité gérée affectée par l'utilisateur) :**

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

**Variables d'env :**

- `MSTEAMS_AUTH_TYPE=federated`
- `MSTEAMS_USE_MANAGED_IDENTITY=true`
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID=<client-id>` (uniquement pour affectée par l'utilisateur)

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

5. **Assurez l'accès réseau** à IMDS (`169.254.169.254`) — si vous utilisez NetworkPolicy, ajoutez une règle de sortie autorisant le trafic vers `169.254.169.254/32` sur le port 80.

### Comparaison des types d'authentification

| Méthode            | Config                                         | Avantages                               | Inconvénients                              |
| ------------------ | ---------------------------------------------- | --------------------------------------- | ------------------------------------------ |
| **Secret client**  | `appPassword`                                  | Configuration simple                    | Rotation du secret requise, moins sécurisé |
| **Certificat**     | `authType: "federated"` + `certificatePath`    | Aucun secret partagé sur le réseau      | Surcharge de gestion des certificats       |
| **Identité gérée** | `authType: "federated"` + `useManagedIdentity` | Sans mot de passe, aucun secret à gérer | Infrastructure Azure requise               |

**Comportement par défaut :** Lorsque `authType` n'est pas défini, OpenClaw utilise par défaut l'authentification par secret client. Les configurations existantes continuent de fonctionner sans modification.

## Développement local (Tunneling)

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

Au lieu de créer manuellement un fichier ZIP manifeste, vous pouvez utiliser le [Teams Developer Portal](https://dev.teams.microsoft.com/apps) :

1. Cliquez sur **+ New app**
2. Remplissez les informations de base (nom, description, informations sur le développeur)
3. Accédez à **App features** → **Bot**
4. Sélectionnez **Enter a bot ID manually** et collez votre ID d'application Azure Bot
5. Cochez les étendues : **Personal**, **Team**, **Group Chat**
6. Cliquez sur **Distribute** → **Download app package**
7. Dans Teams : **Applications** → **Gérer vos applications** → **Télécharger une application personnalisée** → sélectionnez le fichier ZIP

C'est souvent plus facile que de modifier manuellement les manifests JSON.

## Tester le bot

**Option A : Azure Web Chat (vérifiez d'abord le webhook)**

1. Dans le portail Azure → votre ressource Azure Bot → **Tester dans le Web Chat**
2. Envoyez un message - vous devriez voir une réponse
3. Cela confirme que votre point de terminaison webhook fonctionne avant la configuration de Teams

**Option B : Teams (après l'installation de l'application)**

1. Installez l'application Teams (chargement parallèle ou catalogue organisationnel)
2. Trouvez le bot dans Teams et envoyez-lui un DM
3. Vérifiez les journaux de la passerelle pour les activités entrantes

## Configuration (texte minimal uniquement)

1. **Assurez-vous que le plugin Microsoft Teams est disponible**
   - Les versions actuelles packagées de OpenClaw l'incluent déjà.
   - Les installations plus anciennes ou personnalisées peuvent l'ajouter manuellement :
     - Depuis npm : `openclaw plugins install @openclaw/msteams`
     - Depuis un extrait local : `openclaw plugins install ./path/to/local/msteams-plugin`

2. **Inscription du bot**
   - Créez un Azure Bot (voir ci-dessus) et notez :
     - ID d'application
     - Secret client (Mot de passe de l'application)
     - ID de locataire (monolocataire)

3. **Manifeste de l'application Teams**
   - Incluez une entrée `bot` avec `botId = <App ID>`.
   - Étendues : `personal`, `team`, `groupChat`.
   - `supportsFiles: true` (requis pour la gestion des fichiers de portée personnelle).
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

   Vous pouvez également utiliser des variables d'environnement à la place des clés de configuration :
   - `MSTEAMS_APP_ID`
   - `MSTEAMS_APP_PASSWORD`
   - `MSTEAMS_TENANT_ID`
   - `MSTEAMS_AUTH_TYPE` (facultatif : `"secret"` ou `"federated"`)
   - `MSTEAMS_CERTIFICATE_PATH` (fédéré + certificat)
   - `MSTEAMS_CERTIFICATE_THUMBPRINT` (facultatif, non requis pour l'authentification)
   - `MSTEAMS_USE_MANAGED_IDENTITY` (fédéré + identité gérée)
   - `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID` (identité gérée affectée par l'utilisateur uniquement)

5. **Point de terminaison du bot**
   - Définissez le point de terminaison de messagerie du bot Azure sur :
     - `https://<host>:3978/api/messages` (ou votre chemin/port choisi).

6. **Exécuter la passerelle**
   - Le canal Teams démarre automatiquement lorsque le plugin inclus ou installé manuellement est disponible et que la configuration `msteams` existe avec les identifiants.

## Action d'informations sur le membre

OpenClaw expose une action `member-info` basée sur Graph pour Microsoft Teams afin que les agents et les automatisations puissent résoudre les détails des membres du canal (nom d'affichage, e-mail, rôle) directement à partir de Microsoft Graph.

Conditions requises :

- Permission RSC `Member.Read.Group` (déjà présente dans le manifeste recommandé)
- Pour les recherches inter-équipes : permission d'application Graph `User.Read.All` avec consentement de l'administrateur

L'action est verrouillée par `channels.msteams.actions.memberInfo` (par défaut : activée lorsque les identifiants Graph sont disponibles).

## Contexte de l'historique

- `channels.msteams.historyLimit` contrôle le nombre de messages récents du canal/groupe inclus dans l'invite.
- Revient à `messages.groupChat.historyLimit`. Définissez `0` pour désactiver (par défaut 50).
- L'historique des fils récupéré est filtré par les listes autorisées d'expéditeurs (`allowFrom` / `groupAllowFrom`), de sorte que l'amorçage du contexte du fil inclut uniquement les messages des expéditeurs autorisés.
- Le contexte de pièce jointe citée (`ReplyTo*` dérivé du HTML de réponse Teams) est actuellement transmis tel quel.
- En d'autres termes, les listes autorisées contrôlent qui peut déclencher l'agent ; seuls certains chemins de contexte supplémentaires sont filtrés aujourd'hui.
- L'historique des DM peut être limité avec `channels.msteams.dmHistoryLimit` (tours utilisateur). Remplacements par utilisateur : `channels.msteams.dms["<user_id>"].historyLimit`.

## Autorisations RSC Teams actuelles (Manifeste)

Ce sont les **autorisations resourceSpecific existantes** dans le manifeste de notre application Teams. Elles ne s'appliquent qu'à l'intérieur de l'équipe/discussion où l'application est installée.

**Pour les canaux (portée d'équipe) :**

- `ChannelMessage.Read.Group` (Application) - recevoir tous les messages de canal sans @mention
- `ChannelMessage.Send.Group` (Application)
- `Member.Read.Group` (Application)
- `Owner.Read.Group` (Application)
- `ChannelSettings.Read.Group` (Application)
- `TeamMember.Read.Group` (Application)
- `TeamSettings.Read.Group` (Application)

**Pour les discussions de groupe :**

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
- `bots[].supportsFiles: true` est requis pour la gestion des fichiers dans l'étendue personnelle.
- `authorization.permissions.resourceSpecific` doit inclure la lecture/l'envoi dans le canal si vous voulez le trafic du canal.

### Mise à jour d'une application existante

Pour mettre à jour une application Teams déjà installée (par exemple, pour ajouter des autorisations RSC) :

1. Mettez à jour votre `manifest.json` avec les nouveaux paramètres
2. **Incrémentez le champ `version`** (par exemple, `1.0.0` → `1.1.0`)
3. **Recompressez** le manifeste avec les icônes (`manifest.json`, `outline.png`, `color.png`)
4. Téléchargez le nouveau fichier zip :
   - **Option A (Centre d'administration Teams) :** Centre d'administration Teams → Applications Teams → Gérer les applications → rechercher votre application → Télécharger une nouvelle version
   - **Option B (Chargement latéral) :** Dans Teams → Applications → Gérer vos applications → Télécharger une application personnalisée
5. **Pour les canaux d'équipe :** Réinstallez l'application dans chaque équipe pour que les nouvelles autorisations prennent effet
6. **Quittez entièrement et relancez Teams** (et ne fermez pas simplement la fenêtre) pour effacer les métadonnées de l'application en cache

## Capacités : RSC uniquement vs Graph

### Avec **RSC Teams uniquement** (application installée, aucune autorisation d'API Graph)

Fonctionne :

- Lire le contenu **texte** des messages du canal.
- Envoyer le contenu **texte** des messages du canal.
- Recevoir des pièces jointes de fichiers **personnels (DM)**.

Ne fonctionne PAS :

- **Images ou contenu de fichiers** de canal/groupe (la charge utile n'inclut qu'un corps HTML).
- Téléchargement des pièces jointes stockées dans SharePoint/OneDrive.
- Lecture de l'historique des messages (au-delà de l'événement webhook en direct).

### Avec **RSC Teams + Autorisations d'application Microsoft Graph**

Ajoute :

- Téléchargement des contenus hébergés (images collées dans les messages).
- Téléchargement des pièces jointes de fichiers stockées dans SharePoint/OneDrive.
- Lecture de l'historique des messages de canal/discussion via Graph.

### RSC vs API API

| Capacité                        | Autorisations RSC                     | API API                                                       |
| ------------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| **Messages en temps réel**      | Oui (via webhook)                     | Non (sondage uniquement)                                      |
| **Messages historiques**        | Non                                   | Oui (peut interroger l'historique)                            |
| **Complexité de configuration** | Manifeste de l'application uniquement | Nécessite le consentement de l'administrateur + flux de jeton |
| **Fonctionne hors ligne**       | Non (doit être en cours d'exécution)  | Oui (interrogation à tout moment)                             |

**En résumé :** RSC est pour l'écoute en temps réel ; l'API API est pour l'accès historique. Pour rattraper les messages manqués hors ligne, vous avez besoin de l'API API avec `ChannelMessage.Read.All` (nécessite le consentement de l'administrateur).

## Média + historique activés via Graph (requis pour les canaux)

Si vous avez besoin d'images/fichiers dans les **canaux** ou si vous souhaitez récupérer l'**historique des messages**, vous devez activer les autorisations Microsoft Graph et accorder le consentement de l'administrateur.

1. Dans Entra ID (Azure AD) **Inscription de l'application**, ajoutez des **autorisations d'application** Microsoft Graph :
   - `ChannelMessage.Read.All` (pièces jointes du canal + historique)
   - `Chat.Read.All` ou `ChatMessage.Read.All` (discussions de groupe)
2. **Accorder le consentement de l'administrateur** pour le locataire.
3. Augmentez la **version du manifeste** de l'application Teams, téléchargez-la à nouveau et **réinstallez l'application dans Teams**.
4. **Quittez entièrement et relancez Teams** pour effacer les métadonnées de l'application en cache.

**Autorisation supplémentaire pour les mentions d'utilisateur :** Les mentions @ des utilisateurs fonctionnent immédiatement pour les utilisateurs de la conversation. Cependant, si vous souhaitez rechercher dynamiquement et mentionner des utilisateurs qui ne sont **pas dans la conversation actuelle**, ajoutez l'autorisation `User.Read.All` (Application) et accordez le consentement de l'administrateur.

## Limitations connues

### Délais d'expiration du webhook

Teams envoie les messages via un webhook HTTP. Si le traitement prend trop de temps (par exemple, des réponses LLM lentes), vous pouvez voir :

- Délais d'expiration de la Gateway
- Teams réessayer d'envoyer le message (provoquant des doublons)
- Réponses ignorées

OpenClaw gère cela en répondant rapidement et en envoyant des réponses de manière proactive, mais des réponses très lentes peuvent toujours poser problème.

### Mise en forme

Le markdown Teams est plus limité que Slack ou Discord :

- La mise en forme de base fonctionne : **gras**, _italique_, `code`, liens
- Le markdown complexe (tableaux, listes imbriquées) peut ne pas s'afficher correctement
- Les cartes adaptatives sont prises en charge pour les sondages et l'envoi de cartes arbitraires (voir ci-dessous)

## Configuration

Paramètres clés (voir `/gateway/configuration` pour les modèles de canaux partagés) :

- `channels.msteams.enabled` : activer/désactiver le channel.
- `channels.msteams.appId`, `channels.msteams.appPassword`, `channels.msteams.tenantId` : identifiants du bot.
- `channels.msteams.webhook.port` (par défaut `3978`)
- `channels.msteams.webhook.path` (par défaut `/api/messages`)
- `channels.msteams.dmPolicy` : `pairing | allowlist | open | disabled` (par défaut : jumelage)
- `channels.msteams.allowFrom` : liste d'autorisation DM (AAD object IDs recommandés). L'assistant résout les noms en ID lors de la configuration lorsque l'accès Graph est disponible.
- `channels.msteams.dangerouslyAllowNameMatching` : commutateur de secours pour réactiver la correspondance UPN/nom d'affichage modifiable et le routage direct par nom d'équipe/de channel.
- `channels.msteams.textChunkLimit` : taille du bloc de texte sortant.
- `channels.msteams.chunkMode` : `length` (par défaut) ou `newline` pour diviser sur les lignes vides (limites de paragraphe) avant le découpage par longueur.
- `channels.msteams.mediaAllowHosts` : liste d'autorisation pour les hôtes de pièces jointes entrantes (par défaut les domaines Microsoft/Teams).
- `channels.msteams.mediaAuthAllowHosts` : liste d'autorisation pour l'attachement des en-têtes Authorization lors des nouvelles tentatives de média (par défaut les hôtes Graph + Bot Framework).
- `channels.msteams.requireMention` : exiger @mention dans les channels/groupes (vrai par défaut).
- `channels.msteams.replyStyle` : `thread | top-level` (voir [Reply Style](#reply-style-threads-vs-posts)).
- `channels.msteams.teams.<teamId>.replyStyle` : substitution par équipe.
- `channels.msteams.teams.<teamId>.requireMention` : substitution par équipe.
- `channels.msteams.teams.<teamId>.tools` : substitutions de stratégie de tool par équipe par défaut (`allow`/`deny`/`alsoAllow`) utilisées lorsqu'une substitution de channel est manquante.
- `channels.msteams.teams.<teamId>.toolsBySender` : substitutions de stratégie de tool par équipe et par expéditeur par défaut (caractère générique `"*"` pris en charge).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle` : substitution par channel.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention` : substitution par channel.
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools` : substitutions de stratégie de tool par channel (`allow`/`deny`/`alsoAllow`).
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender` : remplacements de la stratégie d'outil par expéditeur et par canal (le caractère générique `"*"` est pris en charge).
- Les clés `toolsBySender` doivent utiliser des préfixes explicites :
  `id:`, `e164:`, `username:`, `name:` (les clés héritées sans préfixe renvoient toujours uniquement à `id:`).
- `channels.msteams.actions.memberInfo` : activer ou désactiver l'action d'informations sur les membres basée sur Graph (par défaut : activé si les informations d'identification Graph sont disponibles).
- `channels.msteams.authType` : type d'authentification — `"secret"` (par défaut) ou `"federated"`.
- `channels.msteams.certificatePath` : chemin d'accès au fichier de certificat PEM (authentification fédérée + certificat).
- `channels.msteams.certificateThumbprint` : empreinte numérique du certificat (facultatif, non requis pour l'authentification).
- `channels.msteams.useManagedIdentity` : activer l'authentification par identité managée (mode fédéré).
- `channels.msteams.managedIdentityClientId` : ID client pour l'identité managée affectée par l'utilisateur.
- `channels.msteams.sharePointSiteId` : ID de site SharePoint pour les téléchargements de fichiers dans les conversations de groupe/canaux (voir [Sending files in group chats](#sending-files-in-group-chats)).

## Routage et sessions

- Les clés de session suivent le format standard de l'agent (voir [/concepts/session](/fr/concepts/session)) :
  - Les messages directs partagent la session principale (`agent:<agentId>:<mainKey>`).
  - Les messages de canal/groupe utilisent l'ID de conversation :
    - `agent:<agentId>:msteams:channel:<conversationId>`
    - `agent:<agentId>:msteams:group:<conversationId>`

## Style de réponse : Fils ou publications

Teams a récemment introduit deux styles d'interface utilisateur de canal sur le même modèle de données sous-jacent :

| Style                        | Description                                                                                      | `replyStyle` recommandé |
| ---------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------- |
| **Publications** (classique) | Les messages apparaissent sous forme de cartes avec des réponses en fil de discussion en dessous | `thread` (par défaut)   |
| **Fils** (style Slack)       | Les messages s'affichent de manière linéaire, plus comme sur Slack                               | `top-level`             |

**Le problème :** L'API Teams n'expose pas le style d'interface utilisateur utilisé par un canal. Si vous utilisez le mauvais `replyStyle` :

- `thread` dans un canal de style Fils → les réponses apparaissent de manière maladroite et imbriquées
- `top-level` dans un channel de style Articles → les réponses apparaissent comme des articles de niveau supérieur distincts au lieu d'être dans le fil

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

- **DMs :** Les images et les pièces jointes de fichiers fonctionnent via les API de fichiers de bot Teams.
- **Channels/groupes :** Les pièces jointes résident dans le stockage M365 (SharePoint/OneDrive). La charge utile du webhook n'inclut qu'un fragment HTML, et non les octets réels du fichier. **Les autorisations de l'API Graph sont requises** pour télécharger les pièces jointes du channel.
- Pour les envois explicites de type fichier en premier, utilisez `action=upload-file` avec `media` / `filePath` / `path` ; l'option `message` devient le texte/commentaire d'accompagnement, et `filename` remplace le nom téléchargé.

Sans autorisations Graph, les messages de channel contenant des images seront reçus sous forme de texte uniquement (le contenu de l'image n'est pas accessible pour le bot).
Par défaut, OpenClaw ne télécharge les médias qu'à partir des noms d'hôte Microsoft/Teams. Remplacez avec `channels.msteams.mediaAllowHosts` (utilisez `["*"]` pour autoriser n'importe quel hôte).
Les en-têtes d'autorisation ne sont attachés que pour les hôtes dans `channels.msteams.mediaAuthAllowHosts` (par défaut : hôtes Graph + Bot Framework). Gardez cette liste stricte (évitez les suffixes multi-locataires).

## Envoi de fichiers dans les conversations de groupe

Les bots peuvent envoyer des fichiers dans les DMs en utilisant le flux FileConsentCard (intégré). Cependant, **l'envoi de fichiers dans les conversations de groupe/channels** nécessite une configuration supplémentaire :

| Contexte                             | Comment les fichiers sont envoyés                                   | Configuration nécessaire                               |
| ------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------ |
| **DMs**                              | FileConsentCard → l'utilisateur accepte → téléchargement par le bot | Fonctionne immédiatement                               |
| **Conversations de groupe/channels** | Télécharger vers SharePoint → partager le lien                      | Nécessite `sharePointSiteId` + les autorisations Graph |
| **Images (tout contexte)**           | Encodé en Base64 en ligne                                           | Fonctionne immédiatement                               |

### Pourquoi les conversations de groupe ont besoin de SharePoint

Les bots n'ont pas de disque OneDrive personnel (le point de terminaison `/me/drive` de l'API Graph ne fonctionne pas pour les identités d'application). Pour envoyer des fichiers dans les conversations de groupe/channels, le bot télécharge sur un **site SharePoint** et crée un lien de partage.

### Configuration

1. **Ajoutez les autorisations de l'API Graph** dans Entra ID (Azure AD) → Inscription de l'application :
   - `Sites.ReadWrite.All` (Application) - téléverser des fichiers vers SharePoint
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

| Scénario                                                        | Résultat                                                                          |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Conversation de groupe + fichier + `sharePointSiteId` configuré | Téléverser vers SharePoint, envoyer le lien de partage                            |
| Conversation de groupe + fichier + aucun `sharePointSiteId`     | Tenter le téléversement vers OneDrive (peut échouer), envoyer uniquement du texte |
| Conversation personnelle + fichier                              | Flux FileConsentCard (fonctionne sans SharePoint)                                 |
| Tout contexte + image                                           | Codé en base64 en ligne (fonctionne sans SharePoint)                              |

### Emplacement de stockage des fichiers

Les fichiers téléversés sont stockés dans un dossier `/OpenClawShared/` de la bibliothèque de documents par défaut du site SharePoint configuré.

## Sondages (Cartes adaptatives)

OpenClaw envoie les sondages Teams sous forme de Cartes adaptatives (il n'y a pas d'API native pour les sondages Teams).

- CLI : `openclaw message poll --channel msteams --target conversation:<id> ...`
- Les votes sont enregistrés par la passerelle dans `~/.openclaw/msteams-polls.json`.
- La passerelle doit rester en ligne pour enregistrer les votes.
- Les sondages ne publient pas encore automatiquement de résumés des résultats (inspectez le fichier de stockage si nécessaire).

## Cartes adaptatives (arbitraires)

Envoyez n'importe quel JSON de Carte adaptative aux utilisateurs ou conversations Teams à l'aide de l'outil `message` ou de la CLI.

Le paramètre `card` accepte un objet JSON de Carte adaptative. Lorsque `card` est fourni, le texte du message est facultatif.

**Outil de l'agent :**

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

Voir la [documentation Adaptive Cards](https://adaptivecards.io/) pour le schéma et des exemples de cartes. Pour les détails sur les formats cibles, voir [Formats cibles](#target-formats) ci-dessous.

## Formats cibles

Les cibles MSTeams utilisent des préfixes pour distinguer les utilisateurs et les conversations :

| Type de cible         | Format                           | Exemple                                               |
| --------------------- | -------------------------------- | ----------------------------------------------------- |
| Utilisateur (par ID)  | `user:<aad-object-id>`           | `user:40a1a0ed-4ff2-4164-a219-55518990c197`           |
| Utilisateur (par nom) | `user:<display-name>`            | `user:John Smith` (nécessite l'API Graph API)         |
| Groupe/canal          | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`              |
| Groupe/canal (brut)   | `<conversation-id>`              | `19:abc123...@thread.tacv2` (s'il contient `@thread`) |

**Exemples de CLI :**

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

Remarque : Sans le préfixe `user:`, les noms correspondent par défaut à une résolution de groupe/d'équipe. Utilisez toujours `user:` lorsque vous ciblez des personnes par nom d'affichage.

## Messagerie proactive

- Les messages proactifs ne sont possibles qu'**après** qu'un utilisateur a interagi, car nous stockons les références de conversation à ce moment-là.
- Voir `/gateway/configuration` pour `dmPolicy` et le filtrage par liste autorisée.

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
| Historique de l'API Graph API    | Oui             | Oui (avec autorisations)       |

**Solutions de contournement si les canaux privés ne fonctionnent pas :**

1. Utilisez des canaux standard pour les interactions avec le bot
2. Utilisez les DMs - les utilisateurs peuvent toujours message le bot directement
3. Utilisez l'API Graph API pour l'accès historique (nécessite `ChannelMessage.Read.All`)

## Résolution des problèmes

### Problèmes courants

- **Images ne s'affichant pas dans les canaux :** autorisations Graph ou consentement administratif manquant. Réinstallez l'application Teams et quittez/rouvrez entièrement Teams.
- **Aucune réponse dans le canal :** les mentions sont requises par défaut ; définissez `channels.msteams.requireMention=false` ou configurez par équipe/canal.
- **Incompatibilité de version (Teams affiche toujours l'ancien manifeste) :** supprimez et rajoutez l'application et quittez entièrement Teams pour actualiser.
- **401 Unauthorized du webhook :** Attendu lors de tests manuels sans JWT Azure — cela signifie que le point de terminaison est accessible mais que l'authentification a échoué. Utilisez Azure Web Chat pour tester correctement.

### Erreurs de téléchargement de manifeste

- **« Icon file cannot be empty » (Le fichier d'icône ne peut pas être vide) :** Le manifeste fait référence à des fichiers d'icônes de 0 octet. Créez des icônes PNG valides (32x32 pour `outline.png`, 192x192 pour `color.png`).
- **« webApplicationInfo.Id already in use » :** L'application est toujours installée dans une autre équipe/conversation. Trouvez-la et désinstallez-la d'abord, ou attendez 5 à 10 minutes pour la propagation.
- **« Something went wrong » (Une erreur s'est produite) lors du téléchargement :** Téléchargez via [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) à la place, ouvrez les outils de développement du navigateur (F12) → onglet Réseau, et vérifiez le corps de la réponse pour l'erreur réelle.
- **Échec du chargement latéral :** Essayez « Télécharger une application dans le catalogue d'applications de votre organisation » au lieu de « Télécharger une application personnalisée » — cela contourne souvent les restrictions de chargement latéral.

### Autorisations RSC non fonctionnelles

1. Vérifiez que `webApplicationInfo.id` correspond exactement à l'ID d'application de votre bot
2. Téléchargez à nouveau l'application et réinstallez-la dans l'équipe/la conversation
3. Vérifiez si votre administrateur d'organisation a bloqué les autorisations RSC
4. Confirmez que vous utilisez la bonne étendue : `ChannelMessage.Read.Group` pour les équipes, `ChatMessage.Read.Chat` pour les conversations de groupe

## Références

- [Créer un Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) - Guide de configuration d'Azure Bot
- [Portail des développeurs Teams](https://dev.teams.microsoft.com/apps) - créer/gérer les applications Teams
- [Schéma de manifeste d'application Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [Recevoir les messages de channel avec RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [Référence des autorisations RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Gestion des fichiers par bot Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4) (channel/groupe nécessite Graph)
- [Messagerie proactive](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)

## Connexes

- [Aperçu des canaux](/fr/channels) — tous les canaux pris en charge
- [Jumelage (Pairing)](/fr/channels/pairing) — authentification DM et flux de jumelage
- [Groupes](/fr/channels/groups) — comportement de conversation de groupe et filtrage des mentions
- [Routage de canal](/fr/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/fr/gateway/security) — modèle d'accès et durcissement
