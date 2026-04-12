---
title: "Recherche de mémoire"
summary: "Comment la recherche de mémoire trouve des notes pertinentes en utilisant des embeddings et une récupération hybride"
read_when:
  - You want to understand how memory_search works
  - You want to choose an embedding provider
  - You want to tune search quality
---

# Recherche de mémoire

`memory_search` trouve des notes pertinentes dans vos fichiers de mémoire, même lorsque
la formulation diffère du texte original. Il fonctionne en indexant la mémoire en petits
morceaux et en les recherchant à l'aide d'embeddings, de mots-clés ou des deux.

## Quick start

Si vous avez une clé OpenAI, Gemini, Voyage ou Mistral API configurée, la recherche de
mémoire fonctionne automatiquement. Pour définir un provider explicitement :

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai", // or "gemini", "local", "ollama", etc.
      },
    },
  },
}
```

Pour les embeddings locaux sans clé API, utilisez `provider: "local"` (nécessite
node-llama-cpp).

## Providers pris en charge

| Provider | ID        | Nécessite une clé API | Notes                                                                                     |
| -------- | --------- | --------------------- | ----------------------------------------------------------------------------------------- |
| OpenAI   | `openai`  | Oui                   | Détecté automatiquement, rapide                                                           |
| Gemini   | `gemini`  | Oui                   | Prend en charge l'indexation d'images/audio                                               |
| Voyage   | `voyage`  | Oui                   | Détecté automatiquement                                                                   |
| Mistral  | `mistral` | Oui                   | Détecté automatiquement                                                                   |
| Bedrock  | `bedrock` | Non                   | Détecté automatiquement lorsque la chaîne d'informations d'identification AWS est résolue |
| Ollama   | `ollama`  | Non                   | Local, doit être défini explicitement                                                     |
| Local    | `local`   | Non                   | Modèle GGUF, téléchargement d'environ 0,6 Go                                              |

## Fonctionnement de la recherche

OpenClaw exécute deux chemins de récupération en parallèle et fusionne les résultats :

```mermaid
flowchart LR
    Q["Query"] --> E["Embedding"]
    Q --> T["Tokenize"]
    E --> VS["Vector Search"]
    T --> BM["BM25 Search"]
    VS --> M["Weighted Merge"]
    BM --> M
    M --> R["Top Results"]
```

- **La recherche vectorielle** trouve des notes ayant une signification similaire ("gateway host" correspond à
  "la machine exécutant OpenClaw").
- **La recherche par mots-clés BM25** trouve des correspondances exactes (ID, chaînes d'erreur, clés
  de configuration).

Si un seul chemin est disponible (pas d'embeddings ou pas de FTS), l'autre s'exécute seul.

## Amélioration de la qualité de la recherche

Deux fonctionnalités optionnelles aident lorsque vous avez un historique de notes important :

### Décroissance temporelle

Les anciennes notes perdent progressivement du poids dans le classement pour que les informations récentes apparaissent en premier.
Avec la demi-vie par défaut de 30 jours, une note du mois dernier est notée à 50 % de
son poids original. Les fichiers pérennes comme `MEMORY.md` ne sont jamais soumis à la décroissance.

<Tip>Activez la décroissance temporelle si votre agent a des mois de notes quotidiennes et que des informations obsolètes continuent de surclasser le contexte récent.</Tip>

### MMR (diversité)

Réduit les résultats redondants. Si cinq notes mentionnent toutes la même configuration de routeur, le MMR
assure que les principaux résultats couvrent différents sujets au lieu de se répéter.

<Tip>Activez le MMR si `memory_search` continue à renvoyer des extraits presque en double à partir de différentes notes quotidiennes.</Tip>

### Activer les deux

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        query: {
          hybrid: {
            mmr: { enabled: true },
            temporalDecay: { enabled: true },
          },
        },
      },
    },
  },
}
```

## Mémoire multimodale

Avec Gemini Embedding 2, vous pouvez indexer des images et des fichiers audio en même temps
que du Markdown. Les requêtes de recherche restent textuelles, mais elles correspondent au contenu visuel et audio.
Voir la [référence de configuration de la mémoire](/en/reference/memory-config) pour
la configuration.

## Recherche dans la mémoire de session

Vous pouvez éventuellement indexer les transcriptions de session pour que `memory_search` puisse se rappeler
les conversations précédentes. C'est une option accessible via
`memorySearch.experimental.sessionMemory`. Voir la
[référence de configuration](/en/reference/memory-config) pour les détails.

## Dépannage

**Pas de résultats ?** Exécutez `openclaw memory status` pour vérifier l'index. S'il est vide, exécutez
`openclaw memory index --force`.

**Seulement des correspondances par mots-clés ?** Votre fournisseur d'embeddings n'est peut-être pas configuré. Vérifiez
`openclaw memory status --deep`.

**Texte CJK introuvable ?** Reconstruisez l'index FTS avec
`openclaw memory index --force`.

## Pour aller plus loin

- [Active Memory](/en/concepts/active-memory) -- mémoire de sous-agent pour les sessions de chat interactives
- [Memory](/en/concepts/memory) -- disposition des fichiers, backends, outils
- [Référence de configuration de la mémoire](/en/reference/memory-config) -- tous les paramètres de configuration
