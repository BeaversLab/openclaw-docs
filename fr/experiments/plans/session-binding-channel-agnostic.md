---
summary: "Architecture de liaison de session agnostique au canal et portée de livraison de l'itération 1"
read_when:
  - Refactoring channel-agnostic session routing and bindings
  - Investigating duplicate, stale, or missing session delivery across channels
owner: "onutc"
status: "en cours"
last_updated: "2026-02-21"
title: "Plan de liaison de session agnostique au canal"
---

# Plan de liaison de session agnostique au canal

## Vue d'ensemble

Ce document définit le modèle de liaison de session agnostique au canal à long terme et la portée concrète pour la prochaine itération de mise en œuvre.

Objectif :

- faire du routage de session lié aux sous-agents une fonctionnalité de base
- conserver les comportements spécifiques au canal dans les adaptateurs
- éviter les régressions dans le comportement normal de Discord

## Pourquoi cela existe

Le comportement actuel mélange :

- politique de contenu des complétions
- politique de routage de destination
- détails spécifiques à Discord

Cela a entraîné des cas limites tels que :

- livraison en double du fil principal et des fils lors d'exécutions simultanées
- utilisation de jetons obsolètes sur les gestionnaires de liaison réutilisés
- absence de comptabilisation de l'activité pour les envois de webhooks

## Portée de l'itération 1

Cette itération est intentionnellement limitée.

### 1. Ajouter des interfaces de base agnostiques au canal

Ajouter des types de base et des interfaces de service pour les liaisons et le routage.

Types de base proposés :

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

Contrat de service de base :

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

### 2. Ajouter un routeur de livraison de base pour les complétions de sous-agents

Ajouter un chemin unique de résolution de destination pour les événements de complétion.

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
- les chemins existants pour d'autres types d'événements restent inchangés

### 3. Garder Discord comme adaptateur

Discord reste la première mise en œuvre de l'adaptateur.

Responsabilités de l'adaptateur :

- créer/réutiliser des conversations de fil
- envoyer des messages liés via webhook ou envoi de canal
- valider l'état du fil (archivé/supprimé)
- mapper les métadonnées de l'adaptateur (identité du webhook, identifiants de fil)

### 4. Corriger les problèmes de correction actuellement connus

Obligatoire dans cette itération :

- rafraîchir l'utilisation du jeton lors de la réutilisation d'un gestionnaire de liaison de fil existant
- enregistrer l'activité sortante pour les envois Discord basés sur des webhooks
- arrêter le repli implicite vers le channel principal lorsqu'une destination de thread liée est sélectionnée pour la completion en mode session

### 5. Conserver les valeurs de sécurité actuelles de l'exécution

Aucun changement de comportement pour les utilisateurs ayant désactivé le spawn de thread lié.

Les valeurs par défaut restent :

- `channels.discord.threadBindings.spawnSubagentSessions = false`

Résultat :

- les utilisateurs normaux de Discord conservent le comportement actuel
- le nouveau chemin principal n'affecte que le routage de completion de session liée lorsqu'il est activé

## Pas dans l'itération 1

Explicitement différé :

- cibles de liaison ACP (`targetKind: "acp"`)
- nouveaux adaptateurs de channel au-delà de Discord
- remplacement global de tous les chemins de livraison (`spawn_ack`, futur `subagent_message`)
- changements au niveau du protocole
- refonte de la migration/versionnement du magasin pour toute la persistance des liaisons

Notes sur l'ACP :

- la conception de l'interface laisse de la place pour l'ACP
- l'implémentation de l'ACP n'est pas commencée dans cette itération

## Invariants de routage

Ces invariants sont obligatoires pour l'itération 1.

- la sélection de la destination et la génération de contenu sont des étapes distinctes
- si la completion en mode session résout vers une destination liée active, la livraison doit cibler cette destination
- aucun reroutage caché de la destination liée vers le channel principal
- le comportement de repli doit être explicite et observable

## Compatibilité et déploiement

Objectif de compatibilité :

- aucune régression pour les utilisateurs ayant désactivé le spawn de thread lié
- aucun changement pour les channels non-Discord dans cette itération

Déploiement :

1. Intégrer les interfaces et le routeur derrière les portes de fonctionnalités actuelles.
2. Acheminer les livraisons liées en mode completion Discord via le routeur.
3. Conserver l'ancien chemin pour les flux non liés.
4. Vérifier avec des tests ciblés et les journaux d'exécution canary.

## Tests requis dans l'itération 1

Couverture unitaire et d'intégration requise :

- la rotation des jetons du gestionnaire utilise le dernier jeton après réutilisation du gestionnaire
- les envois de webhooks mettent à jour les horodatages d'activité du channel
- deux sessions liées actives dans le même channel demandeur ne sont pas dupliquées vers le channel principal
- la completion pour l'exécution en mode session liée résout uniquement vers la destination du thread
- le drapeau de génération désactivé conserve le comportement hérité inchangé

## Fichiers de mise en œuvre proposés

Cœur :

- `src/infra/outbound/session-binding-service.ts` (nouveau)
- `src/infra/outbound/bound-delivery-router.ts` (nouveau)
- `src/agents/subagent-announce.ts` (intégration de la résolution de destination d'achèvement)

Adaptateur et runtime Discord :

- `src/discord/monitor/thread-bindings.manager.ts`
- `src/discord/monitor/reply-delivery.ts`
- `src/discord/send.outbound.ts`

Tests :

- `src/discord/monitor/provider*.test.ts`
- `src/discord/monitor/reply-delivery.test.ts`
- `src/agents/subagent-announce.format.test.ts`

## Critères de finition pour l'itération 1

- les interfaces de base existent et sont connectées pour le routage des achèvements
- les corrections de correction ci-dessus sont fusionnées avec les tests
- aucune livraison d'achèvement en double sur le thread principal dans les exécutions liées en mode session
- aucun changement de comportement pour les déploiements de génération liée désactivée
- l'ACP reste explicitement différée

import fr from '/components/footer/fr.mdx';

<fr />
