---
title: "Poda de Sesiones"
summary: "Poda de sesiones: recorte de resultados de herramientas para reducir la hinchazón del contexto"
read_when:
  - Quieres reducir el crecimiento del contexto del LLM a partir de las salidas de herramientas
  - Estás ajustando agents.defaults.contextPruning
---

# Poda de Sesiones

La poda de sesiones recorta **antiguos resultados de herramientas** del contexto en memoria justo antes de cada llamada al LLM. **No** reescribe el historial de sesiones en disco (`*.jsonl`).

## Cuándo se ejecuta

- Cuando `mode: "cache-ttl"` está habilitado y la última llamada a Anthropic para la sesión es más antigua que `ttl`.
- Solo afecta a los mensajes enviados al modelo para esa solicitud.
- Solo está activo para las llamadas a la API de Anthropic (y modelos Anthropic de OpenRouter).
- Para obtener los mejores resultados, haz coincidir `ttl` con tu política de `cacheRetention` del modelo (`short` = 5m, `long` = 1h).
- Después de una poda, la ventana TTL se restablece para que las solicitudes posteriores mantengan el caché hasta que `ttl` expire de nuevo.

## Valores predeterminados inteligentes (Anthropic)

- Perfiles **OAuth o setup-token**: habilitar la poda `cache-ttl` y establecer el latido en `1h`.
- Perfiles **API key**: habilitar la poda `cache-ttl`, establecer el latido en `30m` y predeterminar `cacheRetention: "short"` en los modelos Anthropic.
- Si estableces explícitamente alguno de estos valores, OpenClaw **no** los anulará.

## Qué mejora esto (costo + comportamiento del caché)

- **Por qué podar:** El almacenamiento en caché de prompts de Anthropic solo se aplica dentro del TTL. Si una sesión permanece inactiva más allá del TTL, la siguiente solicitud vuelve a almacenar en caché el prompt completo a menos que lo recortes primero.
- **Qué se vuelve más barato:** la poda reduce el tamaño de **cacheWrite** para esa primera solicitud después de que expire el TTL.
- **Por qué importa el restablecimiento del TTL:** una vez que se ejecuta la poda, la ventana de caché se restablece, por lo que las solicitudes de seguimiento pueden reutilizar el prompt recién almacenado en caché en lugar de volver a almacenar en caché el historial completo.
- **Lo que no hace:** la poda no añade tokens ni costos "doblados"; solo cambia lo que se almacena en caché en esa primera solicitud posterior al TTL.

## Qué se puede podar

- Solo mensajes `toolResult`.
- Los mensajes de usuario + asistente **nunca** se modifican.
- Los últimos `keepLastAssistants` mensajes del asistente están protegidos; los resultados de herramientas después de ese punto de corte no se podan.
- Si no hay suficientes mensajes del asistente para establecer el punto de corte, se omite la poda.
- Los resultados de herramientas que contienen **bloques de imagen** se omiten (nunca se recortan/borran).

## Estimación de la ventana de contexto

La poda utiliza una ventana de contexto estimada (caracteres ≈ tokens × 4). La ventana base se resuelve en este orden:

1. Invalidación de `models.providers.*.models[].contextWindow`.
2. Definición del modelo `contextWindow` (del registro de modelos).
3. Predeterminado `200000` tokens.

Si se establece `agents.defaults.contextTokens`, se trata como un límite (mínimo) en la ventana resuelta.

## Modo

### cache-ttl

- La poda solo se ejecuta si la última llamada a Anthropic es anterior a `ttl` (predeterminado `5m`).
- Cuando se ejecuta: el mismo comportamiento de recorte suave + borrado duro que antes.

## Poda suave vs. dura

- **Recorte suave (Soft-trim)**: solo para resultados de herramientas demasiado grandes.
  - Mantiene el encabezado + la cola, inserta `...` y añade una nota con el tamaño original.
  - Omite los resultados con bloques de imagen.
- **Borrado duro (Hard-clear)**: reemplaza todo el resultado de la herramienta con `hardClear.placeholder`.

## Selección de herramientas

- `tools.allow` / `tools.deny` soportan comodines `*`.
- Denegar tiene prioridad.
- La coincidencia no distingue entre mayúsculas y minúsculas.
- Lista de permitidos vacía => todas las herramientas permitidas.

## Interacción con otros límites

- Las herramientas integradas ya truncan su propia salida; la poda de sesión es una capa adicional que evita que los chats de larga duración acumulen demasiada salida de herramientas en el contexto del modelo.
- La compactación es separada: la compactación resume y persiste, la poda es transitoria por solicitud. Consulte [/concepts/compaction](/es/concepts/compaction).

## Valores predeterminados (cuando está habilitado)

- `ttl`: `"5m"`
- `keepLastAssistants`: `3`
- `softTrimRatio`: `0.3`
- `hardClearRatio`: `0.5`
- `minPrunableToolChars`: `50000`
- `softTrim`: `{ maxChars: 4000, headChars: 1500, tailChars: 1500 }`
- `hardClear`: `{ enabled: true, placeholder: "[Old tool result content cleared]" }`

## Ejemplos

Predeterminado (desactivado):

```json5
{
  agents: { defaults: { contextPruning: { mode: "off" } } },
}
```

Activar poda con conocimiento de TTL:

```json5
{
  agents: { defaults: { contextPruning: { mode: "cache-ttl", ttl: "5m" } } },
}
```

Restringir la poda a herramientas específicas:

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl",
        tools: { allow: ["exec", "read"], deny: ["*image*"] },
      },
    },
  },
}
```

Consulte la referencia de configuración: [Gateway Configuration](/es/gateway/configuration)

import es from "/components/footer/es.mdx";

<es />
