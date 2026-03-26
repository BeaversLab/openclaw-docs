---
title: "Détection de boucle d'outils"
summary: "Comment activer et régler les garde-fous qui détectent les boucles d'appels d'outils répétitifs"
read_when:
  - A user reports agents getting stuck repeating tool calls
  - You need to tune repetitive-call protection
  - You are editing agent tool/runtime policies
---

# Détection des boucles d'outils

OpenClaw peut empêcher les agents de rester bloqués dans des modèles d'appels d'outils répétitifs.
Ce garde-fou est **désactivé par défaut**.

Activez-le uniquement là où c'est nécessaire, car il peut bloquer des appels répétitifs légitimes avec des paramètres stricts.

## Pourquoi cela existe

- Détecter les séquences répétitives qui ne progressent pas.
- Détecter les boucles sans résultat à haute fréquence (même outil, mêmes entrées, erreurs répétées).
- Détecter des modèles d'appels répétitifs spécifiques pour les outils de sondage connus.

## Bloc de configuration

Valeurs par défaut globales :

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

- `enabled` : Interrupteur principal. `false` signifie qu'aucune détection de boucle n'est effectuée.
- `historySize` : nombre d'appels d'outils récents conservés pour l'analyse.
- `warningThreshold` : seuil avant de classer un modèle comme avertissement uniquement.
- `criticalThreshold` : seuil pour bloquer les modèles de boucles répétitives.
- `globalCircuitBreakerThreshold` : seuil global du coupe-circuit sans progression.
- `detectors.genericRepeat` : détecte les modèles répétés de même outil + mêmes paramètres.
- `detectors.knownPollNoProgress` : détecte les modèles de type sondage connus sans changement d'état.
- `detectors.pingPong` : détecte les modèles alternatifs de type ping-pong.

## Configuration recommandée

- Commencez avec `enabled: true`, valeurs par défaut inchangées.
- Gardez les seuils ordonnés comme `warningThreshold < criticalThreshold < globalCircuitBreakerThreshold`.
- En cas de faux positifs :
  - augmentez `warningThreshold` et/ou `criticalThreshold`
  - (facultativement) augmentez `globalCircuitBreakerThreshold`
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

import fr from "/components/footer/fr.mdx";

<fr />
