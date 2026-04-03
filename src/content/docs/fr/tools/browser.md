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
- Le profil `user` intégré se connecte à votre session Chrome réelle et connectée via Chrome MCP.

## Ce que vous obtenez

- Un profil de navigateur distinct nommé **openclaw** (accent orange par défaut).
- Contrôle déterministe des onglets (liste/ouverture/focus/fermeture).
- Actions de l'agent (cliquer/taper/faire glisser/sélectionner), instantanés, captures d'écran, PDF.
- Support multi-profil en option (`openclaw`, `work`, `remote`, ...).

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

Si `openclaw browser` est entièrement manquant, ou si l'agent indique que l'outil de navigation n'est pas disponible, passez à [Commande ou outil de navigateur manquant](/en/tools/browser#missing-browser-command-or-tool).

## Contrôle des plugins

L'outil `browser` par défaut est désormais un plugin groupé qui est activé par défaut. Cela signifie que vous pouvez le désactiver ou le remplacer sans supprimer le reste du système de plugins d'OpenClaw :

```json5
{
  plugins: {
    entries: {
      browser: {
        enabled: false,
      },
    },
  },
}
```

Désactivez le plugin groupé avant d'installer un autre plugin qui fournit le même nom d'outil `browser`. L'expérience de navigation par défaut nécessite les deux éléments :

- `plugins.entries.browser.enabled` non désactivé
- `browser.enabled=true`

Si vous désactivez uniquement le plugin, la CLI du navigateur groupée (`openclaw browser`), la méthode de passerelle (`browser.request`), l'outil de l'agent et le service de contrôle de navigateur par défaut disparaissent tous ensemble. Votre configuration `browser.*` reste intacte pour être réutilisée par un plugin de remplacement.

Le plugin de navigateur groupé possède également désormais l'implémentation du runtime du navigateur. Le cœur ne conserve que les helpers du Plugin SDK partagés ainsi que les ré-exportations de compatibilité pour les anciens chemins d'importation internes. En pratique, la suppression ou le remplacement du package du plugin de navigateur supprime l'ensemble des fonctionnalités du navigateur au lieu de laisser un deuxième runtime appartenant au cœur.

Les modifications de la configuration du navigateur nécessitent toujours un redémarrage de la Gateway afin que le plugin groupé puisse réenregistrer son service de navigateur avec les nouveaux paramètres.

## Commande ou outil de navigateur manquant

Si `openclaw browser` devient soudainement une commande inconnue après une mise à niveau, ou
que l'agent signale que l'outil de navigation est manquant, la cause la plus fréquente est une
liste `plugins.allow` restrictive qui n'inclut pas `browser`.

Exemple de configuration cassée :

```json5
{
  plugins: {
    allow: ["telegram"],
  },
}
```

Corrigez cela en ajoutant `browser` à la liste de autorisation des plugins :

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

Remarques importantes :

- `browser.enabled=true` ne suffit pas à lui seul lorsque `plugins.allow` est défini.
- `plugins.entries.browser.enabled=true` ne suffit pas non plus à lui seul lorsque `plugins.allow` est défini.
- `tools.alsoAllow: ["browser"]` ne charge **pas** le plugin de navigateur fourni. Il ajuste uniquement la stratégie de l'outil une fois que le plugin est déjà chargé.
- Si vous n'avez pas besoin d'une liste de autorisation de plugins restrictive, la suppression de `plugins.allow` rétablit également le comportement par défaut du navigateur fourni.

Symptômes typiques :

- `openclaw browser` est une commande inconnue.
- `browser.request` est manquant.
- L'agent signale que l'outil de navigation est indisponible ou manquant.

## Profils : `openclaw` vs `user`

- `openclaw` : navigateur géré et isolé (aucune extension requise).
- `user` : profil de connexion Chrome MCP intégré pour votre **vraie session Chrome connectée**.

Pour les appels d'outil de navigateur de l'agent :

- Par défaut : utilisez le navigateur isolé `openclaw`.
- Préférez `profile="user"` lorsque les sessions connectées existantes sont importantes et que l'utilisateur
  est devant l'ordinateur pour cliquer/approuver toute invite de connexion.
- `profile` est le remplacement explicite lorsque vous voulez un mode de navigateur spécifique.

Définissez `browser.defaultProfile: "openclaw"` si vous voulez le mode géré par défaut.

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
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
  },
}
```

Remarques :

- Le service de contrôle du navigateur se lie à loopback sur un port dérivé de `gateway.port`
  (par défaut : `18791`, soit la passerelle + 2).
- Si vous remplacez le port de la Gateway (`gateway.port` ou `OPENCLAW_GATEWAY_PORT`),
  les ports de navigateur dérivés se décalent pour rester dans la même « famille ».
- `cdpUrl` correspond par défaut au port CDP local géré lorsqu'il n'est pas défini.
- `remoteCdpTimeoutMs` s'applique aux vérifications d'accessibilité CDP distantes (non-boucle locale).
- `remoteCdpHandshakeTimeoutMs` s'applique aux vérifications d'accessibilité WebSocket CDP distantes.
- La navigation/ouverture d'onglet du navigateur est protégée contre les SSRF avant la navigation et vérifiée de nouveau au mieux sur l'URL `http(s)` finale après la navigation.
- En mode SSRF strict, la découverte/les sondes de points de terminaison CDP distants (`cdpUrl`, y compris les recherches `/json/version`) sont également vérifiés.
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` est défini par défaut sur `true` (modèle de réseau de confiance). Définissez-le sur `false` pour une navigation stricte publique uniquement.
- `browser.ssrfPolicy.allowPrivateNetwork` reste pris en charge comme un alias hérité pour la compatibilité.
- `attachOnly: true` signifie « ne jamais lancer de navigateur local ; s'attacher uniquement s'il est déjà en cours d'exécution ».
- `color` + `color` par profil teintent l'interface utilisateur du navigateur afin que vous puissiez voir quel profil est actif.
- Le profil par défaut est `openclaw` (navigateur autonome géré par OpenClaw). Utilisez `defaultProfile: "user"` pour opter pour le navigateur de l'utilisateur connecté.
- Ordre de détection automatique : navigateur par défaut du système s'il est basé sur Chromium ; sinon Chrome → Brave → Edge → Chromium → Chrome Canary.
- Les profils `openclaw` locaux attribuent automatiquement `cdpPort`/`cdpUrl` — ne définissez ces valeurs que pour le CDP distant.
- `driver: "existing-session"` utilise Chrome DevTools MCP au lieu du CDP brut. Ne définissez pas `cdpUrl` pour ce pilote.
- Définissez `browser.profiles.<name>.userDataDir` lorsqu'un profil de session existant doit s'attacher à un profil utilisateur Chromium non par défaut tel que Brave ou Edge.

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

- **Contrôle local (par défaut) :** le Gateway démarre le service de contrôle en boucle locale et peut lancer un navigateur local.
- **Contrôle distant (hôte de nœud) :** exécutez un hôte de nœud sur la machine qui possède le navigateur ; le Gateway proxy les actions du navigateur vers celui-ci.
- **CDP distant :** définissez `browser.profiles.<name>.cdpUrl` (ou `browser.cdpUrl`) pour
  vous connecter à un navigateur distant basé sur Chromium. Dans ce cas, OpenClaw ne lancera pas de navigateur local.

Les URL CDP distantes peuvent inclure une authentification :

- Jetons de requête (par ex., `https://provider.example?token=<token>`)
- Authentification HTTP Basic (par ex., `https://user:pass@provider.example`)

OpenClaw préserve l'authentification lors de l'appel des points de terminaison `/json/*` et lors de la connexion
au WebSocket CDP. Privilégiez les variables d'environnement ou les gestionnaires de secrets pour
les jetons plutôt que de les commiter dans les fichiers de configuration.

## Proxy de navigateur de nœud (par défaut sans configuration)

Si vous exécutez un **hôte de nœud** sur la machine qui possède votre navigateur, OpenClaw peut
router automatiquement les appels d'outil de navigateur vers ce nœud sans aucune configuration supplémentaire du navigateur.
C'est le chemin par défaut pour les passerelles distantes.

Notes :

- L'hôte de nœud expose son serveur de contrôle de navigateur local via une **commande de proxy**.
- Les profils proviennent de la propre configuration `browser.profiles` du nœud (identique au mode local).
- `nodeHost.browserProxy.allowProfiles` est facultatif. Laissez-le vide pour le comportement hérité par défaut : tous les profils configurés restent accessibles via le proxy, y compris les routes de création/suppression de profils.
- Si vous définissez `nodeHost.browserProxy.allowProfiles`, OpenClaw le traite comme une frontière de moindre privilège : seuls les profils autorisés peuvent être ciblés, et les routes de création/suppression persistantes de profils sont bloquées sur la surface du proxy.
- Désactivez si vous ne le souhaitez pas :
  - Sur le nœud : `nodeHost.browserProxy.enabled=false`
  - Sur la passerelle : `gateway.nodes.browser.mode="off"`

## Browserless (CDP distant hébergé)

[Browserless](https://browserless.io) est un service Chromium hébergé qui expose
les URL de connexion CDP via HTTPS et WebSocket. OpenClaw peut utiliser l'une ou l'autre forme, mais
pour un profil de navigateur distant, l'option la plus simple est l'URL WebSocket directe
depuis la documentation de connexion de Browserless.

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
        cdpUrl: "wss://production-sfo.browserless.io?token=<BROWSERLESS_API_KEY>",
        color: "#00AA00",
      },
    },
  },
}
```

Notes :

- Remplacez `<BROWSERLESS_API_KEY>` par votre véritable jeton Browserless.
- Choisissez le point de terminaison de région qui correspond à votre compte Browserless (voir leur documentation).
- Si Browserless vous fournit une URL de base HTTPS, vous pouvez soit la convertir en
  `wss://` pour une connexion CDP directe soit conserver l'URL HTTPS et laisser OpenClaw
  découvrir `/json/version`.

## Fournisseurs CDP WebSocket directs

Certains services de navigateur hébergés exposent un point de terminaison **WebSocket direct** plutôt que
la découverte CDP standard basée sur HTTP (`/json/version`). OpenClaw prend en charge les deux :

- **Points de terminaison HTTP(S)** — OpenClaw appelle `/json/version` pour découvrir l'URL
  du débogueur WebSocket, puis se connecte.
- **Points de terminaison WebSocket** (`ws://` / `wss://`) — OpenClaw se connecte directement,
  en ignorant `/json/version`. Utilisez ceci pour des services tels que
  [Browserless](https://browserless.io),
  [Browserbase](https://www.browserbase.com), ou tout fournisseur qui vous fournit une
  URL WebSocket.

### Browserbase

[Browserbase](https://www.browserbase.com) est une plate-forme cloud pour exécuter des navigateurs
headless avec résolution intégrée de CAPTCHA, mode furtif et proxys résidentiels.

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
  depuis le [tableau de bord Overview](https://www.browserbase.com/overview).
- Remplacez `<BROWSERBASE_API_KEY>` par votre vraie clé API Browserbase.
- Browserbase crée automatiquement une session de navigateur lors de la connexion WebSocket, donc aucune
  étape de création manuelle de session n'est nécessaire.
- La offre gratuite permet une session simultanée et une heure de navigateur par mois.
  Voir [la tarification](https://www.browserbase.com/pricing) pour les limites des plans payants.
- Consultez la [documentation Browserbase](https://docs.browserbase.com) pour une référence complète de l'API,
  les guides SDK et les exemples d'intégration.

## Sécurité

Idées clés :

- Le contrôle du navigateur est en boucle locale uniquement ; l'accès transite par l'authentification du Gateway ou le jumelage de nœuds.
- Si le contrôle du navigateur est activé et qu'aucune authentification n'est configurée, OpenClaw génère automatiquement `gateway.auth.token` au démarrage et le persiste dans la configuration.
- Gardez le Gateway et tous les hôtes de nœuds sur un réseau privé (Tailscale) ; évitez l'exposition publique.
- Traitez les URL/jetons CDP distants comme des secrets ; privilégiez les variables d'environnement ou un gestionnaire de secrets.

Conseils pour le CDP distant :

- Privilégiez les points de terminaison chiffrés (HTTPS ou WSS) et les jetons à courte durée de vie dans la mesure du possible.
- Évitez d'intégrer directement des jetons à longue durée de vie dans les fichiers de configuration.

## Profils (multi-navigateur)

OpenClaw prend en charge plusieurs profils nommés (configurations de routage). Les profils peuvent être :

- **openclaw-managed** : une instance de navigateur basée sur Chromium dédiée avec son propre répertoire de données utilisateur + port CDP
- **remote** : une URL CDP explicite (navigateur basé sur Chromium s'exécutant ailleurs)
- **existing session** : votre profil Chrome existant via Chrome DevTools MCP auto-connect

Valeurs par défaut :

- Le profil `openclaw` est créé automatiquement s'il est manquant.
- Le profil `user` est intégré pour l'attachement de session existante Chrome MCP.
- Les profils de session existante sont opt-in au-delà de `user` ; créez-les avec `--driver existing-session`.
- Les ports CDP locaux sont alloués à partir de **18800–18899** par défaut.
- La suppression d'un profil déplace son répertoire de données local vers la Corbeille.

Tous les points de terminaison de contrôle acceptent `?profile=<name>` ; la CLI utilise `--browser-profile`.

## Session existante via Chrome DevTools MCP

OpenClaw peut également s'attacher à un profil de navigateur basé sur Chromium en cours d'exécution via le
serveur MCP officiel Chrome DevTools. Cela réutilise les onglets et l'état de connexion
ouverts dans ce profil de navigateur.

Références officielles pour l'arrière-plan et la configuration :

- [Chrome pour les développeurs : Utiliser Chrome DevTools MCP avec votre session de navigateur](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)

Profil intégré :

- `user`

Optionnel : créez votre propre profil de session existante personnalisé si vous souhaitez un
nom, une couleur ou un répertoire de données de navigateur différent.

Comportement par défaut :

- Le profil intégré `user` utilise l'auto-connexion Chrome MCP, qui cible le
  profil local par défaut de Google Chrome.

Utilisez `userDataDir` pour Brave, Edge, Chromium, ou un profil Chrome non par défaut :

```json5
{
  browser: {
    profiles: {
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
    },
  },
}
```

Ensuite, dans le navigateur correspondant :

1. Ouvrez la page d'inspection de ce navigateur pour le débogage à distance.
2. Activez le débogage à distance.
3. Gardez le navigateur en cours d'exécution et approuvez la invite de connexion lorsque OpenClaw se connecte.

Pages d'inspection courantes :

- Chrome : `chrome://inspect/#remote-debugging`
- Brave : `brave://inspect/#remote-debugging`
- Edge : `edge://inspect/#remote-debugging`

Test de fumée d'attachement en direct :

```bash
openclaw browser --browser-profile user start
openclaw browser --browser-profile user status
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot --format ai
```

À quoi ressemble le succès :

- `status` affiche `driver: existing-session`
- `status` affiche `transport: chrome-mcp`
- `status` affiche `running: true`
- `tabs` répertorie vos onglets de navigateur déjà ouverts
- `snapshot` renvoie les références de l'onglet en direct sélectionné

Ce qu'il faut vérifier si l'attachement ne fonctionne pas :

- le navigateur Chromium cible est en version `144+`
- le débogage à distance est activé dans la page d'inspection de ce navigateur
- le navigateur a affiché et vous avez accepté l'invite de consentement d'attachement
- `openclaw doctor` migre l'ancienne configuration de navigateur basée sur les extensions et vérifie que
  Chrome est installé localement pour les profils de connexion automatique par défaut, mais il ne peut
  activer le débogage à distance côté navigateur pour vous

Utilisation par l'agent :

- Utilisez `profile="user"` lorsque vous avez besoin de l'état du navigateur connecté de l'utilisateur.
- Si vous utilisez un profil de session existant personnalisé, passez ce nom de profil explicite.
- Ne choisissez ce mode que lorsque l'utilisateur est devant l'ordinateur pour approuver l'invite
  d'attachement.
- le Gateway ou l'hôte du nœud peut générer `npx chrome-devtools-mcp@latest --autoConnect`

Notes :

- Ce chemin présente un risque plus élevé que le profil isolé `openclaw` car il peut
  agir au sein de votre session de navigateur connectée.
- OpenClaw ne lance pas le navigateur pour ce pilote ; il s'attache uniquement à
  une session existante.
- OpenClaw utilise ici le flux MCP officiel de Chrome DevTools `--autoConnect`. Si
  `userDataDir` est défini, OpenClaw le transmet pour cibler ce répertoire
  explicite de données utilisateur Chromium.
- Les captures d'écran de session existante prennent en charge les captures de page et les captures d'élément
  `--ref` à partir d'instantanés, mais pas les sélecteurs CSS `--element`.
- La `wait --url` de session existante prend en charge les modèles exacts, de sous-chaîne et glob,
  tout comme les autres pilotes de navigateur. `wait --load networkidle` n'est pas encore pris en charge.
- Certaines fonctionnalités nécessitent encore le chemin du navigateur géré, telles que l'exportation PDF et
  l'interception des téléchargements.
- La session existante est locale à l'hôte. Si Chrome se trouve sur une machine différente ou un
  espace de noms réseau différent, utilisez plutôt le CDP distant ou un hôte de nœud.

## Garanties d'isolement

- **Répertoire de données utilisateur dédié** : ne touche jamais à votre profil de navigateur personnel.
- **Ports dédiés** : évite `9222` pour empêcher les collisions avec les flux de travail de développement.
- **Contrôle déterministe des onglets** : cibler les onglets par `targetId`, et non « dernier onglet ».

## Sélection du navigateur

Lors d'un lancement local, OpenClaw choisit le premier disponible :

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

Vous pouvez remplacer cela avec `browser.executablePath`.

Plateformes :

- macOS : vérifie `/Applications` et `~/Applications`.
- Linux : recherche `google-chrome`, `brave`, `microsoft-edge`, `chromium`, etc.
- Windows : vérifie les emplacements d'installation courants.

## API de contrôle (optionnelle)

Pour les intégrations locales uniquement, le Gateway expose une petite API HTTP de bouclage (loopback) API :

- Statut/démarrage/arrêt : `GET /`, `POST /start`, `POST /stop`
- Onglets : `GET /tabs`, `POST /tabs/open`, `POST /tabs/focus`, `DELETE /tabs/:targetId`
- Instantané/capture d'écran : `GET /snapshot`, `POST /screenshot`
- Actions : `POST /navigate`, `POST /act`
- Crochets (hooks) : `POST /hooks/file-chooser`, `POST /hooks/dialog`
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

### Configuration requise pour Playwright

Certaines fonctionnalités (navigation/action/instantané IA/instantané de rôle, captures d'écran d'éléments, PDF) nécessitent
Playwright. Si Playwright n'est pas installé, ces points de terminaison renvoient une erreur 501
claire. Les instantanés ARIA et les captures d'écran de base fonctionnent toujours pour le Chrome géré par OpenClaw.

Si vous voyez `Playwright is not available in this gateway build`, installez le package complet
Playwright (pas `playwright-core`) et redémarrez la passerelle, ou réinstallez
OpenClaw avec la prise en charge du navigateur.

#### Installation de Playwright sur Docker

Si votre Gateway s'exécute dans Docker, évitez `npx playwright` (conflits de remplacement npm).
Utilisez plutôt l'interface de ligne de commande (CLI) incluse :

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

Pour conserver les téléchargements du navigateur, définissez `PLAYWRIGHT_BROWSERS_PATH` (par exemple,
`/home/node/.cache/ms-playwright`) et assurez-vous que `/home/node` est conservé via
`OPENCLAW_HOME_VOLUME` ou un montage de liaison. Voir [Docker](/en/install/docker).

## Fonctionnement (interne)

Flux de haut niveau :

- Un petit **serveur de contrôle** accepte les requêtes HTTP.
- Il se connecte aux navigateurs basés sur Chromium (Chrome/Brave/Edge/Chromium) via **CDP**.
- Pour les actions avancées (clic/frappe/instantané/PDF), il utilise **Playwright** par-dessus
  CDP.
- Lorsque Playwright est manquant, seules les opérations non Playwright sont disponibles.

Cette conception maintient l'agent sur une interface stable et déterministe tout en vous permettant
d'échanger des navigateurs et des profils locaux/distants.

## Référence rapide de l'interface de ligne de commande

Toutes les commandes acceptent `--browser-profile <name>` pour cibler un profil spécifique.
Toutes les commandes acceptent également `--json` pour une sortie lisible par machine (charges utiles stables).

Bases :

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

- `upload` et `dialog` sont des appels de **préparation** ; exécutez-les avant le clic/l'appui
  qui déclenche le sélecteur/la boîte de dialogue.
- Les chemins de téléchargement et de sortie de trace sont limités aux racines temporaires OpenClaw :
  - traces : `/tmp/openclaw` (repli : `${os.tmpdir()}/openclaw`)
  - téléchargements : `/tmp/openclaw/downloads` (alternative : `${os.tmpdir()}/openclaw/downloads`)
- Les chemins de téléchargement sont limités à une racine de téléchargements temporaires OpenClaw :
  - téléchargements : `/tmp/openclaw/uploads` (alternative : `${os.tmpdir()}/openclaw/uploads`)
- `upload` peut également définir directement les entrées de fichiers via `--input-ref` ou `--element`.
- `snapshot` :
  - `--format ai` (par défaut lorsque Playwright est installé) : renvoie un instantané IA avec des références numériques (`aria-ref="<n>"`).
  - `--format aria` : renvoie l'arbre d'accessibilité (pas de références ; inspection uniquement).
  - `--efficient` (ou `--mode efficient`) : préréglage d'instantané de rôle compact (interactif + compact + profondeur + maxChars inférieur).
  - Config par défaut (tool/CLI uniquement) : définissez `browser.snapshotDefaults.mode: "efficient"` pour utiliser des instantanés efficaces lorsque l'appelant ne transmet pas de mode (voir [Gateway configuration](/en/gateway/configuration-reference#browser)).
  - Les options d'instantané de rôle (`--interactive`, `--compact`, `--depth`, `--selector`) forcent un instantané basé sur les rôles avec des références comme `ref=e12`.
  - `--frame "<iframe selector>"` limite la portée des instantanés de rôle à une iframe (se combine avec des références de rôle comme `e12`).
  - `--interactive` produit une liste plate et facile à choisir d'éléments interactifs (idéal pour piloter les actions).
  - `--labels` ajoute une capture d'écran de la zone d'affichage uniquement avec des étiquettes de référence superposées (imprime `MEDIA:<path>`).
- `click`/`type`/etc nécessitent une `ref` issue de `snapshot` (soit une référence numérique `12` soit une référence de rôle `e12`).
  Les sélecteurs CSS ne sont volontairement pas pris en charge pour les actions.

## Instantanés et références

OpenClaw prend en charge deux styles d'« instantané » :

- **Instantané IA (références numériques)** : `openclaw browser snapshot` (par défaut ; `--format ai`)
  - Sortie : un instantané textuel qui inclut des références numériques.
  - Actions : `openclaw browser click 12`, `openclaw browser type 23 "hello"`.
  - En interne, la référence est résolue via le `aria-ref` de Playwright.

- **Snapshot de rôle (références de rôle comme `e12`)** : `openclaw browser snapshot --interactive` (ou `--compact`, `--depth`, `--selector`, `--frame`)
  - Sortie : une liste/arborescence basée sur les rôles avec `[ref=e12]` (et `[nth=1]` facultatif).
  - Actions : `openclaw browser click e12`, `openclaw browser highlight e12`.
  - En interne, la référence est résolue via `getByRole(...)` (plus `nth()` pour les doublons).
  - Ajoutez `--labels` pour inclure une capture d'écran de la fenêtre d'affichage avec des étiquettes `e12` superposées.

Comportement de la référence :

- Les références **ne sont pas stables lors des navigations** ; en cas d'échec, relancez `snapshot` et utilisez une nouvelle référence.
- Si le snapshot de rôle a été pris avec `--frame`, les références de rôle sont limitées à cette iframe jusqu'au prochain snapshot de rôle.

## Améliorations d'attente (Wait power-ups)

Vous pouvez attendre plus que le temps/le texte :

- Attendre une URL (globs pris en charge par Playwright) :
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

## Déboguer les workflows

Lorsqu'une action échoue (par exemple, « non visible », « violation du mode strict », « couvert ») :

1. `openclaw browser snapshot --interactive`
2. Utilisez `click <ref>` / `type <ref>` (préférez les références de rôle en mode interactif)
3. Si cela échoue toujours : `openclaw browser highlight <ref>` pour voir ce que Playwright cible
4. Si la page se comporte bizarrement :
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. Pour un débogage approfondi : enregistrez une trace :
   - `openclaw browser trace start`
   - reproduire le problème
   - `openclaw browser trace stop` (imprime `TRACE:<path>`)

## Sortie JSON

`--json` est destiné au scriptage et aux outils structurés.

Exemples :

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

Les instantanés de rôle au format JSON incluent `refs` ainsi qu'un petit bloc `stats` (lignes/caractères/réfs/interactif) afin que les outils puissent évaluer la taille et la densité de la charge utile.

## Contrôles d'état et d'environnement

Ceux-ci sont utiles pour les workflows du type « faire se comporter le site comme X » :

- Cookies : `cookies`, `cookies set`, `cookies clear`
- Stockage : `storage local|session get|set|clear`
- Hors ligne : `set offline on|off`
- En-têtes : `set headers --headers-json '{"X-Debug":"1"}'` (l'ancien `set headers --json '{"X-Debug":"1"}'` reste pris en charge)
- Authentification basique HTTP : `set credentials user pass` (ou `--clear`)
- Géolocalisation : `set geo <lat> <lon> --origin "https://example.com"` (ou `--clear`)
- Médias : `set media dark|light|no-preference|none`
- Fuseau horaire / langue : `set timezone ...`, `set locale ...`
- Appareil / viewport :
  - `set device "iPhone 14"` (préréglages d'appareils Playwright)
  - `set viewport 1280 720`

## Sécurité et confidentialité

- Le profil de navigateur openclaw peut contenir des sessions connectées ; traitez-le comme sensible.
- `browser act kind=evaluate` / `openclaw browser evaluate` et `wait --fn`
  exécutent du JavaScript arbitraire dans le contexte de la page. L'injection de prompt peut
  influencer cela. Désactivez-le avec `browser.evaluateEnabled=false` si vous n'en avez pas besoin.
- Pour les notes de connexion et anti-bot (X/Twitter, etc.), consultez [Connexion au navigateur + publication sur X/Twitter](/en/tools/browser-login).
- Gardez l'hôte du Gateway/nœud privé (boucle locale ou exclusif au tailnet).
- Les points de terminaison CDP distants sont puissants ; utilisez un tunnel et protégez-les.

Exemple en mode strict (bloquer par défaut les destinations privées/interne) :

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

Pour les problèmes spécifiques à Linux (surtout snap Chromium), consultez
[Dépannage du navigateur](/en/tools/browser-linux-troubleshooting).

Pour les configurations split-host avec WSL2 Gateway + Chrome Windows, consultez
[Dépannage WSL2 + Windows + CDP Chrome distant](/en/tools/browser-wsl2-windows-remote-cdp-troubleshooting).

## Outils de l'agent + fonctionnement du contrôle

L'agent dispose d'**un seul outil** pour l'automatisation du navigateur :

- `browser` — status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

Comment cela correspond :

- `browser snapshot` renvoie une arborescence d'interface utilisateur stable (IA ou ARIA).
- `browser act` utilise les ID `ref` du snapshot pour cliquer/taper/glisser/sélectionner.
- `browser screenshot` capture les pixels (page entière ou élément).
- `browser` accepte :
  - `profile` pour choisir un profil de navigateur nommé (openclaw, chrome ou CDP distant).
  - `target` (`sandbox` | `host` | `node`) pour sélectionner l'emplacement du navigateur.
  - Dans les sessions sandboxed, `target: "host"` nécessite `agents.defaults.sandbox.browser.allowHostControl=true`.
  - Si `target` est omis : les sessions sandboxed utilisent `sandbox` par défaut, les sessions hors sandbox utilisent `host` par défaut.
  - Si un nœud compatible navigateur est connecté, l'outil peut y être acheminé automatiquement, sauf si vous épinglez `target="host"` ou `target="node"`.

Cela permet de garder l'agent déterministe et d'éviter les sélecteurs fragiles.

## Connexes

- [Aperçu des outils](/en/tools) — tous les outils d'agent disponibles
- [Sandboxing](/en/gateway/sandboxing) — contrôle du navigateur dans les environnements sandboxed
- [Sécurité](/en/gateway/security) — risques et durcissement du contrôle du navigateur
