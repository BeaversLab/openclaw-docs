---
summary: "Ejecutar OpenClaw a través de inferrs (servidor local compatible con OpenAI)"
read_when:
  - You want to run OpenClaw against a local inferrs server
  - You are serving Gemma or another model through inferrs
  - You need the exact OpenClaw compat flags for inferrs
title: "Inferrs"
---

[inferrs](https://github.com/ericcurtin/inferrs) puede servir modelos locales detrás de una API compatible con `/v1`. OpenClaw funciona con `inferrs` a través de la ruta genérica `openai-completions`.

| Propiedad                            | Valor                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| ID del proveedor                     | `inferrs` (personalizado; configurar bajo `models.providers.inferrs`)            |
| Complemento                          | ninguno — `inferrs` no es un complemento de proveedor OpenClaw incluido          |
| Variable de entorno de autenticación | Opcional. Cualquier valor funciona si su servidor inferrs no tiene autenticación |
| API                                  | Compatible con OpenAI (`openai-completions`)                                     |
| URL base sugerida                    | `http://127.0.0.1:8080/v1` (o dondequiera que se encuentre su servidor inferrs)  |

<Note>
  `inferrs` se trata mejor actualmente como un backend personalizado autoalojado compatible con OpenAI, no como un complemento de proveedor OpenClaw dedicado. Lo configura a través de `models.providers.inferrs` en lugar de una marca de elección de incorporación. Si necesita un complemento incluido real con autodetección, consulte [SGLang](/es/providers/sglang) o [vLLM](/es/providers/vllm).
</Note>

## Introducción

<Steps>
  <Step title="Inicie inferrs con un modelo">```bash inferrs serve google/gemma-4-E2B-it \ --host 127.0.0.1 \ --port 8080 \ --device metal ```</Step>
  <Step title="Verifique que el servidor sea accesible">```bash curl http://127.0.0.1:8080/health curl http://127.0.0.1:8080/v1/models ```</Step>
  <Step title="Añada una entrada de proveedor OpenClaw">Añada una entrada de proveedor explícita y dirija su modelo predeterminado hacia ella. Consulte el ejemplo de configuración completo a continuación.</Step>
</Steps>

## Ejemplo de configuración completa

Este ejemplo usa Gemma 4 en un servidor `inferrs` local.

```json5
{
  agents: {
    defaults: {
      model: { primary: "inferrs/google/gemma-4-E2B-it" },
      models: {
        "inferrs/google/gemma-4-E2B-it": {
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
            id: "google/gemma-4-E2B-it",
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

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Por qué es importante requiresStringContent">
    Algunas rutas de Chat Completions de `inferrs` aceptan solo `messages[].content` de cadena, no matrices de partes de contenido estructuradas.

    <Warning>
    Si las ejecuciones de OpenClaw fallan con un error como:

    ```text
    messages[1].content: invalid type: sequence, expected a string
    ```

    establezca `compat.requiresStringContent: true` en la entrada de su modelo.
    </Warning>

    ```json5
    compat: {
      requiresStringContent: true
    }
    ```

    OpenClaw aplanará las partes de contenido de texto puro en cadenas simples antes de enviar la solicitud.

  </Accordion>

  <Accordion title="Gemma y advertencia sobre el esquema de herramientas">
    Algunas combinaciones actuales de `inferrs` + Gemma aceptan pequeñas solicitudes
    directas de `/v1/chat/completions` pero aún fallan en turnos completos del
    runtime del agente OpenClaw.

    Si eso sucede, pruebe esto primero:

    ```json5
    compat: {
      requiresStringContent: true,
      supportsTools: false
    }
    ```

    Eso deshabilita la superficie del esquema de herramientas de OpenClaw para el modelo y puede reducir la
    presión del prompt en backends locales más estrictos.

    Si las pequeñas solicitudes directas aún funcionan pero los turnos normales del agente OpenClaw continúan
    fallando dentro de `inferrs`, el problema restante suele ser el comportamiento del modelo/servidor
    ascendente en lugar de la capa de transporte de OpenClaw.

  </Accordion>

  <Accordion title="Prueba de humo manual">
    Una vez configurado, pruebe ambas capas:

    ```bash
    curl http://127.0.0.1:8080/v1/chat/completions \
      -H 'content-type: application/json' \
      -d '{"model":"google/gemma-4-E2B-it","messages":[{"role":"user","content":"What is 2 + 2?"}],"stream":false}'
    ```

    ```bash
    openclaw infer model run \
      --model inferrs/google/gemma-4-E2B-it \
      --prompt "What is 2 + 2? Reply with one short sentence." \
      --json
    ```

    Si el primer comando funciona pero el segundo falla, consulte la sección de solución de problemas a continuación.

  </Accordion>

  <Accordion title="Comportamiento tipo proxy">
    `inferrs` se trata como un backend `/v1` compatible con OpenAI tipo proxy, no como
    un punto final nativo de OpenAI.

    - La conformación de solicitudes exclusiva de OpenAI nativo no se aplica aquí
    - Sin `service_tier`, sin Respuestas `store`, sin sugerencias de caché de prompts y sin
      conformación de carga útil de compatibilidad de razonamiento de OpenAI
    - Los encabezados de atribución ocultos de OpenClaw (`originator`, `version`, `User-Agent`)
      no se inyectan en URL base personalizadas de `inferrs`

  </Accordion>
</AccordionGroup>

## Solución de problemas

<AccordionGroup>
  <Accordion title="curl /v1/models falla">
    `inferrs` no se está ejecutando, no es accesible o no está vinculado al host/puerto
    esperado. Asegúrese de que el servidor se haya iniciado y esté escuchando en la dirección que
    configuró.
  </Accordion>

<Accordion title="messages[].content esperaba una cadena">Establezca `compat.requiresStringContent: true` en la entrada del modelo. Consulte la sección `requiresStringContent` anterior para obtener más detalles.</Accordion>

<Accordion title="Las llamadas directas a /v1/chat/completions funcionan pero openclaw infer model run falla">Intente configurar `compat.supportsTools: false` para desactivar la superficie del esquema de herramientas. Consulte la advertencia sobre el esquema de herramientas de Gemma más arriba.</Accordion>

  <Accordion title="inferrs todavía falla en turnos de agente más grandes">
    Si OpenClaw ya no recibe errores de esquema pero `inferrs` todavía falla en turnos de agente más grandes,
    trátelo como una limitación ascendente de `inferrs` o del modelo. Reduzca
    la presión del prompt o cambie a un backend local diferente o a otro modelo.
  </Accordion>
</AccordionGroup>

<Tip>Para obtener ayuda general, consulte [Solución de problemas](/es/help/troubleshooting) y [Preguntas frecuentes](/es/help/faq).</Tip>

## Relacionado

<CardGroup cols={2}>
  <Card title="Modelos locales" href="/es/gateway/local-models" icon="servidor">
    Ejecutar OpenClaw contra servidores de modelos locales.
  </Card>
  <Card title="Solución de problemas de Gateway" href="/es/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail" icon="llave">
    Depuración de backends locales compatibles con OpenAI que pasan las sondas pero fallan en las ejecuciones de agentes.
  </Card>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="capas">
    Resumen de todos los proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
</CardGroup>
