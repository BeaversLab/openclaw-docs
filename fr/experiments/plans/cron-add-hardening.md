---
summary: "Renforcer la gestion des entrées de cron.add, aligner les schémas et améliorer l'interface cron/les outils de l'agent"
owner: "openclaw"
status: "complete"
last_updated: "2026-01-05"
title: "Renforcement de l'ajout Cron"
---

# Renforcement de l'ajout Cron et alignement des schémas

## Contexte

Les journaux récents de la Gateway montrent des échecs répétés `cron.add` avec des paramètres non valides (manquant `sessionTarget`, `wakeMode`, `payload`, et `schedule` malformé). Cela indique qu'au moins un client (probablement le chemin d'appel d'outil de l'agent) envoie des charges utiles de travail encapsulées ou partiellement spécifiées. Par ailleurs, il existe une divergence entre les enums du fournisseur cron dans TypeScript, le schéma de la Gateway, les indicateurs du CLI et les types de formulaires de l'interface utilisateur, ainsi qu'une inadéquation de l'interface utilisateur pour `cron.status` (attend `jobCount` alors que la Gateway renvoie `jobs`).

## Objectifs

- Arrêter le spam `cron.add` INVALID_REQUEST en normalisant les charges utiles d'encapsuleur courantes et en déduisant les champs `kind` manquants.
- Aligner les listes de fournisseurs cron sur le schéma de la Gateway, les types cron, la documentation du CLI et les formulaires de l'interface utilisateur.
- Rendre le schéma de l'outil cron de l'agent explicite afin que le LLM produise les charges utiles de travail correctes.
- Corriger l'affichage du nombre de travaux de statut cron de l'interface utilisateur Control.
- Ajouter des tests pour couvrir la normalisation et le comportement de l'outil.

## Non-objectifs

- Modifier la sémantique de planification cron ou le comportement d'exécution des travaux.
- Ajouter de nouveaux types de planification ou l'analyse des expressions cron.
- Refondre l'interface utilisateur/l'expérience utilisateur (UI/UX) pour cron au-delà des corrections de champ nécessaires.

## Constatations (lacunes actuelles)

- `CronPayloadSchema` dans la Gateway exclut `signal` + `imessage`, tandis que les types TS les incluent.
- CronStatus de l'interface utilisateur Control attend `jobCount`, mais la Gateway renvoie `jobs`.
- Le schéma de l'outil cron de l'agent autorise des objets `job` arbitraires, ce qui permet des entrées malformées.
- La Gateway valide strictement `cron.add` sans normalisation, de sorte que les charges utiles encapsulées échouent.

## Ce qui a changé

- `cron.add` et `cron.update` normalisent désormais les formes d'encapsuleur courantes et déduisent les champs `kind` manquants.
- Le schéma de l'outil cron de l'agent correspond au schéma de la passerelle, ce qui réduit les charges utiles non valides.
- Les énumérations de fournisseur sont alignées entre la passerelle, le CLI, l'interface utilisateur et le sélecteur macOS.
- L'interface utilisateur de contrôle utilise le champ de nombre `jobs` de la passerelle pour l'état.

## Comportement actuel

- **Normalisation :** les charges utiles encapsulées `data`/`job` sont désencapsulées ; `schedule.kind` et `payload.kind` sont déduits lorsque c'est sécurisé.
- **Valeurs par défaut :** des valeurs par défaut sécurisées sont appliquées pour `wakeMode` et `sessionTarget` lorsqu'elles sont manquantes.
- **Fournisseurs :** Discord/Slack/Signal/iMessage sont désormais affichés de manière cohérente sur le CLI et l'interface utilisateur.

Voir [Tâches cron](/fr/automation/cron-jobs) pour la forme normalisée et les exemples.

## Vérification

- Surveillez les journaux de la passerelle pour des erreurs `cron.add` INVALID_REQUEST réduites.
- Confirmez que l'état cron de l'interface utilisateur de contrôle affiche le nombre de tâches après actualisation.

## Suivis optionnels

- Test de fumée manuel de l'interface utilisateur de contrôle : ajouter une tâche cron par fournisseur + vérifier le nombre de tâches d'état.

## Questions ouvertes

- `cron.add` doit-il accepter `state` explicite de la part des clients (actuellement non autorisé par le schéma) ?
- Devons-nous autoriser `webchat` comme fournisseur de livraison explicite (actuellement filtré lors de la résolution de livraison) ?

import fr from "/components/footer/fr.mdx";

<fr />
