"use client";

import { useCallback, useState, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { geocodeAddress } from "@/actions/geocode";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Loader2 } from "lucide-react";

const mapContainerStyle = {
  width: "100%",
  height: "300px",
};

const defaultCenter = {
  lat: 35.6762,
  lng: 139.6503,
};

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
}

export function LocationPicker({
  initialLat,
  initialLng,
  onLocationSelect,
}: LocationPickerProps): React.ReactElement {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey ?? "",
  });

  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    initialLat !== undefined && initialLng !== undefined
      ? { lat: initialLat, lng: initialLng }
      : null
  );
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const mapRef = useRef<google.maps.Map | null>(null);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setMarker({ lat, lng });
        onLocationSelect(lat, lng);
      }
    },
    [onLocationSelect]
  );

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    try {
      const response = await geocodeAddress(searchQuery);

      if (response.result) {
        const { lat, lng, address } = response.result;
        setMarker({ lat, lng });
        onLocationSelect(lat, lng, address);
        mapRef.current?.panTo({ lat, lng });
        mapRef.current?.setZoom(15);
      } else {
        alert(response.error ?? "住所が見つかりませんでした");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      alert("住所の検索に失敗しました");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, onLocationSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void handleSearch();
      }
    },
    [handleSearch]
  );

  const handleGetCurrentLocation = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
    if (!navigator.geolocation) {
      alert("お使いのブラウザは位置情報に対応していません");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMarker({ lat, lng });
        onLocationSelect(lat, lng);
        mapRef.current?.panTo({ lat, lng });
        mapRef.current?.setZoom(15);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("位置情報の取得に失敗:", error);
        alert("位置情報の取得に失敗しました");
        setIsGettingLocation(false);
      }
    );
  }, [onLocationSelect]);

  if (!apiKey) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center">
        <p className="text-muted-foreground text-sm">
          地図機能を使用するには、環境変数 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY を設定してください
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center">
        <p className="text-destructive text-sm">地図の読み込みに失敗しました</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="住所を入力して検索..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleSearch()}
          disabled={isSearching || !searchQuery.trim()}
        >
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "検索"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleGetCurrentLocation}
          disabled={isGettingLocation}
          title="現在地を取得"
        >
          {isGettingLocation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </Button>
      </div>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={marker ?? defaultCenter}
        zoom={marker ? 15 : 10}
        onClick={handleMapClick}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {marker && <Marker position={marker} />}
      </GoogleMap>

      <p className="text-muted-foreground text-xs">
        住所を検索するか、地図をクリックして場所を選択してください
      </p>
    </div>
  );
}
