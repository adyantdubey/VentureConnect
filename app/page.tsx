import type { Metadata } from "next";
import FayvarApp from "./innovestart-app";

export const metadata: Metadata = {
  title: "Fayvar — Meet the people building what’s next",
  description: "Watch startup stories, follow real progress, and meet founders and investors who share your ambition.",
};

export default function Home() {
  return <FayvarApp />;
}
