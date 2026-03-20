---
summary: "Canal DM de Nostr a través de mensajes cifrados NIP-04"
read_when:
  - Quieres que OpenClaw reciba DMs a través de Nostr
  - Estás configurando la mensajería descentralizada
title: "Nostr"
---

# Nostr

**Estado:** Complemento opcional (desactivado por defecto).

Nostr es un protocolo descentralizado para redes sociales. Este canal permite a OpenClaw recibir y responder a mensajes directos (DMs) cifrados a través de NIP-04.

## Instalar (bajo demanda)

### Incorporación (recomendado)

- La incorporación (`openclaw onboard`) y `openclaw channels add` enumeran los complementos de canal opcionales.
- Seleccionar Nostr te solicita instalar el complemento bajo demanda.

Valores predeterminados de instalación:

- **Canal de desarrollo + git checkout disponible:** usa la ruta local del complemento.
- **Estable/Beta:** descargas desde npm.

Siempre puedes anular la elección en el mensaje.

### Instalación manual

```bash
openclaw plugins install @openclaw/nostr
```

Usar un checkout local (flujos de trabajo de desarrollo):

```bash
openclaw plugins install --link <path-to-openclaw>/extensions/nostr
```

Reinicia el Gateway después de instalar o habilitar complementos.

### Configuración no interactiva

```bash
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY" --relay-urls "wss://relay.damus.io,wss://relay.primal.net"
```

Usa `--use-env` para mantener `NOSTR_PRIVATE_KEY` en el entorno en lugar de almacenar la clave en la configuración.

## Configuración rápida

1. Genera un par de claves Nostr (si es necesario):

```bash
# Using nak
nak key generate
```

2. Añadir a la configuración:

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

4. Reinicia el Gateway.

## Referencia de configuración

| Clave        | Tipo     | Predeterminado                              | Descripción                                   |
| ------------ | -------- | ------------------------------------------- | --------------------------------------------- |
| `privateKey` | string   | requerido                                   | Clave privada en formato `nsec` o hexadecimal |
| `relays`     | string[] | `['wss://relay.damus.io', 'wss://nos.lol']` | URLs de Relay (WebSocket)                     |
| `dmPolicy`   | string   | `pairing`                                   | Política de acceso DM                         |
| `allowFrom`  | string[] | `[]`                                        | Claves públicas de remitentes permitidos      |
| `enabled`    | boolean  | `true`                                      | Habilitar/deshabilitar canal                  |
| `name`       | string   | -                                           | Nombre para mostrar                           |
| `profile`    | object   | -                                           | Metadatos del perfil NIP-01                   |

## Metadatos del perfil

Los datos del perfil se publican como un evento `kind:0` de NIP-01. Puedes gestionarlo desde la UI de Control (Canales -> Nostr -> Perfil) o configurarlo directamente en el archivo de configuración.

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

- Las URLs de perfil deben usar `https://`.
- La importación desde relays fusiona los campos y conserva las anulaciones locales.

## Control de acceso

### Políticas de DM

- **emparejamiento** (predeterminado): los remitentes desconocidos obtienen un código de emparejamiento.
- **lista de permitidos**: solo las claves públicas en `allowFrom` pueden enviar MD.
- **abierto**: MD entrantes públicos (requiere `allowFrom: ["*"]`).
- **deshabilitado**: ignorar los MD entrantes.

### Ejemplo de lista de permitidos

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

## Retransmisores

Predeterminados: `relay.damus.io` y `nos.lol`.

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

- Use 2-3 retransmisores para redundancia.
- Evite demasiados retransmisores (latencia, duplicación).
- Los retransmisores de pago pueden mejorar la confiabilidad.
- Los retransmisores locales son adecuados para pruebas (`ws://localhost:7777`).

## Soporte de protocolo

| NIP    | Estado      | Descripción                                    |
| ------ | ----------- | ---------------------------------------------- |
| NIP-01 | Compatible  | Formato de evento básico + metadatos de perfil |
| NIP-04 | Soportado   | MD cifrados (`kind:4`)                         |
| NIP-17 | Planificado | MD envueltos (gift-wrapped)                    |
| NIP-44 | Planificado | Cifrado con versión                            |

## Pruebas

### Retransmisor local

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

### No recibe mensajes

- Verifique que la clave privada sea válida.
- Asegúrese de que las URL de los retransmisores sean accesibles y usen `wss://` (o `ws://` para locales).
- Confirme que `enabled` no sea `false`.
- Verifique los registros de Gateway para ver errores de conexión del retransmisor.

### No envía respuestas

- Compruebe que el retransmisor acepte escrituras.
- Verifique la conectividad saliente.
- Vigile los límites de velocidad del retransmisor.

### Respuestas duplicadas

- Esperado al utilizar varios retransmisores.
- Los mensajes se deduplican por ID de evento; solo la primera entrega activa una respuesta.

## Seguridad

- Nunca confirme claves privadas.
- Use variables de entorno para las claves.
- Considere `allowlist` para bots de producción.

## Limitaciones (MVP)

- Solo mensajes directos (sin chats grupales).
- Sin archivos multimedia adjuntos.
- Solo NIP-04 (se planea NIP-17 gift-wrap).

import es from "/components/footer/es.mdx";

<es />
