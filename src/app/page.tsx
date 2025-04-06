"use client"
import { useLabelGenerator } from "@/component/LabelGenerator";

export default function Home() {
  const { LabelCanvas, testPrint } = useLabelGenerator();
  return (
    <div>
      <button
        className={
          "text-gray-500 p-2 border border-solid border-gray-400  disabled:text-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed"
        }
        onClick={() => {
          testPrint();
        }}
      >
        <span>labelReprinting</span>
      </button>
      {LabelCanvas}
    </div>
  );
}
