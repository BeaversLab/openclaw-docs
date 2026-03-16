---
summary: "Plan de refonte du Saint Graal pour un pipeline de flux d'exécution unifié entre main, subagent et ACP"
owner: "onutc"
status: "brouillon"
last_updated: "2026-02-25"
title: "Plan de refonte du flux d'exécution unifié"
---

# Plan de refonte du flux d'exécution unifié

## Objectif

Fournir un pipeline de flux partagé pour `main`, `subagent` et `acp` afin que tous les runtimes obtiennent un comportement identique en matière de fusion, de découpage, de ordre de livraison et de récupération après incident.

## Pourquoi cela existe

- Le comportement actuel est réparti sur plusieurs chemins de mise en forme spécifiques au runtime.
- Les bugs de formatage ou de fusion peuvent être corrigés sur un chemin, mais subsistent sur d'autres.
- La cohérence de livraison, la suppression des doublons et la sémantique de récupération sont plus difficiles à raisonner.

## Architecture cible

Pipeline unique, adaptateurs spécifiques au runtime :

1. Les adaptateurs de runtime émettent uniquement des événements canoniques.
2. L'assembleur de flux partagé fusionne et finalise les événements de texte, d'outil et de statut.
3. Le projeteur de canal partagé applique le découpage/formatage spécifique au canal une seule fois.
4. Le registre de livraison partagé applique la sémantique d'envoi/rélecture idempotente.
5. L'adaptateur de canal sortant exécute les envois et enregistre les points de contrôle de livraison.

Contrat d'événement canonique :

- `turn_started`
- `text_delta`
- `block_final`
- `tool_started`
- `tool_finished`
- `status`
- `turn_completed`
- `turn_failed`
- `turn_cancelled`

## Flux de travail

### 1) Contrat de flux canonique

- Définir un schéma d'événement strict + validation dans le composant principal (core).
- Ajouter des tests de contrat d'adaptateur pour garantir que chaque runtime émet des événements compatibles.
- Rejeter tôt les événements runtime malformés et présenter des diagnostics structurés.

### 2) Processeur de flux partagé

- Remplacer la logique de fusion/projection spécifique au runtime par un processeur unique.
- Le processeur gère la mise en tampon des deltas de texte, le vidage à l'inactivité, le fractionnement max-chunk et le vidage à la fin.
- Déplacer la résolution de configuration ACP/principal/sous-agent dans un seul assistant pour éviter la dérive.

### 3) Projection de canal partagée

- Garder les adaptateurs de canal simples : accepter les blocs finalisés et envoyer.
- Déplacer les particularités de fractionnement spécifiques à Discord uniquement dans le projecteur de canal.
- Garder le pipeline agnostique au canal avant la projection.

### 4) Livre de livraison + relecture

- Ajouter des IDs de livraison par tour et par bloc.
- Enregistrer les points de contrôle avant et après l'envoi physique.
- Au redémarrage, relire les blocs en attente de manière idempotente et éviter les doublons.

### 5) Migration et basculement

- Phase 1 : mode shadow (le nouveau pipeline calcule la sortie mais l'ancien chemin envoie ; comparer).
- Phase 2 : basculement runtime par runtime (`acp`, puis `subagent`, puis `main` ou inverse selon le risque).
- Phase 3 : supprimer le code de streaming spécifique à l'ancien runtime.

## Non-objectifs

- Aucun changement au modèle de stratégie/autorisations ACP dans cette refactorisation.
- Aucune expansion de fonctionnalités spécifiques au canal en dehors des corrections de compatibilité de projection.
- Aucune refonte du transport/backend (le contrat du plugin acpx reste tel quel sauf si nécessaire pour la parité des événements).

## Risques et atténuations

- Risque : régressions comportementales dans les chemins principaux/sous-agents existants.
  Atténuation : comparaison en mode shadow + tests de contrat d'adaptateur + tests e2e de canal.
- Risque : envois en double lors de la récupération après incident.
  Atténuation : IDs de livraison durables + relecture idempotente dans l'adaptateur de livraison.
- Risque : les adaptateurs de runtime divergent à nouveau.
  Atténuation : suite de tests de contrat partagé requise pour tous les adaptateurs.

## Critères d'acceptation

- Tous les runtimes passent les tests de contrat de streaming partagé.
- ACP/principal/sous-agent Discord produisent un comportement d'espacement/fractionnement équivalent pour les petits deltas.
- La relecture après incident/redémarrage n'envoie aucun bloc en double pour le même ID de livraison.
- Le chemin du projecteur/fusionneur ACP hérité est supprimé.
- La résolution de configuration de streaming est partagée et indépendante du runtime.

import fr from "/components/footer/fr.mdx";

<fr />
