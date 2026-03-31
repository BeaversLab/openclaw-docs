---
title: "Perplexity (Proveedor)"
summary: "Configuración del proveedor de búsqueda web Perplexity (clave API, modos de búsqueda, filtrado)"
read_when:
  - You want to configure Perplexity as a web search provider
  - You need the Perplexity API key or OpenRouter proxy setup
---

# Perplexity (Proveedor de búsqueda web)

El complemento Perplexity proporciona capacidades de búsqueda web a través de la API de
búsqueda Perplexity o Perplexity Sonar a través de OpenRouter.

<Note>Esta página cubre la configuración del **proveedor** de Perplexity. Para la **herramienta** de Perplexity (cómo la usa el agente), consulte [Herramienta Perplexity](/en/tools/perplexity-search).</Note>

- Tipo: proveedor de búsqueda web (no un proveedor de modelos)
- Autenticación: `PERPLEXITY_API_KEY` (directo) o `OPENROUTER_API_KEY` (a través de OpenRouter)
- Ruta de configuración: `plugins.entries.perplexity.config.webSearch.apiKey`

## Inicio rápido

1. Establezca la clave API:

```bash
openclaw configure --section web
```

O configúrela directamente:

```bash
openclaw config set plugins.entries.perplexity.config.webSearch.apiKey "pplx-xxxxxxxxxxxx"
```

2. El agente utilizará automáticamente Perplexity para búsquedas web cuando esté configurado.

## Modos de búsqueda

El complemento selecciona automáticamente el transporte según el prefijo de la clave API:

| Prefijo de clave | Transporte                        | Características                                           |
| ---------------- | --------------------------------- | --------------------------------------------------------- |
| `pplx-`          | API de búsqueda Perplexity nativa | Resultados estructurados, filtros de dominio/idioma/fecha |
| `sk-or-`         | OpenRouter (Sonar)                | Respuestas sintetizadas por IA con citas                  |

## Filtrado de API nativa

Al usar la API nativa de Perplexity (clave `pplx-`), las búsquedas admiten:

- **País**: código de país de dos letras
- **Idioma**: código de idioma ISO 639-1
- **Rango de fechas**: día, semana, mes, año
- **Filtros de dominio**: lista de permitidos/bloqueados (máximo 20 dominios)
- **Presupuesto de contenido**: `max_tokens`, `max_tokens_per_page`

## Nota sobre el entorno

Si Gateway se ejecuta como demonio (launchd/systemd), asegúrese de que
`PERPLEXITY_API_KEY` esté disponible para ese proceso (por ejemplo, en
`~/.openclaw/.env` o a través de `env.shellEnv`).
