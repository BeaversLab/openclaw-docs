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
Si vous recherchez l'option d'activation de la fonctionnalité **active memory** et la configuration du sous-agent, elle se trouve sous `plugins.entries.active-memory` au lieu de `memorySearch`.

La mémoire active utilise un modèle à deux niveaux :

1. le plugin doit être activé et cibler l'ID de l'agent actuel
2. la demande doit être une session de conversation persistante interactive éligible

Voir [Active Memory](/fr/concepts/active-memory) pour le modèle d'activation, la configuration propriétaire du plugin, la persistance des transcriptions et le modèle de déploiement sécurisé.

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

### ID de provider personnalisés

`memorySearch.provider` peut pointer vers une entrée `models.providers.<id>` personnalisée pour des adaptateurs de provider spécifiques à la mémoire tels que `ollama`, ou pour des APIs de modèles compatibles avec OpenAI telles que `openai-responses` / `openai-completions`. OpenClaw résout le propriétaire `api` de ce provider pour l'adaptateur d'incorporation tout en préservant l'identifiant de provider personnalisé pour la gestion du point de terminaison, de l'authentification et du préfixe de modèle. Cela permet aux configurations multi-GPU ou multi-hôte de dédiér les incorporations de mémoire à un point de terminaison local spécifique :

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

### Résolution de la clé API

Les incorporations distantes nécessitent une clé API. Bedrock utilise à la place la chaîne de credentials par défaut du AWS SDK (rôles d'instance, SSO, clés d'accès).

| Provider       | Variable d'env                                     | Clé de config                        |
| -------------- | -------------------------------------------------- | ------------------------------------ |
| Bedrock        | Chaîne de credentials AWS                          | Pas de clé API nécessaire            |
| DeepInfra      | `DEEPINFRA_API_KEY`                                | `models.providers.deepinfra.apiKey`  |
| Gemini         | `GEMINI_API_KEY`                                   | `models.providers.google.apiKey`     |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN` | Profil d'auth via connexion appareil |
| Mistral        | `MISTRAL_API_KEY`                                  | `models.providers.mistral.apiKey`    |
| Ollama         | `OLLAMA_API_KEY` (espace réservé)                  | --                                   |
| OpenAI         | `OPENAI_API_KEY`                                   | `models.providers.openai.apiKey`     |
| Voyage         | `VOYAGE_API_KEY`                                   | `models.providers.voyage.apiKey`     |

<Note>Codex OAuth couvre uniquement le chat/les complétions et ne satisfait pas les demandes d'incorporation.</Note>

---

## Config du point de terminaison distant

Utilisez `provider: "openai-compatible"` pour un serveur générique compatible avec OpenAI
`/v1/embeddings` qui ne doit pas hériter des credentials de chat OpenAI globaux.

<ParamField path="remote.baseUrl" type="string" API>
  URL de base de l'API personnalisée.
</ParamField>
<ParamField path="remote.apiKey" type="string" API>
  Clé d'API de substitution.
</ParamField>
<ParamField path="remote.headers" type="object">
  En-têtes HTTP supplémentaires (fusionnés avec ceux par défaut du provider).
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

## Configuration spécifique au provider

<AccordionGroup>
  <Accordion title="Gemini">
    | Clé                    | Type     | Par défaut                | Description                                |
    | ---------------------- | -------- | ---------------------- | ------------------------------------------ |
    | `model`                | `string` | `gemini-embedding-001` | Prend également en charge `gemini-embedding-2-preview` |
    | `outputDimensionality` | `number` | `3072`                 | Pour Embedding 2 : 768, 1536 ou 3072        |

    <Warning>
    Changer le model ou le `outputDimensionality` déclenche une réindexation complète automatique.
    </Warning>

  </Accordion>
  <Accordion title="OpenAITypes d'entrée compatibles avec OpenAI"OpenAI>
    Les points de terminaison d'incorporation compatibles avec OpenAI peuvent choisir des champs de requête `input_type` spécifiques au fournisseur. Ceci est utile pour les modèles d'incorporation asymétriques qui nécessitent des étiquettes différentes pour les incorporations de requêtes et de documents.

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

    La modification de ces valeurs affecte l'identité du cache d'incorporation pour l'indexation par lots du fournisseur et doit être suivie d'une réindexation de la mémoire lorsque le modèle en amont traite les étiquettes différemment.

  </Accordion>
  <Accordion title="Bedrock">
    ### Configuration de l'incorporation Bedrock

    Bedrock utilise la chaîne de credentials par défaut du SDK AWS — aucune clé API n'est nécessaire. Si OpenClaw s'exécute sur EC2 avec un rôle d'instance activé pour Bedrock, définissez simplement le provider et le model :

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
    | `model`                | `string` | `amazon.titan-embed-text-v2:0` | Identifiant de n'importe quel modèle d'incorporation Bedrock |
    | `outputDimensionality` | `number` | défaut du modèle               | Pour Titan V2 : 256, 512 ou 1024 |

    **Modèles pris en charge** (avec détection de famille et dimensions par défaut) :

    | Identifiant du modèle                      | Provider   | Dimensions par défaut | Dimensions configurables |
    | ------------------------------------------ | ---------- | -------------- | ------------------------ |
    | `amazon.titan-embed-text-v2:0`             | Amazon     | 1024           | 256, 512, 1024           |
    | `amazon.titan-embed-text-v1`               | Amazon     | 1536           | --                       |
    | `amazon.titan-embed-g1-text-02`            | Amazon     | 1536           | --                       |
    | `amazon.titan-embed-image-v1`              | Amazon     | 1024           | --                       |
    | `amazon.nova-2-multimodal-embeddings-v1:0` | Amazon     | 1024           | 256, 384, 1024, 3072     |
    | `cohere.embed-english-v3`                  | Cohere     | 1024           | --                       |
    | `cohere.embed-multilingual-v3`             | Cohere     | 1024           | --                       |
    | `cohere.embed-v4:0`                        | Cohere     | 1536           | 256-1536                 |
    | `twelvelabs.marengo-embed-3-0-v1:0`        | TwelveLabs | 512            | --                       |
    | `twelvelabs.marengo-embed-2-7-v1:0`        | TwelveLabs | 1024           | --                       |

    Les variantes avec suffixe de débit (par exemple, `amazon.titan-embed-text-v1:2:8k`) héritent de la configuration du modèle de base.

    **Authentification :** L'authentification Bedrock utilise l'ordre de résolution des credentials standard du SDK AWS :

    1. Variables d'environnement (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`)
    2. Cache de jetons SSO
    3. Informations d'identification de jeton d'identité Web
    4. Fichiers de credentials et de configuration partagés
    5. Informations d'identification des métadonnées ECS ou EC2

    La région est résolue à partir de `AWS_REGION`, `AWS_DEFAULT_REGION`, du `baseUrl` du provider `amazon-bedrock`, ou par défaut `us-east-1`.

    **Autorisations IAM :** le rôle ou l'utilisateur IAM a besoin de :

    ```json
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "*"
    }
    ```

    Pour le principe du moindre privilège, limitez `InvokeModel` au modèle spécifique :

    ```
    arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0
    ```

  </Accordion>
  <Accordion title="Local (GGUF + node-llama-cpp)">
    | Key                   | Type               | Default                | Description                                                                                                                                                                                                                                                                                                          |
    | --------------------- | ------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `local.modelPath`     | `string`           | auto-downloaded        | Chemin d'accès au fichier de modèle GGUF                                                                                                                                                                                                                                                                              |
    | `local.modelCacheDir` | `string`           | node-llama-cpp default | Répertoire de cache pour les modèles téléchargés                                                                                                                                                                                                                                                                      |
    | `local.contextSize`   | `number \| "auto"` | `4096`                 | Taille de la fenêtre de contexte pour le contexte d'incorporation. 4096 couvre les segments typiques (128–512 jetons) tout en limitant la VRAM non pondérée. Réduisez à 1024–2048 sur les hôtes contraints. `"auto"` utilise le maximum entraîné du modèle — non recommandé pour les modèles 8B+ (Qwen3-Embedding-8B: 40 960 jetons → ~32 Go VRAM contre ~8,8 Go à 4096). |

    Modèle par défaut : `embeddinggemma-300m-qat-Q8_0.gguf` (~0,6 Go, téléchargé automatiquement). Les extractions de source nécessitent toujours une approbation de compilation native : `pnpm approve-builds` puis `pnpm rebuild node-llama-cpp`.

    Utilisez le CLI autonome pour vérifier le même chemin de provider que celui utilisé par la Gateway :

    ```bash
    openclaw memory status --deep --agent main
    openclaw memory index --force --agent main
    ```

    Définissez `provider: "local"` explicitement pour les incorporations GGUF locales. Les références de modèle `hf:` et HTTP(S) sont prises en charge pour les configurations locales explicites, mais elles ne modifient pas le provider par défaut.

  </Accordion>
</AccordionGroup>

### Délai d'attente pour l'incorporation en ligne

<ParamField path="sync.embeddingBatchTimeoutSeconds" type="number">
  Remplacer le délai d'attente pour les lots d'incorporation en ligne lors de l'indexation de la mémoire.

Non défini utilise la valeur par défaut du provider : 600 secondes pour les providers locaux/auto-hébergés tels que `local`, `ollama`, et `lmstudio`, et 120 secondes pour les providers hébergés. Augmentez cette valeur lorsque les lots d'embeddings locaux limités par le CPU sont sains mais lents.

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
    | `mmr.enabled` | `boolean` | `false` | Activer le re-classement MMR                |
    | `mmr.lambda`  | `number`  | `0.7`   | 0 = diversité max, 1 = pertinence max |
  </Tab>
  <Tab title="Décroissance temporelle (récence)">
    | Clé                          | Type      | Par défaut | Description               |
    | ---------------------------- | --------- | ---------- | ------------------------- |
    | `temporalDecay.enabled`      | `boolean` | `false` | Activer le boost de récence      |
    | `temporalDecay.halfLifeDays` | `number`  | `30`    | Le score diminue de moitié tous les N jours |

    Les fichiers persistants (`MEMORY.md`, fichiers non datés dans `memory/`) ne sont jamais dépréciés.

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

Pour la recherche de transcriptions inter-agents avec portée d'agent, utilisez `agents.list[].memorySearch.qmd.extraCollections` au lieu de `memory.qmd.paths`. Ces collections supplémentaires suivent la même structure `{ path, name, pattern? }`, mais elles sont fusionnées par agent et peuvent préserver les noms partagés explicites lorsque le chemin pointe en dehors de l'espace de travail actuel. Si le même chemin résolu apparaît à la fois dans `memory.qmd.paths` et `memorySearch.qmd.extraCollections`, QMD conserve la première entrée et ignore le doublon.

---

## Mémoire multimodale (Gemini)

Indexer les images et l'audio avec le Markdown en utilisant Gemini Embedding 2 :

| Clé                       | Type       | Par défaut | Description                                    |
| ------------------------- | ---------- | ---------- | ---------------------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`    | Activer l'indexation multimodale               |
| `multimodal.modalities`   | `string[]` | --         | `["image"]`, `["audio"]`, ou `["all"]`         |
| `multimodal.maxFileBytes` | `number`   | `10000000` | Taille maximale des fichiers pour l'indexation |

<Note>S'applique uniquement aux fichiers dans `extraPaths`. Les racines de mémoire par défaut restent limitées au Markdown. Nécessite `gemini-embedding-2-preview`. `fallback` doit être `"none"`.</Note>

Formats pris en charge : `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.heic`, `.heif` (images) ; `.mp3`, `.wav`, `.ogg`, `.opus`, `.m4a`, `.aac`, `.flac` (audio).

---

## Cache d'embeddings

| Clé                | Type      | Par défaut | Description                                            |
| ------------------ | --------- | ---------- | ------------------------------------------------------ |
| `cache.enabled`    | `boolean` | `true`     | Mettre en cache les embeddings de segments dans SQLite |
| `cache.maxEntries` | `number`  | `50000`    | Max cached embeddings                                  |

Empêche de ré-encoder le texte inchangé lors de la réindexation ou des mises à jour de transcription.

---

## Indexation par lots

| Key                           | Type      | Default | Description                          |
| ----------------------------- | --------- | ------- | ------------------------------------ |
| `remote.nonBatchConcurrency`  | `number`  | `4`     | Embeddings en ligne parallèles       |
| `remote.batch.enabled`        | `boolean` | `false` | Activer l'API d'intégration par lots |
| `remote.batch.concurrency`    | `number`  | `2`     | Tâches parallèles par lots           |
| `remote.batch.wait`           | `boolean` | `true`  | Attendre la fin du lot               |
| `remote.batch.pollIntervalMs` | `number`  | --      | Intervalle d'interrogation           |
| `remote.batch.timeoutMinutes` | `number`  | --      | Délai d'attente du lot               |

Disponible pour `openai`, `gemini` et `voyage`. Le traitement par lot OpenAI est généralement le plus rapide et le moins coûteux pour les importants remplissages de données.

`remote.nonBatchConcurrency` contrôle les appels d'embedding en ligne utilisés par les providers locaux/auto-hébergés et les providers hébergés lorsque les API de traitement par lot des providers ne sont pas actives. Ollama utilise par défaut `1` pour l'indexation non par lot afin d'éviter de surcharger les hôtes locaux plus petits ; définissez une valeur plus élevée sur les machines plus grandes.

Ceci est distinct de `sync.embeddingBatchTimeoutSeconds`, qui contrôle le délai d'attente pour les appels d'embedding en ligne.

---

## Recherche dans la mémoire de session (expérimental)

Indexer les transcriptions de session et les afficher via `memory_search` :

| Key                           | Type       | Default      | Description                                          |
| ----------------------------- | ---------- | ------------ | ---------------------------------------------------- |
| `experimental.sessionMemory`  | `boolean`  | `false`      | Activer l'indexation des sessions                    |
| `sources`                     | `string[]` | `["memory"]` | Ajouter `"sessions"` pour inclure les transcriptions |
| `sync.sessions.deltaBytes`    | `number`   | `100000`     | Seuil en octets pour la réindexation                 |
| `sync.sessions.deltaMessages` | `number`   | `50`         | Message threshold for reindex                        |

<Warning>Session indexing is opt-in and runs asynchronously. Results can be slightly stale. Session logs live on disk, so treat filesystem access as the trust boundary.</Warning>

---

## SQLite vector acceleration (sqlite-vec)

| Key                          | Type      | Default | Description                       |
| ---------------------------- | --------- | ------- | --------------------------------- |
| `store.vector.enabled`       | `boolean` | `true`  | Use sqlite-vec for vector queries |
| `store.vector.extensionPath` | `string`  | bundled | Override sqlite-vec path          |

When sqlite-vec is unavailable, OpenClaw falls back to in-process cosine similarity automatically.

---

## Index storage

| Key                   | Type     | Default                               | Description                                 |
| --------------------- | -------- | ------------------------------------- | ------------------------------------------- |
| `store.path`          | `string` | `~/.openclaw/memory/{agentId}.sqlite` | Index location (supports `{agentId}` token) |
| `store.fts.tokenizer` | `string` | `unicode61`                           | FTS5 tokenizer (`unicode61` or `trigram`)   |

---

## QMD backend config

Set `memory.backend = "qmd"` to enable. All QMD settings live under `memory.qmd`:

| Key                      | Type      | Default  | Description                                                                           |
| ------------------------ | --------- | -------- | ------------------------------------------------------------------------------------- |
| `command`                | `string`  | `qmd`    | QMD executable path; set an absolute path when service `PATH` differs from your shell |
| `searchMode`             | `string`  | `search` | Search command: `search`, `vsearch`, `query`                                          |
| `includeDefaultMemory`   | `boolean` | `true`   | Auto-index `MEMORY.md` + `memory/**/*.md`                                             |
| `paths[]`                | `array`   | --       | Extra paths: `{ name, path, pattern? }`                                               |
| `sessions.enabled`       | `boolean` | `false`  | Index session transcripts                                                             |
| `sessions.retentionDays` | `number`  | --       | Conservation des transcriptions                                                       |
| `sessions.exportDir`     | `string`  | --       | Répertoire d'exportation                                                              |

`searchMode: "search"` est purement lexical/BM25. OpenClaw n'exécute pas de sondages de disponibilité des vecteurs sémantiques ni de maintenance des intégrations QMD pour ce mode, y compris durant `memory status --deep` ; `vsearch` et `query` continuent d'exiger la disponibilité des vecteurs QMD et les intégrations.

OpenClaw privilégie les formes actuelles de collections QMD et de requêtes MCP, mais maintient le fonctionnement des anciennes versions de QMD en essayant, si nécessaire, les indicateurs de modèle de collection compatibles et les anciens noms d'outils MCP. Lorsque QMD annonce la prise en charge de plusieurs filtres de collection, les collections de même source sont recherchées par un seul processus QMD ; les anciennes versions de QMD conservent le chemin de compatibilité par collection. Même source signifie que les collections de mémoire durable sont regroupées, tandis que les collections de transcriptions de session restent un groupe distinct, afin que la diversification des sources ait toujours les deux entrées.

<Note>Les redéfinitions de modèles QMD restent du côté de QMD, et non dans la configuration OpenClaw. Si vous devez redéfinir globalement les modèles de QMD, définissez des variables d'environnement telles que `QMD_EMBED_MODEL`, `QMD_RERANK_MODEL` et `QMD_GENERATE_MODEL` dans l'environnement d'exécution de la passerelle.</Note>

<AccordionGroup>
  <Accordion title="Planification des mises à jour">
    | Clé                       | Type      | Par défaut | Description                           |
    | ------------------------- | --------- | ------- | ------------------------------------- |
    | `update.interval`         | `string`  | `5m`    | Intervalle d'actualisation                      |
    | `update.debounceMs`       | `number`  | `15000` | Ant rebond pour les modifications de fichiers                 |
    | `update.onBoot`           | `boolean` | `true`  | Actualiser à l'ouverture du gestionnaire QMD persistant ; conditionne également l'actualisation au démarrage optionnelle |
    | `update.startup`          | `string`  | `off`   | Actualisation optionnelle au démarrage de la passerelle : `off`, `idle`, ou `immediate` |
    | `update.startupDelayMs`   | `number`  | `120000` | Délai avant l'exécution de l'actualisation `startup: "idle"` |
    | `update.waitForBootSync`  | `boolean` | `false` | Bloquer l'ouverture du gestionnaire jusqu'à ce que son actualisation initiale soit terminée |
    | `update.embedInterval`    | `string`  | --      | Cadence d'intégration séparée                |
    | `update.commandTimeoutMs` | `number`  | --      | Délai d'expiration pour les commandes QMD              |
    | `update.updateTimeoutMs`  | `number`  | --      | Délai d'expiration pour les opérations de mise à jour QMD     |
    | `update.embedTimeoutMs`   | `number`  | --      | Délai d'expiration pour les opérations d'intégration QMD      |
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
    | `off`            | Omettre le pied de page (le chemin est toujours transmis en interne à l'agent) |

  </Accordion>
</AccordionGroup>

Les actualisations au démarrage QMD utilisent un chemin de sous-processus unique lors du démarrage de la passerelle. Le gestionnaire QMD à longue durée de vie possède toujours l'observateur de fichiers régulier et les minuteurs d'intervalle lorsque la recherche de mémoire est ouverte pour un usage interactif.

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

## Rêve

Le rêve est configuré sous `plugins.entries.memory-core.config.dreaming`, et non sous `agents.defaults.memorySearch`.

Le rêve s'exécute sous la forme d'un balayage programmé unique et utilise des phases internes léger/profond/REM comme détail d'implémentation.

Pour le comportement conceptuel et les commandes slash, voir [Rêve](/fr/concepts/dreaming).

### Paramètres utilisateur

| Clé                                    | Type      | Par défaut       | Description                                                                                                                                                    |
| -------------------------------------- | --------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                              | `boolean` | `false`          | Activer ou désactiver entièrement le rêve                                                                                                                      |
| `frequency`                            | `string`  | `0 3 * * *`      | Cadence cron facultative pour le balayage de rêve complet                                                                                                      |
| `model`                                | `string`  | model par défaut | Remplacement facultatif du model de sous-agent Dream Diary                                                                                                     |
| `phases.deep.maxPromotedSnippetTokens` | `number`  | `160`            | Nombre maximum de jetons estimés conservés pour chaque extrait de rappel à court terme promu vers `MEMORY.md` ; les métadonnées de provenance restent visibles |

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
- Le rêve écrit l'état de la machine dans `memory/.dreams/`.
- Le rêve écrit la sortie narrative lisible par l'homme dans `DREAMS.md` (ou le `dreams.md` existant).
- `dreaming.model` utilise la porte de confiance de sous-agent de plugin existante ; définissez `plugins.entries.memory-core.subagent.allowModelOverride: true` avant de l'activer.
- Dream Diary réessaie une fois avec le model par défaut de la session lorsque le model configuré n'est pas disponible. Les échecs de confiance ou de liste blanche sont enregistrés et ne font pas l'objet de nouvelles tentatives silencieuses.
- La politique et les seuils des phases léger/profond/REM sont un comportement interne, et non une configuration orientée utilisateur.

</Note>

## Connexes

- [Référence de configuration](/fr/gateway/configuration-reference)
- [Aperçu de la mémoire](/fr/concepts/memory)
- [Recherche mémoire](/fr/concepts/memory-search)
