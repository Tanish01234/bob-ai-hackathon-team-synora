"use client";

import React, { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { RouteSegment, TrackingResponse, AlternativeRoute } from "@/lib/types/api";

interface TrackingMapProps {
  tracking: TrackingResponse | null;
  segments?: RouteSegment[];
  alternativeRoutes?: AlternativeRoute[];
  className?: string;
}

export function TrackingMap({
  tracking,
  segments = [],
  alternativeRoutes = [],
  className = "h-[420px] w-full",
}: TrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    // Dynamically import Leaflet to avoid SSR window errors
    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Initialize map if not already created
      if (!mapInstanceRef.current) {
        const defaultCenter: [number, number] = tracking?.current_position
          ? [tracking.current_position.lat, tracking.current_position.lng]
          : [20.0, 0.0];

        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 4,
          zoomControl: false,
          attributionControl: false,
        });

        // Add custom zoom control in bottom right
        L.control.zoom({ position: "bottomright" }).addTo(map);

        // Add sleek CartoDB Dark Matter tiles
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            maxZoom: 19,
            subdomains: "abcd",
          }
        ).addTo(map);

        const layerGroup = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
        layerGroupRef.current = layerGroup;
      }

      const map = mapInstanceRef.current;
      const layerGroup = layerGroupRef.current;
      if (!map || !layerGroup) return;

      // Clear previous markers & polylines
      layerGroup.clearLayers();

      const routeSegments = segments.length > 0 ? segments : tracking?.route_segments || [];
      const latLngs: [number, number][] = [];

      // Collect path coordinates
      routeSegments.forEach((seg: RouteSegment, idx: number) => {
        if (seg.start_coordinate?.lat != null && seg.start_coordinate?.lng != null) {
          latLngs.push([seg.start_coordinate.lat, seg.start_coordinate.lng]);
        }
        if (idx === routeSegments.length - 1 && seg.end_coordinate?.lat != null && seg.end_coordinate?.lng != null) {
          latLngs.push([seg.end_coordinate.lat, seg.end_coordinate.lng]);
        }
      });

      // Draw primary planned route polyline
      if (latLngs.length > 1) {
        // Outer glowing line
        L.polyline(latLngs, {
          color: "#3B82F6",
          weight: 6,
          opacity: 0.3,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(layerGroup);

        // Inner solid line
        L.polyline(latLngs, {
          color: "#60A5FA",
          weight: 3,
          opacity: 0.9,
          dashArray: "6, 8",
          lineCap: "round",
          lineJoin: "round",
        }).addTo(layerGroup);

        // Waypoint markers
        routeSegments.forEach((seg: RouteSegment, idx: number) => {
          const isOrigin = idx === 0;
          const isDest = idx === routeSegments.length - 1;

          if (isOrigin && seg.start_coordinate) {
            const originIcon = L.divIcon({
              className: "custom-port-marker",
              html: `
                <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
                  <div style="width: 14px; height: 14px; background: #10B981; border: 2px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 10px rgba(16,185,129,0.7);"></div>
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });
            L.marker([seg.start_coordinate.lat, seg.start_coordinate.lng], { icon: originIcon })
              .bindTooltip(`<b>Origin:</b> ${seg.from_waypoint}`, { className: "bg-slate-900 text-white border-slate-700" })
              .addTo(layerGroup);
          }

          if (isDest && seg.end_coordinate) {
            const destIcon = L.divIcon({
              className: "custom-port-marker",
              html: `
                <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
                  <div style="width: 14px; height: 14px; background: #EF4444; border: 2px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 10px rgba(239,68,68,0.7);"></div>
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            });
            L.marker([seg.end_coordinate.lat, seg.end_coordinate.lng], { icon: destIcon })
              .bindTooltip(`<b>Destination:</b> ${seg.to_waypoint}`, { className: "bg-slate-900 text-white border-slate-700" })
              .addTo(layerGroup);
          }
        });
      }

      // Draw alternative routes (if recommended)
      if (alternativeRoutes && alternativeRoutes.length > 0) {
        alternativeRoutes.forEach((alt: AlternativeRoute) => {
          if (alt.waypoints && alt.waypoints.length > 1) {
            const altCoords: [number, number][] = alt.waypoints.map((wp: { lat: number; lng: number }) => [wp.lat, wp.lng]);
            L.polyline(altCoords, {
              color: "#F59E0B",
              weight: 2.5,
              opacity: 0.8,
              dashArray: "4, 6",
            })
              .bindTooltip(`<b>Alt Route:</b> ${alt.name}`, { className: "bg-slate-900 text-white border-slate-700" })
              .addTo(layerGroup);
          }
        });
      }

      // Current vessel position marker (pulsing radar)
      if (tracking?.current_position) {
        const { lat, lng } = tracking.current_position;
        const vesselIcon = L.divIcon({
          className: "vessel-radar-marker",
          html: `
            <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(59, 130, 246, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: rgba(37, 99, 235, 0.6);"></div>
              <div style="position: relative; width: 12px; height: 12px; border-radius: 50%; background: #60A5FA; border: 2px solid #FFFFFF; box-shadow: 0 0 8px #3B82F6;"></div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([lat, lng], { icon: vesselIcon })
          .bindTooltip(
            `<b>Current Position</b><br/>Speed: ${tracking.current_speed_knots} kts<br/>Progress: ${tracking.progress_percent}%`,
            { className: "bg-slate-900 text-white border-slate-700", permanent: false }
          )
          .addTo(layerGroup);

        // Fit bounds if we have route points
        if (latLngs.length > 0) {
          const bounds = L.latLngBounds([...latLngs, [lat, lng]]);
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 7 });
        } else {
          map.setView([lat, lng], 5);
        }
      } else if (latLngs.length > 0) {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [tracking, segments, alternativeRoutes]);

  // Clean up map instance on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`relative rounded-xl overflow-hidden border border-white/10 bg-[#0F172A] ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Map Overlay Badge */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0F172A]/90 backdrop-blur-md border border-white/10 text-xs text-[#94A3B8] shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-medium text-white">Live Maritime Radar</span>
        <span className="text-white/30">|</span>
        <span>OpenStreetMap / CartoDB</span>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] hidden sm:flex items-center gap-4 px-3 py-1.5 rounded-lg bg-[#0F172A]/90 backdrop-blur-md border border-white/10 text-[11px] text-[#94A3B8] shadow-lg">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Origin</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Destination</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          <span>Vessel</span>
        </div>
        {alternativeRoutes && alternativeRoutes.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-400" />
            <span>Alt Route</span>
          </div>
        )}
      </div>
    </div>
  );
}
