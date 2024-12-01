import { useEffect, useState } from "react";
import { Edit, Save, UserCircle } from "lucide-react";

import { api, RouterOutputs } from "~/utils/api";
import { useArray } from "~/utils/hooks/use-array";
import { Button } from "~/components/ui/button";
import { toast } from "~/components/ui/hooks/use-toast";
import { Input } from "~/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { formatDate, randomNumber } from "~/utils";

type User = RouterOutputs["user"]["getAll"][number];

export default function UsersAdmin() {
  const { data: usersList } = api.user.getAll.useQuery();
  const { mutate: updateUser, isLoading: updating } = api.user.update.useMutation();

  const users = useArray(usersList || []);

  useEffect(() => {
    if (usersList) users.set(usersList);
  }, [usersList]);

  const handleChange = (index: number) => {
    const user = users.array[index];
    const username = "user_" + randomNumber(6);

    users.updateAt(index, { ...users.array[index], username } as User);
    updateUser(
      { id: user!.id, username },
      {
        onSuccess: () => {
          toast({ title: "Updated" });
        },
        onError: (e) => {
          toast({ title: e.message });
        },
      },
    );
  };

  return (
    <div className="flex flex-col">
      <Table className="mb-2">
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-[40px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.array.map((user, i) => (
            <TableRow key={i}>
              <TableCell>{user.username}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.isAdmin && <UserCircle />}</TableCell>
              <TableCell>{formatDate(user.createdAt, "LLL dd, yyyy")}</TableCell>
              <TableCell>
                <Button size="icon" onClick={() => handleChange(i)} isLoading={updating}>
                  <Edit />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
