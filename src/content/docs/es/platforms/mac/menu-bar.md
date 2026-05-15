---
summary: "Lógica de estado de la barra de menús y lo que se muestra a los usuarios"
read_when:
  - Tweaking mac menu UI or status logic
title: "Barra de menú"
---

## Qué se muestra

- Mostramos el estado de trabajo actual del agente en el icono de la barra de menú y en la primera fila de estado del menú.
- El estado de salud se oculta mientras hay trabajo activo; reaparece cuando todas las sesiones están inactivas.
- Un submenú raíz de "Contexto" contiene las sesiones recientes en lugar de expandirlas directamente en el menú raíz.
- El bloque "Nodos" en el menú raíz enumera solo **dispositivos** (nodos emparejados a través de `node.list`), no entradas de cliente/presencia.
- Una sección raíz de "Uso" aparece debajo de Contexto cuando hay instantáneas de uso del proveedor disponibles, seguida de detalles de costos de uso cuando están disponibles.

## Modelo de estado

- Sesiones: los eventos llegan con `runId` (por ejecución) más `sessionKey` en el payload. La sesión "principal" es la clave `main`; si está ausente, recurrimos a la sesión actualizada más recientemente.
- Prioridad: main siempre gana. Si main está activo, su estado se muestra inmediatamente. Si main está inactivo, se muestra la sesión no main activa más recientemente. No alternamos a mitad de la actividad; solo cambiamos cuando la sesión actual pasa a inactiva o main se vuelve activo.
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
- `workingMain`: distintivo con glifo, tinte completo, pierna "trabajando" animación.
- `workingOther`: insignia con glifo, tinte silenciado, sin movimiento rápido.
- `overridden`: usa el glifo/tinte elegido independientemente de la actividad.

## Submenú Contexto

- El menú raíz muestra una fila "Contexto" con un recuento/estado de sesión y abre un submenú.
- El encabezado del submenú Contexto muestra el recuento de sesiones activas de las últimas 24 horas.
- Cada fila de sesión mantiene su barra de tokens, antigüedad, vista previa, pensamiento/detalles, restablecimiento, compactar y eliminar acciones.
- Los mensajes de carga, desconexión y error de carga de sesión aparecen dentro del submenú Contexto.
- Los detalles de uso y costo de uso del proveedor se mantienen en el nivel raíz debajo de Contexto para que se puedan ver de un vistazo sin abrir el submenú.

## Texto de la fila de estado (menú)

- Mientras hay trabajo activo: `<Session role> · <activity label>`
  - Ejemplos: `Main · exec: pnpm test`, `Other · read: apps/macos/Sources/OpenClaw/AppState.swift`.
- Cuando está inactivo: vuelve al resumen de salud.

## Ingesta de eventos

- Fuente: eventos del canal de control `agent` (`ControlChannel.handleAgentEvent`).
- Campos analizados:
  - `stream: "job"` con `data.state` para iniciar/detener.
  - `stream: "tool"` con `data.phase`, `name`, `meta`/`args` opcionales.
- Etiquetas:
  - `exec`: primera línea de `args.command`.
  - `read`/`write`: ruta abreviada.
  - `edit`: ruta más tipo de cambio inferido de `meta`/recuentos de diferencias.
  - fallback: nombre de la herramienta.

## Anulación de depuración

- Configuración ▸ Depuración ▸ selector "Icon override":
  - `System (auto)` (predeterminado)
  - `Working: main` (por tipo de herramienta)
  - `Working: other` (por tipo de herramienta)
  - `Idle`
- Almacenado mediante `@AppStorage("iconOverride")`; asignado a `IconState.overridden`.

## Lista de verificación de pruebas

- Activar trabajo de sesión principal: verificar que el icono cambie inmediatamente y que la fila de estado muestre la etiqueta principal.
- Activar trabajo de sesión no principal mientras la principal está inactiva: icono/estado muestran no principal; se mantiene estable hasta que termina.
- Iniciar la principal mientras otra está activa: el icono cambia a la principal instantáneamente.
- Ráfagas rápidas de herramientas: asegúrese de que la insignia no parpadee (período de gracia TTL en los resultados de las herramientas).
- La fila de estado de salud vuelve a aparecer una vez que todas las sesiones están inactivas.

## Relacionado

- [Aplicación macOS](/es/platforms/macos)
- [Icono de la barra de menús](/es/platforms/mac/icon)
