---
summary: "Canal DM de Nostr a través de mensajes cifrados NIP-04"
read_when:
  - You want OpenClaw to receive DMs via Nostr
  - You're setting up decentralized messaging
title: "Nostr"
---

# Nostr

**Estado:** Plugin incluido opcional (desactivado por defecto hasta que se configure).

Nostr es un protocolo descentralizado para redes sociales. Este canal permite a OpenClaw recibir y responder a mensajes directos cifrados (DM) a través de NIP-04.

## Plugin incluido

Las versiones actuales de OpenClaw incluyen Nostr como un plugin empaquetado, por lo que las construcciones empaquetadas normales no necesitan una instalación separada.

### Instalaciones antiguas/personalizadas

- Onboarding (`openclaw onboard`) y `openclaw channels add` todavía muestran
  Nostr desde el catálogo de canales compartido.
- Si su compilación excluye el Nostr incluido, instálelo manualmente.

```bash
openclaw plugins install @openclaw/nostr
```

Use una copia local (flujos de trabajo de desarrollo):

```bash
openclaw plugins install --link <path-to-local-nostr-plugin>
```

Reinicie el Gateway después de instalar o habilitar plugins.

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

2. Añadir a la configuración:

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
    },
  },
}
```

3. Exportar la clave:

```bash
export NOSTR_PRIVATE_KEY="nsec1..."
```

4. Reinicie el Gateway.

## Referencia de configuración

| Clave        | Tipo     | Por defecto                                 | Descripción                                   |
| ------------ | -------- | ------------------------------------------- | --------------------------------------------- |
| `privateKey` | string   | requerido                                   | Clave privada en formato `nsec` o hexadecimal |
| `relays`     | string[] | `['wss://relay.damus.io', 'wss://nos.lol']` | URLs de Relay (WebSocket)                     |
| `dmPolicy`   | string   | `pairing`                                   | Política de acceso de DM                      |
| `allowFrom`  | string[] | `[]`                                        | Claves públicas de remitentes permitidos      |
| `enabled`    | boolean  | `true`                                      | Habilitar/deshabilitar canal                  |
| `name`       | string   | -                                           | Nombre para mostrar                           |
| `profile`    | object   | -                                           | Metadatos de perfil NIP-01                    |

## Metadatos del perfil

Los datos del perfil se publican como un evento NIP-01 `kind:0`. Puede gestionarlo desde la UI de Control (Canales -> Nostr -> Perfil) o establecerlo directamente en la configuración.

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

- Las URL de perfil deben usar `https://`.
- La importación desde relays fusiona los campos y conserva las anulaciones locales.

## Control de acceso

### Políticas de DM

- **pairing** (por defecto): los remitentes desconocidos reciben un código de emparejamiento.
- **allowlist**: solo las claves públicas en `allowFrom` pueden enviar DM.
- **open**: DM entrantes públicos (requiere `allowFrom: ["*"]`).
- **disabled**: ignorar DM entrantes.

Notas de cumplimiento:

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

## Relés

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

- Use 2-3 relés para redundancia.
- Evite demasiados relés (latencia, duplicación).
- Los relés de pago pueden mejorar la confiabilidad.
- Los relés locales son adecuados para pruebas (`ws://localhost:7777`).

## Soporte de protocolo

| NIP    | Estado      | Descripción                                     |
| ------ | ----------- | ----------------------------------------------- |
| NIP-01 | Soportado   | Formato básico de eventos + metadatos de perfil |
| NIP-04 | Soportado   | MD cifrados (`kind:4`)                          |
| NIP-17 | Planificado | MD envueltos para regalo                        |
| NIP-44 | Planificado | Cifrado con versiones                           |

## Pruebas

### Relé local

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

### No recibir mensajes

- Verifique que la clave privada sea válida.
- Asegúrese de que las URL de los relés sean accesibles y usen `wss://` (o `ws://` para locales).
- Confirme que `enabled` no sea `false`.
- Verifique los registros de Gateway para ver errores de conexión de relé.

### No enviar respuestas

- Compruebe que el relé acepte escrituras.
- Verifique la conectividad saliente.
- Vigile los límites de tasa del relé.

### Respuestas duplicadas

- Esperado al usar múltiples relés.
- Los mensajes se deduplican por ID de evento; solo la primera entrega activa una respuesta.

## Seguridad

- Nunca confirme claves privadas.
- Use variables de entorno para las claves.
- Considere `allowlist` para bots en producción.
- Las firmas se verifican antes que la política del remitente, y la política del remitente se aplica antes del descifrado, por lo que los eventos falsificados se rechazan temprano y los remitentes desconocidos no pueden forzar el trabajo criptográfico completo.

## Limitaciones (MVP)

- Solo mensajes directos (sin chats grupales).
- Sin archivos adjuntos multimedia.
- Solo NIP-04 (envoltorio para regalo NIP-17 planificado).

## Relacionado

- [Descripción general de canales](/es/channels) — todos los canales compatibles
- [Emparejamiento](/es/channels/pairing) — autenticación de MD y flujo de emparejamiento
- [Grupos](/es/channels/groups) — comportamiento del chat de grupo y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento
