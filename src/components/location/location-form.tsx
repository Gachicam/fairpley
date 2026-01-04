"use client";

import { useActionState, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createLocation, updateLocation } from "@/actions/location";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { locationTypeLabels, type LocationType } from "@/lib/schemas/location";
import { LocationPicker } from "./location-picker";

interface Location {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  type: string;
}

interface LocationFormProps {
  eventId: string;
  location?: Location;
  onSuccess?: () => void;
}

export function LocationForm({
  eventId: _eventId,
  location,
  onSuccess,
}: LocationFormProps): React.ReactElement {
  const router = useRouter();
  const isEditing = Boolean(location);
  const [lat, setLat] = useState<number>(location?.lat ?? 0);
  const [lng, setLng] = useState<number>(location?.lng ?? 0);
  const [address, setAddress] = useState<string>(location?.address ?? "");

  const handleLocationSelect = useCallback(
    (newLat: number, newLng: number, newAddress?: string) => {
      setLat(newLat);
      setLng(newLng);
      if (newAddress) {
        setAddress(newAddress);
      }
    },
    []
  );

  const action = async (
    _prevState: { error?: Record<string, string[]> },
    formData: FormData
  ): Promise<{ error?: Record<string, string[]> }> => {
    if (isEditing) {
      const result = await updateLocation(formData);
      if (!result.error && onSuccess) {
        onSuccess();
      }
      return result;
    }
    const result = await createLocation(formData);
    if (!result.error) {
      router.refresh();
    }
    return result;
  };

  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {location && <input type="hidden" name="id" value={location.id} />}

      <div className="space-y-2">
        <Label htmlFor="name">場所名</Label>
        <Input
          id="name"
          name="name"
          placeholder="例: ○○キャンプ場"
          defaultValue={location?.name}
          required
        />
        {state.error?.name && <p className="text-destructive text-sm">{state.error.name[0]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">種類</Label>
        <Select name="type" defaultValue={location?.type ?? "OTHER"}>
          <SelectTrigger>
            <SelectValue placeholder="種類を選択" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(locationTypeLabels) as [LocationType, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        {state.error?.type && <p className="text-destructive text-sm">{state.error.type[0]}</p>}
      </div>

      {/* 地図ピッカー */}
      <div className="space-y-2">
        <Label>位置を選択</Label>
        <LocationPicker
          initialLat={location?.lat}
          initialLng={location?.lng}
          onLocationSelect={handleLocationSelect}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">住所</Label>
        <Input
          id="address"
          name="address"
          placeholder="例: 東京都○○区..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lat">緯度</Label>
          <Input
            id="lat"
            name="lat"
            type="number"
            step="0.000001"
            placeholder="35.6762"
            value={lat}
            onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
            required
          />
          {state.error?.lat && <p className="text-destructive text-sm">{state.error.lat[0]}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lng">経度</Label>
          <Input
            id="lng"
            name="lng"
            type="number"
            step="0.000001"
            placeholder="139.6503"
            value={lng}
            onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
            required
          />
          {state.error?.lng && <p className="text-destructive text-sm">{state.error.lng[0]}</p>}
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending && "保存中..."}
        {!isPending && isEditing && "更新"}
        {!isPending && !isEditing && "追加"}
      </Button>
    </form>
  );
}
