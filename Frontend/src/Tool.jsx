import { useState } from "react";
import "./Tool.css";
import { Arrow } from "react-konva";

const Tool = ({ setActiveTool, ActiveTool }) => {
  // const [isclicked, setIsclicked] = useState('')
  return (
    <>
      <div className="tool-wrapper">
        <button
          id="selection-btn"
          className={ActiveTool === "selection" ? "active-selection" : ""}
          onMouseDown={() => {
            setActiveTool("selection");
          }}
        >
          <svg viewBox="-80 -60 160 120" aria-hidden="true">
            <rect
              x="-40"
              y="-25"
              width="80"
              height="50"
              fill="none"
              stroke="black"
              strokeWidth="7"
            />
            <line
              x1="-40"
              y1="-25"
              x2="-70"
              y2="-25"
              stroke="black"
              strokeWidth="7"
            />
            <line
              x1="-40"
              y1="-25"
              x2="-40"
              y2="-55"
              stroke="black"
              strokeWidth="7"
            />
            <line
              x1="40"
              y1="25"
              x2="70"
              y2="25"
              stroke="black"
              strokeWidth="7"
            />
            <line
              x1="40"
              y1="25"
              x2="40"
              y2="55"
              stroke="black"
              strokeWidth="7"
            />
          </svg>
        </button>
        <button
          id="rect-btn"
          className={ActiveTool === "rect" ? "active-rect" : ""}
          onMouseDown={() => {
            setActiveTool("rect");
          }}
        >
          {" "}
          <svg viewBox="-80 -60 160 120" aria-hidden="true">
            <rect
              x="-50"
              y="-30"
              width="100"
              height="60"
              fill="none"
              stroke="black"
              strokeWidth="7"
            />
          </svg>
        </button>
        <button
          id="circ-btn"
          className={ActiveTool === "elipse" ? "active-circ" : ""}
          onMouseDown={() => {
            setActiveTool("elipse");
          }}
        >
          {" "}
          <svg viewBox="-80 -60 160 120" aria-hidden="true">
            <circle
              cx="0"
              cy="0"
              r="50"
              fill="none"
              stroke="black"
              strokeWidth="7"
            />
          </svg>
        </button>
        <button
          id="arrow-btn"
          className={ActiveTool === "arrow" ? "active-arrow" : ""}
          onMouseDown={() => {
            setActiveTool("arrow");
          }}
        > <svg viewBox="-80 -60 160 120" aria-hidden="true">
            <line
              x1="-40"
              y1="-30"
              y2='40'
              x2='30'
              fill="none"
              stroke="black"
              strokeWidth="7"
            />
            <line
              x1="30"
              y1="40"
              y2='38'
              x2='0'
              fill="none"
              stroke="black"
              strokeWidth="7"
            />
            <line
              x1="30"
              y1="40"
              y2='10'
              x2='32'
              fill="none"
              stroke="black"
              strokeWidth="7"
            />
            
          </svg></button>
      </div>
    </>
  );
};
export default Tool;
