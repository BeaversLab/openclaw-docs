---
summary: "Ejecutar OpenClaw a través de inferrs (servidor local compatible con OpenAI)"
read_when:
  - You want to run OpenClaw against a local inferrs server
  - You are serving Gemma or another model through inferrs
  - You need the exact OpenClaw compat flags for inferrs
title: "Inferrs"
---

[inferrs](https://github.com/ericcurtin/inferrs) puede servir modelos locales detrás de una API `/v1` compatible con OpenAI. OpenClaw funciona con `inferrs` a través de la ruta genérica `openai-completions`.

| Propiedad                            | Valor                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| ID del proveedor                     | `inferrs` (personalizado; configure en `models.providers.inferrs`)               |
| Complemento                          | ninguno — `inferrs` no es un complemento de proveedor de OpenClaw incluido       |
| Variable de entorno de autenticación | Opcional. Cualquier valor funciona si su servidor inferrs no tiene autenticación |
| API                                  | Compatible con OpenAI (`openai-completions`)                                     |
| URL base sugerida                    | `http://127.0.0.1:8080/v1` (o dondequiera que se encuentre su servidor inferrs)  |

<Note>
  Actualmente, `inferrs` se trata mejor como un backend compatible con OpenAI autohospedado personalizado, no como un complemento de proveedor dedicado de OpenClaw. Lo configura a través de `models.providers.inferrs` en lugar de una marca de elección de incorporación. Si necesita un complemento incluido real con descubrimiento automático, consulte [SGLang](/es/providers/sglang) o
  [vLLM](/es/providers/vllm).
</Note>

## Introducción

<Steps>
  <Step title="Iniciar inferrs con un modelo">```bash inferrs serve google/gemma-4-E2B-it \ --host 127.0.0.1 \ --port 8080 \ --device metal ```</Step>
  <Step title="Verificar que el servidor sea accesible">```bash curl http://127.0.0.1:8080/health curl http://127.0.0.1:8080/v1/models ```</Step>
  <Step title="Agregar una entrada de proveedor de OpenClaw">Agregue una entrada de proveedor explícita y apunte su modelo predeterminado a ella. Vea el ejemplo de configuración completa a continuación.</Step>
</Steps>

## Ejemplo de configuración completa

Este ejemplo usa Gemma 4 en un servidor local `inferrs`.

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

## Inicio bajo demanda

Inferrs también puede ser iniciado por OpenClaw solo cuando se selecciona un modelo `inferrs/...`. Agregue `localService` a la misma entrada de proveedor:

```json5
{
  models: {
    providers: {
      inferrs: {
        baseUrl: "http://127.0.0.1:8080/v1",
        apiKey: "inferrs-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        localService: {
          command: "/opt/homebrew/bin/inferrs",
          args: ["serve", "google/gemma-4-E2B-it", "--host", "127.0.0.1", "--port", "8080", "--device", "metal"],
          healthUrl: "http://127.0.0.1:8080/v1/models",
          readyTimeoutMs: 180000,
          idleStopMs: 0,
        },
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

`command` debe ser absoluto. Use `which inferrs` en el host de Gateway y ponga esa ruta en la configuración. Para la referencia completa de campos, consulte
[Servicios de modelos locales](/es/gateway/local-model-services).

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Por qué es importante requiresStringContent">
    Algunas rutas de `inferrs` Chat Completions aceptan solo cadenas
    `messages[].content`, no matrices de partes de contenido estructurado.

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
    Algunas combinaciones actuales de `inferrs` + Gemma aceptan pequeñas solicitudes `/v1/chat/completions` directas
    pero aún fallan en turnos completos del tiempo de ejecución del agente OpenClaw.

    Si eso sucede, pruebe esto primero:

    ```json5
    compat: {
      requiresStringContent: true,
      supportsTools: false
    }
    ```

    Eso deshabilita la superficie del esquema de herramientas de OpenClaw para el modelo y puede reducir la
    presión del prompt en backends locales más estrictos.

    Si las pequeñas solicitudes directas aún funcionan pero los turnos normales del agente OpenClaw siguen fallando
    dentro de `inferrs`, el problema restante suele ser el comportamiento del modelo/servidor
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

  <Accordion title="Comportamiento de estilo proxy">
    `inferrs` se trata como un backend `/v1` compatible con OpenAI de estilo proxy,
    no como un punto de conexión nativo de OpenAI.

    - La conformación de solicitudes solo nativa de OpenAI no se aplica aquí
    - Sin `service_tier`, sin Respuestas `store`, sin sugerencias de caché de prompt y sin
      conformación de carga útil de compatibilidad de razonamiento de OpenAI
    - Los encabezados de atribución ocultos de OpenClaw (`originator`, `version`, `User-Agent`)
      no se inyectan en URLs base `inferrs` personalizadas

  </Accordion>
</AccordionGroup>

## Solución de problemas

<AccordionGroup>
  <Accordion title="curl /v1/models falla">
    `inferrs` no se está ejecutando, no es accesible o no está vinculado al
    host/puerto esperado. Asegúrese de que el servidor se haya iniciado y esté escuchando en la dirección
    que configuró.
  </Accordion>

<Accordion title="messages[].content esperaba una cadena">Establezca `compat.requiresStringContent: true` en la entrada del modelo. Consulte la sección `requiresStringContent` anterior para obtener más detalles.</Accordion>

<Accordion title="Las llamadas directas a /v1/chat/completions funcionan pero openclaw infer model run falla">Intente establecer `compat.supportsTools: false` para deshabilitar la superficie del esquema de herramientas. Consulta la advertencia sobre el esquema de herramientas de Gemma anterior.</Accordion>

  <Accordion title="inferrs sigue fallando en turnos de agentes grandes">
    Si OpenClaw ya no recibe errores de esquema pero `inferrs` sigue fallando en turnos de
    agentes grandes, trátelo como una limitación del flujo superior `inferrs` o del modelo. Reduzca
    la presión del prompt o cambie a un backend o modelo local diferente.
  </Accordion>
</AccordionGroup>

<Tip>Para obtener ayuda general, consulte [Solución de problemas](/es/help/troubleshooting) y [Preguntas frecuentes](/es/help/faq).</Tip>

## Relacionado

<CardGroup cols={2}>
  <Card title="Modelos locales" href="/es/gateway/local-models" icon="servidor">
    Ejecutar OpenClaw contra servidores de modelos locales.
  </Card>
  <Card title="Servicios de modelos locales" href="/es/gateway/local-model-services" icon="reproducir">
    Iniciar servidores de modelos locales bajo demanda para los proveedores configurados.
  </Card>
  <Card title="Solución de problemas de la puerta de enlace" href="/es/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail" icon="llave">
    Depuración de backends locales compatibles con OpenAI que pasan las sondas pero fallan en las ejecuciones de agentes.
  </Card>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="capas">
    Resumen de todos los proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
</CardGroup>
