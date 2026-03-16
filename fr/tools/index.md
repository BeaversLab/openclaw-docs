---
summary: "Surface d'agent tool pour OpenClaw (browser, canvas, nodes, message, cron) remplaçant les compétences `openclaw-*` héritées"
read_when:
  - Adding or modifying agent tools
  - Retiring or changing `openclaw-*` skills
title: "Tools"
---

# Tools (OpenClaw)

OpenClaw expose des **tools d'agent de première classe** pour browser, canvas, nodes et cron.
Ces derniers remplment les anciennes compétences `openclaw-*` : les tools sont typés, pas de shelling,
et l'agent doit s'y fier directement.

## Désactivation des tools

Vous pouvez autoriser/interdire globalement les tools via `tools.allow` / `tools.deny` dans `openclaw.json`
(la refus l'emporte). Cela empêche l'envoi des tools non autorisés aux fournisseurs de model.

```json5
{
  tools: { deny: ["browser"] },
}
```

Notes :

- La correspondance ne tient pas compte de la casse.
- Les caractères génériques `*` sont pris en charge (`"*"` signifie tous les tools).
- Si `tools.allow` ne fait référence qu'à des noms de tools de plugin inconnus ou non chargés, OpenClaw enregistre un avertissement et ignore la liste d'autorisation afin que les tools principaux restent disponibles.

## Profils de tool (liste d'autorisation de base)

`tools.profile` définit une **liste d'autorisation de tool de base** avant `tools.allow`/`tools.deny`.
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

Utilisez `tools.byProvider` pour **restreindre davantage** les outils pour des providers spécifiques
(ou un seul `provider/model`) sans modifier vos paramètres globaux par défaut.
Redéfinition par agent : `agents.list[].tools.byProvider`.

Ceci est appliqué **après** le profil d'outil de base et **avant** les listes d'autorisation/de refus,
donc il ne peut que réduire l'ensemble des outils.
Les clés de provider acceptent soit `provider` (ex. `google-antigravity`) soit
`provider/model` (ex. `openai/gpt-5.2`).

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

Les stratégies d'outils (globales, agent, sandbox) prennent en charge les entrées `group:*` qui s'étendent à plusieurs outils.
Utilisez-les dans `tools.allow` / `tools.deny`.

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
- `group:openclaw` : tous les outils OpenClaw intégrés (exclut les plugins de fournisseur)

Exemple (autoriser uniquement les outils de fichier + navigateur) :

```json5
{
  tools: {
    allow: ["group:fs", "browser"],
  },
}
```

## Plugins + outils

Les plugins peuvent enregistrer des **tools supplémentaires** (et des commandes CLI) au-delà de l'ensemble de base.
Voir [Plugins](/fr/tools/plugin) pour l'installation et la configuration, et [Skills](/fr/tools/skills) pour savoir
comment les conseils d'utilisation des tools sont injectés dans les invites. Certains plugins incluent leurs propres skills
avec les tools (par exemple, le plugin d'appel vocal).

Outils de plugin facultatifs :

- [Lobster](/fr/tools/lobster) : runtime de workflow typé avec approbations reprises (nécessite le Lobster CLI sur l'hôte de la passerelle).
- [Tâche LLM](/fr/tools/llm-task) : étape LLM JSON uniquement pour la sortie de workflow structurée (validation de schéma facultative).
- [Diffs](/fr/tools/diffs) : visualiseur de diff en lecture seule et moteur de rendu de fichiers PNG ou PDF pour le texte avant/après ou les correctifs unifiés.

## Inventaire des outils

### `apply_patch`

Appliquer des correctifs structurés sur un ou plusieurs fichiers. Utiliser pour les modifications multi-parties.
Expérimental : activer via `tools.exec.applyPatch.enabled` (modèles OpenAI uniquement).
`tools.exec.applyPatch.workspaceOnly` par défaut à `true` (contenu dans l'espace de travail). Définissez-le sur `false` uniquement si vous voulez intentionnellement que `apply_patch` écrive/supprime en dehors du répertoire de l'espace de travail.

### `exec`

Exécuter des commandes shell dans l'espace de travail.

Paramètres principaux :

- `command` (obligatoire)
- `yieldMs` (arrière-plan automatique après expiration, par défaut 10000)
- `background` (arrière-plan immédiat)
- `timeout` (secondes ; tue le processus s'il est dépassé, par défaut 1800)
- `elevated` (booléen ; exécuter sur l'hôte si le mode élevé est activé/autorisé ; ne change le comportement que lorsque l'agent est CLI)
- `host` (`sandbox | gateway | node`)
- `security` (`deny | allowlist | full`)
- `ask` (`off | on-miss | always`)
- `node` (id/nom du nœud pour `host=node`)
- Besoin d'un vrai TTY ? Définissez `pty: true`.

Notes :

- Renvoie `status: "running"` avec un `sessionId` lorsqu'il est en arrière-plan.
- Utilisez `process` pour interroger/journaliser/écrire/terminer/effacer les sessions d'arrière-plan.
- Si `process` n'est pas autorisé, `exec` s'exécute de manière synchrone et ignore `yieldMs`/`background`.
- `elevated` est conditionné par `tools.elevated` ainsi que toute substitution `agents.list[].tools.elevated` (les deux doivent autoriser) et est un alias pour `host=gateway` + `security=full`.
- `elevated` ne modifie le comportement que lorsque l'agent est sandboxé (sinon, c'est une opération sans effet).
- `host=node` peut cibler une application compagnon macOS ou un hôte de nœud sans tête (`openclaw node run`).
- approbations et listes d'autorisation passerelle/nœud : [Approbations Exec](/fr/tools/exec-approvals).

### `process`

Gérer les sessions d'exécution d'arrière-plan.

Actions principales :

- `list`, `poll`, `log`, `write`, `kill`, `clear`, `remove`

Notes :

- `poll` renvoie la nouvelle sortie et le code de sortie lorsqu'il est terminé.
- `log` prend en charge `offset`/`limit` basés sur les lignes (omettez `offset` pour récupérer les N dernières lignes).
- `process` est délimité par agent ; les sessions des autres agents ne sont pas visibles.

### `loop-detection` (garde-fous de boucle d'appel d'outil)

OpenClaw suit l'historique des appels de tools récents et bloque ou avertit lorsqu'il détecte des boucles répétitives sans progrès.
Activez avec `tools.loopDetection.enabled: true` (par défaut `false`).

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

- `genericRepeat` : modèle d'appel répété avec le même tool et les mêmes paramètres.
- `knownPollNoProgress` : répétition de tools de type polling avec des sorties identiques.
- `pingPong` : alternance de modèles sans progrès `A/B/A/B`.
- Remplacement par agent : `agents.list[].tools.loopDetection`.

### `web_search`

Rechercher sur le web en utilisant Perplexity, Brave, Gemini, Grok ou Kimi.

Paramètres principaux :

- `query` (requis)
- `count` (1–10 ; valeur par défaut issue de `tools.web.search.maxResults`)

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
- Voir [Web tools](/fr/tools/web) pour la configuration.
- Voir [Firecrawl](/fr/tools/firecrawl) pour le repli anti-bot facultatif.

### `browser`

Contrôler le navigateur dédié géré par OpenClaw.

Actions principales :

- `status`, `start`, `stop`, `tabs`, `open`, `focus`, `close`
- `snapshot` (aria/ai)
- `screenshot` (renvoie le bloc image + `MEDIA:<path>`)
- `act` (actions de l'interface utilisateur : cliquer/taper/appuyer/survorer/glisser/sélectionner/remplacer/redimensionner/attendre/évaluer)
- `navigate`, `console`, `pdf`, `upload`, `dialog`

Gestion des profils :

- `profiles` — lister tous les profils de navigateur avec leur statut
- `create-profile` — créer un nouveau profil avec un port alloué automatiquement (ou `cdpUrl`)
- `delete-profile` — arrêter le navigateur, supprimer les données utilisateur, supprimer de la configuration (local uniquement)
- `reset-profile` — tuer le processus orphelin sur le port du profil (local uniquement)

Paramètres communs :

- `profile` (facultatif ; par défaut `browser.defaultProfile`)
- `target` (`sandbox` | `host` | `node`)
- `node` (facultatif ; choisit un id/nom de nœud spécifique)
  Notes :
- Nécessite `browser.enabled=true` (par défaut `true` ; définir `false` pour désactiver).
- Toutes les actions acceptent le paramètre facultatif `profile` pour la prise en charge multi-instance.
- Omettez `profile` pour l'option sécurisée par défaut : navigateur isolé géré par OpenClaw (`openclaw`).
- Utilisez `profile="user"` pour le véritable navigateur de l'hôte local lorsque les connexions/cookies existants importent et que l'utilisateur est présent pour cliquer/approuver toute invite d'attachement.
- Utilisez `profile="chrome-relay"` uniquement pour le flux d'attachement via l'extension Chrome / le bouton de la barre d'outils.
- `profile="user"` et `profile="chrome-relay"` sont réservés à l'hôte ; ne les combinez pas avec les cibles sandbox/node.
- Lorsque `profile` est omis, utilise `browser.defaultProfile` (par défaut `openclaw`).
- Noms de profil : uniquement des caractères alphanumériques en minuscules et des traits d'union (max 64 caractères).
- Plage de ports : 18800-18899 (~100 profils max).
- Les profils distants sont en attachement uniquement (pas de démarrage/arrêt/réinitialisation).
- Si un nœud compatible navigateur est connecté, l'outil peut lui être acheminé automatiquement (sauf si vous épinglez `target`).
- `snapshot` correspond par défaut à `ai` lorsque Playwright est installé ; utilisez `aria` pour l'arbre d'accessibilité.
- `snapshot` prend également en charge les options de rôle-instantané (`interactive`, `compact`, `depth`, `selector`) qui renvoient des références comme `e12`.
- `act` nécessite `ref` de `snapshot` (`12` numérique depuis les instantanés IA, ou `e12` depuis les instantanés de rôle) ; utilisez `evaluate` pour les rares besoins de sélecteur CSS.
- Évitez `act` → `wait` par défaut ; ne l'utilisez que dans des cas exceptionnels (aucun état d'interface utilisateur fiable sur lequel attendre).
- `upload` peut éventuellement transmettre un `ref` pour un clic automatique après l'armement.
- `upload` prend également en charge `inputRef` (référence aria) ou `element` (sélecteur CSS) pour définir `<input type="file">` directement.

### `canvas`

Pilotez le node Canvas (présent, eval, snapshot, A2UI).

Actions principales :

- `present`, `hide`, `navigate`, `eval`
- `snapshot` (renvoie un bloc image + `MEDIA:<path>`)
- `a2ui_push`, `a2ui_reset`

Notes :

- Utilise la passerelle `node.invoke` en arrière-plan.
- Si aucun `node` n'est fourni, l'outil choisit une valeur par défaut (nœud unique connecté ou nœud mac local).
- A2UI est uniquement en v0.8 (pas de `createSurface`) ; le CLI rejette le JSONL v0.9 avec des erreurs de ligne.
- Test rapide : `openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"`.

### `nodes`

Découvrez et ciblez les nœuds couplés ; envoyez des notifications ; capturez la caméra/l'écran.

Actions principales :

- `status`, `describe`
- `pending`, `approve`, `reject` (couplage)
- `notify` (macOS `system.notify`)
- `run` (macOS `system.run`)
- `camera_list`, `camera_snap`, `camera_clip`, `screen_record`
- `location_get`, `notifications_list`, `notifications_action`
- `device_status`, `device_info`, `device_permissions`, `device_health`

Notes :

- Les commandes de caméra/écran nécessitent que l'application nœud soit au premier plan.
- Les images renvoient des blocs d'image + `MEDIA:<path>`.
- Les vidéos renvoient `FILE:<path>` (mp4).
- L'emplacement renvoie une charge utile JSON (lat/lon/accuracy/timestamp).
- `run` paramètres : tableau `command` argv ; `cwd`, `env` (`KEY=VAL`), `commandTimeoutMs`, `invokeTimeoutMs`, `needsScreenRecording` facultatifs.

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

- Disponible uniquement lorsque `agents.defaults.imageModel` est configuré (principal ou secours), ou lorsqu'un modèle d'image implicite peut être déduit de votre modèle par défaut + authentification configurée (couplage de meilleur effort).
- Utilise directement le modèle d'image (indépendamment du modèle de chat principal).

### `pdf`

Analyser un ou plusieurs documents PDF.

Pour le comportement complet, les limites, la configuration et les exemples, consultez [PDF tool](/fr/tools/pdf).

### `message`

Envoyer des messages et des actions de chaîne sur Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/iMessage/MS Teams.

Actions principales :

- `send` (texte + média facultatif ; MS Teams prend également en charge `card` pour les cartes adaptatives)
- `poll` (sondages WhatsApp/Discord/MS Teams)
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

- `send` achemine WhatsApp via le Gateway ; les autres canaux sont directs.
- `poll` utilise le Gateway pour WhatsApp et MS Teams ; les sondages Discord sont directs.
- Lorsqu'un appel d'outil de message est lié à une session de chat active, les envois sont limités à la cible de cette session pour éviter les fuites inter-contextes.

### `cron`

Gérer les tâches cron et les réveils du Gateway.

Actions principales :

- `status`, `list`
- `add`, `update`, `remove`, `run`, `runs`
- `wake` (mettre en file d'attente l'événement système + battement de cœur immédiat en option)

Notes :

- `add` attend un objet de tâche cron complet (même schéma que `cron.add` RPC).
- `update` utilise `{ jobId, patch }` (`id` accepté pour compatibilité).

### `gateway`

Redémarrez ou appliquez les mises à jour au processus Gateway en cours d'exécution (in-place).

Actions principales :

- `restart` (autorise + envoie `SIGUSR1` pour redémarrage en cours de processus ; `openclaw gateway` redémarre in-place)
- `config.schema.lookup` (inspecter un chemin de configuration à la fois sans charger le schéma complet dans le contexte du prompt)
- `config.get`
- `config.apply` (valider + écrire la config + redémarrer + réveiller)
- `config.patch` (fusionner la mise à jour partielle + redémarrer + réveiller)
- `update.run` (exécuter la mise à jour + redémarrer + réveiller)

Notes :

- `config.schema.lookup` attend un chemin de configuration ciblé tel que `gateway.auth` ou `agents.list.*.heartbeat`.
- Les chemins peuvent inclure des identifiants de plugin séparés par des barres obliques lors de l'adressage de `plugins.entries.<id>`, par exemple `plugins.entries.pack/one.config`.
- Utilisez `delayMs` (par défaut 2000) pour éviter d'interrompre une réponse en cours.
- `config.schema` reste disponible pour les flux internes de l'interface utilisateur de contrôle et n'est pas exposé via l'outil `gateway` de l'agent.
- `restart` est activé par défaut ; définissez `commands.restart: false` pour le désactiver.

### `sessions_list` / `sessions_history` / `sessions_send` / `sessions_spawn` / `session_status`

Lister les sessions, inspecter l'historique des transcriptions ou envoyer à une autre session.

Paramètres principaux :

- `sessions_list` : `kinds?`, `limit?`, `activeMinutes?`, `messageLimit?` (0 = aucun)
- `sessions_history` : `sessionKey` (ou `sessionId`), `limit?`, `includeTools?`
- `sessions_send` : `sessionKey` (ou `sessionId`), `message`, `timeoutSeconds?` (0 = fire-and-forget)
- `sessions_spawn` : `task` , `label?` , `runtime?` , `agentId?` , `model?` , `thinking?` , `cwd?` , `runTimeoutSeconds?` , `thread?` , `mode?` , `cleanup?` , `sandbox?` , `streamTo?` , `attachments?` , `attachAs?`
- `session_status` : `sessionKey?` (défaut actuel ; accepte `sessionId` ), `model?` ( `default` efface la substitution)

Notes :

- `main` est la clé de chat direct canonique ; global/inconnu sont masqués.
- `messageLimit > 0` récupère les N derniers messages par session (messages d'outil filtrés).
- Le ciblage de session est contrôlé par `tools.sessions.visibility` (défaut `tree` : session actuelle + sessions de sous-agent générées). Si vous exécutez un agent partagé pour plusieurs utilisateurs, envisagez de définir `tools.sessions.visibility: "self"` pour éviter la navigation inter-sessions.
- `sessions_send` attend l'achèvement final lorsque `timeoutSeconds > 0` .
- La livraison/annonce se produit après l'achèvement et est au mieux effort ; `status: "ok"` confirme que l'exécution de l'agent est terminée, et non que l'annonce a été livrée.
- `sessions_spawn` prend en charge `runtime: "subagent" | "acp"` ( `subagent` par défaut). Pour le comportement d'exécution ACP, voir [Agents ACP](/fr/tools/acp-agents).
- Pour le runtime ACP, `streamTo: "parent"` achemine les résumés de progression de l'exécution initiale vers la session du demandeur sous forme d'événements système au lieu d'une livraison directe de l'enfant.
- `sessions_spawn` démarre une exécution de sous-agent et publie une réponse d'annonce vers le chat du demandeur.
  - Prend en charge le mode ponctuel ( `mode: "run"` ) et le mode persistant lié au fil ( `mode: "session"` avec `thread: true` ).
  - Si `thread: true` et `mode` sont omis, le mode par défaut est `session`.
  - `mode: "session"` nécessite `thread: true`.
  - Si `runTimeoutSeconds` est omis, OpenClaw utilise `agents.defaults.subagents.runTimeoutSeconds` si défini; sinon, le délai d'expiration par défaut est `0` (pas de délai d'expiration).
  - Les flux liés aux fils de discussion Discord dépendent de `session.threadBindings.*` et `channels.discord.threadBindings.*`.
  - Le format de réponse inclut `Status`, `Result` et des statistiques compactes.
  - `Result` est le texte de complétion de l'assistant; si absent, le dernier `toolResult` est utilisé en secours.
- Le mode de complétion Manuel lance l'envoi directement en premier, avec une file d'attente de secours et une nouvelle tentative en cas d'échecs temporaires (`status: "ok"` signifie exécution terminée, pas annonce livrée).
- `sessions_spawn` prend en charge les pièces jointes de fichiers en ligne pour le runtime du sous-agent uniquement (l'ACP les rejette). Chaque pièce jointe a `name`, `content`, et `encoding` en option (`utf8` ou `base64`) et `mimeType`. Les fichiers sont matérialisés dans l'espace de travail enfant à `.openclaw/attachments/<uuid>/` avec un fichier de métadonnées `.manifest.json`. L'outil renvoie un reçu avec `count`, `totalBytes`, `sha256` par fichier, et `relDir`. Le contenu des pièces jointes est automatiquement expurgé de la persistance des transcriptions.
  - Configurez les limites via `tools.sessions_spawn.attachments` (`enabled`, `maxTotalBytes`, `maxFiles`, `maxFileBytes`, `retainOnSessionKeep`).
  - `attachAs.mountPath` est une indication réservée pour les futures implémentations de montage.
- `sessions_spawn` est non bloquant et renvoie `status: "accepted"` immédiatement.
- Les réponses `streamTo: "parent"` de l'ACP peuvent inclure `streamLogPath` (`*.acp-stream.jsonl` avec portée de session) pour suivre l'historique des progrès.
- `sessions_send` exécute un ping-pong de réponse (répondez `REPLY_SKIP` pour arrêter ; max tours via `session.agentToAgent.maxPingPongTurns`, 0–5).
- Après le ping-pong, l'agent cible exécute une **étape d'annonce** ; répondez `ANNOUNCE_SKIP` pour supprimer l'annonce.
- Étranglement de bac à sable (Sandbox clamp) : lorsque la session actuelle est isolée et `agents.defaults.sandbox.sessionToolsVisibility: "spawned"`, OpenClaw limite `tools.sessions.visibility` à `tree`.

### `agents_list`

Lister les identifiants d'agents que la session actuelle peut cibler avec `sessions_spawn`.

Notes :

- Le résultat est limité aux listes d'autorisation par agent (`agents.list[].subagents.allowAgents`).
- Lorsque `["*"]` est configuré, l'outil inclut tous les agents configurés et marque `allowAny: true`.

## Paramètres (communs)

Outils pris en charge par Gateway (`canvas`, `nodes`, `cron`) :

- `gatewayUrl` (par défaut `ws://127.0.0.1:18789`)
- `gatewayToken` (si auth activée)
- `timeoutMs`

Remarque : lorsque `gatewayUrl` est défini, incluez `gatewayToken` explicitement. Les outils n'héritent pas des identifiants de configuration
ou d'environnement pour les substitutions, et l'absence d'identifiants explicites constitue une erreur.

Outil de navigateur :

- `profile` (facultatif ; par défaut `browser.defaultProfile`)
- `target` (`sandbox` | `host` | `node`)
- `node` (facultatif ; épingler un ID/nom de nœud spécifique)
- Guides de dépannage :
  - Problèmes de démarrage/CDP Linux : [Dépannage du navigateur (Linux)](/fr/tools/browser-linux-troubleshooting)
  - WSL2 Gateway + Chrome distant CDP Windows : [Dépannage WSL2 + Windows + Chrome distant CDP](/fr/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

## Flux d'agents recommandés

Automatisation du navigateur :

1. `browser` → `status` / `start`
2. `snapshot` (ai ou aria)
3. `act` (clic/taper/appuyer)
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
- Utilisez `status/describe` pour vous assurer des autorisations avant d'invoquer des commandes média.

## Présentation des tools à l'agent

Les tools sont exposés sur deux canaux parallèles :

1. **Texte du prompt système** : une liste lisible par l'homme + des conseils.
2. **Schéma de tool** : les définitions de fonctions structurées envoyées à l'API de model.

Cela signifie que l'agent voit à la fois « quels tools existent » et « comment les appeler ». Si un tool n'apparaît pas dans le prompt système ou le schéma, le model ne peut pas l'appeler.

import fr from "/components/footer/fr.mdx";

<fr />
