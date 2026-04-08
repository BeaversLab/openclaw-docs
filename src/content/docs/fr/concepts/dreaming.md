---
title: "Dreaming (expérimental)"
summary: "Consolidation de la mémoire en arrière-plan avec des phases légères, profondes et REM, plus un journal de rêve"
read_when:
  - You want memory promotion to run automatically
  - You want to understand what each dreaming phase does
  - You want to tune consolidation without polluting MEMORY.md
---

# Dreaming (expérimental)

Dreaming est le système de consolidation de la mémoire en arrière-plan dans `memory-core`.
Il aide OpenClaw à déplacer les signaux à court terme forts vers une mémoire durable tout en
maintenant le processus explicable et révisable.

Dreaming est **opt-in** (optionnel) et désactivé par défaut.

## Ce que Dreaming écrit

Dreaming conserve deux types de sortie :

- **État de la machine** dans `memory/.dreams/` (stockage de rappel, signaux de phase, points de contrôle d'ingestion, verrous).
- **Sortie lisible par l'homme** dans `DREAMS.md` (ou `dreams.md` existant) et des fichiers de rapport de phase facultatifs sous `memory/dreaming/<phase>/YYYY-MM-DD.md`.

La promotion à long terme écrit toujours uniquement dans `MEMORY.md`.

## Modèle de phase

Dreaming utilise trois phases coopératives :

| Phase | Objectif                                                  | Écriture durable  |
| ----- | --------------------------------------------------------- | ----------------- |
| Light | Trier et mettre en scène le matériel à court terme récent | Non               |
| Deep  | Noter et promouvoir les candidats durables                | Oui (`MEMORY.md`) |
| REM   | Réfléchir aux thèmes et aux idées récurrentes             | Non               |

Ces phases sont des détails de mise en œuvre internes, et non des "modes"
configurables séparément par l'utilisateur.

### Phase Light

La phase Light ingère les signaux de mémoire quotidienne récents et les traces de rappel, les déduplique,
et met en scène les lignes candidates.

- Lit à partir de l'état de rappel à court terme et des fichiers de mémoire quotidienne récents.
- Écrit un bloc `## Light Sleep` géré lorsque le stockage inclut une sortie en ligne.
- Enregistre les signaux de renforcement pour un classement profond ultérieur.
- N'écrit jamais dans `MEMORY.md`.

### Phase Deep

La phase Deep décide de ce qui devient mémoire à long terme.

- Classe les candidats en utilisant une notation pondérée et des portes de seuil.
- Nécessite que `minScore`, `minRecallCount` et `minUniqueQueries` soient réussis.
- Réhydrate les extraits des fichiers quotidiens en direct avant l'écriture, de sorte que les extraits obsolètes/supprimés sont ignorés.
- Ajoute les entrées promues à `MEMORY.md`.
- Écrit un résumé `## Deep Sleep` dans `DREAMS.md` et écrit facultativement `memory/dreaming/deep/YYYY-MM-DD.md`.

### Phase REM

La phase REM extrait des motifs et des signaux de réflexion.

- Construit des résumés de thèmes et de réflexions à partir des traces récentes à court terme.
- Écrit un bloc `## REM Sleep` géré lorsque le stockage inclut une sortie en ligne.
- Enregistre les signaux de renforcement REM utilisés pour le classement profond.
- N'écrit jamais dans `MEMORY.md`.

## Journal de rêve

Le rêve tient également un **Journal de rêve** narratif dans `DREAMS.md`.
Une fois que chaque phase a suffisamment de matériel, `memory-core` lance un tour de sous-agent en arrière-plan au mieux (en utilisant le modèle d'exécution par défaut) et ajoute une courte entrée de journal.

Ce journal est destiné à la lecture humaine dans l'interface Dreams, et non comme source de promotion.

## Signaux de classement profond

Le classement profond utilise six signaux de base pondérés plus le renforcement de phase :

| Signal                 | Poids | Description                                                   |
| ---------------------- | ----- | ------------------------------------------------------------- |
| Fréquence              | 0,24  | Combien de signaux à court terme l'entrée a accumulés         |
| Pertinence             | 0,30  | Qualité moyenne de récupération pour l'entrée                 |
| Diversité des requêtes | 0,15  | Contextes de requête/jour distincts qui l'ont fait apparaître |
| Récence                | 0,15  | Score de fraîcheur dégressif dans le temps                    |
| Consolidation          | 0,10  | Force de récurrence sur plusieurs jours                       |
| Richesse conceptuelle  | 0,06  | Densité de balises conceptuelles à partir de l'extrait/chemin |

Les impacts des phases Light et REM ajoutent un petit coup de boost dégressif en fonction de la récence provenant de
`memory/.dreams/phase-signals.json`.

## Planification

Lorsqu'il est activé, `memory-core` gère automatiquement une tâche cron pour un balayage de rêve complet.
Chaque balayage exécute les phases dans l'ordre : light -> REM -> deep.

Comportement de cadence par défaut :

| Paramètre            | Par défaut  |
| -------------------- | ----------- |
| `dreaming.frequency` | `0 3 * * *` |

## Quick start

Activer le rêve :

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

Activer le rêve avec une cadence de balayage personnalisée :

```json
{
  "plugins": {
    "entries": {
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": true,
            "timezone": "America/Los_Angeles",
            "frequency": "0 */6 * * *"
          }
        }
      }
    }
  }
}
```

## Commande slash

```
/dreaming status
/dreaming on
/dreaming off
/dreaming help
```

## CLI workflow

Utilisez la promotion CLI pour l'aperçu ou l'application manuelle :

```bash
openclaw memory promote
openclaw memory promote --apply
openclaw memory promote --limit 5
openclaw memory status --deep
```

Le `memory promote` manuel utilise les seuils de phase profonde par défaut, sauf s'ils sont remplacés
par des drapeaux CLI.

## Paramètres clés par défaut

Tous les paramètres se trouvent sous `plugins.entries.memory-core.config.dreaming`.

| Clé         | Par défaut  |
| ----------- | ----------- |
| `enabled`   | `false`     |
| `frequency` | `0 3 * * *` |

La politique de phase, les seuils et le comportement de stockage sont des détails d'implémentation internes (pas une configuration utilisateur).

Voir [Référence de configuration de la mémoire](/en/reference/memory-config#dreaming-experimental)
pour la liste complète des clés.

## Interface Dreams

Lorsqu'il est activé, l'onglet **Dreams** (Rêves) du Gateway affiche :

- l'état actif actuel du dreaming
- le statut par phase et la présence de managed-sweep
- les comptes à court terme, à long terme et promus aujourd'hui
- le moment de la prochaine exécution planifiée
- un lecteur de Dream Diary extensible pris en charge par `doctor.memory.dreamDiary`

## Connexes

- [Mémoire](/en/concepts/memory)
- [Recherche de mémoire](/en/concepts/memory-search)
- [memory CLI](/en/cli/memory)
- [Référence de configuration de la mémoire](/en/reference/memory-config)
