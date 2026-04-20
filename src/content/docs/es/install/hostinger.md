---
summary: "Alojar OpenClaw en Hostinger"
read_when:
  - Setting up OpenClaw on Hostinger
  - Looking for a managed VPS for OpenClaw
  - Using Hostinger 1-Click OpenClaw
title: "Hostinger"
---

# Hostinger

Ejecute una puerta de enlace OpenClaw persistente en [Hostinger](https://www.hostinger.com/openclaw) mediante un despliegue gestionado con **un solo clic** o una instalación en **VPS**.

## Requisitos previos

- Cuenta de Hostinger ([registrarse](https://www.hostinger.com/openclaw))
- Unos 5-10 minutos

## Opción A: OpenClaw con un solo clic

La forma más rápida de comenzar. Hostinger se encarga de la infraestructura, Docker y las actualizaciones automáticas.

<Steps>
  <Step title="Comprar e iniciar">
    1. Desde la [página de OpenClaw de Hostinger](https://www.hostinger.com/openclaw), elija un plan de OpenClaw gestionado y complete el pago.

    <Note>
    Durante el pago puede seleccionar créditos de **IA lista para usar** que están precomprados e integrados instantáneamente dentro de OpenClaw; no se necesitan cuentas externas ni claves API de otros proveedores. Puede comenzar a chatear de inmediato. Alternativamente, proporcione su propia clave de Anthropic, OpenAI, Google Gemini o xAI durante la configuración.
    </Note>

  </Step>

  <Step title="Seleccionar un canal de mensajería">
    Elija uno o más canales para conectar:

    - **WhatsApp** -- escanee el código QR que se muestra en el asistente de configuración.
    - **Telegram** -- pegue el token del bot de [BotFather](https://t.me/BotFather).

  </Step>

<Step title="Completar la instalación">Haga clic en **Finalizar** para desplegar la instancia. Una vez lista, acceda al panel de OpenClaw desde **Resumen de OpenClaw** en hPanel.</Step>

</Steps>

## Opción B: OpenClaw en VPS

Más control sobre su servidor. Hostinger despliega OpenClaw a través de Docker en su VPS y usted lo gestiona mediante el **Administrador de Docker** en hPanel.

<Steps>
  <Step title="Comprar una VPS">
    1. Desde la [página de OpenClaw de Hostinger](https://www.hostinger.com/openclaw), elija un plan de OpenClaw en VPS y complete el pago.

    <Note>
    Puede seleccionar créditos de **IA lista para usar** durante el pago; estos están precomprados e integrados instantáneamente dentro de OpenClaw, por lo que puede comenzar a chatear sin ninguna cuenta externa ni claves API de otros proveedores.
    </Note>

  </Step>

  <Step title="Configurar OpenClaw">
    Una vez que el VPS esté aprovisionado, rellene los campos de configuración:

    - **Token de puerta de enlace** -- autogenerado; guárdelo para su uso posterior.
    - **Número de WhatsApp** -- su número con código de país (opcional).
    - **Token del bot de Telegram** -- de [BotFather](https://t.me/BotFather) (opcional).
    - **Claves de API** -- solo son necesarias si no seleccionó Créditos de IA listos para usar durante el proceso de compra.

  </Step>

<Step title="Iniciar OpenClaw">Haga clic en **Deploy** (Desplegar). Una vez que se esté ejecutando, abra el panel de OpenClaw desde el hPanel haciendo clic en **Open** (Abrir).</Step>

</Steps>

Los registros, reinicios y actualizaciones se gestionan directamente desde la interfaz de Docker Manager en hPanel. Para actualizar, pulse en **Update** (Actualizar) en Docker Manager y esto descargará la imagen más reciente.

## Verificar su configuración

Envíe "Hi" a su asistente en el canal que conectó. OpenClaw responderá y le guiará a través de las preferencias iniciales.

## Solución de problemas

**El panel no se carga** -- Espere unos minutos para que el contenedor termine de aprovisionarse. Compruebe los registros de Docker Manager en hPanel.

**El contenedor Docker se sigue reiniciando** -- Abra los registros de Docker Manager y busque errores de configuración (tokens faltantes, claves de API no válidas).

**El bot de Telegram no responde** -- Envíe su mensaje con el código de emparejamiento desde Telegram directamente como un mensaje dentro de su chat de OpenClaw para completar la conexión.

## Siguientes pasos

- [Canales](/es/channels) -- conecte Telegram, WhatsApp, Discord y más
- [Configuración de la puerta de enlace](/es/gateway/configuration) -- todas las opciones de configuración
