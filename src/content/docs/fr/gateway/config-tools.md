---
summary: "Configuration des outils (stratégie, commutateurs expérimentaux, outils basés sur des providers) et configuration de providers personnalisés / URL de base"
read_when:
  - Configuring `tools.*` policy, allowlists, or experimental features
  - Registering custom providers or overriding base URLs
  - Setting up OpenAI-compatible self-hosted endpoints
title: "Configuration — outils et providers personnalisés"
sidebarTitle: "Outils et providers personnalisés"
---

Clés de configuration `tools.*` et configuration de providers personnalisés / URL de base. Pour les agents, les canaux et d'autres clés de configuration de premier niveau, consultez [Référence de configuration](/fr/gateway/configuration-reference).

## Outils

### Profils d'outils

`tools.profile` définit une liste d'autorisation de base avant `tools.allow`/`tools.deny` :

<Note>L'onboarding local définit par défaut les nouvelles configurations locales sur `tools.profile: "coding"` si elles ne sont pas définies (les profils explicites existants sont conservés).</Note>

| Profil      | Inclut                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | `session_status` uniquement                                                                                                     |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                       |
| `full`      | Aucune restriction (identique à non défini)                                                                                     |

### Groupes d'outils

| Groupe             | Outils                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`, `process`, `code_execution` (`bash` est accepté comme alias pour `exec`)                                        |
| `group:fs`         | `read`, `write`, `edit`, `apply_patch`                                                                                  |
| `group:sessions`   | `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `subagents`, `session_status` |
| `group:memory`     | `memory_search`, `memory_get`                                                                                           |
| `group:web`        | `web_search`, `x_search`, `web_fetch`                                                                                   |
| `group:ui`         | `browser`, `canvas`                                                                                                     |
| `group:automation` | `heartbeat_respond`, `cron`, `gateway`                                                                                  |
| `group:messaging`  | `message`                                                                                                               |
| `group:nodes`      | `nodes`                                                                                                                 |
| `group:agents`     | `agents_list`, `update_plan`                                                                                            |
| `group:media`      | `image`, `image_generate`, `music_generate`, `video_generate`, `tts`                                                    |
| `group:openclaw`   | Tous les outils intégrés (exclut les plugins de provider)                                                               |
| `group:plugins`    | Outils détenus par les plugins chargés, y compris les serveurs MCP configurés exposés via `bundle-mcp`                  |

### Outils MCP et de plugin dans la stratégie de tool sandboxed

Les serveurs MCP configurés sont exposés en tant qu'outils détenus par des plugins sous l'ID de plugin `bundle-mcp`. Les profils d'outil normaux peuvent les autoriser, mais `tools.sandbox.tools` est une porte supplémentaire pour les sessions sandboxed. Si le mode sandbox est `"all"` ou `"non-main"`, incluez l'une de ces entrées dans la liste d'autorisation des outils sandbox lorsque les outils MCP/plugin doivent être visibles :

- `bundle-mcp`OpenClaw pour les serveurs MCP gérés par OpenClaw depuis `mcp.servers`
- l'ID de plugin pour un plugin natif spécifique
- `group:plugins` pour tous les outils détenus par des plugins chargés
- noms d'outils exacts du serveur MCP ou modèles globaux de serveur tels que `outlook__send_mail` ou `outlook__*` lorsque vous ne voulez qu'un seul serveur

Les globs de serveur utilisent le préfixe de serveur MCP sécurisé pour le provider, et pas nécessairement la clé brute `mcp.servers`. Les caractères non `[A-Za-z0-9_-]` deviennent `-`, les noms ne commençant pas par une lettre reçoivent un préfixe `mcp-`, et les préfixes longs ou en double peuvent être tronqués ou suffixés ; par exemple, `mcp.servers["Outlook Graph"]` utilise un glob comme `outlook-graph__*`.

```json5
{
  agents: { defaults: { sandbox: { mode: "all" } } },
  mcp: {
    servers: {
      outlook: { command: "node", args: ["./outlook-mcp.js"] },
    },
  },
  tools: {
    sandbox: {
      tools: {
        alsoAllow: ["web_search", "web_fetch", "memory_search", "memory_get", "bundle-mcp"],
      },
    },
  },
}
```

Sans cette entrée de couche de bac à sable, le serveur MCP peut toujours se charger avec succès alors que ses outils sont filtrés avant la demande du provider. Utilisez `openclaw doctor` pour détecter ce cas pour les serveurs gérés par OpenClaw dans `mcp.servers`. Les serveurs MCP chargés à partir de manifestes de plugin groupés ou du `.mcp.json` Claude utilisent la même porte de bac à sable, mais ce diagnostic n'énumère pas encore ces sources ; utilisez les mêmes entrées de liste d'autorisation si leurs outils disparaissent dans les tours sandboxés.

### `tools.codeMode`

`tools.codeMode` active la surface générique en mode code de OpenClaw. Lorsqu'elle est activée
pour une exécution avec des outils, le modèle voit uniquement `exec` et `wait` ; les outils normaux de OpenClaw
se déplacent derrière le pont de catalogue `tools.*` dans le bac à sable, et les outils MCP sont
accessibles via l'espace de noms généré `MCP`.

```json5
{
  tools: {
    codeMode: {
      enabled: true,
    },
  },
}
```

La forme abrégée est également acceptée :

```json5
{
  tools: { codeMode: true },
}
```

Les déclarations MCP sont exposées via la surface de fichier virtuel en lecture seule de l'API en
mode code. Le code invité peut appeler `API.list("mcp")` et
`API.read("mcp/<server>.d.ts")` pour inspecter les signatures de type TypeScript avant
d'appeler `MCP.<server>.<tool>()`. Consultez [Code mode](/fr/reference/code-mode) pour le
contrat d'exécution, les limites et les étapes de débogage.

### `tools.allow` / `tools.deny`

Stratégie globale d'autorisation/refus d'outils (le refus l'emporte). Insensible à la casse, prend en charge les caractères génériques `*`. Appliquée même lorsque le bac à sable Docker est désactivé.

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

`write` et `apply_patch` sont des identifiants d'outil distincts. `allow: ["write"]` active également `apply_patch` pour les modèles compatibles, mais `deny: ["write"]` ne refuse pas `apply_patch`. Pour bloquer toutes les modifications de fichiers, refusez `group:fs` ou listez chaque outil de modification explicitement :

```json5
{
  tools: { deny: ["write", "edit", "apply_patch"] },
}
```

### `tools.byProvider`

Restreint davantage les outils pour des providers ou des modèles spécifiques. Ordre : profil de base → profil de provider → autoriser/refuser.

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
      "openai/gpt-5.4": { allow: ["group:fs", "sessions_list"] },
    },
  },
}
```

### `tools.toolsBySender`

Restreint les outils pour une identité de demandeur spécifique. Il s'agit d'une défense en profondeur en plus du contrôle d'accès du channel ; les valeurs de l'expéditeur doivent provenir de l'adaptateur de channel, et non du texte du message.

```json5
{
  tools: {
    toolsBySender: {
      "channel:discord:1234567890123": { alsoAllow: ["group:fs"] },
      "id:guest-user-id": { deny: ["group:runtime", "group:fs"] },
      "*": { deny: ["exec", "process", "write", "edit", "apply_patch"] },
    },
  },
}
```

Les clés utilisent des préfixes explicites : `channel:<channelId>:<senderId>`, `id:<senderId>`, `e164:<phone>`, `username:<handle>`, `name:<displayName>` ou `"*"`. Les identifiants de channel sont des identifiants canoniques OpenClaw ; les alias tels que `teams` sont normalisés en `msteams`. Les clés héritées sans préfixe sont acceptées uniquement en tant que `id:`. L'ordre de correspondance est channel+id, id, e164, nom d'utilisateur, nom, puis caractère générique.

La configuration `agents.list[].tools.toolsBySender` par agent remplace la correspondance d'expéditeur globale lorsqu'elle correspond, même avec une stratégie `{}` vide.

### `tools.elevated`

Contrôle l'accès exec élevé en dehors du bac à sable :

```json5
{
  tools: {
    elevated: {
      enabled: true,
      allowFrom: {
        whatsapp: ["+15555550123"],
        discord: ["1234567890123", "987654321098765432"],
      },
    },
  },
}
```

- La substitution par agent (`agents.list[].tools.elevated`) peut uniquement restreindre davantage.
- `/elevated on|off|ask|full` stocke l'état par session ; les directives en ligne s'appliquent à un seul message.
- Le `exec` élevé contourne le sandboxing et utilise le chemin d'échappement configuré (`gateway` par défaut, ou `node` lorsque la cible d'exécution est `node`).

### `tools.exec`

```json5
{
  tools: {
    exec: {
      backgroundMs: 10000,
      timeoutSec: 1800,
      cleanupMs: 1800000,
      notifyOnExit: true,
      notifyOnExitEmptySuccess: false,
      commandHighlighting: false,
      applyPatch: {
        enabled: false,
        allowModels: ["gpt-5.5"],
      },
    },
  },
}
```

### `tools.loopDetection`

Les contrôles de sécurité des boucles d'outils sont **désactivés par défaut**. Définissez `enabled: true` pour activer la détection. Les paramètres peuvent être définis globalement dans `tools.loopDetection` et remplacés par agent dans `agents.list[].tools.loopDetection`.

```json5
{
  tools: {
    loopDetection: {
      enabled: true,
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

<ParamField path="historySize" type="number">
  Historique maximal des appels d'outils conservé pour l'analyse de boucle.
</ParamField>
<ParamField path="warningThreshold" type="number">
  Seuil du modèle de répétition sans progrès pour les avertissements.
</ParamField>
<ParamField path="criticalThreshold" type="number">
  Seuil de répétition plus élevé pour bloquer les boucles critiques.
</ParamField>
<ParamField path="globalCircuitBreakerThreshold" type="number">
  Seuil d'arrêt strict pour toute exécution sans progrès.
</ParamField>
<ParamField path="detectors.genericRepeat" type="boolean">
  Avertir en cas d'appels répétés au même outil/avec les mêmes arguments.
</ParamField>
<ParamField path="detectors.knownPollNoProgress" type="boolean">
  Avertir/bloquer sur les outils de sondage connus (`process.poll`, `command_status`, etc.).
</ParamField>
<ParamField path="detectors.pingPong" type="boolean">
  Avertir/bloquer sur les modèles de paires alternés sans progrès.
</ParamField>

<Warning>
Si `warningThreshold >= criticalThreshold` ou `criticalThreshold >= globalCircuitBreakerThreshold`, la validation échoue.
</Warning>

### `tools.web`

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "brave_api_key", // or BRAVE_API_KEY env
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
      fetch: {
        enabled: true,
        provider: "firecrawl", // optional; omit for auto-detect
        maxChars: 50000,
        maxCharsCap: 50000,
        maxResponseBytes: 2000000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        readability: true,
        userAgent: "custom-ua",
      },
    },
  },
}
```

### `tools.media`

Configure la compréhension des médias entrants (image/audio/vidéo) :

```json5
{
  tools: {
    media: {
      concurrency: 2,
      asyncCompletion: {
        directSend: false, // deprecated: completions stay agent-mediated
      },
      audio: {
        enabled: true,
        maxBytes: 20971520,
        scope: {
          default: "deny",
          rules: [{ action: "allow", match: { chatType: "direct" } }],
        },
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          { type: "cli", command: "whisper", args: ["--model", "base", "{{MediaPath}}"] },
        ],
      },
      image: {
        enabled: true,
        timeoutSeconds: 180,
        models: [{ provider: "ollama", model: "gemma4:26b", timeoutSeconds: 300 }],
      },
      video: {
        enabled: true,
        maxBytes: 52428800,
        models: [{ provider: "google", model: "gemini-3-flash-preview" }],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Media model entry fields">
    **Provider entry** (`type: "provider"` ou omis) :

    - `provider` : id du provider d'API (`openai`, `anthropic`, `google`/`gemini`, `groq`, etc.)
    - `model` : remplacement de l'id de model
    - `profile` / `preferredProfile` : sélection du profil `auth-profiles.json`

    **CLI entry** (`type: "cli"`) :

    - `command` : exécutable à lancer
    - `args` : args basés sur un modèle (prend en charge `{{MediaPath}}`, `{{Prompt}}`, `{{MaxChars}}`, etc. ; `openclaw doctor --fix` migre les espaces réservés `{input}` obsolètes vers `{{MediaPath}}`)

    **Champs communs :**

    - `capabilities` : liste facultative (`image`, `audio`, `video`). Valeurs par défaut : `openai`/`anthropic`/`minimax` → image, `google` → image+audio+vidéo, `groq` → audio.
    - `prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language` : remplacements par entrée.
    - `tools.media.image.timeoutSeconds` et les entrées correspondantes du model d'image `timeoutSeconds` s'appliquent également lorsque l'agent appelle le tool `image` explicite.
    - Les échecs reviennent à l'entrée suivante.

    L'authentification du provider suit l'ordre standard : `auth-profiles.json` → env vars → `models.providers.*.apiKey`.

    **Champs de complétion asynchrone :**

    - `asyncCompletion.directSend` : indicateur de compatibilité obsolète. Les tâches de média asynchrones terminées restent médiées par la session du demandeur afin que l'agent reçoive le résultat, décide de la manière d'informer l'utilisateur et utilise le tool de message lorsque la livraison de la source l'exige.

  </Accordion>
</AccordionGroup>

### `tools.agentToAgent`

```json5
{
  tools: {
    agentToAgent: {
      enabled: false,
      allow: ["home", "work"],
    },
  },
}
```

### `tools.sessions`

Contrôle les sessions qui peuvent être ciblées par les outils de session (`sessions_list`, `sessions_history`, `sessions_send`).

Par défaut : `tree` (session actuelle + sessions générées par celle-ci, telles que les sous-agents).

```json5
{
  tools: {
    sessions: {
      // "self" | "tree" | "agent" | "all"
      visibility: "tree",
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Portées de visibilité">
    - `self` : uniquement la clé de session actuelle.
    - `tree` : session actuelle + sessions générées par la session actuelle (sous-agents).
    - `agent` : toute session appartenant à l'ID d'agent actuel (peut inclure d'autres utilisateurs si vous exécutez des sessions par expéditeur sous le même ID d'agent).
    - `all` : n'importe quelle session. Le ciblage inter-agents nécessite toujours `tools.agentToAgent`.
    - Clampage Sandbox : lorsque la session actuelle est sandboxée et que `agents.defaults.sandbox.sessionToolsVisibility="spawned"`, la visibilité est forcée à `tree` même si `tools.sessions.visibility="all"`.
    - Lorsque ce n'est pas `all`, `sessions_list` inclut un champ compact `visibility`
      décrivant le mode effectif et un avertissement indiquant que certaines sessions peuvent être
      omises en dehors de la portée actuelle.

  </Accordion>
</AccordionGroup>

### `tools.sessions_spawn`

Contrôle la prise en charge des pièces jointes en ligne pour `sessions_spawn`.

```json5
{
  tools: {
    sessions_spawn: {
      attachments: {
        enabled: false, // opt-in: set true to allow inline file attachments
        maxTotalBytes: 5242880, // 5 MB total across all files
        maxFiles: 50,
        maxFileBytes: 1048576, // 1 MB per file
        retainOnSessionKeep: false, // keep attachments when cleanup="keep"
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Notes sur les pièces jointes">
    - Les pièces jointes nécessitent `enabled: true`.
    - Les pièces jointes de sous-agents sont matérialisées dans l'espace de travail enfant à `.openclaw/attachments/<uuid>/` avec un `.manifest.json`.
    - Les pièces jointes ACP sont des images uniquement et sont transmises en ligne au runtime ACP après que les mêmes limites de nombre de fichiers, d'octets par fichier et d'octets totaux ont été dépassées.
    - Le contenu des pièces jointes est automatiquement expurgé de la persistance des transcriptions.
    - Les entrées Base64 sont validées avec des contrôles stricts d'alphabet/remplissage et une garde de taille pré-décodage.
    - Les autorisations de fichiers des pièces jointes de sous-agents sont `0700` pour les répertoires et `0600` pour les fichiers.
    - Le nettoyage des sous-agents suit la stratégie `cleanup` : `delete` supprime toujours les pièces jointes ; `keep` les conserve uniquement lorsque `retainOnSessionKeep: true`.

  </Accordion>
</AccordionGroup>

<a id="toolsexperimental"></a>

### `tools.experimental`

Indicateurs d'outils intégrés expérimentaux. Désactivé par défaut, sauf si une règle d'activation automatique stricte d'agent GPT-5 s'applique.

```json5
{
  tools: {
    experimental: {
      planTool: true, // enable experimental update_plan
    },
  },
}
```

- `planTool` : active l'outil structuré `update_plan` pour le suivi du travail multi-étapes non trivial.
- Par défaut : `false`, sauf si `agents.defaults.embeddedAgent.executionContract` (ou une priorité par agent) est défini sur `"strict-agentic"` pour une exécution de la famille GPT-5 OpenAI ou OpenAI Codex. Définissez `true` pour forcer l'activation de l'outil en dehors de ce périmètre, ou `false` pour le garder désactivé même pour les exécutions GPT-5 strictement agentic.
- Lorsqu'il est activé, le prompt système ajoute également des directives d'utilisation afin que le modèle ne l'utilise que pour un travail substantiel et conserve au maximum une étape `in_progress`.

### `agents.defaults.subagents`

```json5
{
  agents: {
    defaults: {
      subagents: {
        allowAgents: ["research"],
        model: "minimax/MiniMax-M2.7",
        maxConcurrent: 8,
        runTimeoutSeconds: 900,
        announceTimeoutMs: 120000,
        archiveAfterMinutes: 60,
      },
    },
  },
}
```

- `model` : modèle par défaut pour les sous-agents générés. S'il est omis, les sous-agents héritent du modèle de l'appelant.
- `allowAgents` : liste d'autorisation par défaut des IDs d'agents cibles configurés pour `sessions_spawn` lorsque l'agent demandeur ne définit pas son propre `subagents.allowAgents` (`["*"]` = n'importe quelle cible configurée ; par défaut : même agent uniquement). Les entrées obsolètes dont la configuration de l'agent a été supprimée sont rejetées par `sessions_spawn` et omises de `agents_list` ; exécutez `openclaw doctor --fix` pour les nettoyer.
- `runTimeoutSeconds` : délai d'attente par défaut (secondes) pour `sessions_spawn`. `0` signifie aucun délai d'attente.
- `announceTimeoutMs` : délai d'attente par appel (millisecondes) pour les tentatives de livraison d'annonce de la passerelle `agent`. Par défaut : `120000`. Les nouvelles tentatives transitoires peuvent prolonger l'attente totale d'annonce au-delà d'un délai configuré.
- Stratégie de tool par sous-agent : `tools.subagents.tools.allow` / `tools.subagents.tools.deny`.

---

## Providers personnalisés et URL de base

Les plugins de provider publient leurs propres lignes de catalogue de modèles. Ajoutez des providers personnalisés via `models.providers` dans la configuration ou `~/.openclaw/agents/<agentId>/agent/models.json`.

La configuration d'un provider personnalisé/local `baseUrl` constitue également la décision étroite de confiance réseau pour les requêtes HTTP du modèle : OpenClaw autorise cette origine `scheme://host:port` exacte via le chemin d'accès récupéré gardé, sans ajouter d'option de configuration séparée ni faire confiance à d'autres origines privées.

```json5
{
  models: {
    mode: "merge", // merge (default) | replace
    providers: {
      "custom-proxy": {
        baseUrl: "http://localhost:4000/v1",
        apiKey: "LITELLM_KEY",
        api: "openai-completions", // openai-completions | openai-responses | anthropic-messages | google-generative-ai
        models: [
          {
            id: "llama-3.1-8b",
            name: "Llama 3.1 8B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            contextTokens: 96000,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Authentification et priorité de fusion">
    - Utilisez `authHeader: true` + `headers` pour les besoins d'authentification personnalisés.
    - Remplacez la racine de la configuration de l'agent par `OPENCLAW_AGENT_DIR``models.json`.
    - Priorité de fusion pour les ID de provider correspondants :
      - Les valeurs de `baseUrl` de l'agent non vides l'emportent.
      - Les valeurs de `apiKey` de l'agent non vides l'emportent uniquement si ce provider n'est pas géré par SecretRef dans le contexte de configuration/profil d'authentification actuel.
      - Les valeurs de `apiKey` du provider géré par SecretRef sont actualisées à partir des marqueurs source (`ENV_VAR_NAME` pour les références env, `secretref-managed` pour les références fichier/exec) au lieu de conserver les secrets résolus.
      - Les valeurs d'en-tête du provider géré par SecretRef sont actualisées à partir des marqueurs source (`secretref-env:ENV_VAR_NAME` pour les références env, `secretref-managed` pour les références fichier/exec).
      - Les `apiKey`/`baseUrl` de l'agent vides ou manquants reviennent à `models.providers` dans la configuration.
      - Les `maxTokens`/`contextWindow` du model correspondant utilisent la valeur la plus élevée entre la configuration explicite et les valeurs implicites du catalogue.
      - Les `contextTokens` du model correspondant préservent une limite d'exécution explicite si elle est présente ; utilisez-la pour limiter le contexte effectif sans modifier les métadonnées natives du model.
      - Les catalogues de plugins de provider sont stockés sous forme de fragments de catalogue générés appartenant au plugin sous l'état du plugin de l'agent.
      - Utilisez `models.mode: "replace"` lorsque vous souhaitez que la configuration réécrive entièrement `models.json` et les fragments de catalogue de plugin actifs.
      - La persistance des marqueurs est source-autoritaire : les marqueurs sont écrits à partir de l'instantané de configuration source actif (pré-résolution), et non à partir des valeurs de secret d'exécution résolues.

  </Accordion>
</AccordionGroup>

### Détails des champs du provider

<AccordionGroup>
  <Accordion title="Catalogue de niveau supérieur">
    - `models.mode` : comportement du catalogue de providers (`merge` ou `replace`).
    - `models.providers` : mappage de providers personnalisés indexé par l'identifiant du provider.
      - Modifications sécurisées : utilisez `openclaw config set models.providers.<id> '<json>' --strict-json --merge` ou `openclaw config set models.providers.<id>.models '<json-array>' --strict-json --merge` pour les mises à jour additives. `config set` refuse les remplacements destructeurs, sauf si vous passez `--replace`.

  </Accordion>
  <Accordion title="Connexion et authentification du provider">
    - `models.providers.*.api` : adaptateur de requête (`openai-completions`, `openai-responses`, `anthropic-messages`, `google-generative-ai`, etc.). Pour les backends `/v1/chat/completions` auto-hébergés tels que MLX, vLLM, SGLang et la plupart des serveurs locaux compatibles OpenAI, utilisez `openai-completions`. Un provider personnalisé avec `baseUrl` mais sans `api` utilise `openai-completions` par défaut ; définissez `openai-responses` uniquement lorsque le backend prend en charge `/v1/responses`.
    - `models.providers.*.apiKey` : identifiant du provider (privilégiez la substitution SecretRef/env).
    - `models.providers.*.auth` : stratégie d'authentification (`api-key`, `token`, `oauth`, `aws-sdk`).
    - `models.providers.*.contextWindow` : fenêtre de contexte native par défaut pour les modèles de ce provider lorsque l'entrée du modèle ne définit pas `contextWindow`.
    - `models.providers.*.contextTokens` : limite de contexte d'exécution effective par défaut pour les modèles de ce provider lorsque l'entrée du modèle ne définit pas `contextTokens`.
    - `models.providers.*.maxTokens` : limite de jetons de sortie par défaut pour les modèles de ce provider lorsque l'entrée du modèle ne définit pas `maxTokens`.
    - `models.providers.*.timeoutSeconds` : délai d'expiration de requête HTTP modèle par provider optionnel en secondes, incluant la connexion, les en-têtes, le corps et la gestion de l'abandon total de la requête.
    - `models.providers.*.injectNumCtxForOpenAICompat` : pour Ollama + `openai-completions`, injecte `options.num_ctx` dans les requêtes (par défaut : `true`).
    - `models.providers.*.authHeader` : force le transport des identifiants dans l'en-tête `Authorization` lorsque cela est requis.
    - `models.providers.*.baseUrl` : URL de base de l'API en amont.
    - `models.providers.*.headers` : en-têtes statiques supplémentaires pour le routage proxy/locataire.

  </Accordion>
  <Accordion title="Demandes de remplacement du transport">
    `models.providers.*.request` : remplacements du transport pour les requêtes HTTP du fournisseur de modèles.

    - `request.headers` : en-têtes supplémentaires (fusionnés avec les valeurs par défaut du fournisseur). Les valeurs acceptent SecretRef.
    - `request.auth` : remplacement de la stratégie d'authentification. Modes : `"provider-default"` (utiliser l'authentification intégrée du fournisseur), `"authorization-bearer"` (avec `token`), `"header"` (avec `headerName`, `value`, optionnel `prefix`).
    - `request.proxy` : remplacement du proxy HTTP. Modes : `"env-proxy"` (utiliser les env vars `HTTP_PROXY`/`HTTPS_PROXY`), `"explicit-proxy"` (avec `url`). Les deux modes acceptent un sous-objet `tls` facultatif.
    - `request.tls` : remplacement TLS pour les connexions directes. Champs : `ca`, `cert`, `key`, `passphrase` (tous acceptent SecretRef), `serverName`, `insecureSkipVerify`.
    - `request.allowPrivateNetwork` : lorsque `true`, autoriser les requêtes HTTP du fournisseur de modèles vers des plages privées, CGNAT ou similaires via le garde de récupération HTTP du fournisseur. Les URL de base de fournisseurs personnalisés/locaux font déjà confiance à l'origine configurée exacte, à l'exception des origines de métadonnées/link-local, qui restent bloquées sans opt-in explicite. Définissez ceci sur `false` pour refuser la confiance de l'origine exacte. WebSocket utilise la même `request` pour les en-têtes/TLS mais pas cette porte SSRF de récupération. Par défaut `false`.

  </Accordion>
  <Accordion title="Entrées du catalogue de modèles">
    - `models.providers.*.models` : entrées explicites du catalogue de modèles du fournisseur.
    - `models.providers.*.models.*.input` : modalités d'entrée du modèle. Utilisez `["text"]` pour les modèles texte uniquement et `["text", "image"]` pour les modèles d'image/vision natifs. Les pièces jointes d'image ne sont injectées dans les tours de l'agent que lorsque le modèle sélectionné est marqué comme compatible avec les images.
    - `models.providers.*.models.*.contextWindow` : métadonnées natives de la fenêtre contextuelle du modèle. Cela remplace `contextWindow` au niveau du fournisseur pour ce modèle.
    - `models.providers.*.models.*.contextTokens` : plafond de contexte d'exécution facultatif. Cela remplace `contextTokens` au niveau du fournisseur ; utilisez-le lorsque vous souhaitez un budget contextuel effectif plus petit que la `contextWindow` native du modèle ; `openclaw models list` affiche les deux valeurs lorsqu'elles diffèrent.
    - `models.providers.*.models.*.compat.supportsDeveloperRole` : indicateur de compatibilité facultatif. Pour `api: "openai-completions"` avec un `baseUrl` non vide et non natif (hôte différent de `api.openai.com`), OpenClaw force cela à `false` lors de l'exécution. Un `baseUrl` vide ou omis conserve le comportement par défaut de OpenAI.
    - `models.providers.*.models.*.compat.requiresStringContent` : indicateur de compatibilité facultatif pour les points de terminaison de chat compatibles OpenAI en chaîne uniquement. Lorsque `true`, OpenClaw aplatit les tableaux `messages[].content` de texte pur en chaînes simples avant d'envoyer la requête.
    - `models.providers.*.models.*.compat.strictMessageKeys` : indicateur de compatibilité facultatif pour les points de terminaison de chat strictement compatibles OpenAI. Lorsque `true`, OpenClaw dépouille les objets de message sortants de Chat Completions pour ne conserver que `role` et `content` avant d'envoyer la requête.
    - `models.providers.*.models.*.compat.thinkingFormat` : indicateur de payload de réflexion facultatif. Utilisez `"together"` pour les `reasoning.enabled` de style Together, `"qwen"` pour les `enable_thinking` de premier niveau, ou `"qwen-chat-template"` pour les `chat_template_kwargs.enable_thinking` sur les serveurs compatibles Qwen de la famille OpenAI qui prennent en charge les kwargs de modèle de chat au niveau de la requête, tels que vLLM. Les modèles Qwen configurés dans vLLM exposent des choix binaires `/think` (`off`, `on`) pour ces formats.

  </Accordion>
  <Accordion title="Découverte Amazon Bedrock">
    - `plugins.entries.amazon-bedrock.config.discovery` : racine des paramètres de découverte automatique Bedrock.
    - `plugins.entries.amazon-bedrock.config.discovery.enabled` : activer/désactiver la découverte implicite.
    - `plugins.entries.amazon-bedrock.config.discovery.region` : région AWS pour la découverte.
    - `plugins.entries.amazon-bedrock.config.discovery.providerFilter` : filtre d'ID de fournisseur facultatif pour une découverte ciblée.
    - `plugins.entries.amazon-bedrock.config.discovery.refreshInterval` : intervalle d'interrogation pour l'actualisation de la découverte.
    - `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow` : fenêtre de contexte de repli pour les modèles découverts.
    - `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens` : nombre maximum de jetons de sortie de repli pour les modèles découverts.

  </Accordion>
</AccordionGroup>

L'intégration interactive de fournisseurs personnalisés déduit l'entrée d'image pour les ID de modèles de vision courants tels que GPT-4o, Claude, Gemini, Qwen-VL, LLaVA, Pixtral, InternVL, Mllama, MiniCPM-V et GLM-4V, et ignore la question supplémentaire pour les familles connues de texte uniquement. Les ID de modèles inconnus demandent toujours la prise en charge de l'image. L'intégration non interactive utilise la même déduction ; passez `--custom-image-input` pour forcer les métadonnées compatibles avec l'image ou `--custom-text-input` pour forcer les métadonnées de texte uniquement.

### Exemples de fournisseurs

<AccordionGroup>
  <Accordion title="Cerebras (GLM 4.7 / GPT OSS)">
    Le plugin de fournisseur `cerebras` inclus peut configurer cela via `openclaw onboard --auth-choice cerebras-api-key`. Utilisez une configuration explicite du fournisseur uniquement lors de la substitution des valeurs par défaut.

    ```json5
    {
      env: { CEREBRAS_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: {
            primary: "cerebras/zai-glm-4.7",
            fallbacks: ["cerebras/gpt-oss-120b"],
          },
          models: {
            "cerebras/zai-glm-4.7": { alias: "GLM 4.7 (Cerebras)" },
            "cerebras/gpt-oss-120b": { alias: "GPT OSS 120B (Cerebras)" },
          },
        },
      },
      models: {
        mode: "merge",
        providers: {
          cerebras: {
            baseUrl: "https://api.cerebras.ai/v1",
            apiKey: "${CEREBRAS_API_KEY}",
            api: "openai-completions",
            models: [
              { id: "zai-glm-4.7", name: "GLM 4.7 (Cerebras)" },
              { id: "gpt-oss-120b", name: "GPT OSS 120B (Cerebras)" },
            ],
          },
        },
      },
    }
    ```

    Utilisez `cerebras/zai-glm-4.7` pour Cerebras ; `zai/glm-4.7` pour Z.AI direct.

  </Accordion>
  <Accordion title="Kimi Coding">
    ```json5
    {
      env: { KIMI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "kimi/kimi-for-coding" },
          models: { "kimi/kimi-for-coding": { alias: "Kimi Code" } },
        },
      },
    }
    ```

    Fournisseur intégré compatible avec Anthropic. Raccourci : `openclaw onboard --auth-choice kimi-code-api-key`.

  </Accordion>
  <Accordion title="Modèles locaux (LM Studio)">
    Voir [Local Models](/fr/gateway/local-models). TL;DR : exécutez un grand modèle local via l'API de réponses LM Studio sur du matériel sérieux ; conservez les modèles hébergés fusionnés pour le repli.
  </Accordion>
  <Accordion title="MiniMaxMiniMax M3 (direct)">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M3" },
          models: {
            "minimax/MiniMax-M3": { alias: "Minimax" },
          },
        },
      },
      models: {
        mode: "merge",
        providers: {
          minimax: {
            baseUrl: "https://api.minimax.io/anthropic",
            apiKey: "${MINIMAX_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "MiniMax-M3",
                name: "MiniMax M3",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0.6, output: 2.4, cacheRead: 0.12, cacheWrite: 0 },
                contextWindow: 1000000,
                maxTokens: 131072,
              },
            ],
          },
        },
      },
    }
    ```

    Définissez `MINIMAX_API_KEY`. Raccourcis : `openclaw onboard --auth-choice minimax-global-api` ou `openclaw onboard --auth-choice minimax-cn-api`AnthropicOpenClawMiniMax. Le catalogue de modèles est par défaut réglé sur M3 et inclut également les variantes M2.7. Sur le chemin de streaming compatible Anthropic, OpenClaw désactive la réflexion MiniMax par défaut, sauf si vous définissez explicitement `thinking` vous-même. `/fast on` ou `params.fastMode: true` réécrit `MiniMax-M2.7` en `MiniMax-M2.7-highspeed`.

  </Accordion>
  <Accordion title="MoonshotMoonshot AI (Kimi)">
    ```json5
    {
      env: { MOONSHOT_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "moonshot/kimi-k2.6" },
          models: { "moonshot/kimi-k2.6": { alias: "Kimi K2.6" } },
        },
      },
      models: {
        mode: "merge",
        providers: {
          moonshot: {
            baseUrl: "https://api.moonshot.ai/v1",
            apiKey: "${MOONSHOT_API_KEY}",
            api: "openai-completions",
            models: [
              {
                id: "kimi-k2.6",
                name: "Kimi K2.6",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0.95, output: 4, cacheRead: 0.16, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
            ],
          },
        },
      },
    }
    ```

    Pour le point de terminaison Chine : `baseUrl: "https://api.moonshot.cn/v1"` ou `openclaw onboard --auth-choice moonshot-api-key-cn`Moonshot.

    Les points de terminaison natifs Moonshot annoncent une compatibilité d'utilisation en streaming sur le transport partagé `openai-completions`OpenClaw, et les clés OpenClaw se basent sur les capacités du point de terminaison plutôt que sur l'identifiant du fournisseur intégré seul.

  </Accordion>
  <Accordion title="OpenCode">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "opencode/claude-opus-4-6" },
          models: { "opencode/claude-opus-4-6": { alias: "Opus" } },
        },
      },
    }
    ```

    Définissez `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`). Utilisez les références `opencode/...` pour le catalogue Zen ou les références `opencode-go/...` pour le catalogue Go. Raccourci : `openclaw onboard --auth-choice opencode-zen` ou `openclaw onboard --auth-choice opencode-go`.

  </Accordion>
  <Accordion title="AnthropicSynthetic (Anthropic-compatible)">
    ```json5
    {
      env: { SYNTHETIC_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" },
          models: { "synthetic/hf:MiniMaxAI/MiniMax-M2.5": { alias: "MiniMax M2.5" } },
        },
      },
      models: {
        mode: "merge",
        providers: {
          synthetic: {
            baseUrl: "https://api.synthetic.new/anthropic",
            apiKey: "${SYNTHETIC_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "hf:MiniMaxAI/MiniMax-M2.5",
                name: "MiniMax M2.5",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 192000,
                maxTokens: 65536,
              },
            ],
          },
        },
      },
    }
    ```

    L'URL de base doit omettre `/v1`Anthropic (le client Anthropic l'ajoute). Raccourci : `openclaw onboard --auth-choice synthetic-api-key`.

  </Accordion>
  <Accordion title="GLMZ.AI (GLM-4.7)">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "zai/glm-4.7" },
          models: { "zai/glm-4.7": {} },
        },
      },
    }
    ```

    Définissez `ZAI_API_KEY`. Les références de modèle utilisent l'ID de fournisseur `zai/*` canonique. Raccourci : `openclaw onboard --auth-choice zai-api-key`.

    - Point de terminaison général : `https://api.z.ai/api/paas/v4`
    - Point de terminaison de codage (par défaut) : `https://api.z.ai/api/coding/paas/v4`
    - Pour le point de terminaison général, définissez un fournisseur personnalisé avec la substitution de l'URL de base.

  </Accordion>
</AccordionGroup>

---

## Connexes

- [Configuration — agents](/fr/gateway/config-agents)
- [Configuration — canaux](/fr/gateway/config-channels)
- [Référence de configuration](/fr/gateway/configuration-reference) — autres clés de niveau supérieur
- [Outils et plugins](/fr/tools)
