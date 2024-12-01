import { useEffect, useState } from "react";
import { Save } from "lucide-react";

import { api, RouterOutputs } from "~/utils/api";
import { useArray } from "~/utils/hooks/use-array";
import { Button } from "~/components/ui/button";
import { useConfirm } from "~/components/ui/hooks/use-confirm";
import { toast } from "~/components/ui/hooks/use-toast";
import { Input } from "~/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { formatDate } from "~/utils";

type Film = RouterOutputs["tmdb"]["getOpeningWeekend"][number];

export default function OpeningWeekendAdmin() {
  const confirm = useConfirm();

  const { data: owFilms } = api.tmdb.getOpeningWeekend.useQuery();
  const { mutate: updateFilm, isLoading: updating } = api.tmdb.update.useMutation();

  const films = useArray<Film>(owFilms || []);

  useEffect(() => {
    if (owFilms) films.set(owFilms);
  }, [owFilms]);

  const handleChange = (index: number, value: number) => {
    films.updateAt(index, { ...films.array[index], openingWeekend: value } as Film);
  };

  async function handleUpdateFilms(id: number, openingWeekend: number) {
    updateFilm(
      { id, openingWeekend },
      {
        onSuccess: () => {
          toast({ title: "Updated" });
        },
        onError: (e) => {
          toast({ title: e.message });
        },
      },
    );
  }

  return (
    <div className="flex flex-col">
      <Table className="mb-2">
        <TableHeader>
          <TableRow>
            <TableHead>TMDB ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Release Date</TableHead>
            <TableHead>Opening Weekend</TableHead>
            <TableHead className="w-[40px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {films?.array.map((film, i) => (
            <TableRow key={i}>
              <TableCell>{film.id}</TableCell>
              <TableCell>{film.title}</TableCell>
              <TableCell>{formatDate(film.releaseDate, "LLL dd, yyyy")}</TableCell>
              <TableCell>
                <Input
                  className="text-black"
                  type="number"
                  value={film.openingWeekend}
                  onChange={(e) => handleChange(i, Number(e.target.value))}
                ></Input>
              </TableCell>
              <TableCell>
                <Button
                  size="icon"
                  onClick={() => handleUpdateFilms(film.id, film.openingWeekend)}
                  isLoading={updating}
                >
                  <Save />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
