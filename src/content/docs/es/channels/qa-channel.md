---
summary: "Complemento de canal sintético tipo Slack para escenarios QA de OpenClaw deterministas"
title: "Canal QA"
read_when:
  - You are wiring the synthetic QA transport into a local or CI test run
  - You need the bundled qa-channel config surface
  - You are iterating on end-to-end QA automation
---

`qa-channel` es un transporte de mensajes sintético incluido para QA automatizada de OpenClaw. No es un canal de producción; existe para ejercer el mismo límite del complemento de canal que utilizan los transportes reales, manteniendo el estado determinista y totalmente inspeccionable.

## Lo que hace

- Gramática de destino tipo Slack:
  - `dm:<user>`
  - `channel:<room>`
  - `thread:<room>/<thread>`
- Bus sintético respaldado por HTTP para la inyección de mensajes entrantes, la captura de transcripciones salientes, la creación de hilos, reacciones, ediciones, eliminaciones y acciones de búsqueda/lectura.
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

- `enabled` — interruptor maestro para esta cuenta.
- `name` — etiqueta de visualización opcional.
- `baseUrl` — URL del bus sintético.
- `botUserId` — id de usuario de bot estilo Matrix utilizado en la gramática de destino.
- `botDisplayName` — nombre para mostrar para mensajes salientes.
- `pollTimeoutMs` — ventana de espera de sondeo prolongado. Entero entre 100 y 30000.
- `allowFrom` — lista de permitidos de remitentes (ids de usuario o `"*"`).
- `defaultTo` — destino de reserva cuando no se proporciona ninguno.
- `actions.messages` / `actions.reactions` / `actions.search` / `actions.threads` — habilitación de herramientas por acción.

Claves multicuenta en el nivel superior:

- `accounts` — registro de anulaciones por cuenta con nombre claveadas por id de cuenta.
- `defaultAccount` — id de cuenta preferida cuando hay varias configuradas.

## Ejecutores

Autocomprobación del lado del host (escribe un informe Markdown en `.artifacts/qa-e2e/`):

```bash
pnpm qa:e2e
```

Esto se enruta a través de `qa-lab`, inicia el bus QA en el repositorio, carga el segmento de tiempo de ejecución `qa-channel` incluido y ejecuta una autocomprobación determinista.

Suite de escenarios completa respaldada por el repositorio:

```bash
pnpm openclaw qa suite
```

Ejecuta escenarios en paralelo contra el carril de la puerta de enlace de QA. Consulte la [visión general de QA](/es/concepts/qa-e2e-automation) para obtener información sobre escenarios, perfiles y modos de proveedor.

Sitio de QA con respaldo de Docker (puerta de enlace + interfaz de usuario de depuración de QA Lab en una sola pila):

```bash
pnpm qa:lab:up
```

Construye el sitio de QA, inicia la pila de puerta de enlace con respaldo de Docker + QA Lab e imprime la URL de QA Lab. Desde allí puede seleccionar escenarios, elegir el carril del modelo, lanzar ejecuciones individuales y ver los resultados en vivo. El depurador de QA Lab es independiente del paquete de interfaz de usuario de Control enviado.

## Relacionado

- [Visión general de QA](/es/concepts/qa-e2e-automation) — pila general, adaptadores de transporte, creación de escenarios
- [Matrix QA](/es/concepts/qa-matrix) — ejemplo de ejecutor de transporte en vivo que impulsa un canal real
- [Emparejamiento](/es/channels/pairing)
- [Grupos](/es/channels/groups)
- [Visión general de canales](/es/channels)
