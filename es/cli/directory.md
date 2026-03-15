---
summary: "Referencia de CLI para `openclaw directory` (yo, pares, grupos)"
read_when:
  - You want to look up contacts/groups/self ids for a channel
  - You are developing a channel directory adapter
title: "directorio"
---

# `openclaw directory`

Consultas de directorio para canales que lo soportan (contactos/pares, grupos y “yo”).

## Opciones comunes

- `--channel <name>`: id/alias del canal (obligatorio cuando hay varios canales configurados; automático cuando solo hay uno configurado)
- `--account <id>`: id de cuenta (predeterminado: predeterminado del canal)
- `--json`: salida JSON

## Notas

- `directory` está diseñado para ayudarte a encontrar los IDs que puedes pegar en otros comandos (especialmente `openclaw message send --target ...`).
- Para muchos canales, los resultados están respaldados por la configuración (listas permitidas / grupos configurados) en lugar de un directorio en vivo del proveedor.
- La salida predeterminada es `id` (y a veces `name`) separados por un tabulador; usa `--json` para scripts.

## Usar los resultados con `message send`

```bash
openclaw directory peers list --channel slack --query "U0"
openclaw message send --channel slack --target user:U012ABCDEF --message "hello"
```

## Formatos de ID (por canal)

- WhatsApp: `+15551234567` (MD), `1234567890-1234567890@g.us` (grupo)
- Telegram: `@username` o id numérico del chat; los grupos son ids numéricos
- Slack: `user:U…` y `channel:C…`
- Discord: `user:<id>` y `channel:<id>`
- Matrix (complemento): `user:@user:server`, `room:!roomId:server` o `#alias:server`
- Microsoft Teams (complemento): `user:<id>` y `conversation:<id>`
- Zalo (complemento): id de usuario (API de Bot)
- Zalo Personal / `zalouser` (complemento): id de hilo (MD/grupo) de `zca` (`me`, `friend list`, `group list`)

## Uno mismo (“yo”)

```bash
openclaw directory self --channel zalouser
```

## Pares (contactos/usuarios)

```bash
openclaw directory peers list --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory peers list --channel zalouser --limit 50
```

## Grupos

```bash
openclaw directory groups list --channel zalouser
openclaw directory groups list --channel zalouser --query "work"
openclaw directory groups members --channel zalouser --group-id <id>
```

import es from "/components/footer/es.mdx";

<es />
