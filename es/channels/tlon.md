---
summary: "Estado de soporte de Tlon/Urbit, capacidades y configuración"
read_when:
  - Working on Tlon/Urbit channel features
title: "Tlon"
---

# Tlon (plugin)

Tlon es un mensajero descentralizado construido sobre Urbit. OpenClaw se conecta a tu nave Urbit y puede
responder a MDs y mensajes de chat de grupo. Las respuestas en grupo requieren una mención @ por defecto y pueden
restringirse aún más mediante listas permitidas.

Estado: soportado a través de un plugin. Los MDs, menciones de grupo, respuestas de hilos, formato de texto enriquecido y
las cargas de imágenes son compatibles. Las reacciones y las encuestas aún no son compatibles.

## Plugin requerido

Tlon se distribuye como un plugin y no se incluye con la instalación principal.

Instalar a través de CLI (registro npm):

```bash
openclaw plugins install @openclaw/tlon
```

Copia local (cuando se ejecuta desde un repositorio git):

```bash
openclaw plugins install ./extensions/tlon
```

Detalles: [Plugins](/es/tools/plugin)

## Configuración

1. Instale el plugin Tlon.
2. Reúna la URL de su nave y su código de inicio de sesión.
3. Configure `channels.tlon`.
4. Reinicie la pasarela (gateway).
5. Envíe un MD al bot o menciónelo en un canal de grupo.

Configuración mínima (cuenta única):

```json5
{
  channels: {
    tlon: {
      enabled: true,
      ship: "~sampel-palnet",
      url: "https://your-ship-host",
      code: "lidlut-tabwed-pillex-ridrup",
      ownerShip: "~your-main-ship", // recommended: your ship, always allowed
    },
  },
}
```

## Naves privadas/de LAN

De forma predeterminada, OpenClaw bloquea nombres de host privados/internos y rangos de IP para la protección SSRF.
Si su nave se está ejecutando en una red privada (localhost, IP de LAN o nombre de host interno),
debe optar explícitamente por participar:

```json5
{
  channels: {
    tlon: {
      url: "http://localhost:8080",
      allowPrivateNetwork: true,
    },
  },
}
```

Esto se aplica a URL como:

- `http://localhost:8080`
- `http://192.168.x.x:8080`
- `http://my-ship.local:8080`

⚠️ Solo habilite esto si confía en su red local. Esta configuración desactiva las protecciones SSRF
para las solicitudes a la URL de su nave.

## Canales de grupo

El descubrimiento automático está habilitado de forma predeterminada. También puede fijar canales manualmente:

```json5
{
  channels: {
    tlon: {
      groupChannels: ["chat/~host-ship/general", "chat/~host-ship/support"],
    },
  },
}
```

Desactivar el descubrimiento automático:

```json5
{
  channels: {
    tlon: {
      autoDiscoverChannels: false,
    },
  },
}
```

## Control de acceso

Lista permitida de MD (vacío = no se permiten MD, use `ownerShip` para el flujo de aprobación):

```json5
{
  channels: {
    tlon: {
      dmAllowlist: ["~zod", "~nec"],
    },
  },
}
```

Autorización de grupo (restringido de forma predeterminada):

```json5
{
  channels: {
    tlon: {
      defaultAuthorizedShips: ["~zod"],
      authorization: {
        channelRules: {
          "chat/~host-ship/general": {
            mode: "restricted",
            allowedShips: ["~zod", "~nec"],
          },
          "chat/~host-ship/announcements": {
            mode: "open",
          },
        },
      },
    },
  },
}
```

## Sistema de propietario y aprobación

Establezca una nave propietaria para recibir solicitudes de aprobación cuando usuarios no autorizados intenten interactuar:

```json5
{
  channels: {
    tlon: {
      ownerShip: "~your-main-ship",
    },
  },
}
```

La nave propietaria está **autorizada automáticamente en todas partes**: las invitaciones de MD se aceptan automáticamente y
los mensajes de canal siempre están permitidos. No necesita agregar al propietario a `dmAllowlist` o
`defaultAuthorizedShips`.

Cuando se establece, el propietario recibe notificaciones de MD para:

- Solicitudes de MD de naves que no están en la lista permitida
- Menciones en canales sin autorización
- Solicitudes de invitación de grupo

## Configuración de aceptación automática

Aceptar automáticamente invitaciones de DM (para naves en dmAllowlist):

```json5
{
  channels: {
    tlon: {
      autoAcceptDmInvites: true,
    },
  },
}
```

Aceptar automáticamente invitaciones de grupo:

```json5
{
  channels: {
    tlon: {
      autoAcceptGroupInvites: true,
    },
  },
}
```

## Objetivos de entrega (CLI/cron)

Utilice estos con `openclaw message send` o entrega por cron:

- DM: `~sampel-palnet` o `dm/~sampel-palnet`
- Grupo: `chat/~host-ship/channel` o `group:~host-ship/channel`

## Habilidad incluida

El complemento Tlon incluye una habilidad incluida ([`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill))
que proporciona acceso por CLI a las operaciones de Tlon:

- **Contactos**: obtener/actualizar perfiles, listar contactos
- **Canales**: listar, crear, publicar mensajes, obtener historial
- **Grupos**: listar, crear, gestionar miembros
- **MD**: enviar mensajes, reaccionar a mensajes
- **Reacciones**: añadir/eliminar reacciones con emojis en publicaciones y MD
- **Configuración**: gestionar permisos del complemento mediante comandos de barra

La habilidad está disponible automáticamente cuando se instala el complemento.

## Capacidades

| Funcionalidad     | Estado                                              |
| ----------------- | --------------------------------------------------- |
| Mensajes directos | ✅ Compatible                                       |
| Grupos/canales    | ✅ Compatible (restringido a menciones por defecto) |
| Hilos             | ✅ Compatible (respuestas automáticas en el hilo)   |
| Texto enriquecido | ✅ Markdown convertido al formato de Tlon           |
| Imágenes          | ✅ Subidas al almacenamiento de Tlon                |
| Reacciones        | ✅ Vía [habilidad incluida](#bundled-skill)         |
| Encuestas         | ❌ Aún no compatible                                |
| Comandos nativos  | ✅ Compatible (solo propietario por defecto)        |

## Solución de problemas

Ejecute primero esta escalera:

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

Fallos comunes:

- **MD ignorados**: remitente no en `dmAllowlist` y no hay `ownerShip` configurado para el flujo de aprobación.
- **Mensajes de grupo ignorados**: canal no descubierto o remitente no autorizado.
- **Errores de conexión**: verifique que la URL de la nave sea accesible; habilite `allowPrivateNetwork` para naves locales.
- **Errores de autenticación**: verifique que el código de inicio de sesión esté actualizado (los códigos rotan).

## Referencia de configuración

Configuración completa: [Configuración](/es/gateway/configuration)

Opciones del proveedor:

- `channels.tlon.enabled`: habilitar/deshabilitar el inicio del canal.
- `channels.tlon.ship`: nombre de la nave Urbit del bot (p. ej., `~sampel-palnet`).
- `channels.tlon.url`: URL de la nave (p. ej., `https://sampel-palnet.tlon.network`).
- `channels.tlon.code`: código de inicio de sesión de la nave.
- `channels.tlon.allowPrivateNetwork`: permitir URLs de localhost/LAN (omisión de SSRF).
- `channels.tlon.ownerShip`: nave propietaria para el sistema de aprobación (siempre autorizada).
- `channels.tlon.dmAllowlist`: naves permitidas para enviar MD (vacío = ninguna).
- `channels.tlon.autoAcceptDmInvites`: aceptar automáticamente MD de naves en la lista de permitidos.
- `channels.tlon.autoAcceptGroupInvites`: aceptar automáticamente todas las invitaciones de grupo.
- `channels.tlon.autoDiscoverChannels`: descubrir automáticamente canales de grupo (predeterminado: true).
- `channels.tlon.groupChannels`: nidos de canales fijados manualmente.
- `channels.tlon.defaultAuthorizedShips`: naves autorizadas para todos los canales.
- `channels.tlon.authorization.channelRules`: reglas de autenticación por canal.
- `channels.tlon.showModelSignature`: agregar nombre del modelo a los mensajes.

## Notas

- Las respuestas en el grupo requieren una mención (ej. `~your-bot-ship`) para responder.
- Respuestas en hilos: si el mensaje entrante está en un hilo, OpenClaw responde en el hilo.
- Texto enriquecido: el formato Markdown (negrita, cursiva, código, encabezados, listas) se convierte al formato nativo de Tlon.
- Imágenes: las URL se cargan en el almacenamiento de Tlon y se incrustan como bloques de imagen.

import es from "/components/footer/es.mdx";

<es />
