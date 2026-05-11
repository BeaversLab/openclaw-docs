---
summary: "Configuración de Fireworks (autenticación y selección de modelo)"
title: "Fireworks"
read_when:
  - You want to use Fireworks with OpenClaw
  - You need the Fireworks API key env var or default model id
---

[Fireworks](https://fireworks.ai) expone modelos de pesos abiertos y enrutados a través de una API compatible con OpenAI. OpenClaw incluye un complemento de proveedor de Fireworks incluido.

| Propiedad             | Valor                                                  |
| --------------------- | ------------------------------------------------------ |
| Proveedor             | `fireworks`                                            |
| Autenticación         | `FIREWORKS_API_KEY`                                    |
| API                   | Chat/completiones compatible con OpenAI                |
| URL base              | `https://api.fireworks.ai/inference/v1`                |
| Modelo predeterminado | `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` |

## Para empezar

<Steps>
  <Step title="Configurar la autenticación de Fireworks a través del onboarding">
    ```bash
    openclaw onboard --auth-choice fireworks-api-key
    ```

    Esto guarda tu clave de Fireworks en la configuración de OpenClaw y establece el modelo de inicio Fire Pass como el predeterminado.

  </Step>
  <Step title="Verificar que el modelo está disponible">
    ```bash
    openclaw models list --provider fireworks
    ```
  </Step>
</Steps>

## Ejemplo no interactivo

Para configuraciones con scripts o CI, pasa todos los valores en la línea de comandos:

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY" \
  --skip-health \
  --accept-risk
```

## Catálogo incorporado

| Ref. de modelo                                         | Nombre                      | Entrada      | Contexto | Salida máxima | Notas                                                                                                                                                                                                                 |
| ------------------------------------------------------ | --------------------------- | ------------ | -------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fireworks/accounts/fireworks/models/kimi-k2p6`        | Kimi K2.6                   | texto,imagen | 262,144  | 262,144       | Modelo Kimi más reciente en Fireworks. El pensamiento está deshabilitado para las solicitudes de Fireworks K2.6; usa el enrutamiento directamente a través de Moonshot si necesitas la salida de pensamiento de Kimi. |
| `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` | Kimi K2.5 Turbo (Fire Pass) | texto,imagen | 256,000  | 256,000       | Modelo de inicio incluido predeterminado en Fireworks                                                                                                                                                                 |

<Tip>Si Fireworks publica un modelo más reciente, como un nuevo lanzamiento de Qwen o Gemma, puedes cambiar a él directamente usando su ID de modelo de Fireworks sin esperar una actualización del catálogo incluido.</Tip>

## IDs de modelo personalizados de Fireworks

OpenClaw también acepta IDs de modelo dinámicos de Fireworks. Usa el ID de modelo o enrutador exacto que muestra Fireworks y prefijalo con `fireworks/`.

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
  <Accordion title="Cómo funciona el prefijo del id del modelo">
    Cada referencia de modelo de Fireworks en OpenClaw comienza con `fireworks/` seguido del id exacto o la ruta del enrutador de la plataforma Fireworks. Por ejemplo:

    - Modelo de enrutador: `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo`
    - Modelo directo: `fireworks/accounts/fireworks/models/<model-name>`

    OpenClaw elimina el prefijo `fireworks/` al construir la solicitud de la API y envía la ruta restante al endpoint de Fireworks.

  </Accordion>

  <Accordion title="Nota sobre el entorno">
    Si el Gateway se ejecuta fuera de su shell interactivo, asegúrese de que `FIREWORKS_API_KEY` también esté disponible para ese proceso.

    <Warning>
    Una clave que solo esté en `~/.profile` no servirá de ayuda a un demonio launchd/systemd a menos que ese entorno también se importe allí. Establezca la clave en `~/.openclaw/.env` o mediante `env.shellEnv` para garantizar que el proceso del gateway pueda leerla.
    </Warning>

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="wrench">
    Solución de problemas generales y preguntas frecuentes.
  </Card>
</CardGroup>
