---
title: "Référence de configuration de la mémoire"
summary: "Référence complète de la configuration pour la recherche de mémoire OpenClaw, les fournisseurs d'embeddings, le backend QMD, la recherche hybride et la mémoire multimodale"
read_when:
  - You want to configure memory search providers or embedding models
  - You want to set up the QMD backend
  - You want to tune hybrid search, MMR, or temporal decay
  - You want to enable multimodal memory indexing
---

# Référence de configuration de la mémoire

Cette page couvre l'ensemble de la configuration pour la recherche de mémoire OpenClaw. Pour
la vue d'ensemble conceptuelle (structure des fichiers, outils de mémoire, quand écrire la mémoire et le
vidage automatique), voir [Mémoire](/fr/concepts/memory).

## Valeurs par défaut de la recherche de mémoire

- Activé par défaut.
- Surveille les modifications des fichiers de mémoire (avec débounce).
- Configurez la recherche de mémoire sous `agents.defaults.memorySearch` (et non au niveau supérieur
  `memorySearch`).
- Utilise des embeddings distants par défaut. Si `memorySearch.provider` n'est pas défini, OpenClaw sélectionne automatiquement :
  1. `local` si un `memorySearch.local.modelPath` est configuré et que le fichier existe.
  2. `openai` si une clé OpenAI peut être résolue.
  3. `gemini` si une clé Gemini peut être résolue.
  4. `voyage` si une clé Voyage peut être résolue.
  5. `mistral` si une clé Mistral peut être résolue.
  6. Sinon, la recherche de mémoire reste désactivée jusqu'à configuration.
- Le mode local utilise node-llama-cpp et peut nécessiter `pnpm approve-builds`.
- Utilise sqlite-vec (si disponible) pour accélérer la recherche vectorielle dans SQLite.
- `memorySearch.provider = "ollama"` est également pris en charge pour les embeddings
  locaux/auto-hébergés Ollama (`/api/embeddings`), mais il n'est pas sélectionné automatiquement.

Les embeddings distants **nécessitent** une clé API pour le provider d'embeddings. OpenClaw
résout les clés à partir des profils d'authentification, de `models.providers.*.apiKey` ou des variables
d'environnement. Le OAuth Codex couvre uniquement la conversation/les complétions et ne **satisfait pas**
les embeddings pour la recherche mémoire. Pour Gemini, utilisez `GEMINI_API_KEY` ou
`models.providers.google.apiKey`. Pour Voyage, utilisez `VOYAGE_API_KEY` ou
`models.providers.voyage.apiKey`. Pour Mistral, utilisez `MISTRAL_API_KEY` ou
`models.providers.mistral.apiKey`. Ollama ne nécessite généralement pas de véritable clé API
(un espace réservé comme `OLLAMA_API_KEY=ollama-local` suffit lorsque cela est requis par
la stratégie locale).
Lors de l'utilisation d'un point de terminaison personnalisé compatible OpenAI,
définissez `memorySearch.remote.apiKey` (et `memorySearch.remote.headers` en option).

## Backend QMD (expérimental)

Définissez `memory.backend = "qmd"` pour remplacer l'indexeur SQLite intégré par
[QMD](https://github.com/tobi/qmd) : un sidecar de recherche local-first qui combine
BM25 + vecteurs + reranking. Markdown reste la source de vérité ; OpenClaw délègue
à QMD pour la récupération. Points clés :

### Prérequis

- Désactivé par défaut. Activation par configuration (`memory.backend = "qmd"`).
- Installez le CLI QMD séparément (`bun install -g https://github.com/tobi/qmd` ou récupérez
  une release) et assurez-vous que le binaire `qmd` est dans le `PATH` de la passerelle.
- QMD a besoin d'une version de SQLite qui permet les extensions (`brew install sqlite` sur
  macOS).
- QMD s'exécute entièrement localement via Bun + `node-llama-cpp` et télécharge automatiquement les modèles GGUF
  depuis HuggingFace lors de la première utilisation (aucun démon Ollama séparé requis).
- La passerelle exécute QMD dans un répertoire personnel XGD autonome sous
  `~/.openclaw/agents/<agentId>/qmd/` en définissant `XDG_CONFIG_HOME` et
  `XDG_CACHE_HOME`.
- Support OS : macOS et Linux fonctionnent hors de la boîte une fois Bun + SQLite installés.
  Windows est mieux pris en charge via WSL2.

### Fonctionnement du sidecar

- La passerelle écrit un répertoire personnel QMD autonome sous
  `~/.openclaw/agents/<agentId>/qmd/` (config + cache + base de données SQLite).
- Les collections sont créées via `qmd collection add` à partir de `memory.qmd.paths`
  (plus les fichiers mémoire de l'espace de travail par défaut), puis `qmd update` + `qmd embed` s'exécutent
  au démarrage et à un intervalle configurable (`memory.qmd.update.interval`,
  5 m par défaut).
- La passerelle initialise désormais le gestionnaire QMD au démarrage, de sorte que les minuteries de mise à jour périodique sont armées même avant le premier appel `memory_search`.
- L'actualisation du démarrage s'exécute désormais en arrière-plan par défaut afin que le démarrage de la discussion ne soit pas bloqué ; définissez `memory.qmd.update.waitForBootSync = true` pour conserver le
  comportement bloquant précédent.
- Les recherches s'exécutent via `memory.qmd.searchMode` (par défaut `qmd search --json` ; prend également en charge
  `vsearch` et `query`). Si le mode sélectionné rejette les indicateurs sur votre
  build QMD, OpenClaw réessaie avec `qmd query`. Si QMD échoue ou si le binaire est
  manquant, OpenClaw revient automatiquement au gestionnaire SQLite intégré afin que
  les outils mémoire continuent de fonctionner.
- OpenClaw n'expose pas aujourd'hui le réglage de la taille de lot d'intégration QMD ; le comportement du lot est
  contrôlé par QMD lui-même.
- **La première recherche peut être lente** : QMD peut télécharger des modèles GGUF locaux (reranker/expansion de
  requêtes) lors de la première exécution `qmd query`.
  - OpenClaw définit `XDG_CONFIG_HOME`/`XDG_CACHE_HOME` automatiquement lorsqu'il exécute QMD.
  - Si vous souhaitez pré-télécharger manuellement les modèles (et préchauffer le même index que OpenClaw
    utilise), exécutez une requête unique avec les répertoires XDG de l'agent.

    L'état QMD de OpenClaw réside dans votre **répertoire d'état** (par défaut `~/.openclaw`).
    Vous pouvez pointer `qmd` vers exactement le même index en exportant les mêmes variables XDG
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

### Surface de configuration (`memory.qmd.*`)

- `command` (par défaut `qmd`) : remplacer le chemin de l'exécutable.
- `searchMode` (par défaut `search`) : choisir quelle commande QMD prend en charge
  `memory_search` (`search`, `vsearch`, `query`).
- `includeDefaultMemory` (par défaut `true`) : indexation automatique `MEMORY.md` + `memory/**/*.md`.
- `paths[]` : ajouter des répertoires/fichiers supplémentaires (`path`, `pattern` facultatif,
  stable `name` facultatif).
- `sessions` : activer l'indexation JSONL de session (`enabled`, `retentionDays`,
  `exportDir`).
- `update` : contrôle la cadence de rafraîchissement et l'exécution de la maintenance :
  (`interval`, `debounceMs`, `onBoot`, `waitForBootSync`, `embedInterval`,
  `commandTimeoutMs`, `updateTimeoutMs`, `embedTimeoutMs`).
- `limits` : limiter la charge utile de rappel (`maxResults`, `maxSnippetChars`,
  `maxInjectedChars`, `timeoutMs`).
- `scope` : même schéma que [`session.sendPolicy`](/fr/gateway/configuration-reference#session).
  Par défaut, réservé aux DM (`deny` tout, `allow` chats directs) ; desserrez-le pour afficher les résultats QMD
  dans les groupes/canaux.
  - `match.keyPrefix` correspond à la clé de session **normalisée** (en minuscules, tout `agent:<id>:` de tête supprimé).
    Exemple : `discord:channel:`.
  - `match.rawKeyPrefix` correspond à la clé de session **brute** (en minuscules), y compris le `agent:<id>:`.
    Exemple : `agent:main:discord:`.
  - Héritage : `match.keyPrefix: "agent:..."` est toujours traité comme un préfixe de clé brute,
    mais préférez `rawKeyPrefix` pour plus de clarté.
- Lorsque `scope` refuse une recherche, OpenClaw enregistre un avertissement avec les
  `channel`/`chatType` dérivés pour faciliter le débogage des résultats vides.
- Les extraits provenant de l'extérieur de l'espace de travail apparaissent sous la forme de
  `qmd/<collection>/<relative-path>` dans les résultats de `memory_search` ; `memory_get`
  comprend ce préfixe et lit à partir de la racine de collection QMD configurée.
- Lorsque `memory.qmd.sessions.enabled = true`, OpenClaw exporte des transcriptions de session nettoyées (tours Utilisateur/Assistant) dans une collection QMD dédiée sous
  `~/.openclaw/agents/<id>/qmd/sessions/`, afin que `memory_search` puisse se rappeler les conversations
  récentes sans toucher à l'index SQLite intégré.
- Les extraits `memory_search` incluent désormais un pied de page `Source: <path#line>` lorsque
  `memory.citations` est `auto`/`on` ; définissez `memory.citations = "off"` pour garder
  les métadonnées de chemin internes (l'agent reçoit toujours le chemin pour
  `memory_get`, mais le texte de l'extrait omet le pied de page et le prompt système
  avertit l'agent de ne pas le citer).

### Exemple QMD

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

### Citations et repli (fallback)

- `memory.citations` s'applique quel que soit le backend (`auto`/`on`/`off`).
- Lorsque `qmd` s'exécute, nous marquons `status().backend = "qmd"` pour que les diagnostics montrent quel
  moteur a servi les résultats. Si le sous-processus QMD se termine ou si la sortie JSON ne peut pas être
  analysée, le gestionnaire de recherche enregistre un avertissement et renvoie le provider intégré
  (embeddings Markdown existants) jusqu'à ce que QMD se rétablisse.

## Chemins de mémoire supplémentaires

Si vous souhaitez indexer des fichiers Markdown en dehors de la structure d'espace de travail par défaut, ajoutez
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
- Les répertoires sont scannés récursivement pour les fichiers `.md`.
- Par défaut, seuls les fichiers Markdown sont indexés.
- Si `memorySearch.multimodal.enabled = true`, OpenClaw indexe également les fichiers image/audio pris en charge sous `extraPaths` uniquement. Les racines de mémoire par défaut (`MEMORY.md`, `memory.md`, `memory/**/*.md`) restent Markdown uniquement.
- Les liens symboliques sont ignorés (fichiers ou répertoires).

## Fichiers de mémoire multimodaux (image + audio Gemini)

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
- Les octets des fichiers image/audio correspondants sont téléchargés vers le point de terminaison d'embedding Gemini configuré lors de l'indexation.
- Extensions d'image prises en charge : `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.heic`, `.heif`.
- Extensions audio prises en charge : `.mp3`, `.wav`, `.ogg`, `.opus`, `.m4a`, `.aac`, `.flac`.
- Les requêtes de recherche restent textuelles, mais Gemini peut comparer ces requêtes textuelles aux embeddings image/audio indexés.
- `memory_get` lit toujours uniquement le Markdown ; les fichiers binaires sont recherchables mais ne sont pas renvoyés en tant que contenu de fichier brut.

## Embeddings Gemini (natifs)

Définissez le fournisseur sur `gemini` pour utiliser l'API d'embeddings Gemini directement :

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

### Gemini Embedding 2 (aperçu)

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

> **Réindexation requise :** Le passage de `gemini-embedding-001` (768 dimensions)
> à `gemini-embedding-2-preview` (3072 dimensions) modifie la taille du vecteur. Il en va de même si vous
> modifiez `outputDimensionality` entre 768, 1536 et 3072.
> OpenClaw réindexera automatiquement lorsqu'il détectera un changement de modèle ou de dimension.

## Point de terminaison personnalisé compatible avec OpenAI

Si vous souhaitez utiliser un point de terminaison personnalisé compatible avec OpenAI (OpenRouter, vLLM ou un proxy),
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

### Replis (Fallbacks)

- `memorySearch.fallback` peut être `openai`, `gemini`, `voyage`, `mistral`, `ollama`, `local`, ou `none`.
- Le provider de repli n'est utilisé que lorsque le provider d'intégration principal échoue.

### Indexation par lots (OpenAI + Gemini + Voyage)

- Désactivé par défaut. Définissez `agents.defaults.memorySearch.remote.batch.enabled = true` pour activer l'indexation de grands corpus (OpenAI, Gemini et Voyage).
- Le comportement par défaut attend la fin du lot ; ajustez `remote.batch.wait`, `remote.batch.pollIntervalMs` et `remote.batch.timeoutMinutes` si nécessaire.
- Définissez `remote.batch.concurrency` pour contrôler le nombre de travaux par lots que nous soumettons en parallèle (par défaut : 2).
- Le mode par lots s'applique lorsque `memorySearch.provider = "openai"` ou `"gemini"` et utilise la clé API correspondante.
- Les travaux par lots Gemini utilisent le point de terminaison asynchrone d'intégrations par lots et nécessitent la disponibilité de l'API de lot Gemini.

Pourquoi le lot OpenAI est rapide et économique :

- Pour les rétroremplissages (backfills) importants, OpenAI est généralement l'option la plus rapide que nous prenons en charge car nous pouvons soumettre de nombreuses demandes d'intégration dans un seul travail par lot et laisser OpenAI les traiter de manière asynchrone.
- OpenAI propose une tarification réduite pour les charges de travail de l'API de lot, les exécutions d'indexation importantes sont donc généralement moins coûteuses que l'envoi des mêmes demandes de manière synchrone.
- Consultez la documentation et la tarification de l'API de lot OpenAI pour plus de détails :
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

## Fonctionnement des outils de mémoire

- `memory_search` recherche sémantiquement des chunks Markdown (~400 tokens cibles, chevauchement de 80 tokens) à partir de `MEMORY.md` + `memory/**/*.md`. Il renvoie le texte de l'extrait (plafonné à ~700 caractères), le chemin du fichier, la plage de lignes, le score, le provider/modèle, et indique si une repli a eu lieu des embeddings locaux vers distants. Aucune charge utile de fichier complet n'est renvoyée.
- `memory_get` lit un fichier Markdown de mémoire spécifique (relatif à l'espace de travail), en option à partir d'une ligne de départ et pour N lignes. Les chemins en dehors de `MEMORY.md` / `memory/` sont rejetés.
- Les deux outils sont activés uniquement lorsque `memorySearch.enabled` est résolu à vrai pour l'agent.

## Ce qui est indexé (et quand)

- Type de fichier : Markdown uniquement (`MEMORY.md`, `memory/**/*.md`).
- Stockage de l'index : SQLite par agent à `~/.openclaw/memory/<agentId>.sqlite` (configurable via `agents.defaults.memorySearch.store.path`, prend en charge le token `{agentId}`).
- Fraîcheur : un observateur sur `MEMORY.md` + `memory/` marque l'index comme sale (anti-rebond de 1,5 s). La synchronisation est planifiée au démarrage de la session, lors d'une recherche ou à intervalle régulier et s'exécute de manière asynchrone. Les transcriptions de session utilisent des seuils de delta pour déclencher une synchronisation en arrière-plan.
- Déclencheurs de réindexation : l'index stocke le **provider/modèle d'embedding + empreinte de l'endpoint + params de découpage**. Si l'un de ces éléments change, OpenClaw réinitialise et réindexe automatiquement l'ensemble du magasin.

## Recherche hybride (BM25 + vecteur)

Lorsqu'elle est activée, OpenClaw combine :

- **Similarité vectorielle** (correspondance sémantique, la formulation peut différer)
- **Pertinence de mots-clés BM25** (tokens exacts comme les ID, env vars, symboles de code)

Si la recherche en texte intégral n'est pas disponible sur votre plateforme, OpenClaw revient à une recherche par vecteur uniquement.

### Pourquoi l'hybride

La recherche vectorielle est excellente pour « cela signifie la même chose » :

- « hôte de la passerelle Mac Studio » contre « la machine exécutant la passerelle »
- « mettre à jour le fichier en anti-rebond » contre « éviter l'indexation à chaque écriture »

Mais elle peut être faible sur les tokens exacts à fort signal :

- IDs (`a828e60`, `b3b9895a...`)
- symboles de code (`memorySearch.query.hybrid`)
- chaînes d'erreur (« sqlite-vec unavailable »)

BM25 (texte intégral) est l'inverse : fort pour les jetons exacts, plus faible pour les paraphrases.
La recherche hybride est le juste milieu pragmatique : **utilisez les deux signaux de récupération** afin d'obtenir
de bons résultats pour les requêtes en « langage naturel » comme pour les recherches de « l'aiguille dans la botte de foin ».

### Comment nous fusionnons les résultats (la conception actuelle)

Esquisse de l'implémentation :

1. Récupérer un pool de candidats des deux côtés :

- **Vecteur** : les `maxResults * candidateMultiplier` premiers par similarité cosinus.
- **BM25** : les `maxResults * candidateMultiplier` premiers par le rang BM25 FTS5 (plus bas est meilleur).

2. Convertir le rang BM25 en un score compris entre 0 et 1 environ :

- `textScore = 1 / (1 + max(0, bm25Rank))`

3. Union des candidats par identifiant de bloc (chunk id) et calcul d'un score pondéré :

- `finalScore = vectorWeight * vectorScore + textWeight * textScore`

Notes :

- `vectorWeight` + `textWeight` est normalisé à 1,0 lors de la résolution de la configuration, de sorte que les pondérations se comportent comme des pourcentages.
- Si les embeddings ne sont pas disponibles (ou si le fournisseur renvoie un vecteur nul), nous exécutons toujours BM25 et renvoyons les correspondances de mots-clés.
- Si FTS5 ne peut pas être créé, nous conservons la recherche par vecteur uniquement (pas d'échec brutal).

Ce n'est pas « parfait selon la théorie de la RI », mais c'est simple, rapide et a tendance à améliorer la rappel/précision sur de vraies notes.
Si nous souhaitons aller plus loin par la suite, les étapes suivantes courantes sont la Fusion de Rang Réciproque (RRF) ou la normalisation des scores
(min/max ou z-score) avant le mélange.

### Pipeline de post-traitement

Après avoir fusionné les scores vectoriels et par mots-clés, deux étapes de post-traitement facultatives
affinent la liste de résultats avant qu'elle n'atteigne l'agent :

```
Vector + Keyword -> Weighted Merge -> Temporal Decay -> Sort -> MMR -> Top-K Results
```

Les deux étapes sont **désactivées par défaut** et peuvent être activées indépendamment.

### Réévaluation MMR (diversité)

Lorsque la recherche hybride renvoie des résultats, plusieurs blocs peuvent contenir du contenu similaire ou se chevauchant.
Par exemple, la recherche de « configuration réseau domestique » pourrait renvoyer cinq extraits presque identiques
depuis différentes notes quotidiennes qui mentionnent toutes la même configuration de routeur.

La **réévaluation MMR (Maximal Marginal Relevance)** réorganise les résultats pour équilibrer la pertinence et la diversité,
veillant à ce que les principaux résultats couvrent différents aspects de la requête au lieu de répéter les mêmes informations.

Fonctionnement :

1. Les résultats sont notés selon leur pertinence d'origine (score pondéré vecteur + BM25).
2. Le MMR sélectionne de manière itérative les résultats qui maximisent : `lambda x relevance - (1-lambda) x max_similarity_to_selected`.
3. La similarité entre les résultats est mesurée à l'aide de la similarité de texte Jaccard sur le contenu tokenisé.

Le paramètre `lambda` contrôle le compromis :

- `lambda = 1.0` -- pertinence pure (aucune pénalité de diversité)
- `lambda = 0.0` -- diversité maximale (ignore la pertinence)
- Par défaut : `0.7` (équilibré, légère préférence pour la pertinence)

**Exemple -- requête : "configuration du réseau domestique"**

Compte tenu de ces fichiers mémoire :

```
memory/2026-02-10.md  -> "Configured Omada router, set VLAN 10 for IoT devices"
memory/2026-02-08.md  -> "Configured Omada router, moved IoT to VLAN 10"
memory/2026-02-05.md  -> "Set up AdGuard DNS on 192.168.10.2"
memory/network.md     -> "Router: Omada ER605, AdGuard: 192.168.10.2, VLAN 10: IoT"
```

Sans MMR -- 3 premiers résultats :

```
1. memory/2026-02-10.md  (score: 0.92)  <- router + VLAN
2. memory/2026-02-08.md  (score: 0.89)  <- router + VLAN (near-duplicate!)
3. memory/network.md     (score: 0.85)  <- reference doc
```

Avec MMR (lambda=0.7) -- 3 premiers résultats :

```
1. memory/2026-02-10.md  (score: 0.92)  <- router + VLAN
2. memory/network.md     (score: 0.85)  <- reference doc (diverse!)
3. memory/2026-02-05.md  (score: 0.78)  <- AdGuard DNS (diverse!)
```

Le quasi-double du 8 février disparaît, et l'agent obtient trois informations distinctes.

**Quand activer :** Si vous remarquez que `memory_search` renvoie des extraits redondants ou quasi identiques,
surtout avec des notes quotidiennes qui répètent souvent des informations similaires d'un jour à l'autre.

### Décroissance temporelle (amélioration de la récence)

Les agents avec des notes quotidiennes accumulent des centaines de fichiers datés au fil du temps. Sans décroissance,
une note bien rédigée d'il y a six mois peut surpasser la mise à jour d'hier sur le même sujet.

La **décroissance temporelle** applique un multiplicateur exponentiel aux scores en fonction de l'âge de chaque résultat,
de sorte que les souvenirs récents sont naturellement mieux classés tandis que les anciens s'estompent :

```
decayedScore = score x e^(-lambda x ageInDays)
```

où `lambda = ln(2) / halfLifeDays`.

Avec la demi-vie par défaut de 30 jours :

- Notes d'aujourd'hui : **100 %** du score original
- Il y a 7 jours : **~84 %**
- Il y a 30 jours : **50 %**
- Il y a 90 jours : **12,5 %**
- Il y a 180 jours : **~1,6 %**

**Les fichiers pérennes ne sont jamais dégradés :**

- `MEMORY.md` (fichier mémoire racine)
- Fichiers non datés dans `memory/` (p. ex., `memory/projects.md`, `memory/network.md`)
- Ceux-ci contiennent des informations de référence durables qui doivent toujours être classées normalement.

Les **fichiers quotidiens datés** (`memory/YYYY-MM-DD.md`) utilisent la date extraite du nom du fichier.
D'autres sources (p. ex., les transcriptions de session) utilisent par défaut l'heure de modification du fichier (`mtime`).

**Exemple -- requête : "quel est l'horaire de travail de Rod ?"**

Compte tenu de ces fichiers mémoire (nous sommes le 10 février) :

```
memory/2025-09-15.md  -> "Rod works Mon-Fri, standup at 10am, pairing at 2pm"  (148 days old)
memory/2026-02-10.md  -> "Rod has standup at 14:15, 1:1 with Zeb at 14:45"    (today)
memory/2026-02-03.md  -> "Rod started new team, standup moved to 14:15"        (7 days old)
```

Sans décroissance :

```
1. memory/2025-09-15.md  (score: 0.91)  <- best semantic match, but stale!
2. memory/2026-02-10.md  (score: 0.82)
3. memory/2026-02-03.md  (score: 0.80)
```

Avec décroissance (halfLife=30) :

```
1. memory/2026-02-10.md  (score: 0.82 x 1.00 = 0.82)  <- today, no decay
2. memory/2026-02-03.md  (score: 0.80 x 0.85 = 0.68)  <- 7 days, mild decay
3. memory/2025-09-15.md  (score: 0.91 x 0.03 = 0.03)  <- 148 days, nearly gone
```

La note périmée de septembre tombe en bas malgré la meilleure correspondance sémantique brute.

**Quand activer :** Si votre agent a des mois de notes quotidiennes et que vous constatez que d'anciennes informations obsolètes surclassent le contexte récent. Une demi-vie de 30 jours fonctionne bien pour les flux de travail basés sur des notes quotidiennes ; augmentez-la (par exemple, 90 jours) si vous faites référence fréquemment à des notes plus anciennes.

### Configuration de la recherche hybride

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

- **MMR uniquement** -- utile lorsque vous avez de nombreuses notes similaires mais que l'âge n'importe pas.
- **Décroissance temporelle uniquement** -- utile lorsque la récence compte mais que vos résultats sont déjà diversifiés.
- **Les deux** -- recommandé pour les agents ayant un historique de notes quotidiennes important et de longue durée.

## Cache des embeddings

OpenClaw peut mettre en cache les **embeddings de segments** dans SQLite afin que la réindexation et les mises à jour fréquentes (en particulier les transcriptions de session) n'encodent pas à nouveau le texte inchangé.

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

## Recherche dans la mémoire de session (expérimental)

Vous pouvez facultativement indexer les **transcriptions de session** et les afficher via `memory_search`.
Ceci est verrouillé derrière un indicateur expérimental.

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
- Les mises à jour de session sont soumises à un délai et **indexées de manière asynchrone** une fois qu'elles franchissent les seuils de variation (best-effort).
- `memory_search` ne bloque jamais sur l'indexation ; les résultats peuvent être légèrement obsolètes jusqu'à ce que la synchronisation en arrière-plan soit terminée.
- Les résultats incluent toujours uniquement des extraits ; `memory_get` reste limité aux fichiers de mémoire.
- L'indexation de session est isolée par agent (seuls les journaux de session de cet agent sont indexés).
- Les journaux de session résident sur le disque (`~/.openclaw/agents/<agentId>/sessions/*.jsonl`). Tout processus/utilisateur ayant accès au système de fichiers peut les lire, traitez donc l'accès au disque comme la limite de confiance. Pour une isolation plus stricte, exécutez les agents sous des utilisateurs ou hôtes OS distincts.

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

## Accélération vectorielle SQLite (sqlite-vec)

Lorsque l'extension sqlite-vec est disponible, OpenClaw stocke les embeddings dans une
table virtuelle SQLite (`vec0`) et effectue des requêtes de distance vectorielle dans la
base de données. Cela permet de garder la recherche rapide sans charger chaque embedding dans JS.

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

- `enabled` est true par défaut ; lorsque désactivé, la recherche revient à la similarité cosinus
  en processus sur les embeddings stockés.
- Si l'extension sqlite-vec est manquante ou échoue à charger, OpenClaw enregistre l'erreur et continue avec la solution de repli JS (pas de table vectorielle).
- `extensionPath` remplace le chemin sqlite-vec groupé (utile pour les builds personnalisés ou les emplacements d'installation non standard).

## Téléchargement automatique de l'incorporation locale

- Modèle d'incorporation local par défaut : `hf:ggml-org/embeddinggemma-300m-qat-q8_0-GGUF/embeddinggemma-300m-qat-Q8_0.gguf` (~0,6 Go).
- Lorsque `memorySearch.provider = "local"`, `node-llama-cpp` résout `modelPath` ; si le GGUF est manquant, il **le télécharge automatiquement** dans le cache (ou `local.modelCacheDir` si défini), puis le charge. Les téléchargements reprennent en cas de nouvelle tentative.
- Exigence de build natif : exécutez `pnpm approve-builds`, choisissez `node-llama-cpp`, puis `pnpm rebuild node-llama-cpp`.
- Solution de repli : si la configuration locale échoue et que `memorySearch.fallback = "openai"`, nous basculons automatiquement vers les incorporations distantes (`openai/text-embedding-3-small` sauf si elles sont remplacées) et enregistrons la raison.

## Exemple de point de terminaison personnalisé compatible avec OpenAI

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
- `remote.headers` fusionnent avec les en-têtes OpenAI ; en cas de conflit de clé, la valeur distante l'emporte. Omettez `remote.headers` pour utiliser les valeurs par défaut OpenAI.
