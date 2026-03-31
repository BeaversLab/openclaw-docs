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
- `host` (`sandbox | gateway | node`): dónde ejecutar
- `security` (`deny | allowlist | full`): modo de aplicación para `gateway`/`node`
- `ask` (`off | on-miss | always`): indicaciones de aprobación para `gateway`/`node`
- `node` (cadena): identificador/nombre del nodo para `host=node`
- `elevated` (bool): solicitar modo elevado (host de puerta de enlace); `security=full` solo se fuerza cuando elevado se resuelve como `full`

Notas:

- `host` tiene como valor predeterminado `sandbox`.
- `elevated` se ignora cuando el sandbox está desactivado (exec ya se ejecuta en el host).
- Las aprobaciones de `gateway`/`node` están controladas por `~/.openclaw/exec-approvals.json`.
- `node` requiere un nodo vinculado (aplicación complementaria o host de nodo sin interfaz).
- Si hay varios nodos disponibles, establezca `exec.node` o `tools.exec.node` para seleccionar uno.
- En hosts que no son Windows, exec usa `SHELL` cuando está configurado; si `SHELL` es `fish`, prefiere `bash` (o `sh`)
  de `PATH` para evitar scripts incompatibles con fish, y luego recurre a `SHELL` si ninguno existe.
- En hosts Windows, exec prefiere el descubrimiento de PowerShell 7 (`pwsh`) (Archivos de programa, ProgramW6432, luego PATH),
  y luego recurre a Windows PowerShell 5.1.
- La ejecución en el host (`gateway`/`node`) rechaza `env.PATH` y las anulaciones del cargador (`LD_*`/`DYLD_*`) para
  evitar el secuestro de binarios o código inyectado.
- OpenClaw establece `OPENCLAW_SHELL=exec` en el entorno de comandos generado (incluyendo la ejecución PTY y sandbox) para que las reglas de shell/perfil puedan detectar el contexto de la herramienta exec.
- Importante: el sandbox está **desactivado por defecto**. Si el sandbox está desactivado y `host=sandbox` está configurado/solicitado explícitamente,
  exec ahora falla de forma segura en lugar de ejecutarse silenciosamente en el host de puerta de enlace.
  Active el sandbox o use `host=gateway` con aprobaciones.
- Las comprobaciones previas de scripts (para errores comunes de sintaxis de shell de Python/Node) solo inspeccionan archivos dentro del
  límite efectivo de `workdir`. Si una ruta de script se resuelve fuera de `workdir`, se omite la verificación previa para
  ese archivo.

## Configuración

- `tools.exec.notifyOnExit` (predeterminado: true): cuando es true, las sesiones exec en segundo plano ponen en cola un evento del sistema y solicitan un latido al salir.
- `tools.exec.approvalRunningNoticeMs` (predeterminado: 10000): emite un único aviso de "en ejecución" cuando una exec con aprobación se ejecuta más tiempo que esto (0 lo desactiva).
- `tools.exec.host` (predeterminado: `sandbox`)
- `tools.exec.security` (predeterminado: `deny` para sandbox, `allowlist` para gateway + node cuando no está configurado)
- `tools.exec.ask` (predeterminado: `on-miss`)
- `tools.exec.node` (predeterminado: sin establecer)
- `tools.exec.strictInlineEval` (predeterminado: false): cuando es true, los formularios de evaluación del intérprete en línea, como `python -c`, `node -e`, `ruby -e`, `perl -e`, `php -r`, `lua -e` y `osascript -e` siempre requieren aprobación explícita y nunca son persistidos por `allow-always`.
- `tools.exec.pathPrepend`: lista de directorios que se anteponen a `PATH` para las ejecuciones exec (solo puerta de enlace + zona de pruebas).
- `tools.exec.safeBins`: binarios seguros solo de stdin que pueden ejecutarse sin entradas explícitas en la lista de permitidos. Para obtener detalles sobre el comportamiento, consulte [Safe bins](/en/tools/exec-approvals#safe-bins-stdin-only).
- `tools.exec.safeBinTrustedDirs`: directorios explícitos adicionales de confianza para las comprobaciones de ruta `safeBins`. Las entradas `PATH` nunca son de confianza automática. Los valores predeterminados integrados son `/bin` y `/usr/bin`.
- `tools.exec.safeBinProfiles`: política personalizada opcional de argv por cada binario seguro (`minPositional`, `maxPositional`, `allowedValueFlags`, `deniedFlags`).

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

- `host=gateway`: combina su `PATH` de shell de inicio de sesión en el entorno de ejecución. Las anulaciones `env.PATH` se
  rechazan para la ejecución en el host. El demonio en sí aún se ejecuta con un `PATH` mínimo:
  - macOS: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux: `/usr/local/bin`, `/usr/bin`, `/bin`
- `host=sandbox`: ejecuta `sh -lc` (shell de inicio de sesión) dentro del contenedor, por lo que `/etc/profile` puede restablecer `PATH`.
  OpenClaw antepone `env.PATH` después de obtener el perfil a través de una variable de entorno interna (sin interpolación de shell);
  `tools.exec.pathPrepend` también se aplica aquí.
- `host=node`: solo se envían al nodo las anulaciones de entorno no bloqueadas que pases. Las anulaciones de `env.PATH` son
  rechazadas para la ejecución en el host e ignoradas por los hosts de los nodos. Si necesitas entradas PATH adicionales en un nodo,
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
/exec host=gateway security=allowlist ask=on-miss node=mac-1
```

## Modelo de autorización

`/exec` solo se respeta para **remitentes autorizados** (listas de permitidos del canal/emparejamiento más `commands.useAccessGroups`).
Actualiza **solo el estado de la sesión** y no escribe la configuración. Para deshabilitar permanentemente la ejecución, denégala mediante la política de herramientas
(`tools.deny: ["exec"]` o por agente). Las aprobaciones del host todavía se aplican a menos que establezcas explícitamente
`security=full` y `ask=off`.

## Aprobaciones de ejecución (aplicación complementaria / host del nodo)

Los agentes en sandbox pueden requerir aprobación por solicitud antes de que `exec` se ejecute en la puerta de enlace o en el host del nodo.
Consulte [Exec approvals](/en/tools/exec-approvals) para conocer la política, la lista de permitidos y el flujo de la interfaz de usuario.

Cuando se requieren aprobaciones, la herramienta de ejecución regresa inmediatamente con
`status: "approval-pending"` y un id de aprobación. Una vez aprobada (o denegada / expirada),
la puerta de enlace emite eventos del sistema (`Exec finished` / `Exec denied`). Si el comando todavía se está
ejecutando después de `tools.exec.approvalRunningNoticeMs`, se emite un único aviso `Exec running`.

## Lista de permitidos + bins seguros

La aplicación manual de la lista de permitidos coincide **solo con las rutas binarias resueltas** (no coincidencias de nombre base). Cuando
`security=allowlist`, los comandos de shell se permiten automáticamente solo si cada segmento de la tubería está
en la lista de permitidos o es un binario seguro. El encadenamiento (`;`, `&&`, `||`) y las redirecciones se rechazan en
modo de lista de permitidos a menos que cada segmento de nivel superior satisfaga la lista de permitidos (incluyendo los binarios seguros).
Las redirecciones no son compatibles.

`autoAllowSkills` es una ruta de conveniencia separada en las aprobaciones de ejecución. No es lo mismo que
las entradas manuales de la lista de permitidos de rutas. Para una confianza explícita estricta, mantenga `autoAllowSkills` deshabilitado.

Use los dos controles para diferentes trabajos:

- `tools.exec.safeBins`: filtros de flujo pequeños, solo de stdin.
- `tools.exec.safeBinTrustedDirs`: directorios de confianza adicionales explícitos para rutas ejecutables de binarios seguros.
- `tools.exec.safeBinProfiles`: política argv explícita para binarios seguros personalizados.
- allowlist: confianza explícita para rutas ejecutables.

No trate `safeBins` como una lista de permitidos genérica y no agregue binarios de intérprete/ejecución (por ejemplo `python3`, `node`, `ruby`, `bash`). Si los necesita, use entradas explícitas de la lista de permitidos y mantenga habilitados los avisos de aprobación.
`openclaw security audit` advierte cuando a las entradas de intérprete/ejecución `safeBins` les faltan perfiles explícitos, y `openclaw doctor --fix` puede crear entradas personalizadas `safeBinProfiles` faltantes.
`openclaw security audit` y `openclaw doctor` también advierten cuando agrega explícitamente binarios de comportamiento amplio como `jq` de nuevo a `safeBins`.
Si permite explícitamente intérpretes, habilite `tools.exec.strictInlineEval` para que los formularios de evaluación de código en línea aún requieran una aprobación nueva.

Para obtener detalles completos sobre la política y ejemplos, consulte [Exec approvals](/en/tools/exec-approvals#safe-bins-stdin-only) y [Safe bins versus allowlist](/en/tools/exec-approvals#safe-bins-versus-allowlist).

## Ejemplos

Primer plano:

```json
{ "tool": "exec", "command": "ls -la" }
```

Segundo plano + sondeo:

```json
{"tool":"exec","command":"npm run build","yieldMs":1000}
{"tool":"process","action":"poll","sessionId":"<id>"}
```

Enviar claves (estilo tmux):

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
Está habilitada por defecto para los modelos de OpenAI y OpenAI Codex. Usa la configuración solo
cuando quieras deshabilitarla o restringirla a modelos específicos:

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

- Solo disponible para modelos de OpenAI/OpenAI Codex.
- La política de herramientas aún se aplica; `allow: ["write"]` permite implícitamente `apply_patch`.
- La configuración se encuentra en `tools.exec.applyPatch`.
- `tools.exec.applyPatch.enabled` por defecto es `true`; establécelo en `false` para deshabilitar la herramienta para los modelos de OpenAI.
- `tools.exec.applyPatch.workspaceOnly` por defecto es `true` (contenido en el espacio de trabajo). Establécelo en `false` solo si intencionalmente quieres que `apply_patch` escriba/elimine fuera del directorio del espacio de trabajo.
