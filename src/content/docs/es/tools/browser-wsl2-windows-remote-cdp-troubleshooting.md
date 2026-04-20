---
summary: "Solucione problemas de WSL2 Gateway + Windows Chrome CDP remoto en capas"
read_when:
  - Running OpenClaw Gateway in WSL2 while Chrome lives on Windows
  - Seeing overlapping browser/control-ui errors across WSL2 and Windows
  - Deciding between host-local Chrome MCP and raw remote CDP in split-host setups
title: "WSL2 + Windows + solución de problemas de CDP remoto de Chrome"
---

# WSL2 + Windows + solución de problemas de CDP remoto de Chrome

Esta guía cubre la configuración común de host dividido donde:

- OpenClaw Gateway se ejecuta dentro de WSL2
- Chrome se ejecuta en Windows
- el control del navegador debe cruzar el límite entre WSL2 y Windows

También cubre el patrón de fallo en capas del [issue #39369](https://github.com/openclaw/openclaw/issues/39369): varios problemas independientes pueden aparecer a la vez, lo que hace que la capa incorrecta parezca rota primero.

## Elija primero el modo de navegador correcto

Tiene dos patrones válidos:

### Opción 1: CDP remoto sin procesar de WSL2 a Windows

Utilice un perfil de navegador remoto que apunte desde WSL2 a un punto final CDP de Chrome en Windows.

Elija esto cuando:

- el Gateway permanece dentro de WSL2
- Chrome se ejecuta en Windows
- necesita que el control del navegador cruce el límite WSL2/Windows

### Opción 2: MCP de Chrome local de host

Use `existing-session` / `user` solo cuando el Gateway en sí se ejecuta en el mismo host que Chrome.

Elija esto cuando:

- OpenClaw y Chrome están en la misma máquina
- desea el estado del navegador local con sesión iniciada
- no necesita transporte de navegador entre hosts
- no necesitas rutas avanzadas gestionadas/solo-CDP-crudo como `responsebody`, exportación de PDF, intercepción de descargas o acciones por lotes

Para WSL2 Gateway + Windows Chrome, prefiere CDP remoto crudo. Chrome MCP es local-host, no un puente WSL2-a-Windows.

## Arquitectura de funcionamiento

Forma de referencia:

- WSL2 ejecuta el Gateway en `127.0.0.1:18789`
- Windows abre la Interfaz de Control (Control UI) en un navegador normal en `http://127.0.0.1:18789/`
- Windows Chrome expone un endpoint CDP en el puerto `9222`
- WSL2 puede alcanzar ese endpoint CDP de Windows
- OpenClaw apunta un perfil de navegador a la dirección que es alcanzable desde WSL2

## Por qué esta configuración es confusa

Varios fallos pueden superponerse:

- WSL2 no puede alcanzar el endpoint CDP de Windows
- la Interfaz de Control se abre desde un origen no seguro
- `gateway.controlUi.allowedOrigins` no coincide con el origen de la página
- falta el token o el emparejamiento
- el perfil del navegador apunta a la dirección incorrecta

Debido a eso, solucionar una capa puede dejar visible un error diferente.

## Regla crítica para la Interfaz de Control

Cuando la interfaz se abre desde Windows, usa localhost de Windows a menos que tengas una configuración HTTPS deliberada.

Usa:

`http://127.0.0.1:18789/`

No uses por defecto una IP LAN para la Interfaz de Control. HTTP plano en una dirección LAN o tailnet puede activar un comportamiento de origen inseguro/autenticación de dispositivo que no está relacionado con el CDP en sí. Consulta [Control UI](/es/web/control-ui).

## Validar en capas

Trabaja de arriba a abajo. No te saltes pasos.

### Capa 1: Verificar que Chrome está sirviendo CDP en Windows

Inicia Chrome en Windows con la depuración remota habilitada:

```powershell
chrome.exe --remote-debugging-port=9222
```

Desde Windows, verifica primero el propio Chrome:

```powershell
curl http://127.0.0.1:9222/json/version
curl http://127.0.0.1:9222/json/list
```

Si esto falla en Windows, OpenClaw aún no es el problema.

### Capa 2: Verificar que WSL2 puede alcanzar ese endpoint de Windows

Desde WSL2, prueba la dirección exacta que planeas usar en `cdpUrl`:

```bash
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list
```

Buen resultado:

- `/json/version` devuelve JSON con metadatos de Browser / Protocol-Version
- `/json/list` devuelve JSON (un array vacío está bien si no hay páginas abiertas)

Si esto falla:

- Windows no está exponiendo el puerto a WSL2 todavía
- la dirección es incorrecta para el lado de WSL2
- todavía faltan el firewall / reenvío de puertos / proxy local

Solucione eso antes de tocar la configuración de OpenClaw.

### Capa 3: Configurar el perfil de navegador correcto

Para CDP remoto sin procesar, apunte OpenClaw a la dirección que sea accesible desde WSL2:

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "remote",
    profiles: {
      remote: {
        cdpUrl: "http://WINDOWS_HOST_OR_IP:9222",
        attachOnly: true,
        color: "#00AA00",
      },
    },
  },
}
```

Notas:

- use la dirección accesible desde WSL2, no cualquiera que solo funcione en Windows
- mantenga `attachOnly: true` para navegadores administrados externamente
- `cdpUrl` puede ser `http://`, `https://`, `ws://`, o `wss://`
- use HTTP(S) cuando quiera que OpenClaw descubra `/json/version`
- use WS(S) solo cuando el proveedor del navegador le dé una URL directa de socket DevTools
- pruebe la misma URL con `curl` antes de esperar que OpenClaw tenga éxito

### Capa 4: Verificar la capa de la Interfaz de Control por separado

Abra la Interfaz de Usuario desde Windows:

`http://127.0.0.1:18789/`

Luego verifique:

- el origen de la página coincide con lo que `gateway.controlUi.allowedOrigins` espera
- la autenticación por token o el emparejamiento están configurados correctamente
- no está depurando un problema de autenticación de la Interfaz de Control como si fuera un problema del navegador

Página útil:

- [Interfaz de Control](/es/web/control-ui)

### Capa 5: Verificar el control del navegador de extremo a extremo

Desde WSL2:

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

Buen resultado:

- la pestaña se abre en Chrome de Windows
- `openclaw browser tabs` devuelve el objetivo
- las acciones posteriores (`snapshot`, `screenshot`, `navigate`) funcionan desde el mismo perfil

## Errores comunes engañosos

Trate cada mensaje como una pista específica de la capa:

- `control-ui-insecure-auth`
  - problema de origen de UI / contexto seguro, no un problema de transporte CDP
- `token_missing`
  - problema de configuración de autenticación
- `pairing required`
  - problema de aprobación del dispositivo
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 no puede alcanzar el `cdpUrl` configurado
- `Browser attachOnly is enabled and CDP websocket for profile "remote" is not reachable`
  - el punto final HTTP respondió, pero el WebSocket DevTools aún no se pudo abrir
- overrides obsoletos de viewport / modo oscuro / configuración regional / sin conexión después de una sesión remota
  - ejecute `openclaw browser stop --browser-profile remote`
  - esto cierra la sesión de control activa y libera el estado de emulación de Playwright/CDP sin reiniciar el gateway o el navegador externo
- `gateway timeout after 1500ms`
  - a menudo todavía es accesibilidad CDP o un punto final remoto lento o inalcanzable
- `No Chrome tabs found for profile="user"`
  - perfil local de Chrome MCP seleccionado donde no hay pestañas locales de host disponibles

## Lista de verificación de triaje rápido

1. Windows: ¿funciona `curl http://127.0.0.1:9222/json/version`?
2. WSL2: ¿funciona `curl http://WINDOWS_HOST_OR_IP:9222/json/version`?
3. Configuración de OpenClaw: ¿usa `browser.profiles.<name>.cdpUrl` esa dirección exacta accesible desde WSL2?
4. Interfaz de control: ¿estás abriendo `http://127.0.0.1:18789/` en lugar de una IP LAN?
5. ¿Estás intentando usar `existing-session` entre WSL2 y Windows en lugar de CDP remoto sin procesar?

## Conclusión práctica

La configuración suele ser viable. La parte difícil es que el transporte del navegador, la seguridad de origen de la interfaz de control y el token/emparejamiento pueden fallar de forma independiente mientras se parecen similares desde el lado del usuario.

En caso de duda:

- verifica el punto final de Chrome en Windows localmente primero
- verifica el mismo punto final desde WSL2 en segundo lugar
- solo entonces depura la configuración de OpenClaw o la autenticación de la interfaz de control
