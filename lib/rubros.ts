export const RUBROS = [
  "Hotel",
  "Bar/Restaurante",
  "Escuela de Ski",
  "Tienda",
  "Rental",
  "Centro de Ski",
  "Spa/Bienestar",
  "Guardería/Childcare",
  "Otro",
] as const;

export type Rubro = typeof RUBROS[number];

export function categorizeEmployer(types: string[], name: string): Rubro {
  const n = name.toLowerCase();

  if (types.some(t => ['lodging', 'hotel', 'motel', 'hostel', 'resort_hotel'].includes(t)))
    return 'Hotel';
  if (types.some(t => ['restaurant', 'bar', 'cafe', 'food', 'meal_takeaway', 'meal_delivery', 'night_club'].includes(t)))
    return 'Bar/Restaurante';
  if (types.some(t => ['spa', 'beauty_salon', 'gym', 'health'].includes(t)))
    return 'Spa/Bienestar';
  if (types.some(t => ['child_care_agency'].includes(t)))
    return 'Guardería/Childcare';
  if (types.some(t => ['store', 'clothing_store', 'shoe_store', 'sporting_goods_store', 'shopping_mall', 'department_store'].includes(t)))
    return 'Tienda';

  if (/ski[\s-]?school|école[\s-]?de[\s-]?ski|esf\b|esi\b|snowboard[\s-]?school/i.test(n))
    return 'Escuela de Ski';
  if (/rental|location[\s-]?ski|ski[\s-]?rent|alquiler/i.test(n))
    return 'Rental';
  if (/lift|télésiège|télécabine|téléphérique|remontée|funitel|3[\s-]?vallée|ski[\s-]?area|ski[\s-]?resort|centre[\s-]?ski/i.test(n))
    return 'Centro de Ski';

  if (/hotel|hôtel|chalet|résidence|lodge|auberge/i.test(n)) return 'Hotel';
  if (/restaurant|bar\b|café|brasserie|pizz|sushi|burger|boîte|disco|club/i.test(n)) return 'Bar/Restaurante';
  if (/spa|sauna|massag|bien-être|wellness|fitness|gym/i.test(n)) return 'Spa/Bienestar';
  if (/boutique|magasin|shop\b|store\b/i.test(n)) return 'Tienda';

  return 'Otro';
}
