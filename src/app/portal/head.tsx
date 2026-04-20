export default function Head() {
  const title = "Client Portal Login | PGC Visayas";
  const description =
    "Secure client portal login for approved PGC Visayas inquiries and project updates.";

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index,follow" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://pgc-genomebase.vercel.app/portal" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <link rel="canonical" href="https://pgc-genomebase.vercel.app/portal" />
    </>
  );
}
