---
summary: "Migrer depuis la couche de compatibilité ascendante héritée vers le SDK de plugin moderne"
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

- **`openclaw/plugin-sdk/compat`** - un import unique qui réexportait des dizaines d'assistants. Il a été introduit pour maintenir le fonctionnement des plugins plus anciens basés sur des hooks pendant que la nouvelle architecture de plugin était en cours de construction.
- **`openclaw/plugin-sdk/infra-runtime`** - un baril d'assistants d'exécution large qui mélangeait les événements système, l'état du heartbeat, les files de livraison, les assistants de récupération/proxy, les assistants de fichiers, les types d'approbation et des utilitaires sans rapport.
- **`openclaw/plugin-sdk/config-runtime`** - un baril de compatibilité de configuration large qui transporte encore des assistants de chargement/écriture direct dépréciés pendant la fenêtre de migration.
- **`openclaw/extension-api`** - un pont qui donnait aux plugins un accès direct aux assistants côté hôte comme le lanceur d'agent intégré.
- **`api.registerEmbeddedExtensionFactory(...)`** - un hook d'extension groupé supprimé, réservé à Pi, qui pouvait observer les événements du lanceur intégré tels que `tool_result`.

Les surfaces d'import larges sont maintenant **obsolètes**. Elles fonctionnent toujours à l'exécution, mais les nouveaux plugins ne doivent pas les utiliser, et les plugins existants devraient migrer avant que la prochaine version majeure ne les supprime. L'API d'enregistrement de fabrique d'extension intégrée, réservé à Pi, a été supprimé ; utilisez plutôt l'intergiciel (middleware) des résultats d'outils (tool-result).

OpenClaw ne supprime pas ni ne réinterprète le comportement documenté des plugins dans le même changement qui introduit un remplacement. Les modifications de contrat cassants doivent d'abord passer par un adaptateur de compatibilité, des diagnostics, une documentation et une fenêtre de dépréciation. Cela s'applique aux importations du SDK, aux champs du manifeste, aux API de configuration, aux hooks et au comportement d'enregistrement à l'exécution.

<Warning>La couche de compatibilité descendante sera supprimée dans une future version majeure. Les plugins qui importent encore depuis ces surfaces cesseront de fonctionner lorsque cela se produira. Les enregistrements de fabriques d'extension intégrée, réservés à Pi, ne se chargent déjà plus.</Warning>

## Pourquoi ce changement

L'ancienne approche posait des problèmes :

- **Démarrage lent** - l'importation d'un seul assistant chargeait des dizaines de modules sans rapport
- **Dépendances circulaires** - les ré-exports larges facilitaient la création de cycles d'importation
- **Surface API floue** - impossible de distinguer les exports stables des internes

Le SDK de plugin moderne résout ce problème : chaque chemin d'importation (`openclaw/plugin-sdk/\<subpath\>`) est un petit module autonome avec un objectif clair et un contrat documenté.

Les interfaces de commodité héritées pour les providers de canaux groupés ont également disparu. Les interfaces d'assistants marquées par canal étaient des raccourcis privés de mono-repo, et non des contrats de plugin stables. Utilisez plutôt des sous-chemins génériques étroits du SDK. Dans l'espace de travail du plugin groupé, conservez les assistants détenus par le provider dans le propre `api.ts` ou `runtime-api.ts` de ce plugin.

Exemples actuels de providers groupés :

- Anthropic conserve les assistants de flux spécifiques à Claude dans sa propre interface Anthropic`api.ts` / `contract-api.ts`
- OpenAI conserve les builders de providers, les assistants de modèle par défaut et les builders de providers en temps réel dans son propre OpenAI`api.ts`
- OpenRouter conserve le builder de provider et les assistants d'onboarding/configuration dans son propre OpenRouter`api.ts`

## Plan de migration Talk et voix en temps réel

Le code de voix en temps réel, de téléphonie, de réunion et de Talk navigateur passe du suivi des tours local à la surface à un contrôleur de session Talk partagé exporté par `openclaw/plugin-sdk/realtime-voice`. Le nouveau contrôleur possède l'enveloppe d'événement Talk commune, l'état du tour actif, l'état de capture, l'état audio de sortie, l'historique des événements récents et le rejet des tours périmés. Les plugins de provider doivent continuer à posséder les sessions en temps réel spécifiques au fournisseur ; les plugins de surface doivent continuer à posséder les particularités de capture, de lecture, de téléphonie et de réunion.

Cette migration Talk est intentionnellement une rupture propre :

1. Gardez les primitives de contrôleur/runtime partagées dans
   `plugin-sdk/realtime-voice`.
2. Déplacez les surfaces groupées sur le contrôleur partagé : relais navigateur,
   transfert de salle gérée, voix en temps réel, STT flux d'appel vocal, temps réel
   Google Meet et push-to-talk natif.
3. Remplacez les anciennes familles RPC Talk par les RPC finales API`talk.session.*` et
   `talk.client.*`.
4. Annoncez un seul channel d'événement Talk en direct dans le Gateway
   `hello-ok.features.events` : `talk.event`.
5. Supprimer l'ancien point de terminaison HTTP temps réel et tout chemin de
   remplacement d'instruction au moment de la requête.

Le nouveau code ne doit pas appeler `createTalkEventSequencer(...)` directement, sauf s'il implémente un adaptateur de bas niveau ou un outil de test. Préférez le contrôleur partagé afin que les événements délimités par tour ne puissent pas être émis sans identifiant de tour, que les appels `turnEnd` /
`turnCancel` périmés ne puissent pas effacer un tour actif plus récent, et que les événements de cycle de vie audio de sortie restent cohérents entre la téléphonie, les réunions, le relais navigateur, le transfert de salle gérée et les clients Talk natifs.

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
await gateway.request("talk.client.steer", { sessionKey, text, mode: "steer" });
```

Les sessions WebRTC/provider-websocket appartenant au navigateur utilisent `talk.client.create`, car le navigateur possède la négociation du fournisseur et le transport média tandis que le Gateway possède les identifiants, les instructions et la politique d'outil. `talk.session.*` est la surface commune gérée par le Gateway pour le temps réel relais par passerelle, la transcription relais par passerelle et les sessions STT/TTS natives de salle gérée.

Les configurations héritées qui plaçaient les sélecteurs temps réel à côté de `talk.provider` /
`talk.providers` doivent être réparées avec `openclaw doctor --fix` ; le runtime Talk ne réinterprète pas la configuration du provider de parole/TTS comme configuration de provider temps réel.

Les combinaisons `talk.session.create` prises en charge sont intentionnellement peu nombreuses :

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

| Méthode                         | S'applique à                                            | Contrat                                                                                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `talk.session.appendAudio`      | `realtime/gateway-relay`, `transcription/gateway-relay` | Ajoute un bloc audio PCM en base64 à la session provider détenue par la même connexion Gateway.                                                                                                                |
| `talk.session.startTurn`        | `stt-tts/managed-room`                                  | Lance un tour utilisateur dans une salle gérée.                                                                                                                                                                |
| `talk.session.endTurn`          | `stt-tts/managed-room`                                  | Termine le tour actif après validation du tour périmé.                                                                                                                                                         |
| `talk.session.cancelTurn`       | toutes les sessions détenues par le Gateway             | Annule le travail actif de capture/provider/agent/TTS pour un tour.                                                                                                                                            |
| `talk.session.cancelOutput`     | `realtime/gateway-relay`                                | Arrête la sortie audio de l'assistant sans nécessairement mettre fin au tour utilisateur.                                                                                                                      |
| `talk.session.submitToolResult` | `realtime/gateway-relay`                                | Compléter un appel d'outil provider émis par le relais ; passez `options.willContinue` pour une sortie temporaire ou `options.suppressResponse` pour satisfaire l'appel sans une autre réponse de l'assistant. |
| `talk.session.steer`            | sessions Talk prises en charge par un agent             | Envoyer le `status` parlé, le `steer`, le `cancel` ou le contrôle `followup` à l'exécution intégrée active résolue à partir de la session Talk.                                                                |
| `talk.session.close`            | toutes les sessions unifiées                            | Arrêtez les sessions de relais ou révoquez l'état de la salle gérée, puis oubliez l'identifiant de session unifiée.                                                                                            |

N'introduisez pas de cas particuliers liés au provider ou à la plateforme dans le cœur pour que cela fonctionne. Le cœur possède la sémantique des sessions Talk. Les plugins provider possèdent la configuration des sessions vendor. Voice-call et Google Meet possèdent les adaptateurs téléphonie/réunion. Les navigateurs et les applications natives possèdent l'UX de capture/lecture des appareils.

## Politique de compatibilité

Pour les plugins externes, le travail de compatibilité suit cet ordre :

1. ajouter le nouveau contrat
2. garder l'ancien comportement connecté via un adaptateur de compatibilité
3. émettre un diagnostic ou un avertissement qui nomme l'ancien chemin et le remplaçant
4. couvrir les deux chemins dans les tests
5. documenter la dépréciation et le chemin de migration
6. supprimer uniquement après la fenêtre de migration annoncée, généralement dans une version majeure

Les mainteneurs peuvent auditer la file d'attente de migration actuelle avec `pnpm plugins:boundary-report`. Utilisez `pnpm plugins:boundary-report:summary` pour des comptages compacts, `--owner <id>` pour un plugin ou un propriétaire de compatibilité, et `pnpm plugins:boundary-report:ci` lorsqu'une porte CI doit échouer en cas d'enregistrements de compatibilité dus, d'imports SDK réservés inter-propriétaires, ou de sous-chemins SDK réservés inutilisés. Le rapport groupe les enregistrements de compatibilité dépréciés par date de suppression, compte les références de code/docs locales, expose les imports SDK réservés inter-propriétaires, et résume le pont SDK hôte de mémoire privé afin que le nettoyage de la compatibilité reste explicite plutôt que de s'appuyer sur des recherches ad hoc. Les sous-chemins SDK réservés doivent avoir une utilisation du propriétaire suivie ; les exports d'aide réservés inutilisés doivent être supprimés du SDK public.

Si un champ de manifeste est toujours accepté, les auteurs de plugins peuvent continuer à l'utiliser jusqu'à ce que les docs et les diagnostics indiquent le contraire. Le nouveau code devrait préférer le remplaçant documenté, mais les plugins existants ne devraient pas casser pendant les versions mineures ordinaires.

## Comment migrer

<Steps>
  <Step title="Migrer les assistants de chargement/écriture de la configuration d'exécution">
    Les plugins fournis (bundled) doivent cesser d'appeler
    `api.runtime.config.loadConfig()` et
    `api.runtime.config.writeConfigFile(...)` directement. Préférez la configuration qui a
    déjà été transmise dans le chemin d'appel actif. Les gestionnaires longue durée qui ont besoin
    de l'instantané du processus actuel peuvent utiliser `api.runtime.config.current()`. Les outils d'agent longue durée
    doivent utiliser le `ctx.getRuntimeConfig()` du contexte de l'outil à l'intérieur
    de `execute` afin qu'un outil créé avant une écriture de configuration voie toujours la
    configuration d'exécution actualisée.

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
    `loadConfig` et `writeConfigFile` restent en tant qu'assistants de compatibilité
    obsolètes pour les plugins externes pendant la fenêtre de migration et avertissent une seule fois avec
    le code de compatibilité `runtime-config-load-write`. Les plugins fournis et le code d'exécution
    du dépôt sont protégés par des garde-fous du scanner dans
    `pnpm check:deprecated-api-usage` et
    `pnpm check:no-runtime-action-load-config` : la nouvelle utilisation du plugin en production
    échoue immédiatement, les écritures directes de configuration échouent, les méthodes du serveur de passerelle doivent utiliser
    l'instantané d'exécution de la requête, les assistants d'envoi/action/client du canal d'exécution
    doivent recevoir la configuration de leur limite, et les modules d'exécution longue durée ont
    zéro appel ambiant `loadConfig()` autorisé.

    Le nouveau code de plugin doit également éviter d'importer le module de compatibilité
    `openclaw/plugin-sdk/config-runtime` large. Utilisez le sous-chemin
    SDK étroit qui correspond à la tâche :

    | Besoin | Import |
    | --- | --- |
    | Types de configuration tels que `OpenClawConfig` | `openclaw/plugin-sdk/config-contracts` |
    | Assertions de configuration déjà chargée et recherche de configuration d'entrée de plugin | `openclaw/plugin-sdk/plugin-config-runtime` |
    | Lectures de l'instantané d'exécution actuel | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | Écritures de configuration | `openclaw/plugin-sdk/config-mutation` |
    | Assistants de magasin de session | `openclaw/plugin-sdk/session-store-runtime` |
    | Configuration de table Markdown | `openclaw/plugin-sdk/markdown-table-runtime` |
    | Assistants d'exécution de stratégie de groupe | `openclaw/plugin-sdk/runtime-group-policy` |
    | Résolution des entrées secrètes | `openclaw/plugin-sdk/secret-input-runtime` |
    | Remplacements de modèle/session | `openclaw/plugin-sdk/model-session-runtime` |

    Les plugins fournis et leurs tests sont protégés par le scanner contre le module
    large, de sorte que les importations et les simulacres restent locaux au comportement dont ils ont besoin. Le module
    large existe toujours pour la compatibilité externe, mais le nouveau code ne doit pas
    en dépendre.

  </Step>

  <Step title="Migrer les extensions de résultats d'outil Pi vers le middleware">
    Les plugins groupés doivent remplacer les gestionnaires de
    `api.registerEmbeddedExtensionFactory(...)` tool-result propres à Pi par
    un middleware neutre par rapport à l'exécution.

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

    Les plugins externes ne peuvent pas enregistrer de middleware pour les résultats d'outil car il peut
    réécrire la sortie de l'outil à haute confiance avant que le modèle ne la voie.

  </Step>

  <Step title="Migrer les gestionnaires natifs d'approbation vers les faits de capacité">
    Les plugins de canal capables d'approbation exposent désormais le comportement d'approbation natif via
    `approvalCapability.nativeRuntime` ainsi que le registre partagé du contexte d'exécution.

    Principales modifications :

    - Remplacez `approvalCapability.handler.loadRuntime(...)` par
      `approvalCapability.nativeRuntime`
    - Déplacez l'authentification/livraison spécifiques à l'approbation hors de l'ancien câblage `plugin.auth` /
      `plugin.approvals` et vers `approvalCapability`
    - `ChannelPlugin.approvals` a été retiré du contrat public du plugin de canal ;
      déplacez les champs de livraison/natif/rendu vers `approvalCapability`
    - `plugin.auth`Bolt reste uniquement pour les flux de connexion/déconnexion du canal ; les crochets
      d'authentification d'approbation n'y sont plus lus par le cœur
    - Enregistrez les objets d'exécution détenus par le canal, tels que les clients, les jetons ou les applications Bolt,
      via `openclaw/plugin-sdk/channel-runtime-context`
    - N'envoyez pas de notifications de réacheminement détenues par le plugin depuis les gestionnaires d'approbation natifs ;
      le cœur possède désormais les notifications de réacheminement-ailleurs provenant des résultats de livraison réels
    - Lors du passage de `channelRuntime` dans `createChannelManager(...)`, fournissez une
      surface `createPluginRuntime().channel` réelle. Les partiels (stubs) sont rejetés.

    Consultez `/plugins/sdk-channel-plugins` pour la disposition actuelle de la capacité d'approbation.

  </Step>

  <Step title="WindowsVérifier le comportement de repli du wrapper Windows">
    Si votre plugin utilise `openclaw/plugin-sdk/windows-spawn`Windows, les wrappers Windows `.cmd`/`.bat` non résolus échouent désormais en mode fermé, sauf si vous passez explicitement `allowShellFallback: true`.

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

    Si votre appelant ne repose pas intentionnellement sur le repli vers le shell, ne définissez pas `allowShellFallback` et gérez plutôt l'erreur renvoyée.

  </Step>

  <Step title="Trouver les imports obsolètes">
    Recherchez dans votre plugin les imports provenant de l'une ou l'autre des surfaces obsolètes :

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

    Pour les assistants côté hôte, utilisez le runtime de plugin injecté au lieu d'importer directement :

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
    | assistants du magasin de session | `api.runtime.agent.session.*` |

  </Step>

  <Step title="Remplacer les imports larges d'infra-runtime">
    `openclaw/plugin-sdk/infra-runtime` existe toujours pour la compatibilité
    externe, mais le nouveau code doit importer la surface d'assistant ciblée dont
    il a réellement besoin :

    | Besoin | Import |
    | --- | --- |
    | Assistants de file d'événements système | `openclaw/plugin-sdk/system-event-runtime` |
    | Assistants de réveil par pulsation, d'événement et de visibilité | `openclaw/plugin-sdk/heartbeat-runtime` |
    | Vidange de la file d'attente de livraison en attente | `openclaw/plugin-sdk/delivery-queue-runtime` |
    | Télémétrie d'activité de canal | `openclaw/plugin-sdk/channel-activity-runtime` |
    | Caches de déduplication en mémoire | `openclaw/plugin-sdk/dedupe-runtime` |
    | Assistants de chemin sécurisé pour fichiers locaux/médias | `openclaw/plugin-sdk/file-access-runtime` |
    | Récupération consciente du répartiteur (Dispatcher) | `openclaw/plugin-sdk/runtime-fetch` |
    | Assistants de récupération par proxy et gardée | `openclaw/plugin-sdk/fetch-runtime` |
    | Types de stratégie de répartiteur SSRF | `openclaw/plugin-sdk/ssrf-dispatcher` |
    | Types de demande/résolution d'approbation | `openclaw/plugin-sdk/approval-runtime` |
    | Charge utile de réponse d'approbation et assistants de commande | `openclaw/plugin-sdk/approval-reply-runtime` |
    | Assistants de formatage d'erreurs | `openclaw/plugin-sdk/error-runtime` |
    | Attentes de disponibilité du transport | `openclaw/plugin-sdk/transport-ready-runtime` |
    | Assistants de jeton sécurisé | `openclaw/plugin-sdk/secure-random-runtime` |
    | Concurrence de tâches asynchrones limitée | `openclaw/plugin-sdk/concurrency-runtime` |
    | Coercition numérique | `openclaw/plugin-sdk/number-runtime` |
    | Verrou asynchrone local au processus | `openclaw/plugin-sdk/async-lock-runtime` |
    | Verrous de fichiers | `openclaw/plugin-sdk/file-lock` |

    Les plugins groupés sont protégés par un analyseur contre `infra-runtime`, le code du dépôt
    ne peut donc pas revenir à l'import généralisé.

  </Step>

  <Step title="Migrer les assistants de routage de channel">
    Le nouveau code de routage de channel devrait utiliser `openclaw/plugin-sdk/channel-route`.
    Les anciens noms de route-key et de comparable-target restent des alias de compatibilité
    pendant la période de migration, mais les nouveaux plugins doivent utiliser les noms de route
    qui décrivent directement le comportement :

    | Ancien assistant | Assistant moderne |
    | --- | --- |
    | `channelRouteIdentityKey(...)` | `channelRouteDedupeKey(...)` |
    | `channelRouteKey(...)` | `channelRouteCompactKey(...)` |
    | `ComparableChannelTarget` | `ChannelRouteParsedTarget` |
    | `comparableChannelTargetsMatch(...)` | `channelRouteTargetsMatchExact(...)` |
    | `comparableChannelTargetsShareRoute(...)` | `channelRouteTargetsShareConversation(...)` |

    Les assistants de routage modernes normalisent `{ channel, to, accountId, threadId }`
    de manière cohérente pour les approbations natives, la suppression des réponses, la déduplication entrante,
    la livraison cron et le routage de session.

    N'ajoutez pas de nouvelles utilisations de `ChannelMessagingAdapter.parseExplicitTarget` ou
    des assistants de loaded-route basés sur l'analyseur (`parseExplicitTargetForLoadedChannel`
    ou `resolveRouteTargetForLoadedChannel`) ou
    `resolveChannelRouteTargetWithParser(...)` de `plugin-sdk/channel-route`.
    Ces hooks sont dépréciés et ne restent que pour les anciens plugins pendant la
    période de migration. Les nouveaux plugins de channel doivent utiliser
    `messaging.targetResolver.resolveTarget(...)` pour la normalisation de l'ID de cible
    et le repli en cas d'absence dans le répertoire, `messaging.inferTargetChatType(...)` lorsque le cœur
    a besoin d'un type de homologue (peer kind) précoce, et `messaging.resolveOutboundSessionRoute(...)`
    pour l'identité de session et de fil native du provider.

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
  | Chemin d'importation | Objectif | Exportations clés | | --- | --- | --- | | `plugin-sdk/plugin-entry` | Assistant d'entrée de plugin canonique | `definePluginEntry` | | `plugin-sdk/core` | Ré-exportation parapluie héritée pour les définitions/constructeurs d'entrée de channel | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | Exportation du schéma de
  configuration racine | `OpenClawSchema` | | `plugin-sdk/provider-entry` | Assistant d'entrée pour fournisseur unique | `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | Définitions et constructeurs d'entrée de channel ciblés | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | Assistants partagés de
  l'assistant de configuration | Traducteur de configuration, invites de liste blanche, constructeurs de statut de configuration | | `plugin-sdk/setup-runtime` | Assistants d'exécution au moment de la configuration | `createSetupTranslator`, adaptateurs de correctif de configuration sûrs pour l'importation, assistants de note de recherche, `promptResolvedAllowFrom`, `splitSetupEntries`, proxies de
  configuration délégués | | `plugin-sdk/setup-adapter-runtime` | Alias d'adaptateur de configuration obsolète | Utilisez `plugin-sdk/setup-runtime` | | `plugin-sdk/setup-tools` | Assistants d'outillage de configuration | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` | | `plugin-sdk/account-core` | Assistants multi-comptes |
  Assistants de liste/config/action-gate de comptes | | `plugin-sdk/account-id` | Assistants d'identifiant de compte | `DEFAULT_ACCOUNT_ID`, normalisation de l'identifiant de compte | | `plugin-sdk/account-resolution` | Assistants de recherche de compte | Assistants de recherche de compte + valeurs par défaut | | `plugin-sdk/account-helpers` | Assistants de compte restreints | Assistants de
  liste/action de compte | | `plugin-sdk/channel-setup` | Adaptateurs de l'assistant de configuration | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, plus `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` | | `plugin-sdk/channel-pairing` | Primitives d'appariement DM |
  `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | Câblage du préfixe de réponse, de la frappe et de la livraison source | `createChannelReplyPipeline`, `resolveChannelSourceReplyDeliveryMode` | | `plugin-sdk/channel-config-helpers` | Fabriques d'adaptateurs de configuration et assistants d'accès DM | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`,
  `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` | | `plugin-sdk/channel-config-schema` | Constructeurs de schémas de configuration | Primitives de schéma de configuration de channel partagé et le constructeur générique uniquement | | `plugin-sdk/bundled-channel-config-schema` | Schémas de configuration regroupés | Plugins regroupés
  maintenus par OpenClaw uniquement ; les nouveaux plugins doivent définir des schémas locaux au plugin | | `plugin-sdk/channel-config-schema-legacy` | Schémas de configuration regroupés obsolètes | Alias de compatibilité uniquement ; utilisez `plugin-sdk/bundled-channel-config-schema` pour les plugins regroupés maintenus | | `plugin-sdk/telegram-command-config` | Assistants de configuration de
  commande Telegram | Normalisation du nom de commande, rognage de la description, validation des doublons/conflits | | `plugin-sdk/channel-policy` | Résolution de stratégie de groupe/DM | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | Assistants de cycle de vie du statut de compte et du brouillon de flux | `createAccountStatusSink`, assistants de finalisation de l'aperçu
  du brouillon | | `plugin-sdk/inbound-envelope` | Assistants d'enveloppe entrante | Assistants de constructeur de route et d'enveloppe partagés | | `plugin-sdk/inbound-reply-dispatch` | Assistants de réponse entrante | Assistants partagés d'enregistrement et de répartition | | `plugin-sdk/messaging-targets` | Chemin d'importation d'analyse de cible obsolète | Utilisez `plugin-sdk/channel-targets`
  pour les assistants d'analyse de cible générique, `plugin-sdk/channel-route` pour la comparaison de routes, et `messaging.targetResolver` / `messaging.resolveOutboundSessionRoute` appartenant au plugin pour la résolution de cible spécifique au fournisseur | | `plugin-sdk/outbound-media` | Assistants de média sortant | Chargement de média sortant partagé | | `plugin-sdk/outbound-send-deps` |
  Assistants de dépendance d'envoi sortant | Recherche légère de `resolveOutboundSendDep` sans importer l'exécution sortante complète | | `plugin-sdk/outbound-runtime` | Assistants d'exécution sortante | Assistants de livraison sortante, de délégué d'identité/envoi, de session, de formatage et de planification de charge utile | | `plugin-sdk/thread-bindings-runtime` | Assistants de liaison de fil
  | Assistants de cycle de vie et d'adaptateur de liaison de fil | | `plugin-sdk/agent-media-payload` | Assistants de charge utile de média hérité | Constructeur de charge utile de média d'agent pour les mises en page de champ héritées | | `plugin-sdk/channel-runtime` | Shim de compatibilité obsolète | Utilitaires d'exécution de channel hérités uniquement | | `plugin-sdk/channel-send-result` |
  Types de résultats d'envoi | Types de résultats de réponse | | `plugin-sdk/runtime-store` | Stockage persistant de plugin | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | Assistants d'exécution large | Assistants d'exécution/journalisation/sauvegarde/installation de plugin | | `plugin-sdk/runtime-env` | Assistants d'environnement d'exécution restreints | Assistants de
  journalisation/environnement d'exécution, de délai d'attente, de nouvelle tentative et de délai exponentiel | | `plugin-sdk/plugin-runtime` | Assistants partagés d'exécution de plugin | Assistants de commandes/hooks/http/interactifs de plugin | | `plugin-sdk/hook-runtime` | Assistants de pipeline de hook | Assistants partagés de pipeline de webhook/hook interne | | `plugin-sdk/lazy-runtime` |
  Assistants d'exécution différés | `createLazyRuntimeModule`, `createLazyRuntimeMethod`, `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`, `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Assistants de processus | Assistants d'exécution partagés | | `plugin-sdk/cli-runtime` | Assistants d'exécution CLI | Formatage de commandes, attentes, assistants de version | |
  `plugin-sdk/gateway-runtime` | Assistants Gateway | Client Gateway, assistant de démarrage prêt pour la boucle d'événements et assistants de correctif de statut de channel | | `plugin-sdk/config-runtime` | Shim de compatibilité de configuration obsolète | Préférez `config-contracts`, `plugin-config-runtime`, `runtime-config-snapshot` et `config-mutation` | | `plugin-sdk/telegram-command-config`
  | Assistants de commande Telegram | Assistants de validation de commande Telegram stables en repli lorsque la surface de contrat Telegram regroupée est indisponible | | `plugin-sdk/approval-runtime` | Assistants d'invite d'approbation | Charge utile d'approbation exec/plugin, assistants de profil/capacité d'approbation, assistants de routage/d'exécution d'approbation native, et formatage du
  chemin d'affichage d'approbation structuré | | `plugin-sdk/approval-auth-runtime` | Assistants d'authentification d'approbation | Résolution de l'approbateur, authentification d'action de même chat | | `plugin-sdk/approval-client-runtime` | Assistants client d'approbation | Assistants de profil/filtre d'approbation d'exécution native | | `plugin-sdk/approval-delivery-runtime` | Assistants de
  livraison d'approbation | Adaptateurs de capacité/livraison d'approbation native | | `plugin-sdk/approval-gateway-runtime` | Assistants de passerelle d'approbation | Assistant partagé de résolution de passerelle d'approbation | | `plugin-sdk/approval-handler-adapter-runtime` | Assistants d'adaptateur d'approbation | Assistants de chargement léger d'adaptateur d'approbation natif pour les points
  d'entrée de channel à chaud | | `plugin-sdk/approval-handler-runtime` | Assistants de gestionnaire d'approbation | Assistants d'exécution de gestionnaire d'approbation plus larges ; préférez les interfaces d'adaptateur/passerelle plus étroites lorsqu'elles suffisent | | `plugin-sdk/approval-native-runtime` | Assistants de cible d'approbation | Assistants de liaison de cible/compte d'approbation
  native | | `plugin-sdk/approval-reply-runtime` | Assistants de réponse d'approbation | Assistants de charge utile de réponse d'approbation exec/plugin | | `plugin-sdk/channel-runtime-context` | Assistants de contexte d'exécution de channel | Assistants génériques d'enregistrement/obtention/surveillance du contexte d'exécution de channel | | `plugin-sdk/security-runtime` | Assistants de sécurité
  | Assistants de confiance partagée, de blocage DM, de fichier/chemin borné racine, de contenu externe et de collection de secrets | | `plugin-sdk/ssrf-policy` | Assistants de stratégie SSRF | Assistants de liste blanche d'hôte et de stratégie de réseau privé | | `plugin-sdk/ssrf-runtime` | Assistants d'exécution SSRF | Répartiteur épinglé, récupération gardée, assistants de stratégie SSRF | |
  `plugin-sdk/system-event-runtime` | Assistants d'événement système | `enqueueSystemEvent`, `peekSystemEventEntries` | | `plugin-sdk/heartbeat-runtime` | Assistants de rythme cardiaque | Assistants de réveil, d'événement et de visibilité du rythme cardiaque | | `plugin-sdk/delivery-queue-runtime` | Assistants de file d'attente de livraison | `drainPendingDeliveries` | |
  `plugin-sdk/channel-activity-runtime` | Assistants d'activité de channel | `recordChannelActivity` | | `plugin-sdk/dedupe-runtime` | Assistants de déduplication | Caches de déduplication en mémoire | | `plugin-sdk/file-access-runtime` | Assistants d'accès aux fichiers | Assistants de chemin sécurisé pour fichier/média local | | `plugin-sdk/transport-ready-runtime` | Assistants de disponibilité
  du transport | `waitForTransportReady` | | `plugin-sdk/collection-runtime` | Assistants de cache borné | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | Assistants de blocage de diagnostic | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | Assistants de formatage d'erreur | `formatUncaughtError`, `isApprovalNotFoundError`, assistants de graphe d'erreur
  | | `plugin-sdk/fetch-runtime` | Assistants de récupération/proxy encapsulés | `resolveFetch`, assistants de proxy, assistants d'option EnvHttpProxyAgent | | `plugin-sdk/host-runtime` | Assistants de normalisation d'hôte | `normalizeHostname`, `normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | Assistants de nouvelle tentative | `RetryConfig`, `retryAsync`, exécuteurs de stratégie | |
  `plugin-sdk/allow-from` | Formatage de liste blanche et mappage d'entrée | `formatAllowFromLowercase`, `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | Assistants de blocage de commande et de surface de commande | `resolveControlCommandGate`, assistants d'autorisation de l'expéditeur, assistants de registre de commandes y compris le formatage dynamique du menu d'arguments | |
  `plugin-sdk/command-status` | Moteurs de statut/aide de commande | `buildCommandsMessage`, `buildCommandsMessagePaginated`, `buildHelpMessage` | | `plugin-sdk/secret-input` | Analyse d'entrée secrète | Assistants d'entrée secrète | | `plugin-sdk/webhook-ingress` | Assistants de requête webhook | Utilitaires de cible webhook | | `plugin-sdk/webhook-request-guards` | Assistants de garde de corps
  webhook | Assistants de lecture/limite du corps de la requête | | `plugin-sdk/reply-runtime` | Exécution de réponse partagée | Répartition entrante, rythme cardiaque, planificateur de réponse, découpage | | `plugin-sdk/reply-dispatch-runtime` | Assistants de répartition de réponse restreints | Finalisation, répartition de fournisseur et assistants d'étiquette de conversation | |
  `plugin-sdk/reply-history` | Assistants d'historique de réponse | `createChannelHistoryWindow` ; exportations de compatibilité d'assistant de carte obsolètes telles que `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry` et `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | Planification de référence de réponse | `createReplyReferencePlanner` | |
  `plugin-sdk/reply-chunking` | Assistants de découpage de réponse | Assistants de découpage de texte/markdown | | `plugin-sdk/session-store-runtime` | Assistants de magasin de session | Assistants de chemin de magasin + mis à jour à | | `plugin-sdk/state-paths` | Assistants de chemin d'état | Assistants de répertoire d'état et OAuth | | `plugin-sdk/routing` | Assistants de clé de routage/session
  | `resolveAgentRoute`, `buildAgentSessionKey`, `resolveDefaultAgentBoundAccountId`, assistants de normalisation de clé de session | | `plugin-sdk/status-helpers` | Assistants de statut de channel | Constructeurs de résumé de statut de channel/compte, valeurs par défaut d'état d'exécution, assistants de métadonnées de problème | | `plugin-sdk/target-resolver-runtime` | Assistants de résolveur de
  cible | Assistants partagés de résolveur de cible | | `plugin-sdk/string-normalization-runtime` | Assistants de normalisation de chaîne | Assistants de normalisation de slug/chaîne | | `plugin-sdk/request-url` | Assistants d'URL de requête | Extraire les URL de chaîne des entrées de type requête | | `plugin-sdk/run-command` | Assistants de commande minutée | Exécuteur de commande minutée avec
  stdout/stderr normalisés | | `plugin-sdk/param-readers` | Lecteurs de paramètres | Lecteurs de paramètres courants pour outil/CLI | | `plugin-sdk/tool-payload` | Extraction de charge utile d'outil | Extraire les charges utiles normalisées des objets de résultat d'outil | | `plugin-sdk/tool-send` | Extraction d'envoi d'outil | Extraire les champs de cible d'envoi canoniques des arguments d'outil
  | | `plugin-sdk/temp-path` | Assistants de chemin temporaire | Assistants partagés de chemin de téléchargement temporaire | | `plugin-sdk/logging-core` | Assistants de journalisation | Assistants de journal de sous-système et de rédaction | | `plugin-sdk/markdown-table-runtime` | Assistants de tableau Markdown | Assistants de mode de tableau Markdown | | `plugin-sdk/reply-payload` | Types de
  réponse de message | Types de charge utile de réponse | | `plugin-sdk/provider-setup` | Assistants de configuration de fournisseur local/auto-hébergé sélectionnés | Assistants de découverte/configuration de fournisseur auto-hébergé | | `plugin-sdk/self-hosted-provider-setup` | Assistants ciblés de configuration de fournisseur auto-hébergé compatible avec OpenAI | Mêmes assistants de
  découverte/configuration de fournisseur auto-hébergé | | `plugin-sdk/provider-auth-runtime` | Assistants d'authentification d'exécution de fournisseur | Assistants de résolution de clé API d'exécution | | `plugin-sdk/provider-auth-api-key` | Assistants de configuration de clé API de fournisseur | Assistants d'écriture de profil/onboarding de clé API | | `plugin-sdk/provider-auth-result` |
  Assistants de résultat d'authentification de fournisseur | Constructeur de résultat d'authentification OAuth standard | | `plugin-sdk/provider-selection-runtime` | Assistants de sélection de fournisseur | Sélection de fournisseur configuré ou automatique et fusion de configuration brute de fournisseur | | `plugin-sdk/provider-env-vars` | Assistants de variable d'environnement de fournisseur |
  Assistants de recherche de variable d'environnement d'authentification de fournisseur | | `plugin-sdk/provider-model-shared` | Assistants partagés de modèle/relecture de fournisseur | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, constructeurs partagés de stratégie de relecture, assistants de point de terminaison de fournisseur et assistants de normalisation
  d'identifiant de modèle | | `plugin-sdk/provider-catalog-shared` | Assistants partagés de catalogue de fournisseur | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `buildManifestModelProviderConfig`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | Correctifs d'intégration de fournisseur | Assistants de configuration
  d'intégration | | `plugin-sdk/provider-http` | Assistants HTTP de fournisseur | Assistants génériques de capacité HTTP/point de terminaison de fournisseur, y compris les assistants de formulaire multipart pour la transcription audio | | `plugin-sdk/provider-web-fetch` | Assistants de récupération web de fournisseur | Assistants d'inscription/cache de fournisseur de récupération web | |
  `plugin-sdk/provider-web-search-config-contract` | Assistants de configuration de recherche web de fournisseur | Assistants restreints de configuration/justificatif de recherche web pour les fournisseurs qui n'ont pas besoin du câblage d'activation de plugin | | `plugin-sdk/provider-web-search-contract` | Assistants de contrat de recherche web de fournisseur | Assistants restreints de contrat de
  configuration/justificatif de recherche web tels que `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig` et les définitions/obtenants de justificatif délimités | | `plugin-sdk/provider-web-search` | Assistants de recherche web de fournisseur | Assistants d'inscription/cache/d'exécution de fournisseur de recherche web | |
  `plugin-sdk/provider-tools` | Assistants de compatibilité d'outil/schéma de fournisseur | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, et nettoyage/diagnostics de schéma DeepSeek/Gemini/OpenAI | | `plugin-sdk/provider-usage` | Assistants d'utilisation de fournisseur | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage` et autres assistants d'utilisation de
  fournisseur | | `plugin-sdk/provider-stream` | Assistants de wrapper de flux de fournisseur | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, types de wrapper de flux et assistants de wrapper partagés Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot | | `plugin-sdk/provider-transport-runtime` | Assistants de
  transport de fournisseur | Assistants de transport de fournisseur natif tels que la récupération gardée, les transformations de messages de transport et les flux d'événements de transport inscriptibles | | `plugin-sdk/keyed-async-queue` | File d'attente asynchrone ordonnée | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | Assistants de média partagé | Assistants de
  récupération/transformation/stockage de média, sondage de dimension vidéo pris en charge par ffprobe et constructeurs de charge utile de média | | `plugin-sdk/media-generation-runtime` | Assistants partagés de génération de média | Assistants partagés de basculement, sélection de candidats et messagerie de modèle manquant pour la génération d'image/vidéo/musique | |
  `plugin-sdk/media-understanding` | Assistants de compréhension de média | Types de fournisseur de compréhension de média plus exportations d'assistants image/audio orientés fournisseur | | `plugin-sdk/text-runtime` | Exportation de compatibilité de texte large obsolète | Utilisez `string-coerce-runtime`, `text-chunking`, `text-utility-runtime` et `logging-core` | | `plugin-sdk/text-chunking` |
  Assistants de découpage de texte | Assistant de découpage de texte sortant | | `plugin-sdk/speech` | Assistants de synthèse vocale | Types de fournisseur de synthèse vocale plus assistants de directive, de registre, de validation orientés fournisseur et constructeur TTS compatible avec OpenAI | | `plugin-sdk/speech-core` | Cœur partagé de synthèse vocale | Types de fournisseur de synthèse
  vocale, registre, directives, normalisation | | `plugin-sdk/realtime-transcription` | Assistants de transcription en temps réel | Types de fournisseur, assistants de registre et assistant de session WebSocket partagé | | `plugin-sdk/realtime-voice` | Assistants vocaux en temps réel | Types de fournisseur, assistants de registre/résolution, assistants de session de pont, files d'attente partagées
  de retour d'agent, contrôle vocal en cours d'exécution, santé de transcription/événement, suppression d'écho et assistants de consultation rapide de contexte | | `plugin-sdk/image-generation` | Assistants de génération d'images | Types de fournisseur de génération d'images plus assistants d'URL de ressource/données d'image et le constructeur de fournisseur d'images compatible avec OpenAI | |
  `plugin-sdk/image-generation-core` | Cœur partagé de génération d'images | Types de génération d'images, basculement, authentification et assistants de registre | | `plugin-sdk/music-generation` | Assistants de génération de musique | Types de demande/résultat/fournisseur de génération de musique | | `plugin-sdk/music-generation-core` | Cœur partagé de génération de musique | Types de génération
  de musique, assistants de basculement, recherche de fournisseur et analyse de référence de modèle | | `plugin-sdk/video-generation` | Assistants de génération de vidéo | Types de demande/résultat/fournisseur de génération de vidéo | | `plugin-sdk/video-generation-core` | Cœur partagé de génération de vidéo | Types de génération de vidéo, assistants de basculement, recherche de fournisseur et
  analyse de référence de modèle | | `plugin-sdk/interactive-runtime` | Assistants de réponse interactive | Normalisation/réduction de charge utile de réponse interactive | | `plugin-sdk/channel-config-primitives` | Primitives de configuration de channel | Primitives de schéma de configuration de channel restreintes | | `plugin-sdk/channel-config-writes` | Assistants d'écriture de configuration de
  channel | Assistants d'autorisation d'écriture de configuration de channel | | `plugin-sdk/channel-plugin-common` | Prélude de channel partagé | Exportations de prélude de plugin de channel partagé | | `plugin-sdk/channel-status` | Assistants de statut de channel | Assistants partagés d'instantané/résumé de statut de channel | | `plugin-sdk/allowlist-config-edit` | Assistants de configuration de
  liste blanche | Assistants de modification/lecture de configuration de liste blanche | | `plugin-sdk/group-access` | Assistants d'accès de groupe | Assistants partagés de décision d'accès de groupe | | `plugin-sdk/direct-dm` | Assistants de DM direct | Assistants partagés d'authentification/garde de DM direct | | `plugin-sdk/extension-shared` | Assistants d'extension partagés | Primitives
  d'assistant de proxy ambiant et de channel passif/statut | | `plugin-sdk/webhook-targets` | Assistants de cible webhook | Assistants de registre de cible webhook et d'installation de route | | `plugin-sdk/webhook-path` | Alias de chemin webhook obsolète | Utilisez `plugin-sdk/webhook-ingress` | | `plugin-sdk/web-media` | Assistants de média web partagé | Assistants de chargement de média
  distant/local | | `plugin-sdk/zod` | Ré-exportation de compatibilité Zod obsolète | Importez `zod` directement depuis `zod` | | `plugin-sdk/memory-core` | Assistants de cœur de mémoire regroupés | Surface d'assistant de gestionnaire/config/fichier/CLI de mémoire regroupée | | `plugin-sdk/memory-core-engine-runtime` | Façade d'exécution du moteur de mémoire | Façade d'exécution d'index/recherche
  de mémoire | | `plugin-sdk/memory-core-host-engine-foundation` | Moteur de fondation d'hôte de mémoire | Exportations du moteur de fondation d'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-embeddings` | Moteur d'intégration d'hôte de mémoire | Contrats d'intégration de mémoire, accès au registre, fournisseur local et assistants génériques de lot/distant ; les fournisseurs distants
  concrets résident dans leurs plugins propriétaires | | `plugin-sdk/memory-core-host-engine-qmd` | Moteur QMD d'hôte de mémoire | Exportations du moteur QMD d'hôte de mémoire | | `plugin-sdk/memory-core-host-engine-storage` | Moteur de stockage d'hôte de mémoire | Exportations du moteur de stockage d'hôte de mémoire | | `plugin-sdk/memory-core-host-multimodal` | Assistants multimodaux d'hôte de
  mémoire | Assistants multimodaux d'hôte de mémoire | | `plugin-sdk/memory-core-host-query` | Assistants de requête d'hôte de mémoire | Assistants de requête d'hôte de mémoire | | `plugin-sdk/memory-core-host-secret` | Assistants de secret d'hôte de mémoire | Assistants de secret d'hôte de mémoire | | `plugin-sdk/memory-core-host-events` | Alias d'événement de mémoire obsolète | Utilisez
  `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | Assistants de statut d'hôte de mémoire | Assistants de statut d'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-cli` | Exécution CLI d'hôte de mémoire | Assistants d'exécution CLI d'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-core` | Exécution de base d'hôte de mémoire | Assistants d'exécution de
  base d'hôte de mémoire | | `plugin-sdk/memory-core-host-runtime-files` | Assistants de fichier/exécution d'hôte de mémoire | Assistants de fichier/exécution d'hôte de mémoire | | `plugin-sdk/memory-host-core` | Alias d'exécution de base d'hôte de mémoire | Alias neutre pour les assistants d'exécution de base d'hôte de mémoire | | `plugin-sdk/memory-host-events` | Alias de journal d'événements
  d'hôte de mémoire | Alias neutre pour les assistants de journal d'événements d'hôte de mémoire | | `plugin-sdk/memory-host-files` | Alias de fichier/exécution de mémoire obsolète | Utilisez `plugin-sdk/memory-core-host-runtime-files` | | `plugin-sdk/memory-host-markdown` | Assistants de markdown géré | Assistants partagés de markdown géré pour les plugins adjacents à la mémoire | |
  `plugin-sdk/memory-host-search` | Façade de recherche de mémoire active | Façade d'exécution différée du gestionnaire de recherche de mémoire active | | `plugin-sdk/memory-host-status` | Alias de statut d'hôte de mémoire obsolète | Utilisez `plugin-sdk/memory-core-host-status` | | `plugin-sdk/testing` | Utilitaires de test | Baril de compatibilité obsolète local au dépôt ; utilisez des
  sous-chemins de test locaux au dépôt ciblés tels que `plugin-sdk/plugin-test-runtime`, `plugin-sdk/channel-test-helpers`, `plugin-sdk/channel-target-testing`, `plugin-sdk/test-env` et `plugin-sdk/test-fixtures` |
</Accordion>

Ce tableau correspond volontairement au sous-ensemble commun de migration, et non à la surface complète du SDK. L'inventaire du point d'entrée du compilateur se trouve dans `scripts/lib/plugin-sdk-entrypoints.json` ; les exportations du package sont générées à partir du sous-ensemble public.

Les interfaces d'assistance (seams) réservées pour les plugins groupés (bundled) ont été retirées de la carte d'exportation publique du SDK, à l'exception des façades de compatibilité explicitement documentées, telles que le shim obsolète `plugin-sdk/discord` conservé pour le package `@openclaw/discord@2026.3.13` publié. Les assistants spécifiques au propriétaire se trouvent dans le package du plugin propriétaire ; le comportement partagé de l'hôte doit transiter par des contrats SDK génériques tels que `plugin-sdk/gateway-runtime`, `plugin-sdk/security-runtime` et `plugin-sdk/plugin-config-runtime`.

Utilisez l'importation la plus spécifique correspondant à la tâche. Si vous ne trouvez pas d'exportation, vérifiez la source à `src/plugin-sdk/` ou demandez aux mainteneurs quel contrat générique devrait en être propriétaire.

## Obsolèscences actives

Obsolèscences plus ciblées qui s'appliquent à l'ensemble du SDK de plugin, au contrat de provider, à la surface d'exécution et au manifeste. Chacune fonctionne encore aujourd'hui mais sera supprimée dans une future version majeure. L'entrée sous chaque élément fait correspondre l'ancienne API à son remplacement canonique.

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

  <Accordion title="Assistants de contrôle des mentions → resolveInboundMentionDecision">
    **Ancien** : `resolveInboundMentionRequirement({ facts, policy })` et
    `shouldDropInboundForMention(...)` de
    `openclaw/plugin-sdk/channel-inbound` ou
    `openclaw/plugin-sdk/channel-mention-gating`.

    **Nouveau** : `resolveInboundMentionDecision({ facts, policy })`SlackDiscordMatrix - renvoie un
    objet de décision unique au lieu de deux appels séparés.

    Les plugins de canal en aval (Slack, Discord, Matrix, MS Teams) ont déjà
    effectué la transition.

  </Accordion>

  <Accordion title="Shim d'exécution de canal et assistants d'actions de canal">
    `openclaw/plugin-sdk/channel-runtime` est un shim de compatibilité pour les anciens
    plugins de canal. Ne l'importez pas dans le nouveau code ; utilisez
    `openclaw/plugin-sdk/channel-runtime-context` pour enregistrer les objets
    d'exécution.

    Les assistants `channelActions*` dans `openclaw/plugin-sdk/channel-actions` sont
    obsolètes, tout comme les exportations de canal « actions » brutes. Exposez les capacités
    via la surface sémantique `presentation` à la place - les plugins de canal
    déclarent ce qu'ils rendent (cartes, boutons, sélecteurs) plutôt que les noms d'actions bruts
    qu'ils acceptent.

  </Accordion>

  <Accordion title="Assistant tool() du fournisseur de recherche Web → createTool() sur le plugin">
    **Ancien** : fabrique `tool()` de `openclaw/plugin-sdk/provider-web-search`.

    **Nouveau** : implémentez `createTool(...)`OpenClaw directement sur le plugin fournisseur.
    OpenClaw n'a plus besoin de l'assistant du SDK pour enregistrer le wrapper de l'outil.

  </Accordion>

  <Accordion title="Envelopes de channel en texte brut → BodyForAgent">
    **Ancien** : `formatInboundEnvelope(...)` (et
    `ChannelMessageForAgent.channelEnvelope`) pour construire une enveloppe de
    prompt en texte brut à plat à partir des messages channel entrants.

    **Nouveau** : `BodyForAgent` plus des blocs de contexte utilisateur structurés. Les plugins de
    channel attachent les métadonnées de routage (fil, sujet, réponse à, réactions) en
    tant que champs typés au lieu de les concaténer dans une chaîne de prompt. L'assistant
    `formatAgentEnvelope(...)` est toujours pris en charge pour les envelopes synthétisées
    orientées assistant, mais les enveloppes en texte brut entrantes sont en
    voie de disparition.

    Zones affectées : `inbound_claim`, `message_received`, et tout plugin de
    channel personnalisé qui post-traitait le texte `channelEnvelope`.

  </Accordion>

  <Accordion title="Hook deactivate → gateway_stop">
    **Ancien** : `api.on("deactivate", handler)`.

    **Nouveau** : `api.on("gateway_stop", handler)`. L'événement et le contexte sont le
    même contrat de nettoyage à l'arrêt ; seul le nom du hook change.

    ```typescript
    // Before
    api.on("deactivate", async (event, ctx) => {
      await stopPluginService(ctx);
    });

    // After
    api.on("gateway_stop", async (event, ctx) => {
      await stopPluginService(ctx);
    });
    ```

    `deactivate` reste câblé en tant qu'alias de compatibilité déprécié jusqu'après le
    2026-08-16.

  </Accordion>

  <Accordion title="Types de découverte de provider → types de catalogue de provider">
    Quatre alias de type de découverte sont maintenant de fines enveloppes sur les
    types de l'ère du catalogue :

    | Ancien alias                 | Nouveau type                  |
    | ------------------------- | ------------------------- |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    Plus le sac statique hérité `ProviderCapabilities` - les plugins de
    provider devraient utiliser des hooks de provider explicites tels que `buildReplayPolicy`,
    `normalizeToolSchemas` et `wrapStreamFn` plutôt qu'un objet statique.

  </Accordion>

  <Accordion title="Thinking policy hooks → resolveThinkingProfile">
    **Ancien** (trois hooks distincts sur `ProviderThinkingPolicy`) :
    `isBinaryThinking(ctx)`, `supportsXHighThinking(ctx)` et
    `resolveDefaultThinkingLevel(ctx)`.

    **Nouveau** : un seul `resolveThinkingProfile(ctx)` qui renvoie un
    `ProviderThinkingProfile` avec le `id` canonique, le `label` facultatif et
    la liste des niveaux classés. OpenClaw rétrograde automatiquement les valeurs stockées obsolètes par
    rang de profil.

    Implémentez un seul hook au lieu de trois. Les hooks hérités continuent de fonctionner pendant
    la période d'obsolescence mais ne sont pas composés avec le résultat du profil.

  </Accordion>

  <Accordion title="External OAuth provider fallback → contracts.externalAuthProviders">
    **Ancien** : implémentation de `resolveExternalOAuthProfiles(...)` sans
    déclarer le fournisseur dans le manifeste du plugin.

    **Nouveau** : déclarez `contracts.externalAuthProviders` dans le manifeste du plugin
    **et** implémentez `resolveExternalAuthProfiles(...)`. L'ancien chemin de "fallback
    d'auth" émet un avertissement lors de l'exécution et sera supprimé.

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
    sur le manifeste. Cela consolide les métadonnées d'environnement de configuration/état en un
    seul endroit et évite de démarrer le runtime du plugin juste pour répondre aux recherches de variables d'environnement.

    `providerAuthEnvVars` reste pris en charge via un adaptateur de compatibilité
    jusqu'à la fin de la période d'obsolescence.

  </Accordion>

  <Accordion title="Inscription du plugin de mémoire → registerMemoryCapability">
    **Ancien** : trois appels distincts -
    `api.registerMemoryPromptSection(...)`,
    `api.registerMemoryFlushPlan(...)`,
    `api.registerMemoryRuntime(...)`API.

    **Nouveau** : un appel sur l'API de l'état de mémoire (memory-state) -
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`.

    Mêmes emplacements (slots), appel d'inscription unique. Les assistants de mémoire additifs
    (`registerMemoryPromptSupplement`, `registerMemoryCorpusSupplement`,
    `registerMemoryEmbeddingProvider`) ne sont pas affectés.

  </Accordion>

  <Accordion title="Types de messages de session de sous-agent renommés">
    Deux alias de type hérités toujours exportés depuis `src/plugins/runtime/types.ts` :

    | Ancien                           | Nouveau                             |
    | ----------------------------- | ------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    La méthode d'exécution `readSession` est obsolète et remplacée par
    `getSessionMessages`. Même signature ; l'ancienne méthode appelle la
    nouvelle.

  </Accordion>

  <Accordion title="runtime.tasks.flow → runtime.tasks.managedFlows">
    **Ancien** : `runtime.tasks.flow` (singulier) renvoyait un accesseur de flux de tâches en direct.

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

<Accordion title="Fabriques d'extension intégrées → middleware des résultats d'outil d'agent">
  Traité dans la section « Comment migrer → Migrer les extensions de résultats d'outil Pi vers le middleware » ci-dessus. Inclus ici pour exhaustivité : le chemin `api.registerEmbeddedExtensionFactory(...)` spécifique à Pi, supprimé, est remplacé par `api.registerAgentToolResultMiddleware(...)` avec une liste d'exécution explicite dans `contracts.agentToolResultMiddleware`.
</Accordion>

  <Accordion title="OpenClawSchemaType alias → OpenClawConfig">
    `OpenClawSchemaType` réexporté depuis `openclaw/plugin-sdk` est maintenant un
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
  Les abandons au niveau de l'extension (à l'intérieur des plugins channel/provider groupés sous `extensions/`) sont suivis dans leurs propres `api.ts` et `runtime-api.ts` barrels. Ils n'affectent pas les contrats des plugins tiers et ne sont pas répertoriés ici. Si vous consommez directement le barrel local d'un plugin groupé, lisez les commentaires d'abandon dans ce barrel avant la mise à
  niveau.
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

Il s'agit d'une solution de contournement temporaire, et non d'une solution permanente.

## Connexes

- [Getting Started](/fr/plugins/building-plugins) - créer votre premier plugin
- [Aperçu du SDK](/fr/plugins/sdk-overview) - référence complète des importations de sous-chemins
- [Plugins de channel](/fr/plugins/sdk-channel-plugins) - créer des plugins de channel
- [Plugins de provider](/fr/plugins/sdk-provider-plugins) - créer des plugins de provider
- [Fonctionnement interne des plugins](/fr/plugins/architecture) - approfondissement de l'architecture
- [Manifeste du plugin](/fr/plugins/manifest) - référence du schéma de manifeste
