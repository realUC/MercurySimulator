const touchControl = {
  touches: new Map(),
  touchHistory: new Map(),
  
  init() {
    canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
    canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
    canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false })
  },

  handleTouchStart(e) {
    e.preventDefault()
    const now = performance.now()
    for (let touch of e.changedTouches) {
      const pos = this.getTouchPosition(touch)
      const polar = this.cartesianToPolar(pos.x, pos.y)
      
      this.touches.set(touch.identifier, {
        id: touch.identifier,
        x: pos.x,
        y: pos.y,
        angle: polar.angle,
        distance: polar.distance,
        lane: this.angleToLane(polar.angle),
        startTime: now,
        history: [{ x: pos.x, y: pos.y, time: now }]
      })
      
      this.touchHistory.set(touch.identifier, {
        history: [{ x: pos.x, y: pos.y, time: now }],
        startX: pos.x,
        startY: pos.y
      })
      
      this.checkNoteHit(touch.identifier, 'start')
    }
  },

  handleTouchMove(e) {
    e.preventDefault()
    const now = performance.now()
    for (let touch of e.changedTouches) {
      const touchData = this.touches.get(touch.identifier)
      if (!touchData) continue
      
      const pos = this.getTouchPosition(touch)
      const polar = this.cartesianToPolar(pos.x, pos.y)
      
      touchData.x = pos.x
      touchData.y = pos.y
      touchData.angle = polar.angle
      touchData.distance = polar.distance
      touchData.lane = this.angleToLane(polar.angle)
      
      const historyData = this.touchHistory.get(touch.identifier)
      if (historyData) {
        historyData.history.push({ x: pos.x, y: pos.y, time: now })
        if (historyData.history.length > 20) {
          historyData.history.shift()
        }
      }
      
      this.checkNoteHit(touch.identifier, 'move')
    }
  },

  handleTouchEnd(e) {
    e.preventDefault()
    for (let touch of e.changedTouches) {
      const touchData = this.touches.get(touch.identifier)
      if (touchData) {
        const historyData = this.touchHistory.get(touch.identifier)
        const flickDirection = this.detectFlickDirection(historyData)
        
        this.checkNoteHit(touch.identifier, 'end', flickDirection)
      }
      this.touches.delete(touch.identifier)
      this.touchHistory.delete(touch.identifier)
    }
  },

  getTouchPosition(touch) {
    const rect = canvas.getBoundingClientRect()
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    }
  },

  cartesianToPolar(x, y) {
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const dx = x - centerX
    const dy = y - centerY
    
    const distance = Math.sqrt(dx * dx + dy * dy)
    let angle = Math.atan2(dy, dx)
    
    angle = angle + Math.PI / 2
    if (angle < 0) angle += Math.PI * 2
    
    return { distance, angle }
  },

  angleToLane(angle) {
    const laneAngle = (Math.PI * 2) / 60
    const lane = Math.floor(angle / laneAngle)
    return (60 - lane) % 60
  },

  detectFlickDirection(historyData) {
    if (!historyData || historyData.history.length < 2) return null
    
    const history = historyData.history
    const start = history[0]
    const end = history[history.length - 1]
    
    const dx = end.x - start.x
    const dy = end.y - start.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    if (dist < 30) return null
    
    const angle = Math.atan2(dy, dx)
    const angleDeg = angle * 180 / Math.PI
    
    if (angleDeg >= -45 && angleDeg <= 45) return 'right'
    if (angleDeg >= 45 && angleDeg <= 135) return 'down'
    if (angleDeg >= 135 || angleDeg <= -135) return 'left'
    if (angleDeg >= -135 && angleDeg <= -45) return 'up'
    
    return null
  },

  getTouchLane(touchId) {
    const touchData = this.touches.get(touchId)
    return touchData ? touchData.lane : -1
  },

  getTouchDistance(touchId) {
    const touchData = this.touches.get(touchId)
    return touchData ? touchData.distance : -1
  },

  isTouchingLane(touchId, lane, width = 1) {
    const touchLane = this.getTouchLane(touchId)
    if (touchLane < 0) return false
    
    if (width >= 60) return true
    
    const startLane = (60 - lane - width) % 60
    const endLane = (60 - lane) % 60
    
    if (startLane < endLane) {
      return touchLane >= startLane && touchLane < endLane
    } else {
      return touchLane >= startLane || touchLane < endLane
    }
  },

  checkNoteHit(touchId, phase, flickDirection = null) {
    if (!window.gameState || !window.gameState.checkNoteHit) return
    
    const touchData = this.touches.get(touchId)
    if (!touchData) return
    
    window.gameState.checkNoteHit({
      id: touchId,
      lane: touchData.lane,
      distance: touchData.distance,
      phase: phase,
      flickDirection: flickDirection,
      startTime: touchData.startTime
    })
  }
}

touchControl.init()