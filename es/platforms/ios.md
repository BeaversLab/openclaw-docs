---
summary: "Aplicación de nodo iOS: conexión a la puerta de enlace, emparejamiento, lienzo y solución de problemas"
read_when:
  - Emparejar o volver a conectar el nodo iOS
  - Ejecutar la aplicación iOS desde el código fuente
  - Depuración del descubrimiento de puerta de enlace o comandos de lienzo
title: "iOS App"
---

# iOS App (Node)

Disponibilidad: vista previa interna. La aplicación iOS aún no se distribuye públicamente.

## Lo que hace

- Se conecta a una puerta de enlace a través de WebSocket (LAN o tailnet).
- Expone las capacidades del nodo: Canvas, instantánea de pantalla, captura de cámara, ubicación, modo Talk, activación por voz.
- Recibe comandos `node.invoke` e informa eventos de estado del nodo.

## Requisitos

- Puerta de enlace ejecutándose en otro dispositivo (macOS, Linux o Windows a través de WSL2).
- Ruta de red:
  - Misma LAN a través de Bonjour, **o**
  - Tailnet a través de DNS-SD unicast (dominio de ejemplo: `openclaw.internal.`), **o**
  - Host/puerto manual (alternativa).

## Inicio rápido (emparejar + conectar)

1. Inicie la puerta de enlace:

```bash
openclaw gateway --port 18789
```

2. En la aplicación iOS, abra Configuración y elija una puerta de enlace descubierta (o habilite Host manual e ingrese host/puerto).

3. Aprobar la solicitud de emparejamiento en el host de la puerta de enlace:

```bash
openclaw devices list
openclaw devices approve <requestId>
```

4. Verificar la conexión:

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## Push respaldado por relay para compilaciones oficiales

Las compilaciones de iOS distribuidas oficialmente utilizan el relay de push externo en lugar de publicar el token APNs sin procesar en la puerta de enlace.

Requisito del lado de la puerta de enlace:

```json5
{
  gateway: {
    push: {
      apns: {
        relay: {
          baseUrl: "https://relay.example.com",
        },
      },
    },
  },
}
```

Cómo funciona el flujo:

- La aplicación iOS se registra en el relay utilizando App Attest y el recibo de la aplicación.
- El relay devuelve un identificador de relay opaco más una concesión de envío con ámbito de registro.
- La aplicación iOS obtiene la identidad de la puerta de enlace emparejada y la incluye en el registro del relay, de modo que el registro respaldado por el relay se delega a esa puerta de enlace específica.
- La aplicación reenvía ese registro respaldado por relay a la puerta de enlace emparejada con `push.apns.register`.
- La puerta de enlace utiliza ese identificador de relay almacenado para `push.test`, activaciones en segundo plano y empujones de activación (wake nudges).
- La URL base del relay de la puerta de enlace debe coincidir con la URL del relay integrada en la compilación oficial/TestFlight de iOS.
- Si la aplicación luego se conecta a una puerta de enlace diferente o a una compilación con una URL base de relay diferente, actualiza el registro del relay en lugar de reutilizar el enlace antiguo.

Lo que la puerta de enlace **no** necesita para esta ruta:

- Ningún token de relay para toda la implementación.
- Ninguna clave APNs directa para envíos respaldados por relay oficiales/TestFlight.

Flujo de operador esperado:

1. Instale la compilación oficial/TestFlight de iOS.
2. Configure `gateway.push.apns.relay.baseUrl` en la puerta de enlace.
3. Empareje la aplicación con la puerta de enlace y deje que termine de conectarse.
4. La aplicación publica `push.apns.register` automáticamente después de tener un token de APNs, la sesión del operador está conectada y el registro en el relay tiene éxito.
5. Después de eso, `push.test`, las reconexiones activan el despertar y las notificaciones de activación pueden usar el registro respaldado por relay almacenado.

Nota de compatibilidad:

- `OPENCLAW_APNS_RELAY_BASE_URL` todavía funciona como una anulación temporal de entorno para la puerta de enlace.

## Flujo de autenticación y confianza

El relay existe para hacer cumplir dos restricciones que APNs directo en la puerta de enlace no puede proporcionar para
las compilaciones oficiales de iOS:

- Solo las compilaciones de iOS genuinas de OpenClaw distribuidas a través de Apple pueden usar el relay hospedado.
- Una puerta de enlace solo puede enviar notificaciones push respaldadas por relay para dispositivos iOS que se hayan emparejado con esa
  puerta de enlace específica.

Salto a salto:

1. `iOS app -> gateway`
   - La aplicación primero se empareja con la puerta de enlace a través del flujo normal de autenticación de Gateway.
   - Esto le da a la aplicación una sesión de nodo autenticada más una sesión de operador autenticada.
   - La sesión del operador se usa para llamar a `gateway.identity.get`.

2. `iOS app -> relay`
   - La aplicación llama a los endpoints de registro del relay a través de HTTPS.
   - El registro incluye la prueba de App Attest más el recibo de la aplicación.
   - El relay valida el ID del paquete, la prueba de App Attest y el recibo de Apple, y requiere la
     ruta de distribución oficial/producción.
   - Esto es lo que impide que las compilaciones locales de Xcode/desarrollo usen el relay hospedado. Una compilación local puede estar
     firmada, pero no satisface la prueba de distribución oficial de Apple que el relay espera.

3. `gateway identity delegation`
   - Antes del registro en el relay, la aplicación obtiene la identidad de la puerta de enlace emparejada desde
     `gateway.identity.get`.
   - La aplicación incluye esa identidad de la puerta de enlace en la carga útil del registro del relay.
   - El relay devuelve un identificador de relay y un permiso de envío con ámbito de registro que se delegan a
     esa identidad de puerta de enlace.

4. `gateway -> relay`
   - La puerta de enlace almacena el identificador de relay y el permiso de envío de `push.apns.register`.
   - En `push.test`, reconexiones que despiertan y notificaciones de activación, la puerta de enlace firma la solicitud de envío con su
     propia identidad de dispositivo.
   - El relé verifica tanto el permiso de envío almacenado como la firma de la puerta de enlace contra la identidad de puerta de enlace delegada del registro.
   - Otra puerta de enlace no puede reutilizar ese registro almacenado, incluso si de alguna manera obtiene el identificador.

5. `relay -> APNs`
   - El relé posee las credenciales de APNs de producción y el token de APNs sin procesar para la compilación oficial.
   - La puerta de enlace nunca almacena el token de APNs sin procesar para las compilaciones oficiales respaldadas por el relé.
   - El relé envía el impulso final a APNs en nombre de la puerta de enlace emparejada.

Por qué se creó este diseño:

- Para mantener las credenciales de APNs de producción fuera de las puertas de enlace de los usuarios.
- Para evitar almacenar tokens de APNs de compilación oficial sin procesar en la puerta de enlace.
- Para permitir el uso del relé alojado solo para compilaciones oficiales/TestFlight de OpenClaw.
- Para evitar que una puerta de enlace envíe impulsos de activación a dispositivos iOS propiedad de una puerta de enlace diferente.

Las compilaciones locales/manuales permanecen en APNs directas. Si estás probando esas compilaciones sin el relé, la puerta de enlace todavía necesita credenciales directas de APNs:

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

## Rutas de descubrimiento

### Bonjour (LAN)

La puerta de enlace anuncia `_openclaw-gw._tcp` en `local.`. La aplicación iOS las enumera automáticamente.

### Tailnet (redes cruzadas)

Si mDNS está bloqueado, usa una zona DNS-SD unicast (elige un dominio; ejemplo: `openclaw.internal.`) y Tailscale split DNS.
Consulta [Bonjour](/es/gateway/bonjour) para ver el ejemplo de CoreDNS.

### Host/puerto manual

En Configuración, activa **Host Manual** e introduce el host + puerto de la puerta de enlace (predeterminado `18789`).

## Canvas + A2UI

El nodo de iOS renderiza un lienzo WKWebView. Usa `node.invoke` para controlarlo:

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

Notas:

- El host del lienzo de la puerta de enlace sirve `/__openclaw__/canvas/` y `/__openclaw__/a2ui/`.
- Se sirve desde el servidor HTTP de la puerta de enlace (mismo puerto que `gateway.port`, predeterminado `18789`).
- El nodo de iOS navega automáticamente a A2UI al conectarse cuando se anuncia una URL de host de lienzo.
- Vuelve al andamio integrado con `canvas.navigate` y `{"url":""}`.

### Evaluación de lienzo / instantánea

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## Activación por voz + modo de conversación

- La activación por voz y el modo de conversación están disponibles en Configuración.
- iOS puede suspender el audio en segundo plano; trata las funciones de voz como de mejor esfuerzo cuando la aplicación no está activa.

## Errores comunes

- `NODE_BACKGROUND_UNAVAILABLE`: lleva la aplicación de iOS al primer plano (los comandos de canvas/cámara/pantalla lo requieren).
- `A2UI_HOST_NOT_CONFIGURED`: el Gateway no anunció una URL de host de canvas; consulta `canvasHost` en [Gateway configuration](/es/gateway/configuration).
- El aviso de emparejamiento nunca aparece: ejecuta `openclaw devices list` y apruébalo manualmente.
- La reconexión falla después de reinstalar: el token de emparejamiento del Keychain se borró; vuelve a emparejar el nodo.

## Documentos relacionados

- [Emparejamiento](/es/channels/pairing)
- [Descubrimiento](/es/gateway/discovery)
- [Bonjour](/es/gateway/bonjour)

import es from "/components/footer/es.mdx";

<es />
