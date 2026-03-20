---
summary: "Outils de session d'agent pour lister les sessions, récupérer l'historique et envoyer des messages inter-sessions"
read_when:
  - Ajout ou modification d'outils de session
title: "Outils de session"
---

# Outils de Session

Objectif : un petit ensemble d'outils difficile à utiliser de manière incorrecte pour que les agents puissent lister les sessions, récupérer l'historique et envoyer à une autre session.

## Noms d'outils

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

## Modèle de clé

- Le bucket de chat direct principal est toujours la clé littérale `"main"` (résolu vers la clé principale de l'agent actuel).
- Les discussions de groupe utilisent `agent:<agentId>:<channel>:group:<id>` ou `agent:<agentId>:<channel>:channel:<id>` (passez la clé complète).
- Les tâches Cron utilisent `cron:<job.id>`.
- Les hooks utilisent `hook:<uuid>` sauf s'ils sont explicitement définis.
- Les sessions de nœud utilisent `node-<nodeId>` sauf si elles sont explicitement définies.

`global` et `unknown` sont des valeurs réservées et ne sont jamais listées. Si `session.scope = "global"`, nous l'aliasons en `main` pour tous les outils afin que les appelants ne voient jamais `global`.

## sessions_list

Lister les sessions sous forme de tableau de lignes.

Paramètres :

- Filtre `kinds?: string[]` : n'importe lequel `"main" | "group" | "cron" | "hook" | "node" | "other"`
- `limit?: number` lignes max (par défaut : par défaut du serveur, limite p. ex. 200)
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
- `model`, `contextTokens`, `totalTokens`
- `thinkingLevel`, `verboseLevel`, `systemSent`, `abortedLastRun`
- `sendPolicy` (remplacement de session si défini)
- `lastChannel`, `lastTo`
- `deliveryContext` (normalisé `{ channel, to, accountId }` si disponible)
- `transcriptPath` (chemin de meilleur effort dérivé du répertoire de stockage + sessionId)
- `messages?` (seulement lorsque `messageLimit > 0`)

## sessions_history

Récupérer la transcription d'une session.

Paramètres :

- `sessionKey` (requis ; accepte la clé de session ou `sessionId` de `sessions_list`)
- `limit?: number` max de messages (le serveur limite)
- `includeTools?: boolean` (par défaut faux)

Comportement :

- `includeTools=false` filtre les messages `role: "toolResult"`.
- Renvoie le tableau de messages dans le format de transcription brut.
- Lorsqu'un `sessionId` est fourni, OpenClaw le résout en la clé de session correspondante (erreur pour les ids manquants).

## sessions_send

Envoyer un message dans une autre session.

Paramètres :

- `sessionKey` (requis ; accepte la clé de session ou `sessionId` de `sessions_list`)
- `message` (requis)
- `timeoutSeconds?: number` (par défaut >0 ; 0 = fire-and-forget)

Comportement :

- `timeoutSeconds = 0` : mettre en file d'attente et retourner `{ runId, status: "accepted" }`.
- `timeoutSeconds > 0` : attendre jusqu'à N secondes pour la finition, puis retourner `{ runId, status: "ok", reply }`.
- Si l'attente expire : `{ runId, status: "timeout", error }`. L'exécution continue ; appelez `sessions_history` plus tard.
- Si l'exécution échoue : `{ runId, status: "error", error }`.
- Les exécutions de livraison d'annonce ont lieu après la fin de l'exécution principale et sont sur le principe du meilleur effort ; `status: "ok"` ne garantit pas que l'annonce a été livrée.
- Les attentes passent par la passerelle `agent.wait` (côté serveur) afin que les reconnexions n'interrompent pas l'attente.
- Le contexte du message agent à agent est injecté pour l'exécution principale.
- Les messages inter-sessions sont persistés avec `message.provenance.kind = "inter_session"` afin que les lecteurs de transcription puissent distinguer les instructions d'agent routées des entrées utilisateur externes.
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

- `task` (requis)
- `label?` (facultatif ; utilisé pour les journaux/UI)
- `agentId?` (facultatif ; génère sous un autre id d'agent si autorisé)
- `model?` (facultatif ; remplace le model du sous-agent ; les valeurs invalides renvoient une erreur)
- `thinking?` (facultatif ; remplace le niveau de réflexion pour l'exécution du sous-agent)
- `runTimeoutSeconds?` (par défaut `agents.defaults.subagents.runTimeoutSeconds` lorsqu'il est défini, sinon `0` ; lorsqu'il est défini, abandonne l'exécution du sous-agent après N secondes)
- `thread?` (false par défaut ; demande un routage lié au thread pour ce spawn lorsqu'il est pris en charge par le canal/plugin)
- `mode?` (`run|session` ; par défaut `run`, mais par défaut `session` lorsque `thread=true` ; `mode="session"` nécessite `thread=true`)
- `cleanup?` (`delete|keep`, par défaut `keep`)
- `sandbox?` (`inherit|require`, par défaut `inherit` ; `require` rejette le spawn sauf si le runtime enfant cible est sandboxed)
- `attachments?` (tableau facultatif de fichiers en ligne ; runtime du sous-agent uniquement, rejeté par l'ACP). Chaque entrée : `{ name, content, encoding?: "utf8" | "base64", mimeType? }`. Les fichiers sont matérialisés dans l'espace de travail enfant à `.openclaw/attachments/<uuid>/`. Renvoie un reçu avec sha256 par fichier.
- `attachAs?` (facultatif ; indice `{ mountPath? }` réservé pour les futures implémentations de montage)

Allowlist:

- `agents.list[].subagents.allowAgents` : liste des identifiants d'agents autorisés via `agentId` (`["*"]` pour autoriser n'importe lequel). Par défaut : uniquement l'agent demandeur.
- Garde d'héritage du bac à sable (Sandbox) : si la session du demandeur est sandboxée, `sessions_spawn` rejette les cibles qui s'exécuteraient sans bac à sable.

Discovery :

- Utilisez `agents_list` pour découvrir quels identifiants d'agents sont autorisés pour `sessions_spawn`.

Behavior :

- Démarre une nouvelle session `agent:<agentId>:subagent:<uuid>` avec `deliver: false`.
- Les sous-agents ont par défaut l'ensemble complet d'outils **moins les outils de session** (configurable via `tools.subagents.tools`).
- Les sous-agents ne sont pas autorisés à appeler `sessions_spawn` (pas de lancement de sous-agent → sous-agent).
- Toujours non bloquant : renvoie `{ status: "accepted", runId, childSessionKey }` immédiatement.
- Avec `thread=true`, les plugins de channel peuvent lier la livraison/le routage à une cible de fil (le support Discord est contrôlé par `session.threadBindings.*` et `channels.discord.threadBindings.*`).
- After completion, OpenClaw runs a sub-agent **announce step** and posts the result to the requester chat channel.
  - Si la réponse finale de l'assistant est vide, le dernier `toolResult` de l'historique du sous-agent est inclus en tant que `Result`.
- Répondez exactement `ANNOUNCE_SKIP` durant l'étape d'annonce pour rester silencieux.
- Les réponses d'annonce sont normalisées en `Status`/`Result`/`Notes` ; `Status` provient du résultat d'exécution (pas du texte du modèle).
- Les sessions de sous-agents sont archivées automatiquement après `agents.defaults.subagents.archiveAfterMinutes` (par défaut : 60).
- Announce replies include a stats line (runtime, tokens, sessionKey/sessionId, transcript path, and optional cost).

## Sandbox Session Visibility

Session tools can be scoped to reduce cross-session access.

Default behavior :

- `tools.sessions.visibility` est `tree` par défaut (session actuelle + sessions de sous-agents lancées).
- Pour les sessions sandboxées, `agents.defaults.sandbox.sessionToolsVisibility` peut imposer une restriction stricte de la visibilité.

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

- `self` : uniquement la clé de session actuelle.
- `tree` : session actuelle + sessions lancées par la session actuelle.
- `agent` : n'importe quelle session appartenant à l'identifiant d'agent actuel.
- `all` : n'importe quelle session (l'accès inter-agents nécessite toujours `tools.agentToAgent`).
- Lorsqu'une session est sandboxed et `sessionToolsVisibility="spawned"`, OpenClaw réduit la visibilité à `tree` même si vous définissez `tools.sessions.visibility="all"`.

import fr from "/components/footer/fr.mdx";

<fr />
