import { api } from "~/utils/api";
import Poll from "~/features/polls/Poll";

export default function HomePage() {
  const { data: polls, refetch: refreshPolls } = api.poll.get.useQuery({ active: true });

  return (
    <div className="flex">
      <div className="flex w-2/3 flex-col"></div>

      <div className="flex w-1/3 flex-col">
        {polls?.map((poll, i) => <Poll key={i} poll={poll} refresh={refreshPolls} />)}
      </div>
    </div>
  );
}
