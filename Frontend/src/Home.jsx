import { useEffect, useRef, useState } from "react";
import Navbar from "./Navbar";
import Session from "./Session";


const Home = () => {
  const [isshare, setIshare] = useState(0);
  

  const shareBtn = () => {
    setIshare((prev) => (prev === 0 ? 1 : 0));
  };



  return (
    <>
      <Navbar shareBtn={shareBtn}></Navbar>
      <Session
        isloading={isshare}
      ></Session>
    </>
  );
};
export default Home;
