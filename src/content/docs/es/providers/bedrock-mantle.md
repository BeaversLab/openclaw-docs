---
summary: "Usar modelos de Amazon Bedrock Mantle (compatibles con OpenAI) con OpenClaw"
read_when:
  - You want to use Bedrock Mantle hosted OSS models with OpenClaw
  - You need the Mantle OpenAI-compatible endpoint for GPT-OSS, Qwen, Kimi, or GLM
title: "Amazon Bedrock Mantle"
---

# Amazon Bedrock Mantle

OpenClaw incluye un proveedor **Amazon Bedrock Mantle** integrado que se conecta al
endpoint compatible con Mantle OpenAI. Mantle aloja modelos de código abierto y
de terceros (GPT-OSS, Qwen, Kimi, GLM y similares) a través de una superficie
`/v1/chat/completions` estándar respaldada por la infraestructura de Bedrock.

| Propiedad             | Valor                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| ID del proveedor      | `amazon-bedrock-mantle`                                                                                          |
| API                   | `openai-completions` (compatible con OpenAI) o `anthropic-messages` (ruta de Mensajes de Anthropic)              |
| Autenticación         | Portador `AWS_BEARER_TOKEN_BEDROCK` explícito o generación de token de portador de cadena de credenciales de IAM |
| Región predeterminada | `us-east-1` (anular con `AWS_REGION` o `AWS_DEFAULT_REGION`)                                                     |

## Para empezar

Elija su método de autenticación preferido y siga los pasos de configuración.

<Tabs>
  <Tab title="Token de portador explícito">
    **Mejor para:** entornos donde ya tienes un token de portador de Mantle.

    <Steps>
      <Step title="Establecer el token de portador en el host de puerta de enlace">
        ```bash
        export AWS_BEARER_TOKEN_BEDROCK="..."
        ```

        Opcionalmente establecer una región (por defecto es `us-east-1`):

        ```bash
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="Verificar que los modelos se descubren">
        ```bash
        openclaw models list
        ```

        Los modelos descubiertos aparecen bajo el proveedor `amazon-bedrock-mantle`. No se
        requiere configuración adicional a menos que desees anular los valores predeterminados.
      </Step>
    </Steps>

  </Tab>

  <Tab title="Credenciales de IAM">
    **Mejor para:** usar credenciales compatibles con el SDK de AWS (configuración compartida, SSO, identidad web, roles de instancia o tarea).

    <Steps>
      <Step title="Configurar las credenciales de AWS en el host de la puerta de enlace">
        Funciona cualquier origen de autenticación compatible con el SDK de AWS:

        ```bash
        export AWS_PROFILE="default"
        export AWS_REGION="us-west-2"
        ```
      </Step>
      <Step title="Verificar que se descubran los modelos">
        ```bash
        openclaw models list
        ```

        OpenClaw genera un token de portador (bearer token) de Mantle a partir de la cadena de credenciales automáticamente.
      </Step>
    </Steps>

    <Tip>
    Cuando `AWS_BEARER_TOKEN_BEDROCK` no está configurado, OpenClaw genera el token de portador por usted desde la cadena de credenciales predeterminada de AWS, incluidos los perfiles de credenciales/configuración compartidos, SSO, identidad web, y roles de instancia o tarea.
    </Tip>

  </Tab>
</Tabs>

## Descubrimiento automático de modelos

Cuando `AWS_BEARER_TOKEN_BEDROCK` está configurado, OpenClaw lo usa directamente. De lo contrario,
OpenClaw intenta generar un token de portador de Mantle a partir de la cadena de credenciales
predeterminada de AWS. Luego descubre los modelos de Mantle disponibles consultando el
endpoint `/v1/models` de la región.

| Comportamiento                 | Detalle                                        |
| ------------------------------ | ---------------------------------------------- |
| Caché de descubrimiento        | Resultados almacenados en caché durante 1 hora |
| Actualización del token de IAM | Cada hora                                      |

<Note>El token de portador es el mismo `AWS_BEARER_TOKEN_BEDROCK` que usa el proveedor estándar de [Amazon Bedrock](/es/providers/bedrock).</Note>

### Regiones compatibles

`us-east-1`, `us-east-2`, `us-west-2`, `ap-northeast-1`,
`ap-south-1`, `ap-southeast-3`, `eu-central-1`, `eu-west-1`, `eu-west-2`,
`eu-south-1`, `eu-north-1`, `sa-east-1`.

## Configuración manual

Si prefiere una configuración explícita en lugar del descubrimiento automático:

```json5
{
  models: {
    providers: {
      "amazon-bedrock-mantle": {
        baseUrl: "https://bedrock-mantle.us-east-1.api.aws/v1",
        api: "openai-completions",
        auth: "api-key",
        apiKey: "env:AWS_BEARER_TOKEN_BEDROCK",
        models: [
          {
            id: "gpt-oss-120b",
            name: "GPT-OSS 120B",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 32000,
            maxTokens: 4096,
          },
        ],
      },
    },
  },
}
```

## Notas avanzadas

<AccordionGroup>
  <Accordion title="Soporte de razonamiento">
    El soporte de razonamiento se deduce de los ID de modelo que contienen patrones como
    `thinking`, `reasoner` o `gpt-oss-120b`. OpenClaw establece `reasoning: true`
    automáticamente para los modelos coincidentes durante el descubrimiento.
  </Accordion>

<Accordion title="Indisponibilidad del punto de conexión">Si el punto de conexión Mantle no está disponible o no devuelve modelos, el proveedor se omite silenciosamente. OpenClaw no genera errores; otros proveedores configurados continúan funcionando con normalidad.</Accordion>

  <Accordion title="Claude Opus 4.7 a través de la ruta Anthropic Messages">
    Mantle también expone una ruta Anthropic Messages que transporta los modelos Claude a través de la misma ruta de transmisión autenticada con bearer. Claude Opus 4.7 (`amazon-bedrock-mantle/claude-opus-4.7`) se puede invocar a través de esta ruta con transmisión propiedad del proveedor, por lo que los tokens bearer de AWS no se tratan como claves de API de Anthropic.

    Cuando fijas un modelo Anthropic Messages en el proveedor Mantle, OpenClaw utiliza la superficie de la API `anthropic-messages` en lugar de `openai-completions` para ese modelo. La autenticación proviene aún de `AWS_BEARER_TOKEN_BEDROCK` (o del token bearer IAM emitido).

    ```json5
    {
      models: {
        providers: {
          "amazon-bedrock-mantle": {
            models: [
              {
                id: "claude-opus-4.7",
                name: "Claude Opus 4.7",
                api: "anthropic-messages",
                reasoning: true,
                input: ["text", "image"],
                contextWindow: 1000000,
                maxTokens: 32000,
              },
            ],
          },
        },
      },
    }
    ```

    Los metadatos de la ventana de contexto para los modelos Mantle descubiertos utilizan los límites publicados conocidos cuando están disponibles y recurre de forma conservativa para los modelos no listados, por lo que la compactación y el manejo de desbordamiento se comportan correctamente para las entradas más nuevas sin exagerar en los modelos desconocidos.

  </Accordion>

  <Accordion title="Relación con el proveedor Amazon Bedrock">
    Bedrock Mantle es un proveedor independiente del proveedor estándar
    [Amazon Bedrock](/es/providers/bedrock). Mantle utiliza una
    superficie `/v1` compatible con OpenAI, mientras que el proveedor Bedrock estándar utiliza
    la API nativa de Bedrock.

    Ambos proveedores comparten la misma credencial `AWS_BEARER_TOKEN_BEDROCK` cuando
    está presente.

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Amazon Bedrock" href="/es/providers/bedrock" icon="cloud">
    Proveedor Bedrock nativo para Anthropic Claude, Titan y otros modelos.
  </Card>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="OAuth y autenticación" href="/es/gateway/authentication" icon="clave">
    Detalles de autenticación y reglas de reutilización de credenciales.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="llave inglesa">
    Problemas comunes y cómo resolverlos.
  </Card>
</CardGroup>
