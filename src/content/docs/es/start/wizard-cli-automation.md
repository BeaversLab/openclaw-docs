---
summary: "Incorporación con secuencias de comandos y configuración de agente para la CLI de OpenClaw"
read_when:
  - You are automating onboarding in scripts or CI
  - You need non-interactive examples for specific providers
title: "Automatización de CLI"
sidebarTitle: "Automatización de CLI"
---

# Automatización de CLI

Use `--non-interactive` para automatizar `openclaw onboard`.

<Note>`--json` no implica el modo no interactivo. Use `--non-interactive` (y `--workspace`) para secuencias de comandos.</Note>

## Ejemplo no interactivo de línea base

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice apiKey \
  --anthropic-api-key "$ANTHROPIC_API_KEY" \
  --secret-input-mode plaintext \
  --gateway-port 18789 \
  --gateway-bind loopback \
  --install-daemon \
  --daemon-runtime node \
  --skip-skills
```

Agregue `--json` para obtener un resumen legible por máquina.

Use `--secret-input-mode ref` para almacenar referencias respaldadas por env en perfiles de autenticación en lugar de valores de texto sin formato.
La selección interactiva entre referencias de env y referencias de proveedor configuradas (`file` o `exec`) está disponible en el flujo de incorporación.

En el modo `ref` no interactivo, las variables de entorno del proveedor deben configurarse en el entorno del proceso.
Pasar indicadores de clave en línea sin la variable de entorno correspondiente ahora falla rápidamente.

Ejemplo:

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

## Ejemplos específicos del proveedor

<AccordionGroup>
  <Accordion title="Anthropic API key example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice apiKey \
      --anthropic-api-key "$ANTHROPIC_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Gemini example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice gemini-api-key \
      --gemini-api-key "$GEMINI_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Z.AI example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice zai-api-key \
      --zai-api-key "$ZAI_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Vercel AI Gateway example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice ai-gateway-api-key \
      --ai-gateway-api-key "$AI_GATEWAY_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Cloudflare AI Gateway example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice cloudflare-ai-gateway-api-key \
      --cloudflare-ai-gateway-account-id "your-account-id" \
      --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
      --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Moonshot example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice moonshot-api-key \
      --moonshot-api-key "$MOONSHOT_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Mistral example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice mistral-api-key \
      --mistral-api-key "$MISTRAL_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Synthetic example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice synthetic-api-key \
      --synthetic-api-key "$SYNTHETIC_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Ejemplo de OpenCode">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice opencode-zen \
      --opencode-zen-api-key "$OPENCODE_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
    Cambie a `--auth-choice opencode-go --opencode-go-api-key "$OPENCODE_API_KEY"` para el catálogo de Go.
  </Accordion>
  <Accordion title="Ejemplo de Ollama">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice ollama \
      --custom-model-id "qwen3.5:27b" \
      --accept-risk \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Ejemplo de proveedor personalizado">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice custom-api-key \
      --custom-base-url "https://llm.example.com/v1" \
      --custom-model-id "foo-large" \
      --custom-api-key "$CUSTOM_API_KEY" \
      --custom-provider-id "my-custom" \
      --custom-compatibility anthropic \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```

    `--custom-api-key` es opcional. Si se omite, la incorporación verifica `CUSTOM_API_KEY`.

    Variante de modo de referencia:

    ```bash
    export CUSTOM_API_KEY="your-key"
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice custom-api-key \
      --custom-base-url "https://llm.example.com/v1" \
      --custom-model-id "foo-large" \
      --secret-input-mode ref \
      --custom-provider-id "my-custom" \
      --custom-compatibility anthropic \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```

    En este modo, la incorporación almacena `apiKey` como `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`.

  </Accordion>
</AccordionGroup>

El token de configuración de Anthropic sigue disponible como una ruta de token de incorporación compatible, pero OpenClaw ahora prefiere la reutilización de la CLI de Claude cuando está disponible.
Para producción, prefiera una clave de API de Anthropic.

## Agregar otro agente

Use `openclaw agents add <name>` para crear un agente separado con su propio espacio de trabajo,
sesiones y perfiles de autenticación. Ejecutar sin `--workspace` inicia el asistente.

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.4 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

Lo que configura:

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

Notas:

- Los espacios de trabajo predeterminados siguen `~/.openclaw/workspace-<agentId>`.
- Añada `bindings` para enrutar mensajes entrantes (el asistente puede hacer esto).
- Opciones no interactivas: `--model`, `--agent-dir`, `--bind`, `--non-interactive`.

## Documentos relacionados

- Centro de incorporación: [Incorporación (CLI)](/en/start/wizard)
- Referencia completa: [Referencia de configuración de CLI](/en/start/wizard-cli-reference)
- Referencia de comandos: [`openclaw onboard`](/en/cli/onboard)
