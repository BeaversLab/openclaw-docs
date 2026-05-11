---
summary: "Plan integral de modernización de aplicaciones con actualizaciones de habilidades de entrega de frontend"
title: "Plan de modernización de aplicaciones"
read_when:
  - Planning a broad OpenClaw application modernization pass
  - Updating frontend implementation standards for app or Control UI work
  - Turning a broad product quality review into phased engineering work
---

# Plan de modernización de aplicaciones

## Objetivo

Mover la aplicación hacia un producto más limpio, rápido y mantenible sin
interrumpir los flujos de trabajo actuales ni ocultar riesgos en refactorizaciones amplias. El trabajo debe
entregarse en porciones pequeñas y revisables con pruebas para cada superficie tocada.

## Principios

- Conservar la arquitectura actual a menos que un límite esté causando demostrablemente agitación,
  costo de rendimiento o errores visibles para el usuario.
- Preferir el parche correcto más pequeño para cada problema, luego repetir.
- Separar las correcciones requeridas del pulido opcional para que los mantenedores puedan entregar trabajo de
  alto valor sin esperar decisiones subjetivas.
- Mantener el comportamiento orientado a complementos documentado y compatible con versiones anteriores.
- Verificar el comportamiento enviado, los contratos de dependencia y las pruebas antes de afirmar que una
  regresión está solucionada.
- Mejorar primero la ruta del usuario principal: incorporación, autenticación, chat, configuración del proveedor,
  gestión de complementos y diagnósticos.

## Fase 1: Auditoría de referencia

Inventariar la aplicación actual antes de cambiarla.

- Identificar los principales flujos de trabajo del usuario y las superficies de código que los poseen.
- Enumerar prestaciones muertas, configuraciones duplicadas, estados de error poco claros y rutas de
  renderizado costosas.
- Capturar los comandos de validación actuales para cada superficie.
- Marcar los problemas como requeridos, recomendados u opcionales.
- Documentar los bloqueadores conocidos que necesitan revisión del propietario, especialmente cambios en la API, seguridad,
  lanzamiento y contratos de complementos.

Definición de terminado:

- Una lista de problemas con referencias a archivos en la raíz del repositorio.
- Cada problema tiene gravedad, superficie propietaria, impacto esperado en el usuario y una ruta de
  validación propuesta.
- No se mezclan elementos de limpieza especulativos con las correcciones requeridas.

## Fase 2: Limpieza del producto y la experiencia de usuario

Priorizar los flujos de trabajo visibles y eliminar la confusión.

- Ajustar los textos de incorporación y los estados vacíos alrededor de la autenticación del modelo, el estado de la puerta de enlace
  y la configuración de complementos.
- Eliminar o deshabilitar las prestaciones muertas donde no sea posible realizar ninguna acción.
- Mantener las acciones importantes visibles en todos los anchos adaptables en lugar de ocultarlas
  detrás de suposiciones de diseño frágiles.
- Consolidar el lenguaje de estado repetido para que los errores tengan una única fuente de verdad.
- Añade divulgación progresiva para la configuración avanzada manteniendo la configuración central rápida.

Validación recomendada:

- Camino feliz manual para la configuración de primer uso y el inicio de usuario existente.
- Pruebas centradas en cualquier lógica de enrutamiento, persistencia de configuración o derivación de estado.
- Capturas de pantalla del navegador para las superficies adaptables cambiadas.

## Fase 3: Ajuste de la arquitectura del frontend

Mejorar la mantenibilidad sin una reescritura amplia.

- Mover las transformaciones de estado de la interfaz de usuario repetidas a asistentes tipados estrechos.
- Mantener las responsabilidades de obtención de datos, persistencia y presentación separadas.
- Preferir los hooks, tiendas y patrones de componentes existentes sobre nuevas abstracciones.
- Dividir los componentes sobredimensionados solo cuando reduzca el acoplamiento o aclare las pruebas.
- Evitar introducir un estado global amplio para las interacciones de panel local.

Salvaguardas requeridas:

- No cambiar el comportamiento público como efecto secundario de la división de archivos.
- Mantener intacto el comportamiento de accesibilidad para menús, diálogos, pestañas y navegación por teclado.
- Verificar que los estados de carga, vacío, error y optimista aún se procesen.

## Fase 4: Rendimiento y confiabilidad

Apuntar al dolor medido en lugar de a la optimización teórica amplia.

- Medir los costos de inicio, transición de ruta, lista grande y transcripción de chat.
- Reemplazar los datos derivados costosos repetidos con selectores memorizados o asistentes en caché donde el perfilado demuestre valor.
- Reducir los escaneos evitables de red o sistema de archivos en rutas críticas.
- Mantener un orden determinista para las entradas de aviso, registro, archivo, complemento y red antes de la construcción de la carga útil del modelo.
- Agregar pruebas de regresión ligeras para asistentes críticos y límites del contrato.

Definición de terminado:

- Cada cambio de rendimiento registra la línea de base, el impacto esperado, el impacto real y la brecha restante.
- Ningún parche de rendimiento se implementa solo basado en la intuición cuando hay una medición económica disponible.

## Fase 5: Endurecimiento de tipos, contratos y pruebas

Mejorar la corrección en los puntos de límite de los que dependen los usuarios y los autores de complementos.

- Reemplazar cadenas sueltas en tiempo de ejecución con uniones discriminadas o listas de código cerradas.
- Validar las entradas externas con los asistentes de esquema existentes o zod.
- Agregar pruebas de contrato alrededor de los manifiestos de complementos, catálogos de proveedores, mensajes del protocolo de puerta de enlace y el comportamiento de migración de configuración.
- Mantener las rutas de compatibilidad en los flujos de doctor o reparación en lugar de migraciones ocultas en el momento de inicio.
- Evite el acoplamiento solo de pruebas con los internos del complemento; use fachadas del SDK y barriles documentados.

Validación recomendada:

- `pnpm check:changed`
- Pruebas dirigidas para cada límite modificado.
- `pnpm build` cuando cambien los límites diferidos (lazy boundaries), el empaquetado o las superficies publicadas.

## Fase 6: Documentación y preparación para el lanzamiento

Mantenga la documentación orientada al usuario alineada con el comportamiento.

- Actualice la documentación con cambios en el comportamiento, la API, la configuración, el incorporamiento (onboarding) o los complementos.
- Agregue entradas al registro de cambios (changelog) solo para cambios visibles para el usuario.
- Mantenga la terminología de los complementos orientada al usuario; use los nombres de los paquetes internos solo donde sea necesario para los contribuidores.
- Confirme que las instrucciones de lanzamiento e instalación todavía coinciden con la superficie de comandos actual.

Definición de terminado:

- La documentación relevante se actualiza en la misma rama que los cambios de comportamiento.
- Las comprobaciones de documentación generada o de deriva de API (API drift) pasan cuando se modifican.
- La entrega nombra cualquier validación omitida y por qué se omitió.

## Primera porción recomendada

Comience con un pase de Control UI y de incorporamiento (onboarding) con alcance:

- Audite la configuración de primera ejecución, la preparación de autenticación del proveedor, el estado de la puerta de enlace (gateway) y las superficies de configuración del complemento.
- Elimine las acciones muertas y aclare los estados de falla.
- Agregue o actualice pruebas enfocadas para la derivación de estado y la persistencia de la configuración.
- Ejecute `pnpm check:changed`.

Esto proporciona un alto valor para el usuario con un riesgo arquitectónico limitado.

## Actualización de habilidades de Frontend

Use esta sección para actualizar la `SKILL.md` enfocada en frontend suministrada con la tarea de modernización. Si adopta esta guía como una habilidad de OpenClaw local en el repositorio, cree `.agents/skills/openclaw-frontend/SKILL.md` primero, mantenga el frontmatter que pertenece a esa habilidad de destino, y luego agregue o reemplace la guía del cuerpo con el siguiente contenido.

```markdown
# Frontend Delivery Standards

Use this skill when implementing or reviewing user-facing React, Next.js,
desktop webview, or app UI work.

## Operating rules

- Start from the existing product workflow and code conventions.
- Prefer the smallest correct patch that improves the current user path.
- Separate required fixes from optional polish in the handoff.
- Do not build marketing pages when the request is for an application surface.
- Keep actions visible and usable across supported viewport sizes.
- Remove dead affordances instead of leaving controls that cannot act.
- Preserve loading, empty, error, success, and permission states.
- Use existing design-system components, hooks, stores, and icons before adding
  new primitives.

## Implementation checklist

1. Identify the primary user task and the component or route that owns it.
2. Read the local component patterns before editing.
3. Patch the narrowest surface that solves the issue.
4. Add responsive constraints for fixed-format controls, toolbars, grids, and
   counters so text and hover states cannot resize the layout unexpectedly.
5. Keep data loading, state derivation, and rendering responsibilities clear.
6. Add tests when logic, persistence, routing, permissions, or shared helpers
   change.
7. Verify the main happy path and the most relevant edge case.

## Visual quality gates

- Text must fit inside its container on mobile and desktop.
- Toolbars may wrap, but controls must remain reachable.
- Buttons should use familiar icons when the icon is clearer than text.
- Cards should be used for repeated items, modals, and framed tools, not for
  every page section.
- Avoid one-note color palettes and decorative backgrounds that compete with
  operational content.
- Dense product surfaces should optimize for scanning, comparison, and repeated
  use.

## Handoff format

Report:

- What changed.
- What user behavior changed.
- Required validation that passed.
- Any validation skipped and the concrete reason.
- Optional follow-up work, clearly separated from required fixes.
```
