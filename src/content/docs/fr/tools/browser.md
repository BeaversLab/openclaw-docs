---
summary: "Service de contrôle de navigateur intégré + commandes d'action"
read_when:
  - Adding agent-controlled browser automation
  - Debugging why openclaw is interfering with your own Chrome
  - Implementing browser settings + lifecycle in the macOS app
title: "Navigateur (géré par OpenClaw)"
---

OpenClaw peut exécuter un **profil Chrome/Brave/Edge/Chromium dédié** que l'agent contrôle.
Il est isolé de votre navigateur personnel et est géré par un petit service
de contrôle local à l'intérieur de la Gateway (en boucle uniquement).

Vue du débutant :

- Considérez-le comme un **navigateur distinct, réservé à l'agent**.
- Le profil `openclaw` ne touche **pas** à votre profil de navigateur personnel.
- L'agent peut **ouvrir des onglets, lire des pages, cliquer et taper** dans une voie sécurisée.
- Le profil `user` intégré se connecte à votre véritable session Chrome connectée via Chrome MCP.

## Ce que vous obtenez

- Un profil de navigateur distinct nommé **openclaw** (accent orange par défaut).
- Contrôle déterministe des onglets (liste/ouverture/focus/fermeture).
- Actions de l'agent (clic/frappé/glissement/sélection), instantanés, captures d'écran, PDF.
- Une compétence `browser-automation` intégrée qui enseigne aux agents la boucle de récupération par instantané,
  onglet stable, référence obsolète et bloqueur manuel lorsque le plugin
  de navigateur est activé.
- Prise en charge optionnelle de plusieurs profils (`openclaw`, `work`, `remote`, ...).

Ce navigateur n'est **pas** votre navigateur quotidien. C'est une surface sûre et isolée pour
l'automatisation et la vérification par l'agent.

## Démarrage rapide

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw doctor --deep
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

Si vous obtenez "Browser disabled", activez-le dans la configuration (voir ci-dessous) et redémarrez le
Gateway.

Si `openclaw browser` est entièrement manquant, ou si l'agent indique que le tool de navigation n'est pas disponible, passez à [Missing browser command or tool](/fr/tools/browser#missing-browser-command-or-tool).

## Contrôle des plugins

Le tool `browser` par défaut est un plugin intégré. Désactivez-le pour le remplacer par un autre plugin qui enregistre le même nom de tool `browser` :

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

Les valeurs par défaut nécessitent à la fois `plugins.entries.browser.enabled` **et** `browser.enabled=true`. Désactiver uniquement le plugin supprime la `openclaw browser` CLI, la méthode de passerelle `browser.request`, le tool de l'agent et le service de contrôle en une seule unité ; votre config `browser.*` reste intacte pour un remplacement.

Les modifications de la configuration du navigateur nécessitent un redémarrage de la Gateway afin que le plugin puisse réenregistrer son service.

## Conseils à l'agent

Remarque concernant le profil d'outil : `tools.profile: "coding"` inclut `web_search` et `web_fetch`, mais n'inclut pas l'outil complet `browser`. Si l'agent ou un sous-agent généré doit utiliser l'automatisation du navigateur, ajoutez le navigateur au niveau du profil :

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

Pour un agent unique, utilisez `agents.list[].tools.alsoAllow: ["browser"]`.
`tools.subagents.tools.allow: ["browser"]` seul ne suffit pas car la stratégie de sous-agent est appliquée après le filtrage par profil.

Le plugin navigateur fournit deux niveaux de guidage pour l'agent :

- La description de l'outil `browser` porte le contrat compact toujours actif : choisissez le bon profil, gardez les références sur le même onglet, utilisez `tabId`/labels pour le ciblage des onglets, et chargez la compétence navigateur pour les tâches en plusieurs étapes.
- La compétence intégrée `browser-automation` exécute la boucle opérationnelle plus longue :
  vérifier d'abord l'état/les onglets, étiqueter les onglets de tâches, instantané avant d'agir, réinstantané
  après les modifications de l'interface utilisateur, récupérer les références obsolètes une fois, et signaler la connexion/2FA/captcha ou
  les bloqueurs de caméra/microphone comme une action manuelle au lieu de deviner.

Les compétences intégrées au plugin sont répertoriées dans les compétences disponibles de l'agent lorsque le
plugin est activé. Les instructions complètes de la compétence sont chargées à la demande, de sorte que les tours
de routine ne paient pas le coût complet en tokens.

## Commande ou outil navigateur manquant

Si `openclaw browser` est inconnu après une mise à niveau, `browser.request` est manquant, ou si l'agent signale que l'outil de navigation n'est pas disponible, la cause habituelle est une liste `plugins.allow` qui omet `browser` et qu'aucun bloc de configuration racine `browser` n'existe. Ajoutez-le :

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

Un bloc racine explicite `browser`, par exemple `browser.enabled=true` ou `browser.profiles.<name>`, active le plugin de navigateur intégré même sous un `plugins.allow` restrictif, correspondant au comportement de la configuration du canal. `plugins.entries.browser.enabled=true` et `tools.alsoAllow: ["browser"]` ne remplacent pas à eux seuls l'appartenance à la liste d'autorisation. La suppression complète de `plugins.allow` rétablit également la valeur par défaut.

## Profils : `openclaw` vs `user`

- `openclaw` : navigateur géré et isolé (aucune extension requise).
- `user` : profil de connexion Chrome MCP intégré pour votre **vraie session Chrome connectée**.

Pour les appels d'outil navigateur de l'agent :

- Par défaut : utilise le navigateur isolé `openclaw`.
- Privilégiez `profile="user"` lorsque les sessions connectées existantes sont importantes et que l'utilisateur est devant l'ordinateur pour cliquer/approuver toute invite d'attachement.
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
    localLaunchTimeoutMs: 15000, // local managed Chrome discovery timeout (ms)
    localCdpReadyTimeoutMs: 8000, // local managed post-launch CDP readiness timeout (ms)
    actionTimeoutMs: 60000, // default browser act timeout (ms)
    tabCleanup: {
      enabled: true, // default: true
      idleMinutes: 120, // set 0 to disable idle cleanup
      maxTabsPerSession: 8, // set 0 to disable the per-session cap
      sweepMinutes: 5,
    },
    defaultProfile: "openclaw",
    color: "#FF4500",
    headless: false,
    noSandbox: false,
    attachOnly: false,
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: {
        cdpPort: 18801,
        color: "#0066CC",
        headless: true,
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      },
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

### Capture d'écran avec vision (prise en charge des modèles texte uniquement)

Lorsque le modèle principal est texte uniquement (sans prise en charge de la vision/multimodale), les captures d'écran du navigateur renvoient des blocs d'image que le modèle ne peut pas lire. Les captures d'écran du navigateur réutilisent la configuration existante de compréhension d'image, de sorte qu'un modèle d'image configuré pour la compréhension des médias peut décrire les captures d'écran sous forme de texte sans aucun paramètre de modèle spécifique au navigateur.

```json5
{
  tools: {
    media: {
      image: {
        models: [
          { provider: "bytedance", model: "doubao-seed-2.0-pro" },
          // Add fallback candidates; first success wins
          { provider: "openai", model: "gpt-4o" },
        ],
      },
      // Shared media models also work when tagged for image support.
      // models: [{ provider: "openai", model: "gpt-4o", capabilities: ["image"] }],
    },
  },
  agents: {
    defaults: {
      // Existing image-model defaults are also honored.
      // imageModel: { primary: "openai/gpt-4o" },
    },
  },
}
```

**Fonctionnement :**

1. L'agent appelle `browser screenshot` → image capturée sur le disque comme d'habitude.
2. L'outil de navigateur demande au runtime de compréhension d'images existant s'il
   décrire la capture d'écran à l'aide de modèles d'images média configurés, de modèles média partagés,
   des valeurs par défaut des modèles d'images, ou d'un fournisseur d'images avec authentification.
3. Le modèle de vision renvoie une description textuelle, qui est encapsulée avec
   `wrapExternalContent` (garde contre l'injection de prompt) et renvoyée à l'agent
   sous forme de bloc de texte au lieu d'un bloc d'image.
4. Si la compréhension d'images est indisponible, ignorée ou échoue, le navigateur revient
   au renvoi du bloc d'image original.

Utilisez les champs `tools.media.image` / `tools.media.models` existants pour les
replis de modèle, les délais d'expiration, les limites d'octets, les profils et les paramètres de requête du fournisseur.

Si le modèle principal actif prend déjà en charge la vision et qu'aucun modèle de compréhension
d'images explicite n'est configuré, OpenClaw conserve le résultat d'image normal afin que le
modèle principal puisse lire la capture d'écran directement.

<AccordionGroup>

<Accordion title="Ports et accessibilité">

- Le service de contrôle se lie à l'adresse de bouclage (loopback) sur un port dérivé de `gateway.port` (par défaut `18791` = passerelle + 2). Le remplacement de `gateway.port` ou `OPENCLAW_GATEWAY_PORT` décale les ports dérivés de la même famille.
- Les profils `openclaw` locaux attribuent automatiquement `cdpPort`/`cdpUrl` ; ne définissez ces valeurs que pour le CDP distant. `cdpUrl` prend par défaut le port CDP local géré lorsqu'il n'est pas défini.
- `remoteCdpTimeoutMs` s'applique aux contrôles d'accessibilité HTTP CDP distants et `attachOnly` et aux requêtes HTTP d'ouverture d'onglet ; `remoteCdpHandshakeTimeoutMs` s'applique à leurs poignées de main (handshakes) WebSocket CDP.
- `localLaunchTimeoutMs` est le budget pour qu'un processus Chrome géré lancé localement expose son point de terminaison HTTP CDP. `localCdpReadyTimeoutMs` est le budget de suivi pour la préparation du websocket CDP une fois le processus découvert. Augmentez ces valeurs sur Raspberry Pi, les VPS bas de gamme, ou le matériel ancien où Chromium démarre lentement. Les valeurs doivent être des entiers positifs jusqu'à `120000` ms ; les valeurs de configuration non valides sont rejetées.
- Les échecs répétés de lancement/préparation de Chrome géré sont soumis à un disjoncteur (circuit-broken) par profil. Après plusieurs échecs consécutifs, OpenClaw met en pause brièvement les nouvelles tentatives de lancement au lieu de lancer Chromium à chaque appel d'outil de navigation. Corrigez le problème de démarrage, désactivez le navigateur s'il n'est pas nécessaire, ou redémarrez la Gateway après réparation.
- `actionTimeoutMs` est le budget par défaut pour les requêtes `act` du navigateur lorsque l'appelant ne transmet pas `timeoutMs`. Le transport client ajoute une petite fenêtre de délai (slack window) pour que les longues attentes puissent se terminer au lieu d'expirer à la limite HTTP.
- `tabCleanup` est un nettoyage au mieux (best-effort) pour les onglets ouverts par les sessions de navigateur de l'agent principal. Le nettoyage du cycle de vie du sous-agent, du cron et de l'ACP ferme toujours leurs onglets suivis explicites à la fin de la session ; les sessions principales gardent les onglets actifs réutilisables, puis ferment les onglets suivis inactifs ou excédentaires en arrière-plan.

</Accordion>

<Accordion title="Stratégie SSRF">

- La navigation du navigateur et l'ouverture d'onglets sont protégées contre les attaques SSRF avant la navigation et vérifiées au mieux sur l'URL finale `http(s)` par la suite.
- En mode SSRF strict, la découverte du point de terminaison CDP distant et les sondes `/json/version` (`cdpUrl`) sont également vérifiées.
- Les variables d'environnement Gateway/provider `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` et `NO_PROXY` ne proxifient pas automatiquement le navigateur géré par OpenClaw. Chrome géré se lance en direct par défaut, afin que les paramètres de proxy du fournisseur ne fragilisent pas les vérifications SSRF du navigateur.
- Les sondes de disponibilité CDP locales gérées par OpenClaw et les connexions WebSocket DevTools contournent le proxy réseau géré pour le point de terminaison de bouclage exact lancé, donc `openclaw browser start` fonctionne toujours lorsqu'un proxy opérateur bloque le trafic sortant de bouclage.
- Pour proxifier le navigateur géré lui-même, transmettez des indicateurs de proxy Chrome explicites via `browser.extraArgs`, tels que `--proxy-server=...` ou `--proxy-pac-url=...`. Le mode SSRF strict bloque le routage de proxy de navigateur explicite, sauf si l'accès au navigateur sur réseau privé est activé intentionnellement.
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` est désactivé par défaut ; à activer uniquement lorsque l'accès au navigateur sur réseau privé est intentionnellement fiable.
- `browser.ssrfPolicy.allowPrivateNetwork` reste pris en charge en tant qu'alias historique.

</Accordion>

<Accordion title="Comportement du profil">

- `attachOnly: true` signifie ne jamais lancer de navigateur local ; s'attacher uniquement si l'un est déjà en cours d'exécution.
- `headless` peut être défini globalement ou par profil géré localement. Les valeurs par profil remplacent `browser.headless`, de sorte qu'un profil lancé localement peut rester headless tandis qu'un autre reste visible.
- `POST /start?headless=true` et `openclaw browser start --headless` demandent un
  lancement headless ponctuel pour les profils gérés localement sans réécrire
  `browser.headless`OpenClawLinux ou la configuration du profil. Les profils de session existante, attachement uniquement et
  CDP distant rejettent le remplacement car OpenClaw ne lance pas ces
  processus de navigateur.
- Sur les hôtes Linux sans `DISPLAY` ou `WAYLAND_DISPLAY`, les profils gérés localement
  passent par défaut en mode headless automatiquement lorsque ni l'environnement ni la configuration de profil/globale
  ne choisit explicitement le mode avec interface. `openclaw browser status --json`
  signale `headlessSource` comme `env`, `profile`, `config`,
  `request`, `linux-display-fallback`, ou `default`.
- `OPENCLAW_BROWSER_HEADLESS=1` force les lancements gérés localement en mode headless pour le
  processus actuel. `OPENCLAW_BROWSER_HEADLESS=0`Linux force le mode avec interface pour les
  démarrages ordinaires et renvoie une erreur exploitable sur les hôtes Linux sans serveur d'affichage ;
  une demande explicite `start --headless` l'emporte toujours pour ce lancement.
- `executablePath` peut être défini globalement ou par profil géré localement. Les valeurs par profil remplacent `browser.executablePath`, de sorte que différents profils gérés peuvent lancer différents navigateurs basés sur Chromium. Les deux formes acceptent `~` pour votre répertoire personnel de l'OS.
- `color` (niveau supérieur et par profil) teinte l'interface du navigateur afin que vous puissiez voir quel profil est actif.
- Le profil par défaut est `openclaw` (autonome géré). Utilisez `defaultProfile: "user"`Brave pour opter pour le navigateur de l'utilisateur connecté.
- Ordre de détection automatique : navigateur par défaut du système s'il est basé sur Chromium ; sinon Chrome → Brave → Edge → Chromium → Chrome Canary.
- `driver: "existing-session"` utilise Chrome DevTools MCP au lieu du CDP brut. Ne définissez pas `cdpUrl` pour ce pilote.
- Définissez `browser.profiles.<name>.userDataDir`Brave lorsqu'un profil de session existante doit s'attacher à un profil utilisateur Chromium non par défaut (Brave, Edge, etc.). Ce chemin accepte également `~` pour votre répertoire personnel de l'OS.

</Accordion>

</AccordionGroup>

## Utiliser Brave ou un autre navigateur basé sur Chromium

Si votre navigateur **par défaut du système** est basé sur Chromium (Chrome/Brave/Edge/etc),
OpenClaw l'utilise automatiquement. Définissez `browser.executablePath` pour outrepasser
la détection automatique. Les valeurs `executablePath` de niveau supérieur et par profil acceptent `~`
pour votre répertoire personnel de l'OS :

```bash
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set browser.profiles.work.executablePath "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

Ou définissez-le dans la configuration, par plateforme :

<Tabs>
  <Tab title="macOS">
```json5
{
  browser: {
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  },
}
```
  </Tab>
  <Tab title="Windows">
```json5
{
  browser: {
    executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  },
}
```
  </Tab>
  <Tab title="Linux">
```json5
{
  browser: {
    executablePath: "/usr/bin/brave-browser",
  },
}
```
  </Tab>
</Tabs>

Par profil `executablePath` n'affecte que les profils gérés localement que OpenClaw
lance. Les profils `existing-session` s'attachent plutôt à un navigateur déjà en cours d'exécution,
et les profils CDP distants utilisent le navigateur derrière `cdpUrl`.

## Contrôle local vs distant

- **Contrôle local (par défaut) :** le Gateway démarre le service de contrôle en boucle locale et peut lancer un navigateur local.
- **Contrôle distant (hôte de nœud) :** exécutez un hôte de nœud sur la machine qui dispose du navigateur ; le Gateway relaie les actions du navigateur vers celui-ci.
- **CDP distant :** définissez `browser.profiles.<name>.cdpUrl` (ou `browser.cdpUrl`) pour
  vous attacher à un navigateur distant basé sur Chromium. Dans ce cas, OpenClaw ne lancera pas de navigateur local.
- Pour les services CDP gérés en externe sur le bouclage local (par exemple Browserless dans Docker publié sur `127.0.0.1`), définissez également `attachOnly: true`. Le CDP de bouclage local sans `attachOnly` est traité comme un profil de navigateur local géré par OpenClaw.
- `headless` n'affecte que les profils gérés locaux que OpenClaw lance. Il ne redémarre pas et ne modifie pas les navigateurs CDP distants ou de session existante.
- `executablePath` suit la même règle de profil géré localement. Le modifier sur un profil géré localement en cours d'exécution marque ce profil pour redémarrage/réconciliation afin que le prochain lancement utilise le nouveau binaire.

Le comportement d'arrêt diffère selon le mode de profil :

- profils gérés localement : `openclaw browser stop` arrête le processus du navigateur que OpenClaw a lancé
- profils attach-only et CDP distant : `openclaw browser stop` ferme la session de
  contrôle active et libère les émulations de substitution Playwright/CDP (viewport,
  schéma de couleurs, langue, fuseau horaire, mode hors ligne et états similaires),
  même si aucun processus de navigateur n'a été lancé par OpenClaw

Les URL CDP distantes peuvent inclure une authentification :

- Jetons de requête (par exemple, `https://provider.example?token=<token>`)
- Authentification HTTP Basic (par exemple, `https://user:pass@provider.example`)

OpenClaw préserve l'authentification lors de l'appel aux points de terminaison `/json/*` et lors de la connexion
au WebSocket CDP. Privilégiez les variables d'environnement ou les gestionnaires de secrets pour
les jetons plutôt que de les commiter dans les fichiers de configuration.

## Proxy de navigateur Node (par défaut sans configuration)

Si vous exécutez un **node host** sur la machine qui possède votre navigateur, OpenClaw peut
router automatiquement les appels d'outil de navigateur vers ce nœud sans configuration supplémentaire du navigateur.
C'est le chemin par défaut pour les passerelles distantes.

Notes :

- Le nœud hôte expose son serveur de contrôle de navigateur local via une **commande proxy**.
- Les profils proviennent de la propre configuration `browser.profiles` du nœud (identique à celle en local).
- `nodeHost.browserProxy.allowProfiles` est facultatif. Laissez-le vide pour le comportement hérité/défaut : tous les profils configurés restent accessibles via le proxy, y compris les routes de création/suppression de profils.
- Si vous définissez `nodeHost.browserProxy.allowProfiles`, OpenClaw le traite comme une limite de moindre privilège : seuls les profils sur liste blanche peuvent être ciblés, et les routes persistantes de création/suppression de profils sont bloquées sur la surface du proxy.
- Désactivez-le si vous ne le souhaitez pas :
  - Sur le nœud : `nodeHost.browserProxy.enabled=false`
  - Sur la passerelle : `gateway.nodes.browser.mode="off"`

## Browserless (CDP distant hébergé)

[Browserless](https://browserless.io) est un service Chromium hébergé qui expose
les URL de connexion CDP via HTTPS et WebSocket. OpenClaw peut utiliser l'une ou l'autre forme, mais
pour un profil de navigateur distant, l'option la plus simple consiste à utiliser l'URL WebSocket directe
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

Remarques :

- Remplacez `<BROWSERLESS_API_KEY>` par votre véritable jeton Browserless.
- Choisissez le point de terminaison régional correspondant à votre compte Browserless (consultez leur documentation).
- Si Browserless vous fournit une URL de base HTTPS, vous pouvez soit la convertir en
  `wss://` pour une connexion CDP directe, soit conserver l'URL HTTPS et laisser OpenClaw
  découvrir `/json/version`.

### Docker Browserless sur le même hôte

Lorsque Browserless est auto-hébergé dans Docker et que OpenClaw s'exécute sur l'hôte, traitez
Browserless comme un service CDP géré en externe :

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserless",
    profiles: {
      browserless: {
        cdpUrl: "ws://127.0.0.1:3000",
        attachOnly: true,
        color: "#00AA00",
      },
    },
  },
}
```

L'adresse dans `browser.profiles.browserless.cdpUrl` doit être accessible à partir du processus
OpenClaw. Browserless doit également annoncer un point de terminaison accessible correspondant ;
définissez `EXTERNAL` de Browserless sur cette même base WebSocket publique pour OpenClaw, telle
que `ws://127.0.0.1:3000`, `ws://browserless:3000`, ou une adresse réseau privée Docker
stable. Si `/json/version` renvoie `webSocketDebuggerUrl` pointant vers
une adresse que OpenClaw ne peut pas atteindre, le CDP HTTP peut sembler sain alors que la connexion
WebSocket échoue toujours.

Ne laissez pas `attachOnly` non défini pour un profil Browserless en boucle locale. Sans `attachOnly`, OpenClaw considère le port de boucle locale comme un profil de navigateur géré localement et peut signaler que le port est utilisé mais n'est pas détenu par OpenClaw.

## Fournisseurs CDP WebSocket directs

Certains services de navigateur hébergés exposent un point de terminaison **WebSocket direct** plutôt que la découverte CDP standard basée sur HTTP (`/json/version`). OpenClaw accepte trois formats d'URL CDP et choisit automatiquement la bonne stratégie de connexion :

- **Découverte HTTP(S)** - `http://host[:port]` ou `https://host[:port]`.
  OpenClaw appelle `/json/version` pour découvrir l'URL du débogueur WebSocket, puis se connecte. Pas de repli WebSocket.
- **Points de terminaison WebSocket directs** - `ws://host[:port]/devtools/<kind>/<id>` ou
  `wss://...` avec un chemin `/devtools/browser|page|worker|shared_worker|service_worker/<id>`.
  OpenClaw se connecte directement via une poignée de main WebSocket et ignore complètement `/json/version`.
- **Racines WebSocket nues** - `ws://host[:port]` ou `wss://host[:port]` sans
  chemin `/devtools/...` (p. ex. [Browserless](https://browserless.io),
  [Browserbase](https://www.browserbase.com)). OpenClaw tente d'abord la découverte HTTP
  `/json/version` (normalisation du schéma en `http`/`https`) ;
  si la découverte renvoie un `webSocketDebuggerUrl`, il est utilisé, sinon OpenClaw
  revient à une poignée de main WebSocket directe à la racine nue. Si le point de
  terminaison WebSocket annoncé rejette la poignée de main CDP mais que la racine
  nue configurée l'accepte, OpenClaw revient également à cette racine.
  Cela permet à une racine nue `ws://` pointant vers un Chrome local
  de toujours se connecter, car Chrome n'accepte les mises à niveau WebSocket
  que sur le chemin spécifique par cible depuis `/json/version`, tandis que les
  fournisseurs hébergés peuvent toujours utiliser leur point de terminaison WebSocket
  racine lorsque leur point de terminaison de découverte annonce une URL éphémère
  non adaptée pour le CDP Playwright.

`openclaw browser doctor` utilise la même logique de découverte en priorité, puis de repli sur WebSocket, que l'attachement à l'exécution (runtime attach). Par conséquent, une URL racine simple qui se connecte avec succès n'est pas signalée comme injoignable par les diagnostics.

### Browserbase

[Browserbase](https://www.browserbase.com) est une plate-forme cloud pour exécuter des navigateurs sans tête (headless) avec résolution intégrée de CAPTCHA, mode furtif et proxys résidentiels.

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
- Browserbase crée automatiquement une session de navigateur lors de la connexion WebSocket, donc aucune étape de création de session manuelle n'est nécessaire.
- Le niveau gratuit permet une session simultanée et une heure de navigateur par mois.
  Consultez la [tarification](https://www.browserbase.com/pricing) pour connaître les limites des plans payants.
- Consultez la [documentation Browserbase](https://docs.browserbase.com) pour la référence complète de l'API,
  les guides du SDK et les exemples d'intégration.

### Notte

[Notte](https://www.notte.cc) est une plateforme cloud pour exécuter des navigateurs
sans tête (headless) avec furtivité intégrée, proxys résidentiels et une passerelle
WebSocket native CDP.

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "notte",
    remoteCdpTimeoutMs: 3000,
    remoteCdpHandshakeTimeoutMs: 5000,
    profiles: {
      notte: {
        cdpUrl: "wss://us-prod.notte.cc/sessions/connect?token=<NOTTE_API_KEY>",
        color: "#7C3AED",
      },
    },
  },
}
```

Notes :

- [Inscrivez-vous](https://console.notte.cc) et copiez votre **clé API** depuis la
  page des paramètres de la console.
- Remplacez `<NOTTE_API_KEY>` par votre véritable clé API Notte.
- Notte crée automatiquement une session de navigateur lors de la connexion WebSocket, aucune étape
  de création manuelle de session n'est donc nécessaire. La session est détruite lorsque la
  WebSocket se déconnecte.
- La version gratuite autorise cinq sessions simultanées et 100 heures de navigateur cumulées. Consultez la [tarification](https://www.notte.cc/#pricing) pour les limites des plans payants.
- Consultez la [documentation Notte](https://docs.notte.cc) pour la référence complète de l'API, les guides du SDK et les exemples d'intégration.

## Sécurité

Points clés :

- Le contrôle du navigateur est limité à la boucle locale (loopback) ; l'accès transite via l'authentification du Gateway ou le jumelage de nœuds.
- L'API HTTP du navigateur en boucle locale autonome utilise **uniquement l'authentification par secret partagé** : authentification bearer par jeton de passerelle (gateway token), `x-openclaw-password`, ou authentification HTTP Basic avec le mot de passe de la passerelle configuré.
- Les en-têtes d'identité Tailscale Serve et `gateway.auth.mode: "trusted-proxy"` **n'authentifient pas** cette API de navigateur en boucle locale autonome.
- Si le contrôle du navigateur est activé et qu'aucune authentification par secret partagé n'est configurée, OpenClaw génère un jeton de passerelle uniquement pour cette exécution. Configurez `gateway.auth.token`, `gateway.auth.password`, `OPENCLAW_GATEWAY_TOKEN` ou `OPENCLAW_GATEWAY_PASSWORD` explicitement si les clients ont besoin d'un secret stable entre les redémarrages.
- OpenClaw ne génère **pas** automatiquement ce jeton lorsque `gateway.auth.mode` est déjà `password`, `none` ou `trusted-proxy`.
- Gardez le Gateway et tous les hôtes de nœuds sur un réseau privé (Tailscale) ; évitez l'exposition publique.
- Traitez les URL/jetons CDP distants comme des secrets ; privilégiez les env vars ou un gestionnaire de secrets.

Conseils pour le CDP distant :

- Privilégiez les points de terminaison chiffrés (HTTPS ou WSS) et les jetons à courte durée de vie dans la mesure du possible.
- Évitez d'intégrer des jetons à longue durée de vie directement dans les fichiers de configuration.

## Profils (multi-navigateur)

OpenClaw prend en charge plusieurs profils nommés (configurations de routage). Les profils peuvent être :

- **openclaw-managed** : une instance de navigateur basée sur Chromium dédiée avec son propre répertoire de données utilisateur + port CDP
- **remote** : une URL CDP explicite (navigateur basé sur Chromium s'exécutant ailleurs)
- **existing session** : votre profil Chrome existant via la connexion automatique Chrome DevTools MCP

Valeurs par défaut :

- Le profil `openclaw` est créé automatiquement s'il est manquant.
- Le profil `user` est intégré pour l'attachement à une session existante Chrome MCP.
- Les profils de session existante sont opt-in au-delà de `user` ; créez-les avec `--driver existing-session`.
- Les ports CDP locaux sont alloués de **18800 à 18899** par défaut.
- La suppression d'un profil déplace son répertoire de données locales vers la Corbeille.

Tous les points de terminaison de contrôle acceptent `?profile=<name>` ; la CLI utilise `--browser-profile`.

## Session existante via Chrome DevTools MCP

OpenClaw peut également se connecter à un profil de navigateur basé sur Chromium en cours d'exécution via le
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

- Le profil intégré `user` utilise la connexion automatique Chrome MCP, qui cible le profil Google Chrome local par défaut.

Utilisez `userDataDir` pour Brave, Edge, Chromium, ou un profil Chrome non par défaut.
`~` correspond au répertoire personnel de votre système d'exploitation :

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
3. Gardez le navigateur ouvert et approuvez la fenêtre de connexion lorsque OpenClaw se connecte.

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
- `tabs` répertorie vos onglets de navigateur déjà ouverts
- `snapshot` renvoie des références à partir de l'onglet en direct sélectionné

Ce qu'il faut vérifier si l'attachement ne fonctionne pas :

- le navigateur cible basé sur Chromium est en version `144+`
- le débogage à distance est activé dans la page d'inspection de ce navigateur
- le navigateur a affiché et vous avez accepté l'invite de consentement d'attachement
- `openclaw doctor` migre l'ancienne configuration du navigateur basée sur une extension et vérifie que
  Chrome est installé localement pour les profils de connexion automatique par défaut, mais il ne peut pas
  activer le débogage à distance du côté du navigateur pour vous

Utilisation par l'agent :

- Utilisez `profile="user"` lorsque vous avez besoin de l'état du navigateur connecté de l'utilisateur.
- Si vous utilisez un profil de session existant personnalisé, passez ce nom de profil explicite.
- Ne choisissez ce mode que lorsque l'utilisateur est devant l'ordinateur pour approuver l'invite d'attachement.
- le Gateway ou l'hôte du nœud peut lancer `npx chrome-devtools-mcp@latest --autoConnect`

Notes :

- Cette méthode est plus risquée que le profil isolé `openclaw` car elle peut agir au sein de votre session de navigateur connectée.
- OpenClaw ne lance pas le navigateur pour ce pilote ; il s'attache uniquement.
- OpenClaw utilise ici le flux officiel `--autoConnect` du Chrome DevTools MCP. Si `userDataDir` est défini, il est transmis pour cibler ce répertoire de données utilisateur.
- La session existante peut s'attacher sur l'hôte sélectionné ou via un nœud de navigateur connecté. Si Chrome se trouve ailleurs et qu'aucun nœud de navigateur n'est connecté, utilisez plutôt un CDP distant ou un hôte de nœud.

### Lancement personnalisé de Chrome MCP

Remplacez le serveur MCP Chrome DevTools généré par profil lorsque le flux
par défaut `npx chrome-devtools-mcp@latest` ne vous convient pas (hôteurs hors ligne,
versions épinglées, binaires intégrés) :

| Champ        | Ce qu'il fait                                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `mcpCommand` | Exécutable à lancer à la place de `npx`. Résolu tel quel ; les chemins absolus sont respectés.                                   |
| `mcpArgs`    | Tableau d'arguments passé tel quel à `mcpCommand`. Remplace les arguments par défaut `chrome-devtools-mcp@latest --autoConnect`. |

Lorsque `cdpUrl` est défini sur un profil de session existante, OpenClaw ignore
`--autoConnect` et transmet automatiquement le point de terminaison à Chrome MCP :

- `http(s)://...` → `--browserUrl <url>` (point de terminaison de découverte HTTP DevTools).
- `ws(s)://...` → `--wsEndpoint <url>` (WebSocket CDP direct).

Les indicateurs de point de terminaison et `userDataDir` ne peuvent pas être combinés : lorsque `cdpUrl` est défini, `userDataDir` est ignoré pour le lancement de Chrome MCP, car Chrome MCP s'attache au navigateur en cours d'exécution derrière le point de terminaison plutôt que d'ouvrir un répertoire de profil.

<Accordion title="Limitations des fonctionnalités de session existante">

Par rapport au profil géré `openclaw`, les pilotes de session existante sont plus limités :

- **Captures d'écran** - les captures de page et les captures d'élément `--ref` fonctionnent ; les sélecteurs CSS `--element` ne fonctionnent pas. `--full-page` ne peut pas être combiné avec `--ref` ou `--element`. Playwright n'est pas requis pour les captures d'écran de page ou d'élément basées sur une référence.
- **Actions** - `click`, `type`, `hover`, `scrollIntoView`, `drag` et `select` nécessitent des références de snapshot (pas de sélecteurs CSS). `click-coords` clique sur les coordonnées de la fenêtre d'affichage visibles et ne nécessite pas de référence de snapshot. `click` est pour le bouton gauche uniquement. `type` ne prend pas en charge `slowly=true` ; utilisez `fill` ou `press`. `press` ne prend pas en charge `delayMs`. `type`, `hover`, `scrollIntoView`, `drag`, `select`, `fill` et `evaluate` ne prennent pas en charge les délais d'attente par appel. `select` accepte une seule valeur.
- **Attente / téléchargement / boîte de dialogue** - `wait --url` prend en charge les modèles exacts, de sous-chaîne et globaux ; `wait --load networkidle` n'est pas pris en charge. Les hooks de téléchargement nécessitent `ref` ou `inputRef`, un fichier à la fois, pas de CSS `element`. Les hooks de boîte de dialogue ne prennent pas en charge les remplacements de délai d'attente ou `dialogId`.
- **Visibilité de la boîte de dialogue** - Les réponses d'action du navigateur géré incluent `blockedByDialog` et `browserState.dialogs.pending` lorsqu'une action ouvre une boîte de dialogue modale ; les snapshots incluent également l'état de la boîte de dialogue en attente. Répondez avec `browser dialog --accept/--dismiss --dialog-id <id>` lorsqu'une boîte de dialogue est en attente. Les boîtes de dialogue gérées en dehors d'OpenClaw apparaissent sous `browserState.dialogs.recent`.
- **Fonctionnalités gérées uniquement** - les actions par lot, l'exportation PDF, l'interception des téléchargements et `responsebody` nécessitent toujours le chemin du navigateur géré.

</Accordion>

## Garanties d'isolation

- **Répertoire de données utilisateur dédié** : ne touche jamais à votre profil de navigateur personnel.
- **Ports dédiés** : évite `9222` pour prévenir les collisions avec les flux de travail de développement.
- **Contrôle déterministe des onglets** : `tabs` renvoie d'abord `suggestedTargetId`, puis
  des handles stables `tabId` comme `t1`, des étiquettes optionnelles, et l'`targetId` brut.
  Les agents doivent réutiliser `suggestedTargetId` ; les ids bruts restent disponibles pour
  le débogage et la compatibilité.

## Sélection du navigateur

Lors du lancement en local, OpenClaw choisit le premier disponible :

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

Vous pouvez remplacer avec `browser.executablePath`.

Plateformes :

- macOS : vérifie macOS`/Applications` et `~/Applications`.
- Linux : vérifie les emplacements courants de Chrome/Brave/Edge/Chromium sous LinuxBrave`/usr/bin`,
  `/snap/bin`, `/opt/google`, `/opt/brave.com`, `/usr/lib/chromium`, et
  `/usr/lib/chromium-browser`, ainsi que le Chromium géré par Playwright sous
  `PLAYWRIGHT_BROWSERS_PATH` ou `~/.cache/ms-playwright`.
- Windows : vérifie les emplacements d'installation courants.

## API de contrôle (optionnel)

Pour le scriptage et le débogage, le GatewayAPI expose une petite **API de contrôle HTTP
uniquement en boucle locale** ainsi qu'une CLIAPI correspondante `openclaw browser` (instantanés, références, améliorations
d'attente, sortie JSON, flux de travail de débogage). Consultez
[API de contrôle du navigateur](/fr/tools/browser-control) pour la référence complète.

## Dépannage

Pour les problèmes spécifiques à Linux (surtout snap Chromium), consultez
[Dépannage du navigateur](/fr/tools/browser-linux-troubleshooting).

Pour les configurations à hôtes séparés avec WSL2 Gateway + Chrome Windows, consultez
[WSL2 + Windows + dépannage CDP Chrome distant](/fr/tools/browser-wsl2-windows-remote-cdp-troubleshooting).

### Échec du démarrage CDP vs blocage SSRF de navigation

Il s'agit de différentes classes d'échecs qui pointent vers différents chemins de code.

- **Échec du démarrage ou de la disponibilité CDP** signifie qu'OpenClaw ne peut pas confirmer que le plan de contrôle du navigateur est sain.
- **Blocage SSRF de navigation** signifie que le plan de contrôle du navigateur est sain, mais qu'une cible de navigation de page est rejetée par la stratégie.

Exemples courants :

- Échec du démarrage ou de la disponibilité CDP :
  - `Chrome CDP websocket for profile "openclaw" is not reachable after start`
  - `Remote CDP for profile "<name>" is not reachable at <cdpUrl>`
  - `Port <port> is in use for profile "<name>" but not by openclaw` lorsqu'un
    service CDP externe en boucle locale est configuré sans `attachOnly: true`
- Blocage SSRF de navigation :
  - `open`, `navigate`, snapshot ou les flux d'ouverture d'onglet échouent avec une erreur de stratégie navigateur/réseau alors que `start` et `tabs` fonctionnent toujours

Utilisez cette séquence minimale pour distinguer les deux :

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

Comment interpréter les résultats :

- Si `start` échoue avec `not reachable after start`, dépannez d'abord la disponibilité du CDP.
- Si `start` réussit mais que `tabs` échoue, le plan de contrôle est encore défaillant. Traitez cela comme un problème d'accessibilité du CDP, et non comme un problème de navigation de page.
- Si `start` et `tabs` réussissent mais que `open` ou `navigate` échoue, le plan de contrôle du navigateur est opérationnel et l'échec provient de la stratégie de navigation ou de la page cible.
- Si `start`, `tabs` et `open` réussissent tous, le chemin de contrôle de base du navigateur géré est sain.

Détails importants du comportement :

- La configuration du navigateur par défaut est un objet de stratégie SSRF échouant par défaut (fail-closed), même si vous ne configurez pas `browser.ssrfPolicy`.
- Pour le profil géré `openclaw` en boucle locale, les vérifications de santé CDP ignorent intentionnellement l'application de l'accessibilité SSRF du navigateur pour le plan de contrôle local d'OpenClaw.
- La protection de navigation est distincte. Un résultat `start` ou `tabs` réussi ne signifie pas qu'une cible `open` ou `navigate` ultérieure est autorisée.

Conseils de sécurité :

- N'assouplissez **pas** la stratégie SSRF du navigateur par défaut.
- Préférez des exceptions d'hôte étroites telles que `hostnameAllowlist` ou `allowedHostnames` plutôt qu'un accès large au réseau privé.
- Utilisez `dangerouslyAllowPrivateNetwork: true` uniquement dans des environnements approuvés de manière intentionnelle, où l'accès du navigateur au réseau privé est nécessaire et a été examiné.

## Outils de l'agent + fonctionnement du contrôle

L'agent dispose d'**un seul outil** pour l'automatisation du navigateur :

- `browser` - doctor/status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

Comment cela s'applique :

- `browser snapshot` renvoie une arborescence d'interface utilisateur stable (IA ou ARIA).
- `browser act` utilise les `ref` d'identifiants de l'instantané pour cliquer/tirer/glisser/sélectionner.
- `browser screenshot` capture les pixels (page entière, élément ou références étiquetées).
- `browser doctor` vérifie la disponibilité du Gateway, du plugin, du profil, du navigateur et de l'onglet.
- `browser` accepte :
  - `profile` pour choisir un profil de navigateur nommé (openclaw, chrome ou CDP distant).
  - `target` (`sandbox` | `host` | `node`) pour sélectionner l'emplacement du navigateur.
  - Dans les sessions sandboxed, `target: "host"` nécessite `agents.defaults.sandbox.browser.allowHostControl=true`.
  - Si `target` est omis : les sessions sandboxed sont par défaut `sandbox`, les sessions non-sandbox sont par défaut `host`.
  - Si un nœud compatible navigateur est connecté, l'outil peut s'y router automatiquement sauf si vous épinglez `target="host"` ou `target="node"`.

Cela permet de garder l'agent déterministe et d'éviter les sélecteurs fragiles.

## Connexe

- [Aperçu des outils](/fr/tools) - tous les outils d'agent disponibles
- [Sandboxing](/fr/gateway/sandboxing) - contrôle du navigateur dans les environnements sandboxed
- [Sécurité](/fr/gateway/security) - risques et durcissement du contrôle du navigateur
