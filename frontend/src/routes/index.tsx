import {
    Route,
    Routes,
} from "react-router-dom";
import FourOhFour from "./FourOhFour";
import MainRoute from "./Main";


export default function Router() {
    return <Routes>
        <Route path="*" element={<FourOhFour/>}/>
        <Route path="/" element={<MainRoute/>}/>
    </Routes>
}