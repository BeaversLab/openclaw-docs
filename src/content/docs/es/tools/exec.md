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
- `tools.exec.mode` es el control de política normalizado. Los valores son `deny`, `allowlist`, `ask`, `auto` y `full`. `auto` ejecuta coincidencias deterministas de lista de permitidos/bins seguros directamente y enruta cada caso de aprobación exec restante a través del revisor automático nativo de OpenClaw antes de preguntar a un humano. `ask` / `ask=always` todavía pregunta a un humano cada vez.
- Sin configuración adicional, `host=auto` todavía "simplemente funciona": sin sandbox significa que se resuelve a `gateway`; un sandbox activo significa que se mantiene en el sandbox.
- `elevated` sale del sandbox hacia la ruta del host configurada: `gateway` por defecto, o `node` cuando `tools.exec.host=node` (o el predeterminado de la sesión es `host=node`). Solo está disponible cuando el acceso elevado está habilitado para la sesión/proveedor actual.
- Las aprobaciones `gateway`/`node` están controladas por `~/.openclaw/exec-approvals.json`.
- `node` requiere un nodo emparejado (aplicación complementaria o host de nodo sin cabeza).
- Si hay varios nodos disponibles, configure `exec.node` o `tools.exec.node` para seleccionar uno.
- `exec host=node` es la única ruta de ejecución de shell para nodos; el envoltorio heredado `nodes.run` se ha eliminado.
- `timeout` se aplica a la ejecución en primer plano, segundo plano, `yieldMs`, puerta de enlace, sandbox y nodo `system.run`. Si se omite, OpenClaw usa `tools.exec.timeoutSec`; `timeout: 0` explícito deshabilita el tiempo de espera del proceso exec para esa llamada.
- En hosts que no son Windows, exec usa `SHELL` cuando está configurado; si `SHELL` es `fish`, prefiere `bash` (o `sh`)
  de `PATH` para evitar scripts incompatibles con fish, luego recurre a `SHELL` si ninguno existe.
- En hosts Windows, exec prefiere el descubrimiento de PowerShell 7 (`pwsh`) (Archivos de programa, ProgramW6432, luego PATH),
  luego recurre a Windows PowerShell 5.1.
- En hosts de gateway que no sean Windows, los comandos exec de bash y zsh utilizan una instantánea de inicio. OpenClaw captura alias/funciones que se pueden obtener (sourceable) y un pequeño conjunto de entorno seguro desde los archivos de inicio del shell en `$OPENCLAW_STATE_DIR/cache/shell-snapshots/`, y luego obtiene (sources) esa instantánea antes de cada comando exec. Las variables que parezcan secretos se excluyen; la ejecución en sandbox y nodo no utiliza esta instantánea. Establezca `OPENCLAW_EXEC_SHELL_SNAPSHOT=0` en el entorno del proceso Gateway para deshabilitar esta ruta de instantánea.
- La ejecución en el host (`gateway`/`node`) rechaza `env.PATH` y las anulaciones del cargador (`LD_*`/`DYLD_*`) para evitar el secuestro de binarios o la inyección de código.
- OpenClaw establece `OPENCLAW_SHELL=exec` en el entorno del comando generado (incluida la ejecución PTY y sandbox) para que las reglas del shell/perfil puedan detectar el contexto de la herramienta de ejecución (exec-tool).
- `openclaw channels login` está bloqueado desde `exec` porque es un flujo de autenticación de canal interactivo; ejecútelo en una terminal en el host de puerta de enlace (gateway host) o utilice la herramienta de inicio de sesión nativa del canal desde el chat cuando exista una.
- Importante: el sandboxing está **desactivado por defecto**. Si el sandboxing está desactivado, `host=auto` implícito se resuelve en `gateway`. `host=sandbox` explícito aún falla de forma segura (closed) en lugar de ejecutarse silenciosamente en el host de puerta de enlace. Habilite el sandboxing o use `host=gateway` con aprobaciones.
- Las comprobaciones previas al vuelo de los scripts (para errores comunes de sintaxis de shell de Python/Node) solo inspeccionan archivos dentro del límite efectivo de `workdir`. Si una ruta de script se resuelve fuera de `workdir`, la verificación previa se omite para ese archivo.
- Para trabajos de larga duración que comienzan ahora, inícielos una vez y confíe en la reactivación automática de finalización cuando esté habilitada y el comando emita salida o falle. Use `process` para registros, estado, entrada o intervención; no emule la programación con bucles de suspensión, bucles de tiempo de espera o sondeo repetido.
- Para trabajos que deben ocurrir más tarde o según un programa, use cron en lugar de patrones de suspensión/retraso de `exec`.

## Config

- `tools.exec.notifyOnExit` (predeterminado: true): cuando es true, las sesiones exec en segundo plano ponen en cola un evento del sistema y solicitan un latido al salir.
- `tools.exec.approvalRunningNoticeMs` (predeterminado: 10000): emite un único aviso de "running" cuando una exec con aprobación se ejecuta durante más tiempo que este (0 desactiva).
- `tools.exec.timeoutSec` (predeterminado: 1800): tiempo de espera de exec predeterminado por comando en segundos. `timeout` por llamada lo anula; `timeout: 0` por llamada desactiva el tiempo de espera del proceso exec.
- `tools.exec.host` (predeterminado: `auto`; se resuelve a `sandbox` cuando el tiempo de ejecución de sandbox está activo, `gateway` en caso contrario)
- `tools.exec.security` (predeterminado: `deny` para sandbox, `full` para gateway + node cuando no está establecido)
- `tools.exec.ask` (predeterminado: `off`)
- La exec de host sin aprobación es el valor predeterminado para gateway + node. Si desea el comportamiento de aprobaciones/lista blanca, ajuste tanto `tools.exec.*` como el host `~/.openclaw/exec-approvals.json`; consulte [Exec approvals](/es/tools/exec-approvals#yolo-mode-no-approval).
- YOLO proviene de los valores predeterminados de la política de host (`security=full`, `ask=off`), no de `host=auto`. Si desea forzar el enrutamiento a gateway o node, configure `tools.exec.host` o use `/exec host=...`.
- En el modo `security=full` más `ask=off`, la exec de host sigue la política configurada directamente; no hay una capa heurística adicional de prefiltrado ofuscación de comandos ni de rechazo de prevuelo de script.
- `tools.exec.node` (predeterminado: sin establecer)
- `tools.exec.strictInlineEval` (predeterminado: false): cuando es true, los formularios de evaluación del intérprete en línea, como `python -c`, `node -e`, `ruby -e`, `perl -e`, `php -r`, `lua -e` y `osascript -e`, requieren revisor o aprobación explícita. En `mode=auto`, la ruta de aprobación exec normal puede permitir que el revisor automático nativo autorice un comando único claramente de bajo riesgo; las llamadas directas al host de nodo `system.run` aún requieren una aprobación explícita porque no pueden entregar el comando a una ruta de aprobación humana. Si el revisor lo solicita, la solicitud se envía a un humano. `allow-always` aún puede persistir invocaciones benignas de intérprete/guiones (scripts), pero los formularios de evaluación en línea no se convierten en reglas de permiso duraderas.
- `tools.exec.commandHighlighting` (predeterminado: false): cuando es true, las indicaciones de aprobación pueden resaltar los intervalos de comandos derivados del analizador en el texto del comando. Establézcalo en `true` globalmente o por agente para habilitar el resaltado del texto del comando sin cambiar la política de aprobación exec.
- `tools.exec.pathPrepend`: lista de directorios que se anteponen a `PATH` para ejecuciones exec (solo puerta de enlace + entorno limitado/sandbox).
- `tools.exec.safeBins`: binarios seguros que solo usan stdin y que pueden ejecutarse sin entradas explícitas en la lista de permitidos. Para obtener detalles sobre el comportamiento, consulte [Safe bins](/es/tools/exec-approvals-advanced#safe-bins-stdin-only).
- `tools.exec.safeBinTrustedDirs`: directorios explícitos adicionales de confianza para las verificaciones de ruta `safeBins`. Las entradas `PATH` nunca son de confianza automática. Los valores predeterminados integrados son `/bin` y `/usr/bin`.
- `tools.exec.safeBinProfiles`: política opcional personalizada de argv por binario seguro (`minPositional`, `maxPositional`, `allowedValueFlags`, `deniedFlags`).

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

- `host=gateway`: fusiona tu `PATH` de shell de inicio de sesión en el entorno de exec. Las anulaciones de `env.PATH` se
  rechazan para la ejecución en el host. El propio demonio todavía se ejecuta con un `PATH` mínimo:
  - macOS: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux: `/usr/local/bin`, `/usr/bin`, `/bin`
    - Para evitar que la configuración del shell del usuario (como `~/.zshenv` o `/etc/zshenv`) anule las rutas de prioridad durante el inicio, las entradas de `tools.exec.pathPrepend` se anteponen de forma segura al `PATH` final dentro del comando de shell justo antes de la ejecución.
- `host=sandbox`: ejecuta `sh -lc` (shell de inicio de sesión) dentro del contenedor, por lo que `/etc/profile` puede restablecer `PATH`.
  OpenClaw antepone `env.PATH` después de la obtención del perfil a través de una variable de entorno interna (sin interpolación de shell);
  `tools.exec.pathPrepend` también se aplica aquí.
- `host=node`: solo se envían al nodo las anulaciones de entorno no bloqueadas que pases. Las anulaciones de `env.PATH` se
  rechazan para la ejecución en el host y son ignoradas por los hosts de nodos. Si necesitas entradas PATH adicionales en un nodo,
  configura el entorno del servicio del host del nodo (systemd/launchd) o instala herramientas en ubicaciones estándar.

Vinculación de nodo por agente (usa el índice de la lista de agentes en la configuración):

```bash
openclaw config get agents.list
openclaw config set 'agents.list[0].tools.exec.node' "node-id-or-name"
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

`/exec` solo se respeta para **remitentes autorizados** (listas de permitidos/emparejamiento de canales más `commands.useAccessGroups`).
Actualiza **solo el estado de la sesión** y no escribe la configuración. Los remitentes externos autorizados de canales pueden
establecer estos valores predeterminados de sesión. Los clientes internos de puerta de enlace/webchat necesitan `operator.admin` para conservarlos.
Para desactivar permanentemente exec, denieguelo mediante la política de herramientas (`tools.deny: ["exec"]` o por agente). Las aprobaciones del host
siguen aplicándose a menos que establezca explícitamente `security=full` y `ask=off`.

## Aprobaciones de exec (aplicación complementaria / host del nodo)

Los agentes en entorno protegido pueden requerir aprobación por solicitud antes de que `exec` se ejecute en la puerta de enlace o en el host del nodo.
Consulte [Aprobaciones de exec](/es/tools/exec-approvals) para conocer la política, la lista de permitidos y el flujo de la interfaz de usuario.

Cuando se requieren aprobaciones, la herramienta exec devuelve inmediatamente
`status: "approval-pending"` y un ID de aprobación. Una vez aprobada (o denegada / caducada),
la puerta de enlace emite eventos de sistema de progreso y finalización del comando solo para las ejecuciones aprobadas
(`Exec running` / `Exec finished`). Las aprobaciones denegadas o caducadas son terminales y no
reactivan la sesión del agente con un evento de sistema de denegación.
En canales con tarjetas/botones de aprobación nativos, el agente debe confiar primero en esa
interfaz nativa y solo incluir un comando manual `/approve` cuando el resultado de la herramienta
diga explícitamente que las aprobaciones de chat no están disponibles o que la aprobación manual es la
única vía.

## Lista de permitidos + bins seguros

El cumplimiento manual de la lista de permitidos coincide con patrones glob de ruta binaria resuelta y patrones glob de nombre de comando simple. Los nombres simples coinciden solo con comandos invocados a través de PATH, por lo que `rg` puede coincidir con `/opt/homebrew/bin/rg` cuando el comando es `rg`, pero no con `./rg` o `/tmp/rg`.
Cuando `security=allowlist`, los comandos de shell se permiten automáticamente solo si cada segmento de la canalización está en la lista de permitidos o es un binario seguro. El encadenamiento (`;`, `&&`, `||`) y las redirecciones se rechazan en modo de lista de permitidos a menos que cada segmento de nivel superior satisfaga la lista de permitidos (incluyendo los bins seguros). Las redirecciones siguen sin ser compatibles.
La confianza duradera de `allow-always` no elude esa regla: un comando encadenado aún requiere que cada segmento de nivel superior coincida.

`autoAllowSkills` es una ruta de conveniencia separada en las aprobaciones de exec. No es lo mismo que las entradas manuales de la lista de permitidos de ruta. Para una confianza explícita estricta, mantenga `autoAllowSkills` deshabilitado.

Use los dos controles para diferentes trabajos:

- `tools.exec.safeBins`: filtros de flujo pequeños, solo de stdin.
- `tools.exec.safeBinTrustedDirs`: directorios adicionales de confianza explícita para rutas ejecutables de binarios seguros.
- `tools.exec.safeBinProfiles`: política argv explícita para bins seguros personalizados.
- allowlist: confianza explícita para rutas ejecutables.

No trate `safeBins` como una lista de permitidos genérica y no añada binarios de intérprete/tiempo de ejecución (por ejemplo `python3`, `node`, `ruby`, `bash`). Si necesita esos, use entradas explícitas en la lista de permitidos y mantenga las solicitudes de aprobación habilitadas.
`openclaw security audit` advierte cuando faltan perfiles explícitos para las entradas de intérprete/tiempo de ejecución `safeBins`, y `openclaw doctor --fix` puede generar entradas `safeBinProfiles` personalizadas faltantes.
`openclaw security audit` y `openclaw doctor` también advierten cuando añade explícitamente binarios de comportamiento amplio como `jq` de nuevo en `safeBins`.
Si permite explícitamente intérpretes, habilite `tools.exec.strictInlineEval` para que las formas de evaluación de código en línea aún requieran revisor o aprobación explícita.

Para obtener detalles completos de la política y ejemplos, consulte [Aprobaciones de ejecución](/es/tools/exec-approvals-advanced#safe-bins-stdin-only) y [Bins seguros frente a lista de permitidos](/es/tools/exec-approvals-advanced#safe-bins-versus-allowlist).

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

El sondeo es para el estado bajo demanda, no para bucles de espera. Si el despertar de finalización automática está habilitado, el comando puede despertar la sesión cuando emite salida o falla.

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

Pegar (entre corchetes por defecto):

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## apply_patch

`apply_patch` es una subherramienta de `exec` para ediciones estructuradas de múltiples archivos.
Está habilitada por defecto para los modelos de OpenAI y OpenAI Codex. Use la configuración solo cuando quiera deshabilitarla o restringirla a modelos específicos:

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

- Solo disponible para modelos OpenAI/OpenAI Codex.
- La política de herramientas aún se aplica; `allow: ["write"]` permite implícitamente `apply_patch`.
- `deny: ["write"]` no deniega `apply_patch`; deniegue `apply_patch` explícitamente o use `deny: ["group:fs"]` cuando las escrituras de parches también deban bloquearse.
- La configuración reside bajo `tools.exec.applyPatch`.
- `tools.exec.applyPatch.enabled` por defecto es `true`; establézcalo en `false` para desactivar la herramienta para los modelos de OpenAI.
- `tools.exec.applyPatch.workspaceOnly` por defecto es `true` (contenido en el espacio de trabajo). Establézcalo en `false` solo si desea intencionalmente que `apply_patch` escriba/elimine fuera del directorio del espacio de trabajo.

## Relacionado

- [Exec Approvals](/es/tools/exec-approvals) — compuertas de aprobación para comandos de shell
- [Sandboxing](/es/gateway/sandboxing) — ejecución de comandos en entornos aislados
- [Background Process](/es/gateway/background-process) — herramienta de ejecución y proceso de larga duración
- [Security](/es/gateway/security) — política de herramientas y acceso elevado
