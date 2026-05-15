---
summary: "GatewayOpenClawRéférence de configuration du Gateway pour les clés core OpenClaw, les valeurs par défaut et les liens vers les références des sous-systèmes dédiés"
title: "Référence de configuration"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

Référence de configuration principale pour `~/.openclaw/openclaw.json`. Pour une vue d'ensemble orientée tâche, voir [Configuration](/fr/gateway/configuration).

Couvre les principales surfaces de configuration OpenClaw et renvoie vers des liens lorsqu'un sous-système possède sa propre référence approfondie. Les catalogues de commandes propriétaires aux canaux et plugins, ainsi que les paramètres avancés de mémoire/QMD, résident sur leurs propres pages plutôt que sur celle-ci.

Vérité du code :

- `openclaw config schema` affiche le JSON Schema dynamique utilisé pour la validation et l'interface utilisateur de contrôle, avec les métadonnées intégrées/plugin/canal fusionnées lorsque disponibles
- `config.schema.lookup` renvoie un nœud de schema avec portée de chemin pour les outils de forage
- `pnpm config:docs:check` / `pnpm config:docs:gen` valident le hash de base du document de configuration par rapport à la surface du schéma actuel

Chemin de recherche de l'agent : utilisez l'action du tool `gateway` `config.schema.lookup` pour
la documentation et les contraintes exactes au niveau du champ avant les modifications. Utilisez
[Configuration](/fr/gateway/configuration) pour une guidage orienté tâche et cette page
pour la carte des champs élargie, les valeurs par défaut, et les liens vers les références des sous-systèmes.

Références approfondies dédiées :

- [Référence de configuration de la mémoire](/fr/reference/memory-config) pour `agents.defaults.memorySearch.*`, `memory.qmd.*`, `memory.citations`, et la configuration de rêve sous `plugins.entries.memory-core.config.dreaming`
- [Commandes slash](/fr/tools/slash-commands) pour le catalogue de commandes actuel intégré + groupé
- pages de propriétaire de channel/plugin pour les surfaces de commandes spécifiques aux channels

Le format de configuration est **JSON5** (commentaires et virgules de fin autorisés). Tous les champs sont optionnels - OpenClaw utilise des valeurs par défaut sûres en cas d'omission.

---

## Channels

Les clés de configuration par canal ont été déplacées vers une page dédiée - voir
[Configuration - canaux](/fr/gateway/config-channels) pour `channels.*`,
y compris Slack, Discord, Telegram, WhatsApp, Matrix, iMessage et autres
canaux groupés (auth, contrôle d'accès, multi-compte, filtrage des mentions).

## Valeurs par défaut de l'agent, multi-agent, sessions et messages

Déplacé vers une page dédiée - voir
[Configuration - agents](/fr/gateway/config-agents) pour :

- `agents.defaults.*` (espace de travail, modèle, réflexion, heartbeat, mémoire, média, compétences, bac à sable)
- `multiAgent.*` (routage multi-agent et liaisons)
- `session.*` (cycle de vie de session, compactage, élagage)
- `messages.*` (livraison des messages, TTS, rendu markdown)
- `talk.*` (Mode Talk)
  - `talk.consultThinkingLevel` : substitution du niveau de réflexion pour l'exécution complète de l'agent OpenClaw lors des consultations en temps réel Talk de l'interface de contrôle
  - `talk.consultFastMode` : substitution ponctuelle en mode rapide pour les consultations en temps réel Talk de l'interface de contrôle
  - `talk.speechLocale` : identifiant de locale BCP 47 optionnel pour la reconnaissance vocale Talk sur iOS/macOS
  - `talk.silenceTimeoutMs` : si non défini, Talk conserve la fenêtre de pause par défaut de la plateforme avant d'envoyer la transcription (`700 ms on macOS and Android, 900 ms on iOS`)

## Outils et fournisseurs personnalisés

La stratégie d'outil, les commutateurs expérimentaux, la configuration des outils soutenus par le fournisseur et la configuration du fournisseur personnalisé / de l'URL de base ont été déplacés vers une page dédiée - voir
[Configuration - outils et fournisseurs personnalisés](/fr/gateway/config-tools).

## Modèles

Les définitions de fournisseur, les listes d'autorisation de modèles et la configuration des fournisseurs personnalisés se trouvent dans
[Configuration - outils et fournisseurs personnalisés](/fr/gateway/config-tools#custom-providers-and-base-urls).
La racine `models` gère également le comportement global du catalogue de modèles.

```json5
{
  models: {
    // Optional. Default: true. Requires a Gateway restart when changed.
    pricing: { enabled: false },
  },
}
```

- `models.mode` : comportement du catalogue de fournisseurs (`merge` ou `replace`).
- `models.providers` : mappage de fournisseur personnalisé indexé par l'identifiant du fournisseur.
- `models.pricing.enabled` : contrôle l'amorçage de la tarification en arrière-plan qui
  démarre après que les sidecars et les canaux ont atteint le chemin de disponibilité Gateway. Lorsque `false`,
  le Gateway ignore les récupérations de catalogue de tarification OpenRouter et LiteLLM ; les valeurs configurées
  `models.providers.*.models[].cost` fonctionnent toujours pour les estimations de coûts locaux.

## MCP

Les définitions de serveurs MCP gérés par OpenClaw se trouvent sous OpenClaw`mcp.servers` et sont
consommées par Pi intégré et autres adaptateurs d'exécution. Les commandes `openclaw mcp list`,
`show`, `set` et `unset` gèrent ce bloc sans se connecter au
serveur cible lors des modifications de configuration.

```json5
{
  mcp: {
    // Optional. Default: 600000 ms (10 minutes). Set 0 to disable idle eviction.
    sessionIdleTtlMs: 600000,
    servers: {
      docs: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-fetch"],
      },
      remote: {
        url: "https://example.com/mcp",
        transport: "streamable-http", // streamable-http | sse
        headers: {
          Authorization: "Bearer ${MCP_REMOTE_TOKEN}",
        },
      },
    },
  },
}
```

- `mcp.servers` : définitions nommées de serveurs MCP stdio ou distants pour les runtimes qui
  exposent les outils MCP configurés.
  Les entrées distantes utilisent `transport: "streamable-http"` ou `transport: "sse"` ;
  `type: "http"`CLI est un alias natif de la CLI que `openclaw mcp set` et
  `openclaw doctor --fix` normalisent dans le champ canonique `transport`.
- `mcp.sessionIdleTtlMs` : TTL d'inactivité pour les runtimes MCP regroupés (bundled) limités à la session.
  Les exécutions intégrées ponctuelles demandent un nettoyage en fin d'exécution ; ce TTL est le filet de sécurité pour
  les sessions de longue durée et les futurs appelants.
- Les modifications sous `mcp.*` sont appliquées à chaud (hot-apply) en supprimant les runtimes MCP de session mis en cache.
  La prochaine découverte/utilisation d'outil les recrée à partir de la nouvelle configuration, donc les entrées `mcp.servers`
  supprimées sont récupérées immédiatement au lieu d'attendre le TTL d'inactivité.

Consultez [MCP](/fr/cli/mcp#openclaw-as-an-mcp-client-registryCLI) et
[Backends CLI](/fr/gateway/cli-backends#bundle-mcp-overlays) pour le comportement d'exécution.

## Skills

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun
      allowUploadedArchives: false,
    },
    entries: {
      "image-lab": {
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

- `allowBundled` : liste d'autorisation (allowlist) optionnelle uniquement pour les compétences regroupées (bundled skills) (les compétences gérées/espace de travail ne sont pas concernées).
- `load.extraDirs` : racines de compétences partagées supplémentaires (la priorité la plus basse).
- `load.allowSymlinkTargets` : racines cibles réelles de confiance vers lesquelles les liens symboliques de compétences peuvent
  se résoudre lorsque le lien réside en dehors de sa racine source configurée.
- `install.preferBrew` : si vrai, préférer les installateurs Homebrew lorsque `brew` est
  disponible avant de revenir à d'autres types d'installateurs.
- `install.nodeManager` : préférence de l'installateur de nœud pour les spécifications
  `metadata.openclaw.install` (`npm` | `pnpm` | `yarn` | `bun`).
- `install.allowUploadedArchives` : autoriser les clients de confiance du `operator.admin` Gateway à installer des archives zip privées mises en scène via `skills.upload.*` (par défaut : false). Cela n'active que le chemin de l'archive téléchargée ; les installations normales ClawHub ne l'exigent pas.
- `entries.<skillKey>.enabled: false` désactive une compétence même si elle est groupée/installée.
- `entries.<skillKey>.apiKey` : commodité pour les compétences déclarant une env var principale (chaîne en texte brut ou objet SecretRef).

---

## Plugins

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    bundledDiscovery: "allowlist",
    deny: [],
    load: {
      paths: ["~/Projects/oss/voice-call-plugin"],
    },
    entries: {
      "voice-call": {
        enabled: true,
        hooks: {
          allowPromptInjection: false,
        },
        config: { provider: "twilio" },
      },
    },
  },
}
```

- Chargé depuis `~/.openclaw/extensions` , `<workspace>/.openclaw/extensions` , ainsi que `plugins.load.paths`.
- Discovery accepte les plugins natifs OpenClaw ainsi que les bundles Codex compatibles et les bundles Claude, y compris les bundles Claude sans manifeste avec la disposition par défaut.
- **Les modifications de configuration nécessitent un redémarrage de la passerelle.**
- `allow` : liste d'autorisation facultative (seuls les plugins listés sont chargés). `deny` prime.
- `bundledDiscovery` : par défaut `"allowlist"` pour les nouvelles configurations, donc une liste `plugins.allow` non vide verrouille également les plugins provider groupés, y compris les providers de runtime de recherche web. Doctor écrit `"compat"` pour les anciennes configurations de liste d'autorisation migrées afin de préserver le comportement des providers groupés existants jusqu'à ce que vous optiez pour le changement.
- `plugins.entries.<id>.apiKey` : champ de commodité pour la clé API au niveau du plugin (lorsque pris en charge par le plugin).
- `plugins.entries.<id>.env` : carte d'env var dans la portée du plugin.
- `plugins.entries.<id>.hooks.allowPromptInjection` : lorsque `false`, le cœur bloque `before_prompt_build` et ignore les champs modifiant les invites des anciens `before_agent_start`, tout en préservant les anciens `modelOverride` et `providerOverride`. S'applique aux hooks de plugins natifs et aux répertoires de hooks fournis par les bundles pris en charge.
- `plugins.entries.<id>.hooks.allowConversationAccess` : lorsque `true`, les plugins de confiance non fournis peuvent lire le contenu brut de la conversation à partir de hooks typés tels que `llm_input`, `llm_output`, `before_model_resolve`, `before_agent_reply`, `before_agent_run`, `before_agent_finalize` et `agent_end`.
- `plugins.entries.<id>.subagent.allowModelOverride` : accorder explicitement la confiance à ce plugin pour demander des remplacements `provider` et `model` par exécution pour les exécutions de sous-agent en arrière-plan.
- `plugins.entries.<id>.subagent.allowedModels` : liste d'autorisation (allowlist) facultative de cibles `provider/model` canoniques pour les remplacements de sous-agent de confiance. Utilisez `"*"` uniquement lorsque vous souhaitez intentionnellement autoriser n'importe quel modèle.
- `plugins.entries.<id>.llm.allowModelOverride` : accorder explicitement la confiance à ce plugin pour demander des remplacements de model pour `api.runtime.llm.complete`.
- `plugins.entries.<id>.llm.allowedModels` : liste de permission (allowlist) facultative des cibles `provider/model`LLM canoniques pour les remplacements de complétion LLM de plugin approuvés. Utilisez `"*"` uniquement lorsque vous souhaitez intentionnellement autoriser n'importe quel model.
- `plugins.entries.<id>.llm.allowAgentIdOverride` : accorder explicitement la confiance à ce plugin pour exécuter `api.runtime.llm.complete` sur un ID d'agent non défini par défaut.
- `plugins.entries.<id>.config`OpenClaw : objet de configuration défini par le plugin (validé par le schéma de plugin natif OpenClaw lorsque disponible).
- Les paramètres de compte/d'exécution du plugin de canal se trouvent sous `channels.<id>` et doivent être décrits par les métadonnées `channelConfigs` du manifeste du plugin propriétaire, et non par un registre d'options central OpenClaw.

### Configuration du plugin de harnais Codex

Le plugin `codex` inclus possède les paramètres natifs du harnais du serveur d'application Codex sous
`plugins.entries.codex.config`. Consultez
[Référence du harnais Codex](/fr/plugins/codex-harness-reference) pour la surface de configuration
complète et [Harnais Codex](/fr/plugins/codex-harness) pour le modèle d'exécution.

`codexPlugins` s'applique uniquement aux sessions qui sélectionnent le harnais natif Codex.
Il n'active pas les plugins Codex pour Pi, les exécutions normales du provider OpenAI, les liaisons de conversation ACP
ou tout autre harnais non-Codex.

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: false,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
                allow_destructive_actions: false,
              },
            },
          },
        },
      },
    },
  },
}
```

- `plugins.entries.codex.config.codexPlugins.enabled` : active la prise en charge native des plugins/applications
  pour le harnais Codex. Par défaut : `false`.
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions` :
  stratégie d'action destructrice par défaut pour les sollicitations d'application de plugin migrées.
  Par défaut : `false`.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.enabled` : active une
  entrée de plugin migrée lorsque le `codexPlugins.enabled` global est également vrai.
  Par défaut : `true` pour les entrées explicites.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.marketplaceName` :
  identité stable de la place de marché. V1 prend uniquement en charge `"openai-curated"`.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.pluginName` : identité
  stable du plugin Codex issue de la migration, par exemple `"google-calendar"`.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.allow_destructive_actions` :
  remplacement de l'action destructrice par plugin. Si omis, la valeur
  `allow_destructive_actions` globale est utilisée.

`codexPlugins.enabled` est la directive d'activation globale. Les entrées de plugin explicites
écrites par la migration constituent l'ensemble durable d'éligibilité pour l'installation et la réparation.
`plugins["*"]` n'est pas pris en charge, il n'y a pas d'interrupteur `install`, et les valeurs
`marketplacePath` locales ne sont intentionnellement pas des champs de configuration car elles sont
spécifiques à l'hôte.

Les vérifications de disponibilité de `app/list` sont mises en cache pendant une heure et actualisées
de manière asynchrone lorsqu'elles sont périmées. La configuration de l'application de thread Codex est calculée lors de l'établissement de la
session du harnais Codex, et non à chaque tour ; utilisez `/new`, `/reset` ou un redémarrage de la passerelle
après avoir modifié la configuration du plugin natif.

- `plugins.entries.firecrawl.config.webFetch` : paramètres du provider de récupération web Firecrawl.
  - `apiKey` : clé Firecrawl de API (accepte SecretRef). Revient à `plugins.entries.firecrawl.config.webSearch.apiKey`, l'ancien `tools.web.fetch.firecrawl.apiKey`, ou la env var `FIRECRAWL_API_KEY`.
  - `baseUrl`FirecrawlAPI : URL de base de l'API Firecrawl (par défaut : `https://api.firecrawl.dev` ; les redéfinitions auto-hébergées doivent cibler des points de terminaison privés/internes).
  - `onlyMainContent` : extraire uniquement le contenu principal des pages (par défaut : `true`).
  - `maxAgeMs` : durée maximale du cache en millisecondes (par défaut : `172800000` / 2 jours).
  - `timeoutSeconds` : délai d'expiration de la demande de scraping en secondes (par défaut : `60`).
- `plugins.entries.xai.config.xSearch` : paramètres de xAI X Search (recherche web Grok).
  - `enabled` : activer le fournisseur X Search.
  - `model` : modèle Grok à utiliser pour la recherche (par ex. `"grok-4-1-fast"`).
- `plugins.entries.memory-core.config.dreaming` : paramètres de rêve de la mémoire. Voir [Dreaming](/fr/concepts/dreaming) pour les phases et les seuils.
  - `enabled` : interrupteur principal de rêve (par défaut `false`).
  - `frequency` : cadence cron pour chaque balayage complet de rêve (`"0 3 * * *"` par défaut).
  - `model` : redéfinition facultative du modèle de sous-agent Dream Diary. Nécessite `plugins.entries.memory-core.subagent.allowModelOverride: true` ; à associer à `allowedModels` pour restreindre les cibles. Les erreurs de modèle indisponible réessaient une fois avec le modèle par défaut de la session ; les échecs de confiance ou de liste blanche ne reviennent pas silencieusement à une version précédente.
  - la politique et les seuils de phase sont des détails d'implémentation (pas des clés de configuration utilisateur).
- La configuration complète de la mémoire se trouve dans [Référence de configuration de la mémoire](/fr/reference/memory-config) :
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- Les plugins de bundle Claude activés peuvent également contribuer des valeurs par défaut Pi intégrées à partir de `settings.json`OpenClawOpenClaw ; OpenClaw les applique en tant que paramètres d'agent nettoyés, et non en tant que correctifs de configuration OpenClaw bruts.
- `plugins.slots.memory` : choisissez l'identifiant du plugin de mémoire actif, ou `"none"` pour désactiver les plugins de mémoire.
- `plugins.slots.contextEngine` : choisissez l'identifiant du plugin du moteur de contexte actif ; la valeur par défaut est `"legacy"` sauf si vous installez et sélectionnez un autre moteur.

Voir [Plugins](/fr/tools/plugin).

---

## Engagements

`commitments` contrôle la mémoire de suivi inférée : OpenClaw peut détecter les points de contrôle à partir des tours de conversation et les livrer via des exécutions de heartbeat.

- `commitments.enabled` : active l'extraction, le stockage et la livraison par heartbeat cachés LLM pour les engagements de suivi inférés. Par défaut : `false`.
- `commitments.maxPerDay` : nombre maximum d'engagements de suivi inférés livrés par session d'agent sur un jour glissant. Par défaut : `3`.

Voir [Engagements inférés](/fr/concepts/commitments).

---

## Navigateur

```json5
{
  browser: {
    enabled: true,
    evaluateEnabled: true,
    defaultProfile: "user",
    ssrfPolicy: {
      // dangerouslyAllowPrivateNetwork: true, // opt in only for trusted private-network access
      // allowPrivateNetwork: true, // legacy alias
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    tabCleanup: {
      enabled: true,
      idleMinutes: 120,
      maxTabsPerSession: 8,
      sweepMinutes: 5,
    },
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: {
        cdpPort: 18801,
        color: "#0066CC",
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      },
      user: { driver: "existing-session", attachOnly: true, color: "#00AA00" },
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
    color: "#FF4500",
    // headless: false,
    // noSandbox: false,
    // extraArgs: [],
    // executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    // attachOnly: false,
  },
}
```

- `evaluateEnabled: false` désactive `act:evaluate` et `wait --fn`.
- `tabCleanup` récupère les onglets de l'agent principal suivis après une période d'inactivité ou lorsqu'une
  session dépasse sa limite. Définissez `idleMinutes: 0` ou `maxTabsPerSession: 0` pour
  désactiver ces modes de nettoyage individuels.
- `ssrfPolicy.dangerouslyAllowPrivateNetwork` est désactivé s'il n'est pas défini, donc la navigation du navigateur reste stricte par défaut.
- Définissez `ssrfPolicy.dangerouslyAllowPrivateNetwork: true` uniquement lorsque vous faites confiance intentionnellement à la navigation du navigateur sur le réseau privé.
- En mode strict, les points de terminaison de profil CDP distants (`profiles.*.cdpUrl`) sont soumis au même blocage de réseau privé lors des vérifications d'accessibilité/découverte.
- `ssrfPolicy.allowPrivateNetwork` reste pris en charge en tant qu'alias hérité.
- En mode strict, utilisez `ssrfPolicy.hostnameAllowlist` et `ssrfPolicy.allowedHostnames` pour les exceptions explicites.
- Les profils distants sont en attachement uniquement (démarrage/arrêt/réinitialisation désactivés).
- `profiles.*.cdpUrl` accepte `http://`, `https://`, `ws://` et `wss://`OpenClaw.
  Utilisez HTTP(S) lorsque vous voulez qu'OpenClaw découvre `/json/version` ; utilisez WS(S)
  lorsque votre provider vous fournit une URL WebSocket DevTools directe.
- `remoteCdpTimeoutMs` et `remoteCdpHandshakeTimeoutMs` s'appliquent à l'accessibilité CDP
  distante et `attachOnly` ainsi qu'aux demandes d'ouverture d'onglet. Les profils de bouclage
  gérés conservent les valeurs par défaut CDP locales.
- Si un service CDP géré de manière externe est accessible via le bouclage, définissez le `attachOnly: true`OpenClaw
  de ce profil ; sinon, OpenClaw traite le port de bouclage comme un profil de navigateur géré localement
  et peut signaler des erreurs de possession de port local.
- Les profils `existing-session` utilisent Chrome MCP au lieu de CDP et peuvent se connecter
  sur l'hôte sélectionné ou via un nœud de navigateur connecté.
- Les profils `existing-session` peuvent définir `userDataDir`Brave pour cibler un profil de navigateur
  spécifique basé sur Chromium tel que Brave ou Edge.
- Les profils `existing-session` conservent les limites d'itinéraire actuelles de Chrome MCP :
  actions basées sur des instantanés/références au lieu du ciblage par sélecteur CSS, hooks de téléchargement
  de fichier unique, aucune substitution de délai d'attente de boîte de dialogue, pas de `wait --load networkidle`
  et pas de `responsebody`, d'exportation PDF, d'interception de téléchargement ou d'actions par lots.
- Les profils `openclaw` gérés localement assignent automatiquement `cdpPort` et `cdpUrl` ;
  ne définissez `cdpUrl` explicitement que pour le CDP distant.
- Les profils gérés localement peuvent définir `executablePath` pour remplacer le `browser.executablePath`Brave
  global pour ce profil. Utilisez ceci pour exécuter un profil dans Chrome et un autre dans Brave.
- Les profils gérés localement utilisent `browser.localLaunchTimeoutMs` pour la découverte HTTP Chrome CDP après le démarrage du processus et `browser.localCdpReadyTimeoutMs` pour la disponibilité du websocket CDP après le lancement. Augmentez-les sur les hôtes plus lents où Chrome démarre correctement mais où les vérifications de disponibilité entrent en compétition avec le démarrage. Les deux valeurs doivent être des entiers positifs jusqu'à `120000` ms ; les valeurs de configuration non valides sont rejetées.
- Ordre de détection automatique : navigateur par défaut s'il est basé sur Chromium → Chrome → Brave → Edge → Chromium → Chrome Canary.
- `browser.executablePath` et `browser.profiles.<name>.executablePath` acceptent tous les deux `~` et `~/...` pour votre répertoire personnel du système d'exploitation avant le lancement de Chromium. Le `userDataDir` par profil sur les profils `existing-session` est également développé avec un tilde.
- Service de contrôle : boucle locale uniquement (port dérivé de `gateway.port`, par défaut `18791`).
- `extraArgs` ajoute des indicateurs de lancement supplémentaires au démarrage local de Chromium (par exemple `--disable-gpu`, la dimension de la fenêtre ou les indicateurs de débogage).

---

## IU

```json5
{
  ui: {
    seamColor: "#FF4500",
    assistant: {
      name: "OpenClaw",
      avatar: "CB", // emoji, short text, image URL, or data URI
    },
  },
}
```

- `seamColor` : couleur d'accentuation pour l'interface utilisateur de l'application native (teinte de la bulle Mode Talk, etc.).
- `assistant` : remplacement de l'identité de l'interface utilisateur de contrôle. Revient à l'identité de l'agent actif.

---

## Gateway

```json5
{
  gateway: {
    mode: "local", // local | remote
    port: 18789,
    bind: "loopback",
    auth: {
      mode: "token", // none | token | password | trusted-proxy
      token: "your-token",
      // password: "your-password", // or OPENCLAW_GATEWAY_PASSWORD
      // trustedProxy: { userHeader: "x-forwarded-user" }, // for mode=trusted-proxy; see /gateway/trusted-proxy-auth
      allowTailscale: true,
      rateLimit: {
        maxAttempts: 10,
        windowMs: 60000,
        lockoutMs: 300000,
        exemptLoopback: true,
      },
    },
    tailscale: {
      mode: "off", // off | serve | funnel
      resetOnExit: false,
    },
    controlUi: {
      enabled: true,
      basePath: "/openclaw",
      // root: "dist/control-ui",
      // embedSandbox: "scripts", // strict | scripts | trusted
      // allowExternalEmbedUrls: false, // dangerous: allow absolute external http(s) embed URLs
      // chatMessageMaxWidth: "min(1280px, 82%)", // optional grouped chat message max-width
      // allowedOrigins: ["https://control.example.com"], // required for non-loopback Control UI
      // dangerouslyAllowHostHeaderOriginFallback: false, // dangerous Host-header origin fallback mode
      // allowInsecureAuth: false,
      // dangerouslyDisableDeviceAuth: false,
    },
    remote: {
      url: "ws://gateway.tailnet:18789",
      transport: "ssh", // ssh | direct
      token: "your-token",
      // password: "your-password",
    },
    trustedProxies: ["10.0.0.1"],
    // Optional. Default false.
    allowRealIpFallback: false,
    nodes: {
      pairing: {
        // Optional. Default unset/disabled.
        autoApproveCidrs: ["192.168.1.0/24", "fd00:1234:5678::/64"],
      },
      allowCommands: ["canvas.navigate"],
      denyCommands: ["system.run"],
    },
    tools: {
      // Additional /tools/invoke HTTP denies
      deny: ["browser"],
      // Remove tools from the default HTTP deny list
      allow: ["gateway"],
    },
    push: {
      apns: {
        relay: {
          baseUrl: "https://relay.example.com",
          timeoutMs: 10000,
        },
      },
    },
  },
}
```

<Accordion title="Détails des champs du Gateway">

- `mode` : `local` (exécuter la passerelle) ou `remote` (se connecter à une passerelle distante). Le Gateway refuse de démarrer sauf si `local`.
- `port` : port unique multiplexé pour WS + HTTP. Priorité : `--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`.
- `bind` : `auto`, `loopback` (par défaut), `lan` (`0.0.0.0`), `tailnet` (IP Tailscale uniquement), ou `custom`.
- **Alias de liaison hérités** : utilisez les valeurs du mode de liaison dans `gateway.bind` (`auto`, `loopback`, `lan`, `tailnet`, `custom`), et non les alias d'hôte (`0.0.0.0`, `127.0.0.1`, `localhost`, `::`, `::1`).
- **Note Docker** : la liaison `loopback` par défaut écoute sur `127.0.0.1` à l'intérieur du conteneur. Avec le réseau pont Docker (`-p 18789:18789`), le trafic arrive sur `eth0`, donc la passerelle est inaccessible. Utilisez `--network host`, ou définissez `bind: "lan"` (ou `bind: "custom"` avec `customBindHost: "0.0.0.0"`) pour écouter sur toutes les interfaces.
- **Authentification** : requise par défaut. Les liaisons non-bouclage nécessitent une authentification de passerelle. En pratique, cela signifie un jeton/mot de passe partagé ou un proxy inverse sensible à l'identité avec `gateway.auth.mode: "trusted-proxy"`. L'assistant d'intégration génère un jeton par défaut.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés (y compris les SecretRefs), définissez `gateway.auth.mode` explicitement à `token` ou `password`. Les flux de démarrage et d'installation/réparation du service échouent lorsque les deux sont configurés et que le mode n'est pas défini.
- `gateway.auth.mode: "none"` : mode sans authentification explicite. À utiliser uniquement pour les configurations de bouclage local de confiance ; ce mode n'est intentionnellement pas proposé par les invites d'intégration.
- `gateway.auth.mode: "trusted-proxy"` : déléguer l'authentification du navigateur/utilisateur à un proxy inverse sensible à l'identité et faire confiance aux en-têtes d'identité provenant de `gateway.trustedProxies` (voir [Authentification de proxy de confiance](/fr/gateway/trusted-proxy-auth)). Ce mode s'attend par défaut à une source de proxy **non-bouclage** ; les proxys inverses de bouclage sur le même hôte nécessitent un `gateway.auth.trustedProxy.allowLoopback = true` explicite. Les appelants internes sur le même hôte peuvent utiliser `gateway.auth.password` comme repli direct local ; `gateway.auth.token` reste mutuellement exclusif avec le mode de proxy de confiance.
- `gateway.auth.allowTailscale` : lorsque `true`, les en-têtes d'identité Tailscale Serve peuvent satisfaire l'authentification de l'interface de contrôle/WebSocket (vérifiée via `tailscale whois`). Les points de terminaison de l'API HTTP n'utilisent **pas** cette authentification par en-tête Tailscale ; ils suivent plutôt le mode d'authentification HTTP normal de la passerelle. Ce flux sans jeton suppose que l'hôte de la passerelle est de confiance. La valeur par défaut est `true` lorsque `tailscale.mode = "serve"`.
- `gateway.auth.rateLimit` : limiteur optionnel d'échec d'authentification. S'applique par adresse IP client et par portée d'authentification (secret partagé et jeton d'appareil sont suivis indépendamment). Les tentatives bloquées renvoient `429` + `Retry-After`.
  - Sur le chemin asynchrone de l'interface de contrôle Tailscale Serve, les tentatives échouées pour le même `{scope, clientIp}` sont sérialisées avant l'écriture de l'échec. Par conséquent, les mauvaises tentatives simultanées du même client peuvent déclencher le limiteur dès la deuxième demande au lieu que les deux se déroulent comme des simples inadéquations.
  - `gateway.auth.rateLimit.exemptLoopback` est par défaut `true` ; définissez `false` si vous souhaitez intentionnellement limiter le débit du trafic localhost également (pour les configurations de test ou les déploiements de proxy stricts).
- Les tentatives d'authentification WS d'origine navigateur sont toujours limitées avec l'exemption de bouclage désactivée (défense en profondeur contre les attaques par force brute localhost basées sur le navigateur).
- Sur le bouclage, ces verrouillages d'origine navigateur sont isolés par valeur `Origin`
  normalisée, de sorte que les échecs répétés d'une origine localhost ne verrouillent pas
  automatiquement une autre origine.
- `tailscale.mode` : `serve` (tailnet uniquement, liaison de bouclage) ou `funnel` (public, nécessite une authentification).
- `tailscale.preserveFunnel` : lorsque `true` et `tailscale.mode = "serve"`, OpenClaw
  vérifie `tailscale funnel status` avant de réappliquer Serve au démarrage et l'ignore
  si une route Funnel configurée en externe couvre déjà le port de la passerelle.
  Valeur par défaut `false`.
- `controlUi.allowedOrigins` : liste d'autorisation d'origine navigateur explicite pour les connexions WebSocket du Gateway. Requis lorsque des clients navigateur sont attendus depuis des origines non-bouclage.
- `controlUi.chatMessageMaxWidth` : largeur maximale optionnelle pour les messages de chat groupés de l'interface de contrôle. Accepte des valeurs de largeur CSS contraintes telles que `960px`, `82%`, `min(1280px, 82%)` et `calc(100% - 2rem)`.
- `controlUi.dangerouslyAllowHostHeaderOriginFallback` : mode dangereux qui active le repli d'origine d'en-tête Host pour les déploiements qui s'appuient intentionnellement sur la stratégie d'origine d'en-tête Host.
- `remote.transport` : `ssh` (par défaut) ou `direct` (ws/wss). Pour `direct`, `remote.url` doit être `ws://` ou `wss://`.
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` : substitution de bris de verre côté client
  de l'environnement de processus qui permet le `ws://` en clair vers des IP de réseau privé
  de confiance ; la valeur par défaut reste uniquement bouclage pour le texte en clair. Il n'y a pas d'équivalent `openclaw.json`,
  et la configuration de réseau privé du navigateur telle que
  `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` n'affecte pas les clients WebSocket
  du Gateway.
- `gateway.remote.token` / `.password` sont des champs d'identification pour les clients distants. Ils ne configurent pas l'authentification de la passerelle par eux-mêmes.
- `gateway.push.apns.relay.baseUrl` : URL HTTPS de base pour le relais APNs externe utilisé par les versions officielles/TestFlight iOS après avoir publié des inscriptions prises en charge par le relais vers la passerelle. Cette URL doit correspondre à l'URL du relais compilée dans la version iOS.
- `gateway.push.apns.relay.timeoutMs` : délai d'envoi de la passerelle au relais en millisecondes. La valeur par défaut est `10000`.
- Les inscriptions prises en charge par le relais sont déléguées à une identité de passerelle spécifique. L'application iOS couplée récupère `gateway.identity.get`, inclut cette identité dans l'inscription au relais et transfère une autorisation d'envoi limitée à l'inscription à la passerelle. Une autre passerelle ne peut pas réutiliser cette inscription stockée.
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS` : substitutions d'environnement temporaires pour la configuration de relais ci-dessus.
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` : échappatoire de développement uniquement pour les URL de relais HTTP de bouclage. Les URL de relais de production doivent rester en HTTPS.
- `gateway.handshakeTimeoutMs` : délai d'expiration de la poignée de main WebSocket du Gateway pré-authentification en millisecondes. Par défaut : `15000`. `OPENCLAW_HANDSHAKE_TIMEOUT_MS` a priorité lorsqu'il est défini. Augmentez cette valeur sur les hôtes surchargés ou peu puissants où les clients locaux peuvent se connecter pendant que le démarrage est encore en cours de stabilisation.
- `gateway.channelHealthCheckMinutes` : intervalle de surveillance de santé du channel en minutes. Définissez `0` pour désactiver les redémarrages de surveillance de santé globalement. Par défaut : `5`.
- `gateway.channelStaleEventThresholdMinutes` : seuil de socket périmé en minutes. Gardez cette valeur supérieure ou égale à `gateway.channelHealthCheckMinutes`. Par défaut : `30`.
- `gateway.channelMaxRestartsPerHour` : nombre maximum de redémarrages de surveillance de santé par channel/compte sur une heure glissante. Par défaut : `10`.
- `channels.<provider>.healthMonitor.enabled` : option de refus par channel pour les redémarrages de surveillance de santé tout en gardant le moniteur global activé.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled` : substitution par compte pour les channels multi-comptes. Lorsqu'il est défini, il a priorité sur la substitution au niveau du channel.
- Les chemins d'appel de passerelle locale peuvent utiliser `gateway.remote.*` comme repli uniquement lorsque `gateway.auth.*` n'est pas défini.
- Si `gateway.auth.token` / `gateway.auth.password` est explicitement configuré via SecretRef et non résolu, la résolution échoue en mode fermé (aucun masquage de repli distant).
- `trustedProxies` : adresses IP de proxy inverse qui terminent le TLS ou injectent des en-têtes de client transférés. Ne listez que les proxys que vous contrôlez. Les entrées de bouclage sont toujours valides pour les configurations de proxy/détection locale sur le même hôte (par exemple Tailscale Serve ou un proxy inverse local), mais elles ne rendent **pas** les requêtes de bouclage éligibles pour `gateway.auth.mode: "trusted-proxy"`.
- `allowRealIpFallback` : lorsque `true`, la passerelle accepte `X-Real-IP` si `X-Forwarded-For` est manquant. Par défaut `false` pour un comportement d'échec fermé.
- `gateway.nodes.pairing.autoApproveCidrs` : liste d'autorisation CIDR/IP optionnelle pour approuver automatiquement le premier jumelage d'appareil nœud sans portées demandées. Elle est désactivée si non définie. Cela n'approuve pas automatiquement le jumelage opérateur/navigateur/interface de contrôle/WebChat, et cela n'approuve pas automatiquement les mises à niveau de rôle, de portée, de métadonnées ou de clé publique.
- `gateway.nodes.allowCommands` / `gateway.nodes.denyCommands` : façonnage global d'autorisation/refus pour les commandes de nœud déclarées après le jumelage et l'évaluation de la liste d'autorisation de la plateforme. Utilisez `allowCommands` pour opter pour des commandes de nœud dangereuses telles que `camera.snap`, `camera.clip` et `screen.record` ; `denyCommands` supprime une commande même si une autorisation par défaut de plateforme ou explicite l'inclurait autrement. Après qu'un nœud a modifié sa liste de commandes déclarées, refusez et approuvez à nouveau ce jumelage d'appareil afin que la passerelle stocke l'instantané de commandes mis à jour.
- `gateway.tools.deny` : noms d'outils supplémentaires bloqués pour `POST /tools/invoke` HTTP (étend la liste de refus par défaut).
- `gateway.tools.allow` : supprimer des noms d'outils de la liste de refus HTTP par défaut.

</Accordion>

### Points de terminaison compatibles OpenAI

- Chat Completions : désactivé par défaut. Activez avec `gateway.http.endpoints.chatCompletions.enabled: true`.
- API des réponses : `gateway.http.endpoints.responses.enabled`.
- Durcissement de l'entrée URL des réponses :
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    Les listes d'autorisation (allowlists) vides sont traitées comme non définies ; utilisez `gateway.http.endpoints.responses.files.allowUrl=false`
    et/ou `gateway.http.endpoints.responses.images.allowUrl=false` pour désactiver la récupération d'URL.
- En-tête optionnel de durcissement de la réponse :
  - `gateway.http.securityHeaders.strictTransportSecurity` (définissez uniquement pour les origines HTTPS que vous contrôlez ; voir [Trusted Proxy Auth](/fr/gateway/trusted-proxy-auth#tls-termination-and-hsts))

### Isolation multi-instance

Exécutez plusieurs passerelles sur un même hôte avec des ports et des répertoires d'état uniques :

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

Indicateurs de commodité : `--dev` (utilise `~/.openclaw-dev` + port `19001`), `--profile <name>` (utilise `~/.openclaw-<name>`).

Voir [Multiple Gateways](/fr/gateway/multiple-gateways).

### `gateway.tls`

```json5
{
  gateway: {
    tls: {
      enabled: false,
      autoGenerate: false,
      certPath: "/etc/openclaw/tls/server.crt",
      keyPath: "/etc/openclaw/tls/server.key",
      caPath: "/etc/openclaw/tls/ca-bundle.crt",
    },
  },
}
```

- `enabled` : active la terminaison TLS au niveau de l'écouteur de la passerelle (HTTPS/WSS) (par défaut : `false`).
- `autoGenerate` : génère automatiquement une paire de certificats/clés locaux auto-signés lorsque des fichiers explicites ne sont pas configurés ; pour un usage local/dev uniquement.
- `certPath` : chemin du système de fichiers vers le fichier de certificat TLS.
- `keyPath` : chemin du système de fichiers vers le fichier de clé privée TLS ; gardez-le restreint en permissions.
- `caPath` : chemin facultatif du bundle de CA pour la vérification du client ou les chaînes de confiance personnalisées.

### `gateway.reload`

```json5
{
  gateway: {
    reload: {
      mode: "hybrid", // off | restart | hot | hybrid
      debounceMs: 500,
      deferralTimeoutMs: 300000,
    },
  },
}
```

- `mode` : contrôle la manière dont les modifications de configuration sont appliquées lors de l'exécution.
  - `"off"` : ignorer les modifications en direct ; les changements nécessitent un redémarrage explicite.
  - `"restart"` : redémarrer toujours le processus de la passerelle lors d'un changement de configuration.
  - `"hot"` : appliquer les modifications en processus sans redémarrage.
  - `"hybrid"` (par défaut) : essayer d'abord le rechargement à chaud (hot reload) ; revenir au redémarrage si nécessaire.
- `debounceMs` : fenêtre de rebond en ms avant l'application des modifications de configuration (entier non négatif).
- `deferralTimeoutMs` : temps maximal optionnel en ms d'attente des opérations en cours avant de forcer un redémarrage ou un rechargement à chaud du channel. Omettez-le pour utiliser l'attente bornée par défaut (`300000`) ; définissez `0` pour attendre indéfiniment et consigner périodiquement des avertissements pour les opérations toujours en attente.

---

## Hooks

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
    maxBodyBytes: 262144,
    defaultSessionKey: "hook:ingress",
    allowRequestSessionKey: true,
    allowedSessionKeyPrefixes: ["hook:", "hook:gmail:"],
    allowedAgentIds: ["hooks", "main"],
    presets: ["gmail"],
    transformsDir: "~/.openclaw/hooks/transforms",
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        agentId: "hooks",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate: "From: {{messages[0].from}}\nSubject: {{messages[0].subject}}\n{{messages[0].snippet}}",
        deliver: true,
        channel: "last",
        model: "openai/gpt-5.4-mini",
      },
    ],
  },
}
```

Auth : `Authorization: Bearer <token>` ou `x-openclaw-token: <token>`.
Les jetons de hook de chaîne de requête sont rejetés.

Remarques sur la validation et la sécurité :

- `hooks.enabled=true` nécessite un `hooks.token` non vide.
- `hooks.token` doit être **distinct** de `gateway.auth.token` ; la réutilisation du jeton Gateway est rejetée.
- `hooks.path` ne peut pas être `/` ; utilisez un sous-chemin dédié tel que `/hooks`.
- Si `hooks.allowRequestSessionKey=true`, limitez `hooks.allowedSessionKeyPrefixes` (par exemple `["hook:"]`).
- Si un mappage ou un préréglage utilise une `sessionKey` basée sur un modèle, définissez `hooks.allowedSessionKeyPrefixes` et `hooks.allowRequestSessionKey=true`. Les clés de mappage statiques ne nécessitent pas cette activation.

**Points de terminaison :**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - `sessionKey` issue de la charge utile de la requête n'est acceptée que si `hooks.allowRequestSessionKey=true` (par défaut : `false`).
- `POST /hooks/<name>` → résolu via `hooks.mappings`
  - Les valeurs de `sessionKey` de mappage rendues par modèle sont traitées comme fournies en externe et nécessitent également `hooks.allowRequestSessionKey=true`.

<Accordion title="Détails du mappage">

- `match.path` correspond au sous-chemin après `/hooks` (par ex. `/hooks/gmail` → `gmail`).
- `match.source` correspond à un champ de payload pour les chemins génériques.
- Les modèles comme `{{messages[0].subject}}` lisent le payload.
- `transform` peut pointer vers un module JS/TS renvoyant une action de hook.
  - `transform.module` doit être un chemin relatif et rester dans `hooks.transformsDir` (les chemins absolus et les traversées sont rejetés).
  - Gardez `hooks.transformsDir` sous `~/.openclaw/hooks/transforms` ; les répertoires de compétences de l'espace de travail sont rejetés. Si `openclaw doctor` signale ce chemin comme invalide, déplacez le module de transformation dans le répertoire des transformations de hooks ou supprimez `hooks.transformsDir`.
- `agentId` route vers un agent spécifique ; les ID inconnus reviennent à la valeur par défaut.
- `allowedAgentIds` : restreint le routage explicite (`*` ou omis = tout autoriser, `[]` = tout refuser).
- `defaultSessionKey` : clé de session fixe optionnelle pour les exécutions d'agent de hook sans `sessionKey` explicite.
- `allowRequestSessionKey` : autoriser les appelants `/hooks/agent` et les clés de session de mappage pilotées par modèle à définir `sessionKey` (par défaut : `false`).
- `allowedSessionKeyPrefixes` : liste d'autorisation de préfixe optionnelle pour les valeurs `sessionKey` explicites (requête + mappage), par ex. `["hook:"]`. Elle devient obligatoire lorsqu'un mappage ou un préréglage utilise un `sessionKey` modèle.
- `deliver: true` envoie la réponse finale à un channel ; `channel` est `last` par défaut.
- `model` remplace le LLM pour cette exécution de hook (doit être autorisé si le catalogue de modèles est défini).

</Accordion>

### Intégration Gmail

- Le préréglage Gmail intégré utilise `sessionKey: "hook:gmail:{{messages[0].id}}"`.
- Si vous conservez ce routage par message, définissez `hooks.allowRequestSessionKey: true` et limitez `hooks.allowedSessionKeyPrefixes` pour qu'il corresponde à l'espace de noms Gmail, par exemple `["hook:", "hook:gmail:"]`.
- Si vous avez besoin de `hooks.allowRequestSessionKey: false`, remplacez le préréglage par un `sessionKey` statique au lieu de la valeur par défaut basée sur un modèle.

```json5
{
  hooks: {
    gmail: {
      account: "openclaw@gmail.com",
      topic: "projects/<project-id>/topics/gog-gmail-watch",
      subscription: "gog-gmail-watch-push",
      pushToken: "shared-push-token",
      hookUrl: "http://127.0.0.1:18789/hooks/gmail",
      includeBody: true,
      maxBytes: 20000,
      renewEveryMinutes: 720,
      serve: { bind: "127.0.0.1", port: 8788, path: "/" },
      tailscale: { mode: "funnel", path: "/gmail-pubsub" },
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off",
    },
  },
}
```

- La Gateway démarre automatiquement `gog gmail watch serve` au démarrage lorsqu'elle est configurée. Définissez `OPENCLAW_SKIP_GMAIL_WATCHER=1` pour désactiver.
- N'exécutez pas un `gog gmail watch serve` distinct parallèlement à la Gateway.

---

## Hôte de plugin Canvas

```json5
{
  plugins: {
    entries: {
      canvas: {
        config: {
          host: {
            root: "~/.openclaw/workspace/canvas",
            liveReload: true,
            // enabled: false, // or OPENCLAW_SKIP_CANVAS_HOST=1
          },
        },
      },
    },
  },
}
```

- Sert du HTML/CSS/JS modifiable par l'agent et l'A2UI via HTTP sous le port de la Gateway :
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- Local uniquement : gardez `gateway.bind: "loopback"` (par défaut).
- Liens non bouclés : les routes canvas nécessitent une authentification Gateway (jeton/mot de passe/proxy de confiance), tout comme les autres surfaces HTTP Gateway.
- Les Node WebViews n'envoient généralement pas d'en-têtes d'authentification ; après qu'un nœud est appairé et connecté, la Gateway publie des URL de capacité délimitées au nœud pour l'accès canvas/A2UI.
- Les URL de capacité sont liées à la session WS active du nœud et expirent rapidement. Le repli basé sur l'IP n'est pas utilisé.
- Injecte le client de rechargement à chaud dans le HTML servi.
- Crée automatiquement un `index.html` de démarrage lorsqu'il est vide.
- Sert également l'A2UI à `/__openclaw__/a2ui/`.
- Les modifications nécessitent un redémarrage de la passerelle.
- Désactivez le rechargement à chaud pour les répertoires volumineux ou les erreurs `EMFILE`.

---

## Discovery

### mDNS (Bonjour)

```json5
{
  discovery: {
    mdns: {
      mode: "minimal", // minimal | full | off
    },
  },
}
```

- `minimal` (par défaut lorsque le plugin `bonjour` inclus est activé) : omettez `cliPath` + `sshPort` des enregistrements TXT.
- `full` : incluez `cliPath` + `sshPort` ; la publicité multicast LAN nécessite toujours que le plugin `bonjour` inclus soit activé.
- `off` : supprime la publicité multicast LAN sans modifier l'activation du plugin.
- Le greffon `bonjour` inclus démarre automatiquement sur les hôtes macOS et est optionnel sur Linux, Windows et les déploiements Gateway conteneurisés.
- Le nom d'hôte par défaut est le nom d'hôte du système s'il s'agit d'une étiquette DNS valide, sinon il revient à `openclaw`. Remplacez-le par `OPENCLAW_MDNS_HOSTNAME`.

### Zone étendue (DNS-SD)

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

Écrit une zone DNS-SD de monodiffusion sous `~/.openclaw/dns/`. Pour la découverte inter-réseaux, associez à un serveur DNS (CoreDNS recommandé) + DNS divisé Tailscale.

Configuration : `openclaw dns setup --apply`.

---

## Environnement

### `env` (env vars en ligne)

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-...",
    },
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

- Les env vars en ligne ne sont appliqués que si la clé est manquante dans l'environnement du processus.
- Fichiers `.env` : répertoire de travail actuel `.env` + `~/.openclaw/.env` (aucun des deux ne remplace les vars existants).
- `shellEnv` : importe les clés attendues manquantes depuis votre profil de shell de connexion.
- Voir [Environnement](/fr/help/environment) pour la priorité complète.

### Substitution d'env var

Référencez les env vars dans n'importe quelle chaîne de configuration avec `${VAR_NAME}` :

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- Seuls les noms en majuscules correspondent : `[A-Z_][A-Z0-9_]*`.
- Les vars manquants ou vides provoquent une erreur lors du chargement de la configuration.
- Échappez avec `$${VAR}` pour un `${VAR}` littéral.
- Fonctionne avec `$include`.

---

## Secrets

Les références de secrets sont additives : les valeurs en clair fonctionnent toujours.

### `SecretRef`

Utilisez une forme d'objet :

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

Validation :

- Motif `provider` : `^[a-z][a-z0-9_-]{0,63}$`
- Motif d'identifiant `source: "env"` : `^[A-Z][A-Z0-9_]{0,127}$`
- Identifiant `source: "file"` : pointeur JSON absolu (par exemple `"/providers/openai/apiKey"`)
- Motif d'identifiant `source: "exec"` : `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- Les identifiants `source: "exec"` ne doivent pas contenir de segments de chemin délimités par des barres obliques `.` ou `..` (par exemple `a/../b` est rejeté)

### Surface des identifiants prise en charge

- Matrice canonique : [Surface des informations d'identification SecretRef](/fr/reference/secretref-credential-surface)
- `secrets apply` cibles les chemins d'informations d'identification pris en charge `openclaw.json`.
- Les refs `auth-profiles.json` sont incluses dans la résolution lors de l'exécution et la couverture d'audit.

### Configuration des providers de secrets

```json5
{
  secrets: {
    providers: {
      default: { source: "env" }, // optional explicit env provider
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json",
        timeoutMs: 5000,
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        passEnv: ["PATH", "VAULT_ADDR"],
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
    },
  },
}
```

Notes :

- Le provider `file` prend en charge `mode: "json"` et `mode: "singleValue"` (`id` doit être `"value"` en mode singleValue).
- Les chemins des providers de fichiers et d'exécution échouent de manière sécurisée lorsque la vérification des ACL Windows n'est pas disponible. Définissez `allowInsecurePath: true` uniquement pour les chemins de confiance qui ne peuvent pas être vérifiés.
- Le provider `exec` nécessite un chemin absolu `command` et utilise des charges utiles de protocole sur stdin/stdout.
- Par défaut, les chemins de commande symbolique sont rejetés. Définissez `allowSymlinkCommand: true` pour autoriser les chemins symboliques tout en validant le chemin cible résolu.
- Si `trustedDirs` est configuré, la vérification du répertoire de confiance s'applique au chemin cible résolu.
- L'environnement enfant `exec` est minimal par défaut ; passez les variables requises explicitement avec `passEnv`.
- Les références de secrets sont résolues au moment de l'activation dans un instantané en mémoire, puis les chemins de requête lisent uniquement l'instantané.
- Le filtrage de surface active s'applique lors de l'activation : les références non résolues sur les surfaces activées provoquent l'échec du démarrage/rechargement, tandis que les surfaces inactives sont ignorées avec des diagnostics.

---

## Stockage d'authentification

```json5
{
  auth: {
    profiles: {
      "anthropic:default": { provider: "anthropic", mode: "api_key" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" },
      "openai-codex:personal": { provider: "openai-codex", mode: "oauth" },
    },
    order: {
      anthropic: ["anthropic:default", "anthropic:work"],
      "openai-codex": ["openai-codex:personal"],
    },
  },
}
```

- Les profils par agent sont stockés à `<agentDir>/auth-profiles.json`.
- `auth-profiles.json` prend en charge les références au niveau de la valeur (`keyRef` pour `api_key`, `tokenRef` pour `token`) pour les modes d'informations d'identification statiques.
- Les cartes plates héritées `auth-profiles.json` telles que `{ "provider": { "apiKey": "..." } }` ne constituent pas un format d'exécution ; `openclaw doctor --fix` les réécrit en profils de clé API canoniques `provider:default` avec une sauvegarde `.legacy-flat.*.bak`.
- Les profils en mode OAuth (OAuth`auth.profiles.<id>.mode = "oauth"`) ne prennent pas en charge les identifiants de profil d'authentisation sauvegardés via SecretRef.
- Les identifiants d'exécution statiques proviennent d'instantanés résolus en mémoire ; les entrées statiques héritées `auth.json` sont supprimées lorsqu'elles sont détectées.
- Importations héritées OAuth (OAuth) depuis `~/.openclaw/credentials/oauth.json`.
- Voir [OAuth](/fr/concepts/oauth) (OAuth).
- Comportement d'exécution des secrets et outils `audit/configure/apply` : [Gestion des secrets](/fr/gateway/secrets).

### `auth.cooldowns`

```json5
{
  auth: {
    cooldowns: {
      billingBackoffHours: 5,
      billingBackoffHoursByProvider: { anthropic: 3, openai: 8 },
      billingMaxHours: 24,
      authPermanentBackoffMinutes: 10,
      authPermanentMaxMinutes: 60,
      failureWindowHours: 24,
      overloadedProfileRotations: 1,
      overloadedBackoffMs: 0,
      rateLimitedProfileRotations: 1,
    },
  },
}
```

- `billingBackoffHours` : temps de retour de base en heures lorsqu'un profil échoue en raison de vraies erreurs de facturation/crédit insuffisant (par défaut : `5`). Le texte de facturation explicite peut toujours atterrir ici même sur les réponses `401`/`403`, mais les correspondances de texte spécifiques au fournisseur restent limitées au fournisseur qui les possède (par exemple OpenRouter `Key limit exceeded`). Les messages HTTP `402` réessayables concernant la fenêtre d'utilisation ou la limite de dépense de l'organisation/de l'espace de travail restent plutôt dans le chemin `rate_limit`.
- `billingBackoffHoursByProvider` : substitutions facultatives par fournisseur pour les heures de retour de facturation.
- `billingMaxHours` : plafond en heures pour la croissance exponentielle du retour de facturation (par défaut : `24`).
- `authPermanentBackoffMinutes` : temps de retour de base en minutes pour les échecs de haute confiance `auth_permanent` (par défaut : `10`).
- `authPermanentMaxMinutes` : plafond en minutes pour la croissance du retour `auth_permanent` (par défaut : `60`).
- `failureWindowHours` : fenêtre glissante en heures utilisée pour les compteurs de retour (par défaut : `24`).
- `overloadedProfileRotations` : nombre maximum de rotations de profils d'authentisation du même fournisseur pour les erreurs de surcharge avant de passer à la repli de modèle (par défaut : `1`). Les formes de fournisseur occupé telles que `ModelNotReadyException` atterrissent ici.
- `overloadedBackoffMs` : délai fixe avant de réessayer une rotation de profil/provider surchargé (par défaut : `0`).
- `rateLimitedProfileRotations` : nombre maximum de rotations de profils d'authentification pour le même provider en cas d'erreurs de limitation de débit avant de passer au modèle de secours (par défaut : `1`). Ce compartiment de limitation de débit inclut les textes de forme de provider tels que `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded` et `resource exhausted`.

---

## Journalisation

```json5
{
  logging: {
    level: "info",
    file: "/tmp/openclaw/openclaw.log",
    consoleLevel: "info",
    consoleStyle: "pretty", // pretty | compact | json
    redactSensitive: "tools", // off | tools
    redactPatterns: ["\\bTOKEN\\b\\s*[=:]\\s*([\"']?)([^\\s\"']+)\\1"],
  },
}
```

- Fichier journal par défaut : `/tmp/openclaw/openclaw-YYYY-MM-DD.log`.
- Définissez `logging.file` pour un chemin stable.
- `consoleLevel` passe à `debug` quand `--verbose`.
- `maxFileBytes` : taille maximale du fichier journal actif en octets avant la rotation (entier positif ; par défaut : `104857600` = 100 Mo). OpenClaw conserve jusqu'à cinq archives numérotées à côté du fichier actif.
- `redactSensitive` / `redactPatterns` : masquage « best-effort » pour la sortie console, les fichiers journaux, les enregistrements de journaux OTLP et le texte persistant des transcriptions de session. `redactSensitive: "off"` désactive uniquement cette stratégie générale de journal/transcription ; les surfaces de sécurité de l'interface utilisateur/outils/diagnostiques censurent toujours les secrets avant l'émission.

---

## Diagnostics

```json5
{
  diagnostics: {
    enabled: true,
    flags: ["telegram.*"],
    stuckSessionWarnMs: 30000,
    stuckSessionAbortMs: 600000,

    otel: {
      enabled: false,
      endpoint: "https://otel-collector.example.com:4318",
      tracesEndpoint: "https://traces.example.com/v1/traces",
      metricsEndpoint: "https://metrics.example.com/v1/metrics",
      logsEndpoint: "https://logs.example.com/v1/logs",
      protocol: "http/protobuf", // http/protobuf | grpc
      headers: { "x-tenant-id": "my-org" },
      serviceName: "openclaw-gateway",
      traces: true,
      metrics: true,
      logs: false,
      sampleRate: 1.0,
      flushIntervalMs: 5000,
      captureContent: {
        enabled: false,
        inputMessages: false,
        outputMessages: false,
        toolInputs: false,
        toolOutputs: false,
        systemPrompt: false,
      },
    },

    cacheTrace: {
      enabled: false,
      filePath: "~/.openclaw/logs/cache-trace.jsonl",
      includeMessages: true,
      includePrompt: true,
      includeSystem: true,
    },
  },
}
```

- `enabled` : commutateur principal pour la sortie d'instrumentation (par défaut : `true`).
- `flags` : tableau de chaînes de drapeaux activant la sortie de journal ciblée (prend en charge les caractères génériques comme `"telegram.*"` ou `"*"`).
- `stuckSessionWarnMs` : seuil d'âge sans progression en ms pour classer les sessions de traitement longues comme `session.long_running`, `session.stalled` ou `session.stuck`. La progression de réponse, d'outil, de statut, de bloc et d'ACP réinitialise le minuteur ; les diagnostics `session.stuck` répétés se désengagent tant qu'ils sont inchangés.
- `stuckSessionAbortMs` : seuil d'âge sans progression en ms avant que le travail actif bloqué éligible puisse être drainé par abandon pour récupération. Si non défini, OpenClaw utilise la fenêtre d'exécution intégrée étendue plus sûre d'au moins 10 minutes et 5x `stuckSessionWarnMs`.
- `otel.enabled` : active le pipeline d'exportation OpenTelemetry (par défaut : `false`). Pour la configuration complète, le catalogue de signaux et le modèle de confidentialité, voir [OpenTelemetry export](/fr/gateway/opentelemetry).
- `otel.endpoint` : URL du collecteur pour l'exportation OTel.
- `otel.tracesEndpoint` / `otel.metricsEndpoint` / `otel.logsEndpoint` : points de terminaison OTLP spécifiques au signal facultatifs. Lorsqu'ils sont définis, ils remplacent `otel.endpoint` uniquement pour ce signal.
- `otel.protocol` : `"http/protobuf"` (par défaut) ou `"grpc"`.
- `otel.headers` : en-têtes de métadonnées HTTP/gRPC supplémentaires envoyés avec les requêtes d'exportation OTel.
- `otel.serviceName` : nom du service pour les attributs de ressource.
- `otel.traces` / `otel.metrics` / `otel.logs` : activer l'export de traces, de métriques ou de journaux.
- `otel.sampleRate` : taux d'échantillonnage des traces `0`-`1`.
- `otel.flushIntervalMs` : intervalle de vidage périodique de la télémétrie en ms.
- `otel.captureContent` : capture de contenu brut optionnelle pour les attributs de span OTEL. Désactivé par défaut. Le booléen `true` capture le contenu des messages/tools non système ; la forme objet vous permet d'activer `inputMessages`, `outputMessages`, `toolInputs`, `toolOutputs` et `systemPrompt` explicitement.
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental` : commutateur d'environnement pour les derniers attributs expérimentaux du provider de span GenAI. Par défaut, les spans conservent l'attribut hérité `gen_ai.system` pour la compatibilité ; les métriques GenAI utilisent des attributs sémantiques bornés.
- `OPENCLAW_OTEL_PRELOADED=1` : commutateur d'environnement pour les hôtes qui ont déjà enregistré un SDK OpenTelemetry global. OpenClaw ignore alors le démarrage/arrêt du SDK owned par le plugin tout en gardant les écouteurs de diagnostic actifs.
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` , `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` et `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` : variables d'environnement de point de terminaison spécifiques au signal utilisées lorsque la clé de configuration correspondante n'est pas définie.
- `cacheTrace.enabled` : consigner les instantanés du suivi du cache pour les exécutions intégrées (par défaut : `false`).
- `cacheTrace.filePath` : chemin de sortie pour le JSONL de trace du cache (par défaut : `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`).
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem` : contrôle ce qui est inclus dans la sortie de trace du cache (tous par défaut : `true`).

---

## Mise à jour

```json5
{
  update: {
    channel: "stable", // stable | beta | dev
    checkOnStart: true,

    auto: {
      enabled: false,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

- `channel` : canal de publication pour les installations npm/git - `"stable"`, `"beta"` ou `"dev"`.
- `checkOnStart` : vérifier les mises à jour npm au démarrage de la passerelle (par défaut : `true`).
- `auto.enabled` : activer la mise à jour automatique en arrière-plan pour les installations de packages (par défaut : `false`).
- `auto.stableDelayHours` : délai minimum en heures avant l'application automatique du canal stable (par défaut : `6` ; max : `168`).
- `auto.stableJitterHours` : fenêtre de spread de déploiement supplémentaire pour le canal stable en heures (par défaut : `12` ; max : `168`).
- `auto.betaCheckIntervalHours` : fréquence des vérifications du canal bêta en heures (par défaut : `1` ; max : `24`).

---

## ACP

```json5
{
  acp: {
    enabled: true,
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "main",
    allowedAgents: ["main", "ops"],
    maxConcurrentSessions: 10,

    stream: {
      coalesceIdleMs: 50,
      maxChunkChars: 1000,
      repeatSuppression: true,
      deliveryMode: "live", // live | final_only
      hiddenBoundarySeparator: "paragraph", // none | space | newline | paragraph
      maxOutputChars: 50000,
      maxSessionUpdateChars: 500,
    },

    runtime: {
      ttlMinutes: 30,
    },
  },
}
```

- `enabled` : porte (gate) de fonctionnalité ACP globale (par défaut : `true` ; définissez `false` pour masquer les options de répartition et de génération ACP).
- `dispatch.enabled` : porte indépendante pour la répartition des tours de session ACP (par défaut : `true`). Définissez `false` pour garder les commandes ACP disponibles tout en bloquant l'exécution.
- `backend` : id du backend d'exécution ACP par défaut (doit correspondre à un plugin de runtime ACP enregistré).
  Installez d'abord le plugin de backend, et si `plugins.allow` est défini, incluez l'id du plugin de backend (par exemple `acpx`) sinon le backend ACP ne se chargera pas.
- `defaultAgent` : id de l'agent cible ACP par défaut lorsque les générations ne spécifient pas de cible explicite.
- `allowedAgents` : liste d'autorisation (allowlist) des ids d'agents autorisés pour les sessions de runtime ACP ; vide signifie aucune restriction supplémentaire.
- `maxConcurrentSessions` : nombre maximum de sessions ACP actives simultanément.
- `stream.coalesceIdleMs` : fenêtre de vidange inactive en ms pour le texte diffusé en continu.
- `stream.maxChunkChars` : taille maximale des blocs avant de diviser la projection du bloc diffusé en continu.
- `stream.repeatSuppression` : supprimer les lignes d'état/tool répétées par tour (par défaut : `true`).
- `stream.deliveryMode` : `"live"` diffuse de manière incrémentale ; `"final_only"` met en tampon jusqu'aux événements terminaux du tour.
- `stream.hiddenBoundarySeparator` : séparateur avant le texte visible après les événements tool masqués (par défaut : `"paragraph"`).
- `stream.maxOutputChars` : nombre maximal de caractères de sortie de l'assistant projetés par tour ACP.
- `stream.maxSessionUpdateChars` : nombre maximal de caractères pour les lignes de statut/mise à jour ACP projetées.
- `stream.tagVisibility` : enregistrement des noms de balises vers des substitutions de visibilité booléennes pour les événements diffusés en continu.
- `runtime.ttlMinutes` : TTL d'inactivité en minutes pour les workers de session ACP avant le nettoyage éligible.
- `runtime.installCommand` : commande d'installation facultative à exécuter lors de l'amorçage d'un environnement d'exécution ACP.

---

## CLI

```json5
{
  cli: {
    banner: {
      taglineMode: "off", // random | default | off
    },
  },
}
```

- `cli.banner.taglineMode` contrôle le style de la sous-titre de la bannière :
  - `"random"` (par défaut) : sous-titres amusants/saisonniers rotatifs.
  - `"default"` : sous-titre neutre fixe (`All your chats, one OpenClaw.`).
  - `"off"` : pas de texte de sous-titre (le titre/la version de la bannière sont toujours affichés).
- Pour masquer la bannière entière (pas seulement les sous-titres), définissez la variable d'environnement `OPENCLAW_HIDE_BANNER=1`.

---

## Assistant

Métadonnées écrites par les flux de configuration guidés du CLI (`onboard`, `configure`, `doctor`) :

```json5
{
  wizard: {
    lastRunAt: "2026-01-01T00:00:00.000Z",
    lastRunVersion: "2026.1.4",
    lastRunCommit: "abc1234",
    lastRunCommand: "configure",
    lastRunMode: "local",
  },
}
```

---

## Identité

Voir les champs d'identité `agents.list` sous [Agent defaults](/fr/gateway/config-agents#agent-defaults).

---

## Pont (obsolète, supprimé)

Les versions actuelles n'incluent plus le pont TCP. Les nœuds se connectent via le WebSocket du Gateway. Les clés `bridge.*` ne font plus partie du schéma de configuration (la validation échoue tant qu'elles ne sont pas supprimées ; `openclaw doctor --fix` peut supprimer les clés inconnues).

<Accordion title="Configuration du pont hérité (référence historique)">

```json
{
  "bridge": {
    "enabled": true,
    "port": 18790,
    "bind": "tailnet",
    "tls": {
      "enabled": true,
      "autoGenerate": true
    }
  }
}
```

</Accordion>

---

## Cron

```json5
{
  cron: {
    enabled: true,
    maxConcurrentRuns: 2, // cron dispatch + isolated cron agent-turn execution
    webhook: "https://example.invalid/legacy", // deprecated fallback for stored notify:true jobs
    webhookToken: "replace-with-dedicated-token", // optional bearer token for outbound webhook auth
    sessionRetention: "24h", // duration string or false
    runLog: {
      maxBytes: "2mb", // default 2_000_000 bytes
      keepLines: 2000, // default 2000
    },
  },
}
```

- `sessionRetention` : durée de conservation des sessions d'exécution cron isolées terminées avant leur suppression de `sessions.json`. Contrôle également le nettoyage des transcriptions cron supprimées et archivées. Par défaut : `24h` ; définissez `false` pour désactiver.
- `runLog.maxBytes` : taille maximale par fichier de journal d'exécution (`cron/runs/<jobId>.jsonl`) avant suppression. Par défaut : `2_000_000` octets.
- `runLog.keepLines` : plus récentes lignes conservées lorsque la suppression du journal d'exécution est déclenchée. Par défaut : `2000`.
- `webhookToken` : jeton bearer utilisé pour la livraison POST du webhook cron (`delivery.mode = "webhook"`) ; si omis, aucun en-tête d'authentification n'est envoyé.
- `webhook` : URL de webhook de repli héritée dépréciée (http/https) utilisée uniquement pour les tâches stockées qui ont encore `notify: true`.

### `cron.retry`

```json5
{
  cron: {
    retry: {
      maxAttempts: 3,
      backoffMs: [30000, 60000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "timeout", "server_error"],
    },
  },
}
```

- `maxAttempts` : nombre maximum de nouvelles tentatives pour les tâches ponctuelles en cas d'erreurs transitoires (par défaut : `3` ; plage : `0`-`10`).
- `backoffMs` : tableau des délais d'attente exponentiels en ms pour chaque tentative de réessai (par défaut : `[30000, 60000, 300000]` ; 1-10 entrées).
- `retryOn` : types d'erreurs qui déclenchent les nouvelles tentatives - `"rate_limit"`, `"overloaded"`, `"network"`, `"timeout"`, `"server_error"`. Omettre pour réessayer tous les types transitoires.

S'applique uniquement aux tâches cron ponctuelles. Les tâches récurrentes utilisent une gestion des échecs séparée.

### `cron.failureAlert`

```json5
{
  cron: {
    failureAlert: {
      enabled: false,
      after: 3,
      cooldownMs: 3600000,
      includeSkipped: false,
      mode: "announce",
      accountId: "main",
    },
  },
}
```

- `enabled` : activer les alertes d'échec pour les tâches cron (par défaut : `false`).
- `after` : échecs consécutifs avant le déclenchement d'une alerte (entier positif, min : `1`).
- `cooldownMs` : durée minimale en millisecondes entre les alertes répétées pour la même tâche (entier non négatif).
- `includeSkipped` : compter les exécutions consécutives ignorées vers le seuil d'alerte (par défaut : `false`). Les exécutions ignorées sont suivies séparément et n'affectent pas l'attente en cas d'erreur d'exécution.
- `mode` : mode de livraison - `"announce"` envoie via un message de canal ; `"webhook"` publie sur le webhook configuré.
- `accountId` : identifiant de compte ou de canal facultatif pour délimiter la livraison des alertes.

### `cron.failureDestination`

```json5
{
  cron: {
    failureDestination: {
      mode: "announce",
      channel: "last",
      to: "channel:C1234567890",
      accountId: "main",
    },
  },
}
```

- Destination par défaut pour les notifications d'échec cron pour toutes les tâches.
- `mode` : `"announce"` ou `"webhook"` ; par défaut `"announce"` lorsque suffisamment de données cibles existent.
- `channel` : substitution de canal pour la livraison des annonces. `"last"` réutilise le dernier canal de livraison connu.
- `to` : cible d'annonce explicite ou URL de webhook. Requis pour le mode webhook.
- `accountId` : substitution de compte facultative pour la livraison.
- La substitution `delivery.failureDestination` par tâche remplace cette valeur par défaut globale.
- Lorsque ni la destination d'échec globale ni celle par tâche n'est définie, les tâches qui livrent déjà via `announce` reviennent à cette cible d'annonce principale en cas d'échec.
- `delivery.failureDestination` n'est pris en charge que pour les tâches `sessionTarget="isolated"`, sauf si le `delivery.mode` principal de la tâche est `"webhook"`.

Voir [Tâches Cron](/fr/automation/cron-jobs). Les exécutions cron isolées sont suivies en tant que [tâches d'arrière-plan](/fr/automation/tasks).

---

## Variables du modèle de média

Paramètres fictifs du modèle développés dans `tools.media.models[].args` :

| Variable           | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| `{{Body}}`         | Corps complet du message entrant                                   |
| `{{RawBody}}`      | Corps brut (sans enveloppes d'historique/d'expéditeur)             |
| `{{BodyStripped}}` | Corps sans les mentions de groupe                                  |
| `{{From}}`         | Identifiant de l'expéditeur                                        |
| `{{To}}`           | Identifiant de la destination                                      |
| `{{MessageSid}}`   | ID du message de canal                                             |
| `{{SessionId}}`    | UUID de la session actuelle                                        |
| `{{IsNewSession}}` | `"true"` lors de la création d'une nouvelle session                |
| `{{MediaUrl}}`     | Pseudo-URL du média entrant                                        |
| `{{MediaPath}}`    | Chemin d'accès local au média                                      |
| `{{MediaType}}`    | Type de média (image/audio/document/…)                             |
| `{{Transcript}}`   | Transcription audio                                                |
| `{{Prompt}}`       | Invite média résolue pour les entrées CLI                          |
| `{{MaxChars}}`     | Nombre maximal de caractères de sortie résolu pour les entrées CLI |
| `{{ChatType}}`     | `"direct"` ou `"group"`                                            |
| `{{GroupSubject}}` | Sujet du groupe (au mieux effort)                                  |
| `{{GroupMembers}}` | Aperçu des membres du groupe (au mieux effort)                     |
| `{{SenderName}}`   | Nom d'affichage de l'expéditeur (au mieux effort)                  |
| `{{SenderE164}}`   | Numéro de téléphone de l'expéditeur (au mieux effort)              |
| `{{Provider}}`     | Indication de fournisseur (whatsapp, telegram, discord, etc.)      |

---

## Inclusions de configuration (`$include`)

Diviser la configuration en plusieurs fichiers :

```json5
// ~/.openclaw/openclaw.json
{
  gateway: { port: 18789 },
  agents: { $include: "./agents.json5" },
  broadcast: {
    $include: ["./clients/mueller.json5", "./clients/schmidt.json5"],
  },
}
```

**Comportement de fusion :**

- Fichier unique : remplace l'objet conteneur.
- Tableau de fichiers : fusionné en profondeur dans l'ordre (les suivants écrasent les précédents).
- Clés frères : fusionnées après les inclusions (écrasent les valeurs incluses).
- Inclusions imbriquées : jusqu'à 10 niveaux de profondeur.
- Chemins d'accès : résolus par rapport au fichier d'inclusion, mais doivent rester dans le répertoire de configuration de premier niveau (`dirname` de `openclaw.json`). Les formes absolues/`../` ne sont autorisées que si elles sont toujours résolues à l'intérieur de cette limite.
- Les écritures propriétaires d'OpenClaw qui ne modifient qu'une seule section de premier niveau soutenue par une inclusion de fichier unique sont répercutées vers ce fichier inclus. Par exemple, OpenClaw`plugins install` met à jour `plugins: { $include: "./plugins.json5" }` dans `plugins.json5` et laisse `openclaw.json` intact.
- Les inclusions racines, les tableaux d'inclusions et les inclusions avec des substitutions de niveau frère sont en lecture seule pour les écritures propriétaires d'OpenClaw ; ces écritures échouent fermement au lieu d'aplatir la configuration.
- Erreurs : messages clairs pour les fichiers manquants, les erreurs d'analyse et les inclusions circulaires.

---

_Connexes : [Configuration](/fr/gateway/configuration) · [Exemples de configuration](/fr/gateway/configuration-examples) · [Doctor](/fr/gateway/doctor)_

## Connexes

- [Configuration](/fr/gateway/configuration)
- [Exemples de configuration](/fr/gateway/configuration-examples)
