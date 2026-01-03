"use client";

import { useState } from "react";
import { approveUser, rejectUser } from "@/actions/admin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
}

interface PendingUserListProps {
  users: User[];
}

export function PendingUserList({ users }: PendingUserListProps): React.ReactElement {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (userId: string): Promise<void> => {
    setProcessingId(userId);
    try {
      await approveUser(userId);
    } catch (error) {
      console.error("Failed to approve user:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string): Promise<void> => {
    setProcessingId(userId);
    try {
      await rejectUser(userId);
    } catch (error) {
      console.error("Failed to reject user:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const getInitials = (user: User): string => {
    const name = user.name ?? user.email;
    return name.substring(0, 2).toUpperCase();
  };

  if (users.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">承認待ちのユーザーはいません</p>;
  }

  return (
    <div className="divide-y">
      {users.map((user) => (
        <div key={user.id} className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? user.email} />
              <AvatarFallback>{getInitials(user)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.name ?? "名前未設定"}</p>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              <p className="text-muted-foreground text-xs">
                登録: {user.createdAt.toLocaleDateString("ja-JP")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleApprove(user.id)}
              disabled={processingId === user.id}
            >
              {processingId === user.id ? "..." : "承認"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={processingId === user.id}>
                  拒否
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ユーザーを拒否</AlertDialogTitle>
                  <AlertDialogDescription>
                    {user.name ?? user.email}
                    を拒否すると、アカウントが削除されます。この操作は取り消せません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleReject(user.id)}>
                    拒否する
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
