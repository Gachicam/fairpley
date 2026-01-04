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
import { Pencil, Trash2 } from "lucide-react";

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

interface TripListCompactProps {
  trips: Trip[];
  eventId: string;
  limit?: number;
}

export function TripListCompact({
  trips,
  eventId,
  limit = 5,
}: TripListCompactProps): React.ReactElement {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (tripId: string): Promise<void> => {
    setDeletingId(tripId);
    try {
      await deleteTrip(tripId);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  };

  const displayTrips = trips.slice(0, limit);

  if (trips.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">まだ移動が記録されていません</p>;
  }

  return (
    <>
      <div className="divide-y">
        {displayTrips.map((trip) => (
          <div key={trip.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">
                {trip.from.name} → {trip.to.name}
              </p>
              <p className="text-muted-foreground text-sm">
                {trip.vehicle.name} ({trip.passengers.length}人)
                {trip.distance !== null && ` - ${trip.distance.toFixed(1)}km`}
              </p>
            </div>
            <div className="flex gap-1">
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
                      disabled={deletingId === trip.id}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deletingId === trip.id ? "削除中..." : "削除"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
      <div className="pt-3 text-center">
        <Button variant="link" asChild>
          <Link href={`/events/${eventId}/trips`}>すべての移動を表示</Link>
        </Button>
      </div>
    </>
  );
}
