---
summary: "Ejecutar OpenClaw a través de inferrs (servidor local compatible con OpenAI)"
read_when:
  - You want to run OpenClaw against a local inferrs server
  - You are serving Gemma or another model through inferrs
  - You need the exact OpenClaw compat flags for inferrs
title: "inferrs"
---

# inferrs

[inferrs](https://github.com/ericcurtin/inferrs) puede servir modelos locales detrás de una
API `/v1` compatible con OpenAI. OpenClaw funciona con `inferrs` a través de la ruta
genérica `openai-completions`.

`inferrs` actualmente se trata mejor como un backend
autoalojado personalizado compatible con OpenAI, no como un complemento de
proveedor dedicado de OpenClaw.

## Inicio rápido

1. Inicie `inferrs` con un modelo.

Ejemplo:

```bash
inferrs serve gg-hf-gg/gemma-4-E2B-it \
  --host 127.0.0.1 \
  --port 8080 \
  --device metal
```

2. Verifique que el servidor sea accesible.

```bash
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8080/v1/models
```

3. Agregue una entrada de proveedor OpenClaw explícita y apunte su modelo predeterminado\ hacia ella.

## Ejemplo de configuración completa

Este ejemplo usa Gemma 4 en un servidor `inferrs` local.

```json5
{
  agents: {
    defaults: {
      model: { primary: "inferrs/gg-hf-gg/gemma-4-E2B-it" },
      models: {
        "inferrs/gg-hf-gg/gemma-4-E2B-it": {
          alias: "Gemma 4 (inferrs)",
        },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      inferrs: {
        baseUrl: "http://127.0.0.1:8080/v1",
        apiKey: "inferrs-local",
        api: "openai-completions",
        models: [
          {
            id: "gg-hf-gg/gemma-4-E2B-it",
            name: "Gemma 4 E2B (inferrs)",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 131072,
            maxTokens: 4096,
            compat: {
              requiresStringContent: true,
            },
          },
        ],
      },
    },
  },
}
```

## Por qué `requiresStringContent` es importante

Algunas rutas de Chat Completions de `inferrs` aceptan solo
`messages[].content` de cadena, no matrices de partes de contenido estructuradas.

Si las ejecuciones de OpenClaw fallan con un error como:

```text
messages[1].content: invalid type: sequence, expected a string
```

establezca:

```json5
compat: {
  requiresStringContent: true
}
```

OpenClaw aplanará las partes de contenido de texto puro en cadenas simples antes de
enviar la solicitud.

## Advertencia sobre Gemma y el esquema de herramientas

Algunas combinaciones actuales de `inferrs` + Gemma aceptan pequeñas
solicitudes directas de `/v1/chat/completions` pero aún fallan en turnos completos
del tiempo de ejecución del agente OpenClaw.

Si eso sucede, pruebe esto primero:

```json5
compat: {
  requiresStringContent: true,
  supportsTools: false
}
```

Esto deshabilita la superficie del esquema de herramientas de OpenClaw para el modelo
y puede reducir la presión del prompt en backends locales más estrictos.

Si las solicitudes directas diminutas aún funcionan pero los turnos normales del agente
OpenClaw siguen fallando dentro de `inferrs`, el problema restante generalmente\ se debe al comportamiento del modelo/servidor ascendente en lugar de la capa de\ transporte de OpenClaw.

## Prueba manual de humo

Una vez configurado, pruebe ambas capas:

```bash
curl http://127.0.0.1:8080/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"gg-hf-gg/gemma-4-E2B-it","messages":[{"role":"user","content":"What is 2 + 2?"}],"stream":false}'

openclaw infer model run \
  --model inferrs/gg-hf-gg/gemma-4-E2B-it \
  --prompt "What is 2 + 2? Reply with one short sentence." \
  --json
```

Si el primer comando funciona pero el segundo falla, use las notas de solución de
problemas a continuación.

## Solución de problemas

- `curl /v1/models` falla: `inferrs` no se está ejecutando, no es accesible o no
  está vinculado al host/puerto esperado.
- `messages[].content ... expected a string`: establezca
  `compat.requiresStringContent: true`.
- Las llamadas directas tiny `/v1/chat/completions` pasan, pero `openclaw infer model run`
  falla: intenta `compat.supportsTools: false`.
- OpenClaw ya no obtiene errores de esquema, pero `inferrs` todavía falla en turnos
  de agente más grandes: trátalo como una limitación ascendente de `inferrs` o del modelo y reduce
  la presión del aviso o cambia el backend/modelo local.

## Comportamiento de estilo proxy

`inferrs` se trata como un backend `/v1` compatible con OpenAI de estilo proxy, no como
un punto final nativo de OpenAI.

- la conformación de solicitudes solo nativas de OpenAI no se aplica aquí
- sin `service_tier`, sin Respuestas `store`, sin sugerencias de caché de avisos y sin
  conformación de carga útil compatible con razonamiento de OpenAI
- los encabezados de atribución ocultos de OpenClaw (`originator`, `version`, `User-Agent`)
  no se inyectan en URLs base `inferrs` personalizadas

## Véase también

- [Modelos locales](/en/gateway/local-models)
- [Solución de problemas de la puerta de enlace](/en/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail)
- [Proveedores de modelos](/en/concepts/model-providers)
