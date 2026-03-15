---
summary: "Statut, capacités et configuration du support des bots Discord"
read_when:
  - Working on Discord channel features
title: "Discord"
---

# Discord (Bot API)

Statut : prêt pour les DMs et les channels de serveur via la passerelle Discord officielle.

<CardGroup cols={3}>
  <Card title="Appariement" icon="link" href="/fr/channels/pairing">
    Les DMs Discord sont par défaut en mode appariement.
  </Card>
  <Card title="Commandes slash" icon="terminal" href="/fr/tools/slash-commands">
    Comportement des commandes natives et catalogue de commandes.
  </Card>
  <Card title="Dépannage du channel" icon="wrench" href="/fr/channels/troubleshooting">
    Diagnostics et flux de réparation inter-canaux.
  </Card>
</CardGroup>

## Configuration rapide

Vous devrez créer une nouvelle application avec un bot, ajouter le bot à votre serveur et le jumeler à OpenClaw. Nous vous recommandons d'ajouter votre bot à votre propre serveur privé. Si vous n'en avez pas encore un, [créez-en un d'abord](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server) (choisissez **Créer le mien > Pour moi et mes amis**).

<Steps>
  <Step title="Créer une application et un bot Discord">
    Allez sur le [portail développeur Discord](https://discord.com/developers/applications) et cliquez sur **New Application**. Nommez-le quelque chose comme "OpenClaw".

    Cliquez sur **Bot** dans la barre latérale. Définissez le **Username** comme vous appelez votre agent OpenClaw.

  </Step>

  <Step title="Activer les intentions privilégiées">
    Toujours sur la page **Bot**, faites défiler vers le bas jusqu'à **Privileged Gateway Intents** et activez :

    - **Message Content Intent** (requis)
    - **Server Members Intent** (recommandé ; requis pour les listes d'autorisation de rôle et la correspondance nom-ID)
    - **Presence Intent** (facultatif ; nécessaire uniquement pour les mises à jour de présence)

  </Step>

  <Step title="Copy your bot token">
    Remontez sur la page **Bot** et cliquez sur **Reset Token**.

    <Note>
    Malgré son nom, cela génère votre premier jeton — rien n'est « réinitialisé ».
    </Note>

    Copiez le jeton et enregistrez-le quelque part. C'est votre **Bot Token** et vous en aurez besoin sous peu.

  </Step>

  <Step title="Generate an invite URL and add the bot to your server">
    Cliquez sur **OAuth2** dans la barre latérale. Vous allez générer une URL d'invitation avec les bonnes permissions pour ajouter le bot à votre serveur.

    Faites défiler jusqu'à **OAuth2 URL Generator** et activez :

    - `bot`
    - `applications.commands`

    Une section **Bot Permissions** apparaîtra ci-dessous. Activez :

    - View Channels
    - Send Messages
    - Read Message History
    - Embed Links
    - Attach Files
    - Add Reactions (optionnel)

    Copiez l'URL générée en bas, collez-la dans votre navigateur, sélectionnez votre serveur, et cliquez sur **Continue** pour vous connecter. Vous devriez maintenant voir votre bot sur le serveur Discord.

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    De retour dans l'application Discord, vous devez activer le Mode Développeur afin de pouvoir copier les identifiants internes.

    1. Cliquez sur **User Settings** (icône d'engrenage à côté de votre avatar) → **Advanced** → activez **Developer Mode**
    2. Faites un clic droit sur votre **icône de serveur** dans la barre latérale → **Copy Server ID**
    3. Faites un clic droit sur **votre propre avatar** → **Copy User ID**

    Enregistrez votre **Server ID** et votre **User ID** ainsi que votre Bot Token — vous enverrez les trois à OpenClaw à l'étape suivante.

  </Step>

  <Step title="Allow DMs from server members">
    Pour que le couplage fonctionne, Discord doit autoriser votre bot à vous envoyer des DMs. Faites un clic droit sur votre **icône de serveur** → **Paramètres de confidentialité** → activez **Messages directs**.

    Cela permet aux membres du serveur (y compris les bots) de vous envoyer des DMs. Gardez ceci activé si vous souhaitez utiliser les DMs Discord avec OpenClaw. Si vous prévoyez uniquement d'utiliser les canaux de guilde, vous pouvez désactiver les DMs après le couplage.

  </Step>

  <Step title="Step 0: Set your bot token securely (do not send it in chat)">
    Le jeton de votre bot Discord est un secret (comme un mot de passe). Définissez-le sur la machine exécutant OpenClaw avant d'envoyer un message à votre agent.

```bash
openclaw config set channels.discord.token '"YOUR_BOT_TOKEN"' --json
openclaw config set channels.discord.enabled true --json
openclaw gateway
```

    Si OpenClaw s'exécute déjà en tant que service d'arrière-plan, utilisez plutôt `openclaw gateway restart`.

  </Step>

  <Step title="Configure OpenClaw and pair">

    <Tabs>
      <Tab title="Ask your agent">
        Discutez avec votre agent OpenClaw sur n'importe quel canal existant (par exemple, Telegram) et dites-le-lui. Si Discord est votre premier canal, utilisez plutôt l'onglet CLI / config.

        > "J'ai déjà défini mon jeton de bot Discord dans la configuration. Veuillez terminer la configuration Discord avec l'ID d'utilisateur `<user_id>` et l'ID de serveur `<server_id>`."
      </Tab>
      <Tab title="CLI / config">
        Si vous préférez une configuration basée sur les fichiers, définissez :

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: "YOUR_BOT_TOKEN",
    },
  },
}
```

        Fallback d'environnement pour le compte par défaut :

```bash
DISCORD_BOT_TOKEN=...
```

        Les valeurs SecretRef sont également prises en charge pour `channels.discord.token` (fournisseurs env/file/exec). Voir [Gestion des secrets](/fr/gateway/secrets).

      </Tab>
    </Tabs>

  </Step>

  <Step title="Approuver le premier appariement DM">
    Attendez que la passerelle soit en cours d'exécution, puis envoyez un DM à votre bot sur Discord. Il répondra avec un code d'appariement.

    <Tabs>
      <Tab title="Demander à votre agent">
        Envoyez le code d'appariement à votre agent sur votre channel existant :

        > "Approuver ce code d'appariement Discord : `<CODE>`"
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    Les codes d'appariement expirent après 1 heure.

    Vous devriez maintenant être en mesure de discuter avec votre agent sur Discord via DM.

  </Step>
</Steps>

<Note>
  La résolution des jetons est consciente du compte. Les valeurs de jeton de configuration priment
  sur le repli de l'environnement. `DISCORD_BOT_TOKEN` est utilisé uniquement pour le compte par
  défaut. Pour les appels sortants avancés (outil de message/actions de channel), un `token`
  explicite par appel est utilisé pour cet appel. Les paramètres de stratégie/réessai du compte
  proviennent toujours du compte sélectionné dans l'instantané d'exécution actif.
</Note>

## Recommandé : Configurer un espace de travail de guilde

Une fois que les DMs fonctionnent, vous pouvez configurer votre serveur Discord comme un espace de travail complet où chaque channel obtient sa propre session d'agent avec son propre contexte. Ceci est recommandé pour les serveurs privés où il n'y a que vous et votre bot.

<Steps>
  <Step title="Ajouter votre serveur à la liste d'autorisation de guilde">
    Cela permet à votre agent de répondre dans n'importe quel channel de votre serveur, et pas seulement dans les DMs.

    <Tabs>
      <Tab title="Demander à votre agent">
        > "Ajoutez mon ID de serveur Discord `<server_id>` à la liste d'autorisation de guilde"
      </Tab>
      <Tab title="Config">

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: true,
          users: ["YOUR_USER_ID"],
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step title="Allow responses without @mention">
    Par défaut, votre agent ne répond dans les salons de guilde que lorsqu'il est mentionné (@mention). Pour un serveur privé, vous souhaitez probablement qu'il réponde à chaque message.

    <Tabs>
      <Tab title="Ask your agent">
        > « Autoriser mon agent à répondre sur ce serveur sans avoir à être mentionné »
      </Tab>
      <Tab title="Config">
        Définissez `requireMention: false` dans votre configuration de guilde :

```json5
{
  channels: {
    discord: {
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: false,
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step title="Plan for memory in guild channels">
    Par défaut, la mémoire à long terme (MEMORY.md) ne se charge que lors des sessions de DM. Les salons de guilde ne chargent pas automatiquement MEMORY.md.

    <Tabs>
      <Tab title="Ask your agent">
        > « Lorsque je pose des questions dans les salons Discord, utilise memory_search ou memory_get si tu as besoin d'un contexte à long terme de MEMORY.md. »
      </Tab>
      <Tab title="Manual">
        Si tu as besoin d'un contexte partagé dans chaque salon, mets les instructions stables dans `AGENTS.md` ou `USER.md` (elles sont injectées pour chaque session). Garde les notes à long terme dans `MEMORY.md` et accède-y à la demande avec les outils de mémoire.
      </Tab>
    </Tabs>

  </Step>
</Steps>

Créez maintenant quelques salons sur votre serveur Discord et commencez à discuter. Votre agent peut voir le nom du salon, et chaque salon obtient sa propre session isolée — vous pouvez donc configurer `#coding`, `#home`, `#research`, ou tout ce qui convient à votre flux de travail.

## Modèle d'exécution

- Gateway possède la connexion Discord.
- Le routage des réponses est déterministe : les réponses entrantes Discord sont renvoyées vers Discord.
- Par défaut (`session.dmScope=main`), les chats directs partagent la session principale de l'agent (`agent:main:main`).
- Les canaux de guilde sont des clés de session isolées (`agent:<agentId>:discord:channel:<channelId>`).
- Les DMs de groupe sont ignorés par défaut (`channels.discord.dm.groupEnabled=false`).
- Les commandes slash natives s'exécutent dans des sessions de commande isolées (`agent:<agentId>:discord:slash:<userId>`), tout en transportant toujours `CommandTargetSessionKey` vers la session de conversation acheminée.

## Canaux de forum

Discord forum et media channels n'acceptent que les publications de fil. OpenClaw prend en charge deux façons de les créer :

- Envoyez un message au parent du forum (`channel:<forumId>`) pour créer automatiquement un fil. Le titre du fil utilise la première ligne non vide de votre message.
- Utilisez `openclaw message thread create` pour créer un fil directement. Ne transmettez pas `--message-id` pour les canaux de forum.

Exemple : envoyer au parent du forum pour créer un fil

```bash
openclaw message send --channel discord --target channel:<forumId> \
  --message "Topic title\nBody of the post"
```

Exemple : créer un fil de forum explicitement

```bash
openclaw message thread create --channel discord --target channel:<forumId> \
  --thread-name "Topic title" --message "Body of the post"
```

Les parents de forum n'acceptent pas les composants Discord. Si vous avez besoin de composants, envoyez-les au fil lui-même (`channel:<threadId>`).

## Composants interactifs

OpenClaw prend en charge les conteneurs de composants v2 Discord pour les messages de l'agent. Utilisez l'outil de message avec une charge utile `components`. Les résultats de l'interaction sont renvoyés à l'agent sous forme de messages entrants normaux et suivent les paramètres `replyToMode` Discord existants.

Blocs pris en charge :

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- Les lignes d'action permettent jusqu'à 5 boutons ou un seul menu de sélection
- Types de sélection : `string`, `user`, `role`, `mentionable`, `channel`

Par défaut, les composants sont à usage unique. Définissez `components.reusable=true` pour permettre aux boutons, sélecteurs et formulaires d'être utilisés plusieurs fois jusqu'à leur expiration.

Pour restreindre qui peut cliquer sur un bouton, définissez `allowedUsers` sur ce bouton (identifiants utilisateur Discord, balises ou `*`). Lorsqu'il est configuré, les utilisateurs non correspondants reçoivent un refus éphémère.

Les commandes slash `/model` et `/models` ouvrent un sélecteur de modèle interactif avec des menus déroulants pour le fournisseur et le modèle, ainsi qu'une étape de validation (Submit). La réponse du sélecteur est éphémère et seul l'utilisateur appelant peut l'utiliser.

Pièces jointes :

- Les blocs `file` doivent pointer vers une référence de pièce jointe (`attachment://<filename>`)
- Fournissez la pièce jointe via `media`/`path`/`filePath` (fichier unique) ; utilisez `media-gallery` pour plusieurs fichiers
- Utilisez `filename` pour remplacer le nom du téléchargement lorsqu'il doit correspondre à la référence de la pièce jointe

Formulaires modaux :

- Ajoutez `components.modal` avec jusqu'à 5 champs
- Types de champs : `text`, `checkbox`, `radio`, `select`, `role-select`, `user-select`
- OpenClaw ajoute automatiquement un bouton de déclenchement

Exemple :

```json5
{
  channel: "discord",
  action: "send",
  to: "channel:123456789012345678",
  message: "Optional fallback text",
  components: {
    reusable: true,
    text: "Choose a path",
    blocks: [
      {
        type: "actions",
        buttons: [
          {
            label: "Approve",
            style: "success",
            allowedUsers: ["123456789012345678"],
          },
          { label: "Decline", style: "danger" },
        ],
      },
      {
        type: "actions",
        select: {
          type: "string",
          placeholder: "Pick an option",
          options: [
            { label: "Option A", value: "a" },
            { label: "Option B", value: "b" },
          ],
        },
      },
    ],
    modal: {
      title: "Details",
      triggerLabel: "Open form",
      fields: [
        { type: "text", label: "Requester" },
        {
          type: "select",
          label: "Priority",
          options: [
            { label: "Low", value: "low" },
            { label: "High", value: "high" },
          ],
        },
      ],
    },
  },
}
```

## Contrôle d'accès et routage

<Tabs>
  <Tab title="Stratégie de DM">
    `channels.discord.dmPolicy` contrôle l'accès aux DM (ancien : `channels.discord.dm.policy`) :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `channels.discord.allowFrom` inclue `"*"` ; ancien : `channels.discord.dm.allowFrom`)
    - `disabled`

    Si la stratégie de DM n'est pas ouverte, les utilisateurs inconnus sont bloqués (ou invités à s'appairer en mode `pairing`).

    Priorité multi-compte :

    - `channels.discord.accounts.default.allowFrom` s'applique uniquement au compte `default`.
    - Les comptes nommés héritent de `channels.discord.allowFrom` lorsque leur propre `allowFrom` n'est pas définie.
    - Les comptes nommés n'héritent pas de `channels.discord.accounts.default.allowFrom`.

    Format de la cible DM pour la livraison :

    - `user:<id>`
    - Mention `<@id>`

    Les identifiants numériques seuls sont ambigus et rejetés, sauf si un type de cible utilisateur/channel explicite est fourni.

  </Tab>

  <Tab title="Guild policy">
    La gestion des guildes est contrôlée par `channels.discord.groupPolicy` :

    - `open`
    - `allowlist`
    - `disabled`

    La base sécurisée lorsque `channels.discord` existe est `allowlist`.

    Comportement de `allowlist` :

    - la guilde doit correspondre à `channels.discord.guilds` (`id` préféré, slug accepté)
    - listes d'autorisation d'envoi optionnelles : `users` (IDs stables recommandés) et `roles` (IDs de rôles uniquement) ; si l'une ou l'autre est configurée, les expéditeurs sont autorisés lorsqu'ils correspondent à `users` OU `roles`
    - la correspondance directe par nom/balise est désactivée par défaut ; n'activez `channels.discord.dangerouslyAllowNameMatching: true` qu'en mode de compatibilité de secours
    - les noms/balises sont pris en charge pour `users`, mais les IDs sont plus sûrs ; `openclaw security audit` avertit lorsque des entrées de nom/balise sont utilisées
    - si une guilde a `channels` configuré, les canaux non listés sont refusés
    - si une guilde n'a pas de bloc `channels`, tous les canaux de cette guilde autorisée sont acceptés

    Exemple :

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "123456789012345678": {
          requireMention: true,
          ignoreOtherMentions: true,
          users: ["987654321098765432"],
          roles: ["123456789012345678"],
          channels: {
            general: { allow: true },
            help: { allow: true, requireMention: true },
          },
        },
      },
    },
  },
}
```

    Si vous ne définissez que `DISCORD_BOT_TOKEN` et ne créez pas de bloc `channels.discord`, le repli à l'exécution est `groupPolicy="allowlist"` (avec un avertissement dans les journaux), même si `channels.defaults.groupPolicy` est `open`.

  </Tab>

  <Tab title="Mentions et messages de groupe">
    Les messages de serveur sont filtrés par mention par défaut.

    La détection de mention inclut :

    - mention explicite du bot
    - modèles de mention configurés (`agents.list[].groupChat.mentionPatterns`, repli `messages.groupChat.mentionPatterns`)
    - comportement de réponse implicite au bot dans les cas pris en charge

    `requireMention` est configuré par serveur/channel (`channels.discord.guilds...`).
    `ignoreOtherMentions` ignore facultativement les messages qui mentionnent un autre utilisateur/rôle mais pas le bot (à l'exclusion de @everyone/@here).

    Messages de groupe :

    - par défaut : ignorés (`dm.groupEnabled=false`)
    - liste d'autorisation facultative via `dm.groupChannels` (identifiants de channel ou slugs)

  </Tab>
</Tabs>

### Routage des agents basé sur les rôles

Utilisez `bindings[].match.roles` pour router les membres de la guilde Discord vers différents agents par ID de rôle. Les liaisons basées sur les rôles n'acceptent que les ID de rôle et sont évaluées après les liaisons homologue ou homologue-parent et avant les liaisons de guilde uniquement. Si une liaison définit également d'autres champs de correspondance (par exemple `peer` + `guildId` + `roles`), tous les champs configurés doivent correspondre.

```json5
{
  bindings: [
    {
      agentId: "opus",
      match: {
        channel: "discord",
        guildId: "123456789012345678",
        roles: ["111111111111111111"],
      },
    },
    {
      agentId: "sonnet",
      match: {
        channel: "discord",
        guildId: "123456789012345678",
      },
    },
  ],
}
```

## Configuration du portail développeur

<AccordionGroup>
  <Accordion title="Créer une application et un bot">

    1. Discord Developer Portal -> **Applications** -> **New Application**
    2. **Bot** -> **Add Bot**
    3. Copier le jeton du bot

  </Accordion>

  <Accordion title="Intents privilégiés">
    Dans **Bot -> Privileged Gateway Intents**, activez :

    - Message Content Intent
    - Server Members Intent (recommandé)

    Presence intent est facultatif et uniquement nécessaire si vous souhaitez recevoir les mises à jour de présence. Définir la présence du bot (`setPresence`) ne nécessite pas l'activation des mises à jour de présence pour les membres.

  </Accordion>

  <Accordion title="OAuth scopes et baseline permissions">
    Générateur d'URL OAuth :

    - portées : `bot`, `applications.commands`

    Baseline permissions typiques :

    - View Channels
    - Send Messages
    - Read Message History
    - Embed Links
    - Attach Files
    - Add Reactions (optionnel)

    Évitez `Administrator` sauf si explicitement nécessaire.

  </Accordion>

  <Accordion title="Copier les IDs">
    Activez le mode développeur Discord, puis copiez :

    - ID de serveur
    - ID de channel
    - ID d'utilisateur

    Préférez les ID numériques dans la configuration OpenClaw pour des audits et sondages fiables.

  </Accordion>
</AccordionGroup>

## Commandes natives et authentification des commandes

- `commands.native` est `"auto"` par défaut et est activé pour Discord.
- Substitution par channel : `channels.discord.commands.native`.
- `commands.native=false` efface explicitement les commandes natives Discord précédemment enregistrées.
- L'authentification des commandes natives utilise les mêmes allowlists/politiques Discord que la gestion normale des messages.
- Les commandes peuvent encore être visibles dans l'interface de Discord pour les utilisateurs non autorisés ; l'exécution applique toujours l'authentification OpenClaw et renvoie "not authorized".

Voir [Slash commands](/fr/tools/slash-commands) pour le catalogue et le comportement des commandes.

Paramètres par défaut des commandes slash :

- `ephemeral: true`

## Détails des fonctionnalités

<AccordionGroup>
  <Accordion title="Répondre aux balises et réponses natives">
    Discord prend en charge les balises de réponse dans la sortie de l'agent :

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    Contrôlé par `channels.discord.replyToMode` :

    - `off` (par défaut)
    - `first`
    - `all`

    Remarque : `off` désactive le fil de discussion implicite. Les balises `[[reply_to_*]]` explicites sont toujours honorées.

    Les ID de message sont affichés dans le contexte/historique afin que les agents puissent cibler des messages spécifiques.

  </Accordion>

  <Accordion title="Aperçu du flux en direct">
    OpenClaw peut diffuser des réponses brouillon en envoyant un message temporaire et en le modifiant au fur et à mesure de l'arrivée du texte.

    - `channels.discord.streaming` contrôle le streaming de prévisualisation (`off` | `partial` | `block` | `progress`, par défaut : `off`).
    - `progress` est accepté pour la cohérence inter-canal et correspond à `partial` sur Discord.
    - `channels.discord.streamMode` est un alias hérité et est automatiquement migré.
    - `partial` modifie un seul message de prévisualisation à l'arrivée des jetons.
    - `block` émet des fragments de taille brouillon (utilisez `draftChunk` pour régler la taille et les points d'arrêt).

    Exemple :

```json5
{
  channels: {
    discord: {
      streaming: "partial",
    },
  },
}
```

    `block` mode chunking par défaut (limité à `channels.discord.textChunkLimit`) :

```json5
{
  channels: {
    discord: {
      streaming: "block",
      draftChunk: {
        minChars: 200,
        maxChars: 800,
        breakPreference: "paragraph",
      },
    },
  },
}
```

    Le streaming de prévisualisation est textuel uniquement ; les réponses multimédias reviennent à la livraison normale.

    Remarque : le streaming de prévisualisation est distinct du block streaming. Lorsque le block streaming est explicitement
    activé pour Discord, OpenClaw ignore le flux de prévisualisation pour éviter le double streaming.

  </Accordion>

  <Accordion title="History, context, and thread behavior">
    Contexte de l'historique de la guilde :

    - `channels.discord.historyLimit` default `20`
    - repli : `messages.groupChat.historyLimit`
    - `0` désactive

    Contrôles de l'historique des DM :

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    Comportement des fils de discussion :

    - Les fils de discussion Discord sont acheminés en tant que sessions de canal
    - les métadonnées du fil parent peuvent être utilisées pour la liaison avec la session parente
    - la configuration du fil hérite de la configuration du canal parent, sauf si une entrée spécifique au fil existe

    Les sujets des canaux sont injectés en tant que contexte **non approuvé** (et non en tant que prompt système).

  </Accordion>

  <Accordion title="Sessions liées aux fils pour les sous-agents">
    Discord peut lier un fil à une cible de session afin que les messages de suivi dans ce fil continuent d'être acheminés vers la même session (y compris les sessions de sous-agent).

    Commandes :

    - `/focus <target>` lier le fil actuel/nouveau à une cible de sous-agent/session
    - `/unfocus` supprimer la liaison du fil actuel
    - `/agents` afficher les exécutions actives et l'état de liaison
    - `/session idle <duration|off>` inspecter/mettre à jour l'auto-défocus par inactivité pour les liaisons focalisées
    - `/session max-age <duration|off>` inspecter/mettre à jour l'âge maximal absolu pour les liaisons focalisées

    Config :

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
    },
  },
  channels: {
    discord: {
      threadBindings: {
        enabled: true,
        idleHours: 24,
        maxAgeHours: 0,
        spawnSubagentSessions: false, // opt-in
      },
    },
  },
}
```

    Notes :

    - `session.threadBindings.*` définit les valeurs globales par défaut.
    - `channels.discord.threadBindings.*` remplace le comportement de Discord.
    - `spawnSubagentSessions` doit être vrai pour créer/lier automatiquement des fils pour `sessions_spawn({ thread: true })`.
    - `spawnAcpSessions` doit être vrai pour créer/lier automatiquement des fils pour l'ACP (`/acp spawn ... --thread ...` ou `sessions_spawn({ runtime: "acp", thread: true })`).
    - Si les liaisons de fils sont désactivées pour un compte, `/focus` et les opérations de liaison de fils connexes ne sont pas disponibles.

    Voir [Sous-agents](/fr/tools/subagents), [Agents ACP](/fr/tools/acp-agents) et [Référence de configuration](/fr/gateway/configuration-reference).

  </Accordion>

  <Accordion title="Liaisons de canal ACP persistantes">
    Pour les espaces de travail ACP stables et « toujours actifs », configurez des liaisons ACP typées de premier niveau ciblant les conversations Discord.

    Chemin de configuration :

    - `bindings[]` avec `type: "acp"` et `match.channel: "discord"`

    Exemple :

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": {
              requireMention: false,
            },
          },
        },
      },
    },
  },
}
```

    Notes :

    - Les messages de fil peuvent hériter de la liaison ACP du canal parent.
    - Dans un canal ou un fil lié, `/new` et `/reset` réinitialisent la même session ACP en place.
    - Les liaisons temporaires de fil fonctionnent toujours et peuvent remplacer la résolution de la cible tant qu'elles sont actives.

    Voir [ACP Agents](/fr/tools/acp-agents) pour plus de détails sur le comportement des liaisons.

  </Accordion>

  <Accordion title="Notifications de réaction">
    Mode de notification de réaction par guilde :

    - `off`
    - `own` (par défaut)
    - `all`
    - `allowlist` (utilise `guilds.<id>.users`)

    Les événements de réaction sont transformés en événements système et attachés à la session Discord acheminée.

  </Accordion>

  <Accordion title="Réactions d'accusé de réception">
    `ackReaction` envoie un emoji d'accusé de réception pendant que OpenClaw traite un message entrant.

    Ordre de résolution :

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - repli vers l'emoji d'identité de l'agent (`agents.list[].identity.emoji`, sinon « 👀 »)

    Notes :

    - Discord accepte les emoji unicode ou les noms d'emoji personnalisés.
    - Utilisez `""` pour désactiver la réaction pour un canal ou un compte.

  </Accordion>

  <Accordion title="Écritures de configuration">
    Les écritures de configuration initiées par le canal sont activées par défaut.

    Cela affecte les flux `/config set|unset` (lorsque les fonctionnalités de commande sont activées).

    Désactiver :

```json5
{
  channels: {
    discord: {
      configWrites: false,
    },
  },
}
```

  </Accordion>

  <Accordion title="Proxy Gateway">
    Acheminez le trafic WebSocket de la Discord gateway et les recherches REST de démarrage (ID d'application + résolution de liste d'autorisation) via un proxy HTTP(S) avec `channels.discord.proxy`.

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    Remplacement par compte :

```json5
{
  channels: {
    discord: {
      accounts: {
        primary: {
          proxy: "http://proxy.example:8080",
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="Support PluralKit">
    Activez la résolution PluralKit pour mapper les messages proxys à l'identité du membre du système :

```json5
{
  channels: {
    discord: {
      pluralkit: {
        enabled: true,
        token: "pk_live_...", // optional; needed for private systems
      },
    },
  },
}
```

    Notes :

    - les listes d'autorisation peuvent utiliser `pk:<memberId>`
    - les noms d'affichage des membres sont mis en correspondance par nom/slug uniquement lorsque `channels.discord.dangerouslyAllowNameMatching: true`
    - les recherches utilisent l'ID du message d'origine et sont contraintes par une fenêtre de temps
    - si la recherche échoue, les messages proxys sont traités comme des messages de bot et supprimés sauf si `allowBots=true`

  </Accordion>

  <Accordion title="Configuration de la présence">
    Les mises à jour de la présence sont appliquées lorsque vous définissez un champ de statut ou d'activité, ou lorsque vous activez la présence automatique.

    Exemple de statut uniquement :

```json5
{
  channels: {
    discord: {
      status: "idle",
    },
  },
}
```

    Exemple d'activité (le statut personnalisé est le type d'activité par défaut) :

```json5
{
  channels: {
    discord: {
      activity: "Focus time",
      activityType: 4,
    },
  },
}
```

    Exemple de streaming :

```json5
{
  channels: {
    discord: {
      activity: "Live coding",
      activityType: 1,
      activityUrl: "https://twitch.tv/openclaw",
    },
  },
}
```

    Carte des types d'activités :

    - 0 : Joue à
    - 1 : Stream (nécessite `activityUrl`)
    - 2 : Écoute
    - 3 : Regarde
    - 4 : Personnalisé (utilise le texte de l'activité comme état du statut ; l'emoji est facultatif)
    - 5 : En compétition

    Exemple de présence automatique (signal de santé d'exécution) :

```json5
{
  channels: {
    discord: {
      autoPresence: {
        enabled: true,
        intervalMs: 30000,
        minUpdateIntervalMs: 15000,
        exhaustedText: "token exhausted",
      },
    },
  },
}
```

    La présence automatique mappe la disponibilité d'exécution au statut Discord : sain => en ligne, dégradé ou inconnu => inactif, épuisé ou indisponible => ne pas déranger. Remplacements de texte facultatifs :

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (prend en charge l'espace réservé `{reason}`)

  </Accordion>

  <Accordion title="Approbations d'exécution dans Discord">
    Discord prend en charge les approbations d'exécution basées sur des boutons dans les DMs et peut éventuellement publier des invites d'approbation dans le channel d'origine.

    Chemin de configuration :

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    Lorsque `target` est `channel` ou `both`, l'invite d'approbation est visible dans le channel. Seuls les approbateurs configurés peuvent utiliser les boutons ; les autres utilisateurs reçoivent un refus éphémère. Les invites d'approbation incluent le texte de la commande, n'activez donc la diffusion dans le channel que dans les channels de confiance. Si l'ID du channel ne peut pas être dérivé de la clé de session, OpenClaw revient à la livraison par DM.

    L'authentification Gateway pour ce gestionnaire utilise le même contrat de résolution d'informations d'identification partagé que les autres clients Gateway :

    - authentification locale prioritaire à l'environnement (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` puis `gateway.auth.*`)
    - en mode local, `gateway.remote.*` peut être utilisé comme solution de repli uniquement lorsque `gateway.auth.*` n'est pas défini ; les SecretRefs locaux configurés mais non résolus échouent de manière fermée
    - prise en charge du mode distant via `gateway.remote.*` le cas échéant
    - les remplacements d'URL sont sécurisés contre les remplacements : les remplacements CLI ne réutilisent pas les informations d'identification implicites, et les remplacements d'environnement utilisent uniquement les informations d'identification d'environnement

    Si les approbations échouent avec des ID d'approbation inconnus, vérifiez la liste des approbateurs et l'activation de la fonctionnalité.

    Documentation connexe : [Approbations d'exécution](/fr/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## Outils et portails d'action

Les actions de message Discord incluent la messagerie, l'administration de channel, la modération, la présence et les actions de métadonnées.

Exemples de base :

- messagerie : `sendMessage`, `readMessages`, `editMessage`, `deleteMessage`, `threadReply`
- réactions : `react`, `reactions`, `emojiList`
- modération : `timeout`, `kick`, `ban`
- présence : `setPresence`

Les portails d'action se trouvent sous `channels.discord.actions.*`.

Comportement du portail par défaut :

| Groupe d'actions                                                                                                                                                         | Par défaut |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | activé     |
| rôles                                                                                                                                                                    | désactivé  |
| modération                                                                                                                                                               | désactivé  |
| présence                                                                                                                                                                 | désactivé  |

## Interface utilisateur des composants v2

OpenClaw utilise les composants v2 de Discord pour les approbations d'exécution et les marqueurs inter-contextes. Les actions de message Discord peuvent également accepter `components` pour une interface utilisateur personnalisée (avancé ; nécessite des instances de composants Carbon), tandis que les `embeds` obsolètes restent disponibles mais ne sont pas recommandées.

- `channels.discord.ui.components.accentColor` définit la couleur d'accentuation utilisée par les conteneurs de composants Discord (hex).
- Définir par compte avec `channels.discord.accounts.<id>.ui.components.accentColor`.
- Les `embeds` sont ignorés lorsque les composants v2 sont présents.

Exemple :

```json5
{
  channels: {
    discord: {
      ui: {
        components: {
          accentColor: "#5865F2",
        },
      },
    },
  },
}
```

## Canaux vocaux

OpenClaw peut rejoindre les canaux vocaux Discord pour des conversations en temps réel et continues. Ceci est distinct des pièces jointes de messages vocaux.

Conditions requises :

- Activer les commandes natives (`commands.native` ou `channels.discord.commands.native`).
- Configurer `channels.discord.voice`.
- Le bot a besoin des autorisations Connect + Speak dans le canal vocal cible.

Utilisez la commande native exclusivement Discord `/vc join|leave|status` pour contrôler les sessions. La commande utilise l'agent par défaut du compte et suit les mêmes règles de liste blanche et de stratégie de groupe que les autres commandes Discord.

Exemple de rejoindre automatiquement :

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        autoJoin: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        daveEncryption: true,
        decryptionFailureTolerance: 24,
        tts: {
          provider: "openai",
          openai: { voice: "alloy" },
        },
      },
    },
  },
}
```

Notes :

- `voice.tts` remplace `messages.tts` uniquement pour la lecture audio.
- Les tours de transcription vocale dérivent le statut de propriétaire des Discord `allowFrom` (ou `dm.allowFrom`) ; les orateurs non propriétaires ne peuvent pas accéder aux outils réservés aux propriétaires (par exemple `gateway` et `cron`).
- La voix est activée par défaut ; définissez `channels.discord.voice.enabled=false` pour la désactiver.
- `voice.daveEncryption` et `voice.decryptionFailureTolerance` sont transmis aux options de jointure `@discordjs/voice`.
- Les valeurs par défaut `@discordjs/voice` sont `daveEncryption=true` et `decryptionFailureTolerance=24` si elles ne sont pas définies.
- OpenClaw surveille également les échecs de déchiffrement à la réception et récupère automatiquement en quittant/rejoignant le canal vocal après des échecs répétés sur une courte période.
- Si les journaux de réception affichent répétitivement `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`, il peut s'agir du bogue de réception `@discordjs/voice` en amont suivi dans [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419).

## Messages vocaux

Les messages vocaux Discord affichent un aperçu de la forme d'onde et nécessitent de l'audio OGG/Opus ainsi que des métadonnées. OpenClaw génère la forme d'onde automatiquement, mais il a besoin de `ffmpeg` et `ffprobe` disponibles sur l'hôte de la passerelle pour inspecter et convertir les fichiers audio.

Exigences et contraintes :

- Fournissez un **chemin de fichier local** (les URL sont rejetées).
- Omettez le contenu textuel (%PH:GLOSSARY:579:d023a58e%% n'autorise pas le texte + message vocal dans la même charge utile).
- Tout format audio est accepté ; OpenClaw convertit en OGG/Opus si nécessaire.

Exemple :

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## Dépannage

<AccordionGroup>
  <Accordion title="Used disallowed intents or bot sees no guild messages">

    - activer l'intention de contenu de message (Message Content Intent)
    - activer l'intention de membres du serveur (Server Members Intent) lorsque vous dépendez de la résolution des utilisateurs/membres
    - redémarrer la passerelle après avoir modifié les intentions

  </Accordion>

  <Accordion title="Guild messages blocked unexpectedly">

    - vérifier `groupPolicy`
    - vérifier la liste d'autorisation de guilde sous `channels.discord.guilds`
    - si la carte `channels` de guilde existe, seuls les canaux listés sont autorisés
    - vérifier le comportement `requireMention` et les modèles de mention

    Vérifications utiles :

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Require mention false but still blocked">
    Causes courantes :

    - `groupPolicy="allowlist"` sans liste d'autorisation de guilde/canal correspondante
    - `requireMention` configuré au mauvais endroit (doit être sous `channels.discord.guilds` ou l'entrée de canal)
    - expéditeur bloqué par la liste d'autorisation `users` de guilde/canal

  </Accordion>

  <Accordion title="Long-running handlers time out or duplicate replies">

    Journaux typiques :

    - `Listener DiscordMessageListener timed out after 30000ms for event MESSAGE_CREATE`
    - `Slow listener detected ...`
    - `discord inbound worker timed out after ...`

    Bouton de budget d'écoute (Listener budget) :

    - compte unique : `channels.discord.eventQueue.listenerTimeout`
    - multi-compte : `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`

    Bouton de délai d'exécution du worker :

    - compte unique : `channels.discord.inboundWorker.runTimeoutMs`
    - multi-compte : `channels.discord.accounts.<accountId>.inboundWorker.runTimeoutMs`
    - par défaut : `1800000` (30 minutes) ; définir `0` pour désactiver

    Référence de base recommandée :

```json5
{
  channels: {
    discord: {
      accounts: {
        default: {
          eventQueue: {
            listenerTimeout: 120000,
          },
          inboundWorker: {
            runTimeoutMs: 1800000,
          },
        },
      },
    },
  },
}
```

    Utilisez `eventQueue.listenerTimeout` pour une configuration d'écoute lente et `inboundWorker.runTimeoutMs`
    uniquement si vous souhaitez une soupape de sécurité distincte pour les tours d'agent en file d'attente.

  </Accordion>

  <Accordion title="Permissions audit mismatches">
    Les vérifications de permission `channels status --probe` ne fonctionnent que pour les IDs de canal numériques.

    Si vous utilisez des clés de slug, la correspondance lors de l'exécution peut toujours fonctionner, mais la sonde ne peut pas vérifier entièrement les permissions.

  </Accordion>

  <Accordion title="DM and pairing issues">

    - DM désactivé : `channels.discord.dm.enabled=false`
    - Politique de DM désactivée : `channels.discord.dmPolicy="disabled"` (obsolète : `channels.discord.dm.policy`)
    - en attente de l'approbation du jumelage en mode `pairing`

  </Accordion>

  <Accordion title="Bot to bot loops">
    Par défaut, les messages créés par des bots sont ignorés.

    Si vous définissez `channels.discord.allowBots=true`, utilisez des règles de mention strictes et des listes d'autorisation pour éviter les comportements en boucle.
    Privilégiez `channels.discord.allowBots="mentions"` pour n'accepter que les messages de bot qui mentionnent le bot.

  </Accordion>

  <Accordion title="Voice STT drops with DecryptionFailed(...)">

    - gardez OpenClaw à jour (`openclaw update`) pour que la logique de récupération de réception vocale Discord soit présente
    - confirmez `channels.discord.voice.daveEncryption=true` (par défaut)
    - commencez par `channels.discord.voice.decryptionFailureTolerance=24` (par défaut en amont) et ajustez uniquement si nécessaire
    - surveillez les journaux pour :
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - si les échecs persistent après la reconnexion automatique, collectez les journaux et comparez avec [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419)

  </Accordion>
</AccordionGroup>

## Pointeurs vers la référence de configuration

Référence principale :

- [Référence de configuration - Discord](/fr/gateway/configuration-reference#discord)

Champs Discord à signal fort :

- démarrage/auth : `enabled`, `token`, `accounts.*`, `allowBots`
- stratégie : `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- commande : `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- file d'événements : `eventQueue.listenerTimeout` (budget d'écoute), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- worker entrant : `inboundWorker.runTimeoutMs`
- réponse/historique : `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- livraison : `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- streaming : `streaming` (ancien alias : `streamMode`), `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- média/nouvelle tentative : `mediaMaxMb`, `retry`
  - `mediaMaxMb` limite les téléchargements Discord sortants (par défaut : `8MB`)
- actions : `actions.*`
- présence : `activity`, `status`, `activityType`, `activityUrl`
- interface utilisateur : `ui.components.accentColor`
- fonctionnalités : `threadBindings`, `bindings[]` de niveau supérieur (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents`, `heartbeat`, `responsePrefix`

## Sécurité et opérations

- Traitez les jetons de bot comme des secrets (`DISCORD_BOT_TOKEN` préféré dans les environnements supervisés).
- Accordez les autorisations Discord du moindre privilège.
- Si le déploiement/l'état de la commande est périmé, redémarrez la passerelle et vérifiez à nouveau avec `openclaw channels status --probe`.

## Connexes

- [Appairage](/fr/channels/pairing)
- [Routage de canal](/fr/channels/channel-routing)
- [Routage multi-agent](/fr/concepts/multi-agent)
- [Dépannage](/fr/channels/troubleshooting)
- [Commandes slash](/fr/tools/slash-commands)

import fr from '/components/footer/fr.mdx';

<fr />
