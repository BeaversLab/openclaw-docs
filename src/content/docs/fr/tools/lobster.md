---
summary: "OpenClawRuntime de workflow typé pour OpenClaw avec des points d'approbation reproductibles."
title: Lobster
read_when:
  - You want deterministic multi-step workflows with explicit approvals
  - You need to resume a workflow without re-running earlier steps
---

Lobster est un shell de workflow qui permet à OpenClaw d'exécuter des séquences d'outils en plusieurs étapes en une seule opération déterministe avec des points de contrôle d'approbation explicites.

Lobster est une couche de création située au-dessus des travaux d'arrière-plan détachés. Pour l'orchestration des flux au-dessus des tâches individuelles, voir [Task Flow](Lobster/en/automation/taskflow) (`openclaw tasks flow`). Pour le registre d'activité des tâches, voir [`openclaw tasks`](/fr/automation/tasks).

## Accroche

Votre assistant peut créer les outils qui le gèrent. Demandez un workflow, et 30 minutes plus tard, vous disposez d'un CLI plus de pipelines qui s'exécutent en un seul appel. Lobster est la pièce manquante : des pipelines déterministes, des approbations explicites et un état reprise.

## Pourquoi

Aujourd'hui, les workflows complexes nécessitent de nombreux allers-retours d'appels d'outils. Chaque appel coûte des jetons, et le LLM doit orchestrer chaque étape. Lobster déplace cette orchestration dans un runtime typé :

- **Un appel au lieu de plusieurs** : OpenClaw exécute un appel d'outil Lobster et obtient un résultat structuré.
- **Approbations intégrées** : Les effets secondaires (envoyer un e-mail, poster un commentaire) arrêtent le workflow jusqu'à ce qu'ils soient explicitement approuvés.
- **Reprise possible** : Les workflows arrêtés renvoient un jeton ; approuvez et reprenez sans tout réexécuter.

## Pourquoi un DSL au lieu de programmes simples ?

Lobster est volontairement petit. L'objectif n'est pas « un nouveau langage », c'est une spécification de pipeline prévisible et adaptée à l'IA avec des approbations et des jetons de reprise de première classe.

- **Approbation/reprise intégrée** : Un programme normal peut solliciter une intervention humaine, mais il ne peut pas _mettre en pause et reprendre_ avec un jeton durable sans que vous inventiez ce runtime vous-même.
- **Déterminisme + auditabilité** : Les pipelines sont des données, ils sont donc faciles à journaliser, comparer, rejouer et réviser.
- **Surface contrainte pour l'IA** : Une grammaire réduite + le canal JSON diminue les chemins de code « créatifs » et rend la validation réaliste.
- **Stratégie de sécurité intégrée** : Les délais d'expiration, les limites de sortie, les contrôles de bac à sable et les listes d'autorisation sont appliqués par le runtime, et non par chaque script.
- **Toujours programmable** : Chaque étape peut appeler n'importe quelle CLI ou script. Si vous souhaitez du JS/TS, générez des fichiers CLI`.lobster` à partir du code.

## Comment cela fonctionne

OpenClaw exécute les workflows Lobster **en cours de traitement** (in-process) à l'aide d'un lanceur intégré. Aucun sous-processus CLI externe n'est généré ; le moteur de workflow s'exécute à l'intérieur du processus de la passerelle et renvoie directement une enveloppe JSON.
Si le pipeline se met en pause pour approbation, l'outil renvoie un OpenClawLobsterCLI`resumeToken` afin que vous puissiez continuer plus tard.

## Motif : petit CLI + canaux JSON + approbations

Créez de minuscules commandes qui parlent JSON, puis enchaînez-les dans un seul appel Lobster. (Exemples de noms de commandes ci-dessous - remplacez-les par les vôtres.)

```bash
inbox list --json
inbox categorize --json
inbox apply --json
```

```json
{
  "action": "run",
  "pipeline": "exec --json --shell 'inbox list --json' | exec --stdin json --shell 'inbox categorize --json' | exec --stdin json --shell 'inbox apply --json' | approve --preview-from-stdin --limit 5 --prompt 'Apply changes?'",
  "timeoutMs": 30000
}
```

Si le pipeline demande une approbation, reprenez avec le jeton :

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

L'IA déclenche le flux de travail ; Lobster exécute les étapes. Les portes d'approbation maintiennent les effets secondaires explicites et auditables.

Exemple : mapper les éléments d'entrée dans des appels d'outils :

```bash
gog.gmail.search --query 'newer_than:1d' \
  | openclaw.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## Étapes LLM JSON uniquement (llm-task)

Pour les workflows qui nécessitent une étape **LLM structurée**, activez l'outil de plugin optionnel
LLM`llm-task`Lobster et appelez-le depuis Lobster. Cela permet de garder le workflow déterministe tout en vous laissant classifier/résumer/rédiger avec un modèle.

Activer l'outil :

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": { "alsoAllow": ["llm-task"] }
      }
    ]
  }
}
```

### Limitation importante : Lobster intégré vs Lobster`openclaw.invoke`

Le plugin Lobster inclus exécute les workflows **en cours de traitement** (in-process) à l'intérieur de la passerelle. Dans ce mode intégré, Lobster`openclaw.invoke`OpenClawCLI **n'hérite pas** automatiquement d'un contexte d'URL/authentification de la passerelle pour les appels d'outils CLI OpenClaw imbriqués.

Cela signifie que ce modèle n'est **pas actuellement fiable dans l'exécuteur intégré** :

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{ ... }'
```

Utilisez l'exemple ci-dessous uniquement lors de l'exécution de la **CLI Lobster autonome** dans un environnement où LobsterCLI`openclaw.invoke` est déjà configuré avec le contexte de passerelle/authentification correct.

Utilisez-le dans un pipeline CLI Lobster autonome :

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
  "thinking": "low",
  "input": { "subject": "Hello", "body": "Can you help?" },
  "schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "draft": { "type": "string" }
    },
    "required": ["intent", "draft"],
    "additionalProperties": false
  }
}'
```

Si vous utilisez le plugin Lobster intégré aujourd'hui, préférez soit :

- un appel d'outil `llm-task`Lobster direct en dehors de Lobster, ou
- des étapes non `openclaw.invoke`Lobster à l'intérieur du pipeline Lobster jusqu'à ce qu'un pont intégré pris en charge soit ajouté.

Voir [Tâche LLM](LLM/en/tools/llm-task) pour les détails et les options de configuration.

## Fichiers de workflow (.lobster)

Lobster peut exécuter des fichiers de workflow YAML/JSON avec les champs Lobster`name`, `args`, `steps`, `env`, `condition` et `approval`OpenClaw. Dans les appels d'outil OpenClaw, définissez `pipeline` sur le chemin du fichier.

```yaml
name: inbox-triage
args:
  tag:
    default: "family"
steps:
  - id: collect
    command: inbox list --json
  - id: categorize
    command: inbox categorize --json
    stdin: $collect.stdout
  - id: approve
    command: inbox apply --approve
    stdin: $categorize.stdout
    approval: required
  - id: execute
    command: inbox apply --execute
    stdin: $categorize.stdout
    condition: $approve.approved
```

Notes :

- `stdin: $step.stdout` et `stdin: $step.json` transmettent la sortie d'une étape précédente.
- `condition` (ou `when`) peut verrouiller des étapes sur `$step.approved`.

## Installer Lobster

Les workflows Lobster groupés s'exécutent en cours de processus ; aucun binaire Lobster`lobster`Lobster séparé n'est requis. L'exécuteur intégré est fourni avec le plugin Lobster.

Si vous avez besoin de la CLI Lobster autonome pour le développement ou les pipelines externes, installez-la à partir du [dépôt Lobster](LobsterCLILobsterhttps://github.com/openclaw/lobster) et assurez-vous que `lobster` est sur `PATH`.

## Activer l'outil

Lobster est un outil de plugin **optionnel** (non activé par défaut).

Recommandé (additif, sûr) :

```json
{
  "tools": {
    "alsoAllow": ["lobster"]
  }
}
```

Ou par agent :

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "alsoAllow": ["lobster"]
        }
      }
    ]
  }
}
```

Évitez d'utiliser `tools.allow: ["lobster"]` sauf si vous avez l'intention de l'exécuter en mode liste d'autorisation restrictive.

<Note>Les listes d'autorisation sont optionnelles pour les plugins optionnels. `alsoAllow` n'active que les outils de plugins optionnels nommés tout en préservant l'ensemble normal d'outils principaux. Pour restreindre les outils principaux, utilisez `tools.allow` avec les outils principaux ou les groupes que vous souhaitez.</Note>

## Exemple : tri des e-mails

Sans Lobster :

```
User: "Check my email and draft replies"
→ openclaw calls gmail.list
→ LLM summarizes
→ User: "draft replies to #2 and #5"
→ LLM drafts
→ User: "send #2"
→ openclaw calls gmail.send
(repeat daily, no memory of what was triaged)
```

Avec Lobster :

```json
{
  "action": "run",
  "pipeline": "email.triage --limit 20",
  "timeoutMs": 30000
}
```

Renvoie une enveloppe JSON (tronquée) :

```json
{
  "ok": true,
  "status": "needs_approval",
  "output": [{ "summary": "5 need replies, 2 need action" }],
  "requiresApproval": {
    "type": "approval_request",
    "prompt": "Send 2 draft replies?",
    "items": [],
    "resumeToken": "..."
  }
}
```

L'utilisateur approuve → reprendre :

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

Un workflow. Déterministe. Sûr.

## Paramètres de l'outil

### `run`

Exécuter un pipeline en mode outil.

```json
{
  "action": "run",
  "pipeline": "gog.gmail.search --query 'newer_than:1d' | email.triage",
  "cwd": "workspace",
  "timeoutMs": 30000,
  "maxStdoutBytes": 512000
}
```

Exécuter un fichier de workflow avec des arguments :

```json
{
  "action": "run",
  "pipeline": "/path/to/inbox-triage.lobster",
  "argsJson": "{\"tag\":\"family\"}"
}
```

### `resume`

Continuer un workflow interrompu après approbation.

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

### Entrées facultatives

- `cwd` : Répertoire de travail relatif pour le pipeline (doit rester dans le répertoire de travail de la passerelle).
- `timeoutMs` : Interrompre le workflow s'il dépasse cette durée (par défaut : 20000).
- `maxStdoutBytes` : Interrompre le workflow si la sortie dépasse cette taille (par défaut : 512000).
- `argsJson` : Chaîne JSON transmise à `lobster run --args-json` (fichiers de workflow uniquement).

## Enveloppe de sortie

Lobster renvoie une enveloppe JSON avec l'un des trois états :

- `ok` → terminé avec succès
- `needs_approval` → en pause ; `requiresApproval.resumeToken` est requis pour reprendre
- `cancelled` → explicitement refusé ou annulé

L'outil expose l'enveloppe à la fois dans `content` (JSON pretty) et `details` (objet brut).

## Approbations

Si `requiresApproval` est présent, inspectez l'invite et décidez :

- `approve: true` → reprendre et continuer les effets secondaires
- `approve: false` → annuler et finaliser le workflow

Utilisez `approve --preview-from-stdin --limit N` pour joindre un aperçu JSON aux demandes d'approbation sans collage jq/heredoc personnalisé. Les jetons de reprise sont désormais compacts : Lobster stocke l'état de reprise du workflow sous son répertoire d'état et renvoie une petite clé de jeton.

## OpenProse

OpenProse se marie bien avec Lobster : utilisez OpenProseLobster`/prose`LobsterLobster pour orchestrer la préparation multi-agent, puis exécutez un pipeline Lobster pour les validations déterministes. Si un programme Prose a besoin de Lobster, autorisez le tool `lobster` pour les sous-agents via `tools.subagents.tools`OpenProse. Voir [OpenProse](/fr/prose).

## Sécurité

- **Uniquement local et en processus** - les workflows s'exécutent à l'intérieur du processus de la passerelle ; aucun appel réseau depuis le plugin lui-même.
- **Aucun secret** - Lobster ne gère pas OAuth ; il appelle les outils OpenClaw qui le font.
- **Conscience du bac à sable (Sandbox-aware)** - désactivé lorsque le contexte de l'outil est sandboxed.
- **Renforcé** - délais d'attente et limites de sortie appliqués par le runner intégré.

## Dépannage

- **`lobster timed out`** → augmentez `timeoutMs`, ou divisez un long pipeline.
- **`lobster output exceeded maxStdoutBytes`** → augmentez `maxStdoutBytes` ou réduisez la taille de la sortie.
- **`lobster returned invalid JSON`** → assurez-vous que le pipeline s'exécute en mode tool et n'imprime que du JSON.
- **`lobster failed`** → vérifiez les journaux de la passerelle pour les détails de l'erreur du runner intégré.

## En savoir plus

- [Plugins](/fr/tools/plugin)
- [Création de plugins d'outils](/fr/plugins/building-plugins#registering-agent-tools)

## Étude de cas : workflows communautaires

Un exemple public : une CLI de "second cerveau" + des pipelines Lobster qui gèrent trois coffres Markdown (personnel, partenaire, partagé). La CLI émet du JSON pour les statistiques, les listes de boîte de réception et les analyses des éléments obsolètes ; Lobster enchaîne ces commandes dans des workflows tels que CLILobsterCLILobster`weekly-review`, `inbox-triage`, `memory-consolidation` et `shared-task-sync`, chacun avec des portes d'approbation. L'IA gère le jugement (catégorisation) lorsque cela est disponible et revient à des règles déterministes sinon.

- Fil de discussion : [https://x.com/plattenschieber/status/2014508656335770033](https://x.com/plattenschieber/status/2014508656335770033)
- Dépôt : [https://github.com/bloomedai/brain-cli](https://github.com/bloomedai/brain-cli)

## Connexes

- [Automatisation et tâches](/fr/automationLobster) - planification des workflows Lobster
- [Présentation de l'automatisation](/fr/automation) - tous les mécanismes d'automatisation
- [Présentation des outils](/fr/tools) - tous les outils d'agent disponibles
