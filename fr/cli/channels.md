---
summary: "Référence CLI pour `openclaw channels` (comptes, statut, connexion/déconnexion, journaux)"
read_when:
  - You want to add/remove channel accounts (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage)
  - You want to check channel status or tail channel logs
title: "channels"
---

# `openclaw channels`

Gérer les comptes de channel de chat et leur statut d'exécution sur le Gateway.

Documentation associée :

- Guides de channel : [Channels](/fr/channels/index)
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
openclaw channels remove --channel telegram --delete
```

Conseil : `openclaw channels add --help` affiche les indicateurs par channel (jeton, jeton d'application, chemins signal-cli, etc.).

Lorsque vous exécutez `openclaw channels add` sans indicateurs, l'assistant interactif peut demander :

- les identifiants de compte pour chaque channel sélectionné
- les noms d'affichage facultatifs pour ces comptes
- `Bind configured channel accounts to agents now?`

Si vous confirmez la liaison maintenant, l'assistant demande quel agent doit posséder chaque compte de channel configuré et écrit les liaisons de routage délimitées au compte.

Vous pouvez également gérer les mêmes règles de routage ultérieurement avec `openclaw agents bindings`, `openclaw agents bind` et `openclaw agents unbind` (voir [agents](/fr/cli/agents)).

Lorsque vous ajoutez un compte non par défaut à un channel qui utilise encore des paramètres de niveau supérieur à compte unique (pas encore d'entrées `channels.<channel>.accounts`), OpenClaw déplace les valeurs de niveau supérieur à compte unique délimitées au compte dans `channels.<channel>.accounts.default`, puis écrit le nouveau compte. Cela préserve le comportement du compte d'origine lors du passage à la structure multi-comptes.

Le comportement de routage reste cohérent :

- Les liaisons existantes uniquement pour le channel (pas de `accountId`) continuent de correspondre au compte par défaut.
- `channels add` ne crée ni ne réécrit automatiquement les liaisons en mode non interactif.
- La configuration interactive peut éventuellement ajouter des liaisons délimitées au compte.

Si votre configuration était déjà dans un état mixte (comptes nommés présents, `default` manquant, et valeurs de compte unique de niveau supérieur toujours définies), exécutez `openclaw doctor --fix` pour déplacer les valeurs scoped du compte dans `accounts.default`.

## Connexion / déconnexion (interactif)

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

## Dépannage

- Exécutez `openclaw status --deep` pour une sonde large.
- Utilisez `openclaw doctor` pour des correctifs guidés.
- `openclaw channels list` imprime `Claude: HTTP 403 ... user:profile` → le snapshot d'utilisation nécessite le scope `user:profile`. Utilisez `--no-usage`, ou fournissez une clé de session claude.ai (`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`), ou réauthentifiez-vous via Claude Code CLI.
- `openclaw channels status` revient à des résumés basés uniquement sur la configuration lorsque la passerelle est inaccessible. Si une information d'identification de canal prise en charge est configurée via SecretRef mais non disponible dans le chemin de commande actuel, elle signale ce compte comme configuré avec des notes dégradées au lieu de l'afficher comme non configuré.

## Sonde de capacités

Récupérer les indices de capacité du fournisseur (intents/scopes où disponible) ainsi que la prise en charge des fonctionnalités statiques :

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

Notes :

- `--channel` est optionnel ; omettez-le pour lister chaque canal (y compris les extensions).
- `--target` accepte `channel:<id>` ou un identifiant de canal numérique brut et ne s'applique qu'à Discord.
- Les sondes sont spécifiques au fournisseur : intents Discord + autorisations de canal optionnelles ; scopes bot + utilisateur Slack ; drapeaux bot + webhook Telegram ; version du démon Signal ; jeton d'application MS Teams + rôles/scopes Graph (annotés si connus). Les canaux sans sondes signalent `Probe: unavailable`.

## Résoudre les noms en IDs

Résoudre les noms de canal/utilisateur en IDs en utilisant l'annuaire du fournisseur :

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

Notes :

- Utilisez `--kind user|group|auto` pour forcer le type cible.
- La résolution préfère les correspondances actives lorsque plusieurs entrées partagent le même nom.
- `channels resolve` est en lecture seule. Si un compte sélectionné est configuré via SecretRef mais que cet identifiant n'est pas disponible dans le chemin de commande actuel, la commande renvoie des résultats dégradés non résolus avec des notes au lieu d'interrompre l'exécution entière.

import fr from '/components/footer/fr.mdx';

<fr />
