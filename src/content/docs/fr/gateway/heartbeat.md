---
summary: "Messages de polling Heartbeat et règles de notification"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
---

# Heartbeat (Gateway)

> **Heartbeat vs Cron ?** Consultez [Cron vs Heartbeat](/fr/automation/cron-vs-heartbeat) pour savoir quand utiliser chacun d'eux.

Heartbeat exécute des **tours d'agent périodiques** dans la session principale afin que le modèle puisse
signaler tout ce qui nécessite une attention sans vous spammer.

Troubleshooting : [/automation/troubleshooting](/fr/automation/troubleshooting)

## Démarrage rapide (débutant)

1. Laissez les heartbeats activés (la valeur par défaut est `30m`, ou `1h` pour Anthropic OAuth/setup-token) ou définissez votre propre cadence.
2. Créez une petite `HEARTBEAT.md` checklist dans l'espace de travail de l'agent (facultatif mais recommandé).
3. Décidez où les messages de heartbeat doivent aller (`target: "none"` est la valeur par défaut ; définissez `target: "last"` pour acheminer vers le dernier contact).
4. Optionnel : activez la livraison du raisonnement de heartbeat pour plus de transparence.
5. Optionnel : utilisez un contexte d'amorçage léger si les exécutions de heartbeat n'ont besoin que de `HEARTBEAT.md`.
6. Optionnel : activez les sessions isolées pour éviter d'envoyer l'historique complet de la conversation à chaque battement.
7. Optionnel : restreignez les battements aux heures actives (heure locale).

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

- Intervalle : `30m` (ou `1h` lorsque Anthropic OAuth/setup-token est le mode d'authentification détecté). Définissez `agents.defaults.heartbeat.every` ou `agents.list[].heartbeat.every` par agent ; utilisez `0m` pour désactiver.
- Corps du prompt (configurable via `agents.defaults.heartbeat.prompt`) :
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- Le prompt de battement est envoyé **tel quel** comme message utilisateur. Le
  système de prompt inclut une section « Heartbeat » et l'exécution est signalée en interne.
- Les heures actives (`heartbeat.activeHours`) sont vérifiées dans le fuseau horaire configuré.
  En dehors de cette fenêtre, les battements sont ignorés jusqu'au prochain tick dans la fenêtre.

## À quoi sert le prompt de battement

Le prompt par défaut est intentionnellement large :

- **Tâches en arrière-plan** : « Considérer les tâches en attente » incite l'agent à
  examiner les suivis (boîte de réception, calendrier, rappels, travail en file
  d'attente) et à signaler tout ce qui est urgent.
- **Vérification humaine** : « Vérifiez parfois votre humain pendant la journée » incite
  à un message occasionnel et léger « avez-vous besoin de quelque chose ? », mais
  évite le spam nocturne en utilisant votre fuseau horaire local configuré
  (voir [/concepts/timezone](/fr/concepts/timezone)).

Si vous souhaitez qu'un battement effectue une tâche très spécifique (par ex. « vérifier
les statistiques Gmail PubSub » ou « vérifier la santé de la passerelle »), définissez
`agents.defaults.heartbeat.prompt` (ou `agents.list[].heartbeat.prompt`) avec un corps personnalisé (envoyé tel quel).

## Contrat de réponse

- Si rien ne nécessite d'attention, répondez avec **`HEARTBEAT_OK`**.
- Pendant les exécutions de battement, OpenClaw traite `HEARTBEAT_OK` comme
  un accusé de réception lorsqu'il apparaît au **début ou à la fin** de la réponse.
  Le jeton est supprimé et la réponse est ignorée si le contenu restant est
  **≤ `ackMaxChars`** (par défaut : 300).
- Si `HEARTBEAT_OK` apparaît au **milieu** d'une réponse, il n'est pas traité
  spécialement.
- Pour les alertes, **n'incluez pas** `HEARTBEAT_OK`; ne renvoyez que le texte de l'alerte.

En dehors des heartbeats, les `HEARTBEAT_OK` isolés au début/à la fin d'un message sont supprimés
et enregistrés; un message qui n'est que `HEARTBEAT_OK` est ignoré.

## Config

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
- `agents.list[].heartbeat` fusionne par-dessus; si un agent a un bloc `heartbeat`, **seuls ces agents** exécutent des heartbeats.
- `channels.defaults.heartbeat` définit les visibilités par défaut pour tous les channels.
- `channels.<channel>.heartbeat` remplace les valeurs par défaut du channel.
- `channels.<channel>.accounts.<id>.heartbeat` (channels multi-comptes) remplace les paramètres par channel.

### Heartbeats par agent

Si une entrée `agents.list[]` inclut un bloc `heartbeat`, **seuls ces agents**
exécutent des heartbeats. Le bloc par agent fusionne par-dessus `agents.defaults.heartbeat`
(ainsi vous pouvez définir les valeurs par défaut partagées une fois et les modifier par agent).

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

Limitez les heartbeats aux heures de bureau dans un fuseau horaire spécifique :

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

Si vous voulez que les heartbeats s'exécutent toute la journée, utilisez l'un de ces modèles :

- Omettez entièrement `activeHours` (aucune restriction de fenêtre horaire; c'est le comportement par défaut).
- Définissez une fenêtre pleine journée : `activeHours: { start: "00:00", end: "24:00" }`.

Ne définissez pas la même heure pour `start` et `end` (par exemple `08:00` à `08:00`).
Cela est traité comme une fenêtre de largeur nulle, les heartbeats sont donc toujours ignorés.

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

- `every` : intervalle de heartbeat (chaîne de durée; unité par défaut = minutes).
- `model` : remplacement optionnel de model pour les exécutions de heartbeat (`provider/model`).
- `includeReasoning` : si activé, envoyez également le message distinct `Reasoning:` lorsqu'il est disponible (même forme que `/reasoning on`).
- `lightContext` : si vrai, les exécutions du heartbeat utilisent un contexte de démarrage léger et ne conservent que `HEARTBEAT.md` à partir des fichiers de démarrage de l'espace de travail.
- `isolatedSession` : si vrai, chaque heartbeat s'exécute dans une nouvelle session sans historique de conversation précédent. Utilise le même modèle d'isoisonnement que le cron `sessionTarget: "isolated"`. Réduit considérablement le coût en jetons par heartbeat. Combinez avec `lightContext: true` pour des économies maximales. Le routage de la livraison utilise toujours le contexte de la session principale.
- `session` : clé de session optionnelle pour les exécutions du heartbeat.
  - `main` (par défaut) : session principale de l'agent.
  - Clé de session explicite (copiée depuis `openclaw sessions --json` ou la [sessions CLI](/fr/cli/sessions)).
  - Formats de clé de session : voir [Sessions](/fr/concepts/session) et [Groupes](/fr/channels/groups).
- `target` :
  - `last` : livrer vers le dernier canal externe utilisé.
  - canal explicite : `whatsapp` / `telegram` / `discord` / `googlechat` / `slack` / `msteams` / `signal` / `imessage`.
  - `none` (par défaut) : exécuter le heartbeat mais **ne pas livrer** à l'extérieur.
- `directPolicy` : contrôle le comportement de livraison directe/DM :
  - `allow` (par défaut) : autoriser la livraison du heartbeat par DM direct.
  - `block` : supprimer la livraison directe/DM (`reason=dm-blocked`).
- `to` : substitution optionnelle du destinataire (id spécifique au canal, par exemple E.164 pour WhatsApp ou un id de chat Telegram). Pour les sujets/fils Telegram, utilisez `<chatId>:topic:<messageThreadId>`.
- `accountId` : identifiant de compte facultatif pour les canaux multi-comptes. Lorsque `target: "last"`, l'identifiant de compte s'applique au dernier canal résolu s'il prend en charge les comptes ; sinon, il est ignoré. Si l'identifiant de compte ne correspond pas à un compte configuré pour le canal résolu, la livraison est ignorée.
- `prompt` : remplace le corps du prompt par défaut (non fusionné).
- `ackMaxChars` : nombre maximum de caractères autorisés après `HEARTBEAT_OK` avant la livraison.
- `suppressToolErrorWarnings` : si vrai, supprime les payloads d'avertissement d'erreur de tool lors des exécutions de heartbeat.
- `activeHours` : restreint les exécutions de heartbeat à une fenêtre temporelle. Objet avec `start` (HH:MM, inclus ; utilisez `00:00` pour le début de la journée), `end` (HH:MM exclusif ; `24:00` autorisé pour la fin de la journée) et `timezone` en option.
  - Omis ou `"user"` : utilise votre `agents.defaults.userTimezone` si défini, sinon revient au fuseau horaire du système hôte.
  - `"local"` : utilise toujours le fuseau horaire du système hôte.
  - Tout identifiant IANA (par ex. `America/New_York`) : utilisé directement ; si invalide, revient au comportement `"user"` ci-dessus.
  - `start` et `end` ne doivent pas être égaux pour une fenêtre active ; les valeurs égales sont traitées comme de largeur nulle (toujours en dehors de la fenêtre).
  - En dehors de la fenêtre active, les heartbeats sont ignorés jusqu'au prochain tick dans la fenêtre.

## Comportement de livraison

- Les heartbeats s'exécutent dans la session principale de l'agent par défaut (`agent:<id>:<mainKey>`),
  ou `global` lorsque `session.scope = "global"`. Définissez `session` pour remplacer par une
  session de canal spécifique (Discord/WhatsApp/etc.).
- `session` n'affecte que le contexte d'exécution ; la livraison est contrôlée par `target` et `to`.
- Pour livrer à un canal/destinataire spécifique, définissez `target` + `to`. Avec `target: "last"`, la livraison utilise le dernier canal externe pour cette session.
- Les livraisons Heartbeat permettent des cibles directes/DM par défaut. Définissez `directPolicy: "block"` pour supprimer les envois vers des cibles directes tout en continuant à exécuter le tour de heartbeat.
- Si la file d'attente principale est occupée, le heartbeat est ignoré et réessayé plus tard.
- Si `target` ne résout aucune destination externe, l'exécution a tout de même lieu mais aucun message sortant n'est envoyé.
- Les réponses uniquement heartbeat ne gardent **pas** la session active ; le dernier `updatedAt` est restauré afin que l'expiration d'inactivité se comporte normalement.

## Contrôles de visibilité

Par défaut, les accusés de réception `HEARTBEAT_OK` sont supprimés pendant que le contenu de l'alerte est livré. Vous pouvez ajuster cela par canal ou par compte :

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

Si les **trois** sont faux, OpenClaw ignore entièrement l'exécution du heartbeat (pas d'appel au modèle).

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

| Objectif                                                  | Configuration                                                                            |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Comportement par défaut (OK silencieux, alertes activées) | _(aucune configuration nécessaire)_                                                      |
| Entièrement silencieux (aucun message, aucun indicateur)  | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| Indicateur uniquement (aucun message)                     | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| OKs dans un seul canal                                    | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md (optionnel)

Si un fichier `HEARTBEAT.md` existe dans l'espace de travail, l'invite par défaut indique à l'agent de le lire. Considérez-le comme votre « liste de contrôle heartbeat » : petit, stable et sûr à inclure toutes les 30 minutes.

Si `HEARTBEAT.md` existe mais est effectivement vide (seulement des lignes vides et des en-têtes markdown comme `# Heading`), OpenClaw ignore l'exécution du heartbeat pour économiser les appels API. Si le fichier est manquant, le heartbeat s'exécute toujours et le modèle décide quoi faire.

Gardez-le minime (courte liste de contrôle ou rappels) pour éviter l'encombrement du prompt.

Exemple `HEARTBEAT.md` :

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### L'agent peut-il mettre à jour HEARTBEAT.md ?

Oui — si vous le lui demandez.

`HEARTBEAT.md` n'est qu'un fichier normal dans l'espace de travail de l'agent, vous pouvez donc dire à l'agent
(dans une discussion normale) quelque chose comme :

- « Mets à jour `HEARTBEAT.md` pour ajouter une vérification quotidienne du calendrier. »
- « Réécris `HEARTBEAT.md` pour qu'il soit plus court et axé sur les suivis de boîte de réception. »

Si vous souhaitez que cela se fasse de manière proactive, vous pouvez également inclure une ligne explicite dans
votre prompt de heartbeat comme : « Si la liste de contrôle devient obsolète, mettez à jour HEARTBEAT.md
avec une meilleure. »

Note de sécurité : ne mettez pas de secrets (clés API, numéros de téléphone, jetons privés) dans
`HEARTBEAT.md` — cela fait partie du contexte du prompt.

## Réveil manuel (à la demande)

Vous pouvez mettre en file d'attente un événement système et déclencher un heartbeat immédiat avec :

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

Si plusieurs agents ont `heartbeat` configuré, un réveil manuel exécute chacun de ces
heartbeats d'agent immédiatement.

Utilisez `--mode next-heartbeat` pour attendre le prochain tick programmé.

## Livraison du raisonnement (optionnel)

Par défaut, les heartbeats ne livrent que la charge utile « answer » finale.

Si vous souhaitez de la transparence, activez :

- `agents.defaults.heartbeat.includeReasoning: true`

Lorsqu'il est activé, les heartbeats livreront également un message séparé préfixé par
`Reasoning:` (même forme que `/reasoning on`). Cela peut être utile lorsque l'agent
gère plusieurs sessions/codex et que vous voulez voir pourquoi il a décidé de vous
faire un ping — mais cela peut aussi révéler plus de détails internes que vous ne le souhaitez. Préférez le garder
désactivé dans les discussions de groupe.

## Conscience des coûts

Les heartbeats exécutent des tours d'agent complets. Des intervalles plus courts consomment plus de jetons. Pour réduire les coûts :

- Utilisez `isolatedSession: true` pour éviter d'envoyer l'historique complet des conversations (environ 100K jetons réduits à ~2-5K par exécution).
- Utilisez `lightContext: true` pour limiter les fichiers d'amorçage uniquement à `HEARTBEAT.md`.
- Définissez un `model` moins cher (par ex. `ollama/llama3.2:1b`).
- Gardez `HEARTBEAT.md` petit.
- Utilisez `target: "none"` si vous voulez uniquement des mises à jour de l'état interne.
