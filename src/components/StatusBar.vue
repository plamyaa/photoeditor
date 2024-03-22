<template>
  <div class="status-bar">
    <div class="left-side">
      <span v-if="state"> State: {{ state }}</span>
      <span v-if="imageWidth && imageHeight">
        | Width: {{ imageWidth }} Height: {{ imageHeight }}
      </span>
      <span v-if="state === 'pipette' && pickedColor">
        | Color: {{ pickedColor }}
      </span>
      <div
        v-if="state === 'pipette' && pickedColor"
        class="pipette-color"
        :style="{
          background: pickedColor,
        }"
      ></div>
      <span v-if="state === 'pipette' && pickedColor && xMouse && yMouse">
        | Coordinates: {{ xMouse }}:{{ yMouse }}
      </span>
    </div>

    <div>
      <label for="scale">Scale</label>
      <input
        type="range"
        id="scale"
        name="scale"
        min="12"
        max="300"
        step="1"
        :value="scale"
        @input="updateScale"
      />
    </div>
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "StatusBar",
  props: {
    state: String,
    imageHeight: Number,
    imageWidth: Number,
    pickedColor: String,
    xMouse: Number,
    yMouse: Number,
    scale: Number,
  },
  methods: {
    updateScale(event) {
      const newScale = event.target.value;
      this.$emit("updateScale", newScale);
    },
  },
});
</script>

<style scoped lang="scss">
.status-bar {
  height: 20px;
  background: #e5e5e5;
  display: flex;
  gap: 5px;
  justify-content: space-between;
}

.left-side {
  display: flex;
}

.pipette-color {
  margin-top: 2.5px;
  width: 15px;
  height: 15px;
}
</style>
