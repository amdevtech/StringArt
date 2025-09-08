// sketch.js
let img;
let canvasSize = 360;
let margin = 12;
let imgPixels = [];

let nails = [];
let nailCount = 200;
let nailSize = 2;

let lineIndex = [];
let maxLines = 5000;

let isRunning = false;
let paused = false;
let firstNail = null;

function preload() {
  img = loadImage("04.jpg");
}

function setup() {
  // attach canvas into container from HTML
  const cnv = createCanvas(canvasSize * 2, canvasSize);
  cnv.parent('canvasContainer');

  // prevent auto looping until user presses Start
  noLoop();

  // wire up controls (they exist in DOM because scripts loaded at end)
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resumeBtn = document.getElementById("resumeBtn");
  const mapBtn = document.getElementById("mapBtn");
  const copyMapBtn = document.getElementById("copyMapBtn");

  startBtn.addEventListener("click", () => {
    // read inputs
    const nailInput = parseInt(document.getElementById("nailCountInput").value) || 200;
    const maxLinesInput = parseInt(document.getElementById("maxLinesInput").value) || 5000;
    nailCount = Math.max(10, nailInput);
    maxLines = Math.max(10, maxLinesInput);

    resetSketch();
    isRunning = true;
    paused = false;
    loop();
  });

  pauseBtn.addEventListener("click", () => {
    if (isRunning) {
      paused = true;
      noLoop();
    }
  });

  resumeBtn.addEventListener("click", () => {
    if (isRunning && paused) {
      paused = false;
      loop();
    }
  });

  mapBtn.addEventListener("click", () => {
    showMap();
  });

  copyMapBtn.addEventListener("click", () => {
    copyMapText();
  });
}

function resetSketch() {
  nails = [];
  lineIndex = [];
  img.resize(canvasSize, canvasSize);
  img.filter(GRAY);
  img.loadPixels();
  imgPixels = img.pixels.slice();

  // build nails around left canvas area (centered at canvasSize/2, canvasSize/2)
  for (let i = 0; i < nailCount; i++) {
    let angle = TWO_PI / nailCount * i;
    let r = canvasSize / 2 - margin;
    let x = canvasSize / 2 + r * cos(angle);
    let y = canvasSize / 2 + r * sin(angle);
    nails.push(createVector(x, y));
  }

  let startingIndex = floor(random(nailCount));
  lineIndex.push(startingIndex);
  firstNail = startingIndex;

  // clear right image area to original loaded image pixels
  img.loadPixels();
  img.pixels.set(imgPixels);
  img.updatePixels();

  // update UI
  updateLineCount();
}

function draw() {
  // only draw if running
  if (!isRunning || paused) return;

  background(255);

  // left: string art (circle area), right: original image
  // draw original image on right half
  image(img, canvasSize, 0);

  // draw existing lines
  stroke(0, 50);
  strokeWeight(0.8);
  noFill();
  for (let i = 1; i < lineIndex.length; i++) {
    const a = nails[lineIndex[i - 1]];
    const b = nails[lineIndex[i]];
    line(a.x, a.y, b.x, b.y);
  }

  // draw first point only (red dot)
  if (firstNail !== null && nails[firstNail]) {
    fill("#e63946");
    noStroke();
    const n = nails[firstNail];
    ellipse(n.x, n.y, 8, 8);

    // draw small arrow indicating clockwise rotation direction
    // arrow location: slightly outward from first nail toward tangent direction
    push();
    stroke("#457b9d");
    strokeWeight(2);
    translate(canvasSize / 2, canvasSize / 2); // center
    const angle = TWO_PI / nailCount * firstNail;
    // arrow at angle + 0.25 radians offset
    const arrowRadius = (canvasSize / 2 - margin) * 0.9;
    const ax = arrowRadius * cos(angle + 0.25);
    const ay = arrowRadius * sin(angle + 0.25);
    // draw arrow line and head
    line(ax, ay, ax + 18 * cos(angle + 0.25), ay + 18 * sin(angle + 0.25));
    // arrow head
    const hx = ax + 18 * cos(angle + 0.25);
    const hy = ay + 18 * sin(angle + 0.25);
    // two small lines for head
    line(hx, hy, hx - 6 * cos(angle + 0.25 - 0.5), hy - 6 * sin(angle + 0.25 - 0.5));
    line(hx, hy, hx - 6 * cos(angle + 0.25 + 0.5), hy - 6 * sin(angle + 0.25 + 0.5));
    pop();
  }

  // update lines: add one new line per frame (or more if you want)
  if (lineIndex.length < maxLines) {
    let current = lineIndex[lineIndex.length - 1];
    let next = findNextNailIndex(current);
    if (next !== null) {
      lineIndex.push(next);
      updateImage(current, next);
      updateLineCount();
    } else {
      console.log("No valid nail found, stopping.");
      isRunning = false;
      noLoop();
    }
  } else {
    console.log("Reached max lines.");
    isRunning = false;
    noLoop();
  }
}

// compute next nail by looking for highest contrast along line
function findNextNailIndex(currentIndex) {
  let nextIndex = null;
  let highestContrast = -1;
  for (let i = 0; i < nails.length; i++) {
    if (i === currentIndex) continue;
    const contrast = evaluateContrast(currentIndex, i);
    if (contrast > highestContrast) {
      highestContrast = contrast;
      nextIndex = i;
    }
  }
  return nextIndex;
}

function evaluateContrast(i1, i2) {
  let total = 0;
  const a = nails[i1];
  const b = nails[i2];
  const steps = 80;
  for (let s = 0; s < steps; s++) {
    const x = floor(lerp(a.x, b.x, s / steps));
    const y = floor(lerp(a.y, b.y, s / steps));
    if (x >= 0 && x < canvasSize && y >= 0 && y < canvasSize) {
      let pi = 4 * (y * canvasSize + x);
      const brightness = imgPixels[pi];
      total += (255 - brightness);
    }
  }
  return total / steps;
}

function updateImage(i1, i2) {
  const a = nails[i1];
  const b = nails[i2];
  const steps = 80;
  const bright = 10;
  for (let s = 0; s < steps; s++) {
    const x = floor(lerp(a.x, b.x, s / steps));
    const y = floor(lerp(a.y, b.y, s / steps));
    const pi = 4 * (y * canvasSize + x);
    if (pi >= 0 && pi + 2 < imgPixels.length) {
      // increase brightness slightly to simulate thread covering dark area
      const cur = imgPixels[pi];
      if (cur < 255 - bright) {
        imgPixels[pi + 0] = cur + bright;
        imgPixels[pi + 1] = cur + bright;
        imgPixels[pi + 2] = cur + bright;
      }
    }
  }
  img.pixels.set(imgPixels);
  img.updatePixels();
}

// update UI counter
function updateLineCount() {
  const el = document.getElementById("lineCount");
  if (el) el.textContent = lineIndex.length;
}

// show map (fills modal table and opens it)
function showMap() {
  const tbody = document.getElementById("mapTableBody");
  tbody.innerHTML = "";
  for (let i = 1; i < lineIndex.length; i++) {
    const tr = document.createElement("tr");
    const td1 = document.createElement("td"); td1.textContent = i;
    const td2 = document.createElement("td"); td2.textContent = lineIndex[i - 1];
    const td3 = document.createElement("td"); td3.textContent = lineIndex[i];
    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
    tbody.appendChild(tr);
  }
  // show bootstrap modal
  const modalEl = document.getElementById("mapModal");
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// copy map to clipboard as text
function copyMapText() {
  let txt = "";
  for (let i = 1; i < lineIndex.length; i++) {
    txt += `Line ${i}: ${lineIndex[i - 1]} -> ${lineIndex[i]}\n`;
  }
  navigator.clipboard.writeText(txt).then(() => {
    alert("Map copied to clipboard");
  }).catch(err => {
    console.warn("Copy failed", err);
    alert("Unable to copy map");
  });
}
