---
title: "Chutes"
summary: "Configuración de Chutes (OAuth o clave de API, descubrimiento de modelos, alias)"
read_when:
  - You want to use Chutes with OpenClaw
  - You need the OAuth or API key setup path
  - You want the default model, aliases, or discovery behavior
---

# Chutes

[Chutes](https://chutes.ai) expone catálogos de modelos de código abierto a través de una
API compatible con OpenAI. OpenClaw admite tanto OAuth del navegador como autenticación
directa con clave de API para el proveedor `chutes` incluido.

| Propiedad     | Valor                            |
| ------------- | -------------------------------- |
| Proveedor     | `chutes`                         |
| API           | Compatible con OpenAI            |
| URL base      | `https://llm.chutes.ai/v1`       |
| Autenticación | OAuth o clave de API (ver abajo) |

## Primeros pasos

<Tabs>
  <Tab title="OAuth">
    <Steps>
      <Step title="Ejecutar el flujo de incorporación de OAuth">```bash openclaw onboard --auth-choice chutes ``` OpenClaw inicia el flujo del navegador localmente o muestra una URL + un flujo de redireccionamiento y pegado en hosts remotos/sin interfaz gráfica. Los tokens de OAuth se actualizan automáticamente a través de los perfiles de autenticación de OpenClaw.</Step>
      <Step title="Verificar el modelo predeterminado">Después de la incorporación, el modelo predeterminado se establece en `chutes/zai-org/GLM-4.7-TEE` y se registra el catálogo Chutes incluido.</Step>
    </Steps>
  </Tab>
  <Tab title="Clave de API">
    <Steps>
      <Step title="Obtener una clave de API">Cree una clave en [chutes.ai/settings/api-keys](https://chutes.ai/settings/api-keys).</Step>
      <Step title="Ejecutar el flujo de incorporación de clave de API">```bash openclaw onboard --auth-choice chutes-api-key ```</Step>
      <Step title="Verificar el modelo predeterminado">Después de la incorporación, el modelo predeterminado se establece en `chutes/zai-org/GLM-4.7-TEE` y se registra el catálogo Chutes incluido.</Step>
    </Steps>
  </Tab>
</Tabs>

<Note>Ambas rutas de autenticación registran el catálogo Chutes incluido y establecen el modelo predeterminado en `chutes/zai-org/GLM-4.7-TEE`. Variables de entorno de ejecución: `CHUTES_API_KEY`, `CHUTES_OAUTH_TOKEN`.</Note>

## Comportamiento de descubrimiento

Cuando la autenticación de Chutes está disponible, OpenClaw consulta el catálogo de Chutes con
esa credencial y utiliza los modelos descubiertos. Si el descubrimiento falla, OpenClaw recurre
a un catálogo estático incluido para que la incorporación y el inicio sigan funcionando.

## Alias predeterminados

OpenClaw registra tres alias de conveniencia para el catálogo Chutes incluido:

| Alias           | Modelo de destino                                     |
| --------------- | ----------------------------------------------------- |
| `chutes-fast`   | `chutes/zai-org/GLM-4.7-FP8`                          |
| `chutes-pro`    | `chutes/deepseek-ai/DeepSeek-V3.2-TEE`                |
| `chutes-vision` | `chutes/chutesai/Mistral-Small-3.2-24B-Instruct-2506` |

## Catálogo de inicio integrado

El catálogo de respaldo incluido contiene las referencias actuales de Chutes:

| Referencia de modelo                                  |
| ----------------------------------------------------- |
| `chutes/zai-org/GLM-4.7-TEE`                          |
| `chutes/zai-org/GLM-5-TEE`                            |
| `chutes/deepseek-ai/DeepSeek-V3.2-TEE`                |
| `chutes/deepseek-ai/DeepSeek-R1-0528-TEE`             |
| `chutes/moonshotai/Kimi-K2.5-TEE`                     |
| `chutes/chutesai/Mistral-Small-3.2-24B-Instruct-2506` |
| `chutes/Qwen/Qwen3-Coder-Next-TEE`                    |
| `chutes/openai/gpt-oss-120b-TEE`                      |

## Ejemplo de configuración

```json5
{
  agents: {
    defaults: {
      model: { primary: "chutes/zai-org/GLM-4.7-TEE" },
      models: {
        "chutes/zai-org/GLM-4.7-TEE": { alias: "Chutes GLM 4.7" },
        "chutes/deepseek-ai/DeepSeek-V3.2-TEE": { alias: "Chutes DeepSeek V3.2" },
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Anulaciones de OAuth">
    Puedes personalizar el flujo de OAuth con variables de entorno opcionales:

    | Variable | Propósito |
    | -------- | ------- |
    | `CHUTES_CLIENT_ID` | ID de cliente OAuth personalizado |
    | `CHUTES_CLIENT_SECRET` | Secreto de cliente OAuth personalizado |
    | `CHUTES_OAUTH_REDIRECT_URI` | URI de redirección personalizada |
    | `CHUTES_OAUTH_SCOPES` | Ámbitos de OAuth personalizados |

    Consulta los [documentos de OAuth de Chutes](https://chutes.ai/docs/sign-in-with-chutes/overview)
    para conocer los requisitos de la aplicación de redirección y obtener ayuda.

  </Accordion>

  <Accordion title="Notas">
    - El descubrimiento mediante clave de API y OAuth utiliza el mismo ID de proveedor `chutes`.
    - Los modelos de Chutes se registran como `chutes/<model-id>`.
    - Si el descubrimiento falla durante el inicio, se utiliza automáticamente el catálogo estático incluido.
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Proveedores de modelos" href="/en/concepts/model-providers" icon="layers">
    Reglas del proveedor, referencias de modelo y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/en/gateway/configuration-reference" icon="gear">
    Esquema de configuración completo, incluida la configuración del proveedor.
  </Card>
  <Card title="Chutes" href="https://chutes.ai" icon="arrow-up-right-from-square">
    Panel de control de Chutes y documentación de la API.
  </Card>
  <Card title="Claves de API de Chutes" href="https://chutes.ai/settings/api-keys" icon="key">
    Cree y gestione claves de API de Chutes.
  </Card>
</CardGroup>
