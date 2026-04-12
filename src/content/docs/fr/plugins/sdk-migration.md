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
  | Chemin d'importation | Objectif | Principales exportations | | --- | --- | --- | | `plugin-sdk/plugin-entry` | Assistant d'entrée de plugin canonique | `definePluginEntry` | | `plugin-sdk/core` | Ré-exportation parapluie héritée pour les définitions/bâtisseurs d'entrée de channel | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | Exportation du schéma de
  configuration racine | `OpenClawSchema` | | `plugin-sdk/provider-entry` | Assistant d'entrée à fournisseur unique | `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | Définitions et bâtisseurs d'entrée de channel ciblés | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | Assistants partagés de
  l'assistant de configuration | Prompts de liste d'autorisation, bâtisseurs de statut de configuration | | `plugin-sdk/setup-runtime` | Assistants d'exécution au moment de la configuration | Adaptateurs de correctifs de configuration sûrs à l'importation, assistants de note de recherche, `promptResolvedAllowFrom`, `splitSetupEntries`, proxys délégués de configuration | |
  `plugin-sdk/setup-adapter-runtime` | Assistants d'adaptateur de configuration | `createEnvPatchedAccountSetupAdapter` | | `plugin-sdk/setup-tools` | Assistants d'outillage de configuration | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` | | `plugin-sdk/account-core` | Assistants multi-comptes | Assistants de liste de
  comptes/configuration/gate d'action | | `plugin-sdk/account-id` | Assistants d'identifiant de compte | `DEFAULT_ACCOUNT_ID`, normalisation de l'identifiant de compte | | `plugin-sdk/account-resolution` | Assistants de recherche de compte | Assistants de recherche de compte + repli par défaut | | `plugin-sdk/account-helpers` | Assistants de compte étroits | Assistants de liste de comptes/action
  de compte | | `plugin-sdk/channel-setup` | Adaptateurs de l'assistant de configuration | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, ainsi que `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` | | `plugin-sdk/channel-pairing` | Primitives d'appariement DM |
  `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | Câblage du préfixe de réponse + frappe | `createChannelReplyPipeline` | | `plugin-sdk/channel-config-helpers` | Usines d'adaptateurs de configuration | `createHybridChannelConfigAdapter` | | `plugin-sdk/channel-config-schema` | Bâtisseurs de schéma de configuration | Types de schéma de configuration de channel | |
  `plugin-sdk/telegram-command-config` | Assistants de configuration de commande Telegram | Normalisation du nom de commande, suppression de la description, validation des doublons/conflits | | `plugin-sdk/channel-policy` | Résolution de politique de groupe/DM | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | Suivi du statut du compte | `createAccountStatusSink` | |
  `plugin-sdk/inbound-envelope` | Assistants d'enveloppe entrante | Assistants de route partagée + bâtisseur d'enveloppe | | `plugin-sdk/inbound-reply-dispatch` | Assistants de réponse entrante | Assistants d'enregistrement et de répartition partagés | | `plugin-sdk/messaging-targets` | Analyse de la cible de messagerie | Assistants d'analyse/correspondance de cible | | `plugin-sdk/outbound-media`
  | Assistants de média sortant | Chargement de média sortant partagé | | `plugin-sdk/outbound-runtime` | Assistants d'exécution sortante | Assistants de délégué d'envoi/identité sortante | | `plugin-sdk/thread-bindings-runtime` | Assistants de liaison de fil | Assistants de cycle de vie et d'adaptateur de liaison de fil | | `plugin-sdk/agent-media-payload` | Assistants de charge utile de média
  hérité | Bâtisseur de charge utile de média d'agent pour les mises en page de champ héritées | | `plugin-sdk/channel-runtime` | Shim de compatibilité obsolète | Utilitaires d'exécution de channel hérité uniquement | | `plugin-sdk/channel-send-result` | Types de résultat d'envoi | Types de résultat de réponse | | `plugin-sdk/runtime-store` | Stockage persistant de plugin |
  `createPluginRuntimeStore` | | `plugin-sdk/runtime` | Assistants d'exécution larges | Assistants d'exécution/journalisation/sauvegarde/installation de plugin | | `plugin-sdk/runtime-env` | Assistants d'environnement d'exécution étroits | Environnement d'exécution/journalisation, délai d'attente, nouvelle tentative et assistants de recul | | `plugin-sdk/plugin-runtime` | Assistants d'exécution de
  plugin partagé | Assistants de commandes/hooks/http/interactifs de plugin | | `plugin-sdk/hook-runtime` | Assistants de pipeline de hook | Assistants de pipeline de webhook/hook interne partagé | | `plugin-sdk/lazy-runtime` | Assistants d'exécution différés | `createLazyRuntimeModule`, `createLazyRuntimeMethod`, `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`,
  `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Assistants de processus | Assistants d'exécution partagés | | `plugin-sdk/cli-runtime` | Assistants d'exécution CLI | Mise en forme des commandes, attentes, assistants de version | | `plugin-sdk/gateway-runtime` | Assistants Gateway | Assistants client Gateway et correctifs de statut de channel | | `plugin-sdk/config-runtime` |
  Assistants de configuration | Assistants de chargement/écriture de configuration | | `plugin-sdk/telegram-command-config` | Assistants de commande Telegram | Assistants de validation de commande Telegram stables en repli lorsque la surface de contrat Telegram groupée n'est pas disponible | | `plugin-sdk/approval-runtime` | Assistants de prompt d'approbation | Charge utile d'approbation
  d'exécution/plugin, assistants de capacité/profil d'approbation, assistants de routage/exécution d'approbation native | | `plugin-sdk/approval-auth-runtime` | Assistants d'authentification d'approbation | Résolution de l'approbateur, authentification d'action de même chat | | `plugin-sdk/approval-client-runtime` | Assistants client d'approbation | Assistants de profil/filtre d'approbation
  d'exécution native | | `plugin-sdk/approval-delivery-runtime` | Assistants de livraison d'approbation | Adaptateurs de capacité/livraison d'approbation native | | `plugin-sdk/approval-gateway-runtime` | Assistants OAuth d'approbation | Assistant partagé de résolution CLI d'approbation | | `plugin-sdk/approval-handler-adapter-runtime` | Assistants d'adaptateur d'approbation | Assistants de
  chargement d'adaptateur d'approbation natif léger pour les points d'entrée de channel à chaud | | `plugin-sdk/approval-handler-runtime` | Assistants de gestionnaire d'approbation | Assistants d'exécution de gestionnaire d'approbation plus larges ; préférez les interfaces plus étroites d'adaptateur/OpenAI lorsqu'elles suffisent | | `plugin-sdk/approval-native-runtime` | Assistants de cible
  d'approbation | Assistants de liaison de compte/cible d'approbation native | | `plugin-sdk/approval-reply-runtime` | Assistants de réponse d'approbation | Assistants de charge utile de réponse d'approbation d'exécution/plugin | | `plugin-sdk/channel-runtime-context` | Assistants de contexte d'exécution de channel | Assistants génériques d'enregistrement/obtention/surveillance de contexte
  d'exécution de channel | | `plugin-sdk/security-runtime` | Assistants de sécurité | Assistants de confiance partagée, porte DM, contenu externe et collecte de secrets | | `plugin-sdk/ssrf-policy` | Assistants de politique SSRF | Assistants de politique de réseau privé et de liste d'autorisation d'hôte | | `plugin-sdk/ssrf-runtime` | Assistants d'exécution SSRF | Répartiteur épinglé, récupération
  gardée, assistants de politique SSRF | | `plugin-sdk/collection-runtime` | Assistants de cache borné | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | Assistants de blocage de diagnostic | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | Assistants de mise en forme des erreurs | `formatUncaughtError`, `isApprovalNotFoundError`, assistants de graphe
  d'erreurs | | `plugin-sdk/fetch-runtime` | Assistants de récupération/proxy enveloppés | `resolveFetch`, assistants de proxy | | `plugin-sdk/host-runtime` | Assistants de normalisation d'hôte | `normalizeHostname`, `normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | Assistants de nouvelle tentative | `RetryConfig`, `retryAsync`, exécuteurs de politique | | `plugin-sdk/allow-from` | Mise en
  forme de la liste d'autorisation | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | Mappage d'entrée de liste d'autorisation | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | Assistants de blocage et de surface de commande | `resolveControlCommandGate`, assistants d'autorisation de l'expéditeur, assistants de registre de commande | | `plugin-sdk/command-status` |
  Rendueurs de statut/aide de commande | `buildCommandsMessage`, `buildCommandsMessagePaginated`, `buildHelpMessage` | | `plugin-sdk/secret-input` | Analyse de l'entrée secrète | Assistants d'entrée secrète | | `plugin-sdk/webhook-ingress` | Assistants de requête webhook | Utilitaires de cible webhook | | `plugin-sdk/webhook-request-guards` | Assistants de garde de corps webhook | Assistants de
  lecture/limite du corps de la requête | | `plugin-sdk/reply-runtime` | Exécution de réponse partagée | Répartition entrante, pulsation, planificateur de réponse, découpage | | `plugin-sdk/reply-dispatch-runtime` | Assistants de répartition de réponse étroite | Assistants de finalisation + répartition de fournisseur | | `plugin-sdk/reply-history` | Assistants d'historique de réponse |
  `buildHistoryContext`, `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry`, `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | Planification de référence de réponse | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Assistants de segment de réponse | Assistants de découpage de texte/markdown | | `plugin-sdk/session-store-runtime` | Assistants de magasin
  de session | Assistants de chemin de magasin + mis à jour à | | `plugin-sdk/state-paths` | Assistants de chemin d'état | Assistants de répertoire d'état et API | | `plugin-sdk/routing` | Assistants de clé de routage/session | `resolveAgentRoute`, `buildAgentSessionKey`, `resolveDefaultAgentBoundAccountId`, assistants de normalisation de clé de session | | `plugin-sdk/status-helpers` | Assistants
  de statut de channel | Bâtisseurs de résumé de statut de channel/compte, valeurs par défaut d'état d'exécution, assistants de métadonnées de problème | | `plugin-sdk/target-resolver-runtime` | Assistants de résolveur de cible | Assistants partagés de résolveur de cible | | `plugin-sdk/string-normalization-runtime` | Assistants de normalisation de chaîne | Assistants de normalisation de
  chaîne/slug | | `plugin-sdk/request-url` | Assistants d'URL de requête | Extraire les URL de chaîne des entrées de type requête | | `plugin-sdk/run-command` | Assistants de commande minutée | Exécuteur de commande minutée avec stdout/stderr normalisés | | `plugin-sdk/param-readers` | Lecteurs de paramètre | Lecteurs de paramètres API/outil courants | | `plugin-sdk/tool-payload` | Extraction de
  charge utile d'outil | Extraire les charges utiles normalisées des objets de résultat d'outil | | `plugin-sdk/tool-send` | Extraction d'envoi d'outil | Extraire les champs de cible d'envoi canoniques des arguments d'outil | | `plugin-sdk/temp-path` | Assistants de chemin temporaire | Assistants de chemin de téléchargement temporaire partagé | | `plugin-sdk/logging-core` | Assistants de
  journalisation | Assistants de journalisation et de rédaction de sous-système | | `plugin-sdk/markdown-table-runtime` | Assistants de tableau markdown | Assistants de mode de tableau markdown | | `plugin-sdk/reply-payload` | Types de réponse de message | Types de charge utile de réponse | | `plugin-sdk/provider-setup` | Assistants de configuration de fournisseur local/auto-hébergé | Assistants
  de découverte/configuration de fournisseur auto-hébergé | | `plugin-sdk/self-hosted-provider-setup` | Assistants ciblés de configuration de fournisseur auto-hébergé compatible API | Mêmes assistants de découverte/configuration de fournisseur auto-hébergé | | `plugin-sdk/provider-auth-runtime` | Assistants d'authentification d'exécution de fournisseur | Assistants de résolution de clé OAuth
  d'exécution | | `plugin-sdk/provider-auth-api-key` | Assistants de configuration de clé Anthropic de fournisseur | Assistants d'écriture de profil/Moonshot de clé OpenAI | | `plugin-sdk/provider-auth-result` | Assistants de résultat d'authentification de fournisseur | Bâtisseur de résultat d'authentification OpenRouter standard | | `plugin-sdk/provider-auth-login` | Assistants de connexion
  interactive de fournisseur | Assistants de connexion interactive partagés | | `plugin-sdk/provider-env-vars` | Assistants de variable d'environnement de fournisseur | Assistants de recherche de variable d'environnement d'authentification de fournisseur | | `plugin-sdk/provider-model-shared` | Assistants partagés de modèle/relecture de fournisseur | `ProviderReplayFamily`,
  `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, bâtisseurs de politique de relecture partagée, assistants de point de terminaison de fournisseur et assistants de normalisation d'identifiant de modèle | | `plugin-sdk/provider-catalog-shared` | Assistants partagés de catalogue de fournisseur | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`,
  `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | Correctifs de MiniMax de fournisseur | Assistants de configuration de CLI | | `plugin-sdk/provider-http` | Assistants HTTP de fournisseur | Assistants génériques de capacité de point de terminaison/HTTP de fournisseur | | `plugin-sdk/provider-web-fetch` | Assistants de récupération
  Web de fournisseur | Assistants d'inscription/cache de fournisseur de récupération Web | | `plugin-sdk/provider-web-search-config-contract` | Assistants de configuration de recherche Web de fournisseur | Assistants étroits de configuration/identifiants de recherche Web pour les fournisseurs qui n'ont pas besoin de câblage d'activation de plugin | | `plugin-sdk/provider-web-search-contract` |
  Assistants de contrat de recherche Web de fournisseur | Assistants étroits de contrat de configuration/identifiants de recherche Web tels que `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig`, et définisseurs/getteurs d'identifiants délimités | | `plugin-sdk/provider-web-search` | Assistants de recherche Web de fournisseur | Assistants
  d'inscription/cache/exécution de fournisseur de recherche Web | | `plugin-sdk/provider-tools` | Assistants de compatibilité d'outil/schéma de fournisseur | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, nettoyage de schéma Gemini + diagnostics, et assistants de compatibilité xAI tels que `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` |
  Assistants d'utilisation de fournisseur | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage`, et autres assistants d'utilisation de fournisseur | | `plugin-sdk/provider-stream` | Assistants d'enveloppeur de flux de fournisseur | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, types d'enveloppeur de flux, et assistants d'enveloppeur
  partagés CLI/Bedrock/Google/Kilocode/CLI/CLI/CLI/Z.A.I/CLI/Copilot | | `plugin-sdk/keyed-async-queue` | File asynchrone ordonnée | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | Assistants de média partagé | Assistants de récupération/transformation/stockage de média ainsi que bâtisseurs de charge utile de média | | `plugin-sdk/media-generation-runtime` | Assistants partagés de génération de
  média | Assistants de basculement partagés, sélection de candidats et messagerie de modèle manquant pour la génération d'image/vidéo/musique | | `plugin-sdk/media-understanding` | Assistants de compréhension de média | Types de fournisseur de compréhension de média ainsi que exportations d'assistants image/audio orientés fournisseur | | `plugin-sdk/text-runtime` | Assistants de texte partagé |
  Suppression de texte visible par l'assistant, assistants de rendu/découpage/tableau markdown, assistants de rédaction, assistants de balise de directive, utilitaires de texte sécurisé et assistants connexes de texte/journalisation | | `plugin-sdk/text-chunking` | Assistants de découpage de texte | Assistant de découpage de texte sortant | | `plugin-sdk/speech` | Assistants de parole | Types de
  fournisseur de parole ainsi que assistants de directive, de registre et de validation orientés fournisseur | | `plugin-sdk/speech-core` | Noyau de parole partagé | Types de fournisseur de parole, registre, directives, normalisation | | `plugin-sdk/realtime-transcription` | Assistants de transcription en temps réel | Types de fournisseur et assistants de registre | | `plugin-sdk/realtime-voice` |
  Assistants vocaux en temps réel | Types de fournisseur et assistants de registre | | `plugin-sdk/image-generation-core` | Noyau partagé de génération d'image | Types de génération d'image, basculement, authentification et assistants de registre | | `plugin-sdk/music-generation` | Assistants de génération de musique | Types de fournisseur/requête/résultat de génération de musique | |
  `plugin-sdk/music-generation-core` | Noyau partagé de génération de musique | Types de génération de musique, assistants de basculement, recherche de fournisseur et analyse de référence de modèle | | `plugin-sdk/video-generation` | Assistants de génération de vidéo | Types de fournisseur/requête/résultat de génération de vidéo | | `plugin-sdk/video-generation-core` | Noyau partagé de génération
  de vidéo | Types de génération de vidéo, assistants de basculement, recherche de fournisseur et analyse de référence de modèle | | `plugin-sdk/interactive-runtime` | Assistants de réponse interactive | Normalisation/réduction de charge utile de réponse interactive | | `plugin-sdk/channel-config-primitives` | Primitives de configuration de channel | Primitives étroites de schéma de configuration
  de channel | | `plugin-sdk/channel-config-writes` | Assistants d'écriture de configuration de channel | Assistants d'autorisation d'écriture de configuration de channel | | `plugin-sdk/channel-plugin-common` | Prélude de channel partagé | Exportations de prélude de plugin de channel partagé | | `plugin-sdk/channel-status` | Assistants de statut de channel | Assistants de résumé/instantané de
  statut de channel partagé | | `plugin-sdk/allowlist-config-edit` | Assistants de configuration de liste d'autorisation | Assistants de lecture/édition de configuration de liste d'autorisation | | `plugin-sdk/group-access` | Assistants d'accès de groupe | Assistants partagés de décision d'accès de groupe | | `plugin-sdk/direct-dm` | Assistants de DM direct | Assistants partagés
  d'authentification/garde de DM direct | | `plugin-sdk/extension-shared` | Assistants d'extension partagés | Primitives d'assistance de proxy ambiant et de channel passif/statut | | `plugin-sdk/webhook-targets` | Assistants de cible webhook | Assistants d'installation de route et de registre de cible webhook | | `plugin-sdk/webhook-path` | Assistants de chemin webhook | Assistants de
  normalisation de chemin webhook | | `plugin-sdk/web-media` | Assistants de média Web partagé | Assistants de chargement de média distant/local | | `plugin-sdk/zod` | Ré-exportation Zod | `zod` ré-exporté pour les consommateurs du SDK de plugin | | `plugin-sdk/memory-core` | Assistants groupés de noyau de mémoire | Surface d'assistance gestionnaire/configuration/fichier/CLI de mémoire | |
  `plugin-sdk/memory-core-engine-runtime` | Façade d'exécution du moteur de mémoire | Façade d'exécution de recherche/index de mémoire | | `plugin-sdk/memory-core-host-engine-foundation` | Moteur de fondation d'hôte de mémoire | Exportations du moteur de fondation d'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-embeddings` | Moteur d'intégration d'hôte de mémoire | Exportations du moteur
  d'intégration d'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-qmd` | Moteur QMD d'hôte de mémoire | Exportations du moteur QMD d'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-storage` | Moteur de stockage d'hôte de mémoire | Exportations du moteur de stockage d'hôte de mémoire | | `plugin-sdk/memory-core-host-multimodal` | Assistants multimodaux d'hôte de mémoire | Assistants
  multimodaux d'hôte de mémoire | | `plugin-sdk/memory-core-host-query` | Assistants de requête d'hôte de mémoire | Assistants de requête d'hôte de mémoire | | `plugin-sdk/memory-core-host-secret` | Assistants de secret d'hôte de mémoire | Assistants de secret d'hôte de mémoire | | `plugin-sdk/memory-core-host-events` | Assistants de journal d'événements d'hôte de mémoire | Assistants de journal
  d'événements d'hôte de mémoire | | `plugin-sdk/memory-core-host-status` | Assistants de statut d'hôte de mémoire | Assistants de statut d'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-cli` | Exécution CLI d'hôte de mémoire | Assistants d'exécution CLI d'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-core` | Exécution de base d'hôte de mémoire | Assistants d'exécution de base
  d'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-files` | Assistants de fichier/exécution d'hôte de mémoire | Assistants de fichier/exécution d'hôte de mémoire | | `plugin-sdk/memory-host-core` | Alias d'exécution de base d'hôte de mémoire | Alias neutre par fournisseur pour les assistants d'exécution de base d'hôte de mémoire | | `plugin-sdk/memory-host-events` | Alias de journal
  d'événements d'hôte de mémoire | Alias neutre par fournisseur pour les assistants de journal d'événements d'hôte de mémoire | | `plugin-sdk/memory-host-files` | Alias de fichier/exécution d'hôte de mémoire | Alias neutre par fournisseur pour les assistants de fichier/exécution d'hôte de mémoire | | `plugin-sdk/memory-host-markdown` | Assistants de markdown géré | Assistants partagés de markdown
  géré pour les plugins adjacents à la mémoire | | `plugin-sdk/memory-host-search` | Façade de recherche de mémoire active | Façade d'exécution différée du gestionnaire de recherche de mémoire active | | `plugin-sdk/memory-host-status` | Alias de statut d'hôte de mémoire | Alias neutre par fournisseur pour les assistants de statut d'hôte de mémoire | | `plugin-sdk/memory-lancedb` | Assistants
  groupés de memory-lancedb | Surface d'assistance memory-lancedb | | `plugin-sdk/testing` | Utilitaires de test | Assistants et simulacres de test |
</Accordion>

Ce tableau est volontairement le sous-ensemble commun de migration, et non la surface complète du SDK. La liste complète des plus de 200 points d'entrée se trouve dans `scripts/lib/plugin-sdk-entrypoints.json`.

Cette liste comprend encore certains utilitaires de plugins intégrés tels que `plugin-sdk/feishu`, `plugin-sdk/feishu-setup`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup` et `plugin-sdk/matrix*`. Ceux-ci restent exportés pour la maintenance et la compatibilité des plugins intégrés, mais ils sont intentionnellement omis du tableau de migration commun et ne sont pas la cible recommandée pour le nouveau code de plugin.

La même règle s'applique à d'autres familles d'assistants intégrés telles que :

- assistants de support du navigateur : `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support`
- Matrix : Matrix : `plugin-sdk/matrix*`
- LINE : `plugin-sdk/line*`
- IRC : `plugin-sdk/irc*`
- surfaces d'assistance/de plugin intégrées comme `plugin-sdk/googlechat`,
  `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles*`,
  `plugin-sdk/mattermost*`, `plugin-sdk/msteams`,
  `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`,
  `plugin-sdk/twitch`,
  `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`,
  `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`,
  `plugin-sdk/thread-ownership` et `plugin-sdk/voice-call`

`plugin-sdk/github-copilot-token` expose actuellement la surface étroite d'assistance aux jetons `DEFAULT_COPILOT_API_BASE_URL`,
`deriveCopilotApiBaseUrlFromToken` et `resolveCopilotApiToken`.

Utilisez l'import le plus étroit qui correspond à la tâche. Si vous ne trouvez pas d'export, vérifiez la source à `src/plugin-sdk/` ou demandez sur Discord.

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
- [Aperçu du SDK](/en/plugins/sdk-overview) — référence complète des importations de sous-chemins
- [Plugins de canal](/en/plugins/sdk-channel-plugins) — création de plugins de canal
- [Plugins de fournisseur](/en/plugins/sdk-provider-plugins) — création de plugins de fournisseur
- [Fonctionnement interne des plugins](/en/plugins/architecture) — exploration approfondie de l'architecture
- [Manifeste du plugin](/en/plugins/manifest) — référence du schéma du manifeste
