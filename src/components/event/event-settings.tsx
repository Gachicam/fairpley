"use client";

import { useState, useActionState } from "react";
import { updateEvent, deleteEvent } from "@/actions/event";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EventWithFullDetails } from "@/data/event";

interface Location {
  id: string;
  name: string;
}

interface EventSettingsProps {
  event: EventWithFullDetails;
  locations: Location[];
  isAdmin: boolean;
}

interface FormState {
  error?: Record<string, string[]>;
}

export function EventSettings({
  event,
  locations,
  isAdmin,
}: EventSettingsProps): React.ReactElement {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (_prevState, formData) => {
      const result = await updateEvent(formData);
      if (!result.error) {
        setIsEditOpen(false);
      }
      return result;
    },
    {}
  );

  const handleDelete = async (): Promise<void> => {
    setIsDeleting(true);
    try {
      await deleteEvent(event.id);
    } catch {
      setIsDeleting(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  return (
    <div className="flex gap-2">
      {/* 編集ダイアログ */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">設定</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>イベント設定</DialogTitle>
            <DialogDescription>イベントの情報を編集できます</DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="id" value={event.id} />

            <div className="space-y-2">
              <Label htmlFor="name">イベント名</Label>
              <Input id="name" name="name" defaultValue={event.name} required maxLength={100} />
              {state.error?.name && <p className="text-sm text-red-500">{state.error.name[0]}</p>}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">開始日</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={formatDate(event.startDate)}
                  required
                />
                {state.error?.startDate && (
                  <p className="text-sm text-red-500">{state.error.startDate[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">終了日</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={formatDate(event.endDate)}
                  required
                />
                {state.error?.endDate && (
                  <p className="text-sm text-red-500">{state.error.endDate[0]}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gasPricePerLiter">ガソリン単価 (円/L)</Label>
              <Input
                id="gasPricePerLiter"
                name="gasPricePerLiter"
                type="number"
                defaultValue={event.gasPricePerLiter}
                min={1}
                max={500}
                required
              />
              {state.error?.gasPricePerLiter && (
                <p className="text-sm text-red-500">{state.error.gasPricePerLiter[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="destinationId">目的地</Label>
              <Select name="destinationId" defaultValue={event.destinationId ?? "none"}>
                <SelectTrigger>
                  <SelectValue placeholder="目的地を選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未設定</SelectItem>
                  {locations
                    .filter((location) => location.id)
                    .map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-sm">
                目的地を設定するとShapley値による交通費分配が有効になります
              </p>
              {state.error?.destinationId && (
                <p className="text-sm text-red-500">{state.error.destinationId[0]}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 削除ダイアログ（管理者のみ） */}
      {isAdmin && (
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">削除</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>イベントを削除</DialogTitle>
              <DialogDescription>
                この操作は取り消せません。イベント「{event.name}
                」を削除してもよろしいですか？
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteOpen(false)}
                disabled={isDeleting}
              >
                キャンセル
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "削除中..." : "削除する"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
