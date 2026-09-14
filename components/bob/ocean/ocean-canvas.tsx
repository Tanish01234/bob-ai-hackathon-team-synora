"use client";

import React, { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { VesselState, WeatherZone, DisruptionZone, MapLayersConfig, ZoomPreset } from "./types";
import { MARITIME_WEATHER_ZONES, MARITIME_DISRUPTIONS, ZOOM_LEVEL_MAP, RISK_COLOR_HEX } from "./constants";
import type { RouteSegment, AlternativeRoute } from "@/lib/types/api";
import { getMapTileConfig } from "@/lib/map-config";

interface OceanCanvasProps {
  vessels: VesselState[];
  selectedShipmentId: string | null;
  onSelectVessel: (shipmentId: string) => void;
  onSelectWeather?: (zone: WeatherZone) => void;
  onSelectDisruption?: (disruption: DisruptionZone) => void;
  activeRouteSegments?: RouteSegment[];
  alternativeRoutes?: AlternativeRoute[];
  followVessel: boolean;
  zoomPreset: ZoomPreset;
  onZoomChange: (preset: ZoomPreset) => void;
  layers: MapLayersConfig;
}

export function OceanCanvas({
  vessels,
  selectedShipmentId,
  onSelectVessel,
  onSelectWeather,
  onSelectDisruption,
  activeRouteSegments = [],
  alternativeRoutes = [],
  followVessel,
  zoomPreset,
  onZoomChange,
  layers,
}: OceanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  // Sub-layer groups
  const weatherGroupRef = useRef<any>(null);
  const disruptionGroupRef = useRef<any>(null);
  const routesGroupRef = useRef<any>(null);
  const vesselsGroupRef = useRef<any>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || !containerRef.current || mapRef.current) return;
      LRef.current = L;

      // Fix default leaflet icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const initialZoom = ZOOM_LEVEL_MAP[zoomPreset] || 4;
      const map = L.map(containerRef.current, {
        center: [16.0, 68.0],
        zoom: initialZoom,
        minZoom: 2,
        maxZoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      // Sleek dark maritime tiles (clean keyless fallback or configured provider)
      const tileConfig = getMapTileConfig();
      L.tileLayer(tileConfig.url, tileConfig.options).addTo(map);

      // Layer groups for clean management
      weatherGroupRef.current = L.layerGroup().addTo(map);
      disruptionGroupRef.current = L.layerGroup().addTo(map);
      routesGroupRef.current = L.layerGroup().addTo(map);
      vesselsGroupRef.current = L.layerGroup().addTo(map);

      // Listen to manual user zoom to update preset pill
      map.on("zoomend", () => {
        const currentZ = map.getZoom();
        if (currentZ <= 3) onZoomChange(60);
        else if (currentZ === 4) onZoomChange(80);
        else if (currentZ === 5 || currentZ === 6) onZoomChange(100);
        else if (currentZ === 7 || currentZ === 8) onZoomChange(120);
        else onZoomChange(150);
      });

      mapRef.current = map;
    });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync zoomPreset changes to map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const targetZoom = ZOOM_LEVEL_MAP[zoomPreset];
    if (map.getZoom() !== targetZoom) {
      map.setZoom(targetZoom, { animate: true });
    }
  }, [zoomPreset]);

  // Render Weather Layer
  useEffect(() => {
    const L = LRef.current;
    const group = weatherGroupRef.current;
    if (!L || !group) return;

    group.clearLayers();
    if (!layers.weather) return;

    MARITIME_WEATHER_ZONES.forEach((zone) => {
      let strokeColor = "#38BDF8";
      let fillColor = "#0284C7";
      let icon = "☁️";

      if (zone.condition === "storm") {
        strokeColor = "#EF4444";
        fillColor = "#7F1D1D";
        icon = "⛈️";
      } else if (zone.condition === "rain") {
        strokeColor = "#06B6D4";
        fillColor = "#083344";
        icon = "🌧️";
      } else if (zone.condition === "fog") {
        strokeColor = "#94A3B8";
        fillColor = "#334155";
        icon = "🌫️";
      } else {
        strokeColor = "#10B981";
        fillColor = "#064E3B";
        icon = "☀️";
      }

      // Outer boundary circle
      const circle = L.circle([zone.lat, zone.lng], {
        radius: zone.radius_km * 1000,
        color: strokeColor,
        weight: 1.5,
        dashArray: zone.condition === "storm" ? "4, 6" : undefined,
        fillColor: fillColor,
        fillOpacity: zone.condition === "storm" ? 0.22 : 0.12,
      }).addTo(group);

      circle.on("click", () => {
        if (onSelectWeather) onSelectWeather(zone);
      });

      // Weather center tag
      const weatherLabelHtml = `
        <div class="px-2 py-1 rounded bg-[#0A0F1E]/85 border border-[#1E2D4A] text-xs font-mono text-slate-200 flex items-center gap-1.5 shadow-lg cursor-pointer hover:border-cyan-400 transition-colors backdrop-blur-md">
          <span>${icon}</span>
          <span class="font-semibold uppercase tracking-wider text-[10px]">${zone.condition}</span>
          <span class="text-[10px] text-cyan-400 font-mono">${zone.wind_speed_kmh} km/h</span>
        </div>
      `;
      const labelIcon = L.divIcon({
        className: "ocean-weather-tag",
        html: weatherLabelHtml,
        iconSize: [110, 24],
        iconAnchor: [55, 12],
      });

      const marker = L.marker([zone.lat, zone.lng], { icon: labelIcon }).addTo(group);
      marker.on("click", () => {
        if (onSelectWeather) onSelectWeather(zone);
      });
    });
  }, [layers.weather, onSelectWeather]);

  // Render Disruption Layer
  useEffect(() => {
    const L = LRef.current;
    const group = disruptionGroupRef.current;
    if (!L || !group) return;

    group.clearLayers();
    if (!layers.disruptions) return;

    MARITIME_DISRUPTIONS.forEach((dis) => {
      const isCritical = dis.severity === "critical" || dis.severity === "high";
      const ringColor = isCritical ? "#EF4444" : "#F59E0B";

      // Pulsing warning ring
      const circle = L.circle([dis.lat, dis.lng], {
        radius: dis.radius_km * 1000,
        color: ringColor,
        weight: 2,
        dashArray: "6, 6",
        fillColor: ringColor,
        fillOpacity: 0.18,
      }).addTo(group);

      circle.on("click", () => {
        if (onSelectDisruption) onSelectDisruption(dis);
      });

      // Disruption center radar ping marker
      const pinHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          <span class="absolute w-8 h-8 rounded-full ${isCritical ? "bg-red-500/30" : "bg-amber-500/30"} animate-ping"></span>
          <div class="w-6 h-6 rounded-full ${isCritical ? "bg-red-600" : "bg-amber-500"} border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
            ⚠
          </div>
          <div class="absolute left-8 px-2 py-0.5 rounded bg-[#0B1120]/90 border border-[#1E2D4A] text-[10px] text-slate-200 whitespace-nowrap shadow-md pointer-events-none">
            <span class="font-bold ${isCritical ? "text-red-400" : "text-amber-400"}">${dis.name}</span>
            <span class="ml-1 text-slate-400">(${dis.affected_count} affected)</span>
          </div>
        </div>
      `;

      const pinIcon = L.divIcon({
        className: "ocean-disruption-tag",
        html: pinHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([dis.lat, dis.lng], { icon: pinIcon }).addTo(group);
      marker.on("click", () => {
        if (onSelectDisruption) onSelectDisruption(dis);
      });
    });
  }, [layers.disruptions, onSelectDisruption]);

  // Render Route Highlighting for Selected Vessel
  useEffect(() => {
    const L = LRef.current;
    const group = routesGroupRef.current;
    if (!L || !group) return;

    group.clearLayers();
    if (!layers.routes || !selectedShipmentId) return;

    const selectedVessel = vessels.find((v) => v.shipment_id === selectedShipmentId);
    if (!selectedVessel) return;

    // Collect coordinates from activeRouteSegments
    const latLngs: [number, number][] = [];
    if (activeRouteSegments.length > 0) {
      activeRouteSegments.forEach((seg, idx) => {
        if (seg.start_coordinate?.lat != null && seg.start_coordinate?.lng != null) {
          latLngs.push([seg.start_coordinate.lat, seg.start_coordinate.lng]);
        }
        if (idx === activeRouteSegments.length - 1 && seg.end_coordinate?.lat != null && seg.end_coordinate?.lng != null) {
          latLngs.push([seg.end_coordinate.lat, seg.end_coordinate.lng]);
        }
      });
    }

    if (latLngs.length > 1) {
      // Completed Leg: Solid subtle slate/navy line
      L.polyline(latLngs, {
        color: "#38BDF8",
        weight: 3,
        opacity: 0.8,
        dashArray: "5, 10",
        lineCap: "round",
      }).addTo(group);

      // Glowing Active Corridor
      L.polyline(latLngs, {
        color: "#00D4FF",
        weight: 6,
        opacity: 0.35,
        lineCap: "round",
      }).addTo(group);

      // Port endpoints
      const originPt = latLngs[0];
      const destPt = latLngs[latLngs.length - 1];

      const originMarker = L.circleMarker(originPt, {
        radius: 5,
        fillColor: "#38BDF8",
        color: "#FFFFFF",
        weight: 1.5,
        fillOpacity: 1,
      }).addTo(group);
      originMarker.bindTooltip(`Origin: ${selectedVessel.origin}`, { permanent: false, direction: "top" });

      const destMarker = L.circleMarker(destPt, {
        radius: 5,
        fillColor: "#10B981",
        color: "#FFFFFF",
        weight: 1.5,
        fillOpacity: 1,
      }).addTo(group);
      destMarker.bindTooltip(`Destination: ${selectedVessel.destination}`, { permanent: false, direction: "top" });
    }

    // Alternative Route Overlays
    if (alternativeRoutes.length > 0) {
      alternativeRoutes.forEach((alt) => {
        if (alt.waypoints && alt.waypoints.length > 1) {
          const altCoords: [number, number][] = alt.waypoints.map((w) => [w.lat, w.lng]);
          L.polyline(altCoords, {
            color: "#F59E0B",
            weight: 3,
            dashArray: "6, 8",
            opacity: 0.9,
          }).addTo(group);

          // Alt route midpoint label
          const midIdx = Math.floor(altCoords.length / 2);
          const mid = altCoords[midIdx];
          const altTagHtml = `
            <div class="px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/50 text-[10px] text-amber-300 font-mono shadow-lg whitespace-nowrap">
              ✦ ${alt.name} (+${alt.estimated_duration_days}d)
            </div>
          `;
          L.marker(mid, {
            icon: L.divIcon({ className: "alt-route-tag", html: altTagHtml, iconSize: [140, 20], iconAnchor: [70, 10] }),
          }).addTo(group);
        }
      });
    }
  }, [layers.routes, selectedShipmentId, vessels, activeRouteSegments, alternativeRoutes]);

  // Render 250 Vessels Layer with Level-of-Detail (LOD)
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const group = vesselsGroupRef.current;
    if (!L || !group || !map) return;

    group.clearLayers();
    const currentZoom = map.getZoom();

    vessels.forEach((v) => {
      if (v.latitude == null || v.longitude == null || (v.latitude === 0 && v.longitude === 0)) {
        return;
      }

      const isSelected = v.shipment_id === selectedShipmentId;
      const riskColor = RISK_COLOR_HEX[v.risk] || RISK_COLOR_HEX.normal;
      const isCritical = v.risk === "critical";

      // ── Level of Detail (LOD) Marker Construction ────────────────
      if (currentZoom <= 4 && !isSelected) {
        // Zoom 60%–80%: Compact Tactical Radar Dot
        const marker = L.circleMarker([v.latitude, v.longitude], {
          radius: isCritical ? 5 : 3.5,
          fillColor: riskColor,
          color: isCritical ? "#FFFFFF" : "#0A0F1E",
          weight: 1,
          fillOpacity: 0.95,
        }).addTo(group);

        marker.on("click", () => onSelectVessel(v.shipment_id));
        marker.bindTooltip(
          `<div class="text-xs font-mono"><b>${v.shipment_id}</b> (${v.carrier})<br/>${v.origin} → ${v.destination}<br/><span style="color:${riskColor}">${v.risk.toUpperCase()}</span> | ${v.current_speed_knots} kn</div>`,
          { direction: "top", offset: [0, -5] }
        );
      } else if (currentZoom <= 6 && !isSelected) {
        // Zoom 100%: Vessel Marker with ID Pill & Speed
        const html = `
          <div class="relative flex items-center group cursor-pointer">
            <div class="w-3.5 h-3.5 rounded-full border border-slate-900 shadow-md flex items-center justify-center" style="background-color: ${riskColor}">
              <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
            ${layers.labels ? `
              <div class="ml-1.5 px-1.5 py-0.5 rounded bg-[#0A0F1E]/90 border border-[#1E2D4A] text-[9px] font-mono text-slate-200 shadow-md whitespace-nowrap group-hover:border-cyan-400 transition-colors">
                <span class="font-bold">${v.shipment_id}</span>
                <span class="text-slate-400 ml-1">${v.current_speed_knots.toFixed(1)}k</span>
              </div>
            ` : ""}
          </div>
        `;
        const icon = L.divIcon({
          className: "ocean-vessel-marker",
          html,
          iconSize: [70, 20],
          iconAnchor: [7, 10],
        });

        const marker = L.marker([v.latitude, v.longitude], { icon }).addTo(group);
        marker.on("click", () => onSelectVessel(v.shipment_id));
      } else {
        // Zoom 120%–150% OR Selected: Full Detailed Vessel Silhouette & Halo
        const html = `
          <div class="relative flex flex-col items-center cursor-pointer group">
            ${isSelected ? `
              <span class="absolute -top-3 -bottom-3 -left-3 -right-3 rounded-full bg-cyan-500/25 animate-ping pointer-events-none"></span>
              <div class="absolute -inset-2 rounded-full border border-cyan-400/80 animate-pulse pointer-events-none"></div>
            ` : ""}
            <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-xl transition-transform transform group-hover:scale-110"
                 style="background-color: ${isSelected ? "#00D4FF" : riskColor}; border-color: ${isSelected ? "#FFFFFF" : "#0A0F1E"}">
              <svg class="w-3.5 h-3.5 ${isSelected ? "text-slate-950" : "text-white"}" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4 20L12 17L20 20L12 2Z" />
              </svg>
            </div>
            ${(layers.labels || isSelected) ? `
              <div class="mt-1 px-2 py-0.5 rounded bg-[#0A0F1E]/95 border ${isSelected ? "border-cyan-400 text-cyan-300 ring-2 ring-cyan-500/20" : "border-[#1E2D4A] text-slate-200"} text-[10px] font-mono shadow-2xl whitespace-nowrap flex items-center gap-1.5 backdrop-blur-md">
                <span class="font-bold">${v.shipment_id}</span>
                <span class="text-slate-400">|</span>
                <span>${v.current_speed_knots.toFixed(1)} kn</span>
                <span class="text-xs ${v.risk === 'critical' ? 'text-red-400' : v.risk === 'high' ? 'text-orange-400' : 'text-emerald-400'}">●</span>
              </div>
            ` : ""}
          </div>
        `;

        const icon = L.divIcon({
          className: "ocean-vessel-detailed",
          html,
          iconSize: [80, 40],
          iconAnchor: [40, 12],
        });

        const marker = L.marker([v.latitude, v.longitude], { icon, zIndexOffset: isSelected ? 1000 : 100 }).addTo(group);
        marker.on("click", () => onSelectVessel(v.shipment_id));
      }
    });

    // Follow Vessel Camera Handling
    if (followVessel && selectedShipmentId) {
      const selected = vessels.find((v) => v.shipment_id === selectedShipmentId);
      if (selected && selected.latitude && selected.longitude) {
        map.panTo([selected.latitude, selected.longitude], { animate: true, duration: 0.8 });
      }
    }
  }, [vessels, selectedShipmentId, followVessel, layers.labels, onSelectVessel]);

  // Handle focusing when a vessel is initially selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedShipmentId) return;

    const vessel = vessels.find((v) => v.shipment_id === selectedShipmentId);
    if (vessel && vessel.latitude && vessel.longitude) {
      map.flyTo([vessel.latitude, vessel.longitude], Math.max(map.getZoom(), 6), {
        duration: 1.2,
      });
    }
  }, [selectedShipmentId]);

  return (
    <div className="relative w-full h-full bg-[#070B14] overflow-hidden select-none">
      {/* Interactive Leaflet Ocean Container */}
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Subtle Maritime Radar Sweep Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.06)_0%,transparent_70%)]" />

      {/* Bathymetry Grid Ticks / Maritime Coordinates Indicator */}
      <div className="absolute bottom-3 left-4 pointer-events-none z-10 flex items-center gap-3 text-[10px] font-mono text-slate-500 bg-[#0A0F1E]/80 px-2.5 py-1 rounded border border-[#1E2D4A]/60 backdrop-blur-md">
        <span>CARTOGRAPHY: CARTO-DARK</span>
        <span>•</span>
        <span>MERCATOR WGS-84</span>
        <span>•</span>
        <span>LOD: ACTIVE</span>
      </div>
    </div>
  );
}
