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
  <Accordion title="Sous-chemins de canal">
    | Sous-chemin | Exportations clés |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | Exportation du schéma Zod `openclaw.json` racine (`OpenClawSchema`) |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, plus `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | Assistants partagés pour l'assistant de configuration, invites de liste d'autorisation, constructeurs de statut de configuration |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | Assistants de configuration/action à plusieurs comptes, assistants de repli vers le compte par défaut |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`, assistants de normalisation de l'ID de compte |
    | `plugin-sdk/account-resolution` | Assistants de recherche de compte + repli par défaut |
    | `plugin-sdk/account-helpers` | Assistants restreints de liste de compte/action de compte |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | Types de schéma de configuration de canal |
    | `plugin-sdk/telegram-command-config` | Assistants de normalisation/validation de commande personnalisée Telegram avec repli vers le contrat groupé |
    | `plugin-sdk/command-gating` | Assistants de porte d'autorisation de commande restreints |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`, assistants de cycle de vie/finalisation du brouillon de flux |
    | `plugin-sdk/inbound-envelope` | Assistants partagés pour la route entrante + le constructeur d'enveloppe |
    | `plugin-sdk/inbound-reply-dispatch` | Assistants partagés pour l'enregistrement et la distribution entrants |
    | `plugin-sdk/messaging-targets` | Assistants d'analyse/de correspondance de cible |
    | `plugin-sdk/outbound-media` | Assistants partagés de chargement de média sortant |
    | `plugin-sdk/outbound-runtime` | Assistants d'identité sortante, de délégué d'envoi et de planification de payload |
    | `plugin-sdk/poll-runtime` | Assistants de normalisation de sondage restreints |
    | `plugin-sdk/thread-bindings-runtime` | Assistants de cycle de vie et d'adaptateur de liaison de fil de discussion |
    | `plugin-sdk/agent-media-payload` | Constructeur de payload média d'agent hérité |
    | `plugin-sdk/conversation-runtime` | Assistants de liaison, d'appariement et de liaison configurée de conversation/fil de discussion |
    | `plugin-sdk/runtime-config-snapshot` | Assistant d'instantané de configuration d'exécution |
    | `plugin-sdk/runtime-group-policy` | Assistants de résolution de stratégie de groupe d'exécution |
    | `plugin-sdk/channel-status` | Assistants partagés d'instantané/résumé de statut de canal |
    | `plugin-sdk/channel-config-primitives` | Primitives de schéma de configuration de canal restreintes |
    | `plugin-sdk/channel-config-writes` | Assistants d'autorisation d'écriture de configuration de canal |
    | `plugin-sdk/channel-plugin-common` | Exportations de préambule partagées de plugin de canal |
    | `plugin-sdk/allowlist-config-edit` | Assistants de modification/lecture de configuration de liste d'autorisation |
    | `plugin-sdk/group-access` | Assistants partagés de décision d'accès au groupe |
    | `plugin-sdk/direct-dm` | Assistants partagés d'authentification/garde DM direct |
    | `plugin-sdk/interactive-runtime` | Présentation sémantique des messages, livraison et assistants de réponse interactive héritée. Voir [Présentation des messages](/fr/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | Baril de compatibilité pour les assistants de rebond entrant, de correspondance de mention, de stratégie de mention et d'enveloppe |
    | `plugin-sdk/channel-mention-gating` | Assistants de stratégie de mention restreints sans la surface d'exécution entrante plus large |
    | `plugin-sdk/channel-location` | Contexte et assistants de formatage de l'emplacement du canal |
    | `plugin-sdk/channel-logging` | Assistants de journalisation de canal pour les abandons entrants et les échecs de frappe/accusé de réception |
    | `plugin-sdk/channel-send-result` | Types de résultat de réponse |
    | `plugin-sdk/channel-actions` | Assistants d'action de message de canal, plus assistants de schéma natif obsolètes conservés pour la compatibilité des plugins |
    | `plugin-sdk/channel-targets` | Assistants d'analyse/de correspondance de cible |
    | `plugin-sdk/channel-contract` | Types de contrat de canal |
    | `plugin-sdk/channel-feedback` | Câblage des commentaires/réactions |
    | `plugin-sdk/channel-secret-runtime` | Assistants de contrat secret restreints tels que `collectSimpleChannelFieldAssignments`, `getChannelSurface`, `pushAssignment`, et les types de cible secrète |
  </Accordion>

<Accordion title="Sous-chemins de fournisseur">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/provider-setup` | Assistants de configuration de fournisseur local/auto-hébergé sélectionnés | | `plugin-sdk/self-hosted-provider-setup` | Assistants de configuration de fournisseur auto-hébergé compatible OpenAI ciblés | | `plugin-sdk/cli-backend` | Valeurs par
  défaut du backend CLI + constantes de watchdog | | `plugin-sdk/provider-auth-runtime` | Assistants de résolution de clé d'API au moment de l'exécution pour les plugins de fournisseur | | `plugin-sdk/provider-auth-api-key` | Assistants d'intégration/écriture de profil pour les clés d'API tels que `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | Constructeur de résultat
  d'authentification OAuth standard | | `plugin-sdk/provider-auth-login` | Assistants de connexion interactive partagés pour les plugins de fournisseur | | `plugin-sdk/provider-env-vars` | Assistants de recherche de variable d'environnement d'authentification de fournisseur | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile`,
  `upsertApiKeyProfile`, `writeOAuthCredentials` | | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructeurs de stratégie de relecture partagés, assistants de point de terminaison de fournisseur et assistants de normalisation d'ID de modèle tels que `normalizeNativeXaiModelId` | | `plugin-sdk/provider-catalog-shared` |
  `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | Assistants de capacités HTTP/point de terminaison de fournisseur génériques, y compris les assistants de formulaire multipart pour la transcription audio | | `plugin-sdk/provider-web-fetch-contract` | Assistants de contrat de
  configuration/sélection de récupération Web ciblés tels que `enablePluginInConfig` et `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Assistants d'enregistrement/mise en cache de fournisseur de récupération Web | | `plugin-sdk/provider-web-search-config-contract` | Assistants de configuration/d'identifiants pour la recherche Web ciblés pour les fournisseurs qui n'ont pas besoin de
  câblage d'activation de plugin | | `plugin-sdk/provider-web-search-contract` | Assistants de contrat de configuration/d'identifiants pour la recherche Web ciblés tels que `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig`, et setters/getters d'identifiants délimités | | `plugin-sdk/provider-web-search` | Assistants d'enregistrement/mise en
  cache/exécution de fournisseur de recherche Web | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, nettoyage et diagnostics de schéma Gemini, et assistants de compatibilité xAI tels que `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` et similaires | | `plugin-sdk/provider-stream` |
  `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, types de wrappers de flux, et assistants de wrapper partagés pour Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-transport-runtime` | Assistants de transport de fournisseur natif tels que la récupération gardée, les transformations de messages de
  transport et les flux d'événements de transport inscriptibles | | `plugin-sdk/provider-onboard` | Assistants de correctifs de configuration d'intégration | | `plugin-sdk/global-singleton` | Assistants de singleton/cartouche/cache local au processus |
</Accordion>

<Accordion title="Sous-chemins d'authentification et de sécurité">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`, assistants de registre de commandes, assistants d'autorisation de l'expéditeur | | `plugin-sdk/command-status` | Constructeurs de messages de commande/aide tels que `buildCommandsMessagePaginated` et `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | Résolution de l'approubateur
  et assistants d'authentification d'action de même chat | | `plugin-sdk/approval-client-runtime` | Assistants de profil/filtre d'approbation d'exécution native | | `plugin-sdk/approval-delivery-runtime` | Adaptateurs de capacité/livraison d'approbation native | | `plugin-sdk/approval-gateway-runtime` | Assistant partagé de résolution de passerelle d'approbation | |
  `plugin-sdk/approval-handler-adapter-runtime` | Assistants légers de chargement d'adaptateur d'approbation native pour les points d'entrée de canal à chaud | | `plugin-sdk/approval-handler-runtime` | Assistants d'exécution plus larges du gestionnaire d'approbation ; préférez les interfaces d'adaptateur/passerelle plus étroites lorsqu'elles suffisent | | `plugin-sdk/approval-native-runtime` |
  Assistants de cible d'approbation native + liaison de compte | | `plugin-sdk/approval-reply-runtime` | Assistants de payload de réponse d'approbation d'exécution/plugin | | `plugin-sdk/command-auth-native` | Assistants d'authentification de commande native + assistants de cible de session native | | `plugin-sdk/command-detection` | Assistants partagés de détection de commande | |
  `plugin-sdk/command-surface` | Normalisation du corps de commande et assistants de surface de commande | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | Assistants étroits de collection de contrats de secrets pour les surfaces de secrets de canal/plugin | | `plugin-sdk/secret-ref-runtime` | Assistants étroits `coerceSecretRef` et de typage
  SecretRef pour l'analyse de contrat de secret/config | | `plugin-sdk/security-runtime` | Assistants partagés de confiance, de verrouillage DM, de contenu externe et de collection de secrets | | `plugin-sdk/ssrf-policy` | Assistants de liste d'autorisation d'hôte et de stratégie SSRF de réseau privé | | `plugin-sdk/ssrf-dispatcher` | Assistants étroits de répartiteur épinglé sans la surface
  d'exécution d'infra large | | `plugin-sdk/ssrf-runtime` | Répartiteur épinglé, récupération protégée par SSRF et assistants de stratégie SSRF | | `plugin-sdk/secret-input` | Assistants d'analyse d'entrée de secret | | `plugin-sdk/webhook-ingress` | Assistants de requête/cible de Webhook | | `plugin-sdk/webhook-request-guards` | Assistants de taille/délai d'expiration du corps de la requête |
</Accordion>

<Accordion title="Sous-chemins d'exécution et de stockage">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/runtime` | Assistants d'exécution/registre/sauvegarde/installation de plugin larges | | `plugin-sdk/runtime-env` | Assistants étroits pour l'environnement d'exécution, le journal, le délai d'attente, la nouvelle tentative et l'attente | | `plugin-sdk/channel-runtime-context` | Assistants génériques d'enregistrement et de recherche
  de contexte d'exécution de canal | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | Assistants partagés de commande/hook/http/interactive de plugin | | `plugin-sdk/hook-runtime` | Assistants partagés de pipeline webhook/hook interne | | `plugin-sdk/lazy-runtime` | Assistants d'importation/lien d'exécution différés tels que `createLazyRuntimeModule`,
  `createLazyRuntimeMethod` et `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Assistants d'exécution de processus | | `plugin-sdk/cli-runtime` | Assistants de formatage CLI, d'attente et de version | | `plugin-sdk/gateway-runtime` | Assistants de client Gateway et de correctif d'état de canal | | `plugin-sdk/config-runtime` | Assistants de chargement/écriture de configuration et de
  recherche de configuration de plugin | | `plugin-sdk/telegram-command-config` | Normalisation du nom/description de commande Telegram et vérifications des doublons/conflits, même lorsque la surface de contrat Telegram groupée est indisponible | | `plugin-sdk/text-autolink-runtime` | Détection d'autolien de référence de fichier sans le barrel d'exécution de texte large | |
  `plugin-sdk/approval-runtime` | Assistants d'approbation d'exécution/plugin, générateurs de capacités d'approbation, assistants d'auth/profil, assistants de routage/exécution natifs | | `plugin-sdk/reply-runtime` | Assistants d'exécution partagés pour les réponses entrantes, le découpage, la distribution, le battement de cœur et le planificateur de réponse | | `plugin-sdk/reply-dispatch-runtime`
  | Assistants étroits de distribution/finalisation de réponse | | `plugin-sdk/reply-history` | Assistants partagés d'historique des réponses à fenêtre courte tels que `buildHistoryContext`, `recordPendingHistoryEntry` et `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Assistants étroits de découpage de
  texte/markdown | | `plugin-sdk/session-store-runtime` | Assistants de chemin du magasin de sessions + mis à jour à | | `plugin-sdk/state-paths` | Assistants de chemin de répertoire État/OAuth | | `plugin-sdk/routing` | Assistants de liaison de route/clé de session/compte tels que `resolveAgentRoute`, `buildAgentSessionKey` et `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` |
  Assistants partagés de résumé d'état de canal/compte, valeurs par défaut d'état d'exécution et assistants de métadonnées de problème | | `plugin-sdk/target-resolver-runtime` | Assistants partagés de résolveur de cible | | `plugin-sdk/string-normalization-runtime` | Assistants de normalisation de slug/chaîne | | `plugin-sdk/request-url` | Extraire les URL de chaîne des entrées de type
  fetch/request | | `plugin-sdk/run-command` | Lanceur de commande minuté avec résultats stdout/stderr normalisés | | `plugin-sdk/param-readers` | Lecteurs de paramètres outil/CLI courants | | `plugin-sdk/tool-payload` | Extraire les charges utiles normalisées des objets de résultat d'outil | | `plugin-sdk/tool-send` | Extraire les champs de cible d'envoi canoniques des arguments d'outil | |
  `plugin-sdk/temp-path` | Assistants de chemin de téléchargement temporaire partagé | | `plugin-sdk/logging-core` | Assistants de journal et de rédaction de sous-système | | `plugin-sdk/markdown-table-runtime` | Assistants de mode de tableau Markdown | | `plugin-sdk/json-store` | Petits assistants de lecture/écriture d'état JSON | | `plugin-sdk/file-lock` | Assistants de verrouillage de fichier
  réentrant | | `plugin-sdk/persistent-dedupe` | Assistants de cache de déduplication sauvegardé sur disque | | `plugin-sdk/acp-runtime` | Assistants de session/d'exécution ACP et de distribution de réponse | | `plugin-sdk/acp-binding-resolve-runtime` | Résolution de liaison ACP en lecture seule sans importations de démarrage de cycle de vie | | `plugin-sdk/agent-config-primitives` | Primitifs de
  schéma de configuration d'exécution d'agent étroit | | `plugin-sdk/boolean-param` | Lecteur de paramètre booléen souple | | `plugin-sdk/dangerous-name-runtime` | Assistants de résolution de correspondance de nom dangereux | | `plugin-sdk/device-bootstrap` | Assistants d'amorçage d'appareil et de jeton d'appariement | | `plugin-sdk/extension-shared` | Primitifs d'assistant partagés pour canal
  passif, statut et proxy ambiant | | `plugin-sdk/models-provider-runtime` | Assistants de réponse commande/OpenClaw `/models` | | `plugin-sdk/skill-commands-runtime` | Assistants de liste de commandes de compétence | | `plugin-sdk/native-command-registry` | Assistants de registre/construction/sérialisation de commande native | | `plugin-sdk/agent-harness` | Surface de plugin de confiance
  expérimentale pour harnais d'agent de bas niveau : types de harnais, assistants de pilotage/abandon d'exécution active, assistants de pont d'outil OpenClaw et utilitaires de résultat de tentative | | `plugin-sdk/provider-zai-endpoint` | Assistants de détection de point de terminaison Z.AI | | `plugin-sdk/infra-runtime` | Assistants d'événement système/battement de cœur | |
  `plugin-sdk/collection-runtime` | Petits assistants de cache borné | | `plugin-sdk/diagnostic-runtime` | Assistants d'indicateur et d'événement de diagnostic | | `plugin-sdk/error-runtime` | Graphe d'erreur, formatage, assistants partagés de classification d'erreur, `isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | Assistants de fetch encapsulé, proxy et recherche épinglée | |
  `plugin-sdk/runtime-fetch` | Fetch d'exécution conscient du répartiteur sans importations proxy/guarded-fetch | | `plugin-sdk/response-limit-runtime` | Lecteur de corps de réponse borné sans la surface d'exécution média large | | `plugin-sdk/session-binding-runtime` | État de liaison de conversation actuel sans magasins de routage de liaison configurés ou d'appariement | |
  `plugin-sdk/session-store-runtime` | Assistants de lecture du magasin de sessions sans importations d'écriture/maintenance de configuration large | | `plugin-sdk/context-visibility-runtime` | Résolution de visibilité du contexte et filtrage du contexte supplémentaire sans importations de configuration/sécurité larges | | `plugin-sdk/string-coerce-runtime` | Assistants étroits de contrainte et de
  normalisation d'enregistrement primitif/chaîne sans importations markdown/journal | | `plugin-sdk/host-runtime` | Assistants de normalisation d'hôte et d'hôte SCP | | `plugin-sdk/retry-runtime` | Assistants de configuration de nouvelle tentative et de lanceur de nouvelle tentative | | `plugin-sdk/agent-runtime` | Assistants de répertoire/identité/espace de travail d'agent | |
  `plugin-sdk/directory-runtime` | Requête/dédup de répertoire sauvegardé par configuration | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Sous-chemins de capacité et de test">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/media-runtime` | Assistants partagés de récupération/transformation/stockage de média ainsi que des générateurs de payload média | | `plugin-sdk/media-generation-runtime` | Assistants partagés de basculement pour la génération de média, la sélection des candidats et la messagerie de model manquant | |
  `plugin-sdk/media-understanding` | Types de provider de compréhension média plus les exportations d'assistants image/audio orientés provider | | `plugin-sdk/text-runtime` | Assistants partagés texte/markdown/logging tels que le stripping du texte visible par l'assistant, les assistants de rendu/découpage/tableau markdown, les assistants de rédaction, les assistants de balises de directive et les
  utilitaires de texte sécurisé | | `plugin-sdk/text-chunking` | Assistant de découpage de texte sortant | | `plugin-sdk/speech` | Types de provider de parole plus les assistants de directive, de registre et de validation orientés provider | | `plugin-sdk/speech-core` | Types de provider de parole partagés, registre, directive et assistants de normalisation | | `plugin-sdk/realtime-transcription`
  | Types de provider de transcription en temps réel, assistants de registre et assistant partagé de session WebSocket | | `plugin-sdk/realtime-voice` | Types de provider de voix en temps réel et assistants de registre | | `plugin-sdk/image-generation` | Types de provider de génération d'images | | `plugin-sdk/image-generation-core` | Types partagés de génération d'images, basculement,
  authentification et assistants de registre | | `plugin-sdk/music-generation` | Types de provider/request/résultat de génération de musique | | `plugin-sdk/music-generation-core` | Types partagés de génération de musique, assistants de basculement, recherche de provider et analyse des références de model | | `plugin-sdk/video-generation` | Types de provider/request/résultat de génération de vidéo
  | | `plugin-sdk/video-generation-core` | Types partagés de génération de vidéo, assistants de basculement, recherche de provider et analyse des références de model | | `plugin-sdk/webhook-targets` | Registre de cibles webhook et assistants d'installation de route | | `plugin-sdk/webhook-path` | Assistants de normalisation de chemin webhook | | `plugin-sdk/web-media` | Assistants partagés de
  chargement de média distant/local | | `plugin-sdk/zod` | `zod` réexporté pour les consommateurs du SDK de plugin | | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
</Accordion>

<Accordion title="Sous-chemins de mémoire">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/memory-core` | Surface d'assistance memory-core groupée pour les helpers de gestionnaire/config/fichier/CLI | | `plugin-sdk/memory-core-engine-runtime` | Façade d'exécution d'index/recherche de mémoire | | `plugin-sdk/memory-core-host-engine-foundation` | Exportations du moteur de base de l'hôte de mémoire | |
  `plugin-sdk/memory-core-host-engine-embeddings` | Contrats d'intégration de l'hôte de mémoire, accès au registre, fournisseur local et helpers de lot/distant génériques | | `plugin-sdk/memory-core-host-engine-qmd` | Exportations du moteur QMD de l'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-storage` | Exportations du moteur de stockage de l'hôte de mémoire | |
  `plugin-sdk/memory-core-host-multimodal` | Helpers multimodaux de l'hôte de mémoire | | `plugin-sdk/memory-core-host-query` | Helpers de requête de l'hôte de mémoire | | `plugin-sdk/memory-core-host-secret` | Helpers de secret de l'hôte de mémoire | | `plugin-sdk/memory-core-host-events` | Helpers de journal d'événements de l'hôte de mémoire | | `plugin-sdk/memory-core-host-status` | Helpers de
  statut de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-cli` | Helpers d'exécution CLI de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-core` | Helpers d'exécution de base de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-files` | Helpers de fichier/exécution de l'hôte de mémoire | | `plugin-sdk/memory-host-core` | Alias neutre vis-à-vis du fournisseur pour
  les helpers d'exécution de base de l'hôte de mémoire | | `plugin-sdk/memory-host-events` | Alias neutre vis-à-vis du fournisseur pour les helpers de journal d'événements de l'hôte de mémoire | | `plugin-sdk/memory-host-files` | Alias neutre vis-à-vis du fournisseur pour les helpers de fichier/exécution de l'hôte de mémoire | | `plugin-sdk/memory-host-markdown` | Helpers managed-markdown partagés
  pour les plugins adjacents à la mémoire | | `plugin-sdk/memory-host-search` | Façade d'exécution de mémoire active pour l'accès search-manager | | `plugin-sdk/memory-host-status` | Alias neutre vis-à-vis du fournisseur pour les helpers de statut de l'hôte de mémoire | | `plugin-sdk/memory-lancedb` | Surface d'assistance memory-lancedb groupée |
</Accordion>

  <Accordion title="Sous-chemins d'assistants groupés réservés">
    | Famille | Sous-chemins actuels | Utilisation prévue |
    | --- | --- | --- |
    | Navigateur | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | Assistants de support pour plugin de navigateur groupés (`browser-support` reste le baril de compatibilité) |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | Surface d'exécution/d'assistant Matrix groupée |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | Surface d'exécution/d'assistant LINE groupée |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | Surface d'assistant IRC groupée |
    | Assistants spécifiques au canal | `plugin-sdk/googlechat`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu-conversation`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`, `plugin-sdk/twitch` | Interfaces de compatibilité/assistants de canal groupés |
    | Assistants spécifiques à l'authentification/au plugin | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | Interfaces d'assistants de fonctionnalité/plugin groupés ; `plugin-sdk/github-copilot-token` exporte actuellement `DEFAULT_COPILOT_API_BASE_URL`, `deriveCopilotApiBaseUrlFromToken` et `resolveCopilotApiToken` |
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

| Méthode                         | Ce qu'elle enregistre                          |
| ------------------------------- | ---------------------------------------------- |
| `api.registerTool(tool, opts?)` | Outil d'agent (requis ou `{ optional: true }`) |
| `api.registerCommand(def)`      | Commande personnalisée (contourne le LLM)      |

### Infrastructure

| Méthode                                         | Ce qu'elle enregistre                             |
| ----------------------------------------------- | ------------------------------------------------- |
| `api.registerHook(events, handler, opts?)`      | Point d'ancrage d'événement                       |
| `api.registerHttpRoute(params)`                 | Point de terminaison HTTP Gateway                 |
| `api.registerGatewayMethod(name, handler)`      | Méthode Gateway RPC                               |
| `api.registerCli(registrar, opts?)`             | Sous-commande CLI                                 |
| `api.registerService(service)`                  | Service en arrière-plan                           |
| `api.registerInteractiveHandler(registration)`  | Gestionnaire interactif                           |
| `api.registerEmbeddedExtensionFactory(factory)` | Usine d'extension d'exécution intégrée de Pi      |
| `api.registerMemoryPromptSupplement(builder)`   | Section de invite additive adjacente à la mémoire |
| `api.registerMemoryCorpusSupplement(adapter)`   | Corpus de recherche/lecture de mémoire additive   |

Les espaces de noms d'administration principaux réservés (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) restent toujours `operator.admin`, même si un plugin tente d'attribuer une portée de méthode de passerelle plus étroite. Préférez des préfixes spécifiques aux plugins pour les méthodes appartenant aux plugins.

Utilisez `api.registerEmbeddedExtensionFactory(...)` lorsqu'un plugin a besoin d'un minutage d'événement natif Pi lors des exécutions intégrées OpenClaw, par exemple les réécritures asynchrones `tool_result` qui doivent se produire avant que le message de résultat d'outil final ne soit émis. Il s'agit aujourd'hui d'une couture de plugin groupé (bundled-plugin seam) : seuls les plugins groupés peuvent en enregistrer un, et ils doivent déclarer `contracts.embeddedExtensionFactories: ["pi"]` dans `openclaw.plugin.json`. Conservez les hooks de plugin OpenClaw normaux pour tout ce qui ne nécessite pas cette couture de niveau inférieur.

### Métadonnées d'enregistrement CLI

`api.registerCli(registrar, opts?)` accepte deux types de métadonnées de premier niveau :

- `commands` : racines de commandes explicites détenues par le registraire
- `descriptors` : descripteurs de commande au moment de l'analyse utilisés pour l'aide à la racine CLI,
  le routage et l'enregistrement différé du plugin CLI

Si vous souhaitez qu'une commande de plugin reste chargée à la demande dans le chemin normal de la racine CLI,
fournissez `descriptors` qui couvrent chaque racine de commande de premier niveau exposée par ce
registreur.

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

Utilisez `commands` seul uniquement lorsque vous n'avez pas besoin de l'enregistrement différé de la racine CLI.
Ce chemin de compatibilité impatient reste pris en charge, mais il n'installe pas
de espaces réservés basés sur des descripteurs pour le chargement différé au moment de l'analyse.

### Enregistrement du backend CLI

`api.registerCliBackend(...)` permet à un plugin de posséder la configuration par défaut d'un
backend d'CLI local tel que `codex-cli`.

- Le `id` du backend devient le préfixe du fournisseur dans les références de modèle comme `codex-cli/gpt-5`.
- Le `config` du backend utilise la même forme que `agents.defaults.cliBackends.<id>`.
- La configuration de l'utilisateur prime toujours. OpenClaw fusionne `agents.defaults.cliBackends.<id>` par-dessus la
  valeur par défaut du plugin avant d'exécuter le CLI.
- Utilisez `normalizeConfig` lorsqu'un backend a besoin de réécritures de compatibilité après la fusion
  (par exemple pour normaliser les anciennes formes de drapeaux).

### Emplacements exclusifs

| Méthode                                    | Ce qu'il enregistre                                                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api.registerContextEngine(id, factory)`   | Moteur de contexte (un actif à la fois). Le rappel `assemble()` reçoit `availableTools` et `citationsMode` afin que le moteur puisse adapter les ajouts de prompt. |
| `api.registerMemoryCapability(capability)` | Capacité de mémoire unifiée                                                                                                                                        |
| `api.registerMemoryPromptSection(builder)` | Générateur de section de prompt de mémoire                                                                                                                         |
| `api.registerMemoryFlushPlan(resolver)`    | Résolveur de plan de vidage de mémoire                                                                                                                             |
| `api.registerMemoryRuntime(runtime)`       | Adaptateur d'exécution de mémoire                                                                                                                                  |

### Adaptateurs d'intégration de mémoire

| Méthode                                        | Ce qu'il enregistre                                      |
| ---------------------------------------------- | -------------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptateur d'intégration de mémoire pour le plugin actif |

- `registerMemoryCapability` est l'API exclusive de plugin de mémoire préférée.
- `registerMemoryCapability` peut également exposer `publicArtifacts.listArtifacts(...)`
  pour que les plugins compagnons puissent consommer des artefacts de mémoire exportés via
  `openclaw/plugin-sdk/memory-host-core` au lieu d'accéder à la disposition privée d'un
  plugin de mémoire spécifique.
- `registerMemoryPromptSection`, `registerMemoryFlushPlan` et
  `registerMemoryRuntime` sont des API de plugin de mémoire exclusives compatibles avec les versions héritées.
- `registerMemoryEmbeddingProvider` permet au plugin de mémoire actif d'enregistrer un
  ou plusieurs identifiants d'adaptateur d'intégration (par exemple `openai`, `gemini`, ou un
  identifiant personnalisé défini par le plugin).
- La configuration utilisateur telle que `agents.defaults.memorySearch.provider` et
  `agents.defaults.memorySearch.fallback` est résolue par rapport à ces identifiants
  d'adaptateur enregistrés.

### Événements et cycle de vie

| Méthode                                      | Ce qu'il fait                     |
| -------------------------------------------- | --------------------------------- |
| `api.on(hookName, handler, opts?)`           | Hook de cycle de vie typé         |
| `api.onConversationBindingResolved(handler)` | Rappel de liaison de conversation |

### Sémantique de décision des hooks

- `before_tool_call` : renvoyer `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de priorité inférieure sont ignorés.
- `before_tool_call` : renvoyer `{ block: false }` est traité comme l'absence de décision (identique à l'omission de `block`), et non comme un remplacement.
- `before_install` : renvoyer `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de priorité inférieure sont ignorés.
- `before_install` : renvoyer `{ block: false }` est traité comme l'absence de décision (identique à l'omission de `block`), et non comme un remplacement.
- `reply_dispatch` : renvoyer `{ handled: true, ... }` est terminal. Une fois qu'un gestionnaire réclame la répartition, les gestionnaires de priorité inférieure et le chemin de répartition du modèle par défaut sont ignorés.
- `message_sending` : renvoyer `{ cancel: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de priorité inférieure sont ignorés.
- `message_sending` : renvoyer `{ cancel: false }` est traité comme l'absence de décision (identique à l'omission de `cancel`), et non comme un remplacement.
- `message_received` : utilisez le champ typé `threadId` lorsque vous avez besoin d'un routage de discussion/sujet entrant. Gardez `metadata` pour les éléments spécifiques au canal.
- `message_sending` : utilisez les champs de routage typés `replyToId` / `threadId` avant de revenir aux `metadata` spécifiques au canal.
- `gateway_start` : utilisez `ctx.config`, `ctx.workspaceDir` et `ctx.getCron?.()` pour l'état de démarrage détenu par la passerelle au lieu de vous fier aux hooks internes `gateway:startup`.

### Champs de l'objet API

| Champ                    | Type                      | Description                                                                                                            |
| ------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | Id du plugin                                                                                                           |
| `api.name`               | `string`                  | Nom d'affichage                                                                                                        |
| `api.version`            | `string?`                 | Version du plugin (facultatif)                                                                                         |
| `api.description`        | `string?`                 | Description du plugin (facultatif)                                                                                     |
| `api.source`             | `string`                  | Chemin source du plugin                                                                                                |
| `api.rootDir`            | `string?`                 | Répertoire racine du plugin (facultatif)                                                                               |
| `api.config`             | `OpenClawConfig`          | Instantané de la configuration actuelle (instantané d'exécution en mémoire actif lorsque disponible)                   |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuration spécifique au plugin issue de `plugins.entries.<id>.config`                                              |
| `api.runtime`            | `PluginRuntime`           | [Assistants d'exécution](/fr/plugins/sdk-runtime)                                                                      |
| `api.logger`             | `PluginLogger`            | Journaliste délimité (`debug`, `info`, `warn`, `error`)                                                                |
| `api.registrationMode`   | `PluginRegistrationMode`  | Mode de chargement actuel ; `"setup-runtime"` est la fenêtre de démarrage/configuration légère avant l'entrée complète |
| `api.resolvePath(input)` | `(string) => string`      | Résoudre le chemin relatif à la racine du plugin                                                                       |

## Convention de module interne

Dans votre plugin, utilisez des fichiers d'exportation locaux (barrel files) pour les importations internes :

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  N'importez jamais votre propre plugin via `openclaw/plugin-sdk/<your-plugin>`
  depuis le code de production. Acheminez les importations internes via `./api.ts` ou
  `./runtime-api.ts`. Le chemin du SDK est uniquement le contrat externe.
</Warning>

Les surfaces publiques des plugins groupés chargés par façade (`api.ts`, `runtime-api.ts`,
`index.ts`, `setup-entry.ts` et fichiers d'entrée publics similaires) privilégient désormais l'instantané de configuration d'exécution actif lorsque OpenClaw est déjà en cours d'exécution. Si aucun instantané d'exécution n'existe encore, ils reviennent au fichier de configuration résolu sur le disque.

Les plugins de fournisseur peuvent également exposer un contrat local de plugin étroit lorsqu'un assistant est intentionnellement spécifique au fournisseur et n'appartient pas encore à un sous-chemin SDK générique. Exemple groupé actuel : le fournisseur Anthropic conserve ses assistants de flux Claude dans sa propre jonction publique `api.ts` / `contract-api.ts` au lieu de promouvoir la logique d'en-tête bêta Anthropic et `service_tier` dans un contrat générique `plugin-sdk/*`.

Autres exemples groupés actuels :

- `@openclaw/openai-provider` : `api.ts` exporte les builders de fournisseur,
  les assistants de modèle par défaut et les builders de fournisseur en temps réel
- `@openclaw/openrouter-provider` : `api.ts` exporte le builder de fournisseur ainsi
  que les assistants d'intégration/configuration

<Warning>
  Le code de production de l'extension doit également éviter les importations `openclaw/plugin-sdk/<other-plugin>`
  . Si un assistant est vraiment partagé, promouvez-le vers un sous-chemin SDK neutre
  tel que `openclaw/plugin-sdk/speech`, `.../provider-model-shared`, ou une autre surface orientée capacité au lieu de coupler deux plugins ensemble.
</Warning>

## Connexes

- [Points d'entrée](/fr/plugins/sdk-entrypoints) — options `definePluginEntry` et `defineChannelPluginEntry`
- [Assistants d'exécution](/fr/plugins/sdk-runtime) — référence complète de l'espace de noms `api.runtime`
- [Configuration et installation](/fr/plugins/sdk-setup) — packaging, manifestes, schémas de configuration
- [Tests](/fr/plugins/sdk-testing) — utilitaires de test et règles de linting
- [Migration du SDK](/fr/plugins/sdk-migration) — migration à partir des surfaces déconseillées
- [Fonctionnement interne des plugins](/fr/plugins/architecture) — architecture approfondie et model de capacité
