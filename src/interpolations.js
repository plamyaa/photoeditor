export function nearestNeighborInterpolation(img, newWidth, newHeight) {
  const originalWidth = img.width;
  const originalHeight = img.height;
  const scaleX = originalWidth / newWidth;
  const scaleY = originalHeight / newHeight;
  const newData = new Uint8ClampedArray(newWidth * newHeight * 4);

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const px = Math.floor(x * scaleX);
      const py = Math.floor(y * scaleY);
      const index = (y * newWidth + x) * 4;
      const originalIndex = (py * originalWidth + px) * 4;

      newData[index] = img.data[originalIndex];
      newData[index + 1] = img.data[originalIndex + 1];
      newData[index + 2] = img.data[originalIndex + 2];
      newData[index + 3] = img.data[originalIndex + 3];
    }
  }
  return new ImageData(newData, newWidth, newHeight);
}
