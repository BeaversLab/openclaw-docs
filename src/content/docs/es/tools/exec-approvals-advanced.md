---
summary: "Aprobaciones de ejecución avanzadas: contenedores seguros (safe bins), vinculación de intérpretes, reenvío de aprobaciones, entrega nativa"
read_when:
  - Configuring safe bins or custom safe-bin profiles
  - Forwarding approvals to Slack/Discord/Telegram or other chat channels
  - Implementing a native approval client for a channel
title: "Aprobaciones de ejecución — avanzado"
---

Temas avanzados de aprobaciones de ejecución: la ruta rápida `safeBins`, vinculación de intérprete/tiempo de ejecución y reenvío de aprobaciones a canales de chat (incluida la entrega nativa). Para ver la política principal y el flujo de aprobaciones, consulte [Aprobaciones de ejecución](/es/tools/exec-approvals).

## Contenedores seguros (solo stdin)

`tools.exec.safeBins` define una pequeña lista de binarios **solo stdin** (por ejemplo, `cut`) que pueden ejecutarse en modo de lista de permitidos **sin** entradas explícitas en la lista de permitidos. Los contenedores seguros rechazan los argumentos de archivo posicionales y los tokens tipo ruta, por lo que solo pueden operar en la secuencia entrante. Trate esto como una ruta rápida estrecha para filtros de secuencias, no una lista de confianza general.

<Warning>
**No** agregue binarios de intérprete o tiempo de ejecución (por ejemplo, `python3`, `node`,
`ruby`, `bash`, `sh`, `zsh`) a `safeBins`. Si un comando puede evaluar código,
ejecutar subcomandos o leer archivos por diseño, prefiera entradas explícitas en la lista de permitidos
y mantenga habilitadas las solicitudes de aprobación. Los contenedores seguros personalizados deben definir un perfil
explícito en `tools.exec.safeBinProfiles.<bin>`.
</Warning>

Contenedores seguros predeterminados:

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` y `sort` no están en la lista predeterminada. Si opta por incluirlos, mantenga entradas
explícitas en la lista de permitidos para sus flujos de trabajo que no sean stdin. Para `grep` en modo de contenedor seguro,
proporcione el patrón con `-e`/`--regexp`; se rechaza el formato de patrón posicional
para que los operandos de archivo no puedan ser introducidos de contrabando como posicionales ambiguos.

### Validación de argumentos (Argv) y marcas (flags) denegadas

La validación es determinista solo a partir de la forma de argv (sin verificaciones de existencia del sistema de archivos del host), lo que evita el comportamiento de oráculo de existencia de archivos por diferencias de permiso/denegación. Las opciones orientadas a archivos se deniegan para los safe bins predeterminados; las opciones largas se validan con cierre de fallos (los indicadores desconocidos y las abreviaturas ambiguas se rechazan).

Indicadores denegados por perfil de safe-bin:

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`: `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

Los safe bins también fuerzan que los tokens de argv se traten como **texto literal** en el momento de la ejecución (sin globbing y sin expansión de `$VARS`) para los segmentos de solo stdin, por lo que patrones como `*` o `$HOME/...` no se pueden usar para introducir lecturas de archivos de contrabando.

### Directorios de binarios confiables

Los safe bins deben resolverse desde directorios de binarios confiables (valores predeterminados del sistema más `tools.exec.safeBinTrustedDirs` opcionales). Las entradas `PATH` nunca son de confianza automática. Los directorios de confianza predeterminados son intencionalmente mínimos: `/bin`, `/usr/bin`. Si su ejecutable safe-bin vive en rutas de gestor de paquetes/usuario (por ejemplo, `/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`), agréguelos explícitamente a `tools.exec.safeBinTrustedDirs`.

### Encadenamiento de shell, envoltorios y multiplexores

El encadenamiento de shell (`&&`, `||`, `;`) está permitido cuando cada segmento de nivel superior
cumple con la lista de permitidos (incluyendo bins seguros o permiso automático de habilidades). Las redirecciones
siguen sin ser compatibles en el modo de lista de permitidos. La sustitución de comandos (`$()` / comillas invertidas) es
rechazada durante el análisis de la lista de permitidos, incluyendo dentro de comillas dobles; use comillas
simples si necesita texto literal `$()`.

En las aprobaciones de la aplicación complementaria de macOS, el texto de shell sin procesar que contiene sintaxis de control o
de expansión de shell (`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) se
trata como un fallo en la lista de permitidos a menos que el binario de shell en sí mismo esté en la lista de permitidos.

Para los envoltorios de shell (`bash|sh|zsh ... -c/-lc`), las anulaciones de variables de entorno con ámbito de solicitud se
reducen a una pequeña lista de permitidos explícita (`TERM`, `LANG`, `LC_*`, `COLORTERM`,
`NO_COLOR`, `FORCE_COLOR`).

Para las decisiones de `allow-always` en el modo de lista de permitidos, los envoltorios de despacho conocidos (`env`,
`nice`, `nohup`, `stdbuf`, `timeout`) persisten la ruta del ejecutable interno en lugar
de la ruta del envoltorio. Los multiplexores de shell (`busybox`, `toybox`) se desenvuelven para
los applets de shell (`sh`, `ash`, etc.) de la misma manera. Si un envoltorio o multiplexor
no se puede desenvolver de manera segura, no se persiste automáticamente ninguna entrada en la lista de permitidos.

Si permite intérpretes como `python3` o `node`, es preferible
usar `tools.exec.strictInlineEval=true` para que la evaluación en línea (inline eval) aún requiera una
aprobación explícita. En modo estricto, `allow-always` todavía puede persistir
invocaciones benignas de intérpretes/guiones (scripts), pero los portadores de evaluación en línea no se
persisten automáticamente.

### Safe bins frente a lista de permitidos (allowlist)

| Tema                  | `tools.exec.safeBins`                                                  | Lista de permitidos (`exec-approvals.json`)                                                                  |
| --------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Objetivo              | Permitir automáticamente filtros de stdin estrechos                    | Confiar explícitamente en ejecutables específicos                                                            |
| Tipo de coincidencia  | Nombre del ejecutable + política de argv de safe-bin                   | Global de ruta de ejecutable resuelta, o global de nombre de comando simple para comandos invocados por PATH |
| Alcance del argumento | Restringido por el perfil de safe-bin y las reglas de tokens literales | Solo coincidencia de ruta; los argumentos son de su responsabilidad                                          |
| Ejemplos típicos      | `head`, `tail`, `tr`, `wc`                                             | `jq`, `python3`, `node`, `ffmpeg`, CLIs personalizadas                                                       |
| Mejor uso             | Transformaciones de texto de bajo riesgo en tuberías (pipelines)       | Cualquier herramienta con comportamiento más amplio o efectos secundarios                                    |

Ubicación de la configuración:

- `safeBins` proviene de la configuración (`tools.exec.safeBins` o `agents.list[].tools.exec.safeBins` por agente).
- `safeBinTrustedDirs` proviene de la configuración (`tools.exec.safeBinTrustedDirs` o `agents.list[].tools.exec.safeBinTrustedDirs` por agente).
- `safeBinProfiles` proviene de la configuración (`tools.exec.safeBinProfiles` o `agents.list[].tools.exec.safeBinProfiles` por agente). Las claves de perfil por agente anulan las claves globales.
- las entradas de la lista de permitidos (allowlist) residen en `~/.openclaw/exec-approvals.json` local del host bajo `agents.<id>.allowlist` (o a través de Control UI / `openclaw approvals allowlist ...`).
- `openclaw security audit` advierte con `tools.exec.safe_bins_interpreter_unprofiled` cuando los binarios de intérprete/tiempo de ejecución aparecen en `safeBins` sin perfiles explícitos.
- `openclaw doctor --fix` puede crear entradas personalizadas faltantes de `safeBinProfiles.<bin>` como `{}` (revíselas y ajústelas después). Los binarios de intérprete/runtime no se crean automáticamente.

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

Si activa explícitamente `jq` en `safeBins`, OpenClaw aún rechaza el comando integrado `env` en modo de safe-bin, por lo que `jq -n env` no puede volcar el entorno del proceso del host sin una ruta de lista de permitidos explícita o un mensaje de aprobación.

## Comandos de intérprete/runtime

Las ejecuciones de intérprete/runtime con respaldo de aprobación son intencionalmente conservadoras:

- El contexto exacto de argv/cwd/env siempre está vinculado.
- Las formas de archivo de script de shell directo y de archivo de runtime directo se vinculan en la medida de lo posible a una instantánea de un archivo local concreto.
- Las formas comunes de contenedores de gestores de paquetes que aún se resuelven en un archivo local directo (por ejemplo, `pnpm exec`, `pnpm node`, `npm exec`, `npx`) se desenvuelven antes del vinculado.
- Si OpenClaw no puede identificar exactamente un archivo local concreto para un comando de intérprete/runtime (por ejemplo, scripts de paquete, formas de eval, cadenas de carga específicas del runtime o formas ambiguas de varios archivos), la ejecución con respaldo de aprobación se deniega en lugar de reclamar una cobertura semántica que no tiene.
- Para esos flujos de trabajo, prefiera el uso de sandbox, un límite de host separado o una lista de permitidos/confianza explícita o un flujo de trabajo completo donde el operador acepte las semánticas de runtime más amplias.

Cuando se requieren aprobaciones, la herramienta exec regresa inmediatamente con un id de aprobación. Use ese id para correlacionar eventos posteriores del sistema (`Exec finished` / `Exec denied`). Si no llega ninguna decisión antes del tiempo de espera, la solicitud se trata como un tiempo de espera de aprobación y se presenta como un motivo de denegación.

### Comportamiento de entrega de seguimiento

Después de que finaliza un exec asíncrono aprobado, OpenClaw envía un turno de seguimiento `agent` a la misma sesión.

- Si existe un objetivo de entrega externo válido (canal entregable más objetivo `to`), la entrega de seguimiento utiliza ese canal.
- En flujos de solo chat web o de sesión interna sin un objetivo externo, la entrega de seguimiento se limita a la sesión (`deliver: false`).
- Si un solicitante solicita explícitamente una entrega externa estricta sin ningún canal externo resoluble, la solicitud falla con `INVALID_REQUEST`.
- Si `bestEffortDeliver` está habilitado y no se puede resolver ningún canal externo, la entrega se degrada a solo sesión en lugar de fallar.

## Reenvío de aprobaciones a canales de chat

Puede reenviar las solicitudes de aprobación de ejecución a cualquier canal de chat (incluidos los canales de complementos) y aprobarlas
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

Los canales que admiten respuestas interactivas compartidas renderizan los mismos botones de aprobación tanto para las aprobaciones de
ejecución como para las de complementos. Los canales sin interfaz de usuario interactiva compartida recurren al texto plano con instrucciones
`/approve`.

### Aprobaciones en el mismo chat en cualquier canal

Cuando una solicitud de aprobación de ejecución o de complemento se origina en una superficie de chat entregable, el mismo chat
ahora puede aprobarla con `/approve` de manera predeterminada. Esto se aplica a canales como Slack, Matrix y
Microsoft Teams, además de los flujos existentes de la interfaz de usuario web y de terminal.

Esta ruta compartida de comandos de texto utiliza el modelo de autenticación de canal normal para esa conversación. Si el
chat de origen ya puede enviar comandos y recibir respuestas, las solicitudes de aprobación ya no necesitan
un adaptador de entrega nativo separado solo para permanecer pendientes.

Discord y Telegram también admiten el mismo chat `/approve`, pero esos canales todavía usan su lista de aprobadores resuelta para la autorización, incluso cuando la entrega de aprobación nativa está deshabilitada.

Para Telegram y otros clientes de aprobación nativos que llaman al Gateway directamente, este respaldo se limita intencionalmente a los fallos de "aprobación no encontrada". Una denegación/error real de aprobación de ejecución no se reintenta silenciosamente como una aprobación de complemento.

### Entrega de aprobación nativa

Algunos canales también pueden actuar como clientes de aprobación nativos. Los clientes nativos agregan MD de aprobadores, distribución al chat de origen y experiencia de usuario de aprobación interactiva específica del canal sobre el flujo `/approve` del mismo chat compartido.

Cuando están disponibles las tarjetas/botones de aprobación nativos, esa interfaz de usuario nativa es la ruta principal orientada al agente. El agente no debe repetir también un comando `/approve` de chat plano duplicado, a menos que el resultado de la herramienta indique que las aprobaciones de chat no están disponibles o que la aprobación manual es la única ruta restante.

Modelo genérico:

- la política de ejecución del host todavía decide si se requiere aprobación de ejecución
- `approvals.exec` controla el reenvío de solicitudes de aprobación a otros destinos de chat
- `channels.<channel>.execApprovals` controla si ese canal actúa como un cliente de aprobación nativo

Los clientes de aprobación nativos habilitan automáticamente la entrega primero por DM cuando todos estos son verdaderos:

- el canal admite la entrega de aprobación nativa
- los aprobadores se pueden resolver desde un `execApprovals.approvers` explícito o desde las fuentes de respaldo documentadas de ese canal
- `channels.<channel>.execApprovals.enabled` no está configurado o es `"auto"`

Configure `enabled: false` para deshabilitar explícitamente un cliente de aprobación nativo. Configure `enabled: true` para forzarlo cuando se resuelven los aprobadores. La entrega pública al chat de origen permanece explícita a través de `channels.<channel>.execApprovals.target`.

Preguntas frecuentes: [¿Por qué hay dos configuraciones de aprobación de ejecución para las aprobaciones de chat?](/es/help/faq-first-run#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord: `channels.discord.execApprovals.*`
- Slack: `channels.slack.execApprovals.*`
- Telegram: `channels.telegram.execApprovals.*`

Estos clientes de aprobación nativos agregan enrutamiento por DM y distribución opcional de canales sobre el flujo `/approve` del mismo chat compartido y botones de aprobación compartidos.

Compartir comportamiento:

- Slack, Matrix, Microsoft Teams y chats entregables similares usan el modelo de autenticación de canal normal
  para el mismo chat `/approve`
- cuando un cliente de aprobación nativo se habilita automáticamente, el objetivo de entrega nativa predeterminado son los MD de los aprobadores
- para Discord y Telegram, solo los aprobadores resueltos pueden aprobar o denegar
- los aprobadores de Discord pueden ser explícitos (`execApprovals.approvers`) o inferidos de `commands.ownerAllowFrom`
- los aprobadores de Telegram pueden ser explícitos (`execApprovals.approvers`) o inferidos de la configuración de propietario existente (`allowFrom`, más mensaje directo `defaultTo` cuando sea compatible)
- los aprobadores de Slack pueden ser explícitos (`execApprovals.approvers`) o inferidos de `commands.ownerAllowFrom`
- los botones nativos de Slack conservan el tipo de id de aprobación, por lo que los ids `plugin:` pueden resolver aprobaciones de complementos
  sin una segunda capa de reserva local de Slack
- el enrutamiento nativo de DM/canal de Matrix y los atajos de reacción manejan tanto las aprobaciones de ejecución como las de complementos;
  la autorización del complemento aún proviene de `channels.matrix.dm.allowFrom`
- el solicitante no necesita ser un aprobador
- el chat de origen puede aprobar directamente con `/approve` cuando ese chat ya admite comandos y respuestas
- los botones de aprobación nativos de Discord enrutan por tipo de id de aprobación: los ids `plugin:` van
  directamente a las aprobaciones de complementos, todo lo demás va a las aprobaciones de ejecución
- los botones de aprobación nativos de Telegram siguen la misma reserva limitada de ejecución a complemento que `/approve`
- cuando el nativo `target` habilita la entrega al chat de origen, las solicitudes de aprobación incluyen el texto del comando
- las aprobaciones de ejecución pendientes caducan después de 30 minutos de forma predeterminada
- si ninguna interfaz de usuario de operador o cliente de aprobación configurado puede aceptar la solicitud, el aviso vuelve a `askFallback`

Telegram usa por defecto los MD de los aprobadores (`target: "dm"`). Puedes cambiar a `channel` o `both` cuando
quieras que las solicitudes de aprobación también aparezcan en el chat/tema de Telegram de origen. Para los temas de foro
de Telegram, OpenClaw conserva el tema para la solicitud de aprobación y el seguimiento posterior a la aprobación.

Ver:

- [Discord](/es/channels/discord)
- [Telegram](/es/channels/telegram)

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

## Relacionado

- [Aprobaciones de ejecución](/es/tools/exec-approvals) — política principal y flujo de aprobación
- [Herramienta Exec](/es/tools/exec)
- [Modo elevado](/es/tools/elevated)
- [Habilidades](/es/tools/skills) — comportamiento de permiso automático respaldado por habilidades
