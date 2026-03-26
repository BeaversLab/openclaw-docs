---
summary: "Référence de la CLI OpenClaw pour les commandes, sous-commandes et options `openclaw`"
read_when:
  - Adding or modifying CLI commands or options
  - Documenting new command surfaces
title: "Référence de la CLI"
---

# Référence de la CLI

Cette page décrit le comportement actuel de la CLI. Si les commandes changent, mettez à jour cette documentation.

## Pages de commandes

- [`setup`](/fr/cli/setup)
- [`onboard`](/fr/cli/onboard)
- [`configure`](/fr/cli/configure)
- [`config`](/fr/cli/config)
- [`completion`](/fr/cli/completion)
- [`doctor`](/fr/cli/doctor)
- [`dashboard`](/fr/cli/dashboard)
- [`backup`](/fr/cli/backup)
- [`reset`](/fr/cli/reset)
- [`uninstall`](/fr/cli/uninstall)
- [`update`](/fr/cli/update)
- [`message`](/fr/cli/message)
- [`agent`](/fr/cli/agent)
- [`agents`](/fr/cli/agents)
- [`acp`](/fr/cli/acp)
- [`status`](/fr/cli/status)
- [`health`](/fr/cli/health)
- [`sessions`](/fr/cli/sessions)
- [`gateway`](/fr/cli/gateway)
- [`logs`](/fr/cli/logs)
- [`system`](/fr/cli/system)
- [`models`](/fr/cli/models)
- [`memory`](/fr/cli/memory)
- [`directory`](/fr/cli/directory)
- [`nodes`](/fr/cli/nodes)
- [`devices`](/fr/cli/devices)
- [`node`](/fr/cli/node)
- [`approvals`](/fr/cli/approvals)
- [`sandbox`](/fr/cli/sandbox)
- [`tui`](/fr/cli/tui)
- [`browser`](/fr/cli/browser)
- [`cron`](/fr/cli/cron)
- [`dns`](/fr/cli/dns)
- [`docs`](/fr/cli/docs)
- [`hooks`](/fr/cli/hooks)
- [`webhooks`](/fr/cli/webhooks)
- [`pairing`](/fr/cli/pairing)
- [`qr`](/fr/cli/qr)
- [`plugins`](/fr/cli/plugins) (commandes de plugin)
- [`channels`](/fr/cli/channels)
- [`security`](/fr/cli/security)
- [`secrets`](/fr/cli/secrets)
- [`skills`](/fr/cli/skills)
- [`daemon`](/fr/cli/daemon) (alias hérité pour les commandes de service de passerelle)
- [`clawbot`](/fr/cli/clawbot) (espace de noms d'alias hérité)
- [`voicecall`](/fr/cli/voicecall) (plugin ; si installé)

## Indicateurs globaux

- `--dev` : isoler l'état sous `~/.openclaw-dev` et décaler les ports par défaut.
- `--profile <name>` : isoler l'état sous `~/.openclaw-<name>`.
- `--no-color` : désactiver les couleurs ANSI.
- `--update` : abréviation de `openclaw update` (installations depuis la source uniquement).
- `-V`, `--version`, `-v` : afficher la version et quitter.

## Style de sortie

- Les couleurs ANSI et les barres de progression ne s'affichent que dans les sessions TTY.
- Les hyperliens OSC-8 s'affichent sous forme de liens cliquables dans les terminaux pris en charge ; sinon, nous revenons aux URL brutes.
- `--json` (et `--plain` si pris en charge) désactive le style pour une sortie propre.
- `--no-color` désactive le style ANSI ; `NO_COLOR=1` est également respecté.
- Les commandes de longue durée affichent un indicateur de progression (OSC 9;4 lorsque pris en charge).

## Palette de couleurs

OpenClaw utilise une palette homard pour la sortie CLI.

- `accent` (#FF5A2D) : titres, étiquettes, surbrillances principales.
- `accentBright` (#FF7A3D) : noms de commandes, emphase.
- `accentDim` (#D14A22) : texte de surbrillance secondaire.
- `info` (#FF8A5B) : valeurs d'information.
- `success` (#2FBF71) : états de réussite.
- `warn` (#FFB020) : avertissements, replis, attention.
- `error` (#E23D2D) : erreurs, échecs.
- `muted` (#8B7F77) : désaccentuation, métadonnées.

Source de vérité de la palette : `src/terminal/palette.ts` (la « palette homard »).

## Arborescence de commandes

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
    migrate
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
    info
    install
    enable
    disable
    doctor
  memory
    status
    index
    search
  message
  agent
  agents
    list
    add
    delete
  acp
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

Remarque : les plugins peuvent ajouter des commandes de niveau supérieur supplémentaires (par exemple `openclaw voicecall`).

## Sécurité

- `openclaw security audit` — audit de la configuration + de l'état local pour les pièges de sécurité courants.
- `openclaw security audit --deep` — sonde de Gateway en direct « best-effort ».
- `openclaw security audit --fix` — resserrer les valeurs par défaut sûres et chmod state/config.

## Secrets

- `openclaw secrets reload` — résoudre à nouveau les références et échanger de manière atomique l'instantané d'exécution.
- `openclaw secrets audit` — rechercher les résidus en texte brut, les références non résolues et les dérives de priorité (`--allow-exec` pour exécuter les providers exec lors de l'audit).
- `openclaw secrets configure` — assistant interactif pour la configuration du provider + le mappage SecretRef + le prévol/appliquer (`--allow-exec` pour exécuter les providers exec lors du prévol et des flux d'appliquer contenant exec).
- `openclaw secrets apply --from <plan.json>` — appliquer un plan précédemment généré (`--dry-run` pris en charge ; utilisez `--allow-exec` pour autoriser les providers exec dans les simulations et les plans d'écriture contenant exec).

## Plugins

Gérer les extensions et leur configuration :

- `openclaw plugins list` — découvrir les plugins (utilisez `--json` pour la sortie machine).
- `openclaw plugins inspect <id>` — afficher les détails d'un plugin (`info` est un alias).
- `openclaw plugins install <path|.tgz|npm-spec|plugin@marketplace>` — installer un plugin (ou ajouter un chemin de plugin à `plugins.load.paths`).
- `openclaw plugins marketplace list <marketplace>` — lister les entrées du marketplace avant l'installation.
- `openclaw plugins enable <id>` / `disable <id>` — activer/désactiver `plugins.entries.<id>.enabled`.
- `openclaw plugins doctor` — signaler les erreurs de chargement des plugins.

La plupart des modifications de plugins nécessitent un redémarrage de la passerelle. Voir [/plugin](/fr/tools/plugin).

## Mémoire

Recherche vectorielle sur `MEMORY.md` + `memory/*.md` :

- `openclaw memory status` — afficher les statistiques de l'index.
- `openclaw memory index` — réindexer les fichiers mémoire.
- `openclaw memory search "<query>"` (ou `--query "<query>"`) — recherche sémantique dans la mémoire.

## Commandes slash de chat

Les messages de chat prennent en charge les commandes `/...` (texte et natif). Voir [/tools/slash-commands](/fr/tools/slash-commands).

Points forts :

- `/status` pour un diagnostic rapide.
- `/config` pour les modifications de configuration persistantes.
- `/debug` pour les remplacements de configuration uniquement en temps d'exécution (mémoire, pas disque ; nécessite `commands.debug: true`).

## Configuration + onboarding

### `setup`

Initialiser la configuration + l'espace de travail.

Options :

- `--workspace <dir>` : chemin de l'espace de travail de l'agent (par défaut `~/.openclaw/workspace`).
- `--wizard` : exécuter l'intégration.
- `--non-interactive` : exécuter l'intégration sans invite.
- `--mode <local|remote>` : mode d'intégration.
- `--remote-url <url>` : URL distante du Gateway.
- `--remote-token <token>` : jeton du Gateway distant.

L'intégration s'exécute automatiquement lorsque des indicateurs d'intégration sont présents (`--non-interactive`, `--mode`, `--remote-url`, `--remote-token`).

### `onboard`

Onboarding interactif pour la passerelle, l'espace de travail et les compétences.

Options :

- `--workspace <dir>`
- `--reset` (réinitialiser la configuration + les identifiants + les sessions avant l'intégration)
- `--reset-scope <config|config+creds+sessions|full>` (par défaut `config+creds+sessions` ; utilisez `full` pour également supprimer l'espace de travail)
- `--non-interactive`
- `--mode <local|remote>`
- `--flow <quickstart|advanced|manual>` (manual est un alias pour advanced)
- `--auth-choice <setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|ollama|ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|mistral-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|opencode-go|custom-api-key|skip>`
- `--token-provider <id>` (non-interactif ; utilisé avec `--auth-choice token`)
- `--token <token>` (non-interactif ; utilisé avec `--auth-choice token`)
- `--token-profile-id <id>` (non-interactif ; par défaut : `<provider>:manual`)
- `--token-expires-in <duration>` (non-interactif ; p. ex. `365d`, `12h`)
- `--secret-input-mode <plaintext|ref>` (par défaut `plaintext` ; utilisez `ref` pour stocker les refs env par défaut du provider au lieu des clés en texte brut)
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
- `--custom-base-url <url>` (non-interactif ; utilisé avec `--auth-choice custom-api-key` ou `--auth-choice ollama`)
- `--custom-model-id <id>` (non-interactif ; utilisé avec `--auth-choice custom-api-key` ou `--auth-choice ollama`)
- `--custom-api-key <key>` (non-interactif ; facultatif ; utilisé avec `--auth-choice custom-api-key` ; revient à `CUSTOM_API_KEY` si omis)
- `--custom-provider-id <id>` (non-interactif ; id de provider personnalisé facultatif)
- `--custom-compatibility <openai|anthropic>` (non-interactif ; facultatif ; par défaut `openai`)
- `--gateway-port <port>`
- `--gateway-bind <loopback|lan|tailnet|auto|custom>`
- `--gateway-auth <token|password>`
- `--gateway-token <token>`
- `--gateway-token-ref-env <name>` (non-interactif ; stocker `gateway.auth.token` en tant que SecretRef d'env ; nécessite que cette env var soit définie ; ne peut pas être combiné avec `--gateway-token`)
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

Assistant interactif de configuration (modèles, chaînes, compétences, passerelle).

### `config`

Assistants de configuration non interactive (get/set/unset/file/validate). L'exécution de `openclaw config` sans
sous-commande lance l'assistant.

Sous-commandes :

- `config get <path>` : afficher une valeur de configuration (chemin avec point/crochet).
- `config set` : prend en charge quatre modes d'assignation :
  - mode valeur : `config set <path> <value>` (analyse JSON5 ou chaîne)
  - mode constructeur SecretRef : `config set <path> --ref-provider <provider> --ref-source <source> --ref-id <id>`
  - mode constructeur provider : `config set secrets.providers.<alias> --provider-source <env|file|exec> ...`
  - mode batch : `config set --batch-json '<json>'` ou `config set --batch-file <path>`
- `config set --dry-run` : valider les assignations sans écrire `openclaw.json` (les vérifications exec SecretRef sont ignorées par défaut).
- `config set --allow-exec --dry-run` : activer les vérifications à blanc exec SecretRef (peut exécuter des commandes provider).
- `config set --dry-run --json` : émettre une sortie à blanc lisible par machine (vérifications + signal de complétude, opérations, références vérifiées/ignorées, erreurs).
- `config set --strict-json` : exiger l'analyse JSON5 pour l'entrée chemin/valeur. `--json` reste un alias hérité pour l'analyse stricte en dehors du mode de sortie à blanc.
- `config unset <path>` : supprimer une valeur.
- `config file` : afficher le chemin du fichier de configuration actif.
- `config validate` : valider la configuration actuelle par rapport au schéma sans démarrer la passerelle.
- `config validate --json` : émettre une sortie JSON lisible par machine.

### `doctor`

Contrôles de santé + correctifs rapides (config + passerelle + services hérités).

Options :

- `--no-workspace-suggestions` : désactiver les indicateurs de mémoire de l'espace de travail.
- `--yes` : accepter les valeurs par défaut sans invite (sans interaction).
- `--non-interactive` : ignorer les invites ; n'appliquer que les migrations sûres.
- `--deep` : rechercher des installations supplémentaires de passerelle dans les services système.

## Assistants de canal

### `channels`

Gérer les comptes de canaux de chat (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Microsoft Teams).

Sous-commandes :

- `channels list` : afficher les canaux configurés et les profils d'authentification.
- `channels status` : vérifier l'accessibilité de la passerelle et l'état du canal (`--probe` exécute des vérifications supplémentaires ; utilisez `openclaw health` ou `openclaw status --deep` pour les sondages de santé de la passerelle).
- Conseil : `channels status` imprime des avertissements avec des corrections suggérées lorsqu'il détecte des erreurs de configuration courantes (puis vous redirige vers `openclaw doctor`).
- `channels logs` : afficher les journaux récents du canal à partir du fichier journal de la passerelle.
- `channels add` : configuration de style assistant lorsqu'aucun indicateur n'est passé ; les indicateurs basculent en mode non interactif.
  - Lors de l'ajout d'un compte non par défaut à un canal utilisant toujours une configuration de premier niveau à compte unique, OpenClaw déplace les valeurs délimitées au compte dans `channels.<channel>.accounts.default` avant d'écrire le nouveau compte.
  - Le `channels add` non interactif ne crée/met à jour pas automatiquement les liaisons ; les liaisons de canal uniquement continuent de correspondre au compte par défaut.
- `channels remove` : désactivé par défaut ; passez `--delete` pour supprimer les entrées de configuration sans invite.
- `channels login` : connexion interactive au canal (WhatsApp Web uniquement).
- `channels logout` : se déconnecter d'une session de canal (si pris en charge).

Options courantes :

- `--channel <name>` : `whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`
- `--account <id>` : identifiant du compte de canal (par défaut `default`)
- `--name <label>` : nom d'affichage du compte

Options `channels login` :

- `--channel <channel>` (par défaut `whatsapp` ; prend en charge `whatsapp`/`web`)
- `--account <id>`
- `--verbose`

options `channels logout` :

- `--channel <channel>` (par défaut `whatsapp`)
- `--account <id>`

options `channels list` :

- `--no-usage` : ignorer les instantanés d'utilisation/quota du provider de model (uniquement avec OAuth/API).
- `--json` : sortie JSON (inclut l'utilisation sauf si `--no-usage` est défini).

options `channels logs` :

- `--channel <name|all>` (par défaut `all`)
- `--lines <n>` (par défaut `200`)
- `--json`

Plus de détails : [/concepts/oauth](/fr/concepts/oauth)

Exemples :

```bash
openclaw channels add --channel telegram --account alerts --name "Alerts Bot" --token $TELEGRAM_BOT_TOKEN
openclaw channels add --channel discord --account work --name "Work Bot" --token $DISCORD_BOT_TOKEN
openclaw channels remove --channel discord --account work --delete
openclaw channels status --probe
openclaw status --deep
```

### `skills`

Lister et inspecter les compétences disponibles ainsi que les informations de préparation.

Sous-commandes :

- `skills list` : lister les compétences (par défaut en l'absence de sous-commande).
- `skills info <name>` : afficher les détails d'une compétence.
- `skills check` : résumé des prérequis prêts par rapport à ceux manquants.

Options :

- `--eligible` : afficher uniquement les compétences prêtes.
- `--json` : sortie JSON (pas de mise en forme).
- `-v`, `--verbose` : inclure les détails des prérequis manquants.

Conseil : utilisez `npx clawhub` pour rechercher, installer et synchroniser les compétences.

### `pairing`

Approuver les demandes d'appariement DM sur les canaux.

Sous-commandes :

- `pairing list [channel] [--channel <channel>] [--account <id>] [--json]`
- `pairing approve <channel> <code> [--account <id>] [--notify]`
- `pairing approve --channel <channel> [--account <id>] <code> [--notify]`

### `devices`

Gérer les entrées d'appariement d'appareils passerelle et les jetons d'appareil par rôle.

Sous-commandes :

- `devices list [--json]`
- `devices approve [requestId] [--latest]`
- `devices reject <requestId>`
- `devices remove <deviceId>`
- `devices clear --yes [--pending]`
- `devices rotate --device <id> --role <role> [--scope <scope...>]`
- `devices revoke --device <id> --role <role>`

### `webhooks gmail`

Configuration du hook Gmail Pub/Sub + exécuteur. Voir [/automation/gmail-pubsub](/fr/automation/gmail-pubsub).

Sous-commandes :

- `webhooks gmail setup` (nécessite `--account <email>` ; prend en charge `--project`, `--topic`, `--subscription`, `--label`, `--hook-url`, `--hook-token`, `--push-token`, `--bind`, `--port`, `--path`, `--include-body`, `--max-bytes`, `--renew-minutes`, `--tailscale`, `--tailscale-path`, `--tailscale-target`, `--push-endpoint`, `--json`)
- `webhooks gmail run` (remplacements à l'exécution pour les mêmes indicateurs)

### `dns setup`

Helper DNS de découverte étendue (CoreDNS + Tailscale). Voir [/gateway/discovery](/fr/gateway/discovery).

Options :

- `--apply` : installer/mettre à jour la configuration CoreDNS (nécessite sudo ; macOS uniquement).

## Messagerie + agent

### `message`

Messagerie sortante unifiée + actions de canal.

Voir : [/cli/message](/fr/cli/message)

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

Gérer les agents isolés (espaces de travail + auth + routage).

#### `agents list`

Lister les agents configurés.

Options :

- `--json`
- `--bindings`

#### `agents add [name]`

Ajouter un nouvel agent isolé. Exécute l'assistant guidé sauf si des indicateurs (ou `--non-interactive`) sont transmis ; `--workspace` est requis en mode non interactif.

Options :

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>` (répétable)
- `--non-interactive`
- `--json`

Les spécifications de liaison utilisent `channel[:accountId]`. Lorsque `accountId` est omis, OpenClaw peut résoudre la portée du compte via les hooks par défaut des plugins de canal ; sinon, il s'agit d'une liaison de canal sans portée de compte explicite.

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

Supprimer un agent et nettoyer son espace de travail et son état.

Options :

- `--force`
- `--json`

### `acp`

Exécuter le pont ACP qui connecte les IDE au Gateway.

Voir [`acp`](/fr/cli/acp) pour toutes les options et exemples.

### `status`

Afficher l'état de santé de la session liée et les destinataires récents.

Options :

- `--json`
- `--all`%% (diagnostic complet ; lecture seule, collable)
- `--deep` (sonder les canaux)
- `--usage` (afficher l'utilisation/le quota du fournisseur de model)
- `--timeout <ms>`
- `--verbose`
- `--debug` (alias pour `--verbose`)

Notes :

- L'aperçu inclut l'état du Gateway + du service d'hôte de nœud lorsque disponible.

### Suivi de l'utilisation

OpenClaw peut afficher l'utilisation/le quota du fournisseur lorsque les identifiants OAuth/API sont disponibles.

Interfaces :

- `/status` (ajoute une ligne courte d'utilisation du fournisseur lorsque disponible)
- `openclaw status --usage` (affiche la répartition complète du fournisseur)
- Barre de menu macOS (section Utilisation sous Contexte)

Notes :

- Les données proviennent directement des points de terminaison d'utilisation du fournisseur (pas d'estimations).
- Fournisseurs : Anthropic, GitHub Copilot, OpenAI Codex OAuth, ainsi que Gemini CLI via le plugin `google` inclus et Antigravity lorsque configuré.
- Si aucune information d'identification correspondante n'existe, l'utilisation est masquée.
- Détails : voir [Suivi de l'utilisation](/fr/concepts/usage-tracking).

### `health`

Récupérer l'état de santé du Gateway en cours d'exécution.

Options :

- `--json`
- `--timeout <ms>`
- `--verbose`

### `sessions`

Lister les sessions de conversation stockées.

Options :

- `--json`
- `--verbose`
- `--store <path>`
- `--active <minutes>`

## Réinitialiser / Désinstaller

### `reset`

Réinitialiser la configuration/l'état local (garde la CLI installée).

Options :

- `--scope <config|config+creds+sessions|full>`
- `--yes`
- `--non-interactive`
- `--dry-run`

Notes :

- `--non-interactive` nécessite `--scope` et `--yes`.

### `uninstall`

Désinstaller le service de passerelle + les données locales (la CLI reste).

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

- `--non-interactive` nécessite `--yes` et des champs d'application explicites (ou `--all`).

## Gateway

### `gateway`

Exécutez le WebSocket Gateway.

Options :

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
- `--reset` (réinitialiser la configuration dev + identifiants + sessions + espace de travail)
- `--force` (tuer l'écouteur existant sur le port)
- `--verbose`
- `--claude-cli-logs`
- `--ws-log <auto|full|compact>`
- `--compact` (alias pour `--ws-log compact`)
- `--raw-stream`
- `--raw-stream-path <path>`

### `gateway service`

Gérer le service Gateway (launchd/systemd/schtasks).

Sous-commandes :

- `gateway status` (sonde le Gateway RPC par défaut)
- `gateway install` (installation du service)
- `gateway uninstall`
- `gateway start`
- `gateway stop`
- `gateway restart`

Notes :

- `gateway status` sonde le Gateway RPC par défaut en utilisant le port/config résolu du service (remplacer par `--url/--token/--password`).
- `gateway status` prend en charge `--no-probe`, `--deep`, `--require-rpc` et `--json` pour les scripts.
- `gateway status` détecte également les services de passerelle hérités ou supplémentaires lorsqu'il peut les détecter (`--deep` ajoute des analyses au niveau du système). Les services OpenClaw nommés par profil sont traités comme des services de première classe et ne sont pas signalés comme "extra".
- `gateway status` affiche le chemin de configuration utilisé par la CLI par rapport à la configuration probablement utilisée par le service (env du service), ainsi que l'URL cible de la sonde résolue.
- Si les SecretRefs d'authentification de la passerelle ne sont pas résolues dans le chemin de commande actuel, `gateway status --json` signale `rpc.authWarning` uniquement lorsque la sonde de connectivité/d'authentification échoue (les avertissements sont supprimés lorsque la sonde réussit).
- Sur les installations systemd Linux, les vérifications de dérive du jeton d'état incluent les sources d'unité `Environment=` et `EnvironmentFile=`.
- `gateway install|uninstall|start|stop|restart` prend en charge `--json` pour les scripts (la sortie par défaut reste conviviale pour les humains).
- `gateway install` utilise par défaut le runtime Node ; bun est **déconseillé** (bugs WhatsApp/Telegram).
- Options `gateway install` : `--port`, `--runtime`, `--token`, `--force`, `--json`.

### `logs`

Suivez les journaux de fichiers du Gateway via RPC.

Notes :

- Les sessions TTY affichent une vue structurée en couleur ; non-TTY revient au texte brut.
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

Assistants Gateway du CLI (utilisez `--url`, `--token`, `--password`, `--timeout`, `--expect-final` pour les sous-commandes RPC).
Lorsque vous transmettez `--url`, la CLI n'applique pas automatiquement la configuration ou les informations d'identification de l'environnement.
Incluez `--token` ou `--password` explicitement. L'absence d'informations d'identification explicites est une erreur.

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
- `update.run` (exécuter la mise à jour + redémarrer + réveiller)

Astuce : lors de l'appel direct de `config.set`/`config.apply`/`config.patch`, passez `baseHash` depuis
`config.get` si une configuration existe déjà.

## Modèles

Voir [/concepts/models](/fr/concepts/models) pour le comportement de repli et la stratégie de balayage.

Jeton de configuration Anthropic (pris en charge) :

```bash
claude setup-token
openclaw models auth setup-token --provider anthropic
openclaw models status
```

Remarque concernant la politique : il s'agit d'une compatibilité technique. Anthropic a bloqué par le passé
une certaine utilisation d'abonnement en dehors de Claude Code ; vérifiez les conditions actuelles de Anthropic
avant de vous fier au jeton de configuration en production.

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
- `--check` (exit 1=expiré/manquant, 2=en expiration)
- `--probe` (sonde en direct des profils d'authentification configurés)
- `--probe-provider <name>`
- `--probe-profile <id>` (à répéter ou séparé par des virgules)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`

Inclut toujours la vue d'ensemble de l'authentification et le statut d'expiration OAuth pour les profils dans le stock d'authentification.
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

- `list` : `--json`, `--plain`
- `add <model>`
- `remove <model>`
- `clear`

### `models scan`

Options :

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

Options :

- `add` : assistant d'authentification interactive
- `setup-token` : `--provider <name>` (par défaut `anthropic`), `--yes`
- `paste-token` : `--provider <name>`, `--profile-id <id>`, `--expires-in <duration>`

### `models auth order get|set|clear`

Options :

- `get` : `--provider <name>`, `--agent <id>`, `--json`
- `set` : `--provider <name>`, `--agent <id>`, `<profileIds...>`
- `clear` : `--provider <name>`, `--agent <id>`

## Système

### `system event`

Mettre en file d'attente un événement système et déclencher éventuellement un heartbeat (Gateway RPC).

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

Gérer les tâches planifiées (Gateway RPC). Voir [/automation/cron-jobs](/fr/automation/cron-jobs).

Sous-commandes :

- `cron status [--json]`
- `cron list [--all] [--json]` (sortie tableau par défaut ; utiliser `--json` pour les données brutes)
- `cron add` (alias : `create` ; nécessite `--name` et exactement l'un des éléments `--at` | `--every` | `--cron`, et exactement une charge utile parmi `--system-event` | `--message`)
- `cron edit <id>` (champs de correctif)
- `cron rm <id>` (alias : `remove`, `delete`)
- `cron enable <id>`
- `cron disable <id>`
- `cron runs --id <id> [--limit <n>]`
- `cron run <id> [--force]`

Toutes les commandes `cron` acceptent `--url`, `--token`, `--timeout`, `--expect-final`.

## Hôte de nœud

`node` exécute un **hôte de nœud sans interface** ou le gère en tant que service d'arrière-plan. Voir
[`openclaw node`](/fr/cli/node).

Sous-commandes :

- `node run --host <gateway-host> --port 18789`
- `node status`
- `node install [--host <gateway-host>] [--port <port>] [--tls] [--tls-fingerprint <sha256>] [--node-id <id>] [--display-name <name>] [--runtime <node|bun>] [--force]`
- `node uninstall`
- `node stop`
- `node restart`

Notes d'authentification :

- `node` résout l'authentification de la passerelle à partir de env/config (pas de drapeaux `--token`/`--password`) : `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`, puis `gateway.auth.*`. En mode local, l'hôte du nœud ignore intentionnellement `gateway.remote.*` ; dans `gateway.mode=remote`, `gateway.remote.*` participe selon les règles de priorité distantes.
- Les anciennes variables d'environnement `CLAWDBOT_GATEWAY_*` sont intentionnellement ignorées pour la résolution de l'authentification de l'hôte du nœud.

## Nœuds

`nodes` communique avec la Gateway et cible les nœuds couplés. Voir [/nodes](/fr/nodes).

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
- `nodes run --node <id|name|ip> [--cwd <path>] [--env KEY=VAL] [--command-timeout <ms>] [--needs-screen-recording] [--invoke-timeout <ms>] <command...>` (nœud mac ou hôte de nœud sans interface)
- `nodes notify --node <id|name|ip> [--title <text>] [--body <text>] [--sound <name>] [--priority <passive|active|timeSensitive>] [--delivery <system|overlay|auto>] [--invoke-timeout <ms>]` (mac uniquement)

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

CLI de contrôle du navigateur (Chrome/CLI/Edge/Chromium dédié). Voir [`openclaw browser`](/fr/cli/browser) et l'outil [Navigateur](/fr/tools/browser).

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

## Recherche dans la documentation

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

import fr from "/components/footer/fr.mdx";

<fr />
