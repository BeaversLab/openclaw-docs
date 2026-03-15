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

- El asistente de incorporación (`openclaw onboard`) y `openclaw channels add` enumeran los complementos de canal opcionales.
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

## Configuración rápida

1. Genere un par de claves Nostr (si es necesario):

```bash
# Using nak
nak key generate
```

2. Agregar a la configuración:

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}"
    }
  }
}
```

3. Exportar la clave:

```bash
export NOSTR_PRIVATE_KEY="nsec1..."
```

4. Reinicie la puerta de enlace (Gateway).

## Referencia de configuración

| Clave        | Tipo                | Predeterminado                              | Descripción                                   |
| ------------ | ------------------- | ------------------------------------------- | --------------------------------------------- |
| `privateKey` | cadena (string)     | requerido                                   | Clave privada en formato `nsec` o hexadecimal |
| `relays`     | cadena[] (string[]) | `['wss://relay.damus.io', 'wss://nos.lol']` | URL de Retransmisión (Relay) (WebSocket)      |
| `dmPolicy`   | cadena (string)     | `pairing`                                   | Política de acceso DM                         |
| `allowFrom`  | cadena[] (string[]) | `[]`                                        | Claves públicas de remitentes permitidos      |
| `enabled`    | booleano            | `true`                                      | Activar/desactivar canal                      |
| `name`       | cadena (string)     | -                                           | Nombre para mostrar                           |
| `profile`    | objeto              | -                                           | Metadatos del perfil NIP-01                   |

## Metadatos del perfil

Los datos del perfil se publican como un evento NIP-01 `kind:0`. Puede administrarlos desde la interfaz de usuario de control (Canales -> Nostr -> Perfil) o configurarlos directamente en el archivo de configuración.

Ejemplo:

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "profile": {
        "name": "openclaw",
        "displayName": "OpenClaw",
        "about": "Personal assistant DM bot",
        "picture": "https://example.com/avatar.png",
        "banner": "https://example.com/banner.png",
        "website": "https://example.com",
        "nip05": "openclaw@example.com",
        "lud16": "openclaw@example.com"
      }
    }
  }
}
```

Notas:

- Las URL de perfil deben usar `https://`.
- La importación desde retransmisores (relays) combina campos y conserva las anulaciones locales.

## Control de acceso

### Políticas de DM

- **vinculación** (pairing) (predeterminado): los remitentes desconocidos reciben un código de vinculación.
- **lista blanca** (allowlist): solo las claves públicas en `allowFrom` pueden enviar DM.
- **open**: MD entrantes públicos (requiere `allowFrom: ["*"]`).
- **disabled**: ignorar MD entrantes.

### Ejemplo de lista blanca

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "dmPolicy": "allowlist",
      "allowFrom": ["npub1abc...", "npub1xyz..."]
    }
  }
}
```

## Formatos de clave

Formatos aceptados:

- **Clave privada:** `nsec...` o hexadecimal de 64 caracteres
- **Claves públicas (`allowFrom`):** `npub...` o hexadecimal

## Relés

Por defecto: `relay.damus.io` y `nos.lol`.

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "relays": ["wss://relay.damus.io", "wss://relay.primal.net", "wss://nostr.wine"]
    }
  }
}
```

Consejos:

- Use 2-3 relés para redundancia.
- Evite demasiados relés (latencia, duplicación).
- Los relés de pago pueden mejorar la confiabilidad.
- Los relés locales están bien para pruebas (`ws://localhost:7777`).

## Soporte de protocolo

| NIP    | Estado      | Descripción                                     |
| ------ | ----------- | ----------------------------------------------- |
| NIP-01 | Compatible  | Formato básico de eventos + metadatos de perfil |
| NIP-04 | Compatible  | MD cifrados (`kind:4`)                          |
| NIP-17 | Planificado | MD envueltos como regalo (Gift-wrap)            |
| NIP-44 | Planificado | Cifrado con versiones                           |

## Pruebas

### Relé local

```bash
# Start strfry
docker run -p 7777:7777 ghcr.io/hoytech/strfry
```

```json
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "relays": ["ws://localhost:7777"]
    }
  }
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
- Asegúrese de que las URL de los relés sean accesibles y usen `wss://` (o `ws://` para locales).
- Confirme que `enabled` no sea `false`.
- Revise los registros de Gateway para ver errores de conexión de relé.

### No se envían respuestas

- Compruebe que el relé acepte escrituras.
- Verifique la conectividad saliente.
- Vigile los límites de velocidad del relé.

### Respuestas duplicadas

- Esperado al usar múltiples relés.
- Los mensajes se deduplican por ID de evento; solo la primera entrega activa una respuesta.

## Seguridad

- Nunca confirme claves privadas.
- Use variables de entorno para las claves.
- Considere `allowlist` para bots de producción.

## Limitaciones (MVP)

- Solo mensajes directos (sin chats grupales).
- Sin archivos adjuntos de medios.
- Solo NIP-04 (NIP-17 gift-wrap planificado).

import es from "/components/footer/es.mdx";

<es />
