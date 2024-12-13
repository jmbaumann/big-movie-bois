import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    redirect: {
      destination: "/pick-em/the-game-awards/2024",
      permanent: false, // Set to true if it's a permanent redirect (308)
    },
  };
};

const PickEmHomePage = () => {
  return null; // This page will never be rendered because of the redirect
};

export default PickEmHomePage;
