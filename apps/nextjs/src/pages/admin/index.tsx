import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";

import AdminDashboard from "~/features/admin/Dashboard";
import Layout from "~/layouts/admin/Layout";

export default function AdminIndex() {
  return (
    <Layout>
      <AdminDashboard />
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx);

  if (!session?.user?.isAdmin) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
