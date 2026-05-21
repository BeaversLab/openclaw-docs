---
summary: "Escenarios locales del canal de QA para verificaciones de flujos de trabajo de asistentes personales que preservan la privacidad."
read_when:
  - Running local personal agent reliability checks
  - Extending the repo-backed QA scenario catalog
  - Verifying reminder, reply, memory, redaction, safe tool followthrough, task status, share-safe diagnostics, and proof-backed completion claims
title: "Paquete de referencia del agente personal"
---

El Paquete de Referencia del Agente Personal es un pequeño paquete de escenarios de QA respaldado por repositorio para
flujos de trabajo de asistentes personales locales. No es una referencia de modelo genérica y no
requiere un nuevo ejecutor. El paquete reutiliza la pila de QA privada descrita en
[Resumen de QA](/es/concepts/qa-e2e-automation), el [canal de QA](/es/channels/qa-channel) sintético
y el catálogo de markdown `qa/scenarios` existente.

El primer paquete es intencionalmente limitado:

- recordatorios personales falsos mediante la entrega de cron local
- enrutamiento de respuestas de MD e hilos falsos a través de `qa-channel`
- recuerdo de preferencias falsas desde los archivos de memoria del espacio de trabajo temporal de QA
- verificaciones de secretos falsos sin eco
- seguimiento seguro de herramientas respaldadas por lectura después de un turno breve de estilo aprobación
- aprobación denegación comportamiento de detención para una solicitud de lectura local sensible
- informes de estado de tareas basados en pruebas que mantienen pendiente, bloqueado y hecho separados
- artefactos de diagnóstico seguros para compartir que mantienen el estado útil mientras omiten el contenido personal bruto
- reclamaciones de finalización respaldadas por pruebas que evitan el progreso falso antes de que existan pruebas locales

## Escenarios

Los metadatos del paquete legibles por máquina residen en
`extensions/qa-lab/src/scenario-packs.ts`. Ejecute el paquete con
`--pack personal-agent`:

```bash
OPENCLAW_ENABLE_PRIVATE_QA_CLI=1 pnpm openclaw qa suite \
  --provider-mode mock-openai \
  --pack personal-agent \
  --concurrency 1
```

`--pack` es acumulativo con banderas `--scenario` repetidas. Los escenarios explícitos se ejecutan
primero, luego los escenarios del paquete se ejecutan en orden `QA_PERSONAL_AGENT_SCENARIO_IDS` con
duplicados eliminados.

El paquete está diseñado para `qa-channel` con `mock-openai` u otro carril de proveedor de QA
local. No debe apuntarse a servicios de chat en vivo o cuentas personales
reales.

## Modelo de privacidad

Los escenarios usan solo usuarios falsos, preferencias falsas, secretos falsos y el
espacio de trabajo de la puerta de enlace de QA temporal creado por el conjunto. No deben leer ni escribir
memoria de usuario, sesiones, credenciales, agentes de lanzamiento, configuraciones globales
o estado de puerta de enlace en vivo de OpenClaw real.

Los artefactos permanecen en el directorio de artefactos del conjunto de QA existente y deben ser
tratados como salida de prueba. Las comprobaciones de redacción usan marcadores falsos para que los fallos sean seguros
de inspeccionar y archivar en problemas.

## Ampliar el paquete

Agregue nuevos casos bajo `qa/scenarios/personal/`, luego agregue el id del escenario a
`QA_PERSONAL_AGENT_SCENARIO_IDS`. Mantenga cada caso pequeño, local, determinista en
`mock-openai` y centrado en un comportamiento del asistente personal.

Buenos candidatos de seguimiento:

- comprobaciones de exportación de trayectoria redactada
- comprobaciones de flujo de trabajo de complementos solo locales

Evite agregar un nuevo ejecutor, complemento, dependencia, transporte en vivo o juez de modelo
hasta que el catálogo de escenarios tenga suficientes casos estables para justificar esa superficie.
