---
summary: "Statut, capacités et configuration du support des bots Discord"
read_when:
  - Working on Discord channel features
title: "Discord"
---

# Discord (Bot API)

Statut : prêt pour les DMs et les channels de serveur via la passerelle Discord officielle.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing">
    Les DMs Discord sont par défaut en mode d'appairage.
  </Card>
  <Card title="Slash commands" icon="terminal" href="/fr/tools/slash-commands">
    Comportement des commandes natives et catalogue de commandes.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/fr/channels/troubleshooting">
    Diagnostic et flux de réparation multicanaux.
  </Card>
</CardGroup>

## Configuration rapide

Vous devrez créer une nouvelle application avec un bot, ajouter le bot à votre serveur et l'associer à OpenClaw. Nous recommandons d'ajouter votre bot à votre propre serveur privé. Si vous n'en avez pas encore, [créez-en un d'abord](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server) (choisissez **Créer le mien > Pour moi et mes amis**).

<Steps>
  <Step title="Créer une application Discord et un bot">
    Allez sur le [portail des développeurs Discord](https://discord.com/developers/applications) et cliquez sur **New Application**. Nommez-la quelque chose comme "OpenClaw".

    Cliquez sur **Bot** dans la barre latérale. Définissez le **Nom d'utilisateur** comme vous appelez votre agent OpenClaw.

  </Step>

  <Step title="Enable privileged intents">
    Toujours sur la page **Bot**, faites défiler vers le bas jusqu'à **Privileged Gateway Intents** et activez :

    - **Message Content Intent** (requis)
    - **Server Members Intent** (recommandé ; requis pour les listes d'autorisation de rôles et la correspondance nom-ID)
    - **Presence Intent** (facultatif ; nécessaire uniquement pour les mises à jour de présence)

  </Step>

  <Step title="Copy your bot token">
    Remontez sur la page **Bot** et cliquez sur **Reset Token**.

    <Note>
    Malgré son nom, cela génère votre premier jeton — rien n'est en cours de « réinitialisation ».
    </Note>

    Copiez le jeton et enregistrez-le quelque part. C'est votre **Bot Token** et vous en aurez besoin sous peu.

  </Step>

  <Step title="Générer une URL d'invitation et ajouter le bot à votre serveur">
    Cliquez sur **OAuth2** dans la barre latérale. Vous allez générer une URL d'invitation avec les bonnes autorisations pour ajouter le bot à votre serveur.

    Faites défiler jusqu'à **OAuth2 URL Generator** (Générateur d'URL OAuth2) et activez :

    - `bot`
    - `applications.commands`

    Une section **Bot Permissions** (Autorisations du bot) apparaîtra ci-dessous. Activez :

    - View Channels (Voir les salons)
    - Send Messages (Envoyer des messages)
    - Read Message History (Lire l'historique des messages)
    - Embed Links (Intégrer des liens)
    - Attach Files (Joindre des fichiers)
    - Add Reactions (Ajouter des réactions) (facultatif)

    Copiez l'URL générée en bas, collez-la dans votre navigateur, sélectionnez votre serveur et cliquez sur **Continuer** pour vous connecter. Vous devriez maintenant voir votre bot sur le serveur Discord.

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    De retour dans l'application Discord, vous devez activer le Mode développeur afin de pouvoir copier les ID internes.

    1. Cliquez sur **Paramètres utilisateur** (icône d'engrenage à côté de votre avatar) → **Avancé** → activez **Mode développeur**
    2. Faites un clic droit sur votre **icône de serveur** dans la barre latérale → **Copier l'ID du serveur**
    3. Faites un clic droit sur **votre propre avatar** → **Copier l'ID utilisateur**

    Enregistrez votre **ID de serveur** et votre **ID utilisateur** avec votre jeton de bot — vous enverrez les trois à OpenClaw à l'étape suivante.

  </Step>

  <Step title="Allow DMs from server members">
    Pour que l'appairage fonctionne, Discord doit autoriser votre bot à vous envoyer des DMs. Cliquez avec le bouton droit sur votre **icône de serveur** → **Paramètres de confidentialité** → activez **Messages privés**.

    Cela permet aux membres du serveur (y compris les bots) de vous envoyer des DMs. Gardez cette option activée si vous souhaitez utiliser les DMs Discord avec OpenClaw. Si vous prévoyez d'utiliser uniquement les canaux de guilde, vous pouvez désactiver les DMs après l'appairage.

  </Step>

  <Step title="Set your bot token securely (do not send it in chat)">
    Your Discord bot token is a secret (like a password). Set it on the machine running OpenClaw before messaging your agent.

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set channels.discord.enabled true --strict-json
openclaw gateway
```

    If OpenClaw is already running as a background service, restart it via the OpenClaw Mac app or by stopping and restarting the `openclaw gateway run` process.

  </Step>

  <Step title="Configurer OpenClaw et associer">

    <Tabs>
      <Tab title="Demander à votre agent">
        Discutez avec votre agent OpenClaw sur n'importe quel canal existant (par ex. Telegram) et dites-lui. Si Discord est votre premier canal, utilisez plutôt l'onglet CLI / config.

        > "J'ai déjà défini mon jeton de bot Discord dans la configuration. Veuillez terminer la configuration de Discord avec l'ID utilisateur `<user_id>` et l'ID de serveur `<server_id>`."
      </Tab>
      <Tab title="CLI / config">
        Si vous préférez une configuration basée sur des fichiers, définissez :

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: {
        source: "env",
        provider: "default",
        id: "DISCORD_BOT_TOKEN",
      },
    },
  },
}
```

        Solution de repli d'environnement pour le compte par défaut :

```bash
DISCORD_BOT_TOKEN=...
```

        Les valeurs en texte brut `token` sont prises en charge. Les valeurs SecretRef sont également prises en charge pour `channels.discord.token` sur les fournisseurs env/file/exec. Voir [Gestion des secrets](/fr/gateway/secrets).

      </Tab>
    </Tabs>

  </Step>

  <Step title="Approuver le premier appairage DM">
    Attendez que la passerelle soit en cours d'exécution, puis envoyez un DM à votre bot sur Discord. Il répondra avec un code d'appairage.

    <Tabs>
      <Tab title="Demander à votre agent">
        Envoyez le code d'appairage à votre agent sur votre channel existant :

        > « Approuver ce code d'appairage Discord : `<CODE>` »
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    Les codes d'appairage expirent après 1 heure.

    Vous devriez maintenant être en mesure de discuter avec votre agent sur Discord via DM.

  </Step>
</Steps>

<Note>
  La résolution des jetons est consciente du compte. Les valeurs des jetons de configuration priment sur la valeur de repli de l'environnement. `DISCORD_BOT_TOKEN` est utilisé uniquement pour le compte par défaut. Pour les appels sortants avancés (outil de message/actions de channel), un `token` explicite par appel est utilisé pour cet appel. Cela s'applique aux actions d'envoi et de style
  lecture/sonde (par exemple lecture/recherche/récupération/fil/épingles/autorisations). Les paramètres de stratégie/réessai du compte proviennent toujours du compte sélectionné dans l'instantané d'exécution actif.
</Note>

## Recommandé : Configurer un espace de travail de guilde

Une fois que les DMs fonctionnent, vous pouvez configurer votre serveur Discord comme un espace de travail complet où chaque channel obtient sa propre session d'agent avec son propre contexte. Ceci est recommandé pour les serveurs privés où il n'y a que vous et votre bot.

<Steps>
  <Step title="Ajoutez votre serveur à la liste d'autorisation de la guilde">
    Cela permet à votre agent de répondre dans n'importe quel channel de votre serveur, et pas seulement dans les DMs.

    <Tabs>
      <Tab title="Demander à votre agent">
        > "Ajoutez l'ID de mon Discord Server ID `<server_id>` à la liste d'autorisation de la guilde"
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
    Par défaut, votre agent ne répond dans les salons de guilde que lorsqu'il est @mentionné. Pour un serveur privé, vous voudrez probablement qu'il réponde à chaque message.

    <Tabs>
      <Tab title="Ask your agent">
        > « Autoriser mon agent à répondre sur ce serveur sans avoir à être @mentionné »
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

  <Step title="Planifier la mémoire pour les canaux de guilde">
    Par défaut, la mémoire à long terme (MEMORY.md) ne se charge que dans les sessions DM. Les canaux de guilde ne chargent pas automatiquement MEMORY.md.

    <Tabs>
      <Tab title="Demander à votre agent">
        > « Lorsque je pose des questions dans les canaux Discord, utilisez memory_search ou memory_get si vous avez besoin d'un contexte à long terme provenant de MEMORY.md. »
      </Tab>
      <Tab title="Manuel">
        Si vous avez besoin d'un contexte partagé dans chaque canal, placez les instructions stables dans `AGENTS.md` ou `USER.md` (elles sont injectées pour chaque session). Conservez les notes à long terme dans `MEMORY.md` et accédez-y à la demande avec les outils de mémoire.
      </Tab>
    </Tabs>

  </Step>
</Steps>

Créez maintenant des chaînes sur votre serveur Discord et commencez à discuter. Votre agent peut voir le nom de la chaîne, et chaque chaîne possède sa propre session isolée — vous pouvez donc configurer `#coding`, `#home`, `#research`, ou tout ce qui convient à votre flux de travail.

## Modèle d'exécution

- Gateway possède la connexion Discord.
- Le routage des réponses est déterministe : les réponses entrantes Discord sont renvoyées vers Discord.
- Par défaut (`session.dmScope=main`), les discussions directes partagent la session principale de l'agent (`agent:main:main`).
- Les chaînes de guilde sont des clés de session isolées (`agent:<agentId>:discord:channel:<channelId>`).
- Les DM de groupe sont ignorés par défaut (`channels.discord.dm.groupEnabled=false`).
- Les commandes slash natives s'exécutent dans des sessions de commande isolées (`agent:<agentId>:discord:slash:<userId>`), tout en transmettant toujours `CommandTargetSessionKey` à la session de conversation acheminée.

## Canaux de forum

Discord forum et media channels n'acceptent que les publications de fil. OpenClaw prend en charge deux façons de les créer :

- Envoyez un message au parent du forum (`channel:<forumId>`) pour créer automatiquement un fil. Le titre du fil utilise la première ligne non vide de votre message.
- Utilisez `openclaw message thread create` pour créer directement un fil. Ne passez pas `--message-id` pour les canaux de forum.

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

OpenClaw prend en charge les conteneurs de composants v2 Discord pour les messages des agents. Utilisez l'outil de message avec une charge utile `components`. Les résultats des interactions sont renvoyés à l'agent sous forme de messages entrants normaux et suivent les paramètres `replyToMode` existants de Discord.

Blocs pris en charge :

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- Les lignes d'action permettent jusqu'à 5 boutons ou un seul menu de sélection
- Types de sélection : `string`, `user`, `role`, `mentionable`, `channel`

Par défaut, les composants sont à usage unique. Définissez `components.reusable=true` pour permettre aux boutons, sélections et formulaires d'être utilisés plusieurs fois jusqu'à leur expiration.

Pour restreindre qui peut cliquer sur un bouton, définissez `allowedUsers` sur ce bouton (identifiants utilisateur Discord, balises ou `*`). Lorsqu'il est configuré, les utilisateurs non correspondants reçoivent un refus éphémère.

Les commandes slash `/model` et `/models` ouvrent un sélecteur de modèle interactif avec des menus déroulants pour le fournisseur et le modèle, ainsi qu'une étape de validation. La réponse du sélecteur est éphémère et seul l'utilisateur qui a invoqué la commande peut l'utiliser.

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
  <Tab title="DM policy">
    `channels.discord.dmPolicy` contrôle l'accès aux DM (legacy : `channels.discord.dm.policy`) :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `channels.discord.allowFrom` inclue `"*"` ; legacy : `channels.discord.dm.allowFrom`)
    - `disabled`

    Si la politique DM n'est pas ouverte, les utilisateurs inconnus sont bloqués (ou invités à s'appairer en mode `pairing`).

    Priorité multi-compte :

    - `channels.discord.accounts.default.allowFrom` s'applique uniquement au compte `default`.
    - Les comptes nommés héritent de `channels.discord.allowFrom` lorsque leur propre `allowFrom` n'est pas définie.
    - Les comptes nommés n'héritent pas de `channels.discord.accounts.default.allowFrom`.

    Format de cible DM pour la livraison :

    - `user:<id>`
    - Mention `<@id>`

    Les ID numériques seuls sont ambigus et rejetés, sauf si un type de cible utilisateur/channel explicite est fourni.

  </Tab>

  <Tab title="Guild policy">
    La gestion des guildes est contrôlée par `channels.discord.groupPolicy` :

    - `open`
    - `allowlist`
    - `disabled`

    La base de sécurité lorsque `channels.discord` existe est `allowlist`.

    Comportement de `allowlist` :

    - la guilde doit correspondre à `channels.discord.guilds` (`id` préféré, slug accepté)
    - listes d'autorisation d'expéditeurs facultatives : `users` (ID stables recommandés) et `roles` (ID de rôle uniquement) ; si l'une ou l'autre est configurée, les expéditeurs sont autorisés lorsqu'ils correspondent à `users` OU `roles`
    - la correspondance directe par nom/tag est désactivée par défaut ; n'activez `channels.discord.dangerouslyAllowNameMatching: true` qu'en mode de compatibilité de secours
    - les noms/tags sont pris en charge pour `users`, mais les ID sont plus sûrs ; `openclaw security audit` avertit lorsque des entrées de nom/tag sont utilisées
    - si une guilde a `channels` configuré, les canaux non répertoriés sont refusés
    - si une guilde n'a pas de bloc `channels`, tous les canaux de cette guilde autorisée sont permis

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

  <Tab title="Mentions and group DMs">
    Les messages de guilde sont filtrés par mention par défaut.

    La détection de mention inclut :

    - mention explicite du bot
    - modèles de mention configurés (`agents.list[].groupChat.mentionPatterns`, valeur de repli `messages.groupChat.mentionPatterns`)
    - comportement implicite de réponse au bot dans les cas pris en charge

    `requireMention` est configuré par guilde/channel (`channels.discord.guilds...`).
    `ignoreOtherMentions` ignore éventuellement les messages qui mentionnent un autre utilisateur/rôle mais pas le bot (à l'exclusion de @everyone/@here).

    DMs de groupe :

    - par défaut : ignoré (`dm.groupEnabled=false`)
    - liste d'autorisation optionnelle via `dm.groupChannels` (identifiants de channel ou slugs)

  </Tab>
</Tabs>

### Routage des agents basé sur les rôles

Utilisez `bindings[].match.roles` pour router les membres de la guilde Discord vers différents agents par ID de rôle. Les liaisons basées sur les rôles n'acceptent que les ID de rôle et sont évaluées après les liaisons homologues ou homologues parents et avant les liaisons réservées à la guilde. Si une liaison définit également d'autres champs de correspondance (par exemple `peer` + `guildId` + `roles`), tous les champs configurés doivent correspondre.

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
    3. Copiez le jeton du bot

  </Accordion>

  <Accordion title="Privilèges d'intention">
    Dans **Bot -> Privilèges d'intention du Gateway**, activez :

    - Intention de contenu de message
    - Intention de membres du serveur (recommandé)

    L'intention de présence est facultative et n'est requise que si vous souhaitez recevoir les mises à jour de présence. La définition de la présence du bot (`setPresence`) ne nécessite pas l'activation des mises à jour de présence pour les membres.

  </Accordion>

  <Accordion title="Étendues OAuth et permissions de base">
    Générateur d'URL OAuth :

    - étendues : `bot`, `applications.commands`

    Permissions de base typiques :

    - Voir les salons
    - Envoyer des messages
    - Lire l'historique des messages
    - Intégrer des liens
    - Joindre des fichiers
    - Ajouter des réactions (facultatif)

    Évitez `Administrator` sauf si cela est explicitement nécessaire.

  </Accordion>

  <Accordion title="Copy IDs">
    Activez le mode développeur Discord, puis copiez :

    - l'ID du serveur
    - l'ID du channel
    - l'ID de l'utilisateur

    Préférez les IDs numériques dans la configuration OpenClaw pour des audits et des sondages fiables.

  </Accordion>
</AccordionGroup>

## Commandes natives et authentification des commandes

- `commands.native` est défini par défaut sur `"auto"` et est activé pour Discord.
- Remplacement par channel : `channels.discord.commands.native`.
- `commands.native=false` efface explicitement les commandes natives Discord précédemment enregistrées.
- L'authentification des commandes natives utilise les mêmes allowlists/politiques Discord que la gestion normale des messages.
- Les commandes peuvent encore être visibles dans l'interface de Discord pour les utilisateurs non autorisés ; l'exécution applique toujours l'authentification OpenClaw et renvoie "not authorized".

Voir [Commandes slash](/fr/tools/slash-commands) pour le catalogue et le comportement des commandes.

Paramètres par défaut des commandes slash :

- `ephemeral: true`

## Détails des fonctionnalités

<AccordionGroup>
  <Accordion title="Reply tags and native replies">
    Discord prend en charge les balises de réponse dans la sortie de l'agent :

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    Contrôlé par `channels.discord.replyToMode` :

    - `off` (par défaut)
    - `first`
    - `all`
    - `batched`

    Remarque : `off` désactive l'enfilage de réponse implicite. Les balises `[[reply_to_*]]` explicites sont toujours respectées.
    `first` attache toujours la référence de réponse native implicite au premier message sortant Discord du tour.
    `batched` n'attache la référence de réponse native implicite de Discord que lorsque le tour entrant était un lot debounced de plusieurs messages. C'est utile lorsque vous voulez des réponses natives principalement pour les discussions éclatées ambiguës, et non pour chaque tour à message unique.

    Les ID de message sont affichés dans le contexte/l'historique afin que les agents puissent cibler des messages spécifiques.

  </Accordion>

  <Accordion title="Aperçu du flux en direct">
    OpenClaw peut diffuser des réponses provisoires en envoyant un message temporaire et en le modifiant au fur et à mesure de l'arrivée du texte.

    - `channels.discord.streaming` contrôle la diffusion de l'aperçu (`off` | `partial` | `block` | `progress`, par défaut : `off`).
    - La valeur par défaut reste `off` car les modifications d'aperçu Discord peuvent atteindre rapidement les limites de taux, surtout lorsque plusieurs bots ou passerelles partagent le même compte ou le trafic de guilde.
    - `progress` est accepté pour la cohérence entre les canaux et correspond à `partial` sur Discord.
    - `channels.discord.streamMode` est un alias hérité et est automatiquement migré.
    - `partial` modifie un seul message d'aperçu à l'arrivée des jetons.
    - `block` émet des blocs de taille de brouillon (utilisez `draftChunk` pour ajuster la taille et les points d'arrêt).

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

    Valeurs par défaut du découpage en mode `block` (limité à `channels.discord.textChunkLimit`) :

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

    La diffusion de l'aperçu est en texte uniquement ; les réponses média reviennent à la livraison normale.

    Remarque : la diffusion de l'aperçu est distincte du block streaming. Lorsque le block streaming est explicitement
    activé pour Discord, OpenClaw ignore le flux d'aperçu pour éviter une double diffusion.

  </Accordion>

  <Accordion title="Historique, contexte et comportement des fils">
    Contexte de l'historique de la guilde :

    - `channels.discord.historyLimit` par défaut `20`
    - repli : `messages.groupChat.historyLimit`
    - `0` désactive

    Contrôles de l'historique des DM :

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    Comportement des fils :

    - Les fils Discord sont acheminés en tant que sessions de channel
    - Les métadonnées du fil parent peuvent être utilisées pour la liaison de la session parente
    - La configuration du fil hérite de la configuration du channel parent, sauf si une entrée spécifique au fil existe

    Les sujets du channel sont injectés en tant que contexte **non approuvé** (pas en tant que prompt système).
    Le contexte des réponses et des messages cités reste actuellement tel qu'il est reçu.
    Les listes d'autorisation Discord servent principalement à limiter qui peut déclencher l'agent, et non comme une limite complète de suppression du contexte supplémentaire.

  </Accordion>

  <Accordion title="Sessions liées aux fils de discussion pour les sous-agents">
    Discord peut lier un fil de discussion à une cible de session afin que les messages de suite dans ce fil continuent d'être acheminés vers la même session (y compris les sessions de sous-agent).

    Commandes :

    - `/focus <target>` lier le fil actuel/nouveau à une cible de sous-agent/session
    - `/unfocus` supprimer la liaison du fil actuel
    - `/agents` afficher les exécutions actives et l'état de la liaison
    - `/session idle <duration|off>` inspecter/mettre à jour le délai d'inactivité pour la défocus automatique des liaisons focalisées
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

    - `session.threadBindings.*` définit les valeurs par défaut globales.
    - `channels.discord.threadBindings.*` remplace le comportement de Discord.
    - `spawnSubagentSessions` doit être vrai pour créer automatiquement des fils et les lier pour `sessions_spawn({ thread: true })`.
    - `spawnAcpSessions` doit être vrai pour créer automatiquement des fils et les lier pour ACP (`/acp spawn ... --thread ...` ou `sessions_spawn({ runtime: "acp", thread: true })`).
    - Si les liaisons de fils sont désactivées pour un compte, `/focus` et les opérations connexes de liaison de fils ne sont pas disponibles.

    Voir [Sous-agents](/fr/tools/subagents), [Agents ACP](/fr/tools/acp-agents) et [Référence de configuration](/fr/gateway/configuration-reference).

  </Accordion>

  <Accordion title="Liaisons de canal ACP persistantes">
    Pour les espaces de travail ACP stables et « toujours actifs », configurez des liaisons ACP typées de niveau supérieur ciblant les conversations Discord.

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

    - `/acp spawn codex --bind here` lie le channel ou le fil Discord actuel sur place et achemine les futurs messages vers la même session ACP.
    - Cela peut toujours signifier « démarrer une nouvelle session ACP Codex », mais cela ne crée pas de nouveau fil Discord par lui-même. Le channel existant reste la surface de discussion.
    - Codex peut toujours fonctionner dans son propre `cwd` ou espace de travail backend sur le disque. Cet espace de travail est l'état d'exécution, et non un fil Discord.
    - Les messages des fils peuvent hériter de la liaison ACP du channel parent.
    - Dans un channel ou un fil lié, `/new` et `/reset` réinitialisent la même session ACP sur place.
    - Les liaisons temporaires de fils fonctionnent toujours et peuvent remplacer la résolution de la cible tant qu'elles sont actives.
    - `spawnAcpSessions` n'est requis que lorsqu'OpenClaw doit créer/lier un fil enfant via `--thread auto|here`. Il n'est pas requis pour `/acp spawn ... --bind here` dans le channel actuel.

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
    `ackReaction` envoie un émoji d'accusé de réception pendant que OpenClaw traite un message entrant.

    Ordre de résolution :

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - secours pour l'émoji d'identité de l'agent (`agents.list[].identity.emoji`, sinon "👀")

    Notes :

    - Discord accepte les émojis unicode ou les noms d'émojis personnalisés.
    - Utilisez `""` pour désactiver la réaction pour un channel ou un compte.

  </Accordion>

  <Accordion title="Écritures de configuration">
    Les écritures de configuration initiées par le channel sont activées par défaut.

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
    Acheminez le trafic WebSocket de la Discord Discord et les recherches REST au démarrage (ID d'application + résolution de liste d'autorisation) via un proxy HTTP(S) avec `channels.discord.proxy`.

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

  <Accordion title="Prise en charge de PluralKit">
    Activez la résolution PluralKit pour mapper les messages proxyés à l'identité du membre du système :

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
    - les noms d'affichage des membres sont correspondants par nom/slug uniquement lorsque `channels.discord.dangerouslyAllowNameMatching: true`
    - les recherches utilisent l'ID du message d'origine et sont contraintes par une fenêtre de temps
    - si la recherche échoue, les messages proxyés sont traités comme des messages de bot et supprimés, sauf si `allowBots=true`

  </Accordion>

  <Accordion title="Presence configuration">
    Les mises à jour de présence sont appliquées lorsque vous définissez un statut ou un champ d'activité, ou lorsque vous activez la présence automatique.

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

    - 0 : Playing (Joue)
    - 1 : Streaming (nécessite `activityUrl`)
    - 2 : Listening (Écoute)
    - 3 : Watching (Regarde)
    - 4 : Custom (Utilise le texte de l'activité comme état du statut ; l'émoji est facultatif)
    - 5 : Competing (Concours)

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

    La présence automatique mappe la disponibilité d'exécution au statut Discord : healthy => online (en ligne), degraded or unknown => idle (inactif), exhausted or unavailable => dnd (ne pas déranger). Remplacements de texte facultatifs :

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (prend en charge le placeholder `{reason}`)

  </Accordion>

  <Accordion title="Approbations dans Discord">
    Discord prend en charge la gestion des approbations basées sur des boutons dans les DMs et peut éventuellement publier des invites d'approbation dans le channel d'origine.

    Chemin de configuration :

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers` (facultatif ; revient à `commands.ownerAllowFrom` si possible)
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    Discord active automatiquement les approbations d'exécution natives lorsque `enabled` n'est pas défini ou est `"auto"` et qu'au moins un approbateur peut être résolu, soit à partir de `execApprovals.approvers` soit à partir de `commands.ownerAllowFrom`. Discord n'infère pas les approbateurs d'exécution à partir du `allowFrom` du channel, de l'ancien `dm.allowFrom`, ou des `defaultTo` de message direct. Définissez `enabled: false` pour désactiver explicitement Discord en tant que client d'approbation natif.

    Lorsque `target` est `channel` ou `both`, l'invite d'approbation est visible dans le channel. Seuls les approbateurs résolus peuvent utiliser les boutons ; les autres utilisateurs reçoivent un refus éphémère. Les invites d'approbation incluent le texte de la commande, n'activez donc la livraison dans le channel que dans les channels de confiance. Si l'ID du channel ne peut pas être dérivé de la clé de session, OpenClaw revient à la livraison par DM.

    Discord affiche également les boutons d'approbation partagés utilisés par d'autres channels de chat. L'adaptateur natif Discord ajoute principalement le routage DM des approbateurs et la diffusion de channel.
    Lorsque ces boutons sont présents, ils constituent l'UX principal d'approbation ; OpenClaw
    ne doit inclure une commande manuelle `/approve` que si le résultat de l'outil indique
    que les approbations de chat sont indisponibles ou que l'approbation manuelle est le seul chemin.

    L'auth Gateway pour ce gestionnaire utilise le même contrat de résolution d'informations d'identification partagé que les autres clients Gateway :

    - auth locale env-first (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` puis `gateway.auth.*`)
    - en mode local, `gateway.remote.*` peut être utilisé comme solution de repli uniquement lorsque `gateway.auth.*` n'est pas défini ; les SecretRefs locaux configurés mais non résolus échouent en mode fermé
    - prise en charge du mode distant via `gateway.remote.*` le cas échéant
    - les remplacements d'URL sont sécurisés par rapport au remplacement : les remplacements CLI ne réutilisent pas les informations d'identification implicites, et les remplacements d'env utilisent uniquement les informations d'identification d'env

    Comportement de résolution des approbations :

    - Les ID préfixés par `plugin:` sont résolus via `plugin.approval.resolve`.
    - Les autres ID sont résolus via `exec.approval.resolve`.
    - Discord n'effectue pas ici de saut de repli exec-to-plugin supplémentaire ; le préfixe
      d'ID décide de la méthode de gateway qu'il appelle.

    Les approbations d'exécution expirent après 30 minutes par défaut. Si les approbations échouent avec
    des ID d'approbation inconnus, vérifiez la résolution de l'approbateur, l'activation de la fonctionnalité et
    correspondance du type d'ID d'approbation délivré avec la demande en attente.

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

L'action `event-create` accepte un paramètre facultatif `image` (URL ou chemin de fichier local) pour définir l'image de couverture de l'événement planifié.

Les portes d'action (action gates) se trouvent sous `channels.discord.actions.*`.

Comportement de la porte par défaut :

| Groupe d'actions                                                                                                                                                         | Par défaut |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | activé     |
| roles                                                                                                                                                                    | désactivé  |
| modération                                                                                                                                                               | désactivé  |
| présence                                                                                                                                                                 | désactivé  |

## Interface utilisateur Composants v2

OpenClaw utilise les composants v2 de Discord pour les approbations d'exécution et les marqueurs inter-contextes. Les actions de message Discord peuvent également accepter `components` pour une interface utilisateur personnalisée (avancé ; nécessite la construction d'une charge utile de composant via l'outil discord), tandis que les `embeds` hérités restent disponibles mais ne sont pas recommandés.

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

Configuration requise :

- Activez les commandes natives (`commands.native` ou `channels.discord.commands.native`).
- Configurez `channels.discord.voice`.
- Le bot a besoin des autorisations Connect + Speak dans le canal vocal cible.

Utilisez la commande native exclusive à Discord `/vc join|leave|status` pour contrôler les sessions. La commande utilise l'agent par défaut du compte et suit les mêmes règles de liste d'autorisation et de stratégie de groupe que les autres commandes Discord.

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

Remarques :

- `voice.tts` remplace `messages.tts` uniquement pour la lecture vocale.
- Les tours de transcription vocale dérivent du statut de propriétaire à partir du Discord `allowFrom` (ou `dm.allowFrom`) ; les orateurs non propriétaires ne peuvent pas accéder aux outils réservés aux propriétaires (par exemple `gateway` et `cron`).
- La voix est activée par défaut ; définissez `channels.discord.voice.enabled=false` pour la désactiver.
- `voice.daveEncryption` et `voice.decryptionFailureTolerance` sont transmis aux options de connexion `@discordjs/voice`.
- Les valeurs par défaut de `@discordjs/voice` sont `daveEncryption=true` et `decryptionFailureTolerance=24` si non définies.
- OpenClaw surveille également les échecs de déchiffrement à la réception et récupère automatiquement en quittant/rejoignant le canal vocal après des échecs répétés sur une courte période.
- Si les journaux de réception affichent `DecryptionFailed(UnencryptedWhenPassthroughDisabled)` de manière répétée, il peut s'agir du bogue en amont de réception `@discordjs/voice` suivi dans [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419).

## Messages vocaux

Les messages vocaux Discord affichent un aperçu de la forme d'onde et nécessitent de l'audio OGG/Opus ainsi que des métadonnées. OpenClaw génère la forme d'onde automatiquement, mais il a besoin de `ffmpeg` et de `ffprobe` disponibles sur l'hôte de la passerelle pour inspecter et convertir les fichiers audio.

Exigences et contraintes :

- Fournissez un **chemin de fichier local** (les URL sont rejetées).
- Omettez le contenu textuel (Discord n'autorise pas le texte + message vocal dans la même charge utile).
- Tout format audio est accepté ; OpenClaw convertit en OGG/Opus si nécessaire.

Exemple :

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## Dépannage

<AccordionGroup>
  <Accordion title="Utilisation d'intentions non autorisées ou le bot ne voit aucun message de guilde">

    - activer l'intention de contenu de message (Message Content Intent)
    - activer l'intention de membres du serveur (Server Members Intent) lorsque vous dépendez de la résolution d'utilisateur/membre
    - redémarrez la passerelle après avoir modifié les intentions

  </Accordion>

  <Accordion title="Messages de guilde bloqués de manière inattendue">

    - vérifiez `groupPolicy`
    - vérifiez la liste d'autorisation de guilde sous `channels.discord.guilds`
    - si la carte `channels` de guilde existe, seuls les canaux listés sont autorisés
    - vérifiez le comportement `requireMention` et les modèles de mention

    Vérifications utiles :

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Require mention false but still blocked">
    Causes courantes :

    - `groupPolicy="allowlist"` sans liste d'autorisation de guilde/channel correspondante
    - `requireMention` configuré au mauvais endroit (doit être sous `channels.discord.guilds` ou l'entrée de channel)
    - expéditeur bloqué par la liste d'autorisation `users` de guilde/channel

  </Accordion>

  <Accordion title="Long-running handlers time out or duplicate replies">

    Journaux typiques :

    - `Listener DiscordMessageListener timed out after 30000ms for event MESSAGE_CREATE`
    - `Slow listener detected ...`
    - `discord inbound worker timed out after ...`

    Bouton de réglage du budget d'écoute :

    - compte unique : `channels.discord.eventQueue.listenerTimeout`
    - multi-compte : `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`

    Bouton de réglage du délai d'attente du worker :

    - compte unique : `channels.discord.inboundWorker.runTimeoutMs`
    - multi-compte : `channels.discord.accounts.<accountId>.inboundWorker.runTimeoutMs`
    - par défaut : `1800000` (30 minutes) ; définissez `0` pour désactiver

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

    Utilisez `eventQueue.listenerTimeout` pour une configuration lente de l'écoute et `inboundWorker.runTimeoutMs`
    uniquement si vous souhaitez une soupape de sécurité distincte pour les tours d'agent en file d'attente.

  </Accordion>

  <Accordion title="Permissions audit mismatches">
    Les vérifications des permissions `channels status --probe` ne fonctionnent que pour les ID numériques de channels.

    Si vous utilisez des clés de slug, la correspondance à l'exécution peut toujours fonctionner, mais la sonde ne peut pas vérifier entièrement les permissions.

  </Accordion>

  <Accordion title="DM and pairing issues">

    - DM désactivé : `channels.discord.dm.enabled=false`
    - politique DM désactivée : `channels.discord.dmPolicy="disabled"` (ancien : `channels.discord.dm.policy`)
    - en attente de l'approbation du couplage en mode `pairing`

  </Accordion>

  <Accordion title="Bot to bot loops">
    Par défaut, les messages rédigés par des bots sont ignorés.

    Si vous définissez `channels.discord.allowBots=true`, utilisez des règles de mention strictes et des listes d'autorisation pour éviter les comportements en boucle.
    Privilégiez `channels.discord.allowBots="mentions"` pour n'accepter que les messages de bot qui mentionnent le bot.

  </Accordion>

  <Accordion title="Voice STT drops with DecryptionFailed(...)">

    - keep OpenClaw current (`openclaw update`) so the Discord voice receive recovery logic is present
    - confirm `channels.discord.voice.daveEncryption=true` (default)
    - start from `channels.discord.voice.decryptionFailureTolerance=24` (upstream default) and tune only if needed
    - watch logs for:
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - if failures continue after automatic rejoin, collect logs and compare against [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419)

  </Accordion>
</AccordionGroup>

## Configuration reference pointers

Primary reference:

- [Configuration reference - Discord](/fr/gateway/configuration-reference#discord)

High-signal Discord fields:

- startup/auth: `enabled`, `token`, `accounts.*`, `allowBots`
- policy: `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- command: `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- event queue: `eventQueue.listenerTimeout` (listener budget), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- inbound worker: `inboundWorker.runTimeoutMs`
- reply/history: `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- delivery: `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- streaming: `streaming` (legacy alias: `streamMode`), `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- media/retry: `mediaMaxMb`, `retry`
  - `mediaMaxMb` caps outbound Discord uploads (default: `100MB`)
- actions: `actions.*`
- présence : `activity`, `status`, `activityType`, `activityUrl`
- Interface utilisateur : `ui.components.accentColor`
- fonctionnalités : `threadBindings`, `bindings[]` de premier niveau (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents`, `heartbeat`, `responsePrefix`

## Sécurité et opérations

- Traitez les jetons du bot comme des secrets (`DISCORD_BOT_TOKEN` préférés dans les environnements supervisés).
- Accordez les autorisations Discord du principe du moindre privilège.
- Si le déploiement/l'état de la commande est périmé, redémarrez la passerelle et revérifiez avec `openclaw channels status --probe`.

## Connexes

- [Jumelage](/fr/channels/pairing)
- [Groupes](/fr/channels/groups)
- [Routage de canal](/fr/channels/channel-routing)
- [Sécurité](/fr/gateway/security)
- [Routage multi-agent](/fr/concepts/multi-agent)
- [Dépannage](/fr/channels/troubleshooting)
- [Commandes slash](/fr/tools/slash-commands)
