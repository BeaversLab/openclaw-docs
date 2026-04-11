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

<Tip>**Vous cherchez un guide pratique ?** - Premier plugin ? Commencez par [Getting Started](/en/plugins/building-plugins) - Plugin de canal ? Consultez [Channel Plugins](/en/plugins/sdk-channel-plugins) - Plugin de fournisseur ? Consultez [Provider Plugins](/en/plugins/sdk-provider-plugins)</Tip>

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

<Accordion title="Sous-chemins de fournisseur">
  | Sous-chemin | Principaux exportations | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/provider-setup` | Assistants de configuration de fournisseur local/hébergé triés sur le volet | | `plugin-sdk/self-hosted-provider-setup` | Assistants de configuration de fournisseur auto-hébergé compatibles avec OpenAI | | `plugin-sdk/cli-backend` | Valeurs
  par défaut du backend CLI + constantes du chien de garde | | `plugin-sdk/provider-auth-runtime` | Assistants de résolution de clé d'API au runtime pour les plugins de fournisseur | | `plugin-sdk/provider-auth-api-key` | Assistants d'onboarding/écriture de profil de clé d'API tels que `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | Constructeur de résultats d'authentification OAuth
  standard | | `plugin-sdk/provider-auth-login` | Assistants de connexion interactive partagés pour les plugins de fournisseur | | `plugin-sdk/provider-env-vars` | Assistants de recherche de variables d'environnement d'authentification de fournisseur | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile`, `upsertApiKeyProfile`,
  `writeOAuthCredentials` | | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructeurs de stratégies de relecture partagés, assistants de point de terminaison de fournisseur et assistants de normalisation d'ID de modèle tels que `normalizeNativeXaiModelId` | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`,
  `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | Assistants de capacités HTTP/point de terminaison de fournisseur génériques | | `plugin-sdk/provider-web-fetch-contract` | Assistants de contrat de configuration/sélection de récupération Web étroits tels que `enablePluginInConfig` et
  `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Assistants d'enregistrement/de cache de fournisseur de récupération Web | | `plugin-sdk/provider-web-search-contract` | Assistants de contrat de configuration/identifiants de recherche Web étroits tels que `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig`, et defineurs/obtenteurs d'identifiants délimités | |
  `plugin-sdk/provider-web-search` | Assistants d'exécution/d'enregistrement/de cache de fournisseur de recherche Web | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, nettoyage de schéma Gemini + diagnostics, et assistants de compatibilité xAI tels que `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` |
  `fetchClaudeUsage` et similaires | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, types de wrappers de flux, et assistants de wrappers partagés Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-onboard` | Assistants de correctifs de configuration d'intégration |
  | `plugin-sdk/global-singleton` | Assistants de singleton/cartouche/cache locaux au processus |
</Accordion>

<Accordion title="Chemins d'accès pour l'authentification et la sécurité">
  | Sous-chemin | Principales exportations | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`, assistants de registre de commandes, assistants d'autorisation de l'expéditeur | | `plugin-sdk/approval-auth-runtime` | Résolution de l'approbateur et assistants d'autorisation d'action de même discussion | | `plugin-sdk/approval-client-runtime` | Assistants de profil/filtre
  d'approbation d'exécution native | | `plugin-sdk/approval-delivery-runtime` | Adaptateurs de capacité/livraison d'approbation native | | `plugin-sdk/approval-gateway-runtime` | Assistant partagé de résolution de passerelle d'approbation | | `plugin-sdk/approval-handler-adapter-runtime` | Assistants légers de chargement d'adaptateur d'approbation native pour les points d'entrée de canal à chaud |
  | `plugin-sdk/approval-handler-runtime` | Assistants de runtime plus larges de gestionnaire d'approbation ; privilégiez les interfaces plus étroites d'adaptateur/passerelle lorsqu'elles suffisent | | `plugin-sdk/approval-native-runtime` | Assistants de cible d'approbation native + liaison de compte | | `plugin-sdk/approval-reply-runtime` | Assistants de payload de réponse d'approbation
  d'exécution/plugin | | `plugin-sdk/command-auth-native` | Assistants d'authentification de commande native + assistants de cible de session native | | `plugin-sdk/command-detection` | Assistants partagés de détection de commande | | `plugin-sdk/command-surface` | Assistants de normalisation du corps de commande et de surface de commande | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` |
  | `plugin-sdk/channel-secret-runtime` | Assistants étroits de collection de contrats de secrets pour les surfaces de secrets de canal/plugin | | `plugin-sdk/secret-ref-runtime` | Assistants étroits de `coerceSecretRef` et de frappe SecretRef pour l'analyse de contrat de secret/config | | `plugin-sdk/security-runtime` | Assistants partagés de confiance, de verrouillage DM, de contenu externe et
  de collection de secrets | | `plugin-sdk/ssrf-policy` | Assistants de stratégie SSRF de liste d'autorisation d'hôte et de réseau privé | | `plugin-sdk/ssrf-runtime` | Assistants de répartiteur épinglé, de récupération protégée contre SSRF et de stratégie SSRF | | `plugin-sdk/secret-input` | Assistants d'analyse de l'entrée secrète | | `plugin-sdk/webhook-ingress` | Assistants de requête/cible de
  Webhook | | `plugin-sdk/webhook-request-guards` | Assistants de taille/délai d'attente du corps de la requête |
</Accordion>

<Accordion title="Sous-chemins d'exécution et de stockage">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/runtime` | Assistants larges pour l'exécution/journalisation/sauvegarde/installation de plugin | | `plugin-sdk/runtime-env` | Assistants étroits pour l'environnement d'exécution, le journal, le délai d'attente, la nouvelle tentative et l'attente | | `plugin-sdk/channel-runtime-context` | Assistants génériques d'enregistrement et de
  recherche du contexte d'exécution de canal | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | Assistants partagés pour les commandes/hooks/http/interactifs des plugins | | `plugin-sdk/hook-runtime` | Assistants partagés pour le pipeline webhook/hook interne | | `plugin-sdk/lazy-runtime` | Assistants paresseux d'importation/liaison d'exécution tels que
  `createLazyRuntimeModule`, `createLazyRuntimeMethod` et `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Assistants d'exécution de processus | | `plugin-sdk/cli-runtime` | Assistants de formatage CLI, d'attente et de version | | `plugin-sdk/gateway-runtime` | Assistants de client Gateway et de correctifs d'état de canal | | `plugin-sdk/config-runtime` | Assistants de
  chargement/écriture de configuration | | `plugin-sdk/telegram-command-config` | Normalisation du nom/description de commande Telegram et vérifications des doublons/conflits, même lorsque la surface de contrat Telegram groupée n'est pas disponible | | `plugin-sdk/approval-runtime` | Assistants d'approbation d'exécution/plugin, constructeurs de capacités d'approbation, assistants d'auth/profil,
  assistants de routage/exécution natifs | | `plugin-sdk/reply-runtime` | Assistants partagés d'exécution pour les entrées/réponses, découpage, distribution, heartbeat, planificateur de réponse | | `plugin-sdk/reply-dispatch-runtime` | Assistants étroits de distribution/finalisation de réponse | | `plugin-sdk/reply-history` | Assistants partagés d'historique de réponse à court terme tels que
  `buildHistoryContext`, `recordPendingHistoryEntry` et `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Assistants étroits de découpage de texte/markdown | | `plugin-sdk/session-store-runtime` | Assistants de chemin du magasin de session + mis à jour à | | `plugin-sdk/state-paths` | Assistants de chemin de répertoire
  State/OAuth | | `plugin-sdk/routing` | Assistants de liaison route/clé de session/compte tels que `resolveAgentRoute`, `buildAgentSessionKey` et `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | Assistants partagés de résumé d'état de canal/compte, valeurs par défaut d'état d'exécution et assistants de métadonnées de problème | | `plugin-sdk/target-resolver-runtime` |
  Assistants partagés de résolution de cible | | `plugin-sdk/string-normalization-runtime` | Assistants de normalisation de slug/chaîne | | `plugin-sdk/request-url` | Extraire les URL de chaîne des entrées de type récupération/requête | | `plugin-sdk/run-command` | Exécuteur de commande minuté avec résultats stdout/stderr normalisés | | `plugin-sdk/param-readers` | Lecteurs de paramètres common
  tool/CLI | | `plugin-sdk/tool-send` | Extraire les champs de cible d'envie canoniques des arguments d'outil | | `plugin-sdk/temp-path` | Assistants partagés de chemin de téléchargement temporaire | | `plugin-sdk/logging-core` | Assistants de journal de sous-système et de rédaction | | `plugin-sdk/markdown-table-runtime` | Assistants de mode de tableau Markdown | | `plugin-sdk/json-store` |
  Petits assistants de lecture/écriture d'état JSON | | `plugin-sdk/file-lock` | Assistants de verrouillage de fichier réentrant | | `plugin-sdk/persistent-dedupe` | Assistants de cache de déduplication soutenus par disque | | `plugin-sdk/acp-runtime` | Assistants d'exécution/session ACP et de distribution de réponse | | `plugin-sdk/agent-config-primitives` | Primitives étroites de schéma de
  configuration d'exécution d'agent | | `plugin-sdk/boolean-param` | Lecteur de paramètre booléen lâche | | `plugin-sdk/dangerous-name-runtime` | Assistants de résolution de correspondance de noms dangereux | | `plugin-sdk/device-bootstrap` | Assistants de bootstrap d'appareil et de jeton d'appariement | | `plugin-sdk/extension-shared` | Primitives d'assistant partagées pour canal passif, état et
  proxy ambiant | | `plugin-sdk/models-provider-runtime` | Assistants de réponse de commande/fournisseur `/models` | | `plugin-sdk/skill-commands-runtime` | Assistants de liste de commandes de compétence | | `plugin-sdk/native-command-registry` | Assistants de registre/construction/sérialisation de commandes natives | | `plugin-sdk/provider-zai-endpoint` | Assistants de détection de point de
  terminaison Z.AI | | `plugin-sdk/infra-runtime` | Assistants d'événement système/heartbeat | | `plugin-sdk/collection-runtime` | Petits assistants de cache borné | | `plugin-sdk/diagnostic-runtime` | Assistants de drapeau et d'événement de diagnostic | | `plugin-sdk/error-runtime` | Graphe d'erreurs, formatage, assistants de classification d'erreur partagés, `isApprovalNotFoundError` | |
  `plugin-sdk/fetch-runtime` | Assistants de récupération encapsulée, proxy et recherche épinglée | | `plugin-sdk/host-runtime` | Assistants de normalisation d'hôte SCP et de nom d'hôte | | `plugin-sdk/retry-runtime` | Assistants de configuration de nouvelle tentative et d'exécuteur de nouvelle tentative | | `plugin-sdk/agent-runtime` | Assistants de répertoire/identité/espace de travail d'agent |
  | `plugin-sdk/directory-runtime` | Requête/dédup de répertoire soutenu par configuration | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Sous-chemins de capacités et de tests">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/media-runtime` | Assistants partagés de récupération/transformation/stockage de médias, plus les générateurs de payload média | | `plugin-sdk/media-generation-runtime` | Assistants partagés de basculement pour la génération de médias, la sélection des candidats et la messagerie de modèle manquant | | `plugin-sdk/media-understanding`
  | Types de provider de compréhension des médias plus les exportations d'assistants image/audio orientés provider | | `plugin-sdk/text-runtime` | Assistants partagés texte/markdown/logging tels que le stripping du texte visible par l'assistant, les assistants de rendu/découpage/tableau markdown, les assistants de rédaction, les assistants de balises de directive et les utilitaires de texte
  sécurisé | | `plugin-sdk/text-chunking` | Assistant de découpage de texte sortant | | `plugin-sdk/speech` | Types de provider de parole plus les assistants de directive, de registre et de validation orientés provider | | `plugin-sdk/speech-core` | Types partagés de provider de parole, registre, directive et assistants de normalisation | | `plugin-sdk/realtime-transcription` | Types de provider
  de transcription en temps réel et assistants de registre | | `plugin-sdk/realtime-voice` | Types de provider vocal en temps réel et assistants de registre | | `plugin-sdk/image-generation` | Types de provider de génération d'images | | `plugin-sdk/image-generation-core` | Types partagés de génération d'images, basculement, authentification et assistants de registre | |
  `plugin-sdk/music-generation` | Types de provider/requête/résultat de génération de musique | | `plugin-sdk/music-generation-core` | Types partagés de génération de musique, assistants de basculement, recherche de provider et d'analyse de référence de modèle | | `plugin-sdk/video-generation` | Types de provider/requête/résultat de génération de vidéo | | `plugin-sdk/video-generation-core` |
  Types partagés de génération de vidéo, assistants de basculement, recherche de provider et d'analyse de référence de modèle | | `plugin-sdk/webhook-targets` | Registre de cibles webhook et assistants d'installation de route | | `plugin-sdk/webhook-path` | Assistants de normalisation de chemin webhook | | `plugin-sdk/web-media` | Assistants partagés de chargement de médias distants/locaux | |
  `plugin-sdk/zod` | `zod` réexporté pour les consommateurs du SDK de plugin | | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
</Accordion>

<Accordion title="Sous-chemins de mémoire">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/memory-core` | Surface d'assistance memory-core groupée pour les gestionnaires/configurations/fichiers/assistants CLI | | `plugin-sdk/memory-core-engine-runtime` | Façade de runtime d'index/recherche de mémoire | | `plugin-sdk/memory-core-host-engine-foundation` | Exportations du moteur de fondation de l'hôte de mémoire | |
  `plugin-sdk/memory-core-host-engine-embeddings` | Exportations du moteur d'intégration de l'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-qmd` | Exportations du moteur QMD de l'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-storage` | Exportations du moteur de stockage de l'hôte de mémoire | | `plugin-sdk/memory-core-host-multimodal` | Assistants multimodaux de l'hôte de
  mémoire | | `plugin-sdk/memory-core-host-query` | Assistants de requête de l'hôte de mémoire | | `plugin-sdk/memory-core-host-secret` | Assistants de secrets de l'hôte de mémoire | | `plugin-sdk/memory-core-host-events` | Assistants de journal des événements de l'hôte de mémoire | | `plugin-sdk/memory-core-host-status` | Assistants de statut de l'hôte de mémoire | |
  `plugin-sdk/memory-core-host-runtime-cli` | Assistants de runtime CLI de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-core` | Assistants de runtime central de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-files` | Assistants de runtime fichier/ de l'hôte de mémoire | | `plugin-sdk/memory-host-core` | Alias neutre vis-à-vis du fournisseur pour les assistants de runtime
  central de l'hôte de mémoire | | `plugin-sdk/memory-host-events` | Alias neutre vis-à-vis du fournisseur pour les assistants de journal des événements de l'hôte de mémoire | | `plugin-sdk/memory-host-files` | Alias neutre vis-à-vis du fournisseur pour les assistants de runtime fichier/ de l'hôte de mémoire | | `plugin-sdk/memory-host-markdown` | Assistants managed-markdown partagés pour les
  plugins adjacents à la mémoire | | `plugin-sdk/memory-host-search` | Façade de runtime de mémoire active pour l'accès au gestionnaire de recherche | | `plugin-sdk/memory-host-status` | Alias neutre vis-à-vis du fournisseur pour les assistants de statut de l'hôte de mémoire | | `plugin-sdk/memory-lancedb` | Surface d'assistance memory-lancedb groupée |
</Accordion>

  <Accordion title="Sous-chemins d'helpers groupés réservés">
    | Famille | Sous-chemins actuels | Utilisation prévue |
    | --- | --- | --- |
    | Browser | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | Helpers de support de plugin navigateur groupés (`browser-support` reste le barrel de compatibilité) |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | Surface helper/runtime Matrix groupée |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | Surface helper/runtime LINE groupée |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | Surface helper IRC groupée |
    | Channel-specific helpers | `plugin-sdk/googlechat`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu-conversation`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`, `plugin-sdk/twitch` | Interfaces (seams) de compatibilité/helpers de channel groupés |
    | Auth/plugin-specific helpers | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | Interfaces (seams) d'helpers de fonctionnalité/plugin groupés ; `plugin-sdk/github-copilot-token` exporte actuellement `DEFAULT_COPILOT_API_BASE_URL`, `deriveCopilotApiBaseUrlFromToken`, et `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## API d'enregistrement

Le rappel `register(api)` reçoit un objet `OpenClawPluginApi` avec ces méthodes :

### Enregistrement des capacités

| Méthode                                          | Ce qu'il enregistre                      |
| ------------------------------------------------ | ---------------------------------------- |
| `api.registerProvider(...)`                      | Inférence de texte (LLM)                 |
| `api.registerCliBackend(...)`                    | Backend d'inférence CLI local            |
| `api.registerChannel(...)`                       | Channel de messagerie                    |
| `api.registerSpeechProvider(...)`                | Synthèse parole vers texte / STT         |
| `api.registerRealtimeTranscriptionProvider(...)` | Transcription en temps réel en streaming |
| `api.registerRealtimeVoiceProvider(...)`         | Sessions vocales duplex en temps réel    |
| `api.registerMediaUnderstandingProvider(...)`    | Analyse d'image/audio/vidéo              |
| `api.registerImageGenerationProvider(...)`       | Génération d'images                      |
| `api.registerMusicGenerationProvider(...)`       | Génération de musique                    |
| `api.registerVideoGenerationProvider(...)`       | Génération de vidéo                      |
| `api.registerWebFetchProvider(...)`              | Provider de récupération/scraping Web    |
| `api.registerWebSearchProvider(...)`             | Recherche Web                            |

### Outils et commandes

| Méthode                         | Ce qu'elle enregistre                          |
| ------------------------------- | ---------------------------------------------- |
| `api.registerTool(tool, opts?)` | Outil d'agent (requis ou `{ optional: true }`) |
| `api.registerCommand(def)`      | Commande personnalisée (contourne le LLM)      |

### Infrastructure

| Méthode                                        | Ce qu'elle enregistre                             |
| ---------------------------------------------- | ------------------------------------------------- |
| `api.registerHook(events, handler, opts?)`     | Hook d'événement                                  |
| `api.registerHttpRoute(params)`                | Point de terminaison HTTP Gateway                 |
| `api.registerGatewayMethod(name, handler)`     | Méthode Gateway RPC                               |
| `api.registerCli(registrar, opts?)`            | Sous-commande CLI                                 |
| `api.registerService(service)`                 | Service d'arrière-plan                            |
| `api.registerInteractiveHandler(registration)` | Gestionnaire interactif                           |
| `api.registerMemoryPromptSupplement(builder)`  | Section de prompt additive adjacente à la mémoire |
| `api.registerMemoryCorpusSupplement(adapter)`  | Corpus de recherche/lecture de mémoire additive   |

Les espaces de noms d'administration réservés du cœur (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) restent toujours `operator.admin`, même si un plugin essaie d'assigner une portée de méthode de passerelle plus étroite. Préférez des préfixes spécifiques au plugin pour les méthodes détenues par le plugin.

### Métadonnées d'enregistrement CLI

`api.registerCli(registrar, opts?)` accepte deux types de métadonnées de premier niveau :

- `commands` : racines de commandes explicites détenues par le registraire
- `descriptors` : descripteurs de commandes au moment de l'analyse utilisés pour l'aide de la CLI racine,
  le routage et l'enregistrement différé de CLI de plugin

Si vous souhaitez qu'une commande de plugin reste chargée à la demande dans le chemin racine normal de la CLI, fournissez `descriptors` qui couvrent chaque racine de commande de premier niveau exposée par ce registraire.

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

Utilisez `commands` seul uniquement lorsque vous n'avez pas besoin de l'enregistrement racine de la CLI en chargement différé. Ce chemin de compatibilité impatient reste pris en charge, mais il n'installe pas d'espaces réservés basés sur des descripteurs pour le chargement différé au moment de l'analyse.

### Enregistrement du backend CLI

`api.registerCliBackend(...)` permet à un plugin de posséder la configuration par défaut d'un backend CLI local tel que `codex-cli`.

- Le `id` du backend devient le préfixe du fournisseur dans les références de modèle comme `codex-cli/gpt-5`.
- Le `config` du backend utilise la même forme que `agents.defaults.cliBackends.<id>`.
- La configuration de l'utilisateur l'emporte toujours. OpenClaw fusionne `agents.defaults.cliBackends.<id>` par-dessus la valeur par défaut du plugin avant d'exécuter la CLI.
- Utilisez `normalizeConfig` lorsqu'un backend a besoin de réécritures de compatibilité après la fusion (par exemple pour normaliser les anciennes formes d'indicateurs).

### Emplacements exclusifs

| Méthode                                    | Ce qu'il enregistre                          |
| ------------------------------------------ | -------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | Moteur de contexte (un actif à la fois)      |
| `api.registerMemoryCapability(capability)` | Capacité de mémoire unifiée                  |
| `api.registerMemoryPromptSection(builder)` | Constructeur de section de prompt de mémoire |
| `api.registerMemoryFlushPlan(resolver)`    | Résolveur de plan de vidage de mémoire       |
| `api.registerMemoryRuntime(runtime)`       | Adaptateur d'exécution de mémoire            |

### Adaptateurs d'incorporation de mémoire

| Méthode                                        | Ce qu'il enregistre                                        |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptateur d'incorporation de mémoire pour le plugin actif |

- `registerMemoryCapability` est l'API exclusive de plugin de mémoire préférée.
- `registerMemoryCapability` peut également exposer `publicArtifacts.listArtifacts(...)`
  afin que les plugins compagnons puissent consommer les artefacts de mémoire exportés via
  `openclaw/plugin-sdk/memory-host-core` au lieu d'accéder à la disposition privée d'un
  plugin de mémoire spécifique.
- `registerMemoryPromptSection`, `registerMemoryFlushPlan` et
  `registerMemoryRuntime` sont des API exclusives de plugin de mémoire compatibles avec les versions héritées.
- `registerMemoryEmbeddingProvider` permet au plugin de mémoire actif d'enregistrer un ou plusieurs identifiants d'adaptateur d'incorporation (par exemple `openai`, `gemini`, ou un identifiant personnalisé défini par le plugin).
- La configuration utilisateur telle que `agents.defaults.memorySearch.provider` et `agents.defaults.memorySearch.fallback` est résolue par rapport à ces identifiants d'adaptateur enregistrés.

### Événements et cycle de vie

| Méthode                                      | Ce qu'il fait                       |
| -------------------------------------------- | ----------------------------------- |
| `api.on(hookName, handler, opts?)`           | Hook de cycle de vie typé           |
| `api.onConversationBindingResolved(handler)` | Callback de liaison de conversation |

### Sémantique de décision de hook

- `before_tool_call` : retourner `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de priorité inférieure sont ignorés.
- `before_tool_call` : retourner `{ block: false }` est traité comme l'absence de décision (identique à l'omission de `block`), et non comme une substitution.
- `before_install` : retourner `{ block: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de priorité inférieure sont ignorés.
- `before_install` : retourner `{ block: false }` est traité comme l'absence de décision (identique à l'omission de `block`), et non comme une substitution.
- `reply_dispatch` : retourner `{ handled: true, ... }` est terminal. Une fois qu'un gestionnaire réclame la répartition, les gestionnaires de priorité inférieure et le chemin de répartition du modèle par défaut sont ignorés.
- `message_sending` : retourner `{ cancel: true }` est terminal. Une fois qu'un gestionnaire l'a défini, les gestionnaires de priorité inférieure sont ignorés.
- `message_sending` : retourner `{ cancel: false }` est traité comme l'absence de décision (identique à l'omission de `cancel`), et non comme une substitution.

### Champs de l'objet API

| Champ                    | Type                      | Description                                                                                                                |
| ------------------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | Identifiant du plugin                                                                                                      |
| `api.name`               | `string`                  | Nom d'affichage                                                                                                            |
| `api.version`            | `string?`                 | Version du plugin (facultatif)                                                                                             |
| `api.description`        | `string?`                 | Description du plugin (facultatif)                                                                                         |
| `api.source`             | `string`                  | Chemin source du plugin                                                                                                    |
| `api.rootDir`            | `string?`                 | Répertoire racine du plugin (optionnel)                                                                                    |
| `api.config`             | `OpenClawConfig`          | Instantané de la configuration actuelle (instantané d'exécution en mémoire actif lorsqu'il est disponible)                 |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuration spécifique au plugin à partir de `plugins.entries.<id>.config`                                               |
| `api.runtime`            | `PluginRuntime`           | [Assistants d'exécution](/en/plugins/sdk-runtime)                                                                          |
| `api.logger`             | `PluginLogger`            | Enregistreur avec portée (`debug`, `info`, `warn`, `error`)                                                                |
| `api.registrationMode`   | `PluginRegistrationMode`  | Mode de chargement actuel ; `"setup-runtime"` est la fenêtre de démarrage/configuration légère précédant l'entrée complète |
| `api.resolvePath(input)` | `(string) => string`      | Résoudre le chemin relatif à la racine du plugin                                                                           |

## Convention de module interne

Dans votre plugin, utilisez des fichiers barrel locaux pour les importations internes :

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  N'importez jamais votre propre plugin via `openclaw/plugin-sdk/<your-plugin>`
  depuis du code de production. Acheminez les importations internes via `./api.ts` ou
  `./runtime-api.ts`. Le chemin du SDK est uniquement le contrat externe.
</Warning>

Les surfaces publiques des plugins groupés chargés par façade (`api.ts`, `runtime-api.ts`,
`index.ts`, `setup-entry.ts` et fichiers d'entrée publics similaires) préfèrent désormais
l'instantané de configuration d'exécution actif lorsque OpenClaw est déjà en cours d'exécution. Si aucun instantané
d'exécution n'existe encore, ils reviennent au fichier de configuration résolu sur le disque.

Les plugins de fournisseur peuvent également exposer un barrel de contrat local étroit pour le plugin lorsqu'une aide est intentionnellement spécifique au fournisseur et n'appartient pas encore à un sous-chemin de SDK générique. Exemple groupé actuel : le fournisseur Anthropic conserve ses aides de flux Claude dans sa propre couture publique `api.ts` / `contract-api.ts` au lieu de promouvoir la logique d'en-tête bêta Anthropic et `service_tier` dans un contrat `plugin-sdk/*` générique.

Autres exemples groupés actuels :

- `@openclaw/openai-provider` : `api.ts` exporte les builders de fournisseur,
  les aides de modèle par défaut et les builders de fournisseur en temps réel
- `@openclaw/openrouter-provider` : `api.ts` exporte le builder de fournisseur ainsi
  que les aides d'onboarding/config

<Warning>
  Le code de production d'extension doit également éviter les imports `openclaw/plugin-sdk/<other-plugin>`.
  Si une aide est véritablement partagée, promouvez-la vers un sous-chemin de SDK neutre
  tel que `openclaw/plugin-sdk/speech`, `.../provider-model-shared`, ou une autre surface orientée capacité
  au lieu de coupler deux plugins entre eux.
</Warning>

## Connexes

- [Points d'entrée](/en/plugins/sdk-entrypoints) — options `definePluginEntry` et `defineChannelPluginEntry`
- [Aides d'exécution](/en/plugins/sdk-runtime) — référence complète de l'espace de noms `api.runtime`
- [Configuration et installation](/en/plugins/sdk-setup) — packaging, manifestes, schémas de configuration
- [Tests](/en/plugins/sdk-testing) — utilitaires de test et règles de lint
- [Migration du SDK](/en/plugins/sdk-migration) — migration depuis des surfaces obsolètes
- [Internes du plugin](/en/plugins/architecture) — architecture approfondie et modèle de capacité
