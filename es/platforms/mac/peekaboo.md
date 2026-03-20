---
summary: "Integración de PeekabooBridge para la automatización de la interfaz de usuario de macOS"
read_when:
  - Alojamiento de PeekabooBridge en OpenClaw.app
  - Integración de Peekaboo mediante Swift Package Manager
  - Cambiar protocolo/rutas de PeekabooBridge
title: "Peekaboo Bridge"
---

# Peekaboo Bridge (automatización de la interfaz de usuario de macOS)

OpenClaw puede alojar **PeekabooBridge** como un intermediario (broker) de automatización de la interfaz de usuario local y con conocimiento de permisos. Esto permite que la CLI de `peekaboo` controle la automatización de la interfaz de usuario reutilizando los permisos TCC de la aplicación de macOS.

## Qué es esto (y qué no es)

- **Host**: OpenClaw.app puede actuar como un host de PeekabooBridge.
- **Cliente**: utilice la CLI de `peekaboo` (sin superficie de `openclaw ui ...` separada).
- **Interfaz de usuario**: las superposiciones visuales permanecen en Peekaboo.app; OpenClaw es un host de intermediario ligero.

## Habilitar el puente

En la aplicación de macOS:

- Configuración → **Habilitar Peekaboo Bridge**

Cuando está habilitado, OpenClaw inicia un servidor de socket UNIX local. Si está deshabilitado, el host se detiene y `peekaboo` recurrirá a otros hosts disponibles.

## Orden de descubrimiento del cliente

Por lo general, los clientes de Peekaboo prueban los hosts en este orden:

1. Peekaboo.app (experiencia de usuario completa)
2. Claude.app (si está instalado)
3. OpenClaw.app (intermediario ligero)

Use `peekaboo bridge status --verbose` para ver qué host está activo y qué ruta de socket está en uso. Puede anularlo con:

```bash
export PEEKABOO_BRIDGE_SOCKET=/path/to/bridge.sock
```

## Seguridad y permisos

- El puente valida **las firmas de código del llamador**; se aplica una lista de permitidos de TeamIDs (TeamID del host de Peekaboo + TeamID de la aplicación OpenClaw).
- Las solicitudes agotan el tiempo de espera después de unos 10 segundos.
- Si faltan los permisos necesarios, el puente devuelve un mensaje de error claro en lugar de abrir Configuración del sistema.

## Comportamiento de las instantáneas (automatización)

Las instantáneas se almacenan en memoria y caducan automáticamente después de un breve período. Si necesita una retención más prolongada, vuelva a capturar desde el cliente.

## Solución de problemas

- Si `peekaboo` informa que "el cliente del puente no está autorizado", asegúrese de que el cliente esté firmado correctamente o ejecute el host con `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`
  solo en modo **debug**.
- Si no se encuentran hosts, abra una de las aplicaciones host (Peekaboo.app u OpenClaw.app)
  y confirme que se hayan concedido los permisos.

import es from "/components/footer/es.mdx";

<es />
