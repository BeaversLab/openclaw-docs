---
summary: "Définir une autorisation opérationnelle permanente pour les programmes d'agents autonomes"
read_when:
  - Setting up autonomous agent workflows that run without per-task prompting
  - Defining what the agent can do independently vs. what needs human approval
  - Structuring multi-program agents with clear boundaries and escalation rules
title: "Standing Orders"
---

# Standing Orders

Les standing orders accordent à votre agent une **autorisation opérationnelle permanente** pour des programmes définis. Au lieu de donner des instructions de tâche individuelles à chaque fois, vous définissez des programmes avec une portée claire, des déclencheurs et des règles d'escalade — et l'agent exécute de manière autonome dans ces limites.

C'est la différence entre dire à votre assistant "envoyer le rapport hebdomadaire" chaque vendredi et accorder une autorisation permanente : "Vous êtes responsable du rapport hebdomadaire. Compilez-le chaque vendredi, envoyez-le et n'escaladez que"

## Pourquoi des Standing Orders ?

**Sans standing orders :**

- Vous devez inviter l'agent pour chaque tâche
- L'agent reste inactif entre les requêtes
- Le travail de routine est oublié ou retardé
- Vous devenez le goulot d'étranglement

**Avec les standing orders :**

- L'agent exécute de manière autonome dans les limites définies
- Le travail de routine se fait selon l'horaire sans invitation
- Vous n'intervenez que pour les exceptions et les approbations
- L'agent remplit le temps d'inactivité de manière productive

## Comment ils fonctionnent

Les standing orders sont définis dans vos fichiers [agent workspace](/fr/concepts/agent-workspace). L'approche recommandée est de les inclure directement dans `AGENTS.md` (qui est auto-injecté à chaque session) afin que l'agent les ait toujours en contexte. Pour les configurations plus volumineuses, vous pouvez également les placer dans un fichier dédié comme `standing-orders.md` et y faire référence depuis `AGENTS.md`.

Chaque programme spécifie :

1. **Portée** — ce que l'agent est autorisé à faire
2. **Déclencheurs** — quand exécuter (horaire, événement ou condition)
3. **Portes d'approbation** — ce qui nécessite une signature humaine avant d'agir
4. **Règles d'escalade** — quand s'arrêter et demander de l'aide

L'agent charge ces instructions à chaque session via les fichiers d'amorçage de l'espace de travail (voir [Agent Workspace](/fr/concepts/agent-workspace) pour la liste complète des fichiers auto-injectés) et les exécute, combiné à des [cron jobs](/fr/automation/cron-jobs) pour l'application basée sur le temps.

<Tip>Placez les ordres permanents dans `AGENTS.md` pour garantir qu'ils sont chargés à chaque session. L'amorçage de l'espace de travail injecte automatiquement `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` et `MEMORY.md` — mais pas les fichiers arbitraires des sous-répertoires.</Tip>

## Anatomie d'un ordre permanent

```markdown
## Program: Weekly Status Report

**Authority:** Compile data, generate report, deliver to stakeholders
**Trigger:** Every Friday at 4 PM (enforced via cron job)
**Approval gate:** None for standard reports. Flag anomalies for human review.
**Escalation:** If data source is unavailable or metrics look unusual (>2σ from norm)

### Execution Steps

1. Pull metrics from configured sources
2. Compare to prior week and targets
3. Generate report in Reports/weekly/YYYY-MM-DD.md
4. Deliver summary via configured channel
5. Log completion to Agent/Logs/

### What NOT to Do

- Do not send reports to external parties
- Do not modify source data
- Do not skip delivery if metrics look bad — report accurately
```

## Ordres permanents + Tâches Cron

Les ordres permanents définissent **ce** que l'agent est autorisé à faire. Les [tâches cron](/fr/automation/cron-jobs) définissent **quand** cela se produit. Ils fonctionnent ensemble :

```
Standing Order: "You own the daily inbox triage"
    ↓
Cron Job (8 AM daily): "Execute inbox triage per standing orders"
    ↓
Agent: Reads standing orders → executes steps → reports results
```

Le prompt de la tâche cron doit référencer l'ordre permanent plutôt que de le dupliquer :

```bash
openclaw cron add \
  --name daily-inbox-triage \
  --cron "0 8 * * 1-5" \
  --tz America/New_York \
  --timeout-seconds 300 \
  --announce \
  --channel bluebubbles \
  --to "+1XXXXXXXXXX" \
  --message "Execute daily inbox triage per standing orders. Check mail for new alerts. Parse, categorize, and persist each item. Report summary to owner. Escalate unknowns."
```

## Exemples

### Exemple 1 : Contenu et réseaux sociaux (cycle hebdomadaire)

```markdown
## Program: Content & Social Media

**Authority:** Draft content, schedule posts, compile engagement reports
**Approval gate:** All posts require owner review for first 30 days, then standing approval
**Trigger:** Weekly cycle (Monday review → mid-week drafts → Friday brief)

### Weekly Cycle

- **Monday:** Review platform metrics and audience engagement
- **Tuesday–Thursday:** Draft social posts, create blog content
- **Friday:** Compile weekly marketing brief → deliver to owner

### Content Rules

- Voice must match the brand (see SOUL.md or brand voice guide)
- Never identify as AI in public-facing content
- Include metrics when available
- Focus on value to audience, not self-promotion
```

### Exemple 2 : Opérations financières (déclenché par événement)

```markdown
## Program: Financial Processing

**Authority:** Process transaction data, generate reports, send summaries
**Approval gate:** None for analysis. Recommendations require owner approval.
**Trigger:** New data file detected OR scheduled monthly cycle

### When New Data Arrives

1. Detect new file in designated input directory
2. Parse and categorize all transactions
3. Compare against budget targets
4. Flag: unusual items, threshold breaches, new recurring charges
5. Generate report in designated output directory
6. Deliver summary to owner via configured channel

### Escalation Rules

- Single item > $500: immediate alert
- Category > budget by 20%: flag in report
- Unrecognizable transaction: ask owner for categorization
- Failed processing after 2 retries: report failure, do not guess
```

### Exemple 3 : Surveillance et alertes (continu)

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

### Response Matrix

| Condition        | Action                   | Escalate?                |
| ---------------- | ------------------------ | ------------------------ |
| Service down     | Restart automatically    | Only if restart fails 2x |
| Disk space < 10% | Alert owner              | Yes                      |
| Stale task > 24h | Remind owner             | No                       |
| Channel offline  | Log and retry next cycle | If offline > 2 hours     |
```

## Le motif Exécuter-Vérifier-Rapporter

Les ordres permanents fonctionnent mieux lorsqu'ils sont combinés à une discipline d'exécution stricte. Chaque tâche dans un ordre permanent doit suivre cette boucle :

1. **Exécuter** — Faire le travail réel (ne pas se contenter d'acquiescer à l'instruction)
2. **Vérifier** — Confirmer que le résultat est correct (le fichier existe, le message est envoyé, les données sont analysées)
3. **Rapporter** — Informer le propriétaire de ce qui a été fait et de ce qui a été vérifié

```markdown
### Execution Rules

- Every task follows Execute-Verify-Report. No exceptions.
- "I'll do that" is not execution. Do it, then report.
- "Done" without verification is not acceptable. Prove it.
- If execution fails: retry once with adjusted approach.
- If still fails: report failure with diagnosis. Never silently fail.
- Never retry indefinitely — 3 attempts max, then escalate.
```

Ce motif permet d'éviter le mode de défaillance le plus courant des agents : acquiescer à une tâche sans la terminer.

## Architecture multi-programmes

Pour les agents gérant plusieurs préoccupations, organisez les ordres permanents en programmes distincts avec des limites claires :

```markdown
# Standing Orders

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

- Sa propre **cadence de déclenchement** (hebdomadaire, mensuelle, pilotée par événement, continue)
- Ses propres **portes d'approbation** (certains programmes nécessitent plus de supervision que d'autres)
- Des **limites claires** (l'agent doit savoir où un programme se termine et un autre commence)

## Meilleures pratiques

### À faire

- Commencez avec une autorisation restreinte et élargissez-la au fur et à mesure que la confiance s'établit
- Définissez des portes d'approbation explicites pour les actions à haut risque
- Incluez des sections « Ce qu'il ne faut PAS faire » — les limites sont aussi importantes que les autorisations
- Combinez avec des tâches cron pour une exécution fiable basée sur le temps
- Consultez les journaux de l'agent hebdomadairement pour vérifier que les ordres permanents sont respectés
- Mettez à jour les ordres permanents au fur et à mesure que vos besoins évoluent — ce sont des documents vivants

### À éviter

- Accorder une large autorité dès le premier jour (« fais ce que tu juges meilleur »)
- Omettre les règles d'escalade — chaque programme a besoin d'une clause « quand s'arrêter et demander »
- Supposer que l'agent se souviendra des instructions verbales — mettez tout dans le fichier
- Mélanger les préoccupations dans un seul programme — séparez les programmes pour des domaines distincts
- Oublier de faire respecter avec des tâches cron — les ordres permanents sans déclencheurs ne deviennent que des suggestions

## Connexes

- [Automatisation et tâches](/fr/automation) — un aperçu de tous les mécanismes d'automatisation
- [Tâches planifiées (Cron Jobs)](/fr/automation/cron-jobs) — application des planifications pour les ordres permanents
- [Hooks](/fr/automation/hooks) — scripts pilotés par les événements pour le cycle de vie de l'agent
- [Webhooks](/fr/automation/cron-jobs#webhooks) — déclencheurs d'événements HTTP entrants
- [Espace de travail de l'agent](/fr/concepts/agent-workspace) — endroit où résident les ordres permanents, y compris la liste complète des fichiers d'amorçage auto-injectés (AGENTS.md, SOUL.md, etc.)
