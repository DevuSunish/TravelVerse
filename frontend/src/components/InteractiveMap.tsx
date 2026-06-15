import React, { useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';

const geoUrl = '/countries-110m.json';

// Simple matching helper on frontend mapping popular names to 3-letter codes
function mapNameToCode(countryName: string): string {
  const mapping: { [key: string]: string } = {
    'united states of america': 'USA',
    'united states': 'USA',
    'united kingdom': 'GBR',
    'viet nam': 'VNM',
    'korea, republic of': 'KOR',
    'russian federation': 'RUS',
    'dem. rep. congo': 'COD',
    'central african rep.': 'CAF',
    'falkland is.': 'FLK',
    's. sudan': 'SSD',
    'italy': 'ITA', 'france': 'FRA', 'spain': 'ESP', 'japan': 'JPN', 'germany': 'DEU',
    'canada': 'CAN', 'mexico': 'MEX', 'costa rica': 'CRC', 'peru': 'PER',
    'thailand': 'THA', 'india': 'IND', 'australia': 'AUS', 'brazil': 'BRA',
    'south africa': 'ZAF', 'vietnam': 'VNM', 'china': 'CHN', 'iceland': 'ISL',
    'greece': 'GRC', 'switzerland': 'CHE', 'new zealand': 'NZL', 'egypt': 'EGY',
    'indonesia': 'IDN', 'singapore': 'SGP', 'malaysia': 'MYS', 'netherlands': 'NLD'
  };
  const key = countryName.toLowerCase().trim();
  return mapping[key] || (key.length >= 3 ? key.substring(0, 3).toUpperCase() : 'WLD');
}

interface MapCountry {
  country_code: string;
  status: 'visited' | 'planned' | 'wishlist';
}

interface InteractiveMapProps {
  countries: MapCountry[];
  onCountryClick?: (countryName: string, countryCode: string, currentStatus?: 'visited' | 'planned' | 'wishlist') => void;
  readOnly?: boolean;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ countries, onCountryClick, readOnly = false }) => {
  const [tooltipContent, setTooltipContent] = useState('');
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  // Map countries array to a fast lookup map
  const statusLookup = React.useMemo(() => {
    const lookup: { [code: string]: 'visited' | 'planned' | 'wishlist' } = {};
    countries.forEach((c) => {
      lookup[c.country_code] = c.status;
    });
    return lookup;
  }, [countries]);

  const getCountryColor = (code: string, isHovered: boolean) => {
    const status = statusLookup[code];
    
    if (status === 'visited') {
      return isHovered ? '#059669' : '#10b981'; // Emerald
    }
    if (status === 'planned') {
      return isHovered ? '#d97706' : '#f59e0b'; // Amber/Gold
    }
    if (status === 'wishlist') {
      return isHovered ? '#e11d48' : '#f43f5e'; // Rose
    }

    // Default unvisited colors (responsive to dark mode)
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      return isHovered ? '#475569' : '#1e293b'; // Slate-700/800
    } else {
      return isHovered ? '#cbd5e1' : '#e2e8f0'; // Slate-300/200
    }
  };

  return (
    <div className="relative w-full h-[350px] sm:h-[450px] bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/80 overflow-hidden shadow-xs">
      
      {/* Tooltip Overlay */}
      {tooltipContent && (
        <div className="absolute z-20 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-lg bg-slate-900 text-white border border-slate-700/50 pointer-events-none transform -translate-x-1/2 -translate-y-10"
             style={{
               left: hoveredCountry ? '50%' : '10px',
               bottom: '10px'
             }}>
          {tooltipContent}
          {statusLookup[hoveredCountry || ''] && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-white/20">
              {statusLookup[hoveredCountry || '']}
            </span>
          )}
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 p-3 bg-white/95 dark:bg-slate-900/95 border border-slate-100 dark:border-slate-800/80 rounded-xl shadow-md backdrop-blur-xs text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-sm bg-emerald-500" />
          <span className="font-medium text-slate-700 dark:text-slate-300">Visited ({countries.filter(c => c.status === 'visited').length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-sm bg-amber-500" />
          <span className="font-medium text-slate-700 dark:text-slate-300">Planned ({countries.filter(c => c.status === 'planned').length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-sm bg-rose-500" />
          <span className="font-medium text-slate-700 dark:text-slate-300">Wishlist ({countries.filter(c => c.status === 'wishlist').length})</span>
        </div>
      </div>

      {/* Interactive Map Canvas */}
      <ComposableMap
        projectionConfig={{ scale: 145 }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup zoom={1} minZoom={1} maxZoom={4}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryName = geo.properties.name;
                const code = mapNameToCode(countryName);
                const currentStatus = statusLookup[code];
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => {
                      setTooltipContent(countryName);
                      setHoveredCountry(code);
                    }}
                    onMouseLeave={() => {
                      setTooltipContent('');
                      setHoveredCountry(null);
                    }}
                    onClick={() => {
                      if (!readOnly && onCountryClick) {
                        onCountryClick(countryName, code, currentStatus);
                      }
                    }}
                    style={{
                      default: {
                        fill: getCountryColor(code, false),
                        stroke: "#ffffff",
                        strokeWidth: 0.4,
                        outline: "none",
                        transition: "fill 0.2s ease"
                      },
                      hover: {
                        fill: getCountryColor(code, true),
                        stroke: "#ffffff",
                        strokeWidth: 0.6,
                        outline: "none",
                        cursor: readOnly ? "default" : "pointer",
                        transition: "fill 0.2s ease"
                      },
                      pressed: {
                        fill: getCountryColor(code, true),
                        stroke: "#ffffff",
                        strokeWidth: 0.8,
                        outline: "none"
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
};
