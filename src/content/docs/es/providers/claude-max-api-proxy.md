---
summary: "Proxy comunitario para exponer las credenciales de suscripción de Claude como un punto final compatible con OpenAI"
read_when:
  - You want to use Claude Max subscription with OpenAI-compatible tools
  - You want a local API server that wraps Claude Code CLI
  - You want to evaluate subscription-based vs API-key-based Anthropic access
title: "Claude Max API proxy"
---

**claude-max-api-proxy** es una herramienta de la comunidad que expone tu suscripción Claude Max/Pro como un punto final de API compatible con OpenAI. Esto te permite usar tu suscripción con cualquier herramienta que admita el formato de API de OpenAI.

<Warning>
Esta ruta es solo para compatibilidad técnica. Anthropic ha bloqueado algún uso de la suscripción fuera de Claude Code en el pasado. Debes decidir por ti mismo si usarla y verificar las reglas de facturación actuales de Anthropic antes de confiar en ella.

Los documentos de soporte actuales de Anthropic dicen que `claude -p` es uso del SDK de Agentes/programático.
A partir del 15 de junio de 2026, el uso del plan de suscripción `claude -p` se toma primero de un crédito mensual separado del SDK de Agentes, y luego de los créditos de uso a las tarifas estándar de la API si los créditos de uso están habilitados.

</Warning>

## ¿Por qué usar esto?

| Enfoque                        | Ruta de costos                                         | Mejor para                                                     |
| ------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------- |
| API de Anthropic               | Pagar por token a través de Claude Console o la nube   | Aplicaciones de producción, automatización compartida, volumen |
| Proxy de suscripción de Claude | Reglas del plan y crédito de Claude Code / `claude -p` | Experimentos personales con herramientas compatibles           |

Si tienes una suscripción Claude Max o Pro y deseas usarla con herramientas compatibles con OpenAI, este proxy puede adaptarse a algunos flujos de trabajo personales. No es una ruta de tarifa plana ilimitada. Las claves de API siguen siendo la ruta de política y facturación más clara para el uso en producción.

## Cómo funciona

```
Your App → claude-max-api-proxy → Claude Code CLI / claude -p → Anthropic
     (OpenAI format)              (converts format)          (uses your login)
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
  <Accordion title="Notas de compatibilidad estilo proxy con OpenAI">
    Esta ruta utiliza la misma ruta de compatibilidad con OpenAI estilo proxy que otros backends personalizados `/v1`:

    - No se aplica el modelado de solicitudes solo nativo de OpenAI
    - Sin `service_tier`, sin Responses `store`, sin sugerencias de caché de solicitudes y sin modelado de carga útil de compatibilidad de razonamiento de OpenAI
    - Los encabezados de atribución ocultos de OpenClaw (`originator`, `version`, `User-Agent`) no se inyectan en la URL del proxy

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

## Notas

- Esta es una **herramienta de la comunidad**, no es compatible oficialmente con Anthropic o OpenClaw
- Requiere una suscripción activa de Claude Max/Pro con la CLI de Claude Code autenticada
- Hereda el comportamiento de facturación, crédito de uso y límite de velocidad de `claude -p` de Claude Code
- El proxy se ejecuta localmente y no envía datos a ningún servidor de terceros
- Las respuestas en streaming son totalmente compatibles

<Note>Para la integración nativa de Anthropic con Claude CLI o claves de API, consulte [Anthropic provider](/es/providers/anthropic). Para suscripciones de OpenAI/Codex, consulte [OpenAI provider](/es/providers/openai).</Note>

## Relacionado

<CardGroup cols={2}>
  <Card title="Anthropic provider" href="/es/providers/anthropic" icon="bolt">
    Integración nativa de OpenClaw con Claude CLI o claves de API.
  </Card>
  <Card title="OpenAI provider" href="/es/providers/openai" icon="robot">
    Para suscripciones de OpenAI/Codex.
  </Card>
  <Card title="Model selection" href="/es/concepts/model-providers" icon="layers">
    Resumen de todos los proveedores, referencias de modelo y comportamiento de conmutación por error.
  </Card>
  <Card title="Configuration" href="/es/gateway/configuration" icon="gear">
    Referencia completa de configuración.
  </Card>
</CardGroup>
