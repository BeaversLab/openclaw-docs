---
summary: "Nodes : appairage, fonctionnalités, autorisations et assistants CLI pour canvas/camera/écran/appareil/notifications/système"
read_when:
  - Pairing iOS/Android nodes to a gateway
  - Using node canvas/camera for agent context
  - Adding new node commands or CLI helpers
title: "Nodes"
---

# Nodes

Un **nœud** est un appareil compagnon (macOS/iOS/Android/headless) qui se connecte au **WebSocket** du Gateway (même port que les opérateurs) avec `role: "node"` et expose une surface de commande (ex. `canvas.*`, `camera.*`, `device.*`, `notifications.*`, `system.*`) via `node.invoke`. Détails du protocole : [Gateway protocol](/fr/gateway/protocol).

Transport hérité : [Bridge protocol](/fr/gateway/bridge-protocol) (TCP JSONL ; déconseillé/supprimé pour les nœuds actuels).

Le macOS peut également fonctionner en **mode node** : l'application de la barre de menus se connecte au serveur WS du Gateway et expose ses commandes canvas/camera locales en tant que node (donc `openclaw nodes …` fonctionne sur ce Mac).

Notes :

- Les nodes sont des **périphériques**, pas des passerelles. Elles n'exécutent pas le service de passerelle.
- Les messages Telegram/WhatsApp/etc. atterrissent sur la **passerelle**, pas sur les nodes.
- Runbook de dépannage : [/nodes/troubleshooting](/fr/nodes/troubleshooting)

## Appairage + statut

**Les nodes WS utilisent l'appairage d'appareils.** Les nodes présentent une identité d'appareil lors du `connect` ; le Gateway
crée une demande d'appairage d'appareil pour `role: node`. Approuvez via le CLI des appareils (ou l'interface utilisateur).

CLI rapide :

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

Notes :

- `nodes status` marque une node comme **appairée** lorsque son rôle d'appairage d'appareil inclut `node`.
- `node.pair.*` (CLI : `openclaw nodes pending/approve/reject`) est un magasin d'appairage de nodes distinct appartenant à la passerelle ; il ne **bloque pas** la poignée de main WS `connect`.

## Hôte de node distant (system.run)

Utilisez un **node host** lorsque votre Gateway s'exécute sur une machine et que vous souhaitez que les commandes soient exécutées sur une autre. Le modèle communique toujours avec la **gateway** ; la gateway transfère les appels `exec` au **node host** lorsque `host=node` est sélectionné.

### Ce qui s'exécute où

- **Hôte Gateway** : reçoit les messages, exécute le modèle, achemine les appels d'outils.
- **Hôte de nœud** : exécute `system.run`/`system.which` sur la machine du nœud.
- **Approbations** : appliquées sur l'hôte du nœud via `~/.openclaw/exec-approvals.json`.

Remarque sur l'approbation :

- Les exécutions de nœud soutenues par une approbation lient le contexte exact de la demande.
- Pour les exécutions directes de fichiers shell/runtime, OpenClaw lie également au mieux un opérande de fichier local concret unique et refuse l'exécution si ce fichier change avant l'exécution.
- Si OpenClaw ne peut pas identifier exactement un seul fichier local concret pour une commande d'interpréteur/runtime, l'exécution soutenue par une approbation est refusée au lieu de prétendre à une couverture complète du runtime. Utilisez le sandboxing, des hôtes séparés, ou une liste d'autorisation de confiance explicite/un workflow complet pour des sémantiques d'interpréteur plus larges.

### Démarrer un hôte de nœud (premier plan)

Sur la machine du nœud :

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### Gateway distante via tunnel SSH (liaison de boucle)

Si la Gateway se lie à la boucle (`gateway.bind=loopback`, par défaut en mode local), les hôtes de nœud distants ne peuvent pas se connecter directement. Créez un tunnel SSH et dirigez l'hôte du nœud vers l'extrémité locale du tunnel.

Exemple (hôte de nœud -> hôte de gateway) :

```bash
# Terminal A (keep running): forward local 18790 -> gateway 127.0.0.1:18789
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host

# Terminal B: export the gateway token and connect through the tunnel
export OPENCLAW_GATEWAY_TOKEN="<gateway-token>"
openclaw node run --host 127.0.0.1 --port 18790 --display-name "Build Node"
```

Notes :

- `openclaw node run` prend en charge l'authentification par jeton ou par mot de passe.
- Les variables d'environnement sont préférées : `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`.
- Le repli de configuration est `gateway.auth.token` / `gateway.auth.password`.
- En mode local, l'hôte du nœud ignore intentionnellement `gateway.remote.token` / `gateway.remote.password`.
- En mode distant, `gateway.remote.token` / `gateway.remote.password` sont éligibles selon les règles de priorité distantes.
- Si des SecretRefs `gateway.auth.*` locaux actifs sont configurés mais non résolus, l'authentification de l'hôte de nœud échoue en mode fermé.
- Les variables d'environnement (env vars) `CLAWDBOT_GATEWAY_*` héritées sont intentionnellement ignorées lors de la résolution de l'authentification de l'hôte de nœud.

### Démarrer un hôte de nœud (service)

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node restart
```

### Jumelage + nommage

Sur l'hôte de la passerelle :

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

Options de nommage :

- `--display-name` sur `openclaw node run` / `openclaw node install` (persiste dans `~/.openclaw/node.json` sur le nœud).
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"` (remplacement de la passerelle).

### Liste blanche des commandes

Les approbations d'exécution sont **par hôte de nœud**. Ajoutez des entrées à la liste blanche depuis la passerelle :

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

Les approbations résident sur l'hôte du nœud à `~/.openclaw/exec-approvals.json`.

### Pointer l'exécution vers le nœud

Configurer les valeurs par défaut (config de la passerelle) :

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

Ou par session :

```
/exec host=node security=allowlist node=<id-or-name>
```

Une fois défini, tout appel `exec` avec `host=node` s'exécute sur l'hôte du nœud (sous réserve de la liste blanche/approbations du nœud).

Connexes :

- [Node host CLI](/fr/cli/node)
- [Exec tool](/fr/tools/exec)
- [Exec approvals](/fr/tools/exec-approvals)

## Appel de commandes

Bas niveau (RPC brut) :

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

Des helpers de plus haut niveau existent pour les workflows courants « fournir une pièce jointe MEDIA à l'agent ».

## Captures d'écran (instantanés Canvas)

Si le nœud affiche le Canvas (WebView), `canvas.snapshot` renvoie `{ format, base64 }`.

Helper CLI (écrit dans un fichier temporaire et imprime `MEDIA:<path>`) :

```bash
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format png
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format jpg --max-width 1200 --quality 0.9
```

### Contrôles Canvas

```bash
openclaw nodes canvas present --node <idOrNameOrIp> --target https://example.com
openclaw nodes canvas hide --node <idOrNameOrIp>
openclaw nodes canvas navigate https://example.com --node <idOrNameOrIp>
openclaw nodes canvas eval --node <idOrNameOrIp> --js "document.title"
```

Notes :

- `canvas present` accepte les URL ou les chemins de fichiers locaux (`--target`), plus `--x/--y/--width/--height` en option pour le positionnement.
- `canvas eval` accepte du JS en ligne (`--js`) ou un argument positionnel.

### A2UI (Canvas)

```bash
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --text "Hello"
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --jsonl ./payload.jsonl
openclaw nodes canvas a2ui reset --node <idOrNameOrIp>
```

Notes :

- Seul le JSONL A2UI v0.8 est pris en charge (v0.9/createSurface est rejeté).

## Photos + vidéos (caméra du nœud)

Photos (`jpg`) :

```bash
openclaw nodes camera list --node <idOrNameOrIp>
openclaw nodes camera snap --node <idOrNameOrIp>            # default: both facings (2 MEDIA lines)
openclaw nodes camera snap --node <idOrNameOrIp> --facing front
```

Vidéos (`mp4`) :

```bash
openclaw nodes camera clip --node <idOrNameOrIp> --duration 10s
openclaw nodes camera clip --node <idOrNameOrIp> --duration 3000 --no-audio
```

Notes :

- Le nœud doit être en **premier plan** pour `canvas.*` et `camera.*` (les appels en arrière-plan renvoient `NODE_BACKGROUND_UNAVAILABLE`).
- La durée du clip est limitée (actuellement `<= 60s`) pour éviter des charges utiles base64 trop volumineuses.
- Android demandera les autorisations `CAMERA`/`RECORD_AUDIO` si possible ; les autorisations refusées échouent avec `*_PERMISSION_REQUIRED`.

## Enregistrements d'écran (nœuds)

Les nœuds pris en charge exposent `screen.record` (mp4). Exemple :

```bash
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

Notes :

- La disponibilité de `screen.record` dépend de la plateforme du nœud.
- Les enregistrements d'écran sont limités à `<= 60s`.
- `--no-audio` désactive la capture du microphone sur les plateformes prises en charge.
- Utilisez `--screen <index>` pour sélectionner un écran lorsque plusieurs écrans sont disponibles.

## Emplacement (nœuds)

Les nœuds exposent `location.get` lorsque l'emplacement est activé dans les paramètres.

Assistant CLI :

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

Notes :

- L'emplacement est **désactivé par défaut**.
- « Toujours » nécessite une autorisation système ; la récupération en arrière-plan est au mieux-effort.
- La réponse inclut la lat/lon, la précision (mètres) et l'horodatage.

## SMS (nœuds Android)

Les nœuds Android peuvent exposer `sms.send` lorsque l'utilisateur accorde l'autorisation **SMS** et que l'appareil prend en charge la téléphonie.

Appel de bas niveau :

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

Notes :

- La demande d'autorisation doit être acceptée sur l'appareil Android avant que la capacité soit annoncée.
- Les appareils Wi-Fi uniquement sans téléphonie n'annonceront pas `sms.send`.

## Appareil Android + commandes de données personnelles

Les nœuds Android peuvent annoncer des familles de commandes supplémentaires lorsque les capacités correspondantes sont activées.

Familles disponibles :

- `device.status`, `device.info`, `device.permissions`, `device.health`
- `notifications.list`, `notifications.actions`
- `photos.latest`
- `contacts.search`, `contacts.add`
- `calendar.events`, `calendar.add`
- `callLog.search`
- `motion.activity`, `motion.pedometer`

Exemples d'appels :

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command device.status --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command notifications.list --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command photos.latest --params '{"limit":1}'
```

Notes :

- Les commandes de mouvement sont limitées par les capteurs disponibles.

## Commandes système (node host / mac node)

Le nœud macOS expose `system.run`, `system.notify` et `system.execApprovals.get/set`.
L'hôte de nœud headless expose `system.run`, `system.which` et `system.execApprovals.get/set`.

Exemples :

```bash
openclaw nodes run --node <idOrNameOrIp> -- echo "Hello from mac node"
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
```

Notes :

- `system.run` renvoie stdout/stderr/le code de sortie dans la charge utile.
- `system.notify` respecte l'état de l'autorisation de notification sur l'application macOS.
- Les métadonnées `platform` / `deviceFamily` d'un nœud non reconnu utilisent une liste d'autorisation (allowlist) par défaut conservative qui exclut `system.run` et `system.which`. Si vous avez besoin de ces commandes pour une plate-forme inconnue, ajoutez-les explicitement via `gateway.nodes.allowCommands`.
- `system.run` prend en charge `--cwd`, `--env KEY=VAL`, `--command-timeout` et `--needs-screen-recording`.
- Pour les wrappers de shell (`bash|sh|zsh ... -c/-lc`), les valeurs `--env` limitées à la requête sont réduites à une liste d'autorisation explicite (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
- Pour les décisions d'autorisation permanente en mode liste d'autorisation, les wrappers de répartition connus (`env`, `nice`, `nohup`, `stdbuf`, `timeout`) persistent les chemins des exécutables internes au lieu des chemins des wrappers. Si le déballage n'est pas sûr, aucune entrée de liste d'autorisation n'est persistée automatiquement.
- Sur les hôtes de nœuds Windows en mode liste d'autorisation, les exécutions de wrappers de shell via `cmd.exe /c` nécessitent une approbation (une entrée de liste d'autorisation seule n'autorise pas automatiquement la forme du wrapper).
- `system.notify` prend en charge `--priority <passive|active|timeSensitive>` et `--delivery <system|overlay|auto>`.
- Les hôtes de nœuds ignorent les remplacements de `PATH` et suppriment les clés de démarrage/shell dangereuses (`DYLD_*`, `LD_*`, `NODE_OPTIONS`, `PYTHON*`, `PERL*`, `RUBYOPT`, `SHELLOPTS`, `PS4`). Si vous avez besoin d'entrées PATH supplémentaires, configurez l'environnement du service de l'hôte de nœud (ou installez les outils dans des emplacements standards) au lieu de passer `PATH` via `--env`.
- En mode nœud macOS, `system.run` est limité par les approbations d'exécution dans l'application macOS (Paramètres → Approbations d'exécution).
  Ask/allowlist/full se comportent de la même manière que l'hôte de nœud sans interface (headless) ; les invites refusées renvoient `SYSTEM_RUN_DENIED`.
- Sur l'hôte de nœud sans interface (headless), `system.run` est limité par les approbations d'exécution (`~/.openclaw/exec-approvals.json`).

## Liaison du nœud d'exécution

Lorsque plusieurs nœuds sont disponibles, vous pouvez lier l'exécution à un nœud spécifique.
Cela définit le nœud par défaut pour `exec host=node` (et peut être remplacé pour chaque agent).

Par défaut global :

```bash
openclaw config set tools.exec.node "node-id-or-name"
```

Remplacement par agent :

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

Définir sur vide pour autoriser n'importe quel nœud :

```bash
openclaw config unset tools.exec.node
openclaw config unset agents.list[0].tools.exec.node
```

## Carte des autorisations

Les nœuds peuvent inclure une carte `permissions` dans `node.list` / `node.describe`, indexée par nom d'autorisation (par exemple `screenRecording`, `accessibility`) avec des valeurs booléennes (`true` = accordée).

## Hôte de nœud sans interface (multiplateforme)

OpenClaw peut exécuter un **hôte de nœud sans interface** (sans interface utilisateur) qui se connecte au WebSocket Gateway et expose `system.run` / `system.which`. C'est utile sur Linux/Windows ou pour exécuter un nœud minimal à côté d'un serveur.

Démarrez-le :

```bash
openclaw node run --host <gateway-host> --port 18789
```

Notes :

- L'appairage est toujours requis (le Gateway affichera une invite d'appareil d'appairage).
- L'hôte du nœud stocke son identifiant de nœud, son jeton, son nom d'affichage et les informations de connexion à la passerelle dans `~/.openclaw/node.json`.
- Les approbations d'exécution sont appliquées localement via `~/.openclaw/exec-approvals.json`
  (voir [Exec approvals](/fr/tools/exec-approvals)).
- Sur macOS, l'hôte de nœud sans interface exécute `system.run` localement par défaut. Définissez
  `OPENCLAW_NODE_EXEC_HOST=app` pour acheminer `system.run` via l'hôte d'exécution de l'application compagnon ; ajoutez
  `OPENCLAW_NODE_EXEC_FALLBACK=0` pour exiger l'hôte de l'application et échouer en fermant s'il n'est pas disponible.
- Ajoutez `--tls` / `--tls-fingerprint` lorsque le WS Gateway utilise TLS.

## Mode nœud Mac

- L'application de la barre de menus macOS se connecte au serveur WS Gateway en tant que nœud (donc `openclaw nodes …` fonctionne contre ce Mac).
- En mode distant, l'application ouvre un tunnel SSH pour le port Gateway et se connecte à `localhost`.

import fr from "/components/footer/fr.mdx";

<fr />
