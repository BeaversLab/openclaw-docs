---
summary: "Modos de permiso para la ejecución en el host, aprobaciones de Codex Guardian y sesiones de arnés ACPX"
read_when:
  - Choosing auto, ask, allowlist, full, or deny for command permissions
  - Configuring Codex Guardian-reviewed approvals through tools.exec.mode
  - Comparing OpenClaw exec approvals with ACPX harness permissions
title: "Modos de permiso"
---

Los modos de permiso deciden cuánta autoridad tiene un agente antes de que pueda ejecutar comandos del host, escribir archivos o pedir a un arnés de backend acceso adicional. Comience con `tools.exec.mode: "auto"` cuando desee que OpenClaw use listas de permitidos primero, y luego la revisión automática nativa de Codex o una ruta de aprobación humana para las omisiones.

<Note>El modo de permiso es separado de `tools.exec.host=auto`. `tools.exec.host` elige dónde se ejecuta un comando. `tools.exec.mode` elige cómo se aprueba la ejecución del host.</Note>

## Predeterminado recomendado

Use `auto` para agentes de codificación que necesitan acceso útil al host sin convertir cada omisión en un aviso humano:

```bash
openclaw config set tools.exec.mode auto
openclaw approvals get
openclaw gateway restart
```

Luego verifique la política efectiva:

```bash
openclaw exec-policy show
```

En el modo `auto`, OpenClaw ejecuta coincidencias deterministas de listas de permitidos directamente. Las omisiones de aprobación pasan primero por el revisor automático nativo de OpenClaw y luego recurren a la ruta de aprobación humana configurada cuando es necesario.

## Modos de ejecución del host de OpenClaw

`tools.exec.mode` es la superficie de política normalizada para el host `exec`.

| Modo        | Comportamiento                                                                     | Usar cuando                                                          |
| ----------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `deny`      | Bloquear ejecución del host.                                                       | No se permiten comandos del host.                                    |
| `allowlist` | Ejecutar solo comandos en la lista de permitidos.                                  | Tiene un conjunto de comandos conocido como seguro.                  |
| `ask`       | Ejecutar coincidencias de la lista de permitidos y preguntar en las omisiones.     | Un humano debe revisar los nuevos comandos.                          |
| `auto`      | Ejecutar coincidencias de la lista de permitidos y luego usar revisión automática. | Las sesiones de codificación necesitan acceso práctico supervisado.  |
| `full`      | Ejecutar comandos del host sin avisos.                                             | Este host/sesión de confianza debe omitir los puertas de aprobación. |

Para obtener la política completa de ejecución del host, archivo de aprobaciones locales, esquema de lista de permitidos, bins seguros y comportamiento de reenvío, consulte [Aprobaciones de ejecución](/es/tools/exec-approvals).

## Asignación de Codex Guardian

Para las sesiones nativas del servidor de aplicaciones de Codex, `tools.exec.mode: "auto"` se asigna a aprobaciones revisadas por Codex Guardian cuando los requisitos locales de Codex lo permiten. OpenClaw generalmente envía:

| Campo de Codex      | Valor típico      |
| ------------------- | ----------------- |
| `approvalPolicy`    | `on-request`      |
| `approvalsReviewer` | `auto_review`     |
| `sandbox`           | `workspace-write` |

En el modo `auto`, OpenClaw no conserva las anulaciones heredadas inseguras de Codex como `approvalPolicy: "never"` o `sandbox: "danger-full-access"`. Use `tools.exec.mode: "full"` solo cuando intencionalmente desee la postura sin aprobación.

Para la configuración del servidor de aplicaciones, el orden de autenticación y los detalles de tiempo de ejecución nativos de Codex, consulte [Codex harness](/es/plugins/codex-harness).

## Permisos del harness ACPX

Las sesiones de ACPX no son interactivas, por lo que no pueden hacer clic en un aviso de permiso TTY. ACPX utiliza configuraciones separadas a nivel de harness bajo `plugins.entries.acpx.config`:

| Configuración               | Valor común     | Significado                                      |
| --------------------------- | --------------- | ------------------------------------------------ |
| `permissionMode`            | `approve-reads` | Autoaprobar solo lecturas.                       |
| `permissionMode`            | `approve-all`   | Autoaprobar escrituras y comandos de shell.      |
| `permissionMode`            | `deny-all`      | Denegar todos los avisos de permiso.             |
| `nonInteractivePermissions` | `fail`          | Abortar cuando se requiera un aviso.             |
| `nonInteractivePermissions` | `deny`          | Denegar el aviso y continuar cuando sea posible. |

Configure los permisos de ACPX por separado de las aprobaciones de ejecución de OpenClaw:

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
openclaw gateway restart
```

Use `approve-all` como el equivalente de romper el cristal (break-glass) de ACPX para una sesión de harness sin aviso. Para obtener detalles de configuración y modos de falla, consulte [ACP agents setup](/es/tools/acp-agents-setup#permission-configuration).

## Elegir un modo

| Objetivo                                                                 | Configurar                                                                   |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Bloquear completamente los comandos del host                             | `tools.exec.mode: "deny"`                                                    |
| Permitir ejecutar solo comandos conocidos como seguros                   | `tools.exec.mode: "allowlist"`                                               |
| Preguntar a un humano por cada nueva forma de comando                    | `tools.exec.mode: "ask"`                                                     |
| Usar la autorrevisión automática de Codex/OpenClaw antes que los humanos | `tools.exec.mode: "auto"`                                                    |
| Omitir completamente las aprobaciones de ejecución del host              | `tools.exec.mode: "full"` más un archivo de aprobaciones de host coincidente |
| Hacer que las sesiones ACPX no interactivas escriban/ejecuten            | `plugins.entries.acpx.config.permissionMode: "approve-all"`                  |

Si un comando aún solicita permiso o falla después de cambiar el modo, inspeccione ambas capas:

```bash
openclaw approvals get
openclaw exec-policy show
```

La ejecución del host utiliza el resultado más estricto de la configuración de OpenClaw y el archivo de aprobaciones locales del host. Los permisos del arnés ACPX no relajan las aprobaciones de ejecución del host, y las aprobaciones de ejecución del host no relajan las solicitudes del arnés ACPX.

## Relacionado

- [Aprobaciones de ejecución](/es/tools/exec-approvals)
- [Aprobaciones de ejecución - avanzado](/es/tools/exec-approvals-advanced)
- [Arnés Codex](/es/plugins/codex-harness)
- [Configuración de agentes ACP](/es/tools/acp-agents-setup#permission-configuration)
