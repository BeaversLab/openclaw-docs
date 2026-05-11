---
summary: "Estado de soporte de Tlon/Urbit, capacidades y configuración"
read_when:
  - Working on Tlon/Urbit channel features
title: "Tlon"
---

Tlon es un mensajero descentralizado construido sobre Urbit. OpenClaw se conecta a tu nave Urbit y puede
responder a MDs y mensajes de chat de grupo. Las respuestas en grupo requieren una mención @ de forma predeterminada y pueden
restringirse aún más mediante listas de permitidos.

Estado: complemento incluido. Los MDs, las menciones de grupo, las respuestas de hilos, el formato de texto enriquecido y
las cargas de imágenes son compatibles. Las reacciones y las encuestas aún no son compatibles.

## Complemento incluido

Tlon se distribuye como un complemento incluido en las versiones actuales de OpenClaw, por lo que las compilaciones
empaquetadas normales no necesitan una instalación por separado.

Si estás en una compilación antigua o una instalación personalizada que excluye Tlon, instálalo
manualmente:

Instalar a través de CLI (registro npm):

```bash
openclaw plugins install @openclaw/tlon
```

Copia local (cuando se ejecuta desde un repositorio git):

```bash
openclaw plugins install ./path/to/local/tlon-plugin
```

Detalles: [Plugins](/es/tools/plugin)

## Configuración

1. Asegúrate de que el complemento Tlon esté disponible.
   - Las versiones empaquetadas actuales de OpenClaw ya lo incluyen.
   - Las instalaciones antiguas/personalizadas pueden agregarlo manualmente con los comandos anteriores.
2. Reúne la URL de tu nave y tu código de acceso.
3. Configura `channels.tlon`.
4. Reinicia la puerta de enlace.
5. Envía un MD al bot o menciónalo en un canal de grupo.

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

De forma predeterminada, OpenClaw bloquea los nombres de host privados/internos y los rangos de IP para la protección SSRF.
Si tu nave se está ejecutando en una red privada (localhost, IP de LAN o nombre de host interno),
debes optar explícitamente por participar:

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

⚠️ Solo activa esto si confías en tu red local. Esta configuración desactiva las protecciones SSRF
para las solicitudes a la URL de tu nave.

## Canales de grupo

El descubrimiento automático está habilitado de forma predeterminada. También puedes fijar canales manualmente:

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

Lista de permitidos para MD (vacío = no se permiten MD, usa `ownerShip` para el flujo de aprobación):

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

Establece una nave propietaria para recibir solicitudes de aprobación cuando usuarios no autorizados intenten interactuar:

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
los mensajes de canal siempre están permitidos. No necesitas agregar al propietario a `dmAllowlist` o
`defaultAuthorizedShips`.

Cuando se establece, el propietario recibe notificaciones de MD para:

- Solicitudes de MD de naves que no están en la lista de permitidos
- Menciones en canales sin autorización
- Solicitudes de invitación a grupos

## Configuración de aceptación automática

Aceptar automáticamente invitaciones de MD (para naves en dmAllowlist):

```json5
{
  channels: {
    tlon: {
      autoAcceptDmInvites: true,
    },
  },
}
```

Aceptar automáticamente invitaciones de grupos:

```json5
{
  channels: {
    tlon: {
      autoAcceptGroupInvites: true,
    },
  },
}
```

## Destinos de entrega (CLI/cron)

Úsalos con `openclaw message send` o entrega por cron:

- MD: `~sampel-palnet` o `dm/~sampel-palnet`
- Grupo: `chat/~host-ship/channel` o `group:~host-ship/channel`

## Habilidad incluida

El complemento Tlon incluye una habilidad incluida ([`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill))
que proporciona acceso a la CLI para las operaciones de Tlon:

- **Contactos**: obtener/actualizar perfiles, listar contactos
- **Canales**: listar, crear, publicar mensajes, obtener historial
- **Grupos**: listar, crear, gestionar miembros
- **MD**: enviar mensajes, reaccionar a mensajes
- **Reacciones**: añadir/eliminar reacciones con emojis en publicaciones y MD
- **Configuración**: gestionar permisos del complemento mediante comandos de barra

La habilidad está disponible automáticamente cuando se instala el complemento.

## Capacidades

| Característica    | Estado                                                 |
| ----------------- | ------------------------------------------------------ |
| Mensajes directos | ✅ Soportado                                           |
| Grupos/canales    | ✅ Soportado (restringido a menciones por defecto)     |
| Hilos             | ✅ Soportado (respuestas automáticas en el hilo)       |
| Texto enriquecido | ✅ Markdown convertido al formato de Tlon              |
| Imágenes          | ✅ Subidas al almacenamiento de Tlon                   |
| Reacciones        | ✅ A través de la [habilidad incluida](#bundled-skill) |
| Encuestas         | ❌ Aún no soportado                                    |
| Comandos nativos  | ✅ Soportado (solo propietario por defecto)            |

## Solución de problemas

Ejecuta primero este escalera:

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

Fallos comunes:

- **MD ignorados**: remitente no en `dmAllowlist` y ningún `ownerShip` configurado para el flujo de aprobación.
- **Mensajes de grupo ignorados**: canal no descubierto o remitente no autorizado.
- **Errores de conexión**: verifica que la URL del barco sea accesible; habilita `allowPrivateNetwork` para barcos locales.
- **Errores de autenticación**: verifica que el código de inicio de sesión esté actual (los códigos rotan).

## Referencia de configuración

Configuración completa: [Configuración](/es/gateway/configuration)

Opciones del proveedor:

- `channels.tlon.enabled`: habilitar/deshabilitar el inicio del canal.
- `channels.tlon.ship`: nombre del barco Urbit del bot (ej. `~sampel-palnet`).
- `channels.tlon.url`: URL del barco (ej. `https://sampel-palnet.tlon.network`).
- `channels.tlon.code`: código de inicio de sesión del barco.
- `channels.tlon.allowPrivateNetwork`: permitir URLs de localhost/LAN (omisión SSRF).
- `channels.tlon.ownerShip`: nave propietaria para el sistema de aprobación (siempre autorizada).
- `channels.tlon.dmAllowlist`: naves autorizadas para enviar MD (vacío = ninguna).
- `channels.tlon.autoAcceptDmInvites`: aceptar automáticamente MD de naves en la lista de permitidos.
- `channels.tlon.autoAcceptGroupInvites`: aceptar automáticamente todas las invitaciones a grupos.
- `channels.tlon.autoDiscoverChannels`: descubrir automáticamente los canales de grupo (por defecto: true).
- `channels.tlon.groupChannels`: nidos de canales fijados manualmente.
- `channels.tlon.defaultAuthorizedShips`: naves autorizadas para todos los canales.
- `channels.tlon.authorization.channelRules`: reglas de autenticación por canal.
- `channels.tlon.showModelSignature`: añadir el nombre del modelo a los mensajes.

## Notas

- Las respuestas grupales requieren una mención (ej. `~your-bot-ship`) para responder.
- Respuestas en hilos: si el mensaje entrante está en un hilo, OpenClaw responde en el hilo.
- Texto enriquecido: el formato Markdown (negrita, cursiva, código, encabezados, listas) se convierte al formato nativo de Tlon.
- Imágenes: las URL se cargan en el almacenamiento de Tlon y se incrustan como bloques de imagen.

## Relacionado

- [Resumen de canales](/es/channels) — todos los canales compatibles
- [Emparejamiento](/es/channels/pairing) — autenticación de MD y flujo de emparejamiento
- [Grupos](/es/channels/groups) — comportamiento del chat grupal y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y fortalecimiento
