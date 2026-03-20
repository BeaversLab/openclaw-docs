---
summary: "Messages de sondage Heartbeat et règles de notification"
read_when:
  - Ajustement de la cadence ou des messages de heartbeat
  - Choisir entre heartbeat et cron pour les tâches planifiées
title: "Heartbeat"
---

# Heartbeat (Gateway)

> **Heartbeat vs Cron ?** Consultez [Cron vs Heartbeat](/fr/automation/cron-vs-heartbeat) pour obtenir des conseils sur l'utilisation de chacun.

Heartbeat exécute des **tours d'agent périodiques** dans la session principale afin que le modèle puisse signaler tout ce qui nécessite une attention sans vous inonder.

Dépannage : [/automation/troubleshooting](/fr/automation/troubleshooting)

## Quick start (débutant)

1. Laissez les heartbeats activés (la valeur par défaut est `30m`, ou `1h` pour Anthropic OAuth/setup-token) ou définissez votre propre cadence.
2. Créez une petite liste de contrôle `HEARTBEAT.md` dans l'espace de travail de l'agent (facultatif mais recommandé).
3. Décidez où les messages de heartbeat doivent aller (`target: "none"` est la valeur par défaut ; définissez `target: "last"` pour acheminer vers le dernier contact).
4. Facultatif : activez la diffusion du raisonnement du heartbeat pour plus de transparence.
5. Facultatif : utilisez un contexte d'amorçage léger si les exécutions de heartbeat ne nécessitent que `HEARTBEAT.md`.
6. Facultatif : activez les sessions isolées pour éviter d'envoyer l'intégralité de l'historique de la conversation à chaque heartbeat.
7. Facultatif : limitez les heartbeats aux heures actives (heure locale).

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
- Le prompt de heartbeat est envoyé **tel quel** comme message utilisateur. Le prompt système inclut une section « Heartbeat » et l'exécution est marquée en interne.
- Les heures actives (`heartbeat.activeHours`) sont vérifiées dans le fuseau horaire configuré.
  En dehors de la fenêtre, les heartbeats sont ignorés jusqu'au prochain tick dans la fenêtre.

## À quoi sert le prompt de heartbeat

Le prompt par défaut est volontairement large :

- **Tâches d'arrière-plan** : « Consider outstanding tasks » incite l'agent à
  examiner les suivis (boîte de réception, calendrier, rappels, travail en file d'attente) et à faire remonter tout ce qui est urgent.
- **Vérification humaine** : « Checkup sometimes on your human during day time » incite à un
  message léger occasionnel du type « anything you need? », mais évite le spam nocturne
  en utilisant votre fuseau horaire local configuré (voir [/concepts/timezone](/fr/concepts/timezone)).

Si vous souhaitez qu'un heartbeat fasse quelque chose de très spécifique (par exemple « check Gmail PubSub
stats » ou « verify gateway health »), définissez `agents.defaults.heartbeat.prompt` (ou
`agents.list[].heartbeat.prompt`) avec un corps personnalisé (envoyé tel quel).

## Contrat de réponse

- Si rien ne nécessite d'attention, répondez avec **`HEARTBEAT_OK`**.
- Pendant les exécutions de heartbeat, OpenClaw traite `HEARTBEAT_OK` comme un accusé de réception lorsqu'il apparaît
  au **début ou à la fin** de la réponse. Le jeton est supprimé et la réponse est
  abandonnée si le contenu restant est **≤ `ackMaxChars`** (par défaut : 300).
- Si `HEARTBEAT_OK` apparaît au **milieu** d'une réponse, il n'est pas traité
  particulièrement.
- Pour les alertes, **n'incluez pas** `HEARTBEAT_OK` ; renvoyez uniquement le texte de l'alerte.

En dehors des heartbeats, `HEARTBEAT_OK` isolé au début/à la fin d'un message est supprimé
et consigné ; un message qui n'est que `HEARTBEAT_OK` est abandonné.

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

- `agents.defaults.heartbeat` définit le comportement global des heartbeats.
- `agents.list[].heartbeat` fusionne par-dessus ; si un agent a un bloc `heartbeat`, **seuls ces agents** exécutent des heartbeats.
- `channels.defaults.heartbeat` définit les valeurs par défaut de visibilité pour tous les channels.
- `channels.<channel>.heartbeat` remplace les valeurs par défaut du channel.
- `channels.<channel>.accounts.<id>.heartbeat` (channels multi-comptes) remplace les paramètres par channel.

### Heartbeats par agent

Si une entrée `agents.list[]` inclut un bloc `heartbeat`, **seuls ces agents**
exécutent des heartbeats. Le bloc par agent fusionne par-dessus `agents.defaults.heartbeat`
(ainsi vous pouvez définir des valeurs par défaut partagées une fois et les modifier par agent).

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

Limiter les battements de cœur aux heures ouvrées dans un fuseau horaire spécifique :

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

En dehors de cette fenêtre (avant 9 h ou après 22 h heure de l'Est), les battements de cœur sont ignorés. Le prochain tick planifié dans la fenêtre s'exécutera normalement.

### Configuration 24/7

Si vous souhaitez que les battements de cœur s'exécutent toute la journée, utilisez l'un de ces modèles :

- Omettez entièrement `activeHours` (aucune restriction de fenêtre temporelle ; il s'agit du comportement par défaut).
- Définissez une fenêtre de journée complète : `activeHours: { start: "00:00", end: "24:00" }`.

Ne définissez pas la même heure pour `start` et `end` (par exemple `08:00` à `08:00`).
Cela est traité comme une fenêtre de largeur nulle, les battements de cœur sont donc toujours ignorés.

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

- `every` : intervalle des battements de cœur (chaîne de durée ; unité par défaut = minutes).
- `model` : remplacement facultatif de model pour les exécutions de battements de cœur (`provider/model`).
- `includeReasoning` : lorsqu'il est activé, délivre également le message `Reasoning:` séparé lorsqu'il est disponible (même forme que `/reasoning on`).
- `lightContext` : si vrai, les exécutions de battements de cœur utilisent un contexte d'amorçage léger et ne conservent que `HEARTBEAT.md` des fichiers d'amorçage de l'espace de travail.
- `isolatedSession` : si vrai, chaque battement de cœur s'exécute dans une session fraîche sans historique de conversation précédent. Utilise le même modèle d'isolement que le cron `sessionTarget: "isolated"`. Réduit considérablement le coût en jetons par battement de cœur. Combinez avec `lightContext: true` pour des économies maximales. Le routage de livraison utilise toujours le contexte de la session principale.
- `session` : clé de session facultative pour les exécutions de battements de cœur.
  - `main` (par défaut) : session principale de l'agent.
  - Clé de session explicite (copier depuis `openclaw sessions --json` ou le [sessions CLI](/fr/cli/sessions)).
  - Formats de clés de session : voir [Sessions](/fr/concepts/session) et [Groupes](/fr/channels/groups).
- `target` :
  - `last` : envoyer vers le dernier canal externe utilisé.
  - canal explicite : `whatsapp` / `telegram` / `discord` / `googlechat` / `slack` / `msteams` / `signal` / `imessage`.
  - `none` (par défaut) : exécuter le heartbeat mais **ne pas envoyer** vers l'extérieur.
- `directPolicy` : contrôle le comportement d'envoi direct/DM :
  - `allow` (par défaut) : autoriser l'envoi direct/DM du heartbeat.
  - `block` : supprimer l'envoi direct/DM (`reason=dm-blocked`).
- `to` : substitution facultative du destinataire (id spécifique au canal, ex. E.164 pour WhatsApp ou un id de chat Telegram). Pour les sujets/fils Telegram, utilisez `<chatId>:topic:<messageThreadId>`.
- `accountId` : id de compte facultatif pour les canaux multi-comptes. Lorsque `target: "last"`, l'id de compte s'applique au dernier canal résolu s'il prend en charge les comptes ; sinon, il est ignoré. Si l'id de compte ne correspond pas à un compte configuré pour le canal résolu, l'envoi est ignoré.
- `prompt` : remplace le corps du prompt par défaut (non fusionné).
- `ackMaxChars` : nombre maximum de caractères autorisés après `HEARTBEAT_OK` avant l'envoi.
- `suppressToolErrorWarnings` : si vrai, supprime les charges utiles d'avertissement d'erreur de tool lors des exécutions de heartbeat.
- `activeHours` : restreint les exécutions de heartbeat à une fenêtre temporelle. Objet avec `start` (HH:MM, inclus ; utilisez `00:00` pour le début de la journée), `end` (HH:MM exclusif ; `24:00` autorisé pour la fin de journée) et `timezone` facultatif.
  - Omis ou `"user"` : utilise votre `agents.defaults.userTimezone` si défini, sinon revient au fuseau horaire du système hôte.
  - `"local"` : utilise toujours le fuseau horaire du système hôte.
  - Tout identifiant IANA (par ex. `America/New_York`) : utilisé directement ; si invalide, revient au comportement `"user"` ci-dessus.
  - `start` et `end` ne doivent pas être égaux pour une fenêtre active ; des valeurs égales sont traitées comme de largeur nulle (toujours en dehors de la fenêtre).
  - En dehors de la fenêtre active, les heartbeats sont ignorés jusqu'au prochain tick dans la fenêtre.

## Comportement de livraison

- Les heartbeats s'exécutent dans la session principale de l'agent par défaut (`agent:<id>:<mainKey>`),
  ou `global` lorsque `session.scope = "global"`. Définissez `session` pour remplacer par une
  session de canal spécifique (Discord/WhatsApp/etc.).
- `session` n'affecte que le contexte d'exécution ; la livraison est contrôlée par `target` et `to`.
- Pour livrer à un canal/destinataire spécifique, définissez `target` + `to`. Avec
  `target: "last"`, la livraison utilise le dernier canal externe pour cette session.
- Les livraisons de heartbeat autorisent les cibles directes/DM par défaut. Définissez `directPolicy: "block"` pour supprimer les envois vers des cibles directes tout en exécutant toujours le tour de heartbeat.
- Si la file d'attente principale est occupée, le heartbeat est ignoré et réessayé plus tard.
- Si `target` ne correspond à aucune destination externe, l'exécution a toujours lieu mais aucun
  message sortant n'est envoyé.
- Les réponses heartbeat uniquement ne gardent **pas** la session en vie ; le dernier `updatedAt`
  est restauré pour que l'expiration d'inactivité se comporte normalement.

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

Priorité : par compte → par canal → valeurs par défaut du canal → valeurs par défaut intégrées.

### Ce que fait chaque indicateur

- `showOk` : envoie un accusé de réception `HEARTBEAT_OK` lorsque le modèle renvoie une réponse OK uniquement.
- `showAlerts` : envoie le contenu de l'alerte lorsque le modèle renvoie une réponse non OK.
- `useIndicator` : émet des événements d'indicateur pour les surfaces d'état de l'interface utilisateur.

Si **les trois** sont faux, OpenClaw saute l'exécution du heartbeat entièrement (pas d'appel au model).

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

### Motifs courants

| Objectif                                                  | Configuration                                                                            |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Comportement par défaut (OK silencieux, alertes activées) | _(aucune configuration nécessaire)_                                                      |
| Entièrement silencieux (aucun message, aucun indicateur)  | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| Indicateur uniquement (aucun message)                     | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }`  |
| OKs dans un seul channel                                  | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md (facultatif)

Si un fichier `HEARTBEAT.md` existe dans l'espace de travail, l'invite par défaut demande à
l'agent de le lire. Considérez-le comme votre « liste de contrôle du heartbeat » : petit, stable, et
sûr à inclure toutes les 30 minutes.

Si `HEARTBEAT.md` existe mais est vide de fait (seulement des lignes vides et des en-têtes
markdown comme `# Heading`), OpenClaw saute l'exécution du heartbeat pour économiser les appels API.
Si le fichier est manquant, le heartbeat s'exécute quand même et le model décide de quoi faire.

Gardez-le minuscule (courte liste de contrôle ou rappels) pour éviter le gonflement de l'invite.

Exemple de `HEARTBEAT.md` :

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### L'agent peut-il mettre à jour HEARTBEAT.md ?

Oui — si vous le lui demandez.

`HEARTBEAT.md` est juste un fichier normal dans l'espace de travail de l'agent, vous pouvez donc dire à
l'agent (dans une discussion normale) quelque chose comme :

- « Mettre à jour `HEARTBEAT.md` pour ajouter une vérification quotidienne du calendrier. »
- « Réécrire `HEARTBEAT.md` pour qu'il soit plus court et concentré sur les suivis de boîte de réception. »

Si vous souhaitez que cela se produise de manière proactive, vous pouvez également inclure une ligne explicite dans
votre invite de heartbeat comme : « Si la liste de contrôle devient obsolète, mettez à jour HEARTBEAT.md
avec une meilleure. »

Remarque de sécurité : ne mettez pas de secrets (clés API, numéros de téléphone, jetons privés) dans
`HEARTBEAT.md` — cela devient partie intégrante du contexte de l'invite.

## Réveil manuel (à la demande)

Vous pouvez mettre en file d'attente un événement système et déclencher un heartbeat immédiat avec :

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

Si plusieurs agents ont `heartbeat` configuré, un réveil manuel exécute chacun de ces
heartbeats d'agent immédiatement.

Utilisez `--mode next-heartbeat` pour attendre le prochain tick programmé.

## Livraison du raisonnement (facultatif)

Par défaut, les heartbeats ne livrent que la charge utile finale de « réponse ».

Si vous souhaitez de la transparence, activez :

- `agents.defaults.heartbeat.includeReasoning: true`

Lorsqu'elle est activée, la fonction de heartbeat enverra également un message distinct préfixé par `Reasoning:` (même forme que `/reasoning on`). Cela peut être utile lorsque l'agent gère plusieurs sessions/codex et que vous souhaitez voir pourquoi il a décidé de vous faire un signe — mais cela peut également révéler plus de détails internes que vous ne le souhaitez. Préférez la désactiver dans les discussions de groupe.

## Conscience des coûts

Les heartbeats exécutent des tours complets d'agent. Des intervalles plus courts consomment plus de jetons. Pour réduire les coûts :

- Utilisez `isolatedSession: true` pour éviter d'envoyer l'historique complet de la conversation (environ 100K jetons réduits à environ 2-5K par exécution).
- Utilisez `lightContext: true` pour limiter les fichiers de démarrage à seulement `HEARTBEAT.md`.
- Définissez un `model` moins coûteux (par exemple `ollama/llama3.2:1b`).
- Gardez `HEARTBEAT.md` petit.
- Utilisez `target: "none"` si vous ne voulez que des mises à jour de l'état interne.

import fr from "/components/footer/fr.mdx";

<fr />
