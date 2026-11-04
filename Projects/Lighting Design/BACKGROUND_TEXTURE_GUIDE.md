# 🎮 Background Texture Guide

## Features

### 1. **Earth & Moon Edge Textures** 🌍🌕
- **Left edge**: Earth texture (`image/earth.png`), where Player 1 starts
- **Right edge**: Moon texture (`image/moon.png`), the mission target
- After the orbit animation the game flips direction, and the rocket flies back to the Earth side

### 2. **Background Image Texture Support** 🖼️
- By default the game draws `image/background.jpeg` behind everything
- If `image/bg-texture.png` exists, the game uses it instead (it is optional; the game starts fine without it)
- Toggle the texture on/off during gameplay with **B** (off = plain dark blue background)

## How to Use

### Set up a custom background texture:

1. **Generate a texture**:
   - Open `generate-bg-texture.html` in your browser
   - Click one of the texture generation buttons:
     - Grid Texture (classic cyberpunk grid)
     - Starfield Texture (cosmic space effect)
     - Glitch Texture (digital error aesthetic)
     - Neon Texture (neon glow effect)
   - The PNG file downloads as `bg-texture.png`

2. **Move the file**:
   - Move the downloaded `bg-texture.png` to: `image/bg-texture.png`

3. **Use it in the game**:
   - Launch (or reload) the main game (`index.html`); the texture is picked up automatically
   - Press **B** to toggle the background texture on/off
   - Press **T** to print the texture status in the browser console

To go back to the default background, delete `image/bg-texture.png`.

### Keyboard Shortcuts:
- **B** - Toggle background texture display
- **T** - Print texture status in the console: whether it is on, which image is in use, and whether `bg-texture.png` was found

## File Structure

```
Lighting Design/
├── index.html                      (Main game)
├── sketch_260227b.js               (Game code, including the background functions)
├── generate-bg-texture.html        (Texture generator)
├── CREATE_BG_TEXTURE.js            (Alternative generation script, run from the browser console)
└── image/
    ├── background.jpeg             (Default background)
    ├── earth.png, moon.png         (Edge textures)
    └── bg-texture.png (optional)   (Your custom background)
```

## Customization

### Use Your Own Image:
1. Create a PNG image (512x512 or 1024x1024 recommended; it is stretched to fill the screen)
2. Save it as `bg-texture.png` in the `image/` folder
3. Reload the game

### Modify Background Drawing:
Edit the `drawBackground()` function in `sketch_260227b.js`:
```javascript
function drawBackground() {
  let bgImage = customBgTexture || backgroundTexture;
  if (enableBgTexture && bgImage) {
    image(bgImage, 0, 0, width, height);
  } else {
    background(5, 10, 25);  // Plain colour used when the texture is switched off
  }
}
```

### Modify Edge Textures:
Edit the "Edge Decorative Orbs" section of `draw()` in `sketch_260227b.js`:
- Change the size: `width * 0.2` (adjust the multiplier)
- Swap the pictures: replace `image/earth.png` and `image/moon.png`

## Technical Details

### Variables (in sketch_260227b.js):
- `backgroundTexture` - the default background (`image/background.jpeg`)
- `customBgTexture` - the optional `image/bg-texture.png` (`null` when not found)
- `enableBgTexture` - whether a background texture is drawn (toggled with B)

### Functions:
- `drawBackground()` - draws the background texture, or the plain colour when it is off
- `loadOptionalBgTexture()` - loads `bg-texture.png` only if the file exists
- `keyPressed()` - handles the B and T keys
- `logTextureStatus()` - prints the texture status

## Troubleshooting

**Custom texture not showing?**
- Check that the file is at `image/bg-texture.png` and the filename is exactly `bg-texture.png`
- Reload the game, then press **T**: it should say `loaded`
- Make sure the texture is switched on (press **B**)
- Check the browser console (press F12) for errors

## Credits
Generated with custom p5.js texture generation tools.
