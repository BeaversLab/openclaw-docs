---
summary: "Referencia de la CLI para `openclaw system` (eventos del sistema, latido, presencia)"
read_when:
  - Deseas poner en cola un evento del sistema sin crear un trabajo cron
  - Necesitas habilitar o deshabilitar los latidos
  - Deseas inspeccionar las entradas de presencia del sistema
title: "system"
---

# `openclaw system`

Auxiliares de nivel de sistema para la Gateway: poner en cola eventos del sistema, controlar latidos,
y ver presencia.

## Comandos comunes

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

Pone en cola un evento del sistema en la sesión **main**. El próximo latido lo inyectará
como una línea `System:` en el prompt. Usa `--mode now` para activar el latido
inmediatamente; `next-heartbeat` espera el siguiente ciclo programado.

Opciones:

- `--text <text>`: texto del evento del sistema requerido.
- `--mode <mode>`: `now` o `next-heartbeat` (por defecto).
- `--json`: salida legible por máquina.

## `system heartbeat last|enable|disable`

Controles de latido:

- `last`: mostrar el último evento de latido.
- `enable`: volver a activar los latidos (usa esto si se deshabilitaron).
- `disable`: pausar los latidos.

Opciones:

- `--json`: salida legible por máquina.

## `system presence`

Lista las entradas de presencia del sistema actuales que la Gateway conoce (nodos,
instancias y líneas de estado similares).

Opciones:

- `--json`: salida legible por máquina.

## Notas

- Requiere una Gateway en ejecución accesible por tu configuración actual (local o remota).
- Los eventos del sistema son efímeros y no se conservan entre reinicios.

import es from "/components/footer/es.mdx";

<es />
