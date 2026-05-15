---
summary: "Configuration des outils (stratégie, commutateurs expérimentaux, outils pris en charge par des providers) et configuration de providers personnalisés / URL de base"
read_when:
  - Configuring `tools.*` policy, allowlists, or experimental features
  - Registering custom providers or overriding base URLs
  - Setting up OpenAI-compatible self-hosted endpoints
title: "Configuration — outils et providers personnalisés"
sidebarTitle: "Outils et providers personnalisés"
---

Clés de configuration `tools.*` et configuration de provider personnalisé / URL de base. Pour les agents, les canaux et d'autres clés de configuration de niveau supérieur, voir [Référence de configuration](/fr/gateway/configuration-reference).

## Outils

### Profils d'outils

`tools.profile` définit une liste d'autorisation de base avant `tools.allow`/`tools.deny` :

<Note>L'intégration locale (onboarding) définit par défaut les nouvelles configurations locales à `tools.profile: "coding"` lorsqu'elles ne sont pas définies (les profils explicites existants sont conservés).</Note>

| Profil      | Inclut                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | `session_status` uniquement                                                                                                     |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                       |
| `full`      | Aucune restriction (identique à non défini)                                                                                     |

### Groupes d'outils

| Groupe             | Outils                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | `exec`, `process`, `code_execution` (`bash` est accepté comme un alias pour `exec`)                                     |
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

### `tools.allow` / `tools.deny`

Stratégie globale d'autorisation/refus d'outils (le refus l'emporte). Insensible à la casse, prend en charge les caractères génériques `*`Docker. Appliquée même lorsque le bac à sable Docker est désactivé.

```json5
{
  tools: { deny: ["browser", "canvas"] },
}
```

`write` et `apply_patch` sont des identifiants d'outils distincts. `allow: ["write"]` active également `apply_patch` pour les modèles compatibles, mais `deny: ["write"]` ne refuse pas `apply_patch`. Pour bloquer toute mutation de fichier, refusez `group:fs` ou listez explicitement chaque outil de mutation :

```json5
{
  tools: { deny: ["write", "edit", "apply_patch"] },
}
```

### `tools.byProvider`

Restreindre davantage les outils pour des providers ou modèles spécifiques. Ordre : profil de base → profil de provider → autoriser/refuser.

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
  Seuil de répétition du modèle sans progression pour les avertissements.
</ParamField>
<ParamField path="criticalThreshold" type="number">
  Seuil de répétition plus élevé pour bloquer les boucles critiques.
</ParamField>
<ParamField path="globalCircuitBreakerThreshold" type="number">
  Seuil d'arrêt brutal pour toute exécution sans progression.
</ParamField>
<ParamField path="detectors.genericRepeat" type="boolean">
  Avertir en cas d'appels répétés avec le même outil/les mêmes arguments.
</ParamField>
<ParamField path="detectors.knownPollNoProgress" type="boolean">
  Avertir/bloquer sur les outils de sondage connus (`process.poll`, `command_status`, etc.).
</ParamField>
<ParamField path="detectors.pingPong" type="boolean">
  Avertir/bloquer sur les modèles de paires alternés sans progression.
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
    **Provider entry** (`type: "provider"` or omitted):

    - `provider`API: API provider id (`openai`, `anthropic`, `google`/`gemini`, `groq`, etc.)
    - `model`: model id override
    - `profile` / `preferredProfile`: `auth-profiles.json`CLI profile selection

    **CLI entry** (`type: "cli"`):

    - `command`: executable to run
    - `args`: templated args (supports `{{MediaPath}}`, `{{Prompt}}`, `{{MaxChars}}`, etc.; `openclaw doctor --fix` migrates deprecated `{input}` placeholders to `{{MediaPath}}`)

    **Common fields:**

    - `capabilities`: optional list (`image`, `audio`, `video`). Defaults: `openai`/`anthropic`/`minimax` → image, `google` → image+audio+video, `groq` → audio.
    - `prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`: per-entry overrides.
    - `tools.media.image.timeoutSeconds` and matching image model `timeoutSeconds` entries also apply when the agent calls the explicit `image` tool.
    - Failures fall back to the next entry.

    Provider auth follows standard order: `auth-profiles.json` → env vars → `models.providers.*.apiKey`.

    **Async completion fields:**

    - `asyncCompletion.directSend`: deprecated compatibility flag. Completed async media tasks stay requester-session mediated so the agent receives the result, decides how to tell the user, and uses the message tool when source delivery requires it.

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

Par défaut : `tree` (session actuelle + sessions générées par celle-ci, comme les sous-agents).

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
    - `agent` : toute session appartenant à l'identifiant de l'agent actuel (peut inclure d'autres utilisateurs si vous exécutez des sessions par expéditeur sous le même identifiant d'agent).
    - `all` : n'importe quelle session. Le ciblage inter-agents nécessite toujours `tools.agentToAgent`.
    - Clampage du bac à sable (Sandbox clamp) : lorsque la session actuelle est isolée (sandboxed) et que `agents.defaults.sandbox.sessionToolsVisibility="spawned"`, la visibilité est forcée à `tree` même si `tools.sessions.visibility="all"`.

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
    - Les pièces jointes ne sont prises en charge que pour `runtime: "subagent"`. Le runtime ACP les rejette.
    - Les fichiers sont matérialisés dans l'espace de travail enfant à `.openclaw/attachments/<uuid>/` avec un `.manifest.json`.
    - Le contenu des pièces jointes est automatiquement expurgé de la persistance des transcriptions.
    - Les entrées Base64 sont validées avec des vérifications strictes de l'alphabet et du remplissage (padding) ainsi qu'une protection de taille pré-décodage.
    - Les permissions de fichiers sont `0700` pour les répertoires et `0600` pour les fichiers.
    - Le nettoyage suit la politique `cleanup` : `delete` supprime toujours les pièces jointes ; `keep` les conserve uniquement lorsque `retainOnSessionKeep: true`.

  </Accordion>
</AccordionGroup>

<a id="toolsexperimental"></a>

### `tools.experimental`

Indicateurs d'outils intégrés expérimentaux. Désactivés par défaut, sauf si une règle d'activation automatique GPT-5 strictement agente s'applique.

```json5
{
  tools: {
    experimental: {
      planTool: true, // enable experimental update_plan
    },
  },
}
```

- `planTool` : active l'outil structuré `update_plan` pour le suivi du travail non trivial en plusieurs étapes.
- Par défaut : `false` , sauf si `agents.defaults.embeddedPi.executionContract` (ou une priorité par agent) est défini sur `"strict-agentic"` pour une exécution de la famille GPT-5 OpenAI ou OpenAI Codex. Définissez `true` pour forcer l'activation de l'outil en dehors de cette portée, ou `false` pour le désactiver même pour les exécutions GPT-5 strictement agentiques.
- Lorsqu'il est activé, l'invite système ajoute également des directives d'utilisation afin que le modèle ne l'utilise que pour un travail substantiel et conserve au plus une étape `in_progress`.

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
        archiveAfterMinutes: 60,
      },
    },
  },
}
```

- `model` : model par défaut pour les sous-agents générés. Si omis, les sous-agents héritent du model de l'appelant.
- `allowAgents` : liste d'autorisation par défaut des IDs d'agents cibles pour `sessions_spawn` lorsque l'agent demandeur ne définit pas son propre `subagents.allowAgents` (`["*"]` = n'importe quel ; par défaut : même agent uniquement).
- `runTimeoutSeconds` : délai d'attente par défaut (secondes) pour `sessions_spawn` lorsque l'appel d'outil omet `runTimeoutSeconds` . `0` signifie aucun délai d'attente.
- Stratégie d'outil par sous-agent : `tools.subagents.tools.allow` / `tools.subagents.tools.deny`.

---

## Fournisseurs personnalisés et URL de base

OpenClaw utilise le catalogue de modèles intégré. Ajoutez des fournisseurs personnalisés via `models.providers` dans la configuration ou `~/.openclaw/agents/<agentId>/agent/models.json`.

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
    - Remplacez la racine de configuration de l'agent par `OPENCLAW_AGENT_DIR` (ou `PI_CODING_AGENT_DIR`, un alias de variable d'environnement hérité).
    - Priorité de fusion pour les IDs de provider correspondants :
      - Les valeurs non vides de `models.json` `baseUrl` de l'agent l'emportent.
      - Les valeurs non vides de `apiKey` de l'agent l'emportent uniquement lorsque ce provider n'est pas géré par SecretRef dans le contexte de configuration/profil d'authentification actuel.
      - Les valeurs de `apiKey` du provider géré par SecretRef sont actualisées à partir des marqueurs de source (`ENV_VAR_NAME` pour les références d'environnement, `secretref-managed` pour les références de fichier/exécutable) au lieu de persister les secrets résolus.
      - Les valeurs d'en-tête du provider géré par SecretRef sont actualisées à partir des marqueurs de source (`secretref-env:ENV_VAR_NAME` pour les références d'environnement, `secretref-managed` pour les références de fichier/exécutable).
      - Les valeurs `apiKey`/`baseUrl` de l'agent vides ou manquantes reviennent à `models.providers` dans la configuration.
      - Les `contextWindow`/`maxTokens` du modèle correspondant utilisent la valeur la plus élevée entre la configuration explicite et les valeurs implicites du catalogue.
      - Le `contextTokens` du modèle correspondant préserve une limite d'exécution explicite si elle est présente ; utilisez-le pour limiter le contexte effectif sans modifier les métadonnées natives du modèle.
      - Utilisez `models.mode: "replace"` lorsque vous souhaitez que la configuration réécrive entièrement `models.json`.
      - La persistance des marqueurs est source-autoritaire : les marqueurs sont écrits à partir de l'instantané actif de la configuration source (pré-résolution), et non à partir des valeurs de secrets d'exécution résolus.

  </Accordion>
</AccordionGroup>

### Détails des champs de provider

<AccordionGroup>
  <Accordion title="Catalogue de premier niveau">
    - `models.mode` : comportement du catalogue de providers (`merge` ou `replace`).
    - `models.providers` : mappage de providers personnalisés indexé par l'ID de provider.
      - Modifications sûres : utilisez `openclaw config set models.providers.<id> '<json>' --strict-json --merge` ou `openclaw config set models.providers.<id>.models '<json-array>' --strict-json --merge` pour les mises à jour additives. `config set` refuse les remplacements destructeurs, sauf si vous passez `--replace`.

  </Accordion>
  <Accordion title="Connexion et authentification du provider">
    - `models.providers.*.api` : adaptateur de requête (`openai-completions`, `openai-responses`, `anthropic-messages`, `google-generative-ai`, etc.). Pour les backends `/v1/chat/completions` auto-hébergés tels que MLX, vLLM, SGLang et la plupart des serveurs locaux compatibles OpenAI, utilisez `openai-completions`. Un provider personnalisé avec `baseUrl` mais sans `api` utilise `openai-completions` par défaut ; définissez `openai-responses` uniquement si le backend prend en charge `/v1/responses`.
    - `models.providers.*.apiKey` : identifiant du provider (privilégiez la substitution SecretRef/env).
    - `models.providers.*.auth` : stratégie d'authentification (`api-key`, `token`, `oauth`, `aws-sdk`).
    - `models.providers.*.contextWindow` : fenêtre de contexte native par défaut pour les modèles de ce provider lorsque l'entrée du modèle ne définit pas `contextWindow`.
    - `models.providers.*.contextTokens` : plafond de contexte d'exécution effectif par défaut pour les modèles de ce provider lorsque l'entrée du modèle ne définit pas `contextTokens`.
    - `models.providers.*.maxTokens` : plafond de jetons de sortie par défaut pour les modèles de ce provider lorsque l'entrée du modèle ne définit pas `maxTokens`.
    - `models.providers.*.timeoutSeconds` : délai d'expiration de la requête HTTP du modèle par provider optionnel en secondes, incluant la connexion, les en-têtes, le corps et la gestion de l'abandon total de la requête.
    - `models.providers.*.injectNumCtxForOpenAICompat` : pour Ollama + `openai-completions`, injecter `options.num_ctx` dans les requêtes (par défaut : `true`).
    - `models.providers.*.authHeader` : forcer le transport des identifiants dans l'en-tête `Authorization` lorsque cela est requis.
    - `models.providers.*.baseUrl` : URL de base de l'API en amont.
    - `models.providers.*.headers` : en-têtes statiques supplémentaires pour le routage proxy/locataire.

  </Accordion>
  <Accordion title="Demandes de remplacements de transport">
    `models.providers.*.request` : remplacements de transport pour les requêtes HTTP du fournisseur de modèles.

    - `request.headers` : en-têtes supplémentaires (fusionnés avec les valeurs par défaut du fournisseur). Les valeurs acceptent SecretRef.
    - `request.auth` : remplacement de la stratégie d'authentification. Modes : `"provider-default"` (utiliser l'auth intégrée du fournisseur), `"authorization-bearer"` (avec `token`), `"header"` (avec `headerName`, `value`, `prefix` en option).
    - `request.proxy` : remplacement du proxy HTTP. Modes : `"env-proxy"` (utiliser les env vars `HTTP_PROXY`/`HTTPS_PROXY`), `"explicit-proxy"` (avec `url`). Les deux modes acceptent un sous-objet `tls` en option.
    - `request.tls` : remplacement TLS pour les connexions directes. Champs : `ca`, `cert`, `key`, `passphrase` (tous acceptent SecretRef), `serverName`, `insecureSkipVerify`.
    - `request.allowPrivateNetwork` : lorsque `true`, autoriser HTTPS vers `baseUrl` lorsque le DNS résout vers des plages privées, CGNAT ou similaires, via la garde de récupération HTTP du fournisseur (adhésion de l'opérateur pour les points de terminaison auto-hébergés compatibles OpenAI de confiance). Les URL de flux du fournisseur de modèles de bouclage telles que `localhost`, `127.0.0.1` et `[::1]` sont autorisées automatiquement sauf si ceci est explicitement défini sur `false` ; les hôtes DNS LAN, tailnet et privés nécessitent toujours une adhésion. WebSocket utilise le même `request` pour les en-têtes/TLS mais pas cette porte SSRF de récupération. Par défaut `false`.

  </Accordion>
  <Accordion title="Entrées du catalogue de modèles">
    - `models.providers.*.models` : entrées explicites du catalogue de modèles du provider.
    - `models.providers.*.models.*.input` : modalités d'entrée du modèle. Utilisez `["text"]` pour les modèles texte uniquement et `["text", "image"]` pour les modèles d'image/vision natifs. Les pièces jointes d'image ne sont injectées dans les tours de l'agent que lorsque le modèle sélectionné est marqué comme compatible avec les images.
    - `models.providers.*.models.*.contextWindow` : métadonnées de la fenêtre de contexte native du modèle. Cela remplace `contextWindow` au niveau du provider pour ce modèle.
    - `models.providers.*.models.*.contextTokens` : plafond de contexte d'exécution optionnel. Cela remplace `contextTokens` au niveau du provider ; utilisez-le lorsque vous souhaitez un budget de contexte effectif plus petit que la `contextWindow` native du modèle ; `openclaw models list` affiche les deux valeurs lorsqu'elles diffèrent.
    - `models.providers.*.models.*.compat.supportsDeveloperRole` : indicateur de compatibilité optionnel. Pour `api: "openai-completions"` avec un `baseUrl` non natif non vide (hôte différent de `api.openai.com`), OpenClaw force ceci à `false` à l'exécution. Un `baseUrl` vide ou omis conserve le comportement par défaut de OpenAI.
    - `models.providers.*.models.*.compat.requiresStringContent` : indicateur de compatibilité optionnel pour les points de terminaison de chat compatibles avec OpenAI en chaîne uniquement. Lorsque `true`, OpenClaw aplatit les tableaux `messages[].content` de texte pur en chaînes simples avant d'envoyer la requête.
    - `models.providers.*.models.*.compat.thinkingFormat` : indicateur de payload de réflexion optionnel. Utilisez `"qwen"` pour `enable_thinking` de premier niveau, ou `"qwen-chat-template"` pour `chat_template_kwargs.enable_thinking` sur les serveurs compatibles avec Qwen de la famille OpenAI qui prennent en charge les kwargs de modèle de chat au niveau de la requête, tels que vLLM.

  </Accordion>
  <Accordion title="Amazon BedrockDécouverte Amazon Bedrock">
    - `plugins.entries.amazon-bedrock.config.discovery` : racine des paramètres de découverte automatique de Bedrock.
    - `plugins.entries.amazon-bedrock.config.discovery.enabled` : activer/désactiver la découverte implicite.
    - `plugins.entries.amazon-bedrock.config.discovery.region` : région AWS pour la découverte.
    - `plugins.entries.amazon-bedrock.config.discovery.providerFilter` : filtre provider-id facultatif pour une découverte ciblée.
    - `plugins.entries.amazon-bedrock.config.discovery.refreshInterval` : intervalle d'interrogation pour l'actualisation de la découverte.
    - `plugins.entries.amazon-bedrock.config.discovery.defaultContextWindow` : fenêtre de contexte de repli pour les modèles découverts.
    - `plugins.entries.amazon-bedrock.config.discovery.defaultMaxTokens` : nombre maximal de jetons de sortie de repli pour les modèles découverts.

  </Accordion>
</AccordionGroup>

L'intégration interactive de fournisseurs personnalisés déduit l'entrée d'image pour les ID de modèles de vision courants tels que GPT-4o, Claude, Gemini, Qwen-VL, LLaVA, Pixtral, InternVL, Mllama, MiniCPM-V et GLM-4V, et ignore la question supplémentaire pour les familles connues de texte uniquement. Les ID de modèles inconnus demandent toujours la prise en charge de l'image. L'intégration non interactive utilise la même déduction ; passez QwenGLM`--custom-image-input` pour forcer les métadonnées compatibles avec l'image ou `--custom-text-input` pour forcer les métadonnées de texte uniquement.

### Exemples de fournisseurs

<AccordionGroup>
  <Accordion title="GLMCerebras (GLM 4.7 / GPT OSS)">
    Le plugin de fournisseur intégré `cerebras` peut configurer cela via `openclaw onboard --auth-choice cerebras-api-key`. Utilisez une configuration explicite du fournisseur uniquement pour remplacer les valeurs par défaut.

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
    ```Anthropic

    Fournisseur intégré compatible Anthropic. Raccourci : `openclaw onboard --auth-choice kimi-code-api-key`.

  </Accordion>
  <Accordion title="Modèles locaux (LM Studio)">
    Voir [Modèles locaux](/en/gateway/local-modelsAPI). TL;DR : exécutez un grand modèle local via l'API Responses de LM Studio sur du matériel sérieux ; gardez les modèles hébergés fusionnés pour le repli.
  </Accordion>
  <Accordion title="MiniMaxMiniMax M2.7 (direct)">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "Minimax" },
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
                id: "MiniMax-M2.7",
                name: "MiniMax M2.7",
                reasoning: true,
                input: ["text"],
                cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
            ],
          },
        },
      },
    }
    ```

    Définissez `MINIMAX_API_KEY`. Raccourcis : `openclaw onboard --auth-choice minimax-global-api` ou `openclaw onboard --auth-choice minimax-cn-api`AnthropicOpenClawMiniMax. Le catalogue de modèles est réglé par défaut sur M2.7 uniquement. Sur le chemin de streaming compatible Anthropic, OpenClaw désactive la réflexion MiniMax par défaut, sauf si vous définissez explicitement `thinking` vous-même. `/fast on` ou `params.fastMode: true` réécrit `MiniMax-M2.7` en `MiniMax-M2.7-highspeed`.

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

    Les points de terminaison natifs Moonshot annoncent la compatibilité d'utilisation du streaming sur le transport partagé `openai-completions`OpenClaw, et les clés OpenClaw désactivent les capacités du point de terminaison plutôt que l'identifiant du fournisseur intégré seul.

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
  <Accordion title="Z.AI (GLM-4.7)">
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

    Définissez `ZAI_API_KEY`. `z.ai/*` et `z-ai/*` sont des alias acceptés. Raccourci : `openclaw onboard --auth-choice zai-api-key`.

    - Point de terminaison général : `https://api.z.ai/api/paas/v4`
    - Point de terminaison de codage (par défaut) : `https://api.z.ai/api/coding/paas/v4`
    - Pour le point de terminaison général, définissez un provider personnalisé avec le remplacement de l'URL de base.

  </Accordion>
</AccordionGroup>

---

## Connexes

- [Configuration — agents](/fr/gateway/config-agents)
- [Configuration — canaux](/fr/gateway/config-channels)
- [Référence de configuration](/fr/gateway/configuration-reference) — autres clés de niveau supérieur
- [Outils et plugins](/fr/tools)
