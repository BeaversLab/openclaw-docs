---
summary: "Usar Qwen Cloud a través del proveedor integrado qwen de OpenClaw"
read_when:
  - You want to use Qwen with OpenClaw
  - You previously used Qwen OAuth
title: "Qwen"
---

OpenClaw ahora trata a Qwen como un proveedor integrado de primera clase con el ID canónico `qwen`. El proveedor integrado tiene como objetivo los puntos de conexión de Qwen Cloud / Alibaba DashScope y Coding Plan, mantiene los IDs heredados `modelstudio` funcionando como un alias de compatibilidad y también expone el flujo de token de Qwen Portal como proveedor `qwen-oauth`.

- Proveedor: `qwen`
- Proveedor del portal: [`qwen-oauth`](/es/providers/qwen-oauth)
- Variable de entorno preferida: `QWEN_API_KEY`
- También aceptado por compatibilidad: `MODELSTUDIO_API_KEY`, `DASHSCOPE_API_KEY`
- Estilo de API: compatible con OpenAI

<Tip>Si quieres `qwen3.6-plus`, prefiere el punto de conexión **Standard (pay-as-you-go)**. El soporte de Coding Plan puede ir rezagado respecto al catálogo público.</Tip>

## Introducción

Elija su tipo de plan y siga los pasos de configuración.

<Tabs>
  <Tab title="Plan de Código (suscripción)">
    **Lo mejor para:** acceso basado en suscripción a través del Qwen Coding Plan.

    <Steps>
      <Step title="Obtener tu clave de API">
        Crea o copia una clave de API desde [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys).
      </Step>
      <Step title="Ejecutar la incorporación">
        Para el endpoint **Global**:

        ```bash
        openclaw onboard --auth-choice qwen-api-key
        ```

        Para el endpoint **China**:

        ```bash
        openclaw onboard --auth-choice qwen-api-key-cn
        ```
      </Step>
      <Step title="Establecer un modelo predeterminado">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step title="Verificar que el modelo esté disponible">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    Los ids de elección de autenticación `modelstudio-*` y las referencias de modelo `modelstudio/...` heredados todavía
    funcionan como alias de compatibilidad, pero los nuevos flujos de configuración deben preferir los ids de
    elección de autenticación `qwen-*` y las referencias de modelo `qwen/...`. Si defines una
    entrada personalizada exacta `models.providers.modelstudio` con otro valor `api` , ese
    proveedor personalizado posee las referencias `modelstudio/...` en lugar del alias de
    compatibilidad de Qwen.
    </Note>

  </Tab>

  <Tab title="Estándar (pago por uso)">
    **Lo mejor para:** acceso de pago por uso a través del punto de conexión estándar de Model Studio, incluyendo modelos como `qwen3.6-plus` que pueden no estar disponibles en el Plan de Codificación.

    <Steps>
      <Step title="Obtener tu clave de API">
        Crea o copia una clave de API desde [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys).
      </Step>
      <Step title="Ejecutar la incorporación">
        Para el punto de conexión **Global**:

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key
        ```

        Para el punto de conexión **China**:

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key-cn
        ```
      </Step>
      <Step title="Establecer un modelo predeterminado">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step title="Verificar que el modelo esté disponible">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    Los identificadores de elección de autenticación `modelstudio-*` heredados y las referencias de modelo `modelstudio/...` todavía
    funcionan como alias de compatibilidad, pero los nuevos flujos de configuración deben preferir los identificadores de elección de autenticación canónicos
    `qwen-*` y las referencias de modelo `qwen/...`. Si defines una entrada
    personalizada `models.providers.modelstudio` exacta con otro valor `api`, ese
    proveedor personalizado posee las referencias `modelstudio/...` en lugar del alias de compatibilidad de Qwen.
    </Note>

  </Tab>

  <Tab title="Qwen OAuth / Portal">
    **Mejor para:** un token de Qwen Portal contra `https://portal.qwen.ai/v1`.

    Consulte [Qwen OAuth / Portal](/es/providers/qwen-oauth) para la página dedicada del proveedor
    y las notas de migración.

    <Steps>
      <Step title="Proporcione su token de portal">
        ```bash
        openclaw onboard --auth-choice qwen-oauth
        ```
      </Step>
      <Step title="Establezca un modelo predeterminado">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen-oauth/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step title="Verifique que el modelo esté disponible">
        ```bash
        openclaw models list --provider qwen-oauth
        ```
      </Step>
    </Steps>

    <Note>
    `qwen-oauth` usa el mismo nombre de variable de entorno `QWEN_API_KEY` que el proveedor
    DashScope, pero almacena la autenticación bajo el ID de proveedor `qwen-oauth` cuando se configura
    a través del proceso de incorporación de OpenClaw.
    </Note>

  </Tab>
</Tabs>

## Tipos de planes y puntos de conexión

| Plan                               | Región | Elección de autenticación  | Punto de conexión                                |
| ---------------------------------- | ------ | -------------------------- | ------------------------------------------------ |
| Estándar (pago por uso)            | China  | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| Estándar (pago por uso)            | Global | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Plan de codificación (suscripción) | China  | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Plan de codificación (suscripción) | Global | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |
| Qwen Portal                        | Global | `qwen-oauth`               | `portal.qwen.ai/v1`                              |

El proveedor selecciona automáticamente el punto de conexión según su elección de autenticación. Las opciones
canónicas utilizan la familia `qwen-*`; `modelstudio-*` permanece solo para compatibilidad.
Puede anular esto con un `baseUrl` personalizado en la configuración.

<Tip>**Gestionar claves:** [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) | **Documentación:** [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)</Tip>

## Catálogo integrado

OpenClaw actualmente incluye este catálogo Qwen integrado. El catálogo configurado es
consciente del punto de conexión: las configuraciones del Plan de codificación omiten los modelos que se sabe que solo funcionan en
el punto de conexión Estándar.

| Ref. del modelo             | Entrada       | Contexto  | Notas                                                                |
| --------------------------- | ------------- | --------- | -------------------------------------------------------------------- |
| `qwen/qwen3.5-plus`         | texto, imagen | 1,000,000 | Modelo predeterminado                                                |
| `qwen/qwen3.6-plus`         | texto, imagen | 1,000,000 | Prefiera los puntos de conexión estándar cuando necesite este modelo |
| `qwen/qwen3-max-2026-01-23` | texto         | 262,144   | Línea Qwen Max                                                       |
| `qwen/qwen3-coder-next`     | texto         | 262,144   | Codificación                                                         |
| `qwen/qwen3-coder-plus`     | texto         | 1,000,000 | Codificación                                                         |
| `qwen/MiniMax-M2.5`         | texto         | 1,000,000 | Razonamiento habilitado                                              |
| `qwen/glm-5`                | texto         | 202,752   | GLM                                                                  |
| `qwen/glm-4.7`              | texto         | 202,752   | GLM                                                                  |
| `qwen/kimi-k2.5`            | texto, imagen | 262,144   | Moonshot AI a través de Alibaba                                      |
| `qwen-oauth/qwen3.5-plus`   | texto, imagen | 1,000,000 | Predeterminado de Qwen Portal                                        |

<Note>La disponibilidad aún puede variar según el punto de conexión y el plan de facturación, incluso cuando un modelo está presente en el catálogo incluido.</Note>

## Controles de pensamiento

Para los modelos de Qwen Cloud con razonamiento habilitado, el proveedor incluido asigna los niveles de pensamiento de OpenClaw
a la marca de solicitud de nivel superior `enable_thinking` de DashScope. El pensamiento
deshabilitado envía `enable_thinking: false`; otros niveles de pensamiento envían
`enable_thinking: true`.

## Complementos multimodales

El complemento `qwen` también expone capacidades multimodales en los puntos de conexión **Estándar**
de DashScope (no en los puntos de conexión del Plan de Codificación):

- **Comprensión de video** a través de `qwen-vl-max-latest`
- **Generación de video Wan** a través de `wan2.6-t2v` (predeterminado), `wan2.6-i2v`, `wan2.6-r2v`, `wan2.6-r2v-flash`, `wan2.7-r2v`

Para usar Qwen como proveedor de video predeterminado:

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "qwen/wan2.6-t2v" },
    },
  },
}
```

<Note>Consulte [Generación de video](/es/tools/video-generation) para obtener parámetros de herramientas compartidas, selección de proveedor y comportamiento de conmutación por error.</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Comprensión de imágenes y videos">
    El complemento Qwen incluido registra la comprensión de medios para imágenes y videos
    en los puntos de conexión DashScope **Standard** (no en los puntos de conexión Coding Plan).

    | Propiedad      | Valor                 |
    | ------------- | --------------------- |
    | Modelo         | `qwen-vl-max-latest`  |
    | Entrada admitida | Imágenes, video       |

    La comprensión de medios se resuelve automáticamente desde la autenticación de Qwen configurada; no
    se necesita configuración adicional. Asegúrese de utilizar un punto de conexión Standard (pay-as-you-go)
    para la compatibilidad con la comprensión de medios.

  </Accordion>

  <Accordion title="Disponibilidad de Qwen 3.6 Plus">
    `qwen3.6-plus` está disponible en los puntos de conexión Model Studio Standard (pay-as-you-go):

    - China: `dashscope.aliyuncs.com/compatible-mode/v1`
    - Global: `dashscope-intl.aliyuncs.com/compatible-mode/v1`

    Si los puntos de conexión Coding Plan devuelven un error de "modelo no admitido" para
    `qwen3.6-plus`, cambie a Standard (pay-as-you-go) en lugar del par de punto de conexión/clave
    Coding Plan.

    El catálogo Qwen incluido de OpenClaw no anuncia `qwen3.6-plus` en los puntos de conexión
    Coding Plan, pero las entradas `qwen/qwen3.6-plus` configuradas explícitamente bajo
    `models.providers.qwen.models` se respetan en los baseUrl de Coding Plan, por lo que
    puede optar por ese modelo si Aliyun lo habilita en su suscripción. La
    API ascendente todavía decide si la llamada tiene éxito.

  </Accordion>

  <Accordion title="Plan de capacidades">
    El complemento `qwen` se está posicionando como el proveedor principal para toda la superficie
    Qwen Cloud, no solo para modelos de codificación/texto.

    - **Modelos de texto/chat:** incluidos ahora
    - **Llamada a herramientas, salida estructurada, razonamiento:** heredados del transporte compatible con OpenAI
    - **Generación de imágenes:** planeada en la capa de complemento del proveedor
    - **Comprensión de imágenes/video:** incluida ahora en el punto de conexión Standard
    - **Voz/audio:** planeada en la capa de complemento del proveedor
    - **Incrustaciones de memoria/reranking:** planeadas a través de la superficie del adaptador de incrustaciones
    - **Generación de video:** incluida ahora a través de la capacidad compartida de generación de video

  </Accordion>

  <Accordion title="Detalles de generación de video">
    Para la generación de video, OpenClaw asigna la región de Qwen configurada al host
    de DashScope AIGC correspondiente antes de enviar el trabajo:

    - Global/Intl: `https://dashscope-intl.aliyuncs.com`
    - China: `https://dashscope.aliyuncs.com`

    Esto significa que un `models.providers.qwen.baseUrl` normal que apunte a los hosts
    Coding Plan o Qwen Standard mantiene la generación de video en el punto de conexión
    de video regional correcto de DashScope.

    Límites actuales de generación de video del paquete Qwen:

    - Hasta **1** video de salida por solicitud
    - Hasta **1** imagen de entrada
    - Hasta **4** videos de entrada
    - Hasta **10 segundos** de duración
    - Admite `size`, `aspectRatio`, `resolution`, `audio` y `watermark`
    - El modo de imagen/video de referencia actualmente requiere **URLs http(s) remotas**. Las rutas
      de archivos locales se rechazan de inmediato porque el punto de conexión de video de DashScope no
      acepta búferes locales cargados para esas referencias.

  </Accordion>

  <Accordion title="Compatibilidad de uso en streaming">
    Los puntos de conexión nativos de Model Studio anuncian compatibilidad de uso en streaming en el
    transporte compartido `openai-completions`. OpenClaw detecta las capacidades
    del punto de conexión ahora, por lo que los ids de proveedores personalizados compatibles con DashScope que apuntan a
    los mismos hosts nativos heredan el mismo comportamiento de uso en streaming en lugar de
    requerir específicamente el id de proveedor `qwen` integrado.

    La compatibilidad de uso en streaming nativo se aplica tanto a los hosts Coding Plan como
    a los hosts estándar compatibles con DashScope:

    - `https://coding.dashscope.aliyuncs.com/v1`
    - `https://coding-intl.dashscope.aliyuncs.com/v1`
    - `https://dashscope.aliyuncs.com/compatible-mode/v1`
    - `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="Regiones de puntos de conexión multimodales">
    Las superficies multimodales (comprensión de video y generación de video Wan) utilizan los
    puntos de conexión **Estándar** de DashScope, no los puntos de conexión Coding Plan:

    - URL base Estándar Global/Intl: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
    - URL base Estándar China: `https://dashscope.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="Configuración del entorno y del demonio">
    Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que `QWEN_API_KEY` esté
    disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de
    `env.shellEnv`).
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelos" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Generación de videos" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de video y selección del proveedor.
  </Card>
  <Card title="Alibaba (ModelStudio)" href="/es/providers/alibaba" icon="cloud">
    Proveedor heredado de ModelStudio y notas de migración.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="wrench">
    Solución general de problemas y preguntas frecuentes.
  </Card>
</CardGroup>
