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
- `elevated` (bool): solicita el modo elevado (escapar del sandbox hacia la ruta del host configurada); `security=full` solo se fuerza cuando elevated se resuelve a `full`

Notas:

- `host` es `auto` de manera predeterminada: sandbox cuando el tiempo de ejecución de sandbox está activo para la sesión, de lo contrario, gateway.
- `auto` es la estrategia de enrutamiento por defecto, no un comodín. Se permite `host=node` por llamada desde `auto`; `host=gateway` por llamada solo se permite cuando no hay un runtime de sandbox activo.
- Sin configuración adicional, `host=auto` todavía "simplemente funciona": sin sandbox significa que se resuelve a `gateway`; un sandbox activo significa que se mantiene en el sandbox.
- `elevated` escapa del sandbox hacia la ruta del host configurada: `gateway` por defecto, o `node` cuando `tools.exec.host=node` (o el valor predeterminado de la sesión es `host=node`). Solo está disponible cuando el acceso elevado está habilitado para la sesión/proveedor actual.
- Las aprobaciones de `gateway`/`node` están controladas por `~/.openclaw/exec-approvals.json`.
- `node` requiere un nodo emparejado (aplicación complementaria o host de nodo sin cabeza).
- Si hay varios nodos disponibles, establezca `exec.node` o `tools.exec.node` para seleccionar uno.
- `exec host=node` es la única ruta de ejecución de shell para los nodos; se ha eliminado el contenedor heredado `nodes.run`.
- En hosts que no son Windows, exec usa `SHELL` cuando está configurado; si `SHELL` es `fish`, prefiere `bash` (o `sh`)
  de `PATH` para evitar scripts incompatibles con fish, luego vuelve a `SHELL` si ninguno existe.
- En hosts Windows, exec prefiere el descubrimiento de PowerShell 7 (`pwsh`) (Archivos de programa, ProgramW6432, luego PATH),
  luego vuelve a Windows PowerShell 5.1.
- La ejecución en el host (`gateway`/`node`) rechaza `env.PATH` y las anulaciones del cargador (`LD_*`/`DYLD_*`) para
  evitar el secuestro de binarios o código inyectado.
- OpenClaw establece `OPENCLAW_SHELL=exec` en el entorno de comandos generado (incluyendo la ejecución PTY y sandbox) para que las reglas de shell/perfil puedan detectar el contexto de la herramienta exec.
- Importante: el sandbox está **desactivado por defecto**. Si el sandbox está desactivado, el `host=auto` implícito
  se resuelve a `gateway`. El `host=sandbox` explícito aún falla de forma segura en lugar de ejecutarse
  silenciosamente en el host de la puerta de enlace. Active el sandbox o use `host=gateway` con aprobaciones.
- Las comprobaciones previas de secuencias de comandos (para errores comunes de sintaxis de shell de Python/Node) solo inspeccionan archivos dentro del
  límite efectivo de `workdir`. Si una ruta de secuencia de comandos se resuelve fuera de `workdir`, se omite la verificación previa para
  ese archivo.
- Para trabajos de larga duración que comienzan ahora, inícielos una vez y confíe en la activación
  automática de finalización cuando esté habilitada y el comando emita salida o falle.
  Use `process` para registros, estado, entrada o intervención; no emule
  la programación con bucles de suspensión, bucles de tiempo de espera o sondeos repetidos.
- Para el trabajo que debe ocurrir más tarde o en un horario, use cron en lugar de
  patrones de suspensión/retraso de `exec`.

## Configuración

- `tools.exec.notifyOnExit` (predeterminado: true): cuando es true, las sesiones exec en segundo plano ponen en cola un evento del sistema y solicitan un latido al salir.
- `tools.exec.approvalRunningNoticeMs` (predeterminado: 10000): emite un único aviso de "ejecutándose" cuando una exec controlada por aprobaciones se ejecuta más tiempo que esto (0 lo desactiva).
- `tools.exec.host` (predeterminado: `auto`; se resuelve a `sandbox` cuando el tiempo de ejecución de sandbox está activo, `gateway` en caso contrario)
- `tools.exec.security` (predeterminado: `deny` para sandbox, `full` para gateway + node cuando no está establecido)
- `tools.exec.ask` (predeterminado: `off`)
- La ejecución del host sin aprobación es el valor predeterminado para la puerta de enlace (gateway) y el nodo. Si desea el comportamiento de aprobaciones/lista de permitidos, restrinja tanto `tools.exec.*` como el host `~/.openclaw/exec-approvals.json`; consulte [Aprobaciones de ejecución](/en/tools/exec-approvals#no-approval-yolo-mode).
- YOLO proviene de los valores predeterminados de la política del host (`security=full`, `ask=off`), no de `host=auto`. Si desea forzar el enrutamiento a través de la puerta de enlace o del nodo, establezca `tools.exec.host` o utilice `/exec host=...`.
- En el modo `security=full` más `ask=off`, la ejecución del host sigue la política configurada directamente; no hay ningún filtro previo heurístico adicional de ofuscación de comandos.
- `tools.exec.node` (predeterminado: sin definir)
- `tools.exec.strictInlineEval` (predeterminado: false): cuando es true, los formularios de evaluación del intérprete en línea, como `python -c`, `node -e`, `ruby -e`, `perl -e`, `php -r`, `lua -e` y `osascript -e`, siempre requieren una aprobación explícita. `allow-always` aún puede persistir invocaciones benignas de intérprete/scripts, pero los formularios de evaluación en línea seguirán solicitando confirmación cada vez.
- `tools.exec.pathPrepend`: lista de directorios que se deben anteponer a `PATH` para las ejecuciones exec (solo puerta de enlace + entorno limitado/sandbox).
- `tools.exec.safeBins`: binarios seguros de solo stdin que pueden ejecutarse sin entradas explícitas en la lista de permitidos. Para obtener detalles sobre el comportamiento, consulte [Safe bins](/en/tools/exec-approvals#safe-bins-stdin-only).
- `tools.exec.safeBinTrustedDirs`: directorios explícitos adicionales de confianza para las comprobaciones de ruta `safeBins`. Las entradas `PATH` nunca son de confianza automática. Los valores predeterminados integrados son `/bin` y `/usr/bin`.
- `tools.exec.safeBinProfiles`: política personalizada opcional de argv por "safe bin" (`minPositional`, `maxPositional`, `allowedValueFlags`, `deniedFlags`).

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
  configura el entorno del servicio host del nodo (systemd/launchd) o instala las herramientas en ubicaciones estándar.

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

`/exec` solo se respeta para **remitentes autorizados** (listas de permitidos de canales/emparejamiento más `commands.useAccessGroups`).
Actualiza **solo el estado de la sesión** y no escribe configuración. Para deshabilitar permanentemente la ejecución, denégala mediante la política
de herramientas (`tools.deny: ["exec"]` o por agente). Las aprobaciones del host aún se aplican a menos que establezcas explícitamente
`security=full` y `ask=off`.

## Aprobaciones de ejecución (aplicación complementaria / host de nodo)

Los agentes en espacio aislado pueden requerir aprobación por solicitud antes de que `exec` se ejecute en la puerta de enlace o el host de nodo.
Consulte [Aprobaciones de ejecución](/en/tools/exec-approvals) para obtener información sobre la política, la lista de permitidos y el flujo de la interfaz de usuario.

Cuando se requieren aprobaciones, la herramienta de ejecución regresa inmediatamente con
`status: "approval-pending"` y un id de aprobación. Una vez aprobada (o denegada / expirada),
la Gateway emite eventos del sistema (`Exec finished` / `Exec denied`). Si el comando todavía se está
ejecutando después de `tools.exec.approvalRunningNoticeMs`, se emite un único aviso `Exec running`.
En canales con tarjetas/botones de aprobación nativos, el agente debe depender de esa
interfaz de usuario nativa primero y solo incluir un comando manual `/approve` cuando el resultado de la herramienta
diga explícitamente que las aprobaciones de chat no están disponibles o que la aprobación manual es la
única opción.

## Lista de permitidos + bins seguros

La aplicación manual de la lista de permitidos coincide **solo con rutas binarias resueltas** (sin coincidencias de nombre base). Cuando
`security=allowlist`, los comandos de shell se permiten automáticamente solo si cada segmento de la canalización está
en la lista de permitidos o es un bin seguro. El encadenamiento (`;`, `&&`, `||`) y las redirecciones se rechazan en
modo de lista de permitidos a menos que cada segmento de nivel superior satisfaga la lista de permitidos (incluyendo bins seguros).
Las redirecciones siguen sin ser compatibles.
La confianza duradera de `allow-always` no evita esa regla: un comando encadenado todavía requiere que cada
segmento de nivel superior coincida.

`autoAllowSkills` es una ruta de conveniencia separada en las aprobaciones de ejecución. No es lo mismo que
las entradas manuales de la lista de permitidos de rutas. Para una confianza estricta y explícita, mantenga `autoAllowSkills` deshabilitado.

Use los dos controles para diferentes trabajos:

- `tools.exec.safeBins`: filtros de flujo pequeños, solo de stdin.
- `tools.exec.safeBinTrustedDirs`: directorios confiables adicionales explícitos para rutas ejecutables de bins seguros.
- `tools.exec.safeBinProfiles`: política argv explícita para bins seguros personalizados.
- allowlist: confianza explícita para rutas ejecutables.

No trate `safeBins` como una lista de permitidos genérica, y no agregue binarios de intérprete/ejecución (por ejemplo `python3`, `node`, `ruby`, `bash`). Si necesita esos, use entradas explícitas en la lista de permitidos y mantenga las solicitudes de aprobación habilitadas.
`openclaw security audit` advierte cuando a las entradas de intérprete/ejecución `safeBins` les faltan perfiles explícitos, y `openclaw doctor --fix` puede generar andamios para las entradas `safeBinProfiles` personalizadas faltantes.
`openclaw security audit` y `openclaw doctor` también advierten cuando agrega explícitamente bins de comportamiento amplio como `jq` de nuevo en `safeBins`.
Si permite explícitamente intérpretes, habilite `tools.exec.strictInlineEval` para que los formularios de evaluación de código en línea sigan requiriendo una aprobación nueva.

Para obtener detalles completos de la política y ejemplos, consulte [Aprobaciones de ejecución](/en/tools/exec-approvals#safe-bins-stdin-only) y [Safe bins versus allowlist](/en/tools/exec-approvals#safe-bins-versus-allowlist).

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

El sondeo es para el estado bajo demanda, no para bucles de espera. Si el despertar de finalización automática
está habilitado, el comando puede despertar la sesión cuando emite salida o falla.

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

Pegar (entre corchetes por defecto):

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## apply_patch

`apply_patch` es una subherramienta de `exec` para ediciones estructuradas de múltiples archivos.
Está habilitada por defecto para los modelos de OpenAI y OpenAI Codex. Use la configuración solo
cuando quiera deshabilitarla o restringirla a modelos específicos:

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.4"] },
    },
  },
}
```

Notas:

- Solo disponible para modelos de OpenAI/OpenAI Codex.
- La política de herramientas todavía se aplica; `allow: ["write"]` permite implícitamente `apply_patch`.
- La configuración vive bajo `tools.exec.applyPatch`.
- `tools.exec.applyPatch.enabled` por defecto es `true`; establézcalo en `false` para deshabilitar la herramienta para modelos de OpenAI.
- `tools.exec.applyPatch.workspaceOnly` predeterminado es `true` (contenido en el espacio de trabajo). Establézcalo en `false` solo si desea intencionalmente que `apply_patch` escriba/elimine fuera del directorio del espacio de trabajo.

## Relacionado

- [Aprobaciones de Exec](/en/tools/exec-approvals) — puertas de aprobación para comandos de shell
- [Sandboxing](/en/gateway/sandboxing) — ejecución de comandos en entornos aislados
- [Proceso en segundo plano](/en/gateway/background-process) — herramienta de ejecución y proceso de larga duración
- [Seguridad](/en/gateway/security) — política de herramientas y acceso elevado
