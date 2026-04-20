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
- **`memory/YYYY-MM-DD.md`** -- notes quotidiennes. Contexte et observations en cours. Les notes d'aujourd'hui et d'hier sont chargées automatiquement.
- **`DREAMS.md`** (facultatif) -- Résumés du Journal des rêves et du balayage de rêve pour examen humain, y compris les entrées de rétro-remplissage historique ancrées.

Ces fichiers résident dans l'espace de travail de l'agent (par défaut `~/.openclaw/workspace`).

<Tip>Si vous voulez que votre agent se souvienne de quelque chose, demandez-le-lui simplement : « Souviens-toi que je préfère TypeScript. » Il l'écrira dans le fichier approprié.</Tip>

## Outils de mémoire

L'agent dispose de deux outils pour travailler avec la mémoire :

- **`memory_search`** -- trouve des notes pertinentes grâce à une recherche sémantique, même lorsque le libellé diffère de l'original.
- **`memory_get`** -- lit un fichier mémoire ou une plage de lignes spécifique.

Les deux outils sont fournis par le plugin de mémoire actif (par défaut : `memory-core`).

## Plugin compagnon Memory Wiki

Si vous souhaitez que la mémoire durable se comporte davantage comme une base de connaissances entretenue que de simples notes brutes, utilisez le plugin fourni `memory-wiki`.

`memory-wiki` compile les connaissances durables dans un coffre wiki avec :

- structure de page déterministe
- revendications et preuves structurées
- suivi des contradictions et de la fraîcheur
- tableaux de bord générés
- résumés compilés pour les consommateurs agent/execution
- des outils natifs du wiki comme `wiki_search`, `wiki_get`, `wiki_apply` et `wiki_lint`

Il ne remplace pas le plugin de mémoire actif. Le plugin de mémoire actif possède toujours le rappel, la promotion et le rêve. `memory-wiki` ajoute une couche de connaissances riche en provenance à côté.

Voir [Memory Wiki](/fr/plugins/memory-wiki).

## Recherche mémoire

Lorsqu'un fournisseur d'embeddings est configuré, `memory_search` utilise une **recherche hybride** -- combinant la similarité vectorielle (signification sémantique) avec la correspondance par mots-clés (termes exacts comme les ID et les symboles de code). Cela fonctionne immédiatement une fois que vous disposez d'une clé API pour n'importe quel fournisseur pris en charge.

<Info>OpenClaw détecte automatiquement votre fournisseur d'embeddings à partir des clés API disponibles. Si vous avez une clé OpenAI, Gemini, Voyage ou Mistral configurée, la recherche mémoire est activée automatiquement.</Info>

Pour plus de détails sur le fonctionnement de la recherche, les options de réglage et la configuration du fournisseur, voir [Memory Search](/fr/concepts/memory-search).

## Moteurs de mémoire

<CardGroup cols={3}>
  <Card title="Builtin (default)" icon="database" href="/fr/concepts/memory-builtin">
    Basé sur SQLite. Fonctionne immédiatement avec la recherche par mots-clés, la similarité vectorielle et la recherche hybride. Aucune dépendance externe.
  </Card>
  <Card title="QMD" icon="search" href="/fr/concepts/memory-qmd">
    Sidecar "local-first" avec re-classement, expansion de requêtes, et la capacité d'indexer des répertoires en dehors de l'espace de travail.
  </Card>
  <Card title="Honcho" icon="brain" href="/fr/concepts/memory-honcho">
    Mémoire inter-sessions native IA avec modélisation utilisateur, recherche sémantique et conscience multi-agents. Installation de plugin.
  </Card>
</CardGroup>

## Couche de wiki de connaissances

<CardGroup cols={1}>
  <Card title="Memory Wiki" icon="book" href="/fr/plugins/memory-wiki">
    Compile une mémoire durable dans un coffre wiki riche en provenance avec des revendications, des tableaux de bord, le mode pont et des flux de travail compatibles avec Obsidian.
  </Card>
</CardGroup>

## Vidange automatique de la mémoire

Avant que la [compactage](/fr/concepts/compaction) ne résume votre conversation, OpenClaw
lance un tour silencieux qui rappelle à l'agent de sauvegarder le contexte important dans les fichiers
de mémoire. Ceci est activé par défaut -- vous n'avez rien à configurer.

<Tip>La vidange de la mémoire empêche la perte de contexte lors de la compaction. Si votre agent possède des faits importants dans la conversation qui ne sont pas encore écrits dans un fichier, ils seront sauvegardés automatiquement avant que le résumé ne soit effectué.</Tip>

## Rêve

Le rêve est une passe de consolidation en arrière-plan optionnelle pour la mémoire. Il collecte
les signaux à court terme, note les candidats, et ne promeut que les éléments qualifiés dans
la mémoire à long terme (`MEMORY.md`).

Il est conçu pour maintenir un signal élevé dans la mémoire à long terme :

- **Opt-in** : désactivé par défaut.
- **Planifié** : lorsqu'il est activé, `memory-core` gère automatiquement une tâche cron récurrente
  pour un balayage de rêve complet.
- **Seuillé** : les promotions doivent réussir les seuils de score, la fréquence de rappel et la diversité des requêtes.
- **Révisable** : les résumés de phase et les entrées de journal sont écrits dans `DREAMS.md`
  pour révision humaine.

Pour le comportement des phases, les signaux de scoring et les détails du Journal des rêves, voir
[Dreaming](/fr/concepts/dreaming).

## Remplissage ancré et promotion en direct

Le système de rêve possède désormais deux voies de révision étroitement liées :

- **Le rêve en direct** fonctionne à partir du magasin de rêve à court terme sous
  `memory/.dreams/` et c'est ce que la phase profonde normale utilise pour décider ce qui
  peut passer dans `MEMORY.md`.
- **Le remplissage ancré (grounded backfill)** lit les notes historiques `memory/YYYY-MM-DD.md` en tant que
  fichiers journal autonomes et écrit les résultats de révision structurés dans `DREAMS.md`.

Le remplissage ancré est utile lorsque vous souhaitez relire d'anciennes notes et inspecter ce
que le système considère comme durable sans modifier manuellement `MEMORY.md`.

Lorsque vous utilisez :

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

les candidats durables ancrés ne sont pas promus directement. Ils sont mis en attente dans
le même magasin de rêve à court terme que la phase profonde normale utilise déjà. Cela
signifie :

- `DREAMS.md` reste la surface de révision humaine.
- le magasin à court terme reste la surface de classement orientée machine.
- `MEMORY.md` est toujours uniquement écrit par la promotion profonde.

Si vous décidez que la relève n'était pas utile, vous pouvez supprimer les artefacts mis en attente
sans toucher aux entrées de journal ordinaires ou à l'état de rappel normal :

```bash
openclaw memory rem-backfill --rollback
openclaw memory rem-backfill --rollback-short-term
```

## CLI

```bash
openclaw memory status          # Check index status and provider
openclaw memory search "query"  # Search from the command line
openclaw memory index --force   # Rebuild the index
```

## Pour aller plus loin

- [Moteur de mémoire intégré](/fr/concepts/memory-builtin) -- backend SQLite par défaut
- [Moteur de mémoire QMD](/fr/concepts/memory-qmd) -- sidecar avancé local-first
- [Honcho Memory](/fr/concepts/memory-honcho) -- mémoire inter-sessions native IA
- [Memory Wiki](/fr/plugins/memory-wiki) -- coffre-fort de connaissances compilé et outils natifs wiki
- [Recherche de mémoire](/fr/concepts/memory-search) -- pipeline de recherche, fournisseurs et
  réglage
- [Dreaming](/fr/concepts/dreaming) -- promotion en arrière-plan
  du rappel à court terme vers la mémoire à long terme
- [Référence de configuration de la mémoire](/fr/reference/memory-config) -- tous les paramètres de configuration
- [Compaction](/fr/concepts/compaction) -- interaction de la compaction avec la mémoire
