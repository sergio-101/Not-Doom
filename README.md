# Not-Doom

### A First-Person Shooter Engine built from Scratch in JavaScript with no external library support; Raw Raycasting, Sprite Projection, and some Clever Workarounds.

The Engine uses the DDA (Digital Differential Analysis) algorithm to cast rays per screen column and compute wall intersections.
Floor and ceiling are rendered with per-pixel texture mapping directly into an ImageData buffer. Enemies are projected into screen space using a camera-space matrix transform so they scale and track correctly as the player rotates. Weapons run on a state machine with frame-timed sprite animation for idle, fire, and reload states.
 
The map is a 2D integer grid where each value indexes into a wall texture atlas, allowing different wall types per cell.
 

## Controls

| Key | Action |
|-----|--------|
| `W` | Move forward |
| `S` | Move backward |
| `A` | Strafe left |
| `D` | Strafe right |
| `Q` | Switch weapon |
| `R` | Reload |
| Mouse | Look around (click canvas to lock) |
| Left click | Fire |

# Screenshots
<img width="1218" height="677" alt="Screenshot from 2026-06-23 14-35-43" src="https://github.com/user-attachments/assets/e8c9c5e1-5cfb-4046-8cf5-04d7c0936aec" />
<img width="1218" height="677" alt="image" src="https://github.com/user-attachments/assets/a5c928ce-4288-49c1-9148-4fa07b86d9eb" />
<img width="1218" height="677" alt="image" src="https://github.com/user-attachments/assets/bd28c9c4-fabe-43ee-95ca-2d084bc7be9a" />


