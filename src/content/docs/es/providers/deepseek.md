---
summary: "Configuración de DeepSeek (autenticación + selección de modelo)"
title: "DeepSeek"
read_when:
  - You want to use DeepSeek with OpenClaw
  - You need the API key env var or CLI auth choice
---

[DeepSeek](https://www.deepseek.com) proporciona modelos de IA potentes con una API compatible con OpenAI.

| Propiedad     | Valor                      |
| ------------- | -------------------------- |
| Proveedor     | `deepseek`                 |
| Autenticación | `DEEPSEEK_API_KEY`         |
| API           | Compatible con OpenAI      |
| URL base      | `https://api.deepseek.com` |

## Introducción

<Steps>
  <Step title="Obtén tu clave de API">
    Crea una clave de API en [platform.deepseek.com](https://platform.deepseek.com/api_keys).
  </Step>
  <Step title="Ejecuta la incorporación">
    ```bash
    openclaw onboard --auth-choice deepseek-api-key
    ```

    Esto solicitará tu clave de API y establecerá `deepseek/deepseek-v4-flash` como el modelo predeterminado.

  </Step>
  <Step title="Verifica que los modelos estén disponibles">
    ```bash
    openclaw models list --provider deepseek
    ```

    Para inspeccionar el catálogo estático incluido sin requerir un Gateway en ejecución,
    usa:

    ```bash
    openclaw models list --all --provider deepseek
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Configuración no interactiva">
    Para instalaciones con secuencias de comandos o sin interfaz gráfica, pasa todas las banderas directamente:

    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice deepseek-api-key \
      --deepseek-api-key "$DEEPSEEK_API_KEY" \
      --skip-health \
      --accept-risk
    ```

  </Accordion>
</AccordionGroup>

<Warning>Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrate de que `DEEPSEEK_API_KEY` esté disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de `env.shellEnv`).</Warning>

## Catálogo incorporado

| Referencia del modelo        | Nombre            | Entrada | Contexto  | Salida máxima | Notas                                                             |
| ---------------------------- | ----------------- | ------- | --------- | ------------- | ----------------------------------------------------------------- |
| `deepseek/deepseek-v4-flash` | DeepSeek V4 Flash | texto   | 1,000,000 | 384,000       | Modelo predeterminado; superficie V4 con capacidad de pensamiento |
| `deepseek/deepseek-v4-pro`   | DeepSeek V4 Pro   | texto   | 1,000,000 | 384,000       | Superficie V4 con capacidad de pensamiento                        |
| `deepseek/deepseek-chat`     | DeepSeek Chat     | texto   | 131,072   | 8,192         | Superficie DeepSeek V3.2 sin capacidad de pensamiento             |
| `deepseek/deepseek-reasoner` | DeepSeek Reasoner | texto   | 131,072   | 65,536        | Superficie V3.2 con razonamiento habilitado                       |

<Tip>Los modelos V4 soportan el control `thinking` de DeepSeek. OpenClaw también reproduce el `reasoning_content` de DeepSeek en turnos de seguimiento para que las sesiones de pensamiento con llamadas a herramientas puedan continuar. Usa `/think xhigh` o `/think max` con los modelos V4 de DeepSeek para solicitar el `reasoning_effort` máximo de DeepSeek.</Tip>

## Pensamiento y herramientas

Las sesiones de pensamiento de DeepSeek V4 tienen un contrato de reproducción más estricto que la mayoría
de los proveedores compatibles con OpenAI: después de que un turno con pensamiento activado use herramientas, DeepSeek
espera que los mensajes del asistente reproducidos de ese turno incluyan
`reasoning_content` en las solicitudes de seguimiento. OpenClaw maneja esto dentro del
complemento DeepSeek, por lo que el uso normal de herramientas de varios turnos funciona con
`deepseek/deepseek-v4-flash` y `deepseek/deepseek-v4-pro`.

Si cambias una sesión existente de otro proveedor compatible con OpenAI a un
modelo DeepSeek V4, los turnos antiguos de llamadas a herramientas del asistente pueden no tener el `reasoning_content`
nativo de DeepSeek. OpenClaw completa ese campo faltante en los mensajes
reproducidos del asistente para solicitudes de pensamiento de DeepSeek V4 para que el proveedor pueda aceptar
el historial sin requerir `/new`.

Cuando el pensamiento está desactivado en OpenClaw (incluida la selección **Ninguno** de la interfaz de usuario),
OpenClaw envía `thinking: { type: "disabled" }` a DeepSeek y elimina el `reasoning_content` reproducido
del historial saliente. Esto mantiene las sesiones con pensamiento desactivado
en la ruta sin pensamiento de DeepSeek.

Usa `deepseek/deepseek-v4-flash` para la ruta rápida predeterminada. Usa
`deepseek/deepseek-v4-pro` cuando quieras el modelo V4 más potente y puedas aceptar
un costo o latencia más altos.

## Pruebas en vivo

El conjunto de modelos en vivo directo incluye DeepSeek V4 en el conjunto de modelos modernos. Para
ejecutar solo las comprobaciones del modelo directo de DeepSeek V4:

```bash
OPENCLAW_LIVE_PROVIDERS=deepseek \
OPENCLAW_LIVE_MODELS="deepseek/deepseek-v4-flash,deepseek/deepseek-v4-pro" \
pnpm test:live src/agents/models.profiles.live.test.ts
```

Esa comprobación en vivo verifica que ambos modelos V4 puedan completarse y que los turnos de seguimiento de pensamiento/herramientas
preserven la carga útil de reproducción que DeepSeek requiere.

## Ejemplo de configuración

```json5
{
  env: { DEEPSEEK_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "deepseek/deepseek-v4-flash" },
    },
  },
}
```

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration-reference" icon="gear">
    Referencia completa de configuración para agentes, modelos y proveedores.
  </Card>
</CardGroup>
