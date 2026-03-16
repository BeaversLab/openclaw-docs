---
title: "Mémoire"
summary: "Fonctionnement de la mémoire OpenClaw (fichiers de l'espace de travail + vidage automatique de la mémoire)"
read_when:
  - You want the memory file layout and workflow
  - You want to tune the automatic pre-compaction memory flush
---

# Mémoire

La mémoire OpenClaw est du **Markdown simple dans l'espace de travail de l'agent**. Les fichiers constituent la source de vérité ; le model ne "se souvient" que de ce qui est écrit sur le disque.

Les outils de recherche de mémoire sont fournis par le plugin de mémoire actif (par défaut : `memory-core`). Désactivez les plugins de mémoire avec `plugins.slots.memory = "none"`.

## Fichiers de mémoire (Markdown)

La disposition de l'espace de travail par défaut utilise deux couches de mémoire :

- `memory/YYYY-MM-DD.md`
  - Journal quotidien (ajout uniquement).
  - Lecture d'aujourd'hui + d'hier au début de la session.
- `MEMORY.md` (optionnel)
  - Mémoire à long terme organisée.
  - Si `MEMORY.md` et `memory.md` existent tous deux à la racine de l'espace de travail, OpenClaw ne charge que `MEMORY.md`.
  - La version en minuscules `memory.md` n'est utilisée qu'en solution de repli lorsque `MEMORY.md` est absent.
  - **Ne charger que dans la session principale privée** (jamais dans les contextes de groupe).

Ces fichiers résident sous l'espace de travail (`agents.defaults.workspace`, par défaut
`~/.openclaw/workspace`). Voir [Espace de travail de l'agent](/fr/concepts/agent-workspace) pour la disposition complète.

## Outils de mémoire

OpenClaw expose deux outils orientés agent pour ces fichiers Markdown :

- `memory_search` — rappel sémantique sur les extraits indexés.
- `memory_get` — lecture ciblée d'un fichier/range de lignes Markdown spécifique.

`memory_get` se dégrade désormais **gracieusement lorsqu'un fichier n'existe pas** (par exemple,
le journal quotidien du jour avant la première écriture). Le gestionnaire intégré et le backend QMD
retournent tous deux `{ text: "", path }` au lieu de lever `ENOENT`, permettant aux agents de
gérer « rien d'enregistré pour le moment » et de poursuivre leur flux de travail sans encapsuler
l'appel d'outil dans une logique try/catch.

## Quand écrire des mémoires

- Les décisions, préférences et faits durables vont dans `MEMORY.md`.
- Les notes quotidiennes et le contexte continu vont dans `memory/YYYY-MM-DD.md`.
- Si quelqu'un dit « souviens-toi de ça », notez-le (ne le gardez pas en RAM).
- Ce domaine est encore en évolution. Il est utile de rappeler au model de stocker des mémoires ; il saura quoi faire.
- Si vous voulez que quelque chose persiste, **demandez au bot de l'écrire** dans la mémoire.

## Vidange automatique de la mémoire (ping avant compactage)

Lorsqu'une session est **proche de l'auto-compactage**, OpenClaw déclenche un **tour
agentique silencieux** qui rappelle au model d'écrire des mémoires durables **avant** que
le contexte ne soit compacté. Les invites par défaut indiquent explicitement que le model _peut répondre_,
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
- **Silencieux** par défaut : les invites incluent `NO_REPLY` afin que rien ne soit délivré.
- **Deux invites** : une invite utilisateur plus une invite système ajoutent le rappel.
- **Un vidage par cycle de compactage** (suivi dans `sessions.json`).
- **L'espace de travail doit être inscriptible** : si la session s'exécute en mode sandbox avec
  `workspaceAccess: "ro"` ou `"none"`, le vidage est ignoré.

Pour le cycle de vie complet du compactage, voir
[Gestion de session + compactage](/fr/reference/session-management-compaction).

## Recherche de mémoire vectorielle

OpenClaw peut construire un petit index vectoriel sur `MEMORY.md` et `memory/*.md` afin que
les requêtes sémantiques puissent trouver des notes connexes même lorsque le libellé diffère.

Valeurs par défaut :

- Activé par défaut.
- Surveille les modifications des fichiers de mémoire (avec délai/debounce).
- Configurez la recherche de mémoire sous `agents.defaults.memorySearch` (pas au niveau supérieur
  `memorySearch`).
- Utilise des intégrations distantes par défaut. Si `memorySearch.provider` n'est pas défini, OpenClaw sélectionne automatiquement :
  1. `local` si un `memorySearch.local.modelPath` est configuré et que le fichier existe.
  2. `openai` si une clé OpenAI peut être résolue.
  3. `gemini` si une clé Gemini peut être résolue.
  4. `voyage` si une clé Voyage peut être résolue.
  5. `mistral` si une clé Mistral peut être résolue.
  6. Sinon, la recherche de mémoire reste désactivée jusqu'à configuration.
- Le mode local utilise node-llama-cpp et peut nécessiter `pnpm approve-builds`.
- Utilise sqlite-vec (lorsqu'il est disponible) pour accélérer la recherche vectorielle dans SQLite.
- `memorySearch.provider = "ollama"` est également pris en charge pour les intégrations
  Ollama locales/auto-hébergées (`/api/embeddings`), mais n'est pas sélectionné automatiquement.

Les embeddings distants **nécessitent** une clé API pour le fournisseur d'embeddings. OpenClaw résout les clés à partir des profils d'authentification, `models.providers.*.apiKey` ou des variables d'environnement. OAuth Codex couvre uniquement la conversation/complétions et ne satisfait **pas** les embeddings pour la recherche mémoire. Pour Gemini, utilisez `GEMINI_API_KEY` ou `models.providers.google.apiKey`. Pour Voyage, utilisez `VOYAGE_API_KEY` ou `models.providers.voyage.apiKey`. Pour Mistral, utilisez `MISTRAL_API_KEY` ou `models.providers.mistral.apiKey`. Ollama ne nécessite généralement pas de vraie clé API (un espace réservé comme `OLLAMA_API_KEY=ollama-local` suffit lorsque cela est requis par la stratégie locale).
Lors de l'utilisation d'un point de terminaison personnalisé compatible OpenAI, définissez `memorySearch.remote.apiKey` (et `memorySearch.remote.headers` en option).

### Backend QMD (expérimental)

Définissez `memory.backend = "qmd"` pour remplacer l'indexeur SQLite intégré par [QMD](https://github.com/tobi/qmd) : un sidecar de recherche local-first qui combine BM25 + vecteurs + reranking. Markdown reste la source de vérité ; OpenClaw délègue à QMD pour la récupération. Points clés :

**Prérequis**

- Désactivé par défaut. Activation par configuration (`memory.backend = "qmd"`).
- Installez la CLI QMD séparément (`bun install -g https://github.com/tobi/qmd` ou récupérez une version) et assurez-vous que le binaire `qmd` est sur le `PATH` de la passerelle.
- QMD nécessite une build SQLite qui autorise les extensions (`brew install sqlite` sur macOS).
- QMD s'exécute entièrement localement via Bun + `node-llama-cpp` et télécharge automatiquement les modèles GGUF depuis HuggingFace dès la première utilisation (pas besoin de démon Ollama séparé).
- La passerelle exécute QMD dans un domicile XGD autonome sous `~/.openclaw/agents/<agentId>/qmd/` en définissant `XDG_CONFIG_HOME` et `XDG_CACHE_HOME`.
- Support OS : macOS et Linux fonctionnent immédiatement une fois Bun + SQLite installés. Windows est mieux supporté via WSL2.

**Fonctionnement du sidecar**

- La passerelle écrit un domicile QMD autonome sous `~/.openclaw/agents/<agentId>/qmd/` (config + cache + base de données sqlite).
- Les collections sont créées via `qmd collection add` à partir de `memory.qmd.paths`
  (plus les fichiers mémoire par défaut de l'espace de travail), puis `qmd update` + `qmd embed` s'exécutent
  au démarrage et à un intervalle configurable (`memory.qmd.update.interval`,
  par défaut 5 m).
- La passerelle initialise désormais le gestionnaire QMD au démarrage, de sorte que les minuteries de mise à jour périodique sont armées même avant le premier appel `memory_search`.
- L'actualisation au démarrage s'exécute désormais en arrière-plan par défaut, afin que le démarrage du chat ne soit pas bloqué ; définissez `memory.qmd.update.waitForBootSync = true` pour conserver l'ancien comportement bloquant.
- Les recherches s'exécutent via `memory.qmd.searchMode` (par défaut `qmd search --json` ; prend également en charge `vsearch` et `query`). Si le mode sélectionné rejette les indicateurs de votre version QMD, OpenClaw réessaie avec `qmd query`. Si QMD échoue ou si le binaire est manquant, OpenClaw revient automatiquement au gestionnaire SQLite intégré afin que les outils de mémoire continuent de fonctionner.
- OpenClaw n'expose pas aujourd'hui le réglage de la taille de lot d'intégration QMD ; le comportement du lot est contrôlé par QMD lui-même.
- **La première recherche peut être lente** : QMD peut télécharger des modèles GGUF locaux (reranker/expansion de requête) lors de la première exécution `qmd query`.
  - OpenClaw définit `XDG_CONFIG_HOME`/`XDG_CACHE_HOME` automatiquement lorsqu'il exécute QMD.
  - Si vous souhaitez pré-télécharger manuellement les modèles (et chauffer le même index que OpenClaw
    utilise), exécutez une requête unique avec les répertoires XDG de l'agent.

    L'état QMD de OpenClaw réside dans votre **répertoire d'état** (par défaut `~/.openclaw`).
    Vous pouvez pointer `qmd` vers exactement le même index en exportant les mêmes variables XDG que OpenClaw utilise :

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
- `includeDefaultMemory` (par défaut `true`) : indexation automatique de `MEMORY.md` + `memory/**/*.md`.
- `paths[]` : ajouter des répertoires/fichiers supplémentaires (`path`, optionnel `pattern`, optionnel
  stable `name`).
- `sessions` : opter pour l'indexation JSONL de session (`enabled`, `retentionDays`,
  `exportDir`).
- `update` : contrôle la cadence de rafraîchissement et l'exécution de la maintenance :
  (`interval`, `debounceMs`, `onBoot`, `waitForBootSync`, `embedInterval`,
  `commandTimeoutMs`, `updateTimeoutMs`, `embedTimeoutMs`).
- `limits` : limiter la charge utile de rappel (`maxResults`, `maxSnippetChars`,
  `maxInjectedChars`, `timeoutMs`).
- `scope` : même schéma que [`session.sendPolicy`](/fr/gateway/configuration#session).
  La valeur par défaut est DM uniquement (`deny` all, `allow` direct chats) ; assouplissez-la pour afficher les résultats QMD
  dans les groupes/canaux.
  - `match.keyPrefix` correspond à la clé de session **normalisée** (en minuscules, sans tout
    `agent:<id>:` de tête). Exemple : `discord:channel:`.
  - `match.rawKeyPrefix` correspond à la clé de session **brute** (en minuscules), y compris
    `agent:<id>:`. Exemple : `agent:main:discord:`.
  - Héritage : `match.keyPrefix: "agent:..."` est toujours traité comme un préfixe de clé brute,
    mais préférez `rawKeyPrefix` pour plus de clarté.
- Lorsque `scope` refuse une recherche, OpenClaw enregistre un avertissement avec le `channel`/`chatType` dérivé
  afin que les résultats vides soient plus faciles à déboguer.
- Les extraits provenant de l'extérieur de l'espace de travail apparaissent comme
  `qmd/<collection>/<relative-path>` dans les résultats `memory_search` ; `memory_get`
  comprend ce préfixe et lit à partir de la racine de collection QMD configurée.
- Lorsque `memory.qmd.sessions.enabled = true`, OpenClaw exporte les transcriptions de session
  nettoyées (tours Utilisateur/Assistant) dans une collection QMD dédiée sous
  `~/.openclaw/agents/<id>/qmd/sessions/`, afin que `memory_search` puisse rappeler les conversations
  récentes sans toucher à l'index SQLite intégré.
- Les extraits `memory_search` incluent désormais un pied de page `Source: <path#line>` lorsque
  `memory.citations` est `auto`/`on` ; définissez `memory.citations = "off"` pour conserver
  les métadonnées de chemin en interne (l'agent reçoit toujours le chemin pour
  `memory_get`, mais le texte de l'extrait omet le pied de page et l'invite système
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
- Lorsque `qmd` s'exécute, nous marquons `status().backend = "qmd"` afin que les diagnostics montrent quel
  moteur a servi les résultats. Si le sous-processus QMD se termine ou si la sortie JSON ne peut pas être
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
- Si `memorySearch.multimodal.enabled = true`, OpenClaw indexe également les fichiers image/audio pris en charge sous `extraPaths` uniquement. Les racines de mémoire par défaut (`MEMORY.md`, `memory.md`, `memory/**/*.md`) restent en Markdown uniquement.
- Les liens symboliques sont ignorés (fichiers ou répertoires).

### Fichiers de mémoire multimodaux (image + audio Gemini)

OpenClaw peut indexer les fichiers image et audio de `memorySearch.extraPaths` lors de l'utilisation de Gemini embedding 2 :

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

Notes :

- La mémoire multimodale est actuellement prise en charge uniquement pour `gemini-embedding-2-preview`.
- L'indexation multimodale s'applique uniquement aux fichiers découverts via `memorySearch.extraPaths`.
- Modalités prises en charge à cette phase : image et audio.
- `memorySearch.fallback` doit rester `"none"` tant que la mémoire multimodale est activée.
- Les octets des fichiers image/audio correspondants sont téléchargés vers le point de terminaison d'incorporation Gemini configuré lors de l'indexation.
- Extensions d'image prises en charge : `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.heic`, `.heif`.
- Extensions audio prises en charge : `.mp3`, `.wav`, `.ogg`, `.opus`, `.m4a`, `.aac`, `.flac`.
- Les requêtes de recherche restent textuelles, mais Gemini peut comparer ces requêtes textuelles aux incorporations image/audio indexées.
- `memory_get` lit toujours uniquement le Markdown ; les fichiers binaires sont recherchables mais ne sont pas renvoyés en tant que contenu de fichier brut.

### Gemini embeddings (natif)

Définissez le fournisseur sur `gemini` pour utiliser l'API Gemini embeddings directement :

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

Notes :

- `remote.baseUrl` est facultatif (par défaut, l'URL de base de l'API Gemini).
- `remote.headers` vous permet d'ajouter des en-têtes supplémentaires si nécessaire.
- Modèle par défaut : `gemini-embedding-001`.
- `gemini-embedding-2-preview` est également pris en charge : limite de 8192 jetons et dimensions configurables (768 / 1536 / 3072, par défaut 3072).

#### Gemini Embedding 2 (aperçu)

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

Si vous souhaitez utiliser un **point de terminaison compatible OpenAI personnalisé** (OpenRouter, vLLM, ou un proxy),
vous pouvez utiliser la configuration `remote` avec le fournisseur OpenAI :

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

Secours (Fallbacks) :

- `memorySearch.fallback` peut être `openai`, `gemini`, `voyage`, `mistral`, `ollama`, `local` ou `none`.
- Le fournisseur de secours n'est utilisé que lorsque le fournisseur d'intégration principal échoue.

Indexation par lots (OpenAI + Gemini + Voyage) :

- Désactivé par défaut. Définissez `agents.defaults.memorySearch.remote.batch.enabled = true` pour activer l'indexation de grands corpus (OpenAI, Gemini et Voyage).
- Le comportement par défaut attend la fin du lot ; ajustez `remote.batch.wait`, `remote.batch.pollIntervalMs` et `remote.batch.timeoutMinutes` si nécessaire.
- Définissez `remote.batch.concurrency` pour contrôler le nombre de tâches par lots que nous soumettons en parallèle (par défaut : 2).
- Le mode par lots s'applique lorsque `memorySearch.provider = "openai"` ou `"gemini"` et utilise la clé API correspondante.
- Les tâches par lots Gemini utilisent le point de terminaison asynchrone d'intégrations par lots et nécessitent la disponibilité de l'API Batch Gemini.

Pourquoi le lot OpenAI est rapide + économique :

- Pour les rétroremplissages (backfills) importants, OpenAI est généralement l'option la plus rapide que nous supportons car nous pouvons soumettre de nombreuses demandes d'intégration dans une seule tâche par lots et laisser OpenAI les traiter de manière asynchrone.
- OpenAI propose des tarifs réduits pour les charges de travail de l'API Batch, les exécutions d'indexation importantes sont donc généralement moins chères que l'envoi des mêmes demandes de manière synchrone.
- Voir la documentation et les tarifs de l'API Batch OpenAI pour plus de détails :
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

- `memory_search` — renvoie des extraits avec des plages de fichiers + lignes.
- `memory_get` — lit le contenu du fichier de mémoire par chemin.

Mode local :

- Définissez `agents.defaults.memorySearch.provider = "local"`.
- Fournissez `agents.defaults.memorySearch.local.modelPath` (URI GGUF ou `hf:`).
- Optionnel : définissez `agents.defaults.memorySearch.fallback = "none"` pour éviter le secours à distance.

### Fonctionnement des outils de mémoire

- `memory_search` recherche sémantiquement des fragments Markdown (cible ~400 tokens, chevauchement de 80 tokens) à partir de `MEMORY.md` + `memory/**/*.md`. Il renvoie le texte de l'extrait (plafonné à ~700 caractères), le chemin du fichier, la plage de lignes, le score, le provider/model, et indique si nous sommes revenus des embeddings locaux → distants. Aucune charge utile de fichier complet n'est renvoyée.
- `memory_get` lit un fichier Markdown mémoire spécifique (relatif à l'espace de travail), optionnellement à partir d'une ligne de départ et pour N lignes. Les chemins en dehors de `MEMORY.md` / `memory/` sont rejetés.
- Les deux outils sont activés uniquement lorsque `memorySearch.enabled` résolu à vrai pour l'agent.

### Ce qui est indexé (et quand)

- Type de fichier : Markdown uniquement (`MEMORY.md`, `memory/**/*.md`).
- Stockage de l'index : SQLite par agent à `~/.openclaw/memory/<agentId>.sqlite` (configurable via `agents.defaults.memorySearch.store.path`, supporte le token `{agentId}`).
- Fraîcheur : un observateur sur `MEMORY.md` + `memory/` marque l'index comme sale (anti-rebond 1,5 s). La synchronisation est planifiée au démarrage de la session, lors d'une recherche ou à intervalle régulier et s'exécute de manière asynchrone. Les transcriptions de session utilisent des seuils delta pour déclencher une synchronisation en arrière-plan.
- Déclencheurs de réindexation : l'index stocke le **provider/model d'embedding + empreinte de l'endpoint + paramètres de découpage**. Si l'un de ceux-ci change, OpenClaw réinitialise et réindexe automatiquement tout le magasin.

### Recherche hybride (BM25 + vecteur)

Lorsqu'il est activé, OpenClaw combine :

- **Similarité vectorielle** (correspondance sémantique, le libellé peut différer)
- **Pertinence des mots-clés BM25** (tokens exacts comme les IDs, env vars, symboles de code)

Si la recherche en texte intégral n'est pas disponible sur votre plateforme, OpenClaw revient à une recherche par vecteur uniquement.

#### Pourquoi hybride ?

La recherche vectorielle est excellente pour « cela signifie la même chose » :

- « hôte de la passerelle Mac Studio » vs « la machine exécutant la passerelle »
- « anti-rebond des mises à jour de fichiers » vs « éviter l'indexation à chaque écriture »

Mais elle peut être faible sur les tokens exacts à fort signal :

- IDs (`a828e60`, `b3b9895a…`)
- symboles de code (`memorySearch.query.hybrid`)
- chaînes d'erreur ("sqlite-vec indisponible")

BM25 (texte intégral) est l'inverse : fort pour les jetons exacts, plus faible pour les paraphrases.
La recherche hybride est le terrain d'entente pragmatique : **utiliser les deux signaux de récupération** afin d'obtenir
de bons résultats pour les requêtes en « langage naturel » et les requêtes de type « aiguille dans une botte de foin ».

#### Comment nous fusionnons les résultats (la conception actuelle)

Esquisse de l'implémentation :

1. Récupérer un pool de candidats des deux côtés :

- **Vecteur** : le `maxResults * candidateMultiplier` premier par similarité cosinus.
- **BM25** : le `maxResults * candidateMultiplier` premier par le rang BM25 FTS5 (le plus petit est le meilleur).

2. Convertir le rang BM25 en un score entre 0 et 1 :

- `textScore = 1 / (1 + max(0, bm25Rank))`

3. Unir les candidats par identifiant de chunk et calculer un score pondéré :

- `finalScore = vectorWeight * vectorScore + textWeight * textScore`

Notes :

- `vectorWeight` + `textWeight` est normalisé à 1,0 lors de la résolution de la configuration, de sorte que les poids se comportent comme des pourcentages.
- Si les embeddings ne sont pas disponibles (ou si le fournisseur renvoie un vecteur nul), nous exécutons toujours BM25 et renvoyons les correspondances de mots-clés.
- Si FTS5 ne peut pas être créé, nous conservons la recherche par vecteur uniquement (pas d'échec brutal).

Ce n'est pas « parfait selon la théorie de la RI », mais c'est simple, rapide et a tendance à améliorer le rappel/la précision sur de vraies notes.
Si nous souhaitons aller plus loin plus tard, les étapes suivantes courantes sont la fusion de rangs réciproque (RRF) ou la normalisation des scores
(min/max ou z-score) avant le mélange.

#### Pipeline de post-traitement

Après avoir fusionné les scores vectoriels et par mots-clés, deux étapes optionnelles de post-traitement
affinent la liste de résultats avant qu'elle n'atteigne l'agent :

```
Vector + Keyword → Weighted Merge → Temporal Decay → Sort → MMR → Top-K Results
```

Les deux étapes sont **désactivées par défaut** et peuvent être activées indépendamment.

#### Reclassement MMR (diversité)

Lorsque la recherche hybride renvoie des résultats, plusieurs chunks peuvent contenir un contenu similaire ou se chevaucher.
Par exemple, une recherche sur « configuration du réseau domestique » pourrait renvoyer cinq extraits presque identiques
provenant de différentes notes quotidiennes qui mentionnent toutes la même configuration de routeur.

Le **MMR (Maximal Marginal Relevance)** re-classe les résultats pour équilibrer la pertinence et la diversité,
garantissant que les principaux résultats couvrent différents aspects de la requête au lieu de répéter les mêmes informations.

Fonctionnement :

1. Les résultats sont notés selon leur pertinence d'origine (score pondéré vecteur + BM25).
2. Le MMR sélectionne de manière itérative les résultats qui maximisent : `λ × relevance − (1−λ) × max_similarity_to_selected`.
3. La similarité entre les résultats est mesurée à l'aide de la similarité textuelle de Jaccard sur le contenu tokenisé.

Le paramètre `lambda` contrôle le compromis :

- `lambda = 1.0` → pertinence pure (aucune pénalité de diversité)
- `lambda = 0.0` → diversité maximale (ignore la pertinence)
- Par défaut : `0.7` (équilibré, légère préférence de pertinence)

**Exemple — requête : "configuration du réseau domestique"**

Étant donné ces fichiers de mémoire :

```
memory/2026-02-10.md  → "Configured Omada router, set VLAN 10 for IoT devices"
memory/2026-02-08.md  → "Configured Omada router, moved IoT to VLAN 10"
memory/2026-02-05.md  → "Set up AdGuard DNS on 192.168.10.2"
memory/network.md     → "Router: Omada ER605, AdGuard: 192.168.10.2, VLAN 10: IoT"
```

Sans MMR — top 3 résultats :

```
1. memory/2026-02-10.md  (score: 0.92)  ← router + VLAN
2. memory/2026-02-08.md  (score: 0.89)  ← router + VLAN (near-duplicate!)
3. memory/network.md     (score: 0.85)  ← reference doc
```

Avec MMR (λ=0.7) — top 3 résultats :

```
1. memory/2026-02-10.md  (score: 0.92)  ← router + VLAN
2. memory/network.md     (score: 0.85)  ← reference doc (diverse!)
3. memory/2026-02-05.md  (score: 0.78)  ← AdGuard DNS (diverse!)
```

Le quasi-double du 8 février disparaît, et l'agent obtient trois informations distinctes.

**Quand activer :** Si vous remarquez que `memory_search` renvoie des extraits redondants ou presque identiques,
surtout avec des notes quotidiennes qui répètent souvent des informations similaires d'un jour à l'autre.

#### Décroissance temporelle (boost de récence)

Les agents avec des notes quotidiennes accumulent des centaines de fichiers datés au fil du temps. Sans décroissance,
une note bien rédigée d'il y a six mois peut surpasser la mise à jour d'hier sur le même sujet.

La **décroissance temporelle** applique un multiplicateur exponentiel aux scores en fonction de l'âge de chaque résultat,
ainsi les souvenirs récents sont naturellement mieux classés tandis que les anciens s'estompent :

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

**Les fichiers persistants ne sont jamais dégradés :**

- `MEMORY.md` (fichier mémoire racine)
- Fichiers non datés dans `memory/` (par ex., `memory/projects.md`, `memory/network.md`)
- Ceux-ci contiennent des informations de référence durables qui doivent toujours être classées normalement.

Les **fichiers quotidiens datés** (`memory/YYYY-MM-DD.md`) utilisent la date extraite du nom du fichier.
D'autres sources (par ex., les transcripts de session) reviennent à l'heure de modification du fichier (`mtime`).

**Exemple — requête : "quel est l'horaire de travail de Rod ?"**

Étant donné ces fichiers de mémoire (nous sommes le 10 février) :

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

La note obsolète de septembre descend en bas malgré la meilleure correspondance sémantique brute.

**Quand activer :** Si votre agent a des mois de notes quotidiennes et vous constatez que d'anciennes informations obsolètes surclassent le contexte récent. Une demi-vie de 30 jours fonctionne bien pour les flux de travail riches en notes quotidiennes ; augmentez-la (par exemple, 90 jours) si vous faites souvent référence à des notes plus anciennes.

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
- **Les deux** — recommandé pour les agents ayant un historique de notes quotidiennes volumineux et de longue durée.

### Cache d'embeddings

OpenClaw peut mettre en cache les **embeddings de segments** dans SQLite afin que la réindexation et les mises à jour fréquentes (surtout les transcripts de session) ne ré-embedded pas le texte inchangé.

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

### Recherche dans la mémoire de session (expérimental)

Vous pouvez optionnellement indexer les **transcripts de session** et les afficher via `memory_search`.
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
- Les mises à jour de session sont différées (debounced) et **indexées de manière asynchrone** une fois qu'elles dépassent les seuils de variation (best-effort).
- `memory_search` ne bloque jamais sur l'indexation ; les résultats peuvent être légèrement obsolètes jusqu'à ce que la synchronisation en arrière-plan se termine.
- Les résultats incluent toujours uniquement des extraits ; `memory_get` reste limité aux fichiers mémoire.
- L'indexation de session est isolée par agent (seuls les journaux de session de cet agent sont indexés).
- Les journaux de session résident sur le disque (`~/.openclaw/agents/<agentId>/sessions/*.jsonl`). Tout processus/utilisateur ayant accès au système de fichiers peut les lire, traitez donc l'accès au disque comme la limite de confiance (trust boundary). Pour une isolation plus stricte, faites fonctionner les agents sous des utilisateurs ou hôtes OS distincts.

Seuils de variation (valeurs par défaut affichées) :

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
table virtuelle SQLite (`vec0`) et effectue des requêtes de distance vectorielle dans la
base de données. Cela maintient la recherche rapide sans charger chaque embedding en JS.

Configuration (optionnel) :

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

- `enabled` est vrai par défaut ; lorsqu'il est désactivé, la recherche revient à une similarité
  cosinus en processus sur les embeddings stockés.
- Si l'extension sqlite-vec est manquante ou échoue à charger, OpenClaw consigne l'erreur et continue avec la solution de repli JS (pas de table vectorielle).
- `extensionPath` remplace le chemin de sqlite-vec fourni (utile pour les versions personnalisées ou les emplacements d'installation non standards).

### Téléchargement automatique des intégrations locales

- Modèle d'intégration local par défaut : `hf:ggml-org/embeddinggemma-300m-qat-q8_0-GGUF/embeddinggemma-300m-qat-Q8_0.gguf` (~0.6 Go).
- Quand `memorySearch.provider = "local"`, `node-llama-cpp` résout `modelPath` ; si le GGUF est manquant, il est **téléchargé automatiquement** dans le cache (ou vers `local.modelCacheDir` si défini), puis chargé. Les téléchargements reprennent en cas de nouvelle tentative.
- Exigence de construction native : exécutez `pnpm approve-builds`, choisissez `node-llama-cpp`, puis `pnpm rebuild node-llama-cpp`.
- Solution de repli : si la configuration locale échoue et que `memorySearch.fallback = "openai"`, nous basculons automatiquement vers les intégrations distantes (`openai/text-embedding-3-small` sauf si remplacé) et enregistrons la raison.

### Exemple de point de terminaison personnalisé compatible avec OpenAI

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

- `remote.*` prévaut sur `models.providers.openai.*`.
- `remote.headers` fusionnent avec les en-têtes OpenAI ; en cas de conflit de clé, la valeur distante l'emporte. Omettez `remote.headers` pour utiliser les valeurs par défaut OpenAI.

import fr from "/components/footer/fr.mdx";

<fr />
