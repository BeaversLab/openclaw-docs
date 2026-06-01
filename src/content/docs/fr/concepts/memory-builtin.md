---
summary: "Le moteur de mémoire par défaut basé sur SQLite avec recherche par mots-clés, vectorielle et hybride"
title: "Moteur de mémoire intégré"
read_when:
  - You want to understand the default memory backend
  - You want to configure embedding providers or hybrid search
---

Le moteur intégré est le backend de mémoire par défaut. Il stocke votre index de mémoire dans
une base de données SQLite par agent et ne nécessite aucune dépendance supplémentaire pour démarrer.

## Ce qu'il fournit

- **Recherche par mots-clés** via l'indexation de texte intégral FTS5 (score BM25).
- **Recherche vectorielle** via des embeddings de n'importe quel provider pris en charge.
- **Recherche hybride** qui combine les deux pour de meilleurs résultats.
- **Prise en charge CJK** via la tokenisation par trigrammes pour le chinois, le japonais et le coréen.
- **Accélération sqlite-vec** pour les requêtes vectorielles dans la base de données (optionnel).

## Getting started

Par défaut, le moteur intégré utilise les embeddings OpenAI. Si vous avez déjà configuré `OPENAI_API_KEY` ou `models.providers.openai.apiKey`, la recherche vectorielle fonctionne sans configuration de mémoire supplémentaire.

Pour définir un provider explicitement :

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
      },
    },
  },
}
```

Sans provider d'embeddings, seule la recherche par mots-clés est disponible.

Pour forcer le fournisseur d'embeddings local intégré, installez le package d'exécution optionnel `node-llama-cpp` à côté de OpenClaw, puis pointez `local.modelPath` vers un fichier GGUF :

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "local",
        fallback: "none",
        local: {
          modelPath: "~/.node-llama-cpp/models/embeddinggemma-300m-qat-Q8_0.gguf",
        },
      },
    },
  },
}
```

## Providers d'embeddings pris en charge

| Provider          | ID                  | Notes                                                 |
| ----------------- | ------------------- | ----------------------------------------------------- |
| Bedrock           | `bedrock`           | Utilise la chaîne d'informations d'identification AWS |
| DeepInfra         | `deepinfra`         | Par défaut : `BAAI/bge-m3`                            |
| Gemini            | `gemini`            | Prend en charge le multimodal (image + audio)         |
| GitHub Copilot    | `github-copilot`    | Utilise l'abonnement Copilot                          |
| Local             | `local`             | Runtime `node-llama-cpp` optionnel                    |
| Mistral           | `mistral`           |                                                       |
| Ollama            | `ollama`            | Local/auto-hébergé                                    |
| OpenAI            | `openai`            | Par défaut : `text-embedding-3-small`                 |
| Compatible OpenAI | `openai-compatible` | Point de terminaison `/v1/embeddings` générique       |
| Voyage            | `voyage`            |                                                       |

Définissez `memorySearch.provider` pour changer de fournisseur par rapport à OpenAI.

## Fonctionnement de l'indexation

OpenClaw indexe `MEMORY.md` et `memory/*.md` en blocs (~400 tokens avec un chevauchement de 80 tokens) et les stocke dans une base de données SQLite par agent.

- **Emplacement de l'index :** `~/.openclaw/memory/<agentId>.sqlite`
- **Maintenance du stockage :** les fichiers sidecar WAL de SQLite sont limités par des points de contrôle périodiques et à l'arrêt.
- **Surveillance des fichiers :** les modifications des fichiers de mémoire déclenchent une réindexation différée (1,5 s).
- **Réindexation automatique :** lorsque le fournisseur d'embeddings, le modèle ou la configuration du découpage change, l'index entier est reconstruit automatiquement.
- **Réindexation à la demande :** `openclaw memory index --force`

<Info>Vous pouvez également indexer des fichiers Markdown en dehors de l'espace de travail avec `memorySearch.extraPaths`. Consultez la [référence de configuration](/fr/reference/memory-config#additional-memory-paths).</Info>

## Quand l'utiliser

Le moteur intégré est le bon choix pour la plupart des utilisateurs :

- Fonctionne immédiatement sans dépendances supplémentaires.
- Gère bien la recherche par mots-clés et la recherche vectorielle.
- Prend en charge tous les fournisseurs d'embeddings.
- La recherche hybride combine le meilleur des deux approches de récupération.

Envisagez de passer à [QMD](/fr/concepts/memory-qmd) si vous avez besoin de reranking, d'expansion de requêtes ou si vous souhaitez indexer des répertoires en dehors de l'espace de travail.

Envisagez [Honcho](/fr/concepts/memory-honcho) si vous souhaitez une mémoire inter-sessions avec modélisation automatique de l'utilisateur.

## Dépannage

**Recherche de mémoire désactivée ?** Vérifiez `openclaw memory status`API. Si aucun fournisseur n'est détecté, définissez-en un explicitement ou ajoutez une clé API.

**Fournisseur local non détecté ?** Vérifiez que le chemin local existe et exécutez :

```bash
openclaw memory status --deep --agent main
openclaw memory index --force --agent main
```

Les commandes CLI autonomes et la Gateway utilisent le même CLIGateway`local` d'identifiant de fournisseur. Définissez `memorySearch.provider: "local"` lorsque vous souhaitez des embeddings locaux.

**Résultats obsolètes ?** Exécutez `openclaw memory index --force` pour reconstruire. L'observateur peut manquer des changements dans de rares cas limites.

**sqlite-vec ne se charge pas ?** OpenClaw revient automatiquement à la similarité cosinus en cours de processus. OpenClaw`openclaw memory status --deep` signale le stockage vectoriel local séparément du fournisseur d'embeddings, donc `Vector store: unavailable` pointe vers le chargement de sqlite-vec tandis que `Embeddings: unavailable` pointe vers le fournisseur/l'authentification ou la disponibilité du modèle. Consultez les journaux pour l'erreur de chargement spécifique.

## Configuration

Pour la configuration des fournisseurs d'embeddings, le réglage de la recherche hybride (poids, MMR, décroissance temporelle), l'indexation par lots, la mémoire multimodale, sqlite-vec, les chemins supplémentaires et tous les autres paramètres de configuration, voir la
[référence de configuration de la mémoire](/fr/reference/memory-config).

## Connexes

- [Aperçu de la mémoire](/fr/concepts/memory)
- [Recherche de mémoire](/fr/concepts/memory-search)
- [Mémoire active](/fr/concepts/active-memory)
