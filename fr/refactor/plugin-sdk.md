---
summary: "Plan : un SDK de plugin propre + un runtime pour tous les connecteurs de messagerie"
read_when:
  - Définition ou refactorisation de l'architecture des plugins
  - Migration des connecteurs de channel vers le SDK/runtime des plugins
title: "Refactorisation du SDK de plugin"
---

# Plan de refactorisation du SDK + Runtime des plugins

Objectif : chaque connecteur de messagerie est un plugin (regroupé ou externe) utilisant une seule API stable.
Aucune importation de plugin depuis `src/**` directement. Toutes les dépendances passent par le SDK ou le runtime.

## Pourquoi maintenant

- Les connecteurs actuels mélangent des modèles : importations directes du cœur, ponts dist-only et assistants personnalisés.
- Cela rend les mises à niveau fragiles et bloque une surface externe de plugin propre.

## Architecture cible (deux couches)

### 1) SDK de plugin (à la compilation, stable, publiable)

Portée : types, assistants et utilitaires de configuration. Aucun état d'exécution, aucun effet secondaire.

Contenu (exemples) :

- Types : `ChannelPlugin`, adaptateurs, `ChannelMeta`, `ChannelCapabilities`, `ChannelDirectoryEntry`.
- Assistants de configuration : `buildChannelConfigSchema`, `setAccountEnabledInConfigSection`, `deleteAccountFromConfigSection`,
  `applyAccountNameToChannelSection`.
- Assistants d'appairage : `PAIRING_APPROVED_MESSAGE`, `formatPairingApproveHint`.
- Points d'entrée de configuration : `setup` + `setupWizard` appartenant à l'hôte ; éviter les assistants d'onboarding publics larges.
- Assistants de paramètres d'outil : `createActionGate`, `readStringParam`, `readNumberParam`, `readReactionParams`, `jsonResult`.
- Assistant de lien vers la documentation : `formatDocsLink`.

Livraison :

- Publier en tant que `openclaw/plugin-sdk` (ou exporter depuis le cœur sous `openclaw/plugin-sdk`).
- Semver avec des garanties de stabilité explicites.

### 2) Runtime de plugin (surface d'exécution, injecté)

Portée : tout ce qui touche au comportement d'exécution du cœur.
Accessible via `OpenClawPluginApi.runtime` afin que les plugins n'importent jamais `src/**`.

Surface proposée (minimale mais complète) :

```ts
export type PluginRuntime = {
  channel: {
    text: {
      chunkMarkdownText(text: string, limit: number): string[];
      resolveTextChunkLimit(cfg: OpenClawConfig, channel: string, accountId?: string): number;
      hasControlCommand(text: string, cfg: OpenClawConfig): boolean;
    };
    reply: {
      dispatchReplyWithBufferedBlockDispatcher(params: {
        ctx: unknown;
        cfg: unknown;
        dispatcherOptions: {
          deliver: (payload: {
            text?: string;
            mediaUrls?: string[];
            mediaUrl?: string;
          }) => void | Promise<void>;
          onError?: (err: unknown, info: { kind: string }) => void;
        };
      }): Promise<void>;
      createReplyDispatcherWithTyping?: unknown; // adapter for Teams-style flows
    };
    routing: {
      resolveAgentRoute(params: {
        cfg: unknown;
        channel: string;
        accountId: string;
        peer: { kind: RoutePeerKind; id: string };
      }): { sessionKey: string; accountId: string };
    };
    pairing: {
      buildPairingReply(params: { channel: string; idLine: string; code: string }): string;
      readAllowFromStore(channel: string): Promise<string[]>;
      upsertPairingRequest(params: {
        channel: string;
        id: string;
        meta?: { name?: string };
      }): Promise<{ code: string; created: boolean }>;
    };
    media: {
      fetchRemoteMedia(params: { url: string }): Promise<{ buffer: Buffer; contentType?: string }>;
      saveMediaBuffer(
        buffer: Uint8Array,
        contentType: string | undefined,
        direction: "inbound" | "outbound",
        maxBytes: number,
      ): Promise<{ path: string; contentType?: string }>;
    };
    mentions: {
      buildMentionRegexes(cfg: OpenClawConfig, agentId?: string): RegExp[];
      matchesMentionPatterns(text: string, regexes: RegExp[]): boolean;
    };
    groups: {
      resolveGroupPolicy(
        cfg: OpenClawConfig,
        channel: string,
        accountId: string,
        groupId: string,
      ): {
        allowlistEnabled: boolean;
        allowed: boolean;
        groupConfig?: unknown;
        defaultConfig?: unknown;
      };
      resolveRequireMention(
        cfg: OpenClawConfig,
        channel: string,
        accountId: string,
        groupId: string,
        override?: boolean,
      ): boolean;
    };
    debounce: {
      createInboundDebouncer<T>(opts: {
        debounceMs: number;
        buildKey: (v: T) => string | null;
        shouldDebounce: (v: T) => boolean;
        onFlush: (entries: T[]) => Promise<void>;
        onError?: (err: unknown) => void;
      }): { push: (v: T) => void; flush: () => Promise<void> };
      resolveInboundDebounceMs(cfg: OpenClawConfig, channel: string): number;
    };
    commands: {
      resolveCommandAuthorizedFromAuthorizers(params: {
        useAccessGroups: boolean;
        authorizers: Array<{ configured: boolean; allowed: boolean }>;
      }): boolean;
    };
  };
  logging: {
    shouldLogVerbose(): boolean;
    getChildLogger(name: string): PluginLogger;
  };
  state: {
    resolveStateDir(cfg: OpenClawConfig): string;
  };
};
```

Notes :

- Le runtime est le seul moyen d'accéder au comportement du cœur.
- Le SDK est intentionnellement petit et stable.
- Chaque méthode de runtime correspond à une implémentation existante du cœur (sans duplication).

## Plan de migration (par phases, sans danger)

### Phase 0 : échafaudage

- Introduire `openclaw/plugin-sdk`.
- Ajouter `api.runtime` à `OpenClawPluginApi` avec la surface ci-dessus.
- Maintenir les imports existants pendant une fenêtre de transition (avertissements de dépréciation).

### Phase 1 : nettoyage du pont (faible risque)

- Remplacer le `core-bridge.ts` par extension par `api.runtime`.
- Migrer BlueBubbles, Zalo et Zalo Personal en premier (déjà proches).
- Supprimer le code de pont dupliqué.

### Phase 2 : plugins légers en import direct

- Migrer Matrix vers SDK + runtime.
- Valider la logique d'intégration, de répertoire et de mention de groupe.

### Phase 3 : plugins lourds en import direct

- Migrer MS Teams (le plus grand ensemble de helpers d'exécution).
- Assurer que les sémantiques de réponse/frappe correspondent au comportement actuel.

### Phase 4 : transformation en plugin de iMessage

- Déplacer iMessage vers `extensions/imessage`.
- Remplacer les appels directs au noyau par `api.runtime`.
- Conserver les clés de configuration, le comportement CLI et la documentation intacts.

### Phase 5 : application

- Ajouter une règle de linting / vérification CI : pas d'imports `extensions/**` depuis `src/**`.
- Ajouter des vérifications de compatibilité du plugin SDK/version (runtime + SDK semver).

## Compatibilité et versionnage

- SDK : semver, publié, changements documentés.
- Runtime : versionné par release du noyau. Ajouter `api.runtime.version`.
- Les plugins déclarent une plage de runtime requise (ex. `openclawRuntime: ">=2026.2.0"`).

## Stratégie de test

- Tests unitaires au niveau de l'adaptateur (fonctions runtime exercées avec l'implémentation réelle du noyau).
- Tests dorés par plugin : s'assurer qu'il n'y a aucune dérive de comportement (routage, appairage, liste d'autorisation, filtrage de mentions).
- Un seul exemple de plugin de bout en bout utilisé dans la CI (install + run + smoke).

## Questions ouvertes

- Où héberger les types du SDK : package séparé ou export du noyau ?
- Distribution des types de runtime : dans le SDK (types uniquement) ou dans le noyau ?
- Comment exposer les liens de documentation pour les plugins intégrés vs externes ?
- Autorisons-nous des imports directs limités du noyau pour les plugins dans le dépôt pendant la transition ?

## Critères de succès

- Tous les connecteurs de canaux sont des plugins utilisant le SDK + runtime.
- Aucun import `extensions/**` depuis `src/**`.
- Les nouveaux modèles de connecteurs dépendent uniquement du SDK + runtime.
- Les plugins externes peuvent être développés et mis à jour sans accès au code source du noyau.

Documentation connexe : [Plugins](/fr/tools/plugin), [Channels](/fr/channels/index), [Configuration](/fr/gateway/configuration).

## Couches appartenant au canal implémentées

Les travaux de refactorisation récents ont élargi le contrat du plugin de canal afin que le cœur puisse cesser de posséder l'UX et le comportement de routage spécifiques au canal :

- `messaging.buildCrossContextComponents` : marqueurs d'interface utilisateur inter-contextes appartenant au canal
  (par exemple, conteneurs de composants v2 Discord)
- `messaging.enableInteractiveReplies` : commutateurs de normalisation des réponses appartenant au canal
  (par exemple, réponses interactives Slack)
- `messaging.resolveOutboundSessionRoute` : routage de session sortant appartenant au canal
- `status.formatCapabilitiesProbe` / `status.buildCapabilitiesDiagnostics` : affichage de sonde `/channels capabilities` et audits/scopes supplémentaires appartenant au canal
- `threading.resolveAutoThreadId` : auto-threading intra-conversation appartenant au canal
- `threading.resolveReplyTransport` : mappage de livraison réponse-vers-thread appartenant au canal
- `actions.requiresTrustedRequesterSender` : portails de confiance pour les actions privilégiées appartenant au canal
- `execApprovals.*` : état de la surface d'approbation d'exécution appartenant au canal, suppression du transfert,
  UX de la charge utile en attente et hooks de pré-livraison
- `lifecycle.onAccountConfigChanged` / `lifecycle.onAccountRemoved` : nettoyage appartenant au canal lors
  de la mutation/suppression de la configuration
- `allowlist.supportsScope` : publicité de la portée de la liste d'autorisation (allowlist) appartenant au canal

Ces hooks doivent être préférés aux nouvelles branches `channel === "discord"` / `telegram`
  dans les flux principaux partagés.

import en from "/components/footer/en.mdx";

<en />
