---
title: "Groq"
summary: "Configuración de Groq (autenticación + selección de modelo)"
read_when:
  - You want to use Groq with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Groq

[Groq](https://groq.com) ofrece inferencia ultra rápida en modelos de código abierto
(Llama, Gemma, Mistral y más) utilizando hardware LPU personalizado. OpenClaw se conecta
a Groq a través de su API compatible con OpenAI.

- Proveedor: `groq`
- Autenticación: `GROQ_API_KEY`
- API: Compatible con OpenAI

## Inicio rápido

1. Obtenga una clave de API desde [console.groq.com/keys](https://console.groq.com/keys).

2. Configure la clave de API:

```bash
export GROQ_API_KEY="gsk_..."
```

3. Configure un modelo predeterminado:

```json5
{
  agents: {
    defaults: {
      model: { primary: "groq/llama-3.3-70b-versatile" },
    },
  },
}
```

## Ejemplo de archivo de configuración

```json5
{
  env: { GROQ_API_KEY: "gsk_..." },
  agents: {
    defaults: {
      model: { primary: "groq/llama-3.3-70b-versatile" },
    },
  },
}
```

## Transcripción de audio

Groq también ofrece una transcripción de audio rápida basada en Whisper. Cuando se configura como un
proveedor de comprensión de medios, OpenClaw utiliza el modelo `whisper-large-v3-turbo`
de Groq para transcribir mensajes de voz.

```json5
{
  media: {
    understanding: {
      audio: {
        models: [{ provider: "groq" }],
      },
    },
  },
}
```

## Nota sobre el entorno

Si la Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que `GROQ_API_KEY` esté
disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través
de `env.shellEnv`).

## Modelos disponibles

El catálogo de modelos de Groq cambia con frecuencia. Ejecute `openclaw models list | grep groq`
para ver los modelos disponibles actualmente, o consulte
[console.groq.com/docs/models](https://console.groq.com/docs/models).

Las opciones populares incluyen:

- **Llama 3.3 70B Versátil** - uso general, contexto grande
- **Llama 3.1 8B Instant** - rápido, ligero
- **Gemma 2 9B** - compacto, eficiente
- **Mixtral 8x7B** - arquitectura MoE, razonamiento fuerte

## Enlaces

- [Consola de Groq](https://console.groq.com)
- [Documentación de la API](https://console.groq.com/docs)
- [Lista de modelos](https://console.groq.com/docs/models)
- [Precios](https://groq.com/pricing)
