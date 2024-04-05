<template>
  <div class="color-info-panel">
    <div class="panel-header">
      <button class="close-button" @click="close">x</button>
    </div>
    <div class="colors">
      <input
        v-model="pickedButton"
        value="button1"
        type="radio"
        class="color-button"
        :style="{ background: color1 }"
      />
      <input
        v-model="pickedButton"
        value="button2"
        type="radio"
        class="color-button"
        :style="{ background: color2 }"
      />
    </div>
    <div class="colors-info" v-if="color1RGB && color2RGB">
      <p class="color-parameter">X</p>
      <div class="color-parameters">
        <p>{{ color1X }}</p>
        <p>{{ color2X }}</p>
      </div>
      <p class="color-parameter">Y</p>
      <div class="color-parameters">
        <p>{{ color1Y }}</p>
        <p>{{ color2Y }}</p>
      </div>
      <p class="color-parameter">RGB</p>
      <div class="color-parameters">
        <p>{{ color1RGB }}</p>
        <p>{{ color2RGB }}</p>
      </div>
      <p class="color-parameter">XYZ</p>
      <div class="color-parameters">
        <p>{{ color1XYZ }}</p>
        <p>{{ color2XYZ }}</p>
      </div>
      <p class="color-parameter">Lab</p>
      <div class="color-parameters">
        <p>{{ color1Lab }}</p>
        <p>{{ color2Lab }}</p>
      </div>
    </div>
    <div
      class="contrast"
      v-if="colorContrast"
      :style="{ color: colorContrast < 4.5 ? 'red' : 'black' }"
    >
      Contrast: {{ colorContrast }}
    </div>
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "SideBar",
  props: {
    pickedColor: String,
    xMouse: Number,
    yMouse: Number,
  },
  data() {
    return {
      pickedButton: null,
      color1: null,
      color2: null,
      color1X: 0,
      color1Y: 0,
      color2X: 0,
      color2Y: 0,
      color1RGB: "",
      color2RGB: "",
      color1XYZ: "",
      color2XYZ: "",
      color1Lab: "",
      color2Lab: "",
      colorContrast: null,
    };
  },
  methods: {
    close() {
      this.$emit("close");
    },
    handleColorClick() {
      this.$emit("changeState", "pipette");
    },
    updateColors() {
      const rgb = this.parseColor(this.pickedColor);
      const xyz = this.rgbToXyz(rgb);
      const lab = this.xyzToLab(xyz);
      if (this.pickedButton === "button1") {
        this.color1X = this.xMouse;
        this.color1Y = this.yMouse;
        this.color1RGB = this.prettyColor(rgb, true);
        this.color1XYZ = this.prettyColor(xyz);
        this.color1Lab = this.prettyColor(lab);
      } else {
        this.color2X = this.xMouse;
        this.color2Y = this.yMouse;
        this.color2RGB = this.prettyColor(rgb, true);
        this.color2XYZ = this.prettyColor(xyz);
        this.color2Lab = this.prettyColor(lab);
      }

      if (this.color1 && this.color2) {
        this.colorContrast = this.calculateContrastRatio(
          this.color1,
          this.color2
        );
      }
    },
    prettyColor([tone1, tone2, tone3], isRGB = false) {
      if (isRGB) return `${tone1}, ${tone2}, ${tone3}`;
      return `${tone1.toFixed(1)}, ${tone2.toFixed(1)}, ${tone3.toFixed(1)}`;
    },
    calculateContrastRatio(color1, color2) {
      const getLuminance = (color) => {
        const rgb = this.parseColor(color);
        const r = rgb[0] / 255;
        const g = rgb[1] / 255;
        const b = rgb[2] / 255;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };

      const luminance1 = getLuminance(color1);
      const luminance2 = getLuminance(color2);

      // Находим максимальное и минимальное значение яркости
      const maxLuminance = Math.max(luminance1, luminance2);
      const minLuminance = Math.min(luminance1, luminance2);

      // Рассчитываем контрастный коэффициент по формуле: (L1 + 0.05) / (L2 + 0.05), где L1 и L2 - яркости цветов
      const contrastRatio = (maxLuminance + 0.05) / (minLuminance + 0.05);

      return contrastRatio.toFixed(1);
    },
    parseColor(input) {
      if (input.substr(0, 1) == "#") {
        var collen = (input.length - 1) / 3;
        var fact = [17, 1, 0.062272][collen - 1];
        return [
          Math.round(parseInt(input.substr(1, collen), 16) * fact),
          Math.round(parseInt(input.substr(1 + collen, collen), 16) * fact),
          Math.round(parseInt(input.substr(1 + 2 * collen, collen), 16) * fact),
        ];
      } else
        return input
          .split("(")[1]
          .split(")")[0]
          .split(",")
          .map((x) => +x);
    },
    rgbToXyz(rgb) {
      let r = rgb[0] / 255;
      let g = rgb[1] / 255;
      let b = rgb[2] / 255;

      // Применяем коррекцию для RGB пространства
      r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
      g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
      b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

      // Применяем коэффициенты преобразования
      r *= 100;
      g *= 100;
      b *= 100;

      // Вычисляем XYZ
      const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
      const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
      const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

      return [x, y, z];
    },

    xyzToLab(xyz) {
      const [x, y, z] = xyz;

      // Коэффициенты для преобразования
      const xn = 95.047;
      const yn = 100.0;
      const zn = 108.883;

      const fx = x / xn;
      const fy = y / yn;
      const fz = z / zn;

      const epsilon = 0.008856;
      const kappa = 903.3;

      const f = (t) =>
        t > epsilon ? Math.pow(t, 1 / 3) : (kappa * t + 16) / 116;

      const L = 116 * f(fy) - 16;
      const a = 500 * (f(fx) - f(fy));
      const b = 200 * (f(fy) - f(fz));

      return [L, a, b];
    },
  },
  watch: {
    pickedColor(newVal) {
      if (this.pickedButton === "button1") {
        this.color1 = newVal;
        this.updateColors();
      }
      if (this.pickedButton === "button2") {
        this.color2 = newVal;
        this.updateColors();
      }
    },
  },
});
</script>

<style scoped lang="scss">
.color-info-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 200px;
  height: 290px;
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
  .colors {
    display: flex;
    justify-content: space-around;

    .color-button {
      -webkit-appearance: none;
      cursor: pointer;
      border: 1px solid black;
      border-radius: 0;
      width: 23px;
      height: 23px;
      &:checked {
        outline: 2px solid white;
        border: 2px solid black;
      }
    }
  }

  .colors-info {
    font-size: small;
    display: flex;
    flex-direction: column;
    align-items: center;

    .color-parameter {
      margin-top: 10px;
    }

    .color-parameters {
      width: 100%;
      display: flex;
      justify-content: space-around;
    }
  }

  .contrast {
    text-align: center;
  }
}
</style>
