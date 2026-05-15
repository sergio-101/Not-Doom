class Sprite{
    img;
    constructor(url){
        return new Promise((res, rej)=>{
            this.img = new Image();
            this.img.src = url;
            this.img.addEventListener("load", ()=>{
                res(this);
            })
        })
    }
}

let TEXTURES_COLLECTION = {
    floor: [
        new Sprite("sprites/floor.png"),
    ],
    wall: [
        new Sprite("sprites/wall.png"),
        new Sprite("sprites/wall-2.png"),
    ],
    "shotgun-idle": [
        new Sprite("sprites/shotgun-idle.png"),
    ],
    "shotgun-fire": new Array(10).fill("").map((_, k)=> {
         return (new Sprite("sprites/SG-Fire/" + (k).toString() + ".png"));
    }),
    "shotgun-reload": new Array(61).fill("").map((_, k)=> {
         return (new Sprite("sprites/SG-Reload/" + (k).toString().padStart(4, '0') + ".png"));
    }),
    "ar-idle": [
        new Sprite("sprites/ar-idle.png"),
    ],
    "ar-fire": new Array(7).fill("").map((_, k)=> {
         return (new Sprite("sprites/AR-Fire/" + (k).toString() + ".png"));
    }),
    "ar-reload": new Array(61).fill("").map((_, k)=> {
         return (new Sprite("sprites/AR-Reload/" + (k).toString().padStart(4, '0') + ".png"));
    }),
    "enemy-idle": new Array(61).fill("").map((_, k)=> {
         return (new Sprite("sprites/Enemy/IDLEING/S/STORMTROOPER" + (k).toString().padStart(4, '0') + ".png"));
    }),
    "hurt": new Array(7).fill("").map((_, k)=> {
         return (new Sprite("sprites/Hurt/" + (k).toString() + ".png"));
    }),
    "Enemy-FIRING": new Array(9).fill("").map((_, k) =>  new Sprite("sprites/Enemy/FIRING/STORMTROOPER" + (k).toString().padStart(4, '0') + ".png")),
    "Enemy-FALLING": new Array(61).fill("").map((_, k) => new Sprite("sprites/Enemy/FALLING/STORMTROOPER" + (k).toString().padStart(4, '0') + ".png"))
};

// LOAD ENEMY SPRITES
const ENEMY_STATE = [["IDLEING", 60], ["WALKING", 40]]
const DIRECTIONS = ["S", "SE", "E", "NE", "N", "NW", "W", "SW"];
for(state of ENEMY_STATE){
    for(dir of DIRECTIONS){
        TEXTURES_COLLECTION[`Enemy-${state[0]}-${dir}`] = [];
        for(let x = 1; x <= state[1]; x++){
            TEXTURES_COLLECTION[`Enemy-${state[0]}-${dir}`].push(new Sprite(`sprites/Enemy/${state[0]}/${dir}/STORMTROOPER${(x).toString().padStart(4, '0')}.png`));
        }
    }
}

let TEXTURES = {
    Floor: null,
    Walls: [],
    Weapons: Object(),
    Enemy: {},
};
const WEAPONS = [{name: "Shotgun", fire_time: 0.4, reload_time: 2, recoil: 0.02, range: 3, attack: 80, rof: 0.4}, {name: "AR", fire_time: 0.2, reload_time: 2, recoil: 0.01, range: 3, attack: 5, rof: 0.001}];

// dirty implementation for LIMITED BULLETS
let BULLETS = [[6, 6], [60, 60]];

for(wp of WEAPONS){
    TEXTURES.Weapons[wp.name] = {
        Idle: [],
        Fire: [],
        Reload: []
    }
}
class Vector2{
    x; y;
    constructor (x, y) {
        this.x = x;
        this.y = y;
    }
    sub(that) {return new Vector2(this.x - that.x, this.y - that.y)}

    add(that) {
        return new Vector2(this.x + that.x, this.y + that.y)
    }
    mul(that) {
        return new Vector2(this.x * that.x, this.y * that.y)
    }
    mag(){return Math.sqrt(this.x * this.x + this.y * this.y)}
    scale(that) {return new Vector2(this.x * that,  this.y * that)} dist(that){return Math.sqrt(((that.y - this.y)**2) + ((that.x - this.x)**2))};
    dist_sq(that){return (((that.y - this.y)**2) + ((that.x - this.x)**2))};
    normalize(){return this.scale(1/this.dist(new Vector2(0, 0)));}
    dot(that){return (this.x * that.x + this.y * that.y)}
    cross(that){return (this.y * that.x - this.x * that.y)};
    unsigned_angle_cos(that){
        return (this.dot(that)/(this.mag()*that.mag()))
    }
    rotate(deg){
        let c = Math.cos(deg);
        let s = Math.sin(deg);
        let x = this.x; 
        let y = this.y; 
        return new Vector2(
            x*c - y*s, x*s + y*c
        )
    }
    block_index(){return new Vector2(Math.floor(this.x), Math.floor(this.y))}
    get_octant(){
        let vect = this.rotate(-Math.PI/8);
        const x = vect.x;
        const y = vect.y;
        const octates = [
            [ // vert more
                [ // positive y
                    1,  // positive x
                    2  // negative x
                ],
                [ // negative y
                    6,  // positive x
                    5   // negative x
                ]
            ], 
            [ // hor more
                [ // positive y
                    0,  // positive x
                    3   // negative x
                ],
                [ // negative y
                    7,  // positive x
                    4   // negative x
                ]
            ], 
        ]
        return octates[+(Math.abs(y)<Math.abs(x))][+(y<0)][+(x<0)];
    }
}

class Enemy {
    pos;
    dir;
    dir_vector;
    mode = "IDLE";
    frame_counter = 0;
    next_walk_start = 0;
    speed = 1;
    wandering_speed = 1.5;
    locked_speed = 4;
    hp = 100;
    reach = null;
    dist_sq_from_player;
    hurt = false;
    dead = false;
    constructor(x, y){
        this.pos = new Vector2(x, y);
        this.dir = 2 * Math.PI * Math.random();
        this.dir_vector = new Vector2(Math.cos(this.dir), Math.sin(this.dir));
    }
    rel_direction(Player){
        const angle_rel = Player.position.sub(this.pos).normalize();
        return DIRECTIONS[(angle_rel.get_octant() - this.dir_vector.normalize().get_octant() + 8) % 8];
    }
    update_dir_vector(){
        this.dir_vector = new Vector2(Math.cos(this.dir), Math.sin(this.dir));
    }
    get_sprite_state(){
        if(this.mode == "WALK") {
            return "WALKING"
        }
        if(this.mode == "IDLE"){
            return "IDLEING"
        }
        if(this.mode == "FIRE"){
            return "FIRING"
        }
        if(this.mode == "DIE"){
            return "FALLING"
        }
    }
    get_current_sprite(Player){
        const state = this.get_sprite_state();
        const dir = this.rel_direction(Player)
        const textures_arr = (state == "WALKING" || state == "IDLEING") ? TEXTURES.Enemy[state][dir]: TEXTURES.Enemy[state];
        const texture = textures_arr[this.frame_counter].img
        return texture;
    }
    update_sprite(delta){
        const state = this.get_sprite_state();
        const textures_arr = (state == "WALKING" || state == "IDLEING") ? TEXTURES.Enemy[state][dir]: TEXTURES.Enemy[state];
        const ENEMY_DYING_DURATION = 1.5;
        const ENEMY_REGULAR_SPRITE_DURATION = 2;
        const total_time = this.mode === "DIE"? ENEMY_DYING_DURATION : ENEMY_REGULAR_SPRITE_DURATION/this.speed;
        let frame_inc = Math.floor((textures_arr.length * delta) / (total_time * 1000));
        this.frame_counter += frame_inc;
        if(textures_arr.length <= this.frame_counter) {
            if(this.mode == "DIE") {
                this.dead = true;
            }
        }
        this.frame_counter %= textures_arr.length;
    }
}
class Player {
    speed;
    position;
    dir;
    dir_vector;
    plane;
    fov = Math.PI/2;
    bob_time = 0;
    bob_speed = 8;
    state = "Idle";
    weapon = 0;
    weapon_sprite_index = 0;
    normal_speed = 0.02;
    turning_speed = 0.04;
    gun_arm_speed = 0.007;
    hp = 100;
    hurt = false;
    hurt_frame_counter = 0;
    trying_fire = false;
    can_fire = true;
    cant_fire_until = 0;
    constructor (position, dir){
        this.position = position;
        this.dir = dir;
        this.dir_vector = new Vector2(Math.cos(Player.dir), Math.sin(Player.dir));
        this.plane = new Vector2(0, Math.tan(this.fov/2));
        this.speed = this.normal_speed;
    }
}

const ctx = canvas.getContext("2d", {willReadFrequently: true} );
canvas.width = 320;
canvas.height = 200;
canvas.style.imageRendering = "pixelated";
let COLS;
let ROWS;
let STATE = {
    Enemy: [
        // new Enemy(10.5, 2.5)
    ],
    highlight: {},
    keys: {
        keya: false, 
        keyw: false, 
        keys: false, 
        keyd: false,
        keyr: false,
        keyq: false,
        arrowleft: false,
        arrowright: false
    },
    running: true,
    start_time: 0,
    last_frame: 0,
    message: ""
};

function draw_circle(p1, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, r, 0, Math.PI*2);
    ctx.closePath();
    ctx.fill();
}

function draw_line(p1, p2, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y); 
    ctx.stroke();
}
function cast_ray(pos, delta){
    let step = new Vector2();
    let side_dist = new Vector2();
    let current_block = new Vector2(Math.floor(pos.x), Math.floor(pos.y))
    let ray_length_for_unit_in_axis = new Vector2(
        Math.sqrt(1 + ((delta.y * delta.y) / (delta.x * delta.x))),
        Math.sqrt(1 + ((delta.x* delta.x) / (delta.y * delta.y)))
    )
    if(delta.x < 0){
        step.x = -1;
        side_dist.x = (pos.x - current_block.x) * ray_length_for_unit_in_axis.x;
    }
    else {
        step.x = 1;
        side_dist.x = (current_block.x + 1 - pos.x) * ray_length_for_unit_in_axis.x;
    }
    if(delta.y < 0){
        step.y = -1;
        side_dist.y = (pos.y - current_block.y) * ray_length_for_unit_in_axis.y;
    }
    else {
        step.y = 1;
        side_dist.y = (current_block.y + 1 - pos.y) * ray_length_for_unit_in_axis.y;
    }
    let hit = false;
    let side;
    let type = "WALL";
    let dist;
    while(!hit){
        if(side_dist.x < side_dist.y){
            current_block.x += step.x;
            dist = side_dist.x;
            side_dist.x += ray_length_for_unit_in_axis.x; 
            side = "VERTICAL";
        }
        else{
            current_block.y += step.y
            dist = side_dist.y;
            side_dist.y += ray_length_for_unit_in_axis.y;
            side = "HORIZONTAL";
        }
        if(current_block.x < 0 || current_block.y < 0 || COLS <= current_block.x || ROWS <= current_block.y) {
            type = "BOUNDARY";
            break;
        }
        hit = STATE.Scene[current_block.y][current_block.x];
    }
    let perp_dist;
    if (side === "VERTICAL") {
        perp_dist = (current_block.x - pos.x + (1 - step.x) / 2) / delta.x;
    } else {
        perp_dist = (current_block.y - pos.y + (1 - step.y) / 2) / delta.y;
    }
    let hit_pos = {};
    if (side === "VERTICAL") {
        hit_pos.y = pos.y + perp_dist * delta.y;
        hit_pos.x = current_block.x;
    } else {
        hit_pos.x = pos.x + perp_dist * delta.x;
        hit_pos.y = current_block.y;
    }
    return {
        hit_text_cords: hit_pos,
        dist,
        perp_dist,
        side,
        block : type === "WALL" ? current_block : null,
        hit_cords: pos.add(delta.normalize().scale(dist)),
    }
}
// w_px is wrt the screen
// dx is wrt to the plane
function cast_ray_from_player(w_px, dx){
    const Player = STATE.Player;
    let pos = Player.position;
    if(dx == undefined) dx = w_px/(canvas.width/2) - 1;
    let delta = Player.dir_vector.add(Player.plane.scale(dx)); 
    return cast_ray(pos, delta);
}
addEventListener("keyup", (e) => {
    if(Object.keys(STATE.keys).includes(e.code.toLowerCase())) STATE.keys[e.code.toLowerCase()] = false;
});

addEventListener("keydown", (e) => {
    if(Object.keys(STATE.keys).includes(e.code.toLowerCase())) STATE.keys[e.code.toLowerCase()] = true;
});

canvas.addEventListener("click", () => canvas.requestPointerLock());
addEventListener("mousemove", e => {
    if(document.pointerLockElement === canvas){
        let Player = STATE.Player;
        Player.turn = e.movementX * -0.001;
    }
});

addEventListener("mousedown", e => {
    if(document.pointerLockElement === canvas){
        let Player = STATE.Player;
        Player.trying_fire = true;
    }
});
addEventListener("mouseup", e => {
    if(document.pointerLockElement === canvas){
        let Player = STATE.Player;
        Player.trying_fire = false;
    }
});
function minimap(w, h){
    ctx.fillStyle = "rgba(10, 10, 10, 0.8)";
    ctx.fillRect(0, 0, w, h);
    ctx.save()
    ctx.scale(w/8, h/8);
    // ctx.scale(canvas.width/COLS, canvas.height/ROWS);
    ctx.lineWidth = 0.1;

    let Player = STATE.Player;

    let P = STATE.Player;

    // all the blocks on the minimap
    const row_start = Math.floor(Math.max(0, P.position.x - 4))
    const col_start = Math.floor(Math.max(0, P.position.y - 4))
    const adjust = ({x, y}) => ({x: x - row_start, y: y - col_start})
    for(let row = row_start, x = 0; row < Math.min(ROWS, row_start + 8); ++row, ++x){
        for(let col = col_start, y = 0; col < Math.min(COLS, col_start + 8); ++col, ++y){
            ctx.fillStyle = "grey";
            if(STATE.Scene[col][row]) ctx.fillRect(row - row_start, col - col_start, 1, 1);
        }
    }
    const adjusted_player_pos = adjust(P.position); 
    draw_circle({x: adjusted_player_pos.x , y: adjusted_player_pos.y }, 0.2, "cyan")
    if(STATE.Highlight)draw_circle(adjust(STATE.Highlight), 0.2, "pink")
    const a = adjust(P.position.add(P.plane));
    const c = adjust(P.position.add(P.plane.scale(-1)));
    const b = adjust(P.position.add(P.dir_vector));
    draw_line(b, a, "yellow");
    draw_line(b, c, "yellow");

    for(hit of STATE.ray_hits){
        const cord = adjust(hit.hit_cords);
        if(cord.x <  8 && cord.y < 8) {
            draw_circle(cord, 0.05, "cyan");
        }
    } 
    for(let e of STATE.Enemy){
        const cord = adjust(e.pos);
        if(!e.dead && cord.x <  8 && cord.y < 8) {
            draw_circle(cord, 0.2, "red");
            draw_line(cord, adjust(e.pos.add(e.dir_vector)), "yellow");
        }

    }
    ctx.restore();
}
function render_floor(){
    let Player = STATE.Player;
    const floor = TEXTURES.Floor.img;
    const image_data = ctx.createImageData(canvas.width, canvas.height);
    const buf = image_data.data; // Uint8ClampedArray, 4 bytes per pixel
    let start = (canvas.height)/2;
    let max_vision = 1;
    const left_fov = Player.dir_vector.add(Player.plane.scale(-1)).normalize();
    const right_fov = Player.dir_vector.add(Player.plane).normalize();
    for(let y = start + 1; y <= canvas.height; y += 1){
        let ray_dist = ((start) / (y - start)) 
        let left_point = Player.position.add(left_fov.scale(ray_dist)); 
        let right_point = Player.position.add(right_fov.scale(ray_dist)); 
        let brightness_coeff = ((y - start)/start) * max_vision; 
        for(let x = 0; x < canvas.width; x += 1){
            let brightness = brightness_coeff * Math.abs(Math.abs(canvas.width/2 - x) / (canvas.width/2) - 1) ** 2
            let t = x/canvas.width;
            let world_x = left_point.x + (right_point.x - left_point.x) * t;
            let world_y = left_point.y + (right_point.y - left_point.y) * t;
            let u = world_x - Math.floor(world_x);
            let v = world_y - Math.floor(world_y);
            let tx = Math.floor(u * floor.width);
            let ty = Math.floor(v * floor.height);
            const tex_pixel_index = (ty * floor.width + tx) * 4;
            const scene_pixel_index = (y * canvas.width + x) * 4;
            // r
            buf[scene_pixel_index] = STATE.floor[tex_pixel_index] * brightness;
            // g
            buf[scene_pixel_index+1] = STATE.floor[tex_pixel_index+1] * brightness;
            // b
            buf[scene_pixel_index+2] = STATE.floor[tex_pixel_index+2] * brightness;
            // a
            buf[scene_pixel_index+3] = 255;
        }
    }
    ctx.putImageData(image_data, 0, 0);
}
function render_walls(){
    const center_hit = cast_ray_from_player(0); 
    for(let i = 0; i < canvas.width; i++){
        let hit = STATE.ray_hits[i];
        if(hit.block){
            const texture = TEXTURES.Walls[STATE.Scene[hit.block.y][hit.block.x]].img;
            let texture_x = hit.side == "HORIZONTAL" ? hit.hit_text_cords.x - hit.block.x : hit.hit_text_cords.y - hit.block.y;
            texture_x *= texture.width;
            const aspect_correction = center_hit.perp_dist / center_hit.dist;
            const wall_height = Math.ceil((canvas.height * aspect_correction) / hit.perp_dist);
            const x = i; 
            const y = canvas.height/2 - wall_height/2;
            ctx.drawImage(texture, texture_x, 0, 1, texture.height, x, y, 1, wall_height)
            if(hit.side == "HORIZONTAL"){
                ctx.fillStyle = `rgba(0, 0, 0, 0.2)`;
                ctx.fillRect(x, y, 1, wall_height);
            }

            // darken based on distance
            let max_vision = 3;
            let darkness_coeff = Math.min((hit.dist/max_vision) ** (1/2), 0.98); 
            ctx.fillStyle = `rgba(0, 0, 0, ${darkness_coeff})`;
            ctx.fillRect(x, y-1, 1, wall_height+1);
        }
    }
}

function update_weapon(ctime, delta){
    const Player = STATE.Player;
    const weapon_index = (Player.state == "Switch" && 40 <= Player.weapon_sprite_index) ? (Player.weapon+1) % WEAPONS.length: Player.weapon;
    const Weapon_Slide = TEXTURES.Weapons[WEAPONS[weapon_index].name][Player.state == "Switch" ? "Reload": Player.state];
    let total_time;
    if(Player.state == "Idle") return;
    if(Player.state == "Reload" || Player.state == "Switch"){
        total_time = WEAPONS[Player.weapon].reload_time;
    }
    else if(Player.state == "Fire"){
        total_time = WEAPONS[Player.weapon].fire_time;
    }
    // let seconds_per_frame = (total_time * 1000) / Weapon_Slide.length;
    let frame_inc = Math.floor((Weapon_Slide.length * delta) / (total_time * 1000));
    Player.weapon_sprite_index  += frame_inc;

    if(Player.weapon_sprite_index >= Weapon_Slide.length){
        Player.weapon_sprite_index = 0;
        if(Player.state === "Reload"){
            BULLETS[Player.weapon][0] = BULLETS[Player.weapon][1]; 
        }
        if(Player.state == "Switch"){
            Player.weapon++;
            Player.weapon = Player.weapon % WEAPONS.length;
        }
        Player.speed = Player.normal_speed;
        Player.state = "Idle";
    }
    Player.weapon_sprite_index = Player.weapon_sprite_index % Weapon_Slide.length; 
}

function render_weapon(ctime){
    const Player = STATE.Player;
    const weapon_index = (Player.state == "Switch" && 40 <= Player.weapon_sprite_index) ? (Player.weapon+1) % WEAPONS.length: Player.weapon;
    const Weapon_Slide = TEXTURES.Weapons[WEAPONS[weapon_index].name][Player.state == "Switch" ? "Reload": Player.state];
    const Weapon = Weapon_Slide[Player.weapon_sprite_index].img; 
    let bob_x = Math.sin(Player.bob_time) * 5;
    let bob_y = Math.abs(Math.sin(Player.bob_time)) * 10; 
    const scale = 0.6;
    let applied_w = Weapon.width*scale;
    let applied_h = Weapon.height*scale;
    ctx.drawImage(
        Weapon,
        0, 0, Weapon.width, Weapon.height,
        canvas.width/2 - applied_w/2 + bob_x,
        canvas.height - applied_h + 40 + bob_y,
        applied_w,
        applied_h 
    )
}

function lines_intersect_2d(p0, p1, p2, p3) {
    let s10_x = p1.x - p0.x;
    let s10_y = p1.y - p0.y;
    let s32_x = p3.x - p2.x;
    let s32_y = p3.y - p2.y;
    let denom = s10_x * s32_y - s32_x * s10_y;
    if (denom == 0) return null;
    let denom_is_positive = denom > 0

    let s02_x = p0.x - p2.x;
    let s02_y = p0.y - p2.y;

    let s_numer = s10_x * s02_y - s10_y * s02_x;

    if ((s_numer < 0) == denom_is_positive) return null;
    let t_numer = s32_x * s02_y - s32_y * s02_x;

    if ((t_numer < 0) == denom_is_positive) return null;

    if ((s_numer > denom) == denom_is_positive || (t_numer > denom) == denom_is_positive) return null; 

    let t = t_numer / denom;
    let intersection_point = { x: p0.x + (t * s10_x), y: p0.y + (t * s10_y)}
    return intersection_point
}

// Plan is to draw the sprite over the main canvas, draw darkness as an overlay over it much like how I did in walls.
// but drawing shadow over the whole sprite gives a rectangular block look, it works in walls because there is not transparency in those sprites.
// in character sprites, alot of it is transparent and thus we can't do exactly how we did in walls.
// if only, I can know the exact places which are transparent; I couldn't find how to take data from sprites directly in JS so.
// > first put that sprite on a off-screen canvas, 
// > take data of that canvas, much like the similar thing in floor but for a different reason 
// > scan the pixel data and look for which has the rgb data of more than 0 (can be cached, will not do, because who cares about optim. anyways)
// > reduce the pixels alpha channel from the main canvas which corresponds to co-ord found in the previous step
function render_enemies(){
    const center_hit = cast_ray_from_player(0); 
    const Player = STATE.Player;
    const a = Player.dir_vector.add(Player.plane.scale(-1));
    const c = Player.dir_vector.add(Player.plane);
    const offscreen = document.createElement("canvas");
    const ctx_off = offscreen.getContext("2d", {willReadFrequently: true});

    for(let e of STATE.Enemy){
        if(e.dead) continue;
        const b = e.pos.sub(Player.position);
        const texture = e.get_current_sprite(Player);  
        const t_x = 0; const t_y = 110; const t_w = texture.width; const t_h = 335; 
        if(a.cross(b) * a.cross(c) >= 0 && c.cross(b) * c.cross(a) >= 0){
            const intersect = lines_intersect_2d(
                {x: 0, y: 0}, b.scale(5), 
                a, c
            )
            if(intersect){
                const dist = b.mag();
                // 0 - 2;
                const cut_plane_in_ratio = a.dist(intersect);
                const dir_to_cast = Player.dir_vector.add(Player.plane.scale(cut_plane_in_ratio - 1));
                const pos = cast_ray(Player.position, dir_to_cast)
                if(dist <= pos.dist){
                    ctx_off.clearRect(0, 0, offscreen.width, offscreen.height);
                    const aspect_correction = center_hit.perp_dist / center_hit.dist;
                    let sp_h = Math.ceil((canvas.height * aspect_correction) / b.dot(Player.dir_vector));
                    let sp_w = Math.ceil(sp_h*1.5);
                    const sx = cut_plane_in_ratio * canvas.width/2 - sp_w/2;
                    const sy = canvas.height/2 - sp_h/2;
                    ctx.drawImage(texture, t_x, t_y, t_w, t_h, sx, sy, sp_w, sp_h)
                    offscreen.width = sp_w;
                    offscreen.height = sp_h;
                    ctx_off.drawImage( texture, t_x, t_y, t_w, t_h, 0, 0, sp_w, sp_h );
                    let max_vision = 1; 
                    let darkness_coeff = Math.min((max_vision/dist) ** (2), 1); 

                    ctx.fillStyle = `rgba(0, 0, 255, ${Math.min(1,darkness_coeff)})`;
                    ctx.font = `bold ${Math.floor(sp_w/6)}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(e.hp, sx + sp_w/2, sy - 10);
                    const enemy_data = ctx_off.getImageData(0, 0, offscreen.width, offscreen.height).data;
                    const saved = ctx.getImageData(0, 0, canvas.width, canvas.height).data;                   
                    let offset = Math.floor(sy) * canvas.width + Math.floor(sx);
                    for(let ptr = 0, pixel = 0; pixel < offscreen.height * offscreen.width; ptr+=4, pixel++){
                        let r = enemy_data[ptr];
                        let g = enemy_data[ptr + 1];
                        let b = enemy_data[ptr + 2];
                        let a = enemy_data[ptr + 3];
                        if(0<r || 0<g || 0<b || 0<a){
                            let canvas_ptr = (offset + (Math.floor(pixel/offscreen.width) * canvas.width) + Math.floor(pixel % offscreen.width))*4;
                            saved[canvas_ptr + 3] = a * darkness_coeff;
                        }
                    }
                    const data = new ImageData(saved, canvas.width, canvas.height)
                    ctx.putImageData(data, 0, 0);
                }
            }
        };
    }
}
function update_enemies(ctime, delta){
    const Player = STATE.Player;
    const LOCK_RANGE = 2;
    const FIRE_RANGE = 1.5;
    Player.hurt = false;
    for(let e of STATE.Enemy){
        e.update_sprite(delta);
        if(e.mode == "DIE" || e.dead) continue;
        if(e.dead) continue;

        e.dist_sq_from_player = e.pos.dist_sq(Player.position);
        if(e.dist_sq_from_player < LOCK_RANGE * LOCK_RANGE){
            const p_to_e_vector = Player.position.sub(e.pos).normalize();
            const p_to_e_ray = cast_ray(Player.position, p_to_e_vector.scale(-1)); 
            if(Player.position.dist_sq(e.pos) < p_to_e_ray.dist*p_to_e_ray.dist){
                e.dir_vector = p_to_e_vector;
                if(e.dist_sq_from_player < FIRE_RANGE * FIRE_RANGE){
                    if(e.mode != "FIRE"){
                        e.frame_counter = 0;
                        e.mode = "FIRE"
                    }
                }
                else if(e.mode != "WALK"){
                    e.reach = Player.position;
                    e.mode = "WALK"
                    e.frame_counter = 0;
                    e.speed = e.locked_speed;
                }
            }
            else if(e.mode != "IDLE"){
                e.mode = "IDLE";
                const duration = 0 *  1000;
                e.next_walk_start = ctime + duration;
                e.frame_counter = 0;
            }
        }
        else{
            if(e.mode == "IDLE" && e.next_walk_start < ctime){
                e.mode = "WALK"
                e.speed = e.wandering_speed;
                e.dir += Math.random() * 2 * Math.PI;
                e.update_dir_vector()
                let res = cast_ray(e.pos, e.dir_vector);
                e.reach = e.pos.add(e.dir_vector.scale(Math.random() * res.dist));
                e.frame_counter = 0;
            }
            if(e.mode == "WALK"){
                if(e.pos.dist_sq(e.reach) < 0.25){
                    e.mode = "IDLE";
                    const duration = Math.floor(Math.random() * 5) *  1000;
                    e.next_walk_start = ctime + duration;
                    e.frame_counter = 0;
                }
            }
        }
        if(e.mode == "WALK"){
            const next_pos = e.pos.add(e.dir_vector.scale(e.speed/100));
            if(!STATE.Scene[Math.floor(next_pos.y)][Math.floor(next_pos.x)]) e.pos = next_pos;
        }
        if(e.mode == "FIRE"){
            Player.hurt = true;
        }
    }
    STATE.Enemy = STATE.Enemy.sort((a,b) => b.dist_sq_from_player - a.dist_sq_from_player);
}
function handle_fire(ctime){
    const Player = STATE.Player;
    const weapon = WEAPONS[Player.weapon]; 
    const shot_width = 0.1;
    const a = Player.dir_vector.add(Player.plane.scale(-shot_width));
    const c = Player.dir_vector.add(Player.plane.scale(shot_width));
    const range_sq = weapon.range * weapon.range;
    if(Player.state == "Fire" && Player.can_fire){
        for(let i = STATE.Enemy.length - 1; 0 <= i; --i){
            const e = STATE.Enemy[i];
            if(range_sq < e.dist_sq_from_player) break;
            if(e.mode == "DIE" || e.dead) continue;

            const p_to_e = e.pos.sub(Player.position);
            if(a.cross(p_to_e) * a.cross(c) >= 0 && c.cross(p_to_e) * c.cross(a) >= 0) {
                const p_to_e_ray = cast_ray(Player.position, p_to_e); 
                const p_e_dist_sq = e.dist_sq_from_player; 
                if(p_e_dist_sq < p_to_e_ray.dist * p_to_e_ray.dist){
                    const reduce_hp = Math.floor(((weapon.attack * (range_sq - p_e_dist_sq))/(range_sq)));
                    e.hp -= Math.min(e.hp, reduce_hp);
                    e.hurt = true;
                    if(e.hp <= 0) {
                        e.mode = "DIE";
                        e.frame_counter = 0;
                    }
                }
            }

        }
        // DECREMENT AVAIL BULLETS;
        BULLETS[Player.weapon][0]--;
        if(BULLETS[Player.weapon][0] <= 0){
            BULLETS[Player.weapon][0] = BULLETS[Player.weapon][1];
            // RELOAD HERE;
            Player.state = "Reload";
            Player.weapon_sprite_index = 0;
            Player.speed = Player.gun_arm_speed;
        }
        Player.can_fire = false;
        Player.cant_fire_until = ctime + weapon.rof * 1000; 
    }
}
function show_end_screen(){
    const screen_padd = 20;
    ctx.fillStyle = 'rgb(20, 0, 20, 0.7)';
    ctx.fillRect(screen_padd, screen_padd, canvas.width - screen_padd * 2, canvas.height - screen_padd * 2);  

    ctx.fillStyle = `rgba(255, 0, 255)`;
    ctx.font = `bold 20px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(STATE.message, canvas.width/2, canvas.height/2);
}
function render_player(){
    const Player = STATE.Player;
    if(Player.hurt){
        const hurt = TEXTURES.Hurt[Player.hurt_frame_counter++ % TEXTURES.Hurt.length].img;
        ctx.drawImage(hurt, 0, 0, hurt.width, hurt.height, 0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = "rgba(255, 0, 0, 0.4)"      
    ctx.fillRect(0, 80, 15, canvas.height - 80)

    const h = canvas.height - 80;
    const fill_px = (h * Player.hp)/100;
    ctx.fillStyle = "rgba(200, 0, 0, 1)"      
    ctx.fillRect(0, 80 + h - fill_px, 15, fill_px)
}
function update_player(ctime, delta){
    const Player = STATE.Player;
    delta /= 1000;
    let new_pos;

    if(["keya", "keyd", "keyw", "keys"].map((key) => STATE.keys[key]).some(Boolean)) 
        Player.bob_time += Player.bob_speed * delta;
    for([key, value] of Object.entries(STATE.keys)){
        if(Player.turn){
            Player.dir -= Player.turn * delta * 60;
            Player.plane = Player.plane.rotate(Player.turn * delta * -60);
            Player.turn = false;
        }
        Player.dir_vector = new Vector2(Math.cos(Player.dir), Math.sin(Player.dir));
        if(key == "keyw" && value){
            new_pos = Player.position.add(Player.dir_vector.scale(Player.speed * 60 * delta))
        }
        if(key == "keys" && value){
            new_pos = Player.position.sub(Player.dir_vector.scale(Player.speed * 60 * delta))
        }
        if(key == "keya" && value){
            new_pos = Player.position.add(Player.dir_vector.rotate(-Math.PI/2).scale(Player.speed * 60 * delta))
        }
        if(key == "keyd" && value){
            new_pos = Player.position.add(Player.dir_vector.rotate(Math.PI/2).scale(Player.speed * 60 * delta))
        }
        if(key == "keyr" && value){
            Player.state = "Reload"
            Player.weapon_sprite_index = 0;
            Player.speed = Player.gun_arm_speed;
        }
        if(key == "keyq" && value){
            Player.state = "Switch"
            Player.weapon_sprite_index = 0;
            Player.speed = Player.gun_arm_speed;
        }
    }
    if(Player.trying_fire){
        if(Player.can_fire || (!Player.can_fire && Player.cant_fire_until < ctime)){
            if(Player.state !== "Fire" && Player.state !== "Reload" && Player.state !== "Switch") Player.weapon_sprite_index = 0;
            if(Player.state !== "Reload" && Player.state !== "Switch"){
                Player.can_fire = true;
                Player.state = "Fire"
                Player.speed = Player.gun_arm_speed;
                // recoil
                const recoil = WEAPONS[Player.weapon].recoil;
                let rand = Math.random()*recoil - recoil/2;
                Player.dir += rand * delta * 60;
                Player.plane = Player.plane.rotate(rand * delta * 60);
                new_pos = Player.position.sub(Player.dir_vector.scale(0.002 * 60 * delta))
            }
        }
    }
    if(new_pos){
        let new_pos_block = new_pos.block_index();
        if(0 <= new_pos.x && 0 <= new_pos.y && new_pos_block.y < ROWS &&  new_pos_block.x < COLS && !STATE.Scene[new_pos_block.y][new_pos_block.x]){
            Player.position = new_pos;
        }
    }
    if(Player.hurt){
        Player.hp -= Math.floor(delta * 20);
        if(Player.hp <= 0){
            STATE.running = false;
            STATE.message = "GAME OVER!";
        }
    }
}
function render_stats(ctime, delta){
    const Player = STATE.Player;
    ctx.font = "15px serif";
    ctx.fillStyle = "#ff0000"; 
    ctx.textAlign = "end";  
    ctx.textBaseline = "top"; 
    const fps = Math.floor(1000/delta);
    const bullet_stats = BULLETS[Player.weapon];
    ctx.fillText(`${bullet_stats[0]} / ${bullet_stats[1]} | FPS: ${fps}`, canvas.width - 2, 2);    

} function game_loop(ctime){
    if(!STATE.running){
        show_end_screen();
        return;
    }
    const delta = ctime - STATE.last_frame;
    ctx.fillStyle = 'rgb(20, 0, 20)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);  
    update_player(ctime, delta)

    // Ray casting
    STATE.ray_hits = [];
    for(let x = 0; x < canvas.width; x++) {
        let res = cast_ray_from_player(x);
        if(res){
            STATE.ray_hits.push(res)
        }
        else {
            throw new Error("Ray casting failed for some reason.")
        }
    }
    update_enemies(ctime, delta)
    update_weapon(ctime, delta)
    handle_fire(ctime);
    render_floor();
    render_walls();
    render_enemies();
    render_player();
    render_weapon(ctime);
    render_stats(ctime, delta);
    minimap(75, 75)
    STATE.last_frame = ctime;
    requestAnimationFrame(game_loop)
}

async function main(){
    for([key, arr] of Object.entries(TEXTURES_COLLECTION)){
        console.log(key)
        TEXTURES_COLLECTION[key] = await Promise.all(arr); 
    }
    TEXTURES.Weapons[WEAPONS[0].name].Idle = TEXTURES_COLLECTION["shotgun-idle"];
    TEXTURES.Weapons[WEAPONS[0].name].Fire = TEXTURES_COLLECTION["shotgun-fire"];
    TEXTURES.Weapons[WEAPONS[0].name].Reload = TEXTURES_COLLECTION["shotgun-reload"];

    TEXTURES.Weapons[WEAPONS[1].name].Idle = TEXTURES_COLLECTION["ar-idle"];
    TEXTURES.Weapons[WEAPONS[1].name].Fire = TEXTURES_COLLECTION["ar-fire"];
    TEXTURES.Weapons[WEAPONS[1].name].Reload = TEXTURES_COLLECTION["ar-reload"];
    TEXTURES.Walls = TEXTURES.Walls.concat(...new Array(4).fill(TEXTURES_COLLECTION["wall"][0]));
    TEXTURES.Walls = TEXTURES.Walls.concat(...new Array(5).fill(TEXTURES_COLLECTION["wall"][1]));
    TEXTURES.Floor = TEXTURES_COLLECTION["floor"][0];
    TEXTURES.Hurt = TEXTURES_COLLECTION["hurt"];
    
    TEXTURES.Enemy["FALLING"] = TEXTURES_COLLECTION["Enemy-FALLING"]
    TEXTURES.Enemy["FIRING"] = TEXTURES_COLLECTION["Enemy-FIRING"]

    for([key, val] of Object.entries(TEXTURES_COLLECTION)){
        if(key.includes("Enemy")){
            // ENEMY-FIRING-SW
            key = key.split("-");
            if(key.length == 3){
                if(!TEXTURES.Enemy[key[1]]) TEXTURES.Enemy[key[1]] = {}
                TEXTURES.Enemy[key[1]][key[2]] = val;
            }
        }
    }
    const floor = TEXTURES.Floor.img;
    const offscreen = document.createElement("canvas");
    offscreen.width = floor.width;
    offscreen.height = floor.height;
    const ctx_off = offscreen.getContext("2d");
    ctx_off.drawImage(floor, 0, 0);
    STATE.floor = ctx_off.getImageData(0, 0, floor.width, floor.height).data;
    STATE = {
        ...STATE,
        Scene: Array(ROWS).fill("").map(()=>Array(COLS).fill(0)),
        Player: new Player(new Vector2(6, 5.5), 0),
        // Player: new Player(new Vector2(Math.random()*10, Math.random()*10), 1e-3),
        ray_hits: [],
    }
    STATE.Scene = [
      [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,7,7,7,7,7,7,7,7],
      [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,7],
      [4,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7],
      [4,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7],
      [4,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,7],
      [4,0,4,0,0,0,0,5,5,5,5,5,5,5,5,5,7,7,0,7,7,7,7,7],
      [4,0,5,0,0,0,0,5,0,5,0,5,0,5,0,5,7,0,0,0,7,7,7,1],
      [4,0,6,0,0,0,0,5,0,0,0,0,0,0,0,5,7,0,0,0,0,0,0,8],
      [4,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,7,7,1],
      [4,0,8,0,0,0,0,5,0,0,0,0,0,0,0,5,7,0,0,0,0,0,0,8],
      [4,0,0,0,0,0,0,5,0,0,0,0,0,0,0,5,7,0,0,0,7,7,7,1],
      [4,0,0,0,0,0,0,5,5,5,5,0,5,5,5,5,7,7,7,7,7,7,7,1],
      [6,6,6,6,6,6,6,6,6,6,6,0,6,6,6,6,6,6,6,6,6,6,6,6],
      [8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
      [6,6,6,6,6,6,0,6,6,6,6,0,6,6,6,6,6,6,6,6,6,6,6,6],
      [4,4,4,4,4,4,0,4,4,4,6,0,6,2,2,2,2,2,2,2,3,3,3,3],
      [4,0,0,0,0,0,0,0,0,4,6,0,6,2,0,0,0,0,0,2,0,0,0,2],
      [4,0,0,0,0,0,0,0,0,0,0,0,6,2,0,0,5,0,0,2,0,0,0,2],
      [4,0,0,0,0,0,0,0,0,4,6,0,6,2,0,0,0,0,0,2,2,0,2,2],
      [4,0,6,0,6,0,0,0,0,4,6,0,0,0,0,0,5,0,0,0,0,0,0,2],
      [4,0,0,5,0,0,0,0,0,4,6,0,6,2,0,0,0,0,0,2,2,0,2,2],
      [4,0,6,0,6,0,0,0,0,4,6,0,6,2,0,0,5,0,0,2,0,0,0,2],
      [4,0,0,0,0,0,0,0,0,4,6,0,6,2,0,0,0,0,0,2,0,0,0,2],
      [4,4,4,4,4,4,4,4,4,4,1,1,1,2,2,2,2,2,2,3,3,3,3,3]
    ];
    COLS = STATE.Scene.length;
    ROWS = STATE.Scene[0].length;
    for(let i = 0; i < 20; ++i){
        let x, y;
        do {
            x = Math.random()*COLS;
            y = Math.random()*ROWS;
        } while(STATE.Scene[Math.floor(y)][Math.floor(x)]);
        STATE.Enemy.push(new Enemy(x, y));
    }
    STATE.start_time = Date.now();
    requestAnimationFrame(game_loop)
};
main();

