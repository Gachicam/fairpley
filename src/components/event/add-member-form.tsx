"use client";

import { useState, useActionState, useEffect, useCallback } from "react";
import { addMemberByUserId, searchUsers } from "@/actions/member";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddMemberFormProps {
  eventId: string;
}

interface FormState {
  error?: Record<string, string[]>;
}

interface User {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  image: string | null;
}

export function AddMemberForm({ eventId }: AddMemberFormProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    async (_prevState, formData) => {
      const result = await addMemberByUserId(formData);
      if (!result.error) {
        setIsOpen(false);
        setQuery("");
        setSelectedUser(null);
        setUsers([]);
      }
      return result;
    },
    {}
  );

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setUsers([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsers(searchQuery);
      setUsers(results);
    } catch {
      setUsers([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query && !selectedUser) {
        void handleSearch(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedUser, handleSearch]);

  const handleSelectUser = (user: User): void => {
    setSelectedUser(user);
    setQuery(user.name ?? user.email);
    setUsers([]);
  };

  const handleClearSelection = (): void => {
    setSelectedUser(null);
    setQuery("");
    setUsers([]);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full" size="sm">
          {isOpen ? "キャンセル" : "+ 参加者を追加"}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="eventId" value={eventId} />
          {selectedUser && <input type="hidden" name="userId" value={selectedUser.id} />}

          <div className="space-y-2">
            <Label htmlFor="userSearch">ユーザー検索</Label>
            <div className="relative">
              <Input
                id="userSearch"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (selectedUser) {
                    setSelectedUser(null);
                  }
                }}
                placeholder="名前・ユーザー名・メールで検索..."
                autoComplete="off"
              />
              {selectedUser && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
                >
                  ✕
                </button>
              )}
            </div>
            {isSearching && <p className="text-muted-foreground text-sm">検索中...</p>}
            {users.length > 0 && !selectedUser && (
              <div className="bg-background rounded-md border shadow-md">
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className="hover:bg-muted flex w-full items-center gap-3 px-3 py-2 text-left first:rounded-t-md last:rounded-b-md"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
                      <AvatarFallback>{(user.name ?? user.email)[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name ?? user.email}</p>
                      <p className="text-muted-foreground text-xs">
                        {user.username ? `@${user.username}` : user.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {query.length >= 2 && users.length === 0 && !isSearching && !selectedUser && (
              <p className="text-muted-foreground text-sm">ユーザーが見つかりません</p>
            )}
            {state.error?.userId && <p className="text-sm text-red-500">{state.error.userId[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname">ニックネーム（任意）</Label>
            <Input id="nickname" name="nickname" placeholder="表示名を設定" maxLength={50} />
            {state.error?.nickname && (
              <p className="text-sm text-red-500">{state.error.nickname[0]}</p>
            )}
          </div>

          <Button type="submit" size="sm" disabled={isPending || !selectedUser}>
            {isPending ? "追加中..." : "追加"}
          </Button>
        </form>
      </CollapsibleContent>
    </Collapsible>
  );
}
