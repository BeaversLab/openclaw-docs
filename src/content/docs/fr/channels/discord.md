---
summary: "DiscordDiscord bot support status, capabilities, and configuration"
read_when:
  - Working on Discord channel features
title: "DiscordDiscord"
---

Prêt pour les DMs et les canaux de guilde via la passerelle officielle Discord.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing" Discord>
    Les DMs Discord sont par défaut en mode appairage.
  </Card>
  <Card title="Slash commands" icon="terminal" href="/fr/tools/slash-commands">
    Comportement des commandes natives et catalogue de commandes.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/fr/channels/troubleshooting">
    Diagnostics et flux de réparation inter-canaux.
  </Card>
</CardGroup>

## Configuration rapide

Vous devrez créer une nouvelle application avec un bot, ajouter le bot à votre serveur et le jumeler à OpenClaw. Nous vous recommandons d'ajouter votre bot à votre propre serveur privé. Si vous n'en avez pas encore, [créez-en un d'abord](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server) (choisissez **Créer le mien > Pour moi et mes amis**).

<Steps>
  <Step title="Créer une application Discord et un bot">
    Rendez-vous sur le [Portail des développeurs Discord](https://discord.com/developers/applications) et cliquez sur **New Application**. Nommez-la quelque chose comme "OpenClaw".

    Cliquez sur **Bot** dans la barre latérale. Définissez le **Username** comme vous appelez votre agent OpenClaw.

  </Step>

  <Step title="Activer les intentions privilégiées">
    Toujours sur la page **Bot**, faites défiler vers le bas jusqu'à **Privileged Gateway Intents** et activez :

    - **Message Content Intent** (requis)
    - **Server Members Intent** (recommandé ; requis pour les listes d'autorisation de rôles et la correspondance nom-ID)
    - **Presence Intent** (facultatif ; nécessaire uniquement pour les mises à jour de présence)

  </Step>

  <Step title="Copiez votre token de bot">
    Remontez sur la page **Bot** et cliquez sur **Reset Token**.

    <Note>
    Malgré son nom, cela génère votre premier token — rien n'est en cours de « réinitialisation ».
    </Note>

    Copiez le token et enregistrez-le quelque part. C'est votre **Bot Token** et vous en aurez besoin bientôt.

  </Step>

  <Step title="Générer une URL d'invitation et ajouter le bot à votre serveur">
    Cliquez sur **OAuth2** dans la barre latérale. Vous générerez une URL d'invitation avec les bonnes autorisations pour ajouter le bot à votre serveur.

    Faites défiler jusqu'à **OAuth2 URL Generator** et activez :

    - `bot`
    - `applications.commands`

    Une section **Bot Permissions** apparaîtra ci-dessous. Activez au moins :

    **General Permissions**
      - View Channels
    **Text Permissions**
      - Send Messages
      - Read Message History
      - Embed Links
      - Attach Files
      - Add Reactions (facultatif)

    Il s'agit de l'ensemble de base pour les canaux de texte normaux. Si vous prévoyez de publier dans des fils Discord, y compris les flux de travail de canal de forum ou multimédia qui créent ou poursuivent un fil, activez également **Send Messages in Threads**.
    Copiez l'URL générée en bas, collez-la dans votre navigateur, sélectionnez votre serveur et cliquez sur **Continue** pour vous connecter. Vous devriez maintenant voir votre bot sur le serveur Discord.

  </Step>

  <Step title="Activer le mode développeur et collecter vos identifiants">
    De retour dans l’application Discord, vous devez activer le mode développeur afin de pouvoir copier les identifiants internes.

    1. Cliquez sur **Paramètres utilisateur** (icône d’engrenage à côté de votre avatar) → **Avancé** → activez **Mode développeur**
    2. Faites un clic droit sur l’**icône de votre serveur** dans la barre latérale → **Copier l’ID du serveur**
    3. Faites un clic droit sur **votre propre avatar** → **Copier l’ID de l’utilisateur**

    Conservez votre **ID de serveur** et votre **ID d’utilisateur** avec votre jeton de bot — vous enverrez les trois à OpenClaw à l’étape suivante.

  </Step>

  <Step title="Allow DMs from server members">
    Pour que l'appairage fonctionne, Discord doit autoriser votre bot à vous envoyer des DMs. Faites un clic droit sur votre **icône de serveur** → **Paramètres de confidentialité** → activez **Messages directs**.

    Cela permet aux membres du serveur (y compris les bots) de vous envoyer des DMs. Gardez cette option activée si vous souhaitez utiliser les DMs Discord avec OpenClaw. Si vous prévoyez uniquement d'utiliser les canaux de guilde, vous pouvez désactiver les DMs après l'appairage.

  </Step>

  <Step title="Définissez votre jeton de bot en toute sécurité (ne l'envoyez pas dans le chat)">
    Votre jeton de bot Discord est un secret (comme un mot de passe). Définissez-le sur la machine exécutant OpenClaw avant de contacter votre agent.

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
cat > discord.patch.json5 <<'JSON5'
{
  channels: {
    discord: {
      enabled: true,
      token: { source: "env", provider: "default", id: "DISCORD_BOT_TOKEN" },
    },
  },
}
JSON5
openclaw config patch --file ./discord.patch.json5 --dry-run
openclaw config patch --file ./discord.patch.json5
openclaw gateway
```

    Si OpenClaw est déjà exécuté en tant que service d'arrière-plan, redémarrez-le via l'application Mac OpenClaw ou en arrêtant et redémarrant le processus `openclaw gateway run`.
    Pour les installations de service géré, exécutez `openclaw gateway install` à partir d'un shell où `DISCORD_BOT_TOKEN` est présent, ou stockez la variable dans `~/.openclaw/.env`, afin que le service puisse résoudre le SecretRef de l'environnement après le redémarrage.
    Si votre hôte est bloqué ou limité par la recherche d'application de démarrage de Discord, définissez l'ID d'application/client Discord à partir du portail des développeurs afin que le démarrage puisse ignorer cet appel REST. Utilisez `channels.discord.applicationId` pour le compte par défaut, ou `channels.discord.accounts.<accountId>.applicationId` lorsque vous exécutez plusieurs bots Discord.

  </Step>

  <Step title="OpenClawConfigurer OpenClaw et associer">

    <Tabs>
      <Tab title="Demander à votre agent"OpenClawTelegramDiscordCLIDiscordDiscord>
        Discutez avec votre agent OpenClaw sur n'importe quel canal existant (par exemple Telegram) et dites-lui. Si Discord est votre premier canal, utilisez plutôt l'onglet CLI / config.

        > "J'ai déjà défini mon jeton de bot Discord dans la configuration. Veuillez terminer la configuration Discord avec l'ID utilisateur `<user_id>` et l'ID de serveur `<server_id>`."
      </Tab>
      <Tab title="CLICLI / config">
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

        Fallback d'env pour le compte par défaut :

```bash
DISCORD_BOT_TOKEN=...
```

        Pour une configuration scriptée ou à distance, écrivez le même bloc JSON5 avec `openclaw config patch --file ./discord.patch.json5 --dry-run` puis relancez sans `--dry-run`. Les valeurs en texte brut `token` sont prises en charge. Les valeurs SecretRef sont également prises en charge pour `channels.discord.token` sur les fournisseurs env/file/exec. Voir [Gestion des secrets](/fr/gateway/secretsDiscord).

        Pour plusieurs bots Discord, gardez chaque jeton de bot et ID d'application sous son compte. Un `channels.discord.applicationId` de premier niveau est hérité par les comptes, ne le définissez donc à cet endroit que lorsque chaque compte doit utiliser le même ID d'application.

```json5
{
  channels: {
    discord: {
      enabled: true,
      accounts: {
        personal: {
          token: { source: "env", provider: "default", id: "DISCORD_PERSONAL_TOKEN" },
          applicationId: "111111111111111111",
        },
        work: {
          token: { source: "env", provider: "default", id: "DISCORD_WORK_TOKEN" },
          applicationId: "222222222222222222",
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step title="Approve first DM pairing">
    Attendez que la passerelle soit en cours d'exécution, puis envoyez un message privé à votre bot sur Discord. Il répondra avec un code de couplage.

    <Tabs>
      <Tab title="Ask your agent">
        Envoyez le code de couplage à votre agent sur votre channel existant :

        > "Approuvez ce code de couplage Discord : `<CODE>`"
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    Les codes de couplage expirent après 1 heure.

    Vous devriez maintenant être en mesure de discuter avec votre agent sur Discord via message privé.

  </Step>
</Steps>

<Note>
  La résolution des jetons est consciente du compte. Les valeurs de jeton de configuration l'emportent sur le repli des variables d'environnement. `DISCORD_BOT_TOKEN` est utilisé uniquement pour le compte par défaut. Si deux comptes Discord activés résolvent vers le même jeton de bot, OpenClaw ne démarre qu'un seul moniteur de passerelle pour ce jeton. Un jeton issu de la configuration l'emporte
  sur le repli de l'environnement par défaut ; sinon, le premier compte activé l'emporte et le compte en double est signalé comme désactivé. Pour les appels sortants avancés (outil de message/actions de channel), un `token` explicite par appel est utilisé pour cet appel. Cela s'applique aux actions d'envoi et de style lecture/sonde (par exemple
  lecture/recherche/récupération/fil/épingles/autorisations). Les paramètres de stratégie/réessai du compte proviennent toujours du compte sélectionné dans l'instantané d'exécution actif.
</Note>

## Recommandé : Configurer un espace de travail de guilde

Une fois que les DMs fonctionnent, vous pouvez configurer votre serveur Discord en tant qu'espace de travail complet où chaque channel obtient sa propre session d'agent avec son propre contexte. Cela est recommandé pour les serveurs privés où il n'y a que vous et votre bot.

<Steps>
  <Step title="Add your server to the guild allowlist">
    Cela permet à votre agent de répondre dans n'importe quel channel de votre serveur, et pas seulement dans les messages privés.

    <Tabs>
      <Tab title="Ask your agent">
        > "Ajoutez mon ID de serveur Discord `<server_id>` à la liste d'autorisation de la guilde"
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
    Par défaut, votre agent ne répond dans les salons de guilde que lorsqu'il est mentionné (@mention). Pour un serveur privé, vous souhaiterez probablement qu'il réponde à chaque message.

    Dans les salons de guilde, les réponses normales sont publiées automatiquement par défaut. Pour les salons partagés toujours actifs, optez pour `messages.groupChat.visibleReplies: "message_tool"` afin que l'agent puisse rester en observation et ne publier que lorsqu'il juge une réponse dans le salon utile. Cela fonctionne mieux avec les modèles de dernière génération, fiables en termes d'outils, tels que GPT 5.5. Les événements ambiants de salon restent silencieux sauf si l'outil envoie. Voir [Ambient room events](/fr/channels/ambient-room-events) pour la configuration complète du mode observation.

    Si Discord affiche l'état « en train d'écrire » et que les journaux montrent une utilisation de jetons mais aucun message publié, vérifiez si le tour a été configuré comme un événement ambiant de salon ou s'il a opté pour des réponses visibles par outil de message.

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

        Pour exiger les envois d'outil de message pour les réponses visibles de groupe/salon, définissez `messages.groupChat.visibleReplies: "message_tool"`.

      </Tab>
    </Tabs>

  </Step>

  <Step title="Plan for memory in guild channels">
    Par défaut, la mémoire à long terme (MEMORY.md) ne se charge que dans les sessions DM. Les canaux de guilde ne chargent pas automatiquement MEMORY.md.

    <Tabs>
      <Tab title="Ask your agent">
        > « Quand je pose des questions dans les canaux Discord, utilise memory_search ou memory_get si tu as besoin d'un contexte à long terme provenant de MEMORY.md. »
      </Tab>
      <Tab title="Manual">
        Si tu as besoin d'un contexte partagé dans chaque canal, place les instructions stables dans `AGENTS.md` ou `USER.md` (elles sont injectées à chaque session). Garde les notes à long terme dans `MEMORY.md` et accède-y à la demande avec les outils de mémoire.
      </Tab>
    </Tabs>

  </Step>
</Steps>

Maintenant, créez quelques channels sur votre serveur Discord et commencez à discuter. Votre agent peut voir le nom du channel, et chaque channel possède sa propre session isolée — vous pouvez donc configurer `#coding`, `#home`, `#research`, ou tout ce qui convient à votre flux de travail.

## Modèle d'exécution

- Le Gateway gère la connexion Discord.
- Le routage des réponses est déterministe : les messages entrants Discord sont renvoyés vers Discord.
- Les métadonnées de guilde/canal Discord sont ajoutées au prompt du modèle en tant que contexte non fiable, et non en tant que préfixe de réponse visible par l'utilisateur. Si un modèle recopie cette enveloppe, OpenClaw supprime les métadonnées copiées des réponses sortantes et du futur contexte de relecture.
- Par défaut (`session.dmScope=main`), les discussions directes partagent la session principale de l'agent (`agent:main:main`).
- Les channels de guilde sont des clés de session isolées (`agent:<agentId>:discord:channel:<channelId>`).
- Les DMs de groupe sont ignorés par défaut (`channels.discord.dm.groupEnabled=false`).
- Les commandes slash natives s'exécutent dans des sessions de commande isolées (`agent:<agentId>:discord:slash:<userId>`), tout en transmettant toujours `CommandTargetSessionKey` à la session de conversation routée.
- La livraison d'annonces cron/heartbeat texte uniquement vers Discord utilise une seule fois la réponse finale visible par l'assistant. Les médias et les charges utiles de composants structurés restent en plusieurs messages lorsque l'agent émet plusieurs charges utiles livrables.

## Canaux de forum

Les canaux de forum et média Discord n'acceptent que les publications de fil. OpenClaw prend en charge deux façons de les créer :

- Envoyez un message au forum parent (`channel:<forumId>`) pour créer automatiquement un fil de discussion. Le titre du fil utilise la première ligne non vide de votre message.
- Utilisez `openclaw message thread create` pour créer directement un fil de discussion. Ne transmettez pas `--message-id` pour les canaux de forum.

Exemple : envoyer au forum parent pour créer un fil

```bash
openclaw message send --channel discord --target channel:<forumId> \
  --message "Topic title\nBody of the post"
```

Exemple : créer explicitement un fil de forum

```bash
openclaw message thread create --channel discord --target channel:<forumId> \
  --thread-name "Topic title" --message "Body of the post"
```

Les forums parents n'acceptent pas les composants Discord. Si vous avez besoin de composants, envoyez-les au fil de discussion lui-même (Discord`channel:<threadId>`).

## Composants interactifs

OpenClaw prend en charge les conteneurs de composants Discord v2 pour les messages des agents. Utilisez l'outil de message avec une charge utile OpenClawDiscord`components`Discord. Les résultats des interactions sont renvoyés à l'agent sous forme de messages entrants normaux et suivent les paramètres Discord `replyToMode` existants.

Blocs pris en charge :

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- Les lignes d'action permettent jusqu'à 5 boutons ou un seul menu de sélection
- Types de sélection : `string`, `user`, `role`, `mentionable`, `channel`

Par défaut, les composants sont à usage unique. Définissez `components.reusable=true` pour permettre aux boutons, sélecteurs et formulaires d'être utilisés plusieurs fois jusqu'à leur expiration.

Pour restreindre les personnes pouvant cliquer sur un bouton, définissez `allowedUsers`Discord sur ce bouton (identifiants utilisateurs Discord, balises ou `*`). Lorsqu'elle est configurée, une éphémère de refus est envoyée aux utilisateurs non correspondants.

Les rappels de composants expirent après 30 minutes par défaut. Définissez `channels.discord.agentComponents.ttlMs` pour modifier cette durée de vie du registre de rappels pour le compte Discord par défaut, ou `channels.discord.accounts.<accountId>.agentComponents.ttlMs` pour remplacer un compte dans une configuration multi-comptes. La valeur est en millisecondes, doit être un entier positif et est plafonnée à `86400000` (24 heures). Les TTL plus longues sont utiles pour les flux de travail de révision ou d'approbation qui nécessitent que les boutons restent utilisables, mais elles étendent également la fenêtre pendant laquelle un ancien message Discord peut encore déclencher une action. Privilégiez le TTL le plus court qui convient au flux de travail, et gardez la valeur par défaut lorsque des rappels obsolètes seraient surprenants.

Les commandes slash `/model` et `/models` ouvrent un sélecteur de modèle interactif avec des menus déroulants pour le fournisseur, le modèle et le runtime compatible, plus une étape de soumission. `/models add` est obsolète et renvoie désormais un message d'obsolescence au lieu d'enregistrer des modèles depuis le chat. La réponse du sélecteur est éphémère et seul l'utilisateur l'ayant invoqué peut l'utiliser. Les menus de sélection Discord sont limités à 25 options, ajoutez donc des entrées `provider/*` à `agents.defaults.models` lorsque vous souhaitez que le sélecteur n'affiche les modèles découverts dynamiquement que pour des fournisseurs sélectionnés tels que `openai` ou `vllm`.

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
    `channels.discord.dmPolicy` contrôle l'accès DM. `channels.discord.allowFrom` est la liste d'autorisation (allowlist) DM canonique.

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `channels.discord.allowFrom` inclue `"*"`)
    - `disabled`

    Si la stratégie DM n'est pas ouverte, les utilisateurs inconnus sont bloqués (ou invités à s'apparier en mode `pairing`).

    Priorité multi-compte :

    - `channels.discord.accounts.default.allowFrom` s'applique uniquement au compte `default`.
    - Pour un compte, `allowFrom` prend la priorité sur l'ancien `dm.allowFrom`.
    - Les comptes nommés héritent de `channels.discord.allowFrom` lorsque leur propre `allowFrom` et l'ancien `dm.allowFrom` ne sont pas définis.
    - Les comptes nommés n'héritent pas de `channels.discord.accounts.default.allowFrom`.

    L'ancien `channels.discord.dm.policy` et `channels.discord.dm.allowFrom` sont toujours lus pour compatibilité. `openclaw doctor --fix` les migre vers `dmPolicy` et `allowFrom` lorsqu'il peut le faire sans modifier l'accès.

    Format de cible DM pour la livraison :

    - `user:<id>`
    - Mention `<@id>`

    Les IDs numériques seuls sont normalement résolus comme IDs de channel lorsqu'un channel par défaut est actif, mais les IDs listés dans la `allowFrom` DM effective du compte sont traités comme des cibles DM utilisateur pour compatibilité.

  </Tab>

  <Tab title="Access groups"Discord>
    Les DMs Discord et l'autorisation des commandes texte peuvent utiliser des entrées `accessGroup:<name>` dynamiques dans `channels.discord.allowFrom`.

    Les noms des groupes d'accès sont partagés entre les canaux de messages. Utilisez `type: "message.senders"` pour un groupe statique dont les membres sont exprimés dans la syntaxe normale `allowFrom` de chaque canal, ou `type: "discord.channelAudience"`Discord lorsque l'audience `ViewChannel` actuelle d'un canal Discord doit définir l'appartenance de manière dynamique. Le comportement du groupe d'accès partagé est documenté ici : [Access groups](/fr/channels/access-groups).

````json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        "*": ["global-owner-id"],
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
      },
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators"],
    },
  },
}
```Discord

    Un canal texte Discord n'a pas de liste de membres distincte. `type: "discord.channelAudience"` modélise l'appartenance comme suit : l'expéditeur du DM est membre de la guilde configurée et possède actuellement la permission `ViewChannel` effective sur le canal configuré après application des substitutions de rôle et de canal.

    Exemple : autoriser toute personne pouvant voir `#maintainers` à envoyer un DM au bot, tout en gardant les DMs fermés pour tous les autres.

```json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
      membership: "canViewChannel",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers"],
    },
  },
}
````

    Vous pouvez mélanger des entrées dynamiques et statiques :

```json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers", "discord:123456789012345678"],
    },
  },
}
```

    Les recherches échouent en mode fermé. Si Discord renvoie `Missing Access`, que la recherche de membre échoue, ou que le canal appartient à une guilde différente, l'expéditeur du DM est traité comme non autorisé.

    Activez l'option **Server Members Intent** (Intention des membres du serveur) du portail des développeurs Discord pour le bot lors de l'utilisation de groupes d'accès basés sur l'audience du canal. Les DMs n'incluent pas l'état des membres de la guilde, donc OpenClaw résout le membre via Discord REST au moment de l'autorisation.

  </Tab>

  <Tab title="Guild policy">
    La gestion des guildes est contrôlée par `channels.discord.groupPolicy` :

    - `open`
    - `allowlist`
    - `disabled`

    La base de sécurité lorsque `channels.discord` existe est `allowlist`.

    Comportement de `allowlist` :

    - la guilde doit correspondre à `channels.discord.guilds` (`id` préféré, slug accepté)
    - listes d'autorisation d'expéditeurs optionnelles : `users` (IDs stables recommandés) et `roles` (IDs de rôle uniquement) ; si l'une ou l'autre est configurée, les expéditeurs sont autorisés lorsqu'ils correspondent à `users` OU `roles`
    - la correspondance directe par nom/tag est désactivée par défaut ; n'activez `channels.discord.dangerouslyAllowNameMatching: true` qu'en mode de compatibilité de secours
    - les noms/tags sont pris en charge pour `users`, mais les IDs sont plus sûrs ; `openclaw security audit` avertit lorsque des entrées de nom/tag sont utilisées
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

  <Tab title="Mentions and group DMs">
    Les messages de guilde sont filtrés par mention par défaut.

    La détection de mention inclut :

    - mention explicite du bot
    - modèles de mention configurés (`agents.list[].groupChat.mentionPatterns`, repli `messages.groupChat.mentionPatterns`)
    - comportement implicite de réponse au bot dans les cas pris en charge

    Lors de la rédaction de messages sortants sur Discord, utilisez la syntaxe de mention canonique : `<@USER_ID>` pour les utilisateurs, `<#CHANNEL_ID>` pour les channels, et `<@&ROLE_ID>` pour les rôles. N'utilisez pas l'ancien format de mention par surnom `<@!USER_ID>`.

    `requireMention` est configuré par guilde/channel (`channels.discord.guilds...`).
    `ignoreOtherMentions` ignorez optionnellement les messages qui mentionnent un autre utilisateur/rôle mais pas le bot (à l'exclusion de @everyone/@here).

    Group DMs :

    - par défaut : ignorés (`dm.groupEnabled=false`)
    - liste d'autorisation optionnelle via `dm.groupChannels` (identifiants ou slugs de channel)

  </Tab>
</Tabs>

### Routage d'agent basé sur les rôles

Utilisez `bindings[].match.roles` pour acheminer les membres de la guilde Discord vers différents agents par ID de rôle. Les liaisons basées sur les rôles acceptent uniquement les ID de rôle et sont évaluées après les liaisons homologues ou parent-homologue et avant les liaisons de guilde uniquement. Si une liaison définit également d'autres champs de correspondance (par exemple `peer` + `guildId` + `roles`), tous les champs configurés doivent correspondre.

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

## Commandes natives et authentification des commandes

- `commands.native` est réglé par défaut sur `"auto"` et est activé pour Discord.
- Remplacement par channel : `channels.discord.commands.native`.
- `commands.native=false` ignore l'enregistrement et le nettoyage des commandes slash Discord lors du démarrage. Les commandes précédemment enregistrées peuvent rester visibles dans Discord jusqu'à ce que vous les supprimiez de l'application Discord.
- L'authentification des commandes natives utilise les mêmes listes d'autorisation / stratégies Discord que le traitement normal des messages.
- Les commandes peuvent toujours être visibles dans l'interface utilisateur Discord pour les utilisateurs qui ne sont pas autorisés ; l'exécution applique toujours l'authentification OpenClaw et renvoie « non autorisé ».

Voir [Slash commands](/fr/tools/slash-commands) pour le catalogue de commandes et le comportement.

Paramètres par défaut des commandes slash :

- `ephemeral: true`

## Détails des fonctionnalités

<AccordionGroup>
  <Accordion title="Tags de réponse et réponses natives">
    Discord prend en charge les tags de réponse dans la sortie de l'agent :

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    Contrôlé par `channels.discord.replyToMode` :

    - `off` (par défaut)
    - `first`
    - `all`
    - `batched`

    Remarque : `off` désactive le fil de discussion de réponse implicite. Les tags `[[reply_to_*]]` explicites sont toujours respectés.
    `first` attache toujours la référence de réponse native implicite au premier message sortant Discord pour le tour.
    `batched` n'attache la référence de réponse native implicite de Discord que lorsque l'événement entrant est un lot "debounced" de plusieurs messages. C'est utile lorsque vous voulez des réponses natives principalement pour les discussions par rafales ambiguës, et non pour chaque tour à message unique.

    Les ID de message sont exposés dans le contexte/historique afin que les agents puissent cibler des messages spécifiques.

  </Accordion>

  <Accordion title="Aperçus de liens">
    Discord génère des intégrations de liens riches pour les URL par défaut. OpenClaw supprime ces intégrations générées sur les messages sortants Discord par défaut, de sorte que les URL envoyées par l'agent restent des liens simples, sauf si vous l'activez :

```json5
{
  channels: {
    discord: {
      suppressEmbeds: false,
    },
  },
}
```

    Définissez `channels.discord.accounts.<id>.suppressEmbeds` pour remplacer un compte. Les envois de l'outil de message de l'agent peuvent également transmettre `suppressEmbeds: false` pour un seul message. Les charges utiles `embeds` explicites Discord ne sont pas supprimées par le paramètre d'aperçu de lien par défaut.

  </Accordion>

  <Accordion title="Live stream preview"OpenClaw>
    OpenClaw peut diffuser des réponses brouillons en envoyant un message temporaire et en le modifiant à mesure que le texte arrive. `channels.discord.streaming` accepte `off` | `partial` | `block` | `progress` (par défaut). `progress` conserve un brouillon de statut modifiable et le met à jour avec la progression des outils jusqu'à la livraison finale ; l'étiquette de démarrage partagée est une ligne déroulante, elle disparaît donc comme le reste une fois que suffisamment de travail apparaît. `streamMode` est un alias d'exécution hérité. Exécutez `openclaw doctor --fix` pour réécrire la configuration persistante vers la clé canonique.

    Définissez `channels.discord.streaming.mode` sur `off`DiscordDiscordOpenClaw pour désactiver les modifications de prévisualisation Discord. Si le block streaming Discord est explicitement activé, OpenClaw ignore le flux de prévisualisation pour éviter la double diffusion.

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "auto",
          maxLines: 8,
          maxLineChars: 120,
          toolProgress: true,
          commentary: false,
        },
      },
    },
  },
}
```

    - `partial` modifie un seul message de prévisualisation à l'arrivée des jetons.
    - `block` émet des fragments de taille brouillon (utilisez `draftChunk` pour régler la taille et les points d'arrêt, limité à `textChunkLimit`).
    - Les versions finales de média, d'erreur et de réponse explicite annulent les modifications de prévisualisation en attente.
    - `streaming.preview.toolProgress` (par défaut `true`) contrôle si les mises à jour d'outil/progression réutilisent le message de prévisualisation.
    - Les lignes d'outil/progression s'affichent sous forme compacte emoji + titre + détail lorsque disponible, par exemple `🛠️ Bash: run tests` ou `🔎 Web Search: for "query"`.
    - `streaming.progress.commentary` (par défaut `false`) active le texte de commentaire/préambule de l'assistant dans le brouillon de progression temporaire. Le commentaire est nettoyé avant l'affichage, reste transitoire et ne modifie pas la livraison de la réponse finale.
    - `streaming.progress.maxLineChars` contrôle le budget de prévisualisation de progression par ligne. La prose est raccourcie aux limites des mots ; les détails de commande et de chemin conservent des suffixes utiles.
    - `streaming.preview.commandText` / `streaming.progress.commandText` contrôle les détails de commande/exec dans les lignes de progression compactes : `raw` (par défaut) ou `status` (étiquette d'outil uniquement).

    Masquer le texte brut de commande/exec tout en gardant les lignes de progression compactes :

    ```json
    {
      "channels": {
        "discord": {
          "streaming": {
            "mode": "progress",
            "progress": {
              "toolProgress": true,
              "commandText": "status"
            }
          }
        }
      }
    }
    ```

    La diffusion de prévisualisation est texte uniquement ; les réponses multimédia reviennent à la livraison normale. Lorsque la diffusion `block`OpenClaw est explicitement activée, OpenClaw ignore le flux de prévisualisation pour éviter la double diffusion.

  </Accordion>

  <Accordion title="Historique, contexte et comportement des fils">
    Contexte de l'historique de la guilde :

    - `channels.discord.historyLimit` par défaut `20`
    - repli : `messages.groupChat.historyLimit`
    - `0` désactive

    Contrôles de l'historique des DM :

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`Discord

    Comportement des fils :

    - Les fils Discord sont routés en tant que sessions de channel et héritent de la configuration du channel parent, sauf en cas de substitution.
    - Les sessions de fils héritent de la sélection de `/model` au niveau de la session du channel parent en tant que repli de model uniquement ; les selections `/model` locales au fil prévalent toujours et l'historique des transcriptions parent n'est pas copié sauf si l'héritage des transcriptions est activé.
    - `channels.discord.thread.inheritParent` (par défaut `false`) permet aux nouveaux auto-fils d'être amorcés à partir de la transcription parent. Les substitutions par compte se trouvent sous `channels.discord.accounts.<id>.thread.inheritParent`.
    - Les réactions de l'outil de message peuvent résoudre les cibles DM `user:<id>`.
    - `guilds.<guild>.channels.<channel>.requireMention: false` est préservé lors du repli d'activation de l'étape de réponse.

    Les sujets des channels sont injectés en tant que contexte **non fiable**. Les listes autorisées filtrent qui peut déclencher l'agent, et non une limite complète de suppression du contexte supplémentaire.

  </Accordion>

  <Accordion title="Sessions liées aux fils de discussion pour les sous-agents">
    Discord peut lier un fil de discussion à une cible de session afin que les messages de suivi dans ce fil continuent d'être acheminés vers la même session (y compris les sessions de sous-agent).

    Commandes :

    - `/focus <target>` lier le fil actuel/nouveau à une cible de sous-agent/session
    - `/unfocus` supprimer la liaison du fil actuel
    - `/agents` afficher les exécutions actives et l'état de liaison
    - `/session idle <duration|off>` inspecter/mettre à jour l'auto-désactivation par inactivité pour les liaisons focalisées
    - `/session max-age <duration|off>` inspecter/mettre à jour l'âge maximal strict pour les liaisons focalisées

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
        spawnSessions: true,
        defaultSpawnContext: "fork",
      },
    },
  },
}
```

    Notes :

    - `session.threadBindings.*` définit les valeurs par défaut globales.
    - `channels.discord.threadBindings.*` remplace le comportement Discord.
    - `spawnSessions` contrôle la création/liaison automatique des fils pour `sessions_spawn({ thread: true })` et les apparitions de fils ACP. Par défaut : `true`.
    - `defaultSpawnContext` contrôle le contexte natif du sous-agent pour les apparitions liées aux fils. Par défaut : `"fork"`.
    - Les clés obsolètes `spawnSubagentSessions`/`spawnAcpSessions` sont migrées par `openclaw doctor --fix`.
    - Si les liaisons de fils sont désactivées pour un compte, `/focus` et les opérations de liaison de fils connexes sont indisponibles.

    Voir [Sous-agents](/fr/tools/subagents), [Agents ACP](/fr/tools/acp-agents) et [Référence de configuration](/fr/gateway/configuration-reference).

  </Accordion>

  <Accordion title="Persistent ACP channel bindings">
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

    - `/acp spawn codex --bind here` lie le channel ou le fil actuel sur place et conserve les futurs messages sur la même session ACP. Les messages de fil héritent de la liaison du channel parent.
    - Dans un channel ou un fil lié, `/new` et `/reset` réinitialisent la même session ACP sur place. Les liaisons de fil temporaires peuvent remplacer la résolution de la cible tant qu'elles sont actives.
    - `spawnSessions` verrouille la création/liaison de fils enfants via `--thread auto|here`.

    Voir [ACP Agents](/fr/tools/acp-agents) pour les détails sur le comportement des liaisons.

  </Accordion>

  <Accordion title="Reaction notifications">
    Mode de notification de réaction par guilde :

    - `off`
    - `own` (par défaut)
    - `all`
    - `allowlist` (utilise `guilds.<id>.users`)

    Les événements de réaction sont transformés en événements système et attachés à la session Discord routée.

  </Accordion>

  <Accordion title="Ack reactions">
    `ackReaction` envoie un emoji d'accusé de réception pendant que OpenClaw traite un message entrant.

    Ordre de résolution :

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - recours à l'emoji d'identité de l'agent (`agents.list[].identity.emoji`, sinon « 👀 »)

    Notes :

    - Discord accepte les emoji unicode ou les noms d'emoji personnalisés.
    - Utilisez `""` pour désactiver la réaction pour un channel ou un compte.

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

  <Accordion title="GatewayProxy Gateway">
    Acheminez le trafic WebSocket de la Discord gateway et les recherches REST au démarrage (ID d'application + résolution de la liste d'autorisation) via un proxy HTTP(S) avec `channels.discord.proxy`.

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
    Activez la résolution PluralKit pour mapper les messages proxifiés à l'identité du membre du système :

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
    - les noms d'affichage des membres sont correspondus par nom/slug uniquement lorsque `channels.discord.dangerouslyAllowNameMatching: true`
    - les recherches utilisent l'ID du message original et sont contraintes par une fenêtre de temps
    - si la recherche échoue, les messages proxifiés sont traités comme des messages de bot et supprimés sauf si `allowBots=true`

  </Accordion>

  <Accordion title="Alias de mentions sortantes">
    Utilisez `mentionAliases` lorsque les agents ont besoin de mentions sortantes déterministes pour les utilisateurs Discord connus. Les clés sont les pseudonymes (handles) sans le `@` au début ; les valeurs sont les IDs utilisateur Discord. Les pseudonymes inconnus, `@everyone`, `@here` et les mentions à l'intérieur des spans de code Markdown sont laissés inchangés.

```json5
{
  channels: {
    discord: {
      mentionAliases: {
        Vladislava: "123456789012345678",
      },
      accounts: {
        ops: {
          mentionAliases: {
            OpsLead: "234567890123456789",
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="Configuration de la présence">
    Les mises à jour de présence sont appliquées lorsque vous définissez un champ de statut ou d'activité, ou lorsque vous activez la présence automatique.

    Exemple avec uniquement le statut :

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

    Carte des types d'activité :

    - 0 : Joue
    - 1 : Stream (nécessite `activityUrl`)
    - 2 : Écoute
    - 3 : Regarde
    - 4 : Personnalisé (utilise le texte de l'activité comme état du statut ; l'émoji est facultatif)
    - 5 : En compétition

    Exemple de présence automatique (signal de santé d'exécution) :

````json5
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
```Discord

    La présence automatique mappe la disponibilité d'exécution au statut Discord : healthy => en ligne, degraded ou unknown => inactif, exhausted ou unavailable => ne pas déranger. Substitutions de texte facultatives :

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (prend en charge le substituant `{reason}`)

  </Accordion>

  <Accordion title="Approbations sur Discord">
    Discord prend en charge la gestion des approbations par bouton dans les DMs et peut optionnellement publier des invites d'approbation dans le salon d'origine.

    Chemin de configuration :

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers` (optionnel ; revient à `commands.ownerAllowFrom` si possible)
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    Discord active automatiquement les approbations d'exécution natives lorsque `enabled` est non défini ou `"auto"` et qu'au moins un approbateur peut être résolu, soit depuis `execApprovals.approvers` soit depuis `commands.ownerAllowFrom`. Discord n'infère pas les approbateurs d'exécution depuis le `allowFrom` du salon, l'`dm.allowFrom` héritée, ou le `defaultTo` de message direct. Définissez `enabled: false` pour désactiver explicitement Discord en tant que client d'approbation natif.

    Pour les commandes de groupe sensibles réservées au propriétaire telles que `/diagnostics` et `/export-trajectory`, OpenClaw envoie les invites d'approbation et les résultats finaux en privé. Il essaie d'abord le DM Discord lorsque le propriétaire invoquant a une route propriétaire Discord ; si cela n'est pas disponible, il revient à la première route propriétaire disponible depuis `commands.ownerAllowFrom`, telle que Telegram.

    Lorsque `target` est `channel` ou `both`, l'invite d'approbation est visible dans le salon. Seuls les approbateurs résolus peuvent utiliser les boutons ; les autres utilisateurs reçoivent un refus éphémère. Les invites d'approbation incluent le texte de la commande, n'activez donc la diffusion dans le salon que pour les salons de confiance. Si l'ID du salon ne peut pas être dérivé de la clé de session, OpenClaw revient à la diffusion par DM.

    Discord affiche également les boutons d'approbation partagés utilisés par les autres salons de chat. L'adaptateur natif Discord ajoute principalement le routage DM des approbateurs et la diffusion de salon.
    Lorsque ces boutons sont présents, ils constituent l'UX d'approbation principal ; OpenClaw
    ne doit inclure une commande manuelle `/approve` que si le résultat de l'outil indique
    que les approbations par chat sont indisponibles ou que l'approbation manuelle est le seul chemin.
    Si le runtime d'approbation natif Discord n'est pas actif, OpenClaw maintient
    l'invite déterministe locale `/approve <id> <decision>` visible. Si le
    runtime est actif mais qu'une carte native ne peut pas être livrée à aucune cible,
    OpenClaw envoie un avis de repli dans le même chat avec la commande exacte `/approve`
    de l'approbation en attente.

    L'authentification et la résolution d'approbation du Gateway suivent le contrat client partagé du Gateway (les ID `plugin:` sont résolus via `plugin.approval.resolve` ; les autres ID via `exec.approval.resolve`). Les approbations expirent après 30 minutes par défaut.

    Voir [Exec approvals](/en/tools/exec-approvals).

  </Accordion>
</AccordionGroup>

## Outils et portails d'action

Les actions de message Discord incluent la messagerie, l'administration de channel, la modération, la présence et les actions de métadonnées.

Exemples de base :

- messagerie : `sendMessage`, `readMessages`, `editMessage`, `deleteMessage`, `threadReply`
- réactions : `react`, `reactions`, `emojiList`
- modération : `timeout`, `kick`, `ban`
- présence : `setPresence`

L'action `event-create` accepte un paramètre `image` facultatif (URL ou chemin de fichier local) pour définir l'image de couverture de l'événement planifié.

Les portes d'action (action gates) se trouvent sous `channels.discord.actions.*`.

Comportement de la porte par défaut :

| Groupe d'actions                                                                                                                                                             | Par défaut  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | activé  |
| roles                                                                                                                                                                    | désactivé |
| modération                                                                                                                                                               | désactivé |
| présence                                                                                                                                                                 | désactivé |

## Interface utilisateur Composants v2

OpenClaw utilise les composants Discord v2 pour les approbations d'exécution et les marqueurs inter-contextes. Les actions de message Discord peuvent également accepter `components` pour une interface utilisateur personnalisée (avancé ; nécessite de construire une charge utile de composant via l'outil discord), tandis que les `embeds` hérités restent disponibles mais ne sont pas recommandés.

- `channels.discord.ui.components.accentColor` définit la couleur d'accentuation utilisée par les conteneurs de composants Discord (hex).
- Définir par compte avec `channels.discord.accounts.<id>.ui.components.accentColor`.
- `channels.discord.agentComponents.ttlMs` contrôle la durée pendant laquelle les rappels de composants Discord envoyés restent enregistrés (par défaut `1800000`, maximum `86400000`). Définir par compte avec `channels.discord.accounts.<id>.agentComponents.ttlMs`.
- `embeds` sont ignorés lorsque les composants v2 sont présents.
- Les aperçus d'URL simples sont supprimés par défaut. Définissez `suppressEmbeds: false` sur une action de message lorsqu'un lien sortant unique doit être développé.

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
````

## Voice

Discord possède deux surfaces vocales distinctes : les **salons vocaux** en temps réel (conversations continues) et les **pièces jointes de messages vocaux** (le format d'aperçu de forme d'onde). La passerelle prend en charge les deux.

### Salons vocaux

Liste de vérification de la configuration :

1. Activez l'intention de contenu de message (Message Content Intent) dans le portail développeur Discord.
2. Activez l'intention des membres du serveur (Server Members Intent) lorsque des listes d'autorisation de rôles/utilisateurs sont utilisées.
3. Invitez le bot avec les étendues `bot` et `applications.commands`.
4. Accordez les autorisations Se connecter, Parler, Envoyer des messages et Lire l'historique des messages dans le salon vocal cible.
5. Activez les commandes natives (`commands.native` ou `channels.discord.commands.native`).
6. Configurez `channels.discord.voice`.

Utilisez `/vc join|leave|status` pour contrôler les sessions. La commande utilise l'agent par défaut du compte et suit les mêmes règles de liste d'autorisation et de stratégie de groupe que les autres commandes Discord.

```bash
/vc join channel:<voice-channel-id>
/vc status
/vc leave
```

Pour inspecter les permissions effectives du bot avant de rejoindre, exécutez :

```bash
openclaw channels capabilities --channel discord --target channel:<voice-channel-id>
```

Exemple de jointure automatique :

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai/gpt-5.5",
        autoJoin: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        allowedChannels: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        daveEncryption: true,
        decryptionFailureTolerance: 24,
        connectTimeoutMs: 30000,
        reconnectGraceMs: 15000,
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
        },
      },
    },
  },
}
```

Notes :

- `voice.tts` remplace `messages.tts` pour la lecture vocale `stt-tts` uniquement. Les modes en temps réel utilisent `voice.realtime.speakerVoice`.
- `voice.mode` contrôle le chemin de la conversation. La valeur par défaut est `agent-proxy`OpenClaw : une interface vocale en temps réel gère le minutage des tours, les interruptions et la lecture, délègue le travail substantiel à l'agent OpenClaw acheminé via `openclaw_agent_consult`Discord, et traite le résultat comme une invite Discord saisie par cet interlocuteur. `stt-tts` conserve l'ancien flux STT par lot plus TTS. `bidi` permet au modèle en temps réel de converser directement tout en exposant `openclaw_agent_consult`OpenClaw pour le cerveau OpenClaw.
- `voice.agentSession` contrôle quelle conversation OpenClaw reçoit les tours de voix. Laissez-le non défini pour la session propre du canal vocal, ou définissez `{ mode: "target", target: "channel:<text-channel-id>" }` pour faire agir le canal vocal comme l'extension microphone/haut-parleur d'une session de canal texte Discord existante telle que `#maintainers`.
- `voice.model` remplace le cerveau de l'agent OpenClaw pour les réponses vocales et les consultations en temps réel Discord. Laissez-le non défini pour hériter du modèle d'agent acheminé. Il est séparé de `voice.realtime.model`.
- `voice.followUsers` permet au bot de rejoindre, de déplacer et de quitter la voix Discord avec les utilisateurs sélectionnés. Voir [Follow users in voice](#follow-users-in-voice) pour les règles de comportement et les exemples.
- `agent-proxy` achemine la parole via `discord-voice`, ce qui préserve l'autorisation propriétaire/tool normale pour le locuteur et la session cible, mais masque l'outil `tts` de l'agent car la voix Discord possède la lecture. Par défaut, `agent-proxy` accorde à la consultation un accès complet aux outils équivalent à celui du propriétaire pour les locuteurs propriétaires (`voice.realtime.toolPolicy: "owner"`) et privilégie fortement la consultation de l'agent OpenClaw avant les réponses substantielles (`voice.realtime.consultPolicy: "always"`). Dans ce mode `always` par défaut, la couche en temps réel ne prononce pas automatiquement de texte de remplissage avant la réponse de la consultation ; elle capture et transcrit la parole, puis prononce la réponse OpenClaw acheminée. Si plusieurs réponses de consultation forcée se terminent alors que Discord lit toujours la première réponse, les réponses ultérieures en parole exacte sont mises en file d'attente jusqu'à ce que la lecture devienne inactive, au lieu de remplacer la parole en milieu de phrase.
- En mode `stt-tts`, la STT utilise `tools.media.audio` ; `voice.model` n'affecte pas la transcription.
- En modes temps réel, `voice.realtime.provider`, `voice.realtime.model` et `voice.realtime.speakerVoice` configurent la session audio temps réel. Pour OpenAI Realtime 2 ainsi que le cerveau Codex, utilisez `voice.realtime.model: "gpt-realtime-2"` et `voice.model: "openai/gpt-5.5"`.
- Les modes vocaux en temps réel incluent de petits fichiers de profil `IDENTITY.md`, `USER.md` et `SOUL.md` dans les instructions du fournisseur en temps réel par défaut, afin que les tours directs rapides conservent la même identité, le même ancrage utilisateur et la même persona que l'agent OpenClaw routé. Définissez `voice.realtime.bootstrapContextFiles` sur un sous-ensemble pour personnaliser cela, ou `[]` pour le désactiver. Les fichiers d'amorçage en temps réel pris en charge sont limités à ces fichiers de profil ; `AGENTS.md` reste dans le contexte normal de l'agent. Le contexte de profil injecté ne remplace pas `openclaw_agent_consult` pour le travail d'espace de travail, les faits actuels, la recherche en mémoire ou les actions basées sur des outils.
- Dans le mode temps réel `agent-proxy` de OpenAI, définissez `voice.realtime.requireWakeName: true` pour maintenir la voix temps réel Discord silencieuse jusqu'à ce qu'une transcription commence ou se termine par un nom de réveil. Les noms de réveil configurés doivent comporter un ou deux mots. Si `voice.realtime.wakeNames` n'est pas défini, OpenClaw utilise l'agent routé `name` plus `OpenClaw`, en revenant à l'id de l'agent plus `OpenClaw`. Le filtrage par nom de réveil désactive la réponse automatique du fournisseur en temps réel, achemine les tours acceptés via le chemin de consultation de l'agent OpenClaw et donne un court accusé de réception vocal lorsqu'un nom de réveil initial est reconnu à partir d'une transcription partielle avant l'arrivée de la transcription finale.
- Le fournisseur temps réel OpenAI accepte les noms d'événements actuels de Realtime 2 et les alias compatibles avec Codex hérités pour les événements audio et de transcription de sortie, de sorte que les instantanés de fournisseurs compatibles peuvent dériver sans perdre l'audio de l'assistant.
- `voice.realtime.bargeIn`Discord contrôle si les événements de début de parole Discord interrompent la lecture en temps réel active. Si non défini, il suit le paramètre d'interruption audio d'entrée du fournisseur temps réel.
- `voice.realtime.minBargeInAudioEndMs`OpenAI contrôle la durée de lecture minimale de l'assistant avant qu'une interruption en temps réel OpenAI ne coupe l'audio. Par défaut : `250`. Définissez `0` pour une interruption immédiate dans les pièces à faible écho, ou augmentez-le pour les configurations de haut-parleurs avec beaucoup d'écho.
- Pour une lecture vocale OpenAI sur Discord, définissez `voice.tts.provider: "openai"` et choisissez une voix de synthèse vocale sous `voice.tts.providers.openai.speakerVoice`. `cedar` est un bon choix de son masculin sur le modèle TTS OpenAI actuel.
- Les remplacements Discord `systemPrompt` par canal s'appliquent aux tours de transcription vocale pour ce canal vocal.
- Les tours de transcription vocale dérivent le statut de propriétaire de Discord Discord`allowFrom` (ou `dm.allowFrom`) pour les commandes gated par propriétaire et les actions de channel. La visibilité des outils de l'agent suit la stratégie d'outil configurée pour la session acheminée.
- La voix Discord est optionnelle pour les configurations texte uniquement ; définissez Discord`channels.discord.voice.enabled=true` (ou gardez un bloc `channels.discord.voice` existant) pour activer les commandes `/vc`, le runtime vocal, et l'intention de passerelle `GuildVoiceStates`.
- `channels.discord.intents.voiceStates` peut explicitement remplacer l'abonnement à l'intention d'état vocal. Laissez-le non défini pour que l'intention suive l'activation effective de la voix.
- Si `voice.autoJoin`OpenClaw a plusieurs entrées pour la même guilde, OpenClaw rejoint le dernier channel configuré pour cette guilde.
- `voice.allowedChannels` est une liste d'autorisation de résidence optionnelle. Laissez-le non défini pour autoriser `/vc join`Discord dans n'importe quel channel vocal Discord autorisé. Lorsqu'il est défini, `/vc join`, l'auto-rejoint au démarrage, et les déplacements d'état vocal du bot sont restreints aux entrées `{ guildId, channelId }`DiscordDiscordOpenClaw répertoriées. Définissez-le sur un tableau vide pour refuser toutes les jointures vocales Discord. Si Discord déplace le bot en dehors de la liste d'autorisation, OpenClaw quitte ce channel et rejoint la cible d'auto-rejoint configurée lorsqu'une est disponible.
- `voice.daveEncryption` et `voice.decryptionFailureTolerance` sont transmis aux options de jointure `@discordjs/voice`.
- Les valeurs par défaut de `@discordjs/voice` sont `daveEncryption=true` et `decryptionFailureTolerance=24` si non définies.
- OpenClaw utilise le codec OpenClaw`libopus-wasm`Discord fourni pour la réception vocale Discord et la lecture brute PCM en temps réel. Il embarque une build WebAssembly libopus épinglée et ne nécessite pas d'addons opus natifs.
- `voice.connectTimeoutMs` contrôle l'attente initiale `@discordjs/voice` Ready pour `/vc join` et les tentatives d'auto-rejoint. Par défaut : `30000`.
- `voice.reconnectGraceMs`OpenClaw contrôle la durée d'attente d'OpenClaw avant de tenter de reconnecter une session vocale déconnectée avant de la détruire. Par défaut : `15000`.
- En mode `stt-tts`OpenClaw, la lecture vocale ne s'arrête pas simplement parce qu'un autre utilisateur commence à parler. Pour éviter les boucles de rétroaction, OpenClaw ignore la nouvelle capture vocale pendant la lecture du TTS ; parlez après la fin de la lecture pour le tour suivant. Les modes temps réel transmettent les débuts de parole comme signaux d'interruption au provider temps réel.
- Dans les modes temps réel, l'écho des haut-parleurs vers un microphone ouvert peut ressembler à une interruption et couper la lecture. Pour les salons Discord sujets à l'écho, définissez Discord`voice.realtime.providers.openai.interruptResponseOnInputAudio: false`OpenAI pour empêcher OpenAI d'interrompre automatiquement sur l'audio entrant. Ajoutez `voice.realtime.bargeIn: true`DiscordOpenAI si vous voulez toujours que les événements de début de parole Discord interrompent la lecture active. Le pont temps réel OpenAI ignore les troncatures de lecture plus courtes que `voice.realtime.minBargeInAudioEndMs`Discord comme étant probablement de l'écho/du bruit et les enregistre comme ignorées au lieu d'effacer la lecture Discord.
- `voice.captureSilenceGraceMs`OpenClawDiscord contrôle la durée d'attente d'OpenClaw après que Discord a signalé qu'un locuteur a s'arrêté avant de finaliser ce segment audio pour la STT. Par défaut : `2000`Discord ; augmentez cette valeur si Discord divise les pauses normales en transcriptions partielles hachées.
- Lorsque ElevenLabs est le fournisseur TTS sélectionné, la lecture vocale sur Discord utilise le TTS en continu et commence à partir du flux de réponse du fournisseur. Les fournisseurs ne prenant pas en charge le continu reviennent au chemin de fichier temporaire synthétisé.
- OpenClaw surveille également les échecs de déchiffrement à la réception et récupère automatiquement en quittant/rejoignant le canal vocal après des échecs répétés dans une courte fenêtre de temps.
- Si les journaux de réception affichent répétitivement `DecryptionFailed(UnencryptedWhenPassthroughDisabled)` après une mise à jour, collectez un rapport de dépendances et des journaux. La ligne `@discordjs/voice` fournie inclut le correctif de padding en amont de la discord.js PR #11449, qui a clos le problème discord.js #11419.
- Les événements de réception `The operation was aborted`OpenClaw sont attendus lorsqu'OpenClaw finalise un segment de locuteur capturé ; ce sont des diagnostics verbeux, pas des avertissements.
- Les journaux vocaux détaillés de Discord incluent un aperçu de transcription STT sur une ligne limitée pour chaque segment de locuteur accepté, afin que le débogage affiche à la fois le côté utilisateur et le côté réponse de l'agent sans vider un texte de transcription illimité.
- En mode `agent-proxy`, le repli forcé à la consultation ignore les fragments de transcription probablement incomplets, tels que le texte se terminant par `...` ou un connecteur final comme `and`, ainsi que les fermetures évidentes non actionnables comme « je reviens tout de suite » ou « au revoir ». Les journaux indiquent `forced agent consult skipped reason=...` lorsque cela empêche une réponse en file d'attente obsolète.

### Suivre les utilisateurs en voix

Utilisez `voice.followUsers` lorsque vous souhaitez que le bot vocal Discord reste avec un ou plusieurs utilisateurs Discord connus au lieu de rejoindre un canal fixe au démarrage ou d'attendre `/vc join`.

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        followUsersEnabled: true,
        followUsers: ["discord:123456789012345678"],
        allowedChannels: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
      },
    },
  },
}
```

Comportement :

- `followUsers` accepte les ID d'utilisateur bruts de Discord et les valeurs `discord:<id>`. OpenClaw normalise les deux formes avant de faire correspondre les événements d'état vocal.
- `followUsersEnabled` par défaut est `true` lorsque `followUsers` est configuré. Réglez-le sur `false` pour conserver la liste sauvegardée mais arrêter le suivi vocal automatique.
- Lorsqu'un utilisateur suivi rejoint un canal vocal autorisé, OpenClaw rejoint ce canal. Lorsque l'utilisateur se déplace, OpenClaw se déplace avec lui. Lorsque l'utilisateur suivi actif se déconnecte, OpenClaw part.
- Si plusieurs utilisateurs suivis sont dans la même guilde et que l'utilisateur suivi actif part, OpenClaw se déplace vers le canal d'un autre utilisateur suivi avant de quitter la guilde. Si plusieurs utilisateurs suivis se déplacent en même temps, le dernier événement d'état vocal observé l'emporte.
- `allowedChannels` s'applique toujours. Un utilisateur suivi dans un canal non autorisé est ignoré, et une session appartenant à un suivi se déplace vers un autre utilisateur suivi ou part.
- OpenClaw réconcilie les événements d'état vocaux manqués au démarrage et à intervalle limité. La réconciliation échantillonne les guildes configurées et plafonne les recherches REST par exécution, de sorte que les très grandes listes `followUsers` peuvent prendre plus d'un intervalle pour converger.
- Si Discord ou un administrateur déplace le bot alors qu'il suit un utilisateur, OpenClaw reconstruit la session vocale et préserve la propriété de suivi lorsque la destination est autorisée. Si le bot est déplacé en dehors de `allowedChannels`, OpenClaw quitte et rejoint la cible configurée lorsqu'elle existe.
- La récupération de réception DAVE peut quitter et rejoindre le même channel après des échecs de déchiffrement répétés. Les sessions appartenant au suivi conservent leur propriété de suivi via ce chemin de récupération, de sorte qu'une déconnexion ultérieure de l'utilisateur suivi quitte toujours le channel.

Choisissez parmi les modes de jointure :

- Utilisez `followUsers` pour les configurations personnelles ou d'opérateur où le bot doit être automatiquement en vocal lorsque vous l'êtes.
- Utilisez `autoJoin` pour les bots de salle fixe qui doivent être présents même lorsqu'aucun utilisateur suivi n'est en vocal.
- Utilisez `/vc join` pour les jointures ponctuelles ou les salles où la présence vocale automatique serait surprenante.

Codec vocal Discord :

- Les journaux de réception vocale affichent `discord voice: opus decoder: libopus-wasm`.
- La lecture en temps réel encode le PCM stéréo brut 48 kHz en Opus avec le même package groupé `libopus-wasm` avant de transmettre les paquets à `@discordjs/voice`.
- La lecture de fichiers et de flux de fournisseurs transcode en PCM stéréo brut 48 kHz avec ffmpeg, puis utilise `libopus-wasm` pour le flux de paquets Opus envoyé à Discord.

Pipeline STT plus TTS :

- La capture PCM Discord est convertie en un fichier temporaire WAV.
- `tools.media.audio` gère la STT, par exemple `openai/gpt-4o-mini-transcribe`.
- La transcription est envoyée via l'ingress et le routage Discord tandis que le LLM de réponse s'exécute avec une politique de sortie vocale qui masque l'outil `tts` de l'agent et demande le texte renvoyé, car la voix Discord possède la lecture TTS finale.
- `voice.model`, lorsqu'il est défini, remplace uniquement le LLM de réponse pour ce tour de canal vocal.
- `voice.tts` est fusionné par-dessus `messages.tts` ; les fournisseurs capables de diffusion alimentent directement le lecteur, sinon le fichier audio résultant est lu dans le canal rejoint.

Exemple de session de canal vocal par défaut pour le proxy d'agent :

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai/gpt-5.5",
        followUsersEnabled: true,
        followUsers: ["123456789012345678"],
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
        },
      },
    },
  },
}
```

Sans bloc `voice.agentSession`, chaque canal vocal obtient sa propre session routée OpenClaw. Par exemple, `/vc join channel:234567890123456789` parle à la session pour ce canal vocal Discord. Le modèle en temps réel n'est que la partie frontale vocale ; les demandes substantielles sont transmises à l'agent OpenClaw configuré. Si le modèle en temps réel produit une transcription finale sans appeler l'outil de consultation, OpenClaw force la consultation comme solution de secours afin que le défaut se comporte toujours comme une conversation avec l'agent.

Exemple de STT hérité plus TTS :

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "stt-tts",
        model: "openai/gpt-5.4-mini",
        tts: {
          provider: "openai",
          providers: {
            openai: {
              model: "gpt-4o-mini-tts",
              speakerVoice: "cedar",
            },
          },
        },
      },
    },
  },
}
```

Exemple bidirectionnel en temps réel :

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "bidi",
        model: "openai/gpt-5.5",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
          toolPolicy: "safe-read-only",
          consultPolicy: "always",
        },
      },
    },
  },
}
```

Voix en tant qu'extension d'une session de canal Discord existante :

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "agent-proxy",
        model: "openai/gpt-5.5",
        agentSession: {
          mode: "target",
          target: "channel:123456789012345678",
        },
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
        },
      },
    },
  },
}
```

En mode `agent-proxy`, le bot rejoint le canal vocal configuré, mais les tours de l'agent OpenClaw utilisent la session et l'agent routés normaux du canal cible. La session vocale en temps réel prononce le résultat renvoyé dans le canal vocal. L'agent superviseur peut toujours utiliser les outils de message normaux selon sa politique d'outils, y compris l'envoi d'un message Discord distinct si c'est la bonne action.

Alors qu'une exécution déléguée OpenClaw est active, les nouvelles transcriptions vocales Discord sont traitées comme un contrôle de l'exécution en direct avant de démarrer un autre tour d'agent. Des phrases telles que « statut », « annule ça », « utilise la correction plus petite » ou « quand tu as fini vérifie aussi les tests » sont classées comme des entrées de statut, d'annulation, de guidage ou de suivi pour la session active. Les résultats de statut, d'annulation, de guidage accepté et de suite sont prononcés dans le canal vocal afin que l'appelant sache si OpenClaw a traité la demande.

Formes cibles utiles :

- `target: "channel:123456789012345678"` transite via une session de channel textuel Discord.
- `target: "123456789012345678"` est traité comme une cible de channel.
- `target: "dm:123456789012345678"` ou `target: "user:123456789012345678"` transite via cette session de message direct.

Exemple Echo-heavy OpenAI Realtime :

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "bidi",
        model: "openai/gpt-5.5",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
          bargeIn: true,
          minBargeInAudioEndMs: 500,
          consultPolicy: "always",
          providers: {
            openai: {
              interruptResponseOnInputAudio: false,
            },
          },
        },
      },
    },
  },
}
```

Utilisez ceci lorsque le modèle entend sa propre lecture Discord via un micro ouvert, mais que vous souhaitez toujours l'interrompre en parlant. OpenClaw empêche OpenAI d'interrompre automatiquement sur l'audio brut en entrée, tandis que `bargeIn: true` permet aux événements de début de locuteur Discord et à l'audio d'un locuteur déjà actif d'annuler les réponses en temps réel actives avant que le prochain tour capturé n'atteigne OpenAI. Les signaux très précoces de barge-in avec `audioEndMs` en dessous de `minBargeInAudioEndMs` sont traités comme probablement un écho/bruit et ignorés pour que le modèle ne se coupe pas à la première trame de lecture.

Journaux vocaux attendus :

- À la jointure : `discord voice: joining ... voiceSession=... supervisorSession=... agentSessionMode=... voiceModel=... realtimeModel=...`
- Au démarrage en temps réel : `discord voice: realtime bridge starting ... autoRespond=false interruptResponse=false bargeIn=false minBargeInAudioEndMs=...`
- Sur l'audio du locuteur : `discord voice: realtime speaker turn opened ...`, `discord voice: realtime input audio started ... outputAudioMs=... outputActive=...` et `discord voice: realtime speaker turn closed ... chunks=... discordBytes=... realtimeBytes=... interruptedPlayback=...`
- Sur la parole obsolète ignorée : `discord voice: realtime forced agent consult skipped reason=incomplete-transcript ...` ou `reason=non-actionable-closing ...`
- À l'achèvement de la réponse en temps réel : `discord voice: realtime audio playback finishing reason=response.done ... audioMs=... chunks=...`
- Sur l'arrêt/réinitialisation de la lecture : `discord voice: realtime audio playback stopped reason=... audioMs=... elapsedMs=... chunks=...`
- Sur la consultation en temps réel : `discord voice: realtime consult requested ... voiceSession=... supervisorSession=... question=...`
- Sur la réponse de l'agent : `discord voice: agent turn answer ...`
- Sur la parole exacte mise en file d'attente : `discord voice: realtime exact speech queued ... queued=... outputAudioMs=... outputActive=...`, suivi de `discord voice: realtime exact speech dequeued reason=player-idle ...`
- Sur la détection de barge-in : `discord voice: realtime barge-in detected source=speaker-start ...` ou `discord voice: realtime barge-in detected source=active-speaker-audio ...`, suivi de `discord voice: realtime barge-in requested reason=... outputAudioMs=... outputActive=...`
- Sur l'interruption en temps réel : `discord voice: realtime model interrupt requested client:response.cancel reason=barge-in`, suivi soit de `discord voice: realtime model audio truncated client:conversation.item.truncate reason=barge-in audioEndMs=...` soit de `discord voice: realtime model interrupt confirmed server:response.done status=cancelled ...`
- Sur l'écho/bruit ignoré : `discord voice: realtime model interrupt ignored client:conversation.item.truncate.skipped reason=barge-in audioEndMs=0 minAudioEndMs=250`
- Sur le barge-in désactivé : `discord voice: realtime capture ignored during playback (barge-in disabled) ...`
- Sur la lecture inactive : `discord voice: realtime barge-in ignored reason=... outputActive=false ... playbackChunks=0`

Pour déboguer l'audio coupé, lisez les journaux vocaux en temps réel comme une chronologie :

1. `realtime audio playback started` signifie que Discord a commencé à lire l'audio de l'assistant. Le pont commence à compter les blocs de sortie de l'assistant, les octets PCM Discord, les octets temps réel du provider et la durée de l'audio synthétisé à partir de ce point.
2. `realtime speaker turn opened` marque l'activation d'un haut-parleur Discord. Si la lecture est déjà active et que `bargeIn` est activé, cela peut être suivi de `barge-in detected source=speaker-start`.
3. `realtime input audio started` marque la première trame audio réelle reçue pour ce tour de parole. `outputActive=true` ou une valeur non nulle de `outputAudioMs` ici signifie que le microphone envoie une entrée alors que la lecture de l'assistant est toujours active.
4. `barge-in detected source=active-speaker-audio` signifie que OpenClaw a détecté l'audio en direct du haut-parleur pendant que la lecture de l'assistant était active. C'est utile pour distinguer une véritable interruption d'un événement de début de parole Discord sans audio utile.
5. `barge-in requested reason=...` signifie que OpenClaw a demandé au provider temps réel d'annuler ou de tronquer la réponse active. Il inclut `outputAudioMs`, `outputActive` et `playbackChunks` afin que vous puissiez voir quelle quantité d'audio de l'assistant a réellement été lue avant l'interruption.
6. `realtime audio playback stopped reason=...` est le point de réinitialisation de la lecture locale Discord. La raison indique qui a arrêté la lecture : `barge-in`, `player-idle`, `provider-clear-audio`, `forced-agent-consult`, `stream-close` ou `session-close`.
7. `realtime speaker turn closed` résume le tour d'entrée capturé. `chunks=0` ou `hasAudio=false` signifie que le tour de parole a été ouvert mais qu'aucun audio utilisable n'a atteint le pont temps réel. `interruptedPlayback=true` signifie que ce tour d'entrée chevauchait la sortie de l'assistant et a déclenché la logique de barge-in.

Champs utiles :

- `outputAudioMs` : durée de l'audio de l'assistant générée par le provider temps réel avant la ligne de journal.
- `audioMs` : durée de l'audio de l'assistant que OpenClaw a compté avant l'arrêt de la lecture.
- `elapsedMs` : temps écoulé entre l'ouverture et la fermeture du flux de lecture ou du tour de parole.
- `discordBytes` : octets PCM stéréo à 48 kHz envoyés ou reçus de la voix Discord.
- `realtimeBytes` : octets PCM au format du provider envoyés ou reçus du provider temps réel.
- `playbackChunks` : morceaux audio de l'assistant transférés vers Discord pour la réponse active.
- `sinceLastAudioMs` : écart entre la dernière trame audio du locuteur capturée et la fin du tour de parole.

Motifs courants :

- Une interruption immédiate avec `source=active-speaker-audio`, un petit `outputAudioMs` et le même utilisateur à proximité indique généralement que l'écho des haut-parleurs entre dans le micro. Augmentez `voice.realtime.minBargeInAudioEndMs`, baissez le volume des haut-parleurs, utilisez un casque, ou définissez `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`.
- `source=speaker-start` suivi de `speaker turn closed ... hasAudio=false` signifie que Discord a signalé un début de parole mais qu'aucun audio n'a atteint OpenClaw. Cela peut être un événement vocal Discord transitoire, le comportement du coupe-bruit, ou un client activant brièvement le micro.
- `audio playback stopped reason=stream-close` sans une interruption ou un `provider-clear-audio` à proximité signifie que le flux de lecture Discord local s'est terminé de manière inattendue. Vérifiez les journaux du provider et du lecteur Discord précédents.
- `capture ignored during playback (barge-in disabled)` signifie que OpenClaw a intentionnellement ignoré l'entrée alors que l'audio de l'assistant était actif. Activez `voice.realtime.bargeIn` si vous voulez que la parole interrompe la lecture.
- `barge-in ignored ... outputActive=false` signifie que le VAD de Discord ou du provider a signalé de la parole, mais OpenClaw n'avait aucune lecture active à interrompre. Cela ne devrait pas couper l'audio.

Les informations d'identification sont résolues par composant : auth d'itinéraire LLM pour `voice.model`, auth STT pour `tools.media.audio`, auth TTS pour `messages.tts`/`voice.tts`, et auth du fournisseur en temps réel pour `voice.realtime.providers` ou la configuration d'auth normale du fournisseur.

### Messages vocaux

Les messages vocaux Discord affichent un aperçu de la forme d'onde et nécessitent de l'audio OGG/Opus. OpenClaw génère la forme d'onde automatiquement, mais a besoin de `ffmpeg` et de `ffprobe` sur l'hôte de la passerelle pour inspecter et convertir.

- Fournissez un **chemin de fichier local** (les URL sont rejetées).
- Omettez le contenu texte (Discord rejette le texte + message vocal dans la même charge utile).
- Tout format audio est accepté ; OpenClaw convertit en OGG/Opus si nécessaire.

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## Dépannage

<AccordionGroup>
  <Accordion title="Utilisation d'intentions non autorisées ou le bot ne voit aucun message de guilde">

    - activer l'intention de contenu de message (Message Content Intent)
    - activer l'intention des membres du serveur (Server Members Intent) lorsque vous dépendez de la résolution des utilisateurs/membres
    - redémarrer la passerelle après avoir modifié les intentions

  </Accordion>

  <Accordion title="Messages de guilde bloqués de manière inattendue">

    - vérifier `groupPolicy`
    - vérifier la liste d'autorisation de la guilde sous `channels.discord.guilds`
    - si la carte `channels` de la guilde existe, seuls les canaux répertoriés sont autorisés
    - vérifier le comportement de `requireMention` et les modèles de mention

    Vérifications utiles :

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Exiger la mention false mais toujours bloqué">
    Causes courantes :

    - `groupPolicy="allowlist"` sans liste d'autorisation de guilde/canal correspondante
    - `requireMention` configuré au mauvais endroit (doit être sous `channels.discord.guilds` ou l'entrée du canal)
    - expéditeur bloqué par la liste d'autorisation `users` de la guilde/canal

  </Accordion>

  <Accordion title="DiscordTours Discord longs ou réponses en double">

    Journaux typiques :

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`Discord

    Paramètres de la file d'attente de la passerelle Discord :

    - compte unique : `channels.discord.eventQueue.listenerTimeout`
    - multi-compte : `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`DiscordDiscordDiscord
    - cela contrôle uniquement le travail d'écouteur de la passerelle Discord, et non la durée de vie du tour de l'agent

    Discord n'applique pas de délai d'attente propriétaire du canal aux tours d'agent en file d'attente. Les écouteurs de messages transfèrent immédiatement, et les exécutions Discord en file d'attente préservent l'ordre par session jusqu'à ce que le cycle de vie de la session/outil/exécution se termine ou interrompe le travail.

```json5
{
  channels: {
    discord: {
      accounts: {
        default: {
          eventQueue: {
            listenerTimeout: 120000,
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="GatewayAvertissements de délai d'attente de recherche de métadonnées de la passerelle"OpenClawDiscord>
    OpenClaw récupère les métadonnées `/gateway/bot`Discord de Discord avant de se connecter. Les échecs transitoires reviennent à l'URL de la passerelle par défaut de Discord et sont limités en débit dans les journaux.

    Paramètres de délai d'attente des métadonnées :

    - compte unique : `channels.discord.gatewayInfoTimeoutMs`
    - multi-compte : `channels.discord.accounts.<accountId>.gatewayInfoTimeoutMs`
    - repli env lorsque la configuration n'est pas définie : `OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS`
    - par défaut : `30000` (30 secondes), max : `120000`

  </Accordion>

  <Accordion title="GatewayRedémarrages du délai d'attente READY du Gateway"OpenClawDiscord>
    OpenClaw attend l'événement de Gateway Discord `READY` lors du démarrage et après les reconnexions en cours d'exécution. Les configurations multi-comptes avec décalage de démarrage peuvent nécessiter une fenêtre READY de démarrage plus longue que celle par défaut.

    Paramètres de délai d'attente READY :

    - démarrage mono-compte : `channels.discord.gatewayReadyTimeoutMs`
    - démarrage multi-compte : `channels.discord.accounts.<accountId>.gatewayReadyTimeoutMs`
    - repli env au démarrage si la config n'est pas définie : `OPENCLAW_DISCORD_READY_TIMEOUT_MS`
    - défaut au démarrage : `15000` (15 secondes), max : `120000`
    - exécution mono-compte : `channels.discord.gatewayRuntimeReadyTimeoutMs`
    - exécution multi-compte : `channels.discord.accounts.<accountId>.gatewayRuntimeReadyTimeoutMs`
    - repli env à l'exécution si la config n'est pas définie : `OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`
    - défaut à l'exécution : `30000` (30 secondes), max : `120000`

  </Accordion>

  <Accordion title="Erreurs d'audit des autorisations">
    Les vérifications des autorisations `channels status --probe` ne fonctionnent que pour les ID de canal numériques.

    Si vous utilisez des clés de slug, la correspondance à l'exécution peut toujours fonctionner, mais la sonde ne peut pas vérifier entièrement les autorisations.

  </Accordion>

  <Accordion title="Problèmes de DM et d'appariement">

    - DM désactivé : `channels.discord.dm.enabled=false`
    - politique de DM désactivée : `channels.discord.dmPolicy="disabled"` (ancien : `channels.discord.dm.policy`)
    - en attente de l'approbation d'appariement en mode `pairing`

  </Accordion>

  <Accordion title="Bot to bot loops">
    Par défaut, les messages rédigés par des bots sont ignorés.

    Si vous définissez `channels.discord.allowBots=true`, utilisez des règles strictes de mention et de liste blanche pour éviter les boucles.
    Préférez `channels.discord.allowBots="mentions"` pour n'accepter que les messages de bots qui mentionnent le bot.

    OpenClaw fournit également une [protection commune contre les boucles de bots](/fr/channels/bot-loop-protection). Chaque fois que `allowBots` laisse les messages rédigés par des bots atteindre la répartition, Discord mappe l'événement entrant sur les faits `(account, channel, bot pair)` et la garde de paire générique supprime la paire après avoir dépassé le budget d'événements configuré. Cette garde empêche les boucles incontrôlables entre deux bots qui devaient auparavant être stoppées par les limites de taux de Discord ; elle n'affecte pas les déploiements à bot unique ou les réponses ponctuelles de bots qui restent dans le budget.

    Paramètres par défaut (actifs lorsque `allowBots` est défini) :

    - `maxEventsPerWindow: 20` -- une paire de bots peut échanger 20 messages dans la fenêtre glissante
    - `windowSeconds: 60` -- longueur de la fenêtre glissante
    - `cooldownSeconds: 60` -- une fois le budget épuisé, chaque message bot-à-bot supplémentaire dans les deux sens est supprimé pendant une minute

    Configurez la valeur par défaut commune une seule fois sous `channels.defaults.botLoopProtection`, puis remplacez Discord lorsqu'un flux de travail légitime nécessite plus de marge. La priorité est :

    - `channels.discord.accounts.<account>.botLoopProtection`
    - `channels.discord.botLoopProtection`
    - `channels.defaults.botLoopProtection`
    - valeurs par défaut intégrées

    Discord utilise les clés génériques `maxEventsPerWindow`, `windowSeconds` et `cooldownSeconds`.

```json5
{
  channels: {
    defaults: {
      botLoopProtection: {
        maxEventsPerWindow: 20,
        windowSeconds: 60,
        cooldownSeconds: 60,
      },
    },
    discord: {
      // Optional Discord-wide override. Account blocks override individual
      // fields and inherit omitted fields from here.
      botLoopProtection: {
        maxEventsPerWindow: 4,
      },
      accounts: {
        mantis: {
          // Mantis listens to other bots only when they mention her.
          allowBots: "mentions",
        },
        molty: {
          // Molty listens to all bot-authored Discord messages.
          allowBots: true,
          mentionAliases: {
            // Lets Molty write a Mantis Discord mention with the configured user id.
            Mantis: "MANTIS_DISCORD_USER_ID",
          },
          botLoopProtection: {
            // Allow up to five messages per minute before suppressing the pair.
            maxEventsPerWindow: 5,
            windowSeconds: 60,
            cooldownSeconds: 90,
          },
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="Voice STT drops with DecryptionFailed(...)">

    - gardez OpenClaw à jour (`openclaw update`) afin que la logique de récupération de réception vocale Discord soit présente
    - confirmez `channels.discord.voice.daveEncryption=true` (par défaut)
    - commencez par `channels.discord.voice.decryptionFailureTolerance=24` (par défaut en amont) et ajustez uniquement si nécessaire
    - surveillez les journaux pour :
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - si les échocs persistent après la reconnexion automatique, collectez les journaux et comparez-les à l'historique de réception DAVE en amont dans [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) et [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449)

  </Accordion>
</AccordionGroup>

## Référence de configuration

Référence principale : [Référence de configuration - Discord](/fr/gateway/config-channels#discord).

<Accordion title="DiscordChamps Discord à fort signal">

- démarrage/auth : `enabled`, `token`, `accounts.*`, `allowBots`
- stratégie : `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- commande : `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- file d'événements : `eventQueue.listenerTimeout` (budget d'écoute), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- passerelle : `gatewayInfoTimeoutMs`, `gatewayReadyTimeoutMs`, `gatewayRuntimeReadyTimeoutMs`
- réponse/historique : `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- livraison : `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- streaming : `streaming` (ancien alias : `streamMode`), `streaming.preview.toolProgress`, `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- média/nouvelle tentative : `mediaMaxMb` (limite les téléchargements sortants Discord, par défaut `100MB`), `retry`
- actions : `actions.*`
- présence : `activity`, `status`, `activityType`, `activityUrl`
- interface utilisateur : `ui.components.accentColor`
- fonctionnalités : `threadBindings`, `bindings[]` de premier niveau (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents.enabled`, `agentComponents.ttlMs`, `heartbeat`, `responsePrefix`

</Accordion>

## Sécurité et opérations

- Traitez les jetons de bot comme des secrets (`DISCORD_BOT_TOKEN` préférés dans les environnements supervisés).
- Accordez les autorisations Discord avec le minimum de privilèges.
- Si le déploiement/l'état des commandes est périmé, redémarrez la passerelle et revérifiez avec `openclaw channels status --probe`.

## Connexes

<CardGroup cols={2}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing">
    Associer un utilisateur Discord à la passerelle.
  </Card>
  <Card title="Groups" icon="users" href="/fr/channels/groups">
    Comportement de la conversation de groupe et de la liste verte.
  </Card>
  <Card title="Channel routing" icon="route" href="/fr/channels/channel-routing">
    Acheminer les messages entrants vers les agents.
  </Card>
  <Card title="Security" icon="shield" href="/fr/gateway/security">
    Modèle de menace et durcissement.
  </Card>
  <Card title="Multi-agent routing" icon="sitemap" href="/fr/concepts/multi-agent">
    Associer les guildes et les canaux aux agents.
  </Card>
  <Card title="Slash commands" icon="terminal" href="/fr/tools/slash-commands">
    Comportement des commandes natives.
  </Card>
</CardGroup>
