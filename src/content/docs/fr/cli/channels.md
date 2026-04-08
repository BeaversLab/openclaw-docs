---
summary: "Référence CLI pour `openclaw channels` (comptes, statut, connexion/déconnexion, journaux)"
read_when:
  - You want to add/remove channel accounts (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Matrix)
  - You want to check channel status or tail channel logs
title: "channels"
---

# `openclaw channels`

Gérer les comptes de channel de chat et leur statut d'exécution sur le Gateway.

Documentation associée :

- Guides de channel : [Channels](/en/channels/index)
- Configuration du Gateway : [Configuration](/en/gateway/configuration)

## Commandes courantes

```bash
openclaw channels list
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

## Statut / capacités / résolution / journaux

- `channels status` : `--probe`, `--timeout <ms>`, `--json`
- `channels capabilities` : `--channel <name>`, `--account <id>` (uniquement avec `--channel`), `--target <dest>`, `--timeout <ms>`, `--json`
- `channels resolve` : `<entries...>`, `--channel <name>`, `--account <id>`, `--kind <auto|user|group>`, `--json`
- `channels logs` : `--channel <name|all>`, `--lines <n>`, `--json`

`channels status --probe` est le chemin en direct : sur un Gateway joignable, il exécute par compte
`probeAccount` et des vérifications optionnelles `auditAccount`, donc la sortie peut inclure l'état du transport
ainsi que les résultats des sondages tels que `works`, `probe failed`, `audit ok`, ou `audit failed`.
Si le Gateway est injoignable, `channels status` revient à des résumés basés uniquement sur la configuration
au lieu de la sortie du sondage en direct.

## Ajouter / supprimer des comptes

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

Conseil : `openclaw channels add --help` affiche les indicateurs par channel (jeton, clé privée, jeton d'application, chemins signal-cli, etc).

Les interfaces d'ajout non interactives courantes incluent :

- channels à jeton de bot : `--token`, `--bot-token`, `--app-token`, `--token-file`
- Champs de transport Signal/iMessage : `--signal-number`, `--cli-path`, `--http-url`, `--http-host`, `--http-port`, `--db-path`, `--service`, `--region`
- Google Chat champs : `--webhook-path`, `--webhook-url`, `--audience-type`, `--audience`
- Matrix champs : `--homeserver`, `--user-id`, `--access-token`, `--password`, `--device-name`, `--initial-sync-limit`
- Nostr champs : `--private-key`, `--relay-urls`
- Tlon champs : `--ship`, `--url`, `--code`, `--group-channels`, `--dm-allowlist`, `--auto-discover-channels`
- `--use-env` pour l'authentification par env default-account lorsque prise en charge

Lorsque vous exécutez `openclaw channels add` sans indicateurs, l'assistant interactif peut demander :

- identifiants de compte par channel sélectionné
- noms d'affichage facultatifs pour ces comptes
- `Bind configured channel accounts to agents now?`

Si vous confirmez la liaison maintenant, l'assistant demande quel agent doit posséder chaque compte de channel configuré et écrit les liaisons de routage délimitées au compte.

Vous pouvez également gérer les mêmes règles de routage ultérieurement avec `openclaw agents bindings`, `openclaw agents bind` et `openclaw agents unbind` (voir [agents](/en/cli/agents)).

Lorsque vous ajoutez un compte non par défaut à un channel qui utilise encore des paramètres de niveau supérieur à compte unique, OpenClaw promeut les valeurs de niveau supérieur délimitées au compte dans la carte de comptes du channel avant d'écrire le nouveau compte. La plupart des channels placent ces valeurs dans `channels.<channel>.accounts.default`, mais les channels groupés peuvent conserver à la place un compte promu existant correspondant. Matrix est l'exemple actuel : si un compte nommé existe déjà, ou si `defaultAccount` pointe vers un compte nommé existant, la promotion conserve ce compte au lieu d'en créer un nouveau `accounts.default`.

Le comportement de routage reste cohérent :

- Les liaisons channel uniquement existantes (pas `accountId`) continuent à correspondre au compte par défaut.
- `channels add` ne crée pas ou ne réécrit pas automatiquement les liaisons en mode non interactif.
- La configuration interactive peut ajouter facultativement des liaisons délimitées au compte.

Si votre configuration était déjà dans un état mixte (comptes nommés présents et valeurs de compte unique de niveau supérieur toujours définies), exécutez `openclaw doctor --fix` pour déplacer les valeurs délimitées au compte dans le compte promu choisi pour ce channel. La plupart des channels promeuvent vers `accounts.default`; Matrix peut conserver à la place une cible nommée/définie par défaut existante.

## Login / logout (interactif)

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

Notes :

- `channels login` prend en charge `--verbose`.
- `channels login` / `logout` peut déduire le channel lorsqu'une seule cible de connexion prise en charge est configurée.

## Dépannage

- Exécutez `openclaw status --deep` pour une sonde globale.
- Utilisez `openclaw doctor` pour des corrections guidées.
- `openclaw channels list` affiche `Claude: HTTP 403 ... user:profile` → l'instantané d'utilisation nécessite la portée `user:profile`. Utilisez `--no-usage`, ou fournissez une clé de session claude.ai (`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`), ou réauthentifiez-vous via Claude CLI.
- `openclaw channels status` revient à des résumés basés uniquement sur la configuration lorsque la passerelle est inaccessible. Si des identifiants de channel pris en charge sont configurés via SecretRef mais indisponibles dans le chemin de commande actuel, il signale ce compte comme configuré avec des notes dégradées au lieu de l'afficher comme non configuré.

## Sonde de capacités

Récupérer les indices de capacité du provider (intentions/portées si disponibles) ainsi que la prise en charge des fonctionnalités statiques :

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

Notes :

- `--channel` est facultatif ; omettez-le pour lister chaque channel (y compris les extensions).
- `--account` n'est valide qu'avec `--channel`.
- `--target` accepte `channel:<id>` ou un identifiant de channel numérique brut et ne s'applique qu'à Discord.
- Les sondes sont spécifiques au provider : intentions Discord + autorisations de canal facultatives ; portées bot et utilisateur Slack ; indicateurs bot + webhook Telegram ; version du démon Signal ; jeton d'application + rôles/portées Graph Microsoft Teams (annotés si connus). Les channels sans sondes signalent `Probe: unavailable`.

## Résoudre les noms en identifiants

Résoudre les noms de canal/utilisateur en identifiants à l'aide de l'annuaire du provider :

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

Notes :

- Utilisez `--kind user|group|auto` pour forcer le type de cible.
- La résolution privilégie les correspondances actives lorsque plusieurs entrées partagent le même nom.
- `channels resolve` est en lecture seule. Si un compte sélectionné est configuré via SecretRef mais que ces informations d'identification ne sont pas disponibles dans le chemin de commande actuel, la commande renvoie des résultats non résolus dégradés avec des notes au lieu d'interrompre toute l'exécution.
