---
summary: "Exécuter des harnais de codage externes (Claude Code, Cursor, Gemini CLI, Codex ACP explicite, OpenClaw ACP, OpenCode) via le backend ACP"
read_when:
  - Running coding harnesses through ACP
  - Setting up conversation-bound ACP sessions on messaging channels
  - Binding a message-channel conversation to a persistent ACP session
  - Troubleshooting ACP backend, plugin wiring, or completion delivery
  - Operating /acp commands from chat
title: "Agents ACP"
sidebarTitle: "Agents ACP"
---

Les sessions [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) permettent à OpenClaw d'exécuter des harnais de codage externes (par exemple Pi, Claude Code, Cursor, Copilot, Droid, OpenClaw ACP, OpenCode, Gemini CLI et autres harnais ACPX pris en charge) via un plugin backend ACP.

Chaque lancement de session ACP est suivi en tant que [tâche d'arrière-plan](/fr/automation/tasks).

<Note>
**ACP est le chemin de harnais externe, et non le chemin Codex par défaut.** Le plugin natif d'application serveur Codex possède les contrôles `/codex ...` et le runtime intégré `agentRuntime.id: "codex"` ; ACP possède les contrôles `/acp ...` et les sessions `sessions_spawn({ runtime: "acp" })`.

Si vous souhaitez que Codex ou Claude Code se connecte en tant que client MCP externe directement aux conversations de canal OpenClaw existantes, utilisez [`openclaw mcp serve`](/fr/cli/mcp) au lieu d'ACP.

</Note>

## Quelle page me faut-il ?

| Vous souhaitez…                                                                                  | Utiliser ceci                            | Notes                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lier ou contrôler Codex dans la conversation actuelle                                            | `/codex bind`, `/codex threads`          | Chemin d'application serveur natif Codex lorsque le plugin `codex` est activé ; inclut les réponses de chat liées, le transfert d'images, model/fast/permissions, stop et les contrôles steer. ACP est un repli explicite |
| Exécuter Claude Code, Gemini CLI, Codex ACP explicite ou un autre harnais externe _via_ OpenClaw | Cette page                               | Sessions liées au chat, `/acp spawn`, `sessions_spawn({ runtime: "acp" })`, tâches d'arrière-plan, contrôles d'exécution                                                                                                  |
| Exposer une session OpenClaw Gateway _en tant que_ serveur ACP pour un éditeur ou un client      | [`openclaw acp`](/fr/cli/acp)            | Mode pont. L'IDE/le client parle ACP à OpenClaw via stdio/WebSocket                                                                                                                                                       |
| Réutiliser un AI CLI local en tant que modèle de repli texte uniquement                          | [Backends CLI](/fr/gateway/cli-backends) | Pas ACP. Pas d'outils OpenClaw, pas de contrôles ACP, pas de runtime de harnais                                                                                                                                           |

## Est-ce que cela fonctionne hors de la boîte ?

Généralement oui. Les nouvelles installations livrent le plugin d'exécution `acpx` groupé activé par défaut avec un binaire `acpx` épinglé localement au plugin que OpenClaw détecte et répare automatiquement au démarrage. Exécutez `/acp doctor` pour une vérification de l'état de préparation.

OpenClaw n'enseigne aux agents la génération ACP que lorsque l'ACP est **vraiment utilisable** : l'ACP doit être activé, la répartition ne doit pas être désactivée, la session actuelle ne doit pas être bloquée par le bac à sable, et un backend d'exécution doit être chargé. Si ces conditions ne sont pas remplies, les compétences du plugin ACP et les conseils ACP `sessions_spawn` restent masqués pour que l'agent ne suggère pas un backend indisponible.

<AccordionGroup>
  <Accordion title="Pièges de la première exécution">
    - Si `plugins.allow` est défini, il s'agit d'un inventaire de plugins restrictif et il **doit** inclure `acpx` ; sinon, la valeur par défaut groupée est intentionnellement bloquée et `/acp doctor` signale l'entrée de liste d'autorisation manquante.
    - Les adaptateurs de harnais cibles (Codex, Claude, etc.) peuvent être récupérés à la demande avec `npx` la première fois que vous les utilisez.
    - L'authentification du fournisseur doit toujours exister sur l'hôte pour ce harnais.
    - Si l'hôte n'a pas d'accès npm ou réseau, les récupérations d'adaptateurs lors de la première exécution échouent jusqu'à ce que les caches soient préchargés ou que l'adaptateur soit installé d'une autre manière.
  </Accordion>
  <Accordion title="Runtime prerequisites">
    ACP lance un véritable processus de harnais externe. OpenClaw gère le routage,
    l'état des tâches d'arrière-plan, la livraison, les liaisons et les stratégies ; le harnais
    gère sa connexion au fournisseur, son catalogue de modèles, son comportement de système de fichiers et ses
    outils natifs.

    Avant de blâmer OpenClaw, vérifiez :

    - `/acp doctor` signale un backend actif et sain.
    - L'identifiant cible est autorisé par `acp.allowedAgents` lorsque cette liste d'autorisation est définie.
    - La commande du harnais peut démarrer sur l'hôte OpenClaw.
    - L'authentification du fournisseur est présente pour ce harnais (`claude`, `codex`, `gemini`, `opencode`, `droid`, etc.).
    - Le modèle sélectionné existe pour ce harnais — les identifiants de modèle ne sont pas portables entre les harnais.
    - Le `cwd` demandé existe et est accessible, ou omettez `cwd` et laissez le backend utiliser sa valeur par défaut.
    - Le mode d'autorisation correspond au travail. Les sessions non interactives ne peuvent pas cliquer sur les invites d'autorisation natives, donc les exécutions de code intensives en écriture/exécution ont généralement besoin d'un profil d'autorisation ACPX capable de procéder sans interaction.

  </Accordion>
</AccordionGroup>

Les outils du plugin OpenClaw et les outils intégrés de OpenClaw ne sont **pas** exposés aux
harnais ACP par défaut. Activez les ponts MCP explicites dans
[ACP agents — setup](/fr/tools/acp-agents-setup) uniquement lorsque le harnais
doit appeler ces outils directement.

## Cibles de harnais prises en charge

Avec le backend `acpx` fourni, utilisez ces identifiants de harnais comme cibles `/acp spawn <id>`
ou `sessions_spawn({ runtime: "acp", agentId: "<id>" })` :

| Identifiant de harnais | Backend typique                                | Notes                                                                                            |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `claude`               | Adaptateur ACP Claude Code                     | Nécessite une authentification Claude Code sur l'hôte.                                           |
| `codex`                | Adaptateur ACP Codex                           | Repli explicite ACP uniquement lorsque le `/codex` natif est indisponible ou qu'ACP est demandé. |
| `copilot`              | Adaptateur ACP GitHub Copilot                  | Nécessite une authentification Copilot CLI/runtime.                                              |
| `cursor`               | ACP CLI Cursor (`cursor-agent acp`)            | Remplacez la commande acpx si une installation locale expose un point d'entrée ACP différent.    |
| `droid`                | Factory Droid CLI                              | Requires Factory/Droid auth or `FACTORY_API_KEY` in the harness environment.                     |
| `gemini`               | Adaptateur ACP Gemini CLI                      | Requires Gemini CLI auth or API key setup.                                                       |
| `iflow`                | iFlow CLI                                      | Adapter availability and model control depend on the installed CLI.                              |
| `kilocode`             | Kilo Code CLI                                  | Adapter availability and model control depend on the installed CLI.                              |
| `kimi`                 | Kimi/Moonshot CLI                              | Requires Kimi/Moonshot auth on the host.                                                         |
| `kiro`                 | Kiro CLI                                       | Adapter availability and model control depend on the installed CLI.                              |
| `opencode`             | Adaptateur ACP OpenCode                        | Requires OpenCode CLI/provider auth.                                                             |
| `openclaw`             | OpenClaw Gateway bridge through `openclaw acp` | Lets an ACP-aware harness talk back to an OpenClaw Gateway session.                              |
| `pi`                   | Pi/runtime OpenClaw intégré                    | Used for OpenClaw-native harness experiments.                                                    |
| `qwen`                 | Qwen Code / Qwen CLI                           | Requires Qwen-compatible auth on the host.                                                       |

Custom acpx agent aliases can be configured in acpx itself, but OpenClaw
policy still checks `acp.allowedAgents` and any
`agents.list[].runtime.acp.agent` mapping before dispatch.

## Operator runbook

Quick `/acp` flow from chat:

<Steps>
  <Step title="Spawn">
    `/acp spawn claude --bind here`,
    `/acp spawn gemini --mode persistent --thread auto`, or explicit
    `/acp spawn codex --bind here`.
  </Step>
  <Step title="Work">
    Continue in the bound conversation or thread (or target the session
    key explicitly).
  </Step>
  <Step title="Check state">
    `/acp status`
  </Step>
  <Step title="Tune">
    `/acp model <provider/model>`,
    `/acp permissions <profile>`,
    `/acp timeout <seconds>`.
  </Step>
  <Step title="Steer">
    Without replacing context: `/acp steer tighten logging and continue`.
  </Step>
  <Step title="Stop">
    `/acp cancel` (tour actuel) ou `/acp close` (session + liaisons).
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Détails du cycle de vie">
    - Spawn crée ou reprend une session d'exécution ACP, enregistre les métadonnées ACP dans le magasin de sessions OpenClaw et peut créer une tâche d'arrière-plan lorsque l'exécution est détenue par le parent.
    - Les messages de suivi liés vont directement à la session ACP jusqu'à ce que la liaison soit fermée, désactivée, réinitialisée ou expirée.
    - Les commandes Gateway restent locales. `/acp ...`, `/status` et `/unfocus` ne sont jamais envoyés en tant que texte d'invite normal à un harnais ACP lié.
    - `cancel` abandonne le tour actuel lorsque le backend prend en charge l'annulation ; il ne supprime pas la liaison ni les métadonnées de session.
    - `close` met fin à la session ACP du point de vue de OpenClaw et supprime la liaison. Un harnais peut toujours conserver son propre historique en amont s'il prend en charge la reprise.
    - Les workers d'exécution inactifs sont éligibles au nettoyage après `acp.runtime.ttlMinutes` ; les métadonnées de session stockées restent disponibles pendant `/acp sessions`.
  </Accordion>
  <Accordion title="Règles de routage Codex natif">
    Déclencheurs en langage naturel qui doivent être acheminés vers le **plugin Codex
    natif** lorsqu'il est activé :

    - "Lier ce Discord channel à Codex."
    - "Attacher ce chat au fil de discussion Codex `<id>`."
    - "Afficher les fils Codex, puis lier celui-ci."

    La liaison de conversation Codex native est le chemin de contrôle de chat par défaut.
    Les outils dynamiques OpenClaw s'exécutent toujours via OpenClaw, tandis que
    les outils natifs Codex tels que shell/apply-patch s'exécutent dans Codex.
    Pour les événements d'outil natifs Codex, OpenClaw injecte un relais de hook natif par tour
    afin que les hooks de plugin puissent bloquer `before_tool_call`, observer
    `after_tool_call` et acheminer les événements Codex `PermissionRequest`
    via les approbations OpenClaw. Les hooks Codex `Stop` sont relayés à
    OpenClaw `before_agent_finalize`, où les plugins peuvent demander une passe de
    model supplémentaire avant que Codex ne finalise sa réponse. Le relais reste
    délibérément conservateur : il ne mute pas les arguments d'outil natifs Codex
    et ne réécrit pas les enregistrements de fils Codex. Utilisez l'ACP explicite uniquement
    lorsque vous souhaitez le modèle d'exécution/session ACP. La limite de support Codex
    intégrée est documentée dans le
    [Contrat de support du harnais Codex v1](/fr/plugins/codex-harness#v1-support-contract).

  </Accordion>
  <Accordion title="Aide-memoire de sélection Model / provider / runtime">
    - `openai-codex/*` — itinéraire d'abonnement/OAuth PI Codex.
    - `openai/*` plus `agentRuntime.id: "codex"` — runtime intégré app-server Codex natif.
    - `/codex ...` — contrôle de conversation Codex natif.
    - `/acp ...` ou `runtime: "acp"` — contrôle explicite ACP/acpx.
  </Accordion>
  <Accordion title="Déclencheurs de langage naturel pour le routage ACP">
    Déclencheurs qui doivent être acheminés vers le runtime ACP :

    - « Exécuter ceci en tant que session ACP Claude Code ponctuelle et résumer le résultat. »
    - « Utiliser Gemini CLI pour cette tâche dans un fil, puis conserver les suivis dans ce même fil. »
    - « Exécuter Codex via ACP dans un fil d'arrière-plan. »

    OpenClaw sélectionne `runtime: "acp"`, résout le harnais `agentId`,
    se lie à la conversation ou au fil actuel lorsque pris en charge, et
    achemine les suivis vers cette session jusqu'à la fermeture ou l'expiration. Codex ne suit ce chemin que lorsque ACP/acpx est explicite ou que le plugin natif Codex n'est pas disponible pour l'opération demandée.

    Pour `sessions_spawn`, `runtime: "acp"` n'est annoncé que lorsque ACP
    est activé, que le demandeur n'est pas sandboxé, et qu'un backend
    d'exécution ACP est chargé. `acp.dispatch.enabled=false` met en pause la
    répartition automatique des fils ACP mais ne masque ni ne bloque les appels explicites `sessions_spawn({ runtime: "acp" })`. Il cible les identifiants de harnais ACP tels que `codex`,
    `claude`, `droid`, `gemini` ou `opencode`. Ne transmettez pas un identifiant d'agent de configuration OpenClaw normal depuis `agents_list` sauf si cette entrée est explicitement configurée avec `agents.list[].runtime.type="acp"` ;
    sinon, utilisez le runtime de sous-agent par défaut. Lorsqu'un agent OpenClaw est configuré avec `runtime.type="acp"`, OpenClaw utilise `runtime.acp.agent` comme identifiant de harnais sous-jacent.

  </Accordion>
</AccordionGroup>

## ACP par rapport aux sous-agents

Utilisez ACP lorsque vous souhaitez un runtime de harnais externe. Utilisez le **serveur d'application natif Codex** pour la liaison/le contrôle de conversation Codex lorsque le plugin `codex` est activé. Utilisez les **sous-agents** lorsque vous souhaitez des exécutions déléguées natives OpenClaw.

| Zone                  | Session ACP                           | Exécution de sous-agent               |
| --------------------- | ------------------------------------- | ------------------------------------- |
| Runtime               | Plugin backend ACP (par exemple acpx) | Runtime de sous-agent natif OpenClaw  |
| Clé de session        | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>`     |
| Commandes principales | `/acp ...`                            | `/subagents ...`                      |
| Outil de lancement    | `sessions_spawn` avec `runtime:"acp"` | `sessions_spawn` (runtime par défaut) |

Voir aussi [Sous-agents](/fr/tools/subagents).

## Fonctionnement d'ACP avec Claude Code

Pour Claude Code via ACP, la pile est la suivante :

1. Plan de contrôle de session ACP OpenClaw.
2. Plugin d'exécution `acpx` groupé.
3. Adaptateur ACP Claude.
4. Mécanisme d'exécution/session côté Claude.

ACP Claude est une **session de harnais** avec des contrôles ACP, la reprise de session, le suivi des tâches en arrière-plan et une liaison facultative de conversation/fil.

Les backends CLI sont des runtimes de repli locaux texte-only distincts — voir [Backends CLI](/fr/gateway/cli-backends).

Pour les opérateurs, la règle pratique est :

- **Vous voulez `/acp spawn`, des sessions liables, des contrôles d'exécution ou un travail de harnais persistant ?** Utilisez ACP.
- **Vous voulez un repli texte local simple via le CLI brut ?** Utilisez les backends CLI.

## Sessions liées

### Modèle mental

- **Surface de chat** — l'endroit où les gens continuent de discuter (channel Discord, sujet Telegram, chat iMessage).
- **Session ACP** — l'état d'exécution durable Codex/Claude/Gemini vers lequel OpenClaw achemine.
- **Fil de discussion/sujet enfant** — une surface de messagerie supplémentaire facultative créée uniquement par `--thread ...`.
- **Espace de travail d'exécution** — l'emplacement du système de fichiers (`cwd`, extraction de repo, espace de travail backend) où le harnais s'exécute. Indépendant de la surface de chat.

### Liaisons de conversation actuelle

`/acp spawn <harness> --bind here` épingler la conversation actuelle à la session ACP générée — pas de fil enfant, même surface de chat. OpenClaw conserve la propriété du transport, de l'auth, de la sécurité et de la livraison. Les messages de suivi dans cette conversation sont acheminés vers la même session ; `/new` et `/reset` réinitialisent la session sur place ; `/acp close` supprime la liaison.

Exemples :

```text
/codex bind                                              # native Codex bind, route future messages here
/codex model gpt-5.4                                     # tune the bound native Codex thread
/codex stop                                              # control the active native Codex turn
/acp spawn codex --bind here                             # explicit ACP fallback for Codex
/acp spawn codex --thread auto                           # may create a child thread/topic and bind there
/acp spawn codex --bind here --cwd /workspace/repo       # same chat binding, Codex runs in /workspace/repo
```

<AccordionGroup>
  <Accordion title="Règles de liaison et exclusivité">
    - `--bind here` et `--thread ...` s'excluent mutuellement.
    - `--bind here` fonctionne uniquement sur les canaux qui annoncent une liaison à la conversation en cours ; OpenClaw renvoie un message clair indiquant l'absence de prise en charge sinon. Les liaisons persistent après les redémarrages du gateway.
    - Sur Discord, `spawnAcpSessions` n'est requis que lorsque OpenClaw a besoin de créer un fil de discussion enfant pour `--thread auto|here` — et non pour `--bind here`.
    - Si vous effectuez un spawn vers un autre agent ACP sans `--cwd`, OpenClaw hérite par défaut de l'espace de travail de **l'agent cible**. Les chemins hérités manquants (`ENOENT`/`ENOTDIR`) reviennent par défaut au backend ; les autres erreurs d'accès (par exemple `EACCES`) apparaissent comme des erreurs de spawn.
    - Les commandes de gestion du Gateway restent locales dans les conversations liées — les commandes `/acp ...` sont gérées par OpenClaw même lorsque le texte de suivi normal est acheminé vers la session ACP liée ; `/status` et `/unfocus` restent également locales chaque fois que la gestion des commandes est activée pour cette surface.
  </Accordion>
  <Accordion title="Sessions liées aux fils de discussion">
    Lorsque les liaisons de fils de discussion sont activées pour un adaptateur de canal :

    - OpenClaw lie un fil de discussion à une session ACP cible.
    - Les messages de suivi dans ce fil sont acheminés vers la session ACP liée.
    - La sortie ACP est renvoyée vers le même fil de discussion.
    - La perte de focus, la fermeture, l'archivage, l'expiration du délai d'inactivité ou l'expiration de la durée de vie maximale supprime la liaison.
    - `/acp close`, `/acp cancel`, `/acp status`, `/status` et `/unfocus` sont des commandes Gateway, et non des invites pour le harnais ACP.

    Indicateurs de fonctionnalités requis pour l'ACP liée aux fils de discussion :

    - `acp.enabled=true`
    - `acp.dispatch.enabled` est activé par défaut (définissez `false` pour suspendre l'expédition automatique des fils ACP ; les appels explicites `sessions_spawn({ runtime: "acp" })` fonctionnent toujours).
    - Indicateur de création de fil ACP par adaptateur de canal activé (spécifique à l'adaptateur) :
      - Discord : `channels.discord.threadBindings.spawnAcpSessions=true`
      - Telegram : `channels.telegram.threadBindings.spawnAcpSessions=true`

    La prise en charge de la liaison de fil est spécifique à l'adaptateur. Si l'adaptateur de canal actif ne prend pas en charge les liaisons de fils, OpenClaw renvoie un message clair indiquant que la fonctionnalité n'est pas prise en charge ou indisponible.

  </Accordion>
  <Accordion title="Canaux prenant en charge les fils">
    - Tout adaptateur de canal qui expose la capacité de liaison de session/fil.
    - Prise en charge intégrée actuelle : fils/canaux **Discord**, sujets **Telegram** (sujets de forum dans les groupes/super-groupes et sujets DM).
    - Les canaux de plug-ins peuvent ajouter une prise en charge via la même interface de liaison.
  </Accordion>
</AccordionGroup>

## Liaisons de canal persistantes

Pour les workflows non éphémères, configurez les liaisons ACP persistantes dans les entrées `bindings[]` de niveau supérieur.

### Modèle de liaison

<ParamField path="bindings[].type" type='"acp"'>
  Marque une liaison de conversation ACP persistante.
</ParamField>
<ParamField path="bindings[].match" type="object">
  Identifie la conversation cible. Formes par canal :

- **Canal/fil Discord :** `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
- **Sujet de forum Telegram :** `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- **DM/groupe BlueBubbles :** `match.channel="bluebubbles"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`. Préférez `chat_id:*` ou `chat_identifier:*` pour des liaisons de groupe stables.
- **DM/groupe iMessage :** `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`. Préférez `chat_id:*` pour des liaisons de groupe stables.
  </ParamField>
<ParamField path="bindings[].agentId" type="string">
L'id de l'agent OpenClaw propriétaire.
</ParamField>
<ParamField path="bindings[].acp.mode" type='"persistent" | "oneshot"'>
Surcharge ACP facultative.
</ParamField>
<ParamField path="bindings[].acp.label" type="string">
Libellé orienté opérateur facultatif.
</ParamField>
<ParamField path="bindings[].acp.cwd" type="string">
Répertoire de travail d'exécution facultatif.
</ParamField>
<ParamField path="bindings[].acp.backend" type="string">
Surcharge de backend facultative.
</ParamField>

### Runtime defaults per agent

Use `agents.list[].runtime` to define ACP defaults once per agent:

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` (harness id, e.g. `codex` or `claude`)
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

**Override precedence for ACP bound sessions:**

1. `bindings[].acp.*`
2. `agents.list[].runtime.acp.*`
3. Global ACP defaults (e.g. `acp.backend`)

### Example

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
      {
        id: "claude",
        runtime: {
          type: "acp",
          acp: { agent: "claude", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
    {
      type: "acp",
      agentId: "claude",
      match: {
        channel: "telegram",
        accountId: "default",
        peer: { kind: "group", id: "-1001234567890:topic:42" },
      },
      acp: { cwd: "/workspace/repo-b" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "discord", accountId: "default" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "telegram", accountId: "default" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": { requireMention: false },
          },
        },
      },
    },
    telegram: {
      groups: {
        "-1001234567890": {
          topics: { "42": { requireMention: false } },
        },
      },
    },
  },
}
```

### Behavior

- OpenClaw ensures the configured ACP session exists before use.
- Messages in that channel or topic route to the configured ACP session.
- In bound conversations, `/new` and `/reset` reset the same ACP session key in place.
- Temporary runtime bindings (for example created by thread-focus flows) still apply where present.
- For cross-agent ACP spawns without an explicit `cwd`, OpenClaw inherits the target agent workspace from agent config.
- Missing inherited workspace paths fall back to the backend default cwd; non-missing access failures surface as spawn errors.

## Start ACP sessions

Two ways to start an ACP session:

<Tabs>
  <Tab title="From sessions_spawn">
    Utilisez `runtime: "acp"` pour démarrer une session ACP à partir d'un tour d'agent ou
    d'un appel de tool.

    ```json
    {
      "task": "Open the repo and summarize failing tests",
      "runtime": "acp",
      "agentId": "codex",
      "thread": true,
      "mode": "session"
    }
    ```

    <Note>
    `runtime` est `subagent` par défaut, définissez donc `runtime: "acp"` explicitement
    pour les sessions ACP. Si `agentId` est omis, OpenClaw utilise
    `acp.defaultAgent` lorsque configuré. `mode: "session"` nécessite
    `thread: true` pour conserver une conversation liée persistante.
    </Note>

  </Tab>
  <Tab title="From /acp command">
    Utilisez `/acp spawn` pour un contrôle explicite de l'opérateur depuis le chat.

    ```text
    /acp spawn codex --mode persistent --thread auto
    /acp spawn codex --mode oneshot --thread off
    /acp spawn codex --bind here
    /acp spawn codex --thread here
    ```

    Principaux indicateurs :

    - `--mode persistent|oneshot`
    - `--bind here|off`
    - `--thread auto|here|off`
    - `--cwd <absolute-path>`
    - `--label <name>`

    Voir [Slash commands](/fr/tools/slash-commands).

  </Tab>
</Tabs>

### paramètres `sessions_spawn`

<ParamField path="task" type="string" required>
  Invite initiale envoyée à la session ACP.
</ParamField>
<ParamField path="runtime" type='"acp"' required>
  Doit être `"acp"` pour les sessions ACP.
</ParamField>
<ParamField path="agentId" type="string">
  ID du harnais cible ACP. Revient à `acp.defaultAgent` si défini.
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  Demander le flux de liaison du fil de discussion lorsque pris en charge.
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  `"run"` est ponctuel ; `"session"` est persistant. Si `thread: true` et
  `mode` sont omis, OpenClaw peut revenir par défaut à un comportement persistant selon
  le chemin d'exécution. `mode: "session"` nécessite `thread: true`.
</ParamField>
<ParamField path="cwd" type="string">
  Répertoire de travail d'exécution demandé (validé par la stratégie
  backend/runtime). S'il est omis, le spawning ACP hérite de l'espace de travail de l'agent cible
  lorsqu'il est configuré ; les chemins hérités manquants reviennent aux valeurs par défaut du backend,
  tandis que les erreurs d'accès réelles sont renvoyées.
</ParamField>
<ParamField path="label" type="string">
  Libellé orienté opérateur utilisé dans le texte de la session/bannière.
</ParamField>
<ParamField path="resumeSessionId" type="string">
  Reprend une session ACP existante au lieu d'en créer une nouvelle. L'agent
  rejoue son historique de conversation via `session/load`. Nécessite
  `runtime: "acp"`.
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  `"parent"` diffuse les résumés de progression de l'exécution ACP initiale vers la
  session demandrice sous forme d'événements système. Les réponses acceptées incluent
  `streamLogPath` pointant vers un journal JSONL délimité à la session
  (`<sessionId>.acp-stream.jsonl`) que vous pouvez suivre pour l'historique de relais complet.
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  Abandonne le tour enfant ACP après N secondes. `0` conserve le tour sur
  le chemin sans délai d'expiration de la passerelle. La même valeur est appliquée à l'exécution Gateway
  et au runtime ACP afin que les harnais bloqués ou épuisant leur quota n'occupent
  pas indéfiniment la voie de l'agent parent.
</ParamField>
<ParamField path="model" type="string">
  Remplacement explicite de model pour la session enfant ACP. Les spawns Codex ACP
  normalisent les références Codex OpenClaw telles que `openai-codex/gpt-5.4` vers la configuration
  de démarrage Codex ACP avant `session/new` ; les formes avec barre oblique telles que
  `openai-codex/gpt-5.4/high` définissent également l'effort de raisonnement Codex ACP.
  Les autres harnais doivent annoncer l'ACP `models` et prendre en charge
  `session/set_model` ; sinon OpenClaw/acpx échoue clairement au lieu de
  revenir silencieusement à la valeur par défaut de l'agent cible.
</ParamField>
<ParamField path="thinking" type="string">
  Effort de réflexion/raisonnement explicite. Pour Codex ACP, `minimal` correspond à
  un faible effort, `low`/`medium`/`high`/`xhigh` correspondent directement, et `off`
  omet le remplacement au démarrage de l'effort de raisonnement.
</ParamField>

## Modes de liaison et de thread de spawn

<Tabs>
  <Tab title="--bind here|off">
    | Mode   | Comportement                                                               |
    | ------ | -------------------------------------------------------------------------- |
    | `here` | Lie la conversation active actuelle sur place ; échoue si aucune n'est active. |
    | `off`  | Ne crée pas de liaison avec la conversation actuelle.                          |

    Notes :

    - `--bind here` est le chemin d'exploitation le plus simple pour « rendre ce channel ou chat pris en charge par Codex ».
    - `--bind here` ne crée pas de thread enfant.
    - `--bind here` n'est disponible que sur les channels qui exposent une prise en charge de la liaison de conversation actuelle.
    - `--bind` et `--thread` ne peuvent pas être combinés dans le même appel `/acp spawn`.

  </Tab>
  <Tab title="--thread auto|here|off">
    | Mode   | Comportement                                                                                            |
    | ------ | ------------------------------------------------------------------------------------------------------- |
    | `auto` | Dans un thread actif : lie ce thread. En dehors d'un thread : crée/lie un thread enfant si pris en charge. |
    | `here` | Nécessite le thread actif actuel ; échoue si on n'est pas dans un thread.                                                  |
    | `off`  | Aucune liaison. La session démarre non liée.                                                                 |

    Notes :

    - Sur les surfaces sans liaison de thread, le comportement par défaut est effectivement `off`.
    - Le spawn lié à un thread nécessite une prise en charge de la stratégie de channel :
      - Discord : `channels.discord.threadBindings.spawnAcpSessions=true`
      - Telegram : `channels.telegram.threadBindings.spawnAcpSessions=true`
    - Utilisez `--bind here` lorsque vous souhaitez épingler la conversation actuelle sans créer de thread enfant.

  </Tab>
</Tabs>

## Modèle de livraison

Les sessions ACP peuvent être des espaces de travail interactifs ou un travail d'arrière-plan appartenant au parent. Le chemin de livraison dépend de cette forme.

<AccordionGroup>
  <Accordion title="Sessions ACP interactives">
    Les sessions interactives sont destinées à poursuivre la conversation sur une surface de chat visible :

    - `/acp spawn ... --bind here` lie la conversation actuelle à la session ACP.
    - `/acp spawn ... --thread ...` lie un fil/sujet de channel à la session ACP.
    - Les `bindings[].type="acp"` configurés de manière persistante acheminent les conversations correspondantes vers la même session ACP.

    Les messages de suivi dans la conversation liée sont acheminés directement vers la session ACP, et la sortie de l'ACP est renvoyée vers le même channel/fil/sujet.

    Ce que OpenClaw envoie au harnais :

    - Les suivis liés normaux sont envoyés sous forme de texte d'invite, plus des pièces jointes uniquement lorsque le harnais/le backend les prend en charge.
    - Les commandes de gestion `/acp` et les commandes locales de la Gateway sont interceptées avant l'acheminement ACP.
    - Les événements de achèvement générés lors de l'exécution sont matérialisés par cible. Les agents OpenClaw reçoivent l'enveloppe de contexte d'exécution interne de OpenClaw ; les harnais ACP externes reçoivent une invite simple avec le résultat enfant et l'instruction. L'enveloppe brute `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>` ne doit jamais être envoyée aux harnais externes ou persistée en tant que texte de transcription utilisateur ACP.
    - Les entrées de transcription ACP utilisent le texte de déclenchement visible par l'utilisateur ou l'invite de achèvement simple. Les métadonnées d'événement internes restent structurées dans OpenClaw autant que possible et ne sont pas traitées comme du contenu de chat rédigé par l'utilisateur.

  </Accordion>
  <Accordion title="Sessions ACP ponctuelles détenues par le parent">
    Les sessions ACP ponctuelles générées par une autre exécution d'agent sont des enfants d'arrière-plan, similaires aux sous-agents :

    - Le parent demande du travail avec `sessions_spawn({ runtime: "acp", mode: "run" })`.
    - L'enfant s'exécute dans sa propre session de harnais ACP.
    - Les tours de l'enfant s'exécutent sur la même voie d'arrière-plan utilisée par les générations de sous-agents natifs, donc un harnais ACP lent ne bloque pas le travail de la session principale non lié.
    - L'achèvement est signalé via le chemin d'annonce de fin de tâche. OpenClaw convertit les métadonnées d'achèvement internes en une invite ACP simple avant de l'envoyer à un harnais externe, donc les harnais ne voient pas les marqueurs de contexte d'exécution propres à OpenClaw.
    - Le parent réécrit le résultat de l'enfant dans une voix d'assistant normale lorsqu'une réponse visible par l'utilisateur est utile.

    Ne **pas** traiter ce chemin comme une conversation de pair à pair entre le parent
    et l'enfant. L'enfant a déjà un canal d'achèvement retour vers le
    parent.

  </Accordion>
  <Accordion title="sessions_send et livraison A2A">
    `sessions_send` peut cibler une autre session après la génération. Pour les sessions pairs normales, OpenClaw utilise un chemin de suivi d'agent à agent (A2A)
    après l'injection du message :

    - Attendre la réponse de la session cible.
    - Optionnellement laisser le demandeur et la cible échanger un nombre borné de tours de suivi.
    - Demander à la cible de produire un message d'annonce.
    - Livrer cette annonce au canal ou au fil visible.

    Ce chemin A2A est un repli pour les envois entre pairs où l'expéditeur a besoin d'un
    suivi visible. Il reste activé lorsqu'une session sans relation peut
    voir et envoyer un message à une cible ACP, par exemple sous des paramètres `tools.sessions.visibility` larges.

    OpenClaw ignore le suivi A2A uniquement lorsque le demandeur est le
    parent de son propre enfant ACP ponctuel détenu par le parent. Dans ce cas,
    exécuter A2A par-dessus l'achèvement de la tâche peut réveiller le parent avec le
    résultat de l'enfant, transférer la réponse du parent vers l'enfant, et
    créer une boucle d'écho parent/enfant. Le résultat `sessions_send` signale
    `delivery.status="skipped"` pour ce cas d'enfant détenu car le
    chemin d'achèvement est déjà responsable du résultat.

  </Accordion>
  <Accordion title="Reprendre une session existante">
    Utilisez `resumeSessionId` pour continuer une session ACP précédente au lieu de
    recommencer à zéro. L'agent rejoue son historique de conversation via
    `session/load`, il reprend donc avec le contexte complet de ce qui s'est passé auparavant.

    ```json
    {
      "task": "Continue where we left off — fix the remaining test failures",
      "runtime": "acp",
      "agentId": "codex",
      "resumeSessionId": "<previous-session-id>"
    }
    ```

    Cas d'usage courants :

    - Transférer une session Codex de votre ordinateur portable vers votre téléphone — demandez à votre agent de reprendre là où vous vous êtes arrêté.
    - Continuer une session de codage démarrée de manière interactive dans le CLI, désormais en mode headless via votre agent.
    - Reprendre le travail qui a été interrompu par un redémarrage de la passerelle ou un délai d'inactivité.

    Notes :

    - `resumeSessionId` ne s'applique que lorsque `runtime: "acp"`; le runtime du sous-agent par défaut ignore ce champ spécifique à l'ACP.
    - `streamTo` ne s'applique que lorsque `runtime: "acp"`; le runtime du sous-agent par défaut ignore ce champ spécifique à l'ACP.
    - `resumeSessionId` est un ID de reprise ACP/harness local à l'hôte, et non une clé de session de OpenClaw channel; OpenClaw vérifie toujours la stratégie de spawn ACP et la stratégie de l'agent cible avant l'expédition, tandis que le backend ACP ou le harness possède l'autorisation pour le chargement de cet ID en amont.
    - `resumeSessionId` restaure l'historique de conversation ACP en amont; `thread` et `mode` s'appliquent toujours normalement à la nouvelle session OpenClaw que vous créez, donc `mode: "session"` nécessite toujours `thread: true`.
    - L'agent cible doit prendre en charge `session/load` (Codex et Claude Code le font).
    - Si l'ID de session n'est pas trouvé, le spawn échoue avec une erreur claire — pas de repli silencieux vers une nouvelle session.

  </Accordion>
  <Accordion title="Post-deploy smoke test">
    Après un déploiement de passerelle, effectuez une vérification de bout en bout en direct plutôt que de faire confiance aux tests unitaires :

    1. Vérifiez la version déployée de la passerelle et le commit sur l'hôte cible.
    2. Ouvrez une session de pont ACPX temporaire vers un agent en direct.
    3. Demandez à cet agent d'appeler `sessions_spawn` avec `runtime: "acp"`, `agentId: "codex"`, `mode: "run"`, et la tâche `Reply with exactly LIVE-ACP-SPAWN-OK`.
    4. Vérifiez `accepted=yes`, un `childSessionKey` réel, et aucune erreur de validateur.
    5. Nettoyez la session de pont temporaire.

    Gardez la porte sur `mode: "run"` et sautez `streamTo: "parent"` —
    les chemins `mode: "session"` liés aux threads et de relais de flux sont des passes d'intégration plus riches et séparées.

  </Accordion>
</AccordionGroup>

## Compatibilité du bac à sable

Les sessions ACP s'exécutent actuellement sur l'exécutable de l'hôte, **pas** à l'intérieur du
OpenClaw bac à sable.

<Warning>
**Limite de sécurité :**

- Le harnais externe peut lire/écrire en fonction de ses propres autorisations CLI et du `cwd` sélectionné.
- La stratégie de bac à sable d'OpenClaw **ne** couvre **pas** l'exécution du harnais ACP.
- OpenClaw applique toujours les portes de fonctionnalités ACP, les agents autorisés, la propriété de la session, les liaisons de canal et la stratégie de livraison Gateway.
- Utilisez `runtime: "subagent"` pour le travail natif d'OpenClaw appliqué par le bac à sable.
  </Warning>

Limitations actuelles :

- Si la session demandeur est isolée, les créations ACP sont bloquées pour `sessions_spawn({ runtime: "acp" })` et `/acp spawn`.
- `sessions_spawn` avec `runtime: "acp"` ne prend pas en charge `sandbox: "require"`.

## Résolution de la cible de session

La plupart des actions `/acp` acceptent une cible de session facultative (`session-key`,
`session-id` ou `session-label`).

**Ordre de résolution :**

1. Argument de cible explicite (ou `--session` pour `/acp steer`)
   - clé d'essais
   - puis l'identifiant de session de forme UUID
   - puis l'étiquette
2. Liaison de fil actuelle (si cette conversation/fil est liée à une session ACP).
3. Repli de la session du demandeur actuel.

Les liaisons de conversation actuelle et les liaisons de fil de discussion participent toutes deux à l'étape 2.

Si aucune cible n'est résolue, OpenClaw renvoie une erreur claire (`Unable to resolve session target: ...`).

## Contrôles ACP

| Commande             | Ce qu'elle fait                                                                     | Exemple                                                       |
| -------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | Créer une session ACP ; liaison actuelle ou liaison de fil de discussion en option. | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | Annuler le tour en cours pour la session cible.                                     | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | Envoyer une instruction de guidage à la session en cours d'exécution.               | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | Fermer la session et dissocier les cibles de fil de discussion.                     | `/acp close`                                                  |
| `/acp status`        | Afficher le backend, le mode, l'état, les options d'exécution, les capacités.       | `/acp status`                                                 |
| `/acp set-mode`      | Définir le mode d'exécution pour la session cible.                                  | `/acp set-mode plan`                                          |
| `/acp set`           | Écriture générique d'option de configuration d'exécution.                           | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | Définir le remplacement du répertoire de travail d'exécution.                       | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | Définir le profil de stratégie d'approbation.                                       | `/acp permissions strict`                                     |
| `/acp timeout`       | Définir le délai d'expiration d'exécution (secondes).                               | `/acp timeout 120`                                            |
| `/acp model`         | Définir le remplacement du modèle d'exécution.                                      | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | Supprimer les remplacements des options d'exécution de session.                     | `/acp reset-options`                                          |
| `/acp sessions`      | Lister les sessions ACP récentes du stock.                                          | `/acp sessions`                                               |
| `/acp doctor`        | Santé du backend, capacités, correctifs actionnables.                               | `/acp doctor`                                                 |
| `/acp install`       | Imprimer les étapes d'installation et d'activation déterministes.                   | `/acp install`                                                |

`/acp status` affiche les options d'exécution effectives ainsi que les identifiants de session au niveau de l'exécution et du backend. Les erreurs de contrôle non prises en charge apparaissent clairement lorsqu'un backend manque d'une capacité. `/acp sessions` lit le stockage pour la session liée actuelle ou la session demandante ; les jetons cibles (`session-key`, `session-id`, ou `session-label`) sont résolus via la découverte de session de la passerelle, y compris les racines `session.store` personnalisées par agent.

### Mappage des options d'exécution

`/acp` dispose de commandes pratiques et d'un paramètre générique. Opérations équivalentes :

| Commande                     | Correspond à                                       | Notes                                                                                                                                                                                                        |
| ---------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/acp model <id>`            | clé de configuration d'exécution `model`           | Pour Codex ACP, OpenClaw normalise `openai-codex/<model>` vers l'ID du modèle d'adaptateur et mappe les suffixes de raisonnement de type slash tels que `openai-codex/gpt-5.4/high` vers `reasoning_effort`. |
| `/acp set thinking <level>`  | clé de configuration d'exécution `thinking`        | Pour Codex ACP, OpenClaw envoie le `reasoning_effort` correspondant lorsque l'adaptateur en prend en charge un.                                                                                              |
| `/acp permissions <profile>` | clé de configuration d'exécution `approval_policy` | —                                                                                                                                                                                                            |
| `/acp timeout <seconds>`     | clé de configuration d'exécution `timeout`         | —                                                                                                                                                                                                            |
| `/acp cwd <path>`            | remplacement du cwd d'exécution                    | Mise à jour directe.                                                                                                                                                                                         |
| `/acp set <key> <value>`     | générique                                          | `key=cwd` utilise le chemin de remplacement du cwd.                                                                                                                                                          |
| `/acp reset-options`         | efface tous les remplacements d'exécution          | —                                                                                                                                                                                                            |

## configuration du harnais acpx, configuration du plugin et autorisations

Pour la configuration du harnais acpx (alias Claude Code / Codex / Gemini CLI), les ponts MCP plugin-tools et OpenClaw-tools, et les modes d'autorisation ACP, voir [ACP agents — configuration](/fr/tools/acp-agents-setup).

## Dépannage

| Symptôme                                                                     | Cause probable                                                                                       | Solution                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                      | Plugin backend manquant, désactivé ou bloqué par `plugins.allow`.                                    | Installez et activez le plugin backend, incluez `acpx` dans `plugins.allow` lorsque cette liste d'autorisation est définie, puis exécutez `/acp doctor`.                                                                |
| `ACP is disabled by policy (acp.enabled=false)`                              | ACP désactivé globalement.                                                                           | Définissez `acp.enabled=true`.                                                                                                                                                                                          |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`            | Répartition automatique depuis les messages de fil normaux désactivée.                               | Définissez `acp.dispatch.enabled=true` pour reprendre le routage automatique des fils ; les appels explicites à `sessions_spawn({ runtime: "acp" })` fonctionnent toujours.                                             |
| `ACP agent "<id>" is not allowed by policy`                                  | Agent absent de la liste autorisée.                                                                  | Utilisez un `agentId` autorisé ou mettez à jour `acp.allowedAgents`.                                                                                                                                                    |
| `/acp doctor` indique que le backend n'est pas prêt juste après le démarrage | La sonde de dépendance du plugin ou la réparation automatique est toujours en cours.                 | Attendez brièvement et relancez `/acp doctor` ; si l'état reste non sain, inspectez l'erreur d'installation du backend et la politique d'autorisation/refus du plugin.                                                  |
| Commande de harnais introuvable                                              | Le CLI de l'adaptateur n'est pas installé ou la récupération du premier démarrage `npx` a échoué.    | Installez/préchauffez l'adaptateur sur l'hôte Gateway, ou configurez explicitement la commande de l'agent acpx.                                                                                                         |
| Modèle introuvable en provenance du harnais                                  | L'identifiant du modèle est valide pour un autre fournisseur/harnais, mais pas pour cette cible ACP. | Utilisez un modèle répertorié par ce harnais, configurez le modèle dans le harnais, ou omettez la substitution.                                                                                                         |
| Erreur d'authentification fournisseur en provenance du harnais               | OpenClaw est sain, mais le CLI/fournisseur cible n'est pas connecté.                                 | Connectez-vous ou fournissez la clé de fournisseur requise dans l'environnement de l'hôte Gateway.                                                                                                                      |
| `Unable to resolve session target: ...`                                      | Jeton de clé/id/étiquette incorrect.                                                                 | Exécutez `/acp sessions`, copiez la clé/l'étiquette exacte, réessayez.                                                                                                                                                  |
| `--bind here requires running /acp spawn inside an active ... conversation`  | `--bind here` utilisé sans conversation active pouvant être liée.                                    | Déplacez-vous vers la conversation/channel cible et réessayez, ou utilisez un démarrage non lié.                                                                                                                        |
| `Conversation bindings are unavailable for <channel>.`                       | L'adaptateur ne prend pas en charge la capacité de liaison ACP pour la conversation actuelle.        | Utilisez `/acp spawn ... --thread ...` là où c'est pris en charge, configurez `bindings[]` de niveau supérieur, ou déplacez-vous vers un channel pris en charge.                                                        |
| `--thread here requires running /acp spawn inside an active ... thread`      | `--thread here` utilisé en dehors d'un contexte de fil.                                              | Déplacez-vous vers le fil cible ou utilisez `--thread auto`/`off`.                                                                                                                                                      |
| `Only <user-id> can rebind this channel/conversation/thread.`                | Un autre utilisateur possède la cible de liaison active.                                             | Reliez en tant que propriétaire ou utilisez une conversation ou un fil différent.                                                                                                                                       |
| `Thread bindings are unavailable for <channel>.`                             | L'adaptateur ne possède pas la capacité de liaison de fil de discussion.                             | Utilisez `--thread off` ou passez à un adaptateur/canal pris en charge.                                                                                                                                                 |
| `Sandboxed sessions cannot spawn ACP sessions ...`                           | L'exécution ACP se trouve côté hôte ; la session du demandeur est isolée (sandboxed).                | Utilisez `runtime="subagent"` depuis des sessions isolées, ou exécutez le spawn ACP depuis une session non isolée.                                                                                                      |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`      | `sandbox="require"` demandé pour l'exécution ACP.                                                    | Utilisez `runtime="subagent"` pour l'isolement requis, ou utilisez ACP avec `sandbox="inherit"` depuis une session non isolée.                                                                                          |
| `Cannot apply --model ... did not advertise model support`                   | Le harnais cible n'expose pas de changement de modèle ACP générique.                                 | Utilisez un harnais qui annonce ACP `models`/`session/set_model`, utilisez les références de modèle ACP Codex, ou configurez le modèle directement dans le harnais s'il possède son propre indicateur de démarrage.     |
| Métadonnées ACP manquantes pour la session liée                              | Métadonnées de session ACP périmées/supprimées.                                                      | Recréez avec `/acp spawn`, puis reliez/focalisez le fil de discussion.                                                                                                                                                  |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`     | `permissionMode` bloque les écritures/exécutions dans une session ACP non interactive.               | Définissez `plugins.entries.acpx.config.permissionMode` sur `approve-all` et redémarrez la passerelle. Voir [Permission configuration](/fr/tools/acp-agents-setup#permission-configuration).                            |
| La session ACP échoue rapidement avec peu de sortie                          | Les invites d'autorisation sont bloquées par `permissionMode`/`nonInteractivePermissions`.           | Vérifiez les journaux de la passerelle pour `AcpRuntimeError`. Pour des autorisations complètes, définissez `permissionMode=approve-all` ; pour une dégradation gracieuse, définissez `nonInteractivePermissions=deny`. |
| La session ACP se bloque indéfiniment après avoir terminé le travail         | Le processus du harnais est terminé mais la session ACP n'a pas signalé la completion.               | Surveillez avec `ps aux \| grep acpx` ; tuez manuellement les processus périmés.                                                                                                                                        |
| Le harnais voit `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`                      | L'enveloppe d'événement interne a fui à travers la frontière ACP.                                    | Mettez à jour OpenClaw et relancez le flux de completion ; les harnais externes ne devraient recevoir que des invites de completion simples.                                                                            |

## Connexes

- [Agents ACP — configuration](/fr/tools/acp-agents-setup)
- [Envoi d'agent](/fr/tools/agent-send)
- [Backends CLI](/fr/gateway/cli-backends)
- [Harnais Codex](/fr/plugins/codex-harness)
- [Outils de bac à sable multi-agents](/fr/tools/multi-agent-sandbox-tools)
- [`openclaw acp` (mode pont)](/fr/cli/acp)
- [Sous-agents](/fr/tools/subagents)
