/** Spots do festival · São Cristóvão SE (mesmo fallback do web) */
export const SPOTS_FALLBACK = [
  { id: 'convento-sao-francisco', name: 'Convento São Francisco', lat: -11.0149, lng: -37.2047, status: 'rolando agora', radius: 100 },
  { id: 'praca-sao-francisco', name: 'Praça São Francisco', lat: -11.0152, lng: -37.2052, status: '62% pronto', radius: 120 },
  { id: 'igreja-matriz', name: 'Igreja Matriz', lat: -11.0138, lng: -37.2068, status: 'vai rolar às 23h', radius: 90 },
  { id: 'largo-amparo', name: 'Largo do Amparo', lat: -11.0165, lng: -37.2075, status: 'terminou', radius: 85 },
  { id: 'casa-do-sabao', name: 'Rua da Feira', lat: -11.014, lng: -37.208, status: 'rolando agora', radius: 95 },
];

export const MAP_CENTER = {
  latitude: -11.0152,
  longitude: -37.2052,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018,
};

export const POIS = [
  { id: 'hosp-solar', name: 'Solar dos Coqueiros', lat: -11.0132, lng: -37.2038, layer: 'hospedagem', desc: 'Pousada centro histórico' },
  { id: 'gastro-pordosol', name: 'Restaurante Pôr do Sol', lat: -11.0168, lng: -37.2025, layer: 'gastronomia', desc: 'Ladeira Porto da Banca' },
  { id: 'gastro-mangue', name: 'Bar do Mangue', lat: -11.0155, lng: -37.2048, layer: 'gastronomia', desc: 'Perto da Praça São Francisco' },
];
