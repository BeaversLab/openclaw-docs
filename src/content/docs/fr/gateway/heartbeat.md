---
summary: "Messages de sondage Heartbeat et règles de notification"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
sidebarTitle: "Heartbeat"
---

<Note>**Heartbeat vs cron ?** Consultez [Automation](/fr/automation) pour savoir quand utiliser chacun d'eux.</Note>

Heartbeat exécute des **tours d'agent périodiques** dans la session principale afin que le modèle puisse signaler tout ce qui nécessite une attention sans vous spammer.

Heartbeat est un tour de session principale planifié — il ne crée **pas** d'enregistrements de [tâche en arrière-plan](/fr/automation/tasks). Les enregistrements de tâches sont destinés au travail détaché (exécutions ACP, sous-agents, tâches cron isolées).

Dépannage : [Tâches planifiées](/fr/automation/cron-jobs#troubleshooting)

## Quick start (beginner)

<Steps>
  <Step title="Choisir une cadence">
    Laissez les heartbeats activés (la valeur par défaut est `30m`, ou `1h` pour l'authentification Anthropic OAuth/token, y compris la réutilisation du Claude CLI) ou définissez votre propre cadence.
  </Step>
  <Step title="Ajouter HEARTBEAT.md (facultatif)">
    Créez une petite liste de contrôle `HEARTBEAT.md` ou un bloc `tasks:` dans l'espace de travail de l'agent.
  </Step>
  <Step title="Décider où doivent aller les messages heartbeat">
    `target: "none"` est la valeur par défaut ; définissez `target: "last"` pour acheminer vers le dernier contact.
  </Step>
  <Step title="Réglages facultatifs">
    - Activez la diffusion du raisonnement du heartbeat pour plus de transparence.
    - Utilisez un contexte d'amorçage léger si les exécutions du heartbeat n'ont besoin que de `HEARTBEAT.md`.
    - Activez les sessions isolées pour éviter d'envoyer l'historique complet de la conversation à chaque heartbeat.
    - Limitez les heartbeats aux heures actives (heure locale).

  </Step>
</Steps>

Exemple de configuration :

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // explicit delivery to last contact (default is "none")
        directPolicy: "allow", // default: allow direct/DM targets; set "block" to suppress
        lightContext: true, // optional: only inject HEARTBEAT.md from bootstrap files
        isolatedSession: true, // optional: fresh session each run (no conversation history)
        skipWhenBusy: true, // optional: also defer when this agent's subagent or nested lanes are busy
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // optional: send separate `Thinking` message too
      },
    },
  },
}
```

## Valeurs par défaut

- Intervalle : `30m` (ou `1h` lorsque le mode d'authentification détecté est Anthropic OAuth/token, y compris la réutilisation du Claude CLI). Définissez `agents.defaults.heartbeat.every` ou `agents.list[].heartbeat.every` par agent ; utilisez `0m` pour désactiver.
- Corps du prompt (configurable via `agents.defaults.heartbeat.prompt`) : `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- Délai d'attente : les tours de battement de cœur (heartbeat) non définis utilisent `agents.defaults.timeoutSeconds` lorsqu'il est défini. Sinon, ils utilisent la cadence de battement de cœur plafonnée à 600 secondes. Définissez `agents.defaults.heartbeat.timeoutSeconds` ou `agents.list[].heartbeat.timeoutSeconds` par agent pour des travaux de battement de cœur plus longs.
- L'invite de battement de cœur est envoyée **tellement quel** (verbatim) en tant que message utilisateur. L'invite système inclut une section « Heartbeat » uniquement lorsque les battements de cœur sont activés pour l'agent par défaut, et que l'exécution est signalée en interne.
- Lorsque les battements de cœur sont désactivés avec `0m`, les exécutions normales omettent également `HEARTBEAT.md` du contexte d'amorçage (bootstrap) afin que le modèle ne voie pas les instructions réservées aux battements de cœur.
- Les heures actives (`heartbeat.activeHours`) sont vérifiées dans le fuseau horaire configuré. En dehors de la fenêtre, les battements de cœur sont ignorés jusqu'au prochain tic à l'intérieur de la fenêtre.
- Les battements de cœur sont automatiquement différés pendant que le travail cron est actif ou en file d'attente. Définissez `heartbeat.skipWhenBusy: true` pour différer également un agent sur ses propres voies de sous-agent ou de commande imbriquées avec clé de session ; les agents frères ne s'interrompent plus simplement parce qu'un autre agent a du travail de sous-agent en cours.

## À quoi sert l'invite de battement de cœur

L'invite par défaut est intentionnellement large :

- **Tâches en arrière-plan** : « Considérer les tâches en attente » incite l'agent à passer en revue les suites (boîte de réception, calendrier, rappels, travaux en file d'attente) et à signaler tout ce qui est urgent.
- **Vérification humaine** : « Faites parfois un point sur votre humain pendant la journée » incite à un message léger occasionnel du type « avez-vous besoin de quelque chose ? », mais évite le spam nocturne en utilisant votre fuseau horaire local configuré (voir [Timezone](/fr/concepts/timezone)).

Le battement de cœur peut réagir aux [tâches en arrière-plan](/fr/automation/tasks) terminées, mais une exécution de battement de cœur ne crée pas elle-même d'enregistrement de tâche.

Si vous souhaitez qu'un battement de cœur fasse quelque chose de très spécifique (par exemple « vérifier les statistiques Gmail PubSub » ou « vérifier l'intégrité de la passerelle »), définissez `agents.defaults.heartbeat.prompt` (ou `agents.list[].heartbeat.prompt`) sur un corps personnalisé (envoyé tel quel).

## Contrat de réponse

- Si rien ne nécessite d'attention, répondez avec **`HEARTBEAT_OK`**.
- Les exécutions de heartbeat compatibles avec les outils peuvent plutôt appeler `heartbeat_respond` avec `notify: false` pour aucune mise à jour visible, ou `notify: true` plus `notificationText` pour une alerte. Lorsqu'elle est présente, la réponse structurée de l'outil prévaut sur le texte de repli.
- Pendant les exécutions de heartbeat, OpenClaw traite `HEARTBEAT_OK` comme un accusé de réception lorsqu'il apparaît au **début ou à la fin** de la réponse. Le jeton est supprimé et la réponse est ignorée si le contenu restant est **≤ `ackMaxChars`** (par défaut : 300).
- Si `HEARTBEAT_OK` apparaît au **milieu** d'une réponse, il n'est pas traité spécialement.
- Pour les alertes, **n'incluez pas** `HEARTBEAT_OK` ; renvoyez uniquement le texte de l'alerte.

En dehors des heartbeats, les `HEARTBEAT_OK` isolés au début/à la fin d'un message sont supprimés et journalisés ; un message qui ne contient que `HEARTBEAT_OK` est ignoré.

## Config

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // default: 30m (0m disables)
        model: "anthropic/claude-opus-4-6",
        includeReasoning: false, // default: false (deliver separate Thinking message when available)
        lightContext: false, // default: false; true keeps only HEARTBEAT.md from workspace bootstrap files
        isolatedSession: false, // default: false; true runs each heartbeat in a fresh session (no conversation history)
        skipWhenBusy: false, // default: false; true also waits for this agent's subagent/nested lanes
        target: "last", // default: none | options: last | none | <channel id> (core or plugin, e.g. "imessage")
        to: "+15551234567", // optional channel-specific override
        accountId: "ops-bot", // optional multi-account channel id
        prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        ackMaxChars: 300, // max chars allowed after HEARTBEAT_OK
      },
    },
  },
}
```

### Portée et précédence

- `agents.defaults.heartbeat` définit le comportement global du heartbeat.
- `agents.list[].heartbeat` se fusionne par-dessus ; si un agent possède un bloc `heartbeat`, **seuls ces agents** exécutent des heartbeats.
- `channels.defaults.heartbeat` définit les paramètres de visibilité par défaut pour tous les channels.
- `channels.<channel>.heartbeat` remplace les paramètres par défaut du channel.
- `channels.<channel>.accounts.<id>.heartbeat` (channels multi-comptes) remplace les paramètres par channel.

### Heartbeats par agent

Si une entrée `agents.list[]` inclut un bloc `heartbeat`, **seuls ces agents** exécutent des heartbeats. Le bloc par agent se fusionne par-dessus `agents.defaults.heartbeat` (vous pouvez donc définir des valeurs par défaut partagées une seule fois et les modifier par agent).

Exemple : deux agents, seul le second agent exécute des heartbeats.

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // explicit delivery to last contact (default is "none")
      },
    },
    list: [
      { id: "main", default: true },
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "whatsapp",
          to: "+15551234567",
          timeoutSeconds: 45,
          prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        },
      },
    ],
  },
}
```

### Exemple d'heures actives

Limiter les heartbeats aux heures de bureau dans un fuseau horaire spécifique :

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // explicit delivery to last contact (default is "none")
        activeHours: {
          start: "09:00",
          end: "22:00",
          timezone: "America/New_York", // optional; uses your userTimezone if set, otherwise host tz
        },
      },
    },
  },
}
```

En dehors de cette fenêtre (avant 9h ou après 22h heure de l'Est), les heartbeats sont ignorés. Le prochain tick programmé dans la fenêtre s'exécutera normalement.

### Configuration 24/7

Si vous souhaitez que les heartbeats s'exécutent toute la journée, utilisez l'un de ces modèles :

- Omettez entièrement `activeHours` (aucune restriction de fenêtre horaire ; c'est le comportement par défaut).
- Définissez une fenêtre de jour complet : `activeHours: { start: "00:00", end: "24:00" }`.

<Warning>Ne définissez pas la même heure pour `start` et `end` (par exemple `08:00` à `08:00`). Cela est traité comme une fenêtre de largeur nulle, les heartbeats sont donc toujours ignorés.</Warning>

### Exemple multi-compte

Utilisez `accountId` pour cibler un compte spécifique sur les canaux multi-comptes comme Telegram :

```json5
{
  agents: {
    list: [
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "telegram",
          to: "12345678:topic:42", // optional: route to a specific topic/thread
          accountId: "ops-bot",
        },
      },
    ],
  },
  channels: {
    telegram: {
      accounts: {
        "ops-bot": { botToken: "YOUR_TELEGRAM_BOT_TOKEN" },
      },
    },
  },
}
```

### Notes de terrain

<ParamField path="every" type="string">
  Intervalle de heartbeat (chaîne de durée ; unité par défaut = minutes).
</ParamField>
<ParamField path="model" type="string">
  Substitution optionnelle du model pour les exécutions de heartbeat (`provider/model`).
</ParamField>
<ParamField path="includeReasoning" type="boolean" default="false">
  Lorsqu'il est activé, délivre également le message séparé `Thinking` lorsqu'il est disponible (même forme que `/reasoning on`).
</ParamField>
<ParamField path="lightContext" type="boolean" default="false">
  Si vrai, les exécutions de heartbeat utilisent un contexte d'amorçage léger et ne conservent que `HEARTBEAT.md` des fichiers d'amorçage de l'espace de travail.
</ParamField>
<ParamField path="isolatedSession" type="boolean" default="false">
  Si vrai, chaque heartbeat s'exécute dans une session fraîche sans historique de conversation précédent. Utilise le même modèle d'isolement que cron `sessionTarget: "isolated"`. Réduit considérablement le coût en jetons par heartbeat. Combinez avec `lightContext: true` pour des économies maximales. Le routage de livraison utilise toujours le contexte de la session principale.
</ParamField>
<ParamField path="skipWhenBusy" type="boolean" default="false">
  Si vrai, les exécutions de heartbeat diffèrent sur les voies particulièrement occupées de cet agent : son propre sous-agent à clé de session ou le travail de commande imbriqué. Les voies Cron diffèrent toujours les heartbeats, même sans cet indicateur, les hôtes de modèle local n'exécutent donc pas les invites cron et heartbeat en même temps.
</ParamField>
<ParamField path="session" type="string">
  Clé de session optionnelle pour les exécutions de heartbeat.

- `main` (par défaut) : session principale de l'agent.
- Clé de session explicite (à copier depuis `openclaw sessions --json`CLI ou la [sessions CLI](/fr/cli/sessions)).
- Formats de clé de session : voir [Sessions](/fr/concepts/session) et [Groupes](/fr/channels/groups).

</ParamField>
<ParamField path="target" type="string">
- `last` : envoyer vers le dernier canal externe utilisé.
- canal explicite : n'importe quel canal configuré ou identifiant de plugin, par exemple `discord`, `matrix`, `telegram`, ou `whatsapp`.
- `none` (par défaut) : exécuter le heartbeat mais **ne pas livrer** à l'externe.

</ParamField>
<ParamField path="directPolicy" type='"allow" | "block"' default="allow">
  Contrôle le comportement de livraison directe/DM. `allow` : autoriser la livraison de heartbeat directe/DM. `block` : supprimer la livraison directe/DM (`reason=dm-blocked`).

</ParamField>
<ParamField path="to" type="string"WhatsAppTelegramTelegram>
  Remplacement facultatif du destinataire (id spécifique au canal, par ex. E.164 pour WhatsApp ou un id de chat Telegram). Pour les sujets/fils Telegram, utilisez `<chatId>:topic:<messageThreadId>`.

</ParamField>
<ParamField path="accountId" type="string">
  Id de compte facultatif pour les canaux multi-comptes. Lorsque `target: "last"`, l'id de compte s'applique au dernier canal résolu s'il prend en charge les comptes ; sinon, il est ignoré. Si l'id de compte ne correspond pas à un compte configuré pour le canal résolu, la livraison est ignorée.

</ParamField>
<ParamField path="prompt" type="string">
  Remplace le corps du prompt par défaut (non fusionné).

</ParamField>
<ParamField path="ackMaxChars" type="number" default="300">
  Nombre maximum de caractères autorisés après `HEARTBEAT_OK` avant la livraison.

</ParamField>
<ParamField path="suppressToolErrorWarnings" type="boolean">
  Lorsque la valeur est true, supprime les charges utiles d'avertissement d'erreur de tool pendant les exécutions de heartbeat.

</ParamField>
<ParamField path="timeoutSeconds" type="number" default="global timeout or min(every, 600)">
  Nombre maximal de secondes autorisé pour un tour d'agent de heartbeat avant qu'il ne soit abandonné. Laissez non défini pour utiliser `agents.defaults.timeoutSeconds` si défini, sinon la cadence de heartbeat est plafonnée à 600 secondes.

</ParamField>
<ParamField path="activeHours" type="object">
  Restreint les exécutions de heartbeat à une fenêtre horaire. Objet avec `start` (HH:MM, inclus ; utilisez `00:00` pour le début de la journée), `end` (HH:MM exclus ; `24:00` autorisé pour la fin de journée), et `timezone` en option.

- Omis ou `"user"` : utilise votre `agents.defaults.userTimezone` si défini, sinon revient au fuseau horaire du système hôte.
- `"local"` : utilise toujours le fuseau horaire du système hôte.
- Tout identifiant IANA (ex. `America/New_York`) : utilisé directement ; si invalide, revient au comportement `"user"` ci-dessus.
- `start` et `end` ne doivent pas être égaux pour une fenêtre active ; les valeurs égales sont traitées comme de largeur nulle (toujours en dehors de la fenêtre).
- En dehors de la fenêtre active, les heartbeats sont ignorés jusqu'au prochain tick dans la fenêtre.

</ParamField>

## Comportement de livraison

<AccordionGroup>
  <Accordion title="Session et routage des cibles">
    - Les Heartbeats s'exécutent par défaut dans la session principale de l'agent (`agent:<id>:<mainKey>`), ou `global` quand `session.scope = "global"`. Définissez `session` pour forcer vers une session de canal spécifique (Discord/WhatsApp/etc.).
    - `session` n'affecte que le contexte d'exécution ; la livraison est contrôlée par `target` et `to`.
    - Pour livrer à un canal/destinataire spécifique, définissez `target` + `to`. Avec `target: "last"`, la livraison utilise le dernier canal externe pour cette session.
    - Les livraisons Heartbeat autorisent par défaut les cibles directes/DM. Définissez `directPolicy: "block"` pour supprimer les envois vers des cibles directes tout en exécutant toujours le tour de heartbeat.
    - Si la file d'attente principale, le couloir de session cible, le couloir cron ou une tâche cron active est occupé, le heartbeat est ignoré et réessayé plus tard.
    - Si `skipWhenBusy: true`, les sous-agents avec clé de session de cet agent et les couloirs imbriqués reportent également les exécutions de heartbeat. Les couloirs occupés d'autres agents ne reportent pas cet agent.
    - Si `target` ne résout aucune destination externe, l'exécution a toujours lieu mais aucun message sortant n'est envoyé.

  </Accordion>
  <Accordion title="Visibilité et comportement d'ignorance">
    - Si `showOk`, `showAlerts` et `useIndicator` sont tous désactivés, l'exécution est ignorée dès le début en tant que `reason=alerts-disabled`.
    - Si seule la livraison des alertes est désactivée, OpenClaw peut toujours exécuter le heartbeat, mettre à jour les horodatages des tâches en attente, restaurer l'horodatage d'inactivité de la session et supprimer la charge utile de l'alerte sortante.
    - Si la cible heartbeat résolue prend en charge la saisie (typing), OpenClaw affiche la saisie pendant que l'exécution du heartbeat est active. Cela utilise la même cible à laquelle le heartbeat enverrait la sortie du chat, et elle est désactivée par `typingMode: "never"`.

  </Accordion>
  <Accordion title="Cycle de vie de la session et audit">
    - Les réponses Heartbeat uniquement ne gardent **pas** la session en vie. Les métadonnées Heartbeat peuvent mettre à jour la ligne de session, mais l'expiration d'inactivité utilise `lastInteractionAt` du dernier vrai message utilisateur/canal, et l'expiration quotidienne utilise `sessionStartedAt`.
    - L'interface de contrôle et l'historique WebChat masquent les invites Heartbeat et les accusés de réception OK uniquement. La transcription de session sous-jacente peut toujours contenir ces tours pour l'audit/relecture.
    - Les [tâches en arrière-plan](/fr/automation/tasks) détachées peuvent mettre en file un événement système et réveiller le heartbeat lorsque la session principale doit remarquer quelque chose rapidement. Ce réveil ne fait pas exécuter une tâche en arrière-plan par le heartbeat.

  </Accordion>
</AccordionGroup>

## Contrôles de visibilité

Par défaut, les accusés de réception `HEARTBEAT_OK` sont supprimés pendant que le contenu de l'alerte est diffusé. Vous pouvez ajuster cela par canal ou par compte :

```yaml
channels:
  defaults:
    heartbeat:
      showOk: false # Hide HEARTBEAT_OK (default)
      showAlerts: true # Show alert messages (default)
      useIndicator: true # Emit indicator events (default)
  telegram:
    heartbeat:
      showOk: true # Show OK acknowledgments on Telegram
  whatsapp:
    accounts:
      work:
        heartbeat:
          showAlerts: false # Suppress alert delivery for this account
```

Priorité : par compte → par canal → valeurs par défaut du canal → valeurs par défaut intégrées.

### Ce que fait chaque indicateur

- `showOk` : envoie un accusé de réception `HEARTBEAT_OK` lorsque le modèle renvoie une réponse OK uniquement.
- `showAlerts` : envoie le contenu de l'alerte lorsque le modèle renvoie une réponse autre que OK.
- `useIndicator` : émet des événements indicateurs pour les surfaces d'état de l'interface utilisateur.

Si **les trois** sont faux, OpenClaw ignore entièrement l'exécution du heartbeat (pas d'appel au modèle).

### Exemples par canal vs par compte

```yaml
channels:
  defaults:
    heartbeat:
      showOk: false
      showAlerts: true
      useIndicator: true
  slack:
    heartbeat:
      showOk: true # all Slack accounts
    accounts:
      ops:
        heartbeat:
          showAlerts: false # suppress alerts for the ops account only
  telegram:
    heartbeat:
      showOk: true
```

### Modèles courants

| Objectif                                                  | Config                                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Comportement par défaut (OK silencieux, alertes activées) | _(aucune configuration requise)_                                                         |
| Entièrement silencieux (aucun message, aucun indicateur)  | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| Indicateur uniquement (aucun message)                     | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| OK dans un seul canal                                     | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md (optionnel)

Si un fichier `HEARTBEAT.md` existe dans l'espace de travail, l'invite par défaut demande à l'agent de le lire. Considérez-le comme votre "liste de contrôle heartbeat" : petit, stable et sûr à consulter toutes les 30 minutes.

Lors des exécutions normales, `HEARTBEAT.md` n'est injecté que lorsque les instructions de heartbeat sont activées pour l'agent par défaut. La désactivation de la cadence du heartbeat avec `0m` ou le paramétrage de `includeSystemPromptSection: false` l'omet du contexte de démarrage normal.

Sur le harnais Codex natif, le contenu de `HEARTBEAT.md` n'est pas injecté dans le tour. Si le fichier existe et contient du contenu non vide, les instructions du mode collaboration du heartbeat pointent Codex vers le fichier et lui indiquent de le lire avant de procéder.

Si `HEARTBEAT.md` existe mais est effectivement vide (uniquement des lignes vides et des en-têtes markdown comme `# Heading`), OpenClaw ignore l'exécution du heartbeat pour économiser les appels API. Cette omission est signalée comme `reason=empty-heartbeat-file`. Si le fichier est manquant, le heartbeat s'exécute quand même et le modèle décide quoi faire.

Gardez-le minime (courte liste de vérification ou rappels) pour éviter l'enflure du prompt.

Exemple `HEARTBEAT.md` :

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it's daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### Blocs `tasks:`

`HEARTBEAT.md` prend également en charge un petit bloc structuré `tasks:` pour les vérifications basées sur des intervalles à l'intérieur du heartbeat lui-même.

Exemple :

```md
tasks:

- name: inbox-triage
  interval: 30m
  prompt: "Check for urgent unread emails and flag anything time sensitive."
- name: calendar-scan
  interval: 2h
  prompt: "Check for upcoming meetings that need prep or follow-up."

# Additional instructions

- Keep alerts short.
- If nothing needs attention after all due tasks, reply HEARTBEAT_OK.
```

<AccordionGroup>
  <Accordion title="Behavior">
    - OpenClaw analyse le bloc `tasks:` et vérifie chaque tâche par rapport à son propre `interval`.
    - Seules les tâches ** échues ** sont incluses dans le prompt du heartbeat pour ce tick.
    - Si aucune tâche n'est échue, le heartbeat est entièrement ignoré (`reason=no-tasks-due`) pour éviter un appel de modèle gaspillé.
    - Le contenu non-tâche dans `HEARTBEAT.md` est conservé et ajouté comme contexte supplémentaire après la liste des tâches échues.
    - Les horodatages de dernière exécution des tâches sont stockés dans l'état de session (`heartbeatTaskState`), de sorte que les intervalles survivent aux redémarrages normaux.
    - Les horodatages des tâches ne sont avancés qu'une fois l'exécution du heartbeat terminée son chemin de réponse normal. Les exécutions ignorées `empty-heartbeat-file` / `no-tasks-due` ne marquent pas les tâches comme terminées.

  </Accordion>
</AccordionGroup>

Le mode tâche est utile lorsque vous souhaitez qu'un fichier heartbeat contienne plusieurs vérifications périodiques sans payer pour chacune d'elles à chaque tick.

### L'agent peut-il mettre à jour HEARTBEAT.md ?

Oui — si vous le lui demandez.

`HEARTBEAT.md` n'est qu'un fichier normal dans l'espace de travail de l'agent, vous pouvez donc dire à l'agent (dans une discussion normale) quelque chose comme :

- "Mettez à jour `HEARTBEAT.md` pour ajouter une vérification quotidienne du calendrier."
- "Réécrivez `HEARTBEAT.md` pour qu'il soit plus court et axé sur les suivis de boîte de réception."

Si vous souhaitez que cela se produise de manière proactive, vous pouvez également inclure une ligne explicite dans votre prompt de heartbeat, comme : "Si la liste de contrôle devient obsolète, mettez à jour HEARTBEAT.md avec une meilleure version."

<Warning>Ne mettez pas de secrets (clés API, numéros de téléphone, jetons privés) dans `HEARTBEAT.md` — cela devient partie intégrante du contexte du prompt.</Warning>

## Réveil manuel (à la demande)

Vous pouvez mettre en file d'attente un événement système et déclencher un heartbeat immédiat avec :

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

Si plusieurs agents ont `heartbeat` configuré, un réveil manuel exécute immédiatement chacun des heartbeats de ces agents.

Utilisez `--mode next-heartbeat` pour attendre le prochain tick planifié.

## Livraison du raisonnement (optionnel)

Par défaut, les heartbeats ne livrent que la charge utile "answer" finale.

Si vous souhaitez de la transparence, activez :

- `agents.defaults.heartbeat.includeReasoning: true`

Lorsqu'il est activé, les heartbeats livreront également un message distinct préfixé par `Thinking` (même forme que `/reasoning on`). Cela peut être utile lorsque l'agent gère plusieurs sessions/codexes et que vous voulez voir pourquoi il a décidé de vous envoyer une notification — mais cela peut aussi révéler plus de détails internes que vous ne le souhaitez. Préférez le désactiver dans les discussions de groupe.

## Conscience des coûts

Les heartbeats exécutent des tours complets d'agent. Des intervalles plus courts consomment plus de jetons. Pour réduire les coûts :

- Utilisez `isolatedSession: true` pour éviter d'envoyer l'historique complet de la conversation (environ 100K jetons réduits à ~2-5K par exécution).
- Utilisez `lightContext: true` pour limiter les fichiers d'amorçage uniquement à `HEARTBEAT.md`.
- Définissez un `model` moins coûteux (par ex. `ollama/llama3.2:1b`).
- Gardez `HEARTBEAT.md` petit.
- Utilisez `target: "none"` si vous ne souhaitez que des mises à jour de l'état interne.

## Dépassement de contexte après le heartbeat

Si un heartbeat a précédemment laissé une session existante sur un modèle local plus petit, par exemple un modèle Ollama avec une fenêtre de 32k, et que le prochain tour de session principal signale un débordement de contexte, réinitialisez le modèle d'exécution de session au modèle principal configuré. Le message de réinitialisation d'OpenClaw le signale lorsque le dernier modèle d'exécution correspond à `heartbeat.model` configuré.

Les heartbeats actuels préservent le modèle d'exécution existant de la session partagée après l'exécution. Vous pouvez toujours utiliser `isolatedSession: true` pour exécuter des heartbeats dans une nouvelle session, le combiner avec `lightContext: true` pour le plus petit prompt, ou choisir un modèle de heartbeat avec une fenêtre de contexte suffisamment grande pour la session partagée.

## Connexes

- [Automatisation](/fr/automation) — tous les mécanismes d'automatisation en un coup d'œil
- [Tâches d'arrière-plan](/fr/automation/tasks) — suivi du travail détaché
- [Fuseau horaire](/fr/concepts/timezone) — incidence du fuseau horaire sur la planification des heartbeats
- [Dépannage](/fr/automation/cron-jobs#troubleshooting) — débogage des problèmes d'automatisation
