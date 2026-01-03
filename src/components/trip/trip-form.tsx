"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createTrip, updateTrip } from "@/actions/trip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Member {
  id: string;
  nickname: string | null;
  user: {
    name: string | null;
    email: string;
  };
}

interface Vehicle {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

interface Trip {
  id: string;
  vehicleId: string;
  fromId: string;
  toId: string;
  distance: number | null;
  passengers: { memberId: string }[];
}

interface TripFormProps {
  eventId: string;
  members: Member[];
  vehicles: Vehicle[];
  locations: Location[];
  trip?: Trip;
}

interface FormState {
  error?: Record<string, string[]>;
}

export function TripForm({
  eventId,
  members,
  vehicles,
  locations,
  trip,
}: TripFormProps): React.ReactElement {
  const router = useRouter();
  const isEditing = Boolean(trip);

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (_prevState, formData) => {
      const result = isEditing ? await updateTrip(formData) : await createTrip(formData);
      if (!result.error && isEditing) {
        router.push(`/events/${eventId}`);
      }
      return result;
    },
    {}
  );

  const getDisplayName = (member: Member): string => {
    return member.nickname ?? member.user.name ?? member.user.email;
  };

  const getSubmitLabel = (): string => {
    return isEditing ? "更新" : "登録";
  };

  const defaultPassengerIds = trip?.passengers.map((p) => p.memberId) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "移動記録を編集" : "新規移動記録"}</CardTitle>
        <CardDescription>
          {isEditing ? "移動記録を更新してください" : "移動記録を入力してください"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          {isEditing && <input type="hidden" name="id" value={trip?.id} />}
          <input type="hidden" name="eventId" value={eventId} />

          <div className="space-y-2">
            <Label htmlFor="vehicleId">車両</Label>
            {vehicles.length > 0 ? (
              <Select name="vehicleId" defaultValue={trip?.vehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="車両を選択" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-muted-foreground text-sm">
                車両が登録されていません。先に車両を登録してください。
              </p>
            )}
            {state.error?.vehicleId && (
              <p className="text-sm text-red-500">{state.error.vehicleId[0]}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fromId">出発地</Label>
              {locations.length > 0 ? (
                <Select name="fromId" defaultValue={trip?.fromId}>
                  <SelectTrigger>
                    <SelectValue placeholder="出発地を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-muted-foreground text-sm">場所が登録されていません</p>
              )}
              {state.error?.fromId && (
                <p className="text-sm text-red-500">{state.error.fromId[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="toId">到着地</Label>
              {locations.length > 0 ? (
                <Select name="toId" defaultValue={trip?.toId}>
                  <SelectTrigger>
                    <SelectValue placeholder="到着地を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-muted-foreground text-sm">場所が登録されていません</p>
              )}
              {state.error?.toId && <p className="text-sm text-red-500">{state.error.toId[0]}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="distance">距離（km、任意）</Label>
            <Input
              id="distance"
              name="distance"
              type="number"
              step="0.1"
              placeholder="例: 50.5"
              defaultValue={trip?.distance ?? undefined}
              min={0}
              max={10000}
            />
            {state.error?.distance && (
              <p className="text-sm text-red-500">{state.error.distance[0]}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label>乗客</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {members.map((member) => (
                <label
                  key={member.id}
                  className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg border p-3"
                >
                  <Checkbox
                    name="passengerIds"
                    value={member.id}
                    defaultChecked={defaultPassengerIds.includes(member.id)}
                  />
                  <span className="text-sm">{getDisplayName(member)}</span>
                </label>
              ))}
            </div>
            {state.error?.passengerIds && (
              <p className="text-sm text-red-500">{state.error.passengerIds[0]}</p>
            )}
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isPending || vehicles.length === 0}>
              {isPending ? "保存中..." : getSubmitLabel()}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              キャンセル
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
