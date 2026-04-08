---
summary: "Référence de l'OpenClaw CLI pour les commandes, sous-commandes et options `openclaw`"
read_when:
  - Adding or modifying CLI commands or options
  - Documenting new command surfaces
title: "Référence de la CLI"
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
- [`tasks`](/en/cli/index#tasks)
- [`flows`](/en/cli/flows)
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
- [`daemon`](/en/cli/daemon) (ancien alias pour les commandes de service de passerelle)
- [`clawbot`](/en/cli/clawbot) (espace de noms d'ancien alias)
- [`voicecall`](/en/cli/voicecall) (plugin ; si installé)

## Indicateurs globaux

- `--dev` : isoler l'état sous `~/.openclaw-dev` et décaler les ports par défaut.
- `--profile <name>` : isoler l'état sous `~/.openclaw-<name>`.
- `--container <name>` : cibler un conteneur nommé pour l'exécution.
- `--no-color` : désactiver les couleurs ANSI.
- `--update` : abréviation de `openclaw update` (installations source uniquement).
- `-V` , `--version` , `-v` : affiche la version et quitte.

## Style de sortie

- Les couleurs ANSI et les indicateurs de progression ne s'affichent que dans les sessions TTY.
- Les hyperliens OSC-8 s'affichent sous forme de liens cliquables dans les terminaux pris en charge ; sinon, nous revenons aux URL brutes.
- `--json` (et `--plain` lorsque pris en charge) désactive le style pour une sortie propre.
- `--no-color` désactive le style ANSI ; `NO_COLOR=1` est également respecté.
- Les commandes de longue durée affichent un indicateur de progression (OSC 9;4 lorsque pris en charge).

## Palette de couleurs

OpenClaw utilise une palette homard pour la sortie CLI.

- `accent` (#FF5A2D) : titres, étiquettes, surbrillances principales.
- `accentBright` (#FF7A3D) : noms de commande, emphase.
- `accentDim` (#D14A22) : texte de surbrillance secondaire.
- `info` (#FF8A5B) : valeurs d'information.
- `success` (#2FBF71) : états de succès.
- `warn` (#FFB020) : avertissements, replis, attention.
- `error` (#E23D2D) : erreurs, échecs.
- `muted` (#8B7F77) : atténuation, métadonnées.

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
    schema
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
    wizard
    status
  channels
    list
    status
    capabilities
    resolve
    logs
    add
    remove
    login
    logout
  directory
    self
    peers list
    groups list|members
  skills
    search
    install
    update
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
    poll
    react
    reactions
    read
    edit
    delete
    pin
    unpin
    pins
    permissions
    search
    thread create|list|reply
    emoji list|upload
    sticker send|upload
    role info|add|remove
    channel info|list
    member info
    voice status
    event list|create
    timeout
    kick
    ban
  agent
  agents
    list
    add
    delete
    bindings
    bind
    unbind
    set-identity
  acp
  mcp
    serve
    list
    show
    set
    unset
  status
  health
  sessions
    cleanup
  tasks
    list
    audit
    maintenance
    show
    notify
    cancel
    flow list|show|cancel
  gateway
    call
    usage-cost
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
    auth add|login|login-github-copilot|setup-token|paste-token
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
    status
    describe
    list
    pending
    approve
    reject
    rename
    invoke
    notify
    push
    canvas snapshot|present|hide|navigate|eval
    canvas a2ui push|reset
    camera list|snap|clip
    screen record
    location get
  devices
    list
    remove
    clear
    approve
    reject
    rotate
    revoke
  node
    run
    status
    install
    uninstall
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

- `openclaw security audit` — audit de la configuration + de l'état local pour les problèmes de sécurité courants.
- `openclaw security audit --deep` — sonde en temps réel du Gateway au mieux.
- `openclaw security audit --fix` — renforcer les valeurs par défaut sécurisées et les autorisations d'état/de configuration.

## Secrets

### `secrets`

Gérer les SecretRefs et l'hygiène d'exécution/de configuration associée.

Sous-commandes :

- `secrets reload`
- `secrets audit`
- `secrets configure`
- `secrets apply --from <path>`

options `secrets reload` :

- `--url`, `--token`, `--timeout`, `--expect-final`, `--json`

`secrets audit` options :

- `--check`
- `--allow-exec`
- `--json`

`secrets configure` options :

- `--apply`
- `--yes`
- `--providers-only`
- `--skip-provider-setup`
- `--agent <id>`
- `--allow-exec`
- `--plan-out <path>`
- `--json`

`secrets apply --from <path>` options :

- `--dry-run`
- `--allow-exec`
- `--json`

Notes :

- `reload` est un Gateway RPC et conserve le dernier instantané d'exécution connu comme bon lorsque la résolution échoue.
- `audit --check` renvoie une valeur non nulle en cas de résultats ; les références non résolues utilisent un code de sortie non nulle de priorité plus élevée.
- Les vérifications d'exécution à blanc sont ignorées par défaut ; utilisez `--allow-exec` pour les activer.

## Plugins

Gérer les extensions et leur configuration :

- `openclaw plugins list` — découvrir les plugins (utilisez `--json` pour la sortie machine).
- `openclaw plugins inspect <id>` — afficher les détails d'un plugin (`info` est un alias).
- `openclaw plugins install <path|.tgz|npm-spec|plugin@marketplace>` — installer un plugin (ou ajouter un chemin de plugin à `plugins.load.paths` ; utilisez `--force` pour écraser une cible d'installation existante).
- `openclaw plugins marketplace list <marketplace>` — lister les entrées du marketplace avant l'installation.
- `openclaw plugins enable <id>` / `disable <id>` — basculer `plugins.entries.<id>.enabled`.
- `openclaw plugins doctor` — signaler les erreurs de chargement des plugins.

La plupart des modifications de plugins nécessitent un redémarrage de la passerelle. Voir [/plugin](/en/tools/plugin).

## Mémoire

Recherche vectorielle sur `MEMORY.md` + `memory/*.md` :

- `openclaw memory status` — afficher les statistiques de l'index ; utiliser `--deep` pour les vérifications de préparation des vecteurs + embeddings ou `--fix` pour réparer les artefacts de rappel/promotion obsolètes.
- `openclaw memory index` — réindexer les fichiers de mémoire.
- `openclaw memory search "<query>"` (ou `--query "<query>"`) — recherche sémantique dans la mémoire.
- `openclaw memory promote` — classer les rappels à court terme et ajouter facultativement les meilleures entrées dans `MEMORY.md`.

## Sandbox

Gérer les runtimes Sandbox pour l'exécution isolée des agents. Voir [/cli/sandbox](/en/cli/sandbox).

Sous-commandes :

- `sandbox list [--browser] [--json]`
- `sandbox recreate [--all] [--session <key>] [--agent <id>] [--browser] [--force]`
- `sandbox explain [--session <key>] [--agent <id>] [--json]`

Notes :

- `sandbox recreate` supprime les runtimes existants afin que la prochaine utilisation les réensemence avec la configuration actuelle.
- Pour les backends `ssh` et OpenShell `remote`, recréer supprime l'espace de travail distant canonique pour la portée sélectionnée.

## Commandes slash de chat

Les messages de chat prennent en charge les commandes `/...` (texte et natif). Voir [/tools/slash-commands](/en/tools/slash-commands).

Points forts :

- `/status` pour un diagnostic rapide.
- `/config` pour les modifications de configuration persistantes.
- `/debug` pour les substitutions de configuration uniquement à l'exécution (mémoire, pas disque ; nécessite `commands.debug: true`).

## Configuration + onboarding

### `completion`

Générer des scripts de complétion de shell et les installer facultativement dans votre profil de shell.

Options :

- `-s, --shell <zsh|bash|powershell|fish>`
- `-i, --install`
- `--write-state`
- `-y, --yes`

Notes :

- Sans `--install` ou `--write-state`, `completion` imprime le script sur stdout.
- `--install` écrit un bloc `OpenClaw Completion` dans votre profil de shell et le dirige vers le script mis en cache sous le répertoire d'état OpenClaw.

### `setup`

Initialiser la configuration + l'espace de travail.

Options :

- `--workspace <dir>` : chemin de l'espace de travail de l'agent (par défaut `~/.openclaw/workspace`).
- `--wizard` : exécuter l'onboarding.
- `--non-interactive` : exécuter l'onboarding sans invite.
- `--mode <local|remote>` : mode d'onboarding.
- `--remote-url <url>` : URL du Gateway distant.
- `--remote-token <token>` : jeton du Gateway distant.

L'onboarding s'exécute automatiquement lorsque des indicateurs d'onboarding sont présents (`--non-interactive`, `--mode`, `--remote-url`, `--remote-token`).

### `onboard`

Onboarding interactif pour la passerelle, l'espace de travail et les compétences.

Options :

- `--workspace <dir>`
- `--reset` (réinitialiser la configuration + les identifiants + les sessions avant l'onboarding)
- `--reset-scope <config|config+creds+sessions|full>` (par défaut `config+creds+sessions` ; utiliser `full` pour également supprimer l'espace de travail)
- `--non-interactive`
- `--mode <local|remote>`
- `--flow <quickstart|advanced|manual>` (manuel est un alias pour avancé)
- `--auth-choice <choice>` où `<choice>` est l'un des suivants :
  `chutes`, `deepseek-api-key`, `openai-codex`, `openai-api-key`,
  `openrouter-api-key`, `kilocode-api-key`, `litellm-api-key`, `ai-gateway-api-key`,
  `cloudflare-ai-gateway-api-key`, `moonshot-api-key`, `moonshot-api-key-cn`,
  `kimi-code-api-key`, `synthetic-api-key`, `venice-api-key`, `together-api-key`,
  `huggingface-api-key`, `apiKey`, `gemini-api-key`, `zai-api-key`,
  `zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`, `xiaomi-api-key`,
  `minimax-global-oauth`, `minimax-global-api`, `minimax-cn-oauth`, `minimax-cn-api`,
  `opencode-zen`, `opencode-go`, `github-copilot`, `copilot-proxy`, `xai-api-key`,
  `mistral-api-key`, `volcengine-api-key`, `byteplus-api-key`, `qianfan-api-key`,
  `qwen-standard-api-key-cn`, `qwen-standard-api-key`, `qwen-api-key-cn`, `qwen-api-key`,
  `modelstudio-standard-api-key-cn`, `modelstudio-standard-api-key`,
  `modelstudio-api-key-cn`, `modelstudio-api-key`, `custom-api-key`, `skip`
- Remarque Qwen : `qwen-*` est la famille de choix d'authentification canonique. Les identifiants `modelstudio-*`
  restent acceptés uniquement comme alias de compatibilité hérités.
- `--secret-input-mode <plaintext|ref>` (défaut `plaintext` ; utilisez `ref` pour stocker les références d'environnement par défaut du provider au lieu des clés en texte clair)
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
- `--custom-base-url <url>` (non-interactif ; utilisé avec `--auth-choice custom-api-key`)
- `--custom-model-id <id>` (non-interactif ; utilisé avec `--auth-choice custom-api-key`)
- `--custom-api-key <key>` (non-interactif ; facultatif ; utilisé avec `--auth-choice custom-api-key` ; revient à `CUSTOM_API_KEY` si omis)
- `--custom-provider-id <id>` (non-interactif ; identifiant de fournisseur personnalisé facultatif)
- `--custom-compatibility <openai|anthropic>` (non-interactif ; facultatif ; par défaut `openai`)
- `--gateway-port <port>`
- `--gateway-bind <loopback|lan|tailnet|auto|custom>`
- `--gateway-auth <token|password>`
- `--gateway-token <token>`
- `--gateway-token-ref-env <name>` (non-interactif ; stocke `gateway.auth.token` en tant que SecretRef d'environnement ; nécessite que cette variable d'environnement soit définie ; ne peut pas être combiné avec `--gateway-token`)
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
- `--skip-search`
- `--skip-health`
- `--skip-ui`
- `--cloudflare-ai-gateway-account-id <id>`
- `--cloudflare-ai-gateway-gateway-id <id>`
- `--node-manager <npm|pnpm|bun>` (gestionnaire de nœuds setup/onboarding pour les compétences ; pnpm recommandé, bun également pris en charge)
- `--json`

### `configure`

Assistant de configuration interactive (modèles, canaux, compétences, passerelle).

Options :

- `--section <section>` (répétable ; limite l'assistant à des sections spécifiques)

### `config`

Helpers de configuration non interactive (get/set/unset/file/schema/validate). L'exécution de `openclaw config` sans
sous-commande lance l'assistant.

Sous-commandes :

- `config get <path>` : afficher une valeur de configuration (chemin à points/crochets).
- `config set` : prend en charge quatre modes d'affectation :
  - mode valeur : `config set <path> <value>` (analyse JSON5 ou chaîne)
  - mode constructeur SecretRef : `config set <path> --ref-provider <provider> --ref-source <source> --ref-id <id>`
  - mode constructeur provider : `config set secrets.providers.<alias> --provider-source <env|file|exec> ...`
  - mode batch : `config set --batch-json '<json>'` ou `config set --batch-file <path>`
- `config set --dry-run` : valider les affectations sans écrire `openclaw.json` (les vérifications exec SecretRef sont ignorées par défaut).
- `config set --allow-exec --dry-run` : activer les vérifications à blanc exec SecretRef (peut exécuter des commandes provider).
- `config set --dry-run --json` : émettre une sortie à blanc lisible par machine (vérifications + signal de complétude, opérations, références vérifiées/ignorées, erreurs).
- `config set --strict-json` : exiger l'analyse JSON5 pour l'entrée chemin/valeur. `--json` reste un alias historique pour l'analyse stricte hors mode de sortie à blanc.
- `config unset <path>` : supprimer une valeur.
- `config file` : afficher le chemin du fichier de configuration actif.
- `config schema` : afficher le schéma JSON généré pour `openclaw.json`, y compris les métadonnées de documentation de champ `title` / `description` propagées à travers les branches d'objets imbriqués, caractères génériques, éléments de tableau et compositions, ainsi que les métadonnées de schéma de plugin/channel en direct au mieux.
- `config validate` : valider la configuration actuelle par rapport au schéma sans démarrer la passerelle.
- `config validate --json` : émettre une sortie JSON lisible par machine.

### `doctor`

Vérifications de santé + correctifs rapides (config + passerelle + services hérités).

Options :

- `--no-workspace-suggestions` : désactiver les conseils de mémoire de l'espace de travail.
- `--yes` : accepter les valeurs par défaut sans demander (sans tête).
- `--non-interactive` : ignorer les invites ; appliquer uniquement les migrations sûres.
- `--deep` : recherche des services système supplémentaires pour les installations de passerelle.
- `--repair` (alias : `--fix`) : tente de réparer automatiquement les problèmes détectés.
- `--force` : force les réparations même lorsqu'elles ne sont pas strictement nécessaires.
- `--generate-gateway-token` : génère un nouveau jeton d'authentification de passerelle.

### `dashboard`

Ouvre l'interface de contrôle avec votre jeton actuel.

Options :

- `--no-open` : affiche l'URL mais ne lance pas le navigateur

Remarques :

- Pour les jetons de passerelle gérés par SecretRef, `dashboard` affiche ou ouvre une URL non tokenisée au lieu d'exposer le secret dans la sortie du terminal ou les arguments de lancement du navigateur.

### `update`

Mettre à jour le CLI installé.

Options racine :

- `--json`
- `--no-restart`
- `--dry-run`
- `--channel <stable|beta|dev>`
- `--tag <dist-tag|version|spec>`
- `--timeout <seconds>`
- `--yes`

Sous-commandes :

- `update status`
- `update wizard`

options `update status` :

- `--json`
- `--timeout <seconds>`

options `update wizard` :

- `--timeout <seconds>`

Remarques :

- `openclaw --update` est réécrit en `openclaw update`.

### `backup`

Créer et vérifier les archives de sauvegarde locales pour l'état OpenClaw.

Sous-commandes :

- `backup create`
- `backup verify <archive>`

options `backup create` :

- `--output <path>`
- `--json`
- `--dry-run`
- `--verify`
- `--only-config`
- `--no-include-workspace`

options `backup verify <archive>` :

- `--json`

## Assistants de channel

### `channels`

Gérer les comptes de channels de discussion (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Microsoft Teams).

Sous-commandes :

- `channels list` : afficher les channels configurés et les profils d'authentification.
- `channels status` : vérifier l'accessibilité de la passerelle et l'état du channel (`--probe` exécute des sondages/audits en direct par compte lorsque la passerelle est accessible ; sinon, il revient aux résumés de channel basés uniquement sur la configuration. Utilisez `openclaw health` ou `openclaw status --deep` pour des sondages de santé plus étendus de la passerelle).
- Astuce : `channels status` imprime des avertissements avec des corrections suggérées lorsqu'il peut détecter des erreurs de configuration courantes (puis vous redirige vers `openclaw doctor`).
- `channels logs` : afficher les journaux récents du channel à partir du fichier journal de la passerelle.
- `channels add` : configuration de type assistant lorsqu'aucun indicateur n'est passé ; les indicateurs basculent en mode non interactif.
  - Lors de l'ajout d'un compte non par défaut à un channel utilisant toujours une configuration de niveau supérieur à compte unique, OpenClaw promeut les valeurs délimitées au compte dans la carte des comptes du channel avant d'écrire le nouveau compte. La plupart des channels utilisent `accounts.default` ; Matrix peut conserver à la place une cible nommée/défaut correspondante existante.
  - Le `channels add` non interactif ne crée/met pas à niveau automatiquement les liaisons ; les liaisons limitées au channel continuent de correspondre au compte par défaut.
- `channels remove` : désactivé par défaut ; passez `--delete` pour supprimer les entrées de configuration sans invite.
- `channels login` : connexion interactive au channel (WhatsApp Web uniquement).
- `channels logout` : se déconnecter d'une session de channel (si pris en charge).

Options courantes :

- `--channel <name>` : `whatsapp|telegram|discord|googlechat|slack|mattermost|signal|imessage|msteams`
- `--account <id>` : id de compte de channel (par défaut `default`)
- `--name <label>` : nom d'affichage pour le compte

Options `channels login` :

- `--channel <channel>` (par défaut `whatsapp` ; prend en charge `whatsapp`/`web`)
- `--account <id>`
- `--verbose`

Options `channels logout` :

- `--channel <channel>` (par défaut `whatsapp`)
- `--account <id>`

Options `channels list` :

- `--no-usage` : ignorer les instantanés d'utilisation/quota du fournisseur de modèle (uniquement pour OAuth/API).
- `--json` : sortie JSON (inclut l'utilisation sauf si `--no-usage` est défini).

options `channels status` :

- `--probe`
- `--timeout <ms>`
- `--json`

options `channels capabilities` :

- `--channel <name>`
- `--account <id>` (uniquement avec `--channel`)
- `--target <dest>`
- `--timeout <ms>`
- `--json`

options `channels resolve` :

- `<entries...>`
- `--channel <name>`
- `--account <id>`
- `--kind <auto|user|group>`
- `--json`

options `channels logs` :

- `--channel <name|all>` (par défaut `all`)
- `--lines <n>` (par défaut `200`)
- `--json`

Notes :

- `channels login` prend en charge `--verbose`.
- `channels capabilities --account` ne s'applique que lorsque `--channel` est défini.
- `channels status --probe` peut afficher l'état du transport ainsi que les résultats de sonde/audit tels que `works`, `probe failed`, `audit ok` ou `audit failed`, selon la prise en charge du canal.

Plus de détails : [/concepts/oauth](/en/concepts/oauth)

Exemples :

```bash
openclaw channels add --channel telegram --account alerts --name "Alerts Bot" --token $TELEGRAM_BOT_TOKEN
openclaw channels add --channel discord --account work --name "Work Bot" --token $DISCORD_BOT_TOKEN
openclaw channels remove --channel discord --account work --delete
openclaw channels status --probe
openclaw status --deep
```

### `directory`

Rechercher les IDs personnels, de pairs et de groupes pour les canaux qui exposent une surface de répertoire. Voir [`openclaw directory`](/en/cli/directory).

Options courantes :

- `--channel <name>`
- `--account <id>`
- `--json`

Sous-commandes :

- `directory self`
- `directory peers list [--query <text>] [--limit <n>]`
- `directory groups list [--query <text>] [--limit <n>]`
- `directory groups members --group-id <id> [--limit <n>]`

### `skills`

Lister et inspecter les compétences disponibles ainsi que les informations de disponibilité.

Sous-commandes :

- `skills search [query...]` : rechercher des compétences ClawHub.
- `skills search --limit <n> --json` : limiter les résultats de recherche ou émettre une sortie lisible par machine.
- `skills install <slug>` : installer une compétence depuis ClawHub dans l'espace de travail actif.
- `skills install <slug> --version <version>` : installer une version spécifique de ClawHub.
- `skills install <slug> --force` : écraser un dossier de compétence d'espace de travail existant.
- `skills update <slug|--all>` : mettre à jour les compétences ClawHub suivies.
- `skills list` : lister les compétences (par défaut lorsqu'il n'y a pas de sous-commande).
- `skills list --json` : émettre un inventaire de compétences lisible par machine sur stdout.
- `skills list --verbose` : inclure les exigences manquantes dans le tableau.
- `skills info <name>` : afficher les détails d'une compétence.
- `skills info <name> --json` : émettre des détails lisibles par machine sur stdout.
- `skills check` : résumé des exigences prêtes par rapport à celles manquantes.
- `skills check --json` : émettre une sortie de disponibilité lisible par machine sur stdout.

Options :

- `--eligible` : afficher uniquement les compétences prêtes.
- `--json` : sortie JSON (pas de style).
- `-v`, `--verbose` : inclure les détails des exigences manquantes.

Astuce : utilisez `openclaw skills search`, `openclaw skills install` et `openclaw skills update` pour les compétences prises en charge par ClawHub.

### `pairing`

Approuver les demandes d'appariement DM sur plusieurs canaux.

Sous-commandes :

- `pairing list [channel] [--channel <channel>] [--account <id>] [--json]`
- `pairing approve <channel> <code> [--account <id>] [--notify]`
- `pairing approve --channel <channel> [--account <id>] <code> [--notify]`

Remarques :

- Si exactement un canal compatible avec l'appariement est configuré, `pairing approve <code>` est également autorisé.
- `list` et `approve` prennent tous deux en charge `--account <id>` pour les canaux multi-comptes.

### `devices`

Gérer les entrées d'appariement de périphériques de passerelle et les jetons de périphérique par rôle.

Sous-commandes :

- `devices list [--json]`
- `devices approve [requestId] [--latest]`
- `devices reject <requestId>`
- `devices remove <deviceId>`
- `devices clear --yes [--pending]`
- `devices rotate --device <id> --role <role> [--scope <scope...>]`
- `devices revoke --device <id> --role <role>`

Remarques :

- `devices list` et `devices approve` peuvent revenir aux fichiers de couplage locaux sur le local loopback lorsque la portée de couplage direct est indisponible.
- `devices approve` sélectionne automatiquement la demande en attente la plus récente lorsqu'aucun `requestId` n'est passé ou que `--latest` est défini.
- Les reconnexions par jeton stocké réutilisent les portées approuvées en cache du jeton ; une `devices rotate --scope ...` explicite met à jour cet ensemble de portées stocké pour les futures reconnexions par jeton en cache.
- `devices rotate` et `devices revoke` renvoient des payloads JSON.

### `qr`

Générer un QR de couplage mobile et un code de configuration à partir de la configuration actuelle du Gateway. Voir [`openclaw qr`](/en/cli/qr).

Options :

- `--remote`
- `--url <url>`
- `--public-url <url>`
- `--token <token>`
- `--password <password>`
- `--setup-code-only`
- `--no-ascii`
- `--json`

Notes :

- `--token` et `--password` sont mutuellement exclusifs.
- Le code de configuration contient un jeton d'amorçage à courte durée de vie, et non le jeton/mot de passe partagé de la passerelle.
- Le transfert d'amorçage intégré conserve le jeton du nœud principal à `scopes: []`.
- Tout jeton d'amorçage d'opérateur transféré reste lié à `operator.approvals`, `operator.read`, `operator.talk.secrets` et `operator.write`.
- Les vérifications de portée d'amorçage sont préfixées par rôle, de sorte que la liste d'autorisation de l'opérateur ne satisfait que les demandes de l'opérateur ; les rôles non-opérateurs ont toujours besoin de portées sous leur propre préfixe de rôle.
- `--remote` peut utiliser `gateway.remote.url` ou l'URL active Tailscale Serve/Funnel.
- Après le scan, approuvez la demande avec `openclaw devices list` / `openclaw devices approve <requestId>`.

### `clawbot`

Espace de noms d'alias hérité. Prend actuellement en charge `openclaw clawbot qr`, qui correspond à [`openclaw qr`](/en/cli/qr).

### `hooks`

Gérer les hooks internes de l'agent.

Sous-commandes :

- `hooks list`
- `hooks info <name>`
- `hooks check`
- `hooks enable <name>`
- `hooks disable <name>`
- `hooks install <path-or-spec>` (alias déprécié pour `openclaw plugins install`)
- `hooks update [id]` (alias déprécié pour `openclaw plugins update`)

Options courantes :

- `--json`
- `--eligible`
- `-v`, `--verbose`

Notes :

- Les hooks gérés par des plugins ne peuvent pas être activés ou désactivés via `openclaw hooks` ; activez ou désactivez plutôt le plugin propriétaire.
- `hooks install` et `hooks update` fonctionnent toujours comme alias de compatibilité, mais ils affichent des avertissements de dépréciation et redirigent vers les commandes du plugin.

### `webhooks`

Assistants de webhook. L'interface intégrée actuelle est la configuration + le lanceur Gmail Pub/Sub :

- `webhooks gmail setup`
- `webhooks gmail run`

### `webhooks gmail`

Configuration + exécution du hook Gmail Pub/Sub. Voir [Gmail Pub/Sub](/en/automation/cron-jobs#gmail-pubsub-integration).

Sous-commandes :

- `webhooks gmail setup` (requiert `--account <email>` ; prend en charge `--project`, `--topic`, `--subscription`, `--label`, `--hook-url`, `--hook-token`, `--push-token`, `--bind`, `--port`, `--path`, `--include-body`, `--max-bytes`, `--renew-minutes`, `--tailscale`, `--tailscale-path`, `--tailscale-target`, `--push-endpoint`, `--json`)
- `webhooks gmail run` (redéfinitions d'exécution pour les mêmes indicateurs)

Notes :

- `setup` configure la surveillance Gmail ainsi que le chemin de push vers OpenClaw.
- `run` démarre la boucle locale de surveillance/renouvellement Gmail avec des remplacements d'exécution facultatifs.

### `dns`

Assistants DNS de découverte étendue (CoreDNS + Tailscale). Surface intégrée actuelle :

- `dns setup [--domain <domain>] [--apply]`

### `dns setup`

Assistant DNS de découverte étendue (CoreDNS + Tailscale). Voir [/gateway/discovery](/en/gateway/discovery).

Options :

- `--domain <domain>`
- `--apply` : installer/mettre à jour la configuration CoreDNS (nécessite sudo ; macOS uniquement).

Notes :

- Sans `--apply`, il s'agit d'un assistant de planification qui imprime la configuration DNS OpenClaw + Tailscale recommandée.
- `--apply` prend actuellement en charge macOS avec CoreDNS via Homebrew uniquement.

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

Exécutez un tour d'agent via le Gateway (ou `--local` intégré).

Passez au moins un sélecteur de session : `--to`, `--session-id`, ou `--agent`.

Obligatoire :

- `-m, --message <text>`

Options :

- `-t, --to <dest>` (pour la clé de session et la livraison facultative)
- `--session-id <id>`
- `--agent <id>` (id d'agent ; remplace les liaisons de routage)
- `--thinking <off|minimal|low|medium|high|xhigh>` (le support du provider varie ; non limité par le model au niveau de la CLI)
- `--verbose <on|off>`
- `--channel <channel>` (canal de livraison ; omettre pour utiliser le canal de session principal)
- `--reply-to <target>` (remplacement de la cible de livraison, distinct du routage de session)
- `--reply-channel <channel>` (remplacement du canal de livraison)
- `--reply-account <id>` (remplacement de l'identifiant du compte de livraison)
- `--local` (exécution intégrée ; le registre de plugins se précharge toujours en premier)
- `--deliver`
- `--json`
- `--timeout <seconds>`

Notes :

- Le mode Gateway revient à l'agent intégré lorsque la demande Gateway échoue.
- `--local` précharge toujours le registre de plugins, de sorte que les fournisseurs, les outils et les canaux fournis par le plugin restent disponibles lors des exécutions intégrées.
- `--channel`, `--reply-channel` et `--reply-account` affectent la livraison des réponses, pas le routage.

### `agents`

Gérer les agents isolés (espaces de travail + auth + routage).

L'exécution de `openclaw agents` sans sous-commande est équivalente à `openclaw agents list`.

#### `agents list`

Lister les agents configurés.

Options :

- `--json`
- `--bindings`

#### `agents add [name]`

Ajouter un nouvel agent isolé. Exécute l'assistant guidé sauf si des indicateurs (ou `--non-interactive`) sont passés ; `--workspace` est requis en mode non interactif.

Options :

- `--workspace <dir>`
- `--model <id>`
- `--agent-dir <dir>`
- `--bind <channel[:accountId]>` (répétable)
- `--non-interactive`
- `--json`

Les spécifications de liaison utilisent `channel[:accountId]`. Lorsque `accountId` est omis, OpenClaw peut résoudre la portée du compte via les valeurs par défaut du canal/hooks du plugin ; sinon, il s'agit d'une liaison de canal sans portée de compte explicite.
Le passage de indicateurs d'ajout explicites bascule la commande sur le chemin non interactif. `main` est réservé et ne peut pas être utilisé comme identifiant du nouvel agent.

#### `agents bindings`

Lister les liaisons de routage.

Options :

- `--agent <id>`
- `--json`

#### `agents bind`

Ajouter des liaisons de routage pour un agent.

Options :

- `--agent <id>` (vaut par défaut l'agent par défaut actuel)
- `--bind <channel[:accountId]>` (répétable)
- `--json`

#### `agents unbind`

Supprimer les liaisons de routage pour un agent.

Options :

- `--agent <id>` (vaut l'agent par défaut actuel par défaut)
- `--bind <channel[:accountId]>` (répétable)
- `--all`
- `--json`

Utilisez soit `--all` soit `--bind`, mais pas les deux.

#### `agents delete <id>`

Supprimer un agent et nettoyer son espace de travail et son état.

Options :

- `--force`
- `--json`

Remarques :

- `main` ne peut pas être supprimé.
- Sans `--force`, une confirmation interactive est requise.

#### `agents set-identity`

Mettre à jour l'identité d'un agent (nom/thème/emoji/avatar).

Options :

- `--agent <id>`
- `--workspace <dir>`
- `--identity-file <path>`
- `--from-identity`
- `--name <name>`
- `--theme <theme>`
- `--emoji <emoji>`
- `--avatar <value>`
- `--json`

Remarques :

- `--agent` ou `--workspace` peuvent être utilisés pour sélectionner l'agent cible.
- Lorsqu'aucun champ d'identité explicite n'est fourni, la commande lit `IDENTITY.md`.

### `acp`

Exécuter le pont ACP qui connecte les IDE au Gateway.

Options racine :

- `--url <url>`
- `--token <token>`
- `--token-file <path>`
- `--password <password>`
- `--password-file <path>`
- `--session <key>`
- `--session-label <label>`
- `--require-existing`
- `--reset-session`
- `--no-prefix-cwd`
- `--provenance <off|meta|meta+receipt>`
- `--verbose`

#### `acp client`

Client ACP interactif pour le débogage du pont.

Options :

- `--cwd <dir>`
- `--server <command>`
- `--server-args <args...>`
- `--server-verbose`
- `--verbose`

Voir [`acp`](/en/cli/acp) pour le comportement complet, les notes de sécurité et les exemples.

### `mcp`

Gérer les définitions de serveur MCP enregistrées et exposer les canaux OpenClaw via MCP stdio.

#### `mcp serve`

Exposer les conversations de canal OpenClaw routées via MCP stdio.

Options :

- `--url <url>`
- `--token <token>`
- `--token-file <path>`
- `--password <password>`
- `--password-file <path>`
- `--claude-channel-mode <auto|on|off>`
- `--verbose`

#### `mcp list`

Lister les définitions de serveur MCP enregistrées.

Options :

- `--json`

#### `mcp show [name]`

Afficher une définition de serveur MCP enregistrée ou l'objet complet du serveur MCP enregistré.

Options :

- `--json`

#### `mcp set <name> <value>`

Enregistrer une définition de serveur MCP à partir d'un objet JSON.

#### `mcp unset <name>`

Supprimer une définition de serveur MCP enregistrée.

### `approvals`

Gérer les approbations exec. Alias : `exec-approvals`.

#### `approvals get`

Récupérer l'instantané des approbations exec et la stratégie effective.

Options :

- `--node <node>`
- `--gateway`
- `--json`
- options de nœud RPC depuis `openclaw nodes`

#### `approvals set`

Remplacer les approbations exec par du JSON depuis un fichier ou stdin.

Options :

- `--node <node>`
- `--gateway`
- `--file <path>`
- `--stdin`
- `--json`
- options de nœud RPC depuis `openclaw nodes`

#### `approvals allowlist add|remove`

Modifier la liste d'autorisation exec par agent.

Options :

- `--node <node>`
- `--gateway`
- `--agent <id>` (par défaut `*`)
- `--json`
- options de nœud RPC depuis `openclaw nodes`

### `status`

Afficher l'état de santé de la session liée et les destinataires récents.

Options :

- `--json`
- `--all` (diagnostic complet ; lecture seule, collable)
- `--deep` (demande à la passerelle une sonde de santé en direct, incluant les sondes de canal lorsque pris en charge)
- `--usage` (affiche l'utilisation/le quota du provider de modèles)
- `--timeout <ms>`
- `--verbose`
- `--debug` (alias pour `--verbose`)

Notes :

- La vue d'ensemble inclut le statut du Gateway et du service d'hôte de nœud lorsque disponible.
- `--usage` affiche les fenêtres d'utilisation normalisées du provider sous forme de `X% left`.

### Suivi de l'utilisation

OpenClaw peut afficher l'utilisation/le quota du provider lorsque les identifiants OAuth/API sont disponibles.

Interfaces :

- `/status` (ajoute une ligne courte d'utilisation du provider lorsque disponible)
- `openclaw status --usage` (affiche la répartition complète du provider)
- Barre de menu macOS (section Utilisation sous Contexte)

Notes :

- Les données proviennent directement des points de terminaison d'utilisation du provider (pas d'estimations).
- La sortie lisible par l'homme est normalisée en `X% left` pour tous les providers.
- Providers avec des fenêtres d'utilisation actuelles : Anthropic, GitHub Copilot, Gemini CLI, OpenAI Codex, MiniMax, Xiaomi et z.ai.
- Note MiniMax : `usage_percent` / `usagePercent` bruts signifient le quota restant, donc OpenClaw l'inverse avant l'affichage ; les champs basés sur le compte priment toujours lorsqu'ils sont présents. Les réponses `model_remains` privilégient l'entrée du modèle de chat, dérivent le label de la fenêtre à partir des horodatages si nécessaire, et incluent le nom du modèle dans le label du plan.
- L'authentification pour l'utilisation provient de hooks spécifiques au provider lorsque disponibles ; sinon OpenClaw revient à faire correspondre les identifiants de clé OAuth/API depuis les profils d'auth, l'env ou la config. Si aucun n'est résolu, l'utilisation est masquée.
- Détails : voir [Suivi de l'utilisation](/en/concepts/usage-tracking).

### `health`

Récupérer l'état de santé du Gateway en cours d'exécution.

Options :

- `--json`
- `--timeout <ms>`
- `--verbose` (force une sonde en direct et imprime les détails de connexion de la passerelle)
- `--debug` (alias pour `--verbose`)

Notes :

- `health` par défaut peut renvoyer un instantané frais de la passerelle mis en cache.
- `health --verbose` force une sonde en direct et étend la sortie lisible par l'homme sur tous les comptes et agents configurés.

### `sessions`

Répertorie les sessions de conversation stockées.

Options :

- `--json`
- `--verbose`
- `--store <path>`
- `--active <minutes>`
- `--agent <id>` (filtrer les sessions par agent)
- `--all-agents` (afficher les sessions de tous les agents)

Sous-commandes :

- `sessions cleanup` — supprimer les sessions expirées ou orphelines

Notes :

- `sessions cleanup` prend également en charge `--fix-missing` pour supprimer les entrées dont les fichiers de transcription ont disparu.

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

Désinstaller le service de passerelle + les données locales (la CLI reste installée).

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
- `--all` supprime le service, l'état, l'espace de travail et l'application ensemble.

### `tasks`

Répertorier et gérer les exécutions de [tâches d'arrière-plan](/en/automation/tasks) sur les agents.

- `tasks list` — afficher les exécutions de tâches actives et récentes
- `tasks show <id>` — afficher les détails d'une exécution de tâche spécifique
- `tasks notify <id>` — modifier la stratégie de notification pour une exécution de tâche
- `tasks cancel <id>` — annuler une tâche en cours d'exécution
- `tasks audit` — signaler les problèmes opérationnels (périmés, perdus, échecs de livraison)
- `tasks maintenance [--apply] [--json]` — prévisualiser ou appliquer des tâches et le nettoyage/réconciliation de TaskFlow (sessions enfants ACP/subagent, tâches cron actives, exécutions CLI en cours)
- `tasks flow list` — lister les flux de tâches actifs et récents
- `tasks flow show <lookup>` — inspecter un flux par id ou clé de recherche
- `tasks flow cancel <lookup>` — annuler un flux en cours d'exécution et ses tâches actives

### `flows`

Raccourci de l'ancienne documentation. Les commandes de flux se trouvent sous `openclaw tasks flow` :

- `tasks flow list [--json]`
- `tasks flow show <lookup>`
- `tasks flow cancel <lookup>`

## Gateway

### `gateway`

Exécuter la passerelle WebSocket Gateway.

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

- `gateway status` sonde le Gateway RPC par défaut en utilisant le port/config résolu du service (remplacer par `--url/--token/--password`).
- `gateway status` prend en charge `--no-probe`, `--deep`, `--require-rpc` et `--json` pour les scripts.
- `gateway status` expose également les services de passerelle hérités ou supplémentaires lorsqu'il peut les détecter (`--deep` ajoute des analyses au niveau du système). Les services OpenClaw nommés par profil sont traités comme des services de premier plan et ne sont pas signalés comme « extra ».
- `gateway status` reste disponible pour le diagnostic même lorsque la configuration locale de la CLI est manquante ou non valide.
- `gateway status` affiche le chemin résolu du fichier journal, l'instantané des chemins/validité de la configuration CLI-vs-service et l'URL cible de la sonde résolue.
- Si les SecretRefs d'authentification de passerelle ne sont pas résolus dans le chemin de commande actuel, `gateway status --json` signale `rpc.authWarning` uniquement lorsque la connectivité/l'authentification de la sonde échoue (les avertissements sont supprimés lorsque la sonde réussit).
- Sur les installations systemd Linux, les vérifications de dérive des jetons d'état incluent les sources d'unité `Environment=` et `EnvironmentFile=`.
- `gateway install|uninstall|start|stop|restart` prennent en charge `--json` pour les scripts (la sortie par défaut reste conviviale pour les humains).
- `gateway install` utilise par défaut le runtime Node ; bun est **déconseillé** (bugs WhatsApp/Telegram).
- Options `gateway install` : `--port`, `--runtime`, `--token`, `--force`, `--json`.

### `daemon`

Alias hérité pour les commandes de gestion de service Gateway. Voir [/cli/daemon](/en/cli/daemon).

Sous-commandes :

- `daemon status`
- `daemon install`
- `daemon uninstall`
- `daemon start`
- `daemon stop`
- `daemon restart`

Options courantes :

- `status` : `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
- `install` : `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- `uninstall|start|stop|restart` : `--json`

### `logs`

Suivre les journaux de fichiers du Gateway via RPC.

Options :

- `--limit <n>` : nombre maximal de lignes de journal à renvoyer
- `--max-bytes <n>` : nombre maximal d'octets à lire depuis le fichier journal
- `--follow` : suivre le fichier journal (style tail -f)
- `--interval <ms>` : intervalle d'interrogation en ms lors du suivi
- `--local-time` : afficher les horodatages en heure locale
- `--json` : émettre du JSON délimité par des lignes
- `--plain` : désactiver le formatage structuré
- `--no-color` : désactiver les couleurs ANSI
- `--url <url>` : URL WebSocket explicite du Gateway
- `--token <token>` : jeton du Gateway
- `--timeout <ms>` : délai d'expiration du Gateway du RPC
- `--expect-final` : attendre une réponse finale lorsque cela est nécessaire

Exemples :

```bash
openclaw logs --follow
openclaw logs --limit 200
openclaw logs --plain
openclaw logs --json
openclaw logs --no-color
```

Notes :

- Si vous transmettez `--url`, le CLI n'applique pas automatiquement la configuration ou les identifiants de l'environnement.
- En cas d'échec de l'appariement de bouclage local, le système revient au fichier journal local configuré ; les cibles `--url` explicites ne le font pas.

### `gateway <subcommand>`

Aides du Gateway du CLI (utilisez `--url`, `--token`, `--password`, `--timeout`, `--expect-final` pour les sous-commandes RPC).
Lorsque vous transmettez `--url`, le CLI n'applique pas automatiquement la configuration ou les identifiants de l'environnement.
Incluez `--token` ou `--password` explicitement. L'absence d'identifiants explicites constitue une erreur.

Sous-commandes :

- `gateway call <method> [--params <json>] [--url <url>] [--token <token>] [--password <password>] [--timeout <ms>] [--expect-final] [--json]`
- `gateway health`
- `gateway status`
- `gateway probe`
- `gateway discover`
- `gateway install|uninstall|start|stop|restart`
- `gateway run`

Notes :

- `gateway status --deep` ajoute une analyse de service au niveau du système. Utilisez `gateway probe`,
  `health --verbose`, ou `status --deep` de premier niveau pour plus de détails sur les sondes d'exécution.

RPC courants :

- `config.schema.lookup` (inspecter un sous-arbre de configuration avec un nœud de schéma superficiel, des métadonnées de correspondance de conseils et des résumés d'enfants immédiats)
- `config.get` (lire l'instantané de configuration actuel + hachage)
- `config.set` (valider + écrire la configuration complète ; utiliser `baseHash` pour la concurrence optimiste)
- `config.apply` (valider + écrire la configuration + redémarrer + réveiller)
- `config.patch` (fusionner une mise à jour partielle + redémarrer + réveiller)
- `update.run` (exécuter la mise à jour + redémarrer + réveiller)

Conseil : lors de l'appel direct de `config.set`/`config.apply`/`config.patch`, passez `baseHash` depuis
`config.get` si une configuration existe déjà.
Conseil : pour les modifications partielles, inspectez d'abord avec `config.schema.lookup` et préférez `config.patch`.
Conseil : ces RPC d'écriture de configuration effectuent une vérification préalable de la résolution active des SecretRef pour les références dans la charge utile de configuration soumise et rejettent les écritures lorsqu'une référence soumise effectivement active n'est pas résolue.
Conseil : l'outil d'exécution `gateway` réservé au propriétaire refuse toujours de réécrire `tools.exec.ask` ou `tools.exec.security` ; les alias `tools.bash.*` obsolètes se normalisent vers les mêmes chemins d'exécution protégés.

## Modèles

Voir [/concepts/models](/en/concepts/models) pour le comportement de repli et la stratégie d'analyse.

Remarque concernant la facturation : pour Anthropic dans OpenClaw, la distinction pratique se fait par **clé d'API** ou
**abonnement Claude avec Extra Usage**. Anthropic a informé les utilisateurs de OpenClaw le
**4 avril 2026 à 12h00 PT / 20h00 BST** que le chemin de connexion Claude de **OpenClaw**
compte comme une utilisation par tiers et nécessite
**Extra Usage** facturé séparément de l'abonnement. Nos reproductions locales montrent également
que la chaîne de prompt identifiant OpenClaw ne se reproduit pas sur le chemin
SDK Anthropic + clé d'API. Pour la production, préférez une clé d'Anthropic API ou
un autre provider de type abonnement pris en charge tel que OpenAI Codex, Alibaba
Cloud Model Studio Coding Plan, MiniMax Coding Plan, ou Z.AI / GLM Coding
Plan.

Le Anthropic setup-token est à nouveau disponible en tant que chemin d'authentification legacy/manuel.
Ne l'utilisez qu'en attendant que Anthropic ait indiqué aux utilisateurs de OpenClaw que le chemin
d'abonnement OpenClaw-managed Anthropic nécessite **Extra Usage**.

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
- `--check` (sortie 1=expiré/manquant, 2=expiration proche)
- `--probe` (sonde en direct des profils d'auth configurés)
- `--probe-provider <name>`
- `--probe-profile <id>` (répéter ou séparé par des virgules)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>`

Inclut toujours la vue d'ensemble de l'authentification et le statut d'expiration OAuth pour les profils dans le magasin d'authentification.
`--probe` exécute des requêtes en direct (peut consommer des jetons et déclencher des limitations de débit).
Les lignes de sonde peuvent provenir de profils d'authentification, d'identifiants d'environnement ou de `models.json`.
Attendez-vous à des statuts de sonde tels que `ok`, `auth`, `rate_limit`, `billing`, `timeout`,
`format`, `unknown` et `no_model`.
Lorsqu'un `auth.order.<provider>` explicite omet un profil stocké, la sonde signale
`excluded_by_auth_order` au lieu d'essayer silencieusement ce profil.

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

### `models auth add|login|login-github-copilot|setup-token|paste-token`

Options :

- `add` : assistant d'authentification interactive (flux d'authentification du fournisseur ou collage de jeton)
- `login` : `--provider <name>`, `--method <method>`, `--set-default`
- `login-github-copilot` : flux de connexion GitHub OAuth Copilot (`--yes`)
- `setup-token` : `--provider <name>`, `--yes`
- `paste-token` : `--provider <name>`, `--profile-id <id>`, `--expires-in <duration>`

Notes :

- `setup-token` et `paste-token` sont des commandes de jeton génériques pour les fournisseurs qui exposent des méthodes d'authentification par jeton.
- `setup-token` nécessite un TTY interactif et exécute la méthode d'authentification par jeton du fournisseur.
- `paste-token` demande la valeur du jeton et utilise par défaut l'id de profil d'authentification `<provider>:manual` lorsque `--profile-id` est omis.
- Les `setup-token` / `paste-token` Anthropic sont à nouveau disponibles en tant que chemin d'accès OpenClaw hérité/manuel. Anthropic a indiqué aux utilisateurs OpenClaw que ce chemin nécessite une **Utilisation supplémentaire** sur le compte Claude.

### `models auth order get|set|clear`

Options :

- `get` : `--provider <name>`, `--agent <id>`, `--json`
- `set` : `--provider <name>`, `--agent <id>`, `<profileIds...>`
- `clear` : `--provider <name>`, `--agent <id>`

## Système

### `system event`

Mettre en file d'attente un événement système et déclencher éventuellement un battement de cœur (Gateway RPC).

Obligatoire :

- `--text <text>`

Options :

- `--mode <now|next-heartbeat>`
- `--json`
- `--url`, `--token`, `--timeout`, `--expect-final`

### `system heartbeat last|enable|disable`

Contrôles de battement de cœur (Gateway RPC).

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
- `cron list [--all] [--json]` (sortie tabulaire par défaut ; utilisez `--json` pour le format brut)
- `cron add` (alias : `create` ; nécessite `--name` et exactement l'un des éléments `--at` | `--every` | `--cron`, et exactement une charge utile parmi `--system-event` | `--message`)
- `cron edit <id>` (champs de correctif)
- `cron rm <id>` (alias : `remove`, `delete`)
- `cron enable <id>`
- `cron disable <id>`
- `cron runs --id <id> [--limit <n>]`
- `cron run <id> [--due]`

Toutes les commandes `cron` acceptent `--url`, `--token`, `--timeout`, `--expect-final`.

`cron add|edit --model ...` utilise le model autorisé sélectionné pour la tâche. Si
le modèle n'est pas autorisé, cron avertit et revient à la sélection de
l'agent/de la valeur par défaut de la tâche à la place. Les chaînes de repli
configurées s'appliquent toujours, mais un remplacement de modèle simple sans
liste de repli explicite par tâche n'ajoute plus l'agent principal comme cible
de réessai supplémentaire masquée.

## Hôte de nœud

### `node`

`node` exécute un **hôte de nœud sans interface** ou le gère en tant que service d'arrière-plan. Voir
[`openclaw node`](/en/cli/node).

Sous-commandes :

- `node run --host <gateway-host> --port 18789`
- `node status`
- `node install [--host <gateway-host>] [--port <port>] [--tls] [--tls-fingerprint <sha256>] [--node-id <id>] [--display-name <name>] [--runtime <node|bun>] [--force]`
- `node uninstall`
- `node stop`
- `node restart`

Notes d'authentification :

- `node` résout l'authentification de la passerelle à partir de env/config (pas de drapeaux `--token`/`--password`) : `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`, puis `gateway.auth.*`. En mode local, l'hôte du nœud ignore intentionnellement `gateway.remote.*` ; dans `gateway.mode=remote`, `gateway.remote.*` participe selon les règles de priorité à distance.
- La résolution de l'authentification de l'hôte de nœud honore uniquement les variables d'environnement `OPENCLAW_GATEWAY_*`.

## Nœuds

`nodes` communique avec la Gateway et cible les nœuds appairés. Voir [/nodes](/en/nodes).

Options courantes :

- `--url`, `--token`, `--timeout`, `--json`

Sous-commandes :

- `nodes status [--connected] [--last-connected <duration>]`
- `nodes describe --node <id|name|ip>`
- `nodes list [--connected] [--last-connected <duration>]`
- `nodes pending`
- `nodes approve <requestId>`
- `nodes reject <requestId>`
- `nodes rename --node <id|name|ip> --name <displayName>`
- `nodes invoke --node <id|name|ip> --command <command> [--params <json>] [--invoke-timeout <ms>] [--idempotency-key <key>]`
- `nodes notify --node <id|name|ip> [--title <text>] [--body <text>] [--sound <name>] [--priority <passive|active|timeSensitive>] [--delivery <system|overlay|auto>] [--invoke-timeout <ms>]` (mac uniquement)

Caméra :

- `nodes camera list --node <id|name|ip>`
- `nodes camera snap --node <id|name|ip> [--facing front|back|both] [--device-id <id>] [--max-width <px>] [--quality <0-1>] [--delay-ms <ms>] [--invoke-timeout <ms>]`
- `nodes camera clip --node <id|name|ip> [--facing front|back] [--device-id <id>] [--duration <ms|10s|1m>] [--no-audio] [--invoke-timeout <ms>]`

Canvas + écran :

- `nodes canvas snapshot --node <id|name|ip> [--format png|jpg|jpeg] [--max-width <px>] [--quality <0-1>] [--invoke-timeout <ms>]`
- `nodes canvas present --node <id|name|ip> [--target <urlOrPath>] [--x <px>] [--y <px>] [--width <px>] [--height <px>] [--invoke-timeout <ms>]`
- `nodes canvas hide --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes canvas navigate <url> --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes canvas eval [<js>] --node <id|name|ip> [--js <code>] [--invoke-timeout <ms>]`
- `nodes canvas a2ui push --node <id|name|ip> (--jsonl <path> | --text <text>) [--invoke-timeout <ms>]`
- `nodes canvas a2ui reset --node <id|name|ip> [--invoke-timeout <ms>]`
- `nodes screen record --node <id|name|ip> [--screen <index>] [--duration <ms|10s>] [--fps <n>] [--no-audio] [--out <path>] [--invoke-timeout <ms>]`

Emplacement :

- `nodes location get --node <id|name|ip> [--max-age <ms>] [--accuracy <coarse|balanced|precise>] [--location-timeout <ms>] [--invoke-timeout <ms>]`

## Navigateur

Contrôle du navigateur CLI (Chrome/Brave/Edge/Chromium dédié). Voir [`openclaw browser`](/en/cli/browser) et l'outil [Navigateur](/en/tools/browser).

Options courantes :

- `--url`, `--token`, `--timeout`, `--expect-final`, `--json`
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
- `browser create-profile --name <name> [--color <hex>] [--cdp-url <url>] [--driver existing-session] [--user-data-dir <path>]`
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

## Appel vocal

### `voicecall`

Utilitaires d'appel vocal fournis par le plugin. N'apparaît que lorsque le plugin d'appel vocal est installé et activé. Voir [`openclaw voicecall`](/en/cli/voicecall).

Commandes courantes :

- `voicecall call --to <phone> --message <text> [--mode notify|conversation]`
- `voicecall start --to <phone> [--message <text>] [--mode notify|conversation]`
- `voicecall continue --call-id <id> --message <text>`
- `voicecall speak --call-id <id> --message <text>`
- `voicecall end --call-id <id>`
- `voicecall status --call-id <id>`
- `voicecall tail [--file <path>] [--since <n>] [--poll <ms>]`
- `voicecall latency [--file <path>] [--last <n>]`
- `voicecall expose [--mode off|serve|funnel] [--path <path>] [--port <port>] [--serve-path <path>]`

## Recherche de docs

### `docs`

Rechercher l'index des docs en direct de OpenClaw.

### `docs [query...]`

Rechercher l'index des docs en direct.

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
- `--timeout-ms <ms>` (vaut `agents.defaults.timeoutSeconds` par défaut)
- `--history-limit <n>`
