---
summary: "Solucione problemas de la puerta de enlace WSL2 + Chrome remoto de Windows y configuraciones de retransmisión de extensiones por capas"
read_when:
  - Running OpenClaw Gateway in WSL2 while Chrome lives on Windows
  - Seeing overlapping browser/control-ui errors across WSL2 and Windows
  - Deciding between raw remote CDP and the Chrome extension relay in split-host setups
title: "WSL2 + Windows + solución de problemas de CDP remoto de Chrome"
---

# WSL2 + Windows + solución de problemas de CDP remoto de Chrome

Esta guía cubre la configuración común de host dividido donde:

- OpenClaw Gateway se ejecuta dentro de WSL2
- Chrome se ejecuta en Windows
- el control del navegador debe cruzar el límite entre WSL2 y Windows

También cubre el patrón de falla en capas del [issue #39369](https://github.com/openclaw/openclaw/issues/39369): varios problemas independientes pueden aparecer a la vez, lo que hace que la capa incorrecta parezca rota primero.

## Elija primero el modo de navegador correcto

Tiene dos patrones válidos:

### Opción 1: CDP remoto sin procesar

Utilice un perfil de navegador remoto que apunte desde WSL2 a un punto final CDP de Chrome en Windows.

Elija esto cuando:

- solo necesite control del navegador
- se sienta cómodo exponiendo la depuración remota de Chrome a WSL2
- no necesita la retransmisión de la extensión de Chrome

### Opción 2: Retransmisión de la extensión de Chrome

Use el perfil integrado `chrome-relay` más la extensión OpenClaw Chrome.

Elija esto cuando:

- quiera adjuntar a una pestaña existente de Chrome en Windows con el botón de la barra de herramientas
- quiera control basado en extensiones en lugar de `--remote-debugging-port` sin procesar
- la propia retransmisión debe ser accesible a través del límite WSL2/Windows

Si usa la retransmisión de la extensión entre espacios de nombres, `browser.relayBindHost` es la configuración importante introducida en [Navegador](/es/tools/browser) y [Extensión de Chrome](/es/tools/chrome-extension).

## Arquitectura de funcionamiento

Forma de referencia:

- WSL2 ejecuta la puerta de enlace en `127.0.0.1:18789`
- Windows abre la interfaz de usuario de control en un navegador normal en `http://127.0.0.1:18789/`
- Windows Chrome expone un punto final CDP en el puerto `9222`
- WSL2 puede alcanzar ese punto final CDP de Windows
- OpenClaw apunta un perfil de navegador a la dirección que es accesible desde WSL2

## Por qué esta configuración es confusa

Varias fallas pueden superponerse:

- WSL2 no puede alcanzar el punto final CDP de Windows
- la interfaz de usuario de control se abre desde un origen no seguro
- `gateway.controlUi.allowedOrigins` no coincide con el origen de la página
- falta el token o el emparejamiento
- el perfil del navegador apunta a la dirección incorrecta
- el rele de la extensión sigue siendo solo de bucle local (loopback) cuando realmente necesita acceso entre espacios de nombres

Debido a eso, corregir una capa puede dejar visible un error diferente.

## Regla crítica para la Interfaz de Control (Control UI)

Cuando la interfaz se abre desde Windows, use el localhost de Windows a menos que tenga una configuración HTTPS deliberada.

Usar:

`http://127.0.0.1:18789/`

No use por defecto una IP de LAN para la Interfaz de Control. El HTTP plano en una dirección de LAN o tailnet puede activar un comportamiento de origen inseguro/autenticación de dispositivo que no está relacionado con el CDP en sí. Consulte [Interfaz de Control](/es/web/control-ui).

## Validar en capas

Trabaje de arriba a abajo. No se salte pasos.

### Capa 1: Verificar que Chrome está sirviendo CDP en Windows

Inicie Chrome en Windows con la depuración remota habilitada:

```powershell
chrome.exe --remote-debugging-port=9222
```

Desde Windows, verifique primero el propio Chrome:

```powershell
curl http://127.0.0.1:9222/json/version
curl http://127.0.0.1:9222/json/list
```

Si esto falla en Windows, OpenClaw aún no es el problema.

### Capa 2: Verificar que WSL2 puede alcanzar ese endpoint de Windows

Desde WSL2, pruebe la dirección exacta que planea usar en `cdpUrl`:

```bash
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list
```

Buen resultado:

- `/json/version` devuelve JSON con metadatos de Browser / Protocol-Version
- `/json/list` devuelve JSON (un arreglo vacío está bien si no hay páginas abiertas)

Si esto falla:

- Windows no está exponiendo el puerto a WSL2 todavía
- la dirección es incorrecta para el lado de WSL2
- firewall / reenvío de puerto / proxy local todavía faltan

Solucione eso antes de tocar la configuración de OpenClaw.

### Capa 3: Configurar el perfil de navegador correcto

Para CDP remoto sin procesar (raw), apunte OpenClaw a la dirección que es alcanzable desde WSL2:

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

- use la dirección alcanzable por WSL2, no cualquiera que solo funcione en Windows
- mantenga `attachOnly: true` para navegadores administrados externamente
- pruebe la misma URL con `curl` antes de esperar que OpenClaw tenga éxito

### Capa 4: Si usa el rele de la extensión de Chrome en su lugar

Si la máquina del navegador y el Gateway están separados por un límite de espacio de nombres, el rele puede necesitar una dirección de enlace (bind address) que no sea de bucle local.

Ejemplo:

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "chrome-relay",
    relayBindHost: "0.0.0.0",
  },
}
```

Use esto solo cuando sea necesario:

- el comportamiento predeterminado es más seguro porque el rele permanece solo de bucle local (loopback-only)
- `0.0.0.0` expande la superficie de exposición
- mantenga la autenticación del Gateway, el emparejamiento de nodos y la red circundante privados

Si no necesita el rele de la extensión, prefiera el perfil de CDP remoto sin procesar (raw remote CDP) anterior.

### Capa 5: Verificar la capa de la Interfaz de Control por separado

Abra la interfaz desde Windows:

`http://127.0.0.1:18789/`

Luego verifique:

- el origen de la página coincide con lo que `gateway.controlUi.allowedOrigins` espera
- la autenticación por token o el emparejamiento están configurados correctamente
- no está depurando un problema de autenticación de la Interfaz de Control como si fuera un problema del navegador

Página útil:

- [Interfaz de Control](/es/web/control-ui)

### Capa 6: Verificar el control del navegador de extremo a extremo

Desde WSL2:

```bash
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote
```

Para el relé de la extensión:

```bash
openclaw browser tabs --browser-profile chrome-relay
```

Buen resultado:

- la pestaña se abre en Chrome de Windows
- `openclaw browser tabs` devuelve el objetivo
- las acciones posteriores (`snapshot`, `screenshot`, `navigate`) funcionan desde el mismo perfil

## Errores comunes engañosos

Trate cada mensaje como una pista específica de la capa:

- `control-ui-insecure-auth`
  - problema de origen de la Interfaz de Usuario / contexto seguro, no un problema de transporte CDP
- `token_missing`
  - problema de configuración de autenticación
- `pairing required`
  - problema de aprobación del dispositivo
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 no puede alcanzar el `cdpUrl` configurado
- `gateway timeout after 1500ms`
  - a menudo todavía es accesibilidad CDP o un extremo remoto lento o inalcanzable
- `Chrome extension relay is running, but no tab is connected`
  - perfil de relé de extensión seleccionado, pero aún no existe ninguna pestaña adjunta

## Lista de verificación de triaje rápido

1. Windows: ¿funciona `curl http://127.0.0.1:9222/json/version`?
2. WSL2: ¿funciona `curl http://WINDOWS_HOST_OR_IP:9222/json/version`?
3. Configuración de OpenClaw: ¿usa `browser.profiles.<name>.cdpUrl` esa dirección exacta alcanzable por WSL2?
4. Interfaz de Control: ¿está abriendo `http://127.0.0.1:18789/` en lugar de una IP LAN?
5. Solo para relé de extensión: ¿realmente necesita `browser.relayBindHost` y, si es así, está establecido explícitamente?

## Conclusión práctica

La configuración generalmente es viable. La parte difícil es que el transporte del navegador, la seguridad de origen de la Interfaz de Control, el token/emparejamiento y la topología del relé de extensiones pueden fallar independientemente mientras se ven similares desde el lado del usuario.

En caso de duda:

- verifique primero el extremo de Chrome de Windows localmente
- verifique el mismo extremo desde WSL2 en segundo lugar
- solo entonces depure la configuración de OpenClaw o la autenticación de la Interfaz de Control

import es from "/components/footer/es.mdx";

<es />
