---
summary: "Estado de soporte de Matrix, configuración y ejemplos de configuración"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix (complemento)

Matrix es el complemento del canal Matrix para OpenClaw.
Utiliza el `matrix-js-sdk` oficial y admite MD, salas, hilos, medios, reacciones, encuestas, ubicación y E2EE.

## Complemento requerido

Matrix es un complemento y no se incluye con el núcleo de OpenClaw.

Instalar desde npm:

```bash
openclaw plugins install @openclaw/matrix
```

Instalar desde una copia local:

```bash
openclaw plugins install ./path/to/local/matrix-plugin
```

Consulte [Plugins](/en/tools/plugin) para conocer el comportamiento y las reglas de instalación de los complementos.

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

- Si ya existen variables de entorno de autenticación de Matrix para la cuenta seleccionada y esa cuenta aún no tiene autenticación guardada en la configuración, el asistente ofrece un acceso directo de env y solo escribe `enabled: true` para esa cuenta.
- Cuando agrega otra cuenta de Matrix de forma interactiva, el nombre de cuenta ingresado se normaliza en el ID de cuenta utilizado en la configuración y las variables de entorno. Por ejemplo, `Ops Bot` se convierte en `ops-bot`.
- Las indicaciones de la lista de permitidos de DM aceptan valores completos de `@user:server` de inmediato. Los nombres para mostrar solo funcionan cuando la búsqueda en el directorio en vivo encuentra una coincidencia exacta; de lo contrario, el asistente le pide que vuelva a intentar con un ID de Matrix completo.
- Las indicaciones de la lista de permitidos de salas aceptan ID de salas y alias directamente. También pueden resolver nombres de salas unidas en vivo, pero los nombres no resueltos solo se mantienen tal como se escribieron durante la configuración y el tiempo de ejecución los ignora más tarde en la resolución de la lista de permitidos. Prefiera `!room:server` o `#alias:server`.
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
La cuenta predeterminada usa `credentials.json`; las cuentas nombradas usan `credentials-<account>.json`.

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

Para el ID de cuenta normalizada `ops-bot`, use:

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
        threadReplies: "off",
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
      streaming: "partial",
    },
  },
}
```

## Vistas previas de transmisión

La transmisión de respuestas de Matrix es opcional.

Establezca `channels.matrix.streaming` en `"partial"` cuando desee que OpenClaw envíe una única respuesta de borrador,
edite ese borrador en su lugar mientras el modelo genera texto y luego lo finalice cuando la respuesta esté
lista:

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

- `streaming: "off"` es el valor predeterminado. OpenClaw espera la respuesta final y la envía una vez.
- `streaming: "partial"` crea un mensaje de vista previa editable en lugar de enviar múltiples mensajes parciales.
- Si la vista previa ya no cabe en un solo evento de Matrix, OpenClaw detiene la transmisión de la vista previa y vuelve a la entrega final normal.
- Las respuestas de medios aún envían archivos adjuntos normalmente. Si una vista previa obsoleta ya no se puede reutilizar de manera segura, OpenClaw la redacta antes de enviar la respuesta de medio final.
- Las ediciones de vista previa consumen llamadas adicionales a la API de Matrix. Deje la transmisión desactivada si desea el comportamiento de límite de tasa más conservador.

## Cifrado y verificación

En salas cifradas (E2EE), los eventos de imagen salientes usan `thumbnail_file` para que las vistas previas de las imágenes se cifren junto con el archivo adjunto completo. Las salas sin cifrar aún usan `thumbnail_url` plano. No se necesita configuración — el complemento detecta el estado E2EE automáticamente.

### Salas de bot a bot

De forma predeterminada, los mensajes de Matrix de otras cuentas de Matrix de OpenClaw configuradas se ignoran.

Use `allowBots` cuando intencionalmente desee el tráfico de Matrix entre agentes:

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

- `allowBots: true` acepta mensajes de otras cuentas de bots de Matrix configuradas en salas y MD permitidos.
- `allowBots: "mentions"` acepta esos mensajes solo cuando mencionan visiblemente a este bot en las salas. Los MD aún están permitidos.
- `groups.<room>.allowBots` anula la configuración a nivel de cuenta para una sola sala.
- OpenClaw aún ignora los mensajes del mismo ID de usuario de Matrix para evitar bucles de autorepuesta.
- Matrix no expone una bandera de bot nativa aquí; OpenClaw trata "creado por bot" como "enviado por otra cuenta de Matrix configurada en esta puerta de enlace de OpenClaw".

Use listas blancas de salas estrictas y requisitos de mención al habilitar el tráfico de bot a bot en salas compartidas.

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

Verificar el estado de verificación:

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

Soporte multicuenta: use `channels.matrix.accounts` con credenciales por cuenta y `name` opcional. Consulte [Referencia de configuración](/en/gateway/configuration-reference#multi-account-all-channels) para el patrón compartido.

Diagnósticos de inicialización detallados:

```bash
openclaw matrix verify bootstrap --verbose
```

Forzar un restablecimiento fresco de la identidad de firma cruzada antes de la inicialización:

```bash
openclaw matrix verify bootstrap --force-reset-cross-signing
```

Verificar este dispositivo con una clave de recuperación:

```bash
openclaw matrix verify device "<your-recovery-key>"
```

Detalles detallados de verificación del dispositivo:

```bash
openclaw matrix verify device "<your-recovery-key>" --verbose
```

Verificar el estado de salud de la copia de seguridad de las claves de sala:

```bash
openclaw matrix verify backup status
```

Diagnósticos detallados del estado de salud de la copia de seguridad:

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

Todos los comandos `verify` son concisos de forma predeterminada (incluyendo registro interno silencioso del SDK) y muestran diagnósticos detallados solo con `--verbose`.
Use `--json` para una salida legible por máquina completa al crear scripts.

En configuraciones multicuenta, los comandos de la CLI de Matrix usan la cuenta predeterminada implícita de Matrix a menos que pase `--account <id>`.
Si configura varias cuentas con nombre, establezca `channels.matrix.defaultAccount` primero o esas operaciones implícitas de la CLI se detendrán y le pedirán que elija una cuenta explícitamente.
Use `--account` siempre que quiera que las operaciones de verificación o de dispositivo apunten explícitamente a una cuenta con nombre:

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

`Verified by owner` se convierte en `yes` solo cuando está presente la verificación de firma cruzada o la firma del propietario.
La confianza local por sí sola no es suficiente para que OpenClaw trate el dispositivo como totalmente verificado.

### Qué hace el arranque

`openclaw matrix verify bootstrap` es el comando de reparación y configuración para cuentas cifradas de Matrix.
Realiza todo lo siguiente en orden:

- inicializa el almacenamiento de secretos, reutilizando una clave de recuperación existente cuando sea posible
- inicializa la firma cruzada y carga las claves públicas de firma cruzada faltantes
- intenta marcar y firmar cruzadamente el dispositivo actual
- crea una nueva copia de seguridad de claves de sala en el servidor si aún no existe una

Si el servidor requiere autenticación interactiva para cargar las claves de firma cruzada, OpenClaw intenta la carga sin autenticación primero, luego con `m.login.dummy`, y luego con `m.login.password` cuando `channels.matrix.password` está configurado.

Use `--force-reset-cross-signing` solo cuando intencionalmente desee descartar la identidad de firma cruzada actual y crear una nueva.

Si intencionalmente desea descartar la copia de seguridad de claves de sala actual y comenzar una nueva línea de base de copia de seguridad para mensajes futuros, use `openclaw matrix verify backup reset --yes`.
Haga esto solo cuando acepte que el historial cifrado antiguo irrecuperable permanecerá no disponible.

### Línea de base de copia de seguridad nueva

Si desea mantener funcionando los mensajes cifrados futuros y acepta perder el historial antiguo irrecuperable, ejecute estos comandos en orden:

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

Agregue `--account <id>` a cada comando cuando desee apuntar explícitamente a una cuenta de Matrix con nombre.

### Comportamiento de inicio

Cuando `encryption: true`, Matrix establece `startupVerification` por defecto en `"if-unverified"`.
Al iniciar, si este dispositivo todavía no está verificado, Matrix solicitará la autoverificación en otro cliente de Matrix,
omitirá las solicitudes duplicadas mientras ya haya una pendiente y aplicará un enfriamiento local antes de reintentar después de los reinicios.
Los intentos de solicitud fallidos se reintentan antes que la creación exitosa de solicitudes de forma predeterminada.
Configure `startupVerification: "off"` para desactivar las solicitudes automáticas al inicio, o ajuste `startupVerificationCooldownHours`
si desea una ventana de reintento más corta o más larga.

El inicio también realiza automáticamente un paso de arranque criptográfico conservador.
Ese paso intenta reutilizar primero el almacenamiento secreto actual y la identidad de firma cruzada, y evita restablecer la firma cruzada a menos que ejecute un flujo de reparación de arranque explícito.

Si el inicio encuentra un estado de arranque roto y `channels.matrix.password` está configurado, OpenClaw puede intentar una ruta de reparación más estricta.
Si el dispositivo actual ya está firmado por el propietario, OpenClaw preserva esa identidad en lugar de restablecerla automáticamente.

Actualización desde el complemento de Matrix público anterior:

- OpenClaw reutiliza automáticamente la misma cuenta de Matrix, token de acceso e identidad de dispositivo cuando es posible.
- Antes de que se ejecuten cualquier cambio de migración de Matrix procesable, OpenClaw crea o reutiliza una instantánea de recuperación en `~/Backups/openclaw-migrations/`.
- Si utiliza varias cuentas de Matrix, configure `channels.matrix.defaultAccount` antes de actualizar desde el diseño de almacenamiento plano antiguo para que OpenClaw sepa qué cuenta debe recibir ese estado heredado compartido.
- Si el complemento anterior almacenó una clave de descifrado de copia de seguridad de clave de sala de Matrix localmente, el inicio o `openclaw doctor --fix` la importará automáticamente al nuevo flujo de clave de recuperación.
- Si el token de acceso de Matrix cambió después de que se preparó la migración, el inicio ahora escanea las raíces de almacenamiento de hash de token hermanas para el estado de restauración heredado pendiente antes de renunciar a la restauración automática de la copia de seguridad.
- Si el token de acceso de Matrix cambia más tarde para la misma cuenta, servidor doméstico y usuario, OpenClaw ahora prefiere reutilizar la raíz de almacenamiento de hash de token existente más completa en lugar de comenzar desde un directorio de estado de Matrix vacío.
- En el próximo inicio de la puerta de enlace, las claves de sala respaldadas se restauran automáticamente en el nuevo almacén criptográfico.
- Si el complemento antiguo tenía claves de sala solo locales que nunca se respaldaron, OpenClaw lo advertirá claramente. Esas claves no se pueden exportar automáticamente desde el almacenamiento de cifrado rust anterior, por lo que es posible que parte del historial cifrado antiguo no esté disponible hasta que se recupere manualmente.
- Consulte [Migración de Matrix](/en/install/migrating-matrix) para conocer el flujo completo de actualización, los límites, los comandos de recuperación y los mensajes de migración comunes.

El estado de tiempo de ejecución cifrado se organiza bajo raíces de hash de token por cuenta y por usuario en
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/`.
Ese directorio contiene el almacén de sincronización (`bot-storage.json`), el almacén de cifrado (`crypto/`),
el archivo de clave de recuperación (`recovery-key.json`), la instantánea de IndexedDB (`crypto-idb-snapshot.json`),
los enlaces de hilos (`thread-bindings.json`) y el estado de verificación de inicio (`startup-verification.json`)
cuando esas características están en uso.
Cuando el token cambia pero la identidad de la cuenta permanece igual, OpenClaw reutiliza la mejor raíz
existente para esa tupla de cuenta/servidor de inicio/usuario para que el estado de sincronización previo, el estado de cifrado, los enlaces de hilos,
y el estado de verificación de inicio sigan siendo visibles.

### Modelo de almacén de cifrado de Node

El E2EE de Matrix en este complemento utiliza la ruta oficial de cifrado de Rust `matrix-js-sdk` en Node.
Esa ruta espera una persistencia respaldada por IndexedDB cuando desea que el estado de cifrado sobreviva a los reinicios.

Actualmente, OpenClaw proporciona esto en Node mediante:

- usar `fake-indexeddb` como el simulacro de API de IndexedDB esperado por el SDK
- restaurar el contenido de IndexedDB de cifrado Rust desde `crypto-idb-snapshot.json` antes de `initRustCrypto`
- persistir el contenido actualizado de IndexedDB nuevamente en `crypto-idb-snapshot.json` después de la inicialización y durante el tiempo de ejecución

Esto es una infraestructura de compatibilidad/almacenamiento, no una implementación de cifrado personalizada.
El archivo de instantánea es un estado de tiempo de ejecución confidencial y se almacena con permisos de archivo restrictivos.
Bajo el modelo de seguridad de OpenClaw, el host de la puerta de enlace y el directorio de estado local de OpenClaw ya están dentro del límite del operador de confianza, por lo que esto es principalmente una preocupación de durabilidad operativa en lugar de un límite de confianza remoto separado.

Mejora planeada:

- añadir soporte de SecretRef para el material de claves Matrix persistente, de modo que las claves de recuperación y los secretos de cifrado de almacén relacionados puedan obtenerse de los proveedores de secretos de OpenClaw en lugar de solo archivos locales

## Gestión de perfiles

Actualice el perfil propio de Matrix para la cuenta seleccionada con:

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

Añada `--account <id>` cuando quiera dirigirse explícitamente a una cuenta Matrix con nombre.

Matrix acepta URLs de avatar `mxc://` directamente. Cuando pasa una URL de avatar `http://` o `https://`, OpenClaw primero la sube a Matrix y almacena la URL `mxc://` resuelta en `channels.matrix.avatarUrl` (o en la anulación de la cuenta seleccionada).

## Avisos automáticos de verificación

Matrix ahora publica avisos del ciclo de vida de la verificación directamente en la sala de verificación de MD estricta como mensajes `m.notice`.
Eso incluye:

- avisos de solicitud de verificación
- avisos de verificación lista (con la guía explícita "Verificar mediante emoji")
- avisos de inicio y finalización de la verificación
- detalles de SAS (emoji y decimal) cuando están disponibles

Las solicitudes de verificación entrantes de otro cliente Matrix son rastreadas y aceptadas automáticamente por OpenClaw.
Para los flujos de autoverificación, OpenClaw también inicia el flujo SAS automáticamente cuando la verificación por emoji está disponible y confirma su propio lado.
Para las solicitudes de verificación de otro usuario/dispositivo Matrix, OpenClaw acepta automáticamente la solicitud y luego espera a que el flujo SAS continúe normalmente.
Todavía necesita comparar el emoji o el SAS decimal en su cliente Matrix y confirmar "Coinciden" allí para completar la verificación.

OpenClaw no acepta automáticamente a ciegas los flujos duplicados autoiniciados. El inicio omite la creación de una nueva solicitud cuando una solicitud de autoverificación ya está pendiente.

Los avisos del protocolo/sistema de verificación no se reenvían a la canalización de chat del agente, por lo que no producen `NO_REPLY`.

### Higiene de dispositivos

Los dispositivos Matrix antiguos gestionados por OpenClaw pueden acumularse en la cuenta y dificultar el razonamiento sobre la confianza en las salas cifradas.
Listelos con:

```bash
openclaw matrix devices list
```

Elimine los dispositivos obsoletos gestionados por OpenClaw con:

```bash
openclaw matrix devices prune-stale
```

### Reparación directa de sala

Si el estado de los mensajes directos se desincroniza, OpenClaw puede terminar con asignaciones `m.direct` obsoletas que apuntan a salas antiguas en lugar del mensaje directo (DM) activo. Inspeccione la asignación actual para un par con:

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

Repararlo con:

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

La reparación mantiene la lógica específica de Matrix dentro del complemento:

- prefiere un mensaje directo (DM) estricto 1:1 que ya esté asignado en `m.direct`
- de lo contrario, recurre a cualquier mensaje directo (DM) estricto 1:1 actualmente unido con ese usuario
- si no existe ningún mensaje directo (DM) saludable, crea una nueva sala directa y reescribe `m.direct` para que apunte a ella

El flujo de reparación no elimina las salas antiguas automáticamente. Solo selecciona el mensaje directo (DM) saludable y actualiza la asignación para que los nuevos envíos de Matrix, las notificaciones de verificación y otros flujos de mensajes directos apunten nuevamente a la sala correcta.

## Hilos

Matrix admite hilos nativos de Matrix tanto para respuestas automáticas como para envíos a través de la herramienta de mensajes.

- `threadReplies: "off"` mantiene las respuestas en el nivel superior y mantiene los mensajes entrantes en hilos en la sesión principal.
- `threadReplies: "inbound"` responde dentro de un hilo solo cuando el mensaje entrante ya estaba en ese hilo.
- `threadReplies: "always"` mantiene las respuestas de la sala en un hilo arraigado en el mensaje desencadenante y enruta esa conversación a través de la sesión con ámbito de hilo coincidente del primer mensaje desencadenante.
- `dm.threadReplies` anula la configuración de nivel superior solo para los mensajes directos. Por ejemplo, puede mantener los hilos de la sala aislados mientras mantiene los mensajes directos planos.
- Los mensajes entrantes en hilos incluyen el mensaje raíz del hilo como contexto adicional del agente.
- Los envíos de la herramienta de mensajes ahora heredan automáticamente el hilo actual de Matrix cuando el objetivo es la misma sala o el mismo objetivo de usuario de mensaje directo, a menos que se proporcione un `threadId` explícito.
- Los enlaces de hilos en tiempo de ejecución son compatibles con Matrix. `/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age` y `/acp spawn` vinculados a hilos ahora funcionan en salas y mensajes directos de Matrix.
- El `/focus` de sala/mensaje directo de Matrix de nivel superior crea un nuevo hilo de Matrix y lo vincula a la sesión de destino cuando `threadBindings.spawnSubagentSessions=true`.
- Ejecutar `/focus` o `/acp spawn --thread here` dentro de un hilo de Matrix existente vincula ese hilo actual en su lugar.

## Vínculos de conversación de ACP

Las salas, los MD y los hilos de Matrix existentes se pueden convertir en espacios de trabajo de ACP duraderos sin cambiar la superficie del chat.

Flujo rápido del operador:

- Ejecute `/acp spawn codex --bind here` dentro del MD, la sala o el hilo existente de Matrix que desee seguir utilizando.
- En un MD o sala de Matrix de nivel superior, el MD/sala actual sigue siendo la superficie del chat y los mensajes futuros se enrutan a la sesión de ACP iniciada.
- Dentro de un hilo de Matrix existente, `--bind here` vincula ese hilo actual en su lugar.
- `/new` y `/reset` restablecen la misma sesión de ACP vinculada en su lugar.
- `/acp close` cierra la sesión de ACP y elimina el vínculo.

Notas:

- `--bind here` no crea un hilo secundario de Matrix.
- `threadBindings.spawnAcpSessions` solo se requiere para `/acp spawn --thread auto|here`, donde OpenClaw necesita crear o vincular un hilo secundario de Matrix.

### Configuración de vinculación de hilos

Matrix hereda los valores predeterminados globales de `session.threadBindings` y también admite anulaciones por canal:

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Las marcas de generación vinculadas a hilos de Matrix son opcionales:

- Establezca `threadBindings.spawnSubagentSessions: true` para permitir que el `/focus` de nivel superior cree y vincule nuevos hilos de Matrix.
- Establezca `threadBindings.spawnAcpSessions: true` para permitir que `/acp spawn --thread auto|here` vincule sesiones de ACP a hilos de Matrix.

## Reacciones

Matrix admite acciones de reacción salientes, notificaciones de reacción entrantes y reacciones de reconocimiento entrantes.

- Las herramientas de reacción saliente están controladas por `channels["matrix"].actions.reactions`.
- `react` añade una reacción a un evento específico de Matrix.
- `reactions` enumera el resumen actual de reacciones para un evento específico de Matrix.
- `emoji=""` elimina las propias reacciones de la cuenta del bot en ese evento.
- `remove: true` elimina solo la reacción de emoji especificada de la cuenta del bot.

Las reacciones de reconocimiento utilizan el orden de resolución estándar de OpenClaw:

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- reserva de emoji de identidad del agente

El ámbito de la reacción de reconocimiento se resuelve en este orden:

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

El modo de notificación de reacción se resuelve en este orden:

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- por defecto: `own`

Comportamiento actual:

- `reactionNotifications: "own"` reenvía eventos `m.reaction` añadidos cuando tienen como objetivo mensajes de Matrix creados por el bot.
- `reactionNotifications: "off"` desactiva los eventos del sistema de reacciones.
- Las eliminaciones de reacciones aún no se sintetizan en eventos del sistema porque Matrix los expone como redacciones, no como eliminaciones independientes de `m.reaction`.

## Contexto del historial

- `channels.matrix.historyLimit` controla cuántos mensajes recientes de la sala se incluyen como `InboundHistory` cuando un mensaje de sala de Matrix activa al agente.
- Recurre a `messages.groupChat.historyLimit`. Establezca `0` para desactivar.
- El historial de salas de Matrix es exclusivo de la sala. Los MDs siguen utilizando el historial de sesión normal.
- El historial de salas de Matrix es solo pendiente: OpenClaw almacena en búfer los mensajes de la sala que aún no han activado una respuesta y luego toma una instantánea de esa ventana cuando llega una mención u otro activador.
- El mensaje activador actual no se incluye en `InboundHistory`; permanece en el cuerpo entrante principal para ese turno.
- Los reintentos del mismo evento de Matrix reutilizan la instantánea del historial original en lugar de desplazarse hacia adelante hacia mensajes de sala más nuevos.
- El contexto de sala recuperado (incluidas las búsquedas de contexto de respuesta e hilo) se filtra por listas de permitidos del remitente (`groupAllowFrom`), por lo que los mensajes no permitidos se excluyen del contexto del agente.

## Ejemplo de política de MD y sala

```json5
{
  channels: {
    matrix: {
      dm: {
        policy: "allowlist",
        allowFrom: ["@admin:example.org"],
        threadReplies: "off",
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

Ejemplo de emparejamiento para MDs de Matrix:

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

Si un usuario de Matrix no aprobado sigue enviándole mensajes antes de la aprobación, OpenClaw reutiliza el mismo código de emparejamiento pendiente y puede enviar una respuesta de recordatorio nuevamente después de un breve enfriamiento en lugar de generar un nuevo código.

Consulte [Emparejamiento](/en/channels/pairing) para ver el flujo de emparejamiento de MD compartido y el diseño de almacenamiento.

## Ejemplo de multicuenta

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
            threadReplies: "off",
          },
        },
      },
    },
  },
}
```

Los valores `channels.matrix` de nivel superior actúan como predeterminados para las cuentas con nombre a menos que una cuenta los redefina.
Establezca `defaultAccount` cuando desee que OpenClaw prefiera una cuenta de Matrix con nombre para el enrutamiento implícito, sondeo y operaciones de CLI.
Si configura varias cuentas con nombre, establezca `defaultAccount` o pase `--account <id>` para los comandos de CLI que dependen de la selección implícita de cuenta.
Pase `--account <id>` a `openclaw matrix verify ...` y `openclaw matrix devices ...` cuando desee anular esa selección implícita para un comando.

## Homeservers privados/LAN

De forma predeterminada, OpenClaw bloquea los homeservers de Matrix privados/internos para la protección SSRF a menos que usted
acepte explícitamente por cuenta.

Si su homeserver se ejecuta en localhost, una IP LAN/Tailscale o un nombre de host interno, habilite
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

Esta aceptación solo permite destinos privados/internos de confianza. Los homeservers públicos en texto sin cifrar, como
`http://matrix.example.org:8008`, siguen bloqueados. Prefiera `https://` siempre que sea posible.

## Proxy del tráfico de Matrix

Si su implementación de Matrix necesita un proxy HTTP(S) saliente explícito, establezca `channels.matrix.proxy`:

```json5
{
  channels: {
    matrix: {
      homeserver: "https://matrix.example.org",
      accessToken: "syt_bot_xxx",
      proxy: "http://127.0.0.1:7890",
    },
  },
}
```

Las cuentas con nombre pueden anular el valor predeterminado de nivel superior con `channels.matrix.accounts.<id>.proxy`.
OpenClaw usa la misma configuración de proxy para el tráfico de Matrix en tiempo de ejecución y las sondas de estado de cuenta.

## Resolución de objetivos

Matrix acepta estos formatos de objetivo en cualquier lugar donde OpenClaw le pida un objetivo de sala o usuario:

- Usuarios: `@user:server`, `user:@user:server` o `matrix:user:@user:server`
- Salas: `!room:server`, `room:!room:server` o `matrix:room:!room:server`
- Alias: `#alias:server`, `channel:#alias:server` o `matrix:channel:#alias:server`

La búsqueda en vivo del directorio usa la cuenta de Matrix iniciada sesión:

- Las búsquedas de usuarios consultan el directorio de usuarios de Matrix en ese homeserver.
- Las búsquedas de salas aceptan IDs de sala y alias explícitos directamente, y luego recurren a buscar nombres de salas unidas para esa cuenta.
- La búsqueda por nombre de sala unida es de mejor esfuerzo. Si un nombre de sala no puede resolverse a un ID o alias, es ignorado por la resolución de la lista de permitidos en tiempo de ejecución.

## Referencia de configuración

- `enabled`: habilitar o deshabilitar el canal.
- `name`: etiqueta opcional para la cuenta.
- `defaultAccount`: ID de cuenta preferido cuando se configuran múltiples cuentas de Matrix.
- `homeserver`: URL del servidor doméstico (homeserver), por ejemplo `https://matrix.example.org`.
- `allowPrivateNetwork`: permitir que esta cuenta de Matrix se conecte a servidores domésticos privados/internos. Habilite esto cuando el servidor doméstico resuelva a `localhost`, una IP de LAN/Tailscale, o un host interno como `matrix-synapse`.
- `proxy`: URL de proxy HTTP(S) opcional para el tráfico de Matrix. Las cuentas con nombre pueden anular el predeterminado de nivel superior con su propio `proxy`.
- `userId`: ID de usuario de Matrix completo, por ejemplo `@bot:example.org`.
- `accessToken`: token de acceso para la autenticación basada en token. Se admiten valores de texto plano y valores de SecretRef para `channels.matrix.accessToken` y `channels.matrix.accounts.<id>.accessToken` a través de proveedores env/file/exec. Consulte [Gestión de secretos](/en/gateway/secrets).
- `password`: contraseña para el inicio de sesión basado en contraseña. Se admiten valores de texto plano y valores de SecretRef.
- `deviceId`: ID de dispositivo de Matrix explícito.
- `deviceName`: nombre para mostrar del dispositivo para el inicio de sesión con contraseña.
- `avatarUrl`: URL de avatar propio almacenado para la sincronización de perfil y actualizaciones de `set-profile`.
- `initialSyncLimit`: límite de eventos de sincronización al inicio.
- `encryption`: habilitar E2EE.
- `allowlistOnly`: forzar el comportamiento exclusivo de lista de permitidos para MDs y salas.
- `groupPolicy`: `open`, `allowlist`, o `disabled`.
- `groupAllowFrom`: lista de permitidos de IDs de usuario para el tráfico de la sala.
- Las entradas `groupAllowFrom` deben ser IDs de usuario completos de Matrix. Los nombres no resueltos se ignoran en tiempo de ejecución.
- `historyLimit`: máximo de mensajes de la sala a incluir como contexto de historial grupal. Recurre a `messages.groupChat.historyLimit`. Establezca `0` para desactivar.
- `replyToMode`: `off`, `first`, o `all`.
- `streaming`: `off` (predeterminado) o `partial`. `partial` habilita vistas previas de borrador de mensaje único con actualizaciones de edición en el lugar.
- `threadReplies`: `off`, `inbound`, o `always`.
- `threadBindings`: anulaciones por canal para el enrutamiento y el ciclo de vida de la sesión vinculada al hilo.
- `startupVerification`: modo de solicitud de autocomprobación automática al inicio (`if-unverified`, `off`).
- `startupVerificationCooldownHours`: tiempo de espera antes de reintentar las solicitudes de verificación automática al inicio.
- `textChunkLimit`: tamaño del fragmento del mensaje saliente.
- `chunkMode`: `length` o `newline`.
- `responsePrefix`: prefijo de mensaje opcional para las respuestas salientes.
- `ackReaction`: anulación opcional de la reacción de reconocimiento para este canal/cuenta.
- `ackReactionScope`: anulación opcional del alcance de la reacción de reconocimiento (`group-mentions`, `group-all`, `direct`, `all`, `none`, `off`).
- `reactionNotifications`: modo de notificación de reacción entrante (`own`, `off`).
- `mediaMaxMb`: límite de tamaño de medios en MB para el manejo de medios de Matrix. Se aplica a los envíos salientes y al procesamiento de medios entrantes.
- `autoJoin`: política de unión automática a invitaciones (`always`, `allowlist`, `off`). Predeterminado: `off`.
- `autoJoinAllowlist`: salas/alias permitidos cuando `autoJoin` es `allowlist`. Las entradas de alias se resuelven en ID de sala durante el manejo de invitaciones; OpenClaw no confía en el estado de alias declarado por la sala invitada.
- `dm`: bloqueo de política de MD (`enabled`, `policy`, `allowFrom`, `threadReplies`).
- Las entradas `dm.allowFrom` deben ser ID de usuario completos de Matrix a menos que ya las hayas resuelto mediante una búsqueda en vivo en el directorio.
- `dm.threadReplies`: anulación de política de hilos solo para MD (`off`, `inbound`, `always`). Anula la configuración `threadReplies` de nivel superior tanto para la ubicación de respuestas como para el aislamiento de sesiones en MD.
- `accounts`: anulaciones nombradas por cuenta. Los valores `channels.matrix` de nivel superior actúan como valores predeterminados para estas entradas.
- `groups`: mapa de políticas por sala. Se prefieren los ID o alias de sala; los nombres de sala no resueltos se ignoran en tiempo de ejecución. La identidad de sesión/grupo utiliza el ID de sala estable después de la resolución, mientras que las etiquetas legibles por humanos aún provienen de los nombres de sala.
- `rooms`: alias heredado para `groups`.
- `actions`: filtrado de herramientas por acción (`messages`, `reactions`, `pins`, `profile`, `memberInfo`, `channelInfo`, `verification`).

## Relacionado

- [Resumen de canales](/en/channels) — todos los canales compatibles
- [Emparejamiento](/en/channels/pairing) — autenticación por MD y flujo de emparejamiento
- [Grupos](/en/channels/groups) — comportamiento del chat grupal y filtrado de menciones
- [Enrutamiento de canales](/en/channels/channel-routing) — enrutamiento de sesión para mensajes
- [Seguridad](/en/gateway/security) — modelo de acceso y endurecimiento
