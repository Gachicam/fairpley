"use client";

import { useState } from "react";
import { deleteLocation } from "@/actions/location";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LocationForm } from "./location-form";
import { locationTypeLabels, type LocationType } from "@/lib/schemas/location";
import { MapPin, Pencil, Trash2 } from "lucide-react";

interface Location {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  type: string;
}

interface LocationListProps {
  locations: Location[];
  eventId: string;
}

export function LocationList({ locations, eventId }: LocationListProps): React.ReactElement {
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (locationId: string): Promise<void> => {
    setIsDeleting(true);
    try {
      await deleteLocation(locationId);
    } catch (error) {
      alert(error instanceof Error ? error.message : "削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  if (locations.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">まだ場所が登録されていません</p>;
  }

  return (
    <div className="space-y-3">
      {locations.map((location) => (
        <div key={location.id} className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{location.name}</p>
              <p className="text-muted-foreground text-sm">
                {locationTypeLabels[location.type as LocationType]}
              </p>
              {location.address && (
                <p className="text-muted-foreground text-xs">{location.address}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Dialog
              open={editingLocation?.id === location.id}
              onOpenChange={(open) => !open && setEditingLocation(null)}
            >
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setEditingLocation(location)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>場所を編集</DialogTitle>
                  <DialogDescription>場所情報を更新します</DialogDescription>
                </DialogHeader>
                {editingLocation && (
                  <LocationForm
                    eventId={eventId}
                    location={editingLocation}
                    onSuccess={() => setEditingLocation(null)}
                  />
                )}
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="text-destructive h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>場所を削除</AlertDialogTitle>
                  <AlertDialogDescription>
                    「{location.name}」を削除しますか？この操作は取り消せません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(location.id)}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? "削除中..." : "削除"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
}
