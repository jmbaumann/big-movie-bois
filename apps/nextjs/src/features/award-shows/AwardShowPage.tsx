import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CheckCircle2, Loader2, Lock, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { io } from "socket.io-client";
import { z } from "zod";

import { api, RouterOutputs } from "~/utils/api";
import { useArray, type UseArray } from "~/utils/hooks/use-array";
import useBreakpoint from "~/utils/hooks/use-breakpoint";
import { cn } from "~/utils/shadcn";
import ResponsiveDialog from "~/components/ResponsiveDialog";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel } from "~/components/ui/form";
import { toast, useToast } from "~/components/ui/hooks/use-toast";
import { Input } from "~/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { env } from "~/env.mjs";
import Layout from "~/layouts/main/Layout";
import Loading from "~/layouts/main/Loading";
import { ONE_DAY_IN_SECONDS } from "~/utils";

type Pick = { id?: string; categoryId: string; nomineeId: string };
type AwardShowGroup = RouterOutputs["awardShowGroup"]["get"];

export default function AwardShowPage() {
  const { data: sessionData } = useSession();
  const breakpoint = useBreakpoint();
  const router = useRouter();
  const slug = router.query.slug as string;
  const year = router.query.year as string;

  const [activeGroupId, setActiveGroupId] = useState<string | undefined>((router.query.groupId as string) ?? undefined);
  const picks = useArray<Pick>();

  const handleGroup = (groupId: string | undefined) => {
    const query = groupId ? { groupId } : {};
    void router.push({
      pathname: `/pick-em/${slug}/${year}`,
      query,
    });

    if (activeGroupId !== groupId) setActiveGroupId(groupId);
  };

  const { data: awardShowYear, refetch: refetchYear } = api.awardShow.getBySlugYear.useQuery(
    { slug, year },
    { staleTime: ONE_DAY_IN_SECONDS, enabled: !!slug && !!year },
  );
  const { data: awardShowGroup, refetch } = api.awardShowGroup.get.useQuery(
    { id: activeGroupId, awardShowYearId: awardShowYear?.id },
    { staleTime: ONE_DAY_IN_SECONDS, enabled: !!activeGroupId || !!awardShowYear },
  );
  const { data: groups } = api.awardShowGroup.getPublic.useQuery(
    { awardShowYearId: awardShowYear?.id ?? "" },
    { staleTime: ONE_DAY_IN_SECONDS, enabled: !!awardShowYear?.id },
  );
  const { data: myGroups } = api.awardShowGroup.getMy.useQuery(
    { awardShowYearId: awardShowYear?.id ?? "" },
    { staleTime: ONE_DAY_IN_SECONDS, enabled: !!awardShowYear?.id },
  );
  const { data: myPicks, refetch: refetchMyPicks } = api.awardShowGroup.myPicks.useQuery(
    { userId: sessionData?.user.id ?? "", groupId: activeGroupId ?? awardShowGroup?.id ?? "" },
    { enabled: !!sessionData, staleTime: ONE_DAY_IN_SECONDS },
  );
  const { mutate: makePick, isLoading: submitting } = api.awardShowGroup.pick.useMutation();

  const isLocked = awardShowGroup ? awardShowGroup.awardShowYear.locked <= new Date() : false;

  useEffect(() => {
    if (!activeGroupId && awardShowGroup && activeGroupId !== awardShowGroup.id && !awardShowGroup.default)
      setActiveGroupId(awardShowGroup.id);
  }, [awardShowGroup]);

  useEffect(() => {
    if (myPicks) picks.set(myPicks);
  }, [myPicks]);

  useEffect(() => {
    const socket = io(env.NEXT_PUBLIC_WEBSOCKET_SERVER, {
      // withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("Connected to the WebSocket server");
    });

    socket.on(`pick-em:${awardShowGroup?.awardShowYearId}:winner-update`, () => {
      refetch();
    });

    return () => {
      socket.disconnect();
    };
  }, [awardShowGroup]);

  function handlePick(categoryId: string, nomineeId: string) {
    if (isLocked) return;

    const picked = picks.array.findIndex((e) => e.categoryId === categoryId);
    if (picked >= 0) picks.removeAt(picked);
    picks.add({ categoryId, nomineeId });
  }

  function submitPicks() {
    if (sessionData?.user) {
      const data = picks.array.map((e) => ({
        ...e,
        userId: sessionData?.user.id,
        groupId: activeGroupId ?? awardShowGroup!.id,
      }));
      makePick(data, {
        onSuccess: () => {
          toast({ title: "Picks submitted" });
          refetchMyPicks();
        },
      });
    }
  }

  if (!awardShowYear) return <Loading />;

  if (breakpoint.isMobile)
    return awardShowGroup ? (
      <Mobile
        awardShowGroup={awardShowGroup}
        picks={picks}
        handlePick={handlePick}
        submitting={submitting}
        submitPicks={submitPicks}
        isLocked={isLocked}
      />
    ) : (
      <Loading />
    );

  return (
    <Layout
      className="lg:w-11/12"
      title={
        (awardShowGroup
          ? `${awardShowGroup.awardShowYear.awardShow.name} ${awardShowGroup?.awardShowYear.year}`
          : "Award Show") + ` Pick 'Em`
      }
      showFooter
    >
      <div className="mb-6 flex gap-x-4">
        <div className="flex min-w-[25%] max-w-[25%] grow flex-col gap-y-4">
          {/* <Card className="p-0">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center justify-between gap-x-6">
                Groups {awardShowYear && <GroupForm awardShowYearId={awardShowYear.id} />}
              </CardTitle>
            </CardHeader>

            <CardContent className="px-4">
              {!!myGroups?.length && (
                <>
                  <p className="text-xs underline">My Groups</p>
                  {myGroups?.map((group, i) => (
                    <div key={i} className="flex items-end justify-between">
                      <p
                        className={cn(
                          "hover:text-primary inline-block hover:cursor-pointer",
                          (activeGroupId === group.id || (!activeGroupId && group.default)) && "text-primary",
                        )}
                        onClick={() => handleGroup(group.default ? undefined : group.id)}
                      >
                        {group.name}
                      </p>
                      <p className="inline-block text-sm">{group.entries} entries</p>
                    </div>
                  ))}
                </>
              )}

              {!!groups?.length && (
                <>
                  <p className="mt-2 text-xs underline">Public Groups</p>
                  {groups?.map((group, i) => (
                    <div key={i} className="flex items-end justify-between">
                      <p
                        className={cn(
                          "hover:text-primary inline-block hover:cursor-pointer",
                          (activeGroupId === group.id || (!activeGroupId && group.default)) && "text-primary",
                        )}
                        onClick={() => handleGroup(group.default ? undefined : group.id)}
                      >
                        {group.name}
                      </p>
                      <p className="inline-block text-sm">{group.entries} entries</p>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card> */}

          {awardShowGroup && (
            <Card className="p-0">
              <CardHeader className="p-4">
                <CardTitle className="flex flex-col">
                  <div className="text-2xl text-white">
                    {awardShowGroup.awardShowYear.awardShow.name} {awardShowGroup.awardShowYear.year}
                  </div>
                  <div className="text-sm">
                    {awardShowGroup.name}{" "}
                    {!awardShowGroup.default && <small className="text-xs">- {awardShowGroup.owner.username}</small>}
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="px-4"></CardContent>

              <CardFooter className="text-sm">
                <Lock className="mr-2" size={20} /> Picks{" "}
                {isLocked ? "locked" : "lock on " + format(awardShowGroup.awardShowYear.locked, "PP @ p")}
              </CardFooter>
            </Card>
          )}

          <Card className="p-0">
            <CardHeader className="p-4">
              <CardTitle>Leaderboard</CardTitle>
            </CardHeader>

            <CardContent className="px-4">
              {!awardShowGroup?.leaderboard.length ? (
                <p className="text-xs italic">No scores yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead>User</TableHead>
                      <TableHead># Correct</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {awardShowGroup?.leaderboard.map((player, i) => {
                      const sameScoreIndex = awardShowGroup.leaderboard.findIndex(
                        (e) => e.correctPicks === player.correctPicks,
                      );
                      return (
                        <TableRow key={i}>
                          <TableCell>{sameScoreIndex + 1}.</TableCell>
                          <TableCell>{player.userName}</TableCell>
                          <TableCell>{player.correctPicks}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {!awardShowGroup ? (
          <Loader2 size={48} className="mx-auto my-2 animate-spin" />
        ) : (
          <div className="flex flex-col">
            <div className="mb-2 flex items-center justify-between">
              {isLocked ? (
                <div className="flex items-center">
                  <Lock size={20} className="mr-1" />
                  Picks Locked
                </div>
              ) : (
                <Button isLoading={submitting} onClick={() => submitPicks()}>
                  Save Picks
                </Button>
              )}

              <p>
                {picks.array.length} / {awardShowGroup.awardShowYear.categories.length}
              </p>
            </div>

            <PickList awardShowGroup={awardShowGroup} picks={picks} handlePick={handlePick} isLocked={isLocked} />
          </div>
        )}
      </div>
    </Layout>
  );
}

function PickList({
  awardShowGroup,
  picks,
  handlePick,
  isLocked,
}: {
  awardShowGroup: AwardShowGroup;
  picks: UseArray<Pick>;
  handlePick: (categoryId: string, nomineeId: string) => void;
  isLocked: boolean;
}) {
  return (
    <div className="flex flex-col gap-y-6">
      {awardShowGroup.awardShowYear.categories.map((category, i) => (
        <div key={i} className="">
          <p className="mb-1 text-lg text-white">{category.name}</p>

          <div className="grid grid-cols-2 gap-y-2 lg:grid-cols-6">
            {category.nominees.map((nominee, j) => {
              const picked = picks.array.find((e) => e.categoryId === category.id && e.nomineeId === nominee.id);
              const winnerId = category.nominees.find((e) => e.winner)?.id;
              return (
                <Card
                  key={i + "-" + j}
                  className={cn(
                    "mx-2",
                    !isLocked && "hover:border-primary hover:cursor-pointer",
                    picked && "text-primary border-primary",
                    winnerId === nominee.id &&
                      "border-green-600 text-green-600 hover:cursor-default hover:border-green-600",
                    !!winnerId &&
                      winnerId !== nominee.id &&
                      picked?.nomineeId === nominee.id &&
                      "border-red-600 text-red-600 hover:cursor-default hover:border-red-600",
                  )}
                  onClick={() => handlePick(category.id, nominee.id)}
                >
                  {nominee.image && (
                    <CardContent className="flex items-center p-2 text-center">
                      <Image
                        className="h-52 object-cover object-center"
                        src={nominee.image}
                        alt=""
                        width={600}
                        height={800}
                      ></Image>
                    </CardContent>
                  )}

                  <CardFooter className="flex flex-col p-2 text-center">
                    <p className="text-lg">
                      {winnerId === nominee.id && picked?.nomineeId === winnerId && (
                        <CheckCircle2 className="mr-1 inline-block text-green-600" size={20} />
                      )}
                      {!!winnerId && winnerId !== nominee.id && picked?.nomineeId === nominee.id && (
                        <XCircle className="mr-1 inline-block text-red-600" size={20} />
                      )}
                      {nominee.name}
                    </p>
                    <p className="text-sm text-slate-400">{nominee.subtext}</p>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupForm({ awardShowYearId }: { awardShowYearId: string }) {
  const { data: sessionData } = useSession();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);

  const { mutate: createGroup, isLoading: saving } = api.awardShowGroup.create.useMutation();

  const formSchema = z.object({
    awardShowYearId: z.string(),
    name: z.string(),
    ownerId: z.string(),
    public: z.boolean(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      awardShowYearId,
      name: "",
      ownerId: sessionData?.user.id,
      public: false,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.ownerId)
      createGroup(values, {
        onSuccess: () => {
          toast({ title: "Group created" });
          setOpen(false);
        },
        onError: (error) => {
          toast({ title: error.message, variant: "destructive" });
        },
      });
  }

  return (
    <ResponsiveDialog open={open} setOpen={setOpen}>
      <ResponsiveDialog.Trigger>
        <Button>Create Group</Button>
      </ResponsiveDialog.Trigger>

      <ResponsiveDialog.Content>
        <ResponsiveDialog.Header>
          <ResponsiveDialog.Title>Create Group</ResponsiveDialog.Title>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="w-full lg:w-2/3">
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="text-black" autoComplete="off" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="public"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Public</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <Button className="float-right mt-4 w-fit" type="submit" isLoading={saving}>
                Submit
              </Button>
            </form>
          </Form>
        </ResponsiveDialog.Header>
      </ResponsiveDialog.Content>
    </ResponsiveDialog>
  );
}

function Mobile({
  awardShowGroup,
  picks,
  handlePick,
  submitting,
  submitPicks,
  isLocked,
}: {
  awardShowGroup: AwardShowGroup;
  picks: UseArray<Pick>;
  handlePick: (categoryId: string, nomineeId: string) => void;
  submitting: boolean;
  submitPicks: () => void;
  isLocked: boolean;
}) {
  const { data: sessionData } = useSession();

  const [tab, setTab] = useState<"picks" | "leaderboard">("picks");

  return (
    <Layout title="Fantasy Film">
      <div className="flex flex-col">
        <div className="mb-4 flex justify-around border-b-[1px] border-zinc-50">
          <Button
            className={cn("text-lg", tab === "picks" && "text-primary font-bold")}
            variant="ghost"
            onClick={() => setTab("picks")}
          >
            Picks
          </Button>
          <Button
            className={cn("text-lg", tab === "leaderboard" && "text-primary font-bold")}
            variant="ghost"
            onClick={() => setTab("leaderboard")}
          >
            Leaderboard
          </Button>
        </div>

        {tab === "picks" && (
          <div className="">
            {!isLocked && (
              <div className="mb-2 flex items-center justify-center">
                <Lock className="mr-2" size={20} /> Picks lock on{" "}
                {format(awardShowGroup.awardShowYear.locked, "PP @ p")}
              </div>
            )}

            <PickList
              awardShowGroup={awardShowGroup}
              picks={picks}
              handlePick={handlePick}
              isLocked={isLocked}
            ></PickList>
            <div className="fixed bottom-0 w-full bg-neutral-900 bg-opacity-95 px-4 py-2">
              <div className="flex items-center justify-between">
                <p>
                  {picks.array.length} / {awardShowGroup.awardShowYear.categories.length}
                </p>

                {isLocked ? (
                  <div className="flex items-center">
                    <Lock size={20} className="mr-1" />
                    Picks Locked
                  </div>
                ) : (
                  <Button isLoading={submitting} onClick={() => submitPicks()}>
                    Save Picks
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "leaderboard" && (
          <div className="px-4">
            {!awardShowGroup?.leaderboard.length ? (
              <p className="text-sm italic">No scores yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>User</TableHead>
                    <TableHead># Correct</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awardShowGroup?.leaderboard.map((player, i) => {
                    const sameScoreIndex = awardShowGroup.leaderboard.findIndex(
                      (e) => e.correctPicks === player.correctPicks,
                    );
                    return (
                      <TableRow key={i}>
                        <TableCell>{sameScoreIndex + 1}.</TableCell>
                        <TableCell>{player.userName}</TableCell>
                        <TableCell>{player.correctPicks}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
