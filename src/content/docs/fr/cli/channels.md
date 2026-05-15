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

- Guides des canaux : [Canaux](/fr/channels)
- Configuration du Gateway : [Configuration](/fr/gateway/configuration)

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

- `channels status` : `--probe`, `--timeout <ms>`, `--json`
- `channels capabilities` : `--channel <name>`, `--account <id>` (uniquement avec `--channel`), `--target <dest>`, `--timeout <ms>`, `--json`
- `channels resolve` : `<entries...>`, `--channel <name>`, `--account <id>`, `--kind <auto|user|group>`, `--json`
- `channels logs` : `--channel <name|all>`, `--lines <n>`, `--json`

`channels status --probe` est le chemin en direct : sur une passerelle accessible, il exécute des vérifications `probeAccount` et `auditAccount` optionnelles par compte, de sorte que la sortie peut inclure l'état du transport ainsi que les résultats des sondages tels que `works`, `probe failed`, `audit ok` ou `audit failed`.
Si la passerelle est inaccessible, `channels status` revient à des résumés basés uniquement sur la configuration
au lieu de la sortie du sondage en direct.

N'utilisez pas `openclaw sessions`, le Gateway `sessions.list`, ou l'outil `sessions_list` de l'agent comme signal de santé de socket de channel. Ces surfaces signalent les lignes de conversation stockées, et non l'état d'exécution du provider. Après un redémarrage du provider Discord, un compte connecté mais silencieux peut être sain alors qu'aucune ligne de session Discord n'apparaît jusqu'au prochain événement de conversation entrant ou sortant.

## Ajouter / supprimer des comptes

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

<Tip>`openclaw channels add --help` affiche les indicateurs par channel (jeton, clé privée, jeton d'application, chemins signal-cli, etc.).</Tip>

`channels remove` opère uniquement sur les plugins de channel installés/configurés. Utilisez d'abord `channels add` pour les channels du catalogue installables.
Pour les plugins de channel pris en charge par le runtime, `channels remove` demande également au Gateway en cours d'exécution d'arrêter le compte sélectionné avant de mettre à jour la configuration, afin que la désactivation ou la suppression d'un compte ne laisse pas l'ancien écouteur actif jusqu'au redémarrage.

Les interfaces d'ajout non interactives courantes incluent :

- channels par jeton de bot : `--token`, `--bot-token`, `--app-token`, `--token-file`
- Champs de transport Signal/iMessage : SignaliMessage`--signal-number`, `--cli-path`, `--http-url`, `--http-host`, `--http-port`, `--db-path`, `--service`, `--region`
- Champs Google Chat : Google Chat`--webhook-path`, `--webhook-url`, `--audience-type`, `--audience`
- Champs Matrix : Matrix`--homeserver`, `--user-id`, `--access-token`, `--password`, `--device-name`, `--initial-sync-limit`
- Champs Nostr : Nostr`--private-key`, `--relay-urls`
- Champs Tlon : Tlon`--ship`, `--url`, `--code`, `--group-channels`, `--dm-allowlist`, `--auto-discover-channels`
- `--use-env` pour l'authentification par défaut basée sur les variables d'environnement, lorsque pris en charge

Si un plugin de channel doit être installé lors d'une commande d'ajout pilotée par des indicateurs, OpenClaw utilise la source d'installation par défaut du channel sans ouvrir l'invite d'installation interactive du plugin.

Lorsque vous exécutez `openclaw channels add` sans indicateurs, l'assistant interactif peut demander :

- les identifiants de compte par channel sélectionné
- les noms d'affichage facultatifs pour ces comptes
- `Route these channel accounts to agents now?`

Si vous confirmez la liaison maintenant, l'assistant demande quel agent doit être propriétaire de chaque compte de channel configuré et écrit les liaisons de routage étendues au compte.

Vous pouvez également gérer les mêmes règles de routage ultérieurement avec `openclaw agents bindings`, `openclaw agents bind` et `openclaw agents unbind` (voir [agents](/fr/cli/agents)).

Lorsque vous ajoutez un compte non par défaut à un channel qui utilise encore des paramètres de niveau supérieur à compte unique, OpenClaw promeut les valeurs de niveau supérieur limitées au compte dans la table des comptes du channel avant d'écrire le nouveau compte. La plupart des channels stockent ces valeurs dans `channels.<channel>.accounts.default`, mais les channels groupés peuvent préserver un compte promu correspondant existant à la place. Matrix est l'exemple actuel : si un compte nommé existe déjà, ou si `defaultAccount` pointe vers un compte nommé existant, la promotion préserve ce compte au lieu d'en créer un nouveau `accounts.default`.

Le comportement du routage reste cohérent :

- Les liaisons existantes de canal uniquement (sans `accountId`) continuent de correspondre au compte par défaut.
- `channels add` ne crée pas automatiquement ni ne réécrit les liaisons en mode non interactif.
- La configuration interactive peut ajouter facultativement des liaisons délimitées au compte.

Si votre configuration était déjà dans un état mixte (comptes nommés présents et valeurs de compte unique de niveau supérieur toujours définies), exécutez `openclaw doctor --fix` pour déplacer les valeurs limitées au compte vers le compte promu choisi pour ce channel. La plupart des channels promeuvent vers `accounts.default`Matrix ; Matrix peut conserver à la place une cible nommée/défaut existante.

## Connexion et déconnexion (interactif)

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

- `channels login` prend en charge `--verbose`.
- `channels login` et `logout` peuvent déduire le channel lorsqu'une seule cible de connexion prise en charge est configurée.
- `channels logout`GatewayGateway préfère le chemin du Gateway en direct lorsqu'il est accessible, de sorte que la déconnexion arrête tout écouteur actif avant d'effacer l'état d'authentification du channel. Si un Gateway local n'est pas accessible, il revient au nettoyage de l'authentification locale.
- Exécutez `channels login` depuis un terminal sur l'hôte du gateway. L'agent `exec` bloque ce flux de connexion interactif ; les outils de connexion d'agent natifs du channel, tels que `whatsapp_login`, doivent être utilisés depuis le chat lorsque disponibles.

## Dépannage

- Exécutez `openclaw status --deep` pour une sonde large.
- Utilisez `openclaw doctor` pour des réparations guidées.
- `openclaw channels list` n'imprime plus les instantanés d'utilisation/quota de provider de model. Pour ceux-ci, utilisez `openclaw status` (vue d'ensemble) ou `openclaw models list` (par provider).
- `openclaw channels status` revient à des résumés basés uniquement sur la configuration lorsque le gateway est inaccessible. Si une identifiant de channel pris en charge est configuré via SecretRef mais indisponible dans le chemin de commande actuel, il signale ce compte comme configuré avec des notes dégradées au lieu de l'afficher comme non configuré.

## Sonde de capacités

Récupérez les indices de capacités du provider (intentions/scopes lorsque disponibles) plus la prise en charge des fonctionnalités statiques :

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

Notes :

- `--channel` est facultatif ; omettez-le pour lister chaque channel (y compris les extensions).
- `--account` n'est valide qu'avec `--channel`.
- `--target` accepte `channel:<id>` ou un identifiant de canal numérique brut et ne s'applique qu'à Discord. Pour les canaux vocaux Discord, les indicateurs de vérification des autorisations manquent `ViewChannel`, `Connect`, `Speak`, `SendMessages` et `ReadMessageHistory`.
- Les sondages sont spécifiques au fournisseur : intentions Discord + autorisations de canal optionnelles ; étendues de bot et d'utilisateur Slack ; indicateurs de bot Telegram + webhook ; version du démon Signal ; jeton d'application Microsoft Teams + rôles/étendues Graph (annotés lorsque connus). Les canaux sans sondage signalent `Probe: unavailable`.

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
- `channels resolve` est en lecture seule. Si un compte sélectionné est configuré via SecretRef mais que ces informations d'identification ne sont pas disponibles dans le chemin de commande actuel, la commande renvoie des résultats non résolus dégradés avec des notes au lieu d'interrompre l'exécution entière.
- `channels resolve` n'installe pas les plugins de canal. Utilisez `channels add --channel <name>` avant de résoudre les noms pour un canal de catalogue installable.

## Connexes

- [Référence CLI](/fr/cli)
- [Aperçu des canaux](/fr/channels)
