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
    Usa el flujo nativo de inicio de sesión de dispositivo para obtener un token de GitHub, luego cámbialo por tokens de la API de Copilot cuando OpenClaw se ejecute. Esta es la ruta **predeterminada** y más sencilla
    porque no requiere VS Code.

    <Steps>
      <Step title="Ejecuta el comando de inicio de sesión">
        ```bash
        openclaw models auth login-github-copilot
        ```

        Se te pedirá que visites una URL e ingreses un código de un solo uso. Mantén la
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

  <Tab title="Complemento Copilot Proxy (copilot-proxy)">
    Usa la extensión de VS Code **Copilot Proxy** como puente local. OpenClaw se comunica con
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
la configuración sin cabeza (headless) con `openclaw onboard --non-interactive`:

```bash
openclaw onboard --non-interactive --accept-risk \
  --auth-choice github-copilot \
  --github-copilot-token "$COPILOT_GITHUB_TOKEN" \
  --skip-channels --skip-health
```

También puedes omitir `--auth-choice`; al pasar `--github-copilot-token` se infiere
la elección de autenticación del proveedor GitHub Copilot. Si se omite la bandera, la incorporación (onboarding)
retrocede a `COPILOT_GITHUB_TOKEN`, `GH_TOKEN` y luego a `GITHUB_TOKEN`. Usa
`--secret-input-mode ref` con `COPILOT_GITHUB_TOKEN` establecido para almacenar una `tokenRef`
respaldada por variables de entorno en lugar de texto sin formato en `auth-profiles.json`.

<AccordionGroup>
  <Accordion title="Se requiere un TTY interactivo">
    El flujo de inicio de sesión de dispositivo (device-login) requiere un TTY interactivo. Ejecútalo directamente en una
terminal, no en un script no interactivo ni en una canalización de CI.
  </Accordion>

<Accordion title="La disponibilidad del modelo depende de tu plan">La disponibilidad del modelo Copilot depende de tu plan de GitHub. Si un modelo es rechazado, prueba con otro ID (por ejemplo `github-copilot/gpt-4.1`).</Accordion>

<Accordion title="Selección de transporte">Los IDs de modelos de Claude usan automáticamente el transporte Anthropic Messages. Los modelos GPT, serie o y Gemini mantienen el transporte OpenAI Responses. OpenClaw selecciona el transporte correcto basándose en la referencia del modelo.</Accordion>

<Accordion title="Compatibilidad de solicitudes">
  OpenClaw envía encabezados de solicitud estilo IDE de Copilot en los transportes de Copilot, incluyendo turnos de compactación integrada, resultado de herramientas y seguimiento de imágenes. No habilita la continuación de Responses a nivel de proveedor para Copilot a menos que ese comportamiento haya sido verificado contra la API de Copilot.
</Accordion>

  <Accordion title="Orden de resolución de variables de entorno">
    OpenClaw resuelve la autenticación de Copilot a partir de variables de entorno en el siguiente
    orden de prioridad:

    | Prioridad | Variable              | Notas                            |
    | -------- | --------------------- | -------------------------------- |
    | 1        | `COPILOT_GITHUB_TOKEN` | Prioridad más alta, específica de Copilot |
    | 2        | `GH_TOKEN`            | Token de GitHub CLI (alternativo)      |
    | 3        | `GITHUB_TOKEN`        | Token estándar de GitHub (el más bajo)   |

    Cuando se establecen varias variables, OpenClaw utiliza la de mayor prioridad.
    El flujo de inicio de sesión de dispositivo (`openclaw models auth login-github-copilot`) almacena
    su token en el almacén de perfiles de autenticación y tiene prioridad sobre todas las
    variables de entorno.

  </Accordion>

  <Accordion title="Almacenamiento de token">
    El inicio de sesión almacena un token de GitHub en el almacén de perfiles de autenticación y lo intercambia
    por un token de la API de Copilot cuando se ejecuta OpenClaw. No necesita gestionar el
    token manualmente.
  </Accordion>
</AccordionGroup>

<Warning>El comando de inicio de sesión de dispositivo (device-login) requiere un TTY interactivo. Utilice la incorporación no interactiva cuando necesite una configuración sin interfaz gráfica (headless).</Warning>

## Incrustaciones de búsqueda de memoria

GitHub Copilot también puede actuar como proveedor de incrustaciones (embeddings) para
[búsqueda de memoria](/es/concepts/memory-search). Si tiene una suscripción a Copilot y
ha iniciado sesión, OpenClaw puede utilizarlo para incrustaciones sin una clave de API separada.

### Detección automática

Cuando `memorySearch.provider` es `"auto"` (el valor predeterminado), se intenta con GitHub Copilot
con prioridad 15: después de las incrustaciones locales, pero antes de OpenAI y otros proveedores
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

1. OpenClaw resuelve su token de GitHub (desde variables de entorno o el perfil de autenticación).
2. Lo intercambia por un token de la API de Copilot de corta duración.
3. Consulta el endpoint `/models` de Copilot para descubrir los modelos de incrustación disponibles.
4. Selecciona el mejor modelo (prefiere `text-embedding-3-small`).
5. Envía solicitudes de incrustación al endpoint `/embeddings` de Copilot.

La disponibilidad de los modelos depende de su plan de GitHub. si no hay modelos de incrustación disponibles, OpenClaw omite Copilot e intenta con el siguiente proveedor.

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelos" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="OAuth y autenticación" href="/es/gateway/authentication" icon="key">
    Detalles de autenticación y reglas de reutilización de credenciales.
  </Card>
</CardGroup>
