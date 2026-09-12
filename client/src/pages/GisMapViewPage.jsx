import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Map as MapIcon,
  Layers,
  Filter,
  Eye,
  RefreshCw,
  Info,
  Maximize2,
} from 'lucide-react';
import L from 'leaflet';

import { gisApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const STATUS_COLORS = {
  PUBLISHED: { color: '#10b981', fill: '#10b981', fillOpacity: 0.4 },
  VALIDATED: { color: '#3b82f6', fill: '#3b82f6', fillOpacity: 0.4 },
  NEEDS_VERIFICATION: { color: '#f59e0b', fill: '#f59e0b', fillOpacity: 0.45 },
  DEFAULT: { color: '#64748b', fill: '#64748b', fillOpacity: 0.3 },
};

export default function GisMapViewPage() {
  const { t, i18n } = useTranslation();
  const isHi = i18n.resolvedLanguage === 'hi';

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geoJsonLayerRef = useRef(null);

  const [district, setDistrict] = useState('Pune');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [featuresCount, setFeaturesCount] = useState(0);
  const [selectedParcel, setSelectedParcel] = useState(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [18.5204, 73.8567], // Pune center
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors | BhumiDrishti Cadastre',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Fetch GeoJSON and Render
  const loadPlots = async () => {
    try {
      setLoading(true);
      const params = {};
      if (district) params.district = district;
      if (status) params.status = status;

      const res = await gisApi.getPlots(params);
      if (res.success && res.data && mapInstanceRef.current) {
        const geojson = res.data;
        setFeaturesCount(geojson.features?.length || 0);

        // Remove previous GeoJSON layer
        if (geoJsonLayerRef.current) {
          mapInstanceRef.current.removeLayer(geoJsonLayerRef.current);
        }

        const layer = L.geoJSON(geojson, {
          style: (feature) => {
            const st = feature.properties?.status;
            const styleConf = STATUS_COLORS[st] || STATUS_COLORS.DEFAULT;
            return {
              color: styleConf.color,
              weight: 2,
              opacity: 0.9,
              fillColor: styleConf.fill,
              fillOpacity: styleConf.fillOpacity,
            };
          },
          onEachFeature: (feature, l) => {
            const props = feature.properties || {};
            l.on({
              mouseover: (e) => {
                const target = e.target;
                target.setStyle({ weight: 3.5, fillOpacity: 0.7 });
              },
              mouseout: (e) => {
                layer.resetStyle(e.target);
              },
              click: () => {
                setSelectedParcel(props);
              },
            });

            // Bind popup
            l.bindPopup(`
              <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
                <div style="font-weight: bold; color: #1e3a8a; margin-bottom: 2px;">
                  Survey No: ${props.surveyNumber || '—'}
                </div>
                <div><strong>Khasra:</strong> ${props.khasraNumber || '—'}</div>
                <div><strong>Owner:</strong> ${props.ownerName || '—'}</div>
                <div><strong>Area:</strong> ${props.plotArea?.value || '—'} ${props.plotArea?.unit || ''}</div>
                <div><strong>Status:</strong> <span style="font-weight: 600;">${props.status || '—'}</span></div>
                <div style="margin-top: 6px;">
                  <a href="/records/${props.recordId}" style="color: #2563eb; text-decoration: underline;">
                    View Record Details →
                  </a>
                </div>
              </div>
            `);
          },
        }).addTo(mapInstanceRef.current);

        geoJsonLayerRef.current = layer;

        // Auto-fit bounds if features exist
        if (geojson.features && geojson.features.length > 0) {
          const bounds = layer.getBounds();
          if (bounds.isValid()) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load GIS plots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlots();
  }, [district, status]);

  return (
    <div className="flex h-[calc(100vh-4.5rem)] flex-col overflow-hidden bg-paper">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-line bg-white px-6 py-2.5">
        <div className="flex items-center gap-2">
          <MapIcon size={18} className="text-register-700" />
          <h1 className="font-serif text-base font-bold text-ink">
            {isHi ? 'भू-नक्शा (GIS Cadastral Map View)' : 'GIS Cadastral Plot Visualizer'}
          </h1>
          <span className="rounded bg-register-50 px-2 py-0.5 text-xs font-medium text-register-700">
            {featuresCount} Parcels Loaded
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="rounded border border-paper-line bg-white px-2.5 py-1 text-xs font-medium text-ink focus:border-register-500 focus:outline-none"
          >
            <option value="">All Districts</option>
            <option value="Pune">District Pune (Maharashtra)</option>
            <option value="Nagpur">District Nagpur (Maharashtra)</option>
            <option value="Varanasi">District Varanasi (Uttar Pradesh)</option>
            <option value="Lucknow">District Lucknow (Uttar Pradesh)</option>
            <option value="Jaipur">District Jaipur (Rajasthan)</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded border border-paper-line bg-white px-2.5 py-1 text-xs font-medium text-ink focus:border-register-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PUBLISHED">Published (Green)</option>
            <option value="VALIDATED">Validated (Blue)</option>
            <option value="NEEDS_VERIFICATION">Needs Verification (Amber)</option>
          </select>

          <button
            type="button"
            onClick={loadPlots}
            className="flex items-center gap-1 rounded border border-paper-line bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-slate-50"
            title="Refresh Map Layers"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* Map + Side Inspector Panel */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Leaflet Map Canvas */}
        <div ref={mapContainerRef} className="h-full w-full z-0" />

        {/* Floating Map Legend Overlay */}
        <div className="absolute bottom-6 left-6 z-[1000] rounded-md border border-paper-line bg-white/95 p-3.5 shadow-lg backdrop-blur-sm text-xs">
          <p className="font-semibold text-ink">Cadastral Parcel Legend</p>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="h-3 w-4 rounded border border-emerald-600 bg-emerald-400/50" />
              <span>Published (सार्वजनिक रूप से प्रकाशित)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-4 rounded border border-blue-600 bg-blue-400/50" />
              <span>Validated (राजस्व अधिकारी सत्यापित)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-4 rounded border border-amber-600 bg-amber-400/50" />
              <span>Needs Verification (जाँच लंबित)</span>
            </div>
          </div>
        </div>

        {/* Floating Parcel Inspector Drawer (when parcel clicked) */}
        {selectedParcel && (
          <div className="absolute right-6 top-6 z-[1000] w-80 rounded-md border border-paper-line bg-white/95 p-4 shadow-xl backdrop-blur-sm text-xs">
            <div className="flex items-center justify-between border-b border-paper-line pb-2">
              <span className="font-mono font-bold text-register-800">
                Survey No: {selectedParcel.surveyNumber}
              </span>
              <button
                onClick={() => setSelectedParcel(null)}
                className="text-ink-soft hover:text-ink font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-2 text-ink">
              <div className="flex justify-between">
                <span className="text-ink-soft">Khasra Number:</span>
                <span className="font-mono font-semibold">{selectedParcel.khasraNumber || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Registered Owner:</span>
                <span className="font-semibold">{selectedParcel.ownerName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Location:</span>
                <span>
                  {selectedParcel.village}, {selectedParcel.district}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Plot Area:</span>
                <span className="font-mono font-semibold">
                  {selectedParcel.plotArea?.value} {selectedParcel.plotArea?.unit}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-ink-soft">Status:</span>
                <StatusBadge status={selectedParcel.status} />
              </div>
            </div>

            <div className="mt-4 border-t border-paper-line pt-2">
              <Link
                to={`/records/${selectedParcel.recordId}`}
                className="flex w-full items-center justify-center gap-1.5 rounded bg-register-700 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-register-800"
              >
                <Eye size={13} />
                Open Full Land Title
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
