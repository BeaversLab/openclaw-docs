---
summary: "Messages de sondage Heartbeat et règles de notification"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
sidebarTitle: "Heartbeat"
---

<Note>**Heartbeat ou cron ?** Consultez [Automatisation](/fr/automation) pour obtenir des conseils sur l'utilisation de chacun.</Note>

Heartbeat exécute des **tours d'agent périodiques** dans la session principale afin que le modèle puisse signaler tout ce qui nécessite une attention sans vous spammer.

Heartbeat est un tour de session principale planifié — il ne crée **pas** d'enregistrements de [tâche d'arrière-plan](/fr/automation/tasks). Les enregistrements de tâches sont destinés au travail détaché (exécutions ACP, sous-agents, tâches cron isolées).

Dépannage : [Tâches planifiées](/fr/automation/cron-jobs#troubleshooting)

## Quick start (beginner)

<Steps>
  <Step title="Choisir une cadence">
    Laissez les heartbeats activés (la valeur par défaut est `30m`, ou `1h` pour l'authentification par Anthropic OAuth/jeton, y compris la réutilisation du CLI Claude) ou définissez votre propre cadence.
  </Step>
  <Step title="Ajouter HEARTBEAT.md (optionnel)">
    Créez une petite `HEARTBEAT.md` checklist ou un bloc `tasks:` dans l'espace de travail de l'agent.
  </Step>
  <Step title="Décider où les messages heartbeat doivent aller">
    `target: "none"` est la valeur par défaut ; définissez `target: "last"` pour router vers le dernier contact.
  </Step>
  <Step title="Réglages optionnels">
    - Activez la transmission du raisonnement du heartbeat pour la transparence.
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
        // includeReasoning: true, // optional: send separate `Reasoning:` message too
      },
    },
  },
}
```

## Valeurs par défaut

- Intervalle : `30m` (ou `1h` lorsque le mode d'authentification détecté est Anthropic OAuth/jeton, y compris la réutilisation du CLI Claude). Définissez `agents.defaults.heartbeat.every` ou un `agents.list[].heartbeat.every` par agent ; utilisez `0m` pour désactiver.
- Corps du prompt (configurable via `agents.defaults.heartbeat.prompt`) : `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- Le prompt heartbeat est envoyé **tel quel** en tant que message utilisateur. Le prompt système inclut une section « Heartbeat » uniquement lorsque les heartbeats sont activés pour l'agent par défaut et que l'exécution est signalée en interne.
- Lorsque les battements de cœur (heartbeats) sont désactivés avec `0m`, les exécutions normales omettent également `HEARTBEAT.md` du contexte d'amorçage (bootstrap) afin que le modèle ne voie pas les instructions réservées aux heartbeats.
- Les heures actives (`heartbeat.activeHours`) sont vérifiées dans le fuseau horaire configuré. En dehors de cette fenêtre, les heartbeats sont ignorés jusqu'au prochain tic à l'intérieur de la fenêtre.
- Les heartbeats sont automatiquement différés pendant que le travail cron est actif ou en file d'attente. Définissez `heartbeat.skipWhenBusy: true` pour également différer un agent sur ses propres sous-agents ou voies de commande imbriquées avec clé de session ; les agents frères ne se mettent plus en pause simplement parce qu'un autre agent a du travail de sous-agent en cours.

## À quoi sert le prompt de heartbeat

Le prompt par défaut est volontairement large :

- **Tâches d'arrière-plan** : « Considérez les tâches en attente » incite l'agent à examiner les suivis (boîte de réception, calendrier, rappels, travail en file d'attente) et à signaler tout ce qui est urgent.
- **Point de contrôle humain** : « Faites parfois un point sur votre humain pendant la journée » incite à un message occasionnel et léger du type « avez-vous besoin de quoi que ce soit ? », mais évite le spam nocturne en utilisant votre fuseau horaire local configuré (voir [Timezone](/fr/concepts/timezone)).

Le heartbeat peut réagir aux [tâches d'arrière-plan](/fr/automation/tasks) terminées, mais une exécution de heartbeat ne crée pas elle-même d'enregistrement de tâche.

Si vous souhaitez qu'un heartbeat effectue une tâche très spécifique (par exemple, « vérifier les statistiques Gmail PubSub » ou « vérifier la santé de la passerelle »), définissez `agents.defaults.heartbeat.prompt` (ou `agents.list[].heartbeat.prompt`) avec un corps personnalisé (envoyé tel quel).

## Contrat de réponse

- Si rien ne nécessite d'attention, répondez avec **`HEARTBEAT_OK`**.
- Les exécutions de heartbeat compatibles avec les outils peuvent à la place appeler `heartbeat_respond` avec `notify: false` pour aucune mise à jour visible, ou `notify: true` plus `notificationText` pour une alerte. Lorsqu'elle est présente, la réponse structurée de l'outil prévaut sur le texte de repli.
- Pendant les exécutions de heartbeat, OpenClaw traite `HEARTBEAT_OK` comme un accusé de réception lorsqu'il apparaît au **début ou à la fin** de la réponse. Le jeton est supprimé et la réponse est ignorée si le contenu restant est **≤ `ackMaxChars`** (par défaut : 300).
- Si `HEARTBEAT_OK` apparaît au **milieu** d'une réponse, il n'est pas traité spécialement.
- Pour les alertes, **n'incluez pas** `HEARTBEAT_OK` ; ne renvoyez que le texte de l'alerte.

Hors des heartbeats, les `HEARTBEAT_OK` isolés au début ou à la fin d'un message sont supprimés et journalisés ; un message qui n'est composé que de `HEARTBEAT_OK` est ignoré.

## Configuration

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // default: 30m (0m disables)
        model: "anthropic/claude-opus-4-6",
        includeReasoning: false, // default: false (deliver separate Reasoning: message when available)
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

### Portée et priorité

- `agents.defaults.heartbeat` définit le comportement global du heartbeat.
- `agents.list[].heartbeat` fusionne par-dessus ; si un agent possède un bloc `heartbeat`, **seuls ces agents** exécutent des heartbeats.
- `channels.defaults.heartbeat` définit les valeurs par défaut de visibilité pour tous les channels.
- `channels.<channel>.heartbeat` remplace les valeurs par défaut des channels.
- `channels.<channel>.accounts.<id>.heartbeat` (channels multi-comptes) remplace les paramètres par channel.

### Heartbeats par agent

Si une entrée `agents.list[]` inclut un bloc `heartbeat`, **seuls ces agents** exécutent des heartbeats. Le bloc par agent fusionne par-dessus `agents.defaults.heartbeat` (vous pouvez donc définir des valeurs par défaut partagées une seule fois et les remplacer par agent).

Exemple : deux agents, seul le deuxième agent exécute des heartbeats.

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

Limiter les heartbeats aux heures ouvrées dans un fuseau horaire spécifique :

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

Hors de cette fenêtre (avant 9h ou après 22h heure de l'Est), les heartbeats sont ignorés. Le prochain tick planifié dans la fenêtre s'exécutera normalement.

### Configuration 24/7

Si vous souhaitez que les heartbeats s'exécutent toute la journée, utilisez l'un de ces modèles :

- Omettez entièrement `activeHours` (aucune restriction de fenêtre horaire ; il s'agit du comportement par défaut).
- Définissez une fenêtre pour toute la journée : `activeHours: { start: "00:00", end: "24:00" }`.

<Warning>Ne définissez pas la même heure pour `start` et `end` (par exemple `08:00` à `08:00`). Cela est traité comme une fenêtre de largeur nulle, les heartbeats sont donc toujours ignorés.</Warning>

### Exemple multi-compte

Utilisez `accountId` pour cibler un compte spécifique sur les channels multi-comptes comme Telegram :

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
  Remplacement facultatif de model pour les exécutions de heartbeat (`provider/model`).
</ParamField>
<ParamField path="includeReasoning" type="boolean" default="false">
  Lorsqu'il est activé, fournit également le message séparé `Reasoning:` lorsqu'il est disponible (même forme que `/reasoning on`).
</ParamField>
<ParamField path="lightContext" type="boolean" default="false">
  Si vrai, les exécutions de heartbeat utilisent un contexte d'amorçage léger et ne conservent que `HEARTBEAT.md` des fichiers d'amorçage de l'espace de travail.
</ParamField>
<ParamField path="isolatedSession" type="boolean" default="false">
  Si vrai, chaque heartbeat s'exécute dans une session fraîche sans historique de conversation précédent. Utilise le même modèle d'isolement que le cron `sessionTarget: "isolated"`. Réduit considérablement le coût en jetons par heartbeat. Combinez avec `lightContext: true` pour des économies maximales. Le routage de livraison utilise toujours le contexte de la session principale.
</ParamField>
<ParamField path="skipWhenBusy" type="boolean" default="false">
  Si vrai, les exécutions de heartbeat sont différées sur les voies supplémentaires occupées de cet agent : son propre sous-agent avec clé de session ou le travail de commande imbriqué. Les voies cron diffèrent toujours les heartbeats, même sans cet indicateur, afin que les hôtes de modèles locaux n'exécutent pas les invites cron et heartbeat en même temps.
</ParamField>
<ParamField path="session" type="string">
  Clé de session facultative pour les exécutions de heartbeat.

- `main` (par défaut) : session principale de l'agent.
- Clé de session explicite (copiez à partir de `openclaw sessions --json`CLI ou de la [CLI sessions](/fr/cli/sessions)).
- Formats de clé de session : voir [Sessions](/fr/concepts/session) et [Groupes](/fr/channels/groups).

</ParamField>
<ParamField path="target" type="string">
- `last` : envoyer vers le dernier canal externe utilisé.
- canal explicite : n'importe quel canal configuré ou identifiant de plugin, par exemple `discord`, `matrix`, `telegram` ou `whatsapp`.
- `none` (par défaut) : exécuter le heartbeat mais **ne pas livrer** externe.

</ParamField>
<ParamField path="directPolicy" type='"allow" | "block"' default="allow">
  Contrôle le comportement de livraison directe/DM. `allow` : autoriser la livraison de heartbeat directe/DM. `block` : supprimer la livraison directe/DM (`reason=dm-blocked`).

</ParamField>
<ParamField path="to" type="string">
  Remplacement facultatif du destinataire (id spécifique au canal, par ex. E.164 pour WhatsApp ou un id de chat Telegram). Pour les sujets/fils de discussion Telegram, utilisez `<chatId>:topic:<messageThreadId>`.

</ParamField>
<ParamField path="accountId" type="string">
  Identifiant de compte facultatif pour les canaux multi-comptes. Lorsque `target: "last"`, l'identifiant de compte s'applique au dernier canal résolu s'il prend en charge les comptes ; sinon, il est ignoré. Si l'identifiant de compte ne correspond pas à un compte configuré pour le canal résolu, la livraison est ignorée.

</ParamField>
<ParamField path="prompt" type="string">
  Remplace le corps du prompt par défaut (non fusionné).

</ParamField>
<ParamField path="ackMaxChars" type="number" default="300">
  Nombre max de caractères autorisés après `HEARTBEAT_OK` avant la livraison.

</ParamField>
<ParamField path="suppressToolErrorWarnings" type="boolean">
  Si vrai, supprime les charges utiles d'avertissement d'erreur d'outil pendant les exécutions de heartbeat.

</ParamField>
<ParamField path="activeHours" type="object">
  Restreint les exécutions du rythme cardiaque à une fenêtre temporelle. Objet avec `start` (HH:MM, inclus ; utilisez `00:00` pour le début de la journée), `end` (HH:MM exclus ; `24:00` autorisé pour la fin de journée), et `timezone` en option.

- Omis ou `"user"` : utilise votre `agents.defaults.userTimezone` si défini, sinon revient au fuseau horaire du système hôte.
- `"local"` : utilise toujours le fuseau horaire du système hôte.
- Tout identifiant IANA (ex. `America/New_York`) : utilisé directement ; si invalide, revient au comportement `"user"` ci-dessus.
- `start` et `end` ne doivent pas être égaux pour une fenêtre active ; des valeurs égales sont traitées comme une largeur nulle (toujours hors fenêtre).
- En dehors de la fenêtre active, les rythmes cardiaques sont ignorés jusqu'au prochain top dans la fenêtre.

</ParamField>

## Comportement de livraison

<AccordionGroup>
  <Accordion title="Session and target routing">
    - Par défaut, les battements de cœur (heartbeats) s'exécutent dans la session principale de l'agent (`agent:<id>:<mainKey>`), ou `global` lorsque `session.scope = "global"`. Définissez `session` pour forcer une session de canal spécifique (Discord/WhatsApp/etc.).
    - `session` n'affecte que le contexte d'exécution ; la livraison est contrôlée par `target` et `to`.
    - Pour livrer à un canal/destinataire spécifique, définissez `target` + `to`. Avec `target: "last"`, la livraison utilise le dernier canal externe pour cette session.
    - Les livraisons de battements de cœur permettent des cibles directes/DM par défaut. Définissez `directPolicy: "block"` pour supprimer les envois vers des cibles directes tout en exécutant toujours le tour de battement de cœur.
    - Si la file d'attente principale, le volet de session cible, le volet cron ou une tâche cron active est occupé, le battement de cœur est ignoré et réessayé plus tard.
    - Si `skipWhenBusy: true`, les sous-agents avec clé de session et les volets imbriqués de cet agent diffèrent également les exécutions de battement de cœur. Les volets occupés d'autres agents ne diffèrent pas cet agent.
    - Si `target` ne résout aucune destination externe, l'exécution a toujours lieu mais aucun message sortant n'est envoyé.

  </Accordion>
  <Accordion title="Visibilité et comportement d'ignore">
    - Si `showOk`, `showAlerts` et `useIndicator` sont tous désactivés, l'exécution est ignorée dès le début en tant que `reason=alerts-disabled`.
    - Si seule la livraison des alertes est désactivée, OpenClaw peut toujours exécuter le battement de cœur, mettre à jour les horodatages des tâches dues, restaurer l'horodatage d'inactivité de la session et supprimer la charge utile de l'alerte sortante.
    - Si la cible résolue du battement de cœur prend en charge la frappe, OpenClaw affiche la frappe tant que l'exécution du battement de cœur est active. Cela utilise la même cible à laquelle le battement de cœur enverrait la sortie du chat, et elle est désactivée par `typingMode: "never"`.

  </Accordion>
  <Accordion title="Session lifecycle and audit">
    - Les réponses exclusives de heartbeat ne maintiennent **pas** la session active. Les métadonnées du heartbeat peuvent mettre à jour la ligne de la session, mais l'expiration d'inactivité utilise `lastInteractionAt` du dernier vrai message utilisateur/canal, et l'expiration quotidienne utilise `sessionStartedAt`.
    - L'interface de contrôle et l'historique WebChat masquent les invites de heartbeat et les accusés de réception OK uniquement. Le transcript de session sous-jacent peut toujours contenir ces tours pour l'audit/la relecture.
    - Les [tâches d'arrière-plan](/fr/automation/tasks) détachées peuvent mettre en file d'attente un événement système et réveiller le heartbeat lorsque la session principale doit remarquer quelque chose rapidement. Ce réveil ne fait pas exécuter une tâche d'arrière-plan par le heartbeat.

  </Accordion>
</AccordionGroup>

## Contrôles de visibilité

Par défaut, les accusés de réception `HEARTBEAT_OK` sont supprimés tandis que le contenu de l'alerte est délivré. Vous pouvez ajuster cela par canal ou par compte :

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
- `showAlerts` : envoie le contenu de l'alerte lorsque le modèle renvoie une réponse non-OK.
- `useIndicator` : émet des événements indicateur pour les surfaces d'état de l'interface utilisateur.

Si les **trois** sont faux, OpenClaw ignore totalement l'exécution du heartbeat (pas d'appel au modèle).

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

| Objectif                                                   | Config                                                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Comportement par défaut (OK silencieux, alertes activées)  | _(aucune configuration requise)_                                                         |
| Entièrement silencieux (pas de messages, pas d'indicateur) | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| Indicateur uniquement (pas de messages)                    | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| OK dans un seul canal                                      | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md (optionnel)

Si un fichier `HEARTBEAT.md` existe dans l'espace de travail, l'invite par défaut indique à l'agent de le lire. Considérez-le comme votre "liste de contrôle heartbeat" : petit, stable et sûr à inclure toutes les 30 minutes.

Lors des exécutions normales, `HEARTBEAT.md` n'est injecté que lorsque les instructions de heartbeat sont activées pour l'agent par défaut. La désactivation de la cadence de heartbeat avec `0m` ou le paramétrage de `includeSystemPromptSection: false` l'omet du contexte de démarrage normal.

Si `HEARTBEAT.md` existe mais est effectivement vide (uniquement des lignes vides et des en-têtes markdown comme `# Heading`), OpenClaw ignore l'exécution du heartbeat pour économiser les appels à l'API. Cette omission est signalée comme `reason=empty-heartbeat-file`. Si le fichier est manquant, le heartbeat s'exécute quand même et le model décide de ce qu'il faut faire.

Gardez-le minime (courte liste de contrôle ou rappels) pour éviter le gonflement du prompt.

Exemple de `HEARTBEAT.md` :

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
    - Seules les tâches **dues** sont incluses dans le prompt du heartbeat pour ce tick.
    - Si aucune tâche n'est due, le heartbeat est entièrement ignoré (`reason=no-tasks-due`) pour éviter un appel au model inutile.
    - Le contenu non lié aux tâches dans `HEARTBEAT.md` est préservé et ajouté comme contexte supplémentaire après la liste des tâches dues.
    - Les horodatages de la dernière exécution des tâches sont stockés dans l'état de la session (`heartbeatTaskState`), de sorte que les intervalles survivent aux redémarrages normaux.
    - Les horodatages des tâches ne sont avancés qu'après qu'une exécution de heartbeat a terminé son chemin de réponse normal. Les exécutions ignorées de `empty-heartbeat-file` / `no-tasks-due` ne marquent pas les tâches comme terminées.

  </Accordion>
</AccordionGroup>

Le mode tâche est utile lorsque vous voulez qu'un seul fichier heartbeat contienne plusieurs vérifications périodiques sans payer pour chacune d'elles à chaque tick.

### L'agent peut-il mettre à jour HEARTBEAT.md ?

Oui — si vous le lui demandez.

`HEARTBEAT.md` est juste un fichier normal dans l'espace de travail de l'agent, vous pouvez donc dire à l'agent (dans une discussion normale) quelque chose comme :

- "Mets à jour `HEARTBEAT.md` pour ajouter une vérification quotidienne de l'agenda."
- "Réécrivez `HEARTBEAT.md` pour qu'il soit plus court et axé sur les suivis de boîte de réception."

Si vous souhaitez que cela se produise de manière proactive, vous pouvez également inclure une ligne explicite dans votre invite de rythme cardiaque (heartbeat) comme : "Si la liste de contrôle devient obsolète, mettez à jour HEARTBEAT.md avec une meilleure version."

<Warning>Ne mettez pas de secrets (clés API, numéros de téléphone, jetons privés) dans `HEARTBEAT.md` — cela devient partie intégrante du contexte de l'invite.</Warning>

## Réveil manuel (à la demande)

Vous pouvez mettre en file d'attente un événement système et déclencher un rythme cardiaque immédiat avec :

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

Si plusieurs agents ont `heartbeat` configuré, un réveil manuel exécute immédiatement chacun de ces rythmes cardiaques d'agent.

Utilisez `--mode next-heartbeat` pour attendre le prochain tick programmé.

## Livraison du raisonnement (optionnel)

Par défaut, les rythmes cardiaques ne livrent que la charge utile finale "answer".

Si vous souhaitez de la transparence, activez :

- `agents.defaults.heartbeat.includeReasoning: true`

Lorsqu'il est activé, les rythmes cardiaques livreront également un message distinct préfixé par `Reasoning:` (même forme que `/reasoning on`). Cela peut être utile lorsque l'agent gère plusieurs sessions/codex et que vous voulez voir pourquoi il a décidé de vous envoyer une notification — mais cela peut aussi divulguer plus de détails internes que vous ne le souhaitez. Il est préférable de le désactiver dans les conversations de groupe.

## Conscience des coûts

Les rythmes cardiaques exécutent des tours complets d'agent. Des intervalles plus courts consomment plus de jetons. Pour réduire les coûts :

- Utilisez `isolatedSession: true` pour éviter d'envoyer l'historique complet de la conversation (environ 100K jetons réduits à environ 2-5K par exécution).
- Utilisez `lightContext: true` pour limiter les fichiers d'amorçage uniquement à `HEARTBEAT.md`.
- Définissez un `model` moins cher (par ex. `ollama/llama3.2:1b`).
- Gardez `HEARTBEAT.md` petit.
- Utilisez `target: "none"` si vous voulez uniquement des mises à jour de l'état interne.

## Dépassement de contexte après le rythme cardiaque

Si un rythme cardiaque a précédemment laissé une session existante sur un modèle local plus petit, par exemple un modèle Ollama avec une fenêtre de 32k, et que le prochain tour de la session principale signale un dépassement de contexte, réinitialisez le modèle d'exécution de session (session runtime model) au modèle principal configuré. Le message de réinitialisation d'OpenClaw le signale lorsque le dernier modèle d'exécution correspond au `heartbeat.model` configuré.

Les battements de cœur actuels préservent le modèle d'exécution existant de la session partagée après l'exécution. Vous pouvez toujours utiliser `isolatedSession: true` pour exécuter des battements de cœur dans une nouvelle session, le combiner avec `lightContext: true` pour obtenir le plus petit prompt, ou choisir un modèle de battement de cœur avec une fenêtre de contexte suffisamment grande pour la session partagée.

## Connexes

- [Automatisation](/fr/automation) — tous les mécanismes d'automatisation en un coup d'œil
- [Tâches d'arrière-plan](/fr/automation/tasks) — comment le travail détaché est suivi
- [Fuseau horaire](/fr/concepts/timezone) — comment le fuseau horaire affecte la planification des battements de cœur
- [Dépannage](/fr/automation/cron-jobs#troubleshooting) — débogage des problèmes d'automatisation
