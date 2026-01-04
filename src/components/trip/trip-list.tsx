"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteTrip } from "@/actions/trip";
import { Button } from "@/components/ui/button";
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
import { Car, MapPin, Pencil, Trash2, Users } from "lucide-react";

interface Trip {
  id: string;
  distance: number | null;
  vehicle: {
    name: string;
  };
  from: {
    name: string;
  };
  to: {
    name: string;
  };
  passengers: {
    member: {
      nickname: string | null;
      user: {
        name: string | null;
      };
    };
  }[];
}

interface TripListProps {
  trips: Trip[];
  eventId: string;
}

export function TripList({ trips, eventId }: TripListProps): React.ReactElement {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (tripId: string): Promise<void> => {
    setIsDeleting(true);
    try {
      await deleteTrip(tripId);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  const getPassengerNames = (passengers: Trip["passengers"]): string => {
    return passengers.map((p) => p.member.nickname ?? p.member.user.name ?? "名前なし").join(", ");
  };

  if (trips.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">まだ移動記録がありません</p>;
  }

  return (
    <div className="space-y-3">
      {trips.map((trip) => (
        <div key={trip.id} className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="text-muted-foreground h-4 w-4" />
              <span className="font-medium">
                {trip.from.name} → {trip.to.name}
              </span>
              {trip.distance !== null && (
                <span className="text-muted-foreground text-sm">
                  ({trip.distance.toFixed(1)}km)
                </span>
              )}
            </div>
            <div className="text-muted-foreground flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Car className="h-4 w-4" />
                <span>{trip.vehicle.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{trip.passengers.length}人</span>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              乗客: {getPassengerNames(trip.passengers)}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/events/${eventId}/trips/${trip.id}/edit`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="text-destructive h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>移動記録を削除</AlertDialogTitle>
                  <AlertDialogDescription>
                    「{trip.from.name} → {trip.to.name}」の移動記録を削除しますか？
                    この操作は取り消せません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(trip.id)}
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
