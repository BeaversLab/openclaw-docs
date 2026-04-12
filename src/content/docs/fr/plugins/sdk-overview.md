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

<Tip>**Vous cherchez un guide pratique ?** - Premier plugin ? Commencez par [Getting Started](/en/plugins/building-plugins) - Plugin de canal ? Voir [Channel Plugins](/en/plugins/sdk-channel-plugins) - Plugin de fournisseur ? Voir [Provider Plugins](/en/plugins/sdk-provider-plugins)</Tip>

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
    | `plugin-sdk/setup` | Assistants partagés pour l'assistant de configuration, invites de liste d'autorisation, constructeurs de statut de configuration |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | Assistants de configuration/action-gate multi-comptes, assistants de repli par défaut du compte |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`, assistants de normalisation de l'ID de compte |
    | `plugin-sdk/account-resolution` | Recherche de compte + assistants de repli par défaut |
    | `plugin-sdk/account-helpers` | Assistants restreints de liste de comptes/actions de compte |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | Types de schéma de configuration de canal |
    | `plugin-sdk/telegram-command-config` | Assistants de normalisation/validation de commande personnalisée Telegram avec repli de contrat groupé |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink` |
    | `plugin-sdk/inbound-envelope` | Assistants partagés de constructeur de route entrante + enveloppe |
    | `plugin-sdk/inbound-reply-dispatch` | Assistants partagés d'enregistrement et de répartition entrants |
    | `plugin-sdk/messaging-targets` | Assistants d'analyse/correspondance de cible |
    | `plugin-sdk/outbound-media` | Assistants partagés de chargement de média sortant |
    | `plugin-sdk/outbound-runtime` | Assistants de délégué d'identité/envoi sortant |
    | `plugin-sdk/thread-bindings-runtime` | Cycle de vie de liaison de fil et adaptateurs |
    | `plugin-sdk/agent-media-payload` | Constructeur de charge utile média d'agent hérité |
    | `plugin-sdk/conversation-runtime` | Liaison de conversation/fil, jumelage et assistants de liaison configurée |
    | `plugin-sdk/runtime-config-snapshot` | Assistant d'instantané de configuration d'exécution |
    | `plugin-sdk/runtime-group-policy` | Assistants de résolution de stratégie de groupe d'exécution |
    | `plugin-sdk/channel-status` | Assistants partagés d'instantané/résumé de statut de canal |
    | `plugin-sdk/channel-config-primitives` | Primitives de schéma de configuration de canal restreintes |
    | `plugin-sdk/channel-config-writes` | Assistants d'autorisation d'écriture de configuration de canal |
    | `plugin-sdk/channel-plugin-common` | Exportations de prélude partagées de plugin de canal |
    | `plugin-sdk/allowlist-config-edit` | Assistants de modification/lecture de configuration de liste d'autorisation |
    | `plugin-sdk/group-access` | Assistants partagés de décision d'accès de groupe |
    | `plugin-sdk/direct-dm` | Assistants partagés d'authentification/garde de DM direct |
    | `plugin-sdk/interactive-runtime` | Assistants de normalisation/réduction de charge utile de réponse interactive |
    | `plugin-sdk/channel-inbound` | Rebond entrant, correspondance de mention, assistants de stratégie de mention et assistants d'enveloppe |
    | `plugin-sdk/channel-send-result` | Types de résultat de réponse |
    | `plugin-sdk/channel-actions` | `createMessageToolButtonsSchema`, `createMessageToolCardSchema` |
    | `plugin-sdk/channel-targets` | Assistants d'analyse/correspondance de cible |
    | `plugin-sdk/channel-contract` | Types de contrat de canal |
    | `plugin-sdk/channel-feedback` | Câblage de feedback/réaction |
    | `plugin-sdk/channel-secret-runtime` | Assistants restreints de contrat secret tels que `collectSimpleChannelFieldAssignments`, `getChannelSurface`, `pushAssignment`, et types de cibles secrètes |
  </Accordion>

<Accordion title="Sous-chemins du fournisseur">
  | Sous-chemin | Exportations principales | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/provider-setup` | Assistants de configuration de fournisseur local/auto-hébergé sélectionnés | | `plugin-sdk/self-hosted-provider-setup` | Assistants de configuration de fournisseur auto-hébergé compatibles OpenAI ciblés | | `plugin-sdk/cli-backend` | Valeurs
  par défaut du backend CLI + constantes de surveillance | | `plugin-sdk/provider-auth-runtime` | Assistants de résolution de clé d'API à l'exécution pour les plugins de fournisseur | | `plugin-sdk/provider-auth-api-key` | Assistants d'intégration/écriture de profil de clé d'API tels que `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | Générateur de résultats d'authentification OAuth
  standard | | `plugin-sdk/provider-auth-login` | Assistants de connexion interactive partagés pour les plugins de fournisseur | | `plugin-sdk/provider-env-vars` | Assistants de recherche de variables d'environnement d'authentification du fournisseur | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile`, `upsertApiKeyProfile`,
  `writeOAuthCredentials` | | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, générateurs de stratégies de relecture partagés, assistants de point de terminaison de fournisseur et assistants de normalisation d'identifiant de modèle tels que `normalizeNativeXaiModelId` | | `plugin-sdk/provider-catalog-shared` |
  `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | Assistants génériques de capacités HTTP/point de terminaison de fournisseur | | `plugin-sdk/provider-web-fetch-contract` | Assistants de contrat de configuration/sélection de récupération Web étroits tels que
  `enablePluginInConfig` et `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Assistants d'enregistrement/de cache de fournisseur de récupération Web | | `plugin-sdk/provider-web-search-config-contract` | Assistants de configuration/d'identification pour la recherche Web étroite pour les fournisseurs qui n'ont pas besoin de câblage d'activation de plugin | |
  `plugin-sdk/provider-web-search-contract` | Assistants de contrat de configuration/d'identification pour la recherche Web étroite tels que `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig` et définitions/récupérateurs d'identifiants délimités | | `plugin-sdk/provider-web-search` | Assistants d'enregistrement/de cache/d'exécution de
  fournisseur de recherche Web | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, nettoyage + diagnostics du schéma Gemini et assistants de compatibilité xAI tels que `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` et similaires | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`,
  `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, types de wrapper de flux et assistants de wrapper partagés Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-onboard` | Assistants de correctifs de configuration d'intégration | | `plugin-sdk/global-singleton` | Assistants de singleton/carte/cache local au processus |
</Accordion>

<Accordion title="Chemins d'authentification et de sécurité">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`, assistants de registre de commandes, assistants d'autorisation de l'expéditeur | | `plugin-sdk/command-status` | Générateurs de messages d'aide/de commande tels que `buildCommandsMessagePaginated` et `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | Résolution de l'approuveur et
  assistants d'autorisation d'action de même chat | | `plugin-sdk/approval-client-runtime` | Assistants de profil/filtre d'approbation d'exécution native | | `plugin-sdk/approval-delivery-runtime` | Adaptateurs de capacité/livraison d'approbation native | | `plugin-sdk/approval-gateway-runtime` | Assistant partagé de résolution de passerelle d'approbation | |
  `plugin-sdk/approval-handler-adapter-runtime` | Assistants de chargement léger d'adaptateur d'approbation native pour les points d'entrée de canal à chaud | | `plugin-sdk/approval-handler-runtime` | Assistants d'exécution plus larges du gestionnaire d'approbation ; privilégiez les interfaces plus étroites d'adaptateur/passerelle lorsqu'elles suffisent | | `plugin-sdk/approval-native-runtime` |
  Assistants de cible d'approbation native + de liaison de compte | | `plugin-sdk/approval-reply-runtime` | Assistants de charge utile de réponse d'approbation d'exécution/plugin | | `plugin-sdk/command-auth-native` | Assistants d'auth de commande native + de cible de session native | | `plugin-sdk/command-detection` | Assistants partagés de détection de commande | | `plugin-sdk/command-surface` |
  Normalisation du corps de commande et assistants de surface de commande | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | Assistants étroits de collection de contrats de secrets pour les surfaces de secrets de canal/plugin | | `plugin-sdk/secret-ref-runtime` | Assistants étroits de `coerceSecretRef` et de typage SecretRef pour l'analyse de contrat
  de secret/de configuration | | `plugin-sdk/security-runtime` | Assistants partagés de confiance, de filtrage DM, de contenu externe et de collection de secrets | | `plugin-sdk/ssrf-policy` | Assistants de liste d'autorisation d'hôte et de stratégie SSRF de réseau privé | | `plugin-sdk/ssrf-runtime` | Répartiteur épinglé, récupération protégée contre les SSRF et assistants de stratégie SSRF | |
  `plugin-sdk/secret-input` | Assistants d'analyse de saisie de secret | | `plugin-sdk/webhook-ingress` | Assistants de requête/cible de webhook | | `plugin-sdk/webhook-request-guards` | Assistants de taille/délai d'expiration du corps de la requête |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/runtime` | Assistants d'exécution générales pour l'exécution, la journalisation, la sauvegarde et l'installation de plugins | | `plugin-sdk/runtime-env` | Assistances restreintes pour l'environnement d'exécution, la journalisation, le délai d'expiration, la nouvelle tentative et l'attente | | `plugin-sdk/channel-runtime-context` | Assistances
  génériques pour l'enregistrement et la recherche du contexte d'exécution de channel | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | Assistances partagées pour les commandes/hooks/http/interactifs de plugin | | `plugin-sdk/hook-runtime` | Assistances partagées pour les pipelines de webhook/hooks internes | | `plugin-sdk/lazy-runtime` | Assistances
  d'importation/liaison différées de l'exécution telles que `createLazyRuntimeModule`, `createLazyRuntimeMethod` et `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Assistances d'exécution de processus | | `plugin-sdk/cli-runtime` | Assistances de formatage CLI, d'attente et de version | | `plugin-sdk/gateway-runtime` | Assistances de client Gateway et de correctifs d'état de channel
  | | `plugin-sdk/config-runtime` | Assistances de chargement/écriture de configuration | | `plugin-sdk/telegram-command-config` | Assistances de normalisation du nom/description des commandes Telegram et vérifications des doublons/conflits, même lorsque la surface de contrat Telegram groupée n'est pas disponible | | `plugin-sdk/approval-runtime` | Assistances d'approbation d'exécution/plugin,
  constructeurs de capacités d'approbation, assistances d'auth/profil, assistances de routage/exécution natives | | `plugin-sdk/reply-runtime` | Assistances partagées d'exécution entrante/réponse, découpage, distribution, pulsation, planificateur de réponse | | `plugin-sdk/reply-dispatch-runtime` | Assistances restreintes de distribution/finalisation de réponse | | `plugin-sdk/reply-history` |
  Assistances partagées d'historique des réponses à court terme telles que `buildHistoryContext`, `recordPendingHistoryEntry` et `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Assistances restreintes de découpage de texte/markdown | | `plugin-sdk/session-store-runtime` | Assistances de chemin de magasin de session +
  mis à jour à | | `plugin-sdk/state-paths` | Assistances de chemin de répertoire State/OAuth | | `plugin-sdk/routing` | Assistances de liaison route/clé de session/compte telles que `resolveAgentRoute`, `buildAgentSessionKey` et `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | Assistances partagées de résumé d'état de channel/compte, valeurs par défaut d'état d'exécution et
  assistances de métadonnées de problème | | `plugin-sdk/target-resolver-runtime` | Assistances partagées de résolveur de cible | | `plugin-sdk/string-normalization-runtime` | Assistances de normalisation de slug/chaîne | | `plugin-sdk/request-url` | Extraire les URL de chaîne des entrées de type fetch/request | | `plugin-sdk/run-command` | Lanceur de commande chronométré avec résultats
  stdout/stderr normalisés | | `plugin-sdk/param-readers` | Lecteurs de paramètres tool/CLI courants | | `plugin-sdk/tool-payload` | Extraire les charges utiles normalisées des objets de résultat tool | | `plugin-sdk/tool-send` | Extraire les champs de cible d'envoi canoniques des arguments tool | | `plugin-sdk/temp-path` | Assistances partagées de chemin de téléchargement temporaire | |
  `plugin-sdk/logging-core` | Journaliseur de sous-système et assistances de rédaction | | `plugin-sdk/markdown-table-runtime` | Assistances de mode de tableau Markdown | | `plugin-sdk/json-store` | Petites assistances de lecture/écriture d'état JSON | | `plugin-sdk/file-lock` | Assistances de verrouillage de fichier réentrant | | `plugin-sdk/persistent-dedupe` | Assistances de cache de
  déduplication sauvegardé sur disque | | `plugin-sdk/acp-runtime` | Assistances d'exécution/session ACP et de distribution de réponse | | `plugin-sdk/agent-config-primitives` | Primitives de schéma de configuration d'exécution d'agent restreintes | | `plugin-sdk/boolean-param` | Lecteur de paramètre booléen souple | | `plugin-sdk/dangerous-name-runtime` | Assistances de résolution de
  correspondance de nom dangereux | | `plugin-sdk/device-bootstrap` | Assistances de bootstrap d'appareil et de jeton de couplage | | `plugin-sdk/extension-shared` | Primitives d'assistance pour channel passif partagé, état et proxy ambiant | | `plugin-sdk/models-provider-runtime` | Assistances de réponse de commande/provider `/models` | | `plugin-sdk/skill-commands-runtime` | Assistances de liste
  de commandes de compétence | | `plugin-sdk/native-command-registry` | Assistances de registre/construction/sérialisation de commandes natives | | `plugin-sdk/agent-harness` | Surface de plugin de confiance expérimentale pour des harnais d'agent de bas niveau : types de harnais, assistances de guidage/abandon d'exécution active, assistances de pont tool OpenClaw et utilitaires de résultat de
  tentative | | `plugin-sdk/provider-zai-endpoint` | Assistances de détection de point de terminaison Z.AI | | `plugin-sdk/infra-runtime` | Assistances d'événement système/pulsation | | `plugin-sdk/collection-runtime` | Petites assistances de cache borné | | `plugin-sdk/diagnostic-runtime` | Assistances d'indicateur et d'événement de diagnostic | | `plugin-sdk/error-runtime` | Graphe d'erreur,
  formatage, assistances partagées de classification d'erreur, `isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | Assistances de fetch enveloppé, proxy et recherche épinglée | | `plugin-sdk/host-runtime` | Assistances de normalisation d'hôte SCP et de nom d'hôte | | `plugin-sdk/retry-runtime` | Assistances de configuration de nouvelle tentative et de lanceur de nouvelle tentative | |
  `plugin-sdk/agent-runtime` | Assistances de répertoire/identité/espace de travail d'agent | | `plugin-sdk/directory-runtime` | Requête/dédup de répertoire sauvegardé par configuration | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Sous-chemins de capacité et de tests">
  | Sous-chemin | Principaux exportations | | --- | --- | | `plugin-sdk/media-runtime` | Assistants de récupération/transformation/stockage de média partagés, plus les constructeurs de payload média | | `plugin-sdk/media-generation-runtime` | Assistants de basculement pour la génération de média partagés, sélection de candidats et messagerie en cas de model manquant | |
  `plugin-sdk/media-understanding` | Types de provider de compréhension de média plus exportations d'assistants image/audio orientés provider | | `plugin-sdk/text-runtime` | Assistants partagés texte/markdown/journalisation tels que le stripping de texte visible par l'assistant, assistants de rendu/découpage/tableaux markdown, assistants de rédaction, assistants de balises de directive et
  utilitaires de texte sécurisé | | `plugin-sdk/text-chunking` | Assistant de découpage de texte sortant | | `plugin-sdk/speech` | Types de provider de parole plus assistants de directive, de registre et de validation orientés provider | | `plugin-sdk/speech-core` | Types partagés de provider de parole, assistants de registre, de directive et de normalisation | |
  `plugin-sdk/realtime-transcription` | Types de provider de transcription en temps réel et assistants de registre | | `plugin-sdk/realtime-voice` | Types de provider de voix en temps réel et assistants de registre | | `plugin-sdk/image-generation` | Types de provider de génération d'images | | `plugin-sdk/image-generation-core` | Types partagés de génération d'images, assistants de basculement,
  d'authentification et de registre | | `plugin-sdk/music-generation` | Types de provider/requête/résultat de génération de musique | | `plugin-sdk/music-generation-core` | Types partagés de génération de musique, assistants de basculement, recherche de provider et analyse des références de model | | `plugin-sdk/video-generation` | Types de provider/requête/résultat de génération de vidéo | |
  `plugin-sdk/video-generation-core` | Types partagés de génération de vidéo, assistants de basculement, recherche de provider et analyse des références de model | | `plugin-sdk/webhook-targets` | Registre des cibles Webhook et assistants d'installation de routes | | `plugin-sdk/webhook-path` | Assistants de normalisation des chemins Webhook | | `plugin-sdk/web-media` | Assistants partagés de
  chargement de média distant/local | | `plugin-sdk/zod` | `zod` réexporté pour les consommateurs du plugin SDK | | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
</Accordion>

<Accordion title="Sous-chemins de mémoire">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/memory-core` | Surface d'assistance memory-core groupée pour les assistants de gestionnaire/config/fichier/CLI | | `plugin-sdk/memory-core-engine-runtime` | Façade d'exécution d'index/recherche de mémoire | | `plugin-sdk/memory-core-host-engine-foundation` | Exportations du moteur de fondation de l'hôte de mémoire | |
  `plugin-sdk/memory-core-host-engine-embeddings` | Exportations du moteur d'intégration de l'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-qmd` | Exportations du moteur QMD de l'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-storage` | Exportations du moteur de stockage de l'hôte de mémoire | | `plugin-sdk/memory-core-host-multimodal` | Assistants multimodaux de l'hôte de
  mémoire | | `plugin-sdk/memory-core-host-query` | Assistants de requête de l'hôte de mémoire | | `plugin-sdk/memory-core-host-secret` | Assistants de secret de l'hôte de mémoire | | `plugin-sdk/memory-core-host-events` | Assistants de journal des événements de l'hôte de mémoire | | `plugin-sdk/memory-core-host-status` | Assistants de statut de l'hôte de mémoire | |
  `plugin-sdk/memory-core-host-runtime-cli` | Assistants d'exécution CLI de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-core` | Assistants d'exécution de base de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-files` | Assistants de fichier/exécution de l'hôte de mémoire | | `plugin-sdk/memory-host-core` | Alias neutre par rapport au fournisseur pour les assistants
  d'exécution de base de l'hôte de mémoire | | `plugin-sdk/memory-host-events` | Alias neutre par rapport au fournisseur pour les assistants de journal des événements de l'hôte de mémoire | | `plugin-sdk/memory-host-files` | Alias neutre par rapport au fournisseur pour les assistants de fichier/exécution de l'hôte de mémoire | | `plugin-sdk/memory-host-markdown` | Assistants managed-markdown
  partagés pour les plugins adjacents à la mémoire | | `plugin-sdk/memory-host-search` | Façade d'exécution de mémoire active pour l'accès search-manager | | `plugin-sdk/memory-host-status` | Alias neutre par rapport au fournisseur pour les assistants de statut de l'hôte de mémoire | | `plugin-sdk/memory-lancedb` | Surface d'assistance memory-lancedb groupée |
</Accordion>

  <Accordion title="Sous-chemins d'assistants groupés réservés">
    | Famille | Sous-chemins actuels | Utilisation prévue |
    | --- | --- | --- |
    | Navigateur | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | Assistants de support pour plug-in de navigateur groupés (`browser-support` reste le baril de compatibilité) |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | Surface d'exécution/assistant Matrix groupé |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | Surface d'exécution/assistant LINE groupé |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | Surface d'assistant IRC groupé |
    | Assistants spécifiques au canal | `plugin-sdk/googlechat`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu-conversation`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`, `plugin-sdk/twitch` | Interfaces de compatibilité/assistants de canal groupés |
    | Assistants spécifiques à l'authentification/au plug-in | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | Interfaces d'assistants de fonctionnalités/plug-ins groupés ; `plugin-sdk/github-copilot-token` exporte actuellement `DEFAULT_COPILOT_API_BASE_URL`, `deriveCopilotApiBaseUrlFromToken` et `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## API d'enregistrement

La fonction de rappel `register(api)` reçoit un objet `OpenClawPluginApi` avec ces méthodes :

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

Les espaces de noms d'administration principaux réservés (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) restent toujours `operator.admin`, même si un plugin essaie d'assigner une portée de méthode de passerelle plus étroite. Privilégiez les préfixes spécifiques au plugin pour les méthodes détenues par le plugin.

### Métadonnées d'enregistrement CLI

`api.registerCli(registrar, opts?)` accepte deux types de métadonnées de premier niveau :

- `commands` : racines de commandes explicites détenues par le responsable de l'enregistrement
- `descriptors` : descripteurs de commandes au moment de l'analyse utilisés pour l'aide de la racine CLI, le routage et l'enregistrement différé des CLI de plugin

Si vous souhaitez qu'une commande de plugin reste chargée à la demande dans le chemin normal de la racine CLI, fournissez `descriptors` qui couvrent chaque racine de commande de premier niveau exposée par ce registraire.

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

Utilisez `commands` seul uniquement lorsque vous n'avez pas besoin d'un enregistrement différé de la racine CLI. Ce chemin de compatité impatient reste pris en charge, mais il n'installe pas d'espaces réservés pris en charge par des descripteurs pour le chargement différé au moment de l'analyse.

### Enregistrement du backend CLI

`api.registerCliBackend(...)` permet à un plugin de posséder la configuration par défaut d'un backend CLI IA local tel que `codex-cli`.

- Le `id` du backend devient le préfixe du fournisseur dans les références de modèle comme `codex-cli/gpt-5`.
- Le `config` du backend utilise la même structure que `agents.defaults.cliBackends.<id>`.
- La configuration de l'utilisateur l'emporte toujours. OpenClaw fusionne `agents.defaults.cliBackends.<id>` par-dessus la valeur par défaut du plugin avant d'exécuter le CLI.
- Utilisez `normalizeConfig` lorsqu'un backend a besoin de réécritures de compatibilité après la fusion (par exemple pour normaliser les anciennes formes d'indicateurs).

### Slots exclusifs

| Méthode                                    | Ce qu'il enregistre                                                                                                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | Moteur de contexte (un actif à la fois). Le rappel `assemble()` reçoit `availableTools` et `citationsMode` afin que le moteur puisse adapter les ajouts d'invite. |
| `api.registerMemoryCapability(capability)` | Capacité de mémoire unifiée                                                                                                                                       |
| `api.registerMemoryPromptSection(builder)` | Constructeur de section d'invite de mémoire                                                                                                                       |
| `api.registerMemoryFlushPlan(resolver)`    | Résolveur de plan de vidage de mémoire                                                                                                                            |
| `api.registerMemoryRuntime(runtime)`       | Adaptateur d'exécution de mémoire                                                                                                                                 |

### Adaptateurs d'intégration de mémoire

| Méthode                                        | Ce qu'il enregistre                                      |
| ---------------------------------------------- | -------------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptateur d'intégration de mémoire pour le plugin actif |

- `registerMemoryCapability` est l'API exclusive du plugin de mémoire préférée.
- `registerMemoryCapability` peut également exposer `publicArtifacts.listArtifacts(...)`
  afin que les plugins compagnons puissent consommer les artefacts de mémoire exportés via
  `openclaw/plugin-sdk/memory-host-core` au lieu d'accéder à la disposition privée d'un
  plugin de mémoire spécifique.
- `registerMemoryPromptSection`, `registerMemoryFlushPlan` et
  `registerMemoryRuntime` sont des API de plugin de mémoire exclusives compatibles avec les versions héritées.
- `registerMemoryEmbeddingProvider` permet au plugin de mémoire actif d'enregistrer un
  ou plusieurs identifiants d'adaptateur d'intégration (par exemple `openai`, `gemini`, ou un identifiant personnalisé
  défini par le plugin).
- La configuration utilisateur telle que `agents.defaults.memorySearch.provider` et
  `agents.defaults.memorySearch.fallback` est résolue par rapport à ces identifiants
  d'adaptateur enregistrés.

### Événements et cycle de vie

| Méthode                                      | Ce qu'il fait                     |
| -------------------------------------------- | --------------------------------- |
| `api.on(hookName, handler, opts?)`           | Hook de cycle de vie typé         |
| `api.onConversationBindingResolved(handler)` | Rappel de liaison de conversation |

### Sémantique de décision de hook

- `before_tool_call` : renvoyer `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de priorité inférieure sont ignorés.
- `before_tool_call` : renvoyer `{ block: false }` est traité comme l'absence de décision (identique à l'omission de `block`), et non comme une substitution.
- `before_install` : renvoyer `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de priorité inférieure sont ignorés.
- `before_install` : renvoyer `{ block: false }` est traité comme l'absence de décision (identique à l'omission de `block`), et non comme une substitution.
- `reply_dispatch` : renvoyer `{ handled: true, ... }` est terminal. Une fois qu'un gestionnaire réclame la répartition, les gestionnaires de priorité inférieure et le chemin de répartition du model par défaut sont ignorés.
- `message_sending` : renvoyer `{ cancel: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de priorité inférieure sont ignorés.
- `message_sending` : renvoyer `{ cancel: false }` est traité comme l'absence de décision (identique à l'omission de `cancel`), et non comme une substitution.

### Champs de l'objet API

| Champ                    | Type                      | Description                                                                                                                  |
| ------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | Identifiant du plugin                                                                                                        |
| `api.name`               | `string`                  | Nom d'affichage                                                                                                              |
| `api.version`            | `string?`                 | Version du plugin (facultatif)                                                                                               |
| `api.description`        | `string?`                 | Description du plugin (facultatif)                                                                                           |
| `api.source`             | `string`                  | Chemin source du plugin                                                                                                      |
| `api.rootDir`            | `string?`                 | Répertoire racine du plugin (facultatif)                                                                                     |
| `api.config`             | `OpenClawConfig`          | Instantané de la configuration actuelle (instantané d'exécution en mémoire actif lorsque disponible)                         |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuration spécifique au plugin à partir de `plugins.entries.<id>.config`                                                 |
| `api.runtime`            | `PluginRuntime`           | [Assistants d'exécution](/en/plugins/sdk-runtime)                                                                            |
| `api.logger`             | `PluginLogger`            | Journaliste délimité (`debug`, `info`, `warn`, `error`)                                                                      |
| `api.registrationMode`   | `PluginRegistrationMode`  | Mode de chargement actuel ; `"setup-runtime"` est la fenêtre légère de démarrage/configuration préalable à l'entrée complète |
| `api.resolvePath(input)` | `(string) => string`      | Résoudre le chemin relatif à la racine du plugin                                                                             |

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
  N'importez jamais votre propre plugin via `openclaw/plugin-sdk/<your-plugin>`
  à partir du code de production. Acheminez les importations internes via `./api.ts` ou
  `./runtime-api.ts`. Le chemin du SDK est uniquement le contrat externe.
</Warning>

Les surfaces publiques des plugins regroupés chargés par façade (`api.ts`, `runtime-api.ts`,
`index.ts`, `setup-entry.ts` et fichiers d'entrée publics similaires) préfèrent désormais
l'instantané de la configuration d'exécution active lorsque OpenClaw est déjà en cours d'exécution. Si aucun instantané
d'exécution n'existe encore, ils reviennent au fichier de configuration résolu sur le disque.

Les plugins provider peuvent également exposer un contrat local restreint au plugin lorsqu'un assistant est intentionnellement spécifique au provider et n'appartient pas encore à un sous-chemin de SDK générique. Exemple groupé actuel : le provider Anthropic conserve ses assistants de flux Claude dans sa propre jonction publique `api.ts` / `contract-api.ts` au lieu de promouvoir la logique de bêta-en-tête Anthropic et `service_tier` dans un contrat générique `plugin-sdk/*`.

Autres exemples groupés actuels :

- `@openclaw/openai-provider` : `api.ts` exporte les builders de provider, les assistants de modèle par défaut et les builders de provider en temps réel
- `@openclaw/openrouter-provider` : `api.ts` exporte le builder de provider ainsi que les assistants de configuration/onboarding

<Warning>
  Le code de production d'extension doit également éviter les imports `openclaw/plugin-sdk/<other-plugin>`. Si un assistant est véritablement partagé, promouvez-le vers un sous-chemin de SDK neutre tel que `openclaw/plugin-sdk/speech`, `.../provider-model-shared`, ou une autre surface orientée capacité au lieu de coupler deux plugins ensemble.
</Warning>

## Connexes

- [Points d'entrée](/en/plugins/sdk-entrypoints) — options `definePluginEntry` et `defineChannelPluginEntry`
- [Assistants d'exécution](/en/plugins/sdk-runtime) — référence complète de l'espace de noms `api.runtime`
- [Configuration et installation](/en/plugins/sdk-setup) — empaquetage, manifestes, schémas de configuration
- [Tests](/en/plugins/sdk-testing) — utilitaires de test et règles de lint
- [Migration du SDK](/en/plugins/sdk-migration) — migration depuis des surfaces obsolètes
- [Internes du plugin](/en/plugins/architecture) — architecture approfondie et modèle de capacité
