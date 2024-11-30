import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";

import SetUsernamePage from "~/features/user/SetUsernamePage";
import Layout from "~/layouts/main/Layout";

export default function SetUsername() {
  return (
    <Layout>
      <SetUsernamePage />
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx);

  if (!session || !!session?.user?.username) {
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
