---
summary: "Aprobaciones de ejecución, listas de permitidos y mensajes de escape del entorno limitado"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "Aprobaciones de ejecución"
---

# Aprobaciones de ejecución

Las aprobaciones de ejecución son el **mecanismo de protección de la aplicación complementaria / host del nodo** para permitir que un agente en entorno limitado ejecute comandos en un host real (`gateway` o `node`). Piénselo como un bloqueo de seguridad de interconexión: los comandos solo se permiten cuando la política + lista de permitidos + (opcional) aprobación del usuario están todos de acuerdo. Las aprobaciones de ejecución son **adicionales** a la política de herramientas y al control de acceso elevado (a menos que elevated se establezca en `full`, lo que omite las aprobaciones). La política efectiva es la **más estricta** de `tools.exec.*` y los valores predeterminados de aprobaciones; si se omite un campo de aprobaciones, se utiliza el valor `tools.exec`.

Si la interfaz de usuario de la aplicación complementaria **no está disponible**, cualquier solicitud que requiera un aviso se
resuelve mediante la **alternativa de consulta (ask fallback)** (predeterminado: denegar).

## Dónde se aplica

Las aprobaciones de ejecución se aplican localmente en el host de ejecución:

- **host de puerta de enlace** → proceso `openclaw` en la máquina de puerta de enlace
- **host de nodo** → node runner (aplicación complementaria de macOS o host de nodo sin interfaz gráfica)

Nota sobre el modelo de confianza:

- Los llamadores autenticados por la puerta de enlace son operadores de confianza para esa puerta de enlace (Gateway).
- Los nodos emparejados extienden esa capacidad de operador de confianza al host del nodo.
- Las aprobaciones de ejecución reducen el riesgo de ejecución accidental, pero no son un límite de autenticación por usuario.
- Las ejecuciones aprobadas en el host del nodo vinculan el contexto de ejecución canónico: cwd canónico, argv exacto, vinculación
  de env cuando está presente y ruta ejecutable anclada cuando corresponde.
- Para scripts de shell e invocaciones directas de archivos de intérprete/tiempo de ejecución, OpenClaw también intenta vincular
  un operando de archivo local concreto. Si ese archivo vinculado cambia después de la aprobación pero antes de la ejecución,
  la ejecución se deniega en lugar de ejecutar el contenido modificado.
- Esta vinculación de archivos es intencionalmente sobre la base del mejor esfuerzo, no un modelo semántico completo de cada
  ruta de cargador de intérprete/tiempo de ejecución. Si el modo de aprobación no puede identificar exactamente un archivo local
  concreto para vincular, se niega a crear una ejecución respaldada por aprobación en lugar de pretender una cobertura completa.

División de macOS:

- **servicio de host de nodo** reenvía `system.run` a la **aplicación macOS** a través de IPC local.
- La **aplicación macOS** impone aprobaciones y ejecuta el comando en el contexto de la interfaz de usuario.

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

## Permisos de política

### Seguridad (`exec.security`)

- **deny** (denegar): bloquear todas las solicitudes de ejecución en el host.
- **allowlist** (lista de permitidos): permitir solo los comandos en la lista de permitidos.
- **full** (completo): permitir todo (equivalente a elevado).

### Preguntar (`exec.ask`)

- **off** (desactivado): nunca preguntar.
- **on-miss** (al fallar): preguntar solo cuando la lista de permitidos no coincida.
- **always** (siempre): preguntar en cada comando.

### Alternativa de preguntar (`askFallback`)

Si se requiere una pregunta pero no se puede alcanzar ninguna interfaz de usuario, la alternativa decide:

- **deny** (denegar): bloquear.
- **allowlist** (lista de permitidos): permitir solo si la lista de permitidos coincide.
- **full** (completo): permitir.

### Endurecimiento de la evaluación del intérprete en línea (`tools.exec.strictInlineEval`)

Cuando `tools.exec.strictInlineEval=true`, OpenClaw trata los formularios de evaluación de código en línea como solo de aprobación, incluso si el binario del intérprete mismo está en la lista de permitidos.

Ejemplos:

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

Esto es una defensa en profundidad para los cargadores de intérpretes que no se asignan claramente a un solo operando de archivo estable. En modo estricto:

- estos comandos aún necesitan aprobación explícita;
- `allow-always` no guarda automáticamente nuevas entradas en la lista de permitidos para ellas.

## Lista de permitidos (por agente)

Las listas de permitidos son **por agente**. Si existen varios agentes, cambie el agente que está editando en la aplicación macOS. Los patrones son **coincidencias glob que no distinguen entre mayúsculas y minúsculas**. Los patrones deben resolverse a **rutas binarias** (se ignoran las entradas con solo el nombre base). Las entradas heredadas `agents.default` se migran a `agents.main` al cargar.

Ejemplos:

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

Cada entrada de la lista de permitidos rastrea:

- **id** UUID estable utilizado para la identidad de la interfaz de usuario (opcional)
- **last used** marca de tiempo
- **last used command**
- **last resolved path**

## Permitir automáticamente CLIs de habilidades

Cuando **Auto-allow skill CLIs** está habilitado, los ejecutables a los que hacen referencia las habilidades conocidas se tratan como incluidos en la lista de permitidos en los nodos (nodo macOS o host de nodo sin cabeza). Esto utiliza `skills.bins` a través de Gateway RPC para obtener la lista de binarios de la habilidad. Deshabilite esto si desea listas de permitidos manuales estrictas.

Notas importantes de confianza:

- Esta es una **lista de permitidos de comodidad implícita**, separada de las entradas de lista de permitidos de ruta manual.
- Está destinada a entornos de operador de confianza donde Gateway y el nodo están en el mismo límite de confianza.
- Si requiere una confianza explícita estricta, mantenga `autoAllowSkills: false` y use únicamente entradas de lista de permitidos de ruta manual.

## Bins seguros (solo stdin)

`tools.exec.safeBins` define una pequeña lista de binarios **solo de stdin** (por ejemplo, `cut`)
que pueden ejecutarse en modo de lista de permitidos **sin** entradas explícitas en la lista de permitidos. Los binarios seguros rechazan
los argumentos de archivo posicionales y los tokens tipo ruta, por lo que solo pueden operar en el flujo entrante.
Trate esto como una ruta rápida estrecha para filtros de flujo, no como una lista de confianza general.
**No** agregue binarios de intérprete o de tiempo de ejecución (por ejemplo, `python3`, `node`, `ruby`, `bash`, `sh`, `zsh`) a `safeBins`.
Si un comando puede evaluar código, ejecutar subcomandos o leer archivos por diseño, prefiera entradas explícitas en la lista de permitidos y mantenga activadas las solicitudes de aprobación.
Los binarios seguros personalizados deben definir un perfil explícito en `tools.exec.safeBinProfiles.<bin>`.
La validación es determinista solo a partir de la forma de argv (sin comprobaciones de existencia del sistema de archivos del host), lo que
previene el comportamiento de oráculo de existencia de archivos a partir de diferencias de permitir/denegar.
Las opciones orientadas a archivos se deniegan para los binarios seguros predeterminados (por ejemplo, `sort -o`, `sort --output`,
`sort --files0-from`, `sort --compress-program`, `sort --random-source`,
`sort --temporary-directory`/`-T`, `wc --files0-from`, `jq -f/--from-file`,
`grep -f/--file`).
Los binarios seguros también hacen cumplir una política explícita de indicadores por binario para las opciones que rompen el comportamiento
solo de stdin (por ejemplo, `sort -o/--output/--compress-program` y las banderas recursivas de grep).
Las opciones largas se validan con falla cerrada en modo de binario seguro: las banderas desconocidas y las
abreviaturas ambiguas se rechazan.
Banderas denegadas por perfil de binario seguro:

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`: `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

Los Safe bins también fuerzan que los tokens argv se traten como **texto literal** en el momento de la ejecución (sin globbing
y sin expansión de `$VARS`) para los segmentos de solo stdin, por lo que patrones como `*` o `$HOME/...` no se pueden
usar para introducir lecturas de archivos de forma encubierta.
Los Safe bins también deben resolverse desde directorios de binarios confiables (valores predeterminados del sistema más opcionales
`tools.exec.safeBinTrustedDirs`). Las entradas `PATH` nunca se confían automáticamente.
Los directorios seguros de binarios confiables predeterminados son intencionalmente mínimos: `/bin`, `/usr/bin`.
Si su ejecutable Safe bin se encuentra en rutas de gestor de paquetes/usuario (por ejemplo
`/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`), agréguelos explícitamente
a `tools.exec.safeBinTrustedDirs`.
El encadenamiento de shell y las redirecciones no se permiten automáticamente en el modo de lista de permitidos (allowlist).

El encadenamiento de shell (`&&`, `||`, `;`) está permitido cuando cada segmento de nivel superior cumple con la lista de permitidos
(incluyendo safe bins o skill auto-allow). Las redirecciones no son compatibles en modo de lista de permitidos.
La sustitución de comandos (`$()` / backticks) se rechaza durante el análisis de la lista de permitidos, incluso dentro de
doble comillas; use comillas simples si necesita texto literal `$()`.
En las aprobaciones de la aplicación complementaria de macOS, el texto de shell sin procesar que contenga sintaxis de control o expansión de shell
(`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) se trata como un fallo en la lista de permitidos a menos que
el binario de shell en sí esté en la lista de permitidos.
Para los contenedores de shell (`bash|sh|zsh ... -c/-lc`), las anulaciones de variables de entorno con ámbito de solicitud se reducen a una
lista de permitidos explícita pequeña (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
Para las decisiones de permitir siempre en modo de lista de permitidos, los contenedores de despacho conocidos
(`env`, `nice`, `nohup`, `stdbuf`, `timeout`) persisten las rutas de ejecutables internas en lugar de las rutas del contenedor.
Los multiplexores de shell (`busybox`, `toybox`) también se desenvuelven para las miniaplicaciones de shell (`sh`, `ash`,
etc.) de modo que los ejecutables internos se persisten en lugar de los binarios multiplexores. Si un contenedor o
multiplexor no se puede desenvolver de manera segura, no se persiste ninguna entrada en la lista de permitidos automáticamente.
Si incluye en la lista de permitidos intérpretes como `python3` o `node`, prefiera `tools.exec.strictInlineEval=true` para que la evaluación en línea aún requiera una aprobación explícita. En modo estricto, `allow-always` todavía puede persistir invocaciones de intérpretes/secuencias de comandos benignas, pero los transportadores de evaluación en línea no se persisten automáticamente.

Bins seguros predeterminados:

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` y `sort` no están en la lista predeterminada. Si optas por participar, mantén entradas explícitas en la lista blanca para sus flujos de trabajo que no sean stdin.
Para `grep` en modo safe-bin, proporciona el patrón con `-e`/`--regexp`; se rechaza el formulario de patrón posicional para que los operandos de archivo no puedan ser introducidos de contrabando como posicionales ambiguos.

### Bins seguros versus lista de permitidos

| Tema                 | `tools.exec.safeBins`                                                 | Lista blanca (`exec-approvals.json`)                                         |
| -------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Objetivo             | Permitir automáticamente filtros stdin estrechos                      | Confiar explícitamente en ejecutables específicos                            |
| Tipo de coincidencia | Nombre del ejecutable + política de argv de bin seguro                | Patrón global de ruta ejecutable resuelta                                    |
| Ámbito del argumento | Restringido por el perfil de bin seguro y las reglas de token literal | Solo coincidencia de ruta; los argumentos son de tu responsabilidad          |
| Ejemplos típicos     | `head`, `tail`, `tr`, `wc`                                            | `jq`, `python3`, `node`, `ffmpeg`, CLIs personalizadas                       |
| Mejor uso            | Transformaciones de texto de bajo riesgo en tuberías                  | Cualquier herramienta con un comportamiento más amplio o efectos secundarios |

Ubicación de la configuración:

- `safeBins` proviene de la configuración (`tools.exec.safeBins` o `agents.list[].tools.exec.safeBins` por agente).
- `safeBinTrustedDirs` proviene de la configuración (`tools.exec.safeBinTrustedDirs` o `agents.list[].tools.exec.safeBinTrustedDirs` por agente).
- `safeBinProfiles` proviene de la configuración (`tools.exec.safeBinProfiles` o `agents.list[].tools.exec.safeBinProfiles` por agente). Las claves de perfil por agente anulan las claves globales.
- las entradas de la lista blanca residen en `~/.openclaw/exec-approvals.json` local del host bajo `agents.<id>.allowlist` (o a través de Control UI / `openclaw approvals allowlist ...`).
- `openclaw security audit` advierte con `tools.exec.safe_bins_interpreter_unprofiled` cuando aparecen bins de intérprete/ejecución en `safeBins` sin perfiles explícitos.
- `openclaw doctor --fix` puede andamiar entradas `safeBinProfiles.<bin>` personalizadas faltantes como `{}` (revísalo y ajústalo después). Los bins de intérprete/ejecución no se andamian automáticamente.

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

Si activas explícitamente `jq` en `safeBins`, OpenClaw aún rechaza el comando integrado `env` en modo safe-bin, por lo que `jq -n env` no puede volcar el entorno del proceso del host sin una ruta de lista de permisos explícita o un mensaje de aprobación.

## Edición de la interfaz de usuario de control

Usa la tarjeta **Control UI → Nodes → Exec approvals** para editar los valores predeterminados, las anulaciones por agente y las listas de permitidos. Elige un ámbito (Defaults o un agente), ajusta la política, añade/elimina patrones de lista de permitidos y luego haz clic en **Save**. La interfaz muestra metadatos de **last used** por patrón para que puedas mantener la lista ordenada.

El selector de destino elige **Gateway** (aprobaciones locales) o un **Node**. Los nodos deben anunciar `system.execApprovals.get/set` (aplicación macOS o host de nodo sin interfaz). Si un nodo aún no anuncia aprobaciones de ejecución, edite su `~/.openclaw/exec-approvals.json` local directamente.

CLI: `openclaw approvals` admite la edición de puerta de enlace o nodo (consulte [Approvals CLI](/en/cli/approvals)).

## Flujo de aprobación

Cuando se requiere un mensaje, la puerta de enlace transmite `exec.approval.requested` a los clientes del operador. La interfaz de control y la aplicación macOS lo resuelven a través de `exec.approval.resolve`, luego la puerta de enlace reenvía la solicitud aprobada al host del nodo.

Para `host=node`, las solicitudes de aprobación incluyen una carga útil canónica `systemRunPlan`. La puerta de enlace utiliza ese plan como contexto de comando/cwd/sesión autorizado al reenviar las solicitudes aprobadas `system.run`.

## Comandos de intérprete/runtime

Las ejecuciones de intérprete/runtime respaldadas por aprobaciones son intencionalmente conservadoras:

- El contexto exacto de argv/cwd/env siempre está vinculado.
- Las formas de script de shell directo y de archivo de runtime directo se vinculan, con el mejor esfuerzo posible, a una instantánea de un archivo local concreto.
- Las formas comunes de contenedores de administradores de paquetes que aún se resuelven en un solo archivo local directo (por ejemplo, `pnpm exec`, `pnpm node`, `npm exec`, `npx`) se desenvuelven antes del enlace.
- Si OpenClaw no puede identificar exactamente un archivo local concreto para un comando de intérprete/tiempo de ejecución
  (por ejemplo, scripts de paquetes, formularios de evaluación, cadenas de carga específicas del tiempo de ejecución o formularios de
  múltiples archivos ambiguos), la ejecución respaldada por aprobación se deniega en lugar de reclamar una cobertura semántica que no
  tiene.
- Para esos flujos de trabajo, prefiera el sandbox, un límite de host separado o una lista de permitidos explícita y confiable
  /flujo de trabajo completo donde el operador acepte las semánticas más amplias del tiempo de ejecución.

Cuando se requieren aprobaciones, la herramienta exec regresa inmediatamente con un ID de aprobación. Use ese ID para correlacionar eventos posteriores del sistema (`Exec finished` / `Exec denied`). Si no llega ninguna decisión antes del tiempo de espera, la solicitud se trata como un tiempo de espera de aprobación y se muestra como un motivo de denegación.

### Comportamiento de entrega de seguimiento

Después de que finaliza una exec asíncrona aprobada, OpenClaw envía un turno de seguimiento `agent` a la misma sesión.

- Si existe un destino de entrega externo válido (canal entregable más destino `to`), la entrega de seguimiento utiliza ese canal.
- En flujos solo de webchat o de sesión interna sin destino externo, la entrega de seguimiento permanece solo en la sesión (`deliver: false`).
- Si un solicitante solicita explícitamente una entrega externa estricta sin ningún canal externo resoluble, la solicitud falla con `INVALID_REQUEST`.
- Si `bestEffortDeliver` está habilitado y no se puede resolver ningún canal externo, la entrega se degrada a solo sesión en lugar de fallar.

El diálogo de confirmación incluye:

- comando + argumentos
- cwd
- id del agente
- ruta ejecutable resuelta
- host + metadatos de política

Acciones:

- **Permitir una vez** → ejecutar ahora
- **Permitir siempre** → agregar a la lista de permitidos + ejecutar
- **Denegar** → bloquear

## Reenvío de aprobaciones a canales de chat

Puede reenviar los avisos de aprobación de ejecución a cualquier canal de chat (incluidos los canales de complementos) y aprobarlos
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

Responder en el chat:

```
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

El comando `/approve` maneja tanto las aprobaciones de ejecución como las de complementos. Si el ID no coincide con una aprobación de ejecución pendiente, verifica automáticamente las aprobaciones de complementos.

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

Los canales que admiten respuestas interactivas compartidas muestran los mismos botones de aprobación tanto para las aprobaciones de ejecución
como para las de complementos. Los canales sin interfaz interactiva compartida vuelven al texto sin formato con `/approve`
instrucciones.

### Aprobaciones en el mismo chat en cualquier canal

Cuando una solicitud de aprobación de ejecución o complemento se origina en una superficie de chat entregable, el mismo chat
ahora puede aprobarla con `/approve` de forma predeterminada. Esto se aplica a canales como Slack, Matrix y
Microsoft Teams, además de los flujos existentes de la interfaz de usuario web y la interfaz de usuario de terminal.

Esta ruta compartida de comandos de texto utiliza el modelo de autenticación de canal normal para esa conversación. Si el
chat de origen ya puede enviar comandos y recibir respuestas, las solicitudes de aprobación ya no necesitan
un adaptador de entrega nativo separado solo para permanecer pendientes.

Discord y Telegram también admiten `/approve` en el mismo chat, pero esos canales aún usan su
lista de aprobadores resuelta para la autorización, incluso cuando la entrega de aprobación nativa está deshabilitada.

### Entrega de aprobación nativa

Discord, Slack y Telegram también pueden actuar como adaptadores de entrega de aprobación nativa con configuración específica del canal.

- Discord: `channels.discord.execApprovals.*`
- Slack: usa `approvals.exec.targets` compartido con `channel: "slack"` y procesa botones de aprobación de Block Kit cuando la interactividad está habilitada
- Telegram: `channels.telegram.execApprovals.*`

Estos adaptadores de entrega nativa son opcionales. Agregan enrutamiento de MD y distribución al canal además del
flujo `/approve` en el mismo chat compartido y los botones de aprobación compartidos.

Comportamiento compartido:

- Slack, Matrix, Microsoft Teams y chats entregables similares usan el modelo de autenticación de canal normal
  para `/approve` en el mismo chat
- para Discord y Telegram, solo los aprobadores resueltos pueden aprobar o denegar
- los aprobadores de Discord y Telegram pueden ser explícitos (`execApprovals.approvers`) o inferidos de la configuración de propietario existente (`allowFrom`, más mensaje directo `defaultTo` cuando sea compatible)
- el solicitante no necesita ser un aprobador
- el chat de origen puede aprobar directamente con `/approve` cuando ese chat ya admite comandos y respuestas
- cuando la entrega al canal está habilitada, las solicitudes de aprobación incluyen el texto del comando
- las aprobaciones de ejecución pendientes caducan después de 30 minutos de manera predeterminada
- si ninguna interfaz de usuario de operador o cliente de aprobación configurado puede aceptar la solicitud, el aviso recurre a `askFallback`

Telegram utiliza de manera predeterminada MD de aprobadores (`target: "dm"`). Puede cambiar a `channel` o `both` cuando
quiera que las solicitudes de aprobación también aparezcan en el chat/tema de Telegram de origen. Para temas de foro
de Telegram, OpenClaw conserva el tema para la solicitud de aprobación y el seguimiento posterior a la aprobación.

Consulte:

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
- Verificación de par del mismo UID.
- Desafío/respuesta (nonce + token HMAC + hash de solicitud) + TTL corto.

## Eventos del sistema

El ciclo de vida de ejecución se expone como mensajes del sistema:

- `Exec running` (solo si el comando excede el umbral de aviso de ejecución)
- `Exec finished`
- `Exec denied`

Estos se publican en la sesión del agente después de que el nodo reporta el evento.
Las aprobaciones de ejecución alojadas en el gateway emiten los mismos eventos del ciclo de vida cuando finaliza el comando (y opcionalmente cuando se ejecuta por más tiempo que el umbral).
Las ejecuciones con control de aprobación reutilizan el id de aprobación como `runId` en estos mensajes para una fácil correlación.

## Comportamiento de aprobación denegada

Cuando se deniega una aprobación de ejecución asíncrona, OpenClaw evita que el agente reutilice
la salida de cualquier ejecución anterior del mismo comando en la sesión. El motivo de la denegación
se pasa con una guía explícita de que no hay salida de comando disponible, lo que evita
que el agente afirme que hay una nueva salida o repita el comando denegado con
resultados obsoletos de una ejecución exitosa previa.

## Implicaciones

- **full** es potente; preferir listas de permitidos (allowlists) cuando sea posible.
- **ask** te mantiene informado mientras permite aprobaciones rápidas.
- Las listas de permitidos por agente evitan que las aprobaciones de un agente se filtren a otros.
- Las aprobaciones solo se aplican a solicitudes de ejecución de host de **remitentes autorizados**. Los remitentes no autorizados no pueden emitir `/exec`.
- `/exec security=full` es una conveniencia a nivel de sesión para operadores autorizados y omite aprobaciones por diseño.
  Para bloquear la ejecución de host de manera estricta, configure la seguridad de aprobaciones en `deny` o deniegue la herramienta `exec` mediante la política de herramientas.

Relacionado:

- [Herramienta Exec](/en/tools/exec)
- [Modo elevado](/en/tools/elevated)
- [Habilidades (Skills)](/en/tools/skills)

## Relacionado

- [Exec](/en/tools/exec) — herramienta de ejecución de comandos de shell
- [Sandboxing](/en/gateway/sandboxing) — modos de sandbox y acceso al espacio de trabajo
- [Seguridad](/en/gateway/security) — modelo de seguridad y endurecimiento
- [Sandbox vs Política de herramientas vs Elevado](/en/gateway/sandbox-vs-tool-policy-vs-elevated) — cuándo usar cada uno
