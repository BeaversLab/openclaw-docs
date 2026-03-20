---
summary: "flujo de la app de macOS para controlar una puerta de enlace OpenClaw remota a través de SSH"
read_when:
  - Configuración o depuración del control remoto de Mac
title: "Control remoto"
---

# OpenClaw remoto (macOS ⇄ host remoto)

Este flujo permite que la aplicación de macOS actúe como un control remoto completo para una puerta de enlace OpenClaw que se ejecuta en otro host (escritorio/servidor). Es la función **Remoto por SSH** (ejecución remota) de la aplicación. Todas las funciones: comprobaciones de estado, reenvío de activación por voz y Web Chat, reutilizan la misma configuración SSH remota de _Configuración → General_.

## Modos

- **Local (este Mac)**: Todo se ejecuta en el portátil. No hay SSH involucrado.
- **Remoto por SSH (predeterminado)**: Los comandos de OpenClaw se ejecutan en el host remoto. La aplicación Mac abre una conexión SSH con `-o BatchMode` más su identidad/clave elegida y un reenvío de puerto local.
- **Remoto directo (ws/wss)**: Sin túnel SSH. La aplicación mac se conecta directamente a la URL de la puerta de enlace (por ejemplo, a través de Tailscale Serve o un proxy inverso HTTPS público).

## Transportes remotos

El modo remoto admite dos transportes:

- **Túnel SSH** (predeterminado): Utiliza `ssh -N -L ...` para reenviar el puerto de la puerta de enlace a localhost. La puerta de enlace verá la IP del nodo como `127.0.0.1` porque el túnel es de bucle local (loopback).
- **Directo (ws/wss)**: Se conecta directamente a la URL de la puerta de enlace. La puerta de enlace ve la IP real del cliente.

## Requisitos previos en el host remoto

1. Instale Node + pnpm y compile/instale la CLI de OpenClaw (`pnpm install && pnpm build && pnpm link --global`).
2. Asegúrese de que `openclaw` esté en PATH para shells no interactivos (cree un enlace simbólico en `/usr/local/bin` o `/opt/homebrew/bin` si es necesario).
3. Abra SSH con autenticación por clave. Recomendamos las IP de **Tailscale** para una accesibilidad estable fuera de la LAN.

## Configuración de la aplicación macOS

1. Abra _Configuración → General_.
2. En **Ejecuciones de OpenClaw**, elija **Remoto por SSH** y configure:
   - **Transporte**: **Túnel SSH** o **Directo (ws/wss)**.
   - **Destino SSH**: `user@host` (opcional `:port`).
     - Si la puerta de enlace está en la misma LAN y anuncia Bonjour, selecciónela de la lista descubierta para rellenar automáticamente este campo.
   - **URL de la puerta de enlace** (solo directo): `wss://gateway.example.ts.net` (o `ws://...` para local/LAN).
   - **Archivo de identidad** (avanzado): ruta a su clave.
   - **Raíz del proyecto** (avanzado): ruta de checkout remoto utilizada para los comandos.
   - **Ruta de la CLI** (avanzado): ruta opcional a un punto de entrada/binario `openclaw` ejecutable (se rellena automáticamente cuando se anuncia).
3. Pulse **Probar remoto**. El éxito indica que el `openclaw status --json` remoto se ejecuta correctamente. Los fallos suelen significar problemas de PATH/CLI; la salida 127 significa que no se encuentra la CLI de forma remota.
4. Los controles de estado y el Web Chat ahora se ejecutarán automáticamente a través de este túnel SSH.

## Web Chat

- **Túnel SSH**: Web Chat se conecta a la pasarela a través del puerto de control WebSocket reenviado (predeterminado 18789).
- **Directo (ws/wss)**: Web Chat se conecta directamente a la URL de la pasarela configurada.
- Ya no hay un servidor HTTP de WebChat separado.

## Permisos

- El host remoto necesita las mismas aprobaciones TCC que el local (Automatización, Accesibilidad, Grabación de pantalla, Micrófono, Reconocimiento de voz, Notificaciones). Ejecute la incorporación en esa máquina para otorgarlos una vez.
- Los nodos anuncian su estado de permiso a través de `node.list` / `node.describe` para que los agentes sepan qué está disponible.

## Notas de seguridad

- Prefiera los enlaces de loopback en el host remoto y conéctese a través de SSH o Tailscale.
- El túnel SSH utiliza una verificación estricta de clave de host; confíe primero en la clave del host para que exista en `~/.ssh/known_hosts`.
- Si vincula la Pasarela a una interfaz que no sea de loopback, requiera autenticación por token/contraseña.
- Consulte [Seguridad](/es/gateway/security) y [Tailscale](/es/gateway/tailscale).

## Flujo de inicio de sesión de WhatsApp (remoto)

- Ejecute `openclaw channels login --verbose` **en el host remoto**. Escanee el código QR con WhatsApp en su teléfono.
- Vuelva a ejecutar el inicio de sesión en ese host si la autenticación caduca. El control de estado mostrará los problemas del enlace.

## Solución de problemas

- **exit 127 / no encontrado**: `openclaw` no está en PATH para shells no interactivos. Agréguelo a `/etc/paths`, su rc de shell, o cree un enlace simbólico en `/usr/local/bin`/`/opt/homebrew/bin`.
- **Health probe failed**: verifique la accesibilidad SSH, PATH, y que Baileys haya iniciado sesión (`openclaw status --json`).
- **Web Chat atascado**: confirme que la pasarela se está ejecutando en el host remoto y que el puerto reenviado coincide con el puerto WS de la pasarela; la interfaz de usuario requiere una conexión WS saludable.
- **Node IP shows 127.0.0.1**: esperado con el túnel SSH. Cambie **Transport** a **Direct (ws/wss)** si desea que la puerta de enlace vea la IP del cliente real.
- **Voice Wake**: las frases de activación se reenvían automáticamente en modo remoto; no se necesita un reenviador separado.

## Sonidos de notificación

Elija sonidos por notificación desde scripts con `openclaw` y `node.invoke`, p. ej.:

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

Ya no hay un interruptor global de “sonido predeterminado” en la aplicación; los que llaman eligen un sonido (o ninguno) por solicitud.

import es from "/components/footer/es.mdx";

<es />
