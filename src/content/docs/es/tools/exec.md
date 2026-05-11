---
summary: "Uso de la herramienta Exec, modos stdin y compatibilidad con TTY"
read_when:
  - Using or modifying the exec tool
  - Debugging stdin or TTY behavior
title: "Herramienta de ejecución"
---

Ejecuta comandos de shell en el espacio de trabajo. Admite la ejecución en primer y segundo plano a través de `process`.
Si `process` no está permitido, `exec` se ejecuta de forma síncrona e ignora `yieldMs`/`background`.
Las sesiones en segundo plano están limitadas por agente; `process` solo ve sesiones del mismo agente.

## Parámetros

<ParamField path="command" type="string" required>
  Comando de shell para ejecutar.
</ParamField>

<ParamField path="workdir" type="string" default="cwd">
  Directorio de trabajo para el comando.
</ParamField>

<ParamField path="env" type="object"
Sobrescrituras de entorno clave/valor combinadas encima del entorno heredado.
</ParamField>

<ParamField path="yieldMs" type="number" default="10000">
  Poner el comando en segundo plano automáticamente después de este retraso (ms).
</ParamField>

<ParamField path="background" type="boolean" default="false">
  Poner el comando en segundo plano inmediatamente en lugar de esperar a `yieldMs`.
</ParamField>

<ParamField path="timeout" type="number" default="tools.exec.timeoutSec"
Sobrescribir el tiempo de espera de exec configurado para esta llamada. Establezca `timeout: 0` solo cuando el comando debe ejecutarse sin el tiempo de espera del proceso exec.
</ParamField>

<ParamField path="pty" type="boolean" default="false">
  Ejecutar en una pseudoterminal cuando esté disponible. Usar para CLIs que solo requieren TTY, agentes de codificación e interfaces de usuario de terminal.
</ParamField>

<ParamField path="host" type="'auto' | 'sandbox' | 'gateway' | 'node'" default="auto">
  Dónde ejecutar. `auto` se resuelve a `sandbox` cuando un tiempo de ejecución de sandbox está activo y `gateway` en caso contrario.
</ParamField>

<ParamField path="security" type="'deny' | 'allowlist' | 'full'">
  Modo de aplicación para la ejecución de `gateway` / `node`.
</ParamField>

<ParamField path="ask" type="'off' | 'on-miss' | 'always'">
  Comportamiento del aviso de aprobación para la ejecución de `gateway` / `node`.
</ParamField>

<ParamField path="node" type="string">
  ID/nombre del nodo cuando `host=node`.
</ParamField>

<ParamField path="elevated" type="boolean" default="false">
  Solicitar modo elevado: salir del sandbox hacia la ruta del host configurada. `security=full` se fuerza solo cuando el modo elevado se resuelve como `full`.
</ParamField>

Notas:

- `host` por defecto es `auto`: sandbox cuando el entorno de ejecución (runtime) del sandbox está activo para la sesión; de lo contrario, gateway.
- `auto` es la estrategia de enrutamiento predeterminada, no un comodín. Se permite `host=node` por llamada desde `auto`; se permite `host=gateway` por llamada solo cuando no hay ningún entorno de ejecución de sandbox activo.
- Sin configuración adicional, `host=auto` todavía "simplemente funciona": sin sandbox significa que se resuelve como `gateway`; un sandbox activo significa que se mantiene en el sandbox.
- `elevated` escapa del sandbox hacia la ruta del host configurada: `gateway` por defecto, o `node` cuando `tools.exec.host=node` (o el valor predeterminado de la sesión es `host=node`). Solo está disponible cuando el acceso elevado está habilitado para la sesión/proveedor actual.
- Las aprobaciones de `gateway`/`node` están controladas por `~/.openclaw/exec-approvals.json`.
- `node` requiere un nodo emparejado (aplicación complementaria o host de nodo sin cabeza).
- Si hay varios nodos disponibles, configure `exec.node` o `tools.exec.node` para seleccionar uno.
- `exec host=node` es la única ruta de ejecución de shell para los nodos; se ha eliminado el contenedor `nodes.run` heredado.
- `timeout` se aplica a la ejecución en primer plano, en segundo plano, `yieldMs`, puerta de enlace, sandbox y nodo `system.run`. Si se omite, OpenClaw usa `tools.exec.timeoutSec`; `timeout: 0` explícito deshabilita el tiempo de espera del proceso exec para esa llamada.
- En hosts que no son Windows, exec usa `SHELL` cuando está establecido; si `SHELL` es `fish`, prefiere `bash` (o `sh`)
  de `PATH` para evitar scripts incompatibles con fish, luego recurre a `SHELL` si no existe ninguno.
- En hosts Windows, exec prefiere el descubrimiento de PowerShell 7 (`pwsh`) (Archivos de programa, ProgramW6432, luego PATH),
  luego recurre a Windows PowerShell 5.1.
- La ejecución en el host (`gateway`/`node`) rechaza `env.PATH` y las anulaciones del cargador (`LD_*`/`DYLD_*`) para
  evitar el secuestro de binarios o código inyectado.
- OpenClaw establece `OPENCLAW_SHELL=exec` en el entorno del comando generado (incluida la ejecución PTY y sandbox) para que las reglas de shell/perfil puedan detectar el contexto de la herramienta exec.
- Importante: el sandboxing está **desactivado por defecto**. Si el sandboxing está desactivado, `host=auto`
  implícito se resuelve como `gateway`. `host=sandbox` explícito aún falla de forma cerrada en lugar de ejecutarse
  silenciosamente en el host de la puerta de enlace. Habilite el sandboxing o use `host=gateway` con aprobaciones.
- Las comprobaciones de prevuelo de script (para errores comunes de sintaxis de shell de Python/Node) solo inspeccionan archivos dentro del
  límite efectivo de `workdir`. Si una ruta de script se resuelve fuera de `workdir`, se omite la prevuelta para
  ese archivo.
- Para trabajos de larga duración que comienzan ahora, inícielos una vez y confíe en la activación automática por finalización cuando esté habilitada y el comando emita salida o falle. Use `process` para registros, estado, entrada o intervención; no emule la programación con bucles de suspensión, bucles de tiempo de espera o sondeo repetido.
- Para trabajo que debe ocurrir más tarde o según una programación, use cron en lugar de patrones de suspensión/retraso de `exec`.

## Configuración

- `tools.exec.notifyOnExit` (predeterminado: true): cuando es true, las sesiones exec en segundo plano ponen en cola un evento del sistema y solicitan un latido al salir.
- `tools.exec.approvalRunningNoticeMs` (predeterminado: 10000): emite un único aviso de "en ejecución" cuando una exec con puerta de aprobación se ejecuta más tiempo que esto (0 lo desactiva).
- `tools.exec.timeoutSec` (predeterminado: 1800): tiempo de espera de exec predeterminado por comando en segundos. El `timeout` por llamada lo anula; el `timeout: 0` por llamada desactiva el tiempo de espera del proceso exec.
- `tools.exec.host` (predeterminado: `auto`; se resuelve a `sandbox` cuando el tiempo de ejecución de sandbox está activo, `gateway` en caso contrario)
- `tools.exec.security` (predeterminado: `deny` para sandbox, `full` para gateway + node cuando no está establecido)
- `tools.exec.ask` (predeterminado: `off`)
- La exec de host sin aprobación es el valor predeterminado para gateway + node. Si desea el comportamiento de aprobaciones/lista blanca, ajuste tanto `tools.exec.*` como el `~/.openclaw/exec-approvals.json` del host; consulte [Exec approvals](/es/tools/exec-approvals#no-approval-yolo-mode).
- YOLO proviene de los valores predeterminados de la política de host (`security=full`, `ask=off`), no de `host=auto`. Si desea forzar el enrutamiento a gateway o node, configure `tools.exec.host` o use `/exec host=...`.
- En el modo `security=full` más `ask=off`, la exec de host sigue directamente la política configurada; no hay una capa heurística adicional de prefiltro de ofuscación de comandos ni de rechazo previo de guiones.
- `tools.exec.node` (predeterminado: sin establecer)
- `tools.exec.strictInlineEval` (predeterminado: false): cuando es verdadero, los formularios de evaluación del intérprete en línea como `python -c`, `node -e`, `ruby -e`, `perl -e`, `php -r`, `lua -e` y `osascript -e` siempre requieren aprobación explícita. `allow-always` aún puede persistir invocaciones benignas de intérprete/guiones, pero los formularios de evaluación en línea aún solicitan confirmación cada vez.
- `tools.exec.pathPrepend`: lista de directorios para anteponer a `PATH` para ejecuciones exec (solo puerta de enlace + espacio aislado).
- `tools.exec.safeBins`: binarios seguros solo de stdin que pueden ejecutarse sin entradas explícitas en la lista de permitidos. Para obtener detalles sobre el comportamiento, consulte [Safe bins](/es/tools/exec-approvals-advanced#safe-bins-stdin-only).
- `tools.exec.safeBinTrustedDirs`: directorios explícitos adicionales de confianza para las comprobaciones de ruta `safeBins`. Las entradas `PATH` nunca son de confianza automática. Los valores predeterminados integrados son `/bin` y `/usr/bin`.
- `tools.exec.safeBinProfiles`: política personalizada opcional de argv por binario seguro (`minPositional`, `maxPositional`, `allowedValueFlags`, `deniedFlags`).

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
  rechazan para la ejecución en el host. El demonio en sí todavía se ejecuta con un `PATH` mínimo:
  - macOS: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux: `/usr/local/bin`, `/usr/bin`, `/bin`
- `host=sandbox`: ejecuta `sh -lc` (shell de inicio de sesión) dentro del contenedor, por lo que `/etc/profile` puede restablecer `PATH`.
  OpenClaw antepone `env.PATH` después de la obtención del perfil mediante una variable de entorno interna (sin interpolación de shell);
  `tools.exec.pathPrepend` también se aplica aquí.
- `host=node`: solo las anulaciones de entorno no bloqueadas que envíes se envían al nodo. Las anulaciones de `env.PATH` son
  rechazadas para la ejecución en el host e ignoradas por los hosts de nodos. Si necesitas entradas PATH adicionales en un nodo,
  configura el entorno del servicio host del nodo (systemd/launchd) o instala herramientas en ubicaciones estándar.

Vinculación de nodo por agente (usa el índice de la lista de agentes en la configuración):

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

Interfaz de usuario de control: la pestaña Nodos incluye un pequeño panel "Vinculación de nodo Exec" para la misma configuración.

## Anulaciones de sesión (`/exec`)

Usa `/exec` para establecer valores predeterminados **por sesión** para `host`, `security`, `ask` y `node`.
Envía `/exec` sin argumentos para mostrar los valores actuales.

Ejemplo:

```
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

## Modelo de autorización

`/exec` solo se respeta para **remitentes autorizados** (listas de permisos de canales/emparejamiento más `commands.useAccessGroups`).
Actualiza **solo el estado de la sesión** y no escribe la configuración. Para deshabilitar permanentemente exec, denégalo mediante la política de herramientas
(`tools.deny: ["exec"]` o por agente). Las aprobaciones del host aún se aplican a menos que configures explícitamente
`security=full` y `ask=off`.

## Aprobaciones de Exec (aplicación complementaria / host de nodo)

Los agentes en espacio aislado pueden requerir aprobación por solicitud antes de que `exec` se ejecute en la puerta de enlace o en el host del nodo.
Consulta [Aprobaciones de Exec](/es/tools/exec-approvals) para obtener información sobre la política, la lista de permisos y el flujo de la interfaz de usuario.

Cuando se requieren aprobaciones, la herramienta exec regresa inmediatamente con
`status: "approval-pending"` y un ID de aprobación. Una vez aprobado (o denegado / caducado),
el Gateway emite eventos del sistema (`Exec finished` / `Exec denied`). Si el comando aún se está
ejecutando después de `tools.exec.approvalRunningNoticeMs`, se emite un único aviso `Exec running`.
En canales con tarjetas/botones de aprobación nativos, el agente debe confiar primero en esa
IU nativa y solo incluir un comando manual `/approve` cuando el resultado
de la herramienta indique explícitamente que las aprobaciones de chat no están disponibles o que la aprobación manual es la
única ruta.

## Lista de permitidos + bins seguros

La aplicación manual de la lista de permitidos coincide con los glob de rutas binarias resueltas y los glob de nombres de comandos simples.
Los nombres simples coinciden solo con comandos invocados a través de PATH, por lo que `rg` puede coincidir
con `/opt/homebrew/bin/rg` cuando el comando es `rg`, pero no con `./rg` o `/tmp/rg`.
Cuando `security=allowlist`, los comandos de shell se permiten automáticamente solo si cada segmento
de la tubería está en la lista de permitidos o es un bin seguro. El encadenamiento (`;`, `&&`, `||`) y las redirecciones
se rechazan en modo lista de permitidos a menos que cada segmento de nivel superior satisfaga la
lista de permitidos (incluyendo bins seguros). Las redirecciones siguen sin ser compatibles.
La confianza duradera de `allow-always` no elude esa regla: un comando encadenado aún requiere que cada
segmento de nivel superior coincida.

`autoAllowSkills` es una ruta de conveniencia separada en las aprobaciones exec. No es lo mismo que
las entradas manuales de la lista de permitidos de rutas. Para una confianza explícita estricta, mantenga `autoAllowSkills` deshabilitado.

Use los dos controles para diferentes trabajos:

- `tools.exec.safeBins`: filtros de flujo pequeños, solo stdin.
- `tools.exec.safeBinTrustedDirs`: directorios de confianza adicionales explícitos para rutas ejecutables de bins seguros.
- `tools.exec.safeBinProfiles`: política explícita de argv para bins seguros personalizados.
- allowlist: confianza explícita para rutas ejecutables.

No trate `safeBins` como una lista de permisos genérica, y no añada binarios de intérprete/tiempo de ejecución (por ejemplo `python3`, `node`, `ruby`, `bash`). Si los necesita, use entradas explícitas en la lista de permisos y mantenga las solicitudes de aprobación habilitadas.
`openclaw security audit` advierte cuando faltan perfiles explícitos en las entradas de intérprete/tiempo de ejecución `safeBins`, y `openclaw doctor --fix` puede crear entradas `safeBinProfiles` personalizadas que falten.
`openclaw security audit` y `openclaw doctor` también advierten cuando añade explícitamente bins de comportamiento amplio, como `jq`, de nuevo en `safeBins`.
Si permite explícitamente intérpretes, habilite `tools.exec.strictInlineEval` para que los formularios de evaluación de código en línea sigan requiriendo una aprobación nueva.

Para obtener detalles completos de la política y ejemplos, consulte [Aprobaciones de ejecución](/es/tools/exec-approvals-advanced#safe-bins-stdin-only) y [Bins seguros versus lista de permisos](/es/tools/exec-approvals-advanced#safe-bins-versus-allowlist).

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

El sondeo es para el estado bajo demanda, no para bucles de espera. Si el despertar automático de finalización
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

Pegar (entre corchetes de forma predeterminada):

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## apply_patch

`apply_patch` es una subherramienta de `exec` para ediciones estructuradas de múltiples archivos.
Está habilitada de forma predeterminada para los modelos de OpenAI y OpenAI Codex. Use la configuración solo
cuando quiera deshabilitarla o restringirla a modelos específicos:

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
- La política de herramientas aún se aplica; `allow: ["write"]` permite implícitamente `apply_patch`.
- La configuración se encuentra en `tools.exec.applyPatch`.
- `tools.exec.applyPatch.enabled` tiene como valor predeterminado `true`; establézcalo en `false` para deshabilitar la herramienta para los modelos de OpenAI.
- `tools.exec.applyPatch.workspaceOnly` tiene como valor predeterminado `true` (contenido en el espacio de trabajo). Establézcalo en `false` solo si desea intencionalmente que `apply_patch` escriba/elimine fuera del directorio del espacio de trabajo.

## Relacionado

- [Aprobaciones de Exec](/es/tools/exec-approvals) — puertas de aprobación para comandos de shell
- [Sandboxing](/es/gateway/sandboxing) — ejecución de comandos en entornos con sandbox
- [Proceso en segundo plano](/es/gateway/background-process) — herramienta de ejecución y proceso de larga duración
- [Seguridad](/es/gateway/security) — política de herramientas y acceso elevado
