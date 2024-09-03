// import Layout from "~/layouts/main/Layout";

// export default function DailyGamesHomePage() {
//   return (
//     <Layout showFooter>
//       <div>DAILY GAMES HOME PAGE</div>
//     </Layout>
//   );
// }

import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    redirect: {
      destination: "/daily-games/overlap",
      permanent: false, // Set to true if it's a permanent redirect (308)
    },
  };
};

const DailyGamesHomePage = () => {
  return null; // This page will never be rendered because of the redirect
};

export default DailyGamesHomePage;
