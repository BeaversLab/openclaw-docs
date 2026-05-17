---
summary: "Prise en charge native d'iMessage via imsg (JSON-RPC sur stdio), avec des actions d'API privée pour les réponses, les tapbacks, les effets, les pièces jointes et la gestion de groupe. Préféré pour les nouvelles configurations OpenClaw iMessage lorsque les exigences de l'hôte sont satisfaites."
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessage"
---

<Note>
Pour les déploiements OpenClaw iMessage, utilisez `imsg` sur un hôte Messages macOS connecté. Si votre Gateway s'exécute sur Linux ou Windows, dirigez `channels.imessage.cliPath` vers un wrapper SSH qui exécute `imsg` sur le Mac.

**Le rattrapage après l'arrêt du Gateway est facultatif.** Lorsqu'il est activé (`channels.imessage.catchup.enabled: true`), la passerine rejoue les messages entrants qui ont atterri dans `chat.db` pendant qu'elle était hors ligne (plantage, redémarrage, mise en veille du Mac) au prochain démarrage. Désactivé par défaut — voir [Catching up after gateway downtime](#catching-up-after-gateway-downtime). Corrige [openclaw#78649](https://github.com/openclaw/openclaw/issues/78649).

</Note>

<Warning>
  Le support BlueBubbles a été supprimé. Migrez les configurations `channels.bluebubbles` vers `channels.imessage` ; OpenClaw prend en charge iMessage uniquement via `imsg`. Commencez par [BlueBubbles removal and the imsg iMessage path](/fr/announcements/bluebubbles-imessage) pour l'annonce courte, ou [Coming from BlueBubbles](/fr/channels/imessage-from-bluebubbles) pour le tableau complet de la
  migration.
</Warning>

État : intégration native externe CLI. Le Gateway génère `imsg rpc` et communique via JSON-RPC sur stdio (pas de démon/port distinct). Les actions avancées nécessitent `imsg launch` et une sonde réussie de l'API privée.

<CardGroup cols={3}>
  <Card title="APIActions de l'API privée" icon="wand-sparkles" href="#private-api-actions">
    Réponses, tapbacks, effets, pièces jointes et gestion de groupe.
  </Card>
  <Card title="Appairage" icon="link" href="/fr/channels/pairing" iMessage>
    Les DMs iMessage sont en mode appairage par défaut.
  </Card>
  <Card title="Mac distant" icon="terminal" href="#remote-mac-over-ssh" Gateway>
    Utilisez un wrapper SSH lorsque le Gateway ne s'exécute pas sur le Mac Messages.
  </Card>
  <Card title="Référence de configuration" icon="settings" href="/fr/gateway/config-channels#imessage" iMessage>
    Référence complète des champs iMessage.
  </Card>
</CardGroup>

## Configuration rapide

<Tabs>
  <Tab title="Mac local (chemin rapide)">
    <Steps>
      <Step title="Installer et vérifier imsg">

```bash
brew install steipete/tap/imsg
imsg rpc --help
imsg launch
openclaw channels status --probe
```

      </Step>

      <Step title="OpenClawConfigurer OpenClaw">

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/usr/local/bin/imsg",
      dbPath: "/Users/user/Library/Messages/chat.db",
    },
  },
}
```

      </Step>

      <Step title="Démarrer la passerelle">

```bash
openclaw gateway
```

      </Step>

      <Step title="Approuver le premier appairage DM (dmPolicy par défaut)">

```bash
openclaw pairing list imessage
openclaw pairing approve imessage <CODE>
```

        Les demandes d'appairage expirent après 1 heure.
      </Step>
    </Steps>

  </Tab>

  <Tab title="Remote Mac over SSH"OpenClaw>
    OpenClaw nécessite uniquement une commande `cliPath` compatible stdio, vous pouvez donc pointer `cliPath` vers un script wrapper qui se connecte via SSH à un Mac distant et exécute `imsg`.

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

    Configuration recommandée lorsque les pièces jointes sont activées :

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.openclaw/scripts/imsg-ssh",
      remoteHost: "user@gateway-host", // used for SCP attachment fetches
      includeAttachments: true,
      // Optional: override allowed attachment roots.
      // Defaults include /Users/*/Library/Messages/Attachments
      attachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      remoteAttachmentRoots: ["/Users/*/Library/Messages/Attachments"],
    },
  },
}
```

    Si `remoteHost`OpenClaw n'est pas défini, OpenClaw tente de le détecter automatiquement en analysant le script wrapper SSH.
    `remoteHost` doit être `host` ou `user@host`OpenClaw (pas d'espaces ou d'options SSH).
    OpenClaw utilise une vérification stricte des clés d'hôte pour SCP, la clé de l'hôte de relais doit donc déjà exister dans `~/.ssh/known_hosts`.
    Les chemins des pièces jointes sont validés par rapport aux racines autorisées (`attachmentRoots` / `remoteAttachmentRoots`).

  </Tab>
</Tabs>

## Configuration requise et permissions (macOS)

- Messages doit être connecté sur le Mac exécutant `imsg`.
- L'accès complet au disque est requis pour le contexte de processus exécutant OpenClaw/OpenClaw`imsg` (accès à la base de données Messages).
- L'autorisation d'automatisation est requise pour envoyer des messages via Messages.app.
- Pour les actions avancées (réagir / modifier / annuler l'envoi / réponse en fil / effets / opérations de groupe), la protection de l'intégrité du système doit être désactivée — voir [Activation de l'API privée imsg](API#enabling-the-imsg-private-api) ci-dessous. L'envoi et la réception de texte et de médias basiques fonctionnent sans cela.

<Tip>
Les autorisations sont accordées par contexte de processus. Si la passerelle s'exécute sans interface (LaunchAgent/SSH), exécutez une commande interactive unique dans ce même contexte pour déclencher les invites :

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

## Activation de l'API privée imsg

`imsg` est fourni dans deux modes de fonctionnement :

- **Mode de base** (par défaut, aucune modification SIP nécessaire) : texte et médias sortants via `send`, surveillance/historique entrant, liste de discussion. C'est ce que vous obtenez hors de la boîte à partir d'un nouveau `brew install steipete/tap/imsg`macOS ainsi que les autorisations macOS standard ci-dessus.
- **Mode API privé** : API`imsg` injecte une bibliothèque dynamique (dylib) d'assistance dans `Messages.app` pour appeler les fonctions internes de `IMCore`. C'est ce qui déverrouille `react`, `edit`, `unsend`, `reply` (fil de discussion), `sendWithEffect`, `renameGroup`, `setGroupIcon`, `addParticipant`, `removeParticipant`, `leaveGroup`, ainsi que les indicateurs de frappe et les accusés de lecture.

Pour accéder à la surface d'action avancée documentée sur cette page de canal, vous avez besoin du mode API privé. Le README de API`imsg` est explicite quant à cette exigence :

> Les fonctionnalités avancées telles que `read`, `typing`, `launch`, l'envri enrichi pris en charge par un pont, la mutation de messages et la gestion des discussions sont facultatives. Elles nécessitent que SIP soit désactivé et qu'une bibliothèque dynamique d'assistance soit injectée dans `Messages.app`. `imsg launch` refuse d'injecter lorsque SIP est activé.

La technique d'injection d'assistance utilise la propre dylib de `imsg` pour atteindre les API privées de Messages. Il n'y a aucun serveur tiers ou d'exécution BlueBubbles dans le chemin OpenClaw iMessage.

<Warning>
**Désactiver le SIP est un véritable compromis de sécurité.** Le SIP est l'une des protections centrales de macOS contre l'exécution de code système modifié ; le désactiver sur l'ensemble du système ouvre une surface d'attaque supplémentaire et des effets secondaires. Notamment, **la désactivation du SIP sur les Mac Apple Silicon désactive également la possibilité d'installer et d'exécuter des applications iOS sur votre Mac**.

Traitez cela comme un choix opérationnel délibéré, et non par défaut. Si votre modèle de menace ne tolère pas la désactivation du SIP, iMessage intégré est limité au mode de base — envoi et réception de texte et de médias uniquement, sans réactions / édition / annulation d'envoi / effets / opérations de groupe.

</Warning>

### Configuration

1. **Installez (ou mettez à niveau) `imsg`** sur le Mac qui exécute Messages.app :

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg status --json
   ```

   La sortie `imsg status --json` rapporte `bridge_version`, `rpc_methods` et `selectors` par méthode afin que vous puissiez voir ce que la version actuelle prend en charge avant de commencer.

2. **Désactivez la protection de l'intégrité du système (System Integrity Protection).** Ceci est spécifique à la version de macOS car la condition sous-jacente d'Apple dépend du système d'exploitation et du matériel :
   - **macOS 10.13–10.15 (Sierra–Catalina) :** désactivez la validation de la bibliothèque via le Terminal, redémarrez en mode de récupération, exécutez `csrutil disable`, redémarrez.
   - **macOS 11+ (Big Sur et ultérieur), Intel :** Mode de récupération (ou récupération Internet), `csrutil disable`, redémarrez.
   - **macOS 11+, Apple Silicon :** séquence de démarrage avec le bouton d'alimentation pour entrer dans Recovery ; sur les versions récentes de macOS, maintenez la touche **Left Shift** lorsque vous cliquez sur Continuer, puis macOSmacOS`csrutil disable`. Les configurations de machine virtuelle suivent un processus distinct — commencez par prendre un instantané de la VM.
   - **macOS 26 / Tahoe :** les stratégies de validation de bibliothèque et les vérifications d'entitlements privés macOS`imagent` se sont encore resserrées ; `imsg` peut avoir besoin d'une version mise à jour pour suivre. Si l'injection `imsg launch` ou des `selectors`macOS spécifiques commencent à renvoyer false après une mise à niveau majeure de macOS, consultez les notes de version de `imsg` avant de supposer que l'étape SIP a réussi.

   Suivez le procédé en mode Recovery d'Apple pour votre Mac afin de désactiver SIP avant d'exécuter `imsg launch`.

3. **Injectez l'assistant.** Avec SIP désactivé et Messages.app connecté :

   ```bash
   imsg launch
   ```

   `imsg launch` refuse de s'injecter lorsque SIP est encore activé, cela confirme donc également que l'étape 2 a été effectuée.

4. **Vérifiez le pont depuis OpenClaw :**

   ```bash
   openclaw channels status --probe
   ```

   L'entrée iMessage doit signaler iMessage`works`, et `imsg status --json | jq '.selectors'` doit afficher `retractMessagePart: true`macOSOpenClaw ainsi que les sélecteurs d'édition / de frappe / de lecture que votre version de macOS expose. Le filtrage par méthode du plugin OpenClaw dans `actions.ts` n'annonce que les actions dont le sélecteur sous-jacent est `true`, donc la surface d'action que vous voyez dans la liste d'outils de l'agent reflète ce que le bridge peut réellement faire sur cet hôte.

Si `openclaw channels status --probe` signale le canal comme `works`iMessage mais que des actions spécifiques renvoient « iMessage `<action>`API nécessite le bridge de l'API privée imsg » lors de la répartition, exécutez `imsg launch` à nouveau — l'assistant peut se désactiver (redémarrage de Messages.app, mise à jour du système d'exploitation, etc.) et l'état `available: true` mis en cache continuera d'annoncer des actions jusqu'à la prochaine actualisation de la sonde.

### Lorsque vous ne pouvez pas désactiver SIP

Si la désactivation de SIP n'est pas acceptable pour votre modèle de menace :

- `imsg` revient en mode basique — texte + média + réception uniquement.
- Le plugin OpenClaw annonce toujours l'envoi de texte/médias et la surveillance entrante ; il masque simplement `react`, `edit`, `unsend`, `reply`, `sendWithEffect` et les opérations de groupe de la surface d'action (conformément à la porte de capacité par méthode).
- Vous pouvez exécuter un Mac non-Apple-Silicon distinct (ou un Mac bot dédié) avec SIP désactivé pour la charge de travail iMessagemacOS, tout en gardant SIP activé sur vos appareils principaux. Voir [Utilisateur macOS de bot dédié (identité iMessage distincte)](#deployment-patterns) ci-dessous.

## Contrôle d'accès et routage

<Tabs>
  <Tab title="DM policy">
    `channels.imessage.dmPolicy` contrôle les messages directs :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `allowFrom` inclue `"*"`)
    - `disabled`

    Champ de liste d'autorisation : `channels.imessage.allowFrom`.

    Les entrées de la liste d'autorisation peuvent être des identifiants, des groupes d'accès d'expéditeur statiques (`accessGroup:<name>`) ou des cibles de chat (`chat_id:*`, `chat_guid:*`, `chat_identifier:*`).

  </Tab>

  <Tab title="Stratégie de groupe + mentions">
    `channels.imessage.groupPolicy` contrôle la gestion des groupes :

    - `allowlist` (par défaut lors de la configuration)
    - `open`
    - `disabled`

    Liste d'autorisation des expéditeurs de groupe : `channels.imessage.groupAllowFrom`.

    Les entrées `groupAllowFrom` peuvent également faire référence à des groupes d'accès d'expéditeurs statiques (`accessGroup:<name>`).

    Solution de repli à l'exécution : si `groupAllowFrom` n'est pas défini, les vérifications d'expéditeur de groupe iMessage reviennent à `allowFrom` si disponible.
    Remarque d'exécution : si `channels.imessage` est complètement manquant, l'exécution revient à `groupPolicy="allowlist"` et enregistre un avertissement (même si `channels.defaults.groupPolicy` est défini).

    <Warning>
    Le routage de groupe possède **deux** portes de liste d'autorisation fonctionnant consécutivement, et les deux doivent être réussies :

    1. **Liste d'autorisation de l'expéditeur / de la cible de chat** (`channels.imessage.groupAllowFrom`) — identifiant, `chat_guid`, `chat_identifier`, ou `chat_id`.
    2. **Registre de groupe** (`channels.imessage.groups`) — avec `groupPolicy: "allowlist"`, cette porte nécessite soit une entrée générique `groups: { "*": { ... } }` (définit `allowAll = true`), soit une entrée explicite par `chat_id` sous `groups`.

    Si la porte 2 est vide, chaque message de groupe est rejeté. Le plugin émet deux signaux de niveau `warn` au niveau de journalisation par défaut :

    - une fois par compte au démarrage : `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty for account "<id>"`
    - une fois par `chat_id` à l'exécution : `imessage: dropping group message from chat_id=<id> ...`

    Les iMessage continuent de fonctionner car elles empruntent un chemin de code différent.

    Configuration minimale pour garder les groupes actifs sous `groupPolicy: "allowlist"` :

    ```json5
    {
      channels: {
        imessage: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15555550123"],
          groups: { "*": { "requireMention": true } },
        },
      },
    }
    ```

    Si ces lignes `warn` apparaissent dans le journal de la passerelle, la porte 2 rejette les messages — ajoutez le bloc `groups`.
    </Warning>

    Filtrage des mentions pour les groupes :

    - iMessage ne possède pas de métadonnées de mention natives
    - la détection des mentions utilise des motifs regex (`agents.list[].groupChat.mentionPatterns`, repli `messages.groupChat.mentionPatterns`)
    - sans motifs configurés, le filtrage des mentions ne peut pas être appliqué

    Les commandes de contrôle des expéditeurs autorisés peuvent contourner le filtrage des mentions dans les groupes.

    `systemPrompt` par groupe :

    Chaque entrée sous `channels.imessage.groups.*` accepte une chaîne `systemPrompt` facultative. La valeur est injectée dans le prompt système de l'agent à chaque tour gérant un message dans ce groupe. La résolution miroir la résolution de prompt par groupe utilisée par `channels.whatsapp.groups` :

    1. **Prompt système spécifique au groupe** (`groups["<chat_id>"].systemPrompt`) : utilisé lorsque l'entrée de groupe spécifique existe dans la carte **et** que sa clé `systemPrompt` est définie. Si `systemPrompt` est une chaîne vide (`""`), le générique est supprimé et aucun prompt système n'est appliqué à ce groupe.
    2. **Prompt système générique de groupe** (`groups["*"].systemPrompt`) : utilisé lorsque l'entrée de groupe spécifique est absente de la carte, ou lorsqu'elle existe mais ne définit aucune clé `systemPrompt`.

    ```json5
    {
      channels: {
        imessage: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15555550123"],
          groups: {
            "*": { systemPrompt: "Use British spelling." },
            "8421": {
              requireMention: true,
              systemPrompt: "This is the on-call rotation chat. Keep replies under 3 sentences.",
            },
            "9907": {
              // explicit suppression: the wildcard "Use British spelling." does not apply here
              systemPrompt: "",
            },
          },
        },
      },
    }
    ```

    Les prompts par groupe ne s'appliquent qu'aux messages de groupe — les messages directs dans ce channel ne sont pas affectés.

  </Tab>

  <Tab title="Sessions and deterministic replies">
    - Les DMs utilisent le routage direct ; les groupes utilisent le routage de groupe.
    - Avec `session.dmScope=main`iMessage par défaut, les iMessage DMs fusionnent dans la session principale de l'agent.
    - Les sessions de groupe sont isolées (`agent:<agentId>:imessage:group:<chat_id>`iMessageiMessage).
    - Les réponses sont acheminées vers iMessage en utilisant les métadonnées de canal/cible d'origine.

    Comportement de fil de type groupe :

    Certains fils iMessage à plusieurs participants peuvent arriver avec `is_group=false`.
    Si ce `chat_id` est explicitement configuré sous `channels.imessage.groups`OpenClaw, OpenClaw le traite comme un trafic de groupe (group gating + isolation de session de groupe).

  </Tab>
</Tabs>

## Liaisons de conversation ACP

Les discussions iMessage héritées peuvent également être liées aux sessions ACP.

Flux rapide pour l'opérateur :

- Exécutez `/acp spawn codex --bind here` dans le DM ou le chat de groupe autorisé.
- Les futurs messages de cette même conversation iMessage sont acheminés vers la session ACP générée.
- `/new` et `/reset` réinitialisent la même session ACP liée sur place.
- `/acp close` ferme la session ACP et supprime la liaison.

Les liaisons persistantes configurées sont prises en charge via des entrées `bindings[]` de niveau supérieur avec `type: "acp"` et `match.channel: "imessage"`.

`match.peer.id` peut utiliser :

- identifiant DM normalisé tel que `+15555550123` ou `user@example.com`
- `chat_id:<id>` (recommandé pour les liaisons de groupe stables)
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

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
        channel: "imessage",
        accountId: "default",
        peer: { kind: "group", id: "chat_id:123" },
      },
      acp: { label: "codex-group" },
    },
  ],
}
```

Consultez [ACP Agents](/fr/tools/acp-agents) pour le comportement de liaison ACP partagée.

## Modèles de déploiement

<AccordionGroup>
  <Accordion title="macOSiMessageUtilisateur macOS dédié au bot (identité iMessage distincte)"macOSmacOS>
    Utilisez un Apple ID et un utilisateur macOS dédiés afin que le trafic du bot soit isolé de votre profil personnel Messages.

    Flux type :

    1. Créez/connectez un utilisateur macOS dédié.
    2. Connectez-vous à Messages avec l'Apple ID du bot dans cet utilisateur.
    3. Installez `imsg`OpenClaw dans cet utilisateur.
    4. Créez un wrapper SSH pour qu'OpenClaw puisse exécuter `imsg` dans le contexte de cet utilisateur.
    5. Pointez `channels.imessage.accounts.<id>.cliPath` et `.dbPath` vers ce profil utilisateur.

    La première exécution peut nécessiter des approbations de l'interface graphique (Automatisation + Accès complet au disque) dans cette session utilisateur bot.

  </Accordion>

  <Accordion title="TailscaleMac distant via Tailscale (exemple)"LinuxiMessage>
    Topologie courante :

    - la passerelle s'exécute sur Linux/VM
    - iMessage + `imsg` s'exécute sur un Mac dans votre tailnet
    - le wrapper `cliPath` utilise SSH pour exécuter `imsg`
    - `remoteHost` active la récupération des pièces jointes via SCP

    Exemple :

    ```json5
    {
      channels: {
        imessage: {
          enabled: true,
          cliPath: "~/.openclaw/scripts/imsg-ssh",
          remoteHost: "bot@mac-mini.tailnet-1234.ts.net",
          includeAttachments: true,
          dbPath: "/Users/bot/Library/Messages/chat.db",
        },
      },
    }
    ```

    ```bash
    #!/usr/bin/env bash
    exec ssh -T bot@mac-mini.tailnet-1234.ts.net imsg "$@"
    ```

    Utilisez des clés SSH pour que SSH et SCP soient non interactifs.
    Assurez-vous que la clé de l'hôte est d'abord approuvée (par exemple `ssh bot@mac-mini.tailnet-1234.ts.net`) afin que `known_hosts` soit renseigné.

  </Accordion>

  <Accordion title="Motif multi-compte"iMessage>
    iMessage prend en charge la configuration par compte sous `channels.imessage.accounts`.

    Chaque compte peut remplacer des champs tels que `cliPath`, `dbPath`, `allowFrom`, `groupPolicy`, `mediaMaxMb`, les paramètres d'historique et les listes d'autorisation racines des pièces jointes.

  </Accordion>
</AccordionGroup>

## Médias, découpage et cibles de livraison

<AccordionGroup>
  <Accordion title="Pièces jointes et médias">
    - l'ingestion des pièces jointes entrantes est **désactivée par défaut** — définissez `channels.imessage.includeAttachments: true` pour transférer les photos, mémos vocaux, vidéos et autres pièces jointes à l'agent. Si cette option est désactivée, les iMessages contenant uniquement des pièces jointes sont supprimés avant d'atteindre l'agent et peuvent ne produire aucune ligne de journal `Inbound message`.
    - les chemins distants des pièces jointes peuvent être récupérés via SCP lorsque `remoteHost` est défini
    - les chemins des pièces jointes doivent correspondre aux racines autorisées :
      - `channels.imessage.attachmentRoots` (local)
      - `channels.imessage.remoteAttachmentRoots` (mode SCP distant)
      - motif de racine par défaut : `/Users/*/Library/Messages/Attachments`
    - SCP utilise une vérification stricte de la clé de l'hôte (`StrictHostKeyChecking=yes`)
    - la taille des médias sortants utilise `channels.imessage.mediaMaxMb` (par défaut 16 Mo)

  </Accordion>

  <Accordion title="Découpage sortant">
    - limite de découpage de texte : `channels.imessage.textChunkLimit` (par défaut 4000)
    - mode de découpage : `channels.imessage.chunkMode`
      - `length` (par défaut)
      - `newline` (découpage prioritaire aux paragraphes)

  </Accordion>

  <Accordion title="Formats d'adressage">
    Cibles explicites préférées :

    - `chat_id:123` (recommandé pour un routage stable)
    - `chat_guid:...`
    - `chat_identifier:...`

    Les cibles de gestion (handle) sont également prises en charge :

    - `imessage:+1555...`
    - `sms:+1555...`
    - `user@example.com`

    ```bash
    imsg chats --limit 20
    ```

  </Accordion>
</AccordionGroup>

## Actions de l'API privée

Lorsque `imsg launch` est en cours d'exécution et que `openclaw channels status --probe` indique `privateApi.available: true`iMessage, l'outil de message peut utiliser des actions natives iMessage en plus des envois de texte normaux.

```json5
{
  channels: {
    imessage: {
      actions: {
        reactions: true,
        edit: true,
        unsend: true,
        reply: true,
        sendWithEffect: true,
        sendAttachment: true,
        renameGroup: true,
        setGroupIcon: true,
        addParticipant: true,
        removeParticipant: true,
        leaveGroup: true,
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Actions disponibles"iMessage>
    - **react** : Ajouter/supprimer des tapbacks iMessage (`messageId`, `emoji`, `remove`). Les tapbacks pris en charge correspondent à amour, j'aime, je n'aime pas, haha, emphase et question.
    - **reply** : Envoyer une réponse filée à un message existant (`messageId`, `text` ou `message`, plus `chatGuid`, `chatId`, `chatIdentifier`, ou `to`iMessage).
    - **sendWithEffect** : Envoyer du texte avec un effet iMessage (`text` ou `message`, `effect` ou `effectId`macOSAPI).
    - **edit** : Modifier un message envoyé sur les versions prises en charge de macOS/private API (`messageId`, `text` ou `newText`macOSAPI).
    - **unsend** : Rétracter un message envoyé sur les versions prises en charge de macOS/private API (`messageId`).
    - **upload-file** : Envoyer des médias/fichiers (`buffer` en base64 ou un `media`/`path`/`filePath` hydraté, `filename`, `asVoice` en option). Alias hérité : `sendAttachment`.
    - **renameGroup**, **setGroupIcon**, **addParticipant**, **removeParticipant**, **leaveGroup** : Gérer les discussions de groupe lorsque la cible actuelle est une conversation de groupe.

  </Accordion>

  <Accordion title="Identifiants de message"iMessage>
    Le contexte iMessage entrant inclut à la fois des valeurs `MessageSid` courtes et les GUID complets des messages lorsqu'ils sont disponibles. Les ID courts sont limités au cache de réponse récent en mémoire et sont vérifiés par rapport à la discussion actuelle avant utilisation. Si un ID court a expiré ou appartient à une autre discussion, réessayez avec le `MessageSidFull` complet.

  </Accordion>

  <Accordion title="Détection des fonctionnalités"OpenClawAPI>
    OpenClaw masque les actions de l'API privée uniquement lorsque l'état de la sonde en cache indique que le pont est indisponible. Si l'état est inconnu, les actions restent visibles et diffusent les sondes de manière différée, afin que la première action puisse réussir après `imsg launch` sans actualisation manuelle distincte de l'état.

  </Accordion>

  <Accordion title="Accusés de réception et indication de frappe"API>
    Lorsque le pont de l'API privée est actif, les conversations entrantes acceptées sont marquées comme lues avant la répartition et une bulle de frappe est affichée à l'expéditeur pendant que l'agent génère. Désactivez le marquage comme lu avec :

    ```json5
    {
      channels: {
        imessage: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    Les anciennes versions de `imsg`OpenClaw antérieures à la liste des fonctionnalités par méthode bloqueront silencieusement la frappe/la lecture ; OpenClaw enregistre un avertissement unique par redémarrage afin que l'accusé de réception manquant soit attribuable.

  </Accordion>

  <Accordion title="Tapbacks entrants"OpenClawiMessage>
    OpenClaw s'abonne aux tapbacks iMessage et achemine les réactions acceptées en tant qu'événements système au lieu de texte de message normal, afin qu'un tapback utilisateur ne déclenche pas une boucle de réponse ordinaire.

    Le mode de notification est contrôlé par `channels.imessage.reactionNotifications` :

    - `"own"` (par défaut) : notifier uniquement lorsque les utilisateurs réagissent aux messages générés par le bot.
    - `"all"` : notifier pour tous les tapbacks entrants des expéditeurs autorisés.
    - `"off"` : ignorer les tapbacks entrants.

    Les substitutions par compte utilisent `channels.imessage.accounts.<id>.reactionNotifications`.

  </Accordion>
</AccordionGroup>

## Écritures de configuration

iMessage permet les écritures de configuration initiées par le canal par défaut (pour iMessage`/config set|unset` lorsque `commands.config: true`).

Désactiver :

```json5
{
  channels: {
    imessage: {
      configWrites: false,
    },
  },
}
```

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## Fusion des envois fractionnés de DMs (commande + URL dans une seule composition)

Lorsqu'un utilisateur tape une commande et une URL ensemble — par exemple `Dump https://example.com/article` — l'application Messages d'Apple divise l'envoi en **deux lignes `chat.db` distinctes** :

1. Un message texte (`"Dump"`).
2. Un ballon de prévisualisation d'URL (`"https://..."`) avec des images de prévisualisation OG en pièces jointes.

Les deux lignes arrivent à OpenClaw environ 0,8 à 2,0 s d'intervalle sur la plupart des configurations. Sans la fusion, l'agent reçoit la commande seul au tour 1, répond (souvent « envoyez-moi l'URL »), et ne voit l'URL qu'au tour 2 — moment auquel le contexte de la commande est déjà perdu. C'est le pipeline d'envoi d'Apple, et non quelque chose introduit par OpenClaw ou `imsg`.

`channels.imessage.coalesceSameSenderDms` permet à un DM de fusionner les lignes consécutives du même expéditeur en un seul tour d'agent. Les discussions de groupe continuent d'expédier message par message afin de préserver la structure des tours multi-utilisateurs.

<Tabs>
  <Tab title="Quand activer">
    Activez lorsque :

    - Vous déployez des compétences qui s'attendent à `command + payload` en un seul message (dump, paste, save, queue, etc.).
    - Vos utilisateurs collent des URL, des images ou du contenu long à côté des commandes.
    - Vous pouvez accepter la latence ajoutée du tour DM (voir ci-dessous).

    Laissez désactivé lorsque :

    - Vous avez besoin d'une latence de commande minimale pour les déclencheurs DM d'un seul mot.
    - Tous vos flux sont des commandes en une seule fois sans suites de charge utile.

  </Tab>
  <Tab title="Activation">
    ```json5
    {
      channels: {
        imessage: {
          coalesceSameSenderDms: true, // opt in (default: false)
        },
      },
    }
    ```

    Avec l'indicateur activé et sans `messages.inbound.byChannel.imessage` explicite, la fenêtre de rebond s'élargit à **2500 ms** (la valeur par défaut héritée est 0 ms — pas de rebond). La fenêtre plus large est nécessaire car le cadencement d'envoi fractionné d'Apple de 0,8 à 2,0 s ne tient pas dans une valeur par défaut plus serrée.

    Pour régler la fenêtre vous-même :

    ```json5
    {
      messages: {
        inbound: {
          byChannel: {
            // 2500 ms works for most setups; raise to 4000 ms if your Mac is
            // slow or under memory pressure (observed gap can stretch past 2 s
            // then).
            imessage: 2500,
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="Trade-offs">
    - **Latence ajoutée pour les messages DM.** Avec l'indicateur activé, chaque DM (y compris les commandes de contrôle autonomes et les suivis de texte unique) attend jusqu'à la fenêtre de debounce avant l'envoi, au cas où une ligne de payload arriverait. Les messages de groupe conservent l'envoi instantané.
    - **La sortie fusionnée est limitée.** Le texte fusionné est plafonné à 4000 caractères avec un marqueur explicite `…[truncated]` ; les pièces jointes sont plafonnées à 20 ; les entrées source sont plafonnées à 10 (les premières et les dernières sont conservées au-delà). Chaque GUID source est suivi dans `coalescedMessageGuids` pour la télémétrie en aval.
    - **DM uniquement.** Les discussions de groupe passent à un envoi par message afin que le bot reste réactif lorsque plusieurs personnes écrivent.
    - **Opt-in, par channel.** Les autres channels (Telegram, WhatsApp, SlackBlueBubbles, ...) ne sont pas affectés. Les configurations BlueBubbles héritées qui définissent `channels.bluebubbles.coalesceSameSenderDms` doivent migrer cette valeur vers `channels.imessage.coalesceSameSenderDms`.

  </Tab>
</Tabs>

### Scénarios et ce que voit l'agent

| Utilisateur compose                                                                          | `chat.db` produit            | Indicateur désactivé (par défaut)                     | Indicateur activé + fenêtre de 2500 ms                                             |
| -------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `Dump https://example.com` (un envoi)                                                        | 2 lignes à ~1 s d'intervalle | Deux tours d'agent : "Dump" seul, puis l'URL          | Un tour : texte fusionné `Dump https://example.com`                                |
| `Save this 📎image.jpg caption` (pièce jointe + texte)                                       | 2 lignes                     | Deux tours (pièce jointe supprimée lors de la fusion) | Un tour : texte + image conservés                                                  |
| `/status` (commande autonome)                                                                | 1 ligne                      | Envoi instantané                                      | **Attendre jusqu'à la fenêtre, puis envoyer**                                      |
| URL collée seule                                                                             | 1 ligne                      | Envoi instantané                                      | Envoi instantané (une seule entrée dans le bucket)                                 |
| Texte + URL envoyés comme deux messages distincts délibérés, à quelques minutes d'intervalle | 2 lignes hors fenêtre        | Deux tours                                            | Deux tours (la fenêtre expire entre eux)                                           |
| Déluge rapide (>10 petits DM dans la fenêtre)                                                | N lignes                     | N tours                                               | Un tour, sortie limitée (premier + dernier, plafonds texte/pièce jointe appliqués) |
| Deux personnes qui écrivent dans une discussion de groupe                                    | N lignes de M expéditeurs    | M+ tours (un par bucket d'expéditeur)                 | M+ tours — les discussions de groupe ne sont pas fusionnées                        |

## Rattrapage après une interruption de la passerelle

Lorsque la passerelle est hors ligne (plantage, redémarrage, mise en veille du Mac, machine éteinte), `imsg watch` reprend à partir de l'état actuel `chat.db` une fois la passerelle revenue en ligne — tout ce qui est arrivé pendant l'interruption est, par défaut, jamais vu. Le rattrapage rejoue ces messages au prochain démarrage pour que l'agent ne manque pas silencieusement le trafic entrant.

Le rattrapage est **désactivé par défaut**. Activez-le par canal :

```ts
channels: {
  imessage: {
    catchup: {
      enabled: true,             // master switch (default: false)
      maxAgeMinutes: 120,        // skip rows older than now - 2h (default: 120, clamp 1..720)
      perRunLimit: 50,           // max rows replayed per startup (default: 50, clamp 1..500)
      firstRunLookbackMinutes: 30, // first run with no cursor: look back 30 min (default: 30)
      maxFailureRetries: 10,     // give up on a wedged guid after 10 dispatch failures (default: 10)
    },
  },
}
```

### Fonctionnement

Une seule passe par démarrage `monitorIMessageProvider`, séquencée comme `imsg launch` prêt → `watch.subscribe` → `performIMessageCatchup` → boucle de dispatch en direct. Le rattrapage utilise lui-même `chats.list` + `messages.history` par conversation sur le même client JSON-RPC utilisé par `imsg watch`. Tout ce qui arrive pendant la passe de rattrapage passe normalement par le dispatch en direct ; le cache de déduplication entrant existant absorbe tout chevauchement avec les lignes rejouées.

Chaque ligne rejouée passe par le chemin de dispatch en direct (`evaluateIMessageInbound` + `dispatchInboundMessage`), donc les listes autorisées, la stratégie de groupe, le débogueur, le cache d'écho et les accusés de réception se comportent de manière identique pour les messages rejoués et les messages en direct.

### Sémantique du curseur et de nouvelle tentative

Le rattrapage conserve un curseur par compte à `<openclawStateDir>/imessage/catchup/<account>__<hash>.json` (le répertoire d'état OpenClaw est par défaut `~/.openclaw`, remplaçable par `OPENCLAW_STATE_DIR`) :

```json
{
  "lastSeenMs": 1717900800000,
  "lastSeenRowid": 482910,
  "updatedAt": 1717900801234,
  "failureRetries": { "<guid>": 1 }
}
```

- Le curseur avance à chaque dispatch réussi et est maintenu lorsque le dispatch d'une ligne échoue — le prochain démarrage réessaie la même ligne à partir du curseur maintenu.
- Après `maxFailureRetries` échecs consécutifs contre le même `guid`, le rattrapage enregistre un `warn` et force l'avancement du curseur après le message bloqué afin que les démarrages suivants puissent progresser.
- Les guid déjà abandonnés sont ignorés à vue (aucune tentative de dispatch) lors des exécutions ultérieures et comptabilisés sous `skippedGivenUp` dans le résumé d'exécution.

### Signaux visibles par l'opérateur

```
imessage catchup: replayed=N skippedFromMe=… skippedGivenUp=… failed=… givenUp=… fetchedCount=…
imessage catchup: giving up on guid=<guid> after <N> failures; advancing cursor past it
imessage catchup: fetched <X> rows across chats, capped to perRunLimit=<Y>
```

Une ligne `WARN ... capped to perRunLimit` signifie qu'un seul démarrage n'a pas vidé tout l'arriéré. Augmentez `perRunLimit` (max 500) si vos lacunes dépassent régulièrement la passe par défaut de 50 lignes.

### Quand le laisser désactivé

- Le Gateway fonctionne en continu avec un redémarrage automatique par watchdog et les interruptions sont toujours < quelques secondes — la valeur par défaut désactivée convient.
- Le volume de DM est faible et les messages manqués ne modifieraient pas le comportement de l'agent — la fenêtre initiale `firstRunLookbackMinutes` peut envoyer un ancien contexte surprenant lors de la première activation.

Lorsque vous activez le rattrapage, le premier démarrage sans curseur ne remonte que `firstRunLookbackMinutes` (30 min par défaut), et non la fenêtre complète `maxAgeMinutes` — cela évite de rejouer un long historique de messages antérieurs à l'activation.

## Dépannage

<AccordionGroup>
  <Accordion title="imsg introuvable ou RPC non pris en charge">
    Validez le binaire et la prise en charge RPC :

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```

    Si la sonde signale que le RPC n'est pas pris en charge, mettez à jour `imsg`. Si les actions de l'API privée ne sont pas disponibles, exécutez `imsg launch` dans la session utilisateur macOS connecté et sondez à nouveau. Si le Gateway ne fonctionne pas sur macOS, utilisez plutôt la configuration Mac à distance via SSH indiquée ci-dessus au lieu du chemin local `imsg` par défaut.

  </Accordion>

  <Accordion title="Gateway ne fonctionne pas sur macOS">
    Le `cliPath: "imsg"` par défaut doit fonctionner sur le Mac connecté à Messages. Sur Linux ou Windows, définissez `channels.imessage.cliPath` sur un script wrapper qui se connecte via SSH à ce Mac et exécute `imsg "$@"`.

```bash
#!/usr/bin/env bash
exec ssh -T messages-mac imsg "$@"
```

    Ensuite, exécutez :

```bash
openclaw channels status --probe --channel imessage
```

  </Accordion>

  <Accordion title="Les DM sont ignorés">
    Vérifiez :

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - les approbations d'appariement (`openclaw pairing list imessage`)

  </Accordion>

  <Accordion title="Les messages de groupe sont ignorés">
    Vérifiez :

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - `channels.imessage.groups` comportement de la liste d'autorisation
    - configuration du modèle de mention (`agents.list[].groupChat.mentionPatterns`)

  </Accordion>

  <Accordion title="Échec des pièces jointes distantes">
    Vérifiez :

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - authentification par clé SSH/SCP depuis l'hôte de la passerelle
    - la clé de l'hôte existe dans `~/.ssh/known_hosts` sur l'hôte de la passerelle
    - lisibilité du chemin distant sur le Mac exécutant Messages

  </Accordion>

  <Accordion title="macOSLes invites d'autorisation macOS ont été manquées">
    Relancez dans un terminal GUI interactif dans le même contexte utilisateur/session et approuvez les invites :

    ```bash
    imsg chats --limit 1
    imsg send <handle> "test"
    ```OpenClaw

    Confirmez que l'accès complet au disque + l'automatisation sont accordés pour le contexte de processus qui exécute OpenClaw/`imsg`.

  </Accordion>
</AccordionGroup>

## Pointeurs vers la référence de configuration

- [Référence de configuration - iMessage](iMessage/en/gateway/config-channels#imessage)
- [Configuration de la passerelle](Gateway/en/gateway/configuration)
- [Appariement](/en/channels/pairing)

## Connexes

- [Aperçu des canaux](/en/channels) — tous les canaux pris en charge
- [Suppression de BlueBubbles et le chemin iMessage imsg](BlueBubblesiMessage/en/announcements/bluebubbles-imessage) — annonce et résumé de la migration
- [En provenance de BlueBubbles](BlueBubbles/en/channels/imessage-from-bluebubbles) — table de traduction de configuration et basculement étape par étape
- [Appariement](/en/channels/pairing) — authentification DM et flux d'appariement
- [Groupes](/en/channels/groups) — comportement du chat de groupe et filtrage des mentions
- [Routage de canal](/en/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/en/gateway/security) — modèle d'accès et durcissement
