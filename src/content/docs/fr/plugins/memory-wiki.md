---
summary: "memory-wiki : coffre-fort de connaissances compilées avec provenance, revendications, tableaux de bord et mode pont"
read_when:
  - You want persistent knowledge beyond plain MEMORY.md notes
  - You are configuring the bundled memory-wiki plugin
  - You want to understand wiki_search, wiki_get, or bridge mode
title: "Wiki mémoire"
---

`memory-wiki` est un plugin inclus qui transforme la mémoire durable en un
coffre de connaissances compilé.

Il ne remplace **pas** le plugin de mémoire active. Le plugin de mémoire active gère
toujours le rappel, la promotion, l'indexation et le rêve. `memory-wiki` se place à côté
et compile les connaissances durables en un wiki navigable avec des pages
déterministes, des revendications structurées, la provenance, des tableaux de bord
et des synthèses lisibles par la machine.

Utilisez-le lorsque vous voulez que la mémoire se comporte davantage comme une couche
de connaissances entretenue et moins comme une pile de fichiers Markdown.

## Ce qu'il ajoute

- Un coffre de wiki dédié avec une mise en page de page déterministe
- Métadonnées de revendication et de preuve structurées, pas seulement de la prose
- Provenance, confiance, contradictions et questions ouvertes au niveau de la page
- Synthèses compilées pour les consommateurs agents/temps d'exécution
- Outils de recherche/récupération/application/lint natifs du wiki
- Mode pont optionnel qui importe les artefacts publics du plugin de mémoire active
- Mode de rendu compatible avec Obsidian optionnel et intégration CLI

## Comment s'intègre-t-il avec la mémoire

Concevez la division comme ceci :

| Couche                                                      | Gère                                                                                                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Plugin de mémoire active (`memory-core`, QMD, Honcho, etc.) | Rappel, recherche sémantique, promotion, rêve, temps d'exécution de la mémoire                                                    |
| `memory-wiki`                                               | Pages de wiki compilées, synthèses riches en provenance, tableaux de bord, recherche/récupération/application spécifiques au wiki |

Si le plugin de mémoire active expose des artefacts de rappel partagés, OpenClaw peut rechercher
les deux couches en une seule passe avec `memory_search corpus=all`.

Lorsque vous avez besoin d'un classement spécifique au wiki, d'une provenance ou d'un accès direct aux pages, utilisez plutôt
les outils natifs du wiki.

## Modèle hybride recommandé

Une valeur par défaut solide pour les configurations local-first est :

- QMD comme backend de mémoire active pour le rappel et la recherche sémantique large
- `memory-wiki` en mode `bridge` pour des pages de connaissances synthétisées durables

Cette division fonctionne bien car chaque couche reste concentrée :

- QMD garde les notes brutes, les exportations de session et les collections supplémentaires consultables
- `memory-wiki` compile les entités stables, les revendications, les tableaux de bord et les pages source

Règle pratique :

- utilisez `memory_search` lorsque vous voulez une passe de rappel large dans toute la mémoire
- utilisez `wiki_search` et `wiki_get` lorsque vous souhaitez des résultats wiki tenant compte de la provenance
- utilisez `memory_search corpus=all` lorsque vous souhaitez que la recherche partagée couvre les deux couches

Si le mode pont signale zéro artefact exporté, le plugin de mémoire active n'expose pas encore les entrées publiques du pont. Exécutez d'abord `openclaw wiki doctor`, puis confirmez que le plugin de mémoire active prend en charge les artefacts publics.

## Modes de coffre-fort

`memory-wiki` prend en charge trois modes de coffre-fort :

### `isolated`

Propre coffre-fort, propres sources, aucune dépendance à `memory-core`.

Utilisez ceci lorsque vous souhaitez que le wiki soit son propre magasin de connaissances organisé.

### `bridge`

Lit les artefacts de mémoire publics et les événements de mémoire du plugin de mémoire active via les coutures publiques du SDK de plugin.

Utilisez ceci lorsque vous souhaitez que le wiki compile et organise les artefacts exportés par le plugin de mémoire sans accéder aux éléments internes privés du plugin.

Le mode pont peut indexer :

- artefacts de mémoire exportés
- rapports de rêve
- notes quotidiennes
- fichiers racine de mémoire
- journaux d'événements de mémoire

### `unsafe-local`

Échappatoire explicite sur la même machine pour les chemins privés locaux.

Ce mode est intentionnellement expérimental et non portable. Utilisez-le uniquement lorsque vous comprenez la limite de confiance et que vous avez spécifiquement besoin d'un accès au système de fichiers local que le mode pont ne peut pas fournir.

## Disposition du coffre-fort

Le plugin initialise un coffre-fort comme ceci :

```text
<vault>/
  AGENTS.md
  WIKI.md
  index.md
  inbox.md
  entities/
  concepts/
  syntheses/
  sources/
  reports/
  _attachments/
  _views/
  .openclaw-wiki/
```

Le contenu géré reste à l'intérieur des blocs générés. Les blocs de notes humains sont préservés.

Les principaux groupes de pages sont :

- `sources/` pour la matière première importée et les pages soutenues par le pont
- `entities/` pour les choses durables, les personnes, les systèmes, les projets et les objets
- `concepts/` pour les idées, les abstractions, les modèles et les politiques
- `syntheses/` pour les résumés compilés et les synthèses maintenues
- `reports/` pour les tableaux de bord générés

## Revendications structurées et preuves

Les pages peuvent contenir des frontmatter structurés `claims`, et pas seulement du texte libre.

Chaque revendication peut inclure :

- `id`
- `text`
- `status`
- `confidence`
- `evidence[]`
- `updatedAt`

Les entrées de preuve peuvent inclure :

- `sourceId`
- `path`
- `lines`
- `weight`
- `note`
- `updatedAt`

C'est ce qui fait que le wiki agit plus comme une couche de croyances que comme un dépôt de notes passif. Les revendications peuvent être suivies, notées, contestées et résolues en revenant aux sources.

## Pipeline de compilation

L'étape de compilation lit les pages du wiki, normalise les résumés et émet des artefacts stables orientés machine sous :

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

Ces résumés existent pour que les agents et le code d'exécution n'aient pas à parcourir les pages Markdown.

La sortie compilée alimente également :

- l'indexation wiki de premier passage pour les flux de recherche/récupération
- la recherche par ID de revendication vers les pages propriétaires
- des suppléments de prompt compacts
- la génération de rapports/tableaux de bord

## Tableaux de bord et rapports d'état

Lorsque `render.createDashboards` est activé, la compilation maintient des tableaux de bord sous `reports/`.

Les rapports intégrés incluent :

- `reports/open-questions.md`
- `reports/contradictions.md`
- `reports/low-confidence.md`
- `reports/claim-health.md`
- `reports/stale-pages.md`

Ces rapports suivent des éléments tels que :

- les grappes de notes contradictoires
- les grappes de revendications concurrentes
- les revendications manquant des preuves structurées
- les pages et les revendications à faible confiance
- la fraîcheur périmée ou inconnue
- les pages avec des questions non résolues

## Recherche et récupération

`memory-wiki` prend en charge deux moteurs de recherche :

- `shared` : utiliser le flux de recherche de mémoire partagée lorsque disponible
- `local` : rechercher localement dans le wiki

Il prend également en charge trois corpus :

- `wiki`
- `memory`
- `all`

Comportement important :

- `wiki_search` et `wiki_get` utilisent les résumés compilés comme premier passage lorsque cela est possible
- les ID de revendication peuvent être résolus vers la page propriétaire
- les revendications contestées/périmées/fraîches influencent le classement
- les étiquettes de provenance peuvent survivre dans les résultats

Règle pratique :

- utiliser `memory_search corpus=all` pour une passe de rappel large
- utilisez `wiki_search` + `wiki_get` lorsque vous vous souciez du classement spécifique au wiki,
  de la provenance ou de la structure des croyances au niveau de la page

## Outils d'agent

Le plugin enregistre ces outils :

- `wiki_status`
- `wiki_search`
- `wiki_get`
- `wiki_apply`
- `wiki_lint`

Ce qu'ils font :

- `wiki_status` : mode de coffre actuel, santé, disponibilité du CLI Obsidian
- `wiki_search` : rechercher des pages wiki et, si configuré, des corpus de mémoire partagés
- `wiki_get` : lire une page wiki par id/chemin ou revenir au corpus de mémoire partagé
- `wiki_apply` : mutations de synthèse/métadonnées ciblées sans modification libre de page
- `wiki_lint` : vérifications structurelles, lacunes de provenance, contradictions, questions ouvertes

Le plugin enregistre également un supplément de corpus de mémoire non exclusif, afin que les
`memory_search` et `memory_get` partagés puissent atteindre le wiki lorsque le plugin de mémoire
actif prend en charge la sélection de corpus.

## Comportement du prompt et du contexte

Lorsque `context.includeCompiledDigestPrompt` est activé, les sections de prompt de mémoire
ajoutent un instantané compilé compact de `agent-digest.json`.

Cet instantané est intentionnellement petit et à signal fort :

- uniquement les principales pages
- uniquement les principales revendications
- nombre de contradictions
- nombre de questions
- qualificateurs de confiance/fraîcheur

Ceci est optionnel car cela modifie la forme du prompt et est principalement utile pour les moteurs
de contexte ou l'assemblage de prompts hérités qui consomment explicitement des suppléments de mémoire.

## Configuration

Mettez la configuration sous `plugins.entries.memory-wiki.config` :

```json5
{
  plugins: {
    entries: {
      "memory-wiki": {
        enabled: true,
        config: {
          vaultMode: "isolated",
          vault: {
            path: "~/.openclaw/wiki/main",
            renderMode: "obsidian",
          },
          obsidian: {
            enabled: true,
            useOfficialCli: true,
            vaultName: "OpenClaw Wiki",
            openAfterWrites: false,
          },
          bridge: {
            enabled: false,
            readMemoryArtifacts: true,
            indexDreamReports: true,
            indexDailyNotes: true,
            indexMemoryRoot: true,
            followMemoryEvents: true,
          },
          ingest: {
            autoCompile: true,
            maxConcurrentJobs: 1,
            allowUrlIngest: true,
          },
          search: {
            backend: "shared",
            corpus: "wiki",
          },
          context: {
            includeCompiledDigestPrompt: false,
          },
          render: {
            preserveHumanBlocks: true,
            createBacklinks: true,
            createDashboards: true,
          },
        },
      },
    },
  },
}
```

Commutateurs clés :

- `vaultMode` : `isolated`, `bridge`, `unsafe-local`
- `vault.renderMode` : `native` ou `obsidian`
- `bridge.readMemoryArtifacts` : importer les artefacts publics du plugin de mémoire active
- `bridge.followMemoryEvents` : inclure les journaux d'événements en mode pont
- `search.backend` : `shared` ou `local`
- `search.corpus` : `wiki`, `memory` ou `all`
- `context.includeCompiledDigestPrompt` : ajouter une instantané compact de résumé aux sections de prompt mémoire
- `render.createBacklinks` : générer des blocs connexes déterministes
- `render.createDashboards` : générer des pages de tableau de bord

### Exemple : QMD + mode pont

Utilisez ceci lorsque vous souhaitez QMD pour la rappel et `memory-wiki` pour une
couche de connaissances maintenue :

```json5
{
  memory: {
    backend: "qmd",
      "memory-wiki": {
        enabled: true,
        config: {
          vaultMode: "bridge",
          bridge: {
            enabled: true,
            readMemoryArtifacts: true,
            indexDreamReports: true,
            indexDailyNotes: true,
            indexMemoryRoot: true,
            followMemoryEvents: true,
          },
          search: {
            backend: "shared",
            corpus: "all",
          },
          context: {
            includeCompiledDigestPrompt: false,
          },
        },
      },
    },
  },
}
```

Cela permet de conserver :

- QMD en charge du rappel de la mémoire active
- `memory-wiki` concentré sur les pages compilées et les tableaux de bord
- la forme du prompt inchangée jusqu'à ce que vous activiez intentionnellement les prompts de résumé compilés

## CLI

`memory-wiki` expose également une surface CLI de premier niveau :

```bash
openclaw wiki status
openclaw wiki doctor
openclaw wiki init
openclaw wiki ingest ./notes/alpha.md
openclaw wiki compile
openclaw wiki lint
openclaw wiki search "alpha"
openclaw wiki get entity.alpha
openclaw wiki apply synthesis "Alpha Summary" --body "..." --source-id source.alpha
openclaw wiki bridge import
openclaw wiki obsidian status
```

Voir [CLI : wiki](/fr/cli/wiki) pour la référence complète des commandes.

## Prise en charge d'Obsidian

Lorsque `vault.renderMode` est `obsidian`, le plugin écrit du Markdown
compatible avec Obsidian et peut optionnellement utiliser le `obsidian` CLI officiel.

Les flux de travail pris en charge incluent :

- sondage de statut
- recherche dans le coffre
- ouverture d'une page
- invoquer une commande Obsidian
- aller à la note quotidienne

Ceci est optionnel. Le wiki fonctionne toujours en mode natif sans Obsidian.

## Flux de travail recommandé

1. Conservez votre plugin de mémoire active pour le rappel/la promotion/le rêve.
2. Activez `memory-wiki`.
3. Commencez par le mode `isolated` à moins que vous ne vouliez explicitement le mode pont.
4. Utilisez `wiki_search` / `wiki_get` lorsque la provenance est importante.
5. Utilisez `wiki_apply` pour des synthèses étroites ou des mises à jour de métadonnées.
6. Exécutez `wiki_lint` après des changements significatifs.
7. Activez les tableaux de bord si vous voulez visibilité sur les éléments périmés/contradictoires.

## Documentation connexe

- [Aperçu de la mémoire](/fr/concepts/memory)
- [CLI : memory](/fr/cli/memory)
- [CLI : wiki](/fr/cli/wiki)
- [Aperçu du SDK Plugin](/fr/plugins/sdk-overview)
