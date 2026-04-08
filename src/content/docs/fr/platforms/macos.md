---
summary: "Application de compagnie macOS OpenClaw (barre de menus + courtier de passerelle)"
read_when:
  - Implementing macOS app features
  - Changing gateway lifecycle or node bridging on macOS
title: "Application macOS"
---

# Companion macOS OpenClaw (barre de menus + courtier de passerelle)

L'application macOS est le **companion de barre de menus** pour OpenClaw. Elle gère les permissions,
gère/attache la passerelle localement (launchd ou manuel), et expose les fonctionnalités macOS
à l'agent en tant que nœud.

## Ce qu'il fait

- Affiche les notifications natives et le statut dans la barre de menus.
- Gère les invites TCC (Notifications, Accessibilité, Enregistrement d'écran, Microphone,
  Reconnaissance vocale, Automatisation/AppleScript).
- Exécute ou se connecte à la passerelle (locale ou distante).
- Expose les outils exclusifs à macOS (Canvas, Caméra, Enregistrement d'écran, `system.run`).
- Démarre le service d'hôte de nœud local en mode **distant** (launchd), et l'arrête en mode **local**.
- Héberge éventuellement **PeekabooBridge** pour l'automatisation de l'interface utilisateur.
- Installe le CLI global (`openclaw`) sur demande via npm, pnpm ou bun (l'application préfère npm, puis pnpm, puis bun ; Node reste le runtime recommandé pour le CLI).

## Mode local vs distant

- **Local** (par défaut) : l'application s'attache à une passerelle locale en cours d'exécution si elle est présente ;
  sinon, elle active le service launchd via `openclaw gateway install`.
- **Remote** : l'application se connecte à un Gateway via SSH/Tailscale et ne démarre jamais
  de processus local.
  L'application démarre le **service hôte de nœud** local afin que le Gateway distant puisse atteindre ce Mac.
  L'application ne lance pas le Gateway en tant que processus enfant.
  La découverte du Gateway privilégie désormais les noms MagicDNS Tailscale par rapport aux IP brutes du tailnet,
  ce qui permet à l'application Mac de récupérer plus fiabrement lorsque les IP du tailnet changent.

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

## Capacités du nœud (mac)

L'application macOS se présente comme un nœud. Commandes courantes :

- Canvas : Canvas : `canvas.present`, `canvas.navigate`, `canvas.eval`, `canvas.snapshot`, `canvas.a2ui.*`
- Caméra : `camera.snap`, `camera.clip`
- Écran : `screen.record`
- Système : `system.run`, `system.notify`

Le nœud signale une carte `permissions` afin que les agents puissent décider de ce qui est autorisé.

Service de nœud + IPC de l'application :

- Lorsque le service d'hôte de nœud sans interface est en cours d'exécution (mode distant), il se connecte au Gateway WS en tant que nœud.
- `system.run` s'exécute dans l'application macOS (contexte interface utilisateur/TCC) via un socket Unix local ; les invites et les sorties restent dans l'application.

Diagramme (SCI) :

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + TCC + system.run)
```

## Approbations d'exécution (system.run)

`system.run` est contrôlé par les **Approbations d'exécution** dans l'application macOS (Paramètres → Approbations d'exécution).
La sécurité, les demandes et la liste d'autorisation sont stockées localement sur le Mac dans :

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

- Les entrées `allowlist` sont des motifs glob pour les chemins binaires résolus.
- Le texte de commande shell brut contenant une syntaxe de contrôle ou d'expansion de shell (`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) est traité comme une absence de la liste d'autorisation et nécessite une approbation explicite (ou l'ajout du binaire du shell à la liste d'autorisation).
- Le choix de « Toujours autoriser » dans l'invite ajoute cette commande à la liste d'autorisation.
- Les remplacements d'environnement `system.run` sont filtrés (supprime `PATH`, `DYLD_*`, `LD_*`, `NODE_OPTIONS`, `PYTHON*`, `PERL*`, `RUBYOPT`, `SHELLOPTS`, `PS4`) puis fusionnés avec l'environnement de l'application.
- Pour les wrappers de shell (`bash|sh|zsh ... -c/-lc`), les substitutions d'environnement limitées à la requête sont réduites à une petite liste d'autorisation explicite (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
- Pour les décisions « autoriser toujours » en mode liste d'autorisation, les wrappers de répartition connus (`env`, `nice`, `nohup`, `stdbuf`, `timeout`) persistent les chemins des exécutables internes plutôt que les chemins des wrappers. Si le déballage n'est pas sûr, aucune entrée de liste d'autorisation n'est persistée automatiquement.

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
- `key` (clé de mode sans surveillance facultatif)

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

## Build & dev workflow (native)

- `cd apps/macos && swift build`
- `swift run OpenClaw` (or Xcode)
- Package app: `scripts/package-mac-app.sh`

## Debug gateway connectivity (macOS CLI)

Utilisez le CLI de débogage pour tester la même logique de négociation WebSocket et de Gateway que celle utilisée par l'application macOS, sans lancer l'application.

```bash
cd apps/macos
swift run openclaw-mac connect --json
swift run openclaw-mac discover --timeout 3000 --json
```

Connect options:

- `--url <ws://host:port>`: override config
- `--mode <local|remote>`: resolve from config (default: config or local)
- `--probe`: force a fresh health probe
- `--timeout <ms>`: request timeout (default: `15000`)
- `--json`: structured output for diffing

Discovery options:

- `--include-local`: include gateways that would be filtered as “local”
- `--timeout <ms>`: overall discovery window (default: `2000`)
- `--json`: structured output for diffing

Astuce : comparez avec `openclaw gateway discover --json` pour voir si le pipeline de découverte de l'application macOS (`local.` plus le domaine longue distance configuré, avec replis longue distance et Tailscale Serve) diffère de la découverte basée sur `dns-sd` du CLI Node.

## Remote connection plumbing (SSH tunnels)

When the macOS app runs in **Remote** mode, it opens an SSH tunnel so local UI
components can talk to a remote Gateway as if it were on localhost.

### Control tunnel (Gateway WebSocket port)

- **Purpose:** health checks, status, Web Chat, config, and other control-plane calls.
- **Port local :** le port du Gateway (par défaut `18789`), toujours stable.
- **Remote port:** le même port Gateway sur l'hôte distant.
- **Comportement:** pas de port local aléatoire; l'application réutilise un tunnel sain existant ou le redémarre si nécessaire.
- **Forme SSH :** `ssh -N -L <local>:127.0.0.1:<remote>` avec les options BatchMode +
  ExitOnForwardFailure + keepalive.
- **Rapport d'IP :** le tunnel SSH utilise le bouclage, donc la passerelle verra l'IP du nœud
  comme `127.0.0.1`. Utilisez le transport **Direct (ws/wss)** si vous voulez que la véritable IP
  du client apparaisse (voir [accès distant macOS](/en/platforms/mac/remote)).

Pour les étapes de configuration, voir [accès distant macOS](/en/platforms/mac/remote). Pour les détails du
protocole, voir [protocole Gateway](/en/gateway/protocol).

## Documentation connexe

- [Manuel du Gateway](/en/gateway)
- [Gateway (macOS)](/en/platforms/mac/bundled-gateway)
- [Permissions macOS](/en/platforms/mac/permissions)
- [Canvas](/en/platforms/mac/canvas)
