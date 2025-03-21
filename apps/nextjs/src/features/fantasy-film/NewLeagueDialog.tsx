import { useRouter } from "next/router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { api } from "~/utils/api";
import { cn } from "~/utils/shadcn";
import ResponsiveDialog from "~/components/ResponsiveDialog";
import { Button } from "~/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "~/components/ui/form";
import { useToast } from "~/components/ui/hooks/use-toast";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";

export default function NewLeagueDialog({ className }: { className?: string }) {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const { isLoading, mutate: createLeague } = api.ffLeague.create.useMutation();

  const formSchema = z.object({
    name: z.string().min(2).max(50),
    public: z.boolean(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      public: false,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!sessionData?.user)
      return toast({
        title: "Must be logged in to create a League",
        variant: "destructive",
      });
    if (!values.name) return toast({ title: "Must include a name", variant: "destructive" });
    createLeague(values, {
      onSuccess: (data) => {
        toast({
          title: "League Created",
        });
        void router.push(`/fantasy-film/${data.id}`);
      },
      onError: (error) => {
        toast({ title: error.message, variant: "destructive" });
      },
    });
  }

  return (
    <ResponsiveDialog>
      <ResponsiveDialog.Trigger
        className={cn(
          "bg-primary inline-flex h-10 items-center justify-center whitespace-nowrap rounded-3xl px-4 py-2 text-sm font-medium text-slate-50 hover:bg-teal-700/90",
          className,
        )}
      >
        + Create League
      </ResponsiveDialog.Trigger>
      <ResponsiveDialog.Content>
        <ResponsiveDialog.Header>
          <ResponsiveDialog.Title>Create New League</ResponsiveDialog.Title>
        </ResponsiveDialog.Header>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-8">
            <div className="flex w-full space-x-10">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>League Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="text-black" autoComplete="off" />
                    </FormControl>
                  </FormItem>
                )}
              />
              {/* <FormField
                control={form.control}
                name="public"
                render={({ field }) => (
                  <FormItem className="">
                    <FormControl>
                      <div className="mt-6 flex items-center space-x-2">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="text-black"
                        />
                        <Label htmlFor="public">Public</Label>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              /> */}
            </div>
            <Button type="submit" className="float-right" isLoading={isLoading}>
              Create League
            </Button>
          </form>
        </Form>
      </ResponsiveDialog.Content>
    </ResponsiveDialog>
  );
}
