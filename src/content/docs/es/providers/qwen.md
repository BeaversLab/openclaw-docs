---
summary: "Usar Qwen Cloud a través del proveedor incluido de qwen de OpenClaw"
read_when:
  - You want to use Qwen with OpenClaw
  - You previously used Qwen OAuth
title: "Qwen"
---

# Qwen

<Warning>

**Qwen OAuth se ha eliminado.** La integración de OAuth de nivel gratuito
(`qwen-portal`) que usaba los endpoints `portal.qwen.ai` ya no está disponible.
Consulte el [Issue #49557](https://github.com/openclaw/openclaw/issues/49557) para obtener
antecedentes.

</Warning>

OpenClaw ahora trata a Qwen como un proveedor incluido de primera clase con el id canónico
`qwen`. El proveedor incluido tiene como objetivo los endpoints de Qwen Cloud / Alibaba DashScope y
del Coding Plan y mantiene los ids heredados `modelstudio` funcionando como un
alias de compatibilidad.

- Proveedor: `qwen`
- Var de entorno preferida: `QWEN_API_KEY`
- También aceptados por compatibilidad: `MODELSTUDIO_API_KEY`, `DASHSCOPE_API_KEY`
- Estilo de API: Compatible con OpenAI

<Tip>Si desea `qwen3.6-plus`, prefiera el endpoint **Standard (pay-as-you-go)**. El soporte del Coding Plan puede retrasarse con respecto al catálogo público.</Tip>

## Introducción

Elija su tipo de plan y siga los pasos de configuración.

<Tabs>
  <Tab title="Plan de Coding (suscripción)">
    **Lo mejor para:** acceso basado en suscripción a través del Plan de Coding de Qwen.

    <Steps>
      <Step title="Obtén tu clave de API">
        Crea o copia una clave de API desde [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys).
      </Step>
      <Step title="Ejecuta el onboarding">
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
      <Step title="Verifica que el modelo esté disponible">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    Los IDs de elección de autenticación `modelstudio-*` y las referencias de modelo `modelstudio/...` heredados aún
    funcionan como alias de compatibilidad, pero los nuevos flujos de configuración deben preferir los IDs de elección de autenticación canónicos
    `qwen-*` y las referencias de modelo `qwen/...`.
    </Note>

  </Tab>

  <Tab title="Estándar (pago por uso)">
    **Lo mejor para:** acceso de pago por uso a través del punto de conexión del Estudio de Modelos Estándar, incluyendo modelos como `qwen3.6-plus` que pueden no estar disponibles en el Plan de Codificación.

    <Steps>
      <Step title="Obtén tu clave de API">
        Crea o copia una clave de API desde [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys).
      </Step>
      <Step title="Ejecuta la incorporación">
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
    Los ids de elección de autenticación `modelstudio-*` heredados y las referencias de modelo `modelstudio/...` todavía
    funcionan como alias de compatibilidad, pero los nuevos flujos de configuración deberían preferir los ids de
    elección de autenticación canónicos `qwen-*` y las referencias de modelo `qwen/...`.
    </Note>

  </Tab>
</Tabs>

## Tipos de plan y puntos de conexión

| Plan                               | Región | Elección de autenticación  | Punto de conexión                                |
| ---------------------------------- | ------ | -------------------------- | ------------------------------------------------ |
| Estándar (pago por uso)            | China  | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| Estándar (pago por uso)            | Global | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Plan de Codificación (suscripción) | China  | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Plan de Codificación (suscripción) | Global | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |

El proveedor selecciona automáticamente el punto de conexión basándose en tu elección de autenticación. Las elecciones
canónicas usan la familia `qwen-*`; `modelstudio-*` permanece solo para compatibilidad.
Puedes anular esto con un `baseUrl` personalizado en la configuración.

<Tip>**Administrar claves:** [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) | **Documentación:** [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)</Tip>

## Catálogo integrado

OpenClaw actualmente incluye este catálogo integrado de Qwen. El catálogo configurado es consciente del punto de conexión: las configuraciones del plan de codificación omiten los modelos que solo se sabe que funcionan en el punto de conexión estándar.

| Referencia del modelo       | Entrada       | Contexto  | Notas                                                                |
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

<Note>La disponibilidad aún puede variar según el punto de conexión y el plan de facturación, incluso cuando un modelo está presente en el catálogo integrado.</Note>

## Complementos multimodales

La extensión `qwen` también expone capacidades multimodales en los puntos de conexión **Estándar**
de DashScope (no en los puntos de conexión del plan de codificación):

- **Comprensión de video** a través de `qwen-vl-max-latest`
- **Generación de video Wan** a través de `wan2.6-t2v` (predeterminado), `wan2.6-i2v`, `wan2.6-r2v`, `wan2.6-r2v-flash`, `wan2.7-r2v`

Para usar Qwen como el proveedor de video predeterminado:

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "qwen/wan2.6-t2v" },
    },
  },
}
```

<Note>Consulte [Generación de video](/es/tools/video-generation) para conocer los parámetros de herramientas compartidas, la selección del proveedor y el comportamiento de conmutación por error.</Note>

## Avanzado

<AccordionGroup>
  <Accordion title="Comprensión de imágenes y video">
    El complemento Qwen integrado registra la comprensión de medios para imágenes y video
    en los puntos de conexión **Estándar** de DashScope (no en los puntos de conexión del plan de codificación).

    | Propiedad      | Valor                 |
    | ------------- | --------------------- |
    | Modelo         | `qwen-vl-max-latest`  |
    | Entrada admitida | Imágenes, video       |

    La comprensión de medios se resuelve automáticamente desde la autenticación de Qwen configurada; no
    se necesita configuración adicional. Asegúrese de utilizar un punto de conexión Estándar (pago por uso)
    para el soporte de comprensión de medios.

  </Accordion>

  <Accordion title="Disponibilidad de Qwen 3.6 Plus">
    `qwen3.6-plus` está disponible en los puntos de conexión de Model Studio
    Estándar (pago por uso):

    - China: `dashscope.aliyuncs.com/compatible-mode/v1`
    - Global: `dashscope-intl.aliyuncs.com/compatible-mode/v1`

    Si los puntos de conexión del Coding Plan devuelven un error de "modelo no admitido" para
    `qwen3.6-plus`, cambie a Estándar (pago por uso) en lugar del par de
    punto de conexión/clave del Coding Plan.

  </Accordion>

  <Accordion title="Plan de capacidades">
    La extensión `qwen` se está posicionando como el proveedor principal de toda la superficie de
    Qwen Cloud, no solo de modelos de codificación/texto.

    - **Modelos de texto/chat:** incluidos ahora
    - **Llamada a herramientas, salida estructurada, razonamiento:** heredados del transporte compatible con OpenAI
    - **Generación de imágenes:** planeada en la capa de complementos del proveedor
    - **Comprensión de imagen/vídeo:** incluida ahora en el punto de conexión Estándar
    - **Voz/audio:** planeada en la capa de complementos del proveedor
    - **Incrustaciones de memoria/reranking:** planeadas a través de la superficie del adaptador de incrustaciones
    - **Generación de vídeo:** incluida ahora a través de la capacidad compartida de generación de vídeo

  </Accordion>

  <Accordion title="Detalles de generación de video">
    Para la generación de video, OpenClaw asigna la región de Qwen configurada al
    host AIGC de DashScope correspondiente antes de enviar el trabajo:

    - Global/Intl: `https://dashscope-intl.aliyuncs.com`
    - China: `https://dashscope.aliyuncs.com`

    Esto significa que un `models.providers.qwen.baseUrl` normal que apunte a los hosts
    del Coding Plan o de Qwen Standard mantiene la generación de video en el
    endpoint de video regional correcto de DashScope.

    Límites actuales de generación de video de Qwen incluido:

    - Hasta **1** video de salida por solicitud
    - Hasta **1** imagen de entrada
    - Hasta **4** videos de entrada
    - Hasta **10 segundos** de duración
    - Compatible con `size`, `aspectRatio`, `resolution`, `audio` y `watermark`
    - El modo de imagen/video de referencia actualmente requiere **URLs http(s) remotas**. Las rutas
      de archivos locales se rechazan de antemano porque el endpoint de video de DashScope no
      acepta búferes locales cargados para esas referencias.

  </Accordion>

  <Accordion title="Compatibilidad de uso de transmisión">
    Los endpoints nativos de Model Studio anuncian compatibilidad de uso de transmisión en el
    transporte `openai-completions` compartido. Las claves de OpenClaw ahora activan las
    capacidades del endpoint, por lo que los ids de proveedores personalizados compatibles con DashScope que apuntan a
    los mismos hosts nativos heredan el mismo comportamiento de uso de transmisión en lugar de
    requerir específicamente el id de proveedor `qwen` integrado.

    La compatibilidad de uso de transmisión nativa se aplica tanto a los hosts del Coding Plan como
    a los hosts compatibles con DashScope Standard:

    - `https://coding.dashscope.aliyuncs.com/v1`
    - `https://coding-intl.dashscope.aliyuncs.com/v1`
    - `https://dashscope.aliyuncs.com/compatible-mode/v1`
    - `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="Regiones de endpoints multimodales">
    Las superficies multimodales (comprensión de video y generación de video Wan) utilizan los
    endpoints **Standard** de DashScope, no los endpoints del Coding Plan:

    - URL base Global/Intl Standard: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
    - URL base China Standard: `https://dashscope.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="Entorno y configuración del demonio">
    Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que `QWEN_API_KEY` esté
    disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de
    `env.shellEnv`).
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Generación de video" href="/es/tools/video-generation" icon="video">
    Parámetros de la herramienta de video compartida y selección de proveedor.
  </Card>
  <Card title="Alibaba (ModelStudio)" href="/es/providers/alibaba" icon="cloud">
    Proveedor ModelStudio heredado y notas de migración.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="wrench">
    Solución de problemas generales y preguntas frecuentes.
  </Card>
</CardGroup>
