---
summary: "Instala OpenClaw y ejecuta tu primer chat en minutos."
read_when:
  - First time setup from zero
  - You want the fastest path to a working chat
title: "Para comenzar"
---

# Para comenzar

Objetivo: pasar de cero a un primer chat funcional con una configuración mínima.

<Info>
  El chat más rápido: abre la interfaz de control (Control UI) (no se necesita configuración de
  canal). Ejecuta `openclaw dashboard` y chatea en el navegador, o abre `http://127.0.0.1:18789/` en
  el
  <Tooltip headline="Gateway host" tip="The machine running the OpenClaw gateway service.">
    host de la puerta de enlace
  </Tooltip>
  . Documentación: [Panel de control (Dashboard)](/es/web/dashboard) e [Interfaz de control (Control
  UI)](/es/web/control-ui).
</Info>

## Requisitos previos

- Se recomienda Node 24 (Node 22 LTS, actualmente `22.16+`, todavía compatible por estabilidad)

<Tip>Verifica tu versión de Node con `node --version` si no estás seguro.</Tip>

## Configuración rápida (CLI)

<Steps>
  <Step title="Instalar OpenClaw (recomendado)">
    <Tabs>
      <Tab title="macOS/Linux">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
        <img
  src="/assets/install-script.svg"
  alt="Proceso del script de instalación"
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
    Otros métodos de instalación y requisitos: [Instalación](/es/install).
    </Note>

  </Step>
  <Step title="Ejecutar integración">
    ```bash
    openclaw onboard --install-daemon
    ```

    La integración configura la autenticación, la configuración de la puerta de enlace y los canales opcionales.
    Consulte [Integración (CLI)](/es/start/wizard) para obtener más detalles.

  </Step>
  <Step title="Verificar la puerta de enlace (Gateway)">
    Si instalaste el servicio, ya debería estar ejecutándose:

    ```bash
    openclaw gateway status
    ```

  </Step>
  <Step title="Abrir la interfaz de control (Control UI)">
    ```bash
    openclaw dashboard
    ```
  </Step>
</Steps>

<Check>
  Si la interfaz de control (Control UI) se carga, tu puerta de enlace (Gateway) está lista para
  usarse.
</Check>

## Verificaciones opcionales y extras

<AccordionGroup>
  <Accordion title="Ejecutar el Gateway en primer plano">
    Útil para pruebas rápidas o solución de problemas.

    ```bash
    openclaw gateway --port 18789
    ```

  </Accordion>
  <Accordion title="Enviar un mensaje de prueba">
    Requiere un canal configurado.

    ```bash
    openclaw message send --target +15555550123 --message "Hello from OpenClaw"
    ```

  </Accordion>
</AccordionGroup>

## Variables de entorno útiles

Si ejecutas OpenClaw como una cuenta de servicio o deseas ubicaciones personalizadas para la configuración/estado:

- `OPENCLAW_HOME` establece el directorio home utilizado para la resolución de rutas internas.
- `OPENCLAW_STATE_DIR` anula el directorio de estado.
- `OPENCLAW_CONFIG_PATH` anula la ruta del archivo de configuración.

Referencia completa de variables de entorno: [Variables de entorno](/es/help/environment).

## Profundizar

<Columns>
  <Card title="Integración (CLI)" href="/es/start/wizard">
    Referencia completa de la integración por CLI y opciones avanzadas.
  </Card>
  <Card title="Incorporación de la app de macOS" href="/es/start/onboarding">
    Flujo de primera ejecución para la aplicación de macOS.
  </Card>
</Columns>

## Lo que tendrás

- Un Gateway en ejecución
- Autenticación configurada
- Acceso a la Interfaz de Control o un canal conectado

## Próximos pasos

- Seguridad y aprobaciones de MD: [Emparejamiento](/es/channels/pairing)
- Conectar más canales: [Canales](/es/channels)
- Flujos de trabajo avanzados y desde el código fuente: [Configuración](/es/start/setup)

import es from "/components/footer/es.mdx";

<es />
