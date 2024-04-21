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
  <CorrectionModal
    v-show="isShowCorrection"
    :state="state"
    :canvasRef="canvasRef || {}"
    :origImg="origImg"
    :newImg="newImg"
    :dx="offsetX"
    :dy="offsetY"
    :iw="iw"
    :ih="ih"
    @updateNewImgData="(data) => $emit('updateNewImgData', data)"
    @revertNewImg="$emit('revertNewImg')"
    @close="$emit('closeCorrection')"
  />
</template>

<script>
import { defineComponent } from "vue";
import CorrectionModal from "./CorrectionModal.vue";

export default defineComponent({
  name: "MainCanvas",
  components: { CorrectionModal },
  props: {
    state: String,
    img: String,
    origImg: Object,
    newImg: Object,
    scale: Number,
    interpolationCb: Function,
    newiw: Number,
    newih: Number,
    isShowCorrection: Boolean,
  },
  emits: [
    "updateImageSizes",
    "updateColor",
    "updateCoordinates",
    "closeCorrection",
    "revertNewImg",
    "updateNewImgData",
  ],
  data() {
    return {
      isDragging: false,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
      isShiftPressed: false,
      iw: 0,
      ih: 0,
      canvasRef: null,
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
    drawImage(newImg) {
      const canvas = this.canvasRef;
      const ctx = this.canvasRef?.getContext("2d");
      const img = newImg;
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
        this.iw = iw;
        this.ih = ih;
        this.$emit("updateImageSizes", iw, ih);
      };
      img.src = this.newImg.src;
    },
    moveImage() {
      const canvas = this.canvasRef;
      if (this.offsetX + 10 > canvas.width) {
        this.offsetX = canvas.width - 10;
      }
      if (this.offsetX + 10 > canvas.height) {
        this.offsetY = canvas.height - 10;
      }
      if (this.offsetX + this.iw < 10) {
        this.offsetX = -this.iw + 10;
      }
      if (this.offsetY + this.ih < 10) {
        this.offsetY = -this.ih + 10;
      }

      const ctx = this.canvasRef?.getContext("2d");
      const img = this.newImg;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = this.canvasRef.clientWidth;
        canvas.height = this.canvasRef.clientHeight;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, this.offsetX, this.offsetY, this.iw, this.ih);
      };
      img.src = this.newImg.src;
    },
    handleMouseDown(e) {
      this.isDragging = true;
      this.startX = e.clientX - this.offsetX;
      this.startY = e.clientY - this.offsetY;

      if (this.state == "pipette") {
        this.$emit("updateColor", this.handleColorPick(e));
        this.$emit("updateCoordinates", this.handleCoordinates(e));
      }
    },
    handleMouseUp() {
      this.isDragging = false;
    },
    handleMouseMove(e) {
      if (this.state === "hand" && this.isDragging) {
        const x = e.clientX - this.startX;
        const y = e.clientY - this.startY;
        this.offsetX = x;
        this.offsetY = y;
        this.moveImage();
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

      this.moveImage();
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
    handleCoordinates({ offsetX, offsetY, clientX, clientY }) {
      const x = clientX - this.startX;
      const y = clientY - this.startY;
      const xMouse = offsetX - x;
      const yMouse = offsetY - y;

      if (
        xMouse <= 0 ||
        yMouse <= 0 ||
        this.iw <= xMouse ||
        this.ih <= yMouse
      ) {
        return [null, null];
      }
      return [~~xMouse, ~~yMouse];
    },
    saveImage() {
      const imageDataURL = this.canvasRef.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imageDataURL;
      link.download = "my_image.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
  },
  watch: {
    state(newVal) {
      if (newVal === "save") {
        this.saveImage();
      }
    },
    newImg() {
      this.drawImage(this.newImg);
    },
    scale() {
      this.drawImage(this.newImg);
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

.hand {
  cursor: grab;
}
</style>
