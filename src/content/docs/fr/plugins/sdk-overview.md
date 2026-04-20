---
title: "Vue d'ensemble du SDK de plugin"
sidebarTitle: "Vue d'ensemble du SDK"
summary: "Carte d'import, référence de l'API d'enregistrement, et architecture du SDK"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

# Vue d'ensemble du SDK de plug-in

Le SDK de plug-in est le contrat typé entre les plug-ins et le cœur. Cette page est la référence pour **ce qu'il faut importer** et **ce que vous pouvez enregistrer**.

<Tip>**Vous cherchez un guide pratique ?** - Premier plugin ? Commencez par [Getting Started](/fr/plugins/building-plugins) - Plugin de canal ? Voir [Channel Plugins](/fr/plugins/sdk-channel-plugins) - Plugin de fournisseur ? Voir [Provider Plugins](/fr/plugins/sdk-provider-plugins)</Tip>

## Convention d'importation

Importez toujours depuis un sous-chemin spécifique :

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

Chaque sous-chemin est un petit module autonome. Cela permet un démarrage rapide et évite les problèmes de dépendances circulaires. Pour les assistants d'entrée/de construction spécifiques au channel, privilégiez `openclaw/plugin-sdk/channel-core` ; gardez `openclaw/plugin-sdk/core` pour la surface globale plus large et les assistants partagés tels que `buildChannelConfigSchema`.

N'ajoutez pas et ne dépendez pas de coutures de commodité nommées par provider telles que `openclaw/plugin-sdk/slack`, `openclaw/plugin-sdk/discord`, `openclaw/plugin-sdk/signal`, `openclaw/plugin-sdk/whatsapp`, ou de coutures d'assistant à marque de channel. Les plugins groupés doivent composer des sous-chemins SDK génériques dans leurs propres barils `api.ts` ou `runtime-api.ts`, et le core doit soit utiliser ces barils locaux au plugin, soit ajouter un contrat SDK générique étroit lorsque le besoin est vraiment inter-canaux.

La carte d'export générée contient toujours un petit ensemble de coutures d'assistant pour plugin groupé telles que `plugin-sdk/feishu`, `plugin-sdk/feishu-setup`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup` et `plugin-sdk/matrix*`. Ces sous-chemins n'existent que pour la maintenance et la compatibilité des plugins groupés ; ils sont intentionnellement omis du tableau commun ci-dessous et ne constituent pas le chemin d'importation recommandé pour les nouveaux plugins tiers.

## Référence du sous-chemin

Les sous-chemins les plus couramment utilisés, regroupés par objectif. La liste complète générée de plus de 200 sous-chemins se trouve dans `scripts/lib/plugin-sdk-entrypoints.json`.

Les sous-chemins d'assistant réservés pour plugin groupé apparaissent toujours dans cette liste générée. Traitez-les comme des détails d'implémentation/surfaces de compatibilité, sauf si une page de documentation en promeut explicitement un comme public.

### Point d'entrée du plugin

| Sous-chemin                 | Exportations clés                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`   | `definePluginEntry`                                                                                                                    |
| `plugin-sdk/core`           | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema` |
| `plugin-sdk/config-schema`  | `OpenClawSchema`                                                                                                                       |
| `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry`                                                                                                      |

<AccordionGroup>
  <Accordion title="Sous-chemins du canal">
    | Sous-chemin | Exportations clés |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | Exportation du schéma Zod `openclaw.json` racine (`OpenClawSchema`) |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, ainsi que `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | Assistants de configuration partagés, invites de liste d'autorisation, générateurs de statut de configuration |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | Assistants de configuration/action-gate multi-comptes, assistants de repli du compte par défaut |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`, assistants de normalisation de l'identifiant de compte |
    | `plugin-sdk/account-resolution` | Assistants de recherche de compte + repli par défaut |
    | `plugin-sdk/account-helpers` | Assistants de liste de comptes/actions de compte restreints |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | Types de schéma de configuration du canal |
    | `plugin-sdk/telegram-command-config` | Assistants de normalisation/validation des commandes personnalisées Telegram avec repli de contrat groupé |
    | `plugin-sdk/command-gating` | Assistants de porte d'autorisation de commande restreints |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink` |
    | `plugin-sdk/inbound-envelope` | Assistants de construction d'enveloppe et de routage entrant partagés |
    | `plugin-sdk/inbound-reply-dispatch` | Assistants d'enregistrement et de répartition entrants partagés |
    | `plugin-sdk/messaging-targets` | Assistants d'analyse et de correspondance des cibles |
    | `plugin-sdk/outbound-media` | Assistants de chargement de média sortant partagés |
    | `plugin-sdk/outbound-runtime` | Assistants de délégué d'identité/envoi sortant |
    | `plugin-sdk/poll-runtime` | Assistants de normalisation de sondage restreints |
    | `plugin-sdk/thread-bindings-runtime` | Assistants de cycle de vie et d'adaptateur de liaison de fil de discussion |
    | `plugin-sdk/agent-media-payload` | Générateur de charge utile média d'agent hérité |
    | `plugin-sdk/conversation-runtime` | Assistants de liaison de conversation/fil de discussion, d'appariement et de liaison configurée |
    | `plugin-sdk/runtime-config-snapshot` | Assistant d'instantané de configuration d'exécution |
    | `plugin-sdk/runtime-group-policy` | Assistants de résolution de stratégie de groupe d'exécution |
    | `plugin-sdk/channel-status` | Assistants d'instantané/résumé de l'état du canal partagés |
    | `plugin-sdk/channel-config-primitives` | Primitives de schéma de configuration de canal restreintes |
    | `plugin-sdk/channel-config-writes` | Assistants d'autorisation d'écriture de configuration de canal |
    | `plugin-sdk/channel-plugin-common` | Exportations de préambule du plugin de canal partagé |
    | `plugin-sdk/allowlist-config-edit` | Assistants de modification/lecture de configuration de liste d'autorisation |
    | `plugin-sdk/group-access` | Assistants de décision d'accès de groupe partagés |
    | `plugin-sdk/direct-dm` | Assistants d'authentification/garde de Telegram direct partagés |
    | `plugin-sdk/interactive-runtime` | Assistants de normalisation/réduction de charge utile de réponse interactive |
    | `plugin-sdk/channel-inbound` | Baril de compatibilité pour les assistants de rebond entrant, de correspondance de mention, de stratégie de mention et d'enveloppe |
    | `plugin-sdk/channel-mention-gating` | Assistants de stratégie de mention restreints sans la surface d'exécution entrante plus large |
    | `plugin-sdk/channel-location` | Assistants de contexte et de formatage de l'emplacement du canal |
    | `plugin-sdk/channel-logging` | Assistants de journalisation de canal pour les abandons entrants et les échecs de frappe/accusé de réception |
    | `plugin-sdk/channel-send-result` | Types de résultats de réponse |
    | `plugin-sdk/channel-actions` | `createMessageToolButtonsSchema`, `createMessageToolCardSchema` |
    | `plugin-sdk/channel-targets` | Assistants d'analyse et de correspondance des cibles |
    | `plugin-sdk/channel-contract` | Types de contrat de canal |
    | `plugin-sdk/channel-feedback` | Câblage des commentaires/réactions |
    | `plugin-sdk/channel-secret-runtime` | Assistants de contrat secret restreints tels que `collectSimpleChannelFieldAssignments`, `getChannelSurface`, `pushAssignment` et les types de cibles secrètes |
  </Accordion>

<Accordion title="Sous-chemins du fournisseur">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/provider-setup` | Assistants de configuration de fournisseur local/auto-hébergé sélectionnés | | `plugin-sdk/self-hosted-provider-setup` | Assistants de configuration de fournisseur auto-hébergé compatible OpenAI ciblés | | `plugin-sdk/cli-backend` | Valeurs par
  défaut du backend CLI + constantes de surveillance | | `plugin-sdk/provider-auth-runtime` | Assistants de résolution de clé API au runtime pour les plugins de fournisseur | | `plugin-sdk/provider-auth-api-key` | Assistants d'écriture de profil/onboarding de clé API tels que `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | Constructeur de résultats d'authentification OAuth standard |
  | `plugin-sdk/provider-auth-login` | Assistants de connexion interactive partagés pour les plugins de fournisseur | | `plugin-sdk/provider-env-vars` | Assistants de recherche de variables d'environnement d'authentification de fournisseur | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile`, `upsertApiKeyProfile`,
  `writeOAuthCredentials` | | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructeurs de stratégies de relecture partagés, assistants de point de terminaison de fournisseur et assistants de normalisation d'ID de modèle tels que `normalizeNativeXaiModelId` | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`,
  `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | Assistants de capacités HTTP/point de terminaison de fournisseur génériques | | `plugin-sdk/provider-web-fetch-contract` | Assistants de contrat de configuration/sélection de récupération web étroite tels que `enablePluginInConfig` et
  `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Assistants d'enregistrement/mise en cache de fournisseur de récupération web | | `plugin-sdk/provider-web-search-config-contract` | Assistants de configuration/identifiants de recherche web étroite pour les fournisseurs qui n'ont pas besoin de câblage d'activation de plugin | | `plugin-sdk/provider-web-search-contract` | Assistants
  de contrat de configuration/identifiants de recherche web étroite tels que `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig`, et setters/getters d'identifiants étendus | | `plugin-sdk/provider-web-search` | Assistants d'enregistrement/mise en cache/runtime de fournisseur de recherche web | | `plugin-sdk/provider-tools` |
  `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, nettoyage et diagnostics de schéma Gemini, et assistants de compatibilité xAI tels que `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` et similaires | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`,
  types de wrappers de flux, et assistants de wrappers partagés Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-transport-runtime` | Assistants de transport de fournisseur natif tels que la récupération sécurisée, les transformations de messages de transport et les flux d'événements de transport inscriptibles | |
  `plugin-sdk/provider-onboard` | Assistants de correctifs de configuration d'onboarding | | `plugin-sdk/global-singleton` | Assistants de singleton/cartes/caches locaux au processus |
</Accordion>

<Accordion title="Sous-chemins d'authentification et de sécurité">
  | Sous-chemin | Principales exportations | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`, assistants de registre de commandes, assistants d'autorisation de l'expéditeur | | `plugin-sdk/command-status` | Constructeurs de messages de commande/aide tels que `buildCommandsMessagePaginated` et `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | Résolution de
  l'approbant et assistants d'authentification d'action de même-chat | | `plugin-sdk/approval-client-runtime` | Assistants de profil/filtre d'approbation d'exécution native | | `plugin-sdk/approval-delivery-runtime` | Adaptateurs de capacité/livraison d'approbation native | | `plugin-sdk/approval-gateway-runtime` | Assistant partagé de résolution de passerelle d'approbation | |
  `plugin-sdk/approval-handler-adapter-runtime` | Assistants légers de chargement d'adaptateur d'approbation native pour les points d'entrée de channel à chaud | | `plugin-sdk/approval-handler-runtime` | Assistants d'exécution plus larges du gestionnaire d'approbation ; préférez les interfaces plus étroites d'adaptateur/passerelle lorsqu'elles suffisent | | `plugin-sdk/approval-native-runtime` |
  Assistants de cible d'approbation native + liaison de compte | | `plugin-sdk/approval-reply-runtime` | Assistants de payload de réponse d'approbation d'exécution/plugin | | `plugin-sdk/command-auth-native` | Assistants d'authentification de commande native + cibles de session native | | `plugin-sdk/command-detection` | Assistants partagés de détection de commande | | `plugin-sdk/command-surface`
  | Assistants de normalisation du corps de commande et de surface de commande | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | Assistants étroits de collection de contrats de secrets pour les surfaces de secrets de plugin/channel | | `plugin-sdk/secret-ref-runtime` | Assistants étroits de `coerceSecretRef` et de typage SecretRef pour l'analyse de
  contrat de secret/config | | `plugin-sdk/security-runtime` | Assistants partagés de confiance, de passerelle DM, de contenu externe et de collection de secrets | | `plugin-sdk/ssrf-policy` | Assistants de liste d'autorisation d'hôte et de stratégie SSRF de réseau privé | | `plugin-sdk/ssrf-dispatcher` | Assistants étroits de répartiteur épinglé sans la large surface d'exécution d'infra | |
  `plugin-sdk/ssrf-runtime` | Répartiteur épinglé, récupération protégée par SSRF et assistants de stratégie SSRF | | `plugin-sdk/secret-input` | Assistants d'analyse de saisie de secret | | `plugin-sdk/webhook-ingress` | Assistants de requête/cible de Webhook | | `plugin-sdk/webhook-request-guards` | Assistants de taille/délai d'expiration du corps de la requête |
</Accordion>

<Accordion title="Sous-chemins Runtime et stockage">
  | Sous-chemin | Principaux exports | | --- | --- | | `plugin-sdk/runtime` | Assistants larges pour runtime/journalisation/sauvegarde/installation de plugin | | `plugin-sdk/runtime-env` | Assistants étroits pour env runtime, logger, timeout, retry et backoff | | `plugin-sdk/channel-runtime-context` | Assistants génériques d'enregistrement et de recherche du contexte d'exécution channel | |
  `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | Assistants partagés pour commandes/hook/http/interactifs de plugin | | `plugin-sdk/hook-runtime` | Assistants partagés pour le pipeline webhook/internal hook | | `plugin-sdk/lazy-runtime` | Assistants d'importation/liaison différés du runtime tels que `createLazyRuntimeModule`, `createLazyRuntimeMethod` et
  `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Assistants d'exécution de processus | | `plugin-sdk/cli-runtime` | Assistants de formatage CLI, d'attente et de version | | `plugin-sdk/gateway-runtime` | Assistants de client Gateway et de correctifs d'état de channel | | `plugin-sdk/config-runtime` | Assistants de chargement/écriture de config | |
  `plugin-sdk/telegram-command-config` | Normalisation du nom/description de commande Telegram et vérifications de doublons/conflits, même lorsque la surface de contrat Telegram groupée est indisponible | | `plugin-sdk/text-autolink-runtime` | Détection d'autolien de référence de fichier sans le barrel text-runtime large | | `plugin-sdk/approval-runtime` | Assistants d'approbation exec/plugin,
  constructeurs de capacités d'approbation, auth/profil, assistants de routage/runtime natifs | | `plugin-sdk/reply-runtime` | Assistants runtime partagés entrant/réponse, découpage, dispatch, heartbeat, planificateur de réponse | | `plugin-sdk/reply-dispatch-runtime` | Assistants étroits de dispatch/finalisation de réponse | | `plugin-sdk/reply-history` | Assistants partagés d'historique de
  réponse à fenêtre courte tels que `buildHistoryContext`, `recordPendingHistoryEntry` et `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Assistants étroits de découpage de texte/markdown | | `plugin-sdk/session-store-runtime` | Assistants de chemin + updated-at du magasin de session | | `plugin-sdk/state-paths` |
  Assistants de chemin de répertoire State/OAuth | | `plugin-sdk/routing` | Assistants de liaison route/clé de session/compte tels que `resolveAgentRoute`, `buildAgentSessionKey` et `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | Assistants partagés de résumé d'état channel/compte, valeurs par défaut d'état runtime et assistants de métadonnées de problème | |
  `plugin-sdk/target-resolver-runtime` | Assistants partagés de résolution de cible | | `plugin-sdk/string-normalization-runtime` | Assistants de normalisation slug/chaîne | | `plugin-sdk/request-url` | Extraire les URL de chaîne d'entrées de type fetch/request | | `plugin-sdk/run-command` | Exécuteur de commande minuté avec résultats stdout/stderr normalisés | | `plugin-sdk/param-readers` |
  Lecteurs de paramètres tool/CLI courants | | `plugin-sdk/tool-payload` | Extraire les payloads normalisés des objets de résultat d'outil | | `plugin-sdk/tool-send` | Extraire les champs de cible d'envoi canoniques des arguments d'outil | | `plugin-sdk/temp-path` | Assistants partagés de chemin de téléchargement temp | | `plugin-sdk/logging-core` | Assistants de journal et de rédaction de
  sous-système | | `plugin-sdk/markdown-table-runtime` | Assistants de mode de table Markdown | | `plugin-sdk/json-store` | Petits assistants de lecture/écriture d'état JSON | | `plugin-sdk/file-lock` | Assistants de verrouillage de fichier réentrant | | `plugin-sdk/persistent-dedupe` | Assistants de cache de déduplication sauvegardé sur disque | | `plugin-sdk/acp-runtime` | Assistants de
  runtime/session ACP et de dispatch de réponse | | `plugin-sdk/acp-binding-resolve-runtime` | Résolution de liaison ACP en lecture seule sans importations de démarrage du cycle de vie | | `plugin-sdk/agent-config-primitives` | Primitives étroites de schéma de config runtime agent | | `plugin-sdk/boolean-param` | Lecteur de paramètre booléen souple | | `plugin-sdk/dangerous-name-runtime` |
  Assistants de résolution de correspondance de nom dangereux | | `plugin-sdk/device-bootstrap` | Assistants de bootstrap d'appareil et de jeton d'appariement | | `plugin-sdk/extension-shared` | Primitives d'assistants de canal passif partagé, d'état et de proxy ambiant | | `plugin-sdk/models-provider-runtime` | Assistants de réponse commande/provider `/models` | |
  `plugin-sdk/skill-commands-runtime` | Assistants de liste de commande de compétence | | `plugin-sdk/native-command-registry` | Assistants de registre/construction/sérialisation de commande native | | `plugin-sdk/agent-harness` | Surface de plugin de confiance expérimentale pour harnais d'agent de bas niveau : types de harnais, assistants de pilotage/abandon d'exécution active, assistants de pont
  d'outil OpenClaw et utilitaires de résultat de tentative | | `plugin-sdk/provider-zai-endpoint` | Assistants de détection de point de terminaison Z.AI | | `plugin-sdk/infra-runtime` | Assistants d'événement système/heartbeat | | `plugin-sdk/collection-runtime` | Petits assistants de cache borné | | `plugin-sdk/diagnostic-runtime` | Assistants de drapeau de diagnostic et d'événement | |
  `plugin-sdk/error-runtime` | Graphe d'erreur, formatage, assistants partagés de classification d'erreur, `isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | Assistants de fetch encapsulé, proxy et recherche épinglée | | `plugin-sdk/runtime-fetch` | Fetch runtime conscient du répartiteur sans importations proxy/guarded-fetch | | `plugin-sdk/response-limit-runtime` | Lecteur de corps de
  réponse borné sans la surface media runtime large | | `plugin-sdk/session-binding-runtime` | État de liaison de conversation actuel sans magasins de routage de liaison ou d'appariement configurés | | `plugin-sdk/session-store-runtime` | Assistants de lecture du magasin de sessions sans importations d'écritures/maintenance de configuration larges | | `plugin-sdk/context-visibility-runtime` |
  Résolution de visibilité du contexte et filtrage du contexte supplémentaire sans importations de configuration/sécurité larges | | `plugin-sdk/string-coerce-runtime` | Assistants étroits de coercition et de normalisation d'enregistrement primitif/chaîne sans importations markdown/journalisation | | `plugin-sdk/host-runtime` | Assistants de normalisation d'hôte et d'hôte SCP | |
  `plugin-sdk/retry-runtime` | Config de réessai et assistants de coureur de réessai | | `plugin-sdk/agent-runtime` | Assistants de rép agent/identité/espace de travail | | `plugin-sdk/directory-runtime` | Requête/dédup de répertoire sauvegardé par config | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Sous-chemins de fonctionnalité et de test">
  | Sous-chemin | Exportations principales | | --- | --- | | `plugin-sdk/media-runtime` | Assistants partagés de récupération/transformation/stockage de média, ainsi que des constructeurs de charge utile de média | | `plugin-sdk/media-generation-runtime` | Assistants partagés de basculement (failover) pour la génération de média, la sélection des candidats et la messagerie pour model manquant | |
  `plugin-sdk/media-understanding` | Types de provider de compréhension de média plus les exportations d'assistants image/audio orientés provider | | `plugin-sdk/text-runtime` | Assistants partagés de texte/markdown/journalisation, tels que le suppression du texte visible par l'assistant, les assistants de rendu/découpage/tableaux markdown, les assistants de rédaction, les assistants de balises de
  directive et les utilitaires de texte sécurisé | | `plugin-sdk/text-chunking` | Assistant de découpage de texte sortant | | `plugin-sdk/speech` | Types de provider de parole plus les assistants de directive, de registre et de validation orientés provider | | `plugin-sdk/speech-core` | Types de provider de parole partagés, assistants de registre, de directive et de normalisation | |
  `plugin-sdk/realtime-transcription` | Types de provider de transcription en temps réel et assistants de registre | | `plugin-sdk/realtime-voice` | Types de provider vocal en temps réel et assistants de registre | | `plugin-sdk/image-generation` | Types de provider de génération d'images | | `plugin-sdk/image-generation-core` | Types partagés de génération d'images, assistants de basculement,
  d'authentification et de registre | | `plugin-sdk/music-generation` | Types de provider/requête/résultat de génération de musique | | `plugin-sdk/music-generation-core` | Types partagés de génération de musique, assistants de basculement, recherche de provider et analyse de référence de model | | `plugin-sdk/video-generation` | Types de provider/requête/résultat de génération de vidéo | |
  `plugin-sdk/video-generation-core` | Types partagés de génération de vidéo, assistants de basculement, recherche de provider et analyse de référence de model | | `plugin-sdk/webhook-targets` | Registre des cibles Webhook et assistants d'installation de routes | | `plugin-sdk/webhook-path` | Assistants de normalisation de chemin Webhook | | `plugin-sdk/web-media` | Assistants partagés de
  chargement de média distant/local | | `plugin-sdk/zod` | `zod` réexporté pour les consommateurs du SDK de plugin | | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
</Accordion>

<Accordion title="Sous-chemins de mémoire">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/memory-core` | Surface d'assistance memory-core groupée pour les assistants de gestionnaire/configuration/fichier/CLI | | `plugin-sdk/memory-core-engine-runtime` | Façade d'exécution d'index/recherche de mémoire | | `plugin-sdk/memory-core-host-engine-foundation` | Exportations du moteur de base de l'hôte de mémoire | |
  `plugin-sdk/memory-core-host-engine-embeddings` | Contrats d'intégration de l'hôte de mémoire, accès au registre, fournisseur local et assistants de lot génériques/distants | | `plugin-sdk/memory-core-host-engine-qmd` | Exportations du moteur QMD de l'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-storage` | Exportations du moteur de stockage de l'hôte de mémoire | |
  `plugin-sdk/memory-core-host-multimodal` | Assistants multimodaux de l'hôte de mémoire | | `plugin-sdk/memory-core-host-query` | Assistants de requête de l'hôte de mémoire | | `plugin-sdk/memory-core-host-secret` | Assistants de secret de l'hôte de mémoire | | `plugin-sdk/memory-core-host-events` | Assistants de journal d'événements de l'hôte de mémoire | | `plugin-sdk/memory-core-host-status` |
  Assistants d'état de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-cli` | Assistants d'exécution CLI de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-core` | Assistants d'exécution de base de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-files` | Assistants de fichier/exécution de l'hôte de mémoire | | `plugin-sdk/memory-host-core` | Alias neutre vis-à-vis
  des fournisseurs pour les assistants d'exécution de base de l'hôte de mémoire | | `plugin-sdk/memory-host-events` | Alias neutre vis-à-vis des fournisseurs pour les assistants de journal d'événements de l'hôte de mémoire | | `plugin-sdk/memory-host-files` | Alias neutre vis-à-vis des fournisseurs pour les assistants de fichier/exécution de l'hôte de mémoire | | `plugin-sdk/memory-host-markdown`
  | Assistants managed-markdown partagés pour les plugins adjacents à la mémoire | | `plugin-sdk/memory-host-search` | Façade d'exécution de mémoire active pour l'accès au gestionnaire de recherche | | `plugin-sdk/memory-host-status` | Alias neutre vis-à-vis des fournisseurs pour les assistants d'état de l'hôte de mémoire | | `plugin-sdk/memory-lancedb` | Surface d'assistance memory-lancedb
  groupée |
</Accordion>

  <Accordion title="Sous-chemins d'assistants groupés réservés">
    | Famille | Sous-chemins actuels | Utilisation prévue |
    | --- | --- | --- |
    | Browser | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | Assistants de support pour plugins navigateur groupés (`browser-support` reste le baril de compatibilité) |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | Surface d'exécution/assistant Matrix groupée |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | Surface d'exécution/assistant LINE groupée |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | Surface d'assistant IRC groupée |
    | Channel-specific helpers | `plugin-sdk/googlechat`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu-conversation`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`, `plugin-sdk/twitch` | Couches d'assistants/de compatibilité de canal groupées |
    | Auth/plugin-specific helpers | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | Couches d'assistants de fonctionnalité/plugin groupées ; `plugin-sdk/github-copilot-token` exporte actuellement `DEFAULT_COPILOT_API_BASE_URL`, `deriveCopilotApiBaseUrlFromToken` et `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## API d'enregistrement

Le rappel `register(api)` reçoit un objet `OpenClawPluginApi` avec ces méthodes :

### Enregistrement des capacités

| Méthode                                          | Ce qu'il enregistre                          |
| ------------------------------------------------ | -------------------------------------------- |
| `api.registerProvider(...)`                      | Inférence de texte (LLM)                     |
| `api.registerAgentHarness(...)`                  | Exécuteur d'agent de bas niveau expérimental |
| `api.registerCliBackend(...)`                    | Backend d'inférence CLI local                |
| `api.registerChannel(...)`                       | Channel de messagerie                        |
| `api.registerSpeechProvider(...)`                | Synthèse Texte-vers-parole / STT             |
| `api.registerRealtimeTranscriptionProvider(...)` | Transcription en temps réel en continu       |
| `api.registerRealtimeVoiceProvider(...)`         | Sessions vocales duplex en temps réel        |
| `api.registerMediaUnderstandingProvider(...)`    | Analyse d'image/audio/vidéo                  |
| `api.registerImageGenerationProvider(...)`       | Génération d'images                          |
| `api.registerMusicGenerationProvider(...)`       | Génération de musique                        |
| `api.registerVideoGenerationProvider(...)`       | Génération de vidéo                          |
| `api.registerWebFetchProvider(...)`              | Provider de récupération/extraction Web      |
| `api.registerWebSearchProvider(...)`             | Recherche Web                                |

### Outils et commandes

| Méthode                         | Ce qu'elle enregistre                         |
| ------------------------------- | --------------------------------------------- |
| `api.registerTool(tool, opts?)` | Tool d'agent (requis ou `{ optional: true }`) |
| `api.registerCommand(def)`      | Commande personnalisée (contourne le LLM)     |

### Infrastructure

| Méthode                                        | Ce qu'elle enregistre                             |
| ---------------------------------------------- | ------------------------------------------------- |
| `api.registerHook(events, handler, opts?)`     | Point d'ancrage d'événement                       |
| `api.registerHttpRoute(params)`                | Point de terminaison HTTP Gateway                 |
| `api.registerGatewayMethod(name, handler)`     | Méthode Gateway RPC                               |
| `api.registerCli(registrar, opts?)`            | Sous-commande CLI                                 |
| `api.registerService(service)`                 | Service en arrière-plan                           |
| `api.registerInteractiveHandler(registration)` | Gestionnaire interactif                           |
| `api.registerMemoryPromptSupplement(builder)`  | Section de prompt additive adjacente à la mémoire |
| `api.registerMemoryCorpusSupplement(adapter)`  | Corpus de recherche/lecture de mémoire additive   |

Les espaces de noms d'administration principale réservés (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) restent toujours `operator.admin`, même si un plugin essaie d'attribuer une portée de méthode de passerelle plus étroite. Privilégiez les préfixes spécifiques aux plugins pour les méthodes détenues par les plugins.

### Métadonnées d'enregistrement CLI

`api.registerCli(registrar, opts?)` accepte deux types de métadonnées de premier niveau :

- `commands` : racines de commandes explicites détenues par le responsable de l'enregistrement
- `descriptors` : descripteurs de commande au moment de l'analyse utilisés pour l'aide CLI racine, le routage et l'enregistrement différé du CLI du plugin

Si vous souhaitez qu'une commande de plugin reste chargée paresseusement dans le chemin normal du CLI racine, fournissez `descriptors` qui couvrent chaque racine de commande de premier niveau exposée par ce responsable de l'enregistrement.

```typescript
api.registerCli(
  async ({ program }) => {
    const { registerMatrixCli } = await import("./src/cli.js");
    registerMatrixCli({ program });
  },
  {
    descriptors: [
      {
        name: "matrix",
        description: "Manage Matrix accounts, verification, devices, and profile state",
        hasSubcommands: true,
      },
    ],
  },
);
```

Utilisez `commands` seul uniquement lorsque vous n'avez pas besoin d'un enregistrement différé du CLI racine. Ce chemin de compatibilité urgent reste pris en charge, mais il n'installe pas d'espaces réservés basés sur des descripteurs pour le chargement paresseux au moment de l'analyse.

### Enregistrement du backend CLI

`api.registerCliBackend(...)` permet à un plugin de posséder la configuration par défaut pour un backend CLI d'IA local tel que `codex-cli`.

- Le backend `id` devient le préfixe du fournisseur dans les références de modèle comme `codex-cli/gpt-5`.
- Le backend `config` utilise la même forme que `agents.defaults.cliBackends.<id>`.
- La configuration de l'utilisateur prévaut toujours. OpenClaw fusionne `agents.defaults.cliBackends.<id>` par-dessus la valeur par défaut du plugin avant d'exécuter la CLI.
- Utilisez `normalizeConfig` lorsqu'un backend a besoin de réécritures de compatibilité après la fusion (par exemple pour normaliser les anciennes formes de drapeaux).

### Slots exclusifs

| Méthode                                    | Ce qu'il enregistre                                                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api.registerContextEngine(id, factory)`   | Moteur de contexte (un actif à la fois). La fonction de rappel `assemble()` reçoit `availableTools` et `citationsMode` afin que le moteur puisse adapter les ajouts de prompt. |
| `api.registerMemoryCapability(capability)` | Capacité de mémoire unifiée                                                                                                                                                    |
| `api.registerMemoryPromptSection(builder)` | Constructeur de section d'invite de mémoire                                                                                                                                    |
| `api.registerMemoryFlushPlan(resolver)`    | Résolveur de plan de vidage de mémoire                                                                                                                                         |
| `api.registerMemoryRuntime(runtime)`       | Adaptateur d'exécution de mémoire                                                                                                                                              |

### Adaptateurs d'intégration de mémoire

| Méthode                                        | Ce qu'il enregistre                                      |
| ---------------------------------------------- | -------------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptateur d'intégration de mémoire pour le plugin actif |

- `registerMemoryCapability` est l'API exclusive de plugin de mémoire préférée.
- `registerMemoryCapability` peut également exposer `publicArtifacts.listArtifacts(...)`
  afin que les plugins compagnons puissent consommer les artefacts de mémoire exportés via
  `openclaw/plugin-sdk/memory-host-core` au lieu d'accéder à la disposition privée d'un
  plugin de mémoire spécifique.
- `registerMemoryPromptSection`, `registerMemoryFlushPlan` et
  `registerMemoryRuntime` sont des API de plugin de mémoire exclusives compatibles avec les versions héritées.
- `registerMemoryEmbeddingProvider` permet au plugin de mémoire actif d'enregistrer un
  ou plusieurs identifiants d'adaptateur d'intégration (par exemple `openai`, `gemini`, ou un identifiant
  personnalisé défini par le plugin).
- La configuration utilisateur telle que `agents.defaults.memorySearch.provider` et
  `agents.defaults.memorySearch.fallback` est résolue par rapport à ces identifiants
  d'adaptateur enregistrés.

### Événements et cycle de vie

| Méthode                                      | Ce qu'il fait                     |
| -------------------------------------------- | --------------------------------- |
| `api.on(hookName, handler, opts?)`           | Hook de cycle de vie typé         |
| `api.onConversationBindingResolved(handler)` | Rappel de liaison de conversation |

### Sémantique de décision de hook

- `before_tool_call` : renvoyer `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de moindre priorité sont ignorés.
- `before_tool_call` : renvoyer `{ block: false }` est traité comme l'absence de décision (identique à l'omission de `block`), et non comme une substitution.
- `before_install` : le renvoi de `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de priorité inférieure sont ignorés.
- `before_install` : le renvoi de `{ block: false }` est traité comme une absence de décision (identique à l'omission de `block`), et non comme un remplacement.
- `reply_dispatch` : le renvoi de `{ handled: true, ... }` est terminal. Une fois qu'un gestionnaire réclame le dispatch, les gestionnaires de priorité inférieure et le chemin de dispatch par défaut du modèle sont ignorés.
- `message_sending` : le renvoi de `{ cancel: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de priorité inférieure sont ignorés.
- `message_sending` : le renvoi de `{ cancel: false }` est traité comme une absence de décision (identique à l'omission de `cancel`), et non comme un remplacement.

### Champs de l'objet API

| Champ                    | Type                      | Description                                                                                                            |
| ------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | Identifiant du plugin                                                                                                  |
| `api.name`               | `string`                  | Nom d'affichage                                                                                                        |
| `api.version`            | `string?`                 | Version du plugin (facultatif)                                                                                         |
| `api.description`        | `string?`                 | Description du plugin (facultatif)                                                                                     |
| `api.source`             | `string`                  | Chemin source du plugin                                                                                                |
| `api.rootDir`            | `string?`                 | Répertoire racine du plugin (facultatif)                                                                               |
| `api.config`             | `OpenClawConfig`          | Instantané de la configuration actuelle (instantané d'exécution en mémoire actif lorsque disponible)                   |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuration spécifique au plugin à partir de `plugins.entries.<id>.config`                                           |
| `api.runtime`            | `PluginRuntime`           | [Helpers d'exécution](/fr/plugins/sdk-runtime)                                                                         |
| `api.logger`             | `PluginLogger`            | Enregistreur avec portée (`debug`, `info`, `warn`, `error`)                                                            |
| `api.registrationMode`   | `PluginRegistrationMode`  | Mode de chargement actuel ; `"setup-runtime"` est la fenêtre légère de démarrage/configuration avant l'entrée complète |
| `api.resolvePath(input)` | `(string) => string`      | Résoudre le chemin relatif à la racine du plugin                                                                       |

## Convention de module interne

Dans votre plugin, utilisez des fichiers de regroupement locaux pour les importations internes :

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  Never import your own plugin through `openclaw/plugin-sdk/<your-plugin>`
  from production code. Route internal imports through `./api.ts` or
  `./runtime-api.ts`. The SDK path is the external contract only.
</Warning>

Facade-loaded bundled plugin public surfaces (`api.ts`, `runtime-api.ts`,
`index.ts`, `setup-entry.ts`, and similar public entry files) now prefer the
active runtime config snapshot when OpenClaw is already running. If no runtime
snapshot exists yet, they fall back to the resolved config file on disk.

Provider plugins can also expose a narrow plugin-local contract barrel when a
helper is intentionally provider-specific and does not belong in a generic SDK
subpath yet. Current bundled example: the Anthropic provider keeps its Claude
stream helpers in its own public `api.ts` / `contract-api.ts` seam instead of
promoting Anthropic beta-header and `service_tier` logic into a generic
`plugin-sdk/*` contract.

Autres exemples groupés actuels :

- `@openclaw/openai-provider`: `api.ts` exports provider builders,
  default-model helpers, and realtime provider builders
- `@openclaw/openrouter-provider`: `api.ts` exports the provider builder plus
  onboarding/config helpers

<Warning>
  Extension production code should also avoid `openclaw/plugin-sdk/<other-plugin>`
  imports. If a helper is truly shared, promote it to a neutral SDK subpath
  such as `openclaw/plugin-sdk/speech`, `.../provider-model-shared`, or another
  capability-oriented surface instead of coupling two plugins together.
</Warning>

## Connexes

- [Entry Points](/fr/plugins/sdk-entrypoints) — `definePluginEntry` and `defineChannelPluginEntry` options
- [Runtime Helpers](/fr/plugins/sdk-runtime) — full `api.runtime` namespace reference
- [Setup and Config](/fr/plugins/sdk-setup) — packaging, manifests, config schemas
- [Testing](/fr/plugins/sdk-testing) — test utilities and lint rules
- [SDK Migration](/fr/plugins/sdk-migration) — migrating from deprecated surfaces
- [Plugin Internals](/fr/plugins/architecture) — architecture approfondie et modèle de capacité
