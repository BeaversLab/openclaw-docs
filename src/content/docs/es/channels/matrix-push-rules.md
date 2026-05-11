---
summary: "Reglas de inserción de Matrix por destinatario para ediciones de vista previa finalizadas en silencio"
read_when:
  - Setting up Matrix quiet streaming for self-hosted Synapse or Tuwunel
  - Users want notifications only on finished blocks, not on every preview edit
title: "Reglas de inserción de Matrix para vistas previas silenciosas"
---

Cuando `channels.matrix.streaming` es `"quiet"`, OpenClaw edita un único evento de vista previa en el lugar y marca la edición finalizada con un indicador de contenido personalizado. Los clientes de Matrix notifican sobre la edición final solo si una regla de inserción por usuario coincide con ese indicador. Esta página es para operadores que alojan Matrix por sí mismos y desean instalar esa regla para cada cuenta de destinatario.

Si solo deseas el comportamiento de notificación estándar de Matrix, usa `streaming: "partial"` o deja el streaming desactivado. Consulta [Configuración del canal de Matrix](/es/channels/matrix#streaming-previews).

## Requisitos previos

- usuario destinatario = la persona que debe recibir la notificación
- usuario bot = la cuenta de Matrix de OpenClaw que envía la respuesta
- usa el token de acceso del usuario destinatario para las llamadas a la API a continuación
- haz coincidir `sender` en la regla de inserción con el MXID completo del usuario bot
- la cuenta destinataria ya debe tener pushers funcionando: las reglas de vista previa silenciosa solo funcionan cuando la entrega de inserciones de Matrix normal está sana

## Pasos

<Steps>
  <Step title="Configurar vistas previas silenciosas">

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

  </Step>

  <Step title="Obtener el token de acceso del destinatario">
    Reutiliza un token de sesión de cliente existente siempre que sea posible. Para crear uno nuevo:

```bash
curl -sS -X POST \
  "https://matrix.example.org/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "m.login.password",
    "identifier": { "type": "m.id.user", "user": "@alice:example.org" },
    "password": "REDACTED"
  }'
```

  </Step>

  <Step title="Verificar que existen los pushers">

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

Si no se devuelve ningún pusher, repara la entrega de inserciones de Matrix normal para esta cuenta antes de continuar.

  </Step>

  <Step title="Instalar la regla de inserción de invalidación">
    OpenClaw marca las ediciones de vista previa de solo texto finalizadas con `content["com.openclaw.finalized_preview"] = true`. Instale una regla que coincida con ese marcador y el MXID del bot como remitente:

```bash
curl -sS -X PUT \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "conditions": [
      { "kind": "event_match", "key": "type", "pattern": "m.room.message" },
      {
        "kind": "event_property_is",
        "key": "content.m\\.relates_to.rel_type",
        "value": "m.replace"
      },
      {
        "kind": "event_property_is",
        "key": "content.com\\.openclaw\\.finalized_preview",
        "value": true
      },
      { "kind": "event_match", "key": "sender", "pattern": "@bot:example.org" }
    ],
    "actions": [
      "notify",
      { "set_tweak": "sound", "value": "default" },
      { "set_tweak": "highlight", "value": false }
    ]
  }'
```

    Reemplace antes de ejecutar:

    - `https://matrix.example.org`: la URL base de su servidor doméstico
    - `$USER_ACCESS_TOKEN`: el token de acceso del usuario destinatario
    - `openclaw-finalized-preview-botname`: un ID de regla único por bot por destinatario (patrón: `openclaw-finalized-preview-<botname>`)
    - `@bot:example.org`: su MXID del bot OpenClaw, no el del destinatario

  </Step>

  <Step title="Verificar">

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

A continuación, pruebe una respuesta transmitida. En modo silencioso, la sala muestra una vista previa de borrador silenciosa y notifica una vez que finaliza el bloque o el turno.

  </Step>
</Steps>

Para eliminar la regla más tarde, `DELETE` la misma URL de regla con el token del destinatario.

## Notas para varios bots

Las reglas de inserción están claveadas por `ruleId`: volver a ejecutar `PUT` con el mismo ID actualiza una única regla. Para varios bots OpenClaw que notifican al mismo destinatario, cree una regla por bot con una coincidencia de remitente distinta.

Las nuevas reglas `override` definidas por el usuario se insertan antes de las reglas de supresión predeterminadas, por lo que no se necesita ningún parámetro de orden adicional. La regla solo afecta a las ediciones de vista previa de solo texto que pueden finalizarse en su lugar; los respaldos de medios y los respaldos de vista previa obsoleta usan la entrega normal de Matrix.

## Notas del servidor doméstico

<AccordionGroup>
  <Accordion title="Synapse">
    No se requiere ningún cambio especial en `homeserver.yaml`. Si las notificaciones normales de Matrix ya llegan a este usuario, el token del destinatario + la llamada `pushrules` anterior es el paso principal de configuración.

    Si ejecuta Synapse detrás de un proxy inverso o de trabajadores, asegúrese de que `/_matrix/client/.../pushrules/` llegue correctamente a Synapse. La entrega de notificaciones es manejada por el proceso principal o por los trabajadores de empuje (pusher) `synapse.app.pusher` / configurados; asegúrese de que estén saludables.

    La regla utiliza la condición de regla de empuje `event_property_is` (MSC3758, regla de empuje v1.10), que se añadió a Synapse en 2023. Las versiones antiguas de Synapse aceptan la llamada `PUT pushrules/...` pero nunca coinciden con la condición silenciosamente; actualice Synapse si no llega ninguna notificación en una edición de vista previa finalizada.

  </Accordion>

  <Accordion title="Tuwunel">
    El mismo flujo que Synapse; no se necesita ninguna configuración específica de Tuwunel para el marcador de vista previa finalizada.

    Si las notificaciones desaparecen mientras el usuario está activo en otro dispositivo, compruebe si `suppress_push_when_active` está habilitado. Tuwunel añadió esta opción en la versión 1.4.2 (septiembre de 2025) y puede suprimir intencionalmente las notificaciones a otros dispositivos mientras uno está activo.

  </Accordion>
</AccordionGroup>

## Relacionado

- [Configuración del canal de Matrix](/es/channels/matrix)
- [Conceptos de streaming](/es/concepts/streaming)
