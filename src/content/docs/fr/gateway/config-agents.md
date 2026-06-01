---
summary: "Agent defaults, multi-agent routing, session, messages, and talk config"
read_when:
  - Tuning agent defaults (models, thinking, workspace, heartbeat, media, skills)
  - Configuring multi-agent routing and bindings
  - Adjusting session, message delivery, and talk-mode behavior
title: "Configuration — agents"
---

Clés de configuration portées sur l'agent sous `agents.*`, `multiAgent.*`, `session.*`,
`messages.*` et `talk.*`. Pour les canaux, les outils, le runtime de la passerelle et autres
clés de niveau supérieur, voir [Référence de configuration](/fr/gateway/configuration-reference).

## Agent defaults

### `agents.defaults.workspace`

Par défaut : `OPENCLAW_WORKSPACE_DIR` si défini, sinon `~/.openclaw/workspace`.

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

Une valeur explicite `agents.defaults.workspace` prend le pas sur
`OPENCLAW_WORKSPACE_DIR`. Utilisez la variable d'environnement pour pointer les agents par défaut
vers un espace de travail monté lorsque vous ne souhaitez pas écrire ce chemin dans la configuration.

### `agents.defaults.repoRoot`

Racine du référentiel optionnelle affichée dans la ligne Runtime du prompt système. Si non définie, OpenClaw la détecte automatiquement en remontant à partir de l'espace de travail.

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skills`

Liste d'autorisation de compétences (allowlist) par défaut optionnelle pour les agents qui ne définissent pas
`agents.list[].skills`.

```json5
{
  agents: {
    defaults: { skills: ["github", "weather"] },
    list: [
      { id: "writer" }, // inherits github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

- Omettez `agents.defaults.skills` pour des compétences illimitées par défaut.
- Omettez `agents.list[].skills` pour hériter des valeurs par défaut.
- Définissez `agents.list[].skills: []` pour aucune compétence.
- Une liste `agents.list[].skills` non vide constitue l'ensemble final pour cet agent ; elle
  ne fusionne pas avec les valeurs par défaut.

### `agents.defaults.skipBootstrap`

Désactive la création automatique des fichiers d'amorçage de l'espace de travail (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`).

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.skipOptionalBootstrapFiles`

Ignore la création de fichiers d'espace de travail optionnels sélectionnés tout en écrivant toujours les fichiers d'amorçage requis. Valeurs valides : `SOUL.md`, `USER.md`, `HEARTBEAT.md`, et `IDENTITY.md`.

```json5
{
  agents: {
    defaults: {
      skipOptionalBootstrapFiles: ["SOUL.md", "USER.md"],
    },
  },
}
```

### `agents.defaults.contextInjection`

Contrôle le moment où les fichiers d'amorçage de l'espace de travail sont injectés dans le prompt système. Par défaut : `"always"`.

- `"continuation-skip"` : les tours de continuation sûrs (après une réponse complète de l'assistant) ignorent la réinjection de l'amorçage de l'espace de travail, réduisant la taille du prompt. Les exécutions de heartbeat et les tentatives après compactage reconstruisent toujours le contexte.
- `"never"` : désactive l'amorçage de l'espace de travail et l'injection des fichiers de contexte à chaque tour. À utiliser uniquement pour les agents qui gèrent entièrement leur cycle de vie de prompt (moteurs de contexte personnalisés, runtimes natifs qui construisent leur propre contexte, ou workflows spécialisés sans amorçage). Les tours de heartbeat et de récupération après compactage ignorent également l'injection.

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
}
```

Remplacement par agent : `agents.list[].contextInjection`. Les valeurs omises héritent de `agents.defaults.contextInjection`.

### `agents.defaults.bootstrapMaxChars`

Nombre maximal de caractères par fichier d'amorçage de l'espace de travail avant troncature. Par défaut : `12000`.

```json5
{
  agents: { defaults: { bootstrapMaxChars: 12000 } },
}
```

Remplacement par agent : `agents.list[].bootstrapMaxChars`. Les valeurs omises héritent de `agents.defaults.bootstrapMaxChars`.

### `agents.defaults.bootstrapTotalMaxChars`

Nombre maximal total de caractères injectés dans tous les fichiers d'amorçage de l'espace de travail. Par défaut : `60000`.

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

Remplacement par agent : `agents.list[].bootstrapTotalMaxChars`. Les valeurs omises héritent de `agents.defaults.bootstrapTotalMaxChars`.

### Remplacements du profil d'amorçage par agent

Utilisez les remplacements de profil d'amorçage par agent lorsqu'un agent a besoin d'un comportement d'injection de prompt différent des valeurs par défaut partagées. Les champs omis héritent de `agents.defaults`.

```json5
{
  agents: {
    defaults: {
      contextInjection: "continuation-skip",
      bootstrapMaxChars: 12000,
      bootstrapTotalMaxChars: 60000,
    },
    list: [
      {
        id: "strict-worker",
        contextInjection: "always",
        bootstrapMaxChars: 50000,
        bootstrapTotalMaxChars: 300000,
      },
    ],
  },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

Contrôle l'avis visible par l'agent dans le prompt système lorsque le contexte d'amorçage est tronqué. Par défaut : `"always"`.

- `"off"` : n'injecte jamais le texte d'avis de troncature dans le prompt système.
- `"once"` : injecte un avis concis une fois par signature de troncature unique.
- `"always"` : injecte un avis concis à chaque exécution lorsqu'une troncature existe (recommandé).

Les comptes bruts/injectés détaillés et les champs de réglage de configuration restent dans les diagnostics tels que les rapports de contexte/statut et les journaux ; le contexte utilisateur/runtime WebChat de routine ne reçoit que l'avis de récupération concis.

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "always" } }, // off | once | always
}
```

### Cartographie de la propriété du budget contextuel

OpenClaw dispose de plusieurs budgets de prompt/contexte à volume élevé, et ils sont scindés intentionnellement par sous-système plutôt que de passer tous par un seul curseur générique.

- `agents.defaults.bootstrapMaxChars` /
  `agents.defaults.bootstrapTotalMaxChars` :
  injection de bootstrap d'espace de travail normale.
- `agents.defaults.startupContext.*` :
  prélude unique de réinitialisation/démarrage du model-run, incluant les fichiers quotidiens récents `memory/*.md`. Les commandes de chat nues `/new` et `/reset` sont acquittées sans invoquer le modèle.
- `skills.limits.*` :
  la liste compacte des compétences injectée dans le prompt système.
- `agents.defaults.contextLimits.*` :
  extraits d'exécution bornés et blocs possédés par l'exécution injectés.
- `memory.qmd.limits.*` :
  extrait de recherche de mémoire indexé et dimensionnement de l'injection.

Utilisez la redéfinition par agent correspondante uniquement lorsqu'un seul agent a besoin d'un budget différent :

- `agents.list[].skillsLimits.maxSkillsPromptChars`
- `agents.list[].contextInjection`
- `agents.list[].bootstrapMaxChars`
- `agents.list[].bootstrapTotalMaxChars`
- `agents.list[].contextLimits.*`

#### `agents.defaults.startupContext`

Contrôle le prélude de démarrage du premier tour injecté lors des exécutions de modèle de réinitialisation/démarrage. Les commandes de chat nues `/new` et `/reset` acknowledge la réinitialisation sans invoquer le modèle, elles ne chargent donc pas ce prélude.

```json5
{
  agents: {
    defaults: {
      startupContext: {
        enabled: true,
        applyOn: ["new", "reset"],
        dailyMemoryDays: 2,
        maxFileBytes: 16384,
        maxFileChars: 1200,
        maxTotalChars: 2800,
      },
    },
  },
}
```

#### `agents.defaults.contextLimits`

Valeurs par défaut partagées pour les surfaces de contexte d'exécution bornées.

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
        memoryGetDefaultLines: 120,
        postCompactionMaxChars: 1800,
      },
    },
  },
}
```

- `memoryGetMaxChars` : limite d'extrait par défaut `memory_get` avant que les métadonnées de troncation et l'avis de continuation ne soient ajoutés.
- `memoryGetDefaultLines` : fenêtre de ligne par défaut `memory_get` lorsque `lines` est omis.
- `toolResultMaxChars` : plafond avancé de résultats d'outils en direct utilisé pour les résultats
  persistants et la récupération de débordement. Laisser non défini pour la plafond automatique du contexte du modèle :
  `16000` caractères sous 100K tokens, `32000` caractères à 100K+ tokens, et `64000`
  caractères à 200K+ tokens. Le plafond effectif est toujours limité à environ 30 % de la
  fenêtre de contexte du modèle. `openclaw doctor --deep` imprime le plafond effectif, et
  doctor n'avertit que lorsqu'une substitution explicite est obsolète ou sans effet.
- `postCompactionMaxChars` : plafond d'extrait AGENTS.md utilisé lors de l'injection
  de rafraîchissement post-compaction.

#### `agents.list[].contextLimits`

Substitution par agent pour les paramètres partagés `contextLimits`. Les champs omis héritent
de `agents.defaults.contextLimits`.

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
      },
    },
    list: [
      {
        id: "tiny-local",
        contextLimits: {
          memoryGetMaxChars: 6000,
          toolResultMaxChars: 8000, // advanced ceiling for this agent
        },
      },
    ],
  },
}
```

#### `skills.limits.maxSkillsPromptChars`

Plafond global pour la liste compacte de compétences injectée dans le prompt système. Cela
n'affecte pas la lecture des fichiers `SKILL.md` à la demande.

```json5
{
  skills: {
    limits: {
      maxSkillsPromptChars: 18000,
    },
  },
}
```

#### `agents.list[].skillsLimits.maxSkillsPromptChars`

Remplacement par agent pour le budget du prompt des compétences.

```json5
{
  agents: {
    list: [
      {
        id: "tiny-local",
        skillsLimits: {
          maxSkillsPromptChars: 6000,
        },
      },
    ],
  },
}
```

### `agents.defaults.imageMaxDimensionPx`

Taille maximale en pixels pour le côté le plus long des images dans les blocs de transcription/outils avant les appels au fournisseur.
Par défaut : `1200`.

Des valeurs plus faibles réduisent généralement l'utilisation des jetons de vision et la taille de la charge utile de la demande pour les exécutions avec de nombreuses captures d'écran. Des valeurs plus élevées préservent plus de détails visuels.

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.imageQuality`

Préférence de compression/détail de l'outil d'image pour les images chargées à partir de chemins de fichiers, d'URL et de références média.
Par défaut : `auto`.

OpenClaw adapte l'échelle de redimensionnement au modèle d'image sélectionné. Par exemple, Claude Opus 4.8, OpenAI GPT-5.5, Qwen VL, et les modèles de vision Llama 4 hébergés peuvent utiliser des images plus grandes que les chemins de vision haute résolution par défaut/anciens, tandis que les tours multi-images sont compressés plus agressivement en mode OpenClawOpenAIQwen`auto` pour contrôler le coût en tokens et en latence.

Valeurs :

- `auto` : s'adapter aux limites du modèle et au nombre d'images.
- `efficient` : privilégiez des images plus petites pour une utilisation réduite de jetons et d'octets.
- `balanced` : utilisez l'échelle intermédiaire standard.
- `high` : préservez plus de détails pour les captures d'écran, les diagrammes et les images de documents.

```json5
{
  agents: { defaults: { imageQuality: "auto" } },
}
```

### `agents.defaults.userTimezone`

Fuseau horaire pour le contexte du prompt système (pas les horodatages des messages). Revient au fuseau horaire de l'hôte.

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

Format de l'heure dans l'invite système. Par défaut : `auto` (préférence du système d'exploitation).

```json5
{
  agents: { defaults: { timeFormat: "auto" } }, // auto | 12 | 24
}
```

### `agents.defaults.model`

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": { alias: "opus" },
        "minimax/MiniMax-M2.7": { alias: "minimax" },
      },
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["minimax/MiniMax-M2.7"],
      },
      imageModel: {
        primary: "openrouter/qwen/qwen-2.5-vl-72b-instruct:free",
        fallbacks: ["openrouter/google/gemini-2.0-flash-vision:free"],
      },
      imageGenerationModel: {
        primary: "openai/gpt-image-2",
        fallbacks: ["google/gemini-3.1-flash-image-preview"],
      },
      videoGenerationModel: {
        primary: "qwen/wan2.6-t2v",
        fallbacks: ["qwen/wan2.6-i2v"],
      },
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5.4-mini"],
      },
      params: { cacheRetention: "long" }, // global default provider params
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
      thinkingDefault: "low",
      verboseDefault: "off",
      toolProgressDetail: "explain",
      reasoningDefault: "off",
      elevatedDefault: "on",
      timeoutSeconds: 600,
      mediaMaxMb: 5,
      contextTokens: 200000,
      maxConcurrent: 3,
    },
  },
}
```

- `model` : accepte soit une chaîne (`"provider/model"`) soit un objet (`{ primary, fallbacks }`).
  - Le formulaire chaîne définit uniquement le modèle principal.
  - Le formulaire objet définit le principal plus les modèles de basculement ordonnés.
- `imageModel` : accepte soit une chaîne (`"provider/model"`) soit un objet (`{ primary, fallbacks }`).
  - Utilisé par le chemin d'outil `image` comme configuration de son modèle de vision.
  - Également utilisé comme routage de secours lorsque le modèle sélectionné/par défaut ne peut pas accepter d'entrée image.
  - Privilégiez les références `provider/model` explicites. Les ID bruts sont acceptés pour compatibilité ; si un ID brut correspond de manière unique à une entrée configurée capable d'images dans `models.providers.*.models`, OpenClaw le qualifie pour ce fournisseur. Les correspondances configurées ambiguës nécessitent un préfixe de fournisseur explicite.
- `imageGenerationModel` : accepte soit une chaîne (`"provider/model"`) soit un objet (`{ primary, fallbacks }`).
  - Utilisé par la capacité partagée de génération d'images et toute future surface d'outil/plugin qui génère des images.
  - Valeurs typiques : `google/gemini-3.1-flash-image-preview` pour la génération d'images native Gemini, `fal/fal-ai/flux/dev` pour fal, `openai/gpt-image-2` pour OpenAI Images, ou `openai/gpt-image-1.5` pour une sortie PNG/WebP OpenAI à fond transparent.
  - Si vous sélectionnez directement un fournisseur/modèle, configurez également l'authentification correspondante de ce fournisseur (par exemple `GEMINI_API_KEY` ou `GOOGLE_API_KEY` pour `google/*`, `OPENAI_API_KEY` ou OpenAI Codex OAuth pour `openai/gpt-image-2` / `openai/gpt-image-1.5`, `FAL_KEY` pour `fal/*`).
  - Si omis, `image_generate` peut toujours déduire un fournisseur par défaut basé sur l'authentification. Il essaie d'abord le fournisseur par défaut actuel, puis les fournisseurs de génération d'images restants dans l'ordre des ID de fournisseur.
- `musicGenerationModel` : accepte soit une chaîne (`"provider/model"`) soit un objet (`{ primary, fallbacks }`).
  - Utilisé par la capacité de génération de musique partagée et l'outil intégré `music_generate`.
  - Valeurs typiques : `google/lyria-3-clip-preview`, `google/lyria-3-pro-preview`, ou `minimax/music-2.6`.
  - Si omis, `music_generate` peut toujours déduire un fournisseur par défaut basé sur l'authentification. Il essaie d'abord le fournisseur par défaut actuel, puis les fournisseurs de génération de musique restants dans l'ordre des ID de fournisseur.
  - Si vous sélectionnez directement un provider/model, configurez également l'authentification/la clé API du provider correspondant.
- `videoGenerationModel` : accepte soit une chaîne (`"provider/model"`) soit un objet (`{ primary, fallbacks }`).
  - Utilisé par la capacité de génération vidéo partagée et l'outil intégré `video_generate`.
  - Valeurs typiques : `qwen/wan2.6-t2v`, `qwen/wan2.6-i2v`, `qwen/wan2.6-r2v`, `qwen/wan2.6-r2v-flash`, ou `qwen/wan2.7-r2v`.
  - Si omis, `video_generate` peut toujours déduire un fournisseur par défaut basé sur l'authentification. Il essaie d'abord le fournisseur par défaut actuel, puis les fournisseurs de génération vidéo restants dans l'ordre des ID de fournisseur.
  - Si vous sélectionnez directement un provider/modèle, configurez également la clé d'authentification/API du provider correspondant.
  - Le fournisseur de génération vidéo Qwen inclus prend en charge jusqu'à 1 vidéo de sortie, 1 image d'entrée, 4 vidéos d'entrée, une durée de 10 secondes, et les options de niveau fournisseur `size`, `aspectRatio`, `resolution`, `audio` et `watermark`.
- `pdfModel` : accepte soit une chaîne (`"provider/model"`) soit un objet (`{ primary, fallbacks }`).
  - Utilisé par l'outil `pdf` pour le routage des modèles.
  - Si omis, l'outil PDF revient à `imageModel`, puis au modèle de session/défaut résolu.
- `pdfMaxBytesMb` : limite de taille PDF par défaut pour l'outil `pdf` lorsque `maxBytesMb` n'est pas fourni lors de l'appel.
- `pdfMaxPages` : nombre maximum de pages prises en compte par défaut par le mode de repli d'extraction dans l'outil `pdf`.
- `verboseDefault` : niveau de verbosité par défaut pour les agents. Valeurs : `"off"`, `"on"`, `"full"`. Par défaut : `"off"`.
- `toolProgressDetail` : mode de détail pour les résumés de l'outil `/verbose` et les lignes de l'outil progress-draft. Valeurs : `"explain"` (par défaut, libellés humains compacts) ou `"raw"` (ajouter la commande brute/détail si disponible). Le `agents.list[].toolProgressDetail` par agent remplace cette valeur par défaut.
- `reasoningDefault` : visibilité par défaut du raisonnement pour les agents. Valeurs : `"off"`, `"on"`, `"stream"`. Le `agents.list[].reasoningDefault` par agent remplace cette valeur par défaut. Les valeurs par défaut de raisonnement configurées ne sont appliquées que pour les propriétaires, les expéditeurs autorisés ou les contextes de passerelle opérateur-administrateur lorsqu'aucune substitution de raisonnement par message ou par session n'est définie.
- `elevatedDefault` : niveau de sortie élevée par défaut pour les agents. Valeurs : `"off"`, `"on"`, `"ask"`, `"full"`. Par défaut : `"on"`.
- `model.primary` : format `provider/model` (par ex. `openai/gpt-5.5` pour la clé d'API OpenAIAPI ou l'accès OAuth Codex). Si vous omettez le fournisseur, OpenClaw essaie d'abord un alias, puis une correspondance unique de fournisseur configuré pour cet identifiant de modèle exact, et ne revient ensuite qu'au fournisseur par défaut configuré (comportement de compatibilité obsolète, préférez donc un `provider/model` explicite). Si ce fournisseur n'expose plus le modèle par défaut configuré, OpenClaw revient au premier fournisseur/modèle configuré au lieu d'afficher un défaut obsolète de fournisseur supprimé.
- `models` : le catalogue de modèles configuré et la liste d'autorisation pour `/model`. Chaque entrée peut inclure `alias` (raccourci) et `params` (spécifique au fournisseur, par exemple `temperature`, `maxTokens`, `cacheRetention`, `context1m`, `responsesServerCompaction`, `responsesCompactThreshold`, routage `provider` OpenRouter, `chat_template_kwargs`, `extra_body`/`extraBody`).
  - Utilisez des entrées `provider/*` telles que `"openai-codex/*": {}` ou `"vllm/*": {}` pour afficher tous les modèles découverts pour les fournisseurs sélectionnés sans avoir à lister manuellement chaque identifiant de modèle.
  - Ajoutez `agentRuntime` à une entrée `provider/*` lorsque chaque modèle découvert dynamiquement pour ce fournisseur doit utiliser le même runtime. La stratégie de runtime `provider/model` exacte l'emporte toujours sur le caractère générique.
  - Modifications sûres : utilisez `openclaw config set agents.defaults.models '<json>' --strict-json --merge` pour ajouter des entrées. `config set` refuse les remplacements qui supprimeraient des entrées existantes de la liste d'autorisation, sauf si vous passez `--replace`.
  - Les flux de configuration/intégration (onboarding) limités au fournisseur fusionnent les modèles de fournisseur sélectionnés dans cette carte et préservent les fournisseurs non liés déjà configurés.
  - Pour les modèles OpenAI Responses directs, la compactage côté serveur est activé automatiquement. Utilisez OpenAI`params.responsesServerCompaction: false` pour arrêter d'injecter `context_management`, ou `params.responsesCompactThreshold`OpenAI pour remplacer le seuil. Voir [compactage côté serveur OpenAI](/fr/providers/openai#server-side-compaction-responses-api).
- `params` : paramètres globaux par défaut du provider appliqués à tous les modèles. Défini à `agents.defaults.params` (par ex. `{ cacheRetention: "long" }`).
- Priorité de fusion `params` (config) : `agents.defaults.params` (base globale) est remplacé par `agents.defaults.models["provider/model"].params` (par modèle), puis `agents.list[].params` (id d'agent correspondant) remplace par clé. Voir [Mise en cache du prompt](/fr/reference/prompt-caching) pour les détails.
- `models.providers.openrouter.params.provider`OpenRouterOpenClawOpenRouter : stratégie de routage du provider par défaut à l'échelle d'OpenRouter. OpenClaw transfère ceci vers l'objet de requête `provider` d'OpenRouter ; les paramètres `agents.defaults.models["openrouter/<model>"].params.provider`OpenRouter par modèle et de l'agent remplacent par clé. Voir [routage du provider OpenRouter](/fr/providers/openrouter#advanced-configuration).
- `params.extra_body`/`params.extraBody` : JSON de passage avancé fusionné dans les corps de requête `api: "openai-completions"`OpenAIOpenAI pour les proxys compatibles OpenAI. S'il entre en collision avec les clés de requête générées, le corps supplémentaire l'emporte ; les routes de complétions non natives suppriment toujours les `store` exclusives à OpenAI par la suite.
- `params.chat_template_kwargs` : arguments de modèle de discussion compatibles vLLM/OpenAI fusionnés dans les corps de requête de niveau supérieur `api: "openai-completions"`. Pour les `vllm/nemotron-3-*` avec la réflexion désactivée, le plugin vLLM inclus envoie automatiquement `enable_thinking: false` et `force_nonempty_content: true` ; les `chat_template_kwargs` explicites remplacent les valeurs par défaut générées, et `extra_body.chat_template_kwargs` a toujours la priorité finale. Les modèles de réflexion vLLM Qwen et Nemotron configurés exposent des choix binaires `/think` (`off`, `on`) au lieu de l'échelle d'effort à plusieurs niveaux.
- `compat.thinkingFormat` : style de charge utile de réflexion compatible OpenAI. Utilisez `"together"` pour les `reasoning.enabled` de style Together, `"qwen"` pour les `enable_thinking` de niveau supérieur de style Qwen, ou `"qwen-chat-template"` pour `chat_template_kwargs.enable_thinking` sur les backends de la famille Qwen qui prennent en charge les kwargs de modèle de discussion au niveau de la requête, tels que vLLM. OpenClaw mappe la réflexion désactivée à `false` et la réflexion activée à `true`, et les modèles vLLM Qwen configurés exposent des choix binaires `/think` pour ces formats.
- `compat.supportedReasoningEfforts` : liste d'efforts de raisonnement compatible OpenAI par modèle. Incluez `"xhigh"` pour les points de terminaison personnalisés qui l'acceptent véritablement ; OpenClaw expose alors `/think xhigh` dans les menus de commande, les lignes de session Gateway, la validation des correctifs de session, la validation du CLI de l'agent, et la validation `llm-task` pour ce fournisseur/modèle configuré. Utilisez `compat.reasoningEffortMap` lorsque le backend souhaite une valeur spécifique au fournisseur pour un niveau canonique.
- `params.preserveThinking` : option d'activation réservée à Z.AI pour la préservation de la réflexion. Lorsqu'elle est activée et que la réflexion est activée, OpenClaw envoie `thinking.clear_thinking: false` et rejoue les `reasoning_content` précédents ; voir [Z.AI thinking and preserved thinking](/fr/providers/zai#thinking-and-preserved-thinking).
- `localService` : gestionnaire de processus au niveau du fournisseur optionnel pour les serveurs de modèles locaux/auto-hébergés. Lorsque le modèle sélectionné appartient à ce fournisseur, OpenClaw sonde `healthUrl` (ou `baseUrl + "/models"`), démarre `command` avec `args` si le point de terminaison est hors service, attend jusqu'à `readyTimeoutMs`, puis envoie la demande de modèle. `command` doit être un chemin absolu. `idleStopMs: 0` maintient le processus actif jusqu'à ce que OpenClaw se ferme ; une valeur positive arrête le processus lancé par OpenClaw après ce nombre de millisecondes d'inactivité. Voir [Local model services](/fr/gateway/local-model-services).
- La politique d'exécution appartient aux fournisseurs ou aux modèles, et non à `agents.defaults`. Utilisez `models.providers.<provider>.agentRuntime` pour les règles à l'échelle du fournisseur ou `agents.defaults.models["provider/model"].agentRuntime` / `agents.list[].models["provider/model"].agentRuntime` pour les règles spécifiques au modèle. Les modèles d'agents OpenAI sur le fournisseur officiel OpenAI sélectionnent Codex par défaut.
- Les rédacteurs de configuration qui modifient ces champs (par exemple `/models set`, `/models set-image`, et les commandes d'ajout/suppression de secours) enregistrent le formulaire canonique de l'objet et préservent les listes de secours existantes lorsque cela est possible.
- `maxConcurrent` : nombre maximal d'exécutions d'agents parallèles sur les sessions (chaque session reste sérialisée). Par défaut : 4.

### Stratégie d'exécution

```json5
{
  models: {
    providers: {
      openai: {
        agentRuntime: { id: "codex" },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
      models: {
        "anthropic/claude-opus-4-8": {
          agentRuntime: { id: "claude-cli" },
        },
        "vllm/*": {
          agentRuntime: { id: "openclaw" },
        },
      },
    },
  },
}
```

- `id` : `"auto"`, `"openclaw"`, un identifiant de harnais de plugin enregistré, ou un alias de backend CLI pris en charge. Le plugin Codex intégré enregistre `codex` ; le plugin Anthropic intégré fournit le backend CLI `claude-cli`.
- `id: "auto"` permet aux harnais de plug-ins enregistrés de revendiquer les tours pris en charge et utilise OpenClaw si aucun harnais ne correspond. Un runtime de plug-in explicite tel que `id: "codex"` exige ce harnais et échoue de manière fermée s'il n'est pas disponible ou échoue.
- `id: "pi"` n'est accepté que comme un alias déprécié pour `openclaw` afin de préserver les configurations expédiées des versions v2026.5.22 et antérieures. Les nouvelles configurations devraient utiliser `openclaw`.
- La priorité d'exécution est d'abord la stratégie exacte de modèle (`agents.list[].models["provider/model"]`, `agents.defaults.models["provider/model"]` ou `models.providers.<provider>.models[]`), puis `agents.list[]` / `agents.defaults.models["provider/*"]`, puis la stratégie à l'échelle du fournisseur sur `models.providers.<provider>.agentRuntime`.
- Les clés d'exécution pour l'ensemble de l'agent sont obsolètes. `agents.defaults.agentRuntime`, `agents.list[].agentRuntime`, les épinglages d'exécution de session et `OPENCLAW_AGENT_RUNTIME` sont ignorés par la sélection de l'exécution. Exécutez `openclaw doctor --fix` pour supprimer les valeurs périmées.
- Les modèles d'agent OpenAI utilisent le harnais Codex par défaut ; provider/model `agentRuntime.id: "codex"` reste valide lorsque vous souhaitez le rendre explicite.
- Pour les déploiements Claude CLI, préférez `model: "anthropic/claude-opus-4-8"` plus `agentRuntime.id: "claude-cli"` limité au modèle. Les références de modèle obsolètes `claude-cli/claude-opus-4-7` fonctionnent toujours pour la compatibilité, mais les nouvelles configurations doivent garder la sélection fournisseur/modèle canonique et placer le backend d'exécution dans la stratégie d'exécution fournisseur/modèle.
- Cela ne contrôle que l'exécution du tour de l'agent texte. La génération de médias, la vision, le PDF, la musique, la vidéo et le TTS utilisent toujours leurs paramètres fournisseur/modèle.

**Raccourcis d'alias intégrés** (ne s'appliquent que lorsque le modèle est dans `agents.defaults.models`) :

| Alias               | Modèle                          |
| ------------------- | ------------------------------- |
| `opus`              | `anthropic/claude-opus-4-6`     |
| `sonnet`            | `anthropic/claude-sonnet-4-6`   |
| `gpt`               | `openai/gpt-5.5`                |
| `gpt-mini`          | `openai/gpt-5.4-mini`           |
| `gpt-nano`          | `openai/gpt-5.4-nano`           |
| `gemini`            | `google/gemini-3.1-pro-preview` |
| `gemini-flash`      | `google/gemini-3-flash-preview` |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite`  |

Vos alias configurés priment toujours sur les valeurs par défaut.

Les modèles Z.AI GLM-4.x activent automatiquement le mode réflexion, sauf si vous définissez GLM`--thinking off` ou si vous définissez vous-même `agents.defaults.models["zai/<model>"].params.thinking`.
Les modèles Z.AI activent `tool_stream` par défaut pour le streaming des appels d'outils. Définissez `agents.defaults.models["zai/<model>"].params.tool_stream` sur `false`AnthropicOpenClawAnthropic pour le désactiver.
Anthropic Claude Opus 4.8 garde la réflexion désactivée par défaut dans OpenClaw ; lorsque la réflexion adaptative est explicitement activée, l'effort par défaut du propriétaire du provider d'Anthropic est `high`. Les modèles Claude 4.6 sont par défaut sur `adaptive` lorsqu'aucun niveau de réflexion explicite n'est défini.

### `agents.defaults.cliBackends`

Backends CLI facultatifs pour les exécutions de repli en mode texte uniquement (pas d'appels d'outils). Utile comme sauvegarde lorsque les providers API échouent.

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          modelArg: "--model",
          sessionArg: "--session",
          sessionMode: "existing",
          systemPromptArg: "--system",
          // Or use systemPromptFileArg when the CLI accepts a prompt file flag.
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
        },
      },
    },
  },
}
```

- Les backends CLI sont d'abord textuels ; les outils sont toujours désactivés.
- Sessions prises en charge lorsque `sessionArg` est défini.
- Passage d'image pris en charge lorsque `imageArg` accepte les chemins de fichiers.
- `reseedFromRawTranscriptWhenUncompacted: true`OpenClaw permet à un backend de récupérer des sessions
  invalidées en toute sécurité à partir d'une file de fin de transcription brute OpenClaw bornée avant que
  le premier résumé de compactage n'existe. Les modifications du profil d'authentification ou de l'époque des informations d'identification
  ne permettent jamais le réensemencement brut.

### `agents.defaults.promptOverlays`

Superpositions de prompt indépendantes du fournisseur appliquées par famille de modèles sur les surfaces de prompt assemblées par OpenClaw. Les identifiants de modèles de la famille GPT-5 reçoivent le contrat de comportement partagé sur les routes OpenClaw/fournisseur ; OpenClawOpenClaw`personality`OpenClawOpenClaw contrôle uniquement la couche de style d'interaction conviviale. Les routes du serveur d'application native Codex conservent les instructions de base/modèle détenues par Codex au lieu de cette superposition GPT-5 d'OpenClaw, et OpenClaw désactive la personnalité intégrée de Codex pour les fils natifs.

```json5
{
  agents: {
    defaults: {
      promptOverlays: {
        gpt5: {
          personality: "friendly", // friendly | on | off
        },
      },
    },
  },
}
```

- `"friendly"` (par défaut) et `"on"` activent la couche de style d'interaction conviviale.
- `"off"` désactive uniquement la couche conviviale ; le contrat de comportement GPT-5 balisé reste activé.
- L'ancien `plugins.entries.openai.config.personality` est toujours lu lorsque ce paramètre partagé n'est pas défini.

### `agents.defaults.heartbeat`

Exécutions périodiques du battement de cœur (heartbeat).

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // 0m disables
        model: "openai/gpt-5.4-mini",
        includeReasoning: false,
        includeSystemPromptSection: true, // default: true; false omits the Heartbeat section from the system prompt
        lightContext: false, // default: false; true keeps only HEARTBEAT.md from workspace bootstrap files
        isolatedSession: false, // default: false; true runs each heartbeat in a fresh session (no conversation history)
        skipWhenBusy: false, // default: false; true also waits for this agent's subagent/nested lanes
        session: "main",
        to: "+15555550123",
        directPolicy: "allow", // allow (default) | block
        target: "none", // default: none | options: last | whatsapp | telegram | discord | ...
        prompt: "Read HEARTBEAT.md if it exists...",
        ackMaxChars: 300,
        suppressToolErrorWarnings: false,
        timeoutSeconds: 45,
      },
    },
  },
}
```

- `every` : chaîne de durée (ms/s/m/h). Par défaut : `30m`API (auth par clé API) ou `1h`OAuth (auth OAuth). Définir sur `0m` pour désactiver.
- `includeSystemPromptSection` : lorsque la valeur est false, omet la section Battement de cœur (Heartbeat) du prompt système et ignore l'injection de `HEARTBEAT.md` dans le contexte d'amorçage. Par défaut : `true`.
- `suppressToolErrorWarnings` : lorsque la valeur est true, supprime les charges utiles d'avertissement d'erreur d'outil lors des exécutions du battement de cœur.
- `timeoutSeconds` : temps maximum en secondes autorisé pour un tour d'agent de battement de cœur avant son interruption. Laisser non défini pour utiliser `agents.defaults.timeoutSeconds`.
- `directPolicy` : stratégie de livraison directe/DM. `allow` (par défaut) autorise la livraison à cible directe. `block` supprime la livraison à cible directe et émet `reason=dm-blocked`.
- `lightContext` : lorsque la valeur est true, les exécutions du battement de cœur utilisent un contexte d'amorçage léger et ne conservent que `HEARTBEAT.md` à partir des fichiers d'amorçage de l'espace de travail.
- `isolatedSession` : si défini à true, chaque heartbeat s'exécute dans une nouvelle session sans historique de conversation précédent. Même modèle d'isoisonnement que le cron `sessionTarget: "isolated"`. Réduit le coût en jetons par heartbeat d'environ 100K à 2-5K jetons.
- `skipWhenBusy` : si défini à true, l'exécution des heartbeats est différée sur les voies particulièrement occupées de cet agent : son propre sous-agent avec clé de session ou le travail de commandes imbriqués. Les voies Cron diffèrent toujours les heartbeats, même sans cet indicateur.
- Par agent : définissez `agents.list[].heartbeat`. Lorsqu'un agent définit `heartbeat`, **seuls ces agents** exécutent des heartbeats.
- Les heartbeats exécutent des tours complets d'agent — des intervalles plus courts consomment plus de jetons.

### `agents.defaults.compaction`

```json5
{
  agents: {
    defaults: {
      compaction: {
        mode: "safeguard", // default | safeguard
        provider: "my-provider", // id of a registered compaction provider plugin (optional)
        timeoutSeconds: 900,
        reserveTokensFloor: 24000,
        keepRecentTokens: 50000,
        identifierPolicy: "strict", // strict | off | custom
        identifierInstructions: "Preserve deployment IDs, ticket IDs, and host:port pairs exactly.", // used when identifierPolicy=custom
        qualityGuard: { enabled: true, maxRetries: 1 },
        midTurnPrecheck: { enabled: false }, // optional tool-loop pressure check
        postCompactionSections: ["Session Startup", "Red Lines"], // opt in to AGENTS.md section reinjection
        model: "openrouter/anthropic/claude-sonnet-4-6", // optional compaction-only model override
        truncateAfterCompaction: true, // rotate to a smaller successor JSONL after compaction
        maxActiveTranscriptBytes: "20mb", // optional preflight local compaction trigger
        notifyUser: true, // send brief notices when compaction starts and completes (default: false)
        memoryFlush: {
          enabled: true,
          model: "ollama/qwen3:8b", // optional memory-flush-only model override
          softThresholdTokens: 6000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with the exact silent token NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

- `mode` : `default` ou `safeguard` (résumé par morceaux pour les historiques longs). Voir [Compaction](/fr/concepts/compaction).
- `provider` : identifiant d'un plugin de provider de compaction enregistré. Lorsqu'il est défini, la méthode `summarize()`LLM du provider est appelée au lieu de la résumé intégrée par LLM. Revient à l'intégré en cas d'échec. Définir un provider force `mode: "safeguard"`. Voir [Compaction](/fr/concepts/compaction).
- `timeoutSeconds`OpenClaw : nombre maximum de secondes autorisées pour une opération de compaction unique avant qu'OpenClaw ne l'abandonne. Par défaut : `900`.
- `keepRecentTokens` : budget de point de coupure de l'agent pour conserver la queue de la transcription la plus récente mot pour mot. La `/compact` manuelle respecte cela lorsqu'elle est explicitement définie ; sinon, la compaction manuelle est un point de contrôle strict.
- `identifierPolicy` : `strict` (par défaut), `off`, ou `custom`. `strict` préfixe des directives intégrées de rétention d'identifiants opaques lors du résumé de compaction.
- `identifierInstructions` : texte personnalisé optionnel de préservation d'identifiants utilisé lorsque `identifierPolicy=custom`.
- `qualityGuard` : retry-on-malformed-output vérifie les résumés de protection. Activé par défaut en mode protection ; définissez `enabled: false` pour ignorer l'audit.
- `midTurnPrecheck` : vérification facultative de la pression de la boucle d'outils. Lorsque `enabled: true`OpenClaw, OpenClaw vérifie la pression du contexte après l'ajout des résultats des outils et avant le prochain appel du model. Si le contexte ne tient plus, il abandonne la tentative actuelle avant de soumettre l'invite et réutilise le chemin de récupération de pré-vérification existant pour tronquer les résultats des outils ou compacter et réessayer. Fonctionne avec les modes de compactage `default` et `safeguard`. Par défaut : désactivé.
- `postCompactionSections` : noms de sections H2/H3 optionnels de AGENTS.md à réinjecter après compactage. La réinjection est désactivée si non défini ou défini à `[]`. Définir explicitement `["Session Startup", "Red Lines"]` active cette paire et préserve le repli hérité `Every Session`/`Safety`. Activez ceci uniquement lorsque le contexte supplémentaire vaut le risque de dupliquer les directives du projet déjà capturées dans le résumé de compactage.
- `model` : substitution facultative de `provider/model-id` pour la synthèse de compactage uniquement. Utilisez ceci lorsque la session principale doit conserver un model mais que les résumés de compactage doivent être exécutés sur un autre ; si non défini, le compactage utilise le model principal de la session.
- `maxActiveTranscriptBytes` : seuil d'octets facultatif (`number` ou chaînes comme `"20mb"`) qui déclenche le compactage local normal avant une exécution lorsque le JSONL actif dépasse le seuil. Nécessite `truncateAfterCompaction` pour qu'un compactage réussi puisse faire une rotation vers une transcription successeur plus petite. Désactivé si non défini ou `0`.
- `notifyUser` : lorsque `true`, envoie de brefs avis à l'utilisateur lorsque le compactage commence et lorsqu'il se termine (par exemple, "Compactage du contexte..." et "Compactage terminé"). Désactivé par défaut pour garder le compactage silencieux.
- `memoryFlush` : tour d'agent silencieux avant la compactage automatique pour stocker des mémoires durables. Définissez `model` sur un provider/model exact tel que `ollama/qwen3:8b` lorsque cette tour de maintenance doit rester sur un modèle local ; la substitution n'hérite pas de la chaîne de repli de session active. Ignoré lorsque l'espace de travail est en lecture seule.

### `agents.defaults.runRetries`

Limites des itérations de retry de la boucle d'exécution externe pour le runtime de l'agent intégré afin d'empêcher les boucles d'exécution infinies pendant la récupération des échecs. Notez que ce paramètre s'applique actuellement uniquement au runtime de l'agent intégré, et non aux runtimes ACP ou CLI.

```json5
{
  agents: {
    defaults: {
      runRetries: {
        base: 24,
        perProfile: 8,
        min: 32,
        max: 160,
      },
    },
    list: [
      {
        id: "main",
        runRetries: { max: 50 }, // optional per-agent overrides
      },
    ],
  },
}
```

- `base` : nombre de base d'itérations de retry d'exécution pour la boucle d'exécution externe. Par défaut : `24`.
- `perProfile` : itérations de retry d'exécution supplémentaires accordées par candidat de profil de repli. Par défaut : `8`.
- `min` : limite absolue minimale pour les itérations de retry d'exécution. Par défaut : `32`.
- `max` : limite absolue maximale pour les itérations de retry d'exécution afin d'empêcher une exécution incontrôlée. Par défaut : `160`.

### `agents.defaults.contextPruning`

Supprime les **anciens résultats d'outils** du contexte en mémoire avant l'envoi au LLM. Ne modifie **pas** l'historique de session sur disque.

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl", // off | cache-ttl
        ttl: "1h", // duration (ms/s/m/h), default unit: minutes
        keepLastAssistants: 3,
        softTrimRatio: 0.3,
        hardClearRatio: 0.5,
        minPrunableToolChars: 50000,
        softTrim: { maxChars: 4000, headChars: 1500, tailChars: 1500 },
        hardClear: { enabled: true, placeholder: "[Old tool result content cleared]" },
        tools: { deny: ["browser", "canvas"] },
      },
    },
  },
}
```

<Accordion title="cache-ttl mode behavior">

- `mode: "cache-ttl"` active les passes de nettoyage.
- `ttl` contrôle la fréquence à laquelle le nettoyage peut être exécuté à nouveau (après le dernier accès au cache).
- Le nettoyage effectue d'abord une suppression douce des résultats d'outil trop volumineux, puis efface fermement les résultats d'outil plus anciens si nécessaire.
- `softTrimRatio` et `hardClearRatio` acceptent les valeurs de `0.0` à `1.0` ; la validation de la configuration rejette les valeurs en dehors de cette plage.

**Soft-trim** conserve le début + la fin et insère `...` au milieu.

**Hard-clear** remplace le résultat de l'outil entier par l'espace réservé.

Notes :

- Les blocs d'image ne sont jamais supprimés/effacés.
- Les ratios sont basés sur les caractères (approximatif), et non sur le nombre exact de jetons.
- S'il existe moins de `keepLastAssistants` messages d'assistant, le nettoyage est ignoré.

</Accordion>

Voir [Session Pruning](/fr/concepts/session-pruning) pour les détails sur le comportement.

### Block streaming

```json5
{
  agents: {
    defaults: {
      blockStreamingDefault: "off", // on | off
      blockStreamingBreak: "text_end", // text_end | message_end
      blockStreamingChunk: { minChars: 800, maxChars: 1200 },
      blockStreamingCoalesce: { idleMs: 1000 },
      humanDelay: { mode: "natural" }, // off | natural | custom (use minMs/maxMs)
    },
  },
}
```

- Les canaux non-Telegram nécessitent un `*.blockStreaming: true` explicite pour activer les réponses par blocs.
- Remplacements du canal : `channels.<channel>.blockStreamingCoalesce` (et variantes par compte). Signal/Slack/Discord/Google Chat par défaut `minChars: 1500`.
- `humanDelay` : pause aléatoire entre les réponses par blocs. `natural` = 800–2500ms. Remplacement par agent : `agents.list[].humanDelay`.

Voir [Streaming](/fr/concepts/streaming) pour les détails sur le comportement et le découpage.

### Typing indicators

```json5
{
  agents: {
    defaults: {
      typingMode: "instant", // never | instant | thinking | message
      typingIntervalSeconds: 6,
    },
  },
}
```

- Par défaut : `instant` pour les discussions/mentions directes, `message` pour les discussions de groupe sans mention.
- Remplacements par session : `session.typingMode`, `session.typingIntervalSeconds`.

Voir [Typing Indicators](/fr/concepts/typing-indicators).

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

Sandboxing facultatif pour l'agent intégré. Voir [Sandboxing](/fr/gateway/sandboxing) pour le guide complet.

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main", // off | non-main | all
        backend: "docker", // docker | ssh | openshell
        scope: "agent", // session | agent | shared
        workspaceAccess: "none", // none | ro | rw
        workspaceRoot: "~/.openclaw/sandboxes",
        docker: {
          image: "openclaw-sandbox:bookworm-slim",
          containerPrefix: "openclaw-sbx-",
          workdir: "/workspace",
          readOnlyRoot: true,
          tmpfs: ["/tmp", "/var/tmp", "/run"],
          network: "none",
          user: "1000:1000",
          capDrop: ["ALL"],
          env: { LANG: "C.UTF-8" },
          setupCommand: "apt-get update && apt-get install -y git curl jq",
          pidsLimit: 256,
          memory: "1g",
          memorySwap: "2g",
          cpus: 1,
          ulimits: {
            nofile: { soft: 1024, hard: 2048 },
            nproc: 256,
          },
          seccompProfile: "/path/to/seccomp.json",
          apparmorProfile: "openclaw-sandbox",
          dns: ["1.1.1.1", "8.8.8.8"],
          extraHosts: ["internal.service:10.0.0.5"],
          binds: ["/home/user/source:/source:rw"],
        },
        ssh: {
          target: "user@gateway-host:22",
          command: "ssh",
          workspaceRoot: "/tmp/openclaw-sandboxes",
          strictHostKeyChecking: true,
          updateHostKeys: true,
          identityFile: "~/.ssh/id_ed25519",
          certificateFile: "~/.ssh/id_ed25519-cert.pub",
          knownHostsFile: "~/.ssh/known_hosts",
          // SecretRefs / inline contents also supported:
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
        browser: {
          enabled: false,
          image: "openclaw-sandbox-browser:bookworm-slim",
          network: "openclaw-sandbox-browser",
          cdpPort: 9222,
          cdpSourceRange: "172.21.0.1/32",
          vncPort: 5900,
          noVncPort: 6080,
          headless: false,
          enableNoVnc: true,
          allowHostControl: false,
          autoStart: true,
          autoStartTimeoutMs: 12000,
        },
        prune: {
          idleHours: 24,
          maxAgeDays: 7,
        },
      },
    },
  },
  tools: {
    sandbox: {
      tools: {
        allow: ["exec", "process", "read", "write", "edit", "apply_patch", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
        deny: ["browser", "canvas", "nodes", "cron", "discord", "gateway"],
      },
    },
  },
}
```

<Accordion title="Détails du bac à sable">

**Backend :**

- `docker`Docker : runtime Docker local (par défaut)
- `ssh` : runtime distant générique supporté par SSH
- `openshell` : runtime OpenShell

Lorsque `backend: "openshell"` est sélectionné, les paramètres spécifiques au runtime sont déplacés vers
`plugins.entries.openshell.config`.

**Configuration du backend SSH :**

- `target` : cible SSH sous forme `user@host[:port]`
- `command` : commande client SSH (par défaut : `ssh`)
- `workspaceRoot` : racine distante absolue utilisée pour les espaces de travail par portée
- `identityFile` / `certificateFile` / `knownHostsFile` : fichiers locaux existants transmis à OpenSSH
- `identityData` / `certificateData` / `knownHostsData` : contenus en ligne ou SecretRefs que OpenClaw matérialise dans des fichiers temporaires lors de l'exécution
- `strictHostKeyChecking` / `updateHostKeys` : paramètres de stratégie de clé d'hôte OpenSSH

**Précédence de l'authentification SSH :**

- `identityData` l'emporte sur `identityFile`
- `certificateData` l'emporte sur `certificateFile`
- `knownHostsData` l'emporte sur `knownHostsFile`
- Les valeurs `*Data` basées sur SecretRef sont résolues à partir de l'instantané d'exécution des secrets actifs avant le début de la session de bac à sable

**Comportement du backend SSH :**

- initialise l'espace de travail distant une fois après la création ou la recréation
- maintient ensuite l'espace de travail SSH distant comme source canonique
- achemine `exec`, les outils de fichiers et les chemins multimédias via SSH
- ne synchronise pas automatiquement les modifications distantes vers l'hôte
- ne prend pas en charge les conteneurs de navigateur en bac à sable

**Accès à l'espace de travail :**

- `none` : espace de travail bac à sable par portée sous `~/.openclaw/sandboxes`
- `ro` : espace de travail bac à sable à `/workspace`, espace de travail de l'agent monté en lecture seule à `/agent`
- `rw` : espace de travail de l'agent monté en lecture/écriture à `/workspace`

**Portée :**

- `session` : conteneur + espace de travail par session
- `agent` : un conteneur + espace de travail par agent (par défaut)
- `shared` : conteneur et espace de travail partagés (pas d'isolement inter-session)

**Configuration du plugin OpenShell :**

```json5
{
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          mode: "mirror", // mirror | remote
          from: "openclaw",
          remoteWorkspaceDir: "/sandbox",
          remoteAgentWorkspaceDir: "/agent",
          gateway: "lab", // optional
          gatewayEndpoint: "https://lab.example", // optional
          policy: "strict", // optional OpenShell policy id
          providers: ["openai"], // optional
          autoProviders: true,
          timeoutSeconds: 120,
        },
      },
    },
  },
}
```

**Mode OpenShell :**

- `mirror` : initialiser le distant à partir du local avant l'exécution, synchroniser après l'exécution ; l'espace de travail local reste canonique
- `remote` : initialiser le distant une fois lors de la création du bac à sable, puis maintenir l'espace de travail distant comme canonique

En mode `remote`, les modifications locales sur l'hôte effectuées en dehors de OpenClaw ne sont pas synchronisées automatiquement dans le bac à sable après l'étape d'initialisation.
Le transport est SSH vers le bac à sable OpenShell, mais le plugin possède le cycle de vie du bac à sable et la synchronisation miroir facultative.

**`setupCommand`** s'exécute une fois après la création du conteneur (via `sh -lc`). Nécessite une sortie réseau, une racine inscriptible, l'utilisateur root.

**Les conteneurs sont par défaut en `network: "none"`** — définissez sur `"bridge"` (ou un réseau de pont personnalisé) si l'agent a besoin d'un accès sortant.
`"host"` est bloqué. `"container:<id>"` est bloqué par défaut sauf si vous définissez explicitement
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true` (bris de glace).
Le serveur d'application Codex qui tourne dans un bac à sable OpenClaw actif utilise ce même paramètre de sortie pour leur accès réseau en mode code natif.

**Les pièces jointes entrantes** sont préparées dans `media/inbound/*` dans l'espace de travail actif.

**`docker.binds`** monte des répertoires hôtes supplémentaires ; les liaisons globales et par agent sont fusionnées.

**Navigateur en bac à sable** (`sandbox.browser.enabled`) : Chromium + CDP dans un conteneur. URL noVNC injectée dans le prompt système. Ne nécessite pas `browser.enabled` dans `openclaw.json`.
L'accès observateur noVNC utilise l'authentification VNC par défaut et OpenClaw émet une URL de jeton à courte durée de vie (au lieu d'exposer le mot de passe dans l'URL partagée).

- `allowHostControl: false` (par défaut) empêche les sessions en bac à sable de cibler le navigateur de l'hôte.
- `network` est par défaut sur `openclaw-sandbox-browser` (réseau de pont dédié). Définissez sur `bridge` uniquement lorsque vous souhaitez explicitement une connectivité de pont global.
- `cdpSourceRange` restreint facultativement l'entrée CDP au bord du conteneur à une plage CIDR (par exemple `172.21.0.1/32`).
- `sandbox.browser.binds` monte des répertoires hôtes supplémentaires uniquement dans le conteneur du navigateur en bac à sable. Lorsqu'il est défini (y compris `[]`), il remplace `docker.binds` pour le conteneur du navigateur.
- Les valeurs par défaut de lancement sont définies dans `scripts/sandbox-browser-entrypoint.sh` et réglées pour les hôtes de conteneurs :
  - `--remote-debugging-address=127.0.0.1`
  - `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
  - `--user-data-dir=${HOME}/.chrome`
  - `--no-first-run`
  - `--no-default-browser-check`
  - `--disable-3d-apis`
  - `--disable-gpu`
  - `--disable-software-rasterizer`
  - `--disable-dev-shm-usage`
  - `--disable-background-networking`
  - `--disable-features=TranslateUI`
  - `--disable-breakpad`
  - `--disable-crash-reporter`
  - `--renderer-process-limit=2`
  - `--no-zygote`
  - `--metrics-recording-only`
  - `--disable-extensions` (activé par défaut)
  - `--disable-3d-apis`, `--disable-software-rasterizer` et `--disable-gpu` sont
    activés par défaut et peuvent être désactivés avec
    `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0` si l'utilisation de WebGL/3D l'exige.
  - `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` réactive les extensions si votre workflow
    en dépend.
  - `--renderer-process-limit=2` peut être modifié avec
    `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` ; définissez `0` pour utiliser la limite de processus par défaut de Chromium.
  - plus `--no-sandbox` lorsque `noSandbox` est activé.
  - Les valeurs par défaut constituent la base de l'image du conteneur ; utilisez une image de navigateur personnalisée avec un point d'entrée personnalisé pour modifier les valeurs par défaut du conteneur.

</Accordion>

Le bac à sable (sandboxing) du navigateur et `sandbox.docker.binds` sont réservés à Docker.

Créer les images (à partir d'une récupération des sources) :

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

Pour les installations npm sans récupération des sources, consultez la section [Sandboxing § Images and setup](/fr/gateway/sandboxing#images-and-setup) pour les commandes `docker build` en ligne.

### `agents.list` (remplacements par agent)

Utilisez `agents.list[].tts` pour attribuer à un agent son propre fournisseur TTS, sa voix, son modèle, son style ou son mode TTS automatique. Le bloc de l'agent effectue une fusion profonde (deep-merge) par-dessus les `messages.tts` globaux, ce qui permet aux identifiants partagés de rester en un seul endroit tandis que les agents individuels ne remplacent que les champs de voix ou de fournisseur dont ils ont besoin. Le remplacement de l'agent actif s'applique aux réponses vocales automatiques, à `/tts audio`, à `/tts status` et à l'outil agent `tts`. Consultez la section [Text-to-speech](/fr/tools/tts#per-agent-voice-overrides) pour des exemples de fournisseurs et la priorité.

```json5
{
  agents: {
    list: [
      {
        id: "main",
        default: true,
        name: "Main Agent",
        workspace: "~/.openclaw/workspace",
        agentDir: "~/.openclaw/agents/main/agent",
        model: "anthropic/claude-opus-4-6", // or { primary, fallbacks }
        thinkingDefault: "high", // per-agent thinking level override
        reasoningDefault: "on", // per-agent reasoning visibility override
        fastModeDefault: false, // per-agent fast mode override
        params: { cacheRetention: "none" }, // overrides matching defaults.models params by key
        tts: {
          providers: {
            elevenlabs: { speakerVoiceId: "EXAVITQu4vr4xnSDxMaL" },
          },
        },
        skills: ["docs-search"], // replaces agents.defaults.skills when set
        identity: {
          name: "Samantha",
          theme: "helpful sloth",
          emoji: "🦥",
          avatar: "avatars/samantha.png",
        },
        groupChat: { mentionPatterns: ["@openclaw"] },
        sandbox: { mode: "off" },
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
        subagents: { allowAgents: ["*"] },
        tools: {
          profile: "coding",
          allow: ["browser"],
          deny: ["canvas"],
          elevated: { enabled: true },
        },
      },
    ],
  },
}
```

- `id` : identifiant d'agent stable (requis).
- `default` : lorsque plusieurs sont définis, le premier l'emporte (un avertissement est consigné). Si aucun n'est défini, la première entrée de la liste est celle par défaut.
- `model` : la forme chaîne définit un primaire strict par agent sans repli (fallback) de modèle ; la forme objet `{ primary }` est également stricte à moins que vous n'ajoutiez `fallbacks`. Utilisez `{ primary, fallbacks: [...] }` pour activer le repli pour cet agent, ou `{ primary, fallbacks: [] }` pour rendre le comportement strict explicite. Les tâches cron qui ne remplacent que `primary` héritent toujours des replis par défaut à moins que vous ne définissiez `fallbacks: []`.
- `params` : paramètres de flux par agent fusionnés par-dessus l'entrée de modèle sélectionnée dans `agents.defaults.models`. Utilisez ceci pour des remplacements spécifiques à l'agent comme `cacheRetention`, `temperature` ou `maxTokens` sans dupliquer tout le catalogue de modèles.
- `tts` : substitutions facultatives de synthèse vocale par agent. Le bloc fusionne en profondeur avec `messages.tts`, gardez donc les informations d'identification du fournisseur partagées et la politique de repli dans `messages.tts` et définissez ici uniquement les valeurs spécifiques à la persona telles que le fournisseur, la voix, le model, le style ou le mode automatique.
- `skills` : liste blanche facultative de compétences par agent. Si omis, l'agent hérite de `agents.defaults.skills` lorsqu'il est défini ; une liste explicite remplace les valeurs par défaut au lieu de fusionner, et `[]` signifie aucune compétence.
- `thinkingDefault` : niveau de réflexion par défaut facultatif par agent (`off | minimal | low | medium | high | xhigh | adaptive | max`). Remplace `agents.defaults.thinkingDefault` pour cet agent lorsqu'aucune substitution par message ou session n'est définie. Le profil de fournisseur/model sélectionné contrôle les valeurs valides ; pour Google Gemini, `adaptive` conserve la réflexion dynamique propriétaire du fournisseur (`thinkingLevel` omis sur Gemini 3/3.1, `thinkingBudget: -1` sur Gemini 2.5).
- `reasoningDefault` : visibilité du raisonnement par défaut facultative par agent (`on | off | stream`). Remplace `agents.defaults.reasoningDefault` pour cet agent lorsqu'aucune substitution de raisonnement par message ou session n'est définie.
- `fastModeDefault` : valeur par défaut facultative par agent pour le mode rapide (`true | false`). S'applique lorsqu'aucune substitution de mode rapide par message ou session n'est définie.
- `models` : substitutions facultatives du catalogue/exécution de models par agent, indexées par les ID complets `provider/model`. Utilisez `models["provider/model"].agentRuntime` pour les exceptions d'exécution par agent.
- `runtime` : descripteur d'exécution facultatif par agent. Utilisez `type: "acp"` avec les valeurs par défaut `runtime.acp` (`agent`, `backend`, `mode`, `cwd`) lorsque l'agent doit par défaut utiliser des sessions de harnais ACP.
- `identity.avatar` : chemin relatif à l'espace de travail, URL `http(s)` ou URI `data:`.
- `identity` dérive les valeurs par défaut : `ackReaction` depuis `emoji`, `mentionPatterns` depuis `name`/`emoji`.
- `subagents.allowAgents` : liste d'autorisation des ID d'agents configurés pour les cibles `sessions_spawn.agentId` explicites (`["*"]` = n'importe quelle cible configurée ; par défaut : même agent uniquement). Incluez l'ID du demandeur lorsque les appels `agentId` auto-ciblés doivent être autorisés. Les entrées obsolètes dont la configuration de l'agent a été supprimée sont rejetées par `sessions_spawn` et omises de `agents_list` ; exécutez `openclaw doctor --fix` pour les nettoyer, ou ajoutez une entrée `agents.list[]` minimale si cette cible doit rester générable tout en héritant des valeurs par défaut.
- Garantie d'héritage du bac à sable (Sandbox) : si la session du demandeur est isolée (sandboxed), `sessions_spawn` rejette les cibles qui s'exécuteraient sans isolation.
- `subagents.requireAgentId` : lorsque true, bloque les appels `sessions_spawn` qui omettent `agentId` (force la sélection explicite du profil ; par défaut : false).

---

## Routage multi-agent

Exécutez plusieurs agents isolés dans un seul Gateway. Voir [Multi-Agent](/fr/concepts/multi-agent).

```json5
{
  agents: {
    list: [
      { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
      { id: "work", workspace: "~/.openclaw/workspace-work" },
    ],
  },
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
  ],
}
```

### Champs de correspondance de liaison

- `type` (optionnel) : `route` pour le routage normal (le type manquant par défaut est route), `acp` pour les liaisons de conversation ACP persistantes.
- `match.channel` (requis)
- `match.accountId` (optionnel ; `*` = n'importe quel compte ; omis = compte par défaut)
- `match.peer` (optionnel ; `{ kind: direct|group|channel, id }`)
- `match.guildId` / `match.teamId` (optionnel ; spécifique au canal)
- `acp` (optionnel ; uniquement pour `type: "acp"`) : `{ mode, label, cwd, backend }`

**Ordre de correspondance déterministe :**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId` (exact, sans peer/guild/team)
5. `match.accountId: "*"` (à l'échelle du channel)
6. Agent par défaut

Dans chaque niveau, la première entrée `bindings` correspondante l'emporte.

Pour les entrées `type: "acp"`, OpenClaw résout par identité de conversation exacte (`match.channel` + compte + `match.peer.id`) et n'utilise pas l'ordre des niveaux de liaison de route ci-dessus.

### Profils d'accès par agent

<Accordion title="Accès complet (sans Sandbox)">

```json5
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" },
      },
    ],
  },
}
```

</Accordion>

<Accordion title="Outils en lecture seule + espace de travail">

```json5
{
  agents: {
    list: [
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "ro" },
        tools: {
          allow: ["read", "sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status"],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"],
        },
      },
    ],
  },
}
```

</Accordion>

<Accordion title="Aucun accès au système de fichiers (messagerie uniquement)">

```json5
{
  agents: {
    list: [
      {
        id: "public",
        workspace: "~/.openclaw/workspace-public",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "none" },
        tools: {
          allow: ["sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "session_status", "whatsapp", "telegram", "slack", "discord", "gateway"],
          deny: ["read", "write", "edit", "apply_patch", "exec", "process", "browser", "canvas", "nodes", "cron", "gateway", "image"],
        },
      },
    ],
  },
}
```

</Accordion>

Voir [Multi-Agent Sandbox & Tools](/fr/tools/multi-agent-sandbox-tools) pour les détails de priorité.

---

## Session

```json5
{
  session: {
    scope: "per-sender",
    dmScope: "main", // main | per-peer | per-channel-peer | per-account-channel-peer
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321012345678"],
    },
    reset: {
      mode: "daily", // daily | idle
      atHour: 4,
      idleMinutes: 60,
    },
    resetByType: {
      thread: { mode: "daily", atHour: 4 },
      direct: { mode: "idle", idleMinutes: 240 },
      group: { mode: "idle", idleMinutes: 120 },
    },
    resetTriggers: ["/new", "/reset"],
    store: "~/.openclaw/agents/{agentId}/sessions/sessions.json",
    maintenance: {
      mode: "warn", // warn | enforce
      pruneAfter: "30d",
      maxEntries: 500,
      resetArchiveRetention: "30d", // duration or false
      maxDiskBytes: "500mb", // optional hard budget
      highWaterBytes: "400mb", // optional cleanup target
    },
    threadBindings: {
      enabled: true,
      idleHours: 24, // default inactivity auto-unfocus in hours (`0` disables)
      maxAgeHours: 0, // default hard max age in hours (`0` disables)
    },
    mainKey: "main", // legacy (runtime always uses "main")
    agentToAgent: { maxPingPongTurns: 5 },
    sendPolicy: {
      rules: [{ action: "deny", match: { channel: "discord", chatType: "group" } }],
      default: "allow",
    },
  },
}
```

<Accordion title="Détails des champs de session">

- **`scope`** : stratégie de groupement de session de base pour les contextes de chat de groupe.
  - `per-sender` (par défaut) : chaque expéditeur obtient une session isolée dans un contexte de channel.
  - `global` : tous les participants d'un contexte de channel partagent une seule session (à utiliser uniquement lorsque le contexte partagé est intentionnel).
- **`dmScope`** : mode de groupement des DMs.
  - `main` : tous les DMs partagent la session principale.
  - `per-peer` : isolation par ID d'expéditeur sur tous les channels.
  - `per-channel-peer` : isolation par channel + expéditeur (recommandé pour les boîtes de réception multi-utilisateurs).
  - `per-account-channel-peer` : isolation par compte + channel + expéditeur (recommandé pour les multi-comptes).
- **`identityLinks`** : mappe les ID canoniques aux pairs préfixés par le provider pour le partage de session entre channels. Les commandes d'amarrage telles que `/dock_discord` utilisent la même map pour basculer l'itinéraire de réponse de la session active vers un autre pair de channel lié ; voir [Channel docking](/fr/concepts/channel-docking).
- **`reset`** : politique de réinitialisation principale. `daily` réinitialise à `atHour` heure locale ; `idle` réinitialise après `idleMinutes`. Si les deux sont configurés, la première expiration l'emporte. La fraîcheur de la réinitialisation quotidienne utilise `sessionStartedAt` de la ligne de session ; la fraîcheur de la réinitialisation inactive utilise `lastInteractionAt`. Les écritures d'événements en arrière-plan/système telles que le heartbeat, les réveils cron, les notifications exec et la gestion de la passerelle peuvent mettre à jour `updatedAt`, mais elles ne gardent pas les sessions quotidiennes/inactives fraîches.
- **`resetByType`** : substitutions par type (`direct`, `group`, `thread`). L'ancien `dm` accepté comme alias pour `direct`.
- **`mainKey`** : champ hérité. Le runtime utilise toujours `"main"` pour le compartiment de chat direct principal.
- **`agentToAgent.maxPingPongTurns`** : nombre maximum de tours de réponse entre agents lors des échanges agent-à-agent (entier, plage : `0`-`20`, par défaut : `5`). `0` désactive le chaînage ping-pong.
- **`sendPolicy`** : correspondance par `channel`, `chatType` (`direct|group|channel`, avec l'ancien alias `dm`), `keyPrefix`, ou `rawKeyPrefix`. Le premier refus l'emporte.
- **`maintenance`** : contrôles de nettoyage et de rétention du magasin de sessions.
  - `mode` : `warn` émet uniquement des avertissements ; `enforce` applique le nettoyage.
  - `pruneAfter` : limite d'âge pour les entrées obsolètes (par défaut `30d`).
  - `maxEntries` : nombre maximum d'entrées dans `sessions.json` (par défaut `500`). Les écritures du runtime traitent le nettoyage par lots avec un petit tampon de niveau haut pour les limites de taille de production ; `openclaw sessions cleanup --enforce` applique la limite immédiatement.
  - `rotateBytes` : déconseillé et ignoré ; `openclaw doctor --fix` le supprime des anciennes configurations.
  - `resetArchiveRetention` : rétention pour les archives de transcription `*.reset.<timestamp>`. Par défaut à `pruneAfter` ; définissez `false` pour désactiver.
  - `maxDiskBytes` : budget disque optionnel pour le répertoire des sessions. En mode `warn`, il enregistre des avertissements ; en mode `enforce`, il supprime d'abord les artefacts/sessions les plus anciens.
  - `highWaterBytes` : cible optionnelle après le nettoyage du budget. Par défaut à `80%` de `maxDiskBytes`.
- **`threadBindings`** : valeurs globales par défaut pour les fonctionnalités de session liées aux fils.
  - `enabled` : interrupteur principal par défaut (les providers peuvent substituer ; Discord utilise `channels.discord.threadBindings.enabled`)
  - `idleHours` : désactivation automatique par inactivité par défaut en heures (`0` désactive ; les providers peuvent substituer)
  - `maxAgeHours` : âge maximum dur par défaut en heures (`0` désactive ; les providers peuvent substituer)
  - `spawnSessions` : porte par défaut pour créer des sessions de travail liées aux fils à partir de `sessions_spawn` et des créations de fils ACP. Par défaut à `true` lorsque les liaisons de fils sont activées ; les providers/comptes peuvent substituer.
  - `defaultSpawnContext` : contexte de sous-agent natif par défaut pour les créations liées aux fils (`"fork"` ou `"isolated"`). Par défaut à `"fork"`.

</Accordion>

---

## Messages

```json5
{
  messages: {
    responsePrefix: "🦞", // or "auto"
    ackReaction: "👀",
    ackReactionScope: "group-mentions", // group-mentions | group-all | direct | all
    removeAckAfterReply: false,
    queue: {
      mode: "followup", // steer | followup | collect | interrupt
      debounceMs: 500,
      cap: 20,
      drop: "summarize", // old | new | summarize
      byChannel: {
        whatsapp: "followup",
        telegram: "followup",
      },
    },
    inbound: {
      debounceMs: 2000, // 0 disables
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
      },
    },
  },
}
```

### Préfixe de réponse

Remplacements par canal/compte : `channels.<channel>.responsePrefix`, `channels.<channel>.accounts.<id>.responsePrefix`.

Résolution (le plus spécifique l'emporte) : compte → canal → global. `""` désactive et arrête la cascade. `"auto"` dérive de `[{identity.name}]`.

**Variables du modèle :**

| Variable          | Description                  | Exemple                     |
| ----------------- | ---------------------------- | --------------------------- |
| `{model}`         | Nom court du model           | `claude-opus-4-6`           |
| `{modelFull}`     | Identifiant complet du model | `anthropic/claude-opus-4-6` |
| `{provider}`      | Nom du fournisseur           | `anthropic`                 |
| `{thinkingLevel}` | Niveau de réflexion actuel   | `high`, `low`, `off`        |
| `{identity.name}` | Nom d'identité de l'agent    | (identique à `"auto"`)      |

Les variables ne sont pas sensibles à la casse. `{think}` est un alias pour `{thinkingLevel}`.

### Réaction d'accusé de réception

- Par défaut, utilise le `identity.emoji` de l'agent actif, sinon `"👀"`. Définissez `""` pour désactiver.
- Remplacements par canal : `channels.<channel>.ackReaction`, `channels.<channel>.accounts.<id>.ackReaction`.
- Ordre de résolution : compte → canal → `messages.ackReaction` → repli de l'identité.
- Portée : `group-mentions` (par défaut), `group-all`, `direct`, `all`.
- `removeAckAfterReply` : supprime l'accusé de réception après la réponse sur les canaux prenant en charge les réactions, tels que Slack, Discord, Telegram, WhatsApp et iMessage.
- `messages.statusReactions.enabled` : active les réactions de statut de cycle de vie sur Slack, Discord, Telegram et WhatsApp.
  Sur Slack et Discord, si la valeur n'est pas définie, les réactions de statut restent activées lorsque les réactions d'accusé de réception sont actives.
  Sur Telegram et WhatsApp, définissez-la explicitement sur `true` pour activer les réactions de statut de cycle de vie.
- `messages.statusReactions.emojis` : remplace les clés d'emoji de cycle de vie :
  `queued`, `thinking`, `compacting`, `tool`, `coding`, `web`, `deploy`, `build`,
  `concierge`, `done`, `error`, `stallSoft` et `stallHard`.
  Telegram n'autorise qu'un ensemble de réactions fixe, donc les emoji configurés non pris en charge reviennent
  à la variante de statut prise en charge la plus proche pour ce chat.

### Anti-rebond entrant

Regroupe les messages texte rapides provenant du même expéditeur en un seul tour d'agent. Les médias/pièces jointes sont envoyés immédiatement. Les commandes de contrôle contournent l'anti-rebond.

### TTS (synthèse vocale)

```json5
{
  messages: {
    tts: {
      auto: "always", // off | always | inbound | tagged
      mode: "final", // final | all
      provider: "elevenlabs",
      summaryModel: "openai/gpt-5.4-mini",
      modelOverrides: { enabled: true },
      maxTextLength: 4000,
      timeoutMs: 30000,
      prefsPath: "~/.openclaw/settings/tts.json",
      providers: {
        elevenlabs: {
          apiKey: "elevenlabs_api_key",
          baseUrl: "https://api.elevenlabs.io",
          speakerVoiceId: "voice_id",
          modelId: "eleven_multilingual_v2",
          seed: 42,
          applyTextNormalization: "auto",
          languageCode: "en",
          voiceSettings: {
            stability: 0.5,
            similarityBoost: 0.75,
            style: 0.0,
            useSpeakerBoost: true,
            speed: 1.0,
          },
        },
        microsoft: {
          speakerVoice: "en-US-AvaMultilingualNeural",
          lang: "en-US",
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        },
        openai: {
          apiKey: "openai_api_key",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o-mini-tts",
          speakerVoice: "alloy",
        },
      },
    },
  },
}
```

- `auto` contrôle le mode de TTS automatique par défaut : `off`, `always`, `inbound` ou `tagged`. `/tts on|off` peut remplacer les préférences locales, et `/tts status` affiche l'état effectif.
- `summaryModel` remplace `agents.defaults.model.primary` pour le résumé automatique.
- `modelOverrides` est activé par défaut ; `modelOverrides.allowProvider` est par défaut défini sur `false` (opt-in).
- Les clés API reviennent à `ELEVENLABS_API_KEY`/`XI_API_KEY` et `OPENAI_API_KEY`.
- Les fournisseurs de synthèse vocale fournis appartiennent aux plugins. Si `plugins.allow` est défini, incluez chaque plugin de fournisseur TTS que vous souhaitez utiliser, par exemple `microsoft` pour Edge TTS. L'identifiant de fournisseur `edge` obsolète est accepté comme un alias pour `microsoft`.
- `providers.openai.baseUrl` remplace le point de terminaison TTS OpenAI. L'ordre de résolution est la configuration, puis `OPENAI_TTS_BASE_URL`, puis `https://api.openai.com/v1`.
- Lorsque `providers.openai.baseUrl` pointe vers un point de terminaison autre que OpenAI, OpenClaw le traite comme un serveur TTS compatible avec OpenAI et assouplit la validation du modèle/de la voix.

---

## Talk

Valeurs par défaut pour le mode Talk (macOS/iOS/Android).

```json5
{
  talk: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        speakerVoiceId: "elevenlabs_voice_id",
        voiceAliases: {
          Clawd: "EXAVITQu4vr4xnSDxMaL",
          Roger: "CwhRBWXzGAHq8TQ4Fs17",
        },
        modelId: "eleven_v3",
        outputFormat: "mp3_44100_128",
        apiKey: "elevenlabs_api_key",
      },
      mlx: {
        modelId: "mlx-community/Soprano-80M-bf16",
      },
      system: {},
    },
    consultThinkingLevel: "low",
    consultFastMode: true,
    speechLocale: "ru-RU",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
    realtime: {
      provider: "openai",
      providers: {
        openai: {
          model: "gpt-realtime-2",
          speakerVoice: "cedar",
        },
      },
      instructions: "Speak warmly and keep answers brief.",
      mode: "realtime",
      transport: "webrtc",
      brain: "agent-consult",
    },
  },
}
```

- `talk.provider` doit correspondre à une clé dans `talk.providers` lorsque plusieurs fournisseurs Talk sont configurés.
- Les plates clés Talk obsolètes (`talk.voiceId`, `talk.voiceAliases`, `talk.modelId`, `talk.outputFormat`, `talk.apiKey`) ne sont là que pour la compatibilité. Exécutez `openclaw doctor --fix` pour réécrire la configuration persistante dans `talk.providers.<provider>`.
- Les IDs de voix reviennent à `ELEVENLABS_VOICE_ID` ou `SAG_VOICE_ID`.
- `providers.*.apiKey` accepte des chaînes en texte clair ou des objets SecretRef.
- Le repli `ELEVENLABS_API_KEY` ne s'applique que lorsque aucune clé d'API Talk n'est configurée.
- `providers.*.voiceAliases` permet aux directives Talk d'utiliser des noms conviviaux.
- `providers.mlx.modelId` sélectionne le dépôt Hugging Face utilisé par l'assistant MLX local macOS. S'il est omis, macOS utilise `mlx-community/Soprano-80M-bf16`.
- La lecture MLX macOS passe par l'assistant `openclaw-mlx-tts` fourni lorsqu'il est présent, ou par un exécutable sur `PATH` ; `OPENCLAW_MLX_TTS_BIN` remplace le chemin de l'assistant pour le développement.
- `consultThinkingLevel`OpenClaw contrôle le niveau de réflexion pour l'exécution complète de l'agent OpenClaw derrière les appels en temps réel de l'interface de contrôle Talk `openclaw_agent_consult`. Laisser non défini pour préserver le comportement normal de la session/model.
- `consultFastMode` définit une substitution ponctuelle en mode rapide pour les consultations en temps réel de l'interface de contrôle Talk sans modifier le paramètre normal de mode rapide de la session.
- `speechLocale`iOSmacOS définit l'identifiant de locale BCP 47 utilisé par la reconnaissance vocale Talk d'iOS/macOS. Laisser non défini pour utiliser la valeur par défaut de l'appareil.
- `silenceTimeoutMs` contrôle la durée d'attente du mode Talk après le silence de l'utilisateur avant d'envoyer la transcription. Non défini garde la fenêtre de pause par défaut de la plateforme (`700 ms on macOS and Android, 900 ms on iOS`).
- `realtime.instructions`OpenClaw ajoute des instructions système orientées provider au prompt temps réel intégré d'OpenClaw, afin que le style vocal puisse être configuré sans perdre les directives par défaut `openclaw_agent_consult`.
- `realtime.consultRouting`Gateway contrôle le relais de secours du Gateway lorsque le provider temps réel produit une transcription utilisateur finale sans `openclaw_agent_consult` : `provider-direct` préserve les réponses directes du provider, tandis que `force-agent-consult`OpenClaw achemine la demande finalisée via OpenClaw.

---

## Connexes

- [Référence de configuration](/fr/gateway/configuration-reference) — toutes les autres clés de configuration
- [Configuration](/fr/gateway/configuration) — tâches courantes et configuration rapide
- [Exemples de configuration](/fr/gateway/configuration-examples)
