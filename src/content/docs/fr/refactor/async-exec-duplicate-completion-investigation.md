# Enquête sur la double complétion de l'exécution asynchrone

## Portée

- Session : `agent:main:telegram:group:-1003774691294:topic:1`
- Symptôme : la même complétion d'exécution asynchrone pour la session/l'exécution `keen-nexus` a été enregistrée deux fois dans le LCM en tant que tours utilisateur.
- Objectif : identifier s'il s'agit très probablement d'une injection de session en double ou d'une simple nouvelle tentative de livraison sortante.

## Conclusion

Il s'agit très probablement d'une **injection de session en double**, et non d'une simple nouvelle tentative de livraison sortante.

L'écart le plus important côté passerelle se situe dans le **chemin de complétion de l'exécution du nœud** :

1. Une fin d'exécution côté nœud émet `exec.finished` avec le `runId` complet.
2. Le Gateway `server-node-events` convertit cela en un événement système et demande un heartbeat.
3. L'exécution du heartbeat injecte le bloc d'événements système drainé dans le prompt de l'agent.
4. Le runner intégré persiste ce prompt en tant que nouveau tour utilisateur dans la transcription de la session.

Si le même `exec.finished` atteint la passerelle deux fois pour le même `runId` pour une raison quelconque (relecture, doublon de reconnexion, renvoi en amont, producteur dupliqué), OpenClaw n'a actuellement **aucune vérification d'idempotence indexée par `runId`/`contextKey`** sur ce chemin. La deuxième copie deviendra un deuxième message utilisateur avec le même contenu.

## Chemin de code exact

### 1. Producteur : événement de complétion de l'exécution du nœud

- `src/node-host/invoke.ts:340-360`
  - `sendExecFinishedEvent(...)` émet `node.event` avec l'événement `exec.finished`.
  - La charge utile inclut `sessionKey` et le `runId` complet.

### 2. Ingestion des événements du Gateway

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
  - `enqueueSystemEvent(...)` supprime uniquement le **texte en double consécutif** :
    - `if (entry.lastText === cleaned) return false`
  - Il stocke `contextKey`, mais n'utilise **pas** `contextKey` pour l'idempotence.
  - Après le drainage, la suppression des doublons est réinitialisée.

Cela signifie qu'un `exec.finished` rejoué avec le même `runId` peut être accepté à nouveau plus tard, même si le code avait déjà un candidat d'idempotence stable (`exec:<runId>`).

### 4. La gestion des réveils n'est pas le principal duplicateur

- `src/infra/heartbeat-wake.ts:79-117`
  - Les réveils sont regroupés par `(agentId, sessionKey)`.
  - Les demandes de réveil en double pour la même cible sont réduites à une seule entrée de réveil en attente.

Cela rend **la seule gestion des réveils en double** une explication moins probable que l'ingestion d'événements en double.

### 5. Le heartbeat consomme l'événement et le transforme en entrée de prompt

- `src/infra/heartbeat-runner.ts:535-574`
  - Preflight jette un œil aux événements système en attente et classifie les exécutions d'événements exec.
- `src/auto-reply/reply/session-system-events.ts:86-90`
  - `drainFormattedSystemEvents(...)` vide la file d'attente pour la session.
- `src/auto-reply/reply/get-reply-run.ts:400-427`
  - Le bloc d'événements système vidé est ajouté au début du corps du prompt de l'agent.

### 6. Point d'injection de la transcription

- `src/agents/pi-embedded-runner/run/attempt.ts:2000-2017`
  - `activeSession.prompt(effectivePrompt)` soumet le prompt complet à la session PI intégrée.
  - C'est à ce moment que le prompt dérivé de la completion devient un tour utilisateur persistant.

Ainsi, une fois que le même événement système est reconstruit dans le prompt deux fois, des messages utilisateur LCM en double sont attendus.

## Pourquoi la nouvelle tentative de livraison sortante simple est moins probable

Il existe un vrai chemin d'échec sortant dans le heartbeat runner :

- `src/infra/heartbeat-runner.ts:1194-1242`
  - La réponse est générée en premier.
  - La livraison sortante se produit plus tard via `deliverOutboundPayloads(...)`.
  - Un échec à cet endroit renvoie `{ status: "failed" }`.

Cependant, pour la même entrée de file d'attente d'événements système, cela seul est **insuffisant** pour expliquer les doublons de tours utilisateur :

- `src/auto-reply/reply/session-system-events.ts:86-90`
  - La file d'attente des événements système est déjà vidée avant la livraison sortante.

Ainsi, une nouvelle tentative d'envoi de canal ne recréerait pas à elle seule le même événement mis en file d'attente. Elle pourrait expliquer une livraison externe manquante/échouée, mais pas à elle seule un deuxième message utilisateur de session identique.

## Possibilité secondaire, moins probable

Il existe une boucle de nouvelle tentative d'exécution complète dans l'agent runner :

- `src/auto-reply/reply/agent-runner-execution.ts:741-1473`
  - Certains échecs transitoires peuvent réessayer toute l'exécution et resoumettre le même `commandBody`.

Cela peut dupliquer une invite utilisateur persistée **au sein de la même exécution de réponse** si l'invite avait déjà été ajoutée avant que la condition de nouvelle tentative ne se déclenche.

Je classe cela comme moins probable que l'ingestion dupliquée de `exec.finished` car :

- l'écart observé était d'environ 51 secondes, ce qui ressemble davantage à un deuxième réveil/tour qu'à une nouvelle tentative en cours de processus ;
- le rapport mentionne déjà des échecs répétés d'envoi de messages, ce qui indique davantage un tour ultérieur distinct qu'une nouvelle tentative immédiate du modèle/runtime.

## Hypothèse sur la cause première

Hypothèse de plus haute confiance :

- La complétion `keen-nexus` est passée par le **chemin d'événement d'exécution de nœud**.
- Le même `exec.finished` a été livré à `server-node-events` deux fois.
- Gateway a accepté les deux car `enqueueSystemEvent(...)` ne déduplique pas par `contextKey` / `runId`.
- Chaque événement accepté a déclenché un heartbeat et a été injecté en tant que tour utilisateur dans la transcription PI.

## Proposition de petite correction chirurgicale

Si une correction est souhaitée, le plus petit changement à forte valeur ajoutée est :

- faire en sorte que l'idempotence de l'événement exec/système respecte `contextKey` pour un court horizon, au moins pour les répétitions exactes de `(sessionKey, contextKey, text)` ;
- ou ajouter une déduplication dédiée dans `server-node-events` pour `exec.finished` indexée par `(sessionKey, runId, event kind)`.

Cela bloquerait directement les doublons de `exec.finished` rejoués avant qu'ils ne deviennent des tours de session.
