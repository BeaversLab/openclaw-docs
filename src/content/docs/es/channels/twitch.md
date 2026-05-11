---
summary: "Configuración y configuración del bot de chat de Twitch"
read_when:
  - Setting up Twitch chat integration for OpenClaw
title: "Twitch"
sidebarTitle: "Twitch"
---

Soporte de chat de Twitch mediante conexión IRC. OpenClaw se conecta como usuario de Twitch (cuenta de bot) para recibir y enviar mensajes en los canales.

## Complemento incluido

<Note>Twitch se distribuye como un complemento incluido en las versiones actuales de OpenClaw, por lo que las compilaciones empaquetadas normales no necesitan una instalación separada.</Note>

Si está en una compilación anterior o en una instalación personalizada que excluye Twitch, instálelo manualmente:

<Tabs>
  <Tab title="registro npm">```bash openclaw plugins install @openclaw/twitch ```</Tab>
  <Tab title="Copia local">```bash openclaw plugins install ./path/to/local/twitch-plugin ```</Tab>
</Tabs>

Detalles: [Complementos](/es/tools/plugin)

## Configuración rápida (principiante)

<Steps>
  <Step title="Asegurarse de que el complemento esté disponible">
    Las versiones empaquetadas actuales de OpenClaw ya lo incluyen. Las instalaciones antiguas/personalizadas pueden agregarlo manualmente con los comandos anteriores.
  </Step>
  <Step title="Crear una cuenta de bot de Twitch">
    Cree una cuenta de Twitch dedicada para el bot (o use una cuenta existente).
  </Step>
  <Step title="Generar credenciales">
    Use [Twitch Token Generator](https://twitchtokengenerator.com/):

    - Seleccione **Bot Token**
    - Verifique que los alcances `chat:read` y `chat:write` estén seleccionados
    - Copie el **Client ID** y el **Access Token**

  </Step>
  <Step title="Buscar su ID de usuario de Twitch">
    Use [https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) para convertir un nombre de usuario en un ID de usuario de Twitch.
  </Step>
  <Step title="Configurar el token">
    - Entorno: `OPENCLAW_TWITCH_ACCESS_TOKEN=...` (solo cuenta predeterminada)
    - O configuración: `channels.twitch.accessToken`

    Si ambos están configurados, la configuración tiene prioridad (la alternativa del entorno es solo para la cuenta predeterminada).

  </Step>
  <Step title="Iniciar la puerta de enlace">
    Inicie la puerta de enlace con el canal configurado.
  </Step>
</Steps>

<Warning>Agrega control de acceso (`allowFrom` o `allowedRoles`) para evitar que usuarios no autorizados activen el bot. `requireMention` por defecto es `true`.</Warning>

Configuración mínima:

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw", // Bot's Twitch account
      accessToken: "oauth:abc123...", // OAuth Access Token (or use OPENCLAW_TWITCH_ACCESS_TOKEN env var)
      clientId: "xyz789...", // Client ID from Token Generator
      channel: "vevisk", // Which Twitch channel's chat to join (required)
      allowFrom: ["123456789"], // (recommended) Your Twitch user ID only - get it from https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/
    },
  },
}
```

## Qué es

- Un canal de Twitch propiedad del Gateway.
- Enrutamiento determinista: las respuestas siempre vuelven a Twitch.
- Cada cuenta se asigna a una clave de sesión aislada `agent:<agentId>:twitch:<accountName>`.
- `username` es la cuenta del bot (quien se autentica), `channel` es a qué sala de chat unirse.

## Configuración (detallada)

### Generar credenciales

Use [Twitch Token Generator](https://twitchtokengenerator.com/):

- Seleccione **Bot Token**
- Verifique que los alcances `chat:read` y `chat:write` estén seleccionados
- Copie el **Client ID** y el **Access Token**

<Note>No es necesario registrar manualmente la aplicación. Los tokens expiran después de varias horas.</Note>

### Configurar el bot

<Tabs>
  <Tab title="Var de entorno (solo cuenta predeterminada)">
    ```bash
    OPENCLAW_TWITCH_ACCESS_TOKEN=oauth:abc123...
    ```
  </Tab>
  <Tab title="Config">
    ```json5
    {
      channels: {
        twitch: {
          enabled: true,
          username: "openclaw",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "vevisk",
        },
      },
    }
    ```
  </Tab>
</Tabs>

Si se configuran tanto las variables de entorno como el archivo de configuración, la configuración tiene prioridad.

### Control de acceso (recomendado)

```json5
{
  channels: {
    twitch: {
      allowFrom: ["123456789"], // (recommended) Your Twitch user ID only
    },
  },
}
```

Prefiera `allowFrom` para una lista blanca estricta. Use `allowedRoles` en su lugar si desea acceso basado en roles.

**Roles disponibles:** `"moderator"`, `"owner"`, `"vip"`, `"subscriber"`, `"all"`.

<Note>
**¿Por qué IDs de usuario?** Los nombres de usuario pueden cambiar, lo que permite la suplantación. Los IDs de usuario son permanentes.

Encuentre su ID de usuario de Twitch: [https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/) (Convierta su nombre de usuario de Twitch a ID)

</Note>

## Actualización de token (opcional)

Los tokens de [Twitch Token Generator](https://twitchtokengenerator.com/) no se pueden actualizar automáticamente - regenérelos cuando expiren.

Para la actualización automática de tokens, cree su propia aplicación de Twitch en [Twitch Developer Console](https://dev.twitch.tv/console) y agréguela a la configuración:

```json5
{
  channels: {
    twitch: {
      clientSecret: "your_client_secret",
      refreshToken: "your_refresh_token",
    },
  },
}
```

El bot actualiza automáticamente los tokens antes de que caduquen y registra los eventos de actualización.

## Soporte multicuenta

Use `channels.twitch.accounts` con tokens por cuenta. Consulte [Configuration](/es/gateway/configuration) para ver el patrón compartido.

Ejemplo (una cuenta de bot en dos canales):

```json5
{
  channels: {
    twitch: {
      accounts: {
        channel1: {
          username: "openclaw",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "vevisk",
        },
        channel2: {
          username: "openclaw",
          accessToken: "oauth:def456...",
          clientId: "uvw012...",
          channel: "secondchannel",
        },
      },
    },
  },
}
```

<Note>Cada cuenta necesita su propio token (un token por canal).</Note>

## Control de acceso

<Tabs>
  <Tab title="Lista de permitidos de ID de usuario (más segura)">
    ```json5
    {
      channels: {
        twitch: {
          accounts: {
            default: {
              allowFrom: ["123456789", "987654321"],
            },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="Basado en roles">
    ```json5
    {
      channels: {
        twitch: {
          accounts: {
            default: {
              allowedRoles: ["moderator", "vip"],
            },
          },
        },
      },
    }
    ```

    `allowFrom` es una lista de permitidos estricta. Cuando se establece, solo se permiten esos IDs de usuario. Si desea un acceso basado en roles, deje `allowFrom` sin establecer y configure `allowedRoles` en su lugar.

  </Tab>
  <Tab title="Desactivar requisito de @mención">
    De forma predeterminada, `requireMention` es `true`. Para desactivar y responder a todos los mensajes:

    ```json5
    {
      channels: {
        twitch: {
          accounts: {
            default: {
              requireMention: false,
            },
          },
        },
      },
    }
    ```

  </Tab>
</Tabs>

## Solución de problemas

Primero, ejecute comandos de diagnóstico:

```bash
openclaw doctor
openclaw channels status --probe
```

<AccordionGroup>
  <Accordion title="El bot no responde a los mensajes">
    - **Verificar el control de acceso:** Asegúrese de que su ID de usuario esté en `allowFrom`, o elimine temporalmente `allowFrom` y establezca `allowedRoles: ["all"]` para probar.
    - **Verificar que el bot esté en el canal:** El bot debe unirse al canal especificado en `channel`.
  </Accordion>
  <Accordion title="Problemas con el token">
    "Error al conectar" o errores de autenticación:

    - Verifique que `accessToken` sea el valor del token de acceso de OAuth (típicamente comienza con el prefijo `oauth:`)
    - Verifique que el token tenga los alcances `chat:read` y `chat:write`
    - Si usa la actualización del token, verifique que `clientSecret` y `refreshToken` estén establecidos

  </Accordion>
  <Accordion title="La actualización del token no funciona">
    Comprueba los registros para ver los eventos de actualización:

    ```
    Using env token source for mybot
    Access token refreshed for user 123456 (expires in 14400s)
    ```

    Si ves "token refresh disabled (no refresh token)":

    - Asegúrate de que se proporciona `clientSecret`
    - Asegúrate de que se proporciona `refreshToken`

  </Accordion>
</AccordionGroup>

## Configuración

### Configuración de cuenta

<ParamField path="username" type="string">
  Nombre de usuario del bot.
</ParamField>
<ParamField path="accessToken" type="string">
  Token de acceso OAuth con `chat:read` y `chat:write`.
</ParamField>
<ParamField path="clientId" type="string">
  ID de cliente de Twitch (del Generador de tokens o tu aplicación).
</ParamField>
<ParamField path="channel" type="string" required>
  Canal al que unirse.
</ParamField>
<ParamField path="enabled" type="boolean" default="true">
  Habilitar esta cuenta.
</ParamField>
<ParamField path="clientSecret" type="string">
  Opcional: para la actualización automática del token.
</ParamField>
<ParamField path="refreshToken" type="string">
  Opcional: para la actualización automática del token.
</ParamField>
<ParamField path="expiresIn" type="number">
  Expiración del token en segundos.
</ParamField>
<ParamField path="obtainmentTimestamp" type="number">
  Marca de tiempo de obtención del token.
</ParamField>
<ParamField path="allowFrom" type="string[]">
  Lista de permitidos de ID de usuario.
</ParamField>
<ParamField path="allowedRoles" type='Array<"moderator" | "owner" | "vip" | "subscriber" | "all">'>
  Control de acceso basado en roles.
</ParamField>
<ParamField path="requireMention" type="boolean" default="true">
  Requerir @mención.
</ParamField>

### Opciones del proveedor

- `channels.twitch.enabled` - Habilitar/deshabilitar el inicio del canal
- `channels.twitch.username` - Nombre de usuario del bot (configuración simplificada de una sola cuenta)
- `channels.twitch.accessToken` - Token de acceso OAuth (configuración simplificada de una sola cuenta)
- `channels.twitch.clientId` - ID de cliente de Twitch (configuración simplificada de una sola cuenta)
- `channels.twitch.channel` - Canal al que unirse (configuración simplificada de una sola cuenta)
- `channels.twitch.accounts.<accountName>` - Configuración multicuenta (todos los campos de cuenta anteriores)

Ejemplo completo:

```json5
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw",
      accessToken: "oauth:abc123...",
      clientId: "xyz789...",
      channel: "vevisk",
      clientSecret: "secret123...",
      refreshToken: "refresh456...",
      allowFrom: ["123456789"],
      allowedRoles: ["moderator", "vip"],
      accounts: {
        default: {
          username: "mybot",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "your_channel",
          enabled: true,
          clientSecret: "secret123...",
          refreshToken: "refresh456...",
          expiresIn: 14400,
          obtainmentTimestamp: 1706092800000,
          allowFrom: ["123456789", "987654321"],
          allowedRoles: ["moderator"],
        },
      },
    },
  },
}
```

## Acciones de herramienta

El agente puede llamar a `twitch` con la acción:

- `send` - Enviar un mensaje a un canal

Ejemplo:

```json5
{
  action: "twitch",
  params: {
    message: "Hello Twitch!",
    to: "#mychannel",
  },
}
```

## Seguridad y operaciones

- **Trate los tokens como contraseñas** — Nunca confirme los tokens en git.
- **Use la actualización automática de tokens** para bots de larga duración.
- **Use listas de permitidos de ID de usuario** en lugar de nombres de usuario para el control de acceso.
- **Monitoree los registros** para ver eventos de actualización de tokens y el estado de la conexión.
- **Cobre los tokens mínimamente** — Solo solicite `chat:read` y `chat:write`.
- **Si se bloquea**: Reinicie la puerta de enlace después de confirmar que ningún otro proceso posee la sesión.

## Límites

- **500 caracteres** por mensaje (fragmentado automáticamente en los límites de las palabras).
- El Markdown se elimina antes de la fragmentación.
- Sin limitación de velocidad (utiliza los límites de velocidad integrados de Twitch).

## Relacionado

- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesión para mensajes
- [Descripción general de canales](/es/channels) — todos los canales compatibles
- [Grupos](/es/channels/groups) — comportamiento del chat grupal y restricción de menciones
- [Emparejamiento](/es/channels/pairing) — autenticación de mensajes directos y flujo de emparejamiento
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento
