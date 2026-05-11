---
summary: "Index de la CLI OpenClaw : liste des commandes, indicateurs globaux et liens vers les pages par commande"
read_when:
  - Finding the right `openclaw` subcommand
  - Looking up global flags or output styling rules
title: "Référence CLI"
---

`openclaw` est le point d'entrée principal de la CLI. Chaque commande principale dispose soit d'une page de référence dédiée, soit est documentée avec la commande qu'elle remplace ; cet index répertorie les commandes, les indicateurs globaux et les règles de style de sortie qui s'appliquent à l'ensemble de la CLI.

## Pages de commande

| Zone                                | Commandes                                                                                                                                                                                                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configuration et intégration        | [`crestodian`](/fr/cli/crestodian) · [`setup`](/fr/cli/setup) · [`onboard`](/fr/cli/onboard) · [`configure`](/fr/cli/configure) · [`config`](/fr/cli/config) · [`completion`](/fr/cli/completion) · [`doctor`](/fr/cli/doctor) · [`dashboard`](/fr/cli/dashboard) |
| Réinitialisation et désinstallation | [`backup`](/fr/cli/backup) · [`reset`](/fr/cli/reset) · [`uninstall`](/fr/cli/uninstall) · [`update`](/fr/cli/update)                                                                                                                                             |
| Messagerie et agents                | [`message`](/fr/cli/message) · [`agent`](/fr/cli/agent) · [`agents`](/fr/cli/agents) · [`acp`](/fr/cli/acp) · [`mcp`](/fr/cli/mcp)                                                                                                                                |
| Santé et sessions                   | [`status`](/fr/cli/status) · [`health`](/fr/cli/health) · [`sessions`](/fr/cli/sessions)                                                                                                                                                                          |
| Gateway et journaux                 | [`gateway`](/fr/cli/gateway) · [`logs`](/fr/cli/logs) · [`system`](/fr/cli/system)                                                                                                                                                                                |
| Modèles et inférence                | [`models`](/fr/cli/models) · [`infer`](/fr/cli/infer) · `capability` (alias pour [`infer`](/fr/cli/infer)) · [`memory`](/fr/cli/memory) · [`wiki`](/fr/cli/wiki)                                                                                                  |
| Réseau et nœuds                     | [`directory`](/fr/cli/directory) · [`nodes`](/fr/cli/nodes) · [`devices`](/fr/cli/devices) · [`node`](/fr/cli/node)                                                                                                                                               |
| Runtime et bac à sable              | [`approvals`](/fr/cli/approvals) · `exec-policy` (voir [`approvals`](/fr/cli/approvals)) · [`sandbox`](/fr/cli/sandbox) · [`tui`](/fr/cli/tui) · `chat`/`terminal` (alias pour [`tui --local`](/fr/cli/tui)) · [`browser`](/fr/cli/browser)                       |
| Automatisation                      | [`cron`](/fr/cli/cron) · [`tasks`](/fr/cli/tasks) · [`hooks`](/fr/cli/hooks) · [`webhooks`](/fr/cli/webhooks)                                                                                                                                                     |
| Discovery et documentation          | [`dns`](/fr/cli/dns) · [`docs`](/fr/cli/docs)                                                                                                                                                                                                                     |
| Appairage et canaux                 | [`pairing`](/fr/cli/pairing) · [`qr`](/fr/cli/qr) · [`channels`](/fr/cli/channels)                                                                                                                                                                                |
| Sécurité et plugins                 | [`security`](/fr/cli/security) · [`secrets`](/fr/cli/secrets) · [`skills`](/fr/cli/skills) · [`plugins`](/fr/cli/plugins) · [`proxy`](/fr/cli/proxy)                                                                                                              |
| Alias hérités                       | [`daemon`](/fr/cli/daemon) (service de passerelle) · [`clawbot`](/fr/cli/clawbot) (espace de noms)                                                                                                                                                                |
| Plugins (facultatifs)               | [`voicecall`](/fr/cli/voicecall) (si installé)                                                                                                                                                                                                                    |

## Indicateurs globaux

| Indicateur              | Objectif                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `--dev`                 | Isoler l'état sous `~/.openclaw-dev` et décaler les ports par défaut                 |
| `--profile <name>`      | Isoler l'état sous `~/.openclaw-<name>`                                              |
| `--container <name>`    | Cibler un conteneur nommé pour l'exécution                                           |
| `--no-color`            | Désactiver les couleurs ANSI (`NO_COLOR=1` est également respecté)                   |
| `--update`              | Raccourci pour [`openclaw update`](/fr/cli/update) (installations source uniquement) |
| `-V`, `--version`, `-v` | Afficher la version et quitter                                                       |

## Modes de sortie

- Les couleurs ANSI et les indicateurs de progression ne s'affichent que dans les sessions TTY.
- Les hyperliens OSC-8 s'affichent sous forme de liens cliquables lorsque pris en charge ; sinon, le
  CLI revient à des URL simples.
- `--json` (et `--plain` lorsque pris en charge) désactive le style pour une sortie propre.
- Les commandes de longue durée affichent un indicateur de progression (OSC 9;4 lorsque pris en charge).

Source de vérité de la palette : `src/terminal/palette.ts`.

## Arborescence des commandes

<Accordion title="Arborescence complète des commandes">

```
openclaw [--dev] [--profile <name>] <command>
  crestodian
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
  wiki
    status
    doctor
    init
    ingest
    compile
    lint
    search
    get
    apply
    bridge import
    unsafe-local import
    obsidian status|search|open|command|daily
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
  infer (alias: capability)
    list
    inspect
    model run|list|inspect|providers|auth login|logout|status
    image generate|edit|describe|describe-many|providers
    audio transcribe|providers
    tts convert|voices|providers|status|enable|disable|set-provider
    video generate|describe|providers
    web search|fetch|providers
    embedding create|providers
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
  exec-policy
    show
    preset
    set
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
  proxy
    start
    run
    coverage
    sessions
    query
    blob
    purge
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
  chat (alias: tui --local)
  terminal (alias: tui --local)
```

Les plugins peuvent ajouter des commandes de niveau supérieur supplémentaires (par exemple `openclaw voicecall`).

</Accordion>

## Commandes slash de chat

Les messages de chat prennent en charge les commandes `/...`. Voir [slash commands](/fr/tools/slash-commands).

Points forts :

- `/status` — diagnostics rapides.
- `/trace` — lignes de trace/débogage de plugin limitées à la session.
- `/config` — modifications de configuration persistantes.
- `/debug` — substitutions de configuration uniquement au moment de l'exécution (en mémoire, pas sur le disque ; nécessite `commands.debug: true`).

## Suivi de l'utilisation

`openclaw status --usage` et l'interface de contrôle affichent l'utilisation/quota du fournisseur lorsque
les identifiants OAuth/API sont disponibles. Les données proviennent directement des points de terminaison d'utilisation du fournisseur
et sont normalisées en `X% left`. Fournisseurs avec des fenêtres d'utilisation actuelles :
Anthropic, GitHub Copilot, Gemini CLI, OpenAI Codex, MiniMax,
Xiaomi et z.ai.

Voir [Suivi de l'utilisation](/fr/concepts/usage-tracking) pour plus de détails.

## Connexes

- [Commandes slash](/fr/tools/slash-commands)
- [Configuration](/fr/gateway/configuration)
- [Environnement](/fr/help/environment)
