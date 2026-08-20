# Recomp 10M · App Store release

Objetivo de esta rama principal: mantener una versión publicable y verificable automáticamente antes de subirla a App Store Connect.

## Estado técnico automatizado

La CI web debe superar antes de cada entrega:

- sintaxis y manifiesto PWA;
- persistencia y fechas;
- motor de entrenamiento;
- motor nutricional;
- generación de menús de 1 a 30 días;
- simulación de 30 días de nutrición con objetivos estándar y manuales;
- simulación mensual usando el catálogo real de recetas incluido en `index.html`;
- sustituciones nutricionalmente equivalentes;
- cantidades numéricas para todos los ingredientes;
- recetas con elaboración paso a paso;
- cuatro semanas / 16 sesiones de entrenamiento simuladas;
- backup, Coach y progreso fotográfico;
- privacidad, soporte y shell offline.

La CI nativa de iOS debe:

1. ejecutarse en `macos-26`;
2. verificar un SDK iPhoneOS 26 o posterior;
3. instalar Capacitor 8;
4. ejecutar toda la suite de tests;
5. crear `www/` con los assets que irán dentro del binario;
6. generar el proyecto iOS;
7. instalar `PrivacyInfo.xcprivacy` como recurso del target;
8. compilar el esquema `App` para iOS Simulator sin firma;
9. abrir el manifiesto del `.app` generado y validar que no declara seguimiento ni recopilación.

## Identidad actual del binario

- Nombre: `Recomp 10M`
- Bundle ID configurado: `com.agusgonbel.recomp10m`
- Versión inicial del paquete: `1.0.0` (build `1`)
- iOS mínimo: `15.0`
- Categoría prevista: Health & Fitness / Salud y forma física

La fuente única de estos valores es `app-store/release.json`. El configurador los aplica al proyecto Xcode generado y la CI los valida dentro del `.app` compilado en configuración `Release`.

El Bundle ID debe coincidir exactamente con el identificador que se registre en Apple Developer y App Store Connect antes del archive final.

## URLs públicas ya preparadas

GitHub Pages publica desde `main` con HTTPS:

- App: `https://agusgonbel-code.github.io/Recomp-10/`
- Política de privacidad: `https://agusgonbel-code.github.io/Recomp-10/privacy.html`
- Soporte: `https://agusgonbel-code.github.io/Recomp-10/support.html`

La política y el soporte también son accesibles desde dentro de la propia aplicación.

## Privacidad verificada en el paquete iOS

La versión actual funciona sin cuenta y mantiene los registros de entrenamiento, nutrición, métricas y fotografías en almacenamiento local. No contiene SDK de publicidad ni analítica remota en los módulos principales. `PrivacyInfo.xcprivacy` declara sin seguimiento, sin dominios de seguimiento y sin tipos de datos recopilados por la aplicación. La CI comprueba estas claves directamente dentro del `.app` compilado.

Mientras el binario final mantenga esta arquitectura sin telemetría ni servidor, la respuesta de App Privacy debe reflejar que Recomp 10M no recopila los datos locales del usuario en servidores del desarrollador. No se debe seleccionar esta respuesta automáticamente si después se integra analítica, crash reporting, cuentas, cloud sync, publicidad o un backend.

## Metadatos preparados

`app-store/metadata.es-ES.json` contiene nombre, subtítulo, texto promocional, descripción, palabras clave, categoría, URLs y notas de revisión. Las pruebas verifican que la ficha esté completa, no contenga marcadores provisionales y respete los límites editoriales.

## Capturas de App Store preparadas

`app-store/screenshots.es-ES.json` define un guion reproducible de cinco capturas verticales para iPhone: resumen y Coach, entrenamiento, calculadora de macros, menú multidía y receta con sustitución. Cada escena enlaza con una superficie que existe en la aplicación, incluye la preparación exacta de los datos y limita la extensión del texto promocional.

Las capturas deben usar exclusivamente el perfil ficticio Alex y objetivos coherentes de 2500 kcal, 170 g de proteína, 300 g de carbohidratos y 70 g de grasas. No deben aparecer fotografías reales, nombres completos, notificaciones ni información identificable. La prueba automática también impide que el guion supere las diez capturas y comprueba que objetivo, menú y receta mantengan los cuatro macros.

## Acciones pendientes en App Store Connect

Estas acciones requieren la cuenta Apple del desarrollador y no pueden resolverse solo con el repositorio:

- crear/confirmar el App ID y Bundle ID;
- crear la ficha de App Store Connect;
- seleccionar categoría, disponibilidad y clasificación por edades;
- completar App Privacy usando el binario final;
- introducir Privacy Policy URL y Support URL;
- añadir descripción, subtítulo, palabras clave y copyright;
- producir con el binario final las capturas definidas en `app-store/screenshots.es-ES.json` y subirlas;
- completar información de revisión y contacto;
- seleccionar el build subido desde Xcode/TestFlight;
- enviar a App Review.

## Firma y subida final

El archive de distribución requiere un Apple Developer Team válido y credenciales/certificados de firma. La CI del repositorio compila sin firma para detectar errores de código y empaquetado, pero no debe almacenar certificados privados en el repositorio.

Para distribución final, desde un Mac con Xcode 26 o posterior:

```bash
npm install
npm run build:mobile
npx cap sync ios
npx cap open ios
```

En Xcode se selecciona el Team correcto, se comprueba `com.agusgonbel.recomp10m`, se incrementa versión/build si corresponde, se crea el Archive y se distribuye a App Store Connect.

## Criterio de congelación para release

No subir un build a App Store Connect si cualquiera de estos puntos está rojo:

- Recomp 10 CI;
- Recomp 10 iOS Native CI;
- GitHub Pages;
- simulación mensual de producción;
- release-readiness;
- build de simulador iOS.

Después de alcanzar verde total se permiten únicamente cambios críticos hasta completar la primera publicación.
