---
summary: "Forma de automatización privada de QA para qa-lab, qa-channel, escenarios semilla e informes de protocolo"
read_when:
  - Extending qa-lab or qa-channel
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "Automatización E2E de QA"
---

# Automatización E2E de QA

La pila privada de QA está diseñada para ejercitar OpenClaw de una manera más realista,
con forma de canal, de lo que puede hacer una sola prueba unitaria.

Piezas actuales:

- `extensions/qa-channel`: canal de mensajes sintético con DM, canal, hilo,
  reacción, edición y superficies de eliminación.
- `extensions/qa-lab`: interfaz de usuario del depurador y bus de QA para observar la transcripción,
  inyectar mensajes entrantes y exportar un informe Markdown.
- `qa/`: activos semilla respaldados por repositorio para la tarea de inicio y escenarios
  de referencia de QA.

El objetivo a largo plazo es un sitio de QA de dos paneles:

- Izquierda: panel de Gateway (Interfaz de usuario de control) con el agente.
- Derecha: QA Lab, mostrando la transcripción tipo Slack y el plan de escenarios.

Eso permite que un operador o un bucle de automatización den al agente una misión de QA, observen
el comportamiento real del canal y registren lo que funcionó, falló o quedó bloqueado.

## Semillas respaldadas por repositorio

Los activos semilla viven en `qa/`:

- `qa/QA_KICKOFF_TASK.md`
- `qa/seed-scenarios.json`

Estos están intencionalmente en git para que el plan de QA sea visible tanto para humanos como para el
agente. La lista de referencia debe mantenerse lo suficientemente amplia para cubrir:

- chat de DM y canal
- comportamiento de hilos
- ciclo de vida de acciones de mensajes
- retrollamadas cron
- recuerdo de memoria
- cambio de modelo
- traspaso a subagente
- lectura de repositorio y lectura de documentos
- una pequeña tarea de compilación como Lobster Invaders

## Informes

`qa-lab` exporta un informe de protocolo Markdown desde la línea de tiempo del bus observado.
El informe debe responder:

- Qué funcionó
- Qué falló
- Qué permaneció bloqueado
- Qué escenarios de seguimiento vale la pena agregar

## Documentos relacionados

- [Pruebas](/en/help/testing)
- [Canal de QA](/en/channels/qa-channel)
- [Panel](/en/web/dashboard)
