import Head from "next/head";

function SEO({ title }: { title?: string }) {
  return (
    <Head>
      <title>{title ?? "Big Movie Bois"}</title>
      <meta name="description" content="Big Movie Bois" />
      <link rel="icon" href="/favicon.ico" />

      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    </Head>
  );
}

export default SEO;
