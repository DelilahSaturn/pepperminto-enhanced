import dynamic from "next/dynamic";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

const Editor = dynamic<{ kbBaseUrl?: string }>(
  () => import("../../components/KnowledgeBaseEditor"),
  {
    ssr: false,
  }
);

export async function getServerSideProps() {
  return {
    props: {
      kbBaseUrl: process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_URL || process.env.KNOWLEDGE_BASE_URL || "",
    },
  };
}

export default function KnowledgeBaseArticle({ kbBaseUrl }: { kbBaseUrl?: string }) {
  return <Editor kbBaseUrl={kbBaseUrl} />;
}
