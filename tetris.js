const canvas = document.getElementById('canvas-tetris');

/**
 * @type {CanvasRenderingContext2D}
 */
const ctx = canvas.getContext('2d');
const width = canvas.width,
   height = canvas.height;
const columns = 10,
  rows = 20;
const blockWidth = width / columns,
  blockHeight = height / rows;
const board = [];

var current,
  currentX,
  currentY,
  holdShape;

var interval = null,
  intervalRender = null;


var GameOver = false;
var isFrozen = false;
var isIntense = false;
var totalRowsDismissed = 0;
var intensityModifier = 100; // Reduce the intensity of the vibrations, if desired. 100 = no reduction, 0 = no vibrations
var maximumIntensity = 20; //using the Lovense API's standard scale of 1-20;



var shapes = [
    [ 1, 1, 1, 1 ],   // Long Boy
    [ 1, 1, 1, 0,     // Left Right angle
      1 ],
    [ 1, 1, 1, 0,     // Right Right angle
      0, 0, 1 ],
    [ 1, 1, 0, 0,     // Square
      1, 1 ],
    [ 1, 1, 0, 0,     // Backwards Z
      0, 1, 1 ],
    [ 0, 1, 1, 0,     // Z
      1, 1 ],
    [ 0, 1, 0, 0,     // T
      1, 1, 1 ]
];

var colours = [
  '#1BD1E0',    // Long Boy
  '#E7B336',    // Left Right angle
  '#33A1EB',    // Right Right angle
  '#E6D430',    // Square
  '#E0475C',    // Backwards Z
  '#3ACE5B',    // Z
  '#A763E8'     // T
];

// ====================================================================
// Events for Keys / Swiping (mobile)

$('body').on('keydown', function(e) {
  var keys = {
    37: 'left',
    38: 'rotate',
    39: 'right',
    40: 'down',
    32: 'drop',
    67: 'hold' //c
  }

  if (keys[e.keyCode]) {
    e.preventDefault();
    keyPress(keys[e.keyCode]);
    render();
  }
});

$('#canvas-tetris').on('swiped', function(e) {
  if (e.detail.dir === 'left' || e.detail.dir === 'right') {
    keyPress(e.detail.dir);
  }
  if (e.detail.dir === 'down') {
    e.preventDefault();
    keyPress('drop');
  }

  render();
});

if (( 'ontouchstart' in window ) || ( navigator.maxTouchPoints > 0 ) || ( navigator.msMaxTouchPoints > 0 )) {
  $('#canvas-tetris').on('click', function(e) {
    keyPress('rotate');
  });

}

function keyPress( key ) {
  switch ( key ) {
    case 'left':    if (isValid(-1))    { --currentX; } break;
    case 'right':   if (isValid(1))     { ++currentX; } break;
    case 'down':    if (isValid(0, 1) ) { ++currentY; } break;
    case 'rotate':
      var rotated = rotateShape(current);
      if (isValid( 0, 0, rotated) ) {
          current = rotated;
      }
      else if (currentX <= 3 && isValid(1, 0, rotated)) {
        ++currentX;
        current = rotated;
      }
      else if (currentX >= 7 && isValid(-1, 0, rotated)) {
        --currentX;
        current = rotated;
      }

      break;
    case 'drop':
      while(isValid(0, 1) ) {
          ++currentY;
      }
      tick();
      break;

    case 'hold':
      if (holdShape) {
        var temp = current;
        current = holdShape;
        holdShape = temp;
        currentX = 5;
        currentY = 0;
      }

      else {
        holdShape = current;
        newShape();
      }
      break;
}
}


$('#tetris-start').on('click', function() {
  newGame();

  this.disabled = true;
});

$('#tetris-mobilefix').on('click', function() {
  if (!$('.canvas-container').hasClass('mobile-fix')) {

    $('.canvas-container')
      .prop('style' ,
        'width: 100%; height: 100%; '+
        'position: absolute; top: 0; left: 0; padding: 15px;'+
        'overflow: hidden; '+
        'background: #212121; text-align: center;')
      .addClass('mobile-fix');

  }
  else {
    $('.canvas-container').prop('style', '')
      .removeClass('mobile-fix');
  }
})

// ====================================================================
// Initialize the stuff

/**
 * Setup the board
 */
function init() {
  for (let x = 0; x < columns; x++) {
    board[x] = [];
    for (let y = 0; y < rows; y++) {
      board[x][y] = 0;
    }
  }
}

/**
 * Prepare the full board again for a reet
 */
function newGame() {
  clearAllIntervals();
  intervalRender = setInterval( render, 30 );
  init();
  newShape();
  GameOver = false;
  isIntense = $('#tetris-intense-mode').prop('checked');
  maximumIntensity = $('#maximum-intensity').val();
  intensityModifier = $('#intensity-modifier').val();
  if(maximumIntensity.length === 0)
  {
    maximumIntensity = 20;
  }
  if(intensityModifier.length === 0)
  {
    intensityModifier = 100;
  }
  if(maximumIntensity < 1)
  {
    maximumIntensity = 1;
  }
  else if(maximumIntensity > 20)
  {
    maximumIntensity = 20;
  }
  if(intensityModifier < 0)
  {
    intensityModifier = 0;
  }
  else if(intensityModifier > 100)
  {
    intensityModifier = 100;
  }
  interval = setInterval( tick, 400 );

  totalRowsDismissed = 0;
  $('#tetris-level').text(
    Math.floor( totalRowsDismissed / 10 ) + 1
  );
}

function clearAllIntervals(){
  clearInterval( interval );
  clearInterval( intervalRender );
}


// ====================================================================
// Drawing

function tick() {
  if (isValid(0, 1)) {
    ++currentY;
  }
  else {
    freeze();
    isValid(0, 1);
    checkClearLines();

    if (GameOver) {
      clearAllIntervals();
      return false;
    }

    newShape();
  }
}

function render() {
  ctx.clearRect(0 , 0, width, height);

  // Render Ghost
  for (var yDrop = 0; yDrop < (rows - currentY); ++yDrop) {
    if (!isValid(0, yDrop)) {
      yDrop = yDrop;
      break;
    }
  }

  yDrop -= 1;


  for (var y = 0; y < 4; ++y) {
    for (var x = 0; x < 4; ++x) {
      if ( current[ x ][ y ] ) {
        ctx.strokeStyle = '#aaa';
        ctx.fillStyle = '#aaa';
        ctx.fillRect(
          blockWidth * (currentX + x),
          blockHeight * (currentY + y + yDrop),
          blockWidth - 1 ,
          blockHeight - 1
        );
        ctx.strokeRect(
          blockWidth * (currentX + x),
          blockHeight * (currentY + y + yDrop),
          blockWidth - 1 ,
          blockHeight - 1
        );
      }
    }
  }


  ctx.strokeStyle  = 'black';
  for (var x = 0; x < columns; ++x) {
    for (var y = 0; y < rows; ++y) {
      if (board[x][y]) {
        ctx.fillStyle = colours[board[x][y] - 1];
        ctx.fillRect(
          blockWidth * x,
          blockHeight * y,
          blockWidth,
          blockHeight
        );
        ctx.strokeRect(
          blockWidth * x,
          blockHeight * y,
          blockWidth - 1 ,
          blockHeight - 1
        );
      }
    }
  }

  ctx.fillStyle = 'red';
  ctx.strokeStyle = 'black';
  for (var y = 0; y < 4; ++y) {
    for (var x = 0; x < 4; ++x) {
      if ( current[ x ][ y ] ) {
        ctx.fillStyle = colours[ current[ x ][ y ] - 1 ];

        ctx.fillRect(
          blockWidth * (currentX + x),
          blockHeight * (currentY + y),
          blockWidth - 1 ,
          blockHeight - 1
        );
        ctx.strokeRect(
          blockWidth * (currentX + x),
          blockHeight * (currentY + y),
          blockWidth - 1 ,
          blockHeight - 1
        );
      }
    }
  }
}

function drawBlock(x, y) {
  ctx.fillRect(
    blockWidth * x,
    blockHeight * y,
    blockWidth - 1,
    blockHeight - 1
  );
  ctx.strokeRect(
    blockWidth * x,
    blockHeight * y,
    blockWidth - 1,
    blockHeight - 1
  );
}

/**
 * Create a random shape.
 */
function newShape() {
  var randomIndex = Math.floor( Math.random() * shapes.length );
  var shape = shapes[ randomIndex ]; // maintain index for color filling

  // Full the current with the shape
  current = [];
  for ( var x = 0; x < 4; ++x ) {
    current[ x ] = [];
    for ( var y = 0; y < 4; ++y ) {
      var i = 4 * y + x;
      if ( typeof shape[ i ] != 'undefined' && shape[ i ] ) {
        current[x][y] = randomIndex + 1;
      }
      else {
        current[x][y] = 0;
      }
    }
  }

  // new shape starts to move
  isFrozen = false;
  // position where the shape will evolve
  currentX = 5; // Center
  currentY = 0; // Top
}

function rotateShape(current) {
  var updatedShape = [];
  for ( var x = 0; x < 4; ++x ) {
    updatedShape[ x ] = [];
    for ( var y = 0; y < 4; ++y ) {
      // Flip Indexes & Invert one Axis
      updatedShape[ x ][ y ] = current[ y ][ 3 - x ];
    }
  }

  return updatedShape;
}

// ====================================================================
// Helpers

function isValid( offsetX, offsetY, newCurrent ) {
  offsetX = offsetX || 0;
  offsetY = offsetY || 0;
  offsetX = currentX + offsetX;
  offsetY = currentY + offsetY;
  newCurrent = newCurrent || current;

  for ( var x = 0; x < 4; ++x ) {
    for ( var y = 0; y < 4; ++y ) {
      if ( newCurrent[ x ][ y ] ) {
        if ( typeof board[ x + offsetX ] == 'undefined'
          || typeof board[ x + offsetX ][ y + offsetY ] == 'undefined'
          || board[ x + offsetX ][ y + offsetY ]
          || x + offsetX < 0
          || y + offsetY >= rows
          || x + offsetX >= columns )
        {
          if (offsetY == 1 && isFrozen) {
              GameOver = true; // lose if the current shape is settled at the top most row
              $('#tetris-start').prop('disabled', false);

              for (let i = 0; i < enabledToys.length; i++) {
                const toy = enabledToys[i];

                lovense.sendVibration(toy, maximumIntensity, 5);
              }
          }
          return false;
        }
      }
    }
  }
  return true;
}
function freeze() {
  for ( var y = 0; y < 4; ++y ) {
    for ( var x = 0; x < 4; ++x ) {
      if ( current[ x ][ y ] ) {
        board[ x + currentX ][ y + currentY ] = current[ x ][ y ];
      }
    }
  }
  isFrozen = true;
}


function checkClearLines() {
  var totalRows = 0;
  for ( var y = rows - 1; y >= 0; --y ) {
    var rowFilled = true;
    for ( var x = 0; x < columns; ++x ) {
      if ( board[ x ][ y ] == 0 ) {
        rowFilled = false;
        break;
      }
    }
    if ( rowFilled ) {
      totalRows++;

      for ( var yy = y; yy > 0; --yy ) {
        for ( var x = 0; x < columns; ++x ) {
          board[ x ][ yy ] = board[ x ][ yy - 1 ];
        }
      }
        ++y;
    }
  }

  if ( totalRows > 0 ) {
    totalRowsDismissed += totalRows;

    var level = Math.floor(totalRowsDismissed / 10) + 1;


    for (let i = 0; i < enabledToys.length; i++) {
      const toy = enabledToys[i];

      // Vibration Level is based upon the Current Level of the Game
      // The Number of rows they just dismissed and 1.5 to make it abit more fun ;)
      var vibrationLevel = level * totalRows * 1.5;
      if (vibrationLevel > maximumIntensity) { vibrationLevel = maximumIntensity; }
      vibrationLevel = vibrationLevel / 100 * intensityModifier;

      lovense.sendVibration(
        toy, Math.abs(vibrationLevel),

        (isIntense ? 2 : 1)
        // Vibrate 2 seconds for intense mode so we can overwrite the previous vibration in a second
      );
    }

    if (isIntense) {
      setTimeout(function() {
        for (let i = 0; i < enabledToys.length; i++) {
          const toy = enabledToys[i];

          // Vibration Level is based upon the Current Level of the Game
          var lvlVibrate = level;
          if (lvlVibrate > maximumIntensity) {
            lvlVibrate = maximumIntensity;
          }

          lovense.sendVibration(
            toy, lvlVibrate, 0
          );
        }
      }, 1000);
    }


    $('#tetris-level').text( level );
  }

  // Display level
}


// ====================================================================
// Start events

init();