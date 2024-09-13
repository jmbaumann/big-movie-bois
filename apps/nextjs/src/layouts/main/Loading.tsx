import { Loader2 } from "lucide-react";

import Layout from "./Layout";

export default function Loading() {
  return (
    <>
      <Layout>
        <Loader2 size={48} className="mx-auto my-2 animate-spin" />
      </Layout>
    </>
  );
}
