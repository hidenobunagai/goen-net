// Cleanup script to remove problematic service workers
// Run this in browser console if you experience reload loops:
// navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(reg => reg.unregister()))

console.log("Service Worker cleanup script loaded");
console.log("To manually cleanup, run in console:");
console.log("navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(reg => reg.unregister()))");
