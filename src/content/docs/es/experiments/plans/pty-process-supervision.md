---
summary: "Plan de producción para la supervisión confiable de procesos interactivos (PTY + no PTY) con propiedad explícita, ciclo de vida unificado y limpieza determinista"
read_when:
  - Working on exec/process lifecycle ownership and cleanup
  - Debugging PTY and non-PTY supervision behavior
owner: "openclaw"
status: "en curso"
last_updated: "2026-02-15"
title: "Plan de supervisión de PTY y procesos"
---

# Plan de supervisión de PTY y procesos

## 1. Problema y objetivo

Necesitamos un ciclo de vida confiable para la ejecución de comandos de larga duración a través de:

- `exec` ejecuciones en primer plano
- `exec` ejecuciones en segundo plano
- `process` acciones de seguimiento (`poll`, `log`, `send-keys`, `paste`, `submit`, `kill`, `remove`)
- Subprocesos del ejecutor del agente CLI

El objetivo no es solo soportar PTY. El objetivo es una propiedad predecible, cancelación, tiempo de espera y limpieza sin heurísticas de coincidencia de procesos inseguras.

## 2. Alcance y límites

- Mantener la implementación interna en `src/process/supervisor`.
- No crear un paquete nuevo para esto.
- Mantener la compatibilidad del comportamiento actual cuando sea práctico.
- No ampliar el alcance a la repetición de terminal o a la persistencia de sesiones estilo tmux.

## 3. Implementado en esta rama

### Línea base del supervisor ya presente

- El módulo supervisor está en su lugar bajo `src/process/supervisor/*`.
- El tiempo de ejecución de exec y el ejecutor CLI ya están enrutados a través del spawn y wait del supervisor.
- La finalización del registro es idempotente.

### Este paso completado

1. Contrato explícito de comandos PTY

- `SpawnInput` ahora es una unión discriminada en `src/process/supervisor/types.ts`.
- Las ejecuciones PTY requieren `ptyCommand` en lugar de reutilizar el genérico `argv`.
- El supervisor ya no reconstruye cadenas de comandos PTY a partir de uniones de argv en `src/process/supervisor/supervisor.ts`.
- El tiempo de ejecución de exec ahora pasa `ptyCommand` directamente en `src/agents/bash-tools.exec-runtime.ts`.

2. Desacoplamiento de tipos de capa de procesos

- Los tipos de Supervisor ya no importan `SessionStdin` de los agentes.
- El contrato stdin local del proceso reside en `src/process/supervisor/types.ts` (`ManagedRunStdin`).
- Los adaptadores ahora dependen solo de los tipos a nivel de proceso:
  - `src/process/supervisor/adapters/child.ts`
  - `src/process/supervisor/adapters/pty.ts`

3. Mejora de la propiedad del ciclo de vida de la herramienta de proceso

- `src/agents/bash-tools.process.ts` ahora solicita la cancelación a través del supervisor primero.
- `process kill/remove` ahora usa la terminación de reserva del árbol de procesos cuando falla la búsqueda del supervisor.
- `remove` mantiene un comportamiento de eliminación determinista al eliminar las entradas de sesión en ejecución inmediatamente después de que se solicita la terminación.

4. Valores predeterminados de watchdog de una sola fuente

- Se agregaron valores predeterminados compartidos en `src/agents/cli-watchdog-defaults.ts`.
- `src/agents/cli-backends.ts` consume los valores predeterminados compartidos.
- `src/agents/cli-runner/reliability.ts` consume los mismos valores predeterminados compartidos.

5. Limpieza de auxiliares muertos

- Se eliminó la ruta auxiliar `killSession` no utilizada de `src/agents/bash-tools.shared.ts`.

6. Pruebas de ruta directa del supervisor agregadas

- Se agregó `src/agents/bash-tools.process.supervisor.test.ts` para cubrir el enrutamiento de eliminación y eliminación a través de la cancelación del supervisor.

7. Correcciones de brechas de confiabilidad completadas

- `src/agents/bash-tools.process.ts` ahora recurre a la terminación de procesos a nivel de sistema operativo real cuando falla la búsqueda del supervisor.
- `src/process/supervisor/adapters/child.ts` ahora utiliza la semántica de terminación del árbol de procesos para las rutas de eliminación predeterminadas de cancelación/tiempo de espera.
- Se agregó una utilidad compartida de árbol de procesos en `src/process/kill-tree.ts`.

8. Cobertura de casos límite del contrato PTY agregada

- Se agregó `src/process/supervisor/supervisor.pty-command.test.ts` para el reenvío de comandos PTY verbatim y el rechazo de comandos vacíos.
- Se agregó `src/process/supervisor/adapters/child.test.ts` para el comportamiento de eliminación del árbol de procesos en la cancelación del adaptador secundario.

## 4. Brechas y decisiones restantes

### Estado de confiabilidad

Las dos brechas de confiabilidad requeridas para este paso ahora están cerradas:

- `process kill/remove` ahora tiene una reserva de terminación del sistema operativo real cuando falla la búsqueda del supervisor.
- la cancelación/tiempo de espera del hijo ahora utiliza la semántica de eliminación del árbol de procesos para la ruta de eliminación predeterminada.
- Se agregaron pruebas de regresión para ambos comportamientos.

### Durabilidad y conciliación de inicio

El comportamiento de reinicio ahora se define explícitamente como solo ciclo de vida en memoria.

- `reconcileOrphans()` sigue siendo una operación nula en `src/process/supervisor/supervisor.ts` por diseño.
- Las ejecuciones activas no se recuperan después del reinicio del proceso.
- Este límite es intencional para esta fase de implementación para evitar riesgos de persistencia parcial.

### Seguimientos de mantenimiento

1. `runExecProcess` en `src/agents/bash-tools.exec-runtime.ts` todavía maneja múltiples responsabilidades y puede dividirse en ayudantes enfocados en un seguimiento.

## 5. Plan de implementación

La fase de implementación para los elementos de confiabilidad y contrato requeridos está completa.

Completado:

- terminación real de reserva `process kill/remove`
- cancelación del árbol de procesos para la ruta de terminación predeterminada del adaptador secundario
- pruebas de regresión para la terminación de reserva y la ruta de terminación del adaptador secundario
- pruebas de casos extremos de comando PTY bajo `ptyCommand` explícito
- límite de reinicio en memoria explícito con `reconcileOrphans()` operación nula por diseño

Seguimiento opcional:

- dividir `runExecProcess` en ayudantes enfocados sin cambios de comportamiento

## 6. Mapa de archivos

### Supervisor de procesos

- `src/process/supervisor/types.ts` actualizado con entrada de generación discriminada y contrato stdin local del proceso.
- `src/process/supervisor/supervisor.ts` actualizado para usar `ptyCommand` explícito.
- `src/process/supervisor/adapters/child.ts` y `src/process/supervisor/adapters/pty.ts` desacoplados de los tipos de agente.
- finalización idempotente `src/process/supervisor/registry.ts` sin cambios y conservada.

### Integración de ejecución y procesos

- `src/agents/bash-tools.exec-runtime.ts` actualizado para pasar el comando PTY explícitamente y mantener la ruta de reserva.
- `src/agents/bash-tools.process.ts` actualizado para cancelar a través del supervisor con terminación de reserva del árbol de procesos real.
- `src/agents/bash-tools.shared.ts` eliminó la ruta del ayudante de terminación directa.

### Confiabilidad de la CLI

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

Nota sobre Typecheck:

- Use `pnpm build` (y `pnpm check` para la puerta completa de lint/docs) en este repositorio. Las notas antiguas que mencionan `pnpm tsgo` están obsoletas.

## 8. Garantías operativas conservadas

- El comportamiento de endurecimiento del entorno de ejecución no ha cambiado.
- El flujo de aprobación y lista de permitidos no ha cambiado.
- La sanitización de salida y los límites de salida no han cambiado.
- El adaptador PTY todavía garantiza el establecimiento de espera en la terminación forzada y la eliminación del escucha.

## 9. Definición de terminado

1. El supervisor es el propietario del ciclo de vida para las ejecuciones gestionadas.
2. El inicio de PTY utiliza un contrato de comando explícito sin reconstrucción de argv.
3. La capa de proceso no tiene dependencia de tipo en la capa de agente para los contratos stdin del supervisor.
4. Los valores predeterminados del perro guardián son de fuente única.
5. Las pruebas unitarias y e2e específicas siguen pasando (en verde).
6. El límite de durabilidad del reinicio está explícitamente documentado o completamente implementado.

## 10. Resumen

La rama ahora tiene una forma de supervisión coherente y más segura:

- contrato PTY explícito
- capas de proceso más limpias
- ruta de cancelación impulsada por el supervisor para las operaciones de proceso
- terminación alternativa real cuando falla la búsqueda del supervisor
- cancelación del árbol de procesos para las rutas de terminación predeterminadas de ejecución secundaria
- valores predeterminados unificados del perro guardián
- límite de reinicio explícito en memoria (sin conciliación de huérfanos a través del reinicio en este paso)
