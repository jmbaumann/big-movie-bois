import { ChangeEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { inferRouterOutputs } from "@trpc/server";
import { add, format } from "date-fns";
import { ChevronLeft, Trash } from "lucide-react";
import { useSession } from "next-auth/react";

import { AppRouter } from "@repo/api";
import { LEAGUE_INVITE_STATUSES } from "@repo/api/src/enums";
import { StudioFilm } from "@repo/db";

import { api } from "~/utils/api";
import { getDraftDate, getMostRecentAndUpcoming } from "~/utils/fantasy-film-helpers";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Command, CommandDialog, CommandEmpty, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { useConfirm } from "~/components/ui/hooks/use-confirm";
import { toast } from "~/components/ui/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import Layout from "~/layouts/main/Layout";
import Loading from "~/layouts/main/Loading";
import DraftCountdown from "./DraftCountdown";
import NewSessionDialog from "./NewSessionDialog";

type League = inferRouterOutputs<AppRouter>["ffLeague"]["getById"];
type LeagueSession = NonNullable<League>["sessions"][number];
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
  const canAddSession =
    isOwner && league?.sessions.some((e) => add(new Date(), { days: 30 }).getTime() > e.endDate.getTime());

  if (!league) return <Loading />;

  return (
    <Layout title={league.name + " | Fantasy Film"} showFooter>
      <div>
        <Link href={"/fantasy-film"}>
          <Button variant="link" className="px-0">
            <ChevronLeft /> Leagues
          </Button>
        </Link>
        {league && isOwner && (
          <div className="flex">
            <h1 className="mb-2 text-2xl">{league.name}</h1>
            <div className="ml-auto flex items-center">
              <NewSessionDialog
                className="ml-auto"
                league={league}
                disabled={!canAddSession && !sessionData?.user.isAdmin}
              />
            </div>
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
              {/* {isOwner && (
                <TabsTrigger value="settings" onClick={() => handleTab("settings")}>
                  Settings
                </TabsTrigger>
              )} */}
            </TabsList>
            <TabsContent value="sessions">
              {!league.sessions.length && <p>Your sessions will appear here</p>}
              {league?.sessions.map((session, i) => <SessionCard key={i} session={session} />)}
            </TabsContent>
            <TabsContent value="members">
              <Members league={league!} refreshLeague={refreshLeague} />
            </TabsContent>
            <TabsContent value="history">No history yet...</TabsContent>
            <TabsContent value="settings">Settings</TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}

function SessionCard({ session }: { session: LeagueSession }) {
  const router = useRouter();

  const { data: films } = api.ffLeagueSession.getAcquiredFilms.useQuery({
    sessionId: session.id,
    includeDetails: true,
  });

  const draftDate = getDraftDate(session.settings.draft);
  const draftIsOver = session?.studios.some((e) => !!e.films.length) || !session?.settings.draft.conduct;
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
          {!draftIsOver && (
            <div className="flex flex-col items-center">
              {!!draftDate && <DraftCountdown draftDate={draftDate} />}
              <Button onClick={() => router.push(`/fantasy-film/draft/${session!.id}`)}>Go to Draft</Button>
            </div>
          )}

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
  const { data: sessionData } = useSession();
  const [searchKeyword, setSearchKeyword] = useState<string>();
  const [open, setOpen] = useState(false);
  const confirm = useConfirm();

  const { data: searchResult } = api.user.search.useQuery(
    { keyword: searchKeyword ?? "" },
    { enabled: (searchKeyword?.length ?? 0) >= 3 },
  );
  const { isLoading, mutate: invite } = api.ffLeague.invite.useMutation();
  const { mutate: removeMember } = api.ffLeague.removeMember.useMutation();
  const { mutate: removeInvite } = api.ffLeague.removeInvite.useMutation();

  const isLeagueOwner = league?.ownerId === sessionData?.user.id;
  const totalMembers = (league?.members.length ?? 0) + (league?.invites.length ?? 0);

  function handleUserSelected(userId: string) {
    const invited = [...league!.members, ...league!.invites].find((e) => e.userId === userId);
    if (invited) toast({ title: "That user is already in this league" });
    else
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
            onSuccess: () => toast({ title: "Invitate deleted" }),
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
                <TableCell>{member.user.username}</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell className="float-right">
                  {isLeagueOwner && member.userId !== league?.ownerId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="ml-auto bg-red-600 text-white"
                      onClick={() => handleRemoveUser(member.id, "member")}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
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
                  <TableCell>{invite.user.username}</TableCell>
                  <TableCell>Invited</TableCell>
                  <TableCell className="float-right">
                    {isLeagueOwner && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="ml-auto bg-red-600 text-white"
                        onClick={() => handleRemoveUser(invite.id, "invite")}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>

      {isLeagueOwner && totalMembers <= 12 && (
        <>
          <Button className="mt-4" onClick={() => setOpen(true)}>
            + Add Member
          </Button>
          <p className="mt-1 text-xs font-light">You can add up to 12 members</p>
        </>
      )}
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
              {result.username}
            </CommandItem>
          ))}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
