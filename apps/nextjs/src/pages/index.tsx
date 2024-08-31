import { api } from "~/utils/api";

export default function Home() {
  const { data } = api.example.hello.useQuery();

  return (
    <div className="flex h-screen w-screen items-center justify-center ">
      {data}
    </div>
  );
}
