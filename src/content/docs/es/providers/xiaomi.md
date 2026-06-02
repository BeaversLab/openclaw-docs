---
summary: "Use los modelos de pago por uso y Token Plan de Xiaomi MiMo con OpenClaw"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need Xiaomi MiMo auth or Token Plan setup
title: "Xiaomi MiMo"
---

Xiaomi MiMo es la plataforma API para los modelos **MiMo**. OpenClaw incluye un complemento de Xiaomi integrado con dos preajustes de proveedor de texto:

- `xiaomi` para claves de pago por uso (`sk-...`)
- `xiaomi-token-plan` para claves de Token Plan (`tp-...`) con preajustes de puntos de conexión regionales

El mismo complemento también registra el proveedor de voz (TTS) `xiaomi`.

| Propiedad                             | Valor                                                                                                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| IDs de proveedor                      | `xiaomi` (pago por uso), `xiaomi-token-plan` (Token Plan)                                                                                          |
| Complemento                           | integrado, `enabledByDefault: true`                                                                                                                |
| Variables de entorno de autenticación | `XIAOMI_API_KEY`, `XIAOMI_TOKEN_PLAN_API_KEY`                                                                                                      |
| Indicadores de incorporación          | `--auth-choice xiaomi-api-key`, `--auth-choice xiaomi-token-plan-cn`, `--auth-choice xiaomi-token-plan-sgp`, `--auth-choice xiaomi-token-plan-ams` |
| Indicadores directos de CLI           | `--xiaomi-api-key <key>`, `--xiaomi-token-plan-api-key <key>`                                                                                      |
| Contratos                             | completaciones de chat + `speechProviders`                                                                                                         |
| API                                   | Compatible con OpenAI (`openai-completions`)                                                                                                       |
| URL base                              | Pago por uso: `https://api.xiaomimimo.com/v1`; Preajustes de Token Plan: `token-plan-{cn,sgp,ams}...`                                              |
| Modelos predeterminados               | `xiaomi/mimo-v2-flash`, `xiaomi-token-plan/mimo-v2.5-pro`                                                                                          |
| TTS predeterminado                    | `mimo-v2.5-tts`, voz `mimo_default`                                                                                                                |

## Introducción

<Steps>
  <Step title="Obtenga la clave correcta">
    Cree una clave de pago por uso en la [consola de Xiaomi MiMo](https://platform.xiaomimimo.com/#/console/api-keys), o abra su página de suscripción a Token Plan y copie la URL base compatible con OpenAI regional más la clave `tp-...` correspondiente.
  </Step>

  <Step title="Ejecute la incorporación">
    Pago por uso:

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key
    ```

    Token Plan:

    ```bash
    openclaw onboard --auth-choice xiaomi-token-plan-sgp
    ```

    O pase las claves directamente:

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
    openclaw onboard --auth-choice xiaomi-token-plan-sgp --xiaomi-token-plan-api-key "$XIAOMI_TOKEN_PLAN_API_KEY"
    ```

  </Step>
  <Step title="Verifique que el modelo esté disponible">
    ```bash
    openclaw models list --provider xiaomi
    openclaw models list --provider xiaomi-token-plan
    ```
  </Step>
</Steps>

## Catálogo de pago por uso

| Ref. del modelo        | Entrada       | Contexto  | Salida máxima | Razonamiento | Notas                 |
| ---------------------- | ------------- | --------- | ------------- | ------------ | --------------------- |
| `xiaomi/mimo-v2-flash` | texto         | 262,144   | 8,192         | No           | Modelo predeterminado |
| `xiaomi/mimo-v2-pro`   | texto         | 1,048,576 | 32,000        | Sí           | Contexto grande       |
| `xiaomi/mimo-v2-omni`  | texto, imagen | 262,144   | 32,000        | Sí           | Multimodal            |

<Tip>La referencia del modelo predeterminado es `xiaomi/mimo-v2-flash`. El proveedor se inyecta automáticamente cuando se establece `XIAOMI_API_KEY` o existe un perfil de autenticación.</Tip>

## Catálogo del plan de tokens

Elija la opción de autenticación del plan de tokens que coincida con la URL base regional que se muestra en la interfaz de usuario de suscripción de Xiaomi:

- `xiaomi-token-plan-cn` -> `https://token-plan-cn.xiaomimimo.com/v1`
- `xiaomi-token-plan-sgp` -> `https://token-plan-sgp.xiaomimimo.com/v1`
- `xiaomi-token-plan-ams` -> `https://token-plan-ams.xiaomimimo.com/v1`

| Ref. del modelo                   | Entrada       | Contexto  | Salida máxima | Razonamiento | Notas                 |
| --------------------------------- | ------------- | --------- | ------------- | ------------ | --------------------- |
| `xiaomi-token-plan/mimo-v2.5-pro` | texto         | 1,048,576 | 32,000        | Sí           | Modelo predeterminado |
| `xiaomi-token-plan/mimo-v2.5`     | texto, imagen | 1,048,576 | 32,000        | Sí           | Multimodal            |

<Tip>La incorporación del plan de tokens valida el formato de la clave y advierte cuando se introduce una clave `tp-...` en la ruta de pago por uso, o una clave `sk-...` en la ruta del plan de tokens.</Tip>

## Conversión de texto a voz

El complemento `xiaomi` incluido también registra Xiaomi MiMo como proveedor de voz para
`messages.tts`. Llama al contrato TTS de finalizaciones de chat de Xiaomi con el texto como
un mensaje `assistant` y guía de estilo opcional como un mensaje `user`.

| Propiedad      | Valor                                                |
| -------------- | ---------------------------------------------------- |
| ID de TTS      | `xiaomi` (alias `mimo`)                              |
| Autenticación  | `XIAOMI_API_KEY`                                     |
| API            | `POST /v1/chat/completions` con `audio`              |
| Predeterminado | `mimo-v2.5-tts`, voz `mimo_default`                  |
| Salida         | MP3 de forma predeterminada; WAV cuando se configura |

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "xiaomi",
      providers: {
        xiaomi: {
          apiKey: "xiaomi_api_key",
          model: "mimo-v2.5-tts",
          speakerVoice: "mimo_default",
          format: "mp3",
          style: "Bright, natural, conversational tone.",
        },
      },
    },
  },
}
```

Las voces integradas compatibles incluyen `mimo_default`, `default_zh`, `default_en`,
`Mia`, `Chloe`, `Milo` y `Dean`. Se admite `mimo-v2-tts` para cuentas de TTS de MiMo
antiguas; el valor predeterminado utiliza el modelo actual de TTS MiMo-V2.5. Para objetivos de notas de voz
tales como Feishu y Telegram, OpenClaw transcodifica la salida de Xiaomi a 48kHz
Opus con `ffmpeg` antes de la entrega.

## Ejemplo de configuración

```json5
{
  env: { XIAOMI_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "xiaomi/mimo-v2-flash" } } },
  models: {
    mode: "merge",
    providers: {
      xiaomi: {
        baseUrl: "https://api.xiaomimimo.com/v1",
        api: "openai-completions",
        apiKey: "XIAOMI_API_KEY",
        models: [
          {
            id: "mimo-v2-flash",
            name: "Xiaomi MiMo V2 Flash",
            reasoning: false,
            input: ["text"],
            contextWindow: 262144,
            maxTokens: 8192,
          },
          {
            id: "mimo-v2-pro",
            name: "Xiaomi MiMo V2 Pro",
            reasoning: true,
            input: ["text"],
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2-omni",
            name: "Xiaomi MiMo V2 Omni",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 262144,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

Los precios y las banderas de compatibilidad provienen del manifiesto del complemento incluido, por lo que el ejemplo de configuración omite `cost` y `compat` para evitar divergir del comportamiento en tiempo de ejecución.

Plan de Tokens:

```json5
{
  env: { XIAOMI_TOKEN_PLAN_API_KEY: "tp-your-key" },
  agents: { defaults: { model: { primary: "xiaomi-token-plan/mimo-v2.5-pro" } } },
  models: {
    mode: "merge",
    providers: {
      "xiaomi-token-plan": {
        baseUrl: "https://token-plan-sgp.xiaomimimo.com/v1",
        api: "openai-completions",
        apiKey: "XIAOMI_TOKEN_PLAN_API_KEY",
        models: [
          {
            id: "mimo-v2.5-pro",
            name: "Xiaomi MiMo V2.5 Pro",
            reasoning: true,
            input: ["text"],
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2.5",
            name: "Xiaomi MiMo V2.5",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 1048576,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

Los precios provienen del manifiesto incluido (los modelos del Plan de Tokens incluyen precios de lectura de caché por niveles), por lo que el ejemplo de configuración omite `cost`.

<AccordionGroup>
  <Accordion title="Comportamiento de inyección automática">
    El proveedor `xiaomi` se inyecta automáticamente cuando `XIAOMI_API_KEY` está configurado en su entorno o existe un perfil de autenticación. `xiaomi-token-plan` necesita una URL base regional, por lo que la ruta admitida es la opción integrada de incorporación del Plan de Tokens o un bloque de configuración `models.providers.xiaomi-token-plan` explícito.
  </Accordion>

  <Accordion title="Detalles del modelo">
    - **mimo-v2-flash** — ligero y rápido, ideal para tareas de texto de propósito general. Sin soporte de razonamiento.
    - **mimo-v2-pro** — admite razonamiento con una ventana de contexto de 1M tokens para cargas de trabajo de documentos largos.
    - **mimo-v2-omni** — modelo multimodal con capacidad de razonamiento que acepta entradas de texto e imagen.
    - **mimo-v2.5-pro** — predeterminado del Plan de Tokens con la pila de razonamiento actual V2.5 de Xiaomi.
    - **mimo-v2.5** — ruta multimodal V2.5 del Plan de Tokens.

    <Note>
    Los modelos de pago por uso utilizan el prefijo `xiaomi/`. Los modelos del Plan de Tokens utilizan el prefijo `xiaomi-token-plan/`.
    </Note>

  </Accordion>

  <Accordion title="Solución de problemas">
    - Si los modelos no aparecen, confirme que la variable de entorno de clave relevante o el perfil de autenticación están presentes y son válidos.
    - Para el Plan de Tokens, confirme que la región de incorporación elegida coincida con la URL base de la página de suscripción y que la clave comienza con `tp-`.
    - Cuando el Gateway se ejecuta como demonio, asegúrese de que la clave esté disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de `env.shellEnv`).

    <Warning>
    Las claves establecidas solo en su shell interactivo no son visibles para los procesos de gateway administrados por el demonio. Use la configuración `~/.openclaw/.env` o `env.shellEnv` para disponibilidad persistente.
    </Warning>

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Cómo elegir proveedores, referencias de modelos y el comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Referencia completa de configuración de OpenClaw.
  </Card>
  <Card title="Consola de Xiaomi MiMo" href="https://platform.xiaomimimo.com" icon="arrow-up-right-from-square">
    Panel de control de Xiaomi MiMo y gestión de claves de API.
  </Card>
</CardGroup>
