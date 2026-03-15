---
summary: "Comando de ubicación para nodos (location.get), modos de permiso y comportamiento en primer plano de Android"
read_when:
  - Adding location node support or permissions UI
  - Designing Android location permissions or foreground behavior
title: "Comando de ubicación"
---

# Comando de ubicación (nodos)

## TL;DR

- `location.get` es un comando de nodo (vía `node.invoke`).
- Desactivado por defecto.
- Los ajustes de la aplicación de Android usan un selector: Desactivado / Mientras se usa.
- Interruptor separado: Ubicación precisa.

## Por qué un selector (no solo un interruptor)

Los permisos del SO son multinivel. Podemos exponer un selector en la aplicación, pero el SO aún decide la concesión real.

- iOS/macOS puede exponer **Mientras se usa** o **Siempre** en los indicadores del sistema/ajustes.
- La aplicación de Android actualmente solo admite ubicación en primer plano.
- La ubicación precisa es una concesión separada (iOS 14+ “Precise”, Android “fine” vs “coarse”).

El selector en la IU controla nuestro modo solicitado; la concesión real reside en los ajustes del SO.

## Modelo de ajustes

Por dispositivo de nodo:

- `location.enabledMode`: `off | whileUsing`
- `location.preciseEnabled`: bool

Comportamiento de la IU:

- Seleccionar `whileUsing` solicita permiso en primer plano.
- Si el SO deniega el nivel solicitado, volver al nivel más alto concedido y mostrar el estado.

## Asignación de permisos (node.permissions)

Opcional. El nodo macOS informa `location` a través del mapa de permisos; iOS/Android pueden omitirlo.

## Comando: `location.get`

Llamado vía `node.invoke`.

Parámetros (sugeridos):

```json
{
  "timeoutMs": 10000,
  "maxAgeMs": 15000,
  "desiredAccuracy": "coarse|balanced|precise"
}
```

Respuesta:

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
- `LOCATION_TIMEOUT`: sin fijación a tiempo.
- `LOCATION_UNAVAILABLE`: fallo del sistema / sin proveedores.

## Comportamiento en segundo plano

- La aplicación de Android deniega `location.get` mientras está en segundo plano.
- Mantenga OpenClaw abierto al solicitar la ubicación en Android.
- Otras plataformas de nodos pueden diferir.

## Integración con modelo/herramientas

- Superficie de la herramienta: la herramienta `nodes` añade la acción `location_get` (se requiere nodo).
- CLI: `openclaw nodes location get --node <id>`.
- Directrices del agente: solo llamar cuando el usuario haya activado la ubicación y entienda el alcance.

## Texto de UX (sugerido)

- Desactivado: “El uso compartido de ubicación está desactivado.”
- Mientras se usa: “Solo cuando OpenClaw está abierto.”
- Precisa: “Usar ubicación GPS precisa. Desactívela para compartir la ubicación aproximada.”

import es from "/components/footer/es.mdx";

<es />
