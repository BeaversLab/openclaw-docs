---
summary: "Référence CLI pour `openclaw memory` (status/index/search/promote)"
read_when:
  - You want to index or search semantic memory
  - You’re debugging memory availability or indexing
  - You want to promote recalled short-term memory into `MEMORY.md`
title: "memory"
---

# `openclaw memory`

Gérer l'indexation et la recherche de la mémoire sémantique.
Fourni par le plugin de mémoire actif (par défaut : `memory-core` ; définir `plugins.slots.memory = "none"` pour désactiver).

Connexes :

- Concept de mémoire : [Mémoire](/en/concepts/memory)
- Plugins : [Plugins](/en/tools/plugin)

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

- `--deep` : sonder la disponibilité des vecteurs et des intégrations.
- `--index` : exécuter une réindexation si le magasin est sale (implique `--deep`).
- `--fix` : réparer les verrous de rappel obsolètes et normaliser les métadonnées de promotion.
- `--json` : afficher la sortie JSON.

`memory index` :

- `--force` : forcer une réindexation complète.

`memory search` :

- Entrée de requête : passer soit un `[query]` positionnel soit un `--query <text>`.
- Si les deux sont fournis, `--query` l'emporte.
- Si aucun n'est fourni, la commande se termine avec une erreur.
- `--agent <id>` : limiter à un seul agent (par défaut : l'agent par défaut).
- `--max-results <n>` : limiter le nombre de résultats renvoyés.
- `--min-score <n>` : filtrer les correspondances à faible score.
- `--json` : afficher les résultats JSON.

`memory promote` :

Prévisualiser et appliquer les promotions de la mémoire à court terme.

```bash
openclaw memory promote [--apply] [--limit <n>] [--include-promoted]
```

- `--apply` -- écrire les promotions dans `MEMORY.md` (par défaut : prévisualisation uniquement).
- `--limit <n>` -- plafonner le nombre de candidats affichés.
- `--include-promoted` -- inclure les entrées déjà promues lors des cycles précédents.

Options complètes :

- Classe les candidats à court terme de `memory/YYYY-MM-DD.md` à l'aide de signaux de promotion pondérés (`frequency`, `relevance`, `query diversity`, `recency`, `consolidation`, `conceptual richness`).
- Utilise des signaux à court terme provenant à la fois des rappels de mémoire et des passes d'ingestion quotidienne, ainsi que des signaux de renforcement des phases légères et REM.
- Lorsque le rêve est activé, `memory-core` gère automatiquement une tâche cron qui exécute un balayage complet (`light -> REM -> deep`) en arrière-plan (aucun `openclaw cron add` manuel requis).
- `--agent <id>` : limiter à un seul agent (par défaut : l'agent par défaut).
- `--limit <n>` : nombre maximum de candidats à renvoyer/appliquer.
- `--min-score <n>` : score de promotion pondéré minimum.
- `--min-recall-count <n>` : nombre minimum de rappels requis pour un candidat.
- `--min-unique-queries <n>` : nombre minimum de requêtes distinctes requis pour un candidat.
- `--apply` : ajouter les candidats sélectionnés dans `MEMORY.md` et les marquer comme promus.
- `--include-promoted` : inclure les candidats déjà promus dans la sortie.
- `--json` : afficher la sortie JSON.

## Rêve (expérimental)

Le rêve est le système de consolidation de la mémoire en arrière-plan avec trois phases coopératives : **light** (trier/mettre en scène le matériel à court terme), **deep** (promouvoir les faits durables dans `MEMORY.md`) et **REM** (réfléchir et faire surface aux thèmes).

- Activer avec `plugins.entries.memory-core.config.dreaming.enabled: true`.
- Basculer depuis le chat avec `/dreaming on|off` (ou inspecter avec `/dreaming status`).
- Le rêve fonctionne sur un calendrier de balayage géré (`dreaming.frequency`) et exécute les phases dans l'ordre : light, REM, deep.
- Seule la phase deep écrit une mémoire durable dans `MEMORY.md`.
- Les sorties de phase lisibles par l'homme et les entrées de journal sont écrites dans `DREAMS.md` (ou `dreams.md` existant), avec des rapports par phase facultatifs dans `memory/dreaming/<phase>/YYYY-MM-DD.md`.
- Le classement utilise des signaux pondérés : fréquence de rappel, pertinence de la récupération, diversité des requêtes, récence temporelle, consolidation inter-jours et richesse des concepts dérivés.
- La promotion relit la note quotidienne en direct avant d'écrire dans `MEMORY.md`, de sorte que les extraits à court terme modifiés ou supprimés ne sont pas promus à partir d'instantanés obsolètes du magasin de rappel.
- Les exécutions planifiées et manuelles de `memory promote` partagent les mêmes valeurs par défaut de phase profonde, sauf si vous passez des substituants de seuil CLI.
- Les exécutions automatiques s'étendent sur les espaces de travail de mémoire configurés.

Planification par défaut :

- **Cadence de balayage** : `dreaming.frequency = 0 3 * * *`
- **Seuils profonds** : `minScore=0.8`, `minRecallCount=3`, `minUniqueQueries=3`, `recencyHalfLifeDays=14`, `maxAgeDays=30`

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

- `memory index --verbose` imprime les détails par phase (provider, model, sources, activité de lot).
- `memory status` inclut tous les chemins supplémentaires configurés via `memorySearch.extraPaths`.
- Si les champs de clé API distante de la mémoire active effective sont configurés en tant que SecretRefs, la commande résout ces valeurs à partir de l'instantané de la passerelle active. Si la passerelle n'est pas disponible, la commande échoue rapidement.
- Note sur le décalage de version de la Gateway : ce chemin de commande nécessite une passerelle qui prend en charge `secrets.resolve` ; les anciennes passerelles renvoient une erreur de méthode inconnue.
- Ajustez la cadence de balayage planifiée avec `dreaming.frequency`. La politique de promotion profonde est par ailleurs interne ; utilisez les indicateurs CLI sur `memory promote` lorsque vous avez besoin de substituants manuels ponctuels.
- Voir [Dreaming](/en/concepts/dreaming) pour les descriptions complètes des phases et la référence de configuration.
