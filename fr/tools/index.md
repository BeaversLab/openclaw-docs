---
summary: "Interface d'agent pour les outils de OpenClaw (navigateur, canvas, nœuds, message, cron) remplaçant les anciennes compétences `openclaw-*`"
read_when:
  - Adding or modifying agent tools
  - Retiring or changing `openclaw-*` skills
title: "Outils"
---

# Tools (OpenClaw)

OpenClaw expose des **outils d'agent de premier plan** pour le navigateur, le canvas, les nœuds et le cron.
Ces derniers remplacent les anciennes compétences `openclaw-*` : les outils sont typés, sans shelling,
et l'agent doit s'y fier directement.

## Désactivation des tools

Vous pouvez autoriser/interdire globalement les outils via `tools.allow` / `tools.deny` dans `openclaw.json`
(l'interdiction l'emporte). Cela empêche l'envoi des outils non autorisés aux fournisseurs de modèles.

```json5
{
  tools: { deny: ["browser"] },
}
```

Notes :

- La correspondance ne tient pas compte de la casse.
- Les caractères génériques `*` sont pris en charge (`"*"` signifie tous les outils).
- Si `tools.allow` ne fait référence qu'à des noms d'outils de plugin inconnus ou non chargés, OpenClaw enregistre un avertissement et ignore la liste d'autorisation afin que les outils principaux restent disponibles.

## Profils de tool (liste d'autorisation de base)

`tools.profile` définit une **liste d'autorisation d'outils de base** avant `tools.allow`/`tools.deny`.
Remplacement par agent : `agents.list[].tools.profile`.

Profils :

- `minimal` : `session_status` uniquement
- `coding` : `group:fs`, `group:runtime`, `group:sessions`, `group:memory`, `image`
- `messaging` : `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`
- `full` : aucune restriction (identique à non défini)

Exemple (messagerie uniquement par défaut, autoriser également les tools Slack + Discord) :

```json5
{
  tools: {
    profile: "messaging",
    allow: ["slack", "discord"],
  },
}
```

Exemple (profil de codage, mais interdire exec/process partout) :

```json5
{
  tools: {
    profile: "coding",
    deny: ["group:runtime"],
  },
}
```

Exemple (profil de codage global, agent de support messagerie uniquement) :

```json5
{
  tools: { profile: "coding" },
  agents: {
    list: [
      {
        id: "support",
        tools: { profile: "messaging", allow: ["slack"] },
      },
    ],
  },
}
```

## Politique de tool spécifique au fournisseur

Utilisez `tools.byProvider` pour **restreindre davantage** les outils pour des fournisseurs spécifiques
(ou un seul `provider/model`) sans modifier vos paramètres globaux par défaut.
Remplacement par agent : `agents.list[].tools.byProvider`.

Ceci est appliqué **après** le profil de tool de base et **avant** les listes d'autorisation/refus, il ne peut donc que réduire l'ensemble des tools. Les clés de provider acceptent soit `provider` (par ex. `google-antigravity`) soit `provider/model` (par ex. `openai/gpt-5.2`).

Exemple (conserver le profil de codage global, mais des outils minimaux pour Google Antigravity) :

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
    },
  },
}
```

Exemple (liste d'autorisation spécifique au provider/modèle pour un endpoint instable) :

```json5
{
  tools: {
    allow: ["group:fs", "group:runtime", "sessions_list"],
    byProvider: {
      "openai/gpt-5.2": { allow: ["group:fs", "sessions_list"] },
    },
  },
}
```

Exemple (redéfinition spécifique à l'agent pour un provider unique) :

```json5
{
  agents: {
    list: [
      {
        id: "support",
        tools: {
          byProvider: {
            "google-antigravity": { allow: ["message", "sessions_list"] },
          },
        },
      },
    ],
  },
}
```

## Groupes d'outils (raccourcis)

Les stratégies de tools (globales, agent, sandbox) prennent en charge les entrées `group:*` qui s'étendent à plusieurs tools. Utilisez-les dans `tools.allow` / `tools.deny`.

Groupes disponibles :

- `group:runtime` : `exec`, `bash`, `process`
- `group:fs` : `read`, `write`, `edit`, `apply_patch`
- `group:sessions` : `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- `group:memory` : `memory_search`, `memory_get`
- `group:web` : `web_search`, `web_fetch`
- `group:ui` : `browser`, `canvas`
- `group:automation` : `cron`, `gateway`
- `group:messaging` : `message`
- `group:nodes` : `nodes`
- `group:openclaw` : tous les tools intégrés OpenClaw (exclut les plugins de provider)

Exemple (autoriser uniquement les outils de fichier + navigateur) :

```json5
{
  tools: {
    allow: ["group:fs", "browser"],
  },
}
```

## Plugins + outils

Les plugins peuvent enregistrer des **tools supplémentaires** (et des commandes CLI) au-delà de l'ensemble de base. Voir [Plugins](/fr/tools/plugin) pour l'installation + la configuration, et [Skills](/fr/tools/skills) pour savoir comment les directives d'utilisation des tools sont injectées dans les invites. Certains plugins fournissent leurs propres skills avec les tools (par exemple, le plugin d'appel vocal).

Outils de plugin facultatifs :

- [Lobster](/fr/tools/lobster) : runtime de workflow typé avec approbations reprises (nécessite le Lobster CLI sur l'hôte de la passerelle).
- [Tâche LLM](/fr/tools/llm-task) : étape LLM JSON uniquement pour la sortie de flux de travail structurée (validation de schéma facultative).
- [Diffs](/fr/tools/diffs) : visionneuse de diff en lecture seule et moteur de rendu de fichiers PNG ou PDF pour le texte avant/après ou les correctifs unifiés.

## Inventaire des outils

### `apply_patch`

Applique des correctifs structurés sur un ou plusieurs fichiers. À utiliser pour les modifications multi-parties.
Expérimental : activer via `tools.exec.applyPatch.enabled` (modèles OpenAI uniquement).
`tools.exec.applyPatch.workspaceOnly` est défini par défaut sur `true` (contenu dans l'espace de travail). Définissez-le sur `false` uniquement si vous souhaitez intentionnellement que `apply_patch` écrive/supprime en dehors du répertoire de l'espace de travail.

### `exec`

Exécuter des commandes shell dans l'espace de travail.

Paramètres principaux :

- `command` (requis)
- `yieldMs` (arrière-plan automatique après expiration, par défaut 10000)
- `background` (arrière-plan immédiat)
- `timeout` (secondes ; tue le processus si dépassé, par défaut 1800)
- `elevated` (booléen ; exécuter sur l'hôte si le mode élevé est activé/autorisé ; ne modifie le comportement que lorsque l'agent est sandboxed)
- `host` (`sandbox | gateway | node`)
- `security` (`deny | allowlist | full`)
- `ask` (`off | on-miss | always`)
- `node` (id/nom du nœud pour `host=node`)
- Besoin d'un vrai TTY ? Définissez `pty: true`.

Notes :

- Renvoie `status: "running"` avec un `sessionId` lorsqu'il est en arrière-plan.
- Utilisez `process` pour interroger/journaliser/écrire/tuer/effacer les sessions d'arrière-plan.
- Si `process` n'est pas autorisé, `exec` s'exécute de manière synchrone et ignore `yieldMs`/`background`.
- `elevated` est conditionné par `tools.elevated` ainsi que par tout remplacement `agents.list[].tools.elevated` (les deux doivent autoriser) et est un alias pour `host=gateway` + `security=full`.
- `elevated` ne modifie le comportement que lorsque l'agent est sandboxed (sinon c'est une opération vide).
- `host=node` peut cibler une application compagnon macOS ou un hôte de nœud headless (`openclaw node run`).
- approbations et listes d'autorisation de passerelle/nœud : [Exec approvals](/fr/tools/exec-approvals).

### `process`

Gérer les sessions d'exécution d'arrière-plan.

Actions principales :

- `list`, `poll`, `log`, `write`, `kill`, `clear`, `remove`

Notes :

- `poll` renvoie une nouvelle sortie et un statut de sortie lorsqu'il est terminé.
- `log` prend en charge les `offset`/`limit` basés sur les lignes (omettez `offset` pour récupérer les N dernières lignes).
- `process` est délimité par agent ; les sessions d'autres agents ne sont pas visibles.

### `loop-detection` (garde-fous de boucle d'appel d'outil)

OpenClaw suit l'historique récent des appels d'outils et bloque ou avertit lorsqu'il détecte des boucles répétitives sans progression.
Activez avec `tools.loopDetection.enabled: true` (la valeur par défaut est `false`).

```json5
{
  tools: {
    loopDetection: {
      enabled: true,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      historySize: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

- `genericRepeat` : modèle d'appel répété avec le même outil et les mêmes paramètres.
- `knownPollNoProgress` : répétition d'outils de type sondage avec des sorties identiques.
- `pingPong` : alternance de `A/B/A/B` modèles sans progression.
- Remplacement par agent : `agents.list[].tools.loopDetection`.

### `web_search`

Rechercher sur le Web en utilisant Brave, Firecrawl, Gemini, Grok, Kimi, Perplexity ou Tavily.

Paramètres principaux :

- `query` (requis)
- `count` (1–10 ; valeur par défaut de `tools.web.search.maxResults`)

Notes :

- Nécessite une clé API pour le provider choisi (recommandé : `openclaw configure --section web`).
- Activer via `tools.web.search.enabled`.
- Les réponses sont mises en cache (par défaut 15 min).
- Voir [Web tools](/fr/tools/web) pour la configuration.

### `web_fetch`

Récupérer et extraire le contenu lisible d'une URL (HTML → markdown/texte).

Paramètres principaux :

- `url` (requis)
- `extractMode` (`markdown` | `text`)
- `maxChars` (tronquer les longues pages)

Notes :

- Activer via `tools.web.fetch.enabled`.
- `maxChars` est limité par `tools.web.fetch.maxCharsCap` (par défaut 50000).
- Les réponses sont mises en cache (par défaut 15 min).
- Pour les sites fortement dépendants de JS, préférez le tool navigateur.
- Voir [Outils Web](/fr/tools/web) pour la configuration.
- Voir [Firecrawl](/fr/tools/firecrawl) pour le repli anti-bot optionnel.

### `browser`

Contrôler le navigateur dédié géré par OpenClaw.

Actions principales :

- `status`, `start`, `stop`, `tabs`, `open`, `focus`, `close`
- `snapshot` (aria/ai)
- `screenshot` (renvoie un bloc d'image + `MEDIA:<path>`)
- `act` (actions UI : click/type/press/hover/drag/select/fill/resize/wait/evaluate)
- `navigate`, `console`, `pdf`, `upload`, `dialog`

Gestion des profils :

- `profiles` — lister tous les profils de navigateur avec leur statut
- `create-profile` — créer un nouveau profil avec un port alloué automatiquement (ou `cdpUrl`)
- `delete-profile` — arrêter le navigateur, supprimer les données utilisateur, retirer de la configuration (local uniquement)
- `reset-profile` — tuer le processus orphelin sur le port du profil (local uniquement)

Paramètres communs :

- `profile` (optionnel ; par défaut `browser.defaultProfile`)
- `target` (`sandbox` | `host` | `node`)
- `node` (optionnel ; choisit un id/nom de nœud spécifique)
  Notes :
- Nécessite `browser.enabled=true` (par défaut `true` ; définissez `false` pour désactiver).
- Toutes les actions acceptent le paramètre optionnel `profile` pour la prise en charge multi-instance.
- Omettez `profile` pour la valeur par défaut sûre : navigateur isolé géré par OpenClaw (`openclaw`).
- Utilisez `profile="user"` pour le vrai navigateur de l'hôte local lorsque les connexions/cookies existants comptent et que l'utilisateur est présent pour cliquer/approuver toute invite d'attachement.
- `profile="user"` est réservé à l'hôte ; ne le combinez pas avec les cibles sandbox/node.
- Lorsque `profile` est omis, utilise `browser.defaultProfile` (par défaut `openclaw`).
- Noms de profil : uniquement alphanumériques en minuscules + traits d'union (max 64 caractères).
- Plage de ports : 18800-18899 (~100 profils max).
- Les profils distants sont en attachement uniquement (pas de démarrage/arrêt/réinitialisation).
- Si un nœud compatible navigateur est connecté, l'outil peut y être acheminé automatiquement (sauf si vous épinglez `target`).
- `snapshot` utilise par défaut `ai` lorsque Playwright est installé ; utilisez `aria` pour l'arbre d'accessibilité.
- `snapshot` prend également en charge les options de snapshot de rôle (`interactive`, `compact`, `depth`, `selector`) qui renvoient des références comme `e12`.
- `act` nécessite `ref` de `snapshot` (`12` numérique des snapshots IA, ou `e12` des snapshots de rôle) ; utilisez `evaluate` pour les besoins rares de sélecteur CSS.
- Évitez `act` → `wait` par défaut ; ne l'utilisez que dans des cas exceptionnels (aucun état d'interface utilisateur fiable à attendre).
- `upload` peut transmettre facultativement un `ref` pour cliquer automatiquement après l'armement.
- `upload` prend également en charge `inputRef` (réf aria) ou `element` (sélecteur CSS) pour définir `<input type="file">` directement.

### `canvas`

Pilotez le Canvas de nœuds (présentation, évaluation, snapshot, A2UI).

Actions principales :

- `present`, `hide`, `navigate`, `eval`
- `snapshot` (renvoie un bloc image + `MEDIA:<path>`)
- `a2ui_push`, `a2ui_reset`

Notes :

- Utilise la passerelle `node.invoke` en arrière-plan.
- Si aucun `node` n'est fourni, l'outil choisit une valeur par défaut (nœud connecté unique ou nœud mac local).
- A2UI est uniquement disponible en v0.8 (pas de `createSurface`) ; la CLI rejette le JSONL v0.9 avec des erreurs de ligne.
- Test rapide : `openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"`.

### `nodes`

Découvrez et ciblez les nœuds appariés ; envoyez des notifications ; capturez l'appareil photo/l'écran.

Actions principales :

- `status`, `describe`
- `pending`, `approve`, `reject` (appairage)
- `notify` (macOS `system.notify`)
- `run` (macOS `system.run`)
- `camera_list`, `camera_snap`, `camera_clip`, `screen_record`
- `location_get`, `notifications_list`, `notifications_action`
- `device_status`, `device_info`, `device_permissions`, `device_health`

Notes :

- Les commandes caméra/écran nécessitent que l'application nœud soit au premier plan.
- Les images renvoient des blocs d'image + `MEDIA:<path>`.
- Les vidéos renvoient `FILE:<path>` (mp4).
- L'emplacement renvoie une charge utile JSON (lat/lon/précision/horodatage).
- paramètres `run` : tableau argv `command` ; optionnel `cwd`, `env` (`KEY=VAL`), `commandTimeoutMs`, `invokeTimeoutMs`, `needsScreenRecording`.

Exemple (`run`) :

```json
{
  "action": "run",
  "node": "office-mac",
  "command": ["echo", "Hello"],
  "env": ["FOO=bar"],
  "commandTimeoutMs": 12000,
  "invokeTimeoutMs": 45000,
  "needsScreenRecording": false
}
```

### `image`

Analyser une image avec le modèle d'image configuré.

Paramètres principaux :

- `image` (chemin ou URL requis)
- `prompt` (facultatif ; par défaut « Describe the image. »)
- `model` (remplacement facultatif)
- `maxBytesMb` (limite de taille facultative)

Notes :

- Disponible uniquement lorsque `agents.defaults.imageModel` est configuré (principal ou solutions de repli), ou lorsqu'un modèle d'image implicite peut être déduit de votre modèle par défaut + de l'authentification configurée (appairage au mieux).
- Utilise le modèle d'image directement (indépendamment du modèle de chat principal).

### `image_generate`

Générer une ou plusieurs images avec le modèle de génération d'images configuré ou déduit.

Paramètres principaux :

- `action` (facultatif : `generate` ou `list` ; par défaut `generate`)
- `prompt` (requis)
- `image` ou `images` (chemin/URL de l'image de référence facultatif pour le mode édition)
- `model` (remplacement optionnel de fournisseur/modèle)
- `size` (indice de taille optionnel)
- `resolution` (indice `1K|2K|4K` optionnel)
- `count` (optionnel, `1-4`, par défaut `1`)

Notes :

- Disponible lorsque `agents.defaults.imageGenerationModel` est configuré, ou lorsque OpenClaw peut déduire une valeur par défaut de génération d'images compatible à partir de vos fournisseurs activés et de l'authentification disponible.
- Un `agents.defaults.imageGenerationModel` explicite l'emporte toujours sur toute valeur par défaut déduite.
- Utilisez `action: "list"` pour inspecter les fournisseurs enregistrés, les modèles par défaut, les identifiants de modèles pris en charge, les tailles, les résolutions et la prise en charge de la modification.
- Renvoie des lignes `MEDIA:<path>` locales afin que les canaux puissent livrer directement les fichiers générés.
- Utilise directement le modèle de génération d'images (indépendamment du modèle de chat principal).
- Les flux pris en charge par Google, notamment `google/gemini-3-pro-image-preview` pour le chemin natif de style Nano Banana, prennent en charge les modifications d'image de référence ainsi que les indices explicites de résolution `1K|2K|4K`.
- Lors d'une modification et si `resolution` est omis, OpenClaw déduit une résolution de brouillon/finale à partir de la taille de l'image d'entrée.
- Il s'agit du remplacement intégré du flux de travail de l'ancienne compétence `nano-banana-pro`. Utilisez `agents.defaults.imageGenerationModel`, et non `skills.entries`, pour la génération d'images standard.

Exemple natif :

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "google/gemini-3-pro-image-preview", // native Nano Banana path
        fallbacks: ["fal/fal-ai/flux/dev"],
      },
    },
  },
}
```

### `pdf`

Analyser un ou plusieurs documents PDF.

Pour le comportement complet, les limites, la configuration et les exemples, consultez [Outil PDF](/fr/tools/pdf).

### `message`

Envoyer des messages et des actions de canal via Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/iMessage/Microsoft Teams.

Actions principales :

- `send` (texte + média optionnel ; Microsoft Teams prend également en charge `card` pour les cartes adaptatives)
- `poll` (sondages WhatsApp/Discord/Microsoft Teams)
- `react` / `reactions` / `read` / `edit` / `delete`
- `pin` / `unpin` / `list-pins`
- `permissions`
- `thread-create` / `thread-list` / `thread-reply`
- `search`
- `sticker`
- `member-info` / `role-info`
- `emoji-list` / `emoji-upload` / `sticker-upload`
- `role-add` / `role-remove`
- `channel-info` / `channel-list`
- `voice-status`
- `event-list` / `event-create`
- `timeout` / `kick` / `ban`

Notes :

- `send` route WhatsApp via le Gateway ; les autres canaux sont directs.
- `poll` utilise le Gateway pour WhatsApp et Microsoft Teams ; les sondages Discord sont directs.
- Lorsqu'un appel de tool de message est lié à une session de chat active, les envois sont limités à la cible de cette session pour éviter les fuites entre contextes.

### `cron`

Gérer les tâches cron et les réveils du Gateway.

Actions principales :

- `status`, `list`
- `add`, `update`, `remove`, `run`, `runs`
- `wake` (mise en file d'événement système + battement de cœur immédiat en option)

Notes :

- `add` attend un objet de tâche cron complet (même schéma que `cron.add` RPC).
- `update` utilise `{ jobId, patch }` (`id` accepté pour compatibilité).

### `gateway`

Redémarrer ou appliquer des mises à jour au processus Gateway en cours d'exécution (sur place).

Actions principales :

- `restart` (autorise + envoie `SIGUSR1` pour le redémarrage en cours de processus ; `openclaw gateway` redémarre sur place)
- `config.schema.lookup` (inspect one config path at a time without loading the full schema into prompt context)
- `config.get`
- `config.apply` (validate + write config + restart + wake)
- `config.patch` (merge partial update + restart + wake)
- `update.run` (run update + restart + wake)

Notes :

- `config.schema.lookup` expects a targeted config path such as `gateway.auth` or `agents.list.*.heartbeat`.
- Paths may include slash-delimited plugin ids when addressing `plugins.entries.<id>`, for example `plugins.entries.pack/one.config`.
- Use `delayMs` (defaults to 2000) to avoid interrupting an in-flight reply.
- `config.schema` remains available to internal Control UI flows and is not exposed through the agent `gateway` tool.
- `restart` is enabled by default; set `commands.restart: false` to disable it.

### `sessions_list` / `sessions_history` / `sessions_send` / `sessions_spawn` / `session_status`

List sessions, inspect transcript history, or send to another session.

Core parameters :

- `sessions_list` : `kinds?`, `limit?`, `activeMinutes?`, `messageLimit?` (0 = none)
- `sessions_history` : `sessionKey` (or `sessionId`), `limit?`, `includeTools?`
- `sessions_send` : `sessionKey` (or `sessionId`), `message`, `timeoutSeconds?` (0 = fire-and-forget)
- `sessions_spawn` : `task` , `label?` , `runtime?` , `agentId?` , `model?` , `thinking?` , `cwd?` , `runTimeoutSeconds?` , `thread?` , `mode?` , `cleanup?` , `sandbox?` , `streamTo?` , `attachments?` , `attachAs?`
- `session_status` : `sessionKey?` (par défaut actuel ; accepte `sessionId` ), `model?` ( `default` efface la priorité)

Notes :

- `main` est la clé canonique de chat direct ; global/inconnu sont masqués.
- `messageLimit > 0` récupère les N derniers messages par session (messages d'outil filtrés).
- Le ciblage de session est contrôlé par `tools.sessions.visibility` (par défaut `tree` : session actuelle + sessions de sous-agents générés). Si vous exécutez un agent partagé pour plusieurs utilisateurs, envisagez de définir `tools.sessions.visibility: "self"` pour empêcher la navigation inter-sessions.
- `sessions_send` attend l'achèvement final lorsque `timeoutSeconds > 0` .
- La livraison/l'annonce a lieu après l'achèvement et est de type « best-effort » ; `status: "ok"` confirme que l'exécution de l'agent est terminée, et non que l'annonce a été livrée.
- `sessions_spawn` prend en charge `runtime: "subagent" | "acp"` ( `subagent` par défaut). Pour le comportement d'exécution ACP, voir [ACP Agents](/fr/tools/acp-agents).
- Pour le runtime ACP, `streamTo: "parent"` achemine les résumés de progression de l'exécution initiale vers la session du demandeur sous forme d'événements système au lieu d'une livraison enfant directe.
- `sessions_spawn` lance une exécution de sous-agent et publie une réponse d'annonce vers le chat du demandeur.
  - Prend en charge le mode ponctuel ( `mode: "run"` ) et le mode persistant lié au fil ( `mode: "session"` avec `thread: true` ).
  - Si `thread: true` et `mode` sont omis, le mode par défaut est `session`.
  - `mode: "session"` nécessite `thread: true`.
  - Si `runTimeoutSeconds` est omis, OpenClaw utilise `agents.defaults.subagents.runTimeoutSeconds` si défini ; sinon, le délai d'attente par défaut est `0` (pas de délai).
  - Les flux liés aux fils Discord dépendent de `session.threadBindings.*` et `channels.discord.threadBindings.*`.
  - Le format de réponse inclut `Status`, `Result` et des statistiques compactes.
  - `Result` est le texte de complétion de l'assistant ; si absent, le dernier `toolResult` est utilisé en secours.
- Le mode de complétion manuelle envoie d'abord directement, avec une file d'attente de secours et une nouvelle tentative en cas d'échecs transitoires (`status: "ok"` signifie l'exécution terminée, pas l'annonce livrée).
- `sessions_spawn` prend en charge les pièces jointes de fichiers en ligne pour le runtime du sous-agent uniquement (l'ACP les rejette). Chaque pièce jointe possède `name`, `content` et facultatif `encoding` (`utf8` ou `base64`) et `mimeType`. Les fichiers sont matérialisés dans l'espace de travail enfant à `.openclaw/attachments/<uuid>/` avec un fichier de métadonnées `.manifest.json`. L'outil renvoie un reçu avec `count`, `totalBytes`, `sha256` par fichier, et `relDir`. Le contenu de la pièce jointe est automatiquement expurgé de la persistance des transcriptions.
  - Configurez les limites via `tools.sessions_spawn.attachments` (`enabled`, `maxTotalBytes`, `maxFiles`, `maxFileBytes`, `retainOnSessionKeep`).
  - `attachAs.mountPath` est un indice réservé pour les futures implémentations de montage.
- `sessions_spawn` est non bloquant et renvoie `status: "accepted"` immédiatement.
- Les réponses `streamTo: "parent"` de l'ACP peuvent inclure `streamLogPath` (`*.acp-stream.jsonl` avec portée session) pour suivre l'historique de progression.
- `sessions_send` exécute un ping-pong de réponse (répondez `REPLY_SKIP` pour arrêter ; nombre maximum de tours via `session.agentToAgent.maxPingPongTurns`, 0–5).
- Après le ping-pong, l'agent cible exécute une **announce step** (étape d'annonce) ; répondez `ANNOUNCE_SKIP` pour supprimer l'annonce.
- Sandbox clamp : lorsque la session actuelle est sandboxed (isolée) et `agents.defaults.sandbox.sessionToolsVisibility: "spawned"`, OpenClaw limite `tools.sessions.visibility` à `tree`.

### `agents_list`

Listez les IDs d'agents que la session actuelle peut cibler avec `sessions_spawn`.

Notes :

- Le résultat est limité aux listes d'autorisation par agent (`agents.list[].subagents.allowAgents`).
- Lorsque `["*"]` est configuré, l'outil inclut tous les agents configurés et marque `allowAny: true`.

## Paramètres (communs)

Outils pris en charge par Gateway (`canvas`, `nodes`, `cron`) :

- `gatewayUrl` (par défaut `ws://127.0.0.1:18789`)
- `gatewayToken` (si l'authentification est activée)
- `timeoutMs`

Remarque : lorsque `gatewayUrl` est défini, incluez `gatewayToken` explicitement. Les outils n'héritent pas des identifiants de configuration
ou d'environnement pour les remplacements, et l'absence d'identifiants explicites constitue une erreur.

Outil de navigateur :

- `profile` (facultatif ; `browser.defaultProfile` par défaut)
- `target` (`sandbox` | `host` | `node`)
- `node` (facultatif ; épingler un ID/nom de nœud spécifique)
- Guides de troubleshooting :
  - Problèmes de démarrage/CDP Linux : [Browser troubleshooting (Linux)](/fr/tools/browser-linux-troubleshooting)
  - WSL2 Gateway + Chrome distant Windows CDP : [WSL2 + Windows + troubleshooting CDP Chrome distant](/fr/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

## Flux d'agents recommandés

Automatisation du navigateur :

1. `browser` → `status` / `start`
2. `snapshot` (ai ou aria)
3. `act` (clic/tape/appui)
4. `screenshot` si vous avez besoin d'une confirmation visuelle

Rendu Canvas :

1. `canvas` → `present`
2. `a2ui_push` (facultatif)
3. `snapshot`

Ciblage de nœud :

1. `nodes` → `status`
2. `describe` sur le nœud choisi
3. `notify` / `run` / `camera_snap` / `screen_record`

## Sécurité

- Évitez `system.run` direct ; utilisez `nodes` → `run` uniquement avec le consentement explicite de l'utilisateur.
- Respectez le consentement de l'utilisateur pour la capture de caméra/écran.
- Utilisez `status/describe` pour garantir les permissions avant d'invoquer des commandes multimédia.

## Présentation des outils à l'agent

Les outils sont exposés sur deux canaux parallèles :

1. **Texte du prompt système** : une liste lisible par un humain + des directives.
2. **Schéma d'outil** : les définitions de fonctions structurées envoyées au API.

Cela signifie que l'agent voit à la fois « quels outils existent » et « comment les appeler ». Si un outil n'apparaît pas dans le prompt système ou le schéma, le model ne peut pas l'appeler.

import fr from "/components/footer/fr.mdx";

<fr />
