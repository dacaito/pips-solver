# NYT Pips Game DOM Analysis

## Summary

This document contains the reverse-engineered DOM structure of the NYT Pips game for implementing auto-placement of dominoes.

## Key Findings

### 1. Domino Elements

**Class Names:**
- Tray wrapper: `Tray-module_trayDominoWrapper__HxjLu`
- Domino container: `Domino-module_domino__hSfP4`
- Half domino (button): `Domino-module_halfDomino__FWnOS`
- First half indicator: `Domino-module_isFirst__qiM7f`
- Dots wrapper: `Domino-module_dotsWrapper__kkdAC`
- Individual dot: `Domino-module_dot__z3BLH`

**Dot Position Classes:**
- `Domino-module_middle__0bq7B`
- `Domino-module_topLeft__MOH8P`
- `Domino-module_topRight__ALElk`
- `Domino-module_bottomLeft__W5oeb`
- `Domino-module_bottomRight__XsqaY`
- `Domino-module_middleLeft__w5HnM`
- `Domino-module_middleRight__aO70z`

**React Props Structure:**
```json
{
  "id": "domino-1",
  "inTray": true,
  "rotation": 0,
  "firstDots": 1,
  "secondDots": 2
}
```

**Domino Identification:**
- Dominoes can be identified by counting the number of `Domino-module_dot__z3BLH` elements in each half
- Each domino has two halves (buttons with class `Domino-module_halfDomino__FWnOS`)
- The first half has the additional class `Domino-module_isFirst__qiM7f`
- React props contain `firstDots` and `secondDots` values

### 2. Board/Grid Elements

**Class Names:**
- Board container: `Board-module_boardContainer__xtRPE`
- Background wrapper: `Board-module_backgroundWrapper__x5XOy`
- Background section: `Board-module_background__q413m`
- Background cell: `Board-module_backgroundCell__R2Fku`
- Droppable wrapper: `Board-module_droppableWrapper__gEcg2`
- Droppable section: `Board-module_droppable__bdR2Y`
- Droppable cell: `Board-module_droppableCell__ndah2`
- Hidden cell: `Board-module_hidden__DkSxz`

**Corner Classes:**
- `Board-module_roundedTopLeftCorner___MZ51`
- `Board-module_roundedTopRightCorner__Vxedu`
- `Board-module_roundedBottomLeftCorner__AxAfV`
- `Board-module_roundedBottomRightCorner__eDiR`

**Cell Identification:**
- Grid cells are `DIV` elements with class `Board-module_droppableCell__ndah2`
- Hidden cells have additional class `Board-module_hidden__DkSxz`
- Cells do NOT have React event handlers (onDrop, onDragOver, etc.) in their props

### 3. Button Elements

**Total Buttons Found:** 73

**Game Control Buttons:**
- Button 52: Timer display (e.g., "8:29")
- Button 53: "Clear" button - `ToolbarItem-module_toolbar_item__xrBr_`
- Button 54: "Help" button
- Button 55: "Settings" button

**Domino Buttons (in tray):**
- Buttons 57-66: Individual domino half buttons
- Each domino consists of 2 buttons (first and second half)

### 4. React Internals

**React Fiber Key:** `__reactFiber$0owj50jxp3qb`
**React Props Key:** `__reactProps$0owj50jxp3qb`

The React fiber and props keys follow the pattern `__reactFiber$[hash]` and `__reactProps$[hash]`.

### 5. Global State

**No global state objects found** in:
- `window.gameState`
- `window.puzzleData`
- `window.gameData`
- `window.__PIPS__`
- `window.store`
- `window.__store`

**No `__NEXT_DATA__`** found in the page props.

**No context providers** found with classes containing "provider" or "context".

## DOM Structure Example

### Domino in Tray

```html
<div class="Tray-module_trayDominoWrapper__HxjLu" style="width: 80px; height: 40px;">
  <div class="Tray-module_emptyTraySlot__KQ6Lo"></div>
  <div class="Domino-module_domino__hSfP4">
    <button class="Domino-module_halfDomino__FWnOS Domino-module_isFirst__qiM7f">
      <div class="Domino-module_dotsWrapper__kkdAC">
        <span class="Domino-module_dot__z3BLH Domino-module_middle__0bq7B"></span>
      </div>
    </button>
    <button class="Domino-module_halfDomino__FWnOS">
      <div class="Domino-module_dotsWrapper__kkdAC">
        <span class="Domino-module_dot__z3BLH Domino-module_topLeft__MOH8P"></span>
        <span class="Domino-module_dot__z3BLH Domino-module_bottomRight__XsqaY"></span>
      </div>
    </button>
  </div>
</div>
```

### Board Grid

```html
<div class="Board-module_boardContainer__xtRPE">
  <div class="Board-module_backgroundWrapper__x5XOy">
    <section class="Board-module_background__q413m">
      <div class="Board-module_backgroundCell__R2Fku Board-module_roundedTopLeftCorner___MZ51"></div>
      <!-- more background cells -->
    </section>
  </div>
  <div class="Board-module_droppableWrapper__gEcg2">
    <section class="Board-module_droppable__bdR2Y">
      <div class="Board-module_droppableCell__ndah2"></div>
      <div class="Board-module_droppableCell__ndah2"></div>
      <div class="Board-module_droppableCell__ndah2 Board-module_hidden__DkSxz"></div>
      <!-- more droppable cells -->
    </section>
  </div>
</div>
```

## Implementation Strategy for Auto-Placement

### Approach 1: DOM Manipulation (Recommended Fallback)

Since there are no React event handlers on the cells and no accessible global state, direct DOM manipulation is challenging. The current overlay approach in `placer.js` is the most reliable method.

### Approach 2: Simulating Drag-and-Drop Events

To implement automated placement, you would need to:

1. **Find domino elements in the tray:**
   ```javascript
   const dominoes = document.querySelectorAll('.Tray-module_trayDominoWrapper__HxjLu');
   ```

2. **Identify domino values by counting dots:**
   ```javascript
   function getDominoValues(dominoWrapper) {
     const halves = dominoWrapper.querySelectorAll('.Domino-module_halfDomino__FWnOS');
     const firstDots = halves[0].querySelectorAll('.Domino-module_dot__z3BLH').length;
     const secondDots = halves[1].querySelectorAll('.Domino-module_dot__z3BLH').length;
     return [firstDots, secondDots];
   }
   ```

3. **Find target grid cells:**
   ```javascript
   const cells = document.querySelectorAll('.Board-module_droppableCell__ndah2:not(.Board-module_hidden__DkSxz)');
   ```

4. **Simulate drag-and-drop:**
   ```javascript
   function simulateDragDrop(sourceElement, targetElement) {
     // Create and dispatch drag events
     const dragStartEvent = new DragEvent('dragstart', { bubbles: true, cancelable: true });
     const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true });
     const dragEndEvent = new DragEvent('dragend', { bubbles: true, cancelable: true });
     
     sourceElement.dispatchEvent(dragStartEvent);
     targetElement.dispatchEvent(dropEvent);
     sourceElement.dispatchEvent(dragEndEvent);
   }
   ```

5. **Alternative: Pointer Events**
   ```javascript
   function simulatePointerDrag(sourceElement, targetElement) {
     const sourceRect = sourceElement.getBoundingClientRect();
     const targetRect = targetElement.getBoundingClientRect();
     
     // Dispatch pointerdown on source
     sourceElement.dispatchEvent(new PointerEvent('pointerdown', {
       bubbles: true,
       clientX: sourceRect.left + sourceRect.width / 2,
       clientY: sourceRect.top + sourceRect.height / 2
     }));
     
     // Dispatch pointermove to target
     document.dispatchEvent(new PointerEvent('pointermove', {
       bubbles: true,
       clientX: targetRect.left + targetRect.width / 2,
       clientY: targetRect.top + targetRect.height / 2
     }));
     
     // Dispatch pointerup on target
     targetElement.dispatchEvent(new PointerEvent('pointerup', {
       bubbles: true,
       clientX: targetRect.left + targetRect.width / 2,
       clientY: targetRect.top + targetRect.height / 2
     }));
   }
   ```

### Challenges

1. **No Event Handlers:** The droppable cells don't have visible React event handlers in their props, suggesting the drag-and-drop logic might be handled at a higher level or through a library.

2. **CSS Modules:** Class names are hashed and will change with each deployment, making the solution fragile.

3. **React Synthetic Events:** The game likely uses React's synthetic event system, which may not respond to manually dispatched native events.

4. **State Management:** Without access to the game's state management, it's difficult to know if placements are validated client-side.

### Recommendation

**Continue using the overlay approach** in `placer.js` as the primary solution. The overlay:
- Always works regardless of DOM changes
- Doesn't break with CSS Module hash changes
- Provides clear visual feedback
- Is the most maintainable solution

If you want to attempt automated placement:
1. Try pointer events first (more modern, better support)
2. Fall back to drag events if pointer events don't work
3. Monitor for any console errors or React warnings
4. Test extensively as the implementation may break with game updates
