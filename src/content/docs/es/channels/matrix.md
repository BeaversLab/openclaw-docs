---
summary: "Estado de soporte de Matrix, configuración y ejemplos de configuración"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix

Matrix es un plugin de canal incluido con OpenClaw.
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
   - Las invitaciones nuevas de Matrix solo funcionan cuando `channels.matrix.autoJoin` las permite.

Rutas de configuración interactivas:

```bash
openclaw channels add
openclaw configure --section channels
```

El asistente de Matrix solicita:

- URL del servidor principal
- método de autenticación: token de acceso o contraseña
- ID de usuario (solo autenticación por contraseña)
- nombre de dispositivo opcional
- si habilitar E2EE
- si configurar el acceso a la sala y la unión automática a invitaciones

Comportamientos clave del asistente:

- Si ya existen variables de entorno de autenticación de Matrix y esa cuenta aún no tiene autenticación guardada en la configuración, el asistente ofrece un acceso directo de entorno para mantener la autenticación en las variables de entorno.
- Los nombres de cuenta se normalizan al ID de cuenta. Por ejemplo, `Ops Bot` se convierte en `ops-bot`.
- Las entradas de la lista blanca de MD aceptan `@user:server` directamente; los nombres para mostrar solo funcionan cuando la búsqueda en directorio en vivo encuentra una coincidencia exacta.
- Las entradas de la lista blanca de salas aceptan IDs y alias de salas directamente. Prefiera `!room:server` o `#alias:server`; los nombres no resueltos se ignoran en tiempo de ejecución durante la resolución de la lista blanca.
- En el modo de lista blanca de unión automática a invitaciones, use solo objetivos de invitación estables: `!roomId:server`, `#alias:server` o `*`. Se rechazan los nombres simples de salas.
- Para resolver los nombres de las salas antes de guardar, use `openclaw channels resolve --channel matrix "Project Room"`.

<Warning>
`channels.matrix.autoJoin` es `off` de forma predeterminada.

Si lo deja sin establecer, el bot no se unirá a las salas invitadas ni a las invitaciones nuevas estilo MD, por lo que no aparecerá en nuevos grupos o MD invitados a menos que se una manualmente primero.

Establezca `autoJoin: "allowlist"` junto con `autoJoinAllowlist` para restringir qué invitaciones acepta, o establezca `autoJoin: "always"` si desea que se una a cada invitación.

En el modo `allowlist`, `autoJoinAllowlist` solo acepta `!roomId:server`, `#alias:server` o `*`.

</Warning>

Ejemplo de lista blanca:

```json5
{
  channels: {
    matrix: {
      autoJoin: "allowlist",
      autoJoinAllowlist: ["!ops:example.org", "#support:example.org"],
      groups: {
        "!ops:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

Unirse a cada invitación:

```json5
{
  channels: {
    matrix: {
      autoJoin: "always",
    },
  },
}
```

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
Cuando existen credenciales en caché allí, OpenClaw trata a Matrix como configurado para la configuración, el doctor y el descubrimiento del estado del canal, incluso si la autenticación actual no se establece directamente en la configuración.

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

- `MATRIX_OPS_X2D_BOT_HOMESERVER`
- `MATRIX_OPS_X2D_BOT_ACCESS_TOKEN`

Matrix escapa la puntuación en los IDs de cuenta para evitar colisiones en las variables de entorno con ámbito.
Por ejemplo, `-` se convierte en `_X2D_`, por lo que `ops-prod` se asigna a `MATRIX_OPS_X2D_PROD_*`.

El asistente interactivo solo ofrece el acceso directo de variable de entorno cuando esas variables de entorno de autenticación ya están presentes y la cuenta seleccionada aún no tiene la autenticación de Matrix guardada en la configuración.

## Ejemplo de configuración

Esta es una configuración base práctica con emparejamiento DM, lista blanca de salas y E2EE habilitado:

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

`autoJoin` se aplica a todas las invitaciones de Matrix, incluidas las invitaciones de estilo DM. OpenClaw no puede clasificar de manera confiable una sala invitada como un MD o un grupo en el momento de la invitación, por lo que todas las invitaciones pasan primero por `autoJoin`. `dm.policy` se aplica después de que el bot se ha unido y la sala se clasifica como un MD.

## Previsualizaciones de transmisión (Streaming previews)

La transmisión de respuestas de Matrix es opcional.

Establezca `channels.matrix.streaming` en `"partial"` cuando desee que OpenClaw envíe una única respuesta de vista previa en vivo,
que edite esa vista previa en su lugar mientras el modelo genera texto y que la finalice cuando la
respuesta esté terminada:

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
- `streaming: "partial"` crea un mensaje de vista previa editable para el bloque de asistente actual utilizando mensajes de texto normales de Matrix. Esto preserva el comportamiento de notificación heredado de vista previa primero de Matrix, por lo que los clientes estándar pueden notificar sobre el primer texto de vista previa transmitido en lugar del bloque terminado.
- `streaming: "quiet"` crea un aviso de vista previa silenciosa editable para el bloque de asistente actual. Use esto solo cuando también configure reglas de inserción para el destinatario sobre ediciones de vistas previas finalizadas.
- `blockStreaming: true` habilita mensajes de progreso separados de Matrix. Con la transmisión de vista previa habilitada, Matrix mantiene el borrador en vivo para el bloque actual y preserva los bloques completados como mensajes separados.
- Cuando la transmisión de vista previa está activada y `blockStreaming` está desactivado, Matrix edita el borrador en vivo en su lugar y finaliza ese mismo evento cuando el bloque o turno termina.
- Si la vista previa ya no cabe en un solo evento de Matrix, OpenClaw detiene la transmisión de vista previa y recurre a la entrega final normal.
- Las respuestas multimedia aún envían archivos adjuntos normalmente. Si una vista previa obsoleta ya no se puede reutilizar de manera segura, OpenClaw la tacha antes de enviar la respuesta multimedia final.
- Las ediciones de vistas previas consumen llamadas adicionales a la API de Matrix. Deje la transmisión desactivada si desea el comportamiento más conservador con respecto a los límites de tasa.

`blockStreaming` no habilita las vistas previas de borrador por sí mismo.
Use `streaming: "partial"` o `streaming: "quiet"` para las ediciones de vista previa; luego agregue `blockStreaming: true` solo si también desea que los bloques de asistente completados permanezcan visibles como mensajes de progreso separados.

Si necesita notificaciones estándar de Matrix sin reglas de inserción personalizadas, use `streaming: "partial"` para el comportamiento de vista previa primero o deje `streaming` desactivado para la entrega solo final. Con `streaming: "off"`:

- `blockStreaming: true` envía cada bloque terminado como un mensaje de notificación normal de Matrix.
- `blockStreaming: false` envía solo la respuesta final completa como un mensaje normal de notificación de Matrix.

### Reglas de envío autohospedadas para vistas previas finalizadas silenciosas

Si ejecutas tu propia infraestructura de Matrix y quieres que las vistas previas silenciosas notifiquen solo cuando se complete un bloque o la respuesta final, establece `streaming: "quiet"` y añade una regla de envío por usuario para las ediciones de vista previa finalizadas.

Esta es generalmente una configuración del usuario receptor, no un cambio de configuración global del servidor doméstico:

Mapa rápido antes de comenzar:

- usuario receptor = la persona que debería recibir la notificación
- usuario bot = la cuenta de Matrix de OpenClaw que envía la respuesta
- usa el token de acceso del usuario receptor para las llamadas a la API a continuación
- coincide `sender` en la regla de envío con el MXID completo del usuario bot

1. Configura OpenClaw para usar vistas previas silenciosas:

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

2. Asegúrate de que la cuenta receptora ya reciba notificaciones de envío normales de Matrix. Las reglas de vista previa silenciosa solo funcionan si ese usuario ya tiene emisores/dispositivos que funcionen.

3. Obtén el token de acceso del usuario receptor.
   - Usa el token del usuario que recibe, no el token del bot.
   - Reutilizar un token de sesión de cliente existente suele ser lo más fácil.
   - Si necesitas generar un nuevo token, puedes iniciar sesión a través de la API estándar de Cliente-Servidor de Matrix:

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

4. Verifica que la cuenta receptora ya tenga emisores:

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

Si esto no devuelve emisores/dispositivos activos, soluciona primero las notificaciones normales de Matrix antes de añadir la regla de OpenClaw a continuación.

OpenClaw marca las ediciones de vista previa finalizadas de solo texto con:

```json
{
  "com.openclaw.finalized_preview": true
}
```

5. Crea una regla de envío de invalidación para cada cuenta receptora que deba recibir estas notificaciones:

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

- `https://matrix.example.org`: tu URL base del servidor doméstico
- `$USER_ACCESS_TOKEN`: el token de acceso del usuario que recibe
- `openclaw-finalized-preview-botname`: un ID de regla único para este bot para este usuario receptor
- `@bot:example.org`: tu MXID del bot Matrix de OpenClaw, no el MXID del usuario receptor

Importante para configuraciones de múltiples bots:

- Las reglas de envío se clavean por `ruleId`. Volver a ejecutar `PUT` contra el mismo ID de regla actualiza esa única regla.
- Si un usuario receptor debe notificar para múltiples cuentas de bots Matrix de OpenClaw, crea una regla por bot con un ID de regla único para cada coincidencia de remitente.
- Un patrón simple es `openclaw-finalized-preview-<botname>`, tal como `openclaw-finalized-preview-ops` o `openclaw-finalized-preview-support`.

La regla se evalúa contra el remitente del evento:

- autenticarse con el token del usuario receptor
- coincidir `sender` con el MXID del bot de OpenClaw

6. Verifique que la regla existe:

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

7. Pruebe una respuesta transmitida. En modo silencioso, la sala debería mostrar una vista previa de borrador silenciosa y la
   edición in situ final debería notificar una vez que el bloque o turno termine.

Si necesita eliminar la regla más adelante, elimine ese mismo ID de regla con el token del usuario receptor:

```bash
curl -sS -X DELETE \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

Notas:

- Cree la regla con el token de acceso del usuario receptor, no el del bot.
- Las nuevas reglas `override` definidas por el usuario se insertan antes de las reglas de supresión predeterminadas, por lo que no se necesita ningún parámetro de orden adicional.
- Esto solo afecta las ediciones de vista previa de solo texto que OpenClaw puede finalizar de manera segura en su lugar. Los respaldos de medios y los respaldos de vistas previas obsoletas todavía usan la entrega normal de Matrix.
- Si `GET /_matrix/client/v3/pushers` no muestra emisores, el usuario aún no tiene entrega de envíos de Matrix funcional para esta cuenta/dispositivo.

#### Synapse

Para Synapse, la configuración anterior suele ser suficiente por sí misma:

- No se requiere ningún cambio especial de `homeserver.yaml` para las notificaciones de vista previa finalizadas de OpenClaw.
- Si su implementación de Synapse ya envía notificaciones de envío normales de Matrix, el token de usuario + la llamada `pushrules` anterior es el paso principal de configuración.
- Si ejecuta Synapse detrás de un proxy inverso o trabajadores, asegúrese de que `/_matrix/client/.../pushrules/` llegue a Synapse correctamente.
- Si ejecuta trabajadores de Synapse, asegúrese de que los emisores estén saludables. La entrega de envíos es manejada por el proceso principal o `synapse.app.pusher` / trabajadores de envío configurados.

#### Tuwunel

Para Tuwunel, use el mismo flujo de configuración y la llamada a la API de reglas de envío que se muestra arriba:

- No se requiere una configuración específica de Tuwunel para el marcador de vista previa finalizada en sí.
- Si las notificaciones normales de Matrix ya funcionan para ese usuario, el token de usuario + la llamada `pushrules` anterior es el paso principal de configuración.
- Si las notificaciones parecen desaparecer mientras el usuario está activo en otro dispositivo, verifique si `suppress_push_when_active` está habilitado. Tuwunel añadió esta opción en Tuwunel 1.4.2 el 12 de septiembre de 2025, y puede suprimir intencionalmente las notificaciones push a otros dispositivos mientras un dispositivo está activo.

## Salas de bot a bot

De manera predeterminada, los mensajes de Matrix de otras cuentas de OpenClaw Matrix configuradas se ignoran.

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
- OpenClaw todavía ignora los mensajes del mismo ID de usuario de Matrix para evitar bucles de autorespuesta.
- Matrix no expone una marca nativa de bot aquí; OpenClaw trata "creado por bot" como "enviado por otra cuenta de Matrix configurada en esta puerta de enlace de OpenClaw".

Use listas de permitidos estrictas para las salas y requisitos de mención al habilitar el tráfico de bot a bot en salas compartidas.

## Cifrado y verificación

En salas cifradas (E2EE), los eventos de imagen salientes usan `thumbnail_file` para que las vistas previas de las imágenes se cifren junto con el archivo adjunto completo. Las salas no cifradas todavía usan `thumbnail_url` plano. No se necesita ninguna configuración: el complemento detecta el estado E2EE automáticamente.

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

Estado detallado (diagnóstico completo):

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

Detalles detallados de la verificación del dispositivo:

```bash
openclaw matrix verify device "<your-recovery-key>" --verbose
```

Verificar el estado de salud de la copia de seguridad de las claves de la sala:

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

Eliminar la copia de seguridad actual del servidor y crear una nueva línea de base de copia de seguridad. Si la clave de
copia de seguridad almacenada no se puede cargar limpiamente, este restablecimiento también puede recrear el almacenamiento de secretos para que
los inicios en frío futuros puedan cargar la nueva clave de copia de seguridad:

```bash
openclaw matrix verify backup reset --yes
```

De forma predeterminada, todos los comandos `verify` son concisos (incluyendo el registro interno silencioso del SDK) y muestran diagnósticos detallados solo con `--verbose`.
Use `--json` para obtener una salida completa legible por máquina al crear scripts.

En configuraciones multicuenta, los comandos de la CLI de Matrix utilizan la cuenta predeterminada implícita de Matrix a menos que pase `--account <id>`.
Si configura varias cuentas con nombre, establezca `channels.matrix.defaultAccount` primero o esas operaciones implícitas de la CLI se detendrán y le pedirán que elija una cuenta explícitamente.
Use `--account` siempre que quiera que las operaciones de verificación o de dispositivo apunten explícitamente a una cuenta con nombre:

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

Cuando el cifrado está deshabilitado o no está disponible para una cuenta con nombre, las advertencias y errores de verificación de Matrix apuntan a la clave de configuración de esa cuenta, por ejemplo `channels.matrix.accounts.assistant.encryption`.

### Qué significa "verificado"

OpenClaw trata este dispositivo de Matrix como verificado solo cuando está verificado por su propia identidad de firma cruzada.
En la práctica, `openclaw matrix verify status --verbose` expone tres señales de confianza:

- `Locally trusted`: este dispositivo es confiable solo para el cliente actual
- `Cross-signing verified`: el SDK reporta el dispositivo como verificado a través de la firma cruzada
- `Signed by owner`: el dispositivo está firmado por su propia clave de autofirma

`Verified by owner` se convierte en `yes` solo cuando está presente la verificación de firma cruzada o la firma del propietario.
La confianza local por sí sola no es suficiente para que OpenClaw trate el dispositivo como totalmente verificado.

### Qué hace el arranque (bootstrap)

`openclaw matrix verify bootstrap` es el comando de reparación y configuración para cuentas cifradas de Matrix.
Realiza todo lo siguiente en orden:

- inicializa el almacenamiento de secretos, reutilizando una clave de recuperación existente cuando sea posible
- inicializa la firma cruzada y carga las claves públicas de firma cruzada faltantes
- intenta marcar y firmar cruzadamente el dispositivo actual
- crea una nueva copia de seguridad de claves de sala en el servidor si aún no existe una

Si el servidor doméstico requiere autenticación interactiva para cargar las claves de firma cruzada, OpenClaw intenta la carga sin autenticación primero, luego con `m.login.dummy`, y luego con `m.login.password` cuando `channels.matrix.password` está configurado.

Use `--force-reset-cross-signing` solo cuando intencionalmente desee descartar la identidad de firma cruzada actual y crear una nueva.

Si intencionalmente desea descartar la copia de seguridad de las claves de la sala actual y comenzar una nueva
línea base de copia de seguridad para mensajes futuros, use `openclaw matrix verify backup reset --yes`.
Haga esto solo cuando acepte que el historial encriptado antiguo irrecuperable permanecerá
indisponible y que OpenClaw puede recrear el almacenamiento secreto si el secreto de la copia de seguridad
actual no se puede cargar de forma segura.

### Nueva línea base de copia de seguridad

Si desea mantener el funcionamiento de los mensajes encriptados futuros y acepta perder el historial antiguo irrecuperable, ejecute estos comandos en orden:

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

Añada `--account <id>` a cada comando cuando desee apuntar explícitamente a una cuenta de Matrix con nombre.

### Comportamiento de inicio

Cuando `encryption: true`, Matrix por defecto establece `startupVerification` en `"if-unverified"`.
Al iniciarse, si este dispositivo aún no está verificado, Matrix solicitará la autoverificación en otro cliente de Matrix,
omitirá solicitudes duplicadas mientras ya haya una pendiente y aplicará un enfriamiento local antes de reintentar después de los reinicios.
Los intentos de solicitud fallidos se reintentan antes que la creación exitosa de solicitudes por defecto.
Establezca `startupVerification: "off"` para deshabilitar las solicitudes automáticas de inicio, o ajuste `startupVerificationCooldownHours`
si desea una ventana de reintento más corta o más larga.

El inicio también realiza automáticamente un pase de arranque criptográfico conservador.
Ese pase intenta reutilizar primero el almacenamiento secreto actual y la identidad de firma cruzada, y evita restablecer la firma cruzada a menos que ejecute un flujo de reparación de arranque explícito.

Si el inicio aún encuentra un estado de arranque (bootstrap) dañado, OpenClaw puede intentar una ruta de reparación protegida incluso cuando `channels.matrix.password` no está configurado.
Si el servidor doméstico requiere UIA basada en contraseña para esa reparación, OpenClaw registra una advertencia y mantiene el inicio como no fatal en lugar de abortar el bot.
Si el dispositivo actual ya está firmado por el propietario, OpenClaw preserva esa identidad en lugar de restablecerla automáticamente.

Consulte [Migración de Matrix](/en/install/migrating-matrix) para conocer el flujo completo de actualización, los límites, los comandos de recuperación y los mensajes comunes de migración.

### Notificaciones de verificación

Matrix publica notificaciones del ciclo de vida de verificación directamente en la sala de verificación de MD estricta como mensajes `m.notice`.
Esto incluye:

- notificaciones de solicitud de verificación
- notificaciones de verificación lista (con guía explícita "Verificar por emoji")
- notificaciones de inicio y finalización de la verificación
- detalles de SAS (emoji y decimal) cuando estén disponibles

Las solicitudes de verificación entrantes de otro cliente de Matrix son rastreadas y aceptadas automáticamente por OpenClaw.
Para los flujos de autocomprobación, OpenClaw también inicia el flujo SAS automáticamente cuando la verificación mediante emoji está disponible y confirma su propio lado.
Para las solicitudes de verificación de otro usuario/dispositivo de Matrix, OpenClaw acepta automáticamente la solicitud y luego espera a que el flujo SAS proceda normalmente.
Aún necesitas comparar el SAS de emoji o decimal en tu cliente de Matrix y confirmar "Coinciden" allí para completar la verificación.

OpenClaw no acepta automáticamente a ciegas flujos duplicados iniciados por uno mismo. El inicio omite la creación de una nueva solicitud cuando ya hay una solicitud de autocomprobación pendiente.

Las notificaciones del protocolo/sistema de verificación no se reenvían a la canalización de chat del agente, por lo que no producen `NO_REPLY`.

### Higiene de dispositivos

Los dispositivos antiguos de Matrix gestionados por OpenClaw pueden acumularse en la cuenta y dificultar el razonamiento sobre la confianza en las habitaciones cifradas.
Listalos con:

```bash
openclaw matrix devices list
```

Elimina los dispositivos obsoletos gestionados por OpenClaw con:

```bash
openclaw matrix devices prune-stale
```

### Almacén criptográfico

El E2EE de Matrix utiliza la ruta criptográfica oficial de Rust `matrix-js-sdk` en Node, con `fake-indexeddb` como el simulacro de IndexedDB. El estado criptográfico se guarda en un archivo de instantánea (`crypto-idb-snapshot.json`) y se restaura al iniciarse. El archivo de instantánea es un estado de ejecución sensible almacenado con permisos de archivo restrictivos.

El estado de ejecución cifrado reside bajo raíces por cuenta y por hash de token de usuario en
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/`.
Ese directorio contiene el almacén de sincronización (`bot-storage.json`), el almacén criptográfico (`crypto/`),
el archivo de clave de recuperación (`recovery-key.json`), la instantánea de IndexedDB (`crypto-idb-snapshot.json`),
vínculos de hilos (`thread-bindings.json`) y el estado de verificación de inicio (`startup-verification.json`).
Cuando el token cambia pero la identidad de la cuenta permanece igual, OpenClaw reutiliza la mejor raíz existente
para esa tupla cuenta/servidor de inicio/usuario para que el estado de sincronización previo, el estado criptográfico, los vínculos de hilos,
y el estado de verificación de inicio permanezcan visibles.

## Gestión del perfil

Actualiza el auto-perfil de Matrix para la cuenta seleccionada con:

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

Añada `--account <id>` cuando desee dirigirse explícitamente a una cuenta de Matrix con nombre.

Matrix acepta URLs de avatar `mxc://` directamente. Cuando pasa una URL de avatar `http://` o `https://`, OpenClaw primero la sube a Matrix y almacena la URL `mxc://` resuelta nuevamente en `channels.matrix.avatarUrl` (o la anulación de cuenta seleccionada).

## Hilos

Matrix admite hilos nativos de Matrix tanto para respuestas automáticas como para envíos a través de herramientas de mensajes.

- `dm.sessionScope: "per-user"` (predeterminado) mantiene el enrutamiento de MD de Matrix limitado al remitente, por lo que múltiples salas de MD pueden compartir una sesión cuando se resuelven al mismo par.
- `dm.sessionScope: "per-room"` aísla cada sala de MD de Matrix en su propia clave de sesión mientras todavía usa verificaciones normales de autenticación y lista de permitidos de MD.
- Los enlaces de conversación explícitos de Matrix todavía tienen prioridad sobre `dm.sessionScope`, por lo que las salas e hilos vinculados mantienen su sesión de destino elegida.
- `threadReplies: "off"` mantiene las respuestas en el nivel superior y mantiene los mensajes entrantes en hilo en la sesión principal.
- `threadReplies: "inbound"` responde dentro de un hilo solo cuando el mensaje entrante ya estaba en ese hilo.
- `threadReplies: "always"` mantiene las respuestas de la sala en un hilo enraizado en el mensaje desencadenante y enruta esa conversación a través de la sesión con alcance de hilo correspondiente del primer mensaje desencadenante.
- `dm.threadReplies` anula la configuración de nivel superior solo para MD. Por ejemplo, puede mantener los hilos de sala aislados mientras mantiene los MD planos.
- Los mensajes entrantes en hilo incluyen el mensaje raíz del hilo como contexto adicional del agente.
- Los envíos de herramientas de mensajes heredan automáticamente el hilo actual de Matrix cuando el objetivo es la misma sala, o el mismo objetivo de usuario de MD, a menos que se proporcione un `threadId` explícito.
- La reutilización del objetivo de usuario de MD de la misma sesión solo entra en vigor cuando los metadatos de la sesión actual prueban el mismo par de MD en la misma cuenta de Matrix; de lo contrario, OpenClaw recurre al enrutamiento normal con alcance de usuario.
- Cuando OpenClaw detecta que una sala de MD de Matrix colisiona con otra sala de MD en la misma sesión de MD de Matrix compartida, publica un `m.notice` de una sola vez en esa sala con la salida de emergencia `/focus` cuando los enlaces de hilos están habilitados y la pista `dm.sessionScope`.
- Los enlaces de hilos en tiempo de ejecución son compatibles con Matrix. `/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age` y `/acp spawn` vinculados a hilos funcionan en salas y MD de Matrix.
- El `/focus` de sala/MD de Matrix de nivel superior crea un nuevo hilo de Matrix y lo vincula a la sesión de destino cuando `threadBindings.spawnSubagentSessions=true`.
- Ejecutar `/focus` o `/acp spawn --thread here` dentro de un hilo de Matrix existente vincula ese hilo actual en su lugar.

## Vínculos de conversación ACP

Las salas de Matrix, los MD y los hilos de Matrix existentes se pueden convertir en espacios de trabajo ACP duraderos sin cambiar la superficie del chat.

Flujo rápido del operador:

- Ejecuta `/acp spawn codex --bind here` dentro del MD, la sala o el hilo existente de Matrix que deseas seguir utilizando.
- En un MD o sala de Matrix de nivel superior, el MD/sala actual permanece como la superficie del chat y los mensajes futuros se enrutan a la sesión ACP generada.
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

- Configure `threadBindings.spawnSubagentSessions: true` para permitir que los `/focus` de nivel superior creen y vinculen nuevos hilos de Matrix.
- Configure `threadBindings.spawnAcpSessions: true` para permitir que `/acp spawn --thread auto|here` vinculen sesiones de ACP a hilos de Matrix.

## Reacciones

Matrix admite acciones de reacción salientes, notificaciones de reacción entrantes y reacciones de ack entrantes.

- Las herramientas de reacción salientes están controladas por `channels["matrix"].actions.reactions`.
- `react` añade una reacción a un evento específico de Matrix.
- `reactions` lista el resumen actual de reacciones para un evento específico de Matrix.
- `emoji=""` elimina las propias reacciones de la cuenta de bot en ese evento.
- `remove: true` elimina solo la reacción de emoji especificada de la cuenta de bot.

Las reacciones de ack utilizan el orden de resolución estándar de OpenClaw:

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- reserva de emoji de identidad del agente

El ámbito de reacción de ack se resuelve en este orden:

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

El modo de notificación de reacción se resuelve en este orden:

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- predeterminado: `own`

Comportamiento:

- `reactionNotifications: "own"` reenvía eventos `m.reaction` añadidos cuando tienen como objetivo mensajes de Matrix creados por el bot.
- `reactionNotifications: "off"` desactiva los eventos del sistema de reacción.
- Las eliminaciones de reacciones no se sintetizan en eventos del sistema porque Matrix las presenta como redacciones, no como eliminaciones `m.reaction` independientes.

## Contexto del historial

- `channels.matrix.historyLimit` controla cuántos mensajes recientes de la sala se incluyen como `InboundHistory` cuando un mensaje de sala de Matrix activa al agente. Por defecto es `messages.groupChat.historyLimit`; si ambos no están configurados, el valor predeterminado efectivo es `0`. Configure `0` para desactivar.
- El historial de la sala de Matrix es solo para la sala. Los MD siguen utilizando el historial de sesión normal.
- El historial de la sala de Matrix es solo pendiente: OpenClaw almacena en el búfer los mensajes de la sala que aún no han desencadenado una respuesta y luego captura esa ventana cuando llega una mención u otro desencadenador.
- El mensaje desencadenador actual no se incluye en `InboundHistory`; se mantiene en el cuerpo principal de entrada para ese turno.
- Los reintentos del mismo evento de Matrix reutilizan la instantánea del historial original en lugar de desplazarse hacia adelante hacia mensajes más nuevos de la sala.

## Visibilidad del contexto

Matrix soporta el control compartido `contextVisibility` para el contexto complementario de la sala, como el texto de respuesta recuperado, las raíces de los hilos y el historial pendiente.

- `contextVisibility: "all"` es el valor predeterminado. El contexto complementario se mantiene tal como se recibe.
- `contextVisibility: "allowlist"` filtra el contexto complementario para los remitentes permitidos por las comprobaciones activas de la lista blanca de sala/usuario.
- `contextVisibility: "allowlist_quote"` se comporta como `allowlist`, pero aún mantiene una respuesta citada explícita.

Esta configuración afecta la visibilidad del contexto complementario, no si el mensaje entrante en sí puede desencadenar una respuesta.
La autorización del desencadenador aún proviene de `groupPolicy`, `groups`, `groupAllowFrom` y la configuración de política de MD.

## Política de MD y sala

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

Consulte [Grupos](/en/channels/groups) para conocer el comportamiento de limitación de menciones y listas de permitidos.

Ejemplo de emparejamiento para MD de Matrix:

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

Si un usuario de Matrix no aprobado sigue enviándole mensajes antes de la aprobación, OpenClaw reutiliza el mismo código de emparejamiento pendiente y puede enviar una respuesta de recordatorio nuevamente después de un breve tiempo de enfriamiento en lugar de crear un nuevo código.

Consulte [Emparejamiento](/en/channels/pairing) para conocer el flujo de emparejamiento de MD compartido y el diseño de almacenamiento.

## Reparación directa de sala

Si el estado de mensaje directo se desincroniza, OpenClaw puede terminar con asignaciones obsoletas de `m.direct` que apuntan a salas antiguas en lugar de al MD actual. Inspeccione la asignación actual para un par con:

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

Reárela con:

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

El flujo de reparación:

- prefiere un MD estricto 1:1 que ya esté asignado en `m.direct`
- recurre a cualquier MD estricto 1:1 actualmente unido con ese usuario
- crea una sala directa nueva y reescribe `m.direct` si no existe un MD saludable

El flujo de reparación no elimina las salas antiguas automáticamente. Solo selecciona el MD saludable y actualiza el mapeo para que los nuevos envíos de Matrix, avisos de verificación y otros flujos de mensajes directos apunten nuevamente a la sala correcta.

## Aprobaciones de ejecución

Matrix puede actuar como un cliente de aprobación nativo para una cuenta de Matrix. Los controles nativos de enrutamiento de DM/canal todavía viven en la configuración de aprobación de ejecución:

- `channels.matrix.execApprovals.enabled`
- `channels.matrix.execApprovals.approvers` (opcional; por defecto a `channels.matrix.dm.allowFrom`)
- `channels.matrix.execApprovals.target` (`dm` | `channel` | `both`, por defecto: `dm`)
- `channels.matrix.execApprovals.agentFilter`
- `channels.matrix.execApprovals.sessionFilter`

Los aprobadores deben ser ID de usuario de Matrix como `@owner:example.org`. Matrix habilita automáticamente las aprobaciones nativas cuando `enabled` no está establecido o es `"auto"` y se puede resolver al menos un aprobador. Las aprobaciones de ejecución usan primero `execApprovals.approvers` y pueden recurrir a `channels.matrix.dm.allowFrom`. Las aprobaciones de complemento autorizan a través de `channels.matrix.dm.allowFrom`. Establezca `enabled: false` para deshabilitar explícitamente Matrix como un cliente de aprobación nativo. De lo contrario, las solicitudes de aprobación recurren a otras rutas de aprobación configuradas o a la política de reserva de aprobación.

El enrutamiento nativo de Matrix admite ambos tipos de aprobación:

- `channels.matrix.execApprovals.*` controla el modo de distribución nativo DM/canal para los avisos de aprobación de Matrix.
- Las aprobaciones de ejecución usan el conjunto de aprobadores de ejecución de `execApprovals.approvers` o `channels.matrix.dm.allowFrom`.
- Las aprobaciones de complemento usan la lista blanca de DM de Matrix de `channels.matrix.dm.allowFrom`.
- Los atajos de reacción de Matrix y las actualizaciones de mensaje se aplican tanto a las aprobaciones de ejecución como a las de complemento.

Reglas de entrega:

- `target: "dm"` envía avisos de aprobación a los DM de los aprobadores
- `target: "channel"` envía el aviso de vuelta a la sala o DM de Matrix de origen
- `target: "both"` envía a los DM de los aprobadores y a la sala o DM de Matrix de origen

Los avisos de aprobación de Matrix inicializan atajos de reacción en el mensaje de aprobación principal:

- `✅` = permitir una vez
- `❌` = denegar
- `♾️` = permitir siempre cuando esa decisión esté permitida por la política de ejecución efectiva

Los aprobadores pueden reaccionar a ese mensaje o usar los comandos de barra alternativos: `/approve <id> allow-once`, `/approve <id> allow-always`, o `/approve <id> deny`.

Solo los aprobadores resueltos pueden aprobar o denegar. Para las aprobaciones de ejecución, la entrega del canal incluye el texto del comando, por lo que solo habilite `channel` o `both` en salas de confianza.

Anulación por cuenta:

- `channels.matrix.accounts.<account>.execApprovals`

Documentos relacionados: [Aprobaciones de ejecución](/en/tools/exec-approvals)

## Multicuenta

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

Los valores `channels.matrix` de nivel superior actúan como predeterminados para las cuentas con nombre a menos que una cuenta los anule.
Puede limitar las entradas de sala heredadas a una cuenta de Matrix con `groups.<room>.account`.
Las entradas sin `account` permanecen compartidas entre todas las cuentas de Matrix, y las entradas con `account: "default"` aún funcionan cuando la cuenta predeterminada se configura directamente en el nivel superior `channels.matrix.*`.
Los valores predeterminados de autenticación compartida parcial no crean por sí mismos una cuenta predeterminada implícita separada. OpenClaw solo sintetiza la cuenta de nivel superior `default` cuando ese valor predeterminado tiene una autenticación nueva (`homeserver` más `accessToken`, o `homeserver` más `userId` y `password`); las cuentas con nombre aún pueden permanecer descubribles desde `homeserver` más `userId` cuando las credenciales almacenadas en caché satisfacen la autenticación más adelante.
Si Matrix ya tiene exactamente una cuenta con nombre, o `defaultAccount` apunta a una clave de cuenta con nombre existente, la promoción de reparación/configuración de una sola cuenta a varias conserva esa cuenta en lugar de crear una nueva entrada `accounts.default`. Solo las claves de autenticación/inicialización de Matrix se mueven a esa cuenta promovida; las claves de política de entrega compartidas permanecen en el nivel superior.
Establezca `defaultAccount` cuando desee que OpenClaw prefiera una cuenta de Matrix con nombre para el enrutamiento implícito, el sondeo y las operaciones de CLI.
Si se configuran múltiples cuentas de Matrix y un ID de cuenta es `default`, OpenClaw usa esa cuenta implícitamente incluso cuando `defaultAccount` no está establecido.
Si configura varias cuentas con nombre, establezca `defaultAccount` o pase `--account <id>` para los comandos de CLI que dependen de la selección implícita de cuenta.
Pase `--account <id>` a `openclaw matrix verify ...` y `openclaw matrix devices ...` cuando desee anular esa selección implícita para un comando.

Consulte [Referencia de configuración](/en/gateway/configuration-reference#multi-account-all-channels) para ver el patrón multicuenta compartido.

## Servidores domésticos privados/LAN

De forma predeterminada, OpenClaw bloquea los servidores domésticos privados/internos de Matrix para la protección SSRF a menos que usted
opte explícitamente por participar por cada cuenta.

Si su servidor doméstico se ejecuta en localhost, una IP de LAN/Tailscale o un nombre de host interno, habilite
`network.dangerouslyAllowPrivateNetwork` para esa cuenta de Matrix:

```json5
{
  channels: {
    matrix: {
      homeserver: "http://matrix-synapse:8008",
      network: {
        dangerouslyAllowPrivateNetwork: true,
      },
      accessToken: "syt_internal_xxx",
    },
  },
}
```

Ejemplo de configuración mediante CLI:

```bash
openclaw matrix account add \
  --account ops \
  --homeserver http://matrix-synapse:8008 \
  --allow-private-network \
  --access-token syt_ops_xxx
```

Esta opción opcional solo permite destinos privados/internos de confianza. Los servidores domésticos públicos en texto claro, tales como
`http://matrix.example.org:8008`, permanecen bloqueados. Se prefiere `https://` siempre que sea posible.

## Proxificar el tráfico de Matrix

Si su despliegue de Matrix necesita un proxy HTTP(S) de salida explícito, configure `channels.matrix.proxy`:

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
OpenClaw utiliza la misma configuración de proxy para el tráfico de Matrix en tiempo de ejecución y las sondas de estado de la cuenta.

## Resolución de objetivos

Matrix acepta estas formas de objetivo en cualquier lugar donde OpenClaw le pida un objetivo de sala o usuario:

- Usuarios: `@user:server`, `user:@user:server`, o `matrix:user:@user:server`
- Habitaciones: `!room:server`, `room:!room:server`, o `matrix:room:!room:server`
- Alias: `#alias:server`, `channel:#alias:server`, o `matrix:channel:#alias:server`

La búsqueda en el directorio en vivo utiliza la cuenta de Matrix conectada:

- Las búsquedas de usuarios consultan el directorio de usuarios de Matrix en ese servidor de inicio.
- Las búsquedas de salas aceptan directamente ID de sala y alias explícitos, y luego recurren a buscar nombres de salas unidas para esa cuenta.
- La búsqueda de nombres de salas unidas es de mejor esfuerzo. Si un nombre de sala no se puede resolver a un ID o alias, es ignorado por la resolución de la lista de permitidos en tiempo de ejecución.

## Referencia de configuración

- `enabled`: habilitar o deshabilitar el canal.
- `name`: etiqueta opcional para la cuenta.
- `defaultAccount`: ID de cuenta preferida cuando se configuran múltiples cuentas de Matrix.
- `homeserver`: URL del servidor doméstico, por ejemplo `https://matrix.example.org`.
- `network.dangerouslyAllowPrivateNetwork`: permitir que esta cuenta de Matrix se conecte a servidores domésticos privados/internos. Habilite esto cuando el servidor doméstico se resuelva a `localhost`, una IP de LAN/Tailscale o un host interno como `matrix-synapse`.
- `proxy`: URL de proxy HTTP(S) opcional para el tráfico de Matrix. Las cuentas con nombre pueden anular el valor predeterminado de nivel superior con su propio `proxy`.
- `userId`: ID completo de usuario de Matrix, por ejemplo `@bot:example.org`.
- `accessToken`: token de acceso para la autenticación basada en token. Se admiten valores de texto plano y valores de SecretRef para `channels.matrix.accessToken` y `channels.matrix.accounts.<id>.accessToken` en los proveedores env/file/exec. Consulte [Secrets Management](/en/gateway/secrets).
- `password`: contraseña para el inicio de sesión basado en contraseña. Se admiten valores en texto plano y valores SecretRef.
- `deviceId`: ID de dispositivo Matrix explícito.
- `deviceName`: nombre para mostrar del dispositivo para el inicio de sesión con contraseña.
- `avatarUrl`: URL de avatar propio almacenado para la sincronización del perfil y actualizaciones de `profile set`.
- `initialSyncLimit`: número máximo de eventos obtenidos durante la sincronización de inicio.
- `encryption`: habilitar E2EE.
- `allowlistOnly`: cuando `true`, actualiza la política de la sala `open` a `allowlist` y fuerza todas las políticas de MD activas excepto `disabled` (incluyendo `pairing` y `open`) a `allowlist`. No afecta a las políticas `disabled`.
- `allowBots`: permitir mensajes de otras cuentas Matrix de OpenClaw configuradas (`true` o `"mentions"`).
- `groupPolicy`: `open`, `allowlist` o `disabled`.
- `contextVisibility`: modo de visibilidad de contexto de sala suplementario (`all`, `allowlist`, `allowlist_quote`).
- `groupAllowFrom`: lista de permitidos de IDs de usuario para el tráfico de la sala. Las entradas deben ser IDs de usuario completos de Matrix; los nombres no resueltos se ignoran en tiempo de ejecución.
- `historyLimit`: número máximo de mensajes de la sala para incluir como contexto del historial del grupo. Recurre a `messages.groupChat.historyLimit`; si ambos no están establecidos, el valor predeterminado efectivo es `0`. Establezca `0` para desactivar.
- `replyToMode`: `off`, `first`, `all` o `batched`.
- `markdown`: configuración opcional de renderizado de Markdown para el texto de salida de Matrix.
- `streaming`: `off` (predeterminado), `"partial"`, `"quiet"`, `true` o `false`. `"partial"` y `true` habilitan las actualizaciones de borrador con vista previa primero mediante mensajes de texto normales de Matrix. `"quiet"` usa avisos de vista previa sin notificación para configuraciones de reglas de inserción autohospedadas. `false` es equivalente a `"off"`.
- `blockStreaming`: `true` habilita mensajes de progreso separados para los bloques del asistente completados mientras el streaming de vista previa de borrador está activo.
- `threadReplies`: `off`, `inbound` o `always`.
- `threadBindings`: anulaciones por canal para el enrutamiento y el ciclo de vida de las sesiones vinculadas a hilos.
- `startupVerification`: modo de solicitud de autoverificación automática al inicio (`if-unverified`, `off`).
- `startupVerificationCooldownHours`: tiempo de espera antes de reintentar las solicitudes de verificación automática al inicio.
- `textChunkLimit`: tamaño del fragmento del mensaje saliente en caracteres (aplicable cuando `chunkMode` es `length`).
- `chunkMode`: `length` divide los mensajes por recuento de caracteres; `newline` divide en los límites de línea.
- `responsePrefix`: cadena opcional que se antepone a todas las respuestas salientes para este canal.
- `ackReaction`: anulación opcional de la reacción de acuse de recibo para este canal/cuenta.
- `ackReactionScope`: anulación opcional del ámbito de la reacción de acuse de recibo (`group-mentions`, `group-all`, `direct`, `all`, `none`, `off`).
- `reactionNotifications`: modo de notificación de reacción entrante (`own`, `off`).
- `mediaMaxMb`: límite de tamaño de medios en MB para envíos salientes y procesamiento de medios entrantes.
- `autoJoin`: política de unión automática a invitaciones (`always`, `allowlist`, `off`). Valor predeterminado: `off`. Se aplica a todas las invitaciones de Matrix, incluidas las invitaciones de estilo MD.
- `autoJoinAllowlist`: salas/alias permitidos cuando `autoJoin` es `allowlist`. Las entradas de alias se resuelven en IDs de sala durante el manejo de invitaciones; OpenClaw no confía en el estado de alias declarado por la sala invitada.
- `dm`: bloque de política de MD (`enabled`, `policy`, `allowFrom`, `sessionScope`, `threadReplies`).
- `dm.policy`: controla el acceso a MD después de que OpenClaw se ha unido a la sala y la ha clasificado como MD. No cambia si una invitación se une automáticamente.
- `dm.allowFrom`: las entradas deben ser IDs de usuario completos de Matrix, a menos que ya las haya resuelto mediante una búsqueda en directorio en vivo.
- `dm.sessionScope`: `per-user` (predeterminado) o `per-room`. Use `per-room` cuando desee que cada sala de MD de Matrix mantenga un contexto separado incluso si el interlocutor es el mismo.
- `dm.threadReplies`: anulación de la política de hilos solo para MD (`off`, `inbound`, `always`). Anula la configuración `threadReplies` de nivel superior tanto para la ubicación de respuestas como para el aislamiento de sesiones en MD.
- `execApprovals`: entrega de aprobación de ejecución nativa de Matrix (`enabled`, `approvers`, `target`, `agentFilter`, `sessionFilter`).
- `execApprovals.approvers`: IDs de usuario de Matrix permitidos para aprobar solicitudes de ejecución. Opcional cuando `dm.allowFrom` ya identifica a los aprobadores.
- `execApprovals.target`: `dm | channel | both` (predeterminado: `dm`).
- `accounts`: anulaciones con nombre por cuenta. Los valores de `channels.matrix` de nivel superior actúan como predeterminados para estas entradas.
- `groups`: mapa de políticas por sala. Se prefieren los IDs o alias de sala; los nombres de sala no resueltos se ignoran en tiempo de ejecución. La identidad de sesión/grupo utiliza el ID de sala estable después de la resolución.
- `groups.<room>.account`: restringe una entrada de sala heredada a una cuenta de Matrix específica en configuraciones multicuenta.
- `groups.<room>.allowBots`: anulación a nivel de sala para los emisores del bot configurado (`true` o `"mentions"`).
- `groups.<room>.users`: lista de permitidos de emisores por sala.
- `groups.<room>.tools`: anulaciones de permiso/denegación de herramientas por sala.
- `groups.<room>.autoReply`: anulación de filtrado de menciones a nivel de sala. `true` desactiva los requisitos de mención para esa sala; `false` los vuelve a activar.
- `groups.<room>.skills`: filtro de habilidades opcional a nivel de sala.
- `groups.<room>.systemPrompt`: fragmento opcional del prompt del sistema a nivel de sala.
- `rooms`: alias heredado para `groups`.
- `actions`: filtrado de herramientas por acción (`messages`, `reactions`, `pins`, `profile`, `memberInfo`, `channelInfo`, `verification`).

## Relacionado

- [Visión general de canales](/en/channels) — todos los canales compatibles
- [Emparejamiento](/en/channels/pairing) — autenticación por MD y flujo de emparejamiento
- [Grupos](/en/channels/groups) — comportamiento del chat grupal y filtrado de menciones
- [Enrutamiento de canales](/en/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Seguridad](/en/gateway/security) — modelo de acceso y endurecimiento
