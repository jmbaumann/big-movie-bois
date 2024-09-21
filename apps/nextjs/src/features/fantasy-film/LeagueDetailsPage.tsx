import { ChangeEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { ChevronLeft, Trash } from "lucide-react";
import { useSession } from "next-auth/react";

import { AppRouter } from "@repo/api";
import { LEAGUE_INVITE_STATUSES } from "@repo/api/src/enums";
import { LeagueSession, StudioFilm } from "@repo/db";

import { api } from "~/utils/api";
import { getMostRecentAndUpcoming } from "~/utils/fantasy-film-helpers";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Command, CommandDialog, CommandEmpty, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { useConfirm } from "~/components/ui/hooks/use-confirm";
import { toast } from "~/components/ui/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import Layout from "~/layouts/main/Layout";
import NewSessionDialog from "./NewSessionDialog";

type League = inferRouterOutputs<AppRouter>["ffLeague"]["getById"];
type TMDBMovie = inferRouterOutputs<AppRouter>["tmdb"]["getById"];
type StudioFilmDetails = StudioFilm & { tmdb: TMDBMovie };

export default function LeagueDetailsPage() {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const leagueId = router.query.leagueId as string;

  const [activeTab, setActiveTab] = useState("sessions");
  const handleTab = (tab: string) => {
    void router.push({
      pathname: `/fantasy-film/${router.query.leagueId}`,
      query: { tab },
    });
  };
  useEffect(() => {
    if (router.query.tab) setActiveTab(router.query.tab as string);
  }, [router.query.tab]);

  const {
    data: league,
    isLoading,
    refetch: refreshLeague,
  } = api.ffLeague.getById.useQuery(
    { id: leagueId },
    {
      enabled: !!leagueId,
    },
  );
  const isOwner = sessionData?.user.id === league?.ownerId;

  return (
    <Layout showFooter>
      <div>
        <Link href={"/fantasy-film"}>
          <Button variant="link" className="px-0">
            <ChevronLeft /> Leagues
          </Button>
        </Link>
        {league && (
          <div className="flex">
            <h1 className="mb-2 text-2xl">{league.name}</h1>
            {sessionData?.user.id === league.ownerId && (
              <div className="ml-auto flex items-center">
                <NewSessionDialog className="ml-auto" league={league} />
              </div>
            )}
          </div>
        )}

        <div className="">
          <Tabs className="w-full px-2 lg:px-4" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="">
              <TabsTrigger value="sessions" onClick={() => handleTab("sessions")}>
                Sessions
              </TabsTrigger>
              <TabsTrigger value="members" onClick={() => handleTab("members")}>
                Members
              </TabsTrigger>
              <TabsTrigger value="history" onClick={() => handleTab("history")}>
                History
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger value="settings" onClick={() => handleTab("settings")}>
                  Settings
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="sessions">
              {league?.sessions.map((session, i) => <SessionCard key={i} session={session} />)}
            </TabsContent>
            <TabsContent value="members">
              <Members league={league!} refreshLeague={refreshLeague} />
            </TabsContent>
            <TabsContent value="history">History</TabsContent>
            <TabsContent value="settings">Settings</TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}

function SessionCard({ session }: { session: LeagueSession }) {
  const { data: films } = api.ffLeagueSession.getAcquiredFilms.useQuery({
    sessionId: session.id,
    includeDetails: true,
  });

  const { mostRecent, upcoming } = getMostRecentAndUpcoming(films);

  return (
    <Card className="my-2">
      <CardHeader>
        <CardTitle>
          <Link className="hover:text-primary" href={`/fantasy-film/${session.leagueId}/${session.id}`}>
            {session.name}
          </Link>
          <p className="ml-4 inline-block text-sm">
            {format(session.startDate, "LLL d, yyyy")} - {format(session.endDate, "LLL d, yyyy")}
          </p>
        </CardTitle>
        <CardDescription></CardDescription>
      </CardHeader>
      <CardContent>
        <div className="">
          <div className="flex w-1/3">
            {mostRecent && (
              <div className="flex flex-col items-center">
                <p className="text-lg">Most Recent</p>
                {/* <Image
                  className="min-w-[125px]"
                  src={`https://image.tmdb.org/t/p/w1280/${mostRecent.tmdb.details.poster}`}
                  alt={`${mostRecent.tmdb.details.title} poster`}
                  width={150}
                  height={225}
                /> */}
                <p className="text-center">{mostRecent.tmdb!.title}</p>
                <p className="text-center text-xs">{format(mostRecent.tmdb!.releaseDate, "LLL d, yyyy")}</p>
              </div>
            )}
            {upcoming && (
              <div className="flex flex-col items-center">
                <p className="text-lg">Upcoming</p>
                {/* <Image
                  className="min-w-[125px]"
                  src={`https://image.tmdb.org/t/p/w1280/${upcoming.tmdb.details.poster}`}
                  alt={`${upcoming.tmdb.details.title} poster`}
                  width={150}
                  height={225}
                /> */}
                <p className="text-center">{upcoming.tmdb!.title}</p>
                <p className="text-center text-xs">{format(upcoming.tmdb!.releaseDate, "LLL d, yyyy")}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Members({ league, refreshLeague }: { league: League; refreshLeague: Function }) {
  const [searchKeyword, setSearchKeyword] = useState<string>();
  const [open, setOpen] = useState(false);
  const confirm = useConfirm();

  const { data: searchResult } = api.user.search.useQuery(
    { keyword: searchKeyword ?? "" },
    { enabled: !!searchKeyword },
  );
  const { isLoading, mutate: invite } = api.ffLeague.invite.useMutation();
  const { mutate: removeMember } = api.ffLeague.removeMember.useMutation();
  const { mutate: removeInvite } = api.ffLeague.removeInvite.useMutation();

  function handleUserSelected(userId: string) {
    invite(
      { userId, leagueId: league!.id },
      {
        onSettled: () => refreshLeague(),
        onError: (error) => toast({ title: error.message, variant: "destructive" }),
      },
    );
    setOpen(false);
    setSearchKeyword(undefined);
  }

  async function handleRemoveUser(id: string, type: "member" | "invite") {
    const ok = await confirm(
      `Are you sure you want to ${type === "member" ? "remove this member" : "revoke this invitation"}?`,
    );
    if (ok)
      if (type === "member")
        removeMember(
          { id },
          {
            onSuccess: () => toast({ title: "Member removed" }),
            onSettled: () => refreshLeague(),
          },
        );
      else
        removeInvite(
          { id },
          {
            onSuccess: () => toast({ title: "Invitation revoked" }),
            onSettled: () => refreshLeague(),
          },
        );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]"></TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {league?.members.map((member, i) => {
            const isOwner = league?.ownerId === member.userId;
            return (
              <TableRow key={i}>
                <TableCell>
                  {isOwner && <Badge>Owner</Badge>}
                  {!isOwner && member.isAdmin && <Badge>Admin</Badge>}
                </TableCell>
                <TableCell>{member.user.name}</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell className="float-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="ml-auto bg-red-600 text-white"
                    onClick={() => handleRemoveUser(member.id, "member")}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {league?.invites
            .filter((e) => e.status === LEAGUE_INVITE_STATUSES.PENDING)
            .map((invite, i) => {
              return (
                <TableRow key={i}>
                  <TableCell></TableCell>
                  <TableCell>{invite.user.name}</TableCell>
                  <TableCell>Invited</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="ml-auto bg-red-600 text-white"
                      onClick={() => handleRemoveUser(invite.id, "invite")}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>

      <Button className="mt-4" onClick={() => setOpen(true)}>
        + Add Member
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search by username"
          value={searchKeyword}
          onChangeCapture={(e: ChangeEvent<HTMLInputElement>) => setSearchKeyword(e.target.value)}
        />
        <CommandList>
          {!!searchKeyword && <CommandEmpty>No users found</CommandEmpty>}
          {searchResult?.map((result, i) => (
            <CommandItem key={i} onSelect={() => handleUserSelected(result.id)}>
              {result.name}
            </CommandItem>
          ))}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
