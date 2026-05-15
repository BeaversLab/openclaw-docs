---
summary: "Usar Qwen Cloud a través del proveedor incluido de qwen de OpenClaw"
read_when:
  - You want to use Qwen with OpenClaw
  - You previously used Qwen OAuth
title: "Qwen"
---

<Warning>

**Se ha eliminado Qwen OAuth.** La integración de OAuth del nivel gratuito
(`qwen-portal`) que utilizaba los puntos de conexión `portal.qwen.ai` ya no está disponible.
Consulte el [número 49557](https://github.com/openclaw/openclaw/issues/49557) para obtener
más información.

</Warning>

OpenClaw ahora trata a Qwen como un proveedor incluido de primera clase con el ID canónico
`qwen`. El proveedor incluido se dirige a los puntos de conexión de Qwen Cloud / Alibaba DashScope y
del Coding Plan y mantiene los IDs heredados `modelstudio` funcionando como un
alias de compatibilidad.

- Proveedor: `qwen`
- Variable de entorno preferida: `QWEN_API_KEY`
- También se acepta por compatibilidad: `MODELSTUDIO_API_KEY`, `DASHSCOPE_API_KEY`
- Estilo de API: compatible con OpenAI

<Tip>Si desea `qwen3.6-plus`, prefiera el punto de conexión **Standard (pay-as-you-go)**. La compatibilidad con el Coding Plan puede ir por detrás del catálogo público.</Tip>

## Introducción

Elija su tipo de plan y siga los pasos de configuración.

<Tabs>
  <Tab title="Coding Plan (suscripción)">
    **Lo mejor para:** acceso basado en suscripción a través del Qwen Coding Plan.

    <Steps>
      <Step title="Obtener su clave de API">
        Cree o copie una clave de API desde [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys).
      </Step>
      <Step title="Ejecutar la incorporación">
        Para el punto de conexión **Global**:

        ```bash
        openclaw onboard --auth-choice qwen-api-key
        ```

        Para el punto de conexión **China**:

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
    Los identificadores de elección de autenticación `modelstudio-*` heredados y las referencias de modelo `modelstudio/...` todavía
    funcionan como alias de compatibilidad, pero los nuevos flujos de configuración deben preferir los identificadores de elección de autenticación canónicos
    `qwen-*` y las referencias de modelo `qwen/...`. Si define una entrada personalizada `models.providers.modelstudio` exacta con otro valor `api`, ese proveedor personalizado posee las referencias `modelstudio/...` en lugar del alias de compatibilidad de Qwen.
    </Note>

  </Tab>

  <Tab title="Estándar (pago por uso)">
    **Lo mejor para:** acceso de pago por uso a través del endpoint estándar de Model Studio, incluyendo modelos como `qwen3.6-plus` que podrían no estar disponibles en el Plan de Codificación.

    <Steps>
      <Step title="Obtén tu clave de API">
        Crea o copia una clave de API desde [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys).
      </Step>
      <Step title="Ejecuta la incorporación">
        Para el endpoint **Global**:

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key
        ```

        Para el endpoint **China**:

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
      <Step title="Verificar que el modelo está disponible">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    Los ids de elección de autenticación `modelstudio-*` heredados y las referencias de modelos `modelstudio/...` todavía
    funcionan como alias de compatibilidad, pero los nuevos flujos de configuración deberían preferir los
    ids de elección de autenticación canónicos `qwen-*` y las referencias de modelos `qwen/...`. Si defines una entrada
    personalizada exacta `models.providers.modelstudio` con otro valor `api`,
    ese proveedor personalizado posee las referencias `modelstudio/...` en lugar del alias de
    compatibilidad de Qwen.
    </Note>

  </Tab>
</Tabs>

## Tipos de plan y endpoints

| Plan                      | Región | Opción de autenticación    | Endpoint                                         |
| ------------------------- | ------ | -------------------------- | ------------------------------------------------ |
| Estándar (pago por uso)   | China  | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| Estándar (pago por uso)   | Global | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Coding Plan (suscripción) | China  | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Coding Plan (suscripción) | Global | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |

El proveedor selecciona automáticamente el punto de conexión basándose en tu elección de autenticación. Las opciones
canónicas utilizan la familia `qwen-*`; `modelstudio-*` permanece solo para compatibilidad.
Puedes anular esto con un `baseUrl` personalizado en la configuración.

<Tip>**Gestionar claves:** [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) | **Documentación:** [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)</Tip>

## Catálogo integrado

OpenClaw actualmente incluye este catálogo integrado de Qwen. El catálogo configurado es
consciente del endpoint: las configuraciones del Plan de Codificación omiten los modelos que solo se sabe que funcionan en
el endpoint Estándar.

| Ref. de modelo              | Entrada       | Contexto  | Notas                                                       |
| --------------------------- | ------------- | --------- | ----------------------------------------------------------- |
| `qwen/qwen3.5-plus`         | texto, imagen | 1,000,000 | Modelo predeterminado                                       |
| `qwen/qwen3.6-plus`         | texto, imagen | 1,000,000 | Prefiera los endpoints Estándar cuando necesite este modelo |
| `qwen/qwen3-max-2026-01-23` | texto         | 262,144   | Línea Qwen Max                                              |
| `qwen/qwen3-coder-next`     | texto         | 262,144   | Codificación                                                |
| `qwen/qwen3-coder-plus`     | texto         | 1,000,000 | Codificación                                                |
| `qwen/MiniMax-M2.5`         | texto         | 1,000,000 | Razonamiento habilitado                                     |
| `qwen/glm-5`                | texto         | 202,752   | GLM                                                         |
| `qwen/glm-4.7`              | texto         | 202,752   | GLM                                                         |
| `qwen/kimi-k2.5`            | texto, imagen | 262,144   | Moonshot AI a través de Alibaba                             |

<Note>La disponibilidad aún puede variar según el endpoint y el plan de facturación incluso cuando un modelo está presente en el catálogo integrado.</Note>

## Controles de pensamiento

Para los modelos de Qwen Cloud con razonamiento habilitado, el proveedor integrado asigna los niveles de pensamiento de OpenClaw
al indicador de solicitud de nivel superior `enable_thinking` de DashScope. El pensamiento
deshabilitado envía `enable_thinking: false`; otros niveles de pensamiento envían
`enable_thinking: true`.

## Complementos multimodales

El complemento `qwen` también expone capacidades multimodales en los endpoints de DashScope
**Estándar** (no en los endpoints del Plan de Codificación):

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

<Note>Consulte [Generación de video](/es/tools/video-generation) para obtener parámetros de herramientas compartidos, selección de proveedor y comportamiento de conmutación por error.</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Comprensión de imágenes y videos">
    El complemento Qwen incluido registra la comprensión de medios para imágenes y videos
    en los puntos de conexión **Standard** de DashScope (no en los puntos de conexión del Coding Plan).

    | Propiedad      | Valor                 |
    | ------------- | --------------------- |
    | Modelo         | `qwen-vl-max-latest`  |
    | Entrada compatible | Imágenes, video       |

    La comprensión de medios se resuelve automáticamente desde la autenticación de Qwen configurada; no
    se necesita configuración adicional. Asegúrese de estar utilizando un punto de conexión Standard (pago por uso)
    para el soporte de comprensión de medios.

  </Accordion>

  <Accordion title="Qwen 3.6 Plus disponibilidad">
    `qwen3.6-plus` está disponible en los puntos de conexión de Model Studio
    Estándar (pago por uso):

    - China: `dashscope.aliyuncs.com/compatible-mode/v1`
    - Global: `dashscope-intl.aliyuncs.com/compatible-mode/v1`

    Si los puntos de conexión del Coding Plan devuelven un error de "modelo no compatible" para
    `qwen3.6-plus`, cambie a Estándar (pago por uso) en lugar del par de
    punto de conexión/clave del Coding Plan.

    El catálogo Qwen incluido en OpenClaw no anuncia `qwen3.6-plus` en los puntos de
    conexión del Coding Plan, pero las entradas `qwen/qwen3.6-plus` configuradas explícitamente en
    `models.providers.qwen.models` se respetan en los baseUrl del Coding Plan, por lo que
    puede optar por ese modelo si Aliyun lo habilita en su suscripción. La
    API upstream decide si la llamada se realiza correctamente.

  </Accordion>

  <Accordion title="Plan de capacidades">
    El complemento `qwen` se está posicionando como el hogar del proveedor para toda la
    superficie de Qwen Cloud, no solo para modelos de codificación/texto.

    - **Modelos de texto/chat:** incluidos ahora
    - **Llamada a herramientas, salida estructurada, pensamiento:** heredados del transporte compatible con OpenAI
    - **Generación de imágenes:** planificado en la capa de complementos del proveedor
    - **Comprensión de imagen/video:** incluida ahora en el punto de conexión Estándar
    - **Voz/audio:** planificado en la capa de complementos del proveedor
    - **Incrustaciones de memoria/reranking:** planificado a través de la superficie del adaptador de incrustaciones
    - **Generación de video:** incluida ahora a través de la capacidad compartida de generación de video

  </Accordion>

  <Accordion title="Detalles de la generación de video">
    Para la generación de video, OpenClaw asigna la región de Qwen configurada al host AIGC de DashScope correspondiente antes de enviar el trabajo:

    - Global/Intl: `https://dashscope-intl.aliyuncs.com`
    - China: `https://dashscope.aliyuncs.com`

    Esto significa que un `models.providers.qwen.baseUrl` normal que apunte a los hosts del Coding Plan o a los hosts estándar de Qwen mantiene la generación de video en el endpoint de video regional correcto de DashScope.

    Límites actuales de generación de video del Qwen incluido:

    - Hasta **1** video de salida por solicitud
    - Hasta **1** imagen de entrada
    - Hasta **4** videos de entrada
    - Duración de hasta **10 segundos**
    - Soporta `size`, `aspectRatio`, `resolution`, `audio` y `watermark`
    - El modo de imagen/video de referencia actualmente requiere **URLs http(s) remotas**. Las rutas de archivos locales se rechazan de inmediato porque el endpoint de video de DashScope no acepta buffers locales cargados para esas referencias.

  </Accordion>

  <Accordion title="Compatibilidad del uso de streaming">
    Los endpoints nativos de Model Studio anuncian compatibilidad de uso de streaming en el transporte `openai-completions` compartido. Las claves de OpenClaw activan las capacidades del endpoint ahora, por lo que los ids de proveedor personalizados compatibles con DashScope que apuntan a los mismos hosts nativos heredan el mismo comportamiento de uso de streaming en lugar de requerir específicamente el id de proveedor `qwen` integrado.

    La compatibilidad de uso de streaming nativo se aplica tanto a los hosts del Coding Plan como a los hosts estándar compatibles con DashScope:

    - `https://coding.dashscope.aliyuncs.com/v1`
    - `https://coding-intl.dashscope.aliyuncs.com/v1`
    - `https://dashscope.aliyuncs.com/compatible-mode/v1`
    - `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="Regiones de endpoints multimodales">
    Las superficies multimodales (comprensión de video y generación de video Wan) utilizan los endpoints **Estándar** de DashScope, no los endpoints del Coding Plan:

    - URL base Estándar Global/Intl: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
    - URL base Estándar China: `https://dashscope.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="Entorno y configuración del demonio">
    Si la Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que `QWEN_API_KEY` esté
    disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de
    `env.shellEnv`).
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelos" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Generación de video" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de video y selección de proveedores.
  </Card>
  <Card title="Alibaba (ModelStudio)" href="/es/providers/alibaba" icon="cloud">
    Proveedor heredado de ModelStudio y notas de migración.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="wrench">
    Solución general de problemas y preguntas frecuentes.
  </Card>
</CardGroup>
