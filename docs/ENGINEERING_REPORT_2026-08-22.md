# Recomp 10M — Informe de ingeniería, producto y QA
Fecha: 22/08/2026

## 1. Objetivo de producto
Recomp 10M debe ser un sistema especializado en recomposición corporal: un único perfil de usuario/cliente genera objetivos nutricionales, reparto de comidas, menú, entrenamiento y seguimiento adaptativo.

## 2. Arquitectura funcional
### Perfil único
Sexo, edad, altura, peso, grasa opcional, actividad, objetivo, experiencia, días y tiempo disponibles, material, limitaciones, comidas/día, patrón de reparto, dieta, exclusiones/alergias, presupuesto, tiempo de cocina, medidas y fotos.

### Nutrición
- Estimación energética explícita.
- Proteína, grasa y carbohidratos reconciliados con las kcal.
- 3–6 comidas con reparto exacto del total diario.
- Reparto equilibrado o priorizado hacia desayuno/comida/cena.
- El planificador avanzado existente conserva restricciones de dieta, exclusiones, despensa, presupuesto, tiempo y variedad.
- La siguiente integración debe hacer que ingredientes, cantidades visibles y nutrientes tengan una única fuente estructurada de verdad.

### Entrenamiento
- 2–6 días/semana.
- Duración máxima por sesión.
- Selección condicionada por equipamiento y experiencia.
- Rangos de repeticiones y 1–3 RIR.
- Doble progresión; reducción de carga/volumen si el rendimiento se deteriora repetidamente.
- El historial existente sigue siendo la fuente para las recomendaciones de progresión.

### Seguimiento
Peso, medidas, fotos, adherencia, rendimiento y RIR deben alimentar ajustes futuros de forma gradual y explicable.

## 3. Hallazgos QA
- `nutrition-engine.js` tenía un menú diario fijo de 4 comidas y reparto 22/32/16/30.
- `meal-planner.js` ya era mucho más avanzado, pero con repartos fijos para 3/4/5 comidas y separado del entrenamiento.
- `training-engine.js` gestiona bien historial y progresión, pero no generaba un plan a partir del perfil completo.
- El principal defecto era arquitectónico: múltiples motores sin una fuente única de perfil.

## 4. Cambios de esta iteración
- `recomp-profile-v2.js`: perfil común, objetivos, reparto 3–6 comidas y plan adaptativo.
- `recomp-intake-v2.js`: wizard de usuario/cliente.
- Integración no destructiva por `date-engine.js`.
- Tests de invariantes de energía, reparto y número de sesiones.
- Browser smoke test para recorrer y persistir el flujo completo.

## 5. QA obligatorio
- Perfil determinista tras recarga.
- Suma de comidas = objetivo diario dentro del redondeo.
- Suma nutricional de ingredientes = receta mostrada.
- Swap respeta restricciones y tolerancia.
- Plan no supera días/minutos/material/limitaciones.
- Persistencia, backup, fechas locales, PWA y paquete iOS.
- Matriz iPhone pequeño/grande + iPad.

## 6. App Store
El repositorio ya contiene manifiesto de privacidad y recursos de release, pero la entrega final exige validación de bundle, enlaces legales, metadata, capturas, build firmado y prueba física. La subida requiere Apple Developer/App Store Connect.

## 7. Riesgos pendientes
- Las restricciones alimentarias deben basarse en metadatos estructurados, no solo coincidencia de texto.
- El reparto de macros por comida debe considerarse una herramienta práctica; no se debe prometer una ventaja clínica por una distribución concreta sin evidencia suficiente.
- Los ajustes por peso deben usar tendencias y límites, no variaciones diarias.
- Las fotos de progreso no deben generar diagnósticos ni estimaciones médicas no validadas.