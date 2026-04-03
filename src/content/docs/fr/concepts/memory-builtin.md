---
title: "Moteur de mémoire intégré"
summary: "Le backend de mémoire par défaut basé sur SQLite avec recherche par mot-clé, vectorielle et hybride"
read_when:
  - You want to understand the default memory backend
  - You want to configure embedding providers or hybrid search
---

# Moteur de mémoire intégré

Le moteur intégré est le backend de mémoire par défaut. Il stocke votre index de mémoire dans
une base de données SQLite par agent et ne nécessite aucune dépendance supplémentaire pour démarrer.

## Ce qu'il fournit

- **Recherche par mot-clé** via l'indexation plein texte FTS5 (score BM25).
- **Recherche vectorielle** via des embeddings de n'importe quel provider pris en charge.
- **Recherche hybride** qui combine les deux pour de meilleurs résultats.
- **Prise en charge CJC** via la tokenisation par trigramme pour le chinois, le japonais et le coréen.
- **Accélération sqlite-vec** pour les requêtes vectorielles dans la base de données (optionnel).

## Getting started

Si vous disposez d'une clé API pour OpenAI, Gemini, Voyage ou Mistral, le moteur
intégré la détecte automatiquement et active la recherche vectorielle. Aucune configuration requise.

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

Sans provider d'embeddings, seule la recherche par mot-clé est disponible.

## Providers d'embeddings pris en charge

| Provider | ID        | Détecté auto. | Notes                                         |
| -------- | --------- | ------------- | --------------------------------------------- |
| OpenAI   | `openai`  | Oui           | Par défaut : `text-embedding-3-small`         |
| Gemini   | `gemini`  | Oui           | Prend en charge le multimodal (image + audio) |
| Voyage   | `voyage`  | Oui           |                                               |
| Mistral  | `mistral` | Oui           |                                               |
| Ollama   | `ollama`  | Non           | Local, défini explicitement                   |
| Local    | `local`   | Oui (premier) | Modèle GGUF, téléchargement de ~0,6 Go        |

La détection automatique choisit le premier provider dont la clé API peut être résolue, dans l'ordre indiqué. Définissez `memorySearch.provider` pour remplacer.

## Fonctionnement de l'indexation

OpenClaw indexe `MEMORY.md` et `memory/*.md` en blocs (~400 jetons avec
chevauchement de 80 jetons) et les stocke dans une base de données SQLite par agent.

- **Emplacement de l'index :** `~/.openclaw/memory/<agentId>.sqlite`
- **Surveillance des fichiers :** les modifications des fichiers de mémoire déclenchent une réindexation amortie (1,5 s).
- **Réindexation automatique :** lorsque le provider d'embeddings, le model ou la configuration du découpage
  change, l'index entier est reconstruit automatiquement.
- **Réindexation à la demande :** `openclaw memory index --force`

<Info>Vous pouvez également indexer des fichiers Markdown hors de l'espace de travail avec `memorySearch.extraPaths`. Consultez la [référence de configuration](/en/reference/memory-config#additional-memory-paths).</Info>

## Quand l'utiliser

Le moteur intégré est le bon choix pour la plupart des utilisateurs :

- Fonctionne immédiatement sans dépendances supplémentaires.
- Gère bien la recherche par mots-clés et la recherche vectorielle.
- Prend en charge tous les providers d'embeddings.
- La recherche hybride combine le meilleur des deux approches de récupération.

Envisagez de passer à [QMD](/en/concepts/memory-qmd) si vous avez besoin de reranking, d'expansion de requête
ou si vous souhaitez indexer des répertoires en dehors de l'espace de travail.

Envisagez [Honcho](/en/concepts/memory-honcho) si vous souhaitez une mémoire inter-session avec
modélisation automatique de l'utilisateur.

## Dépannage

**Recherche de mémoire désactivée ?** Vérifiez `openclaw memory status`. Si aucun provider n'est
détecté, en définissez un explicitement ou ajoutez une clé API.

**Résultats obsolètes ?** Exécutez `openclaw memory index --force` pour reconstruire. L'observateur
peut manquer des modifications dans de rares cas limites.

**sqlite-vec ne se charge pas ?** OpenClaw revient automatiquement à la similarité cosinus
en cours de processus. Vérifiez les journaux pour l'erreur de chargement spécifique.

## Configuration

Pour la configuration du provider d'embeddings, le réglage de la recherche hybride (poids, MMR, décroissance
temporelle), l'indexation par lots, la mémoire multimodale, sqlite-vec, les chemins supplémentaires et toutes
les autres options de configuration, consultez la
[référence de configuration de la mémoire](/en/reference/memory-config).
