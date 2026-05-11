---
summary: "Messages de sondage Heartbeat et règles de notification"
read_when:
  - Adjusting heartbeat cadence or messaging
  - Deciding between heartbeat and cron for scheduled tasks
title: "Heartbeat"
sidebarTitle: "Heartbeat"
---

<Note>**Heartbeat vs cron ?** Consultez [Automation & Tasks](/fr/automation) pour des conseils sur l'utilisation de chacun.</Note>

Heartbeat exécute des **tours d'agent périodiques** dans la session principale afin que le modèle puisse signaler tout ce qui nécessite une attention sans vous spammer.

Heartbeat est un tour de session principale planifié — il ne crée **pas** d'enregistrements de [tâche d'arrière-plan](/fr/automation/tasks). Les enregistrements de tâches sont destinés au travail détaché (exécutions ACP, sous-agents, tâches cron isolées).

Dépannage : [Tâches planifiées](/fr/automation/cron-jobs#troubleshooting)

## Quick start (beginner)

<Steps>
  <Step title="Choisir une cadence">Laissez les heartbeats activés (par défaut `30m`, ou `1h` pour l'auth Anthropic OAuth/token, y compris la réutilisation Claude CLI) ou définissez votre propre cadence.</Step>
  <Step title="Ajouter HEARTBEAT.md (facultatif)">Créez une petite `HEARTBEAT.md` checklist ou un bloc `tasks:` dans l'espace de travail de l'agent.</Step>
  <Step title="Définir la destination des messages de heartbeat">`target: "none"` est la valeur par défaut ; définissez `target: "last"` pour acheminer vers le dernier contact.</Step>
  <Step title="Réglages facultatifs">- Activez la livraison du raisonnement du heartbeat pour la transparence. - Utilisez un contexte d'amorçage léger si les exécutions du heartbeat n'ont besoin que de `HEARTBEAT.md`. - Activez les sessions isolées pour éviter d'envoyer l'historique complet de la conversation à chaque heartbeat. - Limitez les heartbeats aux heures actives (heure locale).</Step>
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
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // optional: send separate `Reasoning:` message too
      },
    },
  },
}
```

## Valeurs par défaut

- Intervalle : `30m` (ou `1h` lorsque le mode d'authentification Anthropic OAuth/token est détecté, y compris lors de la réutilisation du CLI Claude). Définissez `agents.defaults.heartbeat.every` ou `agents.list[].heartbeat.every` par agent ; utilisez `0m` pour désactiver.
- Corps du prompt (configurable via `agents.defaults.heartbeat.prompt`) : `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- Le prompt heartbeat est envoyé **tel quel** en tant que message utilisateur. Le prompt système inclut une section « Heartbeat » uniquement lorsque les heartbeats sont activés pour l'agent par défaut et que l'exécution est signalée en interne.
- Lorsque les heartbeats sont désactivés avec `0m`, les exécutions normales omettent également `HEARTBEAT.md` du contexte de démarrage, afin que le model ne voie pas les instructions réservées aux heartbeats.
- Les heures actives (`heartbeat.activeHours`) sont vérifiées dans le fuseau horaire configuré. En dehors de cette fenêtre, les battements de cœur (heartbeats) sont ignorés jusqu'au prochain tick dans la fenêtre.

## À quoi sert le prompt de battement de cœur

Le prompt par défaut est intentionnellement large :

- **Tâches en arrière-plan** : « Consider outstanding tasks » incite l'agent à passer en revue les suivis (boîte de réception, calendrier, rappels, travail en file d'attente) et à signaler tout ce qui est urgent.
- **Vérification humaine** : « Checkup sometimes on your human during day time » incite à envoyer occasionnellement un message léger du type « avez-vous besoin de quelque chose ? », mais évite le spam nocturne en utilisant votre fuseau horaire local configuré (voir [Timezone](/fr/concepts/timezone)).

Le battement de cœur peut réagir aux [tâches en arrière-plan](/fr/automation/tasks) terminées, mais une exécution de battement de cœur ne crée pas elle-même d'enregistrement de tâche.

Si vous souhaitez qu'un heartbeat effectue une tâche très spécifique (par exemple, « vérifier les statistiques Gmail PubSub » ou « vérifier la santé de la passerelle »), définissez `agents.defaults.heartbeat.prompt` (ou `agents.list[].heartbeat.prompt`) sur un corps personnalisé (envoyé tel quel).

## Contrat de réponse

- Si rien ne nécessite d'attention, répondez avec **`HEARTBEAT_OK`**.
- Pendant les exécutions de heartbeat, OpenClaw traite `HEARTBEAT_OK` comme un accusé de réception lorsqu'il apparaît au **début ou à la fin** de la réponse. Le jeton est supprimé et la réponse est ignorée si le contenu restant est **≤ `ackMaxChars`** (par défaut : 300).
- Si `HEARTBEAT_OK` apparaît au **milieu** d'une réponse, il n'est pas traité spécialement.
- Pour les alertes, **n'includez pas** `HEARTBEAT_OK` ; renvoyez uniquement le texte de l'alerte.

En dehors des heartbeats, `HEARTBEAT_OK` isolés au début ou à la fin d'un message sont supprimés et consignés ; un message composé uniquement de `HEARTBEAT_OK` est ignoré.

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
- `agents.list[].heartbeat` fusionne par-dessus ; si un agent possède un bloc `heartbeat`, **seuls ces agents** exécutent des heartbeats.
- `channels.defaults.heartbeat` définit les paramètres de visibilité par défaut pour tous les channels.
- `channels.<channel>.heartbeat` remplace les paramètres par défaut du channel.
- `channels.<channel>.accounts.<id>.heartbeat` (canaux multi-comptes) remplace les paramètres par canal.

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

En dehors de cette fenêtre (avant 9 h ou après 22 h heure de l'Est), les heartbeats sont ignorés. Le prochain tick planifié dans la fenêtre s'exécutera normalement.

### Configuration 24h/24 et 7j/7

Si vous souhaitez que les heartbeats s'exécutent toute la journée, utilisez l'un de ces modèles :

- Omettez entièrement `activeHours` (aucune restriction de fenêtre horaire ; il s'agit du comportement par défaut).
- Définissez une fenêtre pour toute la journée : `activeHours: { start: "00:00", end: "24:00" }`.

<Warning>Ne définissez pas la même heure pour `start` et `end` (par exemple `08:00` à `08:00`). Cela est considéré comme une fenêtre de largeur nulle, donc les heartbeats sont toujours ignorés.</Warning>

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
  Remplacement facultatif du model pour les exécutions de heartbeat (`provider/model`).
</ParamField>
<ParamField path="includeReasoning" type="boolean" default="false">
  Lorsqu'il est activé, délivre également le message séparé `Reasoning:` lorsqu'il est disponible (même forme que `/reasoning on`).
</ParamField>
<ParamField path="lightContext" type="boolean" default="false">
  Si vrai, les exécutions de heartbeat utilisent un contexte d'amorçage léger et ne conservent que `HEARTBEAT.md` à partir des fichiers d'amorçage de l'espace de travail.
</ParamField>
<ParamField path="isolatedSession" type="boolean" default="false">
  Si vrai, chaque heartbeat s'exécute dans une session fraîche sans historique de conversation précédent. Utilise le même modèle d'isolement que cron `sessionTarget: "isolated"`. Réduit considérablement le coût en jetons par heartbeat. Combiner avec `lightContext: true` pour des économies maximales. Le routage de livraison utilise toujours le contexte de la session principale.
</ParamField>
<ParamField path="session" type="string">
  Clé de session facultative pour les exécutions de heartbeat.

- `main` (par défaut) : session principale de l'agent.
- Clé de session explicite (copier à partir de `openclaw sessions --json` ou de la [sessions CLI](/fr/cli/sessions)).
- Formats de clés de session : voir [Sessions](/fr/concepts/session) et [Groups](/fr/channels/groups).
  </ParamField>
<ParamField path="target" type="string">
- `last` : délivrer au dernier channel externe utilisé.
- channel explicite : n'importe quel channel configuré ou identifiant de plugin, par exemple `discord`, `matrix`, `telegram`, ou `whatsapp`.
- `none` (par défaut) : exécute le heartbeat mais **ne livre pas** à l'extérieur.

  </ParamField>
<ParamField path="directPolicy" type='"allow" | "block"' default="allow">
Contrôle le comportement de livraison directe/DM. `allow` : autoriser la livraison directe/DM du heartbeat. `block` : supprimer la livraison directe/DM (`reason=dm-blocked`).
</ParamField>
<ParamField path="to" type="string">
Option de remplacement du destinataire (id spécifique au channel, p. ex. E.164 pour WhatsApp ou un id de chat Telegram). Pour les sujets/fils Telegram, utilisez `<chatId>:topic:<messageThreadId>`.
</ParamField>
<ParamField path="accountId" type="string">
Id de compte optionnel pour les canaux multi-comptes. Lorsque `target: "last"`, l'id de compte s'applique au dernier canal résolu s'il prend en charge les comptes ; sinon, il est ignoré. Si l'id de compte ne correspond pas à un compte configuré pour le canal résolu, la livraison est ignorée.
</ParamField>
<ParamField path="prompt" type="string">
Remplace le corps du prompt par défaut (non fusionné).
</ParamField>
<ParamField path="ackMaxChars" type="number" default="300">
Nombre maximal de caractères autorisés après `HEARTBEAT_OK` avant la livraison.
</ParamField>
<ParamField path="suppressToolErrorWarnings" type="boolean">
Si vrai, supprime les charges utiles d'avertissement d'erreur d'outil lors des exécutions de heartbeat.
</ParamField>
<ParamField path="activeHours" type="object">
Restreint les exécutions de heartbeat à une fenêtre temporelle. Objet avec `start` (HH:MM, inclusif ; utilisez `00:00` pour le début de la journée), `end` (HH:MM exclusif ; `24:00` autorisé pour la fin de la journée), et `timezone` facultatif.

- Omis ou `"user"` : utilise votre `agents.defaults.userTimezone` si défini, sinon revient au fuseau horaire du système hôte.
- `"local"` : utilise toujours le fuseau horaire du système hôte.
- Tout identifiant IANA (par ex. `America/New_York`) : utilisé directement ; si invalide, revient au comportement `"user"` ci-dessus.
- `start` et `end` ne doivent pas être égaux pour une fenêtre active ; des valeurs égales sont traitées comme de largeur nulle (toujours en dehors de la fenêtre).
- En dehors de la fenêtre active, les battements de cœur (heartbeats) sont ignorés jusqu'au prochain tick dans la fenêtre.
  </ParamField>

## Comportement de livraison

<AccordionGroup>
  <Accordion title="Session et routage cible">
    - Les battements de cœur s'exécutent dans la session principale de l'agent par défaut (`agent:<id>:<mainKey>`), ou `global` quand `session.scope = "global"`. Définissez `session` pour remplacer par une session de canal spécifique (Discord/WhatsApp/etc.).
    - `session` n'affecte que le contexte d'exécution ; la livraison est contrôlée par `target` et `to`.
    - Pour livrer à un canal/destinataire spécifique, définissez `target` + `to`. Avec `target: "last"`, la livraison utilise le dernier canal externe pour cette session.
    - Les livraisons de battements de cœur autorisent les cibles directes/DM par défaut. Définissez `directPolicy: "block"` pour supprimer les envois vers des cibles directes tout en exécutant toujours le tour de battement de cœur.
    - Si la file d'attente principale est occupée, le battement de cœur est ignoré et réessayé plus tard.
    - Si `target` ne résout aucune destination externe, l'exécution a toujours lieu mais aucun message sortant n'est envoyé.
  </Accordion>
  <Accordion title="Visibilité et comportement de saut">
    - Si `showOk`, `showAlerts` et `useIndicator` sont tous désactivés, l'exécution est ignorée dès le début en tant que `reason=alerts-disabled`.
    - Si seule la livraison des alertes est désactivée, OpenClaw peut toujours exécuter le heartbeat, mettre à jour les horodatages des tâches dues, restaurer l'horodatage d'inactivité de la session et supprimer la charge utile de l'alerte sortante.
    - Si la cible du heartbeat résolue prend en charge la saisie (typing), OpenClaw affiche l'état de saisie pendant que l'exécution du heartbeat est active. Cela utilise la même cible à laquelle le heartbeat enverrait la sortie du chat, et elle est désactivée par `typingMode: "never"`.
  </Accordion>
  <Accordion title="Cycle de vie de la session et audit">
    - Les réponses heartbeat uniquement ne **maintiennent pas** la session active. Les métadonnées du heartbeat peuvent mettre à jour la ligne de session, mais l'expiration d'inactivité utilise `lastInteractionAt` du dernier vrai message utilisateur/canal, et l'expiration quotidienne utilise `sessionStartedAt`.
    - L'interface de contrôle et l'historique WebChat masquent les invites de heartbeat et les accusés de réception OK uniquement. La transcription de session sous-jacente peut toujours contenir ces tours pour l'audit/rejeu.
    - Les [tâches en arrière-plan](/fr/automation/tasks) détachées peuvent mettre en file d'attente un événement système et réveiller le heartbeat lorsque la session principale doit remarquer quelque chose rapidement. Ce réveil ne fait pas de l'exécution du heartbeat une tâche en arrière-plan.
  </Accordion>
</AccordionGroup>

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
- `showAlerts` : envoie le contenu de l'alerte lorsque le modèle renvoie une réponse non OK.
- `useIndicator` : émet des événements d'indicateur pour les surfaces d'état de l'interface utilisateur.

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
| OK dans un seul channel                                   | `channels.telegram.heartbeat: { showOk: true }`                                          |

## HEARTBEAT.md (optionnel)

Si un fichier `HEARTBEAT.md` existe dans l'espace de travail, le prompt par défaut demande à l'agent de le lire. Considérez-le comme votre « checklist de heartbeat » : petit, stable et sûr à inclure toutes les 30 minutes.

Lors des exécutions normales, `HEARTBEAT.md` n'est injecté que si les instructions de heartbeat sont activées pour l'agent par défaut. La désactivation de la cadence du heartbeat avec `0m` ou le paramétrage de `includeSystemPromptSection: false` l'omet du contexte de bootstrap normal.

Si `HEARTBEAT.md` existe mais est effectivement vide (seulement des lignes vides et des en-têtes markdown comme `# Heading`), OpenClaw ignore l'exécution du heartbeat pour économiser les appels API. Cette omission est signalée comme `reason=empty-heartbeat-file`. Si le fichier est manquant, le heartbeat s'exécute quand même et le model décide de ce qu'il faut faire.

Gardez-le minuscule (courte checklist ou rappels) pour éviter l'alourdissement du prompt.

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
    - OpenClaw analyse le bloc `tasks:` et vérifie chaque tâche par rapport à son propre `interval`. - Seules les tâches **à venir** (due) sont incluses dans le prompt de heartbeat pour ce tick. - Si aucune tâche n'est à venir, le heartbeat est entièrement ignoré (`reason=no-tasks-due`) pour éviter un appel model inutile. - Le contenu hors tâche dans `HEARTBEAT.md` est préservé et ajouté comme
    contexte supplémentaire après la liste des tâches à venir. - Les horodatages de dernière exécution des tâches sont stockés dans l'état de la session (`heartbeatTaskState`), les intervalles survivent donc aux redémarrages normaux. - Les horodatages des tâches ne sont avancés qu'après qu'une exécution du heartbeat a terminé son chemin de réponse normal. Les exécutions ignorées
    `empty-heartbeat-file` / `no-tasks-due` ne marquent pas les tâches comme terminées.
  </Accordion>
</AccordionGroup>

Le mode Task est utile lorsque vous souhaitez qu'un seul fichier heartbeat contienne plusieurs vérifications périodiques sans payer pour chacune d'elles à chaque tick.

### L'agent peut-il mettre à jour HEARTBEAT.md ?

Oui — si vous le lui demandez.

`HEARTBEAT.md` n'est qu'un fichier normal dans l'espace de travail de l'agent, vous pouvez donc dire à l'agent (dans une discussion normale) quelque chose comme :

- "Mettez à jour `HEARTBEAT.md` pour ajouter une vérification quotidienne du calendriel."
- "Réécrivez `HEARTBEAT.md` pour qu'il soit plus court et concentré sur les suivis de boîte de réception."

Si vous souhaitez que cela se produise de manière proactive, vous pouvez également inclure une ligne explicite dans votre invite heartbeat comme : "Si la liste de contrôle devient périmée, mettez à jour HEARTBEAT.md avec une meilleure."

<Warning>Ne mettez pas de secrets (clés API, numéros de téléphone, jetons privés) dans `HEARTBEAT.md` — cela fait partie du contexte de l'invite.</Warning>

## Réveil manuel (à la demande)

Vous pouvez mettre en file d'attente un événement système et déclencher un heartbeat immédiat avec :

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

Si plusieurs agents ont `heartbeat` configuré, un réveil manuel exécute immédiatement chacun de ces heartbeats d'agent.

Utilisez `--mode next-heartbeat` pour attendre le prochain tick programmé.

## Livraison du raisonnement (facultatif)

Par défaut, les heartbeats ne livrent que la charge utile finale "answer".

Si vous souhaitez de la transparence, activez :

- `agents.defaults.heartbeat.includeReasoning: true`

Lorsqu'il est activé, les heartbeats livreront également un message distinct préfixé `Reasoning:` (même forme que `/reasoning on`). Cela peut être utile lorsque l'agent gère plusieurs sessions/codexes et que vous voulez voir pourquoi il a décidé de vous faire un ping — mais cela peut aussi divulguer plus de détails internes que vous ne le souhaitez. Préférez le désactiver dans les discussions de groupe.

## Conscience des coûts

Les heartbeats exécutent des tours complets d'agent. Des intervalles plus courts consomment plus de jetons. Pour réduire les coûts :

- Utilisez `isolatedSession: true` pour éviter d'envoyer l'historique complet de la conversation (environ 100K jetons réduits à environ 2-5K par exécution).
- Utilisez `lightContext: true` pour limiter les fichiers d'amorçage uniquement à `HEARTBEAT.md`.
- Définissez un `model` moins cher (par ex. `ollama/llama3.2:1b`).
- Gardez `HEARTBEAT.md` petit.
- Utilisez `target: "none"` si vous ne voulez que des mises à jour de l'état interne.

## Connexes

- [Automatisation et tâches](/fr/automation) — tous les mécanismes d'automatisation en un coup d'œil
- [Tâches en arrière-plan](/fr/automation/tasks) — suivi du travail détaché
- [Fuseau horaire](/fr/concepts/timezone) — incidence du fuseau horaire sur la planification du battement de cœur
- [Dépannage](/fr/automation/cron-jobs#troubleshooting) — débogage des problèmes d'automatisation
