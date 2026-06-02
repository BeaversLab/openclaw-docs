---
summary: "Usar Ollama Cloud directamente con OpenClaw"
read_when:
  - You want to use hosted Ollama models without a local Ollama server
  - You need the ollama-cloud provider id, key, or endpoint
title: "Ollama Cloud"
---

Ollama Cloud es la API de modelo alojado de Ollama. Permite que OpenClaw llame a modelos alojados por Ollama
directamente, sin instalar un servidor Ollama local ni iniciar sesión en una aplicación Ollama local en modo en la nube. Use el id del proveedor `ollama-cloud` y referencias de modelo como
`ollama-cloud/kimi-k2.6`.

Esta página es para el enrutamiento directo solo en la nube. El proveedor utiliza el estilo nativo
de Ollama `/api/chat`, no la ruta compatible con OpenAI `/v1`. OpenClaw lo registra
como un id de proveedor separado para que las credenciales solo en la nube, el descubrimiento dinámico del catálogo y la
selección de modelos no se mezclen con un host local `ollama`.

Use esta página cuando desee un enrutamiento solo en la nube. Para Ollama local, enrutamiento híbrido
nube más local, incrustaciones y detalles de host personalizados, consulte
[Ollama](/es/providers/ollama).

## Configuración

Cree una clave de API de Ollama Cloud en [ollama.com/settings/keys](https://ollama.com/settings/keys), luego ejecute:

```bash
openclaw onboard --auth-choice ollama-cloud
```

O establezca:

```bash
export OLLAMA_API_KEY="<your-ollama-cloud-api-key>" # pragma: allowlist secret
```

## Valores predeterminados

- Proveedor: `ollama-cloud`
- URL base: `https://ollama.com`
- Variable de entorno: `OLLAMA_API_KEY`
- Estilo de API: Ollama nativo `/api/chat`
- Modelo de ejemplo: `ollama-cloud/kimi-k2.6`

## Cuándo elegir Ollama Cloud

- Desea modelos alojados de Ollama sin ejecutar `ollama serve` localmente.
- Desea la misma forma de API de chat nativa de Ollama que OpenClaw usa para Ollama
  local, pero apuntando a `https://ollama.com`.
- Desea una ruta sencilla en la nube para modelos que ya están en el catálogo
  alojado de Ollama.
- No necesita descargas de modelos locales, control de GPU local ni inferencia solo en LAN.

Use [Ollama](/es/providers/ollama) en su lugar cuando desee un enrutamiento solo local o
nube más local a través de un host Ollama con sesión iniciada. Use un proveedor
compatible con OpenAI en su lugar cuando necesite semántica `/v1/chat/completions`
o características específicas del proveedor estilo OpenAI.

## Modelos

OpenClaw descubre modelos de Ollama Cloud desde el catálogo alojado en vivo. Los ids alojados
comúnmente disponibles incluyen:

- `ollama-cloud/gpt-oss:20b`
- `ollama-cloud/kimi-k2.6`
- `ollama-cloud/deepseek-v4-flash`
- `ollama-cloud/minimax-m2.7`
- `ollama-cloud/glm-5`

Use a model id from your current hosted catalog:

```bash
openclaw models list --provider ollama-cloud
openclaw models set ollama-cloud/kimi-k2.6
```

Model ids are cloud catalog ids, not local pull names. If a model name works in
a local Ollama host but is absent from the hosted catalog, use the `ollama`
provider with that local host instead.

## Live test

For Ollama Cloud API-key smoke tests, point the Ollama live test at the hosted
endpoint and choose a model from your current catalog:

```bash
export OLLAMA_API_KEY="<your-ollama-cloud-api-key>" # pragma: allowlist secret

OPENCLAW_LIVE_TEST=1 \
OPENCLAW_LIVE_OLLAMA=1 \
OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com \
OPENCLAW_LIVE_OLLAMA_MODEL=kimi-k2.6 \
OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=1 \
pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

The cloud smoke runs text, native stream, and web search. It skips embeddings by
default for `https://ollama.com` because Ollama Cloud API keys may not authorize
`/api/embed`.

## Troubleshooting

- `Set OLLAMA_API_KEY` errors: provide a real cloud API key. The local
  `ollama-local` marker is only for local or private Ollama hosts.
- Unknown model errors: run `openclaw models list --provider ollama-cloud` and
  copy the hosted model id exactly.
- Tool-call or raw JSON issues on custom Ollama hosts: check whether you are
  accidentally using an OpenAI-compatible `/v1` URL. Ollama routes should use
  the native base URL with no `/v1` suffix.

## Related

- [Ollama](/es/providers/ollama)
- [Model providers](/es/concepts/model-providers)
- [All providers](/es/providers/index)
