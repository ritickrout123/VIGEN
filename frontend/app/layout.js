import "./globals.css";

import { h } from "../lib/h.js";
import { Topbar } from "../components/ui.js";

export const metadata = {
  title: "VIGEN",
  description: "Music-driven AI video generation platform"
};

export default function RootLayout({ children }) {
  return h(
    "html",
    { lang: "en" },
    h("body", null, h(Topbar), children)
  );
}

