---
summary: "Messages de sondage Heartbeat et règles de notification"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
---

# Heartbeat (Gateway)

> **Heartbeat vs Cron ?** Consultez [Automation & Tasks](/fr/automation) pour obtenir des conseils sur l'utilisation de chacun.

Heartbeat exécute des **tours d'agent périodiques** dans la session principale afin que le modèle puisse
signaler tout ce qui nécessite une attention sans vous spammer.

Heartbeat est un tour de session principale planifié — il ne crée **pas** d'enregistrements de [tâche en arrière-plan](/fr/automation/tasks).
Les enregistrements de tâches sont destinés au travail détaché (exécutions ACP, sous-agents, tâches cron isolées).

Dépannage : [Tâches planifiées](/fr/automation/cron-jobs#troubleshooting)

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
- Le prompt heartbeat est envoyé **tel quel** comme message utilisateur. Le prompt
  système inclut une section « Heartbeat » uniquement lorsque les heartbeats sont activés pour l'agent par défaut, et l'exécution est signalée en interne.
- Lorsque les heartbeats sont désactivés avec `0m`, les exécutions normales omettent également `HEARTBEAT.md`
  du contexte d'amorçage (bootstrap context) afin que le model ne voie pas les instructions réservées aux heartbeats.
- Les heures actives (`heartbeat.activeHours`) sont vérifiées dans le fuseau horaire configuré.
  En dehors de cette fenêtre, les heartbeats sont ignorés jusqu'au prochain créneau à l'intérieur de la fenêtre.

## À quoi sert le prompt heartbeat

Le prompt par défaut est volontairement large :

- **Tâches en arrière-plan** : « Consider outstanding tasks » incite l'agent à passer en revue
  les suivis (boîte de réception, calendrier, rappels, travail en file d'attente) et à signaler tout ce qui est urgent.
- **Vérification humaine** : « Vérifiez parfois votre humain pendant la journée » incite à
  un message occasionnel léger « avez-vous besoin de quelque chose ? », mais évite le spam nocturne
  en utilisant votre fuseau horaire local configuré (voir [/concepts/timezone](/fr/concepts/timezone)).

Heartbeat peut réagir aux [tâches en arrière-plan](/fr/automation/tasks) terminées, mais une exécution heartbeat ne crée pas elle-même d'enregistrement de tâche.

Si vous souhaitez qu'un heartbeat fasse quelque chose de très spécifique (par exemple « vérifier les statistiques Gmail PubSub
» ou « vérifier la santé de la passerelle »), définissez `agents.defaults.heartbeat.prompt` (ou
`agents.list[].heartbeat.prompt`) sur un corps personnalisé (envoyé tel quel).

## Contrat de réponse

- Si rien ne nécessite d'attention, répondez avec **`HEARTBEAT_OK`**.
- Pendant les exécutions heartbeat, OpenClaw traite `HEARTBEAT_OK` comme un accusé de réception lorsqu'il apparaît
  au **début ou à la fin** de la réponse. Le jeton est supprimé et la réponse est
  abandonnée si le contenu restant est **≤ `ackMaxChars`** (par défaut : 300).
- Si `HEARTBEAT_OK` apparaît au **milieu** d'une réponse, il n'est pas traité
  spécialement.
- Pour les alertes, **ne** incluez pas `HEARTBEAT_OK` ; renvoyez uniquement le texte de l'alerte.

En dehors des heartbeats, les `HEARTBEAT_OK` isolés au début/à la fin d'un message sont supprimés
et consignés ; un message qui contient uniquement `HEARTBEAT_OK` est ignoré.

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

- `agents.defaults.heartbeat` définit le comportement global du heartbeat.
- `agents.list[].heartbeat` fusionne par-dessus ; si un agent possède un bloc `heartbeat`, **seuls ces agents** exécutent des heartbeats.
- `channels.defaults.heartbeat` définit les valeurs par défaut de visibilité pour tous les canaux.
- `channels.<channel>.heartbeat` remplace les valeurs par défaut du canal.
- `channels.<channel>.accounts.<id>.heartbeat` (canaux multi-comptes) remplace les paramètres par canal.

### Heartbeats par agent

Si une entrée `agents.list[]` inclut un bloc `heartbeat`, **seuls ces agents**
exécutent des heartbeats. Le bloc par agent fusionne par-dessus `agents.defaults.heartbeat`
(ainsi vous pouvez définir des valeurs par défaut partagées une fois et les remplacer par agent).

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

- Omettez `activeHours` entièrement (aucune restriction de fenêtre horaire ; c'est le comportement par défaut).
- Définissez une fenêtre de journée complète : `activeHours: { start: "00:00", end: "24:00" }`.

Ne définissez pas la même heure pour `start` et `end` (par exemple `08:00` à `08:00`).
Cela est traité comme une fenêtre de largeur nulle, donc les heartbeats sont toujours ignorés.

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

- `every` : intervalle de heartbeat (chaîne de durée ; unité par défaut = minutes).
- `model` : substitution facultative de model pour les exécutions de heartbeat (`provider/model`).
- `includeReasoning` : lorsqu'il est activé, fournit également le message séparé `Reasoning:` lorsqu'il est disponible (même forme que `/reasoning on`).
- `lightContext` : si vrai, les exécutions de heartbeat utilisent un contexte d'amorçage léger et ne conservent que `HEARTBEAT.md` des fichiers d'amorçage de l'espace de travail.
- `isolatedSession` : si vrai, chaque heartbeat s'exécute dans une session fraîche sans historique de conversation précédent. Utilise le même modèle d'isolement que le cron `sessionTarget: "isolated"`. Réduit considérablement le coût en jetons par heartbeat. Combinez avec `lightContext: true` pour des économies maximales. Le routage de la livraison utilise toujours le contexte de la session principale.
- `session` : clé de session facultative pour les exécutions de heartbeat.
  - `main` (par défaut) : session principale de l'agent.
  - Clé de session explicite (copiez depuis `openclaw sessions --json` ou la [sessions CLI](/fr/cli/sessions)).
  - Formats de clé de session : voir [Sessions](/fr/concepts/session) et [Groupes](/fr/channels/groups).
- `target` :
  - `last` : livrer vers le dernier channel externe utilisé.
  - channel explicite : n'importe quel channel configuré ou id de plugin, par exemple `discord` , `matrix` , `telegram` , ou `whatsapp` .
  - `none` (par défaut) : exécuter le heartbeat mais **ne pas livrer** à l'extérieur.
- `directPolicy` : contrôle le comportement de livraison direct/DM :
  - `allow` (par défaut) : autoriser la livraison de heartbeat direct/DM.
  - `block` : supprimer la livraison direct/DM (`reason=dm-blocked`).
- `to` : substitution facultative du destinataire (id spécifique au channel, par ex. E.164 pour WhatsApp ou un id de chat Telegram). Pour les sujets/fils de discussion Telegram, utilisez `<chatId>:topic:<messageThreadId>`.
- `accountId` : identifiant de compte optionnel pour les canaux multi-comptes. Lorsque `target: "last"`, l'identifiant de compte s'applique au dernier canal résolu s'il prend en charge les comptes ; sinon, il est ignoré. Si l'identifiant de compte ne correspond pas à un compte configuré pour le canal résolu, la livraison est ignorée.
- `prompt` : remplace le corps du prompt par défaut (non fusionné).
- `ackMaxChars` : nombre maximum de caractères autorisés après `HEARTBEAT_OK` avant la livraison.
- `suppressToolErrorWarnings` : si vrai, supprime les charges utiles d'avertissement d'erreur de tool lors des exécutions de heartbeat.
- `activeHours` : limite les exécutions de heartbeat à une fenêtre temporelle. Objet avec `start` (HH:MM, inclus ; utilisez `00:00` pour le début de la journée), `end` (HH:MM exclus ; `24:00` autorisé pour la fin de la journée), et `timezone` optionnel.
  - Omis ou `"user"` : utilise votre `agents.defaults.userTimezone` si défini, sinon revient au fuseau horaire du système hôte.
  - `"local"` : utilise toujours le fuseau horaire du système hôte.
  - Tout identifiant IANA (par ex. `America/New_York`) : utilisé directement ; si invalide, revient au comportement `"user"` ci-dessus.
  - `start` et `end` ne doivent pas être égaux pour une fenêtre active ; les valeurs égales sont traitées comme de largeur nulle (toujours à l'extérieur de la fenêtre).
  - En dehors de la fenêtre active, les heartbeats sont ignorés jusqu'au prochain tick dans la fenêtre.

## Comportement de livraison

- Les heartbeats s'exécutent dans la session principale de l'agent par défaut (`agent:<id>:<mainKey>`),
  ou `global` lorsque `session.scope = "global"`. Définissez `session` pour remplacer par une
  session de canal spécifique (Discord/WhatsApp/etc.).
- `session` n'affecte que le contexte d'exécution ; la livraison est contrôlée par `target` et `to`.
- Pour envoyer à un channel/destinataire spécifique, définissez `target` + `to`. Avec `target: "last"`, la livraison utilise le dernier channel externe pour cette session.
- Les livraisons Heartbeat autorisent les cibles directes/DM par défaut. Définissez `directPolicy: "block"` pour supprimer les envois vers des cibles directes tout en exécutant toujours le tour heartbeat.
- Si la file d'attente principale est occupée, le heartbeat est ignoré et réessayé plus tard.
- Si `target` ne résout aucune destination externe, l'exécution a toujours lieu mais aucun message sortant n'est envoyé.
- Si `showOk`, `showAlerts` et `useIndicator` sont tous désactivés, l'exécution est ignorée dès le début en tant que `reason=alerts-disabled`.
- Si seule la livraison des alertes est désactivée, OpenClaw peut toujours exécuter le heartbeat, mettre à jour les horodatages des tâches dues, restaurer l'horodatage d'inactivité de la session et supprimer la charge utile de l'alerte sortante.
- Si la cible heartbeat résolue prend en charge la frappe, OpenClaw affiche la frappe pendant
  que l'exécution heartbeat est active. Cela utilise la même cible à laquelle heartbeat
  enverrait la sortie de chat, et elle est désactivée par `typingMode: "never"`.
- Les réponses heartbeat uniquement ne gardent **pas** la session active ; le dernier `updatedAt`
  est restauré afin que l'expiration d'inactivité se comporte normalement.
- Les [tâches en arrière-plan](/fr/automation/tasks) détachées peuvent mettre en file d'attente un événement système et réveiller heartbeat lorsque la session principale doit remarquer quelque chose rapidement. Ce réveil ne fait pas de l'exécution heartbeat une tâche en arrière-plan.

## Contrôles de visibilité

Par défaut, les accusés de réception `HEARTBEAT_OK` sont supprimés pendant que le contenu de l'alerte est
livré. Vous pouvez ajuster cela par canal ou par compte :

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

Priorité : par compte → par canal → paramètres par défaut du canal → paramètres par défaut intégrés.

### Ce que fait chaque indicateur

- `showOk` : envoie un accusé de réception `HEARTBEAT_OK` lorsque le modèle renvoie une réponse OK uniquement.
- `showAlerts` : envoie le contenu de l'alerte lorsque le modèle renvoie une réponse non-OK.
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

### Motifs courants

| Objectif                                                  | Configuration                                                                            |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Comportement par défaut (OK silencieux, alertes activées) | _(pas de configuration requise)_                                                         |
| Entièrement silencieux (aucun message, aucun indicateur)  | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| Indicateur uniquement (aucun message)                     | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| OK dans un seul canal                                     | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md (facultatif)

Si un fichier `HEARTBEAT.md` existe dans l'espace de travail, l'invite par défaut indique à l'agent de le lire. Considérez-le comme votre « liste de contrôle heartbeat » : petit, stable et sûr à inclure toutes les 30 minutes.

Lors des exécutions normales, `HEARTBEAT.md` n'est injecté que si les instructions de heartbeat sont activées pour l'agent par défaut. La désactivation de la cadence de heartbeat avec `0m` ou le paramétrage de `includeSystemPromptSection: false` l'omet du contexte d'amorçage normal.

Si `HEARTBEAT.md` existe mais est effectivement vide (lignes vierges uniquement et en-têtes markdown comme `# Heading`), OpenClaw ignore l'exécution du heartbeat pour économiser les appels API. Cette omission est signalée comme `reason=empty-heartbeat-file`. Si le fichier est manquant, le heartbeat s'exécute quand même et le modèle décide de ce qu'il faut faire.

Gardez-le minuscule (courte liste de contrôle ou rappels) pour éviter le surchargement de l'invite.

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

- OpenClaw analyse le bloc `tasks:` et vérifie chaque tâche par rapport à sa propre `interval`.
- Seules les tâches **à échéance** sont incluses dans l'invite de heartbeat pour ce tick.
- Si aucune tâche n'est à échéance, le heartbeat est entièrement ignoré (`reason=no-tasks-due`) pour éviter un appel de modèle gaspillé.
- Le contenu sans tâche dans `HEARTBEAT.md` est conservé et ajouté comme contexte supplémentaire après la liste des tâches à échéance.
- Les horodatages de dernière exécution des tâches sont stockés dans l'état de la session (`heartbeatTaskState`), de sorte que les intervalles survivent aux redémarrages normaux.
- Les horodatages des tâches ne sont avancés qu'après qu'une exécution de heartbeat ait terminé son chemin de réponse normal. Les exécutions `empty-heartbeat-file` / `no-tasks-due` ignorées ne marquent pas les tâches comme terminées.

Le mode Task est utile lorsque vous souhaitez qu'un seul fichier heartbeat contienne plusieurs vérifications périodiques sans payer pour toutes à chaque tick.

### L'agent peut-il mettre à jour HEARTBEAT.md ?

Oui — si vous le lui demandez.

`HEARTBEAT.md` est juste un fichier normal dans l'espace de travail de l'agent, vous pouvez donc dire à l'agent
(dans une discussion normale) quelque chose comme :

- « Mets à jour `HEARTBEAT.md` pour ajouter une vérification quotidienne du calendrier. »
- « Réécris `HEARTBEAT.md` pour qu'il soit plus court et axé sur les suivis de boîte de réception. »

Si vous souhaitez que cela se produise de manière proactive, vous pouvez également inclure une ligne explicite dans
votre invite heartbeat comme : « Si la liste de contrôle devient obsolète, mettez à jour HEARTBEAT.md
avec une meilleure. »

Note de sécurité : ne mettez pas de secrets (clés API, numéros de téléphone, jetons privés) dans
`HEARTBEAT.md` — cela devient partie intégrante du contexte de l'invite.

## Réveil manuel (à la demande)

Vous pouvez mettre en file d'attente un événement système et déclencher un heartbeat immédiat avec :

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

Si plusieurs agents ont `heartbeat` configuré, un réveil manuel exécute chacun de ces
heartbeats d'agent immédiatement.

Utilisez `--mode next-heartbeat` pour attendre le prochain tick programmé.

## Livraison du raisonnement (optionnel)

Par défaut, les heartbeats ne livrent que la charge utile finale de « réponse ».

Si vous souhaitez de la transparence, activez :

- `agents.defaults.heartbeat.includeReasoning: true`

Lorsqu'il est activé, les heartbeats livreront également un message séparé préfixé
par `Reasoning:` (même forme que `/reasoning on`). Cela peut être utile lorsque l'agent
gère plusieurs sessions/codex et que vous voulez voir pourquoi il a décidé de vous
faire un rappel — mais cela peut aussi divulguer plus de détails internes que souhaité. Préférez le garder
désactivé dans les discussions de groupe.

## Conscience des coûts

Les heartbeats exécutent des tours complets d'agent. Des intervalles plus courts consomment plus de jetons. Pour réduire les coûts :

- Utilisez `isolatedSession: true` pour éviter d'envoyer l'historique complet de la conversation (~100K jetons réduits à ~2-5K par exécution).
- Utilisez `lightContext: true` pour limiter les fichiers d'amorçage uniquement à `HEARTBEAT.md`.
- Définissez un `model` moins cher (par ex. `ollama/llama3.2:1b`).
- Garder `HEARTBEAT.md` petit.
- Utilisez `target: "none"` si vous ne souhaitez que des mises à jour de l'état interne.

## Connexes

- [Automatisation et Tâches](/fr/automation) — tous les mécanismes d'automatisation en un coup d'œil
- [Tâches d'arrière-plan](/fr/automation/tasks) — comment le travail détaché est suivi
- [Fuseau horaire](/fr/concepts/timezone) — incidence du fuseau horaire sur la planification des battements de cœur
- [Dépannage](/fr/automation/cron-jobs#troubleshooting) — débogage des problèmes d'automatisation
