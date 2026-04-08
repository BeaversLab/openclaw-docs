---
summary: "Instale OpenClaw y ejecute su primer chat en minutos."
read_when:
  - First time setup from zero
  - You want the fastest path to a working chat
title: "Primeros pasos"
---

# Para comenzar

Instala OpenClaw, ejecuta la integración y chatea con tu asistente de IA — todo en
unos 5 minutos. Al final tendrás un Gateway en funcionamiento, autenticación
configurada y una sesión de chat operativa.

## Lo que necesitas

- **Node.js** — Se recomienda Node 24 (también se admite Node 22.14+)
- **Una clave de API** de un proveedor de modelos (Anthropic, OpenAI, Google, etc.) — la integración te lo solicitará

<Tip>Verifique su versión de Node con `node --version`. **Usuarios de Windows:** se admiten tanto Windows nativo como WSL2. WSL2 es más estable y se recomienda para la experiencia completa. Consulte [Windows](/en/platforms/windows). ¿Necesita instalar Node? Consulte [Configuración de Node](/en/install/node).</Tip>

## Configuración rápida

<Steps>
  <Step title="Instalar OpenClaw">
    <Tabs>
      <Tab title="macOS / Linux">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
        <img
  src="/assets/install-script.svg"
  alt="Proceso de Script de Instalación"
  className="rounded-lg"
/>
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        iwr -useb https://openclaw.ai/install.ps1 | iex
        ```
      </Tab>
    </Tabs>

    <Note>
    Otros métodos de instalación (Docker, Nix, npm): [Instalación](/en/install).
    </Note>

  </Step>
  <Step title="Ejecutar la incorporación">
    ```bash
    openclaw onboard --install-daemon
    ```

    El asistente le guía a la hora de elegir un proveedor de modelos, configurar una clave de API
    y configurar el Gateway. Toma unos 2 minutos.

    Consulte [Incorporación (CLI)](/en/start/wizard) para obtener la referencia completa.

  </Step>
  <Step title="Verificar que el Gateway se esté ejecutando">
    ```bash
    openclaw gateway status
    ```

    Debería ver el Gateway escuchando en el puerto 18789.

  </Step>
  <Step title="Abrir el panel">
    ```bash
    openclaw dashboard
    ```

    Esto abre la Interfaz de Control en su navegador. Si se carga, todo está funcionando.

  </Step>
  <Step title="Enviar su primer mensaje">
    Escriba un mensaje en el chat de la Interfaz de Control y debería recibir una respuesta de la IA.

    ¿Prefiere chatear desde su teléfono? El canal más rápido de configurar es
    [Telegram](/en/channels/telegram) (solo se necesita un token de bot). Consulte [Canales](/en/channels)
    para ver todas las opciones.

  </Step>
</Steps>

<Accordion title="Avanzado: montar una compilación personalizada de la Interfaz de Usuario de Control">
  Si mantiene una compilación localizada o personalizada del panel, dirija
  `gateway.controlUi.root` a un directorio que contenga sus activos estáticos
  compilados y `index.html`.

```bash
mkdir -p "$HOME/.openclaw/control-ui-custom"
# Copy your built static files into that directory.
```

A continuación, configure:

```json
{
  "gateway": {
    "controlUi": {
      "enabled": true,
      "root": "$HOME/.openclaw/control-ui-custom"
    }
  }
}
```

Reinicie la puerta de enlace y vuelva a abrir el panel:

```bash
openclaw gateway restart
openclaw dashboard
```

</Accordion>

## Qué hacer a continuación

<Columns>
  <Card title="Conectar un canal" href="/en/channels" icon="message-square">
    Discord, Feishu, iMessage, Matrix, Microsoft Teams, Signal, Slack, Telegram, WhatsApp, Zalo y más.
  </Card>
  <Card title="Emparejamiento y seguridad" href="/en/channels/pairing" icon="shield">
    Controle quién puede enviar mensajes a su agente.
  </Card>
  <Card title="Configurar la puerta de enlace" href="/en/gateway/configuration" icon="settings">
    Modelos, herramientas, sandbox y configuración avanzada.
  </Card>
  <Card title="Explorar herramientas" href="/en/tools" icon="wrench">
    Navegador, exec, búsqueda web, habilidades y complementos.
  </Card>
</Columns>

<Accordion title="Avanzado: variables de entorno">
  Si ejecuta OpenClaw como una cuenta de servicio o desea rutas personalizadas:

- `OPENCLAW_HOME` — directorio principal para la resolución de rutas internas
- `OPENCLAW_STATE_DIR` — anular el directorio de estado
- `OPENCLAW_CONFIG_PATH` — anular la ruta del archivo de configuración

Referencia completa: [Variables de entorno](/en/help/environment).

</Accordion>
