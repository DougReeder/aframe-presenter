// https://developer.mozilla.org/en-US/docs/Web/API/Prioritized_Task_Scheduling_API
const YIELD_DEADLINE = 50;   // ms

function schedulerYield() {
  // Uses scheduler.yield if it exists:
  if ("scheduler" in window && "yield" in scheduler) {
    return scheduler.yield();
  }

  // Falls back to setTimeout:
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
