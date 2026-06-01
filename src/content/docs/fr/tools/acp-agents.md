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

Les sessions [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) permettent à OpenClaw d'exécuter des harnais de codage externes (par exemple Claude Code, Cursor, Copilot, Droid, OpenClaw ACP, OpenCode, Gemini CLI et autres harnais ACPX pris en charge) via un plugin backend ACP.

Chaque création de session ACP est suivie en tant que [tâche d'arrière-plan](/fr/automation/tasks).

<Note>
**ACP est le chemin pour harnais externe, et non le chemin Codex par défaut.** Le plugin de serveur d'application natif Codex possède les contrôles `/codex ...` et le runtime intégré par défaut `openai/gpt-*` pour les tours d'agent ; ACP possède les contrôles `/acp ...` et les sessions `sessions_spawn({ runtime: "acp" })`.

Si vous souhaitez que Codex ou Claude Code se connecte en tant que client MCP externe directement aux conversations de canal OpenClaw existantes, utilisez [`openclaw mcp serve`](/fr/cli/mcp) au lieu d'ACP.

</Note>

## Quelle page me faut-il ?

| Vous souhaitez…                                                                                  | Utiliser ceci                            | Notes                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lier ou contrôler Codex dans la conversation actuelle                                            | `/codex bind`, `/codex threads`          | Chemin natif du serveur d'application Codex lorsque le plugin `codex` est activé ; inclut les réponses de discussion liées, le transfert d'images, model/fast/permissions, stop et les contrôles steer. ACP est un repli explicite |
| Exécuter Claude Code, Gemini CLI, Codex ACP explicite ou un autre harnais externe _via_ OpenClaw | Cette page                               | Sessions liées à la discussion, `/acp spawn`, `sessions_spawn({ runtime: "acp" })`, tâches d'arrière-plan, contrôles d'exécution                                                                                                   |
| Exposer une session OpenClaw Gateway _en tant que_ serveur ACP pour un éditeur ou un client      | [`openclaw acp`](/fr/cli/acp)            | Mode pont. L'IDE/le client parle ACP à OpenClaw via stdio/WebSocket                                                                                                                                                                |
| Réutiliser un AI CLI local en tant que modèle de repli texte uniquement                          | [Backends CLI](/fr/gateway/cli-backends) | Pas ACP. Pas d'outils OpenClaw, pas de contrôles ACP, pas de runtime de harnais                                                                                                                                                    |

## Est-ce que cela fonctionne hors de la boîte ?

Oui, après avoir installé le plugin officiel d'exécution ACP :

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

Les extractions de code source peuvent utiliser le plugin d'espace de travail local `extensions/acpx` après
`pnpm install`. Exécutez `/acp doctor` pour une vérification de l'état de préparation.

OpenClaw n'enseigne aux agents la génération ACP que lorsque l'ACP est **vraiment
utilisable** : l'ACP doit être activé, la répartition (dispatch) ne doit pas être désactivée, la session
actuelle ne doit pas être bloquée par le bac à sable, et un backend d'exécution doit être
chargé. Si ces conditions ne sont pas remplies, les compétences du plugin ACP et
les conseils ACP `sessions_spawn` restent masqués afin que l'agent ne suggère pas
un backend indisponible.

<AccordionGroup>
  <Accordion title="Pièges de la première exécution">
    - Si `plugins.allow` est défini, il s'agit d'un inventaire de plugins restrictif et **doit** inclure `acpx` ; sinon, le backend ACP installé est intentionnellement bloqué et `/acp doctor` signale l'entrée manquante dans la liste d'autorisation.
    - L'adaptateur Codex ACP est mis en place avec le plugin `acpx` et lancé localement lorsque cela est possible.
    - Codex ACP s'exécute avec un `CODEX_HOME` isolé ; OpenClaw copie les entrées de projet approuvées ainsi que la configuration de routage model/provider sécurisée à partir de la configuration Codex de l'hôte, tandis que l'authentification, les notifications et les hooks restent sur la configuration de l'hôte.
    - D'autres adaptateurs de harnais cibles peuvent toujours être récupérés à la demande avec `npx` la première fois que vous les utilisez.
    - L'authentification du fournisseur doit toujours exister sur l'hôte pour ce harnais.
    - Si l'hôte n'a pas d'accès npm ou réseau, les récupérations de l'adaptateur lors de la première exécution échouent jusqu'à ce que les caches soient préchauffés ou que l'adaptateur soit installé d'une autre manière.

  </Accordion>
  <Accordion title="Prérequis d'exécution">
    L'ACP lance un véritable processus de harnais externe. OpenClaw gère le routage,
    l'état des tâches d'arrière-plan, la livraison, les liaisons et les stratégies ; le harnais
    gère sa connexion au fournisseur, son catalogue de modèles, son comportement du système de fichiers et
    ses outils natifs.

    Avant de blâmer OpenClaw, vérifiez :

    - `/acp doctor` signale un backend activé et sain.
    - L'identifiant cible est autorisé par `acp.allowedAgents` lorsque cette liste d'autorisation est définie.
    - La commande du harnais peut démarrer sur l'hôte du Gateway.
    - L'authentification du fournisseur est présente pour ce harnais (`claude`, `codex`, `gemini`, `opencode`, `droid`, etc.).
    - Le modèle sélectionné existe pour ce harnais - les identifiants de modèle ne sont pas portables d'un harnais à l'autre.
    - Le `cwd` demandé existe et est accessible, ou omettez `cwd` et laissez le backend utiliser sa valeur par défaut.
    - Le mode de permission correspond au travail. Les sessions non interactives ne peuvent pas cliquer sur les invites de permission natives, les exécutions de code intensives en écriture/exécution ont donc généralement besoin d'un profil de permission ACPX capable de procéder sans intervention.

  </Accordion>
</AccordionGroup>

Les outils de plugin OpenClaw et les outils intégrés OpenClaw ne sont **pas** exposés aux harnais ACP par défaut. Activez les ponts MCP explicites dans [Configuration des agents ACP](/fr/tools/acp-agents-setup) uniquement lorsque le harnais doit appeler ces outils directement.

## Cibles de harnais prises en charge

Avec le backend `acpx`, utilisez ces identifiants de harnais comme cibles `/acp spawn <id>`
ou `sessions_spawn({ runtime: "acp", agentId: "<id>" })` :

| Identifiant de harnais | Backend typique                                         | Notes                                                                                                         |
| ---------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `claude`               | Adaptateur ACP Claude Code                              | Nécessite une authentification Claude Code sur l'hôte.                                                        |
| `codex`                | Adaptateur ACP Codex                                    | Recours explicite à l'ACP uniquement lorsque le `/codex` natif n'est pas disponible ou que l'ACP est demandé. |
| `copilot`              | Adaptateur ACP GitHub Copilot                           | Nécessite une authentification Copilot CLI/runtime.                                                           |
| `cursor`               | Adaptateur ACP CLI Cursor (CLI`cursor-agent acp`)       | Remplacez la commande acpx si une installation locale expose un point d'entrée ACP différent.                 |
| `droid`                | CLI Droid Factory                                       | Nécessite une authentification Factory/Droid ou `FACTORY_API_KEY` dans l'environnement du harnais.            |
| `gemini`               | Adaptateur ACP CLI Gemini                               | Nécessite une authentification CLI Gemini ou la configuration d'une clé API.                                  |
| `iflow`                | CLI iFlow                                               | La disponibilité de l'adaptateur et le contrôle du modèle dépendent du CLI installé.                          |
| `kilocode`             | CLI Kilo Code                                           | La disponibilité de l'adaptateur et le contrôle du modèle dépendent du CLI installé.                          |
| `kimi`                 | CLI Kimi/Moonshot                                       | Nécessite une authentification Kimi/Moonshot sur l'hôte.                                                      |
| `kiro`                 | CLI Kiro                                                | La disponibilité de l'adaptateur et le contrôle du modèle dépendent du CLI installé.                          |
| `opencode`             | Adaptateur ACP OpenCode                                 | Nécessite une authentification CLI/provider OpenCode.                                                         |
| `openclaw`             | Pont OpenClaw Gateway via OpenClawGateway`openclaw acp` | Permet à un harnais compatible ACP de communiquer avec une session OpenClaw Gateway.                          |
| `qwen`                 | Qwen Code / Qwen CLI                                    | Nécessite une authentification compatible Qwen sur l'hôte.                                                    |

Les alias d'agent acpx personnalisés peuvent être configurés dans acpx lui-même, mais la stratégie OpenClaw vérifie toujours `acp.allowedAgents` et tout mappage `agents.list[].runtime.acp.agent` avant l'expédition.

## Manuel de l'opérateur

Flux rapide `/acp` depuis le chat :

<Steps>
  <Step title="Spawn">
    `/acp spawn claude --bind here`,
    `/acp spawn gemini --mode persistent --thread auto`, ou explicitement
    `/acp spawn codex --bind here`.
  </Step>
  <Step title="Travailler">
    Continuez dans la conversation liée ou le fil de discussion (ou ciblez explicitement la clé de session).
  </Step>
  <Step title="Vérifier l'état">
    `/acp status`
  </Step>
  <Step title="Ajuster">
    `/acp model <provider/model>`,
    `/acp permissions <profile>`,
    `/acp timeout <seconds>`.
  </Step>
  <Step title="Orienter">
    Sans remplacer le contexte : `/acp steer tighten logging and continue`.
  </Step>
  <Step title="Arrêter">
    `/acp cancel` (tour actuel) ou `/acp close` (session + liaisons).
  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Détails du cycle de vie"OpenClawGateway>
    - Spawn crée ou reprend une session d'exécution ACP, enregistre les métadonnées ACP dans le magasin de sessions OpenClaw et peut créer une tâche d'arrière-plan lorsque l'exécution est détenue par le parent.
    - Les sessions ACP détenues par le parent sont traitées comme un travail d'arrière-plan même lorsque la session d'exécution est persistante ; la livraison de la complétion et inter-surfaces passe par le notificateur de tâches parent plutôt que d'agir comme une session de chat normale orientée utilisateur.
    - La maintenance des tâches ferme les sessions ACP ponctuelles détenues par le parent qui sont terminales ou orphelines. Les sessions ACP persistantes sont conservées tant qu'une liaison de conversation active reste ; les sessions persistantes obsolètes sans liaison active sont fermées pour qu'elles ne puissent pas être reprises silencieusement après que la tâche propriétaire est terminée ou que son enregistrement de tâche a disparu.
    - Les messages de suivi liés vont directement à la session ACP jusqu'à ce que la liaison soit fermée, perdue le focus, réinitialisée ou expirée.
    - Les commandes Gateway restent locales. `/acp ...`, `/status` et `/unfocus` ne sont jamais envoyés en tant que texte d'invite normal à un harnais ACP lié.
    - `cancel` interrompt le tour actif lorsque le backend prend en charge l'annulation ; cela ne supprime pas la liaison ou les métadonnées de session.
    - `close`OpenClawOpenClaw termine la session ACP du point de vue d'OpenClaw et supprime la liaison. Un harnais peut encore conserver son propre historique en amont s'il prend en charge la reprise.
    - Le plugin acpx nettoie les arbres de processus wrapper et adaptateur détenus par OpenClaw après `close`OpenClawGateway, et récolte les orphelins ACPX détenus par OpenClaw obsolètes lors du démarrage de Gateway.
    - Les workers d'exécution inactifs sont éligibles au nettoyage après `acp.runtime.ttlMinutes` ; les métadonnées de session stockées restent disponibles pendant `/acp sessions`.

  </Accordion>
  <Accordion title="Règles de routage Codex natif">
    Déclencheurs en langage naturel qui doivent être routés vers le **plugin Codex natif** lorsqu'il est activé :

    - « Liez ce Discord channel à Codex. »
    - « Attachez ce chat au fil de discussion Codex `<id>`. »
    - « Affichez les fils Codex, puis liez celui-ci. »

    La liaison de conversation Codex native est le chemin de contrôle de chat par défaut.
    Les outils dynamiques OpenClaw s'exécutent toujours via OpenClaw, tandis que
    les outils natifs Codex tels que shell/apply-patch s'exécutent à l'intérieur de Codex.
    Pour les événements d'outils natifs Codex, OpenClaw injecte un relais de hook natif par tour
    afin que les hooks de plugin puissent bloquer `before_tool_call`, observer
    `after_tool_call`, et router les événements Codex `PermissionRequest`
    via les approbations OpenClaw. Les hooks Codex `Stop` sont relayés vers
    OpenClaw `before_agent_finalize`, où les plugins peuvent demander une passe de
    modèle supplémentaire avant que Codex ne finalise sa réponse. Le relais reste
    délibérément conservateur : il ne mute pas les arguments d'outils natifs Codex
    ni ne réécrit les enregistrements de fils Codex. Utilisez ACP explicite uniquement
    lorsque vous voulez le modèle d'exécution/session ACP. La limite de support Codex
    embarqué est documentée dans le
    [contrat de support du harnais Codex v1](/fr/plugins/codex-harness-runtime#v1-support-contract).

  </Accordion>
  <Accordion title="Aide-memoire pour la sélection de modèle / fournisseur / runtime">
    - `openai-codex/*` - ancien chemin de modèle Codex OAuth/abonnement réparé par le doctor.
    - `openai/*` - runtime embarqué du serveur d'application Codex natif pour les tours d'agent OpenAI.
    - `/codex ...` - contrôle de conversation Codex natif.
    - `/acp ...` ou `runtime: "acp"` - contrôle ACP/acpx explicite.

  </Accordion>
  <Accordion title="Déclencheurs de routage ACP en langage naturel">
    Déclencheurs qui doivent être acheminés vers le runtime ACP :

    - "Exécutez ceci en tant que session ACP Claude Code ponctuelle et résumez le résultat."
    - "Utilisez le Gemini CLI pour cette tâche dans un fil, puis conservez les suites dans ce même fil."
    - "Exécutez Codex via ACP dans un fil d'arrière-plan."

    OpenClaw sélectionne `runtime: "acp"`, résout le harnais `agentId`,
    se lie à la conversation ou au fil actuel si pris en charge, et
    achemine les suites vers cette session jusqu'à la fermeture ou l'expiration. Codex ne
    suit ce chemin que lorsque ACP/acpx est explicite ou que le plugin natif
    Codex n'est pas disponible pour l'opération demandée.

    Pour `sessions_spawn`, `runtime: "acp"` est annoncé uniquement lorsque ACP
    est activé, que le demandeur n'est pas en mode OpenClaw (sandboxed), et qu'un backend ACP
    runtime est chargé. `acp.dispatch.enabled=false` met en pause la répartition
    automatique du fil ACP mais ne masque ni ne bloque les appels `sessions_spawn({ runtime: "acp" })`
    explicites. Il cible les ids de harnais ACP tels que `codex`,
    `claude`, `droid`, `gemini` ou `opencode`. Ne transmettez pas un id d'agent
    de configuration OpenClaw normal depuis `agents_list`, sauf si cette entrée est
    explicitement configurée avec `agents.list[].runtime.type="acp"`;
    sinon, utilisez le runtime de sous-agent par défaut. Lorsqu'un agent OpenClaw
    est configuré avec `runtime.type="acp"`, OpenClaw utilise
    `runtime.acp.agent` comme id de harnais sous-jacent.

  </Accordion>
</AccordionGroup>

## ACP par rapport aux sous-agents

Utilisez ACP lorsque vous souhaitez un runtime de harnais externe. Utilisez l'**app-server natif Codex** pour la liaison/le contrôle de conversation Codex lorsque le plugin `codex` est activé. Utilisez les **sous-agents** lorsque vous souhaitez des exécutions déléguées natives OpenClaw.

| Zone                  | Session ACP                           | Exécution de sous-agent               |
| --------------------- | ------------------------------------- | ------------------------------------- |
| Runtime               | Plugin backend ACP (par exemple acpx) | Runtime natif de sous-agent OpenClaw  |
| Clé de session        | `agent:<agentId>:acp:<uuid>`          | `agent:<agentId>:subagent:<uuid>`     |
| Commandes principales | `/acp ...`                            | `/subagents ...`                      |
| Outil Spawn           | `sessions_spawn` avec `runtime:"acp"` | `sessions_spawn` (runtime par défaut) |

Voir aussi [Sous-agents](/fr/tools/subagents).

## Comment ACP exécute Claude Code

Pour Claude Code via ACP, la pile est la suivante :

1. Plan de contrôle de session ACP OpenClaw.
2. Plugin d'exécution officiel `@openclaw/acpx`.
3. Adaptateur ACP Claude.
4. Mécanisme d'exécution/session côté Claude.

ACP Claude est une **session de harnais** avec des contrôles ACP, la reprise de session, le suivi des tâches en arrière-plan et la liaison de conversation/fil optionnelle.

Les backends CLI sont des runtimes de repli locaux texte-only séparés - voir [Backends CLI](CLICLI/en/gateway/cli-backends).

Pour les opérateurs, la règle pratique est la suivante :

- **Vous voulez `/acp spawn`, des sessions liables, des contrôles d'exécution ou un travail de harnais persistant ?** Utilisez ACP.
- **Vous voulez un repli texte local simple via la CLI brute ?** Utilisez les backends CLI.

## Sessions liées

### Modèle mental

- **Surface de chat** - l'endroit où les gens continuent à parler (channel Discord, sujet Telegram, chat iMessage).
- **Session ACP** - l'état d'exécution durable Codex/Claude/Gemini vers lequel OpenClaw achemine.
- **Fil/sujet enfant** - une surface de messagerie supplémentaire optionnelle créée uniquement par `--thread ...`.
- **Espace de travail d'exécution** - l'emplacement du système de fichiers (`cwd`, extraction de repo, espace de travail backend) où le harnais s'exécute. Indépendant de la surface de chat.

### Liens de conversation actuelle

`/acp spawn <harness> --bind here`OpenClaw épinglie la conversation actuelle à la
session ACP générée - pas de fil enfant, même surface de chat. OpenClaw conserve
la propriété du transport, de l'auth, de la sécurité et de la livraison. Les messages de suivi dans cette
conversation sont acheminés vers la même session ; `/new` et `/reset` réinitialisent la
session sur place ; `/acp close` supprime la liaison.

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
    - `--bind here` et `--thread ...` sont mutuellement exclusifs.
    - `--bind here` fonctionne uniquement sur les canaux qui annoncent une liaison à la conversation en cours ; OpenClaw renvoie un message non pris en charge clair dans le cas contraire. Les liaisons persistent après les redémarrages de la passerelle.
    - Sur Discord, `spawnSessions` limite la création de fils de discussion enfants pour `--thread auto|here` - et non pour `--bind here`.
    - Si vous générez vers un agent ACP différent sans `--cwd`, OpenClaw hérite par défaut de l'espace de travail de **l'agent cible**. Les chemins hérités manquants (`ENOENT`/`ENOTDIR`%%) reviennent à la valeur par défaut du backend ; les autres erreurs d'accès (p. ex. `EACCES`) apparaissent comme des erreurs de génération.
    - Les commandes de gestion de la Gateway restent locales dans les conversations liées - les commandes `/acp ...` sont gérées par OpenClaw même lorsque le texte de suivi normal est acheminé vers la session ACP liée ; `/status` et `/unfocus` restent également locales chaque fois que la gestion des commandes est activée pour cette surface.

  </Accordion>
  <Accordion title="Sessions liées aux fils">
    Lorsque les liaisons de fils sont activées pour un adaptateur de channel :

    - OpenClaw lie un fil à une session ACP cible.
    - Les messages de suivi dans ce fil sont acheminés vers la session ACP liée.
    - La sortie ACP est renvoyée vers le même fil.
    - La perte de focus, la fermeture, l'archivage, l'expiration par inactivité ou l'expiration par âge maximal supprime la liaison.
    - `/acp close`, `/acp cancel`, `/acp status`, `/status` et `/unfocus` sont des commandes Gateway, et non des invites pour le harnais ACP.

    Drapeaux de fonctionnalités requis pour l'ACP liée aux fils :

    - `acp.enabled=true`
    - `acp.dispatch.enabled` est activé par défaut (définissez `false` pour suspendre l'envoi automatique du fil ACP ; les appels explicites `sessions_spawn({ runtime: "acp" })` fonctionnent toujours).
    - Créations de sessions de fils d'adaptateur de channel activées (par défaut : `true`) :
      - Discord : `channels.discord.threadBindings.spawnSessions=true`
      - Telegram : `channels.telegram.threadBindings.spawnSessions=true`

    La prise en charge de la liaison de fils est spécifique à l'adaptateur. Si l'adaptateur de channel actif ne prend pas en charge les liaisons de fils, OpenClaw renvoie un message clair indiquant que la fonctionnalité n'est pas prise en charge ou indisponible.

  </Accordion>
  <Accordion title="Channels prenant en charge les fils">
    - Tout adaptateur de channel qui expose la capacité de liaison de session/fil.
    - Prise en charge intégrée actuelle : fils/channels **Discord**, sujets **Telegram** (sujets de forum dans les groupes/super-groupes et sujets de DM).
    - Les canaux de plugins peuvent ajouter une prise en charge via la même interface de liaison.

  </Accordion>
</AccordionGroup>

## Liaisons persistantes de channels

Pour les workflows non éphémères, configurez les liaisons ACP persistantes dans les entrées `bindings[]` de niveau supérieur.

### Modèle de liaison

<ParamField path="bindings[].type" type='"acp"'>
  Marque une liaison de conversation ACP persistante.
</ParamField>
<ParamField path="bindings[].match" type="object">
  Identifie la conversation cible. Formes par channel :

- **Salon/fil Discord :** Discord`match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
- **Salon/DM Slack :** Slack`match.channel="slack"` + `match.peer.id="<channelId|channel:<channelId>|#<channelId>|userId|user:<userId>|slack:<userId>|<@userId>>"`Slack. Privilégiez les identifiants Slack stables ; les liaisons de salon correspondent également aux réponses dans les fils de ce salon.
- **Sujet de forum Telegram :** Telegram`match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- **DM/groupe iMessage :** iMessage`match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`. Privilégiez `chat_id:*` pour les liaisons de groupe stables.

</ParamField>
<ParamField path="bindings[].agentId" type="string"OpenClaw>
  L'identifiant de l'agent OpenClaw propriétaire.
</ParamField>
<ParamField path="bindings[].acp.mode" type='"persistent" | "oneshot"'>
  Remplacement ACP facultatif.
</ParamField>
<ParamField path="bindings[].acp.label" type="string">
  Libellé orienté opérateur facultatif.
</ParamField>
<ParamField path="bindings[].acp.cwd" type="string">
  Répertoire de travail d'exécution facultatif.
</ParamField>
<ParamField path="bindings[].acp.backend" type="string">
  Remplacement de backend facultatif.
</ParamField>

### Runtime defaults per agent

Use `agents.list[].runtime` to define ACP defaults once per agent:

- `agents.list[].runtime.type="acp"`
- `agents.list[].runtime.acp.agent` (harness id, e.g. `codex` or `claude`)
- `agents.list[].runtime.acp.backend`
- `agents.list[].runtime.acp.mode`
- `agents.list[].runtime.acp.cwd`

**Priorité de remplacement pour les sessions ACP liées :**

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

- OpenClaw s'assure que la session ACP configurée existe avant son utilisation.
- Les messages de ce salon ou sujet sont acheminés vers la session ACP configurée.
- In bound conversations, `/new` and `/reset` reset the same ACP session key in place.
- Les liaisons d'exécution temporaires (par exemple celles créées par les flux de focus sur les fils) s'appliquent toujours lorsqu'elles sont présentes.
- Pour les créations ACP inter-agents sans `cwd` explicite, OpenClaw hérite de l'espace de travail de l'agent cible à partir de la configuration de l'agent.
- Les chemins d'espace de travail hérités manquants reviennent au répertoire de travail par défaut du backend ; les échecs d'accès non manquants apparaissent comme des erreurs de création.

## Démarrer des sessions ACP

Deux façons de démarrer une session ACP :

<Tabs>
  <Tab title="From sessions_spawn">
    Utilisez `runtime: "acp"` pour démarrer une session ACP à partir d'un tour d'agent ou d'un appel d'outil.

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
    `runtime` est par défaut `subagent`, définissez donc `runtime: "acp"` explicitement pour les sessions ACP. Si `agentId` est omis, OpenClaw utilise `acp.defaultAgent` lorsqu'il est configuré. `mode: "session"` nécessite `thread: true` pour conserver une conversation liée persistante.
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

    Indicateurs clés :

    - `--mode persistent|oneshot`
    - `--bind here|off`
    - `--thread auto|here|off`
    - `--cwd <absolute-path>`
    - `--label <name>`

    Voir [Slash commands](/fr/tools/slash-commands).

  </Tab>
</Tabs>

### Paramètres `sessions_spawn`

<ParamField path="task" type="string" required>
  Invite initiale envoyée à la session ACP.
</ParamField>
<ParamField path="runtime" type='"acp"' required>
  Doit être `"acp"` pour les sessions ACP.
</ParamField>
<ParamField path="agentId" type="string">
  Identifiant du harnais cible ACP. Revient à `acp.defaultAgent` si défini.
</ParamField>
<ParamField path="thread" type="boolean" default="false">
  Demande le flux de liaison de fil de discussion lorsque pris en charge.
</ParamField>
<ParamField path="mode" type='"run" | "session"' default="run">
  `"run"` est unique ; `"session"` est persistant. Si `thread: true` et
  `mode` sont omis, OpenClaw peut par défaut adopter un comportement persistant selon
  le chemin d'exécution. `mode: "session"` nécessite `thread: true`.
</ParamField>
<ParamField path="cwd" type="string">
  Répertoire de travail d'exécution demandé (validé par la stratégie
  backend/runtime). Si omis, le.spawn ACP hérite de l'espace de travail de
  l'agent cible lorsqu'il est configuré ; les chemins hérités manquants
  reviennent aux valeurs par défaut du backend, tandis que les erreurs
  d'accès réelles sont renvoyées.
</ParamField>
<ParamField path="label" type="string">
  Libellé destiné à l'opérateur, utilisé dans le texte de la session/bannière.
</ParamField>
<ParamField path="resumeSessionId" type="string">
  Reprend une session ACP existante au lieu d'en créer une nouvelle.
  L'agent rejoue son historique de conversation via `session/load`.
  Nécessite `runtime: "acp"`.
</ParamField>
<ParamField path="streamTo" type='"parent"'>
  `"parent"` diffuse des résumés de progression de l'exécution ACP initiale
  vers la session du demandeur sous forme d'événements système. Les réponses
  acceptées incluent `streamLogPath` pointant vers un journal JSONL
  délimité à la session (`<sessionId>.acp-stream.jsonl`) que vous pouvez suivre pour
  l'historique de relais complet.
</ParamField>
<ParamField path="runTimeoutSeconds" type="number">
  Abandonne le tour enfant ACP après N secondes. `0` maintient le tour
  sur le chemin sans délai d'expiration de la passerelle. La même valeur est
  appliquée à l'exécution de la Gateway et au runtime ACP afin que
  les harnais bloqués ou épuisant leur quota n'occupent pas indéfiniment
  la voie de l'agent parent.
</ParamField>
<ParamField path="model" type="string">
  Remplacement explicite de modèle pour la session enfant ACP. Les spawns
  Codex ACP normalisent les références Codex OpenClaw telles que
  `openai-codex/gpt-5.4` vers la configuration de démarrage ACP Codex
  avant `session/new` ; les formes avec barre oblique telles que
  `openai-codex/gpt-5.4/high` définissent également l'effort de raisonnement ACP Codex.
  Les autres harnais doivent annoncer l'ACP `models` et prendre en
  charge `session/set_model` ; sinon, OpenClaw/acpx échoue
  clairement au lieu de revenir silencieusement à la valeur par défaut de
  l'agent cible.
</ParamField>
<ParamField path="thinking" type="string">
  Effort de réflexion/raisonnement explicite. Pour Codex ACP, `minimal`
  correspond à un effort faible, `low`/`medium`/`high`/`xhigh`
  correspondent directement, et `off` omet le remplacement de
  démarrage de l'effort de raisonnement.
</ParamField>

## Modes de liaison et de fil de génération

<Tabs>
  <Tab title="--bind here|off">
    | Mode   | Comportement                                                               |
    | ------ | -------------------------------------------------------------------------- |
    | `here` | Lie la conversation active actuelle sur place ; échoue si aucune n'est active. |
    | `off`  | Ne crée pas de liaison de conversation actuelle.                          |

    Notes :

    - `--bind here` est le chemin d'exploitation le plus simple pour « rendre ce channel ou chat pris en charge par Codex ».
    - `--bind here` ne crée pas de fil de discussion enfant.
    - `--bind here` n'est disponible que sur les channels qui exposent une prise en charge de la liaison de conversation actuelle.
    - `--bind` et `--thread` ne peuvent pas être combinés dans le même appel `/acp spawn`.

  </Tab>
  <Tab title="--thread auto|here|off">
    | Mode   | Comportement                                                                                            |
    | ------ | ------------------------------------------------------------------------------------------------------- |
    | `auto` | Dans un fil actif : lier ce fil. Hors d'un fil : créer/lier un fil enfant lorsque pris en charge. |
    | `here` | Nécessite le fil actif actuel ; échoue si ce n'est pas le cas.                                                  |
    | `off`  | Aucune liaison. La session démarre non liée.                                                                 |

    Notes :

    - Sur les surfaces sans liaison de fil, le comportement par défaut est effectivement `off`.
    - La génération liée à un fil nécessite la prise en charge de la stratégie du channel :
      - Discord : `channels.discord.threadBindings.spawnSessions=true`
      - Telegram : `channels.telegram.threadBindings.spawnSessions=true`
    - Utilisez `--bind here` lorsque vous souhaitez épingler la conversation actuelle sans créer de fil enfant.

  </Tab>
</Tabs>

## Modèle de livraison

Les sessions ACP peuvent être des espaces de travail interactifs ou des travaux d'arrière-plan appartenant au parent.
Le chemin de livraison dépend de cette forme.

<AccordionGroup>
  <Accordion title="Sessions ACP interactives"
    Les sessions interactives sont conçues pour continuer à discuter sur une surface de chat visible :

    - `/acp spawn ... --bind here` lie la conversation actuelle à la session ACP.
    - `/acp spawn ... --thread ...` lie un fil/sujet de canal à la session ACP.
    - Les routes de conversation persistantes configurées `bindings[].type="acp"`OpenClaw acheminent les conversations correspondantes vers la même session ACP.

    Les messages de suivi dans la conversation liée sont acheminés directement vers la session ACP, et la sortie ACP est renvoyée au même canal/fil/sujet.

    Ce qu'OpenClaw envoie au harnais :

    - Les suivis liés normaux sont envoyés sous forme de texte de prompt, ainsi que des pièces jointes uniquement si le harnais/backend les prend en charge.
    - Les commandes de gestion `/acp`GatewayOpenClawOpenClaw et les commandes locales du Gateway sont interceptées avant l'envoi ACP.
    - Les événements de completion générés à l'exécution sont matérialisés par cible. Les agents OpenClaw reçoivent l'enveloppe de contexte d'exécution interne d'OpenClaw ; les harnais ACP externes reçoivent un prompt simple avec le résultat enfant et l'instruction. L'enveloppe `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`OpenClaw brute ne doit jamais être envoyée aux harnais externes ou persistée en tant que texte de transcript utilisateur ACP.
    - Les entrées de transcript ACP utilisent le texte de déclencheur visible par l'utilisateur ou le prompt de completion simple. Les métadonnées d'événement internes restent structurées dans OpenClaw, dans la mesure du possible, et ne sont pas traitées comme du contenu de chat rédigé par l'utilisateur.

  </Accordion>
  <Accordion title="Sessions ACP ponctuelles détenues par le parent">
    Les sessions ACP ponctuelles générées par une autre exécution d'agent sont des enfants en arrière-plan, similaires aux sous-agents :

    - Le parent demande du travail avec `sessions_spawn({ runtime: "acp", mode: "run" })`.
    - L'enfant s'exécute dans sa propre session de harnais ACP.
    - Les tours de l'enfant s'exécutent sur la même voie d'arrière-plan que celle utilisée par les générations de sous-agents natifs, donc un harnais ACP lent ne bloque pas le travail de la session principale non lié.
    - Les rapports d'achèvement sont renvoyés via le chemin d'annonce d'achèvement des tâches. OpenClaw convertit les métadonnées d'achèvement internes en une invite ACP simple avant de l'envoyer à un harnais externe, donc les harnais ne voient pas les marqueurs de contexte d'exécution propres à OpenClaw.
    - Le parent réécrit le résultat de l'enfant avec la voix normale de l'assistant lorsqu'une réponse orientée utilisateur est utile.

    Ne **pas** traiter ce chemin comme une conversation de pair à pair entre le parent
    et l'enfant. L'enfant a déjà un canal d'achèvement pour renvoyer vers le
    parent.

  </Accordion>
  <Accordion title="sessions_send et livraison A2A">
    `sessions_send` peut cibler une autre session après la génération. Pour les sessions de pairs normales, OpenClaw utilise un chemin de suivi agent-à-agent (A2A)
    après avoir injecté le message :

    - Attendre la réponse de la session cible.
    - Optionnellement, laisser le demandeur et la cible échanger un nombre limité de tours de suivi.
    - Demander à la cible de produire un message d'annonce.
    - Livrer cette annonce au canal ou au fil visible.

    Ce chemin A2A est un repli pour les envois entre pairs où l'expéditeur a besoin d'un
    suivi visible. Il reste activé lorsqu'une session sans rapport peut
    voir et envoyer un message à une cible ACP, par exemple sous des paramètres `tools.sessions.visibility` larges.

    OpenClaw ignore le suivi A2A uniquement lorsque le demandeur est le
    parent de son propre enfant ACP ponctuel détenu par le parent. Dans ce cas,
    l'exécution de l'A2A par-dessus l'achèvement de la tâche peut réveiller le parent avec le
    résultat de l'enfant, transférer la réponse du parent vers l'enfant, et
    créer une boucle d'écho parent/enfant. Le résultat `sessions_send` signale
    `delivery.status="skipped"` pour ce cas d'enfant détenu car le
    chemin d'achèvement est déjà responsable du résultat.

  </Accordion>
  <Accordion title="Reprendre une session existante">
    Utilisez `resumeSessionId` pour continuer une session ACP précédente au lieu de
    recommencer à zéro. L'agent rejoue son historique de conversation via
    `session/load`, il reprend donc avec le contexte complet de ce qui s'est passé avant.

    ```json
    {
      "task": "Continue where we left off - fix the remaining test failures",
      "runtime": "acp",
      "agentId": "codex",
      "resumeSessionId": "<previous-session-id>"
    }
    ```

    Cas d'usage courants :

    - Transférer une session Codex de votre ordinateur portable vers votre téléphone - dites à votre agent de reprendre là où vous étiez.
    - Continuer une session de codage démarrée de manière interactive dans le CLI, maintenant sans interface via votre agent.
    - Reprendre le travail qui a été interrompu par un redémarrage de la passerelle ou un délai d'inactivité.

    Notes :

    - `resumeSessionId` ne s'applique que lorsque `runtime: "acp"` ; le runtime de sous-agent par défaut ignore ce champ spécifique à l'ACP.
    - `streamTo` ne s'applique que lorsque `runtime: "acp"` ; le runtime de sous-agent par défaut ignore ce champ spécifique à l'ACP.
    - `resumeSessionId` est un identifiant de reprise ACP/harness local à l'hôte, pas une clé de session de canal OpenClaw ; OpenClaw vérifie toujours la stratégie de spawn ACP et la stratégie de l'agent cible avant l'expédition, tandis que le backend ACP ou le harness possède l'autorisation pour charger cet identifiant en amont.
    - `resumeSessionId` restaure l'historique de conversation ACP en amont ; `thread` et `mode` s'appliquent toujours normalement à la nouvelle session OpenClaw que vous créez, donc `mode: "session"` nécessite toujours `thread: true`.
    - L'agent cible doit prendre en charge `session/load` (Codex et Claude Code le font).
    - Si l'identifiant de session n'est pas trouvé, le spawn échoue avec une erreur claire - aucun retour silencieux à une nouvelle session.

  </Accordion>
  <Accordion title="Test de fumée après déploiement">
    Après un déploiement de passerelle, effectuez une vérification de bout en bout en direct plutôt que de faire confiance aux tests unitaires :

    1. Vérifiez la version déployée de la passerelle et le commit sur l'hôte cible.
    2. Ouvrez une session de pont ACPX temporaire vers un agent en direct.
    3. Demandez à cet agent d'appeler `sessions_spawn` avec `runtime: "acp"`, `agentId: "codex"`, `mode: "run"`, et la tâche `Reply with exactly LIVE-ACP-SPAWN-OK`.
    4. Vérifiez `accepted=yes`, un `childSessionKey` réel, et aucune erreur de validateur.
    5. Nettoyez la session de pont temporaire.

    Gardez la porte sur `mode: "run"` et sautez `streamTo: "parent"` -
    les chemins `mode: "session"` liés aux threads et de relais de flux sont des passes d'intégration plus riches et distinctes.

  </Accordion>
</AccordionGroup>

## Compatibilité Sandbox

Les sessions ACP s'exécutent actuellement sur le runtime de l'hôte, **pas** à l'intérieur du
OpenClaw Sandbox.

<Warning>
**Limite de sécurité :**

- Le harnais externe peut lire/écrire en fonction de ses propres permissions CLI et du `cwd` sélectionné.
- La stratégie de bac à sable d'OpenClaw n'englobe **pas** l'exécution du harnais ACP.
- OpenClaw applique toujours les fonctionnalités d'ACP, les agents autorisés, la propriété de session, les liaisons de canal et la stratégie de livraison du Gateway.
- Utilisez `runtime: "subagent"` pour le travail natif d'OpenClaw appliqué par le bac à sable.

</Warning>

Limitations actuelles :

- Si la session du demandeur est isolée (sandboxed), les créations ACP sont bloquées pour à la fois `sessions_spawn({ runtime: "acp" })` et `/acp spawn`.
- `sessions_spawn` avec `runtime: "acp"` ne prend pas en charge `sandbox: "require"`.

## Résolution de la cible de session

La plupart des actions `/acp` acceptent une cible de session facultative (`session-key`,
`session-id`, ou `session-label`).

**Ordre de résolution :**

1. Argument cible explicite (ou `--session` pour `/acp steer`)
   - essaie la clé
   - puis l'ID de session de forme UUID
   - puis l'étiquette
2. Liaison du fil de discussion actuel (si cette conversation/fil est lié à une session ACP).
3. Repli vers la session du demandeur actuel.

Les liaisons de conversation actuelle et les liaisons de fil de discussion participent toutes deux à l'étape 2.

Si aucune cible n'est résolue, OpenClaw renvoie une erreur claire (`Unable to resolve session target: ...`).

## Contrôles ACP

| Commande             | Ce qu'elle fait                                                                     | Exemple                                                       |
| -------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `/acp spawn`         | Créer une session ACP ; liaison actuelle ou liaison de fil de discussion en option. | `/acp spawn codex --bind here --cwd /repo`                    |
| `/acp cancel`        | Annuler le tour en cours pour la session cible.                                     | `/acp cancel agent:codex:acp:<uuid>`                          |
| `/acp steer`         | Envoyer une instruction de guidage à la session en cours.                           | `/acp steer --session support inbox prioritize failing tests` |
| `/acp close`         | Fermer la session et dissocier les cibles du fil de discussion.                     | `/acp close`                                                  |
| `/acp status`        | Afficher le backend, le mode, l'état, les options d'exécution, les capacités.       | `/acp status`                                                 |
| `/acp set-mode`      | Définir le mode d'exécution pour la session cible.                                  | `/acp set-mode plan`                                          |
| `/acp set`           | Écriture générique d'option de configuration d'exécution.                           | `/acp set model openai/gpt-5.4`                               |
| `/acp cwd`           | Définir le répertoire de travail d'exécution.                                       | `/acp cwd /Users/user/Projects/repo`                          |
| `/acp permissions`   | Définir le profil de stratégie d'approbation.                                       | `/acp permissions strict`                                     |
| `/acp timeout`       | Définir le délai d'attente d'exécution (secondes).                                  | `/acp timeout 120`                                            |
| `/acp model`         | Définir la substitution du modèle d'exécution.                                      | `/acp model anthropic/claude-opus-4-6`                        |
| `/acp reset-options` | Supprimer les substitutions d'options d'exécution de session.                       | `/acp reset-options`                                          |
| `/acp sessions`      | Lister les sessions ACP récentes depuis le magasin.                                 | `/acp sessions`                                               |
| `/acp doctor`        | Santé du backend, capacités, corrections actionnables.                              | `/acp doctor`                                                 |
| `/acp install`       | Imprimer les étapes d'installation et d'activation déterministes.                   | `/acp install`                                                |

`/acp status` affiche les options d'exécution effectives ainsi que les identifiants de session au niveau de l'exécution et du backend. Les erreurs de contrôle non prises en charge apparaissent clairement lorsqu'un backend manque une capacité. `/acp sessions` lit le stockage pour la session liée actuelle ou la session du demandeur ; les jetons cibles (`session-key`, `session-id` ou `session-label`) sont résolus via la découverte de session de la passerelle, y compris les racines `session.store` personnalisées par agent.

### Mappage des options d'exécution

`/acp` dispose de commandes pratiques et d'un définitioneur générique. Opérations équivalentes :

| Commande                     | Correspond à                                | Notes                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/acp model <id>`            | clé de configuration d'exécution `model`    | Pour Codex ACP, OpenClaw normalise `openai-codex/<model>` vers l'identifiant du modèle de l'adaptateur et mappe les suffixes de raisonnement slash tels que `openai-codex/gpt-5.4/high` vers `reasoning_effort`.                     |
| `/acp set thinking <level>`  | option canonique `thinking`                 | OpenClaw envoie l'équivalent annoncé par le backend lorsqu'il est présent, en privilégiant `thinking`, puis `effort`, `reasoning_effort` ou `thought_level`. Pour Codex ACP, l'adaptateur mappe les valeurs vers `reasoning_effort`. |
| `/acp permissions <profile>` | option canonique `permissionProfile`        | OpenClaw envoie l'équivalent annoncé par le backend lorsqu'il est présent, tel que `approval_policy`, `permission_profile`, `permissions` ou `permission_mode`.                                                                      |
| `/acp timeout <seconds>`     | option canonique `timeoutSeconds`           | OpenClaw envoie l'équivalent annoncé par le backend lorsqu'il est présent, tel que `timeout` ou `timeout_seconds`.                                                                                                                   |
| `/acp cwd <path>`            | remplacement du cwd d'exécution             | Mise à jour directe.                                                                                                                                                                                                                 |
| `/acp set <key> <value>`     | générique                                   | `key=cwd` utilise le chemin de remplacement du cwd.                                                                                                                                                                                  |
| `/acp reset-options`         | efface toutes les substitutions d'exécution | -                                                                                                                                                                                                                                    |

## acpx harness, plugin setup, and permissions

Pour la configuration du harness acpx (alias Claude Code / Codex / Gemini CLI), les ponts MCP plugin-tools et OpenClaw-tools, et les modes d'autorisation ACP, voir
[ACP agents - setup](/fr/tools/acp-agents-setup).

## Dépannage

| Symptôme                                                                     | Cause probable                                                                                                                                            | Solution                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACP runtime backend is not configured`                                      | Plugin backend manquant, désactivé ou bloqué par `plugins.allow`.                                                                                         | Installez et activez le plugin backend, incluez `acpx` dans `plugins.allow` lorsque cette liste d'autorisation est définie, puis exécutez `/acp doctor`.                                                               |
| `ACP is disabled by policy (acp.enabled=false)`                              | ACP désactivé globalement.                                                                                                                                | Définissez `acp.enabled=true`.                                                                                                                                                                                         |
| `ACP dispatch is disabled by policy (acp.dispatch.enabled=false)`            | Répartition automatique depuis les messages de fil normaux désactivée.                                                                                    | Définissez `acp.dispatch.enabled=true` pour reprendre le routage automatique des fils ; les appels explicites `sessions_spawn({ runtime: "acp" })` fonctionnent toujours.                                              |
| `ACP agent "<id>" is not allowed by policy`                                  | Agent absent de la liste d'autorisation.                                                                                                                  | Utilisez un `agentId` autorisé ou mettez à jour `acp.allowedAgents`.                                                                                                                                                   |
| `/acp doctor` indique que le backend n'est pas prêt juste après le démarrage | Le plugin backend est manquant, désactivé, bloqué par une stratégie d'autorisation/refus, ou son exécutable configuré n'est pas disponible.               | Installez/activez le plugin backend, relancez `/acp doctor`, et inspectez l'erreur d'installation ou de stratégie du backend s'il reste défectueux.                                                                    |
| Commande Harness introuvable                                                 | L'adaptateur CLI n'est pas installé, le plugin externe est manquant, ou la récupération `npx` au premier démarrage a échoué pour un adaptateur non-Codex. | Exécutez `/acp doctor`, installez/préchauffez l'adaptateur sur l'hôte Gateway, ou configurez explicitement la commande de l'agent acpx.                                                                                |
| Modèle introuvable depuis le harness                                         | L'identifiant du modèle est valide pour un autre fournisseur/harness mais pas pour cette cible ACP.                                                       | Utilisez un modèle listé par ce harness, configurez le modèle dans le harness, ou omettez la substitution.                                                                                                             |
| Erreur d'authentification fournisseur depuis le harness                      | OpenClaw est sain, mais le CLI/fournisseur cible n'est pas connecté.                                                                                      | Connectez-vous ou fournissez la clé de fournisseur requise sur l'environnement hôte du Gateway.                                                                                                                        |
| `Unable to resolve session target: ...`                                      | Jeton de clé/id/label incorrect.                                                                                                                          | Exécutez `/acp sessions`, copiez la clé/label exacte et réessayez.                                                                                                                                                     |
| `--bind here requires running /acp spawn inside an active ... conversation`  | `--bind here` utilisé sans de conversation liable active.                                                                                                 | Déplacez-vous vers le chat/la channel cible et réessayez, ou utilisez un spawn non lié.                                                                                                                                |
| `Conversation bindings are unavailable for <channel>.`                       | L'adaptateur manque de la capacité de liaison ACP de conversation actuelle.                                                                               | Utilisez `/acp spawn ... --thread ...` lorsque pris en charge, configurez `bindings[]` de niveau supérieur, ou déplacez-vous vers un channel pris en charge.                                                           |
| `--thread here requires running /acp spawn inside an active ... thread`      | `--thread here` utilisé en dehors d'un contexte de fil de discussion.                                                                                     | Déplacez-vous vers le fil de discussion cible ou utilisez `--thread auto`/`off`.                                                                                                                                       |
| `Only <user-id> can rebind this channel/conversation/thread.`                | Un autre utilisateur possède la cible de liaison active.                                                                                                  | Reliez en tant que propriétaire ou utilisez une conversation ou un fil de discussion différent.                                                                                                                        |
| `Thread bindings are unavailable for <channel>.`                             | L'adaptateur manque de la capacité de liaison de fil de discussion.                                                                                       | Utilisez `--thread off` ou déplacez-vous vers un adaptateur/channel pris en charge.                                                                                                                                    |
| `Sandboxed sessions cannot spawn ACP sessions ...`                           | L'exécution ACP est côté hôte ; la session du demandeur est sandboxed.                                                                                    | Utilisez `runtime="subagent"` à partir de sessions sandboxed, ou exécutez un spawn ACP à partir d'une session non sandboxed.                                                                                           |
| `sessions_spawn sandbox="require" is unsupported for runtime="acp" ...`      | `sandbox="require"` demandé pour l'exécution ACP.                                                                                                         | Utilisez `runtime="subagent"` pour le sandboxing requis, ou utilisez ACP avec `sandbox="inherit"` à partir d'une session non sandboxed.                                                                                |
| `Cannot apply --model ... did not advertise model support`                   | Le harnais cible n'expose pas de changement de model ACP générique.                                                                                       | Utilisez un harnais qui annonce `models`/`session/set_model` ACP, utilisez des références de model ACP Codex, ou configurez le model directement dans le harnais s'il possède son propre indicateur de démarrage.      |
| Métadonnées ACP manquantes pour la session liée                              | Métadonnées de session ACP obsolètes/supprimées.                                                                                                          | Recréez avec `/acp spawn`, puis reliez/focalisez le fil de discussion.                                                                                                                                                 |
| `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`     | `permissionMode` bloque les écritures/exéc dans une session ACP non interactive.                                                                          | Définissez `plugins.entries.acpx.config.permissionMode` sur `approve-all` et redémarrez la passerelle. Voir [Permission configuration](/fr/tools/acp-agents-setup#permission-configuration).                           |
| La session ACP échoue rapidement avec peu de sortie                          | Les invites d'autorisation sont bloquées par `permissionMode`/`nonInteractivePermissions`.                                                                | Vérifiez les journaux de la passerelle pour `AcpRuntimeError`. Pour des autorisations complètes, définissez `permissionMode=approve-all` ; pour une dégradation élégante, définissez `nonInteractivePermissions=deny`. |
| La session ACP stalle indéfiniment après avoir terminé le travail            | Le processus du harnais est terminé mais la session ACP n'a pas signalé la fin.                                                                           | Mettez à jour OpenClaw ; le nettoyage acpx actuel récupère les processus de wrapper et d'adaptateur périmés appartenant à OpenClaw à la fermeture et au démarrage de Gateway.                                          |
| Le harnais voit `<<<BEGIN_OPENCLAW_INTERNAL_CONTEXT>>>`                      | L'enveloppe d'événement interne a fui à travers la limite ACP.                                                                                            | Mettez à jour OpenClaw et relancez le flux d'achèvement ; les harnais externes ne devraient recevoir que des invites d'achèvement simples.                                                                             |

<Note>
  `Command blocked by PreToolUse hook: Native hook relay unavailable` appartient au relay de hook natif Codex, et non à ACP/acpx. Dans un chat Codex lié, démarrez une nouvelle session avec `/new` ou `/reset` ; si cela fonctionne une fois puis réapparaît lors de l'appel suivant à l'outil natif, redémarrez le serveur d'application Codex ou la OpenClaw Gateway au lieu de répéter `/new`. Voir [Codex
  harness troubleshooting](/fr/plugins/codex-harness#troubleshooting).
</Note>

## Connexes

- [ACP agents - setup](/fr/tools/acp-agents-setup)
- [Agent send](/fr/tools/agent-send)
- [CLI Backends](/fr/gateway/cli-backends)
- [Codex harness](/fr/plugins/codex-harness)
- [Codex harness runtime](/fr/plugins/codex-harness-runtime)
- [Multi-agent sandbox tools](/fr/tools/multi-agent-sandbox-tools)
- [`openclaw acp` (bridge mode)](/fr/cli/acp)
- [Sub-agents](/fr/tools/subagents)
