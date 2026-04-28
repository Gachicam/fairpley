"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { createGlobalVehicle, updateGlobalVehicle } from "@/actions/vehicle";
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
import {
  vehicleTypeLabels,
  vehicleClassLabels,
  type VehicleType,
  type VehicleClass,
} from "@/lib/schemas/vehicle";
import { Checkbox } from "@/components/ui/checkbox";

interface Vehicle {
  id: string;
  name: string;
  type: string;
  vehicleClass: string;
  hasEtc: boolean;
  capacity: number;
  fuelEfficiency: number | null;
}

interface GlobalVehicleFormProps {
  vehicle?: Vehicle;
  onSuccess?: () => void;
}

export function GlobalVehicleForm({
  vehicle,
  onSuccess,
}: GlobalVehicleFormProps): React.ReactElement {
  const router = useRouter();
  const isEditing = Boolean(vehicle);
  const [hasEtc, setHasEtc] = useState<boolean>(vehicle?.hasEtc ?? true);

  const action = async (
    _prevState: { error?: Record<string, string[]> },
    formData: FormData
  ): Promise<{ error?: Record<string, string[]> }> => {
    if (isEditing) {
      const result = await updateGlobalVehicle(formData);
      if (!result.error && onSuccess) {
        onSuccess();
      }
      return result;
    }
    const result = await createGlobalVehicle(formData);
    if (!result.error) {
      router.refresh();
    }
    return result;
  };

  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
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
        <Label htmlFor="vehicleClass">車種区分</Label>
        <Select
          name="vehicleClass"
          defaultValue={(vehicle?.vehicleClass as VehicleClass) ?? "STANDARD"}
        >
          <SelectTrigger>
            <SelectValue placeholder="車種区分を選択" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(vehicleClassLabels) as [VehicleClass, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">高速料金の計算に使用されます</p>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="hasEtc"
          checked={hasEtc}
          onCheckedChange={(checked) => setHasEtc(checked === true)}
        />
        <input type="hidden" name="hasEtc" value={hasEtc ? "true" : "false"} />
        <Label htmlFor="hasEtc">ETC搭載</Label>
        <span className="text-muted-foreground text-xs">（ETC割引の計算に使用）</span>
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
