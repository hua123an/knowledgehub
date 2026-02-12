import { ref, onUnmounted } from 'vue'

export function useRecorder() {
  const isRecording = ref(false)
  const duration = ref(0)
  const isPaused = ref(false)

  let mediaRecorder: MediaRecorder | null = null
  let chunks: Blob[] = []
  let stream: MediaStream | null = null
  let timer: ReturnType<typeof setInterval> | null = null

  function startTimer() {
    duration.value = 0
    timer = setInterval(() => {
      if (!isPaused.value) {
        duration.value++
      }
    }, 1000)
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  async function start() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })
      chunks = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      mediaRecorder.start(100) // collect data every 100ms
      isRecording.value = true
      isPaused.value = false
      startTimer()
    } catch (err) {
      console.error('Failed to start recording:', err)
      throw err
    }
  }

  function pause() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause()
      isPaused.value = true
    }
  }

  function resume() {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume()
      isPaused.value = false
    }
  }

  async function stop(): Promise<File> {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder) {
        reject(new Error('No recorder'))
        return
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const timestamp = new Date().toLocaleString('zh-CN', {
          month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit',
        }).replace(/\//g, '-').replace(/\s/g, '_')
        const file = new File([blob], `录音_${timestamp}.webm`, { type: 'audio/webm' })

        // cleanup
        stopTimer()
        if (stream) {
          stream.getTracks().forEach(t => t.stop())
          stream = null
        }
        mediaRecorder = null
        chunks = []
        isRecording.value = false
        isPaused.value = false

        resolve(file)
      }

      mediaRecorder.stop()
    })
  }

  function cancel() {
    stopTimer()
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      stream = null
    }
    mediaRecorder = null
    chunks = []
    isRecording.value = false
    isPaused.value = false
    duration.value = 0
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  onUnmounted(() => {
    cancel()
  })

  return {
    isRecording,
    isPaused,
    duration,
    start,
    pause,
    resume,
    stop,
    cancel,
    formatDuration,
  }
}
