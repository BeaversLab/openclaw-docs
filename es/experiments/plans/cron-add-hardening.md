---
summary: "Fortalecer el manejo de entrada de cron.add, alinear esquemas y mejorar las herramientas de interfaz de usuario/agente de cron"
owner: "openclaw"
status: "complete"
last_updated: "2026-01-05"
title: "Fortalecimiento de Cron Add"
---

# Fortalecimiento de Cron Add y Alineación de Esquemas

## Contexto

Los registros recientes de la puerta de enlace muestran fallos repetidos de `cron.add` con parámetros no válidos (faltan `sessionTarget`, `wakeMode`, `payload` y `schedule` malformados). Esto indica que al menos un cliente (probablemente la ruta de la llamada a la herramienta del agente) está enviando cargas útiles de trabajo envueltas o especificadas parcialmente. Por separado, existe una deriva entre las enumeraciones de proveedores de cron en TypeScript, el esquema de la puerta de enlace, los indicadores de la CLI y los tipos de formularios de la interfaz de usuario, además de una discrepancia en la interfaz de usuario para `cron.status` (espera `jobCount` mientras que la puerta de enlace devuelve `jobs`).

## Objetivos

- Detener el spam de `cron.add` INVALID_REQUEST normalizando las cargas útiles de envoltura comunes e infiriendo los campos `kind` que faltan.
- Alinear las listas de proveedores de cron en el esquema de la puerta de enlace, los tipos de cron, la documentación de la CLI y los formularios de la interfaz de usuario.
- Hacer explícito el esquema de la herramienta cron del agente para que el LLM produzca cargas útiles de trabajo correctas.
- Corregir la visualización del recuento de trabajos de estado de cron en la interfaz de usuario de Control.
- Añadir pruebas para cubrir la normalización y el comportamiento de la herramienta.

## No objetivos

- Cambiar la semántica de programación de cron o el comportamiento de ejecución del trabajo.
- Añadir nuevos tipos de programación o análisis de expresiones de cron.
- Revisar completamente la interfaz de usuario/experiencia de usuario para cron más allá de las correcciones de campo necesarias.

## Hallazgos (brechas actuales)

- `CronPayloadSchema` en la puerta de enlace excluye `signal` + `imessage`, mientras que los tipos de TS los incluyen.
- CronStatus de la interfaz de usuario de Control espera `jobCount`, pero la puerta de enlace devuelve `jobs`.
- El esquema de la herramienta cron del agente permite objetos `job` arbitrarios, lo que permite entradas malformadas.
- La puerta de enlace valida estrictamente `cron.add` sin normalización, por lo que las cargas útiles envueltas fallan.

## Qué cambió

- `cron.add` y `cron.update` ahora normalizan formas de envoltura comunes e infieren campos `kind` que faltan.
- El esquema de la herramienta de cron del agente coincide con el esquema de la puerta de enlace, lo que reduce las cargas útiles no válidas.
- Los enumeradores del proveedor están alineados en la puerta de enlace, la CLI, la interfaz de usuario y el selector de macOS.
- La interfaz de usuario de Control utiliza el campo de recuento `jobs` de la puerta de enlace para el estado.

## Comportamiento actual

- **Normalización:** se desempaquetan las cargas úticas encapsuladas `data`/`job`; se infieren `schedule.kind` y `payload.kind` cuando es seguro.
- **Valores predeterminados:** se aplican valores predeterminados seguros para `wakeMode` y `sessionTarget` cuando faltan.
- **Proveedores:** Discord/Slack/Signal/iMessage ahora se muestran de manera consistente en la CLI y la interfaz de usuario.

Consulte [Cron jobs](/es/automation/cron-jobs) para obtener la forma normalizada y los ejemplos.

## Verificación

- Supervise los registros de la puerta de enlace para ver si se reducen los errores `cron.add` INVALID_REQUEST.
- Confirme que el estado de cron en la interfaz de usuario de Control muestra el recuento de trabajos después de actualizar.

## Seguimientos opcionales

- Prueba manual de humo en la interfaz de usuario de Control: agregue un trabajo de cron por proveedor y verifique el recuento de trabajos de estado.

## Preguntas abiertas

- ¿Debe `cron.add` aceptar `state` explícitos de los clientes (actualmente no permitido por el esquema)?
- ¿Deberíamos permitir `webchat` como proveedor de entrega explícito (actualmente filtrado en la resolución de entrega)?

import es from "/components/footer/es.mdx";

<es />
