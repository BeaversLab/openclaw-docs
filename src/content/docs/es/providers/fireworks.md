---
title: "Fireworks"
summary: "Configuración de Fireworks (autenticación + selección de modelo)"
read_when:
  - You want to use Fireworks with OpenClaw
  - You need the Fireworks API key env var or default model id
---

# Fireworks

[Fireworks](https://fireworks.ai) expone modelos de pesos abiertos y enrutados a través de una API compatible con OpenAI. OpenClaw incluye un complemento de proveedor de Fireworks incluido.

| Propiedad             | Valor                                                  |
| --------------------- | ------------------------------------------------------ |
| Proveedor             | `fireworks`                                            |
| Autenticación         | `FIREWORKS_API_KEY`                                    |
| API                   | chat/completions compatible con OpenAI                 |
| URL base              | `https://api.fireworks.ai/inference/v1`                |
| Modelo predeterminado | `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` |

## Para empezar

<Steps>
  <Step title="Configurar la autenticación de Fireworks a través del proceso de incorporación">
    ```bash
    openclaw onboard --auth-choice fireworks-api-key
    ```

    Esto guarda tu clave de Fireworks en la configuración de OpenClaw y establece el modelo de inicio Fire Pass como el predeterminado.

  </Step>
  <Step title="Verificar que el modelo esté disponible">
    ```bash
    openclaw models list --provider fireworks
    ```
  </Step>
</Steps>

## Ejemplo no interactivo

Para configuraciones programadas o de CI, pasa todos los valores en la línea de comandos:

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY" \
  --skip-health \
  --accept-risk
```

## Catálogo integrado

| Referencia del modelo                                  | Nombre                      | Entrada      | Contexto | Salida máxima | Notas                                                 |
| ------------------------------------------------------ | --------------------------- | ------------ | -------- | ------------- | ----------------------------------------------------- |
| `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` | Kimi K2.5 Turbo (Fire Pass) | texto,imagen | 256.000  | 256.000       | Modelo de inicio incluido predeterminado en Fireworks |

<Tip>Si Fireworks publica un modelo más reciente, como un nuevo lanzamiento de Qwen o Gemma, puedes cambiar a él directamente usando su id de modelo de Fireworks sin esperar una actualización del catálogo incluido.</Tip>

## Ids de modelo personalizados de Fireworks

OpenClaw también acepta ids de modelo dinámicos de Fireworks. Usa el id exacto del modelo o del enrutador que muestra Fireworks y prefijalo con `fireworks/`.

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "fireworks/accounts/fireworks/routers/kimi-k2p5-turbo",
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Cómo funciona el prefijado del id del modelo">
    Cada referencia de modelo de Fireworks en OpenClau comienza con `fireworks/` seguido del id exacto o la ruta del enrutador de la plataforma Fireworks. Por ejemplo:

    - Modelo de enrutador: `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo`
    - Modelo directo: `fireworks/accounts/fireworks/models/<model-name>`

    OpenClau elimina el prefijo `fireworks/` al construir la solicitud de la API y envía la ruta restante al punto final de Fireworks.

  </Accordion>

  <Accordion title="Nota sobre el entorno">
    Si el Gateway se ejecuta fuera de su shell interactivo, asegúrese de que `FIREWORKS_API_KEY` también esté disponible para ese proceso.

    <Warning>
    Una clave que solo se encuentre en `~/.profile` no ayudará a un demonio launchd/systemd a menos que ese entorno también se importe allí. Establezca la clave en `~/.openclaw/.env` o a través de `env.shellEnv` para asegurar que el proceso de puerta de enlace pueda leerla.
    </Warning>

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/en/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelo y comportamiento de conmutación por error.
  </Card>
  <Card title="Solución de problemas" href="/en/help/troubleshooting" icon="wrench">
    Solución de problemas general y preguntas frecuentes.
  </Card>
</CardGroup>
