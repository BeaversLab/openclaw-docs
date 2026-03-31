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

Cette page couvre l'ensemble de la configuration de la recherche mémoire pour OpenClaw. Pour
la vue d'ensemble conceptuelle (structure des fichiers, outils mémoire, quand écrire de la mémoire, et
le vidage automatique), voir [Mémoire](/en/concepts/memory).

## Valeurs par défaut de la recherche de mémoire

- Activé par défaut.
- Surveille les modifications des fichiers de mémoire (avec débounce).
- Configurez la recherche de mémoire sous `agents.defaults.memorySearch` (et non au niveau supérieur
  `memorySearch`).
- `memorySearch.provider` et `memorySearch.fallback` acceptent les **identifiants d'adaptateur**
  enregistrés par le plugin de mémoire actif.
- Le plugin `memory-core` par défaut enregistre ces identifiants d'adaptateurs intégrés :
  `local`, `openai`, `gemini`, `voyage`, `mistral` et `ollama`.
- Avec le plugin `memory-core` par défaut, si `memorySearch.provider` n'est pas défini, OpenClaw sélectionne automatiquement :
  1. `local` si un `memorySearch.local.modelPath` est configuré et que le fichier existe.
  2. `openai` si une clé OpenAI peut être résolue.
  3. `gemini` si une clé Gemini peut être résolue.
  4. `voyage` si une clé Voyage peut être résolue.
  5. `mistral` si une clé Mistral peut être résolue.
  6. Sinon, la recherche de mémoire reste désactivée jusqu'à ce qu'elle soit configurée.
- Le mode local utilise node-llama-cpp et peut nécessiter `pnpm approve-builds`.
- Utilise sqlite-vec (si disponible) pour accélérer la recherche vectorielle dans SQLite.
- Avec le plugin par défaut `memory-core`, `memorySearch.provider = "ollama"` est également pris en charge pour les intégrations Ollama locales/auto-hébergées (`/api/embeddings`), mais il n'est pas sélectionné automatiquement.

Les intégrations distantes **nécessitent** une clé API pour le provider d'intégration. OpenClaw résout les clés à partir des profils d'authentification, `models.providers.*.apiKey` ou des variables d'environnement. OAuth Codex ne couvre que la chat/complétions et ne satisfait **pas** les intégrations pour la recherche de mémoire. Pour Gemini, utilisez `GEMINI_API_KEY` ou `models.providers.google.apiKey`. Pour Voyage, utilisez `VOYAGE_API_KEY` ou `models.providers.voyage.apiKey`. Pour Mistral, utilisez `MISTRAL_API_KEY` ou `models.providers.mistral.apiKey`. Ollama ne nécessite généralement pas de vraie clé API (un espace réservé comme `OLLAMA_API_KEY=ollama-local` suffit lorsque cela est requis par la stratégie locale).
Lors de l'utilisation d'un point de terminaison personnalisé compatible OpenAI, définissez `memorySearch.remote.apiKey` (et `memorySearch.remote.headers` en option).

## Backend QMD (expérimental)

Définissez `memory.backend = "qmd"` pour remplacer l'indexeur SQLite intégré par [QMD](https://github.com/tobi/qmd) : un sidecar de recherche local-first qui combine BM25 + vecteurs + reranking. Markdown reste la source de vérité ; OpenClaw délègue à QMD pour la récupération. Points clés :

### Prérequis

- Désactivé par défaut. Optez par configuration (`memory.backend = "qmd"`).
- Installez le CLI QMD séparément (`bun install -g https://github.com/tobi/qmd` ou téléchargez une version) et assurez-vous que le binaire `qmd` se trouve sur le `PATH` de la passerelle.
- QMD a besoin d'une version SQLite qui permet les extensions (`brew install sqlite` sur macOS).
- QMD s'exécute entièrement localement via Bun + `node-llama-cpp` et télécharge automatiquement les modèles GGUF depuis HuggingFace lors de la première utilisation (aucun démon Ollama séparé requis).
- La passerelle exécute QMD dans un home XGD autonome sous `~/.openclaw/agents/<agentId>/qmd/` en définissant `XDG_CONFIG_HOME` et `XDG_CACHE_HOME`.
- Prise en charge du système d'exploitation : macOS et Linux fonctionnent immédiatement une fois Bun + SQLite installés. Windows est mieux pris en charge via WSL2.

### Fonctionnement du sidecar

- La passerelle écrit un home QMD autonome sous `~/.openclaw/agents/<agentId>/qmd/` (config + cache + base de données sqlite).
- Les collections sont créées via `qmd collection add` à partir de `memory.qmd.paths`
  (plus les fichiers de mémoire de l'espace de travail par défaut), puis `qmd update` + `qmd embed` s'exécutent
  au démarrage et à un intervalle configurable (`memory.qmd.update.interval`,
  5 m par défaut).
- La passerelle initialise désormais le gestionnaire QMD au démarrage, les minuteries de mise à jour périodique sont donc armées avant le premier appel `memory_search`.
- Le rafraîchissement au démarrage s'exécute désormais en arrière-plan par défaut, afin que le démarrage de la discussion ne soit pas bloqué ; définissez `memory.qmd.update.waitForBootSync = true` pour conserver le comportement de blocage précédent.
- Les recherches sont exécutées via `memory.qmd.searchMode` (par défaut `qmd search --json` ; prend également en charge `vsearch` et `query`). Si le mode sélectionné rejette les indicateurs de votre build QMD, OpenClaw réessaie avec `qmd query`. Si QMD échoue ou si le binaire est manquant, OpenClaw revient automatiquement au gestionnaire SQLite intégré afin que les outils de mémoire continuent de fonctionner.
- OpenClaw n'expose pas aujourd'hui le réglage de la taille du lot d'intégration QMD ; le comportement du lot est contrôlé par QMD lui-même.
- **Première recherche potentiellement lente** : QMD peut télécharger des modèles GGUF locaux (reranker/expansion de requête) lors de la première exécution de `qmd query`.
  - OpenClaw définit `XDG_CONFIG_HOME`/`XDG_CACHE_HOME` automatiquement lorsqu'il exécute QMD.
  - Si vous souhaitez pré-télécharger manuellement les modèles (et préchauffer le même index que OpenClaw utilise), exécutez une requête unique avec les répertoires XDG de l'agent.

    L'état QMD de OpenClaw réside dans votre **state dir** (par défaut `~/.openclaw`).
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
- `searchMode` (par défaut `search`) : choisissez la commande QMD qui prend en charge
  `memory_search` (`search`, `vsearch`, `query`).
- `includeDefaultMemory` (par défaut `true`) : indexation automatique `MEMORY.md` + `memory/**/*.md`.
- `paths[]` : ajouter des répertoires/fichiers supplémentaires (`path`, `pattern` facultatif, stable `name` facultatif).
- `sessions` : activer l’indexation JSONL de session (`enabled`, `retentionDays`,
  `exportDir`).
- `update` : contrôle la cadence de rafraîchissement et l'exécution de la maintenance :
  (`interval`, `debounceMs`, `onBoot`, `waitForBootSync`, `embedInterval`,
  `commandTimeoutMs`, `updateTimeoutMs`, `embedTimeoutMs`).
- `limits` : limiter la charge utile de rappel (`maxResults`, `maxSnippetChars`,
  `maxInjectedChars`, `timeoutMs`).
- `scope` : même schéma que [`session.sendPolicy`](/en/gateway/configuration-reference#session).
  La valeur par défaut est « DM-only » (`deny` all, `allow` direct chats) ; desserrez-la pour afficher les résultats QMD
  dans les groupes/canaux.
  - `match.keyPrefix` correspond à la clé de **session** normalisée (en minuscules, avec tout `agent:<id>:` de tête supprimé). Exemple : `discord:channel:`.
  - `match.rawKeyPrefix` correspond à la clé de **session** brute (en minuscules), y compris
    `agent:<id>:`. Exemple : `agent:main:discord:`.
  - Legacy : `match.keyPrefix: "agent:..."` est toujours traité comme un préfixe de clé brute, mais privilégiez `rawKeyPrefix` pour plus de clarté.
- Lorsque `scope` refuse une recherche, OpenClaw enregistre un avertissement avec le `channel`/`chatType` dérivé afin que les résultats vides soient plus faciles à déboguer.
- Les extraits provenant de l'extérieur de l'espace de travail s'affichent sous la forme
  `qmd/<collection>/<relative-path>` dans les résultats `memory_search` ; `memory_get`
  comprend ce préfixe et lit à partir de la racine de collection QMD configurée.
- Quand `memory.qmd.sessions.enabled = true`, OpenClaw exporte les transcriptions de session nettoyées (tours Utilisateur/Assistant) vers une collection QMD dédiée sous `~/.openclaw/agents/<id>/qmd/sessions/`, afin que `memory_search` puisse se rappeler les conversations récentes sans toucher à l'index SQLite intégré.
- Les `memory_search` extraits incluent désormais un `Source: <path#line>` pied de page lorsque
  `memory.citations` est `auto`/`on` ; définissez `memory.citations = "off"` pour conserver
  les métadonnées de chemin en interne (l'agent reçoit toujours le chemin pour
  `memory_get`, mais le texte de l'extrait omet le pied de page et l'invite système
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

### Citations et repli

- `memory.citations` s'applique quel que soit le backend (`auto`/`on`/`off`).
- Lorsque `qmd` s'exécute, nous marquons `status().backend = "qmd"` afin que les diagnostics indiquent quel
  moteur a fourni les résultats. Si le sous-processus QMD se ferme ou si la sortie JSON ne peut pas être
  analysée, le gestionnaire de recherche enregistre un avertissement et renvoie le provider intégré
  (embeddings Markdown existants) jusqu'à ce que QMD se rétablisse.

## Chemins de mémoire supplémentaires

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
- Les répertoires sont analysés de manière récursive pour les fichiers `.md`.
- Par défaut, seuls les fichiers Markdown sont indexés.
- Si `memorySearch.multimodal.enabled = true`, OpenClaw indexe également les fichiers image/audio pris en charge uniquement sous `extraPaths`. Les racines de mémoire par défaut (`MEMORY.md`, `memory.md`, `memory/**/*.md`) restent en Markdown uniquement.
- Les liens symboliques sont ignorés (fichiers ou répertoires).

## Fichiers de mémoire multimodaux (image + audio Gemini)

OpenClaw peut indexer les fichiers image et audio de `memorySearch.extraPaths` lors de l'utilisation de l'incorporation Gemini 2 :

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
- L'indexation multimodale s'applique uniquement aux fichiers découverts via `memorySearch.extraPaths`.
- Modalités prises en charge dans cette phase : image et audio.
- `memorySearch.fallback` doit rester `"none"` tant que la mémoire multimodale est activée.
- Les octets correspondants du fichier image/audio sont téléchargés vers le point de terminaison d'incorporation Gemini configuré lors de l'indexation.
- Extensions d'image prises en charge : `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.heic`, `.heif`.
- Extensions audio prises en charge : `.mp3`, `.wav`, `.ogg`, `.opus`, `.m4a`, `.aac`, `.flac`.
- Les requêtes de recherche restent du texte, mais Gemini peut comparer ces requêtes textuelles aux embeddings d'image/audio indexés.
- `memory_get` lit toujours uniquement le Markdown ; les fichiers binaires sont recherchables mais ne sont pas renvoyés en tant que contenu de fichier brut.

## Intégrations Gemini (natives)

Définissez le provider sur `gemini` pour utiliser l'API des embeddings Gemini directement :

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

- `remote.baseUrl` est facultatif (valeur par défaut : URL de base de l'API API).
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

## Point de terminaison personnalisé compatible OpenAI

Si vous souhaitez utiliser un point de terminaison personnalisé compatible OpenAI (OpenRouter, vLLM ou un proxy), vous pouvez utiliser la configuration `remote` avec le OpenAI provider :

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

Si vous ne souhaitez pas définir de clé API, utilisez `memorySearch.provider = "local"` ou définissez `memorySearch.fallback = "none"`.

### Replis

- `memorySearch.fallback` peut être n'importe quel id d'adaptateur d'intégration de mémoire enregistré, ou `none`.
- Avec le plugin `memory-core` par défaut, les identifiants de repli intégrés valides sont `openai`, `gemini`, `voyage`, `mistral`, `ollama` et `local`.
- Le fournisseur de secours n'est utilisé que lorsque le fournisseur d'intégration principal échoue.

### Indexation par lots

- Désactivé par défaut. Définissez `agents.defaults.memorySearch.remote.batch.enabled = true` pour activer l'indexation par lots pour les fournisseurs dont l'adaptateur expose la prise en charge des lots.
- Le comportement par défaut attend la fin du traitement par lots ; ajustez `remote.batch.wait`, `remote.batch.pollIntervalMs` et `remote.batch.timeoutMinutes` si nécessaire.
- Définissez `remote.batch.concurrency` pour contrôler le nombre de travaux par lots que nous soumettons en parallèle (par défaut : 2).
- Avec le plugin par défaut `memory-core`, l'indexation par lots est disponible pour `openai`, `gemini` et `voyage`.
- Les tâches batch Gemini utilisent le point de terminaison batch d'intégrations asynchrones et nécessitent la disponibilité de l'API Batch Gemini.

Pourquoi le traitement par lot d'OpenAI est rapide et économique :

- Pour les rétrochargements importants, OpenAI est généralement l'option la plus rapide que nous prenons en charge, car nous pouvons soumettre de nombreuses requêtes d'intégration dans une seule tâche par lots et laisser OpenAI les traiter de manière asynchrone.
- OpenAI propose des tarifs réduits pour les charges de travail de l'API de traitement par lot, les grandes opérations d'indexation étant donc généralement moins chères que l'envoi des mêmes requêtes de manière synchrone.
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

## Fonctionnement des outils de mémoire

- `memory_search` effectue une recherche sémantique sur des blocs Markdown (~400 jetons cible, chevauchement de 80 jetons) à partir de `MEMORY.md` + `memory/**/*.md`. Il renvoie le texte de l'extrait (plafonné à ~700 caractères), le chemin du fichier, la plage de lignes, le score, le provider/model, et indique si nous sommes revenus des embeddings locaux aux embeddings distants. Aucune charge utile de fichier complet n'est renvoyée.
- `memory_get` lit un fichier Markdown de mémoire spécifique (relatif à l'espace de travail), en option à partir d'une ligne de départ et pour N lignes. Les chemins en dehors de `MEMORY.md` / `memory/` sont rejetés.
- Les deux outils sont activés uniquement lorsque `memorySearch.enabled` renvoie vrai pour l'agent.

## Ce qui est indexé (et quand)

- Type de fichier : Markdown uniquement (`MEMORY.md`, `memory/**/*.md`).
- Stockage de l'index : SQLite par agent à `~/.openclaw/memory/<agentId>.sqlite` (configurable via `agents.defaults.memorySearch.store.path`, prend en charge le jeton `{agentId}`).
- Fraîcheur : un observateur sur `MEMORY.md` + `memory/` marque l'index comme sale (débounce 1,5 s). La synchronisation est planifiée au démarrage de la session, lors d'une recherche ou à intervalle régulier et s'exécute de manière asynchrone. Les transcriptions de session utilisent des seuils delta pour déclencher la synchronisation en arrière-plan.
- Déclencheurs de réindexation : l'index stocke le **provider/model d'intégration + l'empreinte du point de terminaison + les paramètres de découpage**. Si l'un de ces éléments change, OpenClaw réinitialise et réindexe automatiquement l'ensemble du magasin.

## Recherche hybride (BM25 + vecteur)

Lorsqu'elle est activée, OpenClaw combine :

- **Similitude vectorielle** (correspondance sémantique, le libellé peut différer)
- **Pertinence des mots-clés BM25** (jetons exacts comme les ID, env vars, symboles de code)

Si la recherche en texte intégral n'est pas disponible sur votre plateforme, OpenClaw revient à une recherche par vecteurs uniquement.

### Pourquoi hybride

La recherche vectorielle est excellente pour « cela signifie la même chose » :

- "Mac Studio gateway host" vs "the machine running the gateway"
- "debounce file updates" vs "avoid indexing on every write"

Mais elle peut être faible sur les jetons exacts et à fort signal :

- ID (`a828e60`, `b3b9895a...`)
- symboles de code (`memorySearch.query.hybrid`)
- chaînes d'erreur ("sqlite-vec unavailable")

BM25 (texte intégral) est l'inverse : fort pour les jetons exacts, plus faible pour les paraphrases.
La recherche hybride est le compromis pragmatique : **utilisez les deux signaux de récupération** afin d'obtenir
de bons résultats pour les requêtes en « langage naturel » comme pour les recherches de type « aiguille dans une botte de foin ».

### Comment nous fusionnons les résultats (la conception actuelle)

Esquisse de l'implémentation :

1. Récupérer un pool de candidats des deux côtés :

- **Vector** : les `maxResults * candidateMultiplier` premiers par similarité cosinus.
- **BM25** : les `maxResults * candidateMultiplier` meilleurs selon le classement BM25 de FTS5 (plus bas est meilleur).

2. Convertir le rang BM25 en un score compris entre 0 et 1 environ :

- `textScore = 1 / (1 + max(0, bm25Rank))`

3. Réunir les candidats par ID de bloc et calculer un score pondéré :

- `finalScore = vectorWeight * vectorScore + textWeight * textScore`

Remarques :

- `vectorWeight` + `textWeight` est normalisé à 1.0 lors de la résolution de la configuration, de sorte que les pondérations se comportent comme des pourcentages.
- Si les embeddings ne sont pas disponibles (ou si le provider renvoie un vecteur nul), nous exécutons toujours BM25 et renvoyons les correspondances par mot-clé.
- Si FTS5 ne peut pas être créé, nous conservons la recherche par vecteurs uniquement (pas d'échec brutal).

Ce n'est pas « parfait selon la théorie de la RI », mais c'est simple, rapide et a tendance à améliorer la rappel/précision sur de vraies notes.
Si nous voulons être plus pointus plus tard, les étapes suivantes courantes sont la Fusion de Rang Réciproque (RRF) ou la normalisation des scores
(min/max ou z-score) avant le mélange.

### Pipeline de post-traitement

Après avoir fusionné les scores vectoriels et les scores de mots-clés, deux étapes de post-traitement optionnelles affinent la liste de résultats avant qu'elle n'atteigne l'agent :

```
Vector + Keyword -> Weighted Merge -> Temporal Decay -> Sort -> MMR -> Top-K Results
```

Les deux étapes sont **désactivées par défaut** et peuvent être activées indépendamment.

### Re-classement MMR (diversité)

When hybrid search returns results, multiple chunks may contain similar or overlapping content.
For example, searching for "home network setup" might return five nearly identical snippets
from different daily notes that all mention the same router configuration.

**MMR (Maximal Marginal Relevance)** réorganise les résultats pour équilibrer la pertinence et la diversité,
s'assurant que les résultats principaux couvrent différents aspects de la requête au lieu de répéter les mêmes informations.

Fonctionnement :

1. Les résultats sont notés selon leur pertinence d'origine (score pondéré vecteur + BM25).
2. MMR sélectionne de manière itérative les résultats qui maximisent : `lambda x relevance - (1-lambda) x max_similarity_to_selected`.
3. La similarité entre les résultats est mesurée à l'aide de la similarité de texte de Jaccard sur le contenu tokenisé.

Le paramètre `lambda` contrôle le compromis :

- `lambda = 1.0` -- pertinence pure (aucune pénalité de diversité)
- `lambda = 0.0` -- diversité maximale (ignore la pertinence)
- Par défaut : `0.7` (équilibré, léger biais de pertinence)

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

Avec MMR (lambda=0,7) -- 3 premiers résultats :

```
1. memory/2026-02-10.md  (score: 0.92)  <- router + VLAN
2. memory/network.md     (score: 0.85)  <- reference doc (diverse!)
3. memory/2026-02-05.md  (score: 0.78)  <- AdGuard DNS (diverse!)
```

Le quasi-doublon du 8 février disparaît et l'agent obtient trois informations distinctes.

**Quand activer :** Si vous remarquez que `memory_search` renvoie des extraits redondants ou presque identiques,
notamment avec des notes quotidiennes qui répètent souvent des informations similaires d'un jour à l'autre.

### Décroissance temporelle (boost de récence)

Les agents avec des notes quotidiennes accumulent des centaines de fichiers datés au fil du temps. Sans décroissance, une note bien rédigée d'il y a six mois peut surpasser la mise à jour d'hier sur le même sujet.

**La décroissance temporelle** applique un multiplicateur exponentiel aux scores en fonction de l'âge de chaque résultat, de sorte que les souvenirs récents sont classés plus haut naturellement tandis que les anciens s'estompent :

```
decayedScore = score x e^(-lambda x ageInDays)
```

où `lambda = ln(2) / halfLifeDays`.

Avec la demi-vie par défaut de 30 jours :

- Notes d'aujourd'hui : **100 %** du score d'origine
- Il y a 7 jours : **~84 %**
- il y a 30 jours : **50 %**
- Il y a 90 jours : **12,5 %**
- Il y a 180 jours : **~1,6 %**

**Les fichiers pérennes ne sont jamais dépréciés :**

- `MEMORY.md` (fichier de mémoire racine)
- Fichiers non datés dans `memory/` (par exemple, `memory/projects.md`, `memory/network.md`)
- Ces informations contiennent des données de référence durables qui doivent toujours être classées normalement.

**Les fichiers quotidiens datés** (`memory/YYYY-MM-DD.md`) utilisent la date extraite du nom de fichier.
D'autres sources (par exemple, les transcriptions de session) reviennent à l'heure de modification du fichier (`mtime`).

**Exemple -- requête : « quel est l'horaire de travail de Rod ? »**

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

La note périmée de septembre passe en bas malgré la meilleure correspondance sémantique brute.

**Quand activer :** Si votre agent a des mois de notes quotidiennes et que vous constatez que d'anciennes informations obsolètes prévalent sur le contexte récent. Une demi-vie de 30 jours fonctionne bien pour les flux de travail fortement basés sur des notes quotidiennes ; augmentez-la (par exemple, 90 jours) si vous consultez fréquemment des notes plus anciennes.

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
- **Les deux** -- recommandé pour les agents avec des historiques de notes quotidiens volumineux et de longue durée.

## Cache d'embeddings

OpenClaw peut mettre en cache les **embeddings de chunks** dans SQLite afin que la réindexation et les mises à jour fréquentes (notamment les transcripts de session) ne réintègrent pas le texte inchangé.

Config :

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

## Recherche de mémoire de session (expérimental)

Vous pouvez facultativement indexer les **transcriptions de session** et les afficher via `memory_search`.
Cela est conditionné par un indicateur expérimental.

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

Remarques :

- L'indexation de session est **optionnelle** (désactivée par défaut).
- Les mises à jour de session sont soumises à un débounce et **indexées de manière asynchrone** une fois qu'elles franchissent les seuils de variation (au mieux).
- `memory_search` ne bloque jamais l'indexation ; les résultats peuvent être légèrement obsolètes jusqu'à ce que la synchronisation en arrière-plan soit terminée.
- Les résultats incluent toujours uniquement des extraits ; `memory_get` reste limité aux fichiers mémoire.
- L'indexation de session est isolée par agent (seuls les journaux de session de cet agent sont indexés).
- Les journaux de session résident sur le disque (`~/.openclaw/agents/<agentId>/sessions/*.jsonl`). Tout processus/utilisateur ayant accès au système de fichiers peut les lire, traitez donc l'accès au disque comme la limite de confiance. Pour un isolement plus strict, exécutez les agents sous des utilisateurs ou hôtes de système d'exploitation distincts.

Seuils de delta (valeurs par défaut indiquées) :

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

## Accélération de vecteurs SQLite (sqlite-vec)

Lorsque l'extension sqlite-vec est disponible, OpenClaw stocke les embeddings dans une
Table virtuelle SQLite (`vec0`) et effectue des requêtes de distance vectorielle dans la
base de données. Cela permet de garder la recherche rapide sans charger chaque embedding dans JS.

Configuration (optionnelle) :

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

- `enabled` est défini par défaut sur true ; lorsqu'il est désactivé, la recherche revient à une similarité cosinus in-process sur les embeddings stockés.
- Si l'extension sqlite-vec est manquante ou échoue à charger, OpenClaw consigne l'erreur et continue avec la solution de repli JS (pas de table vectorielle).
- `extensionPath` remplace le chemin de sqlite-vec inclus (utile pour les compilations personnalisées ou les emplacements d'installation non standard).

## Téléchargement automatique de l'intégration locale

- Modèle d'intégration local par défaut : `hf:ggml-org/embeddinggemma-300m-qat-q8_0-GGUF/embeddinggemma-300m-qat-Q8_0.gguf` (~0.6 Go).
- Quand `memorySearch.provider = "local"`, `node-llama-cpp` résout `modelPath` ; si le fichier GGUF est manquant, il est **téléchargé automatiquement** dans le cache (ou `local.modelCacheDir` si défini), puis chargé. Les téléchargements reprennent en cas de nouvelle tentative.
- Configuration requise pour la compilation native : exécutez `pnpm approve-builds`, sélectionnez `node-llama-cpp`, puis `pnpm rebuild node-llama-cpp`.
- Secours : si la configuration locale échoue et `memorySearch.fallback = "openai"`, nous basculons automatiquement vers les embeddings distants (`openai/text-embedding-3-small` sauf si autrement spécifié) et enregistrons la raison.

## Exemple de point de terminaison personnalisé compatible OpenAI

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

Notes :

- `remote.*` a la priorité sur `models.providers.openai.*`.
- `remote.headers` fusionner avec les en-têtes OpenAI ; priorité à la valeur distante en cas de conflit de clé. Omettez `remote.headers` pour utiliser les valeurs par défaut de OpenAI.
