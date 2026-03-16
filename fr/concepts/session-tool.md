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

## sessions_send

Envoyer un message dans une autre session.

Paramètres :

- `sessionKey` (obligatoire ; accepte la clé de session ou `sessionId` de `sessions_list`)
- `message` (obligatoire)
- `timeoutSeconds?: number` (défaut >0 ; 0 = tirer-et-oublier)

Comportement :

- `timeoutSeconds = 0` : mettre en file d'attente et renvoyer `{ runId, status: "accepted" }` .
- `timeoutSeconds > 0` : attendre jusqu'à N secondes pour la fin, puis renvoyer `{ runId, status: "ok", reply }` .
- Si l'attente expire : `{ runId, status: "timeout", error }`. L'exécution continue ; appelez `sessions_history` plus tard.
- Si l'exécution échoue : `{ runId, status: "error", error }`.
- Les exécutions de livraison d'annonce ont lieu après la fin de l'exécution principale et sont au mieux effort ; `status: "ok"` ne garantit pas que l'annonce a été livrée.
- Attend via la passerelle `agent.wait` (côté serveur) afin que les reconnexions n'interrompent pas l'attente.
- Le contexte du message agent à agent est injecté pour l'exécution principale.
- Les messages inter-session sont persistés avec `message.provenance.kind = "inter_session"` afin que les lecteurs de transcription puissent distinguer les instructions de l'agent acheminées des saisies de l'utilisateur externe.
- Une fois l'exécution principale terminée, OpenClaw exécute une **boucle de réponse** :
  - Les tours 2+ alternent entre les agents demandeur et cible.
  - Répondez exactement `REPLY_SKIP` pour arrêter le ping‑pong.
  - Le nombre maximum de tours est `session.agentToAgent.maxPingPongTurns` (0–5, par défaut 5).
- Une fois la boucle terminée, OpenClaw exécute l'**étape d'annonce agent‑à‑agent** (agent cible uniquement) :
  - Répondez exactement `ANNOUNCE_SKIP` pour rester silencieux.
  - Toute autre réponse est envoyée au channel cible.
  - L'étape d'annonce inclue la demande originale + la réponse du tour 1 + la dernière réponse du ping‑pong.

## Champ Channel

- Pour les groupes, `channel` est le channel enregistré sur l'entrée de session.
- Pour les discussions directes, `channel` correspond à `lastChannel`.
- Pour cron/hook/node, `channel` est `internal`.
- Si manquant, `channel` est `unknown`.

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

Surcharge à l'exécution (par entrée de session) :

- `sendPolicy: "allow" | "deny"` (non défini = hériter de la config)
- Définissable via `sessions.patch` ou `/send on|off|inherit` réservé au propriétaire (message autonome).

Points d'application :

- `chat.send` / `agent` (passerelle)
- logique de livraison de réponse automatique

## sessions_spawn

Spawn a sub-agent run in an isolated session and announce the result back to the requester chat channel.

Parameters:

- `task` (required)
- `label?` (optional; used for logs/UI)
- `agentId?` (optional; spawn under another agent id if allowed)
- `model?` (optional; overrides the sub-agent model; invalid values error)
- `thinking?` (optional; overrides thinking level for the sub-agent run)
- `runTimeoutSeconds?` (defaults to `agents.defaults.subagents.runTimeoutSeconds` when set, otherwise `0`; when set, aborts the sub-agent run after N seconds)
- `thread?` (default false; request thread-bound routing for this spawn when supported by the channel/plugin)
- `mode?` (`run|session`; defaults to `run`, but defaults to `session` when `thread=true`; `mode="session"` requires `thread=true`)
- `cleanup?` (`delete|keep`, default `keep`)
- `sandbox?` (`inherit|require`, default `inherit`; `require` rejects spawn unless the target child runtime is sandboxed)
- `attachments?` (optional array of inline files; subagent runtime only, ACP rejects). Each entry: `{ name, content, encoding?: "utf8" | "base64", mimeType? }`. Files are materialized into the child workspace at `.openclaw/attachments/<uuid>/`. Returns a receipt with sha256 per file.
- `attachAs?` (optional; `{ mountPath? }` hint reserved for future mount implementations)

Allowlist:

- `agents.list[].subagents.allowAgents`: list of agent ids allowed via `agentId` (`["*"]` to allow any). Default: only the requester agent.
- Sandbox inheritance guard: if the requester session is sandboxed, `sessions_spawn` rejects targets that would run unsandboxed.

Discovery :

- Use `agents_list` to discover which agent ids are allowed for `sessions_spawn`.

Behavior :

- Starts a new `agent:<agentId>:subagent:<uuid>` session with `deliver: false`.
- Sub-agents default to the full tool set **minus session tools** (configurable via `tools.subagents.tools`).
- Sub-agents are not allowed to call `sessions_spawn` (no sub-agent → sub-agent spawning).
- Always non-blocking: returns `{ status: "accepted", runId, childSessionKey }` immediately.
- With `thread=true`, channel plugins can bind delivery/routing to a thread target (Discord support is controlled by `session.threadBindings.*` and `channels.discord.threadBindings.*`).
- After completion, OpenClaw runs a sub-agent **announce step** and posts the result to the requester chat channel.
  - If the assistant final reply is empty, the latest `toolResult` from sub-agent history is included as `Result`.
- Reply exactly `ANNOUNCE_SKIP` during the announce step to stay silent.
- Announce replies are normalized to `Status`/`Result`/`Notes`; `Status` comes from runtime outcome (not model text).
- Sub-agent sessions are auto-archived after `agents.defaults.subagents.archiveAfterMinutes` (default: 60).
- Announce replies include a stats line (runtime, tokens, sessionKey/sessionId, transcript path, and optional cost).

## Sandbox Session Visibility

Session tools can be scoped to reduce cross-session access.

Default behavior :

- `tools.sessions.visibility` defaults to `tree` (current session + spawned subagent sessions).
- For sandboxed sessions, `agents.defaults.sandbox.sessionToolsVisibility` can hard-clamp visibility.

Config :

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

Notes :

- `self` : seule la clé de session actuelle.
- `tree` : session actuelle + sessions générées par la session actuelle.
- `agent` : n'importe quelle session appartenant à l'identifiant de l'agent actuel.
- `all` : n'importe quelle session (l'accès inter-agents nécessite toujours `tools.agentToAgent`).
- Lorsqu'une session est en mode bac à sable et `sessionToolsVisibility="spawned"`, OpenClaw limite la visibilité à `tree` même si vous définissez `tools.sessions.visibility="all"`.

import fr from "/components/footer/fr.mdx";

<fr />
