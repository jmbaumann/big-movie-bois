import { CheckCircle2 } from "lucide-react";

import { api } from "~/utils/api";
import { cn } from "~/utils/shadcn";
import { Card, CardContent } from "~/components/ui/card";
import { useConfirm } from "~/components/ui/hooks/use-confirm";
import { toast } from "~/components/ui/hooks/use-toast";

export default function LiveResultsAdmin() {
  const confirm = useConfirm();

  const { data, refetch } = api.awardShow.getActive.useQuery();
  const liveShow = data ? data[0] : undefined;

  const { mutate: pickWinner } = api.awardShow.updateWinner.useMutation();

  async function handlePick(nomineeId: string) {
    const ok = await confirm("Are you sure you want to select this nominee as the winner?");
    if (ok) {
      pickWinner(
        { nomineeId },
        {
          onSuccess: () => {
            toast({ title: "Winner updated" });
            refetch();
          },
        },
      );
    }
  }

  if (liveShow)
    return (
      <div className="mb-6">
        <div className="flex justify-between">
          <p className="mb-4 text-2xl">
            {liveShow.awardShow.name} {liveShow.year}
          </p>
        </div>

        <div className="flex flex-col gap-y-6">
          {liveShow.categories.map((category, i) => (
            <div key={i} className="">
              <p className="mb-1 text-lg text-white">{category.name}</p>

              <div className="flex justify-between">
                {category.nominees.map((nominee, j) => (
                  <Card
                    key={i + "-" + j}
                    className={cn(
                      "hover:border-primary mx-2 hover:cursor-pointer",
                      nominee.winner && "border-green-600 text-green-600 hover:cursor-default hover:border-green-600",
                    )}
                    onClick={() => handlePick(nominee.id)}
                  >
                    <CardContent className="flex items-center p-4 text-center">
                      {nominee.winner && <CheckCircle2 className="mr-1 text-green-600" />}
                      {nominee.name}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
}
