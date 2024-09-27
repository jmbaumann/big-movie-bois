import Head from "next/head";

function SEO({ title }: { title?: string }) {
  return (
    <Head>
      <title>{title ?? "Big Movie Bois"}</title>
      <meta name="description" content="Big Movie Bois" />
      <link rel="icon" href="/favicon.ico" />
    </Head>
  );
}

export default SEO;
