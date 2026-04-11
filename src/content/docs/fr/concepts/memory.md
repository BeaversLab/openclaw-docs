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
- **`memory/YYYY-MM-DD.md`** -- notes quotidiennes. Contexte en cours et observations. Les notes d'aujourd'hui et d'hier sont chargées automatiquement.
- **`DREAMS.md`** (expérimental, facultatif) -- Journal des rêves et résumés de balayage de rêves pour revue humaine.

Ces fichiers résident dans l'espace de travail de l'agent (par défaut `~/.openclaw/workspace`).

<Tip>Si vous voulez que votre agent se souvienne de quelque chose, demandez-le-lui simplement : « Souviens-toi que je préfère TypeScript. » Il l'écrira dans le fichier approprié.</Tip>

## Outils de mémoire

L'agent dispose de deux outils pour travailler avec la mémoire :

- **`memory_search`** -- trouve des notes pertinentes en utilisant la recherche sémantique, même lorsque la formulation diffère de l'originale.
- **`memory_get`** -- lit un fichier de mémoire spécifique ou une plage de lignes.

Les deux outils sont fournis par le plugin de mémoire actif (par défaut : `memory-core`).

## Plugin compagnon Memory Wiki

Si vous souhaitez que la mémoire durable se comporte davantage comme une base de connaissances maintenue que de simples notes brutes, utilisez le plugin inclus `memory-wiki`.

`memory-wiki` compile les connaissances durables dans un coffre de wiki avec :

- structure de page déterministe
- revendications et preuves structurées
- suivi des contradictions et de la fraîcheur
- tableaux de bord générés
- résumés compilés pour les consommateurs agent/execution
- outils natifs au wiki comme `wiki_search`, `wiki_get`, `wiki_apply` et `wiki_lint`

Il ne remplace pas le plugin de mémoire actif. Le plugin de mémoire actif possède toujours la fonction de rappel, la promotion et le rêve. `memory-wiki` ajoute une couche de connaissances riche en provenance à côté.

Voir [Memory Wiki](/en/plugins/memory-wiki).

## Recherche mémoire

Lorsqu'un fournisseur d'embeddings est configuré, `memory_search` utilise la **recherche hybride** -- combinant la similarité vectorielle (sens sémantique) avec la correspondance de mots-clés (termes exacts comme les ID et les symboles de code). Cela fonctionne immédiatement une fois que vous avez une clé API pour n'importe quel fournisseur pris en charge.

<Info>OpenClaw détecte automatiquement votre fournisseur d'embeddings à partir des clés API disponibles. Si vous avez une clé OpenAI, Gemini, Voyage ou Mistral configurée, la recherche mémoire est activée automatiquement.</Info>

Pour plus de détails sur le fonctionnement de la recherche, les options de réglage et la configuration du fournisseur, voir [Memory Search](/en/concepts/memory-search).

## Moteurs de mémoire

<CardGroup cols={3}>
  <Card title="Intégré (par défaut)" icon="database" href="/en/concepts/memory-builtin">
    Basé sur SQLite. Fonctionne immédiatement avec la recherche par mots-clés, la similarité vectorielle et la recherche hybride. Aucune dépendance supplémentaire.
  </Card>
  <Card title="QMD" icon="search" href="/en/concepts/memory-qmd">
    Sidecar priorité locale avec re-classement, expansion de requêtes et la capacité d'indexer des répertoires en dehors de l'espace de travail.
  </Card>
  <Card title="Honcho" icon="brain" href="/en/concepts/memory-honcho">
    Mémoire inter-session native IA avec modélisation utilisateur, recherche sémantique et sensibilisation multi-agent. Installation de plugin.
  </Card>
</CardGroup>

## Couche de wiki de connaissances

<CardGroup cols={1}>
  <Card title="Memory Wiki" icon="book" href="/en/plugins/memory-wiki">
    Compile la mémoire durable dans un coffre-fort wiki riche en provenance avec des revendications, des tableaux de bord, le mode pont et des flux de travail compatibles avec Obsidian.
  </Card>
</CardGroup>

## Vidange automatique de la mémoire

Avant que la [compaction](/en/concepts/compaction) ne résume votre conversation, OpenClaw
exécute un tour silencieux qui rappelle à l'agent de sauvegarder le contexte important dans les fichiers de mémoire.
Ceci est activé par défaut -- vous n'avez rien à configurer.

<Tip>La vidange de la mémoire empêche la perte de contexte lors de la compaction. Si votre agent possède des faits importants dans la conversation qui ne sont pas encore écrits dans un fichier, ils seront sauvegardés automatiquement avant que le résumé ne soit effectué.</Tip>

## Rêve (expérimental)

Le rêve est une passe de consolidation en arrière-plan facultative pour la mémoire. Il collecte des signaux à court terme, évalue les candidats et ne promeut que les éléments qualifiés dans la mémoire à long terme (`MEMORY.md`).

Il est conçu pour maintenir un signal élevé dans la mémoire à long terme :

- **Opt-in** : désactivé par défaut.
- **Planifié** : lorsqu'il est activé, `memory-core` gère automatiquement une tâche cron récurrente
  pour un balayage de rêve complet.
- **Seuillé** : les promotions doivent réussir les seuils de score, la fréquence de rappel et la diversité des requêtes.
- **Consultable** : les résumés de phase et les entrées de journal sont écrits dans `DREAMS.md`
  pour consultation humaine.

Pour le comportement des phases, les signaux de scoring et les détails du Dream Diary, voir
[Dreaming (expérimental)](/en/concepts/dreaming).

## CLI

```bash
openclaw memory status          # Check index status and provider
openclaw memory search "query"  # Search from the command line
openclaw memory index --force   # Rebuild the index
```

## Pour aller plus loin

- [Moteur de mémoire intégré](/en/concepts/memory-builtin) -- backend SQLite par défaut
- [Moteur de mémoire QMD](/en/concepts/memory-qmd) -- sidecar avancé en priorité locale
- [Honcho Memory](/en/concepts/memory-honcho) -- mémoire multi-session native IA
- [Memory Wiki](/en/plugins/memory-wiki) -- coffre de connaissances compilé et outils natifs wiki
- [Memory Search](/en/concepts/memory-search) -- pipeline de recherche, fournisseurs et
  réglage
- [Dreaming (expérimental)](/en/concepts/dreaming) -- promotion en arrière-plan
  du souvenir à court terme vers la mémoire à long terme
- [Référence de configuration de la mémoire](/en/reference/memory-config) -- tous les paramètres de configuration
- [Compaction](/en/concepts/compaction) -- interaction de la compaction avec la mémoire
