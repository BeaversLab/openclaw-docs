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

- [Référence de configuration de la mémoire](/fr/reference/memory-config) pour `agents.defaults.memorySearch.*`, `memory.qmd.*`, `memory.citations`, et la configuration de rêve sous `plugins.entries.memory-core.config.dreaming`
- [Commandes slash](/fr/tools/slash-commands) pour le catalogue de commandes intégré actuel + groupé
- pages de propriétaire de channel/plugin pour les surfaces de commandes spécifiques aux channels

Le format de configuration est **JSON5** (commentaires et virgules de fin autorisés). Tous les champs sont optionnels - OpenClaw utilise des valeurs par défaut sûres en cas d'omission.

---

## Channels

Les clés de configuration par canal ont été déplacées vers une page dédiée - voir
[Configuration - channels](/fr/gateway/config-channels) pour `channels.*`,
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
  - `talk.realtime.consultRouting` : Relais de secours du Gateway pour les transcriptions Talk en temps réel finalisées qui ignorent `openclaw_agent_consult`

## Outils et fournisseurs personnalisés

La stratégie d'outil, les bascules expérimentales, la configuration d'outil supportée par le fournisseur, et la configuration
personnalisée du fournisseur / de l'URL de base ont été déplacées vers une page dédiée - voir
[Configuration - tools and custom providers](/fr/gateway/config-tools).

## Modèles

Les définitions de fournisseur, les listes d'autorisation de modèles, et la configuration de fournisseur personnalisé se trouvent dans
[Configuration - tools and custom providers](/fr/gateway/config-tools#custom-providers-and-base-urls).
La racine `models` possède également le comportement global du catalogue de modèles.

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
- `models.providers.*.localService` : gestionnaire de processus à la demande optionnel pour
  les serveurs de modèles locaux. OpenClaw sonde le point de terminaison de santé configuré, démarre
  le `command` absolu si nécessaire, attend la disponibilité, puis envoie la demande de
  modèle. Voir [Local model services](/fr/gateway/local-model-services).
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
        timeout: 20,
        connectTimeout: 5,
        supportsParallelToolCalls: true,
        headers: {
          Authorization: "Bearer ${MCP_REMOTE_TOKEN}",
        },
        auth: "oauth",
        oauth: {
          scope: "docs.read",
        },
        sslVerify: true,
        clientCert: "/path/to/client.crt",
        clientKey: "/path/to/client.key",
        toolFilter: {
          include: ["search_*"],
          exclude: ["admin_*"],
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
- `mcp.servers.<name>.enabled` : définissez `false`OpenClaw pour conserver une définition de serveur enregistrée tout en l'excluant de la découverte OpenClaw MCP intégrée et de la projection de tool.
- `mcp.servers.<name>.timeout` / `requestTimeoutMs` : délai d'expiration de la requête MCP par serveur en secondes ou millisecondes.
- `mcp.servers.<name>.connectTimeout` / `connectionTimeoutMs` : délai d'expiration de la connexion par serveur en secondes ou millisecondes.
- `mcp.servers.<name>.supportsParallelToolCalls` : indication de concurrence optionnelle pour les adaptateurs qui peuvent choisir d'émettre ou non des appels de tool MCP en parallèle.
- `mcp.servers.<name>.auth` : définissez `"oauth"`OAuth pour les serveurs MCP HTTP qui nécessitent OAuth. Exécutez `openclaw mcp login <name>`OpenClaw pour stocker les jetons sous l'état OpenClaw.
- `mcp.servers.<name>.oauth`OAuth : portées OAuth, URL de redirection et URL de remplacement des métadonnées client optionnelles.
- `mcp.servers.<name>.sslVerify` , `clientCert` , `clientKey` : contrôles TLS HTTP pour les points de terminaison privés et le TLS mutuel.
- `mcp.servers.<name>.toolFilter` : sélection de tool par serveur optionnelle. `include` limite les tools MCP découverts aux noms correspondants ; `exclude` masque les noms correspondants. Les entrées sont des noms exacts de tools MCP ou des globs `*` simples. Les serveurs avec des ressources ou des invites génèrent également des noms de tools utilitaires ( `resources_list` , `resources_read` , `prompts_list` , `prompts_get` ), et ces noms utilisent le même filtre.
- `mcp.servers.<name>.codex`OpenClaw : contrôles de projection optionnels pour le serveur d'application Codex.
  Ce bloc est des métadonnées OpenClaw uniquement pour les threads du serveur d'application Codex ; il n'affecte pas
  les sessions ACP, la configuration générique du harnais Codex, ou d'autres adaptateurs d'exécution.
  Une liste `codex.agents`OpenClaw non vide limite le serveur aux IDs d'agent OpenClaw listés.
  Les listes d'agents délimitées vides, vierges ou invalides sont rejetées par la validation de configuration
  et omises par le chemin de projection d'exécution au lieu de devenir globales.
  `codex.defaultToolsApprovalMode` émet le `default_tools_approval_mode`OpenClaw natif de Codex
  pour ce serveur. OpenClaw supprime le bloc `codex`
  avant de passer la configuration `mcp_servers` native à Codex. Omettez le bloc pour
  garder le serveur projeté pour chaque agent du serveur d'application Codex avec le comportement
  d'approbation MCP par défaut de Codex.
- `mcp.sessionIdleTtlMs` : TTL d'inactivité pour les environnements d'exécution MCP regroupés et limités à la session.
  Les exécutions intégrées en un coup demandent un nettoyage en fin d'exécution ; ce TTL est le dernier recours pour
  les sessions longue durée et les futurs appelants.
- Les modifications sous `mcp.*` s'appliquent à chaud en supprimant les environnements d'exécution MCP de session mis en cache.
  La prochaine découverte/utilisation d'outil les recrée à partir de la nouvelle configuration, donc les entrées `mcp.servers` supprimées
  sont nettoyées immédiatement au lieu d'attendre le TTL d'inactivité.
- La découverte lors de l'exécution honore également les notifications de changement de liste d'outils MCP en supprimant
  le catalogue mis en cache pour cette session. Les serveurs qui annoncent des ressources ou
  des invites reçoivent des outils utilitaires pour lister/lire les ressources et lister/récupérer
  les invites. Des échecs répétés d'appels d'outil mettent en pause le serveur affecté brièvement avant
  qu'un autre appel ne soit tenté.

Consultez [MCP](/fr/cli/mcp#openclaw-as-an-mcp-client-registryCLI) et
[les backends CLI](/fr/gateway/cli-backends#bundle-mcp-overlays) pour le comportement d'exécution.

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

- `allowBundled` : liste d'autorisation (allowlist) optionnelle uniquement pour les skills regroupés (skills gérés/espace de travail non affectés).
- `load.extraDirs` : racines de skills partagées supplémentaires (la priorité la plus basse).
- `load.allowSymlinkTargets` : racines cibles réelles de confiance vers lesquelles les liens symboliques de skills peuvent
  se résoudre lorsque le lien réside en dehors de sa racine source configurée.
- `install.preferBrew` : si true, préfère les installateurs Homebrew quand `brew` est disponible avant de revenir à d'autres types d'installateurs.
- `install.nodeManager` : préférence de l'installateur de nœud pour les specs `metadata.openclaw.install` (`npm` | `pnpm` | `yarn` | `bun`).
- `install.allowUploadedArchives` : autoriser les clients `operator.admin` Gateway de confiance à installer des archives zip privées mises en scène via `skills.upload.*` (par défaut : false). Cela active uniquement le chemin de l'archive téléchargée ; les installations normales ClawHub ne l'exigent pas.
- `entries.<skillKey>.enabled: false` désactive une compétence même si elle est regroupée/installée.
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

- Chargé depuis les répertoires de package ou de bundle sous `~/.openclaw/extensions` et `<workspace>/.openclaw/extensions`, plus les fichiers ou répertoires listés dans `plugins.load.paths`.
- Mettez les fichiers de plugin autonomes dans `plugins.load.paths` ; les racines d'extension découvertes automatiquement ignorent les fichiers `.js`, `.mjs` et `.ts` de niveau supérieur afin que les scripts d'aide dans ces racines ne bloquent pas le démarrage.
- Discovery accepte les plugins natifs OpenClaw ainsi que les bundles Codex compatibles et les bundles Claude, y compris les bundles Claude à disposition par défaut sans manifeste.
- **Les modifications de configuration nécessitent un redémarrage de la passerelle.**
- `allow` : liste d'autorisation optionnelle (seuls les plugins listés sont chargés). `deny` l'emporte.
- `plugins.entries.<id>.apiKey` : champ de commodité pour la clé API au niveau du plugin (lorsqu'il est pris en charge par le plugin).
- `plugins.entries.<id>.env` : carte de variables d'environnement scoped au plugin.
- `plugins.entries.<id>.hooks.allowPromptInjection` : lorsque `false`, le cœur bloque `before_prompt_build` et ignore les champs de modification de prompt provenant des `before_agent_start` hérités, tout en préservant `modelOverride` et `providerOverride` hérités. S'applique aux hooks natifs des plugins et aux répertoires de hooks pris en charge fournis par les bundles.
- `plugins.entries.<id>.hooks.allowConversationAccess` : lorsque `true`, les plugins de confiance non inclus dans les bundles peuvent lire le contenu brut de la conversation à partir de hooks typés tels que `llm_input`, `llm_output`, `before_model_resolve`, `before_agent_reply`, `before_agent_run`, `before_agent_finalize` et `agent_end`.
- `plugins.entries.<id>.subagent.allowModelOverride` : accorde explicitement la confiance à ce plugin pour demander des remplacements `provider` et `model` par exécution pour les exécutions de sous-agent en arrière-plan.
- `plugins.entries.<id>.subagent.allowedModels` : liste d'autorisation (allowlist) facultative des cibles `provider/model` canoniques pour les remplacements de sous-agents de confiance. Utilisez `"*"` uniquement lorsque vous souhaitez intentionnellement autoriser n'importe quel model.
- `plugins.entries.<id>.llm.allowModelOverride` : accorde explicitement la confiance à ce plugin pour demander des remplacements de model pour `api.runtime.llm.complete`.
- `plugins.entries.<id>.llm.allowedModels` : liste d'autorisation (allowlist) facultative des cibles `provider/model`LLM canoniques pour les remplacements de complétion LLM de plugins de confiance. Utilisez `"*"` uniquement lorsque vous souhaitez intentionnellement autoriser n'importe quel model.
- `plugins.entries.<id>.llm.allowAgentIdOverride` : accorde explicitement la confiance à ce plugin pour exécuter `api.runtime.llm.complete` sur un ID d'agent autre que celui par défaut.
- `plugins.entries.<id>.config`OpenClaw : objet de configuration défini par le plugin (validé par le schéma de plugin natif OpenClaw lorsque disponible).
- Les paramètres de compte/runtime du plugin de canal se trouvent sous `channels.<id>` et doivent être décrits par les métadonnées `channelConfigs`OpenClaw du manifeste du plugin propriétaire, et non par un registre d'options centralisé OpenClaw.

### Configuration du plugin harnais Codex

Le plugin intégré `codex` possède les paramètres natifs du harnais de serveur d'application Codex sous
`plugins.entries.codex.config`. Voir
[référence du harnais Codex](/fr/plugins/codex-harness-reference) pour la surface de configuration complète
et [harnais Codex](/fr/plugins/codex-harness) pour le modèle d'exécution.

`codexPlugins` s'applique uniquement aux sessions qui sélectionnent le harnais natif Codex.
Il n'active pas les plugins Codex pour les exécutions du provider OpenClaw, les
liaisons de conversation ACP ou tout harnais non-Codex.

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

- `plugins.entries.codex.config.codexPlugins.enabled` : active la prise en charge native des plugins/applications
  Codex pour le harnais Codex. Par défaut : `false`.
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions` :
  stratégie par défaut pour les actions destructrices des sollicitations d'applications de plugin migrées.
  Par défaut : `true`.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.enabled` : active une
  entrée de plugin migrée lorsque le `codexPlugins.enabled` global est également vrai.
  Par défaut : `true` pour les entrées explicites.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.marketplaceName` :
  identité stable de la place de marché. V1 prend uniquement en charge `"openai-curated"`.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.pluginName` : identité
  stable du plugin Codex issue de la migration, par exemple `"google-calendar"`.
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.allow_destructive_actions` :
  substitution de l'action destructrice par plugin. Si omis, la valeur
  `allow_destructive_actions` globale est utilisée.

`codexPlugins.enabled` est la directive d'activation globale. Les entrées explicites de plugins
écrites par la migration constituent l'ensemble durable d'éligibilité pour l'installation et la réparation.
`plugins["*"]` n'est pas pris en charge, il n'y a pas d'interrupteur `install`, et les valeurs
`marketplacePath` locales ne sont intentionnellement pas des champs de configuration car elles sont
spécifiques à l'hôte.

Les vérifications de disponibilité de `app/list` sont mises en cache pendant une heure et actualisées
de manière asynchrone lorsqu'elles sont obsolètes. La configuration de l'application de thread Codex est calculée lors de l'établissement de la
session du harnais Codex, et non à chaque tour ; utilisez `/new`, `/reset`, ou un redémarrage de la passerelle
après avoir modifié la configuration des plugins natifs.

- `plugins.entries.firecrawl.config.webFetch` : paramètres du provider de récupération web Firecrawl.
  - `apiKey` : clé Firecrawl API (accepte SecretRef). Revient à la variable d'environnement `plugins.entries.firecrawl.config.webSearch.apiKey`, à l'ancien `tools.web.fetch.firecrawl.apiKey`, ou à la variable d'environnement `FIRECRAWL_API_KEY`.
  - `baseUrl` : URL de base de l'Firecrawl API (par défaut : `https://api.firecrawl.dev` ; les remplacements pour l'auto-hébergement doivent cibler des points de terminaison privés/internes).
  - `onlyMainContent` : extraire uniquement le contenu principal des pages (par défaut : `true`).
  - `maxAgeMs` : durée maximale du cache en millisecondes (par défaut : `172800000` / 2 jours).
  - `timeoutSeconds` : délai d'expiration de la requête de scraping en secondes (par défaut : `60`).
- `plugins.entries.xai.config.xSearch` : paramètres xAI X Search (recherche web Grok).
  - `enabled` : activer le provider X Search.
  - `model` : modèle Grok à utiliser pour la recherche (par ex. `"grok-4-1-fast"`).
- `plugins.entries.memory-core.config.dreaming` : paramètres de rêverie de la mémoire. Voir [Dreaming](/fr/concepts/dreaming) pour les phases et les seuils.
  - `enabled` : interrupteur principal de rêverie (par défaut `false`).
  - `frequency` : cadence cron pour chaque balayage complet de rêverie (`"0 3 * * *"` par défaut).
  - `model` : option de remplacement facultative du modèle de sous-agent Dream Diary. Nécessite `plugins.entries.memory-core.subagent.allowModelOverride: true` ; à associer à `allowedModels` pour restreindre les cibles. Les erreurs de modèle indisponible réessaient une fois avec le modèle par défaut de la session ; les échecs de confiance ou de liste blanche ne reviennent pas silencieusement au modèle par défaut.
  - la politique de phase et les seuils sont des détails de mise en œuvre (pas des clés de configuration utilisateur).
- La configuration complète de la mémoire se trouve dans [Référence de la configuration de la mémoire](/fr/reference/memory-config) :
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- Les plugins de bundle Claude activés peuvent également contribuer des paramètres par défaut intégrés OpenClaw à partir de OpenClaw`settings.json`OpenClawOpenClaw ; OpenClaw les applique en tant que paramètres d'agent nettoyés, et non en tant que correctifs de configuration bruts OpenClaw.
- `plugins.slots.memory` : choisissez l'identifiant du plugin de mémoire actif, ou `"none"` pour désactiver les plugins de mémoire.
- `plugins.slots.contextEngine` : choisissez l'identifiant du plugin du moteur de contexte actif ; par défaut `"legacy"` sauf si vous installez et sélectionnez un autre moteur.

Voir [Plugins](/fr/tools/plugin).

---

## Engagements

`commitments`OpenClaw contrôle la mémoire de suivi déduite : OpenClaw peut détecter les points d'étape à partir des tours de conversation et les délivrer via des exécutions de battement de cœur (heartbeat).

- `commitments.enabled`LLM : active l'extraction, le stockage et la livraison par battement de cœur masqués du LLM pour les engagements de suivi déduits. Par défaut : `false`.
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
- `tabCleanup` récupère les onglets d'agent principal suivis après une période d'inactivité ou lorsqu'une
  session dépasse sa limite. Définissez `idleMinutes: 0` ou `maxTabsPerSession: 0` pour
  désactiver ces modes de nettoyage individuels.
- `ssrfPolicy.dangerouslyAllowPrivateNetwork` est désactivé s'il n'est pas défini, donc la navigation du navigateur reste stricte par défaut.
- Définissez `ssrfPolicy.dangerouslyAllowPrivateNetwork: true` uniquement lorsque vous faites volontairement confiance à la navigation du navigateur sur le réseau privé.
- En mode strict, les points de terminaison de profil CDP distants (`profiles.*.cdpUrl`) sont soumis au même blocage de réseau privé lors des vérifications d'accessibilité/découverte.
- `ssrfPolicy.allowPrivateNetwork` reste pris en charge en tant qu'alias hérité.
- En mode strict, utilisez `ssrfPolicy.hostnameAllowlist` et `ssrfPolicy.allowedHostnames` pour les exceptions explicites.
- Les profils distants sont en attachement uniquement (démarrage/arrêt/réinitialisation désactivés).
- `profiles.*.cdpUrl` accepte `http://`, `https://`, `ws://`, et `wss://`.
  Utilisez HTTP(S) lorsque vous voulez qu'OpenClaw découvre `/json/version` ; utilisez WS(S)
  lorsque votre provider vous fournit une URL WebSocket DevTools directe.
- `remoteCdpTimeoutMs` et `remoteCdpHandshakeTimeoutMs` s'appliquent à l'accessibilité CDP distante et
  `attachOnly` ainsi qu'aux demandes d'ouverture d'onglet. Les profils de bouclage
  gérés conservent les paramètres CDP locaux par défaut.
- Si un service CDP géré en externe est accessible via le bouclage, définissez le `attachOnly: true`
  de ce profil ; sinon, OpenClaw considérera le port de bouclage comme un
  profil de navigateur géré localement et peut signaler des erreurs de propriété de port local.
- Les profils `existing-session` utilisent Chrome MCP au lieu de CDP et peuvent s'attacher sur
  l'hôte sélectionné ou via un nœud de navigateur connecté.
- Les profils `existing-session` peuvent définir `userDataDir` pour cibler un
  profil de navigateur basé sur Chromium spécifique tel que Brave ou Edge.
- Les profils `existing-session` conservent les limites de routage actuelles de Chrome MCP :
  actions basées sur des instantanés/références au lieu du ciblage par sélecteur CSS, crochets de
  téléchargement de fichier unique, aucune remplacement du délai d'attente des boîtes de dialogue, pas de
  `wait --load networkidle`, et pas de
  `responsebody`, d'exportation PDF, d'interception de téléchargement ou d'actions par lot.
- Les profils `openclaw` gérés localement attribuent automatiquement `cdpPort` et `cdpUrl` ; ne définissez
  `cdpUrl` explicitement que pour le CDP distant.
- Les profils gérés localement peuvent définir `executablePath` pour remplacer le `browser.executablePath`
  global pour ce profil. Utilisez ceci pour exécuter un profil dans
  Chrome et un autre dans Brave.
- Les profils gérés localement utilisent `browser.localLaunchTimeoutMs` pour la découverte HTTP CDP de Chrome après le démarrage du processus et `browser.localCdpReadyTimeoutMs` pour la disponibilité du websocket CDP après le lancement. Augmentez-les sur les hôtes plus lents où Chrome démarre correctement mais où les vérifications de disponibilité entrent en concurrence avec le démarrage. Les deux valeurs doivent être des entiers positifs jusqu'à `120000` ms ; les valeurs de configuration non valides sont rejetées.
- Ordre de détection automatique : navigateur par défaut s'il est basé sur Chromium → Chrome → Brave → Edge → Chromium → Chrome Canary.
- `browser.executablePath` et `browser.profiles.<name>.executablePath` acceptent tous deux `~` et `~/...` pour votre répertoire personnel de l'avant le lancement de Chromium. Le `userDataDir` par profil sur les profils `existing-session` est également développé avec un tilde.
- Service de contrôle : boucle locale uniquement (port dérivé de `gateway.port`, par défaut `18791`).
- `extraArgs` ajoute des indicateurs de lancement supplémentaires au démarrage local de Chromium (par exemple `--disable-gpu`, la taille de la fenêtre ou les indicateurs de débogage).

---

## UI

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

- `seamColor` : couleur d'accentuation pour l'interface utilisateur de l'application native (teinte de la bulle du mode Talk, etc.).
- `assistant` : remplacement de l'identité de l'interface utilisateur de contrôle. Reviens à l'identité de l'agent actif.

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

<Accordion title="Détails des champs de Gateway">

- `mode` : `local` (exécuter le Gateway) ou `remote` (se connecter à un Tailscale distant). Le Docker refuse de démarrer sauf si `local`.
- `port` : port multiplexé unique pour WS + HTTP. Priorité : `--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`.
- `bind` : `auto`, `loopback` (par défaut), `lan` (`0.0.0.0`), `tailnet` (IP Docker uniquement) ou `custom`.
- **Alias de liaison hérités** : utilisez les valeurs du mode de liaison dans `gateway.bind` (`auto`, `loopback`, `lan`, `tailnet`, `custom`), et non les alias d'hôte (`0.0.0.0`, `127.0.0.1`, `localhost`, `::`, `::1`).
- **Note Tailscale** : la liaison `loopback` par défaut écoute sur `127.0.0.1` à l'intérieur du conteneur. Avec le réseau pont API (`-p 18789:18789`), le trafic arrive sur `eth0`, donc le Tailscale est inaccessible. Utilisez `--network host` ou définissez `bind: "lan"` (ou `bind: "custom"` avec `customBindHost: "0.0.0.0"`) pour écouter sur toutes les interfaces.
- **Auth** : requis par défaut. Les liaisons non Tailscale nécessitent l'authentification du OpenClaw. En pratique, cela signifie un jeton/mot de passe partagé ou un proxy inverse sensible à l'identité avec `gateway.auth.mode: "trusted-proxy"`. L'assistant de configuration génère un jeton par défaut.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés (y compris SecretRefs), définissez `gateway.auth.mode` explicitement sur `token` ou `password`. Les flux de démarrage et d'installation/réparation du service échouent lorsque les deux sont configurés et que le mode n'est pas défini.
- `gateway.auth.mode: "none"` : mode sans authentification explicite. À utiliser uniquement pour les configurations Gateway locales de confiance ; cela n'est intentionnellement pas proposé par les invites de configuration.
- `gateway.auth.mode: "trusted-proxy"` : déléguer l'authentification du navigateur/utilisateur à un proxy inverse sensible à l'identité et faire confiance aux en-têtes d'identité de `gateway.trustedProxies` (voir [Authentification de proxy de confiance](/fr/gateway/trusted-proxy-auth)). Ce mode s'attend par défaut à une source proxy **non Tailscale** ; les proxies inverses Tailscale sur le même hôte nécessitent `gateway.auth.trustedProxy.allowLoopback = true` explicite. Les appelants internes sur le même hôte peuvent utiliser `gateway.auth.password` comme repli direct local ; `gateway.auth.token` reste mutuellement exclusif avec le mode de proxy de confiance.
- `gateway.auth.allowTailscale` : quand `true`, les en-têtes d'identité iOS Serve peuvent satisfaire l'authentification UI de contrôle/WebSocket (vérifiés via `tailscale whois`). Les points de terminaison HTTP iOS n'utilisent **pas** cette authentification par en-tête iOS ; ils suivent plutôt le mode d'authentification HTTP normal du Gateway. Ce flux sans jeton suppose que l'hôte du Tailscale est de confiance. Par défaut `true` quand `tailscale.mode = "serve"`.
- `gateway.auth.rateLimit` : limiteur d'échec d'authentification optionnel. S'applique par IP client et par portée d'authentification (shared-secret et device-token sont suivis indépendamment). Les tentatives bloquées renvoient `429` + `Retry-After`.
  - Sur le chemin asynchrone de l'UI de contrôle WebChat Serve, les tentatives échouées pour le même `{scope, clientIp}` sont sérialisées avant l'écriture de l'échec. Par conséquent, les mauvaises tentatives simultanées du même client peuvent déclencher le limiteur dès la deuxième requête au lieu que les deux se disputent en tant que simples non-correspondances.
  - `gateway.auth.rateLimit.exemptLoopback` est par défaut `true` ; définissez `false` si vous souhaitez intentionnellement que le trafic localhost soit également limité en débit (pour les configurations de test ou les déploiements de proxy stricts).
- Les tentatives d'authentification WS d'origine navigateur sont toujours limitées avec l'exemption WebChat désactivée (défense en profondeur contre la force brute localhost basée sur le navigateur).
- Sur WebChat, ces verrouillages d'origine navigateur sont isolés par valeur `Origin` normalisée, de sorte que des échecs répétés d'une origine localhost ne verrouillent pas automatiquement une autre origine.
- `tailscale.mode` : `serve` (tailnet uniquement, liaison WebChat) ou `funnel` (public, nécessite une authentification).
- `tailscale.preserveFunnel` : quand `true` et `tailscale.mode = "serve"`, WebChat vérifie `tailscale funnel status` avant de réappliquer Serve au démarrage et l'ignore si une route Funnel configurée en externe couvre déjà le port du WebChat. Par défaut `false`.
- `controlUi.allowedOrigins` : liste d'autorisation d'origine navigateur explicite pour les connexions WebSocket du WebChat. Requis pour les origines navigateur publiques non WebChat. Les chargements d'UI LAN/Tailnet de même origine privée depuis WebChat, RFC1918/link-local, `.local`, `.ts.net` ou les hôtes CGNAT WebChat sont acceptés sans activer le repli d'en-tête Host.
- `controlUi.chatMessageMaxWidth` : largeur maximale optionnelle pour les messages de chat groupés de l'UI de contrôle. Accepte des valeurs de largeur CSS contraintes telles que `960px`, `82%`, `min(1280px, 82%)` et `calc(100% - 2rem)`.
- `controlUi.dangerouslyAllowHostHeaderOriginFallback` : mode dangereux qui active le repli d'origine d'en-tête Host pour les déploiements qui s'appuient intentionnellement sur la stratégie d'origine d'en-tête Host.
- `remote.transport` : `ssh` (par défaut) ou `direct` (ws/wss). Pour `direct`, `remote.url` doit être `wss://` pour les hôtes publics ; le texte brut `ws://` est accepté uniquement pour WebChat, LAN, link-local, `.local`, `.ts.net` et les hôtes CGNAT WebChat.
- `remote.remotePort` : port du WebChat sur l'hôte SSH distant. Par défaut `18789` ; utilisez ceci lorsque le port du tunnel local diffère du port du WebChat distant.
- `gateway.remote.token` / `.password` sont des champs d'identification pour client distant. Ils ne configurent pas l'authentification du WebChat par eux-mêmes.
- `gateway.push.apns.relay.baseUrl` : URL HTTPS de base pour le relais APNs externe utilisé par les versions officielles/TestFlight WebChat après avoir publié des enregistrements pris en charge par relais au WebChat. Cette URL doit correspondre à l'URL du relais compilée dans la version WebChat.
- `gateway.push.apns.relay.timeoutMs` : délai d'envoi du WebChat au relais en millisecondes. Par défaut `10000`.
- Les enregistrements pris en charge par relais sont délégués à une identité de WebChat spécifique. L'application WebChat couplée récupère `gateway.identity.get`, inclut cette identité dans l'enregistrement du relais et transfère une autorisation d'envoi délimitée par l'enregistrement au WebChat. Un autre WebChat ne peut pas réutiliser cet enregistrement stocké.
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS` : substitutions d'environnement temporaires pour la configuration du relais ci-dessus.
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` : échappement de développement uniquement pour les URL de relais HTTP WebChat. Les URL de relais de production doivent rester sur HTTPS.
- `gateway.handshakeTimeoutMs` : délai d'expiration de la poignée de main WebSocket du WebChat pré-auth en millisecondes. Par défaut : `15000`. `OPENCLAW_HANDSHAKE_TIMEOUT_MS` prend la priorité lorsqu'il est défini. Augmentez ceci sur les hôtes chargés ou peu puissants où les clients locaux peuvent se connecter pendant que le préchauffage du démarrage se stabilise encore.
- `gateway.channelHealthCheckMinutes` : intervalle du moniteur de santé du channel en minutes. Définissez `0` pour désactiver globalement les redémarrages du moniteur de santé. Par défaut : `5`.
- `gateway.channelStaleEventThresholdMinutes` : seuil de socket périmé en minutes. Gardez ceci supérieur ou égal à `gateway.channelHealthCheckMinutes`. Par défaut : `30`.
- `gateway.channelMaxRestartsPerHour` : nombre maximum de redémarrages du moniteur de santé par channel/compte sur une heure glissante. Par défaut : `10`.
- `channels.<provider>.healthMonitor.enabled` : désactivation par channel des redémarrages du moniteur de santé tout en maintenant le moniteur global activé.
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled` : substitution par compte pour les channels multi-comptes. Lorsqu'il est défini, il prend la priorité sur la substitution au niveau du channel.
- Les chemins d'appel du WebChat local peuvent utiliser `gateway.remote.*` comme repli uniquement lorsque `gateway.auth.*` n'est pas défini.
- Si `gateway.auth.token` / `gateway.auth.password` est explicitement configuré via SecretRef et non résolu, la résolution échoue en mode fermé (aucun masquage de repli distant).
- `trustedProxies` : IP de proxy inverse qui terminent TLS ou injectent des en-têtes de client transférés. Ne listez que les proxies que vous contrôlez. Les entrées WebChat sont toujours valides pour les configurations de proxy/détection locale sur le même hôte (par exemple WebChat Serve ou un proxy inverse local), mais elles ne rendent **pas** les requêtes WebChat éligibles pour `gateway.auth.mode: "trusted-proxy"`.
- `allowRealIpFallback` : quand `true`, le WebChat accepte `X-Real-IP` si `X-Forwarded-For` est manquant. Par défaut `false` pour un comportement en échec fermé.
- `gateway.nodes.pairing.autoApproveCidrs` : liste d'autorisation CIDR/IP optionnelle pour approuver automatiquement le premier jumelage d'appareil nœud sans portées demandées. Elle est désactivée si non définie. Cela n'approuve pas automatiquement le jumelage opérateur/navigateur/UI de contrôle/WebChat, et n'approuve pas automatiquement les mises à niveau de rôle, de portée, de métadonnées ou de clé publique.
- `gateway.nodes.allowCommands` / `gateway.nodes.denyCommands` : façonnage global d'autorisation/refus pour les commandes de nœud déclarées après le jumelage et l'évaluation de la liste d'autorisation de la plateforme. Utilisez `allowCommands` pour opter pour des commandes de nœud dangereuses telles que `camera.snap`, `camera.clip` et `screen.record` ; `denyCommands` supprime une commande même si une autorisation par défaut de la plateforme ou explicite l'inclurait autrement. Après qu'un nœud a modifié sa liste de commandes déclarées, rejetez et réapprouvez ce jumelage d'appareil afin que le WebChat stocke l'instantané de commandes mis à jour.
- `gateway.tools.deny` : noms d'outils supplémentaires bloqués pour `POST /tools/invoke` HTTP (étend la liste de refus par défaut).
- `gateway.tools.allow` : supprime les noms d'outils de la liste de refus HTTP par défaut.

</Accordion>

### Points de terminaison compatibles OpenAI

- RPC HTTP d'administration : désactivé par défaut en tant que plugin RPC`admin-http-rpc`. Activez le plugin pour enregistrer `POST /api/v1/admin/rpc`RPC. Voir [RPC HTTP d'administration](/fr/plugins/admin-http-rpc).
- Complétions de chat : désactivé par défaut. Activez avec `gateway.http.endpoints.chatCompletions.enabled: true`.
- API des réponses : `gateway.http.endpoints.responses.enabled`.
- Durcissement de l'entrée URL des réponses :
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    Les listes blanches vides sont traitées comme non définies ; utilisez `gateway.http.endpoints.responses.files.allowUrl=false`
    et/ou `gateway.http.endpoints.responses.images.allowUrl=false` pour désactiver la récupération d'URL.
- En-tête de durcissement de réponse facultatif :
  - `gateway.http.securityHeaders.strictTransportSecurity` (définissez uniquement pour les origines HTTPS que vous contrôlez ; voir [Authentification de proxy de confiance](/fr/gateway/trusted-proxy-auth#tls-termination-and-hsts))

### Isolation multi-instance

Exécutez plusieurs passerelles sur un même hôte avec des ports et des répertoires d'état uniques :

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

Indicateurs de commodité : `--dev` (utilise `~/.openclaw-dev` + port `19001`), `--profile <name>` (utilise `~/.openclaw-<name>`).

Voir [Plusieurs passerelles](/fr/gateway/multiple-gateways).

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
- `autoGenerate` : génère automatiquement une paire de certificat/clé auto-signée locale lorsque des fichiers explicites ne sont pas configurés ; pour un usage local/dev uniquement.
- `certPath` : chemin du système de fichiers vers le fichier de certificat TLS.
- `keyPath` : chemin du système de fichiers vers le fichier de clé privée TLS ; gardez-le restreint en permissions.
- `caPath` : chemin de bundle CA facultatif pour la vérification du client ou les chaînes de confiance personnalisées.

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
  - `"hot"` : appliquer les modifications en cours de processus sans redémarrage.
  - `"hybrid"` (par défaut) : essayer d'abord le rechargement à chaud (hot reload) ; revenir à un redémarrage si nécessaire.
- `debounceMs` : fenêtre de debounce en ms avant l'application des modifications de configuration (entier non négatif).
- `deferralTimeoutMs` : temps maximum optionnel en ms à attendre pour les opérations en cours avant de forcer un redémarrage ou un rechargement à chaud du canal. Omettez-le pour utiliser l'attente bornée par défaut (`300000`) ; définissez `0` pour attendre indéfiniment et consigner périodiquement des avertissements pour les opérations toujours en attente.

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
Les jetons de hook de chaîne de requête (query-string) sont rejetés.

Notes de validation et de sécurité :

- `hooks.enabled=true` nécessite un `hooks.token` non vide.
- `hooks.token` doit être distinct de `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` ; la réutilisation du jeton Gateway échoue à la validation de démarrage.
- `openclaw security audit` signale également la `hooks.token` réutilisation de l'authentification par mot de passe actif du Gateway (`gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`, ou `--auth password --password <password>`) comme une découverte critique ; la réutilisation en mode mot de passe reste compatible au démarrage et doit être réparée en faisant pivoter l'un des secrets.
- `hooks.path` ne peut pas être `/` ; utilisez un sous-chemin dédié tel que `/hooks`.
- Si `hooks.allowRequestSessionKey=true`, restreignez `hooks.allowedSessionKeyPrefixes` (par exemple `["hook:"]`).
- Si un mappage ou un préréglage utilise un `sessionKey` basé sur un modèle, définissez `hooks.allowedSessionKeyPrefixes` et `hooks.allowRequestSessionKey=true`. Les clés de mappage statiques ne nécessitent pas cette activation.

**Points de terminaison :**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - Le `sessionKey` provenant de la charge utile de la requête n'est accepté que lorsque `hooks.allowRequestSessionKey=true` (par défaut : `false`).
- `POST /hooks/<name>` → résolu via `hooks.mappings`
  - Les valeurs `sessionKey` de mappage rendues par modèle sont traitées comme fournies en externe et nécessitent également `hooks.allowRequestSessionKey=true`.

<Accordion title="Détails du mappage">

- `match.path` correspond au sous-chemin après `/hooks` (p. ex. `/hooks/gmail` → `gmail`).
- `match.source` correspond à un champ de payload pour les chemins génériques.
- Les modèles comme `{{messages[0].subject}}` lisent le payload.
- `transform` peut pointer vers un module JS/TS renvoyant une action de hook.
  - `transform.module` doit être un chemin relatif et rester dans `hooks.transformsDir` (les chemins absolus et les traversées sont rejetés).
  - Gardez `hooks.transformsDir` sous `~/.openclaw/hooks/transforms` ; les répertoires de compétences de l'espace de travail sont rejetés. Si `openclaw doctor` signale ce chemin comme invalide, déplacez le module de transformation dans le répertoire des transformations de hooks ou supprimez `hooks.transformsDir`.
- `agentId` achemine vers un agent spécifique ; les ID inconnus reviennent à l'agent par défaut.
- `allowedAgentIds` : restreint l'acheminement effectif de l'agent, y compris le chemin de l'agent par défaut lorsque `agentId` est omis (`*` ou omis = tout autoriser, `[]` = tout refuser).
- `defaultSessionKey` : clé de session fixe optionnelle pour les exécutions de l'agent de hook sans `sessionKey` explicite.
- `allowRequestSessionKey` : autoriser les appelants `/hooks/agent` et les clés de session de mappage pilotées par modèle à définir `sessionKey` (par défaut : `false`).
- `allowedSessionKeyPrefixes` : liste d'autorisation de préfixe optionnelle pour les valeurs `sessionKey` explicites (requête + mappage), p. ex. `["hook:"]`. Elle devient obligatoire lorsqu'un mappage ou un préréglage utilise un `sessionKey` basé sur un modèle.
- `deliver: true` envoie la réponse finale à un channel ; `channel` est par défaut `last`.
- `model`LLM remplace le LLM pour cette exécution de hook (doit être autorisé si le catalogue de modèles est défini).

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

- Gateway démarre automatiquement `gog gmail watch serve` au démarrage lorsqu'il est configuré. Définissez `OPENCLAW_SKIP_GMAIL_WATCHER=1` pour désactiver.
- N'exécutez pas un `gog gmail watch serve` distinct parallèlement au Gateway.

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

- Sert du HTML/CSS/JS modifiable par l'agent et l'A2UI via HTTP sous le port du Gateway :
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- Local uniquement : conservez `gateway.bind: "loopback"` (par défaut).
- Liens non-boucle (non-loopback) : les routes canvas nécessitent une authentification Gateway (jeton/mot de passe/proxy de confiance), tout comme les autres surfaces HTTP du Gateway.
- Les WebViews de nœuds n'envoient généralement pas d'en-têtes d'authentification ; après qu'un nœud est apparié et connecté, le Gateway publie des URL de capacité scoped au nœud pour l'accès canvas/A2UI.
- Les URL de capacité sont liées à la session WS du nœud actif et expirent rapidement. Le secours basé sur l'IP n'est pas utilisé.
- Injecte le client de rechargement à chaud dans le HTML servi.
- Crée automatiquement un `index.html` de démarrage lorsqu'il est vide.
- Sert également l'A2UI à `/__openclaw__/a2ui/`.
- Les modifications nécessitent un redémarrage de la passerelle.
- Désactivez le rechargement à chaud pour les grands répertoires ou les erreurs `EMFILE`.

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
- `off` : supprime la publicité multicast LAN sans modifier l'activation du plugin.
- Le plugin `bonjour` inclus démarre automatiquement sur les hôtes macOS et est facultatif sur Linux, Windows et les déploiements de Gateway conteneurisés.
- Le nom d'hôte par défaut est le nom d'hôte système s'il s'agit d'une étiquette DNS valide, sinon `openclaw` est utilisé. Remplacez-le par `OPENCLAW_MDNS_HOSTNAME`.

### Large zone (DNS-SD)

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

Écrit une zone DNS-SD unicast sous `~/.openclaw/dns/`. Pour la découverte inter-réseaux, associez à un serveur DNS (CoreDNS recommandé) + DNS partagé Tailscale.

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

- Les env vars en ligne ne sont appliquées que si la clé est manquante dans l'environnement du processus.
- Fichiers `.env` : CWD `.env` + `~/.openclaw/.env` (aucun ne remplace les vars existantes).
- `shellEnv` : importe les clés attendues manquantes depuis votre profil de shell de connexion.
- Consultez [Environment](/fr/help/environment) pour connaître l'ordre de priorité complet.

### Substitution de variable d'environnement

Référencez les env vars dans n'importe quelle chaîne de configuration avec `${VAR_NAME}` :

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- Seuls les noms en majuscules correspondent : `[A-Z_][A-Z0-9_]*`.
- Les vars manquantes ou vides génèrent une erreur lors du chargement de la configuration.
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

- Modèle `provider` : `^[a-z][a-z0-9_-]{0,63}$`
- Modèle d'id `source: "env"` : `^[A-Z][A-Z0-9_]{0,127}$`
- id `source: "file"` : pointeur JSON absolu (par exemple `"/providers/openai/apiKey"`)
- Modèle d'id `source: "exec"` : `^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$` (prend en charge les sélecteurs `secret#json_key` style AWS)
- Les identifiants `source: "exec"` ne doivent pas contenir de segments de chemin délimités par des barres obliques `.` ou `..` (par exemple, `a/../b` est rejeté)

### Surface des informations d'identification prise en charge

- Matrice canonique : [Surface des informations d'identification SecretRef](/fr/reference/secretref-credential-surface)
- Les cibles `secrets apply` prennent en charge les chemins d'informations d'identification `openclaw.json`.
- Les références `auth-profiles.json` sont incluses dans la résolution d'exécution et la couverture d'audit.

### Configuration des fournisseurs de secrets

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
- Les chemins des fournisseurs File et exec échouent en mode fermé lorsque la vérification ACL Windows n'est pas disponible. Définissez `allowInsecurePath: true` uniquement pour les chemins de confiance qui ne peuvent pas être vérifiés.
- Le fournisseur `exec` nécessite un chemin absolu `command` et utilise des charges utiles de protocole sur stdin/stdout.
- Par défaut, les chemins de commande symlink sont rejetés. Définissez `allowSymlinkCommand: true` pour autoriser les chemins symlink tout en validant le chemin cible résolu.
- Si `trustedDirs` est configuré, la vérification du répertoire de confiance s'applique au chemin cible résolu.
- L'environnement enfant `exec` est minimal par défaut ; transmettez les variables requises explicitement avec `passEnv`.
- Les références de secrets sont résolues au moment de l'activation dans un instantané en mémoire, puis les chemins de requête ne lisent que l'instantané.
- Le filtrage de surface active s'applique lors de l'activation : les références non résolues sur les surfaces activées entraînent l'échec du démarrage/rechargement, tandis que les surfaces inactives sont ignorées avec des diagnostics.

---

## Stockage d'authentification

```json5
{
  auth: {
    profiles: {
      "anthropic:default": { provider: "anthropic", mode: "api_key" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" },
      "openai:personal": { provider: "openai", mode: "oauth" },
    },
    order: {
      anthropic: ["anthropic:default", "anthropic:work"],
      openai: ["openai:personal"],
    },
  },
}
```

- Les profils par agent sont stockés à `<agentDir>/auth-profiles.json`.
- `auth-profiles.json` prend en charge les références au niveau de la valeur (`keyRef` pour `api_key`, `tokenRef` pour `token`) pour les modes d'informations d'identification statiques.
- Les cartes plates héritées `auth-profiles.json` telles que `{ "provider": { "apiKey": "..." } }` ne sont pas un format d'exécution ; `openclaw doctor --fix` les réécrit en profils de clés API canoniques `provider:default` avec une sauvegarde `.legacy-flat.*.bak`.
- Les profils en mode OAuth (`auth.profiles.<id>.mode = "oauth"`) ne prennent pas en charge les identifiants de profil d'authentification sauvegardés par SecretRef.
- Les identifiants d'exécution statiques proviennent d'instantanés résolus en mémoire ; les entrées statiques héritées `auth.json` sont supprimées lorsqu'elles sont détectées.
- Importations héritées OAuth depuis `~/.openclaw/credentials/oauth.json`.
- Voir [OAuth](/fr/concepts/oauth).
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

- `billingBackoffHours` : temps d'attente de base en heures lorsqu'un profil échoue en raison de vraies erreurs de facturation/crédit insuffisant (par défaut : `5`). Un texte de facturation explicite peut toujours atterrir ici même sur les réponses `401`/`403`, mais les correspondances de texte spécifiques au fournisseur restent limitées au fournisseur qui les possède (par exemple OpenRouter `Key limit exceeded`). Les messages réessayables de fenêtre d'utilisation HTTP `402` ou de limite de dépense d'organisation/espace de travail restent plutôt dans le chemin `rate_limit`.
- `billingBackoffHoursByProvider` : substitutions facultatives par fournisseur pour les heures de temporisation de facturation.
- `billingMaxHours` : plafond en heures pour la croissance exponentielle de la temporisation de facturation (par défaut : `24`).
- `authPermanentBackoffMinutes` : temps d'attente de base en minutes pour les échecs `auth_permanent` à haute confiance (par défaut : `10`).
- `authPermanentMaxMinutes` : plafond en minutes pour la croissance de la temporisation `auth_permanent` (par défaut : `60`).
- `failureWindowHours` : fenêtre glissante en heures utilisée pour les compteurs de temporisation (par défaut : `24`).
- `overloadedProfileRotations` : nombre maximal de rotations de profils d'authentification du même fournisseur pour les erreurs de surcharge avant de passer au repli du model (par défaut : `1`). Les formes d'occupation du fournisseur telles que `ModelNotReadyException` atterrissent ici.
- `overloadedBackoffMs` : délai fixe avant de réessayer une rotation de fournisseur/profil surchargé (par défaut : `0`).
- `rateLimitedProfileRotations` : nombre maximal de rotations de profils d'authentification du même fournisseur pour les erreurs de limite de débit avant de passer au repli du model (par défaut : `1`). Ce groupe de limites de débit inclut du texte de forme de fournisseur tel que `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded` et `resource exhausted`.

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
- `consoleLevel` passe à `debug` lorsque `--verbose`.
- `maxFileBytes` : taille maximale en octets du fichier journal actif avant rotation (entier positif ; par défaut : `104857600` = 100 Mo). OpenClaw conserve jusqu'à cinq archives numérotées à côté du fichier actif.
- `redactSensitive` / `redactPatterns` : masquage de best-effort pour la sortie console, les journaux fichiers, les enregistrements de journaux OTLP et le texte de la session persisté. `redactSensitive: "off"` désactive uniquement cette stratégie générale de journal/transcription ; les surfaces de sécurité de l'interface utilisateur, des outils et des diagnostics effacent toujours les secrets avant émission.

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

- `enabled` : interrupteur maître pour la sortie d'instrumentation (par défaut : `true`).
- `flags` : tableau de chaînes de drapeaux activant la sortie de journal ciblée (prend en charge les caractères génériques comme `"telegram.*"` ou `"*"`).
- `stuckSessionWarnMs` : seuil d'âge sans progression en ms pour classer les sessions de traitement de longue durée comme `session.long_running`, `session.stalled` ou `session.stuck`. Les réponses, les tools, les statuts, les blocs et la progression ACP réinitialisent le minuteur ; les diagnostics `session.stuck` répétés se désengagent lorsqu'ils sont inchangés.
- `stuckSessionAbortMs` : seuil d'âge sans progression en ms avant que le travail actif éligible bloqué puisse être interrompu et drainé pour récupération. Si non défini, OpenClaw utilise la fenêtre étendue plus sûre d'exécution intégrée d'au moins 5 minutes et 3x `stuckSessionWarnMs`.
- `memoryPressureSnapshot` : capture un instantané de stabilité expurgé pré-OOM lorsque la pression de la mémoire atteint `critical` (par défaut : `false`). Définissez sur `true` pour ajouter l'analyse et l'écriture du fichier bundle de stabilité tout en conservant les événements normaux de pression de mémoire.
- `otel.enabled` : active le pipeline d'exportation OpenTelemetry (par défaut : `false`). Pour la configuration complète, le catalogue de signaux et le modèle de confidentialité, consultez [Exportation OpenTelemetry](/fr/gateway/opentelemetry).
- `otel.endpoint` : URL du collecteur pour l'exportation OTel.
- `otel.tracesEndpoint` / `otel.metricsEndpoint` / `otel.logsEndpoint` : points de terminaison OTLP spécifiques aux signaux optionnels. Lorsqu'ils sont définis, ils remplacent `otel.endpoint` pour ce signal uniquement.
- `otel.protocol` : `"http/protobuf"` (par défaut) ou `"grpc"`.
- `otel.headers` : en-têtes de métadonnées HTTP/gRPC supplémentaires envoyés avec les requêtes d'exportation OTel.
- `otel.serviceName` : nom du service pour les attributs de ressource.
- `otel.traces` / `otel.metrics` / `otel.logs` : activer l'exportation des traces, des métriques ou des journaux.
- `otel.sampleRate` : taux d'échantillonnage des traces `0`-`1`.
- `otel.flushIntervalMs` : intervalle de vidage périodique de la télémétrie en ms.
- `otel.captureContent` : capture de contenu brute optionnelle pour les attributs de span OTEL. Désactivé par défaut. Le booléen `true` capture le contenu des messages/tools non-système ; la forme objet vous permet d'activer `inputMessages`, `outputMessages`, `toolInputs`, `toolOutputs`, `systemPrompt` et `toolDefinitions` explicitement.
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental` : commutateur d'environnement pour la forme expérimentale la plus récente des spans d'inférence GenAI, incluant les noms de span `{gen_ai.operation.name} {gen_ai.request.model}`, le type de span `CLIENT`, et `gen_ai.provider.name` au lieu de l'ancien `gen_ai.system`. Par défaut, les spans conservent `openclaw.model.call` et `gen_ai.system` pour la compatibilité ; les métriques GenAI utilisent des attributs sémantiques délimités.
- `OPENCLAW_OTEL_PRELOADED=1` : commutateur d'environnement pour les hôtes ayant déjà enregistré un SDK OpenTelemetry global. OpenClaw ignore alors le démarrage/arrêt du SDK propriétaire du plugin tout en maintenant les écouteurs de diagnostic actifs.
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` et `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` : variables d'environnement de point de terminaison spécifiques aux signaux, utilisées lorsque la clé de configuration correspondante n'est pas définie.
- `cacheTrace.enabled` : consigner les instantanés de trace du cache pour les exécutions intégrées (par défaut : `false`).
- `cacheTrace.filePath` : chemin de sortie pour le JSONL de trace du cache (par défaut : `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`).
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem` : contrôlent ce qui est inclus dans la sortie de trace du cache (tous par défaut : `true`).

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
- `auto.stableDelayHours` : délai minimum en heures avant l'application automatique pour le channel stable (par défaut : `6` ; max : `168`).
- `auto.stableJitterHours` : fenêtre de délai supplémentaire de déploiement pour le channel stable en heures (par défaut : `12` ; max : `168`).
- `auto.betaCheckIntervalHours` : fréquence des vérifications du channel bêta en heures (par défaut : `1` ; max : `24`).

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

- `enabled` : interrupteur global de fonctionnalité ACP (par défaut : `true` ; définissez `false` pour masquer les fonctionnalités de répartition et de génération ACP).
- `dispatch.enabled` : interrupteur indépendant pour la répartition des tours de session ACP (par défaut : `true`). Définissez `false` pour garder les commandes ACP disponibles tout en bloquant l'exécution.
- `backend` : identifiant du backend d'exécution ACP par défaut (doit correspondre à un plugin d'exécution ACP enregistré).
  Installez d'abord le plugin du backend, et si `plugins.allow` est défini, incluez l'identifiant du plugin du backend (par exemple `acpx`), sinon le backend ACP ne se chargera pas.
- `defaultAgent` : identifiant de l'agent cible ACP par défaut lorsque les générations ne spécifient pas de cible explicite.
- `allowedAgents` : liste blanche des identifiants d'agents autorisés pour les sessions d'exécution ACP ; vide signifie aucune restriction supplémentaire.
- `maxConcurrentSessions` : nombre maximum de sessions ACP actives simultanément.
- `stream.coalesceIdleMs` : fenêtre de vidange d'inactivité en ms pour le texte diffusé en flux continu.
- `stream.maxChunkChars` : taille maximale des blocs avant fractionnement de la projection de bloc diffusé en flux continu.
- `stream.repeatSuppression` : supprimer les lignes de statut/tool répétées par tour (par défaut : `true`).
- `stream.deliveryMode` : `"live"` diffuse les flux de manière incrémentielle ; `"final_only"` met en tampon jusqu'aux événements de fin de tour.
- `stream.hiddenBoundarySeparator` : séparateur avant le texte visible après les événements d'outil masqués (par défaut : `"paragraph"`).
- `stream.maxOutputChars` : nombre maximum de caractères de sortie de l'assistant projetés par tour ACP.
- `stream.maxSessionUpdateChars` : nombre maximum de caractères pour les lignes de statut/mise à jour ACP projetées.
- `stream.tagVisibility` : enregistrement des noms de balises vers des remplacements de visibilité booléens pour les événements diffusés en continu.
- `runtime.ttlMinutes` : TTL d'inactivité en minutes pour les workers de session ACP avant le nettoyage éligible.
- `runtime.installCommand` : commande d'installation optionnelle à exécuter lors de l'amorçage d'un environnement d'exécution ACP.

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

- `cli.banner.taglineMode` contrôle le style du slogan de la bannière :
  - `"random"` (par défaut) : slogans amusants/saisonniers tournants.
  - `"default"` : slogan neutre fixe (`All your chats, one OpenClaw.`).
  - `"off"` : pas de texte de slogan (le titre/la version de la bannière sont toujours affichés).
- Pour masquer la bannière entière (pas seulement les slogans), définissez la variable d'environnement `OPENCLAW_HIDE_BANNER=1`.

---

## Assistant

Métadonnées écrites par les flux de configuration guidée de la CLI (`onboard`, `configure`, `doctor`) :

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

## Pont (legacy, supprimé)

Les versions actuelles n'incluent plus le pont TCP. Les nœuds se connectent via le WebSocket de la Gateway. Les clés `bridge.*` ne font plus partie du schéma de configuration (la validation échoue jusqu'à leur suppression ; `openclaw doctor --fix` peut supprimer les clés inconnues).

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

- `sessionRetention` : durée de conservation des sessions d'exécution cron isolées terminées avant leur nettoyage dans `sessions.json`. Contrôle également le nettoyage des transcriptions cron archivées et supprimées. Par défaut : `24h` ; définissez `false` pour désactiver.
- `runLog.maxBytes` : accepté pour compatibilité avec les anciens journaux d'exécution cron basés sur des fichiers. Par défaut : `2_000_000` octets.
- `runLog.keepLines` : lignes les plus récentes de l'historique d'exécution SQLite conservées par tâche. Par défaut : `2000`.
- `webhookToken` : jeton bearer utilisé pour la livraison POST du webhook cron (`delivery.mode = "webhook"`) ; si omis, aucun en-tête d'authentification n'est envoyé.
- `webhook` : URL de webhook de secours héritée et déconseillée (http/https), utilisée uniquement pour les tâches stockées qui possèdent encore `notify: true`.

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

- `maxAttempts` : nombre maximum de nouvelles tentatives pour les tâches cron en cas d'erreurs transitoires (par défaut : `3` ; plage : `0`-`10`).
- `backoffMs` : tableau des délais d'attente exponentiels en ms pour chaque tentative de nouvelle tentative (par défaut : `[30000, 60000, 300000]` ; 1 à 10 entrées).
- `retryOn` : types d'erreurs déclenchant de nouvelles tentatives - `"rate_limit"`, `"overloaded"`, `"network"`, `"timeout"`, `"server_error"`. Omettez cette option pour réessayer tous les types transitoires.

Les tâches ponctuelles restent activées jusqu'à épuisement des tentatives, puis sont désactivées tout en conservant l'état d'erreur final. Les tâches récurrentes utilisent la même politique de nouvelle tentative transitoire pour s'exécuter à nouveau après l'attente avant leur prochaine créneau planifié ; les erreurs permanentes ou l'épuisement des tentatives transitoires retombent sur la planification récurrente normale avec une attente en cas d'erreur.

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
- `includeSkipped` : comptabiliser les exécutions consécutives ignorées vers le seuil d'alerte (par défaut : `false`). Les exécutions ignorées sont suivies séparément et n'affectent pas l'attente en cas d'erreur d'exécution.
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

- Destination par défaut pour les notifications d'échec cron sur tous les travaux.
- `mode` : `"announce"` ou `"webhook"` ; par défaut `"announce"` lorsque suffisamment de données cibles existent.
- `channel` : remplacement du channel pour la livraison des annonces. `"last"` réutilise le dernier channel de livraison connu.
- `to` : cible d'annonce explicite ou URL de webhook. Requis pour le mode webhook.
- `accountId` : remplacement de compte optionnel pour la livraison.
- Le `delivery.failureDestination` par travail remplace cette valeur par défaut globale.
- Lorsqu'aucune destination d'échec globale ou par travail n'est définie, les travaux qui livrent déjà via `announce` reviennent à cette cible d'annonce principale en cas d'échec.
- `delivery.failureDestination` est uniquement pris en charge pour les travaux `sessionTarget="isolated"` sauf si le `delivery.mode` principal du travail est `"webhook"`.

Voir [Cron Jobs](/fr/automation/cron-jobs). Les exécutions cron isolées sont suivies en tant que [tâches d'arrière-plan](/fr/automation/tasks).

---

## Variables de modèle de média

Substitutions de modèle développées dans `tools.media.models[].args` :

| Variable           | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| `{{Body}}`         | Corps du message entrant complet                                   |
| `{{RawBody}}`      | Corps brut (sans wrappers d'historique/expéditeur)                 |
| `{{BodyStripped}}` | Corps sans les mentions de groupe                                  |
| `{{From}}`         | Identifiant de l'expéditeur                                        |
| `{{To}}`           | Identifiant de destination                                         |
| `{{MessageSid}}`   | Identifiant de message du channel                                  |
| `{{SessionId}}`    | UUID de la session actuelle                                        |
| `{{IsNewSession}}` | `"true"` lors de la création d'une nouvelle session                |
| `{{MediaUrl}}`     | Pseudo-URL du média entrant                                        |
| `{{MediaPath}}`    | Chemin d'accès local aux médias                                    |
| `{{MediaType}}`    | Type de média (image/audio/document/…)                             |
| `{{Transcript}}`   | Transcription audio                                                |
| `{{Prompt}}`       | Prompt média résolu pour les entrées CLI                           |
| `{{MaxChars}}`     | Nombre maximum de caractères de sortie résolu pour les entrées CLI |
| `{{ChatType}}`     | `"direct"` ou `"group"`                                            |
| `{{GroupSubject}}` | Sujet du groupe (au mieux)                                         |
| `{{GroupMembers}}` | Aperçu des membres du groupe (au mieux)                            |
| `{{SenderName}}`   | Nom d'affichage de l'expéditeur (au mieux)                         |
| `{{SenderE164}}`   | Numéro de téléphone de l'expéditeur (au mieux)                     |
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
- Tableau de fichiers : fusion profonde dans l'ordre (les suivants écrasent les précédents).
- Clés frères : fusionnées après les inclusions (écrasent les valeurs incluses).
- Inclusions imbriquées : jusqu'à 10 niveaux de profondeur.
- Chemins : résolus par rapport au fichier incluant, mais doivent rester à l'intérieur du répertoire de configuration de premier niveau (`dirname` de `openclaw.json`). Les formes absolues/`../` sont autorisées uniquement lorsqu'elles sont toujours résolues à l'intérieur de cette limite. Les chemins ne doivent pas contenir d'octets nuls et doivent être strictement plus courts que 4096 caractères avant et après résolution.
- Les écritures propriétaires de OpenClaw qui ne modifient qu'une seule section de premier niveau sauvegardée par une inclusion de fichier unique sont répercutées dans ce fichier inclus. Par exemple, `plugins install` met à jour `plugins: { $include: "./plugins.json5" }` dans `plugins.json5` et laisse `openclaw.json` intact.
- Les inclusions racines, les tableaux d'inclusions et les inclusions avec des remplacements frères sont en lecture seule pour les écritures propriétaires de OpenClaw ; ces écritures échouent en mode fermé au lieu d'aplatir la configuration.
- Erreurs : messages clairs pour les fichiers manquants, les erreurs d'analyse, les inclusions circulaires, le format de chemin invalide et la longueur excessive.

---

_En relation : [Configuration](/fr/gateway/configuration) · [Exemples de configuration](/fr/gateway/configuration-examples) · [Doctor](/fr/gateway/doctor)_

## En relation

- [Configuration](/fr/gateway/configuration)
- [Exemples de configuration](/fr/gateway/configuration-examples)
