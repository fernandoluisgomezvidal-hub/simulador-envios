'use strict';
/* =========================================================================
   Datos de referencia del simulador.
   Tarifas, plazos y límites son ORIENTATIVOS (simulación no oficial).
   ========================================================================= */

const PROVINCES = {
  '01':'Álava','02':'Albacete','03':'Alicante','04':'Almería','05':'Ávila','06':'Badajoz','07':'Illes Balears',
  '08':'Barcelona','09':'Burgos','10':'Cáceres','11':'Cádiz','12':'Castellón','13':'Ciudad Real','14':'Córdoba',
  '15':'A Coruña','16':'Cuenca','17':'Girona','18':'Granada','19':'Guadalajara','20':'Gipuzkoa','21':'Huelva',
  '22':'Huesca','23':'Jaén','24':'León','25':'Lleida','26':'La Rioja','27':'Lugo','28':'Madrid','29':'Málaga',
  '30':'Murcia','31':'Navarra','32':'Ourense','33':'Asturias','34':'Palencia','35':'Las Palmas','36':'Pontevedra',
  '37':'Salamanca','38':'S. C. de Tenerife','39':'Cantabria','40':'Segovia','41':'Sevilla','42':'Soria',
  '43':'Tarragona','44':'Teruel','45':'Toledo','46':'Valencia','47':'Valladolid','48':'Bizkaia','49':'Zamora',
  '50':'Zaragoza','51':'Ceuta','52':'Melilla'
};

// [nombre, provincia, lat, lng, isla?]  (el primero de cada provincia es su capital)
const ES_RAW = [
  ['Vitoria-Gasteiz','01',42.8467,-2.6716],['Albacete','02',38.9943,-1.8585],['Alicante','03',38.3452,-0.4810],
  ['Almería','04',36.8340,-2.4637],['Ávila','05',40.6565,-4.6818],['Badajoz','06',38.8794,-6.9707],
  ['Palma','07',39.5696,2.6502,'mallorca'],['Barcelona','08',41.3874,2.1686],['Burgos','09',42.3439,-3.6969],
  ['Cáceres','10',39.4753,-6.3724],['Cádiz','11',36.5271,-6.2886],['Castellón de la Plana','12',39.9864,-0.0513],
  ['Ciudad Real','13',38.9848,-3.9274],['Córdoba','14',37.8882,-4.7794],['A Coruña','15',43.3623,-8.4115],
  ['Cuenca','16',40.0704,-2.1374],['Girona','17',41.9794,2.8214],['Granada','18',37.1773,-3.5986],
  ['Guadalajara','19',40.6329,-3.1672],['Donostia-San Sebastián','20',43.3183,-1.9812],['Huelva','21',37.2614,-6.9447],
  ['Huesca','22',42.1401,-0.4089],['Jaén','23',37.7796,-3.7849],['León','24',42.5987,-5.5671],
  ['Lleida','25',41.6176,0.6200],['Logroño','26',42.4627,-2.4450],['Lugo','27',43.0097,-7.5568],
  ['Madrid','28',40.4168,-3.7038],['Málaga','29',36.7213,-4.4214],['Murcia','30',37.9922,-1.1307],
  ['Pamplona','31',42.8125,-1.6458],['Ourense','32',42.3358,-7.8639],['Oviedo','33',43.3614,-5.8593],
  ['Palencia','34',42.0095,-4.5288],['Las Palmas de Gran Canaria','35',28.1235,-15.4363,'grancanaria'],
  ['Pontevedra','36',42.4310,-8.6444],['Salamanca','37',40.9701,-5.6635],
  ['Santa Cruz de Tenerife','38',28.4636,-16.2518,'tenerife'],['Santander','39',43.4623,-3.8100],
  ['Segovia','40',40.9429,-4.1088],['Sevilla','41',37.3891,-5.9845],['Soria','42',41.7640,-2.4688],
  ['Tarragona','43',41.1189,1.2445],['Teruel','44',40.3456,-1.1065],['Toledo','45',39.8628,-4.0273],
  ['Valencia','46',39.4699,-0.3763],['Valladolid','47',41.6523,-4.7245],['Bilbao','48',43.2630,-2.9350],
  ['Zamora','49',41.5035,-5.7446],['Zaragoza','50',41.6488,-0.8891],['Ceuta','51',35.8894,-5.3213],
  ['Melilla','52',35.2923,-2.9381],
  ['Vigo','36',42.2406,-8.7207],['Gijón','33',43.5322,-5.6611],['Santiago de Compostela','15',42.8782,-8.5448],
  ['Cartagena','30',37.6257,-0.9966],['Jerez de la Frontera','11',36.6850,-6.1261],['Algeciras','11',36.1408,-5.4562],
  ['Marbella','29',36.5101,-4.8825],['Elche','03',38.2699,-0.7126],['Benidorm','03',38.5411,-0.1225],
  ['Alcalá de Henares','28',40.4818,-3.3643],['Ponferrada','24',42.5499,-6.5983],['Mérida','06',38.9161,-6.3437],
  ['Talavera de la Reina','45',39.9635,-4.8308],['Sabadell','08',41.5433,2.1094],['Reus','43',41.1561,1.1069],
  ['Ibiza','07',38.9067,1.4206,'ibiza'],['Maó','07',39.8885,4.2658,'menorca'],
  ['Arrecife','35',28.9630,-13.5477,'lanzarote'],['Puerto del Rosario','35',28.5004,-13.8627,'fuerteventura'],
  ['Santa Cruz de La Palma','38',28.6835,-17.7642,'lapalma'],['San Sebastián de La Gomera','38',28.0916,-17.1133,'lagomera']
];

// [país, ciudad, lat, lng]
const WORLD_RAW = [
  ['PT','Lisboa',38.7223,-9.1393],['PT','Oporto',41.1579,-8.6291],['PT','Faro',37.0194,-7.9322],['PT','Funchal (Madeira)',32.6669,-16.9241],
  ['AD','Andorra la Vella',42.5063,1.5218],['GI','Gibraltar',36.1408,-5.3536],
  ['FR','París',48.8566,2.3522],['FR','Marsella',43.2965,5.3698],['FR','Lyon',45.7640,4.8357],['FR','Burdeos',44.8378,-0.5792],
  ['FR','Toulouse',43.6047,1.4442],['FR','Niza',43.7102,7.2620],['FR','Lille',50.6292,3.0573],['FR','Estrasburgo',48.5734,7.7521],
  ['DE','Berlín',52.5200,13.4050],['DE','Múnich',48.1351,11.5820],['DE','Hamburgo',53.5511,9.9937],['DE','Fráncfort',50.1109,8.6821],['DE','Colonia',50.9375,6.9603],
  ['IT','Roma',41.9028,12.4964],['IT','Milán',45.4642,9.1900],['IT','Nápoles',40.8518,14.2681],['IT','Florencia',43.7696,11.2558],['IT','Palermo',38.1157,13.3615],
  ['NL','Ámsterdam',52.3676,4.9041],['NL','Róterdam',51.9244,4.4777],['BE','Bruselas',50.8503,4.3517],['BE','Amberes',51.2194,4.4025],
  ['LU','Luxemburgo',49.6116,6.1319],['IE','Dublín',53.3498,-6.2603],['IE','Cork',51.8985,-8.4756],['AT','Viena',48.2082,16.3738],
  ['DK','Copenhague',55.6761,12.5683],['SE','Estocolmo',59.3293,18.0686],['SE','Gotemburgo',57.7089,11.9746],['FI','Helsinki',60.1699,24.9384],
  ['PL','Varsovia',52.2297,21.0122],['PL','Cracovia',50.0647,19.9450],['CZ','Praga',50.0755,14.4378],['SK','Bratislava',48.1486,17.1077],
  ['HU','Budapest',47.4979,19.0402],['RO','Bucarest',44.4268,26.1025],['BG','Sofía',42.6977,23.3219],
  ['GR','Atenas',37.9838,23.7275],['GR','Tesalónica',40.6401,22.9444],['HR','Zagreb',45.8150,15.9819],['SI','Liubliana',46.0569,14.5058],
  ['EE','Tallin',59.4370,24.7536],['LV','Riga',56.9496,24.1052],['LT','Vilna',54.6872,25.2797],['MT','La Valeta',35.8989,14.5146],['CY','Nicosia',35.1856,33.3823],
  ['GB','Londres',51.5074,-0.1278],['GB','Mánchester',53.4808,-2.2426],['GB','Birmingham',52.4862,-1.8904],['GB','Edimburgo',55.9533,-3.1883],
  ['CH','Zúrich',47.3769,8.5417],['CH','Ginebra',46.2044,6.1432],['NO','Oslo',59.9139,10.7522],['IS','Reikiavik',64.1466,-21.9426],
  ['TR','Estambul',41.0082,28.9784],['TR','Ankara',39.9334,32.8597],['UA','Kiev',50.4501,30.5234],['RS','Belgrado',44.7866,20.4489],['RU','Moscú',55.7558,37.6173],
  ['MA','Casablanca',33.5731,-7.5898],['MA','Rabat',34.0209,-6.8416],['MA','Tánger',35.7595,-5.8340],['MA','Marrakech',31.6295,-7.9811],
  ['DZ','Argel',36.7538,3.0588],['TN','Túnez',36.8065,10.1815],
  ['US','Nueva York',40.7128,-74.0060],['US','Miami',25.7617,-80.1918],['US','Chicago',41.8781,-87.6298],['US','Houston',29.7604,-95.3698],
  ['US','Los Ángeles',34.0522,-118.2437],['US','San Francisco',37.7749,-122.4194],
  ['CA','Toronto',43.6532,-79.3832],['CA','Montreal',45.5017,-73.5673],['CA','Vancouver',49.2827,-123.1207],
  ['MX','Ciudad de México',19.4326,-99.1332],['MX','Guadalajara',20.6597,-103.3496],['MX','Monterrey',25.6866,-100.3161],['MX','Cancún',21.1619,-86.8515],
  ['CU','La Habana',23.1136,-82.3666],['DO','Santo Domingo',18.4861,-69.9312],['CO','Bogotá',4.7110,-74.0721],['CO','Medellín',6.2442,-75.5812],
  ['VE','Caracas',10.4806,-66.9036],['EC','Quito',-0.1807,-78.4678],['EC','Guayaquil',-2.1709,-79.9224],['PE','Lima',-12.0464,-77.0428],
  ['BO','La Paz',-16.4897,-68.1193],['CL','Santiago de Chile',-33.4489,-70.6693],['AR','Buenos Aires',-34.6037,-58.3816],
  ['AR','Córdoba (Argentina)',-31.4201,-64.1888],['UY','Montevideo',-34.9011,-56.1645],['PY','Asunción',-25.2637,-57.5759],
  ['BR','São Paulo',-23.5505,-46.6333],['BR','Río de Janeiro',-22.9068,-43.1729],['CR','San José (Costa Rica)',9.9281,-84.0907],
  ['PA','Ciudad de Panamá',8.9824,-79.5199],['GT','Ciudad de Guatemala',14.6349,-90.5069],
  ['CN','Pekín',39.9042,116.4074],['CN','Shanghái',31.2304,121.4737],['CN','Cantón',23.1291,113.2644],
  ['JP','Tokio',35.6762,139.6503],['JP','Osaka',34.6937,135.5023],['KR','Seúl',37.5665,126.9780],
  ['IN','Nueva Delhi',28.6139,77.2090],['IN','Bombay',19.0760,72.8777],['AE','Dubái',25.2048,55.2708],['SA','Riad',24.7136,46.6753],
  ['IL','Tel Aviv',32.0853,34.7818],['TH','Bangkok',13.7563,100.5018],['VN','Hanói',21.0278,105.8342],['PH','Manila',14.5995,120.9842],
  ['SG','Singapur',1.3521,103.8198],['ID','Yakarta',-6.2088,106.8456],
  ['AU','Sídney',-33.8688,151.2093],['AU','Melbourne',-37.8136,144.9631],['AU','Perth',-31.9505,115.8605],['NZ','Auckland',-36.8485,174.7633],
  ['ZA','Johannesburgo',-26.2041,28.0473],['ZA','Ciudad del Cabo',-33.9249,18.4241],['EG','El Cairo',30.0444,31.2357],
  ['SN','Dakar',14.7167,-17.4677],['NG','Lagos',6.5244,3.3792],['KE','Nairobi',-1.2921,36.8219],['GQ','Malabo',3.7504,8.7371]
];

/* ---------------- Países ----------------
   z: zona tarifaria internacional (1-6) · eu: miembro UE (sin aduanas)
   hub: centro internacional de entrada · vat: IVA/impuesto de importación (%)
   road: alcanzable por carretera (servicio económico) · b: fronteras/pasos
   dm: franquicia aprox. (€) por debajo de la cual no se pagan impuestos de importación
   gift: franquicia aprox. (€) para regalos entre particulares                       */
const COUNTRIES = {};
function K(cc, n, f, z, eu, hub, vat, x = {}) {
  COUNTRIES[cc] = Object.assign({ cc, n, f, z, eu, hub, vat, road: false, b: null, dm: 0, gift: 0, maxKg: 30, fee: 8, notes: [] }, x);
}
K('ES','España','🇪🇸',0,true,null,21);
K('PT','Portugal','🇵🇹',1,true,['Centro Internacional de Lisboa (CTT)',38.7756,-9.1354],23,{road:true,b:['BAD']});
K('AD','Andorra','🇦🇩',1,false,['Centro postal de Andorra la Vella',42.5100,1.5300],4.5,{road:true,b:['SEU'],gift:50,fee:5,
  notes:['Andorra no pertenece a la UE: la mercancía necesita declaración aduanera (CN22/CN23). Impuesto indirecto IGI general del 4,5 %.']});
K('GI','Gibraltar','🇬🇮',1,false,['Royal Gibraltar Post Office',36.1430,-5.3530],0,{road:true,b:['LIN'],fee:5,
  notes:['Gibraltar está fuera de la unión aduanera de la UE: la mercancía requiere declaración aduanera. No hay IVA, pero puede aplicarse arancel de importación.']});
const EUH = (cc, n, f, hub, vat, x) => K(cc, n, f, 2, true, hub, vat, x);
EUH('FR','Francia','🇫🇷',['Centro Internacional París-Roissy (CDG)',49.0097,2.5479],20,{road:true,b:['IRU']});
EUH('DE','Alemania','🇩🇪',['Centro Internacional Fráncfort',50.0379,8.5622],19,{road:true,b:['JON']});
EUH('IT','Italia','🇮🇹',['Centro Internacional Milán-Malpensa',45.6301,8.7231],22,{road:true,b:['JON']});
EUH('NL','Países Bajos','🇳🇱',['Centro Internacional Ámsterdam-Schiphol',52.3105,4.7683],21,{road:true,b:['IRU']});
EUH('BE','Bélgica','🇧🇪',['Centro Internacional Bruselas',50.9010,4.4844],21,{road:true,b:['IRU']});
EUH('LU','Luxemburgo','🇱🇺',['Centro postal de Luxemburgo',49.6233,6.2044],17,{road:true,b:['IRU']});
EUH('IE','Irlanda','🇮🇪',['Centro Internacional Dublín',53.4264,-6.2499],23);
EUH('AT','Austria','🇦🇹',['Centro Internacional Viena',48.1103,16.5697],20,{road:true,b:['JON']});
EUH('DK','Dinamarca','🇩🇰',['Centro Internacional Copenhague',55.6180,12.6508],25,{road:true,b:['IRU']});
EUH('SE','Suecia','🇸🇪',['Centro Internacional Estocolmo-Arlanda',59.6498,17.9238],25,{road:true,b:['IRU']});
EUH('FI','Finlandia','🇫🇮',['Centro Internacional Helsinki-Vantaa',60.3172,24.9633],25.5);
EUH('PL','Polonia','🇵🇱',['Centro Internacional Varsovia',52.1657,20.9671],23,{road:true,b:['IRU']});
EUH('CZ','Chequia','🇨🇿',['Centro Internacional Praga',50.1008,14.2600],21,{road:true,b:['JON']});
EUH('SK','Eslovaquia','🇸🇰',['Centro postal de Bratislava',48.1702,17.2127],23,{road:true,b:['JON']});
EUH('HU','Hungría','🇭🇺',['Centro Internacional Budapest',47.4385,19.2523],27,{road:true,b:['JON']});
EUH('RO','Rumanía','🇷🇴',['Centro Internacional Bucarest',44.5711,26.0850],21,{road:true,b:['JON']});
EUH('BG','Bulgaria','🇧🇬',['Centro Internacional Sofía',42.6967,23.4114],20,{road:true,b:['JON']});
EUH('GR','Grecia','🇬🇷',['Centro Internacional Atenas',37.9364,23.9445],24);
EUH('HR','Croacia','🇭🇷',['Centro postal de Zagreb',45.7429,16.0688],25,{road:true,b:['JON']});
EUH('SI','Eslovenia','🇸🇮',['Centro postal de Liubliana',46.2237,14.4576],22,{road:true,b:['JON']});
EUH('EE','Estonia','🇪🇪',['Centro postal de Tallin',59.4133,24.8328],24);
EUH('LV','Letonia','🇱🇻',['Centro postal de Riga',56.9236,23.9711],21);
EUH('LT','Lituania','🇱🇹',['Centro postal de Vilna',54.6341,25.2858],21);
EUH('MT','Malta','🇲🇹',['Centro postal de Malta',35.8575,14.4775],18);
EUH('CY','Chipre','🇨🇾',['Centro postal de Nicosia',35.1600,33.3600],19);

K('GB','Reino Unido','🇬🇧',3,false,['Centro Internacional Londres-Heathrow',51.4700,-0.4543],20,{road:true,b:['IRU','CAL'],gift:45,
  notes:['Desde el Brexit, todo envío con mercancía requiere declaración aduanera electrónica.','Regalos entre particulares hasta 39 £ exentos; envíos de hasta 135 £ pagan IVA del 20 % (sin arancel en la mayoría de casos).']});
K('CH','Suiza','🇨🇭',3,false,['Centro Internacional Zúrich',47.4582,8.5555],8.1,{road:true,b:['JON'],dm:62,fee:12,
  notes:['Suiza no cobra IVA de importación si el impuesto resultante es ≤ 5 CHF (≈ 62 € de valor). Swiss Post cobra tasa de despacho.']});
K('NO','Noruega','🇳🇴',3,false,['Centro Internacional Oslo',59.9500,10.9000],25,{road:true,b:['IRU'],gift:85,
  notes:['Noruega aplica IVA del 25 % desde la primera corona en compras; los regalos de particulares hasta 1.000 NOK están exentos.']});
K('IS','Islandia','🇮🇸',3,false,['Centro postal de Reikiavik',64.1300,-21.9000],24);
K('TR','Turquía','🇹🇷',3,false,['Centro Internacional Estambul',41.2753,28.7519],20,{dm:30});
K('UA','Ucrania','🇺🇦',3,false,['Centro Internacional Kiev',50.4500,30.5200],20,{dm:150,
  notes:['Posibles restricciones operativas por la situación del país: confirma disponibilidad y plazos antes de enviar.']});
K('RS','Serbia','🇷🇸',3,false,['Centro postal de Belgrado',44.8184,20.3091],20,{dm:10});
K('RU','Rusia','🇷🇺',3,false,['Centro Internacional Moscú',55.9726,37.4146],20,{suspended:true,
  notes:['Admisión de envíos suspendida o muy limitada por sanciones y restricciones de transporte aéreo.']});

K('MA','Marruecos','🇲🇦',4,false,['Centro Internacional Casablanca',33.3675,-7.5899],20,{gift:115});
K('DZ','Argelia','🇩🇿',4,false,['Centro Internacional Argel',36.6910,3.2154],19,{maxKg:20});
K('TN','Túnez','🇹🇳',4,false,['Centro Internacional Túnez-Cartago',36.8510,10.2272],19);
K('US','Estados Unidos','🇺🇸',4,false,['Centro Internacional Nueva York (JFK)',40.6413,-73.7781],0,{dutyFloor:15,fee:10,
  notes:['Desde el 29/08/2025 EE. UU. suprimió la franquicia «de minimis»: cualquier envío con mercancía paga arancel, sea cual sea su valor (los productos UE suelen tributar en torno al 15 %).',
         'Es obligatoria la declaración electrónica con descripción detallada, valor y código arancelario (HS). Las cartas solo con documentos no se ven afectadas.']});
K('CA','Canadá','🇨🇦',4,false,['Centro Internacional Toronto',43.6777,-79.6248],5,{dm:13,gift:40,
  notes:['GST federal del 5 % más impuesto provincial (HST de hasta el 15 % en total). Regalos de hasta 60 CAD exentos.']});

K('MX','México','🇲🇽',5,false,['Centro Internacional Ciudad de México',19.4361,-99.0719],16,{dm:45});
K('CU','Cuba','🇨🇺',5,false,['Centro Internacional La Habana',22.9892,-82.4091],0,{maxKg:20,fee:5,
  notes:['Cuba aplica límites estrictos de peso y valor a los envíos de particulares y controla especialmente electrónica y medicamentos.']});
K('DO','República Dominicana','🇩🇴',5,false,['Centro Internacional Santo Domingo',18.4297,-69.6689],18,{dm:180});
K('CO','Colombia','🇨🇴',5,false,['Centro Internacional Bogotá',4.7016,-74.1469],19,{dm:180});
K('VE','Venezuela','🇻🇪',5,false,['Centro Internacional Caracas',10.6031,-66.9906],16,{maxKg:20});
K('EC','Ecuador','🇪🇨',5,false,['Centro Internacional Quito',-0.1292,-78.3575],15,{dm:0});
K('PE','Perú','🇵🇪',5,false,['Centro Internacional Lima',-12.0219,-77.1143],18,{dm:180});
K('BO','Bolivia','🇧🇴',5,false,['Centro Internacional La Paz',-16.5133,-68.1922],13);
K('CL','Chile','🇨🇱',5,false,['Centro Internacional Santiago',-33.3930,-70.7858],19,{dm:0,
  notes:['Chile cobra IVA del 19 % desde el primer euro en compras online de bajo valor.']});
K('AR','Argentina','🇦🇷',5,false,['Centro Internacional Ezeiza',-34.8222,-58.5358],21,{fee:10,
  notes:['Argentina aplica un régimen de pequeños envíos con cupo anual por persona y tasas específicas: el destinatario debe gestionar la recepción.']});
K('UY','Uruguay','🇺🇾',5,false,['Centro Internacional Montevideo',-34.8384,-56.0308],22);
K('PY','Paraguay','🇵🇾',5,false,['Centro Internacional Asunción',-25.2400,-57.5190],10);
K('BR','Brasil','🇧🇷',5,false,['Centro Internacional São Paulo',-23.4356,-46.4731],17,{dutyFloor:20,
  notes:['Brasil grava los envíos de bajo valor con un impuesto federal (20 % hasta 50 USD, 60 % por encima) más ICMS estatal (~17 %).']});
K('CR','Costa Rica','🇨🇷',5,false,['Centro Internacional San José',9.9939,-84.2088],13);
K('PA','Panamá','🇵🇦',5,false,['Centro Internacional Panamá-Tocumen',9.0714,-79.3835],7,{dm:90});
K('GT','Guatemala','🇬🇹',5,false,['Centro Internacional Guatemala',14.5833,-90.5275],12);

K('CN','China','🇨🇳',6,false,['Centro Internacional Pekín',40.0801,116.5846],13,{dm:6,
  notes:['China controla especialmente alimentos, medicamentos, publicaciones y productos con baterías.']});
K('JP','Japón','🇯🇵',6,false,['Centro Internacional Tokio-Narita',35.7720,140.3929],10,{dm:60});
K('KR','Corea del Sur','🇰🇷',6,false,['Centro Internacional Seúl-Incheon',37.4602,126.4407],10,{dm:135,
  notes:['Corea del Sur exige el código de aduanas personal (PCCC) del destinatario para envíos con mercancía.']});
K('IN','India','🇮🇳',6,false,['Centro Internacional Nueva Delhi',28.5562,77.1000],18,{fee:10});
K('AE','Emiratos Árabes Unidos','🇦🇪',6,false,['Centro Internacional Dubái',25.2532,55.3657],5,{dm:250});
K('SA','Arabia Saudí','🇸🇦',6,false,['Centro Internacional Riad',24.9576,46.6988],15,{dm:240});
K('IL','Israel','🇮🇱',6,false,['Centro Internacional Tel Aviv-Ben Gurión',32.0055,34.8854],18,{dm:70});
K('TH','Tailandia','🇹🇭',6,false,['Centro Internacional Bangkok',13.6900,100.7501],7,{dm:38});
K('VN','Vietnam','🇻🇳',6,false,['Centro Internacional Hanói',21.2187,105.8042],10,{dm:37});
K('PH','Filipinas','🇵🇭',6,false,['Centro Internacional Manila',14.5086,121.0194],12,{dm:160});
K('SG','Singapur','🇸🇬',6,false,['Centro Internacional Singapur-Changi',1.3644,103.9915],9,{dm:0});
K('ID','Indonesia','🇮🇩',6,false,['Centro Internacional Yakarta',-6.1256,106.6559],11,{dm:3});
K('AU','Australia','🇦🇺',6,false,['Centro Internacional Sídney',-33.9399,151.1753],10,{dm:600,
  notes:['Bioseguridad muy estricta: alimentos, semillas, plantas, madera y productos animales deben declararse y pueden ser destruidos.']});
K('NZ','Nueva Zelanda','🇳🇿',6,false,['Centro Internacional Auckland',-37.0082,174.7850],15,{dm:550,
  notes:['Controles de bioseguridad estrictos sobre alimentos y productos naturales.']});
K('ZA','Sudáfrica','🇿🇦',6,false,['Centro Internacional Johannesburgo',-26.1367,28.2411],15,{dm:25});
K('EG','Egipto','🇪🇬',6,false,['Centro Internacional El Cairo',30.1219,31.4056],14,{maxKg:20});
K('SN','Senegal','🇸🇳',6,false,['Centro Internacional Dakar',14.7397,-17.4902],18);
K('NG','Nigeria','🇳🇬',6,false,['Centro Internacional Lagos',6.5774,3.3212],7.5,{maxKg:20});
K('KE','Kenia','🇰🇪',6,false,['Centro Internacional Nairobi',-1.3192,36.9278],16);
K('GQ','Guinea Ecuatorial','🇬🇶',6,false,['Centro Internacional Malabo',3.7553,8.7087],15,{maxKg:20});

/* ---------------- Ciudades (índice) ---------------- */
function slug(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
const CITY = {};
const ES_CITIES = [], WORLD_CITIES = [];
ES_RAW.forEach(([name, prov, lat, lng, island]) => {
  const c = { id: 'es-' + slug(name), cc: 'ES', name, prov, lat, lng, island: island || null };
  CITY[c.id] = c; ES_CITIES.push(c);
});
WORLD_RAW.forEach(([cc, name, lat, lng]) => {
  const c = { id: cc.toLowerCase() + '-' + slug(name), cc, name, lat, lng };
  CITY[c.id] = c; WORLD_CITIES.push(c);
});
const ALL_CITIES = [...ES_CITIES, ...WORLD_CITIES];
// CP (2 primeros dígitos) -> capital de provincia
const PROV_CAPITAL = {};
ES_CITIES.forEach(c => { if (!PROV_CAPITAL[c.prov]) PROV_CAPITAL[c.prov] = c.id; });

/* ---------------- Red logística española (simulada) ---------------- */
const CTAS = {
  MAD: { name: 'Centro de Tratamiento Madrid (Coslada)', lat: 40.4237, lng: -3.5413, region: 'PEN' },
  BCN: { name: 'Centro de Tratamiento Barcelona (Zona Franca)', lat: 41.3354, lng: 2.1293, region: 'PEN' },
  VLC: { name: 'Centro de Tratamiento Valencia (Riba-roja)', lat: 39.5153, lng: -0.5497, region: 'PEN' },
  SVQ: { name: 'Centro de Tratamiento Sevilla', lat: 37.4067, lng: -5.9346, region: 'PEN' },
  ZAZ: { name: 'Centro de Tratamiento Zaragoza (PLAZA)', lat: 41.6326, lng: -0.9963, region: 'PEN' },
  AGP: { name: 'Centro de Tratamiento Málaga', lat: 36.6950, lng: -4.4590, region: 'PEN' },
  SCQ: { name: 'Centro de Tratamiento Santiago de Compostela', lat: 42.8970, lng: -8.4900, region: 'PEN' },
  VLL: { name: 'Centro de Tratamiento Valladolid', lat: 41.6200, lng: -4.7600, region: 'PEN' },
  BIO: { name: 'Centro de Tratamiento Bilbao', lat: 43.2900, lng: -2.8700, region: 'PEN' },
  ALC: { name: 'Centro de Tratamiento Alicante', lat: 38.3200, lng: -0.5400, region: 'PEN' },
  MJV: { name: 'Centro de Tratamiento Murcia', lat: 37.9600, lng: -1.1600, region: 'PEN' },
  OVD: { name: 'Centro de Tratamiento Asturias (Oviedo)', lat: 43.3700, lng: -5.8300, region: 'PEN' },
  MRD: { name: 'Centro de Tratamiento Mérida', lat: 38.9300, lng: -6.3600, region: 'PEN' },
  PMI: { name: 'Centro de Tratamiento Palma de Mallorca', lat: 39.5900, lng: 2.6900, region: 'BAL', island: 'mallorca' },
  LPA: { name: 'Centro de Tratamiento Las Palmas de Gran Canaria', lat: 28.0700, lng: -15.4300, region: 'CAN', island: 'grancanaria' },
  TFN: { name: 'Centro de Tratamiento Santa Cruz de Tenerife', lat: 28.4600, lng: -16.2900, region: 'CAN', island: 'tenerife' },
  CEU: { name: 'Centro de Tratamiento Ceuta', lat: 35.8880, lng: -5.3170, region: 'CEU' },
  MLN: { name: 'Centro de Tratamiento Melilla', lat: 35.2910, lng: -2.9460, region: 'MEL' }
};
const MAD_AIR = ['Aeropuerto Adolfo Suárez Madrid-Barajas', 40.4936, -3.5668, 'airport'];
const CADIZ_PORT = ['Puerto de Cádiz', 36.5350, -6.2800, 'port'];
// Pasarelas entre territorios no peninsulares y la Península
const GATEWAYS = {
  BAL: { air: { isl: ['Aeropuerto de Palma (PMI)', 39.5517, 2.7388, 'airport'], main: MAD_AIR, cta: 'MAD' },
         sea: { isl: ['Puerto de Palma', 39.5600, 2.6350, 'port'], main: ['Puerto de Valencia', 39.4440, -0.3170, 'port'], cta: 'VLC' } },
  CAN35: { air: { isl: ['Aeropuerto de Gran Canaria (LPA)', 27.9319, -15.3866, 'airport'], main: MAD_AIR, cta: 'MAD' },
           sea: { isl: ['Puerto de La Luz (Las Palmas)', 28.1400, -15.4170, 'port'], main: CADIZ_PORT, cta: 'SVQ' } },
  CAN38: { air: { isl: ['Aeropuerto de Tenerife Norte (TFN)', 28.4827, -16.3415, 'airport'], main: MAD_AIR, cta: 'MAD' },
           sea: { isl: ['Puerto de Santa Cruz de Tenerife', 28.4730, -16.2420, 'port'], main: CADIZ_PORT, cta: 'SVQ' } },
  CEU: { sea: { isl: ['Puerto de Ceuta', 35.8920, -5.3150, 'port'], main: ['Puerto de Algeciras', 36.1290, -5.4400, 'port'], cta: 'AGP' } },
  MEL: { air: { isl: ['Aeropuerto de Melilla (MLN)', 35.2798, -2.9563, 'airport'], main: ['Aeropuerto de Málaga (AGP)', 36.6749, -4.4991, 'airport'], cta: 'AGP' },
         sea: { isl: ['Puerto de Melilla', 35.2900, -2.9300, 'port'], main: ['Puerto de Málaga', 36.7120, -4.4180, 'port'], cta: 'AGP' } }
};
const GW_KEY = { PMI: 'BAL', LPA: 'CAN35', TFN: 'CAN38', CEU: 'CEU', MLN: 'MEL' };
const BORDERS = {
  IRU: ['Frontera Irún – Hendaya', 43.3390, -1.7890],
  JON: ['Frontera La Jonquera – Le Perthus', 42.4200, 2.8730],
  BAD: ['Frontera Badajoz – Elvas', 38.8790, -7.0300],
  SEU: ['Frontera La Seu d\'Urgell – Andorra', 42.4300, 1.4700],
  LIN: ['Verja de La Línea – Gibraltar', 36.1550, -5.3480],
  CAL: ['Eurotúnel Calais – Folkestone', 50.9370, 1.8130]
};
const EXCHANGE = {
  MAD: ['Centro de Cambio Internacional · Madrid-Barajas', 40.4936, -3.5668],
  BCN: ['Centro de Cambio Internacional · Barcelona-El Prat', 41.2974, 2.0833]
};
const DOHA = ['Conexión aérea · Doha (DOH)', 25.2730, 51.6080];
const TODAY_CITIES = new Set(['Madrid','Barcelona','Valencia','Sevilla','Málaga','Zaragoza','Bilbao','Palma','Las Palmas de Gran Canaria','Alicante','Murcia','Valladolid']);

/* ---------------- Servicios ----------------
   track: none | partial | full     scope: nac | int
   days: plazo en días hábiles por zona [mín, máx]                                     */
const D_LETTER_ORD = { prov: [2, 3], pen: [3, 4], bal: [3, 5], inter: [3, 5], can: [4, 6], ceme: [4, 6] };
const D_LETTER_URG = { prov: [1, 1], pen: [1, 2], bal: [2, 3], inter: [2, 3], can: [2, 4], ceme: [2, 4] };
const D_INT_ORD = { 1: [3, 5], 2: [4, 7], 3: [5, 8], 4: [7, 12], 5: [8, 15], 6: [8, 18] };
const LETTER_BANDS_NAC = [20, 50, 100, 500, 1000, 2000];
const LETTER_BANDS_INT = [20, 50, 100, 250, 500, 1000, 2000];
const LETTER_INT_PRICES = { eu: [1.95, 3.15, 4.80, 9.30, 15.70, 24.40, 35.80], w: [2.20, 4.15, 6.45, 12.70, 22.30, 39.20, 58.60] };
const LIM_LETTER = { maxG: 2000, maxL: 60, maxSum: 90, maxT: 3, minL: 14, minW: 9 };

const SERVICES = [
  // ---- Cartas nacionales
  { id: 'carta_ord', cat: 'carta', scope: 'nac', name: 'Carta ordinaria', icon: '✉️', track: 'none', air: true,
    desc: 'La opción más económica para cartas y documentos sin seguimiento. Se entrega en el buzón.',
    limits: LIM_LETTER, days: D_LETTER_ORD, pricing: { type: 'letterNac', prices: [0.88, 1.35, 1.90, 4.35, 6.70, 8.80] } },
  { id: 'carta_urg', cat: 'carta', scope: 'nac', name: 'Carta urgente', icon: '⚡', track: 'none', air: true,
    desc: 'Tratamiento prioritario: normalmente llega al día siguiente hábil en la Península.',
    limits: LIM_LETTER, days: D_LETTER_URG, pricing: { type: 'letterNac', prices: [3.90, 4.45, 5.15, 7.70, 10.00, 12.50] } },
  { id: 'carta_cert', cat: 'carta', scope: 'nac', name: 'Carta certificada', icon: '🔏', track: 'full', sign: true, ins: true, ack: true, air: true,
    desc: 'Seguimiento completo y entrega con firma. Prueba legal de envío y de entrega.',
    limits: LIM_LETTER, days: { prov: [2, 3], pen: [2, 4], bal: [3, 5], inter: [3, 5], can: [4, 6], ceme: [4, 6] },
    pricing: { type: 'letterNac', prices: [5.05, 5.50, 6.10, 8.45, 10.75, 12.95] } },
  { id: 'carta_cert_urg', cat: 'carta', scope: 'nac', name: 'Certificada urgente', icon: '🚀', track: 'full', sign: true, ins: true, ack: true, air: true,
    desc: 'Lo mejor de ambos: prioridad urgente + seguimiento y firma.',
    limits: LIM_LETTER, days: D_LETTER_URG, pricing: { type: 'letterNac', prices: [8.10, 8.60, 9.30, 11.70, 14.10, 16.40] } },
  // ---- Cartas internacionales
  { id: 'carta_int_ord', cat: 'carta', scope: 'int', name: 'Carta internacional ordinaria', icon: '✉️', track: 'none', air: true,
    desc: 'Envío económico a cualquier país, sin seguimiento.',
    limits: LIM_LETTER, days: D_INT_ORD, pricing: { type: 'letterInt', add: { eu: 0, w: 0 } } },
  { id: 'carta_int_urg', cat: 'carta', scope: 'int', name: 'Carta internacional urgente', icon: '⚡', track: 'partial', air: true,
    desc: 'Prioridad en el tratamiento y en el transporte aéreo.',
    limits: LIM_LETTER, days: { 1: [2, 3], 2: [3, 4], 3: [3, 5], 4: [4, 7], 5: [5, 8], 6: [5, 9] }, pricing: { type: 'letterInt', add: { eu: 4.20, w: 4.80 } } },
  { id: 'carta_int_cert', cat: 'carta', scope: 'int', name: 'Carta internacional certificada', icon: '🔏', track: 'partial', sign: true, ins: true, ack: true, air: true,
    desc: 'Con número de seguimiento y firma a la entrega (el detalle depende del operador de destino).',
    limits: LIM_LETTER, days: D_INT_ORD, pricing: { type: 'letterInt', add: { eu: 5.40, w: 5.80 } } },
  // ---- Postales
  { id: 'postal_nac', cat: 'postal', scope: 'nac', name: 'Tarjeta postal', icon: '🖼️', track: 'none', air: true,
    desc: 'Postal estándar con franqueo de carta normalizada.',
    limits: { maxG: 20, minL: 14, minW: 9, maxL: 23.5, maxW: 12 }, days: D_LETTER_ORD, pricing: { type: 'postal', eu: 0.88, w: 0.88 } },
  { id: 'postal_int', cat: 'postal', scope: 'int', name: 'Tarjeta postal internacional', icon: '🖼️', track: 'none', air: true,
    desc: 'Postal a cualquier país del mundo por vía aérea.',
    limits: { maxG: 20, minL: 14, minW: 9, maxL: 23.5, maxW: 12 }, days: D_INT_ORD, pricing: { type: 'postal', eu: 1.95, w: 2.20 } },
  // ---- Paquetería nacional
  { id: 'paq_ligero', cat: 'paquete', scope: 'nac', name: 'Paq Ligero', icon: '🪶', track: 'full', citypaq: true, air: false, vat: true,
    desc: 'Pequeños paquetes hasta 2 kg con seguimiento. Si cabe, se deja en el buzón.',
    limits: { maxG: 2000, maxL: 60, maxSum: 90 }, days: { prov: [2, 3], pen: [2, 4], bal: [3, 5], inter: [3, 5], can: [5, 8], ceme: [5, 7] },
    pricing: { type: 'bandsKg', bands: [0.5, 1, 2], table: { prov: [3.60, 4.20, 5.10], pen: [3.95, 4.60, 5.60], bal: [5.40, 6.20, 7.40], inter: [5.40, 6.20, 7.40], can: [7.10, 8.40, 10.20], ceme: [7.10, 8.40, 10.20] } } },
  { id: 'paq_estandar', cat: 'paquete', scope: 'nac', name: 'Paq Estándar', icon: '📦', track: 'full', sign: true, ins: true, ack: true, cod: true, citypaq: true, air: false, vat: true,
    desc: 'El paquete de referencia: hasta 30 kg, entrega en 2-3 días hábiles con firma.',
    limits: { maxG: 30000, maxL: 120, maxSum: 210 }, days: { prov: [1, 2], pen: [2, 3], bal: [3, 4], inter: [3, 4], can: [4, 7], ceme: [4, 6] },
    pricing: { type: 'linearKg', table: { prov: [5.20, 0.40], pen: [6.40, 0.62], bal: [9.20, 1.05], inter: [8.50, 0.90], can: [11.80, 2.10], ceme: [11.20, 1.90] } } },
  { id: 'paq_premium', cat: 'paquete', scope: 'nac', name: 'Paq Premium', icon: '⭐', track: 'full', sign: true, ins: true, ack: true, cod: true, citypaq: true, air: true, vat: true, saturday: true,
    desc: 'Entrega en 24-48 h, prioridad máxima y opción de entrega en sábado.',
    limits: { maxG: 30000, maxL: 120, maxSum: 210 }, days: { prov: [1, 1], pen: [1, 2], bal: [2, 3], inter: [2, 3], can: [3, 5], ceme: [2, 4] },
    pricing: { type: 'linearKg', table: { prov: [6.90, 0.55], pen: [8.60, 0.80], bal: [12.40, 1.40], inter: [11.20, 1.20], can: [16.50, 2.90], ceme: [15.20, 2.60] } } },
  { id: 'paq_today', cat: 'paquete', scope: 'nac', name: 'Paq Today', icon: '🏙️', track: 'full', sign: true, air: false, vat: true, today: true,
    desc: 'Entrega en el mismo día dentro de la misma ciudad si se admite antes de las 13:00.',
    limits: { maxG: 10000, maxL: 60, maxSum: 150 }, days: { prov: [0, 0] }, pricing: { type: 'linearKg', table: { prov: [9.95, 0.60] } } },
  // ---- Paquetería internacional
  { id: 'paq_int_ligero', cat: 'paquete', scope: 'int', name: 'Paquete Internacional Ligero', icon: '🪶', track: 'partial', air: true,
    desc: 'Pequeño paquete hasta 2 kg al mejor precio, seguimiento básico.',
    limits: { maxG: 2000, maxL: 60, maxSum: 90 }, days: { 1: [3, 5], 2: [4, 8], 3: [5, 10], 4: [7, 14], 5: [8, 18], 6: [9, 20] },
    pricing: { type: 'bandsKg', bands: [0.5, 1, 2], table: { 1: [7.90, 11.20, 16.40], 2: [8.50, 12.90, 18.50], 3: [9.40, 13.90, 19.90], 4: [11.00, 17.90, 27.50], 5: [11.90, 18.90, 29.40], 6: [12.50, 19.90, 31.20] } } },
  { id: 'paq_int_eco', cat: 'paquete', scope: 'int', name: 'Paquete Internacional Económico', icon: '🐢', track: 'partial', air: true,
    desc: 'Transporte de menor prioridad (carretera en Europa, aéreo diferido fuera). Ideal si no hay prisa.',
    limits: { maxG: 20000, maxL: 105, maxGirth: 200 }, days: { 1: [4, 7], 2: [6, 10], 3: [8, 14], 4: [12, 20], 5: [15, 30], 6: [15, 35] },
    pricing: { type: 'linearKg', table: { 1: [10.90, 1.40], 2: [14.50, 2.30], 3: [18.40, 3.10], 4: [24.90, 5.10], 5: [26.50, 6.40], 6: [29.50, 7.40] } } },
  { id: 'paq_int_std', cat: 'paquete', scope: 'int', name: 'Paquete Internacional Estándar', icon: '📦', track: 'full', sign: true, ins: true, ack: true, air: true,
    desc: 'Vía aérea prioritaria, seguimiento completo y entrega con firma.',
    limits: { maxG: 30000, maxL: 150, maxGirth: 300 }, days: { 1: [3, 5], 2: [3, 6], 3: [4, 8], 4: [5, 10], 5: [6, 12], 6: [6, 14] },
    pricing: { type: 'linearKg', table: { 1: [13.90, 1.90], 2: [18.90, 3.20], 3: [23.50, 4.40], 4: [31.50, 7.20], 5: [33.90, 9.10], 6: [37.90, 10.40] } } },
  { id: 'paq_int_premium', cat: 'paquete', scope: 'int', name: 'Paquete Internacional Premium', icon: '⭐', track: 'full', sign: true, ins: true, ack: true, air: true, insIncl: 300,
    desc: 'Servicio exprés (red EMS): el más rápido, con seguro incluido hasta 300 €.',
    limits: { maxG: 30000, maxL: 150, maxGirth: 300 }, days: { 1: [1, 2], 2: [2, 3], 3: [2, 4], 4: [3, 5], 5: [3, 6], 6: [3, 7] },
    pricing: { type: 'linearKg', table: { 1: [29.90, 3.20], 2: [39.90, 4.90], 3: [46.50, 6.20], 4: [59.90, 11.50], 5: [64.90, 13.90], 6: [69.90, 15.90] } } }
];

/* ---------------- Contenido ---------------- */
const CONTENTS = {
  docs:        { n: 'Documentos / papeles', duty: 0 },
  ropa:        { n: 'Ropa, calzado y textil', duty: 12 },
  libros:      { n: 'Libros e impresos', duty: 0 },
  electronica: { n: 'Electrónica (con baterías)', duty: 3 },
  cosmetica:   { n: 'Cosmética y perfumes', duty: 6 },
  alimentos:   { n: 'Alimentos no perecederos', duty: 10 },
  medicamentos:{ n: 'Medicamentos / suplementos', duty: 5 },
  regalo:      { n: 'Regalo entre particulares', duty: 5 },
  otros:       { n: 'Otros artículos', duty: 5 }
};

/* ---------------- Formatos predefinidos ---------------- */
const LETTER_PRESETS = {
  dl:     { n: 'Sobre americano (DL)', l: 22, w: 11, t: 2, g: 15 },
  c6:     { n: 'Sobre C6', l: 16.2, w: 11.4, t: 2, g: 10 },
  c5:     { n: 'Sobre C5 (A4 doblado)', l: 22.9, w: 16.2, t: 3, g: 40 },
  c4:     { n: 'Sobre C4 (A4 sin doblar)', l: 32.4, w: 22.9, t: 5, g: 90 },
  acolch: { n: 'Sobre acolchado', l: 27, w: 18, t: 15, g: 180 }
};
const POSTAL_PRESETS = {
  std:  { n: 'Postal estándar 14,8×10,5', l: 14.8, w: 10.5, g: 4 },
  pano: { n: 'Panorámica 23,5×12', l: 23.5, w: 12, g: 6 },
  maxi: { n: 'Maxipostal 24×17', l: 24, w: 17, g: 10 }
};
const PACK_PRESETS = {
  sobre:  { n: 'Sobre acolchado', l: 30, w: 22, h: 3, kg: 0.3 },
  s:      { n: 'Caja S', l: 25, w: 18, h: 10, kg: 1 },
  m:      { n: 'Caja M', l: 35, w: 25, h: 15, kg: 3 },
  l:      { n: 'Caja L', l: 45, w: 35, h: 25, kg: 8 },
  xl:     { n: 'Caja XL', l: 60, w: 40, h: 40, kg: 15 },
  maleta: { n: 'Maleta grande', l: 75, w: 50, h: 30, kg: 22 },
  tubo:   { n: 'Tubo de planos', l: 90, w: 10, h: 10, kg: 0.8 }
};
const BOXES = { none: ['Uso mi propio embalaje', 0], s: ['Caja S (25×18×10)', 1.45], m: ['Caja M (35×25×15)', 1.95], l: ['Caja L (45×35×25)', 2.95], xl: ['Caja XL (60×40×40)', 3.95] };
const CITYPAQ_MAX = [61, 44, 41]; // cm, lados ordenados

const PROHIBITED = ['Explosivos, munición y pirotecnia', 'Armas y réplicas', 'Drogas y estupefacientes', 'Dinero en efectivo, cheques al portador y metales preciosos',
  'Animales vivos (salvo excepciones reguladas)', 'Restos humanos', 'Material radiactivo o infeccioso', 'Productos falsificados',
  'Mercancías perecederas sin embalaje especial', 'Gases comprimidos y líquidos inflamables'];
const RESTRICTED = [
  ['Baterías de litio', 'Solo instaladas en el equipo (máx. 4 pilas o 2 baterías). Nunca baterías sueltas por vía aérea.'],
  ['Perfumes, colonias y aerosoles', 'Inflamables: solo por carretera/barco. Prohibidos por vía aérea.'],
  ['Bebidas alcohólicas', 'Muchos países las prohíben o gravan con impuestos especiales.'],
  ['Medicamentos', 'Solo con receta y para uso personal; numerosos destinos los prohíben.'],
  ['Alimentos', 'Solo no perecederos y envasados; fuera de la UE suelen requerir declaración específica.'],
  ['Tabaco y cigarrillos electrónicos', 'Prohibidos o muy restringidos en la mayoría de destinos internacionales.'],
  ['Joyas y objetos de valor', 'Usa siempre un servicio certificado con seguro / valor declarado.']
];
