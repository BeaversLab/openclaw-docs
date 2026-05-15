---
summary: "iMessage via BlueBubbles macOS server (REST send/receive, typing, reactions, pairing, advanced actions)."
read_when:
  - Setting up BlueBubbles channel
  - Troubleshooting webhook pairing
  - Configuring iMessage on macOS
title: "BlueBubbles"
sidebarTitle: "BlueBubbles"
---

Statut : plugin inclus qui communique avec le serveur BlueBubbles macOS via HTTP. **Recommandé pour l'intégration iMessage** en raison de son API plus riche et de sa configuration plus facile par rapport au canal imsg historique.

<Note>Les versions actuelles d'OpenClaw incluent BlueBubbles, les builds empaquetés classiques n'ont donc pas besoin d'une étape `openclaw plugins install` séparée.</Note>

## Vue d'ensemble

- S'exécute sur macOS via l'application auxiliaire BlueBubbles ([bluebubbles.app](https://bluebubbles.app)).
- Recommandé/testé : macOS Sequoia (15). macOS Tahoe (26) fonctionne ; l'édition est actuellement cassée sur Tahoe, et les mises à jour d'icône de groupe peuvent indiquer une réussite sans se synchroniser.
- OpenClaw communique avec lui via son API REST (`GET /api/v1/ping`, `POST /message/text`, `POST /chat/:id/*`).
- Les messages entrants arrivent via des webhooks ; les réponses sortantes, les indicateurs de frappe, les accusés de lecture et les tapbacks sont des appels REST.
- Les pièces jointes et les autocollants sont ingérés en tant que médias entrants (et transmis à l'agent si possible).
- Les réponses Auto-TTS qui synthétisent de l'audio MP3 ou CAF sont livrées sous forme de bulles de mémo vocal iMessage au lieu de pièces jointes de fichiers simples.
- L'appairage/liste blanche fonctionne de la même manière que pour les autres canaux (`/channels/pairing` etc) avec `channels.bluebubbles.allowFrom` + codes d'appairage.
- Les réactions sont présentées comme des événements système tout comme Slack/Telegram afin que les agents puissent les "mentionner" avant de répondre.
- Fonctionnalités avancées : modifier, annuler l'envoi, fils de discussion des réponses, effets de message, gestion de groupe.

## Démarrage rapide

<Steps>
  <Step title="Installer BlueBubbles">
    Installez le serveur BlueBubbles sur votre Mac (suivez les instructions sur [bluebubbles.app/install](https://bluebubbles.app/install)).
  </Step>
  <Step title="Activer l'API web">
    Dans la configuration BlueBubbles, activez l'API web et définissez un mot de passe.
  </Step>
  <Step title="Configurer OpenClaw">
    Exécutez `openclaw onboard` et sélectionnez BlueBubbles, ou configurez manuellement :

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

  </Step>
  <Step title="Pointer les webhooks vers la passerelle">
    Pointez les webhooks BlueBubbles vers votre passerelle (exemple : `https://your-gateway-host:3000/bluebubbles-webhook?password=<password>`).
  </Step>
  <Step title="Démarrer la passerelle">
    Démarrez la passerelle ; elle enregistrera le gestionnaire de webhook et commencera l'appairage.
  </Step>
</Steps>

<Warning>
**Sécurité**

- Définissez toujours un mot de passe pour le webhook.
- L'authentification du webhook est toujours requise. OpenClaw rejette les requêtes webhook de BlueBubbles à moins qu'elles n'incluent un mot de passe/guid correspondant à `channels.bluebubbles.password` (par exemple `?password=<password>` ou `x-password`), indépendamment de la topologie bouclage local/proxy.
- L'authentification par mot de passe est vérifiée avant la lecture/analyse du corps complet des webhooks.

</Warning>

## Garder Messages.app actif (VM / configurations sans interface)

Certaines configurations macOS VM / toujours actives peuvent se retrouver avec Messages.app passant en "inactif" (les événements entrants s'arrêtent jusqu'à ce que l'application soit ouverte/passée au premier plan). Une solution simple consiste à **réveiller Messages toutes les 5 minutes** en utilisant un AppleScript + LaunchAgent.

<Steps>
  <Step title="Enregistrer l'AppleScript">
    Enregistrez ceci sous `~/Scripts/poke-messages.scpt` :

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

  </Step>
  <Step title="Installer un LaunchAgent">
    Enregistrez ceci sous `~/Library/LaunchAgents/com.user.poke-messages.plist` :

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

    Cela s'exécute **toutes les 300 secondes** et **à la connexion**. La première exécution peut déclencher des invites d'**Automatisation** macOS (`osascript` → Messages). Approuvez-les dans la même session utilisateur qui exécute le LaunchAgent.

  </Step>
  <Step title="Le charger">
    ```bash
    launchctl unload ~/Library/LaunchAgents/com.user.poke-messages.plist 2>/dev/null || true
    launchctl load ~/Library/LaunchAgents/com.user.poke-messages.plist
    ```
  </Step>
</Steps>

## Onboarding

BlueBubbles est disponible dans l'onboarding interactif :

```
openclaw onboard
```

L'assistant demande :

<ParamField path="Server URL" type="string" required>
  Adresse du serveur BlueBubbles (par ex. `http://192.168.1.100:1234`).
</ParamField>
<ParamField path="Password" type="string" required>
  Mot de passe API depuis les paramètres du serveur BlueBubbles.
</ParamField>
<ParamField path="Webhook path" type="string" default="/bluebubbles-webhook">
  Chemin du point de terminaison du webhook.
</ParamField>
<ParamField path="DM policy" type="string">
  `pairing`, `allowlist`, `open`, ou `disabled`.
</ParamField>
<ParamField path="Allow list" type="string[]">
  Numéros de téléphone, e-mails ou cibles de chat.
</ParamField>

Vous pouvez également ajouter BlueBubbles via la CLI :

```
openclaw channels add bluebubbles --http-url http://192.168.1.100:1234 --password <password>
```

## Contrôle d'accès (DMs + groupes)

<Tabs>
  <Tab title="DMs">
    - Par défaut : `channels.bluebubbles.dmPolicy = "pairing"`.
    - Les expéditeurs inconnus reçoivent un code de couplage ; les messages sont ignorés jusqu'à approbation (les codes expirent après 1 heure).
    - Approuver via :
      - `openclaw pairing list bluebubbles`
      - `openclaw pairing approve bluebubbles <CODE>`
    - Le couplage est l'échange de jetons par défaut. Détails : [Couplage](/fr/channels/pairing)

  </Tab>
  <Tab title="Groupes">
    - `channels.bluebubbles.groupPolicy = open | allowlist | disabled` (par défaut : `allowlist`).
    - `channels.bluebubbles.groupAllowFrom` contrôle qui peut déclencher dans les groupes lorsque `allowlist` est défini.

  </Tab>
</Tabs>

### Enrichissement du nom des contacts (macOS, optionnel)

Les webhooks de groupe BlueBubbles incluent souvent uniquement les adresses brutes des participants. Si vous souhaitez que le contexte `GroupMembers` affiche plutôt les noms des contacts locaux, vous pouvez activer l'enrichissement local des Contacts sur macOS :

- `channels.bluebubbles.enrichGroupParticipantsFromContacts = true` active la recherche. Par défaut : `false`.
- Les recherches ne s'exécutent qu'après que l'accès au groupe, l'autorisation de commande et le filtrage des mentions ont autorisé le passage du message.
- Seuls les participants par téléphone sans nom sont enrichis.
- Les numéros de téléphone bruts restent utilisés en repli si aucune correspondance locale n'est trouvée.

```json5
{
  channels: {
    bluebubbles: {
      enrichGroupParticipantsFromContacts: true,
    },
  },
}
```

### Filtrage des mentions (groupes)

BlueBubbles prend en charge la limitation par mention pour les discussions de groupe, correspondant au comportement d'iMessage/WhatsApp :

- Utilise `agents.list[].groupChat.mentionPatterns` (ou `messages.groupChat.mentionPatterns`) pour détecter les mentions.
- Lorsque `requireMention` est activé pour un groupe, l'agent ne répond que lorsqu'il est mentionné.
- Les commandes de contrôle des expéditeurs autorisés contournent la limitation par mention.

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

### Limitation des commandes

- Les commandes de contrôle (par exemple, `/config`, `/model`) nécessitent une autorisation.
- Utilise `allowFrom` et `groupAllowFrom` pour déterminer l'autorisation des commandes.
- Les expéditeurs autorisés peuvent exécuter des commandes de contrôle sans avoir besoin de mentionner dans les groupes.

### Invite système par groupe

Chaque entrée sous `channels.bluebubbles.groups.*` accepte une chaîne `systemPrompt` facultative. La valeur est injectée dans l'invite système de l'agent à chaque tour gérant un message dans ce groupe, vous permettant ainsi de définir des règles de personnalité ou de comportement par groupe sans modifier les invites de l'agent :

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

La clé correspond à ce que BlueBubbles signale comme `chatGuid` / `chatIdentifier` / `chatId` numérique pour le groupe, et une entrée générique `"*"` fournit une valeur par défaut pour chaque groupe sans correspondance exacte (même modèle utilisé par `requireMention` et les stratégies d'outil par groupe). Les correspondances exactes l'emportent toujours sur le caractère générique. Les DMs ignorent ce champ ; utilisez plutôt la personnalisation de l'invite au niveau de l'agent ou du compte.

#### Exemple pratique : réponses en fil de discussion et réactions tapback (API privée)

Avec l'API privée BlueBubbles activée, les messages entrants arrivent avec des identifiants de message courts (par exemple `[[reply_to:5]]`) et l'agent peut appeler `action=reply` pour s'insérer dans un message spécifique ou `action=react` pour ajouter une tapback. Un `systemPrompt` par groupe est un moyen fiable de s'assurer que l'agent choisit le bon outil :

```json5
{
  channels: {
    bluebubbles: {
      groups: {
        "iMessage;+;chat-family": {
          systemPrompt: "When replying in this group, always call action=reply with the [[reply_to:N]] messageId from context so your response threads under the triggering message. Never send a new unlinked message. For short acknowledgements ('ok', 'got it', 'on it'), use action=react with an appropriate tapback emoji (❤️, 👍, 😂, ‼️, ❓) instead of sending a text reply.",
        },
      },
    },
  },
}
```

Les réactions Tapback et les réponses en fil de discussion nécessitent toutes deux l'BlueBubbles privée de API ; voir [Actions avancées](#advanced-actions) et [Identifiants de message](#message-ids-short-vs-full) pour la mécanique sous-jacente.

## Liaisons de conversation ACP

Les discussions BlueBubbles peuvent être transformées en espaces de travail ACP durables sans modifier la couche de transport.

Flux rapide pour l'opérateur :

- Exécutez `/acp spawn codex --bind here` dans le DM ou le chat de groupe autorisé.
- Les futurs messages de cette même conversation BlueBubbles sont acheminés vers la session ACP générée.
- `/new` et `/reset` réinitialisent la même session ACP liée sur place.
- `/acp close` ferme la session ACP et supprime la liaison.

Les liaisons persistantes configurées sont également prises en charge via les entrées `bindings[]` de niveau supérieur avec `type: "acp"` et `match.channel: "bluebubbles"`.

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

Voir [Agents ACP](/fr/tools/acp-agents) pour le comportement de liaison ACP partagé.

## Indication de frappe + accusés de lecture

- **Indicateurs de frappe** : Envoyés automatiquement avant et pendant la génération de la réponse.
- **Accusés de lecture** : Contrôlés par `channels.bluebubbles.sendReadReceipts` (par défaut : `true`).
- **Indicateurs de frappe** : OpenClaw envoie des événements de début de frappe ; BlueBubbles efface l'indication de frappe automatiquement à l'envoi ou après expiration (l'arrêt manuel via DELETE n'est pas fiable).

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

BlueBubbles prend en charge les actions avancées de messages lorsqu'elles sont activées dans la configuration :

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

<AccordionGroup>
  <Accordion title="Available actions">
    - **react** : Ajouter/supprimer des réactions de tapback (`messageId`, `emoji`, `remove`). L'ensemble de tapback natif de iMessage est `love`, `like`, `dislike`, `laugh`, `emphasize` et `question`. Lorsqu'un agent choisit un emoji en dehors de cet ensemble (par exemple `👀`), l'outil de réaction revient à `love` afin que le tapback s'affiche toujours au lieu d'échouer toute la requête. Les réactions d'accusé de réception configurées sont toujours validées de manière stricte et génèrent une erreur sur les valeurs inconnues.
    - **edit** : Modifier un message envoyé (`messageId`, `text`).
    - **unsend** : Annuler l'envoi d'un message (`messageId`).
    - **reply** : Répondre à un message spécifique (`messageId`, `text`, `to`).
    - **sendWithEffect** : Envoyer avec un effet iMessage (`text`, `to`, `effectId`).
    - **renameGroup** : Renommer une conversation de groupe (`chatGuid`, `displayName`).
    - **setGroupIcon** : Définir l'icône/photo d'une conversation de groupe (`chatGuid`, `media`) — instable sur macOS 26 Tahoe (API peut renvoyer un succès mais l'icône ne se synchronise pas).
    - **addParticipant** : Ajouter quelqu'un à un groupe (`chatGuid`, `address`).
    - **removeParticipant** : Supprimer quelqu'un d'un groupe (`chatGuid`, `address`).
    - **leaveGroup** : Quitter une conversation de groupe (`chatGuid`).
    - **upload-file** : Envoyer des médias/fichiers (`to`, `buffer`, `filename`, `asVoice`).
      - Mémos vocaux : définissez `asVoice: true` avec de l'audio **MP3** ou **CAF** pour envoyer en tant que message vocal iMessage. BlueBubbles convertit MP3 → CAF lors de l'envoi de mémos vocaux.
    - Alias hérité : `sendAttachment` fonctionne toujours, mais `upload-file` est le nom de l'action canonique.

  </Accordion>
</AccordionGroup>

### Identifiants de message (courts vs complets)

OpenClaw peut présenter des identifiants de message _courts_ (ex : `1`, `2`) pour économiser des jetons.

- `MessageSid` / `ReplyToId` peuvent être des identifiants courts.
- `MessageSidFull` / `ReplyToIdFull` contiennent les identifiants complets du provider.
- Les identifiants courts sont en mémoire ; ils peuvent expirer lors d'un redémarrage ou d'un expulsion du cache.
- Les actions acceptent les identifiants courts ou complets `messageId`, mais les identifiants courts généreront une erreur s'ils ne sont plus disponibles.

Utilisez des identifiants complets pour les automatisations et le stockage durables :

- Modèles : `{{MessageSidFull}}`, `{{ReplyToIdFull}}`
- Contexte : `MessageSidFull` / `ReplyToIdFull` dans les payloads entrants

Voir [Configuration](/fr/gateway/configuration) pour les variables de modèle.

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## Fusion des DMs à envoi fractionné (commande + URL dans une seule composition)

Lorsqu'un utilisateur tape une commande et une URL ensemble dans iMessage — par ex. `Dump https://example.com/article` — Apple divise l'envoi en **deux livraisons webhook distinctes** :

1. Un message texte (`"Dump"`).
2. Un ballon d'aperçu d'URL (`"https://..."`) avec des images d'aperçu OG en pièces jointes.

Les deux webhooks arrivent chez OpenClaw à environ 0,8 à 2,0 s d'intervalle sur la plupart des configurations. Sans fusion, l'agent reçoit la commande seul au tour 1, répond (souvent « envoyez-moi l'URL »), et ne voit l'URL qu'au tour 2 — moment où le contexte de la commande est déjà perdu.

`channels.bluebubbles.coalesceSameSenderDms` active pour un DM la fusion de webhooks consécutifs du même expéditeur en un seul tour d'agent. Les chats de groupe continuent à fonctionner par message pour préserver la structure des tours multi-utilisateurs.

<Tabs>
  <Tab title="Quand activer">
    Activer lorsque :

    - Vous proposez des compétences qui attendent `command + payload` en un seul message (dump, paste, save, queue, etc.).
    - Vos utilisateurs collent des URL, des images ou du contenu long à côté des commandes.
    - Vous pouvez accepter la latence de tour DM ajoutée (voir ci-dessous).

    Laisser désactivé lorsque :

    - Vous avez besoin d'une latence de commande minimale pour les déclencheurs DM d'un seul mot.
    - Tous vos flux sont des commandes ponctuelles sans suivi de payload.

  </Tab>
  <Tab title="Activation">
    ```json5
    {
      channels: {
        bluebubbles: {
          coalesceSameSenderDms: true, // opt in (default: false)
        },
      },
    }
    ```

    Avec le drapeau activé et sans `messages.inbound.byChannel.bluebubbles` explicite, la fenêtre de débounce s'élargit à **2500 ms** (la valeur par défaut pour la non-coalescence est de 500 ms). La fenêtre plus large est nécessaire — le cadencement d'envoi fractionné d'Apple de 0,8-2,0 s ne tient pas dans la valeur par défaut plus serrée.

    Pour ajuster la fenêtre vous-même :

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

  </Tab>
  <Tab title="Compromis">
    - **Latence ajoutée pour les commandes de contrôle DM.** Avec l'indicateur activé, les messages de commande de contrôle DM (tels que `Dump`, `Save`, etc.) attendent désormais jusqu'à la fenêtre de débounce avant l'envoi, au cas où une webhook de payload arriverait. Les commandes de chat de groupe conservent l'envoi instantané.
    - **La sortie fusionnée est limitée** — le texte fusionné est plafonné à 4000 caractères avec un marqueur explicite `…[truncated]` ; les pièces jointes sont plafonnées à 20 ; les entrées sources sont plafonnées à 10 (le premier et les plus récents sont conservés au-delà). Chaque `messageId` source atteint toujours la déduplication entrante (inbound-dedupe), de sorte qu'une rediffusion ultérieure par MessagePoller de tout événement individuel est reconnue comme un doublon.
    - **Opt-in, par channel.** Les autres channels (Telegram, WhatsApp, Slack, …) ne sont pas concernés.

  </Tab>
</Tabs>

### Scénarios et ce que voit l'agent

| Utilisateur compose                                                                          | Apple délivre                  | Drapeau désactivé (par défaut)               | Drapeau activé + fenêtre 2500 ms                                                   |
| -------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| `Dump https://example.com` (un envoi)                                                        | 2 webhooks à ~1 s d'intervalle | Deux tours d'agent : "Dump" seul, puis l'URL | Un tour : texte fusionné `Dump https://example.com`                                |
| `Save this 📎image.jpg caption` (pièce jointe + texte)                                       | 2 webhooks                     | Deux tours                                   | Un tour : texte + image                                                            |
| `/status` (commande autonome)                                                                | 1 webhook                      | Envoi instantané                             | **Attendre jusqu'à la fenêtre, puis envoyer**                                      |
| URL collée seule                                                                             | 1 webhook                      | Envoi instantané                             | Envoi instantané (une seule entrée dans le bucket)                                 |
| Texte + URL envoyés comme deux messages distincts délibérés, à quelques minutes d'intervalle | 2 webhooks hors fenêtre        | Deux tours                                   | Deux tours (la fenêtre expire entre eux)                                           |
| Déluge rapide (>10 petits DM dans la fenêtre)                                                | N webhooks                     | N tours                                      | Un tour, sortie limitée (premier + dernier, plafonds texte/pièce jointe appliqués) |

### Dépannage de la coalescence des envois fractionnés

Si le drapeau est activé et que les envois fractionnés arrivent toujours sous forme de deux tours, vérifiez chaque couche :

<AccordionGroup>
  <Accordion title="Config réellement chargé">
    ```
    grep coalesceSameSenderDms ~/.openclaw/openclaw.json
    ```

    Ensuite `openclaw gateway restart` — l'indicateur est lu lors de la création du registre du debouncer.

  </Accordion>
  <Accordion title="Fenêtre de debounce assez large pour votre configuration">
    Regardez le journal du serveur BlueBubbles sous `~/Library/Logs/bluebubbles-server/main.log`:

    ```
    grep -E "Dispatching event to webhook" main.log | tail -20
    ```

    Mesurez l'écart entre l'envoi du texte de style `"Dump"` et l'envoi `"https://..."; Attachments:` qui suit. Augmentez `messages.inbound.byChannel.bluebubbles` pour couvrir confortablement cet écart.

  </Accordion>
  <Accordion title="Horodatages JSONL de session ≠ arrivée du webhook">
    Les horodatages des événements de session (`~/.openclaw/agents/<id>/sessions/*.jsonl`) indiquent le moment où la passerelle transmet un message à l'agent, et **non** le moment où le webhook est arrivé. Un message mis en file d'attente en second et étiqueté `[Queued messages while agent was busy]` signifie que le premier tour était toujours en cours d'exécution lorsque le second webhook est arrivé — le compartiment de fusion (coalesce bucket) s'était déjà vidé. Ajustez la fenêtre en fonction du journal du serveur BB, et non du journal de session.
  </Accordion>
  <Accordion title="Pression de la mémoire ralentissant l'envoi de la réponse">
    Sur les machines plus petites (8 Go), les tours de l'agent peuvent prendre suffisamment de temps pour que le compartiment de fusion se vide avant que la réponse ne soit terminée, et que l'URL atterrisse comme un second tour mis en file d'attente. Vérifiez `memory_pressure` et `ps -o rss -p $(pgrep openclaw-gateway)` ; si la passerelle dépasse environ 500 Mo de RSS et que le compresseur est actif, fermez d'autres processus gourmands ou passez à un hôte plus grand.
  </Accordion>
  <Accordion title="Les envois de citation de réponse empruntent un chemin différent">
    Si l'utilisateur a appuyé sur `Dump` comme **réponse** à un ballon d'URL existant (iMessage affiche un badge « 1 Reply » sur la bulle de vidage), l'URL se trouve dans `replyToBody`, et non dans un second webhook. La fusion ne s'applique pas — c'est une préoccupation de compétence/prompt, et non de debouncer.
  </Accordion>
</AccordionGroup>

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

## Média + limites

- Les pièces jointes entrantes sont téléchargées et stockées dans le cache média.
- Limite de média via `channels.bluebubbles.mediaMaxMb` pour les médias entrants et sortants (par défaut : 8 Mo).
- Le texte sortant est découpé en morceaux de `channels.bluebubbles.textChunkLimit` (par défaut : 4000 caractères).

## Référence de configuration

Configuration complète : [Configuration](/fr/gateway/configuration)

<AccordionGroup>
  <Accordion title="Connexion et webhook">
    - `channels.bluebubbles.enabled` : Activer/désactiver le channel.
    - `channels.bluebubbles.serverUrl` : URL de base de l'BlueBubbles REST API.
    - `channels.bluebubbles.password` : Mot de passe API.
    - `channels.bluebubbles.webhookPath` : Chemin du point de terminaison webhook (par défaut : `/bluebubbles-webhook`).

  </Accordion>
  <Accordion title="Stratégie d'accès">
    - `channels.bluebubbles.dmPolicy` : `pairing | allowlist | open | disabled` (par défaut : `pairing`).
    - `channels.bluebubbles.allowFrom` : Liste blanche de DM (identifiants, e-mails, numéros E.164, `chat_id:*`, `chat_guid:*`).
    - `channels.bluebubbles.groupPolicy` : `open | allowlist | disabled` (par défaut : `allowlist`).
    - `channels.bluebubbles.groupAllowFrom` : Liste blanche des expéditeurs de groupe.
    - `channels.bluebubbles.enrichGroupParticipantsFromContacts` : Sur macOS, enrichir facultativement les participants anonymes des groupes à partir des Contacts locaux après la vérification. Par défaut : `false`.
    - `channels.bluebubbles.groups` : Configuration par groupe (`requireMention`, etc.).

  </Accordion>
  <Accordion title="Livraison et découpage">
    - `channels.bluebubbles.sendReadReceipts` : Envoyer des accusés de lecture (par défaut : `true`).
    - `channels.bluebubbles.blockStreaming` : Activer le block streaming (par défaut : `false` ; requis pour les réponses en streaming).
    - `channels.bluebubbles.textChunkLimit` : Taille des blocs sortants en caractères (par défaut : 4000).
    - `channels.bluebubbles.sendTimeoutMs` : Délai d'expiration par requête en ms pour l'envoi de texte sortant via `/api/v1/message/text` (par défaut : 30000). À augmenter sur les configurations macOSAPI 26 où les envois iMessage via l'API privée peuvent bloquer pendant plus de 60 secondes dans le framework iMessage ; par exemple `45000` ou `60000`. Les sondages, les recherches de discussion, les réactions, les modifications et les vérifications de santé conservent actuellement le délai par défaut plus court de 10 s ; l'extension de la couverture aux réactions et modifications est prévue dans une suite. Remplacement par compte : `channels.bluebubbles.accounts.<accountId>.sendTimeoutMs`.
    - `channels.bluebubbles.chunkMode` : `length` (par défaut) ne divise que lors du dépassement de `textChunkLimit` ; `newline` divise sur les lignes vides (limites de paragraphes) avant le découpage par longueur.

  </Accordion>
  <Accordion title="Media and history">
    - `channels.bluebubbles.mediaMaxMb` : Limite de média entrant/sortant en Mo (par défaut : 8).
    - `channels.bluebubbles.mediaLocalRoots` : Liste d'autorisation explicite des répertoires locaux absolus autorisés pour les chemins de média locaux sortants. Les envois de chemins locaux sont refusés par défaut, sauf si ceci est configuré. Remplacement par compte : `channels.bluebubbles.accounts.<accountId>.mediaLocalRoots`.
    - `channels.bluebubbles.coalesceSameSenderDms` : Fusionner les webhooks DM consécutifs du même expéditeur en un seul tour d'agent afin que l'envoi fractionné texte+URL d'Apple arrive comme un seul message (par défaut : `false`). Voir [Coalescing split-send DMs](#coalescing-split-send-dms-command--url-in-one-composition) pour les scénarios, le réglage de la fenêtre et les compromis. Élargit la fenêtre de rebond entrante par défaut de 500 ms à 2500 ms lorsqu'elle est activée sans un `messages.inbound.byChannel.bluebubbles` explicite.
    - `channels.bluebubbles.historyLimit` : Nombre maximal de messages de groupe pour le contexte (0 désactive).
    - `channels.bluebubbles.dmHistoryLimit` : Limite d'historique des DM.
    - `channels.bluebubbles.replyContextApiFallback` : Lorsqu'une réponse entrante arrive sans `replyToBody`/`replyToSender` et que le cache de contexte de réponse en mémoire est manquant, récupérer le message original depuis l'API HTTP BlueBubblesAPI en tant que solution de repli de meilleur effort (par défaut : `false`). Utile pour les déploiements multi-instances partageant un seul compte BlueBubbles, après les redémarrages de processus, ou après l'éviction du cache TTL/LRU à longue durée de vie. La récupération est protégée contre les SSRF par la même politique que toute autre demande client BlueBubbles, ne lève jamais d'exception, et remplit le cache pour que les réponses ultérieures en bénéficient. Remplacement par compte : `channels.bluebubbles.accounts.<accountId>.replyContextApiFallback`. Un paramètre au niveau du canal se propage aux comptes qui omettent cet indicateur.

  </Accordion>
  <Accordion title="Actions and accounts">
    - `channels.bluebubbles.actions` : Activer/désactiver des actions spécifiques.
    - `channels.bluebubbles.accounts` : Configuration multi-compte.

  </Accordion>
</AccordionGroup>

Options globales connexes :

- `agents.list[].groupChat.mentionPatterns` (ou `messages.groupChat.mentionPatterns`).
- `messages.responsePrefix`.

## Adressage / cibles de livraison

Préférez `chat_guid` pour un routage stable :

- `chat_guid:iMessage;-;+15555550123` (préféré pour les groupes)
- `chat_id:123`
- `chat_identifier:...`
- Handles directs : `+15555550123`, `user@example.com`
  - Si un handle direct n'a pas de conversation DM existante, OpenClaw en créera une via `POST /api/v1/chat/new`. Cela nécessite que l'API privée BlueBubblesAPI soit activée.

### Routage iMessage vs SMS

Lorsque le même handle possède à la fois une conversation iMessage et une conversation SMS sur le Mac (par exemple un numéro de téléphone enregistré sur iMessage mais qui a également reçu des replis en bulle verte), OpenClaw privilégie la conversation iMessage et ne rétrograde jamais silencieusement vers SMS. Pour forcer la conversation SMS, utilisez un préfixe de cible explicite `sms:` (par exemple `sms:+15555550123`). Les handles sans conversation iMessage correspondante sont toujours envoyés via la conversation que BlueBubbles signale.

## Sécurité

- Les requêtes webhook sont authentifiées en comparant les paramètres de requête ou les en-têtes `guid`/`password` avec `channels.bluebubbles.password`.
- Gardez le mot de passe de l'API et le point de terminaison du webhook secrets (traitez-les comme des identifiants).
- Il n'y a pas de contournement localhost pour l'authentification webhook BlueBubbles. Si vous proxyez le trafic webhook, conservez le mot de passe BlueBubbles de bout en bout sur la requête. `gateway.trustedProxies` ne remplace pas `channels.bluebubbles.password` ici. Voir [Sécurité du Gateway](/fr/gateway/security#reverse-proxy-configuration).
- Activez HTTPS + les règles de pare-feu sur le serveur BlueBubbles s'il est exposé en dehors de votre réseau local.

## Dépannage

- Si les événements de frappe/lecture cessent de fonctionner, vérifiez les journaux webhook BlueBubbles et assurez-vous que le chemin de la passerelle correspond à `channels.bluebubbles.webhookPath`.
- Les codes d'appariement expirent après une heure ; utilisez `openclaw pairing list bluebubbles` et `openclaw pairing approve bluebubbles <code>`.
- Les réactions nécessitent l'API privée BlueBubblesAPI (`POST /api/v1/message/react`) ; assurez-vous que la version du serveur l'expose.
- La modification/ l'annulation d'envoi nécessitent macOS 13+ et une version compatible du serveur BlueBubbles. Sur macOS 26 (Tahoe), la modification est actuellement cassée en raison des modifications de l'API privée.
- Les mises à jour des icônes de groupe peuvent être instables sur macOS 26 (Tahoe) : l'API peut renvoyer un succès mais la nouvelle icône ne se synchronise pas.
- OpenClaw masque automatiquement les actions connues comme défectueuses en fonction de la version macOS du serveur BlueBubbles. Si l'édition apparaît toujours sur macOS 26 (Tahoe), désactivez-la manuellement avec OpenClawBlueBubblesmacOSmacOS`channels.bluebubbles.actions.edit=false`.
- `coalesceSameSenderDms` activé mais les envois fractionnés (ex. `Dump` + URL) arrivent toujours sous forme de deux tours : consultez la liste de contrôle [split-send coalescing troubleshooting](#split-send-coalescing-troubleshooting) — les causes courantes sont une fenêtre de débounce trop stricte, les horodatages des journaux de session mal interprétés comme l'arrivée du webhook, ou un envoi de citation de réponse (qui utilise `replyToBody`, et non un deuxième webhook).
- Pour les informations d'état/santé : `openclaw status --all` ou `openclaw status --deep`.

Pour une référence générale du flux de travail des channels, consultez [Channels](/fr/channels) et le guide [Plugins](/fr/tools/plugin).

## Connexes

- [Channel Routing](/fr/channels/channel-routing) — routage de session pour les messages
- [Channels Overview](/fr/channels) — tous les channels pris en charge
- [Groups](/fr/channels/groups) — comportement des discussions de groupe et contrôle des mentions
- [Pairing](/fr/channels/pairing) — authentification DM et flux de jumelage
- [Security](/fr/gateway/security) — modèle d'accès et durcissement
