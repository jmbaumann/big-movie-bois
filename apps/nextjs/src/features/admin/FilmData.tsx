import { format } from "date-fns";
import { Pencil, Trash } from "lucide-react";

import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";

export default function FilmDataAdmin() {
  const { data: films } = api.tmdb.get.useQuery({});

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]"></TableHead>
          <TableHead>TMDB ID</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Release Date</TableHead>
          <TableHead>Popularity</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {films?.map((film, i) => (
          <TableRow key={i}>
            <TableCell>
              <Button className="hover:text-primary" size="icon" variant="ghost">
                <Pencil size={20} />
              </Button>
            </TableCell>
            <TableCell>{film.id}</TableCell>
            <TableCell>{film.title}</TableCell>
            <TableCell>{format(film.releaseDate, "LLL dd, yyyy")}</TableCell>
            <TableCell>{film.popularity}</TableCell>
            <TableCell>
              <Button size="icon" variant="destructive">
                <Trash size={20} />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
