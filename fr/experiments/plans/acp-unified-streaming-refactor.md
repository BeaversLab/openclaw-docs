---
summary: "Saint Graal du plan de refactorisation pour un pipeline de flux d'exécution unifié entre main, subagent et ACP"
owner: "onutc"
status: "brouillon"
last_updated: "2026-02-25"
title: "Plan de refactorisation du flux d'exécution unifié"
---

# Plan de refactorisation du flux d'exécution unifié

## Objectif

Fournir un pipeline de flux partagé pour `main`, `subagent` et `acp` afin que tous les runtimes obtiennent un comportement identique en matière de fusion, de découpage, de ordre de livraison et de reprise après incident.

## Pourquoi cela existe

- Le comportement actuel est divisé en plusieurs chemins de mise en forme spécifiques au runtime.
- Les bugs de formatage/fusion peuvent être corrigés sur un chemin mais persister sur d'autres.
- La cohérence de la livraison, la suppression des doublons et la sémantique de reprise sont plus difficiles à analyser.

## Architecture cible

Pipeline unique, adaptateurs spécifiques au runtime :

1. Les adaptateurs de runtime émettent uniquement des événements canoniques.
2. L'assembleur de flux partagé fusionne et finalise les événements de texte/tool/status.
3. Le projecteur de channel partagé applique le découpage/formatage spécifique au channel une seule fois.
4. Le registre de livraison partagé applique la sémantique d'envoi/rélecture idempotente.
5. L'adaptateur de channel sortant exécute les envois et enregistre les points de contrôle de livraison.

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

- Définir un schéma d'événement strict + validation dans le cœur.
- Ajouter des tests de contrat d'adaptateur pour garantir que chaque runtime émet des événements compatibles.
- Rejeter tôt les événements de runtime malformés et afficher des diagnostics structurés.

### 2) Processeur de flux partagé

- Remplacer la logique de fusion/projecteur spécifique au runtime par un seul processeur.
- Le processeur gère la mise en tampon des deltas de texte, le vidage en inactivité, le découpage des blocs max et le vidage à la fin.
- Déplacer la résolution de configuration ACP/main/subagent dans un seul assistant pour éviter toute dérive.

### 3) Projection de channel partagée

- Garder les adaptateurs de channel simples : accepter les blocs finalisés et envoyer.
- Déplacer les particularités de découpage spécifiques à Discord vers le projecteur de channel uniquement.
- Garder le pipeline indépendant du channel avant la projection.

### 4) Livraison du registre + relecture

- Ajouter des ID de livraison par tour par morceau.
- Enregistrer les points de contrôle avant et après l'envoi physique.
- Au redémarrage, relire les morceaux en attente de manière idempotente et éviter les doublons.

### 5) Migration et basculement

- Phase 1 : mode shadow (le nouveau pipeline calcule la sortie mais l'ancien chemin envoie ; comparer).
- Phase 2 : basculement runtime par runtime (`acp`, puis `subagent`, puis `main` ou inverse par risque).
- Phase 3 : supprimer le code de diffusion spécifique à l'ancien runtime.

## Non-objectifs

- Aucune modification du model de stratégie/autorisations ACP dans cette refactorisation.
- Aucune expansion de fonctionnalités spécifiques au channel en dehors des corrections de compatibilité de projection.
- Aucune reconception du transport/backend (le contrat du plugin acpx reste tel quel sauf si nécessaire pour la parité des événements).

## Risques et atténuations

- Risque : régressions comportementales dans les chemins main/subagent existants.
  Atténuation : comparaison en mode shadow + tests de contrat d'adaptateur + tests e2e de channel.
- Risque : envois en double lors de la récupération après crash.
  Atténuation : ID de livraison durables + relecture idempotente dans l'adaptateur de livraison.
- Risque : les adaptateurs runtime divergent à nouveau.
  Atténuation : suite de tests de contrat partagé obligatoire pour tous les adaptateurs.

## Critères d'acceptation

- Tous les runtimes passent les tests de contrat de diffusion partagés.
- Discord ACP/main/subagent produisent un comportement d'espacement/découpage équivalent pour les petits deltas.
- La relecture après crash/redémarrage n'envoie aucun morceau en double pour le même ID de livraison.
- Le chemin de projection/fusion ACP hérité est supprimé.
- La résolution de la configuration de diffusion est partagée et indépendante du runtime.

import en from "/components/footer/en.mdx";

<en />
