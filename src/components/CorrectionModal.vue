<template>
  <div class="correction-info-panel">
    <div class="panel-header">
      <button class="close-button" @click="close">x</button>
    </div>
    <div class="correction-inputs">
      <div class="point-inputs">
        <div class="point-with-prefix">
          <label for="x1" :style="{ left: '3px' }">x1</label>
          <input
            id="x1"
            :value="point1x"
            @change="updateX1"
            :disabled="previewEnabled"
          />
        </div>
        <div class="point-with-prefix">
          <label for="y1" :style="{ left: '3px' }">y1</label>
          <input
            id="y1"
            :value="point1y"
            @change="updateY1"
            :disabled="previewEnabled"
          />
        </div>
      </div>
      <div class="point-inputs">
        <div class="point-with-prefix">
          <label for="x2" :style="{ left: '3px' }">x2</label>
          <input
            id="x2"
            :value="point2x"
            @change="updateX2"
            :disabled="previewEnabled"
          />
        </div>
        <div class="point-with-prefix">
          <label for="y2" :style="{ left: '3px' }">y2</label>
          <input
            id="y2"
            :value="point2y"
            @change="updateY2"
            :disabled="previewEnabled"
          />
        </div>
      </div>
      <div class="correction-preview">
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
      </div>
    </div>
    <div class="correction-actions">
      <button
        class="correction-button"
        @click="applyCorrection"
        :disabled="imgCorrected"
      >
        Apply
      </button>
      <button class="correction-button" @click="resetValues">Reset</button>
    </div>
    <div class="correction-graph">
      <canvas id="chart" width="100" height="100" ref="chart"></canvas>
    </div>
  </div>
</template>

<script>
import { defineComponent } from "vue";
import Chart from "chart.js/auto";

export default defineComponent({
  name: "CorrectionModal",
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
  mounted() {
    this.chartRef = this.$refs.chart;
  },
  data() {
    return {
      point1x: 0,
      point1y: 0,
      point2x: 255,
      point2y: 255,
      previewEnabled: false,
      chartInstance: null,
      imgCorrected: false,
    };
  },
  methods: {
    close() {
      this.$emit("close");
    },
    normalizeHistogram(histogram) {
      const max = Math.max(...histogram);
      return histogram.map((value) => (value / max) * 255);
    },
    buildGraph() {
      const img = new Image();
      img.onload = () => {
        const ctx = this.canvasRef?.getContext("2d");
        try {
          const imageData = ctx.getImageData(
            this.dx,
            this.dy,
            this.iw,
            this.ih
          );
          const data = imageData.data;
          const redHistogram = new Array(256).fill(0);
          const greenHistogram = new Array(256).fill(0);
          const blueHistogram = new Array(256).fill(0);

          for (let i = 0; i < data.length; i += 4) {
            const red = data[i];
            const green = data[i + 1];
            const blue = data[i + 2];
            redHistogram[red]++;
            greenHistogram[green]++;
            blueHistogram[blue]++;
          }
          // Нормализовать гистограммы
          const normalizedRedHistogram = this.normalizeHistogram(redHistogram);
          const normalizedGreenHistogram =
            this.normalizeHistogram(greenHistogram);
          const normalizedBlueHistogram =
            this.normalizeHistogram(blueHistogram);
          this.drawHistograms(
            normalizedRedHistogram,
            normalizedGreenHistogram,
            normalizedBlueHistogram
          );
        } catch (e) {
          console.log(e);
        }
      };
      img.src = this.origImg.src;
    },
    drawHistograms(redHistogram, greenHistogram, blueHistogram) {
      const ctx = this.chartRef?.getContext("2d");

      if (this.chartInstance) {
        this.chartInstance.destroy();
      }

      this.chartInstance = new Chart(ctx, {
        type: "line", //scatter
        data: {
          labels: Array.from({ length: 256 }, (_, i) => i),
          datasets: [
            {
              label: "Red",
              data: redHistogram,
              backgroundColor: "rgba(255, 0, 0, 0.8)",
            },
            {
              label: "Green",
              data: greenHistogram,
              backgroundColor: "rgba(0, 255, 0, 0.8)",
            },
            {
              label: "Blue",
              data: blueHistogram,
              backgroundColor: "rgba(0, 0, 255, 0.8)",
            },
            {
              label: "line",
              data: [
                { x: 0, y: this.point1y },
                { x: this.point1x, y: this.point1y },
                { x: this.point2x, y: this.point2y },
                { x: 255, y: this.point2y },
              ],
              borderColor: "rgba(0,0,0,1)",
              borderWidth: 1,
              fill: false,
            },
          ],
        },
        options: {
          animation: false,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    },
    calculateCorrection() {
      try {
        const lut = [];
        for (let i = 0; i < this.point1x; i++) {
          lut[i] = this.point1y;
        }
        for (let i = this.point1x; i < this.point2x; i++) {
          const slope =
            (this.point2y - this.point1y) / (this.point2x - this.point1x); // Угловой коэф.
          let correctedValue = this.point1y + slope * (i - this.point1x);
          correctedValue = Math.max(0, Math.min(255, correctedValue));
          lut[i] = correctedValue;
        }
        for (let i = this.point2x; i < 256; i++) {
          lut[i] = this.point2y;
        }

        const ctx = this.canvasRef?.getContext("2d");
        const imageData = ctx.getImageData(this.dx, this.dy, this.iw, this.ih);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = lut[data[i]]; // Коррекция красного канала
          data[i + 1] = lut[data[i + 1]]; // Коррекция зеленого канала
          data[i + 2] = lut[data[i + 2]]; // Коррекция синего канала
        }

        ctx.putImageData(imageData, this.dx, this.dy);
        this.$emit("updateNewImgData", data);
        this.imgCorrected = true;
      } catch (e) {
        console.log(e);
      }
    },
    revertCorrection() {
      this.$emit("revertNewImg");
      this.imgCorrected = false;
    },
    applyCorrection() {
      this.$emit("close");
      this.calculateCorrection();
      this.buildGraph();
    },
    resetValues() {
      this.point1x = 0;
      this.point1y = 0;
      this.point2x = 255;
      this.point2y = 255;
      this.revertCorrection();
    },
    updateX1(event) {
      const num = +event.target.value;

      if (!isNaN(num) && num >= 0 && num < this.point2x) {
        this.point1x = num;
        this.buildGraph();
      } else {
        this.point1x += 1;
        this.point1x -= 1;
      }
    },
    updateY1(event) {
      const num = +event.target.value;

      if (!isNaN(num) && num >= 0 && num < 255) {
        this.point1y = num;
        this.buildGraph();
      } else {
        this.point1y += 1;
        this.point1y -= 1;
      }
    },
    updateX2(event) {
      const num = +event.target.value;

      if (!isNaN(num) && num <= 255 && this.point1x <= num) {
        this.point2x = num;
        this.buildGraph();
      } else {
        this.point2x += 1;
        this.point2x -= 1;
      }
    },
    updateY2(event) {
      const num = +event.target.value;

      if (!isNaN(num) && num <= 255 && 0 <= num) {
        this.point2y = num;
        this.buildGraph();
      } else {
        this.point2y += 1;
        this.point2y -= 1;
      }
    },
  },
  watch: {
    newImg() {
      this.buildGraph();
    },
    previewEnabled(newVal) {
      if (newVal) {
        this.calculateCorrection();
      } else {
        this.revertCorrection();
      }
    },
  },
});
</script>

<style scoped lang="scss">
.correction-info-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 200px;
  height: 400px;
  background: #ececec;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 10px;

  .panel-header {
    display: flex;
    justify-content: end;

    .close-button {
      font-size: 20px;
      cursor: pointer;
      font-weight: bold;
      color: #4f4f4f;
      background: transparent;
    }
  }

  .corrections-graph {
    font-size: small;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
}

.correction-actions {
  display: flex;
  justify-content: center;
  gap: 5px;
  .correction-button {
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

.correction-inputs {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  .point-inputs {
    display: flex;
    gap: 5px;
    .point-with-prefix {
      position: relative;
      input {
        height: 20px;
        width: 25px;
        border-radius: 0;
        padding-left: 20px;
        padding-right: 20px;
      }

      label {
        color: #848484;
        position: absolute;
        top: 9px;
        transform: translateY(-50%);
      }
    }
  }
}

.custom-checkbox {
  position: relative;
  display: inline-block;

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
