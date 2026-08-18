import type { Metadata } from "next";
import InnovestartApp from "./innovestart-app";

export const metadata: Metadata = {
  title: "Innovestart — Where startups meet conviction",
  description: "Discover ambitious startups, meet aligned investors, and build what’s next on Innovestart.",
};

export default function Home() {
  return <InnovestartApp />;
}
