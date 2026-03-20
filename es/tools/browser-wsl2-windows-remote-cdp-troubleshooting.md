---
summary: "Solucione problemas de WSL2 Gateway + Windows Chrome remote CDP en capas"
read_when:
  - Ejecutar OpenClaw Gateway en WSL2 mientras Chrome se encuentra en Windows
  - Ver errores de navegador/interfaz de control superpuestos entre WSL2 y Windows
  - Decidir entre Chrome MCP host-local y CDP remoto sin procesar en configuraciones de host dividido
title: "WSL2 + Windows + resolución de problemas de CDP remoto de Chrome"
---

# WSL2 + Windows + resolución de problemas de CDP remoto de Chrome

Esta guía cubre la configuración común de host dividido donde:

- OpenClaw Gateway se ejecuta dentro de WSL2
- Chrome se ejecuta en Windows
- el control del navegador debe cruzar el límite entre WSL2 y Windows

También cubre el patrón de fallas en capas del [problema #39369](https://github.com/openclaw/openclaw/issues/39369): varios problemas independientes pueden aparecer a la vez, lo que hace que la capa incorrecta parezca rota primero.

## Elija primero el modo de navegador correcto

Tiene dos patrones válidos:

### Opción 1: CDP remoto sin procesar de WSL2 a Windows

Use un perfil de navegador remoto que apunte desde WSL2 a un punto final CDP de Chrome en Windows.

Elija esto cuando:

- el Gateway permanece dentro de WSL2
- Chrome se ejecuta en Windows
- necesita que el control del navegador cruce el límite entre WSL2 y Windows

### Opción 2: Chrome MCP host-local

Use `existing-session` / `user` solo cuando el propio Gateway se ejecuta en el mismo host que Chrome.

Elija esto cuando:

- OpenClaw y Chrome están en la misma máquina
- desea el estado del navegador local con sesión iniciada
- no necesita transporte de navegador entre hosts

Para WSL2 Gateway + Windows Chrome, prefiera CDP remoto sin procesar. Chrome MCP es host-local, no un puente de WSL2 a Windows.

## Arquitectura de funcionamiento

Forma de referencia:

- WSL2 ejecuta el Gateway en `127.0.0.1:18789`
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

Debido a eso, corregir una capa aún puede dejar visible un error diferente.

## Regla crítica para la interfaz de usuario de control

Cuando la interfaz de usuario se abre desde Windows, use localhost de Windows a menos que tenga una configuración HTTPS deliberada.

Use:

`http://127.0.0.1:18789/`

No use por defecto una IP LAN para la interfaz de usuario de control. El HTTP simple en una dirección LAN o tailnet puede desencadenar un comportamiento de origen inseguro/autenticación de dispositivo que no está relacionado con el CDP en sí. Consulte [Control UI](/es/web/control-ui).

## Valide en capas

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

- Windows aún no está exponiendo el puerto a WSL2
- la dirección es incorrecta para el lado de WSL2
- aún falta el firewall / reenvío de puerto / proxy local

Solucione eso antes de tocar la configuración de OpenClaw.

### Capa 3: Configurar el perfil de navegador correcto

Para CDP remoto sin procesar, apunte OpenClaw a la dirección que es accesible desde WSL2:

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

- use la dirección accesible desde WSL2, no la que solo funciona en Windows
- mantenga `attachOnly: true` para navegadores administrados externamente
- pruebe la misma URL con `curl` antes de esperar que OpenClaw tenga éxito

### Capa 4: Verificar la capa de la interfaz de usuario de control por separado

Abra la interfaz de usuario desde Windows:

`http://127.0.0.1:18789/`

Luego verifique:

- el origen de la página coincide con lo que `gateway.controlUi.allowedOrigins` espera
- la autenticación por token o el emparejamiento están configurados correctamente
- no está depurando un problema de autenticación de la interfaz de usuario de control como si fuera un problema del navegador

Página útil:

- [Control UI](/es/web/control-ui)

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
  - Problema de origen de la interfaz de usuario / contexto seguro, no un problema de transporte CDP
- `token_missing`
  - problema de configuración de autenticación
- `pairing required`
  - problema de aprobación del dispositivo
- `Remote CDP for profile "remote" is not reachable`
  - WSL2 no puede alcanzar el `cdpUrl` configurado
- `gateway timeout after 1500ms`
  - a menudo todavía es un problema de alcance del CDP o un extremo remoto lento/inalcanzable
- `No Chrome tabs found for profile="user"`
  - perfil local de Chrome MCP seleccionado donde no hay pestañas locales de host disponibles

## Lista de verificación de triaje rápido

1. Windows: ¿funciona `curl http://127.0.0.1:9222/json/version`?
2. WSL2: ¿funciona `curl http://WINDOWS_HOST_OR_IP:9222/json/version`?
3. Configuración de OpenClaw: ¿usa `browser.profiles.<name>.cdpUrl` esa dirección exacta alcanzable por WSL2?
4. Interfaz de control: ¿estás abriendo `http://127.0.0.1:18789/` en lugar de una IP LAN?
5. ¿Estás intentando usar `existing-session` a través de WSL2 y Windows en lugar de CDP remoto sin procesar?

## Conclusión práctica

La configuración generalmente es viable. La parte difícil es que el transporte del navegador, la seguridad de origen de la interfaz de control y el token/emparejamiento pueden fallar de forma independiente mientras se ven similares desde el lado del usuario.

En caso de duda:

- verificar primero el extremo de Chrome de Windows localmente
- verificar el mismo extremo desde WSL2 en segundo lugar
- solo entonces depurar la configuración de OpenClaw o la autenticación de la interfaz de control

import es from "/components/footer/es.mdx";

<es />
