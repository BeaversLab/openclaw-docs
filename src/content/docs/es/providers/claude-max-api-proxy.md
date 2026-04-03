---
summary: "Proxy comunitario para exponer las credenciales de suscripción de Claude como un punto final compatible con OpenAI"
read_when:
  - You want to use Claude Max subscription with OpenAI-compatible tools
  - You want a local API server that wraps Claude Code CLI
  - You want to evaluate subscription-based vs API-key-based Anthropic access
title: "Claude Max API Proxy"
---

# Claude Max API Proxy

**claude-max-api-proxy** es una herramienta comunitaria que expone tu suscripción Claude Max/Pro como un punto final de API compatible con OpenAI. Esto te permite usar tu suscripción con cualquier herramienta que admita el formato de API de OpenAI.

<Warning>Esta ruta es solo para compatibilidad técnica. Anthropic ha bloqueado algún uso de la suscripción fuera de Claude Code en el pasado. Debes decidir por ti mismo si usarlo y verificar los términos actuales de Anthropic antes de confiar en ello.</Warning>

## ¿Por qué usar esto?

| Enfoque                | Costo                                                          | Mejor para                               |
| ---------------------- | -------------------------------------------------------------- | ---------------------------------------- |
| API de Anthropic       | Pagar por token (~$15/M de entrada, $75/M de salida para Opus) | Aplicaciones de producción, alto volumen |
| Suscripción Claude Max | $200/mes fijo                                                  | Uso personal, desarrollo, uso ilimitado  |

Si tienes una suscripción Claude Max y deseas usarla con herramientas compatibles con OpenAI, este proxy puede reducir el costo para algunos flujos de trabajo. Las claves de API siguen siendo la ruta más clara según las políticas para uso en producción.

## Cómo funciona

```
Your App → claude-max-api-proxy → Claude Code CLI → Anthropic (via subscription)
     (OpenAI format)              (converts format)      (uses your login)
```

El proxy:

1. Acepta solicitudes en formato OpenAI en `http://localhost:3456/v1/chat/completions`
2. Las convierte en comandos de CLI de Claude Code
3. Devuelve respuestas en formato OpenAI (se admite streaming)

## Instalación

```bash
# Requires Node.js 20+ and Claude Code CLI
npm install -g claude-max-api-proxy

# Verify Claude CLI is authenticated
claude --version
```

## Uso

### Iniciar el servidor

```bash
claude-max-api
# Server runs at http://localhost:3456
```

### Probarlo

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

### Con OpenClaw

Puedes apuntar OpenClaw al proxy como un punto final personalizado compatible con OpenAI:

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

## Modelos disponibles

| ID del modelo     | Se asigna a     |
| ----------------- | --------------- |
| `claude-opus-4`   | Claude Opus 4   |
| `claude-sonnet-4` | Claude Sonnet 4 |
| `claude-haiku-4`  | Claude Haiku 4  |

## Inicio automático en macOS

Crea un LaunchAgent para ejecutar el proxy automáticamente:

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

## Enlaces

- **npm:** [https://www.npmjs.com/package/claude-max-api-proxy](https://www.npmjs.com/package/claude-max-api-proxy)
- **GitHub:** [https://github.com/atalovesyou/claude-max-api-proxy](https://github.com/atalovesyou/claude-max-api-proxy)
- **Problemas:** [https://github.com/atalovesyou/claude-max-api-proxy/issues](https://github.com/atalovesyou/claude-max-api-proxy/issues)

## Notas

- Esta es una **herramienta comunitaria**, no es oficialmente compatible con Anthropic ni OpenClaw
- Requiere una suscripción activa de Claude Max/Pro con la CLI de Claude Code autenticada
- El proxy se ejecuta localmente y no envía datos a ningún servidor de terceros
- Las respuestas en streaming son totalmente compatibles

## Ver también

- [Proveedor Anthropic](/en/providers/anthropic) - Integración nativa de OpenClaw con token de configuración de Claude o claves API
- [Proveedor OpenAI](/en/providers/openai) - Para suscripciones de OpenAI/Codex
