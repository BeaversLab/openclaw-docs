---
summary: "Plugin hooks : intercept agent, tool, message, session, et événements de cycle de vie Gateway"
title: "Plugin hooks"
read_when:
  - You are building a plugin that needs before_tool_call, before_agent_reply, message hooks, or lifecycle hooks
  - You need to block, rewrite, or require approval for tool calls from a plugin
  - You are deciding between internal hooks and plugin hooks
---

Les hooks de plugin sont des points d'extension en processus pour les plugins OpenClaw. Utilisez-les lorsqu'un plugin a besoin d'inspecter ou de modifier les exécutions d'agent, les appels d'outils, le flux de messages, le cycle de vie de la session, le routage des sous-agents, les installations ou le démarrage du Gateway.

Utilisez plutôt les [hooks internes](/fr/automation/hooks) lorsque vous souhaitez un petit script `HOOK.md` installé par l'opérateur pour les événements de commande et de Gateway tels que `/new`, `/reset`, `/stop`, `agent:bootstrap` ou `gateway:startup`.

## Quick start

Enregistrez les hooks de plugin typés avec `api.on(...)` depuis le point d'entrée de votre plugin :

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "tool-preflight",
  name: "Tool Preflight",
  register(api) {
    api.on(
      "before_tool_call",
      async (event) => {
        if (event.toolName !== "web_search") {
          return;
        }

        return {
          requireApproval: {
            title: "Run web search",
            description: `Allow search query: ${String(event.params.query ?? "")}`,
            severity: "info",
            timeoutMs: 60_000,
            timeoutBehavior: "deny",
          },
        };
      },
      { priority: 50 },
    );
  },
});
```

Les gestionnaires de hooks s'exécutent séquentiellement par `priority` décroissant. Les hooks de même priorité
conservent l'ordre d'enregistrement.

`api.on(name, handler, opts?)` accepte :

- `priority` - ordre d'exécution des gestionnaires (le plus élevé s'exécute en premier).
- `timeoutMs` - budget optionnel par hook. Lorsqu'il est défini, le lanceur de hooks interrompt ce
  gestionnaire après l'expiration du budget et passe au suivant, au lieu de
  permettre à une configuration lente ou à un travail de rappel de consommer le délai d'expiration du model
  configuré par l'appelant. Omettez-le pour utiliser le délai d'expiration d'observation/décision par défaut que le
  lanceur de hooks applique de manière générique.

Les opérateurs peuvent également définir des budgets de hooks sans modifier le code du plugin :

```json
{
  "plugins": {
    "entries": {
      "my-plugin": {
        "hooks": {
          "timeoutMs": 30000,
          "timeouts": {
            "before_prompt_build": 90000,
            "agent_end": 60000
          }
        }
      }
    }
  }
}
```

`hooks.timeouts.<hookName>` remplace `hooks.timeoutMs`, qui remplace la valeur
`api.on(..., { timeoutMs })` définie par le plugin. Chaque valeur configurée doit
être un entier positif ne dépassant pas 600 000 millisecondes. Préférez les remplacements
par hook pour les hooks connus comme étant lents, afin qu'un seul plugin n'obtienne pas un budget plus long
tout le temps.

Chaque hook reçoit `event.context.pluginConfig`, la configuration résolue pour le
plugin qui a enregistré ce gestionnaire. Utilisez-la pour les décisions de hook qui nécessitent
les options actuelles du plugin ; OpenClaw l'injecte pour chaque gestionnaire sans modifier l'
objet d'événement partagé vu par les autres plugins.

## Hook catalog

Les hooks sont regroupés par la surface qu'ils étendent. Les noms en **gras** acceptent un
résultat de décision (bloquer, annuler, remplacer ou exiger une approbation) ; tous les autres sont
d'observation uniquement.

**Agent turn**

- `before_model_resolve` - remplacer le provider ou le model avant le chargement des messages de session
- `agent_turn_prepare` - consommer les injections de tour de plugin en file d'attente et ajouter du contexte de même tour avant les hooks de prompt
- `before_prompt_build` - ajouter du contexte dynamique ou du texte de système de prompt avant l'appel au model
- `before_agent_start` - phase combinée uniquement pour compatibilité ; préférez les deux hooks ci-dessus
- **`before_agent_run`** - inspecter le prompt final et les messages de session avant la soumission au model et bloquer facultativement l'exécution
- **`before_agent_reply`** - court-circuiter le tour du model avec une réponse synthétique ou du silence
- **`before_agent_finalize`** - inspecter la réponse finale naturelle et demander un passage supplémentaire du model
- `agent_end` - observer les messages finaux, l'état de succès et la durée d'exécution
- `heartbeat_prompt_contribution` - ajouter un contexte de battement de cœur uniquement pour les plugins de surveillance en arrière-plan et de cycle de vie

**Observation de la conversation**

- `model_call_started` / `model_call_ended` - observer les métadonnées de l'appel provider/model nettoyées, la minutage, le résultat et les hachages d'ID de demande bornés sans le contenu du prompt ou de la réponse
- `llm_input` - observer l'entrée du provider (system prompt, prompt, historique)
- `llm_output` - observer la sortie du provider

**Outils**

- **`before_tool_call`** - réécrire les paramètres du tool, bloquer l'exécution ou exiger une approbation
- `after_tool_call` - observer les résultats du tool, les erreurs et la durée
- **`tool_result_persist`** - réécrire le message de l'assistant produit à partir d'un résultat de tool
- **`before_message_write`** - inspecter ou bloquer une écriture de message en cours (rare)

**Messages et livraison**

- **`inbound_claim`** - réclamer un message entrant avant le routage de l'agent (réponses synthétiques)
- `message_received` - observer le contenu entrant, l'expéditeur, le fil et les métadonnées
- **`message_sending`** - réécrire le contenu sortant ou annuler la livraison
- `message_sent` - observer le succès ou l'échec de la livraison sortante
- **`before_dispatch`** - inspecter ou réécrire une expédition sortante avant le transfert vers le channel
- **`reply_dispatch`** - participer au pipeline final de distribution des réponses

**Sessions et compactage**

- `session_start` / `session_end` - suivre les limites du cycle de vie de la session. Le `reason` de l'événement est l'un des `new`, `reset`, `idle`, `daily`, `compaction`, `deleted`, `shutdown`, `restart` ou `unknown`. Les valeurs `shutdown` et `restart` se déclenchent depuis le finaliseur d'arrêt de la passerelle lorsque le processus est arrêté ou redémarré alors que des sessions sont toujours actives, afin que les plugins en aval (tels que les magasins de mémoire ou de transcriptions) puissent finaliser les lignes fantômes qui resteraient sinon dans un état ouvert après les redémarrages. Le finaliseur est borné afin qu'un plugin lent ne puisse pas bloquer SIGTERM/SIGINT.
- `before_compaction` / `after_compaction` - observer ou annoter les cycles de compactage
- `before_reset` - observer les événements de réinitialisation de session (`/reset`, réinitialisations programmatiques)

**Sous-agents**

- `subagent_spawning` / `subagent_delivery_target` / `subagent_spawned` / `subagent_ended` - coordonner le routage des sous-agents et la livraison des achèvements

**Cycle de vie**

- `gateway_start` / `gateway_stop` - démarrer ou arrêter les services détenus par le plugin avec le Gateway
- `cron_changed` - observer les modifications du cycle de vie des cron détenus par la passerelle (ajoutés, mis à jour, supprimés, démarrés, terminés, planifiés)
- **`before_install`** - inspecter les analyses d'installation de compétences ou de plugins et bloquer éventuellement

## Politique d'appel d'outil

`before_tool_call` reçoit :

- `event.toolName`
- `event.params`
- optionnel `event.derivedPaths`, contenant des indices de chemin cible dérivés de l'hôte au mieux pour des enveloppes d'outil connues telles que `apply_patch` ; lorsqu'ils sont présents, ces chemins peuvent être incomplets ou surestimer ce que l'outil touchera réellement (par exemple, avec des entrées malformées ou partielles)
- optionnel `event.runId`
- optionnel `event.toolCallId`
- champs de contexte tels que `ctx.agentId`, `ctx.sessionKey`, `ctx.sessionId`,
  `ctx.runId`, `ctx.jobId` (défini sur les exécutions pilotées par cron) et le diagnostic `ctx.trace`

Il peut retourner :

```typescript
type BeforeToolCallResult = {
  params?: Record<string, unknown>;
  block?: boolean;
  blockReason?: string;
  requireApproval?: {
    title: string;
    description: string;
    severity?: "info" | "warning" | "critical";
    timeoutMs?: number;
    timeoutBehavior?: "allow" | "deny";
    pluginId?: string;
    onResolution?: (decision: "allow-once" | "allow-always" | "deny" | "timeout" | "cancelled") => Promise<void> | void;
  };
};
```

Règles :

- `block: true` est terminal et ignore les gestionnaires de moindre priorité.
- `block: false` est traité comme l'absence de décision.
- `params` réécrit les paramètres de l'outil pour l'exécution.
- `requireApproval` met en pause l'exécution de l'agent et demande à l'utilisateur via les approbations de plugin. La commande `/approve` peut approuver à la fois les exécutions et les approbations de plugin.
- Un `block: true` de priorité inférieure peut toujours bloquer après qu'un hook de priorité supérieur a demandé une approbation.
- `onResolution` reçoit la décision d'approbation résolue - `allow-once`,
  `allow-always`, `deny`, `timeout`, ou `cancelled`.

Les plugins groupés qui nécessitent une stratégie au niveau de l'hôte peuvent enregistrer des stratégies d'outil de confiance avec `api.registerTrustedToolPolicy(...)`. Celles-ci s'exécutent avant les hooks `before_tool_call` ordinaires et avant les décisions des plugins externes. Utilisez-les uniquement pour les portes de confiance de l'hôte telles que la stratégie de l'espace de travail, l'application du budget ou la sécurité du flux de travail réservé. Les plugins externes doivent utiliser les hooks `before_tool_call` normaux.

### Persistance des résultats d'outil

Les résultats des outils peuvent inclure des `details` structurés pour le rendu de l'interface utilisateur, les diagnostics, le routage des médias ou les métadonnées propriétaires du plugin. Traitez `details` comme des métadonnées d'exécution, et non comme du contenu d'invite :

- OpenClaw supprime OpenClaw`toolResult.details` avant la relecture par le fournisseur et la saisie de compactage afin que les métadonnées ne deviennent pas un contexte de model.
- Les entrées de session persistées ne conservent que des `details` délimitées. Les détails volumineux sont remplacés par un résumé compact et `persistedDetailsTruncated: true`.
- `tool_result_persist` et `before_message_write` s'exécutent avant la limite finale de persistance. Les hooks doivent tout de même garder les `details` renvoyées petites et éviter de placer du texte pertinent pour le prompt uniquement dans `details` ; placez la sortie de l'outil visible par le model dans `content`.

## Hooks de prompt et de model

Utilisez les hooks spécifiques à la phase pour les nouveaux plugins :

- `before_model_resolve` : reçoit uniquement le prompt actuel et les métadonnées des pièces jointes. Renvoyez `providerOverride` ou `modelOverride`.
- `agent_turn_prepare` : reçoit le prompt actuel, les messages de session préparés et toutes les injections mises en file d'attente exactement une fois et drainées pour cette session. Renvoyez `prependContext` ou `appendContext`.
- `before_prompt_build` : reçoit le prompt actuel et les messages de session. Renvoyez `prependContext`, `appendContext`, `systemPrompt`, `prependSystemContext` ou `appendSystemContext`.
- `heartbeat_prompt_contribution` : s'exécute uniquement pour les tours de pulsation (heartbeat) et renvoie `prependContext` ou `appendContext`. Il est destiné aux moniteurs d'arrière-plan qui doivent résumer l'état actuel sans modifier les tours initiés par l'utilisateur.

`before_agent_start` reste pour des raisons de compatibilité. Préférez les hooks explicites ci-dessus afin que votre plugin ne dépende pas d'une phase combinée héritée.

`before_agent_run` s'exécute après la construction du prompt et avant toute entrée de modèle, y compris le chargement d'images local au prompt et l'observation `llm_input`. Il reçoit l'entrée utilisateur actuelle sous forme de `prompt`, ainsi que l'historique de session chargé dans `messages` et le prompt système actif. Retournez `{ outcome: "block", reason, message? }` pour arrêter l'exécution avant que le modèle ne puisse lire le prompt. `reason` est interne ; `message` est le remplacement orienté utilisateur. Les seuls résultats pris en charge sont `pass` et `block` ; les formes de décision non prises en charge échouent de manière fermée.

Lorsqu'une exécution est bloquée, OpenClaw ne stocke que le texte de remplacement dans `message.content`, ainsi que les métadonnées de bloc non sensibles telles que l'identifiant du plugin de blocage et l'horodatage. Le texte utilisateur d'origine n'est pas conservé dans la transcription ou le contexte futur. Les motifs de blocage internes sont traités comme sensibles et exclus des charges utiles de transcription, d'historique, de diffusion, de journalisation et de diagnostic. L'observabilité doit utiliser des champs assainis tels que l'identifiant du bloqueur, le résultat, l'horodatage ou une catégorie sûre.

`before_agent_start` et `agent_end` incluent `event.runId` lorsque OpenClaw peut identifier l'exécution active. La même valeur est également disponible sur `ctx.runId`. Les exécutions pilotées par Cron exposent également `ctx.jobId` (l'identifiant de la tâche Cron d'origine), afin que les hooks de plugin puissent limiter les métriques, les effets secondaires ou l'état à une tâche planifiée spécifique.

Pour les exécutions provenant d'un canal, `ctx.messageProvider` est la surface du fournisseur telle que `discord` ou `telegram`, tandis que `ctx.channelId` est l'identifiant de la cible de conversation lorsque OpenClaw peut en dériver un à partir de la clé de session ou des métadonnées de livraison.

`agent_end` est un hook d'observation qui s'exécute en mode fire-and-forget après le tour. Le lanceur de hooks applique un délai d'attente de 30 secondes pour qu'un plugin bloqué ou un point de terminaison d'intégration ne puisse pas laisser la promesse du hook en attente indéfiniment. Un délai d'attente est enregistré et OpenClaw continue ; il n'annule pas le travail réseau appartenant au plugin à moins que le plugin n'utilise également son propre signal d'abandon.

Utilisez `model_call_started` et `model_call_ended` pour la télémétrie des appels au fournisseur qui ne doit pas recevoir de prompts bruts, d'historique, de réponses, d'en-têtes, de corps de requête ou d'ID de requête fournisseur. Ces hooks incluent des métadonnées stables telles que `runId`, `callId`, `provider`, `model`, optionnel `api`/`transport`, terminal `durationMs`/`outcome`, et `upstreamRequestIdHash` lorsque OpenClaw peut dériver un hachage d'ID de requête fournisseur borné.

`before_agent_finalize` ne s'exécute que lorsqu'un harnais est sur le point d'accepter une réponse finale naturelle de l'assistant. Ce n'est pas le chemin d'annulation `/stop` et ne s'exécute pas lorsque l'utilisateur abandonne un tour. Retournez `{ action: "revise", reason }` pour demander à l'harnais un passage de modèle supplémentaire avant la finalisation, `{ action: "finalize", reason? }` pour forcer la finalisation, ou omettez un résultat pour continuer. Les hooks natifs Codex `Stop` sont relayés vers ce hook en tant que décisions OpenClaw `before_agent_finalize`.

Lors du retour de `action: "revise"`, les plugins peuvent inclure des métadonnées `retry` pour rendre le passage de modèle supplémentaire borné et sécurisé pour la relecture :

```typescript
type BeforeAgentFinalizeRetry = {
  instruction: string;
  idempotencyKey?: string;
  maxAttempts?: number;
};
```

`instruction` est ajouté à la raison de révision envoyée à l'harnais. `idempotencyKey` permet à l'hôte de compter les nouvelles tentatives pour la même requête de plugin à travers des décisions de finalisation équivalentes, et `maxAttempts` plafonne le nombre de passages supplémentaires que l'hôte autorisera avant de continuer avec la réponse finale naturelle.

Les plugins non fournis (bundled) qui nécessitent des hooks de conversation bruts (`before_model_resolve`,
`before_agent_reply`, `llm_input`, `llm_output`, `before_agent_finalize`,
`agent_end`, ou `before_agent_run`) doivent définir :

```json
{
  "plugins": {
    "entries": {
      "my-plugin": {
        "hooks": {
          "allowConversationAccess": true
        }
      }
    }
  }
}
```

Les hooks de modification de prompt et les injections durables au tour suivant peuvent être désactivés pour chaque plugin
avec `plugins.entries.<id>.hooks.allowPromptInjection=false`.

### Extensions de session et injections au tour suivant

Les plugins de workflow peuvent conserver un petit état de session compatible JSON avec
`api.registerSessionExtension(...)` et le mettre à jour via la méthode Gateway
`sessions.pluginPatch`. Les lignes de session projettent l'état d'extension enregistré
via `pluginExtensions`, permettant à l'interface de contrôle et autres clients d'afficher
le statut possédé par le plugin sans connaître les internes du plugin.

Utilisez `api.enqueueNextTurnInjection(...)` lorsqu'un plugin a besoin d'un contexte durable pour
atteindre exactement une fois le prochain tour de model. OpenClaw vide les injections en file d'attente avant les hooks
de prompt, ignore les injections expirées et déduplique par `idempotencyKey`
par plugin. C'est le bon point de couture pour les reprises d'approbation, les résumés de stratégie,
les deltas de moniteur en arrière-plan et les continuations de commande qui doivent être visibles par
le model au prochain tour mais ne doivent pas devenir du texte de prompt système permanent.

La sémantique de nettoyage fait partie du contrat. Les rappels de nettoyage des extensions de session
et du cycle de vie d'exécution reçoivent `reset`, `delete`, `disable` ou
`restart`. L'hôte supprime l'état persistant de l'extension de session du plugin propriétaire
et les injections en attente au tour suivant pour réinitialisation/suppression/désactivation ; le redémarrage conserve
l'état de session durable tandis que les rappels de nettoyage permettent aux plugins de libérer des tâches
de planificateur, le contexte d'exécution et d'autres ressources hors bande pour l'ancienne génération
d'exécution.

## Hooks de message

Utilisez les hooks de message pour le routage au niveau du channel et la stratégie de livraison :

- `message_received` : observer le contenu entrant, l'expéditeur, `threadId`, `messageId`,
  `senderId`, la corrélation facultative exécution/session et les métadonnées.
- `message_sending` : réécrire `content` ou retourner `{ cancel: true }`.
- `message_sent` : observer le succès ou l'échec final.

Pour les réponses TTS audio uniquement, `content` peut contenir la transcription parlée masquée même lorsque la charge utile du canal ne contient aucun texte/légende visible. La réécriture de ce `content` met à jour uniquement la transcription visible par le hook ; elle n'est pas rendue sous forme de légende multimédia.

Les contextes de hooks de message exposent des champs de corrélation stables lorsqu'ils sont disponibles : `ctx.sessionKey`, `ctx.runId`, `ctx.messageId`, `ctx.senderId`, `ctx.trace`, `ctx.traceId`, `ctx.spanId`, `ctx.parentSpanId` et `ctx.callDepth`. Privilégiez ces champs de première classe avant de lire les métadonnées héritées.

Privilégiez les champs typés `threadId` et `replyToId` avant d'utiliser les métadonnées spécifiques au canal.

Règles de décision :

- `message_sending` avec `cancel: true` est terminal.
- `message_sending` avec `cancel: false` est traité comme une absence de décision.
- Le `content` réécrit continue vers les hooks de priorité inférieure, sauf si un hook ultérieur annule la livraison.
- `message_sending` peut renvoyer `cancelReason` et `metadata` borné lors d'une annulation. Les nouvelles API de cycle de vie des messages exposent cela comme un résultat de livraison supprimé avec la raison `cancelled_by_message_sending_hook` ; la livraison directe héritée continue de renvoyer un tableau de résultats vide pour la compatibilité.
- `message_sent` est en observation uniquement. Les échecs du gestionnaire sont enregistrés et ne modifient pas le résultat de la livraison.

## Hooks d'installation

`before_install` s'exécute après l'analyse intégrée des installations de compétences et de plugins. Renvoyez des résultats supplémentaires ou `{ block: true, blockReason }` pour arrêter l'installation.

`block: true` est terminal. `block: false` est traité comme une absence de décision.

## Cycle de vie du Gateway

Utilisez `gateway_start` pour les services de plugin qui nécessitent un état détenu par le Gateway. Le contexte expose `ctx.config`, `ctx.workspaceDir` et `ctx.getCron?.()` pour l'inspection et la mise à jour des crons. Utilisez `gateway_stop` pour nettoyer les ressources de longue durée.

Ne comptez pas sur le hook interne `gateway:startup` pour les services d'exécution détenus par le plugin.

`cron_changed` se déclenche pour les événements de cycle de vie des crons détenus par le OpenClaw avec une charge utile d'événement typée couvrant `added`, `updated`, `removed`, `started`, `finished` et `scheduled` raisons. L'événement transporte un instantané `PluginHookGatewayCronJob` (y compris `state.nextRunAtMs`, `state.lastRunStatus` et `state.lastError` lorsque présents) plus un `PluginHookGatewayCronDeliveryStatus` de `not-requested` | `delivered` | `not-delivered` | `unknown`. Les événements de suppression transportent toujours l'instantané de la tâche supprimée afin que les planificateurs externes puissent réconcilier l'état. Utilisez `ctx.getCron?.()` et `ctx.config` du contexte d'exécution lors de la synchronisation des planificateurs de réveil externes, et gardez OpenClaw comme source de vérité pour les vérifications d'échéance et l'exécution.

## Prochaines dépréciations

Quelques surfaces adjacentes aux crochets (hooks) sont dépréciées mais toujours prises en charge. Migrez avant la prochaine version majeure :

- **Enveloppes de canal en texte brut** dans les gestionnaires `inbound_claim` et `message_received`. Lisez `BodyForAgent` et les blocs de contexte utilisateur structurés au lieu d'analyser le texte d'enveloppe plat. Voir [Plaintext channel envelopes → BodyForAgent](/fr/plugins/sdk-migration#active-deprecations).
- **`before_agent_start`** reste pour la compatibilité. Les nouveaux plugins doivent utiliser `before_model_resolve` et `before_prompt_build` au lieu de la phase combinée.
- **`onResolution` dans `before_tool_call`** utilise désormais l'union typée
  `PluginApprovalResolution` (`allow-once` / `allow-always` / `deny` /
  `timeout` / `cancelled`) au lieu d'un `string` de forme libre.

Pour la liste complète - enregistrement des capacités mémoire, profil de réflexion du fournisseur, fournisseurs d'authentification externes, types de découverte de fournisseur, accès au runtime de tâche et le renommage `command-auth` → `command-status` - voir
[Plugin SDK migration → Active deprecations](/fr/plugins/sdk-migration#active-deprecations).

## Connexes

- [Plugin SDK migration](/fr/plugins/sdk-migration) - dépréciations actuelles et calendrier de suppression
- [Building plugins](/fr/plugins/building-plugins)
- [Plugin SDK overview](/fr/plugins/sdk-overview)
- [Plugin entry points](/fr/plugins/sdk-entrypoints)
- [Internal hooks](/fr/automation/hooks)
- [Plugin architecture internals](/fr/plugins/architecture-internals)
