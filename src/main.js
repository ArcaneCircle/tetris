import "./main.css";
import musicUrl from "/assets/sounds/music.mp3";
import scoreUrl from "/assets/sounds/score.mp3";
import collisionUrl from "/assets/sounds/collision.mp3";
import lostUrl from "/assets/sounds/lost.mp3";
import levelUrl from "/assets/sounds/level.mp3";

import "@webxdc/highscores";
import { Howl } from "howler";

const minMsBetweenDrops = 400;
let game_interval = 0,
  score = 0,
  level = 1,
  newlevel = 1,
  speed,
  started = false,
  paused = false,
  lastDropAt = null;
let playfield = new Array(22),
  dirty_rows = new Array(20),
  dirty = false;
let sfxmusic, sfxscore, sfxcollision, sfxlost, sfxlevel;
const canvas = document.getElementById("playfield"),
  scoreContainer = document.getElementById("score-container"),
  scoreboard = document.getElementById("scoreboard"),
  square_img = document.getElementById("square"),
  settingsBtn = document.getElementById("settings"),
  startBtn = document.getElementById("start"),
  gameArea = document.getElementById("game-area"),
  overlay = document.getElementById("overlay"),
  sensibilitySelect = document.getElementById("sencontrol"),
  musicSelect = document.getElementById("musiccontrol"),
  menu = document.getElementById("menu");

const width = canvas.width,
  height = canvas.height,
  main = canvas.getContext("2d");
main.fillStyle = "rgba(255, 0, 0, 0.6)";

let falling = {
  shape: [],
  rot: 0,
  loc: [],
  color: "",
  width: 0,
};

let xDown = null;
let yDown = null;

let xtrigger = 0;
let ytrigger = 0;
let dtrigger = 0;

let KeyCodes = {
  SPACE: 32,
  ARROWL: 37,
  ARROWR: 39,
  ARROWU: 38,
  ARROWD: 40,
};

function randomChoice(choices) {
  var index = Math.floor(Math.random() * choices.length);
  return choices[index];
}

function setLevel(newLevel) {
  level = newLevel;
  const oldSpeed = speed;
  speed = 450 - 25 * Math.min(level - 1, 9);
  if (!started) {
    // clear game interval on game over
    if (game_interval) {
      clearInterval(game_interval);
      game_interval = 0;
    }
    return;
  }

  if (oldSpeed !== speed || !game_interval) {
    // speed change or game start
    if (game_interval) clearInterval(game_interval);
    game_interval = setInterval(() => {
      fall(playfield, falling, true);
    }, speed);
  }
}

function setField() {
  for (let i = 0; i < playfield.length; ++i) {
    playfield[i] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
  for (let i = 0; i < dirty_rows.length; ++i) {
    dirty_rows[i] = true;
  }
  dirty = true;
}

function checkClear(max) {
  for (let row = 0; row <= max && row < playfield.length; ++row) {
    if (
      playfield[row][0] > 0 &&
      playfield[row][1] > 0 &&
      playfield[row][2] > 0 &&
      playfield[row][3] > 0 &&
      playfield[row][4] > 0 &&
      playfield[row][5] > 0 &&
      playfield[row][6] > 0 &&
      playfield[row][7] > 0 &&
      playfield[row][8] > 0 &&
      playfield[row][9] > 0
    ) {
      playfield.splice(row, 1); // delete row
      playfield.splice(0, 0, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); // insert empty row at the top
      incScore(10); // increment score
      for (let i = 0; i <= row; ++i) {
        if (i > 1 && !dirty_rows[i - 2]) {
          dirty_rows[i - 2] = true;
          if (!dirty) dirty = true;
        }
      }
    }
  }
}

function incScore(amount) {
  scoreContainer.innerHTML = score += amount;
  newlevel = Math.floor((score + 100) / 100);
  if (newlevel !== level) {
    setLevel(newlevel);
    window.highscores.setScore(score);
    sfxlevel.play();
  } else {
    if (!sfxlevel.playing()) sfxscore.play();
  }
}

function draw() {
  if (dirty) {
    rePaint(false);
    dirty = false;
  }
  window.requestAnimationFrame(draw);
}

function spawn(type) {
  switch (type) {
    case "I":
      falling.shape = [
        [
          [0, 0, 0, 0],
          [1, 1, 1, 1],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        [
          [0, 0, 1, 0],
          [0, 0, 1, 0],
          [0, 0, 1, 0],
          [0, 0, 1, 0],
        ],
        [
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [1, 1, 1, 1],
          [0, 0, 0, 0],
        ],
        [
          [0, 1, 0, 0],
          [0, 1, 0, 0],
          [0, 1, 0, 0],
          [0, 1, 0, 0],
        ],
      ];
      falling.rot = 0;
      falling.loc = [0, 3];
      falling.color = "cyan";
      falling.width = 4;
      // playfield[1][3] = playfield[1][4] = playfield[1][5] = playfield[1][6] = 1; // add checks for collision -> fail
      break;
    case "J":
      falling.shape = [
        [
          [2, 0, 0],
          [2, 2, 2],
          [0, 0, 0],
        ],
        [
          [0, 2, 2],
          [0, 2, 0],
          [0, 2, 0],
        ],
        [
          [0, 0, 0],
          [2, 2, 2],
          [0, 0, 2],
        ],
        [
          [0, 2, 0],
          [0, 2, 0],
          [2, 2, 0],
        ],
      ];
      falling.rot = 0;
      falling.loc = [0, 3];
      falling.color = "blue";
      falling.width = 3;
      break;
    case "L":
      falling.shape = [
        [
          [0, 0, 3],
          [3, 3, 3],
          [0, 0, 0],
        ],
        [
          [0, 3, 0],
          [0, 3, 0],
          [0, 3, 3],
        ],
        [
          [0, 0, 0],
          [3, 3, 3],
          [3, 0, 0],
        ],
        [
          [3, 3, 0],
          [0, 3, 0],
          [0, 3, 0],
        ],
      ];
      falling.rot = 0;
      falling.loc = [0, 3];
      falling.color = "orange";
      falling.width = 3;
      break;
    case "O":
      falling.shape = [
        [
          [4, 4],
          [4, 4],
        ],
        [
          [4, 4],
          [4, 4],
        ],
        [
          [4, 4],
          [4, 4],
        ],
        [
          [4, 4],
          [4, 4],
        ],
      ];
      falling.rot = 0;
      falling.loc = [0, 4];
      falling.color = "yellow";
      falling.width = 2;
      break;
    case "S":
      falling.shape = [
        [
          [0, 5, 5],
          [5, 5, 0],
          [0, 0, 0],
        ],
        [
          [0, 5, 0],
          [0, 5, 5],
          [0, 0, 5],
        ],
        [
          [0, 0, 0],
          [0, 5, 5],
          [5, 5, 0],
        ],
        [
          [5, 0, 0],
          [5, 5, 0],
          [0, 5, 0],
        ],
      ];
      falling.rot = 0;
      falling.loc = [0, 3];
      falling.color = "green";
      falling.width = 3;
      break;
    case "T":
      falling.shape = [
        [
          [0, 6, 0],
          [6, 6, 6],
          [0, 0, 0],
        ],
        [
          [0, 6, 0],
          [0, 6, 6],
          [0, 6, 0],
        ],
        [
          [0, 0, 0],
          [6, 6, 6],
          [0, 6, 0],
        ],
        [
          [0, 6, 0],
          [6, 6, 0],
          [0, 6, 0],
        ],
      ];
      falling.rot = 0;
      falling.loc = [0, 3];
      falling.color = "purple";
      falling.width = 3;
      break;
    case "Z":
      falling.shape = [
        [
          [7, 7, 0],
          [0, 7, 7],
          [0, 0, 0],
        ],
        [
          [0, 0, 7],
          [0, 7, 7],
          [0, 7, 0],
        ],
        [
          [0, 0, 0],
          [7, 7, 0],
          [0, 7, 7],
        ],
        [
          [0, 7, 0],
          [7, 7, 0],
          [7, 0, 0],
        ],
      ];
      falling.rot = 0;
      falling.loc = [0, 3];
      falling.color = "red";
      falling.width = 3;
      break;
    case "-":
      falling.shape = [
        [
          [0, 0],
          [8, 8],
        ],
        [
          [8, 0],
          [8, 0],
        ],
        [
          [8, 8],
          [0, 0],
        ],
        [
          [0, 8],
          [0, 8],
        ],
      ];
      falling.rot = 0;
      falling.loc = [0, 4];
      falling.color = "magenta";
      falling.width = 2;
      break;
    case "~":
      falling.shape = [
        [
          [9, 0, 0],
          [9, 9, 9],
          [0, 0, 9],
        ],
        [
          [0, 9, 9],
          [0, 9, 0],
          [9, 9, 0],
        ],
        [
          [9, 0, 0],
          [9, 9, 9],
          [0, 0, 9],
        ],
        [
          [0, 9, 9],
          [0, 9, 0],
          [9, 9, 0],
        ],
      ];
      falling.rot = 0;
      falling.loc = [0, 3];
      falling.color = "pink";
      falling.width = 3;
      break;
    case "+":
      falling.shape = [
        [
          [0, 10, 0],
          [10, 10, 10],
          [0, 10, 0],
        ],
        [
          [0, 10, 0],
          [10, 10, 10],
          [0, 10, 0],
        ],
        [
          [0, 10, 0],
          [10, 10, 10],
          [0, 10, 0],
        ],
        [
          [0, 10, 0],
          [10, 10, 10],
          [0, 10, 0],
        ],
      ];
      falling.rot = 0;
      falling.loc = [0, 3];
      falling.color = "gray";
      falling.width = 3;
      break;
  }
  for (let i = 0; i < falling.shape[0].length; ++i) {
    const row = falling.loc[0] + i;
    for (let j = 0; j < falling.shape[0][i].length; ++j) {
      const col = falling.loc[1] + j;
      if (falling.shape[0][i][j] > 0) {
        if (playfield[row][col] > 0) {
          started = false;
          setLevel(1);
          setField();
          window.highscores.setScore(score);
          scoreboard.classList.add("opened");
          canvas.classList.add("blur");
          startBtn.classList.remove("hidden");
          clearGame();
          scoreContainer.innerHTML = score = 0;
          sfxlost.play();
          sfxmusic.pause();
          break;
        } else if (falling.shape[0][i][j] > 0) {
          playfield[row][col] = falling.shape[0][i][j];
          if (row > 1 && !dirty_rows[row - 2]) {
            dirty_rows[row - 2] = true;
            dirty = true;
          }
        }
      }
    }
  }
}

function spawn_rand() {
  spawn(randomChoice("IJLOSTZ"));
}

function drop(field, piece, render) {
  if (Date.now() - lastDropAt > minMsBetweenDrops) {
    lastDropAt = Date.now();
    while (fall(field, piece, render));
  }
}

function fall(field, piece, render) {
  if (paused) return;
  if (piece.shape.length != 4) return;
  let valid = true;
  for (let i = 0; i < piece.shape[piece.rot].length; ++i) {
    const row = piece.loc[0] + i;
    for (let j = 0; j < piece.shape[piece.rot][i].length; ++j) {
      const col = piece.loc[1] + j;
      if (col < 0 || col > 9) {
        continue;
      }
      if (piece.shape[piece.rot][i][j] > 0) {
        if (
          !(
            (i + 1 < piece.shape[piece.rot].length &&
              piece.shape[piece.rot][i + 1][j] > 0) ||
            (row + 1 < field.length && field[row + 1][col] == 0)
          )
        ) {
          valid = false;
          piece.shape = [];
          sfxcollision.play();
          break;
        }
      }
    }
    if (!valid) break;
  }
  if (valid) {
    for (let i = piece.shape[piece.rot].length - 1; i >= 0; i--) {
      const row = piece.loc[0] + i;
      for (let j = 0; j < piece.shape[piece.rot][i].length; ++j) {
        const col = piece.loc[1] + j;
        if (col < 0 || col > 9) {
          continue;
        }
        if (piece.shape[piece.rot][i][j] > 0) {
          field[row][col] = 0;
          field[row + 1][col] = piece.shape[piece.rot][i][j];
          if (render && row > 1 && !dirty_rows[row - 2]) {
            dirty_rows[row - 2] = true;
          }
          if (render && row + 1 > 1 && !dirty_rows[row - 1]) {
            dirty_rows[row - 1] = true;
          }
        }
      }
    }
    piece.loc[0] += 1;
    if (render) dirty = true;
  } else {
    sfxcollision.play();
    checkClear(piece.loc[0] + piece.width - 1);
    spawn_rand();
    if (checkTopBlock() < 8) sfxmusic.rate(1.2);
    else sfxmusic.rate(1);
  }
  return valid;
}

// rot 90deg clockwise
function rotate(field, piece, render) {
  if (piece.shape.length != 4) return;
  let rot = 1;
  let check;
  while (rot < 4) {
    check = piece.rot + rot;
    if (check > 3) check -= 4;
    let valid = true;
    for (let i = 0; i < piece.width; ++i) {
      const row = piece.loc[0] + i;
      for (let j = 0; j < piece.width; ++j) {
        if (piece.shape[check][i][j] > 0) {
          const col = piece.loc[1] + j;
          if (row >= field.length) {
            valid = false;
            break;
          }
          if (col < 0 || col > 9) {
            valid = false;
            break;
          }
          if (
            piece.shape[piece.rot][i][j] == 0 &&
            row < field.length &&
            field[row][col] > 0
          ) {
            valid = false;
            break;
          }
        }
      }
      if (!valid) break;
    }
    if (!valid) rot++;
    else break;
  }
  if (rot < 4) {
    for (let i = 0; i < piece.width; ++i) {
      const row = piece.loc[0] + i;
      for (let j = 0; j < piece.width; ++j) {
        const col = piece.loc[1] + j;
        if (col < 0 || col > 9) {
          continue;
        }
        if (piece.shape[piece.rot][i][j] > 0 && piece.shape[check][i][j] == 0) {
          field[row][col] = 0;
          if (render && row > 1 && !dirty_rows[row - 2]) {
            dirty_rows[row - 2] = true;
          }
        } else if (field[row][col] == 0 && piece.shape[check][i][j] > 0) {
          field[row][col] = piece.shape[check][i][j];
          if (render && row > 1 && !dirty_rows[row - 2]) {
            dirty_rows[row - 2] = true;
          }
        }
      }
    }
    piece.rot = check;
    if (render) dirty = true;
  }
  return rot < 4;
}

function move(x, field, piece, render) {
  // input x: -1, 1
  if (piece.shape.length != 4) return;
  let valid = true;
  for (let i = 0; i < piece.width; ++i) {
    const row = piece.loc[0] + i;
    for (let j = 0; j < piece.width; ++j) {
      if (piece.shape[piece.rot][i][j] > 0) {
        const col = piece.loc[1] + j + x;
        if (col < 0 || col > 9) {
          valid = false;
          break;
        } else if (field[row][col] > 0) {
          if (
            (j + x < piece.width && piece.shape[piece.rot][i][j + x] == 0) ||
            j + x < 0 ||
            j + x >= piece.width
          ) {
            valid = false;
            break;
          }
        }
      }
    }
    if (!valid) break;
  }
  if (valid) {
    for (let i = 0; i < piece.width; ++i) {
      const row = piece.loc[0] + i;
      for (let j = 0; j < piece.width; ++j) {
        const col = piece.loc[1] + j;
        if (piece.shape[piece.rot][i][j] > 0) {
          field[row][col] = 0;
        }
      }
    }
    for (let i = 0; i < piece.width; ++i) {
      const row = piece.loc[0] + i;
      for (let j = 0; j < piece.width; ++j) {
        const col = piece.loc[1] + j + x;
        if (piece.shape[piece.rot][i][j] > 0) {
          field[row][col] = piece.shape[piece.rot][i][j];
          if (render && row > 1 && !dirty_rows[row - 2]) {
            dirty_rows[row - 2] = true;
          }
        }
      }
    }
    piece.loc[1] += x;
    if (render) dirty = true;
  }
}

function start() {
  if (!started) {
    if (!localStorage.playfield) spawn_rand();
    startBtn.classList.add("hidden");
    scoreboard.classList.remove("opened");
    canvas.classList.remove("blur");
    started = true;
    setLevel(level);
    sfxmusic.rate(1);
    if (!sfxmusic.playing() && musicSelect.checked) {
      sfxmusic.play();
    }
  }
}

function onClick() {
  if (paused) {
    hideMenu();
    paused = false;
    if (started && musicSelect.checked) {
      sfxmusic.play();
    }
  } else if (started) {
    rotate(playfield, falling, true);
  }
}

function checkTopBlock() {
  var lastrow = 0;
  for (let r = 19; r > 0; r--) {
    for (let c = 9; c > 0; c--) {
      if (playfield[r + 2][c] > 0) {
        lastrow = r;
      }
    }
  }
  //console.log(lastrow);
  return lastrow;
}

function rePaint(refresh) {
  for (let i = 0; i < 20; ++i) {
    if (dirty_rows[i] || refresh) {
      main.clearRect(0, i * 100, width, 100);
      for (let j = 0; j < 10; ++j) {
        if (playfield[i + 2][j] > 0) {
          main.drawImage(square_img, j * 100, i * 100);
          switch (
            playfield[i + 2][j] // note: static colors looks dull
          ) {
            case 1: // cyan
              main.fillStyle = "rgba(0, 255, 255, 0.65)";
              break;
            case 2: // blue
              main.fillStyle = "rgba(0, 0, 255, 0.65)";
              break;
            case 3: // orange
              main.fillStyle = "rgba(255, 165, 0, 0.65)";
              break;
            case 4: // yellow
              main.fillStyle = "rgba(255, 255, 0, 0.65)";
              break;
            case 5: // green
              main.fillStyle = "rgba(0, 255, 0, 0.65)";
              break;
            case 6: // purple
              main.fillStyle = "rgba(128, 0, 128, 0.65)";
              break;
            case 7: // red
              main.fillStyle = "rgba(255, 0, 0, 0.65)";
              break;
            case 8: // magenta
              main.fillStyle = "rgba(255, 110, 200, 0.65)";
              break;
            case 9: // pink
              main.fillStyle = "rgba(255, 192, 203, 0.65)";
              break;
            case 10: // gray
              main.fillStyle = "rgba(200, 200, 200, 0.65)";
              break;
          }
          main.fillRect(j * 100, i * 100, 100, 100);
        }
      }
      dirty_rows[i] = false;
    }
  }
}

function saveGame() {
  localStorage.sensibility = sensibilitySelect.value;
  localStorage.music = musicSelect.checked;
  if (started) {
    localStorage.playfield = JSON.stringify(playfield);
    localStorage.falling = JSON.stringify(falling);
    localStorage.dirty_rows = JSON.stringify(dirty_rows);
    localStorage.score = score;
  }
}

function restoreGame() {
  let sensibility = Number(localStorage.sensibility) || 5;
  let musicDisabled = localStorage.music === "false";
  if (musicDisabled) {
    musicSelect.checked = false;
  }
  scoreContainer.innerHTML = score = Number(localStorage.score) || 0;
  level = Math.floor((score + 100) / 100);
  if (localStorage.playfield) {
    playfield = JSON.parse(localStorage.playfield);
    falling = JSON.parse(localStorage.falling);
    dirty_rows = JSON.parse(localStorage.dirty_rows);
    sensibilitySelect.selectedIndex = 10 - sensibility;
    dirty = true;
    rePaint(true);
  }
}

function clearGame() {
  localStorage.removeItem("playfield");
  localStorage.removeItem("falling");
  localStorage.removeItem("dirty_rows");
  localStorage.removeItem("score");
}

function getTouches(evt) {
  return (
    evt.touches || // browser API
    evt.originalEvent.touches
  ); // jQuery
}

function handleTouchStart(evt) {
  const firstTouch = getTouches(evt)[0];
  xDown = firstTouch.clientX;
  yDown = firstTouch.clientY;
  xtrigger = 0;
  ytrigger = 0;
  dtrigger = 0;
}

function handleTouchMove(evt) {
  if (!xDown || !yDown || !started || paused) {
    return;
  }

  let xUp = evt.touches[0].clientX;
  let yUp = evt.touches[0].clientY;

  let xDiff = xDown - xUp;
  let yDiff = yDown - yUp;
  let sensibility = Number(sensibilitySelect.value);

  if (Math.abs(xDiff) > Math.abs(yDiff)) {
    /*most significant*/
    /* right swipe */
    if (xDiff > 0) {
      ytrigger = 0;
      dtrigger = 0;
      if (xtrigger < sensibility) xtrigger++;
      else xtrigger = 0;
      if (xtrigger == sensibility) move(-1, playfield, falling, true);
    } else {
      /* left swipe */
      xtrigger = 0;
      dtrigger = 0;
      if (ytrigger < sensibility) ytrigger++;
      else ytrigger = 0;
      if (ytrigger == sensibility) move(1, playfield, falling, true);
    }
    //console.log(xDiff);
  } else {
    if (yDiff < 0) {
      ytrigger = 0;
      xtrigger = 0;
      if (dtrigger < sensibility) dtrigger++;
      else dtrigger = 0;
      if (dtrigger == sensibility) drop(playfield, falling, true);
    }
  }
}

function onKeyDown(event) {
  let keyCode;
  if (event == null) {
    keyCode = window.event.keyCode;
  } else {
    keyCode = event.keyCode;
  }
  if (keyCode === KeyCodes.SPACE) {
    if (paused) {
      onClick();
    } else if (started) {
      paused = true;
      sfxmusic.pause();
      showMenu();
    } else {
      start();
    }
  } else if (started && !paused) {
    switch (keyCode) {
      case KeyCodes.ARROWD:
        drop(playfield, falling, true);
        break;
      case KeyCodes.ARROWL:
        move(-1, playfield, falling, true);
        break;
      case KeyCodes.ARROWR:
        move(1, playfield, falling, true);
        break;
      case KeyCodes.ARROWU:
        rotate(playfield, falling, true);
        break;
      default:
        break;
    }
  }
}

function showMenu() {
  menu.classList.add("opened");
  gameArea.classList.add("blur");
  overlay.classList.add("visible");
}

function hideMenu() {
  menu.classList.remove("opened");
  gameArea.classList.remove("blur");
  overlay.classList.remove("visible");
}

function loadAssets() {
  sfxmusic = new Howl({ src: [musicUrl], loop: true, volume: 0.4 });
  sfxscore = new Howl({ src: [scoreUrl], loop: false });
  sfxcollision = new Howl({ src: [collisionUrl], loop: false });
  sfxlost = new Howl({ src: [lostUrl], loop: false });
  sfxlevel = new Howl({ src: [levelUrl], loop: false });
}

loadAssets();

window.addEventListener("load", () => {
  window.requestAnimationFrame(draw);
  window.highscores
    .init({
      onHighscoresChanged: () => {
        scoreboard.innerHTML = window.highscores.renderScoreboard().innerHTML;
      },
    })
    .then(() => {
      setField();
      restoreGame();
      scoreboard.classList.add("opened");
      settingsBtn.addEventListener("pointerup", (event) => {
        event.preventDefault();
        event.stopPropagation();
        paused = true;
        sfxmusic.pause();
        showMenu();
      });
      menu.addEventListener("pointerup", () => {
        event.preventDefault();
        event.stopPropagation();
      });
      overlay.addEventListener("pointerup", () => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      });
      startBtn.addEventListener("pointerup", () => {
        event.preventDefault();
        event.stopPropagation();
        start();
      });
      document.addEventListener("pointerup", onClick);
      document.addEventListener("touchstart", handleTouchStart, false);
      document.addEventListener("touchmove", handleTouchMove, false);
      document.addEventListener("keydown", onKeyDown);
      document.addEventListener("visibilitychange", saveGame);
    });
});
