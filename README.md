# Recomp 10M

Plataforma privada de recomposición corporal, entrenamiento, nutrición y progreso compatible con GitHub Pages.

## Novedades
- Interfaz estilo Apple más limpia.
- Dashboard renovado.
- Tarjetas, fondos, animaciones y navegación mejoradas.
- Se mantienen entrenamiento, recetas, macros, progreso y copias de seguridad.
- Compatible con los datos locales de la Beta 0.7.

## Actualización en GitHub
Sustituye en la raíz del repositorio todos estos archivos y haz un commit con el mensaje:

`FitCoach Phase 1 - rediseño completo`

## Nutrición
- Objetivos de calorías y macros validados con Mifflin-St Jeor.
- Menús diarios y semanales ajustados por porciones al objetivo guardado.
- Cálculos y planificación cubiertos por pruebas automáticas.

## Fotografías y progreso
- Fotos comprimidas localmente antes de guardarse en IndexedDB.
- Compatibilidad controlada con JPG, PNG, WebP y HEIC/HEIF.
- Migración conservadora de las fotos antiguas guardadas en localStorage.
- Comparación privada de dos fotografías con liberación de memoria.
- Copias de seguridad versionadas con datos y fotografías, y restauración con rollback.


## Persistencia principal
- Cada colección valida su tipo antes de usarse.
- Se conserva localmente el último estado válido cuando el tamaño lo permite.
- Si una clave principal está dañada, la aplicación recupera su copia compatible.
- Una escritura fallida revierte la clave y mantiene los datos anteriores.


## Coach explicable
- Prioriza adherencia semanal, esfuerzo mediante RIR, proteína según la hora y tendencia de peso cuando existen suficientes registros.
- Cada recomendación muestra el dato que la origina y limita los ajustes a acciones prudentes.
- No diagnostica, no estima composición corporal desde fotografías y no inventa recomendaciones cuando faltan datos.

## Fechas locales en iPhone
- Comidas, entrenamientos, métricas y fotografías conservan el día y la zona horaria local del dispositivo.
- Las copias de seguridad usan el día local en el nombre del archivo.
- Pruebas automáticas cubren Madrid, Los Ángeles y Kiritimati para evitar regresiones cerca de medianoche.

## Copias de seguridad en iPhone
- Las descargas usan el nombre `recomp-10m-backup-AAAA-MM-DD.json`.
- La URL temporal de cada exportación se libera después de descargar para evitar acumular memoria en sesiones largas de Safari.


## Privacidad nativa y App Store
- El proyecto iOS instala `PrivacyInfo.xcprivacy` dentro del target y del paquete compilado.
- La versión actual declara que no realiza seguimiento ni recopila en servidores los datos locales de entrenamiento, nutrición, métricas o fotografías.
- La CI abre y valida el manifiesto dentro de `Recomp10M.app` para impedir entregas sin esta declaración.
- La política pública y el soporte siguen disponibles en `privacy.html` y `support.html`.
- Si se añaden cuentas, sincronización, analítica, publicidad, crash reporting o backend, la declaración deberá revisarse antes de publicar.

## Generador de menús de 30 días
- Acceso visible desde la pestaña `Menús` y desde la calculadora de macros; aparece antes que la biblioteca de recetas.
- Calorías y proteína se cargan automáticamente desde la calculadora de macros y se actualizan al recalcular.
- Permite un ajuste manual opcional solo para el menú, además de número de comidas, estilo alimentario, exclusiones, despensa, tiempo, presupuesto y variedad.
- Plan local de 30 días, navegación semanal, sustitución individual y lista de compra agrupada.
- El plan mensual se valida al guardar y abrir, se incluye en las copias de seguridad y se elimina con el borrado controlado de Recomp 10M.
- El generador usa el catálogo completo de recetas de la app en lugar del listado antiguo reducido.
- Cada comida del plan abre su ficha táctil con ingredientes, preparación paso a paso, tiempo, dificultad, porción ajustada y macros sin perder la semana seleccionada.
- Las cantidades prácticas que aparecen en cada ingrediente son exactamente las utilizadas para calcular los macros; la ficha muestra además su aporte nutricional estimado y este desglose sobrevive al guardado y a las copias de seguridad.
- Cada comida planificada se puede registrar una sola vez en el diario del día, desde la lista o desde su receta; el registro actualiza inmediatamente los totales y conserva su vínculo en las copias de seguridad.
- El diario permite navegar por fechas, revisar los totales de cada día y corregir los valores realmente consumidos sin perder el vínculo con el plan mensual.
- Las eliminaciones requieren confirmación y liberan la comida planificada para poder registrarla de nuevo si fue borrada por error.
- Las exclusiones actúan como filtro preventivo; las alergias graves requieren revisión profesional y del etiquetado.
- Pruebas automáticas cubren duración, restricciones, sustituciones y compra semanal.
- La interfaz está optimizada para navegación táctil y el área segura de iPhone.
