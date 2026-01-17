"use client";

import { useState } from "react";
import { removeMember, updateDepartureLocation } from "@/actions/member";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Location {
  id: string;
  name: string;
}

interface Member {
  id: string;
  userId: string;
  nickname: string | null;
  departureLocation: Location | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    homeLocation: Location | null;
  };
}

interface MemberListProps {
  members: Member[];
  locations: Location[];
  ownerId: string;
  eventId: string;
  isOwner: boolean;
}

export function MemberList({
  members,
  locations,
  ownerId,
  eventId,
  isOwner,
}: MemberListProps): React.ReactElement {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleRemove = async (memberId: string): Promise<void> => {
    setRemovingId(memberId);
    try {
      await removeMember(eventId, memberId);
    } catch (error) {
      console.error("Failed to remove member:", error);
    } finally {
      setRemovingId(null);
    }
  };

  const handleDepartureChange = async (
    memberId: string,
    locationId: string | null
  ): Promise<void> => {
    setUpdatingId(memberId);
    try {
      await updateDepartureLocation(eventId, memberId, locationId);
    } catch (error) {
      console.error("Failed to update departure location:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  const getDisplayName = (member: Member): string => {
    return member.nickname ?? member.user.name ?? member.user.email;
  };

  const getInitials = (member: Member): string => {
    const name = getDisplayName(member);
    return name.substring(0, 2).toUpperCase();
  };

  const getDepartureLocationName = (member: Member): string | null => {
    if (member.departureLocation) {
      return member.departureLocation.name;
    }
    if (member.user.homeLocation) {
      return `${member.user.homeLocation.name}（自宅）`;
    }
    return null;
  };

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const isEventOwner = member.userId === ownerId;
        const canRemove = isOwner && !isEventOwner;
        const departureLocationName = getDepartureLocationName(member);

        return (
          <div key={member.id} className="space-y-2 rounded-lg border p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.user.image ?? undefined} alt={getDisplayName(member)} />
                  <AvatarFallback className="text-xs">{getInitials(member)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{getDisplayName(member)}</p>
                  {member.nickname && member.user.name && (
                    <p className="text-muted-foreground text-xs">{member.user.name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isEventOwner && (
                  <Badge variant="secondary" className="text-xs">
                    オーナー
                  </Badge>
                )}
                {canRemove && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-6 px-2 text-xs"
                        disabled={removingId === member.id}
                      >
                        {removingId === member.id ? "..." : "削除"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>参加者を削除</AlertDialogTitle>
                        <AlertDialogDescription>
                          {getDisplayName(member)}
                          をイベントから削除してもよろしいですか？
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRemove(member.id)}>
                          削除する
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
            {/* 出発地選択 */}
            <div className="flex items-center gap-2 pl-11">
              <span className="text-muted-foreground text-xs">出発地:</span>
              <Select
                value={member.departureLocation?.id ?? "__home__"}
                onValueChange={(value) => {
                  const locationId = value === "__home__" ? null : value;
                  void handleDepartureChange(member.id, locationId);
                }}
                disabled={updatingId === member.id}
              >
                <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs">
                  <SelectValue>
                    {updatingId === member.id ? "更新中..." : (departureLocationName ?? "未設定")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__home__">
                    {member.user.homeLocation
                      ? `${member.user.homeLocation.name}（自宅）`
                      : "自宅（未設定）"}
                  </SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      })}
    </div>
  );
}
