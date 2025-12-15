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
      disableClusteringAtZoom: 18,
      spiderfyDistanceMultiplier: 1,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();

        // For clusters with less than 8 markers, return invisible icon
        // This will trigger spiderfy behavior to spread them out
        if (count < 8) {
          return L.divIcon({
            html: '',
            className: 'marker-cluster-small-invisible',
            iconSize: L.point(0, 0),
          });
        }

        let size = 'small';
        if (count > 100) size = 'large';
        else if (count > 10) size = 'medium';

        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(40, 40),
        });
      },
    } as any);

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

    // Auto-spiderfy small clusters to show individual markers
    markerClusterGroup.on('clustermouseover clusterclick', (e: any) => {
      const cluster = e.layer;
      if (cluster.getChildCount() < 8) {
        cluster.spiderfy();
      }
    });

    // Spiderfy small clusters on map move/zoom
    const spiderfySmallClusters = () => {
      markerClusterGroup.eachLayer((layer: any) => {
        if (layer.getAllChildMarkers && layer.getAllChildMarkers().length < 8) {
          if (layer.spiderfy) {
            layer.spiderfy();
          }
        }
      });
    };

    map.on('zoomend moveend', spiderfySmallClusters);
    setTimeout(spiderfySmallClusters, 100);

    return () => {
      map.off('zoomend moveend', spiderfySmallClusters);
      map.removeLayer(markerClusterGroup);
    };
  }, [map, points, color, layerName, onFeatureClick]);

  return null;
}
