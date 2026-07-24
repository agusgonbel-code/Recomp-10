const PROGRAM=[
{day:'Lunes',name:'Torso A',focus:'Pecho · Espalda · Hombros · Brazos',exercises:[
{name:'Press inclinado en Smith',muscle:'Pecho',equipment:'Multipower',sets:3,range:'6–10',rest:120,alt:['Press inclinado con mancuernas','Press convergente en máquina']},
{name:'Remo con apoyo de pecho',muscle:'Espalda',equipment:'Máquina',sets:3,range:'8–12',rest:120,alt:['Remo en polea baja','Remo con mancuerna']},
{name:'Press de pecho en máquina',muscle:'Pecho',equipment:'Máquina',sets:3,range:'8–12',rest:90,alt:['Press banca con mancuernas','Flexiones lastradas']},
{name:'Jalón neutro',muscle:'Espalda',equipment:'Polea',sets:3,range:'8–12',rest:90,alt:['Dominadas asistidas','Jalón supino']},
{name:'Elevaciones laterales',muscle:'Hombros',equipment:'Mancuernas',sets:3,range:'12–20',rest:60,alt:['Elevación lateral en polea','Máquina lateral']},
{name:'Curl de bíceps',muscle:'Bíceps',equipment:'Mancuernas',sets:2,range:'10–15',rest:60,alt:['Curl en polea','Curl predicador']},
{name:'Extensión de tríceps',muscle:'Tríceps',equipment:'Polea',sets:2,range:'10–15',rest:60,alt:['Press francés','Fondos asistidos']}]},
{day:'Martes',name:'Pierna A',focus:'Cuádriceps · Femoral · Gemelo · Core',exercises:[
{name:'Prensa inclinada',muscle:'Cuádriceps',equipment:'Máquina',sets:3,range:'8–12',rest:150,alt:['Sentadilla goblet','Hack squat']},
{name:'Peso muerto rumano',muscle:'Femoral',equipment:'Barra',sets:3,range:'6–10',rest:150,alt:['Rumano con mancuernas','Pull-through']},
{name:'Extensión de cuádriceps',muscle:'Cuádriceps',equipment:'Máquina',sets:3,range:'12–15',rest:75,alt:['Sissy squat asistida','Step-up']},
{name:'Curl femoral sentado',muscle:'Femoral',equipment:'Máquina',sets:3,range:'10–15',rest:75,alt:['Curl tumbado','Curl con fitball']},
{name:'Gemelo en máquina',muscle:'Gemelo',equipment:'Máquina',sets:3,range:'10–15',rest:60,alt:['Gemelo en prensa','Gemelo de pie']},
{name:'Crunch en polea',muscle:'Core',equipment:'Polea',sets:3,range:'10–15',rest:60,alt:['Crunch en máquina','Dead bug']}]},
{day:'Miércoles',name:'Torso B',focus:'Espalda · Hombro · Pecho · Brazos',exercises:[
{name:'Jalón al pecho',muscle:'Espalda',equipment:'Polea',sets:3,range:'6–10',rest:120,alt:['Dominadas asistidas','Jalón neutro']},
{name:'Press militar sentado',muscle:'Hombros',equipment:'Mancuernas',sets:3,range:'6–10',rest:120,alt:['Press en máquina','Landmine press']},
{name:'Remo unilateral en polea',muscle:'Espalda',equipment:'Polea',sets:3,range:'8–12',rest:90,alt:['Remo mancuerna','Remo máquina']},
{name:'Aperturas en máquina',muscle:'Pecho',equipment:'Máquina',sets:3,range:'10–15',rest:75,alt:['Aperturas en polea','Aperturas con mancuernas']},
{name:'Elevación lateral en polea',muscle:'Hombros',equipment:'Polea',sets:3,range:'12–20',rest:60,alt:['Mancuernas','Máquina lateral']},
{name:'Curl martillo',muscle:'Bíceps',equipment:'Mancuernas',sets:2,range:'10–15',rest:60,alt:['Curl cuerda','Curl cruzado']},
{name:'Extensión de tríceps sobre cabeza',muscle:'Tríceps',equipment:'Polea',sets:2,range:'10–15',rest:60,alt:['Press francés','Extensión unilateral']}]},
{day:'Jueves',name:'Pierna B',focus:'Glúteo · Femoral · Cuádriceps · Core',exercises:[
{name:'Sentadilla en multipower',muscle:'Cuádriceps',equipment:'Multipower',sets:3,range:'6–10',rest:150,alt:['Hack squat','Sentadilla goblet']},
{name:'Hip thrust',muscle:'Glúteo',equipment:'Barra',sets:3,range:'8–12',rest:120,alt:['Puente de glúteo','Hip thrust máquina']},
{name:'Curl femoral tumbado',muscle:'Femoral',equipment:'Máquina',sets:3,range:'10–15',rest:75,alt:['Curl sentado','Nórdico asistido']},
{name:'Zancada inversa',muscle:'Cuádriceps',equipment:'Mancuernas',sets:2,range:'8–12',rest:90,alt:['Split squat','Step-up']},
{name:'Gemelo sentado',muscle:'Gemelo',equipment:'Máquina',sets:3,range:'12–20',rest:60,alt:['Gemelo en prensa','Gemelo de pie']},
{name:'Plancha',muscle:'Core',equipment:'Peso corporal',sets:3,range:'30–60 s',rest:60,alt:['Pallof press','Dead bug']}]}];

const EXERCISE_LIBRARY=[...PROGRAM.flatMap(d=>d.exercises),
{name:'Press banca con barra',muscle:'Pecho',equipment:'Barra',sets:3,range:'5–8',rest:150,alt:['Press mancuernas','Press máquina']},
{name:'Dominadas',muscle:'Espalda',equipment:'Peso corporal',sets:3,range:'5–10',rest:150,alt:['Dominadas asistidas','Jalón al pecho']},
{name:'Face pull',muscle:'Hombros',equipment:'Polea',sets:3,range:'12–20',rest:60,alt:['Pájaros','Reverse fly']},
{name:'Sentadilla goblet',muscle:'Cuádriceps',equipment:'Mancuerna',sets:3,range:'8–15',rest:90,alt:['Prensa','Hack squat']},
{name:'Pull-through',muscle:'Glúteo',equipment:'Polea',sets:3,range:'10–15',rest:75,alt:['Hip thrust','Peso muerto rumano']},
{name:'Pallof press',muscle:'Core',equipment:'Polea',sets:3,range:'10–15',rest:60,alt:['Plancha','Dead bug']}];

const RECIPES=[
{name:'Avena con yogur y frutos rojos',type:'Desayuno',kcal:520,p:34,c:68,f:12,ingredients:['80 g avena','250 g yogur alto en proteína','frutos rojos','canela'],steps:'Mezcla y deja reposar cinco minutos.'},
{name:'Tortilla de claras con pan y fruta',type:'Desayuno',kcal:490,p:39,c:54,f:11,ingredients:['250 g claras','2 huevos','80 g pan integral','1 fruta'],steps:'Cuaja la tortilla y acompaña con pan y fruta.'},
{name:'Tostadas con pavo y aguacate',type:'Desayuno',kcal:560,p:36,c:55,f:20,ingredients:['100 g pan','120 g pavo','60 g aguacate','tomate'],steps:'Tuesta el pan y añade el resto de ingredientes.'},
{name:'Arroz con pollo y verduras',type:'Comida',kcal:720,p:52,c:92,f:16,ingredients:['180 g pollo','120 g arroz en seco','verduras','aceite de oliva'],steps:'Cocina el arroz, saltea el pollo y mezcla con verduras.'},
{name:'Pasta con ternera magra',type:'Comida',kcal:760,p:48,c:96,f:20,ingredients:['120 g pasta seca','170 g ternera magra','tomate','verduras'],steps:'Cuece la pasta y añade la ternera salteada con tomate.'},
{name:'Burrito de pollo y frijoles',type:'Comida',kcal:690,p:47,c:82,f:18,ingredients:['tortilla integral','160 g pollo','frijoles','arroz','verduras'],steps:'Rellena la tortilla, enrolla y dora ligeramente.'},
{name:'Salmón con patata y brócoli',type:'Cena',kcal:620,p:45,c:58,f:24,ingredients:['180 g salmón','300 g patata','brócoli','aceite de oliva'],steps:'Hornea el salmón y la patata; sirve con brócoli.'},
{name:'Hamburguesa casera con patata',type:'Cena',kcal:710,p:49,c:72,f:25,ingredients:['180 g carne magra','pan de hamburguesa','250 g patata','ensalada'],steps:'Cocina la carne y acompaña con patata al horno.'},
{name:'Merluza con arroz y verduras',type:'Cena',kcal:570,p:43,c:69,f:12,ingredients:['200 g merluza','90 g arroz en seco','verduras','aceite de oliva'],steps:'Cocina la merluza a la plancha y sirve con arroz y verduras.'},
{name:'Yogur proteico con plátano',type:'Snack',kcal:310,p:28,c:42,f:4,ingredients:['250 g yogur proteico','1 plátano','canela'],steps:'Mezcla todo y sirve frío.'},
{name:'Batido de proteína y avena',type:'Snack',kcal:410,p:35,c:52,f:8,ingredients:['30 g proteína en polvo','60 g avena','1 plátano','agua o leche'],steps:'Tritura hasta conseguir una textura homogénea.'},
{name:'Sándwich integral de atún',type:'Snack',kcal:390,p:32,c:40,f:11,ingredients:['100 g pan integral','1 lata de atún','tomate','queso ligero'],steps:'Monta el sándwich y tuéstalo.'}
];
