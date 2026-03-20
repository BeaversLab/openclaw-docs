---
summary: "Plan de producción para la supervisión fiable de procesos interactivos (PTY + no PTY) con propiedad explícita, ciclo de vida unificado y limpieza determinista"
read_when:
  - Trabajando en la propiedad del ciclo de vida de exec/proceso y su limpieza
  - Depurando el comportamiento de supervisión de PTY y no PTY
owner: "openclaw"
status: "in-progress"
last_updated: "2026-02-15"
title: "Plan de supervisión de PTY y procesos"
---

# Plan de supervisión de PTY y procesos

## 1. Problema y objetivo

Necesitamos un ciclo de vida fiable para la ejecución de comandos de larga duración a través de:

- `exec` ejecuciones en primer plano
- `exec` ejecuciones en segundo plano
- `process` acciones de seguimiento (`poll`, `log`, `send-keys`, `paste`, `submit`, `kill`, `remove`)
- Subprocesos del ejecutor de agentes CLI

El objetivo no es solo soportar PTY. El objetivo es una propiedad predecible, cancelación, tiempo de espera y limpieza sin heurísticas inseguras de coincidencia de procesos.

## 2. Alcance y límites

- Mantenga la implementación interna en `src/process/supervisor`.
- No cree un nuevo paquete para esto.
- Mantenga la compatibilidad del comportamiento actual cuando sea práctico.
- No amplíe el alcance a la reproducción de terminal o la persistencia de sesión estilo tmux.

## 3. Implementado en esta rama

### Línea base del supervisor ya presente

- El módulo supervisor está en su lugar bajo `src/process/supervisor/*`.
- El tiempo de ejecución de exec y el ejecutor CLI ya están enrutados a través del spawn y wait del supervisor.
- La finalización del registro es idempotente.

### Este paso completado

1. Contrato de comando PTY explícito

- `SpawnInput` ahora es una unión discriminada en `src/process/supervisor/types.ts`.
- Las ejecuciones PTY requieren `ptyCommand` en lugar de reutilizar el `argv` genérico.
- El supervisor ya no reconstruye cadenas de comandos PTY a partir de uniones argv en `src/process/supervisor/supervisor.ts`.
- El tiempo de ejecución de exec ahora pasa `ptyCommand` directamente en `src/agents/bash-tools.exec-runtime.ts`.

2. Desacoplamiento de tipos de capa de proceso

- Los tipos de supervisor ya no importan `SessionStdin` de los agentes.
- El contrato de stdin local de proceso vive en `src/process/supervisor/types.ts` (`ManagedRunStdin`).
- Los adaptadores ahora dependen solo de tipos a nivel de proceso:
  - `src/process/supervisor/adapters/child.ts`
  - `src/process/supervisor/adapters/pty.ts`

3. Mejora de la propiedad del ciclo de vida de la herramienta de proceso

- `src/agents/bash-tools.process.ts` ahora solicita la cancelación a través del supervisor primero.
- `process kill/remove` ahora usan la terminación de respaldo del árbol de procesos cuando falla la búsqueda del supervisor.
- `remove` mantiene un comportamiento de eliminación determinista al eliminar las entradas de sesión en ejecución inmediatamente después de que se solicita la terminación.

4. Valores predeterminados del perro guardián de una sola fuente

- Se agregaron valores predeterminados compartidos en `src/agents/cli-watchdog-defaults.ts`.
- `src/agents/cli-backends.ts` consume los valores predeterminados compartidos.
- `src/agents/cli-runner/reliability.ts` consume los mismos valores predeterminados compartidos.

5. Limpieza de asistentes muertos

- Se eliminó la ruta de asistente `killSession` no utilizada de `src/agents/bash-tools.shared.ts`.

6. Pruebas de ruta directa del supervisor agregadas

- Se agregó `src/agents/bash-tools.process.supervisor.test.ts` para cubrir el enrutamiento de eliminación (kill) y eliminación (remove) a través de la cancelación del supervisor.

7. Correcciones de brechas de confiabilidad completadas

- `src/agents/bash-tools.process.ts` ahora recurre a la terminación de procesos a nivel de sistema operativo real cuando falla la búsqueda del supervisor.
- `src/process/supervisor/adapters/child.ts` ahora utiliza semánticas de terminación del árbol de procesos para las rutas de eliminación (kill) predeterminadas de cancelación/tiempo de espera.
- Se agregó una utilidad compartida de árbol de procesos en `src/process/kill-tree.ts`.

8. Cobertura de casos extremos del contrato PTY agregada

- Se agregó `src/process/supervisor/supervisor.pty-command.test.ts` para el reenvío de comandos PTY textual y el rechazo de comandos vacíos.
- Se agregó `src/process/supervisor/adapters/child.test.ts` para el comportamiento de eliminación (kill) del árbol de procesos en la cancelación del adaptador secundario.

## 4. Brechas y decisiones restantes

### Estado de confiabilidad

Las dos brechas de confiabilidad requeridas para este paso ya están cerradas:

- `process kill/remove` ahora tiene un respaldo de terminación de sistema operativo real cuando falla la búsqueda del supervisor.
- cancelación/tiempo de espera del hijo ahora usa semánticas de eliminación (kill) del árbol de procesos para la ruta de eliminación (kill) predeterminada.
- Se agregaron pruebas de regresión para ambos comportamientos.

### Durabilidad y conciliación de inicio

El comportamiento de reinicio ahora se define explícitamente como solo ciclo de vida en memoria.

- `reconcileOrphans()` sigue siendo una no-operación en `src/process/supervisor/supervisor.ts` por diseño.
- Las ejecuciones activas no se recuperan después del reinicio del proceso.
- Este límite es intencional para esta fase de implementación para evitar riesgos de persistencia parcial.

### Seguimientos de mantenibilidad

1. `runExecProcess` en `src/agents/bash-tools.exec-runtime.ts` todavía maneja múltiples responsabilidades y se puede dividir en ayudantes enfocados en un seguimiento.

## 5. Plan de implementación

La fase de implementación para los elementos de fiabilidad y contrato requeridos está completa.

Completado:

- terminación real de respaldo `process kill/remove`
- cancelación del árbol de procesos para la ruta de matanza predeterminada del adaptador secundario
- pruebas de regresión para la ruta de matanza de respaldo y la ruta de matanza del adaptador secundario
- pruebas de casos extremos de comando PTY bajo `ptyCommand` explícito
- límite de reinicio en memoria explícito con `reconcileOrphans()` sin operación por diseño

Seguimiento opcional:

- dividir `runExecProcess` en ayudantes enfocados sin deriva de comportamiento

## 6. Mapa de archivos

### Supervisor de procesos

- `src/process/supervisor/types.ts` actualizado con entrada de generación discriminada y contrato de stdin local de proceso.
- `src/process/supervisor/supervisor.ts` actualizado para usar `ptyCommand` explícito.
- `src/process/supervisor/adapters/child.ts` y `src/process/supervisor/adapters/pty.ts` desacoplados de los tipos de agentes.
- finalización idempotente `src/process/supervisor/registry.ts` sin cambios y retenida.

### Integración de ejecución y procesos

- `src/agents/bash-tools.exec-runtime.ts` actualizado para pasar el comando PTY explícitamente y mantener la ruta de respaldo.
- `src/agents/bash-tools.process.ts` actualizado para cancelar a través del supervisor con terminación de respaldo real del árbol de procesos.
- `src/agents/bash-tools.shared.ts` eliminó la ruta del asistente de muerte directa.

### Fiabilidad de la CLI

- `src/agents/cli-watchdog-defaults.ts` agregado como línea base compartida.
- `src/agents/cli-backends.ts` y `src/agents/cli-runner/reliability.ts` ahora consumen los mismos valores predeterminados.

## 7. Validación ejecutada en esta fase

Pruebas unitarias:

- `pnpm vitest src/process/supervisor/registry.test.ts`
- `pnpm vitest src/process/supervisor/supervisor.test.ts`
- `pnpm vitest src/process/supervisor/supervisor.pty-command.test.ts`
- `pnpm vitest src/process/supervisor/adapters/child.test.ts`
- `pnpm vitest src/agents/cli-backends.test.ts`
- `pnpm vitest src/agents/bash-tools.exec.pty-cleanup.test.ts`
- `pnpm vitest src/agents/bash-tools.process.poll-timeout.test.ts`
- `pnpm vitest src/agents/bash-tools.process.supervisor.test.ts`
- `pnpm vitest src/process/exec.test.ts`

Objetivos E2E:

- `pnpm vitest src/agents/cli-runner.test.ts`
- `pnpm vitest run src/agents/bash-tools.exec.pty-fallback.test.ts src/agents/bash-tools.exec.background-abort.test.ts src/agents/bash-tools.process.send-keys.test.ts`

Nota de verificación de tipos:

- Use `pnpm build` (y `pnpm check` para la puerta completa de lint/docs) en este repositorio. Las notas antiguas que mencionan `pnpm tsgo` están obsoletas.

## 8. Garantías operativas conservadas

- El comportamiento de endurecimiento del entorno de ejecución no ha cambiado.
- El flujo de aprobación y lista blanca no ha cambiado.
- La desinfección de la salida y los límites de salida no han cambiado.
- El adaptador PTY todavía garantiza el asentamiento de la espera al forzar la eliminación y la disposición del escucha.

## 9. Definición de terminado

1. El Supervisor es el propietario del ciclo de vida para las ejecuciones administradas.
2. El generador de PTY utiliza un contrato de comando explícito sin reconstrucción de argv.
3. La capa de proceso no tiene dependencia de tipo en la capa de agente para los contratos stdin del supervisor.
4. Los valores predeterminados del perro guardián son de una sola fuente.
5. Las pruebas unitarias y de un extremo a otro específicas permanecen en verde.
6. El límite de durabilidad del reinicio está documentado explícitamente o completamente implementado.

## 10. Resumen

La rama ahora tiene una forma de supervisión coherente y más segura:

- contrato PTY explícito
- capas de proceso más limpias
- ruta de cancelación impulsada por supervisor para operaciones de proceso
- terminación de respaldo real cuando falla la búsqueda del supervisor
- cancelación del árbol de procesos para rutas de eliminación predeterminadas de ejecución secundaria
- valores predeterminados unificados del perro guardián
- límite de reinicio explícito en memoria (sin conciliación de huérfanos a través del reinicio en este paso)

import es from "/components/footer/es.mdx";

<es />
