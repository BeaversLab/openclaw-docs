---
summary: "Canal DM de Nostr a través de mensajes cifrados NIP-04"
read_when:
  - You want OpenClaw to receive DMs via Nostr
  - You're setting up decentralized messaging
title: "Nostr"
---

**Estado:** Complemento incluido opcional (desactivado de forma predeterminada hasta que se configure).

Nostr es un protocolo descentralizado para redes sociales. Este canal permite que OpenClaw reciba y responda a mensajes directos (DM) encriptados a través de NIP-04.

## Complemento incluido

Las versiones actuales de OpenClaw incluyen Nostr como un complemento incluido, por lo que las compilaciones empaquetadas normales no necesitan una instalación por separado.

### Instalaciones antiguas/personalizadas

- El onboarding (`openclaw onboard`) y `openclaw channels add` todavía muestran
  Nostr desde el catálogo de canales compartido.
- Si su compilación excluye Nostr incluido, instálelo manualmente.

```bash
openclaw plugins install @openclaw/nostr
```

Use una copia local (flujos de trabajo de desarrollo):

```bash
openclaw plugins install --link <path-to-local-nostr-plugin>
```

Reinicie la Gateway después de instalar o activar complementos.

### Configuración no interactiva

```bash
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY" --relay-urls "wss://relay.damus.io,wss://relay.primal.net"
```

Use `--use-env` para mantener `NOSTR_PRIVATE_KEY` en el entorno en lugar de almacenar la clave en la configuración.

## Configuración rápida

1. Genere un par de claves Nostr (si es necesario):

```bash
# Using nak
nak key generate
```

2. Agregue a la configuración:

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
    },
  },
}
```

3. Exporte la clave:

```bash
export NOSTR_PRIVATE_KEY="nsec1..."
```

4. Reinicie la Gateway.

## Referencia de configuración

| Clave        | Tipo     | Predeterminado                              | Descripción                                   |
| ------------ | -------- | ------------------------------------------- | --------------------------------------------- |
| `privateKey` | string   | obligatorio                                 | Clave privada en formato `nsec` o hexadecimal |
| `relays`     | string[] | `['wss://relay.damus.io', 'wss://nos.lol']` | URLs de Relay (WebSocket)                     |
| `dmPolicy`   | string   | `pairing`                                   | Política de acceso a DM                       |
| `allowFrom`  | string[] | `[]`                                        | Claves públicas de remitentes permitidos      |
| `enabled`    | boolean  | `true`                                      | Activar/desactivar canal                      |
| `name`       | string   | -                                           | Nombre para mostrar                           |
| `profile`    | object   | -                                           | Metadatos del perfil NIP-01                   |

## Metadatos del perfil

Los datos del perfil se publican como un evento NIP-01 `kind:0`. Puede gestionarlos desde la interfaz de usuario de Control (Canales -> Nostr -> Perfil) o configurarlos directamente en el archivo de configuración.

Ejemplo:

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      profile: {
        name: "openclaw",
        displayName: "OpenClaw",
        about: "Personal assistant DM bot",
        picture: "https://example.com/avatar.png",
        banner: "https://example.com/banner.png",
        website: "https://example.com",
        nip05: "openclaw@example.com",
        lud16: "openclaw@example.com",
      },
    },
  },
}
```

Notas:

- Las URLs de perfil deben usar `https://`.
- La importación desde relays combina los campos y conserva las anulaciones locales.

## Control de acceso

### Políticas de DM

- **pairing** (predeterminado): los remitentes desconocidos reciben un código de emparejamiento.
- **allowlist**: solo las claves públicas en `allowFrom` pueden enviar DM.
- **open**: DMs entrantes públicos (requiere `allowFrom: ["*"]`).
- **deshabilitado**: ignorar los MD entrantes.

Notas sobre la aplicación:

- Las firmas de eventos entrantes se verifican antes de la política del remitente y el descifrado NIP-04, por lo que los eventos falsificados se rechazan temprano.
- Las respuestas de emparejamiento se envían sin procesar el cuerpo del MD original.
- Los MD entrantes tienen limitación de tasa y las cargas útiles excesivamente grandes se descartan antes del descifrado.

### Ejemplo de lista de permitidos

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      dmPolicy: "allowlist",
      allowFrom: ["npub1abc...", "npub1xyz..."],
    },
  },
}
```

## Formatos de clave

Formatos aceptados:

- **Clave privada:** `nsec...` o hexadecimal de 64 caracteres
- **Claves públicas (`allowFrom`):** `npub...` o hexadecimal

## Repetidores

Predeterminados: `relay.damus.io` y `nos.lol`.

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      relays: ["wss://relay.damus.io", "wss://relay.primal.net", "wss://nostr.wine"],
    },
  },
}
```

Consejos:

- Use 2-3 repetidores para redundancia.
- Evite demasiados repetidores (latencia, duplicación).
- Los repetidores de pago pueden mejorar la confiabilidad.
- Los repetidores locales funcionan bien para pruebas (`ws://localhost:7777`).

## Soporte de protocolo

| NIP    | Estado      | Descripción                                    |
| ------ | ----------- | ---------------------------------------------- |
| NIP-01 | Compatible  | Formato de evento básico + metadatos de perfil |
| NIP-04 | Compatible  | MD cifrados (`kind:4`)                         |
| NIP-17 | Planificado | MD envueltos (gift-wrapped)                    |
| NIP-44 | Planificado | Cifrado con versiones                          |

## Pruebas

### Repetidor local

```bash
# Start strfry
docker run -p 7777:7777 ghcr.io/hoytech/strfry
```

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      relays: ["ws://localhost:7777"],
    },
  },
}
```

### Prueba manual

1. Anote la clave pública del bot (npub) de los registros.
2. Abra un cliente de Nostr (Damus, Amethyst, etc.).
3. Envíe un MD a la clave pública del bot.
4. Verifique la respuesta.

## Solución de problemas

### No se reciben mensajes

- Verifique que la clave privada sea válida.
- Asegúrese de que las URL de los repetidores sean accesibles y usen `wss://` (o `ws://` para local).
- Confirme que `enabled` no sea `false`.
- Revise los registros de la Gateway en busca de errores de conexión al repetidor.

### No se envían respuestas

- Compruebe que el repetidor acepte escrituras.
- Verifique la conectividad de salida.
- Vigile las limitaciones de tasa del repetidor.

### Respuestas duplicadas

- Esperado al usar múltiples repetidores.
- Los mensajes se deduplican por ID de evento; solo la primera entrega activa una respuesta.

## Seguridad

- Nunca confirme claves privadas.
- Use variables de entorno para las claves.
- Considere `allowlist` para bots en producción.
- Las firmas se verifican antes que la política del remitente, y la política del remitente se aplica antes del descifrado, por lo que los eventos falsificados se rechazan temprano y los remitentes desconocidos no pueden forzar el trabajo criptográfico completo.

## Limitaciones (MVP)

- Solo mensajes directos (sin chats grupales).
- Sin archivos adjuntos multimedia.
- Solo NIP-04 (se planea NIP-17 gift-wrap).

## Relacionado

- [Resumen de canales](/es/channels) — todos los canales compatibles
- [Emparejamiento](/es/channels/pairing) — flujo de autenticación y emparejamiento de MD
- [Grupos](/es/channels/groups) — comportamiento del chat de grupo y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento
