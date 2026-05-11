---
summary: "Notes d'enquête pour l'injection de fin d'exécution asynchrone en double"
read_when:
  - Debugging repeated node exec completion events
  - Working on heartbeat/system-event dedupe
title: "Enquête sur la duplication de l'exécution asynchrone"
---

## Portée

- Session : `agent:main:telegram:group:-1003774691294:topic:1`
- Symptôme : la même complétion d'exécution asynchrone pour la session/exécution `keen-nexus` a été enregistrée deux fois dans le LCM en tant que tours utilisateur.
- Objectif : identifier s'il s'agit très probablement d'une injection de session en double ou d'une simple nouvelle tentative de livraison sortante.

## Conclusion

Il s'agit très probablement d'une **injection de session en double**, et non d'une simple nouvelle tentative de livraison sortante.

Le plus gros écart côté Gateway se situe dans le **chemin de complétion de l'exécution du nœud** :

1. Une fin d'exécution côté nœud émet `exec.finished` avec le `runId` complet.
2. Le Gateway `server-node-events` convertit cela en un événement système et demande un heartbeat.
3. L'exécution du heartbeat injecte le bloc d'événements système drainé dans le prompt de l'agent.
4. Le runner intégré persiste ce prompt en tant que nouveau tour utilisateur dans la transcription de la session.

Si le même `exec.finished` parvient deux fois à la passerelle pour le même `runId` pour une raison quelconque (relecture, doublon de reconnexion, renvoi en amont, producteur dupliqué), OpenClaw n'a actuellement **aucune vérification d'idempotence indexée par `runId`/`contextKey`** sur ce chemin. La deuxième copie deviendra un deuxième message utilisateur avec le même contenu.

## Chemin de code exact

### 1. Producteur : événement de complétion de l'exécution du nœud

- `src/node-host/invoke.ts:340-360`
  - `sendExecFinishedEvent(...)` émet `node.event` avec l'événement `exec.finished`.
  - La charge utile comprend `sessionKey` et le `runId` complet.

### 2. Ingestion de l'événement Gateway

- `src/gateway/server-node-events.ts:574-640`
  - Gère `exec.finished`.
  - Construit le texte :
    - `Exec finished (node=..., id=<runId>, code ...)`
  - Le met en file d'attente via :
    - `enqueueSystemEvent(text, { sessionKey, contextKey: runId ? \`exec:${runId}\` : "exec", trusted: false })`
  - Demande immédiatement un réveil :
    - `requestHeartbeatNow(scopedHeartbeatWakeOptions(sessionKey, { reason: "exec-event" }))`

### 3. Faiblesse de la déduplication des événements système

- `src/infra/system-events.ts:90-115`
  - `enqueueSystemEvent(...)` supprime uniquement les **textes en double consécutifs** :
    - `if (entry.lastText === cleaned) return false`
  - Il stocke `contextKey`, mais n'utilise **pas** `contextKey` pour l'idempotence.
  - Après le vidage (drain), la suppression des doublons réinitialise.

Cela signifie qu'un `exec.finished` rejoué avec le même `runId` peut être accepté à nouveau plus tard, même si le code avait déjà un candidat d'idempotence stable (`exec:<runId>`).

### 4. La gestion des réveils (Wake handling) n'est pas le principal duplicateur

- `src/infra/heartbeat-wake.ts:79-117`
  - Les réveils sont fusionnés par `(agentId, sessionKey)`.
  - Les demandes de réveil en double pour la même cible se réduisent à une seule entrée de réveil en attente.

Cela rend **la seule gestion des réveils en double** une explication moins probable que l'ingestion d'événements en double.

### 5. Le battement de cœur (Heartbeat) consomme l'événement et le transforme en entrée de prompt

- `src/infra/heartbeat-runner.ts:535-574`
  - Le prévol (Preflight) jette un œil aux événements système en attente et classe les exécutions d'événements d'exécution.
- `src/auto-reply/reply/session-system-events.ts:86-90`
  - `drainFormattedSystemEvents(...)` vide la file d'attente pour la session.
- `src/auto-reply/reply/get-reply-run.ts:400-427`
  - Le bloc d'événements système vidé est ajouté au début du corps du prompt de l'agent.

### 6. Point d'injection de la transcription

- `src/agents/pi-embedded-runner/run/attempt.ts:2000-2017`
  - `activeSession.prompt(effectivePrompt)` soumet le prompt complet à la session PI intégrée.
  - C'est le point où le prompt dérivé de la complétion devient un tour utilisateur persistant.

Ainsi, une fois que le même événement système est reconstruit dans le prompt deux fois, des messages utilisateur LCM en double sont attendus.

## Pourquoi la nouvelle tentative de livraison sortante simple est moins probable

Il existe un vrai chemin d'échec sortant dans le lanceur de battement de cœur (heartbeat runner) :

- `src/infra/heartbeat-runner.ts:1194-1242`
  - La réponse est générée en premier.
  - La livraison sortante se produit plus tard via `deliverOutboundPayloads(...)`.
  - Un échec à cet endroit renvoie `{ status: "failed" }`.

Cependant, pour la même entrée de file d'attente d'événements système, cela seul est **insuffisant** pour expliquer les tours utilisateur en double :

- `src/auto-reply/reply/session-system-events.ts:86-90`
  - La file d'attente des événements système est déjà vidée avant la livraison sortante.

Par conséquent, une nouvelle tentative d'envoi via le canal ne recréerait pas à elle seule le même événement mis en file d'attente. Elle pourrait expliquer une livraison externe manquée/échouée, mais pas à elle seule un deuxième message utilisateur de session identique.

## Possibilité secondaire, moins probable

Il y a une boucle de nouvelle tentative d'exécution complète dans le lanceur d'agent :

- `src/auto-reply/reply/agent-runner-execution.ts:741-1473`
  - Certain transient failures can retry the whole run and resubmit the same `commandBody`.

That can duplicate a persisted user prompt **within the same reply execution** if the prompt was already appended before the retry condition triggered.

I rank this lower than duplicate `exec.finished` ingestion because:

- the observed gap was around 51 seconds, which looks more like a second wake/turn than an in-process retry;
- the report already mentions repeated message send failures, which points more toward a separate later turn than an immediate model/runtime retry.

## Root Cause Hypothesis

Highest-confidence hypothesis:

- The `keen-nexus` completion came through the **node exec event path**.
- The same `exec.finished` was delivered to `server-node-events` twice.
- Gateway accepted both because `enqueueSystemEvent(...)` does not dedupe by `contextKey` / `runId`.
- Each accepted event triggered a heartbeat and was injected as a user turn into the PI transcript.

## Proposed Tiny Surgical Fix

If a fix is wanted, the smallest high-value change is:

- make exec/system-event idempotency honor `contextKey` for a short horizon, at least for exact `(sessionKey, contextKey, text)` repeats;
- or add a dedicated dedupe in `server-node-events` for `exec.finished` keyed by `(sessionKey, runId, event kind)`.

That would directly block replayed `exec.finished` duplicates before they become session turns.

## Related

- [Exec tool](/fr/tools/exec)
- [Session management](/fr/concepts/session)
