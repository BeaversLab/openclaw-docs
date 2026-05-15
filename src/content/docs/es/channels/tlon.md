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

Si estás en una versión antigua o en una instalación personalizada que excluye Tlon, instala un
paquete npm actual:

Instalar a través de CLI (registro npm):

```bash
openclaw plugins install @openclaw/tlon
```

Usa el paquete básico para seguir la etiqueta oficial de lanzamiento actual. Fija una versión
exacta solo cuando necesites una instalación reproducible.

Checkout local (cuando se ejecuta desde un repositorio git):

```bash
openclaw plugins install ./path/to/local/tlon-plugin
```

Detalles: [Plugins](/es/tools/plugin)

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

Aceptar automáticamente invitaciones de grupo de naves de confianza:

```json5
{
  channels: {
    tlon: {
      autoAcceptGroupInvites: true,
      groupInviteAllowlist: ["~zod"],
    },
  },
}
```

`autoAcceptGroupInvites` falla en modo cerrado cuando `groupInviteAllowlist` está vacío. Establezca la
lista de permitidos (allowlist) a las naves cuyas invitaciones de grupo deben aceptarse automáticamente.

## Objetivos de entrega (CLI/cron)

Usa estos con `openclaw message send` o entrega por cron:

- MD: `~sampel-palnet` o `dm/~sampel-palnet`
- Grupo: `chat/~host-ship/channel` o `group:~host-ship/channel`

## Habilidad incluida (Bundled skill)

El complemento Tlon incluye una habilidad incluida ([`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill))
que proporciona acceso CLI a las operaciones de Tlon:

- **Contactos**: obtener/actualizar perfiles, listar contactos
- **Canales**: listar, crear, publicar mensajes, obtener historial
- **Grupos**: listar, crear, administrar miembros
- **MDs**: enviar mensajes, reaccionar a mensajes
- **Reacciones**: agregar/eliminar reacciones de emoji en publicaciones y MDs
- **Configuración**: gestionar permisos del complemento mediante comandos de barra

La habilidad está disponible automáticamente cuando se instala el complemento.

## Capacidades

| Característica    | Estado                                               |
| ----------------- | ---------------------------------------------------- |
| Mensajes directos | ✅ Compatible                                        |
| Grupos/canales    | ✅ Compatible (limitado a mención por defecto)       |
| Hilos             | ✅ Compatible (respuestas automáticas en hilo)       |
| Texto enriquecido | ✅ Markdown convertido al formato Tlon               |
| Imágenes          | ✅ Cargadas al almacenamiento de Tlon                |
| Reacciones        | ✅ Vía [habilidad incluida](#bundled-skill)          |
| Encuestas         | ❌ Aún no compatible                                 |
| Comandos nativos  | ✅ Compatible (solo para el propietario por defecto) |

## Solución de problemas

Ejecuta primero esta ladder:

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

Fallos comunes:

- **MDs ignorados**: el remitente no está en `dmAllowlist` y no hay `ownerShip` configurado para el flujo de aprobación.
- **Mensajes de grupo ignorados**: canal no descubierto o remitente no autorizado.
- **Errores de conexión**: verifica que la URL de la nave sea accesible; habilita `allowPrivateNetwork` para naves locales.
- **Errores de autenticación**: verifica que el código de inicio de sesión esté actual (los códigos rotan).

## Referencia de configuración

Configuración completa: [Configuration](/es/gateway/configuration)

Opciones del proveedor:

- `channels.tlon.enabled`: habilitar/deshabilitar el inicio del canal.
- `channels.tlon.ship`: nombre de la nave Urbit del bot (ej. `~sampel-palnet`).
- `channels.tlon.url`: URL de la nave (ej. `https://sampel-palnet.tlon.network`).
- `channels.tlon.code`: código de acceso de la nave.
- `channels.tlon.allowPrivateNetwork`: permitir URLs de localhost/lan (omisión SSRF).
- `channels.tlon.ownerShip`: nave propietaria para el sistema de aprobación (siempre autorizada).
- `channels.tlon.dmAllowlist`: naves autorizadas para enviar MD (vacío = ninguna).
- `channels.tlon.autoAcceptDmInvites`: aceptar automáticamente MD de naves en la lista permitida.
- `channels.tlon.autoAcceptGroupInvites`: aceptar automáticamente invitaciones de grupo de naves en la lista permitida.
- `channels.tlon.groupInviteAllowlist`: naves cuyas invitaciones de grupo pueden aceptarse automáticamente.
- `channels.tlon.autoDiscoverChannels`: descubrir automáticamente canales de grupo (predeterminado: true).
- `channels.tlon.groupChannels`: nidos de canales fijados manualmente.
- `channels.tlon.defaultAuthorizedShips`: naves autorizadas para todos los canales.
- `channels.tlon.authorization.channelRules`: reglas de autenticación por canal.
- `channels.tlon.showModelSignature`: añadir el nombre del modelo a los mensajes.

## Notas

- Las respuestas en grupos requieren una mención (ej. `~your-bot-ship`) para responder.
- Respuestas en hilos: si el mensaje entrante está en un hilo, OpenClaw responde en el hilo.
- Texto enriquecido: el formato Markdown (negrita, cursiva, código, encabezados, listas) se convierte al formato nativo de Tlon.
- Imágenes: las URLs se suben al almacenamiento de Tlon y se incrustan como bloques de imagen.

## Relacionado

- [Resumen de canales](/es/channels) — todos los canales compatibles
- [Emparejamiento](/es/channels/pairing) — autenticación de MD y flujo de emparejamiento
- [Grupos](/es/channels/groups) — comportamiento del chat grupal y restricción de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y fortalecimiento
