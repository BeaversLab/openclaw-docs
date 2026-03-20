---
summary: "Lógica de estado de la barra de menús y lo que se muestra a los usuarios"
read_when:
  - Ajustar la interfaz de usuario del menú de Mac o la lógica de estado
title: "Barra de menús"
---

# Lógica de estado de la barra de menús

## Qué se muestra

- Mostramos el estado de trabajo actual del agente en el icono de la barra de menús y en la primera fila de estado del menú.
- El estado de salud se oculta mientras hay trabajo activo; vuelve a aparecer cuando todas las sesiones están inactivas.
- El bloque “Nodos” en el menú lista solo **dispositivos** (nodos vinculados mediante `node.list`), no entradas de cliente/presencia.
- Aparece una sección “Usage” (Uso) debajo de Contexto cuando hay instantáneas de uso del proveedor disponibles.

## Modelo de estado

- Sesiones: los eventos llegan con `runId` (por ejecución) más `sessionKey` en el payload. La sesión “principal” es la clave `main`; si está ausente, recurrimos a la sesión actualizada más recientemente.
- Prioridad: la principal siempre gana. Si la principal está activa, su estado se muestra inmediatamente. Si la principal está inactiva, se muestra la sesión no principal activa más reciente. No cambiamos de un lado a otro a mitad de la actividad; solo cambiamos cuando la sesión actual pasa a inactiva o la principal se vuelve activa.
- Tipos de actividad:
  - `job`: ejecución de comandos de alto nivel (`state: started|streaming|done|error`).
  - `tool`: `phase: start|result` con `toolName` y `meta/args`.

## Enum IconState (Swift)

- `idle`
- `workingMain(ActivityKind)`
- `workingOther(ActivityKind)`
- `overridden(ActivityKind)` (anulación de depuración)

### ActivityKind → glifo

- `exec` → 💻
- `read` → 📄
- `write` → ✍️
- `edit` → 📝
- `attach` → 📎
- predeterminado → 🛠️

### Mapeo visual

- `idle`: criatura normal.
- `workingMain`: insignia con glifo, tinte completo, animación de pata “trabajando”.
- `workingOther`: insignia con glifo, tinte silenciado, sin carrera.
- `overridden`: usa el glifo/tinte elegido independientemente de la actividad.

## Texto de fila de estado (menú)

- Mientras el trabajo está activo: `<Session role> · <activity label>`
  - Ejemplos: `Main · exec: pnpm test`, `Other · read: apps/macos/Sources/OpenClaw/AppState.swift`.
- Cuando está inactivo: vuelve al resumen de estado.

## Ingestión de eventos

- Fuente: eventos `agent` del canal de control (`ControlChannel.handleAgentEvent`).
- Campos analizados:
  - `stream: "job"` con `data.state` para iniciar/detener.
  - `stream: "tool"` con `data.phase`, `name`, `meta`/`args` opcionales.
- Etiquetas:
  - `exec`: primera línea de `args.command`.
  - `read`/`write`: ruta acortada.
  - `edit`: ruta más tipo de cambio inferido de `meta`/conteos de diferencias.
  - alternativo (fallback): nombre de la herramienta.

## Anulación de depuración

- Configuración ▸ Depuración ▸ Selector "Icon override":
  - `System (auto)` (predeterminado)
  - `Working: main` (por tipo de herramienta)
  - `Working: other` (por tipo de herramienta)
  - `Idle`
- Almacenado mediante `@AppStorage("iconOverride")`; asignado a `IconState.overridden`.

## Lista de comprobación de pruebas

- Activar tarea de sesión principal: verificar que el icono cambie inmediatamente y que la fila de estado muestre la etiqueta principal.
- Activar tarea de sesión no principal mientras la principal está inactiva: el icono/estado muestra la no principal; se mantiene estable hasta que finaliza.
- Iniciar la principal mientras otra está activa: el icono cambia instantáneamente a la principal.
- Ráfagas rápidas de herramientas: asegurar que la insignia no parpadee (gracia TTL en los resultados de herramientas).
- La fila de estado (Health) vuelve a aparecer una vez que todas las sesiones están inactivas.

import en from "/components/footer/en.mdx";

<en />
