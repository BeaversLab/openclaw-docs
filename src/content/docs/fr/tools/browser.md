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
- Le profil `user` intégré se connecte à votre vraie session Chrome connectée via Chrome MCP.

## Ce que vous obtenez

- Un profil de navigateur distinct nommé **openclaw** (accent orange par défaut).
- Contrôle déterministe des onglets (liste/ouverture/focus/fermeture).
- Actions de l'agent (cliquer/taper/faire glisser/sélectionner), instantanés, captures d'écran, PDF.
- Support multiprofil en option (`openclaw`, `work`, `remote`, ...).

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

Si `openclaw browser` manque entièrement, ou si l'agent indique que l'outil de navigateur n'est pas disponible, passez à [Commande ou outil de navigateur manquant](/en/tools/browser#missing-browser-command-or-tool).

## Contrôle des plugins

L'outil `browser` par défaut est désormais un plugin groupé qui est activé par défaut. Cela signifie que vous pouvez le désactiver ou le remplacer sans supprimer le reste du système de plugins de OpenClaw :

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

Désactivez le plugin groupé avant d'installer un autre plugin qui fournit le même nom d'outil `browser`. L'expérience de navigateur par défaut nécessite les deux éléments :

- `plugins.entries.browser.enabled` non désactivé
- `browser.enabled=true`

Si vous désactivez uniquement le plugin, le CLI du navigateur groupé (`openclaw browser`), la méthode de passerelle (`browser.request`), l'outil de l'agent et le service de contrôle de navigateur par défaut disparaissent tous ensemble. Votre configuration `browser.*` reste intacte pour qu'un plugin de remplacement puisse la réutiliser.

Le plugin de navigateur groupé possède également désormais l'implémentation du runtime du navigateur. Le cœur ne conserve que les helpers du Plugin SDK partagés ainsi que les ré-exportations de compatibilité pour les anciens chemins d'importation internes. En pratique, la suppression ou le remplacement du package du plugin de navigateur supprime l'ensemble des fonctionnalités du navigateur au lieu de laisser un deuxième runtime appartenant au cœur.

Les modifications de la configuration du navigateur nécessitent toujours un redémarrage de la Gateway afin que le plugin groupé puisse réenregistrer son service de navigateur avec les nouveaux paramètres.

## Commande ou outil de navigateur manquant

Si `openclaw browser` devient soudainement une commande inconnue après une mise à niveau, ou si l'agent signale que l'outil de navigateur est manquant, la cause la plus fréquente est une liste `plugins.allow` restrictive qui n'inclut pas `browser`.

Exemple de configuration cassée :

```json5
{
  plugins: {
    allow: ["telegram"],
  },
}
```

Corrigez cela en ajoutant `browser` à la liste d'autorisation des plugins :

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
- `tools.alsoAllow: ["browser"]` ne charge **pas** le plugin de navigateur groupé. Il ajuste uniquement la stratégie d'outils après que le plugin a été chargé.
- Si vous n'avez pas besoin d'une liste d'autorisation de plugins restrictive, la suppression de `plugins.allow` restaure également le comportement par défaut du navigateur inclus.

Symptômes typiques :

- `openclaw browser` est une commande inconnue.
- `browser.request` est manquant.
- L'agent signale que l'outil de navigation est indisponible ou manquant.

## Profils : `openclaw` vs `user`

- `openclaw` : navigateur géré et isolé (aucune extension requise).
- `user` : profil d'attachement Chrome MCP intégré pour votre **vrai Chrome connecté**
  session.

Pour les appels d'outil de navigateur de l'agent :

- Par défaut : utilisez le navigateur isolé `openclaw`.
- Préférez `profile="user"` lorsque les sessions connectées existantes sont importantes et que l'utilisateur
  est devant l'ordinateur pour cliquer/approuver toute invite d'attachement.
- `profile` est le remplacement explicite lorsque vous souhaitez un mode de navigateur spécifique.

Définissez `browser.defaultProfile: "openclaw"` si vous souhaitez le mode géré par défaut.

## Configuration

Les paramètres du navigateur se trouvent dans `~/.openclaw/openclaw.json`.

```json5
{
  browser: {
    enabled: true, // default: true
    ssrfPolicy: {
      // dangerouslyAllowPrivateNetwork: true, // opt in only for trusted private-network access
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

- Le service de contrôle du navigateur se lie au loopback sur un port dérivé de `gateway.port`
  (par défaut : `18791`, soit gateway + 2).
- Si vous remplacez le port de la Gateway (`gateway.port` ou `OPENCLAW_GATEWAY_PORT`),
  les ports de navigateur dérivés se décalent pour rester dans la même « famille ».
- `cdpUrl` correspond par défaut au port CDP local géré lorsqu'il n'est pas défini.
- `remoteCdpTimeoutMs` s'applique aux vérifications d'accessibilité CDP à distance (non loopback).
- `remoteCdpHandshakeTimeoutMs` s'applique aux vérifications d'accessibilité WebSocket CDP à distance.
- La navigation/ouverture d'onglet du navigateur est protégée contre les SSRF avant la navigation et vérifiée au mieux sur l'URL finale `http(s)` après la navigation.
- En mode SSRF strict, la découverte/les sondes de points de terminaison CDP à distance (`cdpUrl`, y compris les recherches `/json/version`) sont également vérifiées.
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` est désactivé par défaut. Définissez-le sur `true` uniquement lorsque vous faites confiance intentionnellement à l'accès au navigateur sur le réseau privé.
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

Le comportement d'arrêt diffère selon le mode de profil :

- profils gérés localement : `openclaw browser stop` arrête le processus de navigateur lancé par OpenClaw
- profils attach-only et CDP distants : `openclaw browser stop` ferme la session de contrôle active et libère les remplacements d'émulation Playwright/CDP (viewport, jeu de couleurs, langue, fuseau horaire, mode hors ligne et états similaires), même si aucun processus de navigateur n'a été lancé par OpenClaw

Les URL CDP distantes peuvent inclure une authentification :

- Jetons de requête (par exemple, `https://provider.example?token=<token>`)
- Authentification HTTP Basic (par exemple, `https://user:pass@provider.example`)

OpenClaw préserve l'authentification lors de l'appel des points de terminaison `/json/*` et lors de la connexion au WebSocket CDP. Privilégiez les variables d'environnement ou les gestionnaires de secrets pour les jetons plutôt que de les committing dans les fichiers de configuration.

## Proxy de navigateur de nœud (par défaut sans configuration)

Si vous exécutez un **hôte de nœud** sur la machine qui contient votre navigateur, OpenClaw peut acheminer automatiquement les appels de l'outil de navigateur vers ce nœud sans configuration supplémentaire. C'est le chemin par défaut pour les passerelles distantes.

Notes :

- L'hôte de nœud expose son serveur de contrôle de navigateur local via une **commande proxy**.
- Les profils proviennent de la propre configuration `browser.profiles` du nœud (identique au mode local).
- `nodeHost.browserProxy.allowProfiles` est facultatif. Laissez-le vide pour le comportement hérité par défaut : tous les profils configurés restent accessibles via le proxy, y compris les routes de création/suppression de profils.
- Si vous définissez `nodeHost.browserProxy.allowProfiles`, OpenClaw le considère comme une limite de moindre privilège : seuls les profils autorisés peuvent être ciblés, et les routes de création/suppression de profils persistants sont bloquées sur la surface du proxy.
- Désactivez-le si vous ne le souhaitez pas :
  - Sur le nœud : `nodeHost.browserProxy.enabled=false`
  - Sur la passerelle : `gateway.nodes.browser.mode="off"`

## Browserless (CDP distant hébergé)

[Browserless](https://browserless.io) est un service Chromium hébergé qui expose
les URL de connexion CDP via HTTPS et WebSocket. OpenClaw peut utiliser l'une ou l'autre forme, mais
pour un profil de navigateur distant, l'option la plus simple est l'URL WebSocket directe
provenant de la documentation de connexion de Browserless.

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

- Remplacez `<BROWSERLESS_API_KEY>` par votre vrai jeton Browserless.
- Choisissez le point de terminaison régional qui correspond à votre compte Browserless (voir leur documentation).
- Si Browserless vous fournit une URL de base HTTPS, vous pouvez soit la convertir en `wss://` pour une connexion CDP directe, soit conserver l'URL HTTPS et laisser OpenClaw découvrir `/json/version`.

## Fournisseurs WebSocket CDP directs

Certains services de navigateur hébergés exposent un point de terminaison **WebSocket direct** plutôt que la découverte CDP standard basée sur HTTP (`/json/version`). OpenClaw prend en charge les deux :

- **Points de terminaison HTTP(S)** — OpenClaw appelle `/json/version` pour découvrir l'URL du débogueur WebSocket, puis se connecte.
- **Points de terminaison WebSocket** (`ws://` / `wss://`) — OpenClaw se connecte directement,
  en ignorant `/json/version`. Utilisez ceci pour des services tels que
  [Browserless](https://browserless.io),
  [Browserbase](https://www.browserbase.com), ou tout fournisseur qui vous fournit une
  URL WebSocket.

### Browserbase

[Browserbase](https://www.browserbase.com) est une plate-forme cloud pour exécuter
des navigateurs headless avec résolution intégrée de CAPTCHA, mode furtif et proxies
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

- [Inscrivez-vous](https://www.browserbase.com/sign-up) et copiez votre **Clé API**
  depuis le [tableau de bord Vue d'ensemble](https://www.browserbase.com/overview).
- Remplacez `<BROWSERBASE_API_KEY>` par votre vraie clé API Browserbase.
- Browserbase crée automatiquement une session de navigateur lors de la connexion WebSocket, aucune étape de création de session manuelle n'est donc nécessaire.
- Le niveau gratuit autorise une session simultanée et une heure de navigateur par mois.
  Voir la [tarification](https://www.browserbase.com/pricing) pour les limites des plans payants.
- Consultez la [documentation Browserbase](https://docs.browserbase.com) pour une référence complète de l'API,
  les guides SDK et les exemples d'intégration.

## Sécurité

Points clés :

- Le contrôle du navigateur est en boucle locale uniquement ; l'accès transite par l'authentification ou le jumelage de nœud du Gateway.
- L'HTTP API du navigateur en boucle locale autonome utilise **uniquement l'authentification par secret partagé** : authentification du porteur par jeton de passerelle, `x-openclaw-password`, ou authentification HTTP Basic avec le mot de passe de la passerelle configuré.
- Les en-têtes d'identité Tailscale Serve et `gateway.auth.mode: "trusted-proxy"` n'**authentifient pas** cette API de navigateur en boucle locale autonome.
- Si le contrôle du navigateur est activé et qu'aucune authentification par secret partagé n'est configurée, OpenClaw
  génère automatiquement `gateway.auth.token` au démarrage et le persiste dans la configuration.
- OpenClaw ne génère **pas** automatiquement ce jeton lorsque `gateway.auth.mode` est
  déjà `password`, `none`, ou `trusted-proxy`.
- Gardez le Gateway et tous les hôtes de nœuds sur un réseau privé (Tailscale) ; évitez l'exposition publique.
- Traitez les URL/jetons CDP distants comme des secrets ; préférez les env vars ou un gestionnaire de secrets.

Conseils pour le CDP distant :

- Préférez les points de terminaison chiffrés (HTTPS ou WSS) et les jetons à courte durée de vie dans la mesure du possible.
- Évitez d'intégrer directement des jetons à longue durée de vie dans les fichiers de configuration.

## Profils (multi-navigateur)

OpenClaw prend en charge plusieurs profils nommés (configurations de routage). Les profils peuvent être :

- **openclaw-managed** : une instance de navigateur basée sur Chromium dédiée avec son propre répertoire de données utilisateur + port CDP
- **remote** : une URL CDP explicite (navigateur basé sur Chromium s'exécutant ailleurs)
- **existing session** : votre profil Chrome existant via Chrome DevTools MCP en connexion automatique

Valeurs par défaut :

- Le profil `openclaw` est créé automatiquement s'il est manquant.
- Le profil `user` est intégré pour l'attachement de session existante Chrome MCP.
- Les profils de session existante sont opt-in au-delà de `user` ; créez-les avec `--driver existing-session`.
- Les ports CDP locaux sont alloués à partir de **18800–18899** par défaut.
- La suppression d'un profil déplace son répertoire de données local vers la Corbeille.

Tous les points de terminaison de contrôle acceptent `?profile=<name>` ; la CLI utilise `--browser-profile`.

## Session existante via Chrome DevTools MCP

OpenClaw peut également s'attacher à un profil de navigateur basé sur Chromium en cours d'exécution via le
serveur officiel Chrome DevTools MCP. Cela réutilise les onglets et l'état de connexion
déjà ouverts dans ce profil de navigateur.

Références officielles pour l'arrière-plan et la configuration :

- [Chrome for Developers: Use Chrome DevTools MCP with your browser session](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)

Profil intégré :

- `user`

Optionnel : créez votre propre profil de session existante personnalisé si vous souhaitez un
nom, une couleur ou un répertoire de données de navigateur différent.

Comportement par défaut :

- Le profil intégré `user` utilise la connexion automatique Chrome MCP, qui cible le profil local par défaut de Google Chrome.

Utilisez `userDataDir` pour Brave, Edge, Chromium ou un profil Chrome non par défaut :

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
3. Gardez le navigateur ouvert et approuvez l'invite de connexion lorsque OpenClaw se connecte.

Pages d'inspection courantes :

- Chrome : `chrome://inspect/#remote-debugging`
- Brave : `brave://inspect/#remote-debugging`
- Edge : `edge://inspect/#remote-debugging`

Test de fumée de connexion en direct :

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
- `tabs` liste vos onglets de navigateur déjà ouverts
- `snapshot` renvoie des références à partir de l'onglet en direct sélectionné

Que vérifier si la connexion ne fonctionne pas :

- le navigateur cible basé sur Chromium est en version `144+`
- le débogage à distance est activé dans la page d'inspection de ce navigateur
- le navigateur a affiché l'invite et vous avez accepté la demande de consentement de connexion
- `openclaw doctor` migre l'ancienne configuration de navigateur basée sur l'extension et vérifie que Chrome est installé localement pour les profils de connexion automatique par défaut, mais il ne peut pas activer le débogage à distance côté navigateur pour vous

Utilisation par l'agent :

- Utilisez `profile="user"` lorsque vous avez besoin de l'état du navigateur connecté de l'utilisateur.
- Si vous utilisez un profil de session existant personnalisé, transmettez ce nom de profil explicite.
- Ne choisissez ce mode que lorsque l'utilisateur est devant l'ordinateur pour approuver l'invite de connexion.
- le Gateway ou l'hôte du nœud peut générer `npx chrome-devtools-mcp@latest --autoConnect`

Remarques :

- Ce chemin présente un risque plus élevé que le profil isolé `openclaw` car il peut agir au sein de votre session de navigateur connectée.
- OpenClaw ne lance pas le navigateur pour ce pilote ; il se connecte uniquement à une session existante.
- OpenClaw utilise ici le flux officiel `--autoConnect` de Chrome DevTools MCP. Si `userDataDir` est défini, OpenClaw le transmet pour cibler ce répertoire de données utilisateur Chromium explicite.
- Les captures d'écran de session existante prennent en charge les captures de page et les captures d'éléments `--ref` à partir d'instantanés, mais pas les sélecteurs CSS `--element`.
- Les captures d'écran de page de session existante fonctionnent sans Playwright via Chrome MCP. Les captures d'écran d'élément basées sur des références (`--ref`) fonctionnent également, mais `--full-page` ne peut pas être combiné avec `--ref` ou `--element`.
- Les actions de session existante sont toujours plus limitées que le chemin du navigateur géré :
  - `click`, `type`, `hover`, `scrollIntoView`, `drag`, et `select` nécessitent des références d'instantanés au lieu de sélecteurs CSS
  - `click` est uniquement le bouton gauche (pas de substitution de bouton ni de modificateurs)
  - `type` ne prend pas en charge `slowly=true` ; utilisez `fill` ou `press`
  - `press` ne prend pas en charge `delayMs`
  - `hover`, `scrollIntoView`, `drag`, `select`, `fill`, et `evaluate` ne prennent pas en charge les substitutions de délai d'attente par appel
  - `select` prend actuellement en charge une seule valeur uniquement
- Le `wait --url` de session existante prend en charge les modèles exacts, de sous-chaîne et glob, comme les autres pilotes de navigateur. `wait --load networkidle` n'est pas encore pris en charge.
- Les hooks de téléchargement de session existante nécessitent `ref` ou `inputRef`, prennent en charge un fichier à la fois et ne prennent pas en charge le ciblage CSS `element`.
- Les hooks de dialogue de session existante ne prennent pas en charge les substitutions de délai d'attente.
- Certaines fonctionnalités nécessitent encore le chemin du navigateur géré, notamment les actions par lot, l'exportation PDF, l'interception des téléchargements et `responsebody`.
- La session existante est locale à l'hôte. Si Chrome se trouve sur une machine différente ou un espace de noms réseau différent, utilisez CDP distant ou un hôte de nœud à la place.

## Garanties d'isolement

- **Répertoire de données utilisateur dédié** : n'affecte jamais votre profil de navigateur personnel.
- **Ports dédiés** : évite `9222` pour éviter les conflits avec les flux de travail de développement.
- **Contrôle déterministe des onglets** : cible les onglets par `targetId`, et non « dernier onglet ».

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

## Contrôle de l'API (facultatif)

Pour les intégrations locales uniquement, le Gateway expose une petite API HTTP de bouclage :

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

Si l'authentification de passerelle par secret partagé est configurée, les itinéraires HTTP du navigateur nécessitent également une authentification :

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` ou authentification HTTP Basic avec ce mot de passe

Remarques :

- Cette API de navigateur en boucle locale autonome ne consomme **pas** les en-têtes d'identité trusted-proxy ou Tailscale Serve.
- Si `gateway.auth.mode` est `none` ou `trusted-proxy`, ces itinéraires de navigateur en boucle locale n'héritent pas de ces modes porteurs d'identité ; gardez-les uniquement en boucle locale.

### Contrat d'erreur `/act`

`POST /act` utilise une réponse d'erreur structurée pour la validation au niveau de la route et
les échecs de stratégie :

```json
{ "error": "<message>", "code": "ACT_*" }
```

Valeurs `code` actuelles :

- `ACT_KIND_REQUIRED` (HTTP 400) : `kind` est manquant ou non reconnu.
- `ACT_INVALID_REQUEST` (HTTP 400) : la charge utile de l'action a échoué à la normalisation ou à la validation.
- `ACT_SELECTOR_UNSUPPORTED` (HTTP 400) : `selector` a été utilisé avec un type d'action non pris en charge.
- `ACT_EVALUATE_DISABLED` (HTTP 403) : `evaluate` (ou `wait --fn`) est désactivé par la configuration.
- `ACT_TARGET_ID_MISMATCH` (HTTP 403) : `targetId` de niveau supérieur ou en lot entre en conflit avec la cible de la requête.
- `ACT_EXISTING_SESSION_UNSUPPORTED` (HTTP 501) : l'action n'est pas prise en charge pour les profils de session existante.

D'autres erreurs d'exécution peuvent toujours renvoyer `{ "error": "<message>" }` sans champ
`code`.

### Prérequis Playwright

Certaines fonctionnalités (navigation/action/instantané IA/instantané de rôle, captures d'écran d'éléments,
PDF) nécessitent Playwright. Si Playwright n'est pas installé, ces points de terminaison renvoient
une erreur 501 claire.

Ce qui fonctionne toujours sans Playwright :

- Instantanés ARIA
- Captures d'écran de page pour le navigateur géré `openclaw` lorsqu'un WebSocket
  CDP par onglet est disponible
- Captures d'écran de page pour les profils `existing-session` / Chrome MCP
- Captures d'écran basées sur la référence `existing-session` (`--ref`) à partir de la sortie de l'instantané

Ce qui nécessite encore Playwright :

- `navigate`
- `act`
- Instantanés IA / instantanés de rôle
- Captures d'écran d'éléments par sélecteur CSS (`--element`)
- export PDF complet du navigateur

Les captures d'écran d'éléments rejettent également `--full-page` ; la route renvoie `fullPage is
not supported for element screenshots`.

Si vous voyez `Playwright is not available in this gateway build`, installez le package complet
Playwright (pas `playwright-core`) et redémarrez la passerelle, ou réinstallez
OpenClaw avec la prise en charge du navigateur.

#### Installation de Playwright sur Docker

Si votre Gateway s'exécute dans Docker, évitez `npx playwright` (conflits de remplacement npm).
Utilisez plutôt le CLI inclus :

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

## Référence rapide de la CLI

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

Note sur le cycle de vie :

- Pour les profils attachement uniquement et CDP distant, `openclaw browser stop` reste la
  bonne commande de nettoyage après les tests. Elle ferme la session de contrôle active et
  efface les substituts d'émulation temporaires au lieu de tuer le navigateur
  sous-jacent.
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

- `upload` et `dialog` sont des appels d'**armement** ; exécutez-les avant le clic/pression
  qui déclenche le sélecteur/la boîte de dialogue.
- Les chemins de téléchargement et de sortie de trace sont limités aux racines temporaires OpenClaw :
  - traces : `/tmp/openclaw` (repli : `${os.tmpdir()}/openclaw`)
  - téléchargements : `/tmp/openclaw/downloads` (repli : `${os.tmpdir()}/openclaw/downloads`)
- Les chemins de téléversement sont limités à une racine de téléversements temporaires OpenClaw :
  - téléversements : `/tmp/openclaw/uploads` (repli : `${os.tmpdir()}/openclaw/uploads`)
- `upload` peut également définir les entrées de fichiers directement via `--input-ref` ou `--element`.
- `snapshot` :
  - `--format ai` (par défaut lorsque Playwright est installé) : renvoie un instantané IA avec des références numériques (`aria-ref="<n>"`).
  - `--format aria` : renvoie l'arbre d'accessibilité (pas de références ; inspection uniquement).
  - `--efficient` (ou `--mode efficient`) : préréglage d'instantané de rôle compact (interactif + compact + profondeur + maxChars inférieur).
  - Config par défaut (tool/CLI uniquement) : définissez `browser.snapshotDefaults.mode: "efficient"` pour utiliser des instantanés efficaces lorsque l'appelant ne transmet pas de mode (voir [Gateway configuration](/en/gateway/configuration-reference#browser)).
  - Les options d'instantané de rôle (`--interactive`, `--compact`, `--depth`, `--selector`) forcent un instantané basé sur les rôles avec des références comme `ref=e12`.
  - `--frame "<iframe selector>"` limite les instantanés de rôle à un iframe (s'associe aux références de rôle comme `e12`).
  - `--interactive` fournit une liste plate et facile à choisir d'éléments interactifs (idéal pour piloter les actions).
  - `--labels` ajoute une capture d'écran de la zone d'affichage uniquement avec des étiquettes de référence superposées (imprime `MEDIA:<path>`).
- `click`/`type`/etc nécessitent une `ref` de `snapshot` (soit un `12` numérique, soit une référence de rôle `e12`).
  Les sélecteurs CSS ne sont intentionnellement pas pris en charge pour les actions.

## Instantanés et références

OpenClaw prend en charge deux styles d'« instantané » :

- **Instantané IA (références numériques)** : `openclaw browser snapshot` (par défaut ; `--format ai`)
  - Sortie : un instantané textuel qui inclut des références numériques.
  - Actions : `openclaw browser click 12`, `openclaw browser type 23 "hello"`.
  - En interne, la référence est résolue via `aria-ref` de Playwright.

- **Instantané de rôle (références de rôle comme `e12`)** : `openclaw browser snapshot --interactive` (ou `--compact`, `--depth`, `--selector`, `--frame`)
  - Sortie : une liste/arborescence basée sur les rôles avec `[ref=e12]` (et `[nth=1]` facultatif).
  - Actions : `openclaw browser click e12`, `openclaw browser highlight e12`.
  - En interne, la référence est résolue via `getByRole(...)` (plus `nth()` pour les doublons).
  - Ajoutez `--labels` pour inclure une capture d'écran de la zone d'affichage avec des étiquettes `e12` superposées.

Comportement des références :

- Les références ne sont **pas stables d'une navigation à l'autre** ; en cas d'échec, réexécutez `snapshot` et utilisez une nouvelle référence.
- Si l'instantané de rôle a été pris avec `--frame`, les références de rôle sont limitées à cet iframe jusqu'au prochain instantané de rôle.

## Améliorations d'attente

Vous pouvez attendre autre chose que le temps/le texte :

- Attendre une URL (les globs pris en charge par Playwright) :
  - `openclaw browser wait --url "**/dash"`
- Attendre un état de chargement :
  - `openclaw browser wait --load networkidle`
- Attendre qu'un prédicat JS soit satisfait :
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

## Déboguer les flux de travail

Lorsqu'une action échoue (par exemple « non visible », « violation du mode strict », « couvert ») :

1. `openclaw browser snapshot --interactive`
2. Utilisez `click <ref>` / `type <ref>` (privilégiez les références de rôle en mode interactif)
3. Si cela échoue toujours : `openclaw browser highlight <ref>` pour voir ce que Playwright cible
4. Si la page se comporte bizarrement :
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. Pour un débogage approfondi : enregistrez une trace :
   - `openclaw browser trace start`
   - reproduire le problème
   - `openclaw browser trace stop` (affiche `TRACE:<path>`)

## Sortie JSON

`--json` est destiné aux scripts et aux outils structurés.

Exemples :

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

Les instantanés de rôle en JSON incluent `refs` ainsi qu'un petit bloc `stats` (lignes/caractères/références/interactif) afin que les outils puissent évaluer la taille et la densité de la charge utile.

## Paramètres d'état et d'environnement

Ces éléments sont utiles pour les flux de travail « faire se comporter le site comme X » :

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
  exécutent du JavaScript arbitraire dans le contexte de la page. L'injection de prompt peut influencer cela.
  Désactivez-le avec `browser.evaluateEnabled=false` si vous n'en avez pas besoin.
- Pour les notes de connexion et anti-bot (X/Twitter, etc.), consultez [Browser login + X/Twitter posting](/en/tools/browser-login).
- Gardez l'hôte Gateway/nœud privé (bouclage ou tailnet uniquement).
- Les points de terminaison CDP distants sont puissants ; tunnelisez-les et protégez-les.

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

Pour les problèmes spécifiques à Linux (surtout snap Chromium), consultez
[Browser troubleshooting](/en/tools/browser-linux-troubleshooting).

Pour les configurations à hôtes multiples avec WSL2 Gateway + Windows Chrome, consultez
[WSL2 + Windows + remote Chrome CDP troubleshooting](/en/tools/browser-wsl2-windows-remote-cdp-troubleshooting).

## Outils de l'agent + fonctionnement du contrôle

L'agent obtient **one tool** pour l'automatisation du navigateur :

- `browser` — status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

Comment cela correspond :

- `browser snapshot` renvoie un arbre d'interface utilisateur stable (IA ou ARIA).
- `browser act` utilise les ID de `ref` de l'instantané pour cliquer/taper/faire glisser/sélectionner.
- `browser screenshot` capture les pixels (page entière ou élément).
- `browser` accepte :
  - `profile` pour choisir un profil de navigateur nommé (openclaw, chrome ou CDP distant).
  - `target` (`sandbox` | `host` | `node`) pour sélectionner l'emplacement du navigateur.
  - Dans les sessions sandboxed, `target: "host"` nécessite `agents.defaults.sandbox.browser.allowHostControl=true`.
  - Si `target` est omis : les sessions sandboxed utilisent par défaut `sandbox`, les sessions non-sandbox utilisent par défaut `host`.
  - Si un nœud compatible navigateur est connecté, l'outil peut y router automatiquement, sauf si vous épinglez `target="host"` ou `target="node"`.

Cela rend l'agent déterministe et évite les sélecteurs fragiles.

## Connexes

- [Vue d'ensemble des outils](/en/tools) — tous les outils d'agent disponibles
- [Sandboxing](/en/gateway/sandboxing) — contrôle du navigateur dans les environnements sandboxed
- [Sécurité](/en/gateway/security) — risques et durcissement du contrôle du navigateur
