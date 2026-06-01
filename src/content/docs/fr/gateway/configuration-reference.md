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

Chemin de recherche de l'agent : utilisez l'action d'outil `gateway` `config.schema.lookup` pour
la documentation exacte au niveau des champs et les contraintes avant les modifications. Utilisez
[Configuration](/fr/gateway/configuration) pour des conseils orientés tâches et cette page
pour la carte plus large des champs, les valeurs par défaut, et les liens vers les références des sous-systèmes.

Références approfondies dédiées :

- [Référence de configuration de la mémoire](/fr/reference/memory-config) pour `agents.defaults.memorySearch.*`, `memory.qmd.*`, `memory.citations`, et la configuration de l'inactivité sous `plugins.entries.memory-core.config.dreaming`
- [Commandes slash](/fr/tools/slash-commands) pour le catalogue de commandes intégré actuel + groupé
- pages de propriétaire de channel/plugin pour les surfaces de commandes spécifiques aux channels

Le format de configuration est **JSON5** (commentaires et virgules de fin autorisés). Tous les champs sont optionnels - OpenClaw utilise des valeurs par défaut sûres en cas d'omission.

---

## Channels

Les clés de configuration par canal ont été déplacées vers une page dédiée - voir
[Configuration - canaux](/fr/gateway/config-channels) pour `channels.*`,
y compris Slack, Discord, Telegram, WhatsApp, Matrix, iMessage, et autres
channels groupés (auth, contrôle d'accès, multi-compte, filtrage des mentions).

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
  - `talk.realtime.consultRouting` : Relais de secours du Gateway pour les transcriptions Talk en temps réel finalisées qui ignorent `openclaw_agent_consult`

## Outils et fournisseurs personnalisés

Stratégie d'outil, commutateurs expérimentaux, configuration d'outil pris en charge par le provider, et configuration
de provider personnalisé / URL de base déplacés vers une page dédiée - voir
[Configuration - outils et providers personnalisés](/fr/gateway/config-tools).

## Modèles

Les définitions de providers, les listes d'autorisation de models et la configuration de providers personnalisés se trouvent dans
[Configuration - outils et providers personnalisés](/fr/gateway/config-tools#custom-providers-and-base-urls).
La racine `models` possède également le comportement global du catalogue de models.

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
- `models.providers.*.localService` : gestionnaire de processus à la demande facultatif pour
  les serveurs de models locaux. OpenClaw sonde le point de terminaison de santé configuré, démarre
  le `command` absolu si nécessaire, attend la disponibilité, puis envoie la requête de
  model. Voir [Services de models locaux](/fr/gateway/local-model-services).
- `models.pricing.enabled` : contrôle l'amorçage de la tarification en arrière-plan qui démarre une fois que les sidecars et les canaux atteignent le chemin prêt du Gateway. Lorsque `false`, le Gateway ignore les récupérations de catalogues de tarification de OpenRouter et LiteLLM ; les valeurs `models.providers.*.models[].cost` configurées fonctionnent toujours pour les estimations de coûts locaux.

## MCP

Les définitions de serveurs MCP gérés par OpenClaw se trouvent sous OpenClaw`mcp.servers`OpenClaw et sont
consommées par OpenClaw intégré et autres adaptateurs d'exécution. Les commandes `openclaw mcp list`,
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
        // Optional Codex app-server projection controls.
        codex: {
          agents: ["main"],
          defaultToolsApprovalMode: "approve", // auto | prompt | approve
        },
      },
    },
  },
}
```

- `mcp.servers` : définitions nommées de serveurs MCP stdio ou distants pour les runtimes qui exposent les outils MCP configurés. Les entrées distantes utilisent `transport: "streamable-http"` ou `transport: "sse"` ; `type: "http"` est un alias natif de CLI que `openclaw mcp set` et `openclaw doctor --fix` normalisent dans le champ canonique `transport`.
- `mcp.servers.<name>.codex` : contrôles de projection optionnels pour le serveur d'application Codex.
  Ce bloc est des métadonnées OpenClaw pour les threads du serveur d'application Codex uniquement ; il n'affecte pas
  les sessions ACP, la configuration générique du harnais Codex ou autres adaptateurs d'exécution.
  `codex.agents` non vide limite le serveur aux ids d'agent OpenClaw listés.
  Les listes d'agents Scoped vides, vides ou invalides sont rejetées par la validation de configuration
  et omises par le chemin de projection d'exécution au lieu de devenir globales.
  `codex.defaultToolsApprovalMode` émet le `default_tools_approval_mode` natif de
  Codex pour ce serveur. OpenClaw supprime le bloc `codex`
  avant de passer la configuration native `mcp_servers` à Codex. Omettez le bloc pour
  garder le serveur projeté pour chaque agent du serveur d'application Codex avec le comportement
  d'approbation MCP par défaut de Codex.
- `mcp.sessionIdleTtlMs` : TTL d'inactivité pour les runtimes MCP regroupés et délimités à la session.
  Les exécutions intégrées ponctuelles demandent un nettoyage en fin d'exécution ; ce TTL est le dernier recours pour
  les sessions longues et les futurs appelants.
- Les modifications sous `mcp.*` s'appliquent à chaud en supprimant les runtimes MCP de session mis en cache.
  La prochaine découverte/utilisation d'outil les recrée à partir de la nouvelle configuration, donc les entrées
  `mcp.servers` supprimées sont récoltées immédiatement au lieu d'attendre le TTL d'inactivité.

Voir [MCP](/fr/cli/mcp#openclaw-as-an-mcp-client-registryCLI) et
[CLI backends](/fr/gateway/cli-backends#bundle-mcp-overlays) pour le comportement à l'exécution.

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

- `allowBundled` : liste d'autorisation (allowlist) optionnelle pour les skills regroupés uniquement (les skills gérés/espace de travail ne sont pas affectés).
- `load.extraDirs` : racines de skills partagées supplémentaires (priorité la plus basse).
- `load.allowSymlinkTargets` : racines cibles réelles approuvées vers lesquelles les liens symboliques de skills peuvent
  résoudre lorsque le lien réside en dehors de sa racine source configurée.
- `install.preferBrew` : si vrai, préférer les installateurs Homebrew lorsque `brew` est
  disponible avant de revenir à d'autres types d'installateurs.
- `install.nodeManager` : préférence de l'installateur de nœud pour les
  spécifications `metadata.openclaw.install` (`npm` | `pnpm` | `yarn` | `bun`).
- `install.allowUploadedArchives` : autoriser les clients de confiance du Gateway
  `operator.admin` à installer des archives zip privées mises en scène via `skills.upload.*`
  (par défaut : false). Cela n'active que le chemin de l'archive téléchargée ; les installations normales de ClawHub
  ne l'exigent pas.
- `entries.<skillKey>.enabled: false` désactive une compétence même si elle est groupée/installée.
- `entries.<skillKey>.apiKey` : commodité pour les compétences déclarant une variable d'environnement principale (chaîne en texte brut ou objet SecretRef).

---

## Plugins

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
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

- Chargé à partir de `~/.openclaw/extensions`, `<workspace>/.openclaw/extensions`, ainsi que `plugins.load.paths`.
- Le processus de découverte accepte les plugins natifs OpenClaw ainsi que les bundles Codex compatibles et les bundles Claude, y compris les bundles Claude avec disposition par défaut sans manifeste.
- **Les modifications de la configuration nécessitent un redémarrage de la passerelle.**
- `allow` : liste d'autorisation optionnelle (seuls les plugins répertoriés sont chargés). `deny` prime.
- `plugins.entries.<id>.apiKey`API : champ de commodité pour la clé API au niveau du plugin (lorsqu'il est pris en charge par le plugin).
- `plugins.entries.<id>.env` : mappage des variables d'environnement (env var) délimitées au plugin.
- `plugins.entries.<id>.hooks.allowPromptInjection` : lorsqu'il est défini sur `false`, le cœur bloque `before_prompt_build` et ignore les champs modifiant les invites (prompt-mutating) provenant de `before_agent_start` hérités, tout en préservant `modelOverride` et `providerOverride` hérités. S'applique aux hooks de plugins natifs et aux répertoires de hooks fournis par les bundles pris en charge.
- `plugins.entries.<id>.hooks.allowConversationAccess` : lorsqu'il est défini sur `true`, les plugins de confiance non fournis dans un bundle peuvent lire le contenu brut de la conversation à partir de hooks typés tels que `llm_input`, `llm_output`, `before_model_resolve`, `before_agent_reply`, `before_agent_run`, `before_agent_finalize` et `agent_end`.
- `plugins.entries.<id>.subagent.allowModelOverride` : accorder explicitement la confiance à ce plugin pour demander des remplacements (overrides) par exécution `provider` et `model` pour les exécutions de sous-agent en arrière-plan.
- `plugins.entries.<id>.subagent.allowedModels` : liste d'autorisation (allowlist) facultative de cibles canoniques `provider/model` pour les remplacements de sous-agents de confiance. N'utilisez `"*"` que lorsque vous souhaitez intentionnellement autoriser n'importe quel modèle.
- `plugins.entries.<id>.llm.allowModelOverride` : accorder explicitement la confiance à ce plugin pour demander des remplacements de modèle pour `api.runtime.llm.complete`.
- `plugins.entries.<id>.llm.allowedModels` : liste d'autorisation (allowlist) optionnelle des cibles canoniques `provider/model`LLM pour les substitutions de complétion LLM de plugins approuvés. Utilisez `"*"` uniquement lorsque vous souhaitez intentionnellement autoriser n'importe quel modèle.
- `plugins.entries.<id>.llm.allowAgentIdOverride` : accordez explicitement votre confiance à ce plugin pour exécuter `api.runtime.llm.complete` sur un ID d'agent non défini par défaut.
- `plugins.entries.<id>.config` : objet de configuration défini par le plugin (validé par le schéma de plugin natif OpenClaw si disponible).
- Les paramètres de compte/d'exécution du plugin de canal se trouvent sous `channels.<id>` et doivent être décrits par les métadonnées `channelConfigs` du manifeste du plugin propriétaire, et non par un registre d'option central OpenClaw.

### Configuration du plugin de harnais Codex

Le plugin inclus `codex` possède les paramètres natifs du harnais (harness) du serveur d'application Codex sous
`plugins.entries.codex.config`. Consultez
[Codex harness reference](/fr/plugins/codex-harness-reference) pour la surface de configuration complète
et [Codex harness](/fr/plugins/codex-harness) pour le modèle d'exécution.

`codexPlugins` ne s'applique qu'aux sessions qui sélectionnent le harnais natif Codex.
Il n'active pas les plugins Codex pour les exécutions de fournisseurs OpenClaw, les
liaisons de conversation ACP ou tout autre harnais non-Codex.

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: true,
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

- `plugins.entries.codex.config.codexPlugins.enabled` : active la prise en charge native des plugins/applications Codex
  pour le harnais Codex. Par défaut : `false`.
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions` :
  stratégie d'action destructive par défaut pour les sollicitations d'application de plugin migrées.
  Par défaut : `true`.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.enabled` : active une
  entrée de plugin migrée lorsque `codexPlugins.enabled` global est également vrai.
  Par défaut : `true` pour les entrées explicites.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.marketplaceName` :
  identité stable de la place de marché (marketplace). V1 prend uniquement en charge `"openai-curated"`.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.pluginName` : identité stable
  du plugin Codex issue de la migration, par exemple `"google-calendar"`.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.allow_destructive_actions` :
  substitution de l'action destructive par plugin. En cas d'omission, la valeur
  `allow_destructive_actions` globale est utilisée.

`codexPlugins.enabled` est la directive d'activation globale. Les entrées de plugin explicites écrites par la migration constituent l'ensemble durable d'éligibilité à l'installation et à la réparation. `plugins["*"]` n'est pas pris en charge, il n'y a pas de commutateur `install`, et les valeurs locales `marketplacePath` ne sont intentionnellement pas des champs de configuration car elles sont spécifiques à l'hôte.

Les contrôles de disponibilité `app/list` sont mis en cache pendant une heure et actualisés de manière asynchrone lorsqu'ils sont obsolètes. La configuration de l'application de thread Codex est calculée lors de l'établissement de la session Codex harness, et non à chaque tour ; utilisez `/new`, `/reset`, ou un redémarrage de la passerelle après avoir modifié la configuration du plugin natif.

- `plugins.entries.firecrawl.config.webFetch` : paramètres du provider Firecrawl de récupération Web.
  - `apiKey` : clé Firecrawl API (accepte SecretRef). Revient à `plugins.entries.firecrawl.config.webSearch.apiKey`, `tools.web.fetch.firecrawl.apiKey` hérité, ou variable d'environnement `FIRECRAWL_API_KEY`.
  - `baseUrl` : URL de base de l'Firecrawl API (par défaut : `https://api.firecrawl.dev` ; les remplacements auto-hébergés doivent cibler des points de terminaison privés/internes).
  - `onlyMainContent` : extraire uniquement le contenu principal des pages (par défaut : `true`).
  - `maxAgeMs` : âge maximale du cache en millisecondes (par défaut : `172800000` / 2 jours).
  - `timeoutSeconds` : délai d'expiration de la demande de scraping en secondes (par défaut : `60`).
- `plugins.entries.xai.config.xSearch` : paramètres xAI X Search (recherche Web Grok).
  - `enabled` : activer le provider X Search.
  - `model` : model Grok à utiliser pour la recherche (par ex. `"grok-4-1-fast"`).
- `plugins.entries.memory-core.config.dreaming` : paramètres de dreaming de mémoire. Voir [Dreaming](/fr/concepts/dreaming) pour les phases et les seuils.
  - `enabled` : commutateur principal de dreaming (par défaut `false`).
  - `frequency` : cadence cron pour chaque balayage de rêve complet (`"0 3 * * *"` par défaut).
  - `model` : substitution facultative du modèle de sous-agent Dream Diary. Nécessite `plugins.entries.memory-core.subagent.allowModelOverride: true` ; associez à `allowedModels` pour restreindre les cibles. Les erreurs de modèle indisponible réessaient une fois avec le modèle par défaut de la session ; les échecs de confiance ou de liste blanche ne reviennent pas silencieusement.
  - la politique de phase et les seuils sont des détails de mise en œuvre (pas des clés de configuration utilisateur).
- La configuration complète de la mémoire se trouve dans [Référence de configuration de la mémoire](/fr/reference/memory-config) :
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- Les plugins de bundle Claude activés peuvent également fournir des valeurs par défaut OpenClaw intégrées depuis `settings.json` ; OpenClaw les applique en tant que paramètres d'agent nettoyés, et non en tant que correctifs de configuration OpenClaw bruts.
- `plugins.slots.memory` : choisissez l'identifiant du plugin de mémoire actif, ou `"none"` pour désactiver les plugins de mémoire.
- `plugins.slots.contextEngine` : choisissez l'identifiant du plugin de moteur de contexte actif ; par défaut `"legacy"` sauf si vous installez et sélectionnez un autre moteur.

Voir [Plugins](/fr/tools/plugin).

---

## Engagements

`commitments` contrôle la mémoire de suivi déduite : OpenClaw peut détecter les points de contrôle à partir des tours de conversation et les délivrer via des exécutions de heartbeat.

- `commitments.enabled` : activer l'extraction, le stockage et la livraison par heartbeat cachés du LLM pour les engagements de suivi déduits. Par défaut : `false`.
- `commitments.maxPerDay` : nombre maximum d'engagements de suivi déduits livrés par session d'agent sur un jour glissant. Par défaut : `3`.

Voir [Engagements déduits](/fr/concepts/commitments).

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
- `tabCleanup` récupère les onglets de l'agent principal suivis après un délai d'inactivité ou lorsqu'une session dépasse sa limite. Définissez `idleMinutes: 0` ou `maxTabsPerSession: 0` pour désactiver ces modes de nettoyage individuels.
- `ssrfPolicy.dangerouslyAllowPrivateNetwork` est désactivé s'il n'est pas défini, la navigation du navigateur reste donc stricte par défaut.
- Définissez `ssrfPolicy.dangerouslyAllowPrivateNetwork: true` uniquement lorsque vous faites explicitement confiance à la navigation du navigateur sur un réseau privé.
- En mode strict, les points de terminaison de profil CDP distants (`profiles.*.cdpUrl`) sont soumis au même blocage de réseau privé lors des vérifications d'accessibilité/découverte.
- `ssrfPolicy.allowPrivateNetwork` reste pris en charge en tant qu'alias hérité.
- En mode strict, utilisez `ssrfPolicy.hostnameAllowlist` et `ssrfPolicy.allowedHostnames` pour des exceptions explicites.
- Les profils distants sont en attachement uniquement (démarrage/arrêt/réinitialisation désactivés).
- `profiles.*.cdpUrl` accepte `http://`, `https://`, `ws://` et `wss://`. Utilisez HTTP(S) lorsque vous souhaitez qu'OpenClaw découvre `/json/version` ; utilisez WS(S) lorsque votre provider vous fournit une URL WebSocket DevTools directe.
- `remoteCdpTimeoutMs` et `remoteCdpHandshakeTimeoutMs` s'appliquent à l'accessibilité CDP distante et `attachOnly` ainsi qu'aux demandes d'ouverture d'onglets. Les profils de bouclage gérés conservent les valeurs par défaut du CDP local.
- Si un service CDP géré en externe est accessible via le bouclage, définissez le `attachOnly: true` de ce profil ; sinon, OpenClaw considérera le port de bouclage comme un profil de navigateur géré localement et peut signaler des erreurs de propriété de port local.
- Les profils `existing-session` utilisent Chrome MCP au lieu de CDP et peuvent s'attacher sur l'hôte sélectionné ou via un nœud de navigateur connecté.
- Les profils `existing-session` peuvent définir `userDataDir` pour cibler un profil de navigateur spécifique basé sur Chromium tel que Brave ou Edge.
- Les profils `existing-session` conservent les limites actuelles des routes Chrome MCP : actions basées sur des instantanés/références au lieu d'un ciblage par sélecteur CSS, hooks de téléchargement de fichier unique, aucune substitution de délai d'attente de boîte de dialogue, pas de `wait --load networkidle`, et pas de `responsebody`, d'exportation PDF, d'interception de téléchargement ou d'actions par lot.
- Les profils gérés localement `openclaw` attribuent automatiquement `cdpPort` et `cdpUrl` ; ne définissez `cdpUrl` explicitement que pour le CDP distant.
- Les profils gérés localement peuvent définir `executablePath` pour remplacer le `browser.executablePath` global pour ce profil. Utilisez ceci pour exécuter un profil dans Chrome et un autre dans Brave.
- Les profils gérés localement utilisent `browser.localLaunchTimeoutMs` pour la découverte HTTP CDP Chrome après le démarrage du processus et `browser.localCdpReadyTimeoutMs` pour la disponibilité du websocket CDP après le lancement. Augmentez-les sur les hôtes plus lents où Chrome démarre avec succès mais où les vérifications de disponibilité entrent en compétition avec le démarrage. Les deux valeurs doivent être des entiers positifs jusqu'à `120000` ms ; les valeurs de configuration non valides sont rejetées.
- Ordre de détection automatique : navigateur par défaut s'il est basé sur Chromium → Chrome → Brave → Edge → Chromium → Chrome Canary.
- `browser.executablePath` et `browser.profiles.<name>.executablePath` acceptent tous deux `~` et `~/...` pour votre répertoire personnel de votre système d'exploitation avant le lancement de Chromium. Le `userDataDir` par profil sur les profils `existing-session` est également développé avec le tilde.
- Service de contrôle : boucle locale uniquement (port dérivé de `gateway.port`, par défaut `18791`).
- `extraArgs` ajoute des indicateurs de lancement supplémentaires au démarrage local de Chromium (par exemple `--disable-gpu`, la taille de la fenêtre ou les indicateurs de débogage).

---

## Interface utilisateur

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

- `seamColor` : couleur d'accentuation pour l'interface utilisateur chrome de l'application native (teinte de la bulle du mode Talk, etc.).
- `assistant` : substitution de l'identité de l'interface utilisateur de contrôle. Revient à l'identité de l'agent actif.

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
      url: "ws://127.0.0.1:18789",
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

<Accordion title="GatewayDétails des champs de la passerelle">

- `mode` : `local` (exécuter la passerelle) ou `remote`Gateway (se connecter à une passerelle distante). La passerelle refuse de démarrer sauf si `local`.
- `port` : port multiplexé unique pour WS + HTTP. Priorité : `--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`.
- `bind` : `auto`, `loopback` (par défaut), `lan` (`0.0.0.0`), `tailnet`Tailscale (IP Tailscale uniquement), ou `custom`.
- **Alias de liaison hérités** : utilisez les valeurs du mode de liaison dans `gateway.bind` (`auto`, `loopback`, `lan`, `tailnet`, `custom`), et non les alias d'hôte (`0.0.0.0`, `127.0.0.1`, `localhost`, `::`, `::1`Docker).
- **Note Docker** : la liaison `loopback` par défaut écoute sur `127.0.0.1`Docker à l'intérieur du conteneur. Avec le réseau pont Docker (`-p 18789:18789`), le trafic arrive sur `eth0`, donc la passerelle est inaccessible. Utilisez `--network host`, ou définissez `bind: "lan"` (ou `bind: "custom"` avec `customBindHost: "0.0.0.0"`) pour écouter sur toutes les interfaces.
- **Auth** : requise par défaut. Les liaisons non-boucle locale nécessitent l'authentification de la passerelle. En pratique, cela signifie un jeton/mot de passe partagé ou un proxy inverse conscient de l'identité avec `gateway.auth.mode: "trusted-proxy"`. L'assistant d'intégration génère un jeton par défaut.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés (y compris SecretRefs), définissez `gateway.auth.mode` explicitement sur `token` ou `password`. Les flux de démarrage et d'installation/réparation du service échouent lorsque les deux sont configurés et que le mode n'est pas défini.
- `gateway.auth.mode: "none"` : mode sans authentification explicite. À utiliser uniquement pour les configurations de boucle locale de confiance ; cela n'est intentionnellement pas proposé par les invites d'intégration.
- `gateway.auth.mode: "trusted-proxy"` : déléguer l'authentification du navigateur/utilisateur à un proxy inverse conscient de l'identité et faire confiance aux en-têtes d'identité de `gateway.trustedProxies` (voir [Trusted Proxy Auth](/fr/gateway/trusted-proxy-auth)). Ce mode s'attend par défaut à une source proxy **non-boucle locale** ; les proxies inverses de boucle locale sur le même hôte nécessitent `gateway.auth.trustedProxy.allowLoopback = true` explicite. Les appelants internes sur le même hôte peuvent utiliser `gateway.auth.password` comme solution de repli directe locale ; `gateway.auth.token` reste mutuellement exclusif avec le mode de proxy de confiance.
- `gateway.auth.allowTailscale` : lorsque `true`Tailscale, les en-têtes d'identité Tailscale Serve peuvent satisfaire l'authentification UI de contrôle/WebSocket (vérifiés via `tailscale whois`APITailscale). Les points de terminaison de l'API HTTP n'utilisent **pas** cette authentification par en-tête Tailscale ; ils suivent plutôt le mode d'authentification HTTP normal de la passerelle. Ce flux sans jeton suppose que l'hôte de la passerelle est digne de confiance. La valeur par défaut est `true` lorsque `tailscale.mode = "serve"`.
- `gateway.auth.rateLimit` : limiteur d'échec d'authentification optionnel. S'applique par IP client et par portée d'authentification (secret partagé et jeton d'appareil sont suivis indépendamment). Les tentatives bloquées renvoient `429` + `Retry-After`Tailscale.
  - Sur le chemin asynchrone de l'UI de contrôle Tailscale Serve, les tentatives échouées pour le même `{scope, clientIp}` sont sérialisées avant l'écriture de l'échec. Par conséquent, de mauvaises tentatives simultanées du même client peuvent déclencher le limiteur dès la deuxième demande au lieu que les deux se concurrencent comme de simples inadéquations.
  - `gateway.auth.rateLimit.exemptLoopback` est `true` par défaut ; définissez `false` si vous souhaitez intentionnellement limiter le taux du trafic localhost également (pour les configurations de test ou les déploiements de proxy stricts).
- Les tentatives d'authentification WS d'origine navigateur sont toujours limitées avec l'exemption de boucle locale désactivée (défense en profondeur contre la force brute localhost basée sur le navigateur).
- Sur la boucle locale, ces verrouillages d'origine navigateur sont isolés par valeur `Origin` normalisée, de sorte que des échecs répétés d'une origine localhost ne verrouillent pas automatiquement une origine différente.
- `tailscale.mode` : `serve` (tailnet uniquement, liaison boucle locale) ou `funnel` (public, nécessite une authentification).
- `tailscale.preserveFunnel` : lorsque `true` et `tailscale.mode = "serve"`OpenClaw, OpenClaw vérifie `tailscale funnel status` avant de réappliquer Serve au démarrage et l'ignore si une route Funnel configurée en externe couvre déjà le port de la passerelle. Par défaut `false`.
- `controlUi.allowedOrigins`Gateway : liste d'autorisation d'origine navigateur explicite pour les connexions WebSocket de la passerelle. Requis pour les origines navigateur publiques non-boucle locale. Les chargements d'UI LAN/Tailnet de même origine privée à partir de la boucle locale, RFC1918/link-local, `.local`, `.ts.net`Tailscale ou des hôtes Tailscale CGNAT sont acceptés sans activer le repli d'en-tête d'hôte.
- `controlUi.chatMessageMaxWidth` : largeur maximale optionnelle pour les messages de chat groupés de l'UI de contrôle. Accepte des valeurs de largeur CSS contraintes telles que `960px`, `82%`, `min(1280px, 82%)` et `calc(100% - 2rem)`.
- `controlUi.dangerouslyAllowHostHeaderOriginFallback` : mode dangereux qui active le repli d'origine d'en-tête d'hôte pour les déploiements qui s'appuient intentionnellement sur la stratégie d'origine d'en-tête d'hôte.
- `remote.transport` : `ssh` (par défaut) ou `direct` (ws/wss). Pour `direct`, `remote.url` doit être `wss://` pour les hôtes publics ; le texte brut `ws://` est accepté uniquement pour la boucle locale, le LAN, le lien local, `.local`, `.ts.net`Tailscale et les hôtes Tailscale CGNAT.
- `remote.remotePort` : port de la passerelle sur l'hôte SSH distant. La valeur par défaut est `18789` ; utilisez ceci lorsque le port du tunnel local diffère du port de la passerelle distante.
- `gateway.remote.token` / `.password` sont des champs d'identification pour les clients distants. Ils ne configurent pas l'authentification de la passerelle par eux-mêmes.
- `gateway.push.apns.relay.baseUrl`iOSiOS : URL HTTPS de base pour le relais APNs externe utilisé par les versions officielles/TestFlight iOS après avoir publié des enregistrements pris en charge par le relais vers la passerelle. Cette URL doit correspondre à l'URL du relais compilée dans la version iOS.
- `gateway.push.apns.relay.timeoutMs` : délai d'envoi passerelle-vers-relais en millisecondes. La valeur par défaut est `10000`iOS.
- Les enregistrements pris en charge par le relais sont délégués à une identité de passerelle spécifique. L'application iOS associée récupère `gateway.identity.get`, inclut cette identité dans l'enregistrement du relais et transfère une subvention d'envoi limitée à l'enregistrement à la passerelle. Une autre passerelle ne peut pas réutiliser cet enregistrement stocké.
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS` : remplacements d'environnement temporaires pour la configuration de relais ci-dessus.
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` : échappatoire de développement uniquement pour les URL de relais HTTP de boucle locale. Les URL de relais de production doivent rester en HTTPS.
- `gateway.handshakeTimeoutMs`Gateway : délai d'expiration de la prise de contact WebSocket de passerelle pré-authentification en millisecondes. Par défaut : `15000`. `OPENCLAW_HANDSHAKE_TIMEOUT_MS` a la priorité lorsqu'il est défini. Augmentez ceci sur les hôtes chargés ou peu puissants où les clients locaux peuvent se connecter pendant que le préchauffage du démarrage se termine encore.
- `gateway.channelHealthCheckMinutes` : intervalle de surveillance de santé du canal en minutes. Définissez `0` pour désactiver les redémarrages de surveillance de santé globalement. Par défaut : `5`.
- `gateway.channelStaleEventThresholdMinutes` : seuil de socket périmé en minutes. Gardez ceci supérieur ou égal à `gateway.channelHealthCheckMinutes`. Par défaut : `30`.
- `gateway.channelMaxRestartsPerHour` : nombre maximum de redémarrages de surveillance de santé par canal/compte sur une heure glissante. Par défaut : `10`.
- `channels.<provider>.healthMonitor.enabled` : refus par canal des redémarrages de surveillance de santé tout en maintenant le moniteur global activé.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled` : remplacement par compte pour les canaux multi-comptes. Lorsqu'il est défini, il a la priorité sur le remplacement au niveau du canal.
- Les chemins d'appel de passerelle locale peuvent utiliser `gateway.remote.*` comme solution de repli uniquement lorsque `gateway.auth.*` n'est pas défini.
- Si `gateway.auth.token` / `gateway.auth.password` est explicitement configuré via SecretRef et non résolu, la résolution échoue fermée (aucun masquage de repli distant).
- `trustedProxies`Tailscale : IPs de proxy inverse qui terminent le TLS ou injectent des en-têtes de client transférés. Ne listez que les proxies que vous contrôlez. Les entrées de boucle locale sont toujours valides pour les configurations de proxy/détection locale sur le même hôte (par exemple Tailscale Serve ou un proxy inverse local), mais elles ne rendent **pas** les demandes de boucle locale éligibles pour `gateway.auth.mode: "trusted-proxy"`.
- `allowRealIpFallback` : lorsque `true`, la passerelle accepte `X-Real-IP` si `X-Forwarded-For` est manquant. Par défaut `false` pour un comportement d'échec fermé.
- `gateway.nodes.pairing.autoApproveCidrs`WebChat : liste d'autorisation CIDR/IP optionnelle pour approuver automatiquement le premier jumelage d'appareil nœud sans portées demandées. Elle est désactivée si non définie. Cela n'approuve pas automatiquement le jumelage opérateur/navigateur/UI de contrôle/WebChat, et cela n'approuve pas automatiquement les mises à niveau de rôle, de portée, de métadonnées ou de clé publique.
- `gateway.nodes.allowCommands` / `gateway.nodes.denyCommands` : façonnage global d'autorisation/refus pour les commandes de nœud déclarées après le jumelage et l'évaluation de la liste d'autorisation de la plateforme. Utilisez `allowCommands` pour accepter les commandes de nœud dangereuses telles que `camera.snap`, `camera.clip` et `screen.record` ; `denyCommands` supprime une commande même si une autorisation par défaut de plateforme ou explicite l'inclurait autrement. Après qu'un nœud a modifié sa liste de commandes déclarées, rejetez et réapprouvez ce jumelage d'appareil afin que la passerelle stocke l'instantané de commande mis à jour.
- `gateway.tools.deny` : noms d'outils supplémentaires bloqués pour le `POST /tools/invoke` HTTP (étend la liste de refus par défaut).
- `gateway.tools.allow` : supprime les noms d'outils de la liste de refus HTTP par défaut.

</Accordion>

### Points de terminaison compatibles OpenAI

- Admin HTTP RPC : désactivé par défaut en tant que plugin `admin-http-rpc` . Activez le plugin pour enregistrer `POST /api/v1/admin/rpc` . Voir [Admin HTTP RPC](/fr/plugins/admin-http-rpc).
- Chat Completions : désactivé par défaut. Activez avec `gateway.http.endpoints.chatCompletions.enabled: true`.
- Responses API : `gateway.http.endpoints.responses.enabled`.
- Durcissement de l'entrée URL des réponses :
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    Les listes d'autorisation (allowlists) vides sont traitées comme non définies ; utilisez `gateway.http.endpoints.responses.files.allowUrl=false`
    et/ou `gateway.http.endpoints.responses.images.allowUrl=false` pour désactiver la récupération d'URL.
- En-tête facultatif de durcissement des réponses :
  - `gateway.http.securityHeaders.strictTransportSecurity` (à définir uniquement pour les origines HTTPS que vous contrôlez ; voir [Trusted Proxy Auth](/fr/gateway/trusted-proxy-auth#tls-termination-and-hsts))

### Isolation multi-instance

Exécutez plusieurs passerelles sur un seul hôte avec des ports et des répertoires d'état uniques :

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

Drapeaux de commodité : `--dev` (utilise `~/.openclaw-dev` + port `19001`), `--profile <name>` (utilise `~/.openclaw-<name>`).

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

- `enabled` : active la terminaison TLS au niveau de l'écouteur de passerelle (HTTPS/WSS) (par défaut : `false`).
- `autoGenerate` : génère automatiquement une paire de certificats/clés auto-signés locaux lorsque des fichiers explicites ne sont pas configurés ; pour un usage local/dév uniquement.
- `certPath` : chemin du système de fichiers vers le fichier de certificat TLS.
- `keyPath` : chemin du système de fichiers vers le fichier de clé privée TLS ; à maintenir avec des permissions restreintes.
- `caPath` : chemin facultatif vers un bundle de CA pour la vérification du client ou des chaînes de confiance personnalisées.

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
  - `"restart"` : redémarre toujours le processus de passerelle lors d'un changement de configuration.
  - `"hot"` : applique les modifications en processus sans redémarrage.
  - `"hybrid"` (par défaut) : essaie d'abord le rechargement à chaud (hot reload) ; revient au redémarrage si nécessaire.
- `debounceMs` : fenêtre de débounce en ms avant l'application des modifications de configuration (entier non négatif).
- `deferralTimeoutMs` : temps maximum facultatif en ms à attendre pour les opérations en cours avant de forcer un redémarrage ou un rechargement à chaud du channel. Omettez-le pour utiliser l'attente bornée par défaut (`300000`) ; définissez `0` pour attendre indéfiniment et consigner périodiquement des avertissements pour les opérations toujours en attente.

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

Auth : `Authorization: Bearer <token>` ou `x-openclaw-token: <token>`.
Les jetons de hook de chaîne de requête sont rejetés.

Notes de validation et de sécurité :

- `hooks.enabled=true` nécessite un `hooks.token` non vide.
- `hooks.token` doit être distinct de `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` ; la réutilisation du jeton Gateway entraîne l'échec de la validation au démarrage.
- `openclaw security audit` signale également la `hooks.token` de l'authentification par mot de passe active du Gateway (`gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`, ou `--auth password --password <password>`) comme une critique ; la réutilisation en mode mot de passe reste compatible au démarrage et doit être corrigée en faisant pivoter l'un des secrets.
- `hooks.path` ne peut pas être `/` ; utilisez un sous-chemin dédié tel que `/hooks`.
- Si `hooks.allowRequestSessionKey=true`, contraignez `hooks.allowedSessionKeyPrefixes` (par exemple `["hook:"]`).
- Si un mappage ou un préréglage utilise une `sessionKey` basée sur un modèle, définissez `hooks.allowedSessionKeyPrefixes` et `hooks.allowRequestSessionKey=true`. Les clés de mappage statiques ne nécessitent pas cette activation.

**Points de terminaison :**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - La `sessionKey` du payload de la requête est acceptée uniquement lorsque `hooks.allowRequestSessionKey=true` (par défaut : `false`).
- `POST /hooks/<name>` → résolu via `hooks.mappings`
  - Les valeurs de `sessionKey` de mappage rendues par modèle sont traitées comme fournies en externe et nécessitent également `hooks.allowRequestSessionKey=true`.

<Accordion title="Détails du mappage">

- `match.path` correspond au sous-chemin après `/hooks` (par ex. `/hooks/gmail` → `gmail`).
- `match.source` correspond à un champ de payload pour les chemins génériques.
- Les modèles comme `{{messages[0].subject}}` lisent le payload.
- `transform` peut pointer vers un module JS/TS renvoyant une action de hook.
  - `transform.module` doit être un chemin relatif et rester dans `hooks.transformsDir` (les chemins absolus et les traversées sont rejetés).
  - Gardez `hooks.transformsDir` sous `~/.openclaw/hooks/transforms` ; les répertoires de compétences de l'espace de travail sont rejetés. Si `openclaw doctor` signale ce chemin comme invalide, déplacez le module de transformation dans le répertoire des transformations des hooks ou supprimez `hooks.transformsDir`.
- `agentId` achemine vers un agent spécifique ; les ID inconnus reviennent à l'agent par défaut.
- `allowedAgentIds` : restreint l'acheminement effectif de l'agent, y compris le chemin de l'agent par défaut lorsque `agentId` est omis (`*` ou omis = tout autoriser, `[]` = tout refuser).
- `defaultSessionKey` : clé de session fixe optionnelle pour les exécutions d'agents de hook sans `sessionKey` explicite.
- `allowRequestSessionKey` : autoriser les appelants `/hooks/agent` et les clés de session de mappage pilotées par modèle à définir `sessionKey` (par défaut : `false`).
- `allowedSessionKeyPrefixes` : liste d'autorisation de préfixe optionnelle pour les valeurs `sessionKey` explicites (requête + mappage), par ex. `["hook:"]`. Elle devient obligatoire lorsqu'un mappage ou un préréglage utilise une `sessionKey` basée sur un modèle.
- `deliver: true` envoie la réponse finale à un channel ; `channel` correspond par défaut à `last`.
- `model` remplace le LLM pour cette exécution de hook (doit être autorisé si le catalogue de modèles est défini).

</Accordion>

### Intégration Gmail

- Le préréglage Gmail intégré utilise `sessionKey: "hook:gmail:{{messages[0].id}}"`.
- Si vous conservez ce routage par message, définissez `hooks.allowRequestSessionKey: true` et limitez `hooks.allowedSessionKeyPrefixes` pour qu'il corresponde à l'espace de noms Gmail, par exemple `["hook:", "hook:gmail:"]`.
- Si vous avez besoin de `hooks.allowRequestSessionKey: false`, remplacez le préréglage par un `sessionKey` statique au lieu du modèle par défaut.

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

- Le Gateway démarre automatiquement `gog gmail watch serve` au démarrage lorsqu'il est configuré. Définissez `OPENCLAW_SKIP_GMAIL_WATCHER=1` pour désactiver.
- N'exécutez pas un `gog gmail watch serve` distinct parallèlement au Gateway.

---

## Hôte du plugin Canvas

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

- Sert du HTML/CSS/JS modifiable par l'agent et l'A2UI via HTTP sous le port du Gateway :
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- Local uniquement : conserver `gateway.bind: "loopback"` (par défaut).
- Liaisons non bouclées : les routes canvas nécessitent une authentification Gateway (jeton/mot de passe/proxy de confiance), tout comme les autres surfaces HTTP Gateway.
- Les Node WebViews n'envoient généralement pas d'en-têtes d'authentification ; après qu'un nœud est apparié et connecté, le Gateway annonce des URL de capacité avec portée de nœud pour l'accès canvas/A2UI.
- Les URL de capacité sont liées à la session WS active du nœud et expirent rapidement. Le secours basé sur l'IP n'est pas utilisé.
- Injecte le client de rechargement à chaud dans le HTML servi.
- Crée automatiquement un `index.html` de démarrage lorsqu'il est vide.
- Sert également A2UI sur `/__openclaw__/a2ui/`.
- Les modifications nécessitent un redémarrage de la passerelle.
- Désactiver le rechargement en direct pour les grands répertoires ou les erreurs `EMFILE`.

---

## Découverte

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

- `minimal` (par défaut lorsque le plugin `bonjour` inclus est activé) : omettre `cliPath` + `sshPort` des enregistrements TXT.
- `full` : inclure `cliPath` + `sshPort` ; la publicité multidiffusion LAN nécessite toujours que le plugin `bonjour` inclus soit activé.
- `off` : supprimer la publicité multidiffusion LAN sans modifier l'activation du plugin.
- Le plugin `bonjour` inclus démarre automatiquement sur les hôtes macOS et est optionnel sur Linux, Windows et les déploiements Gateway conteneurisés.
- Le nom d'hôte par défaut est le nom d'hôte système lorsqu'il s'agit d'une étiquette DNS valide, sinon `openclaw`. Remplacer par `OPENCLAW_MDNS_HOSTNAME`.

### Large zone (DNS-SD)

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

Écrit une zone DNS-SD de monodiffusion sous `~/.openclaw/dns/`. Pour la découverte inter-réseau, associez à un serveur DNS (CoreDNS recommandé) + DNS fractionné Tailscale.

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

- Les variables d'environnement en ligne ne sont appliquées que si la clé est manquante dans l'environnement du processus.
- `.env` fichiers : CWD `.env` + `~/.openclaw/.env` (aucun ne remplace les vars existantes).
- `shellEnv` : importe les clés attendues manquantes depuis votre profil de shell de connexion.
- Voir [Environment](/fr/help/environment) pour la précédence complète.

### Substitution de variables d'environnement

Référencez les vars d'environnement dans n'importe quelle chaîne de configuration avec `${VAR_NAME}` :

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- Seuls les noms en majuscules correspondent : `[A-Z_][A-Z0-9_]*`.
- Les variables manquantes ou vides provoquent une erreur lors du chargement de la configuration.
- Échappez avec `$${VAR}` pour un `${VAR}` littéral.
- Fonctionne avec `$include`.

---

## Secrets

Les références de secrets sont additives : les valeurs en clair fonctionnent toujours.

### `SecretRef`

Utilisez une seule forme d'objet :

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

Validation :

- modèle `provider` : `^[a-z][a-z0-9_-]{0,63}$`
- modèle d'ID `source: "env"` : `^[A-Z][A-Z0-9_]{0,127}$`
- ID `source: "file"` : pointeur JSON absolu (par exemple `"/providers/openai/apiKey"`)
- modèle d'ID `source: "exec"` : `^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$` (prend en charge les sélecteurs `secret#json_key` de style AWS)
- les IDs `source: "exec"` ne doivent pas contenir de segments de chemin délimités par des slashs `.` ou `..` (par exemple `a/../b` est rejeté)

### Surface des identifiants prise en charge

- Matrice canonique : [SecretRef Credential Surface](/fr/reference/secretref-credential-surface)
- `secrets apply` cible les chemins d'identification `openclaw.json` pris en charge.
- Les références `auth-profiles.json` sont incluses dans la résolution lors de l'exécution et la couverture d'audit.

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

- Le fournisseur `file` prend en charge `mode: "json"` et `mode: "singleValue"` (`id` doit être `"value"` en mode singleValue).
- Les chemins des fournisseurs de fichiers et d'exécution échouent en mode fermé lorsque la vérification des ACL Windows n'est pas disponible. Définissez `allowInsecurePath: true` uniquement pour les chemins de confiance qui ne peuvent pas être vérifiés.
- Le fournisseur `exec` nécessite un chemin absolu `command` et utilise les charges utiles de protocole sur stdin/stdout.
- Par défaut, les chemins de commande symboliques sont rejetés. Définissez `allowSymlinkCommand: true` pour autoriser les chemins symboliques tout en validant le chemin cible résolu.
- Si `trustedDirs` est configuré, la vérification du répertoire de confiance s'applique au chemin cible résolu.
- L'environnement enfant `exec` est minimal par défaut ; passez les variables requises explicitement avec `passEnv`.
- Les références de secrets sont résolues au moment de l'activation dans un instantané en mémoire, puis les chemins de requête ne lisent que l'instantané.
- Le filtrage de la surface active s'applique lors de l'activation : les références non résolues sur les surfaces activées entraînent l'échec du démarrage/rechargement, tandis que les surfaces inactives sont ignorées avec des diagnostics.

---

## Stockage de l'authentification

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

- Les profils par agent sont stockés dans `<agentDir>/auth-profiles.json`.
- `auth-profiles.json` prend en charge les références au niveau des valeurs (`keyRef` pour `api_key`, `tokenRef` pour `token`) pour les modes d'identification statiques.
- Les cartes plates héritées `auth-profiles.json` telles que `{ "provider": { "apiKey": "..." } }` ne sont pas un format d'exécution ; `openclaw doctor --fix` les réécrit en profils de clé API canoniques `provider:default` avec une sauvegarde `.legacy-flat.*.bak`.
- Les profils en mode OAuth (`auth.profiles.<id>.mode = "oauth"`) ne prennent pas en charge les identifiants de profil d'authentification soutenus par SecretRef.
- Les identifiants d'exécution statiques proviennent d'instantanés résolus en mémoire ; les entrées statiques héritées `auth.json` sont nettoyées lorsqu'elles sont découvertes.
- Les importations héritées OAuth proviennent de `~/.openclaw/credentials/oauth.json`.
- Voir [OAuth](/fr/concepts/oauth).
- Comportement d'exécution des secrets et de l'outil `audit/configure/apply` : [Gestion des secrets](/fr/gateway/secrets).

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

- `billingBackoffHours` : délai d'attente de base en heures lorsqu'un profil échoue en raison de vraies erreurs de facturation/crédit insuffisant (par défaut : `5`). Un texte de facturation explicite peut toujours atterrir ici même sur les réponses `401` / `403`OpenRouter, mais les correspondants de texte spécifiques au fournisseur restent limités au fournisseur qui les possède (par exemple OpenRouter `Key limit exceeded`). Les messages HTTP `402` réessayables concernant la fenêtre d'utilisation ou la limite de dépense de l'organisation/de l'espace de travail restent plutôt dans le chemin `rate_limit`.
- `billingBackoffHoursByProvider` : remplacements facultatifs par fournisseur pour les heures de délai d'attente de facturation.
- `billingMaxHours` : limite en heures pour la croissance exponentielle du délai d'attente de facturation (par défaut : `24`).
- `authPermanentBackoffMinutes` : délai d'attente de base en minutes pour les échecs `auth_permanent` à haute confiance (par défaut : `10`).
- `authPermanentMaxMinutes` : limite en minutes pour la croissance du délai d'attente `auth_permanent` (par défaut : `60`).
- `failureWindowHours` : fenêtre glissante en heures utilisée pour les compteurs de délai d'attente (par défaut : `24`).
- `overloadedProfileRotations` : nombre maximum de rotations de profils d'authentification du même fournisseur pour les erreurs de surcharge avant de passer au modèle de secours (par défaut : `1`). Les formes de fournisseur occupé telles que `ModelNotReadyException` atterrissent ici.
- `overloadedBackoffMs` : délai fixe avant de réessayer une rotation de fournisseur/profil d'authentification surchargé (par défaut : `0`).
- `rateLimitedProfileRotations` : nombre maximum de rotations de profils d'authentification du même fournisseur pour les erreurs de limite de débit avant de passer au modèle de secours (par défaut : `1`). Ce compartiment de limite de débit inclut du texte spécifique au fournisseur tel que `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded` et `resource exhausted`.

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
- `maxFileBytes` : taille maximale en octets du fichier journal actif avant la rotation (entier positif ; par défaut : `104857600` = 100 Mo). OpenClaw conserve jusqu'à cinq archives numérotées à côté du fichier actif.
- `redactSensitive` / `redactPatterns` : masquage au mieux pour la sortie console, les fichiers journaux, les enregistrements de journaux OTLP et le texte de transcription de session persisté. `redactSensitive: "off"` ne désactive que cette stratégie générale de journal/transcription ; les surfaces de sécurité de l'interface utilisateur, des outils et des diagnostics masquent toujours les secrets avant émission.

---

## Diagnostics

```json5
{
  diagnostics: {
    enabled: true,
    flags: ["telegram.*"],
    stuckSessionWarnMs: 30000,
    stuckSessionAbortMs: 300000,
    memoryPressureSnapshot: false,

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
        toolDefinitions: false,
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

- `enabled` : interrupteur principal pour la sortie d'instrumentation (par défaut : `true`).
- `flags` : tableau de chaînes de drapeaux activant une sortie de journal ciblée (prend en charge les caractères génériques comme `"telegram.*"` ou `"*"`).
- `stuckSessionWarnMs` : seuil d'âge sans progression en ms pour classer les sessions de traitement longues comme `session.long_running`, `session.stalled` ou `session.stuck`. Les progrès de réponse, d'outil, de statut, de bloc et d'ACP réinitialisent le chronomètre ; les diagnostics `session.stuck` répétés se désengagent tant qu'ils sont inchangés.
- `stuckSessionAbortMs` : seuil d'âge sans progression en ms avant que le travail actif éligible et bloqué puisse être drainé par abandon pour récupération. Si non défini, OpenClaw utilise la fenêtre d'exécution intégrée étendue plus sûre d'au moins 5 minutes et 3x `stuckSessionWarnMs`.
- `memoryPressureSnapshot` : capture un instantané de stabilité expurgé pré-OOM lorsque la pression mémoire atteint `critical` (par défaut : `false`). Définissez sur `true` pour ajouter l'analyse/écriture du fichier bundle de stabilité tout en conservant les événements normaux de pression mémoire.
- `otel.enabled` : active le pipeline d'exportation OpenTelemetry (par défaut : `false`). Pour la configuration complète, le catalogue des signaux et le modèle de confidentialité, consultez [Exportation OpenTelemetry](/fr/gateway/opentelemetry).
- `otel.endpoint` : URL du collecteur pour l'exportation OTel.
- `otel.tracesEndpoint` / `otel.metricsEndpoint` / `otel.logsEndpoint` : terminaux OTLP spécifiques au signal facultatifs. Lorsqu'ils sont définis, ils remplacent `otel.endpoint` pour ce signal uniquement.
- `otel.protocol` : `"http/protobuf"` (par défaut) ou `"grpc"`.
- `otel.headers` : en-têtes de métadonnées HTTP/gRPC supplémentaires envoyés avec les requêtes d'exportation OTel.
- `otel.serviceName` : nom du service pour les attributs de ressource.
- `otel.traces` / `otel.metrics` / `otel.logs` : activer l'exportation des traces, des mesures ou des journaux.
- `otel.sampleRate` : taux d'échantillonnage des traces `0`-`1`.
- `otel.flushIntervalMs` : intervalle de vidage périodique de la télémétrie en ms.
- `otel.captureContent` : capture de contenu brute optionnelle pour les attributs de span OTEL. Désactivé par défaut. Le booléen `true` capture le contenu des messages/outils non système ; la forme objet vous permet d'activer `inputMessages`, `outputMessages`, `toolInputs`, `toolOutputs`, `systemPrompt`, et `toolDefinitions` explicitement.
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental` : commutateur d'environnement pour la dernière forme expérimentale de span d'inférence GenAI, incluant les noms de span `{gen_ai.operation.name} {gen_ai.request.model}`, le genre de span `CLIENT`, et `gen_ai.provider.name` au lieu de `gen_ai.system` obsolète. Par défaut, les spans conservent `openclaw.model.call` et `gen_ai.system` pour la compatibilité ; les métriques GenAI utilisent des attributs sémantiques bornés.
- `OPENCLAW_OTEL_PRELOADED=1` : bascule d'environnement pour les hôtes qui ont déjà enregistré un SDK OpenTelemetry global. OpenClaw ignore alors le démarrage/arrêt du SDK propriétaire du plugin tout en gardant les écouteurs de diagnostic actifs.
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` et `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` : variables d'environnement de point de terminaison spécifiques aux signaux, utilisées lorsque la clé de configuration correspondante n'est pas définie.
- `cacheTrace.enabled` : consigner les instantanés de trace du cache pour les exécutions intégrées (par défaut : `false`).
- `cacheTrace.filePath` : chemin de sortie pour le JSONL de trace du cache (par défaut : `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`).
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem` : contrôlent ce qui est inclus dans la sortie de trace du cache (tous par défaut : `true`).

---

## Update

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

- `channel` : canal de publication pour les installations npm/git - `"stable"`, `"beta"` ou `"dev"`.
- `checkOnStart` : vérifier les mises à jour npm au démarrage de la passerelle (par défaut : `true`).
- `auto.enabled` : activer la mise à jour automatique en arrière-plan pour les installations de paquets (par défaut : `false`).
- `auto.stableDelayHours` : délai minimum en heures avant l'application automatique du canal stable (par défaut : `6` ; max : `168`).
- `auto.stableJitterHours` : fenêtre de délai de déploiement supplémentaire pour le canal stable en heures (par défaut : `12` ; max : `168`).
- `auto.betaCheckIntervalHours` : fréquence des vérifications du canal bêta en heures (par défaut : `1` ; max : `24`).

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

- `enabled` : fonctionnalité de verrouillage globale ACP (par défaut : `true` ; définir `false` pour masquer les fonctions de distribution et de génération ACP).
- `dispatch.enabled` : porte indépendante pour la répartition des tours de session ACP (par défaut : `true`). Définissez `false` pour garder les commandes ACP disponibles tout en bloquant l'exécution.
- `backend` : identifiant du backend d'exécution ACP par défaut (doit correspondre à un plugin d'exécution ACP enregistré).
  Installez d'abord le plugin du backend, et si `plugins.allow` est défini, incluez l'identifiant du plugin du backend (par exemple `acpx`), sinon le backend ACP ne se chargera pas.
- `defaultAgent` : identifiant de l'agent cible ACP par défaut lorsque les créations ne spécifient pas de cible explicite.
- `allowedAgents` : liste d'autorisation des identifiants d'agents autorisés pour les sessions d'exécution ACP ; vide signifie aucune restriction supplémentaire.
- `maxConcurrentSessions` : nombre maximum de sessions ACP actives simultanément.
- `stream.coalesceIdleMs` : fenêtre de vidange inactive en ms pour le texte diffusé en flux.
- `stream.maxChunkChars` : taille maximale du bloc avant fractionnement de la projection de bloc diffusé en flux.
- `stream.repeatSuppression` : supprimer les lignes de statut/tool répétées par tour (par défaut : `true`).
- `stream.deliveryMode` : `"live"` diffuse de manière incrémentielle ; `"final_only"` met en tampon jusqu'aux événements de fin de tour.
- `stream.hiddenBoundarySeparator` : séparateur avant le texte visible après les événements tool masqués (par défaut : `"paragraph"`).
- `stream.maxOutputChars` : nombre maximum de caractères de sortie de l'assistant projetés par tour ACP.
- `stream.maxSessionUpdateChars` : nombre maximum de caractères pour les lignes de statut/mise à jour ACP projetées.
- `stream.tagVisibility` : enregistrement des noms de balises vers des substitutions de visibilité booléennes pour les événements diffusés.
- `runtime.ttlMinutes` : TTL inactif en minutes pour les workers de session ACP avant nettoyage éligible.
- `runtime.installCommand` : commande d'installation optionnelle à exécuter lors de l'amorçage d'un environnement d'exécution ACP.

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

- `cli.banner.taglineMode` contrôle le style de la devise de la bannière :
  - `"random"` (par défaut) : devises amusantes/saisonnières rotatives.
  - `"default"` : devise neutre fixe (`All your chats, one OpenClaw.`).
  - `"off"` : pas de texte de slogan (le titre/version de la bannière sont toujours affichés).
- Pour masquer la bannière entière (pas seulement les slogans), définissez la variable d'environnement `OPENCLAW_HIDE_BANNER=1`.

---

## Assistant

Métadonnées écrites par les flux de configuration guidée de la CLI (`onboard`, `configure`, `doctor`) :

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

Les versions actuelles n'incluent plus le pont TCP. Les nœuds se connectent via le WebSocket du Gateway. Les clés `bridge.*` ne font plus partie du schéma de configuration (la validation échoue jusqu'à leur retrait ; `openclaw doctor --fix` peut supprimer les clés inconnues).

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
    maxConcurrentRuns: 8, // default; cron dispatch + isolated cron agent-turn execution
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

- `sessionRetention` : durée de conservation des sessions isolées de cron terminées avant leur nettoyage depuis `sessions.json`. Contrôle également le nettoyage des transcriptions de cron supprimées et archivées. Par défaut : `24h` ; définissez `false` pour désactiver.
- `runLog.maxBytes` : taille maximale par fichier journal d'exécution (`cron/runs/<jobId>.jsonl`) avant nettoyage. Par défaut : `2_000_000` octets.
- `runLog.keepLines` : lignes les plus récentes conservées lorsque le nettoyage du journal d'exécution est déclenché. Par défaut : `2000`.
- `webhookToken` : jeton porteur (bearer token) utilisé pour la livraison POST du webhook de cron (`delivery.mode = "webhook"`) ; si omis, aucun en-tête d'authentification n'est envoyé.
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

- `maxAttempts` : nombre maximal de nouvelles tentatives pour les tâches cron en cas d'erreurs transitoires (par défaut : `3` ; plage : `0`-`10`).
- `backoffMs` : tableau des délais d'attente exponentiels en ms pour chaque tentative de nouvelle tentative (par défaut : `[30000, 60000, 300000]` ; 1-10 entrées).
- `retryOn` : types d'erreurs qui déclenchent de nouvelles tentatives - `"rate_limit"`, `"overloaded"`, `"network"`, `"timeout"`, `"server_error"`. Omettre pour réessayer tous les types transitoires.

Les tâches ponctuelles restent activées jusqu'à épuisement des tentatives de nouvelle tentative, puis sont désactivées tout en conservant l'état d'erreur final. Les tâches récurrentes utilisent la même politique de nouvelle tentative transitoire pour s'exécuter à nouveau après l'attente avant leur prochaine planification ; les erreurs permanentes ou l'épuisement des nouvelles tentatives transitoires reviennent à la planification récurrente normale avec une attente en cas d'erreur.

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
- `mode` : mode de livraison - `"announce"` envoie via un message de channel ; `"webhook"` publie sur le webhook configuré.
- `accountId` : identifiant de compte ou de channel optionnel pour délimiter la livraison des alertes.

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
- `mode` : `"announce"` ou `"webhook"` ; par défaut `"announce"` lorsqu'il existe suffisamment de données cibles.
- `channel` : substitution de channel pour la livraison des annonces. `"last"` réutilise le dernier channel de livraison connu.
- `to` : cible d'annonce explicite ou URL de webhook. Requis pour le mode webhook.
- `accountId` : substitution de compte optionnelle pour la livraison.
- Le `delivery.failureDestination` par tâche remplace cette valeur par défaut globale.
- When neither global nor per-job failure destination is set, jobs that already deliver via `announce` fall back to that primary announce target on failure.
- `delivery.failureDestination` is only supported for `sessionTarget="isolated"` jobs unless the job's primary `delivery.mode` is `"webhook"`.

See [Cron Jobs](/fr/automation/cron-jobs). Isolated cron executions are tracked as [background tasks](/fr/automation/tasks).

---

## Variables de modèle de modèle de média

Template placeholders expanded in `tools.media.models[].args`:

| Variable           | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| `{{Body}}`         | Corps complet du message entrant                                   |
| `{{RawBody}}`      | Corps brut (sans wrappers d'historique/expéditeur)                 |
| `{{BodyStripped}}` | Corps sans les mentions de groupe                                  |
| `{{From}}`         | Identifiant de l'expéditeur                                        |
| `{{To}}`           | Identifiant de la destination                                      |
| `{{MessageSid}}`   | Id du message du canal                                             |
| `{{SessionId}}`    | UUID de la session actuelle                                        |
| `{{IsNewSession}}` | `"true"` when new session created                                  |
| `{{MediaUrl}}`     | Pseudo-URL du média entrant                                        |
| `{{MediaPath}}`    | Chemin du média local                                              |
| `{{MediaType}}`    | Type de média (image/audio/document/…)                             |
| `{{Transcript}}`   | Transcription audio                                                |
| `{{Prompt}}`       | Invite de média résolue pour les entrées CLI                       |
| `{{MaxChars}}`     | Nombre maximum de caractères de sortie résolu pour les entrées CLI |
| `{{ChatType}}`     | `"direct"` or `"group"`                                            |
| `{{GroupSubject}}` | Sujet du groupe (au mieux)                                         |
| `{{GroupMembers}}` | Aperçu des membres du groupe (au mieux)                            |
| `{{SenderName}}`   | Nom d'affichage de l'expéditeur (au mieux)                         |
| `{{SenderE164}}`   | Numéro de téléphone de l'expéditeur (au mieux)                     |
| `{{Provider}}`     | Indication de fournisseur (whatsapp, telegram, discord, etc.)      |

---

## Config includes (`$include`)

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
- Tableau de fichiers : fusionné en profondeur dans l'ordre (les fichiers suivants remplacent les précédents).
- Clés adjacentes : fusionnées après les inclusions (remplacent les valeurs incluses).
- Inclusions imbriquées : jusqu'à 10 niveaux de profondeur.
- Paths: resolved relative to the including file, but must stay inside the top-level config directory (`dirname` of `openclaw.json`). Absolute/`../` forms are allowed only when they still resolve inside that boundary. Paths must not contain null bytes and must be strictly shorter than 4096 characters before and after resolution.
- OpenClaw-owned writes that change only one top-level section backed by a single-file include write through to that included file. For example, OpenClaw`plugins install` updates `plugins: { $include: "./plugins.json5" }` in `plugins.json5` and leaves `openclaw.json` intact.
- Les inclusions racines, les tableaux d'inclusions et les inclusions avec des remplacements adjacents sont en lecture seule pour les écritures détenues par OpenClaw ; ces écritures échouent en mode fermé au lieu d'aplatir la configuration.
- Erreurs : messages clairs pour les fichiers manquants, les erreurs d'analyse, les inclusions circulaires, le format de chemin invalide et la longueur excessive.

---

_En relation : [Configuration](/fr/gateway/configuration) · [Exemples de configuration](/fr/gateway/configuration-examples) · [Doctor](/fr/gateway/doctor)_

## En rapport

- [Configuration](/fr/gateway/configuration)
- [Exemples de configuration](/fr/gateway/configuration-examples)
