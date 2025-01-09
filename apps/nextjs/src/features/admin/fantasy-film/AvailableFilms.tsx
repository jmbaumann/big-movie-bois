import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, CircleDollarSign, MoreVertical, Pencil, RefreshCcw, Trash } from "lucide-react";

import { api } from "~/utils/api";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useConfirm } from "~/components/ui/hooks/use-confirm";
import { toast } from "~/components/ui/hooks/use-toast";
import { Pagination, PaginationContent, PaginationItem } from "~/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { formatDate } from "~/utils";

export default function AvailableFilmsAdmin() {
  const confirm = useConfirm();

  const [page, setPage] = useState(1);

  const { data: films } = api.tmdb.getAvailable.useQuery({ page });
  const { mutate: updateFilmList, isLoading: updating } = api.tmdb.updateFantasyFilms.useMutation();
  const { mutate: processAllBids, isLoading: processing } = api.ffAdmin.processAllBids.useMutation();

  const maxPages = films ? Math.ceil(films.total / 20) : 1;

  async function handleUpdateFilms() {
    const ok = await confirm("Are you sure you want to update the Fantasy Film list?");
    if (ok) {
      toast({ title: "Update initiated" });
      updateFilmList(undefined, {
        onSuccess: () => toast({ title: "Films Updated" }),
        onError: (e) => {
          toast({ title: e.message, variant: "destructive" });
        },
      });
    }
  }

  async function handleProcessBids() {
    const ok = await confirm("Are you sure you want to process all active bids?");
    if (ok) {
      toast({ title: "Processing..." });
      processAllBids(undefined, {
        onSuccess: () => toast({ title: "Bids processed" }),
        onError: (e) => {
          toast({ title: e.message, variant: "destructive" });
        },
      });
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex gap-x-2">
        <Button className="mb-2 ml-auto w-fit" onClick={() => handleProcessBids()} isLoading={processing}>
          <CircleDollarSign className="mr-2" size={20} /> Process Bids
        </Button>
        <Button className="mb-2 w-fit" onClick={() => handleUpdateFilms()} isLoading={updating}>
          <RefreshCcw className="mr-2" size={20} /> Update Fantasy Film List
        </Button>
      </div>

      <Table className="mb-2">
        <TableHeader>
          <TableRow>
            <TableHead>TMDB ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Release Date</TableHead>
            <TableHead>Popularity</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-[40px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {films?.data.map((film, i) => (
            <TableRow key={i}>
              <TableCell>{film.id}</TableCell>
              <TableCell>{film.title}</TableCell>
              <TableCell>{formatDate(film.releaseDate, "LLL dd, yyyy")}</TableCell>
              <TableCell>{film.popularity}</TableCell>
              <TableCell>{film.updatedAt ? formatDate(film.updatedAt, "LLL dd, yyyy") : ""}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <MoreVertical />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <Pencil size={20} className="mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <RefreshCcw size={20} className="mr-2" /> Refresh
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Trash size={20} className="mr-2 text-red-600" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {films && (
        <div className="mb-4 flex justify-end">
          <Pagination className="ml-auto mr-0">
            <PaginationContent>
              <PaginationItem>
                <Button variant="link" disabled={page === 1} onClick={() => setPage((s) => s - 1)}>
                  <ChevronLeft className="mr-1" size={18} />
                  Prev
                </Button>
              </PaginationItem>

              {Array.from({ length: maxPages }).map((_, index) => (
                <PaginationItem key={index}>
                  <Button
                    className={page === index + 1 ? "text-primary" : ""}
                    variant="link"
                    onClick={() => setPage((s) => index + 1)}
                  >
                    {index + 1}
                  </Button>
                </PaginationItem>
              ))}
              <PaginationItem>
                <Button variant="link" disabled={page === maxPages} onClick={() => setPage((s) => s + 1)}>
                  Next <ChevronRight className="ml-1" size={18} />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
