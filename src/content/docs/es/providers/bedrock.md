---
summary: "Usar modelos de Amazon Bedrock (API de Converse) con OpenClaw"
read_when:
  - You want to use Amazon Bedrock models with OpenClaw
  - You need AWS credential/region setup for model calls
title: "Amazon Bedrock"
---

# Amazon Bedrock

OpenClaw puede utilizar modelos de **Amazon Bedrock** a través del proveedor de transmisión **Bedrock Converse** de pi-ai. La autenticación de Bedrock utiliza la **cadena de credenciales predeterminada del SDK de AWS**, no una clave de API.

| Propiedad     | Valor                                                                                   |
| ------------- | --------------------------------------------------------------------------------------- |
| Proveedor     | `amazon-bedrock`                                                                        |
| API           | `bedrock-converse-stream`                                                               |
| Autenticación | Credenciales de AWS (variables de entorno, configuración compartida o rol de instancia) |
| Región        | `AWS_REGION` o `AWS_DEFAULT_REGION` (predeterminado: `us-east-1`)                       |

## Primeros pasos

Elija su método de autenticación preferido y siga los pasos de configuración.

<Tabs>
  <Tab title="Claves de acceso / variables de entorno">
    **Lo mejor para:** máquinas de desarrolladores, CI o hosts donde gestiona las credenciales de AWS directamente.

    <Steps>
      <Step title="Establecer las credenciales de AWS en el host de la puerta de enlace">
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
      </Step>
      <Step title="Añadir un proveedor y modelo de Bedrock a su configuración">
        No se requiere `apiKey`. Configure el proveedor con `auth: "aws-sdk"`:

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
      </Step>
      <Step title="Verificar que los modelos estén disponibles">
        ```bash
        openclaw models list
        ```
      </Step>
    </Steps>

    <Tip>
    Con la autenticación de marcador de entorno (`AWS_ACCESS_KEY_ID`, `AWS_PROFILE` o `AWS_BEARER_TOKEN_BEDROCK`), OpenClaw habilita automáticamente el proveedor implícito de Bedrock para el descubrimiento de modelos sin configuración adicional.
    </Tip>

  </Tab>

  <Tab title="Roles de instancia de EC2 (IMDS)">
    **Mejor para:** Instancias de EC2 con un rol de IAM asociado, que utilizan el servicio de metadatos de la instancia para la autenticación.

    <Steps>
      <Step title="Habilitar el descubrimiento explícitamente">
        Al usar IMDS, OpenClaw no puede detectar la autenticación de AWS solo a través de los marcadores de entorno, por lo que debes optar por participar:

        ```bash
        openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
        openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1
        ```
      </Step>
      <Step title="Opcionalmente, agregar un marcador de entorno para el modo automático">
        Si también deseas que funcione la ruta de detección automática por marcadores de entorno (por ejemplo, para las superficies `openclaw status`):

        ```bash
        export AWS_PROFILE=default
        export AWS_REGION=us-east-1
        ```

        **No** necesitas una clave API falsa.
      </Step>
      <Step title="Verificar que los modelos se descubran">
        ```bash
        openclaw models list
        ```
      </Step>
    </Steps>

    <Warning>
    El rol de IAM asociado a tu instancia de EC2 debe tener los siguientes permisos:

    - `bedrock:InvokeModel`
    - `bedrock:InvokeModelWithResponseStream`
    - `bedrock:ListFoundationModels` (para descubrimiento automático)
    - `bedrock:ListInferenceProfiles` (para descubrimiento de perfiles de inferencia)

    O adjunta la política administrada `AmazonBedrockFullAccess`.
    </Warning>

    <Note>
    Solo necesitas `AWS_PROFILE=default` si deseas específicamente un marcador de entorno para el modo automático o las superficies de estado. La ruta de autenticación del tiempo de ejecución de Bedrock real utiliza la cadena predeterminada del SDK de AWS, por lo que la autenticación del rol de instancia IMDS funciona incluso sin marcadores de entorno.
    </Note>

  </Tab>
</Tabs>

## Descubrimiento automático de modelos

OpenClaw puede descubrir automáticamente los modelos de Bedrock que admiten **streaming**
y **salida de texto**. El descubrimiento utiliza `bedrock:ListFoundationModels` y
`bedrock:ListInferenceProfiles`, y los resultados se almacenan en caché (predeterminado: 1 hora).

Cómo se habilita el proveedor implícito:

- Si `plugins.entries.amazon-bedrock.config.discovery.enabled` es `true`,
  OpenClaw intentará el descubrimiento incluso cuando no haya ningún marcador de entorno de AWS presente.
- Si `plugins.entries.amazon-bedrock.config.discovery.enabled` no está establecido,
  OpenClaw solo añade automáticamente el
  proveedor implícito de Bedrock cuando detecta uno de estos marcadores de autenticación de AWS:
  `AWS_BEARER_TOKEN_BEDROCK`, `AWS_ACCESS_KEY_ID` +
  `AWS_SECRET_ACCESS_KEY`, o `AWS_PROFILE`.
- La ruta de autenticación real en tiempo de ejecución de Bedrock todavía utiliza la cadena predeterminada del SDK de AWS, por lo que la configuración compartida, el SSO y la autenticación de roles de instancia IMDS pueden funcionar incluso cuando el descubrimiento necesitaba `enabled: true` para optar por participar.

<Note>
  Para entradas explícitas de `models.providers["amazon-bedrock"]`, OpenClaw aún puede resolver la autenticación de marcadores de entorno de Bedrock temprano desde marcadores de entorno de AWS como `AWS_BEARER_TOKEN_BEDROCK` sin forzar la carga completa de la autenticación en tiempo de ejecución. La ruta de autenticación real de la llamada al modelo todavía utiliza la cadena predeterminada del SDK
  de AWS.
</Note>

<AccordionGroup>
  <Accordion title="Opciones de configuración de descubrimiento">
    Las opciones de configuración se encuentran bajo `plugins.entries.amazon-bedrock.config.discovery`:

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

    | Opción | Predeterminado | Descripción |
    | ------ | ------- | ----------- |
    | `enabled` | auto | En modo automático, OpenClaw solo habilita el proveedor implícito de Bedrock cuando ve un marcador de entorno de AWS compatible. Establezca `true` para forzar el descubrimiento. |
    | `region` | `AWS_REGION` / `AWS_DEFAULT_REGION` / `us-east-1` | Región de AWS utilizada para las llamadas a la API de descubrimiento. |
    | `providerFilter` | (todas) | Coincide con los nombres de los proveedores de Bedrock (por ejemplo `anthropic`, `amazon`). |
    | `refreshInterval` | `3600` | Duración de la caché en segundos. Establézcalo en `0` para desactivar el almacenamiento en caché. |
    | `defaultContextWindow` | `32000` | Ventana de contexto utilizada para los modelos descubiertos (anule esto si conoce los límites de su modelo). |
    | `defaultMaxTokens` | `4096` | Tokens de salida máximos utilizados para los modelos descubiertos (anule esto si conoce los límites de su modelo). |

  </Accordion>
</AccordionGroup>

## Configuración rápida (ruta AWS)

Este tutorial crea un rol de IAM, adjunta permisos de Bedrock, asocia el perfil de instancia y habilita el descubrimiento de OpenClaw en el host EC2.

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

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Perfiles de inferencia">
    OpenClaw detecta **perfiles de inferencia regionales y globales** junto con
    los modelos fundamentales. Cuando un perfil se asigna a un modelo fundamental
    conocido, el perfil hereda las capacidades de ese modelo (ventana contextual,
    tokens máximos, razonamiento, visión) y la región correcta de solicitud de
    Bedrock se inyecta automáticamente. Esto significa que los perfiles de Claude
    entre regiones funcionan sin necesidad de anulaciones manuales del proveedor.

    Los ID de los perfiles de inferencia tienen el aspecto de `us.anthropic.claude-opus-4-6-v1:0` (regional)
    o `anthropic.claude-opus-4-6-v1:0` (global). Si el modelo subyacente ya está
    en los resultados de detección, el perfil hereda su conjunto completo de
    capacidades; de lo contrario, se aplican valores predeterminados seguros.

    No se necesita ninguna configuración adicional. Siempre que la detección esté
    habilitada y la entidad de IAM tenga `bedrock:ListInferenceProfiles`, los perfiles
    aparecen junto con los modelos fundamentales en `openclaw models list`.

  </Accordion>

  <Accordion title="Guardrails">
    Puede aplicar [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)
    a todas las invocaciones de modelos de Bedrock agregando un objeto `guardrail` a la
    configuración del complemento `amazon-bedrock`. Guardrails le permite aplicar filtros de contenido,
    denegación de temas, filtros de palabras, filtros de información sensible y comprobaciones de
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

    | Opción | Obligatorio | Descripción |
    | ------ | ----------- | ----------- |
    | `guardrailIdentifier` | Sí | ID de guardrail (p. ej. `abc123`) o ARN completo (p. ej. `arn:aws:bedrock:us-east-1:123456789012:guardrail/abc123`). |
    | `guardrailVersion` | Sí | Número de versión publicada o `"DRAFT"` para el borrador de trabajo. |
    | `streamProcessingMode` | No | `"sync"` o `"async"` para la evaluación del guardrail durante la transmisión. Si se omite, Bedrock usa su valor predeterminado. |
    | `trace` | No | `"enabled"` o `"enabled_full"` para depuración; omita o establezca `"disabled"` para producción. |

    <Warning>
    La entidad de IAM utilizada por la puerta de enlace debe tener el permiso `bedrock:ApplyGuardrail` además de los permisos de invocación estándar.
    </Warning>

  </Accordion>

  <Accordion title="Incrustaciones para la búsqueda de memoria">
    Bedrock también puede actuar como proveedor de incrustaciones para
    [memory search](/es/concepts/memory-search). Esto se configura por separado del
    proveedor de inferencia: configure `agents.defaults.memorySearch.provider` en `"bedrock"`:

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

    Las incrustaciones de Bedrock utilizan la misma cadena de credenciales del AWS SDK que la inferencia (roles de instancia,
    SSO, claves de acceso, configuración compartida e identidad web). No se necesita
    ninguna clave API. Cuando `provider` es `"auto"`, Bedrock se detecta automáticamente si esa
    cadena de credenciales se resuelve correctamente.

    Los modelos de incrustación compatibles incluyen Amazon Titan Embed (v1, v2), Amazon Nova
    Embed, Cohere Embed (v3, v4) y TwelveLabs Marengo. Consulte
    [Referencia de configuración de memoria -- Bedrock](/es/reference/memory-config#bedrock-embedding-config)
    para obtener la lista completa de modelos y opciones de dimensiones.

  </Accordion>

  <Accordion title="Notas y advertencias">
    - Bedrock requiere que el **acceso al modelo** esté habilitado en su cuenta/región de AWS.
    - El descubrimiento automático necesita los permisos `bedrock:ListFoundationModels` y
      `bedrock:ListInferenceProfiles`.
    - Si confía en el modo automático, establezca uno de los marcadores de entorno de autenticación de AWS compatibles en el
      host de la puerta de enlace. Si prefiere la autenticación IMDS/configuración compartida sin marcadores de entorno, establezca
      `plugins.entries.amazon-bedrock.config.discovery.enabled: true`.
    - OpenClaw expone el origen de las credenciales en este orden: `AWS_BEARER_TOKEN_BEDROCK`,
      luego `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`, luego `AWS_PROFILE`, y luego la
      cadena predeterminada del AWS SDK.
    - La compatibilidad con el razonamiento depende del modelo; consulte la ficha del modelo de Bedrock para conocer las
    capacidades actuales.
    - Si prefiere un flujo de claves administradas, también puede colocar un proxy compatible con OpenAI
      delante de Bedrock y configurarlo como proveedor de OpenAI.
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Búsqueda de memoria" href="/es/concepts/memory-search" icon="magnifying-glass">
    Embeddings de Bedrock para la configuración de búsqueda de memoria.
  </Card>
  <Card title="Referencia de configuración de memoria" href="/es/reference/memory-config#bedrock-embedding-config" icon="database">
    Lista completa de modelos de embeddings de Bedrock y opciones de dimensiones.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="wrench">
    Solución de problemas general y preguntas frecuentes.
  </Card>
</CardGroup>
