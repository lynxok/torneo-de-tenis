export interface CountryLocation {
  name: string;
  code: 'AR' | 'UY' | 'ES';
  provincesLabel: string;
  provinces: {
    name: string;
    cities: string[];
  }[];
}

export const COUNTRIES_DATA: CountryLocation[] = [
  {
    name: 'Argentina',
    code: 'AR',
    provincesLabel: 'Provincia',
    provinces: [
      {
        name: 'Buenos Aires',
        cities: [
          'La Plata', 'Mar del Plata', 'Bahía Blanca', 'Tandil', 'San Nicolás',
          'Pergamino', 'Olavarría', 'Junín', 'Necochea', 'Chivilcoy', 'Mercedes',
          'Zárate', 'Campana', 'Tigre', 'San Isidro', 'Vicente López', 'Pilar',
          'Escobar', 'Quilmes', 'Lomas de Zamora', 'Lanús', 'Morón', 'San Martín',
          'Tres de Febrero', 'Avellaneda', 'Moreno', 'Merlo'
        ]
      },
      {
        name: 'Ciudad Autónoma de Buenos Aires (CABA)',
        cities: [
          'Agronomía', 'Almagro', 'Balvanera', 'Belgrano', 'Caballito', 'Colegiales',
          'Flores', 'Floresta', 'La Boca', 'Nuñez', 'Palermo', 'Recoleta', 'Retiro',
          'Saavedra', 'San Telmo', 'Villa Crespo', 'Villa Devoto', 'Villa Urquiza'
        ]
      },
      {
        name: 'Catamarca',
        cities: ['San Fernando del Valle de Catamarca', 'Valle Viejo', 'Andalgalá', 'Belén', 'Tinogasta', 'Santa María']
      },
      {
        name: 'Chaco',
        cities: ['Resistencia', 'Presidencia Roque Sáenz Peña', 'Villa Ángela', 'Barranqueras', 'Fontana', 'General San Martín', 'Castelli']
      },
      {
        name: 'Chubut',
        cities: ['Comodoro Rivadavia', 'Trelew', 'Puerto Madryn', 'Esquel', 'Rawson', 'Sarmiento', 'Gaiman', 'Rada Tilly']
      },
      {
        name: 'Córdoba',
        cities: [
          'Córdoba Capital', 'Villa Carlos Paz', 'Río Cuarto', 'Villa María', 'San Francisco',
          'Alta Gracia', 'Bell Ville', 'Río Tercero', 'Jesús María', 'La Falda', 'Cosquín',
          'Villa Dolores', 'Marcos Juárez', 'Arroyito', 'Mina Clavero'
        ]
      },
      {
        name: 'Corrientes',
        cities: ['Corrientes Capital', 'Goya', 'Paso de los Libres', 'Curuzú Cuatiá', 'Mercedes', 'Bella Vista', 'Monte Caseros', 'Santo Tomé', 'Esquina', 'Ituzaingó']
      },
      {
        name: 'Entre Ríos',
        cities: [
          'Paraná', 'Concordia', 'Gualeguaychú', 'Concepción del Uruguay', 'Gualeguay',
          'Villaguay', 'Chajarí', 'Victoria', 'La Paz', 'Nogoyá', 'Colón', 'Diamante',
          'Santa Elena', 'Crespo', 'Federación', 'San José', 'Basavilbaso', 'Viale', 'Oro Verde', 'San Benito'
        ]
      },
      {
        name: 'Formosa',
        cities: ['Formosa Capital', 'Clorinda', 'Pirané', 'El Colorado', 'Ingeniero Juárez', 'Las Lomitas']
      },
      {
        name: 'Jujuy',
        cities: ['San Salvador de Jujuy', 'San Pedro de Jujuy', 'Palpalá', 'Perico', 'Libertador General San Martín', 'Tilcara', 'Humahuaca', 'La Quiaca']
      },
      {
        name: 'La Pampa',
        cities: ['Santa Rosa', 'General Pico', 'Toay', 'Eduardo Castex', 'Realicó', 'General Acha', '25 de Mayo', 'Intendente Alvear']
      },
      {
        name: 'La Rioja',
        cities: ['La Rioja Capital', 'Chilecito', 'Aimogasta', 'Chamical', 'Chepes', 'Villa Unión']
      },
      {
        name: 'Mendoza',
        cities: [
          'Mendoza Capital', 'Godoy Cruz', 'Guaymallén', 'Las Heras', 'Luján de Cuyo',
          'Maipú', 'San Rafael', 'San Martín', 'Rivadavia', 'Tunuyán', 'General Alvear', 'Malargüe'
        ]
      },
      {
        name: 'Misiones',
        cities: ['Posadas', 'Oberá', 'Eldorado', 'Puerto Iguazú', 'Apóstoles', 'Leandro N. Alem', 'Jardín América', 'San Vicente', 'Montecarlo']
      },
      {
        name: 'Neuquén',
        cities: ['Neuquén Capital', 'San Martín de los Andes', 'Cutral Có', 'Plaza Huincul', 'Centenario', 'Plottier', 'Zapala', 'Villa La Angostura', 'Chos Malal']
      },
      {
        name: 'Río Negro',
        cities: ['San Carlos de Bariloche', 'General Roca', 'Cipolletti', 'Viedma', 'Villa Regina', 'Cinco Saltos', 'Catriel', 'El Bolsón', 'Allen', 'San Antonio Oeste']
      },
      {
        name: 'Salta',
        cities: ['Salta Capital', 'San Ramón de la Nueva Orán', 'Tartagal', 'General Güemes', 'San José de Metán', 'Rosario de la Frontera', 'Cafayate', 'Joaquín V. González']
      },
      {
        name: 'San Juan',
        cities: ['San Juan Capital', 'Rawson', 'Rivadavia', 'Chimbas', 'Santa Lucía', 'Pocito', 'Caucete', 'Jáchal', 'Albardón']
      },
      {
        name: 'San Luis',
        cities: ['San Luis Capital', 'Villa Mercedes', 'Merlo', 'La Punta', 'Juana Koslay', 'Justo Daract', 'Quines', 'Concarán']
      },
      {
        name: 'Santa Cruz',
        cities: ['Río Gallegos', 'Caleta Olivia', 'El Calafate', 'Pico Truncado', 'Puerto Deseado', 'Las Heras', 'El Chaltén', 'Puerto San Julián']
      },
      {
        name: 'Santa Fe',
        cities: [
          'Santa Fe Capital', 'Rosario', 'Rafaela', 'Venado Tuerto', 'Reconquista',
          'Santo Tomé', 'Villa Gobernador Gálvez', 'Esperanza', 'San Lorenzo', 'Granadero Baigorria',
          'Casilda', 'Cañada de Gómez', 'Pérez', 'Funes', 'Roldán', 'Sunchales', 'San Jorge', 'Carcarañá'
        ]
      },
      {
        name: 'Santiago del Estero',
        cities: ['Santiago del Estero Capital', 'La Banda', 'Termas de Río Hondo', 'Frías', 'Añatuya', 'Fernández', 'Quimilí']
      },
      {
        name: 'Tierra del Fuego',
        cities: ['Ushuaia', 'Río Grande', 'Tolhuin']
      },
      {
        name: 'Tucumán',
        cities: ['San Miguel de Tucumán', 'Yerba Buena', 'Tafí Viejo', 'Banda del Río Salí', 'Concepción', 'Aguilares', 'Monteros', 'Famaillá', 'Tafí del Valle']
      }
    ]
  },
  {
    name: 'Uruguay',
    code: 'UY',
    provincesLabel: 'Departamento',
    provinces: [
      {
        name: 'Montevideo',
        cities: ['Montevideo', 'Pocitos', 'Carrasco', 'Punta Carretas', 'Malvín', 'Buceo', 'Centro', 'Ciudad Vieja', 'Cordón', 'Prado', 'Cerro', 'Colón']
      },
      {
        name: 'Canelones',
        cities: ['Ciudad de la Costa', 'Las Piedras', 'Pando', 'Canelones Capital', 'El Pinar', 'Atlántida', 'Santa Lucía', 'Progreso', 'Paso Carrasco']
      },
      {
        name: 'Maldonado',
        cities: ['Maldonado Capital', 'Punta del Este', 'San Carlos', 'Piriápolis', 'Pan de Azúcar', 'Aiguá']
      },
      {
        name: 'Colonia',
        cities: ['Colonia del Sacramento', 'Carmelo', 'Nueva Helvecia', 'Rosario', 'Juan Lacaze', 'Tarariras', 'Nueva Palmira']
      },
      {
        name: 'Salto',
        cities: ['Salto Capital', 'Constitución', 'Belén', 'Daymán']
      },
      {
        name: 'Paysandú',
        cities: ['Paysandú Capital', 'Guichón', 'Quebracho', 'Piedras Coloradas']
      },
      {
        name: 'San José',
        cities: ['San José de Mayo', 'Ciudad del Plata', 'Libertad', 'Rodríguez', 'Ecilda Paullier']
      },
      {
        name: 'Rocha',
        cities: ['Rocha Capital', 'Chuy', 'Castillos', 'La Paloma', 'Lascano', 'Punta del Diablo']
      },
      {
        name: 'Tacuarembó',
        cities: ['Tacuarembó Capital', 'Paso de los Toros', 'San Gregorio de Polanco']
      },
      {
        name: 'Rivera',
        cities: ['Rivera Capital', 'Tranqueras', 'Mandubí', 'Minas de Corrales']
      },
      {
        name: 'Lavalleja',
        cities: ['Minas', 'José Pedro Varela', 'Solís de Mataojo', 'Mariscala']
      },
      {
        name: 'Soriano',
        cities: ['Mercedes', 'Dolores', 'Cardona', 'Palmitas']
      },
      {
        name: 'Durazno',
        cities: ['Durazno Capital', 'Sarandí del Yí', 'Carmen']
      },
      {
        name: 'Cerro Largo',
        cities: ['Melo', 'Río Branco', 'Fraile Muerto']
      },
      {
        name: 'Artigas',
        cities: ['Artigas Capital', 'Bella Unión', 'Tomás Gomensoro']
      },
      {
        name: 'Río Negro',
        cities: ['Fray Bentos', 'Young', 'Nuevo Berlín', 'San Javier']
      },
      {
        name: 'Treinta y Tres',
        cities: ['Treinta y Tres Capital', 'Vergara', 'Santa Clara de Olimar']
      },
      {
        name: 'Florida',
        cities: ['Florida Capital', 'Sarandí Grande', 'Casupá', '25 de Agosto']
      },
      {
        name: 'Flores',
        cities: ['Trinidad', 'Ismael Cortinas']
      }
    ]
  },
  {
    name: 'España',
    code: 'ES',
    provincesLabel: 'Provincia / Comunidad',
    provinces: [
      {
        name: 'Madrid',
        cities: ['Madrid Capital', 'Móstoles', 'Alcalá de Henares', 'Fuenlabrada', 'Leganés', 'Getafe', 'Alcorcón', 'Torrejón de Ardoz', 'Parla', 'Alcobendas', 'Las Rozas', 'Pozuelo de Alarcón', 'San Sebastián de los Reyes']
      },
      {
        name: 'Barcelona',
        cities: ['Barcelona Capital', "L'Hospitalet de Llobregat", 'Badalona', 'Terrassa', 'Sabadell', 'Mataró', 'Santa Coloma de Gramenet', 'Sant Cugat del Vallès', 'Cornellà de Llobregat', 'Sant Boi de Llobregat', 'Castelldefels', 'Sitges', 'Granollers']
      },
      {
        name: 'Valencia',
        cities: ['Valencia Capital', 'Torrent', 'Gandia', 'Paterna', 'Sagunto', 'Alzira', 'Mislata', 'Burjassot', 'Ontinyent', 'Aldaia']
      },
      {
        name: 'Sevilla',
        cities: ['Sevilla Capital', 'Dos Hermanas', 'Alcalá de Guadaíra', 'Utrera', 'Mairena del Aljarafe', 'Écija', 'La Rinconada', 'Los Palacios y Villafranca', 'Coria del Río']
      },
      {
        name: 'Málaga',
        cities: ['Málaga Capital', 'Marbella', 'Mijas', 'Fuengirola', 'Vélez-Málaga', 'Torremolinos', 'Benalmádena', 'Estepona', 'Rincón de la Victoria', 'Antequera', 'Ronda']
      },
      {
        name: 'Alicante',
        cities: ['Alicante Capital', 'Elche', 'Torrevieja', 'Orihuela', 'Benidorm', 'Alcoy', 'San Vicente del Raspeig', 'Elda', 'Dénia', 'Villajoyosa', 'Santa Pola']
      },
      {
        name: 'Zaragoza',
        cities: ['Zaragoza Capital', 'Calatayud', 'Utebo', 'Ejea de los Caballeros', 'Tarazona', 'Caspe']
      },
      {
        name: 'Baleares',
        cities: ['Palma de Mallorca', 'Calvià', 'Ibiza', 'Manacor', 'Santa Eulària des Riu', 'Marratxí', 'Ciutadella de Menorca', 'Maó', 'Alcúdia']
      },
      {
        name: 'Las Palmas',
        cities: ['Las Palmas de Gran Canaria', 'Telde', 'Santa Lucía de Tirajana', 'Arrecife', 'San Bartolomé de Tirajana', 'Puerto del Rosario', 'Arucas']
      },
      {
        name: 'Santa Cruz de Tenerife',
        cities: ['Santa Cruz de Tenerife', 'San Cristóbal de La Laguna', 'Arona', 'Adeje', 'Granadilla de Abona', 'La Orotava', 'Los Realejos', 'Puerto de la Cruz']
      },
      {
        name: 'Vizcaya (Bizkaia)',
        cities: ['Bilbao', 'Barakaldo', 'Getxo', 'Portugalete', 'Santurtzi', 'Basauri', 'Leioa', 'Galdakao', 'Durango']
      },
      {
        name: 'Guipúzcoa (Gipuzkoa)',
        cities: ['San Sebastián (Donostia)', 'Irun', 'Errenteria', 'Eibar', 'Zarautz', 'Mondragón (Arrasate)', 'Hernani']
      },
      {
        name: 'A Coruña',
        cities: ['A Coruña Capital', 'Santiago de Compostela', 'Ferrol', 'Narón', 'Oleiros', 'Carballo', 'Arteixo', 'Ribeira', 'Culleredo']
      },
      {
        name: 'Pontevedra',
        cities: ['Vigo', 'Pontevedra Capital', 'Vilagarcía de Arousa', 'Redondela', 'Cangas', 'Marín', 'Ponteareas']
      },
      {
        name: 'Asturias',
        cities: ['Gijón', 'Oviedo', 'Avilés', 'Siero', 'Langreo', 'Mieres', 'Castrillón', 'San Martín del Rey Aurelio']
      },
      {
        name: 'Murcia',
        cities: ['Murcia Capital', 'Cartagena', 'Lorca', 'Molina de Segura', 'Alcantarilla', 'Torre-Pacheco', 'Águilas', 'Cieza', 'Yecla', 'San Javier']
      },
      {
        name: 'Cádiz',
        cities: ['Jerez de la Frontera', 'Algeciras', 'Cádiz Capital', 'San Fernando', 'El Puerto de Santa María', 'Chiclana de la Frontera', 'Sanlúcar de Barrameda', 'La Línea de la Concepción']
      },
      {
        name: 'Granada',
        cities: ['Granada Capital', 'Motril', 'Almuñécar', 'Armilla', 'Macarena', 'Loja', 'Baza', 'Guadix']
      },
      {
        name: 'Córdoba (España)',
        cities: ['Córdoba Capital', 'Lucena', 'Puente Genil', 'Montilla', 'Priego de Córdoba', 'Palma del Río', 'Cabra']
      },
      {
        name: 'Almería',
        cities: ['Almería Capital', 'Roquetas de Mar', 'El Ejido', 'Níjar', 'Vícar', 'Adra', 'Huércal-Overa']
      },
      {
        name: 'Valladolid',
        cities: ['Valladolid Capital', 'Laguna de Duero', 'Medina del Campo', 'Arroyo de la Encomienda', 'Tordesillas']
      },
      {
        name: 'Toledo',
        cities: ['Toledo Capital', 'Talavera de la Reina', 'Illescas', 'Seseña', 'Torrijos', 'Quintanar de la Orden']
      },
      {
        name: 'Navarra',
        cities: ['Pamplona', 'Tudela', 'Barañáin', 'Valle de Egüés', 'Burlada', 'Zizur Mayor', 'Estella']
      },
      {
        name: 'Cantabria',
        cities: ['Santander', 'Torrelavega', 'Castro-Urdiales', 'Camargo', 'Piélagos', 'El Astillero', 'Laredo']
      },
      {
        name: 'Castellón',
        cities: ['Castellón de la Plana', 'Vila-real', 'Burriana', 'La Vall d\'Uixó', 'Vinaròs', 'Benicarló', 'Almassora', 'Benicàssim']
      },
      {
        name: 'Tarragona',
        cities: ['Tarragona Capital', 'Reus', 'El Vendrell', 'Tortosa', 'Cambrils', 'Salou', 'Calafell', 'Valls', 'Amposta']
      },
      {
        name: 'Girona',
        cities: ['Girona Capital', 'Figueres', 'Blanes', 'Lloret de Mar', 'Olot', 'Salt', 'Palafrugell', 'Sant Feliu de Guíxols', 'Roses']
      },
      {
        name: 'Álava (Araba)',
        cities: ['Vitoria-Gasteiz', 'Laudio/Llodio', 'Amurrio', 'Salvatierra/Agurain']
      },
      {
        name: 'Badajoz',
        cities: ['Badajoz Capital', 'Mérida', 'Don Benito', 'Almendralejo', 'Villanueva de la Serena', 'Zafra', 'Montijo']
      },
      {
        name: 'Cáceres',
        cities: ['Cáceres Capital', 'Plasencia', 'Navalmoral de la Mata', 'Coria', 'Miajadas', 'Trujillo']
      },
      {
        name: 'Salamanca',
        cities: ['Salamanca Capital', 'Béjar', 'Ciudad Rodrigo', 'Santa Marta de Tormes', 'Villamayor']
      },
      {
        name: 'Burgos',
        cities: ['Burgos Capital', 'Miranda de Ebro', 'Aranda de Duero', 'Briviesca', 'Medina de Pomar']
      },
      {
        name: 'León',
        cities: ['León Capital', 'Ponferrada', 'San Andrés del Rabanedo', 'Villaquilambre', 'Astorga', 'La Bañeza']
      },
      {
        name: 'Huelva',
        cities: ['Huelva Capital', 'Lepe', 'Almonte', 'Moguer', 'Isla Cristina', 'Ayamonte', 'Cartaya']
      },
      {
        name: 'Jaén',
        cities: ['Jaén Capital', 'Linares', 'Andújar', 'Úbeda', 'Martos', 'Alcalá la Real', 'Baeza']
      },
      {
        name: 'Ciudad Real',
        cities: ['Ciudad Real Capital', 'Puertollano', 'Tomelloso', 'Alcázar de San Juan', 'Valdepeñas', 'Manzanares']
      },
      {
        name: 'Albacete',
        cities: ['Albacete Capital', 'Hellín', 'Villarrobledo', 'Almansa', 'La Roda']
      },
      {
        name: 'Guadalajara',
        cities: ['Guadalajara Capital', 'Azuqueca de Henares', 'Alovera', 'El Casar', 'Cabanillas del Campo']
      },
      {
        name: 'Cuenca',
        cities: ['Cuenca Capital', 'Tarancón', 'Quintanar del Rey', 'San Clemente']
      },
      {
        name: 'Lugo',
        cities: ['Lugo Capital', 'Monforte de Lemos', 'Viveiro', 'Vilalba', 'Sarria', 'Ribadeo']
      },
      {
        name: 'Ourense',
        cities: ['Ourense Capital', 'O Barco de Valdeorras', 'Verín', 'O Carballiño', 'Xinzo de Limia']
      },
      {
        name: 'La Rioja (España)',
        cities: ['Logroño', 'Calahorra', 'Arnedo', 'Haro', 'Alfaro', 'Nájera', 'Lardero']
      },
      {
        name: 'Lleida',
        cities: ['Lleida Capital', 'Tàrrega', 'Balaguer', 'Mollerussa', 'La Seu d\'Urgell']
      },
      {
        name: 'Huesca',
        cities: ['Huesca Capital', 'Monzón', 'Barbastro', 'Fraga', 'Jaca', 'Sabiñánigo']
      },
      {
        name: 'Teruel',
        cities: ['Teruel Capital', 'Alcañiz', 'Andorra', 'Calamocha', 'Calanda']
      },
      {
        name: 'Segovia',
        cities: ['Segovia Capital', 'El Espinar', 'Cuéllar', 'San Ildefonso', 'Palazuelos de Eresma']
      },
      {
        name: 'Ávila',
        cities: ['Ávila Capital', 'Arévalo', 'Arenas de San Pedro', 'Las Navas del Marqués']
      },
      {
        name: 'Palencia',
        cities: ['Palencia Capital', 'Aguilar de Campoo', 'Guardo', 'Venta de Baños', 'Villamuriel de Cerrato']
      },
      {
        name: 'Zamora',
        cities: ['Zamora Capital', 'Benavente', 'Toro', 'Morales del Vino']
      },
      {
        name: 'Soria',
        cities: ['Soria Capital', 'Almazán', 'Burgo de Osma']
      }
    ]
  }
];

export const OTHER_OPTION_VALUE = '__OTHER__';

export const getCountryData = (countryName?: string) => {
  if (!countryName) return COUNTRIES_DATA[0];
  return COUNTRIES_DATA.find(c => c.name.toLowerCase() === countryName.toLowerCase()) || COUNTRIES_DATA[0];
};

export const getProvincesForCountry = (countryName?: string) => {
  const country = getCountryData(countryName);
  return country ? country.provinces : [];
};

export const getCitiesForProvince = (countryName?: string, provinceName?: string) => {
  if (!provinceName) return [];
  const provinces = getProvincesForCountry(countryName);
  const prov = provinces.find(p => p.name.toLowerCase() === provinceName.toLowerCase());
  return prov ? prov.cities : [];
};
