---
title: "Migration du SDK du plugin"
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

- **`openclaw/plugin-sdk/compat`** — un seul import qui réexportait des dizaines d'assistants. Il a été introduit pour maintenir le fonctionnement des anciens plugins basés sur des hooks pendant que la nouvelle architecture de plugin était en cours de construction.
- **`openclaw/extension-api`** — un pont qui donnait aux plugins un accès direct aux assistants côté hôte comme le lanceur d'agent intégré.

Ces deux surfaces sont désormais **dépréciées**. Elles fonctionnent toujours à l'exécution, mais les nouveaux plugins ne doivent pas les utiliser, et les plugins existants devraient migrer avant que la prochaine version majeure ne les supprime.

<Warning>La couche de compatibilité descendante sera supprimée dans une future version majeure. Les plugins qui importent toujours de ces interfaces cesseront de fonctionner à ce moment-là.</Warning>

## Pourquoi ce changement

L'ancienne approche posait des problèmes :

- **Démarrage lent** — importer un seul helper chargeait des dizaines de modules non liés
- **Dépendances circulaires** — les ré-exportations larges facilitaient la création de cycles d'importation
- **Surface API peu claire** — impossible de distinguer les exportations stables des exportations internes

Le SDK de plugin moderne corrige cela : chaque chemin d'importation (`openclaw/plugin-sdk/\<subpath\>`) est un petit module autonome avec un objectif clair et un contrat documenté.

Les coutures de commodité de fournisseur héritées pour les canals groupés ont également disparu. Les importations telles que `openclaw/plugin-sdk/slack`, `openclaw/plugin-sdk/discord`, `openclaw/plugin-sdk/signal`, `openclaw/plugin-sdk/whatsapp`, les coutures d'assistants marquées par canal, et `openclaw/plugin-sdk/telegram-core` étaient des raccourcis privés de mono-repo, et non des contrats de plugin stables. Utilisez plutôt des sous-chemins SDK génériques plus étroits. Dans l'espace de travail du plugin groupé, conservez les assistants détenus par le fournisseur dans le propre `api.ts` ou `runtime-api.ts` de ce plugin.

Exemples actuels de fournisseurs groupés :

- Anthropic conserve les assistants de flux spécifiques à Claude dans sa propre couture `api.ts` / `contract-api.ts`
- OpenAI conserve les constructeurs de fournisseurs, les assistants de modèle par défaut et les constructeurs de fournisseurs en temps réel dans son propre `api.ts`
- OpenRouter conserve le constructeur de fournisseur et les assistants d'intégration/configuration dans son propre `api.ts`

## Comment migrer

<Steps>
  <Step title="Migrate approval-native handlers to capability facts">
    Les plugins de canal capables d'approbation exposent désormais le comportement d'approbation natif via
    `approvalCapability.nativeRuntime` ainsi que le registre partagé du contexte d'exécution.

    Principaux changements :

    - Remplacez `approvalCapability.handler.loadRuntime(...)` par
      `approvalCapability.nativeRuntime`
    - Déplacez l'authentification/livraison spécifique à l'approbation hors de l'ancien câblage `plugin.auth` /
      `plugin.approvals` et vers `approvalCapability`
    - `ChannelPlugin.approvals` a été retiré du contrat public des plugins de canal ; déplacez les champs delivery/native/render vers `approvalCapability`
    - `plugin.auth` ne reste que pour les flux de connexion/déconnexion du canal ; les hooks d'authentification pour l'approbation ne sont plus lus par le cœur (core)
    - Enregistrez les objets d'exécution appartenant au canal tels que les clients, les jetons ou les applications Bolt
      via `openclaw/plugin-sdk/channel-runtime-context`
    - N'envoyez pas de notifications de réacheminement appartenant au plugin depuis les gestionnaires natifs d'approbation ;
      le cœur possède désormais les notifications « routé ailleurs » issues des résultats de livraison réels
    - Lorsque vous passez `channelRuntime` dans `createChannelManager(...)`, fournissez une
      surface `createPluginRuntime().channel` réelle. Les partiels sont rejetés.

    Consultez `/plugins/sdk-channel-plugins` pour la disposition actuelle des capacités d'approbation.

  </Step>

  <Step title="Audit Windows wrapper fallback behavior">
    Si votre plugin utilise `openclaw/plugin-sdk/windows-spawn`, les wrappers Windows
    `.cmd`/`.bat` non résolus échouent désormais en mode fermé (fail closed), sauf si vous passez explicitement
    `allowShellFallback: true`.

    ```typescript
    // Before
    const program = applyWindowsSpawnProgramPolicy({ candidate });

    // After
    const program = applyWindowsSpawnProgramPolicy({
      candidate,
      // Only set this for trusted compatibility callers that intentionally
      // accept shell-mediated fallback.
      allowShellFallback: true,
    });
    ```

    Si votre appelant ne compte pas intentionnellement sur le repli vers le shell, ne définissez pas
    `allowShellFallback` et gérez plutôt l'erreur renvoyée.

  </Step>

  <Step title="Find deprecated imports">
    Recherchez dans votre plugin les importations provenant de l'une ou l'autre des surfaces dépréciées :

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="Remplacer par des importations ciblées">
    Chaque export de l'ancienne interface correspond à un chemin d'importation moderne spécifique :

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

    Pour les assistants côté hôte, utilisez le runtime du plugin injecté au lieu d'importer

directement :

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    Le même modèle s'applique aux autres assistants de pont hérités :

    | Ancienne importation | Équivalent moderne |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | assistants de magasin de session | `api.runtime.agent.session.*` |

  </Step>

  <Step title="Compiler et tester">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## Référence des chemins d'importation

<Accordion title="Tableau des chemins d'importation courants">
  | Chemin d'importation | Objectif | Principales exportations | | --- | --- | --- | | `plugin-sdk/plugin-entry` | Assistant d'entrée de plugin canonique | `definePluginEntry` | | `plugin-sdk/core` | Ré-exportation parapluie héritée pour les définitions/constructeurs d'entrée de channel | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | Exportation du schéma
  de configuration racine | `OpenClawSchema` | | `plugin-sdk/provider-entry` | Assistant d'entrée à fournisseur unique | `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | Définitions et constructeurs d'entrée de channel ciblés | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | Assistants partagés
  pour l'assistant de configuration | Invite de liste d'autorisation, constructeurs de statut de configuration | | `plugin-sdk/setup-runtime` | Assistants d'exécution au moment de la configuration | Adaptateurs de correctif de configuration sûrs à l'importation, assistants de note de recherche, `promptResolvedAllowFrom`, `splitSetupEntries`, proxys de configuration délégués | |
  `plugin-sdk/setup-adapter-runtime` | Assistants d'adaptateur de configuration | `createEnvPatchedAccountSetupAdapter` | | `plugin-sdk/setup-tools` | Assistants d'outillage de configuration | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` | | `plugin-sdk/account-core` | Assistants multi-comptes | Assistants de liste/config/action-gate
  de comptes | | `plugin-sdk/account-id` | Assistants d'ID de compte | `DEFAULT_ACCOUNT_ID`, normalisation de l'ID de compte | | `plugin-sdk/account-resolution` | Assistants de recherche de compte | Assistants de recherche de compte + secours par défaut | | `plugin-sdk/account-helpers` | Assistants de compte restreints | Assistants de liste/actions de compte | | `plugin-sdk/channel-setup` |
  Adaptateurs de l'assistant de configuration | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, plus `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` | | `plugin-sdk/channel-pairing` | Primitifs d'appariement DM | `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline`
  | Câblage du préfixe de réponse + saisie | `createChannelReplyPipeline` | | `plugin-sdk/channel-config-helpers` | Usines d'adaptateurs de configuration | `createHybridChannelConfigAdapter` | | `plugin-sdk/channel-config-schema` | Constructeurs de schémas de configuration | Types de schémas de configuration de channel | | `plugin-sdk/telegram-command-config` | Assistants de configuration de
  commande Telegram | Normalisation du nom de commande, découpe de la description, validation des doublons/conflits | | `plugin-sdk/channel-policy` | Résolution de stratégie de groupe/DM | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | Suivi du statut du compte | `createAccountStatusSink` | | `plugin-sdk/inbound-envelope` | Assistants d'enveloppe entrante | Assistants de
  route partagée + constructeur d'enveloppe | | `plugin-sdk/inbound-reply-dispatch` | Assistants de réponse entrante | Assistants d'enregistrement et de répartition partagés | | `plugin-sdk/messaging-targets` | Analyse de la cible de messagerie | Assistants d'analyse/correspondance de cible | | `plugin-sdk/outbound-media` | Assistants de média sortant | Chargement de média sortant partagé | |
  `plugin-sdk/outbound-runtime` | Assistants d'exécution sortants | Assistants de délégué d'identité/d'envoi sortant | | `plugin-sdk/thread-bindings-runtime` | Assistants de liaison de fil de discussion | Assistants de cycle de vie et d'adaptateur de liaison de fil de discussion | | `plugin-sdk/agent-media-payload` | Assistants de charge utile média héritée | Constructeur de charge utile média
  d'agent pour les dispositions de champs hérités | | `plugin-sdk/channel-runtime` | Shim de compatibilité obsolète | Utilitaires d'exécution de channel hérités uniquement | | `plugin-sdk/channel-send-result` | Types de résultat d'envoi | Types de résultat de réponse | | `plugin-sdk/runtime-store` | Stockage persistant de plugin | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | Assistants
  d'exécution larges | Assistants d'exécution/journalisation/sauvegarde/installation de plugin | | `plugin-sdk/runtime-env` | Assistants d'environnement d'exécution restreints | Enregistreur/env d'exécution, délai d'expiration, nouvelle tentative et assistants de réexponentiel | | `plugin-sdk/plugin-runtime` | Assistants d'exécution de plugin partagés | Assistants de
  commandes/hooks/http/interactifs de plugin | | `plugin-sdk/hook-runtime` | Assistants de pipeline de hook | Assistants de pipeline de webhook/hook interne partagés | | `plugin-sdk/lazy-runtime` | Assistants d'exécution différés | `createLazyRuntimeModule`, `createLazyRuntimeMethod`, `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`, `createLazyRuntimeSurface` | |
  `plugin-sdk/process-runtime` | Assistants de processus | Assistants d'exécution partagés | | `plugin-sdk/cli-runtime` | Assistants d'exécution CLI | Formatage des commandes, attentes, assistants de version | | `plugin-sdk/gateway-runtime` | Assistants Gateway | Client Gateway et assistants de correctif de statut de channel | | `plugin-sdk/config-runtime` | Assistants de configuration |
  Assistants de chargement/écriture de configuration | | `plugin-sdk/telegram-command-config` | Assistants de commande Telegram | Assistants de validation de commande Telegram stables en secours lorsque la surface de contrat Telegram groupée n'est pas disponible | | `plugin-sdk/approval-runtime` | Assistants d'invite d'approbation | Charge utile d'approbation exécution/plugin, assistants de
  profil/capacité d'approbation, assistants de routage/d'exécution d'approbation natifs | | `plugin-sdk/approval-auth-runtime` | Assistants d'authentification d'approbation | Résolution de l'approbant, authentification d'action de même chat | | `plugin-sdk/approval-client-runtime` | Assistants client d'approbation | Assistants de profil/filtre d'approbation d'exécution natifs | |
  `plugin-sdk/approval-delivery-runtime` | Assistants de livraison d'approbation | Adaptateurs de capacité/livraison d'approbation natifs | | `plugin-sdk/approval-gateway-runtime` | Assistants OAuth d'approbation | Assistant de résolution CLI d'approbation partagé | | `plugin-sdk/approval-handler-adapter-runtime` | Assistants d'adaptateur d'approbation | Assistants de chargement d'adaptateur
  d'approbation natif léger pour les points d'entrée de channel à chaud | | `plugin-sdk/approval-handler-runtime` | Assistants de gestionnaire d'approbation | Assistants d'exécution de gestionnaire d'approbation plus larges ; préférez les interfaces adaptateur/%PH:GLOSSARY:363:7f841237%% plus étroites lorsqu'elles suffisent | | `plugin-sdk/approval-native-runtime` | Assistants de cible
  d'approbation | Assistants de liaison de cible/compte d'approbation natifs | | `plugin-sdk/approval-reply-runtime` | Assistants de réponse d'approbation | Assistants de charge utile de réponse d'approbation exécution/plugin | | `plugin-sdk/channel-runtime-context` | Assistants de contexte d'exécution de channel | Assistants d'enregistrement/obtention/watch de contexte d'exécution de channel
  générique | | `plugin-sdk/security-runtime` | Assistants de sécurité | Assistants de confiance partagée, gating DM, contenu externe et collection de secrets | | `plugin-sdk/ssrf-policy` | Assistants de stratégie SSRF | Assistants de stratégie de liste d'autorisation d'hôte et de réseau privé | | `plugin-sdk/ssrf-runtime` | Assistants d'exécution SSRF | Répartiteur épinglé, récupération gardée,
  assistants de stratégie SSRF | | `plugin-sdk/collection-runtime` | Assistants de cache borné | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | Assistants de gating de diagnostic | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | Assistants de formatage d'erreur | `formatUncaughtError`, `isApprovalNotFoundError`, assistants de graphe d'erreur | |
  `plugin-sdk/fetch-runtime` | Assistants de récupération/proxy encapsulés | `resolveFetch`, assistants de proxy | | `plugin-sdk/host-runtime` | Assistants de normalisation d'hôte | `normalizeHostname`, `normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | Assistants de nouvelle tentative | `RetryConfig`, `retryAsync`, exécutants de stratégie | | `plugin-sdk/allow-from` | Formatage de la liste
  d'autorisation | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | Mappage d'entrée de liste d'autorisation | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | Assistants de gating de commande et de surface de commande | `resolveControlCommandGate`, assistants d'autorisation de l'expéditeur, assistants de registre de commandes | | `plugin-sdk/secret-input` | Analyse
  de l'entrée secrète | Assistants d'entrée secrète | | `plugin-sdk/webhook-ingress` | Assistants de demande Webhook | Utilitaires de cible Webhook | | `plugin-sdk/webhook-request-guards` | Assistants de garde de corps Webhook | Assistants de lecture/limite du corps de la demande | | `plugin-sdk/reply-runtime` | Exécution de réponse partagée | Répartition entrante, battement de cœur, planificateur
  de réponse, découpage | | `plugin-sdk/reply-dispatch-runtime` | Assistants de répartition de réponse restreints | Assistants de finalisation + répartition fournisseur | | `plugin-sdk/reply-history` | Assistants d'historique de réponse | `buildHistoryContext`, `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry`, `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` |
  Planification de référence de réponse | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Assistants de découpage de réponse | Assistants de découpage texte/markdown | | `plugin-sdk/session-store-runtime` | Assistants de magasin de session | Assistants de chemin de magasin + mis à jour à | | `plugin-sdk/state-paths` | Assistants de chemin d'état | Assistants de répertoire d'état et
  OpenAI | | `plugin-sdk/routing` | Assistants de clé de routage/session | `resolveAgentRoute`, `buildAgentSessionKey`, `resolveDefaultAgentBoundAccountId`, assistants de normalisation de clé de session | | `plugin-sdk/status-helpers` | Assistants de statut de channel | Constructeurs de résumé de statut de channel/compte, valeurs par défaut d'état d'exécution, assistants de métadonnées de problème
  | | `plugin-sdk/target-resolver-runtime` | Assistants de résolveur de cible | Assistants de résolveur de cible partagé | | `plugin-sdk/string-normalization-runtime` | Assistants de normalisation de chaîne | Assistants de normalisation de slug/chaîne | | `plugin-sdk/request-url` | Assistants d'URL de demande | Extraire les URL de chaîne des entrées semblables à des demandes | |
  `plugin-sdk/run-command` | Assistants de commande minutée | Exécuteur de commande minutée avec stdout/stderr normalisés | | `plugin-sdk/param-readers` | Lecteurs de paramètres | Lecteurs de paramètres outil/API courants | | `plugin-sdk/tool-send` | Extraction d'envoi d'outil | Extraire les champs de cible d'envoi canoniques des arguments d'outil | | `plugin-sdk/temp-path` | Assistants de chemin
  temporaire | Assistants de chemin de téléchargement temporaire partagé | | `plugin-sdk/logging-core` | Assistants de journalisation | Assistants d'enregistreur de sous-système et de rédaction | | `plugin-sdk/markdown-table-runtime` | Assistants de tableau Markdown | Assistants de mode de tableau Markdown | | `plugin-sdk/reply-payload` | Types de réponse de message | Types de charge utile de
  réponse | | `plugin-sdk/provider-setup` | Assistants de configuration de fournisseur local/auto-hébergé soigné | Assistants de découverte/configuration de fournisseur auto-hébergé | | `plugin-sdk/self-hosted-provider-setup` | Assistants de configuration de fournisseur auto-hébergé compatible API ciblé | Assistants de découverte/configuration de fournisseur auto-hébergé identiques | |
  `plugin-sdk/provider-auth-runtime` | Assistants d'authentification d'exécution de fournisseur | Assistants de résolution de clé API d'exécution | | `plugin-sdk/provider-auth-api-key` | Assistants de configuration de clé OAuth de fournisseur | Assistants d'écriture de profil/d'intégration de clé Anthropic | | `plugin-sdk/provider-auth-result` | Assistants de résultat d'authentification de
  fournisseur | Constructeur de résultat d'authentification Moonshot standard | | `plugin-sdk/provider-auth-login` | Assistants de connexion interactive de fournisseur | Assistants de connexion interactive partagés | | `plugin-sdk/provider-env-vars` | Assistants de variable d'environnement de fournisseur | Assistants de recherche de variable d'environnement d'authentification de fournisseur | |
  `plugin-sdk/provider-model-shared` | Assistants partagés de modèle/relecture de fournisseur | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructeurs de stratégie de relecture partagée, assistants de point de terminaison de fournisseur et assistants de normalisation d'ID de modèle | | `plugin-sdk/provider-catalog-shared` | Assistants partagés de catalogue
  de fournisseur | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | Correctifs d'intégration de fournisseur | Assistants de configuration d'intégration | | `plugin-sdk/provider-http` | Assistants HTTP de fournisseur | Assistants de capacité HTTP/point de terminaison de
  fournisseur génériques | | `plugin-sdk/provider-web-fetch` | Assistants de récupération Web de fournisseur | Assistants d'inscription/cache de fournisseur de récupération Web | | `plugin-sdk/provider-web-search-contract` | Assistants de contrat de recherche Web de fournisseur | Assistants de contrat de configuration/d'identifiants de recherche Web restreints tels que `enablePluginInConfig`,
  `resolveProviderWebSearchPluginConfig` et defineurs/getters d'identifiants délimités | | `plugin-sdk/provider-web-search` | Assistants de recherche Web de fournisseur | Assistants d'inscription/cache/d'exécution de fournisseur de recherche Web | | `plugin-sdk/provider-tools` | Assistants de compatibilité outil/schéma de fournisseur | `ProviderToolCompatFamily`,
  `buildProviderToolCompatFamilyHooks`, nettoyage + diagnostics de schéma Gemini et assistants de compatibilité xAI tels que `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | Assistants d'utilisation de fournisseur | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage` et autres assistants d'utilisation de fournisseur | |
  `plugin-sdk/provider-stream` | Assistants de wrapper de flux de fournisseur | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, types de wrapper de flux et assistants de wrapper partagés OpenAI/Bedrock/Google/Kilocode/OpenRouter/MiniMax/CLI/Z.A.I/CLI/Copilot | | `plugin-sdk/keyed-async-queue` | File asynchrone ordonnée | `KeyedAsyncQueue` | |
  `plugin-sdk/media-runtime` | Assistants de média partagés | Assistants de récupération/transformation/stockage de média plus constructeurs de charge utile média | | `plugin-sdk/media-generation-runtime` | Assistants partagés de génération de média | Assistants de secours partagés, sélection de candidats et messagerie de modèle manquant pour la génération d'image/vidéo/musique | |
  `plugin-sdk/media-understanding` | Assistants de compréhension de média | Types de fournisseur de compréhension de média plus exportations d'assistants image/audio orientés fournisseur | | `plugin-sdk/text-runtime` | Assistants de texte partagés | Suppression de texte visible par l'assistant, assistants de rendu/découpage/tableau markdown, assistants de rédaction, assistants de balise de
  directive, utilitaires de texte sécurisé et assistants texte/journalisation associés | | `plugin-sdk/text-chunking` | Assistants de découpage de texte | Assistant de découpage de texte sortant | | `plugin-sdk/speech` | Assistants de parole | Types de fournisseur de parole plus assistants de directive, de registre et de validation orientés fournisseur | | `plugin-sdk/speech-core` | Noyau de
  parole partagé | Types, registres, directives et normalisation du fournisseur de parole | | `plugin-sdk/realtime-transcription` | Assistants de transcription en temps réel | Assistants de types et de registre | | `plugin-sdk/realtime-voice` | Assistants vocaux en temps réel | Assistants de types et de registre | | `plugin-sdk/image-generation-core` | Noyau de génération d'image partagé | Types,
  secours, authentification et assistants de registre de génération d'image | | `plugin-sdk/music-generation` | Assistants de génération de musique | Types de demande/résultat/fournisseur de génération de musique | | `plugin-sdk/music-generation-core` | Noyau de génération de musique partagé | Types, assistants de secours, recherche de fournisseur et analyse de référence de modèle de génération de
  musique | | `plugin-sdk/video-generation` | Assistants de génération de vidéo | Types de demande/résultat/fournisseur de génération de vidéo | | `plugin-sdk/video-generation-core` | Noyau de génération de vidéo partagé | Types, assistants de secours, recherche de fournisseur et analyse de référence de modèle de génération de vidéo | | `plugin-sdk/interactive-runtime` | Assistants de réponse
  interactive | Normalisation/réduction de charge utile de réponse interactive | | `plugin-sdk/channel-config-primitives` | Primitifs de configuration de channel | Primitifs de schéma de configuration de channel restreints | | `plugin-sdk/channel-config-writes` | Assistants d'écriture de configuration de channel | Assistants d'autorisation d'écriture de configuration de channel | |
  `plugin-sdk/channel-plugin-common` | Prélude de channel partagé | Exportations de prélude de plugin de channel partagé | | `plugin-sdk/channel-status` | Assistants de statut de channel | Assistants d'instantané/résumé de statut de channel partagé | | `plugin-sdk/allowlist-config-edit` | Assistants de configuration de liste d'autorisation | Assistants de lecture/édition de configuration de liste
  d'autorisation | | `plugin-sdk/group-access` | Assistants d'accès de groupe | Assistants de décision d'accès de groupe partagés | | `plugin-sdk/direct-dm` | Assistants DM directs | Assistants de garde/auth DM directs partagés | | `plugin-sdk/extension-shared` | Assistants d'extension partagés | Primitifs d'assistant de proxy ambiant et de channel passif/statut | | `plugin-sdk/webhook-targets` |
  Assistants de cible Webhook | Assistants de registre de cible Webhook et d'installation de route | | `plugin-sdk/webhook-path` | Assistants de chemin Webhook | Assistants de normalisation de chemin Webhook | | `plugin-sdk/web-media` | Assistants de média Web partagés | Assistants de chargement de média distant/local | | `plugin-sdk/zod` | Ré-exportation Zod | `zod` ré-exporté pour les
  consommateurs du SDK de plugin | | `plugin-sdk/memory-core` | Assistants de cœur mémoire groupés | Surface d'assistant gestionnaire/configuration/fichier/CLI mémoire | | `plugin-sdk/memory-core-engine-runtime` | Façade d'exécution du moteur de mémoire | Façade d'exécution de recherche/index mémoire | | `plugin-sdk/memory-core-host-engine-foundation` | Moteur de fondation d'hôte de mémoire |
  Exportations du moteur de fondation d'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-embeddings` | Moteur d'incorporation d'hôte de mémoire | Exportations du moteur d'incorporation d'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-qmd` | Moteur QMD d'hôte de mémoire | Exportations du moteur QMD d'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-storage` | Moteur de
  stockage d'hôte de mémoire | Exportations du moteur de stockage d'hôte de mémoire | | `plugin-sdk/memory-core-host-multimodal` | Assistants multimodaux d'hôte de mémoire | Assistants multimodaux d'hôte de mémoire | | `plugin-sdk/memory-core-host-query` | Assistants de requête d'hôte de mémoire | Assistants de requête d'hôte de mémoire | | `plugin-sdk/memory-core-host-secret` | Assistants de
  secret d'hôte de mémoire | Assistants de secret d'hôte de mémoire | | `plugin-sdk/memory-core-host-events` | Assistants de journal d'événements d'hôte de mémoire | Assistants de journal d'événements d'hôte de mémoire | | `plugin-sdk/memory-core-host-status` | Assistants de statut d'hôte de mémoire | Assistants de statut d'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-cli` | Exécution
  CLI d'hôte de mémoire | Assistants d'exécution CLI d'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-core` | Exécution de base d'hôte de mémoire | Assistants d'exécution de base d'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-files` | Assistants de fichier/exécution d'hôte de mémoire | Assistants de fichier/exécution d'hôte de mémoire | | `plugin-sdk/memory-host-core` | Alias
  d'exécution de base d'hôte de mémoire | Alias neutre vis-à-vis du fournisseur pour les assistants d'exécution de base d'hôte de mémoire | | `plugin-sdk/memory-host-events` | Alias de journal d'événements d'hôte de mémoire | Alias neutre vis-à-vis du fournisseur pour les assistants de journal d'événements d'hôte de mémoire | | `plugin-sdk/memory-host-files` | Alias de fichier/exécution d'hôte de
  mémoire | Alias neutre vis-à-vis du fournisseur pour les assistants de fichier/exécution d'hôte de mémoire | | `plugin-sdk/memory-host-markdown` | Assistants de markdown géré | Assistants de markdown géré partagé pour les plugins adjacents à la mémoire | | `plugin-sdk/memory-host-search` | Façade de recherche de mémoire active | Façade d'exécution différée du gestionnaire de recherche de mémoire
  active | | `plugin-sdk/memory-host-status` | Alias de statut d'hôte de mémoire | Alias neutre vis-à-vis du fournisseur pour les assistants de statut d'hôte de mémoire | | `plugin-sdk/memory-lancedb` | Assistants de mémoire-lancedb groupés | Surface d'assistant mémoire-lancedb | | `plugin-sdk/testing` | Utilitaires de test | Assistants de test et simulations |
</Accordion>

Ce tableau présente volontairement le sous-ensemble commun de migration, et non l'intégralité de la surface du SDK. La liste complète des plus de 200 points d'entrée se trouve dans `scripts/lib/plugin-sdk-entrypoints.json`.

Cette liste inclut encore certaines interfaces d'assistance pour les plugins intégrés telles que `plugin-sdk/feishu`, `plugin-sdk/feishu-setup`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup` et `plugin-sdk/matrix*`. Celles-ci restent exportées pour la maintenance et la compatibilité des plugins intégrés, mais elles sont intentionnellement omises du tableau de migration commun et ne sont pas la cible recommandée pour le nouveau code de plugin.

La même règle s'applique à d'autres familles d'assistants intégrés telles que :

- assistants de support de navigateur : `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support`
- Matrix : `plugin-sdk/matrix*`
- LINE : `plugin-sdk/line*`
- IRC : `plugin-sdk/irc*`
- surfaces d'assistant/plugin intégrés comme `plugin-sdk/googlechat`,
  `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles*`,
  `plugin-sdk/mattermost*`, `plugin-sdk/msteams`,
  `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`,
  `plugin-sdk/twitch`,
  `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`,
  `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`,
  `plugin-sdk/thread-ownership` et `plugin-sdk/voice-call`

`plugin-sdk/github-copilot-token` expose actuellement la surface étroite d'assistance aux jetons `DEFAULT_COPILOT_API_BASE_URL`,
`deriveCopilotApiBaseUrlFromToken` et `resolveCopilotApiToken`.

Utilisez l'import le plus précis correspondant à la tâche. Si vous ne trouvez pas d'export, vérifiez la source sur `src/plugin-sdk/` ou demandez sur Discord.

## Calendrier de suppression

| Quand                         | Ce qui se passe                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| **Maintenant**                | Les surfaces dépréciées émettent des avertissements d'exécution                               |
| **Prochaine version majeure** | Les interfaces dépréciées seront supprimées ; les plugins qui les utilisent encore échoueront |

Tous les plugins principaux ont déjà été migrés. Les plugins externes doivent migrer
avant la prochaine version majeure.

## Suppression temporaire des avertissements

Définissez ces variables d'environnement pendant que vous travaillez sur la migration :

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

Il s'agit d'une échappatoire temporaire, pas d'une solution permanente.

## Connexes

- [Getting Started](/en/plugins/building-plugins) — créez votre premier plugin
- [SDK Overview](/en/plugins/sdk-overview) — référence complète des importations de sous-chemins
- [Channel Plugins](/en/plugins/sdk-channel-plugins) — création de plugins de channel
- [Provider Plugins](/en/plugins/sdk-provider-plugins) — création de plugins de provider
- [Plugin Internals](/en/plugins/architecture) — plongée approfondie dans l'architecture
- [Plugin Manifest](/en/plugins/manifest) — référence du schéma de manifeste
