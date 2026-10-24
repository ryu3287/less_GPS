'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { Photo } from '@/types'
import { buildTravelPath, TravelPathPoint } from '@/lib/travel'

function markerIcon(selected: boolean): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: selected ? 19 : 16,
    fillColor: selected ? '#f97316' : '#0ea5e9',
    fillOpacity: 1,
    strokeColor: 'white',
    strokeWeight: selected ? 3 : 2,
  }
}

interface MapViewProps {
  photos: Photo[]
  selectedPhoto: Photo | null
  onSelectPhoto: (photo: Photo) => void
  routePoints?: TravelPathPoint[]
}

export default function MapView({ photos, selectedPhoto, onSelectPhoto, routePoints = [] }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const markersByPhotoIdRef = useRef(new Map<string, google.maps.Marker>())
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const onSelectPhotoRef = useRef(onSelectPhoto)
  onSelectPhotoRef.current = onSelectPhoto

  const buildInfoWindowContent = useCallback((photo: Photo) => {
    const date = photo.taken_at
      ? new Date(photo.taken_at).toLocaleDateString('ja-JP', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      : '日時不明'
    const tags = photo.tags?.map(t =>
      `<span style="background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;font-size:11px;margin:2px">${t}</span>`
    ).join('') || ''
    return `
      <div style="max-width:220px;font-family:sans-serif">
        <img src="${photo.storage_url}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px"/>
        <div style="font-size:12px;color:#78716c;margin-bottom:4px">${date}</div>
        <div style="font-size:12px;color:#44403c;font-weight:500;margin-bottom:6px">${photo.location_name || ''}</div>
        <div style="display:flex;flex-wrap:wrap;gap:2px">${tags}</div>
      </div>
    `
  }, [])

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: 'weekly',
    })
    loader.load().then(() => {
      if (!mapRef.current) return
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 35.6762, lng: 139.6503 },
        zoom: 5,
        mapTypeId: 'roadmap',
        styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      })
      mapInstanceRef.current = map
      infoWindowRef.current = new google.maps.InfoWindow()
    })
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current) return
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    markersByPhotoIdRef.current.clear()
    polylineRef.current?.setMap(null)
    if (photos.length === 0) return

    const bounds = new google.maps.LatLngBounds()
    const path: google.maps.LatLngLiteral[] = []
    const effectiveRoute = routePoints.length > 0 ? routePoints : buildTravelPath(photos)

    photos.forEach((photo, index) => {
      if (photo.latitude === null || photo.longitude === null) return
      const position = { lat: photo.latitude, lng: photo.longitude }
      bounds.extend(position)
      path.push(position)

      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current!,
        clickable: true,
        cursor: 'pointer',
        label: { text: String(index + 1), color: 'white', fontSize: '12px', fontWeight: 'bold' },
        icon: markerIcon(false),
        title: `地図上の番号 ${index + 1}: ${photo.file_name}`,
      })
      marker.addListener('click', () => {
        onSelectPhotoRef.current(photo)
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(buildInfoWindowContent(photo))
          infoWindowRef.current.open(mapInstanceRef.current!, marker)
        }
      })
      markersRef.current.push(marker)
      markersByPhotoIdRef.current.set(photo.id, marker)
    })

    if (effectiveRoute.length > 1) {
      polylineRef.current = new google.maps.Polyline({
        path: effectiveRoute,
        geodesic: false,
        strokeColor: '#f97316',
        strokeOpacity: 0.9,
        strokeWeight: 4,
        icons: [{
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#f97316',
            fillOpacity: 1,
            strokeWeight: 0,
            scale: 3,
          },
          offset: '100%',
          repeat: '24px',
        }],
      })
      polylineRef.current.setMap(mapInstanceRef.current)
    }

    if (path.length === 1) {
      mapInstanceRef.current.setCenter(path[0])
      mapInstanceRef.current.setZoom(12)
    } else if (path.length > 1) {
      mapInstanceRef.current.fitBounds(bounds, 60)
    }
  }, [photos, buildInfoWindowContent, routePoints])

  useEffect(() => {
    markersByPhotoIdRef.current.forEach((marker, photoId) => {
      marker.setIcon(markerIcon(selectedPhoto?.id === photoId))
      marker.setZIndex(selectedPhoto?.id === photoId ? google.maps.Marker.MAX_ZINDEX + 1 : undefined)
    })
  }, [selectedPhoto])

  useEffect(() => {
    if (!selectedPhoto || !mapInstanceRef.current) return
    if (selectedPhoto.latitude && selectedPhoto.longitude) {
      mapInstanceRef.current.panTo({ lat: selectedPhoto.latitude, lng: selectedPhoto.longitude })
    }
  }, [selectedPhoto])

  return <div ref={mapRef} className="map-container" style={{ height: '100%', width: '100%' }} />
}
