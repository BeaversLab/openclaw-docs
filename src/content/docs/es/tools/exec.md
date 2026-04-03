---
summary: "Uso de la herramienta Exec, modos stdin y compatibilidad con TTY"
read_when:
  - Using or modifying the exec tool
  - Debugging stdin or TTY behavior
title: "Herramienta Exec"
---

# Herramienta Exec

Ejecuta comandos de shell en el espacio de trabajo. Admite la ejecución en primer plano y en segundo plano a través de `process`.
Si `process` no está permitido, `exec` se ejecuta de forma síncrona e ignora `yieldMs`/`background`.
Las sesiones en segundo plano tienen un ámbito por agente; `process` solo ve las sesiones del mismo agente.

## Parámetros

- `command` (obligatorio)
- `workdir` (el valor predeterminado es cwd)
- `env` (anulaciones de clave/valor)
- `yieldMs` (predeterminado 10000): pasar automáticamente a segundo plano después de un retraso
- `background` (bool): pasar inmediatamente a segundo plano
- `timeout` (segundos, predeterminado 1800): matar al expirar
- `pty` (bool): ejecutar en una pseudoterminal cuando esté disponible (interfaces de línea de comandos solo TTY, agentes de codificación, interfaces de usuario de terminal)
- `host` (`auto | sandbox | gateway | node`): dónde ejecutar
- `security` (`deny | allowlist | full`): modo de aplicación para `gateway`/`node`
- `ask` (`off | on-miss | always`): indicaciones de aprobación para `gateway`/`node`
- `node` (cadena): identificador/nombre del nodo para `host=node`
- `elevated` (bool): solicitar modo elevado (host de puerta de enlace); `security=full` solo se fuerza cuando elevado se resuelve como `full`

Notas:

- `host` es `auto` de manera predeterminada: sandbox cuando el tiempo de ejecución de sandbox está activo para la sesión, de lo contrario, gateway.
- `elevated` fuerza `host=gateway`; solo está disponible cuando el acceso elevado está habilitado para la sesión/proveedor actual.
- Las aprobaciones de `gateway`/`node` están controladas por `~/.openclaw/exec-approvals.json`.
- `node` requiere un nodo emparejado (aplicación complementaria o host de nodo sin interfaz).
- Si hay varios nodos disponibles, configure `exec.node` o `tools.exec.node` para seleccionar uno.
- `exec host=node` es la única ruta de ejecución de shell para los nodos; se ha eliminado el contenedor heredado `nodes.run`.
- En hosts que no son Windows, exec usa `SHELL` cuando está configurado; si `SHELL` es `fish`, prefiere `bash` (o `sh`)
  de `PATH` para evitar scripts incompatibles con fish, luego recurre a `SHELL` si ninguno existe.
- En hosts Windows, exec prefiere el descubrimiento de PowerShell 7 (`pwsh`) (Archivos de programa, ProgramW6432, luego PATH),
  luego recurre a Windows PowerShell 5.1.
- La ejecución en el host (`gateway`/`node`) rechaza `env.PATH` y las anulaciones del cargador (`LD_*`/`DYLD_*`) para
  evitar el secuestro de binarios o código inyectado.
- OpenClaw establece `OPENCLAW_SHELL=exec` en el entorno de comandos generado (incluida la ejecución PTY y sandbox) para que las reglas de shell/perfil puedan detectar el contexto de la herramienta exec.
- Importante: el sandboxing está **desactivado de forma predeterminada**. Si el sandboxing está desactivado, el `host=auto`
  implícito se resuelve en `gateway`. El `host=sandbox` explícito aún falla de forma cerrada en lugar de ejecutarse silenciosamente
  en el host de la puerta de enlace. Habilite el sandboxing o use `host=gateway` con aprobaciones.
- Las verificaciones previas de script (para errores comunes de sintaxis de shell de Python/Node) solo inspeccionan archivos dentro del
  límite efectivo de `workdir`. Si una ruta de script se resuelve fuera de `workdir`, se omite la verificación previa para
  ese archivo.

## Configuración

- `tools.exec.notifyOnExit` (predeterminado: true): cuando es true, las sesiones de ejecución en segundo plano ponen en cola un evento del sistema y solicitan un latido al salir.
- `tools.exec.approvalRunningNoticeMs` (predeterminado: 10000): emite un único aviso de "en ejecución" cuando una exec con aprobación se ejecuta más tiempo que esto (0 lo desactiva).
- `tools.exec.host` (predeterminado: `auto`; se resuelve a `sandbox` cuando el tiempo de ejecución de sandbox está activo, `gateway` en caso contrario)
- `tools.exec.security` (predeterminado: `deny` para sandbox, `allowlist` para gateway + nodo cuando no está configurado)
- `tools.exec.ask` (predeterminado: `on-miss`)
- `tools.exec.node` (predeterminado: sin configurar)
- `tools.exec.strictInlineEval` (predeterminado: false): cuando es true, los formularios de evaluación del intérprete en línea, como `python -c`, `node -e`, `ruby -e`, `perl -e`, `php -r`, `lua -e` y `osascript -e` siempre requieren aprobación explícita. `allow-always` aún puede persistir invocaciones benignas de intérprete/script, pero los formularios de evaluación en línea aún solicitan confirmación cada vez.
- `tools.exec.pathPrepend`: lista de directorios que se anteponen a `PATH` para ejecuciones exec (solo gateway + sandbox).
- `tools.exec.safeBins`: binarios seguros solo de stdin que pueden ejecutarse sin entradas de lista de permitidos explícitas. Para obtener detalles sobre el comportamiento, consulte [Safe bins](/en/tools/exec-approvals#safe-bins-stdin-only).
- `tools.exec.safeBinTrustedDirs`: directorios explícitos adicionales de confianza para comprobaciones de ruta `safeBins`. Las entradas de `PATH` nunca se confían automáticamente. Los valores predeterminados integrados son `/bin` y `/usr/bin`.
- `tools.exec.safeBinProfiles`: política opcional personalizada de argv por contenedor seguro (`minPositional`, `maxPositional`, `allowedValueFlags`, `deniedFlags`).

Ejemplo:

```json5
{
  tools: {
    exec: {
      pathPrepend: ["~/bin", "/opt/oss/bin"],
    },
  },
}
```

### Manejo de PATH

- `host=gateway`: fusiona tu `PATH` de shell de inicio de sesión en el entorno de ejecución. Las anulaciones de `env.PATH` se
  rechazan para la ejecución en el host. El propio demonio aún se ejecuta con un `PATH` mínimo:
  - macOS: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux: `/usr/local/bin`, `/usr/bin`, `/bin`
- `host=sandbox`: ejecuta `sh -lc` (shell de inicio de sesión) dentro del contenedor, por lo que `/etc/profile` puede restablecer `PATH`.
  OpenClaw antepone `env.PATH` después de la obtención del perfil mediante una variable de entorno interna (sin interpolación de shell);
  `tools.exec.pathPrepend` también se aplica aquí.
- `host=node`: solo se envían al nodo las anulaciones de entorno no bloqueadas que pases. Las anulaciones de `env.PATH` se
  rechazan para la ejecución en el host y son ignoradas por los hosts de nodos. Si necesitas entradas PATH adicionales en un nodo,
  configura el entorno del servicio host del nodo (systemd/launchd) o instala herramientas en ubicaciones estándar.

Vinculación de nodo por agente (usa el índice de la lista de agentes en la configuración):

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

Interfaz de usuario de control: la pestaña Nodos incluye un pequeño panel "Vinculación de nodo de ejecución" para la misma configuración.

## Anulaciones de sesión (`/exec`)

Usa `/exec` para establecer valores predeterminados **por sesión** para `host`, `security`, `ask` y `node`.
Envía `/exec` sin argumentos para mostrar los valores actuales.

Ejemplo:

```
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

## Modelo de autorización

`/exec` solo se respeta para **remitentes autorizados** (listas de permisos de canales/emparejamiento más `commands.useAccessGroups`).
Actualiza **solo el estado de la sesión** y no escribe la configuración. Para deshabilitar permanentemente exec, deniéguelo mediante la política de herramientas
(`tools.deny: ["exec"]` o por agente). Las aprobaciones del host todavía se aplican a menos que establezca explícitamente
`security=full` y `ask=off`.

## Aprobaciones de exec (aplicación complementaria / host del nodo)

Los agentes en sandbox pueden requerir aprobación por solicitud antes de que `exec` se ejecute en la puerta de enlace o el host del nodo.
Consulte [Aprobaciones de exec](/en/tools/exec-approvals) para obtener información sobre la política, la lista de permisos y el flujo de la interfaz de usuario.

Cuando se requieren aprobaciones, la herramienta exec regresa inmediatamente con
`status: "approval-pending"` y un ID de aprobación. Una vez aprobada (o denegada / expirada),
la Gateway emite eventos del sistema (`Exec finished` / `Exec denied`). Si el comando todavía se está
ejecutando después de `tools.exec.approvalRunningNoticeMs`, se emite un único aviso `Exec running`.

## Lista de permitidos + bins seguros

La aplicación manual de la lista de permitidos coincide **solo con rutas binarias resueltas** (sin coincidencias de nombre base). Cuando
`security=allowlist`, los comandos de shell se permiten automáticamente solo si cada segmento de canalización está
en la lista de permitidos o es un bin seguro. El encadenamiento (`;`, `&&`, `||`) y las redirecciones se rechazan en
modo de lista de permitidos a menos que cada segmento de nivel superior cumpla con la lista de permitidos (incluyendo bins seguros).
Las redirecciones siguen sin ser compatibles.

`autoAllowSkills` es una ruta de conveniencia separada en las aprobaciones de exec. No es lo mismo que
las entradas manuales de la lista de permitidos de rutas. Para una confianza explícita estricta, mantenga `autoAllowSkills` deshabilitado.

Use los dos controles para diferentes trabajos:

- `tools.exec.safeBins`: filtros de flujo pequeños, solo de stdin.
- `tools.exec.safeBinTrustedDirs`: directorios de confianza adicionales explícitos para rutas ejecutables de bins seguros.
- `tools.exec.safeBinProfiles`: política argv explícita para bins seguros personalizados.
- allowlist: confianza explícita para rutas ejecutables.

No trate `safeBins` como una lista de permisos genérica y no agregue binarios de intérprete/ejecución (por ejemplo `python3`, `node`, `ruby`, `bash`). Si necesita esos, use entradas explícitas en la lista de permisos y mantenga las solicitudes de aprobación habilitadas.
`openclaw security audit` advierte cuando a las entradas de intérprete/ejecución `safeBins` les faltan perfiles explícitos, y `openclaw doctor --fix` puede crear entradas `safeBinProfiles` personalizadas faltantes.
`openclaw security audit` y `openclaw doctor` también advierten cuando agrega explícitamente bins de comportamiento amplio como `jq` nuevamente a `safeBins`.
Si permite explícitamente intérpretes, habilite `tools.exec.strictInlineEval` para que los formularios de evaluación de código en línea sigan requiriendo una aprobación nueva.

Para obtener detalles completos de la política y ejemplos, consulte [Aprobaciones de ejecución](/en/tools/exec-approvals#safe-bins-stdin-only) y [Safe bins versus allowlist](/en/tools/exec-approvals#safe-bins-versus-allowlist).

## Ejemplos

En primer plano:

```json
{ "tool": "exec", "command": "ls -la" }
```

En segundo plano + sondeo:

```json
{"tool":"exec","command":"npm run build","yieldMs":1000}
{"tool":"process","action":"poll","sessionId":"<id>"}
```

Enviar teclas (estilo tmux):

```json
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Enter"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["C-c"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Up","Up","Enter"]}
```

Enviar (enviar solo CR):

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

Pegar (entre corchetes de forma predeterminada):

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## apply_patch

`apply_patch` es una subherramienta de `exec` para ediciones estructuradas de múltiples archivos.
Está habilitada de forma predeterminada para los modelos OpenAI y OpenAI Codex. Use la configuración solo
cuando desee deshabilitarla o restringirla a modelos específicos:

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.2"] },
    },
  },
}
```

Notas:

- Solo disponible para modelos OpenAI/OpenAI Codex.
- La política de herramientas todavía se aplica; `allow: ["write"]` permite implícitamente `apply_patch`.
- La configuración se encuentra bajo `tools.exec.applyPatch`.
- `tools.exec.applyPatch.enabled` es `true` de forma predeterminada; establézcalo en `false` para deshabilitar la herramienta para modelos de OpenAI.
- `tools.exec.applyPatch.workspaceOnly` es `true` (contenido en el espacio de trabajo) de forma predeterminada. Establézcalo en `false` solo si desea intencionalmente que `apply_patch` escriba/elimine fuera del directorio del espacio de trabajo.

## Relacionado

- [Aprobaciones de ejecución](/en/tools/exec-approvals) — puertas de aprobación para comandos de shell
- [Sandboxing](/en/gateway/sandboxing) — ejecución de comandos en entornos con espacio aislado
- [Background Process](/en/gateway/background-process) — herramienta de ejec y de proceso de larga duración
- [Security](/en/gateway/security) — política de herramientas y acceso elevado
