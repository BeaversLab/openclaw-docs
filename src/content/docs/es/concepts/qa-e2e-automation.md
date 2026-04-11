---
summary: "Forma de automatización de QA privada para qa-lab, qa-channel, escenarios con semilla e informes de protocolo"
read_when:
  - Extending qa-lab or qa-channel
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "Automatización de QA E2E"
---

# Automatización E2E de QA

La pila privada de QA está diseñada para ejercitar OpenClaw de una manera más realista,
con forma de canal, de lo que puede hacer una sola prueba unitaria.

Piezas actuales:

- `extensions/qa-channel`: canal de mensajes sintético con MD, canal, hilo,
  reacción, editar y eliminar superficies.
- `extensions/qa-lab`: depurador de interfaz de usuario y bus de QA para observar la transcripción,
  inyectar mensajes entrantes y exportar un informe Markdown.
- `qa/`: activos semilla con respaldo en repositorio para la tarea de inicio y línea base de QA
  escenarios.

El flujo actual del operador de QA es un sitio de QA de dos paneles:

- Izquierda: panel de Gateway (Interfaz de usuario de control) con el agente.
- Derecha: QA Lab, mostrando la transcripción tipo Slack y el plan de escenarios.

Ejecútelo con:

```bash
pnpm qa:lab:up
```

Eso construye el sitio de QA, inicia el carril de puerta de enlace respaldado por Docker y expone la
página QA Lab donde un operador o bucle de automatización puede dar al agente una misión de QA,
observar el comportamiento real del canal y registrar lo que funcionó, falló o
se mantuvo bloqueado.

Para una iteración más rápida de la interfaz de usuario de QA Lab sin reconstruir la imagen de Docker cada vez,
inicie la pila con un paquete QA Lab montado con bind:

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` mantiene los servicios de Docker en una imagen preconstruida y monta con bind
`extensions/qa-lab/web/dist` en el contenedor `qa-lab`. `qa:lab:watch`
reconstruye ese paquete con cada cambio y el navegador se recarga automáticamente cuando el hash del activo
de QA Lab cambia.

## Semillas con respaldo en repositorio

Los activos semilla viven en `qa/`:

- `qa/scenarios/index.md`
- `qa/scenarios/*.md`

Estos están intencionalmente en git para que el plan de QA sea visible tanto para humanos como para el
agente. La lista base debe mantenerse lo suficientemente amplia para cubrir:

- Chat de MD y canal
- comportamiento del hilo
- ciclo de vida de la acción del mensaje
- llamadas cron (callbacks)
- recuerdo de memoria
- cambio de modelo
- transferencia a subagente
- lectura de repositorio y lectura de documentos
- una pequeña tarea de compilación como Lobster Invaders

## Informes

`qa-lab` exporta un informe de protocolo Markdown desde la línea de tiempo del bus observado.
El informe debe responder:

- Qué funcionó
- Qué falló
- Qué se mantuvo bloqueado
- Qué escenarios de seguimiento vale la pena agregar

## Documentos relacionados

- [Pruebas](/en/help/testing)
- [Canal QA](/en/channels/qa-channel)
- [Panel](/en/web/dashboard)
