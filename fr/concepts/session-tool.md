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

## Gateway historique de session et API de transcription en direct

L'interface utilisateur de contrôle et les clients Gateway peuvent utiliser directement les surfaces d'historique et de transcription en direct de niveau inférieur.

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

Générer une session déléguée isolée.

- Runtime par défaut : sous-agent OpenClaw (`runtime: "subagent"`).
- Les sessions de harnais ACP utilisent `runtime: "acp"` et suivent des règles spécifiques de ciblage et de stratégie ACP.
- Cette section se concentre sur le comportement du sous-agent, sauf indication contraire. Pour le comportement spécifique à l'ACP, voir [Agents ACP](/fr/tools/acp-agents).

Paramètres :

- `task` (requis)
- `runtime?` (`subagent|acp` ; par défaut `subagent`)
- `label?` (facultatif ; utilisé pour les journaux/interface utilisateur)
- `agentId?` (facultatif)
  - `runtime: "subagent"` : cibler un autre ID d'agent OpenClaw si autorisé par `subagents.allowAgents`
  - `runtime: "acp"` : cibler un ID de harnais ACP si autorisé par `acp.allowedAgents`
- `model?` (facultatif ; remplace le modèle du sous-agent ; les valeurs invalides génèrent une erreur)
- `thinking?` (facultatif ; remplace le niveau de réflexion pour l'exécution du sous-agent)
- `runTimeoutSeconds?` (par défaut `agents.defaults.subagents.runTimeoutSeconds` si défini, sinon `0` ; si défini, interrompt l'exécution du sous-agent après N secondes)
- `thread?` (faux par défaut ; demande un routage lié au fil pour cette génération lorsque pris en charge par le canal/le plugin)
- `mode?` (`run|session` ; par défaut `run`, mais par défaut `session` quand `thread=true` ; `mode="session"` nécessite `thread=true`)
- `cleanup?` (`delete|keep`, par défaut `keep`)
- `sandbox?` (`inherit|require`, par défaut `inherit` ; `require` rejette la génération sauf si le runtime enfant cible est isolé)
- `attachments?` (tableau facultatif de fichiers en ligne ; environnement d'exécution du sous-agent uniquement, rejeté par l'ACP). Chaque entrée : `{ name, content, encoding?: "utf8" | "base64", mimeType? }`. Les fichiers sont matérialisés dans l'espace de travail enfant à `.openclaw/attachments/<uuid>/`. Renvoie un reçu avec sha256 par fichier.
- `attachAs?` (facultatif ; indice `{ mountPath? }` réservé pour les futures implémentations de montage)

Liste verte :

- `runtime: "subagent"` : `agents.list[].subagents.allowAgents` contrôle quels ids d'agent OpenClaw sont autorisés via `agentId` (`["*"]` pour autoriser n'importe lequel). Par défaut : uniquement l'agent demandeur.
- `runtime: "acp"` : `acp.allowedAgents` contrôle quels ids de harnais ACP sont autorisés. Il s'agit d'une politique distincte de `subagents.allowAgents`.
- Garde d'héritage du bac à sable : si la session demandeur est sandboxed, `sessions_spawn` rejette les cibles qui s'exécuteraient sans bac à sable.

Discovery :

- Utilisez `agents_list` pour découvrir les cibles autorisées pour `runtime: "subagent"`.
- Pour `runtime: "acp"`, utilisez les ids de harnais ACP configurés et `acp.allowedAgents` ; `agents_list` ne liste pas les cibles de harnais ACP.

Comportement :

- Démarre une nouvelle session `agent:<agentId>:subagent:<uuid>` avec `deliver: false`.
- Les sous-agents utilisent par défaut l'ensemble complet d'outils **moins les outils de session** (configurable via `tools.subagents.tools`).
- Les sous-agents ne sont pas autorisés à appeler `sessions_spawn` (aucun lancement de sous-agent → sous-agent).
- Toujours non bloquant : renvoie `{ status: "accepted", runId, childSessionKey }` immédiatement.
- Avec `thread=true`, les plugins de channel peuvent lier la livraison/routage à une cible de fil (le support Discord est contrôlé par `session.threadBindings.*` et `channels.discord.threadBindings.*`).
- Après achèvement, OpenClaw exécute une **étape d'annonce** du sous-agent et publie le résultat dans le channel de discussion demandeur.
  - Si la réponse finale de l'assistant est vide, le dernier `toolResult` de l'historique du sous-agent est inclus comme `Result`.
- Répondez exactement `ANNOUNCE_SKIP` pendant l'étape d'annonce pour rester silencieux.
- Les réponses d'annonce sont normalisées en `Status`/`Result`/`Notes` ; `Status` provient du résultat de l'exécution (pas du texte du modèle).
- Les sessions de sous-agents sont automatiquement archivées après `agents.defaults.subagents.archiveAfterMinutes` (par défaut : 60).
- Les réponses d'annonce incluent une ligne de statistiques (durée d'exécution, jetons, sessionKey/sessionId, chemin de la transcription et coût optionnel).

## Visibilité de la session de Sandbox

Les outils de session peuvent être délimités pour réduire l'accès inter-session.

Comportement par défaut :

- `tools.sessions.visibility` par défaut correspond à `tree` (session actuelle + sessions de sous-agents générés).
- Pour les sessions sandboxées, `agents.defaults.sandbox.sessionToolsVisibility` peut imposer strictement la visibilité.

Configuration :

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
- `tree` : session actuelle + sessions générées par la session actuelle.
- `agent` : n'importe quelle session appartenant à l'identifiant de l'agent actuel.
- `all` : n'importe quelle session (l'accès inter-agent nécessite toujours `tools.agentToAgent`).
- Lorsqu'une session est sandboxée et `sessionToolsVisibility="spawned"`, OpenClaw restreint la visibilité à `tree` même si vous définissez `tools.sessions.visibility="all"`.

import fr from "/components/footer/fr.mdx";

<fr />
