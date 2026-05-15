---
summary: "Estado de soporte de Matrix, configuración y ejemplos de configuración"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

Matrix es un complemento de canal descargable para OpenClaw.
Utiliza el `matrix-js-sdk` oficial y admite MDs, salas, hilos, medios, reacciones, encuestas, ubicación y E2EE.

## Instalar

Instale Matrix desde ClawHub antes de configurar el canal:

```bash
openclaw plugins install @openclaw/matrix
```

Las especificaciones de complementos básicas intentan primero ClawHub y luego el respaldo npm. Para forzar la fuente del registro, use `openclaw plugins install clawhub:@openclaw/matrix` o `openclaw plugins install npm:@openclaw/matrix`.

Desde una copia local:

```bash
openclaw plugins install ./path/to/local/matrix-plugin
```

`plugins install` registra y habilita el complemento, por lo que no se necesita un paso separado de `openclaw plugins enable matrix`. El complemento aún no hace nada hasta que configure el canal a continuación. Consulte [Plugins](/es/tools/plugin) para conocer el comportamiento general del complemento y las reglas de instalación.

## Configuración

1. Cree una cuenta de Matrix en su servidor doméstico.
2. Configure `channels.matrix` con `homeserver` + `accessToken`, o `homeserver` + `userId` + `password`.
3. Reinicie la puerta de enlace.
4. Inicie un MD con el bot o invítelo a una sala (consulte [unirse automáticamente](#auto-join): las invitaciones nuevas solo se reciben cuando `autoJoin` las permite).

### Configuración interactiva

```bash
openclaw channels add
openclaw configure --section channels
```

El asistente solicita: URL del servidor doméstico, método de autenticación (token de acceso o contraseña), ID de usuario (solo autenticación por contraseña), nombre de dispositivo opcional, si habilitar E2EE y si configurar el acceso a la sala y el autounión.

Si ya existen variables de entorno `MATRIX_*` coincidentes y la cuenta seleccionada no tiene autenticación guardada, el asistente ofrece un acceso directo de variable de entorno. Para resolver los nombres de las salas antes de guardar una lista de permitidos, ejecute `openclaw channels resolve --channel matrix "Project Room"`. Cuando E2EE está habilitado, el asistente escribe la configuración y ejecuta el mismo arranque que [`openclaw matrix encryption setup`](#encryption-and-verification).

### Configuración mínima

Basado en token:

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

Basado en contraseña (el token se almacena en caché después del primer inicio de sesión):

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

### Unirse automáticamente

`channels.matrix.autoJoin` tiene como valor predeterminado `off`. Con el valor predeterminado, el bot no aparecerá en nuevas salas o MD de nuevas invitaciones hasta que te unas manualmente.

OpenClaw no puede determinar en el momento de la invitación si una sala invitada es un MD o un grupo, por lo que todas las invitaciones, incluidas las de estilo MD, pasan primero por `autoJoin`. `dm.policy` solo se aplica más tarde, después de que el bot se ha unido y la sala ha sido clasificada.

<Warning>
Establezca `autoJoin: "allowlist"` más `autoJoinAllowlist` para restringir qué invitaciones acepta el bot, o `autoJoin: "always"` para aceptar cada invitación.

`autoJoinAllowlist` solo acepta objetivos estables: `!roomId:server`, `#alias:server` o `*`. Se rechazan los nombres simples de sala; las entradas de alias se resuelven contra el servidor doméstico (homeserver), no contra el estado declarado por la sala invitada.

</Warning>

```json5
{
  channels: {
    matrix: {
      autoJoin: "allowlist",
      autoJoinAllowlist: ["!ops:example.org", "#support:example.org"],
      groups: {
        "!ops:example.org": { requireMention: true },
      },
    },
  },
}
```

Para aceptar cada invitación, use `autoJoin: "always"`.

### Formatos de objetivos de lista blanca

Las listas blancas de MD y salas se completan mejor con IDs estables:

- MD (`dm.allowFrom`, `groupAllowFrom`, `groups.<room>.users`): use `@user:server`. Los nombres para mostrar solo se resuelven cuando el directorio del servidor doméstico devuelve exactamente una coincidencia.
- Salas (`groups`, `autoJoinAllowlist`): use `!room:server` o `#alias:server`. Los nombres se resuelven con el mayor esfuerzo posible contra las salas unidas; las entradas no resueltas se ignoran en tiempo de ejecución.

### Normalización del ID de cuenta

El asistente convierte un nombre descriptivo en un ID de cuenta normalizado. Por ejemplo, `Ops Bot` se convierte en `ops-bot`. La puntuación se escapa en los nombres de variables de entorno con ámbito para que dos cuentas no puedan colisionar: `-` → `_X2D_`, por lo que `ops-prod` se asigna a `MATRIX_OPS_X2D_PROD_*`.

### Credenciales en caché

Matrix almacena las credenciales en caché bajo `~/.openclaw/credentials/matrix/`:

- cuenta predeterminada: `credentials.json`
- cuentas con nombre: `credentials-<account>.json`

Cuando existen credenciales almacenadas en caché allí, OpenClaw trata a Matrix como configurado incluso si el token de acceso no está en el archivo de configuración; esto cubre la configuración, `openclaw doctor` y las sondas de estado del canal.

### Variables de entorno

Se utilizan cuando no se establece la clave de configuración equivalente. La cuenta predeterminada usa nombres sin prefijo; las cuentas con nombre usan el ID de cuenta insertado antes del sufijo.

| Cuenta predeterminada | Cuenta con nombre (`<ID>` es el ID de cuenta normalizado) |
| --------------------- | --------------------------------------------------------- |
| `MATRIX_HOMESERVER`   | `MATRIX_<ID>_HOMESERVER`                                  |
| `MATRIX_ACCESS_TOKEN` | `MATRIX_<ID>_ACCESS_TOKEN`                                |
| `MATRIX_USER_ID`      | `MATRIX_<ID>_USER_ID`                                     |
| `MATRIX_PASSWORD`     | `MATRIX_<ID>_PASSWORD`                                    |
| `MATRIX_DEVICE_ID`    | `MATRIX_<ID>_DEVICE_ID`                                   |
| `MATRIX_DEVICE_NAME`  | `MATRIX_<ID>_DEVICE_NAME`                                 |
| `MATRIX_RECOVERY_KEY` | `MATRIX_<ID>_RECOVERY_KEY`                                |

Para la cuenta `ops`, los nombres se convierten en `MATRIX_OPS_HOMESERVER`, `MATRIX_OPS_ACCESS_TOKEN`, y así sucesivamente. Las variables de entorno de clave de recuperación son leídas por los flujos de CLI con conocimiento de recuperación (`verify backup restore`, `verify device`, `verify bootstrap`) cuando introduces la clave mediante `--recovery-key-stdin`.

`MATRIX_HOMESERVER` no se puede establecer desde un archivo `.env` del espacio de trabajo; consulte [Archivos `.env` del espacio de trabajo](/es/gateway/security).

## Ejemplo de configuración

Una base práctica con emparejamiento de MD, lista de permitidos de salas y E2EE:

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
        "!roomid:example.org": { requireMention: true },
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

## Transmisiones de vista previa

La transmisión de respuestas de Matrix es opcional. `streaming` controla cómo OpenClaw entrega la respuesta del asistente en curso; `blockStreaming` controla si cada bloque completado se conserva como su propio mensaje de Matrix.

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

Para mantener las vistas previas de respuestas en vivo pero ocultar las líneas interinas de herramientas/progreso, use el
formato de objeto:

```json5
{
  channels: {
    matrix: {
      streaming: {
        mode: "partial",
        preview: {
          toolProgress: false,
        },
      },
    },
  },
}
```

| `streaming`              | Comportamiento                                                                                                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"off"` (predeterminado) | Espere la respuesta completa, envíe una vez. `true` ↔ `"partial"`, `false` ↔ `"off"`.                                                                                                                                  |
| `"partial"`              | Edite un mensaje de texto normal en el lugar mientras el modelo escribe el bloque actual. Los clientes Matrix estándar pueden notificar en la primera vista previa, no en la edición final.                            |
| `"quiet"`                | Igual que `"partial"` pero el mensaje es un aviso sin notificación. Los destinatarios solo reciben una notificación una vez que una regla de inserción por usuario coincide con la edición finalizada (ver más abajo). |

`blockStreaming` es independiente de `streaming`:

| `streaming`             | `blockStreaming: true`                                                                     | `blockStreaming: false` (predeterminado)                       |
| ----------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `"partial"` / `"quiet"` | Borrador en vivo para el bloque actual, los bloques completados se mantienen como mensajes | Borrador en vivo para el bloque actual, finalizado en el lugar |
| `"off"`                 | Un mensaje de notificación Matrix por cada bloque terminado                                | Un mensaje de notificación Matrix para la respuesta completa   |

Notas:

- Si una vista previa crece más allá del límite de tamaño por evento de Matrix, OpenClaw detiene la transmisión de la vista previa y vuelve al envío solo final.
- Las respuestas de medios siempre envían archivos adjuntos normalmente. Si una vista previa obsoleta ya no se puede reutilizar de manera segura, OpenClaw la redacta antes de enviar la respuesta final de medios.
- Las actualizaciones de vista previa del progreso de la herramienta están habilitadas de forma predeterminada cuando la transmisión de vista previa de Matrix está activa. Establezca `streaming.preview.toolProgress: false` para mantener las ediciones de vista previa para el texto de la respuesta pero dejar el progreso de la herramienta en la ruta de entrega normal.
- Las ediciones de vista previa costean llamadas adicionales a la API de Matrix. Deje `streaming: "off"` si desea el perfil de límite de tasa más conservador.

## Metadatos de aprobación

Las solicitudes de aprobación nativas de Matrix son eventos normales `m.room.message` con contenido de evento personalizado específico de OpenClaw bajo `com.openclaw.approval`. Matrix permite claves de contenido de evento personalizadas, por lo que los clientes estándar aún renderizan el cuerpo del texto mientras que los clientes con conocimiento de OpenClaw pueden leer el id de aprobación estructurado, tipo, estado, decisiones disponibles y detalles de ejec/complemento.

Cuando una solicitud de aprobación es demasiado larga para un evento de Matrix, OpenClaw divide el texto visible y adjunta `com.openclaw.approval` solo al primer fragmento. Las reacciones para las decisiones de permitir/denegar están vinculadas a ese primer evento, por lo que las solicitudes largas mantienen el mismo objetivo de aprobación que las solicitudes de un solo evento.

### Reglas de envío autohospedadas para vistas previas finalizadas silenciosas

`streaming: "quiet"` solo notifica a los destinatarios una vez que se finaliza un bloque o turno; debe coincidir una regla de push por usuario con el marcador de vista previa finalizada. Consulte [Reglas de push de Matrix para vistas previas silenciosas](/es/channels/matrix-push-rules) para obtener la receta completa (token del destinatario, verificación del remitente, instalación de reglas, notas por servidor).

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

- `allowBots: true` acepta mensajes de otras cuentas de bot de Matrix configuradas en salas y MD permitidos.
- `allowBots: "mentions"` acepta esos mensajes solo cuando mencionan visiblemente a este bot en las salas. Los MD todavía están permitidos.
- `groups.<room>.allowBots` anula la configuración a nivel de cuenta para una sala.
- OpenClaw todavía ignora los mensajes del mismo ID de usuario de Matrix para evitar bucles de autorespuesta.
- Matrix no expone una marca nativa de bot aquí; OpenClaw trata "creado por bot" como "enviado por otra cuenta de Matrix configurada en esta puerta de enlace de OpenClaw".

Use listas de permitidos de salas estrictas y requisitos de mención cuando habilite el tráfico de bot a bot en salas compartidas.

## Cifrado y verificación

En salas cifradas (E2EE), los eventos de imagen salientes usan `thumbnail_file` para que las vistas previas de las imágenes se cifren junto con el archivo adjunto completo. Las salas no cifradas todavía usan `thumbnail_url` simple. No se necesita ninguna configuración: el complemento detecta el estado E2EE automáticamente.

Todos los comandos `openclaw matrix` aceptan `--verbose` (diagnósticos completos), `--json` (salida legible por máquina) y `--account <id>` (configuraciones de múltiples cuentas). La salida es concisa de manera predeterminada con registro interno silencioso del SDK. Los ejemplos a continuación muestran la forma canónica; agregue los indicadores según sea necesario.

### Habilitar cifrado

```bash
openclaw matrix encryption setup
```

Inicializa el almacenamiento de secretos y la firma cruzada, crea una copia de seguridad de la clave de la sala si es necesario, y luego imprime el estado y los siguientes pasos. Indicadores útiles:

- `--recovery-key <key>` aplica una clave de recuperación antes de inicializar (prefiera la forma stdin documentada a continuación)
- `--force-reset-cross-signing` descarta la identidad de firma cruzada actual y crea una nueva (úselo solo intencionalmente)

Para una cuenta nueva, habilite E2EE en el momento de la creación:

```bash
openclaw matrix account add \
  --homeserver https://matrix.example.org \
  --access-token syt_xxx \
  --enable-e2ee
```

`--encryption` es un alias de `--enable-e2ee`.

Configuración manual equivalente:

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

### Estado y señales de confianza

```bash
openclaw matrix verify status
openclaw matrix verify status --include-recovery-key --json
```

`verify status` informa tres señales de confianza independientes (`--verbose` muestra todas):

- `Locally trusted`: confiable solo por este cliente
- `Cross-signing verified`: el SDK informa la verificación mediante firma cruzada
- `Signed by owner`: firmado por su propia clave de autofirma (solo diagnóstico)

`Verified by owner` se convierte en `yes` solo cuando `Cross-signing verified` es `yes`. La confianza local o una firma de propietario por sí sola no es suficiente.

`--allow-degraded-local-state` devuelve diagnósticos de mejor esfuerzo sin preparar primero la cuenta de Matrix; útil para sondas sin conexión o parcialmente configuradas.

### Verificar este dispositivo con una clave de recuperación

La clave de recuperación es confidencial: pásela a través de stdin en lugar de pasarla en la línea de comandos. Establezca `MATRIX_RECOVERY_KEY` (o `MATRIX_<ID>_RECOVERY_KEY` para una cuenta con nombre):

```bash
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
```

El comando informa tres estados:

- `Recovery key accepted`: Matrix aceptó la clave para el almacenamiento de secretos o la confianza del dispositivo.
- `Backup usable`: la copia de seguridad de las claves de la sala se puede cargar con el material de recuperación de confianza.
- `Device verified by owner`: este dispositivo tiene plena confianza de identidad de firma cruzada de Matrix.

Termina con un valor distinto de cero cuando la confianza de identidad completa está incompleta, incluso si la clave de recuperación desbloqueó el material de copia de seguridad. En ese caso, termine la autoverificación desde otro cliente de Matrix:

```bash
openclaw matrix verify self
```

`verify self` espera `Cross-signing verified: yes` antes de salir correctamente. Use `--timeout-ms <ms>` para ajustar la espera.

El formato de clave literal `openclaw matrix verify device "<recovery-key>"` también se acepta, pero la clave termina en el historial de su shell.

### Inicializar o reparar la firma cruzada

```bash
openclaw matrix verify bootstrap
```

`verify bootstrap` es el comando de reparación y configuración para cuentas cifradas. En orden, hace lo siguiente:

- inicializa el almacenamiento de secretos, reutilizando una clave de recuperación existente cuando sea posible
- inicializa la firma cruzada y carga las claves públicas faltantes
- marca y cruza el dispositivo actual
- crea una copia de seguridad de las claves de la sala en el servidor si aún no existe una

Si el servidor doméstico requiere UIA para cargar las claves de firmas cruzadas, OpenClaw intenta primero sin autenticación, luego `m.login.dummy`, luego `m.login.password` (requiere `channels.matrix.password`).

Marcadores útiles:

- `--recovery-key-stdin` (emparejar con `printf '%s\n' "$MATRIX_RECOVERY_KEY" | …`) o `--recovery-key <key>`
- `--force-reset-cross-signing` para descartar la identidad de firmas cruzadas actual (solo intencional)

### Copia de seguridad de claves de la sala

```bash
openclaw matrix verify backup status
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
```

`backup status` muestra si existe una copia de seguridad en el servidor y si este dispositivo puede descifrarla. `backup restore` importa las claves de sala respaldadas al almacén criptográfico local; si la clave de recuperación ya está en el disco, puede omitir `--recovery-key-stdin`.

Para reemplazar una copia de seguridad dañada con una nueva línea base (acepta perder el historial antiguo irrecuperable; también puede recrear el almacenamiento de secretos si el secreto de la copia de seguridad actual no se puede cargar):

```bash
openclaw matrix verify backup reset --yes
```

Agregue `--rotate-recovery-key` solo cuando intencionalmente desee que la clave de recuperación anterior deje de desbloquear la nueva línea base de la copia de seguridad.

### Listar, solicitar y responder a verificaciones

```bash
openclaw matrix verify list
```

Lista las solicitudes de verificación pendientes para la cuenta seleccionada.

```bash
openclaw matrix verify request --own-user
openclaw matrix verify request --user-id @ops:example.org --device-id ABCDEF
```

Envía una solicitud de verificación desde esta cuenta de OpenClaw. `--own-user` solicita autoverificación (usted acepta el mensaje en otro cliente de Matrix del mismo usuario); `--user-id`/`--device-id`/`--room-id` apuntan a otra persona. `--own-user` no se puede combinar con los otros marcadores de orientación.

Para el manejo del ciclo de vida de menor nivel, generalmente al reflejar solicitudes entrantes de otro cliente, estos comandos actúan sobre una solicitud específica `<id>` (impresa por `verify list` y `verify request`):

| Comando                                    | Propósito                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `openclaw matrix verify accept <id>`       | Aceptar una solicitud entrante                                         |
| `openclaw matrix verify start <id>`        | Iniciar el flujo SAS                                                   |
| `openclaw matrix verify sas <id>`          | Imprimir los emojis o decimales SAS                                    |
| `openclaw matrix verify confirm-sas <id>`  | Confirmar que el SAS coincide con lo que muestra el otro cliente       |
| `openclaw matrix verify mismatch-sas <id>` | Rechazar el SAS cuando los emojis o los decimales no coinciden         |
| `openclaw matrix verify cancel <id>`       | Cancelar; acepta `--reason <text>` y `--code <matrix-code>` opcionales |

`accept`, `start`, `sas`, `confirm-sas`, `mismatch-sas` y `cancel` todos aceptan `--user-id` y `--room-id` como sugerencias de seguimiento de MD cuando la verificación está anclada a una sala de mensajes directos específica.

### Notas sobre multi-cuenta

Sin `--account <id>`, los comandos de la CLI de Matrix utilizan la cuenta predeterminada implícita. Si tiene varias cuentas con nombre y no ha establecido `channels.matrix.defaultAccount`, se negarán a adivinar y le pedirán que elija. Cuando E2EE está desactivado o no disponible para una cuenta con nombre, los errores apuntan a la clave de configuración de esa cuenta, por ejemplo `channels.matrix.accounts.assistant.encryption`.

<AccordionGroup>
  <Accordion title="Comportamiento de inicio">
    Con `encryption: true`, `startupVerification` es por defecto `"if-unverified"`. Al inicio, un dispositivo no verificado solicita autoverificación en otro cliente de Matrix, omitiendo duplicados y aplicando un enfriamiento (24 horas por defecto). Ajustar con `startupVerificationCooldownHours` o desactivar con `startupVerification: "off"`.

    El inicio también ejecuta un paso de arranque criptográfico conservador que reutiliza el almacenamiento de secretos actual y la identidad de firma cruzada. Si el estado de arranque está roto, OpenClaw intenta una reparación protegida incluso sin `channels.matrix.password`; si el servidor doméstico requiere UIA de contraseña, el inicio registra una advertencia y permanece no fatal. Los dispositivos ya firmados por el propietario se conservan.

    Consulte [Migración de Matrix](/es/channels/matrix-migration) para el flujo de actualización completo.

  </Accordion>

  <Accordion title="Avisos de verificación">
    Matrix publica avisos del ciclo de vida de la verificación en la sala de verificación DM estricta como mensajes `m.notice`: solicitud, listo (con la guía "Verify by emoji"), inicio/finalización y detalles de SAS (emoji/decimal) cuando estén disponibles.

    Las solicitudes entrantes de otro cliente de Matrix se rastrean y aceptan automáticamente. Para la autoverificación, OpenClaw inicia el flujo SAS automáticamente y confirma su propio lado una vez que la verificación por emoji está disponible; aún necesitas comparar y confirmar "They match" en tu cliente de Matrix.

    Los avisos del sistema de verificación no se reenvían a la canalización de chat del agente.

  </Accordion>

  <Accordion title="Dispositivo de Matrix eliminado o no válido">
    Si `verify status` indica que el dispositivo actual ya no aparece en el servidor de inicio, crea un nuevo dispositivo de Matrix en OpenClaw. Para el inicio de sesión con contraseña:

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --user-id '@assistant:example.org' \
  --password '<password>' \
  --device-name OpenClaw-Gateway
```

    Para la autenticación con token, crea un nuevo token de acceso en tu cliente de Matrix o en la interfaz de administración, y luego actualiza OpenClaw:

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --access-token '<token>'
```

    Reemplaza `assistant` con el ID de cuenta del comando fallido, o omite `--account` para la cuenta predeterminada.

  </Accordion>

  <Accordion title="Higiene de dispositivos">
    Los dispositivos antiguos gestionados por OpenClaw pueden acumularse. Para listar y limpiar:

```bash
openclaw matrix devices list
openclaw matrix devices prune-stale
```

  </Accordion>

  <Accordion title="Almacén de cifrado">
    El E2EE de Matrix utiliza la ruta de cifrado oficial de Rust `matrix-js-sdk` con `fake-indexeddb` como el adaptador de IndexedDB. El estado de cifrado se guarda en `crypto-idb-snapshot.json` (permisos de archivo restrictivos).

    El estado de tiempo de ejecución cifrado reside bajo `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` e incluye el almacén de sincronización, el almacén de cifrado, la clave de recuperación, la instantánea de IDB, los enlaces de hilos y el estado de verificación de inicio. Cuando el token cambia pero la identidad de la cuenta permanece igual, OpenClaw reutiliza la mejor raíz existente para que el estado anterior siga siendo visible.

  </Accordion>
</AccordionGroup>

## Gestión del perfil

Actualiza el perfil propio de Matrix para la cuenta seleccionada:

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

Puedes pasar ambas opciones en una sola llamada. Matrix acepta URLs de avatar `mxc://` directamente; cuando pasas `http://` o `https://`, OpenClaw sube primero el archivo y almacena la URL `mxc://` resuelta en `channels.matrix.avatarUrl` (o la anulación por cuenta).

## Hilos

Matrix admite hilos nativos de Matrix tanto para respuestas automáticas como para envíos de herramientas de mensajes. Dos controles independientes regulan el comportamiento:

### Enrutamiento de sesión (`sessionScope`)

`dm.sessionScope` determina cómo las salas de MD de Matrix se asignan a las sesiones de OpenClaw:

- `"per-user"` (predeterminado): todas las salas de MD con el mismo par enrutado comparten una sesión.
- `"per-room"`: cada sala de MD de Matrix obtiene su propia clave de sesión, incluso cuando el par es el mismo.

Los enlaces explícitos de conversación siempre tienen prioridad sobre `sessionScope`, por lo que las salas y hilos enlazados mantienen su sesión de destino elegida.

### Hilos de respuesta (`threadReplies`)

`threadReplies` determina dónde el bot publica su respuesta:

- `"off"`: las respuestas son de nivel superior. Los mensajes entrantes en hilo permanecen en la sesión principal.
- `"inbound"`: responde dentro de un hilo solo cuando el mensaje entrante ya estaba en ese hilo.
- `"always"`: responde dentro de un hilo enraizado en el mensaje desencadenante; esa conversación se enruta a través de una sesión con ámbito de hilo coincidente a partir del primer desencadenante.

`dm.threadReplies` anula esto solo para los MD; por ejemplo, mantener los hilos de la sala aislados mientras se mantienen los MD planos.

### Herencia de hilos y comandos de barra

- Los mensajes entrantes en hilo incluyen el mensaje raíz del hilo como contexto adicional del agente.
- Los envíos de herramientas de mensajes heredan automáticamente el hilo actual de Matrix cuando apuntan a la misma sala (o al mismo objetivo de usuario de MD), a menos que se proporcione un `threadId` explícito.
- La reutilización del objetivo de usuario de MD solo se activa cuando los metadatos de la sesión actual demuestran el mismo par de MD en la misma cuenta de Matrix; de lo contrario, OpenClaw recurre al enrutamiento normal con ámbito de usuario.
- `/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`, y los `/acp spawn` vinculados al hilo funcionan en salas y MD de Matrix.
- El `/focus` de nivel superior crea un nuevo hilo de Matrix y lo vincula a la sesión de destino cuando `threadBindings.spawnSessions` está habilitado.
- Ejecutar `/focus` o `/acp spawn --thread here` dentro de un hilo existente de Matrix vincula ese hilo en su lugar.

Cuando OpenClaw detecta que una sala de MD de Matrix colisiona con otra sala de MD en la misma sesión compartida, publica un `m.notice` de una sola vez en esa sala señalando al escape hatch `/focus` y sugiriendo un cambio de `dm.sessionScope`. El aviso solo aparece cuando los enlaces de hilos están habilitados.

## Enlaces de conversación ACP

Las salas de Matrix, los MD y los hilos existentes de Matrix se pueden convertir en espacios de trabajo ACP duraderos sin cambiar la superficie del chat.

Flujo rápido del operador:

- Ejecute `/acp spawn codex --bind here` dentro del MD de Matrix, la sala o el hilo existente que desea seguir utilizando.
- En un MD o sala de Matrix de nivel superior, el MD/sala actual sigue siendo la superficie del chat y los mensajes futuros se enrutan a la sesión ACP generada.
- Dentro de un hilo existente de Matrix, `--bind here` vincula ese hilo actual en su lugar.
- `/new` y `/reset` restablecen la misma sesión ACP vinculada en su lugar.
- `/acp close` cierra la sesión ACP y elimina el enlace.

Notas:

- `--bind here` no crea un hilo secundario de Matrix.
- `threadBindings.spawnSessions` limita `/acp spawn --thread auto|here`, donde OpenClaw necesita crear o vincular un hilo secundario de Matrix.

### Configuración de enlace de hilo

Matrix hereda los valores globales predeterminados de `session.threadBindings` y también admite anulaciones por canal:

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSessions`
- `threadBindings.defaultSpawnContext`

Las generaciones de sesiones vinculadas a hilos de Matrix se predeterminan a:

- Establezca `threadBindings.spawnSessions: false` para bloquear `/focus` y `/acp spawn --thread auto|here` de nivel superior para que no creen/vinculen hilos de Matrix.
- Establezca `threadBindings.defaultSpawnContext: "isolated"` cuando las generaciones de hilos de subagentes nativos no deben bifurcar la transcripción principal.

## Reacciones

Matrix admite reacciones salientes, notificaciones de reacciones entrantes y reacciones de reconocimiento.

Las herramientas de reacción saliente están limitadas por `channels.matrix.actions.reactions`:

- `react` añade una reacción a un evento de Matrix.
- `reactions` enumera el resumen de reacción actual para un evento de Matrix.
- `emoji=""` elimina las propias reacciones del bot en ese evento.
- `remove: true` elimina solo la reacción de emoji especificada del bot.

**Orden de resolución** (gana el primer valor definido):

| Configuración           | Orden                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `ackReaction`           | por cuenta → canal → `messages.ackReaction` → emoji de respaldo de identidad del agente |
| `ackReactionScope`      | por cuenta → canal → `messages.ackReactionScope` → `"group-mentions"` predeterminado    |
| `reactionNotifications` | por cuenta → canal → `"own"` predeterminado                                             |

`reactionNotifications: "own"` reenvía eventos de `m.reaction` añadidos cuando tienen como objetivo mensajes de Matrix creados por el bot; `"off"` deshabilita los eventos del sistema de reacciones. Las eliminaciones de reacciones no se sintetizan en eventos del sistema porque Matrix las presenta como redacciones, no como eliminaciones de `m.reaction` independientes.

## Contexto del historial

- `channels.matrix.historyLimit` controla cuántos mensajes recientes de la sala se incluyen como `InboundHistory` cuando un mensaje de sala de Matrix activa al agente. Por defecto es `messages.groupChat.historyLimit`; si ambos no están configurados, el valor predeterminado efectivo es `0`. Establezca `0` para deshabilitar.
- El historial de salas de Matrix es exclusivo de la sala. Los MD siguen utilizando el historial de sesión normal.
- El historial de salas de Matrix es solo pendiente: OpenClaw almacena en búfer los mensajes de la sala que aún no han activado una respuesta y luego toma una instantánea de esa ventana cuando llega una mención u otro activador.
- El mensaje desencadenador actual no se incluye en `InboundHistory`; permanece en el cuerpo entrante principal de ese turno.
- Los reintentos del mismo evento de Matrix reutilizan la instantánea del historial original en lugar de derivar hacia mensajes más recientes de la sala.

## Visibilidad del contexto

Matrix admite el control compartido `contextVisibility` para el contexto adicional de la sala, como el texto de respuesta obtenido, las raíces de los hilos y el historial pendiente.

- `contextVisibility: "all"` es el valor predeterminado. El contexto adicional se mantiene tal como se recibe.
- `contextVisibility: "allowlist"` filtra el contexto adicional para los remitentes permitidos por las comprobaciones activas de la lista de permitidos de sala/usuario.
- `contextVisibility: "allowlist_quote"` se comporta como `allowlist`, pero aún mantiene una respuesta citada explícita.

Esta configuración afecta la visibilidad del contexto adicional, no si el mensaje entrante en sí puede desencadenar una respuesta.
La autorización del desencadenador aún proviene de `groupPolicy`, `groups`, `groupAllowFrom` y la configuración de política de MD.

## Política de MD y salas

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
        "!roomid:example.org": { requireMention: true },
      },
    },
  },
}
```

Para silenciar los MD por completo mientras se mantienen las salas funcionando, configure `dm.enabled: false`:

```json5
{
  channels: {
    matrix: {
      dm: { enabled: false },
      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
    },
  },
}
```

Consulte [Grupos](/es/channels/groups) para conocer el comportamiento de las listas de permitidos y la restricción de menciones.

Ejemplo de vinculación para MD de Matrix:

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

Si un usuario de Matrix no aprobado te sigue enviando mensajes antes de la aprobación, OpenClaw reutiliza el mismo código de vinculación pendiente y puede enviar una respuesta de recordatorio después de un breve período de enfriamiento en lugar de generar un nuevo código.

Consulte [Vinculación](/es/channels/pairing) para conocer el flujo de vinculación de MD compartido y el diseño de almacenamiento.

## Reparación directa de sala

Si el estado de mensaje directo se queda fuera de sincronización, OpenClaw puede terminar con asignaciones `m.direct` obsoletas que apuntan a salas individuales antiguas en lugar del MD actual. Inspeccione la asignación actual para un par:

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

Repárelo:

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

Ambos comandos aceptan `--account <id>` para configuraciones multicuenta. El flujo de reparación:

- prefiere un MD estricto 1:1 que ya esté asignado en `m.direct`
- recurre a cualquier MD estricto 1:1 actualmente unido con ese usuario
- crea una sala directa nueva y reescribe `m.direct` si no existe un MD saludable

No elimina automáticamente las salas antiguas. Elige el MD saludable y actualiza la asignación para que los envíos futuros de Matrix, los avisos de verificación y otros flujos de mensajes directos tengan como objetivo la sala correcta.

## Aprobaciones de ejecución

Matrix puede actuar como un cliente de aprobación nativo. Configure bajo `channels.matrix.execApprovals` (o `channels.matrix.accounts.<account>.execApprovals` para una anulación por cuenta):

- `enabled`: entrega las aprobaciones a través de indicaciones nativas de Matrix. Si no se establece o es `"auto"`, Matrix se habilita automáticamente una vez que se pueda resolver al menos un aprobador. Establezca `false` para deshabilitar explícitamente.
- `approvers`: ID de usuario de Matrix (`@owner:example.org`) autorizados para aprobar solicitudes de ejecución. Opcional - recurre a `channels.matrix.dm.allowFrom`.
- `target`: a dónde van las indicaciones. `"dm"` (predeterminado) envía a los MD de los aprobadores; `"channel"` envía a la sala o MD de Matrix de origen; `"both"` envía a ambos.
- `agentFilter` / `sessionFilter`: listas de permisos opcionales para qué agentes/sesiones activan la entrega de Matrix.

La autorización difiere ligeramente entre los tipos de aprobación:

- **Las aprobaciones de ejecución** usan `execApprovals.approvers`, recurriendo a `dm.allowFrom`.
- **Las aprobaciones de complementos** se autorizan solo a través de `dm.allowFrom`.

Ambos tipos comparten los accesos directos de reacción de Matrix y las actualizaciones de mensajes. Los aprobadores ven accesos directos de reacción en el mensaje de aprobación principal:

- `✅` permitir una vez
- `❌` denegar
- `♾️` permitir siempre (cuando la política de ejecución efectiva lo permite)

Comandos de barra de respaldo: `/approve <id> allow-once`, `/approve <id> allow-always`, `/approve <id> deny`.

Solo los aprobadores resueltos pueden aprobar o denegar. La entrega del canal para aprobaciones de ejecución incluye el texto del comando; habilite `channel` o `both` solo en salas de confianza.

Relacionado: [Aprobaciones de ejecución](/es/tools/exec-approvals).

## Comandos de barra

Los comandos de barra (`/new`, `/reset`, `/model`, `/focus`, `/unfocus`, `/agents`, `/session`, `/acp`, `/approve`, etc.) funcionan directamente en los MD. En las salas, OpenClaw también reconoce los comandos que tienen el prefijo de la mención Matrix del propio bot, por lo que `@bot:server /new` activa la ruta del comando sin una expresión regular de mención personalizada. Esto mantiene al bot receptivo a las publicaciones de estilo de sala `@mention /command` que Element y clientes similares emiten cuando un usuario usa la tecla de tabulación para autocompletar el bot antes de escribir el comando.

Las reglas de autorización aún se aplican: los remitentes de comandos deben cumplir con las mismas políticas de lista de permitidos/propietario de MD o sala que los mensajes simples.

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

**Herencia:**

- Los valores `channels.matrix` de nivel superior actúan como predeterminados para las cuentas con nombre a menos que una cuenta los anule.
- Limitar una entrada de sala heredada a una cuenta específica con `groups.<room>.account`. Las entradas sin `account` se comparten entre cuentas; `account: "default"` todavía funciona cuando la cuenta predeterminada está configurada en el nivel superior.

**Selección de cuenta predeterminada:**

- Establezca `defaultAccount` para elegir la cuenta con nombre que prefieren el enrutamiento implícito, la sonda y los comandos de CLI.
- Si tiene varias cuentas y una se llama literalmente `default`, OpenClaw la usa implícitamente incluso cuando `defaultAccount` no está configurado.
- Si tiene varias cuentas con nombre y no se selecciona ninguna predeterminada, los comandos de CLI se niegan a adivinar: configure `defaultAccount` o pase `--account <id>`.
- El bloque `channels.matrix.*` de nivel superior solo se trata como la cuenta `default` implícita cuando su autenticación está completa (`homeserver` + `accessToken`, o `homeserver` + `userId` + `password`). Las cuentas con nombre siguen siendo reconocibles desde `homeserver` + `userId` una vez que las credenciales almacenadas en caché cubren la autenticación.

**Promoción:**

- Cuando OpenClaw promueve una configuración de cuenta única a multicuenta durante la reparación o la configuración, preserva la cuenta con nombre existente si hay una o si `defaultAccount` ya apunta a una. Solo las claves de autenticación/inicio de arranque de Matrix se mueven a la cuenta promovida; las claves compartidas de política de entrega se mantienen en el nivel superior.

Consulte [Referencia de configuración](/es/gateway/config-channels#multi-account-all-channels) para ver el patrón multicuenta compartido.

## Homeservers privados/LAN

De manera predeterminada, OpenClaw bloquea los homeservers de Matrix privados/internos para la protección SSRF a menos que usted opte explícitamente por ello por cuenta.

Si su homeserver se ejecuta en localhost, una IP de LAN/Tailscale o un nombre de host interno, habilite
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

Ejemplo de configuración de CLI:

```bash
openclaw matrix account add \
  --account ops \
  --homeserver http://matrix-synapse:8008 \
  --allow-private-network \
  --access-token syt_ops_xxx
```

Esta participación solo permite objetivos privados/internos de confianza. Los homeservers públicos en texto claro, como
`http://matrix.example.org:8008`, siguen bloqueados. Siempre que sea posible, prefiera `https://`.

## Proxy del tráfico de Matrix

Si su implementación de Matrix necesita un proxy HTTP(S) saliente explícito, configure `channels.matrix.proxy`:

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

Matrix acepta estos formatos de objetivo en cualquier lugar donde OpenClaw le pida un objetivo de sala o usuario:

- Usuarios: `@user:server`, `user:@user:server` o `matrix:user:@user:server`
- Salas: `!room:server`, `room:!room:server` o `matrix:room:!room:server`
- Alias: `#alias:server`, `channel:#alias:server` o `matrix:channel:#alias:server`

Los ID de sala de Matrix distinguen entre mayúsculas y minúsculas. Utilice exactamente las mayúsculas y minúsculas del ID de sala de Matrix
al configurar objetivos de entrega explícitos, trabajos cron, enlaces o listas de permitidos.
OpenClaw mantiene las claves de sesión internas canónicas para el almacenamiento, por lo que esas claves en minúsculas
no son una fuente confiable para los ID de entrega de Matrix.

La búsqueda de directorio en vivo utiliza la cuenta de Matrix iniciada sesión:

- Las búsquedas de usuarios consultan el directorio de usuarios de Matrix en ese homeserver.
- Las búsquedas de salas aceptan ID de sala y alias explícitos directamente y luego recurren a buscar nombres de salas unidas para esa cuenta.
- La búsqueda de nombres de salas unidas es de mejor esfuerzo. Si un nombre de sala no se puede resolver a una ID o alias, se ignora en la resolución de la lista blanca en tiempo de ejecución.

## Referencia de configuración

Los campos de estilo lista blanca (`groupAllowFrom`, `dm.allowFrom`, `groups.<room>.users`) aceptan ID de usuario completas de Matrix (lo más seguro). Las coincidencias exactas de directorio se resuelven al inicio y cada vez que la lista blanca cambia mientras el monitor se está ejecutando; las entradas que no se pueden resolver se ignoran en tiempo de ejecución. Las listas blancas de salas prefieren ID de salas o alias por la misma razón.

### Cuenta y conexión

- `enabled`: habilitar o deshabilitar el canal.
- `name`: etiqueta de visualización opcional para la cuenta.
- `defaultAccount`: ID de cuenta preferida cuando hay varias cuentas de Matrix configuradas.
- `accounts`: anulaciones nombradas por cuenta. Los valores `channels.matrix` de nivel superior se heredan como predeterminados.
- `homeserver`: URL del servidor de inicio, por ejemplo `https://matrix.example.org`.
- `network.dangerouslyAllowPrivateNetwork`: permitir que esta cuenta se conecte a `localhost`, IP de LAN/Tailscale o nombres de host internos.
- `proxy`: URL de proxy HTTP(S) opcional para el tráfico de Matrix. Se admite anulación por cuenta.
- `userId`: ID de usuario completa de Matrix (`@bot:example.org`).
- `accessToken`: token de acceso para la autenticación basada en token. Se admiten valores de texto plano y SecretRef en proveedores env/file/exec ([Gestión de secretos](/es/gateway/secrets)).
- `password`: contraseña para el inicio de sesión basado en contraseña. Se admiten valores de texto plano y SecretRef.
- `deviceId`: ID de dispositivo Matrix explícito.
- `deviceName`: nombre de visualización del dispositivo utilizado en el momento del inicio de sesión con contraseña.
- `avatarUrl`: URL de avatar propio almacenado para la sincronización del perfil y las actualizaciones de `profile set`.
- `initialSyncLimit`: número máximo de eventos recuperados durante la sincronización de inicio.

### Cifrado

- `encryption`: habilitar E2EE. Predeterminado: `false`.
- `startupVerification`: `"if-unverified"` (predeterminado cuando E2EE está activado) o `"off"`. Solicita automáticamente la autoverificación al inicio cuando este dispositivo no está verificado.
- `startupVerificationCooldownHours`: tiempo de espera antes de la siguiente solicitud automática al inicio. Predeterminado: `24`.

### Acceso y política

- `groupPolicy`: `"open"`, `"allowlist"`, o `"disabled"`. Predeterminado: `"allowlist"`.
- `groupAllowFrom`: lista blanca de ID de usuario para el tráfico de salas.
- `dm.enabled`: cuando es `false`, ignora todos los MD. Predeterminado: `true`.
- `dm.policy`: `"pairing"` (predeterminado), `"allowlist"`, `"open"`, o `"disabled"`. Se aplica después de que el bot se ha unido y clasificado la sala como un MD; no afecta el manejo de invitaciones.
- `dm.allowFrom`: lista blanca de ID de usuario para el tráfico de MD.
- `dm.sessionScope`: `"per-user"` (predeterminado) o `"per-room"`.
- `dm.threadReplies`: anulación solo para MD del hilado de respuestas (`"off"`, `"inbound"`, `"always"`).
- `allowBots`: acepta mensajes de otras cuentas de bots de Matrix configuradas (`true` o `"mentions"`).
- `allowlistOnly`: cuando es `true`, fuerza todas las políticas de MD activas (excepto `"disabled"`) y las políticas de grupo `"open"` a `"allowlist"`. No cambia las políticas `"disabled"`.
- `autoJoin`: `"always"`, `"allowlist"`, o `"off"`. Predeterminado: `"off"`. Se aplica a cada invitación de Matrix, incluyendo las invitaciones estilo MD.
- `autoJoinAllowlist`: salas/alias permitidos cuando `autoJoin` es `"allowlist"`. Las entradas de alias se resuelven contra el servidor de inicio (homeserver), no contra el estado declarado por la sala invitada.
- `contextVisibility`: visibilidad del contexto suplementario (`"all"` por defecto, `"allowlist"`, `"allowlist_quote"`).

### Comportamiento de respuesta

- `replyToMode`: `"off"`, `"first"`, `"all"`, o `"batched"`.
- `threadReplies`: `"off"`, `"inbound"`, o `"always"`.
- `threadBindings`: anulaciones por canal para el enrutamiento y el ciclo de vida de la sesión vinculada al hilo.
- `streaming`: `"off"` (por defecto), `"partial"`, `"quiet"`, o forma de objeto `{ mode, preview: { toolProgress } }`. `true` ↔ `"partial"`, `false` ↔ `"off"`.
- `blockStreaming`: cuando `true`, los bloques completados del asistente se mantienen como mensajes de progreso separados.
- `markdown`: configuración opcional de representación de Markdown para el texto saliente.
- `responsePrefix`: cadena opcional que se antepone a las respuestas salientes.
- `textChunkLimit`: tamaño de fragmento saliente en caracteres cuando `chunkMode: "length"`. Valor predeterminado: `4000`.
- `chunkMode`: `"length"` (por defecto, divide por recuento de caracteres) o `"newline"` (divide en los límites de línea).
- `historyLimit`: número de mensajes recientes de la sala incluidos como `InboundHistory` cuando un mensaje de la sala activa el agente. Recurre a `messages.groupChat.historyLimit`; valor predeterminado efectivo `0` (desactivado).
- `mediaMaxMb`: límite de tamaño de medios en MB para envíos salientes y procesamiento entrante.

### Configuración de reacciones

- `ackReaction`: anulación de reacción de ack para este canal/cuenta.
- `ackReactionScope`: anulación de alcance (`"group-mentions"` por defecto, `"group-all"`, `"direct"`, `"all"`, `"none"`, `"off"`).
- `reactionNotifications`: modo de notificación de reacción entrante (`"own"` por defecto, `"off"`).

### Herramientas y anulaciones por sala

- `actions`: restricción de herramientas por acción (`messages`, `reactions`, `pins`, `profile`, `memberInfo`, `channelInfo`, `verification`).
- `groups`: mapa de políticas por sala. La identidad de la sesión utiliza el ID estable de la sala después de la resolución. (`rooms` es un alias heredado).
  - `groups.<room>.account`: restringir una entrada de sala heredada a una cuenta específica.
  - `groups.<room>.allowBots`: anulación por sala de la configuración a nivel de canal (`true` o `"mentions"`).
  - `groups.<room>.users`: lista de permitidos de remitentes por sala.
  - `groups.<room>.tools`: anulaciones de permiso/denegación de herramientas por sala.
  - `groups.<room>.autoReply`: anulación de restricción de menciones por sala. `true` desactiva los requisitos de mención para esa sala; `false` los reactiva.
  - `groups.<room>.skills`: filtro de habilidades por sala.
  - `groups.<room>.systemPrompt`: fragmento de mensaje del sistema por sala.

### Configuración de aprobación de ejecución

- `execApprovals.enabled`: entregar aprobaciones de ejecución a través de indicaciones nativas de Matrix.
- `execApprovals.approvers`: ID de usuario de Matrix permitidos para aprobar. Recurre a `dm.allowFrom`.
- `execApprovals.target`: `"dm"` (por defecto), `"channel"` o `"both"`.
- `execApprovals.agentFilter` / `execApprovals.sessionFilter`: listas de permitidos opcionales de agente/sesión para la entrega.

## Relacionado

- [Resumen de canales](/es/channels) - todos los canales compatibles
- [Emparejamiento](/es/channels/pairing) - autenticación por MD y flujo de emparejamiento
- [Grupos](/es/channels/groups) - comportamiento del chat en grupo y limitación de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) - enrutamiento de sesión para mensajes
- [Seguridad](/es/gateway/security) - modelo de acceso y endurecimiento
