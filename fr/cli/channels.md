---
summary: "Référence de la CLI pour `openclaw channels` (comptes, statut, connexion/déconnexion, journaux)"
read_when:
  - Vous souhaitez ajouter/supprimer des comptes de channel (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage)
  - Vous souhaitez vérifier le statut du channel ou suivre les journaux du channel
title: "channels"
---

# `openclaw channels`

Gérer les comptes de channel de discussion et leur statut d'exécution sur le Gateway.

Documentation connexe :

- Guides de channels : [Channels](/fr/channels/index)
- Configuration du Gateway : [Configuration](/fr/gateway/configuration)

## Commandes courantes

```bash
openclaw channels list
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

## Ajouter / supprimer des comptes

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

Astuce : `openclaw channels add --help` affiche les indicateurs par channel (jeton, clé privée, jeton d'application, chemins signal-cli, etc).

Lorsque vous exécutez `openclaw channels add` sans indicateurs, l'assistant interactif peut demander :

- identifiants de compte par channel sélectionné
- noms d'affichage facultatifs pour ces comptes
- `Bind configured channel accounts to agents now?`

Si vous confirmez la liaison maintenant, l'assistant demande quel agent doit posséder chaque compte de channel configuré et écrit les liaisons de routage limitées au compte.

Vous pouvez également gérer les mêmes règles de routage ultérieurement avec `openclaw agents bindings`, `openclaw agents bind` et `openclaw agents unbind` (voir [agents](/fr/cli/agents)).

Lorsque vous ajoutez un compte non par défaut à un channel qui utilise encore des paramètres de premier niveau à compte unique (pas encore d'entrées `channels.<channel>.accounts`), OpenClaw déplace les valeurs de premier niveau à compte unique limitées au compte vers `channels.<channel>.accounts.default`, puis écrit le nouveau compte. Cela préserve le comportement du compte d'origine tout en passant à la structure multi-comptes.

Le comportement du routage reste cohérent :

- Les liaisons existantes de channel uniquement (pas de `accountId`) continuent à correspondre au compte par défaut.
- `channels add` ne crée ni ne réécrit automatiquement les liaisons en mode non interactif.
- La configuration interactive peut ajouter facultativement des liaisons limitées au compte.

Si votre configuration était déjà dans un état mixte (comptes nommés présents, `default` manquant, et valeurs de premier niveau à compte unique toujours définies), exécutez `openclaw doctor --fix` pour déplacer les valeurs limitées au compte vers `accounts.default`.

## Connexion / déconnexion (interactif)

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

## Dépannage

- Exécutez `openclaw status --deep` pour une sonde générale.
- Utilisez `openclaw doctor` pour des réparations guidées.
- `openclaw channels list` affiche `Claude: HTTP 403 ... user:profile` → l'instantané d'utilisation nécessite la portée `user:profile`. Utilisez `--no-usage`, fournissez une clé de session claude.ai (`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`), ou réauthentifiez-vous via le CLI Claude Code.
- `openclaw channels status` revient par défaut à des résumés basés sur la configuration lorsque la passerelle est injoignable. Si des identifiants de channel pris en charge sont configurés via SecretRef mais indisponibles dans le chemin de commande actuel, le compte est signalé comme configuré avec des notes dégradées au lieu d'être affiché comme non configuré.

## Sonde de capacités

Récupérez les indices de capacités du provider (intents/portées si disponibles) ainsi que la prise en charge des fonctionnalités statiques :

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

Notes :

- `--channel` est facultatif ; omettez-le pour lister chaque channel (y compris les extensions).
- `--target` accepte `channel:<id>` ou un identifiant de channel numérique brut et ne s'applique qu'à Discord.
- Les sondes sont spécifiques au provider : intents Discord + autorisations de channel facultatives ; portées de bot et d'utilisateur Slack ; indicateurs de bot Telegram + webhook ; version du démon Signal ; jeton d'application MS Teams + rôles/portées Graph (annotés si connus). Les channels sans sondes signalent `Probe: unavailable`.

## Résoudre les noms en identifiants

Résolvez les noms de channel/utilisateur en identifiants à l'aide de l'annuaire du provider :

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

Notes :

- Utilisez `--kind user|group|auto` pour forcer le type cible.
- La résolution privilégie les correspondances actives lorsque plusieurs entrées partagent le même nom.
- `channels resolve` est en lecture seule. Si un compte sélectionné est configuré via SecretRef mais que cet identifiant est indisponible dans le chemin de commande actuel, la commande renvoie des résultats non résolus dégradés avec des notes au lieu d'interrompre l'exécution entière.

import en from "/components/footer/en.mdx";

<en />
