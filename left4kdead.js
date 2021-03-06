/**
 * Comment free (yay) source code for Left 4k Dead by Markus Persson
 * Please don't reuse any of this code in other projects.
 * http://www.mojang.com/notch/j4k/l4kd/
 */

// A Chrome Packaged App port of Left 4k Dead. This is the same project as
// the original, yet none of the original code remains.

var Key = {
  _pressed: {},

  MOUSE: 1,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  RELOAD: 82,

  isDown: function(keyCode) {
    return this._pressed[keyCode];
  },

  unpress: function(code) {
    delete this._pressed[code];
  },

  onKeydown: function(event) {
    this._pressed[event.keyCode] = true;
  },

  onKeyup: function(event) {
    delete this._pressed[event.keyCode];
  },

  onMouseDown: function(event) {
    this._pressed[Key.MOUSE] = true;
  },

  onMouseUp: function(event) {
    delete this._pressed[Key.MOUSE];
  }
};

function randomNextInt(n) {
  return Math.floor(Math.random() * n);
}

function RGB(r, g, b) {
  // Many thanks to Erik Arvidsson for explaining the >>> 0 trick to
  // convert back to a Uint32.
  return (r | (g << 8) | (b << 16) | (0xFF << 24)) >>> 0;
}

function R(pixel) {
  return pixel & 0xff;
}

function G(pixel) {
  return (pixel >> 8) & 0xff;
}

function B(pixel) {
  return (pixel >> 16) & 0xff;
}

function Left4kDead() {
  var left4kDead = this;
  /*double*/ left4kDead.playerDir = 0.0;

  left4kDead.startFPS();

  var canvas = document.getElementById('surface');
  var context = canvas.getContext('2d');
  var imageData = context.getImageData(0, 0, 240, 240);

  context.font = "12px Verdana";
  context.fillStyle = "yellow";

  // http://nokarma.org/2011/02/27/javascript-game-development-keyboard-input/
  window.addEventListener('keyup', function(event) {
    Key.onKeyup(event); }, false);
  window.addEventListener('keydown', function(event) {
    Key.onKeydown(event); }, false);
  window.addEventListener('mouseup', function(event) {
    Key.onMouseUp(event); }, false);
  window.addEventListener('mousedown', function(event) {
    Key.onMouseDown(event); }, false);
  canvas.addEventListener('mousemove', function(e) {
    // Divide by two because we have pixel-doubled the canvas.
    var y = (e.pageY >> 1) - 120;
    var x = (e.pageX >> 1) - 120;
    left4kDead.playerDir = Math.atan2(y, x);
  }, false);

  var buf = new ArrayBuffer(imageData.data.length);
  var buf8 = new Uint8ClampedArray(buf);
  var pixels = new Uint32Array(buf);

  var lightmapBuf = new ArrayBuffer(240 * 240);
  var lightmap = new Uint8ClampedArray(lightmapBuf);

  /* Math.seedrandom();  TODO: too slow! */
  buf = new ArrayBuffer(18 * 4 * 16 * 12 * 12 * 4);
  var sprites = new Uint32Array(buf);
  var pix = 0;
  for (/*int*/ var i = 0; i < 18; i++) {
    /*int*/ var skin = RGB(0xFF, 0x99, 0x93);
    /*int*/ var clothes = RGB(0xFF, 0xff, 0xff);

    if (i > 0) {
      skin = RGB(0xa0, 0xff, 0x90);
      clothes = RGB(randomNextInt(255) & 0x7f, randomNextInt(255) & 0x7f,
        randomNextInt(255) & 0x7f);
    }
    for (/*int*/ var t = 0; t < 4; t++) {
      for (/*int*/ var d = 0; d < 16; d++) {
        var dir = d * Math.PI * 2 / 16.0;

        if (t == 1)
          dir += 0.5 * Math.PI * 2 / 16.0;
        if (t == 3)
          dir -= 0.5 * Math.PI * 2 / 16.0;

        // if (i == 17)
        // {
        // dir = d * Math.PI * 2 / 64;
        // }

        var cos = Math.cos(dir);
        var sin = Math.sin(dir);

        for (var y = 0; y < 12; y++) {
          var col = RGB(0, 0, 0);
          for (var x = 0; x < 12; x++) {
            /*int*/ var xPix = Math.floor(cos * (x - 6) + sin * (y - 6) + 6.5);
            /*int*/ var yPix = Math.floor(cos * (y - 6) - sin * (x - 6) + 6.5);

            if (i == 17) {
              if (xPix > 3 && xPix < 9 && yPix > 3 && yPix < 9) {
                col = RGB(0xff, (t & 1) * 0xff, 0);
              }
            } else {
              if (t == 1 && xPix > 1 && xPix < 4 && yPix > 3 && yPix < 8)
                col = skin;
              if (t == 3 && xPix > 8 && xPix < 11 && yPix > 3 && yPix < 8)
                col = skin;

              if (xPix > 1 && xPix < 11 && yPix > 5 && yPix < 8) {
                col = clothes;
              }
              if (xPix > 4 && xPix < 8 && yPix > 4 && yPix < 8) {
                col = skin;
              }
            }
            sprites[pix++] = col;
            if (R(col) > 1 || G(col) > 1 || B(col) > 1) {
              col = RGB(0, 0, 1);
            } else {
              col = RGB(0, 0, 0);
            }
          }
        }
      }
    }
  }

  /*int*/ var score = 0;
  /*int*/ var hurtTime = 0;
  /*int*/ var bonusTime = 0;
  /*int*/ var xWin0 = 0;
  /*int*/ var yWin0 = 0;
  /*int*/ var xWin1 = 0;
  /*int*/ var yWin1 = 0;

  /* Start label restart */
  /*boolean*/ var gameStarted;
  /*int*/ var level;
  /*int*/ var shootDelay;
  /*int*/ var rushTime;
  /*int*/ var damage;
  /*int*/ var ammo;
  /*int*/ var clips;
  var needsWinLevel;

  /* Start label winLevel */
  /*int*/ var tick;
  var map;
  var monsterData;
  var lightmap;
  var brightness;

  var needsRestart = true;
  var left4kDead = this;
  function loop() {

    if (needsRestart) {
      needsRestart = false;
      gameStarted = false;
      level = 0;
      shootDelay = 0;
      rushTime = 150;
      damage = 20;
      ammo = 20;
      clips = 20;
      needsWinLevel = true;
    }

    if (needsWinLevel) {
      needsWinLevel = false;

      tick = 0;
      level++;
      var buf = new ArrayBuffer(1024 * 1024 * 4);
      map = new Uint32Array(buf);
      /* Math.seedrandom(14329 + level); TODO: too slow! */

      var buf = new ArrayBuffer(320 * 16 * 4);
      monsterData = new Uint32Array(buf);
      {
        /*int*/ var i = 0;
        for (/*int*/ var y = 0; y < 1024; y++)
          for (/*int*/ var x = 0; x < 1024; x++) {
            /*int*/ var br = randomNextInt(32) + 112;
            map[i] = RGB(br / 3, br, 0);
            if (x < 4 || y < 4 || x >= 1020 || y >= 1020) {
              map[i] = RGB(0xFF, 0xFE, 0xFE);
            }
            i++;
          }

        for (i = 0; i < 70; i++) {
          /*int*/ var w = randomNextInt(8) + 2;
          /*int*/ var h = randomNextInt(8) + 2;
          /*int*/ var xm = randomNextInt(64 - w - 2) + 1;
          /*int*/ var ym = randomNextInt(64 - h - 2) + 1;

          w *= 16;
          h *= 16;

          w += 5;
          h += 5;
          xm *= 16;
          ym *= 16;

          if (i == 68) {
            monsterData[0] = xm + w >> 1;
            monsterData[1] = ym + h >> 1;
            monsterData[15] = RGB(0x80, 0x80, 0x80);
            monsterData[11] = 1;
          }

          xWin0 = xm + 5;
          yWin0 = ym + 5;
          xWin1 = xm + w - 5;
          yWin1 = ym + h - 5;
          for (/*int*/ var y = ym; y < ym + h; y++)
            for (/*int*/ var x = xm; x < xm + w; x++) {
              /*int*/ var d = x - xm;
              if (xm + w - x - 1 < d)
                d = xm + w - x - 1;
              if (y - ym < d)
                d = y - ym;
              if (ym + h - y - 1 < d)
                d = ym + h - y - 1;

              map[x + y * 1024] = RGB(0xFF, 0x80, 0x52);
              if (d > 4) {
                /*int*/ var br = randomNextInt(16) + 112;
                if (((x + y) & 3) == 0) {
                  br += 16;
                }
                map[x + y * 1024] = RGB(br * 3 / 3, (br * 4) >> 2, (br * 4) >> 2);
              }
              if (i == 69) {
                map[x + y * 1024] &= RGB(0xff, 0x00, 0x00);
              }
            }

          for (/*int*/ var j = 0; j < 2; j++) {
            /*int*/ var xGap = randomNextInt(w - 24) + xm + 5;
            /*int*/ var yGap = randomNextInt(h - 24) + ym + 5;
            /*int*/ var ww = 5;
            /*int*/ var hh = 5;

            xGap = (xGap >> 4) * 16 + 5;
            yGap = (yGap >> 4) * 16 + 5;
            if (randomNextInt(2) == 0) {
              xGap = xm + (w - 5) * randomNextInt(2);
              hh = 11;
            } else {
              ww = 11;
              yGap = ym + (h - 5) * randomNextInt(2);
            }
            for (/*int*/ var y = yGap; y < yGap + hh; y++)
              for (/*int*/ var x = xGap; x < xGap + ww; x++) {
                /*int*/ var br = randomNextInt(32) + 112 - 64;
                map[x + y * 1024] = RGB(br * 3 / 3, (br * 4) >> 2, (br * 4) >> 2);
              }
          }
        }

        for (/*int*/ var y = 1; y < 1024 - 1; y++)
          inloop: for (/*int*/ var x = 1; x < 1024 - 1; x++) {
            for (/*int*/ var xx = x - 1; xx <= x + 1; xx++)
              for (/*int*/ var yy = y - 1; yy <= y + 1; yy++)
                if (R(map[xx + yy * 1024]) < 0xff)
                  continue inloop;

            map[x + y * 1024] = RGB(0xff, 0xff, 0xff);
          }
      }

      var buf = new ArrayBuffer(240 * 240 * 4);
      lightmap = new Uint32Array(buf);
      var buf = new ArrayBuffer(512 * 4);
      brightness = new Uint32Array(buf);

      /*double*/ var offs = 30;
      for (/*int*/ var i = 0; i < 512; i++) {
        brightness[i] = Math.floor(255.0 * offs / (i + offs));
        if (i < 4)
          brightness[i] = (brightness[i] * i) >> 2;
      }

      /* Math.seedrandom();  TODO: too slow! */
    }

    if (gameStarted) {
      tick++;
      rushTime++;

      if (rushTime >= 150) {
        rushTime = -randomNextInt(2000);
      }
      // Move player (moved to event listener)

      /*double*/ var shootDir = left4kDead.playerDir
          + (randomNextInt(100) - randomNextInt(100)) / 100.0 * 0.2;
      /*double*/ var cos = Math.cos(-shootDir);
      /*double*/ var sin = Math.sin(-shootDir);

      /*int*/ var xCam = monsterData[0];
      /*int*/ var yCam = monsterData[1];

      for (/*int*/ var i = 0; i < 960; i++) {
        /*int*/ var xt = i % 240 - 120;
        /*int*/ var yt = (Math.floor(i / 240) % 2) * 239 - 120;

        if (i >= 480) {
          /*int*/ var tmp = xt;
          xt = yt;
          yt = tmp;
        }

        /*double*/ var dd = Math.atan2(yt, xt) - left4kDead.playerDir;
        if (dd < -Math.PI)
          dd += Math.PI * 2;
        if (dd >= Math.PI)
          dd -= Math.PI * 2;

        /*int*/ var brr = Math.floor((1 - dd * dd) * 255);

        /*int*/ var dist = 120;
        if (brr < 0) {
          brr = 0;
          dist = 32;
        }
        if (tick < 60)
          brr = Math.floor(brr * tick / 60);

        /*int*/ var j = 0;
        for (; j < dist; j++) {
          /*int*/ var xx = Math.floor(xt * j / 120) + 120;
          /*int*/ var yy = Math.floor(yt * j / 120) + 120;
          /*int*/ var xm = xx + xCam - 120;
          /*int*/ var ym = yy + yCam - 120;

          if (map[(xm + ym * 1024) & (1024 * 1024 - 1)] == RGB(0xff, 0xff, 0xff))
            break;

          /*int*/ var xd = Math.floor((xx - 120) * 256 / 120);
          /*int*/ var yd = Math.floor((yy - 120) * 256 / 120);

          /*int*/ var ddd = (xd * xd + yd * yd) >> 8;
          /*int*/ var br = Math.floor(brightness[ddd] * brr / 255);

          if (ddd < 16) {
            /*int*/ var tmp = Math.floor((128 * (16 - ddd)) >> 4);
            br = br + Math.floor(tmp * (255 - br) / 255);
          }

          lightmap[xx + yy * 240] = br;
        }
      }
      var pixp = 0;
      for (/*int*/ var y = 0; y < 240; y++) {
        /*int*/ var xm = xCam - 120;
        /*int*/ var ym = y + yCam - 120;
        var yMapOff = ym * 1024;
        for (/*int*/ var x = 0; x < 240; x++) {
          pixels[pixp++] = map[(xm + yMapOff++) & (1024 * 1024 - 1)];
        }
      }

      /*int*/ var closestHitDist = 0;
      for (/*int*/ var j = 0; j < 250; j++) {
        /*int*/ var xm = xCam + Math.floor((cos * j) >> 1);
        /*int*/ var ym = yCam - Math.floor((sin * j) >> 1);
        if (map[(xm + ym * 1024) & (1024 * 1024 - 1)] == RGB(0xff, 0xff, 0xff))
          break;
        closestHitDist = j >> 1;
      }

      /*boolean*/ var shoot = shootDelay-- < 0 && Key.isDown(Key.MOUSE);

      {
        /*int*/ var closestHit = 0;

        nextMonster: for (/*int*/ m = 0; m < 256 + 16; ++m) {
          /*int*/ var mOff = m * 16;
          /*int*/ var xPos = monsterData[mOff + 0];
          /*int*/ var yPos = monsterData[mOff + 1];
          if (monsterData[mOff + 11] == 0) {
            xPos = (randomNextInt(62) + 1) * 16 + 8;
            yPos = (randomNextInt(62) + 1) * 16 + 8;

            /*int*/ var xd = xCam - xPos;
            /*int*/ var yd = yCam - yPos;

            if (xd * xd + yd * yd < 180 * 180) {
              xPos = 1;
              yPos = 1;
            }

            if (map[xPos + yPos * 1024] != RGB(0xFF, 0xFF, 0xFF)
                && map[xPos + yPos * 1024] != RGB(0xFF, 0xFF, 0xFE)
                && (m <= 128 || rushTime > 0 || (m > 255 && tick == 1))) {
              monsterData[mOff + 0] = xPos;
              monsterData[mOff + 1] = yPos;
              monsterData[mOff + 15] = map[xPos + yPos * 1024];
              map[xPos + yPos * 1024] = RGB(0xff, 0xff, 0xfe);
              monsterData[mOff + 9] = (rushTime > 0 ||
                randomNextInt(3) == 0) ? 127 : 0;
              monsterData[mOff + 11] = 1;
              monsterData[mOff + 2] = m & 15;
            } else {
              continue;
            }
          } else {
            /*int*/ var xd = xPos - xCam;
            /*int*/ var yd = yPos - yCam;

            if (m >= 255) {
              if (xd * xd + yd * yd < 8 * 8) {
                map[xPos + yPos * 1024] = monsterData[mOff + 15];
                monsterData[mOff + 11] = 0;
                bonusTime = 120;
                if ((m & 1) == 0) {
                  damage = 20;
                } else {
                  clips = 20;
                }
                continue;
              }
            } else if (xd * xd + yd * yd > 340 * 340) {
              map[xPos + yPos * 1024] = monsterData[mOff + 15];
              monsterData[mOff + 11] = 0;
              continue;
            }
          }

          /*int*/ var xm = xPos - xCam + 120;
          /*int*/ var ym = monsterData[mOff + 1] - yCam + 120;

          /*int*/ var d = monsterData[mOff + 2];
          if (m == 0) {
            d = ((Math.floor(left4kDead.playerDir / (Math.PI * 2) * 16 + 4.5 + 16)) & 15);
          }

          d += ((monsterData[mOff + 3] >> 2) & 3) * 16;

          /*int*/ var p = (0 * 16 + d) * 144;
          if (m > 0) {
            p += ((m & 15) + 1) * 144 * 16 * 4;
          }

          if (m > 255) {
            p = (17 * 4 * 16 + ((m & 1) * 16 + (tick & 15))) * 144;
          }

          for (/*int*/ var y = ym - 6; y < ym + 6; y++) {
            var pp = y * 240;
            for (/*int*/ var x = xm - 6; x < xm + 6; x++) {
              /*int*/ var c = sprites[p++];
              var c_rgb = c & 0xffffff;
              if (c_rgb > 0 && x >= 0 && y >= 0 && x < 240 && y < 240) {
                pixels[x + pp] = c;
              }
            }
          }

          /*boolean*/ var moved = false;

          if (monsterData[mOff + 10] > 0) {
            monsterData[mOff + 11] += randomNextInt(3) + 1;
            monsterData[mOff + 10] = 0;

            /*double*/ var rot = 0.25;
            /*int*/ var amount = 8;
            /*double*/ var poww = 32;

            if (monsterData[mOff + 11] >= 2 + level) {
              rot = Math.PI * 2;
              amount = 60;
              poww = 16;
              map[(xPos) + (yPos) * 1024] = RGB(0xa0, 0x00, 0x00);
              monsterData[mOff + 11] = 0;
              score += level;
            }
            for (/*int*/ var i = 0; i < amount; i++) {
              /*double*/ var pow = (randomNextInt(100) * randomNextInt(100))
                  * poww / 10000 + 4;
              /*double*/ var dir = (randomNextInt(100) - randomNextInt(100)) / 100.0 * rot;
              /*double*/ var xdd = (Math.cos(left4kDead.playerDir + dir) * pow)
                  + randomNextInt(4) - randomNextInt(4);
              /*double*/ var ydd = (Math.sin(left4kDead.playerDir + dir) * pow)
                  + randomNextInt(4) - randomNextInt(4);
              /*int*/ var col = (randomNextInt(128) + 120);
              bloodLoop: for (/*int*/ var j = 2; j < pow; j++) {
                /*int*/ var xd = Math.floor(xPos + xdd * j / pow);
                /*int*/ var yd = Math.floor(yPos + ydd * j / pow);
                /*int*/ var pp = ((xd) + (yd) * 1024) & (1024 * 1024 - 1);
                if (R(map[pp]) == 0xFF)
                  break bloodLoop;
                if (randomNextInt(2) != 0) {
                  map[pp] = RGB(col, 0, 0);
                  col = col * 8 / 9;
                }
              }
            }

            continue nextMonster;
          }

          /*int*/ var xPlayerDist = xCam - xPos;
          /*int*/ var yPlayerDist = yCam - yPos;

          if (m <= 255) {
            /*double*/ var rx = -(cos * xPlayerDist - sin * yPlayerDist);
            /*double*/ var ry = cos * yPlayerDist + sin * xPlayerDist;

            if (rx > -6 && rx < 6 && ry > -6 && ry < 6 && m > 0) {
              damage++;
              hurtTime += 20;
            }
            if (rx > -32 && rx < 220 && ry > -32 && ry < 32
                && randomNextInt(10) == 0) {
              monsterData[mOff + 9]++;
            }
            if (rx > 0 && rx < closestHitDist && ry > -8 && ry < 8) {
              closestHitDist = Math.floor(rx);
              closestHit = m;
            }

            dirLoop: for (/*int*/ var i = 0; i < 2; i++) {
              /*int*/ var xa = 0;
              /*int*/ var ya = 0;
              xPos = monsterData[mOff + 0];
              yPos = monsterData[mOff + 1];

              if (m == 0) {
                if (Key.isDown(Key.LEFT))
                  xa--;
                if (Key.isDown(Key.RIGHT))
                  xa++;
                if (Key.isDown(Key.UP))
                  ya--;
                if (Key.isDown(Key.DOWN))
                  ya++;
              } else {
                if (monsterData[mOff + 9] < 8)
                  continue nextMonster;

                if (monsterData[mOff + 8] != 12) {
                  xPlayerDist = (monsterData[mOff + 8]) % 5 - 2;
                  yPlayerDist = (monsterData[mOff + 8]) / 5 - 2;
                  if (randomNextInt(10) == 0) {
                    monsterData[mOff + 8] = 12;
                  }
                }

                /*double*/ xxd = Math.sqrt(xPlayerDist * xPlayerDist);
                /*double*/ yyd = Math.sqrt(yPlayerDist * yPlayerDist);
                if (randomNextInt(1024) >> 10 < yyd / xxd) {
                  if (yPlayerDist < 0)
                    ya--;
                  if (yPlayerDist > 0)
                    ya++;
                }
                if (randomNextInt(1024) >> 10 < xxd / yyd) {
                  if (xPlayerDist < 0)
                    xa--;
                  if (xPlayerDist > 0)
                    xa++;
                }

                moved = true;
                /*double*/ dir = Math.atan2(yPlayerDist, xPlayerDist);
                monsterData[mOff + 2] = ((Math.floor(dir / (Math.PI * 2)
                    * 16 + 4.5 + 16)) & 15);
              }

              ya *= i;
              xa *= 1 - i;

              if (xa != 0 || ya != 0) {
                map[xPos + yPos * 1024] = monsterData[mOff + 15];
                for (/*int*/ var xx = xPos + xa - 3; xx <= xPos + xa + 3; xx++)
                  for (/*int*/ var yy = yPos + ya - 3; yy <= yPos + ya + 3; yy++)
                    if (map[xx + yy * 1024] == RGB(0xFF, 0xFF, 0xFE)
                      || map[xx + yy * 1024] == RGB(0xFF, 0xFF, 0xFF)) {
                      map[xPos + yPos * 1024] = RGB(0xff, 0xff, 0xfe);
                      monsterData[mOff + 8] = randomNextInt(25);
                      continue dirLoop;
                    }

                moved = true;
                monsterData[mOff + 0] += xa;
                monsterData[mOff + 1] += ya;
                monsterData[mOff + 15] = map[(xPos + xa) + (yPos + ya)
                    * 1024];
                map[(xPos + xa) + (yPos + ya) * 1024] = RGB(0xff, 0xff, 0xfe);
              }
            }
            if (moved) {
              monsterData[mOff + 3]++;
            }
          }
        }

        if (shoot) {
          if (ammo >= 220) {
            shootDelay = 2;
            Key.unpress(Key.MOUSE);
          } else {
            shootDelay = 1;
            ammo += 4;
          }
          if (closestHit > 0) {
            monsterData[closestHit * 16 + 10] = 1;
            monsterData[closestHit * 16 + 9] = 127;
          }
          /*int*/ var glow = 0;
          for (/*int*/ var j = closestHitDist; j >= 0; j--) {
            /*int*/ var xm = +Math.floor(cos * j) + 120;
            /*int*/ var ym = -Math.floor(sin * j) + 120;
            if (xm > 0 && ym > 0 && xm < 240 && ym < 240) {
              if (randomNextInt(20) == 0 || j == closestHitDist) {
                pixels[xm + ym * 240] = RGB(0xff, 0xff, 0xff);
                glow = 200;
              }
              lightmap[xm + ym * 240] += glow
                  * (255 - lightmap[xm + ym * 240]) / 255;
            }
            glow = glow * 20 / 21;
          }

          if (closestHitDist < 120) {
            closestHitDist -= 3;
            /*int*/ var xx = Math.floor(120 + cos * closestHitDist);
            /*int*/ var yy = Math.floor(120 - sin * closestHitDist);

            for (/*int*/ var x = -12; x <= 12; x++) {
              for (/*int*/ var y = -12; y <= 12; y++) {
                /*int*/ var xd = xx + x;
                /*int*/ var yd = yy + y;
                if (xd >= 0 && yd >= 0 && xd < 240 && yd < 240) {
                  lightmap[xd + yd * 240] += 2000 / (x * x + y * y + 10)
                      * (255 - lightmap[xd + yd * 240]) / 255;
                }
              }
            }

            for (/*int*/ var i = 0; i < 10; i++) {
              /*double*/ pow = randomNextInt(100) * randomNextInt(100)
                  * 8.0 / 10000;
              /*double*/ dir = (randomNextInt(100) - randomNextInt(100)) / 100.0;
              /*int*/ var xd = Math.floor(xx - Math.cos(left4kDead.playerDir + dir) * pow)
                  + randomNextInt(4) - randomNextInt(4);
              /*int*/ var yd = Math.floor(yy - Math.sin(left4kDead.playerDir + dir) * pow)
                  + randomNextInt(4) - randomNextInt(4);
              if (xd >= 0 && yd >= 0 && xd < 240 && yd < 240) {
                if (closestHit > 0) {
                  pixels[xd + yd * 240] = RGB(0xff, 0x00, 0x00);
                } else {
                  pixels[xd + yd * 240] = RGB(0xca, 0xca, 0xca);
                }
              }
            }
          }
        }
      }

      if (damage >= 220) {
        Key.unpress(Key.MOUSE);
        hurtTime = 255;
        needsRestart = true;
        return;
      }
      if (Key.isDown(Key.RELOAD) && ammo > 20 && clips < 220) {
        shootDelay = 30;
        ammo = 20;
        clips += 10;
      }

      if (xCam > xWin0 && xCam < xWin1 && yCam > yWin0 && yCam < yWin1) {
        needsWinLevel = true;
        return;
      }
    }  // if gameStarted

    bonusTime = bonusTime * 8 / 9;
    hurtTime >>= 1;

    var pixp = 0;
    for (/*int*/ var y = 0; y < 240; y++) {
      for (/*int*/ var x = 0; x < 240; x++) {
        /*int*/ var noise = (randomNextInt(16) * randomNextInt(16)) >> 4;
        if (!gameStarted)
          noise *= 4;

        /*int*/ var c = pixels[pixp];
        /*int*/ var l = lightmap[pixp];
        lightmap[pixp] = 0;

        /* Reversed components from RGB to BGR */
        /*int*/ var r = (((c & 0xff) * l) >> 8) + noise;
        if (r > 255) r = 255;
        /*int*/ var g = ((((c >> 8) & 0xff) * l) >> 8) + noise;
        if (g > 255) g = 255;
        /*int*/ var b = ((((c >> 16) & 0xff) * l) >> 8) + noise;
        if (b > 255) b = 255;

        r = ((r * (255 - hurtTime)) >> 8) + hurtTime;
        g = ((g * (255 - bonusTime)) >> 8) + bonusTime;
        pixels[pixp++] = RGB(r, g, b);
      }
      var yOff = y * 240;
      if (y % 2 == 0 && (y >= damage && y < 220)) {
        for (/*int*/ var x = 232; x < 238; x++) {
          pixels[yOff + x] = RGB(0x80, 0x00, 0x00);
        }
      }
      if (y % 2 == 0 && (y >= ammo && y < 220)) {
        for (/*int*/ var x = 224; x < 230; x++) {
          pixels[yOff + x] = RGB(0x80, 0x80, 0x00);
        }
      }
      if (y % 10 < 9 && (y >= clips && y < 220)) {
        for (/*int*/ var x = 221; x < 222; x++) {
          pixels[yOff + 221] = RGB(0xff, 0xff, 0x00);
        }
      }
    }

    imageData.data.set(buf8);
    context.putImageData(imageData, 0, 0);
    left4kDead.updateFPS();

    context.fillText("" + score, 4, 232);
    if (!gameStarted) {
      context.fillText("Left 4k Dead", 80, 70);
      if (Key.isDown(Key.MOUSE) && hurtTime == 0) {
        score = 0;
        gameStarted = true;
        Key.unpress(Key.MOUSE);
      }
    } else if (tick < 60) {
      context.fillText("Level " + level, 90, 70);
    }
  }

  (function animationLoop() {
    window.requestAnimationFrame(animationLoop);
    loop();
  })();
}

Left4kDead.prototype.startFPS = function() {
  // http://stackoverflow.com/a/5079147/344467
  this.fps = 0;
  this.now = new Date;
  this.lastUpdate = (new Date) * 1 - 1;

  var left4kDead = this;
  setInterval(function() {
    document.getElementById('fps').innerHTML = left4kDead.fps.toFixed(1) + " fps";
  }, 1000);
};

Left4kDead.prototype.updateFPS = function() {
  var FPS_FILTER = 50;
  var thisFrameFPS = 1000 / ((this.now = new Date) - this.lastUpdate);
  this.fps += (thisFrameFPS - this.fps) / FPS_FILTER;
  this.lastUpdate = this.now;
};

window.onload = function() {
  new Left4kDead();
};
