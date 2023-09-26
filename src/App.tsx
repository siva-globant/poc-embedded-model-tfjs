import { useEffect, useState } from "react";
import "./App.css";
import VisionTransformer from "./vision-transformer";
import MobileNet from "./mobile-net-model";
import CocoSSD from "./coco-ssd-model";
type ModelKeys =
  | "CLASSIER VIT"
  | "MOBILE NET"
  | "COCO SSD"
  | "MASK RCNN"
  | "DEEP LAP";
function App() {
  const [currentTab, setCurrentTab] = useState<ModelKeys | null>(null);
  useEffect(() => {
    setCurrentTab("COCO SSD");
    // return () => {
    //   setCurrentTab(null);
    // };
  }, []);
  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          padding: "12px 0px",
          gap: "12px",
          justifyContent: "center",
        }}
      >
        {Array<ModelKeys>(
          "CLASSIER VIT",
          "MOBILE NET",
          "COCO SSD",
          "MASK RCNN",
          "DEEP LAP"
        ).map((tab) => (
          <button
            key={tab}
            onClick={currentTab !== tab ? () => setCurrentTab(tab) : undefined}
            className={currentTab === tab ? "active" : ""}
            disabled={["MASK RCNN", "DEEP LAP", "CLASSIER VIT"].includes(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      {currentTab === "CLASSIER VIT" ? (
        <VisionTransformer />
      ) : currentTab === "COCO SSD" ? (
        <CocoSSD />
      ) : currentTab === "MOBILE NET" ? (
        <MobileNet />
      ) : currentTab === "MASK RCNN" ? null : currentTab ===
        "DEEP LAP" ? null : null}
    </div>
  );
}

export default App;
