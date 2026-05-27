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
Si vous cherchez l'interrupteur de fonctionnalité **active memory** et la configuration du sous-agent, elle se trouve sous `plugins.entries.active-memory` au lieu de `memorySearch`.

La mémoire active utilise un modèle à deux portes :

1. le plugin doit être activé et cibler l'identifiant de l'agent actuel
2. la requête doit être une session de chat persistante interactive éligible

Voir [Mémoire active](/fr/concepts/active-memory) pour le modèle d'activation, la configuration propriétaire du plugin, la persistance des transcriptions et le modèle de déploiement sûr.

</Note>

---

## Sélection du fournisseur

| Clé        | Type      | Par défaut              | Description                                                                                                                                                                                                                                                  |
| ---------- | --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `provider` | `string`  | détecté automatiquement | ID de l'adaptateur d'embeddings tel que `bedrock`, `deepinfra`, `gemini`, `github-copilot`, `local`, `mistral`, `ollama`, `openai`, ou `voyage` ; peut également être un `models.providers.<id>` configuré dont le `api` pointe vers l'un de ces adaptateurs |
| `model`    | `string`  | provider par défaut     | Nom du modèle d'embedding                                                                                                                                                                                                                                    |
| `fallback` | `string`  | `"none"`                | ID de l'adaptateur de secours si le principal échoue                                                                                                                                                                                                         |
| `enabled`  | `boolean` | `true`                  | Activer ou désactiver la recherche mémoire                                                                                                                                                                                                                   |

### Ordre de détection automatique

Quand `provider` n'est pas défini, OpenClaw sélectionne le premier disponible :

<Steps>
  <Step title="local">Sélectionné si `memorySearch.local.modelPath` est configuré et que le fichier existe.</Step>
  <Step title="github-copilot">Sélectionné si un jeton Copilot GitHub peut être résolu (env var ou profil d'auth).</Step>
  <Step title="openai">Sélectionné si une clé OpenAI peut être résolue.</Step>
  <Step title="gemini">Sélectionné si une clé Gemini peut être résolue.</Step>
  <Step title="voyage">Sélectionné si une clé Voyage peut être résolue.</Step>
  <Step title="mistral">Sélectionné si une clé Mistral peut être résolue.</Step>
  <Step title="deepinfra">Sélectionné si une clé DeepInfra peut être résolue.</Step>
  <Step title="bedrock">Sélectionné si la chaîne d'identification AWS SDK est résolue (rôle d'instance, clés d'accès, profil, SSO, identité Web ou configuration partagée).</Step>
</Steps>

`ollama` est pris en charge mais non détecté automatiquement (définissez-le explicitement).

### Identifiants de provider personnalisés

`memorySearch.provider` peut pointer vers une entrée `models.providers.<id>` personnalisée. OpenClaw résout le propriétaire `api` de ce provider pour l'adaptateur d'embedding tout en conservant l'identifiant du provider personnalisé pour la gestion du point de terminaison, de l'authentification et du préfixe de modèle. Cela permet aux configurations multi-GPU ou multi-hôte de dédier les embeddings de mémoire à un point de terminaison local spécifique :

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

Les intégrations à distance nécessitent une clé API. Bedrock utilise plutôt la chaîne de credentials par défaut du AWS SDK (rôles d'instance, SSO, clés d'accès).

| Provider       | Var d'environnement                                | Clé de config                            |
| -------------- | -------------------------------------------------- | ---------------------------------------- |
| Bedrock        | Chaîne de credentials AWS                          | Aucune clé API nécessaire                |
| DeepInfra      | `DEEPINFRA_API_KEY`                                | `models.providers.deepinfra.apiKey`      |
| Gemini         | `GEMINI_API_KEY`                                   | `models.providers.google.apiKey`         |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN` | Profil d'auth via connexion par appareil |
| Mistral        | `MISTRAL_API_KEY`                                  | `models.providers.mistral.apiKey`        |
| Ollama         | `OLLAMA_API_KEY` (espace réservé)                  | --                                       |
| OpenAI         | `OPENAI_API_KEY`                                   | `models.providers.openai.apiKey`         |
| Voyage         | `VOYAGE_API_KEY`                                   | `models.providers.voyage.apiKey`         |

<Note>Codex OAuth couvre uniquement la conversation/complétions et ne satisfait pas les requêtes d'intégration.</Note>

---

## Configuration du point de terminaison distant

Pour les points de terminaison personnalisés compatibles OpenAI ou pour remplacer les valeurs par défaut du provider :

<ParamField path="remote.baseUrl" type="string">
  URL de base de l'API personnalisée.
</ParamField>
<ParamField path="remote.apiKey" type="string">
  Remplacer la clé API.
</ParamField>
<ParamField path="remote.headers" type="object">
  En-têtes HTTP supplémentaires (fusionnés avec les valeurs par défaut du provider).
</ParamField>

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

## Configuration spécifique au provider

<AccordionGroup>
  <Accordion title="Gemini">
    | Clé                    | Type     | Valeur par défaut                | Description                                |
    | ---------------------- | -------- | ---------------------- | ------------------------------------------ |
    | `model`                | `string` | `gemini-embedding-001` | Prend également en charge `gemini-embedding-2-preview` |
    | `outputDimensionality` | `number` | `3072`                 | Pour Embedding 2 : 768, 1536 ou 3072        |

    <Warning>
    Changer le model ou la `outputDimensionality` déclenche une réindexation complète automatique.
    </Warning>

  </Accordion>
  <Accordion title="Types d'entrée compatibles OpenAI">
    Les points de terminaison d'embeddings compatibles OpenAI peuvent opter pour des champs de requête `input_type` spécifiques au provider. Ceci est utile pour les models d'embeddings asymétriques qui nécessitent des libellés différents pour les embeddings de requête et de document.

    | Clé                 | Type     | Valeur par défaut | Description                                             |
    | ------------------- | -------- | ------- | ------------------------------------------------------- |
    | `inputType`         | `string` | non défini   | `input_type` partagé pour les embeddings de requête et de document   |
    | `queryInputType`    | `string` | non défini   | `input_type` au moment de la requête; remplace `inputType`          |
    | `documentInputType` | `string` | non défini   | `input_type` d'index/document; remplace `inputType`      |

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "openai",
            remote: {
              baseUrl: "https://embeddings.example/v1",
              apiKey: "env:EMBEDDINGS_API_KEY",
            },
            model: "asymmetric-embedder",
            queryInputType: "query",
            documentInputType: "passage",
          },
        },
      },
    }
    ```

    La modification de ces valeurs affecte l'identité du cache d'embeddings pour l'indexation par lots du provider et doit être suivie d'une réindexation de la mémoire lorsque le model en amont traite les libellés différemment.

  </Accordion>
  <Accordion title="Bedrock">
    ### Configuration de l'embedding Bedrock

    Bedrock utilise la chaîne de credentials par défaut du AWS SDK — aucune clé API n'est nécessaire. Si OpenClaw s'exécute sur EC2 avec un rôle d'instance activé pour Bedrock, définissez simplement le fournisseur et le modèle :

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
    | `model`                | `string` | `amazon.titan-embed-text-v2:0` | ID de n'importe quel modèle d'embedding Bedrock |
    | `outputDimensionality` | `number` | modèle par défaut              | Pour Titan V2 : 256, 512 ou 1024 |

    **Modèles pris en charge** (avec détection de famille et valeurs par défaut des dimensions) :

    | ID du modèle                                | Fournisseur | Dims par défaut | Dims configurables   |
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

    Les variantes avec suffixe de débit (par ex., `amazon.titan-embed-text-v1:2:8k`) héritent de la configuration du modèle de base.

    **Authentification :** l'authentification Bedrock utilise l'ordre de résolution des credentials standard du AWS SDK :

    1. Variables d'environnement (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`)
    2. Cache de jetons SSO
    3. Identifiants de jeton d'identité Web
    4. Fichiers de credentials et de configuration partagés
    5. Identifiants de métadonnées ECS ou EC2

    La région est résolue à partir de `AWS_REGION`, `AWS_DEFAULT_REGION`, du `baseUrl` du fournisseur `amazon-bedrock`, ou par défaut `us-east-1`.

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
    | Clé                   | Type               | Valeur par défaut                | Description                                                                                                                                                                                                                                                                                                          |
    | --------------------- | ------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `local.modelPath`     | `string`           | téléchargé auto        | Chemin vers le fichier de modèle GGUF                                                                                                                                                                                                                                                                                              |
    | `local.modelCacheDir` | `string`           | node-llama-cpp par défaut | Répertoire de cache pour les modèles téléchargés                                                                                                                                                                                                                                                                                      |
    | `local.contextSize`   | `number \| "auto"` | `4096`                 | Taille de la fenêtre de contexte pour le contexte d'embeddings. 4096 couvre les segments typiques (128–512 tokens) tout en limitant la VRAM non-poids. Abaissez à 1024–2048 sur les hôtes contraints. `"auto"` utilise le maximum entraîné du modèle — non recommandé pour les modèles 8B+ (Qwen3-Embedding-8B : 40 960 tokens → ~32 Go VRAM contre ~8,8 Go à 4096). |

    Modèle par défaut : `embeddinggemma-300m-qat-Q8_0.gguf` (~0,6 Go, téléchargé auto). Les checkouts source nécessitent toujours l'approbation de la build native : `pnpm approve-builds` puis `pnpm rebuild node-llama-cpp`CLIGateway.

    Utilisez la CLI autonome pour vérifier le même chemin de fournisseur que celui utilisé par la Gateway :

    ```bash
    openclaw memory status --deep --agent main
    openclaw memory index --force --agent main
    ```

    Si `provider` est `auto`, `local` n'est sélectionné que si `local.modelPath` pointe vers un fichier local existant. Les références de modèle `hf:` et HTTP(S) peuvent toujours être utilisées explicitement avec `provider: "local"`, mais elles ne font pas en sorte que `auto` sélectionne local avant que le modèle ne soit disponible sur le disque.

  </Accordion>
</AccordionGroup>

### Délai d'expiration de l'embeddings en ligne

<ParamField path="sync.embeddingBatchTimeoutSeconds" type="number">
  Remplace le délai d'expiration pour les lots d'embeddings en ligne pendant l'indexation de la mémoire.

Non défini utilise la valeur par défaut du fournisseur : 600 secondes pour les fournisseurs locaux/auto-hébergés tels que `local`, `ollama` et `lmstudio`, et 120 secondes pour les fournisseurs hébergés. Augmentez cette valeur lorsque les lots d'intégration locaux limités par le CPU sont sains mais lents.

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

    Les fichiers pérennes (`MEMORY.md`, fichiers non datés dans `memory/`) ne sont jamais dépréciés.

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

Pour la recherche de transcriptions inter-agents étendue à l'agent, utilisez `agents.list[].memorySearch.qmd.extraCollections` au lieu de `memory.qmd.paths`. Ces collections supplémentaires suivent la même structure `{ path, name, pattern? }`, mais elles sont fusionnées par agent et peuvent conserver des noms partagés explicites lorsque le chemin pointe en dehors de l'espace de travail actuel. Si le même chemin résolu apparaît à la fois dans `memory.qmd.paths` et `memorySearch.qmd.extraCollections`, QMD conserve la première entrée et ignore le doublon.

---

## Mémoire multimodale (Gemini)

Indexer les images et l'audio avec le Markdown en utilisant Gemini Embedding 2 :

| Clé                       | Type       | Par défaut | Description                                  |
| ------------------------- | ---------- | ---------- | -------------------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`    | Activer l'indexation multimodale             |
| `multimodal.modalities`   | `string[]` | --         | `["image"]`, `["audio"]` ou `["all"]`        |
| `multimodal.maxFileBytes` | `number`   | `10000000` | Taille maximale du fichier pour l'indexation |

<Note>S'applique uniquement aux fichiers dans `extraPaths`. Les racines de mémoire par défaut restent en Markdown uniquement. Nécessite `gemini-embedding-2-preview`. `fallback` doit être `"none"`.</Note>

Formats pris en charge : `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.heic`, `.heif` (images) ; `.mp3`, `.wav`, `.ogg`, `.opus`, `.m4a`, `.aac`, `.flac` (audio).

---

## Cache d'incorporation

| Clé                | Type      | Par défaut | Description                                          |
| ------------------ | --------- | ---------- | ---------------------------------------------------- |
| `cache.enabled`    | `boolean` | `true`     | Mettre en cache les embeddings de chunks dans SQLite |
| `cache.maxEntries` | `number`  | `50000`    | Max cached embeddings                                |

Empêche de ré-embedded du texte inchangé lors de la réindexation ou des mises à jour de transcription.

---

## Indexation par lots

| Clé                           | Type      | Par défaut | Description                             |
| ----------------------------- | --------- | ---------- | --------------------------------------- |
| `remote.nonBatchConcurrency`  | `number`  | `4`        | Embeddings en ligne parallèles          |
| `remote.batch.enabled`        | `boolean` | `false`    | Activer l'API d'embedding par lot       |
| `remote.batch.concurrency`    | `number`  | `2`        | Tâches de traitement par lot parallèles |
| `remote.batch.wait`           | `boolean` | `true`     | Attendre la fin du lot                  |
| `remote.batch.pollIntervalMs` | `number`  | --         | Intervalle d'interrogation              |
| `remote.batch.timeoutMinutes` | `number`  | --         | Délai d'expiration du lot               |

Disponible pour `openai`, `gemini` et `voyage`. Le traitement par lot OpenAI est généralement le plus rapide et le moins coûteux pour les remplissages massifs.

`remote.nonBatchConcurrency` contrôle les appels d'embedding en ligne utilisés par les providers locaux/auto-hébergés et les providers hébergés lorsque les API de traitement par lot du provider ne sont pas actives. Ollama est par défaut réglé à `1` pour l'indexation non par lot afin d'éviter de surcharger les petits hôtes locaux ; définissez une valeur plus élevée sur les machines plus importantes.

C'est distinct de `sync.embeddingBatchTimeoutSeconds`, qui contrôle le délai d'expiration des appels d'embedding en ligne.

---

## Recherche dans la mémoire de session (expérimental)

Indexer les transcriptions de session et les rendre accessibles via `memory_search` :

| Clé                           | Type       | Par défaut   | Description                                          |
| ----------------------------- | ---------- | ------------ | ---------------------------------------------------- |
| `experimental.sessionMemory`  | `boolean`  | `false`      | Activer l'indexation des sessions                    |
| `sources`                     | `string[]` | `["memory"]` | Ajoutez `"sessions"` pour inclure les transcriptions |
| `sync.sessions.deltaBytes`    | `number`   | `100000`     | Seuil d'octets pour la réindexation                  |
| `sync.sessions.deltaMessages` | `number`   | `50`         | Seuil de messages pour la réindexation               |

<Warning>L'indexation de session est optionnelle et s'exécute de manière asynchrone. Les résultats peuvent être légèrement périmés. Les journaux de session résident sur le disque, traitez donc l'accès au système de fichiers comme la frontière de confiance.</Warning>

---

## Accélération vectorielle SQLite (sqlite-vec)

| Clé                          | Type      | Par défaut | Description                                        |
| ---------------------------- | --------- | ---------- | -------------------------------------------------- |
| `store.vector.enabled`       | `boolean` | `true`     | Utiliser sqlite-vec pour les requêtes vectorielles |
| `store.vector.extensionPath` | `string`  | bundled    | Remplacer le chemin de sqlite-vec                  |

Lorsque sqlite-vec n'est pas disponible, OpenClaw revient automatiquement à la similarité cosinus en cours de processus.

---

## Stockage des index

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
| `sessions.exportDir`     | `string`  | --         | Répertoire d'exportation                                                                                  |

`searchMode: "search"`OpenClaw est uniquement lexical/BM25. OpenClaw n'exécute pas de sondages de disponibilité des vecteurs sémantiques ni de maintenance des embeddings QMD pour ce mode, y compris pendant `memory status --deep` ; `vsearch` et `query` continuent d'exiger la disponibilité des vecteurs QMD et les embeddings.

OpenClaw privilégie les collections QMD actuelles et les formes de requêtes MCP, mais maintient le fonctionnement des anciennes versions de QMD en essayant, si nécessaire, les indicateurs de modèle de collection compatibles et les anciens noms d'outils MCP. Lorsque QMD annonce la prise en charge de plusieurs filtres de collection, les collections de même source sont recherchées par un seul processus QMD ; les anciennes versions de QMD conservent le chemin de compatibilité par collection. De même source signifie que les collections de mémoire durable sont regroupées, tandis que les collections de transcriptions de session restent un groupe distinct, afin que la diversification des sources ait toujours les deux entrées.

<Note>Les substitutions de modèle QMD restent du côté de QMD, et non dans la configuration d'OpenClaw. Si vous devez substituer globalement les modèles de QMD, définissez des variables d'environnement telles que OpenClaw`QMD_EMBED_MODEL`, `QMD_RERANK_MODEL` et `QMD_GENERATE_MODEL` dans l'environnement d'exécution de la passerelle.</Note>

<AccordionGroup>
  <Accordion title="Planification des mises à jour">
    | Clé                       | Type      | Par défaut | Description                           |
    | ------------------------- | --------- | ------- | ------------------------------------- |
    | `update.interval`         | `string`  | `5m`    | Intervalle d'actualisation                      |
    | `update.debounceMs`       | `number`  | `15000` | Anti-rebond pour les modifications de fichiers                 |
    | `update.onBoot`           | `boolean` | `true`  | Actualiser à l'ouverture du gestionnaire QMD persistant ; conditionne également l'actualisation au démarrage (opt-in) |
    | `update.startup`          | `string`  | `off`   | Actualisation optionnelle au démarrage de la passerelle : `off`, `idle` ou `immediate` |
    | `update.startupDelayMs`   | `number`  | `120000` | Délai avant l'exécution de l'actualisation `startup: "idle"` |
    | `update.waitForBootSync`  | `boolean` | `false` | Bloquer l'ouverture du gestionnaire jusqu'à la fin de son actualisation initiale |
    | `update.embedInterval`    | `string`  | --      | Cadence d'incorporation séparée                |
    | `update.commandTimeoutMs` | `number`  | --      | Délai d'attente pour les commandes QMD              |
    | `update.updateTimeoutMs`  | `number`  | --      | Délai d'attente pour les opérations de mise à jour QMD     |
    | `update.embedTimeoutMs`   | `number`  | --      | Délai d'attente pour les opérations d'incorporation QMD      |
  </Accordion>
  <Accordion title="Limits">
    | Clé                       | Type     | Par défaut | Description                |
    | ------------------------- | -------- | ------- | -------------------------- |
    | `limits.maxResults`       | `number` | `6`     | Résultats max de recherche         |
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

    La valeur par défaut livrée autorise les sessions directes et de channel, tout en refusant toujours les groupes.

    La valeur par défaut est DM-only. `match.keyPrefix` correspond à la clé de session normalisée ; `match.rawKeyPrefix` correspond à la clé brute incluant `agent:<id>:`.

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

Les actualisations au démarrage QMD utilisent un chemin de sous-processus unique lors du démarrage de la passerelle. Le gestionnaire QMD à longue durée de vie possède toujours l'observateur de fichiers régulier et les minuteries d'intervalle lorsque la recherche mémoire est ouverte pour un usage interactif.

### Exemple complet QMD

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

Le rêve s'exécute comme un balayage programmé unique et utilise des phases internes léger/profond/REM comme détail d'implémentation.

Pour le comportement conceptuel et les commandes slash, voir [Dreaming](/fr/concepts/dreaming).

### Paramètres utilisateur

| Clé         | Type      | Par défaut       | Description                                                 |
| ----------- | --------- | ---------------- | ----------------------------------------------------------- |
| `enabled`   | `boolean` | `false`          | Activer ou désactiver entièrement le rêve                   |
| `frequency` | `string`  | `0 3 * * *`      | Cadence cron facultative pour le balayage complet de rêve   |
| `model`     | `string`  | model par défaut | Remplacement facultatif du modèle de sous-agent Dream Diary |

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
- Le rêve écrit une sortie narrative lisible par l'homme dans `DREAMS.md` (ou `dreams.md` existant).
- `dreaming.model` utilise la porte de confiance de sous-agent de plugin existante ; définissez `plugins.entries.memory-core.subagent.allowModelOverride: true` avant de l'activer.
- Dream Diary réessaie une fois avec le model par défaut de la session lorsque le model configuré n'est pas disponible. Les échecs de confiance ou de liste blanche sont consignés et ne sont pas réessayés silencieusement.
- La politique et les seuils des phases léger/profond/REM sont un comportement interne, pas une configuration面向 l'utilisateur.

</Note>

## Connexes

- [Référence de configuration](/fr/gateway/configuration-reference)
- [Aperçu de la mémoire](/fr/concepts/memory)
- [Recherche de mémoire](/fr/concepts/memory-search)
