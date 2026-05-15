---
summary: "Migrer depuis la couche de compatibilité descendante héritée vers le SDK de plugin moderne"
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

- **`openclaw/plugin-sdk/compat`** - un seul import qui réexportait des dizaines d'assistants. Il a été introduit pour maintenir les anciens plugins basés sur des hooks (hooks) fonctionnels pendant que la nouvelle architecture de plugin était en cours de construction.
- **`openclaw/plugin-sdk/infra-runtime`** - un large tonneau (barrel) d'assistants d'exécution qui mélangeait les événements système, l'état du battement de cœur (heartbeat), les files de livraison, les assistants de récupération/proxy, les assistants de fichiers, les types d'approbation et des utilitaires sans rapport.
- **`openclaw/plugin-sdk/config-runtime`** - un tonneau (barrel) de compatibilité de configuration large qui transporte toujours des assistants de chargement/écriture directs obsolètes pendant la fenêtre de migration.
- **`openclaw/extension-api`** - un pont qui donnait aux plugins un accès direct aux assistants côté hôte comme le lanceur d'agent intégré.
- **`api.registerEmbeddedExtensionFactory(...)`** - un hook d'extension groupé, réservé à Pi et supprimé, qui pouvait observer les événements du lanceur intégré (embedded-runner) tels que `tool_result`.

Les surfaces d'import larges sont maintenant **obsolètes**. Elles fonctionnent toujours à l'exécution, mais les nouveaux plugins ne doivent pas les utiliser, et les plugins existants devraient migrer avant que la prochaine version majeure ne les supprime. L'API d'enregistrement de fabrique d'extension intégrée, réservé à Pi, a été supprimé ; utilisez plutôt l'intergiciel (middleware) des résultats d'outils (tool-result).

OpenClaw ne supprime pas ni ne réinterprète le comportement documenté des plugins dans le même changement qui introduit un remplacement. Les modifications de contrat cassants doivent d'abord passer par un adaptateur de compatibilité, des diagnostics, une documentation et une fenêtre de dépréciation. Cela s'applique aux importations du SDK, aux champs du manifeste, aux API de configuration, aux hooks et au comportement d'enregistrement à l'exécution.

<Warning>La couche de compatibilité descendante sera supprimée dans une future version majeure. Les plugins qui importent encore depuis ces surfaces cesseront de fonctionner lorsque cela se produira. Les enregistrements de fabriques d'extension intégrée, réservés à Pi, ne se chargent déjà plus.</Warning>

## Pourquoi ce changement

L'ancienne approche posait des problèmes :

- **Démarrage lent** - l'importation d'un seul assistant chargeait des dizaines de modules sans rapport
- **Dépendances circulaires** - les ré-exports larges facilitaient la création de cycles d'importation
- **Surface API floue** - impossible de distinguer les exports stables des internes

Le SDK moderne de plugin résout ce problème : chaque chemin d'importation (`openclaw/plugin-sdk/\<subpath\>`)
est un petit module autonome avec un objectif clair et un contrat documenté.

Les couches de commodité pour les providers groupés ont également été supprimées.
Les couches d'aide marquées par canal étaient des raccourcis privés de mono-repo, et non des contrats de plugin stables. Utilisez plutôt des sous-chemins SDK génériques étroits. Dans l'espace de travail du plugin groupé,
conservez les aides détenues par le provider dans le propre `api.ts` ou
`runtime-api.ts` de ce plugin.

Exemples actuels de providers groupés :

- Anthropic conserve les aides de flux spécifiques à Claude dans sa propre couche `api.ts` /
  `contract-api.ts`
- OpenAI conserve les builders de provider, les aides de modèle par défaut, et les builders de provider
  en temps réel dans son propre `api.ts`
- OpenRouter conserve le builder de provider et les aides d'onboarding/config dans son propre
  `api.ts`

## Plan de migration Talk et voix en temps réel

Le code voix en temps réel, téléphonie, réunion et Talk navigateur passe de la gestion locale des tours
à un contrôleur de session Talk partagé exporté par
`openclaw/plugin-sdk/realtime-voice`. Le nouveau contrôleur possède l'enveloppe d'événement Talk commune, l'état du tour actif, l'état de capture,
l'état audio de sortie, l'historique des événements récents et le rejet des tours périmés. Les plugins de provider doivent continuer à posséder
les sessions en temps réel spécifiques au fournisseur ; les plugins de surface doivent continuer à posséder la capture,
la lecture, la téléphonie et les particularités des réunions.

Cette migration Talk est intentionnellement une rupture propre :

1. Conservez les primitives de contrôleur/runtime partagées dans
   `plugin-sdk/realtime-voice`.
2. Déplacez les surfaces groupées sur le contrôleur partagé : relais navigateur,
   transfert de salle gérée, voix en temps réel, STT flux d'appel vocal, temps réel
   Google Meet et push-to-talk natif.
3. Remplacez les anciennes familles Talk RPC par la API finale `talk.session.*` et
   `talk.client.*`.
4. Publier un canal d'événements Talk en direct dans Gateway
   `hello-ok.features.events` : `talk.event`.
5. Supprimer l'ancien point de terminaison HTTP temps réel et tout chemin de
   remplacement d'instruction au moment de la requête.

Le nouveau code ne doit pas appeler `createTalkEventSequencer(...)` directement, sauf s'il
implémente un adaptateur de bas niveau ou un appareil de test. Privilégiez le contrôleur
partagé afin que les événements limités à un tour ne puissent pas être émis sans ID de tour,
que les appels `turnEnd` / `turnCancel` obsolètes ne puissent pas effacer
un tour actif plus récent, et que les événements de cycle de vie de la sortie audio
restent cohérents entre la téléphonie, les réunions, la relais du navigateur,
le transfert de salle gérée et les clients Talk natifs.

La structure de l'API public cible est :

```typescript
// Gateway-owned Talk session API.
await gateway.request("talk.session.create", {
  mode: "realtime",
  transport: "gateway-relay",
  brain: "agent-consult",
  sessionKey: "main",
});
await gateway.request("talk.session.appendAudio", { sessionId, audioBase64 });
await gateway.request("talk.session.cancelOutput", { sessionId, reason: "barge-in" });
await gateway.request("talk.session.submitToolResult", {
  sessionId,
  callId,
  result: { status: "working" },
  options: { willContinue: true },
});
await gateway.request("talk.session.submitToolResult", {
  sessionId,
  callId,
  result: { status: "already_delivered" },
  options: { suppressResponse: true },
});
await gateway.request("talk.session.submitToolResult", { sessionId, callId, result });
await gateway.request("talk.session.close", { sessionId });

// Client-owned provider session API.
await gateway.request("talk.client.create", {
  mode: "realtime",
  transport: "webrtc",
  brain: "agent-consult",
  sessionKey: "main",
});
await gateway.request("talk.client.toolCall", { sessionKey, callId, name, args });
```

Les sessions WebRTC/provider-websocket détenues par le navigateur utilisent `talk.client.create`,
car le navigateur possède la négociation du provider et le transport des médias, tandis que le
Gateway possède les identifiants, les instructions et la stratégie d'outil.
`talk.session.*` est la surface commune gérée par Gateway pour la relais en temps réel via
passerelle, la transcription via relais de passerelle et les sessions STT/TTS natives de salle gérée.

Les configurations obsolètes qui plaçaient les sélecteurs en temps réel à côté de `talk.provider` /
`talk.providers` doivent être réparées avec `openclaw doctor --fix` ; le Talk d'exécution
ne réinterprète pas la configuration du provider de synthèse vocale/TTS comme configuration du provider en temps réel.

Les combinaisons `talk.session.create` prises en charge sont intentionnellement limitées :

| Mode            | Transport       | Brain           | Propriétaire        | Notes                                                                                                                                       |
| --------------- | --------------- | --------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `realtime`      | `gateway-relay` | `agent-consult` | Gateway             | Audio du provider duplex intégral via le Gateway ; les appels d'outils sont acheminés via l'outil de consultation d'agent.                  |
| `transcription` | `gateway-relay` | `none`          | Gateway             | STT en continu uniquement ; les appelants envoient l'audio d'entrée et reçoivent les événements de transcription.                           |
| `stt-tts`       | `managed-room`  | `agent-consult` | Salle native/client | Salons de type appuyer-pour-parler et talkie-walkie où le client possède la capture/la lecture et le Gateway possède l'état du tour.        |
| `stt-tts`       | `managed-room`  | `direct-tools`  | Salon natif/client  | Mode de salle administrateur uniquement pour les surfaces de première partie fiables qui exécutent directement les actions d'outil Gateway. |

Méthodes supprimées :

| Ancien                           | Nouveau                                                  |
| -------------------------------- | -------------------------------------------------------- |
| `talk.realtime.session`          | `talk.client.create`                                     |
| `talk.realtime.toolCall`         | `talk.client.toolCall`                                   |
| `talk.realtime.relayAudio`       | `talk.session.appendAudio`                               |
| `talk.realtime.relayCancel`      | `talk.session.cancelOutput` ou `talk.session.cancelTurn` |
| `talk.realtime.relayToolResult`  | `talk.session.submitToolResult`                          |
| `talk.realtime.relayStop`        | `talk.session.close`                                     |
| `talk.transcription.session`     | `talk.session.create({ mode: "transcription" })`         |
| `talk.transcription.relayAudio`  | `talk.session.appendAudio`                               |
| `talk.transcription.relayCancel` | `talk.session.cancelTurn`                                |
| `talk.transcription.relayStop`   | `talk.session.close`                                     |
| `talk.handoff.create`            | `talk.session.create({ transport: "managed-room" })`     |
| `talk.handoff.join`              | `talk.session.join`                                      |
| `talk.handoff.revoke`            | `talk.session.close`                                     |

Le vocabulaire de contrôle unifié est également délibérément restreint :

| Méthode                         | S'applique à                                            | Contrat                                                                                                                                                                                  |
| ------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `talk.session.appendAudio`      | `realtime/gateway-relay`, `transcription/gateway-relay` | Ajoute un bloc audio PCM en base64 à la session provider détenue par la même connexion Gateway.                                                                                          |
| `talk.session.startTurn`        | `stt-tts/managed-room`                                  | Lance un tour utilisateur dans une salle gérée.                                                                                                                                          |
| `talk.session.endTurn`          | `stt-tts/managed-room`                                  | Termine le tour actif après validation du tour périmé.                                                                                                                                   |
| `talk.session.cancelTurn`       | toutes les sessions détenues par le Gateway             | Annule le travail actif de capture/provider/agent/TTS pour un tour.                                                                                                                      |
| `talk.session.cancelOutput`     | `realtime/gateway-relay`                                | Arrête la sortie audio de l'assistant sans nécessairement mettre fin au tour utilisateur.                                                                                                |
| `talk.session.submitToolResult` | `realtime/gateway-relay`                                | Complete a provider tool call emitted by the relay; pass `options.willContinue` for interim output or `options.suppressResponse` to satisfy the call without another assistant response. |
| `talk.session.close`            | toutes les sessions unifiées                            | Arrêtez les sessions relay ou révoquez l'état de la salle gérée, puis oubliez l'ID de session unifié.                                                                                    |

Ne introduisez pas de cas particuliers provider ou platform dans le cœur pour que cela fonctionne. Le cœur possède la sémantique de session Talk. Les plugins provider possèdent la configuration de session fournisseur. Voice-call et Google Meet possèdent les adaptateurs de téléphonie/réunion. Les applications navigateur et natives possèdent l'UX de capture/lecture de l'appareil.

## Politique de compatibilité

Pour les plugins externes, le travail de compatibilité suit cet ordre :

1. ajouter le nouveau contrat
2. garder l'ancien comportement connecté via un adaptateur de compatibilité
3. émettre un diagnostic ou un avertissement qui nomme l'ancien chemin et le remplacement
4. couvrir les deux chemins dans les tests
5. documenter la dépréciation et le chemin de migration
6. supprimer uniquement après la fenêtre de migration annoncée, généralement dans une version majeure

Les mainteneurs peuvent auditer la file de migration actuelle avec `pnpm plugins:boundary-report`. Utilisez `pnpm plugins:boundary-report:summary` pour des comptages compacts, `--owner <id>` pour un plugin ou un propriétaire de compatibilité, et `pnpm plugins:boundary-report:ci` lorsqu'une porte CI devrait échouer sur des enregistrements de compatibilité dus, des imports SDK réservés inter-propriétaires, ou des sous-chemins SDK réservés inutilisés. Le rapport regroupe les enregistrements de compatibilité dépréciés par date de suppression, compte les références de code/docs locales, expose les imports SDK réservés inter-propriétaires, et résume le pont SDK hôte-mémoire privé afin que le nettoyage de compatibilité reste explicite au lieu de s'appuyer sur des recherches ad hoc. Les sous-chemins SDK réservés doivent avoir une utilisation suivie par le propriétaire ; les exports d'assistants réservés inutilisés doivent être supprimés du SDK public.

Si un champ de manifeste est toujours accepté, les auteurs de plugins peuvent continuer à l'utiliser jusqu'à ce que la documentation et les diagnostics disent le contraire. Le nouveau code devrait préférer le remplacement documenté, mais les plugins existants ne devraient pas casser pendant les versions mineures ordinaires.

## Comment migrer

<Steps>
  <Step title="Migrer les assistants de chargement/écriture de la configuration d'exécution">
    Les plugins groupés doivent cesser d'appeler
    `api.runtime.config.loadConfig()` et
    `api.runtime.config.writeConfigFile(...)` directement. Privilégiez la configuration qui a
    déjà été transmise dans le chemin d'appel actif. Les gestionnaires longue durée qui ont besoin
    de l'instantané du processus actuel peuvent utiliser `api.runtime.config.current()`. Les outils d'agent longue durée
    doivent utiliser le `ctx.getRuntimeConfig()` du contexte de l'outil à l'intérieur
    de `execute` afin qu'un outil créé avant une écriture de configuration voit toujours la configuration d'exécution actualisée.

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
    `loadConfig` et `writeConfigFile` restent en tant qu'assistants de compatibilité obsolètes
    pour les plugins externes pendant la période de migration et avertissent une seule fois avec
    le code de compatibilité `runtime-config-load-write`. Les plugins groupés et le code d'exécution
    du dépôt sont protégés par des garde-fous de l'analyseur dans
    `pnpm check:deprecated-api-usage` et
    `pnpm check:no-runtime-action-load-config` : l'utilisation du nouveau plugin en production échoue
    immédiatement, les écritures de configuration directes échouent, les méthodes du serveur de passerelle doivent utiliser
    l'instantané d'exécution de la requête, les assistants d'envoi/action/client du canal d'exécution
    doivent recevoir la configuration de leur limite, et les modules d'exécution longue durée ont
    zéro appel ambiant `loadConfig()` autorisé.

    Le nouveau code de plugin doit également éviter d'importer le module de compatibilité
    large `openclaw/plugin-sdk/config-runtime`. Utilisez le sous-chemin
    étroit du SDK qui correspond à la tâche :

    | Besoin | Import |
    | --- | --- |
    | Types de configuration tels que `OpenClawConfig` | `openclaw/plugin-sdk/config-types` |
    | Assertions de configuration déjà chargée et recherche de configuration d'entrée de plugin | `openclaw/plugin-sdk/plugin-config-runtime` |
    | Lectures de l'instantané d'exécution actuel | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | Écritures de configuration | `openclaw/plugin-sdk/config-mutation` |
    | Assistants de magasin de session | `openclaw/plugin-sdk/session-store-runtime` |
    | Configuration de table Markdown | `openclaw/plugin-sdk/markdown-table-runtime` |
    | Assistants d'exécution de stratégie de groupe | `openclaw/plugin-sdk/runtime-group-policy` |
    | Résolution de saisie de secret | `openclaw/plugin-sdk/secret-input-runtime` |
    | Remplacements de modèle/session | `openclaw/plugin-sdk/model-session-runtime` |

    Les plugins groupés et leurs tests sont protégés par l'analyseur contre le module
    large, de sorte que les importations et simulacres restent locaux au comportement dont ils ont besoin. Le module
    large existe toujours pour la compatibilité externe, mais le nouveau code ne doit pas
    en dépendre.

  </Step>

  <Step title="Migrate Pi tool-result extensions to middleware">
    Les plugins groupés doivent remplacer les gestionnaires de
    `api.registerEmbeddedExtensionFactory(...)` tool-result exclusifs à Pi par
    des intergiciels (middleware) neutres par rapport à l'environnement d'exécution.

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

    Les plugins externes ne peuvent pas enregistrer d'intergiciels de tool-result car ils peuvent
    réécrire la sortie des outils à haute confiance avant que le modèle ne la voie.

  </Step>

  <Step title="Migrate approval-native handlers to capability facts">
    Les plugins de canal capables d'approbation exposent désormais le comportement d'approbation natif via
    `approvalCapability.nativeRuntime` ainsi que le registre partagé du contexte d'exécution.

    Changements clés :

    - Remplacez `approvalCapability.handler.loadRuntime(...)` par
      `approvalCapability.nativeRuntime`
    - Déplacez l'authentification/livraison spécifiques à l'approbation hors de l'ancien câblage `plugin.auth` /
      `plugin.approvals` et vers `approvalCapability`
    - `ChannelPlugin.approvals` a été retiré du contrat public des plugins de canal ;
      déplacez les champs de livraison/natif/de rendu vers `approvalCapability`
    - `plugin.auth`Bolt reste uniquement pour les flux de connexion/déconnexion du canal ;
      les crochets d'authentification pour l'approbation ne sont plus lus par le cœur
    - Enregistrez les objets d'exécution appartenant au canal, tels que les clients, les jetons ou les applications Bolt,
      via `openclaw/plugin-sdk/channel-runtime-context`
    - N'envoyez pas de notices de reroute appartenant au plugin depuis les gestionnaires d'approbation natifs ;
      le cœur possède désormais les notices routed-elsewhere issues des résultats de livraison réels
    - Lorsque vous passez `channelRuntime` dans `createChannelManager(...)`, fournissez une
      surface `createPluginRuntime().channel` réelle. Les partiels (stubs) sont rejetés.

    Voir `/plugins/sdk-channel-plugins` pour la disposition actuelle des
    capacités d'approbation.

  </Step>

  <Step title="WindowsVérifier le comportement de repli du wrapper Windows">
    Si votre plugin utilise `openclaw/plugin-sdk/windows-spawn`Windows, les wrappers Windows
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

    Si votre appelant ne repose pas intentionnellement sur le repli du shell, ne définissez pas
    `allowShellFallback` et gérez plutôt l'erreur levée.

  </Step>

  <Step title="Trouver les imports dépréciés">
    Recherchez dans votre plugin les imports depuis l'une ou l'autre des surfaces dépréciées :

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "plugin-sdk/infra-runtime" my-plugin/
    grep -r "plugin-sdk/config-runtime" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="Remplacer par des imports ciblés">
    Chaque export de l'ancienne surface correspond à un chemin d'import moderne spécifique :

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

    Le même modèle s'applique aux autres assistants de pont hérités :

    | Ancien import | Équivalent moderne |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | assistants de magasin de session | `api.runtime.agent.session.*` |

  </Step>

  <Step title="Remplacer les importations larges d'infrastructure d'exécution">
    `openclaw/plugin-sdk/infra-runtime` existe toujours pour la compatibilité
    externe, mais le nouveau code doit importer l'interface d'assistance ciblée dont
    il a réellement besoin :

    | Besoin | Importation |
    | --- | --- |
    | Assistants de file d'événements système | `openclaw/plugin-sdk/system-event-runtime` |
    | Assistants de réveil, d'événement et de visibilité du battement de cœur | `openclaw/plugin-sdk/heartbeat-runtime` |
    | Vidange de la file d'attente de livraison en attente | `openclaw/plugin-sdk/delivery-queue-runtime` |
    | Télémétrie d'activité de canal | `openclaw/plugin-sdk/channel-activity-runtime` |
    | Caches de déduplication en mémoire | `openclaw/plugin-sdk/dedupe-runtime` |
    | Assistants de chemin sécurisé pour les fichiers locaux/médias | `openclaw/plugin-sdk/file-access-runtime` |
    | Récupération consciente du répartiteur | `openclaw/plugin-sdk/runtime-fetch` |
    | Assistants de récupération de proxy et gardés | `openclaw/plugin-sdk/fetch-runtime` |
    | Types de stratégie de répartiteur SSRF | `openclaw/plugin-sdk/ssrf-dispatcher` |
    | Types de demande/résolution d'approbation | `openclaw/plugin-sdk/approval-runtime` |
    | Assistants de charge utile de réponse d'approbation et de commande | `openclaw/plugin-sdk/approval-reply-runtime` |
    | Assistants de formatage d'erreur | `openclaw/plugin-sdk/error-runtime` |
    | Attentes de préparation du transport | `openclaw/plugin-sdk/transport-ready-runtime` |
    | Assistants de jeton sécurisé | `openclaw/plugin-sdk/secure-random-runtime` |
    | Concurrence de tâches asynchrones limitée | `openclaw/plugin-sdk/concurrency-runtime` |
    | Coercition numérique | `openclaw/plugin-sdk/number-runtime` |
    | Verrou asynchrone local au processus | `openclaw/plugin-sdk/async-lock-runtime` |
    | Verrous de fichiers | `openclaw/plugin-sdk/file-lock` |

    Les plugins regroupés sont protégés par l'analyseur contre `infra-runtime`, le code du référentiel
    ne peut donc revenir à l'importation large.

  </Step>

  <Step title="Migrer les assistants de routage de channel">
    Le nouveau code de routage de channel doit utiliser `openclaw/plugin-sdk/channel-route`.
    Les anciens noms de route-key et de comparable-target restent disponibles en tant qu'alias de compatibilité pendant la période de migration, mais les nouveaux plugins doivent utiliser les noms de route qui décrivent directement le comportement :

    | Ancien assistant | Assistant moderne |
    | --- | --- |
    | `channelRouteIdentityKey(...)` | `channelRouteDedupeKey(...)` |
    | `channelRouteKey(...)` | `channelRouteCompactKey(...)` |
    | `ComparableChannelTarget` | `ChannelRouteParsedTarget` |
    | `resolveComparableTargetForChannel(...)` | `resolveRouteTargetForChannel(...)` |
    | `resolveComparableTargetForLoadedChannel(...)` | `resolveRouteTargetForLoadedChannel(...)` |
    | `comparableChannelTargetsMatch(...)` | `channelRouteTargetsMatchExact(...)` |
    | `comparableChannelTargetsShareRoute(...)` | `channelRouteTargetsShareConversation(...)` |

    Les assistants de routage modernes normalisent `{ channel, to, accountId, threadId }`
    de manière cohérente entre les approbations natives, la suppression des réponses, la déduplication entrante, la livraison par cron et le routage de session. Si votre plugin possède une grammaire cible personnalisée, utilisez `resolveChannelRouteTargetWithParser(...)` pour adapter cet analyseur au même contrat de cible de routage.

  </Step>

  <Step title="Construire et tester">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## Référence du chemin d'importation

<Accordion title="Tableau des chemins d'importation courants">
  | Chemin d'importation | Objectif | Exportations clés | | --- | --- | --- | | `plugin-sdk/plugin-entry` | Assistant d'entrée de plugin canonique | `definePluginEntry` | | `plugin-sdk/core` | Ré-exportation ombre héritée pour les définitions/constructeurs d'entrée de channel | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | Exportation du schéma de
  configuration racine | `OpenClawSchema` | | `plugin-sdk/provider-entry` | Assistant d'entrée à fournisseur unique | `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | Définitions et constructeurs d'entrée de channel ciblés | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | Assistants partagés de
  l'assistant de configuration | Invite de liste blanche, constructeurs d'état de configuration | | `plugin-sdk/setup-runtime` | Assistants d'exécution au moment de la configuration | Adaptateurs de correctifs de configuration sûrs à l'importation, assistants de recherche de notes, `promptResolvedAllowFrom`, `splitSetupEntries`, proxies de configuration délégués | |
  `plugin-sdk/setup-adapter-runtime` | Assistants d'adaptateur de configuration | `createEnvPatchedAccountSetupAdapter` | | `plugin-sdk/setup-tools` | Assistants d'outillage de configuration | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` | | `plugin-sdk/account-core` | Assistants multi-comptes | Assistants de liste/config/action-gate
  de compte | | `plugin-sdk/account-id` | Assistants d'identifiant de compte | `DEFAULT_ACCOUNT_ID`, normalisation de l'identifiant de compte | | `plugin-sdk/account-resolution` | Assistants de recherche de compte | Assistants de recherche de compte + secours par défaut | | `plugin-sdk/account-helpers` | Assistants de compte étroits | Assistants de liste/action de compte | |
  `plugin-sdk/channel-setup` | Adaptateurs de l'assistant de configuration | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, plus `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` | | `plugin-sdk/channel-pairing` | Primitives d'appairage DM | `createChannelPairingController` | |
  `plugin-sdk/channel-reply-pipeline` | Câblage du préfixe de réponse, de la frappe et de la livraison à la source | `createChannelReplyPipeline`, `resolveChannelSourceReplyDeliveryMode` | | `plugin-sdk/channel-config-helpers` | Usines d'adaptateurs de configuration et assistants d'accès DM | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`,
  `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` | | `plugin-sdk/channel-config-schema` | Constructeurs de schémas de configuration | Primitives de schéma de configuration de channel partagé et uniquement le constructeur générique | | `plugin-sdk/bundled-channel-config-schema` | Schémas de configuration groupés | Plugins groupés maintenus par OpenClaw uniquement ;
  les nouveaux plugins doivent définir des schémas locaux au plugin | | `plugin-sdk/channel-config-schema-legacy` | Schémas de configuration groupés obsolètes | Alias de compatibilité uniquement ; utilisez `plugin-sdk/bundled-channel-config-schema` pour les plugins groupés maintenus | | `plugin-sdk/telegram-command-config` | Assistants de configuration de commande Telegram | Normalisation du nom
  de commande, suppression de la description, validation des doublons/conflits | | `plugin-sdk/channel-policy` | Résolution de stratégie de groupe/DM | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | Assistants de cycle de vie du statut de compte et du flux de brouillon | `createAccountStatusSink`, assistants de finalisation de l'aperçu du brouillon | |
  `plugin-sdk/inbound-envelope` | Assistants d'enveloppe entrante | Assistants de route partagée + constructeur d'enveloppe | | `plugin-sdk/inbound-reply-dispatch` | Assistants de réponse entrante | Assistants d'enregistrement et de répartition partagés | | `plugin-sdk/messaging-targets` | Analyse de la cible de messagerie | Assistants d'analyse/correspondance de cible | |
  `plugin-sdk/outbound-media` | Assistants de média sortant | Chargement de média sortant partagé | | `plugin-sdk/outbound-send-deps` | Assistants de dépendance d'envoi sortant | Recherche légère de `resolveOutboundSendDep` sans importer l'exécution sortante complète | | `plugin-sdk/outbound-runtime` | Assistants d'exécution sortante | Livraison sortante, délégué d'identité/envoi, session,
  formatage et assistants de planification de charge utile | | `plugin-sdk/thread-bindings-runtime` | Assistants de liaison de fil | Assistants de cycle de vie et d'adaptateur de liaison de fil | | `plugin-sdk/agent-media-payload` | Assistants de charge utile de média hérité | Constructeur de charge utile de média d'agent pour les dispositions de champ héritées | | `plugin-sdk/channel-runtime` |
  Shim de compatibilité obsolète | Utilitaires d'exécution de channel hérité uniquement | | `plugin-sdk/channel-send-result` | Types de résultat d'envoi | Types de résultat de réponse | | `plugin-sdk/runtime-store` | Stockage persistant de plugin | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | Assistants d'exécution larges | Assistants d'exécution/journalisation/sauvegarde/installation de
  plugin | | `plugin-sdk/runtime-env` | Assistants d'environnement d'exécution étroits | Environnement d'exécution/journalisation, délai d'attente, nouvelle tentative et assist. de temporisation | | `plugin-sdk/plugin-runtime` | Assistants d'exécution de plugin partagés | Assistants de commandes/hooks/http/interactifs de plugin | | `plugin-sdk/hook-runtime` | Assistants de pipeline de hook |
  Assistants de pipeline de hook Webhook/interne partagé | | `plugin-sdk/lazy-runtime` | Assistants d'exécution paresseux | `createLazyRuntimeModule`, `createLazyRuntimeMethod`, `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`, `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Assistants de processus | Assistants d'exécution partagés | | `plugin-sdk/cli-runtime` |
  Assistants d'exécution CLI | Formatage de commande, attentes, assistants de version | | `plugin-sdk/gateway-runtime` | Assistants Gateway | Client Gateway, assistant de démarrage prêt pour la boucle d'événements et assistants de correctifs d'état de channel | | `plugin-sdk/config-runtime` | Shim de compatibilité de configuration obsolète | Privilégiez `config-types`, `plugin-config-runtime`,
  `runtime-config-snapshot` et `config-mutation` | | `plugin-sdk/telegram-command-config` | Assistants de commande Telegram | Assistants de validation de commande Telegram stables en secours lorsque la surface de contrat Telegram groupée est indisponible | | `plugin-sdk/approval-runtime` | Assistants d'invite d'approbation | Charge utile d'approbation exec/plugin, assistants de profil/capacité
  d'approbation, assistants de routage/d'exécution d'approbation natifs et formatage du chemin d'affichage d'approbation structuré | | `plugin-sdk/approval-auth-runtime` | Assistants d'authentification d'approbation | Résolution de l'approbateur, authentification de la même conversation | | `plugin-sdk/approval-client-runtime` | Assistants client d'approbation | Assistants de profil/filtre
  d'approbation d'exécution natif | | `plugin-sdk/approval-delivery-runtime` | Assistants de livraison d'approbation | Adaptateurs de capacité/livraison d'approbation natifs | | `plugin-sdk/approval-gateway-runtime` | Assistants de passerelle d'approbation | Assistant de résolution de passerelle d'approbation partagée | | `plugin-sdk/approval-handler-adapter-runtime` | Assistants d'adaptateur
  d'approbation | Assistants de chargement d'adaptateur d'approbation natif léger pour les points d'entrée de channel à chaud | | `plugin-sdk/approval-handler-runtime` | Assistants de gestionnaire d'approbation | Assistants d'exécution de gestionnaire d'approbation plus larges ; privilégiez les interfaces adaptateur/passerelle plus étroites lorsqu'elles suffisent | |
  `plugin-sdk/approval-native-runtime` | Assistants de cible d'approbation | Assistants de liaison de cible/compte d'approbation natif | | `plugin-sdk/approval-reply-runtime` | Assistants de réponse d'approbation | Assistants de charge utile de réponse d'approbation exec/plugin | | `plugin-sdk/channel-runtime-context` | Assistants de contexte d'exécution de channel | Assistants
  d'enregistrement/obtention/watch de contexte d'exécution de channel générique | | `plugin-sdk/security-runtime` | Assistants de sécurité | Assistants de confiance partagée, gating DM, fichier/chemin délimité par la racine, contenu externe et assistants de collecte de secrets | | `plugin-sdk/ssrf-policy` | Assistants de stratégie SSRF | Assistants de liste blanche d'hôte et de stratégie de réseau
  privé | | `plugin-sdk/ssrf-runtime` | Assistants d'exécution SSRF | Répartiteur épinglé, récupération protégée, assistants de stratégie SSRF | | `plugin-sdk/system-event-runtime` | Assistants d'événement système | `enqueueSystemEvent`, `peekSystemEventEntries` | | `plugin-sdk/heartbeat-runtime` | Assistants de battement de cœur | Réveil, événement et assistants de visibilité du battement de cœur
  | | `plugin-sdk/delivery-queue-runtime` | Assistants de file d'attente de livraison | `drainPendingDeliveries` | | `plugin-sdk/channel-activity-runtime` | Assistants d'activité de channel | `recordChannelActivity` | | `plugin-sdk/dedupe-runtime` | Assistants de déduplication | Caches de déduplication en mémoire | | `plugin-sdk/file-access-runtime` | Assistants d'accès aux fichiers | Assistants
  de chemin de fichier/média local sécurisé | | `plugin-sdk/transport-ready-runtime` | Assistants de préparation du transport | `waitForTransportReady` | | `plugin-sdk/collection-runtime` | Assistants de cache borné | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | Assistants de gating de diagnostic | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` |
  Assistants de formatage des erreurs | `formatUncaughtError`, `isApprovalNotFoundError`, assistants de graphe d'erreurs | | `plugin-sdk/fetch-runtime` | Assistants de récupération/proxy encapsulés | `resolveFetch`, assistants de proxy, assistants d'options EnvHttpProxyAgent | | `plugin-sdk/host-runtime` | Assistants de normalisation d'hôte | `normalizeHostname`, `normalizeScpRemoteHost` | |
  `plugin-sdk/retry-runtime` | Assistants de nouvelle tentative | `RetryConfig`, `retryAsync`, exécuteurs de stratégie | | `plugin-sdk/allow-from` | Formatage de liste blanche | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | Mappage d'entrée de liste blanche | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | Assistants de gating de commande et de surface de
  commande | `resolveControlCommandGate`, assistants d'autorisation de l'expéditeur, assistants de registre de commandes, y compris le formatage du menu d'arguments dynamiques | | `plugin-sdk/command-status` | Moteurs d'état/aide de commande | `buildCommandsMessage`, `buildCommandsMessagePaginated`, `buildHelpMessage` | | `plugin-sdk/secret-input` | Analyse de l'entrée secrète | Assistants
  d'entrée secrète | | `plugin-sdk/webhook-ingress` | Assistants de requête Webhook | Utilitaires de cible Webhook | | `plugin-sdk/webhook-request-guards` | Assistants de garde de corps Webhook | Assistants de lecture/limite du corps de la requête | | `plugin-sdk/reply-runtime` | Exécution de réponse partagée | Répartition entrante, battement de cœur, planificateur de réponse, découpage | |
  `plugin-sdk/reply-dispatch-runtime` | Assistants de répartition de réponse étroits | Finalisation, répartition par fournisseur et assistants de étiquette de conversation | | `plugin-sdk/reply-history` | Assistants d'historique de réponse | `buildHistoryContext`, `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry`, `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` |
  Planification de référence de réponse | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Assistants de découpage de réponse | Assistants de découpage de texte/markdown | | `plugin-sdk/session-store-runtime` | Assistants de magasin de session | Assistants de chemin de magasin + mis à jour à | | `plugin-sdk/state-paths` | Assistants de chemin d'état | Assistants de répertoire d'état
  et OAuth | | `plugin-sdk/routing` | Assistants de clé de routage/session | `resolveAgentRoute`, `buildAgentSessionKey`, `resolveDefaultAgentBoundAccountId`, assistants de normalisation de clé de session | | `plugin-sdk/status-helpers` | Assistants d'état de channel | Constructeurs de résumé d'état de channel/compte, valeurs par défaut d'état d'exécution, assistants de métadonnées de problème | |
  `plugin-sdk/target-resolver-runtime` | Assistants de résolveur de cible | Assistants de résolveur de cible partagés | | `plugin-sdk/string-normalization-runtime` | Assistants de normalisation de chaîne | Assistants de normalisation de slug/chaîne | | `plugin-sdk/request-url` | Assistants d'URL de requête | Extraire les URL de chaîne des entrées de type requête | | `plugin-sdk/run-command` |
  Assistants de commande minutée | Exécuteur de commande minutée avec stdout/stderr normalisés | | `plugin-sdk/param-readers` | Lecteurs de paramètres | Lecteurs de paramètres d'outil/CLI courants | | `plugin-sdk/tool-payload` | Extraction de charge utile d'outil | Extraire les charges utiles normalisées des objets de résultat d'outil | | `plugin-sdk/tool-send` | Extraction d'envoi d'outil |
  Extraire les champs de cible d'envoi canoniques des arguments d'outil | | `plugin-sdk/temp-path` | Assistants de chemin temporaire | Assistants de chemin de téléchargement temporaire partagés | | `plugin-sdk/logging-core` | Assistants de journalisation | Assistants de journalisation de sous-système et de rédaction | | `plugin-sdk/markdown-table-runtime` | Assistants de tableau Markdown |
  Assistants de mode de tableau Markdown | | `plugin-sdk/reply-payload` | Types de réponse de message | Types de charge utile de réponse | | `plugin-sdk/provider-setup` | Assistants de configuration de fournisseur local/auto-hébergé sélectionné | Assistants de découverte/config de fournisseur auto-hébergé | | `plugin-sdk/self-hosted-provider-setup` | Assistants de configuration de fournisseur
  auto-hébergé compatible ciblé OpenAI | Mêmes assistants de découverte/config de fournisseur auto-hébergé | | `plugin-sdk/provider-auth-runtime` | Assistants d'authentification d'exécution de fournisseur | Assistants de résolution de clé d'API d'exécution | | `plugin-sdk/provider-auth-api-key` | Assistants de configuration de clé d'API de fournisseur | Assistants d'écriture de
  profil/d'intégration de clé d'API | | `plugin-sdk/provider-auth-result` | Assistants de résultat d'authentification de fournisseur | Constructeur de résultat d'authentification OAuth standard | | `plugin-sdk/provider-auth-login` | Assistants de connexion interactive de fournisseur | Assistants de connexion interactive partagés | | `plugin-sdk/provider-selection-runtime` | Assistants de sélection
  de fournisseur | Sélection de fournisseur configurée ou automatique et fusion de configuration de fournisseur brute | | `plugin-sdk/provider-env-vars` | Assistants de variable d'environnement de fournisseur | Assistants de recherche de variable d'environnement d'authentification de fournisseur | | `plugin-sdk/provider-model-shared` | Assistants partagés de modèle/relecture de fournisseur |
  `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructeurs de stratégie de relecture partagée, assistants de point de terminaison de fournisseur et assistants de normalisation d'identifiant de modèle | | `plugin-sdk/provider-catalog-shared` | Assistants partagés de catalogue de fournisseur | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`,
  `buildManifestModelProviderConfig`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | Correctifs d'intégration de fournisseur | Assistants de configuration d'intégration | | `plugin-sdk/provider-http` | Assistants HTTP de fournisseur | Assistants génériques de capacité HTTP/point de terminaison de fournisseur, y compris les
  assistants de formulaire multipart pour la transcription audio | | `plugin-sdk/provider-web-fetch` | Assistants de récupération Web de fournisseur | Assistants d'enregistrement/cache de fournisseur de récupération Web | | `plugin-sdk/provider-web-search-config-contract` | Assistants de configuration de recherche Web de fournisseur | Assistants de configuration/identifiants de recherche Web
  étroits pour les fournisseurs qui n'ont pas besoin de câblage d'activation de plugin | | `plugin-sdk/provider-web-search-contract` | Assistants de contrat de recherche Web de fournisseur | Assistants de contrat de configuration/identifiants de recherche Web étroits tels que `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig` et les
  setters/getters d'identifiants délimités | | `plugin-sdk/provider-web-search` | Assistants de recherche Web de fournisseur | Assistants d'enregistrement/cache/exécution de fournisseur de recherche Web | | `plugin-sdk/provider-tools` | Assistants de compatibilité d'outil/schéma de fournisseur | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, nettoyage de schéma Gemini +
  diagnostics et assistants de compatibilité xAI tels que `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | Assistants d'utilisation de fournisseur | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage` et autres assistants d'utilisation de fournisseur | | `plugin-sdk/provider-stream` | Assistants de wrapper de flux de fournisseur |
  `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, types de wrapper de flux et assistants de wrapper partagés Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-transport-runtime` | Assistants de transport de fournisseur | Assistants de transport de fournisseur natifs tels que la
  récupération protégée, les transformations de message de transport et les flux d'événements de transport inscriptibles | | `plugin-sdk/keyed-async-queue` | File d'attente asynchrone ordonnée | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | Assistants de média partagés | Assistants de récupération/transformation/stockage de média, sondage de dimension vidéo pris en charge par ffprobe et
  constructeurs de charge utile de média | | `plugin-sdk/media-generation-runtime` | Assistants partagés de génération de média | Assistants de basculement partagés, sélection de candidats et messagerie de modèle manquant pour la génération d'image/vidéo/musique | | `plugin-sdk/media-understanding` | Assistants de compréhension de média | Types de fournisseur de compréhension de média plus
  exportations d'assistants image/audio orientés fournisseur | | `plugin-sdk/text-runtime` | Assistants de texte partagés | Suppression de texte visible par l'assistant, assistants de rendu/découpage/tableau Markdown, assistants de rédaction, assistants de balise de directive, utilitaires de texte sécurisé et assistants de texte/journalisation connexes | | `plugin-sdk/text-chunking` | Assistants
  de découpage de texte | Assistant de découpage de texte sortant | | `plugin-sdk/speech` | Assistants de parole | Types de fournisseur de parole plus assistants de directive, de registre et de validation orientés fournisseur et constructeur TTS compatible OpenAI | | `plugin-sdk/speech-core` | Cœur de parole partagé | Types de fournisseur de parole, registre, directives, normalisation | |
  `plugin-sdk/realtime-transcription` | Assistants de transcription en temps réel | Types de fournisseur, assistants de registre et assistant de session WebSocket partagé | | `plugin-sdk/realtime-voice` | Assistants vocaux en temps réel | Types de fournisseur, assistants de registre/résolution, assistants de session de pont, files d'attente de retour de parole d'agent partagé, santé de la
  transcription/événement, suppression d'écho et assistants de consultation rapide du contexte | | `plugin-sdk/image-generation` | Assistants de génération d'images | Types de fournisseur de génération d'images plus assistants d'actif/image URL de données et le constructeur de fournisseur d'images compatible OpenAI | | `plugin-sdk/image-generation-core` | Cœur partagé de génération d'images |
  Types de génération d'images, basculement, authentification et assistants de registre | | `plugin-sdk/music-generation` | Assistants de génération de musique | Types de demande/résultat/fournisseur de génération de musique | | `plugin-sdk/music-generation-core` | Cœur partagé de génération de musique | Types de génération de musique, assistants de basculement, recherche de fournisseur et analyse
  de référence de modèle | | `plugin-sdk/video-generation` | Assistants de génération de vidéo | Types de demande/résultat/fournisseur de génération de vidéo | | `plugin-sdk/video-generation-core` | Cœur partagé de génération de vidéo | Types de génération de vidéo, assistants de basculement, recherche de fournisseur et analyse de référence de modèle | | `plugin-sdk/interactive-runtime` |
  Assistants de réponse interactive | Normalisation/réduction de la charge utile de réponse interactive | | `plugin-sdk/channel-config-primitives` | Primitives de configuration de channel | Primitives de schéma de configuration de channel étroit | | `plugin-sdk/channel-config-writes` | Assistants d'écriture de configuration de channel | Assistants d'autorisation d'écriture de configuration de
  channel | | `plugin-sdk/channel-plugin-common` | Prélude de channel partagé | Exportations de prélude de plugin de channel partagé | | `plugin-sdk/channel-status` | Assistants d'état de channel | Assistants de instantané/résumé d'état de channel partagé | | `plugin-sdk/allowlist-config-edit` | Assistants de configuration de liste blanche | Assistants de lecture/édition de configuration de liste
  blanche | | `plugin-sdk/group-access` | Assistants d'accès aux groupes | Assistants de décision d'accès aux groupes partagés | | `plugin-sdk/direct-dm` | Assistants de DM directs | Assistants d'auth/garde de DM directs partagés | | `plugin-sdk/extension-shared` | Assistants d'extension partagés | Primitives d'assistant de proxy ambiant et de channel passif/état | | `plugin-sdk/webhook-targets` |
  Assistants de cible Webhook | Assistants d'installation de route et de registre de cible Webhook | | `plugin-sdk/webhook-path` | Assistants de chemin Webhook | Assistants de normalisation de chemin Webhook | | `plugin-sdk/web-media` | Assistants de média Web partagés | Assistants de chargement de média distant/local | | `plugin-sdk/zod` | Ré-exportation Zod | `zod` ré-exporté pour les
  consommateurs du SDK de plugin | | `plugin-sdk/memory-core` | Assistants de cœur mémoire groupés | Surface d'assistant de gestionnaire/config/fichier/CLI de mémoire groupé | | `plugin-sdk/memory-core-engine-runtime` | Façade d'exécution du moteur de mémoire | Façade d'exécution de recherche/index de mémoire | | `plugin-sdk/memory-core-host-engine-foundation` | Moteur de base d'hôte de mémoire |
  Exportations du moteur de base d'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-embeddings` | Moteur d'intégration d'hôte de mémoire | Contrats d'intégration de mémoire, accès au registre, fournisseur local et assistants de lot/distant génériques ; les fournisseurs distants concrets vivent dans leurs plugins propriétaires | | `plugin-sdk/memory-core-host-engine-qmd` | Moteur QMD d'hôte
  de mémoire | Exportations du moteur QMD d'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-storage` | Moteur de stockage d'hôte de mémoire | Exportations du moteur de stockage d'hôte de mémoire | | `plugin-sdk/memory-core-host-multimodal` | Assistants multimodaux d'hôte de mémoire | Assistants multimodaux d'hôte de mémoire | | `plugin-sdk/memory-core-host-query` | Assistants de requête
  d'hôte de mémoire | Assistants de requête d'hôte de mémoire | | `plugin-sdk/memory-core-host-secret` | Assistants de secret d'hôte de mémoire | Assistants de secret d'hôte de mémoire | | `plugin-sdk/memory-core-host-events` | Assistants de journal d'événements d'hôte de mémoire | Assistants de journal d'événements d'hôte de mémoire | | `plugin-sdk/memory-core-host-status` | Assistants d'état
  d'hôte de mémoire | Assistants d'état d'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-cli` | Exécution CLI d'hôte de mémoire | Assistants d'exécution CLI d'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-core` | Exécution de base d'hôte de mémoire | Assistants d'exécution de base d'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-files` | Assistants de
  fichier/exécution d'hôte de mémoire | Assistants de fichier/exécution d'hôte de mémoire | | `plugin-sdk/memory-host-core` | Alias d'exécution de base d'hôte de mémoire | Alias neutre pour les assistants d'exécution de base d'hôte de mémoire | | `plugin-sdk/memory-host-events` | Alias de journal d'événements d'hôte de mémoire | Alias neutre pour les assistants de journal d'événements d'hôte de
  mémoire | | `plugin-sdk/memory-host-files` | Alias de fichier/exécution d'hôte de mémoire | Alias neutre pour les assistants de fichier/exécution d'hôte de mémoire | | `plugin-sdk/memory-host-markdown` | Assistants Markdown gérés | Assistants Markdown gérés partagés pour les plugins adjacents à la mémoire | | `plugin-sdk/memory-host-search` | Façade de recherche de mémoire active | Façade
  d'exécution différée du gestionnaire de recherche de mémoire active | | `plugin-sdk/memory-host-status` | Alias d'état d'hôte de mémoire | Alias neutre pour les assistants d'état d'hôte de mémoire | | `plugin-sdk/testing` | Utilitaires de test | Baril de compatibilité large hérité ; privilégiez les sous-chemins de test ciblés tels que `plugin-sdk/plugin-test-runtime`,
  `plugin-sdk/channel-test-helpers`, `plugin-sdk/channel-target-testing`, `plugin-sdk/test-env` et `plugin-sdk/test-fixtures` |
</Accordion>

Ce tableau est volontairement le sous-ensemble de migration commun, et non la surface complète du SDK. La liste complète des 200+ points d'entrée réside dans `scripts/lib/plugin-sdk-entrypoints.json`.

Les points d'assistance réservés pour les plugins groupés ont été retirés de la carte d'exportation publique du SDK, à l'exception des façades de compatibilité explicitement documentées, telles que le shim `plugin-sdk/discord` obsolète conservé pour le package publié `@openclaw/discord@2026.3.13`. Les assistants spécifiques au propriétaire résident dans le package du plugin propriétaire ; le comportement partagé de l'hôte doit passer par des contrats génériques du SDK tels que `plugin-sdk/gateway-runtime`, `plugin-sdk/security-runtime` et `plugin-sdk/plugin-config-runtime`.

Utilisez l'importation la plus étroite qui correspond à la tâche. Si vous ne trouvez pas d'exportation, vérifiez la source à `src/plugin-sdk/` ou demandez aux mainteneurs quel contrat générique doit en être le propriétaire.

## Obsolescences actives

Obsolescences plus ciblées qui s'appliquent à l'ensemble du SDK de plugin, au contrat de fournisseur, à la surface d'exécution et au manifeste. Chacune fonctionne encore aujourd'hui mais sera supprimée dans une future version majeure. L'entrée sous chaque élément fait correspondre l'ancienne API à son remplacement canonique.

<AccordionGroup>
  <Accordion title="command-auth help builders → command-status">
    **Ancien (`openclaw/plugin-sdk/command-auth`)** : `buildCommandsMessage`,
    `buildCommandsMessagePaginated`, `buildHelpMessage`.

    **Nouveau (`openclaw/plugin-sdk/command-status`)** : mêmes signatures, mêmes
    exportations - simplement importées depuis le sous-chemin plus étroit. `command-auth`
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
    `shouldDropInboundForMention(...)` de
    `openclaw/plugin-sdk/channel-inbound` ou
    `openclaw/plugin-sdk/channel-mention-gating`.

    **Nouveau** : `resolveInboundMentionDecision({ facts, policy })` - renvoie un
    objet de décision unique au lieu de deux appels séparés.

    Les plugins de canal en aval (Slack, Discord, Matrix, MS Teams) ont déjà
    effectué la transition.

  </Accordion>

  <Accordion title="Channel runtime shim and channel actions helpers">
    `openclaw/plugin-sdk/channel-runtime` est une shim de compatibilité pour les anciens
    plugins de channel. Ne l'importez pas dans le nouveau code ; utilisez
    `openclaw/plugin-sdk/channel-runtime-context` pour enregistrer les objets
    d'exécution.

    Les helpers `channelActions*` dans `openclaw/plugin-sdk/channel-actions` sont
    obsolètes, tout comme les exportations brutes de « actions » de channel. Exposez les capacités
    via la surface sémantique `presentation` à la place - les plugins de channel
    déclarent ce qu'ils affichent (cartes, boutons, sélections) plutôt que les noms
    d'action bruts qu'ils acceptent.

  </Accordion>

  <Accordion title="Web search provider tool() helper → createTool() on the plugin">
    **Ancien** : fabrique `tool()` issue de `openclaw/plugin-sdk/provider-web-search`.

    **Nouveau** : implémentez `createTool(...)` directement sur le plugin provider.
    OpenClaw n'a plus besoin du helper du SDK pour enregistrer le wrapper de l'outil.

  </Accordion>

  <Accordion title="Plaintext channel envelopes → BodyForAgent">
    **Ancien** : `formatInboundEnvelope(...)` (et
    `ChannelMessageForAgent.channelEnvelope`) pour construire une enveloppe de prompt
    en texte brut à plat à partir des messages entrants du channel.

    **Nouveau** : `BodyForAgent` plus des blocs de contexte utilisateur structurés. Les plugins de channel
    attachent des métadonnées de routage (fil, sujet, réponse à, réactions) en tant que
    champs typés au lieu de les concaténer dans une chaîne de prompt. Le helper
    `formatAgentEnvelope(...)` est toujours pris en charge pour les enveloppes
    synthétisées pour l'assistant, mais les enveloppes en texte brut entrantes sont en
    voie de disparition.

    Zones affectées : `inbound_claim`, `message_received`, et tout plugin de channel personnalisé
    qui a post-traité du texte `channelEnvelope`.

  </Accordion>

  <Accordion title="Types de découverte de provider → types de catalogue de providers">
    Quatre alias de type de découverte sont désormais de minces enveloppes autour des
    types de l'ère du catalogue :

    | Ancien alias                 | Nouveau type                  |
    | ------------------------- | ------------------------- |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    Plus le sac statique hérité `ProviderCapabilities` - les plugins de provider
    devraient utiliser des hooks de provider explicites tels que `buildReplayPolicy`,
    `normalizeToolSchemas` et `wrapStreamFn` plutôt qu'un objet statique.

  </Accordion>

  <Accordion title="Hooks de stratégie de réflexion → resolveThinkingProfile">
    **Ancien** (trois hooks séparés sur `ProviderThinkingPolicy`) :
    `isBinaryThinking(ctx)`, `supportsXHighThinking(ctx)` et
    `resolveDefaultThinkingLevel(ctx)`.

    **Nouveau** : un seul `resolveThinkingProfile(ctx)` qui renvoie un
    `ProviderThinkingProfile` avec le `id` canonique, `label` facultatif, et
    une liste de niveaux classés. OpenClaw rétrograde automatiquement les valeurs stockées obsolètes par le rang
    du profil.

    Implémentez un seul hook au lieu de trois. Les hooks hérités continuent de fonctionner pendant
    la période de dépréciation mais ne sont pas composés avec le résultat du profil.

  </Accordion>

  <Accordion title="Fallback de provider OAuth externe → contracts.externalAuthProviders">
    **Ancien** : implémentation de `resolveExternalOAuthProfiles(...)` sans
    déclarer le provider dans le manifeste du plugin.

    **Nouveau** : déclarez `contracts.externalAuthProviders` dans le manifeste du plugin
    **et** implémentez `resolveExternalAuthProfiles(...)`. L'ancien chemin de « fallback
    d'auth » émet un avertissement à l'exécution et sera supprimé.

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

    **Nouveau** : mettre en miroir la même recherche de variable d'environnement dans `setup.providers[].envVars`
    sur le manifeste. Cela consolide les métadonnées d'environnement de configuration/état en un
    seul endroit et évite de démarrer le runtime du plugin juste pour répondre aux recherches
    de variables d'environnement.

    `providerAuthEnvVars` reste pris en charge via un adaptateur de compatibilité
    jusqu'à la fin de la période d'obsolescence.

  </Accordion>

  <Accordion title="Memory plugin registration → registerMemoryCapability">
    **Ancien** : trois appels séparés -
    `api.registerMemoryPromptSection(...)`,
    `api.registerMemoryFlushPlan(...)`,
    `api.registerMemoryRuntime(...)`.

    **Nouveau** : un appel sur l'API de mémoire (API) -
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`.

    Mêmes emplacements, appel d'enregistrement unique. Les assistants de mémoire additifs
    (`registerMemoryPromptSupplement`, `registerMemoryCorpusSupplement`,
    `registerMemoryEmbeddingProvider`) ne sont pas concernés.

  </Accordion>

  <Accordion title="Subagent session messages types renamed">
    Deux alias de type hérités toujours exportés depuis `src/plugins/runtime/types.ts` :

    | Ancien                           | Nouveau                             |
    | ----------------------------- | ------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    La méthode de runtime `readSession` est obsolète et remplacée par
    `getSessionMessages`. Même signature ; l'ancienne méthode appelle la
    nouvelle.

  </Accordion>

  <Accordion title="runtime.tasks.flow → runtime.tasks.managedFlows">
    **Ancien** : `runtime.tasks.flow` (singulier) renvoyait un accès dynamique au flux de tâches.

    **Nouveau** : `runtime.tasks.managedFlows` conserve le runtime de mutation TaskFlow géré
    pour les plugins qui créent, mettent à jour, annulent ou exécutent des tâches enfants à partir d'un
    flux. Utilisez `runtime.tasks.flows` lorsque le plugin a uniquement besoin de lectures basées sur des DTO.

    ```typescript
    // Before
    const flow = api.runtime.tasks.flow.fromToolContext(ctx);
    // After
    const flow = api.runtime.tasks.managedFlows.fromToolContext(ctx);
    ```

  </Accordion>

<Accordion title="Embedded extension factories → agent tool-result middleware">
  Traité dans « Comment migrer → Migrer les extensions tool-result Pi vers le middleware » ci-dessus. Inclus ici par souci d'exhaustivité : le chemin `api.registerEmbeddedExtensionFactory(...)` réservé à Pi est remplacé par `api.registerAgentToolResultMiddleware(...)` avec une liste d'exécution explicite dans `contracts.agentToolResultMiddleware`.
</Accordion>

  <Accordion title="OpenClawSchemaType alias → OpenClawConfig">
    `OpenClawSchemaType` réexporté depuis `openclaw/plugin-sdk` est désormais
    un alias sur une ligne pour `OpenClawConfig`. Privilégiez le nom canonique.

    ```typescript
    // Before
    import type { OpenClawSchemaType } from "openclaw/plugin-sdk";
    // After
    import type { OpenClawConfig } from "openclaw/plugin-sdk/config-schema";
    ```

  </Accordion>
</AccordionGroup>

<Note>
  Les obsolètes au niveau de l'extension (à l'intérieur des plugins channel/provider groupés sous `extensions/`) sont suivis dans leurs propres barils `api.ts` et `runtime-api.ts`. Ils n'affectent pas les contrats de plugins tiers et ne sont pas répertoriés ici. Si vous consommez directement le baril local d'un plugin groupé, lisez les commentaires d'obsolescence dans ce baril avant de mettre à
  niveau.
</Note>

## Calendrier de suppression

| Quand                         | Ce qui se passe                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| **Maintenant**                | Les surfaces obsolètes émettent des avertissements à l'exécution                         |
| **Prochaine version majeure** | Les surfaces obsolètes seront supprimées ; les plugins les utilisant toujours échoueront |

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

- [Getting Started](/fr/plugins/building-plugins) - créez votre premier plugin
- [Aperçu du SDK](/fr/plugins/sdk-overview) - référence complète des imports de sous-chemin
- [Plugins de channel](/fr/plugins/sdk-channel-plugins) - création de plugins de channel
- [Plugins de provider](/fr/plugins/sdk-provider-plugins) - création de plugins de provider
- [Fonctionnement interne des plugins](/fr/plugins/architecture) - plongée en profondeur dans l'architecture
- [Manifeste de plugin](/fr/plugins/manifest) - référence du schéma de manifeste
