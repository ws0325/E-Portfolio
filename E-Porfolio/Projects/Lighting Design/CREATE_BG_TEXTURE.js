// ============================================================
// This script generates a background texture image
// Run this in the browser console or modify the HTML to load it
// ============================================================

// Creates a checkerboard-style texture suitable for the game background
function generateBackgroundTexture() {
    let textureCanvas = createCanvas(512, 512);

    // Create a gradient space texture
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let r = map(sin(x * 0.01), -1, 1, 5, 30);
            let g = map(sin(y * 0.01), -1, 1, 10, 40);
            let b = map(sin((x + y) * 0.01), -1, 1, 20, 50);

            set(x, y, color(r, g, b, 255));
        }
    }

    updatePixels();

    // Save as PNG
    saveCanvas(textureCanvas, 'bg-texture', 'png');

    print('Background texture saved as: bg-texture.png');
    print('Move it to the image/ folder to use it in the game');
}

// Alternative: Create a starfield-like texture
function generateStarfieldTexture() {
    let textureCanvas = createCanvas(512, 512);
    background(5, 10, 25);

    // Add stars
    randomSeed(42); // For reproducibility
    for (let i = 0; i < 500; i++) {
        let x = random(width);
        let y = random(height);
        let size = random(0.5, 2);
        let brightness = random(100, 255);

        fill(brightness);
        noStroke();
        circle(x, y, size);
    }

    // Add some particle-like elements
    stroke(0, 150, 255, 50);
    strokeWeight(0.5);
    for (let i = 0; i < 100; i++) {
        line(random(width), random(height), random(width), random(height));
    }

    saveCanvas(textureCanvas, 'bg-texture', 'png');

    print('Starfield texture saved as: bg-texture.png');
    print('Move it to the image/ folder to use it in the game');
}
