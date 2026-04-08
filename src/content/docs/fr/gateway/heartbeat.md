---
summary: "Messages de sondage Heartbeat et règles de notification"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
---

# Heartbeat (Gateway)

> **Heartbeat vs Cron ?** Consultez [Automatisation et tâches](/en/automation) pour obtenir des conseils sur l'utilisation de chacune.

Heartbeat exécute des **tours d'agent périodiques** dans la session principale afin que le modèle puisse
signaler tout ce qui nécessite une attention sans vous spammer.

Heartbeat est un tour de session principale planifié — il ne crée **pas** d'enregistrements de [tâche d'arrière-plan](/en/automation/tasks).
Les enregistrements de tâches sont destinés au travail détaché (exécutions ACP, sous-agents, tâches cron isolées).

Dépannage : [Tâches planifiées](/en/automation/cron-jobs#troubleshooting)

## Quick start (beginner)

1. Laissez les heartbeats activés (la valeur par défaut est `30m`, ou `1h` pour l'authentification par jeton/OAuth Anthropic, y compris la réutilisation du OAuth Claude) ou définissez votre propre cadence.
2. Créez une minuscule liste de contrôle `HEARTBEAT.md` ou un bloc `tasks:` dans l'espace de travail de l'agent (optionnel mais recommandé).
3. Décidez où les messages de heartbeat doivent aller (`target: "none"` est la valeur par défaut ; définissez `target: "last"` pour acheminer vers le dernier contact).
4. Facultatif : activez la livraison du raisonnement heartbeat pour plus de transparence.
5. Optionnel : utilisez un contexte d'amorçage léger si les exécutions de heartbeat ne nécessitent que `HEARTBEAT.md`.
6. Facultatif : activez les sessions isolées pour éviter d'envoyer l'intégralité de l'historique de la conversation à chaque heartbeat.
7. Facultatif : restreignez les heartbeats aux heures actives (heure locale).

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
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // optional: send separate `Reasoning:` message too
      },
    },
  },
}
```

## Valeurs par défaut

- Intervalle : `30m` (ou `1h` lorsque le mode d'authentification détecté est Anthropic OAuth/jeton, y compris la réutilisation du CLI Claude). Définissez `agents.defaults.heartbeat.every` ou `agents.list[].heartbeat.every` par agent ; utilisez `0m` pour désactiver.
- Corps du prompt (configurable via `agents.defaults.heartbeat.prompt`) :
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- Le prompt heartbeat est envoyé **tel quel** comme message utilisateur. Le prompt système inclut une section « Heartbeat » et l'exécution est signalée en interne.
- Les heures actives (`heartbeat.activeHours`) sont vérifiées dans le fuseau horaire configuré.
  En dehors de la fenêtre, les heartbeats sont ignorés jusqu'au prochain tick dans la fenêtre.

## À quoi sert le prompt heartbeat

Le prompt par défaut est intentionnellement large :

- **Tâches d'arrière-plan** : « Considérez les tâches en attente » incite l'agent à vérifier
  les suivis (boîte de réception, calendrier, rappels, travail en file d'attente) et à signaler tout ce qui est urgent.
- **Point de contrôle humain** : « Vérifiez parfois votre humain pendant la journée » incite à un message léger occasionnel « avez-vous besoin de quelque chose ? », mais évite le spam nocturne en utilisant votre fuseau horaire local configuré (voir [/concepts/timezone](/en/concepts/timezone)).

Heartbeat peut réagir aux [tâches d'arrière-plan](/en/automation/tasks) terminées, mais une exécution de heartbeat ne crée pas elle-même d'enregistrement de tâche.

Si vous souhaitez qu'un heartbeat effectue une tâche très spécifique (par exemple « vérifier les statistiques Gmail PubSub » ou « vérifier l'état de la passerelle »), définissez `agents.defaults.heartbeat.prompt` (ou `agents.list[].heartbeat.prompt`) sur un corps personnalisé (envoyé tel quel).

## Contrat de réponse

- Si rien ne nécessite d'attention, répondez avec **`HEARTBEAT_OK`**.
- Pendant les exécutions d'heartbeat, OpenClaw traite `HEARTBEAT_OK` comme un accusé de réception lorsqu'il apparaît au **début ou à la fin** de la réponse. Le jeton est supprimé et la réponse est ignorée si le contenu restant est **≤ `ackMaxChars`** (par défaut : 300).
- Si `HEARTBEAT_OK` apparaît au **milieu** d'une réponse, il n'est pas traité spécialement.
- Pour les alertes, **n'incluez pas** `HEARTBEAT_OK` ; renvoyez uniquement le texte de l'alerte.

En dehors des heartbeats, les `HEARTBEAT_OK` orphelins au début/à la fin d'un message sont supprimés et consignés ; un message qui est uniquement `HEARTBEAT_OK` est ignoré.

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
        target: "last", // default: none | options: last | none | <channel id> (core or plugin, e.g. "bluebubbles")
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

- `agents.defaults.heartbeat` définit le comportement global de l'heartbeat.
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

- Omettez entièrement `activeHours` (aucune restriction de fenêtre temporelle ; c'est le comportement par défaut).
- Définissez une fenêtre de pleine journée : `activeHours: { start: "00:00", end: "24:00" }`.

Ne définissez pas la même heure pour `start` et `end` (par exemple `08:00` à `08:00`). Cela est traité comme une fenêtre de largeur nulle, les heartbeats sont donc toujours ignorés.

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

- `every` : intervalle d'heartbeat (chaîne de durée ; unité par défaut = minutes).
- `model` : remplacement facultatif de model pour les exécutions de heartbeat (`provider/model`).
- `includeReasoning` : lorsqu'il est activé, envoie également le message séparé `Reasoning:` lorsqu'il est disponible (même forme que `/reasoning on`).
- `lightContext` : si vrai, les exécutions de heartbeat utilisent un contexte d'amorçage léger et ne gardent que `HEARTBEAT.md` des fichiers d'amorçage de l'espace de travail.
- `isolatedSession` : si vrai, chaque heartbeat s'exécute dans une session fraîche sans historique de conversation précédent. Utilise le même modèle d'isolation que le cron `sessionTarget: "isolated"`. Réduit considérablement le coût en jetons par heartbeat. Combinez avec `lightContext: true` pour des économies maximales. Le routage de la livraison utilise toujours le contexte de la session principale.
- `session` : clé de session facultative pour les exécutions de heartbeat.
  - `main` (par défaut) : session principale de l'agent.
  - Clé de session explicite (copiée depuis `openclaw sessions --json` ou la [sessions CLI](/en/cli/sessions)).
  - Formats de clé de session : voir [Sessions](/en/concepts/session) et [Groupes](/en/channels/groups).
- `target` :
  - `last` : envoyer vers le dernier canal externe utilisé.
  - canal explicite : n'importe quel canal configuré ou id de plugin, par exemple `discord`, `matrix`, `telegram`, ou `whatsapp`.
  - `none` (par défaut) : exécuter le heartbeat mais **ne pas livrer** à l'externe.
- `directPolicy` : contrôle le comportement de livraison direct/DM :
  - `allow` (par défaut) : autoriser la livraison de heartbeat direct/DM.
  - `block` : supprimer la livraison direct/DM (`reason=dm-blocked`).
- `to` : remplacement facultatif du destinataire (id spécifique au canal, par ex. E.164 pour WhatsApp ou un id de chat Telegram). Pour les sujets/fils de discussion Telegram, utilisez `<chatId>:topic:<messageThreadId>`.
- `accountId` : identifiant de compte optionnel pour les canaux multi-comptes. Lorsque `target: "last"`, l'identifiant de compte s'applique au dernier canal résolu s'il prend en charge les comptes ; sinon, il est ignoré. Si l'identifiant de compte ne correspond pas à un compte configuré pour le canal résolu, la livraison est ignorée.
- `prompt` : remplace le corps du prompt par défaut (non fusionné).
- `ackMaxChars` : nombre maximum de caractères autorisés après `HEARTBEAT_OK` avant la livraison.
- `suppressToolErrorWarnings` : si vrai, supprime les charges utiles d'avertissement d'erreur d'outil lors des exécutions de heartbeat.
- `activeHours` : limite les exécutions de heartbeat à une fenêtre temporelle. Objet avec `start` (HH:MM, inclusif ; utilisez `00:00` pour le début de la journée), `end` (HH:MM exclusif ; `24:00` autorisé pour la fin de la journée), et `timezone` optionnel.
  - Omis ou `"user"` : utilise votre `agents.defaults.userTimezone` si défini, sinon revient au fuseau horaire du système hôte.
  - `"local"` : utilise toujours le fuseau horaire du système hôte.
  - Tout identifiant IANA (par ex. `America/New_York`) : utilisé directement ; si invalide, revient au comportement `"user"` ci-dessus.
  - `start` et `end` ne doivent pas être égaux pour une fenêtre active ; les valeurs égales sont traitées comme une largeur nulle (toujours en dehors de la fenêtre).
  - En dehors de la fenêtre active, les battements de cœur (heartbeats) sont ignorés jusqu'au prochain top dans la fenêtre.

## Comportement de livraison

- Les heartbeats s'exécutent dans la session principale de l'agent par défaut (`agent:<id>:<mainKey>`),
  ou `global` lorsque `session.scope = "global"`. Définissez `session` pour forcer vers une
  session de canal spécifique (Discord/WhatsApp/etc.).
- `session` n'affecte que le contexte d'exécution ; la livraison est contrôlée par `target` et `to`.
- Pour livrer à un canal/destinataire spécifique, définissez `target` + `to`. Avec
  `target: "last"`, la livraison utilise le dernier canal externe pour cette session.
- Les livraisons Heartbeat autorisent les cibles directes/DM par défaut. Définissez `directPolicy: "block"` pour supprimer les envois vers des cibles directes tout en exécutant toujours le tour Heartbeat.
- Si la file d'attente principale est occupée, le battement de cœur est ignoré et réessayé plus tard.
- Si `target` ne correspond à aucune destination externe, l'exécution a toujours lieu mais aucun message sortant n'est envoyé.
- Si `showOk`, `showAlerts` et `useIndicator` sont tous désactivés, l'exécution est ignorée dès le départ en tant que `reason=alerts-disabled`.
- Si seule la livraison des alertes est désactivée, OpenClaw peut toujours exécuter le Heartbeat, mettre à jour les horodatages des tâches dues, restaurer l'horodatage d'inactivité de la session et supprimer la charge utile de l'alerte sortante.
- Les réponses Heartbeat uniquement ne gardent **pas** la session active ; le dernier `updatedAt` est restauré afin que l'expiration d'inactivité se comporte normalement.
- Les [tâches en arrière-plan](/en/automation/tasks) détachées peuvent mettre en file d'attente un événement système et réveiller le Heartbeat lorsque la session principale doit remarquer quelque chose rapidement. Ce réveil n'entraîne pas l'exécution d'une tâche en arrière-plan par le Heartbeat.

## Contrôles de visibilité

Par défaut, les accusés de réception `HEARTBEAT_OK` sont supprimés pendant que le contenu de l'alerte est délivré. Vous pouvez ajuster cela par channel ou par compte :

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

Priorité : par compte → par channel → valeurs par défaut du channel → valeurs par défaut intégrées.

### Ce que fait chaque indicateur

- `showOk` : envoie un accusé de réception `HEARTBEAT_OK` lorsque le modèle renvoie une réponse OK uniquement.
- `showAlerts` : envoie le contenu de l'alerte lorsque le modèle renvoie une réponse non OK.
- `useIndicator` : émet des événements d'indicateur pour les surfaces d'état de l'interface utilisateur.

Si les **trois** sont faux, OpenClaw ignore entièrement l'exécution du Heartbeat (pas d'appel au modèle).

### Exemples par channel vs par compte

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
| Comportement par défaut (OK silencieux, alertes activées) | _(aucune configuration nécessaire)_                                                      |
| Entièrement silencieux (aucun message, aucun indicateur)  | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| Indicateur uniquement (aucun message)                     | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| OK dans un seul channel                                   | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md (facultatif)

Si un fichier `HEARTBEAT.md` existe dans l'espace de travail, l'invite par défaut indique à l'agent de le lire. Considérez-le comme votre « liste de contrôle heartbeat » : petit, stable et sûr à inclure toutes les 30 minutes.

Si `HEARTBEAT.md` existe mais est effectivement vide (uniquement des lignes vides et des en-têtes markdown comme `# Heading`), OpenClaw ignore l'exécution du heartbeat pour économiser les appels API. Cette exclusion est signalée par `reason=empty-heartbeat-file`. Si le fichier est manquant, le heartbeat s'exécute toujours et le modèle décide de ce qu'il faut faire.

Gardez-le minime (courte liste de contrôle ou rappels) pour éviter l'enflure de l'invite.

Exemple `HEARTBEAT.md` :

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
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

Comportement :

- OpenClaw analyse le bloc `tasks:` et vérifie chaque tâche par rapport à son propre `interval`.
- Seules les tâches **échues** sont incluses dans l'invite du heartbeat pour ce cycle.
- Si aucune tâche n'est échue, le heartbeat est entièrement ignoré (`reason=no-tasks-due`) pour éviter un appel modèle gaspillé.
- Le contenu non-tâche dans `HEARTBEAT.md` est préservé et ajouté comme contexte supplémentaire après la liste des tâches échues.
- Les horodatages de dernière exécution des tâches sont stockés dans l'état de session (`heartbeatTaskState`), les intervalles survivent donc aux redémarrages normaux.
- Les horodatages des tâches ne sont avancés qu'après qu'une exécution de heartbeat ait terminé son chemin de réponse normal. Les exécutions ignorées `empty-heartbeat-file` / `no-tasks-due` ne marquent pas les tâches comme terminées.

Le mode tâche est utile lorsque vous souhaitez qu'un seul fichier heartbeat contienne plusieurs vérifications périodiques sans payer pour chacune d'elles à chaque cycle.

### L'agent peut-il mettre à jour HEARTBEAT.md ?

Oui — si vous le lui demandez.

`HEARTBEAT.md` est juste un fichier normal dans l'espace de travail de l'agent, vous pouvez donc dire à l'agent (dans une discussion normale) quelque chose comme :

- « Met à jour `HEARTBEAT.md` pour ajouter une vérification quotidienne du calendrier. »
- « Réécris `HEARTBEAT.md` pour qu'il soit plus court et concentré sur les suivis de boîte de réception. »

Si vous souhaitez que cela se produise de manière proactive, vous pouvez également inclure une ligne explicite dans votre invite heartbeat comme : « Si la liste de contrôle devient obsolète, mettez à jour HEARTBEAT.md avec une meilleure version. »

Note de sécurité : ne mettez pas de secrets (clés API, numéros de téléphone, jetons privés) dans `HEARTBEAT.md` — cela devient partie intégrante du contexte de l'invite.

## Réveil manuel (à la demande)

Vous pouvez mettre en file d'attente un événement système et déclencher un heartbeat immédiat avec :

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

Si plusieurs agents ont `heartbeat` configuré, un réveil manuel exécute immédiatement chacun de ces heartbeats d'agent.

Utilisez `--mode next-heartbeat` pour attendre le prochain tick programmé.

## Livraison du raisonnement (optionnel)

Par défaut, les heartbeats ne livrent que la charge utile finale de « réponse ».

Si vous souhaitez de la transparence, activez :

- `agents.defaults.heartbeat.includeReasoning: true`

Lorsqu'il est activé, les heartbeats livreront également un message séparé préfixé par `Reasoning:` (même forme que `/reasoning on`). Cela peut être utile lorsque l'agent gère plusieurs sessions/codex et que vous voulez voir pourquoi il a décidé de vous contacter — mais cela peut également révéler plus de détails internes que vous ne le souhaitez. Préférez le désactiver dans les discussions de groupe.

## Conscience des coûts

Les heartbeats exécutent des tours complets d'agent. Des intervalles plus courts consomment plus de jetons. Pour réduire les coûts :

- Utilisez `isolatedSession: true` pour éviter d'envoyer l'historique complet de la conversation (environ 100K jetons réduits à ~2-5K par exécution).
- Utilisez `lightContext: true` pour limiter les fichiers d'amorçage à seulement `HEARTBEAT.md`.
- Définissez un `model` moins cher (par ex. `ollama/llama3.2:1b`).
- Gardez `HEARTBEAT.md` petit.
- Utilisez `target: "none"` si vous souhaitez uniquement des mises à jour de l'état interne.

## Connexes

- [Automatisation et Tâches](/en/automation) — tous les mécanismes d'automatisation en un coup d'œil
- [Tâches d'arrière-plan](/en/automation/tasks) — comment le travail détaché est suivi
- [Fuseau horaire](/en/concepts/timezone) — comment le fuseau horaire affecte la planification des heartbeats
- [Dépannage](/en/automation/cron-jobs#troubleshooting) — débogage des problèmes d'automatisation
