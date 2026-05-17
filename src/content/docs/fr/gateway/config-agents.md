---
summary: "Agent defaults, multi-agent routing, session, messages, and talk config"
read_when:
  - Tuning agent defaults (models, thinking, workspace, heartbeat, media, skills)
  - Configuring multi-agent routing and bindings
  - Adjusting session, message delivery, and talk-mode behavior
title: "Configuration — agents"
---

Clés de configuration de portée d'agent sous `agents.*`, `multiAgent.*`, `session.*`, `messages.*` et `talk.*`. Pour les canaux, les outils, le runtime de la passerelle et d'autres clés de niveau supérieur, consultez [Référence de configuration](/fr/gateway/configuration-reference).

## Agent defaults

### `agents.defaults.workspace`

Par défaut : `~/.openclaw/workspace`.

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

### `agents.defaults.repoRoot`

Optional repository root shown in the system prompt's Runtime line. If unset, OpenClaw auto-detects by walking upward from the workspace.

```json5
{
  agents: { defaults: { repoRoot: "~/Projects/openclaw" } },
}
```

### `agents.defaults.skills`

Liste blanche de compétences par défaut facultative pour les agents qui ne définissent pas
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

- Omettez `agents.defaults.skills` pour des compétences non restreintes par défaut.
- Omettez `agents.list[].skills` pour hériter des valeurs par défaut.
- Définissez `agents.list[].skills: []` pour aucune compétence.
- Une liste `agents.list[].skills` non vide est l'ensemble final pour cet agent ; elle
  ne fusionne pas avec les valeurs par défaut.

### `agents.defaults.skipBootstrap`

Désactive la création automatique des fichiers d'amorçage de l'espace de travail (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`).

```json5
{
  agents: { defaults: { skipBootstrap: true } },
}
```

### `agents.defaults.skipOptionalBootstrapFiles`

Ignore la création de fichiers facultatifs sélectionnés de l'espace de travail tout en écrivant toujours les fichiers d'amorçage requis. Valeurs valides : `SOUL.md`, `USER.md`, `HEARTBEAT.md` et `IDENTITY.md`.

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

Contrôle quand les fichiers d'amorçage de l'espace de travail sont injectés dans le prompt système. Par défaut : `"always"`.

- `"continuation-skip"` : les tours de continuation sûrs (après une réponse complète de l'assistant) ignorent la réinjection de l'amorçage de l'espace de travail, réduisant la taille du prompt. Les exécutions de heartbeat et les tentatives post-compaction reconstruisent toujours le contexte.
- `"never"` : désactive l'amorçage de l'espace de travail et l'injection de fichiers de contexte à chaque tour. À utiliser uniquement pour les agents qui gèrent entièrement leur cycle de vie de prompt (moteurs de contexte personnalisés, runtimes natifs qui construisent leur propre contexte, ou workflows spécialisés sans amorçage). Les tours de battement de cœur et de récupération après compactage ignorent également l'injection.

```json5
{
  agents: { defaults: { contextInjection: "continuation-skip" } },
}
```

### `agents.defaults.bootstrapMaxChars`

Nombre maximal de caractères par fichier d'amorçage de l'espace de travail avant troncature. Par défaut : `12000`.

```json5
{
  agents: { defaults: { bootstrapMaxChars: 12000 } },
}
```

### `agents.defaults.bootstrapTotalMaxChars`

Nombre total maximal de caractères injectés dans tous les fichiers d'amorçage de l'espace de travail. Par défaut : `60000`.

```json5
{
  agents: { defaults: { bootstrapTotalMaxChars: 60000 } },
}
```

### `agents.defaults.bootstrapPromptTruncationWarning`

Contrôle l'avis système visible par l'agent lorsque le contexte d'amorçage est tronqué.
Par défaut : `"once"`.

- `"off"` : n'injecte jamais le texte d'avis de troncature dans le prompt système.
- `"once"` : injecte un avis concis une fois par signature de troncature unique (recommandé).
- `"always"` : injecte un avis concis à chaque exécution lorsqu'une troncature existe.

Les comptes bruts/injectés détaillés et les champs de réglage de configuration restent dans les diagnostics tels que les rapports de contexte/état et les journaux ; le contexte utilisateur/runtime WebChat de routine ne reçoit que l'avis de récupération concis.

```json5
{
  agents: { defaults: { bootstrapPromptTruncationWarning: "once" } }, // off | once | always
}
```

### Carte de propriété du budget de contexte

OpenClaw possède plusieurs budgets de prompt/contexte à fort volume et ils sont intentionnellement divisés par sous-système au lieu de tous passer par un seul bouton générique.

- `agents.defaults.bootstrapMaxChars` /
  `agents.defaults.bootstrapTotalMaxChars` :
  injection d'amorçage normal de l'espace de travail.
- `agents.defaults.startupContext.*` :
  prélude unique à l'exécution du modèle de réinitialisation/démarrage, incluant les fichiers
  quotidiens récents `memory/*.md`. Les commandes nues de chat `/new` et `/reset` sont
  acquittées sans invoquer le modèle.
- `skills.limits.*` :
  la liste compacte des compétences injectée dans le prompt système.
- `agents.defaults.contextLimits.*` :
  extraits de runtime bornés et blocs possédés par le runtime injectés.
- `memory.qmd.limits.*` :
  extrait de recherche de mémoire indexé et dimensionnement de l'injection.

Utilisez la priorité par agent correspondante uniquement lorsqu'un seul agent a besoin d'un budget différent :

- `agents.list[].skillsLimits.maxSkillsPromptChars`
- `agents.list[].contextLimits.*`

#### `agents.defaults.startupContext`

Contrôle le prélude de démarrage du premier tour injecté lors des exécutions de modèle de réinitialisation/démarrage.
Les commandes de chat nu `/new` et `/reset` accusent réception de la réinitialisation sans invoquer
le modèle, elles ne chargent donc pas ce prélude.

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
        toolResultMaxChars: 16000,
        postCompactionMaxChars: 1800,
      },
    },
  },
}
```

- `memoryGetMaxChars` : plafond d'extrait `memory_get` par défaut avant que les
  métadonnées de troncation et l'avis de continuation ne soient ajoutés.
- `memoryGetDefaultLines` : fenêtre de lignes `memory_get` par défaut lorsque `lines` est
  omis.
- `toolResultMaxChars` : plafond dynamique de résultats d'outils utilisé pour les résultats persistants et
  la récupération de dépassement.
- `postCompactionMaxChars` : plafond d'extrait AGENTS.md utilisé lors de l'injection de rafraîchissement
  post-compaction.

#### `agents.list[].contextLimits`

Priorité par agent pour les paramètres partagés `contextLimits`. Les champs omis héritent
de `agents.defaults.contextLimits`.

```json5
{
  agents: {
    defaults: {
      contextLimits: {
        memoryGetMaxChars: 12000,
        toolResultMaxChars: 16000,
      },
    },
    list: [
      {
        id: "tiny-local",
        contextLimits: {
          memoryGetMaxChars: 6000,
          toolResultMaxChars: 8000,
        },
      },
    ],
  },
}
```

#### `skills.limits.maxSkillsPromptChars`

Plafond global pour la liste compacte de compétences injectée dans le système de prompt. Cela
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

Priorité par agent pour le budget de prompt des compétences.

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

Taille maximale en pixels pour le côté le plus long de l'image dans les blocs d'image de transcription/outils avant les appels au fournisseur.
Par défaut : `1200`.

Des valeurs plus faibles réduisent généralement l'utilisation des jetons de vision et la taille de la charge utile de requête pour les exécutions avec de nombreuses captures d'écran.
Des valeurs plus élevées préservent plus de détails visuels.

```json5
{
  agents: { defaults: { imageMaxDimensionPx: 1200 } },
}
```

### `agents.defaults.userTimezone`

Fuseau horaire pour le contexte du système de prompt (pas les horodatages des messages). Revient au fuseau horaire de l'hôte.

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

### `agents.defaults.timeFormat`

Format de l'heure dans le système de prompt. Par défaut : `auto` (préférence du système d'exploitation).

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
  - Le formulaire chaîne ne définit que le modèle principal.
  - Le formulaire objet définit le modèle principal ainsi que les modèles de basculement ordonnés.
- `imageModel` : accepte soit une chaîne (`"provider/model"`) soit un objet (`{ primary, fallbacks }`).
  - Utilisé par le chemin d'outil `image` comme configuration de modèle de vision.
  - Également utilisé comme routage de secours lorsque le modèle sélectionné/par défaut ne peut pas accepter d'entrée d'image.
  - Privilégiez les références `provider/model` explicites. Les ID nus sont acceptés pour compatibilité ; si un ID nu correspond de manière unique à une entrée configurée capable d'images dans `models.providers.*.models`OpenClaw, OpenClaw le qualifie pour ce fournisseur. Les correspondances configurées ambiguës nécessitent un préfixe de fournisseur explicite.
- `imageGenerationModel` : accepte soit une chaîne (`"provider/model"`) soit un objet (`{ primary, fallbacks }`).
  - Utilisé par la capacité de génération d'images partagée et toute future surface d'outil/plugin qui génère des images.
  - Valeurs typiques : `google/gemini-3.1-flash-image-preview` pour la génération d'images native Gemini, `fal/fal-ai/flux/dev` pour fal, `openai/gpt-image-2`OpenAI pour les images OpenAI, ou `openai/gpt-image-1.5`OpenAI pour la sortie PNG/WebP OpenAI avec fond transparent.
  - Si vous sélectionnez un fournisseur/modèle directement, configurez également l'authentification du fournisseur correspondante (par exemple `GEMINI_API_KEY` ou `GOOGLE_API_KEY` pour `google/*`, `OPENAI_API_KEY`OpenAIOAuth ou OpenAI Codex OAuth pour `openai/gpt-image-2` / `openai/gpt-image-1.5`, `FAL_KEY` pour `fal/*`).
  - Si omis, `image_generate` peut tout de même déduire une valeur par défaut de fournisseur avec authentification. Il essaie d'abord le fournisseur par défaut actuel, puis les fournisseurs de génération d'images enregistrés restants dans l'ordre des ID de fournisseur.
- `musicGenerationModel` : accepte soit une chaîne (`"provider/model"`) soit un objet (`{ primary, fallbacks }`).
  - Utilisé par la capacité de génération de musique partagée et l'outil intégré `music_generate`.
  - Valeurs typiques : `google/lyria-3-clip-preview`, `google/lyria-3-pro-preview` ou `minimax/music-2.6`.
  - Si omis, `music_generate` peut toujours déduire un provider par défaut avec auth. Il essaie d'abord le provider par défaut actuel, puis les providers de génération de musique enregistrés restants par ordre d'ID de provider.
  - Si vous sélectionnez directement un provider/modèle, configurez également la clé d'auth/API du provider correspondant.
- `videoGenerationModel` : accepte soit une chaîne (`"provider/model"`) soit un objet (`{ primary, fallbacks }`).
  - Utilisé par la capacité partagée de génération vidéo et l'outil `video_generate` intégré.
  - Valeurs typiques : `qwen/wan2.6-t2v`, `qwen/wan2.6-i2v`, `qwen/wan2.6-r2v`, `qwen/wan2.6-r2v-flash` ou `qwen/wan2.7-r2v`.
  - Si omis, `video_generate` peut toujours déduire un provider par défaut avec auth. Il essaie d'abord le provider par défaut actuel, puis les providers de génération vidéo enregistrés restants par ordre d'ID de provider.
  - Si vous sélectionnez directement un provider/modèle, configurez également la clé d'auth/API du provider correspondant.
  - Le provider de génération vidéo Qwen groupé prend en charge jusqu'à 1 vidéo de sortie, 1 image d'entrée, 4 vidéos d'entrée, 10 secondes de durée, et les options au niveau du provider `size`, `aspectRatio`, `resolution`, `audio` et `watermark`.
- `pdfModel` : accepte soit une chaîne (`"provider/model"`) soit un objet (`{ primary, fallbacks }`).
  - Utilisé par l'outil `pdf` pour le routage de modèle.
  - Si omis, l'outil PDF revient à `imageModel`, puis au modèle de session/défaut résolu.
- `pdfMaxBytesMb` : limite de taille PDF par défaut pour l'outil `pdf` lorsque `maxBytesMb` n'est pas passé au moment de l'appel.
- `pdfMaxPages` : nombre maximum de pages par défaut considérées par le mode de secours d'extraction dans l'outil `pdf`.
- `verboseDefault` : niveau de verbosité par défaut pour les agents. Valeurs : `"off"` , `"on"` , `"full"` . Valeur par défaut : `"off"` .
- `toolProgressDetail` : mode de détail pour les résumés des `/verbose` et les lignes de progression des outils. Valeurs : `"explain"` (par défaut, étiquettes humaines compactes) ou `"raw"` (ajouter la commande brute/détail si disponible). Le `agents.list[].toolProgressDetail` par agent remplace cette valeur par défaut.
- `reasoningDefault` : visibilité par défaut du raisonnement pour les agents. Valeurs : `"off"` , `"on"` , `"stream"` . Le `agents.list[].reasoningDefault` par agent remplace cette valeur par défaut. Les valeurs par défaut de raisonnement configurées ne sont appliquées que pour les propriétaires, les expéditeurs autorisés ou les contextes de passerelle opérateur-administrateur lorsqu'aucune substitution de raisonnement par message ou session n'est définie.
- `elevatedDefault` : niveau de sortie élevée par défaut pour les agents. Valeurs : `"off"` , `"on"` , `"ask"` , `"full"` . Valeur par défaut : `"on"` .
- `model.primary` : formater `provider/model` (par exemple `openai/gpt-5.5`OpenAIAPIOAuthOpenClaw pour la clé d'API OpenAI ou l'accès OAuth Codex). Si vous omettez le fournisseur, OpenClaw essaie d'abord un alias, puis une correspondance unique de fournisseur configuré pour cet identifiant de modèle exact, et ne revient ensuite qu'au fournisseur par défaut configuré (comportement de compatibilité obsolète, il est donc préférable de spécifier explicitement `provider/model`OpenClaw). Si ce fournisseur n'expose plus le modèle par défaut configuré, OpenClaw revient au premier fournisseur/modèle configuré au lieu d'afficher une valeur par défaut obsolète d'un fournisseur supprimé.
- `models` : le catalogue de models configuré et la liste d'autorisation pour `/model`. Chaque entrée peut inclure `alias` (raccourci) et `params` (spécifique au provider, par exemple `temperature`, `maxTokens`, `cacheRetention`, `context1m`, `responsesServerCompaction`, `responsesCompactThreshold`, `chat_template_kwargs`, `extra_body`/`extraBody`).
  - Utilisez des entrées `provider/*` telles que `"openai-codex/*": {}` ou `"vllm/*": {}` pour afficher tous les models découverts pour les providers sélectionnés sans avoir à lister manuellement chaque id de model.
  - Modifications sûres : utilisez `openclaw config set agents.defaults.models '<json>' --strict-json --merge` pour ajouter des entrées. `config set` refuse les remplacements qui supprimeraient des entrées existantes de la liste d'autorisation, sauf si vous passez `--replace`.
  - Les flux de configuration/onboarding délimités par provider fusionnent les models de provider sélectionnés dans cette map et préservent les providers non liés déjà configurés.
  - Pour les modèles OpenAI Responses directs, la compactage côté serveur est activé automatiquement. Utilisez `params.responsesServerCompaction: false` pour arrêter d'injecter `context_management`, ou `params.responsesCompactThreshold` pour modifier le seuil. Consultez [Compactage côté serveur OpenAI](/fr/providers/openai#server-side-compaction-responses-api).
- `params` : paramètres globaux par défaut du provider appliqués à tous les models. Défini à `agents.defaults.params` (ex. `{ cacheRetention: "long" }`).
- Priorité de fusion `params` (configuration) : `agents.defaults.params` (base globale) est remplacé par `agents.defaults.models["provider/model"].params` (par modèle), puis `agents.list[].params` (id d'agent correspondant) remplace par clé. Consultez [Mise en cache des invites (Prompt Caching)](/fr/reference/prompt-caching) pour plus de détails.
- `params.extra_body`/`params.extraBody` : JSON de passage avancé fusionné dans les corps de requête `api: "openai-completions"`OpenAIOpenAI pour les proxys compatibles OpenAI. S'il entre en collision avec les clés de requête générées, le corps supplémentaire l'emporte ; les routes de complétion non natives suppriment toujours les `store` propres à OpenAI par la suite.
- `params.chat_template_kwargs`OpenAI : arguments de modèle de chat (chat-template) compatibles vLLM/OpenAI fusionnés dans les corps de requête `api: "openai-completions"` de premier niveau. Pour `vllm/nemotron-3-*` avec la réflexion désactivée, le plugin vLLM inclus envoie automatiquement `enable_thinking: false` et `force_nonempty_content: true` ; les `chat_template_kwargs` explicites remplacent les valeurs par défaut générées, et `extra_body.chat_template_kwargs`Qwen a toujours la priorité finale. Pour les contrôles de réflexion vLLM Qwen, définissez `params.qwenThinkingFormat` sur `"chat-template"` ou `"top-level"` dans cette entrée de modèle.
- `compat.thinkingFormat`OpenAI : style de charge utile de réflexion compatible OpenAI. Utilisez `"qwen"`Qwen pour `enable_thinking` de premier niveau style Qwen, ou `"qwen-chat-template"` pour `chat_template_kwargs.enable_thinking`QwenOpenClaw sur les backends de la famille Qwen qui prennent en charge les kwargs de modèle de chat au niveau de la requête, tels que vLLM. OpenClaw mappe la réflexion désactivée à `false` et la réflexion activée à `true`.
- `compat.supportedReasoningEfforts` : liste des efforts de raisonnement compatible OpenAI par modèle. Incluez `"xhigh"` pour les points de terminaison personnalisés qui l'acceptent réellement ; OpenClaw expose alors `/think xhigh` dans les menus de commandes, les lignes de session Gateway, la validation des correctifs de session, la validation de l'CLI de l'agent et la validation `llm-task` pour ce fournisseur/modèle configuré. Utilisez `compat.reasoningEffortMap` lorsque le backend souhaite une valeur spécifique au fournisseur pour un niveau canonique.
- `params.preserveThinking` : option d'adhésion exclusive à Z.AI pour la réflexion préservée. Lorsqu'elle est activée et que la réflexion est activée, OpenClaw envoie `thinking.clear_thinking: false` et rejoue la `reasoning_content` précédente ; consultez [Réflexion Z.AI et réflexion préservée](/fr/providers/zai#thinking-and-preserved-thinking).
- `localService` : gestionnaire de processus au niveau du fournisseur facultatif pour les serveurs de modèles locaux/auto-hébergés. Lorsque le modèle sélectionné appartient à ce fournisseur, OpenClaw sonde `healthUrl` (ou `baseUrl + "/models"`), démarre `command` avec `args` si le point de terminaison est hors service, attend jusqu'à `readyTimeoutMs`, puis envoie la demande de modèle. `command` doit être un chemin absolu. `idleStopMs: 0` garde le processus en vie jusqu'à ce que OpenClaw se termine ; une valeur positive arrête le processus généré par OpenClaw après ce nombre de millisecondes d'inactivité. Consultez [Services de modèles locaux](/fr/gateway/local-model-services).
- La stratégie d'exécution appartient aux providers ou aux modèles, et non à `agents.defaults`. Utilisez `models.providers.<provider>.agentRuntime` pour les règles au niveau du provider ou `agents.defaults.models["provider/model"].agentRuntime` / `agents.list[].models["provider/model"].agentRuntime` pour les règles spécifiques au modèle. Les modèles d'agent OpenAI sur le provider OpenAI officiel sélectionnent Codex par défaut.
- Les rédacteurs de configuration qui modifient ces champs (par exemple `/models set`, `/models set-image`, et les commandes d'ajout/suppression de fallback) enregistrent la forme canonique de l'objet et préservent les listes de fallback existantes lorsque cela est possible.
- `maxConcurrent` : max d'exécutions d'agent parallèles sur les sessions (chaque session reste sérialisée). Par défaut : 4.

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
        "anthropic/claude-opus-4-7": {
          agentRuntime: { id: "claude-cli" },
        },
      },
    },
  },
}
```

- `id` : `"auto"`, `"pi"`, un id de harnais de plugin enregistré, ou un alias de backend CLI pris en charge. Le plugin Codex inclus enregistre `codex` ; le plugin Anthropic inclus fournit le backend CLI `claude-cli`.
- `id: "auto"` permet aux harnais de plugin enregistrés de revendiquer les tours pris en charge et utilise PI si aucun harnais ne correspond. Un runtime de plugin explicite tel que `id: "codex"` nécessite ce harnais et échoue fermement s'il est indisponible ou en cas d'échec.
- Les clés de runtime pour l'agent entier sont obsolètes. `agents.defaults.agentRuntime`, `agents.list[].agentRuntime`, les épinglages de runtime de session et `OPENCLAW_AGENT_RUNTIME` sont ignorés par la sélection du runtime. Exécutez `openclaw doctor --fix` pour supprimer les valeurs périmées.
- Les modèles d'agent OpenAI utilisent le harnais Codex par défaut ; le provider/modèle `agentRuntime.id: "codex"` reste valide lorsque vous souhaitez le rendre explicite.
- Pour les déploiements CLI Claude, préférez `model: "anthropic/claude-opus-4-7"` plus `agentRuntime.id: "claude-cli"` limité au modèle. Les références de modèle `claude-cli/claude-opus-4-7` obsolètes fonctionnent toujours pour la compatibilité, mais la nouvelle configuration doit garder la sélection du provider/modèle canonique et placer le backend d'exécution dans la stratégie d'exécution du provider/modèle.
- Cela ne contrôle que l'exécution des tours d'agent texte. La génération de médias, la vision, les PDF, la musique, la vidéo et le TTS utilisent toujours leurs paramètres de fournisseur/modèle.

**Raccourcis d'alias intégrés** (ne s'appliquent que lorsque le modèle est dans `agents.defaults.models`) :

| Alias               | Modèle                                 |
| ------------------- | -------------------------------------- |
| `opus`              | `anthropic/claude-opus-4-6`            |
| `sonnet`            | `anthropic/claude-sonnet-4-6`          |
| `gpt`               | `openai/gpt-5.5`                       |
| `gpt-mini`          | `openai/gpt-5.4-mini`                  |
| `gpt-nano`          | `openai/gpt-5.4-nano`                  |
| `gemini`            | `google/gemini-3.1-pro-preview`        |
| `gemini-flash`      | `google/gemini-3-flash-preview`        |
| `gemini-flash-lite` | `google/gemini-3.1-flash-lite-preview` |

Vos alias configurés priment toujours sur les valeurs par défaut.

Les modèles GLM-4.x de Z.AI activent automatiquement le mode réflexion, sauf si vous définissez `--thinking off` ou si vous définissez vous-même `agents.defaults.models["zai/<model>"].params.thinking`.
Les modèles Z.AI activent `tool_stream` par défaut pour le streaming des appels d'outils. Définissez `agents.defaults.models["zai/<model>"].params.tool_stream` sur `false` pour le désactiver.
Les modèles Claude 4.6 d'Anthropic utilisent par défaut la réflexion `adaptive` lorsqu'aucun niveau de réflexion explicite n'est défini.

### `agents.defaults.cliBackends`

Backends CLI optionnels pour les exécutions de repli en texte uniquement (pas d'appels d'outils). Utile comme sauvegarde lorsque les fournisseurs API échouent.

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "codex-cli": {
          command: "/opt/homebrew/bin/codex",
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

- Les backends CLI sont prioritairement textuels ; les outils sont toujours désactivés.
- Sessions prises en charge lorsque `sessionArg` est défini.
- Passage d'image pris en charge lorsque `imageArg` accepte les chemins de fichiers.
- `reseedFromRawTranscriptWhenUncompacted: true` permet à un backend de récupérer des sessions
  invalidées en toute sécurité à partir d'une fin limitée de transcription brute OpenClaw avant que
  le premier résumé de compactage n'existe. Les changements de profil d'authentification ou d'époque des informations d'identification
  ne réinitialisent jamais brutalement.

### `agents.defaults.systemPromptOverride`

Remplacez l'invite système entière assemblée par OpenClaw par une chaîne fixe. Définissez au niveau par défaut (`agents.defaults.systemPromptOverride`) ou par agent (`agents.list[].systemPromptOverride`). Les valeurs par agent prévalent ; une valeur vide ou composée uniquement d'espaces est ignorée. Utile pour des expériences d'invite contrôlées.

```json5
{
  agents: {
    defaults: {
      systemPromptOverride: "You are a helpful assistant.",
    },
  },
}
```

### `agents.defaults.promptOverlays`

Superpositions d'invite indépendantes du fournisseur appliquées par famille de modèles. Les identifiants de modèles de la famille GPT-5 reçoivent le contrat de comportement partagé entre les fournisseurs ; `personality` contrôle uniquement la couche de style d'interaction convivial.

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

- `"friendly"` (par défaut) et `"on"` activent la couche de style d'interaction convivial.
- `"off"` désactive uniquement la couche conviviale ; le contrat de comportement GPT-5 balisé reste activé.
- L'ancien `plugins.entries.openai.config.personality` est toujours lu lorsque ce paramètre partagé n'est pas défini.

### `agents.defaults.heartbeat`

Exécutions périodiques du heartbeat.

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
        skipWhenBusy: false, // default: false; true also waits for subagent/nested lanes
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

- `every` : chaîne de durée (ms/s/m/h). Par défaut : `30m` (auth par clé API) ou `1h` (auth OAuth). Définissez sur `0m` pour désactiver.
- `includeSystemPromptSection` : si faux, omet la section Heartbeat de l'invite système et ignore l'injection de `HEARTBEAT.md` dans le contexte d'amorçage. Par défaut : `true`.
- `suppressToolErrorWarnings` : si vrai, supprime les charges utiles d'avertissement d'erreur d'outil lors des exécutions du heartbeat.
- `timeoutSeconds` : temps maximum en secondes autorisé pour un tour d'agent heartbeat avant son abandon. Laissez non défini pour utiliser `agents.defaults.timeoutSeconds`.
- `directPolicy` : politique de livraison directe/DM. `allow` (par défaut) permet la livraison à cible directe. `block` supprime la livraison à cible directe et émet `reason=dm-blocked`.
- `lightContext` : si vrai, les exécutions du heartbeat utilisent un contexte d'amorçage léger et ne conservent que `HEARTBEAT.md` des fichiers d'amorçage de l'espace de travail.
- `isolatedSession` : lorsqu'il est défini sur true, chaque heartbeat s'exécute dans une nouvelle session sans historique de conversation antérieur. Même modèle d'isoisonnement que cron `sessionTarget: "isolated"`. Réduit le coût en jetons par heartbeat d'environ 100K à environ 2-5K jetons.
- `skipWhenBusy` : lorsqu'il est défini sur true, l'exécution des heartbeats est différée sur les voies particulièrement occupées : travail de sous-agent ou commande imbriquée. Les voies Cron diffèrent toujours les heartbeats, même sans cet indicateur.
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
        midTurnPrecheck: { enabled: false }, // optional Pi tool-loop pressure check
        postCompactionSections: ["Session Startup", "Red Lines"], // [] disables reinjection
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

- `mode` : `default` ou `safeguard` (résumé par blocs pour les historiques longs). Voir [Compaction](/fr/concepts/compaction).
- `provider` : id d'un plugin provider de compaction enregistré. Lorsqu'il est défini, le `summarize()` du provider est appelé au lieu de la résumé intégré du LLM. Retourne à la version intégrée en cas d'échec. Définir un provider force `mode: "safeguard"`. Voir [Compaction](/fr/concepts/compaction).
- `timeoutSeconds` : nombre maximum de secondes autorisées pour une seule opération de compaction avant que OpenClaw ne l'abandonne. Par défaut : `900`.
- `keepRecentTokens` : budget de point de coupure Pi pour conserver la fin de la transcription la plus récente mot pour mot. La `/compact` manuelle respecte cela lorsqu'elle est explicitement définie ; sinon la compaction manuelle est un point de contrôle strict (hard checkpoint).
- `identifierPolicy` : `strict` (par défaut), `off`, ou `custom`. `strict` préfixe les directives intégrées de conservation des identifiants opaques lors du résumé de compaction.
- `identifierInstructions` : texte personnalisé optionnel de préservation des identifiants utilisé lorsque `identifierPolicy=custom`.
- `qualityGuard` : retry-on-malformed-output vérifie les résumés de protection. Activé par défaut en mode protection ; définissez `enabled: false` pour ignorer l'audit.
- `midTurnPrecheck` : vérification de pression facultative de la boucle d'outils Pi. Quand `enabled: true`OpenClaw, OpenClaw vérifie la pression du contexte après l'ajout des résultats des outils et avant le prochain appel de model. Si le contexte ne tient plus, il abandonne la tentative actuelle avant de soumettre le prompt et réutilise le chemin de récupération de prévérification existant pour tronquer les résultats des outils ou compacter et réessayer. Fonctionne avec les modes de compactage `default` et `safeguard`. Par défaut : désactivé.
- `postCompactionSections` : noms de sections H2/H3 optionnels de AGENTS.md à réinjecter après compactage. Par défaut `["Session Startup", "Red Lines"]` ; définissez `[]` pour désactiver la réinjection. Lorsqu'il n'est pas défini ou défini explicitement à cette paire par défaut, les anciens en-têtes `Every Session`/`Safety` sont également acceptés comme solution de repli héritée.
- `model` : substitution facultative de `provider/model-id` pour la résumé de compactage uniquement. Utilisez ceci lorsque la session principale doit conserver un model mais que les résumés de compactage doivent s'exécuter sur un autre ; lorsqu'il n'est pas défini, le compactage utilise le model principal de la session.
- `maxActiveTranscriptBytes` : seuil d'octets facultatif (`number` ou chaînes comme `"20mb"`) qui déclenche le compactage local normal avant une exécution lorsque le JSONL actuel dépasse le seuil. Nécessite `truncateAfterCompaction` pour qu'un compactage réussi puisse passer à une transcription successeur plus petite. Désactivé si non défini ou `0`.
- `notifyUser` : quand `true`, envoie de brefs avis à l'utilisateur lorsque le compactage commence et lorsqu'il se termine (par exemple, « Compactage du contexte... » et « Compactage terminé »). Désactivé par défaut pour garder le compactage silencieux.
- `memoryFlush` : tour agentique silencieux avant la compactage automatique pour stocker des souvenirs durables. Définissez `model` sur un fournisseur/modèle exact tel que `ollama/qwen3:8b` lorsque ce tour de maintenance doit rester sur un modèle local ; le remplacement n'hérite pas de la chaîne de repli de session active. Ignoré lorsque l'espace de travail est en lecture seule.

### `agents.defaults.contextPruning`

Supprime les **anciens résultats d'outils** du contexte en mémoire avant d'envoyer au LLM. Ne modifie **pas** l'historique de session sur le disque.

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
- `ttl` contrôle la fréquence à laquelle le nettoyage peut être réexécuté (après le dernier accès au cache).
- Le nettoyage effectue d'abord une réduction souple des résultats d'outils trop volumineux, puis efface fermement les anciens résultats d'outils si nécessaire.

**Soft-trim** (réduction souple) conserve le début + la fin et insère `...` au milieu.

**Hard-clear** (effacement ferme) remplace le résultat de l'outil entier par l'espace réservé.

Notes :

- Les blocs d'image ne sont jamais réduits/effacés.
- Les ratios sont basés sur les caractères (approximatif), et non sur le nombre exact de jetons.
- S'il existe moins de `keepLastAssistants` messages d'assistant, le nettoyage est ignoré.

</Accordion>

Consultez [Session Pruning](/fr/concepts/session-pruning) pour les détails du comportement.

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

- Les canaux non-Telegram nécessitent un `*.blockStreaming: true` explicite pour activer les réponses par bloc.
- Remplacements de canal : `channels.<channel>.blockStreamingCoalesce` (et variantes par compte). Signal/Slack/Discord/Google Chat par défaut `minChars: 1500`.
- `humanDelay` : pause aléatoire entre les réponses par bloc. `natural` = 800–2500ms. Remplacement par agent : `agents.list[].humanDelay`.

Consultez [Streaming](/fr/concepts/streaming) pour le comportement + les détails du découpage.

### Indicateurs de frappe

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

- Par défaut : `instant` pour les discussions directes/mentions, `message` pour les discussions de groupe non mentionnées.
- Remplacements par session : `session.typingMode`, `session.typingIntervalSeconds`.

Voir [Indicateurs de frappe](/fr/concepts/typing-indicators).

<a id="agentsdefaultssandbox"></a>

### `agents.defaults.sandbox`

Sandboxing facultatif pour l'agent intégré. Consultez le guide complet sur le [Sandboxing](/fr/gateway/sandboxing).

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
- `ssh` : runtime distant basé sur SSH générique
- `openshell` : runtime OpenShell

Lorsque `backend: "openshell"` est sélectionné, les paramètres spécifiques au runtime sont déplacés vers
`plugins.entries.openshell.config`.

**Configuration du backend SSH :**

- `target` : cible SSH sous forme `user@host[:port]`
- `command` : commande client SSH (par défaut : `ssh`)
- `workspaceRoot` : racine distante absolue utilisée pour les espaces de travail par portée
- `identityFile` / `certificateFile` / `knownHostsFile` : fichiers locaux existants transmis à OpenSSH
- `identityData` / `certificateData` / `knownHostsData`OpenClaw : contenus en ligne ou SecretRefs qu'OpenClaw matérialise dans des fichiers temporaires au runtime
- `strictHostKeyChecking` / `updateHostKeys` : paramètres de stratégie de clé d'hôte OpenSSH

**Priorité d'authentification SSH :**

- `identityData` l'emporte sur `identityFile`
- `certificateData` l'emporte sur `certificateFile`
- `knownHostsData` l'emporte sur `knownHostsFile`
- Les valeurs `*Data` basées sur SecretRef sont résolues à partir de l'instantané runtime des secrets actifs avant le début de la session de bac à sable

**Comportement du backend SSH :**

- initialise l'espace de travail distant une seule fois après la création ou la recréation
- maintient ensuite l'espace de travail SSH distant comme canonique
- achemine `exec`, les outils de fichiers et les chemins multimédias via SSH
- ne synchronise pas automatiquement les modifications distantes vers l'hôte
- ne prend pas en charge les conteneurs de navigateur bac à sable

**Accès à l'espace de travail :**

- `none` : espace de travail bac à sable par portée sous `~/.openclaw/sandboxes`
- `ro` : espace de travail bac à sable à `/workspace`, espace de travail de l'agent monté en lecture seule à `/agent`
- `rw` : espace de travail de l'agent monté en lecture/écriture à `/workspace`

**Portée :**

- `session` : conteneur + espace de travail par session
- `agent` : un conteneur + espace de travail par agent (par défaut)
- `shared` : conteneur et espace de travail partagés (pas d'isolation inter-session)

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

- `mirror` : initialiser le distant à partir du local avant l'exécution, synchroniser vers le local après l'exécution ; l'espace de travail local reste canonique
- `remote` : initialiser le distant une seule fois lors de la création du bac à sable, puis maintenir l'espace de travail distant comme canonique

En mode `remote`OpenClaw, les modifications locales effectuées en dehors d'OpenClaw ne sont pas synchronisées dans le bac à sable automatiquement après l'étape d'initialisation.
Le transport est SSH vers le bac à sable OpenShell, mais le plugin gère le cycle de vie du bac à sable et la synchronisation miroir facultative.

**`setupCommand`** s'exécute une seule fois après la création du conteneur (via `sh -lc`). Nécessite un accès réseau sortant, une racine inscriptible et l'utilisateur root.

**Les conteneurs sont par défaut sur `network: "none"`** — définissez sur `"bridge"` (ou un réseau de pont personnalisé) si l'agent a besoin d'un accès sortant.
`"host"` est bloqué. `"container:<id>"` est bloqué par défaut, sauf si vous définissez explicitement
`sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true` (bris de glace).

**Les pièces jointes entrantes** sont transférées vers `media/inbound/*` dans l'espace de travail actif.

**`docker.binds`** monte des répertoires d'hôte supplémentaires ; les liaisons globales et par agent sont fusionnées.

**Navigateur bac à sable** (`sandbox.browser.enabled`) : Chromium + CDP dans un conteneur. URL noVNC injectée dans l'invite système. Ne nécessite pas `browser.enabled` dans `openclaw.json`OpenClaw.
L'accès observateur noVNC utilise l'authentification VNC par défaut et OpenClaw émet une URL de jeton à courte durée de vie (au lieu d'exposer le mot de passe dans l'URL partagée).

- `allowHostControl: false` (par défaut) empêche les sessions bac à sable de cibler le navigateur de l'hôte.
- `network` est par défaut sur `openclaw-sandbox-browser` (réseau de pont dédié). Définissez sur `bridge` uniquement lorsque vous souhaitez explicitement une connectivité de pont global.
- `cdpSourceRange` restreint facultativement l'ingress CDP au niveau du bord du conteneur à une plage CIDR (par exemple `172.21.0.1/32`).
- `sandbox.browser.binds` monte des répertoires d'hôte supplémentaires uniquement dans le conteneur du navigateur bac à sable. Lorsqu'il est défini (y compris `[]`), il remplace `docker.binds` pour le conteneur du navigateur.
- Les paramètres de lancement par défaut sont définis dans `scripts/sandbox-browser-entrypoint.sh` et ajustés pour les hôtes de conteneurs :
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

Le sandboxing du navigateur et `sandbox.docker.binds` sont réservés à Docker.

Créer les images (à partir d'une checkout des sources) :

```bash
scripts/sandbox-setup.sh           # main sandbox image
scripts/sandbox-browser-setup.sh   # optional browser image
```

Pour les installations npm sans checkout des sources, voir [Sandboxing § Images and setup](/fr/gateway/sandboxing#images-and-setup) pour les commandes `docker build` en ligne.

### `agents.list` (remplacements par agent)

Utilisez `agents.list[].tts` pour donner à un agent son propre fournisseur TTS, sa voix, son modèle, son style ou son mode auto-TTS. Le bloc d'agent fusionne en profondeur (deep-merge) avec `messages.tts` global, de sorte que les identifiants partagés peuvent rester au même endroit pendant que les agents individuels ne remplacent que les champs de voix ou de fournisseur dont ils ont besoin. Le remplacement de l'agent actif s'applique aux réponses vocales automatiques, `/tts audio`, `/tts status`, et à l'outil d'agent `tts`. Voir [Text-to-speech](/fr/tools/tts#per-agent-voice-overrides) pour des exemples de fournisseurs et la priorité.

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
            elevenlabs: { voiceId: "EXAVITQu4vr4xnSDxMaL" },
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

- `id` : identifiant stable de l'agent (requis).
- `default` : lorsque plusieurs sont définis, le premier gagne (avertissement enregistré). Si aucun n'est défini, la première entrée de la liste est celle par défaut.
- `model` : la forme chaîne définit un primaire strict par agent sans repli (fallback) de modèle ; la forme objet `{ primary }` est également stricte sauf si vous ajoutez `fallbacks`. Utilisez `{ primary, fallbacks: [...] }` pour activer le repli pour cet agent, ou `{ primary, fallbacks: [] }` pour rendre le comportement strict explicite. Les tâches Cron qui ne remplacent que `primary` héritent toujours des replis par défaut sauf si vous définissez `fallbacks: []`.
- `params` : paramètres de flux par agent fusionnés par-dessus l'entrée de modèle sélectionnée dans `agents.defaults.models`. Utilisez ceci pour des remplacements spécifiques à l'agent comme `cacheRetention`, `temperature`, ou `maxTokens` sans dupliquer tout le catalogue de modèles.
- `tts` : substitutions de synthèse vocale facultatives par agent. Le bloc fusionne en profondeur avec `messages.tts`, conservez donc les identifiants partagés du fournisseur et la politique de repli dans `messages.tts` et définissez ici uniquement les valeurs spécifiques à la personnalité telles que le fournisseur, la voix, le modèle, le style ou le mode automatique.
- `skills` : liste d'autorisation de compétences facultative par agent. Si omis, l'agent hérite de `agents.defaults.skills` lorsqu'elle est définie ; une liste explicite remplace les valeurs par défaut au lieu de fusionner, et `[]` signifie aucune compétence.
- `thinkingDefault` : niveau de réflexion par défaut facultatif par agent (`off | minimal | low | medium | high | xhigh | adaptive | max`). Remplace `agents.defaults.thinkingDefault` pour cet agent lorsqu'aucune substitution par message ou par session n'est définie. Le profil de fournisseur/modèle sélectionné contrôle les valeurs valides ; pour Google Gemini, `adaptive` conserve la réflexion dynamique propriétaire du fournisseur (`thinkingLevel` omis sur Gemini 3/3.1, `thinkingBudget: -1` sur Gemini 2.5).
- `reasoningDefault` : visibilité du raisonnement par défaut facultative par agent (`on | off | stream`). Remplace `agents.defaults.reasoningDefault` pour cet agent lorsqu'aucune substitution de raisonnement par message ou par session n'est définie.
- `fastModeDefault` : valeur par défaut facultative par agent pour le mode rapide (`true | false`). S'applique lorsqu'aucune substitution de mode rapide par message ou par session n'est définie.
- `models` : substitutions de catalogue/exécution de modèles facultatives par agent, indexées par les ID complets `provider/model`. Utilisez `models["provider/model"].agentRuntime` pour les exceptions d'exécution par agent.
- `runtime` : descripteur d'exécution facultatif par agent. Utilisez `type: "acp"` avec les valeurs par défaut `runtime.acp` (`agent`, `backend`, `mode`, `cwd`) lorsque l'agent doit par défaut utiliser des sessions ACP harness.
- `identity.avatar` : chemin relatif à l'espace de travail, URL `http(s)` ou URI `data:`.
- `identity` dérive les valeurs par défaut : `ackReaction` depuis `emoji`, `mentionPatterns` depuis `name`/`emoji`.
- `subagents.allowAgents` : liste d'autorisation des identifiants d'agents pour les cibles `sessions_spawn.agentId` explicites (`["*"]` = n'importe quel ; par défaut : même agent uniquement). Incluez l'identifiant du demandeur lorsque les appels `agentId` auto-ciblés doivent être autorisés.
- Garde d'héritage de Sandbox : si la session du demandeur est en mode sandbox, `sessions_spawn` rejette les cibles qui s'exécuteraient sans sandbox.
- `subagents.requireAgentId` : si true, bloque les appels `sessions_spawn` qui omettent `agentId` (force la sélection explicite du profil ; par défaut : false).

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

### Champs de correspondance des liaisons

- `type` (facultatif) : `route` pour le routage normal (le type manquant par défaut est route), `acp` pour les liaisons de conversation ACP persistantes.
- `match.channel` (requis)
- `match.accountId` (facultatif ; `*` = n'importe quel compte ; omis = compte par défaut)
- `match.peer` (facultatif ; `{ kind: direct|group|channel, id }`)
- `match.guildId` / `match.teamId` (facultatif ; spécifique au channel)
- `acp` (facultatif ; uniquement pour `type: "acp"`) : `{ mode, label, cwd, backend }`

**Ordre de correspondance déterministe :**

1. `match.peer`
2. `match.guildId`
3. `match.teamId`
4. `match.accountId` (exact, sans peer/guild/team)
5. `match.accountId: "*"` (à l'échelle du channel)
6. Agent par défaut

Dans chaque niveau, la première entrée `bindings` correspondante gagne.

Pour les entrées `type: "acp"`OpenClaw, OpenClaw résout par l'identité exacte de la conversation (`match.channel` + compte + `match.peer.id`) et n'utilise pas l'ordre des niveaux de liaison de routage ci-dessus.

### Profils d'accès par agent

<Accordion title="Accès complet (pas de Sandbox)">

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

<Accordion title="Détails du champ Session">

- **`scope`** : stratégie de regroupement de sessions de base pour les contextes de chat de groupe.
  - `per-sender` (par défaut) : chaque expéditeur obtient une session isolée dans un contexte de channel.
  - `global` : tous les participants dans un contexte de channel partagent une seule session (à utiliser uniquement lorsque le contexte partagé est prévu).
- **`dmScope`** : mode de regroupement des DMs.
  - `main` : tous les DMs partagent la session principale.
  - `per-peer` : isoler par identifiant d'expéditeur sur tous les channels.
  - `per-channel-peer` : isoler par channel + expéditeur (recommandé pour les boîtes de réception multi-utilisateurs).
  - `per-account-channel-peer` : isoler par compte + channel + expéditeur (recommandé pour le multi-compte).
- **`identityLinks`** : mappe les identifiants canoniques aux pairs préfixés par le provider pour le partage de sessions entre channels. Les commandes d'amarrage telles que `/dock_discord` utilisent la même map pour basculer l'itinéraire de réponse de la session active vers un autre pair de channel lié ; voir [Channel docking](/fr/concepts/channel-docking).
- **`reset`** : politique de réinitialisation principale. `daily` réinitialise à l'heure locale `atHour` ; `idle` réinitialise après `idleMinutes`. Lorsque les deux sont configurés, la première expiration l'emporte. La fraîcheur de la réinitialisation quotidienne utilise `sessionStartedAt` de la ligne de session ; la fraîcheur de la réinitialisation inactive utilise `lastInteractionAt`. Les écritures en arrière-plan/d'événements système telles que le heartbeat, les réveils cron, les notifications d'exécution et la tenue de livres de la passerelle peuvent mettre à jour `updatedAt`, mais elles ne gardent pas les sessions quotidiennes/inactives fraîches.
- **`resetByType`** : substitutions par type (`direct`, `group`, `thread`). L'ancien `dm` accepté comme alias pour `direct`.
- **`mainKey`** : champ hérité. Le runtime utilise toujours `"main"` pour le compartiment de chat direct principal.
- **`agentToAgent.maxPingPongTurns`** : nombre maximum de tours de réponse entre les agents lors des échanges agent-à-agent (entier, plage : `0`-`20`, par défaut : `5`). `0` désactive le chaînage ping-pong.
- **`sendPolicy`** : correspondance par `channel`, `chatType` (`direct|group|channel`, avec l'ancien alias `dm`), `keyPrefix` ou `rawKeyPrefix`. Le premier refus l'emporte.
- **`maintenance`** : contrôles de nettoyage et de rétention du magasin de sessions.
  - `mode` : `warn` émet uniquement des avertissements ; `enforce` applique le nettoyage.
  - `pruneAfter` : limite d'âge pour les entrées obsolètes (par défaut `30d`).
  - `maxEntries` : nombre maximum d'entrées dans `sessions.json` (par défaut `500`). Les écritures du runtime effectuent un nettoyage par lot avec un petit tampon de niveau haut pour les limites de taille de production ; `openclaw sessions cleanup --enforce` applique la limite immédiatement.
  - `rotateBytes` : déconseillé et ignoré ; `openclaw doctor --fix` le supprime des anciennes configurations.
  - `resetArchiveRetention` : rétention pour les archives de transcriptions `*.reset.<timestamp>`. Par défaut, `pruneAfter` ; définissez `false` pour désactiver.
  - `maxDiskBytes` : budget disque optionnel pour le répertoire des sessions. En mode `warn`, il enregistre des avertissements ; en mode `enforce`, il supprime d'abord les artefacts/sessions les plus anciens.
  - `highWaterBytes` : cible optionnelle après le nettoyage du budget. Par défaut, `80%` de `maxDiskBytes`.
- **`threadBindings`** : valeurs par défaut globales pour les fonctionnalités de session liées aux fils de discussion.
  - `enabled` : commutateur principal par défaut (les providers peuvent remplacer ; Discord utilise `channels.discord.threadBindings.enabled`)
  - `idleHours` : désactivation automatique par inactivité par défaut en heures (`0` désactive ; les providers peuvent remplacer)
  - `maxAgeHours` : âge maximum dur par défaut en heures (`0` désactive ; les providers peuvent remplacer)
  - `spawnSessions` : porte par défaut pour créer des sessions de travail liées aux fils à partir de `sessions_spawn` et des créations de fils ACP. Par défaut `true` lorsque les liaisons de fils sont activées ; les providers/comptes peuvent remplacer.
  - `defaultSpawnContext` : contexte natif de sous-agent par défaut pour les créations liées aux fils (`"fork"` ou `"isolated"`). Par défaut, `"fork"`.

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
      mode: "steer", // steer | queue (legacy one-at-a-time) | followup | collect | steer-backlog | steer+backlog | interrupt
      debounceMs: 500,
      cap: 20,
      drop: "summarize", // old | new | summarize
      byChannel: {
        whatsapp: "steer",
        telegram: "steer",
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

Remplacements par channel/compte : `channels.<channel>.responsePrefix`, `channels.<channel>.accounts.<id>.responsePrefix`.

Résolution (le plus spécifique l'emporte) : compte → channel → global. `""` désactive et arrête la cascade. `"auto"` dérive `[{identity.name}]`.

**Variables de modèle :**

| Variable          | Description                  | Exemple                     |
| ----------------- | ---------------------------- | --------------------------- |
| `{model}`         | Nom court du model           | `claude-opus-4-6`           |
| `{modelFull}`     | Identifiant complet du model | `anthropic/claude-opus-4-6` |
| `{provider}`      | Nom du fournisseur           | `anthropic`                 |
| `{thinkingLevel}` | Niveau de réflexion actuel   | `high`, `low`, `off`        |
| `{identity.name}` | Nom d'identité de l'agent    | (identique à `"auto"`)      |

Les variables ne sont pas sensibles à la casse. `{think}` est un alias pour `{thinkingLevel}`.

### Réaction d'accusé de réception

- Par défaut, utilise `identity.emoji` de l'agent actif, sinon `"👀"`. Définissez `""` pour désactiver.
- Remplacements par channel : `channels.<channel>.ackReaction`, `channels.<channel>.accounts.<id>.ackReaction`.
- Ordre de résolution : compte → channel → `messages.ackReaction` → repli sur l'identité.
- Portée : `group-mentions` (par défaut), `group-all`, `direct`, `all`.
- `removeAckAfterReply` : supprime l'accusé de réception après la réponse sur les channels prenant en charge les réactions, tels que Slack, Discord, Telegram, WhatsApp et iMessage.
- `messages.statusReactions.enabled` : active les réactions de statut de cycle de vie sur Slack, Discord et Telegram.
  Sur Slack et Discord, si non défini, les réactions de statut restent activées lorsque les réactions d'accusé de réception sont actives.
  Sur Telegram, définissez-le explicitement sur `true` pour activer les réactions de statut de cycle de vie.

### Anti-rebond entrant

Regroupe les messages texte rapides du même expéditeur en un seul tour d'agent. Les médias/pièces jointes sont envoyés immédiatement. Les commandes de contrôle contournent l'anti-rebond.

### TTS (synthèse vocale)

```json5
{
  messages: {
    tts: {
      auto: "always", // off | always | inbound | tagged
      mode: "final", // final | all
      provider: "elevenlabs",
      summaryModel: "openai/gpt-4.1-mini",
      modelOverrides: { enabled: true },
      maxTextLength: 4000,
      timeoutMs: 30000,
      prefsPath: "~/.openclaw/settings/tts.json",
      providers: {
        elevenlabs: {
          apiKey: "elevenlabs_api_key",
          baseUrl: "https://api.elevenlabs.io",
          voiceId: "voice_id",
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
          voice: "en-US-AvaMultilingualNeural",
          lang: "en-US",
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        },
        openai: {
          apiKey: "openai_api_key",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o-mini-tts",
          voice: "alloy",
        },
      },
    },
  },
}
```

- `auto` contrôle le mode auto-TTS par défaut : `off`, `always`, `inbound` ou `tagged`. `/tts on|off` peut remplacer les préférences locales, et `/tts status` affiche l'état effectif.
- `summaryModel` remplace `agents.defaults.model.primary` pour le résumé automatique.
- `modelOverrides` est activé par défaut ; `modelOverrides.allowProvider` est défini par défaut sur `false` (opt-in).
- Les clés API reviennent à `ELEVENLABS_API_KEY`/`XI_API_KEY` et `OPENAI_API_KEY`.
- Les fournisseurs de synthèse vocale intégrés appartiennent aux plugins. Si `plugins.allow` est défini, incluez chaque plugin de fournisseur TTS que vous souhaitez utiliser, par exemple `microsoft` pour Edge TTS. L'identifiant de fournisseur obsolète `edge` est accepté comme alias pour `microsoft`.
- `providers.openai.baseUrl` remplace le point de terminaison TTS OpenAI. L'ordre de résolution est la configuration, puis `OPENAI_TTS_BASE_URL`, puis `https://api.openai.com/v1`.
- Lorsque `providers.openai.baseUrl` pointe vers un point de terminaison autre que OpenAI, OpenClaw le traite comme un serveur TTS compatible OpenAI et assouplit la validation du modèle/de la voix.

---

## Talk

Valeurs par défaut pour le mode Talk (macOS/iOS/Android).

```json5
{
  talk: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "elevenlabs_voice_id",
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
          voice: "cedar",
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
- Les clés plates Talk héritées (`talk.voiceId`, `talk.voiceAliases`, `talk.modelId`, `talk.outputFormat`, `talk.apiKey`) ne sont conservées que pour compatibilité. Exécutez `openclaw doctor --fix` pour réécrire la configuration persistante dans `talk.providers.<provider>`.
- Les identifiants vocaux reviennent à `ELEVENLABS_VOICE_ID` ou `SAG_VOICE_ID`.
- `providers.*.apiKey` accepte des chaînes en texte brut ou des objets SecretRef.
- Le repli `ELEVENLABS_API_KEY`API ne s'applique que lorsqu'aucune clé API Talk n'est configurée.
- `providers.*.voiceAliases` permet aux directives Talk d'utiliser des noms conviviaux.
- `providers.mlx.modelId`macOSmacOS sélectionne le dépôt Hugging Face utilisé par l'assistant MLX local macOS. S'il est omis, macOS utilise `mlx-community/Soprano-80M-bf16`.
- La lecture MLX macOS passe par l'assistant macOS`openclaw-mlx-tts` inclus, s'il est présent, ou par un exécutable sur `PATH` ; `OPENCLAW_MLX_TTS_BIN` remplace le chemin de l'assistant pour le développement.
- `consultThinkingLevel` contrôle le niveau de réflexion pour l'exécution complète de l'agent OpenClaw derrière les appels en temps réel `openclaw_agent_consult` de Talk de l'interface de contrôle. Laisser non défini pour préserver le comportement normal de session/model.
- `consultFastMode` définit une substitution ponctuelle en mode rapide pour les consultations en temps réel de Talk de l'interface de contrôle sans modifier le paramètre de mode rapide normal de la session.
- `speechLocale`iOSmacOS définit l'identifiant de locale BCP 47 utilisé par la reconnaissance vocale Talk iOS/macOS. Laisser non défini pour utiliser la valeur par défaut de l'appareil.
- `silenceTimeoutMs` contrôle la durée d'attente du mode Talk après le silence de l'utilisateur avant l'envoi de la transcription. Non défini conserve la fenêtre de pause par défaut de la plateforme (`700 ms on macOS and Android, 900 ms on iOS`).
- `realtime.instructions`OpenClaw ajoute des instructions système orientées provider à l'invite temporelle intégrée d'OpenClaw, permettant ainsi de configurer le style vocal sans perdre les conseils par défaut `openclaw_agent_consult`.

---

## Connexes

- [Référence de configuration](/fr/gateway/configuration-reference) — toutes les autres clés de configuration
- [Configuration](/fr/gateway/configuration) — tâches courantes et configuration rapide
- [Exemples de configuration](/fr/gateway/configuration-examples)
