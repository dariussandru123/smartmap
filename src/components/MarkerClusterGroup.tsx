import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';

interface MarkerClusterGroupProps {
  children?: React.ReactNode;
  points: Array<{
    lat: number;
    lng: number;
    properties: any;
    feature: any;
  }>;
  color: string;
  layerName: string;
  onFeatureClick?: (feature: any) => void;
}

export default function MarkerClusterGroup({
  points,
  color,
  layerName,
  onFeatureClick
}: MarkerClusterGroupProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    const markerClusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 50,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 'small';
        if (count > 100) size = 'large';
        else if (count > 10) size = 'medium';

        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(40, 40),
        });
      },
    });

    const customIcon = L.divIcon({
      html: `<svg width="24" height="24" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>`,
      className: 'custom-marker-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24],
    });

    points.forEach((point) => {
      const marker = L.marker([point.lat, point.lng], { icon: customIcon });

      const props = Object.entries(point.properties)
        .slice(0, 5)
        .map(([key, value]) => `<b>${key}:</b> ${value}`)
        .join('<br/>');

      marker.bindPopup(
        `<div><div style="color:${color}; font-weight:bold">${layerName}</div>${props}</div>`
      );

      if (onFeatureClick) {
        marker.on('click', () => {
          onFeatureClick(point.feature);
        });
      }

      markerClusterGroup.addLayer(marker);
    });

    map.addLayer(markerClusterGroup);

    return () => {
      map.removeLayer(markerClusterGroup);
    };
  }, [map, points, color, layerName, onFeatureClick]);

  return null;
}
