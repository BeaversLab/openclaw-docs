---
summary: "Référence de la CLI pour `openclaw browser` (cycle de vie, profils, onglets, actions, état et débogage)"
read_when:
  - You use `openclaw browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to attach to your local signed-in Chrome via Chrome MCP
title: "Navigateur"
---

# `openclaw browser`

Gérer la surface de contrôle du navigateur de OpenClaw et exécuter des actions de navigateur (cycle de vie, profils, onglets, instantanés, captures d'écran, navigation, saisie, émulation d'état et débogage).

Connexes :

- Outil de navigateur + API : [Outil de navigateur](/fr/tools/browser)

## Indicateurs communs

- `--url <gatewayWsUrl>` : URL WebSocket de la Gateway (par défaut, selon la configuration).
- `--token <token>` : jeton de la Gateway (si requis).
- `--timeout <ms>` : délai d'expiration de la requête (ms).
- `--expect-final` : attendre une réponse finale de la Gateway.
- `--browser-profile <name>` : choisir un profil de navigateur (celui par défaut de la configuration).
- `--json` : sortie lisible par machine (lorsque pris en charge).

## Démarrage rapide (local)

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

Les agents peuvent exécuter la même vérification de disponibilité avec `browser({ action: "doctor" })`.

## Dépannage rapide

Si `start` échoue avec `not reachable after start`, dépannez d'abord la disponibilité du CDP. Si `start` et `tabs` réussissent mais que `open` ou `navigate` échoue, le plan de contrôle du navigateur est sain et l'échec est généralement dû à une stratégie SSRF de navigation.

Séquence minimale :

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

Guide détaillé : [Dépannage du navigateur](/fr/tools/browser#cdp-startup-failure-vs-navigation-ssrf-block)

## Cycle de vie

```bash
openclaw browser status
openclaw browser doctor
openclaw browser doctor --deep
openclaw browser start
openclaw browser start --headless
openclaw browser stop
openclaw browser --browser-profile openclaw reset-profile
```

Remarques :

- `doctor --deep` ajoute une sonde de capture instantanée en direct. Elle est utile lorsque la disponibilité
  de base du CDP est au vert mais que vous voulez une preuve que l'onglet actuel peut être inspecté.
- Pour `attachOnly` et les profils CDP distants, `openclaw browser stop` ferme la
  session de contrôle active et efface les substitutions d'émulation temporaires même quand
  OpenClaw n'a pas lancé le processus du navigateur lui-même.
- Pour les profils gérés localement, `openclaw browser stop` arrête le processus du navigateur
  généré.
- `openclaw browser start --headless` ne s'applique qu'à cette demande de démarrage et
  uniquement lorsqu'OpenClaw lance un navigateur géré localement. Cela ne modifie pas
  `browser.headless` ou la configuration du profil, et c'est une opération sans effet pour un navigateur
  déjà en cours d'exécution.
- Sur les hôtes Linux sans `DISPLAY` ou `WAYLAND_DISPLAY`, les profils gérés localement
  s'exécutent en mode headless automatiquement sauf si `OPENCLAW_BROWSER_HEADLESS=0`,
  `browser.headless=false` ou `browser.profiles.<name>.headless=false`
  demande explicitement un navigateur visible.

## Si la commande est manquante

Si `openclaw browser` est une commande inconnue, vérifiez `plugins.allow` dans
`~/.openclaw/openclaw.json`.

Lorsque `plugins.allow` est présent, listez explicitement le plugin de navigateur fourni
à moins que la configuration n'ait déjà un bloc racine `browser` :

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

Un bloc racine explicite `browser`, par exemple `browser.enabled=true` ou
`browser.profiles.<name>`, active également le plugin de navigateur intégré sous une
liste d'autorisation de plugins restrictive.

Connexe : [Outil de navigateur](/fr/tools/browser#missing-browser-command-or-tool)

## Profils

Les profils sont des configurations de routage de navigateur nommées. En pratique :

- `openclaw` : lance ou se connecte à une instance Chrome gérée dédiée par OpenClaw (répertoire de données utilisateur isolé).
- `user` : contrôle votre session Chrome connectée existante via Chrome DevTools MCP.
- profils CDP personnalisés : pointent vers un point de terminaison CDP local ou distant.

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name remote --cdp-url https://browser-host.example.com
openclaw browser delete-profile --name work
```

Utiliser un profil spécifique :

```bash
openclaw browser --browser-profile work tabs
```

## Onglets

```bash
openclaw browser tabs
openclaw browser tab new --label docs
openclaw browser tab label t1 docs
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://docs.openclaw.ai --label docs
openclaw browser focus docs
openclaw browser close t1
```

`tabs` renvoie d'abord `suggestedTargetId`, puis l'`tabId` stable tel que `t1`,
l'étiquette facultative et l'`targetId` brut. Les agents doivent renvoyer
`suggestedTargetId` dans `focus`, `close`, les instantanés et les actions. Vous pouvez
attribuer une étiquette avec `open --label`, `tab new --label` ou `tab label` ; les étiquettes,
les ID d'onglet, les ID de cible bruts et les préfixes uniques d'ID de cible sont tous acceptés.
Le champ de la requête est toujours nommé `targetId` pour compatibilité, mais il accepte
ces références d'onglet. Traitez les ID de cible bruts comme des handles de diagnostic, et non comme une
mémoire durable de l'agent.
Lorsque Chromium remplace la cible brute sous-jacente lors d'une navigation ou de l'envoi
d'un formulaire, OpenClaw conserve l'`tabId`/l'étiquette stable attachée à l'onglet de remplacement
lorsqu'il peut prouver la correspondance. Les ID de cible bruts restent volatils ; privilégiez
`suggestedTargetId`.

## Instantané / capture d'écran / actions

Instantané :

```bash
openclaw browser snapshot
openclaw browser snapshot --urls
```

Capture d'écran :

```bash
openclaw browser screenshot
openclaw browser screenshot --full-page
openclaw browser screenshot --ref e12
openclaw browser screenshot --labels
```

Notes :

- `--full-page` est uniquement pour les captures de page ; il ne peut pas être combiné avec `--ref`
  ou `--element`.
- Les profils `existing-session` / `user` prennent en charge les captures d'écran de page et les captures d'écran `--ref`
  à partir de la sortie de l'instantané, mais pas les captures d'écran CSS `--element`.
- `--labels` superpose les références d'instantané actuelles sur la capture d'écran.
- `snapshot --urls` ajoute les destinations de lien découvertes aux instantanés IA afin que
  les agents puissent choisir des cibles de navigation directes au lieu de deviner à partir du seul texte
  du lien.

Navigation/clic/saisie (automatisation de l'interface utilisateur basée sur des références) :

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser click-coords 120 340
openclaw browser type <ref> "hello"
openclaw browser press Enter
openclaw browser hover <ref>
openclaw browser scrollintoview <ref>
openclaw browser drag <startRef> <endRef>
openclaw browser select <ref> OptionA OptionB
openclaw browser fill --fields '[{"ref":"1","value":"Ada"}]'
openclaw browser wait --text "Done"
openclaw browser evaluate --fn '(el) => el.textContent' --ref <ref>
openclaw browser evaluate --timeout-ms 30000 --fn 'async () => { await window.ready; return true; }'
```

Utilisez `evaluate --timeout-ms <ms>` lorsque la fonction côté page peut avoir besoin de plus de temps
que le délai d'évaluation par défaut.

Les réponses aux actions renvoient l'`targetId` brut actuel après le
remplacement de page déclenché par l'action lorsque OpenClaw peut prouver
l'onglet de remplacement. Les scripts doivent toujours stocker et transmettre les
`suggestedTargetId`/labels pour les workflows de longue durée.

Assistants pour les fichiers + boîtes de dialogue :

```bash
openclaw browser upload /tmp/openclaw/uploads/file.pdf --ref <ref>
openclaw browser upload media://inbound/file.pdf --ref <ref>
openclaw browser waitfordownload
openclaw browser download <ref> report.pdf
openclaw browser dialog --accept
openclaw browser dialog --dismiss --dialog-id d1
```

Les profils Chrome gérés enregistrent les téléchargements déclenchés par un clic
ordinaire dans le répertoire de téléchargements de OpenClaw (`/tmp/openclaw/downloads` par
défaut, ou la racine temporaire configurée). Utilisez `waitfordownload` ou `download`
lorsque l'agent doit attendre un fichier spécifique et renvoyer son chemin ; ces
attentes explicites possèdent le prochain téléchargement. Les téléchargements
acceptent les fichiers de la racine de téléchargements temporaire de
OpenClaw et les médias entrants gérés par OpenClaw, y compris les
références `media://inbound/<id>` et `media/inbound/<id>` relatives au bac à sable. Les
références de médias imbriquées, le traversail et les chemins locaux arbitraires
restent rejetés.
Lorsqu'une action ouvre une boîte de dialogue modale, la réponse de l'action
renvoie `blockedByDialog` avec `browserState.dialogs.pending` ; transmettez `--dialog-id` pour y
répondre directement. Les boîtes de dialogue gérées en dehors de
OpenClaw apparaissent sous `browserState.dialogs.recent`.

## État et stockage

Viewport + émulation :

```bash
openclaw browser resize 1280 720
openclaw browser set viewport 1280 720
openclaw browser set offline on
openclaw browser set media dark
openclaw browser set timezone Europe/London
openclaw browser set locale en-GB
openclaw browser set geo 51.5074 -0.1278 --accuracy 25
openclaw browser set device "iPhone 14"
openclaw browser set headers '{"x-test":"1"}'
openclaw browser set credentials myuser mypass
```

Cookies + stockage :

```bash
openclaw browser cookies
openclaw browser cookies set session abc123 --url https://example.com
openclaw browser cookies clear
openclaw browser storage local get
openclaw browser storage local set token abc123
openclaw browser storage session clear
```

## Débogage

```bash
openclaw browser console --level error
openclaw browser pdf
openclaw browser responsebody "**/api"
openclaw browser highlight <ref>
openclaw browser errors --clear
openclaw browser requests --filter api
openclaw browser trace start
openclaw browser trace stop --out trace.zip
```

## Chrome existant via MCP

Utilisez le profil intégré `user`, ou créez votre propre profil `existing-session` :

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser --browser-profile chrome-live tabs
```

Ce chemin est uniquement pour l'hôte. Pour Docker, les serveurs sans interface (headless), Browserless ou d'autres configurations distantes, utilisez plutôt un profil CDP.

Limites actuelles de la session existante :

- les actions basées sur des instantanés utilisent des références, pas des sélecteurs CSS
- `browser.actionTimeoutMs` définit par défaut les demandes `act` prises en
  charge à 60000 ms lorsque les appelants omettent `timeoutMs` ;
  le `timeoutMs` par appel l'emporte toujours.
- `click` est un clic gauche uniquement
- `type` ne prend pas en charge `slowly=true`
- `press` ne prend pas en charge `delayMs`
- `hover`, `scrollintoview`, `drag`, `select`,
  `fill` et `evaluate` rejettent les remplacements de
  délai d'expiration par appel
- `select` prend en charge une seule valeur
- `wait --load networkidle` n'est pas pris en charge
- les téléchargements de fichiers nécessitent `--ref` / `--input-ref`, ne prennent pas en charge le CSS `--element`, et prennent actuellement en charge un seul fichier à la fois
- les hooks de dialogue ne prennent pas en charge `--timeout`
- les captures d'écran prennent en charge les captures de page et `--ref`, mais pas le CSS `--element`
- `responsebody`, l'interception des téléchargements, l'exportation PDF et les actions par lots nécessitent toujours un navigateur géré ou un profil CDP brut

## Contrôle à distance du navigateur (proxy de l'hôte de nœud)

Si le Gateway s'exécute sur une machine différente de celle du navigateur, exécutez un **node host** sur la machine qui dispose de Chrome/Brave/Edge/Chromium. Le Gateway agira comme proxy pour les actions du navigateur vers ce nœud (aucun serveur de contrôle de navigateur séparé requis).

Utilisez `gateway.nodes.browser.mode` pour contrôler le routage automatique et `gateway.nodes.browser.node` pour épingler un nœud spécifique si plusieurs sont connectés.

Sécurité + configuration à distance : [Outil navigateur](/fr/tools/browser), [Accès à distance](/fr/gateway/remoteTailscale), [Tailscale](/fr/gateway/tailscale), [Sécurité](/fr/gateway/security)

## Connexes

- [Référence CLI](CLI/en/cli)
- [Navigateur](/fr/tools/browser)
