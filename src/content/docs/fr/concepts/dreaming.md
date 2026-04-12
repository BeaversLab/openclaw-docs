---
title: "Dreaming (expérimental)"
summary: "Consolidation de la mémoire en arrière-plan avec des phases légère, profonde et REM ainsi qu'un journal de rêve"
read_when:
  - You want memory promotion to run automatically
  - You want to understand what each dreaming phase does
  - You want to tune consolidation without polluting MEMORY.md
---

# Dreaming (expérimental)

Dreaming est le système de consolidation de la mémoire en arrière-plan dans `memory-core`.
Il aide OpenClaw à transférer des signaux à court terme forts vers une mémoire durable tout en
gardant le processus explicite et vérifiable.

Dreaming est **opt-in** (optionnel) et désactivé par défaut.

## Ce que Dreaming écrit

Dreaming conserve deux types de sortie :

- **État de la machine** dans `memory/.dreams/` (magasin de rappel, signaux de phase, points de contrôle d'ingestion, verrous).
- **Sortie lisible par l'homme** dans `DREAMS.md` (ou le `dreams.md` existant) et des fichiers de rapport de phase optionnels sous `memory/dreaming/<phase>/YYYY-MM-DD.md`.

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

- Lit l'état de rappel à court terme, les fichiers de mémoire quotidienne récents et les transcriptions de session expurgées lorsque disponibles.
- Écrit un bloc `## Light Sleep` géré lorsque le stockage inclut une sortie en ligne.
- Enregistre les signaux de renforcement pour un classement profond ultérieur.
- N'écrit jamais dans `MEMORY.md`.

### Phase Deep

La phase Deep décide de ce qui devient mémoire à long terme.

- Classe les candidats en utilisant une notation pondérée et des portes de seuil.
- Nécessite que `minScore`, `minRecallCount` et `minUniqueQueries` soient réussis.
- Réhydrate les extraits des fichiers quotidiens en direct avant l'écriture, de sorte que les extraits obsolètes/supprimés sont ignorés.
- Ajoute les entrées promues à `MEMORY.md`.
- Écrit un résumé `## Deep Sleep` dans `DREAMS.md` et écrit optionnellement `memory/dreaming/deep/YYYY-MM-DD.md`.

### Phase REM

La phase REM extrait des motifs et des signaux de réflexion.

- Construit des résumés de thèmes et de réflexions à partir des traces récentes à court terme.
- Écrit un bloc `## REM Sleep` géré lorsque le stockage inclut une sortie en ligne.
- Enregistre les signaux de renforcement REM utilisés pour le classement profond.
- N'écrit jamais dans `MEMORY.md`.

## Ingestion des transcriptions de session

Dreaming peut ingérer des transcriptions de session expurgées dans le corpus de rêve. Lorsque des transcriptions sont disponibles, elles sont introduites dans la phase légère en même temps que les signaux de mémoire quotidienne et les traces de rappel. Le contenu personnel et sensible est expurgé avant l'ingestion.

## Journal de rêve

Dreaming tient également un **Journal de rêve** narratif dans `DREAMS.md`.
Une fois que chaque phase a suffisamment de matériel, `memory-core` lance un tour de sous-agent en arrière-plan au mieux de ses capacités (en utilisant le modèle d'exécution par défaut) et ajoute une courte entrée de journal.

Ce journal est destiné à la lecture humaine dans l'interface Dreams, et non comme source de promotion.

Il existe également une voie de rétroremplissage historique ancrée pour le travail de révision et de récupération :

- `memory rem-harness --path ... --grounded` prévisualise la sortie du journal ancrée à partir des notes historiques `YYYY-MM-DD.md`.
- `memory rem-backfill --path ...` écrit des entrées de journal ancrées réversibles dans `DREAMS.md`.
- `memory rem-backfill --path ... --stage-short-term` met en scène des candidats durables ancrés dans le même magasin de preuves à court terme que la phase profonde normale utilise déjà.
- `memory rem-backfill --rollback` et `--rollback-short-term` suppriment ces artefacts de rétroremplissage mis en scène sans toucher aux entrées de journal ordinaires ni au rappel à court terme en direct.

L'interface utilisateur Control expose le même flux de rétroremplissage/réinitialisation du journal afin que vous puissiez inspecter les résultats dans la scène Dreams avant de décider si les candidats ancrés méritent une promotion. La scène affiche également une voie ancrée distincte afin que vous puissiez voir quelles entrées à court terme mises en scène proviennent de la réexécution historique, quels éléments promus étaient dirigés par l'ancrage, et effacer uniquement les entrées mises en scène ancrées sans toucher à l'état à court terme ordinaire en direct.

## Signaux de classement profond

Le classement profond utilise six signaux de base pondérés plus le renforcement de phase :

| Signal                 | Poids | Description                                                   |
| ---------------------- | ----- | ------------------------------------------------------------- |
| Fréquence              | 0,24  | Combien de signaux à court terme l'entrée a accumulés         |
| Pertinence             | 0,30  | Qualité moyenne de récupération pour l'entrée                 |
| Diversité des requêtes | 0,15  | Contextes de requête/jour distincts qui l'ont fait apparaître |
| Récence                | 0,15  | Score de fraîcheur déclinant avec le temps                    |
| Consolidation          | 0,10  | Force de récurrence sur plusieurs jours                       |
| Richesse conceptuelle  | 0,06  | Densité des balises de concept à partir de l'extrait/chemin   |

Les correspondances des phases légère et REM ajoutent un petit boost dégressif en fonction de la récence à partir de `memory/.dreams/phase-signals.json`.

## Planification

Lorsqu'il est activé, `memory-core` gère automatiquement une tâche cron pour un cycle complet de rêve. Chaque cycle exécute les phases dans l'ordre : légère -> REM -> profonde.

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

Activer le rêve avec une cadence de cycle personnalisée :

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

Utilisez la promotion CLI pour un aperçu ou une application manuelle :

```bash
openclaw memory promote
openclaw memory promote --apply
openclaw memory promote --limit 5
openclaw memory status --deep
```

Le `memory promote` manuel utilise les seuils de phase profonde par défaut sauf s'ils sont remplacés par des indicateurs CLI.

Expliquer pourquoi un candidat spécifique serait ou ne serait pas promu :

```bash
openclaw memory promote-explain "router vlan"
openclaw memory promote-explain "router vlan" --json
```

Aperçu des réflexions REM, des vérités candidates et de la sortie de promotion profonde sans rien écrire :

```bash
openclaw memory rem-harness
openclaw memory rem-harness --json
```

## Paramètres clés par défaut

Tous les paramètres se trouvent sous `plugins.entries.memory-core.config.dreaming`.

| Clé         | Par défaut  |
| ----------- | ----------- |
| `enabled`   | `false`     |
| `frequency` | `0 3 * * *` |

La politique de phase, les seuils et le comportement de stockage sont des détails de mise en œuvre internes (pas une configuration utilisateur).

Voir [Référence de configuration de la mémoire](/en/reference/memory-config#dreaming-experimental)
pour la liste complète des clés.

## Interface utilisateur des rêves

Lorsqu'il est activé, l'onglet **Dreams** du Gateway affiche :

- l'état actif du rêve
- le statut au niveau de la phase et la présence du cycle géré
- les comptes à court terme, ancrés, de signaux et promus aujourd'hui
- le timing de la prochaine exécution planifiée
- une voie Scene ancrée distincte pour les entrées de rediffusion historique mises en scène
- un lecteur de journal de rêve extensible soutenu par `doctor.memory.dreamDiary`

## Connexes

- [Mémoire](/en/concepts/memory)
- [Recherche de mémoire](/en/concepts/memory-search)
- [memory CLI](/en/cli/memory)
- [Référence de configuration de la mémoire](/en/reference/memory-config)
