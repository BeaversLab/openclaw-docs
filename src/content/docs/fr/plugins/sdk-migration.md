---
summary: "Migrer depuis la ancienne couche de rétrocompatibilité vers le SDK de plugin moderne"
title: "Migration du SDK de plugin"
sidebarTitle: "Migrer vers le SDK"
read_when:
  - You see the OPENCLAW_PLUGIN_SDK_COMPAT_DEPRECATED warning
  - You see the OPENCLAW_EXTENSION_API_DEPRECATED warning
  - You used api.registerEmbeddedExtensionFactory before OpenClaw 2026.4.25
  - You are updating a plugin to the modern plugin architecture
  - You maintain an external OpenClaw plugin
---

OpenClaw est passé d'une large couche de rétrocompatibilité à une architecture de plugin moderne avec des importations ciblées et documentées. Si votre plugin a été construit avant la nouvelle architecture, ce guide vous aide à migrer.

## Ce qui change

L'ancien système de plugins offrait deux surfaces très ouvertes qui permettaient aux plugins d'importer tout ce dont ils avaient besoin depuis un point d'entrée unique :

- **`openclaw/plugin-sdk/compat`** — un import unique qui ré-exportait des dizaines d'assistants. Il a été introduit pour maintenir les anciens plugins basés sur des hooks en fonctionnement pendant que la nouvelle architecture de plugin était en cours de construction.
- **`openclaw/extension-api`** — un pont qui donnait aux plugins un accès direct aux assistants côté hôte comme le lanceur d'agent intégré.
- **`api.registerEmbeddedExtensionFactory(...)`** — un hook d'extension groupé, supprimé et réservé à Pi, qui pouvait observer les événements du lanceur intégré tels que `tool_result`.

Les surfaces d'importation larges sont désormais **obsolètes**. Elles fonctionnent toujours lors de l'exécution, mais les nouveaux plugins ne doivent pas les utiliser, et les plugins existants devraient migrer avant que la prochaine version majeure ne les supprime. L'API d'enregistrement d'usine d'extension intégrée, réservée à Pi, a été supprimée ; utilisez plutôt le middleware de résultats d'outil.

OpenClaw ne supprime pas ou ne réinterprète pas le comportement documenté des plugins dans le même changement qui introduit un remplacement. Les modifications de contrat rupturantes doivent d'abord passer par un adaptateur de compatibilité, des diagnostics, une documentation et une période de dépréciation. Cela s'applique aux importations du SDK, aux champs du manifeste, aux API de configuration, aux hooks et au comportement d'enregistrement à l'exécution.

<Warning>La couche de rétrocompatibilité sera supprimée dans une prochaine version majeure. Les plugins qui importent toujours depuis ces surfaces cesseront de fonctionner à ce moment-là. Les enregistrements d'usrique d'extension intégrée réservés à Pi ne se chargent déjà plus.</Warning>

## Pourquoi ce changement

L'ancienne approche causait des problèmes :

- **Démarrage lent** — l'importation d'un seul assistant chargeait des dizaines de modules sans rapport
- **Dépendances circulaires** — les ré-exportations larges rendaient facile la création de cycles d'importation
- **Surface de l'API peu claire** — impossible de distinguer les exportations stables des internes

Le SDK de plugin moderne résout ce problème : chaque chemin d'importation (`openclaw/plugin-sdk/\<subpath\>`)
est un petit module autonome avec un objectif clair et un contrat documenté.

Les interfaces de commodité héritées pour les fournisseurs de canals groupés ont également disparu.
Les interfaces d'aide marquées par canal étaient des raccourcis privés de mono-repo, et non des contrats de plugin stables. Utilisez plutôt des sous-chemins génériques étroits du SDK. Dans l'espace de travail du plugin groupé,
conservez les aides appartenant au fournisseur dans le propre `api.ts` ou
`runtime-api.ts` de ce plugin.

Exemples actuels de fournisseurs groupés :

- Anthropic conserve les aides de flux spécifiques à Claude dans sa propre interface `api.ts` /
  `contract-api.ts`
- OpenAI conserve les constructeurs de fournisseurs, les aides de modèle par défaut et les constructeurs de fournisseurs
  en temps réel dans son propre `api.ts`
- OpenRouter conserve le constructeur de fournisseur et les aides d'intégration/configuration dans son propre
  `api.ts`

## Politique de compatibilité

Pour les plugins externes, le travail de compatibilité suit cet ordre :

1. ajouter le nouveau contrat
2. garder l'ancien comportement connecté via un adaptateur de compatibilité
3. émettre un diagnostic ou un avertissement qui nomme l'ancien chemin et le remplacement
4. couvrir les deux chemins dans les tests
5. documenter l'obsolescence et le chemin de migration
6. supprimer uniquement après la fenêtre de migration annoncée, généralement dans une version majeure

Si un champ de manifeste est toujours accepté, les auteurs de plugins peuvent continuer à l'utiliser jusqu'à ce que
la documentation et les diagnostics indiquent le contraire. Le nouveau code devrait préférer le remplacement
documenté, mais les plugins existants ne devraient pas rompre lors des versions mineures
ordinaires.

## Comment migrer

<Steps>
  <Step title="Migrer les assistants de chargement/écriture de la configuration d'exécution">
    Les plugins groupés doivent cesser d'appeler
    `api.runtime.config.loadConfig()` et
    `api.runtime.config.writeConfigFile(...)` directement. Préférez la configuration qui a
    déjà été transmise dans le chemin d'appel actif. Les gestionnaires à longue durée de vie qui ont besoin
    de l'instantané du processus actuel peuvent utiliser `api.runtime.config.current()`. Les outils d'agent
    à longue durée de vie doivent utiliser le `ctx.getRuntimeConfig()` du contexte de l'outil
    à l'intérieur de `execute` afin qu'un outil créé avant une écriture de configuration
    voie toujours la configuration d'exécution actualisée.

    Les écritures de configuration doivent passer par les assistants transactionnels et choisir une
    stratégie après écriture :

    ```typescript
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    Utilisez `afterWrite: { mode: "restart", reason: "..." }` lorsque l'appelant sait
    que le changement nécessite un redémarrage propre de la passerelle, et
    `afterWrite: { mode: "none", reason: "..." }` uniquement lorsque l'appelant possède la
    suite et souhaite délibérément supprimer le planificateur de rechargement.
    Les résultats de mutation incluent un résumé `followUp` typé pour les tests et la journalisation ;
    la passerelle reste responsable de l'application ou de la planification du redémarrage.
    `loadConfig` et `writeConfigFile` restent des assistants de compatibilité
    obsolètes pour les plugins externes pendant la période de migration et avertissent une seule fois avec
    le code de compatibilité `runtime-config-load-write`. Les plugins groupés et le code
    d'exécution du dépôt sont protégés par des garde-fous de l'analyseur dans
    `pnpm check:deprecated-internal-config-api` et
    `pnpm check:no-runtime-action-load-config` : la nouvelle utilisation du plugin en production
    échoue directement, les écritures de configuration directes échouent, les méthodes du serveur de passerelle doivent utiliser
    l'instantané d'exécution de la requête, les assistants d'envoi/action/client du canal d'exécution
    doivent recevoir la configuration de leur limite, et les modules d'exécution à longue durée de vie ont
    zéro appel ambiant `loadConfig()` autorisé.

    Le nouveau code de plugin doit également éviter d'importer le baril de compatibilité
    large `openclaw/plugin-sdk/config-runtime`. Utilisez le sous-chemin SDK étroit qui correspond à la tâche :

    | Besoin | Import |
    | --- | --- |
    | Types de configuration tels que `OpenClawConfig` | `openclaw/plugin-sdk/config-types` |
    | Assertions de configuration déjà chargée et recherche de configuration d'entrée de plugin | `openclaw/plugin-sdk/plugin-config-runtime` |
    | Lectures de l'instantané d'exécution actuel | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | Écritures de configuration | `openclaw/plugin-sdk/config-mutation` |
    | Assistants de magasin de session | `openclaw/plugin-sdk/session-store-runtime` |
    | Configuration de tableau Markdown | `openclaw/plugin-sdk/markdown-table-runtime` |
    | Assistants d'exécution de stratégie de groupe | `openclaw/plugin-sdk/runtime-group-policy` |
    | Résolution de saisie secrète | `openclaw/plugin-sdk/secret-input-runtime` |
    | Remplacements de modèle/session | `openclaw/plugin-sdk/model-session-runtime` |

    Les plugins groupés et leurs tests sont protégés par l'analyseur contre le baril
    large, de sorte que les importations et les simulacres restent locaux au comportement dont ils ont besoin. Le baril
    large existe toujours pour la compatibilité externe, mais le nouveau code ne doit pas
    en dépendre.

  </Step>

  <Step title="Migrer les extensions tool-result de Pi vers un middleware">
    Les plugins groupés doivent remplacer les gestionnaires de
    `api.registerEmbeddedExtensionFactory(...)` tool-result exclusifs à Pi par
    des middleware neutres par rapport à l'exécution.

    ```typescript
    // Pi and Codex runtime dynamic tools
    api.registerAgentToolResultMiddleware(async (event) => {
      return compactToolResult(event);
    }, {
      runtimes: ["pi", "codex"],
    });
    ```

    Mettez à jour le manifeste du plugin en même temps :

    ```json
    {
      "contracts": {
        "agentToolResultMiddleware": ["pi", "codex"]
      }
    }
    ```

    Les plugins externes ne peuvent pas enregistrer de middleware tool-result car il peut
    réécrire la sortie de l'outil à haute confiance avant que le model ne la voie.

  </Step>

  <Step title="Migrer les gestionnaires natifs d'approbation vers des faits de capacité">
    Les plugins de channel capables d'approbation exposent désormais le comportement d'approbation natif via
    `approvalCapability.nativeRuntime` ainsi que le registre partagé du contexte d'exécution.

    Modifications clés :

    - Remplacez `approvalCapability.handler.loadRuntime(...)` par
      `approvalCapability.nativeRuntime`
    - Déplacez l'authentification/livraison spécifique à l'approbation hors de l'ancien câblage `plugin.auth` /
      `plugin.approvals` et vers `approvalCapability`
    - `ChannelPlugin.approvals` a été retiré du contrat public du plugin de channel ;
      déplacez les champs de livraison/natif/de rendu vers `approvalCapability`
    - `plugin.auth` ne reste que pour les flux de connexion/déconnexion du channel ; les crochets d'authentification
      pour l'approbation ne sont plus lus par le cœur
    - Enregistrez les objets d'exécution appartenant au channel tels que les clients, les jetons ou les applications Bolt
      via `openclaw/plugin-sdk/channel-runtime-context`
    - N'envoyez pas de notices de réacheminement appartenant au plugin depuis les gestionnaires d'approbation natifs ;
      le cœur possède désormais les notices de réacheminement-ailleurs issues des résultats de livraison réels
    - Lorsque vous passez `channelRuntime` dans `createChannelManager(...)`, fournissez une
      surface `createPluginRuntime().channel` réelle. Les partiels (stubs) sont rejetés.

    Voir `/plugins/sdk-channel-plugins` pour la disposition actuelle de la capacité
    d'approbation.

  </Step>

  <Step title="Vérifier le comportement de repli du wrapper Windows">
    Si votre plugin utilise `openclaw/plugin-sdk/windows-spawn`, les wrappers Windows
    `.cmd`/`.bat` non résolus échouent désormais (fail closed), sauf si vous passez explicitement
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

    Si votre appelant ne repose pas intentionnellement sur le repli vers le shell, ne définissez pas
    `allowShellFallback` et gérez plutôt l'erreur renvoyée.

  </Step>

  <Step title="Trouver les importations obsolètes">
    Recherchez dans votre plugin les importations provenant de l'une ou l'autre des surfaces obsolètes :

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "plugin-sdk/config-runtime" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="Remplacer par des importations ciblées">
    Chaque export de l'ancienne surface correspond à un chemin d'importation moderne spécifique :

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

    Pour les helpers côté hôte, utilisez le runtime de plugin injecté au lieu d'importer
    directement :

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    Le même modèle s'applique aux autres helpers de pont hérités (legacy bridge helpers) :

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

  <Step title="Construire et tester">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## Référence des chemins d'importation

<Accordion title="Tableau des chemins d'importation courants">
  | Chemin d'importation | Objectif | Principales exportations | | --- | --- | --- | | `plugin-sdk/plugin-entry` | Assistant d'entrée canonique pour le plugin | `definePluginEntry` | | `plugin-sdk/core` | Ré-exportation parapluie héritée pour les définitions/constructeurs d'entrée de channel | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | Exportation du
  schéma de configuration racine | `OpenClawSchema` | | `plugin-sdk/provider-entry` | Assistant d'entrée pour fournisseur unique | `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | Définitions et constructeurs d'entrée de channel ciblés | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | Assistants
  partagés pour l'assistant de configuration | Invites de liste d'autorisation, constructeurs de statut de configuration | | `plugin-sdk/setup-runtime` | Assistants d'exécution au moment de la configuration | Adaptateurs de correctifs de configuration sécurisés pour l'importation, assistants de note de recherche, `promptResolvedAllowFrom`, `splitSetupEntries`, proxies de configuration délégués | |
  `plugin-sdk/setup-adapter-runtime` | Assistants d'adaptateur de configuration | `createEnvPatchedAccountSetupAdapter` | | `plugin-sdk/setup-tools` | Assistants d'outillage de configuration | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` | | `plugin-sdk/account-core` | Assistants multi-comptes | Assistants de
  liste/configuration/action de compte | | `plugin-sdk/account-id` | Assistants d'identifiant de compte | `DEFAULT_ACCOUNT_ID`, normalisation de l'identifiant de compte | | `plugin-sdk/account-resolution` | Assistants de recherche de compte | Assistants de recherche de compte + repli par défaut | | `plugin-sdk/account-helpers` | Assistants de compte ciblés | Assistants de liste/action de compte |
  | `plugin-sdk/channel-setup` | Adaptateurs de l'assistant de configuration | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, plus `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` | | `plugin-sdk/channel-pairing` | Primitives de couplage DM | `createChannelPairingController` | |
  `plugin-sdk/channel-reply-pipeline` | Préfixe de réponse + câblage de frappe | `createChannelReplyPipeline` | | `plugin-sdk/channel-config-helpers` | Usines d'adaptateurs de configuration | `createHybridChannelConfigAdapter` | | `plugin-sdk/channel-config-schema` | Constructeurs de schémas de configuration | Primitives de schéma de configuration de channel partagées et le constructeur générique
  uniquement | | `plugin-sdk/channel-config-schema-legacy` | Schémas de configuration groupés obsolètes | Compatibilité groupée uniquement ; les nouveaux plugins doivent définir des schémas locaux au plugin | | `plugin-sdk/telegram-command-config` | Assistants de configuration de commande Telegram | Normalisation du nom de commande, rognage de la description, validation des doublons/conflits | |
  `plugin-sdk/channel-policy` | Résolution de politique de groupe/DM | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | Assistants de statut de compte et de cycle de vie du flux de brouillon | `createAccountStatusSink`, assistants de finalisation de l'aperçu du brouillon | | `plugin-sdk/inbound-envelope` | Assistants d'enveloppe entrante | Assistants de route partagée +
  constructeur d'enveloppe | | `plugin-sdk/inbound-reply-dispatch` | Assistants de réponse entrante | Assistants d'enregistrement et de répartition partagés | | `plugin-sdk/messaging-targets` | Analyse de la cible de messagerie | Assistants d'analyse/correspondance de cible | | `plugin-sdk/outbound-media` | Assistants de média sortant | Chargement de média sortant partagé | |
  `plugin-sdk/outbound-send-deps` | Assistants de dépendance d'envoi sortant | Recherche légère `resolveOutboundSendDep` sans importer l'exécution sortante complète | | `plugin-sdk/outbound-runtime` | Assistants d'exécution sortante | Assistants de livraison sortante, délégué d'identité/envoi, session, formatage et planification de payload | | `plugin-sdk/thread-bindings-runtime` | Assistants de
  liaison de fil | Assistants de cycle de vie et d'adaptateur de liaison de fil | | `plugin-sdk/agent-media-payload` | Assistants de payload de média hérité | Constructeur de payload de média d'agent pour les dispositions de champ héritées | | `plugin-sdk/channel-runtime` | Shim de compatibilité obsolète | Utilitaires d'exécution de channel hérité uniquement | | `plugin-sdk/channel-send-result` |
  Types de résultats d'envoi | Types de résultats de réponse | | `plugin-sdk/runtime-store` | Stockage persistant de plugin | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | Assistants d'exécution larges | Assistants d'exécution/journalisation/sauvegarde/installation de plugin | | `plugin-sdk/runtime-env` | Assistants d'environnement d'exécution ciblés | Environnement de
  journalisation/exécution, délai d'attente, nouvelle tentative et assistances de délai exponentiel | | `plugin-sdk/plugin-runtime` | Assistants d'exécution de plugin partagés | Assistants de commandes/hooks/http/interactifs de plugin | | `plugin-sdk/hook-runtime` | Assistants de pipeline de hook | Assistants de pipeline de hook webhook/interne partagé | | `plugin-sdk/lazy-runtime` | Assistants
  d'exécution différés | `createLazyRuntimeModule`, `createLazyRuntimeMethod`, `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`, `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Assistants de processus | Assistants d'exécution partagés | | `plugin-sdk/cli-runtime` | Assistants d'exécution CLI | Formatage de commande, attentes, assistants de version | |
  `plugin-sdk/gateway-runtime` | Assistants Gateway | Client Gateway et assistants de correctif de statut de channel | | `plugin-sdk/config-runtime` | Assistants de configuration | Assistants de chargement/écriture de configuration | | `plugin-sdk/telegram-command-config` | Assistants de commande Telegram | Assistants de validation de commande Telegram stables par repli lorsque la surface de
  contrat Telegram groupée est indisponible | | `plugin-sdk/approval-runtime` | Assistants d'invite d'approbation | Payload d'approbation d'exécution/plugin, assistants de capacité/profil d'approbation, assistants de routage/exécution d'approbation native, et formatage du chemin d'affichage structuré d'approbation | | `plugin-sdk/approval-auth-runtime` | Assistants d'auth d'approbation |
  Résolution de l'approuvant, auth d'action même-chat | | `plugin-sdk/approval-client-runtime` | Assistants client d'approbation | Assistants de profil/filtre d'approbation d'exécution native | | `plugin-sdk/approval-delivery-runtime` | Assistants de livraison d'approbation | Adaptateurs de capacité/livraison d'approbation native | | `plugin-sdk/approval-gateway-runtime` | Assistants OAuth
  d'approbation | Assistant de résolution CLI d'approbation partagé | | `plugin-sdk/approval-handler-adapter-runtime` | Assistants d'adaptateur d'approbation | Assistants de chargement d'adaptateur d'approbation natif léger pour les points d'entrée de channel à chaud | | `plugin-sdk/approval-handler-runtime` | Assistants de gestionnaire d'approbation | Assistants d'exécution de gestionnaire
  d'approbation plus larges ; privilégiez les jonctions d'adaptateur/OpenAI plus ciblées lorsqu'elles suffisent | | `plugin-sdk/approval-native-runtime` | Assistants de cible d'approbation | Assistants de liaison de cible/compte d'approbation native | | `plugin-sdk/approval-reply-runtime` | Assistants de réponse d'approbation | Assistants de payload de réponse d'approbation d'exécution/plugin | |
  `plugin-sdk/channel-runtime-context` | Assistants de contexte d'exécution de channel | Assistants génériques d'enregistrement/obtention/surveillance de contexte d'exécution de channel | | `plugin-sdk/security-runtime` | Assistants de sécurité | Assistants partagés de confiance, restriction DM, contenu externe et collecte de secrets | | `plugin-sdk/ssrf-policy` | Assistants de stratégie SSRF |
  Assistants de stratégie de liste d'autorisation d'hôte et de réseau privé | | `plugin-sdk/ssrf-runtime` | Assistants d'exécution SSRF | Répartiteur épinglé, récupération protégée, assistants de stratégie SSRF | | `plugin-sdk/collection-runtime` | Assistants de cache borné | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | Assistants de restriction de diagnostic |
  `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | Assistants de formatage d'erreur | `formatUncaughtError`, `isApprovalNotFoundError`, assistants de graphe d'erreurs | | `plugin-sdk/fetch-runtime` | Assistants de récupération/proxy encapsulés | `resolveFetch`, assistants de proxy | | `plugin-sdk/host-runtime` | Assistants de normalisation d'hôte |
  `normalizeHostname`, `normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | Assistants de nouvelle tentative | `RetryConfig`, `retryAsync`, exécuteurs de stratégie | | `plugin-sdk/allow-from` | Formatage de la liste d'autorisation | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | Mappage d'entrée de la liste d'autorisation | `mapAllowlistResolutionInputs` | |
  `plugin-sdk/command-auth` | Assistants de restriction de commande et de surface de commande | `resolveControlCommandGate`, assistants d'autorisation de l'expéditeur, assistants de registre de commande y compris le formatage du menu d'arguments dynamique | | `plugin-sdk/command-status` | Moteurs de rendu de statut/aide de commande | `buildCommandsMessage`, `buildCommandsMessagePaginated`,
  `buildHelpMessage` | | `plugin-sdk/secret-input` | Analyse de l'entrée secrète | Assistants d'entrée secrète | | `plugin-sdk/webhook-ingress` | Assistants de demande webhook | Utilitaires de cible webhook | | `plugin-sdk/webhook-request-guards` | Assistants de garde du corps webhook | Assistants de lecture/limite du corps de la demande | | `plugin-sdk/reply-runtime` | Exécution de réponse
  partagée | Répartition entrante, heartbeat, planificateur de réponse, découpage | | `plugin-sdk/reply-dispatch-runtime` | Assistants de répartition de réponse ciblés | Finalisation, répartition de fournisseur et assistants de libellé de conversation | | `plugin-sdk/reply-history` | Assistants d'historique de réponse | `buildHistoryContext`, `buildPendingHistoryContextFromMap`,
  `recordPendingHistoryEntry`, `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | Planification de référence de réponse | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Assistants de segment de réponse | Assistants de découpage de texte/markdown | | `plugin-sdk/session-store-runtime` | Assistants de magasin de session | Assistants de chemin de magasin + mis à jour à
  | | `plugin-sdk/state-paths` | Assistants de chemin d'état | Assistants de répertoire d'état et API | | `plugin-sdk/routing` | Assistants de clé de routage/session | `resolveAgentRoute`, `buildAgentSessionKey`, `resolveDefaultAgentBoundAccountId`, assistants de normalisation de clé de session | | `plugin-sdk/status-helpers` | Assistants de statut de channel | Constructeurs de résumé de statut de
  channel/compte, valeurs par défaut d'état d'exécution, assistants de métadonnées de problème | | `plugin-sdk/target-resolver-runtime` | Assistants de résolveur de cible | Assistants de résolveur de cible partagés | | `plugin-sdk/string-normalization-runtime` | Assistants de normalisation de chaîne | Assistants de normalisation de slug/chaîne | | `plugin-sdk/request-url` | Assistants d'URL de
  demande | Extraire les URL de chaîne des entrées de type demande | | `plugin-sdk/run-command` | Assistants de commande chronométrée | Exécuteur de commande chronométré avec stdout/stderr normalisés | | `plugin-sdk/param-readers` | Lecteurs de paramètres | Lecteurs de paramètres outil/API courants | | `plugin-sdk/tool-payload` | Extraction de payload d'outil | Extraire les payloads normalisés des
  objets de résultat d'outil | | `plugin-sdk/tool-send` | Extraction d'envoi d'outil | Extraire les champs de cible d'envoi canoniques des arguments d'outil | | `plugin-sdk/temp-path` | Assistants de chemin temporaire | Assistants de chemin de téléchargement temporaire partagés | | `plugin-sdk/logging-core` | Assistants de journalisation | Assistants de journalisation de sous-système et de
  rédaction | | `plugin-sdk/markdown-table-runtime` | Assistants de tableau Markdown | Assistants de mode de tableau Markdown | | `plugin-sdk/reply-payload` | Types de réponse de message | Types de payload de réponse | | `plugin-sdk/provider-setup` | Assistants de configuration de fournisseur local/auto-hébergé organisés | Assistants de découverte/configuration de fournisseur auto-hébergé | |
  `plugin-sdk/self-hosted-provider-setup` | Assistants ciblés de configuration de fournisseur auto-hébergé compatible API | Mêmes assistants de découverte/configuration de fournisseur auto-hébergé | | `plugin-sdk/provider-auth-runtime` | Assistants d'auth d'exécution de fournisseur | Assistants de résolution de clé OAuth d'exécution | | `plugin-sdk/provider-auth-api-key` | Assistants de
  configuration de clé Anthropic de fournisseur | Assistants d'écriture de profil/de configuration de clé Moonshot | | `plugin-sdk/provider-auth-result` | Assistants de résultat d'auth de fournisseur | Constructeur de résultat d'auth OpenAI standard | | `plugin-sdk/provider-auth-login` | Assistants de connexion interactive de fournisseur | Assistants de connexion interactive partagés | |
  `plugin-sdk/provider-selection-runtime` | Assistants de sélection de fournisseur | Sélection de fournisseur configuré ou automatique et fusion de configuration de fournisseur brut | | `plugin-sdk/provider-env-vars` | Assistants de variable d'environnement de fournisseur | Assistants de recherche de variable d'environnement d'auth de fournisseur | | `plugin-sdk/provider-model-shared` | Assistants
  partagés de modèle/relecture de fournisseur | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructeurs de stratégie de relecture partagés, assistants de point de terminaison de fournisseur, et assistants de normalisation d'identifiant de modèle | | `plugin-sdk/provider-catalog-shared` | Assistants partagés de catalogue de fournisseur |
  `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | Correctifs de configuration de fournisseur | Assistants de configuration de configuration | | `plugin-sdk/provider-http` | Assistants HTTP de fournisseur | Assistants génériques de capacité HTTP/point de terminaison de
  fournisseur, y compris les assistants de formulaire multipart pour la transcription audio | | `plugin-sdk/provider-web-fetch` | Assistants de récupération web de fournisseur | Assistants d'inscription/cache de fournisseur de récupération web | | `plugin-sdk/provider-web-search-config-contract` | Assistants de configuration de recherche web de fournisseur | Assistants de
  configuration/d'identifiants de recherche web ciblés pour les fournisseurs qui n'ont pas besoin du câblage d'activation de plugin | | `plugin-sdk/provider-web-search-contract` | Assistants de contrat de recherche web de fournisseur | Assistants de contrat de configuration/d'identifiants de recherche web ciblés tels que `createWebSearchProviderContractFields`, `enablePluginInConfig`,
  `resolveProviderWebSearchPluginConfig`, et les defineurs/obtenteurs d'identifiants délimités | | `plugin-sdk/provider-web-search` | Assistants de recherche web de fournisseur | Assistants d'inscription/cache/exécution de fournisseur de recherche web | | `plugin-sdk/provider-tools` | Assistants de compatibilité outil/schéma de fournisseur | `ProviderToolCompatFamily`,
  `buildProviderToolCompatFamilyHooks`, nettoyage + diagnostics de schéma Gemini, et assistants de compatibilité xAI tels que `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | Assistants d'utilisation de fournisseur | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage`, et autres assistants d'utilisation de fournisseur | |
  `plugin-sdk/provider-stream` | Assistants d'enveloppeur de flux de fournisseur | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, types d'enveloppeur de flux, et assistants d'enveloppeur partagés OpenRouter/Bedrock/DeepSeek V4/Google/Kilocode/MiniMax/CLI/CLI/Z.A.I/CLI/Copilot | | `plugin-sdk/provider-transport-runtime` | Assistants de transport de
  fournisseur | Assistants de transport de fournisseur natif tels que la récupération protégée, les transformations de messages de transport et les flux d'événements de transport inscriptibles | | `plugin-sdk/keyed-async-queue` | File d'attente asynchrone ordonnée | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | Assistants de média partagés | Assistants de récupération/transformation/stockage
  de média plus constructeurs de payload de média | | `plugin-sdk/media-generation-runtime` | Assistants partagés de génération de média | Assistants de basculement partagés, sélection de candidats et messagerie de modèle manquant pour la génération d'image/vidéo/musique | | `plugin-sdk/media-understanding` | Assistants de compréhension de média | Types de fournisseur de compréhension de média
  plus exportations d'assistants image/audio orientés fournisseur | | `plugin-sdk/text-runtime` | Assistants de texte partagés | Suppression de texte visible par l'assistant, assistants de rendu/découpage/tableau Markdown, assistants de rédaction, assistants de balise de directive, utilitaires de texte sécurisé et assistants de texte/journalisation connexes | | `plugin-sdk/text-chunking` |
  Assistants de découpage de texte | Assistant de découpage de texte sortant | | `plugin-sdk/speech` | Assistants de parole | Types de fournisseur de parole plus assistants de directive, de registre et de validation orientés fournisseur | | `plugin-sdk/speech-core` | Noyau de parole partagé | Types de fournisseur de parole, registre, directives, normalisation | |
  `plugin-sdk/realtime-transcription` | Assistants de transcription en temps réel | Types de fournisseur, assistants de registre et assistant de session WebSocket partagé | | `plugin-sdk/realtime-voice` | Assistants vocaux en temps réel | Types de fournisseur, assistants de registre/résolution et assistants de session de pont | | `plugin-sdk/image-generation-core` | Noyau partagé de génération
  d'images | Types de génération d'images, basculement, auth et assistants de registre | | `plugin-sdk/music-generation` | Assistants de génération de musique | Types de fournisseur/demande/résultat de génération de musique | | `plugin-sdk/music-generation-core` | Noyau partagé de génération de musique | Types de génération de musique, assistants de basculement, recherche de fournisseur et analyse
  de référence de modèle | | `plugin-sdk/video-generation` | Assistants de génération de vidéo | Types de fournisseur/demande/résultat de génération de vidéo | | `plugin-sdk/video-generation-core` | Noyau partagé de génération de vidéo | Types de génération de vidéo, assistants de basculement, recherche de fournisseur et analyse de référence de modèle | | `plugin-sdk/interactive-runtime` |
  Assistants de réponse interactive | Normalisation/réduction de payload de réponse interactive | | `plugin-sdk/channel-config-primitives` | Primitives de configuration de channel | Primitives de schéma de configuration de channel ciblées | | `plugin-sdk/channel-config-writes` | Assistants d'écriture de configuration de channel | Assistants d'autorisation d'écriture de configuration de channel | |
  `plugin-sdk/channel-plugin-common` | Prélude de channel partagé | Exportations de prélude de plugin de channel partagé | | `plugin-sdk/channel-status` | Assistants de statut de channel | Assistants d'instantané/résumé de statut de channel partagé | | `plugin-sdk/allowlist-config-edit` | Assistants de configuration de liste d'autorisation | Assistants de modification/lecture de configuration de
  liste d'autorisation | | `plugin-sdk/group-access` | Assistants d'accès de groupe | Assistants de décision d'accès de groupe partagés | | `plugin-sdk/direct-dm` | Assistants de DM direct | Assistants d'auth/garde de DM direct partagés | | `plugin-sdk/extension-shared` | Assistants d'extension partagés | Primitives d'assistants de proxy ambiant et de channel passif/statut | |
  `plugin-sdk/webhook-targets` | Assistants de cible webhook | Assistants d'installation de route et de registre de cible webhook | | `plugin-sdk/webhook-path` | Assistants de chemin webhook | Assistants de normalisation de chemin webhook | | `plugin-sdk/web-media` | Assistants de média web partagés | Assistants de chargement de média distant/local | | `plugin-sdk/zod` | Ré-exportation Zod | `zod`
  ré-exporté pour les consommateurs du SDK de plugin | | `plugin-sdk/memory-core` | Assistants de mémoire-core groupés | Surface d'assistant de gestionnaire/configuration/fichier/CLI de mémoire | | `plugin-sdk/memory-core-engine-runtime` | Façade d'exécution du moteur de mémoire | Façade d'exécution de recherche/index de mémoire | | `plugin-sdk/memory-core-host-engine-foundation` | Moteur de
  fondation de l'hôte de mémoire | Exportations du moteur de fondation de l'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-embeddings` | Moteur d'incorporation de l'hôte de mémoire | Contrats d'incorporation de mémoire, accès au registre, fournisseur local et assistants de lot/distant génériques ; les fournisseurs distants concrets vivent dans leurs plugins propriétaires | |
  `plugin-sdk/memory-core-host-engine-qmd` | Moteur QMD de l'hôte de mémoire | Exportations du moteur QMD de l'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-storage` | Moteur de stockage de l'hôte de mémoire | Exportations du moteur de stockage de l'hôte de mémoire | | `plugin-sdk/memory-core-host-multimodal` | Assistants multimodaux de l'hôte de mémoire | Assistants multimodaux de
  l'hôte de mémoire | | `plugin-sdk/memory-core-host-query` | Assistants de requête de l'hôte de mémoire | Assistants de requête de l'hôte de mémoire | | `plugin-sdk/memory-core-host-secret` | Assistants de secret de l'hôte de mémoire | Assistants de secret de l'hôte de mémoire | | `plugin-sdk/memory-core-host-events` | Assistants de journal d'événements de l'hôte de mémoire | Assistants de
  journal d'événements de l'hôte de mémoire | | `plugin-sdk/memory-core-host-status` | Assistants de statut de l'hôte de mémoire | Assistants de statut de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-cli` | Exécution CLI de l'hôte de mémoire | Assistants d'exécution CLI de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-core` | Exécution principale de l'hôte de mémoire |
  Assistants d'exécution principale de l'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-files` | Assistants de fichier/exécution de l'hôte de mémoire | Assistants de fichier/exécution de l'hôte de mémoire | | `plugin-sdk/memory-host-core` | Alias d'exécution principale de l'hôte de mémoire | Alias neutre par fournisseur pour les assistants d'exécution principale de l'hôte de mémoire | |
  `plugin-sdk/memory-host-events` | Alias de journal d'événements de l'hôte de mémoire | Alias neutre par fournisseur pour les assistants de journal d'événements de l'hôte de mémoire | | `plugin-sdk/memory-host-files` | Alias de fichier/exécution de l'hôte de mémoire | Alias neutre par fournisseur pour les assistants de fichier/exécution de l'hôte de mémoire | | `plugin-sdk/memory-host-markdown` |
  Assistants de Markdown géré | Assistants de Markdown géré partagés pour les plugins adjacents à la mémoire | | `plugin-sdk/memory-host-search` | Façade de recherche de mémoire active | Façade d'exécution différée du gestionnaire de recherche de mémoire active | | `plugin-sdk/memory-host-status` | Alias de statut de l'hôte de mémoire | Alias neutre par fournisseur pour les assistants de statut de
  l'hôte de mémoire | | `plugin-sdk/memory-lancedb` | Assistants de memory-lancedb groupés | Surface d'assistant memory-lancedb | | `plugin-sdk/testing` | Utilitaires de test | Assistants de test et simulations |
</Accordion>

Ce tableau représente intentionnellement le sous-ensemble de migration courant, et non l'intégralité de la surface du SDK. La liste complète des plus de 200 points d'entrée se trouve dans `scripts/lib/plugin-sdk-entrypoints.json`.

Cette liste inclut toujours certaines interfaces d'assistance pour les plugins intégrés, telles que `plugin-sdk/feishu`, `plugin-sdk/feishu-setup`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup` et `plugin-sdk/matrix*`. Celles-ci restent exportées pour la maintenance et la compatibilité des plugins intégrés, mais elles sont intentionnellement omises du tableau de migration courant et ne sont pas la cible recommandée pour le nouveau code de plugin.

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
  `plugin-sdk/diagnostics-otel`, `plugin-sdk/diagnostics-prometheus`,
  `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership`,
  et `plugin-sdk/voice-call`

`plugin-sdk/github-copilot-token` expose actuellement la surface étroite d'assistance de jetons `DEFAULT_COPILOT_API_BASE_URL`,
`deriveCopilotApiBaseUrlFromToken` et `resolveCopilotApiToken`.

Utilisez l'import le plus précis correspondant à la tâche. Si vous ne trouvez pas d'export, consultez la source sur `src/plugin-sdk/` ou demandez sur Discord.

## Dépréciations actives

Dépréciations plus ciblées qui s'appliquent à l'ensemble du SDK de plugin, du contrat de fournisseur, de la surface d'exécution et du manifeste. Chacune fonctionne encore aujourd'hui mais sera supprimée dans une future version majeure. L'entrée sous chaque élément fait correspondre l'ancienne API à son remplacement canonique.

<AccordionGroup>
  <Accordion title="command-auth help builders → command-status">
    **Ancien (`openclaw/plugin-sdk/command-auth`)** : `buildCommandsMessage`,
    `buildCommandsMessagePaginated`, `buildHelpMessage`.

    **Nouveau (`openclaw/plugin-sdk/command-status`)** : mêmes signatures, mêmes
    exportations — simplement importées depuis le sous-chemin plus ciblé. `command-auth`
    les réexporte en tant que stubs de compatibilité.

    ```typescript
    // Before
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-auth";

    // After
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-status";
    ```

  </Accordion>

  <Accordion title="Mention gating helpers → resolveInboundMentionDecision">
    **Ancien** : `resolveInboundMentionRequirement({ facts, policy })` et
    `shouldDropInboundForMention(...)` depuis
    `openclaw/plugin-sdk/channel-inbound` ou
    `openclaw/plugin-sdk/channel-mention-gating`.

    **Nouveau** : `resolveInboundMentionDecision({ facts, policy })` — renvoie un
    objet de décision unique au lieu de deux appels séparés.

    Les plugins de canal en aval (Slack, Discord, Matrix, MS Teams) ont déjà
    effectué la transition.

  </Accordion>

  <Accordion title="Channel runtime shim and channel actions helpers">
    `openclaw/plugin-sdk/channel-runtime` est une couche de compatibilité pour les
    plugins de canal plus anciens. Ne l'importez pas dans le nouveau code ; utilisez
    `openclaw/plugin-sdk/channel-runtime-context` pour enregistrer les objets d'exécution.

    Les helpers `channelActions*` dans `openclaw/plugin-sdk/channel-actions` sont
    dépréciés en même temps que les exportations de canal « actions » brutes. Exposez les capacités
    via la surface sémantique `presentation` à la place — les plugins de canal
    déclarent ce qu'ils affichent (cartes, boutons, sélecteurs) plutôt que les noms d'actions bruts
    qu'ils acceptent.

  </Accordion>

  <Accordion title="Assistant de recherche Web provider tool() → createTool() sur le plugin">
    **Ancien** : `tool()` factory depuis `openclaw/plugin-sdk/provider-web-search`.

    **Nouveau** : implémentez `createTool(...)` directement sur le plugin provider.
    OpenClaw n'a plus besoin de l'assistant SDK pour enregistrer le wrapper de tool.

  </Accordion>

  <Accordion title="Enveloppes de channel en texte brut → BodyForAgent">
    **Ancien** : `formatInboundEnvelope(...)` (et
    `ChannelMessageForAgent.channelEnvelope`) pour construire une enveloppe d'invite
    (prompt) en texte brut à plat à partir des messages channel entrants.

    **Nouveau** : `BodyForAgent` plus des blocs de contexte utilisateur structurés. Les plugins
    channel attachent les métadonnées de routage (fil, sujet, réponse à, réactions) sous
    forme de champs typés au lieu de les concaténer dans une chaîne d'invite. L'assistant
    `formatAgentEnvelope(...)` est toujours pris en charge pour les enveloppes
    synthétisées destinées à l'assistant, mais les enveloppes en texte brut entrantes sont
    en voie de disparition.

    Zones affectées : `inbound_claim`, `message_received`, et tout
    plugin channel personnalisé qui a post-traité le texte `channelEnvelope`.

  </Accordion>

  <Accordion title="Types de découverte de provider → types de catalogue de providers">
    Quatre alias de type de découverte sont maintenant de fins wrappers sur
    les types de l'ère du catalogue :

    | Ancien alias                | Nouveau type               |
    | --------------------------- | --------------------------- |
    | `ProviderDiscoveryOrder` | `ProviderCatalogOrder`   |
    | `ProviderDiscoveryContext` | `ProviderCatalogContext` |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`  |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`  |

    Plus le sac statique hérité `ProviderCapabilities` — les plugins provider
    devraient attacher des faits de capacité via le contrat d'exécution du provider
    plutôt que par un objet statique.

  </Accordion>

  <Accordion title="Thinking policy hooks → resolveThinkingProfile">
    **Ancien** (trois hooks séparés sur `ProviderThinkingPolicy`) :
    `isBinaryThinking(ctx)`, `supportsXHighThinking(ctx)` et
    `resolveDefaultThinkingLevel(ctx)`.

    **Nouveau** : un seul `resolveThinkingProfile(ctx)` qui renvoie un
    `ProviderThinkingProfile` avec le `id` canonique, `label` optionnel, et
    une liste de niveaux classés. OpenClaw rétrograde automatiquement les valeurs stockées obsolètes par le rang de profil.

    Implémentez un seul hook au lieu de trois. Les hooks hérités continuent de fonctionner pendant
    la période d'obsolescence mais ne sont pas composés avec le résultat du profil.

  </Accordion>

  <Accordion title="External OAuth provider fallback → contracts.externalAuthProviders">
    **Ancien** : implémentation de `resolveExternalOAuthProfiles(...)` sans
    déclarer le fournisseur dans le manifeste du plugin.

    **Nouveau** : déclarez `contracts.externalAuthProviders` dans le manifeste du plugin
    **et** implémentez `resolveExternalAuthProfiles(...)`. L'ancien chemin de repli d'« auth
    fallback » émet un avertissement à l'exécution et sera supprimé.

    ```json
    {
      "contracts": {
        "externalAuthProviders": ["anthropic", "openai"]
      }
    }
    ```

  </Accordion>

  <Accordion title="Provider env-var lookup → setup.providers[].envVars">
    **Ancien** champ de manifeste : `providerAuthEnvVars: { anthropic: ["ANTHROPIC_API_KEY"] }`.

    **Nouveau** : reflétez la même recherche de variable d'environnement dans `setup.providers[].envVars`
    sur le manifeste. Cela consolide les métadonnées d'environnement de configuration/état en un seul
    endroit et évite de démarrer le runtime du plugin juste pour répondre aux recherches de variables d'environnement.

    `providerAuthEnvVars` reste pris en charge via un adaptateur de compatibilité
    jusqu'à la fin de la période d'obsolescence.

  </Accordion>

  <Accordion title="Memory plugin registration → registerMemoryCapability">
    **Ancien** : trois appels distincts —
    `api.registerMemoryPromptSection(...)`,
    `api.registerMemoryFlushPlan(...)`,
    `api.registerMemoryRuntime(...)`.

    **Nouveau** : un appel sur l'API de l'état de la mémoire —
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`.

    Mêmes emplacements, appel d'enregistrement unique. Les assistants mémoire additifs
    (`registerMemoryPromptSupplement`, `registerMemoryCorpusSupplement`,
    `registerMemoryEmbeddingProvider`) ne sont pas affectés.

  </Accordion>

  <Accordion title="Subagent session messages types renamed">
    Deux alias de type hérités toujours exportés depuis `src/plugins/runtime/types.ts` :

    | Ancien                           | Nouveau                             |
    | ----------------------------- | ------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    La méthode d'exécution `readSession` est dépréciée en faveur de
    `getSessionMessages`. Même signature ; l'ancienne méthode appelle la nouvelle.

  </Accordion>

  <Accordion title="runtime.tasks.flow → runtime.tasks.flows">
    **Ancien** : `runtime.tasks.flow` (singulier) renvoyait un accesseur de flux de tâches en direct.

    **Nouveau** : `runtime.tasks.flows` (pluriel) renvoie un accès TaskFlow basé sur des DTO,
    qui est sécurisé pour l'importation et ne nécessite pas le chargement du runtime
    de tâches complet.

    ```typescript
    // Before
    const flow = api.runtime.tasks.flow(ctx);
    // After
    const flows = api.runtime.tasks.flows(ctx);
    ```

  </Accordion>

<Accordion title="Embedded extension factories → agent tool-result middleware">
  Traité dans « Procédure de migration → Migrer les extensions de résultats d'outil Pi vers le middleware » ci-dessus. Inclus ici pour exhaustivité : le chemin `api.registerEmbeddedExtensionFactory(...)` propre à Pi et supprimé est remplacé par `api.registerAgentToolResultMiddleware(...)` avec une liste d'exécution explicite dans `contracts.agentToolResultMiddleware`.
</Accordion>

  <Accordion title="Alias OpenClawSchemaType → OpenClawConfig">
    `OpenClawSchemaType` réexporté depuis `openclaw/plugin-sdk` est désormais un
    alias sur une ligne pour `OpenClawConfig`. Préférez le nom canonique.

    ```typescript
    // Before
    import type { OpenClawSchemaType } from "openclaw/plugin-sdk";
    // After
    import type { OpenClawConfig } from "openclaw/plugin-sdk/config-schema";
    ```

  </Accordion>
</AccordionGroup>

<Note>
  Les dépréciations au niveau de l'extension (à l'intérieur des plugins de canal/fournisseur groupés sous `extensions/`) sont suivies dans leurs propres `api.ts` et `runtime-api.ts`. Elles n'affectent pas les contrats des plugins tiers et ne sont pas listées ici. Si vous consommez directement le baril local d'un plugin groupé, lisez les commentaires de dépréciation dans ce baril avant de mettre à
  jour.
</Note>

## Calendrier de suppression

| Quand                         | Ce qui se passe                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| **Maintenant**                | Les surfaces dépréciées émettent des avertissements d'exécution                         |
| **Prochaine version majeure** | Les surfaces dépréciées seront supprimées ; les plugins les utilisant encore échoueront |

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

- [Getting Started](/fr/plugins/building-plugins) — créer votre premier plugin
- [Aperçu du SDK](/fr/plugins/sdk-overview) — référence complète des importations de sous-chemin
- [Plugins de canal](/fr/plugins/sdk-channel-plugins) — créer des plugins de canal
- [Plugins de fournisseur](/fr/plugins/sdk-provider-plugins) — créer des plugins de fournisseur
- [Internes du plugin](/fr/plugins/architecture) — approfondissement de l'architecture
- [Manifeste du plugin](/fr/plugins/manifest) — référence du schéma du manifeste
