---
summary: "Redirigir a /plugins/sdk-channel-outbound"
title: "API de mensajes del canal"
---

Esta página se movió a [Channel outbound API](/es/plugins/sdk-channel-outbound).

`openclaw/plugin-sdk/channel-message` y
`openclaw/plugin-sdk/channel-message-runtime` siguen siendo subrutas de compatibilidad
deprecadas para complementos más antiguos. Los nuevos complementos de canal deben usar
`openclaw/plugin-sdk/channel-outbound` para los ayudantes del ciclo de vida de mensajes, recepción, envío
durable y vista previa en vivo. Las subrutas deprecadas son alias finos sobre
el núcleo de mensajes del canal compartido y las superficies del SDK de entrada/salida enfocadas;
no agregue nuevos ayudantes allí.

Plan de eliminación: mantener estos alias durante la ventana de migración de complementos externos,
luego eliminarlos en la próxima limpieza importante del SDK después de que quienes llaman hayan pasado a
`channel-outbound`.
