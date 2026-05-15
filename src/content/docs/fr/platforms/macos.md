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

## Capacités du nœud (mac)

L'application macOS se présente comme un nœud. Commandes courantes :

- Canvas : `canvas.present`, `canvas.navigate`, `canvas.eval`, `canvas.snapshot`, `canvas.a2ui.*`
- Caméra : `camera.snap`, `camera.clip`
- Écran : `screen.snapshot`, `screen.record`
- Système : `system.run`, `system.notify`

Le nœud signale une carte `permissions` afin que les agents puissent décider de ce qui est autorisé.

Service de nœud + IPC de l'application :

- Lorsque le service d'hôte de nœud sans tête est en cours d'exécution (mode distant), il se connecte au WS du Gateway en tant que nœud.
- `system.run` s'exécute dans l'application macOS (contexte UI/TCC) via un socket Unix local ; les invites et les sorties restent dans l'application.

Diagramme (SCI) :

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + TCC + system.run)
```

## Approbations d'exécution (system.run)

`system.run` est contrôlé par les **Approbations d'exécution** dans l'application macOS (Paramètres → Approbations d'exécution).
La sécurité + demande + liste blanche sont stockées localement sur le Mac dans :

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

- Les entrées `allowlist` sont des motifs glob pour les chemins binaires résolus, ou des noms de commande nus pour les commandes invoquées par PATH.
- Le texte de commande shell brut qui contient une syntaxe de contrôle ou d'expansion de shell (`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) est traité comme un échec de la liste blanche et nécessite une approbation explicite (ou l'ajout du binaire shell à la liste blanche).
- Choisir « Toujours autoriser » dans l'invite ajoute cette commande à la liste d'autorisation.
- Les redéfinitions d'environnement `system.run` sont filtrées (supprime `PATH`, `DYLD_*`, `LD_*`, `NODE_OPTIONS`, `PYTHON*`, `PERL*`, `RUBYOPT`, `SHELLOPTS`, `PS4`) puis fusionnées avec l'environnement de l'application.
- Pour les wrappers de shell (`bash|sh|zsh ... -c/-lc`), les substitutions d'environnement limitées à la requête sont réduites à une petite liste d'autorisation explicite (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
- Pour les décisions d'autorisation permanente en mode liste d'autorisation, les wrappers de répartition connus (`env`, `nice`, `nohup`, `stdbuf`, `timeout`) enregistrent les chemins des exécutables internes au lieu des chemins des wrappers. Si le déballage n'est pas sûr, aucune entrée de liste d'autorisation n'est enregistrée automatiquement.

## Liens profonds

L'application enregistre le schéma d'URL `openclaw://` pour les actions locales.

### `openclaw://agent`

Déclenche une requête Gateway `agent`.

```bash
open 'openclaw://agent?message=Hello%20from%20deep%20link'
```

Paramètres de requête :

- `message` (requis)
- `sessionKey` (optionnel)
- `thinking` (optionnel)
- `deliver` / `to` / `channel` (optionnel)
- `timeoutSeconds` (optionnel)
- `key` (clé de mode sans surveillance optionnel)

Sécurité :

- Sans `key`, l'application demande une confirmation.
- Sans `key`, l'application impose une limite courte de message pour la demande de confirmation et ignore `deliver` / `to` / `channel`.
- Avec un `key` valide, l'exécution est sans surveillance (destinée aux automatisations personnelles).

## Flux d'onboarding (typique)

1. Installez et lancez **OpenClaw.app**.
2. Complétez la liste de contrôle des autorisations (invites TCC).
3. Assurez-vous que le mode **Local** est actif et que le Gateway est en cours d'exécution.
4. Installez le CLI si vous souhaitez un accès via le terminal.

## Emplacement du répertoire d'état (macOS)

Évitez de placer votre répertoire d'état OpenClaw dans iCloud ou d'autres dossiers synchronisés par le cloud.
Les chemins sauvegardés par synchronisation peuvent ajouter de la latence et occasionnellement provoquer des conflits de verrouillage/synchronisation de fichiers pour
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
- Application de package : `scripts/package-mac-app.sh`

## Déboguer la connectivité de la passerelle (macOS CLI)

Utilisez le CLI de débogage pour tester la même poignée de main WebSocket et la même logique de Gateway que l'application macOS utilise, sans lancer l'application.

```bash
cd apps/macos
swift run openclaw-mac connect --json
swift run openclaw-mac discover --timeout 3000 --json
```

Options de connexion :

- `--url <ws://host:port>` : remplacer la configuration
- `--mode <local|remote>` : résoudre à partir de la configuration (par défaut : config ou local)
- `--probe` : forcer une nouvelle sonde de santé
- `--timeout <ms>` : délai d'expiration de la requête (par défaut : `15000`)
- `--json` : sortie structurée pour les différences

Options de Gateway :

- `--include-local` : inclure les passerelles qui seraient filtrées comme « locales »
- `--timeout <ms>` : fenêtre globale de Gateway (par défaut : `2000`)
- `--json` : sortie structurée pour les différences

<Tip>Comparez avec `openclaw gateway discover --json` pour voir si le pipeline de découverte de l'application macOS (`local.` plus le domaine étendu configuré, avec les replis étendus et Tailscale Serve) diffère de la découverte basée sur `dns-sd` du Node CLI.</Tip>

## Plomberie de connexion à distance (tunnels SSH)

Lorsque l'application macOS s'exécute en mode **Remote**, elle ouvre un tunnel SSH afin que les composants de l'interface utilisateur locale puissent communiquer avec un Gateway distant comme s'il se trouvait sur localhost.

### Tunnel de contrôle (port WebSocket du Gateway)

- **Objectif :** vérifications de santé, statut, Web Chat, configuration et autres appels du plan de contrôle.
- **Port local :** le port du Gateway (défaut `18789`), toujours stable.
- **Port distant :** le même port Gateway sur l'hôte distant.
- **Comportement :** pas de port local aléatoire ; l'application réutilise un tunnel sain existant ou le redémarre si nécessaire.
- **Forme SSH :** `ssh -N -L <local>:127.0.0.1:<remote>` avec BatchMode +
  ExitOnForwardFailure + options de keepalive.
- **Rapport d'IP :** le tunnel SSH utilise la boucle locale (loopback), donc le Gateway verra l'IP
  du nœud comme `127.0.0.1`. Utilisez le transport **Direct (ws/wss)** si vous voulez que la véritable IP
  du client apparaisse (voir [macOS remote access](/fr/platforms/mac/remote)).

Pour les étapes de configuration, voir [macOS remote access](/fr/platforms/mac/remote). Pour les détails
du protocole, voir [Gateway protocol](/fr/gateway/protocol).

## Documentation connexe

- [Gateway runbook](/fr/gateway)
- [Gateway (macOS)](/fr/platforms/mac/bundled-gateway)
- [macOS permissions](/fr/platforms/mac/permissions)
- [Canvas](/fr/platforms/mac/canvas)
