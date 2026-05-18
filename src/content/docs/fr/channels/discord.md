---
summary: "DiscordÉtat du support, fonctionnalités et configuration du bot Discord"
read_when:
  - Working on Discord channel features
title: "DiscordDiscord"
---

Prêt pour les DMs et les canaux de guilde via la passerelle officielle Discord.

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing" Discord>
    Les DMs Discord sont en mode appairage par défaut.
  </Card>
  <Card title="Slash commands" icon="terminal" href="/fr/tools/slash-commands">
    Comportement natif des commandes et catalogue des commandes.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/fr/channels/troubleshooting">
    Diagnostics et flux de réparation multi-canal.
  </Card>
</CardGroup>

## Configuration rapide

Vous devrez créer une nouvelle application avec un bot, ajouter le bot à votre serveur et le coupler à OpenClaw. Nous vous recommandons d'ajouter votre bot à votre propre serveur privé. Si vous n'en avez pas encore un, [créez-en un d'abord](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server) (choisissez **Create My Own > For me and my friends**).

<Steps>
  <Step title="Créer une application et un bot Discord">
    Allez sur le [Portail des développeurs Discord](https://discord.com/developers/applications) et cliquez sur **New Application**. Nommez-le quelque chose comme "OpenClaw".

    Cliquez sur **Bot** dans la barre latérale. Définissez le **Username** comme vous appelez votre agent OpenClaw.

  </Step>

  <Step title="Activer les intentions privilégiées">
    Toujours sur la page **Bot**, faites défiler vers le bas jusqu'à **Privileged Gateway Intents** et activez :

    - **Message Content Intent** (requis)
    - **Server Members Intent** (recommandé ; requis pour les listes d'autorisation de rôles et la correspondance nom-ID)
    - **Presence Intent** (optionnel ; nécessaire uniquement pour les mises à jour de présence)

  </Step>

  <Step title="Copiez votre jeton de bot">
    Remontez sur la page **Bot** et cliquez sur **Reset Token** (Réinitialiser le jeton).

    <Note>
    Malgré son nom, cela génère votre premier jeton — rien n'est en cours de « réinitialisation ».
    </Note>

    Copiez le jeton et enregistrez-le quelque part. C'est votre **Bot Token** (Jeton de bot) et vous en aurez besoin sous peu.

  </Step>

  <Step title="Générer une URL d'invitation et ajouter le bot à votre serveur">
    Cliquez sur **OAuth2** dans la barre latérale. Vous allez générer une URL d'invitation avec les bonnes permissions pour ajouter le bot à votre serveur.

    Faites défiler vers le bas jusqu'à **Générateur d'URL OAuth2** et activez :

    - `bot`
    - `applications.commands`

    Une section **Permissions du Bot** apparaîtra ci-dessous. Activez au moins :

    **Permissions Générales**
      - Voir les channels
    **Permissions Textuelles**
      - Envoyer des messages
      - Lire l'historique des messages
      - Intégrer des liens
      - Joindre des fichiers
      - Ajouter des réactions (optionnel)

    Il s'agit de l'ensemble de base pour les channels texte normaux. Si vous prévoyez de publier dans des fils de Discord, y compris les workflows de channel forum ou média qui créent ou poursuivent un fil, activez également **Envoyer des messages dans les fils**.
    Copiez l'URL générée en bas, collez-la dans votre navigateur, sélectionnez votre serveur et cliquez sur **Continuer** pour vous connecter. Vous devriez maintenant voir votre bot sur le serveur Discord.

  </Step>

  <Step title="Enable Developer Mode and collect your IDs">
    De retour dans l'application Discord, vous devez activer le Mode Développeur afin de pouvoir copier les identifiants internes.

    1. Cliquez sur **User Settings** (icône d'engrenage à côté de votre avatar) → **Advanced** → activez **Developer Mode**
    2. Faites un clic droit sur l'**icône de votre serveur** dans la barre latérale → **Copy Server ID**
    3. Faites un clic droit sur **votre propre avatar** → **Copy User ID**

    Enregistrez votre **Server ID** et votre **User ID** ainsi que votre Jeton Bot — vous enverrez les trois à OpenClaw à l'étape suivante.

  </Step>

  <Step title="Autoriser les DMs des membres du serveur">
    Pour que l'appairage fonctionne, Discord doit autoriser votre bot à vous envoyer des DMs. Clic droit sur votre **icône de serveur** → **Paramètres de confidentialité** → activer **Messages directs**.

    Cela permet aux membres du serveur (y compris les bots) de vous envoyer des DMs. Gardez cette option activée si vous souhaitez utiliser les DMs Discord avec OpenClaw. Si vous prévoyez uniquement d'utiliser les canaux de guilde, vous pouvez désactiver les DMs après l'appairage.

  </Step>

  <Step title="Définissez votre jeton de bot en toute sécurité (ne l'envoyez pas dans le chat)">
    Le jeton de votre bot Discord est un secret (comme un mot de passe). Définissez-le sur la machine exécutant OpenClaw avant d'envoyer un message à votre agent.

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

    Si OpenClaw est déjà en cours d'exécution en tant que service d'arrière-plan, redémarrez-le via l'application Mac OpenClaw ou en arrêtant et en redémarrant le processus `openclaw gateway run`.
    Pour les installations de services gérés, exécutez `openclaw gateway install` à partir d'un shell où `DISCORD_BOT_TOKEN` est présent, ou stockez la variable dans `~/.openclaw/.env`, afin que le service puisse résoudre le SecretRef de l'environnement après le redémarrage.
    Si votre hôte est bloqué ou limité par la recherche d'application de démarrage de Discord, définissez l'ID d'application/client Discord à partir du portail des développeurs afin que le démarrage puisse ignorer cet appel REST. Utilisez `channels.discord.applicationId` pour le compte par défaut, ou `channels.discord.accounts.<accountId>.applicationId` lorsque vous exécutez plusieurs bots Discord.

  </Step>

  <Step title="Configurer OpenClaw et jumeler">

    <Tabs>
      <Tab title="Demander à votre agent">
        Discutez avec votre agent OpenClaw sur n'importe quel canal existant (par exemple, Telegram) et dites-lui. Si Discord est votre premier canal, utilisez plutôt l'onglet CLI / config.

        > « J'ai déjà défini mon token de bot Discord dans la configuration. Veuillez terminer la configuration Discord avec l'ID utilisateur `<user_id>` et l'ID de serveur `<server_id>`. »
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

        Fallback d'env pour le compte par défaut :

```bash
DISCORD_BOT_TOKEN=...
```

        Pour une configuration scriptée ou à distance, écrivez le même bloc JSON5 avec `openclaw config patch --file ./discord.patch.json5 --dry-run`, puis relancez sans `--dry-run`. Les valeurs en texte brut `token` sont prises en charge. Les valeurs SecretRef sont également prises en charge pour `channels.discord.token` sur les fournisseurs env/file/exec. Voir [Gestion des secrets](/fr/gateway/secrets).

        Pour plusieurs bots Discord, conservez chaque token de bot et ID d'application sous son compte. Un `channels.discord.applicationId` de premier niveau est hérité par les comptes, ne le définissez donc à cet endroit que lorsque chaque compte doit utiliser le même ID d'application.

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

  <Step title="Approuver la première association DM">
    Attendez que la passerelle soit en cours d'exécution, puis envoyez un message privé à votre bot sur Discord. Il répondra avec un code d'association.

    <Tabs>
      <Tab title="Demander à votre agent">
        Envoyez le code d'association à votre agent sur votre channel existant :

        > « Approuver ce code d'association Discord : `<CODE>` »
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    Les codes d'association expirent après 1 heure.

    Vous devriez désormais être en mesure de discuter avec votre agent sur Discord via DM.

  </Step>
</Steps>

<Note>
  La résolution des jetons est consciente du compte. Les valeurs des jetons de configuration prévalent sur le repli de l'environnement. `DISCORD_BOT_TOKEN` est utilisé uniquement pour le compte par défaut. Si deux comptes Discord activés résolvent vers le même jeton de bot, OpenClaw ne lance qu'un seul moniteur de passerelle pour ce jeton. Un jeton issu de la configuration l'emporte sur le repli
  de l'environnement par défaut ; sinon, le premier compte activé l'emporte et le compte en double est signalé comme désactivé. Pour les appels sortants avancés (actions d'outil de message/canal), un `token` explicite par appel est utilisé pour cet appel. Cela s'applique aux actions d'envoi et de style lecture/sonde (par exemple lecture/recherche/récupération/fil/épingles/autorisations). Les
  paramètres de stratégie/réessai du compte proviennent toujours du compte sélectionné dans l'instantané d'exécution actif.
</Note>

## Recommandé : Configurer un espace de travail de guilde

Une fois que les DMs fonctionnent, vous pouvez configurer votre serveur Discord en tant qu'espace de travail complet où chaque channel obtient sa propre session d'agent avec son propre contexte. Cela est recommandé pour les serveurs privés où il n'y a que vous et votre bot.

<Steps>
  <Step title="Ajoutez votre serveur à la liste d'autorisation de la guilde">
    Cela permet à votre agent de répondre dans n'importe quel channel de votre serveur, et pas seulement dans les DMs.

    <Tabs>
      <Tab title="Demander à votre agent">
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

  <Step title="Autoriser les réponses sans mention">
    Par défaut, votre agent répond uniquement dans les channels de guilde lorsqu'il est @mentionné. Pour un serveur privé, vous voudrez probablement qu'il réponde à chaque message.

    Dans les channels de guilde, la sortie visible Discord devrait utiliser le tool `message` par défaut, afin que l'agent puisse rester en observation et ne publier que lorsqu'il juge une réponse de channel utile. Les événements ambiants de la salle restent silencieux à moins que le tool n'envoie quelque chose. Voir [Ambient room events](/fr/channels/ambient-room-events) pour la configuration complète du mode observation.

    Cela signifie que le model sélectionné doit appeler les tools de manière fiable. Si Discord affiche l'état de frappe et que les journaux montrent une utilisation de jetons mais aucun message publié, vérifiez si le tour a été configuré comme un événement ambiant de la salle ou utilisez la configuration ci-dessous pour rétablir les réponses finales automatiques héritées pour les demandes de groupe normales.

    <Tabs>
      <Tab title="Demander à votre agent">
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

        Pour rétablir les réponses finales automatiques héritées pour les salles de groupe/channel, définissez `messages.groupChat.visibleReplies: "automatic"`.

      </Tab>
    </Tabs>

  </Step>

  <Step title="Planifier la mémoire pour les channels de guilde">
    Par défaut, la mémoire à long terme (MEMORY.md) ne se charge que dans les sessions DM. Les channels de guilde ne chargent pas automatiquement MEMORY.md.

    <Tabs>
      <Tab title="Demander à votre agent">
        > « Lorsque je pose des questions dans les channels Discord, utilisez memory_search ou memory_get si vous avez besoin d'un contexte à long terme de MEMORY.md. »
      </Tab>
      <Tab title="Manuel">
        Si vous avez besoin d'un contexte partagé dans chaque channel, placez les instructions stables dans `AGENTS.md` ou `USER.md` (elles sont injectées pour chaque session). Gardez les notes à long terme dans `MEMORY.md` et accédez-y à la demande avec les outils de mémoire.
      </Tab>
    </Tabs>

  </Step>
</Steps>

Créez maintenant des channels sur votre serveur Discord et commencez à discuter. Votre agent peut voir le nom du channel, et chaque channel obtient sa propre session isolée — vous pouvez donc configurer `#coding`, `#home`, `#research`, ou tout ce qui convient à votre flux de travail.

## Modèle d'exécution

- Le Gateway gère la connexion Discord.
- Le routage des réponses est déterministe : les messages entrants Discord sont renvoyés vers Discord.
- Les métadonnées de guilde/canal Discord sont ajoutées au prompt du modèle en tant que contexte non fiable, et non en tant que préfixe de réponse visible par l'utilisateur. Si un modèle recopie cette enveloppe, OpenClaw supprime les métadonnées copiées des réponses sortantes et du futur contexte de relecture.
- Par défaut (`session.dmScope=main`), les chats directs partagent la session principale de l'agent (`agent:main:main`).
- Les channels de guilde sont des clés de session isolées (`agent:<agentId>:discord:channel:<channelId>`).
- Les DMs de groupe sont ignorés par défaut (`channels.discord.dm.groupEnabled=false`).
- Les commandes slash natives s'exécutent dans des sessions de commande isolées (`agent:<agentId>:discord:slash:<userId>`), tout en transmettant toujours `CommandTargetSessionKey` à la session de conversation acheminée.
- La livraison d'annonces cron/heartbeat texte uniquement vers Discord utilise une seule fois la réponse finale visible par l'assistant. Les médias et les charges utiles de composants structurés restent en plusieurs messages lorsque l'agent émet plusieurs charges utiles livrables.

## Canaux de forum

Les canaux de forum et média Discord n'acceptent que les publications de fil. OpenClaw prend en charge deux façons de les créer :

- Envoyez un message au parent du forum (`channel:<forumId>`) pour créer automatiquement un fil. Le titre du fil utilise la première ligne non vide de votre message.
- Utilisez `openclaw message thread create` pour créer un fil directement. Ne passez pas `--message-id` pour les canaux de forum.

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

Les parents de forum n'acceptent pas les composants Discord. Si vous avez besoin de composants, envoyez-les au fil lui-même (`channel:<threadId>`).

## Composants interactifs

OpenClaw prend en charge les conteneurs de composants v2 Discord pour les messages des agents. Utilisez l'outil de message avec une charge utile `components`. Les résultats des interactions sont renvoyés vers l'agent sous forme de messages entrants normaux et suivent les paramètres `replyToMode` existants de Discord.

Blocs pris en charge :

- `text`, `section`, `separator`, `actions`, `media-gallery`, `file`
- Les lignes d'action permettent jusqu'à 5 boutons ou un seul menu de sélection
- Types de sélection : `string`, `user`, `role`, `mentionable`, `channel`

Par défaut, les composants sont à usage unique. Définissez `components.reusable=true` pour permettre aux boutons, sélecteurs et formulaires d'être utilisés plusieurs fois jusqu'à leur expiration.

Pour restreindre les personnes pouvant cliquer sur un bouton, définissez `allowedUsers` sur ce bouton (identifiants utilisateur Discord, balises ou `*`). Lorsqu'ils sont configurés, les utilisateurs non correspondants reçoivent un refus éphémère.

Les commandes slash `/model` et `/models` ouvrent un sélecteur de modèle interactif avec des listes déroulantes pour le fournisseur, le modèle et le runtime compatible, ainsi qu'une étape de validation. `/models add` est obsolète et renvoie désormais un message d'obsolescence au lieu d'enregistrer des modèles depuis le chat. La réponse du sélecteur est éphémère et seul l'utilisateur l'ayant invoqué peut l'utiliser. Les menus de sélection Discord sont limités à 25 options, ajoutez donc des entrées `provider/*` à `agents.defaults.models` lorsque vous souhaitez que le sélecteur affiche uniquement les modèles découverts dynamiquement pour les fournisseurs sélectionnés tels que `openai-codex` ou `vllm`.

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
  <Tab title="Politique de DM">
    `channels.discord.dmPolicy` contrôle l'accès aux DM. `channels.discord.allowFrom` est la liste d'autorisation (allowlist) canonique pour les DM.

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `channels.discord.allowFrom` inclue `"*"`)
    - `disabled`

    Si la stratégie de DM n'est pas ouverte, les utilisateurs inconnus sont bloqués (ou invités à s'appairer en mode `pairing`).

    Priorité multi-compte :

    - `channels.discord.accounts.default.allowFrom` s'applique uniquement au compte `default`.
    - Pour un compte, `allowFrom` prend le pas sur l'ancien `dm.allowFrom`.
    - Les comptes nommés héritent de `channels.discord.allowFrom` lorsque leur propre `allowFrom` et l'ancien `dm.allowFrom` ne sont pas définis.
    - Les comptes nommés n'héritent pas de `channels.discord.accounts.default.allowFrom`.

    L'ancien `channels.discord.dm.policy` et `channels.discord.dm.allowFrom` sont toujours lus pour la compatibilité. `openclaw doctor --fix` les migre vers `dmPolicy` et `allowFrom` lorsqu'il peut le faire sans modifier l'accès.

    Format de la cible DM pour la livraison :

    - `user:<id>`
    - Mention `<@id>`

    Les ID numériques seuls sont normalement résolus en tant qu'ID de channel lorsqu'un channel par défaut est actif, mais les ID listés dans le `allowFrom` DM effectif du compte sont traités comme des cibles DM utilisateur pour la compatibilité.

  </Tab>

  <Tab title="Groupes d'accès">
    Les DM Discord et l'autorisation des commandes texte peuvent utiliser des entrées dynamiques `accessGroup:<name>` dans `channels.discord.allowFrom`.

    Les noms des groupes d'accès sont partagés entre les canaux de messages. Utilisez `type: "message.senders"` pour un groupe statique dont les membres sont exprimés dans la syntaxe normale `allowFrom` de chaque canal, ou `type: "discord.channelAudience"` lorsque l'audience `ViewChannel` actuelle d'un canal Discord doit définir l'appartenance de manière dynamique. Le comportement des groupes d'accès partagés est documenté ici : [Groupes d'accès](/fr/channels/access-groups).

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

    Un canal texte Discord n'a pas de liste de membres séparée. `type: "discord.channelAudience"` modélise l'appartenance comme suit : l'envoyeur du DM est membre de la guilde configurée et possède actuellement l'autorisation `ViewChannel` effective sur le canal configuré après application des remplacements de rôle et de canal.

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

    Les recherches échouent en mode fermé. Si Discord renvoie `Missing Access`, que la recherche de membre échoue, ou que le canal appartient à une guilde différente, l'envoyeur du DM est traité comme non autorisé.

    Activez l'intention **Server Members Intent** du portail des développeurs Discord pour le bot lors de l'utilisation de groupes d'accès basés sur l'audience du canal. Les DMs n'incluent pas l'état des membres de la guilde, donc OpenClaw résout le membre via l'API REST Discord au moment de l'autorisation.

  </Tab>

  <Tab title="Politique de guilde">
    La gestion des guildes est contrôlée par `channels.discord.groupPolicy` :

    - `open`
    - `allowlist`
    - `disabled`

    La ligne de base sécurisée lorsque `channels.discord` existe est `allowlist`.

    Comportement `allowlist` :

    - la guilde doit correspondre à `channels.discord.guilds` (`id` préféré, slug accepté)
    - listes d'autorisation d'envoi facultatives : `users` (ID stables recommandés) et `roles` (ID de rôle uniquement) ; si l'une ou l'autre est configurée, les expéditeurs sont autorisés lorsqu'ils correspondent à `users` OU `roles`
    - la correspondance directe par nom/tag est désactivée par défaut ; n'activez `channels.discord.dangerouslyAllowNameMatching: true` qu'en mode de compatibilité de secours
    - les noms/tags sont pris en charge pour `users`, mais les ID sont plus sûrs ; `openclaw security audit` avertit lorsque des entrées de nom/tag sont utilisées
    - si une guilde a `channels` configuré, les canaux non répertoriés sont refusés
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

    Si vous définissez uniquement `DISCORD_BOT_TOKEN` et ne créez pas de bloc `channels.discord`, le repli à l'exécution est `groupPolicy="allowlist"` (avec un avertissement dans les journaux), même si `channels.defaults.groupPolicy` est `open`.

  </Tab>

  <Tab title="Mentions et messages de groupe">
    Les messages de guildes sont verrouillés par mention par défaut.

    La détection des mentions inclut :

    - mention explicite du bot
    - modèles de mention configurés (`agents.list[].groupChat.mentionPatterns`, repli `messages.groupChat.mentionPatterns`)
    - comportement de réponse implicite au bot dans les cas pris en charge

    Lors de la rédaction de messages sortants Discord, utilisez la syntaxe de mention canonique : `<@USER_ID>` pour les utilisateurs, `<#CHANNEL_ID>` pour les salons, et `<@&ROLE_ID>` pour les rôles. N'utilisez pas l'ancien format de mention par surnom `<@!USER_ID>`.

    `requireMention` est configuré par guilde/salon (`channels.discord.guilds...`).
    `ignoreOtherMentions` ignore facultativement les messages qui mentionnent un autre utilisateur/rôle mais pas le bot (à l'exclusion de @everyone/@here).

    Messages de groupe :

    - par défaut : ignorés (`dm.groupEnabled=false`)
    - liste d'autorisation facultative via `dm.groupChannels` (ID de salon ou slugs)

  </Tab>
</Tabs>

### Routage d'agents basé sur les rôles

Utilisez `bindings[].match.roles` pour acheminer les membres de la guilde Discord vers différents agents par ID de rôle. Les liaisons basées sur les rôles n'acceptent que les ID de rôle et sont évaluées après les liaisons homologues ou homologues-parents et avant les liaisons propres à la guilde. Si une liaison définit également d'autres champs de correspondance (par exemple `peer` + `guildId` + `roles`), tous les champs configurés doivent correspondre.

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

- `commands.native` est défini par défaut sur `"auto"` et est activé pour Discord.
- Remplacement par channel : `channels.discord.commands.native`.
- `commands.native=false` ignore l'enregistrement et le nettoyage des commandes slash Discord lors du démarrage. Les commandes précédemment enregistrées peuvent rester visibles sur Discord jusqu'à ce que vous les supprimiez de l'application Discord.
- L'authentification des commandes natives utilise les mêmes listes d'autorisation/stratégies Discord que le traitement normal des messages.
- Les commandes peuvent toujours être visibles dans l'interface utilisateur Discord pour les utilisateurs qui ne sont pas autorisés ; l'exécution applique toujours l'authentification OpenClaw et renvoie "non autorisé".

Consultez [Slash commands](/fr/tools/slash-commands) pour le catalogue de commandes et le comportement.

Paramètres par défaut des commandes slash :

- `ephemeral: true`

## Détails des fonctionnalités

<AccordionGroup>
  <Accordion title="Balises de réponse et réponses natives">
    Discord prend en charge les balises de réponse dans la sortie de l'agent :

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    Contrôlé par `channels.discord.replyToMode` :

    - `off` (par défaut)
    - `first`
    - `all`
    - `batched`

    Remarque : `off` désactive le fil de discussion de réponse implicite. Les balises explicites `[[reply_to_*]]` sont toujours respectées.
    `first` attache toujours la référence de réponse native implicite au premier message sortant Discord pour le tour.
    `batched` n'attache la référence de réponse native implicite de Discord que lorsque l'événement entrant était un lot anti-rebond de plusieurs messages. C'est utile lorsque vous souhaitez des réponses natives principalement pour les chats en rafale ambiguës, et non pour chaque tour à message unique.

    Les ID de message sont exposés dans le contexte/l'historique afin que les agents puissent cibler des messages spécifiques.

  </Accordion>

  <Accordion title="Link previews">
    Discord génère par défaut des intégrations de liens riches pour les URL. OpenClaw supprime ces intégrations générées sur les messages sortants Discord par défaut, afin que les URL envoyées par l'agent restent des liens simples, sauf si vous l'activez :

```json5
{
  channels: {
    discord: {
      suppressEmbeds: false,
    },
  },
}
```

    Définissez `channels.discord.accounts.<id>.suppressEmbeds` pour remplacer le paramètre d'un compte. Les envois d'outil de message de l'agent peuvent également transmettre `suppressEmbeds: false` pour un seul message. Les charges utiles Discord `embeds` explicites ne sont pas supprimées par le paramètre par défaut de prévisualisation des liens.

  </Accordion>

  <Accordion title="Live stream preview">
    OpenClaw peut diffuser des réponses brouillon en envoyant un message temporaire et en le modifiant à mesure que le texte arrive. `channels.discord.streaming` prend `off` | `partial` | `block` | `progress` (par défaut). `progress` conserve un brouillon de statuts modifiable et le met à jour avec la progression des outils jusqu'à la livraison finale ; l'étiquette de démarrage partagée est une ligne défilante, elle disparaît donc comme le reste une fois qu'il y a suffisamment de travail. `streamMode` est un alias d'exécution hérité. Exécutez `openclaw doctor --fix` pour réécrire la configuration persistante vers la clé canonique.

    Définissez `channels.discord.streaming.mode` sur `off` pour désactiver les modifications de prévisualisation Discord. Si le Discord block streaming est explicitement activé, OpenClaw ignore le flux de prévisualisation pour éviter la double diffusion.

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

    - `partial` modifie un seul message de prévisualisation à mesure que les tokens arrivent.
    - `block` émet des blocs de taille de brouillon (utilisez `draftChunk` pour régler la taille et les points d'arrêt, limité à `textChunkLimit`).
    - Les finales médias, erreur et réponse explicite annulent les modifications de prévisualisation en attente.
    - `streaming.preview.toolProgress` (par défaut `true`) contrôle si les mises à jour d'outil/progression réutilisent le message de prévisualisation.
    - Les lignes d'outil/progression sont rendues sous forme d'emoji compacte + titre + détail si disponible, par exemple `🛠️ Bash: run tests` ou `🔎 Web Search: for "query"`.
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

    Le streaming de prévisualisation est texte uniquement ; les réponses média reviennent à la livraison normale. Lorsque le streaming `block` est explicitement activé, OpenClaw ignore le flux de prévisualisation pour éviter la double diffusion.

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

    - Les fils Discord sont acheminés en tant que sessions de channel et héritent de la configuration du channel parent, sauf en cas de substitution.
    - Les sessions de fil héritent de la sélection `/model` au niveau de la session du channel parent comme repli uniquement pour le model ; les sélections `/model` locales au fil priment toujours et l'historique des transcriptions parent n'est pas copié sauf si l'héritage des transcriptions est activé.
    - `channels.discord.thread.inheritParent` (par défaut `false`) opte pour l'amorçage des nouveaux fils automatiques à partir de la transcription parent. Les substitutions par compte se trouvent sous `channels.discord.accounts.<id>.thread.inheritParent`.
    - Les réactions aux outils de message peuvent résoudre les cibles de DM `user:<id>`.
    - `guilds.<guild>.channels.<channel>.requireMention: false` est préservé lors du repli de l'activation au stade de réponse.

    Les sujets des channel sont injectés en tant que contexte **non fiable** (untrusted). Les listes autorisées filtrent qui peut déclencher l'agent, et ne constituent pas une limite complète de suppression du contexte supplémentaire.

  </Accordion>

  <Accordion title="Sessions liées aux fils de discussion pour les sous-agents">
    Discord peut lier un fil de discussion à une cible de session, de sorte que les messages de suivi dans ce fil continuent d'être acheminés vers la même session (y compris les sessions de sous-agents).

    Commandes :

    - `/focus <target>` lier le fil actuel/nouveau à une cible de sous-agent/session
    - `/unfocus` supprimer la liaison du fil actuel
    - `/agents` afficher les exécutions actives et l'état de liaison
    - `/session idle <duration|off>` inspecter/mettre à jour le défocus automatique par inactivité pour les liaisons focalisées
    - `/session max-age <duration|off>` inspecter/mettre à jour l'âge maximum strict pour les liaisons focalisées

    Configuration :

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
    - `spawnSessions` contrôle la création/liaison automatique des fils pour `sessions_spawn({ thread: true })` et les créations de fils ACP. Par défaut : `true`.
    - `defaultSpawnContext` contrôle le contexte natif de sous-agent pour les créations liées aux fils. Par défaut : `"fork"`.
    - Les clés obsolètes `spawnSubagentSessions`/`spawnAcpSessions` sont migrées par `openclaw doctor --fix`.
    - Si les liaisons de fils sont désactivées pour un compte, `/focus` et les opérations connexes de liaison de fils ne sont pas disponibles.

    Voir [Sous-agents](/fr/tools/subagents), [Agents ACP](/fr/tools/acp-agents) et [Référence de configuration](/fr/gateway/configuration-reference).

  </Accordion>

  <Accordion title="Liaisons persistantes de channel ACP"Discord>
    Pour des espaces de travail ACP stables et « toujours actifs », configurez des liaisons ACP typées de niveau supérieur ciblant les conversations Discord.

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

    - `/acp spawn codex --bind here` lie le channel ou le fil actuel en place et conserve les messages futurs sur la même session ACP. Les messages des fils héritent de la liaison du channel parent.
    - Dans un channel ou un fil lié, `/new` et `/reset` réinitialisent la même session ACP en place. Les liaisons temporaires de fils peuvent remplacer la résolution de la cible tant qu'elles sont actives.
    - `spawnSessions` verrouille la création/liaison de fils enfants via `--thread auto|here`.

    Voir [ACP Agents](/fr/tools/acp-agents) pour plus de détails sur le comportement des liaisons.

  </Accordion>

  <Accordion title="Reaction notifications">
    Mode de notification de réaction par guilde :

    - `off`
    - `own` (par défaut)
    - `all`
    - `allowlist` (utilise `guilds.<id>.users`Discord)

    Les événements de réaction sont transformés en événements système et attachés à la session Discord routée.

  </Accordion>

  <Accordion title="Ack reactions">
    `ackReaction` envoie un emoji d'accusé de réception pendant qu'OpenClaw traite un message entrant.

    Ordre de résolution :

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - repli sur l'emoji d'identité de l'agent (`agents.list[].identity.emoji`, sinon "👀")

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

  <Accordion title="GatewayProxy Gateway"Discord>
    Acheminez le trafic WebSocket de la passerelle Discord et les recherches REST au démarrage (ID d'application + résolution de liste d'autorisation) via un proxy HTTP(S) avec `channels.discord.proxy`.

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

  <Accordion title="PluralKit support">
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

    - les allowlists peuvent utiliser `pk:<memberId>`
    - les noms d'affichage des membres sont correspondants par nom/slug uniquement lorsque `channels.discord.dangerouslyAllowNameMatching: true`
    - les recherches utilisent l'ID du message d'origine et sont limitées par une fenêtre de temps
    - si la recherche échoue, les messages proxifiés sont traités comme des messages de bot et ignorés, sauf si `allowBots=true`

  </Accordion>

  <Accordion title="Alias de mentions sortantes">
    Utilisez `mentionAliases`Discord lorsque les agents ont besoin de mentions sortantes déterministes pour les utilisateurs Discord connus. Les clés sont des pseudonymes sans le `@`Discord au début ; les valeurs sont des identifiants utilisateurs Discord. Les pseudonymes inconnus, `@everyone`, `@here`, et les mentions à l'intérieur des blocs de code Markdown sont laissés inchangés.

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

    Carte des types d'activité :

    - 0 : Joue
    - 1 : Stream (nécessite `activityUrl`)
    - 2 : Écoute
    - 3 : Regarde
    - 4 : Personnalisé (utilise le texte de l'activité comme état du statut ; l'émoji est facultatif)
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
    - `autoPresence.exhaustedText` (prend en charge le substituant `{reason}`)

  </Accordion>

  <Accordion title="Approbations sur Discord">
    Discord prend en charge la gestion des approbations par bouton dans les DMs et peut éventuellement publier des invites d'approbation dans le channel d'origine.

    Chemin de configuration :

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers` (optionnel ; revient à `commands.ownerAllowFrom` si possible)
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    Discord active automatiquement les approbations d'exécution natives lorsque `enabled` n'est pas défini ou est `"auto"` et qu'au moins un approuveur peut être résolu, soit depuis `execApprovals.approvers` soit depuis `commands.ownerAllowFrom`. Discord n'infère pas les approuveurs d'exécution depuis le `allowFrom` du channel, l'`dm.allowFrom` hérité, ou le `defaultTo` en message direct. Définissez `enabled: false` pour désactiver explicitement Discord en tant que client d'approbation natif.

    Pour les commandes de groupe sensibles réservées au propriétaire telles que `/diagnostics` et `/export-trajectory`, OpenClaw envoie les invites d'approbation et les résultats finaux en privé. Il essaie d'abord le DM Discord lorsque le propriétaire appelant a une route propriétaire Discord ; si ce n'est pas disponible, il revient à la première route propriétaire disponible depuis `commands.ownerAllowFrom`, telle que Telegram.

    Lorsque `target` est `channel` ou `both`, l'invite d'approbation est visible dans le channel. Seuls les approuveurs résolus peuvent utiliser les boutons ; les autres utilisateurs reçoivent un refus éphémère. Les invites d'approbation incluent le texte de la commande, n'activez donc la livraison par channel que dans les channels de confiance. Si l'ID du channel ne peut pas être dérivé de la clé de session, OpenClaw revient à la livraison par DM.

    Discord affiche également les boutons d'approbation partagés utilisés par d'autres channels de discussion. L'adaptateur natif Discord ajoute principalement le routage DM des approuveurs et la diffusion vers le channel.
    Lorsque ces boutons sont présents, ils constituent l'UX d'approbation principal ; OpenClaw
    ne doit inclure une commande manuelle `/approve` que lorsque le résultat de l'outil indique
    que les approbations par chat sont indisponibles ou que l'approbation manuelle est le seul chemin.
    Si le runtime d'approbation natif Discord n'est pas actif, OpenClaw garde l'invite
    déterministe locale `/approve <id> <decision>` visible. Si le
    runtime est actif mais qu'une carte native ne peut pas être livrée à aucune cible,
    OpenClaw envoie un avis de repli dans le même chat avec la commande exacte `/approve`
    de l'approbation en attente.

    L'authentification Gateway et la résolution des approbations suivent le contrat client partagé Gateway (les IDs `plugin:` sont résolus via `plugin.approval.resolve` ; les autres IDs via `exec.approval.resolve`). Les approbations expirent après 30 minutes par défaut.

    Voir [Approbations Exec](/fr/tools/exec-approvals).

  </Accordion>
</AccordionGroup>

## Outils et portails d'action

Les actions de message Discord incluent la messagerie, l'administration de channel, la modération, la présence et les actions de métadonnées.

Exemples principaux :

- messagerie : `sendMessage`, `readMessages`, `editMessage`, `deleteMessage`, `threadReply`
- réactions : `react`, `reactions`, `emojiList`
- modération : `timeout`, `kick`, `ban`
- présence : `setPresence`

L'action `event-create` accepte un paramètre `image` facultatif (URL ou chemin de fichier local) pour définir l'image de couverture de l'événement planifié.

Les portails d'action se trouvent sous `channels.discord.actions.*`.

Comportement du portail par défaut :

| Groupe d'actions                                                                                                                                                         | Par défaut |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | activé     |
| rôles                                                                                                                                                                    | désactivé  |
| modération                                                                                                                                                               | désactivé  |
| présence                                                                                                                                                                 | désactivé  |

## Interface utilisateur des composants v2

OpenClaw utilise les composants Discord v2 pour les approbations d'exécution et les marqueurs inter-contextes. Les actions de message Discord peuvent également accepter `components` pour une interface utilisateur personnalisée (avancé ; nécessite de construire une charge utile de composant via l'outil Discord), tandis que les `embeds` hérités restent disponibles mais ne sont pas recommandés.

- `channels.discord.ui.components.accentColor` définit la couleur d'accentuation utilisée par les conteneurs de composants Discord (hex).
- Définir par compte avec `channels.discord.accounts.<id>.ui.components.accentColor`.
- Les `embeds` sont ignorés lorsque les composants v2 sont présents.
- Les aperçus d'URL simples sont supprimés par défaut. Définissez `suppressEmbeds: false` sur une action de message lorsqu'un lien sortant unique doit s'étendre.

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

## Voix

Discord dispose de deux surfaces vocales distinctes : les **salons vocaux** en temps réel (conversations continues) et les **pièces jointes de messages vocaux** (le format d'aperçu de forme d'onde). La passerelle prend en charge les deux.

### Salons vocaux

Liste de contrôle de la configuration :

1. Activez l'intention de contenu de message dans le portail développeur Discord.
2. Activez l'intention des membres du serveur lorsque des listes d'autorisation de rôles/utilisateurs sont utilisées.
3. Invitez le bot avec les portées `bot` et `applications.commands`.
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

Exemple de jonction automatique :

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

Remarques :

- `voice.tts` remplace `messages.tts` pour la lecture vocale `stt-tts` uniquement. Les modes en temps réel utilisent `voice.realtime.voice`.
- `voice.mode` contrôle le chemin de la conversation. La valeur par défaut est `agent-proxy` : une interface vocale en temps réel gère le timing des tours, les interruptions et la lecture, délègue le travail substantiel à l'agent OpenClaw acheminé via `openclaw_agent_consult`, et traite le résultat comme une invite Discord saisie par ce locuteur. `stt-tts` conserve l'ancien flux STT en lot plus TTS. `bidi` permet au modèle en temps réel de converser directement tout en exposant `openclaw_agent_consult` pour le cerveau OpenClaw.
- `voice.agentSession`OpenClaw contrôle quelle conversation OpenClaw reçoit les tours de voix. Laissez-le non défini pour la session propre au canal vocal, ou définissez `{ mode: "target", target: "channel:<text-channel-id>" }`Discord pour faire agir le canal vocal comme une extension microphone/haut-parleur d'une session de canal textuel Discord existante telle que `#maintainers`.
- `voice.model`OpenClawDiscord remplace le cerveau de l'agent OpenClaw pour les réponses vocales Discord et les consultations en temps réel. Laissez-le non défini pour hériter du modèle de l'agent acheminé. Il est distinct de `voice.realtime.model`.
- `agent-proxy` achemine la parole via `discord-voice`, ce qui préserve l'autorisation normale de propriétaire/tool pour l'intervenant et la session cible, mais masque l'outil `tts`Discord de l'agent car la voix Discord possède la lecture. Par défaut, `agent-proxy` accorde à la consultation un accès complet aux outils équivalent à celui du propriétaire pour les intervenants propriétaires (`voice.realtime.toolPolicy: "owner"`) et préfère fortement consulter l'agent OpenClaw avant les réponses substantielles (`voice.realtime.consultPolicy: "always"`). Dans ce mode `always` par défaut, la couche temps réel ne prononce pas automatiquement de texte de remplissage avant la réponse de la consultation ; elle capture et transcrit la parole, puis prononce la réponse OpenClaw acheminée. Si plusieurs réponses de consultation forcée se terminent alors que Discord lit toujours la première réponse, les réponses ultérieures de parole exacte sont mises en file d'attente jusqu'à ce que la lecture soit inactive, au lieu de remplacer la parole en milieu de phrase.
- En mode `stt-tts`, STT utilise `tools.media.audio` ; `voice.model` n'affecte pas la transcription.
- Dans les modes temps réel, `voice.realtime.provider`, `voice.realtime.model` et `voice.realtime.voice` configurent la session audio temps réel. Pour OpenAI Realtime 2 plus le cerveau Codex, utilisez `voice.realtime.model: "gpt-realtime-2"` et `voice.model: "openai-codex/gpt-5.5"`.
- Le fournisseur temps réel OpenAI accepte les noms d'événements actuels de Realtime 2 et les alias compatibles avec l'ancien Codex pour les événements audio de sortie et de transcription, ainsi les instantanés de fournisseurs compatibles peuvent diverger sans couper l'audio de l'assistant.
- `voice.realtime.bargeIn`Discord contrôle si les événements de début de parole Discord interrompent la lecture en temps réel active. Si non défini, il suit le paramètre d'interruption audio d'entrée du fournisseur temps réel.
- `voice.realtime.minBargeInAudioEndMs` contrôle la durée minimale de lecture de l'assistant avant qu'une interruption en temps réel d'OpenAI ne tronque l'audio. Par défaut : `250`. Définissez `0` pour une interruption immédiate dans les pièces peu réverbérantes, ou augmentez-le pour les configurations de haut-parleurs avec des échos.
- Pour une voix OpenAI sur la lecture Discord, définissez OpenAIDiscord`voice.tts.provider: "openai"` et choisissez une voix synthèse vocale sous `voice.tts.openai.voice` ou `voice.tts.providers.openai.voice`. `cedar`OpenAI est un bon choix de voix masculine sur le modèle actuel de synthèse vocale OpenAI.
- Les substitutions par channel Discord Discord`systemPrompt` s'appliquent aux tours de transcription vocale pour ce canal vocal.
- Les tours de transcription vocale dérivent le statut de propriétaire du Discord`allowFrom` Discord (ou `dm.allowFrom`); les orateurs non propriétaires ne peuvent pas accéder aux outils réservés au propriétaire (par exemple `gateway` et `cron`).
- Discord voice est en option pour les configurations texte uniquement ; définissez `channels.discord.voice.enabled=true` (ou gardez un bloc `channels.discord.voice` existant) pour activer les commandes `/vc`, le runtime vocal et l'intention de passerelle `GuildVoiceStates`.
- `channels.discord.intents.voiceStates` peut remplacer explicitement l'abonnement à l'intention d'état vocal. Laissez-le non défini pour que l'intention suive l'activation effective de la voix.
- Si `voice.autoJoin` contient plusieurs entrées pour la même guilde, OpenClaw rejoint le dernier canal configuré pour cette guilde.
- `voice.allowedChannels` est une liste blanche de résidence facultative. Laissez-la non définie pour autoriser `/vc join` dans n'importe quel channel vocal Discord autorisé. Lorsqu'elle est définie, `/vc join`, l'auto-connexion au démarrage et les déplacements de l'état vocal du bot sont restreints aux entrées `{ guildId, channelId }` répertoriées. Définissez-la sur un tableau vide pour refuser toutes les connexions vocales Discord. Si Discord déplace le bot en dehors de la liste blanche, OpenClaw quitte ce channel et rejoint la cible d'auto-connexion configurée lorsqu'une est disponible.
- `voice.daveEncryption` et `voice.decryptionFailureTolerance` sont transmis aux options de connexion `@discordjs/voice`.
- Les valeurs par défaut de `@discordjs/voice` sont `daveEncryption=true` et `decryptionFailureTolerance=24` si non définies.
- OpenClaw utilise par défaut le décodeur pure-JS `opusscript` pour la réception vocale Discord. Le package natif optionnel `@discordjs/opus` est ignoré par la politique d'installation pnpm du dépôt, afin que les installations normales, les voies Docker et les tests sans rapport ne compilent pas un module natif. Les hôtes dédiés aux performances vocales peuvent opter pour `OPENCLAW_DISCORD_OPUS_DECODER=native` après avoir installé le module natif.
- `voice.connectTimeoutMs` contrôle l'attente initiale `@discordjs/voice` Ready pour `/vc join` et les tentatives de jointure automatique. Valeur par défaut : `30000`.
- `voice.reconnectGraceMs` contrôle la durée pendant laquelle OpenClaw attend qu'une session vocale déconnectée commence à se reconnecter avant de la détruire. Valeur par défaut : `15000`.
- En mode `stt-tts`, la lecture vocale ne s'arrête pas simplement parce qu'un autre utilisateur commence à parler. Pour éviter les boucles de rétroaction, OpenClaw ignore la nouvelle capture vocale pendant la lecture du TTS ; parlez après la fin de la lecture pour le tour suivant. Les modes temps réel transmettent les débuts de parole en tant que signaux d'interruption au fournisseur temps réel.
- Dans les modes temps réel, l'écho des haut-parleurs vers un micro ouvert peut ressembler à une intervention (barge-in) et interrompre la lecture. Pour les salons Discord sujets à de forts échos, définissez Discord`voice.realtime.providers.openai.interruptResponseOnInputAudio: false`OpenAI pour empêcher OpenAI d'interrompre automatiquement sur l'audio entrant. Ajoutez `voice.realtime.bargeIn: true`DiscordOpenAI si vous souhaitez toujours que les événements de début de parole Discord interrompent la lecture active. Le pont temps réel OpenAI ignore les raccourcissements de lecture plus courts que `voice.realtime.minBargeInAudioEndMs`Discord comme étant probablement de l'écho/du bruit et les enregistre comme ignorés au lieu d'effacer la lecture Discord.
- `voice.captureSilenceGraceMs` contrôle la durée d'attente d'OpenClaw après que Discord a signalé qu'un intervenant s'est arrêté avant de finaliser ce segment audio pour la STT. Par défaut : `2500` ; augmentez cette valeur si Discord divise les pauses normales en transcriptions partielles hachées.
- Lorsque ElevenLabs est le fournisseur TTS sélectionné, la lecture vocale Discord utilise le TTS en continu et commence à partir du flux de réponse du fournisseur. Les fournisseurs ne prenant pas en charge le flux continu reviennent au chemin de fichier temporaire synthétisé.
- OpenClaw surveille également les échecs de déchiffrement à la réception et récupère automatiquement en quittant/rejoignant le canal vocal après des échecs répétés sur une courte période.
- Si les journaux de réception affichent répétitivement `DecryptionFailed(UnencryptedWhenPassthroughDisabled)` après la mise à jour, collectez un rapport sur les dépendances et les journaux. La ligne `@discordjs/voice` groupée inclut la correction de remplissage en amont de la discord.js PR #11449, qui a clos le problème discord.js #11419.
- Les événements de réception `The operation was aborted` sont attendus lorsqu'OpenClaw finalise un segment de locuteur capturé ; ce sont des diagnostics détaillés, et non des avertissements.
- Les journaux vocaux détaillés de Discord incluent un aperçu de transcription STT sur une ligne bornée pour chaque segment de locuteur accepté, de sorte que le débogage montre à la fois le côté utilisateur et le côté réponse de l'agent sans vider du texte de transcription non borné.
- En mode `agent-proxy`, le repli forcé à la consultation ignore les fragments de transcription probablement incomplets, tels que le texte se terminant par `...` ou un connecteur final comme `and`, ainsi que les fins de messages évidentes non actionnables comme « je reviens tout de suite » ou « au revoir ». Les journaux affichent `forced agent consult skipped reason=...` lorsque cela empêche une réponse mise en file d'attente périmée.

Configuration native d'opus pour les extraits de source :

```bash
pnpm install
mise exec node@22 -- pnpm discord:opus:install
```

Utilisez Node 22 pour le gateway lorsque vous souhaitez le module natif précompilé amont macOS arm64. Si vous utilisez un autre runtime Node, le programme d'installation optionnel peut avoir besoin d'une chaîne d'outils de compilation source locale `node-gyp`.

Après avoir installé le module natif, démarrez le Gateway avec :

```bash
OPENCLAW_DISCORD_OPUS_DECODER=native pnpm gateway:watch
```

Les journaux vocaux détaillés doivent afficher `discord voice: opus decoder: @discordjs/opus`. Sans l'acceptation via l'environnement, ou si le module natif est manquant ou ne peut pas être chargé sur l'hôte, OpenClaw enregistre `discord voice: opus decoder: opusscript` et continue de recevoir la voix via la solution de repli pure-JS.

Pipeline STT plus TTS :

- La capture PCM Discord est convertie en un fichier temporaire WAV.
- `tools.media.audio` gère la STT, par exemple `openai/gpt-4o-mini-transcribe`.
- La transcription est envoyée via l'entrée et le routage Discord tandis que le LLM de réponse s'exécute avec une stratégie de sortie vocale qui masque l'outil `tts` de l'agent et demande du texte renvoyé, car la voix Discord gère la lecture TTS finale.
- `voice.model`LLM, lorsqu'il est défini, remplace uniquement le LLM de réponse pour ce tour de canal vocal.
- `voice.tts` est fusionné par-dessus `messages.tts` ; les fournisseurs compatibles avec le streaming alimentent directement le lecteur, sinon le fichier audio résultant est lu dans le canal rejoint.

Exemple de session de canal vocal agent-proxy par défaut :

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        model: "openai-codex/gpt-5.5",
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

Sans bloc `voice.agentSession`, chaque canal vocal obtient sa propre session OpenClaw routée. Par exemple, `/vc join channel:234567890123456789` communique avec la session de ce canal vocal Discord. Le modèle temps réel n'est que la interface vocale ; les demandes substantielles sont transmises à l'agent OpenClaw configuré. Si le modèle temps réel produit une transcription finale sans appeler l'outil de consultation, OpenClaw force la consultation en solution de repli afin que le comportement par défaut reste similaire à une conversation avec l'agent.

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

Exemple temps réel bidirectionnel :

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

Vocale en tant qu'extension d'une session de canal Discord existante :

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

En mode `agent-proxy`, le bot rejoint le canal vocal configuré, mais les tours de l'agent OpenClaw utilisent la session et l'agent acheminés normaux du canal cible. La session vocale en temps réel prononce le résultat renvoyé dans le canal vocal. L'agent superviseur peut toujours utiliser les outils de message normaux en fonction de sa stratégie d'outils, y compris l'envoi d'un message Discord distinct si c'est la bonne action.

Formes cibles utiles :

- `target: "channel:123456789012345678"` transite par une session de canal texte Discord.
- `target: "123456789012345678"` est traité comme une cible de canal.
- `target: "dm:123456789012345678"` ou `target: "user:123456789012345678"` transite par cette session de message direct.

Exemple OpenAI Realtime riche en échos :

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

Utilisez ceci lorsque le modèle entend sa propre lecture Discord via un microphone ouvert, mais que vous souhaitez toujours l'interrompre en parlant. OpenClaw empêche OpenAI d'interrompre automatiquement sur l'audio d'entrée brut, tandis que DiscordOpenClawOpenAI`bargeIn: true`DiscordOpenAI permet aux événements de début de locuteur Discord et à l'audio de locuteur déjà actif d'annuler les réponses en temps réel actives avant que le prochain tour capturé n'atteigne OpenAI. Les signaux d'interruption très précoces avec `audioEndMs` en dessous de `minBargeInAudioEndMs` sont traités comme probablement des échos/bruits et ignorés pour que le modèle ne se coupe pas à la première trame de lecture.

Journaux vocaux attendus :

- À l'arrivée : `discord voice: joining ... voiceSession=... supervisorSession=... agentSessionMode=... voiceModel=... realtimeModel=...`
- Au démarrage en temps réel : `discord voice: realtime bridge starting ... autoRespond=false interruptResponse=false bargeIn=false minBargeInAudioEndMs=...`
- Sur l'audio du haut-parleur : `discord voice: realtime speaker turn opened ...`, `discord voice: realtime input audio started ... outputAudioMs=... outputActive=...` et `discord voice: realtime speaker turn closed ... chunks=... discordBytes=... realtimeBytes=... interruptedPlayback=...`
- Sur la parole périmée ignorée : `discord voice: realtime forced agent consult skipped reason=incomplete-transcript ...` ou `reason=non-actionable-closing ...`
- Sur l'achèvement de la réponse en temps réel : `discord voice: realtime audio playback finishing reason=response.done ... audioMs=... chunks=...`
- Sur l'arrêt/réinitialisation de la lecture : `discord voice: realtime audio playback stopped reason=... audioMs=... elapsedMs=... chunks=...`
- Sur la consultation en temps réel : `discord voice: realtime consult requested ... voiceSession=... supervisorSession=... question=...`
- Sur la réponse de l'agent : `discord voice: agent turn answer ...`
- Sur la parole exacte en file d'attente : `discord voice: realtime exact speech queued ... queued=... outputAudioMs=... outputActive=...`, suivi de `discord voice: realtime exact speech dequeued reason=player-idle ...`
- Sur la détection d'interruption (barge-in) : `discord voice: realtime barge-in detected source=speaker-start ...` ou `discord voice: realtime barge-in detected source=active-speaker-audio ...`, suivi de `discord voice: realtime barge-in requested reason=... outputAudioMs=... outputActive=...`
- Sur l'interruption en temps réel : `discord voice: realtime model interrupt requested client:response.cancel reason=barge-in`, suivi de `discord voice: realtime model audio truncated client:conversation.item.truncate reason=barge-in audioEndMs=...` ou `discord voice: realtime model interrupt confirmed server:response.done status=cancelled ...`
- Sur l'écho/bruit ignoré : `discord voice: realtime model interrupt ignored client:conversation.item.truncate.skipped reason=barge-in audioEndMs=0 minAudioEndMs=250`
- Sur l'interruption désactivée : `discord voice: realtime capture ignored during playback (barge-in disabled) ...`
- Sur la lecture inactive : `discord voice: realtime barge-in ignored reason=... outputActive=false ... playbackChunks=0`

Pour déboguer l'audio coupé, lisez les journaux vocaux en temps réel comme une chronologie :

1. `realtime audio playback started` signifie que Discord a commencé à lire l'audio de l'assistant. Le pont commence à compter les segments de sortie de l'assistant, les octets PCM Discord, les octets en temps réel du provider et la durée de l'audio synthétisé à partir de ce point.
2. `realtime speaker turn opened` marque l'activation d'un haut-parleur Discord. Si la lecture est déjà active et que `bargeIn` est activé, cela peut être suivi de `barge-in detected source=speaker-start`.
3. `realtime input audio started` marque la première trame audio réelle reçue pour ce tour de parole. `outputActive=true` ou une valeur `outputAudioMs` non nulle ici signifie que le microphone envoie une entrée alors que la lecture de l'assistant est toujours active.
4. `barge-in detected source=active-speaker-audio` signifie que OpenClaw a détecté une audio en direct du locuteur pendant que la lecture de l'assistant était active. C'est utile pour distinguer une véritable interruption d'un événement de début de parole Discord sans audio utile.
5. `barge-in requested reason=...` signifie que OpenClaw a demandé au fournisseur en temps réel d'annuler ou de tronquer la réponse active. Il inclut `outputAudioMs`, `outputActive` et `playbackChunks` afin que vous puissiez voir quelle quantité d'audio de l'assistant avait réellement été lue avant l'interruption.
6. `realtime audio playback stopped reason=...` est le point de réinitialisation de lecture Discord local. La raison indique qui a arrêté la lecture : `barge-in`, `player-idle`, `provider-clear-audio`, `forced-agent-consult`, `stream-close`, ou `session-close`.
7. `realtime speaker turn closed` résume le tour d'entrée capturé. `chunks=0` ou `hasAudio=false` signifie que le tour de parole s'est ouvert mais qu'aucune audio utilisable n'a atteint le pont temps réel. `interruptedPlayback=true` signifie que le tour d'entrée chevauchait la sortie de l'assistant et a déclenché la logique d'interruption.

Champs utiles :

- `outputAudioMs` : durée de l'audio de l'assistant générée par le provider temps réel avant la ligne de journal.
- `audioMs` : durée audio de l'assistant comptée par OpenClaw avant l'arrêt de la lecture.
- `elapsedMs` : temps écoulé entre l'ouverture et la fermeture du flux de lecture ou du tour de parole.
- `discordBytes` : octets PCM stéréo 48 kHz envoyés ou reçus depuis la voix Discord.
- `realtimeBytes` : octets PCM au format du provider envoyés ou reçus depuis le provider en temps réel.
- `playbackChunks` : morceaux audio de l'assistant transférés à Discord pour la réponse active.
- `sinceLastAudioMs` : écart entre la dernière trame audio du locuteur capturée et la fin du tour de parole.

Motifs courants :

- Une coupure immédiate avec `source=active-speaker-audio`, un petit `outputAudioMs` et le même utilisateur à proximité indique généralement que l'écho du haut-parleur entre dans le micro. Augmentez `voice.realtime.minBargeInAudioEndMs`, baissez le volume du haut-parleur, utilisez un casque ou définissez `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`.
- `source=speaker-start` suivi de `speaker turn closed ... hasAudio=false` signifie que Discord a signalé un début de parole mais qu'aucun audio n'a atteint OpenClaw. Cela peut être un événement vocal Discord transitoire, le comportement du seuil de bruit ou un client activant brièvement le micro.
- `audio playback stopped reason=stream-close` sans une interruption à proximité ou `provider-clear-audio` signifie que le flux de lecture local Discord s'est terminé de manière inattendue. Vérifiez les journaux du provider précédent et du lecteur Discord.
- `capture ignored during playback (barge-in disabled)` signifie que OpenClaw a intentionnellement ignoré l'entrée alors que l'audio de l'assistant était actif. Activez `voice.realtime.bargeIn` si vous souhaitez que la parole interrompe la lecture.
- `barge-in ignored ... outputActive=false` signifie que Discord ou le VAD du fournisseur a détecté de la parole, mais OpenClaw n'avait aucune lecture active à interrompre. Cela ne doit pas couper l'audio.

Les identifiants sont résolus par composant : auth de route LLM pour `voice.model`, auth STT pour `tools.media.audio`, auth TTS pour `messages.tts`/`voice.tts`, et auth du fournisseur temps réel pour `voice.realtime.providers` ou la configuration d'auth normale du fournisseur.

### Messages vocaux

Les messages vocaux Discord affichent un aperçu de la forme d'onde et nécessitent de l'audio OGG/Opus. OpenClaw génère la forme d'onde automatiquement, mais a besoin de DiscordOpenClaw`ffmpeg` et de `ffprobe` sur l'hôte de la passerelle pour inspecter et convertir.

- Fournissez un **chemin d'accès local** (les URL sont rejetées).
- Omettez le contenu texte (Discord rejette le texte + le message vocal dans la même charge utile).
- Tout format audio est accepté ; OpenClaw convertit en OGG/Opus si nécessaire.

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## Dépannage

<AccordionGroup>
  <Accordion title="Utilisation d'intentions non autorisées ou le bot ne voit aucun message de guilde">

    - activer l'intention de contenu de message (Message Content Intent)
    - activer l'intention de membres du serveur (Server Members Intent) lorsque vous dépendez de la résolution d'utilisateur/membre
    - redémarrer la passerelle après avoir modifié les intentions

  </Accordion>

  <Accordion title="Guild messages blocked unexpectedly">

    - vérifier `groupPolicy`
    - vérifier la liste blanche de la guilde sous `channels.discord.guilds`
    - si la carte `channels` de la guilde existe, seuls les channels répertoriés sont autorisés
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

    - `groupPolicy="allowlist"` sans liste blanche de guilde/channel correspondante
    - `requireMention` configuré au mauvais endroit (doit être sous `channels.discord.guilds` ou l'entrée de channel)
    - expéditeur bloqué par la liste blanche `users` de la guilde/channel

  </Accordion>

  <Accordion title="DiscordTours Discord de longue durée ou réponses en double">

    Journaux typiques :

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`Discord

    Contrôles de la file d'attente de la passerelle Discord :

    - compte unique : `channels.discord.eventQueue.listenerTimeout`
    - multi-compte : `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`DiscordDiscordDiscord
    - cela contrôle uniquement le travail d'écouteur de la passerelle Discord, et non la durée de vie du tour de l'agent

    Discord n'applique pas de délai d'attente propriétaire du channel aux tours d'agent mis en file d'attente. Les écouteurs de messages transfèrent immédiatement, et les exécutions Discord mises en file d'attente préservent l'ordre par session jusqu'à ce que le cycle de vie de la session/tool/runtime se termine ou interrompe le travail.

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

  <Accordion title="GatewayAvertissements de délai d'attente pour la recherche des métadonnées du Gateway"OpenClawDiscord>
    OpenClaw récupère les métadonnées `/gateway/bot`Discord de Discord avant de se connecter. En cas d'échecs transitoires, le système revient à l'URL du Gateway par défaut de Discord et ces incidents sont limités en débit dans les journaux.

    Paramètres de délai d'attente des métadonnées :

    - single-account : `channels.discord.gatewayInfoTimeoutMs`
    - multi-account : `channels.discord.accounts.<accountId>.gatewayInfoTimeoutMs`
    - repli env lorsque la config n'est pas définie : `OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS`
    - par défaut : `30000` (30 secondes), max : `120000`

  </Accordion>

  <Accordion title="GatewayRedémarrages après expiration du délai d'attente READY de Gateway"OpenClawDiscord>
    OpenClaw attend l'événement de gateway `READY` de Discord lors du démarrage et après les reconnexions en cours d'exécution. Les configurations multi-comptes avec un décalage de démarrage peuvent nécessiter une fenêtre de démarrage READY plus longue que celle par défaut.

    Paramètres de délai d'expiration READY :

    - démarrage monocompte : `channels.discord.gatewayReadyTimeoutMs`
    - démarrage multicompte : `channels.discord.accounts.<accountId>.gatewayReadyTimeoutMs`
    - repli d'environnement au démarrage si la config n'est pas définie : `OPENCLAW_DISCORD_READY_TIMEOUT_MS`
    - défaut au démarrage : `15000` (15 secondes), max : `120000`
    - exécution monocompte : `channels.discord.gatewayRuntimeReadyTimeoutMs`
    - exécution multicompte : `channels.discord.accounts.<accountId>.gatewayRuntimeReadyTimeoutMs`
    - repli d'environnement à l'exécution si la config n'est pas définie : `OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`
    - défaut à l'exécution : `30000` (30 secondes), max : `120000`

  </Accordion>

  <Accordion title="Écarts d'audit des permissions">
    Les vérifications de permission `channels status --probe` ne fonctionnent que pour les ID de canal numériques.

    Si vous utilisez des clés slug, la correspondance lors de l'exécution peut toujours fonctionner, mais la sonde ne peut pas vérifier entièrement les permissions.

  </Accordion>

  <Accordion title="Problèmes de DM et d'appariement">

    - DM désactivé : `channels.discord.dm.enabled=false`
    - Stratégie de DM désactivée : `channels.discord.dmPolicy="disabled"` (ancien : `channels.discord.dm.policy`)
    - en attente de l'approbation d'appariement en mode `pairing`

  </Accordion>

  <Accordion title="Bot to bot loops">
    Par défaut, les messages créés par des bots sont ignorés.

    Si vous définissez `channels.discord.allowBots=true`, utilisez des règles de mention strictes et des listes d'autorisation pour éviter les boucles.
    Privilégiez `channels.discord.allowBots="mentions"` pour n'accepter que les messages de bots qui mentionnent le bot.

    OpenClaw inclut également une [protection commune contre les boucles de bots](/fr/channels/bot-loop-protection). Chaque fois que `allowBots` laisse les messages créés par des bots atteindre la répartition, Discord mappe l'événement entrant sur des faits `(account, channel, bot pair)` et le garde de paire générique supprime la paire après qu'elle a dépassé le budget d'événements configuré. Le garde empêche les boucles incontrôlables entre deux bots qui devaient auparavant être arrêtées par les limites de débit de Discord ; cela n'affecte pas les déploiements à bot unique ou les réponses ponctuelles de bots qui restent dans le budget.

    Paramètres par défaut (actifs lorsque `allowBots` est défini) :

    - `maxEventsPerWindow: 20` -- une paire de bots peut échanger 20 messages dans la fenêtre glissante
    - `windowSeconds: 60` -- longueur de la fenêtre glissante
    - `cooldownSeconds: 60` -- une fois le budget dépassé, chaque message supplémentaire de bot à bot dans les deux sens est supprimé pendant une minute

    Configurez la valeur par défaut commune une fois sous `channels.defaults.botLoopProtection`, puis redéfinissez Discord lorsqu'un workflow légitime a besoin de plus de marge. La priorité est :

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
            // Lets Molty write "@Mantis" and send a real Discord mention.
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

    - garder OpenClaw à jour (`openclaw update`) pour que la logique de récupération de réception vocale Discord soit présente
    - confirmer `channels.discord.voice.daveEncryption=true` (par défaut)
    - commencer à partir de `channels.discord.voice.decryptionFailureTolerance=24` (en amont par défaut) et régler uniquement si nécessaire
    - surveiller les journaux pour :
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - si les échocs persistent après le rejoint automatique, collectez les journaux et comparez-les avec l'historique de réception DAVE en amont dans [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) et [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449)

  </Accordion>
</AccordionGroup>

## Référence de configuration

Référence principale : [Référence de configuration - Discord](/fr/gateway/config-channels#discord).

<Accordion title="Champs importants Discord"%PH:JSX_ATTR:165:8a331fdd%%>

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
- fonctionnalités : `threadBindings`, `bindings[]` de premier niveau (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents`, `heartbeat`, `responsePrefix`

</Accordion>

## Sécurité et opérations

- Traitez les jetons de bot comme des secrets (`DISCORD_BOT_TOKEN` préférés dans les environnements supervisés).
- Accordez les permissions Discord avec le minimum de privilèges.
- Si le déploiement/l'état des commandes est périmé, redémarrez la passerelle et revérifiez avec `openclaw channels status --probe`.

## Connexes

<CardGroup cols={2}>
  <Card title="Appariement" icon="link" href="/fr/channels/pairing">
    Associer un utilisateur Discord à la passerelle.
  </Card>
  <Card title="Groupes" icon="users" href="/fr/channels/groups">
    Comportement du chat de groupe et de la liste d'autorisation.
  </Card>
  <Card title="Channel routing" icon="route" href="/fr/channels/channel-routing">
    Acheminez les messages entrants vers les agents.
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
