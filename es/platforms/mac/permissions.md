---
summary: "Persistencia de los permisos de macOS (TCC) y requisitos de firma"
read_when:
  - Depuración de indicaciones de permisos de macOS faltantes o bloqueadas
  - Empaquetado o firma de la aplicación macOS
  - Cambio de IDs de paquete o rutas de instalación de la aplicación
title: "Permisos de macOS"
---

# Permisos de macOS (TCC)

Las concesiones de permisos de macOS son frágiles. TCC asocia una concesión de permiso con la
firma del código de la aplicación, el identificador del paquete y la ruta en disco. Si alguno de esos cambia,
macOS trata la aplicación como nueva y puede eliminar u ocultar las indicaciones.

## Requisitos para permisos estables

- Misma ruta: ejecute la aplicación desde una ubicación fija (para OpenClaw, `dist/OpenClaw.app`).
- Mismo identificador de paquete: cambiar el ID del paquete crea una nueva identidad de permiso.
- Aplicación firmada: las compilaciones sin firmar o con firma ad-hoc no conservan los permisos.
- Firma coherente: utilice un certificado real de desarrollo de Apple o de ID de desarrollador
  para que la firma se mantenga estable entre compilaciones.

Las firmas ad-hoc generan una nueva identidad en cada compilación. macOS olvidará las
concesiones anteriores y las indicaciones pueden desaparecer por completo hasta que se borren las entradas obsoletas.

## Lista de verificación de recuperación cuando desaparecen las indicaciones

1. Cierre la aplicación.
2. Elimine la entrada de la aplicación en Configuración del sistema -> Privacidad y seguridad.
3. Vuelva a iniciar la aplicación desde la misma ruta y vuelva a otorgar los permisos.
4. Si la indicación aún no aparece, restablezca las entradas de TCC con `tccutil` e inténtelo de nuevo.
5. Algunos permisos solo reaparecen después de un reinicio completo de macOS.

Restablecimientos de ejemplo (reemplace el ID del paquete según sea necesario):

```bash
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
sudo tccutil reset AppleEvents
```

## Permisos de archivos y carpetas (Escritorio/Documentos/Descargas)

macOS también puede restringir el Escritorio, Documentos y Descargas para procesos de terminal/en segundo plano. Si las lecturas de archivos o las listas de directorios se bloquean, otorgue acceso al mismo contexto de proceso que realiza las operaciones de archivos (por ejemplo, Terminal/iTerm, aplicación iniciada por LaunchAgent o proceso SSH).

Solución alternativa: mueva los archivos al espacio de trabajo de OpenClaw (`~/.openclaw/workspace`) si desea evitar las concesiones por carpeta.

Si está probando permisos, firme siempre con un certificado real. Las compilaciones
ad-hoc solo son aceptables para ejecuciones locales rápidas donde los permisos no importan.

import es from "/components/footer/es.mdx";

<es />
