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

Si vous disposez d'une clé API pour OpenAI, Gemini, Voyage, Mistral ou DeepInfra, le moteur intégré la détecte automatiquement et active la recherche vectorielle. Aucune configuration requise.

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

Pour forcer le provider d'embeddings local intégré, installez le package d'exécution
optionnel `node-llama-cpp` à côté de OpenClaw, puis pointez `local.modelPath`
vers un fichier GGUF :

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

| Provider  | ID          | Détecté auto. | Notes                                         |
| --------- | ----------- | ------------- | --------------------------------------------- |
| OpenAI    | `openai`    | Oui           | Par défaut : `text-embedding-3-small`         |
| Gemini    | `gemini`    | Oui           | Prend en charge le multimodal (image + audio) |
| Voyage    | `voyage`    | Oui           |                                               |
| Mistral   | `mistral`   | Oui           |                                               |
| DeepInfra | `deepinfra` | Oui           | Par défaut : `BAAI/bge-m3`                    |
| Ollama    | `ollama`    | Non           | Local, défini explicitement                   |
| Local     | `local`     | Oui (premier) | Runtime `node-llama-cpp` facultatif           |

La détection automatique choisit le premier fournisseur dont la clé API peut être résolue, dans l'ordre indiqué. Définissez `memorySearch.provider` pour remplacer.

## Fonctionnement de l'indexation

OpenClaw indexe `MEMORY.md` et `memory/*.md` en blocs (~400 jetons avec un chevauchement de 80 jetons) et les stocke dans une base de données SQLite par agent.

- **Emplacement de l'index :** `~/.openclaw/memory/<agentId>.sqlite`
- **Maintenance du stockage :** les fichiers satellites WAL SQLite sont limités par des points de contrôle périodiques et à l'arrêt.
- **Surveillance des fichiers :** les modifications des fichiers de mémoire déclenchent une réindexation différée (1,5 s).
- **Réindexation automatique :** lorsque le fournisseur d'embeddings, le modèle ou la configuration du découpage change, l'index entier est reconstruit automatiquement.
- **Réindexation à la demande :** `openclaw memory index --force`

<Info>Vous pouvez également indexer des fichiers Markdown en dehors de l'espace de travail avec `memorySearch.extraPaths`. Voir la [référence de configuration](/fr/reference/memory-config#additional-memory-paths).</Info>

## Quand l'utiliser

Le moteur intégré est le bon choix pour la plupart des utilisateurs :

- Fonctionne immédiatement sans dépendances supplémentaires.
- Gère bien la recherche par mots-clés et la recherche vectorielle.
- Prend en charge tous les fournisseurs d'embeddings.
- La recherche hybride combine le meilleur des deux approches de récupération.

Envisagez de passer à [QMD](/fr/concepts/memory-qmd) si vous avez besoin de re-ranking, d'expansion de requêtes ou si vous souhaitez indexer des répertoires en dehors de l'espace de travail.

Envisagez [Honcho](/fr/concepts/memory-honcho) si vous souhaitez une mémoire inter-sessions avec modélisation automatique de l'utilisateur.

## Dépannage

**Recherche de mémoire désactivée ?** Vérifiez `openclaw memory status`. Si aucun fournisseur n'est détecté, définissez-en un explicitement ou ajoutez une clé API.

**Fournisseur local non détecté ?** Vérifiez que le chemin local existe et exécutez :

```bash
openclaw memory status --deep --agent main
openclaw memory index --force --agent main
```

Les commandes CLI autonomes et la Gateway utilisent le même `local` id de fournisseur.
Si le fournisseur est réglé sur `auto`, les intégrations locales sont considérées en premier uniquement
quand `memorySearch.local.modelPath` pointe vers un fichier local existant.

**Résultats obsolètes ?** Exécutez `openclaw memory index --force` pour reconstruire. L'observateur
peut manquer des changements dans de rares cas limites.

**sqlite-vec ne se charge pas ?** OpenClaw revient automatiquement à la similarité cosinus en processus.
`openclaw memory status --deep` signale le magasin de vecteurs local
séparément du fournisseur d'intégration, donc `Vector store: unavailable` pointe
vers le chargement de sqlite-vec tandis que `Embeddings: unavailable` pointe vers la disponibilité du fournisseur/de l'auth
ou du modèle. Vérifiez les journaux pour l'erreur de chargement spécifique.

## Configuration

Pour la configuration du fournisseur d'intégration, le réglage de la recherche hybride (poids, MMR, décroissance
temporelle), l'indexation par lots, la mémoire multimodale, sqlite-vec, les chemins supplémentaires et toutes
les autres options de configuration, consultez la
[référence de configuration de la mémoire](/fr/reference/memory-config).

## Connexes

- [Aperçu de la mémoire](/fr/concepts/memory)
- [Recherche dans la mémoire](/fr/concepts/memory-search)
- [Mémoire active](/fr/concepts/active-memory)
