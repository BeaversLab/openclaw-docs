---
summary: "Scripts del repositorio: propósito, alcance y notas de seguridad"
read_when:
  - Running scripts from the repo
  - Adding or changing scripts under ./scripts
title: "Scripts"
---

El directorio `scripts/` contiene scripts auxiliares para flujos de trabajo locales y tareas de operaciones.
Use estos cuando una tarea esté claramente vinculada a un script; de lo contrario, prefiera la CLI.

## Convenciones

- Los scripts son **opcionales**, a menos que se mencionen en la documentación o en las listas de verificación de lanzamiento.
- Prefiera las interfaces de la CLI cuando existan (ejemplo: la supervisión de autenticación usa `openclaw models status --check`).
- Asuma que los scripts son específicos del host; léelos antes de ejecutarlos en una nueva máquina.

## Scripts de supervisión de autenticación

La supervisión de autenticación se trata en [Autenticación](/es/gateway/authentication). Los scripts en `scripts/` son extras opcionales para flujos de trabajo de systemd/Termux en teléfonos.

## Asistente de lectura de GitHub

Use `scripts/gh-read` cuando quiera que `gh` use un token de instalación de GitHub App para llamadas de lectura con ámbito de repositorio, mientras deja el `gh` normal en su inicio de sesión personal para acciones de escritura.

Entorno requerido:

- `OPENCLAW_GH_READ_APP_ID`
- `OPENCLAW_GH_READ_PRIVATE_KEY_FILE`

Entorno opcional:

- `OPENCLAW_GH_READ_INSTALLATION_ID` cuando desee omitir la búsqueda de instalación basada en el repositorio
- `OPENCLAW_GH_READ_PERMISSIONS` como una invalidación separada por comas para el subconjunto de permisos de lectura solicitado

Orden de resolución del repositorio:

- `gh ... -R owner/repo`
- `GH_REPO`
- `git remote origin`

Ejemplos:

- `scripts/gh-read pr view 123`
- `scripts/gh-read run list -R openclaw/openclaw`
- `scripts/gh-read api repos/openclaw/openclaw/pulls/123`

## Al agregar scripts

- Mantenga los scripts enfocados y documentados.
- Agregue una entrada breve en el documento relevante (o cree uno si falta).

## Relacionado

- [Pruebas](/es/help/testing)
- [Pruebas en vivo](/es/help/testing-live)
