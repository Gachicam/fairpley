"use client";

import { useState } from "react";
import { removeMember } from "@/actions/member";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Member {
  id: string;
  userId: string;
  nickname: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface MemberListProps {
  members: Member[];
  ownerId: string;
  eventId: string;
  isOwner: boolean;
}

export function MemberList({
  members,
  ownerId,
  eventId,
  isOwner,
}: MemberListProps): React.ReactElement {
  const [removingId, setRemovingId] = useState<string | null>(null);

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

  const getDisplayName = (member: Member): string => {
    return member.nickname ?? member.user.name ?? member.user.email;
  };

  const getInitials = (member: Member): string => {
    const name = getDisplayName(member);
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const isEventOwner = member.userId === ownerId;
        const canRemove = isOwner && !isEventOwner;

        return (
          <div key={member.id} className="flex items-center justify-between rounded-lg border p-2">
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
        );
      })}
    </div>
  );
}
