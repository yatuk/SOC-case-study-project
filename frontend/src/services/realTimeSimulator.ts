// Real-time event simulation service
import { generateRandomEvent } from '@/lib/mockData'
import type { Event } from '@/types'

type EventCallback = (event: Event) => void

class RealTimeSimulator {
  private intervalId: number | null = null
  private callbacks: Set<EventCallback> = new Set()
  private isRunning = false
  private intervalMs = 1000 // 1 second between events (realistic SIEM)

  start() {
    if (this.isRunning) return

    this.isRunning = true
    this.intervalId = window.setInterval(() => {
      const event = generateRandomEvent() as Event
      this.callbacks.forEach((cb) => cb(event))
    }, this.intervalMs)

    console.log('[RealTimeSimulator] Started')
  }

  stop() {
    if (!this.isRunning) return

    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId)
      this.intervalId = null
    }

    this.isRunning = false
    console.log('[RealTimeSimulator] Stopped')
  }

  subscribe(callback: EventCallback) {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  getStatus() {
    return this.isRunning
  }
}

export const realTimeSimulator = new RealTimeSimulator()
