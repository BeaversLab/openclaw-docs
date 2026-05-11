---
summary: "Soporte de cuenta personal de Zalo mediante zca-js nativo (inicio de sesión QR), capacidades y configuración"
read_when:
  - Setting up Zalo Personal for OpenClaw
  - Debugging Zalo Personal login or message flow
title: "Zalo personal"
---

Estado: experimental. Esta integración automatiza una **cuenta personal de Zalo** a través de `zca-js` nativo dentro de OpenClaw.

<Warning>Esta es una integración no oficial y puede resultar en la suspensión o prohibición de la cuenta. Úsela bajo su propia responsabilidad.</Warning>

## Complemento incluido

Zalo Personal se distribuye como un complemento incluido en las versiones actuales de OpenClaw, por lo que las compilaciones empaquetadas normales no necesitan una instalación separada.

Si está en una versión anterior o una instalación personalizada que excluye Zalo Personal,
ínstelo manualmente:

- Instalar mediante CLI: `openclaw plugins install @openclaw/zalouser`
- O desde una checkout de fuente: `openclaw plugins install ./path/to/local/zalouser-plugin`
- Detalles: [Plugins](/es/tools/plugin)

No se requiere ningún binario CLI externo `zca`/`openzca`.

## Configuración rápida (principiante)

1. Asegúrese de que el complemento Zalo Personal esté disponible.
   - Las versiones empaquetadas actuales de OpenClaw ya lo incluyen.
   - Las instalaciones antiguas/personalizadas pueden agregarlo manualmente con los comandos anteriores.
2. Inicio de sesión (código QR, en la máquina Gateway):
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

4. Reinicie el Gateway (o finalice la configuración).
5. El acceso a MD (mensajes directos) de forma predeterminada requiere vinculación; apruebe el código de vinculación en el primer contacto.

## Qué es

- Se ejecuta totalmente en el proceso a través de `zca-js`.
- Utiliza escuchas de eventos nativos para recibir mensajes entrantes.
- Envía respuestas directamente a través de la API de JS (texto/medios/enlace).
- Diseñado para casos de uso de "cuenta personal" donde la API de Zalo Bot no está disponible.

## Nomenclatura

El ID del canal es `zalouser` para dejar explícito que esto automatiza una **cuenta de usuario personal de Zalo** (no oficial). Mantenemos `zalo` reservado para una posible integración oficial futura de la API de Zalo.

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

## Control de acceso (MDs)

`channels.zalouser.dmPolicy` admite: `pairing | allowlist | open | disabled` (predeterminado: `pairing`).

`channels.zalouser.allowFrom` acepta IDs o nombres de usuario. Durante la configuración, los nombres se resuelven en IDs utilizando la búsqueda de contactos en proceso del complemento.

Aprobar a través de:

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## Acceso a grupos (opcional)

- Predeterminado: `channels.zalouser.groupPolicy = "open"` (grupos permitidos). Use `channels.defaults.groupPolicy` para anular el valor predeterminado cuando no esté configurado.
- Restringir a una lista de permitidos con:
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups` (las claves deben ser IDs de grupo estables; los nombres se resuelven a IDs al inicio cuando es posible)
  - `channels.zalouser.groupAllowFrom` (controla qué remitentes en los grupos permitidos pueden activar el bot)
- Bloquear todos los grupos: `channels.zalouser.groupPolicy = "disabled"`.
- El asistente de configuración puede solicitar listas de permitidos de grupos.
- Al iniciar, OpenClaw resuelve los nombres de grupo/usuario en las listas de permitidos a IDs y registra la asignación.
- La coincidencia de la lista de permitidos de grupos es solo por ID por defecto. Los nombres no resueltos se ignoran para la autenticación a menos que `channels.zalouser.dangerouslyAllowNameMatching: true` esté habilitado.
- `channels.zalouser.dangerouslyAllowNameMatching: true` es un modo de compatibilidad de emergencia que reactiva la coincidencia por nombres de grupo mutables.
- Si `groupAllowFrom` no está establecido, el tiempo de ejecución recurre a `allowFrom` para las comprobaciones de remitente de grupo.
- Las comprobaciones de remitente se aplican tanto a los mensajes normales de grupo como a los comandos de control (por ejemplo `/new`, `/reset`).

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
- Orden de resolución: id/nombre exacto del grupo -> slug de grupo normalizado -> `*` -> por defecto (`true`).
- Esto se aplica tanto a los grupos en la lista de permitidos como al modo de grupo abierto.
- Citar un mensaje del bot cuenta como una mención implícita para la activación del grupo.
- Los comandos de control autorizados (por ejemplo `/new`) pueden omitir el filtrado de menciones.
- Cuando se omite un mensaje de grupo porque se requiere una mención, OpenClaw lo almacena como historial de grupo pendiente y lo incluye en el siguiente mensaje de grupo procesado.
- El límite del historial de grupos es `messages.groupChat.historyLimit` por defecto (alternativo `50`). Puedes anularlo por cuenta con `channels.zalouser.historyLimit`.

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

## Indicador de escritura, reacciones y confirmaciones de entrega

- OpenClaw envía un evento de escritura antes de enviar una respuesta (mejor esfuerzo posible).
- La acción de reacción al mensaje `react` es compatible con `zalouser` en las acciones del canal.
  - Use `remove: true` para eliminar un emoji de reacción específico de un mensaje.
  - Semántica de reacciones: [Reacciones](/es/tools/reactions)
- Para los mensajes entrantes que incluyen metadatos de eventos, OpenClaw envía acuses de entrega y vistos (mejor esfuerzo).

## Solución de problemas

**El inicio de sesión no persiste:**

- `openclaw channels status --probe`
- Volver a iniciar sesión: `openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**No se resolvió la lista de permitidos/nombre de grupo:**

- Use IDs numéricos en `allowFrom`/`groupAllowFrom`/`groups`, o nombres exactos de amigos/grupos.

**Actualizado desde la configuración anterior basada en CLI:**

- Elimine cualquier suposición antigua sobre el proceso externo `zca`.
- El canal ahora se ejecuta completamente en OpenClaw sin binarios CLI externos.

## Relacionado

- [Resumen de canales](/es/channels) — todos los canales compatibles
- [Emparejamiento](/es/channels/pairing) — flujo de autenticación y emparejamiento de MD
- [Grupos](/es/channels/groups) — comportamiento del chat de grupo y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento
