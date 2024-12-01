import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { zodResolver } from "@hookform/resolvers/zod";
import { XCircle } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { api } from "~/utils/api";
import { cn } from "~/utils/shadcn";
import { Button } from "~/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "~/components/ui/form";
import { useConfirm } from "~/components/ui/hooks/use-confirm";
import { useToast } from "~/components/ui/hooks/use-toast";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import Layout from "~/layouts/main/Layout";

export default function Contact() {
  const { data: sessionData, update } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [totalChars, setTotalChars] = useState(0);

  const { mutate: createMessage, isLoading } = api.contact.create.useMutation();

  const formSchema = z.object({
    email: z.string().email(),
    body: z.string().max(2000, { message: "Message cannot exceed 2000 characters" }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      body: "",
    },
  });

  useEffect(() => {
    const { body } = form.getValues();
    setTotalChars(body.length);
  }, [form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (sessionData?.user.id)
      createMessage(
        { ...values, userId: sessionData.user.id },
        {
          onSuccess: () => {
            toast({ title: "Message sent. Thanks!" });
            router.push("/");
          },
          onError: (e) => {
            toast({ title: e.message });
          },
        },
      );
    else toast({ title: "You must be logged in to send a message" });
  }

  const onInvalid = (errors: any) => console.log({ errors });

  return (
    <Layout showFooter>
      <h1 className="text-2xl font-bold">Contact</h1>
      {!sessionData?.user && <p className="text-sm">You must be logged in to send a message.</p>}

      <Form {...form}>
        <form className="flex flex-col gap-y-2" onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="w-full md:w-2/3">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} className="text-black" autoComplete="off" disabled={!sessionData?.user} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem className="w-full md:w-2/3">
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    className="text-black"
                    autoComplete="off"
                    disabled={!sessionData?.user}
                    onInput={() => setTotalChars(form.getValues().body.length)}
                  />
                </FormControl>
                <p className={cn("text-muted-foreground float-right text-sm", totalChars > 2000 && "text-red-500")}>
                  {totalChars} / 2000
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex w-full justify-between md:w-2/3">
            <Button className="w-min" type="submit" disabled={!sessionData?.user} isLoading={isLoading}>
              Send
            </Button>
          </div>
        </form>
      </Form>
    </Layout>
  );
}
