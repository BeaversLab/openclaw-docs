---
summary: "État de prise en charge, capacités et configuration du bot Discord"
read_when:
  - Working on Discord channel features
title: "Discord"
---

Prêt pour les DMs et les canaux de guilde via la passerelle officielle Discord.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing">
    Les Discord DMs sont par défaut en mode appariement.
  </Card>
  <Card title="Slash commands" icon="terminal" href="/fr/tools/slash-commands">
    Comportement des commandes natives et catalogue des commandes.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/fr/channels/troubleshooting">
    Diagnostics et processus de réparation inter-canaux.
  </Card>
</CardGroup>

## Configuration rapide

Vous devrez créer une nouvelle application avec un bot, ajouter le bot à votre serveur et le jumeler à OpenClaw. Nous vous recommandons d'ajouter votre bot à votre propre serveur privé. Si vous n'en avez pas encore, [créez-en un d'abord](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server) (choisissez **Créer le mien > Pour moi et mes amis**).

<Steps>
  <Step title="Créer une application et un bot Discord">
    Allez sur le [portail des développeurs Discord](https://discord.com/developers/applications) et cliquez sur **New Application**. Nommez-le quelque chose comme "OpenClaw".

    Cliquez sur **Bot** dans la barre latérale. Définissez le **Nom d'utilisateur** (Username) comme vous appelez votre agent OpenClaw.

  </Step>

  <Step title="Activer les intentions privilégiées">
    Toujours sur la page **Bot**, faites défiler jusqu'à **Privileged Gateway Intents** et activez :

    - **Message Content Intent** (requis)
    - **Server Members Intent** (recommandé ; requis pour les listes d'autorisation de rôles et la correspondance nom-à-ID)
    - **Presence Intent** (optionnel ; nécessaire uniquement pour les mises à jour de présence)

  </Step>

  <Step title="Copiez votre jeton de bot">
    Remontez sur la page **Bot** et cliquez sur **Reset Token**.

    <Note>
    Malgré son nom, cela génère votre premier jeton — rien n'est en train d'être « réinitialisé ».
    </Note>

    Copiez le jeton et enregistrez-le quelque part. C'est votre **Bot Token** et vous en aurez besoin sous peu.

  </Step>

  <Step title="Générer une URL d'invitation et ajouter le bot à votre serveur">
    Cliquez sur **OAuth2** dans la barre latérale. Vous allez générer une URL d'invitation avec les bonnes autorisations pour ajouter le bot à votre serveur.

    Faites défiler vers le bas jusqu'à **Générateur d'URL OAuth2** et activez :

    - `bot`
    - `applications.commands`

    Une section **Autorisations du bot** apparaîtra ci-dessous. Activez au moins :

    **Autorisations générales**
      - Voir les channels
    **Autorisations texte**
      - Envoyer des messages
      - Lire l'historique des messages
      - Intégrer des liens
      - Joindre des fichiers
      - Ajouter des réactions (facultatif)

    Il s'agit de l'ensemble de base pour les channels texte normaux. Si vous prévoyez de publier dans des fils Discord, y compris les workflows de forum ou de channel média qui créent ou poursuivent un fil, activez également **Envoyer des messages dans les fils**.
    Copiez l'URL générée en bas, collez-la dans votre navigateur, sélectionnez votre serveur et cliquez sur **Continuer** pour vous connecter. Vous devriez maintenant voir votre bot sur le serveur Discord.

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    De retour dans l'application Discord, vous devez activer le Mode développeur pour pouvoir copier les identifiants internes.

    1. Cliquez sur **Paramètres utilisateur** (icône d'engrenage à côté de votre avatar) → **Avancé** → activez **Mode développeur**
    2. Faites un clic droit sur votre **icône de serveur** dans la barre latérale → **Copier l'ID du serveur**
    3. Faites un clic droit sur **votre propre avatar** → **Copier l'ID de l'utilisateur**

    Enregistrez votre **ID de serveur** et votre **ID d'utilisateur** avec votre jeton de bot — vous enverrez les trois à OpenClaw à l'étape suivante.

  </Step>

  <Step title="Allow DMs from server members">
    Pour que le couplage fonctionne, Discord doit autoriser votre bot à vous envoyer des DMs. Clic droit sur votre **icône de serveur** → **Paramètres de confidentialité** → activez **Messages privés**.

    Cela permet aux membres du serveur (y compris les bots) de vous envoyer des DMs. Gardez cette option activée si vous souhaitez utiliser les DMs Discord avec OpenClaw. Si vous prévoyez d'utiliser uniquement les canaux de guilde, vous pouvez désactiver les DMs après le couplage.

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

    Si OpenClaw est déjà exécuté en tant que service d'arrière-plan, redémarrez-le via l'application Mac OpenClaw ou en arrêtant et en redémarrant le processus `openclaw gateway run`.
    Pour les installations de services gérés, exécutez `openclaw gateway install` depuis un shell où `DISCORD_BOT_TOKEN` est présent, ou stockez la variable dans `~/.openclaw/.env`, afin que le service puisse résoudre le SecretRef de l'environnement après redémarrage.
    Si votre hôte est bloqué ou limité par la recherche de démarrage de l'application de Discord, définissez l'ID de l'application/client Discord à partir du Portail des développeurs afin que le démarrage puisse ignorer cet appel REST. Utilisez `channels.discord.applicationId` pour le compte par défaut, ou `channels.discord.accounts.<accountId>.applicationId` lorsque vous exécutez plusieurs bots Discord.

  </Step>

  <Step title="Configurer OpenClaw et jumeler">

    <Tabs>
      <Tab title="Demander à votre agent">
        Discutez avec votre agent OpenClaw sur n'importe quel canal existant (par exemple Telegram) et dites-lui. Si Discord est votre premier canal, utilisez plutôt l'onglet CLI / config.

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

        Secours d'environnement pour le compte par défaut :

```bash
DISCORD_BOT_TOKEN=...
```

        Pour une configuration scriptée ou distante, écrivez le même bloc JSON5 avec `openclaw config patch --file ./discord.patch.json5 --dry-run` puis relancez sans `--dry-run`. Les valeurs en texte brut `token` sont prises en charge. Les valeurs SecretRef sont également prises en charge pour `channels.discord.token` sur les fournisseurs env/file/exec. Voir [Gestion des secrets](/fr/gateway/secrets).

        Pour plusieurs bots Discord, conservez chaque jeton de bot et ID d'application sous son compte. Un `channels.discord.applicationId` de premier niveau est hérité par les comptes, ne le définissez donc à ce niveau que lorsque chaque compte doit utiliser le même ID d'application.

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

  <Step title="Approver le premier appairage par DM">
    Attendez que la passerelle soit en cours d'exécution, puis envoyez un DM à votre bot sur Discord. Il répondra avec un code d'appairage.

    <Tabs>
      <Tab title="Demander à votre agent">
        Envoyez le code d'appairage à votre agent sur votre channel existant :

        > "Approuver ce code d'appairage Discord : `<CODE>`"
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
  La résolution de jetons est consciente du compte. Les valeurs de jeton de configuration prévalent sur le repli d'environnement. `DISCORD_BOT_TOKEN`DiscordOpenClaw est utilisé uniquement pour le compte par défaut. Si deux comptes Discord activés résolvent vers le même jeton de bot, OpenClaw ne démarre qu'un seul moniteur de passerelle pour ce jeton. Un jeton issu de la configuration l'emporte sur
  le repli d'environnement par défaut ; sinon, le premier compte activé l'emporte et le compte en double est signalé comme désactivé. Pour les appels sortants avancés (actions d'outil de message/channel), un `token` explicite par appel est utilisé pour cet appel. Cela s'applique aux actions d'envoi et de style lecture/sonde (par exemple
  lecture/recherche/récupération/discussion/épingles/autorisations). Les paramètres de stratégie/réessai du compte proviennent toujours du compte sélectionné dans l'instantané d'exécution actif.
</Note>

## Recommandé : Configurer un espace de travail de guilde

Une fois que les DMs fonctionnent, vous pouvez configurer votre serveur Discord en tant qu'espace de travail complet où chaque channel obtient sa propre session d'agent avec son propre contexte. Cela est recommandé pour les serveurs privés où il n'y a que vous et votre bot.

<Steps>
  <Step title="Add your server to the guild allowlist">
    Cela permet à votre agent de répondre dans n'importe quel channel de votre serveur, et pas seulement aux DMs.

    <Tabs>
      <Tab title="Ask your agent">
        > « Ajoutez mon Discord Server ID `<server_id>` à la liste d'autorisation de la guilde »
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
    Par défaut, votre agent ne répond dans les channels de guilde que lorsqu'il est @mentionné. Pour un serveur privé, vous souhaitez probablement qu'il réponde à chaque message.

    Dans les channels de guilde, les réponses normales sont publiées automatiquement par défaut. Pour les salons partagés toujours actifs, optez pour `messages.groupChat.visibleReplies: "message_tool"` afin que l'agent puisse observer (lurk) et ne publier que lorsqu'il juge une réponse de channel utile. Cela fonctionne mieux avec les modèles de dernière génération, fiables en matière d'outils (tool-reliable), tels que GPT 5.5. Les événements ambiants de la salle restent silencieux à moins que l'outil ne les envoie. Consultez [Ambient room events](/fr/channels/ambient-room-events) pour la configuration complète du mode observation.

    Si Discord affiche une indication de frappe et que les journaux indiquent une utilisation de jetons mais aucun message publié, vérifiez si le tour a été configuré comme un événement de salle ambiant ou s'il a opté pour des réponses visibles via l'outil de message.

    <Tabs>
      <Tab title="Ask your agent">
        > "Autoriser mon agent à répondre sur ce serveur sans avoir à être @mentionné"
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

        Pour exiger les envois via l'outil de message pour les réponses visibles de groupe/channel, définissez `messages.groupChat.visibleReplies: "message_tool"`.

      </Tab>
    </Tabs>

  </Step>

  <Step title="Plan for memory in guild channels">
    Par défaut, la mémoire à long terme (MEMORY.md) se charge uniquement dans les sessions DM. Les canaux de guilde ne chargent pas automatiquement MEMORY.md.

    <Tabs>
      <Tab title="Ask your agent">
        > "When I ask questions in Discord channels, use memory_search or memory_get if you need long-term context from MEMORY.md."
      </Tab>
      <Tab title="Manual">
        If you need shared context in every channel, put the stable instructions in `AGENTS.md` or `USER.md` (they are injected for every session). Keep long-term notes in `MEMORY.md` and access them on demand with memory tools.
      </Tab>
    </Tabs>

  </Step>
</Steps>

Créez maintenant des channels sur votre serveur Discord et commencez à discuter. Votre agent peut voir le nom du channel, et chaque channel possède sa propre session isolée — vous pouvez donc configurer `#coding`, `#home`, `#research`, ou tout ce qui convient à votre flux de travail.

## Modèle d'exécution

- Le Gateway gère la connexion Discord.
- Le routage des réponses est déterministe : les messages entrants Discord sont renvoyés vers Discord.
- Les métadonnées de guilde/canal Discord sont ajoutées au prompt du modèle en tant que contexte non fiable, et non en tant que préfixe de réponse visible par l'utilisateur. Si un modèle recopie cette enveloppe, OpenClaw supprime les métadonnées copiées des réponses sortantes et du futur contexte de relecture.
- Par défaut (`session.dmScope=main`), les chats directs partagent la session principale de l'agent (`agent:main:main`).
- Les channels de guilde sont des clés de session isolées (`agent:<agentId>:discord:channel:<channelId>`).
- Les DMs de groupe sont ignorés par défaut (`channels.discord.dm.groupEnabled=false`).
- Les commandes slash natives s'exécutent dans des sessions de commande isolées (`agent:<agentId>:discord:slash:<userId>`), tout en transmettant toujours `CommandTargetSessionKey` à la session de conversation routée.
- La livraison d'annonces cron/heartbeat texte uniquement vers Discord utilise une seule fois la réponse finale visible par l'assistant. Les médias et les charges utiles de composants structurés restent en plusieurs messages lorsque l'agent émet plusieurs charges utiles livrables.

## Canaux de forum

Les canaux de forum et média Discord n'acceptent que les publications de fil. OpenClaw prend en charge deux façons de les créer :

- Envoyez un message au forum parent (`channel:<forumId>`) pour créer automatiquement un fil de discussion. Le titre du fil utilise la première ligne non vide de votre message.
- Utilisez `openclaw message thread create` pour créer directement un fil de discussion. Ne passez pas `--message-id` pour les canaux de forum.

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

Les forums parents n'acceptent pas les composants Discord. Si vous avez besoin de composants, envoyez-les directement au fil de discussion (Discord`channel:<threadId>`).

## Composants interactifs

OpenClaw prend en charge les conteneurs de composants Discord v2 pour les messages des agents. Utilisez l'outil de message avec une charge utile OpenClawDiscord`components`Discord. Les résultats des interactions sont renvoyés vers l'agent comme des messages entrants normaux et suivent les paramètres `replyToMode` existants de Discord.

Blocs pris en charge :

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- Les lignes d'action permettent jusqu'à 5 boutons ou un seul menu de sélection
- Types de sélection : `string`, `user`, `role`, `mentionable`, `channel`

Par défaut, les composants sont à usage unique. Définissez `components.reusable=true` pour permettre aux boutons, sélecteurs et formulaires d'être utilisés plusieurs fois jusqu'à leur expiration.

Pour restreindre qui peut cliquer sur un bouton, définissez `allowedUsers`Discord sur ce bouton (identifiants utilisateur Discord, balises ou `*`). Lorsqu'il est configuré, les utilisateurs non correspondants reçoivent un refus éphémère.

Les rappels de composants expirent après 30 minutes par défaut. Définissez `channels.discord.agentComponents.ttlMs`Discord pour modifier la durée de vie du registre de rappels pour le compte Discord par défaut, ou `channels.discord.accounts.<accountId>.agentComponents.ttlMs` pour remplacer un compte dans une configuration multi-comptes. La valeur est en millisecondes, doit être un entier positif et est plafonnée à `86400000`Discord (24 heures). Des TTL plus longues sont utiles pour les workflows de révision ou d'approbation qui nécessitent que les boutons restent utilisables, mais elles étendent également la fenêtre pendant laquelle un ancien message Discord peut encore déclencher une action. Préférez la TTL la plus courte qui convient au workflow et gardez la valeur par défaut lorsque des rappels obsolètes seraient surprenants.

Les commandes slash `/model` et `/models` ouvrent un sélecteur de modèle interactif avec des listes déroulantes pour le fournisseur, le modèle et le runtime compatible, ainsi qu'une étape de soumission. `/models add` est obsolète et renvoie désormais un message d'obsolescence au lieu d'enregistrer des modèles depuis le chat. La réponse du sélecteur est éphémère et seul l'utilisateur l'ayant invoqué peut l'utiliser. Les menus de sélection Discord sont limités à 25 options, ajoutez donc des entrées `provider/*` à `agents.defaults.models` lorsque vous voulez que le sélecteur n'affiche les modèles découverts dynamiquement que pour les fournisseurs sélectionnés tels que `openai-codex` ou `vllm`.

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
    `channels.discord.dmPolicy` contrôle l'accès par DM. `channels.discord.allowFrom` est la liste d'autorisation (allowlist) canonique pour les DM.

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `channels.discord.allowFrom` inclue `"*"`)
    - `disabled`

    Si la stratégie de DM n'est pas ouverte, les utilisateurs inconnus sont bloqués (ou invités à s'apparier en mode `pairing`).

    Priorité multi-compte :

    - `channels.discord.accounts.default.allowFrom` ne s'applique qu'au compte `default`.
    - Pour un compte, `allowFrom` a priorité sur l'ancien `dm.allowFrom`.
    - Les comptes nommés héritent de `channels.discord.allowFrom` lorsque leur propre `allowFrom` et ancien `dm.allowFrom` ne sont pas définis.
    - Les comptes nommés n'héritent pas de `channels.discord.accounts.default.allowFrom`.

    Les anciens `channels.discord.dm.policy` et `channels.discord.dm.allowFrom` sont toujours lus pour compatibilité. `openclaw doctor --fix` les migre vers `dmPolicy` et `allowFrom` lorsqu'il peut le faire sans modifier l'accès.

    Format de cible DM pour la livraison :

    - `user:<id>`
    - Mention `<@id>`

    Les ID numériques bruts sont normalement résolus en ID de canal lorsqu'un canal par défaut est actif, mais les ID listés dans le `allowFrom` DM effectif du compte sont traités comme cibles de DM utilisateur pour compatibilité.

  </Tab>

  <Tab title="Groupes d'accès">
    Les Discord DMs et l'autorisation des commandes texte peuvent utiliser des entrées dynamiques `accessGroup:<name>` dans `channels.discord.allowFrom`.

    Les noms de groupes d'accès sont partagés entre les canaux de messages. Utilisez `type: "message.senders"` pour un groupe statique dont les membres sont exprimés dans la syntaxe normale `allowFrom` de chaque canal, ou `type: "discord.channelAudience"` lorsque l'audience `ViewChannel` actuelle d'un canal Discord doit définir l'appartenance dynamiquement. Le comportement des groupes d'accès partagés est documenté ici : [Groupes d'accès](/fr/channels/access-groups).

```json5
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
```

    Un canal texte Discord n'a pas de liste de membres séparée. `type: "discord.channelAudience"` modélise l'appartenance comme suit : l'expéditeur du DM est membre de la guilde configurée et dispose actuellement de l'autorisation `ViewChannel` effective sur le canal configuré après application des remplacements de rôle et de canal.

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
```

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

    Activez l'intention **Server Members Intent** du portail des développeurs Discord pour le bot lors de l'utilisation de groupes d'accès basés sur l'audience du canal. Les DMs n'incluent pas l'état des membres de la guilde, donc OpenClaw résout le membre via l'API REST Discord au moment de l'autorisation.

  </Tab>

  <Tab title="Stratégie de guilde">
    La gestion des guildes est contrôlée par `channels.discord.groupPolicy` :

    - `open`
    - `allowlist`
    - `disabled`

    La ligne de base sécurisée lorsque `channels.discord` existe est `allowlist`.

    Comportement de `allowlist` :

    - la guilde doit correspondre à `channels.discord.guilds` (`id` préféré, slug accepté)
    - listes d'autorisation d'expéditeurs facultatives : `users` (ID stables recommandés) et `roles` (ID de rôle uniquement) ; si l'une ou l'autre est configurée, les expéditeurs sont autorisés lorsqu'ils correspondent à `users` OU `roles`
    - la correspondance directe par nom/tag est désactivée par défaut ; n'activez `channels.discord.dangerouslyAllowNameMatching: true` qu'en mode de compatibilité de secours
    - les noms/tags sont pris en charge pour `users`, mais les ID sont plus sûrs ; `openclaw security audit` avertit lorsque des entrées de nom/tag sont utilisées
    - si une guilde a `channels` configuré, les canaux non listés sont refusés
    - si une guilde n'a pas de bloc `channels`, tous les canaux de cette guilde autorisée sont autorisés

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
    Guild messages are mention-gated by default.

    Mention detection includes:

    - explicit bot mention
    - configured mention patterns (`agents.list[].groupChat.mentionPatterns`, fallback `messages.groupChat.mentionPatterns`Discord)
    - implicit reply-to-bot behavior in supported cases

    When writing outbound Discord messages, use canonical mention syntax: `<@USER_ID>` for users, `<#CHANNEL_ID>` for channels, and `<@&ROLE_ID>` for roles. Do not use the legacy `<@!USER_ID>` nickname mention form.

    `requireMention` is configured per guild/channel (`channels.discord.guilds...`).
    `ignoreOtherMentions` optionally drops messages that mention another user/role but not the bot (excluding @everyone/@here).

    Group DMs:

    - default: ignored (`dm.groupEnabled=false`)
    - optional allowlist via `dm.groupChannels` (channel IDs or slugs)

  </Tab>
</Tabs>

### Routage d'agent basé sur les rôles

Utilisez `bindings[].match.roles` pour acheminer les membres de la guilde Discord vers différents agents par ID de rôle. Les liaisons basées sur les rôles n'acceptent que les ID de rôle et sont évaluées après les liaisons homologues ou parent-homologues et avant les liaisons propres à la guilde. Si une liaison définit également d'autres champs de correspondance (par exemple `peer` + `guildId` + `roles`), tous les champs configurés doivent correspondre.

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

- `commands.native` est par défaut `"auto"` et est activé pour Discord.
- Remplacement par channel : `channels.discord.commands.native`.
- `commands.native=false` ignore l'enregistrement et le nettoyage des commandes slash Discord lors du démarrage. Les commandes précédemment enregistrées peuvent rester visibles sur Discord jusqu'à ce que vous les supprimiez de l'application Discord.
- L'authentification des commandes natives utilise les mêmes listes d'autorisation / stratégies Discord que le traitement normal des messages.
- Les commandes peuvent toujours être visibles dans l'interface utilisateur Discord pour les utilisateurs qui ne sont pas autorisés ; l'exécution applique toujours l'authentification OpenClaw et renvoie « non autorisé ».

Voir [Slash commands](/fr/tools/slash-commands) pour le catalogue de commandes et le comportement.

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

    Remarque : `off` désactive le thread de réponse implicite. Les balises explicites `[[reply_to_*]]` sont toujours honorées.
    `first` attache toujours la référence de réponse native implicite au premier message sortant Discord du tour.
    `batched` n'attache la référence de réponse native implicite de Discord que lorsque
    l'événement entrant était un lot anti-rebond de plusieurs messages. Ceci est utile
    lorsque vous voulez des réponses natives principalement pour les discussions saccadées ambiguës, et non pour chaque
    tour à message unique.

    Les ID de message sont disponibles dans le contexte/l'historique afin que les agents puissent cibler des messages spécifiques.

  </Accordion>

  <Accordion title="Link previews"DiscordOpenClawDiscord>
    Discord génère par défaut des incorporations de liens riches pour les URL. OpenClaw supprime ces incorporations générées sur les messages sortants Discord par défaut, de sorte que les URL envoyées par l'agent restent des liens simples, sauf si vous l'activez :

```json5
{
  channels: {
    discord: {
      suppressEmbeds: false,
    },
  },
}
```

    Définissez `channels.discord.accounts.<id>.suppressEmbeds` pour remplacer un compte. Les envois de l'outil de message de l'agent peuvent également transmettre `suppressEmbeds: false`Discord pour un seul message. Les payloads Discord `embeds` explicites ne sont pas supprimés par le paramètre de lien d'aperçu par défaut.

  </Accordion>

  <Accordion title="Aperçu du flux en direct">
    OpenClaw peut diffuser des réponses brouillon en envoyant un message temporaire et en le modifiant au fur et à mesure que le texte arrive. `channels.discord.streaming` prend `off` | `partial` | `block` | `progress` (par défaut). `progress` conserve un brouillon de statité modifiable et le met à jour avec la progression de l'outil jusqu'à la livraison finale ; l'étiquette de démarrage partagée est une ligne défilante, elle disparaît donc comme le reste une fois que suffisamment de travail apparaît. `streamMode` est un alias d'exécution hérité. Exécutez `openclaw doctor --fix` pour réécrire la configuration persistante vers la clé canonique.

    Définissez `channels.discord.streaming.mode` sur `off` pour désactiver les modifications d'aperçu Discord. Si le flux en bloc Discord est explicitement activé, OpenClaw ignore le flux d'aperçu pour éviter les doubles flux.

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
        },
      },
    },
  },
}
```

    - `partial` modifie un seul message d'aperçu à l'arrivée des jetons.
    - `block` émet des blocs de taille brouillon (utilisez `draftChunk` pour régler la taille et les points d'arrêt, limité à `textChunkLimit`).
    - Les finales média, erreur et réponse explicite annulent les modifications d'aperçu en attente.
    - `streaming.preview.toolProgress` (par défaut `true`) contrôle si les mises à jour d'outil/progression réutilisent le message d'aperçu.
    - Les lignes d'outil/progression s'affichent sous forme compacte emoji + titre + détail si disponible, par exemple `🛠️ Bash: run tests` ou `🔎 Web Search: for "query"`.
    - `streaming.progress.maxLineChars` contrôle le budget d'aperçu de progression par ligne. La prose est raccourcie aux limites des mots ; les détails de commande et de chemin gardent des suffixes utiles.
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

    Le streaming d'aperçu est texte uniquement ; les réponses média reviennent à la livraison normale. Lorsque le streaming `block` est explicitement activé, OpenClaw ignore le flux d'aperçu pour éviter les doubles flux.

  </Accordion>

  <Accordion title="Historique, contexte et comportement des fils">
    Contexte de l'historique de guilde :

    - `channels.discord.historyLimit` par défaut `20`
    - repli : `messages.groupChat.historyLimit`
    - `0` désactive

    Contrôles de l'historique des DM :

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    Comportement des fils :

    - Les fils Discord sont acheminés en tant que sessions de channel et héritent de la configuration du channel parent, sauf en cas de substitution.
    - Les sessions de fils héritent de la sélection au niveau de la session `/model` du channel parent en tant que repli pour le modèle uniquement ; les sélections `/model` locales au fil prévalent toujours et l'historique des transcriptions parentes n'est pas copié, sauf si l'héritage des transcriptions est activé.
    - `channels.discord.thread.inheritParent` (par défaut `false`) opte pour l'amorçage des nouveaux fils automatiques à partir de la transcription parente. Les substitutions par compte se trouvent sous `channels.discord.accounts.<id>.thread.inheritParent`.
    - Les réactions des outils de message peuvent résoudre les cibles de DM `user:<id>`.
    - `guilds.<guild>.channels.<channel>.requireMention: false` est préservé lors du repli d'activation de l'étape de réponse.

    Les sujets des channels sont injectés en tant que contexte **non approuvé**. Les listes d'autorisations filtrent qui peut déclencher l'agent, et non une limite complète de rédaction du contexte supplémentaire.

  </Accordion>

  <Accordion title="Sessions liées aux fils pour les sous-agents">
    Discord peut lier un fil à une cible de session afin que les messages de suivi dans ce fil continuent d'être acheminés vers la même session (y compris les sessions de sous-agents).

    Commandes :

    - `/focus <target>` lier le fil actuel/nouveau à une cible de sous-agent/session
    - `/unfocus` supprimer la liaison du fil actuel
    - `/agents` afficher les exécutions actives et l'état de liaison
    - `/session idle <duration|off>` inspecter/mettre à jour l'auto-défocus par inactivité pour les liaisons focalisées
    - `/session max-age <duration|off>` inspecter/mettre à jour l'âge maximum strict pour les liaisons focalisées

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

    - `session.threadBindings.*` définit les valeurs globales par défaut.
    - `channels.discord.threadBindings.*` remplace le comportement de Discord.
    - `spawnSessions` contrôle la création/liaison automatique des fils pour `sessions_spawn({ thread: true })` et les créations de fils ACP. Par défaut : `true`.
    - `defaultSpawnContext` contrôle le contexte natif du sous-agent pour les créations liées aux fils. Par défaut : `"fork"`.
    - Les clés obsolètes `spawnSubagentSessions`/`spawnAcpSessions` sont migrées par `openclaw doctor --fix`.
    - Si les liaisons de fils sont désactivées pour un compte, `/focus` et les opérations de liaison de fils connexes sont indisponibles.

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

    - `/acp spawn codex --bind here` lie le canal ou le fil actuel en place et conserve les futurs messages sur la même session ACP. Les messages de fil héritent de la liaison du canal parent.
    - Dans un canal ou un fil lié, `/new` et `/reset` réinitialisent la même session ACP en place. Les liaisons de fil temporaires peuvent remplacer la résolution cible tant qu'elles sont actives.
    - `spawnSessions` verrouille la création/liaison de fils enfants via `--thread auto|here`.

    Voir [ACP Agents](/fr/tools/acp-agents) pour plus de détails sur le comportement des liaisons.

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
    `ackReaction` envoie un emoji d'accusé de réception pendant qu'OpenClaw traite un message entrant.

    Ordre de résolution :

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - repli vers l'emoji d'identité de l'agent (`agents.list[].identity.emoji`, sinon "👀")

    Notes :

    - Discord accepte les emoji unicode ou les noms d'emoji personnalisés.
    - Utilisez `""` pour désactiver la réaction pour un channel ou un compte.

  </Accordion>

  <Accordion title="Config writes">
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

  <Accordion title="GatewayProxy Gateway">
    Acheminez le trafic WebSocket du Discord et les recherches REST au démarrage (ID d'application + résolution de liste d'autorisation) via un proxy HTTP(S) avec `channels.discord.proxy`.

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
    Activer la résolution PluralKit pour mapper les messages mandatés (proxied) à l'identité du membre du système :

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

    - les listes autorisées (allowlists) peuvent utiliser `pk:<memberId>`
    - les noms d'affichage des membres sont correspondants par nom/slug uniquement lorsque `channels.discord.dangerouslyAllowNameMatching: true`
    - les recherches utilisent l'ID du message original et sont limitées par une fenêtre de temps
    - si la recherche échoue, les messages mandatés sont traités comme des messages de bot et ignorés, sauf si `allowBots=true`

  </Accordion>

  <Accordion title="Alias de mentions sortantes">
    Utilisez `mentionAliases`Discord lorsque les agents ont besoin de mentions sortantes déterministes pour les utilisateurs Discord connus. Les clés sont les pseudonymes sans le `@`Discord au début ; les valeurs sont les ID d'utilisateurs Discord. Les pseudonymes inconnus, `@everyone`, `@here` et les mentions à l'intérieur des balises de code Markdown sont laissées inchangées.

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

    - 0 : Joue à
    - 1 : Stream (requiert `activityUrl`)
    - 2 : Écoute
    - 3 : Regarde
    - 4 : Personnalisé (utilise le texte de l'activité comme état du statut ; l'émoji est optionnel)
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

    La présence automatique fait correspondre la disponibilité d'exécution au statut Discord : sain => en ligne, dégradé ou inconnu => inactif, épuisé ou indisponible => ne pas déranger. Remplacements de texte optionnels :

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (prend en charge le substituant `{reason}`)

  </Accordion>

  <Accordion title="Approbations dans Discord">
    Discord prend en charge la gestion des approbations par bouton dans les DMs et peut éventuellement publier des invites d'approbation dans le channel d'origine.

    Chemin de configuration :

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers` (optionnel ; revient à `commands.ownerAllowFrom` si possible)
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    Discord active automatiquement les approbations d'exécution natives lorsque `enabled` n'est pas défini ou `"auto"` et qu'au moins un approbateur peut être résolu, soit depuis `execApprovals.approvers` soit depuis `commands.ownerAllowFrom`. Discord n'infère pas les approbateurs d'exécution depuis le channel `allowFrom`, l'`dm.allowFrom` legacy, ou les `defaultTo` de message direct. Définissez `enabled: false` pour désactiver explicitement Discord en tant que client d'approbation natif.

    Pour les commandes de groupe sensibles réservées au propriétaire telles que `/diagnostics` et `/export-trajectory`, OpenClaw envoie les invites d'approbation et les résultats finaux en privé. Il essaie d'abord le DM Discord lorsque le propriétaire invoquant a une route propriétaire Discord ; si ce n'est pas disponible, il revient à la première route propriétaire disponible depuis `commands.ownerAllowFrom`, telle que Telegram.

    Lorsque `target` est `channel` ou `both`, l'invite d'approbation est visible dans le channel. Seuls les approbateurs résolus peuvent utiliser les boutons ; les autres utilisateurs reçoivent un refus éphémère. Les invites d'approbation incluent le texte de la commande, n'activez donc la livraison par channel que dans les channels de confiance. Si l'ID du channel ne peut pas être dérivé de la clé de session, OpenClaw revient à la livraison par DM.

    Discord affiche également les boutons d'approbation partagés utilisés par d'autres channels de chat. L'adaptateur natif Discord ajoute principalement le routage DM des approbateurs et la diffusion sur les channels.
    Lorsque ces boutons sont présents, ils constituent l'UX d'approbation principal ; OpenClaw
    ne doit inclure une commande manuelle `/approve` que lorsque le résultat de l'outil indique
    que les approbations de chat sont indisponibles ou que l'approbation manuelle est le seul chemin.
    Si le runtime d'approbation natif Discord n'est pas actif, OpenClaw conserve l'invite
    déterministe locale `/approve <id> <decision>` visible. Si le
    runtime est actif mais qu'une carte native ne peut pas être livrée à aucune cible,
    OpenClaw envoie un avis de repli de même chat avec la commande exacte `/approve`
    issue de l'approbation en attente.

    L'authentification Gateway et la résolution des approbations suivent le contrat client partagé Gateway (les IDs `plugin:` sont résolus via `plugin.approval.resolve` ; les autres IDs via `exec.approval.resolve`). Les approbations expirent après 30 minutes par défaut.

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
        model: "openai-codex/gpt-5.5",
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
          voice: "cedar",
        },
      },
    },
  },
}
```

Notes :

- `voice.tts` remplace `messages.tts` pour la lecture vocale `stt-tts` uniquement. Les modes temps réel utilisent `voice.realtime.voice`.
- `voice.mode` contrôle le chemin de la conversation. La valeur par défaut est `agent-proxy`OpenClaw : une interface vocale en temps réel gère le minutage des tours, les interruptions et la lecture, délègue le travail substantiel à l'agent OpenClaw acheminé via `openclaw_agent_consult`Discord, et traite le résultat comme une invite Discord saisie par cet interlocuteur. `stt-tts` conserve l'ancien flux STT par lot plus TTS. `bidi` permet au modèle en temps réel de converser directement tout en exposant `openclaw_agent_consult`OpenClaw pour le cerveau OpenClaw.
- `voice.agentSession` contrôle quelle conversation OpenClaw reçoit les tours de voix. Laissez-le non défini pour la session propre du canal vocal, ou définissez `{ mode: "target", target: "channel:<text-channel-id>" }` pour faire agir le canal vocal comme l'extension microphone/haut-parleur d'une session de canal texte Discord existante telle que `#maintainers`.
- `voice.model` remplace le cerveau de l'agent OpenClaw pour les réponses vocales et les consultations en temps réel Discord. Laissez-le non défini pour hériter du modèle d'agent acheminé. Il est séparé de `voice.realtime.model`.
- `voice.followUsers` permet au bot de rejoindre, de déplacer et de quitter la voix Discord avec les utilisateurs sélectionnés. Voir [Follow users in voice](#follow-users-in-voice) pour les règles de comportement et les exemples.
- `agent-proxy` achemine la parole via `discord-voice`, ce qui préserve l'autorisation propriétaire/tool normale pour le locuteur et la session cible, mais masque l'outil `tts` de l'agent car la voix Discord possède la lecture. Par défaut, `agent-proxy` accorde à la consultation un accès complet aux outils équivalent à celui du propriétaire pour les locuteurs propriétaires (`voice.realtime.toolPolicy: "owner"`) et privilégie fortement la consultation de l'agent OpenClaw avant les réponses substantielles (`voice.realtime.consultPolicy: "always"`). Dans ce mode `always` par défaut, la couche en temps réel ne prononce pas automatiquement de texte de remplissage avant la réponse de la consultation ; elle capture et transcrit la parole, puis prononce la réponse OpenClaw acheminée. Si plusieurs réponses de consultation forcée se terminent alors que Discord lit toujours la première réponse, les réponses ultérieures en parole exacte sont mises en file d'attente jusqu'à ce que la lecture devienne inactive, au lieu de remplacer la parole en milieu de phrase.
- En mode `stt-tts`, la STT utilise `tools.media.audio` ; `voice.model` n'affecte pas la transcription.
- Dans les modes temps réel, `voice.realtime.provider`, `voice.realtime.model` et `voice.realtime.voice` configurent la session audio temps réel. Pour OpenAI Realtime 2 avec le cerveau Codex, utilisez `voice.realtime.model: "gpt-realtime-2"` et `voice.model: "openai-codex/gpt-5.5"`.
- Les modes vocaux en temps réel incluent de petits fichiers de profil `IDENTITY.md`, `USER.md` et `SOUL.md` dans les instructions du fournisseur en temps réel par défaut, afin que les tours directs rapides conservent la même identité, le même ancrage utilisateur et la même persona que l'agent OpenClaw routé. Définissez `voice.realtime.bootstrapContextFiles` sur un sous-ensemble pour personnaliser cela, ou `[]` pour le désactiver. Les fichiers d'amorçage en temps réel pris en charge sont limités à ces fichiers de profil ; `AGENTS.md` reste dans le contexte normal de l'agent. Le contexte de profil injecté ne remplace pas `openclaw_agent_consult` pour le travail d'espace de travail, les faits actuels, la recherche en mémoire ou les actions basées sur des outils.
- En mode temps réel `agent-proxy` OpenAI, définissez `voice.realtime.requireWakeName: true` pour garder la voix temps réel Discord silencieuse jusqu'à ce qu'une transcription contienne un nom de réveil. Si `voice.realtime.wakeNames` n'est pas défini, OpenClaw utilise l'agent routé `name` plus `OpenClaw`, en revenant à l'id de l'agent plus `OpenClaw`. Le filtrage par nom de réveil désactive la réponse automatique du fournisseur temps réel et achemine les tours acceptés via le chemin de consultation de l'agent OpenClaw.
- Le fournisseur temps réel OpenAI accepte les noms d'événements actuels de Realtime 2 et les alias compatibles avec Codex hérités pour les événements audio et de transcription de sortie, de sorte que les instantanés de fournisseurs compatibles peuvent dériver sans perdre l'audio de l'assistant.
- `voice.realtime.bargeIn`Discord contrôle si les événements de début de parole Discord interrompent la lecture en temps réel active. Si non défini, il suit le paramètre d'interruption audio d'entrée du fournisseur temps réel.
- `voice.realtime.minBargeInAudioEndMs`OpenAI contrôle la durée de lecture minimale de l'assistant avant qu'une interruption en temps réel OpenAI ne coupe l'audio. Par défaut : `250`. Définissez `0` pour une interruption immédiate dans les pièces à faible écho, ou augmentez-le pour les configurations de haut-parleurs avec beaucoup d'écho.
- Pour une voix OpenAI sur la lecture Discord, définissez `voice.tts.provider: "openai"` et choisissez une voix de synthèse vocale sous `voice.tts.openai.voice` ou `voice.tts.providers.openai.voice`. `cedar` est un bon choix de son masculin sur le modèle TTS OpenAI actuel.
- Les substitutions `systemPrompt` Discord par canal s'appliquent aux tours de transcription vocale pour ce canal vocal.
- Les tours de transcription vocale tirent le statut de propriétaire du `allowFrom` Discord (ou `dm.allowFrom`) pour les commandes et les actions de canal limitées au propriétaire. La visibilité des outils de l'agent suit la stratégie d'outil configurée pour la session routée.
- Discord vocal est en option pour les configurations texte uniquement ; définissez `channels.discord.voice.enabled=true` (ou conservez un bloc `channels.discord.voice` existant) pour activer les commandes `/vc`, le runtime vocal et l'intention de passerelle `GuildVoiceStates`.
- `channels.discord.intents.voiceStates` peut explicitement remplacer l'abonnement à l'intention d'état vocal. Laissez-le non défini pour que l'intention suive l'activation effective de la voix.
- Si `voice.autoJoin` contient plusieurs entrées pour la même guilde, OpenClaw rejoint le dernier canal configuré pour cette guilde.
- `voice.allowedChannels` est une liste blanche de résidence facultative. Laissez-la non définie pour autoriser `/vc join`Discord dans n'importe quel salon vocal Discord autorisé. Lorsqu'elle est définie, `/vc join`, l'auto-connexion au démarrage et les déplacements d'état vocal du bot sont restreints aux entrées `{ guildId, channelId }`DiscordDiscord répertoriées. Définissez-la sur un tableau vide pour refuser toutes les connexions vocales Discord. Si Discord déplace le bot en dehors de la liste blanche, OpenClaw quitte ce salon et rejoint la cible d'auto-connexion configurée lorsqu'une est disponible.
- `voice.daveEncryption` et `voice.decryptionFailureTolerance` sont transmis aux options de jointure `@discordjs/voice`.
- Les valeurs par défaut `@discordjs/voice` sont `daveEncryption=true` et `decryptionFailureTolerance=24` si non définies.
- OpenClaw utilise par défaut le décodeur `opusscript` pur JS pour la réception vocale Discord. Le package natif facultatif `@discordjs/opus` est ignoré par la stratégie d'installation pnpm du dépôt, afin que les installations normales, les lignes Docker et les tests sans rapport ne compilent pas de module natif. Les hôtes dédiés aux performances vocales peuvent activer cette option avec `OPENCLAW_DISCORD_OPUS_DECODER=native` après avoir installé le module natif.
- `voice.connectTimeoutMs` contrôle l'attente initiale de `@discordjs/voice` Ready pour `/vc join` et les tentatives de jointure automatique. Par défaut : `30000`.
- `voice.reconnectGraceMs` contrôle la durée d'attente de OpenClaw avant qu'une session vocale déconnectée ne commence à se reconnecter avant d'être détruite. Par défaut : `15000`.
- En mode `stt-tts`, la lecture audio ne s'arrête pas simplement parce qu'un autre utilisateur commence à parler. Pour éviter les boucles de rétroaction, OpenClaw ignore toute nouvelle capture vocale pendant que le TTS est en cours de lecture ; parlez après la fin de la lecture pour le tour suivant. Les modes en temps réel transmettent les débuts de parole comme signaux d'interruption au fournisseur en temps réel.
- En modes temps réel, l'écho des haut-parleurs vers un microphone ouvert peut ressembler à une intervention (barge-in) et interrompre la lecture. Pour les salons Discord à fort écho, définissez Discord`voice.realtime.providers.openai.interruptResponseOnInputAudio: false`OpenAI pour empêcher OpenAI d'interrompre automatiquement sur l'audio entrant. Ajoutez `voice.realtime.bargeIn: true`DiscordOpenAI si vous souhaitez toujours que les événements de début de parole Discord interrompent la lecture active. Le pont temps réel OpenAI ignore les troncatures de lecture plus courtes que `voice.realtime.minBargeInAudioEndMs`Discord comme étant probablement de l'écho/du bruit et les consigne comme ignorées au lieu d'effacer la lecture Discord.
- `voice.captureSilenceGraceMs` contrôle la durée d'attente de OpenClaw après que Discord a signalé qu'un orateur s'est arrêté avant de finaliser ce segment audio pour la STT. Par défaut : `2500` ; augmentez cette valeur si Discord divise les pauses normales en transcriptions partielles hachées.
- Lorsque ElevenLabs est le fournisseur TTS sélectionné, la lecture vocale sur Discord utilise le TTS en continu et commence à partir du flux de réponse du fournisseur. Les fournisseurs ne prenant pas en charge le continu reviennent au chemin de fichier temporaire synthétisé.
- OpenClaw surveille également les échecs de déchiffrement à la réception et récupère automatiquement en quittant/rejoignant le canal vocal après des échecs répétés dans une courte fenêtre de temps.
- Si les journaux de réception affichent `DecryptionFailed(UnencryptedWhenPassthroughDisabled)` de manière répétée après la mise à jour, collectez un rapport sur les dépendances et les journaux. La ligne `@discordjs/voice` fournie inclut le correctif de remplissage en amont de la PR discord.js #11449, qui a clos le problème discord.js #11419.
- Les événements de réception `The operation was aborted` sont attendus lorsqu'OpenClaw finalise un segment de locuteur capturé ; il s'agit de diagnostics détaillés, et non d'avertissements.
- Les journaux vocaux détaillés de Discord incluent un aperçu de transcription STT sur une ligne limitée pour chaque segment de locuteur accepté, afin que le débogage affiche à la fois le côté utilisateur et le côté réponse de l'agent sans vider un texte de transcription illimité.
- En mode `agent-proxy`, le repli forcé de consultation ignore les fragments de transcription probablement incomplets, tels que le texte se terminant par `...` ou un connecteur final comme `and`, ainsi que les fins de conversation évidentes non actionnables comme « je reviens tout de suite » ou « au revoir ». Les journaux indiquent `forced agent consult skipped reason=...` lorsque cela empêche une réponse mise en file d'attente obsolète.

### Suivre les utilisateurs en voix

Utilisez `voice.followUsers` lorsque vous souhaitez que le bot vocal Discord reste avec un ou plusieurs utilisateurs Discord connus au lieu de rejoindre un channel fixe au démarrage ou d'attendre `/vc join`.

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

- `followUsers` accepte les ID d'utilisateurs bruts de Discord et les valeurs `discord:<id>`. OpenClaw normalise les deux formes avant de faire correspondre les événements d'état vocal.
- `followUsersEnabled` par défaut à `true` lorsque `followUsers` est configuré. Réglez-le sur `false` pour conserver la liste sauvegardée mais arrêter le suivi vocal automatique.
- Lorsqu'un utilisateur suivi rejoint un canal vocal autorisé, OpenClaw rejoint ce canal. Lorsque l'utilisateur se déplace, OpenClaw se déplace avec lui. Lorsque l'utilisateur suivi actif se déconnecte, OpenClaw part.
- Si plusieurs utilisateurs suivis sont dans la même guilde et que l'utilisateur suivi actif part, OpenClaw se déplace vers le canal d'un autre utilisateur suivi avant de quitter la guilde. Si plusieurs utilisateurs suivis se déplacent en même temps, le dernier événement d'état vocal observé l'emporte.
- `allowedChannels` s'applique toujours. Un utilisateur suivi dans un canal non autorisé est ignoré, et une session appartenant à un suivi est déplacée vers un autre utilisateur suivi ou quitte.
- OpenClaw réconcilie les événements d'état vocal manqués au démarrage et à intervalle limité. La réconciliation échantillonne les guildes configurées et limite les recherches REST par exécution, il est donc possible que de très grandes listes `followUsers` prennent plus d'un intervalle pour converger.
- Si Discord ou un administrateur déplace le bot alors qu'il suit un utilisateur, OpenClaw reconstruit la session vocale et conserve la propriété du suivi lorsque la destination est autorisée. Si le bot est déplacé hors de `allowedChannels`, OpenClaw quitte et rejoint la cible configurée lorsqu'elle existe.
- La récupération de réception DAVE peut quitter et rejoindre le même channel après des échecs de déchiffrement répétés. Les sessions appartenant au suivi conservent leur propriété de suivi via ce chemin de récupération, de sorte qu'une déconnexion ultérieure de l'utilisateur suivi quitte toujours le channel.

Choisissez parmi les modes de jointure :

- Utilisez `followUsers` pour les configurations personnelles ou d'opérateur où le bot doit être automatiquement en vocal quand vous l'êtes.
- Utilisez `autoJoin` pour les bots de salle fixe qui doivent être présents même lorsqu'aucun utilisateur suivi n'est en vocal.
- Utilisez `/vc join` pour les jointures ponctuelles ou les salles où la présence vocale automatique serait surprenante.

Configuration Opus native pour les récupérations de sources :

```bash
pnpm install
mise exec node@22 -- pnpm discord:opus:install
```

Utilisez Node 22 pour la passerelle lorsque vous souhaitez le module natif préconstruit macOS arm64 en amont. Si vous utilisez un autre runtime Node, le programme d'installation opt-in peut avoir besoin d'une chaîne d'outils de compilation source `node-gyp` locale.

Après avoir installé l'addon natif, démarrez le Gateway avec :

```bash
OPENCLAW_DISCORD_OPUS_DECODER=native pnpm gateway:watch
```

Les logs verbeux de voix doivent afficher `discord voice: opus decoder: @discordjs/opus`. Sans l'acceptation de l'env, ou si l'addon natif est manquant ou ne peut pas être chargé sur l'hôte, OpenClaw enregistre `discord voice: opus decoder: opusscript` et continue de recevoir la voix via le repli JS pur.

Pipeline STT plus TTS :

- La capture PCM Discord est convertie en un fichier temporaire WAV.
- `tools.media.audio` gère la STT, par exemple `openai/gpt-4o-mini-transcribe`.
- La transcription est envoyée via l'entrée et le routage Discord tandis que le LLM de réponse s'exécute avec une stratégie de sortie vocale qui masque le `tts` tool de l'agent et demande le texte retourné, car la voix Discord possède la lecture TTS finale.
- `voice.model`, une fois défini, remplace uniquement le LLM de réponse pour ce tour de canal vocal.
- `voice.tts` est fusionné par-dessus `messages.tts`; les fournisseurs compatibles avec le flux alimentent directement le lecteur, sinon le fichier audio résultant est lu dans le canal rejoint.

Exemple de session de canal vocal par défaut pour le proxy d'agent :

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai-codex/gpt-5.5",
        followUsersEnabled: true,
        followUsers: ["123456789012345678"],
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
        },
      },
    },
  },
}
```

Sans bloc `voice.agentSession`, chaque canal vocal obtient sa propre session OpenClaw acheminée. Par exemple, `/vc join channel:234567890123456789` parle à la session pour ce canal vocal Discord. Le modèle en temps réel n'est que la interface vocale ; les demandes substantielles sont transmises à l'agent OpenClaw configuré. Si le modèle en temps réel produit une transcription finale sans appeler l'outil de consultation, OpenClaw force la consultation en solution de repli afin que le défaut se comporte toujours comme une discussion avec l'agent.

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
          openai: {
            model: "gpt-4o-mini-tts",
            voice: "cedar",
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
        model: "openai-codex/gpt-5.5",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
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
        model: "openai-codex/gpt-5.5",
        agentSession: {
          mode: "target",
          target: "channel:123456789012345678",
        },
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
        },
      },
    },
  },
}
```

En mode `agent-proxy`, le bot rejoint le canal vocal configuré, mais les tours de l'agent OpenClaw utilisent la session et l'agent acheminés normaux du canal cible. La session vocale en temps réel prononce le résultat renvoyé dans le canal vocal. L'agent superviseur peut toujours utiliser les outils de message normaux selon sa politique d'outils, y compris l'envoi d'un message Discord distinct si c'est la bonne action.

Alors qu'une exécution déléguée OpenClaw est active, les nouvelles transcriptions vocales Discord sont traitées comme un contrôle de l'exécution en direct avant de démarrer un autre tour d'agent. Des phrases telles que « statut », « annule ça », « utilise la correction plus petite » ou « quand tu as fini vérifie aussi les tests » sont classées comme des entrées de statut, d'annulation, de guidage ou de suivi pour la session active. Les résultats de statut, d'annulation, de guidage accepté et de suite sont prononcés dans le canal vocal afin que l'appelant sache si OpenClaw a traité la demande.

Formes cibles utiles :

- `target: "channel:123456789012345678"` transite via une session de canal texte Discord.
- `target: "123456789012345678"` est traité comme une cible de canal.
- `target: "dm:123456789012345678"` ou `target: "user:123456789012345678"` transite via cette session de message direct.

Exemple Echo-heavy OpenAI Realtime :

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        mode: "bidi",
        model: "openai-codex/gpt-5.5",
        realtime: {
          provider: "openai",
          model: "gpt-realtime-2",
          voice: "cedar",
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

Utilisez ceci lorsque le model entend sa propre lecture Discord via un microphone ouvert, mais que vous souhaitez toujours l'interrompre en parlant. OpenClaw empêche OpenAI d'interrompre automatiquement sur l'audio d'entrée brut, tandis que `bargeIn: true` permet aux événements de début de locuteur Discord et à l'audio de locuteur déjà actif d'annuler les réponses en temps réel actives avant que le prochain tour capturé n'atteigne OpenAI. Les signaux d'interruption très précoces avec `audioEndMs` ci-dessous `minBargeInAudioEndMs` sont traités comme probablement des échos/bruits et ignorés pour que le model ne se coupe pas à la première trame de lecture.

Journaux vocaux attendus :

- À la rejoindre : `discord voice: joining ... voiceSession=... supervisorSession=... agentSessionMode=... voiceModel=... realtimeModel=...`
- Au démarrage en temps réel : `discord voice: realtime bridge starting ... autoRespond=false interruptResponse=false bargeIn=false minBargeInAudioEndMs=...`
- Sur l'audio du haut-parleur : `discord voice: realtime speaker turn opened ...`, `discord voice: realtime input audio started ... outputAudioMs=... outputActive=...` et `discord voice: realtime speaker turn closed ... chunks=... discordBytes=... realtimeBytes=... interruptedPlayback=...`
- En cas de saut de parole obsolète : `discord voice: realtime forced agent consult skipped reason=incomplete-transcript ...` ou `reason=non-actionable-closing ...`
- À la fin de la réponse en temps réel : `discord voice: realtime audio playback finishing reason=response.done ... audioMs=... chunks=...`
- À l'arrêt/réinitialisation de la lecture : `discord voice: realtime audio playback stopped reason=... audioMs=... elapsedMs=... chunks=...`
- Lors d'une consultation en temps réel : `discord voice: realtime consult requested ... voiceSession=... supervisorSession=... question=...`
- Sur la réponse de l'agent : `discord voice: agent turn answer ...`
- Sur la parole exacte mise en file d'attente : `discord voice: realtime exact speech queued ... queued=... outputAudioMs=... outputActive=...`, suivie de `discord voice: realtime exact speech dequeued reason=player-idle ...`
- Sur la détection d'interruption : `discord voice: realtime barge-in detected source=speaker-start ...` ou `discord voice: realtime barge-in detected source=active-speaker-audio ...`, suivie de `discord voice: realtime barge-in requested reason=... outputAudioMs=... outputActive=...`
- En cas d'interruption en temps réel : `discord voice: realtime model interrupt requested client:response.cancel reason=barge-in`, suivie de `discord voice: realtime model audio truncated client:conversation.item.truncate reason=barge-in audioEndMs=...` ou `discord voice: realtime model interrupt confirmed server:response.done status=cancelled ...`
- Sur l'écho/bruit ignoré : `discord voice: realtime model interrupt ignored client:conversation.item.truncate.skipped reason=barge-in audioEndMs=0 minAudioEndMs=250`
- Sur l'interruption désactivée : `discord voice: realtime capture ignored during playback (barge-in disabled) ...`
- Sur la lecture inactive : `discord voice: realtime barge-in ignored reason=... outputActive=false ... playbackChunks=0`

Pour déboguer l'audio coupé, lisez les journaux vocaux en temps réel comme une chronologie :

1. `realtime audio playback started` signifie que Discord a commencé à lire l'audio de l'assistant. Le pont commence à compter les segments de sortie de l'assistant, les octets PCM Discord, les octets en temps réel du provider et la durée de l'audio synthétisé à partir de ce point.
2. `realtime speaker turn opened` marque un haut-parleur Discord devenant actif. Si la lecture est déjà active et que `bargeIn` est activé, cela peut être suivi de `barge-in detected source=speaker-start`.
3. `realtime input audio started` marque la première trame audio réelle reçue pour ce tour de parole. `outputActive=true` ou une `outputAudioMs` non nulle ici signifie que le microphone envoie une entrée tandis que la lecture de l'assistant est toujours active.
4. `barge-in detected source=active-speaker-audio`OpenClawDiscord signifie qu'OpenClaw a détecté une audio de l'intervenant en direct alors que la lecture de l'assistant était active. Ceci est utile pour distinguer une véritable interruption d'un événement de début de parole Discord sans audio utile.
5. `barge-in requested reason=...`OpenClaw signifie qu'OpenClaw a demandé au fournisseur en temps réel d'annuler ou de tronquer la réponse active. Il inclut `outputAudioMs`, `outputActive` et `playbackChunks` afin que vous puissiez voir combien d'audio de l'assistant avait réellement été diffusé avant l'interruption.
6. `realtime audio playback stopped reason=...` est le point de réinitialisation de la lecture Discord locale. La raison indique qui a arrêté la lecture : `barge-in`, `player-idle`, `provider-clear-audio`, `forced-agent-consult`, `stream-close`, ou `session-close`.
7. `realtime speaker turn closed` résume le tour de saisie capturé. `chunks=0` ou `hasAudio=false` signifie que le tour de parole s'est ouvert mais qu'aucune audio utilisable n'a atteint le pont temps réel. `interruptedPlayback=true` signifie que le tour de saisie a chevauché la sortie de l'assistant et a déclenché la logique d'interruption (barge-in).

Champs utiles :

- `outputAudioMs` : durée de l'audio de l'assistant générée par le provider temps réel avant la ligne de journal.
- `audioMs` : durée audio de l'assistant comptée par OpenClaw avant l'arrêt de la lecture.
- `elapsedMs` : temps écoulé entre l'ouverture et la fermeture du flux de lecture ou du tour de parole.
- `discordBytes` : octets PCM stéréo à 48 kHz envoyés ou reçus de la voix Discord.
- `realtimeBytes` : octets PCM au format provider envoyés ou reçus du fournisseur en temps réel.
- `playbackChunks` : morceaux audio de l'assistant transférés vers Discord pour la réponse active.
- `sinceLastAudioMs` : délai entre la dernière trame audio capturée du locuteur et la fin de son tour de parole.

Motifs courants :

- Une coupure immédiate avec `source=active-speaker-audio`, un petit `outputAudioMs` et le même utilisateur à proximité indique généralement que l'écho du haut-parleur entre dans le micro. Augmentez `voice.realtime.minBargeInAudioEndMs`, baissez le volume du haut-parleur, utilisez des écouteurs ou définissez `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`.
- `source=speaker-start` suivi de `speaker turn closed ... hasAudio=false` signifie que Discord a signalé un début de parole mais qu'aucun son n'est parvenu à OpenClaw. Cela peut être dû à un événement vocal transitoire de Discord, au comportement du seuil de bruit (noise gate), ou à un client activant brièvement le micro.
- `audio playback stopped reason=stream-close` sans interruption (barge-in) à proximité ou `provider-clear-audio` signifie que le flux de lecture local Discord s'est terminé de manière inattendue. Vérifiez les journaux du fournisseur précédent et les journaux du lecteur Discord.
- `capture ignored during playback (barge-in disabled)` signifie qu'OpenClaw a intentionnellement abandonné l'entrée alors que l'audio de l'assistant était actif. Activez `voice.realtime.bargeIn` si vous souhaitez que la parole interrompe la lecture.
- `barge-in ignored ... outputActive=false` signifie que le VAD de Discord ou du fournisseur a détecté de la parole, mais qu'OpenClaw n'avait aucune lecture active à interrompre. Cela ne devrait pas couper l'audio.

Les informations d'identification sont résolues par composant : auth de route LLM pour `voice.model`, auth STT pour `tools.media.audio`, auth TTS pour `messages.tts`/`voice.tts`, et auth du fournisseur en temps réel pour `voice.realtime.providers` ou la configuration d'auth normale du fournisseur.

### Messages vocaux

Les messages vocaux Discord affichent un aperçu de la forme d'onde et nécessitent un audio OGG/Opus. OpenClaw génère automatiquement la forme d'onde, mais a besoin de DiscordOpenClaw`ffmpeg` et de `ffprobe` sur l'hôte de la passerelle pour inspecter et convertir.

- Fournissez un **chemin de fichier local** (les URL sont rejetées).
- Omettez le contenu texte (Discord rejette le texte + message vocal dans la même charge utile).
- Tout format audio est accepté ; OpenClaw convertit en OGG/Opus si nécessaire.

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## Dépannage

<AccordionGroup>
  <Accordion title="Used disallowed intents or bot sees no guild messages">

    - activer l'intention de contenu de message (Message Content Intent)
    - activer l'intention des membres du serveur (Server Members Intent) lorsque vous dépendez de la résolution des utilisateurs/membres
    - redémarrez la passerelle après avoir modifié les intentions

  </Accordion>

  <Accordion title="Guild messages blocked unexpectedly">

    - vérifiez `groupPolicy`
    - vérifiez la liste d'autorisation de guilde sous `channels.discord.guilds`
    - si la carte `channels` de guilde existe, seuls les canaux répertoriés sont autorisés
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

    - `groupPolicy="allowlist"` sans liste d'autorisation de guilde/canal correspondante
    - `requireMention` configuré au mauvais endroit (doit être sous `channels.discord.guilds` ou l'entrée de canal)
    - expéditeur bloqué par la liste d'autorisation `users` de guilde/canal

  </Accordion>

  <Accordion title="DiscordTours Discord de longue durée ou réponses en double">

    Journaux types :

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`Discord

    Commandes de la file d'attente de la passerelle Discord :

    - compte unique : `channels.discord.eventQueue.listenerTimeout`
    - compte multiple : `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`DiscordDiscordDiscord
    - cela contrôle uniquement le travail de l'écouteur de la passerelle Discord, et non la durée de vie du tour de l'agent

    Discord n'applique pas de délai d'attente propriétaire du channel aux tours d'agent mis en file d'attente. Les écouteurs de messages transfèrent immédiatement, et les exécutions Discord mises en file d'attente préservent l'ordre par session jusqu'à ce que le cycle de vie de la session/de l'outil/de l'exécution termine ou abandonne le travail.

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

  <Accordion title="Avertissements de délai d'attente de recherche de métadonnées du Gateway">
    OpenClaw récupère les métadonnées `/gateway/bot` de Discord avant de se connecter. En cas de défaillances transitoires, le système revient à l'URL du Discord par défaut et ces incidents sont limités en taux dans les journaux.

    Paramètres de délai d'attente des métadonnées :

    - single-account : `channels.discord.gatewayInfoTimeoutMs`
    - multi-account : `channels.discord.accounts.<accountId>.gatewayInfoTimeoutMs`
    - env de secours si la config n'est pas définie : `OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS`
    - par défaut : `30000` (30 secondes), max : `120000`

  </Accordion>

  <Accordion title="GatewayRedémarrages du délai d'attente READY du Gateway"OpenClawDiscord>
    OpenClaw attend l'événement de Gateway `READY` de Discord lors du démarrage et après les reconnexions à l'exécution. Les configurations multi-comptes avec un échelonnement du démarrage peuvent nécessiter une fenêtre READY de démarrage plus longue que celle par défaut.

    Paramètres de délai d'attente READY :

    - démarrage mono-compte : `channels.discord.gatewayReadyTimeoutMs`
    - démarrage multi-compte : `channels.discord.accounts.<accountId>.gatewayReadyTimeoutMs`
    - solution de repli d'env au démarrage si la config n'est pas définie : `OPENCLAW_DISCORD_READY_TIMEOUT_MS`
    - défaut au démarrage : `15000` (15 secondes), max : `120000`
    - exécution mono-compte : `channels.discord.gatewayRuntimeReadyTimeoutMs`
    - exécution multi-compte : `channels.discord.accounts.<accountId>.gatewayRuntimeReadyTimeoutMs`
    - solution de repli d'env à l'exécution si la config n'est pas définie : `OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`
    - défaut à l'exécution : `30000` (30 secondes), max : `120000`

  </Accordion>

  <Accordion title="Permissions audit mismatches">
    `channels status --probe` permission checks only work for numeric channel IDs.

    If you use slug keys, runtime matching can still work, but probe cannot fully verify permissions.

  </Accordion>

  <Accordion title="DM and pairing issues">

    - DM disabled: `channels.discord.dm.enabled=false`
    - DM policy disabled: `channels.discord.dmPolicy="disabled"` (legacy: `channels.discord.dm.policy`)
    - awaiting pairing approval in `pairing` mode

  </Accordion>

  <Accordion title="Bot to bot loops">
    Par défaut, les messages créés par des bots sont ignorés.

    Si vous définissez `channels.discord.allowBots=true`, utilisez des règles strictes de mention et de liste d'autorisation pour éviter les boucles.
    Préférez `channels.discord.allowBots="mentions"` pour n'accepter que les messages de bots qui mentionnent le bot.

    OpenClaw fournit également une [protection commune contre les boucles de bots](/fr/channels/bot-loop-protection). Chaque fois que `allowBots` laisse les messages créés par des bots atteindre la répartition, Discord mappe l'événement entrant aux faits `(account, channel, bot pair)` et le garde de paire générique supprime la paire après qu'elle a dépassé le budget d'événements configuré. Le garde empêche les boucles incontrôlables entre deux bots qui devaient auparavant être arrêtées par les limites de taux de Discord ; cela n'affecte pas les déploiements à bot unique ou les réponses uniques de bots qui restent dans le budget.

    Paramètres par défaut (actifs lorsque `allowBots` est défini) :

    - `maxEventsPerWindow: 20` -- une paire de bots peut échanger 20 messages dans la fenêtre glissante
    - `windowSeconds: 60` -- longueur de la fenêtre glissante
    - `cooldownSeconds: 60` -- une fois le budget dépassé, chaque message supplémentaire de bot à bot dans les deux sens est ignoré pendant une minute

    Configurez la valeur par défaut partagée une fois sous `channels.defaults.botLoopProtection`, puis remplacez Discord lorsqu'un flux de travail légitime a besoin de plus de marge. La priorité est :

    - `channels.discord.accounts.<account>.botLoopProtection`
    - `channels.discord.botLoopProtection`
    - `channels.defaults.botLoopProtection`
    - paramètres intégrés par défaut

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
    - si les échecs persistent après la reconnexion automatique, collectez les journaux et comparez-les avec l'historique de réception DAVE en amont dans [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) et [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449)

  </Accordion>
</AccordionGroup>

## Référence de configuration

Référence principale : [Configuration reference - Discord](/fr/gateway/config-channels#discord).

<Accordion title="DiscordChamps Discord à signal élevé">

- startup/auth : `enabled`, `token`, `accounts.*`, `allowBots`
- policy : `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- command : `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- event queue : `eventQueue.listenerTimeout` (listener budget), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- gateway : `gatewayInfoTimeoutMs`, `gatewayReadyTimeoutMs`, `gatewayRuntimeReadyTimeoutMs`
- reply/history : `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- delivery : `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- streaming : `streaming` (legacy alias : `streamMode`), `streaming.preview.toolProgress`, `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- media/retry : `mediaMaxMb`Discord (caps outbound Discord uploads, default `100MB`), `retry`
- actions : `actions.*`
- presence : `activity`, `status`, `activityType`, `activityUrl`
- UI : `ui.components.accentColor`
- features : `threadBindings`, top-level `bindings[]` (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents.enabled`, `agentComponents.ttlMs`, `heartbeat`, `responsePrefix`

</Accordion>

## Sécurité et opérations

- Traitez les jetons de bot comme des secrets (`DISCORD_BOT_TOKEN` préférés dans les environnements supervisés).
- Accordez les autorisations Discord avec le minimum de privilèges.
- Si le déploiement/état des commandes est périmé, redémarrez la passerelle et revérifiez avec `openclaw channels status --probe`.

## Connexes

<CardGroup cols={2}>
  <Card title="Association" icon="link" href="/fr/channels/pairing" Discord>
    Associer un utilisateur Discord à la passerelle.
  </Card>
  <Card title="Groupes" icon="users" href="/fr/channels/groups">
    Comportement de chat de groupe et de liste d'autorisation.
  </Card>
  <Card title="Routage des canaux" icon="route" href="/fr/channels/channel-routing">
    Acheminez les messages entrants vers les agents.
  </Card>
  <Card title="Sécurité" icon="shield" href="/fr/gateway/security">
    Modèle de menace et durcissement.
  </Card>
  <Card title="Routage multi-agent" icon="sitemap" href="/fr/concepts/multi-agent">
    Associer des guildes et des canaux à des agents.
  </Card>
  <Card title="Commandes slash" icon="terminal" href="/fr/tools/slash-commands">
    Comportement des commandes natives.
  </Card>
</CardGroup>
