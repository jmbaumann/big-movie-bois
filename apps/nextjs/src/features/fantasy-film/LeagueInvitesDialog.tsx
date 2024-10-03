import { format } from "date-fns";
import { Loader2, Mail } from "lucide-react";
import { useSession } from "next-auth/react";

import { LEAGUE_INVITE_STATUSES } from "@repo/api/src/enums";

import { api } from "~/utils/api";
import { cn } from "~/utils/shadcn";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { useToast } from "~/components/ui/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";

export default function LeagueInvitesDialog({
  refreshLeagues,
  className,
}: {
  refreshLeagues: () => void;
  className?: string;
}) {
  const { data: sessionData } = useSession();
  const { toast } = useToast();

  const {
    isLoading,
    data: invites,
    refetch: refreshInvites,
  } = api.ffLeague.getInvitesByUserId.useQuery(
    { userId: sessionData?.user.id ?? "" },
    {
      enabled: !!sessionData?.user,
    },
  );
  const { mutate: addMember } = api.ffLeague.addMember.useMutation();
  const { mutate: updateInvite } = api.ffLeague.updateInvite.useMutation();

  function handleAccept(leagueId: string, inviteId: string) {
    addMember(
      { leagueId, userId: sessionData!.user.id, inviteId },
      {
        onSuccess: () => {
          toast({ title: "Added to League" });
          refreshInvites();
          refreshLeagues();
        },
      },
    );
  }

  function handleDecline(inviteId: string) {
    updateInvite(
      { id: inviteId, status: LEAGUE_INVITE_STATUSES.DECLINED },
      {
        onSuccess: () => {
          toast({ title: "Invite declined" });
          refreshInvites();
        },
      },
    );
  }

  if (!invites?.length) return <></>;

  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          "bg-primary inline-flex h-10 items-center justify-center whitespace-nowrap rounded-3xl px-4 py-2 text-sm font-medium text-slate-50 hover:bg-teal-700/90",
          className,
        )}
      >
        <Mail className="mr-1" />
        Invites
        <Badge className="ml-1 bg-red-600">{invites.length}</Badge>
      </DialogTrigger>
      <DialogContent className="max-w-1/2 w-1/2">
        <DialogHeader>
          <DialogTitle>League Invitations</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>League</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((invite, i) => {
              return (
                <TableRow key={i}>
                  <TableCell>{invite.league.name}</TableCell>
                  <TableCell>{invite.league.owner.name}</TableCell>
                  <TableCell>{format(invite.createdAt, "LLL dd, yyyy")}</TableCell>
                  <TableCell className="flex items-center">
                    <Button
                      className="mr-1 bg-green-500 hover:bg-green-700"
                      onClick={() => handleAccept(invite.leagueId, invite.id)}
                    >
                      Accept
                    </Button>
                    <Button className="ml-1 bg-red-600 hover:bg-red-800" onClick={() => handleDecline(invite.id)}>
                      Decline
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
