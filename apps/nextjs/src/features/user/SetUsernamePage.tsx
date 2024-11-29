import { useState } from "react";
import { useRouter } from "next/router";
import { zodResolver } from "@hookform/resolvers/zod";
import { XCircle } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { useConfirm } from "~/components/ui/hooks/use-confirm";
import { useToast } from "~/components/ui/hooks/use-toast";
import { Input } from "~/components/ui/input";

export default function SetUsernamePage() {
  const { data: sessionData, update } = useSession();
  const router = useRouter();
  const confirm = useConfirm();
  const { toast } = useToast();

  const [updating, setUpdating] = useState(false);

  const { mutate: updateUsername } = api.user.update.useMutation();
  const { mutate: checkAvailable } = api.user.checkAvailable.useMutation();

  const formSchema = z.object({
    username: z
      .string()
      .min(3, { message: "Username must be at least 3 characters long" })
      .max(20, { message: "Username cannot exceed 20 characters" }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setUpdating(true);
    checkAvailable(
      { keyword: values.username },
      {
        onSettled: (available) => {
          if (available)
            updateUsername(
              { ...values, id: sessionData?.user.id! },
              {
                onSuccess: () => {
                  toast({ title: "Username updated" });
                  update({ username: values.username });
                  router.push("/");
                },
                onError: (error) => {
                  toast({ title: error.message, variant: "destructive" });
                },
                onSettled: () => {
                  setUpdating(false);
                },
              },
            );
          else {
            form.setError("username", { message: "Username taken" }, { shouldFocus: true });
            setUpdating(false);
          }
        },
      },
    );
  }

  const onInvalid = (errors: any) => console.log({ errors });

  async function handleCancel() {
    const ok = await confirm(
      "Are you sure you want to cancel creating your account? You can continue creating your account at any time.",
    );
    if (ok) {
      signOut();
    }
  }

  return (
    <Form {...form}>
      <form className="flex flex-col gap-y-2" onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
        <p className="text-xl">Welcome {sessionData?.user.name}!</p>
        <p className="text-lg">Choose a username</p>

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem className="w-2/3">
              <FormLabel>Username</FormLabel>
              <FormControl>
                <div className="flex items-center">
                  <Input {...field} className="text-black" autoComplete="off" />
                  {/* {usernameTaken && (
                    <div className="ml-2 flex gap-x-2">
                      <XCircle className="text-red-600" size={24} />
                      <p className="text-md w-max font-bold text-red-600">Username taken</p>
                    </div>
                  )} */}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex w-2/3 justify-between">
          <Button className="w-min " onClick={() => handleCancel()}>
            Cancel
          </Button>
          <Button className="w-min" type="submit" isLoading={updating}>
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
}
