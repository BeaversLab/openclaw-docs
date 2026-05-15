---
summary: "Usar modelos StepFun con OpenClaw"
read_when:
  - You want StepFun models in OpenClaw
  - You need StepFun setup guidance
title: "StepFun"
---

OpenClaw incluye un complemento de proveedor StepFun integrado con dos id. de proveedor:

- `stepfun` para el punto de conexión estándar
- `stepfun-plan` para el punto de conexión Step Plan

<Warning>Estándar y Step Plan son **proveedores separados** con diferentes puntos de conexión y prefijos de referencia de modelo (`stepfun/...` frente a `stepfun-plan/...`). Use una clave de China con los puntos de conexión `.com` y una clave global con los puntos de conexión `.ai`.</Warning>

## Resumen de región y punto de conexión

| Punto de conexión | China (`.com`)                         | Global (`.ai`)                        |
| ----------------- | -------------------------------------- | ------------------------------------- |
| Estándar          | `https://api.stepfun.com/v1`           | `https://api.stepfun.ai/v1`           |
| Step Plan         | `https://api.stepfun.com/step_plan/v1` | `https://api.stepfun.ai/step_plan/v1` |

Var. de entorno de autenticación: `STEPFUN_API_KEY`

## Catálogo integrado

Estándar (`stepfun`):

| Referencia de modelo     | Contexto | Salida máxima | Notas                          |
| ------------------------ | -------- | ------------- | ------------------------------ |
| `stepfun/step-3.5-flash` | 262,144  | 65,536        | Modelo estándar predeterminado |

Step Plan (`stepfun-plan`):

| Referencia de modelo               | Contexto | Salida máxima | Notas                           |
| ---------------------------------- | -------- | ------------- | ------------------------------- |
| `stepfun-plan/step-3.5-flash`      | 262,144  | 65,536        | Modelo Step Plan predeterminado |
| `stepfun-plan/step-3.5-flash-2603` | 262,144  | 65,536        | Modelo Step Plan adicional      |

## Para comenzar

Elija su superficie de proveedor y siga los pasos de configuración.

<Tabs>
  <Tab title="Estándar">
    **Mejor para:** uso general a través del punto de conexión estándar de StepFun.

    <Steps>
      <Step title="Elige tu región de punto de conexión">
        | Elección de autenticación        | Punto de conexión                         | Región        |
        | -------------------------------- | -------------------------------- | ------------- |
        | `stepfun-standard-api-key-intl`  | `https://api.stepfun.ai/v1`     | Internacional |
        | `stepfun-standard-api-key-cn`    | `https://api.stepfun.com/v1`    | China         |
      </Step>
      <Step title="Ejecutar incorporación">
        ```bash
        openclaw onboard --auth-choice stepfun-standard-api-key-intl
        ```

        O para el punto de conexión de China:

        ```bash
        openclaw onboard --auth-choice stepfun-standard-api-key-cn
        ```
      </Step>
      <Step title="Alternativa no interactiva">
        ```bash
        openclaw onboard --auth-choice stepfun-standard-api-key-intl \
          --stepfun-api-key "$STEPFUN_API_KEY"
        ```
      </Step>
      <Step title="Verificar que los modelos están disponibles">
        ```bash
        openclaw models list --provider stepfun
        ```
      </Step>
    </Steps>

    ### Referencias de modelos

    - Modelo predeterminado: `stepfun/step-3.5-flash`

  </Tab>

  <Tab title="Step Plan">
    **Mejor para:** punto de conexión de razonamiento Step Plan.

    <Steps>
      <Step title="Elige tu región de punto de conexión">
        | Elección de autenticación      | Punto de conexión                                | Región        |
        | ---------------------------- | --------------------------------------- | ------------- |
        | `stepfun-plan-api-key-intl`  | `https://api.stepfun.ai/step_plan/v1`  | Internacional |
        | `stepfun-plan-api-key-cn`    | `https://api.stepfun.com/step_plan/v1` | China         |
      </Step>
      <Step title="Ejecutar incorporación">
        ```bash
        openclaw onboard --auth-choice stepfun-plan-api-key-intl
        ```

        O para el punto de conexión de China:

        ```bash
        openclaw onboard --auth-choice stepfun-plan-api-key-cn
        ```
      </Step>
      <Step title="Alternativa no interactiva">
        ```bash
        openclaw onboard --auth-choice stepfun-plan-api-key-intl \
          --stepfun-api-key "$STEPFUN_API_KEY"
        ```
      </Step>
      <Step title="Verificar que los modelos están disponibles">
        ```bash
        openclaw models list --provider stepfun-plan
        ```
      </Step>
    </Steps>

    ### Referencias de modelos

    - Modelo predeterminado: `stepfun-plan/step-3.5-flash`
    - Modelo alternativo: `stepfun-plan/step-3.5-flash-2603`

  </Tab>
</Tabs>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Configuración completa: Proveedor estándar">
    ```json5
    {
      env: { STEPFUN_API_KEY: "your-key" },
      agents: { defaults: { model: { primary: "stepfun/step-3.5-flash" } } },
      models: {
        mode: "merge",
        providers: {
          stepfun: {
            baseUrl: "https://api.stepfun.ai/v1",
            api: "openai-completions",
            apiKey: "${STEPFUN_API_KEY}",
            models: [
              {
                id: "step-3.5-flash",
                name: "Step 3.5 Flash",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 65536,
              },
            ],
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="Configuración completa: proveedor Step Plan">
    ```json5
    {
      env: { STEPFUN_API_KEY: "your-key" },
      agents: { defaults: { model: { primary: "stepfun-plan/step-3.5-flash" } } },
      models: {
        mode: "merge",
        providers: {
          "stepfun-plan": {
            baseUrl: "https://api.stepfun.ai/step_plan/v1",
            api: "openai-completions",
            apiKey: "${STEPFUN_API_KEY}",
            models: [
              {
                id: "step-3.5-flash",
                name: "Step 3.5 Flash",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 65536,
              },
              {
                id: "step-3.5-flash-2603",
                name: "Step 3.5 Flash 2603",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 65536,
              },
            ],
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="Notas">
    - El proveedor está incluido con OpenClaw, por lo que no hay un paso separado de instalación del complemento.
    - `step-3.5-flash-2603` está expuesto actualmente solo en `stepfun-plan`.
    - Un único flujo de autenticación escribe perfiles coincidentes con la región para ambos `stepfun` y `stepfun-plan`, por lo que ambas superficies pueden descubrirse juntas.
    - Use `openclaw models list` y `openclaw models set <provider/model>` para inspeccionar o cambiar modelos.

  </Accordion>
</AccordionGroup>

<Note>Para obtener una visión general más amplia del proveedor, consulte [Proveedores de modelos](/es/concepts/model-providers).</Note>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="capas">
    Resumen de todos los proveedores, referencias de modelo y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Esquema de configuración completo para proveedores, modelos y complementos.
  </Card>
  <Card title="Selección de modelo" href="/es/concepts/models" icon="brain">
    Cómo elegir y configurar modelos.
  </Card>
  <Card title="Plataforma StepFun" href="https://platform.stepfun.com" icon="globe">
    Gestión de claves API de StepFun y documentación.
  </Card>
</CardGroup>
