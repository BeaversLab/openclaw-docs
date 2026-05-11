---
summary: "Comment activer et régler les garde-fous qui détectent les boucles d'appels d'outils répétitifs"
title: "Détection de boucles d'outils"
read_when:
  - A user reports agents getting stuck repeating tool calls
  - You need to tune repetitive-call protection
  - You are editing agent tool/runtime policies
---

OpenClaw peut empêcher les agents de rester bloqués dans des modèles d'appels d'outils répétitifs.
Le garde-fou est **désactivé par défaut**.

Activez-le uniquement là où c'est nécessaire, car il peut bloquer les appels répétitifs légitimes avec des paramètres stricts.

## Pourquoi cela existe

- Détecter les séquences répétitives qui ne progressent pas.
- Détecter les boucles sans résultat à haute fréquence (même outil, mêmes entrées, erreurs répétées).
- Détecter des modèles d'appels répétitifs spécifiques pour les outils de polling connus.

## Bloc de configuration

Paramètres globaux par défaut :

```json5
{
  tools: {
    loopDetection: {
      enabled: false,
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

Remplacement par agent (optionnel) :

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

- `enabled` : Interrupteur principal. `false` signifie qu'aucune détection de boucle n'est effectuée.
- `historySize` : nombre d'appels d'outils récents conservés pour l'analyse.
- `warningThreshold` : seuil avant de classer un modèle comme avertissement uniquement.
- `criticalThreshold` : seuil pour bloquer les modèles de boucles répétitifs.
- `globalCircuitBreakerThreshold` : seuil global de rupture sans progression.
- `detectors.genericRepeat` : détecte les modèles répétés de même outil + mêmes paramètres.
- `detectors.knownPollNoProgress` : détecte les modèles connus de type polling sans changement d'état.
- `detectors.pingPong` : détecte les modèles de ping-pong alternés.

Pour `exec`, les contrôles sans progression comparent les résultats stables des commandes et ignorent les métadonnées d'exécution volatiles telles que la durée, le PID, l'ID de session et le répertoire de travail.
Lorsqu'un identifiant d'exécution (run id) est disponible, l'historique récent des appels d'outils n'est évalué que dans le cadre de cette exécution, afin que les cycles de battement programmés et les nouvelles exécutions n'héritent pas des comptes de boucles obsolètes des exécutions précédentes.

## Configuration recommandée

- Commencez avec `enabled: true`, paramètres par défaut inchangés.
- Gardez les seuils ordonnés comme `warningThreshold < criticalThreshold < globalCircuitBreakerThreshold`.
- En cas de faux positifs :
  - augmentez `warningThreshold` et/ou `criticalThreshold`
  - (optionnel) augmentez `globalCircuitBreakerThreshold`
  - désactivez uniquement le détecteur causant des problèmes
  - réduisez `historySize` pour un contexte historique moins strict

## Journaux et comportement attendu

Lorsqu'une boucle est détectée, OpenClaw signale un événement de boucle et bloque ou atténue le prochain cycle d'outils en fonction de la gravité.
Cela protège les utilisateurs contre les dépenses excessives de jetons et les blocages tout en préservant l'accès normal aux outils.

- Privilégiez d'abord l'avertissement et la suppression temporaire.
- N'escaladez que lorsque des preuves répétées s'accumulent.

## Notes

- `tools.loopDetection` est fusionné avec les remplacements au niveau de l'agent.
- La configuration par agent remplace complètement ou étend les valeurs globales.
- Si aucune configuration n'existe, les garde-fous restent désactivés.

## Connexes

- [Approbations d'exécution](/fr/tools/exec-approvals)
- [Niveaux de réflexion](/fr/tools/thinking)
- [Sous-agents](/fr/tools/subagents)
