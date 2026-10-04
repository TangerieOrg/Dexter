import { render } from "preact";
import App from "./App";
import "./index.css";

if(import.meta.env.DEV) await import("preact/debug");

render(<App/>, document.getElementById("root")!);
