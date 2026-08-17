# Recomp 10M · App Privacy (preparación)

Este documento describe la arquitectura actual y sirve como control previo. La respuesta definitiva debe revisarse contra el binario exacto que se suba a App Store Connect.

## Arquitectura actual

- No hay registro ni cuenta de usuario.
- Los entrenamientos se guardan localmente.
- Las comidas y menús se guardan localmente.
- Las métricas corporales se guardan localmente.
- Las fotografías de progreso se guardan localmente.
- No hay SDK de publicidad en el runtime principal.
- No hay analítica remota en los módulos principales.
- No hay backend de Recomp 10M recibiendo estos registros.
- La exportación crea un archivo que controla el usuario.

## Respuesta prevista si el binario final conserva exactamente esta arquitectura

App Store Connect → App Privacy → Data Collection:

**No, we do not collect data from this app.**

Motivo: los datos que el usuario introduce o genera permanecen en el dispositivo y no son transmitidos al desarrollador ni a terceros para su recogida.

## Obligación de reabrir esta revisión

Cambiar la respuesta anterior antes de publicar si se añade cualquiera de estos elementos:

- analítica o crash reporting remoto;
- autenticación o cuentas;
- sincronización en la nube;
- backend de recetas/perfiles;
- publicidad;
- SDK de terceros que recopile información;
- telemetría;
- envío automático de fotos, métricas, nutrición o entrenamientos.

## Política y soporte

- Política: `https://agusgonbel-code.github.io/Recomp-10/privacy.html`
- Soporte: `https://agusgonbel-code.github.io/Recomp-10/support.html`

La política debe mantenerse coherente con el binario y con las respuestas de App Privacy.
