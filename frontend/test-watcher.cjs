const fs = require('fs');
const path = require('path');

let watchCount = 0;
const filesToWatch = [];
const maxWatches = 60000; // Try a number close to your ulimit

// Create dummy files to watch (or point to existing ones if you have many)
const watchDir = path.join(__dirname, 'watch_test_dir');
if (!fs.existsSync(watchDir)) {
  fs.mkdirSync(watchDir);
}

console.log(`Attempting to watch up to ${maxWatches} files...`);
console.log(`Current ulimit -n for this Node.js process (soft): ${process.getuid && process.getuid() === 0 ? 'N/A for root, effective is hard' : require('child_process').execSync('ulimit -Sn').toString().trim()}`);
console.log(`Current ulimit -n for this Node.js process (hard): ${process.getuid && process.getuid() === 0 ? 'N/A for root, effective is hard' : require('child_process').execSync('ulimit -Hn').toString().trim()}`);


try {
  for (let i = 0; i < maxWatches; i++) {
    const filePath = path.join(watchDir, `file${i}.txt`);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, `content ${i}`);
    }
    fs.watch(filePath, (eventType, filename) => {
      // console.log(`Event type is: ${eventType}. On filename: ${filename}`);
    });
    watchCount++;
    if (i % 1000 === 0) console.log(`Watching ${watchCount} files...`);
  }
  console.log(`Successfully watching ${watchCount} files.`);
} catch (error) {
  console.error(`Failed after watching ${watchCount} files.`);
  console.error(error);
}
// Keep process alive to maintain watches
setInterval(() => {}, 100000);
