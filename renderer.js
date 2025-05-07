// Use the deprecated 'remote' module for simplicity.
// In production you might want to use a preload script with IPC instead.
const { remote } = require('electron');
const currentWindow = remote.getCurrentWindow();

const dragArea = document.getElementById('window-dagger');

let isDragging = false;
let startMouseX = 0;
let startMouseY = 0;
let startWindowX = 0;
let startWindowY = 0;

// When the user presses the mouse button down on the drag area
dragArea.addEventListener('mousedown', (e) => {
    console.log("Drag started");
    isDragging = true;
    // Record the starting screen coordinates of the mouse
    startMouseX = e.screenX;
    startMouseY = e.screenY;
    // Record the starting position of the window
    [startWindowX, startWindowY] = currentWindow.getPosition();
});

// When the mouse is released anywhere in the document, stop dragging
document.addEventListener('mouseup', () => {
    isDragging = false;
});

// On mouse movement, if dragging, calculate the new position
document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        // Calculate how far the mouse has moved
        const deltaX = e.screenX - startMouseX;
        const deltaY = e.screenY - startMouseY;
        // Set the new window position
        currentWindow.setPosition(startWindowX + deltaX, startWindowY + deltaY);
    }
});
