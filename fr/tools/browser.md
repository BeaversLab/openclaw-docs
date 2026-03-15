---
summary: "Service de contrôle de navigateur intégré + commandes d'action"
read_when:
  - Adding agent-controlled browser automation
  - Debugging why openclaw is interfering with your own Chrome
  - Implementing browser settings + lifecycle in the macOS app
title: "Navigateur (géré par OpenClaw)"
---

# Navigateur (géré par OpenClaw)

OpenClaw peut exécuter un **profil Chrome/Brave/Edge/Chromium dédié** que l'agent contrôle.
Il est isolé de votre navigateur personnel et est géré via un petit service de
contrôle local à l'intérieur de la Gateway (boucle locale uniquement).

Vue débutant :

- Considérez-le comme un **navigateur distinct, réservé à l'agent**.
- Le profil `openclaw` ne touche **pas** à votre profil de navigateur personnel.
- L'agent peut **ouvrir des onglets, lire des pages, cliquer et taper** dans un environnement sécurisé.
- Le profil `chrome` par défaut utilise le **navigateur Chromium par défaut du système** via le relais de
  l'extension ; passez à `openclaw` pour le navigateur géré isolé.

## Ce que vous obtenez

- Un profil de navigateur distinct nommé **openclaw** (accent orange par défaut).
- Contrôle déterministe des onglets (liste/ouverture/focus/fermeture).
- Actions de l'agent (cliquer/taper/faire glisser/sélectionner), instantanés, captures d'écran, PDF.
- Support multi-profil optionnel (`openclaw`, `work`, `remote`, ...).

Ce navigateur n'est **pas** votre navigateur quotidien. C'est une surface sûre et isolée pour
l'automatisation et la vérification par l'agent.

## Démarrage rapide

```bash
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

Si vous obtenez « Navigateur désactivé », activez-le dans la configuration (voir ci-dessous) et redémarrez la
Gateway.

## Profils : `openclaw` vs `chrome`

- `openclaw` : navigateur géré et isolé (aucune extension requise).
- `chrome` : relais d'extension vers votre **navigateur système** (nécessite que l'extension OpenClaw
  soit attachée à un onglet).
- `existing-session` : flux d'attachement Chrome MCP officiel pour un profil Chrome
  en cours d'exécution.

Définissez `browser.defaultProfile: "openclaw"` si vous souhaitez le mode géré par défaut.

## Configuration

Les paramètres du navigateur se trouvent dans `~/.openclaw/openclaw.json`.

```json5
{
  browser: {
    enabled: true, // default: true
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: true, // default trusted-network mode
      // allowPrivateNetwork: true, // legacy alias
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    // cdpUrl: "http://127.0.0.1:18792", // legacy single-profile override
    remoteCdpTimeoutMs: 1500, // remote CDP HTTP timeout (ms)
    remoteCdpHandshakeTimeoutMs: 3000, // remote CDP WebSocket handshake timeout (ms)
    defaultProfile: "chrome",
    color: "#FF4500",
    headless: false,
    noSandbox: false,
    attachOnly: false,
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
      chromeLive: {
        cdpPort: 18802,
        driver: "existing-session",
        attachOnly: true,
        color: "#00AA00",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
  },
}
```

Notes :

- Le service de contrôle du navigateur se lie à la boucle locale (loopback) sur un port dérivé de `gateway.port`
  (par défaut : `18791`, soit gateway + 2). Le relais utilise le port suivant (`18792`).
- Si vous remplacez le port du Gateway (`gateway.port` ou `OPENCLAW_GATEWAY_PORT`),
  les ports de navigateur dérivés sont décalés pour rester dans la même « famille ».
- `cdpUrl` correspond par défaut au port du relais s'il n'est pas défini.
- `remoteCdpTimeoutMs` s'applique aux vérifications d'accessibilité CDP distantes (non-boucle locale).
- `remoteCdpHandshakeTimeoutMs` s'applique aux vérifications d'accessibilité WebSocket CDP distantes.
- La navigation/ouverture d'onglet du navigateur est protégée contre les SSRF avant la navigation et vérifiée au mieux sur l'URL finale `http(s)` après la navigation.
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` correspond par défaut à `true` (modèle de réseau de confiance). Définissez-le sur `false` pour une navigation stricte publique uniquement.
- `browser.ssrfPolicy.allowPrivateNetwork` reste pris en charge en tant qu'alias hérité pour la compatibilité.
- `attachOnly: true` signifie « ne jamais lancer de navigateur local ; s'attacher uniquement s'il est déjà en cours d'exécution ».
- `color` + `color` par profil teintent l'interface du navigateur afin que vous puissiez voir quel profil est actif.
- Le profil par défaut est `openclaw` (navigateur autonome géré par OpenClaw). Utilisez `defaultProfile: "chrome"` pour opter pour le relais de l'extension Chrome.
- Ordre de détection automatique : navigateur par défaut du système s'il est basé sur Chromium ; sinon Chrome → Brave → Edge → Chromium → Chrome Canary.
- Les profils `openclaw` locaux attribuent automatiquement `cdpPort`/`cdpUrl` — ne définissez ceux-ci que pour le CDP distant.
- `driver: "existing-session"` utilise Chrome DevTools MCP au lieu du CDP brut. Ne
  définissez pas `cdpUrl` pour ce pilote.

## Utiliser Brave (ou un autre navigateur basé sur Chromium)

Si votre navigateur **par défaut du système** est basé sur Chromium (Chrome/Brave/Edge/etc),
OpenClaw l'utilise automatiquement. Définissez `browser.executablePath` pour remplacer
la détection automatique :

Exemple CLI :

```bash
openclaw config set browser.executablePath "/usr/bin/google-chrome"
```

```json5
// macOS
{
  browser: {
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
  }
}

// Windows
{
  browser: {
    executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
  }
}

// Linux
{
  browser: {
    executablePath: "/usr/bin/brave-browser"
  }
}
```

## Contrôle local vs distant

- **Contrôle local (par défaut) :** le Gateway démarre le service de contrôle de boucle locale et peut lancer un navigateur local.
- **Contrôle distant (hôte de nœud) :** exécutez un hôte de nœud sur la machine qui possède le navigateur ; le Gateway proxifie les actions du navigateur vers celui-ci.
- **CDP distant :** définissez `browser.profiles.<name>.cdpUrl` (ou `browser.cdpUrl`) pour
  vous attacher à un navigateur distant basé sur Chromium. Dans ce cas, OpenClaw ne lancera pas de navigateur local.

Les URL CDP distantes peuvent inclure une authentification :

- Jetons de requête (par exemple, `https://provider.example?token=<token>`)
- Authentification HTTP Basic (par exemple, `https://user:pass@provider.example`)

OpenClaw préserve l'authentification lors de l'appel aux points de terminaison `/json/*` et lors de la connexion
au WebSocket CDP. Privilégiez les variables d'environnement ou les gestionnaires de secrets pour
les jetons plutôt que de les valider dans les fichiers de configuration.

## Proxy de navigateur de nœud (zéro configuration par défaut)

Si vous exécutez un **hôte de nœud** sur la machine qui possède votre navigateur, OpenClaw peut
acheminer automatiquement les appels d'outil de navigateur vers ce nœud sans aucune configuration de navigateur supplémentaire.
C'est le chemin par défaut pour les passerelles distantes.

Remarques :

- L'hôte de nœud expose son serveur de contrôle de navigateur local via une **commande proxy**.
- Les profils proviennent de la propre configuration `browser.profiles` du nœud (identique au local).
- Désactivez si vous ne le souhaitez pas :
  - Sur le nœud : `nodeHost.browserProxy.enabled=false`
  - Sur la passerelle : `gateway.nodes.browser.mode="off"`

## Browserless (CDP distant hébergé)

[Browserless](https://browserless.io) est un service Chromium hébergé qui expose
les points de terminaison CDP via HTTPS. Vous pouvez pointer un profil de navigateur OpenClaw vers un
point de terminaison de région Browserless et vous authentifier avec votre clé API.

Exemple :

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserless",
    remoteCdpTimeoutMs: 2000,
    remoteCdpHandshakeTimeoutMs: 4000,
    profiles: {
      browserless: {
        cdpUrl: "https://production-sfo.browserless.io?token=<BROWSERLESS_API_KEY>",
        color: "#00AA00",
      },
    },
  },
}
```

Remarques :

- Remplacez `<BROWSERLESS_API_KEY>` par votre véritable jeton Browserless.
- Choisissez le point de terminaison de région qui correspond à votre compte Browserless (voir leur documentation).

## Fournisseurs WebSocket CDP directs

Certains services de navigateur hébergés exposent un point de terminaison **WebSocket direct** plutôt que
la découverte CDP standard basée sur HTTP (`/json/version`). OpenClaw prend en charge les deux :

- **Points de terminaison HTTP(S)** (par ex. Browserless) — OpenClaw appelle `/json/version` pour
  découvrir l'URL du débogueur WebSocket, puis se connecte.
- **Points de terminaison WebSocket** (`ws://` / `wss://`) — OpenClaw se connecte directement,
  en ignorant `/json/version`. Utilisez ceci pour des services tels que
  [Browserbase](https://www.browserbase.com) ou tout fournisseur qui vous fournit une
  URL WebSocket.

### Browserbase

[Browserbase](https://www.browserbase.com) est une plate-forme cloud pour exécuter des navigateurs
sans tête (headless) avec résolution intégrée de CAPTCHA, mode furtif et
proxys résidentiels.

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserbase",
    remoteCdpTimeoutMs: 3000,
    remoteCdpHandshakeTimeoutMs: 5000,
    profiles: {
      browserbase: {
        cdpUrl: "wss://connect.browserbase.com?apiKey=<BROWSERBASE_API_KEY>",
        color: "#F97316",
      },
    },
  },
}
```

Notes :

- [Inscrivez-vous](https://www.browserbase.com/sign-up) et copiez votre **clé API**
  depuis le [tableau de bord Vue d'ensemble](https://www.browserbase.com/overview).
- Remplacez `<BROWSERBASE_API_KEY>` par votre vraie clé API Browserbase.
- Browserbase crée automatiquement une session de navigateur lors de la connexion WebSocket, donc aucune
  étape de création de session manuelle n'est nécessaire.
- Le niveau gratuit permet une session simultanée et une heure de navigateur par mois.
  Voir la [tarification](https://www.browserbase.com/pricing) pour les limites des plans payants.
- Consultez la [documentation Browserbase](https://docs.browserbase.com) pour une référence complète de l'API,
  les guides SDK et les exemples d'intégration.

## Sécurité

Idées clés :

- Le contrôle du navigateur est en boucle locale uniquement (loopback-only) ; l'accès transite par l'authentification Gateway ou le jumelage de nœuds.
- Si le contrôle du navigateur est activé et qu'aucune authentification n'est configurée, OpenClaw génère automatiquement `gateway.auth.token` au démarrage et le persiste dans la configuration.
- Gardez le Gateway et tous les hôtes de nœuds sur un réseau privé (Tailscale) ; évitez l'exposition publique.
- Traitez les URL/jetons CDP distants comme des secrets ; privilégiez les variables d'environnement ou un gestionnaire de secrets.

Conseils pour le CDP distant :

- Privilégiez les points de terminaison chiffrés (HTTPS ou WSS) et les jetons à courte durée de vie lorsque cela est possible.
- Évitez d'intégrer des jetons à longue durée de vie directement dans les fichiers de configuration.

## Profils (multi-navigateur)

OpenClaw prend en charge plusieurs profils nommés (configurations de routage). Les profils peuvent être :

- **openclaw-managed** : une instance de navigateur basée sur Chromium dédiée avec son propre répertoire de données utilisateur + port CDP
- **remote** : une URL CDP explicite (navigateur basé sur Chromium s'exécutant ailleurs)
- **extension relay** : vos onglets Chrome existants via le relais local + l'extension Chrome
- **existing session** : votre profil Chrome existant via Chrome DevTools MCP auto-connect

Valeurs par défaut :

- Le profil `openclaw` est créé automatiquement s'il est manquant.
- Le profil `chrome` est intégré pour le relais de l'extension Chrome (pointe vers `http://127.0.0.1:18792` par défaut).
- Les profils de session existante sont optionnels ; créez-les avec `--driver existing-session`.
- Les ports CDP locaux sont alloués à partir de **18800–18899** par défaut.
- La suppression d'un profil déplace son répertoire de données local vers la Corbeille.

Tous les points de terminaison de contrôle acceptent `?profile=<name>` ; la CLI utilise `--browser-profile`.

## Relais d'extension Chrome (utilisez votre Chrome existant)

OpenClaw peut également contrôler **vos onglets Chrome existants** (pas d'instance Chrome « openclaw » distincte) via un relais CDP local + une extension Chrome.

Guide complet : [Chrome extension](/fr/tools/chrome-extension)

Flux :

- Le Gateway s'exécute localement (même machine) ou un hôte de nœud s'exécute sur la machine du navigateur.
- Un **serveur de relais** local écoute sur une adresse de bouclage `cdpUrl` (par défaut : `http://127.0.0.1:18792`).
- Vous cliquez sur l'icône de l'extension **OpenClaw Browser Relay** sur un onglet pour l'attacher (elle ne s'attache pas automatiquement).
- L'agent contrôle cet onglet via l'outil `browser` normal, en sélectionnant le bon profil.

Si le Gateway s'exécute ailleurs, exécutez un hôte de nœud sur la machine du navigateur pour que le Gateway puisse proxyer les actions du navigateur.

### Sessions isolées

Si la session de l'agent est isolée (sandboxed), l'outil `browser` peut par défaut être `target="sandbox"` (navigateur isolé). La prise de contrôle par relais d'extension Chrome nécessite le contrôle du navigateur hôte, donc :

- exécutez la session sans isolation (unsandboxed), ou
- définissez `agents.defaults.sandbox.browser.allowHostControl: true` et utilisez `target="host"` lors de l'appel de l'outil.

### Configuration

1. Chargez l'extension (dev/non compressée) :

```bash
openclaw browser extension install
```

- Chrome → `chrome://extensions` → activer « Mode développeur »
- « Charger l'extension non empaquetée » → sélectionnez le répertoire affiché par `openclaw browser extension path`
- Épinglez l'extension, puis cliquez dessus sur l'onglet que vous souhaitez contrôler (le badge affiche `ON`).

2. Utilisation :

- CLI : `openclaw browser --browser-profile chrome tabs`
- Outil de l'agent : `browser` avec `profile="chrome"`

Optionnel : si vous souhaitez un nom ou un port de relais différent, créez votre propre profil :

```bash
openclaw browser create-profile \
  --name my-chrome \
  --driver extension \
  --cdp-url http://127.0.0.1:18792 \
  --color "#00AA00"
```

Remarques :

- Ce mode s'appuie sur Playwright-on-CDP pour la plupart des opérations (captures d'écran/instantanés/actions).
- Détachez en cliquant à nouveau sur l'icône de l'extension.

## Session Chrome existante via MCP

OpenClaw peut également se connecter à un profil Chrome en cours d'exécution via le serveur MCP officiel Chrome DevTools. Cela réutilise les onglets et l'état de connexion déjà ouverts dans ce profil Chrome.

Références officielles pour le contexte et la configuration :

- [Chrome pour les développeurs : Utiliser Chrome DevTools MCP avec votre session de navigateur](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [README Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)

Créer un profil :

```bash
openclaw browser create-profile \
  --name chrome-live \
  --driver existing-session \
  --color "#00AA00"
```

Ensuite dans Chrome :

1. Ouvrez `chrome://inspect/#remote-debugging`
2. Activez le débogage à distance
3. Gardez Chrome ouvert et approuvez l'invite de connexion lorsque OpenClaw se connecte

Test de fumée de connexion en direct :

```bash
openclaw browser --browser-profile chrome-live start
openclaw browser --browser-profile chrome-live status
openclaw browser --browser-profile chrome-live tabs
openclaw browser --browser-profile chrome-live snapshot --format ai
```

À quoi ressemble le succès :

- `status` affiche `driver: existing-session`
- `status` affiche `running: true`
- `tabs` liste vos onglets Chrome déjà ouverts
- `snapshot` renvoie les références de l'onglet en direct sélectionné

Ce qu'il faut vérifier si la connexion échoue :

- Chrome est en version `144+`
- le débogage à distance est activé sur `chrome://inspect/#remote-debugging`
- Chrome a affiché et vous avez accepté l'invite de consentement de connexion
- le Gateway ou l'hôte du nœud peut générer `npx chrome-devtools-mcp@latest --autoConnect`

Notes :

- Cette méthode présente un risque plus élevé que le profil isolé `openclaw` car elle peut
  agir au sein de votre session de navigateur connectée.
- OpenClaw ne lance pas Chrome pour ce pilote ; il se connecte à une
  session existante uniquement.
- OpenClaw utilise ici le flux MCP officiel Chrome DevTools `--autoConnect`, et non
  le workflow de port de débogage à distance du profil par défaut hérité.
- Les captures d'écran de session existante prennent en charge les captures de page et les captures d'élément `--ref`
  à partir d'instantanés, mais pas les sélecteurs CSS `--element`.
- Le `wait --url` de session existante prend en charge les modèles exacts, de sous-chaîne et glob
  comme les autres pilotes de navigateur. `wait --load networkidle` n'est pas encore pris en charge.
- Certaines fonctionnalités nécessitent toujours le relais d'extension ou le chemin du navigateur géré, telles
  que l'exportation PDF et l'interception des téléchargements.
- Laissez le relais en boucle locale (loopback) uniquement par défaut. Si le relais doit être accessible depuis un espace de noms réseau différent (par exemple Gateway dans WSL2, Chrome sur Windows), définissez `browser.relayBindHost` sur une adresse de liaison explicite telle que `0.0.0.0` tout en gardant le réseau environnant privé et authentifié.

Exemple WSL2 / multi-espace de noms :

```json5
{
  browser: {
    enabled: true,
    relayBindHost: "0.0.0.0",
    defaultProfile: "chrome",
  },
}
```

## Garanties d'isolation

- **Répertoire de données utilisateur dédié** : ne touche jamais votre profil de navigateur personnel.
- **Ports dédiés** : évite `9222` pour empêcher les collisions avec les flux de travail de développement.
- **Contrôle déterministe des onglets** : cible les onglets par `targetId`, et non « le dernier onglet ».

## Sélection du navigateur

Lors du lancement en local, OpenClaw choisit le premier disponible :

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

Vous pouvez remplacer avec `browser.executablePath`.

Plateformes :

- macOS : vérifie `/Applications` et `~/Applications`.
- Linux : recherche `google-chrome`, `brave`, `microsoft-edge`, `chromium`, etc.
- Windows : vérifie les emplacements d'installation courants.

## API de contrôle (facultatif)

Pour les intégrations locales uniquement, la passerie expose une petite API HTTP de boucle locale :

- Statut/démarrage/arrêt : `GET /`, `POST /start`, `POST /stop`
- Onglets : `GET /tabs`, `POST /tabs/open`, `POST /tabs/focus`, `DELETE /tabs/:targetId`
- Instantané/capture d'écran : `GET /snapshot`, `POST /screenshot`
- Actions : `POST /navigate`, `POST /act`
- Hooks : `POST /hooks/file-chooser`, `POST /hooks/dialog`
- Téléchargements : `POST /download`, `POST /wait/download`
- Débogage : `GET /console`, `POST /pdf`
- Débogage : `GET /errors`, `GET /requests`, `POST /trace/start`, `POST /trace/stop`, `POST /highlight`
- Réseau : `POST /response/body`
- État : `GET /cookies`, `POST /cookies/set`, `POST /cookies/clear`
- État : `GET /storage/:kind`, `POST /storage/:kind/set`, `POST /storage/:kind/clear`
- Paramètres : `POST /set/offline`, `POST /set/headers`, `POST /set/credentials`, `POST /set/geolocation`, `POST /set/media`, `POST /set/timezone`, `POST /set/locale`, `POST /set/device`

Tous les points de terminaison acceptent `?profile=<name>`.

Si l'authentification de la passerie est configurée, les routes HTTP du navigateur nécessitent également une authentification :

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` ou authentification HTTP Basic avec ce mot de passe

### Exigence Playwright

Certaines fonctionnalités (navigation/action/instantané IA/instantané de rôle, captures d'écran d'éléments, PDF) nécessitent
Playwright. Si Playwright n'est pas installé, ces points de terminaison renvoient une erreur 501
claire. Les instantanés ARIA et les captures d'écran basiques fonctionnent toujours pour Chrome géré par OpenClaw.
Pour le pilote de relais de l'extension Chrome, les instantanés ARIA et les captures d'écran nécessitent Playwright.

Si vous voyez `Playwright is not available in this gateway build`, installez le package complet
Playwright (pas `playwright-core`) et redémarrez la passerelle, ou réinstallez
OpenClaw avec la prise en charge du navigateur.

#### Installation de Playwright sur Docker

Si votre Gateway s'exécute dans Docker, évitez `npx playwright` (conflits de substitution npm).
Utilisez plutôt le CLI inclus :

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

Pour conserver les téléchargements du navigateur, définissez `PLAYWRIGHT_BROWSERS_PATH` (par exemple,
`/home/node/.cache/ms-playwright`) et assurez-vous que `/home/node` est conservé via
`OPENCLAW_HOME_VOLUME` ou un montage de liaison (bind mount). Voir [Docker](/fr/install/docker).

## Fonctionnement (interne)

Flux de haut niveau :

- Un petit **serveur de contrôle** accepte les requêtes HTTP.
- Il se connecte aux navigateurs basés sur Chromium (Chrome/Brave/Edge/Chromium) via **CDP**.
- Pour les actions avancées (clic/frappe/instantané/PDF), il utilise **Playwright** par-dessus
  CDP.
- Lorsque Playwright est manquant, seules les opérations non-Playwright sont disponibles.

Cette conception maintient l'agent sur une interface stable et déterministe tout en vous permettant
d'échanger des navigateurs et des profils locaux/distants.

## Référence rapide CLI

Toutes les commandes acceptent `--browser-profile <name>` pour cibler un profil spécifique.
Toutes les commandes acceptent également `--json` pour une sortie lisible par machine (charges utiles stables).

Notions de base :

- `openclaw browser status`
- `openclaw browser start`
- `openclaw browser stop`
- `openclaw browser tabs`
- `openclaw browser tab`
- `openclaw browser tab new`
- `openclaw browser tab select 2`
- `openclaw browser tab close 2`
- `openclaw browser open https://example.com`
- `openclaw browser focus abcd1234`
- `openclaw browser close abcd1234`

Inspection :

- `openclaw browser screenshot`
- `openclaw browser screenshot --full-page`
- `openclaw browser screenshot --ref 12`
- `openclaw browser screenshot --ref e12`
- `openclaw browser snapshot`
- `openclaw browser snapshot --format aria --limit 200`
- `openclaw browser snapshot --interactive --compact --depth 6`
- `openclaw browser snapshot --efficient`
- `openclaw browser snapshot --labels`
- `openclaw browser snapshot --selector "#main" --interactive`
- `openclaw browser snapshot --frame "iframe#main" --interactive`
- `openclaw browser console --level error`
- `openclaw browser errors --clear`
- `openclaw browser requests --filter api --clear`
- `openclaw browser pdf`
- `openclaw browser responsebody "**/api" --max-chars 5000`

Actions :

- `openclaw browser navigate https://example.com`
- `openclaw browser resize 1280 720`
- `openclaw browser click 12 --double`
- `openclaw browser click e12 --double`
- `openclaw browser type 23 "hello" --submit`
- `openclaw browser press Enter`
- `openclaw browser hover 44`
- `openclaw browser scrollintoview e12`
- `openclaw browser drag 10 11`
- `openclaw browser select 9 OptionA OptionB`
- `openclaw browser download e12 report.pdf`
- `openclaw browser waitfordownload report.pdf`
- `openclaw browser upload /tmp/openclaw/uploads/file.pdf`
- `openclaw browser fill --fields '[{"ref":"1","type":"text","value":"Ada"}]'`
- `openclaw browser dialog --accept`
- `openclaw browser wait --text "Done"`
- `openclaw browser wait "#main" --url "**/dash" --load networkidle --fn "window.ready===true"`
- `openclaw browser evaluate --fn '(el) => el.textContent' --ref 7`
- `openclaw browser highlight e12`
- `openclaw browser trace start`
- `openclaw browser trace stop`

État :

- `openclaw browser cookies`
- `openclaw browser cookies set session abc123 --url "https://example.com"`
- `openclaw browser cookies clear`
- `openclaw browser storage local get`
- `openclaw browser storage local set theme dark`
- `openclaw browser storage session clear`
- `openclaw browser set offline on`
- `openclaw browser set headers --headers-json '{"X-Debug":"1"}'`
- `openclaw browser set credentials user pass`
- `openclaw browser set credentials --clear`
- `openclaw browser set geo 37.7749 -122.4194 --origin "https://example.com"`
- `openclaw browser set geo --clear`
- `openclaw browser set media dark`
- `openclaw browser set timezone America/New_York`
- `openclaw browser set locale en-US`
- `openclaw browser set device "iPhone 14"`

Notes :

- `upload` et `dialog` sont des appels d'**armement** ; exécutez-les avant le clic/l'appui
  qui déclenche le sélecteur/la boîte de dialogue.
- Les chemins de téléchargement et de sortie de trace sont limités aux racines temporaires OpenClaw :
  - traces : `/tmp/openclaw` (fallback : `${os.tmpdir()}/openclaw`)
  - downloads : `/tmp/openclaw/downloads` (fallback : `${os.tmpdir()}/openclaw/downloads`)
- Les chemins de téléchargement sont limités à une racine de téléchargements temporaire d'OpenClaw :
  - uploads : `/tmp/openclaw/uploads` (fallback : `${os.tmpdir()}/openclaw/uploads`)
- `upload` peut également définir directement les entrées de fichiers via `--input-ref` ou `--element`.
- `snapshot` :
  - `--format ai` (par défaut lorsque Playwright est installé) : renvoie un instantané IA avec des références numériques (`aria-ref="<n>"`).
  - `--format aria` : renvoie l'arborescence d'accessibilité (pas de références ; inspection uniquement).
  - `--efficient` (ou `--mode efficient`) : préréglage d'instantané de rôle compact (interactif + compact + profondeur + maxChars inférieur).
  - Par défaut de configuration (tool/CLI uniquement) : définissez `browser.snapshotDefaults.mode: "efficient"` pour utiliser des instantanés efficaces lorsque l'appelant ne passe pas de mode (voir [configuration du Gateway](/fr/gateway/configuration#browser-openclaw-managed-browser)).
  - Les options d'instantané de rôle (`--interactive`, `--compact`, `--depth`, `--selector`) forcent un instantané basé sur les rôles avec des références comme `ref=e12`.
  - `--frame "<iframe selector>"` limite les instantanés de rôle à une iframe (fonctionne avec des références de rôle comme `e12`).
  - `--interactive` produit une liste plate et facile à choisir d'éléments interactifs (idéal pour piloter les actions).
  - `--labels` ajoute une capture d'écran de la seule fenêtre d'affichage avec des étiquettes de référence superposées (imprime `MEDIA:<path>`).
- `click`/`type`/etc nécessitent une `ref` de `snapshot` (soit une référence numérique `12` soit une référence de rôle `e12`).
  Les sélecteurs CSS ne sont intentionnellement pas pris en charge pour les actions.

## Instantanés et références

OpenClaw prend en charge deux styles d'« instantané » :

- **Instantané IA (références numériques)** : `openclaw browser snapshot` (par défaut ; `--format ai`)
  - Sortie : un instantané textuel incluant des références numériques.
  - Actions : `openclaw browser click 12`, `openclaw browser type 23 "hello"`.
  - En interne, la référence est résolue via `aria-ref` de Playwright.

- **Instantané de rôle (références de rôle comme `e12`)** : `openclaw browser snapshot --interactive` (ou `--compact`, `--depth`, `--selector`, `--frame`)
  - Sortie : une liste/arborescence basée sur les rôles avec `[ref=e12]` (et `[nth=1]` en option).
  - Actions : `openclaw browser click e12`, `openclaw browser highlight e12`.
  - En interne, la référence est résolue via `getByRole(...)` (plus `nth()` pour les doublons).
  - Ajoutez `--labels` pour inclure une capture d'écran de la fenêtre d'affichage avec des étiquettes `e12` superposées.

Comportement des références :

- Les références ne sont **pas stables lors des navigations** ; si quelque chose échoue, réexécutez `snapshot` et utilisez une nouvelle référence.
- Si l'instantané de rôle a été pris avec `--frame`, les références de rôle sont limitées à cet iframe jusqu'au prochain instantané de rôle.

## Améliorations d'attente

Vous pouvez attendre autre chose que le temps/texte :

- Attendre l'URL (les globbing sont pris en charge par Playwright) :
  - `openclaw browser wait --url "**/dash"`
- Attendre l'état de chargement :
  - `openclaw browser wait --load networkidle`
- Attendre un prédicat JS :
  - `openclaw browser wait --fn "window.ready===true"`
- Attendre qu'un sélecteur devienne visible :
  - `openclaw browser wait "#main"`

Ces éléments peuvent être combinés :

```bash
openclaw browser wait "#main" \
  --url "**/dash" \
  --load networkidle \
  --fn "window.ready===true" \
  --timeout-ms 15000
```

## Workflows de débogage

Lorsqu'une action échoue (par exemple, « non visible », « violation du mode strict », « couvert ») :

1. `openclaw browser snapshot --interactive`
2. Utilisez `click <ref>` / `type <ref>` (préférez les références de rôle en mode interactif)
3. Si cela échoue toujours : `openclaw browser highlight <ref>` pour voir ce que Playwright cible
4. Si la page se comporte bizarrement :
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. Pour un débogage approfondi : enregistrez une trace :
   - `openclaw browser trace start`
   - reproduisez le problème
   - `openclaw browser trace stop` (affiche `TRACE:<path>`)

## Sortie JSON

`--json` est destiné au scriptage et aux outils structurés.

Exemples :

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

Les instantanés de rôle en JSON incluent `refs` ainsi qu'un petit bloc `stats` (lignes/caractères/réfs/interactif) afin que les outils puissent évaluer la taille et la densité de la charge utile.

## Contrôles d'état et d'environnement

Ils sont utiles pour les workflows du type « faire se comporter le site comme X » :

- Cookies : `cookies`, `cookies set`, `cookies clear`
- Stockage : `storage local|session get|set|clear`
- Hors ligne : `set offline on|off`
- En-têtes : `set headers --headers-json '{"X-Debug":"1"}'` (l'ancien `set headers --json '{"X-Debug":"1"}'` reste pris en charge)
- Authentification de base HTTP : `set credentials user pass` (ou `--clear`)
- Géolocalisation : `set geo <lat> <lon> --origin "https://example.com"` (ou `--clear`)
- Médias : `set media dark|light|no-preference|none`
- Fuseau horaire / langue : `set timezone ...`, `set locale ...`
- Appareil / viewport :
  - `set device "iPhone 14"` (préréglages d'appareils Playwright)
  - `set viewport 1280 720`

## Sécurité et confidentialité

- Le profil de navigateur openclaw peut contenir des sessions connectées ; traitez-le comme sensible.
- `browser act kind=evaluate` / `openclaw browser evaluate` et `wait --fn`
  exécutent du JavaScript arbitraire dans le contexte de la page. L'injection de prompts peut influencer
  ce comportement. Désactivez-le avec `browser.evaluateEnabled=false` si vous n'en avez pas besoin.
- Pour les notes de connexion et anti-bot (X/Twitter, etc.), consultez [Connexion au navigateur + publication sur X/Twitter](/fr/tools/browser-login).
- Gardez l'hôte Gateway/node privé (boucle locale ou uniquement tailnet).
- Les points de terminaison CDP distants sont puissants ; mettez-les dans un tunnel et protégez-les.

Exemple en mode strict (bloquer les destinations privées/internes par défaut) :

```json5
{
  browser: {
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: false,
      hostnameAllowlist: ["*.example.com", "example.com"],
      allowedHostnames: ["localhost"], // optional exact allow
    },
  },
}
```

## Dépannage

Pour les problèmes spécifiques à Linux (notamment snap Chromium), consultez
[Browser troubleshooting](/fr/tools/browser-linux-troubleshooting).

Pour les configurations avec WSL2 Gateway et Chrome Windows en hôtes séparés, consultez
[WSL2 + Windows + remote Chrome CDP troubleshooting](/fr/tools/browser-wsl2-windows-remote-cdp-troubleshooting).

## Outils de l'agent + fonctionnement du contrôle

L'agent dispose d'**un outil** pour l'automatisation du navigateur :

- `browser` — status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

Comment cela s'applique :

- `browser snapshot` renvoie une arborescence d'interface utilisateur stable (AI ou ARIA).
- `browser act` utilise les ID de snapshot `ref` pour cliquer/tirer/glisser/sélectionner.
- `browser screenshot` capture les pixels (page entière ou élément).
- `browser` accepte :
  - `profile` pour choisir un profil de navigateur nommé (openclaw, chrome ou CDP distant).
  - `target` (`sandbox` | `host` | `node`) pour sélectionner l'emplacement du navigateur.
  - Dans les sessions sandboxed, `target: "host"` nécessite `agents.defaults.sandbox.browser.allowHostControl=true`.
  - Si `target` est omis : les sessions sandboxed utilisent par défaut `sandbox`, les sessions non-sandbox utilisent par défaut `host`.
  - Si un nœud compatible navigateur est connecté, l'outil peut s'y acheminer automatiquement sauf si vous épinglez `target="host"` ou `target="node"`.

Cela rend l'agent déterministe et évite les sélecteurs fragiles.

import fr from '/components/footer/fr.mdx';

<fr />
