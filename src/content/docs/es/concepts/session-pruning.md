---
title: "Poda de sesión"
summary: "Recortar resultados de herramientas antiguos para mantener el contexto ligero y el almacenamiento en caché eficiente"
read_when:
  - You want to reduce context growth from tool outputs
  - You want to understand Anthropic prompt cache optimization
---

# Session Pruning

La poda de sesión recorta **resultados de herramientas antiguos** del contexto antes de cada llamada al LLM. Reduce la hinchazón del contexto causada por la acumulación de resultados de herramientas (resultados de ejecución, lecturas de archivos, resultados de búsqueda) sin tocar sus mensajes de conversación.

<Info>La poda se realiza solo en memoria; no modifica la transcripción de la sesión en el disco. Su historial completo siempre se conserva.</Info>

## Por qué es importante

Las sesiones largas acumulan resultados de herramientas que inflan la ventana de contexto. Esto
aumenta el costo y puede forzar la [compactación](/en/concepts/compaction) antes de
lo necesario.

La poda es especialmente valiosa para el **almacenamiento en caché de prompt de Anthropic**. Una vez que el TTL
del caché expira, la siguiente solicitud vuelve a almacenar en caché el prompt completo. La poda reduce el
tamaño de escritura del caché, reduciendo directamente el costo.

## Cómo funciona

1. Esperar a que expire el TTL del caché (por defecto 5 minutos).
2. Buscar resultados de herramientas antiguos (los mensajes del usuario y del asistente nunca se tocan).
3. **Recorte suave** de los resultados excesivamente grandes -- mantener el principio y el final, insertar `...`.
4. **Limpieza dura** del resto -- reemplazar con un marcador de posición.
5. Restablecer el TTL para que las solicitudes de seguimiento reutilicen el caché actualizado.

## Valores predeterminados inteligentes

OpenClaw habilita automáticamente la poda para los perfiles de Anthropic:

| Tipo de perfil                 | Poda habilitada | Latido (Heartbeat) |
| ------------------------------ | --------------- | ------------------ |
| OAuth o token de configuración | Sí              | 1 hora             |
| Clave de API                   | Sí              | 30 min             |

Si establece valores explícitos, OpenClaw no los anulará.

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

Para deshabilitar: establecer `mode: "off"`.

## Poda frente a compactación

|                | Poda                               | Compactación             |
| -------------- | ---------------------------------- | ------------------------ |
| **Qué**        | Recorta resultados de herramientas | Resume la conversación   |
| **¿Guardado?** | No (por solicitud)                 | Sí (en la transcripción) |
| **Alcance**    | Solo resultados de herramientas    | Conversación completa    |

Se complementan entre sí: la poda mantiene el resultado de las herramientas ligero entre
los ciclos de compactación.

## Lecturas adicionales

- [Compactación](/en/concepts/compaction) -- reducción de contexto basada en resumen
- [Configuración de Gateway](/en/gateway/configuration) -- todos los controles de configuración de poda
  (`contextPruning.*`)
