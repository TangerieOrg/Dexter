if (process.env.NODE_ENV === 'development') {
    // Must use require here as import statements are only allowed
    // to exist at top-level.
    require("preact/debug");
} else {
    import("./modules/PWA").then(m => m.LoadPWA());
}

import { BrowserRouter } from "react-router-dom";
import { render } from "preact";
import App from "./App";
import { BASE_URL } from "@modules/Util/Query";

render(<BrowserRouter basename={BASE_URL}>
    <App />
</BrowserRouter>
, document.getElementById("root")!);