---
summary: "Recortar resultados de herramientas antiguos para mantener el contexto ligero y el almacenamiento en caché eficiente"
title: "Poda de sesión"
read_when:
  - You want to reduce context growth from tool outputs
  - You want to understand Anthropic prompt cache optimization
---

La poda de sesión recorta **resultados de herramientas antiguos** del contexto antes de cada llamada al LLM. Esto reduce la hinchazón del contexto causada por la acumulación de salidas de herramientas (resultados de ejecución, lecturas de archivos, resultados de búsqueda) sin reescribir el texto normal de la conversación.

<Info>La poda se realiza solo en memoria -- no modifica la transcripción de la sesión en disco. Su historial completo siempre se conserva.</Info>

## Por qué es importante

Las sesiones largas acumulan salidas de herramientas que inflan la ventana de contexto. Esto aumenta el costo y puede forzar la [compactación](/es/concepts/compaction) antes de lo necesario.

La poda es especialmente valiosa para el **almacenamiento en caché de prompts de Anthropic**. Después de que caduca el TTL de la caché, la siguiente solicitud vuelve a almacenar en caché el prompt completo. La poda reduce el tamaño de escritura en la caché, reduciendo directamente el costo.

## Cómo funciona

1. Espere a que el TTL de la caché caduque (por defecto 5 minutos).
2. Busque resultados de herramientas antiguos para la poda normal (el texto de la conversación se deja intacto).
3. **Recorte suave** de los resultados excesivamente grandes -- mantenga el principio y el final, inserte `...`.
4. **Limpieza dura** del resto -- reemplácelo con un marcador de posición.
5. Restablezca el TTL para que las solicitudes de seguimiento reutilicen la caché actualizada.

## Limpieza de imágenes heredadas

OpenClaw también crea una vista de reproducción idempotente separada para sesiones que persisten bloques de imagen sin procesar o marcadores de medios de hidratación de prompts en el historial.

- Preserva **los 3 turnos completados más recientes** byte por byte para que los prefijos de caché de prompts para seguimientos recientes se mantengan estables.
- En la vista de reproducción, los bloques de imagen antiguos ya procesados del historial de `user` o `toolResult` pueden ser reemplazados por `[image data removed - already processed by model]`.
- Las referencias de medios textuales más antiguas, como `[media attached: ...]`, `[Image: source: ...]` y `media://inbound/...`, pueden ser reemplazadas por `[media reference removed - already processed by model]`. Los marcadores de archivos adjuntos del turno actual permanecen intactos para que los modelos de visión aún puedan hidratar imágenes nuevas.
- La transcripción de la sesión en bruto no se reescribe, por lo que los visores del historial aún pueden representar las entradas de mensaje originales y sus imágenes.
- Esto es independiente de la poda normal de TTL de caché. Existe para evitar que
  las cargas útiles de imágenes repetidas o las referencias a medios obsoletos
  invaliden las cachés de avisos en turnos posteriores.

## Valores predeterminados inteligentes

OpenClaw habilita automáticamente la poda para los perfiles de Anthropic:

| Tipo de perfil                                                 | Poda habilitada | Latido |
| -------------------------------------------------------------- | --------------- | ------ |
| Anthropic OAuth/token auth (incluyendo el reuso de Claude CLI) | Sí              | 1 hora |
| Clave de API                                                   | Sí              | 30 min |

Si establece valores explícitos, OpenClaw no los sobrescribirá.

## Habilitar o deshabilitar

La poda está desactivada de forma predeterminada para proveedores que no son de Anthropic. Para habilitarla:

```json5
{
  agents: {
    defaults: {
      contextPruning: { mode: "cache-ttl", ttl: "5m" },
    },
  },
}
```

Para deshabilitar: establezca `mode: "off"`.

## Poda vs compactación

|                | Poda                               | Compactación             |
| -------------- | ---------------------------------- | ------------------------ |
| **Qué**        | Recorta resultados de herramientas | Resume la conversación   |
| **¿Guardado?** | No (por solicitud)                 | Sí (en la transcripción) |
| **Alcance**    | Solo resultados de herramientas    | Toda la conversación     |

Se complementan entre sí: la poda mantiene la salida de las herramientas ligera entre
los ciclos de compactación.

## Lectura adicional

- [Compactación](/es/concepts/compaction) -- reducción de contexto basada en resumen
- [Configuración de Gateway](/es/gateway/configuration) -- todos los controles de configuración de poda
  (`contextPruning.*`)

## Relacionado

- [Gestión de sesiones](/es/concepts/session)
- [Herramientas de sesión](/es/concepts/session-tool)
- [Motor de contexto](/es/concepts/context-engine)
