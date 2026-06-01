---
summary: "Consolidation de la mémoire en arrière-plan avec les phases légère, profonde et REM, plus un Journal de Rêve"
title: "Dreaming"
sidebarTitle: "Dreaming"
read_when:
  - You want memory promotion to run automatically
  - You want to understand what each dreaming phase does
  - You want to tune consolidation without polluting MEMORY.md
---

Dreaming est le système de consolidation de la mémoire en arrière-plan dans `memory-core`. Il aide OpenClaw à déplacer les signaux à court terme forts vers une mémoire durable tout en gardant le processus explicite et vérifiable.

<Note>Dreaming est **optionnel** et désactivé par défaut.</Note>

## Ce que Dreaming écrit

Dreaming conserve deux types de sortie :

- **État de la machine** dans `memory/.dreams/` (magasin de rappel, signaux de phase, points de contrôle d'ingestion, verrous).
- **Sortie lisible par l'homme** dans `DREAMS.md` (ou `dreams.md` existant) et fichiers de rapport de phase facultatifs sous `memory/dreaming/<phase>/YYYY-MM-DD.md`.

La promotion à long terme écrit encore uniquement dans `MEMORY.md`.

## Modèle de phase

Dreaming utilise trois phases coopératives :

| Phase | Objectif                                                  | Écriture durable  |
| ----- | --------------------------------------------------------- | ----------------- |
| Light | Trier et mettre en scène le matériel à court terme récent | Non               |
| Deep  | Noter et promouvoir les candidats durables                | Oui (`MEMORY.md`) |
| REM   | Réfléchir aux thèmes et aux idées récurrentes             | Non               |

Ces phases sont des détails d'implémentation internes, et non des « modes » distincts configurés par l'utilisateur.

<AccordionGroup>
  <Accordion title="Light phase">
    La phase légère ingère les signaux de mémoire quotidiens récents et les traces de rappel, les déduplique et met en scène les lignes candidates.

    - Lit à partir de l'état de rappel à court terme, des fichiers de mémoire quotidienne récents et des transcriptions de session expurgées si elles sont disponibles.
    - Écrit un bloc `## Light Sleep` géré lorsque le stockage inclut une sortie en ligne.
    - Enregistre les signaux de renforcement pour le classement profond ultérieur.
    - N'écrit jamais dans `MEMORY.md`.

  </Accordion>
  <Accordion title="Deep phase">
    La phase profonde décide de ce qui devient une mémoire à long terme.

    - Classe les candidats en utilisant un score pondéré et des seuils.
    - Nécessite que `minScore`, `minRecallCount` et `minUniqueQueries` soient réussis.
    - Réhydrate les extraits à partir des fichiers quotidiens actifs avant l'écriture, afin que les extraits périmés/supprimés soient ignorés.
    - Ajoute les entrées promues à `MEMORY.md`.
    - Écrit un résumé `## Deep Sleep` dans `DREAMS.md` et écrit facultativement `memory/dreaming/deep/YYYY-MM-DD.md`.

  </Accordion>
  <Accordion title="REM phase">
    La phase REM extrait des modèles et des signaux réflexifs.

    - Construit des résumés de thèmes et de réflexions à partir des traces à court terme récentes.
    - Écrit un bloc `## REM Sleep` géré lorsque le stockage inclut une sortie en ligne.
    - Enregistre les signaux de renforcement REM utilisés par le classement profond.
    - N'écrit jamais dans `MEMORY.md`.

  </Accordion>
</AccordionGroup>

## Ingestion des transcripts de session

Le rêve peut ingérer des transcripts de session expurgés dans le corpus de rêve. Lorsque des transcripts sont disponibles, ils sont introduits dans la phase légère aux côtés des signaux de mémoire quotidienne et des traces de rappel. Le contenu personnel et sensible est expurgé avant l'ingestion.

## Journal de rêve

Le dreaming tient également un **journal de rêve** narratif dans `DREAMS.md`. Une fois que chaque phase dispose de suffisamment de matière, `memory-core` lance au mieux un tour de sous-agent en arrière-plan et ajoute une courte entrée de journal. Il utilise le modèle d'exécution par défaut, sauf si `dreaming.model` est configuré. Si le modèle configuré n'est pas disponible, le journal de rêve réessaie une fois avec le modèle par défaut de la session.

<Note>Ce journal est destiné à être lu par des humains dans l'interface Dreams, et non comme source de promotion. Les artefacts de journal/rapport générés par le dreaming sont exclus de la promotion à court terme. Seuls les extraits de mémoire ancrés (grounded) sont éligibles pour être promus dans `MEMORY.md`.</Note>

Il existe également une voie de remplissage historique fondée pour le travail de révision et de récupération :

<AccordionGroup>
  <Accordion title="Commandes de remplissage (Backfill)">
    - `memory rem-harness --path ... --grounded` prévisualise la sortie du journal ancrée à partir des notes historiques `YYYY-MM-DD.md`.
    - `memory rem-backfill --path ...` écrit des entrées de journal ancrées réversibles dans `DREAMS.md`.
    - `memory rem-backfill --path ... --stage-short-term` met en scène des candidats durables ancrés dans le même magasin de preuves à court terme que la phase profonde normale utilise déjà.
    - `memory rem-backfill --rollback` et `--rollback-short-term` suppriment ces artefacts de remplissage mis en scène sans toucher aux entrées de journal ordinaires ni au rappel à court terme en direct.

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

Les correspondances (hits) des phases Light et REM ajoutent un petit boost déclinant en fonction de la récence à partir de `memory/.dreams/phase-signals.json`.

## Couverture du rapport d'essai parallèle QA

QA Lab comprend un scénario de rapport uniquement pour explorer comment un futur essai parallèle de rêve pourrait examiner une mémoire candidate avant sa promotion. Le scénario demande à un agent de comparer une réponse de base avec une réponse pouvant utiliser la mémoire candidate, puis de rédiger un rapport local avec un verdict, une raison et des indicateurs de risque.

Cette couverture est volontairement limitée à la QA. Elle vérifie que l'artefact de rapport
reste séparé de `MEMORY.md` et que l'agent ne prétend pas que le candidat
a été promu. Elle n'ajoute pas de comportement de production d'essai fantôme (shadow-trial) ni ne modifie le
moteur de promotion de phase profonde.

## Planification

Lorsqu'il est activé, `memory-core` gère automatiquement une tâche cron pour un balayage complet de dreaming. Chaque balayage exécute les phases dans l'ordre : light → REM → deep.

Le balayage inclut l'espace de travail d'exécution principal et tous les espaces de travail d'agents configurés, dédupliqués par chemin, afin que l'éventail (fan-out) des espaces de travail des sous-agents n'exclue pas le `DREAMS.md` et l'état de la mémoire de l'agent principal.

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

## Workflow CLI

<Tabs>
  <Tab title="Promotion preview / apply">
    ```bash
    openclaw memory promote
    openclaw memory promote --apply
    openclaw memory promote --limit 5
    openclaw memory status --deep
    ```

    Le `memory promote` manuel utilise par défaut les seuils de phase profonde, sauf s'ils sont remplacés par des drapeaux CLI.

  </Tab>
  <Tab title="Expliquer la promotion">
    Expliquer pourquoi une candidate spécifique serait ou ne serait pas promue :

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

## Paramètres par défaut clés

Tous les paramètres se trouvent sous `plugins.entries.memory-core.config.dreaming`.

<ParamField path="enabled" type="boolean" default="false">
  Activer ou désactiver le balayage de rêve.
</ParamField>
<ParamField path="frequency" type="string" default="0 3 * * *">
  Cadence Cron pour le balayage complet de rêve.
</ParamField>
<ParamField path="model" type="string">
  Remplacement facultatif du modèle du sous-agent Dream Diary. Utilisez une valeur `provider/model` canonique lors de la définition d'une liste d'autorisation de sous-agent `allowedModels`.
</ParamField>
<ParamField path="phases.deep.maxPromotedSnippetTokens" type="number" default="160">
  Nombre maximum estimé de jetons conservés de chaque extrait de rappel à court terme promu dans `MEMORY.md`. La provenance du classement reste visible.
</ParamField>

<Warning>`dreaming.model` nécessite `plugins.entries.memory-core.subagent.allowModelOverride: true`. Pour le restreindre, définissez également `plugins.entries.memory-core.subagent.allowedModels`. Les échecs de confiance ou de liste d'autorisation restent visibles au lieu de revenir silencieusement ; la nouvelle tentative couvre uniquement les erreurs de modèle indisponible.</Warning>

<Note>La plupart des politiques de phase, des seuils et des comportements de stockage sont des détails d'implémentation internes. Consultez [Référence de configuration de la mémoire](/fr/reference/memory-config#dreaming) pour la liste complète des clés.</Note>

## Interface utilisateur des rêves

Lorsqu'elle est activée, l'onglet **Dreams** du Gateway affiche :

- l'état actuel d'activation du rêve
- le statut au niveau de la phase et la présence du balayage géré
- les comptes à court terme, ancrés, de signaux et promus aujourd'hui
- le calendrier de la prochaine exécution planifiée
- une voie Scene ancrée distincte pour les entrées de relecture historique mises en scène
- un lecteur Dream Diary extensible soutenu par `doctor.memory.dreamDiary`

## Le rêve ne s'exécute jamais : le statut indique bloqué

Si `openclaw memory status` signale `Dreaming status: blocked`, la cron gérée existe mais le heartbeat de l'agent par défaut ne se déclenche pas. Vérifiez que le heartbeat est activé pour l'agent par défaut et que sa cible n'est pas `none`, puis exécutez `openclaw memory status --deep` à nouveau après l'intervalle de heartbeat suivant.

## Connexes

- [Mémoire](/fr/concepts/memory)
- [Mémoire CLI](/fr/cli/memory)
- [Référence de configuration de la mémoire](/fr/reference/memory-config)
- [Recherche de mémoire](/fr/concepts/memory-search)
