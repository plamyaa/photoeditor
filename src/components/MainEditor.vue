<template>
  <div class="editor">
    <canvas
      ref="canvas"
      class="canvas"
      :class="stateCursor"
      @mousedown="handleMouseDown"
    ></canvas>
    <StatusBar
      :state="state"
      :imageHeight="imageHeight"
      :imageWidth="imageWidth"
      :pickedColor="pickedColor"
      :xMouse="xMouse"
      :yMouse="yMouse"
      :scale="scale"
      :maxScale="maxScale"
      @updateScale="updateScale"
    />
  </div>
  <ModalWindow v-show="isShowModal" @close="closeModal">
    <template v-slot:body>
      <div class="modal">
        <p>
          Total pixels before:
          {{ (imageWidth * imageHeight) / 1000000 }} MP
        </p>
        <p>Total pixels after: {{ (newWidth * newHeight) / 1000000 }} MP</p>

        <label for="resizeUnit">Resize Unit:</label>
        <select v-model="resizeUnit" id="resizeUnit">
          <option value="percentage">Percentage</option>
          <option value="pixels">Pixels</option>
        </select>

        <label for="width">Width:</label>
        <input
          :value="newWidth"
          @change="handleNewWidthChange"
          @blur="handleNewWidthBlur"
          id="width"
          type="number"
        />
        <label for="height">Height:</label>
        <input
          :value="newHeight"
          @change="handleNewHeightChange"
          @blur="handleNewHeightBlur"
          id="height"
          type="number"
        />

        <label>
          <input v-model="maintainAspectRatio" type="checkbox" />
          Maintain Aspect Ratio
        </label>

        <label for="interpolation">Interpolation Algorithm:</label>
        <select v-model="interpolation" id="interpolation">
          <option value="nearestNeighbor">Nearest Neighbor</option>
          <!-- Add other interpolation options if needed -->
        </select>

        <div v-if="interpolation === 'nearestNeighbor'" class="tooltip">
          Nearest Neighbor: Each pixel in the new image is assigned the value of
          the nearest pixel in the original image.
        </div>
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
      imageWidth: null,
      imageHeight: null,
      xMouse: null,
      yMouse: null,
      isShowModal: false,
      scale: 100,
      maxScale: 300,
      maxWidth: null,
      maxHeight: null,
      newWidth: null,
      newHeight: null,
      maintainAspectRatio: false,
      resizeUnit: "percentage",
      interpolation: "nearestNeighbor",
      newPixels: null,
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
        canvas.width = this.canvasRef.clientWidth;
        canvas.height = this.canvasRef.clientHeight;

        let newImageWidth, newImageHeight;
        if (canvas.width < img.width) {
          const coef = canvas.width / img.width;
          newImageWidth = canvas.width - 100;
          newImageHeight = canvas.height * coef;
        } else if (canvas.height < img.height) {
          const coef = canvas.height / img.height;
          newImageWidth = canvas.width * coef;
          newImageHeight = canvas.height - 100;
        }

        if (width && height) {
          newImageWidth = width;
          newImageHeight = height;
        }

        newImageWidth = newImageWidth * (this.scale / 100);
        newImageHeight = newImageHeight * (this.scale / 100);

        if (canvas.width <= newImageWidth || canvas.height <= newImageHeight) {
          this.maxScale = this.scale;
        }

        const leftOffset = Math.abs(canvas.width - newImageWidth) / 2;
        const topOffset = Math.abs(canvas.height - newImageHeight) / 2;

        ctx.drawImage(
          img,
          leftOffset,
          topOffset,
          newImageWidth,
          newImageHeight
        );

        this.imageWidth = Math.trunc(newImageWidth);
        this.imageHeight = Math.trunc(newImageHeight);
        this.newWidth = Math.trunc(newImageWidth);
        this.newHeight = Math.trunc(newImageHeight);
      };

      img.src = this.selectedImage;
    },
    handleMouseDown(event) {
      if (this.state == "pipette") {
        this.handleColorPick(event);
        this.handleCoordinates();
      }
    },
    handleColorPick(event) {
      const ctx = this.canvasRef.getContext("2d");
      if (!ctx) return;

      const x = event.offsetX;
      const y = event.offsetY;

      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const color = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;

      this.pickedColor = color;
    },
    handleCoordinates() {
      const canvas = this.canvasRef;
      const leftCoordinate =
        event.offsetX - Math.abs(canvas.width - this.imageWidth) / 2;
      const topCoordinate =
        event.offsetY - Math.abs(canvas.height - this.imageHeight) / 2;

      if (
        leftCoordinate > 0 &&
        topCoordinate > 0 &&
        this.imageWidth - leftCoordinate > 0 &&
        this.imageHeight - topCoordinate > 0
      ) {
        this.xMouse = Math.trunc(leftCoordinate);
        this.yMouse = Math.trunc(topCoordinate);
      } else {
        this.xMouse = null;
        this.yMouse = null;
      }
    },
    closeModal() {
      this.isShowModal = false;
      this.$emit("changeState", "");
    },
    updateScale(value) {
      this.scale = +value;
      this.drawImageOnCanvas();
    },
    handleModalConfirm() {
      this.drawImageOnCanvas(this.newWidth, this.newHeight);
    },
    handleNewWidthChange(event) {
      const value = +event.target.value;
      if (value < this.maxWidth) {
        this.newWidth = value;
      } else if (value > this.maxWidth) {
        this.newWidth = this.maxWidth;
      }
      if (value < 1) {
        this.newWidth = 1;
      }
    },
    handleNewHeightChange(event) {
      const value = +event.target.value;
      if (value < this.maxHeight) {
        this.newHeight = value;
      } else if (value > this.maxHeight) {
        this.newHeight = this.maxHeight;
      }
      if (value < 1) {
        this.newHeight = 1;
      }
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
      this.drawImageOnCanvas();
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
