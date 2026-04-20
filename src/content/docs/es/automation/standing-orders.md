---
summary: "Define autoridad operativa permanente para programas de agentes autónomos"
read_when:
  - Setting up autonomous agent workflows that run without per-task prompting
  - Defining what the agent can do independently vs. what needs human approval
  - Structuring multi-program agents with clear boundaries and escalation rules
title: "Órdenes Permanentes"
---

# Órdenes Permanentes

Las órdenes permanentes otorgan a su agente **autoridad operativa permanente** para programas definidos. En lugar de dar instrucciones de tareas individuales cada vez, usted define programas con un alcance claro, disparadores y reglas de escalada — y el agente se ejecuta de forma autónoma dentro de esos límites.

Esta es la diferencia entre decirle a su asistente "envía el informe semanal" todos los viernes frente a otorgar autoridad permanente: "Usted es responsable del informe semanal. Compílelo todos los viernes, envíelo y solo escalé si algo parece incorrecto".

## ¿Por qué Órdenes Permanentes?

**Sin órdenes permanentes:**

- Debe solicitar al agente para cada tarea
- El agente permanece inactivo entre solicitudes
- El trabajo rutinario se olvida o se retrasa
- Usted se convierte en el cuello de botella

**Con órdenes permanentes:**

- El agente se ejecuta de forma autónoma dentro de límites definidos
- El trabajo rutinario se realiza según lo programado sin necesidad de instrucciones
- Usted solo participa para excepciones y aprobaciones
- El agente aprovecha el tiempo de inactividad de manera productiva

## Cómo Funcionan

Las órdenes permanentes se definen en los archivos de su [agente workspace](/es/concepts/agent-workspace). El enfoque recomendado es incluirlas directamente en `AGENTS.md` (que se inyecta automáticamente en cada sesión) para que el agente siempre las tenga en contexto. Para configuraciones más grandes, también puede colocarlas en un archivo dedicado como `standing-orders.md` y referenciarlo desde `AGENTS.md`.

Cada programa especifica:

1. **Alcance** — lo que el agente está autorizado a hacer
2. **Disparadores** — cuándo ejecutar (programación, evento o condición)
3. **Puertas de aprobación** — qué requiere la firma humana antes de actuar
4. **Reglas de escalada** — cuándo detenerse y pedir ayuda

El agente carga estas instrucciones en cada sesión a través de los archivos de arranque del espacio de trabajo (consulte [Agent Workspace](/es/concepts/agent-workspace) para obtener la lista completa de archivos autoinyectados) y se ejecuta basándose en ellas, combinado con [cron jobs](/es/automation/cron-jobs) para el cumplimiento basado en tiempo.

<Tip>Coloca las órdenes permanentes en `AGENTS.md` para garantizar que se carguen en cada sesión. El arranque del espacio de trabajo inyecta automáticamente `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` y `MEMORY.md` — pero no archivos arbitrarios en subdirectorios.</Tip>

## Anatomía de una Orden Permanente

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

## Órdenes Permanentes + Trabajos Cron

Las órdenes permanentes definen **qué** está autorizado a hacer el agente. Los [trabajos cron](/es/automation/cron-jobs) definen **cuándo** sucede. Trabajan juntos:

```
Standing Order: "You own the daily inbox triage"
    ↓
Cron Job (8 AM daily): "Execute inbox triage per standing orders"
    ↓
Agent: Reads standing orders → executes steps → reports results
```

El prompt del trabajo cron debe hacer referencia a la orden permanente en lugar de duplicarla:

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

## Ejemplos

### Ejemplo 1: Contenido y Redes Sociales (Ciclo Semanal)

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

### Ejemplo 2: Operaciones Financieras (Activado por Eventos)

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

### Ejemplo 3: Monitoreo y Alertas (Continuo)

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

## El Patrón Ejecutar-Verificar-Informar

Las órdenes permanentes funcionan mejor cuando se combinan con una disciplina de ejecución estricta. Cada tarea en una orden permanente debe seguir este bucle:

1. **Ejecutar** — Realizar el trabajo real (no solo reconocer la instrucción)
2. **Verificar** — Confirmar que el resultado sea correcto (el archivo existe, el mensaje se envió, los datos se analizaron)
3. **Informar** — Decirle al propietario qué se hizo y qué se verificó

```markdown
### Execution Rules

- Every task follows Execute-Verify-Report. No exceptions.
- "I'll do that" is not execution. Do it, then report.
- "Done" without verification is not acceptable. Prove it.
- If execution fails: retry once with adjusted approach.
- If still fails: report failure with diagnosis. Never silently fail.
- Never retry indefinitely — 3 attempts max, then escalate.
```

Este patrón evita el modo de fallo más común del agente: reconocer una tarea sin completarla.

## Arquitectura Multiprograma

Para agentes que gestionan múltiples preocupaciones, organice las órdenes permanentes como programas separados con límites claros:

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

Cada programa debe tener:

- Su propio **ritmo de activación** (semanal, mensual, impulsado por eventos, continuo)
- Sus propios **puertas de aprobación** (algunos programas necesitan más supervisión que otros)
- **Límites** claros (el agente debe saber dónde termina un programa y comienza otro)

## Mejores Prácticas

### Hacer

- Comience con una autoridad limitada y amplíela a medida que se construya la confianza
- Defina puertas de aprobación explícitas para acciones de alto riesgo
- Incluya secciones de "Qué NO hacer" — los límites son tan importantes como los permisos
- Combine con trabajos cron para una ejecución confiable basada en tiempo
- Revise los registros del agente semanalmente para verificar que se estén siguiendo las órdenes permanentes
- Actualice las órdenes permanentes a medida que evolucionen sus necesidades — son documentos vivos

### Evitar

- Otorgar una autoridad amplia desde el primer día ("haz lo que creas que es mejor")
- Omitir las reglas de escalada — cada programa necesita una cláusula de "cuándo detenerse y preguntar"
- Asumir que el agente recordará las instrucciones verbales — pon todo en el archivo
- Mezclar preocupaciones en un solo programa — programas separados para dominios separados
- Olvidar hacer cumplir con trabajos cron — las órdenes permanentes sin disparadores se vuelven sugerencias

## Relacionado

- [Automatización y tareas](/es/automation) — todos los mecanismos de automatización a un vistazo
- [Trabajos Cron](/es/automation/cron-jobs) — cumplimiento de horarios para las órdenes permanentes
- [Ganchos (Hooks)](/es/automation/hooks) — scripts controlados por eventos para eventos del ciclo de vida del agente
- [Webhooks](/es/automation/cron-jobs#webhooks) — disparadores de eventos HTTP entrantes
- [Espacio de trabajo del agente](/es/concepts/agent-workspace) — donde residen las órdenes permanentes, incluida la lista completa de archivos de arranque inyectados automáticamente (AGENTS.md, SOUL.md, etc.)
