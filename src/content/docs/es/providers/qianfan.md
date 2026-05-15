---
summary: "Utiliza la API unificada de Qianfan para acceder a muchos modelos en OpenClaw"
read_when:
  - You want a single API key for many LLMs
  - You need Baidu Qianfan setup guidance
title: "Qianfan"
---

Qianfan es la plataforma MaaS de Baidu, que proporciona una **API unificada** que enruta las solicitudes a muchos modelos detrás de un único punto de conexión (endpoint) y clave de API. Es compatible con OpenAI, por lo que la mayoría de los SDK de OpenAI funcionan simplemente cambiando la URL base.

| Propiedad     | Valor                             |
| ------------- | --------------------------------- |
| Proveedor     | `qianfan`                         |
| Autenticación | `QIANFAN_API_KEY`                 |
| API           | Compatible con OpenAI             |
| URL base      | `https://qianfan.baidubce.com/v2` |

## Primeros pasos

<Steps>
  <Step title="Crear una cuenta de Baidu Cloud">Regístrese o inicie sesión en la [Consola de Qianfan](https://console.bce.baidu.com/qianfan/ais/console/apiKey) y asegúrese de tener habilitado el acceso a la API de Qianfan.</Step>
  <Step title="Generar una clave de API">Cree una nueva aplicación o seleccione una existente, luego genere una clave de API. El formato de la clave es `bce-v3/ALTAK-...`.</Step>
  <Step title="Ejecutar la incorporación (onboarding)">```bash openclaw onboard --auth-choice qianfan-api-key ```</Step>
  <Step title="Verificar que el modelo esté disponible">```bash openclaw models list --provider qianfan ```</Step>
</Steps>

## Catálogo integrado

| Ref. de modelo                       | Entrada       | Contexto | Salida máxima | Razonamiento | Notas                 |
| ------------------------------------ | ------------- | -------- | ------------- | ------------ | --------------------- |
| `qianfan/deepseek-v3.2`              | texto         | 98,304   | 32,768        | Sí           | Modelo predeterminado |
| `qianfan/ernie-5.0-thinking-preview` | texto, imagen | 119,000  | 64,000        | Sí           | Multimodal            |

<Tip>La referencia de modelo incluida por defecto es `qianfan/deepseek-v3.2`. Solo necesitas anular `models.providers.qianfan` cuando necesites una URL base personalizada o metadatos del modelo.</Tip>

## Ejemplo de configuración

```json5
{
  env: { QIANFAN_API_KEY: "bce-v3/ALTAK-..." },
  agents: {
    defaults: {
      model: { primary: "qianfan/deepseek-v3.2" },
      models: {
        "qianfan/deepseek-v3.2": { alias: "QIANFAN" },
      },
    },
  },
  models: {
    providers: {
      qianfan: {
        baseUrl: "https://qianfan.baidubce.com/v2",
        api: "openai-completions",
        models: [
          {
            id: "deepseek-v3.2",
            name: "DEEPSEEK V3.2",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 98304,
            maxTokens: 32768,
          },
          {
            id: "ernie-5.0-thinking-preview",
            name: "ERNIE-5.0-Thinking-Preview",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 119000,
            maxTokens: 64000,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Transporte y compatibilidad">
    Qianfan se ejecuta a través de la ruta de transporte compatible con OpenAI, no mediante el modelado de solicitudes nativo de OpenAI. Esto significa que las funciones estándar del SDK de OpenAI funcionan, pero es posible que los parámetros específicos del proveedor no se reenvíen.
  </Accordion>

  <Accordion title="Catálogo y anulaciones">
    El catálogo incluido actualmente contiene `deepseek-v3.2` y `ernie-5.0-thinking-preview`. Agregue o anule `models.providers.qianfan` solo cuando necesite una URL base personalizada o metadatos del modelo.

    <Note>
    Las referencias de modelos usan el prefijo `qianfan/` (por ejemplo `qianfan/deepseek-v3.2`).
    </Note>

  </Accordion>

  <Accordion title="Solución de problemas">
    - Asegúrese de que su clave de API comience con `bce-v3/ALTAK-` y tenga el acceso a la API de Qianfan habilitado en la consola de Baidu Cloud.
    - Si no se listan los modelos, confirme que su cuenta tiene el servicio Qianfan activado.
    - La URL base predeterminada es `https://qianfan.baidubce.com/v2`. Cámbiela solo si utiliza un endpoint personalizado o un proxy.

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Referencia completa de configuración de OpenClaw.
  </Card>
  <Card title="Configuración del agente" href="/es/concepts/agent" icon="robot">
    Configuración de valores predeterminados del agente y asignaciones de modelos.
  </Card>
  <Card title="Documentación de la API de Qianfan" href="https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb" icon="arrow-up-right-from-square">
    Documentación oficial de la API de Qianfan.
  </Card>
</CardGroup>
