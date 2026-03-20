---
summary: "Architecture de liaison de session agnostique aux canaux et périmètre de livraison de l'itération 1"
read_when:
  - Refactorisation du routage de session et des liaisons agnostiques aux canaux
  - Enquête sur les livraisons de session en double, obsolètes ou manquantes sur les canaux
owner: "onutc"
status: "in-progress"
last_updated: "2026-02-21"
title: "Plan de liaison de session agnostique aux canaux"
---

# Plan de liaison de session agnostique aux canaux

## Vue d'ensemble

Ce document définit le modèle de liaison de session agnostique aux canaux à long terme ainsi que le périmètre concret pour la prochaine itération de mise en œuvre.

Objectif :

- faire du routage de session lié aux sous-agents une fonctionnalité centrale
- garder le comportement spécifique aux canaux dans les adaptateurs
- éviter les régressions dans le comportement normal Discord

## Pourquoi cela existe

Le comportement actuel mélange :

- politique de contenu des complétions
- politique de routage de destination
- détails spécifiques à Discord

Cela a provoqué des cas particuliers tels que :

- livraison en double du fil principal et du fil de discussion lors d'exécutions concurrentes
- utilisation de jetons obsolètes sur les gestionnaires de liaison réutilisés
- absence de comptabilisation de l'activité pour les envois via webhook

## Périmètre de l'itération 1

Cette itération est intentionnellement limitée.

### 1. Ajouter des interfaces centrales agnostiques aux canaux

Ajouter des types centraux et des interfaces de service pour les liaisons et le routage.

Types centraux proposés :

```ts
export type BindingTargetKind = "subagent" | "session";
export type BindingStatus = "active" | "ending" | "ended";

export type ConversationRef = {
  channel: string;
  accountId: string;
  conversationId: string;
  parentConversationId?: string;
};

export type SessionBindingRecord = {
  bindingId: string;
  targetSessionKey: string;
  targetKind: BindingTargetKind;
  conversation: ConversationRef;
  status: BindingStatus;
  boundAt: number;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
};
```

Contrat de service central :

```ts
export interface SessionBindingService {
  bind(input: {
    targetSessionKey: string;
    targetKind: BindingTargetKind;
    conversation: ConversationRef;
    metadata?: Record<string, unknown>;
    ttlMs?: number;
  }): Promise<SessionBindingRecord>;

  listBySession(targetSessionKey: string): SessionBindingRecord[];
  resolveByConversation(ref: ConversationRef): SessionBindingRecord | null;
  touch(bindingId: string, at?: number): void;
  unbind(input: {
    bindingId?: string;
    targetSessionKey?: string;
    reason: string;
  }): Promise<SessionBindingRecord[]>;
}
```

### 2. Ajouter un routeur de livraison central pour les complétions de sous-agents

Ajouter un chemin de résolution de destination unique pour les événements de complétion.

Contrat du routeur :

```ts
export interface BoundDeliveryRouter {
  resolveDestination(input: {
    eventKind: "task_completion";
    targetSessionKey: string;
    requester?: ConversationRef;
    failClosed: boolean;
  }): {
    binding: SessionBindingRecord | null;
    mode: "bound" | "fallback";
    reason: string;
  };
}
```

Pour cette itération :

- seul `task_completion` est acheminé via ce nouveau chemin
- les chemins existants pour les autres types d'événements restent inchangés

### 3. Conserver Discord en tant qu'adaptateur

Discord reste la première implémentation de l'adaptateur.

Responsabilités de l'adaptateur :

- créer/réutiliser des conversations de fil
- envoyer des messages liés via webhook ou envoi sur le channel
- valider l'état du fil (archivé/supprimé)
- mapper les métadonnées de l'adaptateur (identité du webhook, identifiants de fil)

### 4. Corriger les problèmes de correctitude actuellement connus

Requis dans cette itération :

- rafraîchir l'utilisation du jeton lors de la réutilisation d'un gestionnaire de liaison de fil existant
- enregistrer l'activité sortante pour les envois Discord basés sur des webhooks
- arrêter le repli implicite sur le channel principal lorsqu'une destination de fil liée est sélectionnée pour la complétion en mode session

### 5. Conserver les valeurs de sécurité actuelles de l'exécution

Aucun changement de comportement pour les utilisateurs ayant désactivé le spawn de fil lié.

Les valeurs par défaut restent :

- `channels.discord.threadBindings.spawnSubagentSessions = false`

Résultat :

- les utilisateurs normaux Discord conservent le comportement actuel
- le nouveau chemin central n'affecte que le routage des complétions de session liées lorsqu'il est activé

## Non inclus dans l'itération 1

Explicitement différé :

- cibles de liaison ACP (`targetKind: "acp"`)
- nouveaux adaptateurs de canal au-delà de Discord
- remplacement global de tous les chemins de livraison (`spawn_ack`, futur `subagent_message`)
- modifications au niveau du protocole
- refonte de la migration/versionnement du magasin pour toute la persistance des liaisons

Notes sur l'ACP :

- la conception de l'interface laisse de la place pour l'ACP
- l'implémentation de l'ACP n'est pas commencée dans cette itération

## Invariants de routage

Ces invariants sont obligatoires pour l'itération 1.

- la sélection de la destination et la génération de contenu sont des étapes distinctes
- si la complétion en mode session résout vers une destination liée active, la livraison doit cibler cette destination
- aucun reroutage caché de la destination liée vers le canal principal
- le comportement de repli doit être explicite et observable

## Compatibilité et déploiement

Objectif de compatibilité :

- pas de régression pour les utilisateurs avec la création de fil lié désactivée
- aucun changement pour les canaux non Discord dans cette itération

Déploiement :

1. Intégrer les interfaces et le routeur derrière les portes de fonctionnalités actuelles.
2. Acheminer les livraisons liées en mode complétion Discord via le routeur.
3. Conserver l'ancien chemin pour les flux non liés.
4. Vérifier avec des tests ciblés et les journaux d'exécution canary.

## Tests requis dans l'itération 1

Couverture unitaire et d'intégration requise :

- la rotation des jetons du gestionnaire utilise le dernier jeton après réutilisation du gestionnaire
- le webhook envoie la mise à jour des horodatages d'activité du canal
- deux sessions liées actives dans le même canal demandeur ne dupliquent pas vers le canal principal
- la complétion pour l'exécution en mode session liée résout uniquement vers la destination du fil
- le drapeau de création désactivé conserve le comportement hérité inchangé

## Fichiers d'implémentation proposés

Cœur :

- `src/infra/outbound/session-binding-service.ts` (nouveau)
- `src/infra/outbound/bound-delivery-router.ts` (nouveau)
- `src/agents/subagent-announce.ts` (intégration de résolution de destination de complétion)

adaptateur et runtime Discord :

- `src/discord/monitor/thread-bindings.manager.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/send.outbound.ts`

Tests :

- `src/discord/monitor/provider*.test.ts`
- `src/discord/monitor/reply-delivery.test.ts`
- `src/agents/subagent-announce.format.test.ts`

## Critères de terminaison pour l'itération 1

- les interfaces centrales existent et sont câblées pour le routage des complétions
- les corrections de correction ci-dessus sont fusionnées avec les tests
- pas de livraison de achèvement en double du thread et principal dans les exécutions liées en mode session
- aucun changement de comportement pour les déploiements de spawn liés désactivés
- ACP reste explicitement différé

import fr from "/components/footer/fr.mdx";

<fr />
