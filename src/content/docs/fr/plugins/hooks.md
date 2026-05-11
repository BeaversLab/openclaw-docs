---
summary: "Plugin hooks : intercepter les événements du cycle de vie de l'agent, de l'outil, du message, de la session et du Gateway"
title: "Plugin hooks"
read_when:
  - You are building a plugin that needs before_tool_call, before_agent_reply, message hooks, or lifecycle hooks
  - You need to block, rewrite, or require approval for tool calls from a plugin
  - You are deciding between internal hooks and plugin hooks
---

Les hooks de plugin sont des points d'extension en processus pour les plugins OpenClaw. Utilisez-les lorsqu'un plugin a besoin d'inspecter ou de modifier les exécutions d'agent, les appels d'outils, le flux de messages, le cycle de vie de la session, le routage des sous-agents, les installations ou le démarrage du Gateway.

Utilisez plutôt les [internal hooks](/fr/automation/hooks) lorsque vous souhaitez un petit script `HOOK.md` installé par l'opérateur pour les événements de commande et de Gateway tels que `/new`, `/reset`, `/stop`, `agent:bootstrap` ou `gateway:startup`.

## Quick start

Enregistrez les hooks de plugin typés avec `api.on(...)` depuis votre point d'entrée de plugin :

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

Les gestionnaires de hooks s'exécutent séquentiellement dans l'ordre décroissant `priority`. Les hooks de même priorité conservent l'ordre d'enregistrement.

## Hook catalog

Les hooks sont regroupés par la surface qu'ils étendent. Les noms en **gras** acceptent un résultat de décision (bloquer, annuler, remplacer ou nécessiter une approbation) ; tous les autres sont observationnels uniquement.

**Tour d'agent**

- `before_model_resolve` — remplacer le provider ou le model avant le chargement des messages de session
- `before_prompt_build` — ajouter un contexte dynamique ou du texte de système-prompt avant l'appel au model
- `before_agent_start` — phase combinée uniquement pour compatibilité ; privilégiez les deux hooks ci-dessus
- **`before_agent_reply`** — court-circuiter le tour de model avec une réponse synthétique ou le silence
- **`before_agent_finalize`** — inspecter la réponse finale naturelle et demander une passe supplémentaire du model
- `agent_end` — observer les messages finaux, l'état de succès et la durée d'exécution

**Observation de conversation**

- `model_call_started` / `model_call_ended` — observer les métadonnées nettoyées des appels provider/model, le timing, le résultat et les hachés d'ID de demande bornés sans le contenu du prompt ou de la réponse
- `llm_input` — observer l'entrée du provider (system prompt, prompt, historique)
- `llm_output` — observer la sortie du provider

**Outils**

- **`before_tool_call`** — réécrire les paramètres de l’outil, bloquer l’exécution ou exiger une approbation
- `after_tool_call` — observer les résultats de l’outil, les erreurs et la durée
- **`tool_result_persist`** — réécrire le message de l’assistant produit à partir d’un résultat de l’outil
- **`before_message_write`** — inspecter ou bloquer une écriture de message en cours (rare)

**Messages et livraison**

- **`inbound_claim`** — revendiquer un message entrant avant le routage de l’agent (réponses synthétiques)
- `message_received` — observer le contenu entrant, l’expéditeur, le fil de discussion et les métadonnées
- **`message_sending`** — réécrire le contenu sortant ou annuler la livraison
- `message_sent` — observer le succès ou l’échec de la livraison sortante
- **`before_dispatch`** — inspecter ou réécrire une expédition sortante avant le transfert vers le canal
- **`reply_dispatch`** — participer au pipeline final de dispatch de réponse

**Sessions et compactage**

- `session_start` / `session_end` — suivre les limites du cycle de vie de la session
- `before_compaction` / `after_compaction` — observer ou annoter les cycles de compactage
- `before_reset` — observer les événements de réinitialisation de session (`/reset`, réinitialisations programmatiques)

**Sous-agents**

- `subagent_spawning` / `subagent_delivery_target` / `subagent_spawned` / `subagent_ended` — coordonner le routage des sous-agents et la livraison des réponses

**Cycle de vie**

- `gateway_start` / `gateway_stop` — démarrer ou arrêter les services détenus par le plugin avec le Gateway
- **`before_install`** — inspecter les analyses d’installation de compétences ou de plugins et bloquer éventuellement

## Stratégie d’appel d’outil

`before_tool_call` reçoit :

- `event.toolName`
- `event.params`
- optionnel `event.runId`
- optionnel `event.toolCallId`
- les champs de contexte tels que `ctx.agentId`, `ctx.sessionKey`, `ctx.sessionId`,
  `ctx.runId`, `ctx.jobId` (définis lors des exécutions pilotées par cron) et `ctx.trace` de diagnostic

Elle peut renvoyer :

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

- `block: true` est terminal et ignore les gestionnaires de priorité inférieure.
- `block: false` est traité comme aucune décision.
- `params` réécrit les paramètres de l'outil pour l'exécution.
- `requireApproval` met en pause l'exécution de l'agent et demande à l'utilisateur via les approbations
  de plugin. La commande `/approve` peut approuver les approbations d'exécution et de plugin.
- Un `block: true` de priorité inférieure peut toujours bloquer après qu'un hook de priorité supérieure
  a demandé une approbation.
- `onResolution` reçoit la décision d'approbation résolue — `allow-once`,
  `allow-always`, `deny`, `timeout` ou `cancelled`.

### Persistance des résultats d'outil

Les résultats d'outil peuvent inclure des `details` structurées pour le rendu de l'interface utilisateur, les diagnostics,
le routage des médias ou les métadonnées appartenant au plugin. Traitez `details` comme des métadonnées d'exécution,
et non comme du contenu de prompt :

- OpenClaw supprime `toolResult.details` avant la relecture du fournisseur et la compactage
  de l'entrée afin que les métadonnées ne deviennent pas le contexte du modèle.
- Les entrées de session persistées ne conservent que des `details` limitées. Les détails dépassant la taille autorisée sont
  remplacés par un résumé compact et `persistedDetailsTruncated: true`.
- `tool_result_persist` et `before_message_write` s'exécutent avant la limite finale
  de persistance. Les hooks doivent tout de même garder les `details` renvoyées petites et éviter
  de placer du texte pertinent pour le prompt uniquement dans `details` ; mettez la sortie de l'outil visible par le modèle
  dans `content`.

## Hooks de prompt et de modèle

Utilisez les hooks spécifiques à la phase pour les nouveaux plugins :

- `before_model_resolve` : reçoit uniquement le prompt actuel et les métadonnées de
  pièce jointe. Renvoie `providerOverride` ou `modelOverride`.
- `before_prompt_build` : reçoit l'invite actuelle et les messages de la session.
  Retourne `prependContext`, `systemPrompt`, `prependSystemContext` ou
  `appendSystemContext`.

`before_agent_start` est conservé pour compatibilité. Préférez les hooks explicites ci-dessus
pour que votre plugin ne dépende pas d'une phase combinée héritée.

`before_agent_start` et `agent_end` incluent `event.runId` lorsque OpenClaw peut
identifier l'exécution active. La même valeur est également disponible sur `ctx.runId`.
Les exécutions pilotées par Cron exposent également `ctx.jobId` (l'identifiant du travail Cron d'origine) afin que
les hooks de plugin puissent délimiter les métriques, les effets secondaires ou l'état à un travail
planifié spécifique.

Utilisez `model_call_started` et `model_call_ended` pour la télémétrie des appels au fournisseur
qui ne doit pas recevoir d'invites brutes, d'historique, de réponses, d'en-têtes, de corps de requête
ou d'identifiants de requête fournisseur. Ces hooks incluent des métadonnées stables telles que
`runId`, `callId`, `provider`, `model`, en option `api`/`transport`, le terminal
`durationMs`/`outcome`, et `upstreamRequestIdHash` lorsque OpenClaw peut dériver un
hachage d'identifiant de requête fournisseur borné.

`before_agent_finalize` ne s'exécute que lorsqu'un harnais est sur le point d'accepter une réponse
finale naturelle de l'assistant. Ce n'est pas le chemin d'annulation `/stop` et il ne s'exécute pas
lorsque l'utilisateur abandonne un tour. Retournez `{ action: "revise", reason }` pour demander
au harnais un passage de modèle supplémentaire avant la finalisation, `{ action:
"finalize", reason? }` pour forcer la finalisation, ou omettez un résultat pour continuer.
Les hooks natifs Codex `Stop` sont relayés vers ce hook en tant que décisions
OpenClaw `before_agent_finalize`.

Les plugins non groupés qui ont besoin de `llm_input`, `llm_output`,
`before_agent_finalize` ou `agent_end` doivent définir :

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

Les hooks de modification d'invite peuvent être désactivés par plugin avec
`plugins.entries.<id>.hooks.allowPromptInjection=false`.

## Hooks de message

Utilisez les hooks de message pour le routage et la stratégie de livraison au niveau du canal :

- `message_received` : observer le contenu entrant, l'expéditeur, `threadId`, `messageId`,
  `senderId`, une corrélation d'exécution/session facultative et les métadonnées.
- `message_sending` : réécrire `content` ou renvoyer `{ cancel: true }`.
- `message_sent` : observer le succès ou l'échec final.

Pour les réponses TTS audio uniquement, `content` peut contenir la transcription parlée masquée
même lorsque la charge utile du canal n'a aucun texte/légende visible. La réécriture de ce
`content` met uniquement à jour la transcription visible par le hook ; elle n'est pas rendue comme une
légende média.

Les contextes de hooks de message exposent des champs de corrélation stables lorsqu'ils sont disponibles :
`ctx.sessionKey`, `ctx.runId`, `ctx.messageId`, `ctx.senderId`, `ctx.trace`,
`ctx.traceId`, `ctx.spanId`, `ctx.parentSpanId` et `ctx.callDepth`. Préférez
ces champs de première classe avant de lire les métadonnées héritées.

Préférez les champs typés `threadId` et `replyToId` avant d'utiliser les métadonnées
spécifiques au canal.

Règles de décision :

- `message_sending` avec `cancel: true` est terminal.
- `message_sending` avec `cancel: false` est traité comme aucune décision.
- Le `content` réécrit continue vers les hooks de priorité inférieure, sauf si un hook ultérieur
  annule la livraison.

## Hooks d'installation

`before_install` s'exécute après l'analyse intégrée des installations de compétences et de plugins.
Renvoyez des résultats supplémentaires ou `{ block: true, blockReason }` pour arrêter
l'installation.

`block: true` est terminal. `block: false` est traité comme aucune décision.

## Cycle de vie du Gateway

Utilisez `gateway_start` pour les services de plugin qui nécessitent un état appartenant au Gateway. Le contexte expose `ctx.config`, `ctx.workspaceDir` et `ctx.getCron?.()` pour l'inspection et la mise à jour des cron. Utilisez `gateway_stop` pour nettoyer les ressources à longue exécution.

Ne comptez pas sur le hook interne `gateway:startup` pour les services d'exécution appartenant au plugin.

## Dépréciations à venir

Quelques surfaces adjacentes aux hooks sont dépréciées mais toujours prises en charge. Migrez avant la prochaine version majeure :

- **Enveloppes de canal en texte brut** dans les gestionnaires `inbound_claim` et `message_received`. Lisez `BodyForAgent` et les blocs de contexte utilisateur structurés au lieu d'analyser le texte de l'enveloppe plat. Voir [Enveloppes de canal en texte brut → BodyForAgent](/fr/plugins/sdk-migration#active-deprecations).
- **`before_agent_start`** reste pour la compatibilité. Les nouveaux plugins doivent utiliser `before_model_resolve` et `before_prompt_build` au lieu de la phase combinée.
- **`onResolution` dans `before_tool_call`** utilise désormais l'union typée `PluginApprovalResolution` (`allow-once` / `allow-always` / `deny` / `timeout` / `cancelled`) au lieu d'un `string` de forme libre.

Pour la liste complète — inscription des capacités mémoire, profil de réflexion du fournisseur, fournisseurs d'authentification externes, types de découverte de fournisseur, accesseurs d'exécution de tâche et le renommage `command-auth` → `command-status` — voir [Migration du SDK Plugin → Dépréciations actives](/fr/plugins/sdk-migration#active-deprecations).

## Connexes

- [Migration du SDK Plugin](/fr/plugins/sdk-migration) — dépréciations actives et calendrier de suppression
- [Créer des plugins](/fr/plugins/building-plugins)
- [Aperçu du SDK Plugin](/fr/plugins/sdk-overview)
- [Points d'entrée du plugin](/fr/plugins/sdk-entrypoints)
- [Hooks internes](/fr/automation/hooks)
- [Internes de l'architecture du plugin](/fr/plugins/architecture-internals)
