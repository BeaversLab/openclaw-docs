---
summary: "Tous les paramètres de configuration pour la recherche mémoire, les fournisseurs d'embeddings, QMD, la recherche hybride et l'indexation multimodale"
title: "Référence de configuration de la mémoire"
sidebarTitle: "Config mémoire"
read_when:
  - You want to configure memory search providers or embedding models
  - You want to set up the QMD backend
  - You want to tune hybrid search, MMR, or temporal decay
  - You want to enable multimodal memory indexing
---

Cette page répertorie tous les paramètres de configuration pour la recherche mémoire OpenClaw. Pour des aperçus conceptuels, voir :

<CardGroup cols={2}>
  <Card title="Vue d'ensemble de la mémoire" href="/fr/concepts/memory">
    Fonctionnement de la mémoire.
  </Card>
  <Card title="Moteur intégré" href="/fr/concepts/memory-builtin">
    Backend SQLite par défaut.
  </Card>
  <Card title="Moteur QMD" href="/fr/concepts/memory-qmd">
    Sidecar local-first.
  </Card>
  <Card title="Recherche mémoire" href="/fr/concepts/memory-search">
    Pipeline de recherche et réglage.
  </Card>
  <Card title="Mémoire active" href="/fr/concepts/active-memory">
    Sous-agent mémoire pour les sessions interactives.
  </Card>
</CardGroup>

Tous les paramètres de recherche mémoire se trouvent sous `agents.defaults.memorySearch` dans `openclaw.json` sauf indication contraire.

<Note>
Si vous recherchez le commutateur de fonctionnalité **active memory** et la configuration du sous-agent, cela se trouve sous `plugins.entries.active-memory` au lieu de `memorySearch`.

La mémoire active utilise un modèle à deux portes :

1. le plugin doit être activé et cibler l'identifiant de l'agent actuel
2. la requête doit être une session de chat interactive persistante éligible

Voir [Active Memory](/fr/concepts/active-memory) pour le modèle d'activation, la configuration détenue par le plugin, la persistance des transcriptions et le modèle de déploiement sûr.

</Note>

---

## Sélection du fournisseur

| Clé        | Type      | Par défaut          | Description                                                                                                                                                                                                                                                                                                                         |
| ---------- | --------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider` | `string`  | `"openai"`          | ID de l'adaptateur d'embedding tel que `bedrock`, `deepinfra`, `gemini`, `github-copilot`, `local`, `mistral`, `ollama`, `openai`, `openai-compatible` ou `voyage` ; peut également être un `models.providers.<id>` configuré dont le `api` pointe vers un adaptateur d'embedding mémoire ou une API de modèle compatible OpenAIAPI |
| `model`    | `string`  | provider par défaut | Nom du modèle d'embedding                                                                                                                                                                                                                                                                                                           |
| `fallback` | `string`  | `"none"`            | ID de l'adaptateur de secours si le principal échoue                                                                                                                                                                                                                                                                                |
| `enabled`  | `boolean` | `true`              | Activer ou désactiver la recherche mémoire                                                                                                                                                                                                                                                                                          |

Lorsque `provider` n'est pas défini, OpenClaw utilise les embeddings OpenAI. Définissez `provider`
explicitement pour utiliser Gemini, Voyage, Mistral, DeepInfra, Bedrock, GitHub Copilot,
Ollama ou un point de terminaison `/v1/embeddings` compatible OpenAI.
Les configurations héritées qui indiquent encore `provider: "auto"` sont résolues vers `openai`.

<Warning>
Le changement de fournisseur d'embeddings, de modèle, des paramètres du fournisseur, des sources, de la portée,
du découpage (chunking) ou du tokeniseur peut rendre l'index vectoriel SQLite existant incompatible.
OpenClaw suspend la recherche vectorielle et signale un avertissement d'identité d'index au lieu de
ré-intégrer automatiquement tout le contenu. Reconstruisez lorsque vous êtes prêt avec
OpenClaw`openclaw memory status --index --agent <id>` ou
`openclaw memory index --force --agent <id>`.
</Warning>

Si les embeddings OpenAI sont inaccessibles depuis votre réseau, la récupération de mémoire échoue de manière ouverte
au lieu de bloquer le tour. Définissez le champ OpenAI`memorySearch.provider`OllamaOpenAI existant sur un
fournisseur local accessible, Ollama, régional ou compatible OpenAI pour restaurer
le classement sémantique.

### Identifiants de fournisseur personnalisés

`memorySearch.provider` peut pointer vers une entrée `models.providers.<id>` personnalisée pour des adaptateurs de fournisseur spécifiques à la mémoire tels que `ollama`OpenAI, ou pour des API de modèle compatibles OpenAI telles que `openai-responses` / `openai-completions`OpenClaw. OpenClaw résout le propriétaire `api` de ce fournisseur pour l'adaptateur d'embeddings tout en préservant l'identifiant de fournisseur personnalisé pour la gestion du point de terminaison, de l'authentification et du préfixe de modèle. Cela permet aux configurations multi-GPU ou multi-hôte de dédier les embeddings de mémoire à un point de terminaison local spécifique :

```json5
{
  models: {
    providers: {
      "ollama-5080": {
        api: "ollama",
        baseUrl: "http://gpu-box.local:11435",
        apiKey: "ollama-local",
        models: [{ id: "qwen3-embedding:0.6b" }],
      },
    },
  },
  agents: {
    defaults: {
      memorySearch: {
        provider: "ollama-5080",
        model: "qwen3-embedding:0.6b",
      },
    },
  },
}
```

### Résolution de clé API

Les embeddings distants nécessitent une clé API. Bedrock utilise à la place la chaîne de credentials par défaut du AWS SDK (rôles d'instance, SSO, clés d'accès).

| Provider       | Env var                                            | Config key                          |
| -------------- | -------------------------------------------------- | ----------------------------------- |
| Bedrock        | AWS credential chain                               | No API key needed                   |
| DeepInfra      | `DEEPINFRA_API_KEY`                                | `models.providers.deepinfra.apiKey` |
| Gemini         | `GEMINI_API_KEY`                                   | `models.providers.google.apiKey`    |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN` | Auth profile via device login       |
| Mistral        | `MISTRAL_API_KEY`                                  | `models.providers.mistral.apiKey`   |
| Ollama         | `OLLAMA_API_KEY` (placeholder)                     | --                                  |
| OpenAI         | `OPENAI_API_KEY`                                   | `models.providers.openai.apiKey`    |
| Voyage         | `VOYAGE_API_KEY`                                   | `models.providers.voyage.apiKey`    |

<Note>Codex OAuth covers chat/completions only and does not satisfy embedding requests.</Note>

---

## Remote endpoint config

Use `provider: "openai-compatible"` for a generic OpenAI-compatible
`/v1/embeddings` server that should not inherit global OpenAI chat credentials.

<ParamField path="remote.baseUrl" type="string">
  Custom API base URL.
</ParamField>
<ParamField path="remote.apiKey" type="string">
  Override API key.
</ParamField>
<ParamField path="remote.headers" type="object">
  Extra HTTP headers (merged with provider defaults).
</ParamField>

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai-compatible",
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

## Provider-specific config

<AccordionGroup>
  <Accordion title="Gemini">
    | Key                    | Type     | Default                | Description                                |
    | ---------------------- | -------- | ---------------------- | ------------------------------------------ |
    | `model`                | `string` | `gemini-embedding-001` | Also supports `gemini-embedding-2-preview` |
    | `outputDimensionality` | `number` | `3072`                 | For Embedding 2: 768, 1536, or 3072        |

    <Warning>
    Changing model or `outputDimensionality` changes the index identity. OpenClaw
    pauses vector search until you explicitly rebuild the memory index.
    </Warning>

  </Accordion>
  <Accordion title="Types d'entrée compatibles OpenAI">
    Les points de terminaison d'incorporation compatibles OpenAI peuvent opter pour des champs de requête `input_type` spécifiques au provider. Ceci est utile pour les modèles d'incorporation asymétriques qui nécessitent des étiquettes différentes pour les incorporations de requêtes et de documents.

    | Clé                 | Type     | Par défaut | Description                                             |
    | ------------------- | -------- | ---------- | ------------------------------------------------------- |
    | `inputType`         | `string` | non défini   | `input_type` partagé pour les incorporations de requêtes et de documents   |
    | `queryInputType`    | `string` | non défini   | `input_type` au moment de la requête ; remplace `inputType`          |
    | `documentInputType` | `string` | non défini   | `input_type` d'index/document ; remplace `inputType`      |

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "openai-compatible",
            remote: {
              baseUrl: "https://embeddings.example/v1",
              apiKey: "${EMBEDDINGS_API_KEY}",
            },
            model: "asymmetric-embedder",
            queryInputType: "query",
            documentInputType: "passage",
          },
        },
      },
    }
    ```

    La modification de ces valeurs affecte l'identité du cache d'incorporation pour l'indexation par lots du provider et doit être suivie d'une réindexation de la mémoire lorsque le modèle en amont traite les étiquettes différemment.

  </Accordion>
  <Accordion title="Bedrock">
    ### Configuration de l'incorporation Bedrock

    Bedrock utilise la chaîne de certificats par défaut du AWS SDK — aucune clé d'API nécessaire. Si OpenClaw s'exécute sur EC2 avec un rôle d'instance activé pour Bedrock, définissez simplement le provider et le modèle :

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

    | Clé                    | Type     | Par défaut                     | Description                     |
    | ---------------------- | -------- | ------------------------------ | ------------------------------- |
    | `model`                | `string` | `amazon.titan-embed-text-v2:0` | ID de tout modèle d'incorporation Bedrock  |
    | `outputDimensionality` | `number` | modèle par défaut              | Pour Titan V2 : 256, 512 ou 1024 |

    **Modèles pris en charge** (avec détection de famille et dimensions par défaut) :

    | ID du modèle                                   | Provider   | Dimensions par défaut | Dimensions configurables    |
    | ------------------------------------------ | ---------- | ------------ | -------------------- |
    | `amazon.titan-embed-text-v2:0`             | Amazon     | 1024         | 256, 512, 1024       |
    | `amazon.titan-embed-text-v1`               | Amazon     | 1536         | --                   |
    | `amazon.titan-embed-g1-text-02`            | Amazon     | 1536         | --                   |
    | `amazon.titan-embed-image-v1`              | Amazon     | 1024         | --                   |
    | `amazon.nova-2-multimodal-embeddings-v1:0` | Amazon     | 1024         | 256, 384, 1024, 3072 |
    | `cohere.embed-english-v3`                  | Cohere     | 1024         | --                   |
    | `cohere.embed-multilingual-v3`             | Cohere     | 1024         | --                   |
    | `cohere.embed-v4:0`                        | Cohere     | 1536         | 256-1536             |
    | `twelvelabs.marengo-embed-3-0-v1:0`        | TwelveLabs | 512          | --                   |
    | `twelvelabs.marengo-embed-2-7-v1:0`        | TwelveLabs | 1024         | --                   |

    Les variantes avec suffixe de débit (par exemple, `amazon.titan-embed-text-v1:2:8k`) héritent de la configuration du modèle de base.

    **Authentification :** L'authentification Bedrock utilise l'ordre de résolution des informations d'identification standard du AWS SDK :

    1. Variables d'environnement (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`)
    2. Cache de jetons SSO
    3. Informations d'identification de jeton d'identité Web
    4. Fichiers d'informations d'identification et de configuration partagés
    5. Informations d'identification des métadonnées ECS ou EC2

    La région est résolue à partir de `AWS_REGION`, `AWS_DEFAULT_REGION`, la `baseUrl` du provider `amazon-bedrock`, ou par défaut `us-east-1`.

    **Autorisations IAM :** le rôle ou l'utilisateur IAM a besoin de :

    ```json
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "*"
    }
    ```

    Pour le privilège minimum, limitez `InvokeModel` au modèle spécifique :

    ```
    arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0
    ```

  </Accordion>
  <Accordion title="Local (GGUF + node-llama-cpp)">
    | Clé                   | Type               | Valeur par défaut                | Description                                                                                                                                                                                                                                                                                                          |
    | --------------------- | ------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `local.modelPath`     | `string`           | téléchargé automatiquement        | Chemin vers le fichier modèle GGUF                                                                                                                                                                                                                                                                                              |
    | `local.modelCacheDir` | `string`           | node-llama-cpp par défaut | Répertoire de cache pour les modèles téléchargés                                                                                                                                                                                                                                                                                      |
    | `local.contextSize`   | `number \| "auto"` | `4096`                 | Taille de la fenêtre de contexte pour le contexte d'embedding. 4096 couvre les segments typiques (128–512 tokens) tout en limitant la VRAM non pondérée. Abaissez à 1024–2048 sur les hôtes contraints. `"auto"` utilise le maximum entraîné du modèle — non recommandé pour les modèles 8B+ (Qwen3-Embedding-8B: 40 960 tokens → ~32 Go VRAM vs ~8.8 Go à 4096). |

    Modèle par défaut : `embeddinggemma-300m-qat-Q8_0.gguf` (~0.6 Go, téléchargé automatiquement). Les checkouts source nécessitent toujours une approbation de build natif : `pnpm approve-builds` puis `pnpm rebuild node-llama-cpp`.

    Utilisez la CLI autonome pour vérifier le même chemin de provider que celui utilisé par la Gateway :

    ```bash
    openclaw memory status --deep --agent main
    openclaw memory index --force --agent main
    ```

    Définissez `provider: "local"` explicitement pour les embeddings GGUF locaux. `hf:` et les références de modèles HTTP(S) sont prises en charge pour les configurations locales explicites, mais elles ne modifient pas le provider par défaut.

  </Accordion>
</AccordionGroup>

### Délai d'expiration de l'embedding en ligne

<ParamField path="sync.embeddingBatchTimeoutSeconds" type="number">
  Remplacer le délai d'expiration pour les lots d'embeddings en ligne lors de l'indexation de la mémoire.

Non défini utilise la valeur par défaut du fournisseur : 600 secondes pour les fournisseurs locaux/auto-hébergés tels que `local`, `ollama` et `lmstudio`, et 120 secondes pour les fournisseurs hébergés. Augmentez cette valeur lorsque les lots d'intégration locaux dépendants du CPU sont sains mais lents.

</ParamField>

---

## Configuration de la recherche hybride

Tout sous `memorySearch.query.hybrid` :

| Clé                   | Type      | Par défaut | Description                                      |
| --------------------- | --------- | ---------- | ------------------------------------------------ |
| `enabled`             | `boolean` | `true`     | Activer la recherche hybride BM25 + vectorielle  |
| `vectorWeight`        | `number`  | `0.7`      | Poids pour les scores vectoriels (0-1)           |
| `textWeight`          | `number`  | `0.3`      | Poids pour les scores BM25 (0-1)                 |
| `candidateMultiplier` | `number`  | `4`        | Multiplicateur de la taille du pool de candidats |

<Tabs>
  <Tab title="MMR (diversité)">
    | Clé           | Type      | Par défaut | Description                          |
    | ------------- | --------- | ---------- | ------------------------------------ |
    | `mmr.enabled` | `boolean` | `false` | Activer le reclassement MMR                |
    | `mmr.lambda`  | `number`  | `0.7`   | 0 = diversité max, 1 = pertinence max |
  </Tab>
  <Tab title="Décroissance temporelle (récence)">
    | Clé                          | Type      | Par défaut | Description               |
    | ---------------------------- | --------- | ---------- | ------------------------- |
    | `temporalDecay.enabled`      | `boolean` | `false` | Activer le boost de récence      |
    | `temporalDecay.halfLifeDays` | `number`  | `30`    | Le score diminue de moitié tous les N jours |

    Les fichiers persistants (`MEMORY.md`, fichiers non datés dans `memory/`) ne sont jamais soumis à la décroissance.

  </Tab>
</Tabs>

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

Les chemins peuvent être absolus ou relatifs à l'espace de travail. Les répertoires sont analysés de manière récursive pour les fichiers `.md`. La gestion des liens symboliques dépend du backend actif : le moteur intégré ignore les liens symboliques, tandis que QMD suit le comportement du scanner QMD sous-jacent.

Pour la recherche de transcriptions inter-agents avec une portée par agent, utilisez `agents.list[].memorySearch.qmd.extraCollections` au lieu de `memory.qmd.paths`. Ces collections supplémentaires suivent la même structure `{ path, name, pattern? }`, mais elles sont fusionnées par agent et peuvent préserver des noms partagés explicites lorsque le chemin pointe en dehors de l'espace de travail actuel. Si le même chemin résolu apparaît à la fois dans `memory.qmd.paths` et `memorySearch.qmd.extraCollections`, QMD conserve la première entrée et ignore le doublon.

---

## Mémoire multimodale (Gemini)

Indexer les images et l'audio avec le Markdown en utilisant Gemini Embedding 2 :

| Clé                       | Type       | Par défaut | Description                                    |
| ------------------------- | ---------- | ---------- | ---------------------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`    | Activer l'indexation multimodale               |
| `multimodal.modalities`   | `string[]` | --         | `["image"]`, `["audio"]`, ou `["all"]`         |
| `multimodal.maxFileBytes` | `number`   | `10000000` | Taille maximale des fichiers pour l'indexation |

<Note>S'applique uniquement aux fichiers dans `extraPaths`. Les racines de mémoire par défaut restent en Markdown uniquement. Nécessite `gemini-embedding-2-preview`. `fallback` doit être `"none"`.</Note>

Formats pris en charge : `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.heic`, `.heif` (images) ; `.mp3`, `.wav`, `.ogg`, `.opus`, `.m4a`, `.aac`, `.flac` (audio).

---

## Cache d'embeddings

| Clé                | Type      | Par défaut | Description                                         |
| ------------------ | --------- | ---------- | --------------------------------------------------- |
| `cache.enabled`    | `boolean` | `true`     | Mettre en cache les embeddings de blocs dans SQLite |
| `cache.maxEntries` | `number`  | `50000`    | Max cached embeddings                               |

Empêche de ré-encoder un texte inchangé lors de la réindexation ou des mises à jour de transcription.

---

## Batch indexing

| Key                           | Type      | Default | Description                |
| ----------------------------- | --------- | ------- | -------------------------- |
| `remote.nonBatchConcurrency`  | `number`  | `4`     | Parallel inline embeddings |
| `remote.batch.enabled`        | `boolean` | `false` | Enable batch embedding API |
| `remote.batch.concurrency`    | `number`  | `2`     | Parallel batch jobs        |
| `remote.batch.wait`           | `boolean` | `true`  | Wait for batch completion  |
| `remote.batch.pollIntervalMs` | `number`  | --      | Poll interval              |
| `remote.batch.timeoutMinutes` | `number`  | --      | Batch timeout              |

Available for `openai`, `gemini`, and `voyage`. OpenAI batch is typically fastest and cheapest for large backfills.

`remote.nonBatchConcurrency` controls inline embedding calls used by local/self-hosted providers and hosted providers when provider batch APIs are not active. Ollama defaults to `1` for non-batch indexing to avoid overwhelming smaller local hosts; set a higher value on larger machines.

This is separate from `sync.embeddingBatchTimeoutSeconds`, which controls the timeout for inline embedding calls.

---

## Session memory search (experimental)

Index session transcripts and surface them via `memory_search`:

| Key                           | Type       | Default      | Description                             |
| ----------------------------- | ---------- | ------------ | --------------------------------------- |
| `experimental.sessionMemory`  | `boolean`  | `false`      | Enable session indexing                 |
| `sources`                     | `string[]` | `["memory"]` | Add `"sessions"` to include transcripts |
| `sync.sessions.deltaBytes`    | `number`   | `100000`     | Seuil d'octets pour la réindexation     |
| `sync.sessions.deltaMessages` | `number`   | `50`         | Seuil de messages pour la réindexation  |

<Warning>L'indexation de session est facultative et s'exécute de manière asynchrone. Les résultats peuvent être légèrement obsolètes. Les journaux de session résident sur le disque, traitez donc l'accès au système de fichiers comme la limite de confiance.</Warning>

---

## Accélération vectorielle SQLite (sqlite-vec)

| Clé                          | Type      | Par défaut | Description                                        |
| ---------------------------- | --------- | ---------- | -------------------------------------------------- |
| `store.vector.enabled`       | `boolean` | `true`     | Utiliser sqlite-vec pour les requêtes vectorielles |
| `store.vector.extensionPath` | `string`  | inclus     | Remplacer le chemin sqlite-vec                     |

Lorsque sqlite-vec n'est pas disponible, OpenClaw revient automatiquement à la similarité cosinus en cours de processus.

---

## Stockage de l'index

| Clé                   | Type     | Par défaut                            | Description                                                   |
| --------------------- | -------- | ------------------------------------- | ------------------------------------------------------------- |
| `store.path`          | `string` | `~/.openclaw/memory/{agentId}.sqlite` | Emplacement de l'index (prend en charge le jeton `{agentId}`) |
| `store.fts.tokenizer` | `string` | `unicode61`                           | Tokeniseur FTS5 (`unicode61` ou `trigram`)                    |

---

## Configuration du backend QMD

Définissez `memory.backend = "qmd"` pour activer. Tous les paramètres QMD se trouvent sous `memory.qmd` :

| Clé                      | Type      | Par défaut | Description                                                                                               |
| ------------------------ | --------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| `command`                | `string`  | `qmd`      | Chemin de l'exécutable QMD ; définissez un chemin absolu lorsque le service `PATH` diffère de votre shell |
| `searchMode`             | `string`  | `search`   | Commande de recherche : `search`, `vsearch`, `query`                                                      |
| `includeDefaultMemory`   | `boolean` | `true`     | Auto-indexation `MEMORY.md` + `memory/**/*.md`                                                            |
| `paths[]`                | `array`   | --         | Chemins supplémentaires : `{ name, path, pattern? }`                                                      |
| `sessions.enabled`       | `boolean` | `false`    | Indexer les transcriptions de session                                                                     |
| `sessions.retentionDays` | `number`  | --         | Conservation des transcriptions                                                                           |
| `sessions.exportDir`     | `string`  | --         | Répertoire d'export                                                                                       |

`searchMode: "search"` est purement lexical/BM25. OpenClaw n'exécute pas de sondages de préparation des vecteurs sémantiques ni de maintenance des intégrations QMD pour ce mode, y compris durant `memory status --deep` ; `vsearch` et `query` continuent d'exiger la préparation des vecteurs QMD et les intégrations.

OpenClaw privilégie les formes de collection QMD actuelles et les formes de requête MCP, mais maintient le fonctionnement des versions plus anciennes de QMD en essayant, si nécessaire, les indicateurs de motif de collection compatibles et les anciens noms d'outil MCP. Lorsque QMD annonce la prise en charge de plusieurs filtres de collection, les collections de même source sont recherchées avec un seul processus QMD ; les versions antérieures de QMD conservent le chemin de compatibilité par collection. De même source signifie que les collections de mémoire durable sont regroupées, tandis que les collections de transcriptions de session restent un groupe distinct pour que la diversification des sources ait toujours les deux entrées.

<Note>Les substitutions de modèle QMD restent du côté de QMD, et non dans la configuration OpenClaw. Si vous devez remplacer globalement les modèles de QMD, définissez des variables d'environnement telles que `QMD_EMBED_MODEL`, `QMD_RERANK_MODEL` et `QMD_GENERATE_MODEL` dans l'environnement d'exécution de la passerelle.</Note>

<AccordionGroup>
  <Accordion title="Calendrier de mise à jour">
    | Clé                       | Type      | Par défaut | Description                           |
    | ------------------------- | --------- | ------- | ------------------------------------- |
    | `update.interval`         | `string`  | `5m`    | Intervalle d'actualisation                      |
    | `update.debounceMs`       | `number`  | `15000` | Anti-rebond pour les changements de fichiers                 |
    | `update.onBoot`           | `boolean` | `true`  | Actualiser à l'ouverture du gestionnaire QMD persistant ; conditionne également l'actualisation au démarrage (opt-in) |
    | `update.startup`          | `string`  | `off`   | Actualisation optionnelle au démarrage de la passerelle : `off`, `idle` ou `immediate` |
    | `update.startupDelayMs`   | `number`  | `120000` | Délai avant l'exécution de l'actualisation `startup: "idle"` |
    | `update.waitForBootSync`  | `boolean` | `false` | Bloquer l'ouverture du gestionnaire jusqu'à ce que son actualisation initiale soit terminée |
    | `update.embedInterval`    | `string`  | --      | Cadence d'intégration séparée                |
    | `update.commandTimeoutMs` | `number`  | --      | Délai d'attente pour les commandes QMD              |
    | `update.updateTimeoutMs`  | `number`  | --      | Délai d'attente pour les opérations de mise à jour QMD     |
    | `update.embedTimeoutMs`   | `number`  | --      | Délai d'attente pour les opérations d'intégration QMD      |
  </Accordion>
  <Accordion title="Limites">
    | Clé                       | Type     | Par défaut | Description                |
    | ------------------------- | -------- | ------- | -------------------------- |
    | `limits.maxResults`       | `number` | `6`     | Résultats de recherche max         |
    | `limits.maxSnippetChars`  | `number` | --      | Limiter la longueur de l'extrait       |
    | `limits.maxInjectedChars` | `number` | --      | Limiter le total des caractères injectés |
    | `limits.timeoutMs`        | `number` | `4000`  | Délai de recherche             |
  </Accordion>
  <Accordion title="Portée">
    Contrôle quelles sessions peuvent recevoir les résultats de recherche QMD. Même schéma que [`session.sendPolicy`](/fr/gateway/config-agents#session) :

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

    La valeur par défaut fournie autorise les sessions directes et de channel, tout en refusant toujours les groupes.

    La valeur par défaut est DM uniquement. `match.keyPrefix` correspond à la clé de session normalisée ; `match.rawKeyPrefix` correspond à la clé brute incluant `agent:<id>:`.

  </Accordion>
  <Accordion title="Citations">
    `memory.citations` s'applique à tous les backends :

    | Valeur            | Comportement                                            |
    | ---------------- | --------------------------------------------------- |
    | `auto` (défaut) | Inclure le pied de page `Source: <path#line>` dans les extraits    |
    | `on`             | Toujours inclure le pied de page                               |
    | `off`            | Omettre le pied de page (le chemin est toujours passé en interne à l'agent) |

  </Accordion>
</AccordionGroup>

Les actualisations de démarrage QMD utilisent un chemin de sous-processus unique lors du démarrage de la passerelle. Le gestionnaire QMD à longue durée de vie possède toujours le surveillanceur de fichiers régulier et les minuteries d'intervalle lorsque la recherche mémoire est ouverte pour un usage interactif.

### Exemple QMD complet

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

## Dreaming

Dreaming est configuré sous `plugins.entries.memory-core.config.dreaming`, et non sous `agents.defaults.memorySearch`.

Dreaming s'exécute comme un balayage programmé unique et utilise des phases internes léger/profond/REM comme détail d'implémentation.

Pour le comportement conceptuel et les commandes slash, voir [Dreaming](/fr/concepts/dreaming).

### Paramètres utilisateur

| Clé                                    | Type      | Par défaut       | Description                                                                                                                                                   |
| -------------------------------------- | --------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                              | `boolean` | `false`          | Activer ou désactiver entièrement le rêve                                                                                                                     |
| `frequency`                            | `string`  | `0 3 * * *`      | Cadence cron facultative pour le balayage complet du rêve                                                                                                     |
| `model`                                | `string`  | model par défaut | Remplacement facultatif du model de sous-agent Dream Diary                                                                                                    |
| `phases.deep.maxPromotedSnippetTokens` | `number`  | `160`            | Nombre maximal estimé de jetons conservés pour chaque extrait de rappel à court terme promu vers `MEMORY.md` ; les métadonnées de provenance restent visibles |

### Exemple

```json5
{
  plugins: {
    entries: {
      "memory-core": {
        subagent: {
          allowModelOverride: true,
          allowedModels: ["anthropic/claude-sonnet-4-6"],
        },
        config: {
          dreaming: {
            enabled: true,
            frequency: "0 3 * * *",
            model: "anthropic/claude-sonnet-4-6",
          },
        },
      },
    },
  },
}
```

<Note>
- Dreaming écrit l'état de la machine dans `memory/.dreams/`.
- Dreaming écrit une sortie narrative lisible par l'homme dans `DREAMS.md` (ou `dreams.md` existant).
- `dreaming.model` utilise la passerelle de confiance des sous-agents de plugin existante ; définissez `plugins.entries.memory-core.subagent.allowModelOverride: true` avant de l'activer.
- Dream Diary réessaie une fois avec le model par défaut de la session lorsque le model configuré n'est pas disponible. Les échecs de confiance ou de liste d'autorisation sont consignés et ne font pas l'objet de nouvelles tentatives silencieuses.
- La politique et les seuils des phases léger/profond/REM constituent un comportement interne, et non une configuration orientée utilisateur.

</Note>

## Connexes

- [Référence de configuration](/fr/gateway/configuration-reference)
- [Aperçu de la mémoire](/fr/concepts/memory)
- [Recherche de mémoire](/fr/concepts/memory-search)
