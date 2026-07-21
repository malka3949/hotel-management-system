'use strict';
/**
 * Run once from local environment to upload seed images to Cloudinary
 * and patch seed-prod.js with the returned URLs.
 *
 * Usage:
 *   node prisma/upload-seed-images.js
 *
 * Requires in backend/.env:
 *   CLOUDINARY_CLOUD_NAME=...
 *   CLOUDINARY_API_KEY=...
 *   CLOUDINARY_API_SECRET=...
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'YOUR_CLOUD_NAME') {
  console.error('ERROR: Fill in CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET in backend/.env first');
  process.exit(1);
}

const UPLOADS_DIR = path.join(__dirname, '../public/uploads');

const SEED_IMAGES = [
  'branch-tlv-center',
  'branch-tlv',
  'branch-jerusalem',
  'room-standard-1',
  'room-standard-2',
  'room-business-1',
  'room-deluxe-1',
  'room-deluxe-2',
  'room-junior-suite-1',
  'room-junior-suite-2',
  'room-suite-1',
  'room-suite-2',
  'room-suite-3',
  'room-family-1',
];

function findFile(name) {
  const exts = ['.jpg', '.jpeg', '.png', '.webp'];
  for (const ext of exts) {
    const p = path.join(UPLOADS_DIR, name + ext);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function uploadOne(localPath, publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      localPath,
      { public_id: `hotel-management/seed/${publicId}`, overwrite: true },
      (err, res) => {
        if (err) return reject(err);
        resolve(res.secure_url);
      },
    );
  });
}

async function main() {
  const urlMap = {};

  for (const name of SEED_IMAGES) {
    const localPath = findFile(name);
    if (!localPath) {
      console.warn(`SKIP (not found): ${name}`);
      continue;
    }
    process.stdout.write(`Uploading ${name}... `);
    const url = await uploadOne(localPath, name);
    urlMap[`/uploads/${name}`] = url;
    console.log('OK');
  }

  console.log('\n=== URL MAP ===');
  console.log(JSON.stringify(urlMap, null, 2));

  const seedPath = path.join(__dirname, 'seed-prod.js');
  let seedContent = fs.readFileSync(seedPath, 'utf8');

  for (const [localUrl, cloudUrl] of Object.entries(urlMap)) {
    const base = localUrl.replace('/uploads/', '');
    const regex = new RegExp(`/uploads/${base}\\.[a-z]+`, 'g');
    seedContent = seedContent.replace(regex, cloudUrl);
    seedContent = seedContent.replace(new RegExp(localUrl.replace(/\//g, '\\/'), 'g'), cloudUrl);
  }

  fs.writeFileSync(seedPath, seedContent);
  console.log('\nseed-prod.js patched with Cloudinary URLs.');
}

main().catch((e) => { console.error(e); process.exit(1); });
