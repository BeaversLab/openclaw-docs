---
summary: "Configuración y configuración del bot de chat de Twitch"
read_when:
  - Setting up Twitch chat integration for OpenClaw
title: "Twitch"
---

# Twitch (plugin)

Soporte de chat de Twitch mediante conexión IRC. OpenClaw se conecta como usuario de Twitch (cuenta de bot) para recibir y enviar mensajes en los canales.

## Plugin requerido

Twitch se distribuye como un plugin y no se incluye con la instalación principal.

Instalar mediante CLI (registro npm):

```bash
openclaw plugins install @openclaw/twitch
```

Repositorio local (al ejecutar desde un repositorio git):

```bash
openclaw plugins install ./extensions/twitch
```

Detalles: [Plugins](/es/tools/plugin)

## Configuración rápida (principiante)

1. Cree una cuenta de Twitch dedicada para el bot (o use una cuenta existente).
2. Genere credenciales: [Twitch Token Generator](https://twitchtokengenerator.com/)
   - Seleccione **Bot Token**
   - Verifique que los alcances `chat:read` y `chat:write` estén seleccionados
   - Copie el **Client ID** y el **Access Token**
3. Encuentre su ID de usuario de Twitch: [https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/)
4. Configure el token:
   - Entorno: `OPENCLAW_TWITCH_ACCESS_TOKEN=...` (solo cuenta predeterminada)
   - O configuración: `channels.twitch.accessToken`
   - Si se establecen ambos, la configuración tiene prioridad (el respaldo del entorno es solo para la cuenta predeterminada).
5. Inicie la puerta de enlace.

**⚠️ Importante:** Agregue control de acceso (`allowFrom` o `allowedRoles`) para evitar que usuarios no autorizados activen el bot. `requireMention` por defecto es `true`.

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

- Un canal de Twitch propiedad de la Puerta de enlace.
- Enrutamiento determinista: las respuestas siempre regresan a Twitch.
- Cada cuenta se asigna a una clave de sesión aislada `agent:<agentId>:twitch:<accountName>`.
- `username` es la cuenta del bot (quien se autentica), `channel` es a qué sala de chat unirse.

## Configuración (detallada)

### Generar credenciales

Use [Twitch Token Generator](https://twitchtokengenerator.com/):

- Seleccione **Bot Token**
- Verifique que los alcances `chat:read` y `chat:write` estén seleccionados
- Copie el **Client ID** y el **Access Token**

No es necesario registrar manualmente la aplicación. Los tokens caducan después de varias horas.

### Configurar el bot

**Var de entorno (solo cuenta predeterminada):**

```bash
OPENCLAW_TWITCH_ACCESS_TOKEN=oauth:abc123...
```

**O configuración:**

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

Si se establecen tanto el entorno como la configuración, la configuración tiene prioridad.

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

Prefiera `allowFrom` para una lista blanca estricta. Use `allowedRoles` en su lugar si desea un acceso basado en roles.

**Roles disponibles:** `"moderator"`, `"owner"`, `"vip"`, `"subscriber"`, `"all"`.

**¿Por qué ID de usuario?** Los nombres de usuario pueden cambiar, lo que permite la suplantación de identidad. Los ID de usuario son permanentes.

Encuentre su ID de usuario de Twitch: [https://www.streamweasels.com/tools/convert-twitch-username-%20to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-%20to-user-id/) (Convierta su nombre de usuario de Twitch a ID)

## Actualización de token (opcional)

Los tokens de [Twitch Token Generator](https://twitchtokengenerator.com/) no se pueden actualizar automáticamente; regenérelos cuando caduquen.

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

Use `channels.twitch.accounts` con tokens por cuenta. Consulte [`gateway/configuration`](/es/gateway/configuration) para ver el patrón compartido.

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

**Nota:** Cada cuenta necesita su propio token (un token por canal).

## Control de acceso

### Restricciones basadas en roles

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

### Lista blanca por ID de usuario (más seguro)

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

### Acceso basado en roles (alternativa)

`allowFrom` es una lista blanca estricta. Cuando se establece, solo se permiten esos ID de usuario.
Si desea un acceso basado en roles, deje `allowFrom` sin establecer y configure `allowedRoles` en su lugar:

```json5
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowedRoles: ["moderator"],
        },
      },
    },
  },
}
```

### Desactivar el requisito de @mención

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

## Solución de problemas

Primero, ejecute comandos de diagnóstico:

```bash
openclaw doctor
openclaw channels status --probe
```

### El bot no responde a los mensajes

**Verificar el control de acceso:** Asegúrese de que su ID de usuario esté en `allowFrom`, o elimine temporalmente
`allowFrom` y establezca `allowedRoles: ["all"]` para probar.

**Verificar que el bot esté en el canal:** El bot debe unirse al canal especificado en `channel`.

### Problemas de token

**"Error al conectar" o errores de autenticación:**

- Verifique que `accessToken` sea el valor del token de acceso OAuth (generalmente comienza con el prefijo `oauth:`)
- Verifique que el token tenga los ámbitos `chat:read` y `chat:write`
- Si utiliza la actualización del token, verifique que `clientSecret` y `refreshToken` estén configurados

### La actualización del token no funciona

**Revise los registros para ver eventos de actualización:**

```
Using env token source for mybot
Access token refreshed for user 123456 (expires in 14400s)
```

Si ve "token refresh disabled (no refresh token)":

- Asegúrese de que se proporcione `clientSecret`
- Asegúrese de que se proporcione `refreshToken`

## Configuración

**Configuración de cuenta:**

- `username` - Nombre de usuario del bot
- `accessToken` - Token de acceso OAuth con `chat:read` y `chat:write`
- `clientId` - ID de cliente de Twitch (del Generador de tokens o su aplicación)
- `channel` - Canal al que unirse (obligatorio)
- `enabled` - Habilitar esta cuenta (predeterminado: `true`)
- `clientSecret` - Opcional: Para la actualización automática del token
- `refreshToken` - Opcional: Para la actualización automática del token
- `expiresIn` - Expiración del token en segundos
- `obtainmentTimestamp` - Marca de tiempo de obtención del token
- `allowFrom` - Lista de permitidos de ID de usuario
- `allowedRoles` - Control de acceso basado en roles (`"moderator" | "owner" | "vip" | "subscriber" | "all"`)
- `requireMention` - Requerir @mención (predeterminado: `true`)

**Opciones del proveedor:**

- `channels.twitch.enabled` - Habilitar/deshabilitar el inicio del canal
- `channels.twitch.username` - Nombre de usuario del bot (configuración simplificada de cuenta única)
- `channels.twitch.accessToken` - Token de acceso OAuth (configuración simplificada de cuenta única)
- `channels.twitch.clientId` - ID de cliente de Twitch (configuración simplificada de cuenta única)
- `channels.twitch.channel` - Canal al que unirse (configuración simplificada de cuenta única)
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

## Acciones de herramientas

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

- **Trata los tokens como contraseñas** - Nunca guardes tokens en git
- **Usa la actualización automática de tokens** para bots de larga duración
- **Usa listas de permitidos de ID de usuario** en lugar de nombres de usuario para el control de acceso
- **Supervisa los registros** para ver eventos de actualización de tokens y el estado de la conexión
- **Limita el alcance de los tokens al mínimo** - Solo solicita `chat:read` y `chat:write`
- **Si te bloqueas**: Reinicia la pasarela después de confirmar que ningún otro proceso es dueño de la sesión

## Límites

- **500 caracteres** por mensaje (divididos automáticamente en los límites de las palabras)
- Se elimina el formato Markdown antes de dividir
- Sin limitación de velocidad (usa los límites de velocidad integrados de Twitch)

import es from "/components/footer/es.mdx";

<es />
