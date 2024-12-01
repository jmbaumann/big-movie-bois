import { useEffect } from "react";

import { api } from "~/utils/api";
import { useArray } from "~/utils/hooks/use-array";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { formatDate } from "~/utils";

export default function InboxAdmin() {
  const { data: messagesList } = api.contact.getAll.useQuery();

  const messages = useArray(messagesList || []);

  useEffect(() => {
    if (messagesList) messages.set(messagesList);
  }, [messagesList]);

  return (
    <div className="flex flex-col">
      <Table className="mb-2">
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Sent</TableHead>
            {/* <TableHead className="w-[40px]"></TableHead> */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages?.array.map((message, i) => (
            <TableRow key={i}>
              <TableCell>{message.user.username}</TableCell>
              <TableCell>{message.email}</TableCell>
              <TableCell>{message.body}</TableCell>
              <TableCell>{formatDate(message.createdAt, "LLL dd, yyyy")}</TableCell>
              {/* <TableCell></TableCell> */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
