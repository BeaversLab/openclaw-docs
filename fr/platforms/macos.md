---
summary: "OpenClaw macOS companion app (barre de menu + broker Gateway)"
read_when:
  - Implémentation des fonctionnalités de l'application macOS
  - Changement du cycle de vie de la passerelle ou du pont de nœud sur macOS
title: "Application macOS"
---

# Companion OpenClaw macOS (barre de menu + broker Gateway)

L'application macOS est le **companion de barre de menu** pour OpenClaw. Elle gère les permissions,
gère/se connecte au Gateway localement (launchd ou manuel), et expose les capacités macOS
à l'agent en tant que nœud.

## Ce qu'il fait

- Affiche les notifications natives et le statut dans la barre de menu.
- Gère les invites TCC (Notifications, Accessibilité, Enregistrement d'écran, Microphone,
  Reconnaissance vocale, Automatisation/AppleScript).
- Exécute ou se connecte au Gateway (local ou distant).
- Expose les outils exclusifs à macOS (Canvas, Caméra, Enregistrement d'écran, `system.run`).
- Démarre le service d'hôte de nœud local en mode **distant** (launchd), et l'arrête en mode **local**.
- Hébergement optionnel de **PeekabooBridge** pour l'automatisation de l'interface utilisateur.
- Installe la CLI globale (`openclaw`) via npm/pnpm sur demande (bun n'est pas recommandé pour l'exécution du Gateway).

## Mode local vs distant

- **Local** (par défaut) : l'application se connecte à un Gateway local en cours d'exécution si présent ;
  sinon elle active le service launchd via `openclaw gateway install`.
- **Distant** : l'application se connecte à un Gateway via SSH/Tailscale et ne démarre jamais
  un processus local.
  L'application démarre le service **d'hôte de nœud** local afin que le Gateway distant puisse atteindre ce Mac.
  L'application ne génère pas le Gateway en tant que processus enfant.

## Contrôle Launchd

L'application gère un LaunchAgent par utilisateur étiqueté `ai.openclaw.gateway`
(ou `ai.openclaw.<profile>` lors de l'utilisation de `--profile`/`OPENCLAW_PROFILE` ; le `com.openclaw.*` legacy est toujours déchargé).

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
- Screen : `screen.record`
- Système : `system.run`, `system.notify`

Le nœud signale une carte `permissions` afin que les agents puissent décider de ce qui est autorisé.

Service de nœud + IPC d'application :

- Lorsque le service hôte de nœud headless est en cours d'exécution (mode distant), il se connecte au Gateway WS en tant que nœud.
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
La sécurité, la demande et la liste verte sont stockées localement sur le Mac dans :

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

- Les entrées `allowlist` sont des modèles glob pour les chemins binaires résolus.
- Le texte de commande shell brut contenant une syntaxe de contrôle ou d'expansion de shell (`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) est traité comme un échec de la liste verte et nécessite une approbation explicite (ou l'ajout du binaire shell à la liste verte).
- Le choix de « Toujours autoriser » dans l'invite ajoute cette commande à la liste verte.
- Les redéfinitions d'environnement `system.run` sont filtrées (supprime `PATH`, `DYLD_*`, `LD_*`, `NODE_OPTIONS`, `PYTHON*`, `PERL*`, `RUBYOPT`, `SHELLOPTS`, `PS4`) puis fusionnées avec l'environnement de l'application.
- Pour les wrappers shell (`bash|sh|zsh ... -c/-lc`), les redéfinitions d'environnement liées à la demande sont réduites à une petite liste verte explicite (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
- Pour les décisions allow-always en mode allowlist, les wrappers de répartition connus (`env`, `nice`, `nohup`, `stdbuf`, `timeout`) conservent les chemins des exécutables internes au lieu des chemins des wrappers. Si le déballage n'est pas sûr, aucune entrée de liste blanche n'est conservée automatiquement.

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
- Sans `key`, l'application applique une limite courte de message pour la fenêtre de confirmation et ignore `deliver` / `to` / `channel`.
- Avec un `key` valide, l'exécution est sans surveillance (destinée aux automatisations personnelles).

## Flux d'onboarding (typique)

1. Installez et lancez **OpenClaw.app**.
2. Remplissez la liste de vérification des autorisations (invites TCC).
3. Assurez-vous que le mode **Local** est actif et que le Gateway est en cours d'exécution.
4. Installez le CLI si vous souhaitez un accès via le terminal.

## Emplacement du répertoire d'état (macOS)

Évitez de placer votre répertoire d'état OpenClaw dans iCloud ou d'autres dossiers synchronisés dans le cloud.
Les chemins sauvegardés par synchronisation peuvent ajouter de la latence et provoquer occasionnellement des conflits de verrouillage de fichiers/synchronisation pour
les sessions et les identifiants.

Préférez un chemin d'état local non synchronisé tel que :

```bash
OPENCLAW_STATE_DIR=~/.openclaw
```

Si `openclaw doctor` détecte un état sous :

- `~/Library/Mobile Documents/com~apple~CloudDocs/...`
- `~/Library/CloudStorage/...`

il avertira et recommandera de revenir à un chemin local.

## Flux de travail de compilation et de développement (natif)

- `cd apps/macos && swift build`
- `swift run OpenClaw` (ou Xcode)
- Application de package : `scripts/package-mac-app.sh`

## Débogage de la connectivité de la passerelle (macOS CLI)

Utilisez le CLI de débogage pour exercer la même logique de négociation WebSocket et de Gateway macOS que l'application macOS, sans lancer l'application.

```bash
cd apps/macos
swift run openclaw-mac connect --json
swift run openclaw-mac discover --timeout 3000 --json
```

Options de connexion :

- `--url <ws://host:port>` : remplacer la configuration
- `--mode <local|remote>` : résoudre depuis la configuration (par défaut : config ou local)
- `--probe` : forcer une nouvelle sonde de santé
- `--timeout <ms>` : délai d'expiration de la requête (par défaut : `15000`)
- `--json` : sortie structurée pour les différences

Options de CLI :

- `--include-local` : inclure les passerelles qui seraient filtrées comme « local »
- `--timeout <ms>` : fenêtre de CLI globale (par défaut : `2000`)
- `--json` : sortie structurée pour les différences

Conseil : comparez avec `openclaw gateway discover --json` pour voir si le pipeline de macOS de l'application CLI (NWBrowser + secours DNS‑SD tailnet) diffère du CLI basé sur `dns-sd` du CLI Node.

## Plomberie de connexion à distance (tunnels SSH)

Lorsque l'application macOS fonctionne en mode **Remote**, elle ouvre un tunnel SSH afin que les composants de l'interface utilisateur locale puissent communiquer avec un Gateway distant comme s'il se trouvait sur localhost.

### Tunnel de contrôle (port WebSocket Gateway)

- **Objectif :** vérifications de santé, statut, Web Chat, configuration et autres appels du plan de contrôle.
- **Port local :** le port Gateway (par défaut `18789`), toujours stable.
- **Port distant :** le même port Gateway sur l'hôte distant.
- **Comportement :** pas de port local aléatoire ; l'application réutilise un tunnel sain existant ou le redémarre si nécessaire.
- **Forme SSH :** `ssh -N -L <local>:127.0.0.1:<remote>` avec les options BatchMode + ExitOnForwardFailure + keepalive.
- **Rapport IP :** le tunnel SSH utilise la boucle locale (loopback), donc la passerelle verra l'IP du nœud comme `127.0.0.1`. Utilisez le transport **Direct (ws/wss)** si vous souhaitez que la véritable IP client apparaisse (voir [accès distant macOS](/fr/platforms/mac/remote)).

Pour les étapes de configuration, voir [accès distant macOS](/fr/platforms/mac/remote). Pour les détails du protocole, voir [Protocole Gateway](/fr/gateway/protocol).

## Documentation connexe

- [Guide de la Gateway](/fr/gateway)
- [Gateway (macOS)](/fr/platforms/mac/bundled-gateway)
- [macOS permissions](/fr/platforms/mac/permissions)
- [Canvas](/fr/platforms/mac/canvas)

import fr from "/components/footer/fr.mdx";

<fr />
