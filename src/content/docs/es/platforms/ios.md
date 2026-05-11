---
summary: "Aplicación de nodo iOS: conectar con la puerta de enlace, emparejamiento, lienzo y solución de problemas"
read_when:
  - Pairing or reconnecting the iOS node
  - Running the iOS app from source
  - Debugging gateway discovery or canvas commands
title: "Aplicación iOS"
---

Disponibilidad: vista previa interna. La aplicación iOS aún no se distribuye públicamente.

## Lo que hace

- Se conecta a una puerta de enlace a través de WebSocket (LAN o tailnet).
- Expone las capacidades del nodo: Canvas, captura de pantalla, captura de cámara, ubicación, modo Talk y activación por voz.
- Recibe comandos de `node.invoke` e informa eventos de estado del nodo.

## Requisitos

- Puerta de enlace ejecutándose en otro dispositivo (macOS, Linux o Windows a través de WSL2).
- Ruta de red:
  - Misma LAN a través de Bonjour, **o**
  - Tailnet a través de unicast DNS-SD (dominio de ejemplo: `openclaw.internal.`), **o**
  - Host/puerto manual (respaldo).

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

Si la aplicación vuelve a intentar el emparejamiento con detalles de autenticación modificados (rol/alcances/clave pública),
la solicitud pendiente anterior se reemplaza y se crea un nuevo `requestId`.
Ejecute `openclaw devices list` nuevamente antes de la aprobación.

Opcional: si el nodo iOS siempre se conecta desde una subred controlada estrictamente, puede
optar por la aprobación automática de nodo por primera vez con CIDR explícitos o IPs exactas:

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

Esto está deshabilitado de forma predeterminada. Solo se aplica al emparejamiento `role: node` nuevo sin
alcances solicitados. El emparejamiento de operador/navegador y cualquier cambio de rol, alcance, metadatos o
clave pública aún requieren aprobación manual.

4. Verificar la conexión:

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## Push respaldado por relay para compilaciones oficiales

Las compilaciones oficiales distribuidas de iOS utilizan el relay de push externo en lugar de publicar el token APNs
sin procesar en la puerta de enlace.

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
- El relay devuelve un identificador de relay opaco además de una concesión de envío con ámbito de registro.
- La aplicación iOS obtiene la identidad de la puerta de enlace emparejada y la incluye en el registro del relay, por lo que el registro respaldado por relay se delega a esa puerta de enlace específica.
- La aplicación reenvía ese registro respaldado por relay a la puerta de enlace emparejada con `push.apns.register`.
- La puerta de enlace utiliza ese identificador de relé almacenado para `push.test`, activaciones en segundo plano e impulsos de activación.
- La URL base del relé de la puerta de enlace debe coincidir con la URL del relé integrada en la compilación oficial de iOS para TestFlight.
- Si la aplicación se conecta posteriormente a una puerta de enlace diferente o a una compilación con una URL base de relé diferente, actualiza el registro de relé en lugar de reutilizar el enlace antiguo.

Lo que la puerta de enlace **no** necesita para esta ruta:

- Ningún token de relé para toda la implementación.
- Ninguna clave APNs directa para envíos respaldados por relé en las versiones oficiales/TestFlight.

Flujo de operación esperado:

1. Instale la compilación oficial de iOS para TestFlight.
2. Establezca `gateway.push.apns.relay.baseUrl` en la puerta de enlace.
3. Empareje la aplicación con la puerta de enlace y permítale terminar de conectarse.
4. La aplicación publica `push.apns.register` automáticamente después de tener un token APNs, la sesión del operador está conectada y el registro del relé tiene éxito.
5. Después de eso, `push.test`, las activaciones de reconexión y los impulsos de activación pueden utilizar el registro respaldado por relé almacenado.

Nota de compatibilidad:

- `OPENCLAW_APNS_RELAY_BASE_URL` todavía funciona como una anulación de entorno temporal para la puerta de enlace.

## Flujo de autenticación y confianza

El relé existe para hacer cumplir dos restricciones que el APNs directo en la puerta de enlace no puede proporcionar para
las compilaciones oficiales de iOS:

- Solo las compilaciones de iOS genuinas de OpenClaw distribuidas a través de Apple pueden usar el relé alojado.
- Una puerta de enlace solo puede enviar envíos respaldados por relé para dispositivos iOS que se hayan emparejado con esa
  puerta de enlace específica.

Salto a salto:

1. `iOS app -> gateway`
   - La aplicación primero se empareja con la puerta de enlace a través del flujo de autenticación normal de la puerta de enlace.
   - Esto le da a la aplicación una sesión de nodo autenticada más una sesión de operador autenticada.
   - La sesión del operador se utiliza para llamar a `gateway.identity.get`.

2. `iOS app -> relay`
   - La aplicación llama a los puntos finales de registro de relé a través de HTTPS.
   - El registro incluye la prueba de App Attest más el recibo de la aplicación.
   - El relé valida el ID del paquete, la prueba de App Attest y el recibo de Apple, y requiere
     la ruta de distribución oficial/de producción.
   - Esto es lo que impide que las compilaciones locales de Xcode/desarrollo usen el relé alojado. Una compilación local puede estar
     firmada, pero no satisface la prueba de distribución oficial de Apple que el relé espera.

3. `gateway identity delegation`
   - Antes del registro en el relé, la aplicación obtiene la identidad de la puerta de enlace emparejada de
     `gateway.identity.get`.
   - La aplicación incluye esa identidad de la puerta de enlace en la carga útil del registro del relé.
   - El relé devuelve un identificador de relé y una subvención de envío con ámbito de registro que se delegan a
     esa identidad de la puerta de enlace.

4. `gateway -> relay`
   - La puerta de enlace almacena el identificador del relé y la subvención de envío de `push.apns.register`.
   - En `push.test`, reconexiones, activaciones y empujes de activación, la puerta de enlace firma la solicitud de envío con su
     propia identidad de dispositivo.
   - El relé verifica tanto la subvención de envío almacenada como la firma de la puerta de enlace contra la
     identidad de puerta de enlace delegada del registro.
   - Otra puerta de enlace no puede reutilizar ese registro almacenado, incluso si de alguna manera obtiene el identificador.

5. `relay -> APNs`
   - El relé posee las credenciales de producción de APNs y el token sin procesar de APNs para la compilación oficial.
   - La puerta de enlace nunca almacena el token sin procesar de APNs para las compilaciones oficiales respaldadas por el relé.
   - El relé envía el empuje final a APNs en nombre de la puerta de enlace emparejada.

Por qué se creó este diseño:

- Para mantener las credenciales de producción de APNs fuera de las puertas de enlace de los usuarios.
- Para evitar almacenar tokens sin procesar de APNs de compilaciones oficiales en la puerta de enlace.
- Para permitir el uso del relé alojado solo para compilaciones oficiales/TestFlight de OpenClaw.
- Para evitar que una puerta de enlace envíe empujes de activación a dispositivos iOS propiedad de una puerta de enlace diferente.

Las compilaciones locales/manuales permanecen en APNs directas. Si está probando esas compilaciones sin el relé, la
puerta de enlace aún necesita credenciales directas de APNs:

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

Estas son variables de entorno de tiempo de ejecución del host de la puerta de enlace, no configuraciones de Fastlane. `apps/ios/fastlane/.env` solo almacena
autenticación de App Store Connect / TestFlight como `ASC_KEY_ID` y `ASC_ISSUER_ID`; no configura
la entrega directa de APNs para compilaciones locales de iOS.

Almacenamiento recomendado en el host de la puerta de enlace:

```bash
mkdir -p ~/.openclaw/credentials/apns
chmod 700 ~/.openclaw/credentials/apns
mv /path/to/AuthKey_KEYID.p8 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
chmod 600 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
export OPENCLAW_APNS_PRIVATE_KEY_PATH="$HOME/.openclaw/credentials/apns/AuthKey_KEYID.p8"
```

No confirme el archivo `.p8` ni lo coloque debajo de la descarga del repositorio.

## Rutas de descubrimiento

### Bonjour (LAN)

La aplicación de iOS explora `_openclaw-gw._tcp` en `local.` y, cuando está configurada, el mismo
dominio de descubrimiento DNS-SD de área amplia. Los gateways de la misma LAN aparecen automáticamente desde `local.`;
el descubrimiento entre redes puede usar el dominio de área amplia configurado sin cambiar el tipo de baliza.

### Tailnet (entre redes)

Si mDNS está bloqueado, use una zona DNS-SD unicast (elija un dominio; ejemplo:
`openclaw.internal.`) y Tailscale split DNS.
Consulte [Bonjour](/es/gateway/bonjour) para ver el ejemplo de CoreDNS.

### Host/puerto manual

En Configuración, active **Host manual** e introduzca el host + puerto del gateway (por defecto `18789`).

## Canvas + A2UI

El nodo de iOS renderiza un canvas WKWebView. Use `node.invoke` para controlarlo:

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

Notas:

- El host del canvas del Gateway sirve `/__openclaw__/canvas/` y `/__openclaw__/a2ui/`.
- Se sirve desde el servidor HTTP del Gateway (mismo puerto que `gateway.port`, por defecto `18789`).
- El nodo de iOS navega automáticamente a A2UI al conectarse cuando se anuncia una URL de host de canvas.
- Vuelva al andamio integrado con `canvas.navigate` y `{"url":""}`.

### Evaluación de canvas / instantánea

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## Activación por voz + modo de habla

- La activación por voz y el modo de habla están disponibles en Configuración.
- iOS puede suspender el audio en segundo plano; trate las funciones de voz como mejor esfuerzo cuando la aplicación no está activa.

## Errores comunes

- `NODE_BACKGROUND_UNAVAILABLE`: traiga la aplicación de iOS al primer plano (los comandos de canvas/cámara/pantalla lo requieren).
- `A2UI_HOST_NOT_CONFIGURED`: el Gateway no anunció una URL de host de canvas; verifique `canvasHost` en [Configuración del Gateway](/es/gateway/configuration).
- El mensaje de emparejamiento nunca aparece: ejecute `openclaw devices list` y apruebe manualmente.
- La reconexión falla después de reinstalar: el token de emparejamiento del Keychain se borró; vuelva a emparejar el nodo.

## Documentos relacionados

- [Emparejamiento](/es/channels/pairing)
- [Descubrimiento](/es/gateway/discovery)
- [Bonjour](/es/gateway/bonjour)
