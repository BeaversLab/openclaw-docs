---
summary: "Configuración de Fireworks (autenticación + selección de modelo)"
title: "Fireworks"
read_when:
  - You want to use Fireworks with OpenClaw
  - You need the Fireworks API key env var or default model id
  - You are debugging Kimi thinking-off behavior on Fireworks
---

[Fireworks](https://fireworks.ai) expone modelos de peso abierto y enrutados a través de una API compatible con OpenAI. OpenClaw incluye un complemento de proveedor de Fireworks integrado que se envía con dos modelos Kimi precatalogados y acepta cualquier modelo de Fireworks o ID de enrutador en tiempo de ejecución.

| Propiedad                            | Valor                                                  |
| ------------------------------------ | ------------------------------------------------------ |
| ID del proveedor                     | `fireworks` (alias: `fireworks-ai`)                    |
| Complemento                          | incluido, `enabledByDefault: true`                     |
| Variable de entorno de autenticación | `FIREWORKS_API_KEY`                                    |
| Indicador de incorporación           | `--auth-choice fireworks-api-key`                      |
| Indicador directo de CLI             | `--fireworks-api-key <key>`                            |
| API                                  | Compatible con OpenAI (`openai-completions`)           |
| URL base                             | `https://api.fireworks.ai/inference/v1`                |
| Modelo predeterminado                | `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` |
| Alias predeterminado                 | `Kimi K2.5 Turbo`                                      |

## Para empezar

<Steps>
  <Step title="Establecer la clave de API de Fireworks">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice fireworks-api-key
```

```bash Direct flag
openclaw onboard --non-interactive \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY"
```

```bash Env only
export FIREWORKS_API_KEY=fw-...
```

    </CodeGroup>

    La incorporación guarda la clave para el proveedor `fireworks` en sus perfiles de autenticación y establece el enrutador **Fire Pass** Kimi K2.5 Turbo como el modelo predeterminado.

  </Step>
  <Step title="Verificar que el modelo esté disponible">
    ```bash
    openclaw models list --provider fireworks
    ```

    La lista debe incluir `Kimi K2.6` y `Kimi K2.5 Turbo (Fire Pass)`. Si `FIREWORKS_API_KEY` no está resuelto, `openclaw models status --json` informa la credencial faltante en `auth.unusableProfiles`.

  </Step>
</Steps>

## Configuración no interactiva

Para instalaciones con scripts o CI, pase todo en la línea de comandos:

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY" \
  --skip-health \
  --accept-risk
```

## Catálogo integrado

| Referencia del modelo                                  | Nombre                      | Entrada        | Contexto | Salida máxima | Pensamiento                          |
| ------------------------------------------------------ | --------------------------- | -------------- | -------- | ------------- | ------------------------------------ |
| `fireworks/accounts/fireworks/models/kimi-k2p6`        | Kimi K2.6                   | texto + imagen | 262,144  | 262,144       | Forzado desactivado                  |
| `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` | Kimi K2.5 Turbo (Fire Pass) | texto + imagen | 256,000  | 256,000       | Forzado desactivado (predeterminado) |

<Note>OpenClaw fija todos los modelos Kimi de Fireworks a `thinking: off` porque Fireworks rechaza los parámetros de pensamiento de Kimi en producción. Enrutando el mismo modelo a través de [Moonshot](/es/providers/moonshot) directamente se preserva la salida de razonamiento de Kimi. Consulte [modos de pensamiento](/es/tools/thinking) para cambiar entre proveedores.</Note>

## Identificadores de modelos personalizados de Fireworks

OpenClaw acepta cualquier identificador de modelo o enrutador de Fireworks en tiempo de ejecución. Use el identificador exacto mostrado por Fireworks y prefíjelo con `fireworks/`. La resolución dinámica clona la plantilla Fire Pass (entrada de texto + imagen, API compatible con OpenAI, costo predeterminado cero) y desactiva el pensamiento automáticamente cuando el identificador coincide con el patrón Kimi.

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "fireworks/accounts/fireworks/models/<your-model-id>",
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Cómo funciona el prefijado de identificadores de modelo">
    Cada referencia de modelo de Fireworks en OpenClaw comienza con `fireworks/` seguido del identificador exacto o ruta del enrutador de la plataforma Fireworks. Por ejemplo:

    - Modelo de enrutador: `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo`
    - Modelo directo: `fireworks/accounts/fireworks/models/<model-name>`

    OpenClaw elimina el prefijo `fireworks/` al construir la solicitud de API y envía la ruta restante al endpoint de Fireworks como el campo `model` compatible con OpenAI.

  </Accordion>

  <Accordion title="Por qué se fuerza el apagado del pensamiento para Kimi">
    Fireworks K2.6 devuelve un 400 si la solicitud lleva parámetros `reasoning_*` aunque Kimi soporta el pensamiento a través de la API propia de Moonshot. La política incluida (`extensions/fireworks/thinking-policy.ts`) anuncia solo el nivel de pensamiento `off` para los identificadores de modelos Kimi, por lo que los interruptores manuales `/think` y las superficies de política del proveedor se mantienen alineadas con el contrato de tiempo de ejecución.

    Para usar el razonamiento de Kimi de extremo a extremo, configure el [proveedor Moonshot](/es/providers/moonshot) y enrute el mismo modelo a través de él.

  </Accordion>

  <Accordion title="Disponibilidad del entorno para el demonio">
    Si el Gateway se ejecuta como servicio gestionado (launchd, systemd, Docker), la clave de Fireworks debe ser visible para ese proceso, no solo para su shell interactivo.

    <Warning>
      Una clave que solo esté en `~/.profile` no ayudará a un demonio launchd o systemd a menos que ese entorno también se importe allí. Establezca la clave en `~/.openclaw/.env` o mediante `env.shellEnv` para que sea legible desde el proceso de la puerta de enlace.
    </Warning>

    En macOS, `openclaw gateway install` ya conecta `~/.openclaw/.env` en el archivo de entorno del LaunchAgent. Vuelva a ejecutar la instalación (o `openclaw doctor --fix`) después de rotar la clave.

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Proveedores de modelos" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Modos de pensamiento" href="/es/tools/thinking" icon="brain">
    Niveles de `/think`, políticas de proveedores y enrutamiento de modelos con capacidad de razonamiento.
  </Card>
  <Card title="Moonshot" href="/es/providers/moonshot" icon="moon">
    Ejecute Kimi con salida de pensamiento nativa a través de la propia API de Moonshot.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="wrench">
    Solución de problemas generales y preguntas frecuentes.
  </Card>
</CardGroup>
