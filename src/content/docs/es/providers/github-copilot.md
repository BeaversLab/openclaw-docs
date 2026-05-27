---
summary: "Inicia sesión en GitHub Copilot desde OpenClaw usando el flujo de dispositivo o la importación de token no interactiva"
read_when:
  - You want to use GitHub Copilot as a model provider
  - You need the `openclaw models auth login-github-copilot` flow
title: "GitHub Copilot"
---

GitHub Copilot es el asistente de codificación con IA de GitHub. Proporciona acceso a los modelos de Copilot para tu cuenta y plan de GitHub. OpenClaw puede usar Copilot como proveedor de modelos de dos formas diferentes.

## Dos formas de usar Copilot en OpenClaw

<Tabs>
  <Tab title="Proveedor integrado (github-copilot)">
    Usa el flujo nativo de inicio de sesión de dispositivo para obtener un token de GitHub, luego cámbialo por tokens de la API de Copilot cuando OpenClaw se ejecuta. Esta es la ruta **predeterminada** y más sencilla
    porque no requiere VS Code.

    <Steps>
      <Step title="Ejecuta el comando de inicio de sesión">
        ```bash
        openclaw models auth login-github-copilot
        ```

        Se te pedirá que visites una URL e ingreses un código de un solo uso. Mantén la
        terminal abierta hasta que se complete.
      </Step>
      <Step title="Establece un modelo predeterminado">
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

  <Tab title="Complemento Copilot Proxy (copilot-proxy)">
    Usa la extensión de VS Code **Copilot Proxy** como un puente local. OpenClaw se comunica con
    el endpoint `/v1` del proxy y usa la lista de modelos que configures allí.

    <Note>
    Elige esta opción cuando ya ejecutes Copilot Proxy en VS Code o necesites enrutar
    a través de él. Debes habilitar el complemento y mantener la extensión de VS Code en ejecución.
    </Note>

  </Tab>
</Tabs>

## Opcionales de marca (flags)

| Marca (Flag)    | Descripción                                                           |
| --------------- | --------------------------------------------------------------------- |
| `--yes`         | Omitir el mensaje de confirmación                                     |
| `--set-default` | También aplicar el modelo predeterminado recomendado por el proveedor |

```bash
# Skip confirmation
openclaw models auth login-github-copilot --yes

# Login and set the default model in one step
openclaw models auth login --provider github-copilot --method device --set-default
```

## Incorporación no interactiva

Si ya tienes un token de acceso OAuth de GitHub para Copilot, impórtalo durante
la configuración sin cabeza con `openclaw onboard --non-interactive`:

```bash
openclaw onboard --non-interactive --accept-risk \
  --auth-choice github-copilot \
  --github-copilot-token "$COPILOT_GITHUB_TOKEN" \
  --skip-channels --skip-health
```

También puedes omitir `--auth-choice`; pasar `--github-copilot-token` infiere la
opción de autenticación del proveedor GitHub Copilot. Si se omite la bandera, la incorporación retrocede
a `COPILOT_GITHUB_TOKEN`, `GH_TOKEN` y luego `GITHUB_TOKEN`. Usa
`--secret-input-mode ref` con `COPILOT_GITHUB_TOKEN` establecido para almacenar un
`tokenRef` respaldado por env en lugar de texto plano en `auth-profiles.json`.

<AccordionGroup>
  <Accordion title="TTY interactiva requerida">
    El flujo de inicio de sesión de dispositivo requiere una TTY interactiva. Ejecútelo directamente en una
    terminal, no en un script no interactivo ni en una canalización de CI.
  </Accordion>

<Accordion title="La disponibilidad del modelo depende de su plan">
  La disponibilidad del modelo Copilot depende de su plan de GitHub. Si un modelo es rechazado, pruebe con otro ID (por ejemplo `github-copilot/gpt-5.5`). Consulte los [modelos admitidos por plan de Copilot](https://docs.github.com/en/copilot/reference/ai-models/supported-models#supported-ai-models-per-copilot-plan) de GitHub para ver la lista actual de modelos.
</Accordion>

  <Accordion title="Actualización en vivo del catálogo desde la API de Copilot">
    Una vez que la ruta de autenticación de inicio de sesión de dispositivo (o variable de entorno) ha resuelto un token de GitHub,
    OpenClaw actualiza el catálogo de modelos bajo demanda desde `${baseUrl}/models`
    (el mismo punto final que usa VS Code Copilot) para que el tiempo de ejecución rastree
    los derechos por cuenta y las ventanas de contexto precisas sin agitación
    del manifiesto. Los modelos Copilot recién publicados se vuelven visibles sin una actualización de
    OpenClaw, y las ventanas de contexto reflejan los límites reales por modelo
    (por ejemplo, 400k para la serie gpt-5.x, 1M para las variantes internas
    `claude-opus-*-1m`).

    El catálogo estático incluido se mantiene como respaldo visible cuando el descubrimiento
    está deshabilitado, el usuario no tiene un perfil de autenticación de GitHub, el intercambio de tokens
    falla, o la llamada HTTPS `/models` genera errores. Para optar por no participar y confiar totalmente
    en el catálogo de manifiestos estáticos (escenarios fuera de línea / aislados):

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

<Accordion title="Selección de transporte">Los IDs de modelo de Claude usan automáticamente el transporte de mensajes de Anthropic. Los modelos GPT, serie o y Gemini mantienen el transporte de respuestas de OpenAI. OpenClaw selecciona el transporte correcto basándose en la referencia del modelo.</Accordion>

<Accordion title="Compatibilidad de solicitudes">
  OpenClaw envía encabezados de solicitud estilo IDE de Copilot en los transportes de Copilot, incluyendo compactación incorporada, resultados de herramientas y turnos de seguimiento de imágenes. No habilita la continuación de respuestas a nivel de proveedor para Copilot a menos que ese comportamiento haya sido verificado contra la API de Copilot.
</Accordion>

  <Accordion title="Orden de resolución de variables de entorno">
    OpenClaw resuelve la autenticación de Copilot desde las variables de entorno en el siguiente
    orden de prioridad:

    | Prioridad | Variable              | Notas                            |
    | -------- | --------------------- | -------------------------------- |
    | 1        | `COPILOT_GITHUB_TOKEN` | Prioridad más alta, específica de Copilot |
    | 2        | `GH_TOKEN`            | Token de GitHub CLI (alternativa)      |
    | 3        | `GITHUB_TOKEN`        | Token estándar de GitHub (la más baja)   |

    Cuando se establecen múltiples variables, OpenClaw utiliza la de mayor prioridad.
    El flujo de inicio de sesión de dispositivo (`openclaw models auth login-github-copilot`) almacena
    su token en el almacén de perfiles de autenticación y tiene prioridad sobre todas las variables
    de entorno.

  </Accordion>

  <Accordion title="Almacenamiento de token">
    El inicio de sesión almacena un token de GitHub en el almacén de perfiles de autenticación y lo intercambia
    por un token de API de Copilot cuando OpenClaw se ejecuta. No es necesario que gestione el
    token manualmente.
  </Accordion>
</AccordionGroup>

<Warning>El comando de inicio de sesión de dispositivo requiere un TTY interactivo. Use la incorporación no interactiva cuando necesite una configuración sin interfaz gráfica (headless).</Warning>

## Incrustaciones de búsqueda de memoria

GitHub Copilot también puede actuar como proveedor de incrustaciones para
[búsqueda de memoria](/es/concepts/memory-search). Si tiene una suscripción a Copilot y
ha iniciado sesión, OpenClaw puede utilizarlo para incrustaciones sin una clave API separada.

### Detección automática

Cuando `memorySearch.provider` es `"auto"` (el valor predeterminado), se intenta con GitHub Copilot
en la prioridad 15 -- después de las incrustaciones locales pero antes de OpenAI y otros proveedores
de pago. Si hay un token de GitHub disponible, OpenClaw descubre los modelos de
incrustación disponibles desde la API de Copilot y selecciona el mejor automáticamente.

### Configuración explícita

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
3. Consulta el endpoint `/models` de Copilot para descubrir los modelos de incrustación disponibles.
4. Selecciona el mejor modelo (prefiere `text-embedding-3-small`).
5. Envía solicitudes de incrustación al endpoint `/embeddings` de Copilot.

La disponibilidad de modelos depende de su plan de GitHub. Si no hay modelos de incrustación disponibles, OpenClaw omite Copilot e intenta con el siguiente proveedor.

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelos" href="/es/concepts/model-providers" icon="layers">
    Cómo elegir proveedores, referencias de modelos y el comportamiento de conmutación por error.
  </Card>
  <Card title="OAuth y autenticación" href="/es/gateway/authentication" icon="key">
    Detalles de autenticación y reglas de reutilización de credenciales.
  </Card>
</CardGroup>
