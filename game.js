// BEGIN ORIGINAL HEADER
/**
 * Comment free (yay) source code for Left 4k Dead by Markus Persson
 * Please don't reuse any of this code in other projects.
 * http://www.mojang.com/notch/j4k/l4kd/
 */
// END ORIGINAL HEADER

// A Chrome App port of Left 4k Dead. This is the same project as the
// original, yet none of the original code remains.

var MAP_WIDTH = 1024;
var MAP_HEIGHT = 1024;
var SPRITE_COUNT = 18;
var SPRITE_FRAMES = 4;
var SPRITE_ROTATIONS = 16;
var SPRITE_X_SIZE = 12;
var SPRITE_Y_SIZE = 12;
var PIXEL_OUTER_WALL = RGB(0xff, 0xfe, 0xfe);
var PIXEL_NORMAL_WALL = RGB(0xff, 0x80, 0x52);
var PIXEL_INNER_WALL = RGB(0xff, 0xff, 0xff);
var PIXEL_MASK_SPECIAL = RGB(0xff, 0, 0);
//var PIXEL_INFECTED = the random green
var ROOM_COUNT = 70;
var CHARACTER_COUNT = 320;

function RGB(r, g, b) {
  return 0xFF000000 | r | (g << 8) | (b << 16);
}

var Key = {
  _pressed: {},

  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,

  isDown: function(keyCode) {
    return this._pressed[keyCode];
  },

  onKeydown: function(event) {
    this._pressed[event.keyCode] = true;
  },

  onKeyup: function(event) {
    delete this._pressed[event.keyCode];
  }
};

function nextRandomInt(n) {
  return Math.floor(Math.random() * n);
}

function Game() {
  this.pixelSizeX = 1;
  this.pixelSizeY = 1;
  this.canvas = document.getElementById('surface');
  this.canvasWidth = this.canvas.width;
  this.canvasCenterX = this.canvasWidth >> 1;
  this.canvasHeight = this.canvas.height;
  this.canvasCenterY = this.canvasHeight >> 1;
  this.context = this.canvas.getContext('2d');
  this.imageData = this.context.getImageData(0, 0, this.canvasWidth,
    this.canvasHeight);

  var buf = new ArrayBuffer(this.imageData.data.length);
  this.buf8 = new Uint8ClampedArray(buf);
  this.data32 = new Uint32Array(buf);

  var lightmapBuf = new ArrayBuffer(this.canvasWidth * this.canvasHeight);
  this.lightmap = new Uint8ClampedArray(lightmapBuf);

  this.sprites = this.generateSprites();
  this.brightness = this.generateBrightness();

  this.gameStarted = false;
  this.levelStarted = false;

  this.fpsOut = document.getElementById('fps');
}

// https://hacks.mozilla.org/2011/12/faster-canvas-pixel-manipulation-with-typed-arrays/
Game.prototype.drawPixel = function(x, y, r, g, b, a) {
  this.data32[y * this.canvasWidth + x] =
  (a << 24) | (b << 16) | (g <<  8) | r;
};

Game.prototype.generateSprite = function(spriteIndex, pixelIndex, sprites) {
  sprites[pixelIndex++] = Math.random() * 0x00FFFFFF + 0xFF000000;
  return pixelIndex;
};

Game.prototype.generateSprites = function() {
  var buf = new ArrayBuffer(4 * SPRITE_COUNT * SPRITE_FRAMES *
    SPRITE_ROTATIONS * SPRITE_X_SIZE * SPRITE_Y_SIZE);
  sprites = new Uint32Array(buf);

  var pixelIndex = 0;
  for (var i = 0; i < SPRITE_COUNT; ++i) {
    pixelIndex = this.generateSprite(i, pixelIndex, sprites);
  }
  return sprites;
};

Game.prototype.generateMap = function() {
  var buf = new ArrayBuffer(MAP_WIDTH * MAP_HEIGHT * 4);
  var map = new Uint32Array(buf);

  // Fill the map with uneven green color. Put a wall around the perimeter.
  var i = 0;
  for (var y = 0; y < MAP_HEIGHT; ++y) {
    for (var x = 0; x < MAP_WIDTH; ++x) {
      var br = nextRandomInt(32) + 112;
      map[i] = RGB(br / 3, br, 0);
      if (x < 4 || y < 4 || x >= 1020 || y >= 1020) {
        map[i] = PIXEL_OUTER_WALL;
      }
      ++i;
    }
  }

  // Create 70 rooms. Put the player in the 69th, and make the 70th red.
  for (i = 0; i < ROOM_COUNT; ++i) {
    // Create a room that's possibly as big as the level, whose coordinates
    // are clamped to the nearest multiple of 16.
    var w = nextRandomInt(8) + 2;
    var h = nextRandomInt(8) + 2;
    var xm = nextRandomInt(64 - w - 2) + 1;
    var ym = nextRandomInt(64 - h - 2) + 1;

    w *= 16;
    h *= 16;

    w += 5;
    h += 5;
    xm *= 16;
    ym *= 16;

    // Place the player (monsterData[0-15]) in the center of the
    // second-to-last room.
    if (i == ROOM_COUNT - 2) {
      this.characters[0].x = xm + Math.floor(w / 2);
      this.characters[0].y = ym + Math.floor(h / 2);
//      monsterData[MDO_UNKNOWN_15] = 0x808080;
//      monsterData[MDO_UNKNOWN_11] = 1;
}

    // Create a window around the current room coordinates. Why is the first
    // one a width and the second a position?
    xWin0 = xm + 5;
    yWin0 = ym + 5;
    xWin1 = xm + w - 5;
    yWin1 = ym + h - 5;

    for (var y = ym; y < ym + h; y++) {
      for (var x = xm; x < xm + w; x++) {

        // This seems to calculate the thickness of the wall.
        var d = x - xm;
        if (xm + w - x - 1 < d)
          d = xm + w - x - 1;
        if (y - ym < d)
          d = y - ym;
        if (ym + h - y - 1 < d)
          d = ym + h - y - 1;

        // Are we inside the wall, and thus in the room?
        if (d > 4) {
          // Yes, we are. Draw the floor.

          // Vary the color of the floor.
          var br = nextRandomInt(16) + 112;

          // Floor diagonal
          if (((x + y) & 3) == 0) {
            br += 16;
          }

          // Grayish concrete floor
          map[x + y * MAP_WIDTH] = RGB(br * 3 / 3, br * 4 / 4, br * 4 / 4);
        } else {
          // No, we're not. Draw the wall.
          // Orange wall border
          map[x + y * MAP_WIDTH] = PIXEL_NORMAL_WALL;
        }

        if (i == ROOM_COUNT - 1) {
          // Give this room a red tint.
          map[x + y * MAP_WIDTH] &= PIXEL_MASK_SPECIAL;
        }
      }
    }

    // Put two exits in the room.
    for (var j = 0; j < 2; j++) {
      var xGap = nextRandomInt(w - 24) + xm + 5;
      var yGap = nextRandomInt(h - 24) + ym + 5;
      var ww = 5;
      var hh = 5;

      xGap = xGap / 16 * 16 + 5;
      yGap = yGap / 16 * 16 + 5;
      if (nextRandomInt(2) == 0) {
        xGap = xm + (w - 5) * nextRandomInt(2);
        hh = 11;
      } else {
        ww = 11;
        yGap = ym + (h - 5) * nextRandomInt(2);
      }
      for (var y = yGap; y < yGap + hh; y++) {
        for (var x = xGap; x < xGap + ww; x++) {
          // A slightly darker color represents the exit.
          var br = nextRandomInt(32) + 112 - 64;
          map[x + y * MAP_WIDTH] = RGB(br * 3 / 3, br * 4 / 4, br * 4 / 4);
        }
      }
    }
  }

  // Paint the inside of each wall white. This is for wall-collision
  // detection.
  for (var y = 1; y < MAP_WIDTH - 1; ++y) {
    inloop: for (var x = 1; x < MAP_WIDTH - 1; ++x) {
      for (var xx = x - 1; xx <= x + 1; ++xx) {
        for (var yy = y - 1; yy <= y + 1; ++yy) {
          if (this.isWallPixel(map[xx + yy * MAP_WIDTH])) {
            continue inloop;
          }
        }
      }
      map[x + y * MAP_WIDTH] = PIXEL_INNER_WALL;
    }
  }
  return map;
};

Game.prototype.isWallPixel = function(pixel) {
  // Walls have full red.
  return (pixel & 0xff) != 0xff;
};

Game.prototype.generateEnemies = function() {

};

Game.prototype.applyLightmapAndNoise = function() {
  var offset = 0;
  for (var y = 0; y < this.canvasHeight; ++y) {
    for (var x = 0; x < this.canvasWidth; ++x) {
      var noise = Math.floor(nextRandomInt(16) * nextRandomInt(16) / 16);

      if (!this.gameStarted)
        noise *= 4;

      var light = this.lightmap[offset];
      this.lightmap[offset] = 0;

      var pixel = this.data32[offset];
      var r = (pixel & 0xff) * light / 255 + noise;
      if (r > 255) r = 255;
      var g = ((pixel >> 8) & 0xff) * light / 255 + noise;
      if (g > 255) g = 255;
      var b = ((pixel >> 16) & 0xff) * light / 255 + noise;
      if (b > 255) b = 255;

      // r = r * (255 - hurtTime) / 255 + hurtTime;
      // g = g * (255 - bonusTime) / 255 + bonusTime;
      this.data32[offset] = RGB(r, g, b);
      ++offset;
    }
    // if (y % 2 == 0 && (y >= damage && y < 220)) {
    //   for (var x = 232; x < 238; x++) {
    //     pixels[y * 240 + x] = 0x800000;
    //   }
    // }
    // if (y % 2 == 0 && (y >= ammo && y < 220)) {
    //   for (var x = 224; x < 230; x++) {
    //     pixels[y * 240 + x] = 0x808000;
    //   }
    // }
    // if (y % 10 < 9 && (y >= clips && y < 220)) {
    //   for (var x = 221; x < 222; x++) {
    //     pixels[y * 240 + 221] = 0xffff00;
    //   }
    // }
  }

};

Game.prototype.drawBuffer = function() {
  this.imageData.data.set(this.buf8);
  this.context.putImageData(this.imageData, 0, 0);
};

Game.prototype.startGame = function() {
  this.level = 0;
  return true;
};

Game.prototype.startLevel = function() {
  ++this.level;
  this.characters = [];
  for (var i = 0; i < CHARACTER_COUNT; ++i) {
    this.characters.push(new Character());
  }
  this.map = this.generateMap();
  this.generateEnemies();
  this.tick = 0;
  return true;
};

Game.prototype.movePlayer = function() {
  if (Key.isDown(Key.UP)) {
    --this.characters[0].y;
  }
  if (Key.isDown(Key.LEFT)) {
    --this.characters[0].x;
  }
  if (Key.isDown(Key.DOWN)) {
    ++this.characters[0].y;
  }
  if (Key.isDown(Key.RIGHT)) {
    ++this.characters[0].x;
  }

  this.shootDir = this.playerDir + (nextRandomInt(100) -
    nextRandomInt(100)) / 20;
  var cos = Math.cos(-this.shootDir);
  var sin = Math.sin(-this.shootDir);

  var closestHitDist = this.calculateClosestHitDistance(cos, sin);
};

Game.prototype.calculateClosestHitDistance = function(cos, sin) {
  var closestHitDist = 0;
  for (var j = 0; j < 250; j++) {  // TODO(miket): why not 240?
    var xm = this.characters[0].x + Math.floor(cos * j / 2);
    var ym = this.characters[0].y - Math.floor(sin * j / 2);
    if (this.map[(xm + ym * 1024) & (1024 * 1024 - 1)] == PIXEL_NORMAL_WALL)
      break;
    closestHitDist = j / 2;
  }
  return closestHitDist;
};

Game.prototype.generateOneLightmapBeam = function(xt, yt) {

  // Figure out how far the current beam is from the player's view.
  // In radians, not degrees, but same idea -- if the player is looking
  // 180 degrees south, and this beam is pointing 270 degrees west,
  // then the answer is 90 degrees (in radians).
  //
  // Clamp to a circle (2 x pi).
  var dd = Math.atan2(yt, xt) - this.playerDir;
  if (dd < -Math.PI)
    dd += Math.PI * 2;
  if (dd >= Math.PI)
    dd -= Math.PI * 2;

  // This calculation is weird because of the 1- and the *255. It seems
  // arbitrary. Maybe it is. brr is probably supposed to stand for
  // something like "brightness times radius squared." This is for creating a
  // flashlight effect in front of the player.
  var brr = Math.floor((1 - dd * dd) * 255);

  var dist = this.canvasCenterX;
  if (brr < 0) {
    // Cut off the flashlight past a certain angle, but for better
    // playability leave a small halo going all the way around the player.
    brr = 0;
    dist = 32;
  }
  // At the start of the level, fade in the light gradually.
  brr = brr * this.tickMultiplier;

  for (var j = 0; j < dist; j++) {
    // Loop through the beam's pixels one fraction of the total distance
    // each iteration. This is very slightly inefficient because in some
    // cases we'll calculate the same pixel twice.
    var xx = Math.floor(xt * j / this.canvasCenterX + this.canvasCenterX);
    var yy = Math.floor(yt * j / this.canvasCenterY + this.canvasCenterY);
    var xm = Math.floor(xx + this.characters[0].x - this.canvasCenterX);
    var ym = Math.floor(yy + this.characters[0].y - this.canvasCenterY);

    if (this.map[(xm + ym * MAP_WIDTH) & (MAP_WIDTH * MAP_WIDTH - 1)] ==
      PIXEL_OUTER_WALL) {
      break;
  }

    // Do an approximate distance calculation. I'm not sure why this
    // couldn't have been built into the brightness table, which would let
    // us easily index using j.
    var xd = Math.floor((xx - this.canvasCenterX) * 256 / this.canvasCenterX);
    var yd = Math.floor((yy - this.canvasCenterY) * 256 / this.canvasCenterY);

    var ddd = Math.floor((xd * xd + yd * yd) / 256);
    var br = Math.floor(this.brightness[ddd] * brr / 255);

    if (ddd < 16) {
      var tmp = Math.floor(128 * (16 - ddd) / 16);
      br = br + tmp * (255 - br) / 255;
    }

    this.lightmap[xx + yy * this.canvasWidth] = br;
  }
}

Game.prototype.generateLightmap = function() {
  this.tickMultiplier = 1;
  if (this.tick < 60)
    this.tickMultiplier = this.tick / 60;

  for (var y = -this.canvasCenterY + 1; y < this.canvasCenterY; ++y) {
    this.generateOneLightmapBeam(-this.canvasCenterX, y);
  }
  for (var x = -this.canvasCenterX + 1; x < this.canvasCenterX; ++x) {
    this.generateOneLightmapBeam(x, -this.canvasCenterY + 1);
  }
  for (var y = -this.canvasCenterY + 1; y < this.canvasCenterY; ++y) {
    this.generateOneLightmapBeam(this.canvasCenterX - 1, y);
  }
  for (var x = -this.canvasCenterX + 1; x < this.canvasCenterX; ++x) {
    this.generateOneLightmapBeam(x, this.canvasCenterY - 1);
  }
};

Game.prototype.drawMap = function(camX, camY) {
  var pixelIndex = 0;
  var xm = camX - this.canvasCenterX;
  for (var y = 0; y < this.canvasHeight; ++y) {
    var ym = y + camY - this.canvasCenterY;
    for (var x = 0; x < this.canvasWidth; ++x) {
      this.data32[pixelIndex++] = (this.map[(x + xm + ym * MAP_WIDTH) &
        (MAP_WIDTH * MAP_HEIGHT - 1)]);
    }
  }
};

Game.prototype.moveMonsters = function() {

};

Game.prototype.loop = function() {
  if (!this.gameStarted) {
    this.gameStarted = this.startGame();
  }
  if (this.gameStarted) {
    if (!this.levelStarted) {
      this.levelStarted = this.startLevel();
    }
    this.movePlayer();
    this.generateLightmap();
    this.drawMap(this.characters[0].x, this.characters[0].y);
    this.moveMonsters();
  }
  this.applyLightmapAndNoise();
  this.drawBuffer();
  ++this.tick;
  this.updateFPS();
};

Game.prototype.startFPS = function() {
  // http://stackoverflow.com/a/5079147/344467
  this.fps = 0;
  this.now = new Date;
  this.lastUpdate = (new Date) * 1 - 1;

  var game = this;
  setInterval(function() {
    game.fpsOut.innerHTML = game.fps.toFixed(1) + " fps";
  }, 1000);
};

Game.prototype.updateFPS = function() {
  var FPS_FILTER = 50;
  var thisFrameFPS = 1000 / ((this.now = new Date) - this.lastUpdate);
  this.fps += (thisFrameFPS - this.fps) / FPS_FILTER;
  this.lastUpdate = this.now;
};

Game.prototype.generateBrightness = function() {
  var buf = new ArrayBuffer(512);
  var brightness = new Uint8ClampedArray(buf);
  var offs = 30.0;
  for (var i = 0; i < 512; i++) {
    brightness[i] = Math.floor(255.0 * offs / (i + offs));
    if (i < 4) {
      brightness[i] = brightness[i] * i / 4;
    }
  }
  return brightness;
};

Game.prototype.start = function() {
  var game = this;
  this.playerDir = 0;

  // http://nokarma.org/2011/02/27/javascript-game-development-keyboard-input/
  window.addEventListener('keyup', function(event) {
    Key.onKeyup(event); }, false);
  window.addEventListener('keydown', function(event) {
    Key.onKeydown(event); }, false);
  this.canvas.addEventListener('mousemove', function(e) {
    // Divide by two because we have pixel-doubled the canvas.
    var y = e.pageY / 2 - game.canvasCenterY;
    var x = e.pageX / 2 - game.canvasCenterX;
    game.playerDir = Math.atan2(y, x);
  }, false);

  game.startFPS();
  (function animationLoop(){
    window.requestAnimationFrame(animationLoop);
    game.loop();
  })();
};

window.onload = function() {
  new Game().start();
};
