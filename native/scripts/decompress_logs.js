const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const inputPath = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\8e7eb779-ac0d-4b77-a47a-5c5204d55eb1\\scratch\\build_logs.txt';
const outputPath = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain\\8e7eb779-ac0d-4b77-a47a-5c5204d55eb1\\scratch\\build_logs_decompressed.txt';

try {
  const buffer = fs.readFileSync(inputPath);
  console.log('Buffer header:', buffer.slice(0, 10));

  let decompressed = null;

  // 1. Try Gzip
  try {
    decompressed = zlib.gunzipSync(buffer);
    console.log('Successfully decompressed using Gzip!');
  } catch (e) {
    // 2. Try Brotli
    try {
      decompressed = zlib.brotliDecompressSync(buffer);
      console.log('Successfully decompressed using Brotli!');
    } catch (e2) {
      // 3. Try Inflate (zlib/deflate)
      try {
        decompressed = zlib.inflateSync(buffer);
        console.log('Successfully decompressed using Inflate!');
      } catch (e3) {
        console.log('All decompression methods failed.');
      }
    }
  }

  if (decompressed) {
    fs.writeFileSync(outputPath, decompressed);
    console.log('Successfully wrote decompressed logs to:', outputPath);
    console.log('Decompressed text size:', decompressed.length);
  } else {
    console.log('No decompression succeeded. Copying file as-is.');
    fs.writeFileSync(outputPath, buffer);
  }
} catch (err) {
  console.error('Error processing log file:', err);
}
