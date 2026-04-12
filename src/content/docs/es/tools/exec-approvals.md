---
summary: "Aprobaciones de ejecución, listas de permitidos y avisos de escape del sandbox"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "Aprobaciones de ejecución"
---

# Aprobaciones de ejecución

Las aprobaciones de ejecución son el **barandal de la aplicación complementaria / host de nodo** para permitir que un agente en sandbox ejecute
comandos en un host real (`gateway` o `node`). Piénselo como un interbloqueo de seguridad:
los comandos se permiten solo cuando la política + lista de permitidos + aprobación (opcional) del usuario están todos de acuerdo.
Las aprobaciones de ejecución son **adicionales** a la política de herramientas y al filtrado elevado (a menos que elevated se establezca en `full`, lo que omite las aprobaciones).
La política efectiva es la **más estricta** de `tools.exec.*` y los valores predeterminados de aprobaciones; si se omite un campo de aprobaciones, se utiliza el valor `tools.exec`.
La ejecución en el host también utiliza el estado de aprobaciones locales en esa máquina. Un `ask: "always"` local del host
en `~/.openclaw/exec-approvals.json` sigue solicitando confirmación incluso si
los valores predeterminados de la sesión o la configuración solicitan `ask: "on-miss"`.
Use `openclaw approvals get`, `openclaw approvals get --gateway` o
`openclaw approvals get --node <id|name|ip>` para inspeccionar la política solicitada,
las fuentes de la política del host y el resultado efectivo.
Para la máquina local, `openclaw exec-policy show` expone la misma vista combinada y
`openclaw exec-policy set|preset` puede sincronizar la política solicitada local con el
archivo de aprobaciones del host local en un solo paso. Cuando un ámbito local solicita `host=node`,
`openclaw exec-policy show` informa ese ámbito como gestionado por el nodo en tiempo de ejecución en lugar de
fingir que el archivo de aprobaciones local es la fuente efectiva de verdad.

Si la interfaz de usuario de la aplicación complementaria **no está disponible**, cualquier solicitud que requiera un aviso se
resuelve mediante la **alternativa de consulta (ask fallback)** (predeterminado: denegar).

Los clientes nativos de aprobación de chat también pueden exponer funciones específicas del canal en el
mensaje de aprobación pendiente. Por ejemplo, Matrix puede sembrar accesos directos de reacción en el
prompt de aprobación (`✅` permitir una vez, `❌` denegar y `♾️` permitir siempre cuando esté disponible)
mientras sigue dejando los comandos `/approve ...` en el mensaje como alternativa.

## Dónde se aplica

Las aprobaciones de ejecución se hacen cumplir localmente en el host de ejecución:

- **host de puerta de enlace** → proceso `openclaw` en la máquina de puerta de enlace
- **host de nodo** → node runner (aplicación complementaria de macOS o host de nodo sin interfaz gráfica)

Nota sobre el modelo de confianza:

- Los llamantes autenticados por la puerta de enlace son operadores de confianza para esa puerta de enlace.
- Los nodos emparejados extienden esa capacidad de operador de confianza al host de nodo.
- Las aprobaciones de ejecución reducen el riesgo de ejecución accidental, pero no son un límite de autenticación por usuario.
- Las ejecuciones aprobadas de nodo-anfitrión vinculan el contexto de ejecución canónico: cwd canónico, argv exacto, vinculación de env cuando está presente, y ruta de ejecutable fijada cuando corresponde.
- Para scripts de shell e invocaciones directas de archivos de intérprete/runtime, OpenClaw también intenta vincular un operando de archivo local concreto. Si ese archivo vinculado cambia después de la aprobación pero antes de la ejecución, la ejecución se deniega en lugar de ejecutar el contenido modificado.
- Esta vinculación de archivos es intencionalmente de mejor esfuerzo, no un modelo semántico completo de cada ruta de cargador de intérprete/runtime. Si el modo de aprobación no puede identificar exactamente un archivo local concreto para vincular, se niega a crear una ejecución respaldada por aprobación en lugar de pretender una cobertura completa.

División de macOS:

- **node host service** reenvía `system.run` a la **macOS app** a través de IPC local.
- La **aplicación macOS** hace cumplir las aprobaciones + ejecuta el comando en el contexto de la interfaz de usuario.

## Configuración y almacenamiento

Las aprobaciones residen en un archivo JSON local en el host de ejecución:

`~/.openclaw/exec-approvals.json`

Esquema de ejemplo:

```json
{
  "version": 1,
  "socket": {
    "path": "~/.openclaw/exec-approvals.sock",
    "token": "base64url-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny",
    "autoAllowSkills": false
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "askFallback": "deny",
      "autoAllowSkills": true,
      "allowlist": [
        {
          "id": "B0C8C0B3-2C2D-4F8A-9A3C-5A4B3C2D1E0F",
          "pattern": "~/Projects/**/bin/rg",
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## Modo "YOLO" sin aprobación

Si desea que la ejecución en el host se ejecute sin mensajes de aprobación, debe abrir **ambas** capas de política:

- política de ejecución solicitada en la configuración de OpenClaw (`tools.exec.*`)
- política de aprobaciones local del host en `~/.openclaw/exec-approvals.json`

Este es ahora el comportamiento predeterminado del host a menos que lo restrinja explícitamente:

- `tools.exec.security`: `full` en `gateway`/`node`
- `tools.exec.ask`: `off`
- host `askFallback`: `full`

Distinción importante:

- `tools.exec.host=auto` elige dónde se ejecuta exec: sandbox cuando está disponible, de lo contrario gateway.
- YOLO elige cómo se aprueba el exec del host: `security=full` más `ask=off`.
- En modo YOLO, OpenClaw no añade una puerta de aprobación heurística separada de ofuscación de comandos encima de la política de ejecución del host configurada.
- `auto` no convierte el enrutamiento de gateway en una anulación gratuita desde una sesión en sandbox. Se permite una solicitud `host=node` por llamada desde `auto`, y `host=gateway` solo se permite desde `auto` cuando no hay un tiempo de ejecución de sandbox activo. Si desea un valor predeterminado no automático estable, establezca `tools.exec.host` o use `/exec host=...` explícitamente.

Si desea una configuración más conservadora, restrinja cualquier capa nuevamente a `allowlist` / `on-miss`
o `deny`.

Configuración persistente de "nunca preguntar" en host de puerta de enlace:

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
openclaw gateway restart
```

Luego configure el archivo de aprobaciones del host para que coincida:

```bash
openclaw approvals set --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

Acceso directo local para la misma política de gateway-host en la máquina actual:

```bash
openclaw exec-policy preset yolo
```

Ese acceso directo local actualiza ambos:

- `tools.exec.host/security/ask` local
- valores predeterminados locales de `~/.openclaw/exec-approvals.json`

Es intencionalmente solo local. Si necesita cambiar las aprobaciones de gateway-host o node-host
de forma remota, continúe usando `openclaw approvals set --gateway` o
`openclaw approvals set --node <id|name|ip>`.

Para un nodo host, aplique el mismo archivo de aprobaciones en ese nodo en su lugar:

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

Limitación importante solo local:

- `openclaw exec-policy` no sincroniza las aprobaciones del nodo
- `openclaw exec-policy set --host node` se rechaza
- las aprobaciones de ejecución del nodo se obtienen del nodo en tiempo de ejecución, por lo que las actualizaciones dirigidas al nodo deben usar `openclaw approvals --node ...`

Acceso directo solo para la sesión:

- `/exec security=full ask=off` cambia solo la sesión actual.
- `/elevated full` es un atajo de ruptura de cristal que también omite las aprobaciones de ejecución para esa sesión.

Si el archivo de aprobaciones del host permanece más estricto que la configuración, la política del host más estricta prevalece.

## Perillas de política

### Seguridad (`exec.security`)

- **deny**: bloquear todas las solicitudes de ejecución del host.
- **allowlist**: permitir solo los comandos en la lista de permitidos.
- **full**: permitir todo (equivalente a elevado).

### Preguntar (`exec.ask`)

- **off**: nunca preguntar.
- **on-miss**: preguntar solo cuando la lista de permitidos no coincida.
- **always**: preguntar en cada comando.
- La confianza duradera de `allow-always` no suprime las solicitudes cuando el modo de pregunta efectivo es `always`

### Reserva de pregunta (`askFallback`)

Si se requiere una solicitud pero no se puede acceder a ninguna interfaz de usuario, la reserva decide:

- **deny**: bloquear.
- **allowlist**: permitir solo si coincide con la lista de permitidos.
- **full**: permitir.

### Endurecimiento de evaluación del intérprete en línea (`tools.exec.strictInlineEval`)

Cuando `tools.exec.strictInlineEval=true`, OpenClaw trata los formularios de evaluación de código en línea como de solo aprobación, incluso si el binario del intérprete en sí está en la lista de permitidos.

Ejemplos:

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

Esta es una defensa en profundidad para los cargadores de intérpretes que no se asignan limpiamente a un solo operando de archivo estable. En modo estricto:

- estos comandos aún necesitan aprobación explícita;
- `allow-always` no persiste automáticamente nuevas entradas en la lista de permitidos para ellos.

## Lista de permitidos (por agente)

Las listas de permitidos son **por agente**. Si existen varios agentes, cambia a qué agente estás
editando en la aplicación macOS. Los patrones son **coincidencias glob que no distinguen entre mayúsculas y minúsculas**.
Los patrones deben resolverse a **rutas binarias** (se ignoran las entradas con solo nombre base).
Las entradas heredadas `agents.default` se migran a `agents.main` al cargar.
Las cadenas de shell como `echo ok && pwd` aún necesitan que cada segmento de nivel superior satisfaga las reglas de la lista de permitidos.

Ejemplos:

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

Cada entrada de la lista blanca rastrea:

- **id** UUID estable utilizado para la identidad de la interfaz de usuario (opcional)
- marca de tiempo de **último uso**
- último comando utilizado
- última ruta resuelta

## Permitir automáticamente las CLIs de habilidades

Cuando **Permitir automáticamente las CLIs de habilidades** está habilitado, los ejecutables referenciados por habilidades conocidas
se tratan como incluidos en la lista blanca en los nodos (nodo macOS o host de nodo headless). Esto usa
`skills.bins` a través de la RPC de Gateway para obtener la lista de binarios de habilidades. Deshabilite esto si desea listas blancas manuales estrictas.

Notas importantes de confianza:

- Esta es una **lista blanca de conveniencia implícita**, separada de las entradas manuales de la lista blanca de rutas.
- Está destinada a entornos de operadores de confianza donde Gateway y el nodo están en el mismo límite de confianza.
- Si requiere una confianza explícita estricta, mantenga `autoAllowSkills: false` y use solo entradas manuales de la lista blanca de rutas.

## Bins seguros (solo stdin)

`tools.exec.safeBins` define una pequeña lista de binarios **solo de stdin** (por ejemplo `cut`)
que pueden ejecutarse en modo de lista de permitidos **sin** entradas explícitas en la lista de permitidos. Los binarios seguros rechazan
argumentos de archivo posicionales y tokens tipo ruta, por lo que solo pueden operar en el flujo de entrada.
Trátelo como una ruta rápida estrecha para filtros de flujo, no como una lista de confianza general.
**No** añada binarios de intérprete o de tiempo de ejecución (por ejemplo `python3`, `node`, `ruby`, `bash`, `sh`, `zsh`) a `safeBins`.
Si un comando puede evaluar código, ejecutar subcomandos o leer archivos por diseño, prefiera entradas explícitas en la lista de permitidos y mantenga las solicitudes de aprobación habilitadas.
Los binarios seguros personalizados deben definir un perfil explícito en `tools.exec.safeBinProfiles.<bin>`.
La validación es determinista solo a partir de la forma de argv (sin comprobaciones de existencia en el sistema de archivos del host), lo que
previene el comportamiento de oráculo de existencia de archivo por diferencias de permitir/denegar.
Las opciones orientadas a archivos se deniegan para los binarios seguros predeterminados (por ejemplo `sort -o`, `sort --output`,
`sort --files0-from`, `sort --compress-program`, `sort --random-source`,
`sort --temporary-directory`/`-T`, `wc --files0-from`, `jq -f/--from-file`,
`grep -f/--file`).
Los binarios seguros también aplican una política explícita de indicadores por binario para las opciones que rompen el comportamiento
solo de stdin (por ejemplo `sort -o/--output/--compress-program` y los indicadores recursivos de grep).
Las opciones largas se validan con cierre por fallo en modo de binario seguro: los indicadores desconocidos y las
abreviaturas ambiguas se rechazan.
Indicadores denegados por perfil de binario seguro:

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`: `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

Los bins seguros también fuerzan que los tokens argv se traten como **texto literal** en el momento de la ejecución (sin globalización y sin expansión de `$VARS`) para los segmentos solo de stdin, por lo que patrones como `*` o `$HOME/...` no pueden usarse para introducir lecturas de archivos de contrabando.
Los bins seguros también deben resolverse desde directorios binarios de confianza (valores predeterminados del sistema más `tools.exec.safeBinTrustedDirs` opcionales). Las entradas de `PATH` nunca son de confianza automática.
Los directorios seguros de bins de confianza predeterminados son intencionalmente mínimos: `/bin`, `/usr/bin`.
Si su ejecutable safe-bin vive en rutas de gestor de paquetes/usuario (por ejemplo `/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`), agréguelos explícitamente a `tools.exec.safeBinTrustedDirs`.
El encadenamiento de shell y las redirecciones no se permiten automáticamente en el modo de lista de permitidos.

El encadenamiento de shell (`&&`, `||`, `;`) está permitido cuando cada segmento de nivel superior cumpla con la lista de permitidos
(incluyendo bins seguros o permiso automático de habilidades). Las redirecciones siguen sin ser compatibles en el modo de lista de permitidos.
La sustitución de comandos (`$()` / comillas invertidas) se rechaza durante el análisis de la lista de permitidos, incluyendo dentro
de comillas dobles; use comillas simples si necesita texto literal `$()`.
En las aprobaciones de la aplicación complementaria de macOS, el texto de shell sin procesar que contenga sintaxis de control o expansión de shell
(`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) se trata como un fallo en la lista de permitidos a menos que
el binario del shell en sí esté en la lista de permitidos.
Para los contenedores de shell (`bash|sh|zsh ... -c/-lc`), las anulaciones de env con alcance de solicitud se reducen a una
pequeña lista de permitidos explícita (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
Para las decisiones de permitir siempre en el modo de lista de permitidos, los contenedores de despacho conocidos
(`env`, `nice`, `nohup`, `stdbuf`, `timeout`) persisten las rutas ejecutables internas en lugar de las rutas de los contenedores.
Los multiplexores de shell (`busybox`, `toybox`) también se desenvuelven para los applets de shell (`sh`, `ash`,
etc.) de modo que los ejecutables internos se persisten en lugar de los binarios multiplexores. Si un contenedor o
multiplexor no puede desenvolverse de manera segura, no se persiste ninguna entrada en la lista de permitidos automáticamente.
Si incluye en la lista de permitidos intérpretes como `python3` o `node`, prefiera `tools.exec.strictInlineEval=true` para que la evaluación en línea aún requiera una aprobación explícita. En el modo estricto, `allow-always` aún puede persistir invocaciones benignas de intérprete/guion, pero los transportadores de evaluación en línea no se persisten automáticamente.

Bins seguros predeterminados:

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` y `sort` no están en la lista predeterminada. Si optas por incluirlos, mantén entradas explícitas en la lista de permitidos para
sus flujos de trabajo que no sean stdin.
Para `grep` en modo bin seguro, proporciona el patrón con `-e`/`--regexp`; el formato de patrón posicional es
rechazado para que los operandos de archivo no puedan ser introducidos de contrabando como posicionales ambiguos.

### Bins seguros versus lista de permitidos

| Tema                 | `tools.exec.safeBins`                                                 | Lista de permitidos (`exec-approvals.json`)                                          |
| -------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Objetivo             | Permitir automáticamente filtros stdin estrechos                      | Confiar explícitamente en ejecutables específicos                                    |
| Tipo de coincidencia | Nombre del ejecutable + política argv de bin seguro                   | Patrón global de ruta de ejecutable resuelto                                         |
| Ámbito del argumento | Restringido por el perfil de bin seguro y las reglas de token literal | Coincidencia de ruta solamente; los argumentos son, por lo demás, su responsabilidad |
| Ejemplos típicos     | `head`, `tail`, `tr`, `wc`                                            | `jq`, `python3`, `node`, `ffmpeg`, CLIs personalizadas                               |
| Mejor uso            | Transformaciones de texto de bajo riesgo en canalizaciones            | Cualquier herramienta con comportamiento más amplio o efectos secundarios            |

Ubicación de configuración:

- `safeBins` proviene de la configuración (`tools.exec.safeBins` o por agente `agents.list[].tools.exec.safeBins`).
- `safeBinTrustedDirs` proviene de la configuración (`tools.exec.safeBinTrustedDirs` o por agente `agents.list[].tools.exec.safeBinTrustedDirs`).
- `safeBinProfiles` proviene de la configuración (`tools.exec.safeBinProfiles` o por agente `agents.list[].tools.exec.safeBinProfiles`). Las claves de perfil por agente anulan las claves globales.
- las entradas de allowlist residen en `~/.openclaw/exec-approvals.json` local del host bajo `agents.<id>.allowlist` (o vía Control UI / `openclaw approvals allowlist ...`).
- `openclaw security audit` advierte con `tools.exec.safe_bins_interpreter_unprofiled` cuando los binarios del intérprete/ejecución aparecen en `safeBins` sin perfiles explícitos.
- `openclaw doctor --fix` puede generar entradas `safeBinProfiles.<bin>` personalizadas faltantes como `{}` (revísalo y ajústalo después). Los binarios del intérprete/ejecución no se generan automáticamente.

Ejemplo de perfil personalizado:

```json5
{
  tools: {
    exec: {
      safeBins: ["jq", "myfilter"],
      safeBinProfiles: {
        myfilter: {
          minPositional: 0,
          maxPositional: 0,
          allowedValueFlags: ["-n", "--limit"],
          deniedFlags: ["-f", "--file", "-c", "--command"],
        },
      },
    },
  },
}
```

Si optas explícitamente por incluir `jq` en `safeBins`, OpenClaw aún rechaza la función integrada `env` en el modo de
binarios seguros, para que `jq -n env` no pueda volcar el entorno del proceso del host sin una ruta de lista de permitidos
explícita o un mensaje de aprobación.

## Edición de la interfaz de usuario de Control

Usa la tarjeta **Control UI → Nodes → Exec approvals** para editar los valores predeterminados, las anulaciones por agente
y las listas de permitidos. Elige un ámbito (Defaults o un agente), ajusta la política,
agrega/elimina patrones de lista de permitidos y luego haz clic en **Save**. La interfaz muestra metadatos de **último uso**
por patrón para que puedas mantener la lista ordenada.

El selector de destino elige **Gateway** (aprobaciones locales) o un **Node**. Los nodos
deben anunciar `system.execApprovals.get/set` (aplicación macOS o host de nodo sin interfaz).
Si un nodo aún no anuncia aprobaciones de ejecución, edita su
`~/.openclaw/exec-approvals.json` local directamente.

CLI: `openclaw approvals` admite la edición de gateway o nodo (consulta [Approvals CLI](/en/cli/approvals)).

## Flujo de aprobación

Cuando se requiere un mensaje, el gateway transmite `exec.approval.requested` a los clientes del operador.
La interfaz de Control y la aplicación macOS lo resuelven mediante `exec.approval.resolve`, y luego el gateway reenvía la
solicitud aprobada al host del nodo.

Para `host=node`, las solicitudes de aprobación incluyen una carga útil canónica `systemRunPlan`. El gateway usa
ese plan como contexto autoritativo de comando/cwd/sesión al reenviar solicitudes `system.run`
aprobadas.

Esto es importante para la latencia de aprobación asíncrona:

- la ruta de ejecución del nodo prepara un plan canónico por adelantado
- el registro de aprobación almacena ese plan y sus metadatos de vinculación
- una vez aprobada, la llamada final reenviada `system.run` reutiliza el plan almacenado
  en lugar de confiar en ediciones posteriores de la persona que llama
- si el llamante cambia `command`, `rawCommand`, `cwd`, `agentId`, o
  `sessionKey` después de que se creó la solicitud de aprobación, la puerta de enlace rechaza la
  ejecución reenviada como una discrepancia de aprobación

## Comandos de intérprete/tiempo de ejecución

Las ejecuciones de intérprete/tiempo de ejecución respaldadas por aprobaciones son intencionalmente conservadoras:

- El contexto exacto de argv/cwd/env siempre está vinculado.
- Las formas de script de shell directo y de archivo de tiempo de ejecución directo se vinculan, como mejor esfuerzo, a una instantánea concreta de
  un archivo local.
- Las formas comunes de contenedor de gestores de paquetes que aún se resuelven en un archivo local directo (por ejemplo
  `pnpm exec`, `pnpm node`, `npm exec`, `npx`) se desenvuelven antes del vinculamiento.
- Si OpenClaw no puede identificar exactamente un archivo local concreto para un comando de intérprete/tiempo de ejecución
  (por ejemplo, scripts de paquete, formas de evaluación, cadenas de cargadores específicas del tiempo de ejecución, o formas ambiguas de
  múltiples archivos), la ejecución respaldada por aprobaciones se deniega en lugar de reclamar una cobertura semántica que no
  posee.
- Para esos flujos de trabajo, prefiera el sandboxing, un límite de host separado, o una lista de permitidos/explicito confiable de
  flujo de trabajo completo donde el operador acepte las semánticas más amplias del tiempo de ejecución.

Cuando se requieren aprobaciones, la herramienta exec regresa inmediatamente con un id de aprobación. Use ese id para
correlacionar eventos posteriores del sistema (`Exec finished` / `Exec denied`). Si no llega ninguna decisión antes de que
el tiempo de espera se agote, la solicitud se trata como un tiempo de espera de aprobación y se presenta como un motivo de denegación.

### Comportamiento de entrega de seguimiento

Después de que finaliza un exec asíncrono aprobado, OpenClaw envía un turno de seguimiento `agent` a la misma sesión.

- Si existe un destino de entrega externo válido (canal entregable más destino `to`), la entrega de seguimiento usa ese canal.
- En flujos solo de webchat o de sesión interna sin destino externo, la entrega de seguimiento se mantiene solo en la sesión (`deliver: false`).
- Si un llamante solicita explícitamente una entrega externa estricta sin ningún canal externo resoluble, la solicitud falla con `INVALID_REQUEST`.
- Si `bestEffortDeliver` está habilitado y no se puede resolver ningún canal externo, la entrega se degrada a solo sesión en lugar de fallar.

El cuadro de diálogo de confirmación incluye:

- comando + argumentos
- directorio de trabajo (cwd)
- id del agente
- ruta del ejecutable resuelta
- host + metadatos de la política

Acciones:

- **Permitir una vez** → ejecutar ahora
- **Permitir siempre** → añadir a la lista de permitidos + ejecutar
- **Denegar** → bloquear

## Reenvío de aprobaciones a canales de chat

Puede reenviar los mensajes de aprobación de ejecución a cualquier canal de chat (incluidos los canales de complementos) y aprobarlos
con `/approve`. Esto utiliza la canalización de entrega saliente normal.

Configuración:

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "session", // "session" | "targets" | "both"
      agentFilter: ["main"],
      sessionFilter: ["discord"], // substring or regex
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" },
      ],
    },
  },
}
```

Respuesta en el chat:

```
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

El comando `/approve` maneja tanto las aprobaciones de ejecución como las de complementos. Si el ID no coincide con una aprobación de ejecución pendiente, automáticamente verifica las aprobaciones de complementos en su lugar.

### Reenvío de aprobaciones de complementos

El reenvío de aprobaciones de complementos utiliza la misma canalización de entrega que las aprobaciones de ejecución, pero tiene su propia
configuración independiente bajo `approvals.plugin`. Habilitar o deshabilitar uno no afecta al otro.

```json5
{
  approvals: {
    plugin: {
      enabled: true,
      mode: "targets",
      agentFilter: ["main"],
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" },
      ],
    },
  },
}
```

La forma de la configuración es idéntica a `approvals.exec`: `enabled`, `mode`, `agentFilter`,
`sessionFilter` y `targets` funcionan de la misma manera.

Los canales que admiten respuestas interactivas compartidas representan los mismos botones de aprobación tanto para las aprobaciones de ejecución como
para las de complementos. Los canales sin interfaz de usuario interactiva compartida recurren a texto sin formato con `/approve`
de instrucciones.

### Aprobaciones en el mismo chat en cualquier canal

Cuando una solicitud de aprobación de ejecución o complemento se origina en una superficie de chat entregable, el mismo chat
ahora puede aprobarla con `/approve` de forma predeterminada. Esto se aplica a canales como Slack, Matrix y
Microsoft Teams, además de los flujos existentes de la interfaz de usuario web y la interfaz de usuario de terminal.

Esta ruta compartida de comandos de texto utiliza el modelo de autenticación de canal normal para esa conversación. Si el
chat de origen ya puede enviar comandos y recibir respuestas, las solicitudes de aprobación ya no necesitan
un adaptador de entrega nativo separado solo para permanecer pendientes.

Discord y Telegram también admiten `/approve` en el mismo chat, pero esos canales aún usan su
lista de aprobadores resuelta para la autorización incluso cuando la entrega de aprobación nativa está deshabilitada.

Para Telegram y otros clientes de aprobación nativa que llaman al Gateway directamente,
esta alternativa se limita intencionalmente a los fallos de "aprobación no encontrada". Una denegación
o error real de aprobación de ejecución no se reintenta silenciosamente como una aprobación de complemento.

### Entrega de aprobación nativa

Algunos canales también pueden actuar como clientes de aprobación nativa. Los clientes nativos añaden MD de aprobadores, difusión al chat de origen
y una experiencia interactiva de aprobación específica del canal además del flujo compartido de `/approve` en el mismo chat.

Cuando están disponibles las tarjetas/botones de aprobación nativos, esa interfaz de usuario nativa es la ruta principal
orientada al agente. El agente no debe repetir también un comando `/approve` de chat plano duplicado, a menos que el resultado de la herramienta indique que las aprobaciones de chat no están disponibles o
que la aprobación manual es la única ruta restante.

Modelo genérico:

- la política de ejecución del host aún decide si se requiere la aprobación de ejecución
- `approvals.exec` controla el reenvío de solicitudes de aprobación a otros destinos de chat
- `channels.<channel>.execApprovals` controla si ese canal actúa como un cliente de aprobación nativo

Los clientes de aprobación nativa habilitan automáticamente la entrega prioritaria por MD cuando se cumplen todos estos:

- el canal admite la entrega de aprobación nativa
- los aprobadores se pueden resolver desde `execApprovals.approvers` explícitos o desde las
  fuentes alternativas documentadas de ese canal
- `channels.<channel>.execApprovals.enabled` no está configurado o es `"auto"`

Establezca `enabled: false` para deshabilitar explícitamente un cliente de aprobación nativo. Establezca `enabled: true` para forzarlo
cuando se resuelvan los aprobadores. La entrega pública al chat de origen permanece explícita a través de
`channels.<channel>.execApprovals.target`.

Preguntas frecuentes: [¿Por qué hay dos configuraciones de aprobación de ejecución para las aprobaciones de chat?](/en/help/faq#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord: `channels.discord.execApprovals.*`
- Slack: `channels.slack.execApprovals.*`
- Telegram: `channels.telegram.execApprovals.*`

Estos clientes de aprobación nativos añaden enrutamiento por MD y difusión opcional del canal además del flujo compartido
de `/approve` en el mismo chat y botones de aprobación compartidos.

Comportamiento compartido:

- Slack, Matrix, Microsoft Teams y chats entregables similares usan el modelo de autenticación de canal normal
  para el mismo chat `/approve`
- cuando un cliente de aprobación nativo se habilita automáticamente, el objetivo de entrega nativo predeterminado son los MD de los aprobadores
- para Discord y Telegram, solo los aprobadores resueltos pueden aprobar o denegar
- los aprobadores de Discord pueden ser explícitos (`execApprovals.approvers`) o inferidos de `commands.ownerAllowFrom`
- los aprobadores de Telegram pueden ser explícitos (`execApprovals.approvers`) o inferidos de la configuración de propietario existente (`allowFrom`, además de mensaje directo `defaultTo` cuando sea compatible)
- los aprobadores de Slack pueden ser explícitos (`execApprovals.approvers`) o inferidos de `commands.ownerAllowFrom`
- los botones nativos de Slack preservan el tipo de ID de aprobación, por lo que los ID `plugin:` pueden resolver aprobaciones de complementos
  sin una segunda capa de reserva local de Slack
- el enrutamiento nativo de DM/canal de Matrix y los atajos de reacción manejan tanto las aprobaciones de ejecución como las de complementos;
  la autorización del complemento aún proviene de `channels.matrix.dm.allowFrom`
- el solicitante no necesita ser un aprobador
- el chat de origen puede aprobar directamente con `/approve` cuando ese chat ya admite comandos y respuestas
- los botones de aprobación nativos de Discord se enrutan por tipo de ID de aprobación: los ID `plugin:` van
  directamente a las aprobaciones de complementos, todo lo demás va a las aprobaciones de ejecución
- los botones de aprobación nativos de Telegram siguen la misma reserva de ejecución a complemento limitada que `/approve`
- cuando la entrega al chat de origen habilitada por `target` nativo, los mensajes de aprobación incluyen el texto del comando
- las aprobaciones de ejecución pendientes caducan después de 30 minutos de forma predeterminada
- si ninguna interfaz de usuario de operador o cliente de aprobación configurado puede aceptar la solicitud, el mensaje recurre a `askFallback`

Telegram por defecto usa los MD de los aprobadores (`target: "dm"`). Puede cambiar a `channel` o `both` cuando usted
quiera que los mensajes de aprobación también aparezcan en el chat/tema de Telegram de origen. Para los temas de foro
de Telegram, OpenClaw preserva el tema para el mensaje de aprobación y el seguimiento posterior a la aprobación.

Ver:

- [Discord](/en/channels/discord)
- [Telegram](/en/channels/telegram)

### Flujo de IPC de macOS

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

Notas de seguridad:

- Modo de socket Unix `0600`, token almacenado en `exec-approvals.json`.
- Verificación de pares del mismo UID.
- Desafío/respuesta (nonce + token HMAC + hash de solicitud) + TTL corto.

## Eventos del sistema

El ciclo de vida de Exec se muestra como mensajes del sistema:

- `Exec running` (solo si el comando excede el umbral de aviso de ejecución)
- `Exec finished`
- `Exec denied`

Estos se publican en la sesión del agente después de que el nodo reporta el evento.
Las aprobaciones de ejecución alojadas en el Gateway emiten los mismos eventos de ciclo de vida cuando el comando finaliza (y opcionalmente cuando se ejecuta más tiempo que el umbral).
Las ejecuciones con restricción de aprobación reutilizan el id de aprobación como el `runId` en estos mensajes para una fácil correlación.

## Comportamiento de aprobación denegada

Cuando se deniega una aprobación de ejecución asíncrona, OpenClaw evita que el agente reutilice
la salida de cualquier ejecución anterior del mismo comando en la sesión. El motivo de la denegación
se pasa con una guía explícita de que no hay salida de comando disponible, lo que impide
que el agente afirme que hay una nueva salida o repita el comando denegado con
resultados obsoletos de una ejecución exitosa anterior.

## Implicaciones

- **full** es potente; prefiera las listas de permitidos (allowlists) cuando sea posible.
- **ask** le mantiene informado y al mismo tiempo permite aprobaciones rápidas.
- Las listas de permitidos por agente evitan que las aprobaciones de un agente se filtren a otros.
- Las aprobaciones solo se aplican a las solicitudes de ejecución del host de **remitentes autorizados**. Los remitentes no autorizados no pueden emitir `/exec`.
- `/exec security=full` es una conveniencia a nivel de sesión para operadores autorizados y omite aprobaciones por diseño.
  Para bloquear completamente la ejecución en el host, establezca la seguridad de aprobaciones en `deny` o deniegue la herramienta `exec` mediante la política de herramientas.

Relacionado:

- [Herramienta Exec](/en/tools/exec)
- [Modo elevado](/en/tools/elevated)
- [Habilidades (Skills)](/en/tools/skills)

## Relacionado

- [Exec](/en/tools/exec) — herramienta de ejecución de comandos de shell
- [Sandboxing](/en/gateway/sandboxing) — modos de sandbox y acceso al espacio de trabajo
- [Seguridad](/en/gateway/security) — modelo de seguridad y endurecimiento
- [Sandbox frente a Política de herramientas frente a Elevado](/en/gateway/sandbox-vs-tool-policy-vs-elevated) — cuándo usar cada uno
