---
title: "Poda de sesión"
summary: "Recortar resultados de herramientas antiguos para mantener el contexto ligero y el almacenamiento en caché eficiente"
read_when:
  - You want to reduce context growth from tool outputs
  - You want to understand Anthropic prompt cache optimization
---

# Session Pruning

La poda de sesiones recorta **antiguos resultados de herramientas** del contexto antes de cada llamada a la LLM. Reduce la hinchazón del contexto causada por la acumulación de salidas de herramientas (resultados de ejecución, lecturas de archivos, resultados de búsqueda) sin reescribir el texto normal de la conversación.

<Info>La poda se realiza solo en memoria; no modifica la transcripción de la sesión en el disco. Su historial completo siempre se conserva.</Info>

## Por qué es importante

Las sesiones largas acumulan salidas de herramientas que inflan la ventana de contexto. Esto aumenta el costo y puede forzar la [compactación](/en/concepts/compaction) antes de lo necesario.

La poda es especialmente valiosa para el **almacenamiento en caché de prompt de Anthropic**. Una vez que el TTL
del caché expira, la siguiente solicitud vuelve a almacenar en caché el prompt completo. La poda reduce el
tamaño de escritura del caché, reduciendo directamente el costo.

## Cómo funciona

1. Esperar a que expire el TTL del caché (por defecto 5 minutos).
2. Encuentra antiguos resultados de herramientas para la poda normal (el texto de la conversación se deja intacto).
3. **Recorte suave** de los resultados excesivamente grandes -- mantener el principio y el final, insertar `...`.
4. **Limpieza dura** del resto -- reemplazar con un marcador de posición.
5. Restablecer el TTL para que las solicitudes de seguimiento reutilicen el caché actualizado.

## Limpieza de imágenes heredadas

OpenClaw también ejecuta una limpieza idempotente separada para sesiones heredadas antiguas que persistieron bloques de imagen sin procesar en el historial.

- Preserva los **3 turnos completados más recientes** byte por byte para que los prefijos de caché de avisos para seguimientos recientes se mantengan estables.
- Los bloques de imagen ya procesados y más antiguos en el historial `user` o `toolResult` pueden ser reemplazados por `[image data removed - already processed by model]`.
- Esto es independiente de la poda normal de TTL de caché. Existe para evitar que las cargas de imágenes repetidas invaliden las cachés de avisos en turnos posteriores.

## Valores predeterminados inteligentes

OpenClaw habilita automáticamente la poda para los perfiles de Anthropic:

| Tipo de perfil                                                             | Poda habilitada | Latido |
| -------------------------------------------------------------------------- | --------------- | ------ |
| Autenticación OAuth/token de Anthropic (incluyendo el reuso de Claude CLI) | Sí              | 1 hora |
| Clave de API                                                               | Sí              | 30 min |

Si estableces valores explícitos, OpenClaw no los sobrescribirá.

## Habilitar o deshabilitar

La poda está desactivada por defecto para proveedores que no son Anthropic. Para habilitarla:

```json5
{
  agents: {
    defaults: {
      contextPruning: { mode: "cache-ttl", ttl: "5m" },
    },
  },
}
```

Para deshabilitar: establece `mode: "off"`.

## Poda vs. compactación

|                | Poda                               | Compactación             |
| -------------- | ---------------------------------- | ------------------------ |
| **Qué**        | Recorta resultados de herramientas | Resume la conversación   |
| **¿Guardado?** | No (por solicitud)                 | Sí (en la transcripción) |
| **Alcance**    | Solo resultados de herramientas    | Conversación completa    |

Se complementan entre sí -- la poda mantiene la salida de herramientas ligera entre los ciclos de compactación.

## Lecturas adicionales

- [Compactación](/en/concepts/compaction) -- reducción de contexto basada en resúmenes
- [Configuración de Gateway](/en/gateway/configuration) -- todos los controles de configuración de poda
  (`contextPruning.*`)
