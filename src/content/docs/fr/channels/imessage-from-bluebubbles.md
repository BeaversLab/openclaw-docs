---
summary: "BlueBubblesiMessageMigrez les anciennes configurations BlueBubbles vers le plugin iMessage intégré sans perdre les appairages, les listes d'autorisation ou les liaisons de groupe."
read_when:
  - Planning a move from BlueBubbles to the bundled iMessage plugin
  - Translating BlueBubbles config keys to iMessage equivalents
  - Verifying imsg before enabling the iMessage plugin
title: "BlueBubblesProvenance de BlueBubbles"
---

Le plugin `imessage` intégré atteint désormais la même surface d'API privée que BlueBubbles (`react`, `edit`, `unsend`, `reply`, `sendWithEffect`, gestion des groupes, pièces jointes) en pilotant [`steipete/imsg`](https://github.com/steipete/imsg) via JSON-RPC. Si vous utilisez déjà un Mac avec `imsg` installé, vous pouvez abandonner le serveur BlueBubbles et laisser le plugin communiquer directement avec Messages.app.

Le support de BlueBubbles a été supprimé. OpenClaw prend en charge iMessage exclusivement via `imsg`. Ce guide sert à migrer les anciennes configurations `channels.bluebubbles` vers `channels.imessage` ; il n'y a pas d'autre chemin de migration pris en charge.

<Note>Pour la courte annonce et le résumé à l'attention des opérateurs, consultez [Suppression de BlueBubbles et le chemin iMessage imsg](/fr/announcements/bluebubbles-imessage).</Note>

## Liste de vérification de la migration

Utilisez cette liste de vérification lorsque vous connaissez déjà votre ancienne configuration BlueBubbles et que vous souhaitez le chemin le plus court et le plus sûr :

1. Vérifiez `imsg` directement sur le Mac qui exécute Messages.app (`imsg chats`, `imsg history`, `imsg send`, et `imsg rpc --help`).
2. Copiez les clés de comportement de `channels.bluebubbles` vers `channels.imessage` : `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`, `includeAttachments`, `attachmentRoots`, `mediaMaxMb`, `textChunkLimit`, `coalesceSameSenderDms`, et `actions`.
3. Supprimez les clés de transport qui n'existent plus : `serverUrl`, `password`, les URL de webhook et la configuration du serveur BlueBubbles.
4. Si le Gateway ne fonctionne pas sur le Mac Messages, définissez `channels.imessage.cliPath` sur un wrapper SSH et définissez `remoteHost` pour la récupération à distance des pièces jointes.
5. Avec le Gateway arrêté, activez `channels.imessage`, puis exécutez `openclaw channels status --probe --channel imessage`.
6. Testez un DM, un groupe autorisé, les pièces jointes si activées, et chaque action privée de l'API que vous attendez de l'agent.
7. Supprimez le serveur BlueBubbles et l'ancienne config BlueBubbles`channels.bluebubbles`iMessage une fois le chemin iMessage vérifié.

## Quand cette migration a du sens

- Vous exécutez déjà `imsg` sur le même Mac (ou un accessible via SSH) où Messages.app est connecté.
- Vous voulez réduire les pièces mobiles — pas de serveur BlueBubbles séparé, pas de point de terminaison REST à authentifier, pas de plomberie webhook. Un seul binaire CLI au lieu d'un serveur + application client + assistant.
- Vous êtes sur une [build macOS / `imsg` prise en charge](/fr/channels/imessage#requirements-and-permissions-macos) où la sonde de l'API privée signale `available: true`.

## Ce que fait imsg

`imsg`macOSCLIOpenClaw est une CLI macOS locale pour Messages. OpenClaw démarre `imsg rpc`RPC en tant que processus enfant et communique via JSON-RPC sur stdin/stdout. Il n'y a pas de serveur HTTP, d'URL webhook, de démon d'arrière-plan, d'agent de lancement ou de port à exposer.

- Les lectures proviennent de `~/Library/Messages/chat.db` en utilisant un handle SQLite en lecture seule.
- Les messages entrants en direct proviennent de `imsg watch` / `watch.subscribe`, qui suit les événements du système de fichiers `chat.db` avec un repli par sondage.
- Les envois utilisent l'automatisation de Messages.app pour l'envoi normal de texte et de fichiers.
- Les actions avancées utilisent `imsg launch` pour injecter l'assistant `imsg` dans Messages.app. C'est ce qui déverrouille les accusés de réception, les indicateurs de frappe, les envois enrichis, l'édition, l'annulation d'envoi, la réponse en fil, les tapbacks et la gestion de groupe.
- Les builds Linux peuvent inspecter une copie de Linux`chat.db`OpenClawiMessage, mais ne peuvent pas envoyer, surveiller la base de données Mac en direct, ou piloter Messages.app. Pour iMessage OpenClaw, exécutez `imsg` sur le Mac connecté ou via un wrapper SSH vers ce Mac.

## Avant de commencer

1. Installez `imsg` sur le Mac qui exécute Messages.app :

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg chats --limit 3
   ```

   Si `imsg chats` échoue avec `unable to open database file`, une sortie vide, ou `authorization denied`Gateway, accordez l'accès complet au disque au terminal, à l'éditeur, au processus Node, au service Gateway, ou au processus parent SSH qui lance `imsg`, puis rouvrez ce processus parent.

2. Vérifiez les surfaces de lecture, de surveillance, d'envoi et RPC avant de modifier la configuration OpenClaw :

   ```bash
   imsg chats --limit 10 --json | jq -s
   imsg history --chat-id 42 --limit 10 --attachments --json | jq -s
   imsg watch --chat-id 42 --reactions --json
   imsg send --chat-id 42 --text "OpenClaw imsg test"
   imsg rpc --help
   ```

   Remplacez `42` par un identifiant de conversation réel provenant de `imsg chats`. L'envoi nécessite l'autorisation Automatisation pour Messages.app. Si OpenClaw doit fonctionner via SSH, exécutez ces commandes via le même wrapper SSH ou le même contexte utilisateur que OpenClaw utilisera. Si les lectures/sondes fonctionnent mais que les envois échouent avec AppleEvents `-1743`, vérifiez si l'Automatisation a atterri sur `/usr/libexec/sshd-keygen-wrapper` ; voir [SSH wrapper sends fail with AppleEvents -1743](/fr/channels/imessage#ssh-wrapper-sends-fail-with-appleevents-1743).

3. Activez le pont de l'API privée lorsque vous avez besoin d'actions avancées :

   ```bash
   imsg launch
   imsg status --json
   ```

   `imsg launch` nécessite que SIP soit désactivé. L'envoi basique, l'historique et la surveillance fonctionnent sans `imsg launch` ; les actions avancées non.

4. Après avoir ajouté une configuration `channels.imessage` activée, vérifiez le pont via OpenClaw :

   ```bash
   openclaw channels status --probe
   ```

   Vous voulez `imessage.privateApi.available: true`. S'il indique `false`, corrigez cela d'abord — voir [Détection des capacités](/fr/channels/imessage#private-api-actions). `channels status --probe` sonde uniquement les comptes configurés et activés.

5. Sauvegardez votre configuration :

   ```bash
   cp ~/.openclaw/openclaw.json5 ~/.openclaw/openclaw.json5.bak
   ```

## Traduction de la configuration

iMessage et BlueBubbles partagent une grande partie de la configuration au niveau du canal. Les clés qui changent sont principalement liées au transport (serveur REST vs CLI local). Les clés de comportement (`dmPolicy`, `groupPolicy`, `allowFrom`, etc.) gardent la même signification.

| BlueBubbles                                                | iMessage intégré                          | Notes                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `channels.bluebubbles.enabled`                             | `channels.imessage.enabled`               | Même sémantique.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `channels.bluebubbles.serverUrl`                           | _(supprimé)_                              | Pas de serveur REST — le plugin génère `imsg rpc` via stdio.                                                                                                                                                                                                                                                                                                                                                                        |
| `channels.bluebubbles.password`                            | _(supprimé)_                              | Pas d'authentification webhook nécessaire.                                                                                                                                                                                                                                                                                                                                                                                          |
| _(implicite)_                                              | `channels.imessage.cliPath`               | Chemin vers `imsg` (par défaut `imsg`) ; utilisez un script enveloppe pour SSH.                                                                                                                                                                                                                                                                                                                                                     |
| _(implicite)_                                              | `channels.imessage.dbPath`                | Remplacement facultatif de `chat.db` de Messages.app ; détecté automatiquement si omis.                                                                                                                                                                                                                                                                                                                                             |
| _(implicite)_                                              | `channels.imessage.remoteHost`            | `host` ou `user@host` — nécessaire uniquement lorsque `cliPath` est un enveloppeur SSH et que vous voulez des récupérations de pièces jointes SCP.                                                                                                                                                                                                                                                                                  |
| `channels.bluebubbles.dmPolicy`                            | `channels.imessage.dmPolicy`              | Mêmes valeurs (`pairing` / `allowlist` / `open` / `disabled`).                                                                                                                                                                                                                                                                                                                                                                      |
| `channels.bluebubbles.allowFrom`                           | `channels.imessage.allowFrom`             | Les approbations d'appariement sont transférées par identifiant, et non par jeton.                                                                                                                                                                                                                                                                                                                                                  |
| `channels.bluebubbles.groupPolicy`                         | `channels.imessage.groupPolicy`           | Mêmes valeurs (`allowlist` / `open` / `disabled`).                                                                                                                                                                                                                                                                                                                                                                                  |
| `channels.bluebubbles.groupAllowFrom`                      | `channels.imessage.groupAllowFrom`        | Identique.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `channels.bluebubbles.groups`                              | `channels.imessage.groups`                | **Copiez ceci tel quel, y compris toute entrée générique `groups: { "*": { ... } }`.** Les `requireMention`, `tools` et `toolsBySender` par groupe sont conservés. Avec `groupPolicy: "allowlist"`, un bloc `groups` vide ou manquant supprime silencieusement tous les messages de groupe — voir « Group registry footgun » ci-dessous.                                                                                            |
| `channels.bluebubbles.sendReadReceipts`                    | `channels.imessage.sendReadReceipts`      | `true` par défaut. Avec le plugin inclus, cela ne se déclenche que lorsque la sonde de l'API privée API est active.                                                                                                                                                                                                                                                                                                                 |
| `channels.bluebubbles.includeAttachments`                  | `channels.imessage.includeAttachments`    | Même forme, **désactivé par défaut**. Si vous aviez des pièces jointes qui circulaient sur BlueBubbles, vous devez le redéfinir explicitement sur le bloc iMessage — cela ne se reporte pas implicitement, et les photos/médias entrants seront silencieusement ignorés sans ligne de journal BlueBubblesiMessage`Inbound message` tant que vous ne le faites pas.                                                                  |
| `channels.bluebubbles.attachmentRoots`                     | `channels.imessage.attachmentRoots`       | Racines locales ; mêmes règles de caractère générique.                                                                                                                                                                                                                                                                                                                                                                              |
| _(N/A)_                                                    | `channels.imessage.remoteAttachmentRoots` | Utilisé uniquement lorsque `remoteHost` est défini pour les récupérations SCP.                                                                                                                                                                                                                                                                                                                                                      |
| `channels.bluebubbles.mediaMaxMb`                          | `channels.imessage.mediaMaxMb`            | Par défaut 16 Mo sur iMessage (le défaut BlueBubbles était de 8 Mo). Définissez explicitement si vous souhaitez conserver la limite inférieure.                                                                                                                                                                                                                                                                                     |
| `channels.bluebubbles.textChunkLimit`                      | `channels.imessage.textChunkLimit`        | Par défaut 4000 pour les deux.                                                                                                                                                                                                                                                                                                                                                                                                      |
| `channels.bluebubbles.coalesceSameSenderDms`               | `channels.imessage.coalesceSameSenderDms` | Même option d'activation. Uniquement pour les DM — les discussions de groupe conservent l'envoi instantané par message sur les deux canaux. Élargit le rebond d'entrée par défaut à 2500 ms lorsqu'il est activé sans un `messages.inbound.byChannel.imessage` explicite. Voir la documentation iMessage § Regroupement des DM d'envoi fractionné(/en/channels/imessage#coalescing-split-send-dms-command--url-in-one-composition). |
| `channels.bluebubbles.enrichGroupParticipantsFromContacts` | _(N/A)_                                   | Le iMessage lit déjà les noms d'affichage des expéditeurs depuis `chat.db`.                                                                                                                                                                                                                                                                                                                                                         |
| `channels.bluebubbles.actions.*`                           | `channels.imessage.actions.*`             | Interrupteurs par action : `reactions`, `edit`, `unsend`, `reply`, `sendWithEffect`, `renameGroup`, `setGroupIcon`, `addParticipant`, `removeParticipant`, `leaveGroup`, `sendAttachment`.                                                                                                                                                                                                                                          |

Les configurations multi-comptes (`channels.bluebubbles.accounts.*`) se traduisent un pour un en `channels.imessage.accounts.*`.

## Group registry footgun

Le plugin iMessage inclus exécute **deux** portes de liste d'autorisation de groupe distinctes consécutivement. Les deux doivent être réussies pour qu'un message de groupe atteigne l'agent :

1. **Liste d'autorisation de l'expéditeur / de la cible de chat** (`channels.imessage.groupAllowFrom`) — vérifiée par `isAllowedIMessageSender`. Fait correspondre les messages entrants par le handle de l'expéditeur, `chat_guid`, `chat_identifier` ou `chat_id`. Même structure que BlueBubbles.
2. **Registre de groupe** (`channels.imessage.groups`) — vérifié par `resolveChannelGroupPolicy` à partir de `inbound-processing.ts:199`. Avec `groupPolicy: "allowlist"`, cette porte nécessite soit :
   - une entrée générique `groups: { "*": { ... } }` (définit `allowAll = true`), ou
   - une entrée explicite par `chat_id` sous `groups`.

Si la porte 1 réussit mais que la porte 2 échoue, le message est abandonné. Le plugin émet deux signaux de niveau `warn` afin que cela ne soit plus silencieux au niveau de journalisation par défaut :

- Un `warn` de démarrage unique par compte lorsque `groupPolicy: "allowlist"` est défini mais que `channels.imessage.groups` est vide (pas de générique `"*"`, pas d'entrées par `chat_id`) — déclenché avant l'arrivée de tout message.
- Un `warn` unique par `chat_id` la première fois qu'un groupe spécifique est abandonné lors de l'exécution, nommant le chat_id et la clé exacte à ajouter à `groups` pour l'autoriser.

Les DMs continuent de fonctionner car ils empruntent un chemin de code différent.

C'est le mode d'échec de migration le plus courant de BlueBubbles vers iMessage intégré : les opérateurs copient `groupAllowFrom` et `groupPolicy` mais omettent le bloc `groups`, car le `groups: { "*": { "requireMention": true } }` de BlueBubbles ressemble à un paramètre de mention sans rapport. Il est en fait essentiel pour le registre de contrôle.

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

`requireMention: true` sous `*` est inoffensif lorsque aucun modèle de mention n'est configuré : le runtime définit `canDetectMention = false` et court-circuite l'abandon de mention à `inbound-processing.ts:512`. Avec des modèles de mention configurés (`agents.list[].groupChat.mentionPatterns`), cela fonctionne comme prévu.

Si la passerelle enregistre `imessage: dropping group message from chat_id=<id>` ou la ligne de démarrage `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty`, la porte 2 est en train d'abandonner — ajoutez le bloc `groups`.

## Étape par étape

1. Ajoutez un bloc iMessage à côté du bloc BlueBubbles existant. Gardez-le désactivé tant que le Gateway route encore le trafic BlueBubbles :

   ```json5
   {
     channels: {
       bluebubbles: {
         enabled: true,
         // ... existing config ...
       },
       imessage: {
         enabled: false,
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

2. **Sondez avant que le trafic ne compte** — arrêtez le Gateway, activez temporairement le bloc iMessage et confirmez qu'iMessage signale être en bonne santé depuis le CLI :

   ```bash
   openclaw gateway stop
   # edit config: channels.imessage.enabled = true
   openclaw channels status --probe --channel imessage   # expect imessage.privateApi.available: true
   ```

   `channels status --probe` sonde uniquement les comptes configurés et activés. Ne redémarrez pas le Gateway avec à la fois BlueBubbles et iMessage activés, sauf si vous souhaitez intentionnellement que les deux moniteurs de canal soient en cours d'exécution. Si vous ne basculez pas immédiatement, remettez `channels.imessage.enabled` à `false` avant de redémarrer le Gateway. Utilisez les commandes directes `imsg` dans [Avant de commencer](#before-you-start) pour valider le Mac avant d'activer le trafic OpenClaw.

3. **Basculez.** Une fois que le compte iMessage activé signale être en bonne santé, supprimez la configuration BlueBubbles et gardez iMessage activé :

   ```json5
   {
     channels: {
       imessage: { enabled: true /* ... */ },
     },
   }
   ```

   Redémarrez la passerelle. Le trafic iMessage entrant passe désormais par le plugin intégré.

4. **Vérifiez les DMs.** Envoyez un message direct à l'agent ; confirmez que la réponse arrive.

5. **Vérifiez les groupes séparément.** Les DMs et les groupes suivent des chemins de code différents — la réussite des DMs ne prouve pas que les groupes sont routés. Envoyez un message à l'agent dans une conversation de groupe appariée et confirmez que la réponse est bien reçue. Si le groupe reste silencieux (pas de réponse de l'agent, pas d'erreur), vérifiez le journal de la passerelle pour `imessage: dropping group message from chat_id=<id>` ou la ligne de démarrage `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty` — les deux s'affichent au niveau de journal par défaut. Si l'un ou l'autre apparaît, votre bloc `groups` est manquant ou vide — voir « Group registry footgun » ci-dessus.

6. **Vérifier la surface d'action** — depuis un DM jumelé, demandez à l'agent de réagir, d'éditer, d'annuler l'envoi, de répondre, d'envoyer une photo et (dans un groupe) de renommer le groupe / d'ajouter ou de supprimer un participant. Chaque action doit apparaître nativement dans Messages.app. Si une action renvoie "iMessage iMessage`<action>`API nécessite le pont de l'API privée imsg", relancez `imsg launch` et actualisez `channels status --probe`.

7. **Supprimez le serveur et la configuration BlueBubbles** une fois que les DMs iMessage, les groupes et les actions ont été vérifiés. OpenClaw n'utilisera pas BlueBubblesiMessageOpenClaw`channels.bluebubbles`.

## Parité des actions en un coup d'œil

| Action                                                                          | BlueBubbles hérité                                       | iMessage intégré                                                                                                             |
| ------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Envoyer du texte / repli SMS                                                    | ✅                                                       | ✅                                                                                                                           |
| Envoyer des médias (photo, vidéo, fichier, voix)                                | ✅                                                       | ✅                                                                                                                           |
| Réponse en fil de discussion (`reply_to_guid`)                                  | ✅                                                       | ✅ (ferme [#51892](https://github.com/openclaw/openclaw/issues/51892))                                                       |
| Tapback (`react`)                                                               | ✅                                                       | ✅                                                                                                                           |
| Modifier / annuler l'envoi (destinataires macOS 13+)                            | ✅                                                       | ✅                                                                                                                           |
| Envoyer avec un effet d'écran                                                   | ✅                                                       | ✅ (ferme une partie de [#9394](https://github.com/openclaw/openclaw/issues/9394))                                           |
| Texte enrichi gras / italique / souligné / barré                                | ✅                                                       | ✅ (formatage par typed-run via attributedBody)                                                                              |
| Renommer le groupe / définir l'icône du groupe                                  | ✅                                                       | ✅                                                                                                                           |
| Ajouter / supprimer un participant, quitter le groupe                           | ✅                                                       | ✅                                                                                                                           |
| Accusés de réception et indicateur de frappe                                    | ✅                                                       | ✅ (dépend de la sonde de l'API privée)                                                                                      |
| Fusion des DM du même expéditeur                                                | ✅                                                       | ✅ (DM uniquement ; optionnel via `channels.imessage.coalesceSameSenderDms`)                                                 |
| Rattrapage des messages entrants reçus pendant que la passerelle est hors ligne | ✅ (relecture de webhook + récupération de l'historique) | ✅ (optionnel via `channels.imessage.catchup.enabled` ; corrige [#78649](https://github.com/openclaw/openclaw/issues/78649)) |

Le rattrapage iMessage est désormais disponible en tant que fonctionnalité optionnelle sur le plugin inclus. Au démarrage de la passerelle, si `channels.imessage.catchup.enabled` est `true`, la passerelle exécute une passe `chats.list` + `messages.history` par chat sur le même client JSON-RPC utilisé par `imsg watch`, rejoue chaque ligne entrante manquante via le chemin de répartition en direct (listes d'autorisation, stratégie de groupe, anti-rebond, cache d'écho), et persiste un curseur par compte afin que les démarrages suivants reprennent là où ils se sont arrêtés. Voir [Catching up after gateway downtime](/fr/channels/imessage#catching-up-after-gateway-downtime) pour le réglage.

## Appairage, sessions et liaisons ACP

- Les **approbations d'appariement** sont transférées par identifiant. Vous n'avez pas besoin de réapprouver les expéditeurs connus — `channels.imessage.allowFrom` reconnaît les mêmes chaînes `+15555550123` / `user@example.com` que BlueBubbles utilisait.
- Les **sessions** restent délimitées par agent + discussion. Les DMs sont fusionnés dans la session principale de l'agent avec le `session.dmScope=main` par défaut ; les sessions de groupe restent isolées par `chat_id`. Les clés de session diffèrent (`agent:<id>:imessage:group:<chat_id>` par rapport à l'équivalent BlueBubbles) — l'historique des conversations sous les clés de session BlueBubbles n'est pas transféré vers les sessions iMessage.
- Les liaisons **ACP** référençant `match.channel: "bluebubbles"` doivent être mises à jour vers `"imessage"`. Les formes `match.peer.id` (`chat_id:`, `chat_guid:`, `chat_identifier:`, identifiant nu) sont identiques.

## Aucun canal de retour en arrière

Il n'y a aucun environnement d'exécution BlueBubbles pris en charge pour revenir en arrière. Si la vérification iMessage échoue, définissez BlueBubblesiMessage`channels.imessage.enabled: false`Gateway, redémarrez le Gateway, corrigez le blocage `imsg` et réessayez la bascule.

Le cache de réponses réside dans l'état du plugin SQLite. `openclaw doctor --fix` importe et archive l'ancien fichier sidecar `imessage/reply-cache.jsonl` lorsqu'il est présent.

## Connexes

- [BlueBubbles suppression et le chemin iMessage iMessage](/fr/announcements/bluebubbles-imessage) — courte annonce et résumé pour l'opérateur.
- [iMessage](/fr/channels/imessage) — référence complète du channel iMessage, incluant la configuration `imsg launch` et la détection des capacités.
- `/channels/bluebubbles` — ancienne URL qui redirige vers ce guide de migration.
- [Jumelage](/fr/channels/pairing) — authentification DM et flux de jumelage.
- [Routage de channel](/fr/channels/channel-routing) — comment la passerelle choisit un channel pour les réponses sortantes.
