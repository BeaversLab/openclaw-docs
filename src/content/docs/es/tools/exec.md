---
summary: "Uso de la herramienta Exec, modos stdin y compatibilidad con TTY"
read_when:
  - Using or modifying the exec tool
  - Debugging stdin or TTY behavior
title: "Herramienta de ejecución"
---

Ejecuta comandos de shell en el espacio de trabajo. `exec` es una superficie de shell mutante: los comandos pueden crear, editar o eliminar archivos dondequiera que el sistema de archivos del host o sandbox seleccionado lo permita. Deshabilitar las herramientas del sistema de archivos de OpenClaw como `write`, `edit` o `apply_patch` no hace que `exec` sea de solo lectura.

Admite la ejecución en primer plano y en segundo plano a través de `process`. Si `process` no está permitido, `exec` se ejecuta sincrónicamente e ignora `yieldMs`/`background`.
Las sesiones en segundo plano tienen un alcance por agente; `process` solo ve sesiones del mismo agente.

## Parámetros

<ParamField path="command" type="string" required>
  Comando de shell para ejecutar.
</ParamField>

<ParamField path="workdir" type="string" default="cwd">
  Directorio de trabajo para el comando.
</ParamField>

<ParamField path="env" type="object"
Sobrescripciones de entorno clave/valor fusionadas encima del entorno heredado.
</ParamField>

<ParamField path="yieldMs" type="number" default="10000">
  Poner en segundo plano automáticamente el comando después de este retraso (ms).
</ParamField>

<ParamField path="background" type="boolean" default="false">
  Poner en segundo plano el comando inmediatamente en lugar de esperar a `yieldMs`.
</ParamField>

<ParamField path="timeout" type="number" default="tools.exec.timeoutSec">
  Sobrescribir el tiempo de espera de ejecución configurado para esta llamada. Establezca `timeout: 0` solo cuando el comando deba ejecutarse sin el tiempo de espera del proceso de ejecución.
</ParamField>

<ParamField path="pty" type="boolean" default="false">
  Ejecutar en una pseudoterminal cuando esté disponible. Usar para CLI que solo funcionan con TTY, agentes de codificación e interfaces de usuario de terminal.
</ParamField>

<ParamField path="host" type="'auto' | 'sandbox' | 'gateway' | 'node'" default="auto">
  Dónde ejecutar. `auto` se resuelve a `sandbox` cuando un tiempo de ejecución de sandbox está activo y a `gateway` de lo contrario.
</ParamField>

<ParamField path="security" type="'deny' | 'allowlist' | 'full'">
  Se ignora para las llamadas a herramientas normales. La seguridad de `gateway` / `node` está controlada por `tools.exec.security` y `~/.openclaw/exec-approvals.json`; el modo elevado puede forzar `security=full` solo cuando el operador otorga explícitamente acceso elevado.
</ParamField>

<ParamField path="ask" type="'off' | 'on-miss' | 'always'">
  Comportamiento del mensaje de aprobación para la ejecución de `gateway` / `node`.
</ParamField>

<ParamField path="node" type="string">
  Id/nombre del nodo cuando `host=node`.
</ParamField>

<ParamField path="elevated" type="boolean" default="false">
  Solicitar modo elevado: escapar del sandbox hacia la ruta del host configurada. `security=full` se fuerza solo cuando elevated se resuelve a `full`.
</ParamField>

Notas:

- `host` por defecto es `auto`: sandbox cuando el tiempo de ejecución de sandbox está activo para la sesión, de lo contrario, gateway.
- `host` solo acepta `auto`, `sandbox`, `gateway` o `node`. No es un selector de nombre de host; los valores parecidos a un nombre de host se rechazan antes de que se ejecute el comando.
- `auto` es la estrategia de enrutamiento predeterminada, no un comodín. El `host=node` por llamada está permitido desde `auto`; el `host=gateway` por llamada solo se permite cuando no hay un tiempo de ejecución de sandbox activo.
- Sin configuración adicional, `host=auto` todavía "simplemente funciona": sin sandbox significa que se resuelve a `gateway`; un sandbox activo significa que se mantiene en el sandbox.
- `elevated` sale del sandbox hacia la ruta del host configurada: `gateway` de forma predeterminada, o `node` cuando `tools.exec.host=node` (o el valor predeterminado de la sesión es `host=node`). Solo está disponible cuando el acceso elevado está habilitado para la sesión/proveedor actual.
- Las aprobaciones `gateway`/`node` están controladas por `~/.openclaw/exec-approvals.json`.
- `node` requiere un nodo emparejado (aplicación complementaria o host de nodo sin interfaz).
- Si hay varios nodos disponibles, configure `exec.node` o `tools.exec.node` para seleccionar uno.
- `exec host=node` es la única ruta de ejecución de shell para los nodos; el contenedor heredado `nodes.run` se ha eliminado.
- `timeout` se aplica a la ejecución en primer plano, segundo plano, `yieldMs`, puerta de enlace, sandbox y nodo `system.run`. Si se omite, OpenClaw usa `tools.exec.timeoutSec`; un `timeout: 0` explícito deshabilita el tiempo de espera del proceso exec para esa llamada.
- En hosts que no son Windows, exec usa `SHELL` cuando está configurado; si `SHELL` es `fish`, prefiere `bash` (o `sh`)
  de `PATH` para evitar scripts incompatibles con fish, luego recurre a `SHELL` si no existe ninguno.
- En hosts Windows, exec prefiere el descubrimiento de PowerShell 7 (`pwsh`) (Program Files, ProgramW6432, luego PATH),
  luego recurre a Windows PowerShell 5.1.
- La ejecución en el host (`gateway`/`node`) rechaza `env.PATH` y las anulaciones del cargador (`LD_*`/`DYLD_*`) para
  evitar el secuestro de binarios o código inyectado.
- OpenClaw establece `OPENCLAW_SHELL=exec` en el entorno del comando generado (incluida la ejecución PTY y sandbox) para que las reglas de shell/perfil puedan detectar el contexto de la herramienta exec.
- `openclaw channels login` está bloqueado desde `exec` porque es un flujo de autenticación de canal interactivo; ejecútelo en una terminal en el host de puerta de enlace o use la herramienta de inicio de sesión nativa del canal desde el chat cuando exista una.
- Importante: el sandboxing está **desactivado por defecto**. Si el sandboxing está desactivado, `host=auto` implícito
  se resuelve a `gateway`. `host=sandbox` explícito todavía falla de forma cerrada en lugar de ejecutarse
  silenciosamente en el host de puerta de enlace. Active el sandboxing o use `host=gateway` con aprobaciones.
- Las comprobaciones previas del script (para errores comunes de sintaxis de shell de Python/Node) solo inspeccionan archivos dentro del
  límite efectivo de `workdir`. Si una ruta de script se resuelve fuera de `workdir`, la verificación previa se omite para
  ese archivo.
- Para trabajos de larga duración que comienzan ahora, inícielos una vez y confíe en la reactivación automática
  de finalización cuando esté activada y el comando emita salida o falle.
  Use `process` para registros, estado, entrada o intervención; no emule
  la programación con bucles de suspensión, bucles de tiempo de espera o sondeo repetido.
- Para trabajos que deben ocurrir más tarde o según un programa, use cron en lugar de
  patrones de suspensión/retraso de `exec`.

## Config

- `tools.exec.notifyOnExit` (predeterminado: true): cuando es true, las sesiones exec en segundo plano ponen en cola un evento del sistema y solicitan un latido al salir.
- `tools.exec.approvalRunningNoticeMs` (predeterminado: 10000): emite un único aviso de "en ejecución" cuando una exec controlada por aprobaciones se ejecuta más tiempo que esto (0 lo desactiva).
- `tools.exec.timeoutSec` (predeterminado: 1800): tiempo de espera de exec por comando predeterminado en segundos. `timeout` por llamada lo anula; `timeout: 0` por llamada desactiva el tiempo de espera del proceso exec.
- `tools.exec.host` (predeterminado: `auto`; se resuelve a `sandbox` cuando el tiempo de ejecución del sandbox está activo, `gateway` en caso contrario)
- `tools.exec.security` (predeterminado: `deny` para sandbox, `full` para puerta de enlace + nodo cuando no está configurado)
- `tools.exec.ask` (predeterminado: `off`)
- La ejecución de host sin aprobación es el valor predeterminado para gateway + node. Si deseas el comportamiento de aprobaciones/lista blanca, ajusta tanto `tools.exec.*` como el `~/.openclaw/exec-approvals.json` del host; consulta [Exec approvals](/es/tools/exec-approvals#yolo-mode-no-approval).
- YOLO proviene de los valores predeterminados de la política del host (`security=full`, `ask=off`), no de `host=auto`. Si desea forzar el enrutamiento a través de gateway o node, configure `tools.exec.host` o use `/exec host=...`.
- En el modo `security=full` más `ask=off`, la ejecución del host sigue la política configurada directamente; no hay ninguna capa adicional de prefiltrado heurístico de ofuscación de comandos ni de rechazo de prevuelo de scripts.
- `tools.exec.node` (predeterminado: sin establecer)
- `tools.exec.strictInlineEval` (predeterminado: false): cuando es true, los formularios de evaluación del intérprete en línea, como `python -c`, `node -e`, `ruby -e`, `perl -e`, `php -r`, `lua -e` y `osascript -e`, siempre requieren aprobación explícita. `allow-always` todavía puede persistir invocaciones benignas de intérpretes/scripts, pero los formularios de evaluación en línea todavía solicitan confirmación cada vez.
- `tools.exec.commandHighlighting` (predeterminado: false): cuando es true, las solicitudes de aprobación pueden resaltar los intervalos de comandos derivados del analizador en el texto del comando. Establézcalo en `true` globalmente o por agente para habilitar el resaltado de texto de comando sin cambiar la política de aprobación de ejecución.
- `tools.exec.pathPrepend`: lista de directorios que se anteponen a `PATH` para las ejecuciones de exec (solo gateway + sandbox).
- `tools.exec.safeBins`: binarios seguros solo de stdin que pueden ejecutarse sin entradas explícitas en la lista blanca. Para obtener detalles sobre el comportamiento, consulta [Safe bins](/es/tools/exec-approvals-advanced#safe-bins-stdin-only).
- `tools.exec.safeBinTrustedDirs`: directorios explícitos adicionales de confianza para las comprobaciones de ruta `safeBins`. Las entradas de `PATH` nunca son de confianza automática. Los valores predeterminados integrados son `/bin` y `/usr/bin`.
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

- `host=gateway`: fusiona su `PATH` de shell de inicio de sesión en el entorno exec. Las anulaciones de `env.PATH` son
  rechazadas para la ejecución en el host. El propio demonio aún se ejecuta con un `PATH` mínimo:
  - macOS: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux: `/usr/local/bin`, `/usr/bin`, `/bin`
    - Para evitar que la configuración del shell del usuario (como `~/.zshenv` o `/etc/zshenv`) anule las rutas de prioridad durante el inicio, las entradas `tools.exec.pathPrepend` se anteponen de forma segura a la `PATH` final dentro del comando de shell justo antes de la ejecución.
- `host=sandbox`: ejecuta `sh -lc` (shell de inicio de sesión) dentro del contenedor, por lo que `/etc/profile` puede restablecer `PATH`.
  OpenClaw antepone `env.PATH` después de la obtención del perfil mediante una variable de entorno interna (sin interpolación de shell);
  `tools.exec.pathPrepend` también se aplica aquí.
- `host=node`: solo las anulaciones de entorno no bloqueadas que pases se envían al nodo. Las anulaciones de `env.PATH` son
  rechazadas para la ejecución en el host e ignoradas por los hosts del nodo. Si necesitas entradas PATH adicionales en un nodo,
  configura el entorno del servicio del host del nodo (systemd/launchd) o instala herramientas en ubicaciones estándar.

Enlace de nodo por agente (usa el índice de la lista de agentes en la configuración):

```bash
openclaw config get agents.list
openclaw config set 'agents.list[0].tools.exec.node' "node-id-or-name"
```

Interfaz de usuario de control: la pestaña Nodes incluye un pequeño panel "Exec node binding" para la misma configuración.

## Anulaciones de sesión (`/exec`)

Usa `/exec` para establecer valores predeterminados **por sesión** para `host`, `security`, `ask` y `node`.
Envía `/exec` sin argumentos para mostrar los valores actuales.

Ejemplo:

```
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

## Modelo de autorización

`/exec` solo se respeta para **remitentes autorizados** (listas de permitidos/emparejamiento de canales más `commands.useAccessGroups`).
Actualiza **solo el estado de la sesión** y no escribe la configuración. Para deshabilitar exec de forma permanente, denieguelo mediante la política
de herramientas (`tools.deny: ["exec"]` o por agente). Las aprobaciones del host siguen aplicándose a menos que configure explícitamente
`security=full` y `ask=off`.

## Aprobaciones de Exec (aplicación complementaria / host de nodo)

Los agentes en sandbox pueden requerir aprobación por solicitud antes de que `exec` se ejecute en el gateway o en el host del nodo.
Consulte [Aprobaciones de Exec](/es/tools/exec-approvals) para conocer la política, la lista de permitidos y el flujo de la interfaz de usuario.

Cuando se requieren aprobaciones, la herramienta exec regresa inmediatamente con
`status: "approval-pending"` y un id de aprobación. Una vez aprobada (o denegada / expirada),
el Gateway emite eventos de sistema de progreso y finalización del comando solo para ejecuciones aprobadas
(`Exec running` / `Exec finished`). Las aprobaciones denegadas o expiradas son terminales y no
reactivan la sesión del agente con un evento de sistema de denegación.
En canales con tarjetas/botones de aprobación nativos, el agente debe confiar primero en esa
interfaz nativa y solo incluir un comando manual `/approve` cuando el resultado
de la herramienta indique explícitamente que las aprobaciones de chat no están disponibles o que la aprobación manual es la
única vía.

## Lista de permitidos + bins seguros

La aplicación manual de la lista blanca coincide con los patrones glob de la ruta binaria resuelta y los patrones glob de nombres de comandos simples. Los nombres simples coinciden solo con los comandos invocados a través de PATH, por lo que `rg` puede coincidir con `/opt/homebrew/bin/rg` cuando el comando es `rg`, pero no con `./rg` o `/tmp/rg`.
Cuando `security=allowlist`, los comandos de shell se permiten automáticamente solo si cada segmento de la canalización está en la lista blanca o es un binario seguro. El encadenamiento (`;`, `&&`, `||`) y las redirecciones se rechazan en el modo de lista blanca a menos que cada segmento de nivel superior satisfaga la lista blanca (incluidos los binarios seguros). Las redirecciones siguen sin ser compatibles.
La confianza duradera de `allow-always` no omite esa regla: un comando encadenado aún requiere que cada segmento de nivel superior coincida.

`autoAllowSkills` es una ruta de conveniencia separada en las aprobaciones de exec. No es lo mismo que las entradas manuales de la lista blanca de rutas. Para una confianza estricta y explícita, mantenga `autoAllowSkills` deshabilitado.

Use los dos controles para diferentes trabajos:

- `tools.exec.safeBins`: filtros de flujo pequeños, solo de stdin.
- `tools.exec.safeBinTrustedDirs`: directorios confiables adicionales explícitos para rutas ejecutables de binarios seguros.
- `tools.exec.safeBinProfiles`: política explícita de argv para binarios seguros personalizados.
- allowlist: confianza explícita para rutas ejecutables.

No trate `safeBins` como una lista de permitidos genérica, y no agregue binarios de intérprete/tiempo de ejecución (por ejemplo, `python3`, `node`, `ruby`, `bash`). Si necesita esos, use entradas explícitas de lista de permitidos y mantenga los avisos de aprobación habilitados.
`openclaw security audit` avisa cuando faltan perfiles explícitos en las entradas de intérprete/tiempo de ejecución `safeBins`, y `openclaw doctor --fix` puede generar andamios para las entradas `safeBinProfiles` personalizadas faltantes.
`openclaw security audit` y `openclaw doctor` también avisan cuando agrega explícitamente bins de comportamiento amplio como `jq` nuevamente en `safeBins`.
Si permite explícitamente intérpretes, habilite `tools.exec.strictInlineEval` para que los formularios de evaluación de código en línea sigan requiriendo una aprobación nueva.

Para obtener detalles completos de la política y ejemplos, consulte [Exec approvals](/es/tools/exec-approvals-advanced#safe-bins-stdin-only) y [Safe bins versus allowlist](/es/tools/exec-approvals-advanced#safe-bins-versus-allowlist).

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

El sondeo es para el estado bajo demanda, no para bucles de espera. Si el reactivación
automática por finalización está habilitada, el comando puede reactivar la sesión cuando emite salida o falla.

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

`apply_patch` es una subherramienta de `exec` para ediciones estructuradas de varios archivos.
Está habilitada de forma predeterminada para los modelos de OpenAI y OpenAI Codex. Use la configuración solo
cuando desee deshabilitarla o restringirla a modelos específicos:

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.5"] },
    },
  },
}
```

Notas:

- Solo disponible para modelos de OpenAI/OpenAI Codex.
- La política de herramientas todavía se aplica; `allow: ["write"]` permite implícitamente `apply_patch`.
- `deny: ["write"]` no deniega `apply_patch`; deniegue `apply_patch` explícitamente o use `deny: ["group:fs"]` cuando también se deban bloquear las escrituras de parches.
- La configuración se encuentra bajo `tools.exec.applyPatch`.
- `tools.exec.applyPatch.enabled` predeterminado es `true`; establézcalo en `false` para desactivar la herramienta para los modelos de OpenAI.
- `tools.exec.applyPatch.workspaceOnly` predeterminado es `true` (contenido en el espacio de trabajo). Establézcalo en `false` solo si intencionalmente desea que `apply_patch` escriba/elimine fuera del directorio del espacio de trabajo.

## Relacionado

- [Aprobaciones de Exec](/es/tools/exec-approvals) — puertas de aprobación para comandos de shell
- [Sandboxing](/es/gateway/sandboxing) — ejecución de comandos en entornos aislados
- [Proceso en segundo plano](/es/gateway/background-process) — herramienta de ejecución y proceso de larga duración
- [Seguridad](/es/gateway/security) — política de herramientas y acceso elevado
