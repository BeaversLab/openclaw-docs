---
title: "Référence de configuration de la mémoire"
summary: "Tous les paramètres de configuration pour la recherche de mémoire, les fournisseurs d'intégration, QMD, la recherche hybride et l'indexation multimodale"
read_when:
  - You want to configure memory search providers or embedding models
  - You want to set up the QMD backend
  - You want to tune hybrid search, MMR, or temporal decay
  - You want to enable multimodal memory indexing
---

# Référence de configuration de la mémoire

Cette page répertorie chaque paramètre de configuration pour la recherche de mémoire OpenClaw. Pour
les aperçus conceptuels, voir :

- [Vue d'ensemble de la mémoire](/en/concepts/memory) -- fonctionnement de la mémoire
- [Moteur intégré](/en/concepts/memory-builtin) -- backend SQLite par défaut
- [Moteur QMD](/en/concepts/memory-qmd) -- sidecar local-first
- [Recherche mémoire](/en/concepts/memory-search) -- pipeline de recherche et réglage
- [Mémoire active](/en/concepts/active-memory) -- activation du sous-agent de mémoire pour les sessions interactives

Tous les paramètres de recherche mémoire se trouvent sous `agents.defaults.memorySearch` dans
`openclaw.json` sauf indication contraire.

Si vous recherchez le commutateur de fonctionnalité **active memory** et la configuration du sous-agent,
ceci se trouve sous `plugins.entries.active-memory` au lieu de `memorySearch`.

La mémoire active utilise un modèle à deux niveaux :

1. le plugin doit être activé et cibler l'ID de l'agent actuel
2. la requête doit être une session de chat persistante interactive éligible

Voir [Mémoire active](/en/concepts/active-memory) pour le modèle d'activation,
la configuration détenue par le plugin, la persistance des transcriptions et le modèle de déploiement sûr.

---

## Sélection du provider

| Clé        | Type      | Par défaut              | Description                                                                                             |
| ---------- | --------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `provider` | `string`  | détecté automatiquement | ID de l'adaptateur d'embeddings : `openai`, `gemini`, `voyage`, `mistral`, `bedrock`, `ollama`, `local` |
| `model`    | `string`  | par défaut du provider  | Nom du model d'embeddings                                                                               |
| `fallback` | `string`  | `"none"`                | ID de l'adaptateur de repli lorsque le principal échoue                                                 |
| `enabled`  | `boolean` | `true`                  | Activer ou désactiver la recherche mémoire                                                              |

### Ordre de détection automatique

Lorsque `provider` n'est pas défini, OpenClaw sélectionne le premier disponible :

1. `local` -- si `memorySearch.local.modelPath` est configuré et que le fichier existe.
2. `openai` -- si une clé OpenAI peut être résolue.
3. `gemini` -- si une clé Gemini peut être résolue.
4. `voyage` -- si une clé Voyage peut être résolue.
5. `mistral` -- si une clé Mistral peut être résolue.
6. `bedrock` -- si la chaîne de credentials du SDK AWS est résolue (rôle d'instance, clés d'accès, profil, SSO, identité web ou configuration partagée).

`ollama` est pris en charge mais n'est pas détecté automatiquement (définissez-le explicitement).

### Résolution de clé API

Les intégrations à distance nécessitent une clé API. Bedrock utilise à la place la chaîne de credentials par défaut du SDK AWS (rôles d'instance, SSO, clés d'accès).

| Provider | Env var                        | Config key                        |
| -------- | ------------------------------ | --------------------------------- |
| OpenAI   | `OPENAI_API_KEY`               | `models.providers.openai.apiKey`  |
| Gemini   | `GEMINI_API_KEY`               | `models.providers.google.apiKey`  |
| Voyage   | `VOYAGE_API_KEY`               | `models.providers.voyage.apiKey`  |
| Mistral  | `MISTRAL_API_KEY`              | `models.providers.mistral.apiKey` |
| Bedrock  | Chaîne de credentials AWS      | Aucune clé API nécessaire         |
| Ollama   | `OLLAMA_API_KEY` (placeholder) | --                                |

Codex OAuth couvre uniquement la conversation/les complétions et ne satisfait pas les demandes d'intégration.

---

## Configuration du point de terminaison distant

Pour les points de terminaison personnalisés compatibles OpenAI ou pour remplacer les valeurs par défaut du provider :

| Key              | Type     | Description                                                                       |
| ---------------- | -------- | --------------------------------------------------------------------------------- |
| `remote.baseUrl` | `string` | URL de base API personnalisée                                                     |
| `remote.apiKey`  | `string` | Remplacer la clé API                                                              |
| `remote.headers` | `object` | En-têtes HTTP supplémentaires (fusionnés avec les valeurs par défaut du provider) |

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
        model: "text-embedding-3-small",
        remote: {
          baseUrl: "https://api.example.com/v1/",
          apiKey: "YOUR_KEY",
        },
      },
    },
  },
}
```

---

## Configuration spécifique à Gemini

| Key                    | Type     | Default                | Description                                            |
| ---------------------- | -------- | ---------------------- | ------------------------------------------------------ |
| `model`                | `string` | `gemini-embedding-001` | Prend également en charge `gemini-embedding-2-preview` |
| `outputDimensionality` | `number` | `3072`                 | Pour Embedding 2 : 768, 1536 ou 3072                   |

<Warning>Le changement de model ou de `outputDimensionality` déclenche une réindexation complète automatique.</Warning>

---

## Configuration de l'intégration Bedrock

Bedrock utilise la chaîne de credentials par défaut du SDK AWS -- aucune clé API n'est nécessaire.
Si OpenClaw s'exécute sur EC2 avec un rôle d'instance activé pour Bedrock, définissez simplement le
provider et le model :

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "bedrock",
        model: "amazon.titan-embed-text-v2:0",
      },
    },
  },
}
```

| Key                    | Type     | Default                        | Description                      |
| ---------------------- | -------- | ------------------------------ | -------------------------------- |
| `model`                | `string` | `amazon.titan-embed-text-v2:0` | ID de modèle d'embedding Bedrock |
| `outputDimensionality` | `number` | model par défaut               | Pour Titan V2 : 256, 512 ou 1024 |

### Modèles pris en charge

Les modèles suivants sont pris en charge (avec détection de famille et dimensions par défaut) :

| ID de modèle                               | Provider   | Dimensions par défaut | Dimensions configurables |
| ------------------------------------------ | ---------- | --------------------- | ------------------------ |
| `amazon.titan-embed-text-v2:0`             | Amazon     | 1024                  | 256, 512, 1024           |
| `amazon.titan-embed-text-v1`               | Amazon     | 1536                  | --                       |
| `amazon.titan-embed-g1-text-02`            | Amazon     | 1536                  | --                       |
| `amazon.titan-embed-image-v1`              | Amazon     | 1024                  | --                       |
| `amazon.nova-2-multimodal-embeddings-v1:0` | Amazon     | 1024                  | 256, 384, 1024, 3072     |
| `cohere.embed-english-v3`                  | Cohere     | 1024                  | --                       |
| `cohere.embed-multilingual-v3`             | Cohere     | 1024                  | --                       |
| `cohere.embed-v4:0`                        | Cohere     | 1536                  | 256-1536                 |
| `twelvelabs.marengo-embed-3-0-v1:0`        | TwelveLabs | 512                   | --                       |
| `twelvelabs.marengo-embed-2-7-v1:0`        | TwelveLabs | 1024                  | --                       |

Les variantes avec suffixe de débit (par ex., `amazon.titan-embed-text-v1:2:8k`) héritent de la configuration du modèle de base.

### Authentification

L'authentification Bedrock utilise l'ordre de résolution des identifiants standard du SDK AWS :

1. Variables d'environnement (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`)
2. Cache de jetons SSO
3. Identifiants de jeton d'identité Web
4. Fichiers d'identifiants et de configuration partagés
5. Identifiants de métadonnées ECS ou EC2

La région est résolue à partir de `AWS_REGION`, `AWS_DEFAULT_REGION`, le `amazon-bedrock` provider `baseUrl`, ou par défaut `us-east-1`.

### Autorisations IAM

Le rôle ou l'utilisateur IAM a besoin de :

```json
{
  "Effect": "Allow",
  "Action": "bedrock:InvokeModel",
  "Resource": "*"
}
```

Pour le moindre privilège, limitez `InvokeModel` au modèle spécifique :

```
arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0
```

---

## Configuration de l'embedding local

| Clé                   | Type     | Par défaut                 | Description                                      |
| --------------------- | -------- | -------------------------- | ------------------------------------------------ |
| `local.modelPath`     | `string` | téléchargé automatiquement | Chemin vers le fichier de modèle GGUF            |
| `local.modelCacheDir` | `string` | par défaut node-llama-cpp  | Répertoire de cache pour les modèles téléchargés |

Modèle par défaut : `embeddinggemma-300m-qat-Q8_0.gguf` (~0,6 Go, téléchargé automatiquement).
Nécessite une build native : `pnpm approve-builds` puis `pnpm rebuild node-llama-cpp`.

---

## Configuration de la recherche hybride

Tout sous `memorySearch.query.hybrid` :

| Clé                   | Type      | Par défaut | Description                                      |
| --------------------- | --------- | ---------- | ------------------------------------------------ |
| `enabled`             | `boolean` | `true`     | Activer la recherche hybride BM25 + vectorielle  |
| `vectorWeight`        | `number`  | `0.7`      | Poids pour les scores vectoriels (0-1)           |
| `textWeight`          | `number`  | `0.3`      | Poids pour les scores BM25 (0-1)                 |
| `candidateMultiplier` | `number`  | `4`        | Multiplicateur de la taille du pool de candidats |

### MMR (diversité)

| Clé           | Type      | Par défaut | Description                                     |
| ------------- | --------- | ---------- | ----------------------------------------------- |
| `mmr.enabled` | `boolean` | `false`    | Activer le reclassement MMR                     |
| `mmr.lambda`  | `number`  | `0.7`      | 0 = diversité maximale, 1 = pertinence maximale |

### Décroissance temporelle (récence)

| Clé                          | Type      | Par défaut | Description                                   |
| ---------------------------- | --------- | ---------- | --------------------------------------------- |
| `temporalDecay.enabled`      | `boolean` | `false`    | Activer le boost de récence                   |
| `temporalDecay.halfLifeDays` | `number`  | `30`       | Le score est divisé par deux tous les N jours |

Les fichiers pérennes (`MEMORY.md`, fichiers non datés dans `memory/`) ne subissent jamais de décroissance.

### Exemple complet

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        query: {
          hybrid: {
            vectorWeight: 0.7,
            textWeight: 0.3,
            mmr: { enabled: true, lambda: 0.7 },
            temporalDecay: { enabled: true, halfLifeDays: 30 },
          },
        },
      },
    },
  },
}
```

---

## Chemins de mémoire supplémentaires

| Clé          | Type       | Description                                       |
| ------------ | ---------- | ------------------------------------------------- |
| `extraPaths` | `string[]` | Répertoires ou fichiers supplémentaires à indexer |

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        extraPaths: ["../team-docs", "/srv/shared-notes"],
      },
    },
  },
}
```

Les chemins peuvent être absolus ou relatifs à l'espace de travail. Les répertoires sont scannés
récursivement pour les fichiers `.md`. La gestion des liens symboliques dépend du backend actif :
le moteur intégré ignore les liens symboliques, tandis que QMD suit le comportement du scanner
QMD sous-jacent.

Pour la recherche de transcriptions inter-agents délimitée par agent, utilisez
`agents.list[].memorySearch.qmd.extraCollections` au lieu de `memory.qmd.paths`.
Ces collections supplémentaires suivent la même structure `{ path, name, pattern? }`, mais
elles sont fusionnées par agent et peuvent conserver des noms partagés explicites lorsque le chemin
pointe en dehors de l'espace de travail actuel.
Si le même chemin résolu apparaît à la fois dans `memory.qmd.paths` et
`memorySearch.qmd.extraCollections`, QMD conserve la première entrée et ignore le
doublon.

---

## Mémoire multimodale (Gemini)

Indexer les images et l'audio avec le Markdown en utilisant Gemini Embedding 2 :

| Clé                       | Type       | Par défaut | Description                                    |
| ------------------------- | ---------- | ---------- | ---------------------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`    | Activer l'indexation multimodale               |
| `multimodal.modalities`   | `string[]` | --         | `["image"]`, `["audio"]`, ou `["all"]`         |
| `multimodal.maxFileBytes` | `number`   | `10000000` | Taille maximale des fichiers pour l'indexation |

S'applique uniquement aux fichiers dans `extraPaths`. Les racines de mémoire par défaut restent en Markdown uniquement.
Nécessite `gemini-embedding-2-preview`. `fallback` doit être `"none"`.

Formats pris en charge : `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.heic`, `.heif`
(images) ; `.mp3`, `.wav`, `.ogg`, `.opus`, `.m4a`, `.aac`, `.flac` (audio).

---

## Cache d'embeddings

| Clé                | Type      | Par défaut | Description                                          |
| ------------------ | --------- | ---------- | ---------------------------------------------------- |
| `cache.enabled`    | `boolean` | `false`    | Mettre en cache les embeddings de chunks dans SQLite |
| `cache.maxEntries` | `number`  | `50000`    | Max d'embeddings en cache                            |

Empêche de réintégrer le texte inchangé lors de la réindexation ou des mises à jour des transcriptions.

---

## Indexation par lots

| Clé                           | Type      | Par défaut | Description                            |
| ----------------------------- | --------- | ---------- | -------------------------------------- |
| `remote.batch.enabled`        | `boolean` | `false`    | Activer l'API d'incorporation par lots |
| `remote.batch.concurrency`    | `number`  | `2`        | Tâches parallèles par lots             |
| `remote.batch.wait`           | `boolean` | `true`     | Attendre la fin du lot                 |
| `remote.batch.pollIntervalMs` | `number`  | --         | Intervalle d'interrogation             |
| `remote.batch.timeoutMinutes` | `number`  | --         | Délai d'expiration du lot              |

Disponible pour `openai`, `gemini` et `voyage`. Le traitement par lots OpenAI est généralement
le plus rapide et le moins coûteux pour les remplissages importants.

---

## Recherche de mémoire de session (expérimental)

Indexez les transcriptions de session et affichez-les via `memory_search` :

| Clé                           | Type       | Par défaut   | Description                                          |
| ----------------------------- | ---------- | ------------ | ---------------------------------------------------- |
| `experimental.sessionMemory`  | `boolean`  | `false`      | Activer l'indexation de session                      |
| `sources`                     | `string[]` | `["memory"]` | Ajoutez `"sessions"` pour inclure les transcriptions |
| `sync.sessions.deltaBytes`    | `number`   | `100000`     | Seuil d'octets pour la réindexation                  |
| `sync.sessions.deltaMessages` | `number`   | `50`         | Seuil de messages pour la réindexation               |

L'indexation de session est optionnelle et s'exécute de manière asynchrone. Les résultats peuvent être
légèrement périmés. Les journaux de session résident sur le disque, traitez donc l'accès au système de fichiers comme la limite
confiance.

---

## Accélération vectorielle SQLite (sqlite-vec)

| Clé                          | Type      | Par défaut | Description                                        |
| ---------------------------- | --------- | ---------- | -------------------------------------------------- |
| `store.vector.enabled`       | `boolean` | `true`     | Utiliser sqlite-vec pour les requêtes vectorielles |
| `store.vector.extensionPath` | `string`  | inclus     | Remplacer le chemin sqlite-vec                     |

Lorsque sqlite-vec n'est pas disponible, OpenClaw revient automatiquement à la similarité cosinus
en cours de traitement.

---

## Stockage des index

| Clé                   | Type     | Par défaut                            | Description                                 |
| --------------------- | -------- | ------------------------------------- | ------------------------------------------- |
| `store.path`          | `string` | `~/.openclaw/memory/{agentId}.sqlite` | Index location (supports `{agentId}` token) |
| `store.fts.tokenizer` | `string` | `unicode61`                           | FTS5 tokenizer (`unicode61` ou `trigram`)   |

---

## Configuration du backend QMD

Définissez `memory.backend = "qmd"` pour activer. Tous les paramètres QMD se trouvent sous
`memory.qmd` :

| Clé                      | Type      | Par défaut | Description                                           |
| ------------------------ | --------- | ---------- | ----------------------------------------------------- |
| `command`                | `string`  | `qmd`      | Chemin de l'exécutable QMD                            |
| `searchMode`             | `string`  | `search`   | Commande de recherche : `search`, `vsearch`, `query`  |
| `includeDefaultMemory`   | `boolean` | `true`     | Indexation automatique `MEMORY.md` + `memory/**/*.md` |
| `paths[]`                | `array`   | --         | Chemins supplémentaires : `{ name, path, pattern? }`  |
| `sessions.enabled`       | `boolean` | `false`    | Indexer les transcriptions de session                 |
| `sessions.retentionDays` | `number`  | --         | Conservation des transcriptions                       |
| `sessions.exportDir`     | `string`  | --         | Répertoire d'exportation                              |

OpenClaw privilégie la collection QMD actuelle et les formes de requête MCP, mais maintient
les fonctionnalités des anciennes versions de QMD en revenant aux indicateurs de collection `--mask` hérités
et aux anciens noms d'outils MCP si nécessaire.

Les substitutions de modèle QMD restent du côté de QMD, pas dans la configuration OpenClaw. Si vous devez
substituer globalement les modèles de QMD, définissez des variables d'environnement telles que
`QMD_EMBED_MODEL`, `QMD_RERANK_MODEL` et `QMD_GENERATE_MODEL` dans l'environnement d'exécution
de la passerelle.

### Calendrier de mise à jour

| Clé                       | Type      | Par défaut | Description                           |
| ------------------------- | --------- | ---------- | ------------------------------------- |
| `update.interval`         | `string`  | `5m`       | Intervalle d'actualisation            |
| `update.debounceMs`       | `number`  | `15000`    | Debounce file changes                 |
| `update.onBoot`           | `boolean` | `true`     | Refresh on startup                    |
| `update.waitForBootSync`  | `boolean` | `false`    | Block startup until refresh completes |
| `update.embedInterval`    | `string`  | --         | Separate embed cadence                |
| `update.commandTimeoutMs` | `number`  | --         | Timeout for QMD commands              |
| `update.updateTimeoutMs`  | `number`  | --         | Timeout for QMD update operations     |
| `update.embedTimeoutMs`   | `number`  | --         | Timeout for QMD embed operations      |

### Limits

| Key                       | Type     | Default | Description                |
| ------------------------- | -------- | ------- | -------------------------- |
| `limits.maxResults`       | `number` | `6`     | Max search results         |
| `limits.maxSnippetChars`  | `number` | --      | Clamp snippet length       |
| `limits.maxInjectedChars` | `number` | --      | Clamp total injected chars |
| `limits.timeoutMs`        | `number` | `4000`  | Search timeout             |

### Scope

Controls which sessions can receive QMD search results. Same schema as
[`session.sendPolicy`](/en/gateway/configuration-reference#session):

```json5
{
  memory: {
    qmd: {
      scope: {
        default: "deny",
        rules: [{ action: "allow", match: { chatType: "direct" } }],
      },
    },
  },
}
```

Default is DM-only. `match.keyPrefix` matches the normalized session key;
`match.rawKeyPrefix` matches the raw key including `agent:<id>:`.

### Citations

`memory.citations` applies to all backends:

| Value            | Behavior                                            |
| ---------------- | --------------------------------------------------- |
| `auto` (default) | Include `Source: <path#line>` footer in snippets    |
| `on`             | Always include footer                               |
| `off`            | Omit footer (path still passed to agent internally) |

### Full QMD example

```json5
{
  memory: {
    backend: "qmd",
    citations: "auto",
    qmd: {
      includeDefaultMemory: true,
      update: { interval: "5m", debounceMs: 15000 },
      limits: { maxResults: 6, timeoutMs: 4000 },
      scope: {
        default: "deny",
        rules: [{ action: "allow", match: { chatType: "direct" } }],
      },
      paths: [{ name: "docs", path: "~/notes", pattern: "**/*.md" }],
    },
  },
}
```

---

## Dreaming (experimental)

Dreaming is configured under `plugins.entries.memory-core.config.dreaming`,
not under `agents.defaults.memorySearch`.

Dreaming runs as one scheduled sweep and uses internal light/deep/REM phases as
an implementation detail.

Pour le comportement conceptuel et les commandes slash, voir [Dreaming](/en/concepts/dreaming).

### Paramètres utilisateur

| Clé         | Type      | Par défaut  | Description                                                   |
| ----------- | --------- | ----------- | ------------------------------------------------------------- |
| `enabled`   | `boolean` | `false`     | Activer ou désactiver entièrement le dreaming                 |
| `frequency` | `string`  | `0 3 * * *` | Cadence cron facultative pour le balayage complet de dreaming |

### Exemple

```json5
{
  plugins: {
    entries: {
      "memory-core": {
        config: {
          dreaming: {
            enabled: true,
            frequency: "0 3 * * *",
          },
        },
      },
    },
  },
}
```

Notes :

- Le dreaming écrit l'état de la machine dans `memory/.dreams/`.
- Le dreaming écrit une sortie narrative lisible par l'homme dans `DREAMS.md` (ou `dreams.md` existant).
- La stratégie et les seuils des phases légère/profonde/REM sont un comportement interne, et non une configuration orientée utilisateur.
