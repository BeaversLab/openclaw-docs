---
summary: "Propuesta: modelo de autorización de comandos a largo plazo para conversaciones vinculadas a ACP"
read_when:
  - Designing native command auth behavior in Telegram/Discord ACP-bound channels/topics
title: "Autorización de comandos vinculados a ACP (Propuesta)"
---

# Autorización de comandos vinculados a ACP (Propuesta)

Estado: Propuesto, **aún no implementado**.

Este documento describe un modelo de autorización a largo plazo para comandos nativos en
conversaciones vinculadas a ACP. Es una propuesta de experimentos y no reemplaza
el comportamiento actual de producción.

Para el comportamiento implementado, lea el código fuente y las pruebas en:

- `src/telegram/bot-native-commands.ts`
- `src/discord/monitor/native-command.ts`
- `src/auto-reply/reply/commands-core.ts`

## Problema

Hoy tenemos comprobaciones específicas de comandos (por ejemplo `/new` y `/reset`) que
necesitan funcionar dentro de canales/temas vinculados a ACP incluso cuando las listas de permitidos están vacías.
Esto soluciona el dolor inmediato de la experiencia de usuario, pero las excepciones basadas en el nombre del comando no escalan.

## Forma a largo plazo

Mueva la autorización de comandos desde la lógica de controladores ad-hoc hasta los metadatos de comandos más un
evaluador de políticas compartido.

### 1) Agregar metadatos de política de autenticación a las definiciones de comandos

Cada definición de comando debería declarar una política de autenticación. Forma de ejemplo:

```ts
type CommandAuthPolicy =
  | { mode: "owner_or_allowlist" } // default, current strict behavior
  | { mode: "bound_acp_or_owner_or_allowlist" } // allow in explicitly bound ACP conversations
  | { mode: "owner_only" };
```

`/new` y `/reset` usarían `bound_acp_or_owner_or_allowlist`.
La mayoría de los demás comandos permanecerían `owner_or_allowlist`.

### 2) Compartir un evaluador a través de canales

Introduzca un asistente que evalúe la autenticación del comando usando:

- metadatos de política de comando
- estado de autorización del remitente
- estado de vinculación de conversación resuelto

Tanto los controladores nativos de Telegram como de Discord deberían llamar al mismo asistente para evitar
la deriva del comportamiento.

### 3) Usar binding-match como el límite de omisión

Cuando la política permite la omisión de ACP vinculada, autorice solo si se resolvió una vinculación
configurada para la conversación actual (no solo porque la clave de sesión actual
parece de ACP).

Esto mantiene el límite explícito y minimiza la ampliación accidental.

## Por qué esto es mejor

- Escala a comandos futuros sin agregar más condicionales de nombres de comandos.
- Mantiene el comportamiento consistente a través de canales.
- Preserva el modelo de seguridad actual al requerir una coincidencia de vinculación explícita.
- Mantiene las listas de permitidos como un endurecimiento opcional en lugar de un requisito universal.

## Plan de implementación (futuro)

1. Añadir campo de política de autenticación de comandos a los tipos de registro de comandos y a los datos de comandos.
2. Implementar el evaluador compartido y migrar los controladores nativos de Telegram y Discord.
3. Mover `/new` y `/reset` a una política basada en metadatos.
4. Añadir pruebas por modo de política y superficie de canal.

## No objetivos

- Esta propuesta no cambia el comportamiento del ciclo de vida de la sesión ACP.
- Esta propuesta no requiere listas de permitidos para todos los comandos vinculados a ACP.
- Esta propuesta no cambia la semántica de enlace de rutas existente.

## Nota

Esta propuesta es intencionalmente aditiva y no elimina ni reemplaza los
documentos de experimentos existentes.
