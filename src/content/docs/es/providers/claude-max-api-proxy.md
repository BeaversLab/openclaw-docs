---
summary: "Proxy comunitario para exponer las credenciales de suscripción de Claude como un punto final compatible con OpenAI"
read_when:
  - You want to use Claude Max subscription with OpenAI-compatible tools
  - You want a local API server that wraps Claude Code CLI
  - You want to evaluate subscription-based vs API-key-based Anthropic access
title: "Claude Max API proxy"
---

**claude-max-api-proxy** es una herramienta de la comunidad que expone tu suscripción Claude Max/Pro como un punto final de API compatible con OpenAI. Esto te permite usar tu suscripción con cualquier herramienta que admita el formato de API de OpenAI.

<Warning>Esta ruta es solo de compatibilidad técnica. Anthropic ha bloqueado algunos usos de suscripción fuera de Claude Code en el pasado. Debes decidir por ti mismo si usarlo y verificar los términos actuales de Anthropic antes de confiar en ello.</Warning>

## ¿Por qué usar esto?

| Enfoque                | Coste                                                         | Mejor para                               |
| ---------------------- | ------------------------------------------------------------- | ---------------------------------------- |
| API de Anthropic       | Pago por token (~$15/M de entrada, $75/M de salida para Opus) | Aplicaciones de producción, alto volumen |
| Suscripción Claude Max | $200/mes fijos                                                | Uso personal, desarrollo, uso ilimitado  |

Si tienes una suscripción Claude Max y deseas usarla con herramientas compatibles con OpenAI, este proxy puede reducir el coste para algunos flujos de trabajo. Las claves de API siguen siendo la ruta de política más clara para uso en producción.

## Cómo funciona

```
Your App → claude-max-api-proxy → Claude Code CLI → Anthropic (via subscription)
     (OpenAI format)              (converts format)      (uses your login)
```

El proxy:

1. Acepta solicitudes en formato OpenAI en `http://localhost:3456/v1/chat/completions`
2. Las convierte en comandos de CLI de Claude Code
3. Devuelve respuestas en formato OpenAI (se admite transmisión)

## Primeros pasos

<Steps>
  <Step title="Instalar el proxy">
    Requiere Node.js 20+ y CLI de Claude Code.

    ```bash
    npm install -g claude-max-api-proxy

    # Verify Claude CLI is authenticated
    claude --version
    ```

  </Step>
  <Step title="Iniciar el servidor">
    ```bash
    claude-max-api
    # Server runs at http://localhost:3456
    ```
  </Step>
  <Step title="Probar el proxy">
    ```bash
    # Health check
    curl http://localhost:3456/health

    # List models
    curl http://localhost:3456/v1/models

    # Chat completion
    curl http://localhost:3456/v1/chat/completions \
      -H "Content-Type: application/json" \
      -d '{
        "model": "claude-opus-4",
        "messages": [{"role": "user", "content": "Hello!"}]
      }'
    ```

  </Step>
  <Step title="Configurar OpenClaw">
    Apunta OpenClaw al proxy como un punto final personalizado compatible con OpenAI:

    ```json5
    {
      env: {
        OPENAI_API_KEY: "not-needed",
        OPENAI_BASE_URL: "http://localhost:3456/v1",
      },
      agents: {
        defaults: {
          model: { primary: "openai/claude-opus-4" },
        },
      },
    }
    ```

  </Step>
</Steps>

## Catálogo integrado

| ID del modelo     | Se asigna a     |
| ----------------- | --------------- |
| `claude-opus-4`   | Claude Opus 4   |
| `claude-sonnet-4` | Claude Sonnet 4 |
| `claude-haiku-4`  | Claude Haiku 4  |

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Notas de compatibilidad con OpenAI estilo proxy">
    Esta ruta utiliza la misma ruta compatible con OpenAI estilo proxy que otros
    backends personalizados de `/v1`:

    - No se aplica el modelado de solicitudes nativo solo de OpenAI
    - Sin `service_tier`, sin Responses `store`, sin sugerencias de caché de prompts y sin
      modelado de payload de compatibilidad de razonamiento de OpenAI
    - Los encabezados de atribución ocultos de OpenClaw (`originator`, `version`, `User-Agent`)
      no se inyectan en la URL del proxy

  </Accordion>

  <Accordion title="Inicio automático en macOS con LaunchAgent">
    Cree un LaunchAgent para ejecutar el proxy automáticamente:

    ```bash
    cat > ~/Library/LaunchAgents/com.claude-max-api.plist << 'EOF'
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
      <key>Label</key>
      <string>com.claude-max-api</string>
      <key>RunAtLoad</key>
      <true/>
      <key>KeepAlive</key>
      <true/>
      <key>ProgramArguments</key>
      <array>
        <string>/usr/local/bin/node</string>
        <string>/usr/local/lib/node_modules/claude-max-api-proxy/dist/server/standalone.js</string>
      </array>
      <key>EnvironmentVariables</key>
      <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:~/.local/bin:/usr/bin:/bin</string>
      </dict>
    </dict>
    </plist>
    EOF

    launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.claude-max-api.plist
    ```

  </Accordion>
</AccordionGroup>

## Enlaces

- **npm:** [https://www.npmjs.com/package/claude-max-api-proxy](https://www.npmjs.com/package/claude-max-api-proxy)
- **GitHub:** [https://github.com/atalovesyou/claude-max-api-proxy](https://github.com/atalovesyou/claude-max-api-proxy)
- **Problemas:** [https://github.com/atalovesyou/claude-max-api-proxy/issues](https://github.com/atalovesyou/claude-max-api-proxy/issues)

## Notas

- Esta es una **herramienta de la comunidad**, no respaldada oficialmente por Anthropic u OpenClaw
- Requiere una suscripción activa de Claude Max/Pro con la CLI de Claude Code autenticada
- El proxy se ejecuta localmente y no envía datos a ningún servidor de terceros
- Las respuestas en streaming son totalmente compatibles

<Note>Para la integración nativa de Anthropic con Claude CLI o claves de API, consulte [Proveedor Anthropic](/es/providers/anthropic). Para suscripciones de OpenAI/Codex, consulte [Proveedor OpenAI](/es/providers/openai).</Note>

## Relacionado

<CardGroup cols={2}>
  <Card title="Proveedor Anthropic" href="/es/providers/anthropic" icon="bolt">
    Integración nativa de OpenClaw con Claude CLI o claves de API.
  </Card>
  <Card title="Proveedor OpenAI" href="/es/providers/openai" icon="robot">
    Para suscripciones de OpenAI/Codex.
  </Card>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Resumen de todos los proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Configuración" href="/es/gateway/configuration" icon="gear">
    Referencia completa de configuración.
  </Card>
</CardGroup>
