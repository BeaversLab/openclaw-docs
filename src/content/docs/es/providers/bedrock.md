---
summary: "Usar los modelos de Amazon Bedrock (API de Converse) con OpenClaw"
read_when:
  - You want to use Amazon Bedrock models with OpenClaw
  - You need AWS credential/region setup for model calls
title: "Amazon Bedrock"
---

# Amazon Bedrock

OpenClaw puede utilizar modelos de **Amazon Bedrock** a través del proveedor de transmisión **Bedrock Converse** de pi‑ai. La autenticación de Bedrock utiliza la **cadena de credenciales predeterminada del SDK de AWS**, no una clave de API.

## Lo que pi-ai admite

- Proveedor: `amazon-bedrock`
- API: `bedrock-converse-stream`
- Autenticación: credenciales de AWS (variables de entorno, configuración compartida o rol de instancia)
- Región: `AWS_REGION` o `AWS_DEFAULT_REGION` (predeterminado: `us-east-1`)

## Descubrimiento automático de modelos

OpenClaw puede descubrir automáticamente los modelos de Bedrock que admiten **streaming**
y **salida de texto**. El descubrimiento utiliza `bedrock:ListFoundationModels` y
`bedrock:ListInferenceProfiles`, y los resultados se almacenan en caché (predeterminado: 1 hora).

Cómo se habilita el proveedor implícito:

- Si `plugins.entries.amazon-bedrock.config.discovery.enabled` es `true`,
  OpenClaw intentará el descubrimiento incluso cuando no haya ningún marcador de entorno de AWS presente.
- Si `plugins.entries.amazon-bedrock.config.discovery.enabled` no está configurado,
  OpenClaw solo agrega automáticamente el
  proveedor implícito de Bedrock cuando detecta uno de estos marcadores de autenticación de AWS:
  `AWS_BEARER_TOKEN_BEDROCK`, `AWS_ACCESS_KEY_ID` +
  `AWS_SECRET_ACCESS_KEY`, o `AWS_PROFILE`.
- La ruta de autenticación real del tiempo de ejecución de Bedrock sigue utilizando la cadena predeterminada del SDK de AWS, por lo que
  la configuración compartida, el SSO y la autenticación de roles de instancia IMDS pueden funcionar incluso cuando el descubrimiento
  necesitaba `enabled: true` para participar.

Las opciones de configuración se encuentran en `plugins.entries.amazon-bedrock.config.discovery`:

```json5
{
  plugins: {
    entries: {
      "amazon-bedrock": {
        config: {
          discovery: {
            enabled: true,
            region: "us-east-1",
            providerFilter: ["anthropic", "amazon"],
            refreshInterval: 3600,
            defaultContextWindow: 32000,
            defaultMaxTokens: 4096,
          },
        },
      },
    },
  },
}
```

Notas:

- `enabled` tiene como valor predeterminado el modo automático. En modo automático, OpenClaw solo habilita el
  proveedor implícito de Bedrock cuando detecta un marcador de entorno de AWS compatible.
- `region` tiene como valor predeterminado `AWS_REGION` o `AWS_DEFAULT_REGION`, y luego `us-east-1`.
- `providerFilter` coincide con los nombres de los proveedores de Bedrock (por ejemplo `anthropic`).
- `refreshInterval` está en segundos; establézcalo en `0` para desactivar el almacenamiento en caché.
- `defaultContextWindow` (predeterminado: `32000`) y `defaultMaxTokens` (predeterminado: `4096`)
  se utilizan para los modelos descubiertos (anule si conoce los límites de su modelo).
- Para las entradas explícitas de `models.providers["amazon-bedrock"]`, OpenClaw aún puede resolver la autenticación de marcadores de entorno (env-marker) de Bedrock temprano desde los marcadores de entorno de AWS, como `AWS_BEARER_TOKEN_BEDROCK`, sin forzar la carga completa de autenticación en tiempo de ejecución. La ruta de autenticación real de la llamada al modelo aún usa la cadena de credenciales predeterminada del SDK de AWS.

## Incorporación

1. Asegúrese de que las credenciales de AWS estén disponibles en el **host de puerta de enlace**:

```bash
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="us-east-1"
# Optional:
export AWS_SESSION_TOKEN="..."
export AWS_PROFILE="your-profile"
# Optional (Bedrock API key/bearer token):
export AWS_BEARER_TOKEN_BEDROCK="..."
```

2. Añada un proveedor y modelo de Bedrock a su configuración (no se requiere `apiKey`):

```json5
{
  models: {
    providers: {
      "amazon-bedrock": {
        baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
        api: "bedrock-converse-stream",
        auth: "aws-sdk",
        models: [
          {
            id: "us.anthropic.claude-opus-4-6-v1:0",
            name: "Claude Opus 4.6 (Bedrock)",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "amazon-bedrock/us.anthropic.claude-opus-4-6-v1:0" },
    },
  },
}
```

## Roles de instancia de EC2

Al ejecutar OpenClaw en una instancia de EC2 con un rol de IAM adjunto, el SDK de AWS puede usar el servicio de metadatos de instancia (IMDS) para la autenticación. Para el descubrimiento de modelos de Bedrock, OpenClaw solo habilita automáticamente el proveedor implícito desde los marcadores de entorno de AWS, a menos que establezca explícitamente `plugins.entries.amazon-bedrock.config.discovery.enabled: true`.

Configuración recomendada para hosts respaldados por IMDS:

- Establezca `plugins.entries.amazon-bedrock.config.discovery.enabled` en `true`.
- Establezca `plugins.entries.amazon-bedrock.config.discovery.region` (o exporte `AWS_REGION`).
- **No** necesita una clave API falsa.
- Solo necesita `AWS_PROFILE=default` si específicamente desea un marcador de entorno para el modo automático o las superficies de estado.

```bash
# Recommended: explicit discovery enable + region
openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1

# Optional: add an env marker if you want auto mode without explicit enable
export AWS_PROFILE=default
export AWS_REGION=us-east-1
```

**Permisos de IAM requeridos** para el rol de instancia de EC2:

- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`
- `bedrock:ListFoundationModels` (para descubrimiento automático)
- `bedrock:ListInferenceProfiles` (para descubrimiento de perfiles de inferencia)

O adjunte la política gestionada `AmazonBedrockFullAccess`.

## Configuración rápida (ruta AWS)

```bash
# 1. Create IAM role and instance profile
aws iam create-role --role-name EC2-Bedrock-Access \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy --role-name EC2-Bedrock-Access \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess

aws iam create-instance-profile --instance-profile-name EC2-Bedrock-Access
aws iam add-role-to-instance-profile \
  --instance-profile-name EC2-Bedrock-Access \
  --role-name EC2-Bedrock-Access

# 2. Attach to your EC2 instance
aws ec2 associate-iam-instance-profile \
  --instance-id i-xxxxx \
  --iam-instance-profile Name=EC2-Bedrock-Access

# 3. On the EC2 instance, enable discovery explicitly
openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1

# 4. Optional: add an env marker if you want auto mode without explicit enable
echo 'export AWS_PROFILE=default' >> ~/.bashrc
echo 'export AWS_REGION=us-east-1' >> ~/.bashrc
source ~/.bashrc

# 5. Verify models are discovered
openclaw models list
```

## Perfiles de inferencia

OpenClaw descubre **perfiles de inferencia regionales y globales** junto con los modelos fundamentales. Cuando un perfil se asigna a un modelo fundamental conocido, el perfil hereda las capacidades de ese modelo (ventana de contexto, tokens máximos, razonamiento, visión) y la región correcta de solicitud de Bedrock se inyecta automáticamente. Esto significa que los perfiles de Claude entre regiones funcionan sin anulaciones manuales del proveedor.

Los ID de los perfiles de inferencia tienen un aspecto como `us.anthropic.claude-opus-4-6-v1:0` (regional) o `anthropic.claude-opus-4-6-v1:0` (global). Si el modelo de respaldo ya está en los resultados del descubrimiento, el perfil hereda su conjunto completo de capacidades; de lo contrario, se aplican valores predeterminados seguros.

No se necesita configuración adicional. Siempre que el descubrimiento esté habilitado y el principal de IAM tenga `bedrock:ListInferenceProfiles`, los perfiles aparecen junto a los modelos base en `openclaw models list`.

## Notas

- Bedrock requiere que el **acceso al modelo** esté habilitado en su cuenta/región de AWS.
- El descubrimiento automático necesita los permisos `bedrock:ListFoundationModels` y
  `bedrock:ListInferenceProfiles`.
- Si confía en el modo automático, configure uno de los marcadores de entorno de autenticación de AWS compatibles en el host de la puerta de enlace. Si prefiere la autenticación IMDS/configuración compartida sin marcadores de entorno, configure
  `plugins.entries.amazon-bedrock.config.discovery.enabled: true`.
- OpenClaw expone el origen de las credenciales en este orden: `AWS_BEARER_TOKEN_BEDROCK`,
  luego `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`, luego `AWS_PROFILE`, y luego la
  cadena predeterminada del SDK de AWS.
- La compatibilidad con el razonamiento depende del modelo; consulte la ficha del modelo de Bedrock para conocer las capacidades actuales.
- Si prefiere un flujo de claves administrado, también puede colocar un proxy compatible con OpenAI delante de Bedrock y configurarlo como proveedor de OpenAI en su lugar.

## Salvaguardas

Puede aplicar [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)
a todas las invocaciones de modelos de Bedrock agregando un objeto `guardrail` a la
configuración del complemento `amazon-bedrock`. Las salvaguardas le permiten aplicar filtros de contenido,
rechazo de temas, filtros de palabras, filtros de información sensible y verificaciones de
fundamentación contextual.

```json5
{
  plugins: {
    entries: {
      "amazon-bedrock": {
        config: {
          guardrail: {
            guardrailIdentifier: "abc123", // guardrail ID or full ARN
            guardrailVersion: "1", // version number or "DRAFT"
            streamProcessingMode: "sync", // optional: "sync" or "async"
            trace: "enabled", // optional: "enabled", "disabled", or "enabled_full"
          },
        },
      },
    },
  },
}
```

- `guardrailIdentifier` (obligatorio) acepta un ID de salvaguarda (p. ej., `abc123`) o un
  ARN completo (p. ej., `arn:aws:bedrock:us-east-1:123456789012:guardrail/abc123`).
- `guardrailVersion` (obligatorio) especifica qué versión publicada usar, o
  `"DRAFT"` para el borrador de trabajo.
- `streamProcessingMode` (opcional) controla si la evaluación de la salvaguarda se ejecuta
  de forma síncrona (`"sync"`) o asíncrona (`"async"`) durante la transmisión. Si
  se omite, Bedrock usa su comportamiento predeterminado.
- `trace` (opcional) habilita la salida de rastreo de la salvaguarda en la respuesta de la API. Establézcalo en
  `"enabled"` o `"enabled_full"` para depuración; omítalo o establézcalo en `"disabled"` para
  producción.

El principal de IAM utilizado por la puerta de enlace debe tener el permiso `bedrock:ApplyGuardrail` además de los permisos de invocación estándar.

## Incrustaciones para la búsqueda de memoria

Bedrock también puede actuar como proveedor de incrustaciones para la [búsqueda de memoria](/en/concepts/memory-search). Esto se configura por separado del proveedor de inferencia — establezca `agents.defaults.memorySearch.provider` en `"bedrock"`:

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "bedrock",
        model: "amazon.titan-embed-text-v2:0", // default
      },
    },
  },
}
```

Las incrustaciones de Bedrock utilizan la misma cadena de credenciales del SDK de AWS que la inferencia (roles de instancia, SSO, claves de acceso, configuración compartida e identidad web). No se necesita ninguna clave de API. Cuando `provider` es `"auto"`, Bedrock se detecta automáticamente si esa cadena de credenciales se resuelve correctamente.

Los modelos de incrustación admitidos incluyen Amazon Titan Embed (v1, v2), Amazon Nova Embed, Cohere Embed (v3, v4) y TwelveLabs Marengo. Consulte [Referencia de configuración de memoria — Bedrock](/en/reference/memory-config#bedrock-embedding-config) para obtener la lista completa de modelos y opciones de dimensión.
