<template>
  <div class="editor">
    <canvas
      ref="canvas"
      class="canvas"
      id="canvas"
      :class="stateCursor"
      @mousedown="handleMouseDown"
    ></canvas>
    <StatusBar
      :state="state"
      :imageHeight="ih"
      :imageWidth="iw"
      :pickedColor="pickedColor"
      :xMouse="xMouse"
      :yMouse="yMouse"
      :scale="scale"
      @updateScale="updateScale"
    />
  </div>
  <ModalWindow v-show="isShowModal" @close="closeModal">
    <template v-slot:body>
      <div class="modal">
        <p>Total pixels before: {{ (iw * ih) / 1000000 }} MP</p>
        <p>Total pixels after: {{ getMP() }} MP</p>
        <label for="resizeUnit">Resize Unit:</label>
        <select
          v-model="resizeUnit"
          @change="updateModal($event)"
          id="resizeUnit"
        >
          <option value="percentage">Percentage</option>
          <option value="pixels">Pixels</option>
        </select>
        <label for="width">Width:</label>
        <input :value="newiw" @input="updateNewiw" id="width" type="number" />
        <label for="height">Height:</label>
        <input :value="newih" @input="updateNewih" id="height" type="number" />
        <label>
          <input
            v-model="bind"
            @input="() => (newih = newiw)"
            type="checkbox"
          />
          Bind width and height
        </label>
        <label for="interpolation">Interpolation Algorithm:</label>
        <select v-model="interpolation" id="interpolation">
          <option
            value="nearestNeighbor"
            title="Nearest Neighbor: Each pixel in the new image is assigned the value of the nearest pixel in the original image."
          >
            Nearest Neighbor
          </option>
        </select>
      </div>
    </template>
    <template v-slot:footer>
      <button @click="handleModalConfirm" class="confirm-button">
        Confirm
      </button>
    </template>
  </ModalWindow>
</template>

<script>
import { defineComponent } from "vue";
import ModalWindow from "./ModalWindow";
import StatusBar from "./StatusBar";

export default defineComponent({
  name: "MainEditor",
  components: { ModalWindow, StatusBar },
  props: {
    selectedImage: String,
    state: String,
  },
  data() {
    return {
      canvasRef: null,
      pickedColor: "",
      stateCursor: null,
      iw: null,
      ih: null,
      xMouse: null,
      yMouse: null,
      isShowModal: false,
      scale: 100,
      newiw: null,
      newih: null,
      bind: false,
      resizeUnit: "pixels",
      interpolation: "nearestNeighbor",
    };
  },
  emits: ["changeState"],
  mounted() {
    this.canvasRef = this.$refs.canvas;
    this.maxWidth = this.canvasRef.clientWidth;
    this.maxHeight = this.canvasRef.clientHeight;
  },
  methods: {
    drawImageOnCanvas(width = null, height = null) {
      const canvas = this.canvasRef;
      const ctx = this.canvasRef?.getContext("2d");
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        canvas.width = this.canvasRef.clientWidth;
        canvas.height = this.canvasRef.clientHeight;

        const [iw, ih, dx, dy] = this.getImageSizes(
          canvas,
          width && height ? { width, height } : img
        );
        ctx.drawImage(img, dx, dy, iw, ih);
        this.iw = Math.trunc(iw);
        this.ih = Math.trunc(ih);

        // интерполяция
        const imageData = ctx.getImageData(dx, dy, iw, ih);
        const newImageData = this.nearestNeighborInterpolation(
          imageData,
          ~~iw,
          ~~ih
        );

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(newImageData, dx, dy);
      };
      img.src = this.selectedImage;
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
        const newcw = cw * sizeCoef;
        const newch = ch * sizeCoef;
        const newdx = (width - newcw) / 2;
        const newdy = (height - newch) / 2;

        return [newcw, newch, newdx, newdy];
      }
    },
    getSizeType(iw, ih, cw, ch) {
      // Все в рамках
      if (iw <= cw && ih <= ch) return "smaller";
      // Ширина больше; Высота в рамках
      if (cw <= iw && ih <= ch) return "widthLarger";
      // Высота больше; Ширина в рамках
      if (ch <= ih && iw <= cw) return "heightLarger";
      // Больше всех рамок
      if (cw < iw && ch < iw) return "allLarger";
    },
    handleMouseDown(event) {
      if (this.state == "pipette") {
        this.handleColorPick(event);
        this.handleCoordinates(event);
      }
    },
    handleColorPick({ offsetX, offsetY }) {
      const ctx = this.canvasRef.getContext("2d");
      if (!ctx) return;

      const pixel = ctx.getImageData(offsetX, offsetY, 1, 1).data;
      const color = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;

      this.pickedColor = color;
    },
    handleCoordinates({ offsetX, offsetY }) {
      const cw = this.canvasRef.width;
      const ch = this.canvasRef.height;
      const iw = this.iw;
      const ih = this.ih;

      const sizeType = this.getSizeType(iw, ih, cw, ch);
      switch (sizeType) {
        case "smaller":
          this.xMouse = Math.trunc(offsetX - (cw - iw) / 2);
          this.yMouse = Math.trunc(offsetY - (ch - ih) / 2);
          break;
        case "widthLarger":
          this.xMouse = iw - cw + offsetX;
          this.yMouse = Math.trunc(offsetY - (ch - ih) / 2);
          break;
        case "heightLarger":
          this.xMouse = this.xMouse = Math.trunc(offsetX - (cw - iw) / 2);
          this.yMouse = ih - ch + offsetY;
          break;
        case "allLarger":
          this.xMouse = iw - cw + offsetX;
          this.yMouse = ih - ch + offsetY;
          break;
        default:
          this.xMouse = null;
          this.yMouse = null;
          break;
      }
    },
    closeModal() {
      this.isShowModal = false;
      this.$emit("changeState", "");
    },
    updateScale(value) {
      this.drawImageOnCanvas();
      this.scale = +value;
    },
    handleModalConfirm() {
      this.scale = 100;
      if (this.resizeUnit === "pixels") {
        this.drawImageOnCanvas(this.newiw, this.newih);
      }
      if (this.resizeUnit === "percentage") {
        const { width, height } = this.canvasRef;
        const widthPercent = width / 100;
        const heightPercent = height / 100;
        this.drawImageOnCanvas(
          this.newiw * widthPercent,
          this.newih * heightPercent
        );
      }
    },
    updateModal() {
      console.log(this.resizeUnit);
      if (this.resizeUnit === "pixels") {
        this.newiw = this.iw;
        this.newih = this.ih;
      }
      if (this.resizeUnit === "percentage") {
        const { width, height } = this.canvasRef;
        const widthPercent = width / 100;
        const heightPercent = height / 100;

        this.newiw = Math.trunc(this.iw / widthPercent);
        this.newih = Math.trunc(this.ih / heightPercent);
      }
    },
    updateNewiw(event) {
      const value = +event.target.value;
      console.log(value);
      if (value <= 0) this.newiw = 1;
      else this.newiw = value;
      if (this.bind) this.newih = value;
    },
    updateNewih(event) {
      const value = +event.target.value;
      if (value <= 0) this.newih = 1;
      else this.newih = value;
      if (this.bind) this.newiw = value;
    },
    getMP() {
      if (this.resizeUnit === "pixels") {
        return ((this.newiw * this.newih) / 1000000).toFixed(5);
      }
      if (this.resizeUnit === "percentage") {
        const { width, height } = this.canvasRef;
        const percentage = (width / 100) * (height / 100);

        return ((this.newiw * this.newih * percentage) / 1000000).toFixed(5);
      }
    },
    nearestNeighborInterpolation(img, newWidth, newHeight) {
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
      console.log(newData, newWidth, newHeight);
      return new ImageData(newData, newWidth, newHeight);
    },
  },
  watch: {
    state(newValue) {
      if (newValue === "pipette") {
        this.stateCursor = "pipette";
      }
      if (newValue === "modal") {
        this.isShowModal = true;
      } else this.stateCursor = null;
    },
    selectedImage() {
      this.scale = 100;
      this.drawImageOnCanvas();
    },
    isShowModal(newValue) {
      if (newValue) {
        this.updateModal();
      }
    },
  },
});
</script>

<style scoped lang="scss">
.editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.canvas {
  flex: 1;
}
.confirm-button {
  cursor: pointer;
}
</style>
