---
summary: "Aprobaciones de ejecución, listas de permitidos y avisos de escape del entorno limitado"
read_when:
  - Configuración de aprobaciones de ejecución o listas de permitidos
  - Implementación de la UX de aprobación de ejecución en la aplicación macOS
  - Revisión de avisos de escape del entorno limitado e implicaciones
title: "Aprobaciones de ejecución"
---

# Aprobaciones de ejecución

Las aprobaciones de ejecución son la **barra de protección de la aplicación complementaria / host de nodos** para permitir que un agente en entorno limitado ejecute
comandos en un host real (`gateway` o `node`). Piénselo como un interbloqueo de seguridad:
los comandos se permiten solo cuando la política + lista de permitidos + (opcional) aprobación del usuario están todos de acuerdo.
Las aprobaciones de ejecución son **adicionales** a la política de herramientas y al bloqueo elevado (a menos que elevated se establezca en `full`, lo que omite las aprobaciones).
La política efectiva es la **más estricta** entre `tools.exec.*` y los valores predeterminados de aprobaciones; si se omite un campo de aprobaciones, se utiliza el valor `tools.exec`.

Si la interfaz de usuario de la aplicación complementaria **no está disponible**, cualquier solicitud que requiera un aviso se
resuelve mediante la **alternativa de pregunta** (predeterminado: denegar).

## Dónde se aplica

Las aprobaciones de ejecución se aplican localmente en el host de ejecución:

- **host de puerta de enlace** → proceso `openclaw` en la máquina de puerta de enlace
- **host de nodo** → ejecutor de nodo (aplicación complementaria macOS o host de nodo sin cabeza)

Nota sobre el modelo de confianza:

- Los llamadores autenticados por la puerta de enlace son operadores de confianza para esa puerta de enlace.
- Los nodos emparejados extienden esa capacidad de operador de confianza al host del nodo.
- Las aprobaciones de ejecución reducen el riesgo de ejecución accidental, pero no son un límite de autenticación por usuario.
- Las ejecuciones aprobadas en el host de nodo vinculan el contexto de ejecución canónico: cwd canónico, argv exacto, vinculación
  del entorno cuando está presente, y ruta ejecutable anclada cuando corresponde.
- Para scripts de shell e invocaciones directas de archivos de intérprete/tiempo de ejecución, OpenClaw también intenta vincular
  un operando de archivo local concreto. Si ese archivo vinculado cambia después de la aprobación pero antes de la ejecución,
  la ejecución se deniega en lugar de ejecutar el contenido derivado.
- Esta vinculación de archivos es intencionalmente de mejor esfuerzo, no un modelo semántico completo de cada
  ruta de cargador de intérprete/tiempo de ejecución. Si el modo de aprobación no puede identificar exactamente un archivo local
  concreto para vincular, se niega a crear una ejecución respaldada por aprobación en lugar de pretender una cobertura completa.

División de macOS:

- El **servicio host del nodo** reenvía `system.run` a la **aplicación macOS** a través de IPC local.
- La **aplicación macOS** hace cumplir las aprobaciones y ejecuta el comando en el contexto de la interfaz de usuario.

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

## Controles de política

### Seguridad (`exec.security`)

- **deny** (denegar): bloquea todas las solicitudes de ejecución del host.
- **allowlist** (lista permitida): permite solo los comandos en la lista permitida.
- **full** (completo): permite todo (equivalente a elevado).

### Preguntar (`exec.ask`)

- **off** (desactivado): nunca preguntar.
- **on-miss** (al fallar): preguntar solo cuando no haya coincidencia con la lista permitida.
- **always** (siempre): preguntar en cada comando.

### Alternativa de pregunta (`askFallback`)

Si se requiere una pregunta pero no se puede acceder a la interfaz de usuario, la alternativa decide:

- **deny** (denegar): bloquear.
- **allowlist** (lista permitida): permitir solo si coincide con la lista permitida.
- **full** (completo): permitir.

## Lista permitida (por agente)

Las listas permitidas son **por agente**. Si existen varios agentes, cambia qué agente estás
editando en la aplicación macOS. Los patrones son **coincidencias glob que no distinguen mayúsculas de minúsculas**.
Los patrones deben resolver a **rutas binarias** (las entradas con solo el nombre base se ignoran).
Las entradas heredadas de `agents.default` se migran a `agents.main` al cargar.

Ejemplos:

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

Cada entrada de la lista permitida rastrea:

- **id** UUID estable utilizado para la identidad de la interfaz de usuario (opcional)
- **última vez usado** marca de tiempo
- **comando usado por última vez**
- **ruta resuelta por última vez**

## Permitir automáticamente los CLIs de habilidades

Cuando **Permitir automáticamente los CLIs de habilidades** está habilitado, los ejecutables referenciados por habilidades conocidas
se tratan como permitidos en los nodos (nodo macOS o host de nodo sin interfaz). Esto utiliza
`skills.bins` a través de Gateway RPC para obtener la lista de bins de habilidades. Deshabilite esto si desea listas permitidas manuales estrictas.

Notas importantes de confianza:

- Esta es una **lista permitida implícita por conveniencia**, separada de las entradas manuales de lista permitida de rutas.
- Está destinada a entornos de operadores de confianza donde Gateway y el nodo están en el mismo límite de confianza.
- Si requiere una confianza explícita estricta, mantenga `autoAllowSkills: false` deshabilitado y use solo entradas manuales de lista permitida de rutas.

## Bins seguros (solo stdin)

`tools.exec.safeBins` define una pequeña lista de binarios **solo stdin** (por ejemplo `jq`)
que pueden ejecutarse en modo de lista de permitidos **sin** entradas explícitas en la lista de permitidos. Los binarios seguros rechazan
argumentos de archivo posicionales y tokens similares a rutas, por lo que solo pueden operar en la secuencia entrante.
Trate esto como una ruta rápida estrecha para filtros de secuencia, no como una lista de confianza general.
**No** añada binarios de intérprete o tiempo de ejecución (por ejemplo `python3`, `node`, `ruby`, `bash`, `sh`, `zsh`) a `safeBins`.
Si un comando puede evaluar código, ejecutar subcomandos o leer archivos por diseño, prefiera entradas explícitas en la lista de permitidos y mantenga activados los mensajes de aprobación.
Los binarios seguros personalizados deben definir un perfil explícito en `tools.exec.safeBinProfiles.<bin>`.
La validación es determinista solo a partir de la forma de argv (sin verificaciones de existencia del sistema de archivos del host), lo
que evita el comportamiento de oráculo de existencia de archivos por diferencias de permitir/denegar.
Las opciones orientadas a archivos se deniegan para los binarios seguros predeterminados (por ejemplo `sort -o`, `sort --output`,
`sort --files0-from`, `sort --compress-program`, `sort --random-source`,
`sort --temporary-directory`/`-T`, `wc --files0-from`, `jq -f/--from-file`,
`grep -f/--file`).
Los binarios seguros también aplican una política de indicadores explícita por binario para opciones que rompen el comportamiento de solo stdin
(por ejemplo `sort -o/--output/--compress-program` y los indicadores recursivos de grep).
Las opciones largas se validan con cierre por fallo en modo de binario seguro: los indicadores desconocidos y las
abreviaturas ambiguas se rechazan.
Indicadores denegados por perfil de binario seguro:

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`: `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

Safe bins también fuerzan que los tokens argv se traten como **texto literal** en el momento de la ejecución (sin globbing
y sin expansión de `$VARS`) para los segmentos solo stdin, por lo que patrones como `*` o `$HOME/...` no pueden ser
utilizados para contrabandear lecturas de archivos.
Los Safe bins también deben resolverse desde directorios de binarios de confianza (valores predeterminados del sistema más opcionales
`tools.exec.safeBinTrustedDirs`). Las entradas `PATH` nunca son de confianza automática.
Los directorios seguros de confianza predeterminados son intencionalmente mínimos: `/bin`, `/usr/bin`.
Si su ejecutable safe-bin reside en rutas de gestor de paquetes/usuario (por ejemplo
`/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`), agréguelos explícitamente
a `tools.exec.safeBinTrustedDirs`.
El encadenamiento de Shell y las redirecciones no se permiten automáticamente en el modo de lista de permitidos.

Se permite el encadenamiento de shells (`&&`, `||`, `;`) cuando cada segmento de nivel superior cumple con la lista blanca
(incluyendo bins seguros o permiso automático de habilidades). Las redirecciones no son compatibles en modo de lista blanca.
La sustitución de comandos (`$()` / comillas invertidas) se rechaza durante el análisis de la lista blanca, incluso dentro de
dobles comillas; use comillas simples si necesita texto literal `$()`.
En las aprobaciones de la aplicación complementaria de macOS, el texto de shell sin procesar que contiene sintaxis de control o expansión de shell
(`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) se trata como un fallo de lista blanca a menos que
el binario del shell en sí esté en la lista blanca.
Para los envoltorios de shell (`bash|sh|zsh ... -c/-lc`), las anulaciones de env con alcance de solicitud se reducen a una
pequeña lista blanca explícita (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
Para las decisiones de permitir siempre en modo de lista blanca, los envoltorios de envío conocidos
(`env`, `nice`, `nohup`, `stdbuf`, `timeout`) conservan las rutas ejecutables internas en lugar de las rutas
de los envoltorios. Los multiplexores de shell (`busybox`, `toybox`) también se desenvuelven para los applets de shell (`sh`, `ash`,
etc.) para que se conserven los ejecutables internos en lugar de los binarios multiplexores. Si un envoltorio o
multiplexor no se puede desenvolver de manera segura, no se conserva ninguna entrada de lista blanca automáticamente.

Bins seguros predeterminados: `jq`, `cut`, `uniq`, `head`, `tail`, `tr`, `wc`.

`grep` y `sort` no están en la lista predeterminada. Si optas por participar, mantén entradas explícitas en la lista de permitidos para sus flujos de trabajo que no sean stdin.
Para `grep` en modo de bin seguro, proporciona el patrón con `-e`/`--regexp`; se rechaza el formulario de patrón posicional para que no se puedan introducir operadores de archivo como posicionales ambiguos.

### Bins seguros versus lista de permitidos

| Tema                 | `tools.exec.safeBins`                                                    | Lista de permitidos (`exec-approvals.json`)                                     |
| -------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Objetivo             | Permitir automáticamente filtros stdin estrechos                         | Confiar explícitamente en ejecutables específicos                               |
| Tipo de coincidencia | Nombre del ejecutable + política de argv de bin seguro                   | Patrón global de ruta de ejecutable resuelta                                    |
| Ámbito del argumento | Restringido por el perfil de bin seguro y las reglas de tokens literales | Solo coincidencia de ruta; los argumentos son de otra manera su responsabilidad |
| Ejemplos típicos     | `jq`, `head`, `tail`, `wc`                                               | `python3`, `node`, `ffmpeg`, CLIs personalizados                                |
| Mejor uso            | Transformaciones de texto de bajo riesgo en tuberías (pipelines)         | Cualquier herramienta con un comportamiento más amplio o efectos secundarios    |

Ubicación de la configuración:

- `safeBins` proviene de la configuración (`tools.exec.safeBins` o `agents.list[].tools.exec.safeBins` por agente).
- `safeBinTrustedDirs` proviene de la configuración (`tools.exec.safeBinTrustedDirs` o `agents.list[].tools.exec.safeBinTrustedDirs` por agente).
- `safeBinProfiles` proviene de la configuración (`tools.exec.safeBinProfiles` o `agents.list[].tools.exec.safeBinProfiles` por agente). Las claves de perfil por agente anulan las claves globales.
- las entradas de la lista de permitidos residen en `~/.openclaw/exec-approvals.json` local del host bajo `agents.<id>.allowlist` (o a través de UI de Control / `openclaw approvals allowlist ...`).
- `openclaw security audit` advierte con `tools.exec.safe_bins_interpreter_unprofiled` cuando aparecen bins de intérprete/runtime en `safeBins` sin perfiles explícitos.
- `openclaw doctor --fix` puede generar entradas `safeBinProfiles.<bin>` personalizadas faltantes como `{}` (revíselas y ajústelas después). Los bins de intérprete/runtime no se generan automáticamente.

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

## Edición de la interfaz de usuario de Control

Use la tarjeta **Control UI → Nodes → Exec approvals** para editar los valores predeterminados, las anulaciones por agente y las listas de permitidos. Elija un alcance (Defaults o un agente), ajuste la política, agregue/elimine patrones de lista de permitidos y luego haga clic en **Save**. La interfaz de usuario muestra metadatos de **last used** por patrón para que pueda mantener la lista ordenada.

El selector de destino elige **Gateway** (aprobaciones locales) o un **Node**. Los nodos deben anunciar `system.execApprovals.get/set` (aplicación macOS o host de nodo sin interfaz gráfica). Si un nodo aún no anuncia aprobaciones de ejecución, edite su `~/.openclaw/exec-approvals.json` local directamente.

CLI: `openclaw approvals` admite la edición de gateway o nodo (consulte [Approvals CLI](/es/cli/approvals)).

## Flujo de aprobación

Cuando se requiere un aviso, la puerta de enlace transmite `exec.approval.requested` a los clientes del operador. La interfaz de usuario de Control y la aplicación macOS lo resuelven mediante `exec.approval.resolve`; luego, la puerta de enlace reenvía la solicitud aprobada al host del nodo.

Para `host=node`, las solicitudes de aprobación incluyen una carga útil de `systemRunPlan` canónica. La puerta de enlace usa ese plan como contexto de comando/cwd/sesión autorizado al reenviar solicitudes `system.run` aprobadas.

## Comandos de intérprete/runtime

Las ejecuciones de intérprete/runtime respaldadas por aprobaciones son intencionalmente conservadoras:

- El contexto exacto de argv/cwd/env siempre está vinculado.
- Las formas de script de shell directo y de archivo de runtime directo se vinculan con el mejor esfuerzo a una instantánea de archivo local concreta.
- Las formas comunes de contenedor de gestor de paquetes que aún se resuelven en un archivo local directo (por ejemplo, `pnpm exec`, `pnpm node`, `npm exec`, `npx`) se desenvuelven antes del enlace.
- Si OpenClaw no puede identificar exactamente un archivo local concreto para un comando de intérprete/tiempo de ejecución
  (por ejemplo, scripts de paquetes, formas de evaluación, cadenas de cargador específicas del tiempo de ejecución o formas multiplexadas ambiguas),
  la ejecución respaldada por aprobación se deniega en lugar de reclamar una cobertura semántica que no posee.
- Para esos flujos de trabajo, es preferible el uso de sandboxing, un límite de host separado o una lista de permitidos explícita y de confianza/flujo de trabajo completo donde el operador acepte la semántica de tiempo de ejecución más amplia.

Cuando se requieren aprobaciones, la herramienta exec regresa inmediatamente con un id de aprobación. Use ese id para
correlacionar eventos posteriores del sistema (`Exec finished` / `Exec denied`). Si no llega ninguna decisión antes del tiempo de espera,
la solicitud se trata como un tiempo de espera de aprobación y se presenta como un motivo de denegación.

El cuadro de diálogo de confirmación incluye:

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

Puede reenviar las solicitudes de aprobación exec a cualquier canal de chat (incluidos los canales de complementos) y aprobarlas
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

### Clientes de aprobación de chat integrados

Discord y Telegram también pueden actuar como clientes de aprobación exec explícitos con configuración específica del canal.

- Discord: `channels.discord.execApprovals.*`
- Telegram: `channels.telegram.execApprovals.*`

Estos clientes son optativos. Si un canal no tiene las aprobaciones exec habilitadas, OpenClaw no trata
ese canal como una superficie de aprobación solo porque la conversación ocurrió allí.

Compartimiento de comportamiento:

- solo los aprobadores configurados pueden aprobar o denegar
- el solicitante no necesita ser un aprobador
- cuando la entrega del canal está habilitada, las solicitudes de aprobación incluyen el texto del comando
- si ninguna interfaz de usuario de operador o cliente de aprobación configurado puede aceptar la solicitud, el mensaje vuelve a `askFallback`

Telegram utiliza por defecto los MD del aprobador (`target: "dm"`). Puede cambiar a `channel` o `both` cuando
quiera que las solicitudes de aprobación aparezcan también en el chat/tema de Telegram de origen. Para los temas de foro de
Telegram, OpenClaw conserva el tema para la solicitud de aprobación y el seguimiento posterior a la aprobación.

Ver:

- [Discord](/es/channels/discord#exec-approvals-in-discord)
- [Telegram](/es/channels/telegram#exec-approvals-in-telegram)

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

El ciclo de vida de Exec se expone como mensajes del sistema:

- `Exec running` (solo si el comando excede el umbral de aviso de ejecución)
- `Exec finished`
- `Exec denied`

Estos se publican en la sesión del agente después de que el nodo reporta el evento.
Las aprobaciones de exec alojadas en la puerta de enlace emiten los mismos eventos de ciclo de vida cuando el comando finaliza (y opcionalmente cuando se ejecuta por más tiempo que el umbral).
Los execs con control de aprobación reutilizan el id de aprobación como el `runId` en estos mensajes para una fácil correlación.

## Implicaciones

- **full** es potente; prefiera las listas de permitidos cuando sea posible.
- **ask** lo mantiene informado y, al mismo tiempo, permite aprobaciones rápidas.
- Las listas de permitidos por agente evitan que las aprobaciones de un agente se filtren a otras.
- Las aprobaciones solo se aplican a las solicitudes de exec del host de **remitentes autorizados**. Los remitentes no autorizados no pueden emitir `/exec`.
- `/exec security=full` es una conveniencia a nivel de sesión para operadores autorizados y omite aprobaciones por diseño.
  Para bloquear permanentemente el exec del host, establezca la seguridad de aprobaciones en `deny` o deniegue la herramienta `exec` mediante la política de herramientas.

Relacionado:

- [Herramienta Exec](/es/tools/exec)
- [Modo elevado](/es/tools/elevated)
- [Habilidades](/es/tools/skills)

import es from "/components/footer/es.mdx";

<es />
