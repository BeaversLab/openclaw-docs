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

- **`openclaw/plugin-sdk/compat`** — un import unique qui réexportait des douzaines d'assistants. Il a été introduit pour maintenir le fonctionnement des plugins basés sur des hooks plus anciens pendant que la nouvelle architecture de plugin était en cours de construction.
- **`openclaw/extension-api`** — un pont qui donnait aux plugins un accès direct aux assistants côté hôte tels que le runner d'agent intégré.

Ces deux surfaces sont désormais **dépréciées**. Elles fonctionnent toujours à l'exécution, mais les nouveaux plugins ne doivent pas les utiliser, et les plugins existants devraient migrer avant que la prochaine version majeure ne les supprime.

<Warning>La couche de compatibilité descendante sera supprimée dans une future version majeure. Les plugins qui importent toujours de ces interfaces cesseront de fonctionner à ce moment-là.</Warning>

## Pourquoi ce changement

L'ancienne approche posait des problèmes :

- **Démarrage lent** — importer un seul helper chargeait des dizaines de modules non liés
- **Dépendances circulaires** — les ré-exportations larges facilitaient la création de cycles d'importation
- **Surface API peu claire** — impossible de distinguer les exportations stables des exportations internes

Le SDK de plugin moderne résout ce problème : chaque chemin d'importation (`openclaw/plugin-sdk/\<subpath\>`) est un petit module autonome avec un objectif clair et un contrat documenté.

Les raccourcis de commodité hérités pour les fournisseurs de canals groupés ont également disparu. Les importations telles que `openclaw/plugin-sdk/slack`, `openclaw/plugin-sdk/discord`, `openclaw/plugin-sdk/signal`, `openclaw/plugin-sdk/whatsapp`, les raccourcis d'assistants de marque de canal, et `openclaw/plugin-sdk/telegram-core` étaient des raccourcis privés de mono-repo, et non des contrats de plugin stables. Utilisez plutôt des sous-chemins génériques étroits du SDK. Dans l'espace de travail du plugin groupé, conservez les assistants détenus par le fournisseur dans le propre `api.ts` ou `runtime-api.ts` de ce plugin.

Exemples actuels de fournisseurs groupés :

- Anthropic conserve les assistants de flux spécifiques à Claude dans son propre raccourci `api.ts` / `contract-api.ts`
- OpenAI conserve les constructeurs de fournisseurs, les assistants de modèle par défaut et les constructeurs de fournisseurs en temps réel dans son propre `api.ts`
- OpenRouter conserve le constructeur de fournisseur et les assistants de configuration/onboarding dans son propre `api.ts`

## Comment migrer

<Steps>
  <Step title="Audit Windows wrapper fallback behavior">
    Si votre plugin utilise `openclaw/plugin-sdk/windows-spawn`, les wrappers Windows
    `.cmd`/`.bat` non résolus échouent désormais en mode fermé, sauf si vous passez explicitement
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

    Si votre appelant ne repose pas intentionnellement sur le repli (fallback) du shell, ne définissez pas
    `allowShellFallback` et gérez plutôt l'erreur renvoyée.

  </Step>

  <Step title="Find deprecated imports">
    Recherchez dans votre plugin les importations provenant de l'une ou l'autre des surfaces dépréciées :

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="Replace with focused imports">
    Chaque exportation de l'ancienne surface correspond à un chemin d'importation moderne spécifique :

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

    Pour les assistants côté hôte, utilisez le runtime de plugin injecté au lieu d'importer
    directement :

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    Le même modèle s'applique aux autres assistants de pont (bridge) hérités :

    | Ancienne importation | Équivalent moderne |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | session store helpers | `api.runtime.agent.session.*` |

  </Step>

  <Step title="Build and test">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## Import path reference

<Accordion title="Tableau des chemins d'importation courants">
  | Chemin d'importation | Objectif | Exportations clés | | --- | --- | --- | | `plugin-sdk/plugin-entry` | Assistant d'entrée de plugin canonique | `definePluginEntry` | | `plugin-sdk/core` | Ré-exportation parapluie héritée pour les définitions/constructeurs d'entrée de canal | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | Exportation du schéma de
  configuration racine | `OpenClawSchema` | | `plugin-sdk/provider-entry` | Assistant d'entrée à fournisseur unique | `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | Définitions et constructeurs d'entrée de canal ciblés | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | Assistants partagés de
  l'assistant de configuration | Prompts de liste d'autorisation, constructeurs de statut de configuration | | `plugin-sdk/setup-runtime` | Assistants d'exécution au moment de la configuration | Adaptateurs de correctif de configuration sécurisés pour l'importation, assistants de note de recherche, `promptResolvedAllowFrom`, `splitSetupEntries`, proxies de configuration délégués | |
  `plugin-sdk/setup-adapter-runtime` | Assistants d'adaptateur de configuration | `createEnvPatchedAccountSetupAdapter` | | `plugin-sdk/setup-tools` | Assistants d'outillage de configuration | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` | | `plugin-sdk/account-core` | Assistants multi-comptes | Assistants de liste/config/garde
  d'action de compte | | `plugin-sdk/account-id` | Assistants d'ID de compte | `DEFAULT_ACCOUNT_ID`, normalisation de l'ID de compte | | `plugin-sdk/account-resolution` | Assistants de recherche de compte | Assistants de recherche de compte + secours par défaut | | `plugin-sdk/account-helpers` | Assistants de compte étroits | Assistants de liste/action de compte | | `plugin-sdk/channel-setup` |
  Adaptateurs de l'assistant de configuration | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, ainsi que `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` | | `plugin-sdk/channel-pairing` | Primitives d'appariement DM | `createChannelPairingController` | |
  `plugin-sdk/channel-reply-pipeline` | Câblage du préfixe de réponse + de la frappe | `createChannelReplyPipeline` | | `plugin-sdk/channel-config-helpers` | Usines d'adaptateurs de configuration | `createHybridChannelConfigAdapter` | | `plugin-sdk/channel-config-schema` | Constructeurs de schémas de configuration | Types de schémas de configuration de canal | |
  `plugin-sdk/telegram-command-config` | Assistants de configuration de commande Telegram | Normalisation du nom de commande, découpe de la description, validation des doublons/conflits | | `plugin-sdk/channel-policy` | Résolution de stratégie de groupe/DM | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | Suivi de l'état du compte | `createAccountStatusSink` | |
  `plugin-sdk/inbound-envelope` | Assistants d'enveloppe entrante | Assistants partagés pour la route + le constructeur d'enveloppe | | `plugin-sdk/inbound-reply-dispatch` | Assistants de réponse entrante | Assistants partagés d'enregistrement et de répartition | | `plugin-sdk/messaging-targets` | Analyse de la cible de messagerie | Assistants d'analyse/de correspondance de cible | |
  `plugin-sdk/outbound-media` | Assistants de média sortant | Chargement partagé de média sortant | | `plugin-sdk/outbound-runtime` | Assistants d'exécution sortants | Assistants de délégué d'identité/envoi sortant | | `plugin-sdk/thread-bindings-runtime` | Assistants de liaison de fil | Assistants de cycle de vie et d'adaptateur de liaison de fil | | `plugin-sdk/agent-media-payload` | Assistants
  de payload de média hérité | Constructeur de payload de média d'agent pour les mises en page de champ héritées | | `plugin-sdk/channel-runtime` | Shim de compatibilité obsolète | Utilitaires d'exécution de canal hérités uniquement | | `plugin-sdk/channel-send-result` | Types de résultats d'envoi | Types de résultats de réponse | | `plugin-sdk/runtime-store` | Stockage persistant de plugin |
  `createPluginRuntimeStore` | | `plugin-sdk/runtime` | Assistants d'exécution larges | Assistants d'exécution/journalisation/sauvegarde/installation de plugin | | `plugin-sdk/runtime-env` | Assistants d'exécution d'environnement étroits | Journalisation/exécution, délai d'attente, nouvelle tentative et assistants de repli | | `plugin-sdk/plugin-runtime` | Assistants partagés d'exécution de plugin
  | Assistants de commandes/hooks/http/interactifs de plugin | | `plugin-sdk/hook-runtime` | Assistants de pipeline de hook | Assistants partagés de pipeline de webhook/hook interne | | `plugin-sdk/lazy-runtime` | Assistants d'exécution différés | `createLazyRuntimeModule`, `createLazyRuntimeMethod`, `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`, `createLazyRuntimeSurface` | |
  `plugin-sdk/process-runtime` | Assistants de processus | Assistants partagés d'exécution | | `plugin-sdk/cli-runtime` | Assistants d'exécution CLI | Mise en forme des commandes, attentes, assistants de version | | `plugin-sdk/gateway-runtime` | Assistants Gateway | Assistants de client Gateway et de correctif de statut de canal | | `plugin-sdk/config-runtime` | Assistants de configuration |
  Assistants de chargement/écriture de configuration | | `plugin-sdk/telegram-command-config` | Assistants de commande Telegram | Assistants de validation de commande Telegram stables en secours lorsque la surface de contrat Telegram groupée n'est pas disponible | | `plugin-sdk/approval-runtime` | Assistants de prompt d'approbation | Payload d'approbation d'exécution/plugin, assistants de
  capacité/profil d'approbation, assistants d'exécution/routage d'approbation natifs | | `plugin-sdk/approval-auth-runtime` | Assistants d'auth d'approbation | Résolution de l'approbateur, auth d'action même-chat | | `plugin-sdk/approval-client-runtime` | Assistants de client d'approbation | Assistants de profil/filtre d'approbation d'exécution natifs | | `plugin-sdk/approval-delivery-runtime` |
  Assistants de livraison d'approbation | Adaptateurs de capacité/livraison d'approbation natifs | | `plugin-sdk/approval-native-runtime` | Assistants de cible d'approbation | Assistants de liaison de cible/compte d'approbation natifs | | `plugin-sdk/approval-reply-runtime` | Assistants de réponse d'approbation | Assistants de payload de réponse d'approbation d'exécution/plugin | |
  `plugin-sdk/security-runtime` | Assistants de sécurité | Assistants de confiance partagée, de restriction DM, de contenu externe et de collection de secrets | | `plugin-sdk/ssrf-policy` | Assistants de stratégie SSRF | Assistants de liste d'autorisation d'hôte et de stratégie de réseau privé | | `plugin-sdk/ssrf-runtime` | Assistants d'exécution SSRF | Répartiteur épinglé, récupération gardée,
  assistants de stratégie SSRF | | `plugin-sdk/collection-runtime` | Assistants de cache borné | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | Assistants de restriction de diagnostic | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | Assistants de mise en forme des erreurs | `formatUncaughtError`, `isApprovalNotFoundError`, assistants de graphe
  d'erreurs | | `plugin-sdk/fetch-runtime` | Assistants de récupération/proxy encapsulés | `resolveFetch`, assistants de proxy | | `plugin-sdk/host-runtime` | Assistants de normalisation d'hôte | `normalizeHostname`, `normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | Assistants de nouvelle tentative | `RetryConfig`, `retryAsync`, moteurs de stratégie | | `plugin-sdk/allow-from` | Mise en
  forme de la liste d'autorisation | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | Mappage d'entrée de liste d'autorisation | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | Assistants de restriction et de surface de commande | `resolveControlCommandGate`, assistants d'autorisation d'expéditeur, assistants de registre de commandes | | `plugin-sdk/secret-input` |
  Analyse de l'entrée secrète | Assistants d'entrée secrète | | `plugin-sdk/webhook-ingress` | Assistants de requête webhook | Utilitaires de cible webhook | | `plugin-sdk/webhook-request-guards` | Assistants de garde de corps webhook | Assistants de lecture/limite du corps de la requête | | `plugin-sdk/reply-runtime` | Exécution de réponse partagée | Répartition entrante, pulsation, planificateur
  de réponse, découpage | | `plugin-sdk/reply-dispatch-runtime` | Assistants de répartition de réponse étroite | Assistants de finalisation + répartition de fournisseur | | `plugin-sdk/reply-history` | Assistants d'historique de réponse | `buildHistoryContext`, `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry`, `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` |
  Planification de référence de réponse | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Assistants de découpage de réponse | Assistants de découpage de texte/markdown | | `plugin-sdk/session-store-runtime` | Assistants de magasin de session | Assistants de chemin de magasin + mis à jour à | | `plugin-sdk/state-paths` | Assistants de chemin d'état | Assistants de répertoire d'état
  et OAuth | | `plugin-sdk/routing` | Assistants de clé de routage/session | `resolveAgentRoute`, `buildAgentSessionKey`, `resolveDefaultAgentBoundAccountId`, assistants de normalisation de clé de session | | `plugin-sdk/status-helpers` | Assistants de statut de canal | Constructeurs de résumé de statut de canal/compte, valeurs par défaut d'état d'exécution, assistants de métadonnées de problème |
  | `plugin-sdk/target-resolver-runtime` | Assistants de résolveur de cible | Assistants partagés de résolveur de cible | | `plugin-sdk/string-normalization-runtime` | Assistants de normalisation de chaîne | Assistants de normalisation de slug/chaîne | | `plugin-sdk/request-url` | Assistants d'URL de requête | Extraire les URL de chaîne des entrées de type requête | | `plugin-sdk/run-command` |
  Assistants de commande minutée | Lanceur de commande minutée avec stdout/stderr normalisés | | `plugin-sdk/param-readers` | Lecteurs de paramètres | Lecteurs de paramètres d'outil/CLI courants | | `plugin-sdk/tool-send` | Extraction d'envoi d'outil | Extraire les champs de cible d'envoi canoniques des arguments de l'outil | | `plugin-sdk/temp-path` | Assistants de chemin temporaire | Assistants
  partagés de chemin de téléchargement temporaire | | `plugin-sdk/logging-core` | Assistants de journalisation | Assistants de journal de sous-système et de rédaction | | `plugin-sdk/markdown-table-runtime` | Assistants de table Markdown | Assistants de mode de table Markdown | | `plugin-sdk/reply-payload` | Types de réponse de message | Types de payload de réponse | | `plugin-sdk/provider-setup`
  | Assistants de configuration de fournisseur local/auto-hébergé organisés | Assistants de découverte/configuration de fournisseur auto-hébergé | | `plugin-sdk/self-hosted-provider-setup` | Assistants ciblés de configuration de fournisseur auto-hébergé compatible OpenAI | Mêmes assistants de découverte/configuration de fournisseur auto-hébergé | | `plugin-sdk/provider-auth-runtime` | Assistants
  d'auth d'exécution de fournisseur | Assistants de résolution de clé API d'exécution | | `plugin-sdk/provider-auth-api-key` | Assistants de configuration de clé API de fournisseur | Assistants d'écriture de profil/d'intégration de clé API | | `plugin-sdk/provider-auth-result` | Assistants de résultat d'auth de fournisseur | Constructeur de résultat d'auth OAuth standard | |
  `plugin-sdk/provider-auth-login` | Assistants de connexion interactive de fournisseur | Assistants partagés de connexion interactive | | `plugin-sdk/provider-env-vars` | Assistants de variable d'environnement de fournisseur | Assistants de recherche de variable d'environnement d'auth de fournisseur | | `plugin-sdk/provider-model-shared` | Assistants partagés de modèle/relecture de fournisseur |
  `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructeurs partagés de stratégie de relecture, assistants de point de terminaison de fournisseur et assistants de normalisation d'ID de modèle | | `plugin-sdk/provider-catalog-shared` | Assistants partagés de catalogue de fournisseur | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`,
  `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | Correctifs d'intégration de fournisseur | Assistants de configuration d'intégration | | `plugin-sdk/provider-http` | Assistants HTTP de fournisseur | Assistants génériques de capacité HTTP/point de terminaison de fournisseur | | `plugin-sdk/provider-web-fetch` | Assistants de
  récupération web de fournisseur | Assistants d'inscription/cache de fournisseur de récupération web | | `plugin-sdk/provider-web-search` | Assistants de recherche web de fournisseur | Assistants d'inscription/cache/configuration de fournisseur de recherche web | | `plugin-sdk/provider-tools` | Assistants de compatibilité d'outil/schéma de fournisseur | `ProviderToolCompatFamily`,
  `buildProviderToolCompatFamilyHooks`, nettoyage de schéma Gemini + diagnostics, et assistants de compatibilité xAI tels que `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | Assistants d'utilisation de fournisseur | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage`, et autres assistants d'utilisation de fournisseur | |
  `plugin-sdk/provider-stream` | Assistants de wrapper de flux de fournisseur | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, types de wrapper de flux, et assistants partagés de wrapper Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/keyed-async-queue` | File asynchrone ordonnée | `KeyedAsyncQueue` | |
  `plugin-sdk/media-runtime` | Assistants partagés de média | Assistants de récupération/transformation/stockage de média plus constructeurs de payload de média | | `plugin-sdk/media-understanding` | Assistants de compréhension de média | Types de fournisseur de compréhension de média plus exportations d'assistants d'image/audio orientés fournisseur | | `plugin-sdk/text-runtime` | Assistants
  partagés de texte | Suppression de texte visible par l'assistant, assistants de rendu/découpage/table markdown, assistants de rédaction, assistants de balise de directive, utilitaires de texte sécurisé et assistants connexes de texte/journalisation | | `plugin-sdk/text-chunking` | Assistants de découpage de texte | Assistant de découpage de texte sortant | | `plugin-sdk/speech` | Assistants de
  parole | Types de fournisseur de parole plus assistants de directive, de registre et de validation orientés fournisseur | | `plugin-sdk/speech-core` | Cœur de parole partagé | Types de fournisseur de parole, registre, directives, normalisation | | `plugin-sdk/realtime-transcription` | Assistants de transcription en temps réel | Types de fournisseur et assistants de registre | |
  `plugin-sdk/realtime-voice` | Assistants vocaux en temps réel | Types de fournisseur et assistants de registre | | `plugin-sdk/image-generation-core` | Cœur partagé de génération d'images | Types de génération d'images, basculement, auth et assistants de registre | | `plugin-sdk/music-generation` | Assistants de génération de musique | Types de fournisseur/requête/résultat de génération de
  musique | | `plugin-sdk/music-generation-core` | Cœur partagé de génération de musique | Types de génération de musique, assistants de basculement, recherche de fournisseur et analyse de référence de modèle | | `plugin-sdk/video-generation` | Assistants de génération de vidéo | Types de fournisseur/requête/résultat de génération de vidéo | | `plugin-sdk/video-generation-core` | Cœur partagé de
  génération de vidéo | Types de génération de vidéo, assistants de basculement, recherche de fournisseur et analyse de référence de modèle | | `plugin-sdk/interactive-runtime` | Assistants de réponse interactive | Normalisation/réduction du payload de réponse interactive | | `plugin-sdk/channel-config-primitives` | Primitives de configuration de canal | Primitives étroites de schéma de
  configuration de canal | | `plugin-sdk/channel-config-writes` | Assistants d'écriture de configuration de canal | Assistants d'autorisation d'écriture de configuration de canal | | `plugin-sdk/channel-plugin-common`%% | Prélude partagé de canal | Exportations de prélude de plugin de canal partagé | | `plugin-sdk/channel-status` | Assistants de statut de canal | Assistants partagés de
  instantané/résumé de statut de canal | | `plugin-sdk/allowlist-config-edit` | Assistants de configuration de liste d'autorisation | Assistants de modification/lecture de configuration de liste d'autorisation | | `plugin-sdk/group-access` | Assistants d'accès aux groupes | Assistants partagés de décision d'accès aux groupes | | `plugin-sdk/direct-dm` | Assistants de DM direct | Assistants
  partagés d'auth/garde de DM direct | | `plugin-sdk/extension-shared` | Assistants d'extension partagés | Primitives d'assistant de canal passif/statut | | `plugin-sdk/webhook-targets` | Assistants de cible webhook | Assistants de registre de cible webhook et d'installation de route | | `plugin-sdk/webhook-path` | Assistants de chemin webhook | Assistants de normalisation de chemin webhook | |
  `plugin-sdk/web-media` | Assistants partagés de média web | Assistants de chargement de média distant/local | | `plugin-sdk/zod` | Ré-exportation Zod | `zod` ré-exporté pour les consommateurs du SDK de plugin | | `plugin-sdk/memory-core` | Assistants groupés de cœur de mémoire | Surface d'assistant de gestionnaire/config/fichier/CLI de mémoire | | `plugin-sdk/memory-core-engine-runtime` | Façade
  d'exécution du moteur de mémoire | Façade d'exécution d'index/recherche de mémoire | | `plugin-sdk/memory-core-host-engine-foundation` | Moteur de fondation de l'hôte de mémoire | Exportations du moteur de fondation de l'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-embeddings` | Moteur d'intégration de l'hôte de mémoire | Exportations du moteur d'intégration de l'hôte de mémoire | |
  `plugin-sdk/memory-core-host-engine-qmd` | Moteur QMD de l'hôte de mémoire | Exportations du moteur QMD de l'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-storage` | Moteur de stockage de l'hôte de mémoire | Exportations du moteur de stockage de l'hôte de mémoire | | `plugin-sdk/memory-core-host-multimodal` | Assistants multimodaux de l'hôte de mémoire | Assistants multimodaux de
  l'hôte de mémoire | | `plugin-sdk/memory-core-host-query` | Assistants de requête de l'hôte de mémoire | Assistants de requête de l'hôte de mémoire | | `plugin-sdk/memory-core-host-secret` | Assistants de secret de l'hôte de mémoire | Assistants de secret de l'hôte de mémoire | | `plugin-sdk/memory-core-host-status` | Assistants de statut de l'hôte de mémoire | Assistants de statut de l'hôte de
  mémoire | | `plugin-sdk/memory-core-host-runtime-cli` | Exécution CLI de l'hôte de mémoire | Assistants d'exécution CLI de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-core` | Exécution de base de l'hôte de mémoire | Assistants d'exécution de base de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-files` | Assistants de fichier/exécution de l'hôte de mémoire | Assistants
  de fichier/exécution de l'hôte de mémoire | | `plugin-sdk/memory-lancedb` | Assistants groupés de mémoire-lancedb | Surface d'assistant de mémoire-lancedb | | `plugin-sdk/testing` | Utilitaires de test | Assistants et simulations de test |
</Accordion>

Ce tableau représente intentionnellement le sous-ensemble de migration courant, et non l'intégralité de la surface du SDK. La liste complète des 200+ points d'entrée se trouve dans `scripts/lib/plugin-sdk-entrypoints.json`.

Cette liste inclut encore certaines zones d'aide pour les plugins intégrés (bundled-plugin) telles que `plugin-sdk/feishu`, `plugin-sdk/feishu-setup`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup` et `plugin-sdk/matrix*`. Celles-ci restent exportées pour la maintenance et la compatibilité des plugins intégrés, mais elles sont intentionnellement omises du tableau de migration courant et ne sont pas la cible recommandée pour le nouveau code de plugin.

La même règle s'applique à d'autres familles d'assistants intégrés, telles que :

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

`plugin-sdk/github-copilot-token` expose actuellement la surface étroite d'assistance de jeton `DEFAULT_COPILOT_API_BASE_URL`,
`deriveCopilotApiBaseUrlFromToken` et `resolveCopilotApiToken`.

Utilisez l'import le plus précis correspondant à la tâche. Si vous ne trouvez pas d'export, vérifiez la source sur `src/plugin-sdk/` ou demandez sur Discord.

## Calendrier de suppression

| Quand                         | Ce qui se passe                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| **Maintenant**                | Les surfaces dépréciées émettent des avertissements d'exécution                             |
| **Prochaine version majeure** | Les surfaces dépréciées seront supprimées ; les plugins qui les utilisent encore échoueront |

Tous les plugins principaux ont déjà été migrés. Les plugins externes doivent migrer
avant la prochaine version majeure.

## Supprimer temporairement les avertissements

Définissez ces variables d'environnement pendant que vous travaillez sur la migration :

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

Il s'agit d'une échappatoire temporaire, et non d'une solution permanente.

## Connexes

- [Getting Started](/en/plugins/building-plugins) — créez votre premier plugin
- [SDK Overview](/en/plugins/sdk-overview) — référence complète des importations de sous-chemins
- [Channel Plugins](/en/plugins/sdk-channel-plugins) — création de plugins de channel
- [Provider Plugins](/en/plugins/sdk-provider-plugins) — création de plugins de provider
- [Plugin Internals](/en/plugins/architecture) — approfondissement de l'architecture
- [Plugin Manifest](/en/plugins/manifest) — référence du schéma du manifeste
