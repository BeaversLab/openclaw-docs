---
summary: "Lista de verificación previa al vuelo y de reversión antes de exponer un Gateway de OpenClaw más allá del bucle local"
title: "Manual de procedimientos de exposición del Gateway"
sidebarTitle: "Manual de exposición"
read_when:
  - Exposing the Gateway over LAN, tailnet, Tailscale Serve, Funnel, or a reverse proxy
  - Reviewing a deployment before allowing real messaging users
  - Rolling back a risky remote access or DM configuration
---

<Warning>Exponga el Gateway solo después de poder explicar quién puede alcanzarlo, cómo están autenticados, qué agentes pueden activar y qué herramientas pueden usar esos agentes. En caso de duda, vuelva al acceso de solo bucle local y vuelva a ejecutar la auditoría.</Warning>

Este manual de procedimientos convierte la guía más amplia de [Seguridad](/es/gateway/security) en una
lista de verificación para operadores sobre el acceso remoto y la exposición de mensajería.

## Elija el patrón de exposición

Prefiera el patrón más estrecho que satisfaga el flujo de trabajo.

| Patrón                        | Recomendado cuando                                                      | Controles requeridos                                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Bucle local + túnel SSH       | Uso personal, acceso de administrador, depuración                       | Mantener `gateway.bind: "loopback"` y túnel `127.0.0.1:18789`                                                                                |
| Bucle local + Tailscale Serve | Acceso personal a tailnet a la interfaz de usuario de control/WebSocket | Mantener el Gateway solo en bucle local; confíe únicamente en los encabezados de identidad de Tailscale para las superficies compatibles     |
| Enlace Tailnet/LAN            | Red privada dedicada con dispositivos conocidos                         | Autenticación del Gateway, lista blanca de firewall, sin reenvío de puerto público                                                           |
| Proxy inverso confiable       | SSO/OIDC de la organización frente al Gateway                           | Autenticación `trusted-proxy`, `trustedProxies` estricta, reglas de sobrescritura/eliminación de encabezados, usuarios permitidos explícitos |
| Internet pública              | Despliegues raros y de alto riesgo                                      | Proxy con reconocimiento de identidad, TLS, límites de velocidad, listas blancas estrictas, sesiones no principales aisladas                 |

Evite el reenvío directo de puertos públicos al Gateway. Si necesita acceso público,
coloque un proxy con reconocimiento de identidad frente a él y haga que el proxy sea la única ruta
de red hacia el Gateway.

## Inventario previo al vuelo

Registre esto antes de cambiar el enlace, proxy, Tailscale o la política de canales:

- Host del Gateway, usuario del sistema operativo y directorio de estado.
- URL del Gateway y modo de enlace.
- Modo de autenticación, origen del token/contraseña o fuente de identidad del proxy de confianza.
- Todos los canales habilitados y si aceptan mensajes directos, grupos o webhooks.
- Agentes accesibles desde remitentes no locales.
- Perfil de herramientas, modo de sandbox y política de herramientas elevadas para cada agente accesible.
- Credenciales externas disponibles para esos agentes.
- Ubicación de copia de seguridad para `~/.openclaw/openclaw.json` y credenciales.

Si más de una persona puede enviar mensajes al bot, trate esto como una autoridad de herramienta delegada compartida, no como aislamiento de host por usuario.

## Verificaciones de línea base

Ejecute esto antes de abrir el acceso:

```bash
openclaw doctor
openclaw security audit
openclaw security audit --deep
openclaw health
```

Primero resuelva los hallazgos críticos. Las advertencias solo pueden ser aceptables cuando son intencionales y están documentadas para el despliegue.

Para la validación remota de la CLI, pase las credenciales explícitamente:

```bash
openclaw gateway probe --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
```

No asuma que las credenciales de configuración local se aplican a una URL remota explícita.

## Línea base segura mínima

Use esta forma como punto de partida para los despliegues expuestos:

```json5
{
  gateway: {
    bind: "loopback",
    auth: {
      mode: "token",
      token: "replace-with-a-long-random-token",
    },
  },
  session: {
    dmScope: "per-channel-peer",
  },
  agents: {
    defaults: {
      sandbox: { mode: "non-main" },
    },
  },
  tools: {
    profile: "messaging",
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
}
```

Luego amplíe un control a la vez. Por ejemplo, agregue una lista blanca de canales específica antes de habilitar herramientas con capacidad de escritura, o habilite un proxy inverso antes de aceptar tráfico remoto de la interfaz de usuario de Control.

La línea base estricta `exec.security: "deny"` bloquea todas las llamadas exec, incluidos los diagnósticos benignos. Si se requieren diagnósticos o comandos de bajo riesgo, relaje esto solo después de elegir los remitentes, agentes, comandos y modo de aprobación específicos que coincidan con su modelo de amenazas.

## Exposición de MD y grupos

Los canales de mensajería son superficies de entrada que no son confiables. Antes de permitir MD o grupos:

- Prefiera `dmPolicy: "pairing"` o listas estrictas `allowFrom`.
- Evite `dmPolicy: "open"` a menos que cada remitente sea confiable.
- No combine listas blancas `"*"` con acceso amplio a herramientas.
- Requiera menciones en grupos a menos que la sala esté estrictamente controlada.
- Use `session.dmScope: "per-channel-peer"` cuando varias personas puedan enviar MD al bot.
- Enrute los canales compartidos a agentes con herramientas mínimas y sin credenciales personales.

El emparejamiento aprueba al remitente para activar el bot. No convierte a ese remitente en un límite de seguridad de host separado.

## Verificaciones de proxy inverso

Para proxies con reconocimiento de identidad:

- El proxy debe autenticar a los usuarios antes de reenviar al Gateway.
- El acceso directo al puerto del Gateway debe estar bloqueado por un firewall o una política de red.
- `gateway.trustedProxies` debe contener solo las IPs de origen del proxy.
- El proxy debe eliminar o sobrescribir los encabezados de identidad y reenvío proporcionados por el cliente.
- `gateway.auth.trustedProxy.allowUsers` debe enumerar los usuarios esperados cuando el proxy atiende a más de una audiencia.
- El modo de proxy de bucle local en el mismo host debe usar `allowLoopback` solo cuando los procesos locales sean de confianza y el proxy sea propietario de los encabezados de identidad.

Ejecute `openclaw security audit --deep` después de los cambios en el proxy. Los hallazgos de proxy de confianza son intencionalmente de alta señal porque el proxy se convierte en el límite de autenticación.

## Revisión de herramientas y entornos limitados (sandbox)

Antes de exponer un agente a remitentes remotos:

- Confirme qué sesiones se ejecutan en el host versus en el entorno limitado (sandbox).
- Deniegue o requiera aprobación para la ejecución en el host (host exec).
- Mantenga las herramientas elevadas deshabilitadas a menos que un remitente específico y de confianza las necesite.
- Evite las herramientas de navegador, canvas, node, cron, gateway y session-spawn para superficies de mensajería abiertas o semiabiertas.
- Mantenga los montajes de enlace (bind mounts) limitados y evite las rutas de credenciales, de inicio, del socket de Docker y del sistema.
- Utilice gateways, usuarios de sistema operativo o hosts separados para límites de confianza materialmente diferentes.

Si los usuarios remotos no son totalmente de confianza, el aislamiento debe provenir de implementaciones separadas, no solo de los mensajes o las etiquetas de sesión.

## Validación posterior al cambio

Después de cada cambio de exposición:

1. Vuelva a ejecutar `openclaw security audit --deep`.
2. Pruebe una conexión autorizada exitosa.
3. Pruebe que se deniegue un remitente o sesión de navegador no autorizado.
4. Confirme que los registros redactan secretos.
5. Confirme que el enrutamiento de DM/grupo llega solo al agente previsto.
6. Confirme que las herramientas de alto impacto solicitan aprobación o se deniegan.
7. Documente las advertencias residuales aceptadas.

No proceda al siguiente cambio de exposición hasta que se entienda el actual.

## Plan de reversión

Si el Gateway puede estar sobreexpuesto:

```json5
{
  gateway: {
    bind: "loopback",
  },
  channels: {
    whatsapp: { dmPolicy: "disabled" },
    telegram: { dmPolicy: "disabled" },
    discord: { dmPolicy: "disabled" },
    slack: { dmPolicy: "disabled" },
  },
  tools: {
    exec: { security: "deny", ask: "always" },
    elevated: { enabled: false },
  },
}
```

Entonces:

1. Detenga el reenvío público, Tailscale Funnel o las rutas de proxy inverso.
2. Rote los tokens/contraseñas del Gateway y las credenciales de integración afectadas.
3. Elimine `"*"` y los remitentes inesperados de las listas de permitidos (allowlists).
4. Revise los registros de auditoría recientes, el historial de ejecuciones, las llamadas a herramientas y los cambios de configuración.
5. Vuelva a ejecutar `openclaw security audit --deep`.
6. Vuelva a habilitar el acceso con el patrón más limitado que satisfaga el flujo de trabajo.

## Lista de verificación de revisión

- El Gateway permanece solo de bucle local (loopback-only) a menos que haya una razón documentada.
- El acceso que no es de bucle local tiene autenticación, firewalling y ninguna ruta directa pública.
- Las implementaciones de proxy de confianza tienen controles estrictos de IPs y encabezados del proxy.
- Los DM utilizan emparejamiento (pairing) o listas de permitidos, no acceso abierto por defecto.
- Los grupos requieren menciones o listas de permitidos explícitas.
- Los canales compartidos no alcanzan las credenciales personales.
- Las sesiones no principales se ejecutan en modo sandbox.
- El exec del host y las herramientas elevadas están denegados o restringidos por aprobación.
- Los registros redactan secretos.
- Los hallazgos críticos de la auditoría están resueltos.
- Los pasos de reversión están probados y documentados.
