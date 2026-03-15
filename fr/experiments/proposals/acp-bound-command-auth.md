---
summary: "Proposition : modèle d'autorisation des commandes à long terme pour les conversations liées à l'ACP"
read_when:
  - Designing native command auth behavior in Telegram/Discord ACP-bound channels/topics
title: "Autorisation des commandes liées à l'ACP (Proposition)"
---

# Autorisation des commandes liées à l'ACP (Proposition)

Statut : Proposé, **pas encore implémenté**.

Ce document décrit un modèle d'autorisation à long terme pour les commandes natives dans
les conversations liées à l'ACP. C'est une proposition d'expérimentation et ne remplace pas
le comportement actuel en production.

Pour le comportement implémenté, consultez la source et les tests dans :

- `src/telegram/bot-native-commands.ts`
- `src/discord/monitor/native-command.ts`
- `src/auto-reply/reply/commands-core.ts`

## Problème

Aujourd'hui, nous avons des vérifications spécifiques aux commandes (par exemple `/new` et `/reset`) qui
doivent fonctionner dans les salons/sujets liés à l'ACP même lorsque les listes blanches sont vides.
Cela résout des problèmes d'UX immédiats, mais les exceptions basées sur les noms de commandes ne passent pas à l'échelle.

## Forme à long terme

Déplacer l'autorisation des commandes de la logique ad hoc du gestionnaire vers les métadonnées de commande et un
évaluateur de stratégie partagé.

### 1) Ajouter des métadonnées de stratégie d'auth aux définitions de commandes

Chaque définition de commande doit déclarer une stratégie d'auth. Exemple de forme :

```ts
type CommandAuthPolicy =
  | { mode: "owner_or_allowlist" } // default, current strict behavior
  | { mode: "bound_acp_or_owner_or_allowlist" } // allow in explicitly bound ACP conversations
  | { mode: "owner_only" };
```

`/new` et `/reset` utiliseraient `bound_acp_or_owner_or_allowlist`.
La plupart des autres commandes resteraient `owner_or_allowlist`.

### 2) Partager un évaluateur entre les canaux

Introduire une fonction d'aide qui évalue l'auth de commande en utilisant :

- les métadonnées de stratégie de commande
- l'état d'autorisation de l'expéditeur
- l'état de liaison résolu de la conversation

Les gestionnaires natifs de Telegram et Discord doivent tous deux appeler la même fonction d'aide pour éviter
une dérive du comportement.

### 3) Utiliser binding-match comme limite de contournement

Lorsque la stratégie autorise le contournement de l'ACP liée, n'autoriser que si une correspondance de liaison
configurée a été résolue pour la conversation actuelle (et pas seulement parce que la clé de
session actuelle ressemble à une ACP).

Cela garde la limite explicite et minimise l'élargissement accidentel.

## Pourquoi c'est mieux

- S'adapte aux futures commandes sans ajouter plus de conditionnels sur le nom de la commande.
- Garde le comportement cohérent sur les channels.
- Préserve le modèle de sécurité actuel en exigeant une correspondance de liaison explicite.
- Fait des listes blanches un durcissement optionnel plutôt qu'une exigence universelle.

## Plan de déploiement (futur)

1. Ajouter le champ de stratégie d'autorisation de commande aux types de registre de commandes et aux données de commande.
2. Implémenter un évaluateur partagé et migrer les gestionnaires natifs Telegram + Discord.
3. Déplacer `/new` et `/reset` vers une stratégie basée sur les métadonnées.
4. Ajouter des tests pour chaque mode de stratégie et surface de channel.

## Hors de portée

- Cette proposition ne modifie pas le comportement du cycle de vie de la session ACP.
- Cette proposition n'exige pas de listes blanches pour toutes les commandes liées à l'ACP.
- Cette proposition ne modifie pas la sémantique de liaison de route existante.

## Remarque

Cette proposition est intentionnellement additive et ne supprime ni ne remplace les documents d'expériences existants.

import fr from '/components/footer/fr.mdx';

<fr />
