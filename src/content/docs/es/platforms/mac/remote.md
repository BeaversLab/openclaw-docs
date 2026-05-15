---
summary: "Flujo de la aplicación macOS para controlar una puerta de enlace OpenClaw remota a través de SSH"
read_when:
  - Setting up or debugging remote mac control
title: "Control remoto"
---

Este flujo permite que la aplicación de macOS actúe como un control remoto completo para una puerta de enlace de OpenClaw que se ejecuta en otro host (escritorio/servidor). Es la función **Remoto por SSH** (ejecución remota) de la aplicación. Todas las funciones: comprobaciones de estado, reenvío de Voice Wake y Web Chat reutilizan la misma configuración SSH remota de _Configuración → General_.

## Modos

- **Local (este Mac)**: Todo se ejecuta en el portátil. No se involucra SSH.
- **Remoto por SSH (predeterminado)**: Los comandos de OpenClaw se ejecutan en el host remoto. La aplicación de Mac abre una conexión SSH con `-o BatchMode` más su identidad/clave elegida y un reenvío de puerto local.
- **Remoto directo (ws/wss)**: Sin túnel SSH. La aplicación de Mac se conecta directamente a la URL de la puerta de enlace (por ejemplo, a través de Tailscale Serve o un proxy inverso HTTPS público).

## Transportes remotos

El modo remoto admite dos transportes:

- **Túnel SSH** (predeterminado): Usa `ssh -N -L ...` para reenviar el puerto de la puerta de enlace a localhost. La puerta de enlace verá la IP del nodo como `127.0.0.1` porque el túnel es de bucle local (loopback).
- **Directo (ws/wss)**: Se conecta directamente a la URL de la puerta de enlace. La puerta de enlace ve la IP real del cliente.

En el modo de túnel SSH, los nombres de host de LAN/tailnet descubiertos se guardan como
`gateway.remote.sshTarget`. La aplicación mantiene `gateway.remote.url` en el punto final
del túnel local, por ejemplo `ws://127.0.0.1:18789`, para que la CLI, el Web Chat y
el servicio de nodo host local todos usen el mismo transporte seguro de bucle local.

La automatización del navegador en modo remoto es propiedad del host de nodo CLI, no del
nodo de la aplicación nativa de macOS. La aplicación inicia el servicio de host de nodo instalado cuando
es posible; si necesita control del navegador desde ese Mac, instale/inícielo con
`openclaw node install ...` y `openclaw node start` (o ejecute
`openclaw node run ...` en primer plano) y luego apunte a ese nodo capaz de
navegador.

## Requisitos previos en el host remoto

1. Instale Node + pnpm y compile/instale la CLI de OpenClaw (`pnpm install && pnpm build && pnpm link --global`).
2. Asegúrese de que `openclaw` esté en PATH para shells no interactivos (cree un enlace simbólico en `/usr/local/bin` o `/opt/homebrew/bin` si es necesario).
3. Abra SSH con autenticación por clave. Recomendamos las IP de **Tailscale** para una accesibilidad estable fuera de la LAN.

## Configuración de la aplicación macOS

1. Abra _Configuración → General_.
2. En **Ejecuciones de OpenClaw**, seleccione **Remoto por SSH** y configure:
   - **Transporte**: **Túnel SSH** o **Directo (ws/wss)**.
   - **Destino SSH**: `user@host` (`:port` opcional).
     - Si el gateway está en la misma LAN y anuncia Bonjour, selecciónelo de la lista descubierta para rellenar automáticamente este campo.
   - **URL del Gateway** (solo Directo): `wss://gateway.example.ts.net` (o `ws://...` para local/LAN).
   - **Archivo de identidad** (avanzado): ruta a su clave.
   - **Raíz del proyecto** (avanzado): ruta de checkout remoto utilizada para comandos.
   - **Ruta del CLI** (avanzado): ruta opcional a un punto de entrada/binario ejecutable `openclaw` (rellenado automáticamente cuando se anuncia).
3. Pulse **Probar remoto**. El éxito indica que el `openclaw status --json` remoto se ejecuta correctamente. Los fallos suelen significar problemas de PATH/CLI; el exit 127 significa que no se encuentra el CLI de forma remota.
4. Las comprobaciones de estado y el Web Chat ahora se ejecutarán automáticamente a través de este túnel SSH.

## Web Chat

- **Túnel SSH**: Web Chat se conecta al gateway a través del puerto de control WebSocket reenviado (predeterminado 18789).
- **Directo (ws/wss)**: Web Chat se conecta directamente a la URL del gateway configurada.
- Ya no hay un servidor HTTP WebChat separado.

## Permisos

- El host remoto necesita las mismas aprobaciones TCC que el local (Automatización, Accesibilidad, Grabación de pantalla, Micrófono, Reconocimiento de voz, Notificaciones). Ejecute la incorporación en esa máquina para concederlos una vez.
- Los nodos anuncian su estado de permiso a través de `node.list` / `node.describe` para que los agentes sepan qué está disponible.

## Notas de seguridad

- Prefiera enlaces de loopback en el host remoto y conéctese a través de SSH o Tailscale.
- El túnel SSH utiliza verificación estricta de clave de host; confíe primero en la clave del host para que exista en `~/.ssh/known_hosts`.
- Si vincula el Gateway a una interfaz que no sea de loopback, requiera autenticación válida del Gateway: token, contraseña o un proxy inverso con reconocimiento de identidad con `gateway.auth.mode: "trusted-proxy"`.
- Consulte [Seguridad](/es/gateway/security) y [Tailscale](/es/gateway/tailscale).

## Flujo de inicio de sesión de WhatsApp (remoto)

- Ejecute `openclaw channels login --verbose` **en el host remoto**. Escanee el código QR con WhatsApp en su teléfono.
- Vuelva a ejecutar el inicio de sesión en ese host si la autenticación expira. La comprobación de estado mostrará los problemas del enlace.

## Solución de problemas

- **exit 127 / no encontrado**: `openclaw` no está en PATH para shells sin inicio de sesión. Agréguelo a `/etc/paths`, su configuración de shell, o cree un enlace simbólico en `/usr/local/bin`/`/opt/homebrew/bin`.
- **Health probe failed**: verifique la accesibilidad de SSH, PATH y que Baileys haya iniciado sesión (`openclaw status --json`).
- **Web Chat stuck**: confirme que la puerta de enlace se está ejecutando en el host remoto y que el puerto reenviado coincide con el puerto WS de la puerta de enlace; la interfaz de usuario requiere una conexión WS saludable.
- **Node IP shows 127.0.0.1**: es esperado con el túnel SSH. Cambie **Transport** a **Direct (ws/wss)** si desea que la puerta de enlace vea la IP real del cliente.
- **Dashboard works but Mac capabilities are offline**: esto significa que la conexión de operador/control de la aplicación es saludable, pero la conexión del nodo complementario no está conectada o le falta su superficie de comandos. Abra la sección de dispositivos de la barra de menús y verifique si el Mac está `paired · disconnected`. Para `wss://*.ts.net` puntos finales de Tailscale Serve, la aplicación detecta pines de hoja TLS heredados obsoletos después de la rotación del certificado, borra el pin obsoleto cuando macOS confía en el nuevo certificado y reintenta automáticamente. Si el certificado no es confiable para el sistema o el host no es un nombre de Tailscale Serve, revise el certificado o cambie a **Remote over SSH**.
- **Voice Wake**: las frases de activación se reenvían automáticamente en modo remoto; no se necesita un reenviador separado.

## Sonidos de notificación

Elija sonidos por notificación desde secuencias de comandos con `openclaw` y `node.invoke`, p. ej.:

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

Ya no hay un interruptor global de "sonido predeterminado" en la aplicación; los que llaman eligen un sonido (o ninguno) por solicitud.

## Relacionado

- [macOS app](/es/platforms/macos)
- [Remote access](/es/gateway/remote)
