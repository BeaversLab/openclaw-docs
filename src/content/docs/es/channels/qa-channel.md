---
summary: "Complemento de canal sintético tipo Slack para escenarios QA de OpenClaw deterministas"
title: "Canal QA"
read_when:
  - You are wiring the synthetic QA transport into a local or CI test run
  - You need the bundled qa-channel config surface
  - You are iterating on end-to-end QA automation
---

`qa-channel` es un transporte de mensajes sintéticos incluido para la automatización de QA de OpenClaw. No es un canal de producción; existe para ejercer el mismo límite del complemento de canal utilizado por los transportes reales, manteniendo el estado determinista y totalmente inspeccionable.

## Lo que hace

- Gramática de destino tipo Slack:
  - `dm:<user>`
  - `channel:<room>`
  - `group:<room>`
  - `thread:<room>/<thread>`
- Las conversaciones compartidas de `channel:` y `group:` se exponen a los agentes como turnos de grupo/canal, por lo que ejercen la misma política de enrutamiento de respuesta visible y de herramientas de mensajes utilizada por Discord, Slack, Telegram y transportes similares.
- Bus sintético respaldado por HTTP para la inyección de mensajes entrantes, la captura de transcripciones salientes, la creación de hilos, las reacciones, las ediciones, las eliminaciones y las acciones de búsqueda/lectura.
- Ejecutor de autocomprobación del lado del host que escribe un informe Markdown en `.artifacts/qa-e2e/`.

## Configuración

```json
{
  "channels": {
    "qa-channel": {
      "baseUrl": "http://127.0.0.1:43123",
      "botUserId": "openclaw",
      "botDisplayName": "OpenClaw QA",
      "allowFrom": ["*"],
      "pollTimeoutMs": 1000
    }
  }
}
```

Claves de cuenta:

- `enabled` - interruptor maestro para esta cuenta.
- `name` - etiqueta de visualización opcional.
- `baseUrl` - URL del bus sintético.
- `botUserId` - id de usuario bot estilo Matrix utilizado en la gramática de destino.
- `botDisplayName` - nombre para mostrar para los mensajes salientes.
- `pollTimeoutMs` - ventana de espera de sondeo prolongado. Entero entre 100 y 30000.
- `allowFrom` - lista de permitidos de remitentes (ids de usuario o `"*"`). Los mensajes directos y
  la política de grupo permitida utilizan estos ids de remitentes sintéticos.
- `groupPolicy` - política de sala compartida: `"open"` (predeterminado), `"allowlist"`, o
  `"disabled"`.
- `groupAllowFrom` - lista de permitidos de remitentes de sala compartida opcional. Cuando se omite bajo
  `"allowlist"`, QA Channel recurre a `allowFrom`.
- `groups.<room>.requireMention` - requerir una mención del bot antes de responder en una
  sala de grupo/canal específica. `groups."*"` establece el valor predeterminado.
- `defaultTo` - destino de reserva cuando no se proporciona ninguno.
- `actions.messages` / `actions.reactions` / `actions.search` / `actions.threads` - filtrado de herramientas por acción.

Claves de múltiples cuentas en el nivel superior:

- `accounts` - registro de anulaciones con nombre por cuenta claveadas por id de cuenta.
- `defaultAccount` - id de cuenta preferida cuando hay varias configuradas.

## Runners

Autoverificación del lado del host (escribe un informe Markdown bajo `.artifacts/qa-e2e/`):

```bash
pnpm qa:e2e
```

Esto se enruta a través de `qa-lab`, inicia el bus de QA en el repositorio, carga el segmento de tiempo de ejecución incluido `qa-channel` y ejecuta una autoverificación determinista.

Suite de escenarios completos respaldados por el repositorio:

```bash
pnpm openclaw qa suite
```

Ejecuta escenarios en paralelo contra el carril de la puerta de enlace de QA. Consulte [QA overview](/es/concepts/qa-e2e-automation) para ver escenarios, perfiles y modos de proveedor.

Sitio de QA respaldado por Docker (puerta de enlace + interfaz de depuración de QA Lab en una sola pila):

```bash
pnpm qa:lab:up
```

Construye el sitio de QA, inicia la pila de puerta de enlace respaldada por Docker + QA Lab e imprime la URL del QA Lab. Desde allí puede elegir escenarios, seleccionar el carril del modelo, lanzar ejecuciones individuales y ver los resultados en vivo. El depurador QA Lab es independiente del paquete de interfaz de usuario de Control enviado.

## Related

- [QA overview](/es/concepts/qa-e2e-automation) - pila general, adaptadores de transporte, creación de escenarios
- [Matrix QA](/es/concepts/qa-matrix) - ejemplo de runner de transporte en vivo que impulsa un canal real
- [Pairing](/es/channels/pairing)
- [Groups](/es/channels/groups)
- [Channels overview](/es/channels)
