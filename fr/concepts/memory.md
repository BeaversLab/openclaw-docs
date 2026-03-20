---
title: "Memory"
summary: "How OpenClaw memory works (workspace files + automatic memory flush)"
read_when:
  - You want the memory file layout and workflow
  - You want to tune the automatic pre-compaction memory flush
---

# Memory

OpenClaw memory is **plain Markdown in the agent workspace**. The files are the
source of truth; the model only "remembers" what gets written to disk.

Memory search tools are provided by the active memory plugin (default:
`memory-core`). Disable memory plugins with `plugins.slots.memory = "none"`.

## Memory files (Markdown)

The default workspace layout uses two memory layers:

- `memory/YYYY-MM-DD.md`
  - Daily log (append-only).
  - Read today + yesterday at session start.
- `MEMORY.md` (optional)
  - Curated long-term memory.
  - If both `MEMORY.md` and `memory.md` exist at the workspace root, OpenClaw only loads `MEMORY.md`.
  - Lowercase `memory.md` is only used as a fallback when `MEMORY.md` is absent.
  - **Only load in the main, private session** (never in group contexts).

These files live under the workspace (`agents.defaults.workspace`, default
`~/.openclaw/workspace`). See [Agent workspace](/fr/concepts/agent-workspace) for the full layout.

## Memory tools

OpenClaw exposes two agent-facing tools for these Markdown files:

- `memory_search` — semantic recall over indexed snippets.
- `memory_get` — targeted read of a specific Markdown file/line range.

`memory_get` now **degrades gracefully when a file doesn't exist** (for example,
today's daily log before the first write). Both the builtin manager and the QMD
backend return `{ text: "", path }` instead of throwing `ENOENT`, so agents can
handle "nothing recorded yet" and continue their workflow without wrapping the
tool call in try/catch logic.

## When to write memory

- Decisions, preferences, and durable facts go to `MEMORY.md`.
- Day-to-day notes and running context go to `memory/YYYY-MM-DD.md`.
- If someone says "remember this," write it down (do not keep it in RAM).
- Cette zone est encore en évolution. Il est utile de rappeler au modèle de stocker des souvenirs ; il saura quoi faire.
- Si vous voulez que quelque chose soit retenu, **demandez au bot de l'écrire** dans la mémoire.

## Vidange automatique de la mémoire (ping pré-compaction)

Lorsqu'une session est **proche de l'auto-compaction**, OpenClaw déclenche un **tour silencieux,
agentique** qui rappelle au modèle d'écrire une mémoire durable **avant** que
le contexte ne soit compacté. Les invites par défaut indiquent explicitement que le modèle _peut répondre_,
mais généralement `NO_REPLY` est la bonne réponse afin que l'utilisateur ne voie jamais ce tour.

Ceci est contrôlé par `agents.defaults.compaction.memoryFlush` :

```json5
{
  agents: {
    defaults: {
      compaction: {
        reserveTokensFloor: 20000,
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

Détails :

- **Seuil souple** : la vidange se déclenche lorsque l'estimation de jetons de la session dépasse
  `contextWindow - reserveTokensFloor - softThresholdTokens`.
- **Silencieux** par défaut : les invites incluent `NO_REPLY` afin que rien ne soit livré.
- **Deux invites** : une invite utilisateur plus une invite système ajoutent le rappel.
- **Une vidange par cycle de compaction** (suivie dans `sessions.json`).
- **L'espace de travail doit être inscriptible** : si la session s'exécute dans un bac à sable avec
  `workspaceAccess: "ro"` ou `"none"`, la vidange est ignorée.

Pour le cycle de vie complet de la compaction, voir
[Gestion de session + compaction](/fr/reference/session-management-compaction).

## Recherche vectorielle de mémoire

OpenClaw peut construire un petit index vectoriel sur `MEMORY.md` et `memory/*.md` afin que
les requêtes sémantiques puissent trouver des notes connexes même si le libellé diffère.

Valeurs par défaut :

- Activé par défaut.
- Surveille les modifications des fichiers de mémoire (avec délai).
- Configurez la recherche de mémoire sous `agents.defaults.memorySearch` (pas au niveau supérieur
  `memorySearch`).
- Utilise des embeddings distants par défaut. Si `memorySearch.provider` n'est pas défini, OpenClaw sélectionne automatiquement :
  1. `local` si un `memorySearch.local.modelPath` est configuré et que le fichier existe.
  2. `openai` si une clé OpenAI peut être résolue.
  3. `gemini` si une clé Gemini peut être résolue.
  4. `voyage` si une clé Voyage peut être résolue.
  5. `mistral` si une clé Mistral peut être résolue.
  6. Sinon, la recherche de mémoire reste désactivée jusqu'à ce qu'elle soit configurée.
- Le mode local utilise node-llama-cpp et peut nécessiter `pnpm approve-builds`.
- Utilise sqlite-vec (lorsqu'il est disponible) pour accélérer la recherche vectorielle dans SQLite.
- `memorySearch.provider = "ollama"` est également pris en charge pour les embeddings Ollama locaux/auto-hébergés (`/api/embeddings`), mais il n'est pas sélectionné automatiquement.

Les embeddings distants **nécessitent** une clé API pour le provider d'embeddings. OpenClaw résout les clés à partir des profils d'authentification, de `models.providers.*.apiKey` ou des variables d'environnement. Le OAuth Codex couvre uniquement les chat/completions et ne **satisfait pas** les embeddings pour la recherche mémoire. Pour Gemini, utilisez `GEMINI_API_KEY` ou `models.providers.google.apiKey`. Pour Voyage, utilisez `VOYAGE_API_KEY` ou `models.providers.voyage.apiKey`. Pour Mistral, utilisez `MISTRAL_API_KEY` ou `models.providers.mistral.apiKey`. Ollama ne nécessite généralement pas de vraie clé API (un espace réservé comme `OLLAMA_API_KEY=ollama-local` suffit lorsque cela est requis par la stratégie locale).
Lors de l'utilisation d'un point de terminaison compatible OpenAI personnalisé,
définissez `memorySearch.remote.apiKey` (et `memorySearch.remote.headers` en option).

### Backend QMD (expérimental)

Définissez `memory.backend = "qmd"` pour remplacer l'indexeur SQLite intégré par
[QMD](https://github.com/tobi/qmd) : un sidecar de recherche local-first qui combine
BM25 + vecteurs + reranking. Le Markdown reste la source de vérité ; OpenClaw délègue
à QMD pour la récupération. Points clés :

**Prérequis**

- Désactivé par défaut. Activation par configuration (`memory.backend = "qmd"`).
- Installez le CLI QMD séparément (`bun install -g https://github.com/tobi/qmd` ou récupérez
  une version) et assurez-vous que le binaire `qmd` est sur le `PATH` de la passerelle.
- QMD nécessite une version de SQLite qui autorise les extensions (`brew install sqlite` sur
  macOS).
- QMD s'exécute entièrement localement via Bun + `node-llama-cpp` et télécharge automatiquement les modèles GGUF
  depuis HuggingFace dès la première utilisation (pas de démon Ollama séparé requis).
- La passerelle exécute QMD dans un home XGD autonome sous
  `~/.openclaw/agents/<agentId>/qmd/` en définissant `XDG_CONFIG_HOME` et
  `XDG_CACHE_HOME`.
- Prise en charge OS : macOS et Linux fonctionnent immédiatement une fois Bun + SQLite
  installés. Windows est mieux pris en charge via WSL2.

**Fonctionnement du sidecar**

- La passerelle écrit un dossier d'accueil QMD autonome sous
  `~/.openclaw/agents/<agentId>/qmd/` (config + cache + base de données SQLite).
- Les collections sont créées via `qmd collection add` à partir de `memory.qmd.paths`
  (plus les fichiers de mémoire de l'espace de travail par défaut), puis `qmd update` + `qmd embed` s'exécutent
  au démarrage et selon un intervalle configurable (`memory.qmd.update.interval`,
  5 m par défaut).
- La passerelle initialise désormais le gestionnaire QMD au démarrage, de sorte que les minuteries de mise à jour périodique
  sont armées même avant le premier appel `memory_search`.
- L'actualisation au démarrage s'exécute désormais en arrière-plan par défaut, ce qui ne bloque pas le démarrage de la discussion ;
  définissez `memory.qmd.update.waitForBootSync = true` pour conserver l'ancien comportement bloquant.
- Les recherches s'exécutent via `memory.qmd.searchMode` (`qmd search --json` par défaut ; prend également en charge
  `vsearch` et `query`). Si le mode sélectionné rejette les indicateurs de votre
  version QMD, OpenClaw réessaie avec `qmd query`. Si QMD échoue ou si le binaire est
  manquant, OpenClaw revient automatiquement au gestionnaire SQLite intégré pour que
  les outils de mémoire continuent de fonctionner.
- OpenClaw n'expose pas encore aujourd'hui le réglage de la taille de lot d'intégration QMD ; le comportement en lot est
  contrôlé par QMD lui-même.
- **La première recherche peut être lente** : QMD peut télécharger des modèles GGUF locaux (reranker/expansion
  de requête) lors de la première exécution `qmd query`.
  - OpenClaw définit `XDG_CONFIG_HOME`/`XDG_CACHE_HOME` automatiquement lorsqu'il exécute QMD.
  - Si vous souhaitez pré-télécharger manuellement les modèles (et réchauffer le même index que OpenClaw
    utilise), lancez une requête unique avec les répertoires XGD de l'agent.

    L'état QMD de OpenClaw réside dans votre **répertoire d'état** (par défaut `~/.openclaw`).
    Vous pouvez pointer `qmd` vers exactement le même index en exportant les mêmes variables XGD
    que OpenClaw utilise :

    ```bash
    # Pick the same state dir OpenClaw uses
    STATE_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"

    export XDG_CONFIG_HOME="$STATE_DIR/agents/main/qmd/xdg-config"
    export XDG_CACHE_HOME="$STATE_DIR/agents/main/qmd/xdg-cache"

    # (Optional) force an index refresh + embeddings
    qmd update
    qmd embed

    # Warm up / trigger first-time model downloads
    qmd query "test" -c memory-root --json >/dev/null 2>&1
    ```

**Surface de configuration (`memory.qmd.*`)**

- `command` (par défaut `qmd`) : remplacer le chemin de l'exécutable.
- `searchMode` (par défaut `search`) : choisir quelle commande QMD prend en charge
  `memory_search` (`search`, `vsearch`, `query`).
- `includeDefaultMemory` (par défaut `true`) : indexation automatique `MEMORY.md` + `memory/**/*.md`.
- `paths[]` : ajouter des répertoires/fichiers supplémentaires (`path`, `pattern` facultatif,
  stable `name` facultatif).
- `sessions` : opter pour l'indexation JSONL de session (`enabled`, `retentionDays`,
  `exportDir`).
- `update` : contrôle la cadence de rafraîchissement et l'exécution de la maintenance :
  (`interval`, `debounceMs`, `onBoot`, `waitForBootSync`, `embedInterval`,
  `commandTimeoutMs`, `updateTimeoutMs`, `embedTimeoutMs`).
- `limits` : limiter la charge de rappel (`maxResults`, `maxSnippetChars`,
  `maxInjectedChars`, `timeoutMs`).
- `scope` : même schéma que [`session.sendPolicy`](/fr/gateway/configuration#session).
  La valeur par défaut est DM uniquement (`deny` tous, `allow` les chats directs) ; assouplissez-la pour afficher
  les résultats QMD dans les groupes/canaux.
  - `match.keyPrefix` correspond à la clé de session **normalisée** (en minuscules, sans tout
    `agent:<id>:` de début). Exemple : `discord:channel:`.
  - `match.rawKeyPrefix` correspond à la clé de session **brute** (en minuscules), y compris
    `agent:<id>:`. Exemple : `agent:main:discord:`.
  - Legacy : `match.keyPrefix: "agent:..."` est toujours traité comme un préfixe de clé brute,
    mais préférez `rawKeyPrefix` pour plus de clarté.
- Lorsque `scope` refuse une recherche, OpenClaw enregistre un avertissement avec la
  `channel`/`chatType` dérivée pour faciliter le débogage des résultats vides.
- Les extraits provenant de l'extérieur de l'espace de travail apparaissent comme
  `qmd/<collection>/<relative-path>` dans les résultats de `memory_search` ; `memory_get`
  comprend ce préfixe et lit à partir de la racine de collection QMD configurée.
- Lorsque `memory.qmd.sessions.enabled = true`, OpenClaw exporte les transcripts de session
  nettoyés (tours Utilisateur/Assistant) dans une collection QMD dédiée sous
  `~/.openclaw/agents/<id>/qmd/sessions/`, afin que `memory_search` puisse rappeler les conversations
  récentes sans toucher à l'index SQLite intégré.
- Les extraits `memory_search` incluent désormais un pied de page `Source: <path#line>` lorsque
  `memory.citations` est `auto`/`on` ; définissez `memory.citations = "off"` pour garder
  les métadonnées de chemin internes (l'agent reçoit toujours le chemin pour
  `memory_get`, mais le texte de l'extrait omet le pied de page et le prompt système
  avertit l'agent de ne pas le citer).

**Exemple**

```json5
memory: {
  backend: "qmd",
  citations: "auto",
  qmd: {
    includeDefaultMemory: true,
    update: { interval: "5m", debounceMs: 15000 },
    limits: { maxResults: 6, timeoutMs: 4000 },
    scope: {
      default: "deny",
      rules: [
        { action: "allow", match: { chatType: "direct" } },
        // Normalized session-key prefix (strips `agent:<id>:`).
        { action: "deny", match: { keyPrefix: "discord:channel:" } },
        // Raw session-key prefix (includes `agent:<id>:`).
        { action: "deny", match: { rawKeyPrefix: "agent:main:discord:" } },
      ]
    },
    paths: [
      { name: "docs", path: "~/notes", pattern: "**/*.md" }
    ]
  }
}
```

**Citations & repli**

- `memory.citations` s'applique quel que soit le backend (`auto`/`on`/`off`).
- Lorsque `qmd` s'exécute, nous étiquetons `status().backend = "qmd"` afin que les diagnostics montrent quel
  moteur a servi les résultats. Si le sous-processus QMD se ferme ou si la sortie JSON ne peut pas être
  analysée, le gestionnaire de recherche enregistre un avertissement et renvoie le fournisseur intégré
  (embeddings Markdown existants) jusqu'à ce que QMD se rétablisse.

### Chemins de mémoire supplémentaires

Si vous souhaitez indexer des fichiers Markdown en dehors de la structure de l'espace de travail par défaut, ajoutez
des chemins explicites :

```json5
agents: {
  defaults: {
    memorySearch: {
      extraPaths: ["../team-docs", "/srv/shared-notes/overview.md"]
    }
  }
}
```

Notes :

- Les chemins peuvent être absolus ou relatifs à l'espace de travail.
- Les répertoires sont analysés récursivement pour les fichiers `.md`.
- Par défaut, seuls les fichiers Markdown sont indexés.
- Si `memorySearch.multimodal.enabled = true`, OpenClaw indexe également les fichiers image/audio pris en charge sous `extraPaths` uniquement. Les racines de mémoire par défaut (`MEMORY.md`, `memory.md`, `memory/**/*.md`) restent Markdown uniquement.
- Les liens symboliques sont ignorés (fichiers ou répertoires).

### Fichiers de mémoire multimodaux (image + audio Gemini)

OpenClaw peut indexer des fichiers image et audio à partir de `memorySearch.extraPaths` lors de l'utilisation de Gemini embedding 2 :

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "gemini",
      model: "gemini-embedding-2-preview",
      extraPaths: ["assets/reference", "voice-notes"],
      multimodal: {
        enabled: true,
        modalities: ["image", "audio"], // or ["all"]
        maxFileBytes: 10000000
      },
      remote: {
        apiKey: "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

Remarques :

- La mémoire multimodale est actuellement prise en charge uniquement pour `gemini-embedding-2-preview`.
- L'indexation multimodale ne s'applique qu'aux fichiers découverts via `memorySearch.extraPaths`.
- Modalités prises en charge à cette phase : image et audio.
- `memorySearch.fallback` doit rester `"none"` tant que la mémoire multimodale est activée.
- Les octets des fichiers image/audio correspondants sont téléchargés vers le point de terminaison d'incorporation Gemini configuré lors de l'indexation.
- Extensions d'image prises en charge : `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.heic`, `.heif`.
- Extensions audio prises en charge : `.mp3`, `.wav`, `.ogg`, `.opus`, `.m4a`, `.aac`, `.flac`.
- Les requêtes de recherche restent textuelles, mais Gemini peut comparer ces requêtes textuelles aux incorporations d'image/audio indexées.
- `memory_get` lit toujours uniquement le Markdown ; les fichiers binaires sont consultables mais ne sont pas renvoyés en tant que contenu de fichier brut.

### Incorporations Gemini (natives)

Définissez le fournisseur sur `gemini` pour utiliser l'API d'incorporations Gemini directement :

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "gemini",
      model: "gemini-embedding-001",
      remote: {
        apiKey: "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

Remarques :

- `remote.baseUrl` est facultatif (par défaut, l'URL de base de l'API Gemini).
- `remote.headers` vous permet d'ajouter des en-têtes supplémentaires si nécessaire.
- Modèle par défaut : `gemini-embedding-001`.
- `gemini-embedding-2-preview` est également pris en charge : limite de 8192 jetons et dimensions configurables (768 / 1536 / 3072, par défaut 3072).

#### Incorporation Gemini 2 (aperçu)

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "gemini",
      model: "gemini-embedding-2-preview",
      outputDimensionality: 3072,  // optional: 768, 1536, or 3072 (default)
      remote: {
        apiKey: "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

> **⚠️ Réindexation requise :** Le passage de `gemini-embedding-001` (768 dimensions)
> à `gemini-embedding-2-preview` (3072 dimensions) modifie la taille du vecteur. Il en va de même si vous
> modifiez `outputDimensionality` entre 768, 1536 et 3072.
> OpenClaw réindexera automatiquement lorsqu'il détectera un changement de modèle ou de dimension.

Si vous souhaitez utiliser un **point de terminaison personnalisé compatible OpenAI** (OpenRouter, vLLM ou un proxy),
vous pouvez utiliser la configuration `remote` avec le provider OpenAI :

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      remote: {
        baseUrl: "https://api.example.com/v1/",
        apiKey: "YOUR_OPENAI_COMPAT_API_KEY",
        headers: { "X-Custom-Header": "value" }
      }
    }
  }
}
```

Si vous ne souhaitez pas définir de clé API, utilisez `memorySearch.provider = "local"` ou définissez
`memorySearch.fallback = "none"`.

Fallbacks :

- `memorySearch.fallback` peut être `openai`, `gemini`, `voyage`, `mistral`, `ollama`, `local` ou `none`.
- Le provider de secours n'est utilisé que lorsque le provider d'intégration principal échoue.

Indexation par lots (OpenAI + Gemini + Voyage) :

- Désactivé par défaut. Définissez `agents.defaults.memorySearch.remote.batch.enabled = true` pour activer l'indexation de grands corpus (OpenAI, Gemini et Voyage).
- Le comportement par défaut attend la fin du lot ; ajustez `remote.batch.wait`, `remote.batch.pollIntervalMs` et `remote.batch.timeoutMinutes` si nécessaire.
- Définissez `remote.batch.concurrency` pour contrôler le nombre de tâches par lots que nous soumettons en parallèle (par défaut : 2).
- Le mode par lots s'applique lorsque `memorySearch.provider = "openai"` ou `"gemini"` et utilise la clé API correspondante.
- Les tâches par lots Gemini utilisent le point de terminaison de lots d'intégrations asynchrone et nécessitent la disponibilité de l'API Batch Gemini.

Pourquoi le lot OpenAI est rapide et peu coûteux :

- Pour les importants rétroremplissages, OpenAI est généralement l'option la plus rapide que nous prenons en charge, car nous pouvons soumettre de nombreuses requêtes d'intégration dans une seule tâche par lot et laisser OpenAI les traiter de manière asynchrone.
- OpenAI propose une tarification réduite pour les charges de travail de l'API Batch, les grands processus d'indexation sont donc généralement moins chers que l'envoi des mêmes requêtes de manière synchrone.
- Consultez la documentation et la tarification de l'API Batch OpenAI pour plus de détails :
  - [https://platform.openai.com/docs/api-reference/batch](https://platform.openai.com/docs/api-reference/batch)
  - [https://platform.openai.com/pricing](https://platform.openai.com/pricing)

Exemple de configuration :

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      fallback: "openai",
      remote: {
        batch: { enabled: true, concurrency: 2 }
      },
      sync: { watch: true }
    }
  }
}
```

Outils :

- `memory_search` — renvoie des extraits avec des plages de fichiers et de lignes.
- `memory_get` — lit le contenu du fichier mémoire par chemin d'accès.

Mode local :

- Définissez `agents.defaults.memorySearch.provider = "local"`.
- Fournissez `agents.defaults.memorySearch.local.modelPath` (URI GGUF ou `hf:`).
- Optionnel : définissez `agents.defaults.memorySearch.fallback = "none"` pour éviter le repli à distance.

### Fonctionnement des outils de mémoire

- `memory_search` effectue une recherche sémantique sur les extraits Markdown (cible d'environ 400 jetons, chevauchement de 80 jetons) provenant de `MEMORY.md` + `memory/**/*.md`. Il renvoie le texte de l'extrait (plafonné à ~700 caractères), le chemin du fichier, la plage de lignes, le score, le provider/model, et indique si une régression de local vers distant pour les embeddings a eu lieu. Aucune charge utile de fichier complet n'est renvoyée.
- `memory_get` lit un fichier mémoire Markdown spécifique (relatif à l'espace de travail), optionnellement à partir d'une ligne de départ et pour N lignes. Les chemins en dehors de `MEMORY.md` / `memory/` sont rejetés.
- Les deux outils ne sont activés que lorsque `memorySearch.enabled` résout à vrai pour l'agent.

### Ce qui est indexé (et quand)

- Type de fichier : Markdown uniquement (`MEMORY.md`, `memory/**/*.md`).
- Stockage de l'index : SQLite par agent à `~/.openclaw/memory/<agentId>.sqlite` (configurable via `agents.defaults.memorySearch.store.path`, prend en charge le jeton `{agentId}`).
- Fraîcheur : une surveillance (watcher) sur `MEMORY.md` + `memory/` marque l'index comme obsolète (anti-rebond de 1,5 s). La synchronisation est planifiée au démarrage de la session, lors d'une recherche ou à intervalle régulier et s'exécute de manière asynchrone. Les transcripts de session utilisent des seuils de différence pour déclencher une synchronisation en arrière-plan.
- Déclencheurs de réindexation : l'index stocke le **provider/model d'embedding + l'empreinte de l'endpoint + les paramètres de découpage**. Si l'un de ces éléments change, OpenClaw réinitialise et réindexe automatiquement l'intégralité du stock.

### Recherche hybride (BM25 + vecteur)

Lorsqu'elle est activée, OpenClaw combine :

- **Similarité vectorielle** (correspondance sémantique, le libellé peut différer)
- **Pertinence des mots-clés BM25** (jetons exacts comme les ID, les env vars, les symboles de code)

Si la recherche en texte intégral n'est pas disponible sur votre plateforme, OpenClaw revient à une recherche par vecteur uniquement.

#### Pourquoi l'hybride ?

La recherche vectorielle est excellente pour « cela signifie la même chose » :

- « Mac Studio gateway host » vs « the machine running the gateway »
- « debounce file updates » vs « avoid indexing on every write »

Mais elle peut être faible sur les jetons exacts à fort signal :

- ID (`a828e60`, `b3b9895a…`)
- symboles de code (`memorySearch.query.hybrid`)
- chaînes d'erreur ("sqlite-vec unavailable")

BM25 (texte intégral) est l'inverse : fort pour les jetons exacts, plus faible pour les paraphrases.
La recherche hybride est le compromis pragmatique : **utiliser les deux signaux de récupération** afin d'obtenir
de bons résultats pour les requêtes en « langage naturel » comme pour les recherches de type « aiguille dans une botte de foin ».

#### Comment nous fusionnons les résultats (la conception actuelle)

Esquisse de l'implémentation :

1. Récupérer un pool de candidats des deux côtés :

- **Vecteur** : les `maxResults * candidateMultiplier` premiers par similarité cosinus.
- **BM25** : les `maxResults * candidateMultiplier` premiers par le rang BM25 FTS5 (plus bas est meilleur).

2. Convertir le rang BM25 en un score approximatif entre 0 et 1 :

- `textScore = 1 / (1 + max(0, bm25Rank))`

3. Unir les candidats par identifiant de chunk et calculer un score pondéré :

- `finalScore = vectorWeight * vectorScore + textWeight * textScore`

Notes :

- `vectorWeight` + `textWeight` est normalisé à 1,0 lors de la résolution de la configuration, de sorte que les pondérations se comportent comme des pourcentages.
- Si les embeddings ne sont pas disponibles (ou si le provider renvoie un vecteur nul), nous exécutons toujours BM25 et renvoyons des correspondances de mots-clés.
- Si FTS5 ne peut pas être créé, nous conservons la recherche par vecteur uniquement (pas d'échec critique).

Ce n'est pas « parfait selon la théorie de la RI », mais c'est simple, rapide, et tend à améliorer la rappel/précision sur de vraies notes.
Si nous voulons être plus pointus plus tard, les étapes suivantes courantes sont la Fusion de Rangs Réciproques (RRF) ou la normalisation des scores
(min/max ou z-score) avant le mélange.

#### Pipeline de post-traitement

Après la fusion des scores vectoriels et par mots-clés, deux étapes facultatives de post-traitement
affinent la liste de résultats avant qu'elle n'atteigne l'agent :

```
Vector + Keyword → Weighted Merge → Temporal Decay → Sort → MMR → Top-K Results
```

Les deux étapes sont **désactivées par défaut** et peuvent être activées indépendamment.

#### Réévaluation MMR (diversité)

Lorsque la recherche hybride renvoie des résultats, plusieurs chunks peuvent contenir un contenu similaire ou se chevaucher.
Par exemple, rechercher « configuration du réseau domestique » pourrait renvoyer cinq extraits presque identiques
issus de différentes notes quotidiennes qui mentionnent toutes la même configuration de routeur.

Le **MMR (Maximal Marginal Relevance)** réévalue les résultats pour équilibrer pertinence et diversité,
assurant que les principaux résultats couvrent différents aspects de la requête au lieu de répéter la même information.

Comment cela fonctionne :

1. Les résultats sont notés selon leur pertinence originale (score pondéré vecteur + BM25).
2. Le MMR sélectionne itérativement les résultats qui maximisent : `λ × relevance − (1−λ) × max_similarity_to_selected`.
3. La similarité entre les résultats est mesurée à l'aide de la similarité textuelle de Jaccard sur le contenu tokenisé.

Le paramètre `lambda` contrôle le compromis :

- `lambda = 1.0` → pertinence pure (aucune pénalité de diversité)
- `lambda = 0.0` → diversité maximale (ignore la pertinence)
- Par défaut : `0.7` (équilibré, légère préférence pour la pertinence)

**Exemple — requête : "configuration du réseau domestique"**

Compte tenu de ces fichiers mémoire :

```
memory/2026-02-10.md  → "Configured Omada router, set VLAN 10 for IoT devices"
memory/2026-02-08.md  → "Configured Omada router, moved IoT to VLAN 10"
memory/2026-02-05.md  → "Set up AdGuard DNS on 192.168.10.2"
memory/network.md     → "Router: Omada ER605, AdGuard: 192.168.10.2, VLAN 10: IoT"
```

Sans MMR — 3 premiers résultats :

```
1. memory/2026-02-10.md  (score: 0.92)  ← router + VLAN
2. memory/2026-02-08.md  (score: 0.89)  ← router + VLAN (near-duplicate!)
3. memory/network.md     (score: 0.85)  ← reference doc
```

Avec MMR (λ=0.7) — 3 premiers résultats :

```
1. memory/2026-02-10.md  (score: 0.92)  ← router + VLAN
2. memory/network.md     (score: 0.85)  ← reference doc (diverse!)
3. memory/2026-02-05.md  (score: 0.78)  ← AdGuard DNS (diverse!)
```

Le quasi-doublet du 8 février disparaît, et l'agent obtient trois informations distinctes.

**Quand activer :** Si vous remarquez que `memory_search` renvoie des extraits redondants ou quasi-identiques,
surtout avec des notes quotidiennes qui répètent souvent des informations similaires d'un jour à l'autre.

#### Décroissance temporelle (priorité à la récence)

Les agents avec des notes quotidiennes accumulent des centaines de fichiers datés au fil du temps. Sans décroissance,
une note bien rédigée d'il y a six mois peut dépasser la mise à jour d'hier sur le même sujet.

La **décroissance temporelle** applique un multiplicateur exponentiel aux scores en fonction de l'âge de chaque résultat,
de sorte que les souvenirs récents se classent naturellement plus haut tandis que les anciens s'estompent :

```
decayedScore = score × e^(-λ × ageInDays)
```

où `λ = ln(2) / halfLifeDays`.

Avec la demi-vie par défaut de 30 jours :

- Notes d'aujourd'hui : **100 %** du score original
- Il y a 7 jours : **~84 %**
- Il y a 30 jours : **50 %**
- Il y a 90 jours : **12,5 %**
- Il y a 180 jours : **~1,6 %**

**Les fichiers persistants ne sont jamais dépréciés :**

- `MEMORY.md` (fichier mémoire racine)
- Fichiers non datés dans `memory/` (par ex., `memory/projects.md`, `memory/network.md`)
- Ceux-ci contiennent des informations de référence durables qui doivent toujours se classer normalement.

Les **fichiers quotidiens datés** (`memory/YYYY-MM-DD.md`) utilisent la date extraite du nom de fichier.
Les autres sources (par ex., les transcriptions de session) utilisent par défaut l'heure de modification du fichier (`mtime`).

**Exemple — requête : "quel est l'horaire de travail de Rod ?"**

Compte tenu de ces fichiers mémoire (nous sommes le 10 février) :

```
memory/2025-09-15.md  → "Rod works Mon-Fri, standup at 10am, pairing at 2pm"  (148 days old)
memory/2026-02-10.md  → "Rod has standup at 14:15, 1:1 with Zeb at 14:45"    (today)
memory/2026-02-03.md  → "Rod started new team, standup moved to 14:15"        (7 days old)
```

Sans décroissance :

```
1. memory/2025-09-15.md  (score: 0.91)  ← best semantic match, but stale!
2. memory/2026-02-10.md  (score: 0.82)
3. memory/2026-02-03.md  (score: 0.80)
```

Avec décroissance (halfLife=30) :

```
1. memory/2026-02-10.md  (score: 0.82 × 1.00 = 0.82)  ← today, no decay
2. memory/2026-02-03.md  (score: 0.80 × 0.85 = 0.68)  ← 7 days, mild decay
3. memory/2025-09-15.md  (score: 0.91 × 0.03 = 0.03)  ← 148 days, nearly gone
```

La note obsolète de septembre tombe en bas malgré la meilleure correspondance sémantique brute.

**Quand activer :** Si votre agent a des mois de notes quotidiennes et que vous constatez que d'anciennes informations obsolètes prennent le pas sur le contexte récent. Une demi-vie de 30 jours fonctionne bien pour les workflows axés sur les notes quotidiennes ; augmentez-la (par ex. 90 jours) si vous consultez fréquemment des notes plus anciennes.

#### Configuration

Les deux fonctionnalités sont configurées sous `memorySearch.query.hybrid` :

```json5
agents: {
  defaults: {
    memorySearch: {
      query: {
        hybrid: {
          enabled: true,
          vectorWeight: 0.7,
          textWeight: 0.3,
          candidateMultiplier: 4,
          // Diversity: reduce redundant results
          mmr: {
            enabled: true,    // default: false
            lambda: 0.7       // 0 = max diversity, 1 = max relevance
          },
          // Recency: boost newer memories
          temporalDecay: {
            enabled: true,    // default: false
            halfLifeDays: 30  // score halves every 30 days
          }
        }
      }
    }
  }
}
```

Vous pouvez activer chaque fonctionnalité indépendamment :

- **MMR uniquement** — utile lorsque vous avez de nombreuses notes similaires mais que l'âge n'importe pas.
- **Décroissance temporelle uniquement** — utile lorsque la récence compte mais que vos résultats sont déjà diversifiés.
- **Les deux** — recommandé pour les agents ayant de longs historiques de notes quotidiennes volumineux et de longue durée.

### Cache d'embeddings

OpenClaw peut mettre en cache les **embeddings de segments** dans SQLite afin que la réindexation et les mises à jour fréquentes (en particulier les transcripts de session) ne réintègrent pas le texte inchangé.

Configuration :

```json5
agents: {
  defaults: {
    memorySearch: {
      cache: {
        enabled: true,
        maxEntries: 50000
      }
    }
  }
}
```

### Recherche de mémoire de session (expérimental)

Vous pouvez facultativement indexer les **transcripts de session** et les afficher via `memory_search`.
Ceci est protégé par un indicateur expérimental.

```json5
agents: {
  defaults: {
    memorySearch: {
      experimental: { sessionMemory: true },
      sources: ["memory", "sessions"]
    }
  }
}
```

Notes :

- L'indexation de session est **optionnelle** (désactivée par défaut).
- Les mises à jour de session sont différées et **indexées de manière asynchrone** une fois qu'elles franchissent les seuils de delta (au mieux).
- `memory_search` ne bloque jamais sur l'indexation ; les résultats peuvent être légèrement obsolètes jusqu'à la fin de la synchronisation en arrière-plan.
- Les résultats incluent toujours uniquement des extraits ; `memory_get` reste limité aux fichiers mémoire.
- L'indexation de session est isolée par agent (seuls les journaux de session de cet agent sont indexés).
- Les journaux de session résident sur le disque (`~/.openclaw/agents/<agentId>/sessions/*.jsonl`). Tout processus/utilisateur ayant accès au système de fichiers peut les lire, traitez donc l'accès au disque comme une limite de confiance. Pour une isolation plus stricte, exécutez les agents sous des utilisateurs ou hôtes OS distincts.

Seuils de delta (valeurs par défaut affichées) :

```json5
agents: {
  defaults: {
    memorySearch: {
      sync: {
        sessions: {
          deltaBytes: 100000,   // ~100 KB
          deltaMessages: 50     // JSONL lines
        }
      }
    }
  }
}
```

### Accélération vectorielle SQLite (sqlite-vec)

Lorsque l'extension sqlite-vec est disponible, OpenClaw stocke les embeddings dans une
virtuelle SQLite (`vec0`) et effectue des requêtes de distance vectorielle dans la
base de données. Cela maintient la recherche rapide sans charger chaque embedding dans JS.

Configuration (facultatif) :

```json5
agents: {
  defaults: {
    memorySearch: {
      store: {
        vector: {
          enabled: true,
          extensionPath: "/path/to/sqlite-vec"
        }
      }
    }
  }
}
```

Notes :

- `enabled` est vrai par défaut ; lorsque désactivé, la recherche revient à la
  similarité cosinus en processus sur les embeddings stockés.
- Si l'extension sqlite-vec est manquante ou échoue à charger, OpenClaw enregistre l'erreur et continue avec le repli JS (pas de table vectorielle).
- `extensionPath` remplace le chemin de l'extension sqlite-vec fournie (utile pour les builds personnalisés ou les emplacements d'installation non standard).

### Téléchargement automatique de l'incorporation locale

- Modèle d'incorporation local par défaut : `hf:ggml-org/embeddinggemma-300m-qat-q8_0-GGUF/embeddinggemma-300m-qat-Q8_0.gguf` (~0.6 Go).
- Quand `memorySearch.provider = "local"`, `node-llama-cpp` résout `modelPath` ; si le fichier GGUF est manquant, il le **télécharge automatiquement** dans le cache (ou `local.modelCacheDir` si défini), puis le charge. Les téléchargements reprennent en cas de nouvelle tentative.
- Exigence de build natif : exécutez `pnpm approve-builds`, choisissez `node-llama-cpp`, puis `pnpm rebuild node-llama-cpp`.
- Repli : si la configuration locale échoue et `memorySearch.fallback = "openai"`, nous basculons automatiquement vers les incorporations distantes (`openai/text-embedding-3-small` sauf si remplacé) et enregistrons la raison.

### Exemple de point de terminaison personnalisé compatible OpenAI

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      remote: {
        baseUrl: "https://api.example.com/v1/",
        apiKey: "YOUR_REMOTE_API_KEY",
        headers: {
          "X-Organization": "org-id",
          "X-Project": "project-id"
        }
      }
    }
  }
}
```

Notes :

- `remote.*` a priorité sur `models.providers.openai.*`.
- `remote.headers` fusionnent avec les en-têtes OpenAI ; la valeur distante l'emporte en cas de conflit de clé. Omettez `remote.headers` pour utiliser les valeurs par défaut OpenAI.

import fr from "/components/footer/fr.mdx";

<fr />
