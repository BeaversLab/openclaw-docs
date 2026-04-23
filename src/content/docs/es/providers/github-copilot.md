---
summary: "Inicia sesión en GitHub Copilot desde OpenClaw usando el flujo de dispositivo"
read_when:
  - You want to use GitHub Copilot as a model provider
  - You need the `openclaw models auth login-github-copilot` flow
title: "GitHub Copilot"
---

# GitHub Copilot

GitHub Copilot es el asistente de codificación con IA de GitHub. Proporciona acceso a los modelos de Copilot para tu cuenta y plan de GitHub. OpenClaw puede usar Copilot como proveedor de modelos de dos maneras diferentes.

## Dos formas de usar Copilot en OpenClaw

<Tabs>
  <Tab title="Proveedor integrado (github-copilot)">
    Use el flujo de inicio de sesión de dispositivo nativo para obtener un token de GitHub, luego cámbielo por tokens de la API de Copilot cuando OpenClaw se ejecute. Esta es la ruta **predeterminada** y más sencilla porque no requiere VS Code.

    <Steps>
      <Step title="Ejecute el comando de inicio de sesión">
        ```bash
        openclaw models auth login-github-copilot
        ```

        Se le pedirá que visite una URL e ingrese un código de un solo uso. Mantenga la terminal abierta hasta que se complete.
      </Step>
      <Step title="Establezca un modelo predeterminado">
        ```bash
        openclaw models set github-copilot/claude-opus-4.6
        ```

        O en la configuración:

        ```json5
        {
          agents: {
            defaults: { model: { primary: "github-copilot/claude-opus-4.6" } },
          },
        }
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Complemento Copilot Proxy (copilot-proxy)">
    Use la extensión de VS Code **Copilot Proxy** como un puente local. OpenClaw se comunica con el extremo `/v1` del proxy y usa la lista de modelos que configure allí.

    <Note>
    Elija esta opción cuando ya ejecute Copilot Proxy en VS Code o necesite enrutar a través de él. Debe habilitar el complemento y mantener la extensión de VS Code en ejecución.
    </Note>

  </Tab>
</Tabs>

## Marcas opcionales

| Marca           | Descripción                                                           |
| --------------- | --------------------------------------------------------------------- |
| `--yes`         | Omitir el mensaje de confirmación                                     |
| `--set-default` | También aplicar el modelo predeterminado recomendado por el proveedor |

```bash
# Skip confirmation
openclaw models auth login-github-copilot --yes

# Login and set the default model in one step
openclaw models auth login --provider github-copilot --method device --set-default
```

<AccordionGroup>
  <Accordion title="Se requiere TTY interactivo">
    El flujo de inicio de sesión de dispositivo requiere un TTY interactivo. Ejecútelo directamente en una terminal, no en un script no interactivo o una canalización de CI.
  </Accordion>

<Accordion title="La disponibilidad del modelo depende de su plan">La disponibilidad del modelo de Copilot depende de su plan de GitHub. Si se rechaza un modelo, pruebe con otro ID (por ejemplo `github-copilot/gpt-4.1`).</Accordion>

<Accordion title="Selección de transporte">Los IDs de modelo Claude usan automáticamente el transporte Anthropic Messages. Los modelos GPT, serie o y Gemini mantienen el transporte OpenAI Responses. OpenClaw selecciona el transporte correcto basándose en la referencia del modelo.</Accordion>

  <Accordion title="Orden de resolución de variables de entorno">
    OpenClaw resuelve la autenticación de Copilot desde variables de entorno en el siguiente
    orden de prioridad:

    | Prioridad | Variable              | Notas                            |
    | -------- | --------------------- | -------------------------------- |
    | 1        | `COPILOT_GITHUB_TOKEN` | Prioridad más alta, específica de Copilot |
    | 2        | `GH_TOKEN`            | Token de GitHub CLI (alternativa)      |
    | 3        | `GITHUB_TOKEN`        | Token de GitHub estándar (el más bajo)   |

    Cuando se establecen múltiples variables, OpenClaw usa la de mayor prioridad.
    El flujo de inicio de sesión de dispositivo (`openclaw models auth login-github-copilot`) almacena
    su token en el almacén de perfiles de autenticación y tiene prioridad sobre todas las variables
    de entorno.

  </Accordion>

  <Accordion title="Almacenamiento de tokens">
    El inicio de sesión almacena un token de GitHub en el almacén de perfiles de autenticación y lo intercambia
    por un token de API de Copilot cuando se ejecuta OpenClaw. No necesita gestionar el
    token manualmente.
  </Accordion>
</AccordionGroup>

<Warning>Requiere un TTY interactivo. Ejecute el comando de inicio de sesión directamente en una terminal, no dentro de un script sin cabeza o un trabajo de CI.</Warning>

## Incrustaciones de búsqueda de memoria

GitHub Copilot también puede servir como proveedor de incrustaciones para
[búsqueda de memoria](/es/concepts/memory-search). Si tiene una suscripción a Copilot y
ha iniciado sesión, OpenClaw puede usarlo para incrustaciones sin una clave de API separada.

### Detección automática

Cuando `memorySearch.provider` es `"auto"` (el predeterminado), se intenta GitHub Copilot
con prioridad 15 -- después de las incrustaciones locales pero antes de OpenAI y otros proveedores
de pago. Si hay un token de GitHub disponible, OpenClaw descubre los modelos de incrustación
disponibles desde la API de Copilot y selecciona el mejor automáticamente.

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
3. Consulta el punto final `/models` de Copilot para descubrir los modelos de incrustación disponibles.
4. Elige el mejor modelo (prefiere `text-embedding-3-small`).
5. Envía solicitudes de incrustación al punto final `/embeddings` de Copilot.

La disponibilidad del modelo depende de su plan de GitHub. Si no hay modelos de incrustación disponibles, OpenClaw omite Copilot e intenta con el siguiente proveedor.

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="OAuth y autenticación" href="/es/gateway/authentication" icon="key">
    Detalles de autenticación y reglas de reutilización de credenciales.
  </Card>
</CardGroup>
