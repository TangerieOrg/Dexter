import { useURLStoreUpdater } from "@modules/URL";
import Router from "./routes";

function App() {
    useURLStoreUpdater();

    return (
        <div class="min-h-screen w-screen dark:text-gray-100">
            <Router/>
        </div>
    )
}

export default App;