import { api } from "~/utils/api";
import Layout from "~/layouts/main/Layout";

export default function Home() {
  const { data } = api.example.hello.useQuery();

  return (
    <Layout showFooter>
      <div>{data}</div>
    </Layout>
  );
}
