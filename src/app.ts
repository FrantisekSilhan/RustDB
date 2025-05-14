import "./setup";
import { start as startMarket } from "./utils/market";
import { start as startHistogram } from "./utils/histogram";

const runWithRestart = async (fn: () => Promise<void>, name: string) => {
  while (true) {
    try {
      await fn();
    } catch (error) {
      console.error(`Error in ${name}; ${new Date().toISOString()}:`, error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

runWithRestart(() => startMarket({delay:30000}), "market");
runWithRestart(() => startHistogram({delay:5000}), "histogram");