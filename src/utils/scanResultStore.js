let currentScan = null;

export function setCurrentScan(scan) {
  currentScan = scan || null;
}

export function getCurrentScan() {
  return currentScan;
}
