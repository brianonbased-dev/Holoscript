console.log("Importing @holoscript/core...");
import('@holoscript/core').then(m => {
  console.log("Success! Imported keys:", Object.keys(m).length);
  process.exit(0);
}).catch(err => {
  console.error("Import failed:", err);
  process.exit(1);
});

setTimeout(() => {
  console.log("Timed out after 10s");
  process.exit(1);
}, 10000);
