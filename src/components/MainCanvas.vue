<template>
  <canvas
    ref="canvas"
    class="canvas"
    id="canvas"
    :class="state"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @wheel="handleMouseWheel"
    tabindex="0"
  ></canvas>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "MainCanvas",
  props: {
    state: String,
    img: String,
    newImg: Object,
    scale: Number,
    interpolationCb: Function,
    newiw: Number,
    newih: Number,
  },
  data() {
    return {
      isDragging: false,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
      isShiftPressed: false,
    };
  },
  mounted() {
    this.canvasRef = this.$refs.canvas;
    window.addEventListener("keydown", this.handlePressShiftKey);
    window.addEventListener("keyup", this.handleUnpressShiftKey);
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.handleEscapeKey);
    window.removeEventListener("keyup", this.handleUnpressShiftKey);
  },
  methods: {
    getCanvasRef() {
      return this.canvasRef;
    },
    drawImage() {
      const canvas = this.canvasRef;
      const ctx = this.canvasRef?.getContext("2d");
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = this.canvasRef.clientWidth;
        canvas.height = this.canvasRef.clientHeight;
        ctx.imageSmoothingEnabled = false;

        const [dx, dy, iw, ih] = this.getImageSizes(canvas, img);
        const imageData = ctx.getImageData(dx, dy, iw, ih);
        if (this.imageData instanceof ImageData) {
          const interpolatedData = this.interpolationCb(imageData, ~~iw, ~~ih);
          if (interpolatedData !== null) {
            ctx.putImageData(interpolatedData, dx, dy);
          }
        } else {
          ctx.drawImage(img, dx, dy, iw, ih);
        }
        this.offsetX = dx;
        this.offsetY = dy;
        this.$emit("updateImageSizes", ~~iw, ~~ih);
      };
      img.src = this.img;
    },
    drawImageWithParameters(img, dx, dy, iw, ih) {
      const canvas = this.canvasRef;
      const ctx = this.canvasRef?.getContext("2d");
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = this.canvasRef.clientWidth;
        canvas.height = this.canvasRef.clientHeight;
        ctx.imageSmoothingEnabled = false;

        ctx.drawImage(img, dx, dy, iw, ih);
        this.offsetX = dx;
        this.offsetY = dy;
        this.$emit("updateImageSizes", iw, ih);
      };
      img.src = this.img;
    },
    moveImage(dx, dy) {
      const canvas = this.canvasRef;
      const ctx = this.canvasRef?.getContext("2d");
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = this.canvasRef.clientWidth;
        canvas.height = this.canvasRef.clientHeight;
        ctx.imageSmoothingEnabled = false;

        const [, , iw, ih] = this.getImageSizes(canvas, img);
        ctx.drawImage(img, dx, dy, iw, ih);
      };
      img.src = this.img;
    },
    handleMouseDown(e) {
      this.isDragging = true;
      this.startX = e.clientX - this.offsetX;
      this.startY = e.clientY - this.offsetY;

      if (this.state == "pipette") {
        this.$emit("updateColor", this.handleColorPick(e));
        this.$emit("updateCoordinates", ...this.handleCoordinates(e));
      }
    },
    handleMouseUp(e) {
      this.isDragging = false;
    },
    handleMouseMove(e) {
      if (this.state === "hand" && this.isDragging) {
        const x = e.clientX - this.startX;
        const y = e.clientY - this.startY;
        this.offsetX = x;
        this.offsetY = y;
        this.moveImage(x, y);
      }
    },
    handleMouseWheel(event) {
      event.preventDefault();
      const delta = Math.sign(event.deltaY);

      if (this.isShiftPressed) {
        this.offsetX -= delta * 7;
      } else {
        this.offsetY += delta * 7;
      }

      this.moveImage(this.offsetX, this.offsetY); // Перерисовываем канвас
    },
    handlePressShiftKey(event) {
      if (event.key === "Shift") {
        this.isShiftPressed = true;
      }
    },
    handleUnpressShiftKey(event) {
      if (event.key === "Shift") {
        this.isShiftPressed = false;
      }
    },
    getImageSizes(canvas, img) {
      const offset = 100;
      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.width;
      const ih = img.height;

      return getScaledSize(canvas, getSizeType(iw, ih, cw, ch), this.scale);

      function getSizeType() {
        // Все в рамках
        if (iw <= cw && ih <= ch) return getSmaller();
        // Ширина больше; Высота в рамках
        if (cw <= iw && ih <= ch) return getWidthLarger();
        // Высота больше; Ширина в рамках
        if (ch <= ih && iw <= cw) return getHeightLarger();
        // Больше всех рамок
        if (cw < iw && ch < iw) return getAllLarger();
      }

      function getSmaller() {
        const dx = (cw - iw) / 2;
        const dy = (ch - ih) / 2;

        return [iw, ih, dx, dy];
      }

      function getWidthLarger() {
        const coef = cw / iw;
        const heightResize = ih * coef;
        const dx = offset / 2;
        const dy = Math.abs(heightResize - ch) / 2;

        return [cw - offset, heightResize, dx, dy];
      }

      function getHeightLarger() {
        const coef = ch / ih;
        const widthResize = iw * coef;
        const dx = Math.abs(widthResize - cw) / 2;
        const dy = offset / 2;

        return [widthResize, ch - offset, dx, dy];
      }

      function getAllLarger() {
        if (ih <= iw) return getWidthLarger();
        if (iw < ih) return getHeightLarger();
      }

      function getScaledSize({ width, height }, [cw, ch, ,], scale) {
        const sizeCoef = scale / 100;
        const newiw = cw * sizeCoef;
        const newih = ch * sizeCoef;
        const newdx = (width - newiw) / 2;
        const newdy = (height - newih) / 2;

        return [newdx, newdy, newiw, newih];
      }
    },
    handleColorPick({ offsetX, offsetY }) {
      const ctx = this.canvasRef.getContext("2d");
      if (!ctx) return;

      const pixel = ctx.getImageData(offsetX, offsetY, 1, 1).data;
      return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
    },
    handleCoordinates({ offsetX, offsetY }) {
      const cw = this.canvasRef.width;
      const ch = this.canvasRef.height;
      const iw = this.iw;
      const ih = this.ih;

      if (iw <= cw && ih <= ch)
        return [
          Math.trunc(offsetX - (cw - iw) / 2),
          Math.trunc(offsetY - (ch - ih) / 2),
        ];
      if (cw <= iw && ih <= ch)
        return [iw - cw + offsetX, Math.trunc(offsetY - (ch - ih) / 2)];
      if (ch <= ih && iw <= cw)
        return [Math.trunc(offsetX - (cw - iw) / 2), ih - ch + offsetY];
      if (cw < iw && ch < iw) return [iw - cw + offsetX, ih - ch + offsetY];
    },
    handleImageProportions() {
      if (this.newImg) {
        const [dx, dy, iw, ih] = this.getImageSizes(
          this.canvasRef,
          this.newImg
        );
        this.drawImageWithParameters(this.newImg, dx, dy, iw, ih);
      } else {
        this.drawImage();
      }
    },
  },
  watch: {
    img() {
      this.handleImageProportions();
    },
    newImg: {
      handler() {
        this.handleImageProportions();
      },
      deep: true,
    },
    scale() {
      this.handleImageProportions();
    },
  },
});
</script>

<style>
.canvas {
  flex: 1;
}

.pipette {
  cursor: crosshair;
}
</style>