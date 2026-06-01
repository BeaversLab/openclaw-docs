---
summary: "Plantilla de espacio de trabajo para HEARTBEAT.md"
title: "Plantilla HEARTBEAT.md"
read_when:
  - Bootstrapping a workspace manually
---

# Plantilla de HEARTBEAT.md

`HEARTBEAT.md` se encuentra en el espacio de trabajo del agente. Mantenga el archivo vacío o solo con comentarios y encabezados de Markdown cuando desee que OpenClaw omita las llamadas al modelo de latido.

La plantilla de tiempo de ejecución predeterminada es:

```markdown
# Keep this file empty (or with only comments) to skip heartbeat API calls.

# Add tasks below when you want the agent to check something periodically.
```

Añada tareas breves debajo de los comentarios solo cuando desee que el agente verifique algo periódicamente. Mantenga las instrucciones de latido breves porque se leen durante los despertares recurrentes.

## Relacionado

- [Configuración de latido](/es/gateway/config-agents)
