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

  <Step title="Générer et tester">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## Référence des chemins d'importation

<Accordion title="Tableau des chemins d'importation courants">
  | Chemin d'importation | Objectif | Principales exportations | | --- | --- | --- | | `plugin-sdk/plugin-entry` | Assistant d'entrée de plugin canonique | `definePluginEntry` | | `plugin-sdk/core` | Ré-exportation parapluie héritée pour les définitions/b Constructeurs d'entrée de channel | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | Exportation du schéma
  de configuration racine | `OpenClawSchema` | | `plugin-sdk/provider-entry` | Assistant d'entrée pour fournisseur unique | `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | Définitions et constructeurs d'entrée de channel ciblés | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | Assistants partagés
  pour l'assistant de configuration | Invite Allowlist, constructeurs de statut de configuration | | `plugin-sdk/setup-runtime` | Assistants d'exécution au moment de la configuration | Adaptateurs de correctif de configuration sans échec d'importation, assistants de note de recherche, `promptResolvedAllowFrom`, `splitSetupEntries`, Proxys de configuration délégués | |
  `plugin-sdk/setup-adapter-runtime` | Assistants d'adaptateur de configuration | `createEnvPatchedAccountSetupAdapter` | | `plugin-sdk/setup-tools` | Assistants d'outillage de configuration | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` | | `plugin-sdk/account-core` | Assistants multi-comptes | Assistants de liste/config/action-gate
  de compte | | `plugin-sdk/account-id` | Assistants d'identifiant de compte | `DEFAULT_ACCOUNT_ID`, normalisation de l'identifiant de compte | | `plugin-sdk/account-resolution` | Assistants de recherche de compte | Assistants de recherche de compte + repli par défaut | | `plugin-sdk/account-helpers` | Assistants de compte étroit | Assistants de liste/action de compte | |
  `plugin-sdk/channel-setup` | Adaptateurs de l'assistant de configuration | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, plus `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` | | `plugin-sdk/channel-pairing` | Primitives de couplage DM | `createChannelPairingController` | |
  `plugin-sdk/channel-reply-pipeline` | Câblage du préfixe de réponse + saisie | `createChannelReplyPipeline` | | `plugin-sdk/channel-config-helpers` | Usines d'adaptateurs de configuration | `createHybridChannelConfigAdapter` | | `plugin-sdk/channel-config-schema` | Constructeurs de schémas de configuration | Types de schémas de configuration de channel | | `plugin-sdk/telegram-command-config` |
  Assistants de configuration de commande Telegram | Normalisation du nom de commande, découpe de la description, validation des doublons/conflits | | `plugin-sdk/channel-policy` | Résolution de politique de groupe/DM | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | Assistants de cycle de vie du statut du compte et du flux de brouillon | `createAccountStatusSink`,
  assistants de finalisation de l'aperçu du brouillon | | `plugin-sdk/inbound-envelope` | Assistants d'enveloppe entrante | Assistants de constructeur d'enveloppe + route partagée | | `plugin-sdk/inbound-reply-dispatch` | Assistants de réponse entrante | Assistants partagés d'enregistrement et de répartition | | `plugin-sdk/messaging-targets` | Analyse de la cible de messagerie | Assistants
  d'analyse/correspondance de cible | | `plugin-sdk/outbound-media` | Assistants de média sortant | Chargement de média sortant partagé | | `plugin-sdk/outbound-runtime` | Assistants d'exécution sortante | Assistants de planification de la charge utile et du délégué d'envoi/identité sortante | | `plugin-sdk/thread-bindings-runtime` | Assistants de liaison de thread | Assistants d'adaptateur et de
  cycle de vie de liaison de thread | | `plugin-sdk/agent-media-payload` | Assistants de charge utile de média hérité | Constructeur de charge utile de média d'agent pour les dispositions de champs hérités | | `plugin-sdk/channel-runtime` | Shim de compatibilité obsolète | Utilitaires d'exécution de channel hérité uniquement | | `plugin-sdk/channel-send-result` | Types de résultats d'envoi | Types
  de résultats de réponse | | `plugin-sdk/runtime-store` | Stockage persistant de plugin | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | Assistants d'exécution larges | Assistants d'exécution/journalisation/sauvegarde/installation de plugin | | `plugin-sdk/runtime-env` | Assistants d'environnement d'exécution étroit | Enregistreur/environnement d'exécution, délai d'attente, nouvelle
  tentative et assistants de temporisation | | `plugin-sdk/plugin-runtime` | Assistants d'exécution de plugin partagés | Assistants de commandes/hooks/http/interactifs de plugin | | `plugin-sdk/hook-runtime` | Assistants de pipeline de hook | Assistants partagés de pipeline de hook webhook/interne | | `plugin-sdk/lazy-runtime` | Assistants d'exécution paresseux | `createLazyRuntimeModule`,
  `createLazyRuntimeMethod`, `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`, `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Assistants de processus | Assistants d'exécution partagés | | `plugin-sdk/cli-runtime` | Assistants d'exécution CLI | Formatage des commandes, attentes, assistants de version | | `plugin-sdk/gateway-runtime` | Assistants Gateway | Client
  Gateway et assistants de correctif de statut de channel | | `plugin-sdk/config-runtime` | Assistants de configuration | Assistants de chargement/écriture de configuration | | `plugin-sdk/telegram-command-config` | Assistants de commande Telegram | Assistants de validation de commande Telegram stables en repli lorsque la surface de contrat Telegram groupée n'est pas disponible | |
  `plugin-sdk/approval-runtime` | Assistants d'invite d'approbation | Charge utile d'approbation exéc/plugin, assistants de capacité/profil d'approbation, assistants d'exécution/routage d'approbation natifs | | `plugin-sdk/approval-auth-runtime` | Assistants d'auth d'approbation | Résolution de l'approubateur, auth d'action même-chat | | `plugin-sdk/approval-client-runtime` | Assistants de client
  d'approbation | Assistants de profil/filtre d'approbation d'exécution native | | `plugin-sdk/approval-delivery-runtime` | Assistants de livraison d'approbation | Adaptateurs de livraison/capacité d'approbation natifs | | `plugin-sdk/approval-gateway-runtime` | Assistants de passerelle d'approbation | Assistant partagé de résolution de passerelle d'approbation | |
  `plugin-sdk/approval-handler-adapter-runtime` | Assistants d'adaptateur d'approbation | Assistants de chargement d'adaptateur d'approbation natif léger pour les points d'entrée de channel à chaud | | `plugin-sdk/approval-handler-runtime` | Assistants de gestionnaire d'approbation | Assistants d'exécution de gestionnaire d'approbation plus larges ; préférez les coutures d'adaptateur/passerelle
  plus étroites lorsqu'elles suffisent | | `plugin-sdk/approval-native-runtime` | Assistants de cible d'approbation | Assistants de liaison de compte/cible d'approbation natifs | | `plugin-sdk/approval-reply-runtime` | Assistants de réponse d'approbation | Assistants de charge utile de réponse d'approbation exéc/plugin | | `plugin-sdk/channel-runtime-context` | Assistants de contexte d'exécution
  de channel | Assistants génériques register/get/watch de contexte d'exécution de channel | | `plugin-sdk/security-runtime` | Assistants de sécurité | Assistants partagés de confiance, verrouillage DM, contenu externe et collecte de secrets | | `plugin-sdk/ssrf-policy` | Assistants de stratégie SSRF | Assistants de stratégie de réseau privé et de liste d'autorisation d'hôte | |
  `plugin-sdk/ssrf-runtime` | Assistants d'exécution SSRF | Répartiteur épinglé, récupération gardée, assistants de stratégie SSRF | | `plugin-sdk/collection-runtime` | Assistants de cache borné | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | Assistants de verrouillage de diagnostic | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | Assistants de
  formatage d'erreur | `formatUncaughtError`, `isApprovalNotFoundError`, assistants de graphe d'erreur | | `plugin-sdk/fetch-runtime` | Assistants de récupération/proxy enveloppés | `resolveFetch`, assistants de proxy | | `plugin-sdk/host-runtime` | Assistants de normalisation d'hôte | `normalizeHostname`, `normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | Assistants de nouvelle tentative |
  `RetryConfig`, `retryAsync`, exécutants de stratégie | | `plugin-sdk/allow-from` | Formatage de la liste d'autorisation | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | Mappage d'entrée de liste d'autorisation | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | Assistants de verrouillage de commande et de surface de commande | `resolveControlCommandGate`,
  assistants d'autorisation d'expéditeur, assistants de registre de commande | | `plugin-sdk/command-status` | Moteurs de rendu d'aide/statut de commande | `buildCommandsMessage`, `buildCommandsMessagePaginated`, `buildHelpMessage` | | `plugin-sdk/secret-input` | Analyse d'entrée de secret | Assistants d'entrée de secret | | `plugin-sdk/webhook-ingress` | Assistants de requête Webhook |
  Utilitaires de cible Webhook | | `plugin-sdk/webhook-request-guards` | Assistants de garde de corps Webhook | Assistants de lecture/limite de corps de requête | | `plugin-sdk/reply-runtime` | Exécution de réponse partagée | Répartition entrante, battement de cœur, planificateur de réponse, découpage | | `plugin-sdk/reply-dispatch-runtime` | Assistants de répartition de réponse étroite |
  Assistants de répartition + fournisseur Finalize | | `plugin-sdk/reply-history` | Assistants d'historique de réponse | `buildHistoryContext`, `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry`, `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | Planification de référence de réponse | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Assistants de
  fragment de réponse | Assistants de découpage de texte/markdown | | `plugin-sdk/session-store-runtime` | Assistants de magasin de session | Assistants de chemin de magasin + mis à jour à | | `plugin-sdk/state-paths` | Assistants de chemin d'état | Assistants de répertoire d'état et OAuth | | `plugin-sdk/routing` | Assistants de clé de routage/session | `resolveAgentRoute`,
  `buildAgentSessionKey`, `resolveDefaultAgentBoundAccountId`, assistants de normalisation de clé de session | | `plugin-sdk/status-helpers` | Assistants de statut de channel | Constructeurs de résumé de statut de channel/compte, valeurs par défaut d'état d'exécution, assistants de métadonnées de problème | | `plugin-sdk/target-resolver-runtime` | Assistants de résolveur de cible | Assistants
  partagés de résolveur de cible | | `plugin-sdk/string-normalization-runtime` | Assistants de normalisation de chaîne | Assistants de normalisation de chaîne/slug | | `plugin-sdk/request-url` | Assistants d'URL de requête | Extraire les URL de chaîne des entrées de type requête | | `plugin-sdk/run-command` | Assistants de commande minutée | Exécuteur de commande minutée avec stdout/stderr
  normalisés | | `plugin-sdk/param-readers` | Lecteurs de paramètres | Lecteurs de paramètres outil/CLI courants | | `plugin-sdk/tool-payload` | Extraction de charge utile d'outil | Extraire les charges utiles normalisées des objets de résultat d'outil | | `plugin-sdk/tool-send` | Extraction d'envoi d'outil | Extraire les champs de cible d'envoi canoniques des arguments d'outil | |
  `plugin-sdk/temp-path` | Assistants de chemin temporaire | Assistants partagés de chemin de téléchargement temporaire | | `plugin-sdk/logging-core` | Assistants de journalisation | Assistants de journalisation de sous-système et de rédaction | | `plugin-sdk/markdown-table-runtime` | Assistants de tableau Markdown | Assistants de mode de tableau Markdown | | `plugin-sdk/reply-payload` | Types de
  réponse de message | Types de charge utile de réponse | | `plugin-sdk/provider-setup` | Assistants de configuration de fournisseur local/auto-hébergé sélectionné | Assistants de découverte/configuration de fournisseur auto-hébergé | | `plugin-sdk/self-hosted-provider-setup` | Assistants de configuration de fournisseur auto-hébergé compatibles OpenAI ciblés | Mêmes assistants de
  découverte/configuration de fournisseur auto-hébergé | | `plugin-sdk/provider-auth-runtime` | Assistants d'auth d'exécution de fournisseur | Assistants de résolution de clé d'API d'exécution API | | `plugin-sdk/provider-auth-api-key` | Assistants de configuration de clé d'API de fournisseur API | Assistants d'écriture de profil/onboarding de clé d'API API | | `plugin-sdk/provider-auth-result` |
  Assistants de résultat d'auth de fournisseur | Constructeur de résultat d'auth OAuth standard | | `plugin-sdk/provider-auth-login` | Assistants de connexion interactive de fournisseur | Assistants partagés de connexion interactive | | `plugin-sdk/provider-env-vars` | Assistants de variable d'environnement de fournisseur | Assistants de recherche de variable d'environnement d'auth de fournisseur
  | | `plugin-sdk/provider-model-shared` | Assistants partagés de modèle/relecture de fournisseur | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructeurs partagés de stratégie de relecture, assistants de point de terminaison de fournisseur et assistants de normalisation d'identifiant de modèle | | `plugin-sdk/provider-catalog-shared` | Assistants partagés
  de catalogue de fournisseur | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | Correctifs d'onboarding de fournisseur | Assistants de configuration d'onboarding | | `plugin-sdk/provider-http` | Assistants HTTP de fournisseur | Assistants de capacité HTTP/point de
  terminaison de fournisseur génériques, y compris les assistants de formulaire multipart de transcription audio | | `plugin-sdk/provider-web-fetch` | Assistants de récupération Web de fournisseur | Assistants d'inscription/cache de fournisseur de récupération Web | | `plugin-sdk/provider-web-search-config-contract` | Assistants de configuration de recherche Web de fournisseur | Assistants de
  configuration/identifiants de recherche Web étroits pour les fournisseurs qui n'ont pas besoin de câblage d'activation de plugin | | `plugin-sdk/provider-web-search-contract` | Assistants de contrat de recherche Web de fournisseur | Assistants de contrat de configuration/identifiants de recherche Web étroits tels que `createWebSearchProviderContractFields`, `enablePluginInConfig`,
  `resolveProviderWebSearchPluginConfig`, et setters/getters d'identifiants délimités | | `plugin-sdk/provider-web-search` | Assistants de recherche Web de fournisseur | Assistants d'inscription/cache/exécution de fournisseur de recherche Web | | `plugin-sdk/provider-tools` | Assistants de compatibilité d'outil/schéma de fournisseur | `ProviderToolCompatFamily`,
  `buildProviderToolCompatFamilyHooks`, nettoyage + diagnostics de schéma Gemini et assistants de compatibilité xAI tels que `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | Assistants d'utilisation de fournisseur | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage`, et autres assistants d'utilisation de fournisseur | |
  `plugin-sdk/provider-stream` | Assistants d'enveloppeur de flux de fournisseur | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, types d'enveloppeur de flux et assistants d'enveloppeur partagés Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-transport-runtime` | Assistants de transport de
  fournisseur | Assistants de transport de fournisseur natifs tels que la récupération gardée, les transformations de message de transport et les flux d'événements de transport inscriptibles | | `plugin-sdk/keyed-async-queue` | File d'attente asynchrone ordonnée | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | Assistants de média partagé | Assistants de récupération/transformation/stockage de
  média plus constructeurs de charge utile de média | | `plugin-sdk/media-generation-runtime` | Assistants partagés de génération de média | Assistants partagés de basculement, sélection de candidats et messagerie de modèle manquant pour la génération d'image/vidéo/musique | | `plugin-sdk/media-understanding` | Assistants de compréhension des médias | Types de fournisseur de compréhension des
  médias plus exportations d'assistants image/audio orientés fournisseur | | `plugin-sdk/text-runtime` | Assistants de texte partagé | Suppression du texte visible par l'assistant, assistants de rendu/découpage/tableau markdown, assistants de rédaction, assistants de balise de directive, utilitaires de texte sécurisé et assistants de texte/journalisation connexes | | `plugin-sdk/text-chunking` |
  Assistants de découpage de texte | Assistant de découpage de texte sortant | | `plugin-sdk/speech` | Assistants de parole | Types de fournisseur de parole plus assistants de directive, de registre et de validation orientés fournisseur | | `plugin-sdk/speech-core` | Noyau de parole partagé | Types, registre, directives et normalisation des fournisseurs de parole | |
  `plugin-sdk/realtime-transcription` | Assistants de transcription en temps réel | Types de fournisseur, assistants de registre et assistant de session WebSocket partagé | | `plugin-sdk/realtime-voice` | Assistants vocaux en temps réel | Types de fournisseur et assistants de registre | | `plugin-sdk/image-generation-core` | Noyau partagé de génération d'images | Types, basculement, auth et
  assistants de registre de génération d'images | | `plugin-sdk/music-generation` | Assistants de génération de musique | Types de fournisseur/requête/résultat de génération de musique | | `plugin-sdk/music-generation-core` | Noyau partagé de génération de musique | Types, assistants de basculement, recherche de fournisseur et analyse de référence de modèle de génération de musique | |
  `plugin-sdk/video-generation` | Assistants de génération de vidéo | Types de fournisseur/requête/résultat de génération de vidéo | | `plugin-sdk/video-generation-core` | Noyau partagé de génération de vidéo | Types, assistants de basculement, recherche de fournisseur et analyse de référence de modèle de génération de vidéo | | `plugin-sdk/interactive-runtime` | Assistants de réponse interactive
  | Normalisation/réduction de la charge utile de réponse interactive | | `plugin-sdk/channel-config-primitives` | Primitives de configuration de channel | Primitives de schéma de configuration de channel étroites | | `plugin-sdk/channel-config-writes` | Assistants d'écriture de configuration de channel | Assistants d'autorisation d'écriture de configuration de channel | |
  `plugin-sdk/channel-plugin-common` | Prélude de channel partagé | Exportations de prélude de plugin de channel partagé | | `plugin-sdk/channel-status` | Assistants de statut de channel | Assistants partagés de instantané/résumé de statut de channel | | `plugin-sdk/allowlist-config-edit` | Assistants de configuration de liste d'autorisation | Assistants de lecture/édition de configuration de
  liste d'autorisation | | `plugin-sdk/group-access` | Assistants d'accès au groupe | Assistants partagés de décision d'accès au groupe | | `plugin-sdk/direct-dm` | Assistants de DM direct | Assistants partagés d'auth/garde de DM direct | | `plugin-sdk/extension-shared` | Assistants d'extension partagés | Primitives d'assistant de proxy ambiant et de statut/channel passif | |
  `plugin-sdk/webhook-targets` | Assistants de cible Webhook | Assistants d'installation de route et de registre de cible Webhook | | `plugin-sdk/webhook-path` | Assistants de chemin Webhook | Assistants de normalisation de chemin Webhook | | `plugin-sdk/web-media` | Assistants de média Web partagé | Assistants de chargement de média local/distant | | `plugin-sdk/zod` | Ré-exportation Zod | `zod`
  ré-exporté pour les consommateurs du SDK de plugin | | `plugin-sdk/memory-core` | Assistants de mémoire de base groupée | Surface d'assistant de gestionnaire/config/fichier/CLI de mémoire | | `plugin-sdk/memory-core-engine-runtime` | Façade d'exécution du moteur de mémoire | Façade d'exécution d'index/recherche de mémoire | | `plugin-sdk/memory-core-host-engine-foundation` | Moteur de fondation
  de l'hôte de mémoire | Exportations du moteur de fondation de l'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-embeddings` | Moteur d'intégration de l'hôte de mémoire | Contrats d'intégration de mémoire, accès au registre, fournisseur local et assistants de lot/distant génériques ; les fournisseurs distants concrets vivent dans leurs plugins propriétaires | |
  `plugin-sdk/memory-core-host-engine-qmd` | Moteur QMD de l'hôte de mémoire | Exportations du moteur QMD de l'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-storage` | Moteur de stockage de l'hôte de mémoire | Exportations du moteur de stockage de l'hôte de mémoire | | `plugin-sdk/memory-core-host-multimodal` | Assistants multimodaux de l'hôte de mémoire | Assistants multimodaux de
  l'hôte de mémoire | | `plugin-sdk/memory-core-host-query` | Assistants de requête de l'hôte de mémoire | Assistants de requête de l'hôte de mémoire | | `plugin-sdk/memory-core-host-secret` | Assistants de secret de l'hôte de mémoire | Assistants de secret de l'hôte de mémoire | | `plugin-sdk/memory-core-host-events` | Assistants de journal d'événements de l'hôte de mémoire | Assistants de
  journal d'événements de l'hôte de mémoire | | `plugin-sdk/memory-core-host-status` | Assistants de statut de l'hôte de mémoire | Assistants de statut de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-cli` | Exécution CLI de l'hôte de mémoire | Assistants d'exécution CLI de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-core` | Exécution de base de l'hôte de mémoire |
  Assistants d'exécution de base de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-files` | Assistants de fichier/exécution de l'hôte de mémoire | Assistants de fichier/exécution de l'hôte de mémoire | | `plugin-sdk/memory-host-core` | Alias d'exécution de base de l'hôte de mémoire | Alias neutre vis-à-vis du fournisseur pour les assistants d'exécution de base de l'hôte de mémoire | |
  `plugin-sdk/memory-host-events` | Alias de journal d'événements de l'hôte de mémoire | Alias neutre vis-à-vis du fournisseur pour les assistants de journal d'événements de l'hôte de mémoire | | `plugin-sdk/memory-host-files` | Alias de fichier/exécution de l'hôte de mémoire | Alias neutre vis-à-vis du fournisseur pour les assistants de fichier/exécution de l'hôte de mémoire | |
  `plugin-sdk/memory-host-markdown` | Assistants de markdown géré | Assistants partagés de markdown géré pour les plugins adjacents à la mémoire | | `plugin-sdk/memory-host-search` | Façade de recherche de mémoire active | Façade d'exécution de gestionnaire de recherche de mémoire active paresseuse | | `plugin-sdk/memory-host-status` | Alias de statut de l'hôte de mémoire | Alias neutre vis-à-vis
  du fournisseur pour les assistants de statut de l'hôte de mémoire | | `plugin-sdk/memory-lancedb` | Assistants groupés de memory-lancedb | Surface d'assistant memory-lancedb | | `plugin-sdk/testing` | Utilitaires de test | Assistants et simulations de test |
</Accordion>

Ce tableau représente intentionnellement le sous-ensemble de migration commun, et non l'ensemble de la surface du SDK. La liste complète des 200+ points d'entrée se trouve dans `scripts/lib/plugin-sdk-entrypoints.json`.

Cette liste inclut encore certaines interfaces d'assistance pour les plugins intégrés, telles que `plugin-sdk/feishu`, `plugin-sdk/feishu-setup`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup` et `plugin-sdk/matrix*`. Celles-ci restent exportées pour la maintenance et la compatibilité des plugins intégrés, mais elles sont intentionnellement omises du tableau de migration commun et ne sont pas la cible recommandée pour le nouveau code de plugin.

La même règle s'applique à d'autres familles d'assistants intégrés telles que :

- assistants de support de navigateur : `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support`
- Matrix : `plugin-sdk/matrix*`
- LINE : `plugin-sdk/line*`
- IRC : `plugin-sdk/irc*`
- surfaces d'assistance/plugin intégrées comme `plugin-sdk/googlechat`,
  `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles*`,
  `plugin-sdk/mattermost*`, `plugin-sdk/msteams`,
  `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`,
  `plugin-sdk/twitch`,
  `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`,
  `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`,
  `plugin-sdk/thread-ownership`, et `plugin-sdk/voice-call`

`plugin-sdk/github-copilot-token` expose actuellement la surface étroite d'assistance de jetons `DEFAULT_COPILOT_API_BASE_URL`,
`deriveCopilotApiBaseUrlFromToken` et `resolveCopilotApiToken`.

Utilisez l'import le plus précis qui correspond à la tâche. Si vous ne trouvez pas d'exportation, vérifiez la source sur `src/plugin-sdk/` ou demandez sur Discord.

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

- [Getting Started](/fr/plugins/building-plugins) — créez votre premier plugin
- [SDK Overview](/fr/plugins/sdk-overview) — référence complète des imports de sous-chemins
- [Plugins de channel](/fr/plugins/sdk-channel-plugins) — création de plugins de channel
- [Plugins de provider](/fr/plugins/sdk-provider-plugins) — création de plugins de provider
- [Plugin Internals](/fr/plugins/architecture) — approfondissement de l'architecture
- [Manifeste de plugin](/fr/plugins/manifest) — référence du schéma du manifeste
