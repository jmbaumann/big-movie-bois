import * as React from "react";
import { ChangeEvent, useState } from "react";
import { ImagePlus } from "lucide-react";

import { api } from "~/utils/api";
import { cn } from "~/utils/shadcn";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { FormControl, FormItem, FormLabel } from "./ui/form";
import { useToast } from "./ui/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

export interface TMDBImageInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const TMDBImageInput = React.forwardRef<HTMLInputElement, TMDBImageInputProps>(
  ({ className, type, onChange, ...props }, ref) => {
    const [value, setValue] = useState(props.value || "");

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      onChange?.(e);
    };

    const handleImageChange = (newImageURL: string) => {
      setValue(newImageURL);

      if (onChange) {
        onChange({ target: { value: newImageURL } } as React.ChangeEvent<HTMLInputElement>);
      }
    };

    return (
      <div className="relative w-full">
        <input
          className={cn(
            "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-4 py-2 pr-8 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          type={type}
          value={value}
          onChange={handleInputChange}
          ref={ref}
          {...props}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 transform hover:cursor-pointer">
          <TMDBImageDialog setImageURL={handleImageChange}>
            <ImagePlus className="text-black" size={18} />
          </TMDBImageDialog>
        </div>
      </div>
    );
  },
);
TMDBImageInput.displayName = "TMDBImageInput";

export { TMDBImageInput };

function TMDBImageDialog({ children, setImageURL }: { children: React.ReactNode; setImageURL: (url: string) => void }) {
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState("movie");
  const [searchKeyword, setSearchKeyword] = useState<string>();

  const { data: searchResult } = api.tmdb.search.useQuery(
    { keyword: searchKeyword ?? "", type },
    { enabled: !!searchKeyword },
  );

  const handleResultSelect = (image?: string) => {
    const path = type === "movie" ? "w1280" : "w600_and_h900_bestv2";
    if (image) {
      setImageURL(`https://image.tmdb.org/t/p/${path}${image}`);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="ml-2 hover:cursor-pointer">{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>TMDB Image</DialogTitle>
        </DialogHeader>

        <RadioGroup onValueChange={setType} defaultValue={type} className="flex flex-col space-y-1">
          <FormItem className="flex items-center space-x-3 space-y-0">
            <FormControl>
              <RadioGroupItem value="movie" />
            </FormControl>
            <FormLabel className="font-normal">Movie</FormLabel>
          </FormItem>
          <FormItem className="flex items-center space-x-3 space-y-0">
            <FormControl>
              <RadioGroupItem value="person" />
            </FormControl>
            <FormLabel className="font-normal">Person</FormLabel>
          </FormItem>
        </RadioGroup>

        <Command className="">
          <CommandInput
            className="appearance-none px-4 py-2 text-base"
            placeholder={`Search for a ${type}`}
            value={searchKeyword}
            onChangeCapture={(e: ChangeEvent<HTMLInputElement>) => setSearchKeyword(e.target.value)}
          />
          <CommandList>
            {!!searchKeyword && <CommandEmpty>No results found.</CommandEmpty>}
            {searchResult?.map((result, i) => (
              <CommandItem
                key={i}
                onSelect={() => handleResultSelect("poster" in result ? result.poster : result.profile_path)}
              >
                {"title" in result ? result.title : result.name}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
