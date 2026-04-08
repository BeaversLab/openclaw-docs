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

Votre agent possède trois fichiers liés à la mémoire :

- **`MEMORY.md`** -- mémoire à long terme. Faits durables, préférences et décisions. Chargé au début de chaque session DM.
- **`memory/YYYY-MM-DD.md`** -- notes quotidiennes. Contexte courant et observations. Les notes d'aujourd'hui et d'hier sont chargées automatiquement.
- **`DREAMS.md`** (expérimental, optionnel) -- Journal de rêve et résumés des balayages de rêve
  pour examen humain.

Ces fichiers résident dans l'espace de travail de l'agent (par défaut `~/.openclaw/workspace`).

<Tip>Si vous voulez que votre agent se souvienne de quelque chose, demandez-le-lui simplement : « Souviens-toi que je préfère TypeScript. » Il l'écrira dans le fichier approprié.</Tip>

## Outils de mémoire

L'agent dispose de deux outils pour travailler avec la mémoire :

- **`memory_search`** -- trouve des notes pertinentes via une recherche sémantique, même lorsque
  la formulation diffère de l'originale.
- **`memory_get`** -- lit un fichier mémoire spécifique ou une plage de lignes.

Les deux outils sont fournis par le plugin de mémoire actif (par défaut : `memory-core`).

## Recherche mémoire

Lorsqu'un fournisseur d'embeddings est configuré, `memory_search` utilise la **recherche
hybride** -- combinant la similarité vectorielle (sens sémantique) avec la correspondance de mots-clés
(termes exacts comme les ID et les symboles de code). Cela fonctionne dès le départ une fois que vous avez
une clé d'API pour n'importe quel fournisseur pris en charge.

<Info>OpenClaw détecte automatiquement votre fournisseur d'embeddings parmi les clés d'API disponibles. Si vous avez une clé OpenAI, Gemini, Voyage ou Mistral configurée, la recherche mémoire est activée automatiquement.</Info>

Pour des détails sur le fonctionnement de la recherche, les options de réglage et la configuration du fournisseur, consultez
[Recherche mémoire](/en/concepts/memory-search).

## Moteurs de mémoire

<CardGroup cols={3}>
  <Card title="Builtin (default)" icon="database" href="/en/concepts/memory-builtin">
    Basé sur SQLite. Fonctionne immédiatement avec la recherche par mots-clés, la similarité vectorielle et la recherche hybride. Aucune dépendance supplémentaire.
  </Card>
  <Card title="QMD" icon="search" href="/en/concepts/memory-qmd">
    Sidecar local-first avec reclassage, expansion de requêtes et la capacité d'indexer des répertoires en dehors de l'espace de travail.
  </Card>
  <Card title="Honcho" icon="brain" href="/en/concepts/memory-honcho">
    Mémoire multi-session native IA avec modélisation utilisateur, recherche sémantique et conscience multi-agent. Installation du plugin.
  </Card>
</CardGroup>

## Vidange automatique de la mémoire

Avant que la [compaction](/en/concepts/compaction) ne résume votre conversation, OpenClaw
exécute un tour silencieux qui rappelle à l'agent d'enregistrer le contexte important dans des fichiers de mémoire.
C'est activé par défaut -- vous n'avez rien à configurer.

<Tip>La vidange de la mémoire empêche la perte de contexte lors de la compaction. Si votre agent possède des faits importants dans la conversation qui ne sont pas encore écrits dans un fichier, ils seront enregistrés automatiquement avant que le résumé ne se produise.</Tip>

## Rêve (expérimental)

Le rêve est une passe de consolidation en arrière-plan optionnelle pour la mémoire. Il collecte
des signaux à court terme, note les candidats, et ne promeut que les éléments qualifiés dans la
mémoire à long terme (`MEMORY.md`).

Il est conçu pour maintenir un signal fort dans la mémoire à long terme :

- **Opt-in** : désactivé par défaut.
- **Planifié** : lorsqu'il est activé, `memory-core` gère automatiquement une tâche cron récurrente
  pour un balayage de rêve complet.
- **Seuillé** : les promotions doivent franchir les barrières de score, de fréquence de rappel et de
  diversité des requêtes.
- **Révisable** : les résumés de phase et les entrées de journal sont écrits dans `DREAMS.md`
  pour révision humaine.

Pour le comportement des phases, les signaux de notation et les détails du Journal de Rêve, voir
[Rêve (expérimental)](/en/concepts/dreaming).

## CLI

```bash
openclaw memory status          # Check index status and provider
openclaw memory search "query"  # Search from the command line
openclaw memory index --force   # Rebuild the index
```

## Pour aller plus loin

- [Moteur de mémoire intégré](/en/concepts/memory-builtin) -- backend SQLite par défaut
- [Moteur de mémoire QMD](/en/concepts/memory-qmd) -- sidecar avancé local-first
- [Mémoire Honcho](/en/concepts/memory-honcho) -- mémoire multi-session native IA
- [Recherche mémoire](/en/concepts/memory-search) -- pipeline de recherche, fournisseurs et
  réglage
- [Rêve (expérimental)](/en/concepts/dreaming) -- promotion en arrière-plan
  du rappel à court terme vers la mémoire à long terme
- [Référence de configuration de la mémoire](/en/reference/memory-config) -- tous les paramètres de configuration
- [Compaction](/en/concepts/compaction) -- interaction de la compaction avec la mémoire
