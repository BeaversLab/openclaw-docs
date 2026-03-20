---
summary: "Validación estricta de configuración + migraciones solo de doctor"
read_when:
  - Diseñar o implementar el comportamiento de validación de configuración
  - Trabajar en migraciones de configuración o flujos de trabajo de doctor
  - Manejo de esquemas de configuración de complementos o bloqueo de carga de complementos
title: "Validación Estricta de Configuración"
---

# Validación estricta de configuración (migraciones solo de doctor)

## Objetivos

- **Rechazar claves de configuración desconocidas en todas partes** (raíz + anidadas), excepto los metadatos raíz `$schema`.
- **Rechazar la configuración del complemento sin un esquema**; no cargar ese complemento.
- **Eliminar la auto-migración heredada al cargar**; las migraciones se ejecutan solo a través de doctor.
- **Ejecutar doctor automáticamente (simulación) al inicio**; si no es válido, bloquear comandos no de diagnóstico.

## No objetivos

- Compatibilidad con versiones anteriores al cargar (las claves heredadas no se migran automáticamente).
- Eliminaciones silenciosas de claves no reconocidas.

## Reglas de validación estrictas

- La configuración debe coincidir exactamente con el esquema en cada nivel.
- Las claves desconocidas son errores de validación (no hay paso a través en la raíz o anidado), excepto `$schema` raíz cuando es una cadena.
- `plugins.entries.<id>.config` debe ser validado por el esquema del complemento.
  - Si a un complemento le falta un esquema, **rechazar la carga del complemento** y mostrar un error claro.
- Las claves `channels.<id>` desconocidas son errores a menos que un manifiesto de complemento declare el id del canal.
- Los manifiestos de complementos (`openclaw.plugin.json`) son obligatorios para todos los complementos.

## Cumplimiento del esquema del complemento

- Cada complemento proporciona un esquema JSON estricto para su configuración (en línea en el manifiesto).
- Flujo de carga del complemento:
  1. Resolver el manifiesto del complemento + esquema (`openclaw.plugin.json`).
  2. Validar la configuración contra el esquema.
  3. Si falta esquema o configuración no válida: bloquear la carga del complemento, registrar el error.
- El mensaje de error incluye:
  - Id del complemento
  - Razón (falta esquema / configuración no válida)
  - Ruta(s) que fallaron la validación
- Los complementos deshabilitados mantienen su configuración, pero Doctor + registros muestran una advertencia.

## Flujo de Doctor

- Doctor se ejecuta **cada vez** que se carga la configuración (simulación por defecto).
- Si la configuración no es válida:
  - Imprimir un resumen + errores accionables.
  - Instruir: `openclaw doctor --fix`.
- `openclaw doctor --fix`:
  - Aplica migraciones.
  - Elimina claves desconocidas.
  - Escribe la configuración actualizada.

## Bloqueo de comandos (cuando la configuración no es válida)

Permitido (solo diagnóstico):

- `openclaw doctor`
- `openclaw logs`
- `openclaw health`
- `openclaw help`
- `openclaw status`
- `openclaw gateway status`

Todo lo demás debe fallar estrictamente con: “Config no válida. Ejecute `openclaw doctor --fix`.”

## Formato de UX de error

- Un único encabezado de resumen.
- Secciones agrupadas:
  - Claves desconocidas (rutas completas)
  - Claves heredadas / migraciones necesarias
  - Fallos de carga de complementos (id del complemento + motivo + ruta)

## Puntos de contacto de la implementación

- `src/config/zod-schema.ts`: eliminar el paso a través de la raíz; objetos estrictos en todas partes.
- `src/config/zod-schema.providers.ts`: asegurar esquemas estrictos de canales.
- `src/config/validation.ts`: fallar en claves desconocidas; no aplicar migraciones heredadas.
- `src/config/io.ts`: eliminar auto-migraciones heredadas; ejecutar siempre doctor en modo de prueba (dry-run).
- `src/config/legacy*.ts`: mover el uso solo a doctor.
- `src/plugins/*`: agregar registro de esquemas + bloqueo.
- Bloqueo de comandos CLI en `src/cli`.

## Pruebas

- Rechazo de clave desconocida (raíz + anidada).
- Falta de esquema del complemento → carga del complemento bloqueada con error claro.
- Config no válida → inicio de la puerta de enlace bloqueado excepto comandos de diagnóstico.
- Doctor dry-run automático; `doctor --fix` escribe la config corregida.

import en from "/components/footer/en.mdx";

<en />
