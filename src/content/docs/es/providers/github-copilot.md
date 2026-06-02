---
summary: "Inicia sesión en GitHub Copilot desde OpenClaw mediante el flujo de dispositivos o la importación de tokens no interactiva"
read_when:
  - You want to use GitHub Copilot as a model provider
  - You need the `openclaw models auth login-github-copilot` flow
  - You are choosing between the built-in Copilot provider, Copilot SDK harness, and Copilot Proxy
title: "GitHub Copilot"
---

GitHub Copilot es el asistente de codificación con IA de GitHub. Proporciona acceso a los modelos de Copilot para tu cuenta y plan de GitHub. OpenClaw puede usar Copilot como proveedor de modelos o tiempo de ejecución de agentes de tres maneras diferentes.

## Tres formas de usar Copilot en OpenClaw

<Tabs>
  <Tab title="Proveedor integrado (github-copilot)">
    Use el flujo de inicio de sesión de dispositivos nativo para obtener un token de GitHub y luego cámbielo por tokens de la API de Copilot cuando OpenClaw se ejecuta. Esta es la ruta **predeterminada** y más sencilla
    porque no requiere VS Code.

    <Steps>
      <Step title="Ejecutar el comando de inicio de sesión">
        ```bash
        openclaw models auth login-github-copilot
        ```

        Se le pedirá que visite una URL e ingrese un código de un solo uso. Mantenga la
        terminal abierta hasta que se complete.
      </Step>
      <Step title="Establecer un modelo predeterminado">
        ```bash
        openclaw models set github-copilot/claude-opus-4.7
        ```

        O en la configuración:

        ```json5
        {
          agents: {
            defaults: { model: { primary: "github-copilot/claude-opus-4.7" } },
          },
        }
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Complemento de arnés del SDK de Copilot (copilot)">
    Instale el complemento externo `@openclaw/copilot` cuando desee que la CLI de
    Copilot y el SDK de GitHub posean el bucle de agentes de bajo nivel para los
    modelos `github-copilot/*` seleccionados.

    ```bash
    openclaw plugins install clawhub:@openclaw/copilot
    ```

    Luego, opte por un modelo o proveedor para el tiempo de ejecución:

    ```json5
    {
      agents: {
        defaults: {
          model: "github-copilot/gpt-5.5",
          models: {
            "github-copilot/gpt-5.5": {
              agentRuntime: { id: "copilot" },
            },
          },
        },
      },
    }
    ```

    Elija esto cuando desee sesiones nativas de la CLI de Copilot, estado del hilo administrado por el SDK y
    compactación propiedad de Copilot para esos turnos de agente. Consulte
    [Arnés del SDK de Copilot](/es/plugins/copilot) para obtener el contrato completo del tiempo de ejecución.

  </Tab>

  <Tab title="Complemento de Copilot Proxy (copilot-proxy)">
    Use la extensión de VS Code **Copilot Proxy** como un puente local. OpenClaw se comunica con
    el endpoint `/v1` del proxy y usa la lista de modelos que configure allí.

    <Note>
    Elija esto cuando ya ejecute Copilot Proxy en VS Code o necesite enrutar
    a través de él. Debe habilitar el complemento y mantener la extensión de VS Code en ejecución.
    </Note>

  </Tab>
</Tabs>

## Marcas opcionales

| Marca           | Descripción                                                           |
| --------------- | --------------------------------------------------------------------- |
| `--yes`         | Omitir el aviso de confirmación                                       |
| `--set-default` | Aplicar también el modelo predeterminado recomendado por el proveedor |

```bash
# Skip confirmation
openclaw models auth login-github-copilot --yes

# Login and set the default model in one step
openclaw models auth login --provider github-copilot --method device --set-default
```

## Incorporación no interactiva

Si ya tienes un token de acceso OAuth de GitHub para Copilot, impórtalo durante
la configuración sin interfaz gráfica con `openclaw onboard --non-interactive`:

```bash
openclaw onboard --non-interactive --accept-risk \
  --auth-choice github-copilot \
  --github-copilot-token "$COPILOT_GITHUB_TOKEN" \
  --skip-channels --skip-health
```

También puedes omitir `--auth-choice`; al pasar `--github-copilot-token` se infiere
la elección de autenticación del proveedor GitHub Copilot. Si se omite la opción,
la incorporación recurre a `COPILOT_GITHUB_TOKEN`, `GH_TOKEN` y luego `GITHUB_TOKEN`. Usa
`--secret-input-mode ref` con `COPILOT_GITHUB_TOKEN` establecido para guardar un
`tokenRef` respaldado por variables de entorno en lugar de texto sin formato en `auth-profiles.json`.

<AccordionGroup>
  <Accordion title="Se requiere un TTY interactivo">
    El flujo de inicio de sesión de dispositivo requiere un TTY interactivo. Ejecútalo
directamente en una terminal, no en un script no interactivo ni en una canalización de CI.
  </Accordion>

<Accordion title="La disponibilidad del modelo depende de tu plan">
  La disponibilidad del modelo Copilot depende de tu plan de GitHub. Si un modelo es rechazado, prueba con otro ID (por ejemplo `github-copilot/gpt-5.5`). Consulta los [modelos compatibles por plan de Copilot](https://docs.github.com/en/copilot/reference/ai-models/supported-models#supported-ai-models-per-copilot-plan) de GitHub para ver la lista actual de modelos.
</Accordion>

  <Accordion title="Actualización del catálogo en vivo desde la API de Copilot">
    Una vez que la ruta de autenticación de inicio de sesión en el dispositivo (o variable de entorno) ha resuelto un token de GitHub,
    OpenClaw actualiza el catálogo de modelos bajo demanda desde `${baseUrl}/models`
    (el mismo punto final que usa VS Code Copilot) para que el tiempo de ejecución rastree
    los derechos por cuenta y las ventanas de contexto precisas sin el churn
    del manifiesto. Los modelos de Copilot recién publicados se hacen visibles sin una actualización de OpenClaw
n    y las ventanas de contexto reflejan los límites reales por modelo
    (por ejemplo, 400k para la serie gpt-5.x, 1M para las variantes internas
    `claude-opus-*-1m`).

    El catálogo estático empaquetado permanece como la alternativa visible cuando el descubrimiento
    está deshabilitado, el usuario no tiene un perfil de autenticación de GitHub, el intercambio de tokens
    falla, o la llamada HTTPS `/models` produce errores. Para optar por no participar y confiar completamente
    en el catálogo de manifiesto estático (escenarios sin conexión / aislados):

    ```json5
    {
      plugins: {
        entries: {
          "github-copilot": {
            config: { discovery: { enabled: false } },
          },
        },
      },
    }
    ```

  </Accordion>

<Accordion title="Selección de transporte">Los IDs de modelos de Claude usan el transporte de Anthropic Messages automáticamente. Los modelos GPT, de la serie o y Gemini mantienen el transporte de OpenAI Responses. OpenClaw selecciona el transporte correcto basándose en la referencia del modelo.</Accordion>

<Accordion title="Compatibilidad de solicitudes">
  OpenClaw envía encabezados de solicitud estilo IDE de Copilot en los transportes de Copilot, incluyendo la compactación integrada, los resultados de herramientas y los turnos de seguimiento de imágenes. No habilita la continuación de Responses a nivel de proveedor para Copilot a menos que ese comportamiento haya sido verificado contra la API de Copilot.
</Accordion>

  <Accordion title="Orden de resolución de variables de entorno">
    OpenClaw resuelve la autenticación de Copilot desde variables de entorno en el siguiente
    orden de prioridad:

    | Priority | Variable              | Notes                            |
    | -------- | --------------------- | -------------------------------- |
    | 1        | `COPILOT_GITHUB_TOKEN` | Prioridad más alta, específica de Copilot |
    | 2        | `GH_TOKEN`            | Token de GitHub CLI (alternativa)      |
    | 3        | `GITHUB_TOKEN`        | Token estándar de GitHub (la más baja)   |

    Cuando se establecen múltiples variables, OpenClaw utiliza la de mayor prioridad.
    El flujo de inicio de sesión de dispositivo (`openclaw models auth login-github-copilot`) almacena
    su token en el almacén de perfiles de autenticación y tiene prioridad sobre todas las variables de
    entorno.

  </Accordion>

  <Accordion title="Almacenamiento de token">
    El inicio de sesión almacena un token de GitHub en el almacén de perfiles de autenticación y lo intercambia
    por un token de API de Copilot cuando se ejecuta OpenClaw. No necesita administrar el
    token manualmente.
  </Accordion>
</AccordionGroup>

<Warning>El comando de inicio de sesión de dispositivo requiere un TTY interactivo. Utilice el registro no interactivo cuando necesite una configuración sin pantalla.</Warning>

## Incrustaciones de búsqueda de memoria

GitHub Copilot también puede actuar como proveedor de incrustaciones para
[búsqueda de memoria](/es/concepts/memory-search). Si tiene una suscripción a Copilot y
ha iniciado sesión, OpenClaw puede usarlo para incrustaciones sin una clave API separada.

### Configuración

Establezca `memorySearch.provider` explícitamente para usar las incrustaciones de GitHub Copilot. Si un
token de GitHub está disponible, OpenClaw descubre los modelos de incrustación disponibles desde
la API de Copilot y selecciona el mejor automáticamente.

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "github-copilot",
        // Optional: override the auto-discovered model
        model: "text-embedding-3-small",
      },
    },
  },
}
```

### Cómo funciona

1. OpenClaw resuelve su token de GitHub (desde variables de entorno o perfil de autenticación).
2. Lo intercambia por un token de API de Copilot de corta duración.
3. Consulta el punto final `/models` de Copilot para descubrir los modelos de incrustación disponibles.
4. Elige el mejor modelo (prefiere `text-embedding-3-small`).
5. Envía solicitudes de incrustación al punto final `/embeddings` de Copilot.

La disponibilidad del modelo depende de su plan de GitHub. Si no hay modelos de incrustación
disponibles, OpenClaw omite Copilot e intenta con el siguiente proveedor.

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelos" href="/es/concepts/model-providers" icon="layers">
    Cómo elegir proveedores, referencias de modelos y el comportamiento de conmutación por error.
  </Card>
  <Card title="OAuth y autenticación" href="/es/gateway/authentication" icon="key">
    Detalles de autenticación y reglas de reutilización de credenciales.
  </Card>
</CardGroup>
