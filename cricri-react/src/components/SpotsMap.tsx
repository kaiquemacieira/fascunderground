import { useEffect, useRef } from 'react';
import type { Spot } from '../lib/spots';
import { statusKind } from '../lib/spots';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const CENTER: [number, number] = [-11.015, -37.206];
const ZOOM = 15;

// Leaflet carregado via CDN (sem depender de node_modules)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletNS = any;

declare global {
  interface Window {
    L?: LeafletNS;
  }
}

function loadLeaflet(): Promise<LeafletNS> {
  return new Promise((resolve, reject) => {
    if (window.L?.map) {
      resolve(window.L);
      return;
    }

    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.L) resolve(window.L);
        else reject(new Error('Leaflet failed'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error('Leaflet failed'));
    };
    script.onerror = () => reject(new Error('Leaflet load error'));
    document.head.appendChild(script);
  });
}

function markerColor(status: string): string {
  switch (statusKind(status)) {
    case 'live':
      return '#C1523E';
    case 'soon':
      return '#3E8F5F';
    case 'progress':
      return '#d49a2c';
    case 'done':
      return '#666';
    default:
      return '#8a7a6a';
  }
}

interface SpotsMapProps {
  spots: Spot[];
  selectedId?: string | null;
  onSelect?: (spot: Spot) => void;
}

export function SpotsMap({ spots, selectedId, onSelect }: SpotsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{
    map: LeafletNS;
    markers: Map<string, LeafletNS>;
  } | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;
      try {
        const L = await loadLeaflet();
        if (cancelled || !containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
          zoomControl: false,
          attributionControl: true,
        }).setView(CENTER, ZOOM);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = { map, markers: new Map() };
        setTimeout(() => map.invalidateSize(), 120);
      } catch (e) {
        console.warn('[CRICRI map]', e);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.map.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const ctx = mapRef.current;
    if (!ctx || !window.L) return;
    const L = window.L;
    const { map, markers } = ctx;

    markers.forEach((m) => m.remove());
    markers.clear();

    spots.forEach((spot) => {
      if (!Number.isFinite(spot.lat) || !Number.isFinite(spot.lng)) return;

      const color = markerColor(spot.status);
      const cm = L.circleMarker([spot.lat, spot.lng], {
        radius: selectedId === spot.id ? 12 : 9,
        color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: selectedId === spot.id ? 3 : 2,
      });

      cm.bindPopup(
        `<strong>${escapeHtml(spot.name)}</strong><br/><span style="opacity:.75">${escapeHtml(spot.status)}</span>`
      );
      cm.on('click', () => onSelectRef.current?.(spot));
      cm.addTo(map);
      markers.set(spot.id, cm);
    });

    if (spots.length > 0) {
      const bounds = L.latLngBounds(spots.map((s) => [s.lat, s.lng]));
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.2));
      }
    }
  }, [spots, selectedId]);

  useEffect(() => {
    const ctx = mapRef.current;
    if (!ctx || !selectedId) return;
    const m = ctx.markers.get(selectedId);
    if (m) {
      ctx.map.panTo(m.getLatLng());
      m.openPopup();
    }
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      className="spots-map"
      role="region"
      aria-label="Mapa de spots de São Cristóvão"
    />
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
