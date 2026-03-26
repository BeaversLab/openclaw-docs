---
summary: "Modo de ejecución elevado y directivas /elevated"
read_when:
  - Adjusting elevated mode defaults, allowlists, or slash command behavior
title: "Modo elevado"
---

# Modo elevado (directivas /elevated)

## Lo que hace

- `/elevated on` se ejecuta en el host de la puerta de enlace y mantiene las aprobaciones de exec (igual que `/elevated ask`).
- `/elevated full` se ejecuta en el host de la puerta de enlace **y** aprueba automáticamente exec (omite las aprobaciones de exec).
- `/elevated ask` se ejecuta en el host de la puerta de enlace pero mantiene las aprobaciones de exec (igual que `/elevated on`).
- `on`/`ask` **no** fuerzan `exec.security=full`; la política de seguridad/pregunta configurada todavía se aplica.
- Solo cambia el comportamiento cuando el agente está **en sandbox** (de lo contrario, exec ya se ejecuta en el host).
- Formas de directiva: `/elevated on|off|ask|full`, `/elev on|off|ask|full`.
- Solo se aceptan `on|off|ask|full`; cualquier otra cosa devuelve una pista y no cambia el estado.

## Lo que controla (y lo que no controla)

- **Controladores de disponibilidad**: `tools.elevated` es la línea base global. `agents.list[].tools.elevated` puede restringir aún más el modo elevado por agente (ambos deben permitirlo).
- **Estado por sesión**: `/elevated on|off|ask|full` establece el nivel elevado para la clave de sesión actual.
- **Directiva en línea**: `/elevated on|ask|full` dentro de un mensaje se aplica solo a ese mensaje.
- **Grupos**: En los chats grupales, las directivas elevadas solo se respetan cuando se menciona al agente. Los mensajes que son solo comandos y omiten los requisitos de mención se tratan como mencionados.
- **Ejecución en host**: elevado fuerza `exec` en el host de la puerta de enlace; `full` también establece `security=full`.
- **Aprobaciones**: `full` omite las aprobaciones de exec; `on`/`ask` las respetan cuando las reglas de allowlist/pregunta lo requieren.
- **Agentes sin sandbox**: no-op para la ubicación; solo afecta el control, el registro y el estado.
- **La política de herramientas todavía se aplica**: si `exec` es denegado por la política de herramientas, no se puede usar el modo elevado.
- **Separado de `/exec`**: `/exec` ajusta los valores predeterminados por sesión para remitentes autorizados y no requiere elevated.

## Orden de resolución

1. Directiva en línea en el mensaje (se aplica solo a ese mensaje).
2. Anulación de sesión (establecida enviando un mensaje que contiene solo la directiva).
3. Valor predeterminado global (`agents.defaults.elevatedDefault` en la configuración).

## Establecer un valor predeterminado de sesión

- Envíe un mensaje que sea **solo** la directiva (se permiten espacios en blanco), p. ej. `/elevated full`.
- Se envía una respuesta de confirmación (`Elevated mode set to full...` / `Elevated mode disabled.`).
- Si el acceso elevado está desactivado o el remitente no está en la lista de permitidos (allowlist) aprobada, la directiva responde con un error accionable y no cambia el estado de la sesión.
- Envíe `/elevated` (o `/elevated:`) sin argumentos para ver el nivel elevado actual.

## Disponibilidad + listas de permitidos

- Feature gate (control de características): `tools.elevated.enabled` (el valor predeterminado puede estar desactivado mediante configuración incluso si el código lo soporta).
- Lista de permitidos de remitentes: `tools.elevated.allowFrom` con listas de permitidos por proveedor (p. ej. `discord`, `whatsapp`).
- Las entradas de la lista de permitidos sin prefijo coinciden solo con los valores de identidad con ámbito de remitente (`SenderId`, `SenderE164`, `From`); los campos de enrutamiento del destinatario nunca se usan para la autorización elevada.
- Los metadatos de remitente mutables requieren prefijos explícitos:
  - `name:<value>` coincide con `SenderName`
  - `username:<value>` coincide con `SenderUsername`
  - `tag:<value>` coincide con `SenderTag`
  - `id:<value>`, `from:<value>`, `e164:<value>` están disponibles para la orientación explícita de identidad
- Control por agente: `agents.list[].tools.elevated.enabled` (opcional; solo puede restringir aún más).
- Lista de permitidos por agente: `agents.list[].tools.elevated.allowFrom` (opcional; cuando se establece, el remitente debe coincidir con **ambas** listas de permitidos: global + por agente).
- Respaldo de Discord: si se omite `tools.elevated.allowFrom.discord`, se usa la lista `channels.discord.allowFrom` como respaldo (legado: `channels.discord.dm.allowFrom`). Establezca `tools.elevated.allowFrom.discord` (incluso `[]`) para anular. Las listas de permitidos por agente **no** usan el respaldo.
- Todos los controles deben pasar; de lo contrario, el modo elevado se trata como no disponible.

## Registro y estado

- Las llamadas exec elevadas se registran en el nivel de información (info).
- El estado de la sesión incluye el modo elevado (p. ej., `elevated=ask`, `elevated=full`).

import es from "/components/footer/es.mdx";

<es />
