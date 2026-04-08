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

<Tip>**Vous cherchez un guide pratique ?** - Premier plugin ? Commencez par [Getting Started](/en/plugins/building-plugins) - Plugin channel ? Voir [Channel Plugins](/en/plugins/sdk-channel-plugins) - Plugin provider ? Voir [Provider Plugins](/en/plugins/sdk-provider-plugins)</Tip>

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
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, ainsi que `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | Assistants de configuration partagée, invites de liste d'autorisation, constructeurs de statut de configuration |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | Assistants de configuration/action de multi-compte, assistants de repli de compte par défaut |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`, assistants de normalisation de l'ID de compte |
    | `plugin-sdk/account-resolution` | Recherche de compte + assistants de repli par défaut |
    | `plugin-sdk/account-helpers` | Assistants de liste de comptes/actions restreints |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | Types de schéma de configuration de canal |
    | `plugin-sdk/telegram-command-config` | Assistants de normalisation/validation de commandes personnalisées Telegram avec repli de contrat groupé |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink` |
    | `plugin-sdk/inbound-envelope` | Assistants de construction de route entrante partagée + enveloppe |
    | `plugin-sdk/inbound-reply-dispatch` | Assistants d'enregistrement et de répartition entrants partagés |
    | `plugin-sdk/messaging-targets` | Assistants d'analyse et de correspondance de cibles |
    | `plugin-sdk/outbound-media` | Assistants de chargement de média sortant partagé |
    | `plugin-sdk/outbound-runtime` | Assistants de délégué d'identité/envoi sortant |
    | `plugin-sdk/thread-bindings-runtime` | Assistants de cycle de vie et d'adaptateur de liaison de fil |
    | `plugin-sdk/agent-media-payload` | Constructeur de charge utile média d'agent hérité |
    | `plugin-sdk/conversation-runtime` | Assistants de liaison, d'appariement et de liaison configurée de conversation/fil |
    | `plugin-sdk/runtime-config-snapshot` | Assistant d'instantané de configuration d'exécution |
    | `plugin-sdk/runtime-group-policy` | Assistants de résolution de stratégie de groupe d'exécution |
    | `plugin-sdk/channel-status` | Assistants d'instantané/résumé de statut de canal partagé |
    | `plugin-sdk/channel-config-primitives` | Primitifs de schéma de configuration de canal restreints |
    | `plugin-sdk/channel-config-writes` | Assistants d'autorisation d'écriture de configuration de canal |
    | `plugin-sdk/channel-plugin-common` | Exportations de préambule de plugin de canal partagé |
    | `plugin-sdk/allowlist-config-edit` | Assistants de modification/lecture de configuration de liste d'autorisation |
    | `plugin-sdk/group-access` | Assistants de décision d'accès de groupe partagé |
    | `plugin-sdk/direct-dm` | Assistants d'authentification/garde de Telegram direct partagé |
    | `plugin-sdk/interactive-runtime` | Assistants de normalisation/réduction de charge utile de réponse interactive |
    | `plugin-sdk/channel-inbound` | Anti-rebond, correspondance de mentions, assistants d'enveloppe |
    | `plugin-sdk/channel-send-result` | Types de résultats de réponse |
    | `plugin-sdk/channel-actions` | `createMessageToolButtonsSchema`, `createMessageToolCardSchema` |
    | `plugin-sdk/channel-targets` | Assistants d'analyse et de correspondance de cibles |
    | `plugin-sdk/channel-contract` | Types de contrat de canal |
    | `plugin-sdk/channel-feedback` | Câblage de feedback/réaction |
  </Accordion>

<Accordion title="Sous-chemins de fournisseur">
  | Sous-chemin | Principales exportations | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/provider-setup` | Assistants de configuration de fournisseur local/auto-hébergé sélectionnés | | `plugin-sdk/self-hosted-provider-setup` | Assistants de configuration de fournisseur auto-hébergé compatibles avec OpenAI | | `plugin-sdk/provider-auth-runtime` |
  Assistants de résolution de clé d'API au moment de l'exécution pour les plugins de fournisseur | | `plugin-sdk/provider-auth-api-key` | Assistants d'intégration/écriture de profil pour la clé d'API | | `plugin-sdk/provider-auth-result` | Générateur de résultats d'authentification OAuth standard | | `plugin-sdk/provider-auth-login` | Assistants de connexion interactive partagés pour les plugins
  de fournisseur | | `plugin-sdk/provider-env-vars` | Assistants de recherche de variables d'environnement d'authentification de fournisseur | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile` | | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, générateurs
  de stratégies de relecture partagés, assistants de point de terminaison de fournisseur et assistants de normalisation d'ID de modèle tels que `normalizeNativeXaiModelId` | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | Assistants de
  capacités HTTP/point de terminaison de fournisseur génériques | | `plugin-sdk/provider-web-fetch` | Assistants d'enregistrement/de cache de fournisseur de récupération Web | | `plugin-sdk/provider-web-search` | Assistants d'enregistrement/de cache/de configuration de fournisseur de recherche Web | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`,
  nettoyage + diagnostics de schéma Gemini et assistants de compatibilité xAI tels que `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` et similaires | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, types de wrapper de flux et assistants de wrapper partagés
  Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-onboard` | Assistants de correctifs de configuration d'intégration | | `plugin-sdk/global-singleton` | Assistants de singleton/carte/cache locaux au processus |
</Accordion>

<Accordion title="Sous-chemins d'authentification et de sécurité">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`, helpers de registre de commandes, helpers d'autorisation de l'expéditeur | | `plugin-sdk/approval-auth-runtime` | Résolution de l'approbateur et helpers d'autorisation d'action de même chat | | `plugin-sdk/approval-client-runtime` | Helpers de profil/filtre d'approbation d'exécution
  native | | `plugin-sdk/approval-delivery-runtime` | Adaptateurs de capacité/livraison d'approbation native | | `plugin-sdk/approval-native-runtime` | Helpers de cible d'approbation native + liaison de compte | | `plugin-sdk/approval-reply-runtime` | Helpers de payload de réponse d'approbation d'exécution/plugin | | `plugin-sdk/command-auth-native` | Auth de commande native + helpers de cible de
  session native | | `plugin-sdk/command-detection` | Helpers de détection de commande partagée | | `plugin-sdk/command-surface` | Helpers de normalisation du corps de commande et de surface de commande | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/security-runtime` | Helpers de confiance partagée, de restriction DM, de contenu externe et de collection de secrets | |
  `plugin-sdk/ssrf-policy` | Helpers de liste d'autorisation d'hôte et de stratégie SSRF de réseau privé | | `plugin-sdk/ssrf-runtime` | Répartiteur épinglé, récupération protégée contre les SSRF et helpers de stratégie SSRF | | `plugin-sdk/secret-input` | Helpers d'analyse de l'entrée de secret | | `plugin-sdk/webhook-ingress` | Helpers de requête/cible de webhook | |
  `plugin-sdk/webhook-request-guards` | Helpers de taille/délai d'expiration du corps de la requête |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/runtime` | Assistants d'exécution larges pour la journalisation, les sauvegardes et l'installation de plugins | | `plugin-sdk/runtime-env` | Assistants d'exécution étroits pour l'environnement, la journalisation, le délai d'expiration, la nouvelle tentative et l'attente | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | |
  `plugin-sdk/plugin-runtime` | Assistants partagés pour les commandes, les hooks, HTTP et l'interactivité des plugins | | `plugin-sdk/hook-runtime` | Assistants partagés pour les pipelines de webhooks et de hooks internes | | `plugin-sdk/lazy-runtime` | Assistants paresseux pour l'importation et la liaison de l'exécution, tels que `createLazyRuntimeModule`, `createLazyRuntimeMethod` et
  `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Assistants d'exécution de processus | | `plugin-sdk/cli-runtime` | Assistants de formatage CLI, d'attente et de version | | `plugin-sdk/gateway-runtime` | Assistants de client Gateway et de correctifs d'état de channel | | `plugin-sdk/config-runtime` | Assistants de chargement et d'écriture de configuration | |
  `plugin-sdk/telegram-command-config` | Normalisation des noms/descriptions de commande Telegram et vérifications des doublons/conflits, même lorsque la surface de contrat Telegram groupée n'est pas disponible | | `plugin-sdk/approval-runtime` | Assistants d'approbation d'exécution/plugin, constructeurs de capacités d'approbation, assistants d'authentification/profil, assistants de
  routage/exécution natifs | | `plugin-sdk/reply-runtime` | Assistants d'exécution partagés pour les entrées/réponses, le découpage, la distribution, le battement de cœur et le planificateur de réponses | | `plugin-sdk/reply-dispatch-runtime` | Assistants étroits de distribution/finalisation des réponses | | `plugin-sdk/reply-history` | Assistants partagés pour l'historique des réponses à court
  terme, tels que `buildHistoryContext`, `recordPendingHistoryEntry` et `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Assistants étroits de découpage de texte/markdown | | `plugin-sdk/session-store-runtime` | Assistants de chemin du magasin de session + mis à jour à | | `plugin-sdk/state-paths` | Assistants de
  chemin de répertoire État/OAuth | | `plugin-sdk/routing` | Assistants de liaison de route/clé de session/compte, tels que `resolveAgentRoute`, `buildAgentSessionKey` et `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | Assistants partagés de résumé d'état de channel/compte, valeurs par défaut d'état d'exécution et assistants de métadonnées de problème | |
  `plugin-sdk/target-resolver-runtime` | Assistants partagés de résolution de cible | | `plugin-sdk/string-normalization-runtime` | Assistants de normalisation de slug/chaîne | | `plugin-sdk/request-url` | Extraire les URL de chaîne des entrées de type récupération/requête | | `plugin-sdk/run-command` | Exécuteur de commande chronométré avec résultats normalisés stdout/stderr | |
  `plugin-sdk/param-readers` | Lecteurs de paramètres tool/CLI courants | | `plugin-sdk/tool-send` | Extraire les champs de cible d'envie canoniques des arguments tool | | `plugin-sdk/temp-path` | Assistants partagés de chemin de téléchargement temporaire | | `plugin-sdk/logging-core` | Assistants de journalisation et de rédaction de sous-système | | `plugin-sdk/markdown-table-runtime` |
  Assistants de mode de tableau Markdown | | `plugin-sdk/json-store` | Petits assistants de lecture/écriture d'état JSON | | `plugin-sdk/file-lock` | Assistants de verrouillage de fichier réentrant | | `plugin-sdk/persistent-dedupe` | Assistants de cache de déduplication soutenu par disque | | `plugin-sdk/acp-runtime` | Assistants d'exécution/session ACP et de distribution de réponses | |
  `plugin-sdk/agent-config-primitives` | Primitives étroites de schéma de configuration d'exécution d'agent | | `plugin-sdk/boolean-param` | Lecteur de paramètre booléen lâche | | `plugin-sdk/dangerous-name-runtime` | Assistants de résolution de correspondance de nom dangereux | | `plugin-sdk/device-bootstrap` | Assistants de bootstrap d'appareil et de jeton d'appariement | |
  `plugin-sdk/extension-shared` | Primitives d'assistance de channel passif et d'état partagées | | `plugin-sdk/models-provider-runtime` | Assistants de réponse de commande/provider `/models` | | `plugin-sdk/skill-commands-runtime` | Assistants de liste de commandes de compétence | | `plugin-sdk/native-command-registry` | Assistants natifs de registre/construction/sérialisation de commandes | |
  `plugin-sdk/provider-zai-endpoint` | Assistants de détection de point de terminaison Z.AI | | `plugin-sdk/infra-runtime` | Assistants d'événement système/battement de cœur | | `plugin-sdk/collection-runtime` | Petits assistants de cache borné | | `plugin-sdk/diagnostic-runtime` | Assistants de drapeau de diagnostic et d'événement | | `plugin-sdk/error-runtime` | Graphe d'erreur, formatage,
  assistants de classification d'erreur partagée, `isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | Assistants de récupération encapsulée, de proxy et de recherche épinglée | | `plugin-sdk/host-runtime` | Assistants de normalisation du nom d'hôte et de l'hôte SCP | | `plugin-sdk/retry-runtime` | Assistants de configuration de nouvelle tentative et d'exécuteur de nouvelle tentative | |
  `plugin-sdk/agent-runtime` | Assistants de répertoire/identité/espace de travail d'agent | | `plugin-sdk/directory-runtime` | Requête/dédup de répertoire soutenu par configuration | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Sous-chemins de capacité et de tests">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/media-runtime` | Assistants partagés de récupération/transformation/stockage de médias et constructeurs de charges utiles multimédias | | `plugin-sdk/media-understanding` | Types de provider de compréhension multimédia plus exportations d'assistants image/audio orientés provider | | `plugin-sdk/text-runtime` | Assistants partagés de
  texte/markdown/journalisation tels que le stripping du texte visible par l'assistant, les assistants de rendu/découpage/tableau markdown, les assistants de rédaction, les assistants de balises de directive et les utilitaires de texte sécurisé | | `plugin-sdk/text-chunking` | Assistant de découpage de texte sortant | | `plugin-sdk/speech` | Types de provider de parole plus assistants de
  directive, de registre et de validation orientés provider | | `plugin-sdk/speech-core` | Types partagés de provider de parole, registre, directive et assistants de normalisation | | `plugin-sdk/realtime-transcription` | Types de provider de transcription en temps réel et assistants de registre | | `plugin-sdk/realtime-voice` | Types de provider de voix en temps réel et assistants de registre | |
  `plugin-sdk/image-generation` | Types de provider de génération d'images | | `plugin-sdk/image-generation-core` | Types partagés de génération d'images, bascuillage, authentification et assistants de registre | | `plugin-sdk/music-generation` | Types de provider/requête/résultat de génération de musique | | `plugin-sdk/music-generation-core` | Types partagés de génération de musique, assistants
  de basculement, recherche de provider et analyse de références de modèle | | `plugin-sdk/video-generation` | Types de provider/requête/résultat de génération de vidéo | | `plugin-sdk/video-generation-core` | Types partagés de génération de vidéo, assistants de basculement, recherche de provider et analyse de références de modèle | | `plugin-sdk/webhook-targets` | Registre des cibles Webhook et
  assistants d'installation de routes | | `plugin-sdk/webhook-path` | Assistants de normalisation de chemin Webhook | | `plugin-sdk/web-media` | Assistants partagés de chargement de médias distants/locaux | | `plugin-sdk/zod` | `zod` réexporté pour les consommateurs du SDK de plugin | | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
</Accordion>

<Accordion title="Sous-chemins de la mémoire">
  | Sous-chemin | Principales exportations | | --- | --- | | `plugin-sdk/memory-core` | Surface d'assistance memory-core groupée pour les helpers manager/config/file/CLI | | `plugin-sdk/memory-core-engine-runtime` | Façade d'exécution d'index/recherche de mémoire | | `plugin-sdk/memory-core-host-engine-foundation` | Exportations du moteur de fondation de l'hôte de mémoire | |
  `plugin-sdk/memory-core-host-engine-embeddings` | Exportations du moteur d'intégration de l'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-qmd` | Exportations du moteur QMD de l'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-storage` | Exportations du moteur de stockage de l'hôte de mémoire | | `plugin-sdk/memory-core-host-multimodal` | Assistants multimodaux de l'hôte de
  mémoire | | `plugin-sdk/memory-core-host-query` | Assistants de requête de l'hôte de mémoire | | `plugin-sdk/memory-core-host-secret` | Assistants de secret de l'hôte de mémoire | | `plugin-sdk/memory-core-host-status` | Assistants de statut de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-cli` | Assistants d'exécution CLI de l'hôte de mémoire | |
  `plugin-sdk/memory-core-host-runtime-core` | Assistants d'exécution de base de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-files` | Assistants fichier/exécution de l'hôte de mémoire | | `plugin-sdk/memory-lancedb` | Surface d'assistance memory-lancedb groupée |
</Accordion>

  <Accordion title="Sous-chemins d'assistants regroupés réservés">
    | Famille | Sous-chemins actuels | Utilisation prévue |
    | --- | --- | --- |
    | Navigateur | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | Assistants de support pour plugin de navigateur regroupés (`browser-support` reste le baril de compatibilité) |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | Surface d'assistant/runtime Matrix regroupée |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | Surface d'assistant/runtime LINE regroupée |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | Surface d'assistant IRC regroupée |
    | Assistants spécifiques au channel | `plugin-sdk/googlechat`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu-conversation`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`, `plugin-sdk/twitch` | Interfaces de compatibilité/d'assistance de channel regroupées |
    | Assistants spécifiques à l'auth/plugin | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | Interfaces d'assistance de fonctionnalité/plugin regroupées ; `plugin-sdk/github-copilot-token` exporte actuellement `DEFAULT_COPILOT_API_BASE_URL`, `deriveCopilotApiBaseUrlFromToken` et `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## API d'enregistrement

Le rappel `register(api)` reçoit un objet `OpenClawPluginApi` avec ces
méthodes :

### Enregistrement des capacités

| Méthode                                          | Ce qu'il enregistre                      |
| ------------------------------------------------ | ---------------------------------------- |
| `api.registerProvider(...)`                      | Inférence de texte (LLM)                 |
| `api.registerChannel(...)`                       | Channel de messagerie                    |
| `api.registerSpeechProvider(...)`                | Synthèse texte-vers-parole / STT         |
| `api.registerRealtimeTranscriptionProvider(...)` | Transcription en temps réel en streaming |
| `api.registerRealtimeVoiceProvider(...)`         | Sessions vocales en temps réel duplex    |
| `api.registerMediaUnderstandingProvider(...)`    | Analyse d'image/audio/vidéo              |
| `api.registerImageGenerationProvider(...)`       | Génération d'images                      |
| `api.registerMusicGenerationProvider(...)`       | Génération de musique                    |
| `api.registerVideoGenerationProvider(...)`       | Génération de vidéo                      |
| `api.registerWebFetchProvider(...)`              | Provider de récupération/extraction Web  |
| `api.registerWebSearchProvider(...)`             | Recherche Web                            |

### Outils et commandes

| Méthode                         | Ce qu'il enregistre                            |
| ------------------------------- | ---------------------------------------------- |
| `api.registerTool(tool, opts?)` | Outil d'agent (requis ou `{ optional: true }`) |
| `api.registerCommand(def)`      | Commande personnalisée (contourne le LLM)      |

### Infrastructure

| Méthode                                        | Ce qu'il enregistre               |
| ---------------------------------------------- | --------------------------------- |
| `api.registerHook(events, handler, opts?)`     | Hook d'événement                  |
| `api.registerHttpRoute(params)`                | Point de terminaison HTTP Gateway |
| `api.registerGatewayMethod(name, handler)`     | Méthode Gateway RPC               |
| `api.registerCli(registrar, opts?)`            | Sous-commande CLI                 |
| `api.registerService(service)`                 | Service d'arrière-plan            |
| `api.registerInteractiveHandler(registration)` | Gestionnaire interactif           |

Les espaces de noms d'administration principaux réservés (`config.*`, `exec.approvals.*`, `wizard.*`,
`update.*`) restent toujours `operator.admin`, même si un plugin tente d'assigner une
portée de méthode de passerelle plus étroite. Préférez des préfixes spécifiques aux plugins pour
les méthodes détenues par les plugins.

### Métadonnées d'enregistrement CLI

`api.registerCli(registrar, opts?)` accepte deux types de métadonnées de premier niveau :

- `commands` : racines de commandes explicites détenues par le registraire
- `descriptors` : descripteurs de commandes au moment de l'analyse utilisés pour l'aide de la CLI racine,
  le routage et l'enregistrement différé des plugins CLI

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

Utilisez `commands` seul uniquement lorsque vous n'avez pas besoin de l'enregistrement de racine CLI chargée à la demande.
Ce chemin de compatibilité impatient reste pris en charge, mais il n'installe pas
les espaces réservés sauvegardés par des descripteurs pour le chargement à la demande au moment de l'analyse.

### Slots exclusifs

| Méthode                                    | Ce qu'il enregistre                        |
| ------------------------------------------ | ------------------------------------------ |
| `api.registerContextEngine(id, factory)`   | Moteur de contexte (un actif à la fois)    |
| `api.registerMemoryPromptSection(builder)` | Générateur de section de prompt de mémoire |
| `api.registerMemoryFlushPlan(resolver)`    | Résolveur de plan de vidage de mémoire     |
| `api.registerMemoryRuntime(runtime)`       | Adaptateur d'exécution de mémoire          |

### Adaptateurs d'incorporation de mémoire

| Méthode                                        | Ce qu'il enregistre                                        |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | Adaptateur d'incorporation de mémoire pour le plugin actif |

- `registerMemoryPromptSection`, `registerMemoryFlushPlan` et
  `registerMemoryRuntime` sont exclusifs aux plugins de mémoire.
- `registerMemoryEmbeddingProvider` permet au plugin de mémoire actif d'enregistrer un
  ou plusieurs identifiants d'adaptateur d'incorporation (par exemple `openai`, `gemini`, ou un
  identifiant défini par un plugin personnalisé).
- La configuration utilisateur telle que `agents.defaults.memorySearch.provider` et
  `agents.defaults.memorySearch.fallback` est résolue par rapport à ces identifiants
  d'adaptateur enregistrés.

### Événements et cycle de vie

| Méthode                                      | Ce qu'il fait                     |
| -------------------------------------------- | --------------------------------- |
| `api.on(hookName, handler, opts?)`           | Hook de cycle de vie typé         |
| `api.onConversationBindingResolved(handler)` | Rappel de liaison de conversation |

### Sémantique de décision de hook

- `before_tool_call` : renvoyer `{ block: true }` est terminal. Une fois que tout gestionnaire l'a défini, les gestionnaires de priorité inférieure sont ignorés.
- `before_tool_call` : renvoyer `{ block: false }` est traité comme une absence de décision (identique à l'omission de `block`), et non comme une substitution.
- `before_install` : renvoyer `{ block: true }` est terminal. Une fois que tout gestionnaire l'a défini, les gestionnaires de priorité inférieure sont ignorés.
- `before_install` : renvoyer `{ block: false }` est traité comme une absence de décision (identique à l'omission de `block`), et non comme une substitution.
- `reply_dispatch` : renvoyer `{ handled: true, ... }` est terminal. Une fois qu'un gestionnaire réclame la répartition, les gestionnaires de moindre priorité et le chemin de répartition par défaut du modèle sont ignorés.
- `message_sending` : renvoyer `{ cancel: true }` est terminal. Une fois qu'un gestionnaire le définit, les gestionnaires de moindre priorité sont ignorés.
- `message_sending` : renvoyer `{ cancel: false }` est traité comme l'absence de décision (identique à l'omission de `cancel`), et non comme une substitution.

### Champs de l'objet API

| Champ                    | Type                      | Description                                                                                                                  |
| ------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | ID du plugin                                                                                                                 |
| `api.name`               | `string`                  | Nom d'affichage                                                                                                              |
| `api.version`            | `string?`                 | Version du plugin (facultatif)                                                                                               |
| `api.description`        | `string?`                 | Description du plugin (facultatif)                                                                                           |
| `api.source`             | `string`                  | Chemin source du plugin                                                                                                      |
| `api.rootDir`            | `string?`                 | Répertoire racine du plugin (facultatif)                                                                                     |
| `api.config`             | `OpenClawConfig`          | Instantané de la configuration actuelle (instantané d'exécution en mémoire actif lorsqu'il est disponible)                   |
| `api.pluginConfig`       | `Record<string, unknown>` | Configuration spécifique au plugin provenant de `plugins.entries.<id>.config`                                                |
| `api.runtime`            | `PluginRuntime`           | [Assistants d'exécution](/en/plugins/sdk-runtime)                                                                            |
| `api.logger`             | `PluginLogger`            | Enregistreur délimité (`debug`, `info`, `warn`, `error`)                                                                     |
| `api.registrationMode`   | `PluginRegistrationMode`  | Mode de chargement actuel ; `"setup-runtime"` est la fenêtre légère de démarrage/configuration préalable à l'entrée complète |
| `api.resolvePath(input)` | `(string) => string`      | Résoudre le chemin relatif à la racine du plugin                                                                             |

## Convention de module interne

Au sein de votre plugin, utilisez des fichiers d'agrégation (barrel files) locaux pour les importations internes :

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

Les surfaces publiques des plugins regroupés chargés par façade (`api.ts`, `runtime-api.ts`,
`index.ts`, `setup-entry.ts`, et les fichiers d'entrée publics similaires) privilégient désormais l'instantané de configuration d'exécution actif lorsque OpenClaw est déjà en cours d'exécution. Si aucun instantané d'exécution n'existe encore, elles reviennent au fichier de configuration résolu sur le disque.

Les plugins de fournisseur peuvent également exposer un contrat local de plugin étroit lorsqu'une aide est intentionnellement spécifique au fournisseur et n'appartient pas encore à un sous-chemin SDK générique. Exemple actuel regroupé : le fournisseur Anthropic conserve ses aides de flux Claude dans sa propre jonction publique `api.ts` / `contract-api.ts` au lieu de promouvoir la logique d'en-tête bêta Anthropic et `service_tier` dans un contrat `plugin-sdk/*` générique.

Autres exemples regroupés actuels :

- `@openclaw/openai-provider` : `api.ts` exporte les constructeurs de fournisseurs,
  les aides de modèle par défaut et les constructeurs de fournisseurs en temps réel
- `@openclaw/openrouter-provider` : `api.ts` exporte le constructeur de fournisseur ainsi
  que les aides d'intégration/configuration

<Warning>
  Le code de production des extensions doit également éviter les importations `openclaw/plugin-sdk/<other-plugin>`.
  Si une aide est véritablement partagée, promouvez-la vers un sous-chemin SDK neutre
  tel que `openclaw/plugin-sdk/speech`, `.../provider-model-shared`, ou une autre
  surface orientée capacités au lieu de coupler deux plugins ensemble.
</Warning>

## Connexes

- [Points d'entrée](/en/plugins/sdk-entrypoints) — options `definePluginEntry` et `defineChannelPluginEntry`
- [Aides d'exécution](/en/plugins/sdk-runtime) — référence complète de l'espace de noms `api.runtime`
- [Configuration et installation](/en/plugins/sdk-setup) — empaquetage, manifestes, schémas de configuration
- [Tests](/en/plugins/sdk-testing) — utilitaires de test et règles de lint
- [Migration du SDK](/en/plugins/sdk-migration) — migrer depuis les surfaces dépréciées
- [Fonctionnement interne des plugins](/en/plugins/architecture) — architecture approfondie et model de capacité
