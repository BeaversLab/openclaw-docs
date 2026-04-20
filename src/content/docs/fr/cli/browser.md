---
summary: "Référence de la CLI pour `openclaw browser` (cycle de vie, profils, onglets, actions, état et débogage)"
read_when:
  - You use `openclaw browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to attach to your local signed-in Chrome via Chrome MCP
title: "browser"
---

# `openclaw browser`

Gérer la surface de contrôle du navigateur de OpenClaw et exécuter des actions de navigateur (cycle de vie, profils, onglets, instantanés, captures d'écran, navigation, saisie, émulation d'état et débogage).

Connexes :

- Outil de navigateur + API : [Outil de navigateur](/en/tools/browser)

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

## Dépannage rapide

Si `start` échoue avec `not reachable after start`, dépannez d'abord la disponibilité du CDP. Si `start` et `tabs` réussissent mais que `open` ou `navigate` échoue, le plan de contrôle du navigateur est sain et l'échec est généralement dû à une stratégie SSRF de navigation.

Séquence minimale :

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

Conseils détaillés : [Dépannage du navigateur](/en/tools/browser#cdp-startup-failure-vs-navigation-ssrf-block)

## Cycle de vie

```bash
openclaw browser status
openclaw browser start
openclaw browser stop
openclaw browser --browser-profile openclaw reset-profile
```

Remarques :

- Pour les profils CDP distants et `attachOnly`, `openclaw browser stop` ferme la
  session de contrôle active et efface les substitutions d'émulation temporaires, même lorsque
  OpenClaw n'a pas lancé le processus du navigateur lui-même.
- Pour les profils gérés localement, `openclaw browser stop` arrête le processus
  du navigateur généré.

## Si la commande est manquante

Si `openclaw browser` est une commande inconnue, vérifiez `plugins.allow` dans
`~/.openclaw/openclaw.json`.

Lorsque `plugins.allow` est présent, le plug-in de navigateur groupé doit être
répertorié explicitement :

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

`browser.enabled=true` ne restaure pas la sous-commande de la CLI lorsque la liste
autorisée des plug-ins exclut `browser`.

Voir aussi : [outil Browser](/en/tools/browser#missing-browser-command-or-tool)

## Profils

Les profils sont des configurations de routage de navigateur nommées. En pratique :

- `openclaw` : lance ou se connecte à une instance Chrome dédiée gérée par OpenClaw (répertoire de données utilisateur isolé).
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
openclaw browser tab new
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://docs.openclaw.ai
openclaw browser focus <targetId>
openclaw browser close <targetId>
```

## Instantané / capture d'écran / actions

Instantané :

```bash
openclaw browser snapshot
```

Capture d'écran :

```bash
openclaw browser screenshot
openclaw browser screenshot --full-page
openclaw browser screenshot --ref e12
```

Notes :

- `--full-page` est réservé aux captures de page ; il ne peut pas être combiné avec `--ref`
  ou `--element`.
- Les profils `existing-session` / `user` prennent en charge les captures d'écran de page et les captures d'écran `--ref`
  à partir de la sortie d'instantané, mais pas les captures d'écran CSS `--element`.

Navigation/clic/frappe (automatisation de l'interface utilisateur basée sur les références) :

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser type <ref> "hello"
openclaw browser press Enter
openclaw browser hover <ref>
openclaw browser scrollintoview <ref>
openclaw browser drag <startRef> <endRef>
openclaw browser select <ref> OptionA OptionB
openclaw browser fill --fields '[{"ref":"1","value":"Ada"}]'
openclaw browser wait --text "Done"
openclaw browser evaluate --fn '(el) => el.textContent' --ref <ref>
```

Assistants de fichier et de boîte de dialogue :

```bash
openclaw browser upload /tmp/openclaw/uploads/file.pdf --ref <ref>
openclaw browser waitfordownload
openclaw browser download <ref> report.pdf
openclaw browser dialog --accept
```

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

Utilisez le profil intégré `user` ou créez votre propre profil `existing-session` :

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser --browser-profile chrome-live tabs
```

Ce chemin est réservé à l'hôte. Pour Docker, les serveurs sans tête, Browserless ou d'autres configurations distantes, utilisez plutôt un profil CDP.

Limites actuelles des sessions existantes :

- les actions basées sur des instantanés utilisent des références, pas des sélecteurs CSS
- `click` effectue uniquement des clics gauches
- `type` ne prend pas en charge `slowly=true`
- `press` ne prend pas en charge `delayMs`
- `hover`, `scrollintoview`, `drag`, `select`, `fill` et `evaluate` rejettent
  les remplacements du délai d'expiration par appel
- `select` prend en charge une seule valeur
- `wait --load networkidle` n'est pas pris en charge
- les téléchargements de fichiers nécessitent `--ref` / `--input-ref`, ne prennent pas en charge les sélecteurs CSS
  `--element` et prennent actuellement en charge un seul fichier à la fois
- les crochets de boîte de dialogue ne prennent pas en charge `--timeout`
- les captures d'écran prennent en charge les captures de page et `--ref`, mais pas le CSS `--element`
- `responsebody`, l'interception des téléchargements, l'exportation PDF et les actions par lot nécessitent toujours un navigateur géré ou un profil CDP brut

## Contrôle distant du navigateur (proxy node host)

Si le Gateway s'exécute sur une machine différente de celle du navigateur, exécutez un **node host** sur la machine qui dispose de Chrome/Brave/Edge/Chromium. Le Gateway proxy les actions du navigateur vers ce nœud (aucun serveur de contrôle de navigateur séparé requis).

Utilisez `gateway.nodes.browser.mode` pour contrôler le routage automatique et `gateway.nodes.browser.node` pour épingler un nœud spécifique si plusieurs sont connectés.

Sécurité + configuration à distance : [Outil de navigateur](/en/tools/browser), [Accès à distance](/en/gateway/remote), [Tailscale](/en/gateway/tailscale), [Sécurité](/en/gateway/security)
