"use client";

import { useActionState } from "react";
import { createVehicle, updateVehicle } from "@/actions/vehicle";
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
import { vehicleTypeLabels, type VehicleType } from "@/lib/schemas/vehicle";

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
}

interface VehicleFormProps {
  eventId: string;
  members: Member[];
  vehicle?: Vehicle;
  onSuccess?: () => void;
}

export function VehicleForm({
  eventId,
  members,
  vehicle,
  onSuccess,
}: VehicleFormProps): React.ReactElement {
  const isEditing = Boolean(vehicle);

  const action = async (
    _prevState: { error?: Record<string, string[]> },
    formData: FormData
  ): Promise<{ error?: Record<string, string[]> }> => {
    if (isEditing) {
      const result = await updateVehicle(eventId, formData);
      if (!result.error && onSuccess) {
        onSuccess();
      }
      return result;
    }
    return createVehicle(formData);
  };

  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      {vehicle && <input type="hidden" name="id" value={vehicle.id} />}

      <div className="space-y-2">
        <Label htmlFor="name">車名</Label>
        <Input
          id="name"
          name="name"
          placeholder="例: プリウス"
          defaultValue={vehicle?.name}
          required
        />
        {state.error?.name && <p className="text-destructive text-sm">{state.error.name[0]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">種類</Label>
        <Select name="type" defaultValue={vehicle?.type ?? "OWNED"}>
          <SelectTrigger>
            <SelectValue placeholder="種類を選択" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(vehicleTypeLabels) as [VehicleType, string][]).map(
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

      <div className="space-y-2">
        <Label htmlFor="ownerId">所有者</Label>
        <Select name="ownerId" defaultValue={vehicle?.ownerId ?? ""}>
          <SelectTrigger>
            <SelectValue placeholder="所有者を選択（任意）" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">未設定</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.nickname ?? member.user.name ?? "名前なし"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="capacity">定員</Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            max={20}
            defaultValue={vehicle?.capacity ?? 4}
            required
          />
          {state.error?.capacity && (
            <p className="text-destructive text-sm">{state.error.capacity[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fuelEfficiency">燃費 (km/L)</Label>
          <Input
            id="fuelEfficiency"
            name="fuelEfficiency"
            type="number"
            step="0.1"
            min={1}
            max={50}
            placeholder="例: 20.0"
            defaultValue={vehicle?.fuelEfficiency ?? ""}
          />
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
