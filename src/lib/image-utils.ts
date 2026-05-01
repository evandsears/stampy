import { format } from 'date-fns';

export function getTodayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

export async function createStampImage(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation: number = 0
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // Desired stamp dimensions
  const stampWidth = 400;
  const stampHeight = (pixelCrop.height / pixelCrop.width) * stampWidth;

  canvas.width = stampWidth;
  canvas.height = stampHeight;

  // Draw the cropped photo directly filling the canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    stampWidth,
    stampHeight
  );

  // Cut out the perforations along the edges
  // Using destination-out to carve transparency
  ctx.globalCompositeOperation = 'destination-out';
  
  const holeRadius = 6;
  const holeSpacing = 20;

  // Function to draw holes along a line
  const drawHoles = (startX: number, startY: number, endX: number, endY: number) => {
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate how many holes fit perfectly
    const numHoles = Math.floor(distance / holeSpacing);

    for (let i = 0; i <= numHoles; i++) {
      const x = startX + (dx * (i / numHoles));
      const y = startY + (dy * (i / numHoles));
      
      ctx.beginPath();
      ctx.arc(x, y, holeRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Top edge
  drawHoles(0, 0, canvas.width, 0);
  // Bottom edge
  drawHoles(0, canvas.height, canvas.width, canvas.height);
  // Left edge
  drawHoles(0, 0, 0, canvas.height);
  // Right edge
  drawHoles(canvas.width, 0, canvas.width, canvas.height);

  // Reset composition and export as WebP to preserve transparency with smaller file size
  ctx.globalCompositeOperation = 'source-over';
  return canvas.toDataURL('image/webp', 0.8);
}
