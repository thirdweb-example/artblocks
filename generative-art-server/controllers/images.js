import p5 from "node-p5";

const tokenData = {
  hash: "",
  tokenId: 0,
};

let buf2;

function sketch(p) {
  const hashPairs = [];
  for (let j = 0; j < 32; j++) {
    hashPairs.push(tokenData.hash.slice(2 + j * 2, 4 + j * 2));
  }

  // Parse the hash pairs into ints. Hash pairs are base 16 so "ec" becomes 236.
  // Each pair will become a value ranging from 0 - 255
  const decPairs = hashPairs.map((x) => {
    return parseInt(x, 16);
  });

  // Grab the first 16 values of the hash to use as a noise seed.
  const seed = parseInt(tokenData.hash.slice(0, 16), 16);

  // Grab the first hash pair int to use as a line thickness value.
  const lineThickness = decPairs[1];

  // Grab three different different hash pair ints to use as RGB values.
  const rColor = decPairs[28];
  const gColor = decPairs[29];
  const bColor = decPairs[30];

  p.setup = () => {
    let canvas = p.createCanvas(1600, 1600);

    // See the noise value.
    p.noiseSeed(seed);

    // Create the variable values.
    const numCircles = 50;
    const padding = 1600 / 25;

    // Define the grid area as the width of the canvas minus the padding.
    const gridArea = 1600 - padding;

    // Move to the center of the canvas and draw a square that encompasses the canvas.
    p.push();
    p.translate(1600 / 2, 1600 / 2);
    p.rectMode(p.CENTER);
    p.square(0, 0, 1600 - padding / 2);
    p.pop();

    // Account for the padding and define the size of each cell in the grid.
    p.translate(padding / 2, padding / 2);
    const cellSize = gridArea / (numCircles + 1);

    // Set the circle fill color.
    p.fill(rColor, gColor, bColor);

    // Set the strokeWeight by turning the 0 - 255 value into a 0 - 5 value.
    p.strokeWeight(p.map(lineThickness, 0, 255, 0, 5));

    // Loop through each cell in the grid and place an ellipse.
    let xOff = 0;
    for (let x = 0; x < numCircles; x++) {
      let yOff = 0;
      for (let y = 0; y < numCircles; y++) {
        // Set the ellipse size based on noise.
        const ellipseSize = p.map(p.noise(xOff, yOff), 0, 1, 0, cellSize);

        // Create the ellipse.
        p.ellipse(
          cellSize * (x + 1),
          cellSize * (y + 1),
          ellipseSize,
          ellipseSize
        );
        yOff += 0.1;
      }
      xOff += 0.1;
    }

    buf2 = Buffer.from(
      p.getCanvasDataURL(canvas).replace(/^data:image\/png;base64,/, ""),
      "base64"
    );
  };
  p.draw = () => {};
}

function saveImage(tokenHash, tokenId) {
  tokenData.hash = tokenHash;
  tokenData.tokenId = tokenId;

  let p5Instance = p5.createSketch(sketch);

  return buf2;
}

export { saveImage };
