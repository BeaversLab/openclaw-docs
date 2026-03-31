---
summary: "Estado de soporte de Matrix, configuración y ejemplos de configuración"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix (complemento)

Matrix es el complemento de canal de Matrix para OpenClaw.
Utiliza el `matrix-js-sdk` oficial y admite MDs, salas, hilos, medios, reacciones, encuestas, ubicación y E2EE.

## Complemento requerido

Matrix es un complemento y no se incluye con el núcleo de OpenClaw.

Instalar desde npm:

```bash
openclaw plugins install @openclaw/matrix
```

Instalar desde una copia local:

```bash
openclaw plugins install ./extensions/matrix
```

Consulte [Plugins](/en/tools/plugin) para conocer el comportamiento del complemento y las reglas de instalación.

## Configuración

1. Instale el complemento.
2. Cree una cuenta de Matrix en su servidor doméstico.
3. Configure `channels.matrix` con:
   - `homeserver` + `accessToken`, o
   - `homeserver` + `userId` + `password`.
4. Reinicie la puerta de enlace.
5. Inicie un MD con el bot o invítelo a una sala.

Rutas de configuración interactiva:

```bash
openclaw channels add
openclaw configure --section channels
```

Lo que realmente solicita el asistente de Matrix:

- URL del servidor doméstico
- método de autenticación: token de acceso o contraseña
- ID de usuario solo cuando elige autenticación por contraseña
- nombre de dispositivo opcional
- si habilitar E2EE
- si configurar el acceso a la sala de Matrix ahora

Comportamiento del asistente que importa:

- Si las variables de entorno de autenticación de Matrix ya existen para la cuenta seleccionada y esa cuenta aún no tiene autenticación guardada en la configuración, el asistente ofrece un acceso directo de entorno y solo escribe `enabled: true` para esa cuenta.
- Cuando agrega otra cuenta de Matrix de forma interactiva, el nombre de cuenta ingresado se normaliza en el ID de cuenta utilizado en la configuración y las variables de entorno. Por ejemplo, `Ops Bot` se convierte en `ops-bot`.
- Las solicitudes de lista de permitidos de MD aceptan valores completos de `@user:server` inmediatamente. Los nombres para mostrar solo funcionan cuando la búsqueda en vivo del directorio encuentra una coincidencia exacta; de lo contrario, el asistente le pide que reintente con un ID de Matrix completo.
- Las solicitudes de lista de permitidos de salas aceptan ID de salas y alias directamente. También pueden resolver nombres de salas unidas en vivo, pero los nombres no resueltos solo se mantienen tal como se escribieron durante la configuración y el tiempo de ejecución los ignora más tarde. Prefiera `!room:server` o `#alias:server`.
- La identidad de la sala/sesión en tiempo de ejecución utiliza el ID de sala de Matrix estable. Los alias declarados por la sala solo se utilizan como entradas de búsqueda, no como la clave de sesión a largo plazo o la identidad de grupo estable.
- Para resolver los nombres de las salas antes de guardarlos, use `openclaw channels resolve --channel matrix "Project Room"`.

Configuración mínima basada en token:

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      dm: { policy: "pairing" },
    },
  },
}
```

Configuración basada en contraseña (el token se almacena en caché después del inicio de sesión):

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      userId: "@bot:example.org",
      password: "replace-me", // pragma: allowlist secret
      deviceName: "OpenClaw Gateway",
    },
  },
}
```

Matrix almacena las credenciales en caché en `~/.openclaw/credentials/matrix/`.
La cuenta predeterminada usa `credentials.json`; las cuentas con nombre usan `credentials-<account>.json`.

Variables de entorno equivalentes (se usan cuando no se establece la clave de configuración):

- `MATRIX_HOMESERVER`
- `MATRIX_ACCESS_TOKEN`
- `MATRIX_USER_ID`
- `MATRIX_PASSWORD`
- `MATRIX_DEVICE_ID`
- `MATRIX_DEVICE_NAME`

Para cuentas no predeterminadas, use variables de entorno con ámbito de cuenta:

- `MATRIX_<ACCOUNT_ID>_HOMESERVER`
- `MATRIX_<ACCOUNT_ID>_ACCESS_TOKEN`
- `MATRIX_<ACCOUNT_ID>_USER_ID`
- `MATRIX_<ACCOUNT_ID>_PASSWORD`
- `MATRIX_<ACCOUNT_ID>_DEVICE_ID`
- `MATRIX_<ACCOUNT_ID>_DEVICE_NAME`

Ejemplo para la cuenta `ops`:

- `MATRIX_OPS_HOMESERVER`
- `MATRIX_OPS_ACCESS_TOKEN`

Para el ID de cuenta normalizado `ops-bot`, use:

- `MATRIX_OPS_BOT_HOMESERVER`
- `MATRIX_OPS_BOT_ACCESS_TOKEN`

El asistente interactivo solo ofrece el atajo de variable de entorno cuando esas variables de entorno de autenticación ya están presentes y la cuenta seleccionada aún no tiene la autenticación de Matrix guardada en la configuración.

## Ejemplo de configuración

Esta es una configuración base práctica con emparejamiento DM, lista de permitidos de salas y E2EE habilitado:

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      encryption: true,

      dm: {
        policy: "pairing",
      },

      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
      groups: {
        "!roomid:example.org": {
          requireMention: true,
        },
      },

      autoJoin: "allowlist",
      autoJoinAllowlist: ["!roomid:example.org"],
      threadReplies: "inbound",
      replyToMode: "off",
    },
  },
}
```

## Configuración de E2EE

## Salas de bot a bot

De manera predeterminada, los mensajes de Matrix de otras cuentas de Matrix de OpenClaw configuradas se ignoran.

Use `allowBots` cuando intencionalmente desee tráfico de Matrix entre agentes:

```json5
{
  channels: {
    matrix: {
      allowBots: "mentions", // true | "mentions"
      groups: {
        "!roomid:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

- `allowBots: true` acepta mensajes de otras cuentas de bot de Matrix configuradas en salas y DMs permitidos.
- `allowBots: "mentions"` acepta esos mensajes solo cuando mencionan visiblemente a este bot en las salas. Los DMs todavía están permitidos.
- `groups.<room>.allowBots` anula la configuración a nivel de cuenta para una sola sala.
- OpenClaw aún ignora los mensajes del mismo ID de usuario de Matrix para evitar bucles de autoreplica.
- Matrix no expone una marca de bot nativa aquí; OpenClaw trata "autoría de bot" como "enviado por otra cuenta de Matrix configurada en esta puerta de enlace de OpenClaw".

Use listas de permisos de habitaciones estrictas y requisitos de mención al habilitar el tráfico de bot a bot en salas compartidas.

Habilitar cifrado:

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      encryption: true,
      dm: { policy: "pairing" },
    },
  },
}
```

Verificar estado de verificación:

```bash
openclaw matrix verify status
```

Estado detallado (diagnósticos completos):

```bash
openclaw matrix verify status --verbose
```

Incluir la clave de recuperación almacenada en la salida legible por máquina:

```bash
openclaw matrix verify status --include-recovery-key --json
```

Inicializar el estado de firma cruzada y verificación:

```bash
openclaw matrix verify bootstrap
```

Soporte multi-cuenta: use `channels.matrix.accounts` con credenciales por cuenta y `name` opcional. Consulte [Referencia de configuración](/en/gateway/configuration-reference#multi-account-all-channels) para ver el patrón compartido.

Diagnósticos detallados de inicialización:

```bash
openclaw matrix verify bootstrap --verbose
```

Forzar un restablecimiento fresco de la identidad de firma cruzada antes de inicializar:

```bash
openclaw matrix verify bootstrap --force-reset-cross-signing
```

Verificar este dispositivo con una clave de recuperación:

```bash
openclaw matrix verify device "<your-recovery-key>"
```

Detalles detallados de la verificación del dispositivo:

```bash
openclaw matrix verify device "<your-recovery-key>" --verbose
```

Verificar el estado de salud de la copia de seguridad de las claves de sala:

```bash
openclaw matrix verify backup status
```

Diagnósticos detallados de salud de la copia de seguridad:

```bash
openclaw matrix verify backup status --verbose
```

Restaurar claves de sala desde la copia de seguridad del servidor:

```bash
openclaw matrix verify backup restore
```

Diagnósticos detallados de restauración:

```bash
openclaw matrix verify backup restore --verbose
```

Eliminar la copia de seguridad actual del servidor y crear una línea de base de copia de seguridad nueva:

```bash
openclaw matrix verify backup reset --yes
```

Todos los comandos `verify` son concisos de forma predeterminada (incluyendo el registro interno silencioso del SDK) y muestran diagnósticos detallados solo con `--verbose`.
Use `--json` para obtener una salida legible por máquina completa al realizar scripts.

En configuraciones multicuenta, los comandos de la CLI de Matrix usan la cuenta predeterminada implícita de Matrix a menos que pase `--account <id>`.
Si configura varias cuentas con nombre, establezca `channels.matrix.defaultAccount` primero o esas operaciones implícitas de la CLI se detendrán y le pedirán que elija una cuenta explícitamente.
Use `--account` siempre que desee que las operaciones de verificación o de dispositivo tengan como objetivo una cuenta con nombre explícitamente:

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

Cuando el cifrado está deshabilitado o no disponible para una cuenta con nombre, las advertencias de Matrix y los errores de verificación apuntan a la clave de configuración de esa cuenta, por ejemplo `channels.matrix.accounts.assistant.encryption`.

### Qué significa "verificado"

OpenClaw trata este dispositivo de Matrix como verificado solo cuando está verificado por su propia identidad de firma cruzada.
En la práctica, `openclaw matrix verify status --verbose` expone tres señales de confianza:

- `Locally trusted`: este dispositivo es confiable solo para el cliente actual
- `Cross-signing verified`: el SDK informa que el dispositivo está verificado mediante firma cruzada
- `Signed by owner`: el dispositivo está firmado por su propia clave de autofirma

`Verified by owner` se convierte en `yes` solo cuando existe la verificación de firma cruzada o la firma del propietario.
La confianza local por sí sola no es suficiente para que OpenClaw trate el dispositivo como completamente verificado.

### Qué hace el arranque

`openclaw matrix verify bootstrap` es el comando de reparación y configuración para cuentas de Matrix cifradas.
Realiza todo lo siguiente en orden:

- inicializa el almacenamiento de secretos, reutilizando una clave de recuperación existente cuando es posible
- inicializa la firma cruzada y carga las claves públicas de firma cruzada faltantes
- intenta marcar y firmar cruzmente el dispositivo actual
- crea una nueva copia de seguridad de claves de sala en el servidor si aún no existe una

Si el servidor principal requiere autenticación interactiva para cargar las claves de firma cruzada, OpenClaw intenta la carga sin autenticación primero, luego con `m.login.dummy`, y luego con `m.login.password` cuando `channels.matrix.password` está configurado.

Use `--force-reset-cross-signing` solo cuando intencionalmente desee descartar la identidad de firma cruzada actual y crear una nueva.

Si intencionalmente desea descartar la copia de seguridad de claves de sala actual y comenzar una nueva línea base de copia de seguridad para mensajes futuros, use `openclaw matrix verify backup reset --yes`.
Haga esto solo cuando acepte que el historial cifrado antiguo irrecuperable permanecerá no disponible.

### Nueva línea base de copia de seguridad

Si desea mantener el funcionamiento de los mensajes cifrados futuros y acepta perder el historial antiguo irrecuperable, ejecute estos comandos en orden:

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

Agregue `--account <id>` a cada comando cuando desee apuntar explícitamente a una cuenta de Matrix con nombre.

### Comportamiento de inicio

Cuando `encryption: true`, Matrix establece por defecto `startupVerification` en `"if-unverified"`.
Al iniciar, si este dispositivo sigue sin verificar, Matrix solicitará la autoverificación en otro cliente de Matrix,
saltará las solicitudes duplicadas mientras ya haya una pendiente y aplicará un enfriamiento local antes de reintentar después de los reinicios.
Por defecto, los intentos fallidos de solicitud se reintentan antes que la creación exitosa de solicitudes.
Establezca `startupVerification: "off"` para desactivar las solicitudes automáticas al inicio, o ajuste `startupVerificationCooldownHours`
si desea una ventana de reintento más corta o más larga.

El inicio también realiza automáticamente un pase de arranque criptográfico conservador.
Ese pase intenta reutilizar primero el almacenamiento de secretos actual y la identidad de firma cruzada, y evita restablecer la firma cruzada a menos que ejecute un flujo de reparación de arranque explícito.

Si el inicio encuentra un estado de arranque dañado y `channels.matrix.password` está configurado, OpenClaw puede intentar una ruta de reparación más estricta.
Si el dispositivo actual ya está firmado por el propietario, OpenClaw preserva esa identidad en lugar de restablecerla automáticamente.

Actualización desde el complemento público de Matrix anterior:

- OpenClaw reutiliza automáticamente la misma cuenta de Matrix, token de acceso e identidad de dispositivo cuando es posible.
- Antes de que se ejecuten cualquier cambio de migración de Matrix procesable, OpenClaw crea o reutiliza una instantánea de recuperación bajo `~/Backups/openclaw-migrations/`.
- Si utiliza varias cuentas de Matrix, establezca `channels.matrix.defaultAccount` antes de actualizar desde el diseño de almacenamiento plano antiguo para que OpenClaw sepa qué cuenta debe recibir ese estado heredado compartido.
- Si el complemento anterior almacenó una clave de descifrado de copia de seguridad de claves de sala de Matrix localmente, el inicio o `openclaw doctor --fix` la importará automáticamente al nuevo flujo de clave de recuperación.
- Si el token de acceso de Matrix cambió después de que se preparó la migración, el inicio ahora escanea las raíces de almacenamiento de hash de token hermanas para buscar un estado de restauración heredado pendiente antes de renunciar a la restauración automática de la copia de seguridad.
- Si el token de acceso de Matrix cambia más tarde para la misma cuenta, servidor doméstico y usuario, OpenClaw ahora prefiere reutilizar la raíz de almacenamiento de hash de token existente más completa en lugar de comenzar desde un directorio de estado de Matrix vacío.
- En el próximo inicio de la puerta de enlace, las claves de sala respaldadas se restauran automáticamente en el nuevo almacén criptográfico.
- Si el plugin anterior tenía claves de sala solo locales que nunca se respaldaron, OpenClaw lo advertirá claramente. Esas claves no se pueden exportar automáticamente desde el almacenamiento de cifrado rust anterior, por lo que es posible que parte del historial cifrado antiguo no esté disponible hasta que se recupere manualmente.
- Consulte [Migración de Matrix](/en/install/migrating-matrix) para conocer el flujo completo de actualización, los límites, los comandos de recuperación y los mensajes comunes de migración.

El estado de tiempo de ejecución cifrado se organiza bajo raíces por cuenta y por hash de token de usuario en
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/`.
Ese directorio contiene el almacén de sincronización (`bot-storage.json`), el almacén de cifrado (`crypto/`),
el archivo de clave de recuperación (`recovery-key.json`), la instantánea de IndexedDB (`crypto-idb-snapshot.json`),
los enlaces de hilos (`thread-bindings.json`) y el estado de verificación de inicio (`startup-verification.json`)
cuando esas funciones están en uso.
Cuando el token cambia pero la identidad de la cuenta permanece igual, OpenClaw reutiliza la mejor raíz
existente para esa tupla de cuenta/servidor de inicio/usuario, por lo que el estado de sincronización previo, el estado de cifrado, los enlaces de hilos
y el estado de verificación de inicio permanecen visibles.

### Modelo de almacén de cifrado Node

El cifrado E2EE de Matrix en este plugin utiliza la ruta oficial de cifrado Rust `matrix-js-sdk` en Node.
Esa ruta espera una persistencia respaldada por IndexedDB cuando desea que el estado de cifrado sobreviva a los reinicios.

Actualmente, OpenClaw proporciona esto en Node mediante:

- usar `fake-indexeddb` como la simulación de la API de IndexedDB que espera el SDK
- restaurar el contenido de IndexedDB del cifrado Rust desde `crypto-idb-snapshot.json` antes de `initRustCrypto`
- persistir el contenido actualizado de IndexedDB de nuevo en `crypto-idb-snapshot.json` después de la inicialización y durante el tiempo de ejecución

Esto es una conexión de compatibilidad/almacenamiento, no una implementación de cifrado personalizada.
El archivo de instantánea es un estado de tiempo de ejecución sensible y se almacena con permisos de archivo restrictivos.
Bajo el modelo de seguridad de OpenClaw, el host de la puerta de enlace y el directorio de estado local de OpenClaw ya están dentro del límite del operador de confianza, por lo que esto es principalmente una preocupación de durabilidad operativa en lugar de un límite de confianza remoto separado.

Mejora planificada:

- añadir soporte SecretRef para el material de claves persistente de Matrix para que las claves de recuperación y los secretos de cifrado relacionados se puedan obtener de los proveedores de secretos de OpenClaw en lugar de solo de archivos locales

## Notificaciones de verificación automática

Matrix ahora publica notificaciones del ciclo de vida de la verificación directamente en la sala estricta de verificación por MD como mensajes `m.notice`.
Esto incluye:

- notificaciones de solicitud de verificación
- notificaciones de verificación lista (con la guía explícita "Verificar por emoji")
- notificaciones de inicio y finalización de la verificación
- Detalles del SAS (emoji y decimal) cuando estén disponibles

Las solicitudes de verificación entrantes de otro cliente de Matrix son rastreadas y aceptadas automáticamente por OpenClaw.
Para los flujos de autoverificación, OpenClaw también inicia el flujo SAS automáticamente cuando la verificación por emoji está disponible y confirma su propio lado.
Para las solicitudes de verificación de otro usuario/dispositivo de Matrix, OpenClaw acepta automáticamente la solicitud y luego espera a que el flujo SAS continúe normalmente.
Aún necesitas comparar el emoji o el decimal SAS en tu cliente de Matrix y confirmar "Coinciden" allí para completar la verificación.

OpenClaw no acepta automáticamente flujos duplicados autoiniciados a ciegas. El inicio omite crear una nueva solicitud cuando una solicitud de autoverificación ya está pendiente.

Las notificaciones del protocolo/sistema de verificación no se reenvían a la canalización de chat del agente, por lo que no producen `NO_REPLY`.

### Higiene de dispositivos

Los antiguos dispositivos de Matrix gestionados por OpenClaw pueden acumularse en la cuenta y dificultar el razonamiento sobre la confianza en las salas cifradas.
Listalos con:

```bash
openclaw matrix devices list
```

Elimina los dispositivos obsoletos gestionados por OpenClaw con:

```bash
openclaw matrix devices prune-stale
```

### Reparación de salas directas

Si el estado del mensaje directo pierde la sincronización, OpenClaw puede terminar con asignaciones `m.direct` obsoletas que apuntan a salas solitarias antiguas en lugar de al MD en vivo. Inspecciona la asignación actual para un par con:

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

Repáralo con:

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

La reparación mantiene la lógica específica de Matrix dentro del complemento:

- prefiere un MD estricto 1:1 que ya esté asignado en `m.direct`
- de lo contrario, recurre a cualquier MD estricto 1:1 actualmente unido con ese usuario
- si no existe un MD saludable, crea una sala directa nueva y reescribe `m.direct` para que apunte a ella

El flujo de reparación no elimina las salas antiguas automáticamente. Solo selecciona el MD saludable y actualiza la asignación para que los nuevos envíos de Matrix, los avisos de verificación y otros flujos de mensajes directos apunten a la sala correcta nuevamente.

## Hilos

Matrix admite hilos nativos de Matrix tanto para respuestas automáticas como para envíos a través de herramientas de mensajes.

- `threadReplies: "off"` mantiene las respuestas en el nivel superior.
- `threadReplies: "inbound"` responde dentro de un hilo solo cuando el mensaje entrante ya estaba en ese hilo.
- `threadReplies: "always"` mantiene las respuestas de la sala en un hilo basado en el mensaje desencadenante.
- Los mensajes entrantes en hilos incluyen el mensaje raíz del hilo como contexto adicional del agente.
- Los envíos de herramientas de mensaje ahora heredan automáticamente el hilo actual de Matrix cuando el objetivo es la misma sala o el mismo objetivo de usuario de MD, a menos que se proporcione un `threadId` explícito.
- Los enlaces de hilos en tiempo de ejecución son compatibles con Matrix. `/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age` y `/acp spawn` vinculados a hilos ahora funcionan en salas y MD de Matrix.
- Un `/focus` de sala/MD de Matrix de nivel superior crea un nuevo hilo de Matrix y lo vincula a la sesión de destino cuando `threadBindings.spawnSubagentSessions=true`.
- Ejecutar `/focus` o `/acp spawn --thread here` dentro de un hilo de Matrix existente vincula ese hilo actual en su lugar.

### Configuración de enlace de hilos

Matrix hereda los valores globales predeterminados de `session.threadBindings` y también admite anulaciones por canal:

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Las marcas de generación vinculadas a hilos de Matrix son opcionales:

- Establezca `threadBindings.spawnSubagentSessions: true` para permitir que el `/focus` de nivel superior cree y vincule nuevos hilos de Matrix.
- Establezca `threadBindings.spawnAcpSessions: true` para permitir que `/acp spawn --thread auto|here` vincule sesiones de ACP a hilos de Matrix.

## Reacciones

Matrix admite acciones de reacción salientes, notificaciones de reacción entrantes y reacciones de confirmación entrantes.

- Las herramientas de reacción de salida están controladas por `channels["matrix"].actions.reactions`.
- `react` añade una reacción a un evento de Matrix específico.
- `reactions` enumera el resumen de reacciones actual para un evento de Matrix específico.
- `emoji=""` elimina las propias reacciones de la cuenta del bot en ese evento.
- `remove: true` elimina solo la reacción de emoji especificada de la cuenta del bot.

Las reacciones de reconocimiento (ack) usan el orden de resolución estándar de OpenClaw:

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- emoji de respaldo de identidad del agente

El alcance de la reacción de reconocimiento se resuelve en este orden:

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

El modo de notificación de reacción se resuelve en este orden:

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- predeterminado: `own`

Comportamiento actual:

- `reactionNotifications: "own"` reenvía eventos `m.reaction` añadidos cuando tienen como objetivo mensajes de Matrix creados por el bot.
- `reactionNotifications: "off"` desactiva los eventos del sistema de reacciones.
- Las eliminaciones de reacciones aún no se sintetizan en eventos del sistema porque Matrix las presenta como redacciones, no como eliminaciones independientes de `m.reaction`.

## Ejemplo de política de MD y sala

```json5
{
  channels: {
    matrix: {
      dm: {
        policy: "allowlist",
        allowFrom: ["@admin:example.org"],
      },
      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
      groups: {
        "!roomid:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

Consulte [Grupos](/en/channels/groups) para conocer el comportamiento de filtrado de menciones y listas de permitidos.

Ejemplo de emparejamiento para MD de Matrix:

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

Si un usuario de Matrix no aprobado sigue enviándole mensajes antes de la aprobación, OpenClaw reutiliza el mismo código de emparejamiento pendiente y puede enviar una respuesta de recordatorio nuevamente después de un breve enfriamiento en lugar de generar un nuevo código.

Consulte [Emparejamiento](/en/channels/pairing) para ver el flujo de emparejamiento de MD compartido y el diseño de almacenamiento.

## Ejemplo multicuenta

```json5
{
  channels: {
    matrix: {
      enabled: true,
      defaultAccount: "assistant",
      dm: { policy: "pairing" },
      accounts: {
        assistant: {
          homeserver: "https://matrix.example.org",
          accessToken: "syt_assistant_xxx",
          encryption: true,
        },
        alerts: {
          homeserver: "https://matrix.example.org",
          accessToken: "syt_alerts_xxx",
          dm: {
            policy: "allowlist",
            allowFrom: ["@ops:example.org"],
          },
        },
      },
    },
  },
}
```

Los valores de `channels.matrix` de nivel superior actúan como valores predeterminados para las cuentas con nombre a menos que una cuenta los anule.
Establezca `defaultAccount` cuando desee que OpenClaw prefiera una cuenta de Matrix con nombre para el enrutamiento implícito, sondeo y operaciones de CLI.
Si configura varias cuentas con nombre, establezca `defaultAccount` o pase `--account <id>` para los comandos de CLI que dependen de la selección implícita de cuenta.
Pase `--account <id>` a `openclaw matrix verify ...` y `openclaw matrix devices ...` cuando desee anular esa selección implícita para un comando.

## Servidores domésticos privados/LAN

De forma predeterminada, OpenClaw bloquea los servidores domésticos de Matrix privados/internos para la protección SSRF a menos que usted
opte explícitamente por participar por cuenta.

Si su servidor doméstico se ejecuta en localhost, una IP de LAN/Tailscale o un nombre de host interno, habilite
`allowPrivateNetwork` para esa cuenta de Matrix:

```json5
{
  channels: {
    matrix: {
      homeserver: "http://matrix-synapse:8008",
      allowPrivateNetwork: true,
      accessToken: "syt_internal_xxx",
    },
  },
}
```

Ejemplo de configuración de CLI:

```bash
openclaw matrix account add \
  --account ops \
  --homeserver http://matrix-synapse:8008 \
  --allow-private-network \
  --access-token syt_ops_xxx
```

Esta participación solo permite objetivos privados/internos de confianza. Los servidores domésticos públicos en texto claro, como
`http://matrix.example.org:8008`, siguen bloqueados. Preferiblemente use `https://` siempre que sea posible.

## Resolución de objetivos

Matrix acepta estas formas de objetivo en cualquier lugar donde OpenClaw le pida una sala o un objetivo de usuario:

- Usuarios: `@user:server`, `user:@user:server` o `matrix:user:@user:server`
- Salas: `!room:server`, `room:!room:server` o `matrix:room:!room:server`
- Alias: `#alias:server`, `channel:#alias:server` o `matrix:channel:#alias:server`

La búsqueda en el directorio en vivo usa la cuenta de Matrix conectada:

- Las búsquedas de usuario consultan el directorio de usuarios de Matrix en ese servidor doméstico.
- Las búsquedas de sala aceptan IDs de sala y alias explícitos directamente, luego recurren a buscar nombres de salas unidas para esa cuenta.
- La búsqueda de nombres de salas unidas es de mejor esfuerzo. Si un nombre de sala no se puede resolver a un ID o alias, es ignorado por la resolución de la lista de permitidos en tiempo de ejecución.

## Referencia de configuración

- `enabled`: habilitar o deshabilitar el canal.
- `name`: etiqueta opcional para la cuenta.
- `defaultAccount`: ID de cuenta preferida cuando se configuran múltiples cuentas de Matrix.
- `homeserver`: URL del servidor de inicio, por ejemplo `https://matrix.example.org`.
- `allowPrivateNetwork`: permite que esta cuenta de Matrix se conecte a servidores de inicio privados/internos. Habilítelo cuando el servidor de inicio se resuelva a `localhost`, una IP de LAN/Tailscale, o un host interno como `matrix-synapse`.
- `userId`: ID de usuario de Matrix completo, por ejemplo `@bot:example.org`.
- `accessToken`: token de acceso para la autenticación basada en token. Se admiten valores de texto plano y valores SecretRef para `channels.matrix.accessToken` y `channels.matrix.accounts.<id>.accessToken` a través de proveedores env/file/exec. Consulte [Gestión de secretos](/en/gateway/secrets).
- `password`: contraseña para el inicio de sesión basado en contraseña. Se admiten valores de texto plano y valores SecretRef.
- `deviceId`: ID de dispositivo de Matrix explícito.
- `deviceName`: nombre para mostrar del dispositivo para el inicio de sesión con contraseña.
- `avatarUrl`: URL de avatar propio almacenado para la sincronización del perfil y las actualizaciones de `set-profile`.
- `initialSyncLimit`: límite de eventos de sincronización al inicio.
- `encryption`: habilitar E2EE.
- `allowlistOnly`: forzar el comportamiento de solo lista de permitidos para MD y habitaciones.
- `groupPolicy`: `open`, `allowlist` o `disabled`.
- `groupAllowFrom`: lista de permitidos de IDs de usuario para el tráfico de la sala.
- Las entradas de `groupAllowFrom` deben ser IDs de usuario completos de Matrix. Los nombres sin resolver se ignoran en tiempo de ejecución.
- `replyToMode`: `off`, `first` o `all`.
- `threadReplies`: `off`, `inbound` o `always`.
- `threadBindings`: anulaciones por canal para el enrutamiento y el ciclo de vida de la sesión vinculada al hilo.
- `startupVerification`: modo de solicitud de autoverificación automática al inicio (`if-unverified`, `off`).
- `startupVerificationCooldownHours`: tiempo de espera antes de reintentar las solicitudes de verificación automática al inicio.
- `textChunkLimit`: tamaño del fragmento del mensaje saliente.
- `chunkMode`: `length` o `newline`.
- `responsePrefix`: prefijo opcional de mensaje para respuestas salientes.
- `ackReaction`: anulación opcional de la reacción de confirmación para este canal/cuenta.
- `ackReactionScope`: anulación opcional del alcance de la reacción de confirmación (`group-mentions`, `group-all`, `direct`, `all`, `none`, `off`).
- `reactionNotifications`: modo de notificación de reacción entrante (`own`, `off`).
- `mediaMaxMb`: límite de tamaño de medio saliente en MB.
- `autoJoin`: política de unión automática a invitaciones (`always`, `allowlist`, `off`). Predeterminado: `off`.
- `autoJoinAllowlist`: salas/alias permitidos cuando `autoJoin` es `allowlist`. Las entradas de alias se resuelven en IDs de sala durante el manejo de invitaciones; OpenClaw no confía en el estado de alias reclamado por la sala invitada.
- `dm`: bloque de política de MD (`enabled`, `policy`, `allowFrom`).
- Las entradas `dm.allowFrom` deben ser IDs de usuario de Matrix completos a menos que ya las haya resuelto mediante una búsqueda en el directorio en vivo.
- `accounts`: anulaciones con nombre por cuenta. Los valores `channels.matrix` de nivel superior actúan como valores predeterminados para estas entradas.
- `groups`: mapa de política por sala. Se prefieren los IDs o alias de sala; los nombres de sala no resueltos se ignoran en tiempo de ejecución. La identidad de sesión/grupo utiliza el ID de sala estable después de la resolución, mientras que las etiquetas legibles por humanos aún provienen de los nombres de sala.
- `rooms`: alias heredado para `groups`.
- `actions`: filtrado de herramientas por acción (`messages`, `reactions`, `pins`, `profile`, `memberInfo`, `channelInfo`, `verification`).
