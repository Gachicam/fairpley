"use client";

import { useState } from "react";
import { deleteVehicle } from "@/actions/vehicle";
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
import { VehicleForm } from "./vehicle-form";
import { vehicleTypeLabels, type VehicleType } from "@/lib/schemas/vehicle";
import { Car, Pencil, Trash2 } from "lucide-react";

interface Member {
  id: string;
  nickname: string | null;
  user: { name: string | null };
}

interface Vehicle {
  id: string;
  name: string;
  type: string;
  ownerId: string | null;
  capacity: number;
  fuelEfficiency: number | null;
  owner: {
    user: { name: string | null };
  } | null;
}

interface VehicleListProps {
  vehicles: Vehicle[];
  eventId: string;
  members: Member[];
}

export function VehicleList({ vehicles, eventId, members }: VehicleListProps): React.ReactElement {
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (vehicleId: string): Promise<void> => {
    setIsDeleting(true);
    try {
      await deleteVehicle(eventId, vehicleId);
    } catch (error) {
      alert(error instanceof Error ? error.message : "削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  if (vehicles.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">まだ車両が登録されていません</p>;
  }

  return (
    <div className="space-y-3">
      {vehicles.map((vehicle) => (
        <div key={vehicle.id} className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{vehicle.name}</p>
              <p className="text-muted-foreground text-sm">
                {vehicleTypeLabels[vehicle.type as VehicleType]} ・ {vehicle.capacity}人乗り
                {vehicle.fuelEfficiency !== null && ` ・ ${vehicle.fuelEfficiency}km/L`}
              </p>
              {vehicle.owner && (
                <p className="text-muted-foreground text-xs">
                  所有者: {vehicle.owner.user.name ?? "名前なし"}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Dialog
              open={editingVehicle?.id === vehicle.id}
              onOpenChange={(open) => !open && setEditingVehicle(null)}
            >
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setEditingVehicle(vehicle)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>車両を編集</DialogTitle>
                  <DialogDescription>車両情報を更新します</DialogDescription>
                </DialogHeader>
                {editingVehicle && (
                  <VehicleForm
                    eventId={eventId}
                    members={members}
                    vehicle={editingVehicle}
                    onSuccess={() => setEditingVehicle(null)}
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
                  <AlertDialogTitle>車両を削除</AlertDialogTitle>
                  <AlertDialogDescription>
                    「{vehicle.name}」を削除しますか？この操作は取り消せません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(vehicle.id)}
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
