---
title: "Session Pruning"
summary: "Session pruning: tool-result trimming to reduce context bloat"
read_when:
  - You want to reduce LLM context growth from tool outputs
  - You are tuning agents.defaults.contextPruning
---

# Session Pruning

Session pruning trims **old tool results** from the in-memory context right before each LLM call. It does **not** rewrite the on-disk session history (`*.jsonl`).

## When it runs

- When `mode: "cache-ttl"` is enabled and the last Anthropic call for the session is older than `ttl`.
- Only affects the messages sent to the model for that request.
- Only active for Anthropic API calls (and OpenRouter Anthropic models).
- For best results, match `ttl` to your model `cacheRetention` policy (`short` = 5m, `long` = 1h).
- After a prune, the TTL window resets so subsequent requests keep cache until `ttl` expires again.

## Smart defaults (Anthropic)

- **OAuth or setup-token** profiles: enable `cache-ttl` pruning and set heartbeat to `1h`.
- **API key** profiles: enable `cache-ttl` pruning, set heartbeat to `30m`, and default `cacheRetention: "short"` on Anthropic models.
- If you set any of these values explicitly, OpenClaw does **not** override them.

## What this improves (cost + cache behavior)

- **Why prune:** Anthropic prompt caching only applies within the TTL. If a session goes idle past the TTL, the next request re-caches the full prompt unless you trim it first.
- **What gets cheaper:** pruning reduces the **cacheWrite** size for that first request after the TTL expires.
- **Why the TTL reset matters:** once pruning runs, the cache window resets, so follow‑up requests can reuse the freshly cached prompt instead of re-caching the full history again.
- **What it does not do:** pruning doesn’t add tokens or “double” costs; it only changes what gets cached on that first post‑TTL request.

## What can be pruned

- Only `toolResult` messages.
- User + assistant messages are **never** modified.
- Los últimos `keepLastAssistants` mensajes del asistente están protegidos; los resultados de las herramientas después de ese punto de corte no se eliminan.
- Si no hay suficientes mensajes del asistente para establecer el punto de corte, se omite la eliminación.
- Los resultados de las herramientas que contienen **bloques de imagen** se omiten (nunca se recortan/borran).

## Estimación de la ventana de contexto

La eliminación utiliza una ventana de contexto estimada (caracteres ≈ tokens × 4). La ventana base se resuelve en este orden:

1. `models.providers.*.models[].contextWindow` anulación.
2. Definición del modelo `contextWindow` (del registro de modelos).
3. Por defecto `200000` tokens.

Si se establece `agents.defaults.contextTokens`, se trata como un límite (mínimo) en la ventana resuelta.

## Modo

### cache-ttl

- La eliminación solo se ejecuta si la última llamada a Anthropic es anterior a `ttl` (por defecto `5m`).
- Cuando se ejecuta: el mismo comportamiento de recorte suave (soft-trim) + borrado duro (hard-clear) que antes.

## Recorte suave vs. duro

- **Recorte suave (Soft-trim)**: solo para resultados de herramientas excesivamente grandes.
  - Mantiene el principio + el final, inserta `...` y añade una nota con el tamaño original.
  - Omite los resultados con bloques de imagen.
- **Borrado duro (Hard-clear)**: reemplaza todo el resultado de la herramienta con `hardClear.placeholder`.

## Selección de herramientas

- `tools.allow` / `tools.deny` admiten comodines `*`.
- Denegar gana.
- La coincidencia no distingue entre mayúsculas y minúsculas.
- Lista de permitidos vacía => todas las herramientas permitidas.

## Interacción con otros límites

- Las herramientas integradas ya truncan su propia salida; la eliminación de sesiones es una capa adicional que evita que las conversaciones largas acumulen demasiada salida de herramientas en el contexto del modelo.
- La compactación es independiente: la compactación resume y persiste, la eliminación es transitoria por solicitud. Consulte [/concepts/compaction](/es/concepts/compaction).

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

Activar poda consciente de TTL:

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

Consultar referencia de configuración: [Configuración de Gateway](/es/gateway/configuration)

import es from "/components/footer/es.mdx";

<es />
