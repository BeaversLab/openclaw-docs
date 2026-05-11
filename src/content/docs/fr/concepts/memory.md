---
summary: "Comment OpenClaw se souvient des choses d'une session à l'autre"
title: "Aperçu de la mémoire"
read_when:
  - You want to understand how memory works
  - You want to know what memory files to write
---

OpenClaw se souvient des choses en écrivant des **fichiers Markdown bruts** dans l'espace de travail de votre agent. Le modèle ne "retient" que ce qui est sauvegardé sur le disque — il n'y a aucun état caché.

## Fonctionnement

Votre agent possède trois fichiers liés à la mémoire :

- **`MEMORY.md`** — mémoire à long terme. Faits durables, préférences et décisions. Chargé au début de chaque session DM.
- **`memory/YYYY-MM-DD.md`** — notes quotidiennes. Contexte courant et observations. Les notes d'aujourd'hui et d'hier sont chargées automatiquement.
- **`DREAMS.md`** (optionnel) — Journal de rêve et résumés des balayages de rêve pour examen humain, incluant les entrées de rétroremplissage historique ancrées.

Ces fichiers résident dans l'espace de travail de l'agent (par défaut `~/.openclaw/workspace`).

<Tip>Si vous voulez que votre agent se souvienne de quelque chose, demandez-le-lui simplement : "Souviens-toi que je préfère TypeScript." Il l'écrira dans le fichier approprié.</Tip>

## Outils de mémoire

L'agent dispose de deux outils pour travailler avec la mémoire :

- **`memory_search`** — trouve des notes pertinentes en utilisant la recherche sémantique, même lorsque le wording diffère de l'original.
- **`memory_get`** — lit un fichier de mémoire spécifique ou une plage de lignes.

Les deux outils sont fournis par le plugin de mémoire actif (par défaut : `memory-core`).

## Plugin compagnon Memory Wiki

Si vous voulez que la mémoire durable se comporte davantage comme une base de connaissances entretenue que de simples notes brutes, utilisez le plugin `memory-wiki` inclus.

`memory-wiki` compile les connaissances durables dans un coffre-fort wiki avec :

- une structure de page déterministe
- des affirmations et des preuves structurées
- le suivi des contradictions et de la fraîcheur
- des tableaux de bord générés
- des synthèses compilées pour les consommateurs agents/runtime
- des outils natifs au wiki comme `wiki_search`, `wiki_get`, `wiki_apply` et `wiki_lint`

Il ne remplace pas le plugin de mémoire actif. Le plugin de mémoire actif possède toujours la récupération, la promotion et le rêve. `memory-wiki` ajoute une couche de connaissances riche en provenance à côté de celui-ci.

Voir [Memory Wiki](/fr/plugins/memory-wiki).

## Recherche dans la mémoire

Lorsqu'un fournisseur d'embeddings est configuré, `memory_search` utilise une **recherche hybride** — combinant la similarité vectorielle (sens sémantique) avec la correspondance de mots-clés (termes exacts comme les identifiants et les symboles de code). Cela fonctionne immédiatement dès que vous avez une clé API pour n'importe quel fournisseur pris en charge.

<Info>OpenClaw détecte automatiquement votre fournisseur d'embeddings à partir des clés API disponibles. Si vous avez une clé OpenAI, Gemini, Voyage ou Mistral configurée, la recherche dans la mémoire est activée automatiquement.</Info>

Pour plus de détails sur le fonctionnement de la recherche, les options de réglage et la configuration du fournisseur, voir
[Recherche dans la mémoire](/fr/concepts/memory-search).

## Backends de mémoire

<CardGroup cols={3}>
  <Card title="Builtin (default)" icon="database" href="/fr/concepts/memory-builtin">
    Basé sur SQLite. Fonctionne immédiatement avec la recherche par mots-clés, la similarité vectorielle et la recherche hybride. Aucune dépendance supplémentaire.
  </Card>
  <Card title="QMD" icon="search" href="/fr/concepts/memory-qmd">
    Sidecar local-first avec reranking, expansion de requêtes et la capacité d'indexer des répertoires en dehors de l'espace de travail.
  </Card>
  <Card title="Honcho" icon="brain" href="/fr/concepts/memory-honcho">
    Mémoire inter-sessions nativement IA avec modélisation utilisateur, recherche sémantique et conscience multi-agent. Installation du plugin.
  </Card>
</CardGroup>

## Couche de wiki de connaissances

<CardGroup cols={1}>
  <Card title="Memory Wiki" icon="book" href="/fr/plugins/memory-wiki">
    Compile la mémoire durable dans un coffre de wiki riche en provenance avec des revendications, des tableaux de bord, le mode pont et des flux de travail compatibles avec Obsidian.
  </Card>
</CardGroup>

## Vidange automatique de la mémoire

Avant que la [compaction](/fr/concepts/compaction) ne résume votre conversation, OpenClaw
exécute un tour silencieux qui rappelle à l'agent d'enregistrer le contexte important dans les fichiers de mémoire.
Ceci est activé par défaut — vous n'avez rien à configurer.

<Tip>La vidange de la mémoire empêche la perte de contexte lors de la compactage. Si votre agent possède des faits importants dans la conversation qui ne sont pas encore écrits dans un fichier, ils seront enregistrés automatiquement avant que le résumé ne se produise.</Tip>

## Rêve

Le rêve est une phase de consolidation en arrière-plan facultative pour la mémoire. Il collecte
des signaux à court terme, note les candidats et ne promeut que les éléments qualifiés vers
la mémoire à long terme (`MEMORY.md`).

Il est conçu pour maintenir la mémoire à long terme à fort signal :

- **Optionnel** : désactivé par défaut.
- **Planifié** : lorsqu'il est activé, `memory-core` gère automatiquement une tâche cron récurrente
  pour un balayage complet de rêve.
- **Seuils** : les promotions doivent franchir les barrières de score, de fréquence de rappel et de
  diversité des requêtes.
- **Révisable** : les résumés de phase et les entrées de journal sont écrits dans `DREAMS.md`
  pour révision humaine.

Pour le comportement des phases, les signaux de notation et les détails du Journal de rêve, voir
[Rêve](/fr/concepts/dreaming).

## Remplissage ancré et promotion en direct

Le système de rêve possède désormais deux voies de révision étroitement liées :

- **Le rêve en direct** fonctionne à partir du magasin de rêve à court terme sous
  `memory/.dreams/` et c'est ce que la phase profonde normale utilise pour décider de ce qui
  peut être diplômé dans `MEMORY.md`.
- **Le remplissage ancré** lit les notes historiques `memory/YYYY-MM-DD.md` en tant que
  fichiers de jour autonomes et écrit la sortie de révision structurée dans `DREAMS.md`.

Le remplissage ancré est utile lorsque vous souhaitez rejouer d'anciennes notes et inspecter ce
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
- `MEMORY.md` n'est toujours écrit que par la promotion profonde.

Si vous décidez que la lecture n'était pas utile, vous pouvez supprimer les artefacts mis en attente
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

- [Moteur de mémoire intégré](/fr/concepts/memory-builtin) : backend SQLite par défaut.
- [QMD memory engine](/fr/concepts/memory-qmd) : sidecar local-first avancé.
- [Honcho memory](/fr/concepts/memory-honcho) : mémoire inter-sessions native IA.
- [Memory Wiki](/fr/plugins/memory-wiki) : coffre-fort de connaissances compilé et outils natifs wiki.
- [Memory search](/fr/concepts/memory-search) : pipeline de recherche, fournisseurs et réglages.
- [Dreaming](/fr/concepts/dreaming) : promotion en arrière-plan du rappel à court terme vers la mémoire à long terme.
- [Memory configuration reference](/fr/reference/memory-config) : tous les paramètres de configuration.
- [Compaction](/fr/concepts/compaction) : interaction de la compactage avec la mémoire.

## Connexes

- [Active memory](/fr/concepts/active-memory)
- [Memory search](/fr/concepts/memory-search)
- [Builtin memory engine](/fr/concepts/memory-builtin)
- [Honcho memory](/fr/concepts/memory-honcho)
