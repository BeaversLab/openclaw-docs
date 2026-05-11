---
summary: "Catalogue des sous-chemins du SDK de plugin : quels imports se trouvent où, regroupés par domaine"
read_when:
  - Choosing the right plugin-sdk subpath for a plugin import
  - Auditing bundled-plugin subpaths and helper surfaces
title: "Sous-chemins du SDK de plugin"
---

Le SDK de plugin est exposé sous la forme d'un ensemble de sous-chemins étroits sous `openclaw/plugin-sdk/`.
Cette page répertorie les sous-chemins couramment utilisés regroupés par objectif. La liste complète
générée de plus de 200 sous-chemins se trouve dans `scripts/lib/plugin-sdk-entrypoints.json` ;
les sous-chemins d'assistance réservés aux plugins groupés (bundled-plugin) y apparaissent mais constituent un détail
d'implémentation, sauf si une page de documentation les promeut explicitement.

Pour le guide de création de plugins, consultez [Vue d'ensemble du SDK de plugin](/fr/plugins/sdk-overview).

## Point d'entrée du plugin

| Sous-chemin                    | Exports clés                                                                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`      | `definePluginEntry`                                                                                                                                                                                  |
| `plugin-sdk/core`              | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema`                                                               |
| `plugin-sdk/config-schema`     | `OpenClawSchema`                                                                                                                                                                                     |
| `plugin-sdk/provider-entry`    | `defineSingleProviderPluginEntry`                                                                                                                                                                    |
| `plugin-sdk/migration`         | Assistants d'éléments du provider de migration tels que `createMigrationItem`, des constantes de raison, des marqueurs de statut d'élément, des assistants de rédaction et `summarizeMigrationItems` |
| `plugin-sdk/migration-runtime` | Assistants de migration à l'exécution tels que `copyMigrationFileItem` et `writeMigrationReport`                                                                                                     |

<AccordionGroup>
  <Accordion title="Sous-chemins de canal">
    | Sous-chemin | Exportations clés |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | Exportation du schéma Zod `openclaw.json` racine (`OpenClawSchema`) |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, plus `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | Assistants de configuration partagés, invites de liste d'autorisation, générateurs de statut de configuration |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | Assistants de configuration/gestionnaire d'action multi-compte, assistants de repli par défaut du compte |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`, assistants de normalisation de l'ID de compte |
    | `plugin-sdk/account-resolution` | Recherche de compte + assistants de repli par défaut |
    | `plugin-sdk/account-helpers` | Assistants étroits de liste de compte/action de compte |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | Primitives de schéma de configuration de canal partagées et générateur générique |
    | `plugin-sdk/channel-config-schema-legacy` | Schémas de configuration de canal groupés obsolètes uniquement pour la compatibilité groupée |
    | `plugin-sdk/telegram-command-config` | Assistants de normalisation/validation de commande personnalisée Telegram avec repli de contrat groupé |
    | `plugin-sdk/command-gating` | Assistants de porte d'autorisation de commande étroite |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`, assistants de cycle de vie/finalisation du flux brouillon |
    | `plugin-sdk/inbound-envelope` | Assistants partagés de route entrante + générateur d'enveloppe |
    | `plugin-sdk/inbound-reply-dispatch` | Assistants partagés d'enregistrement et de répartition entrants |
    | `plugin-sdk/messaging-targets` | Assistants d'analyse/correspondance de cible |
    | `plugin-sdk/outbound-media` | Assistants partagés de chargement de média sortant |
    | `plugin-sdk/outbound-send-deps` | Recherche légère de dépendance d'envoi sortant pour les adaptateurs de canal |
    | `plugin-sdk/outbound-runtime` | Assistants de livraison sortante, d'identité, de délégué d'envoi, de session, de formatage et de planification de charge utile |
    | `plugin-sdk/poll-runtime` | Assistants de normalisation de sondage étroite |
    | `plugin-sdk/thread-bindings-runtime` | Assistants de cycle de vie et d'adaptateur de liaison de fil de discussion |
    | `plugin-sdk/agent-media-payload` | Générateur de charge utile média d'agent hérité |
    | `plugin-sdk/conversation-runtime` | Assistants de liaison, de couplage et de liaison configurée de conversation/fil de discussion |
    | `plugin-sdk/runtime-config-snapshot` | Assistant d'instantané de configuration d'exécution |
    | `plugin-sdk/runtime-group-policy` | Assistants de résolution de stratégie de groupe d'exécution |
    | `plugin-sdk/channel-status` | Assistants partagés d'instantané/résumé de statut de canal |
    | `plugin-sdk/channel-config-primitives` | Primitives de schéma de configuration de canal étroites |
    | `plugin-sdk/channel-config-writes` | Assistants d'autorisation d'écriture de configuration de canal |
    | `plugin-sdk/channel-plugin-common` | Exportations de préambule de plugin de canal partagé |
    | `plugin-sdk/allowlist-config-edit` | Assistants de modification/lecture de configuration de liste d'autorisation |
    | `plugin-sdk/group-access` | Assistants partagés de décision d'accès au groupe |
    | `plugin-sdk/direct-dm` | Assistants partagés d'authentification/garde de Telegram directe |
    | `plugin-sdk/interactive-runtime` | Assistants de présentation sémantique des messages, de livraison et de réponse interactive héritée. Voir [Présentation des messages](/fr/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | Tonneau de compatibilité pour les assistants de rebond entrant, de correspondance de mention, de stratégie de mention et d'enveloppe |
    | `plugin-sdk/channel-inbound-debounce` | Assistants de rebond entrant étroit |
    | `plugin-sdk/channel-mention-gating` | Assistants de stratégie de mention et de texte de mention étroits sans la surface d'exécution entrante plus large |
    | `plugin-sdk/channel-envelope` | Assistants de formatage d'enveloppe entrante étroite |
    | `plugin-sdk/channel-location` | Assistants de contexte et de formatage d'emplacement de canal |
    | `plugin-sdk/channel-logging` | Assistants de journalisation de canal pour les abandons entrants et les échecs de frappe/accusé de réception |
    | `plugin-sdk/channel-send-result` | Types de résultats de réponse |
    | `plugin-sdk/channel-actions` | Assistants d'action de message de canal, plus assistants de schéma natif obsolètes conservés pour la compatibilité des plugins |
    | `plugin-sdk/channel-targets` | Assistants d'analyse/correspondance de cible |
    | `plugin-sdk/channel-contract` | Types de contrat de canal |
    | `plugin-sdk/channel-feedback` | Câblage de réaction/commentaire |
    | `plugin-sdk/channel-secret-runtime` | Assistants de contrat secret étroits tels que `collectSimpleChannelFieldAssignments`, `getChannelSurface`, `pushAssignment`, et les types de cible secrète |
  </Accordion>

<Accordion title="Chemins d'accès du fournisseur">
  | Chemin d'accès | Exportations clés | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | Façade de fournisseur LM Studio prise en charge pour la configuration, la découverte du catalogue et la préparation du modèle d'exécution | | `plugin-sdk/lmstudio-runtime` | Façade d'exécution LM Studio prise en charge pour les valeurs par défaut du
  serveur local, la découverte de modèles, les en-têtes de requête et les assistants de modèles chargés | | `plugin-sdk/provider-setup` | Assistants de configuration de fournisseur local/auto-hébergé sélectionnés | | `plugin-sdk/self-hosted-provider-setup` | Assistants de configuration de fournisseur auto-hébergé compatibles avec OpenAI ciblés | | `plugin-sdk/cli-backend` | Valeurs par défaut du
  backend CLI + constantes de surveillance | | `plugin-sdk/provider-auth-runtime` | Assistants de résolution de clé d'API d'exécution pour les plugins de fournisseur | | `plugin-sdk/provider-auth-api-key` | Assistants d'intégration/écriture de profil de clé d'API tels que `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | Générateur standard de résultats d'authentification OAuth | |
  `plugin-sdk/provider-auth-login` | Assistants de connexion interactive partagés pour les plugins de fournisseur | | `plugin-sdk/provider-env-vars` | Assistants de recherche de variable d'environnement d'authentification du fournisseur | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile`, `upsertApiKeyProfile`,
  `writeOAuthCredentials` | | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, générateurs de stratégie de relecture partagés, assistants de point de terminaison du fournisseur et assistants de normalisation d'identifiant de modèle tels que `normalizeNativeXaiModelId` | | `plugin-sdk/provider-catalog-shared` |
  `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | Assistants génériques de capacités HTTP/point de terminaison du fournisseur, erreurs HTTP du fournisseur et assistants de formulaire multipart pour la transcription audio | | `plugin-sdk/provider-web-fetch-contract` |
  Assistants ciblés de contrat de configuration/sélection de récupération Web tels que `enablePluginInConfig` et `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Assistants d'enregistrement/de cache du fournisseur de récupération Web | | `plugin-sdk/provider-web-search-config-contract` | Assistants ciblés de configuration/identifiants de recherche Web pour les fournisseurs qui n'ont
  pas besoin de câblage d'activation de plugin | | `plugin-sdk/provider-web-search-contract` | Assistants ciblés de contrat de configuration/identifiants de recherche Web tels que `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig` et définisseurs/obtenteurs d'identifiants délimités | | `plugin-sdk/provider-web-search` | Assistants
  d'enregistrement/cache/exécution du fournisseur de recherche Web | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, nettoyage + diagnostic du schéma Gemini et assistants de compatibilité xAI tels que `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` et similaire | |
  `plugin-sdk/provider-stream` | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, types de wrapper de flux et assistants de wrapper partagés Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-transport-runtime` | Assistants de transport de fournisseur natif tels que la récupération
  protégée, les transformations de messages de transport et les flux d'événements de transport inscriptibles | | `plugin-sdk/provider-onboard` | Assistants de correctif de configuration d'intégration | | `plugin-sdk/global-singleton` | Assistants de singleton/cartouche/cache local au processus | | `plugin-sdk/group-activation` | Assistants ciblés de mode d'activation de groupe et d'analyse de
  commande |
</Accordion>

<Accordion title="Sous-chemins d'authentification et de sécurité">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`, aides du registre de commandes, y compris le formatage dynamique du menu d'arguments, aides à l'autorisation de l'expéditeur | | `plugin-sdk/command-status` | Générateurs de messages d'aide/de commandes tels que `buildCommandsMessagePaginated` et `buildHelpMessage` | |
  `plugin-sdk/approval-auth-runtime` | Aides à la résolution de l'approbateur et à l'autorisation des actions de même chat | | `plugin-sdk/approval-client-runtime` | Aides au profil/filtre d'approbation d'exécution native | | `plugin-sdk/approval-delivery-runtime` | Adaptateurs de capacité/livraison d'approbation native | | `plugin-sdk/approval-gateway-runtime` | Aide partagée à la résolution de
  la passerelle d'approbation | | `plugin-sdk/approval-handler-adapter-runtime` | Aides légères au chargement de l'adaptateur d'approbation native pour les points d'entrée de canal à chaud | | `plugin-sdk/approval-handler-runtime` | Aides d'exécution plus larges du gestionnaire d'approbation ; privilégiez les interfaces plus étroites de l'adaptateur/de la passerelle lorsqu'elles suffisent | |
  `plugin-sdk/approval-native-runtime` | Aides à la cible d'approbation native + à la liaison de compte | | `plugin-sdk/approval-reply-runtime` | Aides à la charge utile de réponse d'approbation d'exécution/de plugin | | `plugin-sdk/approval-runtime` | Aides à la charge utile d'approbation d'exécution/de plugin, aides au routage/à l'exécution de l'approbation native, et aides à l'affichage
  structuré de l'approbation telles que `formatApprovalDisplayPath` | | `plugin-sdk/reply-dedupe` | Aides étroites à la réinitialisation de la déduplication des réponses entrantes | | `plugin-sdk/channel-contract-testing` | Aides étroites aux tests de contrat de canal sans le baril de tests large | | `plugin-sdk/command-auth-native` | Authentification de commande native, formatage dynamique du
  menu d'arguments, et aides aux cibles de session native | | `plugin-sdk/command-detection` | Aides partagées à la détection de commandes | | `plugin-sdk/command-primitives-runtime` | Prédicats de texte de commande légers pour les chemins de canal à chaud | | `plugin-sdk/command-surface` | Normalisation du corps de la commande et aides à la surface de commande | | `plugin-sdk/allow-from` |
  `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | Aides étroites à la collection de contrats de secrets pour les surfaces de secrets de canal/plugin | | `plugin-sdk/secret-ref-runtime` | Aides étroites au typage `coerceSecretRef` et SecretRef pour l'analyse de contrat de secret/de configuration | | `plugin-sdk/security-runtime` | Aides partagées de confiance, de restriction
  DM, de contenu externe, de masquage de texte sensible, de comparaison de secrets à temps constant, et de collection de secrets | | `plugin-sdk/ssrf-policy` | Aides à la liste d'autorisation d'hôte et à la stratégie SSRF de réseau privé | | `plugin-sdk/ssrf-dispatcher` | Aides étroites au répartiteur épinglé sans la surface d'exécution d'infra large | | `plugin-sdk/ssrf-runtime` | Répartiteur
  épinglé, récupération sécurisée contre les SSRF, erreur SSRF, et aides à la stratégie SSRF | | `plugin-sdk/secret-input` | Aides à l'analyse de l'entrée secrète | | `plugin-sdk/webhook-ingress` | Aides à la requête/cible de webhook et contrainte brute de websocket/corps | | `plugin-sdk/webhook-request-guards` | Aides à la taille/délai d'attente du corps de la requête |
</Accordion>

<Accordion title="Sous-chemins d'exécution et de stockage">
  | Sous-chemin | Principales exportations | | --- | --- | | `plugin-sdk/runtime` | Assistants larges pour l'exécution, la journalisation, la sauvegarde et l'installation de plugins | | `plugin-sdk/runtime-env` | Assistants étroits pour l'environnement d'exécution, le journal, le délai d'attente, la nouvelle tentative et l'attente | | `plugin-sdk/browser-config` | Façade de configuration de
  navigateur prise en charge pour les profils/valeurs par défaut normalisés, l'analyse d'URL CDP et les assistants d'authentification de contrôle de navigateur | | `plugin-sdk/channel-runtime-context` | Assistants génériques d'enregistrement et de recherche de contexte d'exécution de channel | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | Assistants
  partagés pour les commandes, les hooks, le http et l'interactivité des plugins | | `plugin-sdk/hook-runtime` | Assistants partagés pour les pipelines de webhook et de hook interne | | `plugin-sdk/lazy-runtime` | Assistants d'importation et de liaison d'exécution différée, tels que `createLazyRuntimeModule`, `createLazyRuntimeMethod` et `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime`
  | Assistants d'exécution de processus | | `plugin-sdk/cli-runtime` | Assistants de formatage CLI, d'attente, de version, d'invocation d'arguments et de groupe de commandes différé | | `plugin-sdk/gateway-runtime` | Client Gateway, Gateway CLI CLI, erreurs de protocole Gateway et assistants de correctif d'état de channel | | `plugin-sdk/config-types` | Surface de configuration de type uniquement
  pour les formes de configuration de plugin, telles que `OpenClawConfig` et les types de configuration channel/provider | | `plugin-sdk/plugin-config-runtime` | Assistants de recherche de configuration de plugin d'exécution, tels que `requireRuntimeConfig`, `resolvePluginConfigObject` et `resolveLivePluginConfigObject` | | `plugin-sdk/config-mutation` | Assistants de mutation de configuration
  transactionnelle, tels que `mutateConfigFile`, `replaceConfigFile` et `logConfigUpdated` | | `plugin-sdk/runtime-config-snapshot` | Assistants d'instantané de configuration de processus actuel, tels que `getRuntimeConfig`, `getRuntimeConfigSnapshot` et les définitions d'instantané de test | | `plugin-sdk/telegram-command-config` | Normalisation des noms/descriptions de commande Gateway et
  vérifications des doublons/conflits, même lorsque la surface de contrat CLI groupée n'est pas disponible | | `plugin-sdk/text-autolink-runtime` | Détection d'autolien de référence de fichier sans le module d'exécution de texte large | | `plugin-sdk/approval-runtime` | Assistants d'approbation exec/plugin, générateurs de capacités d'approbation, assistants auth/profil, assistants de
  routage/d'exécution natifs et formatage du chemin d'affichage d'approbation structuré | | `plugin-sdk/reply-runtime` | Assistants d'exécution partagés pour les entrées/réponses, le découpage, la distribution, le heartbeat et le planificateur de réponse | | `plugin-sdk/reply-dispatch-runtime` | Assistants étroits de distribution/finalisation de réponse et d'étiquette de conversation | |
  `plugin-sdk/reply-history` | Assistants partagés d'historique des réponses à courte fenêtre, tels que `buildHistoryContext`, `recordPendingHistoryEntry` et `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Assistants étroits de découpage de texte/markdown | | `plugin-sdk/session-store-runtime` | Chemin de magasin de
  session, clé de session, date de mise à jour et assistants de mutation de magasin | | `plugin-sdk/cron-store-runtime` | Assistants de chemin/chargement/sauvegarde du magasin Cron | | `plugin-sdk/state-paths` | Assistants de chemin de répertoire State/RPC | | `plugin-sdk/routing` | Assistants de liaison route/clé de session/compte, tels que `resolveAgentRoute`, `buildAgentSessionKey` et
  `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | Assistants partagés de résumé de l'état channel/compte, valeurs par défaut de l'état d'exécution et assistants de métadonnées de problème | | `plugin-sdk/target-resolver-runtime` | Assistants partagés de résolution de cible | | `plugin-sdk/string-normalization-runtime` | Assistants de normalisation de slug/chaîne | |
  `plugin-sdk/request-url` | Extraire les URL de chaîne d'entrées de type fetch/request | | `plugin-sdk/run-command` | Exécuteur de commande minuté avec résultats stdout/stderr normalisés | | `plugin-sdk/param-readers` | Lecteurs de paramètres tool/Telegram courants | | `plugin-sdk/tool-payload` | Extraire les charges utiles normalisées des objets de résultat d'outil | | `plugin-sdk/tool-send` |
  Extraire les champs de cible d'envoi canoniques des arguments d'outil | | `plugin-sdk/temp-path` | Assistants partagés de chemin de téléchargement temporaire | | `plugin-sdk/logging-core` | Assistants de journal et de rédaction de sous-système | | `plugin-sdk/markdown-table-runtime` | Assistants de mode et de conversion de tableau Markdown | | `plugin-sdk/model-session-runtime` | Assistants de
  substitution modèle/session, tels que `applyModelOverrideToSessionEntry` et `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` | Assistants de résolution de configuration Talk provider | | `plugin-sdk/json-store` | Petits assistants de lecture/écriture d'état JSON | | `plugin-sdk/file-lock` | Assistants de verrouillage de fichier réentrant | | `plugin-sdk/persistent-dedupe` |
  Assistants de cache de déduplication soutenu par disque | | `plugin-sdk/acp-runtime` | Assistants de session et de distribution de réponse ACP runtime | | `plugin-sdk/acp-binding-resolve-runtime` | Résolution de liaison ACP en lecture seule sans importations de démarrage de cycle de vie | | `plugin-sdk/agent-config-primitives` | Primitives de schéma de configuration d'exécution d'agent étroit |
  | `plugin-sdk/boolean-param` | Lecteur de paramètre booléen souple | | `plugin-sdk/dangerous-name-runtime` | Assistants de résolution de correspondance de nom dangereux | | `plugin-sdk/device-bootstrap` | Assistants de bootstrap d'appareil et de jeton d'appariement | | `plugin-sdk/extension-shared` | Primitives d'assistant partagées pour channel passif, l'état et le proxy ambiant | |
  `plugin-sdk/models-provider-runtime` | Assistants de réponse commande/provider `/models` | | `plugin-sdk/skill-commands-runtime` | Assistants de liste de commande Skill | | `plugin-sdk/native-command-registry` | Assistants de registre/construction/sérialisation de commande native | | `plugin-sdk/agent-harness` | Surface de plugin de confiance expérimentale pour des harnais d'agent de bas niveau
  : types de harnais, assistants de pilotage/abandon d'exécution active, assistants de pont d'outil Telegram, assistants de stratégie d'outil de plan d'exécution, classification des résultats terminaux, assistants de formatage/détail de progression d'outil et utilitaires de résultats de tentative | | `plugin-sdk/provider-zai-endpoint` | Assistants de détection de point de terminaison Z.AI | |
  `plugin-sdk/infra-runtime` | Assistants d'événement/heartbeat système | | `plugin-sdk/collection-runtime` | Petits assistants de cache borné | | `plugin-sdk/diagnostic-runtime` | Assistants de indicateur de diagnostic, d'événement et de contexte de trace | | `plugin-sdk/error-runtime` | Graphe d'erreur, formatage, assistants de classification d'erreur partagée, `isApprovalNotFoundError` | |
  `plugin-sdk/fetch-runtime` | Assistants de fetch encapsulé, de proxy et de recherche épinglée | | `plugin-sdk/runtime-fetch` | Fetch d'exécution conscient du répartiteur sans importations proxy/guarded-fetch | | `plugin-sdk/response-limit-runtime` | Lecteur de corps de réponse borné sans la surface d'exécution multimédia large | | `plugin-sdk/session-binding-runtime` | État de liaison de
  conversation actuel sans routage de liaison configuré ou magasins d'appariement | | `plugin-sdk/session-store-runtime` | Assistants de magasin de session sans importations d'écritures/maintenance de configuration large | | `plugin-sdk/context-visibility-runtime` | Résolution de visibilité de contexte et filtrage de contexte supplémentaire sans importations de configuration/sécurité larges | |
  `plugin-sdk/string-coerce-runtime` | Assistants étroits de contrainte et de normalisation d'enregistrement/chaîne primitive sans importations markdown/logging | | `plugin-sdk/host-runtime` | Assistants de normalisation de nom d'hôte et d'hôte SCP | | `plugin-sdk/retry-runtime` | Assistants de configuration de nouvelle tentative et d'exécuteur de nouvelle tentative | | `plugin-sdk/agent-runtime`
  | Assistants de répertoire/identité/espace de travail de l'agent | | `plugin-sdk/directory-runtime` | Requête/déduplication de répertoire soutenu par configuration | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Sous-chemins de capacité et de test">
  | Sous-chemin | Principales exportations | | --- | --- | | `plugin-sdk/media-runtime` | Assistants partagés de récupération/transformation/stockage de média, plus des constructeurs de payload média | | `plugin-sdk/media-store` | Assistants étroits de stockage de média tels que `saveMediaBuffer` | | `plugin-sdk/media-generation-runtime` | Assistants partagés de basculement de génération de média,
  sélection de candidat et messagerie de model manquant | | `plugin-sdk/media-understanding` | Types de provider de compréhension de média plus des exportations d'assistants image/audio orientés provider | | `plugin-sdk/text-runtime` | Assistants partagés de texte/markdown/logging tels que le stripping de texte visible par l'assistant, les assistants de rendu/découpage/tableaux markdown, les
  assistants de rédaction, les assistants de balises de directive et les utilitaires de texte sécurisé | | `plugin-sdk/text-chunking` | Assistant de découpage de texte sortant | | `plugin-sdk/speech` | Types de provider de parole plus les exportations d'assistants de directive, de registre, de validation et de parole orientés provider | | `plugin-sdk/speech-core` | Types partagés de provider de
  parole, registre, directive, normalisation et exportations d'assistants de parole | | `plugin-sdk/realtime-transcription` | Types de provider de transcription en temps réel, assistants de registre et assistant partagé de session WebSocket | | `plugin-sdk/realtime-voice` | Types de provider de voix en temps réel et assistants de registre | | `plugin-sdk/image-generation` | Types de provider de
  génération d'images | | `plugin-sdk/image-generation-core` | Types partagés de génération d'images, assistants de basculement, d'authentification et de registre | | `plugin-sdk/music-generation` | Types de provider/requête/résultat de génération de musique | | `plugin-sdk/music-generation-core` | Types partagés de génération de musique, assistants de basculement, recherche de provider et analyse
  des références de model | | `plugin-sdk/video-generation` | Types de provider/requête/résultat de génération de vidéo | | `plugin-sdk/video-generation-core` | Types partagés de génération de vidéo, assistants de basculement, recherche de provider et analyse des références de model | | `plugin-sdk/webhook-targets` | Registre de cibles webhook et assistants d'installation de route | |
  `plugin-sdk/webhook-path` | Assistants de normalisation de chemin webhook | | `plugin-sdk/web-media` | Assistants partagés de chargement de média distant/local | | `plugin-sdk/zod` | `zod` réexporté pour les consommateurs du SDK de plugin | | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
</Accordion>

<Accordion title="Sous-chemins de mémoire">
  | Sous-chemin | Exportations clés | | --- | --- | | `plugin-sdk/memory-core` | Surface d'assistance memory-core groupée pour les helpers de gestionnaire/config/fichier/CLI | | `plugin-sdk/memory-core-engine-runtime` | Façade d'exécution d'index/recherche de mémoire | | `plugin-sdk/memory-core-host-engine-foundation` | Exportations du moteur de base de l'hôte de mémoire | |
  `plugin-sdk/memory-core-host-engine-embeddings` | Contrats d'intégration de l'hôte de mémoire, accès au registre, provider local et helpers de lot générique/distant | | `plugin-sdk/memory-core-host-engine-qmd` | Exportations du moteur QMD de l'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-storage` | Exportations du moteur de stockage de l'hôte de mémoire | |
  `plugin-sdk/memory-core-host-multimodal` | Helpers multimodaux de l'hôte de mémoire | | `plugin-sdk/memory-core-host-query` | Helpers de requête de l'hôte de mémoire | | `plugin-sdk/memory-core-host-secret` | Helpers de secret de l'hôte de mémoire | | `plugin-sdk/memory-core-host-events` | Helpers de journal des événements de l'hôte de mémoire | | `plugin-sdk/memory-core-host-status` | Helpers
  d'état de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-cli` | Helpers d'exécution CLI de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-core` | Helpers d'exécution de base de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-files` | Helpers de fichier/exécution de l'hôte de mémoire | | `plugin-sdk/memory-host-core` | Alias neutre vis-à-vis des fournisseurs
  pour les helpers d'exécution de base de l'hôte de mémoire | | `plugin-sdk/memory-host-events` | Alias neutre vis-à-vis des fournisseurs pour les helpers de journal des événements de l'hôte de mémoire | | `plugin-sdk/memory-host-files` | Alias neutre vis-à-vis des fournisseurs pour les helpers de fichier/exécution de l'hôte de mémoire | | `plugin-sdk/memory-host-markdown` | Helpers
  managed-markdown partagés pour les plugins adjacents à la mémoire | | `plugin-sdk/memory-host-search` | Façade d'exécution de mémoire active pour l'accès au search-manager | | `plugin-sdk/memory-host-status` | Alias neutre vis-à-vis des fournisseurs pour les helpers d'état de l'hôte de mémoire | | `plugin-sdk/memory-lancedb` | Surface d'assistance memory-lancedb groupée |
</Accordion>

  <Accordion title="Reserved bundled-helper subpaths">
    | Famille | Sous-chemins actuels | Utilisation prévue |
    | --- | --- | --- |
    | Browser | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | Helpers de support pour les plugins groupés du navigateur. `browser-profiles` exporte `resolveBrowserConfig`, `resolveProfile`, `ResolvedBrowserConfig`, `ResolvedBrowserProfile` et `ResolvedBrowserTabCleanupConfig` pour la forme normalisée `browser.tabCleanup`. `browser-support` reste le barrel de compatibilité. |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | Surface d'aide/runtime Matrix groupée |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | Surface d'aide/runtime LINE groupée |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | Surface d'aide IRC groupée |
    | Channel-specific helpers | `plugin-sdk/googlechat`, `plugin-sdk/googlechat-runtime-shared`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu`, `plugin-sdk/feishu-conversation`, `plugin-sdk/feishu-setup`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/telegram-command-ui`, `plugin-sdk/tlon`, `plugin-sdk/twitch`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup` | Interfaces de compatibilité/d'aide pour canal groupé obsolètes. Les nouveaux plugins doivent importer des sous-chemins SDK génériques ou des barrels locaux aux plugins. |
    | Auth/plugin-specific helpers | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diagnostics-prometheus`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/memory-core`, `plugin-sdk/memory-lancedb`, `plugin-sdk/opencode`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | Interfaces d'aide pour fonctionnalité/plugin groupé ; `plugin-sdk/github-copilot-token` exporte actuellement `DEFAULT_COPILOT_API_BASE_URL`, `deriveCopilotApiBaseUrlFromToken` et `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## Connexes

- [Vue d'ensemble du SDK de plugin](/fr/plugins/sdk-overview)
- [Configuration du SDK de plugin](/fr/plugins/sdk-setup)
- [Création de plugins](/fr/plugins/building-plugins)
