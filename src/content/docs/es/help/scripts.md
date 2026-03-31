---
summary: "Scripts del repositorio: propósito, alcance y notas de seguridad"
read_when:
  - Running scripts from the repo
  - Adding or changing scripts under ./scripts
title: "Scripts"
---

# Scripts

El directorio `scripts/` contiene scripts auxiliares para flujos de trabajo locales y tareas de operaciones.
Úselos cuando una tarea esté claramente vinculada a un script; de lo contrario, prefiera la CLI.

## Convenciones

- Los scripts son **opcionales**, a menos que se mencionen en la documentación o en las listas de verificación de lanzamiento.
- Prefiera las interfaces de la CLI cuando existan (ejemplo: la supervisión de autenticación usa `openclaw models status --check`).
- Suponga que los scripts son específicos del host; léalos antes de ejecutarlos en una máquina nueva.

## Scripts de supervisión de autenticación

Los scripts de supervisión de autenticación están documentados aquí:
[/automation/auth-monitoring](/en/automation/auth-monitoring)

## Al agregar scripts

- Mantenga los scripts enfocados y documentados.
- Agregue una entrada breve en el documento relevante (o cree uno si falta).
