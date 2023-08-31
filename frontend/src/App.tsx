import { useURLStoreUpdater } from "@modules/URL";
import Router from "./routes";

function App() {
    useURLStoreUpdater();

    return (
        <div class="min-h-screen w-screen">
            <Router/>
        </div>
    )
}

export default App;