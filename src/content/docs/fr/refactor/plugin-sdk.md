---
summary: "Plan : un SDK de plugin propre et un runtime pour tous les connecteurs de messagerie"
read_when:
  - Defining or refactoring the plugin architecture
  - Migrating channel connectors to the plugin SDK/runtime
title: "Refonte du SDK de Plugin"
---

# Plan de refonte du SDK de Plugin + Runtime

Objectif : chaque connecteur de messagerie est un plugin (regroupé ou externe) utilisant une API stable.
Aucun plugin n'importe directement depuis `src/**`. Toutes les dépendances passent par le SDK ou le runtime.

## Pourquoi maintenant

- Les connecteurs actuels mélangent les modèles : importations directes du cœur, ponts dist uniquement et assistants personnalisés.
- Cela rend les mises à niveau fragiles et bloque une surface de plugin externe propre.

## Architecture cible (deux couches)

### 1) SDK de Plugin (à la compilation, stable, publiable)

Portée : types, assistants et utilitaires de configuration. Aucun état d'exécution, aucun effet secondaire.

Contenu (exemples) :

- Types : `ChannelPlugin`, adaptateurs, `ChannelMeta`, `ChannelCapabilities`, `ChannelDirectoryEntry`.
- Assistants de configuration : `buildChannelConfigSchema`, `setAccountEnabledInConfigSection`, `deleteAccountFromConfigSection`,
  `applyAccountNameToChannelSection`.
- Assistants d'appariement : `PAIRING_APPROVED_MESSAGE`, `formatPairingApproveHint`.
- Configuration des points d'entrée : `setup` + `setupWizard` détenus par l'hôte ; éviter les helpers d'onboarding publics larges.
- Assistants de paramètres d'outil : `createActionGate`, `readStringParam`, `readNumberParam`, `readReactionParams`, `jsonResult`.
- Assistant de lien vers la documentation : `formatDocsLink`.

Livraison :

- Publier en tant que `openclaw/plugin-sdk` (ou exporter depuis le cœur sous `openclaw/plugin-sdk`).
- Gestion sémantique de version avec des garanties de stabilité explicites.

### 2) Runtime de Plugin (surface d'exécution, injecté)

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
          deliver: (payload: { text?: string; mediaUrls?: string[]; mediaUrl?: string }) => void | Promise<void>;
          onError?: (err: unknown, info: { kind: string }) => void;
        };
      }): Promise<void>;
      createReplyDispatcherWithTyping?: unknown; // adapter for Teams-style flows
    };
    routing: {
      resolveAgentRoute(params: { cfg: unknown; channel: string; accountId: string; peer: { kind: RoutePeerKind; id: string } }): { sessionKey: string; accountId: string };
    };
    pairing: {
      buildPairingReply(params: { channel: string; idLine: string; code: string }): string;
      readAllowFromStore(channel: string): Promise<string[]>;
      upsertPairingRequest(params: { channel: string; id: string; meta?: { name?: string } }): Promise<{ code: string; created: boolean }>;
    };
    media: {
      fetchRemoteMedia(params: { url: string }): Promise<{ buffer: Buffer; contentType?: string }>;
      saveMediaBuffer(buffer: Uint8Array, contentType: string | undefined, direction: "inbound" | "outbound", maxBytes: number): Promise<{ path: string; contentType?: string }>;
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
      resolveRequireMention(cfg: OpenClawConfig, channel: string, accountId: string, groupId: string, override?: boolean): boolean;
    };
    debounce: {
      createInboundDebouncer<T>(opts: { debounceMs: number; buildKey: (v: T) => string | null; shouldDebounce: (v: T) => boolean; onFlush: (entries: T[]) => Promise<void>; onError?: (err: unknown) => void }): { push: (v: T) => void; flush: () => Promise<void> };
      resolveInboundDebounceMs(cfg: OpenClawConfig, channel: string): number;
    };
    commands: {
      resolveCommandAuthorizedFromAuthorizers(params: { useAccessGroups: boolean; authorizers: Array<{ configured: boolean; allowed: boolean }> }): boolean;
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
- Le SDK est volontairement petit et stable.
- Chaque méthode du runtime correspond à une implémentation principale existante (pas de duplication).

## Plan de migration (par phases, sûr)

### Phase 0 : échafaudage

- Introduire `openclaw/plugin-sdk`.
- Ajouter `api.runtime` à `OpenClawPluginApi` avec la surface ci-dessus.
- Maintenir les importations existantes pendant une fenêtre de transition (avertissements d'obsolescence).

### Phase 1 : nettoyage du pont (faible risque)

- Remplacer `core-bridge.ts` par extension par `api.runtime`.
- Migrer BlueBubbles, Zalo, Zalo Personal en premier (déjà proches).
- Supprimer le code de pont en double.

### Phase 2 : plugins à importation directe légère

- Migrer Matrix vers le SDK + runtime.
- Valider la logique d'onboarding, de répertoire et de mention de groupe.

### Phase 3 : plugins à importation directe lourde

- Migrer MS Teams (plus grand ensemble de helpers d'exécution).
- S'assurer que la sémantique de réponse/frappe correspond au comportement actuel.

### Phase 4 : plug-inisation de iMessage

- Déplacer iMessage dans `extensions/imessage`.
- Remplacer les appels directs au cœur par `api.runtime`.
- Garder les clés de configuration, le comportement CLI et la documentation intacts.

### Phase 5 : application

- Ajouter une règle de linter / vérification CI : pas d'importations `extensions/**` depuis `src/**`.
- Ajouter des vérifications de compatibilité de version du plugin SDK (runtime + SDK semver).

## Compatibilité et versionnage

- SDK : semver, publié, modifications documentées.
- Runtime : versionné par version principale. Ajouter `api.runtime.version`.
- Les plugins déclarent une plage de runtime requise (ex : `openclawRuntime: ">=2026.2.0"`).

## Stratégie de test

- Tests unitaires au niveau de l'adaptateur (fonctions d'exécution exercées avec l'implémentation principale réelle).
- Tests dorés par plugin : s'assurer qu'il n'y a pas de dérive de comportement (routage, appariement, liste d'autorisation, filtrage des mentions).
- Un seul exemple de plugin de bout en bout utilisé dans la CI (installation + exécution + test de fumée).

## Questions ouvertes

- Où héberger les types SDK : package séparé ou export principal ?
- Distribution des types de runtime : dans le SDK (types uniquement) ou dans le cœur ?
- Comment exposer les liens de documentation pour les plugins groupés par rapport aux plugins externes ?
- Autorisons-nous des importations limitées directes du cœur pour les plugins internes pendant la transition ?

## Critères de succès

- Tous les connecteurs de channel sont des plugins utilisant le SDK + le runtime.
- Pas d'imports `extensions/**` depuis `src/**`.
- Les nouveaux modèles de connecteurs ne dépendent que du SDK + runtime.
- Les plugins externes peuvent être développés et mis à jour sans accès au code source du noyau.

Documentation connexe : [Plugins](/en/tools/plugin), [Canaux](/en/channels/index), [Configuration](/en/gateway/configuration).

## Coutures détenues par le canal implémentées

Le travail de refactorisation récent a élargi le contrat du plugin de canal afin que le cœur puisse cesser de posséder
l'UX et le comportement de routage spécifiques au canal :

- `messaging.buildCrossContextComponents` : marqueurs d'UI inter-contextes détenus par le canal
  (par exemple conteneurs de composants v2 Discord)
- `messaging.enableInteractiveReplies` : commutateurs de normalisation des réponses détenus par le canal
  (par exemple réponses interactives Slack)
- `messaging.resolveOutboundSessionRoute` : routage de session sortant détenu par le canal
- `status.formatCapabilitiesProbe` / `status.buildCapabilitiesDiagnostics` : affichage de la sonde `/channels capabilities`
  et audits/scopes supplémentaires détenus par le canal
- `threading.resolveAutoThreadId` : auto-filtrage au sein de la même conversation détenu par le canal
- `threading.resolveReplyTransport` : mappage de livraison réponse-vs-fil détenu par le canal
- `actions.requiresTrustedRequesterSender` : portes de confiance pour les actions privilégiées détenues par le canal
- `execApprovals.*` : état de la surface d'approbation d'exécution, suppression du transfert,
  UX de payload en attente et hooks de pré-livraison détenus par le canal
- `lifecycle.onAccountConfigChanged` / `lifecycle.onAccountRemoved` : nettoyage détenu par le canal lors
  de la mutation/suppression de la configuration
- `allowlist.supportsScope` : publicité de portée de la liste d'autorisation détenue par le canal

Ces hooks doivent être préférés aux nouvelles branches `channel === "discord"` / `telegram`
dans les flux cœur partagés.
