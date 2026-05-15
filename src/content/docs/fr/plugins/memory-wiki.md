---
summary: "memory-wiki : coffre-fort de connaissances compilées avec provenance, revendications, tableaux de bord et mode pont"
read_when:
  - You want persistent knowledge beyond plain MEMORY.md notes
  - You are configuring the bundled memory-wiki plugin
  - You want to understand wiki_search, wiki_get, or bridge mode
title: "Wiki mémoire"
---

`memory-wiki` est un plugin inclus qui transforme la mémoire durable en un coffre-fort de connaissances compilées.

Il ne remplace **pas** le plugin de mémoire active. Le plugin de mémoire active possède toujours la fonction de rappel, la promotion, l'indexation et le rêve. `memory-wiki` se place à côté de lui et compile les connaissances durables en un wiki navigable avec des pages déterministes, des revendications structurées, une provenance, des tableaux de bord et des résumés lisibles par machine.

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

Si le plugin de mémoire active expose des artefacts de rappel partagés, OpenClaw peut rechercher les deux couches en une seule passe avec `memory_search corpus=all`.

Lorsque vous avez besoin d'un classement spécifique au wiki, d'une provenance ou d'un accès direct aux pages, utilisez plutôt
les outils natifs du wiki.

## Modèle hybride recommandé

Une valeur par défaut solide pour les configurations local-first est :

- QMD comme backend de mémoire active pour le rappel et la recherche sémantique large
- `memory-wiki` en mode `bridge` pour des pages de connaissances synthétisées durables

Cette division fonctionne bien car chaque couche reste concentrée :

- QMD garde les notes brutes, les exportations de session et les collections supplémentaires consultables
- `memory-wiki` compile des entités stables, des revendications, des tableaux de bord et des pages sources

Règle pratique :

- utilisez `memory_search` lorsque vous souhaitez une passe de rappel large à travers la mémoire
- utilisez `wiki_search` et `wiki_get` lorsque vous souhaitez des résultats wiki conscients de la provenance
- utilisez `memory_search corpus=all` lorsque vous souhaitez que la recherche partagée couvre les deux couches

Si le mode pont signale zéro artefact exporté, le plugin de mémoire active n'expose pas encore les entrées de pont publiques. Exécutez d'abord `openclaw wiki doctor`, puis confirmez que le plugin de mémoire active prend en charge les artefacts publics.

Lorsque le mode pont est actif et que `bridge.readMemoryArtifacts` est activé, `openclaw wiki status`, `openclaw wiki doctor` et `openclaw wiki bridge import` lisent à travers le Gateway en cours d'exécution. Cela maintient les vérifications de pont CLI alignées avec le contexte du plugin de mémoire d'exécution. Si le pont est désactivé ou si la lecture des artefacts est désactivée, ces commandes conservent leur comportement local/hors ligne.

## Modes de coffre-fort

`memory-wiki` prend en charge trois modes de coffre-fort :

### `isolated`

Propre coffre, propres sources, aucune dépendance à `memory-core`.

Utilisez ceci lorsque vous voulez que le wiki soit son propre magasin de connaissances organisé.

### `bridge`

Lit les artefacts de mémoire publics et les événements de mémoire à partir du plugin de mémoire actif via les points d'entrée publics du SDK du plugin.

Utilisez ce mode lorsque vous souhaitez que le wiki compile et organise les artefacts exportés par le plugin de mémoire sans accéder aux éléments internes privés du plugin.

Le mode pont peut indexer :

- artefacts de mémoire exportés
- rapports de rêve
- notes quotidiennes
- fichiers racine de mémoire
- journaux d'événements de mémoire

### `unsafe-local`

Échappatoire explicite pour la même machine pour les chemins privés locaux.

Ce mode est intentionnellement expérimental et non portable. Utilisez-le uniquement lorsque vous comprenez la limite de confiance et que vous avez spécifiquement besoin d'un accès au système de fichiers local que le mode pont ne peut pas fournir.

## Disposition du coffre

Le plugin initialise un coffre comme ceci :

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

- `sources/` pour la matière première importée et les pages soutenues par le pont (bridge)
- `entities/` pour les choses durables, les personnes, les systèmes, les projets et les objets
- `concepts/` pour les idées, les abstractions, les modèles et les politiques
- `syntheses/` pour les résumés compilés et les synthèses maintenues
- `reports/` pour les tableaux de bord générés

## Revendications structurées et preuves

Les pages peuvent porter des métadonnées frontmatter `claims` structurées, et pas seulement du texte libre.

Chaque revendication peut inclure :

- `id`
- `text`
- `status`
- `confidence`
- `evidence[]`
- `updatedAt`

Les entrées de preuve peuvent inclure :

- `kind`
- `sourceId`
- `path`
- `lines`
- `weight`
- `confidence`
- `privacyTier`
- `note`
- `updatedAt`

C'est ce qui fait que le wiki agit plus comme une couche de croyances que comme un dépôt passif de notes. Les affirmations peuvent être suivies, notées, contestées et résolues jusqu'aux sources.

## Métadonnées d'entité orientées agent

Les pages d'entité peuvent également porter des métadonnées de routage pour une utilisation par l'agent. Il s'agit de métadonnées frontmatter génériques, elles fonctionnent donc pour les personnes, les équipes, les systèmes, les projets ou tout autre type d'entité.

Les champs courants incluent :

- `entityType` : par exemple `person`, `team`, `system` ou `project`
- `canonicalId` : clé d'identité stable utilisée entre les alias et les importations
- `aliases` : noms, pseudonymes ou étiquettes qui doivent pointer vers la même page
- `privacyTier` : `public`, `local-private`, `sensitive` ou `confirm-before-use`
- `bestUsedFor` / `notEnoughFor` : indices de routage compacts
- `lastRefreshedAt` : horodatage de rafraîchissement de la source distinct de l'heure de modification de la page
- `personCard` : carte de routage spécifique à la personne en option avec les pseudonymes, réseaux sociaux,
  e-mails, fuseau horaire, voie, demandes, éléments à éviter, confiance et confidentialité
- `relationships` : arêtes typées vers les pages connexes avec la cible, le type, le poids,
  la confiance, le type de preuve, le niveau de confidentialité et la note

Pour un wiki sur les personnes, l'agent doit généralement commencer par
`reports/person-agent-directory.md`, puis ouvrir la page de la personne avec `wiki_get`
avant d'utiliser les coordonnées ou les faits déduits.

Exemple :

```yaml
pageType: entity
entityType: person
id: entity.brad-groux
canonicalId: maintainer.brad-groux
aliases:
  - Brad
  - bgroux
privacyTier: local-private
bestUsedFor:
  - Microsoft Teams and Azure routing
notEnoughFor:
  - legal approval
lastRefreshedAt: "2026-04-29T00:00:00.000Z"
personCard:
  handles:
    - "@bgroux"
  socials:
    - "https://x.example/bgroux"
  emails:
    - brad@example.com
  timezone: America/Chicago
  lane: Microsoft ecosystem
  askFor:
    - Teams rollout questions
  avoidAskingFor:
    - unrelated billing decisions
  confidence: 0.8
  privacyTier: confirm-before-use
relationships:
  - targetId: entity.alice
    targetTitle: Alice
    kind: collaborates-with
    confidence: 0.7
    evidenceKind: discrawl-stat
claims:
  - id: claim.brad.teams
    text: Brad is useful for Microsoft Teams routing.
    status: supported
    confidence: 0.9
    evidence:
      - kind: maintainer-whois
        sourceId: source.maintainers
        privacyTier: local-private
```

## Pipeline de compilation

L'étape de compilation lit les pages du wiki, normalise les résumés et émet des artefacts
stables orientés machine sous :

- `.openclaw-wiki/cache/agent-digest.json`
- `.openclaw-wiki/cache/claims.jsonl`

Ces résumés existent pour que les agents et le code d'exécution n'aient pas à parcourir les pages
Markdown.

La sortie compilée alimente également :

- indexation wiki de premier passage pour les flux de recherche/récupération
- recherche par ID de revendication vers les pages propriétaires
- suppléments de prompt compacts
- génération de rapports/tableaux de bord

## Tableaux de bord et rapports d'intégrité

Lorsque `render.createDashboards` est activé, la compilation maintient des tableaux de bord sous
`reports/`.

Les rapports intégrés incluent :

- `reports/open-questions.md`
- `reports/contradictions.md`
- `reports/low-confidence.md`
- `reports/claim-health.md`
- `reports/stale-pages.md`
- `reports/person-agent-directory.md`
- `reports/relationship-graph.md`
- `reports/provenance-coverage.md`
- `reports/privacy-review.md`

Ces rapports suivent des éléments tels que :

- amas de notes contradictoires
- amas de revendications concurrentes
- revendications manquant de preuves structurées
- pages et revendications à faible confiance
- fraîcheur périmée ou inconnue
- pages avec des questions non résolues
- cartes de routage personne/entité
- arêtes de relation structurées
- couverture des classes de preuves
- niveaux de confidentialité non publics nécessitant une révision avant utilisation

## Recherche et récupération

`memory-wiki` prend en charge deux moteurs de recherche :

- `shared` : utiliser le flux de recherche de mémoire partagé lorsqu'il est disponible
- `local` : rechercher localement dans le wiki

Il prend également en charge trois corpus :

- `wiki`
- `memory`
- `all`

Comportement important :

- `wiki_search` et `wiki_get` utilisent des résumés compilés comme première passe lorsque cela est possible
- les identifiants de revendication peuvent faire référence à la page propriétaire
- les revendications contestées/périmées/fraîches influencent le classement
- les étiquettes de provenance peuvent se retrouver dans les résultats
- le mode de recherche peut biaiser le classement pour la recherche de personnes, le routage des questions, les preuves sources ou les revendications brutes

Règle pratique :

- utilisez `memory_search corpus=all` pour une passe de rappel large unique
- utilisez `wiki_search` + `wiki_get` lorsque vous vous souciez du classement spécifique au wiki, de la provenance ou de la structure des croyances au niveau de la page

Modes de recherche :

- `auto` : valeur par défaut équilibrée
- `find-person` : favoriser les entités de type personne, les alias, les pseudos, les réseaux sociaux et les identifiants canoniques
- `route-question` : favoriser les cartes d'agent, les indices de demande, les indices d'utilisation optimale et le contexte relationnel
- `source-evidence` : favoriser les pages sources et les métadonnées de preuves structurées
- `raw-claim` : favoriser les revendications structurées correspondantes et renvoyer les métadonnées de revendication/preuve dans les résultats

Lorsqu'un résultat correspond à une revendication structurée, `wiki_search` peut renvoyer `matchedClaimId`, `matchedClaimStatus`, `matchedClaimConfidence`, `evidenceKinds` et `evidenceSourceIds` dans ses détails. La sortie textuelle inclut également des lignes compactes `Claim:` et `Evidence:` lorsque disponibles.

## Outils d'agent

Le plugin enregistre ces outils :

- `wiki_status`
- `wiki_search`
- `wiki_get`
- `wiki_apply`
- `wiki_lint`

Ce qu'ils font :

- `wiki_status`CLI : mode de coffre actuel, santé, disponibilité du CLI Obsidian
- `wiki_search` : rechercher des pages wiki et, si configuré, des corpus de mémoire partagés ; accepte `mode` pour la recherche de personnes, le routage des questions, les preuves sources ou l'exploration de revendications brutes
- `wiki_get` : lire une page wiki par id/chemin ou revenir au corpus de mémoire partagé
- `wiki_apply` : mutations de synthèse/métadonnées étroites sans chirurgie de page libre
- `wiki_lint` : vérifications structurelles, lacunes de provenance, contradictions, questions ouvertes

Le plugin enregistre également un supplément de corpus de mémoire non exclusif, afin que le `memory_search` et le `memory_get` partagés puissent accéder au wiki lorsque le plugin de mémoire active prend en charge la sélection de corpus.

## Comportement du prompt et du contexte

Lorsque `context.includeCompiledDigestPrompt` est activé, les sections de prompt de mémoire ajoutent un instantané compilé compact provenant de `agent-digest.json`.

Cet instantané est intentionnellement petit et à fort signal :

- uniquement les pages principales
- uniquement les revendications principales
- nombre de contradictions
- nombre de questions
- qualificateurs de confiance/fraîcheur

C'est une option d'adhésion car elle modifie la forme du prompt et est principalement utile pour les moteurs de contexte ou l'assemblage de legs de prompts qui consomment explicitement des suppléments de mémoire.

## Configuration

Placez la configuration sous `plugins.entries.memory-wiki.config` :

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

Bascules clés :

- `vaultMode` : `isolated` , `bridge` , `unsafe-local`
- `vault.renderMode` : `native` ou `obsidian`
- `bridge.readMemoryArtifacts` : importer les artefacts publics du plugin de mémoire active
- `bridge.followMemoryEvents` : inclure les journaux d'événements en mode pont
- `search.backend` : `shared` ou `local`
- `search.corpus` : `wiki` , `memory` , ou `all`
- `context.includeCompiledDigestPrompt` : ajouter un instantané de digest compact aux sections de prompt de mémoire
- `render.createBacklinks` : générer des blocs connexes déterministes
- `render.createDashboards` : générer des pages de tableau de bord

### Exemple : QMD + mode pont

Utilisez ceci lorsque vous souhaitez QMD pour la rappel et `memory-wiki` pour une
couche de connaissances maintenue :

```json5
{
  memory: {
    backend: "qmd",
  },
  plugins: {
    entries: {
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

Cela permet de garder :

- QMD en charge du rappel de la mémoire active
- `memory-wiki` concentré sur les pages compilées et les tableaux de bord
- la forme du prompt inchangée jusqu'à ce que vous activiez intentionnellement les prompts de digest compilés

## CLI

`memory-wiki`CLI expose également une interface CLI de premier niveau :

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

Voir [CLI : wiki](CLI/en/cli/wiki) pour la référence complète des commandes.

## Prise en charge d'Obsidian

Lorsque `vault.renderMode` est `obsidian`, le plugin écrit du Markdown compatible avec Obsidian
et peut optionnellement utiliser le CLI officiel `obsidian`CLI.

Les flux de travail pris en charge incluent :

- sondage de statut
- recherche dans le coffre
- ouverture d'une page
- invocation d'une commande Obsidian
- saut vers la note quotidienne

Ceci est optionnel. Le wiki fonctionne toujours en mode natif sans Obsidian.

## Flux de travail recommandé

1. Conservez votre plugin de mémoire active pour le rappel/la promotion/le rêve.
2. Activez `memory-wiki`.
3. Commencez par le mode `isolated` sauf si vous voulez explicitement le mode pont.
4. Utilisez `wiki_search` / `wiki_get` lorsque la provenance compte.
5. Utilisez `wiki_apply` pour des synthèses ciblées ou des mises à jour de métadonnées.
6. Exécutez `wiki_lint` après des modifications importantes.
7. Activez les tableaux de bord si vous voulez voir les éléments obsolètes/contradictoires.

## Documentation connexe

- [Aperçu de la mémoire](/fr/concepts/memory)
- [CLI : mémoire](CLI/en/cli/memory)
- [CLI : wiki](CLI/en/cli/wiki)
- [Aperçu du SDK de plugins](/fr/plugins/sdk-overview)
