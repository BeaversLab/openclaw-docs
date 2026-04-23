---
summary: "iMessage via BlueBubbles macOS server (REST send/receive, typing, reactions, pairing, advanced actions)."
read_when:
  - Setting up BlueBubbles channel
  - Troubleshooting webhook pairing
  - Configuring iMessage on macOS
title: "BlueBubbles"
---

# BlueBubbles (macOS REST)

Statut : plugin inclus qui communique avec le serveur BlueBubbles macOS via HTTP. **Recommandé pour l'intégration iMessage** en raison de son API plus riche et de sa configuration plus facile par rapport au canal imsg historique.

## Plugin inclus

Current OpenClaw releases bundle BlueBubbles, so normal packaged builds do not
need a separate `openclaw plugins install` step.

## Vue d'ensemble

- Runs on macOS via the BlueBubbles helper app ([bluebubbles.app](https://bluebubbles.app)).
- Recommandé/testé : macOS Sequoia (15). macOS Tahoe (26) fonctionne ; l'édition est actuellement cassée sur Tahoe, et les mises à jour des icônes de groupe peuvent signaler le succès mais ne pas se synchroniser.
- OpenClaw talks to it through its REST API (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`).
- Les messages entrants arrivent via des webhooks ; les réponses sortantes, les indicateurs de frappe, les accusés de lecture et les tapbacks sont des appels REST.
- Les pièces jointes et les autocollants sont ingérés en tant que médias entrants (et présentés à l'agent lorsque possible).
- Pairing/allowlist works the same way as other channels (`/channels/pairing` etc) with `channels.bluebubbles.allowFrom` + pairing codes.
- Les réactions sont présentées comme des événements système tout comme Slack/Telegram afin que les agents puissent les "mentionner" avant de répondre.
- Fonctionnalités avancées : modifier, annuler l'envoi, fils de discussion des réponses, effets de message, gestion de groupe.

## Démarrage rapide

1. Install the BlueBubbles server on your Mac (follow the instructions at [bluebubbles.app/install](https://bluebubbles.app/install)).
2. Dans la configuration BlueBubbles, activez l'API Web et définissez un mot de passe.
3. Run `openclaw onboard` and select BlueBubbles, or configure manually:

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

4. Point BlueBubbles webhooks to your gateway (example: `https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`).
5. Démarrez la passerelle ; elle enregistrera le gestionnaire de webhook et commencera le jumelage.

Note de sécurité :

- Définissez toujours un mot de passe pour le webhook.
- Webhook authentication is always required. OpenClaw rejects BlueBubbles webhook requests unless they include a password/guid that matches `channels.bluebubbles.password` (for example `?password=<password>` or `x-password`), regardless of loopback/proxy topology.
- L'authentification par mot de passe est vérifiée avant la lecture/analyse du corps complet des webhooks.

## Garder Messages.app actif (configurations VM / sans tête)

Certains environnements macOS VM / toujours actifs peuvent finir par avoir Messages.app qui passe en « inactif » (les événements entrants s'arrêtent jusqu'à ce que l'application soit ouverte/mise au premier plan). Une solution simple consiste à **réveiller Messages toutes les 5 minutes** à l'aide d'un AppleScript + LaunchAgent.

### 1) Enregistrez l'AppleScript

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
- The first run may trigger macOS **Automation** prompts (`osascript` → Messages). Approve them in the same user session that runs the LaunchAgent.

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

- **Server URL** (required): BlueBubbles server address (e.g., `http://192.168.1.100:1234`)
- **Mot de passe** (obligatoire) : mot de passe API à partir des paramètres du serveur BlueBubbles
- **Webhook path** (optional): Defaults to `/bluebubbles-webhook`
- **Stratégie DM** : appairage, liste autorisée, ouvert ou désactivé
- **Liste autorisée** : numéros de téléphone, e-mails ou cibles de chat

Vous pouvez également ajouter BlueBubbles via CLI :

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## Contrôle d'accès (DMs + groupes)

DMs :

- Default: `channels.bluebubbles.dmPolicy = "pairing"`.
- Les expéditeurs inconnus reçoivent un code d'appairage ; les messages sont ignorés jusqu'à approbation (les codes expirent après 1 heure).
- Approuver via :
  - `openclaw pairing list bluebubbles`
  - `openclaw pairing approve bluebubbles <CODE>`
- Pairing is the default token exchange. Details: [Pairing](/fr/channels/pairing)

Groupes :

- `channels.bluebubbles.groupPolicy = open | allowlist | disabled` (default: `allowlist`).
- `channels.bluebubbles.groupAllowFrom` controls who can trigger in groups when `allowlist` is set.

### Enrichissement du nom du contact (macOS, facultatif)

Les webhooks de groupe BlueBubbles incluent souvent uniquement les adresses brutes des participants. Si vous souhaitez que le contexte `GroupMembers` affiche plutôt les noms des contacts locaux, vous pouvez activer l'enrichissement des Contacts locaux sur macOS :

- `channels.bluebubbles.enrichGroupParticipantsFromContacts = true` active la recherche. Par défaut : `false`.
- Les recherches ne s'exécutent qu'une fois que l'accès au groupe, l'autorisation de commande et le filtrage des mentions ont autorisé le passage du message.
- Seuls les participants téléphoniques sans nom sont enrichis.
- Les numéros de téléphone bruts restent utilisés par défaut lorsqu'aucune correspondance locale n'est trouvée.

```json5
{
  channels: {
    bluebubbles: {
      enrichGroupParticipantsFromContacts: true,
    },
  },
}
```

### Filtrage par mention (groupes)

BlueBubbles prend en charge le filtrage par mention pour les discussions de groupe, imitant le comportement d'iMessage/WhatsApp :

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
- Utilise `allowFrom` et `groupAllowFrom` pour déterminer l'autorisation des commandes.
- Les expéditeurs autorisés peuvent exécuter des commandes de contrôle même sans mention dans les groupes.

### Invite système par groupe

Chaque entrée sous `channels.bluebubbles.groups.*` accepte une chaîne `systemPrompt` facultative. La valeur est injectée dans le prompt système de l'agent à chaque tour qui gère un message dans ce groupe, vous pouvez donc définir une persona ou des règles comportementales par groupe sans modifier les prompts de l'agent :

```json5
{
  channels: {
    bluebubbles: {
      groups: {
        "iMessage;-;chat123": {
          systemPrompt: "Keep responses under 3 sentences. Mirror the group's casual tone.",
        },
      },
    },
  },
}
```

La clé correspond à ce que BlueBubbles signale comme `chatGuid` / `chatIdentifier` / identifiant numérique `chatId` pour le groupe, et une entrée générique `"*"` fournit une valeur par défaut pour chaque groupe sans correspondance exacte (même modèle utilisé par `requireMention` et les politiques d'outil par groupe). Les correspondances exactes l'emportent toujours sur le générique. Les DMs ignorent ce champ ; utilisez plutôt la personnalisation du prompt au niveau de l'agent ou du compte.

#### Exemple pratique : réponses en fil de discussion et réactions tapback (API privée API)

Avec l'API privée BlueBubbles activée, les messages entrants arrivent avec des ID de message courts (par exemple `[[reply_to:5]]`) et l'agent peut appeler `action=reply` pour répondre dans un fil de discussion spécifique ou `action=react` pour envoyer une réaction tapback. Un `systemPrompt` par groupe est un moyen fiable de garantir que l'agent choisit le bon outil :

```json5
{
  channels: {
    bluebubbles: {
      groups: {
        "iMessage;+;chat-family": {
          systemPrompt: [
            "When replying in this group, always call action=reply with the",
            "[[reply_to:N]] messageId from context so your response threads",
            "under the triggering message. Never send a new unlinked message.",
            "",
            "For short acknowledgements ('ok', 'got it', 'on it'), use",
            "action=react with an appropriate tapback emoji (❤️, 👍, 😂, ‼️, ❓)",
            "instead of sending a text reply.",
          ].join(" "),
        },
      },
    },
  },
}
```

Les réactions Tapback et les réponses en fil de discussion nécessitent toutes deux l'API privée BlueBubbles ; voir [Actions avancées](#advanced-actions) et [Identifiants de message](#message-ids-short-vs-full) pour la mécanique sous-jacente.

## Liaisons de conversation ACP

Les conversations BlueBubbles peuvent être transformées en espaces de travail ACP durables sans modifier la couche de transport.

Flux rapide pour l'opérateur :

- Exécutez `/acp spawn codex --bind here` dans le DM ou le chat de groupe autorisé.
- Les futurs messages de cette même conversation BlueBubbles sont acheminés vers la session ACP générée.
- `/new` et `/reset` réinitialisent la même session ACP liée sur place.
- `/acp close` ferme la session ACP et supprime la liaison.

Les liaisons persistantes configurées sont également prises en charge via des entrées `bindings[]` de premier niveau avec `type: "acp"` et `match.channel: "bluebubbles"`.

`match.peer.id` peut utiliser n'importe quelle forme de cible BlueBubbles prise en charge :

- identifiant DM normalisé tel que `+15555550123` ou `user@example.com`
- `chat_id:<id>`
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

Pour des liaisons de groupe stables, privilégiez `chat_id:*` ou `chat_identifier:*`.

Exemple :

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: { agent: "codex", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "bluebubbles",
        accountId: "default",
        peer: { kind: "dm", id: "+15555550123" },
      },
      acp: { label: "codex-imessage" },
    },
  ],
}
```

Voir [ACP Agents](/fr/tools/acp-agents) pour le comportement de liaison ACP partagé.

## Indicateurs de frappe + accusés de lecture

- **Indicateurs de frappe** : Envoyés automatiquement avant et pendant la génération de la réponse.
- **Accusés de lecture** : Contrôlés par `channels.bluebubbles.sendReadReceipts` (par défaut : `true`).
- **Indicateurs de frappe** : OpenClaw envoie des événements de début de frappe ; BlueBubbles efface la frappe automatiquement lors de l'envoi ou de l'expiration (l'arrêt manuel via DELETE n'est pas fiable).

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

BlueBubbles prend en charge les actions avancées de message lorsqu'elles sont activées dans la configuration :

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
- **removeParticipant** : Retirer quelqu'un d'un groupe (`chatGuid`, `address`)
- **leaveGroup** : Quitter une conversation de groupe (`chatGuid`)
- **upload-file** : Envoyer des médias/fichiers (`to`, `buffer`, `filename`, `asVoice`)
  - Mémos vocaux : définissez `asVoice: true` avec de l'audio **MP3** ou **CAF** pour l'envoyer en tant que message vocal iMessage. BlueBubbles convertit les MP3 en CAF lors de l'envoi de mémos vocaux.
- Alias hérité : `sendAttachment` fonctionne toujours, mais `upload-file` est le nom canonique de l'action.

### Identifiants de message (courts vs complets)

OpenClaw peut afficher des identifiants de message _courts_ (ex : `1`, `2`) pour économiser des jetons.

- `MessageSid` / `ReplyToId` peuvent être des identifiants courts.
- `MessageSidFull` / `ReplyToIdFull` contiennent les identifiants complets du provider.
- Les identifiants courts sont en mémoire ; ils peuvent expirer après un redémarrage ou une éviction du cache.
- Les actions acceptent les identifiants courts ou complets `messageId`, mais les identifiants courts généreront une erreur s'ils ne sont plus disponibles.

Utilisez les identifiants complets pour les automatisations et le stockage durables :

- Modèles : `{{MessageSidFull}}`, `{{ReplyToIdFull}}`
- Contexte : `MessageSidFull` / `ReplyToIdFull` dans les charges utiles entrantes

Voir [Configuration](/fr/gateway/configuration) pour les variables de modèle.

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

- Les pièces jointes entrantes sont téléchargées et stockées dans le cache des médias.
- Limite de médias via `channels.bluebubbles.mediaMaxMb` pour les médias entrants et sortants (par défaut : 8 Mo).
- Le texte sortant est découpé en morceaux de `channels.bluebubbles.textChunkLimit` (par défaut : 4000 caractères).

## Référence de configuration

Configuration complète : [Configuration](/fr/gateway/configuration)

Options du fournisseur :

- `channels.bluebubbles.enabled` : Activer/désactiver le canal.
- `channels.bluebubbles.serverUrl` : URL de base de l'API REST BlueBubbles.
- `channels.bluebubbles.password` : Mot de passe de l'API.
- `channels.bluebubbles.webhookPath` : Chemin du point de terminaison du webhook (par défaut : `/bluebubbles-webhook`).
- `channels.bluebubbles.dmPolicy` : `pairing | allowlist | open | disabled` (par défaut : `pairing`).
- `channels.bluebubbles.allowFrom` : Liste d'autorisation de DM (identifiants, e-mails, numéros E.164, `chat_id:*`, `chat_guid:*`).
- `channels.bluebubbles.groupPolicy` : `open | allowlist | disabled` (par défaut : `allowlist`).
- `channels.bluebubbles.groupAllowFrom` : Liste d'autorisation des expéditeurs de groupe.
- `channels.bluebubbles.enrichGroupParticipantsFromContacts` : Sur macOS, enrichissez éventuellement les participants de groupe sans nom à partir des Contacts locaux après le passage de la porte. Par défaut : `false`.
- `channels.bluebubbles.groups` : Configuration par groupe (`requireMention`, etc.).
- `channels.bluebubbles.sendReadReceipts` : Envoyer des accusés de lecture (par défaut : `true`).
- `channels.bluebubbles.blockStreaming` : Activer le block streaming (par défaut : `false` ; requis pour les réponses en continu).
- `channels.bluebubbles.textChunkLimit` : Taille des morceaux sortants en caractères (par défaut : 4000).
- `channels.bluebubbles.sendTimeoutMs` : Délai d'expiration par requête en ms pour l'envoi de texte sortant via `/api/v1/message/text` (par défaut : 30000). Augmentez sur les configurations macOS 26 où les envois API via l'API privée iMessage peuvent bloquer pendant plus de 60 secondes dans le framework iMessage ; par exemple `45000` ou `60000`. Les sondages, les recherches de chat, les réactions, les modifications et les vérifications de santé conservent actuellement la valeur par défaut plus courte de 10s ; l'extension de la couverture aux réactions et aux modifications est prévue dans une suite. Remplacement par compte : `channels.bluebubbles.accounts.<accountId>.sendTimeoutMs`.
- `channels.bluebubbles.chunkMode` : `length` (par défaut) divise uniquement en dépassant `textChunkLimit` ; `newline` divise sur les lignes vides (limites de paragraphe) avant le fractionnement par longueur.
- `channels.bluebubbles.mediaMaxMb` : Limite de médias entrants/sortants en Mo (par défaut : 8).
- `channels.bluebubbles.mediaLocalRoots` : Liste d'autorisation explicite des répertoires locaux absolus autorisés pour les chemins de médias locaux sortants. Les envois de chemins locaux sont refusés par défaut sauf si cela est configuré. Remplacement par compte : `channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`.
- `channels.bluebubbles.historyLimit` : Nombre maximal de messages de groupe pour le contexte (0 désactive).
- `channels.bluebubbles.dmHistoryLimit` : Limite d'historique des DM.
- `channels.bluebubbles.actions` : Activer/désactiver des actions spécifiques.
- `channels.bluebubbles.accounts` : Configuration multi-compte.

Options globales associées :

- `agents.list[].groupChat.mentionPatterns` (ou `messages.groupChat.mentionPatterns`).
- `messages.responsePrefix`.

## Adressage / cibles de livraison

Privilégiez `chat_guid` pour un routage stable :

- `chat_guid:iMessage;-;+15555550123` (préféré pour les groupes)
- `chat_id:123`
- `chat_identifier:...`
- Gestionnaires directs : `+15555550123` , `user@example.com`
  - Si un gestionnaire direct n'a pas de conversation DM existante, OpenClaw en créera une via `POST /api/v1/chat/new` . Cela nécessite que l'API privée BlueBubbles soit activée.

## Sécurité

- Les requêtes webhook sont authentifiées en comparant les paramètres de requête ou les en-têtes `guid` / `password` à `channels.bluebubbles.password`.
- Gardez le mot de passe API et le point de terminaison webhook secrets (traitez-les comme des identifiants).
- Il n'y a pas de contournement localhost pour l'authentification webhook BlueBubbles . Si vous proxyz le trafic webhook, gardez le mot de passe BlueBubbles de bout en bout sur la requête. `gateway.trustedProxies` ne remplace pas `channels.bluebubbles.password` ici. Voir [Sécurité Gateway ](/fr/gateway/security#reverse-proxy-configuration).
- Activez HTTPS + les règles de pare-feu sur le serveur BlueBubbles s'il est exposé en dehors de votre réseau local.

## Dépannage

- Si les événements de frappe/lecture cessent de fonctionner, vérifiez les journaux webhook BlueBubbles et assurez-vous que le chemin de la passerelle correspond à `channels.bluebubbles.webhookPath`.
- Les codes d'appariement expirent après une heure ; utilisez `openclaw pairing list bluebubbles` et `openclaw pairing approve bluebubbles <code>`.
- Les réactions nécessitent l'BlueBubbles privée API (`POST /api/v1/message/react`) ; assurez-vous que la version du serveur l'expose.
- La modification/la non-envoi nécessitent macOS 13+ et une version compatible du serveur BlueBubbles. Sur macOS 26 (Tahoe), la modification est actuellement cassée en raison des modifications de l'API privée.
- Les mises à jour d'icône de groupe peuvent être instables sur macOS 26 (Tahoe) : l'API peut renvoyer un succès mais la nouvelle icône ne se synchronise pas.
- OpenClaw masque automatiquement les actions connues comme cassées en fonction de la version BlueBubbles du serveur macOS. Si la modification apparaît toujours sur macOS 26 (Tahoe), désactivez-la manuellement avec `channels.bluebubbles.actions.edit=false`.
- Pour les informations de statut/santé : `openclaw status --all` ou `openclaw status --deep`.

Pour une référence générale du workflow des channels, voir [Channels](/fr/channels) et le guide [Plugins](/fr/tools/plugin).

## Connexes

- [Aperçu des Channels](/fr/channels) — tous les channels pris en charge
- [Appariement](/fr/channels/pairing) — authentification DM et flux d'appariement
- [Groupes](/fr/channels/groups) — comportement des chats de groupe et filtrage des mentions
- [Routage de Channel](/fr/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/fr/gateway/security) — model d'accès et durcissement
