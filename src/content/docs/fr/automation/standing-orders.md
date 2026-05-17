---
summary: "Définir une autorisation opérationnelle permanente pour les programmes d'agents autonomes"
read_when:
  - Setting up autonomous agent workflows that run without per-task prompting
  - Defining what the agent can do independently vs. what needs human approval
  - Structuring multi-program agents with clear boundaries and escalation rules
title: "Standing orders"
---

Les ordres permanents confèrent à votre agent une **autorité opérationnelle permanente** pour des programmes définis. Au lieu de donner des instructions de tâches individuelles à chaque fois, vous définissez des programmes avec une portée claire, des déclencheurs et des règles d'escalade - et l'agent exécute de manière autonome dans ces limites.

C'est la différence entre dire à votre assistant "envoyez le rapport hebdomadaire" chaque vendredi et accorder une autorité permanente : "Vous êtes responsable du rapport hebdomadaire. Compilez-le chaque vendredi, envoyez-le et n'escaladez que si quelque chose semble anormal."

## Pourquoi des standing orders

**Sans standing orders :**

- Vous devez solliciter l'agent pour chaque tâche
- L'agent reste inactif entre les requêtes
- Le travail de routine est oublié ou retardé
- Vous devenez un goulot d'étranglement

**Avec des standing orders :**

- L'agent exécute de manière autonome dans des limites définies
- Le travail de routine est effectué selon l'horaire sans sollicitation
- Vous n'intervenez que pour les exceptions et les approbations
- L'agent occupe son temps inactif de manière productive

## Comment ils fonctionnent

Les standing orders sont définis dans les fichiers de votre [agent workspace](/fr/concepts/agent-workspace). L'approche recommandée consiste à les inclure directement dans `AGENTS.md` (qui est injecté automatiquement à chaque session) afin que l'agent les ait toujours en contexte. Pour les configurations plus volumineuses, vous pouvez également les placer dans un fichier dédié comme `standing-orders.md` et y faire référence depuis `AGENTS.md`.

Chaque programme spécifie :

1. **Portée** - ce que l'agent est autorisé à faire
2. **Déclencheurs** - quand exécuter (planification, événement ou condition)
3. **Barrières d'approbation** - ce qui nécessite une signature humaine avant d'agir
4. **Règles d'escalade** - quand s'arrêter et demander de l'aide

L'agent charge ces instructions à chaque session via les fichiers d'amorçage de l'espace de travail (voir [Agent Workspace](/fr/concepts/agent-workspace) pour la liste complète des fichiers injectés automatiquement) et exécute en fonction d'elles, combinées aux [cron jobs](/fr/automation/cron-jobs) pour l'application basée sur le temps.

<Tip>Placez les ordres permanents dans `AGENTS.md` pour garantir qu'ils sont chargés à chaque session. L'amorçage de l'espace de travail injecte automatiquement `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` et `MEMORY.md` - mais pas les fichiers arbitraires dans les sous-répertoires.</Tip>

## Anatomie d'un ordre permanent

```markdown
## Program: Weekly Status Report

**Authority:** Compile data, generate report, deliver to stakeholders
**Trigger:** Every Friday at 4 PM (enforced via cron job)
**Approval gate:** None for standard reports. Flag anomalies for human review.
**Escalation:** If data source is unavailable or metrics look unusual (>2σ from norm)

### Execution steps

1. Pull metrics from configured sources
2. Compare to prior week and targets
3. Generate report in Reports/weekly/YYYY-MM-DD.md
4. Deliver summary via configured channel
5. Log completion to Agent/Logs/

### What NOT to do

- Do not send reports to external parties
- Do not modify source data
- Do not skip delivery if metrics look bad - report accurately
```

## Ordres permanents et tâches cron

Les ordres permanents définissent **ce** que l'agent est autorisé à faire. Les [tâches cron](/fr/automation/cron-jobs) définissent **quand** cela se produit. Ils fonctionnent ensemble :

```
Standing Order: "You own the daily inbox triage"
    ↓
Cron Job (8 AM daily): "Execute inbox triage per standing orders"
    ↓
Agent: Reads standing orders → executes steps → reports results
```

L'invite de la tâche cron doit référencer l'ordre permanent plutôt que de le dupliquer :

```bash
openclaw cron add \
  --name daily-inbox-triage \
  --cron "0 8 * * 1-5" \
  --tz America/New_York \
  --timeout-seconds 300 \
  --announce \
  --channel imessage \
  --to "+1XXXXXXXXXX" \
  --message "Execute daily inbox triage per standing orders. Check mail for new alerts. Parse, categorize, and persist each item. Report summary to owner. Escalate unknowns."
```

## Exemples

### Exemple 1 : contenu et réseaux sociaux (cycle hebdomadaire)

```markdown
## Program: Content & Social Media

**Authority:** Draft content, schedule posts, compile engagement reports
**Approval gate:** All posts require owner review for first 30 days, then standing approval
**Trigger:** Weekly cycle (Monday review → mid-week drafts → Friday brief)

### Weekly cycle

- **Monday:** Review platform metrics and audience engagement
- **Tuesday-Thursday:** Draft social posts, create blog content
- **Friday:** Compile weekly marketing brief → deliver to owner

### Content rules

- Voice must match the brand (see SOUL.md or brand voice guide)
- Never identify as AI in public-facing content
- Include metrics when available
- Focus on value to audience, not self-promotion
```

### Exemple 2 : opérations financières (déclenchement par événement)

```markdown
## Program: Financial Processing

**Authority:** Process transaction data, generate reports, send summaries
**Approval gate:** None for analysis. Recommendations require owner approval.
**Trigger:** New data file detected OR scheduled monthly cycle

### When new data arrives

1. Detect new file in designated input directory
2. Parse and categorize all transactions
3. Compare against budget targets
4. Flag: unusual items, threshold breaches, new recurring charges
5. Generate report in designated output directory
6. Deliver summary to owner via configured channel

### Escalation rules

- Single item > $500: immediate alert
- Category > budget by 20%: flag in report
- Unrecognizable transaction: ask owner for categorization
- Failed processing after 2 retries: report failure, do not guess
```

### Exemple 3 : surveillance et alertes (continu)

```markdown
## Program: System Monitoring

**Authority:** Check system health, restart services, send alerts
**Approval gate:** Restart services automatically. Escalate if restart fails twice.
**Trigger:** Every heartbeat cycle

### Checks

- Service health endpoints responding
- Disk space above threshold
- Pending tasks not stale (>24 hours)
- Delivery channels operational

### Response matrix

| Condition        | Action                   | Escalate?                |
| ---------------- | ------------------------ | ------------------------ |
| Service down     | Restart automatically    | Only if restart fails 2x |
| Disk space < 10% | Alert owner              | Yes                      |
| Stale task > 24h | Remind owner             | No                       |
| Channel offline  | Log and retry next cycle | If offline > 2 hours     |
```

## Motif Exécuter-Vérifier-Rapporter

Les ordres permanents fonctionnent mieux lorsqu'ils sont combinés à une discipline d'exécution stricte. Chaque tâche dans un ordre permanent doit suivre cette boucle :

1. **Exécuter** - Faire le travail réel (ne pas simplement reconnaître l'instruction)
2. **Vérifier** - Confirmer que le résultat est correct (le fichier existe, le message est livré, les données sont analysées)
3. **Rapporter** - Dire au propriétaire ce qui a été fait et ce qui a été vérifié

```markdown
### Execution rules

- Every task follows Execute-Verify-Report. No exceptions.
- "I'll do that" is not execution. Do it, then report.
- "Done" without verification is not acceptable. Prove it.
- If execution fails: retry once with adjusted approach.
- If still fails: report failure with diagnosis. Never silently fail.
- Never retry indefinitely - 3 attempts max, then escalate.
```

Ce motif empêche le mode d'échec le plus courant de l'agent : accuser réception d'une tâche sans la terminer.

## Architecture multi-programme

Pour les agents gérant plusieurs préoccupations, organisez les ordres permanents en programmes distincts avec des limites claires :

```markdown
## Program 1: [Domain A] (Weekly)

...

## Program 2: [Domain B] (Monthly + On-Demand)

...

## Program 3: [Domain C] (As-Needed)

...

## Escalation Rules (All Programs)

- [Common escalation criteria]
- [Approval gates that apply across programs]
```

Chaque programme doit avoir :

- Sa propre **cadence de déclenchement** (hebdomadaire, mensuelle, basée sur les événements, continue)
- Ses propres **portes d'approbation** (certains programmes nécessitent plus de supervision que d'autres)
- Des **limites claires** (l'agent doit savoir où un programme se termine et où un autre commence)

## Bonnes pratiques

### À faire

- Commencez avec une autorisation étroite et élargissez-la au fur et à mesure que la confiance s'établit
- Définissez des portes d'approbation explicites pour les actions à risque élevé
- Incluez des sections "Ce qu'il ne faut PAS faire" - les limites sont aussi importantes que les autorisations
- Combinez avec des tâches cron pour une exécution fiable basée sur le temps
- Examinez les journaux de l'agent hebdomadairement pour vérifier que les ordres permanents sont respectés
- Mettez à jour les ordres permanents au fur et à mesure que vos besoins évoluent - ce sont des documents vivants

### À éviter

- Accorder une large autorité dès le premier jour (« fais ce que tu penses être meilleur »)
- Omettez les règles d'escalade - chaque programme a besoin d'une clause "quand s'arrêter et demander"
- Supposez que l'agent se souviendra des instructions verbales - mettez tout dans le fichier
- Mélangez les préoccupations dans un seul programme - des programmes séparés pour des domaines distincts
- Oubliez de faire respecter avec les tâches cron - les ordres permanents sans déclencheurs deviennent des suggestions

## Connexes

- [Automatisation](/fr/automation) : tous les mécanismes d'automatisation en un coup d'œil.
- [Tâches cron](/fr/automation/cron-jobs) : application de planification pour les ordres permanents.
- [Hooks](/fr/automation/hooks) : scripts pilotés par les événements pour les événements du cycle de vie de l'agent.
- [Webhooks](/fr/automation/cron-jobs#webhooks) : déclencheurs d'événements HTTP entrants.
- [Espace de travail de l'agent](/fr/concepts/agent-workspace) : là où vivent les ordres permanents, y compris la liste complète des fichiers d'amorçage auto-injectés (`AGENTS.md`, `SOUL.md`, etc.).
