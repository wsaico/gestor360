import { useRef, useEffect, useState } from 'react'
import { X, RotateCcw } from 'lucide-react'

const SignatureCanvas = ({ onSave, onCancel, title = "Firma Digital" }) => {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Set drawing styles
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Fill white background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()

    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      }
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const startDrawing = (e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { x, y } = getCoordinates(e)

    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setIsEmpty(false)
  }

  const draw = (e) => {
    e.preventDefault()
    if (!isDrawing) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { x, y } = getCoordinates(e)

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
  }

  const handleSave = () => {
    if (isEmpty) {
      alert('Por favor, ingrese su firma antes de guardar')
      return
    }

    const canvas = canvasRef.current

    // Create a temporary canvas to resize the image
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')

    // Define max width for optimization
    const maxWidth = 500
    const scaleFactor = Math.min(1, maxWidth / canvas.width)

    tempCanvas.width = canvas.width * scaleFactor
    tempCanvas.height = canvas.height * scaleFactor

    // Draw resized image
    tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height)

    // Get optimized data URL (JPEG for smaller size, or PNG if transparency needed - signatures usually on white background)
    // Using PNG to keep transparency if ever needed, but at smaller resolution
    const signatureData = tempCanvas.toDataURL('image/png')

    onSave(signatureData)
  }

  return (
    <div className="w-full">
      <p className="text-sm text-gray-600 mb-2">
        Por favor, firme en el recuadro utilizando su mouse, trackpad o dedo.
      </p>

      <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden mb-4">
        <canvas
          ref={canvasRef}
          className="w-full h-64 cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={clearCanvas}
          className="btn btn-secondary btn-sm inline-flex items-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Limpiar</span>
        </button>

        <div className="space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary btn-md"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary btn-md"
          >
            Guardar Firma
          </button>
        </div>
      </div>
    </div>
  )
}

export default SignatureCanvas
