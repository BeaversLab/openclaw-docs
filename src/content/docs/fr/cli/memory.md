---
summary: "Référence CLI pour `openclaw memory` (status/index/search/promote/promote-explain/rem-harness)"
read_when:
  - You want to index or search semantic memory
  - You're debugging memory availability or indexing
  - You want to promote recalled short-term memory into `MEMORY.md`
title: "Mémoire"
---

# `openclaw memory`

Gérer l'indexation et la recherche de la mémoire sémantique.
Fourni par le plugin intégré `memory-core`. La commande est disponible lorsque
`plugins.slots.memory` sélectionne `memory-core` (la valeur par défaut) ; d'autres plugins de mémoire
exposent leurs propres espaces de noms CLI.

Connexes :

- Concept de mémoire : [Memory](/fr/concepts/memory)
- Wiki mémoire : [Memory Wiki](/fr/plugins/memory-wiki)
- Wiki CLI : [wiki](/fr/cli/wiki)
- Plugins : [Plugins](/fr/tools/plugin)

## Exemples

```bash
openclaw memory status
openclaw memory status --deep
openclaw memory status --fix
openclaw memory index --force
openclaw memory search "meeting notes"
openclaw memory search --query "deployment" --max-results 20
openclaw memory promote --limit 10 --min-score 0.75
openclaw memory promote --apply
openclaw memory promote --json --min-recall-count 0 --min-unique-queries 0
openclaw memory promote-explain "router vlan"
openclaw memory promote-explain "router vlan" --json
openclaw memory rem-harness
openclaw memory rem-harness --json
openclaw memory status --json
openclaw memory status --deep --index
openclaw memory status --deep --index --verbose
openclaw memory status --agent main
openclaw memory index --agent main --verbose
```

## Options

`memory status` et `memory index` :

- `--agent <id>` : limiter à un seul agent. Sans cela, ces commandes s'exécutent pour chaque agent configuré ; si aucune liste d'agents n'est configurée, elles reviennent à l'agent par défaut.
- `--verbose` : émettre des journaux détaillés pendant les sondages et l'indexation.

`memory status` :

- `--deep` : vérifier la disponibilité du magasin de vecteurs local, la disponibilité du provider d'embeddings et la disponibilité de la recherche sémantique de vecteurs. `memory status` simple reste rapide et n'exécute pas de travail d'embedding en direct ou de découverte de provider ; un état inconnu du magasin de vecteurs ou du vecteur sémantique signifie qu'il n'a pas été sondé dans cette commande. La recherche lexicale QMD `searchMode: "search"` ignore les sondages de vecteurs sémantiques et la maintenance des embeddings même avec `--deep`.
- `--index` : exécuter une réindexation si le magasin est sale (implique `--deep`).
- `--fix` : réparer les verrous de rappel obsolètes et normaliser les métadonnées de promotion.
- `--json` : afficher la sortie JSON.

Si `memory status` affiche `Dreaming status: blocked`, la tâche cron de rêve gérée est activée mais le battement de cœur qui la pilote ne se déclenche pas pour l'agent par défaut. Consultez [Dreaming never runs](/fr/concepts/dreaming#dreaming-never-runs-status-shows-blocked) pour connaître les deux causes courantes.

`memory index` :

- `--force` : forcer une réindexation complète.

`memory search` :

- Entrée de requête : passer soit `[query]` positionnel soit `--query <text>`.
- Si les deux sont fournis, `--query` prévaut.
- Si aucun n'est fourni, la commande se termine avec une erreur.
- `--agent <id>` : limiter à un seul agent (par défaut : l'agent par défaut).
- `--max-results <n>` : limiter le nombre de résultats renvoyés.
- `--min-score <n>` : filtrer les correspondances à faible score.
- `--json` : afficher les résultats au format JSON.

`memory promote` :

Prévisualiser et appliquer les promotions de mémoire à court terme.

```bash
openclaw memory promote [--apply] [--limit <n>] [--include-promoted]
```

- `--apply` -- écrire les promotions dans `MEMORY.md` (par défaut : aperçu uniquement).
- `--limit <n>` -- plafonner le nombre de candidats affichés.
- `--include-promoted` -- inclure les entrées déjà promues lors des cycles précédents.

Options complètes :

- Classe les candidats à court terme de `memory/YYYY-MM-DD.md` en utilisant des signaux de promotion pondérés (`frequency`, `relevance`, `query diversity`, `recency`, `consolidation`, `conceptual richness`).
- Utilise des signaux à court terme provenant à la fois des rappels de mémoire et des passes d'ingestion quotidienne, ainsi que des signaux de renforcement des phases légères/REM.
- Lorsque le rêve est activé, `memory-core` gère automatiquement une tâche cron qui exécute un balayage complet (`light -> REM -> deep`) en arrière-plan (aucune intervention manuelle `openclaw cron add` requise).
- `--agent <id>` : limiter à un seul agent (par défaut : l'agent par défaut).
- `--limit <n>` : nombre maximum de candidats à renvoyer/appliquer.
- `--min-score <n>` : score de promotion pondéré minimum.
- `--min-recall-count <n>` : nombre minimum de rappels requis pour un candidat.
- `--min-unique-queries <n>` : nombre minimum de requêtes distinctes requis pour un candidat.
- `--apply` : ajouter les candidats sélectionnés dans `MEMORY.md` et les marquer comme promus.
- `--include-promoted` : inclure les candidats déjà promus dans la sortie.
- `--json` : afficher la sortie JSON.

`memory promote-explain` :

Expliquer un candidat à la promotion spécifique et la décomposition de son score.

```bash
openclaw memory promote-explain <selector> [--agent <id>] [--include-promoted] [--json]
```

- `<selector>` : clé de candidat, fragment de chemin ou fragment d'extrait à rechercher.
- `--agent <id>` : limiter à un seul agent (par défaut : l'agent par défaut).
- `--include-promoted` : inclure les candidats déjà promus.
- `--json` : afficher la sortie JSON.

`memory rem-harness` :

Aperçu des réflexions REM, des vérités candidates et de la sortie de promotion profonde sans rien écrire.

```bash
openclaw memory rem-harness [--agent <id>] [--include-promoted] [--json]
```

- `--agent <id>` : limiter à un seul agent (par défaut : l'agent par défaut).
- `--include-promoted` : inclure les candidats profonds déjà promus.
- `--json` : afficher la sortie JSON.

## Rêve

Le rêve est le système de consolidation de la mémoire en arrière-plan avec trois phases coopératives : **light** (trier/mettre en scène le matériel à court terme), **deep** (promouvoir des faits durables dans `MEMORY.md`), et **REM** (réfléchir et faire émerger des thèmes).

- Activer avec `plugins.entries.memory-core.config.dreaming.enabled: true`.
- Basculer depuis le chat avec `/dreaming on|off` (ou inspecter avec `/dreaming status`).
- Le rêve s'exécute selon un calendrier de balayage géré (`dreaming.frequency`) et exécute les phases dans l'ordre : light, REM, deep.
- Seule la phase deep écrit une mémoire durable dans `MEMORY.md`.
- Les sorties de phase lisibles par l'homme et les entrées de journal sont écrites dans `DREAMS.md` (ou `dreams.md` existant), avec des rapports optionnels par phase dans `memory/dreaming/<phase>/YYYY-MM-DD.md`.
- Le classement utilise des signaux pondérés : fréquence de rappel, pertinence de la récupération, diversité des requêtes, récence temporelle, consolidation inter-jour et richesse des concepts dérivés.
- La promotion relit la note quotidienne en direct avant d'écrire dans `MEMORY.md`, donc les extraits à court terme modifiés ou supprimés ne sont pas promus à partir d'instantanés obsolètes du recall-store.
- Les exécutions planifiées et manuelles de `memory promote` partagent les mêmes valeurs par défaut de phase deep, sauf si vous transmettez des substitutions de seuil CLI.
- Les exécutions automatiques se répartissent sur les espaces de travail mémoire configurés.

Planification par défaut :

- **Cadence de balayage** : `dreaming.frequency = 0 3 * * *`
- **Seuils deep** : `minScore=0.8`, `minRecallCount=3`, `minUniqueQueries=3`, `recencyHalfLifeDays=14`, `maxAgeDays=30`

Exemple :

```json
{
  "plugins": {
    "entries": {
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": true
          }
        }
      }
    }
  }
}
```

Notes :

- `memory index --verbose` imprime les détails par phase (provider, model, sources, activité par lot).
- `memory status` inclut tous les chemins supplémentaires configurés via `memorySearch.extraPaths`.
- Si les champs de clé d'API distante de la mémoire effectivement active sont configurés en tant que SecretRefs, la commande résout ces valeurs à partir de l'instantané de la passerelle active. Si la passerelle n'est pas disponible, la commande échoue rapidement.
- Remarque sur le désynchronisation de la version de la Gateway : ce chemin de commande nécessite une passerelle qui prend en charge `secrets.resolve` ; les passerelles plus anciennes renvoient une erreur de méthode inconnue.
- Ajustez la cadence du balayage planifié avec `dreaming.frequency`. La stratégie de promotion approfondie est par ailleurs interne, à l'exception de `dreaming.phases.deep.maxPromotedSnippetTokens`, qui limite la longueur des extraits promus tout en gardant la provenance visible. Utilisez les drapeaux CLI sur `memory promote` lorsque vous avez besoin de substitutions manuelles de seuil ponctuelles.
- `memory rem-harness --path <file-or-dir> --grounded` prévisualise les `What Happened`, `Reflections` et `Possible Lasting Updates` ancrés à partir des notes quotidiennes historiques sans rien écrire.
- `memory rem-backfill --path <file-or-dir>` écrit des entrées de journal ancrées réversibles dans `DREAMS.md` pour examen via l'interface utilisateur.
- `memory rem-backfill --path <file-or-dir> --stage-short-term` ensemence également des candidats durables ancrés dans le magasin de promotion à court terme en direct afin que la phase profonde normale puisse les classer.
- `memory rem-backfill --rollback` supprime les entrées de journal ancrées précédemment écrites, et `memory rem-backfill --rollback-short-term` supprime les candidats à court terme ancrés précédemment mis en scène.
- Consultez [Dreaming](/fr/concepts/dreaming) pour obtenir les descriptions complètes des phases et la référence de configuration.

## Connexes

- [Référence CLI](/fr/cli)
- [Aperçu de la mémoire](/fr/concepts/memory)
