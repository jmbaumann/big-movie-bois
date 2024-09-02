// import { useRouter } from "next/router";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { format, sub } from "date-fns";
// import { CalendarIcon, Delete, Loader2, Trash } from "lucide-react";
// import { useSession } from "next-auth/react";
// import { useFieldArray, useForm } from "react-hook-form";
// import * as z from "zod";

// import { api } from "~/utils/api";
// import { cn } from "~/utils/shadcn";
// import {
//   Accordion,
//   AccordionContent,
//   AccordionItem,
//   AccordionTrigger,
// } from "~/components/ui/accordion";
// import { Button } from "~/components/ui/button";
// import { Calendar } from "~/components/ui/calendar";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
// } from "~/components/ui/form";
// import { Input } from "~/components/ui/input";
// import { Label } from "~/components/ui/label";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "~/components/ui/popover";
// import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "~/components/ui/select";
// import { Switch } from "~/components/ui/switch";
// import { useToast } from "~/components/ui/hooks/use-toast";
// import Layout from "~/layouts/main/Layout";

// export default function NewSessionPage() {
//   const { data: sessionData } = useSession();
//   const { isLoading, mutate: createLeague } = api.ffLeague.create.useMutation();
//   const router = useRouter();
//   const { toast } = useToast();

//   const formSchema = z.object({
//     name: z.string().min(2).max(50),
//     public: z.boolean(),
//     draft: z.date().optional(),
//     draftDate: z.date().optional(),
//     draftHour: z.string().optional(),
//     draftMin: z.string().optional(),
//     draftAMPM: z.string().optional(),
//     settings: z.object({
//       draft: z.object({
//         type: z.enum(["snake", "linear"]),
//         order: z.array(z.string()),
//         roundTime: z.coerce.number(),
//       }),
//       teamStructure: z.array(
//         z.object({
//           type: z.enum([
//             "openingWeekendBoxOffice",
//             "totalBoxOffice",
//             "letterboxdNumWatched",
//             "letterboxdRating",
//             "reverseLetterboxdRating",
//             "oscarWins",
//           ]),
//           pos: z.number(),
//         }),
//       ),
//     }),
//   });

//   const form = useForm<z.infer<typeof formSchema>>({
//     resolver: zodResolver(formSchema),
//     defaultValues: {
//       name: "",
//       public: false,
//       draftHour: "12",
//       draftMin: "00",
//       draftAMPM: "PM",
//       settings: {
//         draft: {
//           type: "snake",
//           order: [],
//           roundTime: 120,
//         },
//         teamStructure: [
//           { type: "totalBoxOffice", pos: 1 },
//           { type: "openingWeekendBoxOffice", pos: 2 },
//           { type: "letterboxdRating", pos: 3 },
//           { type: "reverseLetterboxdRating", pos: 4 },
//           { type: "letterboxdNumWatched", pos: 5 },
//           { type: "oscarWins", pos: 6 },
//         ],
//       },
//     },
//   });

//   const { fields, append, remove } = useFieldArray({
//     name: "settings.teamStructure",
//     control: form.control,
//   });

//   function onSubmit(values: z.infer<typeof formSchema>) {
//     if (values.draftDate) {
//       const d = format(values.draftDate, "yyyy-MM-dd");
//       values.draft = new Date(
//         `${d} ${
//           values.draftAMPM === "PM"
//             ? (Number(values.draftHour) + 12).toString().padStart(2, "0")
//             : values.draftHour
//         }:${values.draftMin}:00`,
//       );
//     }
//     createLeague(
//       { ...values, ownerId: sessionData?.user.id ?? "", year: "2024" },
//       {
//         onSuccess: (uuid) => {
//           toast({
//             title: "League Created",
//           });
//           void router.push(`/league/${uuid}`);
//         },
//       },
//     );
//   }

//   return (
//     <>
//       <Layout showFooter={true}>
//         <>
//           <div className="flex">
//             <h1 className="inline-block font-sans uppercase">New League</h1>
//           </div>
//           <hr className="w-full" />

//           <Form {...form}>
//             <form
//               onSubmit={form.handleSubmit(onSubmit)}
//               className="mt-4 space-y-8"
//             >
//               <div className="flex w-full space-x-10">
//                 <FormField
//                   control={form.control}
//                   name="name"
//                   render={({ field }) => (
//                     <FormItem className="w-1/2">
//                       <FormLabel>League Name</FormLabel>
//                       <FormControl>
//                         <Input
//                           {...field}
//                           className="text-black"
//                           autoComplete="off"
//                         />
//                       </FormControl>
//                     </FormItem>
//                   )}
//                 />
//                 <FormField
//                   control={form.control}
//                   name="public"
//                   render={({ field }) => (
//                     <FormItem className="flex items-center">
//                       <FormControl>
//                         <div className="flex items-center space-x-2">
//                           <Switch
//                             checked={field.value}
//                             onCheckedChange={field.onChange}
//                             className="text-black"
//                           />
//                           <Label htmlFor="public">Public</Label>
//                         </div>
//                       </FormControl>
//                     </FormItem>
//                   )}
//                 />
//               </div>
//               <div className="flex items-end space-x-4">
//                 <FormField
//                   control={form.control}
//                   name="draftDate"
//                   render={({ field }) => (
//                     <FormItem className="flex flex-col">
//                       <FormLabel>Draft</FormLabel>
//                       <Popover>
//                         <PopoverTrigger asChild>
//                           <FormControl>
//                             <Button
//                               variant={"outline"}
//                               className={cn(
//                                 "w-[240px] pl-3 text-left font-normal text-black",
//                                 !field.value && "text-muted-foreground",
//                               )}
//                             >
//                               {field.value ? (
//                                 format(field.value, "PPP")
//                               ) : (
//                                 <span>Pick a date</span>
//                               )}
//                               <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
//                             </Button>
//                           </FormControl>
//                         </PopoverTrigger>
//                         <PopoverContent className="w-auto p-0" align="start">
//                           <Calendar
//                             mode="single"
//                             selected={field.value}
//                             onSelect={field.onChange}
//                             disabled={(date) =>
//                               date < sub(new Date(), { days: 1 })
//                             }
//                             initialFocus
//                           />
//                         </PopoverContent>
//                       </Popover>
//                     </FormItem>
//                   )}
//                 />
//                 <FormField
//                   control={form.control}
//                   name="draftHour"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormControl>
//                         <Select
//                           onValueChange={field.onChange}
//                           defaultValue={field.value}
//                         >
//                           <SelectTrigger className="w-[80px] text-black">
//                             <SelectValue />
//                           </SelectTrigger>
//                           <SelectContent>
//                             {Array.from({ length: 12 }, (_, index) =>
//                               (index + 1).toString().padStart(2, "0"),
//                             ).map((e) => {
//                               return (
//                                 <SelectItem key={e} value={e}>
//                                   {e}
//                                 </SelectItem>
//                               );
//                             })}
//                           </SelectContent>
//                         </Select>
//                       </FormControl>
//                     </FormItem>
//                   )}
//                 />
//                 <FormField
//                   control={form.control}
//                   name="draftMin"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormControl>
//                         <Select
//                           onValueChange={field.onChange}
//                           defaultValue={field.value}
//                         >
//                           <SelectTrigger className="w-[80px] text-black">
//                             <SelectValue />
//                           </SelectTrigger>
//                           <SelectContent>
//                             {Array.from({ length: 12 }, (_, index) =>
//                               (index * 5).toString().padStart(2, "0"),
//                             ).map((e) => {
//                               return (
//                                 <SelectItem key={e} value={e}>
//                                   {e}
//                                 </SelectItem>
//                               );
//                             })}
//                           </SelectContent>
//                         </Select>
//                       </FormControl>
//                     </FormItem>
//                   )}
//                 />
//                 <FormField
//                   control={form.control}
//                   name="draftAMPM"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormControl>
//                         <Select
//                           onValueChange={field.onChange}
//                           defaultValue={field.value}
//                         >
//                           <SelectTrigger className="w-[80px] text-black">
//                             <SelectValue />
//                           </SelectTrigger>
//                           <SelectContent>
//                             <SelectItem value="AM">AM</SelectItem>
//                             <SelectItem value="PM">PM</SelectItem>
//                           </SelectContent>
//                         </Select>
//                       </FormControl>
//                     </FormItem>
//                   )}
//                 />
//               </div>
//               <Accordion type="single" collapsible>
//                 <AccordionItem value="item-1" className="border-b-0">
//                   <AccordionTrigger>Settings</AccordionTrigger>
//                   <AccordionContent>
//                     <>
//                       <Label>Draft</Label>
//                       <div className="mb-4 space-y-4 px-4">
//                         <FormField
//                           control={form.control}
//                           name="settings.draft.type"
//                           render={({ field }) => (
//                             <FormItem className="space-y-1">
//                               <RadioGroup
//                                 onValueChange={field.onChange}
//                                 defaultValue={field.value}
//                                 className="grid max-w-md grid-cols-2 gap-8 pt-2"
//                               >
//                                 <FormItem>
//                                   <FormLabel className="[&:has([data-state=checked])>div]:border-lb-blue">
//                                     <FormControl>
//                                       <RadioGroupItem
//                                         value="snake"
//                                         className="sr-only"
//                                       />
//                                     </FormControl>
//                                     <div className="border-muted hover:border-accent items-center rounded-md border-2 p-1 hover:cursor-pointer">
//                                       <span className="block p-2 text-center font-normal">
//                                         Snake
//                                       </span>
//                                     </div>
//                                   </FormLabel>
//                                 </FormItem>
//                                 <FormItem>
//                                   <FormLabel className="[&:has([data-state=checked])>div]:border-lb-blue">
//                                     <FormControl>
//                                       <RadioGroupItem
//                                         value="linear"
//                                         className="sr-only"
//                                       />
//                                     </FormControl>
//                                     <div className="border-muted hover:border-accent items-center rounded-md border-2 p-1 hover:cursor-pointer">
//                                       <span className="block p-2 text-center font-normal">
//                                         Linear
//                                       </span>
//                                     </div>
//                                   </FormLabel>
//                                 </FormItem>
//                               </RadioGroup>
//                             </FormItem>
//                           )}
//                         />
//                         <FormField
//                           control={form.control}
//                           name="settings.draft.roundTime"
//                           render={({ field }) => (
//                             <FormItem className="w-1/2">
//                               <FormLabel>Time per Round (seconds)</FormLabel>
//                               <FormControl>
//                                 <Input
//                                   {...field}
//                                   className="w-[120px] text-black"
//                                   type="number"
//                                 />
//                               </FormControl>
//                             </FormItem>
//                           )}
//                         />
//                       </div>
//                       <Label className="mb-2">Studio Structure</Label>
//                       <div className="space-y-4 px-4">
//                         {fields.map((field, index) => {
//                           return (
//                             <FormField
//                               control={form.control}
//                               key={field.id}
//                               name={`settings.teamStructure.${index}.type`}
//                               render={({ field }) => (
//                                 <FormItem>
//                                   <FormControl>
//                                     <div className="mt-2 flex items-center space-x-2">
//                                       <span>{index + 1}</span>
//                                       <Select
//                                         onValueChange={field.onChange}
//                                         defaultValue={field.value}
//                                       >
//                                         <SelectTrigger className="w-[300px] text-black">
//                                           <SelectValue />
//                                         </SelectTrigger>
//                                         <SelectContent>
//                                           <SelectItem value="openingWeekendBoxOffice">
//                                             Opening Weekend Box Office
//                                           </SelectItem>
//                                           <SelectItem value="totalBoxOffice">
//                                             Total Box Office
//                                           </SelectItem>
//                                           <SelectItem value="letterboxdNumWatched">
//                                             # Letterboxd Watched
//                                           </SelectItem>
//                                           <SelectItem value="letterboxdRating">
//                                             Letterboxd Rating
//                                           </SelectItem>
//                                           <SelectItem value="reverseLetterboxdRating">
//                                             Reverse Letterboxd Rating
//                                           </SelectItem>
//                                           <SelectItem value="oscarWins">
//                                             # Oscar Wins
//                                           </SelectItem>
//                                         </SelectContent>
//                                       </Select>
//                                       <Button
//                                         type="button"
//                                         variant="outline"
//                                         size="icon"
//                                         onClick={() => remove(index)}
//                                       >
//                                         <Trash className="h-4 w-4" />
//                                       </Button>
//                                     </div>
//                                   </FormControl>
//                                 </FormItem>
//                               )}
//                             />
//                           );
//                         })}
//                         <Button
//                           type="button"
//                           variant="outline"
//                           size="sm"
//                           className="ml-4 mt-2"
//                           onClick={() =>
//                             append({
//                               type: "letterboxdRating",
//                               pos: fields.length + 1,
//                             })
//                           }
//                         >
//                           Add Movie
//                         </Button>
//                       </div>
//                     </>
//                   </AccordionContent>
//                 </AccordionItem>
//               </Accordion>
//               <Button
//                 type="submit"
//                 className="bg-lb-green"
//                 disabled={isLoading}
//               >
//                 {isLoading ? (
//                   <Loader2 size={48} className="mx-auto my-2 animate-spin" />
//                 ) : (
//                   "Create League"
//                 )}
//               </Button>
//             </form>
//           </Form>
//         </>
//       </Layout>
//     </>
//   );
// }
