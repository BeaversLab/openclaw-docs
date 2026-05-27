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

Si estás en una versión antigua o una instalación personalizada que excluye Zalo Personal,
instala el paquete npm directamente:

- Instalar mediante CLI: `openclaw plugins install @openclaw/zalouser`
- Versión fijada: `openclaw plugins install @openclaw/zalouser@2026.5.2`
- O desde una comprobación del código fuente: `openclaw plugins install ./path/to/local/zalouser-plugin`
- Detalles: [Plugins](/es/tools/plugin)

No se requiere ningún binario `zca`/`openzca` CLI externo.

## Configuración rápida (principiante)

1. Asegúrese de que el complemento Zalo Personal esté disponible.
   - Las versiones empaquetadas actuales de OpenClaw ya lo incluyen.
   - Las instalaciones antiguas/personalizadas pueden añadirlo manualmente con los comandos anteriores.
2. Inicio de sesión (QR, en la máquina Gateway):
   - `openclaw channels login --channel zalouser`
   - Escanee el código QR con la aplicación móvil Zalo.
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
5. El acceso a DM predeterminado es el emparejamiento; apruebe el código de emparejamiento en el primer contacto.

## Qué es

- Se ejecuta completamente en proceso a través de `zca-js`.
- Utiliza escuchadores de eventos nativos para recibir mensajes entrantes.
- Envía respuestas directamente a través de la API de JS (texto/medios/enlace).
- Diseñado para casos de uso de "cuenta personal" donde la API de Zalo Bot no está disponible.

## Nomenclatura

El ID del canal es `zalouser` para dejar explícito que esto automatiza una **cuenta de usuario personal de Zalo** (no oficial). Mantenemos `zalo` reservado para una posible futura integración oficial de la API de Zalo.

## Buscar ID (directorio)

Use la CLI del directorio para descubrir pares/grupos y sus ID:

```bash
openclaw directory self --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory groups list --channel zalouser --query "work"
```

## Límites

- El texto de salida se divide en fragmentos de unos 2000 caracteres (límites del cliente Zalo).
- La transmisión (streaming) está bloqueada de forma predeterminada.

## Control de acceso (DMs)

`channels.zalouser.dmPolicy` admite: `pairing | allowlist | open | disabled` (predeterminado: `pairing`).

`channels.zalouser.allowFrom` debe usar IDs de usuario estables de Zalo. También puede hacer referencia a grupos de acceso de remitentes estáticos (`accessGroup:<name>`). Durante la configuración interactiva, los nombres introducidos se pueden resolver a IDs utilizando la búsqueda de contactos en proceso del complemento.

Si un nombre sin procesar permanece en la configuración, el inicio lo resuelve solo cuando `channels.zalouser.dangerouslyAllowNameMatching: true` está habilitado. Sin esa opción de participación, las comprobaciones de remitente en tiempo de ejecución son solo por ID y los nombres sin procesar se ignoran para la autorización.

Aprobar mediante:

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## Acceso a grupos (opcional)

- Predeterminado: `channels.zalouser.groupPolicy = "open"` (grupos permitidos). Usa `channels.defaults.groupPolicy` para anular el valor predeterminado cuando no está configurado.
- Restringir a una lista de permitidos con:
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups` (las claves deben ser IDs de grupo estables; los nombres se resuelven a IDs al inicio solo cuando `channels.zalouser.dangerouslyAllowNameMatching: true` está habilitado)
  - `channels.zalouser.groupAllowFrom` (controla qué remitentes en los grupos permitidos pueden activar el bot; se pueden hacer referencia a grupos de acceso de remitentes estáticos con `accessGroup:<name>`)
- Bloquear todos los grupos: `channels.zalouser.groupPolicy = "disabled"`.
- El asistente de configuración puede solicitar listas de permitidos de grupos.
- Al iniciarse, OpenClaw resuelve los nombres de grupo/usuario en las listas de permitidos a IDs y registra el mapeo solo cuando `channels.zalouser.dangerouslyAllowNameMatching: true` está habilitado.
- La coincidencia de la lista de permitidos del grupo es solo por ID de forma predeterminada. Los nombres no resueltos se ignoran para la autenticación a menos que `channels.zalouser.dangerouslyAllowNameMatching: true` esté habilitado.
- `channels.zalouser.dangerouslyAllowNameMatching: true` es un modo de compatibilidad de emergencia que rehabilita la resolución de nombres de inicio mutable y la coincidencia de nombres de grupo en tiempo de ejecución.
- Si `groupAllowFrom` no está establecido, el tiempo de ejecución recurre a `allowFrom` para las comprobaciones del remitente del grupo.
- Las comprobaciones del remitente se aplican tanto a los mensajes normales del grupo como a los comandos de control (por ejemplo `/new`, `/reset`).

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

### Filtrado de menciones de grupo

- `channels.zalouser.groups.<group>.requireMention` controla si las respuestas del grupo requieren una mención.
- Orden de resolución: id/nombre exacto del grupo -> slug de grupo normalizado -> `*` -> predeterminado (`true`).
- Esto se aplica tanto a los grupos en la lista de permitidos como al modo de grupo abierto.
- Citar un mensaje del bot cuenta como una mención implícita para la activación del grupo.
- Los comandos de control autorizados (por ejemplo `/new`) pueden omitir el filtrado de menciones.
- Cuando se omite un mensaje de grupo porque se requiere una mención, OpenClaw lo almacena como historial pendiente del grupo y lo incluye en el siguiente mensaje de grupo procesado.
- El límite del historial del grupo es `messages.groupChat.historyLimit` por defecto (alternativa `50`). Puede anularlo por cuenta con `channels.zalouser.historyLimit`.

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

## Variables de entorno

El plugin de Zalo Personal también puede leer la selección de perfil desde variables de entorno:

- `ZALOUSER_PROFILE`: nombre del perfil a usar cuando no se establece ningún `profile` en la configuración del canal o de la cuenta.
- `ZCA_PROFILE`: nombre del perfil de respaldo heredado, usado solo cuando `ZALOUSER_PROFILE` no está establecido.

Los nombres de perfil seleccionan las credenciales de inicio de sesión de Zalo guardadas en el estado de OpenClaw. El orden de resolución es:

1. `profile` explícito en la configuración.
2. `ZALOUSER_PROFILE`.
3. `ZCA_PROFILE`.
4. El ID de cuenta para cuentas no predeterminadas, o `default` para la cuenta predeterminada.

Para configuraciones multicuenta, se prefiere establecer `profile` en cada cuenta en la configuración para que
una variable de entorno no haga que varias cuentas compartan la misma sesión
de inicio de sesión.

## Indicación de escritura, reacciones y confirmaciones de entrega

- OpenClaw envía un evento de escritura antes de enviar una respuesta (mejor esfuerzo).
- La acción de reacción al mensaje `react` es compatible con `zalouser` en las acciones del canal.
  - Use `remove: true` para eliminar un emoji de reacción específico de un mensaje.
  - Semántica de reacciones: [Reacciones](/es/tools/reactions)
- Para los mensajes entrantes que incluyen metadatos de eventos, OpenClaw envía confirmaciones de entregado y visto (mejor esfuerzo).

## Solución de problemas

**El inicio de sesión no se mantiene:**

- `openclaw channels status --probe`
- Volver a iniciar sesión: `openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**La lista de permitidos/nombre de grupo no se resolvió:**

- Use IDs numéricos en `allowFrom`/`groupAllowFrom` e IDs de grupo estables en `groups`. Si necesita intencionalmente nombres exactos de amigos/grupos, habilite `channels.zalouser.dangerouslyAllowNameMatching: true`.

**Actualizado desde la configuración anterior basada en CLI:**

- Elimine cualquier suposición anterior sobre el proceso externo `zca`.
- El canal ahora se ejecuta completamente en OpenClaw sin binarios CLI externos.

## Relacionado

- [Resumen de canales](/es/channels) — todos los canales compatibles
- [Emparejamiento](/es/channels/pairing) — flujo de autenticación y emparejamiento por MD
- [Grupos](/es/channels/groups) — comportamiento del chat grupal y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesión para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento
