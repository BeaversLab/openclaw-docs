---
summary: "Use modelos de Amazon Bedrock Mantle (compatibles con OpenAI) con OpenClaw"
read_when:
  - You want to use Bedrock Mantle hosted OSS models with OpenClaw
  - You need the Mantle OpenAI-compatible endpoint for GPT-OSS, Qwen, Kimi, or GLM
title: "Amazon Bedrock Mantle"
---

# Amazon Bedrock Mantle

OpenClaw incluye un proveedor **Amazon Bedrock Mantle** que se conecta al
endpoint compatible con OpenAI de Mantle. Mantle aloja modelos de código abierto
de terceros (GPT-OSS, Qwen, Kimi, GLM y similares) a través de una superficie
`/v1/chat/completions` estándar respaldada por la infraestructura de Bedrock.

## Lo que OpenClaw admite

- Proveedor: `amazon-bedrock-mantle`
- API: `openai-completions` (compatible con OpenAI)
- Autenticación: `AWS_BEARER_TOKEN_BEDROCK` explícito o generación de token portador mediante cadena de credenciales IAM
- Región: `AWS_REGION` o `AWS_DEFAULT_REGION` (predeterminado: `us-east-1`)

## Descubrimiento automático de modelos

Cuando se establece `AWS_BEARER_TOKEN_BEDROCK`, OpenClaw lo usa directamente. De lo contrario,
OpenClaw intenta generar un token portador de Mantle desde la cadena de credenciales
default de AWS, incluidos los perfiles de credenciales/configuración compartidos, SSO,
identidad web, y roles de instancia o tarea. Luego descubre los modelos de Mantle
disponibles consultando el endpoint `/v1/models` de la región. Los resultados
del descubrimiento se almacenan en caché durante 1 hora, y los tokens portadores
derivados de IAM se actualizan cada hora.

Regiones admitidas: `us-east-1`, `us-east-2`, `us-west-2`, `ap-northeast-1`,
`ap-south-1`, `ap-southeast-3`, `eu-central-1`, `eu-west-1`, `eu-west-2`,
`eu-south-1`, `eu-north-1`, `sa-east-1`.

## Incorporación

1. Elija una ruta de autenticación en el **host de puerta de enlace**:

Token portador explícito:

```bash
export AWS_BEARER_TOKEN_BEDROCK="..."
# Optional (defaults to us-east-1):
export AWS_REGION="us-west-2"
```

Credenciales IAM:

```bash
# Any AWS SDK-compatible auth source works here, for example:
export AWS_PROFILE="default"
export AWS_REGION="us-west-2"
```

2. Verifique que los modelos se descubran:

```bash
openclaw models list
```

Los modelos descubiertos aparecen bajo el proveedor `amazon-bedrock-mantle`. No
se requiere configuración adicional a menos que desee anular los valores predeterminados.

## Configuración manual

Si prefiere una configuración explícita en lugar del autodescubrimiento:

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

## Notas

- OpenClaw puede generar el token de portador de Mantle por usted a partir de
  credenciales de IAM compatibles con el SDK de AWS cuando `AWS_BEARER_TOKEN_BEDROCK` no está establecido.
- El token de portador es el mismo `AWS_BEARER_TOKEN_BEDROCK` utilizado por el proveedor
  estándar de [Amazon Bedrock](/en/providers/bedrock).
- La compatibilidad con razonamiento se deduce de los IDs de modelo que contienen patrones
  como `thinking`, `reasoner` o `gpt-oss-120b`.
- Si el punto de conexión de Mantle no está disponible o no devuelve modelos,
  el proveedor se omite silenciosamente.
