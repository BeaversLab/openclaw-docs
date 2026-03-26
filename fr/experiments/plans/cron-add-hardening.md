---
summary: "Renforcer la gestion des entrées de cron.add, aligner les schémas et améliorer l'outil cron UI/agent"
owner: "openclaw"
status: "complete"
last_updated: "2026-01-05"
title: "Renforcement de l'ajout de cron"
---

# Renforcement de l'ajout de Cron et alignement des schémas

## Contexte

Les journaux de la passerelle récents montrent des échecs répétés `cron.add` avec des paramètres non valides (`sessionTarget` manquants, `wakeMode`, `payload` et `schedule` malformés). Cela indique qu'au moins un client (probablement le chemin d'appel d'outil de l'agent) envoie des charges utiles de tâche enveloppées ou partiellement spécifiées. Par ailleurs, il existe une divergence entre les énumérations de providers cron dans TypeScript, le schéma de la passerelle, les indicateurs CLI et les types de formulaires de l'interface utilisateur, ainsi qu'une inadéquation de l'interface utilisateur pour `cron.status` (attend `jobCount` alors que la passerelle renvoie `jobs`).

## Objectifs

- Arrêter le spam `cron.add` INVALID_REQUEST en normalisant les charges utiles enveloppées courantes et en déduisant les champs `kind` manquants.
- Aligner les listes de providers cron sur le schéma de la passerelle, les types cron, la documentation CLI et les formulaires de l'interface utilisateur.
- Rendre le schéma de l'outil cron de l'agent explicite afin que le LLM produise des charges utiles de tâche correctes.
- Corriger l'affichage du nombre de tâches de statut cron dans l'interface utilisateur de contrôle.
- Ajouter des tests pour couvrir la normalisation et le comportement de l'outil.

## Non-objectifs

- Modifier la sémantique de planification cron ou le comportement d'exécution des tâches.
- Ajouter de nouveaux types de planification ou l'analyse d'expressions cron.
- Refondre l'interface utilisateur/expérience utilisateur (UI/UX) pour cron au-delà des corrections de champs nécessaires.

## Constatations (lacunes actuelles)

- `CronPayloadSchema` dans la passerelle exclut `signal` + `imessage`, alors que les types TS les incluent.
- CronStatus de l'interface utilisateur de contrôle attend `jobCount`, mais la passerelle renvoie `jobs`.
- Le schéma de l'outil cron de l'agent autorise des objets `job` arbitraires, permettant des entrées malformées.
- La Gateway valide strictement `cron.add` sans normalisation, donc les charges utiles encapsulées échouent.

## Ce qui a changé

- `cron.add` et `cron.update` normalisent désormais les formes d'encapsuleur courantes et infèrent les champs `kind` manquants.
- Le schéma de l'outil cron de l'agent correspond au schéma de la passerelle, ce qui réduit les charges utiles invalides.
- Les énumérations de fournisseurs sont alignées entre la passerelle, la CLI, l'interface utilisateur et le sélecteur macOS.
- L'interface utilisateur de contrôle utilise le champ de comptage `jobs` de la passerelle pour le statut.

## Comportement actuel

- **Normalisation :** les charges utiles encapsulées `data`/`job` sont désencapsulées ; `schedule.kind` et `payload.kind` sont inférés lorsque cela est sûr.
- **Valeurs par défaut :** des valeurs par défaut sûres sont appliquées pour `wakeMode` et `sessionTarget` lorsqu'elles sont manquantes.
- **Fournisseurs :** Discord/Slack/Signal/iMessage sont désormais affichés de manière cohérente sur la CLI/l'interface utilisateur.

Voir [Tâches cron](/fr/automation/cron-jobs) pour la forme normalisée et les exemples.

## Vérification

- Surveillez les journaux de la passerelle pour une réduction des erreurs `cron.add` INVALID_REQUEST.
- Confirmez que le statut cron de l'interface utilisateur de contrôle affiche le nombre de tâches après actualisation.

## Suites optionnelles

- Test de fumée manuel de l'interface utilisateur de contrôle : ajouter une tâche cron par fournisseur + vérifier le nombre de tâches de statut.

## Questions ouvertes

- `cron.add` doit-il accepter `state` explicite de la part des clients (actuellement interdit par le schéma) ?
- Devons-nous autoriser `webchat` comme fournisseur de livraison explicite (actuellement filtré lors de la résolution de livraison) ?

import fr from "/components/footer/fr.mdx";

<fr />
