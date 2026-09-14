/**
 * BOB Supply Chain Intelligence - Map Provider Configuration
 *
 * Open-source friendly map configuration that:
 * 1. Supports configured provider (CartoDB with NEXT_PUBLIC_CARTO_API_KEY)
 * 2. Supports custom tile layer via NEXT_PUBLIC_MAP_TILE_URL
 * 3. Falls back to keyless, public Esri World Dark Gray Canvas without watermarks
 * 4. Ensures proper map attribution
 */

export interface MapTileConfig {
  url: string;
  options: {
    maxZoom: number;
    subdomains?: string | string[];
    attribution: string;
  };
}

export function getMapTileConfig(): MapTileConfig {
  const customTileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL;
  const cartoApiKey = process.env.NEXT_PUBLIC_CARTO_API_KEY;

  // 1. Custom Tile Provider via environment variable
  if (customTileUrl) {
    return {
      url: customTileUrl,
      options: {
        maxZoom: 19,
        attribution: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; OpenStreetMap contributors',
      },
    };
  }

  // 2. CartoDB Dark Matter with configured API key
  if (cartoApiKey) {
    return {
      url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${cartoApiKey}`,
      options: {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    };
  }

  // 3. Clean Keyless Fallback: Esri World Dark Gray Canvas
  // Deep charcoal/navy maritime aesthetic perfectly matched with BOB enterprise UI
  return {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    options: {
      maxZoom: 16,
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    },
  };
}
