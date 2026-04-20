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

Actualmente, `inferrs` se trata mejor como un backend autohospedado personalizado compatible con OpenAI
y no como un complemento de proveedor dedicado para OpenClaw.

## Introducción

<Steps>
  <Step title="Iniciar inferrs con un modelo">```bash inferrs serve google/gemma-4-E2B-it \ --host 127.0.0.1 \ --port 8080 \ --device metal ```</Step>
  <Step title="Verificar que el servidor sea accesible">```bash curl http://127.0.0.1:8080/health curl http://127.0.0.1:8080/v1/models ```</Step>
  <Step title="Agregar una entrada de proveedor de OpenClaw">Agregue una entrada de proveedor explícita y apunte su modelo predeterminado a ella. Vea el ejemplo de configuración completo a continuación.</Step>
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

## Avanzado

<AccordionGroup>
  <Accordion title="Por qué es importante requiresStringContent">
    Algunas rutas de Chat Completions de `inferrs` aceptan solo
    `messages[].content` de cadena, no matrices de partes de contenido estructuradas.

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

    OpenClaw aplanará las partes de contenido de texto puro en cadenas simples antes de enviar
    la solicitud.

  </Accordion>

  <Accordion title="Advertencia sobre Gemma y el esquema de herramientas">
    Algunas combinaciones actuales de `inferrs` + Gemma aceptan pequeñas `/v1/chat/completions` directas
    pero aún fallan en turnos completos de tiempo de ejecución del agente OpenClaw.

    Si eso sucede, intente esto primero:

    ```json5
    compat: {
      requiresStringContent: true,
      supportsTools: false
    }
    ```

    Eso deshabilita la superficie del esquema de herramientas de OpenClaw para el modelo y puede reducir la presión
    del indicador en backends locales más estrictos.

    Si las solicitudes directas pequeñas aún funcionan pero los turnos de agente normales de OpenClaw continúan
    fallando dentro de `inferrs`, el problema restante suele ser el comportamiento del modelo/servidor
    ascendente en lugar de la capa de transporte de OpenClaw.

  </Accordion>

  <Accordion title="Prueba manual de humo">
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

  <Accordion title="Comportamiento estilo proxy">
    `inferrs` se trata como un backend compatible con `/v1` de estilo proxy, no como
    un punto de conexión nativo de OpenAI.

    - La configuración de solicitudes exclusiva de OpenAI nativo no se aplica aquí
    - Sin `service_tier`, sin Respuestas `store`, sin sugerencias de caché de prompt y sin
    configuración de carga útil compatible con el razonamiento de OpenAI
    - Los encabezados de atribución ocultos de OpenClaw (`originator`, `version`, `User-Agent`)
      no se inyectan en URL base personalizadas de `inferrs`

  </Accordion>
</AccordionGroup>

## Solución de problemas

<AccordionGroup>
  <Accordion title="curl /v1/models falla">
    `inferrs` no se está ejecutando, no es accesible o no está vinculado al
    host/puerto esperado. Asegúrese de que el servidor se haya iniciado y esté escuchando en la dirección que
    configuró.
  </Accordion>

<Accordion title="messages[].content esperaba una cadena">Establezca `compat.requiresStringContent: true` en la entrada del modelo. Consulte la sección `requiresStringContent` anterior para obtener más detalles.</Accordion>

<Accordion title="Las llamadas directas a /v1/chat/completions funcionan pero openclaw infer model run falla">Intente establecer `compat.supportsTools: false` para deshabilitar la superficie del esquema de herramientas. Consulta la advertencia sobre el esquema de herramientas de Gemma anterior.</Accordion>

  <Accordion title="inferrs sigue fallando en turnos de agentes grandes">
    Si OpenClaw ya no recibe errores de esquema pero `inferrs` sigue fallando en turnos de
    agentes grandes, trátelo como una limitación del modelo o de `inferrs` en sentido ascendente. Reduzca
    la presión del prompt o cambie a un backend o modelo local diferente.
  </Accordion>
</AccordionGroup>

<Tip>Para obtener ayuda general, consulte [Solución de problemas](/es/help/troubleshooting) y [Preguntas frecuentes](/es/help/faq).</Tip>

## Véase también

<CardGroup cols={2}>
  <Card title="Modelos locales" href="/es/gateway/local-models" icon="servidor">
    Ejecutar OpenClaw contra servidores de modelos locales.
  </Card>
  <Card title="Solución de problemas de puerta de enlace" href="/es/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail" icon="llave">
    Depuración de backends locales compatibles con OpenAI que pasan las sondas pero fallan en las ejecuciones de los agentes.
  </Card>
  <Card title="Proveedores de modelos" href="/es/concepts/model-providers" icon="capas">
    Resumen de todos los proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
</CardGroup>
