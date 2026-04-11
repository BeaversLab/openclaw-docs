---
summary: "memory-wiki : coffre-fort de connaissances compilées avec provenance, revendications, tableaux de bord et mode pont"
read_when:
  - You want persistent knowledge beyond plain MEMORY.md notes
  - You are configuring the bundled memory-wiki plugin
  - You want to understand wiki_search, wiki_get, or bridge mode
title: "Memory Wiki"
---

# Memory Wiki

`memory-wiki` est un plugin inclus qui transforme la mémoire durable en un coffre-fort de connaissances compilées.

Il ne remplace **pas** le plugin de mémoire active. Le plugin de mémoire active possède toujours la restitution, la promotion, l'indexation et le rêve. `memory-wiki` se place à côté de lui et compile les connaissances durables en un wiki navigable avec des pages déterministes, des revendications structurées, une provenance, des tableaux de bord et des synthèses lisibles par machine.

Utilisez-le lorsque vous voulez que la mémoire se comporte davantage comme une couche de connaissances entretenue et moins comme une pile de fichiers Markdown.

## Ce qu'il ajoute

- Un coffre-fort wiki dédié avec une mise en page de page déterministe
- Métadonnées de revendication et de preuve structurées, pas seulement de la prose
- Provenance, confiance, contradictions et questions ouvertes au niveau de la page
- Synthèses compilées pour les consommateurs agents/ runtime
- Outils de recherche, d'obtention, d'application et de lint natifs du wiki
- Mode pont optionnel qui importe les artefacts publics du plugin de mémoire active
- Mode de rendu compatible avec Obsidian et intégration CLI en option

## Comment cela s'intègre à la mémoire

Imaginez la séparation comme ceci :

| Couche                                                      | Possède                                                                                                                     |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Plugin de mémoire active (`memory-core`, QMD, Honcho, etc.) | Restitution, recherche sémantique, promotion, rêve, runtime de la mémoire                                                   |
| `memory-wiki`                                               | Pages wiki compilées, synthèses riches en provenance, tableaux de bord, recherche/obtention/application spécifiques au wiki |

Si le plugin de mémoire active expose des artefacts de restitution partagés, OpenClaw peut rechercher les deux couches en une seule passe avec `memory_search corpus=all`.

Lorsque vous avez besoin d'un classement, d'une provenance ou d'un accès direct aux pages spécifiques au wiki, utilisez plutôt les outils natifs du wiki.

## Modes de coffre-fort

`memory-wiki` prend en charge trois modes de coffre-fort :

### `isolated`

Son propre coffre-fort, ses propres sources, aucune dépendance à `memory-core`.

Utilisez ce mode lorsque vous voulez que le wiki soit son propre magasin de connaissances curaté.

### `bridge`

Lit les artefacts de mémoire publics et les événements de mémoire du plugin de mémoire active via les coutures publiques du SDK du plugin.

Utilisez ceci lorsque vous voulez que le wiki compile et organise les artefacts exportés par le plugin de mémoire sans accéder aux internals privés du plugin.

Le mode pont peut indexer :

- les artefacts de mémoire exportés
- les rapports de rêve
- les notes quotidiennes
- les fichiers racine de mémoire
- les journaux d'événements de mémoire

### `unsafe-local`

Échappatoire explicite pour la même machine pour les chemins privés locaux.

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

Le contenu géré reste à l'intérieur des blocs générés. Les blocs de notes humains sont conservés.

Les principaux groupes de pages sont :

- `sources/` pour la matière première importée et les pages soutenues par le pont
- `entities/` pour les choses durables, les personnes, les systèmes, les projets et les objets
- `concepts/` pour les idées, les abstractions, les modèles et les politiques
- `syntheses/` pour les résumés compilés et les agrégats maintenus
- `reports/` pour les tableaux de bord générés

## Revendications structurées et preuves

Les pages peuvent contenir des frontmatter `claims` structurés, et pas seulement du texte libre.

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

C'est ce qui fait que le wiki agit plus comme une couche de croyance que comme un dépotoir de notes passif. Les revendications peuvent être suivies, notées, contestées et résolues jusqu'aux sources.

## Pipeline de compilation

L'étape de compilation lit les pages du wiki, normalise les résumés et émet des artefacts stables orientés machine sous :

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

Ces résumés existent pour que les agents et le code d'exécution n'aient pas à extraire des données des pages Markdown.

La sortie compilée alimente également :

- l'indexation wiki en première passe pour les flux de recherche/récupération
- la recherche par ID de revendication vers les pages propriétaires
- suppléments de prompt compacts
- génération de rapport/tableau de bord

## Tableaux de bord et rapports de santé

Lorsque `render.createDashboards` est activé, la compilation maintient des tableaux de bord sous `reports/`.

Les rapports intégrés incluent :

- `reports/open-questions.md`
- `reports/contradictions.md`
- `reports/low-confidence.md`
- `reports/claim-health.md`
- `reports/stale-pages.md`

Ces rapports suivent des éléments tels que :

- grappes de notes contradictoires
- grappes de revendications concurrentes
- revendications manquant des preuves structurées
- pages et revendications à faible confiance
- fraîcheur périmée ou inconnue
- pages avec des questions non résolues

## Recherche et récupération

`memory-wiki` prend en charge deux moteurs de recherche :

- `shared` : utiliser le flux de recherche de mémoire partagé si disponible
- `local` : rechercher dans le wiki localement

Il prend également en charge trois corpus :

- `wiki`
- `memory`
- `all`

Comportement important :

- `wiki_search` et `wiki_get` utilisent les résumés compilés comme première passe lorsque c'est possible
- les identifiants de revendication peuvent être résolus vers la page propriétaire
- les revendications contestées/périmées/fraîches influencent le classement
- les étiquettes de provenance peuvent survivre dans les résultats

Règle pratique :

- utiliser `memory_search corpus=all` pour une passe de rappel large
- utiliser `wiki_search` + `wiki_get` lorsque vous vous souciez du classement spécifique au wiki, de la provenance ou de la structure des croyances au niveau de la page

## Outils d'agent

Le plugin enregistre ces outils :

- `wiki_status`
- `wiki_search`
- `wiki_get`
- `wiki_apply`
- `wiki_lint`

Ce qu'ils font :

- `wiki_status` : mode de coffre actuel, santé, disponibilité de la CLI Obsidian
- `wiki_search` : rechercher des pages wiki et, si configuré, des corpus de mémoire partagés
- `wiki_get` : lire une page wiki par id/chemin ou revenir au corpus de mémoire partagée
- `wiki_apply` : mutations étroites de synthèse/métadonnées sans chirurgie de page libre
- `wiki_lint` : vérifications structurelles, lacunes de provenance, contradictions, questions ouvertes

Le plugin enregistre également un supplément de corpus de mémoire non exclusif, afin que `memory_search` et `memory_get` partagés puissent accéder au wiki lorsque le plugin de mémoire active prend en charge la sélection de corpus.

## Comportement du prompt et du contexte

Lorsque `context.includeCompiledDigestPrompt` est activé, les sections de prompt de mémoire ajoutent une instantané compilé compact de `agent-digest.json`.

Cet instantané est intentionnellement petit et à fort signal :

- uniquement les pages principales
- uniquement les revendications principales
- nombre de contradictions
- nombre de questions
- qualificateurs de confiance/fraîcheur

Ceci est optionnel car cela modifie la forme du prompt et est principalement utile pour les moteurs de contexte ou l'assemblage de prompts hérités qui consomment explicitement des suppléments de mémoire.

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
- `search.corpus` : `wiki`, `memory`, ou `all`
- `context.includeCompiledDigestPrompt` : ajouter un instantané de résumé compact aux sections de prompt de mémoire
- `render.createBacklinks` : générer des blocs liés déterministes
- `render.createDashboards` : générer des pages de tableau de bord

## CLI

`memory-wiki` expose également une interface CLI de premier niveau :

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

Voir [CLI : wiki](/en/cli/wiki) pour la référence complète des commandes.

## Prise en charge d'Obsidian

Lorsque `vault.renderMode` est `obsidian`, le plugin écrit du Markdown compatible avec Obsidian et peut éventuellement utiliser l'`obsidian` CLI officiel.

Les flux de travail pris en charge incluent :

- sondage de statut
- recherche dans le coffre
- ouverture d'une page
- appel d'une commande Obsidian
- aller à la note quotidienne

Ceci est optionnel. Le wiki fonctionne toujours en mode natif sans Obsidian.

## Workflow recommandé

1. Conservez votre plugin de mémoire active pour le rappel/la promotion/le rêve.
2. Activez `memory-wiki`.
3. Commencez avec le mode `isolated` à moins que vous ne souhaitiez explicitement le mode pont.
4. Utilisez `wiki_search` / `wiki_get` lorsque la provenance est importante.
5. Utilisez `wiki_apply` pour des synthèses ciblées ou des mises à jour de métadonnées.
6. Exécutez `wiki_lint` après des modifications significatives.
7. Activez les tableaux de bord si vous souhaitez voir les éléments obsolètes/contradictoires.

## Documentation connexe

- [Vue d'ensemble de la mémoire](/en/concepts/memory)
- [CLI : mémoire](/en/cli/memory)
- [CLI : wiki](/en/cli/wiki)
- [Vue d'ensemble du SDK de plugin](/en/plugins/sdk-overview)
