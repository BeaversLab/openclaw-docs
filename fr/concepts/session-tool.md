---
summary: "Outils de session d'agent pour lister les sessions, récupérer l'historique et envoyer des messages inter-sessions"
read_when:
  - Adding or modifying session tools
title: "Outils de Session"
---

# Outils de Session

Objectif : un petit ensemble d'outils difficile à utiliser de manière incorrecte pour que les agents puissent lister les sessions, récupérer l'historique et envoyer à une autre session.

## Noms d'outils

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

## Modèle de clé

- Le bucket de chat direct principal est toujours la clé littérale `"main"` (résolue vers la clé principale de l'agent actuel).
- Les discussions de groupe utilisent `agent:<agentId>:<channel>:group:<id>` ou `agent:<agentId>:<channel>:channel:<id>` (passez la clé complète).
- Les tâches cron utilisent `cron:<job.id>`.
- Les hooks utilisent `hook:<uuid>` sauf indication contraire.
- Les sessions de nœud utilisent `node-<nodeId>` sauf indication contraire.

`global` et `unknown` sont des valeurs réservées et ne sont jamais listées. Si `session.scope = "global"`, nous l'aliasons à `main` pour tous les outils afin que les appelants ne voient jamais `global`.

## sessions_list

Lister les sessions sous forme de tableau de lignes.

Paramètres :

- `kinds?: string[]` filtre : n'importe lequel de `"main" | "group" | "cron" | "hook" | "node" | "other"`
- `limit?: number` lignes max (par défaut : défaut du serveur, limite ex. 200)
- `activeMinutes?: number` uniquement les sessions mises à jour dans les N minutes
- `messageLimit?: number` 0 = aucun message (par défaut 0) ; >0 = inclure les N derniers messages

Comportement :

- `messageLimit > 0` récupère `chat.history` par session et inclut les N derniers messages.
- Les résultats des outils sont filtrés dans la sortie de la liste ; utilisez `sessions_history` pour les messages d'outils.
- Lorsqu'ils fonctionnent dans une session d'agent **sandboxed**, les outils de session sont par défaut en **visibilité spawned-only** (voir ci-dessous).

Forme de ligne (JSON) :

- `key` : clé de session (chaîne)
- `kind` : `main | group | cron | hook | node | other`
- `channel` : `whatsapp | telegram | discord | signal | imessage | webchat | internal | unknown`
- `displayName` (libellé d'affichage du groupe si disponible)
- `updatedAt` (ms)
- `sessionId`
- `model` , `contextTokens` , `totalTokens`
- `thinkingLevel` , `verboseLevel` , `systemSent` , `abortedLastRun`
- `sendPolicy` (remplacement de session si défini)
- `lastChannel` , `lastTo`
- `deliveryContext` (`{ channel, to, accountId }` normalisé si disponible)
- `transcriptPath` (chemin de meilleur effort dérivé du répertoire de stockage + sessionId)
- `messages?` (seulement quand `messageLimit > 0`)

## sessions_history

Récupérer la transcription d'une session.

Paramètres :

- `sessionKey` (obligatoire ; accepte la clé de session ou `sessionId` de `sessions_list`)
- `limit?: number` messages max (le serveur limite)
- `includeTools?: boolean` (faux par défaut)

Comportement :

- `includeTools=false` filtre les messages `role: "toolResult"` .
- Renvoie le tableau de messages dans le format de transcription brut.
- Lorsqu'un `sessionId` est fourni, OpenClaw le résout en clé de session correspondante (erreur sur les identifiants manquants).

## API d'historique de session Gateway et de transcription en direct

L'interface utilisateur de contrôle et les clients Gateway peuvent utiliser les surfaces d'historique et de transcription en direct de niveau inférieur directement.

HTTP :

- `GET /sessions/{sessionKey}/history`
- Paramètres de requête : `limit`, `cursor`, `includeTools=1`, `follow=1`
- Les sessions inconnues renvoient HTTP `404` avec `error.type = "not_found"`
- `follow=1` met à niveau la réponse vers un flux SSE des mises à jour de transcription pour cette session

WebSocket :

- `sessions.subscribe` s'abonne à tous les événements de cycle de vie de session et de transcription visibles par le client
- `sessions.messages.subscribe { key }` s'abonne uniquement aux événements `session.message` pour une session
- `sessions.messages.unsubscribe { key }` supprime cet abonnement de transcription ciblé
- `session.message` transporte les messages de transcription ajoutés ainsi que les métadonnées d'utilisation en direct si disponibles
- `sessions.changed` émet `phase: "message"` pour les ajouts de transcription afin que les listes de sessions puissent actualiser les compteurs et les aperçus

## sessions_send

Envoyer un message dans une autre session.

Paramètres :

- `sessionKey` (requis ; accepte la clé de session ou `sessionId` de `sessions_list`)
- `message` (requis)
- `timeoutSeconds?: number` (par défaut >0 ; 0 = fire-and-forget)

Comportement :

- `timeoutSeconds = 0` : mettre en file d'attente et retourner `{ runId, status: "accepted" }`.
- `timeoutSeconds > 0` : attendre jusqu'à N secondes pour la fin, puis retourner `{ runId, status: "ok", reply }`.
- Si l'attente expire : `{ runId, status: "timeout", error }`. L'exécution continue ; appeler `sessions_history` plus tard.
- Si l'exécution échoue : `{ runId, status: "error", error }`.
- L'exécution de l'annonce de livraison a lieu après la fin de l'exécution principale et est du type meilleur effort ; `status: "ok"` ne garantit pas que l'annonce a été livrée.
- Les attentes via la passerelle `agent.wait` (côté serveur) empêchent les reconnexions d'interrompre l'attente.
- Le contexte de message agent à agent est injecté pour l'exécution principale.
- Les messages inter-sessions sont conservés avec `message.provenance.kind = "inter_session"` afin que les lecteurs de transcriptions puissent distinguer les instructions de l'agent acheminé des entrées de l'utilisateur externe.
- Une fois l'exécution principale terminée, OpenClaw exécute une **boucle de réponse** (reply-back loop) :
  - Les tours 2+ alternent entre les agents demandeur et cible.
  - Répondez exactement `REPLY_SKIP` pour arrêter le ping‑pong.
  - Le nombre maximum de tours est `session.agentToAgent.maxPingPongTurns` (0–5, par défaut 5).
- Une fois la boucle terminée, OpenClaw exécute l'**étape d'annonce agent‑à‑agent** (agent‑to‑agent announce step) (agent cible uniquement) :
  - Répondez exactement `ANNOUNCE_SKIP` pour rester silencieux.
  - Toute autre réponse est envoyée au channel cible.
  - L'étape d'annonce inclut la demande originale + la réponse du tour 1 + la dernière réponse ping‑pong.

## Champ Channel

- Pour les groupes, `channel` est le channel enregistré sur l'entrée de session.
- Pour les discussions directes, `channel` est mappé depuis `lastChannel`.
- Pour cron/hook/node, `channel` est `internal`.
- Si absent, `channel` est `unknown`.

## Sécurité / Politique d'envoi

Blocage basé sur une politique par type de channel/discussion (non par id de session).

```json
{
  "session": {
    "sendPolicy": {
      "rules": [
        {
          "match": { "channel": "discord", "chatType": "group" },
          "action": "deny"
        }
      ],
      "default": "allow"
    }
  }
}
```

Remplacement à l'exécution (par entrée de session) :

- `sendPolicy: "allow" | "deny"` (non défini = hériter de la config)
- Définissable via `sessions.patch` ou `/send on|off|inherit` réservé au propriétaire (message autonome).

Points d'application :

- `chat.send` / `agent` (passerelle)
- logique de livraison de réponse automatique

## sessions_spawn

Lancer une exécution de sous-agent dans une session isolée et annoncer le résultat au channel de discussion demandeur.

Paramètres :

- `task` (requis)
- `label?` (optionnel ; utilisé pour les journaux/interface utilisateur)
- `agentId?` (optionnel ; lance sous un autre id d'agent si autorisé)
- `model?` (optionnel ; remplace le modèle du sous-agent ; les valeurs invalides provoquent une erreur)
- `thinking?` (optionnel ; remplace le niveau de réflexion pour l'exécution du sous-agent)
- `runTimeoutSeconds?` (par défaut `agents.defaults.subagents.runTimeoutSeconds` si défini, sinon `0` ; si défini, abandonne l'exécution du sous-agent après N secondes)
- `thread?` (par défaut false ; demande un routage lié au fil de discussion pour ce spawn lorsque pris en charge par le channel/plugin)
- `mode?` (`run|session` ; par défaut `run`, mais par défaut `session` quand `thread=true` ; `mode="session"` requiert `thread=true`)
- `cleanup?` (`delete|keep`, par défaut `keep`)
- `sandbox?` (`inherit|require`, par défaut `inherit` ; `require` rejette le spawn sauf si le runtime enfant cible est sandboxé)
- `attachments?` (tableau optionnel de fichiers en ligne ; runtime du subagent uniquement, rejeté par l'ACP). Chaque entrée : `{ name, content, encoding?: "utf8" | "base64", mimeType? }`. Les fichiers sont matérialisés dans l'espace de travail enfant à `.openclaw/attachments/<uuid>/`. Renvoie un reçu avec sha256 par fichier.
- `attachAs?` (optionnel ; indice `{ mountPath? }` réservé pour de futures implémentations de montage)

Liste blanche :

- `agents.list[].subagents.allowAgents` : liste des ids d'agents autorisés via `agentId` (`["*"]` pour autoriser tout). Par défaut : seul l'agent demandeur.
- Garantie d'héritage du bac à sable : si la session demandeur est sandboxée, `sessions_spawn` rejette les cibles qui s'exécuteraient sans bac à sable.

Discovery :

- Utilisez `agents_list` pour découvrir quels ids d'agents sont autorisés pour `sessions_spawn`.

Comportement :

- Démarre une nouvelle session `agent:<agentId>:subagent:<uuid>` avec `deliver: false`.
- Les sous-agents utilisent par défaut l'ensemble complet d'outils **moins les outils de session** (configurable via `tools.subagents.tools`).
- Les sous-agents ne sont pas autorisés à appeler `sessions_spawn` (pas de spawn sous-agent → sous-agent).
- Toujours non bloquant : renvoie `{ status: "accepted", runId, childSessionKey }` immédiatement.
- Avec `thread=true`, les plugins de channel peuvent lier la livraison/routage à une cible de fil de discussion (le support Discord est contrôlé par `session.threadBindings.*` et `channels.discord.threadBindings.*`).
- After completion, OpenClaw runs a sub-agent **announce step** and posts the result to the requester chat channel.
  - If the assistant final reply is empty, the latest `toolResult` from sub-agent history is included as `Result`.
- Reply exactly `ANNOUNCE_SKIP` during the announce step to stay silent.
- Announce replies are normalized to `Status`/`Result`/`Notes`; `Status` comes from runtime outcome (not model text).
- Sub-agent sessions are auto-archived after `agents.defaults.subagents.archiveAfterMinutes` (default: 60).
- Announce replies include a stats line (runtime, tokens, sessionKey/sessionId, transcript path, and optional cost).

## Sandbox Session Visibility

Session tools can be scoped to reduce cross-session access.

Default behavior:

- `tools.sessions.visibility` defaults to `tree` (current session + spawned subagent sessions).
- For sandboxed sessions, `agents.defaults.sandbox.sessionToolsVisibility` can hard-clamp visibility.

Config:

```json5
{
  tools: {
    sessions: {
      // "self" | "tree" | "agent" | "all"
      // default: "tree"
      visibility: "tree",
    },
  },
  agents: {
    defaults: {
      sandbox: {
        // default: "spawned"
        sessionToolsVisibility: "spawned", // or "all"
      },
    },
  },
}
```

Notes:

- `self`: only the current session key.
- `tree`: current session + sessions spawned by the current session.
- `agent`: any session belonging to the current agent id.
- `all`: any session (cross-agent access still requires `tools.agentToAgent`).
- When a session is sandboxed and `sessionToolsVisibility="spawned"`, OpenClaw clamps visibility to `tree` even if you set `tools.sessions.visibility="all"`.

import fr from "/components/footer/fr.mdx";

<fr />
