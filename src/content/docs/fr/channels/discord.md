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

Vous devrez créer une nouvelle application avec un bot, ajouter le bot à votre serveur et l'apparier à OpenClaw. Nous vous recommandons d'ajouter votre bot à votre propre serveur privé. Si vous n'en avez pas encore, [créez-en un d'abord](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server) (choisissez **Créer le mien > Pour moi et mes amis**).

<Steps>
  <Step title="Créer une application et un bot Discord">
    Allez sur le [portail des développeurs Discord](https://discord.com/developers/applications) et cliquez sur **New Application**. Nommez-le quelque chose comme "OpenClaw".

    Cliquez sur **Bot** dans la barre latérale. Définissez le **Username** selon le nom de votre agent OpenClaw.

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

  <Step title="Generate an invite URL and add the bot to your server">
    Cliquez sur **OAuth2** dans la barre latérale. Vous allez générer une URL d'invitation avec les bonnes permissions pour ajouter le bot à votre serveur.

    Faites défiler vers le bas jusqu'à **OAuth2 URL Generator** et activez :

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
      - Add Reactions (optional)

    Il s'agit de l'ensemble de base pour les channels de texte normaux. Si vous prévoyez de publier dans des fils de discussion Discord, y compris les workflows de channel de forum ou média qui créent ou poursuivent un fil, activez également **Send Messages in Threads**.
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

  <Step title="Définissez votre jeton de bot de manière sécurisée (ne l'envoyez pas dans le chat)">
    Le jeton de votre bot Discord est un secret (comme un mot de passe). Définissez-le sur la machine exécutant OpenClaw avant de messager votre agent.

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

    Si OpenClaw s'exécute déjà en tant que service d'arrière-plan, redémarrez-le via l'application Mac OpenClaw ou en arrêtant et en redémarrant le processus `openclaw gateway run`.
    Pour les installations de services gérés, exécutez `openclaw gateway install` à partir d'un shell où `DISCORD_BOT_TOKEN` est présent, ou stockez la variable dans `~/.openclaw/.env`, afin que le service puisse résoudre le SecretRef de l'environnement après redémarrage.
    Si votre hôte est bloqué ou limité par le système de recherche de démarrage d'application de Discord, définissez l'ID d'application/client Discord à partir du portail des développeurs afin que le démarrage puisse ignorer cet appel REST. Utilisez `channels.discord.applicationId` pour le compte par défaut, ou `channels.discord.accounts.<accountId>.applicationId` lorsque vous exécutez plusieurs bots Discord.

  </Step>

  <Step title="OpenClawConfigurer OpenClaw et jumeler">

    <Tabs>
      <Tab title="Demander à votre agent"OpenClawTelegramDiscordCLIDiscordDiscord>
        Discutez avec votre agent OpenClaw sur n'importe quel canal existant (par exemple, Telegram) et dites-lui. Si Discord est votre premier canal, utilisez plutôt l'onglet CLI / config.

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

        Fallback d'environnement pour le compte par défaut :

```bash
DISCORD_BOT_TOKEN=...
```

        Pour une configuration scriptée ou à distance, écrivez le même bloc JSON5 avec `openclaw config patch --file ./discord.patch.json5 --dry-run` puis relancez sans `--dry-run`. Les valeurs en texte brut `token` sont prises en charge. Les valeurs SecretRef sont également prises en charge pour `channels.discord.token` sur les fournisseurs env/file/exec. Voir [Gestion des secrets](/fr/gateway/secretsDiscord).

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
  La résolution des jetons tient compte du compte. Les valeurs des jetons de configuration prévalent sur la solution de repli de l'environnement. `DISCORD_BOT_TOKEN`DiscordOpenClaw n'est utilisé que pour le compte par défaut. Si deux comptes Discord activés résolvent vers le même jeton de bot, OpenClaw ne démarre qu'un seul moniteur de passerelle pour ce jeton. Un jeton issu de la configuration
  prévaut sur la solution de repli de l'environnement par défaut ; sinon, le premier compte activé l'emporte et le compte en double est signalé comme désactivé. Pour les appels sortants avancés (outil de message/actions de channel), un `token` explicite par appel est utilisé pour cet appel. Cela s'applique aux actions d'envoi et de style lecture/sonde (par exemple
  lecture/recherche/récupération/fil/épingles/autorisations). Les paramètres de stratégie/réessai du compte proviennent toujours du compte sélectionné dans l'instantané d'exécution actif.
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

  <Step title="Allow responses without @mention">
    Par défaut, votre agent ne répond dans les channels de guilde que lorsqu'il est @mentionné. Pour un serveur privé, vous souhaitez probablement qu'il réponde à chaque message.

    Dans les channels de guilde, les réponses finales normales de l'assistant restent privées par défaut. Les visibles Discord output doivent être envoyés explicitement avec l'outil `message`, afin que l'agent puisse rester en observation par défaut et ne poster que lorsqu'il décide qu'une réponse dans le channel est utile.

    Cela signifie que le model sélectionné doit appeler de manière fiable des outils. Si Discord affiche une activité de frappe et que les journaux montrent une utilisation de jetons mais aucun message posté, vérifiez le journal de session pour le texte de l'assistant avec `didSendViaMessagingTool: false`. Cela signifie que le model a produit une réponse finale privée au lieu d'appeler `message(action=send)`. Passez à un model plus robuste pour l'appel d'outils, ou utilisez la configuration ci-dessous pour restaurer l'ancien comportement des réponses finales automatiques.

    <Tabs>
      <Tab title="Ask your agent">
        > "Allow my agent to respond on this server without having to be @mentioned"
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

        Pour restaurer les réponses finales automatiques héritées pour les salons de groupe/canal, définissez `messages.groupChat.visibleReplies: "automatic"`.

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

Les commandes slash `/model` et `/models` ouvrent un sélecteur de modèle interactif avec des menus déroulants pour le fournisseur, le modèle et le runtime compatible, ainsi qu'une étape de soumission. `/models add` est obsolète et renvoie désormais un message d'obsolescence au lieu d'enregistrer des modèles depuis le chat. La réponse du sélecteur est éphémère et seul l'utilisateur qui l'a invoqué peut l'utiliser. Les menus de sélection Discord sont limités à 25 options, ajoutez donc des entrées `provider/*` à `agents.defaults.models` lorsque vous souhaitez que le sélecteur n'affiche les modèles découverts dynamiquement que pour les fournisseurs sélectionnés tels que `openai-codex` ou `vllm`.

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
    `channels.discord.dmPolicy` contrôle l'accès par DM. `channels.discord.allowFrom` est la liste d'autorisation (allowlist) canonique pour les DM.

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `channels.discord.allowFrom` inclue `"*"`)
    - `disabled`

    Si la politique de DM n'est pas ouverte, les utilisateurs inconnus sont bloqués (ou invités à s'associer en mode `pairing`).

    Priorité multi-compte :

    - `channels.discord.accounts.default.allowFrom` s'applique uniquement au compte `default`.
    - Pour un compte, `allowFrom` a priorité sur l'ancien `dm.allowFrom`.
    - Les comptes nommés héritent de `channels.discord.allowFrom` lorsque leur propre `allowFrom` et l'ancien `dm.allowFrom` ne sont pas définis.
    - Les comptes nommés n'héritent pas de `channels.discord.accounts.default.allowFrom`.

    L'ancien `channels.discord.dm.policy` et `channels.discord.dm.allowFrom` sont toujours lus pour compatibilité. `openclaw doctor --fix` les migre vers `dmPolicy` et `allowFrom` lorsqu'il peut le faire sans modifier l'accès.

    Format de cible DM pour la livraison :

    - `user:<id>`
    - Mention `<@id>`

    Les ID numériques bruts sont normalement résolus en tant qu'ID de channel lorsqu'un channel par défaut est actif, mais les ID répertoriés dans le `allowFrom` effectif du compte sont traités comme cibles de DM d'utilisateur pour compatibilité.

  </Tab>

  <Tab title="Groupes d'accès">
    Les Discord DMs et l'autorisation des commandes texte peuvent utiliser des entrées `accessGroup:<name>` dynamiques dans `channels.discord.allowFrom`.

    Les noms des groupes d'accès sont partagés entre les canaux de messages. Utilisez `type: "message.senders"` pour un groupe statique dont les membres sont exprimés dans la syntaxe `allowFrom` normale de chaque canal, ou `type: "discord.channelAudience"` lorsque l'audience `ViewChannel` actuelle d'un canal Discord doit définir l'appartenance dynamiquement. Le comportement des groupes d'accès partagés est documenté ici : [Groupes d'accès](/fr/channels/access-groups).

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

    Un canal texte Discord n'a pas de liste de membres distincte. `type: "discord.channelAudience"` modélise l'appartenance comme suit : l'expéditeur du DM est membre de la guilde configurée et dispose actuellement de l'autorisation `ViewChannel` effective sur le canal configuré après application des substitutions de rôles et de canaux.

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

    Les recherches échouent en mode fermé. Si Discord renvoie `Missing Access`, si la recherche de membre échoue, ou si le canal appartient à une guilde différente, l'expéditeur du DM est traité comme non autorisé.

    Activez l'intention **Server Members Intent** du portail développeur Discord pour le bot lors de l'utilisation de groupes d'accès basés sur l'audience du canal. Les DMs n'incluent pas l'état des membres de la guilde, donc OpenClaw résout le membre via l'API REST Discord au moment de l'autorisation.

  </Tab>

  <Tab title="Politique de guilde">
    La gestion des guildes est contrôlée par `channels.discord.groupPolicy` :

    - `open`
    - `allowlist`
    - `disabled`

    La ligne de base sécurisée lorsque `channels.discord` existe est `allowlist`.

    Comportement `allowlist` :

    - la guilde doit correspondre à `channels.discord.guilds` (`id` préféré, slug accepté)
    - listes d'autorisation d'expéditeurs optionnelles : `users` (ID stables recommandés) et `roles` (ID de rôles uniquement) ; si l'une ou l'autre est configurée, les expéditeurs sont autorisés lorsqu'ils correspondent à `users` OU `roles`
    - la correspondance directe par nom/tag est désactivée par défaut ; n'activez `channels.discord.dangerouslyAllowNameMatching: true` qu'en mode de compatibilité de secours
    - les noms/tags sont pris en charge pour `users`, mais les ID sont plus sûrs ; `openclaw security audit` avertit lorsque des entrées de nom/tag sont utilisées
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
    Les messages de guilde sont soumis au contrôle des mentions par défaut.

    La détection des mentions inclut :

    - mention explicite du bot
    - modèles de mention configurés (`agents.list[].groupChat.mentionPatterns`, fallback `messages.groupChat.mentionPatterns`)
    - comportement de réponse implicite au bot dans les cas pris en charge

    Lors de la rédaction de messages Discord sortants, utilisez la syntaxe de mention canonique : `<@USER_ID>` pour les utilisateurs, `<#CHANNEL_ID>` pour les salons, et `<@&ROLE_ID>` pour les rôles. N'utilisez pas l'ancien format de mention par surnom `<@!USER_ID>`.

    `requireMention` est configuré par guilde/salon (`channels.discord.guilds...`).
    `ignoreOtherMentions` ignore optionnellement les messages qui mentionnent un autre utilisateur/rôle mais pas le bot (à l'exclusion de @everyone/@here).

    Messages de groupe :

    - par défaut : ignorés (`dm.groupEnabled=false`)
    - liste d'autorisation optionnelle via `dm.groupChannels` (ID de salon ou slugs)

  </Tab>
</Tabs>

### Routage d'agents basé sur les rôles

Utilisez `bindings[].match.roles` pour router les membres de la guilde Discord vers différents agents par ID de rôle. Les liaisons basées sur les rôles n'acceptent que les ID de rôle et sont évaluées après les liaisons homologues ou homologues-parents et avant les liaisons limitées à la guilde. Si une liaison définit également d'autres champs de correspondance (par exemple `peer` + `guildId` + `roles`), tous les champs configurés doivent correspondre.

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
- `commands.native=false` ignore l'enregistrement et le nettoyage des commandes slash Discord lors du démarrage. Les commandes précédemment enregistrées peuvent rester visibles dans Discord jusqu'à ce que vous les supprimiez de l'application Discord.
- L'authentification des commandes natives utilise les mêmes listes d'autorisation/stratégies Discord que le traitement normal des messages.
- Les commandes peuvent toujours être visibles dans l'interface utilisateur Discord pour les utilisateurs qui ne sont pas autorisés ; l'exécution applique toujours l'authentification OpenClaw et renvoie "non autorisé".

Voir [Commandes slash](/fr/tools/slash-commands) pour le catalogue de commandes et le comportement.

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
    `batched` n'attache la référence de réponse native implicite de Discord que lorsque le tour entrant était un lot désamorcé de plusieurs messages. C'est utile lorsque vous souhaitez des réponses natives principalement pour les discussions saccadées ambiguës, et non pour chaque tour à message unique.

    Les identifiants de message sont exposés dans le contexte/historique afin que les agents puissent cibler des messages spécifiques.

  </Accordion>

  <Accordion title="Live stream preview">
    OpenClaw peut diffuser des réponses brouillon en envoyant un message temporaire et en le modifiant à mesure que le texte arrive. `channels.discord.streaming` accepte `off` | `partial` | `block` | `progress` (par défaut). `progress` conserve un brouillon de stat modifiable et le met à jour avec la progression des  jusqu'à la livraison finale ; l'étiquette de départ partagée est une ligne défilante, elle disparaît donc comme le reste une fois qu'un travail suffisant apparaît. `streamMode` est un alias d'exécution hérité. Exécutez `openclaw doctor --fix` pour réécrire la configuration persistante vers la clé canonique.

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
          toolProgress: true,
        },
      },
    },
  },
}
```

    - `partial` modifie un seul message de prévisualisation à l'arrivée des jetons.
    - `block` émet des morceaux de taille brouillon (utilisez `draftChunk` pour régler la taille et les points d'arrêt, limité à `textChunkLimit`).
    - Les finales médias, erreur et réponse explicite annulent les modifications de prévisualisation en attente.
    - `streaming.preview.toolProgress` (par défaut `true`) contrôle si les mises à jour de /progression réutilisent le message de prévisualisation.
    - Les lignes de /progression s'affichent sous forme compacte emoji + titre + détail lorsque disponible, par exemple `🛠️ Bash: run tests` ou `🔎 Web Search: for "query"`.
    - `streaming.preview.commandText` / `streaming.progress.commandText` contrôle les détails de commande/exec dans les lignes de progression compactes : `raw` (par défaut) ou `status` (étiquette de  uniquement).

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

    La diffusion de prévisualisation est en texte uniquement ; les réponses médias reviennent à la livraison normale. Lorsque la diffusion `block` est explicitement activée, OpenClaw ignore le flux de prévisualisation pour éviter la double diffusion.

  </Accordion>

  <Accordion title="Historique, contexte et comportement des fils">
    Contexte de l'historique de guilde :

    - `channels.discord.historyLimit` par défaut `20`
    - repli : `messages.groupChat.historyLimit`
    - `0` désactive

    Contrôles de l'historique des DM :

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`Discord

    Comportement des fils :

    - Les fils Discord sont acheminés en tant que sessions de channel et héritent de la configuration du channel parent, sauf en cas de substitution.
    - Les sessions de fils héritent de la sélection `/model` au niveau de la session du channel parent comme repli uniquement pour le model ; les sélections `/model` locales au fil priment toujours et l'historique des transcriptions parentales n'est pas copié, sauf si l'héritage des transcriptions est activé.
    - `channels.discord.thread.inheritParent` (par défaut `false`) opte pour l'amorçage des nouveaux fils automatiques à partir de la transcription parentale. Les substitutions par compte se trouvent sous `channels.discord.accounts.<id>.thread.inheritParent`.
    - Les réactions d'outil de message peuvent résoudre les cibles DM `user:<id>`.
    - `guilds.<guild>.channels.<channel>.requireMention: false` est préservé lors du repli d'activation de l'étape de réponse.

    Les sujets des channels sont injectés en tant que contexte **non approuvé**. Les listes autorisées filtrent qui peut déclencher l'agent, et ne constituent pas une limite complète de rédaction du contexte supplémentaire.

  </Accordion>

  <Accordion title="Sessions liées aux fils de discussion pour les sous-agents">
    Discord peut lier un fil de discussion à une cible de session, afin que les messages de suite dans ce fil continuent d'être acheminés vers la même session (y compris les sessions de sous-agent).

    Commandes :

    - `/focus <target>` lier le fil actuel/nouveau à une cible de sous-agent/session
    - `/unfocus` supprimer la liaison du fil actuel
    - `/agents` afficher les exécutions actives et l'état de la liaison
    - `/session idle <duration|off>` inspecter/mettre à jour le délai d'inactivité pour la défocus automatique des liaisons focalisées
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
    - `channels.discord.threadBindings.*` remplace le comportement de Discord.
    - `spawnSessions` contrôle la création/liaison automatique des fils pour `sessions_spawn({ thread: true })` et les créations de fils ACP. Par défaut : `true`.
    - `defaultSpawnContext` contrôle le contexte natif du sous-agent pour les créations liées aux fils. Par défaut : `"fork"`.
    - Les clés obsolètes `spawnSubagentSessions`/`spawnAcpSessions` sont migrées par `openclaw doctor --fix`.
    - Si les liaisons de fils sont désactivées pour un compte, `/focus` et les opérations de liaison de fils connexes ne sont pas disponibles.

    Voir [Sous-agents](/fr/tools/subagents), [Agents ACP](/fr/tools/acp-agents) et [Référence de configuration](/fr/gateway/configuration-reference).

  </Accordion>

  <Accordion title="Liaisons persistantes de canaux ACP">
    Pour des espaces de travail ACP stables et « toujours actifs », configurez des liaisons ACP typées de premier niveau ciblant les conversations Discord.

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

    - `/acp spawn codex --bind here` lie le channel ou fil actuel en place et conserve les futurs messages sur la même session ACP. Les messages de fil héritent de la liaison du channel parent.
    - Dans un channel ou fil lié, `/new` et `/reset` réinitialisent la même session ACP en place. Les liaisons de fil temporaires peuvent remplacer la résolution de la cible pendant leur activité.
    - `spawnSessions` verrouille la création/liaison de fils enfants via `--thread auto|here`.

    Voir [ACP Agents](/fr/tools/acp-agents) pour plus de détails sur le comportement des liaisons.

  </Accordion>

  <Accordion title="Reaction notifications">
    Mode de notification de réaction par guilde :

    - `off`
    - `own` (par défaut)
    - `all`
    - `allowlist` (utilise `guilds.<id>.users`)

    Les événements de réaction sont transformés en événements système et attachés à la session Discord acheminée.

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
    Acheminez le trafic WebSocket du Discord Gateway de Discord et les recherches REST au démarrage (ID d'application + résolution de la liste blanche) via un proxy HTTP(S) avec `channels.discord.proxy`.

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
    Activez la résolution PluralKit pour mapper les messages relayés à l'identité du membre du système :

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

    - les listes blanches peuvent utiliser `pk:<memberId>`
    - les noms d'affichage des membres sont matchés par nom/slug uniquement quand `channels.discord.dangerouslyAllowNameMatching: true`
    - les recherches utilisent l'ID du message original et sont limitées par une fenêtre de temps
    - si la recherche échoue, les messages relayés sont traités comme des messages de bot et supprimés sauf si `allowBots=true`

  </Accordion>

  <Accordion title="Alias de mentions sortantes">
    Utilisez `mentionAliases`Discord lorsque les agents ont besoin de mentions sortantes déterministes pour des utilisateurs Discord connus. Les clés sont les pseudos sans le `@`Discord au début ; les valeurs sont les ID d'utilisateurs Discord. Les pseudos inconnus, `@everyone`, `@here` et les mentions à l'intérieur des sections de code Markdown sont laissées inchangées.

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
    - 5 : Compétition

    Exemple de présence automatique (signal d'état d'exécution) :

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

    La présence automatique mappe la disponibilité d'exécution au statut Discord : healthy => en ligne, degraded ou unknown => inactif, exhausted ou unavailable => ne pas déranger. Substitutions de texte facultatives :

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText` (prend en charge l'espace réservé `{reason}`)

  </Accordion>

  <Accordion title="Approbations dans Discord">
    Discord prend en charge la gestion des approbations par bouton dans les DMs et peut éventuellement publier des invites d'approbation dans le channel d'origine.

    Chemin de configuration :

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers` (facultatif ; revient à `commands.ownerAllowFrom` si possible)
    - `channels.discord.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
    - `agentFilter`, `sessionFilter`, `cleanupAfterResolve`

    Discord active automatiquement les approbations d'exécution natives lorsque `enabled` n'est pas défini ou est `"auto"` et qu'au moins un approbateur peut être résolu, soit depuis `execApprovals.approvers`, soit depuis `commands.ownerAllowFrom`. Discord n'infère pas les approbateurs d'exécution depuis le `allowFrom` du channel, l'`dm.allowFrom` hérité, ou le `defaultTo` en message direct. Définissez `enabled: false` pour désactiver explicitement Discord en tant que client d'approbation natif.

    Pour les commandes de groupe sensibles réservées au propriétaire telles que `/diagnostics` et `/export-trajectory`, OpenClaw envoie les invites d'approbation et les résultats finaux en privé. Il essaie d'abord le DM Discord lorsque le propriétaire appelant dispose d'une route propriétaire Discord ; si ce n'est pas disponible, il revient à la première route propriétaire disponible depuis `commands.ownerAllowFrom`, telle que Telegram.

    Lorsque `target` est `channel` ou `both`, l'invite d'approbation est visible dans le channel. Seuls les approbateurs résolus peuvent utiliser les boutons ; les autres utilisateurs reçoivent un refus éphémère. Les invites d'approbation incluent le texte de la commande, n'activez donc la livraison par channel que dans les channels de confiance. Si l'ID du channel ne peut pas être dérivé de la clé de session, OpenClaw revient à la livraison par DM.

    Discord affiche également les boutons d'approbation partagés utilisés par d'autres channels de chat. L'adaptateur natif Discord ajoute principalement le routage DM des approbateurs et la diffusion (fanout) vers les channels.
    Lorsque ces boutons sont présents, ils constituent l'UX d'approbation principal ; OpenClaw
    ne doit inclure une commande manuelle `/approve` que lorsque le résultat de l'outil indique
    que les approbations par chat sont indisponibles ou que l'approbation manuelle est le seul chemin.
    Si le runtime d'approbation natif Discord n'est pas actif, OpenClaw conserve l'invite
    locale déterministe `/approve <id> <decision>` visible. Si le
    runtime est actif mais qu'une carte native ne peut pas être livrée à aucune cible,
    OpenClaw envoie un avis de repli de même chat avec la commande exacte `/approve`
    de l'approbation en attente.

    L'authentification et la résolution d'approbation du Gateway suivent le contrat client partagé du Gateway (les IDs `plugin:` sont résolus via `plugin.approval.resolve` ; les autres IDs via `exec.approval.resolve`). Les approbations expirent après 30 minutes par défaut.

    Voir [Approbations d'exécution](/fr/tools/exec-approvals).

  </Accordion>
</AccordionGroup>

## Outils et barrières d'action

Les actions de message Discord incluent la messagerie, l'administration de channel, la modération, la présence et les actions de métadonnées.

Exemples de base :

- messagerie : `sendMessage`, `readMessages`, `editMessage`, `deleteMessage`, `threadReply`
- réactions : `react`, `reactions`, `emojiList`
- modération : `timeout`, `kick`, `ban`
- présence : `setPresence`

L'action `event-create` accepte un paramètre `image` facultatif (URL ou chemin de fichier local) pour définir l'image de couverture de l'événement planifié.

Les portes d'action se trouvent sous `channels.discord.actions.*`.

Comportement de barrière par défaut :

| Groupe d'actions                                                                                                                                                         | Par défaut |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| reactions, messages, threads, pins, polls, search, memberInfo, roleInfo, channelInfo, channels, voiceStatus, events, stickers, emojiUploads, stickerUploads, permissions | activé     |
| rôles                                                                                                                                                                    | désactivé  |
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

## Voix

Discord dispose de deux surfaces vocales distinctes : les **salons vocaux** en temps réel (conversations continues) et les **pièces jointes vocales** (le format de prévisualisation de forme d'onde). La passerelle prend en charge les deux.

### Canaux vocaux

Liste de vérification de la configuration :

1. Activez l'intention de contenu des messages dans le portail développeur Discord.
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

Pour inspecter les effectives permissions du bot avant de rejoindre, exécutez :

```bash
openclaw channels capabilities --channel discord --target channel:<voice-channel-id>
```

Exemple de rejoindre automatiquement :

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

- `voice.tts` remplace `messages.tts` pour la lecture vocale `stt-tts` uniquement. Les modes temps réel utilisent `voice.realtime.voice`.
- `voice.mode` contrôle le chemin de la conversation. La valeur par défaut est `agent-proxy` : une interface vocale en temps réel gère le timing des tours, les interruptions et la lecture, délègue le travail substantiel à l'agent OpenClaw acheminé via `openclaw_agent_consult`, et traite le résultat comme une invite Discord saisie de la part de cet intervenant. `stt-tts` conserve l'ancien flux STT par lot plus TTS. `bidi` permet au modèle en temps réel de converser directement tout en exposant `openclaw_agent_consult` pour le cerveau OpenClaw.
- `voice.agentSession` contrôle quelle conversation OpenClaw reçoit les tours de voix. Laissez-le non défini pour la session propre du canal vocal, ou définissez `{ mode: "target", target: "channel:<text-channel-id>" }` pour faire agir le canal vocal comme l'extension microphone/haut-parleur d'une session de canal texte Discord existante telle que `#maintainers`.
- `voice.model` remplace le cerveau de l'agent OpenClaw pour les réponses vocales Discord et les consultations en temps réel. Laissez-le non défini pour hériter du modèle d'agent acheminé. Il est distinct de `voice.realtime.model`.
- `agent-proxy` achemine la parole via `discord-voice`, ce qui préserve l'autorisation propriétaire/tool normale pour le locuteur et la session cible, mais masque le tool agent `tts`Discord car la voix Discord possède la lecture. Par défaut, `agent-proxy` accorde à la consultation un accès complet aux tools équivalent à celui du propriétaire pour les locuteurs propriétaires (`voice.realtime.toolPolicy: "owner"`) et privilégie fortement la consultation de l'agent OpenClaw avant les réponses substantielles (`voice.realtime.consultPolicy: "always"`). Dans ce mode `always` par défaut, la couche temps réel ne prononce pas automatiquement de remplissage avant la réponse de la consultation ; elle capture et transcrit la parole, puis prononce la réponse OpenClaw acheminée. Si plusieurs réponses de consultation forcée se terminent alors que Discord diffuse toujours la première réponse, les réponses vocales exactes ultérieures sont mises en file d'attente jusqu'à ce que la lecture soit inactive, au lieu de remplacer la parole en milieu de phrase.
- En mode `stt-tts`, STT utilise `tools.media.audio` ; `voice.model` n'affecte pas la transcription.
- Dans les modes temps réel, `voice.realtime.provider`, `voice.realtime.model` et `voice.realtime.voice` configurent la session audio temps réel. Pour OpenAI Realtime 2 ainsi que le cerveau Codex, utilisez `voice.realtime.model: "gpt-realtime-2"` et `voice.model: "openai-codex/gpt-5.5"`.
- Le provider temps réel OpenAI accepte les noms d'événements actuels de Realtime 2 et les alias compatibles avec l'ancien Codex pour les événements de sortie audio et de transcription, ce qui permet aux snapshots de providers compatibles de dériver sans couper l'audio de l'assistant.
- `voice.realtime.bargeIn` contrôle si les événements de début de parole Discord interrompent la lecture temps réel active. Si non défini, il suit le paramètre d'interruption de l'audio d'entrée du provider temps réel.
- `voice.realtime.minBargeInAudioEndMs` contrôle la durée de lecture minimale de l'assistant avant qu'une coupure temps réel OpenAI ne coupe l'audio. Par défaut : `250`. Réglez `0` pour une interruption immédiate dans les pièces peu réverbérantes, ou augmentez-le pour les configurations d'enceintes avec beaucoup d'écho.
- Pour une lecture vocale OpenAI sur Discord, réglez `voice.tts.provider: "openai"` et choisissez une voix de synthèse vocale sous `voice.tts.openai.voice` ou `voice.tts.providers.openai.voice`. `cedar` est un bon choix de voix masculine sur le modèle TTS OpenAI actuel.
- Les substitutions de configuration `systemPrompt` par canal Discord s'appliquent aux tours de transcription vocale pour ce canal vocal.
- Les tours de transcription vocale dérivent le statut de propriétaire de Discord `allowFrom` (ou `dm.allowFrom`) ; les orateurs non propriétaires ne peuvent pas accéder aux outils réservés au propriétaire (par exemple `gateway` et `cron`).
- La voix Discord est optionnelle pour les configurations texte uniquement ; définissez `channels.discord.voice.enabled=true` (ou conservez un bloc `channels.discord.voice` existant) pour activer les commandes `/vc`, l'exécution vocale et l'intention de passerelle `GuildVoiceStates`.
- `channels.discord.intents.voiceStates` peut remplacer explicitement l'abonnement à l'intention d'état vocal. Laissez-le non défini pour que l'intention suive l'activation vocale effective.
- Si `voice.autoJoin` contient plusieurs entrées pour le même serveur (guild), OpenClaw rejoint le dernier canal configuré pour ce serveur.
- `voice.allowedChannels` est une liste d'autorisation de résidence optionnelle. Laissez-le non défini pour permettre à `/vc join` d'accéder à n'importe quel canal vocal Discord autorisé. Lorsqu'il est défini, `/vc join`, la jointure automatique au démarrage et les déplacements de l'état vocal du bot sont restreints aux entrées `{ guildId, channelId }` répertoriées. Définissez-le sur un tableau vide pour refuser toutes les jointures vocales Discord. Si Discord déplace le bot en dehors de la liste d'autorisation, OpenClaw quitte ce canal et rejoint la cible de jointure automatique configurée lorsqu'une est disponible.
- `voice.daveEncryption` et `voice.decryptionFailureTolerance` sont transmis aux options de connexion `@discordjs/voice`.
- Les valeurs par défaut de `@discordjs/voice` sont `daveEncryption=true` et `decryptionFailureTolerance=24` si elles ne sont pas définies.
- OpenClaw utilise par défaut le décodeur `opusscript` pur JS pour la réception vocale Discord. Le package natif optionnel `@discordjs/opus` est ignoré par la politique d'installation pnpm du dépôt afin que les installations normales, les voies Docker et les tests sans rapport ne compilent pas de module natif. Les hôtes dédiés aux performances vocales peuvent opter pour `OPENCLAW_DISCORD_OPUS_DECODER=native` après avoir installé le module natif.
- `voice.connectTimeoutMs` contrôle l'attente initiale `@discordjs/voice` Ready pour `/vc join` et les tentatives de jointure automatique. Valeur par défaut : `30000`.
- `voice.reconnectGraceMs` contrôle la durée d'attente de OpenClaw avant qu'une session vocale déconnectée ne commence à se reconnecter avant d'être détruite. Valeur par défaut : `15000`.
- En mode `stt-tts`, la lecture vocale ne s'arrête pas simplement parce qu'un autre utilisateur commence à parler. Pour éviter les boucles de rétroaction, OpenClaw ignore la nouvelle capture vocale pendant que le TTS est en cours de lecture ; parlez après la fin de la lecture pour le tour suivant. Les modes temps réel transmettent les débuts de parole comme signaux d'interruption (barge-in) au provider en temps réel.
- En modes temps réel, l'écho provenant des haut-parleurs vers un microphone ouvert peut ressembler à une coupure de parole (barge-in) et interrompre la lecture. Pour les salons Discord sujets à de l'écho, définissez Discord`voice.realtime.providers.openai.interruptResponseOnInputAudio: false`OpenAI pour empêcher OpenAI d'interrompre automatiquement sur l'audio d'entrée. Ajoutez `voice.realtime.bargeIn: true`DiscordOpenAI si vous souhaitez toujours que les événements de début de parole Discord interrompent la lecture active. Le pont temps réel OpenAI ignore les troncatures de lecture plus courtes que `voice.realtime.minBargeInAudioEndMs`Discord, les considérant comme probablement de l'écho/du bruit, et les consigne comme étant ignorées au lieu d'effacer la lecture Discord.
- `voice.captureSilenceGraceMs` contrôle la durée d'attente d'OpenClaw après que Discord a signalé qu'un intervenant s'est arrêté avant de finaliser ce segment audio pour la STT. Par défaut : `2500` ; augmentez cette valeur si Discord divise les pauses normales en transcriptions partielles hachées.
- Lorsque ElevenLabs est le fournisseur TTS sélectionné, la lecture vocale Discord utilise le TTS en continu et commence à partir du flux de réponse du fournisseur. Les fournisseurs sans support du continu reviennent au chemin du fichier temporaire synthétisé.
- OpenClaw surveille également les échecs de déchiffrement à la réception et récupère automatiquement en quittant/rejoignant le canal vocal après des échecs répétés sur une courte période.
- Si les journaux de réception affichent répétitivement `DecryptionFailed(UnencryptedWhenPassthroughDisabled)` après la mise à jour, collectez un rapport sur les dépendances et les journaux. La ligne `@discordjs/voice` fournie inclut le correctif de remplissage en amont de la PR discord.js #11449, qui a clôturé le problème discord.js #11419.
- Les événements de réception `The operation was aborted`OpenClaw sont attendus lorsqu'OpenClaw finalise un segment de locuteur capturé ; ce sont des diagnostics verbeux, et non des avertissements.
- Les journaux vocaux détaillés de Discord incluent un aperçu de transcription STT d'une ligne limité pour chaque segment de locuteur accepté, de sorte que le débogage montre à la fois le côté utilisateur et le côté de la réponse de l'agent sans vider du texte de transcription non limité.
- En mode `agent-proxy`, le repli forcé vers la consultation ignore les fragments de transcription probablement incomplets, tels que le texte se terminant par `...` ou un connecteur final comme `and`, ainsi que les fermetures évidentes sans action comme "je reviens" ou "au revoir". Les journaux affichent `forced agent consult skipped reason=...` lorsque cela empêche une réponse en file d'attente obsolète.

Configuration native d'opus pour les extraits de sources :

```bash
pnpm install
mise exec node@22 -- pnpm discord:opus:install
```

Utilisez Node 22 pour la passerelle lorsque vous souhaitez le module natif préconstruit en amont macOS arm64. Si vous utilisez un autre runtime Node, le programme d'installation optionnel peut avoir besoin d'une chaîne d'outils de compilation source `node-gyp` locale.

Après avoir installé le module natif, démarrez le Gateway avec :

```bash
OPENCLAW_DISCORD_OPUS_DECODER=native pnpm gateway:watch
```

Les journaux vocaux détaillés devraient afficher `discord voice: opus decoder: @discordjs/opus`. Sans l'activation via la variable d'environnement, ou si le module natif est manquant ou ne peut pas être chargé sur l'hôte, OpenClaw consigne `discord voice: opus decoder: opusscript` et continue de recevoir la voix via la solution de repli pure-JS.

Pipeline STT plus TTS :

- La capture PCM de Discord est convertie en un fichier temporaire WAV.
- `tools.media.audio` gère la STT, par exemple `openai/gpt-4o-mini-transcribe`.
- La transcription est envoyée via l'ingestion et le routage Discord tandis que le LLM de réponse s'exécute avec une stratégie de sortie vocale qui masque l'outil `tts` de l'agent et demande du texte retourné, car la voix Discord gère la lecture TTS finale.
- `voice.model`LLM, si défini, remplace uniquement le LLM de réponse pour ce tour de canal vocal.
- `voice.tts` est fusionné par-dessus `messages.tts` ; les fournisseurs compatibles avec le flux alimentent directement le lecteur, sinon le fichier audio résultant est lu dans le canal rejoint.

Exemple de session de canal vocal proxy-agent par défaut :

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

Sans bloc `voice.agentSession`, chaque canal vocal obtient sa propre session routée OpenClaw. Par exemple, `/vc join channel:234567890123456789` communique avec la session de ce canal vocal Discord. Le modèle en temps réel n'est que l'interface vocale ; les demandes substantielles sont transmises à l'agent OpenClaw configuré. Si le modèle en temps réel produit une transcription finale sans appeler l'outil de consultation, OpenClaw force la consultation en solution de repli afin que le comportement par défaut reste similaire à une discussion avec l'agent.

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

Exemple bidi en temps réel :

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

En mode `agent-proxy`, le bot rejoint le canal vocal configuré, mais les tours de l'agent OpenClaw utilisent la session acheminée normale et l'agent du canal cible. La session vocale en temps réel prononce le résultat renvoyé dans le canal vocal. L'agent superviseur peut toujours utiliser les outils de message normaux selon sa politique d'outils, y compris l'envoi d'un message Discord distinct si c'est la bonne action.

Formes cibles utiles :

- `target: "channel:123456789012345678"` achemine via une session de canal texte Discord.
- `target: "123456789012345678"` est traité comme une cible de canal.
- `target: "dm:123456789012345678"` ou `target: "user:123456789012345678"` achemine via cette session de message direct.

Exemple Realtime OpenAI avec beaucoup d'écho :

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

Utilisez ceci lorsque le modèle entend sa propre lecture Discord via un microphone ouvert, mais que vous souhaitez toujours l'interrompre en parlant. OpenClaw empêche OpenAI d'interrompre automatiquement sur l'audio d'entrée brut, tandis que DiscordOpenClawOpenAI`bargeIn: true`DiscordOpenAI permet aux événements de début de locuteur Discord et à l'audio de locuteur déjà actif d'annuler les réponses en temps réel actives avant que le prochain tour capturé n'atteigne OpenAI. Les signaux d'interruption très précoces avec `audioEndMs` en dessous de `minBargeInAudioEndMs` sont traités comme probablement des échos/bruits et ignorés pour que le modèle ne se coupe pas dès la première image de lecture.

Journaux vocaux attendus :

- À la connexion : `discord voice: joining ... voiceSession=... supervisorSession=... agentSessionMode=... voiceModel=... realtimeModel=...`
- Au démarrage en temps réel : `discord voice: realtime bridge starting ... autoRespond=false interruptResponse=false bargeIn=false minBargeInAudioEndMs=...`
- Sur l'audio du haut-parleur : `discord voice: realtime speaker turn opened ...`, `discord voice: realtime input audio started ... outputAudioMs=... outputActive=...` et `discord voice: realtime speaker turn closed ... chunks=... discordBytes=... realtimeBytes=... interruptedPlayback=...`
- Sur la parole périmée ignorée : `discord voice: realtime forced agent consult skipped reason=incomplete-transcript ...` ou `reason=non-actionable-closing ...`
- Sur l'achèvement de la réponse en temps réel : `discord voice: realtime audio playback finishing reason=response.done ... audioMs=... chunks=...`
- Sur l'arrêt/réinitialisation de la lecture : `discord voice: realtime audio playback stopped reason=... audioMs=... elapsedMs=... chunks=...`
- Sur la consultation en temps réel : `discord voice: realtime consult requested ... voiceSession=... supervisorSession=... question=...`
- Sur la réponse de l'agent : `discord voice: agent turn answer ...`
- Sur la parole exacte mise en file d'attente : `discord voice: realtime exact speech queued ... queued=... outputAudioMs=... outputActive=...`, suivie de `discord voice: realtime exact speech dequeued reason=player-idle ...`
- Sur la détection d'interruption : `discord voice: realtime barge-in detected source=speaker-start ...` ou `discord voice: realtime barge-in detected source=active-speaker-audio ...`, suivie de `discord voice: realtime barge-in requested reason=... outputAudioMs=... outputActive=...`
- Sur l'interruption en temps réel : `discord voice: realtime model interrupt requested client:response.cancel reason=barge-in`, suivie de `discord voice: realtime model audio truncated client:conversation.item.truncate reason=barge-in audioEndMs=...` ou `discord voice: realtime model interrupt confirmed server:response.done status=cancelled ...`
- Sur l'écho/bruit ignoré : `discord voice: realtime model interrupt ignored client:conversation.item.truncate.skipped reason=barge-in audioEndMs=0 minAudioEndMs=250`
- Sur l'insertion désactivée : `discord voice: realtime capture ignored during playback (barge-in disabled) ...`
- Sur la lecture inactive : `discord voice: realtime barge-in ignored reason=... outputActive=false ... playbackChunks=0`

Pour déboguer l'audio coupé, lisez les journaux vocaux en temps réel comme une chronologie :

1. `realtime audio playback started` signifie que Discord a commencé à lire l'audio de l'assistant. Le pont commence à compter les segments de sortie de l'assistant, les octets PCM Discord, les octets en temps réel du provider et la durée de l'audio synthétisé à partir de ce point.
2. `realtime speaker turn opened` marque un intervenant Discord devenant actif. Si la lecture est déjà active et que `bargeIn` est activé, cela peut être suivi de `barge-in detected source=speaker-start`.
3. `realtime input audio started` marque la première trame audio réelle reçue pour ce tour de parole. `outputActive=true` ou une valeur `outputAudioMs` non nulle ici signifie que le microphone envoie une entrée alors que la lecture de l'assistant est toujours active.
4. `barge-in detected source=active-speaker-audio` signifie que OpenClaw a détecté une audio du locuteur en direct pendant que la lecture de l'assistant était active. Ceci est utile pour distinguer une véritable interruption d'un événement de début de locuteur Discord sans audio utile.
5. `barge-in requested reason=...` signifie que OpenClaw a demandé au fournisseur en temps réel d'annuler ou de tronquer la réponse active. Il inclut `outputAudioMs`, `outputActive` et `playbackChunks` afin que vous puissiez voir quelle quantité d'audio de l'assistant avait réellement été lue avant l'interruption.
6. `realtime audio playback stopped reason=...`Discord est le point de réinitialisation de lecture Discord local. La raison indique qui a arrêté la lecture : `barge-in`, `player-idle`, `provider-clear-audio`, `forced-agent-consult`, `stream-close` ou `session-close`.
7. `realtime speaker turn closed` résume le tour d'entrée capturé. `chunks=0` ou `hasAudio=false` signifie que le tour de parole s'est ouvert mais qu'aucune audio utilisable n'a atteint le pont temps réel. `interruptedPlayback=true` signifie que le tour d'entrée a chevauché la sortie de l'assistant et a déclenché la logique d'interruption.

Champs utiles :

- `outputAudioMs` : durée de l'audio de l'assistant générée par le provider temps réel avant la ligne de journal.
- `audioMs` : durée de l'audio de l'assistant comptée par OpenClaw avant l'arrêt de la lecture.
- `elapsedMs` : temps réel entre l'ouverture et la fermeture du flux de lecture ou du tour de parole.
- `discordBytes` : octets PCM stéréo 48 kHz envoyés ou reçus de la voix Discord.
- `realtimeBytes` : octets PCM au format du provider envoyés ou reçus du provider en temps réel.
- `playbackChunks` : chunks audio de l'assistant transférés à Discord pour la réponse active.
- `sinceLastAudioMs` : écart entre la dernière trame audio du locuteur capturée et la fin de son tour de parole.

Motifs courants :

- Une coupure immédiate avec `source=active-speaker-audio`, un petit `outputAudioMs`, et le même utilisateur à proximité indique généralement que l'écho du haut-parleur entre dans le micro. Augmentez `voice.realtime.minBargeInAudioEndMs`, baissez le volume du haut-parleur, utilisez un casque ou définissez `voice.realtime.providers.openai.interruptResponseOnInputAudio: false`.
- `source=speaker-start` suivi de `speaker turn closed ... hasAudio=false` signifie que Discord a signalé un début de parole mais qu'aucun audio n'a atteint OpenClaw. Cela peut être un événement vocal Discord transitoire, un comportement de porte de bruit, ou un client activant brièvement le micro.
- `audio playback stopped reason=stream-close` sans une intervention à proximité ou `provider-clear-audio` signifie que le flux de lecture local Discord s'est terminé de manière inattendue. Vérifiez les journaux du fournisseur précédent et les journaux du lecteur Discord.
- `capture ignored during playback (barge-in disabled)` signifie que OpenClaw a intentionnellement abandonné l'entrée alors que l'audio de l'assistant était actif. Activez `voice.realtime.bargeIn` si vous souhaitez que la parole interrompe la lecture.
- `barge-in ignored ... outputActive=false` signifie que Discord ou le VAD du fournisseur a détecté de la parole, mais que OpenClaw n'avait aucune lecture active à interrompre. Cela ne devrait pas couper l'audio.

Les informations d'identification sont résolues par composant : auth de route LLM pour `voice.model`, auth STT pour `tools.media.audio`, auth TTS pour `messages.tts`/`voice.tts`, et auth du fournisseur temps réel pour `voice.realtime.providers` ou la configuration d'auth normale du fournisseur.

### Messages vocaux

Les messages vocaux Discord affichent un aperçu de la forme d'onde et nécessitent un audio OGG/Opus. OpenClaw génère automatiquement la forme d'onde, mais a besoin de DiscordOpenClaw`ffmpeg` et de `ffprobe` sur l'hôte de la passerelle pour inspecter et convertir.

- Fournissez un **chemin d'accès local au fichier** (les URL sont rejetées).
- Omettez le contenu du texte (Discord rejette le texte + message vocal dans la même charge utile).
- Tout format audio est accepté ; OpenClaw convertit en OGG/Opus si nécessaire.

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## Dépannage

<AccordionGroup>
  <Accordion title="Used disallowed intents or bot sees no guild messages">

    - activer l'intention de contenu de message (Message Content Intent)
    - activer l'intention des membres du serveur (Server Members Intent) lorsque vous dépendez de la résolution utilisateur/membre
    - redémarrer la passerelle après avoir modifié les intentions

  </Accordion>

  <Accordion title="Guild messages blocked unexpectedly">

    - vérifier `groupPolicy`
    - vérifier la liste d'autorisation de guilde sous `channels.discord.guilds`
    - si la carte de `channels` de guilde existe, seuls les canaux répertoriés sont autorisés
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

  <Accordion title="DiscordTours Discord longs ou réponses en double">

    Journaux typiques :

    - `Slow listener detected ...`
    - `stuck session: sessionKey=agent:...:discord:... state=processing ...`

    Paramètres de la file d'attente de la passerelle Discord :

    - compte unique : `channels.discord.eventQueue.listenerTimeout`
    - multi-compte : `channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`
    - cela contrôle uniquement le travail de l'écouteur de la passerelle Discord, et non la durée de vie du tour de l'agent

    Discord n'applique pas de délai d'attente propriétaire du channel aux tours d'agent mis en file d'attente. Les écouteurs de messages transmettent immédiatement, et les exécutions Discord en file d'attente préservent l'ordre par session jusqu'à ce que le cycle de vie session/tool/runtime se termine ou interrompe le travail.

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

  <Accordion title="GatewayAvertissements de dépassement du délai de recherche des métadonnées du Gateway"OpenClawDiscord>
    OpenClaw récupère les métadonnées `/gateway/bot`Discord de Discord avant de se connecter. En cas d'échecs temporaires, l'URL du Gateway par défaut de Discord est utilisée et ces incidents sont enregistrés dans les logs avec limitation de débit.

    Paramètres de délai d'attente des métadonnées :

    - single-account : `channels.discord.gatewayInfoTimeoutMs`
    - multi-account : `channels.discord.accounts.<accountId>.gatewayInfoTimeoutMs`
    - repli environnemental si la configuration n'est pas définie : `OPENCLAW_DISCORD_GATEWAY_INFO_TIMEOUT_MS`
    - par défaut : `30000` (30 secondes), max : `120000`

  </Accordion>

  <Accordion title="GatewayRedémarrages du délai d'attente READY du Gateway"OpenClawDiscord>
    OpenClaw attend l'événement de gateway `READY` de Discord lors du démarrage et après les reconnexions en cours d'exécution. Les configurations multi-comptes avec échelonnement du démarrage peuvent nécessiter une fenêtre READY de démarrage plus longue que celle par défaut.

    Paramètres de délai d'attente READY :

    - démarrage compte unique : `channels.discord.gatewayReadyTimeoutMs`
    - démarrage multi-compte : `channels.discord.accounts.<accountId>.gatewayReadyTimeoutMs`
    - repli env au démarrage si la config n'est pas définie : `OPENCLAW_DISCORD_READY_TIMEOUT_MS`
    - démarrage par défaut : `15000` (15 secondes), max : `120000`
    - exécution compte unique : `channels.discord.gatewayRuntimeReadyTimeoutMs`
    - exécution multi-compte : `channels.discord.accounts.<accountId>.gatewayRuntimeReadyTimeoutMs`
    - repli env lors de l'exécution si la config n'est pas définie : `OPENCLAW_DISCORD_RUNTIME_READY_TIMEOUT_MS`
    - exécution par défaut : `30000` (30 secondes), max : `120000`

  </Accordion>

  <Accordion title="Permissions audit mismatches">
    `channels status --probe` Les vérifications de permission ne fonctionnent que pour les ID de canal numériques.

    Si vous utilisez des clés de slug (slug keys), la correspondance à l'exécution peut toujours fonctionner, mais la sonde (probe) ne peut pas vérifier entièrement les autorisations.

  </Accordion>

  <Accordion title="DM and pairing issues">

    - DM désactivé : `channels.discord.dm.enabled=false`
    - Politique DM désactivée : `channels.discord.dmPolicy="disabled"` (legacy : `channels.discord.dm.policy`)
    - en attente de l'approbation de l'appairage en mode `pairing`

  </Accordion>

  <Accordion title="Bot to bot loops">
    Par défaut, les messages créés par des bots sont ignorés.

    Si vous définissez `channels.discord.allowBots=true`, utilisez des règles strictes de mention et de liste autorisée pour éviter les boucles.
    Privilégiez `channels.discord.allowBots="mentions"` pour n'accepter que les messages de bots qui mentionnent le bot.

```json5
{
  channels: {
    discord: {
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
    - commencer à partir de `channels.discord.voice.decryptionFailureTolerance=24` (par défaut en amont) et ajuster uniquement si nécessaire
    - surveiller les journaux pour :
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - si les échecs persistent après le rejoint automatique, collectez les journaux et comparez-les avec l'historique de réception DAVE en amont dans [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) et [discord.js #11449](https://github.com/discordjs/discord.js/pull/11449)

  </Accordion>
</AccordionGroup>

## Référence de configuration

Référence principale : [Référence de configuration - Discord](/fr/gateway/config-channels#discord).

<Accordion title="DiscordChamps Discord à fort signal">

- démarrage/authentification : `enabled`, `token`, `accounts.*`, `allowBots`
- stratégie : `groupPolicy`, `dm.*`, `guilds.*`, `guilds.*.channels.*`
- commande : `commands.native`, `commands.useAccessGroups`, `configWrites`, `slashCommand.*`
- file d'événements : `eventQueue.listenerTimeout` (budget d'écoute), `eventQueue.maxQueueSize`, `eventQueue.maxConcurrency`
- passerelle : `gatewayInfoTimeoutMs`, `gatewayReadyTimeoutMs`, `gatewayRuntimeReadyTimeoutMs`
- réponse/historique : `replyToMode`, `historyLimit`, `dmHistoryLimit`, `dms.*.historyLimit`
- livraison : `textChunkLimit`, `chunkMode`, `maxLinesPerMessage`
- diffusion en continu : `streaming` (ancien alias : `streamMode`), `streaming.preview.toolProgress`, `draftChunk`, `blockStreaming`, `blockStreamingCoalesce`
- média/nouvelle tentative : `mediaMaxMb` (limite les téléchargements sortants Discord, par défaut `100MB`), `retry`
- actions : `actions.*`
- présence : `activity`, `status`, `activityType`, `activityUrl`
- interface utilisateur : `ui.components.accentColor`
- fonctionnalités : `threadBindings`, `bindings[]` de premier niveau (`type: "acp"`), `pluralkit`, `execApprovals`, `intents`, `agentComponents`, `heartbeat`, `responsePrefix`

</Accordion>

## Sécurité et opérations

- Traitez les jetons de bot comme des secrets (`DISCORD_BOT_TOKEN` préférés dans les environnements supervisés).
- Accordez les permissions Discord avec le principe du moindre privilège.
- Si le déploiement/l'état des commandes est périmé, redémarrez la passerelle et revérifiez avec `openclaw channels status --probe`.

## Connexes

<CardGroup cols={2}>
  <Card title="Pairing" icon="link" href="/fr/channels/pairing" Discord>
    Associer un utilisateur Discord à la passerelle.
  </Card>
  <Card title="Groups" icon="users" href="/fr/channels/groups">
    Comportement du chat de groupe et de la liste blanche.
  </Card>
  <Card title="Channel routing" icon="route" href="/fr/channels/channel-routing">
    Acheminez les messages entrants vers les agents.
  </Card>
  <Card title="Security" icon="shield" href="/fr/gateway/security">
    Modèle de menace et durcissement.
  </Card>
  <Card title="Multi-agent routing" icon="sitemap" href="/fr/concepts/multi-agent">
    Associez les guildes et les canaux aux agents.
  </Card>
  <Card title="Slash commands" icon="terminal" href="/fr/tools/slash-commands">
    Comportement des commandes natives.
  </Card>
</CardGroup>
