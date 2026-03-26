---
summary: "Canal DM de Nostr a través de mensajes cifrados NIP-04"
read_when:
  - You want OpenClaw to receive DMs via Nostr
  - You're setting up decentralized messaging
title: "Nostr"
---

# Nostr

**Estado:** Complemento opcional (desactivado por defecto).

Nostr es un protocolo descentralizado para redes sociales. Este canal permite a OpenClaw recibir y responder a mensajes directos cifrados (DM) a través de NIP-04.

## Instalación (bajo demanda)

### Incorporación (recomendado)

- Onboarding (`openclaw onboard`) y `openclaw channels add` listan los complementos de canal opcionales.
- Seleccionar Nostr le pedirá que instale el complemento bajo demanda.

Valores predeterminados de instalación:

- **Canal de desarrollo + git checkout disponible:** utiliza la ruta local del complemento.
- **Estable/Beta:** descargas desde npm.

Siempre puede anular la elección en el mensaje.

### Instalación manual

```bash
openclaw plugins install @openclaw/nostr
```

Use un checkout local (flujos de trabajo de desarrollo):

```bash
openclaw plugins install --link <path-to-openclaw>/extensions/nostr
```

Reinicie la puerta de enlace (Gateway) después de instalar o activar complementos.

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

| Clave        | Tipo     | Predeterminado                              | Descripción                                   |
| ------------ | -------- | ------------------------------------------- | --------------------------------------------- |
| `privateKey` | string   | requerido                                   | Clave privada en formato `nsec` o hexadecimal |
| `relays`     | string[] | `['wss://relay.damus.io', 'wss://nos.lol']` | URLs de relay (WebSocket)                     |
| `dmPolicy`   | string   | `pairing`                                   | Política de acceso DM                         |
| `allowFrom`  | string[] | `[]`                                        | Claves públicas de remitentes permitidos      |
| `enabled`    | boolean  | `true`                                      | Habilitar/deshabilitar canal                  |
| `name`       | string   | -                                           | Nombre para mostrar                           |
| `profile`    | object   | -                                           | Metadatos de perfil NIP-01                    |

## Metadatos de perfil

Los datos del perfil se publican como un evento NIP-01 `kind:0`. Puede gestionarlos desde la UI de Control (Channels -> Nostr -> Profile) o establecerlos directamente en la configuración.

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
- La importación desde relays fusiona los campos y conserva las anulaciones locales.

## Control de acceso

### Políticas de DM

- **pairing** (predeterminado): los remitentes desconocidos reciben un código de emparejamiento.
- **allowlist**: solo las claves públicas en `allowFrom` pueden enviar DM.
- **open**: DM entrantes públicos (requiere `allowFrom: ["*"]`).
- **disabled**: ignorar DM entrantes.

### Ejemplo de lista blanca

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

## Relays

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

- Use 2-3 relays para redundancia.
- Evita demasiados relés (latencia, duplicación).
- Los relés de pago pueden mejorar la fiabilidad.
- Los relés locales son adecuados para pruebas (`ws://localhost:7777`).

## Soporte de protocolo

| NIP    | Estado      | Descripción                                     |
| ------ | ----------- | ----------------------------------------------- |
| NIP-01 | Compatible  | Formato básico de eventos + metadatos de perfil |
| NIP-04 | Compatible  | MD cifrados (`kind:4`)                          |
| NIP-17 | Planificado | MD envueltos (gift-wrapped)                     |
| NIP-44 | Planificado | Cifrado con versión                             |

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

1. Anota la clave pública del bot (npub) de los registros.
2. Abre un cliente de Nostr (Damus, Amethyst, etc.).
3. Envía un MD a la clave pública del bot.
4. Verifica la respuesta.

## Solución de problemas

### No se reciben mensajes

- Verifica que la clave privada sea válida.
- Asegúrate de que las URL de los relés sean accesibles y usen `wss://` (o `ws://` para local).
- Confirma que `enabled` no sea `false`.
- Revisa los registros de Gateway para ver errores de conexión de relé.

### No se envían respuestas

- Comprueba que el relé acepte escrituras.
- Verifica la conectividad saliente.
- Vigila los límites de tasa del relé.

### Respuestas duplicadas

- Esperado al usar múltiples relés.
- Los mensajes se deduplican por ID de evento; solo la primera entrega activa una respuesta.

## Seguridad

- Nunca confirmes claves privadas.
- Usa variables de entorno para las claves.
- Considera `allowlist` para bots en producción.

## Limitaciones (MVP)

- Solo mensajes directos (sin chats grupales).
- Sin archivos adjuntos multimedia.
- Solo NIP-04 (gift-wrap NIP-17 planificado).

import es from "/components/footer/es.mdx";

<es />
