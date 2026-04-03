---
title: "Vue d'ensemble de la mémoire"
summary: "Comment OpenClaw se souvient des choses d'une session à l'autre"
read_when:
  - You want to understand how memory works
  - You want to know what memory files to write
---

# Vue d'ensemble de la mémoire

OpenClaw se souvient des choses en écrivant des fichiers **Markdown brut** dans l'espace de travail de votre agent. Le modèle ne "se souvient" que de ce qui est sauvegardé sur le disque -- il n'y a pas d'état caché.

## Fonctionnement

Votre agent possède deux endroits pour stocker des souvenirs :

- **`MEMORY.md`** -- mémoire à long terme. Faits durables, préférences et décisions. Chargé au début de chaque session DM.
- **`memory/YYYY-MM-DD.md`** -- notes quotidiennes. Contexte courant et observations. Les notes d'aujourd'hui et d'hier sont chargées automatiquement.

Ces fichiers résident dans l'espace de travail de l'agent (par défaut `~/.openclaw/workspace`).

<Tip>Si vous voulez que votre agent se souvienne de quelque chose, demandez-le-lui simplement : "Rappelle-toi que je préfère TypeScript." Il l'écrira dans le fichier approprié.</Tip>

## Outils de mémoire

L'agent dispose de deux outils pour travailler avec la mémoire :

- **`memory_search`** -- trouve des notes pertinentes en utilisant la recherche sémantique, même lorsque la formulation diffère de l'originale.
- **`memory_get`** -- lit un fichier mémoire spécifique ou une plage de lignes.

Les deux outils sont fournis par le plugin de mémoire actif (par défaut : `memory-core`).

## Recherche dans la mémoire

Lorsqu'un fournisseur d'embeddings est configuré, `memory_search` utilise la **recherche hybride** -- combinant la similarité vectorielle (sens sémantique) avec la correspondance par mots-clés (termes exacts comme les ID et les symboles de code). Cela fonctionne dès le départ une fois que vous avez une clé API pour n'importe quel fournisseur pris en charge.

<Info>OpenClaw détecte automatiquement votre fournisseur d'embeddings à partir des clés API disponibles. Si vous avez une clé OpenAI, Gemini, Voyage ou Mistral configurée, la recherche mémoire est activée automatiquement.</Info>

Pour plus de détails sur le fonctionnement de la recherche, les options de réglage et la configuration du fournisseur, consultez [Recherche de mémoire](/en/concepts/memory-search).

## Moteurs de mémoire

<CardGroup cols={3}>
  <Card title="Intégré (par défaut)" icon="database" href="/en/concepts/memory-builtin">
    Basé sur SQLite. Fonctionne immédiatement avec la recherche par mots-clés, la similarité vectorielle et la recherche hybride. Aucune dépendance supplémentaire.
  </Card>
  <Card title="QMD" icon="search" href="/en/concepts/memory-qmd">
    Sidecar local-first avec reclassement, expansion de requêtes et la capacité d'indexer les répertoires en dehors de l'espace de travail.
  </Card>
  <Card title="Honcho" icon="brain" href="/en/concepts/memory-honcho">
    Mémoire inter-sessions native IA avec modélisation utilisateur, recherche sémantique et conscience multi-agent. Installation du plugin.
  </Card>
</CardGroup>

## Vidage automatique de la mémoire

Avant que la [compaction](/en/concepts/compaction) ne résume votre conversation, OpenClaw
exécute un tour silencieux qui rappelle à l'agent de sauvegarder le contexte important dans les fichiers
de mémoire. Ceci est activé par défaut -- vous n'avez rien à configurer.

<Tip>Le vidage de la mémoire empêche la perte de contexte lors de la compaction. Si votre agent possède des informations importantes dans la conversation qui ne sont pas encore écrites dans un fichier, elles seront sauvegardées automatiquement avant que le résumé ne se produise.</Tip>

## CLI

```bash
openclaw memory status          # Check index status and provider
openclaw memory search "query"  # Search from the command line
openclaw memory index --force   # Rebuild the index
```

## Pour aller plus loin

- [Moteur de mémoire intégré](/en/concepts/memory-builtin) -- backend SQLite par défaut
- [Moteur de mémoire QMD](/en/concepts/memory-qmd) -- sidecar local-first avancé
- [Mémoire Honcho](/en/concepts/memory-honcho) -- mémoire inter-sessions native IA
- [Recherche mémoire](/en/concepts/memory-search) -- pipeline de recherche, fournisseurs et
  réglage
- [Référence de configuration de la mémoire](/en/reference/memory-config) -- tous les paramètres de configuration
- [Compaction](/en/concepts/compaction) -- interaction de la compaction avec la mémoire
