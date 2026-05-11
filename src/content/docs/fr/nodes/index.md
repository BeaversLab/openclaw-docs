---
summary: "Nodes : appairage, fonctionnalités, autorisations et assistants CLI pour canvas/camera/écran/appareil/notifications/système"
read_when:
  - Pairing iOS/Android nodes to a gateway
  - Using node canvas/camera for agent context
  - Adding new node commands or CLI helpers
title: "Nodes"
---

Un **node** est un appareil compagnon (macOS/iOS/Android/sans tête) qui se connecte au **WebSocket** du Gateway (même port que les opérateurs) avec `role: "node"` et expose une surface de commande (par exemple `canvas.*`, `camera.*`, `device.*`, `notifications.*`, `system.*`) via `node.invoke`. Détails du protocole : [Gateway protocol](/fr/gateway/protocol).

Transport hérité : [Bridge protocol](/fr/gateway/bridge-protocol) (TCP JSONL ;
historique uniquement pour les nœuds actuels).

macOS peut également fonctionner en **mode node** : l'application de la barre de menus se connecte au serveur WS du Gateway
et expose ses commandes de canevas/caméra locales en tant que nœud (ainsi
`openclaw nodes …` fonctionne sur ce Mac). En mode de passerelle distant, l'automatisation du
navigateur est gérée par l'hôte de nœud CLI (`openclaw node run` ou le
service de nœud installé), et non par le nœud d'application native.

Notes :

- Les nœuds sont des **périphériques**, pas des passerelles. Ils n'exécutent pas le service de passerelle.
- Les messages Telegram/WhatsApp/etc. atterrissent sur la **passerelle**, et non sur les nœuds.
- Guide de dépannage : [/nodes/troubleshooting](/fr/nodes/troubleshooting)

## Jumelage + statut

**Les nœuds WS utilisent le jumelage d'appareil.** Les nœuds présentent une identité d'appareil lors de `connect` ; le Gateway
crée une demande de jumelage d'appareil pour `role: node`. Approuvez via le CLI des appareils (ou l'interface utilisateur).

CLI rapide :

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

Si un nœud réessaie avec des détails d'authentification modifiés (rôle/portées/clé publique), la demande
en attente précédente est remplacée et un nouveau `requestId` est créé. Réexécutez
`openclaw devices list` avant d'approuver.

Notes :

- `nodes status` marque un nœud comme **jumelé** lorsque son rôle de jumelage d'appareil inclut `node`.
- L'enregistrement de jumelage d'appareil est le contrat durable de rôle approuvé. La rotation
  des jetons reste à l'intérieur de ce contrat ; elle ne peut pas mettre à niveau un nœud jumelé en un
  rôle différent que l'approbation de jumelage n'a jamais accordé.
- `node.pair.*` (CLI : `openclaw nodes pending/approve/reject/remove/rename`) est un magasin de jumelage de nœud distinct
  propriété du Gateway ; il ne **bloque pas** la poignée de main WS `connect`.
- `openclaw nodes remove --node <id|name|ip>` supprime les entrées obsolètes de ce
  magasin d'appairage de nœuds distinct appartenant à la passerelle.
- La portée de l'approbation suit les commandes déclarées de la demande en attente :
  - requête sans commande : `operator.pairing`
  - commandes de nœud non exécutables : `operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which` : `operator.pairing` + `operator.admin`

## Hôte de nœud distant (system.run)

Utilisez un **node host** lorsque votre Gateway s'exécute sur une machine et que vous voulez que les commandes
s'exécutent sur une autre. Le model communique toujours avec le **gateway** ; le gateway
transfère les appels `exec` au **node host** lorsque `host=node` est sélectionné.

### Ce qui s'exécute où

- **Hôte Gateway** : reçoit les messages, exécute le modèle, achemine les appels d'outils.
- **Node host** : exécute `system.run`/`system.which` sur la machine du nœud.
- **Approvals** : appliqué sur le node host via `~/.openclaw/exec-approvals.json`.

Note d'approbation :

- Les exécutions de nœud soutenues par une approbation lient le contexte exact de la demande.
- Pour les exécutions directes de fichiers shell/runtime, OpenClaw lie également au mieux un opérande de fichier local concret et refuse l'exécution si ce fichier change avant l'exécution.
- Si OpenClaw ne peut pas identifier exactement un fichier local concret pour une commande d'interpréteur/runtime, l'exécution basée sur l'approbation est refusée au lieu de prétendre à une couverture complète du runtime. Utilisez le sandboxing, des hôtes séparés, ou une liste de autorisation (allowlist) de confiance explicite/workflow complet pour des sémantiques d'interpréteur plus larges.

### Démarrer un hôte de nœud (premier plan)

Sur la machine du nœud :

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### Gateway distante via tunnel SSH (liaison de boucle)

Si le Gateway est lié à loopback (`gateway.bind=loopback`, valeur par défaut en mode local),
les node hosts distants ne peuvent pas se connecter directement. Créez un tunnel SSH et dirigez le
node host vers l'extrémité locale du tunnel.

Exemple (hôte de nœud -> hôte de passerelle) :

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
- En mode local, le node host ignore intentionnellement `gateway.remote.token` / `gateway.remote.password`.
- En mode distant, `gateway.remote.token` / `gateway.remote.password` sont éligibles selon les règles de priorité distantes.
- Si des SecretRefs `gateway.auth.*` locaux actifs sont configurés mais non résolus, l'authentification du node host échoue en mode fermé.
- La résolution de l'authentification du node host honore uniquement les variables d'environnement `OPENCLAW_GATEWAY_*`.

### Démarrer un hôte de nœud (service)

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node start
openclaw node restart
```

### Association + nom

Sur l'hôte de la passerelle :

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

Si le nœud réessaie avec des détails d'authentification modifiés, réexécutez `openclaw devices list`
et approuvez le `requestId` actuel.

Options de nommage :

- `--display-name` sur `openclaw node run` / `openclaw node install` (persiste dans `~/.openclaw/node.json` sur le nœud).
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"` (remplacement de la passerelle).

### Autoriser les commandes (allowlist)

Les approbations d'exécution sont **par hôte de nœud**. Ajoutez des entrées à la liste d'autorisation depuis la passerelle :

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

Les approbations résident sur le node host à `~/.openclaw/exec-approvals.json`.

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

Une fois défini, tout appel `exec` avec `host=node` s'exécute sur l'hôte du nœud (sous réserve de la liste d'autorisation/approbations du nœud).

`host=auto` ne choisira pas implicitement le nœud par lui-même, mais une demande explicite `host=node` par appel est autorisée depuis `auto`. Si vous souhaitez que l'exécution sur le nœud soit la valeur par défaut pour la session, définissez `tools.exec.host=node` ou `/exec host=node ...` explicitement.

Connexes :

- [CLI de l'hôte du nœud](/fr/cli/node)
- [Outil Exec](/fr/tools/exec)
- [Approbations Exec](/fr/tools/exec-approvals)

## Appel de commandes

Bas niveau (RPC brut) :

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

Des assistants de plus haut niveau existent pour les workflows courants « fournir une pièce jointe MEDIA à l'agent ».

## Captures d'écran (instantanés du canvas)

Si le nœud affiche le Canvas (WebView), `canvas.snapshot` renvoie `{ format, base64 }`.

Assistant CLI (écrit dans un fichier temporaire et imprime `MEDIA:<path>`) :

```bash
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format png
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format jpg --max-width 1200 --quality 0.9
```

### Contrôles du Canvas

```bash
openclaw nodes canvas present --node <idOrNameOrIp> --target https://example.com
openclaw nodes canvas hide --node <idOrNameOrIp>
openclaw nodes canvas navigate https://example.com --node <idOrNameOrIp>
openclaw nodes canvas eval --node <idOrNameOrIp> --js "document.title"
```

Notes :

- `canvas present` accepte les URL ou les chemins de fichiers locaux (`--target`), ainsi qu'un `--x/--y/--width/--height` optionnel pour le positionnement.
- `canvas eval` accepte le JS en ligne (`--js`) ou un argument positionnel.

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

Clips vidéo (`mp4`) :

```bash
openclaw nodes camera clip --node <idOrNameOrIp> --duration 10s
openclaw nodes camera clip --node <idOrNameOrIp> --duration 3000 --no-audio
```

Notes :

- Le nœud doit être en **premier plan** pour `canvas.*` et `camera.*` (les appels en arrière-plan renvoient `NODE_BACKGROUND_UNAVAILABLE`).
- La durée du clip est limitée (actuellement `<= 60s`) pour éviter les charges utiles base64 trop volumineuses.
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
- Utilisez `--screen <index>` pour sélectionner un affichage lorsque plusieurs écrans sont disponibles.

## Localisation (nœuds)

Les nœuds exposent `location.get` lorsque la localisation est activée dans les paramètres.

Assistant CLI :

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

Notes :

- La localisation est **désactivée par défaut**.
- « Toujours » nécessite une autorisation système ; la récupération en arrière-plan est au mieux effort.
- La réponse inclut la latitude/longitude, la précision (mètres) et l'horodatage.

## SMS (nœuds Android)

Les nœuds Android peuvent exposer `sms.send` lorsque l'utilisateur accorde la permission **SMS** et que l'appareil prend en charge la téléphonie.

Appel de bas niveau :

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

Notes :

- La demande d'autorisation doit être acceptée sur l'appareil Android avant que la capacité ne soit annoncée.
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
- `sms.search`
- `motion.activity`, `motion.pedometer`

Exemples d'appels :

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command device.status --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command notifications.list --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command photos.latest --params '{"limit":1}'
```

Notes :

- Les commandes de mouvement sont limitées par les capteurs disponibles.

## Commandes système (hôte de nœud / nœud mac)

Le nœud macOS expose `system.run`, `system.notify` et `system.execApprovals.get/set`.
L'hôte de nœud headless expose `system.run`, `system.which` et `system.execApprovals.get/set`.

Exemples :

```bash
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
openclaw nodes invoke --node <idOrNameOrIp> --command system.which --params '{"name":"git"}'
```

Notes :

- `system.run` renvoie stdout/stderr/le code de sortie dans la charge utile.
- L'exécution du shell passe maintenant par l'outil `exec` avec `host=node` ; `nodes` reste la surface directe RPC pour les commandes de nœud explicites.
- `nodes invoke` n'expose pas `system.run` ou `system.run.prepare` ; ceux-ci restent uniquement sur le chemin d'exécution.
- Le chemin d'exécution prépare un `systemRunPlan` canonique avant l'approbation. Une fois
  l'approbation accordée, la passerelle transmet ce plan stocké, et non les champs
  command/cwd/session modifiés ultérieurement par l'appelant.
- `system.notify` respecte l'état de la permission de notification sur l'application macOS.
- Les métadonnées de nœud non reconnues `platform` / `deviceFamily` utilisent une liste d'autorisation (allowlist) par défaut prudente qui exclut `system.run` et `system.which`. Si vous avez intentionnellement besoin de ces commandes pour une plateforme inconnue, ajoutez-les explicitement via `gateway.nodes.allowCommands`.
- `system.run` prend en charge `--cwd`, `--env KEY=VAL`, `--command-timeout` et `--needs-screen-recording`.
- Pour les wrappers de shell (`bash|sh|zsh ... -c/-lc`), les valeurs `--env` liées à la requête sont réduites à une liste d'autorisation explicite (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
- Pour les décisions « autoriser toujours » en mode liste d'autorisation, les wrappers de répartition connus (`env`, `nice`, `nohup`, `stdbuf`, `timeout`) enregistrent les chemins des exécutables internes au lieu des chemins des wrappers. Si le déballage n'est pas sûr, aucune entrée de liste d'autorisation n'est enregistrée automatiquement.
- Sur les hôtes de nœud Windows en mode liste d'autorisation, les exécutions de wrappers de shell via `cmd.exe /c` nécessitent une approbation (une entrée de liste d'autorisation seule n'autorise pas automatiquement le formulaire du wrapper).
- `system.notify` prend en charge `--priority <passive|active|timeSensitive>` et `--delivery <system|overlay|auto>`.
- Les hôtes de nœud ignorent les substitutions `PATH` et suppriment les clés de démarrage/shell dangereuses (`DYLD_*`, `LD_*`, `NODE_OPTIONS`, `PYTHON*`, `PERL*`, `RUBYOPT`, `SHELLOPTS`, `PS4`). Si vous avez besoin d'entrées PATH supplémentaires, configurez l'environnement du service d'hôte de nœud (ou installez les outils dans des emplacements standards) au lieu de passer `PATH` via `--env`.
- En mode nœud macOS, `system.run` est soumis à des approbations d'exécution dans l'application macOS (Paramètres → Approuver les exécutions).
  Demande/liste d'autorisation/complet se comportent comme l'hôte de nœud headless ; les invites refusées renvoient `SYSTEM_RUN_DENIED`.
- Sur l'hôte de nœud headless, `system.run` est soumis à des approbations d'exécution (`~/.openclaw/exec-approvals.json`).

## Liaison de nœud d'exécution

Lorsque plusieurs nœuds sont disponibles, vous pouvez lier exec à un nœud spécifique.
Cela définit le nœud par défaut pour `exec host=node` (et peut être remplacé par agent).

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

Les nœuds peuvent inclure une carte `permissions` dans `node.list` / `node.describe`, indexée par nom d'autorisation (par exemple `screenRecording`, `accessibility`) avec des valeurs booléennes (`true` = accordé).

## Hôte de nœud headless (multiplateforme)

OpenClaw peut exécuter un **hôte de nœud sans interface** (sans interface utilisateur) qui se connecte au WebSocket Gateway
et expose `system.run` / `system.which`. Cela est utile sur Linux/Windows
ou pour exécuter un nœud minimaliste à côté d'un serveur.

Démarrez-le :

```bash
openclaw node run --host <gateway-host> --port 18789
```

Notes :

- Le couplage est toujours requis (le Gateway affichera une invite de couplage d'appareil).
- L'hôte du nœud stocke son identifiant de nœud, son jeton, son nom d'affichage et les informations de connexion à la passerelle dans `~/.openclaw/node.json`.
- Les approbations exec sont appliquées localement via `~/.openclaw/exec-approvals.json`
  (voir [Exec approvals](/fr/tools/exec-approvals)).
- Sur macOS, l'hôte de nœud sans interface exécute `system.run` localement par défaut. Définissez
  `OPENCLAW_NODE_EXEC_HOST=app` pour acheminer `system.run` via l'hôte exec de l'application compagnon ; ajoutez
  `OPENCLAW_NODE_EXEC_FALLBACK=0` pour exiger l'hôte de l'application et échouer en mode fermé s'il n'est pas disponible.
- Ajoutez `--tls` / `--tls-fingerprint` lorsque le WS Gateway utilise TLS.

## Mode nœud Mac

- L'application de barre de menus macOS se connecte au serveur WS Gateway en tant que nœud (donc `openclaw nodes …` fonctionne contre ce Mac).
- En mode distant, l'application ouvre un tunnel SSH pour le port Gateway et se connecte à `localhost`.
