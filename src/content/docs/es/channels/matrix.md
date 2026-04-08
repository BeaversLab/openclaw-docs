---
summary: "Estado de soporte de Matrix, configuración y ejemplos de configuración"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix

Matrix es el complemento de canal incluido para Matrix en OpenClaw.
Utiliza el `matrix-js-sdk` oficial y admite MD, salas, hilos, medios, reacciones, encuestas, ubicación y E2EE.

## Complemento incluido

Matrix se incluye como un complemento en las versiones actuales de OpenClaw, por lo que las construcciones empaquetadas normales no necesitan una instalación separada.

Si está en una versión anterior o en una instalación personalizada que excluye Matrix, instálelo manualmente:

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

1. Asegúrese de que el complemento de Matrix esté disponible.
   - Las versiones empaquetadas actuales de OpenClaw ya lo incluyen.
   - Las instalaciones anteriores/personalizadas pueden agregarlo manualmente con los comandos anteriores.
2. Cree una cuenta de Matrix en su servidor doméstico (homeserver).
3. Configure `channels.matrix` con:
   - `homeserver` + `accessToken`, o
   - `homeserver` + `userId` + `password`.
4. Reinicie la puerta de enlace.
5. Inicie un MD con el bot o invítelo a una sala.

Rutas de configuración interactivas:

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
- Los mensajes de la lista de permitidos de MD aceptan valores completos de `@user:server` inmediatamente. Los nombres para mostrar solo funcionan cuando la búsqueda en el directorio en vivo encuentra una coincidencia exacta; de lo contrario, el asistente le pide que intente nuevamente con un ID de Matrix completo.
- Las indicaciones de la lista blanca de salas aceptan directamente los IDs y alias de las salas. También pueden resolver los nombres de las salas unidas en tiempo real, pero los nombres no resueltos solo se mantienen tal como se escriben durante la configuración y son ignorados posteriormente por la resolución de la lista blanca en tiempo de ejecución. Se prefieren `!room:server` o `#alias:server`.
- La identidad de la sala/sesión en tiempo de ejecución utiliza el ID estable de la sala de Matrix. Los alias declarados por la sala solo se utilizan como entradas de búsqueda, no como clave de sesión a largo plazo o como identidad de grupo estable.
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
Cuando existen credenciales en caché allí, OpenClaw trata a Matrix como configurado para la configuración, el doctor y el descubrimiento del estado del canal, incluso si la autenticación actual no está establecida directamente en la configuración.

Variables de entorno equivalentes (se usan cuando la clave de configuración no está establecida):

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

- `MATRIX_OPS_X2D_BOT_HOMESERVER`
- `MATRIX_OPS_X2D_BOT_ACCESS_TOKEN`

Matrix escapa la puntuación en los IDs de las cuentas para mantener las variables de entorno con ámbito libres de colisiones.
Por ejemplo, `-` se convierte en `_X2D_`, por lo que `ops-prod` se asigna a `MATRIX_OPS_X2D_PROD_*`.

El asistente interactivo solo ofrece el acceso directo de la variable de entorno cuando esas variables de entorno de autenticación ya están presentes y la cuenta seleccionada aún no tiene la autenticación de Matrix guardada en la configuración.

## Ejemplo de configuración

Esta es una configuración base práctica con emparejamiento por MD, lista blanca de salas y E2EE habilitado:

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
        sessionScope: "per-room",
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

## Previsualizaciones en streaming

El streaming de respuestas de Matrix es opcional.

Establezca `channels.matrix.streaming` en `"partial"` cuando desee que OpenClaw envíe una sola respuesta de previsualización en vivo, edite esa previsualización en su lugar mientras el modelo genera texto y luego la finalice cuando la respuesta haya terminado:

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
- `streaming: "partial"` crea un mensaje de previsualización editable para el bloque de asistente actual utilizando mensajes de texto normales de Matrix. Esto preserva el comportamiento de notificación heredado de Matrix de prioridad de previsualización, por lo que los clientes estándar pueden notificar sobre el primer texto de previsualización transmitido en lugar del bloque terminado.
- `streaming: "quiet"` crea un aviso de previsualización silencioso editable para el bloque de asistente actual. Use esto solo cuando también configure reglas de inserción (push rules) del destinatario para ediciones de previsualización finalizadas.
- `blockStreaming: true` habilita mensajes de progreso de Matrix separados. Con el streaming de previsualización habilitado, Matrix mantiene el borrador en vivo para el bloque actual y preserva los bloques completados como mensajes separados.
- Cuando el streaming de previsualización está activado y `blockStreaming` está desactivado, Matrix edita el borrador en vivo en su lugar y finaliza ese mismo evento cuando el bloque o turno termina.
- Si la previsualización ya no cabe en un evento de Matrix, OpenClaw detiene el streaming de previsualización y vuelve a la entrega final normal.
- Las respuestas con medios aún envían archivos adjuntos normalmente. Si una previsualización obsoleta ya no puede reutilizarse de manera segura, OpenClaw la redacta antes de enviar la respuesta final de medios.
- Las ediciones de previsualización consumen llamadas adicionales a la API de Matrix. Deje el streaming desactivado si desea el comportamiento más conservador respecto al límite de tasa.

`blockStreaming` no habilita por sí solo las previsualizaciones de borrador.
Use `streaming: "partial"` o `streaming: "quiet"` para las ediciones de previsualización; luego agregue `blockStreaming: true` solo si también desea que los bloques de asistente completados permanezcan visibles como mensajes de progreso separados.

Si necesita las notificaciones estándar de Matrix sin reglas de inserción personalizadas, use `streaming: "partial"` para el comportamiento de prioridad de previsualización o deje `streaming` desactivado para la entrega solo final. Con `streaming: "off"`:

- `blockStreaming: true` envía cada bloque terminado como un mensaje de notificación normal de Matrix.
- `blockStreaming: false` envía solo la respuesta final completada como un mensaje de notificación normal de Matrix.

### Reglas de push autohospedadas para previsualizaciones finalizadas silenciosas

Si ejecutas tu propia infraestructura de Matrix y deseas que las previsualizaciones silenciosas notifiquen solo cuando un bloque o la respuesta final esté terminado, configura `streaming: "quiet"` y añade una regla de push por usuario para las ediciones de previsualización finalizadas.

Esta es generalmente una configuración del usuario receptor, no un cambio de configuración global del servidor:

Mapa rápido antes de empezar:

- usuario receptor = la persona que debería recibir la notificación
- usuario bot = la cuenta de Matrix de OpenClaw que envía la respuesta
- usa el token de acceso del usuario receptor para las llamadas API a continuación
- coincide `sender` en la regla de push contra el MXID completo del usuario bot

1. Configura OpenClaw para usar previsualizaciones silenciosas:

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

2. Asegúrate de que la cuenta receptora ya recibe notificaciones de push normales de Matrix. Las reglas de previsualización silenciosa solo funcionan si ese usuario ya tiene pushers/dispositivos funcionando.

3. Obtén el token de acceso del usuario receptor.
   - Usa el token del usuario que recibe, no el token del bot.
   - Reutilizar un token de sesión de cliente existente suele ser lo más fácil.
   - Si necesitas generar un token nuevo, puedes iniciar sesión a través de la API estándar de Cliente-Servidor de Matrix:

```bash
curl -sS -X POST \
  "https://matrix.example.org/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "m.login.password",
    "identifier": {
      "type": "m.id.user",
      "user": "@alice:example.org"
    },
    "password": "REDACTED"
  }'
```

4. Verifica que la cuenta receptora ya tiene pushers:

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

Si esto no devuelve pushers/dispositivos activos, corrige primero las notificaciones normales de Matrix antes de añadir la regla de OpenClaw a continuación.

OpenClaw marca las ediciones de previsualización finalizadas de solo texto con:

```json
{
  "com.openclaw.finalized_preview": true
}
```

5. Crea una regla de push de tipo override para cada cuenta receptora que deba recibir estas notificaciones:

```bash
curl -sS -X PUT \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "conditions": [
      { "kind": "event_match", "key": "type", "pattern": "m.room.message" },
      {
        "kind": "event_property_is",
        "key": "content.m\\.relates_to.rel_type",
        "value": "m.replace"
      },
      {
        "kind": "event_property_is",
        "key": "content.com\\.openclaw\\.finalized_preview",
        "value": true
      },
      { "kind": "event_match", "key": "sender", "pattern": "@bot:example.org" }
    ],
    "actions": [
      "notify",
      { "set_tweak": "sound", "value": "default" },
      { "set_tweak": "highlight", "value": false }
    ]
  }'
```

Reemplaza estos valores antes de ejecutar el comando:

- `https://matrix.example.org`: tu URL base del servidor doméstico (homeserver)
- `$USER_ACCESS_TOKEN`: el token de acceso del usuario que recibe
- `openclaw-finalized-preview-botname`: un ID de regla único para este bot para este usuario receptor
- `@bot:example.org`: tu MXID del bot Matrix de OpenClaw, no el MXID del usuario receptor

Importante para configuraciones con varios bots:

- Las reglas de push se indexan por `ruleId`. Volver a ejecutar `PUT` contra el mismo ID de regla actualiza esa regla.
- Si un usuario receptor debe recibir notificaciones de múltiples cuentas de bot de Matrix de OpenClaw, cree una regla por bot con un ID de regla único para cada coincidencia de remitente.
- Un patrón simple es `openclaw-finalized-preview-<botname>`, como `openclaw-finalized-preview-ops` o `openclaw-finalized-preview-support`.

La regla se evalúa contra el remitente del evento:

- autenticarse con el token del usuario receptor
- coincidir `sender` con el MXID del bot de OpenClaw

6. Verificar que la regla existe:

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

7. Probar una respuesta transmitida. En modo silencioso, la sala debería mostrar una vista previa de borrador silenciosa y la edición
   en su lugar final debería notificar una vez que el bloque o turno finalice.

Si necesita eliminar la regla más tarde, elimine ese mismo ID de regla con el token del usuario receptor:

```bash
curl -sS -X DELETE \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

Notas:

- Cree la regla con el token de acceso del usuario receptor, no el del bot.
- Las nuevas reglas `override` definidas por el usuario se insertan antes de las reglas de supresión predeterminadas, por lo que no se necesita ningún parámetro de orden adicional.
- Esto solo afecta las ediciones de vista previa de solo texto que OpenClaw puede finalizar de manera segura en su lugar. Las alternativas de medios y las alternativas de vista previa obsoletas aún utilizan la entrega normal de Matrix.
- Si `GET /_matrix/client/v3/pushers` no muestra emisores, el usuario aún no tiene entrega de push de Matrix funcional para esta cuenta/dispositivo.

#### Synapse

Para Synapse, la configuración anterior suele ser suficiente por sí misma:

- No se requiere ningún cambio especial de `homeserver.yaml` para las notificaciones de vista previa finalizadas de OpenClaw.
- Si su implementación de Synapse ya envía notificaciones de push normales de Matrix, el token de usuario + la llamada `pushrules` anterior es el paso principal de configuración.
- Si ejecuta Synapse detrás de un proxy inverso o trabajadores, asegúrese de que `/_matrix/client/.../pushrules/` llegue a Synapse correctamente.
- Si ejecuta trabajadores de Synapse, asegúrese de que los emisores estén saludables. La entrega de push es manejada por el proceso principal o por los trabajadores de emisor `synapse.app.pusher` / configurados.

#### Tuwunel

Para Tuwunel, use el mismo flujo de configuración y la llamada a la API de reglas de push que se muestra arriba:

- No se requiere ninguna configuración específica de Tuwunel para el marcador de vista previa finalizada en sí.
- Si las notificaciones normales de Matrix ya funcionan para ese usuario, el token de usuario + la llamada `pushrules` anterior es el paso principal de configuración.
- Si las notificaciones parecen desaparecer mientras el usuario está activo en otro dispositivo, verifique si `suppress_push_when_active` está habilitado. Tuwunel añadió esta opción en Tuwunel 1.4.2 el 12 de septiembre de 2025, y puede suprimir intencionalmente los envíos a otros dispositivos mientras un dispositivo está activo.

## Cifrado y verificación

En salas cifradas (E2EE), los eventos de imagen salientes usan `thumbnail_file` para que las vistas previas de las imágenes se cifren junto con el archivo completo. Las salas sin cifrar siguen usando `thumbnail_url` sin formato. No se necesita ninguna configuración: el complemento detecta el estado E2EE automáticamente.

### Salas de bot a bot

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

- `allowBots: true` acepta mensajes de otras cuentas de bot de Matrix configuradas en salas permitidas y MDs.
- `allowBots: "mentions"` acepta esos mensajes solo cuando mencionan visiblemente a este bot en las salas. Los MDs todavía están permitidos.
- `groups.<room>.allowBots` anula la configuración a nivel de cuenta para una sala.
- OpenClaw todavía ignora los mensajes del mismo ID de usuario de Matrix para evitar bucles de autorespuestas.
- Matrix no expone una marca de bot nativa aquí; OpenClaw trata "escrito por bot" como "enviado por otra cuenta de Matrix configurada en esta puerta de enlace de OpenClaw".

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

Inicializar estado de firma cruzada y verificación:

```bash
openclaw matrix verify bootstrap
```

Soporte multicuenta: use `channels.matrix.accounts` con credenciales por cuenta y `name` opcional. Consulte [Referencia de configuración](/en/gateway/configuration-reference#multi-account-all-channels) para el patrón compartido.

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

Detalles detallados de verificación de dispositivo:

```bash
openclaw matrix verify device "<your-recovery-key>" --verbose
```

Verificar el estado de salud de la copia de seguridad de claves de sala:

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

Elimine la copia de seguridad del servidor actual y cree una línea base de copia de seguridad nueva. Si la clave de copia de seguridad almacenada no se puede cargar correctamente, este restablecimiento también puede volver a crear el almacenamiento secreto para que los arranques en frío futuros puedan cargar la nueva clave de copia de seguridad:

```bash
openclaw matrix verify backup reset --yes
```

De forma predeterminada, todos los comandos `verify` son concisos (incluido el registro interno silencioso del SDK) y muestran diagnósticos detallados solo con `--verbose`.
Use `--json` para obtener una salida completa legible por máquina al crear scripts.

En configuraciones de cuentas múltiples, los comandos de la CLI de Matrix usan la cuenta predeterminada implícita de Matrix a menos que pase `--account <id>`.
Si configura varias cuentas con nombre, establezca `channels.matrix.defaultAccount` primero o esas operaciones implícitas de la CLI se detendrán y le pedirán que elija una cuenta explícitamente.
Use `--account` siempre que quiera que las operaciones de verificación o dispositivo apunten explícitamente a una cuenta con nombre:

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

Cuando el cifrado está desactivado o no está disponible para una cuenta con nombre, las advertencias de Matrix y los errores de verificación apuntan a la clave de configuración de esa cuenta, por ejemplo `channels.matrix.accounts.assistant.encryption`.

### Qué significa "verificado"

OpenClaw trata este dispositivo Matrix como verificado solo cuando está verificado por su propia identidad de firma cruzada.
En la práctica, `openclaw matrix verify status --verbose` expone tres señales de confianza:

- `Locally trusted`: este dispositivo es confiable solo para el cliente actual
- `Cross-signing verified`: el SDK informa que el dispositivo está verificado a través de la firma cruzada
- `Signed by owner`: el dispositivo está firmado por su propia clave de autofirma

`Verified by owner` se convierte en `yes` solo cuando está presente la verificación de firma cruzada o la firma del propietario.
La confianza local por sí sola no es suficiente para que OpenClaw trate el dispositivo como completamente verificado.

### Qué hace bootstrap

`openclaw matrix verify bootstrap` es el comando de reparación y configuración para cuentas cifradas de Matrix.
Realiza todo lo siguiente en orden:

- inicializa el almacenamiento secreto, reutilizando una clave de recuperación existente cuando sea posible
- inicializa la firma cruzada y carga las claves públicas de firma cruzada faltantes
- intenta marcar y firmar cruzadamente el dispositivo actual
- crea una nueva copia de seguridad de clave de sala en el servidor si aún no existe una

Si el servidor doméstico requiere autenticación interactiva para cargar las claves de firma cruzada, OpenClaw intenta la carga sin autenticación primero, luego con `m.login.dummy`, y luego con `m.login.password` cuando `channels.matrix.password` está configurado.

Use `--force-reset-cross-signing` solo cuando intencionalmente desee descartar la identidad de firma cruzada actual y crear una nueva.

Si intencionalmente desea descartar la copia de seguridad de las claves de la sala actual y comenzar una nueva
línea base de copia de seguridad para mensajes futuros, use `openclaw matrix verify backup reset --yes`.
Haga esto solo cuando acepte que el historial cifrado antiguo irrecuperable permanecerá
disponible y que OpenClaw puede recrear el almacenamiento de secretos si el secreto de la copia de seguridad
actual no se puede cargar de forma segura.

### Línea base de copia de seguridad nueva

Si desea mantener funcionando los mensajes cifrados futuros y acepta perder el historial antiguo irrecuperable, ejecute estos comandos en orden:

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

Añada `--account <id>` a cada comando cuando desee apuntar explícitamente a una cuenta de Matrix con nombre.

### Comportamiento de inicio

Cuando `encryption: true`, Matrix establece por defecto `startupVerification` en `"if-unverified"`.
Al iniciar, si este dispositivo aún no está verificado, Matrix solicitará la autoverificación en otro cliente de Matrix,
omitirá las solicitudes duplicadas mientras ya haya una pendiente y aplicará un tiempo de espera local antes de reintentar después de los reinicios.
Los intentos fallidos de solicitud se reintentan antes que la creación exitosa de la solicitud por defecto.
Establezca `startupVerification: "off"` para desactivar las solicitudes automáticas al inicio, o ajuste `startupVerificationCooldownHours`
si desea una ventana de reintentos más corta o más larga.

El inicio también realiza automáticamente un paso de arranque criptográfico conservador.
Ese paso intenta reutilizar primero el almacenamiento de secretos actual y la identidad de firma cruzada, y evita restablecer la firma cruzada a menos que ejecute un flujo de reparación de arranque explícito.

Si el inicio encuentra un estado de arranque roto y `channels.matrix.password` está configurado, OpenClaw puede intentar una ruta de reparación más estricta.
Si el dispositivo actual ya está firmado por el propietario, OpenClaw conserva esa identidad en lugar de restablecerla automáticamente.

Actualización desde el complemento público de Matrix anterior:

- OpenClaw reutiliza automáticamente la misma cuenta de Matrix, token de acceso e identidad de dispositivo cuando es posible.
- Antes de que se ejecuten cambios de migración de Matrix, OpenClaw crea o reutiliza una instantánea de recuperación bajo `~/Backups/openclaw-migrations/`.
- Si usas varias cuentas de Matrix, establece `channels.matrix.defaultAccount` antes de actualizar desde el diseño de almacenamiento plano antiguo para que OpenClaw sepa qué cuenta debe recibir ese estado heredado compartido.
- Si el complemento anterior almacenaba una clave de descifrado de copia de seguridad de claves de sala de Matrix localmente, el inicio o `openclaw doctor --fix` la importará automáticamente al nuevo flujo de claves de recuperación.
- Si el token de acceso de Matrix cambió después de que se preparó la migración, el inicio ahora escanea las raíces de almacenamiento de hash de token hermanas en busca de un estado de restauración heredado pendiente antes de renunciar a la restauración automática de la copia de seguridad.
- Si el token de acceso de Matrix cambia más tarde para la misma cuenta, servidor doméstico y usuario, OpenClaw ahora prefiere reutilizar la raíz de almacenamiento de hash de token existente más completa en lugar de comenzar desde un directorio de estado de Matrix vacío.
- En el siguiente inicio de la pasarela, las claves de sala respaldadas se restauran automáticamente en el nuevo almacén de cifrado.
- Si el complemento antiguo tenía claves de sala solo locales que nunca se respaldaron, OpenClaw advertirá claramente. Esas claves no se pueden exportar automáticamente desde el almacén de cifrado de rust anterior, por lo que es posible que parte del historial cifrado antiguo no esté disponible hasta que se recupere manualmente.
- Consulte [Migración de Matrix](/en/install/migrating-matrix) para obtener el flujo de actualización completo, los límites, los comandos de recuperación y los mensajes de migración comunes.

El estado de tiempo de ejecución cifrado se organiza bajo raíces de hash de token por cuenta y por usuario en
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/`.
Ese directorio contiene el almacén de sincronización (`bot-storage.json`), el almacén de cifrado (`crypto/`),
el archivo de clave de recuperación (`recovery-key.json`), la instantánea de IndexedDB (`crypto-idb-snapshot.json`),
los enlaces de subproces (`thread-bindings.json`) y el estado de verificación de inicio (`startup-verification.json`)
cuando esas características están en uso.
Cuando el token cambia pero la identidad de la cuenta permanece igual, OpenClaw reutiliza la mejor raíz
existente para esa tupla de cuenta/servidor doméstico/usuario para que el estado de sincronización previo, el estado de cifrado, los enlaces de subproces,
y el estado de verificación de inicio permanezcan visibles.

### Modelo de almacén de cifrado de Node

Matrix E2EE en este complemento utiliza la ruta de cifrado `matrix-js-sdk` Rust oficial en Node.
Esa ruta espera persistencia respaldada por IndexedDB cuando desea que el estado de cifrado sobreviva a los reinicios.

Actualmente, OpenClaw proporciona esto en Node mediante:

- usar `fake-indexeddb` como la simulación de la API de IndexedDB que espera el SDK
- restaurar el contenido de IndexedDB del cifrado Rust desde `crypto-idb-snapshot.json` antes de `initRustCrypto`
- persistir el contenido actualizado de IndexedDB nuevamente en `crypto-idb-snapshot.json` después de la inicialización y durante el tiempo de ejecución
- serializar la restauración y persistencia de la instantánea contra `crypto-idb-snapshot.json` con un bloqueo de archivo asesor, de modo que la persistencia del tiempo de ejecución de la puerta de enlace y el mantenimiento de la CLI no compitan por el mismo archivo de instantánea

Esta es una infraestructura de compatibilidad/almacenamiento, no una implementación de cifrado personalizada.
El archivo de instantánea es un estado de tiempo de ejecución confidencial y se almacena con permisos de archivo restrictivos.
Bajo el modelo de seguridad de OpenClaw, el host de la puerta de enlace y el directorio de estado local de OpenClaw ya están dentro del límite del operador de confianza, por lo que esto es principalmente una preocupación de durabilidad operativa más que un límite de confianza remoto separado.

Mejora planificada:

- agregar soporte de SecretRef para el material de clave persistente de Matrix, de modo que las claves de recuperación y los secretos relacionados con el cifrado del almacén puedan obtenerse de los proveedores de secretos de OpenClaw en lugar de solo archivos locales

## Gestión del perfil

Actualice el perfil propio de Matrix para la cuenta seleccionada con:

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

Agregue `--account <id>` cuando desee dirigirse explícitamente a una cuenta de Matrix con nombre.

Matrix acepta directamente las URL de avatar `mxc://`. Cuando pasa una URL de avatar `http://` o `https://`, OpenClaw primero la carga en Matrix y almacena la URL `mxc://` resuelta nuevamente en `channels.matrix.avatarUrl` (o la invalidación de la cuenta seleccionada).

## Avisos automáticos de verificación

Matrix ahora publica avisos del ciclo de vida de verificación directamente en la sala de verificación de DM estricta como mensajes `m.notice`.
Esto incluye:

- avisos de solicitud de verificación
- avisos de verificación lista (con orientación explícita "Verificar por emoji")
- avisos de inicio y finalización de verificación
- Detalles SAS (emoji y decimal) cuando estén disponibles

Las solicitudes de verificación entrantes de otro cliente de Matrix son rastreadas y aceptadas automáticamente por OpenClaw.
Para los flujos de autoverificación, OpenClaw también inicia el flujo SAS automáticamente cuando la verificación por emoji está disponible y confirma su propio lado.
Para las solicitudes de verificación de otro usuario/dispositivo de Matrix, OpenClaw acepta automáticamente la solicitud y luego espera a que el flujo SAS continúe normalmente.
Aún necesitas comparar el emoji o el SAS decimal en tu cliente de Matrix y confirmar que "Coinciden" allí para completar la verificación.

OpenClaw no acepta automáticamente a ciegas los flujos duplicados iniciados por sí mismo. Al iniciarse, se omite la creación de una nueva solicitud cuando ya hay una solicitud de autoverificación pendiente.

Las notificaciones del protocolo/sistema de verificación no se reenvían a la canalización de chat del agente, por lo que no producen `NO_REPLY`.

### Higiene de dispositivos

Los antiguos dispositivos de Matrix gestionados por OpenClaw pueden acumularse en la cuenta y dificultar el razonamiento sobre la confianza en salas cifradas.
Listalos con:

```bash
openclaw matrix devices list
```

Elimina los dispositivos obsoletos gestionados por OpenClaw con:

```bash
openclaw matrix devices prune-stale
```

### Reparación directa de sala

Si el estado de los mensajes directos se desincroniza, OpenClaw puede terminar con asignaciones `m.direct` obsoletas que apuntan a salas solitarias antiguas en lugar de al MD actual. Inspecciona la asignación actual para un par con:

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

El flujo de reparación no elimina las salas antiguas automáticamente. Solo selecciona el MD saludable y actualiza la asignación para que los nuevos envíos de Matrix, las notificaciones de verificación y otros flujos de mensajes directos apunten nuevamente a la sala correcta.

## Hilos

Matrix admite hilos nativos de Matrix tanto para respuestas automáticas como para envíos de herramientas de mensajes.

- `dm.sessionScope: "per-user"` (predeterminado) mantiene el enrutamiento de MD de Matrix limitado al remitente, por lo que múltiples salas de MD pueden compartir una sesión cuando resuelven al mismo par.
- `dm.sessionScope: "per-room"` aísla cada sala de MD de Matrix en su propia clave de sesión mientras todavía utiliza comprobaciones normales de autenticación y lista de permitidos de MD.
- Los enlaces explícitos de conversaciones de Matrix todavía tienen prioridad sobre `dm.sessionScope`, por lo que las salas y los hilos enlazados mantienen su sesión de destino elegida.
- `threadReplies: "off"` mantiene las respuestas en el nivel superior y mantiene los mensajes entrantes en hilo en la sesión principal.
- `threadReplies: "inbound"` responde dentro de un hilo solo cuando el mensaje entrante ya estaba en ese hilo.
- `threadReplies: "always"` mantiene las respuestas de la sala en un hilo basado en el mensaje desencadenante y enruta esa conversación a través de la sesión con ámbito de hilo correspondiente del primer mensaje desencadenante.
- `dm.threadReplies` anula la configuración de nivel superior solo para los MD. Por ejemplo, puede mantener los hilos de la sala aislados mientras mantiene los MD planos.
- Los mensajes entrantes en hilo incluyen el mensaje raíz del hilo como contexto adicional del agente.
- Los envíos de la herramienta de mensajes ahora heredan automáticamente el hilo actual de Matrix cuando el destino es la misma sala o el mismo destino de usuario de MD, a menos que se proporcione un `threadId` explícito.
- La reutilización del destino de usuario de MD de la misma sesión solo se activa cuando los metadatos de la sesión actual demuestran el mismo par de MD en la misma cuenta de Matrix; de lo contrario, OpenClaw recurre al enrutamiento normal con ámbito de usuario.
- Cuando OpenClaw ve que una sala de MD de Matrix colisiona con otra sala de MD en la misma sesión de MD de Matrix compartida, publica una `m.notice` de una sola vez en esa sala con la `/focus` de escape cuando los enlaces de hilos están habilitados y la sugerencia `dm.sessionScope`.
- Se admiten enlaces de hilos en tiempo de ejecución para Matrix. `/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age` y `/acp spawn` enlazados a hilos ahora funcionan en salas y MD de Matrix.
- `/focus` de sala/MD de Matrix de nivel superior crea un nuevo hilo de Matrix y lo enlaza a la sesión de destino cuando `threadBindings.spawnSubagentSessions=true`.
- Ejecutar `/focus` o `/acp spawn --thread here` dentro de un hilo de Matrix existente enlaza ese hilo actual en su lugar.

## Enlaces de conversación de ACP

Las salas de Matrix, los MD y los hilos de Matrix existentes se pueden convertir en espacios de trabajo de ACP duraderos sin cambiar la superficie del chat.

Flujo rápido de operador:

- Ejecuta `/acp spawn codex --bind here` dentro del MD, sala o hilo existente de Matrix que deseas seguir usando.
- En un MD o sala de Matrix de nivel superior, el MD/sala actual se mantiene como la superficie del chat y los mensajes futuros se enrutan a la sesión ACP generada.
- Dentro de un hilo de Matrix existente, `--bind here` vincula ese hilo actual en su lugar.
- `/new` y `/reset` restablecen la misma sesión ACP vinculada en su lugar.
- `/acp close` cierra la sesión ACP y elimina el vínculo.

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

- Establece `threadBindings.spawnSubagentSessions: true` para permitir que `/focus` de nivel superior cree y vincule nuevos hilos de Matrix.
- Establece `threadBindings.spawnAcpSessions: true` para permitir que `/acp spawn --thread auto|here` vincule sesiones ACP a hilos de Matrix.

## Reacciones

Matrix admite acciones de reacción salientes, notificaciones de reacción entrantes y reacciones de reconocimiento entrantes.

- Las herramientas de reacción saliente están controladas por `channels["matrix"].actions.reactions`.
- `react` añade una reacción a un evento específico de Matrix.
- `reactions` enumera el resumen actual de reacciones para un evento específico de Matrix.
- `emoji=""` elimina las propias reacciones de la cuenta del bot en ese evento.
- `remove: true` elimina solo la reacción de emoji especificada de la cuenta del bot.

Las reacciones de reconocimiento usan el orden de resolución estándar de OpenClaw:

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- alternativa de emoji de identidad del agente

El alcance de la reacción de reconocimiento se resuelve en este orden:

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
- Las eliminaciones de reacciones aún no se sintetizan en eventos del sistema porque Matrix las presenta como redacciones, no como eliminaciones `m.reaction` independientes.

## Contexto del historial

- `channels.matrix.historyLimit` controla cuántos mensajes recientes de la sala se incluyen como `InboundHistory` cuando un mensaje de sala de Matrix activa al agente.
- Se recurre a `messages.groupChat.historyLimit`. Establezca `0` para desactivar.
- El historial de salas de Matrix es solo para salas. Los MD siguen usando el historial de sesión normal.
- El historial de salas de Matrix es solo pendiente: OpenClaw almacena en búfer los mensajes de sala que aún no han activado una respuesta y luego captura esa ventana cuando llega una mención u otro activador.
- El mensaje activador actual no se incluye en `InboundHistory`; se mantiene en el cuerpo de entrada principal para ese turno.
- Los reintentos del mismo evento de Matrix reutilizan la instantánea del historial original en lugar de avanzar hacia mensajes de sala más nuevos.

## Visibilidad del contexto

Matrix admite el control `contextVisibility` compartido para el contexto suplementario de la sala, como el texto de respuesta recuperado, las raíces de hilos y el historial pendiente.

- `contextVisibility: "all"` es el valor predeterminado. El contexto suplementario se mantiene tal como se recibe.
- `contextVisibility: "allowlist"` filtra el contexto suplementario para los remitentes permitidos por las comprobaciones de lista de permitidos de sala/usuario activas.
- `contextVisibility: "allowlist_quote"` se comporta como `allowlist`, pero aún mantiene una respuesta citada explícita.

Este ajuste afecta la visibilidad del contexto suplementario, no si el mensaje entrante en sí puede activar una respuesta.
La autorización del activador aún proviene de `groupPolicy`, `groups`, `groupAllowFrom` y la configuración de política de MD.

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

Si un usuario de Matrix no aprobado sigue enviándole mensajes antes de la aprobación, OpenClaw reutiliza el mismo código de emparejamiento pendiente y puede enviar una respuesta de recordatorio nuevamente después de un breve tiempo de espera en lugar de generar un nuevo código.

Consulte [Emparejamiento](/en/channels/pairing) para conocer el flujo de emparejamiento de MD compartido y el diseño de almacenamiento.

## Aprobaciones de ejecución

Matrix puede actuar como un cliente de aprobación de ejecución para una cuenta de Matrix.

- `channels.matrix.execApprovals.enabled`
- `channels.matrix.execApprovals.approvers` (opcional; de lo contrario se usa `channels.matrix.dm.allowFrom`)
- `channels.matrix.execApprovals.target` (`dm` | `channel` | `both`, valor predeterminado: `dm`)
- `channels.matrix.execApprovals.agentFilter`
- `channels.matrix.execApprovals.sessionFilter`

Los aprobadores deben ser ID de usuario de Matrix como `@owner:example.org`. Matrix habilita automáticamente las aprobaciones de ejecución nativas cuando `enabled` no está establecido o es `"auto"` y se puede resolver al menos un aprobador, ya sea de `execApprovals.approvers` o de `channels.matrix.dm.allowFrom`. Establezca `enabled: false` para deshabilitar explícitamente Matrix como un cliente de aprobación nativo. De lo contrario, las solicitudes de aprobación recurren a otras rutas de aprobación configuradas o a la política de reserva de aprobación de ejecución.

El enrutamiento nativo de Matrix hoy es solo para ejecución:

- `channels.matrix.execApprovals.*` controla el enrutamiento nativo de MD/canal solo para aprobaciones de ejecución.
- Las aprobaciones de complementos aún usan `/approve` compartida en el mismo chat más cualquier reenvío `approvals.plugin` configurado.
- Matrix aún puede reutilizar `channels.matrix.dm.allowFrom` para la autorización de aprobación de complementos cuando puede inferir aprobadores de forma segura, pero no expone una ruta de distribución de MD/canal separada para la aprobación de complementos nativa.

Reglas de entrega:

- `target: "dm"` envía solicitudes de aprobación a los MDs de los aprobadores
- `target: "channel"` envía la solicitud de vuelta a la sala o MD de Matrix de origen
- `target: "both"` envía a los MDs de los aprobadores y a la sala o MD de Matrix de origen

Las solicitudes de aprobación de Matrix crean accesos directos de reacción en el mensaje de aprobación principal:

- `✅` = permitir una vez
- `❌` = denegar
- `♾️` = permitir siempre cuando esa decisión esté permitida por la política de exec efectiva

Los aprobadores pueden reaccionar a ese mensaje o usar los comandos de barra alternativos: `/approve <id> allow-once`, `/approve <id> allow-always` o `/approve <id> deny`.

Solo los aprobadores resueltos pueden aprobar o denegar. La entrega del canal incluye el texto del comando, por lo que solo habilite `channel` o `both` en salas de confianza.

Las solicitudes de aprobación de Matrix reutilizan el planificador de aprobación central compartido. La superficie nativa específica de Matrix es solo transporte para las aprobaciones de ejecución: enrutamiento de sala/DM y comportamiento de envío/actualización/eliminación de mensajes.

Anulación por cuenta:

- `channels.matrix.accounts.<account>.execApprovals`

Documentos relacionados: [Aprobaciones de ejecución](/en/tools/exec-approvals)

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
            threadReplies: "off",
          },
        },
      },
    },
  },
}
```

Los valores `channels.matrix` de nivel superior actúan como predeterminados para las cuentas con nombre a menos que una cuenta los invalide.
Puede limitar las entradas de sala heredadas a una cuenta de Matrix con `groups.<room>.account` (o el heredado `rooms.<room>.account`).
Las entradas sin `account` permanecen compartidas entre todas las cuentas de Matrix, y las entradas con `account: "default"` todavía funcionan cuando la cuenta predeterminada se configura directamente en el nivel superior `channels.matrix.*`.
Los valores predeterminados de autenticación compartida parcial no crean por sí mismos una cuenta predeterminada implícita separada. OpenClaw solo sintetiza la cuenta de nivel superior `default` cuando ese valor predeterminado tiene autenticación nueva (`homeserver` más `accessToken`, o `homeserver` más `userId` y `password`); las cuentas con nombre todavía pueden permanecer descubribles desde `homeserver` más `userId` cuando las credenciales almacenadas en caché satisfacen la autenticación más adelante.
Si Matrix ya tiene exactamente una cuenta con nombre, o `defaultAccount` apunta a una clave de cuenta con nombre existente, la promoción de reparación/configuración de una sola cuenta a varias cuentas preserva esa cuenta en lugar de crear una entrada `accounts.default` nueva. Solo las claves de autenticación/inicialización de Matrix se mueven a esa cuenta promovida; las claves compartidas de política de entrega permanecen en el nivel superior.
Establezca `defaultAccount` cuando desee que OpenClaw prefiera una cuenta de Matrix con nombre para el enrutamiento implícito, la sondeo y las operaciones de CLI.
Si configura varias cuentas con nombre, establezca `defaultAccount` o pase `--account <id>` para los comandos de CLI que dependen de la selección implícita de cuenta.
Pase `--account <id>` a `openclaw matrix verify ...` y `openclaw matrix devices ...` cuando desee anular esa selección implícita para un comando.

## Homeservers privados/de LAN

De forma predeterminada, OpenClaw bloquea los homeservers privados/internos de Matrix para la protección SSRF a menos que usted acepte explícitamente por cuenta.

Si su homeserver se ejecuta en localhost, una IP de LAN/Tailscale o un nombre de host interno, habilite
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

Esta opción de participación solo permite destinos privados/internos de confianza. Los servidores domésticos públicos en texto claro como
`http://matrix.example.org:8008` siguen bloqueados. Se prefiere `https://` siempre que sea posible.

## Proxy del tráfico de Matrix

Si su implementación de Matrix necesita un proxy HTTP(S) de salida explícito, establezca `channels.matrix.proxy`:

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
OpenClaw utiliza la misma configuración de proxy para el tráfico de tiempo de ejecución de Matrix y las sondas de estado de la cuenta.

## Resolución de objetivos

Matrix acepta estas formas de objetivo en cualquier lugar donde OpenClaw le pida un objetivo de sala o usuario:

- Usuarios: `@user:server`, `user:@user:server` o `matrix:user:@user:server`
- Salas: `!room:server`, `room:!room:server` o `matrix:room:!room:server`
- Alias: `#alias:server`, `channel:#alias:server` o `matrix:channel:#alias:server`

La búsqueda en vivo en el directorio utiliza la cuenta de Matrix conectada:

- Las búsquedas de usuarios consultan el directorio de usuarios de Matrix en ese servidor doméstico.
- Las búsquedas de salas aceptan ID de salas y alias explícitos directamente, luego recurren a buscar nombres de salas unidas para esa cuenta.
- La búsqueda de nombres de salas unidas es de mejor esfuerzo. Si un nombre de sala no se puede resolver a un ID o alias, es ignorado por la resolución de la lista de permitidos en tiempo de ejecución.

## Referencia de configuración

- `enabled`: habilitar o deshabilitar el canal.
- `name`: etiqueta opcional para la cuenta.
- `defaultAccount`: ID de cuenta preferida cuando se configuran varias cuentas de Matrix.
- `homeserver`: URL del servidor doméstico, por ejemplo `https://matrix.example.org`.
- `allowPrivateNetwork`: permitir que esta cuenta de Matrix se conecte a servidores domésticos privados/internos. Habilite esto cuando el servidor doméstico se resuelva a `localhost`, una IP LAN/Tailscale o un host interno como `matrix-synapse`.
- `proxy`: URL de proxy HTTP(S) opcional para el tráfico de Matrix. Las cuentas con nombre pueden anular el valor predeterminado de nivel superior con su propio `proxy`.
- `userId`: ID de usuario completo de Matrix, por ejemplo `@bot:example.org`.
- `accessToken`: token de acceso para la autenticación basada en token. Se admiten valores en texto plano y valores SecretRef para `channels.matrix.accessToken` y `channels.matrix.accounts.<id>.accessToken` en los proveedores env/file/exec. Consulte [Secrets Management](/en/gateway/secrets).
- `password`: contraseña para el inicio de sesión basado en contraseña. Se admiten valores en texto plano y valores SecretRef.
- `deviceId`: ID de dispositivo de Matrix explícito.
- `deviceName`: nombre para mostrar del dispositivo para el inicio de sesión con contraseña.
- `avatarUrl`: URL de avatar propio almacenado para la sincronización del perfil y las actualizaciones de `set-profile`.
- `initialSyncLimit`: límite de eventos de sincronización al inicio.
- `encryption`: habilitar E2EE.
- `allowlistOnly`: forzar el comportamiento exclusivo de lista de permitidos para MDs y salas.
- `allowBots`: permitir mensajes de otras cuentas de Matrix de OpenClaw configuradas (`true` o `"mentions"`).
- `groupPolicy`: `open`, `allowlist` o `disabled`.
- `contextVisibility`: modo de visibilidad de contexto de sala complementario (`all`, `allowlist`, `allowlist_quote`).
- `groupAllowFrom`: lista de permitidos de IDs de usuario para el tráfico de la sala.
- Las entradas `groupAllowFrom` deben ser IDs de usuario completos de Matrix. Los nombres no resueltos se ignoran en tiempo de ejecución.
- `historyLimit`: máximo de mensajes de sala para incluir como contexto de historial del grupo. Recurre a `messages.groupChat.historyLimit`. Establezca `0` para desactivar.
- `replyToMode`: `off`, `first` o `all`.
- `markdown`: configuración opcional de renderizado de Markdown para el texto de salida de Matrix.
- `streaming`: `off` (por defecto), `partial`, `quiet`, `true` o `false`. `partial` y `true` habilitan actualizaciones de borrador con vista previa primero usando mensajes de texto normales de Matrix. `quiet` usa avisos de vista previa sin notificación para configuraciones de reglas de inserción autohospedadas.
- `blockStreaming`: `true` habilita mensajes de progreso separados para los bloques de asistente completados mientras el streaming de vista previa de borrador está activo.
- `threadReplies`: `off`, `inbound` o `always`.
- `threadBindings`: anulaciones por canal para el enrutamiento y el ciclo de vida de la sesión vinculada al hilo.
- `startupVerification`: modo de solicitud automática de autoverificación al inicio (`if-unverified`, `off`).
- `startupVerificationCooldownHours`: tiempo de espera antes de reintentar las solicitudes automáticas de verificación al inicio.
- `textChunkLimit`: tamaño del fragmento del mensaje saliente.
- `chunkMode`: `length` o `newline`.
- `responsePrefix`: prefijo de mensaje opcional para respuestas salientes.
- `ackReaction`: anulación opcional de la reacción de confirmación (ack) para este canal/cuenta.
- `ackReactionScope`: anulación opcional del ámbito de la reacción de confirmación (ack) (`group-mentions`, `group-all`, `direct`, `all`, `none`, `off`).
- `reactionNotifications`: modo de notificación de reacción entrante (`own`, `off`).
- `mediaMaxMb`: límite de tamaño de medios en MB para el manejo de medios de Matrix. Se aplica a envíos salientes y al procesamiento de medios entrantes.
- `autoJoin`: política de unión automática a invitaciones (`always`, `allowlist`, `off`). Predeterminado: `off`.
- `autoJoinAllowlist`: salidos/alias permitidos cuando `autoJoin` es `allowlist`. Las entradas de alias se resuelven en ID de sala durante el manejo de invitaciones; OpenClaw no confía en el estado de alias declarado por la sala invitada.
- `dm`: bloque de política de MD (`enabled`, `policy`, `allowFrom`, `sessionScope`, `threadReplies`).
- Las entradas `dm.allowFrom` deben ser ID de usuario completos de Matrix, a menos que ya las hayas resuelto mediante una búsqueda en el directorio en vivo.
- `dm.sessionScope`: `per-user` (predeterminado) o `per-room`. Usa `per-room` cuando quieras que cada sala de MD de Matrix mantenga un contexto separado incluso si el par es el mismo.
- `dm.threadReplies`: anulación de política de solo hilos para MD (`off`, `inbound`, `always`). Anula la configuración `threadReplies` de nivel superior tanto para la ubicación de respuesta como para el aislamiento de sesión en MD.
- `execApprovals`: entrega de aprobación de ejecución nativa de Matrix (`enabled`, `approvers`, `target`, `agentFilter`, `sessionFilter`).
- `execApprovals.approvers`: ID de usuario de Matrix permitidos para aprobar solicitudes de ejecución. Opcional cuando `dm.allowFrom` ya identifica a los aprobadores.
- `execApprovals.target`: `dm | channel | both` (predeterminado: `dm`).
- `accounts`: anulaciones nombradas por cuenta. Los valores `channels.matrix` de nivel superior actúan como predeterminados para estas entradas.
- `groups`: mapa de políticas por sala. Se prefieren los IDs o alias de sala; los nombres de sala no resueltos se ignoran en tiempo de ejecución. La identidad de sesión/grupo utiliza el ID de sala estable después de la resolución, mientras que las etiquetas legibles por humanos provienen aún de los nombres de sala.
- `groups.<room>.account`: restringe una entrada de sala heredada a una cuenta de Matrix específica en configuraciones de múltiples cuentas.
- `groups.<room>.allowBots`: anulación a nivel de sala para los emisores de bot configurados (`true` o `"mentions"`).
- `groups.<room>.users`: lista de permitidos de emisores por sala.
- `groups.<room>.tools`: anulaciones de permiso/denegación de herramientas por sala.
- `groups.<room>.autoReply`: anulación de filtrado de menciones a nivel de sala. `true` desactiva los requisitos de mención para esa sala; `false` los vuelve a activar.
- `groups.<room>.skills`: filtro de habilidades opcional a nivel de sala.
- `groups.<room>.systemPrompt`: fragmento opcional del prompt del sistema a nivel de sala.
- `rooms`: alias heredado para `groups`.
- `actions`: filtrado de herramientas por acción (`messages`, `reactions`, `pins`, `profile`, `memberInfo`, `channelInfo`, `verification`).

## Relacionado

- [Descripción general de canales](/en/channels) — todos los canales compatibles
- [Emparejamiento](/en/channels/pairing) — autenticación por mensaje directo y flujo de emparejamiento
- [Grupos](/en/channels/groups) — comportamiento del chat grupal y filtrado de menciones
- [Enrutamiento de canales](/en/channels/channel-routing) — enrutamiento de sesión para mensajes
- [Seguridad](/en/gateway/security) — modelo de acceso y endurecimiento
