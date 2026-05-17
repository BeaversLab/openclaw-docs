---
summary: "Référence CLI pour `openclaw channels` (comptes, statut, connexion/déconnexion, journaux)"
read_when:
  - You want to add/remove channel accounts (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Matrix)
  - You want to check channel status or tail channel logs
title: "Canaux"
---

# `openclaw channels`

Gérer les comptes de channel de chat et leur statut d'exécution sur le Gateway.

Documentation associée :

- Guides des channels : [Channels](/fr/channels)
- Configuration du Gateway : [Configuration](Gateway/en/gateway/configuration)

## Commandes courantes

```bash
openclaw channels list
openclaw channels list --all
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels capabilities --channel discord --target channel:<voice-channel-id>
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

`channels list` affiche uniquement les canaux de chat : les comptes configurés par défaut, avec les balises de statut `installed`, `configured` et `enabled` par compte. Passez `--all` pour également afficher les canaux groupés qui n'ont pas encore de compte configuré et les canaux de catalogue installables qui ne sont pas encore sur le disque. Les fournisseurs d'authentification (OAuth + clés API) et les instantanés d'utilisation/quota des fournisseurs de modèles ne sont plus imprimés ici ; utilisez `openclaw models auth list` pour les profils d'authentification des fournisseurs et `openclaw status` ou `openclaw models list` pour l'utilisation.

## Statut / Capacités / Résolution / Journaux

- `channels status` : `--channel <name>`, `--probe`, `--timeout <ms>`, `--json`
- `channels capabilities` : `--channel <name>`, `--account <id>` (uniquement avec `--channel`), `--target <dest>`, `--timeout <ms>`, `--json`
- `channels resolve` : `<entries...>`, `--channel <name>`, `--account <id>`, `--kind <auto|user|group>`, `--json`
- `channels logs` : `--channel <name|all>`, `--lines <n>`, `--json`

`channels status --probe` est le chemin en direct (live path) : sur un Gateway joignable, il exécute des `probeAccount` par compte et des vérifications optionnelles `auditAccount`, donc la sortie peut inclure l'état du transport ainsi que les résultats des sondages tels que `works`, `probe failed`, `audit ok`, ou `audit failed`.
Si le Gateway est injoignable, `channels status` revient par défaut à des résumés basés uniquement sur la configuration au lieu de la sortie des sondages en direct.

N'utilisez pas `openclaw sessions`, le Gateway `sessions.list`, ou l'outil `sessions_list` de l'agent comme signal de santé de socket de channel. Ces surfaces rapportent des lignes de conversation stockées, et non l'état d'exécution du provider. Après un redémarrage du provider Discord, un compte connecté mais silencieux peut être sain même si aucune ligne de session Discord n'apparaît jusqu'au prochain événement de conversation entrant ou sortant.

## Ajouter / supprimer des comptes

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

<Tip>`openclaw channels add --help` affiche les drapeaux par channel (jeton, clé privée, jeton d'application, chemins signal-cli, etc.).</Tip>

`channels remove` opère uniquement sur les plugins de channel installés/configurés. Utilisez d'abord `channels add` pour les channels du catalogue installables.
Pour les plugins de channel soutenus par l'exécution, `channels remove`Gateway demande également au Gateway en cours d'exécution d'arrêter le compte sélectionné avant de mettre à jour la configuration, afin que la désactivation ou la suppression d'un compte ne laisse pas l'ancien écouteur actif jusqu'au redémarrage.

Les interfaces d'ajout non interactives courantes incluent :

- channels de jeton de bot : `--token`, `--bot-token`, `--app-token`, `--token-file`
- Champs de transport Signal/iMessage : SignaliMessage`--signal-number`, `--cli-path`, `--http-url`, `--http-host`, `--http-port`, `--db-path`, `--service`, `--region`
- Champs Google Chat : Google Chat`--webhook-path`, `--webhook-url`, `--audience-type`, `--audience`
- Champs Matrix : Matrix`--homeserver`, `--user-id`, `--access-token`, `--password`, `--device-name`, `--initial-sync-limit`
- Champs Nostr : Nostr`--private-key`, `--relay-urls`
- Champs Tlon : Tlon`--ship`, `--url`, `--code`, `--group-channels`, `--dm-allowlist`, `--auto-discover-channels`
- `--use-env` pour l'authentification par env du compte par défaut lorsque prise en charge

Si un plugin de channel doit être installé lors d'une commande d'ajout pilotée par des indicateurs, OpenClaw utilise la source d'installation par défaut du channel sans ouvrir l'invite d'installation interactive du plugin.

Lorsque vous exécutez `openclaw channels add` sans indicateurs, l'assistant interactif peut inviter :

- les identifiants de compte par channel sélectionné
- les noms d'affichage facultatifs pour ces comptes
- `Route these channel accounts to agents now?`

Si vous confirmez la liaison maintenant, l'assistant demande quel agent doit être propriétaire de chaque compte de channel configuré et écrit les liaisons de routage étendues au compte.

Vous pouvez également gérer les mêmes règles de routage ultérieurement avec `openclaw agents bindings`, `openclaw agents bind` et `openclaw agents unbind` (voir [agents](/fr/cli/agents)).

Lorsque vous ajoutez un compte non par défaut à un channel qui utilise encore des paramètres de niveau supérieur à compte unique, OpenClaw promeut les valeurs de niveau supérieur étendues au compte dans la carte des comptes du channel avant d'écrire le nouveau compte. La plupart des canaux placent ces valeurs dans OpenClaw`channels.<channel>.accounts.default`Matrix, mais les canaux regroupés peuvent préserver à la place un compte promu correspondant existant. Matrix est l'exemple actuel : si un compte nommé existe déjà, ou si `defaultAccount` pointe vers un compte nommé existant, la promotion préserve ce compte au lieu d'en créer un nouveau `accounts.default`.

Le comportement du routage reste cohérent :

- Les liaisons existantes réservées au channel (sans `accountId`) continuent de correspondre au compte par défaut.
- `channels add` ne crée ni ne réécrit pas automatiquement les liaisons en mode non interactif.
- La configuration interactive peut ajouter facultativement des liaisons délimitées au compte.

Si votre configuration était déjà dans un état mixte (comptes nommés présents et valeurs de niveau supérieur à compte unique toujours définies), exécutez `openclaw doctor --fix` pour déplacer les valeurs étendues au compte dans le compte promu choisi pour ce channel. La plupart des canaux promeut vers `accounts.default`Matrix ; Matrix peut préserver à la place une cible nommée/défaut existante.

## Connexion et déconnexion (interactif)

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

- `channels login` prend en charge `--verbose`.
- `channels login` et `logout` peuvent déduire le channel lorsqu'une seule cible de connexion prise en charge est configurée.
- `channels logout`GatewayGateway préfère le chemin du Gateway actif lorsqu'il est accessible, donc la déconnexion arrête tout écouteur actif avant d'effacer l'état d'authentification du channel. Si un Gateway local n'est pas accessible, il revient au nettoyage de l'authentification locale.
- Exécutez `channels login` à partir d'un terminal sur l'hôte de la passerelle. L'agent `exec` bloque ce flux de connexion interactif ; les outils de connexion d'agent natifs du channel, tels que `whatsapp_login`, doivent être utilisés à partir du chat lorsque disponibles.

## Dépannage

- Exécutez `openclaw status --deep` pour une sonde large.
- Utilisez `openclaw doctor` pour des corrections guidées.
- `openclaw channels list` n'imprime plus les instantanés d'utilisation/de quota des providers de modèles. Pour cela, utilisez `openclaw status` (vue d'ensemble) ou `openclaw models list` (par provider).
- `openclaw channels status` revient à des résumés basés uniquement sur la configuration lorsque la passerelle est inaccessible. Si une information d'identification de channel prise en charge est configurée via SecretRef mais indisponible dans le chemin de commande actuel, elle signale ce compte comme configuré avec des notes dégradées au lieu de l'afficher comme non configuré.

## Sonde de capacités

Récupérez les indices de capacités du provider (intentions/scopes lorsque disponibles) plus la prise en charge des fonctionnalités statiques :

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

Notes :

- `--channel` est facultatif ; omettez-le pour lister chaque channel (y compris les extensions).
- `--account` n'est valide qu'avec `--channel`.
- `--target` accepte `channel:<id>` ou un identifiant numérique de channel brut et ne s'applique qu'à Discord. Pour les channels vocaux Discord, les indicateurs de vérification des autorisations manquent `ViewChannel`, `Connect`, `Speak`, `SendMessages` et `ReadMessageHistory`.
- Les sondes sont spécifiques au fournisseur : intentions Discord + autorisations de channel facultatives ; portées bot + utilisateur Slack ; indicateurs bot + webhook Telegram ; version du démon Signal ; jeton d'application + rôles/portées Graph Microsoft Teams (annotés si connus). Les channels sans sondes signalent `Probe: unavailable`.

## Résoudre les noms en ID

Résoudre les noms de canal/utilisateur en ID à l'aide de l'annuaire du fournisseur :

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

Notes :

- Utilisez `--kind user|group|auto` pour forcer le type cible.
- La résolution privilégie les correspondances actives lorsque plusieurs entrées partagent le même nom.
- `channels resolve` est en lecture seule. Si un compte sélectionné est configuré via SecretRef mais que cette information d'identification n'est pas disponible dans le chemin de commande actuel, la commande renvoie des résultats non résolus dégradés avec des notes au lieu d'interrompre l'exécution complète.
- `channels resolve` n'installe pas les plugins de channel. Utilisez `channels add --channel <name>` avant de résoudre les noms pour un channel de catalogue installable.

## Connexes

- [Référence CLI](/fr/cli)
- [Aperçu des Channels](/fr/channels)
