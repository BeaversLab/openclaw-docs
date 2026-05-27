---
summary: "Integración de PeekabooBridge para la automatización de la IU de macOS"
read_when:
  - Hosting PeekabooBridge in OpenClaw.app
  - Integrating Peekaboo via Swift Package Manager
  - Changing PeekabooBridge protocol/paths
  - Deciding between PeekabooBridge, Codex Computer Use, and cua-driver MCP
title: "Puente Peekaboo"
---

OpenClaw puede alojar **PeekabooBridge** como un intermediario (broker) de automatización de interfaz de usuario local y con permisos. Esto permite que la línea de comandos (CLI) de `peekaboo` impulse la automatización de la interfaz de usuario reutilizando los permisos TCC de la aplicación de macOS.

## Qué es (y qué no es)

- **Host**: OpenClaw.app puede actuar como un host de PeekabooBridge.
- **Cliente**: use la CLI de `peekaboo` (sin superficie de `openclaw ui ...` separada).
- **IU**: las superposiciones visuales permanecen en Peekaboo.app; OpenClaw es un host intermediario ligero.

## Relación con el uso del ordenador

OpenClaw tiene tres rutas de control del escritorio y se mantienen intencionalmente separadas:

- **Anfitrión PeekabooBridge**: OpenClaw.app puede alojar el socket local de PeekabooBridge. La CLI de `peekaboo` sigue siendo el cliente y utiliza los permisos de macOS de OpenClaw.app para primitivas de automatización de Peekaboo, como capturas de pantalla, clics, menús, cuadros de diálogo, acciones del Dock y gestión de ventanas.
- **Uso de ordenador de Codex**: el complemento `codex` incluido prepara el servidor de aplicaciones de Codex, verifica que el servidor MCP `computer-use` de Codex esté disponible y luego permite que Codex gestione las llamadas a herramientas nativas de control del escritorio durante los turnos en modo Codex. OpenClaw no transmite esas acciones a través de PeekabooBridge.
- **`cua-driver` MCP directo**: OpenClaw puede registrar el servidor `cua-driver mcp` upstream de TryCua como un servidor MCP normal. Esto proporciona a los agentes los esquemas propios del controlador CUA y el flujo de trabajo pid/window/element-index sin enrutar a través del mercado de Codex o del socket PeekabooBridge.

Use Peekaboo cuando desee la superficie de automatización de macOS amplia y el anfitrión del puente con reconocimiento de permisos de OpenClaw.app. Use el Uso de ordenador de Codex cuando un agente en modo Codex deba confiar en el complemento nativo de uso de ordenador de Codex. Use `cua-driver mcp` directo cuando desee que el controlador CUA esté expuesto a cualquier tiempo de ejecución gestionado por OpenClaw como un servidor MCP normal.

## Habilitar el puente

En la aplicación de macOS:

- Configuración → **Habilitar Peekaboo Bridge**

Cuando está habilitado, OpenClaw inicia un servidor de socket UNIX local. Si está deshabilitado, el anfitrión se detiene y `peekaboo` recurrirá a otros anfitriones disponibles.

## Orden de descubrimiento del cliente

Los clientes de Peekaboo suelen intentar los anfitriones en este orden:

1. Peekaboo.app (UX completa)
2. Claude.app (si está instalado)
3. OpenClaw.app (intermediario ligero)

Use `peekaboo bridge status --verbose` para ver qué anfitrión está activo y qué ruta de socket está en uso. Puede anularlo con:

```bash
export PEEKABOO_BRIDGE_SOCKET=/path/to/bridge.sock
```

## Seguridad y permisos

- El puente valida **las firmas de código de la persona que llama**; se aplica una lista de permitidos de TeamIDs (TeamID del anfitrión de Peekaboo + TeamID de la aplicación OpenClaw).
- Se prefiere la identidad del puente/aplicación firmada sobre un tiempo de ejecución `node` genérico para Accesibilidad. Conceder Accesibilidad a `node` permite que cualquier paquete iniciado por ese ejecutable de Node herede el acceso a la automatización de la GUI; consulte [permisos de macOS](/es/platforms/mac/permissions#accessibility-grants-for-node-and-cli-runtimes).
- Las solicitudes caducan después de unos 10 segundos.
- Si faltan los permisos necesarios, el puente devuelve un mensaje de error claro en lugar de abrir Configuración del Sistema.

## Comportamiento de las instantáneas (automatización)

Las instantáneas se almacenan en memoria y caducan automáticamente después de un breve período. Si necesita una retención más larga, vuelva a capturarlas desde el cliente.

## Solución de problemas

- Si `peekaboo` informa "bridge client is not authorized" (el cliente del puente no está autorizado), asegúrese de que el cliente esté firmado correctamente o ejecute el host con `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` solo en modo **debug**.
- Si no se encuentran hosts, abra una de las aplicaciones host (Peekaboo.app u OpenClaw.app) y confirme que se hayan otorgado los permisos.

## Relacionado

- [macOS app](/es/platforms/macos)
- [macOS permissions](/es/platforms/mac/permissions)
