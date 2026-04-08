---
summary: "Estado de soporte de Tlon/Urbit, capacidades y configuración"
read_when:
  - Working on Tlon/Urbit channel features
title: "Tlon"
---

# Tlon

Tlon es un mensajero descentralizado construido sobre Urbit. OpenClaw se conecta a tu nave Urbit y puede
responder a MDs y mensajes de chat de grupo. Las respuestas en grupo requieren una mención @ por defecto y pueden
restringirse aún más mediante listas permitidas.

Estado: plugin incluido. Se admiten MD, menciones de grupo, respuestas de hilos, formato de texto enriquecido y carga de imágenes. Las reacciones y las encuestas aún no están compatibles.

## Plugin incluido

Tlon se envía como un plugin incluido en las versiones actuales de OpenClaw, por lo que las compilaciones empaquetadas normales no necesitan una instalación separada.

Si está en una compilación anterior o en una instalación personalizada que excluye Tlon, instálelo manualmente:

Instalar a través de CLI (registro npm):

```bash
openclaw plugins install @openclaw/tlon
```

Checkout local (cuando se ejecuta desde un repositorio git):

```bash
openclaw plugins install ./path/to/local/tlon-plugin
```

Detalles: [Plugins](/en/tools/plugin)

## Configuración

1. Asegúrese de que el plugin Tlon esté disponible.
   - Las versiones empaquetadas actuales de OpenClaw ya lo incluyen.
   - Las instalaciones antiguas/personalizadas pueden agregarlo manualmente con los comandos anteriores.
2. Reúna la URL de su nave y su código de inicio de sesión.
3. Configure `channels.tlon`.
4. Reinicie la puerta de enlace.
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

Por defecto, OpenClaw bloquea hostnames privados/internos y rangos de IP para protección SSRF.
Si tu nave se está ejecutando en una red privada (localhost, IP de LAN o hostname interno),
debes optar explícitamente por aceptarlo:

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

Esto se aplica a URLs como:

- `http://localhost:8080`
- `http://192.168.x.x:8080`
- `http://my-ship.local:8080`

⚠️ Solo habilita esto si confías en tu red local. Esta configuración deshabilita las protecciones SSRF
para las solicitudes a la URL de tu nave.

## Canales de grupo

El descubrimiento automático está habilitado por defecto. También puedes fijar canales manualmente:

```json5
{
  channels: {
    tlon: {
      groupChannels: ["chat/~host-ship/general", "chat/~host-ship/support"],
    },
  },
}
```

Deshabilitar descubrimiento automático:

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

Lista de permitidos de DM (vacío = no se permiten DMs, usa `ownerShip` para el flujo de aprobación):

```json5
{
  channels: {
    tlon: {
      dmAllowlist: ["~zod", "~nec"],
    },
  },
}
```

Autorización de grupo (restringido por defecto):

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

## Propietario y sistema de aprobación

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

El propietario (owner ship) está **automáticamente autorizado en todas partes**: las invitaciones de MD se aceptan automáticamente y los mensajes de canal siempre están permitidos. No es necesario agregar al propietario a `dmAllowlist` o `defaultAuthorizedShips`.

Cuando se configura, el propietario recibe notificaciones de MD para:

- Solicitudes de MD de barcos (ships) que no están en la lista de permitidos
- Menciones en canales sin autorización
- Solicitudes de invitación a grupos

## Configuración de aceptación automática

Aceptar automáticamente invitaciones de MD (para barcos en dmAllowlist):

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

Use estos con `openclaw message send` o entrega por cron:

- MD: `~sampel-palnet` o `dm/~sampel-palnet`
- Grupo: `chat/~host-ship/channel` o `group:~host-ship/channel`

## Habilidad (skill) incluida

El complemento Tlon incluye una habilidad integrada ([`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill))
que proporciona acceso a la CLI para las operaciones de Tlon:

- **Contactos**: obtener/actualizar perfiles, listar contactos
- **Canales**: listar, crear, publicar mensajes, obtener historial
- **Grupos**: listar, crear, gestionar miembros
- **MDs**: enviar mensajes, reaccionar a mensajes
- **Reacciones**: añadir/eliminar reacciones de emoji en publicaciones y MDs
- **Configuración**: gestionar permisos del complemento mediante comandos de barra

La habilidad está disponible automáticamente cuando se instala el complemento.

## Capacidades

| Característica    | Estado                                                          |
| ----------------- | --------------------------------------------------------------- |
| Mensajes directos | ✅ Compatible                                                   |
| Grupos/canales    | ✅ Compatible (restringido a menciones por defecto)             |
| Hilos             | ✅ Compatible (respuestas automáticas en el hilo)               |
| Texto enriquecido | ✅ Markdown convertido al formato de Tlon                       |
| Imágenes          | ✅ Cargadas en el almacenamiento de Tlon                        |
| Reacciones        | ✅ A través de [habilidad integrada](#bundled-skill)            |
| Encuestas         | ❌ Aún no compatible                                            |
| Comandos nativos  | ✅ Soportado (solo para el propietario de forma predeterminada) |

## Solución de problemas

Ejecute primero esta escala:

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

Fallos comunes:

- **MD ignorados**: remitente no en `dmAllowlist` y ningún `ownerShip` configurado para el flujo de aprobación.
- **Mensajes de grupo ignorados**: canal no descubierto o remitente no autorizado.
- **Errores de conexión**: verifique que la URL del barco sea accesible; habilite `allowPrivateNetwork` para barcos locales.
- **Errores de autenticación**: verifique que el código de inicio de sesión esté actualizado (los códigos rotan).

## Referencia de configuración

Configuración completa: [Configuración](/en/gateway/configuration)

Opciones del proveedor:

- `channels.tlon.enabled`: habilitar/deshabilitar el inicio del canal.
- `channels.tlon.ship`: nombre del barco Urbit del bot (p. ej., `~sampel-palnet`).
- `channels.tlon.url`: URL del barco (p. ej., `https://sampel-palnet.tlon.network`).
- `channels.tlon.code`: código de acceso de la nave.
- `channels.tlon.allowPrivateNetwork`: permitir URLs de localhost/LAN (omisión SSRF).
- `channels.tlon.ownerShip`: nave propietaria para el sistema de aprobación (siempre autorizada).
- `channels.tlon.dmAllowlist`: naves autorizadas para enviar MD (vacío = ninguna).
- `channels.tlon.autoAcceptDmInvites`: aceptar automáticamente MD de naves en la lista de permitidos.
- `channels.tlon.autoAcceptGroupInvites`: aceptar automáticamente todas las invitaciones a grupos.
- `channels.tlon.autoDiscoverChannels`: descubrir automáticamente canales de grupo (predeterminado: true).
- `channels.tlon.groupChannels`: nidos de canales fijados manualmente.
- `channels.tlon.defaultAuthorizedShips`: naves autorizadas para todos los canales.
- `channels.tlon.authorization.channelRules`: reglas de autenticación por canal.
- `channels.tlon.showModelSignature`: añadir el nombre del modelo a los mensajes.

## Notas

- Las respuestas grupales requieren una mención (p. ej. `~your-bot-ship`) para responder.
- Respuestas de hilos: si el mensaje entrante está en un hilo, OpenClaw responde en el hilo.
- Texto enriquecido: el formato Markdown (negrita, cursiva, código, encabezados, listas) se convierte al formato nativo de Tlon.
- Imágenes: las URL se cargan en el almacenamiento de Tlon y se insertan como bloques de imagen.

## Relacionado

- [Resumen de canales](/en/channels) — todos los canales compatibles
- [Emparejamiento](/en/channels/pairing) — autenticación de DM y flujo de emparejamiento
- [Grupos](/en/channels/groups) — comportamiento del chat de grupo y control de menciones
- [Enrutamiento de canales](/en/channels/channel-routing) — enrutamiento de sesión para mensajes
- [Seguridad](/en/gateway/security) — modelo de acceso y endurecimiento
