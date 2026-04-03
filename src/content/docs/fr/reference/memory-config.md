---
title: "Référence de configuration de la mémoire"
summary: "Tous les paramètres de configuration pour la recherche de mémoire, les fournisseurs d'embeddings, QMD, la recherche hybride et l'indexation multimodale"
read_when:
  - You want to configure memory search providers or embedding models
  - You want to set up the QMD backend
  - You want to tune hybrid search, MMR, or temporal decay
  - You want to enable multimodal memory indexing
---

# Référence de configuration de la mémoire

Cette page répertorie chaque paramètre de configuration pour la recherche de mémoire OpenClaw. Pour
les aperçus conceptuels, voir :

- [Aperçu de la mémoire](/en/concepts/memory) -- fonctionnement de la mémoire
- [Moteur intégré](/en/concepts/memory-builtin) -- backend SQLite par défaut
- [Moteur QMD](/en/concepts/memory-qmd) -- sidecar local-first
- [Recherche de mémoire](/en/concepts/memory-search) -- pipeline et réglage de la recherche

Tous les paramètres de recherche de mémoire se trouvent sous `agents.defaults.memorySearch` dans
`openclaw.json` sauf indication contraire.

---

## Sélection du fournisseur

| Clé        | Type      | Par défaut              | Description                                                                                 |
| ---------- | --------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| `provider` | `string`  | détecté automatiquement | ID de l'adaptateur d'embedding : `openai`, `gemini`, `voyage`, `mistral`, `ollama`, `local` |
| `model`    | `string`  | fournisseur par défaut  | Nom du modèle d'embedding                                                                   |
| `fallback` | `string`  | `"none"`                | ID de l'adaptateur de secours si le principal échoue                                        |
| `enabled`  | `boolean` | `true`                  | Activer ou désactiver la recherche de mémoire                                               |

### Ordre de détection automatique

Lorsque `provider` n'est pas défini, OpenClaw sélectionne le premier disponible :

1. `local` -- si `memorySearch.local.modelPath` est configuré et que le fichier existe.
2. `openai` -- si une clé OpenAI peut être résolue.
3. `gemini` -- si une clé Gemini peut être résolue.
4. `voyage` -- si une clé Voyage peut être résolue.
5. `mistral` -- si une clé Mistral peut être résolue.

`ollama` est pris en charge mais non détecté automatiquement (définissez-le explicitement).

### Résolution de la clé API

Les embeddings distants nécessitent une clé API. OpenClaw les résout à partir de :
profils d'authentification, `models.providers.*.apiKey`, ou variables d'environnement.

| Fournisseur | Variable d'env.                   | Clé de config.                    |
| ----------- | --------------------------------- | --------------------------------- |
| OpenAI      | `OPENAI_API_KEY`                  | `models.providers.openai.apiKey`  |
| Gemini      | `GEMINI_API_KEY`                  | `models.providers.google.apiKey`  |
| Voyage      | `VOYAGE_API_KEY`                  | `models.providers.voyage.apiKey`  |
| Mistral     | `MISTRAL_API_KEY`                 | `models.providers.mistral.apiKey` |
| Ollama      | `OLLAMA_API_KEY` (espace réservé) | --                                |

Le OAuth Codex couvre uniquement la conversation/les complétions et ne répond pas aux requêtes d'embedding.

---

## Configuration du point de terminaison distant

Pour les points de terminaison personnalisés compatibles OpenAI ou pour remplacer les valeurs par défaut du fournisseur :

| Clé              | Type     | Description                                                                          |
| ---------------- | -------- | ------------------------------------------------------------------------------------ |
| `remote.baseUrl` | `string` | URL de base de l'API personnalisée                                                   |
| `remote.apiKey`  | `string` | Remplacer la clé API                                                                 |
| `remote.headers` | `object` | En-têtes HTTP supplémentaires (fusionnés avec les valeurs par défaut du fournisseur) |

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

| Clé                    | Type     | Par défaut             | Description                                            |
| ---------------------- | -------- | ---------------------- | ------------------------------------------------------ |
| `model`                | `string` | `gemini-embedding-001` | Prend également en charge `gemini-embedding-2-preview` |
| `outputDimensionality` | `number` | `3072`                 | Pour Embedding 2 : 768, 1536 ou 3072                   |

<Warning>Le changement de modèle ou de `outputDimensionality` déclenche une réindexation complète automatique.</Warning>

---

## Configuration de l'embedding local

| Clé                   | Type     | Par défaut                 | Description                                      |
| --------------------- | -------- | -------------------------- | ------------------------------------------------ |
| `local.modelPath`     | `string` | téléchargé automatiquement | Chemin vers le fichier de modèle GGUF            |
| `local.modelCacheDir` | `string` | par défaut node-llama-cpp  | Répertoire de cache pour les modèles téléchargés |

Modèle par défaut : `embeddinggemma-300m-qat-Q8_0.gguf` (~0,6 Go, téléchargé automatiquement).
Nécessite une compilation native : `pnpm approve-builds` puis `pnpm rebuild node-llama-cpp`.

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

| Clé           | Type      | Par défaut | Description                           |
| ------------- | --------- | ---------- | ------------------------------------- |
| `mmr.enabled` | `boolean` | `false`    | Activer le re-classement MMR          |
| `mmr.lambda`  | `number`  | `0.7`      | 0 = diversité max, 1 = pertinence max |

### Décroissance temporelle (récence)

| Clé                          | Type      | Par défaut | Description                                   |
| ---------------------------- | --------- | ---------- | --------------------------------------------- |
| `temporalDecay.enabled`      | `boolean` | `false`    | Activer le renforcement de la récence         |
| `temporalDecay.halfLifeDays` | `number`  | `30`       | Le score est divisé par deux tous les N jours |

Les fichiers persistants (`MEMORY.md`, fichiers non datés dans `memory/`) ne sont jamais sujets à la décroissance.

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
le moteur intégré ignore les liens symboliques, tandis que QMD suit le comportement
du scanner QMD sous-jacent.

Pour la recherche de transcriptions inter-agents spécifique à un agent, utilisez
`agents.list[].memorySearch.qmd.extraCollections` au lieu de `memory.qmd.paths`.
Ces collections supplémentaires suivent la même structure `{ path, name, pattern? }`, mais
elles sont fusionnées par agent et peuvent préserver des noms partagés explicites lorsque le chemin
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
| `multimodal.modalities`   | `string[]` | --         | `["image"]`, `["audio"]` ou `["all"]`          |
| `multimodal.maxFileBytes` | `number`   | `10000000` | Taille maximale des fichiers pour l'indexation |

S'applique uniquement aux fichiers dans `extraPaths`. Les racines de mémoire par défaut restent en Markdown uniquement.
Nécessite `gemini-embedding-2-preview`. `fallback` doit être `"none"`.

Formats pris en charge : `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.heic`, `.heif`
(images) ; `.mp3`, `.wav`, `.ogg`, `.opus`, `.m4a`, `.aac`, `.flac` (audio).

---

## Cache d'incorporation

| Clé                | Type      | Par défaut | Description                                             |
| ------------------ | --------- | ---------- | ------------------------------------------------------- |
| `cache.enabled`    | `boolean` | `false`    | Mettre en cache les incorporations de blocs dans SQLite |
| `cache.maxEntries` | `number`  | `50000`    | Incorporations mises en cache maximales                 |

Empêche la réincorporation du texte inchangé lors de la réindexation ou des mises à jour des transcriptions.

---

## Indexation par lots

| Clé                           | Type      | Par défaut | Description                            |
| ----------------------------- | --------- | ---------- | -------------------------------------- |
| `remote.batch.enabled`        | `boolean` | `false`    | Activer l'API d'incorporation par lots |
| `remote.batch.concurrency`    | `number`  | `2`        | Tâches par lots parallèles             |
| `remote.batch.wait`           | `boolean` | `true`     | Attendre la fin du lot                 |
| `remote.batch.pollIntervalMs` | `number`  | --         | Intervalle d'interrogation             |
| `remote.batch.timeoutMinutes` | `number`  | --         | Délai d'attente du lot                 |

Disponible pour `openai`, `gemini` et `voyage`. Le traitement par lots OpenAI est généralement
le plus rapide et le plus économique pour les importations massives.

---

## Recherche dans la mémoire de session (expérimental)

Indexez les transcriptions de session et affichez-les via `memory_search` :

| Clé                           | Type       | Par défaut   | Description                                          |
| ----------------------------- | ---------- | ------------ | ---------------------------------------------------- |
| `experimental.sessionMemory`  | `boolean`  | `false`      | Activer l'indexation de session                      |
| `sources`                     | `string[]` | `["memory"]` | Ajoutez `"sessions"` pour inclure les transcriptions |
| `sync.sessions.deltaBytes`    | `number`   | `100000`     | Seuil d'octets pour la réindexation                  |
| `sync.sessions.deltaMessages` | `number`   | `50`         | Seuil de messages pour la réindexation               |

L'indexation de session est optionnelle et s'exécute de manière asynchrone. Les résultats peuvent être
légèrement périmés. Les journaux de session résident sur le disque, traitez donc l'accès au système de fichiers comme la
limite de confiance.

---

## Accélération vectorielle SQLite (sqlite-vec)

| Clé                          | Type      | Par défaut | Description                                        |
| ---------------------------- | --------- | ---------- | -------------------------------------------------- |
| `store.vector.enabled`       | `boolean` | `true`     | Utiliser sqlite-vec pour les requêtes vectorielles |
| `store.vector.extensionPath` | `string`  | intégré    | Remplacer le chemin de sqlite-vec                  |

Lorsque sqlite-vec n'est pas disponible, OpenClaw revient automatiquement
à la similarité cosinus en processus.

---

## Stockage de l'index

| Clé                   | Type     | Par défaut                            | Description                                                   |
| --------------------- | -------- | ------------------------------------- | ------------------------------------------------------------- |
| `store.path`          | `string` | `~/.openclaw/memory/{agentId}.sqlite` | Emplacement de l'index (prend en charge le jeton `{agentId}`) |
| `store.fts.tokenizer` | `string` | `unicode61`                           | Tokenizer FTS5 (`unicode61` ou `trigram`)                     |

---

## Configuration du backend QMD

Définissez `memory.backend = "qmd"` pour activer. Tous les paramètres QMD se trouvent sous
`memory.qmd` :

| Clé                      | Type      | Par défaut | Description                                          |
| ------------------------ | --------- | ---------- | ---------------------------------------------------- |
| `command`                | `string`  | `qmd`      | Chemin de l'exécutable QMD                           |
| `searchMode`             | `string`  | `search`   | Commande de recherche : `search`, `vsearch`, `query` |
| `includeDefaultMemory`   | `boolean` | `true`     | Auto-indexation `MEMORY.md` + `memory/**/*.md`       |
| `paths[]`                | `array`   | --         | Chemins supplémentaires : `{ name, path, pattern? }` |
| `sessions.enabled`       | `boolean` | `false`    | Indexer les transcripts de session                   |
| `sessions.retentionDays` | `number`  | --         | Rétention des transcripts                            |
| `sessions.exportDir`     | `string`  | --         | Répertoire d'exportation                             |

### Planification de la mise à jour

| Clé                       | Type      | Par défaut | Description                                             |
| ------------------------- | --------- | ---------- | ------------------------------------------------------- |
| `update.interval`         | `string`  | `5m`       | Intervalle de rafraîchissement                          |
| `update.debounceMs`       | `number`  | `15000`    | Anti-rebond des modifications de fichiers               |
| `update.onBoot`           | `boolean` | `true`     | Rafraîchir au démarrage                                 |
| `update.waitForBootSync`  | `boolean` | `false`    | Bloquer le démarrage jusqu'à la fin du rafraîchissement |
| `update.embedInterval`    | `string`  | --         | Cadence d'incorporation séparée                         |
| `update.commandTimeoutMs` | `number`  | --         | Délai d'attente pour les commandes QMD                  |

### Limites

| Clé                       | Type     | Par défaut | Description                              |
| ------------------------- | -------- | ---------- | ---------------------------------------- |
| `limits.maxResults`       | `number` | `6`        | Résultats de recherche max               |
| `limits.maxSnippetChars`  | `number` | --         | Limiter la longueur de l'extrait         |
| `limits.maxInjectedChars` | `number` | --         | Limiter le total des caractères injectés |
| `limits.timeoutMs`        | `number` | `4000`     | Délai d'attente de recherche             |

### Portée

Contrôle les sessions qui peuvent recevoir les résultats de recherche QMD. Même schéma que
[`session.sendPolicy`](/en/gateway/configuration-reference#session) :

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

La valeur par défaut est DM uniquement. `match.keyPrefix` correspond à la clé de session normalisée ;
`match.rawKeyPrefix` correspond à la clé brute, y compris `agent:<id>:`.

### Citations

`memory.citations` s'applique à tous les backends :

| Valeur              | Comportement                                                                   |
| ------------------- | ------------------------------------------------------------------------------ |
| `auto` (par défaut) | Inclure le pied de page `Source: <path#line>` dans les extraits                |
| `on`                | Toujours inclure le pied de page                                               |
| `off`               | Omettre le pied de page (le chemin est toujours transmis en interne à l'agent) |

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
