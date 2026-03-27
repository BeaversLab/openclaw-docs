---
summary: "Aprobaciones de ejecución, listas de permitidos y avisos de escape del entorno limitado"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "Aprobaciones de ejecución"
---

# Aprobaciones de ejecución

Las aprobaciones de ejecución son la **barra de protección de la aplicación complementaria / host del nodo** para permitir que un agente en entorno limitado ejecute
comandos en un host real (`gateway` o `node`). Piénselo como un interbloqueo de seguridad:
los comandos solo se permiten cuando la política + lista de permitidos + (opcional) aprobación del usuario están todos de acuerdo.
Las aprobaciones de ejecución son **adicionales** a la política de herramientas y al filtrado elevado (a menos que elevated se establezca en `full`, lo que omite las aprobaciones).
La política efectiva es la **más estricta** de `tools.exec.*` y los valores predeterminados de aprobaciones; si se omite un campo de aprobaciones, se utiliza el valor de `tools.exec`.

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

- **servicio de host de nodo** reenvía `system.run` a la **aplicación de macOS** a través de IPC local.
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

### Alternativa de pregunta (`askFallback`)

Si se requiere una pregunta pero no se puede alcanzar ninguna interfaz de usuario, la alternativa decide:

- **deny** (denegar): bloquear.
- **allowlist** (lista de permitidos): permitir solo si la lista de permitidos coincide.
- **full** (completo): permitir.

### Endurecimiento de la evaluación del intérprete en línea (`tools.exec.strictInlineEval`)

Cuando `tools.exec.strictInlineEval=true`, OpenClaw trata los formularios de evaluación de código en línea como solo aprobación incluso si el binario del intérprete en sí está en la lista de permitidos.

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
- `allow-always` no persiste nuevas entradas de lista de permitidos para ellos automáticamente.

## Lista de permitidos (por agente)

Las listas de permitidos son **por agente**. Si existen múltiples agentes, cambia qué agente estás
editando en la aplicación macOS. Los patrones son **coincidencias glob que no distinguen mayúsculas de minúsculas**.
Los patrones deben resolverse a **rutas binarias** (las entradas de solo nombre base se ignoran).
Las entradas heredadas de `agents.default` se migran a `agents.main` al cargar.

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

Cuando **Permitir automáticamente CLIs de habilidades** está habilitado, los ejecutables referenciados por habilidades conocidas
se tratan como permitidos en los nodos (nodo macOS o host de nodo sin interfaz). Esto utiliza
`skills.bins` a través del Gateway RPC para obtener la lista de bins de habilidad. Deshabilite esto si desea listas de permitidos manuales estrictas.

Notas importantes de confianza:

- Esta es una **lista de permitidos de comodidad implícita**, separada de las entradas de lista de permitidos de ruta manual.
- Está destinada a entornos de operador de confianza donde Gateway y el nodo están en el mismo límite de confianza.
- Si requiere una confianza explícita estricta, mantenga `autoAllowSkills: false` y use solo entradas de lista de permitidos de ruta manual.

## Bins seguros (solo stdin)

`tools.exec.safeBins` define una pequeña lista de binarios **solo stdin** (por ejemplo `cut`)
que pueden ejecutarse en modo de lista de permitidos **sin** entradas explícitas en la lista de permitidos. Los bins seguros rechazan
argumentos de archivo posicionales y tokens tipo ruta, por lo que solo pueden operar en la secuencia entrante.
Trate esto como una ruta rápida estrecha para filtros de secuencia, no una lista de confianza general.
**No** agregue binarios de intérprete o de tiempo de ejecución (por ejemplo `python3`, `node`, `ruby`, `bash`, `sh`, `zsh`) a `safeBins`.
Si un comando puede evaluar código, ejecutar subcomandos o leer archivos por diseño, prefiera entradas explícitas en la lista de permitidos y mantenga los mensajes de aprobación habilitados.
Los bins seguros personalizados deben definir un perfil explícito en `tools.exec.safeBinProfiles.<bin>`.
La validación es determinista solo a partir de la forma de argv (sin verificaciones de existencia en el sistema de archivos del host), lo que
previene el comportamiento de oráculo de existencia de archivos a partir de diferencias de permitir/denegar.
Las opciones orientadas a archivos se deniegan para los bins seguros predeterminados (por ejemplo `sort -o`, `sort --output`,
`sort --files0-from`, `sort --compress-program`, `sort --random-source`,
`sort --temporary-directory`/`-T`, `wc --files0-from`, `jq -f/--from-file`,
`grep -f/--file`).
Los bins seguros también hacen cumplir una política explícita de indicadores por binario para opciones que rompen el comportamiento solo stdin
(por ejemplo `sort -o/--output/--compress-program` y las indicadores recursivos de grep).
Las opciones largas se validan con cierre de fallos en modo binario seguro: las indicadores desconocidas y las
abreviaturas ambiguas se rechazan.
Indicadores denegados por perfil de binario seguro:

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`: `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

Los bins seguros también fuerzan que los tokens argv se traten como **texto literal** en el momento de la ejecución (sin expansión de comodines
y sin expansión de `$VARS`) para segmentos solo de stdin, por lo que patrones como `*` o `$HOME/...` no se pueden
usar para introducir lecturas de archivos de forma encubierta.
Los bins seguros también deben resolverse desde directorios de binarios confiables (predeterminados del sistema más opcionales
`tools.exec.safeBinTrustedDirs`). Las entradas `PATH` nunca se confían automáticamente.
Los directorios predeterminados de bins seguros confiables son intencionalmente mínimos: `/bin`, `/usr/bin`.
Si su ejecutable bin seguro se encuentra en rutas de gestor de paquetes/usuario (por ejemplo
`/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`), añádalos explícitamente
a `tools.exec.safeBinTrustedDirs`.
El encadenamiento de shell y las redirecciones no se permiten automáticamente en modo allowlist.

Shell chaining (`&&`, `||`, `;`) está permitido cuando cada segmento de nivel superior satisfaga la lista de permitidos
(incluyendo bins seguros o permiso automático de habilidades). Las redirecciones siguen sin ser compatibles en el modo de lista de permitidos.
La sustitución de comandos (`$()` / backticks) se rechaza durante el análisis de la lista de permitidos, incluso dentro de
dobles comillas; use comillas simples si necesita texto literal `$()`.
En las aprobaciones de la aplicación complementaria de macOS, el texto de shell sin procesar que contenga sintaxis de control o expansión de shell
(`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) se trata como un fallo en la lista de permitidos a menos que
el binario del shell en sí esté en la lista de permitidos.
Para los envoltorios de shell (`bash|sh|zsh ... -c/-lc`), las anulaciones de env con alcance de solicitud se reducen a una
pequeña lista de permitidos explícita (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
Para las decisiones de permitir siempre en el modo de lista de permitidos, los envoltorios de despacho conocidos
(`env`, `nice`, `nohup`, `stdbuf`, `timeout`) persisten las rutas ejecutables internas en lugar de las rutas del envoltorio.
Los multiplexores de shell (`busybox`, `toybox`) también se desenvuelven para los applets de shell (`sh`, `ash`,
etc.) de modo que los ejecutables internos persisten en lugar de los binarios multiplexores. Si un envoltorio o
multiplexor no se puede desenvolver de manera segura, ninguna entrada de lista de permitidos se persiste automáticamente.
Si incluye en la lista de permitidos intérpretes como `python3` o `node`, prefiera `tools.exec.strictInlineEval=true` para que la evaluación en línea aún requiera una aprobación explícita.

Bins seguros predeterminados:

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` y `sort` no están en la lista predeterminada. Si decides participar, mantén entradas de lista de permitidos explícitas para sus flujos de trabajo que no sean stdin.
Para `grep` en modo de bin seguro, proporciona el patrón con `-e`/`--regexp`; el patrón posicional se rechaza para que no se puedan introducir operandos de archivo como posicionales ambiguos.

### Bins seguros versus lista de permitidos

| Tema                 | `tools.exec.safeBins`                                                 | Lista de permitidos (`exec-approvals.json`)                                  |
| -------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Objetivo             | Permitir automáticamente filtros stdin estrechos                      | Confiar explícitamente en ejecutables específicos                            |
| Tipo de coincidencia | Nombre del ejecutable + política de argv de bin seguro                | Patrón global de ruta ejecutable resuelta                                    |
| Ámbito del argumento | Restringido por el perfil de bin seguro y las reglas de token literal | Solo coincidencia de ruta; los argumentos son de tu responsabilidad          |
| Ejemplos típicos     | `head`, `tail`, `tr`, `wc`                                            | `jq`, `python3`, `node`, `ffmpeg`, CLIs personalizadas                       |
| Mejor uso            | Transformaciones de texto de bajo riesgo en tuberías                  | Cualquier herramienta con un comportamiento más amplio o efectos secundarios |

Ubicación de la configuración:

- `safeBins` proviene de la configuración (`tools.exec.safeBins` o por agente `agents.list[].tools.exec.safeBins`).
- `safeBinTrustedDirs` proviene de la configuración (`tools.exec.safeBinTrustedDirs` o por agente `agents.list[].tools.exec.safeBinTrustedDirs`).
- `safeBinProfiles` proviene de la configuración (`tools.exec.safeBinProfiles` o por agente `agents.list[].tools.exec.safeBinProfiles`). Las claves de perfil por agente anulan las claves globales.
- las entradas de la lista de permitidos residen en `~/.openclaw/exec-approvals.json` local del host bajo `agents.<id>.allowlist` (o a través de Control UI / `openclaw approvals allowlist ...`).
- `openclaw security audit` advierte con `tools.exec.safe_bins_interpreter_unprofiled` cuando aparecen intérpretes/binarios de runtime en `safeBins` sin perfiles explícitos.
- `openclaw doctor --fix` puede crear entradas `safeBinProfiles.<bin>` personalizadas faltantes como `{}` (revísalo y ajústalo después). Los intérpretes/binarios de runtime no se crean automáticamente.

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

Si optas explícitamente por `jq` en `safeBins`, OpenClaw aún rechaza el comando integrado `env` en el modo de safe-bin, de modo que `jq -n env` no pueda volcar el entorno de proceso del host sin una ruta de lista de permitidos explícita o un mensaje de aprobación.

## Edición de la interfaz de usuario de control

Usa la tarjeta **Control UI → Nodes → Exec approvals** para editar los valores predeterminados, las anulaciones por agente y las listas de permitidos. Elige un ámbito (Defaults o un agente), ajusta la política, añade/elimina patrones de lista de permitidos y luego haz clic en **Save**. La interfaz muestra metadatos de **last used** por patrón para que puedas mantener la lista ordenada.

El selector de destino elige **Gateway** (aprobaciones locales) o un **Node**. Los nodos deben anunciar `system.execApprovals.get/set` (aplicación macOS o host de nodo sin interfaz gráfica). Si un nodo aún no anuncia aprobaciones de ejecución, edita su `~/.openclaw/exec-approvals.json` local directamente.

CLI: `openclaw approvals` admite la edición de gateway o de nodo (consulta [Approvals CLI](/es/cli/approvals)).

## Flujo de aprobación

Cuando se requiere un mensaje, la puerta de enlace transmite `exec.approval.requested` a los clientes del operador. La interfaz de usuario de control y la aplicación macOS lo resuelven a través de `exec.approval.resolve` y, a continuación, la puerta de enlace reenvía la solicitud aprobada al host del nodo.

Para `host=node`, las solicitudes de aprobación incluyen una carga útil `systemRunPlan` canónica. La puerta de enlace utiliza ese plan como contexto de comando/cwd/sesión autoritativo al reenviar solicitudes `system.run` aprobadas.

## Comandos de intérprete/runtime

Las ejecuciones de intérprete/runtime respaldadas por aprobaciones son intencionalmente conservadoras:

- El contexto exacto de argv/cwd/env siempre está vinculado.
- Las formas de script de shell directo y de archivo de runtime directo se vinculan, con el mejor esfuerzo posible, a una instantánea de un archivo local concreto.
- Las formas comunes de envoltorio del gestor de paquetes que aún se resuelven en un solo archivo local directo (por ejemplo
  `pnpm exec`, `pnpm node`, `npm exec`, `npx`) se desenvuelven antes del enlace.
- Si OpenClaw no puede identificar exactamente un archivo local concreto para un comando de intérprete/tiempo de ejecución
  (por ejemplo, scripts de paquetes, formularios de evaluación, cadenas de carga específicas del tiempo de ejecución o formularios de
  múltiples archivos ambiguos), la ejecución respaldada por aprobación se deniega en lugar de reclamar una cobertura semántica que no
  tiene.
- Para esos flujos de trabajo, prefiera el sandbox, un límite de host separado o una lista de permitidos explícita y confiable
  /flujo de trabajo completo donde el operador acepte las semánticas más amplias del tiempo de ejecución.

Cuando se requieren aprobaciones, la herramienta exec regresa inmediatamente con un id de aprobación. Use ese id para
correlacionar eventos posteriores del sistema (`Exec finished` / `Exec denied`). Si no llega ninguna decisión antes del
tiempo de espera, la solicitud se trata como un tiempo de espera de aprobación y se presenta como un motivo de denegación.

El diálogo de confirmación incluye:

- comando + argumentos
- directorio de trabajo (cwd)
- id del agente
- ruta ejecutable resuelta
- metadatos de host + política

Acciones:

- **Permitir una vez** → ejecutar ahora
- **Permitir siempre** → agregar a la lista de permitidos + ejecutar
- **Denegar** → bloquear

## Reenvío de aprobaciones a canales de chat

Puede reenviar las solicitudes de aprobación de ejecución a cualquier canal de chat (incluyendo canales de complementos) y aprobarlas
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

Discord y Telegram también pueden actuar como clientes de aprobación de ejecución explícitos con configuración específica del canal.

- Discord: `channels.discord.execApprovals.*`
- Telegram: `channels.telegram.execApprovals.*`

Estos clientes son opcionales. Si un canal no tiene las aprobaciones de ejecución habilitadas, OpenClaw no trata
ese canal como una superficie de aprobación solo porque la conversación ocurrió allí.

Comportamiento compartido:

- solo los aprobadores configurados pueden aprobar o denegar
- el solicitante no necesita ser un aprobador
- cuando la entrega del canal está habilitada, las solicitudes de aprobación incluyen el texto del comando
- si ninguna interfaz de usuario de operador o cliente de aprobación configurado puede aceptar la solicitud, la solicitud vuelve a `askFallback`

Telegram utiliza por defecto los MD del aprobador (`target: "dm"`). Puedes cambiar a `channel` o `both` cuando
quieras que las solicitudes de aprobación aparezcan también en el chat/tema de Telegram de origen. Para los temas de foro de
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
- Verificación de pares del mismo UID.
- Desafío/respuesta (nonce + token HMAC + hash de solicitud) + TTL corto.

## Eventos del sistema

El ciclo de vida de exec se muestra como mensajes del sistema:

- `Exec running` (solo si el comando excede el umbral de aviso de ejecución)
- `Exec finished`
- `Exec denied`

Estos se publican en la sesión del agente después de que el nodo reporta el evento.
Las aprobaciones de exec alojadas en la puerta de enlace emiten los mismos eventos de ciclo de vida cuando finaliza el comando (y opcionalmente cuando se ejecuta por más tiempo que el umbral).
Los execs con puerta de aprobación reutilizan el id de aprobación como el `runId` en estos mensajes para una fácil correlación.

## Implicaciones

- **full** es potente; prefiera listas de permitidos (allowlists) cuando sea posible.
- **ask** lo mantiene informado mientras permite aprobaciones rápidas.
- Las listas de permitidos (allowlists) por agente evitan que las aprobaciones de un agente se filtren en otras.
- Las aprobaciones solo se aplican a las solicitudes de exec del host de **remitentes autorizados**. Los remitentes no autorizados no pueden emitir `/exec`.
- `/exec security=full` es una conveniencia a nivel de sesión para operadores autorizados y omite aprobaciones por diseño.
  Para bloquear por completo el exec del host, configure la seguridad de aprobaciones en `deny` o deniegue la herramienta `exec` mediante la política de herramientas.

Relacionado:

- [Herramienta Exec](/es/tools/exec)
- [Modo elevado](/es/tools/elevated)
- [Habilidades (Skills)](/es/tools/skills)

import es from "/components/footer/es.mdx";

<es />
