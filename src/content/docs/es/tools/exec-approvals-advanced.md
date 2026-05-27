---
summary: "Aprobaciones de exec avanzadas: bins seguros, enlace de intérpretes, reenvío de aprobaciones, entrega nativa"
read_when:
  - Configuring safe bins or custom safe-bin profiles
  - Forwarding approvals to Slack/Discord/Telegram or other chat channels
  - Implementing a native approval client for a channel
title: "Aprobaciones de exec — avanzadas"
---

Temas avanzados de aprobación de exec: la ruta rápida `safeBins`, enlace de intérprete/tiempo de ejecución
y reenvío de aprobaciones a canales de chat (incluida la entrega nativa).
Para conocer la política principal y el flujo de aprobación, consulte [Aprobaciones de exec](/es/tools/exec-approvals).

## Contenedores seguros (solo stdin)

`tools.exec.safeBins` define una pequeña lista de binarios **solo stdin** (por
ejemplo `cut`) que pueden ejecutarse en modo de lista de permitidos **sin** entradas explícitas de lista de permitidos.
Los bins seguros rechazan argumentos de archivo posicionales y tokens tipo ruta, por lo que solo
pueden operar en la flujo de entrada. Trate esto como una ruta rápida estrecha para
filtros de flujo, no como una lista de confianza general.

<Warning>
**No** agregue binarios de intérprete o tiempo de ejecución (por ejemplo `python3`, `node`,
`ruby`, `bash`, `sh`, `zsh`) a `safeBins`. Si un comando puede evaluar código,
ejecutar subcomandos o leer archivos por diseño, prefiera entradas explícitas en la lista de permitidos
y mantenga activados los mensajes de aprobación. Los bins seguros personalizados deben definir un perfil explícito
en `tools.exec.safeBinProfiles.<bin>`.
</Warning>

Contenedores seguros predeterminados:

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` y `sort` no están en la lista predeterminada. Si opta por participar, mantenga entradas explícitas
de lista de permitidos para sus flujos de trabajo que no sean stdin. Para `grep` en modo bin seguro,
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

Los safe bins también fuerzan que los tokens argv se traten como **texto literal** en el momento de la ejecución (sin globbing y sin expansión de `$VARS`) para segmentos de solo stdin, por lo que patrones como `*` o `$HOME/...` no pueden usarse para introducir lecturas de archivos de contrabando.

### Directorios de binarios confiables

Los safe bins deben resolverse desde directorios binarios de confianza (predeterminados del sistema más `tools.exec.safeBinTrustedDirs` opcionales). Las entradas `PATH` nunca se confían automáticamente. Los directorios de confianza predeterminados son intencionalmente mínimos: `/bin`, `/usr/bin`. Si su ejecutable safe-bin se encuentra en rutas de administrador de paquetes/usuario (por ejemplo `/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`), agréguelos explícitamente a `tools.exec.safeBinTrustedDirs`.

### Encadenamiento de shell, envoltorios y multiplexores

Se permite el encadenamiento de shell (`&&`, `||`, `;`) cuando cada segmento de nivel superior
cumple con la lista blanca (incluyendo bins seguros o auto-permitir de habilidad). Los redireccionamientos
siguen sin soporte en el modo de lista blanca. La sustitución de comandos (`$()` / comillas invertidas) es
rechazada durante el análisis de la lista blanca, incluso dentro de comillas dobles; use comillas
simples si necesita texto literal `$()`.

En las aprobaciones de la aplicación complementaria de macOS, el texto de shell sin procesar que contiene sintaxis de control o expansión de shell
(`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) se
trata como un fallo de la lista blanca a menos que el binario de shell en sí esté en la lista blanca.

Para los contenedores de shell (`bash|sh|zsh ... -c/-lc`), las anulaciones de entorno con alcance de solicitud se
reducen a una pequeña lista blanca explícita (`TERM`, `LANG`, `LC_*`, `COLORTERM`,
`NO_COLOR`, `FORCE_COLOR`).

Para las decisiones `allow-always` en el modo de lista blanca, los contenedores de despacho conocidos (`env`,
`nice`, `nohup`, `stdbuf`, `timeout`) persisten la ruta del ejecutable interno en lugar
de la ruta del contenedor. Los multiplexores de shell (`busybox`, `toybox`) se desenvuelven para
las applets de shell (`sh`, `ash`, etc.) de la misma manera. Si un contenedor o multiplexor
no se puede desenvolver de manera segura, no se persiste ninguna entrada de lista blanca automáticamente.

Si permite intérpretes como `python3` o `node`, prefiera
`tools.exec.strictInlineEval=true` para que la evaluación en línea (inline eval) aún requiera una aprobación
explícita. En modo estricto, `allow-always` aún puede persistir invocaciones
benignas de intérprete/guiones, pero los portadores de evaluación en línea no se persisten
automáticamente.

### Safe bins frente a lista de permitidos (allowlist)

| Tema                  | `tools.exec.safeBins`                                                  | Lista blanca (`exec-approvals.json`)                                                                         |
| --------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Objetivo              | Permitir automáticamente filtros de stdin estrechos                    | Confiar explícitamente en ejecutables específicos                                                            |
| Tipo de coincidencia  | Nombre del ejecutable + política de argv de safe-bin                   | Global de ruta de ejecutable resuelta, o global de nombre de comando simple para comandos invocados por PATH |
| Alcance del argumento | Restringido por el perfil de safe-bin y las reglas de tokens literales | Coincidencia de ruta por defecto; el `argPattern` opcional puede restringir el argv analizado                |
| Ejemplos típicos      | `head`, `tail`, `tr`, `wc`                                             | `jq`, `python3`, `node`, `ffmpeg`, CLIs personalizadas                                                       |
| Mejor uso             | Transformaciones de texto de bajo riesgo en tuberías (pipelines)       | Cualquier herramienta con comportamiento más amplio o efectos secundarios                                    |

Ubicación de la configuración:

- `safeBins` proviene de la configuración (`tools.exec.safeBins` o por agente `agents.list[].tools.exec.safeBins`).
- `safeBinTrustedDirs` proviene de la configuración (`tools.exec.safeBinTrustedDirs` o por agente `agents.list[].tools.exec.safeBinTrustedDirs`).
- `safeBinProfiles` proviene de la configuración (`tools.exec.safeBinProfiles` o por agente `agents.list[].tools.exec.safeBinProfiles`). Las claves de perfil por agente anulan las claves globales.
- las entradas de lista blanca residen en `~/.openclaw/exec-approvals.json` local del host bajo `agents.<id>.allowlist` (o vía Control UI / `openclaw approvals allowlist ...`).
- `openclaw security audit` advierte con `tools.exec.safe_bins_interpreter_unprofiled` cuando los binarios de intérprete/runtime aparecen en `safeBins` sin perfiles explícitos.
- `openclaw doctor --fix` puede generar andamios (scaffold) para entradas `safeBinProfiles.<bin>` personalizadas faltantes como `{}` (revise y ajuste después). Los binarios de intérprete/runtime no se generan automáticamente.

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

Si opta explícitamente por `jq` en `safeBins`, OpenClaw aún rechaza el comando integrado `env` en modo de binario seguro
para que `jq -n env` no pueda volcar el entorno del proceso del host sin una ruta de lista blanca explícita
o mensaje de aprobación.

## Comandos de intérprete/runtime

Las ejecuciones de intérprete/runtime con respaldo de aprobación son intencionalmente conservadoras:

- El contexto exacto de argv/cwd/env siempre está vinculado.
- Las formas de archivo de script de shell directo y de archivo de runtime directo se vinculan en la medida de lo posible a una instantánea de un archivo local concreto.
- Las formas comunes de envoltorios de gestores de paquetes que aún se resuelven en un archivo local directo (por ejemplo
  `pnpm exec`, `pnpm node`, `npm exec`, `npx`) se desenvuelven antes del enlace.
- Si OpenClaw no puede identificar exactamente un archivo local concreto para un comando de intérprete/runtime (por ejemplo, scripts de paquete, formas de eval, cadenas de carga específicas del runtime o formas ambiguas de varios archivos), la ejecución con respaldo de aprobación se deniega en lugar de reclamar una cobertura semántica que no tiene.
- Para esos flujos de trabajo, prefiera el uso de sandbox, un límite de host separado o una lista de permitidos/confianza explícita o un flujo de trabajo completo donde el operador acepte las semánticas de runtime más amplias.

Cuando se requieren aprobaciones, la herramienta exec regresa inmediatamente con un id de aprobación. Use ese id para
correlacionar eventos del sistema de ejecuciones aprobadas posteriores (`Exec finished`, y `Exec running` cuando esté configurado).
Si no llega ninguna decisión antes del tiempo de espera, la solicitud se trata como un tiempo de espera de aprobación y
se presenta como una denegación terminal en lugar de un evento del sistema que despierte al agente.

### Comportamiento de entrega de seguimiento

Después de que termina una ejecución asincrónica aprobada, OpenClaw envía un turno de seguimiento `agent` a la misma sesión.

- Si existe un destino de entrega externo válido (canal entregable más objetivo `to`), la entrega de seguimiento usa ese canal.
- En flujos solo de chat web o de sesión interna sin destino externo, la entrega de seguimiento permanece solo en la sesión (`deliver: false`).
- Si una persona que llama solicita explícitamente una entrega externa estricta sin ningún canal externo resoluble, la solicitud falla con `INVALID_REQUEST`.
- Si `bestEffortDeliver` está habilitado y no se puede resolver ningún canal externo, la entrega se degrada a solo sesión en lugar de fallar.

## Reenvío de aprobaciones a canales de chat

Puede reenviar mensajes de aprobación de exec a cualquier canal de chat (incluidos los canales de complementos) y aprobarlos
con `/approve`. Esto usa la canalización de entrega saliente normal.

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

El comando `/approve` maneja tanto las aprobaciones de exec como las aprobaciones de complementos. Si el ID no coincide con una aprobación de exec pendiente, automáticamente verifica las aprobaciones de complementos en su lugar.

### Reenvío de aprobaciones de complementos

El reenvío de aprobaciones de complementos usa la misma canalización de entrega que las aprobaciones de exec, pero tiene su propia
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
`sessionFilter`, y `targets` funcionan de la misma manera.

Los canales que admiten respuestas interactivas compartidas renderizan los mismos botones de aprobación tanto para aprobaciones de ejecución como de complementos. Los canales sin una interfaz de usuario interactiva compartida recurren a texto plano con instrucciones `/approve`. Las solicitudes de aprobación de complementos pueden restringir las decisiones disponibles. Las superficies de aprobación utilizan el conjunto de decisiones declarado en la solicitud, y el Gateway rechaza los intentos de enviar una decisión que no se haya ofrecido.

### Aprobaciones en el mismo chat en cualquier canal

Cuando una solicitud de aprobación de ejecución o complemento proviene de una superficie de chat entregable, el mismo chat ahora puede aprobarla con `/approve` de forma predeterminada. Esto se aplica a canales como Slack, Matrix y Microsoft Teams, además de los flujos existentes de interfaz de usuario web y de terminal.

Esta ruta compartida de comandos de texto utiliza el modelo de autenticación de canal normal para esa conversación. Si el
chat de origen ya puede enviar comandos y recibir respuestas, las solicitudes de aprobación ya no necesitan
un adaptador de entrega nativo separado solo para permanecer pendientes.

Discord y Telegram también admiten `/approve` en el mismo chat, pero esos canales todavía utilizan su lista de aprobadores resuelta para la autorización, incluso cuando la entrega de aprobación nativa está deshabilitada.

Para Telegram y otros clientes de aprobación nativos que llaman al Gateway directamente, este respaldo se limita intencionalmente a los fallos de "aprobación no encontrada". Una denegación/error real de aprobación de ejecución no se reintenta silenciosamente como una aprobación de complemento.

### Entrega de aprobación nativa

Algunos canales también pueden actuar como clientes de aprobación nativos. Los clientes nativos agregan MD de aprobadores, distribución al chat de origen y una experiencia de usuario de aprobación interactiva específica del canal sobre el flujo `/approve` compartido en el mismo chat.

Cuando están disponibles las tarjetas/botones de aprobación nativos, esa interfaz de usuario nativa es la ruta principal orientada al agente. El agente no debe repetir también un comando `/approve` de chat plano duplicado, a menos que el resultado de la herramienta indique que las aprobaciones por chat no están disponibles o que la aprobación manual es la única ruta restante.

Si se configura un cliente de aprobación nativo pero no hay un tiempo de ejecución nativo activo para el canal de origen, OpenClaw mantiene visible el mensaje `/approve` determinista local. Si el tiempo de ejecución nativo está activo e intenta la entrega pero ningún objetivo recibe la tarjeta, OpenClaw envía un aviso de reserva en el mismo chat con el comando exacto `/approve <id> <decision>` para que la solicitud aún se pueda resolver.

Modelo genérico:

- la política de ejecución del host todavía decide si se requiere la aprobación de ejecución
- `approvals.exec` controla el reenvío de mensajes de aprobación a otros destinos de chat
- `channels.<channel>.execApprovals` controla si ese canal actúa como un cliente de aprobación nativo
- Las aprobaciones del complemento de Slack pueden usar el cliente de aprobación nativo de Slack cuando la solicitud proviene de Slack
  y los aprobadores del complemento de Slack resuelven; `approvals.plugin` también puede enrutar las aprobaciones del complemento a sesiones
  o destinos de Slack incluso cuando las aprobaciones de ejecución de Slack están deshabilitadas
- La entrega de aprobaciones por emoji de WhatsApp está controlada por `approvals.exec` y `approvals.plugin`, mientras
  que las reacciones de aprobación requieren aprobadores explícitos de WhatsApp de `channels.whatsapp.allowFrom` o `"*"`

Los clientes de aprobación nativos habilitan automáticamente la entrega优先 como mensaje directo cuando se cumplen todos estos requisitos:

- el canal admite la entrega de aprobación nativa
- se pueden resolver los aprobadores a partir de `execApprovals.approvers` explícitos o de la identidad
  del propietario, como `commands.ownerAllowFrom`
- `channels.<channel>.execApprovals.enabled` no está definido o es `"auto"`

Establezca `enabled: false` para deshabilitar explícitamente un cliente de aprobación nativo. Establezca `enabled: true` para forzarlo
cuando se resuelvan los aprobadores. La entrega pública al chat de origen permanece explícita a través de
`channels.<channel>.execApprovals.target`.

Preguntas frecuentes: [¿Por qué hay dos configuraciones de aprobación de ejecución para las aprobaciones de chat?](/es/help/faq-first-run#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord: `channels.discord.execApprovals.*`
- Slack: `channels.slack.execApprovals.*`
- Telegram: `channels.telegram.execApprovals.*`
- WhatsApp: use `approvals.exec` y `approvals.plugin` para enrutar los mensajes de solicitud de aprobación a WhatsApp

Estos clientes de aprobación nativos agregan enrutamiento por mensaje directo y difusión opcional en el canal sobre el flujo compartido de `/approve` en el mismo chat y los botones de aprobación compartidos.

Comportamiento compartido:

- Slack, Matrix, Microsoft Teams y chats entregables similares usan el modelo normal de autenticación del canal
  para `/approve` en el mismo chat
- cuando un cliente de aprobación nativo se habilita automáticamente, el destino de entrega nativo predeterminado son los mensajes directos de los aprobadores
- para Discord y Telegram, solo los aprobadores resueltos pueden aprobar o denegar
- los aprobadores de Discord pueden ser explícitos (`execApprovals.approvers`) o inferidos de `commands.ownerAllowFrom`
- los aprobadores de Telegram pueden ser explícitos (`execApprovals.approvers`) o inferidos de `commands.ownerAllowFrom`
- Los aprobadores de Slack pueden ser explícitos (`execApprovals.approvers`) o deducidos de `commands.ownerAllowFrom`
- Los MD de aprobación de complementos de Slack utilizan los aprobadores de complementos de Slack de `allowFrom` y el enrutamiento predeterminado de la cuenta, no los aprobadores de ejecución de Slack
- Los botones nativos de Slack conservan el tipo de id de aprobación, por lo que los ids `plugin:` pueden resolver aprobaciones de complementos sin una segunda capa de reserva local de Slack
- Las aprobaciones con emojis de WhatsApp manejan tanto las solicitudes de ejecución como las de complementos solo cuando la familia de reenvío de nivel superior coincidente está habilitada y se enruta a WhatsApp; el reenvío de WhatsApp solo de destino permanece en la ruta de reenvío compartida a menos que coincida con el mismo objetivo de origen nativo
- El enrutamiento nativo de DM/canal de Matrix y los accesos directos de reacción manejan tanto las aprobaciones de ejecución como las de complementos; la autorización del complemento aún proviene de `channels.matrix.dm.allowFrom`
- Las solicitudes nativas de Matrix incluyen `com.openclaw.approval` contenido de evento personalizado en el primer evento de solicitud para que los clientes de Matrix compatibles con OpenClaw puedan leer el estado de aprobación estructurado, mientras que los clientes estándar mantienen el respaldo de texto plano `/approve`
- el solicitante no necesita ser un aprobador
- el chat de origen puede aprobar directamente con `/approve` cuando ese chat ya admite comandos y respuestas
- los botones nativos de aprobación de Discord se enrutan por tipo de id de aprobación: los ids `plugin:` van directamente a las aprobaciones de complementos, todo lo demás va a las aprobaciones de ejecución
- los botones nativos de aprobación de Telegram siguen la misma reserva de ejecución a complemento limitada que `/approve`
- cuando `target` nativo habilita la entrega al chat de origen, las solicitudes de aprobación incluyen el texto del comando
- las aprobaciones de ejecución pendientes caducan después de 30 minutos de forma predeterminada
- si ninguna interfaz de usuario de operador o cliente de aprobación configurado puede aceptar la solicitud, la solicitud recurre a `askFallback`

Los comandos de grupo confidenciales solo para propietario, como `/diagnostics` y `/export-trajectory`, utilizan un enrutamiento privado
al propietario para los mensajes de aprobación y los resultados finales. OpenClaw primero intenta una ruta privada en la
misma superficie donde el propietario ejecutó el comando. Si esa superficie no tiene ruta privada al propietario, recurre
a la primera ruta de propietario disponible desde `commands.ownerAllowFrom`, de modo que un comando de grupo de Discord
aún puede enviar la aprobación y el resultado al MD de Telegram del propietario cuando Telegram es la interfaz privada
principal configurada. El chat de grupo solo recibe un breve acuse de recibo.

Telegram utiliza por defecto los MD del aprobador (`target: "dm"`). Puedes cambiar a `channel` o `both` cuando quieras
que los mensajes de aprobación también aparezcan en el chat/tema de Telegram de origen. Para los temas de foro de
Telegram, OpenClaw conserva el tema para el mensaje de aprobación y el seguimiento posterior a la aprobación.

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

## Preguntas frecuentes

### ¿Cuándo se utilizarían `accountId` y `threadId` en un objetivo de aprobación?

Use `accountId` cuando el canal tenga múltiples identidades configuradas y el mensaje de aprobación deba
salir a través de una cuenta específica. Use `threadId` cuando el destino admita temas o
hilos y el mensaje debe permanecer dentro de ese hilo en lugar del chat de nivel superior.

Un caso concreto de Telegram es un supergrupo de operaciones con temas de foro y dos cuentas de bot de
Telegram. El valor `to` nombra el supergrupo, `accountId` selecciona la cuenta del bot y `threadId`
selecciona el tema del foro:

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "targets",
      targets: [
        {
          channel: "telegram",
          to: "-1001234567890",
          accountId: "ops-bot",
          threadId: "77",
        },
      ],
    },
  },
  channels: {
    telegram: {
      accounts: {
        default: {
          name: "Primary bot",
          botToken: "env:TELEGRAM_PRIMARY_BOT_TOKEN",
        },
        "ops-bot": {
          name: "Operations bot",
          botToken: "env:TELEGRAM_OPS_BOT_TOKEN",
        },
      },
    },
  },
}
```

Con esa configuración, las aprobaciones de ejecución reenviadas son publicadas por la cuenta de `ops-bot` Telegram en el tema `77` del chat `-1001234567890`. Un objetivo sin `accountId` usa la cuenta predeterminada del canal, y un objetivo sin `threadId` publica en el destino de nivel superior.

### Cuando se envían aprobaciones a una sesión, ¿cualquier persona en esa sesión puede aprobarlas?

No. La entrega a la sesión solo controla dónde aparece el mensaje. No autoriza por sí sola a cada participante en ese chat para aprobar.

Para `/approve` genéricas del mismo chat, el remitente ya debe estar autorizado para comandos en esa sesión de canal. Si el canal expone aprobadores explícitos, esos aprobadores pueden autorizar la acción `/approve` incluso cuando no están autorizados para comandos de otra manera en esa sesión.

Algunos canales son más estrictos. Discord, Telegram, Matrix, MD de aprobación nativa de Slack y clientes de aprobación nativa similares usan sus listas de aprobadores resueltas para la autorización de aprobación. Por ejemplo, un mensaje de aprobación de tema de foro de Telegram puede ser visible para todos en el tema, pero solo los IDs de usuario numéricos de Telegram resueltos de `channels.telegram.execApprovals.approvers` o `commands.ownerAllowFrom` pueden aprobarlo o denegarlo.

## Relacionado

- [Aprobaciones de ejecución](/es/tools/exec-approvals) — política principal y flujo de aprobación
- [Herramienta Exec](/es/tools/exec)
- [Modo elevado](/es/tools/elevated)
- [Habilidades](/es/tools/skills) — comportamiento de autorpermiso automático respaldado por habilidades
