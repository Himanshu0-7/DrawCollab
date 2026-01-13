import { useEffect, useRef, useState } from "react";
import Navbar from "./Navbar";
import Session from "./Session";
import Canvas from "./Canvas";
import Cursor from "./Cursor";

const Home = () => {
  const [isshare, setIshare] = useState(0);
  const [ActiveTool, setActiveTool] = useState("selection");
  const [isEraserEnable, setIsEraserEnable] = useState(false)
  const [pointerEvent, setPointerEvent] = useState("");
  const shareBtn = () => {
    setIshare((prev) => (prev === 0 ? 1 : 0));
  };
  // console.log(isEraserEnable)
  return (
    <>
      <Navbar
        shareBtn={shareBtn}
        setActiveTool={setActiveTool}
        ActiveTool={ActiveTool}
        pointerEvent={pointerEvent}
      ></Navbar>
      <Cursor  isEraserEnable={isEraserEnable}/>
      <Canvas
        ActiveTool={ActiveTool}
        setActiveTool={setActiveTool}
        setPointerEvent={setPointerEvent}
        setIsEraserEnable={setIsEraserEnable}
      ></Canvas>
      <Session isloading={isshare}></Session>
    </>
  );
};
export default Home;
