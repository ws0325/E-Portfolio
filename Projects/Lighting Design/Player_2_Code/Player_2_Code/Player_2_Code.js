let p2Ship;
let meteorites = [];
let video; 
let meteoriteImg; 

/*
function preload() {
  // Load the meteorite image here once you have it
  meteoriteImg = loadImage('your_meteorite_image.png'); 
}
*/

function setup() {
  createCanvas(800, 600);
  
  // Initialize webcam
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide(); // Hide the HTML video element, keep it only on canvas
  
  p2Ship = new Player2Ship();
  
  // Generate 4 independent meteorites
  for (let i = 0; i < 4; i++) {
    meteorites.push(new Meteorite());
  }
}

function draw() {
  // Mirror the webcam feed for intuitive interaction
  push();
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  pop();

  // Update and draw meteorites
  for (let m of meteorites) {
    m.update();
    m.draw();
  }

  // Update and draw Player 2 spaceship
  p2Ship.update();
  p2Ship.draw();
}

function mousePressed() {
  // Fire laser on left mouse click
  if (mouseButton === LEFT) {
    p2Ship.fire();
  }
}

// ==========================================
// Core Classes
// ==========================================

class Player2Ship {
  constructor() {
    this.x = width / 2;
    this.y = height / 2;
    this.size = 60; 
    this.lasers = []; // Store fired lasers
  }

  update() {
    // Ship follows mouse cursor
    this.x = mouseX;
    this.y = mouseY;

    // Iterate backwards to prevent index shifting when removing elements
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      this.lasers[i].update();
      
      // Remove laser if it goes off-screen to free up memory
      if (this.lasers[i].isOffScreen()) {
        this.lasers.splice(i, 1);
      }
    }
  }

  draw() {
    // Draw lasers first (underneath the ship)
    for (let laser of this.lasers) {
      laser.draw();
    }

    // Draw ship placeholder (can be replaced with an image later)
    push();
    fill(150, 255, 150); // Ship base color
    noStroke();
    ellipse(this.x, this.y, this.size + 20, this.size - 30); 
    
    fill(200, 250, 255, 200); // Cockpit glass color
    arc(this.x, this.y - 5, this.size - 10, this.size - 10, PI, 0); 
    pop();
  }

  fire() {
    this.lasers.push(new Laser(this.x, this.y));
  }
}

class Laser {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 7.5; 
  }

  update() {
    this.y += this.speed; // Laser moves downwards
  }

  draw() {
    push();
    stroke(255, 50, 50); // Red laser
    strokeWeight(4);
    line(this.x, this.y, this.x, this.y + 25);
    pop();
  }

  isOffScreen() {
    return this.y > height;
  }
}

class Meteorite {
  constructor() {
    this.reset();
  }

  reset() {
    // Stagger spawn positions on the X-axis for natural entry timing
    this.x = width + random(50, 600); 
    this.y = random(50, height - 50); 
    
    this.speed = random(1, 2.3); 
    this.size = random(20, 45); 
  }

  update() {
    this.x -= this.speed; // Move left
    
    // Reset if it moves completely off the left side of the screen
    if (this.x < -this.size) {
      this.reset(); 
    }
  }

  draw() {
    push();
    
    // Image placeholder - uncomment and replace the ellipse when ready
    // image(meteoriteImg, this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    
    fill(100); // Grey rock color
    noStroke();
    ellipse(this.x, this.y, this.size, this.size * 0.8);
    pop();
  }
}
