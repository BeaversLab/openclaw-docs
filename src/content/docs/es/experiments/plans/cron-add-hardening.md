---
summary: "Endurecer el manejo de entrada de cron.add, alinear esquemas y mejorar la herramienta/interfaz de usuario de cron"
owner: "openclaw"
status: "completo"
last_updated: "2026-01-05"
title: "Endurecimiento de Cron Add"
---

# Endurecimiento de Cron Add y Alineación de Esquema

## Contexto

Los registros recientes de la pasarela muestran fallos repetidos de `cron.add` con parámetros no válidos (faltan `sessionTarget`, `wakeMode`, `payload` y `schedule` malformado). Esto indica que al menos un cliente (probablemente la ruta de llamada de la herramienta del agente) está enviando cargas útiles de trabajo envueltas o especificadas parcialmente. Por separado, existe una discrepancia entre los enums de proveedores de cron en TypeScript, el esquema de la pasarela, las banderas de la CLI y los tipos de formularios de la interfaz de usuario, además de una discordancia en la interfaz de usuario para `cron.status` (espera `jobCount` mientras que la pasarela devuelve `jobs`).

## Objetivos

- Detener el spam de INVALID_REQUEST de `cron.add` normalizando las cargas útiles de contenedor comunes e infiriendo los campos `kind` faltantes.
- Alinear las listas de proveedores de cron en el esquema de la pasarela, los tipos de cron, la documentación de la CLI y los formularios de la interfaz de usuario.
- Hacer explícito el esquema de la herramienta de cron del agente para que el LLM produzca cargas útiles de trabajo correctas.
- Corregir la visualización del recuento de trabajos de estado de cron en la interfaz de usuario de Control.
- Agregar pruebas para cubrir la normalización y el comportamiento de la herramienta.

## No objetivos

- Cambiar la semántica de programación de cron o el comportamiento de ejecución del trabajo.
- Agregar nuevos tipos de programación o análisis de expresiones de cron.
- Rediseñar la interfaz de usuario/experiencia de usuario de cron más allá de las correcciones de campo necesarias.

## Hallazgos (brechas actuales)

- `CronPayloadSchema` en la pasarela excluye `signal` + `imessage`, mientras que los tipos de TS los incluyen.
- CronStatus de la interfaz de usuario de Control espera `jobCount`, pero la pasarela devuelve `jobs`.
- El esquema de la herramienta de cron del agente permite objetos `job` arbitrarios, lo que permite entradas malformadas.
- La pasarela valida estrictamente `cron.add` sin normalización, por lo que las cargas útiles envueltas fallan.

## Qué cambió

- `cron.add` y `cron.update` ahora normalizan formas comunes de envoltorios e infieren campos `kind` faltantes.
- El esquema de la herramienta de cron del agente coincide con el esquema de la puerta de enlace, lo que reduce las cargas útiles no válidas.
- Los enums del proveedor están alineados en la puerta de enlace, la CLI, la interfaz de usuario y el selector de macOS.
- La interfaz de usuario de Control utiliza el campo de recuento `jobs` de la puerta de enlace para el estado.

## Comportamiento actual

- **Normalización:** las cargas útiles envueltas `data`/`job` se desenvuelven; `schedule.kind` y `payload.kind` se infieren cuando es seguro.
- **Valores predeterminados:** se aplican valores predeterminados seguros para `wakeMode` y `sessionTarget` cuando faltan.
- **Proveedores:** Discord/Slack/Signal/iMessage ahora se muestran de manera consistente en la CLI/interfaz de usuario.

Consulte [Cron jobs](/es/automation/cron-jobs) para obtener la forma normalizada y ejemplos.

## Verificación

- Observe los registros de la puerta de enlace para ver si hay reducidos errores `cron.add` INVALID_REQUEST.
- Confirme que el estado de cron de la interfaz de usuario de Control muestra el recuento de trabajos después de actualizar.

## Seguimientos opcionales

- Prueba de humo manual de la interfaz de usuario de Control: agregue un trabajo de cron por proveedor + verifique el recuento de trabajos de estado.

## Preguntas abiertas

- ¿Debe `cron.add` aceptar `state` explícitos de los clientes (actualmente no permitido por el esquema)?
- ¿Debemos permitir `webchat` como proveedor de entrega explícito (actualmente filtrado en la resolución de entrega)?
