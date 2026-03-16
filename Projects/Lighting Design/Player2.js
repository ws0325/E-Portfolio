class Player2Ship {
    constructor() {
        this.x = width - 230;
        this.y = height / 2;
        this.size = 60;
        this.lasers = [];
        this.fireCooldown = 0;
    }

    update(hand) {
        if (hand) {
            let wrist = getMappedPoint(hand.wrist);
            let indexTip = getMappedPoint(hand.index_finger_tip);
            let thumbTip = getMappedPoint(hand.thumb_tip);

            this.y = lerp(this.y, wrist.y, 0.2);
            this.y = constrain(this.y, this.size / 2, height - this.size / 2);

            if (typeof isFlipped !== 'undefined' && isFlipped) {
                this.x = lerp(this.x, 230, 0.1);
            } else {
                this.x = lerp(this.x, width - 230, 0.1);
            }

            let d = dist(indexTip.x, indexTip.y, thumbTip.x, thumbTip.y);
            if (d < 40 && this.fireCooldown <= 0) {
                this.fire();
                this.fireCooldown = 120;
            }
        }

        if (this.fireCooldown > 0) this.fireCooldown--;

        for (let i = this.lasers.length - 1; i >= 0; i--) {
            this.lasers[i].update();
            if (this.lasers[i].isOffScreen()) {
                this.lasers.splice(i, 1);
            }
        }
    }

    draw() {
        for (let laser of this.lasers) laser.draw();

        push();
        fill(150, 255, 150);
        noStroke();
        ellipse(this.x, this.y, this.size + 20, this.size - 30);
        fill(200, 250, 255, 200);
        arc(this.x, this.y - 5, this.size - 10, this.size - 10, PI, 0);
        pop();
    }

    fire() {
        this.lasers.push(new Laser(this.x, this.y));
        if (typeof laserSound !== 'undefined' && laserSound.isLoaded()) {
            laserSound.play();
        }
    }
}

class Laser {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        if (typeof isFlipped !== 'undefined' && isFlipped) {
            this.speedX = 10;
        } else {
            this.speedX = -10;
        }
    }

    update() {
        this.x += this.speedX;
    }

    draw() {
        push();
        stroke(255, 100, 100, 100);
        strokeWeight(12);
        let tailLength = (this.speedX > 0) ? -30 : 30;
        line(this.x, this.y, this.x - tailLength, this.y);
        stroke(255, 50, 50);
        strokeWeight(4);
        line(this.x, this.y, this.x - tailLength, this.y);
        pop();
    }

    isOffScreen() {
        if (typeof isFlipped !== 'undefined' && isFlipped) {
            return this.x > width;
        }
        return this.x < 0;
    }
}

class Meteorite {
    constructor() {
        this.trail = [];
        this.reset();
    }

    reset() {
        if (typeof isFlipped !== 'undefined' && isFlipped) {
            this.x = -random(50, 600);
            this.speed = -random(2.5, 5.0);
        } else {
            this.x = width + random(50, 600);
            this.speed = random(2.5, 5.0);
        }
        this.y = random(50, height - 50);
        this.size = random(25, 50);
        this.trail = [];
    }

    update() {
        this.x -= this.speed;

        this.trail.push(createVector(this.x, this.y));
        if (this.trail.length > 10) this.trail.shift();

        if (typeof isFlipped !== 'undefined' && isFlipped) {
            if (this.x > width + this.size) this.reset();
        } else {
            if (this.x < -this.size) this.reset();
        }
    }

    draw() {
        if (this.trail.length > 2) {
            push();
            noFill();
            for (let i = 0; i < this.trail.length - 1; i++) {
                let alpha = map(i, 0, this.trail.length, 0, 100);
                stroke(100, 100, 100, alpha);
                strokeWeight(this.size * map(i, 0, this.trail.length, 0.2, 0.8));
                line(this.trail[i].x, this.trail[i].y, this.trail[i + 1].x, this.trail[i + 1].y);
            }
            pop();
        }

        push();
        fill(100);
        noStroke();
        ellipse(this.x, this.y, this.size, this.size * 0.8);
        fill(70);
        ellipse(this.x - this.size * 0.1, this.y + this.size * 0.1, this.size * 0.4, this.size * 0.3);
        pop();
    }
}

class EnergyOrb {
    constructor() {
        this.reset();
    }

    reset() {
        if (typeof isFlipped !== 'undefined' && isFlipped) {
            this.x = -random(200, 1000);
            this.speed = -random(1.5, 3.0);
        } else {
            this.x = width + random(200, 1000);
            this.speed = random(1.5, 3.0);
        }
        this.y = random(80, height - 80);
        this.size = 35;
        this.pulse = random(TWO_PI);
    }

    update() {
        this.x -= this.speed;
        this.pulse += 0.1;
        this.y += sin(this.pulse) * 1.5;

        if (typeof isFlipped !== 'undefined' && isFlipped) {
            if (this.x > width + this.size) this.reset();
        } else {
            if (this.x < -this.size) this.reset();
        }
    }

    draw() {
        push();
        let glow = map(sin(this.pulse), -1, 1, 80, 200);

        fill(50, 255, 100, glow * 0.3);
        noStroke();
        circle(this.x, this.y, this.size * 1.8);

        fill(50, 255, 100, glow);
        circle(this.x, this.y, this.size);

        fill(255);
        circle(this.x, this.y, this.size * 0.4);
        pop();
    }
}

class Particle {
    constructor(x, y, col) {
        this.pos = createVector(x, y);
        this.vel = p5.Vector.random2D().mult(random(2, 8));
        this.life = 255;
        this.color = col;
        this.size = random(2, 6);
    }
    update() {
        this.pos.add(this.vel);
        this.life -= 15;
    }
    draw() {
        push();
        noStroke();
        fill(red(this.color), green(this.color), blue(this.color), this.life);
        circle(this.pos.x, this.pos.y, this.size);
        pop();
    }
    isDead() {
        return this.life <= 0;
    }
}
