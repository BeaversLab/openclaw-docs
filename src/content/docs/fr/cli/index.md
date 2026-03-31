---
summary: "OpenClaw CLI reference for `openclaw` commands, subcommands, and options"
read_when:
  - Adding or modifying CLI commands or options
  - Documenting new command surfaces
title: "Référence CLI"
---

# Référence de la CLI

Cette page décrit le comportement actuel de la CLI. Si les commandes changent, mettez à jour cette documentation.

## Pages de commandes

- [`setup`](/en/cli/setup)
- [`onboard`](/en/cli/onboard)
- [`configure`](/en/cli/configure)
- [`config`](/en/cli/config)
- [`completion`](/en/cli/completion)
- [`doctor`](/en/cli/doctor)
- [`dashboard`](/en/cli/dashboard)
- [`backup`](/en/cli/backup)
- [`reset`](/en/cli/reset)
- [`uninstall`](/en/cli/uninstall)
- [`update`](/en/cli/update)
- [`message`](/en/cli/message)
- [`agent`](/en/cli/agent)
- [`agents`](/en/cli/agents)
- [`acp`](/en/cli/acp)
- [`mcp`](/en/cli/mcp)
- [`status`](/en/cli/status)
- [`health`](/en/cli/health)
- [`sessions`](/en/cli/sessions)
- [`gateway`](/en/cli/gateway)
- [`logs`](/en/cli/logs)
- [`system`](/en/cli/system)
- [`models`](/en/cli/models)
- [`memory`](/en/cli/memory)
- [`directory`](/en/cli/directory)
- [`nodes`](/en/cli/nodes)
- [`devices`](/en/cli/devices)
- [`node`](/en/cli/node)
- [`approvals`](/en/cli/approvals)
- [`sandbox`](/en/cli/sandbox)
- [`tui`](/en/cli/tui)
- [`browser`](/en/cli/browser)
- [`cron`](/en/cli/cron)
- [`dns`](/en/cli/dns)
- [`docs`](/en/cli/docs)
- [`hooks`](/en/cli/hooks)
- [`webhooks`](/en/cli/webhooks)
- [`pairing`](/en/cli/pairing)
- [`qr`](/en/cli/qr)
- [`plugins`](/en/cli/plugins) (commandes de plugin)
- [`channels`](/en/cli/channels)
- [`security`](/en/cli/security)
- [`secrets`](/en/cli/secrets)
- [`skills`](/en/cli/skills)
- [`daemon`](/en/cli/daemon) (alias hérité pour les commandes de service de passerelle)
- [`clawbot`](/en/cli/clawbot) (espace de noms d'alias hérité)
- [`voicecall`](/en/cli/voicecall) (plugin ; si installé)

## Indicateurs globaux

- `--dev` : isole l'état sous `~/.openclaw-dev` et décale les ports par défaut.
- `--profile <name>` : isoler l'état sous `~/.openclaw-<name>`.
- `--no-color` : désactive les couleurs ANSI.
- `--update` : abréviation de `openclaw update` (installations depuis les sources uniquement).
- `-V`, `--version`, `-v` : afficher la version et quitter.

## Style de sortie

- Les couleurs ANSI et les indicateurs de progression ne s'affichent que dans les sessions TTY.
- Les hyperliens OSC-8 s'affichent sous forme de liens cliquables dans les terminaux pris en charge ; sinon, nous revenons aux URL simples.
- `--json` (et `--plain` lorsque pris en charge) désactive le style pour une sortie propre.
- `--no-color` désactive le style ANSI ; `NO_COLOR=1` est également respecté.
- Les commandes longue durée affichent un indicateur de progression (OSC 9;4 lorsque pris en charge).

## Palette de couleurs

OpenClaw utilise une palette de homard pour la sortie CLI.

- `accent` (#FF5A2D) : titres, étiquettes, principales mises en évidence.
- `accentBright` (#FF7A3D) : noms de commande, emphase.
- `accentDim` (#D14A22) : texte de surbrillance secondaire.
- `info` (#FF8A5B) : valeurs d'information.
- `success` (#2FBF71) : états de réussite.
- `warn` (#FFB020) : avertissements, solutions de repli, attention.
- `error` (#E23D2D) : erreurs, échecs.
- `muted` (#8B7F77) : atténué, métadonnées.

Palette source de vérité : `src/terminal/palette.ts` (la « palette homard »).

## Arborescence des commandes

```
openclaw [--dev] [--profile <name>] <command>
  setup
  onboard
  configure
  config
    get
    set
    unset
    file
    validate
  completion
  doctor
  dashboard
  backup
    create
    verify
  security
    audit
  secrets
    reload
    audit
    configure
    apply
  reset
  uninstall
  update
  channels
    list
    status
    logs
    add
    remove
    login
    logout
  directory
  skills
    list
    info
    check
  plugins
    list
    inspect
    install
    uninstall
    update
    enable
    disable
    doctor
    marketplace list
  memory
    status
    index
    search
  message
    send
    broadcast
  agent
  agents
    list
    add
    delete
  acp
  mcp
  status
  health
  sessions
  gateway
    call
    health
    status
    probe
    discover
    install
    uninstall
    start
    stop
    restart
    run
  daemon
    status
    install
    uninstall
    start
    stop
    restart
  logs
  system
    event
    heartbeat last|enable|disable
    presence
  models
    list
    status
    set
    set-image
    aliases list|add|remove
    fallbacks list|add|remove|clear
    image-fallbacks list|add|remove|clear
    scan
    auth add|setup-token|paste-token
    auth order get|set|clear
  sandbox
    list
    recreate
    explain
  cron
    status
    list
    add
    edit
    rm
    enable
    disable
    runs
    run
  nodes
  devices
  node
    run
    status
    install
    uninstall
    start
    stop
    restart
  approvals
    get
    set
    allowlist add|remove
  browser
    status
    start
    stop
    reset-profile
    tabs
    open
    focus
    close
    profiles
    create-profile
    delete-profile
    screenshot
    snapshot
    navigate
    resize
    click
    type
    press
    hover
    drag
    select
    upload
    fill
    dialog
    wait
    evaluate
    console
    pdf
  hooks
    list
    info
    check
    enable
    disable
    install
    update
  webhooks
    gmail setup|run
  pairing
    list
    approve
  qr
  clawbot
    qr
  docs
  dns
    setup
  tui
```

Remarque : les plugins peuvent ajouter des commandes de premier niveau supplémentaires (par exemple `openclaw voicecall`).

## Sécurité

- `openclaw security audit` — audit de la configuration + de l'état local pour les pièges de sécurité courants.
- `openclaw security audit --deep` — sonde en direct du Gateway au mieux.
- `openclaw security audit --fix` — renforcer les valeurs par défaut sécurisées et chmod state/config.

## Secrets

- `openclaw secrets reload` — résout à nouveau les références et échange atomiquement l'instantané d'exécution.
- `openclaw secrets audit` — rechercher des résidus en texte brut, des références non résolues et des dérives de priorité (`--allow-exec` pour exécuter les fournisseurs exec lors de l'audit).
- `openclaw secrets configure` — assistant interactif pour la configuration du fournisseur + mappage SecretRef + pré-vérification/application (`--allow-exec` pour exécuter les fournisseurs exec lors des flux de pré-vérification et d'application contenant exec).
- `openclaw secrets apply --from <plan.json>` — appliquer un plan précédemment généré (`--dry-run` pris en charge ; utilisez `--allow-exec` pour autoriser les fournisseurs d'exécution dans les simulations et les plans d'écriture contenant des exécutions).

## Plugins

Gérer les extensions et leur configuration :

- `openclaw plugins list` — découvrir les plugins (utilisez `--json` pour la sortie machine).
- `openclaw plugins inspect <id>` — afficher les détails d'un plugin (`info` est un alias).
- `openclaw plugins install <path|.tgz|npm-spec|plugin@marketplace>` — installer un plugin (ou ajouter un chemin de plugin à `plugins.load.paths`).
- `openclaw plugins marketplace list <marketplace>` — lister les entrées du marketplace avant l'installation.
- `openclaw plugins enable <id>` / `disable <id>` — activer `plugins.entries.<id>.enabled`.
- `openclaw plugins doctor` — signaler les erreurs de chargement des plugins.

La plupart des modifications de plugins nécessitent un redémarrage de la passerelle. Voir [/plugin](/en/tools/plugin).

## Mémoire

Recherche vectorielle sur `MEMORY.md` + `memory/*.md` :

- `openclaw memory status` — afficher les statistiques de l'index.
- `openclaw memory index` — réindexer les fichiers de mémoire.
- `openclaw memory search "<query>"` (ou `--query "<query>"`) — recherche sémantique dans la mémoire.

## Commandes slash de chat

Les messages de chat prennent en charge les commandes `/...` (texte et natives). Voir [/tools/slash-commands](/en/tools/slash-commands).

Points forts :

- `/status` pour un diagnostic rapide.
- `/config` pour les modifications persistantes de la configuration.
- `/debug` pour les substitutions de configuration uniquement au moment de l'exécution (en mémoire, pas sur disque ; nécessite `commands.debug: true`).

## Configuration + onboarding

### `setup`

Initialiser la config + l'espace de travail.

Options :

- `--workspace <dir>` : chemin de l'espace de travail de l'agent (par défaut `~/.openclaw/workspace`).
- `--wizard` : exécuter l’onboarding.
- `--non-interactive` : exécuter l’onboarding sans invites.
- `--mode <local|remote>` : mode d’onboarding.
- `--remote-url <url>` : URL distante du Gateway.
- `--remote-token <token>` : jeton distant du Gateway.

L'onboarding s'exécute automatiquement lorsque des indicateurs d'onboarding sont présents (`--non-interactive`, `--mode`, `--remote-url`, `--remote-token`).

### `onboard`

Onboarding interactif pour la passerelle, l'espace de travail et les compétences.

Options :

- `--workspace <dir>`
- `--reset` (réinitialiser la configuration + les identifiants + les sessions avant l'onboarding)
- `--reset-scope <config|config+creds+sessions|full>` (par défaut `config+creds+sessions`; utilisez `full` pour également supprimer l'espace de travail)
- `--non-interactive`
- `--mode <local|remote>`
- `--flow <quickstart|advanced|manual>` (manual est un alias pour advanced)
- `--auth-choice <setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|ollama|ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|mistral-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|opencode-go|custom-api-key|skip>`
- `--token-provider <id>` (non-interactif ; utilisé avec `--auth-choice token`)
- `--token <token>` (non-interactif ; utilisé avec `--auth-choice token`)
- `--token-profile-id <id>` (non interactif ; par défaut : `<provider>:manual`)
- `--token-expires-in <duration>` (non-interactif ; par ex. `365d`, `12h`)
- `--secret-input-mode <plaintext|ref>` (par défaut `plaintext` ; utilisez `ref` pour stocker les références d'environnement par défaut du provider au lieu des clés en texte brut)
- `--anthropic-api-key <key>`
- `--openai-api-key <key>`
- `--mistral-api-key <key>`
- `--openrouter-api-key <key>`
- `--ai-gateway-api-key <key>`
- `--moonshot-api-key <key>`
- `--kimi-code-api-key <key>`
- `--gemini-api-key <key>`
- `--zai-api-key <key>`
- `--minimax-api-key <key>`
- `--opencode-zen-api-key <key>`
- `--opencode-go-api-key <key>`
- `--custom-base-url <url>` (non-interactif; utilisé avec `--auth-choice custom-api-key` ou `--auth-choice ollama`)
- `--custom-model-id <id>` (non interactif ; utilisé avec `--auth-choice custom-api-key` ou `--auth-choice ollama`)
- `--custom-api-key <key>` (non-interactif ; optionnel ; utilisé avec `--auth-choice custom-api-key` ; revient à `CUSTOM_API_KEY` si omis)
- `--custom-provider-id <id>` (non-interactif; identifiant de fournisseur personnalisé optionnel)
- `--custom-compatibility <openai|anthropic>` (non-interactif ; facultatif ; par défaut `openai`)
- `--gateway-port <port>`
- `--gateway-bind <loopback|lan|tailnet|auto|custom>`
- `--gateway-auth <token|password>`
- `--gateway-token <token>`
- `--gateway-token-ref-env <name>` (non-interactif ; stocke `gateway.auth.token` en tant que SecretRef d'env ; nécessite que cette env var soit définie ; ne peut pas être combiné avec `--gateway-token`)
- `--gateway-password <password>`
- `--remote-url <url>`
- `--remote-token <token>`
- `--tailscale <off|serve|funnel>`
- `--tailscale-reset-on-exit`
- `--install-daemon`
- `--no-install-daemon` (alias : `--skip-daemon`)
- `--daemon-runtime <node|bun>`
- `--skip-channels`
- `--skip-skills`
- `--skip-health`
- `--skip-ui`
- `--node-manager <npm|pnpm|bun>` (pnpm recommandé ; bun non recommandé pour l'exécution du Gateway)
- `--json`

### `configure`

Assistant interactif de configuration (modèles, canaux, compétences, passerelle).

### `config`

Assistants de configuration non interactifs (get/set/unset/file/schema/validate). Lancer `openclaw config` sans
sous-commande lance l'assistant.

Sous-commandes :

- `config get <path>` : affiche une valeur de configuration (chemin point/parenthèse).
- `config set` : prend en charge quatre modes d'assignation :
  - mode valeur : `config set <path> <value>` (analyse JSON5-ou-chaîne)
  - mode constructeur SecretRef : `config set <path> --ref-provider <provider> --ref-source <source> --ref-id <id>`
  - mode constructeur provider : `config set secrets.providers.<alias> --provider-source <env|file|exec> ...`
  - mode lot : `config set --batch-json '<json>'` ou `config set --batch-file <path>`
- `config set --dry-run` : valider les assignations sans écrire `openclaw.json` (les vérifications exec SecretRef sont ignorées par défaut).
- `config set --allow-exec --dry-run` : activer l'exécution des vérifications de simulation à sec de SecretRef (peut exécuter des commandes de fournisseur).
- `config set --dry-run --json` : émettre une sortie de simulation à sec lisible par machine (vérifications + signal de complétude, opérations, références vérifiées/ignorées, erreurs).
- `config set --strict-json` : exiger l'analyse JSON5 pour l'entrée chemin/valeur. `--json` reste un alias hérité pour l'analyse stricte en dehors du mode de sortie de simulation à sec.
- `config unset <path>` : supprimer une valeur.
- `config file` : afficher le chemin du fichier de configuration actif.
- `config schema` : afficher le schéma JSON généré pour `openclaw.json`.
- `config validate` : valider la configuration actuelle par rapport au schéma sans démarrer la passerelle.
- `config validate --json` : émettre une sortie JSON lisible par machine.

### `doctor`

Contrôles de santé + correctifs rapides (config + passerelle + services hérités).

Options :

- `--no-workspace-suggestions` : désactiver les indices de mémoire de l'espace de travail.
- `--yes` : accepter les valeurs par défaut sans invite (sans tête).
- `--non-interactive` : ignorer les invites ; appliquer uniquement les migrations sécurisées.
- `--deep` : scanner les services système pour les installations supplémentaires de la passerelle.

## Assistants de channel

### `channels`

Gérer les comptes de channels de chat (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Microsoft Teams).

Sous-commandes :

- `channels list` : afficher les channels configurés et les profils d'authentification.
- `channels status` : vérifier l'accessibilité de la passerelle et l'état du channel (`--probe` exécute des vérifications supplémentaires ; utilisez `openclaw health` ou `openclaw status --deep` pour les sondes de santé de la passerelle).
- Astuce : `channels status` imprime des avertissements avec des corrections suggérées lorsqu'il peut détecter des configurations incorrectes courantes (puis vous dirige vers `openclaw doctor`).
- `channels logs` : afficher les journaux de channel récents à partir du fichier journal de la passerelle.
- `channels add` : configuration de type assistant lorsqu'aucun indicateur n'est passé ; les indicateurs basculent en mode non interactif.
  - Lors de l'ajout d'un compte non défini par défaut à un channel utilisant toujours une configuration de niveau supérieur à compte unique, OpenClaw déplace les valeurs délimitées au compte dans `channels.<channel>.accounts.default` avant d'écrire le nouveau compte.
  - Le `channels add` non interactif ne crée ni ne met à jour automatiquement les liaisons ; les liaisons de type channel uniquement continuent de correspondre au compte par défaut.
- `channels remove` : désactivé par défaut ; passez `--delete` pour supprimer les entrées de configuration sans confirmation.
- `channels login` : connexion au canal interactive (WhatsApp Web uniquement).
- `channels logout` : se déconnecter d'une session de canal (si pris en charge).

Options courantes :

- `--channel <name>` : `whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`
- `--account <id>` : identifiant de compte de canal (défaut `default`)
- `--name <label>` : nom d'affichage du compte

Options `channels login` :

- `--channel <channel>` (par défaut `whatsapp`; prend en charge `whatsapp`/`web`)
- `--account <id>`
- `--verbose`

`channels logout` options :

- `--channel <channel>` (par défaut `whatsapp`)
- `--account <id>`

`channels list` options :

- `--no-usage` : ignorer les instantanés d'utilisation/de quota du fournisseur de modèles (uniquement ceux pris en charge par OAuth/API).
- `--json` : sortie JSON (inclut l'utilisation sauf si `--no-usage` est défini).

`channels logs` options :

- `--channel <name|all>` (par défaut `all`)
- `--lines <n>` (par défaut `200`)
- `--json`

Plus de détails : [/concepts/oauth](/en/concepts/oauth)

Exemples :

```bash
openclaw channels add --channel telegram --account alerts --name "Alerts Bot" --token $TELEGRAM_BOT_TOKEN
openclaw channels add --channel discord --account work --name "Work Bot" --token $DISCORD_BOT_TOKEN
openclaw channels remove --channel discord --account work --delete
openclaw channels status --probe
openclaw status --deep
```

### `skills`

Répertorier et inspecter les compétences disponibles ainsi que les informations de préparation.

Sous-commandes :

- `skills search [query...]` : rechercher les compétences ClawHub.
- `skills install <slug>` : installer une compétence depuis ClawHub dans l'espace de travail actif.
- `skills update <slug|--all>` : met à jour les compétences ClawHub suivies.
- `skills list` : liste les compétences (par défaut lorsqu'il n'y a pas de sous-commande).
- `skills info <name>` : afficher les détails d'une compétence.
- `skills check` : résumé des conditions requises prêtes par rapport à celles manquantes.

Options :

- `--eligible`: afficher uniquement les compétences prêtes.
- `--json` : sortie JSON (sans style).
- `-v`, `--verbose`: inclure les détails des exigences manquantes.

Astuce : utilisez `openclaw skills search`, `openclaw skills install` et `openclaw skills update` pour les compétences basées sur ClawHub.

### `pairing`

Approuver les demandes d'appairage DM sur les canaux.

Sous-commandes :

- `pairing list [channel] [--channel <channel>] [--account <id>] [--json]`
- `pairing approve <channel> <code> [--account <id>] [--notify]`
- `pairing approve --channel <channel> [--account <id>] <code> [--notify]`

### `devices`

Gérer les entrées de couplage des périphériques de passerelle et les jetons de périphérique par rôle.

Sous-commandes :

- `devices list [--json]`
- `devices approve [requestId] [--latest]`
- `devices reject <requestId>`
- `devices remove <deviceId>`
- `devices clear --yes [--pending]`
- `devices rotate --device <id> --role <role> [--scope <scope...>]`
- `devices revoke --device <id> --role <role>`

### `webhooks gmail`

Configuration du hook Gmail Pub/Sub + runner. Voir [/automation/gmail-pubsub](/en/automation/gmail-pubsub).

Sous-commandes :

- `webhooks gmail setup` (nécessite `--account <email>` ; prend en charge `--project`, `--topic`, `--subscription`, `--label`, `--hook-url`, `--hook-token`, `--push-token`, `--bind`, `--port`, `--path`, `--include-body`, `--max-bytes`, `--renew-minutes`, `--tailscale`, `--tailscale-path`, `--tailscale-target`, `--push-endpoint`, `--json`)
- `webhooks gmail run` (remplacements à l'exécution pour les mêmes indicateurs)

### `dns setup`

Assistant DNS de découverte de zone étendue (CoreDNS + Tailscale). Voir [/gateway/discovery](/en/gateway/discovery).

Options :

- `--apply` : installer/mettre à jour la configuration CoreDNS (nécessite sudo ; macOS uniquement).

## Messagerie + agent

### `message`

Messagerie sortante unifiée + actions de channel.

Voir : [/cli/message](/en/cli/message)

Sous-commandes :

- `message send|poll|react|reactions|read|edit|delete|pin|unpin|pins|permissions|search|timeout|kick|ban`
- `message thread <create|list|reply>`
- `message emoji <list|upload>`
- `message sticker <send|upload>`
- `message role <info|add|remove>`
- `message channel <info|list>`
- `message member info`
- `message voice status`
- `message event <list|create>`

Exemples :

- `openclaw message send --target +15555550123 --message "Hi"`
- `openclaw message poll --channel discord --target channel:123 --poll-question "Snack?" --poll-option Pizza --poll-option Sushi`

### `agent`

Exécuter un tour d'agent via le Gateway (ou `--local` intégré).

Obligatoire :

- `--message <text>`

Options :

- `--to <dest>` (pour la clé de session et la livraison facultative)
- `--session-id <id>`
- `--thinking <off|minimal|low|medium|high|xhigh>` (modèles GPT-5.2 + Codex uniquement)
- `--verbose <on|full|off>`
- `--channel <whatsapp|telegram|discord|slack|mattermost|signal|imessage|msteams>`
- `--local`
- `--deliver`
- `--json`
- `--timeout <seconds>`

### `agents`

Gérer les agents isolés (espaces de travail + authentification + routage).

#### `agents list`

Lister les agents configurés.

Options :

- `--json`
- `--bindings`

#### `agents add [name]`

Ajoute un nouvel agent isolé. Exécute l'assistant guidé, sauf si des indicateurs (ou `--non-interactive`) sont transmis ; `--workspace` est requis en mode non interactif.

Options :

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>` (répétable)
- `--non-interactive`
- `--json`

Les spécifications de liaison utilisent `channel[:accountId]`. Lorsque `accountId` est omis, OpenClaw peut résoudre la portée du compte via les valeurs par défaut du channel/hooks de plugin ; sinon, il s'agit d'une liaison de channel sans portée de compte explicite.

#### `agents bindings`

Lister les liaisons de routage.

Options :

- `--agent <id>`
- `--json`

#### `agents bind`

Ajouter des liaisons de routage pour un agent.

Options :

- `--agent <id>`
- `--bind <channel[:accountId]>` (répétable)
- `--json`

#### `agents unbind`

Supprimer les liaisons de routage pour un agent.

Options :

- `--agent <id>`
- `--bind <channel[:accountId]>` (répétable)
- `--all`
- `--json`

#### `agents delete <id>`

Supprimer un agent et nettoyer son espace de travail + son état.

Options :

- `--force`
- `--json`

### `acp`

Exécuter le pont ACP qui connecte les IDE au Gateway.

Voir [`acp`](/en/cli/acp) pour les options complètes et les exemples.

### `status`

Afficher l'état de santé de la session liée et les destinataires récents.

Options :

- `--json`
- `--all` (diagnostic complet ; lecture seule, collable)
- `--deep` (sonder les canaux)
- `--usage` (afficher l'utilisation/quota du fournisseur de modèle)
- `--timeout <ms>`
- `--verbose`
- `--debug` (alias pour `--verbose`)

Notes :

- La vue d'ensemble inclut le statut du Gateway et du service hôte du nœud, si disponible.

### Suivi de l'utilisation

OpenClaw peut afficher l'utilisation/le quota du provider lorsque les informations d'identification OAuth/API sont disponibles.

Surfaces :

- `/status` (ajoute une courte ligne d'utilisation du provider lorsqu'elle est disponible)
- `openclaw status --usage` (affiche la répartition complète du provider)
- macOS menu bar (section Utilisation sous Contexte)

Remarques :

- Les données proviennent directement des points de terminaison d'utilisation du provider (pas d'estimations).
- Fournisseurs : Anthropic, GitHub Copilot, OpenAI Codex OAuth, ainsi que Gemini CLI via le plugin `google` inclus et Antigravity lorsque configuré.
- Si aucune information d'identification correspondante n'existe, l'utilisation est masquée.
- Détails : voir [Suivi de l'utilisation](/en/concepts/usage-tracking).

### `health`

Récupérer l'état de santé du Gateway en cours d'exécution.

Options :

- `--json`
- `--timeout <ms>`
- `--verbose`

### `sessions`

Liste les sessions de conversation stockées.

Options :

- `--json`
- `--verbose`
- `--store <path>`
- `--active <minutes>`

## Réinitialiser / Désinstaller

### `reset`

Réinitialiser la configuration/l'état local (conserve le CLI installé).

Options :

- `--scope <config|config+creds+sessions|full>`
- `--yes`
- `--non-interactive`
- `--dry-run`

Notes :

- `--non-interactive` nécessite `--scope` et `--yes`.

### `uninstall`

Désinstaller le service de passerelle + les données locales (CLI reste).

Options :

- `--service`
- `--state`
- `--workspace`
- `--app`
- `--all`
- `--yes`
- `--non-interactive`
- `--dry-run`

Notes :

- `--non-interactive` nécessite `--yes` et des portées explicites (ou `--all`).

## Gateway

### `gateway`

Exécutez le WebSocket Gateway.

Options :

- `--port <port>`
- `--bind <loopback|tailnet|lan|auto|custom>`
- `--token <token>`
- `--auth <token|password>`
- `--password <password>`
- `--password-file <path>`
- `--tailscale <off|serve|funnel>`
- `--tailscale-reset-on-exit`
- `--allow-unconfigured`
- `--dev`
- `--reset` (réinitialiser la config dev + identifiants + sessions + espace de travail)
- `--force` (tuer l'écouteur existant sur le port)
- `--verbose`
- `--cli-backend-logs`
- `--claude-cli-logs` (alias obsolète)
- `--ws-log <auto|full|compact>`
- `--compact` (alias pour `--ws-log compact`)
- `--raw-stream`
- `--raw-stream-path <path>`

### `gateway service`

Gérer le service Gateway (launchd/systemd/schtasks).

Sous-commandes :

- `gateway status` (sonde le Gateway RPC par défaut)
- `gateway install` (installation du service)
- `gateway uninstall`
- `gateway start`
- `gateway stop`
- `gateway restart`

Notes :

- `gateway status` sonde le Gateway RPC par défaut en utilisant le port/config résolu du service (remplacer avec `--url/--token/--password`).
- `gateway status` prend en charge `--no-probe`, `--deep`, `--require-rpc` et `--json` pour le scriptage.
- `gateway status` détecte également les services de passerelle hérités ou supplémentaires lorsqu'il est possible de les détecter (`--deep` ajoute des analyses au niveau du système). Les services OpenClaw nommés dans le profil sont traités comme des services de première classe et ne sont pas signalés comme « supplémentaires ».
- `gateway status` affiche le chemin de configuration utilisé par le CLI par rapport à la configuration probablement utilisée par le service (env de service), ainsi que l'URL cible de la sonde résolue.
- Si les SecretRefs d'authentification de la passerelle ne sont pas résolus dans le chemin de commande actuel, `gateway status --json` rapporte `rpc.authWarning` uniquement lorsque la connectivité/l'authentification de la sonde échoue (les avertissements sont supprimés lorsque la sonde réussit).
- Sur les installations systemd Linux, les vérifications de dérive de jeton d'état incluent les sources d'unité `Environment=` et `EnvironmentFile=`.
- `gateway install|uninstall|start|stop|restart` prennent en charge `--json` pour les scripts (la sortie par défaut reste conviviale).
- `gateway install` utilise par défaut le runtime Node ; bun est **déconseillé** (bugs WhatsApp/Telegram).
- `gateway install` options : `--port`, `--runtime`, `--token`, `--force`, `--json`.

### `logs`

Suivre les journaux de fichiers du Gateway via RPC.

Notes :

- Les sessions TTY affichent une vue structurée en couleur ; les sessions non-TTY reviennent au texte brut.
- `--json` émet du JSON délimité par des lignes (un événement de journal par ligne).

Exemples :

```bash
openclaw logs --follow
openclaw logs --limit 200
openclaw logs --plain
openclaw logs --json
openclaw logs --no-color
```

### `gateway <subcommand>`

Helpers CLI de Gateway (utilisez `--url`, `--token`, `--password`, `--timeout`, `--expect-final` pour les sous-commandes Gateway).
Lorsque vous passez `--url`, le CLI n'applique pas automatiquement la configuration ou les identifiants de l'environnement.
Incluez `--token` ou `--password` explicitement. L'absence d'identifiants explicites constitue une erreur.

Sous-commandes :

- `gateway call <method> [--params <json>]`
- `gateway health`
- `gateway status`
- `gateway probe`
- `gateway discover`
- `gateway install|uninstall|start|stop|restart`
- `gateway run`

RPC courants :

- `config.apply` (valider + écrire la configuration + redémarrer + réveiller)
- `config.patch` (fusionner une mise à jour partielle + redémarrer + réveiller)
- `update.run` (exécuter la mise à jour + redémarrage + réveil)

Conseil : lors de l'appel direct de `config.set`/`config.apply`/`config.patch`, passez `baseHash` depuis
`config.get` si une configuration existe déjà.

## Modèles

Voir [/concepts/models](/en/concepts/models) pour le comportement de repli et la stratégie de balayage.

Anthropic setup-token (pris en charge) :

```bash
claude setup-token
openclaw models auth setup-token --provider anthropic
openclaw models status
```

Note de politique : il s'agit d'une compatibilité technique. Anthropic a bloqué par le passé
certaines utilisations d'abonnement en dehors de Claude Code ; vérifiez les conditions actuelles de Anthropic
avant de vous fier au setup-token en production.

Migration depuis Anthropic Claude CLI :

```bash
openclaw models auth login --provider anthropic --method cli --set-default
openclaw onboard --auth-choice anthropic-cli
```

### `models` (racine)

`openclaw models` est un alias pour `models status`.

Options racine :

- `--status-json` (alias pour `models status --json`)
- `--status-plain` (alias pour `models status --plain`)

### `models list`

Options :

- `--all`
- `--local`
- `--provider <name>`
- `--json`
- `--plain`

### `models status`

Options :

- `--json`
- `--plain`
- `--check` (exit 1=expiré/manquant, 2=en cours d'expiration)
- `--probe` (sonde en direct des profils d'authentification configurés)
- `--probe-provider <name>`
- `--probe-profile <id>` (répéter ou séparé par des virgules)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`

Inclut toujours la vue d'ensemble de l'authentification et le statut d'expiration OAuth pour les profils dans le magasin d'authentification.
`--probe` exécute des requêtes en direct (peut consommer des jetons et déclencher des limites de taux).

### `models set <model>`

Définir `agents.defaults.model.primary`.

### `models set-image <model>`

Définir `agents.defaults.imageModel.primary`.

### `models aliases list|add|remove`

Options :

- `list` : `--json`, `--plain`
- `add <alias> <model>`
- `remove <alias>`

### `models fallbacks list|add|remove|clear`

Options :

- `list` : `--json`, `--plain`
- `add <model>`
- `remove <model>`
- `clear`

### `models image-fallbacks list|add|remove|clear`

Options :

- `list` : `--json`, `--plain`
- `add <model>`
- `remove <model>`
- `clear`

### `models scan`

Options :

- `--min-params <b>`
- `--max-age-days <days>`
- `--provider <name>`
- `--max-candidates <n>`
- `--timeout <ms>`
- `--concurrency <n>`
- `--no-probe`
- `--yes`
- `--no-input`
- `--set-default`
- `--set-image`
- `--json`

### `models auth add|setup-token|paste-token`

Options :

- `add` : assistant d'authentification interactive
- `setup-token` : `--provider <name>` (par défaut `anthropic`), `--yes`
- `paste-token` : `--provider <name>`, `--profile-id <id>`, `--expires-in <duration>`

### `models auth order get|set|clear`

Options :

- `get` : `--provider <name>`, `--agent <id>`, `--json`
- `set` : `--provider <name>`, `--agent <id>`, `<profileIds...>`
- `clear` : `--provider <name>`, `--agent <id>`

## Système

### `system event`

Met en file d'attente un événement système et déclenche éventuellement un heartbeat (Gateway RPC).

Obligatoire :

- `--text <text>`

Options :

- `--mode <now|next-heartbeat>`
- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

### `system heartbeat last|enable|disable`

Contrôles de rythme cardiaque (Gateway RPC).

Options :

- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

### `system presence`

Lister les entrées de présence du système (Gateway RPC).

Options :

- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

## Cron

Gérer les tâches planifiées (Gateway RPC). Voir [/automation/cron-jobs](/en/automation/cron-jobs).

Sous-commandes :

- `cron status [--json]`
- `cron list [--all] [--json]` (sortie de tableau par défaut ; utilisez `--json` pour le format brut)
- `cron add` (alias : `create` ; nécessite `--name` et exactement un élément parmi `--at` | `--every` | `--cron`, et exactement une charge utile parmi `--system-event` | `--message`)
- `cron edit <id>` (champs de correctif)
- `cron rm <id>` (alias : `remove`, `delete`)
- `cron enable <id>`
- `cron disable <id>`
- `cron runs --id <id> [--limit <n>]`
- `cron run <id> [--force]`

Toutes les commandes `cron` acceptent `--url`, `--token`, `--timeout`, `--expect-final`.

## Hôte de nœud

`node` exécute un **hôte de nœud sans interface** ou le gère en tant que service d'arrière-plan. Voir
[`openclaw node`](/en/cli/node).

Sous-commandes :

- `node run --host <gateway-host> --port 18789`
- `node status`
- `node install [--host <gateway-host>] [--port <port>] [--tls] [--tls-fingerprint <sha256>] [--node-id <id>] [--display-name <name>] [--runtime <node|bun>] [--force]`
- `node uninstall`
- `node stop`
- `node restart`

Notes d'authentification :

- `node` résout l'authentification de la passerelle à partir de env/config (pas de drapeaux `--token`/`--password`) : `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`, puis `gateway.auth.*`. En mode local, l'hôte du nœud ignore intentionnellement `gateway.remote.*` ; dans `gateway.mode=remote`, `gateway.remote.*` participe selon les règles de priorité distante.
- La résolution de l'authentification de l'hôte du nœud honore uniquement les variables d'environnement `OPENCLAW_GATEWAY_*`.

## Nœuds

`nodes` communique avec le Gateway et cible les nœuds appariés. Voir [/nodes](/en/nodes).

Options courantes :

- `--url`, `--token`, `--timeout`, `--json`

Sous-commandes :

- `nodes status [--connected] [--last-connected <duration>]`
- `nodes describe --node <id|name|ip>`
- `nodes list [--connected] [--last-connected <duration>]`
- `nodes pending`
- `nodes approve <requestId>`
- `nodes reject <requestId>`
- `nodes rename --node <id|name|ip> --name <displayName>`
- `nodes invoke --node <id|name|ip> --command <command> [--params <json>] [--invoke-timeout <ms>] [--idempotency-key <key>]`
- `nodes run --node <id|name|ip> [--cwd <path>] [--env KEY=VAL] [--command-timeout <ms>] [--needs-screen-recording] [--invoke-timeout <ms>] <command...>` (nœud Mac ou hôte de nœud sans tête)
- `nodes notify --node <id|name|ip> [--title <text>] [--body <text>] [--sound <name>] [--priority <passive|active|timeSensitive>] [--delivery <system|overlay|auto>] [--invoke-timeout <ms>]` (Mac uniquement)

Caméra :

- `nodes camera list --node <id|name|ip>`
- `nodes camera snap --node <id|name|ip> [--facing front|back|both] [--device-id <id>] [--max-width <px>] [--quality <0-1>] [--delay-ms <ms>] [--invoke-timeout <ms>]`
- `nodes camera clip --node <id|name|ip> [--facing front|back] [--device-id <id>] [--duration <ms|10s|1m>] [--no-audio] [--invoke-timeout <ms>]`

Canvas + écran :

- `nodes canvas snapshot --node <id|name|ip> [--format png|jpg|jpeg] [--max-width <px>] [--quality <0-1>] [--invoke-timeout <ms>]`
- `nodes canvas present --node <id|name|ip> [--target <urlOrPath>] [--x <px>] [--y <px>] [--width <px>] [--height <px>] [--invoke-timeout <ms>]`
- `nodes canvas hide --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes canvas navigate <url> --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes canvas eval [<js>] --node <id|name|ip> [--js <code>] [--invoke-timeout <ms>]`
- `nodes canvas a2ui push --node <id|name|ip> (--jsonl <path> | --text <text>) [--invoke-timeout <ms>]`
- `nodes canvas a2ui reset --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes screen record --node <id|name|ip> [--screen <index>] [--duration <ms|10s>] [--fps <n>] [--no-audio] [--out <path>] [--invoke-timeout <ms>]`

Emplacement :

- `nodes location get --node <id|name|ip> [--max-age <ms>] [--accuracy <coarse|balanced|precise>] [--location-timeout <ms>] [--invoke-timeout <ms>]`

## Navigateur

CLI de contrôle du navigateur (Chrome/CLI/Edge/Chromium dédié). Voir [`openclaw browser`](/en/cli/browser) et l' [outil Navigateur](/en/tools/browser).

Options courantes :

- `--url`, `--token`, `--timeout`, `--json`
- `--browser-profile <name>`

Gérer :

- `browser status`
- `browser start`
- `browser stop`
- `browser reset-profile`
- `browser tabs`
- `browser open <url>`
- `browser focus <targetId>`
- `browser close [targetId]`
- `browser profiles`
- `browser create-profile --name <name> [--color <hex>] [--cdp-url <url>]`
- `browser delete-profile --name <name>`

Inspecter :

- `browser screenshot [targetId] [--full-page] [--ref <ref>] [--element <selector>] [--type png|jpeg]`
- `browser snapshot [--format aria|ai] [--target-id <id>] [--limit <n>] [--interactive] [--compact] [--depth <n>] [--selector <sel>] [--out <path>]`

Actions :

- `browser navigate <url> [--target-id <id>]`
- `browser resize <width> <height> [--target-id <id>]`
- `browser click <ref> [--double] [--button <left|right|middle>] [--modifiers <csv>] [--target-id <id>]`
- `browser type <ref> <text> [--submit] [--slowly] [--target-id <id>]`
- `browser press <key> [--target-id <id>]`
- `browser hover <ref> [--target-id <id>]`
- `browser drag <startRef> <endRef> [--target-id <id>]`
- `browser select <ref> <values...> [--target-id <id>]`
- `browser upload <paths...> [--ref <ref>] [--input-ref <ref>] [--element <selector>] [--target-id <id>] [--timeout-ms <ms>]`
- `browser fill [--fields <json>] [--fields-file <path>] [--target-id <id>]`
- `browser dialog --accept|--dismiss [--prompt <text>] [--target-id <id>] [--timeout-ms <ms>]`
- `browser wait [--time <ms>] [--text <value>] [--text-gone <value>] [--target-id <id>]`
- `browser evaluate --fn <code> [--ref <ref>] [--target-id <id>]`
- `browser console [--level <error|warn|info>] [--target-id <id>]`
- `browser pdf [--target-id <id>]`

## Recherche de documentation

### `docs [query...]`

Rechercher dans l'index de la documentation en direct.

## TUI

### `tui`

Ouvrir l'interface utilisateur du terminal connectée au Gateway.

Options :

- `--url <url>`
- `--token <token>`
- `--password <password>`
- `--session <key>`
- `--deliver`
- `--thinking <level>`
- `--message <text>`
- `--timeout-ms <ms>` (par défaut `agents.defaults.timeoutSeconds`)
- `--history-limit <n>`
