---
summary: "BlueBubblesiMessageMigrez les anciennes configurations BlueBubbles vers le plugin iMessage intégré sans perdre les appairages, les listes d'autorisation ou les liaisons de groupe."
read_when:
  - Planning a move from BlueBubbles to the bundled iMessage plugin
  - Translating BlueBubbles config keys to iMessage equivalents
  - Verifying imsg before enabling the iMessage plugin
title: "BlueBubblesProvenance de BlueBubbles"
---

Le greffon `imessage` intégré atteint désormais la même surface de API privée que BlueBubbles (`react`, `edit`, `unsend`, `reply`, `sendWithEffect`, gestion de groupe, pièces jointes) en pilotant [`steipete/imsg`](https://github.com/steipete/imsg) via JSON-RPC. Si vous exécutez déjà un Mac avec `imsg` installé, vous pouvez abandonner le serveur BlueBubbles et laisser le greffon communiquer directement avec Messages.app.

Le support de BlueBubbles a été supprimé. OpenClaw prend en charge iMessage exclusivement via `imsg`. Ce guide sert à migrer les anciennes configurations `channels.bluebubbles` vers `channels.imessage` ; il n'y a pas d'autre chemin de migration pris en charge.

## Quand cette migration est pertinente

- Vous exécutez déjà `imsg` sur le même Mac (ou un accessible via SSH) où Messages.app est connecté.
- Vous souhaitez réduire le nombre de pièces mobiles — pas de serveur BlueBubbles distinct, pas de point de terminaison REST à authentifier, pas de plomberie webhook. Un binaire CLI unique au lieu d'un serveur + application client + assistant.
- Vous êtes sur une [build macOS / `imsg` prise en charge](/fr/channels/imessage#requirements-and-permissions-macos) où la sonde de l'API privée signale `available: true`.

## Ce que fait imsg

`imsg` est une macOS CLI locale pour Messages. OpenClaw démarre `imsg rpc` en tant que processus enfant et communique en JSON-RPC via stdin/stdout. Il n'y a pas de serveur HTTP, d'URL de webhook, de démon d'arrière-plan, d'agent de lancement ou de port à exposer.

- Les lectures proviennent de `~/Library/Messages/chat.db` en utilisant un handle SQLite en lecture seule.
- Les messages entrants en direct proviennent de `imsg watch` / `watch.subscribe`, qui suit les événements du système de fichiers `chat.db` avec un repli par sondage.
- Les envois utilisent l'automatisation de Messages.app pour les envois de texte et de fichiers normaux.
- Les actions avancées utilisent `imsg launch` pour injecter le programme utilitaire `imsg` dans Messages.app. C'est ce qui permet d'accéder aux accusés de lecture, aux indicateurs de frappe, aux envois enrichis, à l'édition, à l'annulation d'envoi, aux réponses en fil de discussion, aux tapbacks et à la gestion des groupes.
- Les versions Linux peuvent inspecter une copie de `chat.db`, mais ne peuvent pas envoyer, surveiller la base de données Mac en direct ni contrôler Messages.app. Pour OpenClaw iMessage, exécutez `imsg` sur le Mac connecté ou via un wrapper SSH vers ce Mac.

## Avant de commencer

1. Installez `imsg` sur le Mac qui exécute Messages.app :

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg chats --limit 3
   ```

   Si `imsg chats` échoue avec `unable to open database file`, une sortie vide, ou `authorization denied`, accordez l'accès complet au disque au terminal, à l'éditeur, au processus Node, au service Gateway ou au processus parent SSH qui lance `imsg`, puis rouvrez ce processus parent.

2. Vérifiez les surfaces de lecture, de surveillance, d'envoi et de RPC avant de modifier la configuration OpenClaw :

   ```bash
   imsg chats --limit 10 --json | jq -s
   imsg history --chat-id 42 --limit 10 --attachments --json | jq -s
   imsg watch --chat-id 42 --reactions --json
   imsg send --chat-id 42 --text "OpenClaw imsg test"
   imsg rpc --help
   ```

   Remplacez `42` par un identifiant de conversation réel provenant de `imsg chats`. L'envoi nécessite l'autorisation d'automatisation pour Messages.app. Si OpenClaw doit s'exécuter via SSH, exécutez ces commandes via le même wrapper SSH ou le même contexte utilisateur que OpenClaw utilisera.

3. Activez le pont de l'API privée lorsque vous avez besoin d'actions avancées :

   ```bash
   imsg launch
   imsg status --json
   ```

   `imsg launch` nécessite que SIP soit désactivé. L'envoi basique, l'historique et la surveillance fonctionnent sans `imsg launch` ; les actions avancées non.

4. Vérifiez le pont via OpenClaw :

   ```bash
   openclaw channels status --probe
   ```

   Vous voulez `imessage.privateApi.available: true`. S'il signale `false`, corrigez cela d'abord — voir [Détection des capacités](/fr/channels/imessage#private-api-actions).

5. Prenez un instantané de votre configuration :

   ```bash
   cp ~/.openclaw/openclaw.json5 ~/.openclaw/openclaw.json5.bak
   ```

## Traduction de la configuration

iMessage et BlueBubblesCLI partagent une grande partie de la configuration au niveau du canal. Les clés qui changent sont principalement liées au transport (serveur REST vs CLI local). Les clés de comportement (`dmPolicy`, `groupPolicy`, `allowFrom`, etc.) gardent la même signification.

| BlueBubbles                                                | iMessage inclus                           | Notes                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `channels.bluebubbles.enabled`                             | `channels.imessage.enabled`               | Même sémantique.                                                                                                                                                                                                                                                                                                                                                                            |
| `channels.bluebubbles.serverUrl`                           | _(supprimé)_                              | Pas de serveur REST — le plugin lance `imsg rpc` via stdio.                                                                                                                                                                                                                                                                                                                                 |
| `channels.bluebubbles.password`                            | _(supprimé)_                              | Aucune authentification de webhook requise.                                                                                                                                                                                                                                                                                                                                                 |
| _(implicite)_                                              | `channels.imessage.cliPath`               | Chemin vers `imsg` (défaut `imsg`) ; utilisez un script enveloppe pour SSH.                                                                                                                                                                                                                                                                                                                 |
| _(implicite)_                                              | `channels.imessage.dbPath`                | Remplacement facultatif de `chat.db` de Messages.app ; détecté automatiquement si omis.                                                                                                                                                                                                                                                                                                     |
| _(implicite)_                                              | `channels.imessage.remoteHost`            | `host` ou `user@host` — nécessaire uniquement si `cliPath` est un enveloppeur SSH et que vous souhaitez des récupérations de pièces jointes SCP.                                                                                                                                                                                                                                            |
| `channels.bluebubbles.dmPolicy`                            | `channels.imessage.dmPolicy`              | Mêmes valeurs (`pairing` / `allowlist` / `open` / `disabled`).                                                                                                                                                                                                                                                                                                                              |
| `channels.bluebubbles.allowFrom`                           | `channels.imessage.allowFrom`             | Les approbations d'appariement sont transférées par identifiant (handle), et non par jeton.                                                                                                                                                                                                                                                                                                 |
| `channels.bluebubbles.groupPolicy`                         | `channels.imessage.groupPolicy`           | Mêmes valeurs (`allowlist` / `open` / `disabled`).                                                                                                                                                                                                                                                                                                                                          |
| `channels.bluebubbles.groupAllowFrom`                      | `channels.imessage.groupAllowFrom`        | Identique.                                                                                                                                                                                                                                                                                                                                                                                  |
| `channels.bluebubbles.groups`                              | `channels.imessage.groups`                | **Copiez ceci tel quel, y compris toute entrée générique `groups: { "*": { ... } }`.** Par groupe, `requireMention`, `tools`, `toolsBySender` sont conservés. Avec `groupPolicy: "allowlist"`, un bloc `groups` vide ou manquant supprime silencieusement tous les messages de groupe — voir « Group registry footgun » ci-dessous.                                                         |
| `channels.bluebubbles.sendReadReceipts`                    | `channels.imessage.sendReadReceipts`      | `true`API par défaut. Avec le plugin intégré, cela ne se déclenche que lorsque la sonde de l'API privée est active.                                                                                                                                                                                                                                                                         |
| `channels.bluebubbles.includeAttachments`                  | `channels.imessage.includeAttachments`    | Même forme, **même désactivé par défaut**. Si vous aviez des pièces jointes circulant sur BlueBubbles, vous devez le redéfinir explicitement sur le bloc iMessage — cela ne se transfère pas implicitement, et les photos/médias entrants seront silencieusement ignorés sans ligne de log BlueBubblesiMessage`Inbound message` jusqu'à ce que vous le fassiez.                             |
| `channels.bluebubbles.attachmentRoots`                     | `channels.imessage.attachmentRoots`       | Racines locales ; mêmes règles de caractère générique.                                                                                                                                                                                                                                                                                                                                      |
| _(N/A)_                                                    | `channels.imessage.remoteAttachmentRoots` | Utilisé uniquement lorsque `remoteHost` est défini pour les récupérations SCP.                                                                                                                                                                                                                                                                                                              |
| `channels.bluebubbles.mediaMaxMb`                          | `channels.imessage.mediaMaxMb`            | 16 Mo par défaut sur iMessage (la valeur par défaut de BlueBubbles était de 8 Mo). Définissez explicitement si vous souhaitez conserver la limite inférieure.                                                                                                                                                                                                                               |
| `channels.bluebubbles.textChunkLimit`                      | `channels.imessage.textChunkLimit`        | 4000 par défaut pour les deux.                                                                                                                                                                                                                                                                                                                                                              |
| `channels.bluebubbles.coalesceSameSenderDms`               | `channels.imessage.coalesceSameSenderDms` | Même opt-in. DM uniquement — les conversations de groupe conservent l'expédition instantanée par message sur les deux canaux. Élargit le débounce entrant par défaut à 2500 ms lorsqu'il est activé sans explicite `messages.inbound.byChannel.imessage`. Voir docs iMessage § Coalescing split-send DMs (/en/channels/imessage#coalescing-split-send-dms-command--url-in-one-composition). |
| `channels.bluebubbles.enrichGroupParticipantsFromContacts` | _(N/A)_                                   | iMessage lit déjà les noms d'affichage de l'expéditeur à partir de `chat.db`.                                                                                                                                                                                                                                                                                                               |
| `channels.bluebubbles.actions.*`                           | `channels.imessage.actions.*`             | Interrupteurs par action : `reactions`, `edit`, `unsend`, `reply`, `sendWithEffect`, `renameGroup`, `setGroupIcon`, `addParticipant`, `removeParticipant`, `leaveGroup`, `sendAttachment`.                                                                                                                                                                                                  |

Les configurations multi-comptes (`channels.bluebubbles.accounts.*`) se traduisent en un pour un vers `channels.imessage.accounts.*`.

## Pied-de-pied du registre de groupe

Le plugin iMessage intégré exécute **deux** portes de liste d'autorisation de groupe distinctes consécutivement. Les deux doivent être réussies pour qu'un message de groupe atteigne l'agent :

1. **Liste d'autorisation de l'expéditeur / de la cible de chat** (`channels.imessage.groupAllowFrom`) — vérifiée par `isAllowedIMessageSender`. Fait correspondre les messages entrants par le handle de l'expéditeur, `chat_guid`, `chat_identifier`, ou `chat_id`. Même forme que BlueBubbles.
2. **Registre de groupe** (`channels.imessage.groups`) — vérifié par `resolveChannelGroupPolicy` de `inbound-processing.ts:199`. Avec `groupPolicy: "allowlist"`, cette porte nécessite soit :
   - une entrée générique `groups: { "*": { ... } }` (définit `allowAll = true`), ou
   - une entrée explicite par `chat_id` sous `groups`.

Si la porte 1 réussit mais que la porte 2 échoue, le message est supprimé. Le plugin émet deux signaux de niveau `warn` afin que cela ne soit plus silencieux au niveau de journalisation par défaut :

- Un `warn` de démarrage unique par compte lorsque `groupPolicy: "allowlist"` est défini mais que `channels.imessage.groups` est vide (pas de caractère générique `"*"`, pas d'entrées par `chat_id`) — déclenché avant l'arrivée de tout message.
- Un `warn` unique par `chat_id` la première fois qu'un groupe spécifique est déposé lors de l'exécution, nommant le chat_id et la clé exacte à ajouter à `groups` pour l'autoriser.

Les DMs continuent de fonctionner car ils empruntent un chemin de code différent.

C'est le mode d'échec de migration le plus courant de BlueBubblesiMessage vers iMessage intégré : les opérateurs copient `groupAllowFrom` et `groupPolicy` mais ignorent le bloc `groups`, car BlueBubbles' `groups: { "*": { "requireMention": true } }` ressemble à un paramètre de mention sans rapport. C'est en fait essentiel pour le registry gate.

La configuration minimale pour garder les messages de groupe actifs après `groupPolicy: "allowlist"` :

```json5
{
  channels: {
    imessage: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15555550123", "chat_guid:any;-;..."],
      groups: {
        "*": { requireMention: true },
      },
    },
  },
}
```

`requireMention: true` sous `*` est inoffensif lorsqu'aucun modèle de mention n'est configuré : le runtime définit `canDetectMention = false` et court-circuite la suppression des mentions à `inbound-processing.ts:512`. Avec des modèles de mention configurés (`agents.list[].groupChat.mentionPatterns`), cela fonctionne comme prévu.

Si la passerelle enregistre `imessage: dropping group message from chat_id=<id>` ou la ligne de démarrage `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty`, la porte 2 est bloquée — ajoutez le bloc `groups`.

## Étape par étape

1. Ajoutez un bloc iMessage à côté du bloc BlueBubbles existant. Conservez l'ancien bloc uniquement comme source de copie jusqu'à ce que le nouveau chemin soit vérifié :

   ```json5
   {
     channels: {
       bluebubbles: {
         enabled: true,
         // ... existing config ...
       },
       imessage: {
         enabled: false, // turn on after the dry run below
         cliPath: "/opt/homebrew/bin/imsg",
         dmPolicy: "pairing",
         allowFrom: ["+15555550123"], // copy from bluebubbles.allowFrom
         groupPolicy: "allowlist",
         groupAllowFrom: [], // copy from bluebubbles.groupAllowFrom
         groups: { "*": { requireMention: true } }, // copy from bluebubbles.groups — silently drops groups if missing, see "Group registry footgun" above
         actions: {
           reactions: true,
           edit: true,
           unsend: true,
           reply: true,
           sendWithEffect: true,
           sendAttachment: true,
         },
       },
     },
   }
   ```

2. **Test à blanc** — démarrez la passerelle et confirmez que iMessage signale un bon état :

   ```bash
   openclaw gateway
   openclaw channels status
   openclaw channels status --probe   # expect imessage.privateApi.available: true
   ```

   Comme `imessage.enabled` est encore `false`, aucun trafic iMessage entrant n'est encore routé — mais `--probe` exerce le pont pour que vous détectiez les problèmes de permissions/d'installation avant le basculement.

3. **Basculez.** Supprimez la configuration BlueBubbles et activez iMessage en une seule modification de configuration :

   ```json5
   {
     channels: {
       imessage: { enabled: true /* ... */ },
     },
   }
   ```

   Redémarrez la passerelle. Le trafic iMessage entrant passe désormais par le plugin intégré.

4. **Vérifiez les DMs.** Envoyez un message direct à l'agent ; confirmez que la réponse est bien reçue.

5. **Vérifiez les groupes séparément.** Les DMs et les groupes empruntent des chemins de code différents — la réussite des DMs ne prouve pas que les groupes sont acheminés. Envoyez un message à l'agent dans une conversation de groupe appariée et confirmez que la réponse est reçue. Si le groupe reste silencieux (pas de réponse de l'agent, pas d'erreur), vérifiez le journal de la passerelle pour `imessage: dropping group message from chat_id=<id>` ou la ligne de démarrage `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty` — les deux s'affichent au niveau de journal par défaut. Si l'un ou l'autre apparaît, votre bloc `groups` est manquant ou vide — voir "Group registry footgun" ci-dessus.

6. **Vérifier la surface des actions** — depuis un DM apparié, demandez à l'agent de réagir, d'éditer, d'annuler l'envoi, de répondre, d'envoyer une photo et (dans un groupe) de renommer le groupe / d'ajouter ou de supprimer un participant. Chaque action doit apparaître nativement dans Messages.app. Si une action renvoie "iMessage iMessage`<action>`API requires the imsg private API bridge", exécutez à nouveau `imsg launch` et actualisez `channels status --probe`.

7. **Supprimer le serveur et la configuration BlueBubbles** une fois que les DM iMessage, les groupes et les actions sont vérifiés. OpenClaw n'utilisera pas BlueBubblesiMessageOpenClaw`channels.bluebubbles`.

## Parité des actions en un coup d'œil

| Action                                                                          | BlueBubbles hérité                                       | iMessage intégré                                                                                                           |
| ------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Envoyer du texte / repli SMS                                                    | ✅                                                       | ✅                                                                                                                         |
| Envoyer des médias (photo, vidéo, fichier, voix)                                | ✅                                                       | ✅                                                                                                                         |
| Réponse en fil de discussion (`reply_to_guid`)                                  | ✅                                                       | ✅ (clôt [#51892](https://github.com/openclaw/openclaw/issues/51892))                                                      |
| Tapback (`react`)                                                               | ✅                                                       | ✅                                                                                                                         |
| Modifier / annuler l'envoi (destinataires macOS 13+)                            | ✅                                                       | ✅                                                                                                                         |
| Envoyer avec un effet d'écran                                                   | ✅                                                       | ✅ (clôt une partie de [#9394](https://github.com/openclaw/openclaw/issues/9394))                                          |
| Texte riche gras / italique / souligné / barré                                  | ✅                                                       | ✅ (formatage typed-run via attributedBody)                                                                                |
| Renommer le groupe / définir l'icône du groupe                                  | ✅                                                       | ✅                                                                                                                         |
| Ajouter / supprimer un participant, quitter le groupe                           | ✅                                                       | ✅                                                                                                                         |
| Accusés de lecture et indicateur de frappe                                      | ✅                                                       | ✅ (dépend de la détection de l'API privé)                                                                                 |
| Fusion de DM du même expéditeur                                                 | ✅                                                       | ✅ (DM uniquement ; optionnel via `channels.imessage.coalesceSameSenderDms`)                                               |
| Rattrapage des messages entrants reçus pendant que la passerelle est hors ligne | ✅ (relecture de webhook + récupération de l'historique) | ✅ (optionnel via `channels.imessage.catchup.enabled` ; ferme [#78649](https://github.com/openclaw/openclaw/issues/78649)) |

Le rattrapage iMessage est désormais disponible en option sur le plugin intégré. Au démarrage de la passerelle, si `channels.imessage.catchup.enabled` est `true`, la passerelle effectue une passe `chats.list` + `messages.history` par discussion sur le même client JSON-RPC utilisé par `imsg watch`, rejoue chaque ligne entrante manquée via le chemin de diffusion en direct (listes d'autorisation, stratégie de groupe, anti-rebond, cache d'écho), et persiste un curseur par compte pour que les démarrages suivants reprennent là où ils se sont arrêtés. Voir [Catching up after gateway downtime](/fr/channels/imessage#catching-up-after-gateway-downtime) pour le réglage.

## Appairage, sessions et liaisons ACP

- **Approbations de jumelage** sont transférées par identifiant. Vous n'avez pas besoin d'approuver à nouveau les expéditeurs connus — `channels.imessage.allowFrom` reconnaît les mêmes chaînes `+15555550123` / `user@example.com` que BlueBubbles utilisait.
- **Les sessions** restent limitées par agent + chat. Les DMs sont regroupés dans la session principale de l'agent par défaut `session.dmScope=main` ; les sessions de groupe restent isolées par `chat_id`. Les clés de session diffèrent (`agent:<id>:imessage:group:<chat_id>` par rapport à l'équivalent BlueBubbles) — l'historique des conversations sous les clés de session BlueBubbles ne s'applique pas aux sessions iMessage.
- Les **liaisons ACP** référençant `match.channel: "bluebubbles"` doivent être mises à jour vers `"imessage"`. Les formes de `match.peer.id` (`chat_id:`, `chat_guid:`, `chat_identifier:`, bare handle) sont identiques.

## Pas de channel de retour (rollback)

Il n'existe aucun environnement d'exécution BlueBubbles pris en charge pour revenir en arrière. Si la vérification iMessage échoue, définissez `channels.imessage.enabled: false`, redémarrez le Gateway, corrigez le bloqueur `imsg` et réessayez la migration.

Le cache de réponses se trouve dans `~/.openclaw/state/imessage/reply-cache.jsonl` (mode `0600`, répertoire parent `0700`). Il est possible de le supprimer si vous souhaitez repartir de zéro.

## Connexes

- [iMessage](/fr/channels/imessage) — référence complète du channel iMessage, y compris la configuration `imsg launch` et la détection des capacités.
- `/channels/bluebubbles` — ancienne URL qui redirige vers ce guide de migration.
- [Appairage](/fr/channels/pairing) — authentification et flux d'appairage DM.
- [Channel Routing](/fr/channels/channel-routing) — comment la passerelle choisit un channel pour les réponses sortantes.
