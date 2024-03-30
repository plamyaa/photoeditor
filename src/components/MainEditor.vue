<template>
  <div class="editor">
    <MainCanvas
      ref="canvas"
      :state="state"
      :img="img"
      :newImg="newImg"
      :scale="scale"
      :interpolationCb="interpolationCb"
      :newiw="newiw"
      :newih="newih"
      @updateImageSizes="updateImageSizes"
      @updateColor="updateColor"
      @updateCoordinates="updateCoordinates"
    />
    <StatusBar
      :state="state"
      :imageHeight="ih"
      :imageWidth="iw"
      :pickedColor="pickedColor"
      :xMouse="xMouse"
      :yMouse="yMouse"
      :scale="scale"
      @updateScale="(value) => (scale = value)"
    />
  </div>
  <ModalWindow v-show="isShowModal" @close="closeModal">
    <template v-slot:body>
      <div class="modal">
        <select
          class="resize-unit"
          id="resizeUnit"
          v-model="resizeUnit"
          @change="updateModal($event)"
        >
          <option value="percentage">Percentage</option>
          <option value="pixels">Pixels</option>
        </select>
        <div class="sizes">
          <div class="input-with-prefix">
            <label for="width" :style="{ left: '3px' }">W</label>
            <label for="width" class="type" :style="{ right: '3px' }">
              {{ resizeUnit === "pixels" ? "px" : "%" }}
            </label>
            <input id="width" :value="newiw" @change="updateNewiw" />
          </div>
          <div class="custom-checkbox">
            <input type="checkbox" v-model="bind" />
            <img
              v-if="bind"
              class="checkbox-image"
              src="../assets/lock.png"
              alt="Lock"
            />
            <img
              v-else
              class="checkbox-image"
              src="../assets/unlock.png"
              alt="Unlock"
            />
          </div>
          <div class="input-with-prefix">
            <label for="height" :style="{ left: '5px' }"> H</label>
            <label for="width" class="type" :style="{ right: '3px' }">
              {{ resizeUnit === "pixels" ? "px" : "%" }}
            </label>
            <input id="height" :value="newih" @change="updateNewih" />
          </div>
        </div>
        <div class="interpolation">
          <label for="interpolation">Interpolation:</label>
          <select v-model="interpolation" id="interpolation">
            <option></option>
            <option
              value="nearestNeighbor"
              title="Nearest Neighbor: Each pixel in the new image is assigned the value of the nearest pixel in the original image."
            >
              Nearest Neighbor
            </option>
          </select>
        </div>
        <div class="sizes-counter">
          <p>Now: {{ getResolutionNow() }} MPs</p>
          <p>After: {{ getResolutionAfter() }} MPs</p>
        </div>
      </div>
    </template>
    <template v-slot:footer>
      <button @click="handleConfirm" class="confirm-button">Confirm</button>
    </template>
  </ModalWindow>
</template>

<script>
import { defineComponent } from "vue";
import { nearestNeighborInterpolation } from "../interpolations.js";

import ModalWindow from "./ModalWindow";
import StatusBar from "./StatusBar";
import MainCanvas from "./MainCanvas.vue";

export default defineComponent({
  name: "MainEditor",
  components: { ModalWindow, StatusBar, MainCanvas },
  props: {
    img: String,
    state: String,
  },
  data() {
    return {
      canvasRef: null,
      newImg: null,

      resizeUnit: "pixels",
      iw: null,
      ih: null,
      newiw: null,
      newih: null,
      bind: false,
      interpolation: "",
      isShowModal: false,

      xMouse: null,
      yMouse: null,
      pickedColor: "",
      scale: 100,
    };
  },
  emits: ["changeState"],
  mounted() {
    this.canvasRef = this.$refs.canvas.getCanvasRef();
  },
  methods: {
    updateImageSizes(iw, ih) {
      this.iw = iw;
      this.ih = ih;
    },
    updateColor(color) {
      this.pickedColor = color;
    },
    updateCoordinates(x, y) {
      this.xMouse = x;
      this.yMouse = y;
    },
    closeModal() {
      this.isShowModal = false;
      this.$emit("changeState", "");
    },
    handleConfirm() {
      this.scale = 100;
      const image = new Image();

      if (this.resizeUnit === "pixels") {
        image.width = this.newiw;
        image.height = this.newih;
      }
      if (this.resizeUnit === "percentage") {
        const { width, height } = this.canvasRef;
        const widthPercent = width / 100;
        const heightPercent = height / 100;
        image.widht = this.newiw * widthPercent;
        image.height = this.newih * heightPercent;
      }
      this.newImg = image;
    },
    updateModal() {
      if (this.resizeUnit === "pixels") {
        this.newiw = this.iw;
        this.newih = this.ih;
      }
      if (this.resizeUnit === "percentage") {
        const { width, height } = this.canvasRef;
        const widthPercent = width / 100;
        const heightPercent = height / 100;

        this.newiw = ~~(this.iw / widthPercent);
        this.newih = ~~(this.ih / heightPercent);
      }
    },
    updateNewiw(event) {
      const num = +event.target.value;

      if (!isNaN(num) && num > 0) {
        this.newiw = num;

        if (this.bind) {
          const coef = this.ih / this.iw;
          this.newih = ~~(num * coef);
        }
      } else {
        this.newiw += 1;
        this.newiw -= 1;
      }
    },
    updateNewih(event) {
      const num = +event.target.value;

      if (!isNaN(num) && num > 0) {
        this.newih = num;

        if (this.bind) {
          const coef = this.iw / this.ih;
          this.newiw = ~~(num * coef);
        }
      } else {
        this.newih += 1;
        this.newih -= 1;
      }
    },
    getResolutionNow() {
      return ((this.iw * this.ih) / 1000000).toFixed(2);
    },
    getResolutionAfter() {
      if (this.resizeUnit === "pixels") {
        return ((this.newiw * this.newih) / 1000000).toFixed(2);
      }
      if (this.resizeUnit === "percentage") {
        const { width, height } = this.canvasRef;
        const percentage = (width / 100) * (height / 100);

        return ((this.newiw * this.newih * percentage) / 1000000).toFixed(2);
      }
    },
    interpolationCb(img, iw, ih) {
      if (this.interpolation === "nearestNeighbor") {
        return nearestNeighborInterpolation(img, iw, ih);
      }
      return null;
    },
  },
  watch: {
    state(newValue) {
      if (newValue === "modal") {
        this.isShowModal = true;
      }
    },
    img() {
      this.scale = 100;
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

.modal {
  padding: 1px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.confirm-button {
  cursor: pointer;
  height: 25px;
  background: #d6d6d6;
  border-radius: 10px;
  display: block;
  transition: 0.3s;
  &:hover {
    background: #a0a0a0;
    border-color: #a0a0a0;
  }
}

.resize-unit {
  height: 25px;
  width: 90px;
}

.sizes {
  display: flex;
  gap: 1px;
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

.input-with-prefix {
  position: relative;
  input {
    height: 25px;
    width: 65px;
    border-radius: 0;
    padding-left: 20px;
    padding-right: 20px;
  }

  label {
    color: #848484;
    position: absolute;
    top: 12px;
    transform: translateY(-50%);
  }
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}

.interpolation {
  display: flex;
  gap: 10px;
}

.sizes-counter {
  margin-top: 10px;
  display: flex;
  gap: 10px;
  justify-content: space-between;
}
</style>
