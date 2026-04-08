---
title: "Canal QA"
summary: "Complemento de canal de clase Slack sintético para escenarios QA de OpenClaw deterministas"
read_when:
  - You are wiring the synthetic QA transport into a local or CI test run
  - You need the bundled qa-channel config surface
  - You are iterating on end-to-end QA automation
---

# Canal QA

`qa-channel` es un transporte de mensajes sintético incluido para QA automatizada de OpenClaw.

No es un canal de producción. Existe para ejercer el mismo límite del complemento
del canal que utilizan los transportes reales, manteniendo el estado determinista y totalmente
inspeccionable.

## Lo que hace hoy

- Gramática de destino de clase Slack:
  - `dm:<user>`
  - `channel:<room>`
  - `thread:<room>/<thread>`
- Bus sintético respaldado por HTTP para:
  - inyección de mensajes entrantes
  - captura de transcripciones salientes
  - creación de hilos
  - reacciones
  - ediciones
  - eliminaciones
  - acciones de búsqueda y lectura
- Ejecutor de autoverificación del lado del host incluido que escribe un informe Markdown

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

Claves de cuenta compatibles:

- `baseUrl`
- `botUserId`
- `botDisplayName`
- `pollTimeoutMs`
- `allowFrom`
- `defaultTo`
- `actions.messages`
- `actions.reactions`
- `actions.search`
- `actions.threads`

## Ejecutor

Segmento vertical actual:

```bash
pnpm qa:e2e
```

Esto ahora se enruta a través de la extensión incluida `qa-lab`. Inicia el bus de QA
en el repositorio, arranca el segmento de tiempo de ejecución `qa-channel` incluido, ejecuta una autoverificación
determinista y escribe un informe Markdown bajo `.artifacts/qa-e2e/`.

Interfaz de usuario de depurador privada:

```bash
pnpm qa:lab:build
pnpm openclaw qa ui
```

Suite de QA completa respaldada por el repositorio:

```bash
pnpm openclaw qa suite
```

Eso inicia el depurador de QA privado en una URL local, separado del
paquete de interfaz de usuario de Control enviado.

## Alcance

El alcance actual es intencionalmente estrecho:

- bus + transporte de complementos
- gramática de enrutamiento con hilos
- acciones de mensajes propiedad del canal
- informes en Markdown

El trabajo de seguimiento añadirá:

- orquestación de OpenClaw en Docker
- ejecución de matriz de proveedor/modelo
- descubrimiento de escenarios más rico
- orquestación nativa de OpenClaw más adelante
