---
summary: "Consolidation de la mémoire en arrière-plan avec les phases légère, profonde et REM, plus un Journal de Rêve"
title: "Dreaming"
sidebarTitle: "Dreaming"
read_when:
  - You want memory promotion to run automatically
  - You want to understand what each dreaming phase does
  - You want to tune consolidation without polluting MEMORY.md
---

Dreaming est le système de consolidation de la mémoire en arrière-plan dans `memory-core`. Il aide OpenClaw à transférer des signaux à court terme forts vers une mémoire durable tout en gardant le processus explicable et révisable.

<Note>Dreaming est **optionnel** et désactivé par défaut.</Note>

## Ce que Dreaming écrit

Dreaming conserve deux types de sortie :

- **État de la machine** dans `memory/.dreams/` (magasin de rappel, signaux de phase, points de contrôle d'ingestion, verrous).
- **Sortie lisible par l'homme** dans `DREAMS.md` (ou le `dreams.md` existant) et fichiers de rapport de phase optionnels sous `memory/dreaming/<phase>/YYYY-MM-DD.md`.

La promotion à long terme n'écrit toujours que dans `MEMORY.md`.

## Modèle de phase

Dreaming utilise trois phases coopératives :

| Phase | Objectif                                                  | Écriture durable  |
| ----- | --------------------------------------------------------- | ----------------- |
| Light | Trier et mettre en scène le matériel à court terme récent | Non               |
| Deep  | Noter et promouvoir les candidats durables                | Oui (`MEMORY.md`) |
| REM   | Réfléchir aux thèmes et aux idées récurrentes             | Non               |

Ces phases sont des détails d'implémentation internes, et non des « modes » distincts configurés par l'utilisateur.

<AccordionGroup>
  <Accordion title="Phase légère">
    La phase légère ingère les signaux de mémoire quotidienne récents et les traces de rappel, les déduplique et met en scène les lignes candidates.

    - Lit à partir de l'état de rappel à court terme, des fichiers de mémoire quotidienne récents et des transcriptions de session expurgées si disponibles.
    - Écrit un bloc `## Light Sleep` géré lorsque le stockage inclut une sortie en ligne.
    - Enregistre les signaux de renforcement pour le classement profond ultérieur.
    - N'écrit jamais dans `MEMORY.md`.

  </Accordion>
  <Accordion title="Phase profonde">
    La phase profonde décide de ce qui devient une mémoire à long terme.

    - Classe les candidats en utilisant un score pondéré et des seuils.
    - Nécessite que `minScore`, `minRecallCount` et `minUniqueQueries` soient réussis.
    - Réhydrate les extraits des fichiers quotidiens en direct avant l'écriture, afin que les extraits obsolètes/supprimés soient ignorés.
    - Ajoute les entrées promues à `MEMORY.md`.
    - Écrit un résumé `## Deep Sleep` dans `DREAMS.md` et écrit éventuellement `memory/dreaming/deep/YYYY-MM-DD.md`.

  </Accordion>
  <Accordion title="Phase REM">
    La phase REM extrait des modèles et des signaux réflexifs.

    - Construit des résumés de thèmes et de réflexions à partir des traces à court terme récentes.
    - Écrit un bloc `## REM Sleep` géré lorsque le stockage inclut une sortie en ligne.
    - Enregistre les signaux de renforcement REM utilisés par le classement approfondi.
    - N'écrit jamais dans `MEMORY.md`.

  </Accordion>
</AccordionGroup>

## Ingestion des transcripts de session

Le rêve peut ingérer des transcripts de session expurgés dans le corpus de rêve. Lorsque des transcripts sont disponibles, ils sont introduits dans la phase légère aux côtés des signaux de mémoire quotidienne et des traces de rappel. Le contenu personnel et sensible est expurgé avant l'ingestion.

## Journal de rêve

Le rêve tient également un **journal de rêve** narratif dans `DREAMS.md`. Une fois que chaque phase dispose de suffisamment de matière, `memory-core` exécute un tour de sous-agent en arrière-plan au mieux de ses capacités et ajoute une courte entrée de journal. Il utilise le modèle d'exécution par défaut sauf si `dreaming.model` est configuré.

<Note>Ce journal est destiné à la lecture humaine dans l'interface utilisateur des rêves, et non comme source de promotion. Les artefacts de journal/rapport générés par le rêve sont exclus de la promotion à court terme. Seuls les extraits de mémoire fondés sont éligibles pour être promus dans `MEMORY.md`.</Note>

Il existe également une voie de remplissage historique fondée pour le travail de révision et de récupération :

<AccordionGroup>
  <Accordion title="Commandes de remplissage">
    - `memory rem-harness --path ... --grounded` prévisualise la sortie du journal fondée à partir de notes `YYYY-MM-DD.md` historiques. - `memory rem-backfill --path ...` écrit des entrées de journal fondées réversibles dans `DREAMS.md`. - `memory rem-backfill --path ... --stage-short-term` met en scène des candidats durables fondés dans le même magasin de preuves à court terme que la phase
    profonde normale utilise déjà. - `memory rem-backfill --rollback` et `--rollback-short-term` suppriment ces artefacts de remplissage mis en scène sans toucher aux entrées de journal ordinaires ni au rappel à court terme en direct.
  </Accordion>
</AccordionGroup>

L'interface de contrôle expose le même flux de remplissage/réinitialisation du journal afin que vous puissiez inspecter les résultats dans la scène Dreams avant de décider si les candidats ancrés méritent une promotion. La scène affiche également une voie distincte pour les éléments ancrés, ce qui vous permet de voir quelles entrées à court terme mises en scène proviennent de la relecture historique, quels éléments promus ont été pilotés par l'ancrage, et de effacer uniquement les entrées mises en scène ancrées sans toucher l'état à court terme réel ordinaire.

## Signaux de classement profond

Le classement profond utilise six signaux de base pondérés plus le renforcement par phase :

| Signal                 | Poids | Description                                                   |
| ---------------------- | ----- | ------------------------------------------------------------- |
| Fréquence              | 0.24  | Nombre de signaux à court terme accumulés par l'entrée        |
| Pertinence             | 0.30  | Qualité moyenne de récupération pour l'entrée                 |
| Diversité des requêtes | 0.15  | Contextes de requête/jour distincts qui l'ont fait apparaître |
| Récence                | 0.15  | Score de fraîcheur dégradé dans le temps                      |
| Consolidation          | 0.10  | Force de récurrence multi-jours                               |
| Richesse conceptuelle  | 0.06  | Densité de balises conceptuelles à partir de l'extrait/chemin |

Les résultats des phases légères et REM ajoutent un petit boost dégradé par la récence à partir de `memory/.dreams/phase-signals.json`.

## Planification

Lorsqu'elle est activée, `memory-core` gère automatiquement une tâche cron pour un balayage complet de rêve. Chaque balayage exécute les phases dans l'ordre : léger → REM → profond.

Comportement de cadence par défaut :

| Paramètre            | Par défaut        |
| -------------------- | ----------------- |
| `dreaming.frequency` | `0 3 * * *`       |
| `dreaming.model`     | modèle par défaut |

## Quick start

<Tabs>
  <Tab title="Activer le rêve">
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
  </Tab>
  <Tab title="Cadence de balayage personnalisée">
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
  </Tab>
</Tabs>

## Commande slash

```
/dreaming status
/dreaming on
/dreaming off
/dreaming help
```

## CLI workflow

<Tabs>
  <Tab title="Aperçu / Application de la promotion">
    ```bash
    openclaw memory promote
    openclaw memory promote --apply
    openclaw memory promote --limit 5
    openclaw memory status --deep
    ```

    Le `memory promote` manuel utilise les seuils de phase profonde par défaut, sauf s'ils sont remplacés par des indicateurs CLI.

  </Tab>
  <Tab title="Expliquer la promotion">
    Expliquer pourquoi un candidat spécifique serait ou ne serait pas promu :

    ```bash
    openclaw memory promote-explain "router vlan"
    openclaw memory promote-explain "router vlan" --json
    ```

  </Tab>
  <Tab title="Aperçu du harnais REM">
    Aperçu des réflexions REM, des vérités candidates et de la sortie de promotion profonde sans rien écrire :

    ```bash
    openclaw memory rem-harness
    openclaw memory rem-harness --json
    ```

  </Tab>
</Tabs>

## Valeurs par défaut des clés

Tous les paramètres se trouvent sous `plugins.entries.memory-core.config.dreaming`.

<ParamField path="enabled" type="boolean" default="false">
  Active ou désactive le balayage de rêve.
</ParamField>
<ParamField path="frequency" type="string" default="0 3 * * *">
  Cadence Cron pour le balayage de rêve complet.
</ParamField>
<ParamField path="model" type="string">
  Remplacement facultatif du modèle de sous-agent Dream Diary. Utilisez une valeur `provider/model` canonique lors de la définition d'une liste d'autorisation de sous-agent `allowedModels`.
</ParamField>

<Warning>`dreaming.model` nécessite `plugins.entries.memory-core.subagent.allowModelOverride: true`. Pour le restreindre, définissez également `plugins.entries.memory-core.subagent.allowedModels`.</Warning>

<Note>La stratégie de phase, les seuils et le comportement de stockage sont des détails d'implémentation internes (pas une configuration utilisateur). Voir [Référence de configuration de la mémoire](/fr/reference/memory-config#dreaming) pour la liste complète des clés.</Note>

## Interface Dreams

Lorsqu'il est activé, l'onglet **Dreams** du Gateway affiche :

- état actif du rêve
- statut au niveau de la phase et présence du balayage géré
- comptes à court terme, ancrés, de signaux et promus aujourd'hui
- calendrier de la prochaine exécution programmée
- une voie Scene ancrée distincte pour les entrées de relecture historique mises en scène
- un lecteur de Dream Diary extensible soutenu par `doctor.memory.dreamDiary`

## Connexes

- [Mémoire](/fr/concepts/memory)
- [Mémoire CLI](/fr/cli/memory)
- [Référence de configuration de la mémoire](/fr/reference/memory-config)
- [Recherche de mémoire](/fr/concepts/memory-search)
