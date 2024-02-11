<template>
  <div class="editor">
    <canvas
      ref="canvas"
      class="canvas"
      :class="stateCursor"
      @mousedown="handleMouseDown"
    ></canvas>
    <div class="info">
      <span v-if="state"> State: {{ state }} </span>
      <span v-if="imageWidth && imageHeight">
        | Width: {{ imageWidth }} Height: {{ imageHeight }}
      </span>
      <span v-if="state === 'pipette' && pickedColor">
        | Color: {{ pickedColor }}
      </span>
    </div>
  </div>
</template>

<script>
import { defineComponent, watch } from "vue";

export default defineComponent({
  name: "MainEditor",
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
    };
  },
  mounted() {
    this.canvasRef = this.$refs.canvas;
    this.setupImageWatcher();
  },
  methods: {
    setupImageWatcher() {
      watch(
        () => this.selectedImage,
        (newImage) => {
          if (newImage) {
            this.drawImageOnCanvas(newImage);
          }
        }
      );
    },
    drawImageOnCanvas(imageUrl) {
      const ctx = this.canvasRef?.getContext("2d");
      const img = new Image();

      img.onload = () => {
        this.canvasRef.width = img.width;
        this.canvasRef.height = img.height;
        this.imageWidth = img.width;
        this.imageHeight = img.height;
        ctx?.drawImage(img, 0, 0, img.width, img.height);
      };

      img.src = imageUrl;
    },
    handleMouseDown(event) {
      if (this.state == "pipette") {
        this.handleColorPick(event);
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
  },
  watch: {
    state(newValue) {
      if (newValue === "pipette") {
        this.stateCursor = "pipette";
      } else this.stateCursor = null;
    },
  },
});
</script>

<style scoped lang="scss">
.editor {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.canvas {
  width: 100%;
  height: calc(100% - 20px);
}

.info {
  height: 20px;
  background: #e5e5e5;
  display: flex;
  gap: 5px;
}

.pipette {
  cursor: crosshair;
}
</style>
