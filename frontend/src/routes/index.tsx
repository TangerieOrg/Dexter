import {
    Route,
    Routes,
} from "react-router-dom";
import FourOhFour from "./FourOhFour";


export default function Router() {
    return <Routes>
        <Route path="*" element={<FourOhFour/>}/>
        {/* <Route path="/" element={<SearchRoute/>}/>
        <Route path="/search" element={<SearchRoute/>}/> */}
    </Routes>
}