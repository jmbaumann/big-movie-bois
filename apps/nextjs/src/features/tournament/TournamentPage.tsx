import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";

import { api } from "~/utils/api";
import Layout from "~/layouts/main/Layout";

export default function TouramentPage() {
  const { data: tournaments, isLoading } = api.tournament.get.useQuery();

  return (
    <Layout>
      {tournaments?.map((tournament, i) => (
        <div key={i}>
          <Link href={`/tournament/${tournament.id}`}>
            <p>{tournament.name}</p>
            <p>{tournament.description}</p>
          </Link>
        </div>
      ))}
    </Layout>
  );
}
