import { use, useState } from 'react';
import './Navbar.css'

const Navbar=({shareBtn})=>{

    return(
        <>
            <nav className="Navbar">
        {/* <div> */}
        <h1>Websocket Test</h1>
        <div>

        <button id='share-button' onClick={shareBtn}>Share</button>
        </div>
        </nav>
        {/* </div> */}
        </>
    )

}

export default Navbar