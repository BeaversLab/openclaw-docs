---
summary: "Comando de ubicación para nodos (location.get), modos de permiso y comportamiento en primer plano de Android"
read_when:
  - Agregar soporte de nodo de ubicación o IU de permisos
  - Diseñar permisos de ubicación de Android o comportamiento en primer plano
title: "Comando de ubicación"
---

# Comando de ubicación (nodos)

## Resumen

- `location.get` es un comando de nodo (vía `node.invoke`).
- Desactivado de forma predeterminada.
- La configuración de la aplicación de Android usa un selector: Desactivado / Mientras se usa.
- Interruptor separado: Ubicación precisa.

## Por qué un selector (y no solo un interruptor)

Los permisos del SO son multinivel. Podemos exponer un selector en la aplicación, pero el SO sigue decidiendo la concesión real.

- iOS/macOS puede exponer **Mientras se usa** o **Siempre** en los indicadores del sistema/Configuración.
- La aplicación de Android actualmente solo admite la ubicación en primer plano.
- La ubicación precisa es una concesión separada (iOS 14+ "Precisa", Android "fine" vs "coarse").

El selector en la IU impulsa nuestro modo solicitado; la concesión real vive en la configuración del SO.

## Modelo de configuración

Por dispositivo de nodo:

- `location.enabledMode`: `off | whileUsing`
- `location.preciseEnabled`: bool

Comportamiento de la IU:

- Seleccionar `whileUsing` solicita permiso en primer plano.
- Si el SO niega el nivel solicitado, vuelve al nivel más alto concedido y muestra el estado.

## Asignación de permisos (node.permissions)

Opcional. El nodo de macOS informa `location` a través del mapa de permisos; iOS/Android pueden omitirlo.

## Comando: `location.get`

Llamado a través de `node.invoke`.

Parámetros (sugeridos):

```json
{
  "timeoutMs": 10000,
  "maxAgeMs": 15000,
  "desiredAccuracy": "coarse|balanced|precise"
}
```

Carga útil de respuesta:

```json
{
  "lat": 48.20849,
  "lon": 16.37208,
  "accuracyMeters": 12.5,
  "altitudeMeters": 182.0,
  "speedMps": 0.0,
  "headingDeg": 270.0,
  "timestamp": "2026-01-03T12:34:56.000Z",
  "isPrecise": true,
  "source": "gps|wifi|cell|unknown"
}
```

Errores (códigos estables):

- `LOCATION_DISABLED`: el selector está desactivado.
- `LOCATION_PERMISSION_REQUIRED`: falta el permiso para el modo solicitado.
- `LOCATION_BACKGROUND_UNAVAILABLE`: la aplicación está en segundo plano pero solo se permite Mientras se usa.
- `LOCATION_TIMEOUT`: sin solución a tiempo.
- `LOCATION_UNAVAILABLE`: fallo del sistema / sin proveedores.

## Comportamiento en segundo plano

- La aplicación de Android niega `location.get` mientras está en segundo plano.
- Mantenga OpenClaw abierto al solicitar la ubicación en Android.
- Otras plataformas de nodos pueden diferir.

## Integración con modelo/herramientas

- Superficie de la herramienta: la herramienta `nodes` añade la acción `location_get` (se requiere nodo).
- CLI: `openclaw nodes location get --node <id>`.
- Directrices del agente: llamar solo cuando el usuario haya habilitado la ubicación y comprenda el alcance.

## Texto de la interfaz de usuario (sugerido)

- Desactivado: "El uso compartido de la ubicación está desactivado".
- Mientras se usa: "Solo cuando OpenClaw está abierto".
- Precisa: "Usar ubicación GPS precisa. Desactivar para compartir la ubicación aproximada".

import es from "/components/footer/es.mdx";

<es />
