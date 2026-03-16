# 🎮 Background Texture & Edge Circles Guide

## New Features

### 1. **Prominent Edge Circles** 🔵🟢
- **Left Circle**: Blue circle for Player 1 zone (when not flipped)
- **Right Circle**: Green circle for Player 2 zone (when not flipped)
- Multiple layers for visual depth effect
- The circles are now more visible and prominently displayed at the edges

### 2. **Background Image Texture Support** 🖼️
- Load custom background textures from the `/image/` folder
- Expected filename: `bg-texture.png`
- Transparent overlay applied over the texture for clarity
- Dynamically toggle texture on/off during gameplay

## How to Use

### Setup Background Texture:

1. **Generate a texture**:
   - Open `generate-bg-texture.html` in your browser
   - Click one of the texture generation buttons:
     - Grid Texture (classic cyberpunk grid)
     - Starfield Texture (cosmic space effect)
     - Glitch Texture (digital error aesthetic)
     - Neon Texture (neon glow effect)
   - The PNG file will download

2. **Move the file**:
   - Move the downloaded `bg-texture.png` to: `/image/bg-texture.png`

3. **Enable in game**:
   - Launch the main game (`index.html`)
   - Press **B** to toggle background texture on/off
   - Press **T** to check texture status in browser console

### Keyboard Shortcuts:
- **B** - Toggle background texture display
- **T** - Display texture status in console

## File Structure

```
LightingFinal/
├── index.html                      (Main game)
├── sketch_260227b.js              (Game code with new features)
├── generate-bg-texture.html       (Texture generator)
├── CREATE_BG_TEXTURE.js           (Alternative generation script)
└── image/
    └── bg-texture.png (optional)  (Your custom background)
```

## Customization

### Use Your Own Image:
1. Create a PNG or JPG image (512x512 or 1024x1024 recommended)
2. Save it as `bg-texture.png` in the `/image/` folder
3. Launch the game and press B to enable

### Modify Texture Appearance:
Edit the `drawBackground()` function in `sketch_260227b.js`:
```javascript
function drawBackground() {
  if (enableBgTexture && bgTexture) {
    push();
    image(bgTexture, 0, 0, width, height);
    
    // Adjust overlay opacity (0-255)
    fill(5, 10, 25, 80);  // Change last number for more/less darkness
    noStroke();
    rect(0, 0, width, height);
    pop();
  } else {
    background(5, 10, 25);
  }
}
```

### Modify Edge Circles:
Edit the `drawEdgeCircles()` function in `sketch_260227b.js`:
- Change the radius: `width * 0.25` (adjust multiplier)
- Modify colors: Change RGB values in `fill()` calls
- Adjust transparency: Change the alpha value (4th parameter)

## Technical Details

### New Variables (in sketch_260227b.js):
- `bgTexture` - stores the loaded background image
- `enableBgTexture` - boolean to toggle texture display

### New Functions:
- `drawBackground()` - renders background with optional texture
- `drawEdgeCircles()` - draws circular zones on edges
- `keyPressed()` - handles B and T key input

### Modified Functions:
- Updated `preload()` to load background texture
- Updated `draw()` to use new background system

## Troubleshooting

**Texture not showing?**
- Check that `bg-texture.png` is in the `/image/` folder
- Verify the filename is exactly `bg-texture.png`
- Check browser console (press F12) for errors

**Game performance slow?**
- The texture overlay might be too complex
- Try a simpler texture style
- Reduce overlay opacity in `drawBackground()`

**Can't find the edge circles?**
- Make sure you're not in flipped mode (circles appear on screen edges)
- Check that `drawEdgeCircles()` is called in the draw function
- Verify the fill colors aren't identical to the background

## Credits
Generated with custom p5.js texture generation tools.
