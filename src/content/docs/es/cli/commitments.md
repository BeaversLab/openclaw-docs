---
summary: "Referencia de CLI para `openclaw commitments` (inspeccionar y descartar seguimientos inferidos)"
read_when:
  - You want to inspect inferred follow-up commitments
  - You want to dismiss pending check-ins
  - You are auditing what heartbeat may deliver
title: "`openclaw commitments`"
---

Lista y gestiona los compromisos de seguimiento inferidos.

Los compromisos son memorias de seguimiento optativas y de corta duración creadas a partir
del contexto de la conversación. Consulte [Compromisos inferidos](/es/concepts/commitments) para obtener la
guía conceptual.

Sin ningún subcomando, `openclaw commitments` enumera los compromisos pendientes.

## Uso

```bash
openclaw commitments [--all] [--agent <id>] [--status <status>] [--json]
openclaw commitments list [--all] [--agent <id>] [--status <status>] [--json]
openclaw commitments dismiss <id...> [--json]
```

## Opciones

- `--all`: muestra todos los estados en lugar de solo los compromisos pendientes.
- `--agent <id>`: filtra por un id de agente.
- `--status <status>`: filtra por estado. Valores: `pending`, `sent`,
  `dismissed`, `snoozed` o `expired`.
- `--json`: salida JSON legible por máquina.

## Ejemplos

Listar compromisos pendientes:

```bash
openclaw commitments
```

Listar todos los compromisos almacenados:

```bash
openclaw commitments --all
```

Filtrar por un agente:

```bash
openclaw commitments --agent main
```

Buscar compromisos pospuestos:

```bash
openclaw commitments --status snoozed
```

Descartar uno o más compromisos:

```bash
openclaw commitments dismiss cm_abc123 cm_def456
```

Exportar como JSON:

```bash
openclaw commitments --all --json
```

## Salida

La salida de texto incluye:

- id del compromiso
- estado
- tipo
- fecha de vencimiento más temprana
- alcance
- texto sugerido de seguimiento

La salida JSON también incluye la ruta del almacén de compromisos y los registros completos almacenados.

## Relacionado

- [Compromisos inferidos](/es/concepts/commitments)
- [Resumen de memoria](/es/concepts/memory)
- [Latido (Heartbeat)](/es/gateway/heartbeat)
- [Tareas programadas](/es/automation/cron-jobs)
