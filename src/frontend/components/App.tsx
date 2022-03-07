import { h } from "preact";
import { Breakpoints } from "./breakpoints";
import { Export } from "./Export";
import { NotificationBar } from "./NotificationBar";
import { Preview } from "./Preview";
import { Resizer } from "./resizer/resizer";
import { Sidebar } from "./Sidebar";
import { Zoom } from "./Zoom";

import "../static/css/main.css";

export function App() {
  return (
    <div class="app">
      <header class="action_bar">
        <Zoom />
        <Breakpoints />
        <Export />
      </header>

      <NotificationBar />

      <Sidebar />

      <Preview />

      <Resizer />
    </div>
  );
}
