---
title: Lobster
summary: "Runtime de workflow typé pour OpenClaw avec des portes d'approbation reprises."
read_when:
  - You want deterministic multi-step workflows with explicit approvals
  - You need to resume a workflow without re-running earlier steps
---

# Lobster

Lobster est un shell de workflow qui permet à OpenClaw d'exécuter des séquences d'outils en plusieurs étapes en une seule opération déterministe avec des points d'approbation explicites.

Lobster est une couche de rédaction située au-dessus des travaux d'arrière-plan détachés. Si vous rencontrez une ancienne terminologie `ClawFlow`, considérez-la comme une dénomination historique autour de la même zone d'exécution orientée tâche ; l'interface Lobster actuelle destinée aux opérateurs est [`openclaw tasks`](/en/automation/tasks).

## Hook

Votre assistant peut construire les outils qui le gèrent eux-mêmes. Demandez un workflow, et 30 minutes plus tard, vous disposez d'une CLI ainsi que de pipelines qui s'exécutent en un seul appel. Lobster est la pièce manquante : des pipelines déterministes, des approbations explicites et un état résiliable.

## Pourquoi

Aujourd'hui, les workflows complexes nécessitent de nombreux allers-retours d'appels d'outils. Chaque appel coûte des tokens, et le LLM doit orchestrer chaque étape. Lobster déplace cette orchestration vers un runtime typé :

- **Un seul appel au lieu de plusieurs** : OpenClaw exécute un appel d'outil Lobster et obtient un résultat structuré.
- **Approbations intégrées** : Les effets secondaires (envoyer un e-mail, poster un commentaire) interrompent le workflow jusqu'à ce qu'ils soient explicitement approuvés.
- **Résiliable** : Les workflows interrompus renvoient un jeton ; approuvez et reprenez sans tout réexécuter.

## Pourquoi un DSL au lieu de programmes classiques ?

Lobster est volontairement petit. L'objectif n'est pas « un nouveau langage », mais une spécification de pipeline prévisible et conviviale pour l'IA avec des approbations de première classe et des jetons de reprise.

- **Approbation/reprise intégrée** : Un programme classique peut solliciter un humain, mais il ne peut pas _mettre en pause et reprendre_ avec un jeton durable sans que vous inventiez vous-même ce runtime.
- **Déterminisme + auditabilité** : Les pipelines sont des données, ils sont donc faciles à journaliser, comparer, réexécuter et réviser.
- **Surface contrainte pour l'IA** : Une grammaire minime + le piping JSON réduisent les chemins de code « créatifs » et rendent la validation réaliste.
- **Stratégie de sécurité intégrée** : Les délais d'attente, les limites de sortie, les vérifications de bac à sable et les listes d'autorisation sont appliqués par le runtime, et non par chaque script.
- **Toujours programmable** : Chaque étape peut appeler n'importe quel CLI ou script. Si vous souhaitez du JS/TS, générez des fichiers `.lobster` à partir du code.

## Fonctionnement

OpenClaw lance le CLI `lobster` local en **mode outil** et analyse une enveloppe JSON depuis stdout.
Si le pipeline s'interrompt pour approbation, l'outil renvoie un `resumeToken` afin que vous puissiez continuer plus tard.

## Modèle : petit CLI + canaux JSON + approbations

Créez de minuscules commandes qui parlent JSON, puis enchaînez-les dans un seul appel Lobster. (Noms de commandes exemple ci-dessous — remplacez-les par les vôtres.)

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

L'IA déclenche le workflow ; Lobster exécute les étapes. Les portes d'approbation gardent les effets secondaires explicites et vérifiables.

Exemple : mapper les éléments d'entrée en appels d'outil :

```bash
gog.gmail.search --query 'newer_than:1d' \
  | openclaw.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## Étapes LLM JSON uniquement (llm-task)

Pour les workflows qui nécessitent une étape LLM structurée, activez l'outil de plugin optionnel
`llm-task` et appelez-le depuis Lobster. Cela maintient le workflow
déterministe tout en vous permettant de classer/résumer/rédiger avec un modèle.

Activez l'outil :

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
        "tools": { "allow": ["llm-task"] }
      }
    ]
  }
}
```

Utilisez-le dans un pipeline :

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

Voir [LLM Task](/en/tools/llm-task) pour les détails et les options de configuration.

## Fichiers de workflow (.lobster)

Lobster peut exécuter des fichiers de workflow YAML/JSON avec les champs `name`, `args`, `steps`, `env`, `condition` et `approval`. Dans les appels d'outil OpenClaw, définissez `pipeline` sur le chemin du fichier.

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
- `condition` (ou `when`) peut verrouiller les étapes sur `$step.approved`.

## Installer Lobster

Installez la Lobster CLI sur le **même hôte** qui exécute la OpenClaw Gateway (voir le [dépôt Lobster](https://github.com/openclaw/lobster)), et assurez-vous que `lobster` est dans `PATH`.

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

Évitez d'utiliser `tools.allow: ["lobster"]` à moins que vous ne prévoyiez d'exécuter en mode de liste d'autorisation restrictive.

Remarque : les listes d'autorisation sont opt-in pour les plugins optionnels. Si votre liste d'autorisation nomme uniquement
les outils de plugin (comme `lobster`), OpenClaw garde les outils principaux activés. Pour restreindre les outils
principaux, incluez également les outils principaux ou les groupes que vous souhaitez dans la liste d'autorisation.

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

Un seul workflow. Déterministe. Sûr.

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

- `cwd` : Répertoire de travail relatif pour le pipeline (doit rester dans le répertoire de travail du processus actuel).
- `timeoutMs` : Tuer le sous-processus s'il dépasse cette durée (par défaut : 20000).
- `maxStdoutBytes` : Tuer le sous-processus si stdout dépasse cette taille (par défaut : 512000).
- `argsJson` : Chaîne JSON transmise à `lobster run --args-json` (fichiers de workflow uniquement).

## Envelope de sortie

Lobster renvoie une enveloppe JSON avec l'un des trois états suivants :

- `ok` → terminé avec succès
- `needs_approval` → en pause ; `requiresApproval.resumeToken` est nécessaire pour reprendre
- `cancelled` → explicitement refusé ou annulé

L'outil présente l'enveloppe à la fois dans `content` (JSON pretty-print) et `details` (objet brut).

## Approbations

Si `requiresApproval` est présent, inspectez l'invite et décidez :

- `approve: true` → reprendre et continuer les effets secondaires
- `approve: false` → annuler et finaliser le workflow

Utilisez `approve --preview-from-stdin --limit N` pour attacher un aperçu JSON aux demandes d'approbation sans collage jq/heredoc personnalisé. Les jetons de reprise sont maintenant compacts : Lobster stocke l'état de reprise du workflow dans son répertoire d'état et renvoie une petite clé de jeton.

## OpenProse

OpenProse se marie bien avec Lobster : utilisez `/prose` pour orchestrer la préparation multi-agent, puis exécutez un pipeline Lobster pour des approbations déterministes. Si un programme Prose a besoin de Lobster, autorisez l'outil `lobster` pour les sous-agents via `tools.subagents.tools`. Voir [OpenProse](/en/prose).

## Sécurité

- **Sous-processus local uniquement** — aucun appel réseau depuis le plugin lui-même.
- **Aucun secret** — Lobster ne gère pas OAuth ; il appelle les outils OpenClaw qui le font.
- **Conscient du bac à sable (Sandbox-aware)** — désactivé lorsque le contexte de l'outil est isolé (sandboxed).
- **Renforcé (Hardened)** — nom d'exécutable fixe (`lobster`) sur `PATH` ; délais d'attente et limites de sortie appliqués.

## Dépannage

- **`lobster subprocess timed out`** → augmentez `timeoutMs`, ou divisez un pipeline long.
- **`lobster output exceeded maxStdoutBytes`** → augmentez `maxStdoutBytes` ou réduisez la taille de la sortie.
- **`lobster returned invalid JSON`** → assurez-vous que le pipeline s'exécute en mode tool et n'imprime que du JSON.
- **`lobster failed (code …)`** → exécutez le même pipeline dans un terminal pour inspecter stderr.

## En savoir plus

- [Plugins](/en/tools/plugin)
- [Création d'outils de plugin](/en/plugins/building-plugins#registering-agent-tools)

## Étude de cas : workflows communautaires

Un exemple public : une CLI de « second cerveau » et des pipelines Lobster qui gèrent trois coffres Markdown (personnel, partenaire, partagé). La CLI émet du JSON pour les statistiques, les listes de boîte de réception et les analyses obsolètes ; Lobster enchaîne ces commandes dans des workflows tels que `weekly-review`, `inbox-triage`, `memory-consolidation` et `shared-task-sync`, chacun avec des portes d'approbation. L'IA gère le jugement (catégorisation) lorsqu'elle est disponible et revient à des règles déterministes dans le cas contraire.

- Fil : [https://x.com/plattenschieber/status/2014508656335770033](https://x.com/plattenschieber/status/2014508656335770033)
- Dépôt : [https://github.com/bloomedai/brain-cli](https://github.com/bloomedai/brain-cli)

## Connexes

- [Cron vs Heartbeat](/en/automation/cron-vs-heartbeat) — planification des workflows Lobster
- [Vue d'ensemble de l'automatisation](/en/automation) — tous les mécanismes d'automatisation
- [Vue d'ensemble des outils](/en/tools) — tous les outils d'agent disponibles
