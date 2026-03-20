---
summary: "Scripts del repositorio: propósito, alcance y notas de seguridad"
read_when:
  - Ejecutar scripts desde el repositorio
  - Agregar o modificar scripts en ./scripts
title: "Scripts"
---

# Scripts

El directorio `scripts/` contiene scripts de ayuda para flujos de trabajo locales y tareas de operaciones.
Úsalos cuando una tarea esté claramente vinculada a un script; de lo contrario, prefiere la CLI.

## Convenciones

- Los scripts son **opcionales**, a menos que se mencionen en la documentación o en las listas de verificación de lanzamientos.
- Prefiere las interfaces de la CLI cuando existan (ejemplo: la supervisión de autenticación usa `openclaw models status --check`).
- Asume que los scripts son específicos del host; léelos antes de ejecutarlos en una máquina nueva.

## Scripts de supervisión de autenticación

Los scripts de supervisión de autenticación están documentados aquí:
[/automation/auth-monitoring](/es/automation/auth-monitoring)

## Al agregar scripts

- Mantén los scripts enfocados y documentados.
- Agrega una entrada breve en el documento correspondiente (o crea uno si falta).

import es from "/components/footer/es.mdx";

<es />
