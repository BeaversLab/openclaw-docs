---
summary: "Usa los modelos Xiaomi MiMo con OpenClaw"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need XIAOMI_API_KEY setup
title: "Xiaomi MiMo"
---

# Xiaomi MiMo

Xiaomi MiMo es la plataforma de API para los modelos **MiMo**. OpenClaw utiliza el
endpoint compatible con OpenAI de Xiaomi con autenticación mediante clave de API.

| Propiedad     | Valor                           |
| ------------- | ------------------------------- |
| Proveedor     | `xiaomi`                        |
| Autenticación | `XIAOMI_API_KEY`                |
| API           | Compatible con OpenAI           |
| URL base      | `https://api.xiaomimimo.com/v1` |

## Introducción

<Steps>
  <Step title="Obtener una clave de API">
    Cree una clave de API en la [consola de Xiaomi MiMo](https://platform.xiaomimimo.com/#/console/api-keys).
  </Step>
  <Step title="Ejecutar el onboarding">
    ```bash
    openclaw onboard --auth-choice xiaomi-api-key
    ```

    O pase la clave directamente:

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
    ```

  </Step>
  <Step title="Verifica que el modelo esté disponible">
    ```bash
    openclaw models list --provider xiaomi
    ```
  </Step>
</Steps>

## Modelos disponibles

| Ref. del modelo        | Entrada       | Contexto  | Salida máxima | Razonamiento | Notas                 |
| ---------------------- | ------------- | --------- | ------------- | ------------ | --------------------- |
| `xiaomi/mimo-v2-flash` | texto         | 262,144   | 8,192         | No           | Modelo predeterminado |
| `xiaomi/mimo-v2-pro`   | texto         | 1,048,576 | 32,000        | Sí           | Contexto grande       |
| `xiaomi/mimo-v2-omni`  | texto, imagen | 262,144   | 32,000        | Sí           | Multimodal            |

<Tip>La referencia del modelo predeterminado es `xiaomi/mimo-v2-flash`. El proveedor se inyecta automáticamente cuando `XIAOMI_API_KEY` está configurado o existe un perfil de autenticación.</Tip>

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
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 8192,
          },
          {
            id: "mimo-v2-pro",
            name: "Xiaomi MiMo V2 Pro",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2-omni",
            name: "Xiaomi MiMo V2 Omni",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Comportamiento de inyección automática">
    El proveedor `xiaomi` se inyecta automáticamente cuando `XIAOMI_API_KEY` está configurado en su entorno o existe un perfil de autenticación. No necesita configurar manualmente el proveedor a menos que desee anular los metadatos del modelo o la URL base.
  </Accordion>

  <Accordion title="Detalles del modelo">
    - **mimo-v2-flash** — ligero y rápido, ideal para tareas de texto de propósito general. Sin soporte de razonamiento.
    - **mimo-v2-pro** — admite razonamiento con una ventana de contexto de 1M tokens para cargas de trabajo de documentos largos.
    - **mimo-v2-omni** — modelo multimodal con razonamiento que acepta entradas de texto e imagen.

    <Note>
    Todos los modelos usan el prefijo `xiaomi/` (por ejemplo `xiaomi/mimo-v2-pro`).
    </Note>

  </Accordion>

  <Accordion title="Solución de problemas">
    - Si los modelos no aparecen, confirme que `XIAOMI_API_KEY` esté configurado y sea válido.
    - Cuando el Gateway se ejecuta como demonio, asegúrese de que la clave esté disponible para ese proceso (por ejemplo en `~/.openclaw/.env` o vía `env.shellEnv`).

    <Warning>
    Las claves establecidas solo en su shell interactivo no son visibles para los procesos de gateway administrados por demonio. Use la configuración `~/.openclaw/.env` o `env.shellEnv` para disponibilidad persistente.
    </Warning>

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration" icon="gear">
    Referencia completa de configuración de OpenClaw.
  </Card>
  <Card title="Consola de Xiaomi MiMo" href="https://platform.xiaomimimo.com" icon="arrow-up-right-from-square">
    Panel de control de Xiaomi MiMo y gestión de claves de API.
  </Card>
</CardGroup>
