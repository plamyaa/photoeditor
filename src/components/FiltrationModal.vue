<template>
  <div class="filtration-modal">
    <div class="panel-header">
      <button class="close-button" @click="close">x</button>
    </div>
    <div class="filtrations-graph">
      <select
        class="filtration-preset"
        @change="applyPreset($event.target.value)"
      >
        <option value="identity" title="Тождественное отображение">
          Identity Transformation
        </option>
        <option value="sharpen" title="Повышение резкости">Sharpen</option>
        <option value="gaussian" title="Фильтр Гаусса">
          Gaussian Filter (3x3)
        </option>
        <option value="boxBlur" title="Прямоугольное размытие">Box Blur</option>
      </select>
      <div class="filtration-content">
        <div class="filtration-inputs">
          <div class="point-inputs">
            <div
              v-for="(row, rowIndex) in kernel"
              class="point-inputs-column"
              :key="rowIndex"
            >
              <div
                v-for="(value, colIndex) in row"
                :key="colIndex"
                class="point-with-prefix"
              >
                <input
                  :value="kernel[rowIndex][colIndex]"
                  @change="(e) => updateKernel(e, rowIndex, colIndex)"
                />
                <!-- :disabled="previewEnabled" -->
              </div>
            </div>
          </div>
        </div>
        <div class="filtration-actions">
          <div class="custom-checkbox">
            <input type="checkbox" v-model="previewEnabled" />
            <img
              v-if="previewEnabled"
              class="checkbox-image"
              src="../assets/eye.png"
              alt="Lock"
            />
            <img
              v-else
              class="checkbox-image"
              src="../assets/closed-eye.png"
              alt="Unlock"
            />
          </div>
          <button class="filtration-button" @click="applyFiltration">
            Apply
          </button>
          <button class="filtration-button" @click="resetFiltration">
            Reset
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "FiltrationModal",
  props: {
    state: String,
    canvasRef: Object,
    origImg: Object,
    newImg: Object,
    dx: Number,
    dy: Number,
    ih: Number,
    iw: Number,
  },
  data() {
    return {
      previewEnabled: false,
      kernel: [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
      ],
    };
  },
  methods: {
    close() {
      this.$emit("close");
    },
    applyPreset(preset) {
      switch (preset) {
        case "identity":
          this.kernel = [
            [0, 0, 0],
            [0, 1, 0],
            [0, 0, 0],
          ];
          break;
        case "sharpen":
          this.kernel = [
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0],
          ];
          break;
        case "gaussian":
          this.kernel = [
            [1, 2, 1],
            [2, 4, 2],
            [1, 2, 1],
          ];
          break;
        case "boxBlur":
          this.kernel = [
            [1, 1, 1],
            [1, 1, 1],
            [1, 1, 1],
          ];
          break;
        default:
          break;
      }
    },
    updateKernel(event, rowIndex, colIndex) {
      const num = +event.target.value;

      if (!isNaN(num)) {
        this.kernel[rowIndex][colIndex] = num;
      } else {
        this.kernel[rowIndex][colIndex] += 1;
        this.kernel[rowIndex][colIndex] -= 1;
      }
    },
    calculateFiltration() {
      const ctx = this.canvasRef?.getContext("2d");
      const imageData = ctx.getImageData(this.dx, this.dy, this.iw, this.ih);
      const newData = new Uint8ClampedArray(imageData.data.length);

      // Обработка краев (padding)
      const paddedData = this.padImageData(
        imageData.data,
        imageData.width,
        imageData.height
      );

      // Свертка по каналам
      for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
          for (let c = 0; c < 4; c++) {
            // Каналы: R, G, B, A
            const outputIndex = (y * imageData.width + x) * 4 + c;
            let sum = 0;
            let kernelSum = 0;
            for (let ky = 0; ky < 3; ky++) {
              for (let kx = 0; kx < 3; kx++) {
                const inputIndex =
                  ((y + ky) * (imageData.width + 2) + (x + kx)) * 4 + c;
                sum += paddedData[inputIndex] * this.kernel[ky][kx];
                kernelSum += this.kernel[ky][kx];
              }
            }
            newData[outputIndex] = sum / kernelSum;
          }
        }
      }

      imageData.data.set(newData);
      ctx.putImageData(imageData, this.dx, this.dy);
    },

    padImageData(data, width, height) {
      const paddedWidth = width + 2;
      const paddedHeight = height + 2;
      const paddedData = new Uint8ClampedArray(paddedWidth * paddedHeight * 4);

      // Копирование исходных данных
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const inputIndex = (y * width + x) * 4;
          const outputIndex = ((y + 1) * paddedWidth + x + 1) * 4;
          paddedData.set(
            data.subarray(inputIndex, inputIndex + 4),
            outputIndex
          );
        }
      }

      // Обработка краев
      for (let y = 0; y < paddedHeight; y++) {
        for (let x = 0; x < paddedWidth; x++) {
          const outputIndex = (y * paddedWidth + x) * 4;
          if (
            x === 0 ||
            x === paddedWidth - 1 ||
            y === 0 ||
            y === paddedHeight - 1
          ) {
            const nearestX = Math.max(1, Math.min(x, paddedWidth - 2));
            const nearestY = Math.max(1, Math.min(y, paddedHeight - 2));
            const nearestIndex = (nearestY * paddedWidth + nearestX) * 4;
            paddedData.set(
              paddedData.subarray(nearestIndex, nearestIndex + 4),
              outputIndex
            );
          }
        }
      }
      return paddedData;
    },
    applyFiltration() {
      this.$emit("close");
      this.calculateFiltration();
    },
    resetFiltration() {
      this.$emit("revertNewImg");
      this.previewEnabled = false;
      this.applyPreset("identity");
    },
  },
  watch: {
    previewEnabled(newVal) {
      if (newVal) {
        this.calculateFiltration();
      } else {
        this.$emit("revertNewImg");
        this.previewEnabled = false;
      }
    },
  },
});
</script>

<style scoped lang="scss">
.filtration-modal {
  position: absolute;
  top: 0;
  right: 0;
  width: 200px;
  height: 120px;
  background: #ececec;
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-radius: 10px;

  .panel-header {
    display: flex;
    justify-content: flex-end;

    .close-button {
      font-size: 20px;
      cursor: pointer;
      font-weight: bold;
      color: #4f4f4f;
      background: transparent;
      border: none;
    }
  }

  .filtrations-graph {
    font-size: small;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .filtration-content {
    display: flex;
    gap: 10px;
    .filtration-inputs {
      display: flex;
      flex-direction: column;
      align-items: center;
      .point-inputs {
        display: flex;
        gap: 3px;

        .point-inputs-column {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .point-with-prefix {
          position: relative;
          input {
            height: 20px;
            width: 28px;
            border-radius: 5px;
            padding-left: 5px;
          }
        }
      }
    }

    .filtration-actions {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 3px;
      .filtration-button {
        height: 20px;
        width: 40px;
        background: #d4d4d4;
        border-radius: 5px;
        transition: 0.2s;
        &:hover {
          background: #a0a0a0;
        }
      }
    }
  }
}

.custom-checkbox {
  position: relative;
  display: inline-block;
  height: 20px;

  input,
  .checkbox-image {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }

  input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    &:hover {
      border-color: #a0a0a0;
    }
  }
}
</style>
