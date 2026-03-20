---
summary: "Soporte de cuenta personal de Zalo mediante zca-js nativo (inicio de sesión con QR), capacidades y configuración"
read_when:
  - Configuración de Zalo Personal para OpenClaw
  - Depuración del inicio de sesión o flujo de mensajes de Zalo Personal
title: "Zalo Personal"
---

# Zalo Personal (no oficial)

Estado: experimental. Esta integración automatiza una **cuenta personal de Zalo** mediante `zca-js` nativo dentro de OpenClaw.

> **Advertencia:** Esta es una integración no oficial y puede resultar en la suspensión o prohibición de la cuenta. Úsela bajo su propia responsabilidad.

## Plugin requerido

Zalo Personal se distribuye como un complemento y no está incluido en la instalación principal.

- Instalar a través de CLI: `openclaw plugins install @openclaw/zalouser`
- O desde una descarga del código fuente: `openclaw plugins install ./extensions/zalouser`
- Detalles: [Plugins](/es/tools/plugin)

No se requiere ningún binario CLI externo `zca`/`openzca`.

## Configuración rápida (principiante)

1. Instale el complemento (ver más arriba).
2. Inicio de sesión (QR, en la máquina Gateway):
   - `openclaw channels login --channel zalouser`
   - Escanee el código QR con la aplicación móvil de Zalo.
3. Habilite el canal:

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      dmPolicy: "pairing",
    },
  },
}
```

4. Reinicie el Gateway (o termine la configuración).
5. El acceso a DM predeterminado es emparejamiento; apruebe el código de emparejamiento en el primer contacto.

## Qué es

- Se ejecuta completamente en proceso a través de `zca-js`.
- Utiliza escuchas de eventos nativos para recibir mensajes entrantes.
- Envía respuestas directamente a través de la API de JS (texto/medios/enlace).
- Diseñado para casos de uso de "cuenta personal" donde la API de Zalo Bot no está disponible.

## Nomenclatura

El ID del canal es `zalouser` para dejar claro que esto automatiza una **cuenta de usuario personal de Zalo** (no oficial). Mantenemos `zalo` reservado para una posible integración futura de la API oficial de Zalo.

## Buscar IDs (directorio)

Use la CLI del directorio para descubrir pares/grupos y sus IDs:

```bash
openclaw directory self --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory groups list --channel zalouser --query "work"
```

## Límites

- El texto saliente se divide en fragmentos de ~2000 caracteres (límites del cliente de Zalo).
- La transmisión (streaming) está bloqueada de forma predeterminada.

## Control de acceso (DMs)

`channels.zalouser.dmPolicy` soporta: `pairing | allowlist | open | disabled` (predeterminado: `pairing`).

`channels.zalouser.allowFrom` acepta IDs o nombres de usuario. Durante la configuración, los nombres se resuelven en IDs utilizando la búsqueda de contactos en proceso del complemento.

Aprobar a través de:

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## Acceso a grupos (opcional)

- Predeterminado: `channels.zalouser.groupPolicy = "open"` (grupos permitidos). Use `channels.defaults.groupPolicy` para anular el valor predeterminado cuando no esté configurado.
- Restringir a una lista de permitidos con:
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups` (las claves deben ser ID de grupo estables; los nombres se resuelven a ID al inicio cuando es posible)
  - `channels.zalouser.groupAllowFrom` (controla qué remitentes en los grupos permitidos pueden activar el bot)
- Bloquear todos los grupos: `channels.zalouser.groupPolicy = "disabled"`.
- El asistente de configuración puede solicitar listas de permitidos de grupos.
- Al iniciarse, OpenClaw resuelve los nombres de grupo/usuario en las listas de permitidos a ID y registra el mapeo.
- La coincidencia de la lista de permitidos de grupos es solo de ID de forma predeterminada. Los nombres no resueltos se ignoran para la autenticación a menos que `channels.zalouser.dangerouslyAllowNameMatching: true` esté habilitado.
- `channels.zalouser.dangerouslyAllowNameMatching: true` es un modo de compatibilidad de emergencia que rehabilita la coincidencia por nombres de grupo mutables.
- Si `groupAllowFrom` no está configurado, el tiempo de ejecución recurre a `allowFrom` para las comprobaciones de remitente de grupo.
- Las comprobaciones de remitente se aplican tanto a los mensajes normales de grupo como a los comandos de control (por ejemplo, `/new`, `/reset`).

Ejemplo:

```json5
{
  channels: {
    zalouser: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["1471383327500481391"],
      groups: {
        "123456789": { allow: true },
        "Work Chat": { allow: true },
      },
    },
  },
}
```

### Filtrado de mención de grupo

- `channels.zalouser.groups.<group>.requireMention` controla si las respuestas del grupo requieren una mención.
- Orden de resolución: id/nombre exacto del grupo -> slug de grupo normalizado -> `*` -> predeterminado (`true`).
- Esto se aplica tanto a los grupos en la lista de permitidos como al modo de grupo abierto.
- Los comandos de control autorizados (por ejemplo, `/new`) pueden omitir el filtrado de mención.
- Cuando se omite un mensaje de grupo porque se requiere una mención, OpenClaw lo almacena como historial de grupo pendiente y lo incluye en el siguiente mensaje de grupo procesado.
- El límite del historial de grupos es de `messages.groupChat.historyLimit` de forma predeterminada (alternativa `50`). Puede anularlo por cuenta con `channels.zalouser.historyLimit`.

Ejemplo:

```json5
{
  channels: {
    zalouser: {
      groupPolicy: "allowlist",
      groups: {
        "*": { allow: true, requireMention: true },
        "Work Chat": { allow: true, requireMention: false },
      },
    },
  },
}
```

## Multicuenta

Las cuentas se asignan a perfiles `zalouser` en el estado de OpenClaw. Ejemplo:

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      defaultAccount: "default",
      accounts: {
        work: { enabled: true, profile: "work" },
      },
    },
  },
}
```

## Escribiendo, reacciones y confirmaciones de entrega

- OpenClaw envía un evento de escritura antes de enviar una respuesta (mejor esfuerzo posible).
- La acción de reacción al mensaje `react` es compatible con `zalouser` en las acciones del canal.
  - Use `remove: true` para eliminar un emoji de reacción específico de un mensaje.
  - Semántica de reacciones: [Reacciones](/es/tools/reactions)
- Para los mensajes entrantes que incluyen metadatos de eventos, OpenClaw envía confirmaciones de entregado + visto (mejor esfuerzo).

## Solución de problemas

**El inicio de sesión no persiste:**

- `openclaw channels status --probe`
- Volver a iniciar sesión: `openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**La lista de permitidos/nombre de grupo no se resolvió:**

- Use IDs numéricos en `allowFrom`/`groupAllowFrom`/`groups`, o nombres exactos de amigos/grupos.

**Actualizado desde una configuración antigua basada en CLI:**

- Elimine cualquier suposición anterior sobre el proceso externo `zca`.
- El canal ahora se ejecuta completamente en OpenClaw sin binarios de CLI externos.

import en from "/components/footer/en.mdx";

<en />
