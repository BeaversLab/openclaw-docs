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

Les webhooks de groupe BlueBubbles incluent souvent uniquement les adresses brutes des participants. Si vous souhaitez que le contexte `GroupMembers` affiche les noms des contacts locaux à la place, vous pouvez activer l'enrichissement local des Contacts sur BlueBubbles :

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
- Utilise `allowFrom` et `groupAllowFrom` pour déterminer l'autorisation de la commande.
- Les expéditeurs autorisés peuvent exécuter des commandes de contrôle même sans mention dans les groupes.

### Invite système par groupe

Chaque entrée sous `channels.bluebubbles.groups.*` accepte une chaîne `systemPrompt` facultative. La valeur est injectée dans le prompt système de l'agent à chaque tour gérant un message dans ce groupe, vous permettant ainsi de définir une personnalité ou des règles comportementales par groupe sans modifier les prompts de l'agent :

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

La clé correspond à ce que BlueBubbles signale comme `chatGuid` / `chatIdentifier` / identifiant numérique `chatId` pour le groupe, et une entrée générique `"*"` fournit une valeur par défaut pour chaque groupe sans correspondance exacte (même modèle utilisé par `requireMention` et les stratégies d'outil par groupe). Les correspondances exactes l'emportent toujours sur le générique. Les DMs ignorent ce champ ; utilisez plutôt la personnalisation du prompt au niveau de l'agent ou du compte.

#### Exemple pratique : réponses en fil de discussion et réactions tapback (API privée API)

Avec l'API privée BlueBubbles activée, les messages entrants arrivent avec des ID de message courts (par exemple `[[reply_to:5]]`) et l'agent peut appeler `action=reply` pour répondre dans un fil spécifique ou `action=react` pour ajouter une tapback. Un `systemPrompt` par groupe est un moyen fiable de garder l'agent à choisir le bon outil :

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

Les réactions tapback et les réponses en fil de discussion nécessitent toutes deux l'API privée BlueBubbles ; voir [Actions avancées](#advanced-actions) et [ID de message](#message-ids-short-vs-full) pour la mécanique sous-jacente.

## Liaisons de conversation ACP

Les conversations BlueBubbles peuvent être transformées en espaces de travail ACP durables sans modifier la couche de transport.

Flux rapide pour l'opérateur :

- Exécutez `/acp spawn codex --bind here` à l'intérieur du DM ou du chat de groupe autorisé.
- Les futurs messages de cette même conversation BlueBubbles sont acheminés vers la session ACP générée.
- `/new` et `/reset` réinitialisent la même session ACP liée sur place.
- `/acp close` ferme la session ACP et supprime la liaison.

Les liaisons persistantes configurées sont également prises en charge via les entrées de `bindings[]` de premier niveau avec `type: "acp"` et `match.channel: "bluebubbles"`.

`match.peer.id` peut utiliser n'importe quelle forme de cible BlueBubbles prise en charge :

- identifiant DM normalisé tel que `+15555550123` ou `user@example.com`
- `chat_id:<id>`
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

Pour des liaisons de groupe stables, préférez `chat_id:*` ou `chat_identifier:*`.

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
- **Accusés de réception** : Contrôlés par `channels.bluebubbles.sendReadReceipts` (par défaut : `true`).
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

- **react** : Ajouter/supprimer les réactions tapback (`messageId`, `emoji`, `remove`). L'ensemble tapback natif de iMessage est `love`, `like`, `dislike`, `laugh`, `emphasize` et `question`. Lorsqu'un agent choisit un emoji en dehors de cet ensemble (par exemple `👀`), l'outil de réaction revient à `love` afin que le tapback s'affiche toujours au lieu d'échouer toute la demande. Les réactions ack configurées valident toujours strictement et génèrent une erreur sur les valeurs inconnues.
- **edit** : Modifier un message envoyé (`messageId`, `text`)
- **unsend** : Annuler l'envoi d'un message (`messageId`)
- **reply** : Répondre à un message spécifique (`messageId`, `text`, `to`)
- **sendWithEffect** : Envoyer avec un effet iMessage (`text`, `to`, `effectId`)
- **renameGroup** : Renommer une conversation de groupe (`chatGuid`, `displayName`)
- **setGroupIcon** : Définit l'icône/photo d'une discussion de groupe (`chatGuid`, `media`) — instable sur macOS 26 Tahoe (API peut renvoyer un succès mais l'icône ne se synchronise pas).
- **addParticipant** : Ajoute quelqu'un à un groupe (`chatGuid`, `address`)
- **removeParticipant** : Retire quelqu'un d'un groupe (`chatGuid`, `address`)
- **leaveGroup** : Quitter une discussion de groupe (`chatGuid`)
- **upload-file** : Envoyer des médias/fichiers (`to`, `buffer`, `filename`, `asVoice`)
  - Mémos vocaux : définissez `asVoice: true` avec de l'audio **MP3** ou **CAF** pour l'envoyer en tant que message vocal iMessage. BlueBubbles convertit le MP3 en CAF lors de l'envoi de mémos vocaux.
- Ancien alias : `sendAttachment` fonctionne toujours, mais `upload-file` est le nom de l'action canonique.

### Identifiants de message (courts vs complets)

OpenClaw peut afficher des identifiants de message _courts_ (par exemple, `1`, `2`) pour économiser des jetons.

- `MessageSid` / `ReplyToId` peuvent être des ID courts.
- `MessageSidFull` / `ReplyToIdFull` contiennent les ID complets du fournisseur.
- Les identifiants courts sont en mémoire ; ils peuvent expirer après un redémarrage ou une éviction du cache.
- Les actions acceptent des `messageId` courts ou complets, mais les ID courts généreront une erreur s'ils ne sont plus disponibles.

Utilisez les identifiants complets pour les automatisations et le stockage durables :

- Modèles : `{{MessageSidFull}}`, `{{ReplyToIdFull}}`
- Contexte : `MessageSidFull` / `ReplyToIdFull` dans les charges utiles entrantes

Voir [Configuration](/fr/gateway/configuration) pour les variables de modèle.

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## Fusion des envois fractionnés de DMs (commande + URL en une seule composition)

Lorsqu'un utilisateur tape une commande et une URL ensemble dans iMessage — par exemple `Dump https://example.com/article` — Apple divise l'envoi en **deux livraisons de webhook distinctes** :

1. Un message texte (`"Dump"`).
2. Un ballon d'aperçu d'URL (`"https://..."`) avec des images d'aperçu OG en pièces jointes.

Les deux webhooks arrivent à OpenClaw à environ 0,8 à 2,0 s d'intervalle sur la plupart des configurations. Sans fusion, l'agent reçoit la commande seul au tour 1, répond (souvent "envoyez-moi l'URL"), et ne voit l'URL qu'au tour 2 — à ce moment, le contexte de la commande est déjà perdu.

`channels.bluebubbles.coalesceSameSenderDms` opte pour une fusion des webhooks consécutifs du même expéditeur en un seul tour d'agent pour les DM. Les discussions de groupe continuent à être indexées par message afin de préserver la structure des tours à plusieurs utilisateurs.

### Quand activer

Activer quand :

- Vous proposez des compétences qui attendent `command + payload` dans un seul message (dump, paste, save, queue, etc.).
- Vos utilisateurs collent des URL, des images ou du contenu long avec les commandes.
- Vous pouvez accepter la latence de tour DM supplémentaire (voir ci-dessous).

Laisser désactivé quand :

- Vous avez besoin d'une latence de commande minimale pour les déclencheurs DM d'un seul mot.
- Tous vos flux sont des commandes ponctuelles sans suivi de payload.

### Activation

```json5
{
  channels: {
    bluebubbles: {
      coalesceSameSenderDms: true, // opt in (default: false)
    },
  },
}
```

Avec l'indicateur activé et sans `messages.inbound.byChannel.bluebubbles` explicite, la fenêtre de debounce s'élargit à **2500 ms** (la valeur par défaut sans fusion est de 500 ms). La fenêtre élargie est nécessaire — le cadencement d'envoi fractionné d'Apple de 0,8 à 2,0 s ne tient pas dans la valeur par défaut plus serrée.

Pour régler la fenêtre vous-même :

```json5
{
  messages: {
    inbound: {
      byChannel: {
        // 2500 ms works for most setups; raise to 4000 ms if your Mac is slow
        // or under memory pressure (observed gap can stretch past 2 s then).
        bluebubbles: 2500,
      },
    },
  },
}
```

### Compromis

- **Latence ajoutée pour les commandes de contrôle DM.** Avec l'indicateur activé, les messages de commande de contrôle DM (comme `Dump`, `Save`, etc.) attendent désormais jusqu'à la fenêtre de debounce avant l'expédition, au cas où un webhook de payload arriverait. Les commandes de discussion de groupe restent instantanées.
- **La sortie fusionnée est bornée** — le texte fusionné est plafonné à 4000 caractères avec un marqueur `…[truncated]` explicite ; les pièces jointes sont plafonnées à 20 ; les entrées source sont plafonnées à 10 (la première plus la dernière sont conservées au-delà). Chaque `messageId` source atteint toujours l'inbound-dedupe, de sorte qu'une rediffusion ultérieure par MessagePoller de tout événement individuel est reconnue comme un doublon.
- **Opt-in, par channel.** Les autres channels (Telegram, WhatsApp, Slack, …) ne sont pas affectés.

### Scénarios et ce que l'agent voit

| L'utilisateur compose                                                                       | Apple livre                    | Indicateur désactivé (par défaut)            | Indicateur activé + fenêtre de 2500 ms                                                |
| ------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `Dump https://example.com` (un envoi)                                                       | 2 webhooks à ~1 s d'intervalle | Deux tours d'agent : "Dump" seul, puis l'URL | Un tour : texte fusionné `Dump https://example.com`                                   |
| `Save this 📎image.jpg caption` (pièce jointe + texte)                                      | 2 webhooks                     | Deux tours                                   | Un tour : texte + image                                                               |
| `/status` (commande autonome)                                                               | 1 webhook                      | Envoi immédiat                               | **Attendre la fenêtre, puis envoyer**                                                 |
| URL collée seule                                                                            | 1 webhook                      | Envoi immédiat                               | Envoi immédiat (une seule entrée dans le bucket)                                      |
| Texte + URL envoyés en deux messages distincts volontaires, à quelques minutes d'intervalle | 2 webhooks hors fenêtre        | Deux tours                                   | Deux tours (la fenêtre expire entre eux)                                              |
| Inondation rapide (>10 petits DMs dans la fenêtre)                                          | N webhooks                     | N tours                                      | Un tour, sortie limitée (premier + dernier, limites de texte/pièce jointe appliquées) |

### Dépannage de la fusion des envois fractionnés

Si l'indicateur est activé et que les envois fractionnés arrivent toujours en deux tours, vérifiez chaque couche :

1. **Configuration réellement chargée.**

   ```
   grep coalesceSameSenderDms ~/.openclaw/openclaw.json
   ```

   Ensuite `openclaw gateway restart` — l'indicateur est lu lors de la création du registre de debounce.

2. **Fenêtre de debounce assez large pour votre configuration.** Regardez le journal du serveur BlueBubbles sous `~/Library/Logs/bluebubbles-server/main.log` :

   ```
   grep -E "Dispatching event to webhook" main.log | tail -20
   ```

   Mesurez l'écart entre l'envoi de texte de style `"Dump"` et l'envoi `"https://..."; Attachments:` qui suit. Augmentez `messages.inbound.byChannel.bluebubbles` pour couvrir confortablement cet écart.

3. **Horodatages JSONL de session ≠ arrivée du webhook.** Les horodatages des événements de session (`~/.openclaw/agents/<id>/sessions/*.jsonl`) reflètent le moment où la passerelle remet un message à l'agent, **pas** le moment où le webhook est arrivé. Un message en file d'attente en deuxième marqué `[Queued messages while agent was busy]` signifie que le premier tour était toujours en cours lors de l'arrivée du second webhook — le bucket de fusion s'était déjà vidé. Ajustez la fenêtre par rapport au journal du serveur BB, et non au journal de session.

4. **Pression de la mémoire ralentissant l'envoi de la réponse.** Sur les machines plus petites (8 Go), les tours de l'agent peuvent prendre suffisamment de temps pour que le bucket de fusion se vide avant que la réponse ne soit terminée, et l'URL atterrit comme un deuxième tour en file d'attente. Vérifiez `memory_pressure` et `ps -o rss -p $(pgrep openclaw-gateway)` ; si la passerelle dépasse environ 500 Mo RSS et que le compresseur est actif, fermez d'autres processus lourds ou passez à un hôte plus grand.

5. **Les envois par citation de réponse empruntent un chemin différent.** Si l'utilisateur a appuyé sur `Dump` comme **réponse** à une bulle d'URL existante (iMessage affiche un badge "1 Réponse" sur la bulle Dump), l'URL se trouve dans `replyToBody`, et non dans un deuxième webhook. La fusion ne s'applique pas — c'est une préoccupation de compétence/prompt, et non de debounceur.

## Block streaming

Contrôlez si les réponses sont envoyées sous forme d'un message unique ou diffusées par blocs :

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
- Le texte sortant est découpé en blocs de `channels.bluebubbles.textChunkLimit` (par défaut : 4000 caractères).

## Référence de configuration

Configuration complète : [Configuration](/fr/gateway/configuration)

Options du fournisseur :

- `channels.bluebubbles.enabled` : Activer/désactiver le canal.
- `channels.bluebubbles.serverUrl` : URL de base de l'BlueBubbles REST API.
- `channels.bluebubbles.password` : Mot de passe de l'API.
- `channels.bluebubbles.webhookPath` : Chemin du point de terminaison du webhook (par défaut : `/bluebubbles-webhook`).
- `channels.bluebubbles.dmPolicy` : `pairing | allowlist | open | disabled` (par défaut : `pairing`).
- `channels.bluebubbles.allowFrom` : Liste d'autorisation DM (identifiants, e-mails, numéros E.164, `chat_id:*`, `chat_guid:*`).
- `channels.bluebubbles.groupPolicy` : `open | allowlist | disabled` (par défaut : `allowlist`).
- `channels.bluebubbles.groupAllowFrom` : Liste d'autorisation des expéditeurs de groupe.
- `channels.bluebubbles.enrichGroupParticipantsFromContacts` : Sur macOS, enrichissez éventuellement les participants de groupe sans nom à partir des Contacts locaux après la validation. Par défaut : `false`.
- `channels.bluebubbles.groups` : Configuration par groupe (`requireMention`, etc.).
- `channels.bluebubbles.sendReadReceipts` : Envoyer des accusés de lecture (par défaut : `true`).
- `channels.bluebubbles.blockStreaming` : Activer le block streaming (par défaut : `false` ; requis pour les réponses en continu).
- `channels.bluebubbles.textChunkLimit` : Taille des blocs sortants en caractères (par défaut : 4000).
- `channels.bluebubbles.sendTimeoutMs` : Délai d'expiration par demande en ms pour l'envoi de texte sortant via `/api/v1/message/text` (par défaut : 30000). À augmenter sur les configurations macOS 26 où les envois iMessage de l'API privée peuvent bloquer pendant plus de 60 secondes dans le framework iMessage ; par exemple `45000` ou `60000`. Les sondages, les recherches de chat, les réactions, les modifications et les vérifications de santé conservent actuellement le délai par défaut plus court de 10 s ; l'élargissement de la couverture aux réactions et aux modifications est prévu dans une suite. Remplacement par compte : `channels.bluebubbles.accounts.<accountId>.sendTimeoutMs`.
- `channels.bluebubbles.chunkMode` : `length` (par défaut) divise uniquement lors du dépassement de `textChunkLimit` ; `newline` divise sur les lignes vides (limites de paragraphes) avant le découpage par longueur.
- `channels.bluebubbles.mediaMaxMb` : Limite de média entrant/sortant en Mo (par défaut : 8).
- `channels.bluebubbles.mediaLocalRoots` : Liste d'autorisation explicite des répertoires locaux absolus autorisés pour les chemins de média locaux sortants. Les envois de chemins locaux sont refusés par défaut, sauf si cela est configuré. Remplacement par compte : `channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`.
- `channels.bluebubbles.coalesceSameSenderDms` : Fusionner les webhooks DM consécutifs du même expéditeur en un seul tour d'agent afin que l'envoi fractionné texte+URL d'Apple arrive en un seul message (par défaut : `false`). Voir [Coalescing split-send DMs](#coalescing-split-send-dms-command--url-in-one-composition) pour les scénarios, le réglage de la fenêtre et les compromis. Élargit la fenêtre de rebond entrante par défaut de 500 ms à 2500 ms lorsqu'il est activé sans `messages.inbound.byChannel.bluebubbles` explicite.
- `channels.bluebubbles.historyLimit` : Nombre maximal de messages de groupe pour le contexte (0 désactive).
- `channels.bluebubbles.dmHistoryLimit` : Limite de l'historique des DM.
- `channels.bluebubbles.actions` : Activer/désactiver des actions spécifiques.
- `channels.bluebubbles.accounts` : Configuration multi-compte.

Options globales associées :

- `agents.list[].groupChat.mentionPatterns` (ou `messages.groupChat.mentionPatterns`).
- `messages.responsePrefix`.

## Adressage / cibles de livraison

Préférez `chat_guid` pour un routage stable :

- `chat_guid:iMessage;-;+15555550123` (préféré pour les groupes)
- `chat_id:123`
- `chat_identifier:...`
- Direct handles: `+15555550123`, `user@example.com`
  - If a direct handle does not have an existing DM chat, OpenClaw will create one via `POST /api/v1/chat/new`. This requires the BlueBubbles Private API to be enabled.

### iMessage vs SMS routing

When the same handle has both an iMessage and an SMS chat on the Mac (for example a phone number that is iMessage-registered but has also received green-bubble fallbacks), OpenClaw prefers the iMessage chat and never silently downgrades to SMS. To force the SMS chat, use an explicit `sms:` target prefix (for example `sms:+15555550123`). Handles without a matching iMessage chat still send through whatever chat BlueBubbles reports.

## Security

- Webhook requests are authenticated by comparing `guid`/`password` query params or headers against `channels.bluebubbles.password`.
- Keep the API password and webhook endpoint secret (treat them like credentials).
- There is no localhost bypass for BlueBubbles webhook auth. If you proxy webhook traffic, keep the BlueBubbles password on the request end-to-end. `gateway.trustedProxies` does not replace `channels.bluebubbles.password` here. See [Gateway security](/fr/gateway/security#reverse-proxy-configuration).
- Enable HTTPS + firewall rules on the BlueBubbles server if exposing it outside your LAN.

## Troubleshooting

- If typing/read events stop working, check the BlueBubbles webhook logs and verify the gateway path matches `channels.bluebubbles.webhookPath`.
- Pairing codes expire after one hour; use `openclaw pairing list bluebubbles` and `openclaw pairing approve bluebubbles <code>`.
- Reactions require the BlueBubbles private API (`POST /api/v1/message/react`); ensure the server version exposes it.
- Edit/unsend require macOS 13+ and a compatible BlueBubbles server version. On macOS 26 (Tahoe), edit is currently broken due to private API changes.
- Group icon updates can be flaky on macOS 26 (Tahoe): the API may return success but the new icon does not sync.
- OpenClaw auto-hides known-broken actions based on the BlueBubbles server's macOS version. If edit still appears on macOS 26 (Tahoe), disable it manually with `channels.bluebubbles.actions.edit=false`.
- `coalesceSameSenderDms` activé mais les envois fractionnés (ex. `Dump` + URL) arrivent toujours sous forme de deux tours : consultez la liste de contrôle de troubleshooting pour la fusion des envois fractionnés (#split-send-coalescing-troubleshooting) — les causes fréquentes sont une fenêtre de debounce trop courte, les horodatages des journaux de session mal lus comme l'arrivée d'un webhook, ou un envoi de citation de réponse (qui utilise `replyToBody`, et non un deuxième webhook).
- Pour les informations d'état/santé : `openclaw status --all` ou `openclaw status --deep`.

Pour une référence générale sur le flux de travail des channels, consultez [Channels](/fr/channels) et le guide [Plugins](/fr/tools/plugin).

## Connexes

- [Vue d'ensemble des Channels](/fr/channels) — tous les channels pris en charge
- [Appairage](/fr/channels/pairing) — authentification DM et flux d'appairage
- [Groupes](/fr/channels/groups) — comportement des discussions de groupe et filtrage des mentions
- [Routage de Channel](/fr/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/fr/gateway/security) — model d'accès et durcissement
