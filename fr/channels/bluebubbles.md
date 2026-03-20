---
summary: "iMessage via iMessage BlueBubbles server (REST send/receive, typing, reactions, pairing, advanced actions)."
read_when:
  - Configuration du canal BlueBubbles
  - Dépannage de l'appariement webhook
  - Configuration d'iMessage sur macOS
title: "BlueBubbles"
---

# BlueBubbles (macOS REST)

Statut : plugin inclus qui communique avec le serveur BlueBubbles macOS via HTTP. **Recommandé pour l'intégration iMessage** en raison de son API plus riche et d'une configuration plus facile par rapport au canal imsg hérité.

## Aperçu

- Fonctionne sur macOS via l'application auxiliaire BlueBubbles ([bluebubbles.app](https://bluebubbles.app)).
- Recommandé/testé : macOS Sequoia (15). macOS Tahoe (26) fonctionne ; l'édition est actuellement cassée sur Tahoe, et les mises à jour d'icônes de groupe peuvent signaler le succès mais ne pas se synchroniser.
- OpenClaw communique avec lui via son REST API (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`).
- Les messages entrants arrivent via des webhooks ; les réponses sortantes, les indicateurs de frappe, les accusés de lecture et les tapbacks sont des appels REST.
- Les pièces jointes et les autocollants sont ingérés en tant que média entrant (et présentés à l'agent si possible).
- L'appariement/liste blanche fonctionne de la même manière que les autres canaux (`/channels/pairing` etc) avec `channels.bluebubbles.allowFrom` + codes d'appariement.
- Les réactions sont présentées comme des événements système tout comme Slack/Telegram afin que les agents puissent les "mentionner" avant de répondre.
- Fonctionnalités avancées : édition, annulation d'envoi, fils de discussion de réponse, effets de message, gestion de groupe.

## Démarrage rapide

1. Installez le serveur BlueBubbles sur votre Mac (suivez les instructions sur [bluebubbles.app/install](https://bluebubbles.app/install)).
2. Dans la configuration BlueBubbles, activez le web API et définissez un mot de passe.
3. Exécutez `openclaw onboard` et sélectionnez BlueBubbles, ou configurez manuellement :

   ```json5
   {
     channels: {
       bluebubbles: {
         enabled: true,
         serverUrl: "http://192.168.1.100:1234",
         password: "example-password",
         webhookPath: "/bluebubbles-webhook",
       },
     },
   }
   ```

4. Dirigez les webhooks BlueBubbles vers votre passerelle (exemple : `https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`).
5. Démarrez la passerelle ; elle enregistrera le gestionnaire de webhook et commencera l'appariement.

Note de sécurité :

- Définissez toujours un mot de passe webhook.
- L'authentification webhook est toujours requise. OpenClaw rejette les demandes webhook BlueBubbles à moins qu'elles n'incluent un mot de passe/guid correspondant à `channels.bluebubbles.password` (par exemple `?password=<password>` ou `x-password`), quelle que soit la topologie de bouclage/proxy.
- L'authentification par mot de passe est vérifiée avant la lecture et l'analyse des corps complets des webhooks.

## Garder Messages.app actif (configurations VM / sans interface)

Certaines configurations de VM macOS / toujours actives peuvent finir par voir Messages.app devenir « inactif » (les événements entrants s'arrêtent jusqu'à ce que l'application soit ouverte / passée au premier plan). Une solution simple consiste à **solliciter Messages toutes les 5 minutes** à l'aide d'un AppleScript + LaunchAgent.

### 1) Enregistrer l'AppleScript

Enregistrez ceci sous :

- `~/Scripts/poke-messages.scpt`

Exemple de script (non interactif ; ne vole pas le focus) :

```applescript
try
  tell application "Messages"
    if not running then
      launch
    end if

    -- Touch the scripting interface to keep the process responsive.
    set _chatCount to (count of chats)
  end tell
on error
  -- Ignore transient failures (first-run prompts, locked session, etc).
end try
```

### 2) Installer un LaunchAgent

Enregistrez ceci sous :

- `~/Library/LaunchAgents/com.user.poke-messages.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.user.poke-messages</string>

    <key>ProgramArguments</key>
    <array>
      <string>/bin/bash</string>
      <string>-lc</string>
      <string>/usr/bin/osascript &quot;$HOME/Scripts/poke-messages.scpt&quot;</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>StartInterval</key>
    <integer>300</integer>

    <key>StandardOutPath</key>
    <string>/tmp/poke-messages.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/poke-messages.err</string>
  </dict>
</plist>
```

Notes :

- Cela s'exécute **toutes les 300 secondes** et **à la connexion**.
- Le premier exécution peut déclencher des invites d'**Automatisation** macOS (`osascript` → Messages). Approuvez-les dans la même session utilisateur qui exécute le LaunchAgent.

Chargez-le :

```bash
launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
```

## Onboarding

BlueBubbles est disponible dans l'onboarding interactif :

```
openclaw onboard
```

L'assistant demande :

- **URL du serveur** (requis) : adresse du serveur BlueBubbles (p. ex., `http://192.168.1.100:1234`)
- **Mot de passe** (requis) : mot de passe API provenant des paramètres du serveur BlueBubbles
- **Chemin du webhook** (optionnel) : par défaut `/bluebubbles-webhook`
- **Stratégie DM** : appairage, liste blanche, ouvert ou désactivé
- **Liste blanche** : numéros de téléphone, e-mails ou cibles de chat

Vous pouvez également ajouter BlueBubbles via CLI :

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## Contrôle d'accès (DMs + groupes)

DMs :

- Par défaut : `channels.bluebubbles.dmPolicy = "pairing"`.
- Les expéditeurs inconnus reçoivent un code d'appairage ; les messages sont ignorés jusqu'à approbation (les codes expirent après 1 heure).
- Approuver via :
  - `openclaw pairing list bluebubbles`
  - `openclaw pairing approve bluebubbles <CODE>`
- L'appairage est l'échange de jetons par défaut. Détails : [Appairage](/fr/channels/pairing)

Groupes :

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled` (par défaut : `allowlist`).
- `channels.bluebubbles.groupAllowFrom` contrôle qui peut déclencher dans les groupes lorsque `allowlist` est défini.

### Filtrage par mention (groupes)

BlueBubbles prend en charge le filtrage par mention pour les chats de groupe, imitant le comportement iMessage/WhatsApp :

- Utilise `agents.list[].groupChat.mentionPatterns` (ou `messages.groupChat.mentionPatterns`) pour détecter les mentions.
- Lorsque `requireMention` est activé pour un groupe, l'agent ne répond que lorsqu'il est mentionné.
- Les commandes de contrôle des expéditeurs autorisés contournent le filtrage par mention.

Configuration par groupe :

```json5
{
  channels: {
    bluebubbles: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123"],
      groups: {
        "*": { requireMention: true }, // default for all groups
        "iMessage;-;chat123": { requireMention: false }, // override for specific group
      },
    },
  },
}
```

### Filtrage des commandes

- Les commandes de contrôle (par exemple, `/config`, `/model`) nécessitent une autorisation.
- Utilise `allowFrom` et `groupAllowFrom` pour déterminer l'autorisation de la commande.
- Les expéditeurs autorisés peuvent exécuter des commandes de contrôle même sans être mentionnés dans les groupes.

## État de frappe + accusés de lecture

- **Indicateurs de frappe** : Envoyés automatiquement avant et pendant la génération de la réponse.
- **Accusés de lecture** : Contrôlés par `channels.bluebubbles.sendReadReceipts` (par défaut : `true`).
- **Indicateurs de frappe** : OpenClaw envoie des événements de début de frappe ; BlueBubbles efface automatiquement la frappe lors de l'envoi ou de l'expiration du délai (l'arrêt manuel via DELETE n'est pas fiable).

```json5
{
  channels: {
    bluebubbles: {
      sendReadReceipts: false, // disable read receipts
    },
  },
}
```

## Actions avancées

BlueBubbles prend en charge des actions de message avancées lorsqu'elles sont activées dans la configuration :

```json5
{
  channels: {
    bluebubbles: {
      actions: {
        reactions: true, // tapbacks (default: true)
        edit: true, // edit sent messages (macOS 13+, broken on macOS 26 Tahoe)
        unsend: true, // unsend messages (macOS 13+)
        reply: true, // reply threading by message GUID
        sendWithEffect: true, // message effects (slam, loud, etc.)
        renameGroup: true, // rename group chats
        setGroupIcon: true, // set group chat icon/photo (flaky on macOS 26 Tahoe)
        addParticipant: true, // add participants to groups
        removeParticipant: true, // remove participants from groups
        leaveGroup: true, // leave group chats
        sendAttachment: true, // send attachments/media
      },
    },
  },
}
```

Actions disponibles :

- **react** : Ajouter/supprimer des réactions tapback (`messageId`, `emoji`, `remove`)
- **edit** : Modifier un message envoyé (`messageId`, `text`)
- **unsend** : Annuler l'envoi d'un message (`messageId`)
- **reply** : Répondre à un message spécifique (`messageId`, `text`, `to`)
- **sendWithEffect** : Envoyer avec un effet iMessage (`text`, `to`, `effectId`)
- **renameGroup** : Renommer une conversation de groupe (`chatGuid`, `displayName`)
- **setGroupIcon** : Définir l'icône/photo d'une conversation de groupe (`chatGuid`, `media`) — instable sur macOS 26 Tahoe (API peut renvoyer un succès mais l'icône ne se synchronise pas).
- **addParticipant** : Ajouter quelqu'un à un groupe (`chatGuid`, `address`)
- **removeParticipant** : Supprimer quelqu'un d'un groupe (`chatGuid`, `address`)
- **leaveGroup** : Quitter une conversation de groupe (`chatGuid`)
- **sendAttachment** : Envoyer des médias/fichiers (`to`, `buffer`, `filename`, `asVoice`)
  - Mémos vocaux : définissez `asVoice: true` avec un audio **MP3** ou **CAF** pour envoyer en tant que message vocal iMessage. BlueBubbles convertit le MP3 en CAF lors de l'envoi de mémos vocaux.

### Identifiants de message (courts vs complets)

OpenClaw peut présenter des identifiants de message _courts_ (ex : `1`, `2`) pour économiser des jetons.

- `MessageSid` / `ReplyToId` peuvent être des identifiants courts.
- `MessageSidFull` / `ReplyToIdFull` contiennent les identifiants complets du fournisseur.
- Les identifiants courts sont en mémoire ; ils peuvent expirer lors d'un redémarrage ou d'une purge du cache.
- Les actions acceptent les identifiants courts ou complets `messageId`, mais les identifiants courts généreront une erreur s'ils ne sont plus disponibles.

Utilisez les identifiants complets pour les automatisations durables et le stockage :

- Modèles : `{{MessageSidFull}}`, `{{ReplyToIdFull}}`
- Contexte : `MessageSidFull` / `ReplyToIdFull` dans les charges utiles entrantes

Consultez la section [Configuration](/fr/gateway/configuration) pour les variables de modèle.

## Block streaming

Contrôlez si les réponses sont envoyées en un seul message ou diffusées par blocs :

```json5
{
  channels: {
    bluebubbles: {
      blockStreaming: true, // enable block streaming (off by default)
    },
  },
}
```

## Médias + limites

- Les pièces jointes entrantes sont téléchargées et stockées dans le cache média.
- Limite de média via `channels.bluebubbles.mediaMaxMb` pour les médias entrants et sortants (par défaut : 8 Mo).
- Le texte sortant est découpé en morceaux de `channels.bluebubbles.textChunkLimit` (par défaut : 4000 caractères).

## Référence de configuration

Configuration complète : [Configuration](/fr/gateway/configuration)

Options du fournisseur :

- `channels.bluebubbles.enabled` : Activer/désactiver le channel.
- `channels.bluebubbles.serverUrl` : URL de base de l'API REST de BlueBubbles.
- `channels.bluebubbles.password` : Mot de passe de l'API.
- `channels.bluebubbles.webhookPath` : Chemin du point de terminaison du webhook (par défaut : `/bluebubbles-webhook`).
- `channels.bluebubbles.dmPolicy` : `pairing | allowlist | open | disabled` (par défaut : `pairing`).
- `channels.bluebubbles.allowFrom` : Liste d'autorisation de DM (handles, e-mails, numéros E.164, `chat_id:*`, `chat_guid:*`).
- `channels.bluebubbles.groupPolicy` : `open | allowlist | disabled` (par défaut : `allowlist`).
- `channels.bluebubbles.groupAllowFrom` : Liste d'autorisation des expéditeurs de groupe.
- `channels.bluebubbles.groups` : Config. par groupe (`requireMention`, etc.).
- `channels.bluebubbles.sendReadReceipts` : Envoyer des accusés de lecture (par défaut : `true`).
- `channels.bluebubbles.blockStreaming` : Activer le block streaming (par défaut : `false` ; requis pour les réponses en streaming).
- `channels.bluebubbles.textChunkLimit` : Taille du bloc sortant en caractères (par défaut : 4000).
- `channels.bluebubbles.chunkMode` : `length` (par défaut) divise uniquement lors du dépassement de `textChunkLimit` ; `newline` divise sur les lignes vides (limites de paragraphe) avant le découpage par longueur.
- `channels.bluebubbles.mediaMaxMb` : Limite de médias entrants/sortants en Mo (par défaut : 8).
- `channels.bluebubbles.mediaLocalRoots` : Liste d'autorisation explicite des répertoires locaux absolus autorisés pour les chemins de médias locaux sortants. L'envoi de chemins locaux est refusé par défaut sauf si ceci est configuré. Remplacement par compte : `channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`.
- `channels.bluebubbles.historyLimit` : Nombre maximum de messages de groupe pour le contexte (0 désactive).
- `channels.bluebubbles.dmHistoryLimit` : Limite d'historique des DM.
- `channels.bluebubbles.actions` : Activer/désactiver des actions spécifiques.
- `channels.bluebubbles.accounts` : Configuration multi-compte.

Options globales connexes :

- `agents.list[].groupChat.mentionPatterns` (ou `messages.groupChat.mentionPatterns`).
- `messages.responsePrefix`.

## Adressage / cibles de livraison

Privilégiez `chat_guid` pour un routage stable :

- `chat_guid:iMessage;-;+15555550123` (préféré pour les groupes)
- `chat_id:123`
- `chat_identifier:...`
- Handles directs : `+15555550123`, `user@example.com`
  - Si un handle direct n'a pas de conversation DM existante, OpenClaw en créera une via `POST /api/v1/chat/new`. Cela nécessite que l'BlueBubbles privée de API soit activée.

## Sécurité

- Les requêtes webhook sont authentifiées en comparant les paramètres de requête ou en-têtes `guid`/`password` avec `channels.bluebubbles.password`. Les requêtes provenant de `localhost` sont également acceptées.
- Gardez le mot de passe API et le point de terminaison webhook secrets (traitez-les comme des identifiants).
- La confiance de l'hôte local signifie qu'un proxy inverse sur le même hôte peut contourner involontairement le mot de passe. Si vous proxy la passerelle, exigez l'authentification au niveau du proxy et configurez `gateway.trustedProxies`. Consultez la section [Sécurité de la Gateway](/fr/gateway/security#reverse-proxy-configuration).
- Activez le HTTPS et les règles de pare-feu sur le serveur BlueBubbles si vous l'exposez en dehors de votre réseau local.

## Dépannage

- Si les événements de frappe/lecture cessent de fonctionner, vérifiez les journaux webhook BlueBubbles et assurez-vous que le chemin de la passerelle correspond à `channels.bluebubbles.webhookPath`.
- Les codes d'appariement expirent après une heure ; utilisez `openclaw pairing list bluebubbles` et `openclaw pairing approve bluebubbles <code>`.
- Les réactions nécessitent l'BlueBubbles privée API (`POST /api/v1/message/react`) ; assurez-vous que la version du serveur l'expose.
- La modification/l'annulation d'envoi nécessitent macOS 13+ et une version compatible du serveur BlueBubbles. Sur macOS 26 (Tahoe), la modification est actuellement cassée en raison des changements de l'API privée.
- Les mises à jour des icônes de groupe peuvent être instables sur macOS 26 (Tahoe) : l'API peut renvoyer un succès mais la nouvelle icône ne se synchronise pas.
- OpenClaw masque automatiquement les actions connues comme cassées en fonction de la version BlueBubbles du serveur macOS. Si la modification apparaît toujours sur macOS 26 (Tahoe), désactivez-la manuellement avec `channels.bluebubbles.actions.edit=false`.
- Pour les informations de statut/santé : `openclaw status --all` ou `openclaw status --deep`.

Pour une référence générale sur le workflow des canaux, consultez [Canaux](/fr/channels) et le guide [Plugins](/fr/tools/plugin).

import en from "/components/footer/en.mdx";

<en />
