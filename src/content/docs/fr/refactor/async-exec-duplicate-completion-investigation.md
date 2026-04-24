---
summary: "Notes d'enquête pour l'injection de fin d'exécution asynchrone en double"
read_when:
  - Debugging repeated node exec completion events
  - Working on heartbeat/system-event dedupe
title: "Enquête sur la fin d'exécution asynchrone en double"
---

# Enquête sur la fin d'exécution asynchrone en double

## Portée

- Session : `agent:main:telegram:group:-1003774691294:topic:1`
- Symptôme : la même fin d'exécution asynchrone pour la session/l'exécution `keen-nexus` a été enregistrée deux fois dans LCM en tant que tours utilisateur.
- Objectif : identifier s'il s'agit très probablement d'une injection de session en double ou d'une simple nouvelle tentative de livraison sortante.

## Conclusion

Il s'agit très probablement d'une **injection de session en double**, et non d'une simple nouvelle tentative de livraison sortante.

Le plus grand écart côté Gateway se situe dans le **chemin de fin d'exécution de nœud** :

1. Une fin d'exécution côté nœud émet `exec.finished` avec le `runId` complet.
2. Gateway `server-node-events` convertit cela en un événement système et demande un heartbeat.
3. L'exécution du heartbeat injecte le bloc d'événements système drainé dans le prompt de l'agent.
4. Le runner intégré persiste ce prompt sous la forme d'un nouveau tour utilisateur dans la transcription de la session.

Si le même `exec.finished` atteint la passerelle deux fois pour le même `runId` pour une raison quelconque (relecture, double reconnexion, nouvel envoi en amont, producteur en double), OpenClaw n'a actuellement **aucune vérification d'idempotence indexée par `runId`/`contextKey`** sur ce chemin. La deuxième copie deviendra un deuxième message utilisateur avec le même contenu.

## Chemin de code exact

### 1. Producteur : événement de fin d'exécution de nœud

- `src/node-host/invoke.ts:340-360`
  - `sendExecFinishedEvent(...)` émet `node.event` avec l'événement `exec.finished`.
  - La charge utile inclut `sessionKey` et le `runId` complet.

### 2. Ingestion d'événements Gateway

- `src/gateway/server-node-events.ts:574-640`
  - Gère `exec.finished`.
  - Construit le texte :
    - `Exec finished (node=..., id=<runId>, code ...)`
  - Le met en file via :
    - `enqueueSystemEvent(text, { sessionKey, contextKey: runId ? \`exec:${runId}\` : "exec", trusted: false })`
  - Demande immédiatement un réveil :
    - `requestHeartbeatNow(scopedHeartbeatWakeOptions(sessionKey, { reason: "exec-event" }))`

### 3. Faiblesse de la déduplication des événements système

- `src/infra/system-events.ts:90-115`
  - `enqueueSystemEvent(...)` supprime uniquement le **texte en double consécutif** :
    - `if (entry.lastText === cleaned) return false`
  - Il stocke `contextKey`, mais n'utilise **pas** `contextKey` pour l'idempotence.
  - Après le vidage, la suppression des doublons est réinitialisée.

Cela signifie qu'un `exec.finished` rejoué avec le même `runId` peut être accepté à nouveau plus tard, même si le code avait déjà un candidat d'idempotence stable (`exec:<runId>`).

### 4. La gestion des réveils n'est pas le principal duplicateur

- `src/infra/heartbeat-wake.ts:79-117`
  - Les réveils sont fusionnés par `(agentId, sessionKey)`.
  - Les demandes de réveil en double pour la même cible sont réduites à une seule entrée de réveil en attente.

Cela fait de la **gestion seule des réveils en double** une explication moins probable que l'ingestion d'événements en double.

### 5. Le heartbeat consomme l'événement et le transforme en entrée de prompt

- `src/infra/heartbeat-runner.ts:535-574`
  - Preflight examine les événements système en attente et classe les exécutions d'événements exec.
- `src/auto-reply/reply/session-system-events.ts:86-90`
  - `drainFormattedSystemEvents(...)` vide la file d'attente pour la session.
- `src/auto-reply/reply/get-reply-run.ts:400-427`
  - Le bloc d'événements système vidés est ajouté en tête du corps du prompt de l'agent.

### 6. Point d'injection de la transcription

- `src/agents/pi-embedded-runner/run/attempt.ts:2000-2017`
  - `activeSession.prompt(effectivePrompt)` soumet le prompt complet à la session PI intégrée.
  - C'est le point où le prompt dérivé de la complétion devient un tour utilisateur persistant.

Ainsi, une fois que le même événement système est reconstruit dans le prompt deux fois, les messages utilisateur LCM en double sont attendus.

## Pourquoi une simple nouvelle tentative de livraison sortante est moins probable

Il existe un véritable chemin d'échec sortant dans le lanceur de heartbeat :

- `src/infra/heartbeat-runner.ts:1194-1242`
  - La réponse est d'abord générée.
  - La livraison sortante se produit plus tard via `deliverOutboundPayloads(...)`.
  - Un échec à ce niveau renvoie `{ status: "failed" }`.

Cependant, pour la même entrée de file d'attente d'événement système, cela seul est **insuffisant** pour expliquer les tours utilisateur en double :

- `src/auto-reply/reply/session-system-events.ts:86-90`
  - La file d'attente des événements système est déjà vidée avant la livraison sortante.

Ainsi, une nouvelle tentative d'envoi sur le channel ne recréerait pas à elle seule le même événement en file d'attente. Elle pourrait expliquer une livraison externe manquante/échouée, mais pas à elle seule un second message utilisateur de session identique.

## Possibilité secondaire, moins probable

Il existe une boucle de réessai pour l'exécution complète dans l'agent runner :

- `src/auto-reply/reply/agent-runner-execution.ts:741-1473`
  - Certains échecs transitoires peuvent réessayer toute l'exécution et resoumettre le même `commandBody`.

Cela peut dupliquer un prompt utilisateur persistant **au sein de la même exécution de réponse** si le prompt avait déjà été ajouté avant que la condition de réessai ne se déclenche.

Je classe cela plus bas que l'ingestion de `exec.finished` en double car :

- l'écart observé était d'environ 51 secondes, ce qui ressemble plus à un deuxième réveil/tour qu'à un réessai en cours de processus ;
- le rapport mentionne déjà des échecs répétés d'envoi de messages, ce qui indique davantage un tour ultérieur séparé qu'un réessai immédiat du modèle/runtime.

## Hypothèse sur la cause racine

Hypothèse la plus probable :

- La complétion `keen-nexus` est passée par le **chemin d'événement d'exécution de nœud**.
- Le même `exec.finished` a été livré à `server-node-events` deux fois.
- Le Gateway a accepté les deux car `enqueueSystemEvent(...)` ne fait pas de déduplication par `contextKey` / `runId`.
- Chaque événement accepté a déclenché un battement de cœur (heartbeat) et a été injecté en tant que tour utilisateur dans la transcription PI.

## Petite correction chirurgicale proposée

Si une correction est souhaitée, le plus petit changement à forte valeur ajoutée est :

- faire en sorte que l'idempotence des événements d'exécution/système respecte `contextKey` sur un horizon court, au moins pour les répétitions exactes de `(sessionKey, contextKey, text)` ;
- ou ajouter une déduplication dédiée dans `server-node-events` pour `exec.finished` indexé par `(sessionKey, runId, event kind)`.

Cela bloquerait directement les doublons `exec.finished` rejoués avant qu'ils ne deviennent des tours de session.
