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
- Le profil `user` intégré se connecte à votre session Chrome réelle connectée ;
  `chrome-relay` est le profil explicite de relais d'extension.

## Ce que vous obtenez

- Un profil de navigateur distinct nommé **openclaw** (accent orange par défaut).
- Contrôle déterministe des onglets (liste/ouverture/focus/fermeture).
- Actions de l'agent (cliquer/taper/faire glisser/sélectionner), instantanés, captures d'écran, PDF.
- Prise en charge facultative de plusieurs profils (`openclaw`, `work`, `remote`, ...).

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

## Profils : `openclaw` vs `user` vs `chrome-relay`

- `openclaw` : navigateur géré et isolé (aucune extension requise).
- `user` : profil de connexion MCP Chrome intégré pour votre session Chrome
  **réelle connectée**.
- `chrome-relay` : relais d'extension vers votre **navigateur système** (nécessite que l'extension OpenClaw soit attachée à un onglet).

Pour les appels d'outil de navigateur de l'agent :

- Par défaut : utiliser le navigateur isolé `openclaw`.
- Privilégiez `profile="user"` lorsque les sessions connectées existantes comptent et que l'utilisateur est devant l'ordinateur pour cliquer/approuver toute invite d'attachement.
- Utilisez `profile="chrome-relay"` uniquement lorsque l'utilisateur souhaite explicitement le flux d'attachement via l'extension Chrome / le bouton de la barre d'outils.
- `profile` est le remplacement explicite lorsque vous souhaitez un mode de navigateur spécifique.

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
    defaultProfile: "openclaw",
    color: "#FF4500",
    headless: false,
    noSandbox: false,
    attachOnly: false,
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
      user: {
        driver: "existing-session",
        attachOnly: true,
        color: "#00AA00",
      },
      "chrome-relay": {
        driver: "extension",
        cdpUrl: "http://127.0.0.1:18792",
        color: "#00AA00",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
  },
}
```

Notes :

- Le service de contrôle du navigateur se lie à l'adresse de bouclage sur un port dérivé de `gateway.port`
  (par défaut : `18791`, soit gateway + 2). Le relais utilise le port suivant (`18792`).
- Si vous remplacez le port Gateway (`gateway.port` ou `OPENCLAW_GATEWAY_PORT`),
  les ports de navigateur dérivés se décalent pour rester dans la même « famille ».
- `cdpUrl` correspond par défaut au port du relais s'il n'est pas défini.
- `remoteCdpTimeoutMs` s'applique aux vérifications d'accessibilité CDP distantes (non bouclage).
- `remoteCdpHandshakeTimeoutMs` s'applique aux vérifications d'accessibilité WebSocket CDP distantes.
- La navigation/ouverture d'onglet du navigateur est protégée contre les SSRF avant la navigation et vérifiée au mieux sur l'URL `http(s)` finale après la navigation.
- En mode SSRF strict, la découverte/sonde de points de terminaison CDP distants (`cdpUrl`, y compris les recherches `/json/version`) sont également vérifiés.
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` est défini par défaut sur `true` (modèle de réseau de confiance). Définissez-le sur `false` pour une navigation publique stricte uniquement.
- `browser.ssrfPolicy.allowPrivateNetwork` reste pris en charge en tant qu'alias hérité pour la compatibilité.
- `attachOnly: true` signifie « ne jamais lancer de navigateur local ; s'attacher uniquement s'il est déjà en cours d'exécution ».
- `color` + `color` par profil teintent l'interface du navigateur afin que vous puissiez voir quel profil est actif.
- Le profil par défaut est `openclaw` (navigateur autonome géré par OpenClaw). Utilisez `defaultProfile: "user"` pour opter pour le navigateur de l'utilisateur connecté, ou `defaultProfile: "chrome-relay"` pour le relais de l'extension.
- Ordre de détection automatique : navigateur par défaut du système s'il est basé sur Chromium ; sinon Chrome → Brave → Edge → Chromium → Chrome Canary.
- Les profils locaux `openclaw` attribuent automatiquement `cdpPort`/`cdpUrl` — ne définissez ces valeurs que pour le CDP distant.
- `driver: "existing-session"` utilise Chrome DevTools MCP au lieu du CDP brut. Ne définissez pas `cdpUrl` pour ce pilote.

## Utiliser Brave (ou un autre navigateur basé sur Chromium)

Si votre navigateur par défaut du système est basé sur Chromium (Chrome/Brave/Edge/etc.),
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
- **Contrôle distant (hôte de nœud) :** exécutez un hôte de nœud sur la machine qui possède le navigateur ; le Gateway relaie les actions du navigateur vers celui-ci.
- **CDP distant :** définissez `browser.profiles.<name>.cdpUrl` (ou `browser.cdpUrl`) pour
  vous connecter à un navigateur distant basé sur Chromium. Dans ce cas, OpenClaw ne lancera pas de navigateur local.

Les URL CDP distantes peuvent inclure une authentification :

- Jetons de requête (ex. : `https://provider.example?token=<token>`)
- Authentification HTTP Basic (ex. : `https://user:pass@provider.example`)

OpenClaw préserve l'authentification lors de l'appel aux points de terminaison `/json/*` et lors de la connexion
au WebSocket CDP. Préférez les variables d'environnement ou les gestionnaires de secrets pour
les jetons plutôt que de les committer dans les fichiers de configuration.

## Proxy de navigateur de nœud (par défaut sans configuration)

Si vous exécutez un **node host** sur la machine qui possède votre navigateur, OpenClaw peut
router automatiquement les appels d'outil de navigateur vers ce nœud sans aucune configuration de navigateur supplémentaire.
C'est le chemin par défaut pour les passerelles distantes.

Notes :

- L'hôte du nœud expose son serveur de contrôle de navigateur local via une **proxy command**.
- Les profils proviennent de la propre configuration `browser.profiles` du nœud (identique à la configuration locale).
- Désactivez si vous ne le souhaitez pas :
  - Sur le nœud : `nodeHost.browserProxy.enabled=false`
  - Sur la passerelle : `gateway.nodes.browser.mode="off"`

## Browserless (CDP distant hébergé)

[Browserless](https://browserless.io) est un service Chromium hébergé qui expose
des points de terminaison CDP via HTTPS. Vous pouvez pointer un profil de navigateur OpenClaw vers un
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

Notes :

- Remplacez `<BROWSERLESS_API_KEY>` par votre vrai jeton Browserless.
- Choisissez le point de terminaison régional qui correspond à votre compte Browserless (consultez leur documentation).

## Fournisseurs WebSocket CDP directs

Certains services de navigateur hébergés exposent un point de terminaison **WebSocket direct** plutôt que
la découverte CDP standard basée sur HTTP (`/json/version`). OpenClaw prend en charge les deux :

- **Points de terminaison HTTP(S)** (par ex. Browserless) — OpenClaw appelle `/json/version` pour
  découvrir l'URL du débogueur WebSocket, puis se connecte.
- **Points de terminaison WebSocket** (`ws://` / `wss://`) — OpenClaw se connecte directement,
  en ignorant `/json/version`. Utilisez ceci pour des services comme
  [Browserbase](https://www.browserbase.com) ou tout fournisseur qui vous fournit une
  URL WebSocket.

### Browserbase

[Browserbase](https://www.browserbase.com) est une plateforme cloud pour exécuter
des navigateurs sans tête avec résolution intégrée de CAPTCHA, mode furtif et proxys
résidentiels.

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
  depuis le [tableau de bord d'aperçu](https://www.browserbase.com/overview).
- Remplacez `<BROWSERBASE_API_KEY>` par votre véritable clé API Browserbase.
- Browserbase crée automatiquement une session de navigateur lors de la connexion WebSocket, donc aucune
  étape de création manuelle de session n'est nécessaire.
- Le niveau gratuit permet une session simultanée et une heure de navigateur par mois.
  Consultez la [tarification](https://www.browserbase.com/pricing) pour les limites des plans payants.
- Consultez la [documentation Browserbase](https://docs.browserbase.com) pour la référence complète de l'API,
  les guides du SDK et les exemples d'intégration.

## Sécurité

Idées clés :

- Le contrôle du navigateur est limité à la boucle locale (loopback) ; l'accès s'effectue via l'authentification du Gateway ou le jumelage de nœud.
- Si le contrôle du navigateur est activé et qu'aucune authentification n'est configurée, OpenClaw génère automatiquement `gateway.auth.token` au démarrage et le persiste dans la configuration.
- Gardez le Gateway et tous les hôtes de nœuds sur un réseau privé (Tailscale) ; évitez l'exposition publique.
- Traitez les URL/jetons CDP distants comme des secrets ; préférez les env vars ou un gestionnaire de secrets.

Conseils CDP distant :

- Préférez les points de terminaison chiffrés (HTTPS ou WSS) et les jetons à courte durée de vie dans la mesure du possible.
- Évitez d'intégrer des jetons à longue durée de vie directement dans les fichiers de configuration.

## Profils (multi-navigateur)

OpenClaw prend en charge plusieurs profils nommés (configurations de routage). Les profils peuvent être :

- **openclaw-managed** : une instance de navigateur basée sur Chromium dédiée avec son propre répertoire de données utilisateur + port CDP
- **remote** : une URL CDP explicite (navigateur basé sur Chromium exécuté ailleurs)
- **extension relay** : vos onglets Chrome existants via le relais local + l'extension Chrome
- **session existante** : votre profil Chrome existant via Chrome DevTools MCP en connexion automatique

Valeurs par défaut :

- Le profil `openclaw` est créé automatiquement s'il est manquant.
- Le profil `chrome-relay` est intégré pour le relais de l'extension Chrome (pointe vers `http://127.0.0.1:18792` par défaut).
- Les profils de session existante sont optionnels ; créez-les avec `--driver existing-session`.
- Les ports CDP locaux sont alloués à partir de **18800–18899** par défaut.
- Supprimer un profil déplace son répertoire de données locales vers la Corbeille.

Tous les points de terminaison de contrôle acceptent `?profile=<name>` ; le CLI utilise `--browser-profile`.

## Relais d'extension Chrome (utilisez votre Chrome existant)

OpenClaw peut également piloter **vos onglets Chrome existants** (pas d'instance Chrome « openclaw » distincte) via un relais CDP local + une extension Chrome.

Guide complet : [extension Chrome](/fr/tools/chrome-extension)

Flux :

- Le Gateway s'exécute localement (même machine) ou un nœud hôte s'exécute sur la machine du navigateur.
- Un **serveur de relais** local écoute sur une adresse de bouclage `cdpUrl` (par défaut : `http://127.0.0.1:18792`).
- Vous cliquez sur l'icône de l'extension **Relais de navigateur OpenClaw** dans un onglet pour l'attacher (il ne s'attache pas automatiquement).
- L'agent contrôle cet onglet via l'`browser` habituel, en sélectionnant le bon profil.

Si le Gateway s'exécute ailleurs, exécutez un hôte de nœud sur la machine du navigateur afin que le Gateway puisse proxifier les actions du navigateur.

### Sessions sandboxed

Si la session de l'agent est sandboxed, l'outil `browser` peut par défaut utiliser `target="sandbox"` (navigateur sandbox).
La prise de contrôle par relais d'extension Chrome nécessite le contrôle du navigateur hôte, donc soit :

- exécutez la session sans sandbox, ou
- définissez `agents.defaults.sandbox.browser.allowHostControl: true` et utilisez `target="host"` lors de l'appel de l'outil.

### Configuration

1. Charger l'extension (dev/décompressée) :

```bash
openclaw browser extension install
```

- Chrome → `chrome://extensions` → activer « Mode développeur »
- « Charger l'extension non empaquetée » → sélectionner le répertoire affiché par `openclaw browser extension path`
- Épingler l'extension, puis cliquer dessus sur l'onglet que vous souhaitez contrôler (le badge affiche `ON`).

2. Utilisez-la :

- CLI : `openclaw browser --browser-profile chrome-relay tabs`
- Outil de l'agent : `browser` avec `profile="chrome-relay"`

Optionnel : si vous souhaitez un nom ou un port de relais différent, créez votre propre profil :

```bash
openclaw browser create-profile \
  --name my-chrome \
  --driver extension \
  --cdp-url http://127.0.0.1:18792 \
  --color "#00AA00"
```

Notes :

- Ce mode s'appuie sur Playwright-on-CDP pour la plupart des opérations (captures d'écran/instantanés/actions).
- Détacher en cliquant à nouveau sur l'icône de l'extension.
- Utilisation par l'agent : préférez `profile="user"` pour les sites connectés. Utilisez `profile="chrome-relay"`
  uniquement lorsque vous souhaitez spécifiquement le flux de l'extension. L'utilisateur doit être présent
  pour cliquer sur l'extension et attacher l'onglet.

## Chrome session existante via MCP

OpenClaw peut également se connecter à un profil Chrome en cours d'exécution via le serveur MCP officiel de Chrome DevTools. Cela réutilise les onglets et l'état de connexion déjà ouverts dans ce profil Chrome.

Références officielles pour le contexte et la configuration :

- [Chrome pour les développeurs : Utiliser Chrome DevTools MCP avec votre session de navigateur](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [README du MCP Chrome DevTools](https://github.com/ChromeDevTools/chrome-devtools-mcp)

Profil intégré :

- `user`

Optionnel : créez votre propre profil de session existante personnalisé si vous souhaitez un nom ou une couleur différent.

Ensuite, dans Chrome :

1. Ouvrez `chrome://inspect/#remote-debugging`
2. Activez le débogage à distance
3. Gardez Chrome ouvert et approuvez la demande de connexion lorsqu'OpenClaw se connecte

Test de connexion rapide en direct :

```bash
openclaw browser --browser-profile user start
openclaw browser --browser-profile user status
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot --format ai
```

À quoi ressemble le succès :

- `status` affiche `driver: existing-session`
- `status` montre `transport: chrome-mcp`
- `status` montre `running: true`
- `tabs` répertorie vos onglets Chrome déjà ouverts
- `snapshot` renvoie les références de l'onglet en direct sélectionné

Ce qu'il faut vérifier si l'attachement ne fonctionne pas :

- Chrome est en version `144+`
- le débogage à distance est activé sur `chrome://inspect/#remote-debugging`
- Chrome a affiché et vous avez accepté l'invite de consentement d'attachement

Utilisation par l'agent :

- Utilisez `profile="user"` lorsque vous avez besoin de l'état du navigateur connecté de l'utilisateur.
- Si vous utilisez un profil de session existant personnalisé, transmettez ce nom de profil explicite.
- Préférez `profile="user"` à `profile="chrome-relay"` sauf si l'utilisateur
  souhaite explicitement le flux d'extension / d'attachement d'onglet.
- Choisissez ce mode uniquement lorsque l'utilisateur est présent devant l'ordinateur pour approuver l'invite de connexion.
- le Gateway ou l'hôte du nœud peut générer `npx chrome-devtools-mcp@latest --autoConnect`

Remarques :

- Cette méthode présente un risque plus élevé que le profil isolé `openclaw` car elle peut agir au sein de votre session de navigateur connectée.
- OpenClaw ne lance pas Chrome pour ce pilote ; il se connecte uniquement à une session existante.
- OpenClaw utilise ici le flux officiel MCP Chrome DevTools `--autoConnect`, et non le flux du port de débogage à distance du profil par défaut obsolète.
- Les captures d'écran de session existante prennent en charge les captures de page et les captures d'élément `--ref` à partir d'instantanés, mais pas les sélecteurs CSS `--element`.
- Le `wait --url` de session existante prend en charge les modèles exacts, de sous-chaîne et glob, tout comme les autres pilotes de navigateur. `wait --load networkidle` n'est pas encore pris en charge.
- Certaines fonctionnalités nécessitent toujours le relais d'extension ou le chemin du navigateur géré, telles que l'exportation PDF et l'interception des téléchargements.
- Laissez le relais en boucle locale (loopback-only) par défaut. Si le relais doit être accessible depuis un espace de noms réseau différent (par exemple Gateway dans WSL2, Chrome sur Windows), définissez `browser.relayBindHost` sur une adresse de liaison explicite telle que `0.0.0.0` tout en gardant le réseau environnant privé et authentifié.

Exemple WSL2 / cross-namespace :

```json5
{
  browser: {
    enabled: true,
    relayBindHost: "0.0.0.0",
    defaultProfile: "chrome-relay",
  },
}
```

## Garanties d'isolement

- **Répertoire de données utilisateur dédié** : ne touche jamais à votre profil de navigateur personnel.
- **Ports dédiés** : évite `9222` pour éviter les collisions avec les flux de travail de développement.
- **Contrôle déterministe des onglets** : ciblez les onglets par `targetId`, et non « le dernier onglet ».

## Sélection du navigateur

Lors du lancement local, OpenClaw choisit le premier disponible :

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

## Contrôle API (facultatif)

Pour les intégrations locales uniquement, le Gateway expose une petite API HTTP de bouclage :

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

Si l'authentification de la passerelle est configurée, les routes HTTP du navigateur nécessitent également une authentification :

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` ou authentification HTTP Basic avec ce mot de passe

### Condition requise pour Playwright

Certaines fonctionnalités (navigation/action/instantané IA/instantané de rôle, captures d'écran d'élément, PDF) nécessitent Playwright. Si Playwright n'est pas installé, ces points de terminaison renvoient une erreur 501 claire. Les instantanés ARIA et les captures d'écran de base fonctionnent toujours pour le Chrome géré par openclaw. Pour le pilote de relais de l'extension Chrome, les instantanés ARIA et les captures d'écran nécessitent Playwright.

Si vous voyez `Playwright is not available in this gateway build`, installez le package complet
Playwright (pas `playwright-core`) et redémarrez la passerelle, ou réinstallez
OpenClaw avec la prise en charge du navigateur.

#### Installation de Playwright Docker

Si votre Gateway s'exécute dans Docker, évitez `npx playwright` (conflits de redéfinition npm).
Utilisez plutôt la CLI fournie :

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

Pour conserver les téléchargements du navigateur, définissez `PLAYWRIGHT_BROWSERS_PATH` (par exemple,
`/home/node/.cache/ms-playwright`) et assurez-vous que `/home/node` est conservé via
`OPENCLAW_HOME_VOLUME` ou un montage de liaison. Voir [Docker](/fr/install/docker).

## Fonctionnement (interne)

Flux de haut niveau :

- Un petit **serveur de contrôle** accepte les requêtes HTTP.
- Il se connecte aux navigateurs basés sur Chromium (Chrome/Brave/Edge/Chromium) via **CDP**.
- Pour les actions avancées (clic/frappe/capture d'écran/PDF), il utilise **Playwright** par-dessus
  CDP.
- Lorsque Playwright est manquant, seules les opérations non-Playwright sont disponibles.

Cette conception maintient l'agent sur une interface stable et déterministe tout en vous permettant de permuter les navigateurs et profils locaux/distants.

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

- `upload` et `dialog` sont des appels d'**armement** ; exécutez-les avant le clic/appui
  qui déclenche le sélecteur/la boîte de dialogue.
- Les chemins de sortie de téléchargement et de trace sont limités aux racines temporaires OpenClaw :
  - traces : `/tmp/openclaw` (fallback : `${os.tmpdir()}/openclaw`)
  - téléchargements : `/tmp/openclaw/downloads` (fallback : `${os.tmpdir()}/openclaw/downloads`)
- Les chemins de téléversement sont limités à une racine de téléversements temporaire OpenClaw :
  - téléversements : `/tmp/openclaw/uploads` (fallback : `${os.tmpdir()}/openclaw/uploads`)
- `upload` peut également définir directement les entrées de fichiers via `--input-ref` ou `--element`.
- `snapshot` :
  - `--format ai` (par défaut lorsque Playwright est installé) : renvoie un instantané IA avec des références numériques (`aria-ref="<n>"`).
  - `--format aria` : renvoie l'arborescence d'accessibilité (aucune référence ; inspection uniquement).
  - `--efficient` (ou `--mode efficient`) : préréglage d'instantané de rôle compact (interactif + compact + profondeur + maxChars inférieur).
  - Config par défaut (tool/CLI uniquement) : définissez `browser.snapshotDefaults.mode: "efficient"` pour utiliser des instantanés efficaces lorsque l'appelant ne passe pas de mode (voir [Gateway configuration](/fr/gateway/configuration#browser-openclaw-managed-browser)).
  - Les options d'instantané de rôle (`--interactive`, `--compact`, `--depth`, `--selector`) forcent un instantané basé sur les rôles avec des références comme `ref=e12`.
  - `--frame "<iframe selector>"` limite les instantanés de rôle à une iframe (fonctionne avec les références de rôle comme `e12`).
  - `--interactive` affiche une liste plate et facile à choisir d'éléments interactifs (idéal pour piloter les actions).
  - `--labels` ajoute une capture d'écran limitée à la fenêtre d'affichage avec des étiquettes de référence superposées (imprime `MEDIA:<path>`).
- `click`/`type`/etc nécessitent un `ref` de `snapshot` (soit un `12` numérique, soit une référence de rôle `e12`).
  Les sélecteurs CSS ne sont volontairement pas pris en charge pour les actions.

## Instantanés et références

OpenClaw prend en charge deux styles d'« instantané » :

- **Instantané IA (références numériques)** : `openclaw browser snapshot` (par défaut ; `--format ai`)
  - Sortie : une capture de texte incluant des références numériques.
  - Actions : `openclaw browser click 12`, `openclaw browser type 23 "hello"`.
  - En interne, la référence est résolue via `aria-ref` de Playwright.

- **Capture de rôle (références de rôle comme `e12`)** : `openclaw browser snapshot --interactive` (ou `--compact`, `--depth`, `--selector`, `--frame`)
  - Sortie : une liste/arborescence basée sur les rôles avec `[ref=e12]` (et `[nth=1]` facultatif).
  - Actions : `openclaw browser click e12`, `openclaw browser highlight e12`.
  - En interne, la référence est résolue via `getByRole(...)` (plus `nth()` pour les doublons).
  - Ajoutez `--labels` pour inclure une capture d'écran de la fenêtre d'affichage avec des étiquettes `e12` superposées.

Comportement des refs :

- Les refs ne sont **pas stables d'une navigation à l'autre** ; en cas d'échec, réexécutez `snapshot` et utilisez une nouvelle ref.
- Si la capture de rôle a été effectuée avec `--frame`, les refs de rôle sont limitées à cette iframe jusqu'à la prochaine capture de rôle.

## Power-ups d'attente

Vous pouvez attendre plus que le temps ou le texte :

- Attendre une URL (globs pris en charge par Playwright) :
  - `openclaw browser wait --url "**/dash"`
- Attendre un état de chargement :
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

## Déboguer les workflows

Lorsqu'une action échoue (par exemple « pas visible », « violation du mode strict », « couvert ») :

1. `openclaw browser snapshot --interactive`
2. Utilisez `click <ref>` / `type <ref>` (préférez les références de rôle en mode interactif)
3. Si cela échoue toujours : `openclaw browser highlight <ref>` pour voir ce que Playwright cible
4. Si la page se comporte bizarrement :
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. Pour un débogage approfondi : enregistrez une trace :
   - `openclaw browser trace start`
   - reproduisez le problème
   - `openclaw browser trace stop` (imprime `TRACE:<path>`)

## Sortie JSON

`--json` est destiné aux scripts et aux outils structurés.

Exemples :

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

Les instantanés de rôle en JSON incluent `refs` ainsi qu'un petit bloc `stats` (lignes/caractères/réfs/interactif) afin que les outils puissent évaluer la taille et la densité de la charge utile.

## Contrôles d'état et d'environnement

Ceux-ci sont utiles pour les workflows du type « faire se comporter le site comme X » :

- Cookies : `cookies`, `cookies set`, `cookies clear`
- Stockage : `storage local|session get|set|clear`
- Hors ligne : `set offline on|off`
- En-têtes : `set headers --headers-json '{"X-Debug":"1"}'` (l'ancien `set headers --json '{"X-Debug":"1"}'` reste pris en charge)
- Authentification HTTP basique : `set credentials user pass` (ou `--clear`)
- Géolocalisation : `set geo <lat> <lon> --origin "https://example.com"` (ou `--clear`)
- Médias : `set media dark|light|no-preference|none`
- Fuseau horaire / langue : `set timezone ...`, `set locale ...`
- Appareil / fenêtre d'affichage :
  - `set device "iPhone 14"` (préréglages d'appareil Playwright)
  - `set viewport 1280 720`

## Sécurité et confidentialité

- Le profil de navigateur openclaw peut contenir des sessions connectées ; traitez-le comme sensible.
- `browser act kind=evaluate` / `openclaw browser evaluate` et `wait --fn`
  exécutent du JavaScript arbitraire dans le contexte de la page. L'injection de prompt peut orienter cela.
  Désactivez-le avec `browser.evaluateEnabled=false` si vous n'en avez pas besoin.
- Pour les notes de connexion et anti-bot (X/Twitter, etc.), consultez [Browser login + X/Twitter posting](/fr/tools/browser-login).
- Gardez l'hôte Gateway/node privé (loopback ou tailnet uniquement).
- Les points de terminaison CDP distants sont puissants ; placez-les dans un tunnel et protégez-les.

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

## Troubleshooting

Pour les problèmes spécifiques à Linux (notamment snap Chromium), consultez
[Browser troubleshooting](/fr/tools/browser-linux-troubleshooting).

Pour les configurations d'hôtes fractionnés WSL2 Gateway + Chrome Windows, consultez
[WSL2 + Windows + remote Chrome CDP troubleshooting](/fr/tools/browser-wsl2-windows-remote-cdp-troubleshooting).

## Outils de l'agent + fonctionnement du contrôle

L'agent obtient **un outil** pour l'automatisation du navigateur :

- `browser` — status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

Comment cela fonctionne :

- `browser snapshot` renvoie une arborescence d'interface utilisateur stable (AI ou ARIA).
- `browser act` utilise les ID du `ref` pour cliquer/tirer/glisser/sélectionner.
- `browser screenshot` capture les pixels (page entière ou élément).
- `browser` accepte :
  - `profile` pour choisir un profil de navigateur nommé (openclaw, chrome ou CDP distant).
  - `target` (`sandbox` | `host` | `node`) pour sélectionner l'emplacement du navigateur.
  - Dans les sessions sandboxed, `target: "host"` nécessite `agents.defaults.sandbox.browser.allowHostControl=true`.
  - Si `target` est omis : les sessions sandboxed ont par défaut la valeur `sandbox`, les sessions non-sandbox ont par défaut la valeur `host`.
  - Si un nœud capable de gérer un navigateur est connecté, l'outil peut lui acheminer automatiquement les requêtes, sauf si vous épinglez `target="host"` ou `target="node"`.

Cela permet de garder l'agent déterministe et d'éviter les sélecteurs fragiles.

import fr from "/components/footer/fr.mdx";

<fr />
