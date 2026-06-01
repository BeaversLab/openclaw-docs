---
summary: "Application de compagnie macOS OpenClaw (barre de menus + courtier de passerelle)"
read_when:
  - Implementing macOS app features
  - Changing gateway lifecycle or node bridging on macOS
title: "Application macOS"
---

L'application macOS est le **compagnon de la barre de menus** pour OpenClaw. Elle possède les autorisations, gère/attache la Gateway localement (via launchd ou manuellement), et expose les fonctionnalités macOS à l'agent en tant que nœud.

## Ce qu'elle fait

- Affiche les notifications natives et le statut dans la barre de menu.
- Gère les invites TCC (Notifications, Accessibilité, Enregistrement d'écran, Microphone, Reconnaissance vocale, Automatisation/AppleScript).
- Exécute ou se connecte à la Gateway (locale ou distante).
- Expose des outils exclusifs à macOS (Canvas, Camera, Screen Recording, macOSCanvas`system.run`).
- Démarre le service d'hôte de nœud local en mode **distant** (launchd) et l'arrête en mode **local**.
- Héberge optionnellement **PeekabooBridge** pour l'automatisation de l'interface utilisateur.
- Installe la CLI globale (`openclaw`) sur demande via npm, pnpm ou bun (l'application préfère npm, puis pnpm, puis bun ; Node reste le runtime recommandé pour la Gateway).

## Mode local vs distant

- **Local** (par défaut) : l'application se connecte à une Gateway locale en cours d'exécution si elle est présente ; sinon, elle active le service launchd via `openclaw gateway install`.
- **Distant** : l'application se connecte à une Gateway via SSH/Tailscale et ne démarre jamais de processus local. L'application démarre le **service d'hôte de nœud** local pour que la Gateway distante puisse atteindre ce Mac. L'application ne génère pas la Gateway en tant que processus enfant. La découverte de Gateway privilégie désormais les noms MagicDNS Tailscale aux adresses IP brutes du tailnet, de sorte que l'application Mac récupère plus de manière plus fiable lorsque les adresses IP du tailnet changent.

## Contrôle Launchd

L'application gère un LaunchAgent par utilisateur étiqueté `ai.openclaw.gateway`
(ou `ai.openclaw.<profile>` lors de l'utilisation de `--profile`/`OPENCLAW_PROFILE` ; l'ancien `com.openclaw.*` se décharge toujours).

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

Remplacez l'étiquette par `ai.openclaw.<profile>` lors de l'exécution d'un profil nommé.

Si le LaunchAgent n'est pas installé, activez-le depuis l'application ou exécutez
`openclaw gateway install`.

Si la gateway disparaît repeatedly pendant des minutes à des heures et ne reprend que lorsque vous touchez à l'interface de contrôle (Control UI) ou que vous vous connectez en SSH sur l'hôte, consultez la note de troubleshooting pour macOS Maintenance Sleep / macOS`ENETDOWN`Gateway crashes et le respawn-protection gate de launchd dans [Gateway troubleshooting](/fr/gateway/troubleshooting#macos-gateway-silently-stops-responding-then-resumes-when-you-touch-the-dashboard).

## Capacités du nœud (mac)

L'application macOS se présente comme un nœud. Commandes courantes :

- Canvas : Canvas`canvas.present`, `canvas.navigate`, `canvas.eval`, `canvas.snapshot`, `canvas.a2ui.*`
- Caméra : `camera.snap`, `camera.clip`
- Écran : `screen.snapshot`, `screen.record`
- Système : `system.run`, `system.notify`

Le nœud signale une carte `permissions` afin que les agents puissent décider ce qui est autorisé.

Service de nœud + IPC de l'application :

- Lorsque le service d'hôte de nœud sans interface est en cours d'exécution (mode distant), il se connecte au Gateway WS en tant que nœud.
- `system.run`macOS s'exécute dans l'application macOS (contexte UI/TCC) via un socket Unix local ; les invites et les sorties restent dans l'application.

Diagramme (SCI) :

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + TCC + system.run)
```

## Approbations d'exécution (system.run)

`system.run`macOS est contrôlé par **Exec approvals** dans l'application macOS (Settings → Exec approvals).
Security + ask + allowlist sont stockés localement sur le Mac dans :

```
~/.openclaw/exec-approvals.json
```

Exemple :

```json
{
  "version": 1,
  "defaults": {
    "security": "deny",
    "ask": "on-miss"
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "allowlist": [{ "pattern": "/opt/homebrew/bin/rg" }]
    }
  }
}
```

Remarques :

- Les entrées `allowlist` sont des motifs glob pour les chemins binaires résolus, ou des noms de commande nus pour les commandes invoquées via PATH.
- Le texte de commande shell brut qui contient une syntaxe de contrôle ou d'expansion de shell (`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) est traité comme un échec de la liste blanche et nécessite une approbation explicite (ou l'ajout du binaire du shell à la liste blanche).
- Choisir « Always Allow » dans l'invite ajoute cette commande à la liste blanche.
- Les `system.run` de remplacement de l'environnement sont filtrés (suppression de `PATH`, `DYLD_*`, `LD_*`, `NODE_OPTIONS`, `NODE_REDIRECT_WARNINGS`, `NODE_REPL_EXTERNAL_MODULE`, `NODE_REPL_HISTORY`, `NODE_V8_COVERAGE`, `PYTHON*`, `PERL*`, `RUBYOPT`, `SHELLOPTS`, `PS4`), puis fusionnés avec l'environnement de l'application.
- Pour les enveloppeurs de shell (`bash|sh|zsh ... -c/-lc`), les remplacements d'environnement liés à la demande sont réduits à une petite liste d'autorisation explicite (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
- Pour les décisions « autoriser toujours » en mode liste d'autorisation, les enveloppeurs de répartition connus (`env`, `nice`, `nohup`, `stdbuf`, `timeout`) enregistrent les chemins des exécutables internes au lieu des chemins des enveloppeurs. Si le déballage n'est pas sûr, aucune entrée de liste d'autorisation n'est enregistrée automatiquement.

## Liens profonds

L'application enregistre le schéma d'URL `openclaw://` pour les actions locales.

### `openclaw://agent`

Déclenche une requête `agent` du Gateway.

```bash
open 'openclaw://agent?message=Hello%20from%20deep%20link'
```

Paramètres de requête :

- `message` (requis)
- `sessionKey` (facultatif)
- `thinking` (facultatif)
- `deliver` / `to` / `channel` (facultatif)
- `timeoutSeconds` (facultatif)
- `key` (clé de mode sans surveillance facultative)

Sécurité :

- Sans `key`, l'application demande une confirmation.
- Sans `key`, l'application applique une courte limite de message pour l'invite de confirmation et ignore `deliver` / `to` / `channel`.
- Avec un `key` valide, l'exécution est sans surveillance (destinée aux automatisations personnelles).

## Flux d'intégration (type)

1. Installez et lancez **OpenClaw.app**.
2. Remplissez la liste de contrôle des autorisations (invites TCC).
3. Assurez-vous que le mode **Local** est actif et que le Gateway est en cours d'exécution.
4. Installez le CLI si vous souhaitez un accès au terminal.

## Placement du répertoire d'état (macOS)

Évitez de placer votre répertoire d'état OpenClaw dans iCloud ou d'autres dossiers synchronisés dans le cloud.
Les chemins synchronisés peuvent ajouter de la latence et occasionnellement provoquer des conflits de verrouillage/synchronisation de fichiers pour
les sessions et les identifiants.

Préférez un chemin d'état local non synchronisé tel que :

```bash
OPENCLAW_STATE_DIR=~/.openclaw
```

Si `openclaw doctor` détecte un état sous :

- `~/Library/Mobile Documents/com~apple~CloudDocs/...`
- `~/Library/CloudStorage/...`

il avertira et recommandera de revenir à un chemin local.

## Workflow de build et de développement (natif)

- `cd apps/macos && swift build`
- `swift run OpenClaw` (ou Xcode)
- Package de l'application : `scripts/package-mac-app.sh`

## Debug gateway connectivity (macOS CLI)

Utilisez le CLI de débogage pour tester la même logique de négociation WebSocket et de Gateway que celle utilisée par l'application macOS, sans lancer l'application.

```bash
cd apps/macos
swift run openclaw-mac connect --json
swift run openclaw-mac discover --timeout 3000 --json
```

Connect options:

- `--url <ws://host:port>` : remplacer la configuration
- `--mode <local|remote>` : résoudre depuis la configuration (par défaut : config ou local)
- `--probe` : forcer une nouvelle sonde de santé
- `--timeout <ms>` : délai d'expiration de la requête (par défaut : `15000`)
- `--json` : sortie structurée pour comparaison

Discovery options:

- `--include-local` : inclure les passerelles qui seraient filtrées comme "locales"
- `--timeout <ms>` : fenêtre globale de découverte (par défaut : `2000`)
- `--json` : sortie structurée pour comparaison

<Tip>Comparez avec `openclaw gateway discover --json`macOS pour voir si le pipeline de découverte de l'application macOS (`local.`TailscaleCLI ainsi que le domaine de longue distance configuré, avec replis sur longue distance et Tailscale Serve) diffère de la découverte basée sur `dns-sd` du CLI Node.</Tip>

## Remote connection plumbing (SSH tunnels)

When the macOS app runs in **Remote** mode, it opens an SSH tunnel so local UI
components can talk to a remote Gateway as if it were on localhost.

### Control tunnel (Gateway WebSocket port)

- **Purpose:** health checks, status, Web Chat, config, and other control-plane calls.
- **Port local :** le port Gateway (par défaut Gateway`18789`), toujours stable.
- **Remote port:** le même port Gateway sur l'hôte distant.
- **Comportement:** pas de port local aléatoire; l'application réutilise un tunnel sain existant ou le redémarre si nécessaire.
- **Forme SSH :** `ssh -N -L <local>:127.0.0.1:<remote>` avec les options BatchMode +
  ExitOnForwardFailure + keepalive.
- **Rapport IP :** le tunnel SSH utilise le bouclage (loopback), donc la passerelle verra l'IP
  du nœud comme `127.0.0.1`macOS. Utilisez le transport **Direct (ws/wss)** si vous souhaitez que la véritable IP
  du client apparaisse (voir [accès distant macOS](/fr/platforms/mac/remote)).

Pour les étapes de configuration, voir [accès distant macOS](macOS/en/platforms/mac/remoteGateway). Pour les détails du
protocole, voir [protocole Gateway](/fr/gateway/protocol).

## Documentation connexe

- [Runbook Gateway](Gateway/en/gateway)
- [Gateway (macOS)](GatewaymacOS/en/platforms/mac/bundled-gateway)
- [macOS permissions](macOS/en/platforms/mac/permissions)
- [Canvas](Canvas/en/platforms/mac/canvas)
