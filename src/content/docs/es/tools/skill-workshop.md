---
summary: "Crear y actualizar habilidades del área de trabajo a través de la revisión de Skill Workshop"
read_when:
  - You want the agent to create or update a skill from chat
  - You need to review, apply, reject, or quarantine a generated skill draft
  - You are configuring Skill Workshop approval, autonomy, storage, or limits
title: "Skill Workshop"
sidebarTitle: "Skill Workshop"
---

Skill Workshop es la ruta gobernada de OpenClaw para crear y actualizar habilidades del área de trabajo.

Los agentes y operadores no escriben archivos `SKILL.md` activos directamente a través de esta ruta. Primero crean una **propuesta**. Una propuesta es un borrador pendiente que contiene el contenido de la habilidad propuesta, el enlace de destino, el estado del escáner, los hashes, los metadatos de archivos de soporte y los metadatos de reversión. Solo se convierte en una habilidad en vivo cuando se aplica.

Skill Workshop solo escribe habilidades del área de trabajo. No muta habilidades empaquetadas, de complementos, ClawHub, raíz adicional, administradas, de agente personal o del sistema.

## Cómo funciona

- **Primero la propuesta:** el contenido de la habilidad generada se almacena como `PROPOSAL.md`, no como `SKILL.md`.
- **Aplicar es la única escritura en vivo:** crear, actualizar y revisar no cambian las habilidades activas.
- **Ámbito del área de trabajo:** las creaciones apuntan a la raíz `skills/` del área de trabajo. Las actualizaciones solo se permiten para habilidades del área de trabajo escribibles.
- **Sin sobrescritura:** la creación falla si la habilidad de destino ya existe.
- **Vinculado por hash:** las propuestas de actualización se vinculan al hash de destino actual y se vuelven obsoletas si la habilidad en vivo cambia antes de aplicar.
- **Controlado por escáner:** aplicar vuelve a ejecutar el escaneo antes de escribir.
- **Recuperable:** aplicar escribe metadatos de reversión antes de cambiar los archivos en vivo.
- **Superficies consistentes:** chat, CLI y Gateway llaman todos al mismo servicio de Skill Workshop.

## Ciclo de vida

```text
create/update -> pending
revise        -> pending
apply         -> applied
reject        -> rejected
quarantine    -> quarantined
target change -> stale
```

Solo las propuestas `pending` pueden ser revisadas, aplicadas, rechazadas o puestas en cuarentena.

## Chat

Pídele al agente la habilidad que deseas. El agente llama a `skill_workshop` y devuelve un id de propuesta.

Crear:

```text
Make a skill called morning-catchup that runs my Monday inbox routine.
```

Actualizar una habilidad existente del área de trabajo:

```text
Update trip-planning to also check seat maps before booking.
```

Iterar sobre una propuesta pendiente:

```text
Show me the morning-catchup proposal.
Revise it to also flag anything marked urgent.
Apply the morning-catchup proposal.
```

De forma predeterminada, `apply`, `reject` y `quarantine` iniciados por el agente muestran un mensaje de aprobación antes de ejecutarse. Establezca `skills.workshop.approvalPolicy` en `"auto"` para omitir el mensaje en entornos confiables.

## CLI

Crear una nueva propuesta de habilidad:

```bash
openclaw skills workshop propose-create \
  --name morning-catchup \
  --description "Daily inbox catch-up: triage, archive, surface, draft, plan" \
  --proposal ./PROPOSAL.md
```

Crear una propuesta de actualización para una habilidad de espacio de trabajo existente:

```bash
openclaw skills workshop propose-update trip-planning --proposal ./PROPOSAL.md
```

Listar e inspeccionar:

```bash
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
```

Revisar antes de la aprobación:

```bash
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
```

Cerrar la propuesta:

```bash
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id> --reason "Duplicate"
openclaw skills workshop quarantine <proposal-id> --reason "Needs security review"
```

## Contenido de la propuesta

Mientras está pendiente, la propuesta se almacena como `PROPOSAL.md` con metadatos
de solo propuesta:

```markdown
---
name: "morning-catchup"
description: "Daily inbox catch-up: triage, archive, surface, draft, plan"
status: proposal
version: "v1"
date: "2026-05-30T00:00:00.000Z"
---
```

Al aplicar, Skill Workshop escribe el archivo `SKILL.md` activo y elimina los campos
de solo propuesta: `status`, propuesta `version` y propuesta `date`.

## Archivos de soporte

Use `--proposal-dir` cuando la habilidad propuesta necesite archivos además de `PROPOSAL.md`:

```bash
openclaw skills workshop propose-create \
  --name weekly-update \
  --description "Friday wrap-up: stats, highlights, next week's top three" \
  --proposal-dir ./weekly-update-proposal
```

El directorio debe contener `PROPOSAL.md`. Los archivos de soporte deben estar en:

- `assets/`
- `examples/`
- `references/`
- `scripts/`
- `templates/`

Skill Workshop escanea, aplica hash y almacena los archivos de soporte con la propuesta. Se
escriben junto al archivo `SKILL.md` activo solo al aplicar.

Las rutas de archivos de soporte rechazadas incluyen rutas absolutas, segmentos de ruta ocultos,
traversal de ruta, rutas superpuestas, archivos ejecutables de directorios de propuestas,
texto no UTF-8, bytes nulos y archivos fuera de las carpetas de soporte estándar.

## Herramienta de agente

El modelo usa `skill_workshop`:

```text
action: create | update | revise | list | inspect | apply | reject | quarantine
```

Los agentes deben usar `skill_workshop` para el trabajo de habilidades generadas. No deben crear
ni cambiar archivos de propuestas a través de `write`, `edit`, `exec`, comandos de shell u
operaciones directas del sistema de archivos.

## Aprobación y autonomía

```json5
{
  skills: {
    workshop: {
      autonomous: {
        enabled: false,
      },
      approvalPolicy: "pending",
      maxPending: 50,
      maxSkillBytes: 40000,
    },
  },
}
```

- `autonomous.enabled`: permite a OpenClaw crear propuestas pendientes a partir de señales
  de conversación duraderas después de turnos exitosos. Predeterminado: `false`.
- `approvalPolicy: "pending"`: requiere un aviso de aprobación antes
  de un `apply`, `reject` o `quarantine` iniciado por el agente.
- `approvalPolicy: "auto"`: omite ese aviso de aprobación. El agente aún debe
  llamar a la acción.
- `maxPending`: limita las propuestas pendientes y en cuarentena por espacio de trabajo.
- `maxSkillBytes`: limita el tamaño del cuerpo de la propuesta. Predeterminado: `40000`.

Las descripciones de las propuestas siempre están limitadas a 160 bytes.

## Métodos de la puerta de enlace

```text
skills.proposals.list
skills.proposals.inspect
skills.proposals.create
skills.proposals.update
skills.proposals.revise
skills.proposals.apply
skills.proposals.reject
skills.proposals.quarantine
```

Los métodos de solo lectura requieren `operator.read`. Los métodos de mutación requieren
`operator.admin`.

## Almacenamiento

```text
<OPENCLAW_STATE_DIR>/skill-workshop/
  proposals.json
  proposals/<proposal-id>/
    proposal.json
    PROPOSAL.md
    rollback.json
    assets/
    examples/
    references/
    scripts/
    templates/
```

Directorio de estado predeterminado: `~/.openclaw`.

- `proposal.json`: registro canónico de la propuesta.
- `proposals.json`: índice de listado rápido, reconstruible desde las carpetas de propuestas.
- `PROPOSAL.md`: propuesta de habilidad pendiente.
- `rollback.json`: metadatos de recuperación escritos antes de que aplicar cambie los archivos en vivo.

## Límites

- Descripción: 160 bytes.
- Cuerpo de la propuesta: `skills.workshop.maxSkillBytes` (predeterminado 40.000).
- Archivos de soporte: 64 por propuesta.
- Tamaño del archivo de soporte: 256 KB cada uno, 2 MB en total.
- Propuestas pendientes y en cuarentena: `skills.workshop.maxPending` por espacio de trabajo
  (predeterminado 50).

## Solución de problemas

| Problema                                       | Resolución                                                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `Skill proposal description is too large`      | Acorte `description` a 160 bytes o menos.                                                            |
| `Skill proposal content is too large`          | Acorte el cuerpo de la propuesta o aumente `skills.workshop.maxSkillBytes`.                          |
| `Target skill changed after proposal creation` | Revise la propuesta con respecto al objetivo actual o cree una nueva propuesta.                      |
| `Proposal scan failed`                         | Inspeccione los hallazgos del escáner y luego revise o ponga en cuarentena la propuesta.             |
| `Support file paths must be under one of...`   | Mueva los archivos de soporte bajo `assets/`, `examples/`, `references/`, `scripts/` o `templates/`. |
| La propuesta no aparece en la lista            | Verifique el espacio de trabajo `--agent` seleccionado y `OPENCLAW_STATE_DIR`.                       |

## Relacionado

- [Habilidades](/es/tools/skills) para el orden de carga, precedencia y visibilidad
- [Creación de habilidades](/es/tools/creating-skills) para conceptos básicos de `SKILL.md`
  escritos a mano
- [Configuración de habilidades](/es/tools/skills-config) para el esquema completo de `skills.workshop`
- [CLI de habilidades](/es/cli/skills) para comandos de `openclaw skills`
