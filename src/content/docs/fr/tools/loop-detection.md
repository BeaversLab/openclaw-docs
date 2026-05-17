---
summary: "Comment activer et régler les garde-fous qui détectent les boucles répétitives d'appels d'outils"
title: "Détection de boucle d'outils"
read_when:
  - A user reports agents getting stuck repeating tool calls
  - You need to tune repetitive-call protection
  - You are editing agent tool/runtime policies
  - You hit `compaction_loop_persisted` aborts after a context-overflow retry
---

OpenClaw dispose de deux garde-fous coopératifs pour les modèles d'appels d'outils répétitifs :

1. **Détection de boucle** (`tools.loopDetection.enabled`) — désactivée par défaut. Surveille l'historique déroulant des appels d'outils pour détecter les modèles répétitifs et les tentatives sur des outils inconnus.
2. **Garde-fou post-compaction** (`tools.loopDetection.postCompactionGuard`) — activé par défaut sauf si `tools.loopDetection.enabled` est explicitement `false`. S'arme après chaque nouvelle tentative de compactage et abandonne l'exécution lorsque l'agent émet le même triplet `(tool, args, result)` dans la fenêtre.

Les deux sont configurés dans le même bloc `tools.loopDetection`, mais le garde-fou post-compaction s'exécute tant que le commutateur principal n'est pas explicitement désactivé. Définissez `tools.loopDetection.enabled: false` pour désactiver les deux surfaces.

## Pourquoi cela existe

- Détecter les séquences répétitives qui ne progressent pas.
- Détecter les boucles sans résultat à haute fréquence (même outil, mêmes entrées, erreurs répétées).
- Détecter des modèles d'appels répétés spécifiques pour les outils de sondage connus.
- Empêcher les cycles de débordement de contexte suivis d'une compactage puis de la même boucle de s'exécuter indéfiniment.

## Bloc de configuration

Valeurs globales par défaut, avec chaque champ documenté affiché :

```json5
{
  tools: {
    loopDetection: {
      enabled: false, // master switch for the rolling-history detectors
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      unknownToolThreshold: 10,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
      postCompactionGuard: {
        windowSize: 3, // armed after compaction-retry; runs unless enabled is explicitly false
      },
    },
  },
}
```

Remplacement par agent (facultatif) :

```json5
{
  agents: {
    list: [
      {
        id: "safe-runner",
        tools: {
          loopDetection: {
            enabled: true,
            warningThreshold: 8,
            criticalThreshold: 16,
          },
        },
      },
    ],
  },
}
```

### Comportement des champs

| Champ                            | Par défaut | Effet                                                                                                                                              |
| -------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                        | `false`    | Commutateur principal pour les détecteurs d'historique déroulant. Le réglage de `false` désactive également le garde-fou post-compaction.          |
| `historySize`                    | `30`       | Nombre d'appels d'outils récents conservés pour analyse.                                                                                           |
| `warningThreshold`               | `10`       | Seuil avant qu'un modèle ne soit classé comme avertissement uniquement.                                                                            |
| `criticalThreshold`              | `20`       | Seuil pour bloquer les modèles de boucle répétitifs sans progrès.                                                                                  |
| `unknownToolThreshold`           | `10`       | Bloquer les appels répétés au même outil indisponible après ce nombre d'échecs.                                                                    |
| `globalCircuitBreakerThreshold`  | `30`       | Seuil global de rupture sans progrès pour tous les détecteurs.                                                                                     |
| `detectors.genericRepeat`        | `true`     | Avertit en cas de modèles répétés de même tool + mêmes paramètres et bloque lorsque les mêmes appels renvoient également des résultats identiques. |
| `detectors.knownPollNoProgress`  | `true`     | Détecte les modèles de type polling connus sans changement d'état.                                                                                 |
| `detectors.pingPong`             | `true`     | Détecte les modèles alternés de ping-pong.                                                                                                         |
| `postCompactionGuard.windowSize` | `3`        | Nombre d'appels de tool post-compaction pendant lesquels la garde reste armée et le nombre de triplets identiques qui interrompt l'exécution.      |

Pour `exec`, les vérifications d'absence de progrès comparent les résultats stables des commandes et ignorent les métadonnées d'exécution volatiles telles que la durée, le PID, l'ID de session et le répertoire de travail. Lorsqu'un ID d'exécution est disponible, l'historique récent des appels de tool n'est évalué que dans cette exécution, afin que les cycles de heartbeat planifiés et les nouvelles exécutions n'héritent pas de comptes de boucles périmés des exécutions précédentes.

## Configuration recommandée

- Pour les modèles plus petits, définissez `enabled: true` et laissez les seuils à leurs valeurs par défaut. Les modèles phares ont rarement besoin de la détection par historique déroulant et peuvent laisser le commutateur principal sur `false` tout en bénéficiant toujours de la garde post-compaction.
- Gardez les seuils ordonnés comme `warningThreshold < criticalThreshold < globalCircuitBreakerThreshold`.
- En cas de faux positifs :
  - Augmentez `warningThreshold` et/ou `criticalThreshold`.
  - Augmentez facultativement `globalCircuitBreakerThreshold`.
  - Désactivez uniquement le détecteur spécifique posant problème (`detectors.<name>: false`).
  - Réduisez `historySize` pour un contexte historique moins strict.
- Pour tout désactiver (y compris la garde post-compaction), définissez `tools.loopDetection.enabled: false` explicitement.

## Garde post-compaction

Lorsque le lanceur complète une nouvelle tentative de compaction après un dépassement de contexte, il arme une garde à fenêtre courte qui surveille les prochains appels de tool. Si l'agent émet le même triplet `(toolName, argsHash, resultHash)` plusieurs fois dans la fenêtre, la garde conclut que la compaction n'a pas brisé la boucle et interrompt l'exécution avec une erreur `compaction_loop_persisted`.

La garde est contrôlée par le fanion maître `tools.loopDetection.enabled` avec une nuance : elle reste **activée lorsque le fanion est non défini ou `true`** et ne se désactive que lorsque le fanion est explicitement `false`. C'est intentionnel. La garde sert à échapper aux boucles de compactage qui, autrement, consommeraient des tokens illimités, un utilisateur sans configuration bénéficie donc de cette protection.

```json5
{
  tools: {
    loopDetection: {
      // master switch; set false to disable the guard along with the rolling detectors
      enabled: true,
      postCompactionGuard: {
        windowSize: 3, // default
      },
    },
  },
}
```

- Un `windowSize` plus bas est plus strict (moins de tentatives avant l'abandon).
- Un `windowSize` plus élevé donne à l'agent plus de tentatives de récupération.
- La garde n'interrompt jamais l'exécution lorsque les résultats changent, uniquement lorsque les résultats sont identiques octet par octet sur la fenêtre.
- Elle est volontairement étroite : elle ne se déclenche que dans la foulée immédiate d'une nouvelle tentative après compactage.

<Note>La garde post-compaction s'exécute chaque fois que le fanion maître n'est pas explicitement `false`, même si vous n'avez jamais écrit de bloc `tools.loopDetection`. Pour vérifier, recherchez `post-compaction guard armed for N attempts` dans les journaux de la passerelle immédiatement après un événement de compactage.</Note>

## Journaux et comportement attendu

Lorsqu'une boucle est détectée, OpenClaw signale un événement de boucle et atténue ou bloque le prochain cycle d'outil en fonction de la gravité. Cela protège les utilisateurs contre des dépenses de tokens incontrôlées et des blocages tout en préservant l'accès normal aux outils.

- Les avertissements viennent en premier.
- La suppression intervient lorsque les modèles persistent au-delà du seuil d'avertissement.
- Les seuils critiques bloquent le prochain cycle d'outil et affichent une raison claire de détection de boucle dans l'enregistrement d'exécution.
- La garde post-compaction émet des erreurs `compaction_loop_persisted` avec le nom de l'outil en faute et le nombre d'appels identiques.

## Connexes

<CardGroup cols={2}>
  <Card title="Approbations d'exécution" href="/fr/tools/exec-approvals" icon="shield">
    Stratégie d'autorisation/refus pour l'exécution de shell.
  </Card>
  <Card title="Niveaux de réflexion" href="/fr/tools/thinking" icon="brain">
    Niveaux d'effort de raisonnement et interaction avec la stratégie du fournisseur.
  </Card>
  <Card title="Sous-agents" href="/fr/tools/subagents" icon="users">
    Création d'agents isolés pour limiter les comportements incontrôlables.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Schéma complet `tools.loopDetection` et sémantique de fusion.
  </Card>
</CardGroup>
