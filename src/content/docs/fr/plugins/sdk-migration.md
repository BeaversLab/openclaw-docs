---
title: "Migration du SDK de plugin"
sidebarTitle: "Migrer vers le SDK"
summary: "Migrer depuis la couche de rétrocompatibilité héritée vers le SDK de plugin moderne"
read_when:
  - You see the OPENCLAW_PLUGIN_SDK_COMPAT_DEPRECATED warning
  - You see the OPENCLAW_EXTENSION_API_DEPRECATED warning
  - You are updating a plugin to the modern plugin architecture
  - You maintain an external OpenClaw plugin
---

# Migration du SDK de plugin

OpenClaw est passé d'une large couche de rétrocompatibilité à une architecture de plugin moderne avec des importations ciblées et documentées. Si votre plugin a été construit avant la nouvelle architecture, ce guide vous aide à migrer.

## Ce qui change

L'ancien système de plugins offrait deux surfaces très ouvertes qui permettaient aux plugins d'importer tout ce dont ils avaient besoin à partir d'un point d'entrée unique :

- **`openclaw/plugin-sdk/compat`** — un import unique qui ré-exportait des dizaines d'helpers. Il a été introduit pour maintenir les anciens plugins basés sur des hooks (hooks) fonctionnels pendant que la nouvelle architecture de plugin était en cours de construction.
- **`openclaw/extension-api`** — un pont qui donnait aux plugins un accès direct aux helpers côté hôte comme l'exécuteur d'agent intégré.

Ces deux surfaces sont désormais **dépréciées**. Elles fonctionnent toujours à l'exécution, mais les nouveaux plugins ne doivent pas les utiliser, et les plugins existants devraient migrer avant que la prochaine version majeure ne les supprime.

<Warning>La couche de rétrocompatibilité sera supprimée dans une future version majeure. Les plugins qui importent encore depuis ces surfaces cesseront de fonctionner à ce moment-là.</Warning>

## Pourquoi ce changement

L'ancienne approche posait des problèmes :

- **Démarrage lent** — importer un seul helper chargeait des dizaines de modules non liés
- **Dépendances circulaires** — les ré-exportations larges facilitaient la création de cycles d'importation
- **Surface API peu claire** — impossible de distinguer les exportations stables des exportations internes

Le SDK de plugin moderne résout ce problème : chaque chemin d'importation (`openclaw/plugin-sdk/\<subpath\>`) est un petit module autonome avec un objectif clair et un contrat documenté.

## Comment migrer

<Steps>
  <Step title="Trouver les imports dépréciés">
    Recherchez dans votre plugin les imports provenant de l'une ou l'autre des surfaces dépréciées :

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="Remplacer par des imports ciblés">
    Chaque export de l'ancienne surface correspond à un chemin d'import moderne spécifique :

    ```typescript
    // Before (deprecated backwards-compatibility layer)
    import {
      createChannelReplyPipeline,
      createPluginRuntimeStore,
      resolveControlCommandGate,
    } from "openclaw/plugin-sdk/compat";

    // After (modern focused imports)
    import { createChannelReplyPipeline } from "openclaw/plugin-sdk/channel-reply-pipeline";
    import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
    import { resolveControlCommandGate } from "openclaw/plugin-sdk/command-auth";
    ```

    Pour les assistants côté hôte, utilisez le runtime de plugin injecté au lieu d'importer directement :

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    Le même modèle s'applique aux autres assistants de pont hérités :

    | Ancien import | Équivalent moderne |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | assistants du magasin de session | `api.runtime.agent.session.*` |

  </Step>

  <Step title="Construire et tester">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## Référence des chemins d'import

<Accordion title="Tableau complet des chemins d'importation">
  | Chemin d'importation | Objectif | Exportations clés | | --- | --- | --- | | `plugin-sdk/plugin-entry` | Assistant d'entrée de plugin canonique | `definePluginEntry` | | `plugin-sdk/core` | Définitions d'entrée de channel, constructeurs de channel, types de base | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/channel-setup` | Adaptateurs de l'assistant de configuration |
  `createOptionalChannelSetupSurface` | | `plugin-sdk/channel-pairing` | Primitifs d'appairage DM | `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | Câblage du préfixe de réponse + de la saisie | `createChannelReplyPipeline` | | `plugin-sdk/channel-config-helpers` | Fabriques d'adaptateurs de configuration | `createHybridChannelConfigAdapter` | |
  `plugin-sdk/channel-config-schema` | Constructeurs de schéma de configuration | Types de schéma de configuration de channel | | `plugin-sdk/channel-policy` | Résolution de stratégie de groupe/DM | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | Suivi de l'état du compte | `createAccountStatusSink` | | `plugin-sdk/channel-runtime` | Assistants de câblage d'exécution |
  Utilitaires d'exécution de channel | | `plugin-sdk/channel-send-result` | Types de résultat d'envoi | Types de résultat de réponse | | `plugin-sdk/runtime-store` | Stockage persistant de plugin | `createPluginRuntimeStore` | | `plugin-sdk/allow-from` | Formatage de la liste d'autorisation | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | Mappage des entrées de la liste
  d'autorisation | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | Gating de commande | `resolveControlCommandGate` | | `plugin-sdk/secret-input` | Analyse des entrées secrètes | Assistants de saisie secrète | | `plugin-sdk/webhook-ingress` | Assistants de requête Webhook | Utilitaires de cible Webhook | | `plugin-sdk/reply-payload` | Types de réponse de message | Types de payload
  de réponse | | `plugin-sdk/provider-onboard` | Correctifs d'intégration de fournisseur | Assistants de configuration d'intégration | | `plugin-sdk/keyed-async-queue` | File d'attente asynchrone ordonnée | `KeyedAsyncQueue` | | `plugin-sdk/testing` | Utilitaires de test | Assistants de test et mocks |
</Accordion>

Utilisez l'importation la plus précise correspondant à la tâche. Si vous ne trouvez pas d'exportation, vérifiez la source dans `src/plugin-sdk/` ou demandez sur Discord.

## Calendrier de suppression

| Quand                         | Ce qui se passe                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| **Maintenant**                | Les surfaces dépréciées émettent des avertissements d'exécution                         |
| **Prochaine version majeure** | Les surfaces dépréciées seront supprimées ; les plugins les utilisant encore échoueront |

Tous les plugins principaux ont déjà été migrés. Les plugins externes doivent migrer avant la prochaine version majeure.

## Supprimer temporairement les avertissements

Définissez ces variables d'environnement pendant que vous travaillez sur la migration :

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

Il s'agit d'une échappatoire temporaire, pas d'une solution permanente.

## Connexes

- [Getting Started](/fr/plugins/building-plugins) — construire votre premier plugin
- [Aperçu du SDK](/fr/plugins/sdk-overview) — référence complète des importations de sous-chemins
- [Plugins de canal](/fr/plugins/sdk-channel-plugins) — créer des plugins de canal
- [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins) — créer des plugins de fournisseur
- [Internes du plugin](/fr/plugins/architecture) — plongée approfondie dans l'architecture
- [Manifeste du plugin](/fr/plugins/manifest) — référence du schéma du manifeste
