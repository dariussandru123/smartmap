import { MapContainer, TileLayer, GeoJSON, useMap, LayersControl, useMapEvents } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import * as L from 'leaflet';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Layers, ChevronDown, ChevronRight, Maximize, Minimize, Search, X, Info, FileText, ArrowRight, Palette, RotateCcw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import type { ShapefileLayer } from '../utils/shapefileParser';
import { useAuth } from '../contexts/AuthContext';
import type { Feature } from 'geojson';
import MarkerClusterGroup from './MarkerClusterGroup';

interface MapProps {
  layers: ShapefileLayer[];
  bounds: LatLngBounds | null;
  onCheckContract?: (cf: string) => Promise<boolean>;
  onRedirectToRegistry?: (cf: string) => void;
}

interface LayerGroup {
  name: string;
  layers: ShapefileLayer[];
}

interface SelectedFeatureInfo {
  feature: Feature;
  layerName: string;
}

interface LayerColors {
  [layerName: string]: string;
}

// Component to handle map view updates
function MapController({ bounds, targetFeature }: { bounds: LatLngBounds | null, targetFeature: Feature | null }) {
  const map = useMap();

  useEffect(() => {
    if (bounds && !targetFeature) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true, duration: 1 });
    }
  }, [bounds, map, targetFeature]);

  useEffect(() => {
    if (targetFeature) {
      try {
        const l = L.geoJSON(targetFeature);
        const featureBounds = l.getBounds();
        if (featureBounds.isValid()) {
          map.fitBounds(featureBounds, { padding: [100, 100], maxZoom: 18, animate: true, duration: 1.5 });
        }
      } catch (e) {
        console.error("Error zooming to feature", e);
      }
    }
  }, [targetFeature, map]);

  return null;
}

// Component to handle map resizing when layout changes
function MapResizer({ isPanelOpen }: { isPanelOpen: boolean }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [isPanelOpen, map]);
  return null;
}

// Component to handle map background clicks
function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: () => {
      onMapClick();
    },
  });
  return null;
}

export default function Map({ layers, bounds, onCheckContract, onRedirectToRegistry }: MapProps) {
  const defaultCenter: [number, number] = [45.9432, 24.9668];
  const defaultZoom = 7;
  
  const { userData } = useAuth();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

  // Color customization state
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [layerColors, setLayerColors] = useState<LayerColors>({});

  // Search and Selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<Feature | null>(null);
  const [selectedFeatureInfo, setSelectedFeatureInfo] = useState<SelectedFeatureInfo | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Contract Notification State
  const [contractNotification, setContractNotification] = useState<{cf: string, exists: boolean} | null>(null);

  // Load custom colors from localStorage on mount
  useEffect(() => {
    if (userData?.uid) {
      const savedColors = localStorage.getItem(`layer-colors-${userData.uid}`);
      if (savedColors) {
        try {
          setLayerColors(JSON.parse(savedColors));
        } catch (e) {
          console.error('Error loading saved colors:', e);
        }
      }
    }
  }, [userData?.uid]);

  // Save colors to localStorage whenever they change
  useEffect(() => {
    if (userData?.uid && Object.keys(layerColors).length > 0) {
      localStorage.setItem(`layer-colors-${userData.uid}`, JSON.stringify(layerColors));
    }
  }, [layerColors, userData?.uid]);

  useEffect(() => {
    if (layers.length > 0) {
      setVisibleLayers(new Set(layers.map(l => l.name)));
    }
  }, [layers]);

  // Group layers logic
  const groupedLayers = useMemo(() => {
    const tempGroups: { [key: string]: ShapefileLayer[] } = {};
    
    layers.forEach(layer => {
      const firstWord = layer.name.split(/[_.\s]/)[0];
      if (!tempGroups[firstWord]) {
        tempGroups[firstWord] = [];
      }
      tempGroups[firstWord].push(layer);
    });

    const finalGroups: LayerGroup[] = [];
    const otherLayers: ShapefileLayer[] = [];

    Object.entries(tempGroups).forEach(([name, groupLayers]) => {
      if (groupLayers.length > 1) {
        finalGroups.push({
          name,
          layers: groupLayers.sort((a, b) => a.name.localeCompare(b.name))
        });
      } else {
        otherLayers.push(...groupLayers);
      }
    });

    finalGroups.sort((a, b) => a.name.localeCompare(b.name));

    if (otherLayers.length > 0) {
      finalGroups.push({
        name: "Altele",
        layers: otherLayers.sort((a, b) => a.name.localeCompare(b.name))
      });
    }

    return finalGroups;
  }, [layers]);

  const toggleLayer = (layerName: string) => {
    setVisibleLayers(prev => {
      const newSet = new Set(prev);
      newSet.has(layerName) ? newSet.delete(layerName) : newSet.add(layerName);
      return newSet;
    });
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      newSet.has(groupName) ? newSet.delete(groupName) : newSet.add(groupName);
      return newSet;
    });
  };

  const toggleFullScreen = () => {
    if (!mapContainerRef.current) return;

    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  const extractCFNumber = (str: string): string => {
    const match = str.match(/\d+/);
    return match ? match[0] : str;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    setSearchResult(null);
    setSelectedFeatureInfo(null);
    setContractNotification(null);

    if (!searchQuery.trim()) return;

    const query = searchQuery.trim().toLowerCase();
    const queryNumber = extractCFNumber(searchQuery.trim());
    let foundFeature: Feature | null = null;
    let foundLayerName = '';

    for (const layer of layers) {
      for (const feature of layer.geoJson.features) {
        if (feature.properties) {
          const cf = feature.properties['Nr_CF'] || feature.properties['nr_cf'] || feature.properties['NR_CF'];

          if (cf) {
            const cfStr = String(cf).toLowerCase();
            const cfNumber = extractCFNumber(String(cf));

            // Match if exact match, or if numeric parts match
            if (cfStr === query || cfNumber === queryNumber || cfStr.includes(query) || query.includes(cfStr)) {
              foundFeature = feature;
              foundLayerName = layer.name;
              break;
            }
          }
        }
      }
      if (foundFeature) break;
    }

    if (foundFeature) {
      setSearchResult(foundFeature);
      setSelectedFeatureInfo({ feature: foundFeature, layerName: foundLayerName });
      if (!visibleLayers.has(foundLayerName)) {
        setVisibleLayers(prev => new Set(prev).add(foundLayerName));
      }

      if (foundFeature.properties && onCheckContract) {
        const cf = foundFeature.properties['Nr_CF'] || foundFeature.properties['nr_cf'] || foundFeature.properties['NR_CF'];
        if (cf) {
          onCheckContract(String(cf)).then(exists => {
            if (exists) {
              setContractNotification({ cf: String(cf), exists: true });
            }
          });
        }
      }
    } else {
      setSearchError('Nu s-a găsit niciun imobil cu acest Nr. CF.');
    }
  };

  const handleColorChange = (layerName: string, color: string) => {
    setLayerColors(prev => ({
      ...prev,
      [layerName]: color
    }));
  };

  const resetColors = () => {
    setLayerColors({});
    if (userData?.uid) {
      localStorage.removeItem(`layer-colors-${userData.uid}`);
    }
  };

  const getLayerColor = (layerName: string, defaultColor: string) => {
    return layerColors[layerName] || defaultColor;
  };

  const renderedGeoJSONLayers = useMemo(() => {
    return layers.map((layer) => {
      if (!visibleLayers.has(layer.name)) return null;

      const currentColor = getLayerColor(layer.name, layer.color);

      const hasPointGeometry = layer.geoJson.features.some(
        (f) => f.geometry.type === 'Point'
      );

      if (hasPointGeometry) {
        const points = layer.geoJson.features
          .filter((f) => f.geometry.type === 'Point')
          .map((f) => ({
            lat: (f.geometry as any).coordinates[1],
            lng: (f.geometry as any).coordinates[0],
            properties: f.properties || {},
            feature: f,
          }));

        return (
          <MarkerClusterGroup
            key={layer.name}
            points={points}
            color={currentColor}
            layerName={layer.name}
            onFeatureClick={
              userData?.role === 'city_hall_manager'
                ? (feature) => {
                    setSelectedFeatureInfo({ feature, layerName: layer.name });
                    if (onCheckContract) {
                      const cf =
                        feature.properties?.['Nr_CF'] ||
                        feature.properties?.['nr_cf'] ||
                        feature.properties?.['NR_CF'];
                      if (cf) {
                        onCheckContract(String(cf)).then((exists) => {
                          if (exists) {
                            setContractNotification({ cf: String(cf), exists: true });
                          } else {
                            setContractNotification(null);
                          }
                        });
                      } else {
                        setContractNotification(null);
                      }
                    }
                  }
                : undefined
            }
          />
        );
      }

      return (
        <GeoJSON
          key={layer.name}
          data={layer.geoJson}
          style={(feature) => {
            const isHighlighted = selectedFeatureInfo && feature === selectedFeatureInfo.feature;
            return {
              color: isHighlighted ? '#2563eb' : currentColor,
              weight: isHighlighted ? 3 : 1.5,
              fillColor: isHighlighted ? '#3b82f6' : currentColor,
              fillOpacity: isHighlighted ? 0.5 : 0.3,
            };
          }}
          onEachFeature={(feature, leafletLayer) => {
            if (feature.properties) {
              const props = Object.entries(feature.properties)
                .slice(0, 5)
                .map(([key, value]) => `<b>${key}:</b> ${value}`)
                .join('<br/>');

              if (userData?.role !== 'city_hall_manager') {
                leafletLayer.bindPopup(
                  `<div><div style="color:${currentColor}; font-weight:bold">${layer.name}</div>${props}</div>`
                );
              }

              leafletLayer.on({
                click: (e) => {
                  if (userData?.role === 'city_hall_manager') {
                    setSelectedFeatureInfo({ feature, layerName: layer.name });
                    L.DomEvent.stopPropagation(e);

                    if (onCheckContract) {
                      const cf = feature.properties?.['Nr_CF'] || feature.properties?.['nr_cf'] || feature.properties?.['NR_CF'];

                      if (cf) {
                        onCheckContract(String(cf)).then(exists => {
                          if (exists) {
                            setContractNotification({ cf: String(cf), exists: true });
                          } else {
                            setContractNotification(null);
                          }
                        });
                      } else {
                        setContractNotification(null);
                      }
                    }
                  }
                }
              });

              if (searchResult && feature === searchResult && userData?.role !== 'city_hall_manager') {
                setTimeout(() => leafletLayer.openPopup(), 500);
              }
            }
          }}
        />
      );
    });
  }, [layers, visibleLayers, searchResult, selectedFeatureInfo, userData, onCheckContract, layerColors]);

  const isManager = userData?.role === 'city_hall_manager';
  const showPanel = isManager && selectedFeatureInfo;

  return (
    <div 
      ref={mapContainerRef} 
      className={`w-full h-full flex flex-col relative bg-white ${isFullScreen ? 'p-0' : ''}`}
    >
      {layers.length > 0 && (
        <div className="bg-white border-b border-gray-200 shadow-sm relative z-10">
           <div className="p-3 flex flex-wrap items-center justify-between gap-2">
             <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-bold hidden sm:inline">Straturi ({visibleLayers.size}/{layers.length})</span>
                <button onClick={() => setIsPanelExpanded(!isPanelExpanded)} className="text-xs bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors">
                    {isPanelExpanded ? 'Ascunde' : 'Arată'}
                </button>
             </div>

             <div className="flex items-center gap-2 flex-1 justify-end">
               {isManager && (
                 <>
                   <form onSubmit={handleSearch} className="flex items-center relative max-w-xs w-full">
                     <input
                       type="text"
                       placeholder="Caută Nr. CF..."
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full pl-3 pr-8 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                     />
                     <button 
                       type="submit"
                       className="absolute right-1 p-1 text-gray-500 hover:text-blue-600"
                       title="Caută"
                     >
                       <Search size={16} />
                     </button>
                     {searchError && (
                       <div className="absolute top-full right-0 mt-1 bg-red-100 text-red-700 text-xs px-2 py-1 rounded shadow-md whitespace-nowrap z-50">
                         {searchError}
                       </div>
                     )}
                   </form>
                   
                   <button
                     onClick={() => setShowColorMenu(!showColorMenu)}
                     className="flex items-center gap-1 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 px-2 py-1 rounded transition-colors shrink-0"
                     title="Personalizare Culori"
                   >
                     <Palette size={14} />
                     <span className="hidden sm:inline">Culori</span>
                   </button>
                   
                   <button
                     onClick={toggleFullScreen}
                     className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors shrink-0"
                     title={isFullScreen ? "Ieși din Full Screen" : "Full Screen"}
                   >
                     {isFullScreen ? <Minimize size={14} /> : <Maximize size={14} />}
                     <span className="hidden sm:inline">{isFullScreen ? 'Normal' : 'Full Screen'}</span>
                   </button>
                 </>
               )}
             </div>
           </div>
           
           {isPanelExpanded && (
             <div className="px-3 pb-3 max-h-96 overflow-y-auto">
                {groupedLayers.map(g => (
                    <div key={g.name} className="mb-2">
                        <button onClick={() => toggleGroup(g.name)} className="font-bold text-sm flex items-center hover:text-blue-600 transition-colors">
                            {expandedGroups.has(g.name) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} {g.name}
                        </button>
                        {expandedGroups.has(g.name) && (
                            <div className="pl-4 flex flex-wrap gap-2 mt-1">
                                {g.layers.map(l => (
                                    <button key={l.name} onClick={() => toggleLayer(l.name)} 
                                        className={`text-xs px-2 py-1 rounded border transition-colors ${visibleLayers.has(l.name) ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-50 hover:bg-gray-100'}`}>
                                        {l.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
             </div>
           )}
        </div>
      )}

      {/* Color Customization Menu */}
      {showColorMenu && isManager && (
        <div className="absolute top-16 right-4 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 w-80 max-h-[500px] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Personalizare Culori</h3>
            </div>
            <button
              onClick={() => setShowColorMenu(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-white/50 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {layers.map((layer) => (
              <div key={layer.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-medium text-gray-900 truncate">{layer.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {layerColors[layer.name] ? 'Personalizat' : 'Implicit'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded border-2 border-gray-300 shadow-sm"
                    style={{ backgroundColor: getLayerColor(layer.name, layer.color) }}
                  />
                  <input
                    type="color"
                    value={getLayerColor(layer.name, layer.color)}
                    onChange={(e) => handleColorChange(layer.name, e.target.value)}
                    className="w-10 h-8 rounded cursor-pointer border border-gray-300"
                    title="Alege culoare"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={resetColors}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw size={16} />
              Resetează la Implicit
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area - Split Screen */}
      <div className="flex-1 flex overflow-hidden relative z-0">
        {/* Map Section */}
        <div className="flex-1 relative min-w-0">
          <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
            preferCanvas={true}
          >
            <MapController bounds={bounds} targetFeature={searchResult} />
            <MapResizer isPanelOpen={!!showPanel} />
            <MapClickHandler onMapClick={() => {
              setSelectedFeatureInfo(null);
              setContractNotification(null);
            }} />

            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Hartă Stradală (OSM)">
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer name="Satelit (ESRI)">
                <TileLayer
                  attribution='Tiles &copy; Esri'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            {renderedGeoJSONLayers}
            
          </MapContainer>
        </div>

        {/* Details Panel Section - Right Side */}
        {showPanel && selectedFeatureInfo && (
          <div className="w-[350px] bg-white border-l border-gray-200 flex flex-col shadow-lg z-20 shrink-0">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2 text-blue-700">
                <Info size={20} />
                <h3 className="font-semibold">Detalii {selectedFeatureInfo.layerName.replace(/_/g, ' ')}</h3>
              </div>
              <button 
                onClick={() => {
                  setSelectedFeatureInfo(null);
                  setContractNotification(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
                title="Închide panoul"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contract Notification - Inside Panel */}
            {contractNotification && contractNotification.exists && (
              <div className="p-4 bg-blue-50 border-b border-blue-100 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-1.5 rounded-full shrink-0">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-blue-900">Contract Activ</h4>
                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                      Există un contract înregistrat pentru acest imobil (CF {contractNotification.cf}).
                    </p>
                    <button
                      onClick={() => onRedirectToRegistry?.(contractNotification.cf)}
                      className="mt-2 text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <span>Vezi Contract</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto p-4">
              {selectedFeatureInfo.feature.properties ? (
                <div className="space-y-4">
                  {Object.entries(selectedFeatureInfo.feature.properties).map(([key, value]) => (
                    <div key={key} className="border-b border-gray-100 pb-2 last:border-0">
                      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        {key.replace(/_/g, ' ')}
                      </dt>
                      <dd className="text-sm text-gray-900 font-medium break-words">
                        {value !== null && value !== undefined ? String(value) : '-'}
                      </dd>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Nu există date disponibile pentru acest element.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
