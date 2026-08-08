import { supabase } from './supabase';

export interface Spot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  status: string;
}

/** Fallback São Cristóvão (mesmo do vanilla) */
export const SPOTS_FALLBACK: Spot[] = [
  {
    id: 'convento-sao-francisco',
    name: 'Convento São Francisco',
    lat: -11.0149,
    lng: -37.2047,
    status: 'rolando agora',
    radius: 100,
  },
  {
    id: 'praca-sao-francisco',
    name: 'Praça São Francisco',
    lat: -11.0152,
    lng: -37.2052,
    status: '62% pronto',
    radius: 120,
  },
  {
    id: 'igreja-matriz',
    name: 'Igreja Matriz',
    lat: -11.0138,
    lng: -37.2068,
    status: 'vai rolar às 23h',
    radius: 90,
  },
  {
    id: 'largo-amparo',
    name: 'Largo do Amparo',
    lat: -11.0165,
    lng: -37.2075,
    status: 'terminou',
    radius: 85,
  },
  {
    id: 'casa-do-sabao',
    name: 'Rua da Feira',
    lat: -11.014,
    lng: -37.208,
    status: 'rolando agora',
    radius: 95,
  },
];

function normalize(row: Record<string, unknown>): Spot {
  return {
    id: String(row.slug || row.id),
    name: String(row.name || 'Spot'),
    lat: Number(row.lat),
    lng: Number(row.lng),
    radius: Number(row.radius_m != null ? row.radius_m : row.radius) || 90,
    status: String(row.status || 'sem info'),
  };
}

export async function fetchSpots(): Promise<Spot[]> {
  try {
    const { data, error } = await supabase
      .from('spots')
      .select('id, slug, name, lat, lng, radius_m, status')
      .order('name');

    if (error) throw error;
    if (!data?.length) return SPOTS_FALLBACK.map((s) => ({ ...s }));
    return data.map((row) => normalize(row as Record<string, unknown>));
  } catch {
    return SPOTS_FALLBACK.map((s) => ({ ...s }));
  }
}

/** Classe visual do status (para chip no mapa/lista) */
export function statusKind(status: string): 'live' | 'soon' | 'done' | 'progress' | 'neutral' {
  const s = status.toLowerCase();
  if (s.includes('rolando') || s.includes('ao vivo') || s === 'rolando') return 'live';
  if (s.includes('vai') || s.includes('em breve')) return 'soon';
  if (s.includes('termin') || s.includes('acabou') || s.includes('fim')) return 'done';
  if (s.includes('%') || s.includes('progresso') || s.includes('pronto')) return 'progress';
  return 'neutral';
}
